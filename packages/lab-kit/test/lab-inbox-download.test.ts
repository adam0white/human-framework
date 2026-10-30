import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';

// A serial payload backlog must not prevent current receipts or a resumable local view.
it('refreshes current receipts before a bounded backlog and resumes without losing cached records', () => {
  const root = mkdtempSync(join(tmpdir(), 'inbox-download-'));
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
    const oldDay = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const player = 'a'.repeat(32);
    const entry = (n: number, kind = 'events') => ({
      id: n.toString(16).padStart(32, '0'),
      player,
      session: 'b'.repeat(32),
      runId: 'c'.repeat(32),
      game: 'pass',
      kind,
      at: Date.now(),
      build: {},
      key: `linked/${player}/${n.toString(16).padStart(32, '0')}.json.gz`,
      size: 1,
    });
    const records = Array.from({ length: 11000 }, (_, i) => entry(i + 1));
    const saved = entry(12000, 'note');
    writeFileSync(join(root, `.lab-inbox/linked-index-${oldDay}.json`), JSON.stringify({ records: [saved] }));
    const savedText = JSON.stringify({ ...saved, v: 2, data: 'retained' });
    writeFileSync(join(root, `.lab-inbox/linked/${player}-${saved.id}.json`), savedText);
    writeFileSync(
      join(root, 'preload.mjs'),
      `
      import child from 'node:child_process';
      import fs from 'node:fs';
      import { gzipSync } from 'node:zlib';
      import { syncBuiltinESMExports } from 'node:module';
      const root = ${JSON.stringify(root)}, day = ${JSON.stringify(day)}, oldDay = ${JSON.stringify(oldDay)};
      const records = ${JSON.stringify(records)};
      const note = ${JSON.stringify(entry(11001, 'note'))};
      let now = Date.now(); Date.now = () => now;
      child.execFileSync = (_cmd, args) => {
        const key = args[4].replace('hf-lab/', '');
        const file = args[args.indexOf('--file') + 1];
        fs.appendFileSync(root + '/calls', key + '\\n');
        if (key === 'private/index.json') fs.writeFileSync(file, '{"runs":[]}');
        else if (key === 'private/linked-index.json') fs.writeFileSync(file, JSON.stringify({days:[oldDay,day]}));
        else if (key === 'private/linked-index/' + day + '.json') fs.writeFileSync(file, JSON.stringify({records:[note]}));
        else if (key === 'private/linked-index/' + oldDay + '.json') fs.writeFileSync(file, JSON.stringify({records}));
        else {
          now += 15000;
          const r = [...records,note].find(r => r.key === key);
          if (!r) throw Error('unexpected key');
          if (r.id === records[0].id && !fs.existsSync(root+'/failed')) {
            fs.writeFileSync(root+'/failed', 'yes'); fs.writeFileSync(file, 'partial'); throw Error('synthetic unavailable');
          }
          fs.writeFileSync(file, gzipSync(JSON.stringify({...r,v:2,data:'received'})));
        }
        return '';
      };
      syncBuiltinESMExports();
    `,
    );
    const run = () =>
      execFileSync(
        process.execPath,
        ['--import', join(root, 'preload.mjs'), join(root, 'scripts/lab-inbox.ts')],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    const first = run();
    const calls = readFileSync(join(root, 'calls'), 'utf8').trim().split('\n');
    expect(calls).toContain(`private/linked-index/${day}.json`);
    expect(calls.indexOf(`private/linked-index/${day}.json`)).toBeLessThan(
      calls.findIndex((k) => k.startsWith('linked/')),
    );
    expect(calls.filter((k) => k.startsWith('linked/')).length).toBeLessThanOrEqual(5);
    expect(first).toContain('pending');
    expect(
      JSON.parse(readFileSync(join(root, `.lab-inbox/linked-index-${day}.json`), 'utf8')).records,
    ).toHaveLength(1);
    expect(
      JSON.parse(readFileSync(join(root, `.lab-inbox/linked-index-${oldDay}.json`), 'utf8')).records,
    ).toHaveLength(11001);
    expect(readFileSync(join(root, `.lab-inbox/linked/${player}-${saved.id}.json`), 'utf8')).toBe(savedText);
    expect(readFileSync(join(root, '.lab-inbox/index.html'), 'utf8')).toContain('retained');
    run();
    expect(
      JSON.parse(readFileSync(join(root, `.lab-inbox/linked/${player}-${records[0]?.id}.json`), 'utf8')).data,
    ).toBe('received');
    const allCalls = readFileSync(join(root, 'calls'), 'utf8').split('\n');
    expect(allCalls.filter((k) => k.endsWith(`${entry(11001).id}.json.gz`))).toHaveLength(1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
