/** SCOPE: source composite engineering priors, one immutable source authority. Every key here is read by a
 * faculty; 4.0 removed the keys nothing read (CHANGELOG Removed). */
import type { BodyLoad } from './run-schema.ts';

export const PERSON_DEFAULTS = {
  /** Body load while idle and awake. */
  idleLoad: { effort: 0.05, focus: 0.05, mode: 'awake' } satisfies BodyLoad,
  /** Re-decide at least this often while an activity runs. */
  reviewInterval: 30,
  /** Review cadence (minutes) while asleep. */
  sleepReviewInterval: 120,
  /** Decision records kept in `trace` (the most `Retention.trace` may ask for). */
  maxTrace: 32,
  /** Felt valence of an outcome: Σ (base + urgency) × realized delta. */
  feltBase: 0.3,
  feltGain: 1,
  failedPenalty: 0.3,
  /** Distress and esteem loss from a broken commitment, times its importance. */
  missedDistress: 0.4,
  missedEsteemCost: 0.05,
  /** Magnitude of social events implied by taking part together. */
  participationMagnitude: 0.5,
  /** Felt valence lost per unit of quality below 1. */
  qualityPenalty: 0.4,
};
