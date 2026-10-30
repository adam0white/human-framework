import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';

// One linked record behind a stubbed Wrangler. `throttle` is how the first payload read fails.
function harness(throttle?: { stderr: string; status?: number }) {
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
    child.execFileSync = (_cmd, args) => { body(args[4].replace('hf-lab/', ''), args[args.indexOf('--file') + 1]); return ''; };
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

it('reclaims a lock left by a dead process but still honours a live one', () => {
  const h = harness();
  try {
    // A child that has exited leaves a PID that is no longer alive.
    const exited = execFileSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], {
      encoding: 'utf8',
    });
    writeFileSync(h.lock, exited);
    const reclaimed = h.run();
    expect(reclaimed.status).toBe(0);
    expect(reclaimed.stderr).toMatch(/stale/i);
    expect(reclaimed.stdout).toContain('0 pending');

    writeFileSync(h.lock, String(process.pid));
    const blocked = h.run();
    expect(blocked.status).not.toBe(0);
    expect(readFileSync(h.lock, 'utf8')).toBe(String(process.pid));
  } finally {
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
