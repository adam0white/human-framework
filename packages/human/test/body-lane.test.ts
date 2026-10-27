import { expect, it } from 'vitest';
import { evaluateCell, integrateCell, required, scalarAt } from '../src/body/span.ts';

it('integrates a continuous forcing path and materializes one anchored cell', () => {
  const cell = integrateCell(0, [1], 1000, (_t, y) => [-required(y[0])], 1e-12);
  expect(evaluateCell(required(cell.cells[0]), 500)).toBeCloseTo(Math.exp(-1 / 120), 10);
  expect(evaluateCell(required(cell.cells[0]), 1000)).toBeCloseTo(Math.exp(-1 / 60), 10);
});
it('reads exponential trajectories without a target-sized recurrence', () => {
  expect(
    scalarAt(
      {
        from: 0,
        to: 60000,
        segments: [{ kind: 'exponential', from: 0, to: 60000, initial: 1, target: 0, ratePerMinute: 1 }],
      },
      30000,
    ),
  ).toBeCloseTo(Math.exp(-0.5), 14);
});
it('isolates both threshold crossings of an interior dip even when endpoints are above it', async () => {
  const { thresholdTimes } = await import('../src/body/span.ts');
  const roots = thresholdTimes(
    {
      originMs: 0,
      leftOffsetMinutes: 0,
      rightOffsetMinutes: 1,
      coefficients: [0.3001, -0.001, 0.001, 0, 0],
      estimatedError: 0,
    },
    0,
    60000,
    0.3,
  );
  expect(roots).toHaveLength(2);
  expect(roots[0]).toBeCloseTo(((1 - Math.sqrt(0.6)) / 2) * 60000, 6);
  expect(roots[1]).toBeCloseTo(((1 + Math.sqrt(0.6)) / 2) * 60000, 6);
});

it('finds a positive interior hazard interval with both endpoint predicates closed', async () => {
  const { advanceHazard, newHazard } = await import('../src/body/span.ts');
  const h = {
    ...newHazard({ kind: 'doze', channelId: 'onset' }, 0, 'test', '0'.repeat(64)),
    threshold: { exponentialBudget: 0.01, drawOrdinal: 13, allocatedAtMs: 0 },
  };
  const lambda = (t: number) => Math.max(0, 1 - ((t - 30000) / 10000) ** 2);
  const result = advanceHazard(h, 0, 60000, lambda, 60000, (t) =>
    t < 20000 ? 20000 : t < 40000 ? 40000 : 60000,
  );
  expect(lambda(0)).toBe(0);
  expect(lambda(60000)).toBe(0);
  expect(result.boundary?.operation).toBe('fire');
  const integral = (t: number) => {
    const d = t - 20000;
    return ((d * d) / 10000 - (d * d * d) / 300000000) / 60000;
  };
  expect(integral(result.at)).toBeGreaterThanOrEqual(0.01);
  expect(integral(result.at - 1)).toBeLessThan(0.01);
});
