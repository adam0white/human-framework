/**
 * A tolerant replay of a playtest log, for counterfactuals and invariant sweeps over a real player's run. Unlike
 * `replay` (run.ts), an input that no longer applies (a card that never opened, a watcher who is not there) is
 * skipped and counted instead of throwing, and a phase that waits for the Keeper (goal, dawn, thaw, the closed
 * volume, the fair) is moved on with the plain input it needs when the log has nothing for it. Hooks see the state
 * at each dawn and at each dusk opened from a dawn (the day just lived). Used by tests; the game never calls it.
 */

import { applyInput, clockRuns, type Input, newGame, stepMinute } from '../../src/watch/sim/night.ts';
import type { LogEntry } from '../../src/watch/sim/run.ts';
import type { WatchState } from '../../src/watch/sim/state.ts';

export interface TolerantHooks {
  /** Each night's dawn page, as it opens. */
  dawn?: (s: WatchState) => void;
  /** Each dusk opened by 'toDusk' (the day summary is fresh). */
  dusk?: (s: WatchState) => void;
}

export interface TolerantResult {
  state: WatchState;
  applied: number;
  skipped: number;
}

/** The input a waiting phase needs to move on, when the log gives none. */
function nudge(s: WatchState): Input | null {
  switch (s.phase) {
    case 'goal':
      return { k: 'start' };
    case 'dawn':
      return { k: 'toDusk' };
    case 'thaw':
    case 'closed':
    case 'fair':
      return { k: 'continue' };
    default:
      return null;
  }
}

export function replayTolerant(
  seed: number,
  inputs: readonly LogEntry[],
  endMinute: number,
  hooks: TolerantHooks = {},
): TolerantResult {
  const s = newGame(seed);
  let idx = 0;
  let applied = 0;
  let skipped = 0;
  let phase = s.phase;
  const watch = (): void => {
    if (s.phase === phase) return;
    if (s.phase === 'dawn') hooks.dawn?.(s);
    if (s.phase === 'dusk' && phase === 'dawn') hooks.dusk?.(s);
    phase = s.phase;
  };
  for (let guard = 0; guard < 10_000_000; guard++) {
    for (let e = inputs[idx]; e !== undefined && e.m <= s.minute; e = inputs[idx]) {
      if (e.m === s.minute && applyInput(s, e.i)) applied += 1;
      else skipped += 1;
      idx += 1;
      watch();
    }
    if (s.phase === 'fallen' || (inputs[idx] === undefined && s.minute >= endMinute)) break;
    if (!clockRuns(s)) {
      const n = nudge(s);
      if (!n || !applyInput(s, n)) throw new Error(`tolerant replay stuck at ${s.minute} (${s.phase})`);
      watch();
      continue;
    }
    stepMinute(s);
    watch();
  }
  return { state: s, applied, skipped };
}
