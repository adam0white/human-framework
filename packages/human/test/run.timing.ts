/**
 * Wall-clock budgets for the 4.0 run. Run with `npm run bench`, not `npm test`: timings depend on machine load,
 * so they stay out of `npm run check`. Budgets are about three times the 2026-10-27 measurements on a loaded
 * Apple Silicon dev machine (docs/findings.md, "HF 4.0 step cost before release"); CI multiplies by BENCH_SCALE.
 */
import { expect, test } from 'vitest';
import { exportRun, step } from '../src/index.ts';
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

/** p50 of `frames` steps of 50 ms each from the run's current time. */
function frameP50(run: ReturnType<typeof benchRun>, from: number, frames: number): number {
  const times: number[] = [];
  let at = from;
  for (let i = 0; i < frames; i++) {
    at += 50;
    const t0 = performance.now();
    const result = accepted(step(run, { until: at, inputs: [] }));
    times.push(performance.now() - t0);
    expect(result.boundary.type).toBe('until');
  }
  times.sort((a, b) => a - b);
  return times[times.length >> 1] ?? Infinity;
}

// 4.0.1: a frame reads no history, so its cost does not grow with the run. Three fed days of hourly meals
// accumulate events and receipts between the two samples; a step that copied or hashed them would slow down.
test('a 50 ms step costs the same after three fed days as at the start (p50)', () => {
  const run = benchRun(1);
  frameP50(run, 0, 100); // warm-up, discarded
  const early = frameP50(run, 100 * 50, 300);
  const before = exportRun(run);
  let at = 400 * 50;
  for (let hour = 1; hour <= 72; hour++) {
    const next = hour * HOUR;
    const reached = accepted(
      step(run, {
        until: next,
        inputs: [
          {
            id: `meal-${hour}`,
            at: at + 1,
            source: { type: 'host', id: 'numerical-host' },
            kind: 'body.received',
            payload: {
              person: 'numerical-person',
              evidenceId: `meal-evidence-${hour}`,
              receipt: {
                type: 'consumed',
                actionReceipt: `meal-${hour}`,
                received: { food: 0.2, water: 0.3 },
              },
            },
          },
        ],
      }),
    );
    expect(reached.boundary.type).toBe('until');
    at = next;
  }
  const after = exportRun(run);
  // The late sample runs on a run that has kept everything since the early one.
  expect(after.history.length).toBe(before.history.length + 72);
  expect(after.current.events.length).toBeGreaterThan(before.current.events.length);
  const late = frameP50(run, at, 300);
  expect(late).toBeLessThan(early * 1.5 + 0.05);
});
