/**
 * Wall-clock budgets for the 4.0 run. Run with `npm run bench`, not `npm test`: timings depend on machine load,
 * so they stay out of `npm run check`. Budgets are about three times the 2026-10-27 measurements on a loaded
 * Apple Silicon dev machine (docs/findings.md, "HF 4.0 step cost before release"); CI multiplies by BENCH_SCALE.
 */
import { expect, test } from 'vitest';
import { step } from '../src/index.ts';
import { benchRun } from './run-bench-fixture.ts';
import { accepted, HOUR } from './run-numerical-fixture.ts';

const SCALE = Number(process.env.BENCH_SCALE ?? 1);

/** p95 of `frames` steps of 50 ms each, after 20 warm-up frames. */
function frameP95(people: number, frames: number): number {
  const run = benchRun(people);
  let at = 0;
  const times: number[] = [];
  for (let i = 0; i < frames + 20; i++) {
    at += 50;
    const t0 = performance.now();
    accepted(step(run, { until: at, inputs: [] }));
    if (i >= 20) times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return times[Math.min(times.length - 1, Math.floor(0.95 * times.length))] ?? Infinity;
}

test('six people at 50 ms frames stay inside a game frame (p95)', () => {
  expect(frameP95(6, 200)).toBeLessThan(18 * SCALE);
});

// No food or sleep inputs: the stores reach their floors, which costs more than the fed day in docs/findings.md.
test('one person lives a 24-hour fine step', () => {
  const run = benchRun(1);
  const t0 = performance.now();
  accepted(step(run, { until: 24 * HOUR, inputs: [] }));
  expect(performance.now() - t0).toBeLessThan(3000 * SCALE);
});
