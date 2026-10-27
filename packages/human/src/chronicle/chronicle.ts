/** SCOPE: bounded autobiographical day/year consolidation. Descriptive records,
 * never devotion or acceptance scores. C0 supplies actual actor snapshots and outcomes
 * through closed evidence ports; missing samples are not fabricated observations.
 */
import { cloneData } from '../core/clone.ts';
import { validateNarrativeFields, validateNarrativeJson } from '../memory/memory.ts';
import type {
  ActorState,
  ChronicleCommitmentNote,
  ChronicleDay,
  ChronicleOwner,
  ChronicleSnapshot,
  ChronicleState,
  Commitment,
  DayRecord,
  DeepReadonly,
  FrameContext,
  ObservedOutcome,
  SuggestionResolution,
  ValidationIssue,
  YearRecord,
} from '../run-schema.ts';

const DAY = 86400000;
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
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

type State = ReturnType<ChronicleOwner['initialize']>;
export function chronicleState(p: DeepReadonly<ChronicleSnapshot>): ChronicleState {
  const habits: Record<string, number> = {};
  for (const h of p.habits) {
    const cue = [
      h.cue.hour === undefined ? '' : `h${h.cue.hour}`,
      h.cue.placeId ?? '',
      h.cue.after ?? '',
    ].join(':');
    const key = `${h.action}@${cue}`;
    habits[key] = Math.max(habits[key] ?? 0, h.strength);
  }
  const trust: Record<string, number> = {};
  for (const v of p.will.voices) trust[v.voiceId] = v.trust;
  const illnesses: ChronicleState['illnesses'] = {};
  for (const i of p.body.illnesses) illnesses[i.id] = { kind: i.kind, severity: i.severity };
  return {
    habits,
    trust,
    illnesses,
    openBreaches: p.conscience.breaches.filter((b) => !b.repaired).map((b) => b.id),
  };
}
export function openDay(day: number, baseline: DeepReadonly<ChronicleState>): ChronicleDay {
  return {
    day,
    baseline: cloneData(baseline) as ChronicleState,
    kept: [],
    broken: [],
    released: [],
    actions: [],
    verdicts: [],
    material: 0,
    moodSum: 0,
    moodSamples: 0,
    decisions: 0,
    socialMs: 0,
  };
}
function noteOf(c: DeepReadonly<Commitment>): ChronicleCommitmentNote {
  const out: ChronicleCommitmentNote = { id: c.id, kind: c.kind };
  if (c.label !== undefined) out.label = c.label;
  if (c.actions[0] !== undefined) out.action = c.actions[0];
  if (c.toId !== undefined) out.toId = c.toId;
  return out;
}
function pushNote(xs: ChronicleCommitmentNote[], n: ChronicleCommitmentNote): void {
  if (xs.length < CHRONICLE_DEFAULTS.maxNotes && !xs.some((x) => x.id === n.id)) xs.push(n);
}
function countBy(xs: readonly DeepReadonly<ChronicleCommitmentNote>[]): DayRecord['keptByKind'] {
  const out: DayRecord['keptByKind'] = {};
  for (const x of xs) {
    const k = x.kind as Commitment['kind'];
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
const prayerName = (n: DeepReadonly<ChronicleCommitmentNote>) => n.label ?? n.action ?? n.kind;
export function consolidateDay(
  p: DeepReadonly<ChronicleSnapshot>,
  day: number,
  acc: DeepReadonly<ChronicleDay>,
  parameters: DeepReadonly<typeof CHRONICLE_DEFAULTS> = CHRONICLE_DEFAULTS,
): DayRecord {
  const D = parameters;
  const start = day * DAY;
  const end = start + DAY;
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

  const breachNote = (b: ActorState['conscience']['breaches'][number]) => ({
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
    actions: acc.actions.map((a) => ({ ...a, by: { ...a.by } })).sort((a, b) => compare(a.action, b.action)),
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

function foldDay(
  years: YearRecord[],
  d: DeepReadonly<DayRecord>,
  K: DeepReadonly<typeof CHRONICLE_DEFAULTS>,
): void {
  const year = Math.floor(d.day / 365);
  let y = years.find((y) => y.year === year);
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
      alive: d.alive,
    };
    for (const old of years) if (old.year < year) old.actions = old.actions.slice(0, K.yearActions);
    years.push(y);
    years.sort((a, b) => a.year - b.year);
    if (years.length > K.maxYears) years.splice(0, years.length - K.maxYears);
  }
  y.mood = (y.mood * y.days + d.mood) / (y.days + 1);
  y.days++;
  y.moodLow = Math.min(y.moodLow, d.mood);
  y.moodHigh = Math.max(y.moodHigh, d.mood);
  y.kept += d.kept.length;
  y.broken += d.broken.length;
  y.released += d.released.length;
  y.breaches += d.breaches.length;
  y.repairs += d.repairs.length;
  y.material += d.material;
  y.decisions += d.decisions;
  y.alive = d.alive;
  for (const action of new Set(d.actions.map((a) => a.action))) {
    const t = y.actions.find((a) => a.action === action);
    if (t) t.days++;
    else y.actions.push({ action, days: 1 });
  }
  y.actions.sort((a, b) => b.days - a.days || compare(a.action, b.action));
  y.actions = y.actions.slice(0, 4 * K.yearActions);
  for (const e of d.episodes)
    if (!y.episodes.some((x) => x.id === e.id)) y.episodes.push({ ...cloneData(e), day: d.day });
  y.episodes.sort(
    (a, b) => Math.abs(b.valence) * b.salience - Math.abs(a.valence) * a.salience || a.day - b.day,
  );
  y.episodes = y.episodes.slice(0, K.yearEpisodes);
  y.illness.push(...d.illness.onset.slice(0, Math.max(0, K.yearIllnesses - y.illness.length)));
}
function append(
  state: State,
  record: DayRecord,
  K: DeepReadonly<typeof CHRONICLE_DEFAULTS>,
  retention: number,
): void {
  if (record.day !== state.open.day || state.days.some((d) => d.day >= record.day))
    throw new RangeError('Duplicate or rewound closed day');
  for (const d of state.days) delete d.state;
  state.days.push(record);
  const newest = record.day;
  while (state.days.length > 1 && (state.days.length > K.maxDays || newest - state.days[0]!.day > retention))
    foldDay(state.years, state.days.shift()!, K);
  state.open = openDay(record.day + 1, record.state ?? state.open.baseline);
}
function validate(s: DeepReadonly<State>): ValidationIssue[] {
  const issues: ValidationIssue[] = validateNarrativeJson(s);
  issues.push(
    ...validateNarrativeFields(s, ['days', 'years', 'open'], ['days', 'years', 'open'], 'chronicle'),
  );
  const bad = (path: string, message: string, code: ValidationIssue['code'] = 'invalid-schema') =>
    issues.push({ path, code, message });
  if (!s || !Array.isArray(s.days) || !Array.isArray(s.years) || !s.open)
    return [{ path: 'chronicle', code: 'invalid-schema', message: 'Required chronicle state missing' }];
  if (s.days.length > 120 || s.years.length > 150)
    bad('chronicle', 'Retention bound exceeded', 'limit-exceeded');
  const days = new Set<number>(),
    years = new Set<number>();
  let previous = -Infinity;
  for (const d of s.days) {
    if (!d || typeof d !== 'object') {
      bad('days', 'Malformed day');
      continue;
    }
    issues.push(
      ...validateNarrativeFields(
        d,
        [
          'day',
          'kept',
          'broken',
          'released',
          'keptByKind',
          'brokenByKind',
          'prayers',
          'actions',
          'habits',
          'trust',
          'episodes',
          'breaches',
          'repairs',
          'material',
          'illness',
          'mood',
          'verdicts',
          'decisions',
          'alive',
          'state',
        ],
        [
          'day',
          'kept',
          'broken',
          'released',
          'keptByKind',
          'brokenByKind',
          'prayers',
          'actions',
          'habits',
          'trust',
          'episodes',
          'breaches',
          'repairs',
          'material',
          'illness',
          'mood',
          'verdicts',
          'decisions',
          'alive',
        ],
        'day',
      ),
    );
    if (
      ![
        d.kept,
        d.broken,
        d.released,
        d.actions,
        d.habits,
        d.trust,
        d.episodes,
        d.breaches,
        d.repairs,
        d.verdicts,
      ].every(Array.isArray) ||
      typeof d.alive !== 'boolean'
    )
      bad('days', 'Invalid day containers');
    if (days.has(d.day)) bad('days', 'Duplicate day', 'duplicate-id');
    days.add(d.day);
    if (!Number.isSafeInteger(d.day) || d.day <= previous || d.day >= s.open.day)
      bad('days', 'Nonmonotone day');
    previous = d.day;
    if (
      !Number.isFinite(d.mood) ||
      Math.abs(d.mood) > 1 ||
      !Number.isFinite(d.material) ||
      !Number.isSafeInteger(d.decisions) ||
      d.decisions < 0
    )
      bad('days', 'Malformed day');
  }
  previous = -Infinity;
  for (const y of s.years) {
    if (
      !y ||
      typeof y !== 'object' ||
      !Array.isArray(y.actions) ||
      !Array.isArray(y.episodes) ||
      !Array.isArray(y.illness)
    ) {
      bad('years', 'Malformed year');
      continue;
    }
    if (years.has(y.year)) bad('years', 'Duplicate year', 'duplicate-id');
    years.add(y.year);
    if (
      !Number.isSafeInteger(y.year) ||
      y.year <= previous ||
      !Number.isSafeInteger(y.days) ||
      y.days < 1 ||
      y.actions.length > 32 ||
      y.episodes.length > 4 ||
      y.illness.length > 6
    )
      bad('years', 'Malformed year');
    previous = y.year;
  }
  const o = s.open;
  issues.push(
    ...validateNarrativeFields(
      o,
      [
        'day',
        'baseline',
        'kept',
        'broken',
        'released',
        'actions',
        'verdicts',
        'material',
        'moodSum',
        'moodSamples',
        'decisions',
        'socialMs',
      ],
      [
        'day',
        'baseline',
        'kept',
        'broken',
        'released',
        'actions',
        'verdicts',
        'material',
        'moodSum',
        'moodSamples',
        'decisions',
        'socialMs',
      ],
      'open',
    ),
  );
  if (
    !Array.isArray(o.actions) ||
    !Array.isArray(o.verdicts) ||
    !o.baseline ||
    typeof o.baseline !== 'object'
  ) {
    bad('open', 'Invalid accumulator containers');
    return issues;
  }
  if (!Number.isSafeInteger(o.socialMs) || o.socialMs < 0)
    bad('open.socialMs', 'Invalid actual social duration');
  if (
    !Number.isSafeInteger(o.day) ||
    !Number.isSafeInteger(o.moodSamples) ||
    o.moodSamples < 0 ||
    !Number.isFinite(o.moodSum) ||
    !Number.isSafeInteger(o.decisions) ||
    o.decisions < 0 ||
    !Number.isFinite(o.material)
  )
    bad('open', 'Malformed accumulator');
  for (const key of ['kept', 'broken', 'released'] as const) {
    const ids = new Set<string>();
    if (!Array.isArray(o[key]) || o[key].length > 24) {
      bad(key, 'Invalid notes');
      continue;
    }
    for (const n of o[key]) {
      if (!n || typeof n !== 'object' || typeof n.id !== 'string' || !n.id || typeof n.kind !== 'string') {
        bad(key, 'Invalid note');
        continue;
      }
      if (ids.has(n.id)) bad(key, 'Duplicate note', 'duplicate-id');
      ids.add(n.id);
    }
  }
  if (o.actions.length > 32 || o.verdicts.length > 16)
    bad('open', 'Retention bound exceeded', 'limit-exceeded');
  return issues;
}
function checked(s: DeepReadonly<State>): State {
  const issues = validate(s);
  if (issues.length) throw new RangeError(issues[0]!.message);
  return cloneData(s) as State;
}
const result = (state: State, at: number): ReturnType<ChronicleOwner['receive']> => ({
  state,
  effects: { terms: [], modifiers: [], appraisals: [] },
  events: [],
  nextBoundary: (state.open.day + 1) * DAY,
  advancedThrough: at,
});
/** Complete source closure; C0 must supply the actual actor snapshot. */
export function closeChronicleDay(
  state: DeepReadonly<State>,
  actor: DeepReadonly<ChronicleSnapshot>,
  context: DeepReadonly<FrameContext>,
): ReturnType<ChronicleOwner['close']> {
  const s = checked(state);
  const socialMs = s.open.socialMs;
  if (context.at !== (s.open.day + 1) * DAY) throw new RangeError('Day closure clock mismatch');
  const record = consolidateDay(actor, s.open.day, s.open, context.effective.builtins.CHRONICLE_DEFAULTS);
  append(s, record, context.effective.builtins.CHRONICLE_DEFAULTS, actor.retention.chronicleDays);
  return {
    ...result(s, context.at),
    events: [{ kind: 'day-closed', record: cloneData(record) }],
    day: cloneData(record),
    socialMs,
  };
}
export function noteChronicleOutcome(
  state: DeepReadonly<State>,
  outcome: DeepReadonly<ObservedOutcome>,
  suggestions: readonly DeepReadonly<SuggestionResolution>[],
): State {
  const s = checked(state);
  s.open.material += outcome.actual.material ?? 0;
  if (outcome.status !== 'completed') return s;
  let t = s.open.actions.find((a) => a.action === outcome.actionId);
  if (!t && s.open.actions.length < 32) {
    t = { action: outcome.actionId, done: 0, prompted: 0, by: {} };
    s.open.actions.push(t);
  }
  if (t) {
    t.done++;
    const voices = [
      ...new Set(
        suggestions
          .filter((r) => ['assented', 'complied', 'commanded'].includes(r.verdict))
          .map((r) => r.voiceId),
      ),
    ];
    if (voices.length) t.prompted++;
    for (const voice of voices) t.by[voice] = (t.by[voice] ?? 0) + 1;
  }
  return s;
}
export const chronicleOwner: ChronicleOwner = {
  initialize(context) {
    return {
      days: [],
      years: [],
      open: openDay(Math.floor(context.at / DAY), chronicleState(context.snapshot)),
    };
  },
  validate,
  close(state, context) {
    return closeChronicleDay(state, context.snapshot, context);
  },
  receive(state, input, context) {
    let s = checked(state);
    if (context.settlement && input.kind === 'action-settled') {
      if (
        input.activityId !== context.settlement.activity.id ||
        context.settlement.outcome.activityId !== input.activityId
      )
        throw new RangeError('Chronicle settlement mismatch');
      s = noteChronicleOutcome(s, context.settlement.outcome, context.settlement.activity.suggestions);
      if (
        context.settlement.outcome.status === 'completed' &&
        context.settlement.activity.offer.participants.some((id) => id !== context.person)
      )
        s.open.socialMs += context.settlement.outcome.end - context.settlement.outcome.start;
    }
    const o = s.open;
    if (
      context.settlement &&
      input.kind === 'action-settled' &&
      context.settlement.outcome.status === 'completed'
    ) {
      for (const id of context.settlement.kept) {
        const c = context.snapshot.agenda.commitments.find((c) => c.id === id);
        if (!c) throw new RangeError('Unknown kept commitment');
        const n = noteOf(c),
          suggestion = context.settlement.suggestion;
        if (suggestion && ['assented', 'complied', 'commanded'].includes(suggestion.verdict)) {
          n.prompted = true;
          n.voiceId = suggestion.voiceId;
        }
        pushNote(o.kept, n);
      }
    }
    o.moodSum += context.snapshot.affect.mood.valence;
    o.moodSamples++;
    if (input.kind === 'commitment-changed') {
      const c = input.after;
      if (c.status === 'kept') pushNote(o.kept, noteOf(c));
      else if (c.status === 'broken') pushNote(o.broken, noteOf(c));
      else if (c.status === 'released') pushNote(o.released, noteOf(c));
    }
    if (input.kind === 'decision' && !input.decision.review) {
      o.decisions++;
      for (const r of input.decision.suggestions ??
        (input.decision.suggestion ? [input.decision.suggestion] : [])) {
        const t = o.verdicts.find(
          (t) => t.voiceId === r.voiceId && t.verdict === r.verdict && t.reason === r.reason,
        );
        if (t) t.count++;
        else if (o.verdicts.length < 16)
          o.verdicts.push({
            voiceId: r.voiceId,
            verdict: r.verdict,
            reason: r.reason,
            count: 1,
            ...(r.kind === undefined ? {} : { kind: r.kind }),
          });
      }
    }
    return result(s, context.at);
  },
};
Object.freeze(CHRONICLE_DEFAULTS.habitThresholds);
Object.freeze(CHRONICLE_DEFAULTS);
