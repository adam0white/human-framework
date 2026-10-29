/** Physical Watch receipts. These are authored world effects, never predicted actor state. */
import type {
  ActualConsequences,
  DeepReadonly,
  Fidelity,
  Json,
  Offer,
  StepResult,
} from '@adam0white/human-framework';
import { type ActorHost, actorAt, actorInput, actorRuntime, type WatchEvent } from './actor.ts';
import { minuteMs, type WatchWorld } from './hf4.ts';
import { watchPrayerInputs } from './hf4-authoring.ts';

type ActualAction = {
  ordinal: number;
  id: string;
  person: string;
  offer: DeepReadonly<Offer>;
  at: number;
  stage: 'start' | 'finish' | 'interrupt';
  status: 'accepted' | 'rejected' | 'completed' | 'failed' | 'interrupted';
  actual?: ActualConsequences;
  duration?: number;
};
export type PhysicalLedger = {
  actions: ActualAction[];
  care: { available: boolean; completedAt?: number } | null;
  ration?: number;
  count?: number;
  year?: number;
  stints?: Record<string, number>;
  gatherings?: { at: number; people: string[]; basis: string }[];
};
const game = (value: Json): PhysicalLedger => value as unknown as PhysicalLedger;
/** An offered meal is physically present in this village. Only a settled completion consumes it. */
function actualFor(offer: DeepReadonly<Offer>, complete: boolean, ration = 0.6): ActualConsequences {
  const actual: ActualConsequences = { exposures: [], observedProgress: [] };
  if (!complete) return actual;
  if (['eat', 'supper', 'care-ada'].includes(offer.actionId))
    actual.consumed = {
      food: offer.actionId === 'care-ada' ? 0.35 : ration,
      water: offer.actionId === 'care-ada' ? 0.35 : 0.5,
    };
  if (['work', 'mend', 'the fields', 'the harvest', 'sowing', 'craft', 'chores'].includes(offer.actionId))
    actual.psychological = { competence: 0.1, meaning: 0.04 };
  if (offer.actionId === 'rest') actual.psychological = { leisure: 0.1 };
  if (offer.actionId === 'care-ada') actual.psychological = { belonging: 0.2 };
  if (offer.actionId === 'pray') actual.psychological = { meaning: 0.1 };
  if (offer.demands.skill) actual.practice = { quality: 0.7 };
  return actual;
}
function recordActual(ledger: PhysicalLedger, action: Omit<ActualAction, 'ordinal'>): void {
  ledger.count = (ledger.count ?? 0) + 1;
  ledger.actions = [...ledger.actions, { ...action, ordinal: ledger.count }].slice(-64);
  if (
    action.stage === 'finish' &&
    action.status === 'completed' &&
    action.offer.actionId === 'stand the wall'
  ) {
    ledger.stints ??= {};
    const key = `${ledger.year ?? 1}|${action.person}@${action.offer.target ?? action.offer.place ?? 'gate'}`;
    ledger.stints[key] = (ledger.stints[key] ?? 0) + 1;
  }
}
export const receiptWorld: WatchWorld = {
  action(host, request, offer, active) {
    const ledger = game(host.game);
    const evidenceId = `watch:actual:${request.id}`;
    if (request.stage === 'start') {
      const status = offer.actionId === 'care-ada' && !ledger.care?.available ? 'rejected' : 'accepted';
      recordActual(ledger, {
        id: evidenceId,
        person: request.person,
        offer: structuredClone(offer),
        at: request.boundaryAt,
        stage: 'start',
        status,
      });
      return { disposition: status, observations: [] };
    }
    if (!active) throw new Error('Watch completion has no actual accepted start.');
    const status =
      request.stage === 'interrupt'
        ? 'interrupted'
        : offer.actionId === 'care-ada' && !ledger.care?.available
          ? 'failed'
          : 'completed';
    const actual = actualFor(offer, status === 'completed', ledger.ration);
    if (offer.actionId === 'care-ada' && status === 'completed' && ledger.care)
      ledger.care.completedAt = request.boundaryAt;
    recordActual(ledger, {
      id: evidenceId,
      person: request.person,
      offer: structuredClone(offer),
      at: request.boundaryAt,
      stage: request.stage,
      status,
      actual,
      duration: (request.boundaryAt - active.start) / 60_000,
    });
    return {
      disposition: status,
      observations: [],
      outcome: {
        activityId: active.id,
        offerId: offer.id,
        actionId: offer.actionId,
        ...(offer.target ? { target: offer.target } : {}),
        start: active.start,
        end: request.boundaryAt,
        status,
        evidenceId,
        actual,
        fulfills: status === 'completed' ? offer.fulfills : [],
        advances: status === 'completed' ? offer.advances : [],
      },
    };
  },
  communication(host, request) {
    // Host testimony is emitted only when speaker and recipients share this village.
    // A request supplies the actual emitted item identities; no private claim is invented.
    const itemIds = request.items.map((item) => item.id);
    return {
      emittedItemIds: itemIds,
      received: request.recipients
        .filter((recipient) =>
          game(host.game).gatherings?.some(
            (g) =>
              g.at === request.boundaryAt &&
              g.people.includes(request.speaker) &&
              g.people.includes(recipient),
          ),
        )
        .map((recipient) => ({
          recipient,
          evidenceId: `watch:heard:${request.id}:${recipient}`,
          attention: 1,
          itemIds,
        })),
    };
  },
};
export function physicalLedger(s: ActorHost): PhysicalLedger {
  return game(actorRuntime(s).hostState().game);
}
export function captureActorEvents(
  _s: ActorHost,
  result: DeepReadonly<StepResult>,
  actions: readonly ActualAction[],
): WatchEvent[] {
  const byId = new Map(actions.map((a) => [a.id, a]));
  const events: WatchEvent[] = [];
  for (const e of result.events) {
    if (e.data.kind === 'decision' && e.person)
      events.push({
        kind: e.data.decision.suggestion?.verdict === 'commanded' ? 'command' : 'decide',
        personId: e.person,
        at: e.at / 60_000,
        action: e.data.decision.chosenAction ?? undefined,
        affordanceId: e.data.decision.chosenAffordanceId ?? undefined,
        verdict: e.data.decision.suggestion?.verdict,
        review: e.data.decision.review,
        record: structuredClone(e.data.decision) as WatchEvent['record'],
        suggestion: e.data.decision.suggestion,
      });
    if (e.data.kind === 'action-settled') {
      const a = byId.get(`watch:actual:${e.data.requestId}`);
      if (a && a.status !== 'rejected')
        events.push({
          kind: a.stage === 'start' ? 'begin' : 'finish',
          personId: a.person,
          at: a.at / 60_000,
          actionReceipt: a.id,
          ...(a.duration === undefined ? {} : { duration: a.duration }),
          action: a.offer.actionId,
          affordanceId: a.offer.id,
          ...(a.offer.target ? { targetId: a.offer.target } : {}),
          ...(a.stage === 'start' ? {} : { status: a.status as 'completed' | 'failed' | 'interrupted' }),
        });
    }
    if (e.data.kind === 'body-change' && e.person) {
      const kind = e.data.change.kind;
      if (kind === 'died' || kind === 'downed' || kind === 'stood' || kind === 'woke' || kind === 'dozed')
        events.push({
          kind: kind === 'dozed' ? 'doze' : kind === 'woke' ? 'wake' : kind,
          personId: e.person,
          at: e.at / 60_000,
        });
    }
  }
  return events;
}
export function flushActors(
  s: ActorHost,
  until: number,
  milliseconds = false,
  fidelity?: Fidelity,
): WatchEvent[] {
  const runtime = actorRuntime(s);
  const committed: ActualAction[] = [];
  const queued = s.actors.queued;
  const target = Math.max(milliseconds ? until : minuteMs(until), runtime.time(), ...queued.map((i) => i.at));
  const result = runtime.advance(
    target,
    queued,
    {
      ...receiptWorld,
      committed(before, after) {
        const prior = game(before.game).count ?? 0;
        committed.push(...game(after.game).actions.filter((a) => a.ordinal > prior));
      },
    },
    undefined,
    fidelity,
  );
  s.actors.queued = [];
  return captureActorEvents(s, result, committed);
}
/** Creation after the opening uses the public arrival input, at a persisted ingress slot. */
export function arriveActor(
  s: ActorHost,
  person: import('@adam0white/human-framework').PersonAuthoring,
): WatchEvent[] {
  if (s.actors.identities[person.id]) throw new Error(`Duplicate Watch actor ${person.id}.`);
  actorInput(s, 'person.arrived', {
    authored: person,
    arrivalEvidenceId: `watch:arrival:${person.id}:${s.actors.sequence + 1}`,
  });
  const events = flushActors(s, s.minute);
  s.actors.identities[person.id] = structuredClone(person.identity);
  return events;
}
/** Future prayer commitments enter before each crossed midnight; no finite calendar horizon is used. */
export function schedulePrayerDay(s: ActorHost, person: string, day: number, at = actorAt(s)): void {
  if ((s.actors.prayerDay[person] ?? -1) >= day) return;
  for (const input of watchPrayerInputs(person, day)) {
    input.at = at;
    s.actors.queued.push(input);
  }
  s.actors.ingress = Math.max(s.actors.ingress, at);
  s.actors.prayerDay[person] = day;
}
