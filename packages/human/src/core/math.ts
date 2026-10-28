/** Internal minute-based arithmetic; public run clocks remain milliseconds. */
const MINUTES_PER_DAY = 24 * 60;

import { dexp, dlog, dpow } from './libm.ts';

/** Clamp into [min, max]. NaN maps to `min`, so one bad host number cannot propagate through state. */
export const clamp = (value: number, min: number, max: number): number =>
  // biome-ignore lint/complexity/useMathMinMax: Comparisons preserve signed zero and NaN bounds; Math.min/max change them.
  Number.isNaN(value) ? min : value < min ? min : value > max ? max : value;
export const clamp01 = (value: number): number => clamp(value, 0, 1);
export const clampSigned = (value: number): number => clamp(value, -1, 1);
/** A plain JSON object: not null, not an array. Restore sanitizers use it. @internal */
export const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
/** Three-way string comparison by code unit (the order `.sort()` uses), for stable sorts by id. @internal */
export const cmpStr = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
/**
 * The nested record `table[key]`, created when absent. Keys are host ids (people, actions, skills), so the lookup
 * is own-property only and a key naming an `Object.prototype` member is refused: writing through
 * `table['__proto__']` would change every object in the process. @internal
 */
export function rowOf<T>(table: Record<string, Record<string, T>>, key: string): Record<string, T> {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    throw new Error(`human: "${key}" cannot be used as an id`);
  }
  if (Object.hasOwn(table, key)) {
    const row = table[key];
    if (row) return row;
  }
  const row: Record<string, T> = {};
  table[key] = row;
  return row;
}
export const sigmoid = (x: number): number => 1 / (1 + dexp(-x));
export const logit = (p: number): number => {
  const q = clamp(p, 1e-6, 1 - 1e-6);
  return dlog(q / (1 - q));
};

/** Exponential decay of `value` toward `target` over `dt` minutes with the given half-life. */
export function decay(value: number, dt: number, halfLife: number, target = 0): number {
  if (halfLife <= 0) return target;
  return target + (value - target) * dpow(0.5, dt / halfLife);
}

export const minuteOfDay = (now: number): number =>
  ((now % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

/** Round to a fixed number of decimals to keep snapshots stable and readable. */
export const round = (value: number, places = 4): number => {
  const f = dpow(10, places);
  const rounded = Math.round(value * f) / f;
  // JSON cannot preserve signed zero; arithmetic cancellation must stay exportable.
  return rounded === 0 ? 0 : rounded;
};
