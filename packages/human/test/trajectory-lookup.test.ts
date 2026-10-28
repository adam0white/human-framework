/** SCOPE: ordered trajectory lookup preserves shared endpoints and rejects gaps in logarithmic work. */
import { expect, it } from 'vitest';
import { nextPathBoundary, scalarAt } from '../src/body/span.ts';
import type { ScalarTrajectory } from '../src/run-schema.ts';

it('finds ordered cells at endpoints and gaps without scanning the trajectory', () => {
  const cells: ScalarTrajectory['segments'] = Array.from({ length: 1024 }, (_, i) => ({
    kind: 'constant' as const,
    from: i * 2,
    to: i * 2 + 2,
    value: i,
  }));
  let reads = 0;
  const segments = new Proxy(cells, {
    get(target, key, receiver) {
      if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
      return Reflect.get(target, key, receiver);
    },
  });
  const path = { from: 0, to: 2048, segments };
  expect(scalarAt(path, 1800)).toBe(899);
  expect(nextPathBoundary(1800, [path])).toBe(1802);
  expect(reads).toBeLessThan(100);
  const gap: ScalarTrajectory = {
    from: 0,
    to: 5,
    segments: [
      { kind: 'constant', from: 0, to: 1, value: 1 },
      { kind: 'constant', from: 3, to: 5, value: 2 },
    ],
  };
  expect(() => scalarAt(gap, 2)).toThrow('trajectory does not cover numerical dependency');
  expect(() => nextPathBoundary(2, [gap])).toThrow('trajectory lacks next canonical forcing cell');
  expect(scalarAt(gap, 1)).toBe(1);
  expect(() => nextPathBoundary(1, [gap])).toThrow();
});
