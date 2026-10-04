/**
 * A run: the state plus the Keeper's input log, stamped by sim minute. Inputs apply between minutes, so the
 * same seed and log give the same run whatever the real-time pacing was. The playtest export is the seed, the
 * log and the end state; `replay` rebuilds the end state from seed and log and is pinned by `run.test.ts`.
 * The full state holds every person's memory and is too long to paste, so the export's `end` is the game state
 * with each person summarised (`EndState`) plus a hash of the full state, which a replay must match exactly.
 */
import { impressionOf, readCapacities } from '@human/framework';
import { applyInput, clockRuns, type Input, newGame, stepMinute } from './night.ts';
import type { WatchState } from './state.ts';

/** A person as the export shows them: enough to read a run, not to resume it. */
export interface PersonSummary {
  id: string;
  now: number;
  activity: string | null;
  needs: Record<string, number>;
  health: number;
  injuries: { part: string; severity: number; bleeding?: number }[];
  capacities: Record<string, number>;
  fear: { targetId?: string; intensity: number }[];
  stress: number | null;
  inBreak: string | null;
  downed: boolean;
  trustInKeeper: number | null;
  ties: { otherId: string; affection: number; trust: number }[];
}

export interface EndState extends Omit<WatchState, 'community' | 'keeper' | 'percepts'> {
  people: PersonSummary[];
  /** What the Keeper believes of each watcher (cue, value, confidence). */
  keeperImpressions: ReturnType<typeof impressionOf>[];
  /** FNV-1a of the full state JSON: a replay must reproduce it exactly. */
  fullHash: string;
}

function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const r3 = (x: number): number => Math.round(x * 1000) / 1000;

/** The export's view of a state (see the file comment). */
export function endState(s: WatchState): EndState {
  const { community, keeper, percepts: _p, ...rest } = s;
  const people: PersonSummary[] = community.people.map((p) => ({
    id: p.id,
    now: p.now,
    activity: p.activity?.affordanceId ?? null,
    needs: Object.fromEntries(Object.entries(p.needs).map(([k, v]) => [k, r3(v)])),
    health: r3(p.body.health),
    injuries: p.body.injuries.map((i) => ({
      part: i.part,
      severity: r3(i.severity),
      ...(i.bleeding !== undefined ? { bleeding: r3(i.bleeding) } : {}),
    })),
    capacities: Object.fromEntries(Object.entries(readCapacities(p)).map(([k, v]) => [k, r3(v)])),
    fear: p.affect.emotions
      .filter((e) => e.id === 'fear')
      .map((e) => ({
        ...(e.targetId !== undefined ? { targetId: e.targetId } : {}),
        intensity: r3(e.intensity),
      })),
    stress: p.affect.crisis ? r3(p.affect.crisis.stress) : null,
    inBreak: p.affect.crisis?.break?.behaviourId ?? null,
    downed: p.body.downed !== undefined,
    trustInKeeper: p.will.voices.find((v) => v.voiceId === 'keeper')?.trust ?? null,
    ties: p.social.relationships.map((r) => ({
      otherId: r.otherId,
      affection: r3(r.affection),
      trust: r3(r.trust),
    })),
  }));
  return {
    ...structuredClone(rest),
    people,
    keeperImpressions: community.people.map((p) => impressionOf(keeper, p.id, s.minute)),
    fullHash: fnv(JSON.stringify(s)),
  };
}

/** Bump when rules change so an old export is not replayed against new rules. */
export const WATCH_SCENARIO_VERSION = 4;

export interface LogEntry {
  /** The sim minute the input applied at (before that minute resolved). */
  m: number;
  i: Input;
}

export interface PlaytestExport {
  game: 'the-night-watch';
  phase: 'G3-3';
  scenario: number;
  seed: number;
  inputs: LogEntry[];
  endMinute: number;
  end: EndState;
}

/**
 * A saved page of the chronicle: the whole state and the input log up to it (G3-3 saves). Resuming continues the
 * same run: the log keeps growing from the snapshot, so a later export still replays from the seed.
 */
export interface Snapshot {
  scenario: number;
  seed: number;
  log: LogEntry[];
  state: WatchState;
}

export class WatchRun {
  readonly state: WatchState;
  readonly log: LogEntry[] = [];

  constructor(
    readonly seed: number,
    from?: Snapshot,
  ) {
    if (from) {
      if (from.scenario !== WATCH_SCENARIO_VERSION)
        throw new Error(`save is scenario ${from.scenario}, this build is ${WATCH_SCENARIO_VERSION}`);
      if (from.seed !== seed) throw new Error('save is from another seed');
      this.state = structuredClone(from.state);
      this.log = from.log.map((e) => ({ m: e.m, i: { ...e.i } }));
    } else this.state = newGame(seed);
  }

  /** Resumes a saved page (see `Snapshot`). */
  static resume(snap: Snapshot): WatchRun {
    return new WatchRun(snap.seed, snap);
  }

  /** The current page as a snapshot (deep copies: the run goes on unchanged). */
  snapshot(): Snapshot {
    return {
      scenario: WATCH_SCENARIO_VERSION,
      seed: this.seed,
      log: this.log.map((e) => ({ m: e.m, i: { ...e.i } })),
      state: structuredClone(this.state),
    };
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
      phase: 'G3-3',
      scenario: WATCH_SCENARIO_VERSION,
      seed: this.seed,
      inputs: this.log.map((e) => ({ m: e.m, i: { ...e.i } })),
      endMinute: this.state.minute,
      end: endState(this.state),
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
