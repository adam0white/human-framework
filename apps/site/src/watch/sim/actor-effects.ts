import {
  type ActorPayload,
  actorEvidence,
  actorHost,
  actorInput,
  actorReport,
  actorSigns,
  actorSkill,
  observeActor,
  type Person,
  reportActor,
  witnessActor,
} from './actor.ts';
import { minuteMs } from './hf4.ts';
export const selfReport = actorReport,
  outwardSigns = actorSigns,
  skillLevel = actorSkill;
export const MINUTES_PER_DAY = 1440,
  MINUTES_PER_YEAR = 365 * 1440;
export function readPerson(p: Person) {
  return { body: p.bodyReading };
}
/** HF4 exposes overall capacity, which now governs the Watch's physical world. */
export function readCapacities(p: Person) {
  return {
    moving: p.bodyReading.capacity,
    manipulation: p.bodyReading.capacity,
    sight: p.bodyReading.capacity,
  };
}
export function hear(
  observer: Person,
  target: string,
  key: string,
  value: number,
  _at: number,
  weight: number,
): void {
  reportActor(
    actorHost(observer),
    observer.id,
    target,
    key as ActorPayload<'person.reported'>['key'],
    value,
    weight,
    target,
  );
}
export function glimpsePerson(observer: Person, target: Person, _at: number, clarity: number): void {
  const s = actorHost(observer);
  actorInput(s, 'person.glimpsed', {
    ...actorEvidence(s, observer.id, 'glimpse'),
    target: target.id,
    signs: actorSigns(target),
    clarity,
  });
}
export function observeAct(
  observer: Person,
  actor: string,
  act: Omit<ActorPayload<'act.witnessed'>['act'], 'tags'> & { at?: number; tags?: readonly string[] },
): void {
  const { at: _at, ...actual } = act;
  witnessActor(actorHost(observer), observer.id, actor, { ...actual, tags: actual.tags ?? [] });
}
export function remember(
  p: Person,
  event: {
    at: number;
    kind: string;
    actorId?: string;
    placeId?: string;
    action?: string;
    valence?: number;
    summary: string;
    tags?: readonly string[];
  },
): void {
  observeActor(actorHost(p), p.id, [
    {
      at: event.at,
      channel: 'outcome',
      kind: event.kind,
      actorId: event.actorId,
      placeId: event.placeId,
      valence: event.valence,
      salience: 0.8,
      summary: event.summary,
    },
  ]);
}
export function injure(
  p: Person,
  injury: Extract<ActorPayload<'body.received'>['receipt'], { type: 'injured' }>['injury'],
): void {
  const s = actorHost(p);
  actorInput(s, 'body.received', {
    ...actorEvidence(s, p.id, 'physical-injury'),
    receipt: { type: 'injured', injury },
  });
}
export function knockDown(p: Person, actual: { reason: string; until?: number }): void {
  const s = actorHost(p);
  actorInput(s, 'body.received', {
    ...actorEvidence(s, p.id, 'physical-fall'),
    receipt: {
      type: 'fallen',
      cause: actual.reason,
      ...(actual.until === undefined ? {} : { observedUntil: minuteMs(actual.until) }),
    },
  });
}
export function tend(p: Person, _injury?: string, quality = 0.5): void {
  const s = actorHost(p);
  for (const injury of p.body.injuries) {
    const e = actorEvidence(s, p.id, 'dressed-wound');
    actorInput(s, 'body.received', {
      ...e,
      receipt: { type: 'treated', injuryId: injury.id, quality, actionReceipt: e.evidenceId },
    });
  }
}
export function promise(
  p: Person,
  data: Omit<Extract<ActorPayload<'agenda.requested'>['request'], { type: 'commit' }>['commitment'], 'id'> & {
    id?: string;
  },
) {
  const s = actorHost(p),
    e = actorEvidence(s, p.id, 'commitment');
  const commitment = {
    ...data,
    id: data.id ?? e.evidenceId,
    from: minuteMs(data.from),
    until: minuteMs(data.until),
  };
  actorInput(s, 'agenda.requested', { person: p.id, request: { type: 'commit', commitment } });
  return commitment;
}
export function releaseCommitment(p: Person, commitmentId: string): void {
  actorInput(actorHost(p), 'agenda.requested', {
    person: p.id,
    request: { type: 'release', commitmentId, authority: 'watch' },
  });
}
export function acquaintance(p: Person, q: Person, familiarity: number): void {
  const s = actorHost(p);
  actorInput(s, 'acquaintance.received', {
    ...actorEvidence(s, p.id, 'acquaintance'),
    target: q.id,
    familiarity,
    known: [],
  });
}
