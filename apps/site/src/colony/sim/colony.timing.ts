/** Game 1 wall-clock budgets. Run with `npm run bench`; the outcomes are asserted in the unit tests. */
import { describe, expect, it } from 'vitest';
import { playDirector } from './director.ts';
import { DEFAULT_SEED } from './game.ts';
import { PATTERNS, play } from './policies.ts';

describe('Game 1 throughput', () => {
  it('a full two-day game with director orders, both sides, in under 1.5 s', () => {
    const t0 = performance.now();
    playDirector();
    const ms = performance.now() - t0;
    console.log(`colony full run with director orders: ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(1500);
  });

  it('the five balance games (two with Day 3) in under 5 s', () => {
    const t0 = performance.now();
    play(PATTERNS.none(), DEFAULT_SEED, true);
    play(PATTERNS.good2rush(), DEFAULT_SEED, true);
    play(PATTERNS.allForest());
    play(PATTERNS.good2insist());
    play(PATTERNS.suggestions());
    const ms = performance.now() - t0;
    console.log(`colony balance runs: ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(5000);
  });
});
