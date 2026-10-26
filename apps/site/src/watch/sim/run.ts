/**
 * A run: the state plus the Keeper's input log, stamped by sim minute. Inputs apply between minutes, so the
 * same seed and log give the same run whatever the real-time pacing was. The playtest export is the seed, the
 * log and the end state; `replay` rebuilds the end state from seed and log and is pinned by `run.test.ts`.
 * The full state holds every person's memory and is too long to paste, so the export's `end` is the game state
 * with each person summarised (`EndState`) plus two hashes. `ruleHash` covers the rule state only (`ruleState`: what
 * the rules decide, without the words they are told in), and a replay on a later build of the same scenario must
 * match it. `fullHash` covers the whole state, words included; it matches only on the build that made the export,
 * so a wording change does not break older exports (watch.md, Export provenance and hash policy).
 */
import { impressionOf, readCapacities } from '@adam0white/human-framework';
import type { CastChapter } from '../../shared/cast-chapter.ts';
import { FRAMEWORK_PACKAGE_VERSION } from '../../shared/playtest.ts';
import { ALL_POST_IDS, WINTER_RULES } from './config.ts';
import { validWatchOptions, type WatchOptions } from './dusk-rest.ts';
import { ownsWarningCast, validateLocalWarningState, validLocalWarningInput } from './local-warning.ts';
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
  /** FNV-1a of `ruleState`: a replay of the same scenario must reproduce it, on any build. */
  ruleHash: string;
  /** FNV-1a of the full state JSON, words included: equal only on the build that made the export (advisory). */
  fullHash: string;
}

/**
 * The rule state: what the rules decided, with nothing that is only told in words, so a change of wording leaves it
 * alone and a change of rules does not (watch.md, Export provenance and hash policy). Kept: the clock and phase; the three RNG streams; grain and the
 * year's grain; the winter's plan without its words (length, lead, twist, peak, the question's kind and people and
 * whether it was met); the night's plan (lead, warned stretches, waves, spawns) and threats on the wall; postings,
 * presses and places; the lantern, rope and bell; commands and asks by target and end; the village's people (ids,
 * homes, usual posts, status, limp, parents), marks, Gate keeper and heir, pairings by who, with whom and until when,
 * expecting mothers and newborns; the night history; moments by kind, person, minute and choice; each person's
 * summary (`PersonSummary`) and the Keeper's impressions. Left out: the chronicle, alerts, dawn and day pages, the
 * scout's words, notes, last voices, cards and the fair's offers (their texts), talks, volumes and leaves, and the
 * pacing (`slowUntil`).
 */
export function ruleState(s: WatchState, people = summarise(s)): unknown {
  const w = s.winter;
  return {
    minute: s.minute,
    phase: s.phase,
    night: s.night,
    year: s.year,
    winterNight: s.winterNight,
    nightStart: s.nightStart,
    rng: s.rng,
    world: s.world.rng,
    grain: s.grain,
    yearGrain: s.yearGrain,
    winter: {
      nights: w.nights,
      lead: w.lead,
      twist: w.twist,
      peak: w.peak,
      question: w.question
        ? { kind: w.question.kind, who: w.question.who, who2: w.question.who2, met: w.question.met }
        : null,
    },
    ...(s.refugeVisit ? { refugeVisit: s.refugeVisit } : {}),
    ...(s.warrenCareReturn ? { warrenCareReturn: s.warrenCareReturn } : {}),
    ...(s.duskRest ? { duskRest: s.duskRest } : {}),
    ...(s.localWarning ? { localWarning: s.localWarning } : {}),
    ...(s.nightDepartureEffort ? { nightDepartureEffort: true } : {}),
    ...(s.winterSetting ? { winterSetting: s.winterSetting, winterRules: WINTER_RULES } : {}),
    leads: s.leads,
    lead: s.lead,
    warned: s.warned,
    warnedAlso: s.warnedAlso,
    leadCame: s.leadCame,
    spawns: s.spawns,
    tokens: s.tokens,
    nextTokenId: s.nextTokenId,
    called: s.called,
    openPosts: s.openPosts,
    posts: s.posts,
    press: s.press,
    postedAt: s.postedAt,
    place: s.place,
    letGo: s.letGo,
    carried: s.carried,
    homeThreat: s.homeThreat,
    lantern: s.lantern,
    rope: s.rope,
    bell: s.bell,
    commands: Object.fromEntries(
      Object.entries(s.commands).map(([id, c]) => [id, c ? [c.cmd.affordanceId, c.until] : null]),
    ),
    asks: Object.fromEntries(
      Object.entries(s.asks).map(([id, a]) => [
        id,
        a ? [a.sug.affordanceId ?? a.sug.action ?? null, a.until] : null,
      ]),
    ),
    order: s.order,
    cast: Object.fromEntries(
      Object.entries(s.cast).map(([id, v]) => [
        id,
        [v.home, v.usual, v.status, v.limp ?? false, v.until ?? null, v.parents ?? []],
      ]),
    ),
    marks: s.marks,
    gateKeeper: s.gateKeeper,
    heir: s.heir,
    gateWilling: s.gateWilling,
    ...(s.nightRequests ? { nightRequests: s.nightRequests } : {}),
    ...(s.proposalHolds ? { proposalHolds: s.proposalHolds } : {}),
    pairings: s.pairings.map((p) => [p.who, p.with, p.until]),
    expecting: s.expecting,
    newborns: s.newborns,
    nextBorn: s.nextBorn,
    history: s.history,
    moments: s.momentLog,
    people,
    keeperImpressions: s.community.people.map((p) => impressionOf(s.keeper, p.id, s.minute)),
  };
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

/** Each person as the export shows them (`PersonSummary`). */
function summarise(s: WatchState): PersonSummary[] {
  return s.community.people.map((p) => ({
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
}

/** The rule-state hash of a state (see `ruleState`). */
export function ruleHash(s: WatchState): string {
  return fnv(JSON.stringify(ruleState(s)));
}

/** The export's view of a state (see the file comment). */
export function endState(s: WatchState): EndState {
  const { community, keeper, percepts: _p, ...rest } = s;
  const people = summarise(s);
  return {
    ...structuredClone(rest),
    people,
    keeperImpressions: community.people.map((p) => impressionOf(keeper, p.id, s.minute)),
    ruleHash: fnv(JSON.stringify(ruleState(s, people))),
    fullHash: fnv(JSON.stringify(s)),
  };
}

/**
 * Bump when rules change so an old export is not replayed against new rules. 8: the bell rings from the Gate for
 * everyone in range, and world draws have their own streams (2026-10-05). 9: old age kills (natural death at
 * `MORTALITY_MULTIPLIER` times HF's hazard) and households of the old no longer leave (2026-10-07).
 * 13: accepted night helpers leaving another post pay a small exertion cost.
 * 12: an opt-in milder winter, applied from the next dusk.
 * 11: in-person relief, help and rest asks at night.
 * 10: each pair waits one year after a proposal; legacy pages without proposalHolds retain the old rules.
 */
export const WATCH_SCENARIO_VERSION = 14;
export const WATCH_DUSK_REST_SCENARIO_VERSION = 15;
export const WATCH_LOCAL_WARNING_SCENARIO_VERSION = 16;
export function scenarioForOptions(options?: WatchOptions): number {
  if (!validWatchOptions(options)) throw new Error('Unknown watch option');
  if (options?.localWarning) return WATCH_LOCAL_WARNING_SCENARIO_VERSION;
  return options?.duskRest ? WATCH_DUSK_REST_SCENARIO_VERSION : WATCH_SCENARIO_VERSION;
}
export function scenarioForState(s: WatchState): number {
  validateLocalWarningState(s);
  const edition = s.localWarning ? WATCH_LOCAL_WARNING_SCENARIO_VERSION : WATCH_SCENARIO_VERSION;
  if (s.duskRest === undefined) return edition;
  if (!s.duskRest) throw new Error('Invalid night-off state');
  if (
    s.duskRest.edition !== 'dusk-rest@1' ||
    !s.duskRest.requests ||
    typeof s.duskRest.requests !== 'object' ||
    Array.isArray(s.duskRest.requests)
  )
    throw new Error('Invalid night-off state');
  for (const [who, r] of Object.entries(s.duskRest.requests)) {
    if (
      !r ||
      !s.cast[who] ||
      !['pending', 'deferred', 'refused', 'resting', 'ended', 'returned', 'expired'].includes(r.status) ||
      !Number.isFinite(r.askedAt) ||
      !Number.isFinite(r.until) ||
      r.until <= r.askedAt ||
      (r.priorPost !== null && !ALL_POST_IDS.includes(r.priorPost)) ||
      ['decisionAt', 'begunAt', 'endedAt', 'returnedAt'].some((k) => {
        const at = r[k as 'decisionAt'];
        return at !== undefined && (!Number.isFinite(at) || at < r.askedAt);
      }) ||
      (r.begunAt !== undefined && r.begunAt >= r.until) ||
      (r.status === 'resting' && (r.begunAt === undefined || r.endedAt !== undefined)) ||
      (['ended', 'returned'].includes(r.status) && (r.begunAt === undefined || r.endedAt === undefined)) ||
      (['refused', 'expired'].includes(r.status) && r.endedAt === undefined) ||
      (r.status === 'returned' && r.returnedAt === undefined) ||
      (r.endedAt !== undefined && r.endedAt > r.until) ||
      (r.returnedAt !== undefined && (r.endedAt === undefined || r.returnedAt < r.endedAt))
    )
      throw new Error('Invalid night-off request');
  }
  return s.localWarning ? WATCH_LOCAL_WARNING_SCENARIO_VERSION : WATCH_DUSK_REST_SCENARIO_VERSION;
}

/** The oldest scenario whose saved pages still load (`migrateSnapshot`). */
export const OLDEST_LOADABLE_SCENARIO = 14;

/**
 * Where a run's log stops replaying from its seed: it was resumed from a page saved under an older scenario at this
 * sim minute. The rules before that minute were the old ones, so the export is a record, not a replay.
 */
export interface Origin {
  scenario: number;
  minute: number;
}

export interface LogEntry {
  /** The sim minute the input applied at (before that minute resolved). */
  m: number;
  i: Input;
}

export interface PlaytestExport {
  options?: WatchOptions;
  castChapter?: CastChapter;
  game: 'the-night-watch';
  phase: 'G3-4';
  scenario: number;
  /** Commit of the deployed build (`/release.json`, filled in by the page), or 'dev'. */
  build: string;
  /** `@adam0white/human-framework` package version. */
  framework: string;
  seed: number;
  inputs: LogEntry[];
  endMinute: number;
  end: EndState;
  /** Set when the run was resumed from an older scenario's page: `replay` refuses such an export. */
  origin?: Origin;
}

/**
 * A saved page of the chronicle: the whole state and the input log up to it (G3-3 saves). Resuming continues the
 * same run: the log keeps growing from the snapshot, so a later export still replays from the seed.
 */
export interface Snapshot {
  /** File bytes never confer local ownership, including through a season backup. */
  fileOrigin?: true;
  castOwnership?: import('../../shared/cast-runtime.ts').CastHeads;
  scenario: number;
  seed: number;
  log: LogEntry[];
  state: WatchState;
  origin?: Origin;
}

/**
 * Validate the saved scenario against its admitted state. Both supported scenarios resume unchanged.
 * No new-run option is applied here, and no migration or origin stamp is inserted. Pure.
 */
export function migrateSnapshot(snap: Snapshot): Snapshot {
  if (
    snap.scenario !== scenarioForState(snap.state) ||
    snap.scenario < OLDEST_LOADABLE_SCENARIO ||
    ![
      WATCH_SCENARIO_VERSION,
      WATCH_DUSK_REST_SCENARIO_VERSION,
      WATCH_LOCAL_WARNING_SCENARIO_VERSION,
    ].includes(snap.scenario)
  )
    throw new Error(`save scenario ${snap.scenario} does not match its admitted night-off choice`);
  if (
    snap.log.some(
      (e) =>
        e.i.k === 'local-warning' &&
        (!snap.state.localWarning ||
          !validLocalWarningInput(e.i) ||
          !ownsWarningCast(snap.state, e.i.who) ||
          !Number.isFinite(e.m) ||
          e.m < 0 ||
          e.m > snap.state.minute),
    )
  )
    throw new Error('Local warning input is not admitted in this save');
  if (!snap.state.duskRest && snap.log.some((e) => e.i.k === 'dusk-rest'))
    throw new Error('Night-off input is not admitted in this save');
  return snap;
}

export class WatchRun {
  readonly state: WatchState;
  readonly log: LogEntry[] = [];

  readonly seed: number;
  readonly fileOrigin?: true;
  /** Set when this run was resumed from an older scenario's page (see `Origin`). */
  readonly origin: Origin | undefined;

  constructor(seed: number, saved?: Snapshot, castChapter?: CastChapter, options?: WatchOptions) {
    if (!validWatchOptions(options)) throw new Error('Unknown watch option');
    if (saved && options !== undefined) throw new Error('A saved village retains its admitted choices');
    this.seed = seed;
    if (saved) {
      const from = migrateSnapshot(saved);
      if (from.seed !== seed) throw new Error('save is from another seed');
      this.state = structuredClone(from.state);
      this.log = from.log.map((e) => ({ m: e.m, i: { ...e.i } }));
      this.origin = from.origin;
      this.fileOrigin = from.fileOrigin;
    } else {
      this.state = newGame(seed, castChapter, options);
    }
  }

  /** Resumes a saved page (see `Snapshot`). */
  static resume(snap: Snapshot): WatchRun {
    return new WatchRun(snap.seed, snap);
  }

  /** The current page as snapshot JSON, without copying the state first (for saving between minutes). */
  snapshotText(): string {
    return JSON.stringify({
      scenario: scenarioForState(this.state),
      seed: this.seed,
      log: this.log,
      state: this.state,
      ...(this.origin ? { origin: this.origin } : {}),
      ...(this.fileOrigin ? { fileOrigin: true } : {}),
    });
  }

  /** The current page as a snapshot (deep copies: the run goes on unchanged). */
  snapshot(): Snapshot {
    return {
      scenario: scenarioForState(this.state),
      seed: this.seed,
      log: this.log.map((e) => ({ m: e.m, i: { ...e.i } })),
      state: structuredClone(this.state),
      ...(this.origin ? { origin: { ...this.origin } } : {}),
      ...(this.fileOrigin ? { fileOrigin: true } : {}),
    };
  }

  /** Applies and logs an input; inputs that do not apply in this phase are dropped unlogged. */
  input(i: Input): boolean {
    const m = this.state.minute;
    // Daylight advances many actors and admits scheduled people. A failed transition
    // must not leave unlogged partial state for the next tick or autosave.
    const before = i.k === 'toDusk' ? structuredClone(this.state) : undefined;
    try {
      if (!applyInput(this.state, i)) return false;
      this.log.push({ m, i });
      return true;
    } catch (error) {
      if (before) {
        for (const key of Object.keys(this.state)) Reflect.deleteProperty(this.state, key);
        Object.assign(this.state, before);
      }
      throw error;
    }
  }

  step(): void {
    stepMinute(this.state);
  }

  export(): PlaytestExport {
    return {
      ...(this.state.castChapter ? { castChapter: structuredClone(this.state.castChapter) } : {}),
      ...(this.state.duskRest || this.state.localWarning
        ? {
            options: {
              ...(this.state.duskRest ? { duskRest: 'dusk-rest@1' as const } : {}),
              ...(this.state.localWarning ? { localWarning: 'local-warning@1' as const } : {}),
            },
          }
        : {}),
      game: 'the-night-watch',
      phase: 'G3-4',
      scenario: scenarioForState(this.state),
      build: 'dev',
      framework: FRAMEWORK_PACKAGE_VERSION,
      seed: this.seed,
      inputs: this.log.map((e) => ({ m: e.m, i: { ...e.i } })),
      endMinute: this.state.minute,
      end: endState(this.state),
      ...(this.origin ? { origin: { ...this.origin } } : {}),
      ...(this.fileOrigin ? { fileOrigin: true } : {}),
    };
  }
}

/** Rebuilds a run's end state from its seed and input log. Throws if the log does not fit the rules. */
export function replay(
  exp: Pick<
    PlaytestExport,
    'scenario' | 'seed' | 'inputs' | 'endMinute' | 'origin' | 'castChapter' | 'options'
  >,
): WatchState {
  if (exp.scenario !== scenarioForOptions(exp.options))
    throw new Error(`export is scenario ${exp.scenario}, this build is ${WATCH_SCENARIO_VERSION}`);
  if (exp.origin)
    throw new Error(
      `export was resumed from a scenario ${exp.origin.scenario} page; it does not replay from its seed`,
    );
  const run = new WatchRun(exp.seed, undefined, exp.castChapter, exp.options);
  const s = run.state;

  let idx = 0;
  for (let guard = 0; guard < 10_000_000; guard++) {
    for (let e = exp.inputs[idx]; e !== undefined && e.m === s.minute; e = exp.inputs[idx]) {
      if (exp.scenario < 12 && e.i.k === 'winter')
        throw new Error(`input ${idx} (winter) is not in scenario ${exp.scenario}'s vocabulary`);
      if (exp.scenario < 11 && ['relieve', 'help', 'down'].includes(e.i.k))
        throw new Error(`input ${idx} (${e.i.k}) is not in scenario ${exp.scenario}'s vocabulary`);
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
