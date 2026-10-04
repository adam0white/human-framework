/**
 * G3-4 saves and the playtest export over years: a chronicle played across years with a load from a saved page
 * in the middle (through the real store: gzip and IndexedDB) still exports a log that replays from the seed to the
 * same full state; the shelf keeps closed volumes and only two season backups; a running page that cannot be read
 * falls back to its newest backup.
 */
import 'fake-indexeddb/auto';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { playYears } from '../../test/watch/years.ts';
import { seasonNow } from './sim/life.ts';
import { endState, replay, WatchRun } from './sim/run.ts';
import { listPages, loadPage, type PageInfo, pack, pruneIds, savePage, unpack } from './store.ts';

const page = (id: string, chronicle: string, kind: PageInfo['kind'], savedAt: number): PageInfo => ({
  id,
  chronicle,
  kind,
  seed: 1,
  year: 1,
  when: 'spring',
  savedAt,
});

describe('Game 3 saves (G3-4)', () => {
  it('a multi-year chronicle with a load from a kept page replays from the seed to the same state', async () => {
    // Year one to the summer of year two, then the page is kept and opened again as a browser would.
    const first = playYears(1, 3, undefined, (s) => s.year === 2 && seasonNow(s) === 'summer');
    expect(first.state.year).toBe(2);
    const info = page('c1:auto', 'c1', 'auto', 1);
    expect(await savePage(info, first.snapshotText())).toBe(true);
    const snap = await loadPage('c1:auto');
    expect(snap).not.toBeNull();
    if (!snap) return;
    const resumed = WatchRun.resume(snap);
    expect(resumed.log).toEqual(first.log);
    expect(endState(resumed.state).fullHash).toBe(endState(first.state).fullHash);
    // Two more years after the load.
    const run = playYears(1, 3, undefined, undefined, resumed);
    expect(run.state.year).toBe(4);
    expect(run.log.length).toBeGreaterThan(first.log.length);
    expect(run.log.slice(0, first.log.length)).toEqual(first.log);

    const exp = JSON.parse(JSON.stringify(run.export()));
    const text = JSON.stringify(exp);
    // The export size the docs record (three years: about 70 KB, under 10 KB gzipped).
    console.log(
      `export after 3 years with a load: ${exp.inputs.length} inputs, ${text.length} bytes, ${gzipSync(text).length} gzipped`,
    );
    expect(text.length).toBeLessThan(200_000);
    expect(JSON.stringify(endState(replay(exp)))).toBe(JSON.stringify(exp.end));
  }, 300_000);

  it('gzip round-trips a page', async () => {
    const text = JSON.stringify({ a: 'x'.repeat(5000), b: [1, 2, 3] });
    const packed = await pack(text);
    expect(typeof packed).not.toBe('string');
    expect(await unpack(packed)).toBe(text);
  });

  it('the shelf keeps closed volumes and two season backups, and drops the oldest chronicles whole', () => {
    const all = [
      page('c5:auto', 'c5', 'auto', 50),
      page('c5:2:summer', 'c5', 'season', 49),
      page('c5:2:spring', 'c5', 'season', 48),
      page('c5:1:autumn', 'c5', 'season', 47),
      page('c5:vol:1', 'c5', 'volume', 46),
      page('c4:auto', 'c4', 'auto', 40),
      page('c3:auto', 'c3', 'auto', 30),
      page('c2:auto', 'c2', 'auto', 20),
      page('c1:auto', 'c1', 'auto', 10),
      page('c1:vol:1', 'c1', 'volume', 9),
    ];
    const drop = pruneIds(all, 'c5');
    expect(drop).toContain('c5:1:autumn');
    expect(drop).not.toContain('c5:vol:1');
    expect(drop).not.toContain('c5:2:spring');
    expect(drop).toEqual(expect.arrayContaining(['c1:auto', 'c1:vol:1']));
    expect(drop).not.toContain('c2:auto');
    // The chronicle being written is never dropped, even if older than the rest.
    expect(pruneIds(all, 'c1')).not.toContain('c1:vol:1');
  });

  it('a running page that cannot be read opens from its newest season backup', async () => {
    const run = new WatchRun(3);
    run.input({ k: 'start' });
    expect(await savePage(page('c9:1:winter', 'c9', 'season', 5), run.snapshotText())).toBe(true);
    expect(await savePage(page('c9:auto', 'c9', 'auto', 6), '{not json')).toBe(true);
    const snap = await loadPage('c9:auto');
    expect(snap?.state.minute).toBe(run.state.minute);
    expect((await listPages()).some((p) => p.id === 'c9:auto')).toBe(true);
  });
});
