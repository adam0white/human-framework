/** SCOPE: span work budgets. A fine step over two days with no food or sleep inputs completes: cells that a
 * needs or body segment boundary cuts short do not count against the affect, stress and hazard cell caps. */
import { expect, test } from 'vitest';
import { exportRun, replay, step } from '../src/index.ts';
import { benchRun } from './run-bench-fixture.ts';
import { accepted, HOUR } from './run-numerical-fixture.ts';

test('a 48-hour fine step without inputs completes and replays', () => {
  const run = benchRun(1);
  const result = accepted(step(run, { until: 48 * HOUR, inputs: [] }));
  expect(result.at).toBe(48 * HOUR);
  const archive = exportRun(run);
  expect(accepted(replay(archive)).fullHash).toBe(archive.hashes.full);
}, 60_000);
