/** Well's host bridge. DTOs contain public inspection readings and host receipts only.
 * Actor decisions, learning, body and trust remain owned by the Run. Host geometry uses minutes.
 */
import {
  createPerson,
  createRun,
  type DeepReadonly,
  exportRun,
  type Input,
  inspect,
  type Offer,
  type Payloads,
  type PerceptData,
  type PersonAuthoring,
  type PersonView,
  type PreviewResult,
  preview,
  type Result,
  type Run,
  restoreRun,
  step,
  type VisibleEvent,
} from '@adam0white/human-framework';
import { MINUTE, wellRunSpec } from './human-cast.ts';
import { type ColonyHostWorld, firstName } from './human-world.ts';
import type { VillagerSpec } from './world-types.ts';

type HostPart = Extract<PersonView, { kind: 'host' }>['parts'][number];
export type Reading<K extends HostPart['select']> = Extract<HostPart, { select: K }>['value'];
type EventData = Extract<VisibleEvent, { access: 'host' }>['data'];
export type DecisionRecord = Omit<
  Extract<EventData, { kind: 'decision' }>['decision'],
  'suggestion' | 'suggestions'
> & { narration: string; suggestion?: SuggestionResolution; suggestions?: SuggestionResolution[] };
export type Considered = DecisionRecord['considered'][number];
export type Term = Considered['terms'][number];
export type Suggestion = Omit<
  Extract<Payloads['suggestion.received']['received'], { kind: 'ordinary' }>['suggestion'],
  'adviceId'
> & { adviceId?: string };
export type SuggestionResolution = Extract<EventData, { kind: 'suggestion-resolved' }>['resolution'] & {
  says: string;
};
export type Affordance = {
  id: string;
  action: string;
  label: string;
  duration: number;
  effort?: number;
  focus?: number;
  mode?: 'sleep' | 'awake';
  requires?: Offer['demands']['requires'];
  skill?: { id: string; difficulty: number };
  advertises: Offer['expected']['needs'];
  risk?: Offer['expected']['risk'];
  material?: number;
  tags?: string[];
  norms?: Offer['norms'];
  placeId?: string;
  targetId?: string;
  fulfills?: string[];
  advances?: string[];
  diminishes?: string[];
  with?: string[];
  alongside?: string[];
  jointId?: string;
};
export type Activity = {
  id: string;
  action: string;
  affordanceId: string;
  affordance: Affordance;
  startedAt: number;
  endsAt: number;
  targetId?: string;
  protest?: boolean;
  suggestion?: SuggestionResolution;
};
export type Outcome = {
  affordanceId: string;
  action: string;
  status: 'completed' | 'failed' | 'interrupted';
  at: number;
  targetId?: string;
  quality?: number;
  needs?: Offer['expected']['needs'];
  injury?: NonNullable<Extract<Payloads['body.received']['receipt'], { type: 'injured' }>['injury']>;
  summary?: string;
  percepts?: Percept[];
};
export type Percept = Omit<
  PerceptData,
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
  claims?: readonly { prop: string; value: boolean; confidence: number }[];
  norms?: PerceptData['norms'];
};
export type BeginOptions = { promise?: unknown };
export type JointProposal = { proposerId: string; id: string; [key: string]: unknown };
export type Person = {
  id: string;
  name: string;
  now: number;
  body: Reading<'body'>['state'];
  readout: Reading<'body'>['readout'];
  affect: Reading<'affect'>;
  agenda: Reading<'agenda'>;
  relationships: Reading<'relationships'>;
  skills: Reading<'skills'>;
  activity: Activity | null;
  trace: DecisionRecord[];
  memory: { episodes: { id: string; summary: string }[] };
  lexicon: { plainEnglish: true };
};
export type SimEvent = {
  kind: 'finish' | 'decide';
  personId: string;
  decisionId?: string;
  action?: string;
  status?: Outcome['status'];
};
export type Community = {
  run: Run;
  people: Person[];
  perceivedUntil: Record<string, number>;
  seq: number;
  revision: number;
  at: number;
  advice: Record<string, string>;
  offers: Record<string, Affordance[]>;
  offerHistory: Record<string, Affordance[]>;
  active: Record<string, Activity>;
  queued: Input[];
  eventCursor?: string;
  pending: ReturnType<typeof step> extends Result<infer T> ? T : never | null;
};
export function need<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.path}: ${r.error.message}`);
  return r.value;
}
export function input<K extends keyof Payloads>(
  c: Community,
  kind: K,
  payload: Payloads[K],
  at: number,
  source: Input['source'] = { type: 'host', id: 'well' },
): Input<K> {
  return JSON.parse(JSON.stringify({ id: `well:${++c.seq}`, at, source, kind, payload })) as Input<K>;
}
export function createColonyRun(
  seed: number,
  villagers: readonly VillagerSpec[],
  authorings: PersonAuthoring[],
): Community {
  const run = need(createRun(wellRunSpec(seed, villagers)));
  for (const a of authorings) need(createPerson(run, a));
  const c = {
    run,
    people: [],
    perceivedUntil: {},
    seq: 0,
    revision: 0,
    at: wellRunSpec(seed, villagers).start,
    offers: {},
    offerHistory: {},
    advice: {},
    active: {},
    queued: [],
    pending: null,
  } as unknown as Community;
  refresh(
    c,
    authorings.map((a) => a.id),
  );
  return c;
}
export function refresh(c: Community, ids = c.people.map((p) => p.id)): void {
  const result = need(
    inspect(c.run, {
      perspective: { kind: 'host' },
      people: ids,
      select: ['summary', 'body', 'affect', 'agenda', 'relationships', 'skills', 'events'],
      ...(c.eventCursor ? { afterEvent: c.eventCursor } : {}),
    }),
  );
  c.people = result.people.map((v) => {
    if (v.kind !== 'host') throw new Error('Expected host readings');
    function part<K extends HostPart['select']>(key: K): Reading<K> {
      const p = v.parts.find((p) => p.select === key);
      if (!p) throw new Error(`Missing ${key}`);
      return p.value as Reading<K>;
    }
    const old = c.people.find((p) => p.id === v.id);
    const summary = part('summary');
    const body = part('body');
    const agenda = structuredClone(part('agenda'));
    for (const x of agenda.commitments) {
      x.from /= MINUTE;
      x.until /= MINUTE;
    }
    // Retained public records do not change. Copy the arrays and replace only a record
    // receiving a later suggestion result, rather than deep-copying all past history.
    const trace: DecisionRecord[] = old ? [...old.trace] : [];
    const episodes: { id: string; summary: string }[] = old ? [...old.memory.episodes] : [];
    for (const e of part('events')) {
      if (e.data.kind === 'decision') {
        const decision = e.data.decision;
        if (!trace.some((r) => r.id === decision.id))
          trace.push({
            ...e.data.decision,
            suggestions: e.data.decision.suggestions?.map((r) => ({
              ...r,
              says: '',
            })),
            at: e.at / MINUTE,
            narration: e.narration.map((n) => n.text).join(' '),
            suggestion: e.data.decision.suggestion ? { ...e.data.decision.suggestion, says: '' } : undefined,
          } as DecisionRecord);
      }
      if (e.data.kind === 'suggestion-resolved') {
        const data = e.data;
        const index = trace.findIndex((r) => r.id === data.decisionId);
        const record = trace[index];
        if (record) {
          const resolved = { ...data.resolution, says: e.narration.map((n) => n.text).join(' ') };
          trace[index] = {
            ...record,
            suggestion: record.suggestion?.voiceId === resolved.voiceId ? resolved : record.suggestion,
            suggestions: record.suggestions?.map((r) => (r.voiceId === resolved.voiceId ? resolved : r)),
          };
        }
      }
      if (e.data.kind === 'observation-attended' && e.data.episodeId && e.data.summary) {
        const episodeId = e.data.episodeId;
        if (!episodes.some((x) => x.id === episodeId))
          episodes.push({ id: episodeId, summary: e.data.summary });
      }
    }
    return {
      id: v.id,
      name: summary.name,
      now: result.at / MINUTE,
      body: body.state,
      readout: body.readout,
      affect: part('affect'),
      agenda,
      relationships: part('relationships'),
      skills: part('skills'),
      activity: summary.activity ? (c.active[v.id] ?? old?.activity ?? null) : null,
      trace,
      memory: { episodes },
      lexicon: { plainEnglish: true },
    };
  });
}
export function skillLevel(p: Person, id: string): number {
  return p.skills.find((s) => s.id === id)?.competence ?? 0;
}
export function readPerson(p: Person): { body: Person['readout'] } {
  return { body: p.readout };
}
export function voiceOf(p: Person, id: string): Reading<'relationships'>['voices'][number] | undefined {
  return p.relationships.voices.find((v) => v.voiceId === id);
}
export function readAffect(p: Person): {
  dominant: Reading<'affect'>['emotions'][number][];
  valence: number;
} {
  return {
    dominant: [...p.affect.emotions].sort((a, b) => b.intensity - a.intensity),
    valence: p.affect.mood.valence,
  };
}
export function interruptPerson(c: Community, p: Person, _at: number, reason: string): void {
  c.queued.push(
    input(
      c,
      'decision.requested',
      { person: p.id, reason, treatment: 'reconsider', offerRevision: c.revision },
      Math.max(c.at + 1, Math.round(p.now * MINUTE) + 1),
    ),
  );
}
export function noteVoicePromise(
  c: Community,
  p: Person,
  voiceId: string,
  promise: { kept: boolean; at: number; action?: string },
): void {
  c.queued.push(
    input(
      c,
      'voice.promise-received',
      {
        person: p.id,
        voiceId,
        evidenceId: `promise:${c.seq + 1}`,
        promise: { kept: promise.kept, action: promise.action },
      },
      c.at + 1,
    ),
  );
}
export function consume(c: Community, p: Person, received: { food?: number; water?: number }): void {
  c.queued.push(
    input(
      c,
      'body.received',
      {
        person: p.id,
        evidenceId: `meal:${c.seq + 1}`,
        receipt: { type: 'consumed', actionReceipt: `well-meal:${c.seq + 1}`, received },
      },
      c.at + 1,
    ),
  );
}
export function toOffer(p: Person, a: Affordance): Offer {
  return {
    id: a.id,
    actionId: a.action,
    label: a.label,
    person: p.id,
    durationMs: Math.round(a.duration * MINUTE),
    target: a.targetId,
    place: a.placeId,
    participants: a.with ?? [],
    alongside: a.alongside ?? [],
    demands: {
      effort: a.effort ?? 0,
      focus: a.focus ?? 0,
      mode: a.mode ?? 'awake',
      requires: a.requires ?? {},
      ...(a.skill ? { skill: { ...a.skill, domain: 'motor' as const } } : {}),
    },
    tags: a.tags ?? [],
    norms: a.norms ?? [],
    expected: {
      needs: a.advertises,
      risk: a.risk,
      material: a.material,
      followedBy: [],
      provenance: ['well:offer'],
    },
    fulfills: a.fulfills ?? [],
    advances: a.advances ?? [],
    diminishes: a.diminishes ?? [],
    jointId: a.jointId,
  };
}
function percept(c: Community, p: Percept): PerceptData {
  const { at, ...rest } = p;
  return {
    ...rest,
    id: `percept:${++c.seq}`,
    occurredAt: Math.round(p.at * MINUTE),
    claims: p.claims ?? [],
    norms: p.norms ?? [],
    advice: [],
    consequences: [],
    withdrawConsequences: [],
    witnesses: [],
    reports: [],
    provenance: ['well'],
  };
}
export function stepColony(
  c: Community,
  w: ColonyHostWorld,
  minute: number,
  suggestions: Record<string, Suggestion>,
): SimEvent[] {
  const until = Math.round(minute * MINUTE);
  const at = Math.max(c.at + 1, until);
  c.revision++;
  const inputs: Input[] = c.queued.splice(0).map(
    (x) =>
      ({
        ...x,
        at,
        payload: x.kind === 'decision.requested' ? { ...x.payload, offerRevision: c.revision } : x.payload,
      }) as Input,
  );
  for (const p of c.people) {
    const actor = { ...p, now: minute };
    const offers = w.affordancesFor(actor);
    // A helper gets an independent choice; the lead's offer alone never counts as consent.
    for (const [leadId, lead] of Object.entries(c.active)) {
      if (
        lead.action !== 'raise-beam' ||
        lead.affordance.jointId ||
        !lead.affordance.with?.includes(p.id) ||
        lead.endsAt - at / MINUTE <= 2
      )
        continue;
      offers.push({
        ...lead.affordance,
        id: `assist:${lead.id}:${p.id}`,
        label: `raise the beam with ${firstName(leadId)}`,
        duration: lead.endsAt - at / MINUTE - 2,
        with: [leadId],
        jointId: lead.id,
      });
    }
    c.offers[p.id] = offers;
    c.offerHistory[`${p.id}:${c.revision}`] = structuredClone(offers);
    inputs.unshift(
      input(
        c,
        'offers.received',
        { person: p.id, revision: c.revision, offers: offers.map((a) => toOffer(actor, a)) },
        at,
      ),
    );
    const percepts = w.perceptsFor(actor, c.perceivedUntil[p.id] ?? 0, minute).map((p) => percept(c, p));
    c.perceivedUntil[p.id] = minute;
    if (percepts.length)
      inputs.push(
        input(c, 'observation.received', { person: p.id, evidenceId: `observed:${c.seq + 1}`, percepts }, at),
      );
    const s = suggestions[p.id];
    const adviceId = s?.adviceId ?? (s ? `order:${p.id}:${s.since}` : undefined);
    if (c.advice[p.id] !== adviceId) {
      const priorAdvice = c.advice[p.id];
      if (priorAdvice)
        inputs.push(
          input(c, 'advice.withdrawn', { person: p.id, voiceId: 'player', adviceId: priorAdvice }, at, {
            type: 'voice',
            id: 'player',
          }),
        );
      if (s && adviceId) {
        inputs.push(
          input(
            c,
            'suggestion.received',
            {
              person: p.id,
              received: {
                kind: 'ordinary',
                suggestion: { ...s, since: Math.round((s.since ?? minute) * MINUTE), adviceId },
              },
            },
            at,
            { type: 'voice', id: 'player' },
          ),
        );
        c.advice[p.id] = adviceId;
      } else delete c.advice[p.id];
    }
    if (!p.activity)
      inputs.push(
        input(
          c,
          'decision.requested',
          { person: p.id, reason: 'world-offers', treatment: 'ordinary', offerRevision: c.revision },
          at,
        ),
      );
  }
  const emitted: SimEvent[] = [];
  let result = need(step(c.run, { until: at, inputs }));
  for (let guard = 0; guard < 2000; guard++) {
    c.at = result.at;
    for (const e of result.events) {
      if (e.data.kind === 'decision') {
        if (!e.person) throw new Error('Well received a decision without a person.');
        emitted.push({ kind: 'decide', personId: e.person, decisionId: e.data.decision.id });
      }
    }
    refresh(c);
    if (result.events.length) c.eventCursor = result.events[result.events.length - 1]?.id;
    if (result.boundary.type === 'until') break;
    const replies: Input[] = [];
    // Resolve a lead before the independently accepted helper at a shared finish.
    const requests = [...result.boundary.requests].sort((a, b) => {
      const helper = (r: typeof a) => r.kind === 'action' && !!c.active[r.person]?.affordance.jointId;
      return Number(helper(a)) - Number(helper(b));
    });
    for (const req of requests) {
      if (req.kind !== 'action') {
        const speaker = w.s.loc[req.speaker];
        const itemIds = req.items.map((item) => item.id);
        const recipients = req.recipients.filter((id) => {
          const target = w.s.loc[id];
          return (
            !!speaker && !!target && Math.abs(speaker.x - target.x) + Math.abs(speaker.y - target.y) <= 1
          );
        });
        replies.push(
          input(
            c,
            'communication.resolved',
            {
              requestId: req.id,
              requestHash: req.requestHash,
              worldRevision: req.worldRevision,
              speaker: req.speaker,
              emittedItemIds: itemIds,
              received: recipients.map((recipient) => ({
                recipient,
                evidenceId: `heard:${req.id}:${recipient}`,
                attention: 1,
                itemIds,
              })),
            },
            req.boundaryAt,
          ),
        );
        continue;
      }
      const p = c.people.find((p) => p.id === req.person);
      if (!p) throw new Error(`Well received an action for unknown person ${req.person}`);
      const a =
        c.offerHistory[`${p.id}:${req.offerRevision}`]?.find((a) => a.id === req.offerId) ??
        c.active[p.id]?.affordance;
      if (!a) throw new Error(`No host offer for ${req.offerId}`);
      let outcome: Payloads['action.resolved']['outcome'];
      let disposition: 'accepted' | 'completed' | 'failed' | 'interrupted' = 'accepted';
      if (req.stage === 'start') {
        const record = p.trace.at(-1);
        if (!record) throw new Error('Well received a start without its public decision.');
        const suggestion = record?.suggestion as SuggestionResolution | undefined;
        const activity: Activity = {
          id: req.activityId,
          action: a.action,
          affordanceId: a.id,
          affordance: a,
          startedAt: req.boundaryAt / MINUTE,
          endsAt: req.boundaryAt / MINUTE + a.duration,
          targetId: a.targetId,
          protest: suggestion?.verdict === 'complied',
          suggestion,
        };
        c.active[p.id] = activity;
        w.beginOptions({ ...p, now: req.boundaryAt / MINUTE }, a, record);
      } else {
        const activity = c.active[p.id];
        if (!activity) throw new Error(`Missing active receipt ${req.activityId}`);
        const o = w.resolve(
          { ...p, now: req.boundaryAt / MINUTE },
          activity,
          req.stage === 'interrupt' ? 'interrupted' : 'ended',
        );
        // HF requires the receipt status to match the boundary stage.
        const status =
          req.stage === 'interrupt'
            ? o.status === 'failed'
              ? 'failed'
              : 'interrupted'
            : o.status === 'completed'
              ? 'completed'
              : 'failed';
        disposition = status;
        const needs = o.needs ?? {};
        const psychological = Object.fromEntries(
          Object.entries(needs).filter(([id]) => !['food', 'water', 'sleep', 'rest', 'relief'].includes(id)),
        );
        outcome = {
          activityId: req.activityId,
          offerId: req.offerId,
          actionId: a.action,
          start: Math.round(activity.startedAt * MINUTE),
          end: req.boundaryAt,
          status,
          evidenceId: `outcome:${req.id}`,
          quality: o.quality,
          summary: o.summary,
          actual: {
            consumed: {
              ...(needs.food !== undefined ? { food: needs.food } : {}),
              ...(needs.water !== undefined ? { water: needs.water } : {}),
              ...(needs.relief !== undefined ? { relief: needs.relief } : {}),
            },
            psychological,
            injury: o.injury,
            exposures: [],
            observedProgress: [],
          },
          fulfills: a.fulfills ?? [],
          advances: a.advances ?? [],
        };
        for (const pc of o.percepts ?? []) w.queue([p.id as never], pc);
        delete c.active[p.id];
        emitted.push({ kind: 'finish', personId: p.id, action: a.action, status });
      }
      replies.push(
        input(
          c,
          'action.resolved',
          {
            requestId: req.id,
            requestHash: req.requestHash,
            person: p.id,
            activityId: req.activityId,
            stage: req.stage,
            worldRevision: req.worldRevision,
            disposition,
            outcome,
            observations: [],
          },
          req.boundaryAt,
        ),
      );
    }
    result = need(step(c.run, { until: at, inputs: replies }));
    if (guard === 1999) throw new Error('Well boundary loop exceeded');
  }
  // Every pending boundary has settled. Current offers and exact accepted active offers
  // suffice for the next boundary; the complete revisions remain in HF's input archive.
  c.offerHistory = Object.fromEntries(
    c.people.map((person) => [`${person.id}:${c.revision}`, c.offers[person.id] ?? []]),
  );
  return emitted;
}
export type ColonyArchive = Pick<
  Community,
  | 'seq'
  | 'revision'
  | 'at'
  | 'advice'
  | 'offers'
  | 'offerHistory'
  | 'active'
  | 'queued'
  | 'perceivedUntil'
  | 'eventCursor'
> & { ids: string[]; run: ReturnType<typeof exportRun> };
export function archive(c: Community): ColonyArchive {
  return {
    ids: c.people.map((p) => p.id),
    run: exportRun(c.run),
    seq: c.seq,
    revision: c.revision,
    at: c.at,
    advice: c.advice,
    offers: c.offers,
    offerHistory: c.offerHistory,
    active: c.active,
    queued: c.queued,
    perceivedUntil: c.perceivedUntil,
    eventCursor: c.eventCursor,
  };
}
export function restoreColony(raw: ReturnType<typeof archive>): Community {
  const c = {
    ...structuredClone(raw),
    run: need(restoreRun(raw.run)),
    people: [],
    pending: null,
  } as unknown as Community;
  delete c.eventCursor;
  refresh(c, raw.ids);
  c.eventCursor = raw.eventCursor;
  return c;
}
export function conditional(
  c: Community,
  p: Person,
  offers: Affordance[],
  suggestion: Suggestion,
): DeepReadonly<PreviewResult> {
  const at = c.at + 1;
  const revision = c.revision + 1;
  return need(
    preview(c.run, {
      perspective: { kind: 'person', observer: p.id },
      person: p.id,
      until: at,
      inputs: [
        input(
          { ...c },
          'offers.received',
          { person: p.id, revision, offers: offers.map((a) => toOffer(p, a)) },
          at,
        ),
        input(
          { ...c, seq: c.seq + 1 },
          'suggestion.received',
          {
            person: p.id,
            received: {
              kind: 'ordinary',
              suggestion: { ...suggestion, adviceId: 'preview-advice', since: at },
            },
          },
          at,
        ),
      ],
    }),
  );
}
