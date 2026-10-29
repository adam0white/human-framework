import { expect, it } from 'vitest';
import { sampledPath } from '../src/body/span.ts';

it('preserves the exact canonical polynomial and residual of a sampled body readout', () => {
  expect(sampledPath(0, 1000, (t) => 0.19 * (t / 1000) ** 2 + (0.31 * t) / 1000 + 0.17)).toEqual([
    {
      kind: 'quartic',
      from: 0,
      to: 1000,
      cell: {
        originMs: 0,
        leftOffsetMinutes: 0,
        rightOffsetMinutes: 1 / 60,
        coefficients: [
          0.17, 0.3099999999999995, 0.18999999999999861, -1.7763568394002505e-15, 2.6645352591003757e-15,
        ],
        estimatedError: 1.1102230246251565e-15,
      },
    },
  ]);
});
