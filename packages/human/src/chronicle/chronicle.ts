/**
 * SCOPE: autobiographical consolidation (N3). Each simulated day is folded into one bounded `DayRecord`:
 * commitments kept, broken and released by kind (worship commitments by label), completed actions and how
 * many of them an outside voice had suggested, habit strengths that crossed 0.25 / 0.5 / 0.75, trust changes per
 * voice, the most salient episodes, breaches of the person's own understood norms and repairs, net material,
 * illness onsets and recoveries, mean mood, and suggestion verdicts. The composite feeds a plain-JSON
 * accumulator (`p.chronicleDay`) through `note*` calls and closes it at the day boundary; `consolidateDay` is
 * pure. The named shape is the distinction between episodic traces and a consolidated, schematic
 * autobiographical record (a life story is built from day-level summaries, not from every event); the
 * thresholds, the two-episode limit and the 120-day bound are engineering choices, not a model of sleep
 * consolidation or of what people actually remember. The record describes behaviour; it scores no worth,
 * piety or acceptance, and a kept worship commitment is recorded as a kept commitment, nothing more.
 */
import { dayOf } from '../core/index.ts';
import type {
  ChronicleCommitmentNote,
  ChronicleDay,
  ChronicleState,
  Commitment,
  DayRecord,
  DecisionRecord,
  Habit,
  Outcome,
  Person,
  Signed,
  Suggestion,
  SuggestionResolution,
  Unit,
  YearRecord,
} from '../types.ts';
import { MINUTES_PER_DAY } from '../types.ts';

export const CHRONICLE_DEFAULTS = {
  /** Day records kept; the oldest are dropped first. */
  maxDays: 120,
  /** Kept / broken / released notes per day. */
  maxNotes: 24,
  /** Distinct completed actions tallied per day. */
  maxActions: 32,
  /** Distinct verdict shapes tallied per day. */
  maxVerdicts: 16,
  /** Most salient episodes kept per day. */
  topEpisodes: 2,
  /** Habit strengths whose crossing is recorded. */
  habitThresholds: [0.25, 0.5, 0.75] as readonly number[],
  /** Smallest trust change recorded per voice per day. */
  trustEpsilon: 0.01,
  /** Smallest illness severity change recorded as worse/better. */
  illnessEpsilon: 0.05,
  /** Year records kept (1.8.0 yearbook); the oldest are dropped first. */
  maxYears: 150,
  /**
   * Actions, episodes and illness onsets kept per year record. The open year keeps up to four times `yearActions`
   * candidates so a later-frequent action can climb; earlier years are trimmed to the bound when a later one opens.
   */
  yearActions: 8,
  yearEpisodes: 4,
  yearIllnesses: 6,
};

/** Stable key for a habit: action plus its cue. */
export function habitKey(h: Pick<Habit, 'action' | 'cue'>): string {
  const cue: string[] = [];
  if (h.cue.hour !== undefined) cue.push(`h${h.cue.hour}`);
  if (h.cue.placeId !== undefined) cue.push(`p:${h.cue.placeId}`);
  if (h.cue.after !== undefined) cue.push(`a:${h.cue.after}`);
  return `${h.action}@${cue.join(',')}`;
}

/** The state a day record diffs against (read only). */
export function chronicleState(p: Person): ChronicleState {
  const habits: Record<string, number> = {};
  for (const h of p.habits) {
    const k = habitKey(h);
    habits[k] = Math.max(habits[k] ?? 0, h.strength);
  }
  const trust: Record<string, number> = {};
  for (const v of p.will.voices) trust[v.voiceId] = v.trust;
  const illnesses: ChronicleState['illnesses'] = {};
  for (const ill of p.body.illnesses) illnesses[ill.id] = { kind: ill.kind, severity: ill.severity };
  const openBreaches = p.conscience.breaches.filter((b) => !b.repaired).map((b) => b.id);
  return { habits, trust, illnesses, openBreaches };
}

function emptyDay(day: number, baseline: ChronicleState): ChronicleDay {
  return {
    day,
    baseline,
    kept: [],
    broken: [],
    released: [],
    actions: [],
    verdicts: [],
    material: 0,
    moodSum: 0,
    moodSamples: 0,
    decisions: 0,
  };
}

/**
 * Open the accumulator for `day` (default: the person's current day). The baseline is the last record's end
 * state when there is one, else a snapshot of the person now. Replaces any open accumulator without closing it.
 */
export function openDay(p: Person, day: number = dayOf(p.now)): ChronicleDay {
  const last = p.chronicle?.[p.chronicle.length - 1];
  const acc = emptyDay(day, last?.state ? structuredClone(last.state) : chronicleState(p));
  p.chronicleDay = acc;
  return acc;
}

/** The open accumulator for the current day; closes a stale one first (if the composite missed the boundary). */
function current(p: Person): ChronicleDay {
  let acc = p.chronicleDay;
  // Events at exactly midnight (commitments closed on the grid boundary) still belong to the open previous day,
  // which the composite closes right after them.
  const boundary = p.now % MINUTES_PER_DAY === 0 && acc?.day === dayOf(p.now) - 1;
  const day = boundary && acc ? acc.day : dayOf(p.now);
  if (acc && acc.day < day) {
    closeDay(p);
    acc = p.chronicleDay;
  }
  if (!acc || acc.day !== day) acc = openDay(p, day);
  return acc;
}

function noteOf(c: Commitment, extra: Partial<ChronicleCommitmentNote> = {}): ChronicleCommitmentNote {
  const n: ChronicleCommitmentNote = { id: c.id, kind: c.kind };
  if (c.label !== undefined) n.label = c.label;
  if (c.actions[0] !== undefined) n.action = c.actions[0];
  if (c.toId !== undefined) n.toId = c.toId;
  return { ...n, ...extra };
}

function pushNote(list: ChronicleCommitmentNote[], n: ChronicleCommitmentNote): void {
  if (list.some((x) => x.id === n.id)) return;
  if (list.length >= CHRONICLE_DEFAULTS.maxNotes) return;
  list.push(n);
}

const PROMPTED = new Set(['assented', 'complied', 'commanded']);

/**
 * Tally a decision's suggestion verdicts (all voices: `record.suggestions`, else `record.suggestion`). Reviews
 * are skipped: a review re-resolves a standing suggestion quietly and would inflate the counts. Pass the
 * decision's `suggestions` input so refused suggestions carry the suggested action.
 */
export function noteDecision(p: Person, record: DecisionRecord, suggested: readonly Suggestion[] = []): void {
  if (record.review) return;
  const acc = current(p);
  acc.decisions += 1;
  const resolutions: SuggestionResolution[] =
    record.suggestions && record.suggestions.length > 0
      ? record.suggestions
      : record.suggestion
        ? [record.suggestion]
        : [];
  for (const res of resolutions) {
    const s = suggested.find((x) => x.voiceId === res.voiceId);
    let action = s?.action;
    if (action === undefined && s?.affordanceId !== undefined)
      action = record.considered.find((c) => c.affordanceId === s.affordanceId)?.action;
    if (action === undefined && PROMPTED.has(res.verdict)) action = record.chosenAction ?? undefined;
    const same = acc.verdicts.find(
      (v) =>
        v.voiceId === res.voiceId &&
        v.verdict === res.verdict &&
        v.reason === res.reason &&
        v.action === action,
    );
    if (same) {
      same.count += 1;
      continue;
    }
    if (acc.verdicts.length >= CHRONICLE_DEFAULTS.maxVerdicts) continue;
    acc.verdicts.push({
      voiceId: res.voiceId,
      verdict: res.verdict,
      ...(res.kind !== undefined ? { kind: res.kind } : {}),
      reason: res.reason,
      ...(action !== undefined ? { action } : {}),
      count: 1,
    });
  }
}

/**
 * Record a finished activity: material (any status), the completed action and whether a voice had prompted it,
 * and the commitments it kept. Call inside `finish` while `p.activity` still holds the activity, passing
 * `FinishReport.kept` and `activity.suggestion`.
 */
export function noteOutcome(
  p: Person,
  outcome: Outcome,
  info: { kept?: readonly string[]; suggestion?: SuggestionResolution } = {},
): void {
  const acc = current(p);
  acc.material += outcome.material ?? 0;
  if (outcome.status !== 'completed') return;
  const prompted = info.suggestion !== undefined && PROMPTED.has(info.suggestion.verdict);
  let tally = acc.actions.find((a) => a.action === outcome.action);
  if (!tally && acc.actions.length < CHRONICLE_DEFAULTS.maxActions) {
    tally = { action: outcome.action, done: 0, prompted: 0, by: {} };
    acc.actions.push(tally);
  }
  if (tally) {
    tally.done += 1;
    if (prompted && info.suggestion) {
      tally.prompted += 1;
      tally.by[info.suggestion.voiceId] = (tally.by[info.suggestion.voiceId] ?? 0) + 1;
    }
  }
  for (const id of info.kept ?? []) {
    const c = p.agenda.commitments.find((x) => x.id === id);
    if (!c) continue;
    pushNote(
      acc.kept,
      noteOf(c, prompted && info.suggestion ? { prompted: true, voiceId: info.suggestion.voiceId } : {}),
    );
  }
}

/** Record commitments that closed outside an outcome: broken at window end (from `advanceAgenda`), or released. */
export function noteCommitments(
  p: Person,
  status: 'broken' | 'released' | 'kept',
  list: readonly Commitment[],
): void {
  const acc = current(p);
  for (const c of list) pushNote(acc[status], noteOf(c));
}

/** Sample mood for the day's average (call on the 60-minute grid). */
export function noteMood(p: Person): void {
  const acc = current(p);
  acc.moodSum += p.affect.mood.valence;
  acc.moodSamples += 1;
}

const countBy = (notes: readonly ChronicleCommitmentNote[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const n of notes) out[n.kind] = (out[n.kind] ?? 0) + 1;
  return out;
};

const prayerName = (n: ChronicleCommitmentNote): string => n.label ?? n.action ?? n.id;

/**
 * Fold the accumulator into a day record against the person's current state. Pure: reads `p` and `acc`, writes
 * nothing. Broken and released commitments whose window ended in the day are also read from the agenda, so a
 * missed `noteCommitments` call does not lose them (as long as the agenda has not pruned them yet).
 */
export function consolidateDay(p: Person, day: number, acc: ChronicleDay): DayRecord {
  const D = CHRONICLE_DEFAULTS;
  const start = day * MINUTES_PER_DAY;
  const end = start + MINUTES_PER_DAY;
  const kept = acc.kept.map((n) => ({ ...n }));
  const broken = acc.broken.map((n) => ({ ...n }));
  const released = acc.released.map((n) => ({ ...n }));
  for (const c of p.agenda.commitments) {
    if (c.until < start || c.until >= end) continue;
    if (c.status === 'broken') pushNote(broken, noteOf(c));
    else if (c.status === 'released') pushNote(released, noteOf(c));
  }

  const worshipKept = kept.filter((n) => n.kind === 'worship');
  const prayers = {
    kept: worshipKept.map(prayerName),
    missed: broken.filter((n) => n.kind === 'worship').map(prayerName),
    prompted: worshipKept.filter((n) => n.prompted).map(prayerName),
  };

  const state = chronicleState(p);
  const base = acc.baseline;

  const habits: DayRecord['habits'] = [];
  const keys = [...new Set([...Object.keys(base.habits), ...Object.keys(state.habits)])].sort();
  for (const key of keys) {
    const from = base.habits[key] ?? 0;
    const to = state.habits[key] ?? 0;
    let up: number | undefined;
    let down: number | undefined;
    for (const t of D.habitThresholds) {
      if (from < t && to >= t) up = t;
      if (from >= t && to < t && down === undefined) down = t;
    }
    const action = key.slice(0, key.lastIndexOf('@'));
    if (up !== undefined) habits.push({ key, action, from, to, level: up, direction: 'up' });
    else if (down !== undefined) habits.push({ key, action, from, to, level: down, direction: 'down' });
  }

  const trust: DayRecord['trust'] = [];
  for (const voiceId of [...new Set([...Object.keys(base.trust), ...Object.keys(state.trust)])].sort()) {
    const from = base.trust[voiceId] ?? 0.5;
    const to = state.trust[voiceId] ?? from;
    if (Math.abs(to - from) >= D.trustEpsilon) trust.push({ voiceId, from, to, delta: to - from });
  }

  const episodes = p.memory.episodes
    .filter((e) => e.at >= start && e.at < end)
    .sort((a, b) => b.salience - a.salience || (a.id < b.id ? -1 : 1))
    .slice(0, D.topEpisodes)
    .map((e) => ({
      id: e.id,
      summary: e.summary,
      valence: e.valence,
      salience: e.salience,
      ...(e.action !== undefined ? { action: e.action } : {}),
      ...(e.targetId !== undefined ? { targetId: e.targetId } : {}),
    }));

  const breachNote = (b: Person['conscience']['breaches'][number]) => ({
    id: b.id,
    normId: b.normId,
    ...(b.victimId !== undefined ? { victimId: b.victimId } : {}),
  });
  const breaches = p.conscience.breaches.filter((b) => b.at >= start && b.at < end).map(breachNote);
  const open = new Set(base.openBreaches);
  const repairs = p.conscience.breaches.filter((b) => b.repaired && open.has(b.id)).map(breachNote);

  const illness: DayRecord['illness'] = { onset: [], recovered: [], worse: [], better: [] };
  for (const [id, ill] of Object.entries(state.illnesses)) {
    const was = base.illnesses[id];
    if (!was) illness.onset.push(ill.kind);
    else if (ill.severity - was.severity >= D.illnessEpsilon) illness.worse.push(ill.kind);
    else if (was.severity - ill.severity >= D.illnessEpsilon) illness.better.push(ill.kind);
  }
  for (const [id, ill] of Object.entries(base.illnesses))
    if (!state.illnesses[id]) illness.recovered.push(ill.kind);

  return {
    day,
    kept,
    broken,
    released,
    keptByKind: countBy(kept),
    brokenByKind: countBy(broken),
    prayers,
    actions: acc.actions
      .map((a) => ({ ...a, by: { ...a.by } }))
      .sort((a, b) => (a.action < b.action ? -1 : a.action > b.action ? 1 : 0)),
    habits,
    trust,
    episodes,
    breaches,
    repairs,
    material: acc.material,
    illness,
    mood: acc.moodSamples > 0 ? acc.moodSum / acc.moodSamples : p.affect.mood.valence,
    verdicts: acc.verdicts.map((v) => ({ ...v })),
    decisions: acc.decisions,
    alive: p.body.alive,
    state,
  };
}

/**
 * Append a record to `p.chronicle`, dropping the oldest beyond `CHRONICLE_DEFAULTS.maxDays`. Only the newest
 * record keeps its end-of-day `state` (the baseline the next day diffs against); older ones drop it.
 */
export function appendDay(p: Person, record: DayRecord): void {
  const list = p.chronicle ?? [];
  for (const r of list) delete r.state;
  list.push(record);
  if (list.length > CHRONICLE_DEFAULTS.maxDays) {
    const dropped = list.splice(0, list.length - CHRONICLE_DEFAULTS.maxDays);
    // 1.8.0 yearbook (opt-in): a day leaving the chronicle folds into its year's summary.
    if (p.chronicleYears) for (const r of dropped) foldDay(p, dayFold(r));
  }
  p.chronicle = list;
}

// ---------------------------------------------------------------------------------------------
// Yearbook (1.8.0): life-level summaries
// ---------------------------------------------------------------------------------------------

/**
 * SCOPE (yearbook, 1.8.0, opt-in per person with `enableYearbook`): the day chronicle holds months; a life needs
 * years. Each day record that leaves the bounded chronicle, and each routine day a long-run stretch summarizes
 * (`foldDay` from the composite's `liveRoutine`), folds into one `YearRecord` per year: day counts, mean and range of
 * mood, commitment tallies, breaches and repairs, material, the most frequent actions, the strongest episodes and
 * illness onsets, all bounded. It is a descriptive summary for narration and hosts (a volume of a life), not a model
 * of what people recall about a year; the bounds are engineering choices.
 */

/** What one day contributes to its year record. */
export interface DayFold {
  day: number;
  mood: Signed;
  kept?: number;
  broken?: number;
  released?: number;
  breaches?: number;
  repairs?: number;
  material?: number;
  decisions?: number;
  /** Actions done that day (each counts once per day). */
  actions?: readonly string[];
  episodes?: readonly { id: string; summary: string; valence: Signed; salience: Unit }[];
  illness?: readonly string[];
  alive?: boolean;
  /** A summarized, not lived, day. */
  routine?: boolean;
}

/** Turn on year summaries for this person (idempotent). */
export function enableYearbook(p: Person): void {
  p.chronicleYears ??= [];
}

/** The fold of a lived day record. */
export function dayFold(r: DayRecord): DayFold {
  return {
    day: r.day,
    mood: r.mood,
    kept: r.kept.length,
    broken: r.broken.length,
    released: r.released.length,
    breaches: r.breaches.length,
    repairs: r.repairs.length,
    material: r.material,
    decisions: r.decisions,
    actions: r.actions.map((a) => a.action),
    episodes: r.episodes,
    illness: r.illness.onset,
    alive: r.alive,
  };
}

/** Fold one day into its year record (yearbook on only; otherwise nothing happens). Returns the record. */
export function foldDay(p: Person, d: DayFold): YearRecord | undefined {
  const years = p.chronicleYears;
  if (!years) return undefined;
  const C = CHRONICLE_DEFAULTS;
  const year = Math.floor(d.day / 365);
  let y = years.find((x) => x.year === year);
  if (!y) {
    y = {
      year,
      days: 0,
      routineDays: 0,
      mood: 0,
      moodLow: d.mood,
      moodHigh: d.mood,
      kept: 0,
      broken: 0,
      released: 0,
      breaches: 0,
      repairs: 0,
      material: 0,
      decisions: 0,
      actions: [],
      episodes: [],
      illness: [],
      alive: true,
    };
    for (const old of years)
      if (old.year < year && old.actions.length > C.yearActions) old.actions.length = C.yearActions;
    years.push(y);
    years.sort((a, b) => a.year - b.year);
    if (years.length > C.maxYears) years.splice(0, years.length - C.maxYears);
  }
  y.mood = (y.mood * y.days + d.mood) / (y.days + 1);
  y.days += 1;
  if (d.routine) y.routineDays += 1;
  y.moodLow = Math.min(y.moodLow, d.mood);
  y.moodHigh = Math.max(y.moodHigh, d.mood);
  y.kept += d.kept ?? 0;
  y.broken += d.broken ?? 0;
  y.released += d.released ?? 0;
  y.breaches += d.breaches ?? 0;
  y.repairs += d.repairs ?? 0;
  y.material += d.material ?? 0;
  y.decisions += d.decisions ?? 0;
  if (d.alive !== undefined) y.alive = d.alive;
  for (const action of new Set(d.actions ?? [])) {
    const t = y.actions.find((a) => a.action === action);
    if (t) t.days += 1;
    else y.actions.push({ action, days: 1 });
  }
  y.actions.sort((a, b) => b.days - a.days || (a.action < b.action ? -1 : a.action > b.action ? 1 : 0));
  // Keep a few more than shown so a later-frequent action can climb; trimmed to the bound.
  if (y.actions.length > 4 * C.yearActions) y.actions.length = 4 * C.yearActions;
  for (const e of d.episodes ?? []) {
    if (y.episodes.some((x) => x.id === e.id)) continue;
    y.episodes.push({ id: e.id, day: d.day, summary: e.summary, valence: e.valence, salience: e.salience });
  }
  const strength = (e: { valence: Signed; salience: Unit }) => Math.abs(e.valence) * e.salience;
  y.episodes.sort((a, b) => strength(b) - strength(a) || a.day - b.day);
  if (y.episodes.length > C.yearEpisodes) y.episodes.length = C.yearEpisodes;
  for (const kind of d.illness ?? []) if (y.illness.length < C.yearIllnesses) y.illness.push(kind);
  return y;
}

/** The year record for `year`, if any. */
export function yearRecord(p: Person, year: number): YearRecord | undefined {
  return p.chronicleYears?.find((y) => y.year === year);
}

/**
 * Close the open day: consolidate, append, and open the next day with this record's end state as its baseline.
 * Without an open accumulator, closes the day before `p.now` from an empty one. Returns the new record.
 */
export function closeDay(p: Person): DayRecord {
  const acc = p.chronicleDay ?? openDay(p, dayOf(p.now) - 1);
  const record = consolidateDay(p, acc.day, acc);
  const state = record.state ?? chronicleState(p);
  appendDay(p, record);
  p.chronicleDay = emptyDay(acc.day + 1, structuredClone(state));
  return record;
}

/**
 * Close the open day and leave none open (`skip`): the next event opens the day it falls in, instead of the
 * day after the closed one.
 */
export function endDay(p: Person): void {
  if (!p.chronicleDay) return;
  closeDay(p);
  delete p.chronicleDay;
}

/** Records with `from <= day <= to` (either bound optional). */
export function chronicleBetween(
  chronicle: readonly DayRecord[],
  from = Number.NEGATIVE_INFINITY,
  to = Number.POSITIVE_INFINITY,
): DayRecord[] {
  return chronicle.filter((r) => r.day >= from && r.day <= to);
}
