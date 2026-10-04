/**
 * A run: the state plus the Keeper's input log, stamped by sim minute. Inputs apply between minutes, so the
 * same seed and log give the same run whatever the real-time pacing was. The playtest export is the seed, the
 * log and the end state; `replay` rebuilds the end state from seed and log and is pinned by `run.test.ts`.
 */
import { applyInput, clockRuns, type Input, newGame, stepMinute } from './night.ts';
import type { WatchState } from './state.ts';

/** Bump when rules change so an old export is not replayed against new rules. */
export const WATCH_SCENARIO_VERSION = 2;

export interface LogEntry {
  /** The sim minute the input applied at (before that minute resolved). */
  m: number;
  i: Input;
}

export interface PlaytestExport {
  game: 'the-night-watch';
  phase: 'G3-1';
  scenario: number;
  seed: number;
  inputs: LogEntry[];
  endMinute: number;
  end: WatchState;
}

export class WatchRun {
  readonly state: WatchState;
  readonly log: LogEntry[] = [];

  constructor(readonly seed: number) {
    this.state = newGame(seed);
  }

  /** Applies and logs an input; inputs that do not apply in this phase are dropped unlogged. */
  input(i: Input): boolean {
    const m = this.state.minute;
    if (!applyInput(this.state, i)) return false;
    this.log.push({ m, i });
    return true;
  }

  step(): void {
    stepMinute(this.state);
  }

  export(): PlaytestExport {
    return {
      game: 'the-night-watch',
      phase: 'G3-1',
      scenario: WATCH_SCENARIO_VERSION,
      seed: this.seed,
      inputs: this.log.map((e) => ({ m: e.m, i: { ...e.i } })),
      endMinute: this.state.minute,
      end: structuredClone(this.state),
    };
  }
}

/** Rebuilds a run's end state from its seed and input log. Throws if the log does not fit the rules. */
export function replay(exp: Pick<PlaytestExport, 'scenario' | 'seed' | 'inputs' | 'endMinute'>): WatchState {
  if (exp.scenario !== WATCH_SCENARIO_VERSION)
    throw new Error(`export is scenario ${exp.scenario}, this build is ${WATCH_SCENARIO_VERSION}`);
  const run = new WatchRun(exp.seed);
  const s = run.state;
  let idx = 0;
  for (let guard = 0; guard < 10_000_000; guard++) {
    for (let e = exp.inputs[idx]; e !== undefined && e.m === s.minute; e = exp.inputs[idx]) {
      if (!applyInput(s, e.i)) throw new Error(`input ${idx} (${e.i.k}) did not apply at minute ${e.m}`);
      idx += 1;
    }
    const pending = exp.inputs[idx];
    if (pending === undefined && s.minute >= exp.endMinute) return s;
    if (!clockRuns(s)) {
      throw new Error(`replay stuck at minute ${s.minute} (${s.phase}) waiting for input ${idx}`);
    }
    if (pending !== undefined && pending.m < s.minute)
      throw new Error(`input ${idx} at minute ${pending.m} is behind the clock (${s.minute})`);
    stepMinute(s);
  }
  throw new Error('replay did not finish');
}
