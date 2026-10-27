/** SCOPE: normalized storage with delayed intake. No automatic waking/voiding. */

import { dexp } from '../core/libm.ts';
import type { BladderState, DeepReadonly, Effective_BLADDER_DEFAULTS, Offer } from '../run-schema.ts';
import { clip, LN2 } from './span.ts';
export const BLADDER_DEFAULTS = Object.freeze({
  intakeScale: 0.5,
  maxPending: 4,
  halfLife: 45,
  basePerMinute: 0.001,
  choiceThreshold: 0.35,
  choiceScale: 4,
});
export function bladderAt(
  b: DeepReadonly<BladderState>,
  minutes: number,
  p: DeepReadonly<Effective_BLADDER_DEFAULTS>,
): BladderState {
  const pending = b.pending * dexp((-LN2 * minutes) / p.halfLife);
  return { fill: clip(b.fill + p.basePerMinute * minutes + b.pending - pending), pending };
}
export function bladderMotivation(
  b: DeepReadonly<BladderState>,
  offer: DeepReadonly<Offer>,
  success: number,
  p: DeepReadonly<Effective_BLADDER_DEFAULTS>,
): number {
  return offer.expected.voidsBladder === true
    ? p.choiceScale * clip((b.fill - p.choiceThreshold) / (1 - p.choiceThreshold)) * clip(success)
    : 0;
}
