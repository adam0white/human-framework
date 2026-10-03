import { describe, expect, test } from 'vitest';
import { createRng, decay, normal, random, weightedIndex } from '../src/core/index.ts';

describe('core/random', () => {
  test('is deterministic and serializable', () => {
    const a = createRng(42);
    const b = JSON.parse(JSON.stringify(createRng(42)));
    const xs = Array.from({ length: 5 }, () => random(a));
    const ys = Array.from({ length: 5 }, () => random(b));
    expect(xs).toEqual(ys);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
  test('different seeds diverge', () => {
    expect(random(createRng(1))).not.toBe(random(createRng(2)));
  });
  test('normal and weighted sampling behave', () => {
    const rng = createRng(7);
    const samples = Array.from({ length: 4000 }, () => normal(rng));
    const mean = samples.reduce((s, x) => s + x, 0) / samples.length;
    expect(Math.abs(mean)).toBeLessThan(0.06);
    expect(weightedIndex(rng, [0, 0])).toBe(-1);
    expect(weightedIndex(rng, [0, 5, 0])).toBe(1);
  });
});

describe('core/math', () => {
  test('decay halves at the half-life', () => {
    expect(decay(1, 60, 60)).toBeCloseTo(0.5);
    expect(decay(1, 60, 60, 0.4)).toBeCloseTo(0.7);
  });
});
