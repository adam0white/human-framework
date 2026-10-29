/** Public HF projections and timestamped ingress for the mounted Watch host.
 * This module owns no actor equations. Every live reading comes from inspect or preview.
 */
import type {
  DeepReadonly,
  Input,
  InspectQuery,
  Offer,
  PersonAuthoring,
  PersonView,
  PreviewResult,
} from '@adam0white/human-framework';
import { minuteMs, WatchActors, type WatchArchive } from './hf4.ts';

export type HostPart<K extends Extract<PersonView, { kind: 'host' }>['parts'][number]['select']> = Extract<
  Extract<PersonView, { kind: 'host' }>['parts'][number],
  { select: K }
>['value'];
export type ActorPayload<K extends Input['kind']> = Extract<Input, { kind: K }>['payload'];
export type ActorSource<K extends Input['kind']> = Extract<Input, { kind: K }>['source'];
export type ActorIdentity = PersonAuthoring['identity'];
export interface ActorState {
  archive: WatchArchive;
  identities: Record<string, ActorIdentity>;
  /** Last ingress slot. Paused player inputs advance one integer millisecond, never reopen a closed slot. */
  ingress: number;
  sequence: number;
  queued: Input[];
  prayerDay: Record<string, number>;
  advice: Record<string, string>;
  orders: Record<string, string>;
  kinRevision: number;
  kinFacts: Record<string, true>;
  acceptedProposal: Record<string, string>;
}
export interface ActorHost {
  minute: number;
  actors: ActorState;
}
const live = new WeakMap<ActorState, WatchActors>();
const actorHosts = new WeakMap<object, ActorHost>();
const projectionCache = new WeakMap<ActorState, { epoch: number; people: Map<string, WatchPerson> }>();
export function actorHost(p: WatchPerson): ActorHost {
  const s = actorHosts.get(p);
  if (!s) throw new Error('Detached Watch reading has no live host.');
  return s;
}
export function actorRuntime(s: ActorHost): WatchActors {
  let runtime = live.get(s.actors);
  if (!runtime) {
    runtime = WatchActors.restore(s.actors.archive);
    live.set(s.actors, runtime);
  }
  return runtime;
}
export function actorState(runtime: WatchActors, people: readonly PersonAuthoring[]): ActorState {
  const state: ActorState = {
    archive: runtime.snapshot(),
    identities: Object.fromEntries(people.map((p) => [p.id, structuredClone(p.identity)])),
    ingress: runtime.snapshot().archive.current.at - 1,
    sequence: 0,
    queued: [],
    prayerDay: {},
    advice: {},
    orders: {},
    kinRevision: 0,
    kinFacts: {},
    acceptedProposal: {},
  };
  live.set(state, runtime);
  return state;
}
export function saveActors(s: ActorHost): void {
  s.actors.archive = actorRuntime(s).snapshot();
}
export function actorAt(s: ActorHost): number {
  const base = Math.max(minuteMs(s.minute), actorRuntime(s).time() + 1);
  const sameMinute = s.actors.queued
    .filter((i) => i.at >= base && Math.floor(i.at / 60_000) === s.minute)
    .map((i) => i.at);
  const at = sameMinute.length ? Math.min(...sameMinute) : base;
  if (!Number.isSafeInteger(at)) throw new Error('Watch ingress exhausted integer time.');
  return at;
}
/** A batch shares one ingress slot. Keep its authored occurredAt separately in the evidence payload. */
export function actorInput<K extends Input['kind']>(
  s: ActorHost,
  kind: K,
  payload: ActorPayload<K>,
  source?: ActorSource<K>,
  at = actorAt(s),
): Input {
  const input = {
    id:
      kind === 'voice.evidence-received'
        ? (payload as ActorPayload<'voice.evidence-received'>).evidence.id
        : `watch:input:${++s.actors.sequence}`,
    at,
    kind,
    payload,
    source: source ?? { type: 'host', id: 'watch' },
  } as Input;
  s.actors.ingress = Math.max(s.actors.ingress, at);
  s.actors.queued.push(input);
  return input;
}
export function hostPart<K extends Extract<PersonView, { kind: 'host' }>['parts'][number]['select']>(
  runtime: WatchActors,
  id: string,
  key: K,
): DeepReadonly<HostPart<K>> {
  const person = runtime.read({ perspective: { kind: 'host' }, people: [id], select: [key] }).people[0];
  if (person?.kind !== 'host') throw new Error(`No Watch host reading for ${id}.`);
  const part = person.parts.find((p) => p.select === key);
  if (!part) throw new Error(`No Watch ${key} reading for ${id}.`);
  return part.value as DeepReadonly<HostPart<K>>;
}
export type WatchPerson = DeepReadonly<{
  id: string;
  name: string;
  now: number;
  life: { bornAt: number; sex: ActorIdentity['sex'] };
  body: HostPart<'body'>['state'];
  bodyReading: HostPart<'body'>['readout'];
  condition: HostPart<'condition'>;
  traits: HostPart<'traits'>;
  skills: Record<string, { level: number; practicedMs: number; lastPracticed: number }>;
  needs: Record<string, number>;
  affect: HostPart<'affect'>;
  agenda: HostPart<'agenda'>;
  social: {
    relationships: HostPart<'relationships'>['ties'];
    impressions: readonly {
      targetId: string;
      cues: readonly { key: string; value: number; confidence: number; seenAt?: number }[];
    }[];
  };
  will: { voices: HostPart<'relationships'>['voices'] };
  memory: { expectations: HostPart<'expectations'> };
  activity: null | {
    id: string;
    affordanceId: string;
    action: string;
    targetId?: string;
    placeId?: string;
    startedAt: number;
    endsAt: number;
    affordance: Offer;
    protest?: boolean;
  };
}>;
export function readActor(s: ActorHost, id: string): WatchPerson | undefined {
  const identity = s.actors.identities[id];
  if (!identity) return undefined;
  const runtime = actorRuntime(s);
  let cache = projectionCache.get(s.actors);
  if (!cache || cache.epoch !== runtime.generation()) {
    cache = { epoch: runtime.generation(), people: new Map() };
    projectionCache.set(s.actors, cache);
  }
  const cached = cache.people.get(id);
  if (cached) return cached;
  const query: InspectQuery = {
    perspective: { kind: 'host' },
    people: [id],
    select: [
      'summary',
      'body',
      'condition',
      'traits',
      'skills',
      'needs',
      'affect',
      'agenda',
      'relationships',
      'expectations',
    ],
  };
  const reading = runtime.read(query);
  const p = reading.people[0];
  if (p?.kind !== 'host') throw new Error(`No Watch actor ${id}.`);
  const get = <K extends (typeof query.select)[number]>(key: K): DeepReadonly<HostPart<K>> => {
    const part = p.parts.find((part) => part.select === key);
    if (!part) throw new Error(`No Watch ${key} reading for ${id}.`);
    return part.value as DeepReadonly<HostPart<K>>;
  };
  const body = get('body');
  const relationships = get('relationships');
  const active = runtime.activeActions().find((a) => a.person === id);
  const projected: WatchPerson = {
    id,
    name: get('summary').name,
    now: Math.floor(reading.at / 60_000),
    life: { bornAt: identity.birthAt / 60_000, sex: identity.sex },
    body: body.state,
    bodyReading: body.readout,
    condition: get('condition'),
    traits: get('traits'),
    skills: Object.fromEntries(
      get('skills').map((skill) => [
        skill.id,
        { level: skill.competence, practicedMs: skill.practicedMs, lastPracticed: skill.lastPracticed },
      ]),
    ),
    needs: Object.fromEntries(get('needs').map((need) => [need.id, need.level])),
    affect: get('affect'),
    agenda: get('agenda'),
    social: { relationships: relationships.ties, impressions: [] },
    will: { voices: relationships.voices },
    memory: { expectations: get('expectations') },
    activity: active
      ? {
          id: active.id,
          affordanceId: active.offer.id,
          action: active.offer.actionId,
          ...(active.offer.target ? { targetId: active.offer.target } : {}),
          ...(active.offer.place ? { placeId: active.offer.place } : {}),
          startedAt: Math.floor(active.start / 60_000),
          endsAt: Math.floor((active.start + active.offer.durationMs) / 60_000),
          affordance: active.offer,
        }
      : null,
  };
  actorHosts.set(projected, s);
  Object.freeze(projected.needs);
  Object.freeze(projected.skills);
  Object.freeze(projected.life);
  Object.freeze(projected);
  cache.people.set(id, projected);
  return projected;
}
export function actorPeople(s: ActorHost): WatchPerson[] {
  return Object.keys(s.actors.identities).flatMap((id) => {
    const p = readActor(s, id);
    return p ? [p] : [];
  });
}
export function actorSigns(p: WatchPerson) {
  return p.condition.outwardSigns;
}
export function actorReport(p: WatchPerson) {
  return p.condition.selfReport;
}
export function actorSkill(p: WatchPerson, skill: string): number {
  return p.skills[skill]?.level ?? 0;
}
export function observerCues(s: ActorHost, observer: string, person: string) {
  const p = actorRuntime(s).read({
    perspective: { kind: 'person', observer },
    people: [person],
    select: ['condition'],
  }).people[0];
  if (p?.kind !== 'other') return [];
  const part = p.parts.find((part) => part.select === 'condition');
  return part?.select === 'condition' ? part.value.cues : [];
}
export function previewActor(
  s: ActorHost,
  person: string,
  inputs: readonly Input[],
  until: number,
  observer = 'keeper',
): DeepReadonly<PreviewResult> {
  return actorRuntime(s).preview({
    perspective: { kind: 'person', observer },
    person,
    inputs,
    until: Math.max(until, actorRuntime(s).time()),
    select: ['affect', 'expectations'],
  });
}

/** Exact public conditional skill capacity, used by the host's physical sling outcome. */
export function actorSkillReading(
  s: ActorHost,
  person: string,
  skill: string,
  difficulty: number,
  support = 0,
) {
  const reading = actorRuntime(s).read({
    perspective: { kind: 'host' },
    people: [person],
    select: [],
    skill: { person, skill, difficulty, support },
  }).skill;
  if (!reading) throw new Error('No Watch skill reading.');
  return reading;
}
/** All payload IDs and receipt IDs are host evidence. HF remains the sole state owner. */
export function actorEvidence(
  s: ActorHost,
  person: string,
  label: string,
): { person: string; evidenceId: string } {
  return { person, evidenceId: `watch:evidence:${label}:${++s.actors.sequence}` };
}

/** Watch authored affordances keep minutes at the host boundary. Conversion to HF happens once. */
export type WatchAffordance = {
  id: string;
  action: string;
  label: string;
  duration: number;
  effort: number;
  focus?: number;
  mode?: 'awake' | 'sleep';
  placeId?: string;
  targetId?: string;
  advertises: Offer['expected']['needs'];
  risk?: { chance: number; severity: number; kind?: string };
  requires?: Offer['demands']['requires'];
  skill?: { id: string; difficulty: number; domain?: 'general' | 'language' | 'motor' | 'knowledge' };
  tags?: readonly string[];
  norms?: Offer['norms'];
  with?: readonly string[];
  fulfills?: readonly string[];
  advances?: readonly string[];
};
export type WatchSuggestion = Extract<
  ActorPayload<'suggestion.received'>['received'],
  { kind: 'ordinary' }
>['suggestion'];
export type PublicDecision = Extract<
  import('@adam0white/human-framework').StepResult['events'][number]['data'],
  { kind: 'decision' }
>['decision'];
export type WatchSuggestionResolution = NonNullable<PublicDecision['suggestion']>;
export type WatchPercept = Omit<
  ActorPayload<'observation.received'>['percepts'][number],
  | 'id'
  | 'occurredAt'
  | 'claims'
  | 'norms'
  | 'advice'
  | 'consequences'
  | 'withdrawConsequences'
  | 'witnesses'
  | 'reports'
  | 'provenance'
> & {
  at: number;
  id?: string;
  claims?: ActorPayload<'observation.received'>['percepts'][number]['claims'];
  norms?: ActorPayload<'observation.received'>['percepts'][number]['norms'];
  advice?: ActorPayload<'observation.received'>['percepts'][number]['advice'];
};
export type WatchEvent = {
  duration?: number;
  kind:
    | 'begin'
    | 'finish'
    | 'decide'
    | 'command'
    | 'death'
    | 'died'
    | 'continue'
    | 'doze'
    | 'wake'
    | 'downed'
    | 'stood';
  personId: string;
  at: number;
  actionReceipt?: string;
  action?: string;
  affordanceId?: string;
  targetId?: string;
  status?: 'completed' | 'failed' | 'interrupted';
  verdict?: WatchSuggestionResolution['verdict'];
  review?: boolean;
  suggestion?: WatchSuggestionResolution;
  record?: PublicDecision;
};
export function publicOffer(person: string, a: WatchAffordance): Offer {
  return {
    id: a.id,
    actionId: a.action,
    label: a.label,
    person,
    durationMs: minuteMs(a.duration),
    ...(a.targetId ? { target: a.targetId } : {}),
    ...(a.placeId ? { place: a.placeId } : {}),
    participants: a.with ?? [],
    alongside: [],
    demands: {
      effort: a.effort,
      focus: a.focus ?? 0,
      mode: a.mode ?? 'awake',
      requires: a.requires ?? {},
      ...(a.skill ? { skill: { ...a.skill, domain: a.skill.domain ?? 'motor' } } : {}),
    },
    tags: a.tags ?? [],
    norms: a.norms ?? [],
    expected: {
      needs: a.advertises,
      followedBy: [],
      provenance: ['watch:authored-world'],
      ...(a.risk ? { risk: { ...a.risk, kind: a.risk.kind ?? 'danger' } } : {}),
    },
    fulfills: a.fulfills ?? [],
    advances: a.advances ?? [],
    diminishes: [],
  };
}

export type Affordance = WatchAffordance;
export type Suggestion = Omit<WatchSuggestion, 'adviceId'> & { adviceId?: string };
export type SuggestionResolution = WatchSuggestionResolution;
export type SimEvent = WatchEvent;
export type Percept = WatchPercept;
export type Command = { voiceId: string; affordanceId: string; since?: number; repeat?: boolean };
export type Person = WatchPerson;
export type Relationship = WatchPerson['social']['relationships'][number];

export function observeActor(s: ActorHost, person: string, percepts: readonly WatchPercept[]): string[] {
  const evidence = actorEvidence(s, person, 'observation');
  const ids = percepts.map((p, i) => p.id ?? `${evidence.evidenceId}:${i}`);
  actorInput(s, 'observation.received', {
    ...evidence,
    percepts: percepts.map((p, i) => {
      const { at, id: _id, ...rest } = p;
      return {
        ...rest,
        id: ids[i] as string,
        occurredAt: minuteMs(at),
        claims: p.claims ?? [],
        norms: p.norms ?? [],
        advice: p.advice ?? [],
        consequences: [],
        withdrawConsequences: [],
        witnesses: [],
        reports: [],
        provenance: [],
      };
    }),
  });
  return ids;
}
export function witnessActor(
  s: ActorHost,
  observer: string,
  actor: string,
  act: ActorPayload<'act.witnessed'>['act'],
): void {
  actorInput(s, 'act.witnessed', { ...actorEvidence(s, observer, 'witness'), actor, act });
}
export function reportActor(
  s: ActorHost,
  observer: string,
  target: string,
  key: ActorPayload<'person.reported'>['key'],
  value: number,
  weight: number,
  teller = target,
): void {
  actorInput(s, 'person.reported', {
    ...actorEvidence(s, observer, 'report'),
    target,
    key,
    value,
    weight,
    teller,
  });
}
export function interruptActor(s: ActorHost, person: string, reason: string): void {
  const active = readActor(s, person)?.activity;
  if (
    active &&
    !s.actors.queued.some(
      (i) =>
        i.kind === 'activity.interrupted' &&
        i.payload.person === person &&
        i.payload.activityId === active.id,
    )
  )
    actorInput(s, 'activity.interrupted', { person, activityId: active.id, reason });
}
export function exertActor(
  s: ActorHost,
  person: string,
  costs: Extract<ActorPayload<'body.received'>['receipt'], { type: 'exerted' }>['costs'],
  actionReceipt: string,
): void {
  actorInput(s, 'body.received', {
    ...actorEvidence(s, person, 'exertion'),
    receipt: { type: 'exerted', costs, actionReceipt },
  });
}
export function previewChoice(
  s: ActorHost,
  person: string,
  affords: readonly WatchAffordance[],
  suggestion?: Suggestion,
  observer = 'keeper',
): {
  result: DeepReadonly<PreviewResult>;
  record: DeepReadonly<PublicDecision> | undefined;
  resolution: DeepReadonly<WatchSuggestionResolution> | undefined;
  confidence: number;
} {
  const at = actorRuntime(s).time() + (observer === person ? 1 : 0);
  // Another-person imagination starts a fresh authored run with offer revision one.
  const revision =
    observer !== person
      ? 1
      : (actorRuntime(s)
          .hostState()
          .offers.find((row) => row.person === person)?.revision ?? 0) + 1;
  const source = { type: 'host' as const, id: 'watch' };
  const inputs: Input[] = [
    {
      id: 'watch:hypothetical:offers',
      at,
      source,
      kind: 'offers.received',
      payload: { person, revision, offers: affords.map((a) => publicOffer(person, a)) },
    },
  ];
  if (suggestion)
    inputs.push({
      id: 'watch:hypothetical:advice',
      at,
      source,
      kind: 'suggestion.received',
      payload: {
        person,
        received: {
          kind: 'ordinary',
          suggestion: {
            ...suggestion,
            adviceId: 'watch:hypothetical:advice',
            ...(suggestion.since === undefined ? {} : { since: minuteMs(suggestion.since) }),
          },
        },
      },
    });
  inputs.push({
    id: 'watch:hypothetical:decision',
    at,
    source,
    kind: 'decision.requested',
    payload: {
      person,
      reason: 'The Keeper considers a spoken request',
      treatment: 'reconsider',
      offerRevision: revision,
    },
  });
  const result = actorRuntime(s).preview({
    perspective: { kind: 'person', observer },
    person,
    inputs,
    until: at,
    select: ['affect', 'expectations'],
  });
  const event = result.possibilities.find((e) => e.data.kind === 'decision');
  const record = event?.data.kind === 'decision' ? event.data.decision : undefined;
  const cues = result.impression?.cues ?? [];
  const confidence = cues.length ? Math.max(...cues.map((c) => c.confidence)) : 0;
  return { result, record, resolution: record?.suggestion, confidence };
}
