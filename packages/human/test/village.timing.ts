/**
 * Wall-clock budgets for the village scenario and the body-threshold search. Run with `npm run bench`, not
 * `npm test`: timings depend on machine load, so they stay out of `npm run check`. The correctness half of each
 * run (event cap reached, survivors) is asserted in village.test.ts.
 */
import { describe, expect, test } from 'vitest';
import {
  createPerson,
  lifeModifiers,
  MINUTES_PER_DAY,
  nextBodyThreshold,
  stepCommunity,
} from '../src/index.ts';
import { setupVillage } from './support.ts';

/** Budget multiplier: 1 on the quiet dev machine the budgets were set on; CI sets `BENCH_SCALE` (see ci.yml). */
const SCALE = Number(process.env.BENCH_SCALE ?? 1);
const START = 7 * 60;

const setup = (ids: string[], devout: string[], foodStock?: number) =>
  setupVillage(ids, { devout, ...(foodStock !== undefined ? { foodStock } : {}) });

/** Runs `n` villagers for 30 days (`maxEvents: 1000` caps only the returned event list; all 30 days are simulated) after a short warm-up; returns milliseconds. */
function villageRun(prefix: string, n: number, foodStock: number): number {
  const ids = Array.from({ length: n }, (_, i) => `${prefix}${String(i).padStart(2, '0')}`);
  const s = setup(
    ids,
    ids.filter((_, i) => i % 2 === 0),
    foodStock,
  );
  // Warm the hot paths first so the measurement is steady-state throughput, not JIT compilation.
  const warm = setup(['w1', 'w2', 'w3'], ['w1']);
  stepCommunity(warm.community, warm.village, START + 2 * MINUTES_PER_DAY);
  const t0 = performance.now();
  const events = stepCommunity(s.community, s.village, START + 30 * MINUTES_PER_DAY, { maxEvents: 1000 });
  const ms = performance.now() - t0;
  expect(events.length).toBe(1000);
  return ms;
}

describe('village throughput', () => {
  test('20 people for 30 days in under two seconds', () => {
    const ms = villageRun('p', 20, 200);
    console.log(`village 20 x 30 days: ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(2000 * SCALE);
  });

  test('50 people for 30 days in under five seconds', () => {
    const ms = villageRun('q', 50, 500);
    console.log(`village 50 x 30 days: ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(5000 * SCALE);
  }, 30_000);
});

describe('body thresholds', () => {
  test('one call over a 30-minute review horizon averages well under a millisecond', () => {
    // The same person as the gaps.test.ts cache tests.
    const p = createPerson({
      id: 'a',
      name: 'a',
      seed: 8,
      bornAt: -30 * 365 * MINUTES_PER_DAY,
      sex: 'male',
      now: 600,
      body: { satiety: 0.5 },
    });
    const load = { effort: 0.5, focus: 0.2, mode: 'awake' as const };
    const mods = lifeModifiers(p);
    for (let i = 0; i < 200; i++) nextBodyThreshold(p, load, mods, undefined, 30);
    const t0 = performance.now();
    for (let i = 0; i < 2000; i++) nextBodyThreshold(p, load, mods, undefined, 30);
    const perCall = (performance.now() - t0) / 2000;
    console.log(`nextBodyThreshold, 30-minute horizon: ${(perCall * 1000).toFixed(1)} us per call`);
    expect(perCall).toBeLessThan(0.5 * SCALE);
  });
});
