/**
 * Ported from body/quantity.ts at 0cf1c6e^, preserving the shipped formula and draw order.
 * SCOPE: an explicit scalar observation. Nonzero truth and difficulty consume one seeded draw;
 * zero returns exact truth without a draw, and invalid or overflowing inputs reject first.
 * Error follows true sleepiness; confidence follows perceived sleepiness. Uniform errors and
 * confidence are uncalibrated engineering assumptions, not measured error intervals.
 */
import { draw } from '../body/span.ts';
import { cloneData } from '../core/clone.ts';
import { clamp01 } from '../core/index.ts';
import type { ActorRandomCursor, BodyReadout } from '../run-schema.ts';

export function estimateQuantity(
  body: Pick<BodyReadout, 'sleepiness' | 'perceived'>,
  rng: ActorRandomCursor,
  input: { truth: number; difficulty: number },
): { value: number; confidence: number; rng: ActorRandomCursor } {
  const { truth, difficulty } = input;
  if (
    !Number.isFinite(truth) ||
    truth < 0 ||
    !Number.isFinite(difficulty) ||
    difficulty < 0 ||
    difficulty > 1
  )
    throw new RangeError('Quantity requires finite non-negative truth and difficulty in [0,1]');
  const cursor = cloneData(rng);
  if (truth === 0 || difficulty === 0) return { value: truth, confidence: 1, rng: cursor };
  const error = difficulty * (0.05 + 0.45 * body.sleepiness);
  if (!Number.isFinite(truth * (1 + error))) throw new RangeError('Quantity estimate would overflow');
  const sampled = draw(cursor);
  const value = truth * (1 + (2 * sampled.value - 1) * error);
  return {
    value,
    confidence: clamp01(1 - difficulty * (0.05 + 0.45 * body.perceived.sleepiness)),
    rng: sampled.rng,
  };
}
