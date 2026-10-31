import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it, vi } from 'vitest';

// One linked record behind a stubbed Wrangler. `throttle` is how the first payload read fails.
// `during` runs inside the script on its first Wrangler read, while the script holds the cache lock.
// `pauseOnStale` parks a script that reaches the retired stale-lock removal until `release` exists.
function harness(
  throttle?: { stderr: string; status?: number },
  options: { during?: string; pauseOnStale?: boolean; failBodyWrite?: boolean } = {},
) {
  const root = mkdtempSync(join(tmpdir(), 'inbox-lock-'));
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, 'apps/site/worker'), { recursive: true });
  mkdirSync(join(root, '.lab-inbox'));
  for (const file of [
    'lab-inbox.ts',
    'lab-inbox-linked.ts',
    'lab-inbox-persona.ts',
    'lab-inbox-suggest.ts',
    'lab-wai-budget.ts',
  ])
    writeFileSync(join(root, 'scripts', file), readFileSync(resolve('scripts', file)));
  writeFileSync(
    join(root, 'apps/site/worker/wai-budget.ts'),
    readFileSync(resolve('apps/site/worker/wai-budget.ts')),
  );
  writeFileSync(join(root, 'package.json'), '{"type":"module"}');
  const day = new Date().toISOString().slice(0, 10);
  const id = '1'.padStart(32, '0');
  const player = 'a'.repeat(32);
  const record = {
    id,
    player,
    session: 'b'.repeat(32),
    runId: 'c'.repeat(32),
    game: 'pass',
    kind: 'events',
    at: Date.now(),
    build: {},
    key: `linked/${player}/${id}.json.gz`,
    size: 1,
  };
  writeFileSync(
    join(root, 'preload.mjs'),
    `
    import child from 'node:child_process';
    import fs from 'node:fs';
    import { gzipSync } from 'node:zlib';
    import { syncBuiltinESMExports } from 'node:module';
    import timers from 'node:timers/promises';
    const root = ${JSON.stringify(root)}, day = ${JSON.stringify(day)}, record = ${JSON.stringify(record)};
    const throttle = ${JSON.stringify(throttle ?? null)};
    let now = Date.now();
    Date.now = () => now;
    const log = value => fs.appendFileSync(root + '/calls', JSON.stringify(value) + '\\n');
    timers.setTimeout = async ms => { now += ms; log({ type: 'sleep', ms }); };
    const body = (key, file) => {
      if (key === 'private/index.json') fs.writeFileSync(file, '{"runs":[]}');
      else if (key === 'private/linked-index.json') fs.writeFileSync(file, JSON.stringify({ days: [day] }));
      else if (key === 'private/linked-index/' + day + '.json') fs.writeFileSync(file, JSON.stringify({ records: [record] }));
      else fs.writeFileSync(file, gzipSync(JSON.stringify({ ...record, v: 2, data: 'received' })));
    };
    const lockPath = root + '/.lab-inbox/.download-lock';
    let during = ${JSON.stringify(Boolean(options.during))};
    child.execFileSync = (_cmd, args) => { if (during) { during = false; ${options.during ?? ''} } body(args[4].replace('hf-lab/', ''), args[args.indexOf('--file') + 1]); return ''; };
    child.execFile = (_cmd, args, _options, callback) => {
      const file = args[args.indexOf('--file') + 1];
      log({ type: 'start' });
      setImmediate(() => {
        if (throttle && !fs.existsSync(root + '/throttled')) {
          fs.writeFileSync(root + '/throttled', 'yes');
          callback(Object.assign(Error('failed'), throttle.status ? { status: throttle.status } : {}), '', throttle.stderr);
        } else { body(args[4].replace('hf-lab/', ''), file); callback(null, '', ''); }
      });
      return {};
    };
    syncBuiltinESMExports();
    if (${JSON.stringify(Boolean(options.failBodyWrite))}) {
      // The lock body write fails after a foreign file has replaced the lock pathname.
      const write = fs.writeSync;
      fs.writeSync = (fd, data, ...rest) => {
        if (typeof data === 'string' && data.includes('"nonce"')) {
          fs.rmSync(lockPath);
          fs.writeFileSync(lockPath, 'foreign lock');
          throw Object.assign(new Error('ENOSPC: injected body write failure'), { code: 'ENOSPC' });
        }
        return write(fd, data, ...rest);
      };
      syncBuiltinESMExports();
    }
    if (${JSON.stringify(Boolean(options.pauseOnStale))}) {
      const warn = console.warn;
      console.warn = (...args) => {
        if (/stale/i.test(String(args[0]))) {
          fs.writeFileSync(root + '/paused-' + process.pid, '');
          while (!fs.existsSync(root + '/release')) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
        }
        warn(...args);
      };
    }
  `,
  );
  const run = () =>
    spawnSync(
      process.execPath,
      ['--import', join(root, 'preload.mjs'), join(root, 'scripts/lab-inbox.ts'), '--drain'],
      { encoding: 'utf8' },
    );
  const calls = () => {
    try {
      return readFileSync(join(root, 'calls'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
    } catch {
      return [];
    }
  };
  return { root, run, calls, lock: join(root, '.lab-inbox/.download-lock') };
}

// A child that has exited leaves a PID that is no longer alive.
const deadPid = () =>
  execFileSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' });

it.each([
  ['a dead process', deadPid],
  ['a live process', () => String(process.pid)],
  ['an unreadable body', () => 'not a pid'],
  ['an empty body', () => ''],
])('refuses and preserves an existing lock held by %s', (_name, body) => {
  const h = harness();
  try {
    const text = body();
    writeFileSync(h.lock, text);
    const out = h.run();
    expect(out.status).not.toBe(0);
    expect(out.stderr).toMatch(/locked/i);
    expect(out.stderr).toMatch(/stopped/i);
    expect(out.stderr).not.toMatch(/removed/i);
    expect(readFileSync(h.lock, 'utf8')).toBe(text);
    expect(h.calls()).toEqual([]);
  } finally {
    rmSync(h.root, { recursive: true, force: true });
  }
});

it('blocks two contenders on one dead lock and keeps the lock', async () => {
  const h = harness(undefined, { pauseOnStale: true });
  try {
    const text = deadPid();
    writeFileSync(h.lock, text);
    const contenders = [0, 1].map(() => {
      const child = spawn(
        process.execPath,
        ['--import', join(h.root, 'preload.mjs'), join(h.root, 'scripts/lab-inbox.ts'), '--drain'],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      const closed = new Promise<number | null>((resolve) => child.once('close', resolve));
      return { child, closed, done: false, status: undefined as number | null | undefined };
    });
    for (const c of contenders)
      void c.closed.then((status) => {
        c.done = true;
        c.status = status;
      });
    // Each contender either exits (it refuses) or parks at the retired stale-removal step.
    await vi.waitFor(
      () =>
        expect(contenders.every((c) => c.done || existsSync(join(h.root, `paused-${c.child.pid}`)))).toBe(
          true,
        ),
      { timeout: 20_000, interval: 25 },
    );
    writeFileSync(join(h.root, 'release'), '');
    const statuses = await Promise.all(contenders.map((c) => c.closed));
    expect(statuses).toEqual([1, 1]);
    expect(readFileSync(h.lock, 'utf8')).toBe(text);
  } finally {
    rmSync(h.root, { recursive: true, force: true });
  }
});

it('removes only its own lock when it exits', () => {
  const replaced = harness(undefined, {
    during: `fs.rmSync(lockPath); fs.writeFileSync(lockPath, 'replacement lock');`,
  });
  const ordinary = harness(undefined, {
    during: `fs.writeFileSync(root + '/held', fs.readFileSync(lockPath, 'utf8'));`,
  });
  try {
    expect(replaced.run().status).toBe(0);
    expect(readFileSync(replaced.lock, 'utf8')).toBe('replacement lock');

    expect(ordinary.run().status).toBe(0);
    const held = JSON.parse(readFileSync(join(ordinary.root, 'held'), 'utf8')) as {
      pid: number;
      nonce: string;
    };
    expect(Number.isInteger(held.pid)).toBe(true);
    expect(held.nonce).toBeTruthy();
    expect(existsSync(ordinary.lock)).toBe(false);
  } finally {
    rmSync(replaced.root, { recursive: true, force: true });
    rmSync(ordinary.root, { recursive: true, force: true });
  }
});

it('keeps a foreign lock and reports the original error when the lock body write fails', () => {
  const h = harness(undefined, { failBodyWrite: true });
  try {
    const out = h.run();
    expect(out.status).not.toBe(0);
    expect(out.stderr).toMatch(/ENOSPC: injected body write failure/);
    expect(readFileSync(h.lock, 'utf8')).toBe('foreign lock');
  } finally {
    rmSync(h.root, { recursive: true, force: true });
  }
});

it.skipIf(process.getuid?.() === 0)('reports a lock-creation error that is not a held lock as itself', () => {
  const h = harness();
  const cache = join(h.root, '.lab-inbox');
  try {
    chmodSync(cache, 0o500);
    const out = h.run();
    expect(out.status).not.toBe(0);
    expect(out.stderr).toMatch(/EACCES/);
    expect(out.stderr).not.toMatch(/locked/i);
  } finally {
    chmodSync(cache, 0o700);
    rmSync(h.root, { recursive: true, force: true });
  }
});

it.each([
  ['an HTTP status on the error', { stderr: 'request failed', status: 429 }],
  ['a Too Many Requests message', { stderr: 'A request failed: Too Many Requests' }],
])('pauses all readers on a throttle shown as %s', (_name, throttle) => {
  const h = harness(throttle);
  try {
    const out = h.run();
    expect(out.status).toBe(0);
    expect(h.calls().some((call) => call.type === 'sleep' && call.ms >= 300000)).toBe(true);
    expect(out.stdout).toContain('0 pending');
  } finally {
    rmSync(h.root, { recursive: true, force: true });
  }
});

it('counts an unrecognised throttle as pending without pausing', () => {
  const h = harness({ stderr: 'quota exhausted, slow down' });
  try {
    const out = h.run();
    expect(out.stdout).toContain('1 pending');
    expect(h.calls().some((call) => call.type === 'sleep' && call.ms >= 300000)).toBe(false);
  } finally {
    rmSync(h.root, { recursive: true, force: true });
  }
});
