/** SCOPE: source composite engineering priors, one immutable source authority.
 * The 4.0 effective record excludes the retired maxSegment grid coefficient.
 */
import type { BodyLoad } from './run-schema.ts';

export const PERSON_DEFAULTS = {
  /** Body load while idle and awake. */
  idleLoad: { effort: 0.05, focus: 0.05, mode: 'awake' } satisfies BodyLoad,
  /** Re-decide at least this often while an activity runs. */
  reviewInterval: 30,
  /** Closeness at or above which a 'comfort' percept from that person eases a mental break. */
  comfortCloseness: 0.3,
  /** Review cadence while asleep: a sleeper only wakes for a body need or a strong disturbance. */
  sleepReviewInterval: 120,
  /** Longest interval advanced in one segment, so need-driven feelings are sampled on long idle ticks too. */
  maxSegment: 60,
  /** Perceived readouts at which a body need interrupts the current activity. */
  interruptThresholds: { hunger: 0.7, thirst: 0.7, sleepiness: 0.85 },
  /** Decision records kept in `trace` (the most `Retention.trace` may ask for). */
  maxTrace: 32,
  /** Belonging/leisure urgency above which loneliness/boredom are felt, and their gain. */
  lonelinessFrom: 0.25,
  boredomFrom: 0.35,
  moodEmotionGain: 0.8,
  /** Felt valence of an outcome: Σ (base + urgency) × realized delta. */
  feltBase: 0.3,
  feltGain: 1,
  failedPenalty: 0.3,
  /** Distress and esteem loss from a broken commitment, times its importance. */
  missedDistress: 0.4,
  missedEsteemCost: 0.05,
  /** Trust penalty per unit of bodily-need level lost during a suggested activity (needs left urgent). */
  voiceHarmGain: 1,
  /** Urgency above which a bodily need that fell during a suggested activity counts as harm. */
  voiceHarmUrgency: 0.5,
  /** Magnitude of social events implied by taking part together. */
  participationMagnitude: 0.5,
  /** Outcome quality assumed for work done under protest when the host reports none (`Outcome.quality`). */
  protestQuality: 0.7,
  /** Felt valence lost per unit of quality below 1. */
  qualityPenalty: 0.4,
  /** Minutes after the activity's planned end during which a `begin` promise can still be kept. */
  promiseSlack: 30,
  /** Minutes of day treated as night for episode tags. */
  nightFrom: 20 * 60,
  nightTo: 5 * 60,
};
