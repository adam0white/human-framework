/** Voice's authored town vocabulary and detached HF4 readings. No actor is advanced here. */
import { DEFAULT_NORMS, type PersonAuthoring } from '@adam0white/human-framework';
import { actionPhrase, pastAction } from '../ui/words.ts';
import { ACTION_LABEL } from './action-labels.ts';
import { openingPerson } from './hf4-authoring.ts';
import type {
  Affordance,
  BodyReadout,
  DecisionRecord,
  Percept,
  PersonSpec,
  StandingAdvice,
  Suggestion,
  VoicePerson,
} from './reading-types.ts';

export type * from './reading-types.ts';
export const MINUTES_PER_DAY = 1440;
export const MINUTES_PER_YEAR = 525600;
export const dayOf = (at: number) => Math.floor(at / 1440);
export const minuteOfDay = (at: number) => ((at % 1440) + 1440) % 1440;
export type PrayerCalendar = (day: number) => {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
};
export type ConverseContext = { placeId?: string; topics?: string[] };
export interface World {
  now(): number;
  affordancesFor(p: VoicePerson): Affordance[];
  perceptsFor(p: VoicePerson, since: number, until: number): Percept[];
  resolve(
    p: VoicePerson,
    activity: import('./reading-types.ts').Activity,
    reason: 'ended' | 'interrupted',
  ): import('./reading-types.ts').Outcome;
  scarcityFor?(p: VoicePerson): number;
  onDay?(personId: string, day: number): void;
  converse?(
    speaker: VoicePerson,
    listener: VoicePerson,
    activity: import('./reading-types.ts').Activity,
  ): Partial<ConverseContext> | false | undefined;
}
export const RAMADAN_DEFAULTS = { suhoorLead: 60, iftarLength: 60 };
export const EXEMPTION_DEFAULTS = { illnessSeverity: 0.5 };
export const heldNorms = ({
  practice,
  extraNorms = [],
}: {
  practice: number;
  extraNorms?: unknown[];
}): VoicePerson['conscience']['norms'] =>
  DEFAULT_NORMS.map((n) => ({
    normId: n.id,
    conviction: practice,
    standing: n.standing,
    provenance: n.provenance,
    ...((extraNorms as { normId: string }[]).find((x) => x.normId === n.id) ?? {}),
  }));
export function prayerWindows(day: number, calendar: PrayerCalendar) {
  const t = calendar(day),
    base = day * 1440;
  return [
    ['fajr', t.fajr, t.sunrise],
    ['dhuhr', t.dhuhr, t.asr],
    ['asr', t.asr, t.maghrib],
    ['maghrib', t.maghrib, t.isha],
    ['isha', t.isha, 1440 + t.fajr],
  ].map(([id, from, until]) => ({
    id: `salah:${day}:${id}`,
    kind: 'worship' as const,
    actions: ['pray'],
    normId: 'salah',
    from: base + Number(from),
    until: base + Number(until),
    importance: 0.8,
    label: String(id).charAt(0).toUpperCase() + String(id).slice(1),
    chain: `salah:${id}`,
  }));
}
export const eidWindow = (day: number, c: PrayerCalendar) => ({
  from: day * 1440 + c(day).sunrise + 20,
  until: day * 1440 + c(day).dhuhr - 10,
});
export const eidPrayer = (w: { from: number; until: number }) => ({
  ...w,
  kind: 'worship' as const,
  actions: ['pray-eid'],
  normId: 'eid-prayer',
  importance: 0.5,
  label: 'Eid prayer',
});
export const ramadanFast = (first: number, days: number, c: PrayerCalendar, o: { violatedBy: string[] }) => ({
  kind: 'abstain' as const,
  actions: [],
  violatedBy: o.violatedBy,
  from: first * 1440 + c(first).fajr,
  until: first * 1440 + c(first).maghrib,
  recurEvery: 1440,
  recurUntil: (first + days - 1) * 1440 + c(first + days - 1).maghrib,
  normId: 'sawm',
  importance: 0.9,
  exemptWhen: ['illness', 'travel'] as ('illness' | 'travel')[],
  chain: 'sawm:ramadan',
  label: 'fast',
});
export const ramadanMeals = (first: number, days: number, c: PrayerCalendar) =>
  Array.from({ length: days }, (_, i) => first + i).flatMap((d) => [
    {
      kind: 'appointment' as const,
      actions: ['eat', 'drink'],
      from: d * 1440 + c(d).fajr - 60,
      until: d * 1440 + c(d).fajr,
      importance: 0.7,
      label: 'suhoor',
    },
    {
      kind: 'appointment' as const,
      actions: ['eat', 'drink'],
      from: d * 1440 + c(d).maghrib,
      until: d * 1440 + c(d).maghrib + 60,
      importance: 0.7,
      label: 'iftar',
    },
  ]);
const authored = new WeakSet<object>();
/** Temporary opening authoring book. Never mounted as a live actor. */
export function createOpening(spec: PersonSpec): VoicePerson {
  const p = {
    id: spec.id,
    name: spec.name,
    now: spec.now,
    life: { bornAt: spec.bornAt, sex: spec.sex, alive: true },
    traits: spec.traits,
    values: spec.values,
    body: { ...openingPerson(spec.id, spec.name).state.body, ...spec.body, circadianPeak: 960 },
    needs: openingPerson(spec.id, spec.name).state.needs,
    skills: spec.skills ?? {},
    social: { relationships: spec.relationships ?? [] },
    will: { voices: spec.voices ?? [], advice: [] },
    agenda: { commitments: spec.commitments ?? [], goals: [], owed: [] },
    conscience: { norms: spec.norms ?? [], breaches: [] },
    receivedTexts: [],
    memory: { episodes: [], expectations: [], beliefs: [] },
    habits: [],
    affect: { mood: { valence: 0, arousal: 0.3 }, emotions: [] },
    lexicon: spec.lexicon,
    trace: [],
    chronicle: [],
  } as unknown as VoicePerson;
  authored.add(p);
  return p;
}
function author(p: VoicePerson) {
  if (!authored.has(p)) throw new Error('Voice cannot edit an inspected person.');
}
export function authorIllness(p: VoicePerson, illness: object) {
  author(p);
  p.body.illnesses.push({ ...illness, id: `illness:${p.body.illnesses.length}`, since: p.now } as never);
}
export function authorEpisode(p: VoicePerson, episode: object) {
  author(p);
  p.memory.episodes.push({ ...episode, id: `e${p.memory.episodes.length}` } as never);
}
export function authorBelief(
  p: VoicePerson,
  prop: string,
  value: boolean,
  authoredLogOdds: number,
  sourceId: string,
  at: number,
) {
  author(p);
  p.memory.beliefs.push({
    prop,
    logOdds: authoredLogOdds * (value ? 1 : -1),
    updatedAt: at,
    sources: [{ id: sourceId, value }],
  } as never);
}
export function personAuthoring(p: VoicePerson): PersonAuthoring {
  author(p);
  const result = openingPerson(p.id, p.name, p.life.sex) as PersonAuthoring;
  const ms = (n: number) => Math.round(n * 60000);
  result.identity = { name: p.name, birthAt: ms(p.life.bornAt), sex: p.life.sex };
  // The authoring guard admits only the complete opening episodes; createPerson validates every field.
  result.biography = p.memory.episodes.map((e) => ({
    ...e,
    at: ms(e.at),
    basis: { kind: 'authored' as const, author: 'voice' },
    provenance: ['authored:voice'],
  })) as PersonAuthoring['biography'];
  const state = result.state;
  state.traits = { ...state.traits, ...p.traits };
  state.values = { ...state.values, ...p.values };
  const { circadianPeak: _oldPeak, ...authoredBody } = p.body;
  state.body = {
    ...state.body,
    ...authoredBody,
    doze: state.body.doze,
    exposures: state.body.exposures,
    since: ms(p.now),
    circadianPeakMs: ms(p.body.circadianPeak),
    illnesses: p.body.illnesses.map((i) => ({ ...i, since: ms(i.since) })),
  } as PersonAuthoring['state']['body'];
  state.heldNorms = p.conscience.norms.map((n) => ({
    ...n,
    provenance: DEFAULT_NORMS.find((d) => d.id === n.normId)!.provenance,
  }));
  state.relationships = p.social.relationships.map((r) =>
    Object.assign(
      { respect: 0.5, ledger: 0, lastInteraction: ms(p.now) },
      r,
      r.deceasedAt === undefined ? {} : { deceasedAt: ms(r.deceasedAt) },
    ),
  );
  state.voices = p.will.voices;
  state.skills = Object.entries(p.skills).map(([id, level]) => ({
    id,
    level: typeof level === 'number' ? level : level.level,
    practicedMs: 0,
    lastPracticed: ms(p.now),
  }));
  state.beliefs = p.memory.beliefs.map((b) => ({ ...b, updatedAt: ms(b.updatedAt) }));
  state.expectations = p.memory.expectations;
  state.habits = p.habits.map((h) => ({ ...h, cue: { ...h.cue }, lastAt: ms(h.lastAt) }));
  state.agenda = {
    ...state.agenda,
    commitments: p.agenda.commitments.map((c) => {
      const { recurEvery, ...rest } = c;
      return {
        ...rest,
        from: ms(c.from),
        until: ms(c.until),
        ...(recurEvery === undefined ? {} : { recurEveryMs: ms(recurEvery) }),
        ...(c.recurUntil === undefined ? {} : { recurUntil: ms(c.recurUntil) }),
      };
    }),
  };
  authored.delete(p);
  return result;
}
const readouts = new WeakMap<object, BodyReadout>();
const affects = new WeakMap<object, unknown>();
export function registerReadout(p: VoicePerson, body: BodyReadout, affect: unknown) {
  readouts.set(p, body);
  affects.set(p, affect);
}
export function readBody(p: VoicePerson): BodyReadout {
  const b = readouts.get(p);
  if (!b) throw new Error('Voice requires an HF body inspection.');
  return b;
}
export function readAffect(p: VoicePerson) {
  const a = affects.get(p) as {
    emotions?: { id: string; intensity: number; cause: string; targetId?: string }[];
  };
  return { dominant: a?.emotions ?? [] };
}
export const voiceOf = (p: VoicePerson, id: string) => p.will.voices.find((v) => v.voiceId === id);
export const resolutionsOf = (d: DecisionRecord) => d.suggestions ?? (d.suggestion ? [d.suggestion] : []);
export const standingAdvice = (p: VoicePerson, _at?: number) => p.will.advice ?? [];
export const adviceWeight = (a: StandingAdvice, _at: number) =>
  (a as StandingAdvice & { effectiveWeight?: number }).effectiveWeight ?? 0;
export const chronicleBetween = (
  days: import('./reading-types.ts').DayRecord[],
  from: number,
  to: number,
): import('./reading-types.ts').DayRecord[] => days.filter((d) => d.day >= from && d.day <= to);
export const consolidateDay = (
  p: VoicePerson,
  day: number,
  _acc: unknown,
): import('./reading-types.ts').DayRecord | undefined => p.chronicle?.find((d) => d.day === day);
export const narrateChronicle = (days: import('./reading-types.ts').DayRecord[], _opts: unknown) =>
  days.flatMap((d) => d.episodes.map((e) => e.summary)).slice(0, 6);
export const isLossEpisode = (_p: VoicePerson, e: import('./reading-types.ts').Episode) =>
  e.tags.some((t) => ['loss', 'death', 'funeral'].includes(t));

/** Host-only seeded stream for world outcomes. It never supplies actor randomness. */
export function createRng(seed: number): import('./reading-types.ts').RngState {
  return { a: seed | 0, b: 0, c: 0, d: 0 };
}
export function chance(state: import('./reading-types.ts').RngState, p: number) {
  let x = state.a || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.a = x;
  return (x >>> 0) / 4294967296 < p;
}

export const owedMakeUps = (p: VoicePerson): VoicePerson['agenda']['owed'] => p.agenda.owed ?? [];
export const dominantTerm = (c: import('./reading-types.ts').Considered | undefined) =>
  c?.terms.reduce<import('./reading-types.ts').Term | undefined>(
    (best, t) => (!best || Math.abs(t.value) > Math.abs(best.value) ? t : best),
    undefined,
  )?.source ?? '';
/** Report comparison of admitted day records; this does not influence any person. */
export function diffChronicle(
  before: readonly import('./reading-types.ts').DayRecord[],
  after: readonly import('./reading-types.ts').DayRecord[],
  opts: { voices: string[]; person: VoicePerson; maxLines: number },
) {
  const changes: { kind: string; subject: string }[] = [],
    lines: string[] = [];
  const actions = new Set(before.flatMap((d) => d.actions.map((a) => a.action)));
  for (const action of actions) {
    const previous = before.flatMap((d) => d.actions).filter((a) => a.action === action);
    const current = after.flatMap((d) => d.actions).filter((a) => a.action === action);
    const n = current.reduce((s, a) => s + a.done, 0);
    const kind =
      n === 0 ? 'stopped' : current.some((a) => a.prompted === 0) ? 'unprompted' : 'still-prompted';
    changes.push({ kind, subject: `action:${action}` });
    lines.push(
      n === 0
        ? `By the end he had stopped trying to ${actionPhrase(ACTION_LABEL[action] ?? action.replace(/[-:]/g, ' '))}.`
        : `He ${pastAction(ACTION_LABEL[action] ?? action.replace(/[-:]/g, ' '))} ${kind === 'unprompted' ? 'without being told' : 'after a suggestion'}.`,
    );
  }
  return { changes, lines };
}
