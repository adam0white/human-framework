/**
 * Cross-platform math: `core/libm` must give the same bits everywhere, and the engine must not call the platform's
 * transcendental functions. The golden hashes below were produced on macOS arm64; CI runs them on Linux x64, so a
 * green CI run is the cross-architecture check. Native `Math.exp`/`log`/`cos`/non-integer `**` fail this on Node 26.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { dcos, dexp, dlog, dpow } from '../src/core/libm.ts';

const hashOf = (xs: number[]) => {
  const view = new DataView(new ArrayBuffer(8 * xs.length));
  xs.forEach((x, i) => {
    view.setFloat64(8 * i, x, false);
  });
  return createHash('sha256').update(new Uint8Array(view.buffer)).digest('hex').slice(0, 16);
};
const sweep = (f: (x: number) => number, from: number, to: number, n = 50_000) =>
  Array.from({ length: n }, (_, i) => f(from + ((to - from) * (i + 0.5)) / n + i * 1e-13));

/** Distance in units in the last place between two finite doubles of the same sign. */
const ulps = (a: number, b: number) => {
  if (a === b) return 0;
  const v = new DataView(new ArrayBuffer(16));
  v.setFloat64(0, a);
  v.setFloat64(8, b);
  return Number(v.getBigInt64(0) - v.getBigInt64(8)) * (a < 0 ? -1 : 1);
};

describe('core/libm', () => {
  test('agrees with the platform libm to within an ulp (accuracy)', () => {
    for (const x of sweep((x) => x, -700, 700, 20_000))
      expect(Math.abs(ulps(dexp(x), Math.exp(x)))).toBeLessThanOrEqual(1);
    for (const x of sweep((x) => x, -20, 20, 20_000))
      expect(Math.abs(ulps(dexp(x), Math.exp(x)))).toBeLessThanOrEqual(1);
    for (const x of sweep((x) => dexp(x), -700, 700, 20_000))
      expect(Math.abs(ulps(dlog(x), Math.log(x)))).toBeLessThanOrEqual(1);
    for (const x of sweep((x) => x, -100, 100, 20_000)) {
      const c = dcos(x);
      expect(Math.abs(c - Math.cos(x))).toBeLessThanOrEqual(2 ** -52);
    }
    for (const x of sweep((x) => x, 1e-6, 5, 5_000))
      for (const y of [-3.7, -1, 0.3, 0.5, 2, 2.5, 17.25]) {
        const r = dpow(x, y);
        expect(Math.abs(r - x ** y) / Math.abs(x ** y)).toBeLessThan(1e-13);
      }
  });

  test('special values', () => {
    expect(dexp(0)).toBe(1);
    expect(dexp(Number.NEGATIVE_INFINITY)).toBe(0);
    expect(dexp(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
    expect(dexp(1000)).toBe(Number.POSITIVE_INFINITY);
    expect(dexp(-1000)).toBe(0);
    expect(dexp(Number.NaN)).toBeNaN();
    expect(dlog(1)).toBe(0);
    expect(dlog(0)).toBe(Number.NEGATIVE_INFINITY);
    expect(dlog(-1)).toBeNaN();
    expect(dlog(5e-324)).toBe(Math.log(5e-324));
    expect(dcos(0)).toBe(1);
    expect(dcos(Number.POSITIVE_INFINITY)).toBeNaN();
    expect(dpow(10, 4)).toBe(10_000);
    expect(dpow(-2, 3)).toBe(-8);
    expect(dpow(0.5, -2)).toBe(4);
    expect(dpow(0, 0.5)).toBe(0);
    expect(dpow(-2, 0.5)).toBeNaN();
    expect(dpow(7, 0)).toBe(1);
  });

  test('gives the same bits on every platform (golden hashes, generated on macOS arm64, checked on Linux x64 CI)', () => {
    expect({
      exp: hashOf(sweep(dexp, -30, 30)),
      expWide: hashOf(sweep(dexp, -745, 709)),
      log: hashOf(sweep((x) => dlog(x), 1e-8, 1e4)),
      cos: hashOf(sweep(dcos, -50, 50)),
      pow: hashOf(sweep((x) => dpow(x, 1.7) + dpow(0.5, x) + dpow(2, x / 3), 0, 40)),
    }).toEqual(GOLDEN);
  });

  test('the engine calls no platform transcendental outside core/libm', () => {
    const banned =
      /Math\.(exp|expm1|log|log2|log10|log1p|pow|sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|cbrt|hypot)\(|\*\*/;
    const root = new URL('../src/', import.meta.url);
    const offenders: string[] = [];
    for (const rel of readdirSync(root, { recursive: true, encoding: 'utf8' })) {
      if (!rel.endsWith('.ts') || rel === 'core/libm.ts') continue;
      readFileSync(new URL(rel, root), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
        .split('\n')
        .forEach((line, i) => {
          if (banned.test(line.replace(/\/\/.*$/, ''))) offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});

const GOLDEN = {
  exp: '1f5e5d39d77c2343',
  expWide: '7ff58d8785ee0339',
  log: 'b9b8be695d4213b5',
  cos: '8419f04f44c54f49',
  pow: '46c8741786b60423',
};
