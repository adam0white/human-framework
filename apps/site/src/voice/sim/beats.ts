/**
 * Auto-pause beats (build plan §8), a closed list. `day-end` and `eid` are screens and always pause. With
 * Auto-pause on, `verdict` always pauses and the rest pause only outside a 20 sim-minute cooldown since the last
 * pause; inside it (or with Auto-pause off) they are logged and do not pause. `close-call` fires at most twice a day.
 */
import { dayOf } from '@human/framework';
import type { BeatKind } from '../protocol.ts';

export const BEAT_COOLDOWN = 20;
export const CLOSE_CALLS_PER_DAY = 2;
const SCREENS: ReadonlySet<BeatKind> = new Set(['day-end', 'eid']);

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
}

export const createBeats = (): BeatState => ({
  lastPauseAt: Number.NEGATIVE_INFINITY,
  closeCalls: { day: -1, n: 0 },
  flagged: [],
  history: [],
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

/** Record a beat; returns whether it pauses. */
export function fire(b: BeatState, kind: BeatKind, at: number, text: string, autoPause: boolean): boolean {
  const pauses =
    SCREENS.has(kind) || (autoPause && (kind === 'verdict' || at - b.lastPauseAt >= BEAT_COOLDOWN));
  if (pauses) b.lastPauseAt = at;
  b.history.push({ kind, at, text, paused: pauses });
  if (b.history.length > 2000) b.history.splice(0, b.history.length - 2000);
  return pauses;
}
