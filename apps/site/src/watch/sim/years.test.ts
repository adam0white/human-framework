import { describe, expect, it } from 'vitest';
import { playYears } from '../../../test/watch/years.ts';
import { listPages, loadPage, savePage } from '../store.ts';
import { DAY } from './config.ts';
import { DAY_RATE, Pacer } from './pace.ts';
import { endState, replay, WatchRun } from './run.ts';

describe('Game 3 years (G3-3)', () => {
  const run = playYears(1, 3);
  const s = run.state;

  it('three whole years pass: seasons, fairs and winters reach the chronicle', () => {
    expect(s.phase).not.toBe('fallen');
    expect(s.year).toBe(4);
    expect(s.annals.map((a) => a.year)).toEqual([1, 2, 3]);
    const kinds = new Set(s.chronicle.map((l) => l.kind));
    for (const k of ['harvest', 'fair', 'winter'] as const) expect(kinds).toContain(k);
    for (const a of s.annals) expect(a.harvest).toBeGreaterThan(0);
  }, 300_000);

  it('the multi-year playtest export replays to the same end', () => {
    const exp = JSON.parse(JSON.stringify(run.export()));
    expect(JSON.stringify(endState(replay(exp)))).toBe(JSON.stringify(exp.end));
  }, 300_000);

  it('a saved page resumes to the same end as the unbroken run', () => {
    const half = Math.floor(run.log.length / 2);
    const cut = run.log[half]?.m ?? 0;
    // Replay to the cut, snapshot, resume and feed the rest: the end must match.
    const exp = run.export();
    const first = new WatchRun(exp.seed);
    for (const e of run.log) {
      if (e.m >= cut) break;
      while (first.state.minute < e.m) first.step();
      first.input(e.i);
    }
    while (first.state.minute < cut) first.step();
    const resumed = WatchRun.resume(JSON.parse(JSON.stringify(first.snapshot())));
    for (const e of run.log) {
      if (e.m < cut) continue;
      while (resumed.state.minute < e.m) resumed.step();
      resumed.input(e.i);
    }
    while (resumed.state.minute < exp.endMinute) resumed.step();
    expect(endState(resumed.state).fullHash).toBe(exp.end.fullHash);
    expect(resumed.log.length).toBe(run.log.length);
  }, 300_000);
});

describe('Game 3 first winter (G3-3 review)', () => {
  it('a Keeper who never plans still reaches the thaw: an empty granary is told at dawn, not a sudden end', () => {
    for (const seed of [1, 2, 3]) {
      const run = new WatchRun(seed);
      run.input({ k: 'start' });
      let dawns = 0;
      for (
        let guard = 0;
        guard < 200_000 && run.state.phase !== 'thaw' && run.state.phase !== 'fallen';
        guard++
      ) {
        const ph = run.state.phase;
        if (ph === 'dusk') run.input({ k: 'begin' });
        else if (ph === 'dawn') {
          dawns += 1;
          run.input({ k: 'toDusk' });
        } else run.step();
      }
      expect(run.state.phase).toBe('thaw');
      expect(dawns).toBe(run.state.winter.nights);
    }
  }, 300_000);
});

describe('Game 3 pacing in the open seasons (G3-3)', () => {
  it('spring opens at Days, steps whole days, Seasons runs faster, and the next winter opens at Watch', () => {
    const run = playYears(2, 1, undefined, (s) => s.phase === 'thaw');
    expect(run.state.phase).toBe('thaw');
    const pacer = new Pacer();
    pacer.speed = 'fast';
    pacer.tick(run, 16);
    run.input({ k: 'continue' });
    if (run.state.phase === 'closed') run.input({ k: 'continue' });
    expect(run.state.phase).toBe('spring');
    pacer.tick(run, 0);
    expect(pacer.speed).toBe('days');
    const before = run.state.minute;
    const stepped = pacer.tick(run, 1000);
    expect(stepped).toBe(DAY_RATE.days);
    expect(run.state.minute - before).toBe(DAY_RATE.days * DAY);
    pacer.speed = 'seasons';
    expect(pacer.tick(run, 1000)).toBe(DAY_RATE.seasons);
    // Through to the next winter's first dusk: the watch speed comes back on its own.
    for (let guard = 0; guard < 5000 && run.state.phase !== 'dusk'; guard++) {
      const s = run.state;
      if (s.phase === 'fair') run.input({ k: 'continue' });
      else if (s.card) {
        // A card slows play to the tactical pace (not a pause).
        expect(pacer.slowed(run)).toBe(true);
        expect(pacer.rate(run)).toBe(DAY_RATE.tactical);
        run.input({ k: 'card', id: s.card.id, choice: s.card.options[0]?.id ?? '' });
      } else pacer.tick(run, 1000);
    }
    expect(run.state.phase).toBe('dusk');
    expect(pacer.speed).toBe('watch');
  }, 300_000);

  it('without IndexedDB the shelf is empty and saving reports false, without throwing', async () => {
    expect(await listPages()).toEqual([]);
    expect(await loadPage('x:auto')).toBeNull();
    const ok = await savePage(
      { id: 'x:auto', chronicle: 'x', kind: 'auto', seed: 1, year: 1, when: 'spring', savedAt: 0 },
      '{}',
    );
    expect(ok).toBe(false);
  });
});
