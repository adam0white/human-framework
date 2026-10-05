/**
 * Fear that lasts (G3-2): a watcher shaken, hurt or driven off a stretch learns a bad expectation of it, says so
 * at dawn, and the Keeper, having heard it, reads a posting there the next dusk as doubtful.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { planInputs } from '../../../test/watch/plans.ts';
import { POSTS, type WatcherId } from './config.ts';
import { readPosting } from './moments.ts';
import { WatchRun } from './run.ts';
import { fearedSection } from './voices.ts';

const SEEDS = Array.from({ length: 16 }, (_, i) => 1000 + i * 7919);
const BAD = ['shaken', 'bitten', 'downed', 'fled', 'ran', 'froze'];

describe('fear lasts into the next dusk', () => {
  let cases = 0;
  let felt = 0;
  let doubted = 0;
  // The runs are made once, before the tests, not while collecting them.
  beforeAll(() => {
    for (const seed of SEEDS) {
      const run = new WatchRun(seed);
      run.input({ k: 'start' });
      for (const x of planInputs(run.state, 'usual', true)) run.input(x);
      run.input({ k: 'begin' });
      while (run.state.phase === 'night') run.step();
      if (run.state.phase !== 'dawn') continue;
      const bad = new Map<WatcherId, string>();
      for (const n of run.state.notes) if (BAD.includes(n.kind) && n.section) bad.set(n.who, n.section);
      run.input({ k: 'toDusk' });
      for (const [who, sec] of bad) {
        const p = run.state.community.people.find((q) => q.id === who);
        const post = POSTS.find((x) => x.section === sec)?.id;
        if (!p || !post) continue;
        cases += 1;
        if (fearedSection(p)?.section === sec) felt += 1;
        const r = readPosting(run.state, who, post, 'ask');
        if (r.word === "won't" || r.word === 'unsure') doubted += 1;
      }
    }
  }, 300_000);

  it('prints', () => {
    console.log(`cases ${cases} still feared at dusk ${felt} keeper doubts the posting ${doubted}`);
    expect(cases).toBeGreaterThan(5);
  });

  it('the watcher still fears the stretch at the next dusk', () => {
    expect(felt / cases).toBeGreaterThanOrEqual(0.6);
  });

  it('the Keeper, having heard them, reads a posting there as "might" or "won\'t" on most of them', () => {
    expect(doubted / cases).toBeGreaterThanOrEqual(0.5);
  });
});
