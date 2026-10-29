import { expect, it } from 'vitest';
import { integrateCell, required } from '../src/body/span.ts';

it('preserves a coupled cell, its error estimate and next width exactly', () => {
  const cell = integrateCell(7000, [0.73, 0.24], 8192, (t, y) => [
    -required(y[0]) * 0.02 + required(y[1]) * 0.03,
    0.04 - required(y[1]) * 0.07 + t / 1e8,
  ]);
  expect(cell).toEqual({
    to: 15192,
    cells: [
      {
        originMs: 7000,
        leftOffsetMinutes: 0,
        rightOffsetMinutes: 0.13653333333333334,
        coefficients: [
          0.73, -0.0010103466666666668, 0.000007886223498822887, -2.027155969320423e-8, 4.486658440328029e-11,
        ],
        estimatedError: 1.358676134562605e-14,
      },
      {
        originMs: 7000,
        leftOffsetMinutes: 0,
        rightOffsetMinutes: 0.13653333333333334,
        coefficients: [
          0.24, 0.0031771306666666665, -0.000009590042932482373, 3.055131360459503e-8, -7.257314299143522e-11,
        ],
        estimatedError: 1.358676134562605e-14,
      },
    ],
    values: [0.728997519330139, 0.24316757110247464],
    nextWidth: 16384,
    calls: 7,
    error: 1.358676134562605e-14,
  });
});
