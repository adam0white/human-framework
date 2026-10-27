/** SCOPE: bounded noisy amount estimate, with explicit actor stream. No observation
 * or truth is inferred from absent evidence. Return detaches its RNG cursor. */
import type { ActorRandomCursor, DeepReadonly } from '../run-schema.ts';
import { clip, draw } from './span.ts';
export function estimateQuantity(
  truth: number,
  difficulty: number,
  sleepiness: number,
  perceivedSleepiness: number,
  cursor: DeepReadonly<ActorRandomCursor>,
) {
  if (
    !Number.isFinite(truth) ||
    truth < 0 ||
    !Number.isFinite(difficulty) ||
    difficulty < 0 ||
    difficulty > 1
  )
    throw new RangeError('invalid quantity premise');
  if (truth === 0 || difficulty === 0) return { value: truth, confidence: 1, rng: structuredClone(cursor) };
  const error = difficulty * (0.05 + 0.45 * sleepiness);
  if (!Number.isFinite(truth * (1 + error))) throw new RangeError('quantity estimate overflow');
  const d = draw(cursor);
  return {
    value: truth * (1 + (2 * d.value - 1) * error),
    confidence: clip(1 - difficulty * (0.05 + 0.45 * perceivedSleepiness)),
    rng: d.rng,
  };
}
