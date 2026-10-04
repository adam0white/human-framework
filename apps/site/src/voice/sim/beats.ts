/**
 * Auto-pause beats (build plan §8), a closed list. `day-end` and `eid` are screens and always pause. With
 * Auto-pause on, `verdict` always pauses and the rest pause only outside a 20 sim-minute cooldown since the last
 * pause; inside it (or with Auto-pause off) they are logged and do not pause. `close-call` fires at most twice a day.
 *
 * Seventh pass (fewer, better pauses): a beat can be logged without pausing (`canPause: false`: his yes, a memory,
 * a torn moment with nothing to say to it), and a time-of-day beat (`DECAYS`) that has already paused twice with the
 * same wording, digits aside, is logged from then on unless it comes with something to say (`actionable`).
 */
import { dayOf } from '@human/framework';
import type { BeatKind } from '../protocol.ts';

export const BEAT_COOLDOWN = 20;
export const CLOSE_CALLS_PER_DAY = 2;
const SCREENS: ReadonlySet<BeatKind> = new Set(['day-end', 'eid']);
/** Beats that recur by the clock: after two pauses with the same wording they are logged, not paused. */
const DECAYS: ReadonlySet<BeatKind> = new Set(['wake', 'craving', 'duty-risk', 'close-call']);
export const DECAY_AFTER = 2;

export interface BeatRecord {
  kind: BeatKind;
  at: number;
  text: string;
  paused: boolean;
}

export interface BeatState {
  lastPauseAt: number;
  closeCalls: { day: number; n: number };
  /** Commitments already flagged as closing, and fast-thirst days. */
  flagged: string[];
  /** Every beat that fired (tests and the measured timings). */
  history: BeatRecord[];
  /** Pauses so far by wording (digits aside), for `DECAYS`. Optional in states from before the seventh pass. */
  pausedKeys?: Record<string, number>;
}

export const createBeats = (): BeatState => ({
  lastPauseAt: Number.NEGATIVE_INFINITY,
  closeCalls: { day: -1, n: 0 },
  flagged: [],
  history: [],
  pausedKeys: {},
});

/** Whether a close-call beat may fire today (and counts it). */
export function takeCloseCall(b: BeatState, at: number): boolean {
  const day = dayOf(at);
  if (b.closeCalls.day !== day) b.closeCalls = { day, n: 0 };
  if (b.closeCalls.n >= CLOSE_CALLS_PER_DAY) return false;
  b.closeCalls.n += 1;
  return true;
}

/** Flag `key` once; false when it was already flagged. */
export function flagOnce(b: BeatState, key: string): boolean {
  if (b.flagged.includes(key)) return false;
  b.flagged.push(key);
  if (b.flagged.length > 200) b.flagged.splice(0, b.flagged.length - 200);
  return true;
}

/** The wording a beat decays by: its kind and text with numbers taken out ("He is waking (07:59)"). */
export const beatKey = (kind: BeatKind, text: string): string => `${kind}:${text.replace(/\d+/g, '#')}`;

/** Record a beat; returns whether it pauses. */
export function fire(
  b: BeatState,
  kind: BeatKind,
  at: number,
  text: string,
  autoPause: boolean,
  o: { canPause?: boolean; actionable?: boolean } = {},
): boolean {
  const key = beatKey(kind, text);
  b.pausedKeys ??= {};
  const decayed = DECAYS.has(kind) && !o.actionable && (b.pausedKeys[key] ?? 0) >= DECAY_AFTER;
  const pauses =
    SCREENS.has(kind) ||
    (o.canPause !== false &&
      !decayed &&
      autoPause &&
      (kind === 'verdict' || at - b.lastPauseAt >= BEAT_COOLDOWN));
  if (pauses) {
    b.lastPauseAt = at;
    b.pausedKeys[key] = (b.pausedKeys[key] ?? 0) + 1;
  }
  b.history.push({ kind, at, text, paused: pauses });
  if (b.history.length > 2000) b.history.splice(0, b.history.length - 2000);
  return pauses;
}
