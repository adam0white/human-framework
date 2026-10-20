import { type ChildProcess, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { acquireSuiteLock, alive } from './suite-lock.ts';

const temporary: string[] = [];
function fixture() {
  const base = mkdtempSync(join(tmpdir(), 'hf-suite-lock-'));
  temporary.push(base);
  return { directory: join(base, 'full-suite'), repo: '/fixture', branch: 'test', env: {} };
}
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe('suite lock', () => {
  it('records ownership and releases, including repeated release', async () => {
    const options = fixture();
    const release = await acquireSuiteLock(options);
    expect(JSON.parse(readFileSync(join(options.directory, 'owner.json'), 'utf8'))).toMatchObject({
      pid: process.pid,
      repo: '/fixture',
      branch: 'test',
      started: expect.any(String),
    });
    release();
    release();
    expect(() => readFileSync(join(options.directory, 'owner.json'))).toThrow();
  });

  it.each([{ CI: 'true' }, { CI: '' }, { SUITE_LOCK: '0' }])('bypasses for %j', async (env) => {
    const options = { ...fixture(), env };
    const release = await acquireSuiteLock(options);
    expect(() => readFileSync(join(options.directory, 'owner.json'))).toThrow();
    release();
  });

  it('takes over an owner whose PID no longer exists', async () => {
    const options = fixture();
    const messages: string[] = [];
    expect(alive(2147483647)).toBe(false);
    mkdirSync(options.directory);
    writeFileSync(
      join(options.directory, 'owner.json'),
      JSON.stringify({
        pid: 2147483647,
        repo: '/old',
        branch: 'old',
        started: '2000-01-01T00:00:00.000Z',
      }),
    );
    const release = await acquireSuiteLock({ ...options, log: (message) => messages.push(message) });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('Taking over stale suite lock');
    expect(JSON.parse(readFileSync(join(options.directory, 'owner.json'), 'utf8')).pid).toBe(process.pid);
    release();
  });

  it('waits for a live owner, announces once, and acquires after release', async () => {
    const options = fixture();
    const first = await acquireSuiteLock(options);
    const messages: string[] = [];
    let polls = 0;
    const second = await acquireSuiteLock({
      ...options,
      log: (message) => messages.push(message),
      wait: async () => {
        if (++polls === 2) first();
      },
    });
    expect(polls).toBe(2);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain(`Waiting for suite lock: PID ${process.pid}`);
    second();
  });
});

function subprocess(options: ReturnType<typeof fixture>, milliseconds = 0) {
  const script = `import { runSuite } from ${JSON.stringify(pathToFileURL(join(import.meta.dirname, 'suite-lock.ts')).href)};
    await runSuite(process.execPath, ['-e', ${JSON.stringify("process.on('SIGTERM', () => process.exit(42)); console.log('child-ready'); setTimeout(() => process.exit(0), ")} + ${milliseconds} + ');'], ${JSON.stringify(options)});`;
  return spawn(process.execPath, ['--input-type=module', '-e', script], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
function output(child: ChildProcess, wanted: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let text = '';
    child.stdout?.on('data', (chunk) => {
      text += chunk;
      if (text.includes(wanted)) resolve();
    });
    child.once('error', reject);
    child.once('exit', () => {
      if (!text.includes(wanted)) reject(new Error(`Exited before ${wanted}: ${text}`));
    });
  });
}

describe('suite lock subprocesses', () => {
  it('forwards SIGTERM by child PID and releases after its exit', async () => {
    const options = fixture();
    const child = subprocess(options, 60_000);
    const exited = once(child, 'exit');
    try {
      await output(child, 'child-ready');
      child.kill('SIGTERM');
      expect((await exited)[0]).toBe(42);
      expect(() => readFileSync(join(options.directory, 'owner.json'))).toThrow();
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    }
  });

  it('serializes independent processes and announces the owner', async () => {
    const options = fixture();
    const first = subprocess(options, 60_000);
    const firstExited = once(first, 'exit');
    let second: ChildProcess | undefined;
    try {
      await output(first, 'child-ready');
      second = subprocess(options);
      const secondExited = once(second, 'exit');
      const ready = output(second, 'child-ready');
      await output(second, 'Waiting for suite lock: PID');
      first.kill('SIGTERM');
      await firstExited;
      await ready;
      expect((await secondExited)[0]).toBe(0);
      expect(() => readFileSync(join(options.directory, 'owner.json'))).toThrow();
    } finally {
      for (const child of [first, second]) {
        if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
      }
    }
  });
});

it('an old release callback cannot release a later acquisition', async () => {
  const options = fixture();
  const first = await acquireSuiteLock(options);
  first();
  const second = await acquireSuiteLock(options);
  first();
  expect(JSON.parse(readFileSync(join(options.directory, 'owner.json'), 'utf8')).pid).toBe(process.pid);
  second();
});

it('recovers a dead reaper before taking over its stale owner', async () => {
  const options = fixture();
  mkdirSync(options.directory);
  writeFileSync(join(options.directory, 'owner.json'), JSON.stringify({ pid: 2147483647 }));
  mkdirSync(join(options.directory, '.reaper'));
  writeFileSync(join(options.directory, '.reaper', '2147483647-old-token'), '');
  const release = await acquireSuiteLock({ ...options, wait: async () => {}, log: () => {} });
  expect(JSON.parse(readFileSync(join(options.directory, 'owner.json'), 'utf8')).pid).toBe(process.pid);
  release();
});
