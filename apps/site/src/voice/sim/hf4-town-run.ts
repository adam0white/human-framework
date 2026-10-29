/** Mounted public run driver. Town owns options and actual receipts; HF owns every person. */
import type { Input, Offer, PerceptData, PersonAuthoring, RunSpec } from '@adam0white/human-framework';
import { personAuthoring, registerReadout, type World } from './hf4-model.ts';
import { voiceReadings } from './hf4-readings.ts';
import { MINUTE_MS, VoiceRun } from './hf4-run.ts';
import type {
  Activity,
  Affordance,
  DecisionRecord,
  Outcome,
  Percept,
  Suggestion,
  SuggestionResolution,
  VoicePerson,
} from './reading-types.ts';
export type SimEvent = {
  at: number;
  personId: string;
  kind: string;
  detail: string;
  decisionId?: string;
  affordanceId?: string;
  action?: string;
  status?: Outcome['status'];
  review?: boolean;
};
export type StepOptions = {
  clock?: 'daily';
  suggestions?: Record<string, Suggestion | readonly Suggestion[]>;
  mutedVoiceId?: string;
  [key: string]: unknown;
};
export interface Community {
  people: VoicePerson[];
  runtime?: VoiceRun;
  openings?: PersonAuthoring[];
  offerBooks: Record<string, Affordance[]>;
  acceptedOffers: Record<string, Affordance>;
  hostAt: number;
  scarcity: Record<string, number>;
  calendarDay: Record<string, number>;
  interrupted: Record<string, string>;
  heard: Record<string, { key: string; adviceId: string }>;
}
const owners = new WeakMap<object, Community>();
export function createCommunity(people: VoicePerson[]): Community {
  return {
    people,
    hostAt: Math.min(...people.map((p) => p.now)),
    scarcity: {},
    calendarDay: {},
    interrupted: {},
    heard: {},
    offerBooks: {},
    acceptedOffers: {},
  };
}
export function cloneCommunity(c: Community): Community {
  if (!c.runtime || !c.openings) throw new Error('Cannot clone an unmounted Voice run.');
  const next: Community = {
    people: c.people.map((p) => structuredClone(p)),
    runtime: c.runtime.fork(),
    openings: structuredClone(c.openings),
    hostAt: c.hostAt,
    scarcity: { ...c.scarcity },
    calendarDay: { ...c.calendarDay },
    interrupted: { ...c.interrupted },
    heard: structuredClone(c.heard),
    offerBooks: structuredClone(c.offerBooks),
    acceptedOffers: structuredClone(c.acceptedOffers),
  };
  refresh(next);
  return next;
}
export function mount(c: Community, world: World, spec: RunSpec, opening?: PersonAuthoring[]) {
  c.openings = opening ?? c.people.map(personAuthoring);
  c.runtime = new VoiceRun(spec, c.openings);
  refresh(c);
}
function minutes<T>(value: T): T {
  // Only temporal DTO fields change units. Utility, trust, durations in prose and host facts do not.
  const keys = new Set([
    'at',
    'from',
    'until',
    'since',
    'lastAt',
    'lastWornAt',
    'lastPracticed',
    'adoptedAt',
    'lastAdvancedAt',
    'deceasedAt',
    'bornAt',
    'recurUntil',
  ]);
  const visit = (v: unknown, k = ''): unknown =>
    typeof v === 'number' && keys.has(k)
      ? v / MINUTE_MS
      : Array.isArray(v)
        ? v.map((x) => visit(x))
        : v && typeof v === 'object'
          ? Object.fromEntries(Object.entries(v).map(([key, x]) => [key, visit(x, key)]))
          : v;
  return visit(value) as T;
}
/** Authored UI paraphrases of the public verdict. These are not conversation emissions or receipts. */
function displayDecision(
  d: import('@adam0white/human-framework').DeepReadonly<import('./reading-types.ts').NativeDecision>,
): DecisionRecord {
  const words: Record<SuggestionResolution['verdict'], string> = {
    assented: "I'll do that.",
    complied: "I'll do it, though I object.",
    commanded: "I'll follow the order.",
    deferred: "I'll leave that for later.",
    modified: "I'll do something a little different.",
    refused: "I won't do that.",
  };
  const display = (r: NonNullable<typeof d.suggestion>): SuggestionResolution => ({
    ...r,
    says: words[r.verdict],
  });
  return {
    ...d,
    ...(d.suggestion ? { suggestion: display(d.suggestion) } : {}),
    ...(d.suggestions ? { suggestions: d.suggestions.map(display) } : {}),
  } as DecisionRecord;
}
function activity(c: Community, id: string): Activity | null {
  const active = c.runtime?.active.get(id);
  if (!active) return null;
  const a = active.offer;
  return {
    decisionId: active.decision?.id ?? active.request.activityId,
    intention: active.decision?.intention ?? '',
    affordanceId: a.id,
    action: a.actionId,
    affordance: c.acceptedOffers[active.request.activityId] ?? oldOffer(a),
    startedAt: active.start / MINUTE_MS,
    endsAt: active.end / MINUTE_MS,
    effort: a.demands.effort,
    focus: a.demands.focus,
    mode: a.demands.mode,
    ...(a.target ? { targetId: a.target } : {}),
    protest: active.decision?.suggestion?.verdict === 'complied',
  } as Activity;
}
const refreshed = new WeakMap<Community, { at: number; events: number }>();
function refresh(c: Community) {
  const runtime = c.runtime;
  if (!runtime || !c.openings) return;
  const last = refreshed.get(c);
  if (last?.at === runtime.at && last.events === runtime.events.length) return;
  const inspection = runtime.inspect({
    perspective: { kind: 'host' },
    people: c.people.map((p) => p.id),
    select: [
      'summary',
      'body',
      'affect',
      'expectations',
      'traits',
      'heldNorms',
      'relationships',
      'advice',
      'agenda',
      'needs',
      'beliefs',
      'sourceTrust',
      'skills',
    ],
  });
  for (let i = 0; i < c.people.length; i++) {
    const previous = c.people[i]!;
    const opening = c.openings.find((p) => p.id === previous.id)!;
    const r = voiceReadings(runtime, opening, inspection);
    const p = previous;
    // Replace detached readings; never feed this object back to an HF mutation.
    Object.assign(p, {
      now: r.minute,
      id: r.id,
      name: r.name,
      life: { bornAt: opening.identity.birthAt / MINUTE_MS, sex: opening.identity.sex, alive: r.alive },
      body: minutes({ ...r.body, circadianPeak: r.body.circadianPeakMs / MINUTE_MS }),
      needs: Object.fromEntries(r.needs.map((n) => [n.id, n.level])),
      traits: r.traits,
      values: opening.state.values,
      skills: Object.fromEntries(
        r.skills.map((s) => [
          s.id,
          { level: s.competence, practiced: s.practicedMs / MINUTE_MS, lastAt: s.lastPracticed / MINUTE_MS },
        ]),
      ),
      social: { relationships: minutes(r.relationships) },
      will: { voices: minutes(r.voices), advice: minutes(r.advice) },
      agenda: minutes(r.agenda),
      conscience: { norms: r.heldNorms, breaches: [] },
      receivedTexts: runtime.events.slice(-2048).flatMap((e) => {
        if (e.person !== r.id || e.data.kind !== 'observation-attended' || e.data.attention <= 0) return [];
        const source = runtime.textSource(e.data.perceptId, e.data.evidenceId);
        if (source?.channel !== 'told' || !e.data.summary) return [];
        return [
          {
            id: `heard:${e.id}`,
            at: e.data.occurredAt / MINUTE_MS,
            kind: 'told',
            actorId: source.actorId,
            targetId: source.targetId,
            summary: e.data.summary,
          },
        ];
      }),
      memory: {
        episodes: [
          ...opening.biography.map((e) => minutes(e)),
          ...runtime.events.slice(-2048).flatMap((e) => {
            if (e.person !== r.id || e.data.kind !== 'observation-attended' || !e.data.episodeId) return [];
            const source = runtime.textSource(e.data.perceptId, e.data.evidenceId);
            return [
              {
                id: e.data.episodeId,
                at: e.data.occurredAt / MINUTE_MS,
                kind: source?.channel === 'told' ? 'told' : 'social',
                actorId: source?.actorId,
                targetId: source?.targetId,
                placeId: source?.placeId,
                summary: e.data.summary ?? '',
                tags: e.data.died ? ['death', 'loss'] : [],
                valence: source?.valence,
                salience: source?.salience,
              },
            ];
          }),
        ],
        expectations: r.expectations,
        beliefs: r.beliefs,
      },
      trace: r.trace.map((d) => displayDecision(minutes(d))),
      chronicle: minutes(r.days),
      activity: activity(c, r.id),
      lexicon: previous.lexicon,
      habits: opening.state.habits,
    });
    registerReadout(p, r.bodyReadout as never, r.affect);
    owners.set(p, c);
  }
  refreshed.set(c, { at: runtime.at, events: runtime.events.length });
}
export function oldOffer(a: import('@adam0white/human-framework').DeepReadonly<Offer>): Affordance {
  return {
    id: a.id,
    action: a.actionId,
    label: a.label,
    duration: a.durationMs / MINUTE_MS,
    effort: a.demands.effort,
    focus: a.demands.focus,
    mode: a.demands.mode,
    placeId: a.place,
    targetId: a.target,
    with: [...a.participants],
    tags: [...a.tags],
    norms: [...a.norms],
    advertises: { ...a.expected.needs },
    fulfills: [...a.fulfills],
  } as Affordance;
}
export function publicOffer(p: VoicePerson, a: Affordance): Offer {
  return {
    id: a.id,
    actionId: a.action,
    label: a.label,
    person: p.id,
    durationMs: Math.max(1, Math.round(a.duration * MINUTE_MS)),
    ...(a.targetId ? { target: a.targetId } : {}),
    ...(a.placeId ? { place: a.placeId } : {}),
    participants: a.with ?? [],
    alongside: a.alongside ?? [],
    demands: { effort: a.effort, focus: a.focus ?? 0, mode: a.mode ?? 'awake', requires: a.requires ?? {} },
    tags: a.tags ?? [],
    norms: a.norms ?? [],
    expected: {
      needs: a.advertises ?? {},
      ...(a.material === undefined ? {} : { material: a.material }),
      ...(a.risk === undefined ? {} : { risk: a.risk }),
      followedBy: [],
      provenance: ['authored:voice-town'],
    },
    fulfills: a.fulfills ?? [],
    advances: a.advances ?? [],
    diminishes: a.diminishes ?? [],
  };
}
function percept(p: Percept, index: number, source: string): PerceptData {
  return {
    id: `voice-evidence:${source}:${index}`,
    occurredAt: Math.round(p.at * MINUTE_MS),
    channel: p.channel,
    kind: p.kind,
    summary: p.summary ?? '',
    salience: p.salience ?? 0.5,
    ...(p.actorId ? { actorId: p.actorId } : {}),
    ...(p.targetId ? { targetId: p.targetId } : {}),
    ...(p.placeId ? { placeId: p.placeId } : {}),
    ...(p.valence === undefined ? {} : { valence: p.valence }),
    claims: p.claims ?? [],
    norms: p.norms ?? [],
    advice: (p.advice ?? []).map((a, i) => ({ ...a, adviceId: `advice:${source}:${i}` })),
    consequences: [],
    withdrawConsequences: [],
    witnesses: [],
    reports: [],
    provenance: ['voice:actual-world'],
  };
}
export function stepCommunity(c: Community, world: World, until: number, opts: StepOptions = {}): SimEvent[] {
  const runtime = c.runtime;
  if (!runtime) throw new Error('Voice public run was not mounted.');
  runtime.fidelity =
    opts.clock === 'daily' ? { mode: 'daily', dayMs: 86400000, anchor: 0 } : { mode: 'fine' };
  const emitted: SimEvent[] = [];
  const eventsStart = runtime.events.length;
  const stepAt = (target: number) => {
    const at = runtime.ingressAt();
    const inputs: Input[] = [];
    refresh(c);
    const receivedTown = (world as World & { fork(): World }).fork();
    const heard = structuredClone(c.heard);
    const scarcity = { ...c.scarcity };
    const calendarDay = { ...c.calendarDay };
    const offerBooks = structuredClone(c.offerBooks);
    for (const p of c.people) {
      const day = Math.floor(at / 86400000);
      if (calendarDay[p.id] !== day) {
        receivedTown.onDay?.(p.id, day);
        inputs.push(...calendarInputs(runtime, receivedTown, p, day, at));
        calendarDay[p.id] = day;
      }

      const seen = receivedTown.perceptsFor(p, c.hostAt, p.now);
      if (seen.length)
        inputs.push(
          runtime.input('observation.received', at, {
            person: p.id,
            evidenceId: `town-observed:${p.id}:${at}`,
            percepts: seen.map((item, index) => percept(item, index, `${p.id}:${at}`)),
          }),
        );
      const suggestions = opts.suggestions?.[p.id];
      const list: readonly Suggestion[] = suggestions
        ? Array.isArray(suggestions)
          ? suggestions
          : [suggestions as Suggestion]
        : [];
      for (const suggestion of list) {
        const key = JSON.stringify(suggestion);
        if (heard[p.id]?.key === key) continue;
        const previous = heard[p.id];
        if (previous)
          inputs.push(
            runtime.input('advice.withdrawn', at, {
              person: p.id,
              voiceId: suggestion.voiceId,
              adviceId: previous.adviceId,
            }),
          );
        const adviceId = `voice-standing:${p.id}:${at}`;
        inputs.push(
          runtime.input('suggestion.received', at, {
            person: p.id,
            received: {
              kind: 'ordinary',
              suggestion: {
                ...suggestion,
                ...(suggestion.since === undefined
                  ? {}
                  : { since: Math.round(suggestion.since * MINUTE_MS) }),
                adviceId,
              },
            },
          }),
        );
        heard[p.id] = { key, adviceId };
      }
      if (!list.length && heard[p.id]) {
        inputs.push(
          runtime.input('advice.withdrawn', at, {
            person: p.id,
            voiceId: 'you',
            adviceId: heard[p.id]!.adviceId,
          }),
        );
        delete heard[p.id];
      }
      const actualScarcity = receivedTown.scarcityFor?.(p) ?? 0;
      if (scarcity[p.id] !== actualScarcity) {
        inputs.push(
          runtime.input('context.received', at, {
            person: p.id,
            evidenceId: `scarcity:${p.id}:${at}`,
            context: { kind: 'scarcity', value: actualScarcity },
          }),
        );
        scarcity[p.id] = actualScarcity;
      }

      if (c.interrupted[p.id] || !p.activity) {
        const authored = receivedTown.affordancesFor(p);
        offerBooks[p.id] = structuredClone(authored);
        const requests = runtime.offerInputs(
          p.id,
          authored.map((a) => publicOffer(p, a)),
          at,
        );
        if (p.activity)
          for (const request of requests)
            if (request.kind === 'decision.requested') request.payload.treatment = 'reconsider';
        inputs.push(...requests);
      }
    }
    // Admit ingress before publishing its drained queues. All subsequent town receipts stage their own fork.
    if (inputs.length) runtime.receive(at, inputs);
    (world as World & { accept(other: World): void }).accept(receivedTown);
    c.heard = heard;
    c.scarcity = scarcity;
    c.calendarDay = calendarDay;
    c.offerBooks = offerBooks;
    c.interrupted = {};

    runtime.advance(Math.max(target, at), {
      stage() {
        refresh(c);
        // Stage receipts and world bookkeeping together. Actor readings are read-only inputs to the town.
        const transactionWorld = (world as World & { fork(): World }).fork();
        const stagedEvents: SimEvent[] = [];
        const acceptedOffers = structuredClone(c.acceptedOffers);
        const conversations: {
          at: number;
          payload: import('@adam0white/human-framework').Payloads['conversation.requested'];
        }[] = [];
        return {
          action(request, work) {
            const p = c.people.find((p) => p.id === request.person)!;
            if (request.stage === 'start') {
              const source = c.offerBooks[p.id]?.find((a) => a.id === request.offerId);
              if (!source) throw new Error('Voice lost its offered host action metadata.');
              acceptedOffers[request.activityId] = structuredClone(source);
              stagedEvents.push({
                at: request.boundaryAt / MINUTE_MS,
                personId: p.id,
                kind: 'begin',
                detail: '',
                decisionId: runtime.decisions.get(p.id)?.id,
                affordanceId: request.offerId,
                action: runtime.offers.get(p.id)?.offers.find((a) => a.id === request.offerId)?.actionId,
              });
              return {
                requestId: request.id,
                requestHash: request.requestHash,
                person: p.id,
                activityId: request.activityId,
                stage: request.stage,
                worldRevision: request.worldRevision,
                disposition: 'accepted',
                observations: [],
              };
            }
            if (!work) throw new Error('Voice completion has no accepted action.');
            // The town sees the actual boundary clock on a detached reading, never an edited actor.
            const who = { ...p, now: request.boundaryAt / MINUTE_MS };
            owners.set(who, c);
            registerReadout(who, importReadout(p), {});
            const act = activity(c, p.id)!;
            delete acceptedOffers[request.activityId];
            const outcome = transactionWorld.resolve(
              who,
              act,
              request.stage === 'finish' ? 'ended' : 'interrupted',
            );
            const observations = [
              ...c.people.flatMap((observer) => {
                const due = transactionWorld.perceptsFor(observer, c.hostAt, who.now);
                return due.length
                  ? [
                      {
                        person: observer.id,
                        percepts: due.map((item, index) =>
                          percept(item, index, `${request.id}:${observer.id}`),
                        ),
                      },
                    ]
                  : [];
              }),
              ...(outcome.percepts?.length
                ? [
                    {
                      person: p.id,
                      percepts: outcome.percepts.map((item, index) =>
                        percept(item, index, `${request.id}:outcome`),
                      ),
                    },
                  ]
                : []),
            ];
            const needs = outcome.needs ?? {};
            const { food, water, sleep: _sleep, rest: _rest, relief: _relief, ...psychological } = needs;
            stagedEvents.push({
              at: who.now,
              personId: p.id,
              kind: 'finish',
              detail: outcome.summary ?? '',
              decisionId: work.decision?.id,
              affordanceId: request.offerId,
              action: act.action,
              status: outcome.status,
            });
            if (outcome.status === 'completed' && ['call', 'talk', 'tea'].includes(act.action))
              for (const id of act.affordance.with ?? []) {
                const other = c.people.find((p) => p.id === id);
                if (!other) continue;
                for (const [speaker, listener] of [
                  [p, other],
                  [other, p],
                ]) {
                  const ctx = transactionWorld.converse?.(speaker!, listener!, act);
                  if (ctx === false) continue;
                  conversations.push({
                    at: request.boundaryAt,
                    payload: {
                      speaker: speaker!.id,
                      listener: listener!.id,
                      topicIds: ctx?.topics ?? [listener!.id],
                      maxClaims: 3,
                      temptations: [],
                      loyalWarning: false,
                    },
                  });
                }
              }
            return {
              requestId: request.id,
              requestHash: request.requestHash,
              person: p.id,
              activityId: request.activityId,
              stage: request.stage,
              worldRevision: request.worldRevision,
              disposition:
                outcome.status === 'interrupted'
                  ? 'interrupted'
                  : outcome.status === 'failed'
                    ? 'failed'
                    : 'completed',
              outcome: {
                activityId: request.activityId,
                offerId: request.offerId,
                actionId: act.action,
                start: work.start,
                end: request.boundaryAt,
                status: outcome.status,
                evidenceId: `town-outcome:${request.id}`,
                actual: {
                  psychological,
                  consumed: {
                    ...(food === undefined ? {} : { food }),
                    ...(water === undefined ? {} : { water }),
                  },
                  exposures: (outcome.exposures ?? []).map((e, i) => ({
                    agent: e.kind,
                    amount: 1,
                    exposureId: `exposure:${request.id}:${i}`,
                  })),
                  observedProgress: [],
                  material: outcome.material ?? 0,
                  ...(act.affordance.skill
                    ? { practice: { quality: outcome.status === 'completed' ? 1 : 0.4 } }
                    : {}),
                },
                summary: outcome.summary,
                fulfills: act.affordance.fulfills ?? [],
                advances: [],
              },
              observations,
            } as never;
          },
          communication(request) {
            return {
              requestId: request.id,
              requestHash: request.requestHash,
              worldRevision: request.worldRevision,
              speaker: request.speaker,
              emittedItemIds: request.items.map((i) => i.id),
              received: request.recipients.map((id) => ({
                recipient: id,
                evidenceId: `received:${request.id}:${id}`,
                attention: c.people.some((p) => p.id === id && p.life.alive && !p.body.asleep) ? 1 : 0,
                itemIds: request.items.map((i) => i.id),
              })),
            };
          },
          commit() {
            (world as World & { accept(other: World): void }).accept(transactionWorld);
            c.acceptedOffers = acceptedOffers;
            emitted.push(...stagedEvents);
            return conversations.map((c) =>
              runtime.input('conversation.requested', Math.max(c.at, runtime.ingressAt()), c.payload),
            );
          },
          // The detached town publishes only after the complete public receipt batch is consumed.
        };
      },
    });
    c.hostAt = runtime.at / MINUTE_MS;
    refresh(c);
  };
  // Offer host choices after real completion. The engine's scheduler owns all intervening faculty events.
  let iterations = 0;
  while (runtime.at < Math.round(until * MINUTE_MS)) {
    if (++iterations > 4096)
      throw new Error(
        `Voice host did not progress: ${JSON.stringify({ at: runtime.at, until, active: [...runtime.active].map(([id, a]) => [id, a.end, a.offer.id]), pending: runtime.pending })}`,
      );
    const nextFinish = Math.min(...[...runtime.active.values()].map((a) => a.end));
    const target = Math.min(
      Math.round(until * MINUTE_MS),
      (Math.floor(runtime.at / 86400000) + 1) * 86400000,
      Number.isFinite(nextFinish) ? nextFinish : runtime.at + 15 * MINUTE_MS,
    );
    stepAt(target);
  }
  for (const event of runtime.events.slice(eventsStart))
    if (event.person && event.data.kind === 'decision')
      emitted.push({
        at: event.at / MINUTE_MS,
        personId: event.person,
        kind: 'decide',
        detail: event.data.decision.intention,
        decisionId: event.data.decision.id,
        review: event.data.decision.review,
      });
  return emitted;
}

import { readBody as importReadout } from './hf4-model.ts';
export function interruptPerson(c: Community, p: VoicePerson, _at: number, reason: string) {
  c.interrupted[p.id] = reason;
}
export const nextEventAt = (_c: Community, p: VoicePerson) => p.activity?.endsAt ?? p.now + 1;
export function standingHeard(
  _c: Community,
  p: VoicePerson,
  s: Suggestion,
  offers: readonly Affordance[],
  _at: number,
) {
  return !p.body.asleep && offers.some((a) => a.id === s.affordanceId);
}
export function runSilent(c: Community, world: World, days: number, opts: StepOptions = {}) {
  return stepCommunity(c, world, c.hostAt + days * 1440, { ...opts, clock: 'daily' });
}
export function forecast(
  p: VoicePerson,
  offers: readonly Affordance[],
  suggestion?: Suggestion,
): DecisionRecord | undefined {
  const c = owners.get(p);
  if (!c?.runtime) return;
  const runtime = c.runtime;
  if (runtime.active.has(p.id)) return undefined;
  const at = runtime.ingressAt();
  const revision = (runtime.offers.get(p.id)?.revision ?? 0) + 1;
  let ordinal = 0;
  const hypothetical = <K extends keyof import('@adam0white/human-framework').Payloads>(
    kind: K,
    payload: import('@adam0white/human-framework').Payloads[K],
  ): Input<K> =>
    ({
      id: `voice-preview:${p.id}:${at}:${revision}:${ordinal++}`,
      at,
      source: { type: 'host', id: 'voice' },
      kind,
      payload,
    }) as Input<K>;
  const inputs: Input[] = [
    hypothetical('offers.received', { person: p.id, revision, offers: offers.map((a) => publicOffer(p, a)) }),
    hypothetical('decision.requested', {
      person: p.id,
      offerRevision: revision,
      reason: 'town forecast',
      treatment: 'ordinary',
    }),
  ];
  if (suggestion)
    inputs.unshift(
      hypothetical('suggestion.received', {
        person: p.id,
        received: { kind: 'ordinary', suggestion: { ...suggestion, adviceId: `forecast:${p.id}:${at}` } },
      }),
    );
  const result = runtime.preview({ perspective: { kind: 'host' }, person: p.id, until: at, inputs });
  const decision = result.possibilities.find(
    (e) => 'access' in e && e.access === 'host' && e.data.kind === 'decision',
  );
  return decision && decision.data.kind === 'decision'
    ? displayDecision(minutes(decision.data.decision))
    : undefined;
}
export function preview(
  p: VoicePerson,
  offers: readonly Affordance[],
  s: Suggestion,
  _opts: unknown,
): SuggestionResolution {
  return (
    forecast(p, offers, s)?.suggestion ??
    ({
      voiceId: s.voiceId,
      verdict: 'deferred',
      says: 'The outcome is not known yet.',
      reason: 'conditional host boundary',
    } as unknown as SuggestionResolution)
  );
}
export const decide = (
  p: VoicePerson,
  offers: readonly Affordance[],
  opts: { suggestion?: Suggestion; scarcity?: number },
) => forecast(p, offers, opts.suggestion);

export function successChance(p: VoicePerson, skill: string, difficulty: number, _capacity: number) {
  const c = owners.get(p);
  if (!c?.runtime) throw new Error('Voice requires a mounted skill inspection.');
  return c.runtime.inspect({
    perspective: { kind: 'host' },
    people: [p.id],
    select: [],
    skill: { person: p.id, skill, difficulty },
  }).skill!.successChance;
}

/** The host supplies dates and opportunities. Only HF commits, keeps, excuses or retires a duty. */
function calendarInputs(runtime: VoiceRun, world: World, p: VoicePerson, day: number, at: number): Input[] {
  const town = world as World & {
    calendar: (day: number) => {
      fajr: number;
      sunrise: number;
      dhuhr: number;
      asr: number;
      maghrib: number;
      isha: number;
    };
    ramadan?: { firstDay: number; days: number };
  };
  const times = town.calendar(day),
    tomorrow = town.calendar(day + 1),
    base = day * 1440;
  const inputs: Input[] = [];
  const commit = (
    commitment: import('@adam0white/human-framework').Payloads['agenda.requested']['request'] & {
      type: 'commit';
    },
  ) => inputs.push(runtime.input('agenda.requested', at, { person: p.id, request: commitment }));
  const add = (
    c: import('@adam0white/human-framework').PersonAuthoring['state']['agenda']['commitments'][number],
  ) => {
    if (c.until > at && !p.agenda.commitments.some((existing) => existing.id === c.id))
      commit({ type: 'commit', commitment: c });
  };
  const names = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const starts = [times.fajr, times.dhuhr, times.asr, times.maghrib, times.isha],
    ends = [times.sunrise, times.asr, times.maghrib, times.isha, 1440 + tomorrow.fajr];
  if (
    p.conscience.norms.some((n) => n.normId === 'salah' && ['obligatory', 'recommended'].includes(n.standing))
  )
    for (let i = 0; i < names.length; i++)
      add({
        id: `salah:${day}:${names[i]!.toLowerCase()}`,
        kind: 'worship',
        actions: ['pray'],
        normId: 'salah',
        from: Math.round((base + starts[i]!) * MINUTE_MS),
        until: Math.round((base + ends[i]!) * MINUTE_MS),
        importance: 0.8,
        label: names[i]!,
        chain: `salah:${names[i]!.toLowerCase()}`,
      });
  const first = town.ramadan?.firstDay ?? 1,
    eid = first + (town.ramadan?.days ?? 30);
  if (day >= first && day < eid) {
    add({
      id: `sawm:${day}:fast`,
      kind: 'abstain',
      actions: [],
      violatedBy: ['eat', 'drink', 'tea', ...(p.id === 'halil' ? ['smoke'] : [])],
      from: Math.round((base + times.fajr) * MINUTE_MS),
      until: Math.round((base + times.maghrib) * MINUTE_MS),
      normId: 'sawm',
      importance: 0.9,
      exemptWhen: ['illness', 'travel'],
      chain: 'sawm:ramadan',
      label: 'fast',
    });
    for (const [label, from, until] of [
      ['suhoor', times.fajr - 60, times.fajr],
      ['iftar', times.maghrib, times.maghrib + 60],
    ] as const)
      add({
        id: `meal:${day}:${label}`,
        kind: 'appointment',
        actions: ['eat', 'drink'],
        from: Math.round((base + from) * MINUTE_MS),
        until: Math.round((base + until) * MINUTE_MS),
        importance: 0.7,
        label,
      });
  }
  inputs.push(
    runtime.input('agenda.requested', at, { person: p.id, request: { type: 'retire-paid-make-ups' } }),
  );
  let prayers = 0,
    fastDay = Math.max(day + 1, eid + 1);
  const reserved = new Set(
    p.agenda.commitments
      .filter((c) => c.makeUpOf && c.kind === 'abstain' && c.status === 'pending')
      .map((c) => Math.floor(c.from / 1440)),
  );
  for (const owed of p.agenda.owed ?? []) {
    if (
      owed.scheduledAs &&
      p.agenda.commitments.some((c) => c.id === owed.scheduledAs && c.status === 'pending')
    )
      continue;
    let from: number, until: number;
    if (owed.kind === 'worship') {
      if (prayers++ >= 2) continue;
      from = base + times.dhuhr + 15;
      until = base + times.asr - 15;
      if (until * MINUTE_MS <= at) continue;
    } else if (owed.kind === 'abstain') {
      while (reserved.has(fastDay)) fastDay++;
      const t = town.calendar(fastDay);
      from = fastDay * 1440 + t.fajr;
      until = fastDay * 1440 + t.maghrib;
      reserved.add(fastDay++);
    } else continue;
    inputs.push(
      runtime.input('agenda.requested', at, {
        person: p.id,
        request: {
          type: 'make-up',
          commitmentId: owed.ofId,
          window: { start: Math.round(from * MINUTE_MS), end: Math.round(until * MINUTE_MS) },
        },
      }),
    );
  }
  return inputs;
}
