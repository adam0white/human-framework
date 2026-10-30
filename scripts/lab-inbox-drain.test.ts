import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';

it('drains a bounded concurrent backlog and retries only failed payloads', () => {
  const root = mkdtempSync(join(tmpdir(), 'inbox-drain-'));
  try {
    mkdirSync(join(root, 'scripts'));
    mkdirSync(join(root, '.lab-inbox/linked'), { recursive: true });
    for (const file of [
      'lab-inbox.ts',
      'lab-inbox-linked.ts',
      'lab-inbox-persona.ts',
      'lab-inbox-suggest.ts',
      'lab-wai-budget.ts',
    ])
      writeFileSync(join(root, 'scripts', file), readFileSync(resolve('scripts', file)));
    mkdirSync(join(root, 'apps/site/worker'), { recursive: true });
    writeFileSync(
      join(root, 'apps/site/worker/wai-budget.ts'),
      readFileSync(resolve('apps/site/worker/wai-budget.ts')),
    );
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    const day = new Date().toISOString().slice(0, 10);
    const player = 'a'.repeat(32);
    const entry = (n: number, kind = 'events') => ({
      id: n.toString(16).padStart(32, '0'),
      player,
      session: 'b'.repeat(32),
      runId: 'c'.repeat(32),
      game: 'pass',
      kind,
      at: Date.now() + n,
      build: {},
      key: `linked/${player}/${n.toString(16).padStart(32, '0')}.json.gz`,
      size: 1,
    });
    const records = Array.from({ length: 24 }, (_, i) => entry(i + 1));
    const saved = entry(100, 'note');
    const savedText = JSON.stringify({ ...saved, v: 2, data: 'retained' });
    writeFileSync(join(root, `.lab-inbox/linked-index-${day}.json`), JSON.stringify({ records: [saved] }));
    writeFileSync(join(root, `.lab-inbox/linked/${player}-${saved.id}.json`), savedText);
    writeFileSync(
      join(root, 'preload.mjs'),
      `
      import child from 'node:child_process';
      import fs from 'node:fs';
      import { gzipSync } from 'node:zlib';
      import { syncBuiltinESMExports } from 'node:module';
      const root = ${JSON.stringify(root)}, day = ${JSON.stringify(day)}, records = ${JSON.stringify(records)};
      let now = Date.now(), active = 0;
      Date.now = () => now;
      const log = value => fs.appendFileSync(root + '/calls', JSON.stringify(value) + '\\n');
      const payload = (key, file) => {
        now += 15000;
        const r = records.find(r => r.key === key);
        if (!r) throw Error('unexpected payload ' + key);
        if (r.id === records[0].id && !fs.existsSync(root + '/failed')) {
          fs.writeFileSync(root + '/failed', 'yes'); fs.writeFileSync(file, 'partial'); throw Error('synthetic unavailable');
        }
        fs.writeFileSync(file, gzipSync(JSON.stringify({ ...r, v: 2, data: 'received' })));
      };
      child.execFileSync = (_cmd, args) => {
        const key = args[4].replace('hf-lab/', ''), file = args[args.indexOf('--file') + 1];
        log({ type: 'sync', key });
        if (key === 'private/index.json') fs.writeFileSync(file, '{"runs":[]}');
        else if (key === 'private/linked-index.json') fs.writeFileSync(file, JSON.stringify({ days: [day] }));
        else if (key === 'private/linked-index/' + day + '.json') fs.writeFileSync(file, JSON.stringify({ records }));
        else payload(key, file);
        return '';
      };
      child.execFile = (_cmd, args, options, callback) => {
        const key = args[4].replace('hf-lab/', ''), file = args[args.indexOf('--file') + 1];
        active++; log({ type: 'start', key, active, timeout: options.timeout, file });
        setImmediate(() => {
          let error = null;
          try { payload(key, file); } catch (e) { error = e; }
          active--; log({ type: 'end', key, active });
          callback(error, '', '');
        });
        return {};
      };
      syncBuiltinESMExports();
    `,
    );
    const run = () =>
      execFileSync(
        process.execPath,
        ['--import', join(root, 'preload.mjs'), join(root, 'scripts/lab-inbox.ts'), '--drain'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    const calls = () =>
      readFileSync(join(root, 'calls'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
    const first = run();
    const firstCalls = calls();
    const starts = firstCalls.filter((call) => call.type === 'start');
    expect(starts).toHaveLength(24);
    expect(Math.max(...starts.map((call) => call.active))).toBeGreaterThan(1);
    expect(Math.max(...starts.map((call) => call.active))).toBeLessThanOrEqual(8);
    expect(firstCalls.findIndex((call) => call.type === 'start')).toBeGreaterThan(
      firstCalls.findIndex((call) => call.key === `private/linked-index/${day}.json`),
    );
    expect(
      starts.every((call) => call.file.endsWith('.partial') && call.timeout > 0 && call.timeout <= 10000),
    ).toBe(true);
    expect(first).toContain('1 pending');
    expect(
      JSON.parse(readFileSync(join(root, `.lab-inbox/linked-index-${day}.json`), 'utf8')).records,
    ).toHaveLength(25);
    expect(readFileSync(join(root, `.lab-inbox/linked/${player}-${saved.id}.json`), 'utf8')).toBe(savedText);
    for (const record of records.slice(1))
      expect(
        JSON.parse(readFileSync(join(root, `.lab-inbox/linked/${player}-${record.id}.json`), 'utf8')).data,
      ).toBe('received');
    expect(run()).toContain('0 pending');
    const allStarts = calls().filter((call) => call.type === 'start');
    expect(allStarts.filter((call) => call.key === records[0]?.key)).toHaveLength(2);
    for (const record of records.slice(1))
      expect(allStarts.filter((call) => call.key === record.key)).toHaveLength(1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
