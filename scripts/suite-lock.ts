/** Serialize local full suites across worktrees. CI and SUITE_LOCK=0 bypass the lock. */
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface Owner {
  pid: number;
  repo: string;
  branch: string;
  started: string;
}
interface LockOptions {
  directory?: string;
  repo?: string;
  branch?: string;
  env?: NodeJS.ProcessEnv;
  log?: (message: string) => void;
  wait?: () => Promise<void>;
}

export function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false;
    return true; // EPERM is a live process, not permission to take its lock.
  }
}
function readOwner(path: string): Owner | undefined {
  try {
    const owner = JSON.parse(readFileSync(path, 'utf8')) as Owner;
    if (Number.isInteger(owner.pid) && owner.pid > 0) return owner;
  } catch {
    // The holder may still be writing its owner file.
  }
  return undefined;
}
function code(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException).code;
}

export async function acquireSuiteLock(options: LockOptions = {}): Promise<() => void> {
  const env = options.env ?? process.env;
  if (env.CI !== undefined || env.SUITE_LOCK === '0') return () => {};
  const directory = options.directory ?? join(homedir(), 'code/.lab-scratch/locks/full-suite');
  const ownerPath = join(directory, 'owner.json');
  const log = options.log ?? console.log;
  const wait = options.wait ?? (() => new Promise<void>((done) => setTimeout(done, 5000)));
  const owner: Owner = {
    pid: process.pid,
    repo: options.repo ?? process.cwd(),
    branch: options.branch ?? execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(),
    started: new Date().toISOString(),
  };
  mkdirSync(dirname(directory), { recursive: true });
  let announced = false;
  for (;;) {
    try {
      mkdirSync(directory);
      try {
        writeFileSync(ownerPath, JSON.stringify(owner));
      } catch (error) {
        rmSync(directory, { recursive: true, force: true });
        throw error;
      }
      let released = false;
      return () => {
        if (released) return;
        released = true;
        // Do not release a replacement lock if this holder's directory was moved.
        const current = readOwner(ownerPath);
        if (current?.pid === owner.pid && current.started === owner.started) {
          rmSync(directory, { recursive: true });
        }
      };
    } catch (error) {
      if (code(error) !== 'EEXIST') throw error;
    }
    const holder = readOwner(ownerPath);
    if (holder && !alive(holder.pid)) {
      // One reaper at a time. Re-read after claiming it: another waiter may already
      // have replaced the stale directory. Rename keeps the marker with the old lock.
      const marker = join(directory, '.reaper');
      const token = `${process.pid}-${randomUUID()}`;
      const prepared = `${directory}.reaper-${token}`;
      let claimed = false;
      // Publish a nonempty claim directory atomically. rename cannot replace
      // another nonempty claim, and there is no empty initialization window.
      mkdirSync(prepared);
      try {
        writeFileSync(join(prepared, token), '');
        renameSync(prepared, marker);
        claimed = true;
        const current = readOwner(ownerPath);
        if (current && !alive(current.pid)) {
          const retired = `${directory}.stale-${token}`;
          renameSync(directory, retired);
          claimed = false;
          rmSync(retired, { recursive: true });
          log(
            `Taking over stale suite lock: PID ${current.pid}, ${current.repo} (${current.branch}), since ${current.started}`,
          );
          continue;
        }
      } catch (error) {
        if (!['EEXIST', 'ENOTEMPTY', 'ENOENT'].includes(code(error) ?? '')) throw error;
        // A dead reaper's immutable token can be removed by only one waiter.
        // A late waiter cannot unlink a replacement claim's different token.
        try {
          for (const entry of readdirSync(marker)) {
            const pid = Number(entry.split('-')[0]);
            if (Number.isInteger(pid) && pid > 0 && !alive(pid)) {
              unlinkSync(join(marker, entry));
              rmdirSync(marker);
            }
          }
        } catch (cleanupError) {
          if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(code(cleanupError) ?? '')) throw cleanupError;
        }
      } finally {
        rmSync(prepared, { recursive: true, force: true });
        if (claimed) {
          try {
            unlinkSync(join(marker, token));
            rmdirSync(marker);
          } catch (error) {
            if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(code(error) ?? ''))
              log(`Could not release reaper claim: ${String(error)}`);
          }
        }
      }
    }
    if (!announced) {
      log(
        holder
          ? `Waiting for suite lock: PID ${holder.pid}, ${holder.repo} (${holder.branch}), since ${holder.started}`
          : 'Waiting for suite lock: owner is being recorded',
      );
      announced = true;
    }
    await wait();
  }
}

export async function runSuite(command: string, args: string[], options: LockOptions = {}): Promise<void> {
  // Install handlers before waiting so an interrupted waiter never starts a suite.
  let child: ReturnType<typeof spawn> | undefined;
  let release: (() => void) | undefined;
  let interrupted: NodeJS.Signals | undefined;
  const forward = (signal: NodeJS.Signals) => {
    interrupted = signal;
    if (child?.pid) process.kill(child.pid, signal);
    else {
      release?.();
      process.exit(signal === 'SIGINT' ? 130 : 143);
    }
  };
  process.on('SIGINT', forward);
  process.on('SIGTERM', forward);
  process.on('exit', () => release?.());
  release = await acquireSuiteLock(options);
  try {
    child = spawn(command, args, { stdio: 'inherit' });
    process.exitCode = await new Promise<number>((done, reject) => {
      child?.once('error', reject);
      child?.once('exit', (status, signal) =>
        done(status ?? ((signal ?? interrupted) === 'SIGINT' ? 130 : 143)),
      );
    });
  } finally {
    release();
    process.off('SIGINT', forward);
    process.off('SIGTERM', forward);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const separator = process.argv.indexOf('--');
  const [command, ...args] = separator < 0 ? [] : process.argv.slice(separator + 1);
  if (!command) throw new Error('Usage: node scripts/suite-lock.ts -- <command...>');
  await runSuite(command, args);
}
