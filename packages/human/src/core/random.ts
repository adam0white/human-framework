/**
 * Seeded, serializable PRNG (sfc32). State lives in plain JSON on the owner (`person.rng` or host state)
 * and is advanced in place, so identical seeds and call sequences give identical results.
 */
import type { RngState } from '../types.ts';
import { dcos, dlog } from './libm.ts';

export function createRng(seed: number): RngState {
  // splitmix32 to spread a small integer seed across four words.
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
  const rng = { a: next(), b: next(), c: next(), d: next() };
  for (let i = 0; i < 12; i++) random(rng);
  return rng;
}

/** Uniform float in [0, 1). Mutates `rng`. */
export function random(rng: RngState): number {
  const t = (((rng.a + rng.b) >>> 0) + rng.d) >>> 0;
  rng.d = (rng.d + 1) >>> 0;
  rng.a = rng.b ^ (rng.b >>> 9);
  rng.b = (rng.c + (rng.c << 3)) >>> 0;
  rng.c = ((rng.c << 21) | (rng.c >>> 11)) >>> 0;
  rng.c = (rng.c + t) >>> 0;
  return t / 4294967296;
}

export function chance(rng: RngState, p: number): boolean {
  return random(rng) < p;
}

/** Standard normal via Box–Muller (consumes two draws). */
export function normal(rng: RngState, mean = 0, sd = 1): number {
  const u = Math.max(random(rng), 1e-12);
  const v = random(rng);
  return mean + sd * Math.sqrt(-2 * dlog(u)) * dcos(2 * Math.PI * v);
}

export function pick<T>(rng: RngState, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick from empty list');
  return items[Math.floor(random(rng) * items.length)] as T;
}

/** Index sampled proportionally to non-negative weights; -1 when all weights are zero. */
export function weightedIndex(rng: RngState, weights: readonly number[]): number {
  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  if (total <= 0) return -1;
  let r = random(rng) * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i] ?? 0);
    if (r < 0) return i;
  }
  return weights.length - 1;
}
