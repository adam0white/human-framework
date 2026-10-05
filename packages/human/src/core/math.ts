import { MINUTES_PER_DAY } from '../types.ts';
import { dexp, dlog, dpow } from './libm.ts';

/** Clamp into [min, max]. NaN maps to `min`, so one bad host number cannot propagate through state. */
export const clamp = (value: number, min: number, max: number): number =>
  Number.isNaN(value) ? min : value < min ? min : value > max ? max : value;
export const clamp01 = (value: number): number => clamp(value, 0, 1);
export const clampSigned = (value: number): number => clamp(value, -1, 1);
/** A finite number. Restore sanitizers use it. @internal */
export const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
/** A plain JSON object: not null, not an array. Restore sanitizers use it. @internal */
export const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
/** Every named field of `o` is a number (any number, NaN included). Restore sanitizers use it. @internal */
export const hasNumbers = (o: Record<string, unknown>, ...keys: string[]): boolean =>
  keys.every((k) => typeof o[k] === 'number');
/** Three-way string comparison by code unit (the order `.sort()` uses), for stable sorts by id. @internal */
export const cmpStr = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const sigmoid = (x: number): number => 1 / (1 + dexp(-x));
export const logit = (p: number): number => {
  const q = clamp(p, 1e-6, 1 - 1e-6);
  return dlog(q / (1 - q));
};
export const expit = sigmoid;

/** Exponential decay of `value` toward `target` over `dt` minutes with the given half-life. */
export function decay(value: number, dt: number, halfLife: number, target = 0): number {
  if (halfLife <= 0) return target;
  return target + (value - target) * dpow(0.5, dt / halfLife);
}

/** Smooth 0..1 step between edges. @internal */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export const minuteOfDay = (now: number): number =>
  ((now % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
export const dayOf = (now: number): number => Math.floor(now / MINUTES_PER_DAY);
export const hourOf = (now: number): number => Math.floor(minuteOfDay(now) / 60);

/** Round to a fixed number of decimals to keep snapshots stable and readable. */
export const round = (value: number, places = 4): number => {
  const f = dpow(10, places);
  return Math.round(value * f) / f;
};

/** Running mean update with a minimum learning rate so estimates keep adapting. @internal */
export function runningMean(mean: number, sample: number, n: number, minRate = 0.1): number {
  const rate = Math.max(1 / Math.max(n, 1), minRate);
  return mean + (sample - mean) * rate;
}

/**
 * One entry per id: the one with the latest minute (the later in the list on a tie), list order kept. Returns `xs`
 * itself when nothing repeats. Restore sanitizers use it. @internal
 */
export function latestPerId<T>(xs: T[], id: (x: T) => string, at: (x: T) => number): T[] {
  const best = new Map<string, T>();
  for (const x of xs) {
    const b = best.get(id(x));
    if (b === undefined || at(x) >= at(b)) best.set(id(x), x);
  }
  return best.size === xs.length ? xs : xs.filter((x) => best.get(id(x)) === x);
}

/**
 * At most `n` entries: the latest by minute (the later in the list on a tie), list order kept. Returns `xs` itself
 * when it is within `n`. Restore sanitizers use it. @internal
 */
export function newestN<T>(xs: T[], n: number, at: (x: T) => number): T[] {
  if (xs.length <= n) return xs;
  const keep = new Set(
    xs
      .map((x, i) => ({ x, i }))
      .sort((a, b) => at(b.x) - at(a.x) || b.i - a.i)
      .slice(0, n)
      .map((e) => e.x),
  );
  return xs.filter((x) => keep.has(x));
}
