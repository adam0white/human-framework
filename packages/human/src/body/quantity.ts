/**
 * SCOPE: explicit scalar observation, never a render-time reader. Valid nonzero truth and
 * difficulty consume one seeded draw. Zero truth or zero difficulty return exact truth without
 * drawing; invalid/overflowing requests reject before drawing.
 * Van Dongen et al. 2003 (PMID 12683469) supports separating objective impairment from
 * subjective awareness, not quantity-task coefficients. Uniform errors and certainty are
 * engineering defaults, not calibrated error intervals. No history or belief mutation.
 */
import { clamp01, random } from '../core/index.ts';
import type { Person } from '../types.ts';
import { readBody } from './body.ts';

export function estimateQuantity(
  p: Person,
  input: { truth: number; difficulty: number },
): { value: number; confidence: number } {
  const { truth, difficulty } = input;
  if (
    !Number.isFinite(truth) ||
    truth < 0 ||
    !Number.isFinite(difficulty) ||
    difficulty < 0 ||
    difficulty > 1
  )
    throw new RangeError('Quantity requires finite non-negative truth and difficulty in [0,1]');
  if (truth === 0 || difficulty === 0) return { value: truth, confidence: 1 };
  const body = readBody(p);
  const error = difficulty * (0.05 + 0.45 * body.sleepiness);
  if (!Number.isFinite(truth * (1 + error))) throw new RangeError('Quantity estimate would overflow');
  const value = truth * (1 + (2 * random(p.rng) - 1) * error);
  return { value, confidence: clamp01(1 - difficulty * (0.05 + 0.45 * body.perceived.sleepiness)) };
}
