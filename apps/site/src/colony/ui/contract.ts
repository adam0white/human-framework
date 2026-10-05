/**
 * The v2 worker contract as the UI reads it (docs/games/colony.md §10). SIM owns `protocol.ts` and
 * `sim/game.ts`; the UI imports those types through this file, plus a few display helpers.
 */
import { clockOf, type Minute } from '../sim/world-types.ts';

export type { MainToWorker as OutMsg, PauseInfo, PlaybackState, Speed } from '../protocol.ts';
export type {
  CharacterOutcome,
  EndSummary,
  Frame,
  GoalId,
  GoalSide,
  GoalStatus,
  GoalView,
  Nudge,
  TimelineMarker,
} from '../sim/game.ts';

/** "06:30" for a sim minute. */
export function hhmm(m: Minute): string {
  const c = clockOf(m);
  return `${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
}

/** "D2 19:00" for a sim minute. */
export function dayClock(m: Minute): string {
  return `D${clockOf(m).day} ${hhmm(m)}`;
}

/** Shown wherever Classic lacks something the Human side has (playtest item 16). */
export const NO_CONCEPT = 'Classic has no such concept';
