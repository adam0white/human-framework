/** Watch lifecycle premises and public HF truth queries. No actor faculty is reimplemented here. */
import type { InspectQuery, PersonAuthoring } from '@adam0white/human-framework';
import {
  type ActorHost,
  type Affordance,
  actorAt,
  actorEvidence,
  actorHost,
  actorInput,
  actorRuntime,
  actorSkill,
  interruptActor,
  type Person,
  type PublicDecision,
  publicOffer,
  readActor,
  type Suggestion,
} from './actor.ts';
import { acquaintance } from './actor-effects.ts';
import { flushActors } from './actor-world.ts';
import { FOUNDER_KIN } from './config.ts';
import { minuteMs } from './hf4.ts';
export const MINUTES_PER_YEAR = 365 * 1440;
type HostQuery = Extract<NonNullable<InspectQuery['lifecycle']>, { kind: 'host' }>['query'];
export function lifeValue(s: ActorHost, query: HostQuery): unknown {
  const value = actorRuntime(s).read({
    perspective: { kind: 'host' },
    people: [],
    select: [],
    lifecycle: { kind: 'host', query },
  }).lifecycle;
  if (value?.perspective.kind !== 'host' || !('value' in value))
    throw new Error('No Watch lifecycle reading.');
  return value.value;
}
function sync(s: ActorHost): void {
  const events = flushActors(s, s.minute);
  if ('actorEvents' in s)
    (s as ActorHost & { actorEvents: import('./actor.ts').WatchEvent[] }).actorEvents.push(...events);
}
export const skillLevel = actorSkill;
export function spousesOf(p: Person): string[] {
  return lifeValue(actorHost(p), {
    kind: 'spouses',
    person: p.id,
    at: actorRuntime(actorHost(p)).time(),
  }) as string[];
}
export function attraction(p: Person, q: Person): number {
  return lifeValue(actorHost(p), { kind: 'attraction', a: p.id, b: q.id }) as number;
}
export function courtshipStage(
  p: Person,
  other: string,
  _at?: number,
): 'none' | 'courting' | 'ready' | 'engaged' | 'married' {
  return lifeValue(actorHost(p), {
    kind: 'courtship-stage',
    person: p.id,
    other,
    at: actorRuntime(actorHost(p)).time(),
  }) as ReturnType<typeof courtshipStage>;
}
export function conceptionChance(mother: Person, father: Person, days: number): number {
  return lifeValue(actorHost(mother), {
    kind: 'conception-chance',
    mother: mother.id,
    father: father.id,
    durationMs: minuteMs(days * 1440),
  }) as number;
}
export function instructionFrom(p: Person, skill: string) {
  return { teacherId: p.id, level: actorSkill(p, skill) };
}
export const acquaintPerson = (p: Person, q: Person, familiarity: number, _at?: number) =>
  acquaintance(p, q, familiarity);
export function meet(p: Person, id: string, groups: readonly string[]): void {
  const s = actorHost(p);
  actorInput(s, 'groups.received', {
    ...actorEvidence(s, p.id, 'meet'),
    self: ['village'],
    others: [{ person: id, groups }],
  });
}
export function supportVoice(p: Person, voiceId: string): void {
  const s = actorHost(p),
    e = actorEvidence(s, p.id, 'support');
  actorInput(s, 'voice.evidence-received', {
    ...e,
    voiceId,
    evidence: {
      id: e.evidenceId,
      occurredAt: actorAt(s),
      action: 'talk',
      kind: 'support',
      effect: 'acknowledged',
    },
  });
}
export function gestureVoiceTrust(p: Person, voiceId: string, _delta: number, _at?: unknown): void {
  supportVoice(p, voiceId);
}
export function die(p: Person): void {
  const s = actorHost(p),
    e = actorEvidence(s, p.id, 'death');
  actorInput(s, 'lifecycle.received', {
    type: 'death',
    person: { kind: 'actor', id: p.id },
    basis: {
      evidence: { kind: 'evidence', id: e.evidenceId },
      worldRevision: actorRuntime(s).worldRevision(),
    },
  });
  sync(s);
}
export function tellDeath(_community: unknown, p: Person, _at: number): void {
  const s = actorHost(p);
  for (const id of Object.keys(s.actors.identities))
    if (id !== p.id)
      actorInput(s, 'death.heard', {
        ...actorEvidence(s, id, 'death-news'),
        deceased: p.id,
        reporter: 'keeper',
      });
}
export type MarriageCustom = { id: string };
export const GENERIC_CUSTOM: MarriageCustom = { id: 'watch-village' };
type HostFamily = ActorHost & { cast: Record<string, { parents?: string[] }> };
/** The host certifies only this authored world's known parent graph, at the actual query time. */
export function kinScope(s: ActorHost, a: string, b: string, defer = false): string {
  sync(s);
  const at = actorAt(s),
    sequence = ++s.actors.sequence,
    scopeId = `watch:kin-scope:${[a, b].sort().join(':')}`;
  const cast = (s as HostFamily).cast;
  const known: Extract<
    import('./actor.ts').ActorPayload<'lifecycle.received'>,
    { type: 'kin-premise' }
  >['premises'][number][] = Object.entries(cast ?? {}).flatMap(([child, v]) =>
    (v.parents ?? FOUNDER_KIN.find((k) => k.id === child)?.parents ?? []).flatMap((parent) => [
      {
        id: `watch:known-kin:${child}:${parent}:parent`,
        from: { kind: 'entity' as const, id: child },
        to: { kind: 'entity' as const, id: parent },
        role: 'parent' as const,
        basis: { kind: 'evidence' as const, id: `watch:host-parent:${child}:${parent}` },
      },
      {
        id: `watch:known-kin:${parent}:${child}:child`,
        from: { kind: 'entity' as const, id: parent },
        to: { kind: 'entity' as const, id: child },
        role: 'child' as const,
        basis: { kind: 'evidence' as const, id: `watch:host-parent:${child}:${parent}` },
      },
    ]),
  );
  known.push(
    ...FOUNDER_KIN.flatMap((kin) =>
      kin.guardian
        ? [
            [kin.id, kin.guardian],
            [kin.guardian, kin.id],
          ].map(([from, to]) => ({
            id: `watch:known-kin:${from}:${to}:sibling`,
            from: { kind: 'entity' as const, id: from as string },
            to: { kind: 'entity' as const, id: to as string },
            role: 'sibling' as const,
            basis: { kind: 'evidence' as const, id: `watch:host-siblings:${kin.id}:${kin.guardian}` },
          }))
        : [],
    ),
  );
  const premises = known.filter((p) => !s.actors.kinFacts[p.id]);
  const revision = s.actors.kinRevision + (premises.length ? 1 : 0);
  actorInput(
    s,
    'lifecycle.received',
    {
      type: 'kin-premise',
      premises,
      scope: {
        id: scopeId,
        people: [
          { kind: 'entity', id: a },
          { kind: 'entity', id: b },
        ],
        at,
        kinRevision: revision,
        premiseIds: [...new Set([...Object.keys(s.actors.kinFacts), ...premises.map((p) => p.id)])],
        degrees: 'source-two-step',
        completeness: 'complete-for-source-degrees',
        basis: { kind: 'evidence', id: `watch:authored-world-kin:${sequence}` },
      },
      basis: {
        evidence: { kind: 'evidence', id: `watch:authored-world-kin:${sequence}` },
        worldRevision: actorRuntime(s).worldRevision(),
      },
    },
    undefined,
    at,
  );
  s.actors.kinRevision = revision;
  for (const p of premises) s.actors.kinFacts[p.id] = true;
  if (!defer) sync(s);
  return scopeId;
}
export function canMarry(p: Person, q: Person, _custom: MarriageCustom, _opts?: unknown): { ok: boolean } {
  const s = actorHost(p),
    scopeId = kinScope(s, p.id, q.id),
    at = actorRuntime(s).time();
  const result = lifeValue(s, {
    kind: 'can-marry',
    a: p.id,
    b: q.id,
    customId: 'watch-village',
    at,
    guardian: { kind: 'known', stance: 'none', basis: { kind: 'evidence', id: 'watch:adult-custom' } },
    kinScopeId: scopeId,
  }) as { kind: string; ok?: boolean };
  return { ok: result.kind === 'known' && result.ok === true };
}
export function court(p: Person, q: Person, _at: number, actual: { quality: number }): void {
  const s = actorHost(p),
    e = actorEvidence(s, p.id, 'actual-courtship-meeting');
  actorInput(s, 'lifecycle.received', {
    type: 'courtship-meeting',
    partners: [
      { kind: 'actor', id: p.id },
      { kind: 'actor', id: q.id },
    ],
    quality: actual.quality,
    actionReceipt: e.evidenceId,
    basis: {
      evidence: { kind: 'evidence', id: e.evidenceId },
      worldRevision: actorRuntime(s).worldRevision(),
    },
  });
  sync(s);
}
export function proposeOffer(_p: Person, q: Person, _opts?: unknown): Affordance {
  return {
    id: `propose:${q.id}`,
    action: 'propose',
    label: `ask ${q.name} to marry`,
    targetId: q.id,
    duration: 10,
    effort: 0,
    advertises: { belonging: 0.4, meaning: 0.3 },
    tags: ['family'],
  };
}
export function proposalOffers(_answerer: Person, asker: Person, _opts?: unknown): Affordance[] {
  return [
    {
      id: `accept-proposal:${asker.id}`,
      action: 'accept-proposal',
      label: `accept ${asker.name}'s proposal`,
      targetId: asker.id,
      duration: 10,
      effort: 0,
      advertises: { belonging: 0.4, meaning: 0.3 },
      tags: ['family'],
    },
    {
      id: `decline-proposal:${asker.id}`,
      action: 'decline-proposal',
      label: `decline ${asker.name}'s proposal`,
      targetId: asker.id,
      duration: 10,
      effort: 0,
      advertises: { autonomy: 0.2 },
    },
  ];
}
export function familyVoices(
  offers: readonly Affordance[],
  approvals: readonly { voiceId: string; approval: number }[],
): Suggestion[] {
  return approvals.map((a) => ({
    voiceId: a.voiceId,
    affordanceId: offers.find((o) => o.action === (a.approval >= 0 ? 'accept-proposal' : 'decline-proposal'))
      ?.id,
    strength: Math.abs(a.approval),
    appeal: 'belonging',
  }));
}
export function decide(
  p: Person,
  offers: readonly Affordance[],
  options?: { suggestions?: readonly Suggestion[] },
): PublicDecision {
  const s = actorHost(p);
  // Settle earlier actual work before binding a new offer ledger revision.
  // Otherwise completions before a future ingress slot invalidate that ledger.
  sync(s);
  interruptActor(s, p.id, 'An ordinary village decision');
  // Interruption must be admitted before a new choice is requested. In one
  // batch the actor is still busy when HF considers the decision input.
  sync(s);
  const runtime = actorRuntime(s),
    at = actorAt(s);
  const inputs = runtime.offerInputs(at, [{ person: p.id, offers: offers.map((a) => publicOffer(p.id, a)) }]);
  s.actors.queued.push(...inputs);
  for (const suggestion of options?.suggestions ?? [])
    actorInput(
      s,
      'suggestion.received',
      {
        person: p.id,
        received: {
          kind: 'ordinary',
          suggestion: { ...suggestion, adviceId: `watch:family-advice:${++s.actors.sequence}` },
        },
      },
      undefined,
      at,
    );
  const row = inputs.find((i) => i.kind === 'offers.received');
  actorInput(
    s,
    'decision.requested',
    {
      person: p.id,
      reason: 'A village choice',
      treatment: 'reconsider',
      offerRevision: row?.kind === 'offers.received' ? row.payload.revision : runtime.offerRevision(p.id),
    },
    undefined,
    at,
  );
  const events = flushActors(s, s.minute);
  if ('actorEvents' in s)
    (s as ActorHost & { actorEvents: import('./actor.ts').WatchEvent[] }).actorEvents.push(...events);
  const record = events.findLast((e) => e.personId === p.id && e.record)?.record;
  if (!record) throw new Error('The Watch decision produced no public choice record.');
  if (record.chosenAction === 'accept-proposal' && record.chosenAffordanceId)
    s.actors.acceptedProposal[
      `${p.id}:${offers.find((o) => o.id === record.chosenAffordanceId)?.targetId ?? ''}`
    ] = record.id;
  return record;
}
export function marry(
  p: Person,
  q: Person,
  _at: number,
  _custom: MarriageCustom,
  _opts?: unknown,
): { ok: boolean } {
  const s = actorHost(p),
    acceptedProposal =
      s.actors.acceptedProposal[`${q.id}:${p.id}`] ?? s.actors.acceptedProposal[`${p.id}:${q.id}`];
  if (!acceptedProposal) return { ok: false };
  const scopeId = kinScope(s, p.id, q.id, true),
    at = s.actors.ingress,
    e = actorEvidence(s, p.id, 'actual-marriage');
  actorInput(
    s,
    'lifecycle.received',
    {
      type: 'marriage',
      partners: [
        { kind: 'actor', id: p.id },
        { kind: 'actor', id: q.id },
      ],
      customId: 'watch-village',
      guardian: { kind: 'known', stance: 'none', basis: { kind: 'evidence', id: e.evidenceId } },
      kinScopeId: scopeId,
      acceptedProposal,
      basis: {
        evidence: { kind: 'evidence', id: e.evidenceId },
        worldRevision: actorRuntime(s).worldRevision(),
      },
    },
    undefined,
    at,
  );
  // Scope must certify the ceremony's exact timestamp; refresh it as part of the same batch.
  const scopeInput = s.actors.queued.find(
    (i) => i.kind === 'lifecycle.received' && i.payload.type === 'kin-premise',
  );
  void scopeInput;
  sync(s);
  return { ok: true };
}
export type RoutineActivity = {
  action: string;
  minutes: number;
  chance?: number;
  with?: readonly string[];
  valence?: number;
  tags?: readonly string[];
  skill?: { id: string; difficulty: number };
  practice?: { quality?: number; instruction?: { teacherId: string; level: number } };
  keeps?: boolean;
};
export type Routine = { activities: RoutineActivity[] };

export function bornActor(
  s: ActorHost,
  mother: Person,
  father: Person,
  id: string,
  name: string,
  sex: 'female' | 'male',
  _at: number,
  baseline: PersonAuthoring,
): Person {
  sync(s);
  const pregnancy = lifeValue(s, { kind: 'pregnancy', person: mother.id, at: actorRuntime(s).time() }) as {
    pregnancy: { id: string } | null;
  };
  const e = actorEvidence(s, mother.id, 'actual-birth');
  const { body, needs, reserve, retention, affect, promptings, review, relationships, voices } =
    baseline.state;
  // HF 4.11 adds authored newborn social context; inheritance remains faculty owned.
  const context = { body, needs, reserve, retention, affect, promptings, review, relationships, voices };
  actorInput(s, 'lifecycle.received', {
    type: 'birth',
    child: {
      kind: 'create',
      newborn: {
        kind: 'two-parent-derived',
        id,
        identity: { name },
        sex: { kind: 'authored', value: sex, basis: { kind: 'evidence', id: `${e.evidenceId}:sex` } },
        parents: [
          { kind: 'actor', id: mother.id },
          { kind: 'actor', id: father.id },
        ],
        context,
      },
    },
    delivery: pregnancy.pregnancy
      ? {
          kind: 'open-pregnancy',
          mother: { kind: 'actor', id: mother.id },
          pregnancyId: pregnancy.pregnancy.id,
        }
      : { kind: 'not-recorded' },
    basis: {
      evidence: { kind: 'evidence', id: e.evidenceId },
      worldRevision: actorRuntime(s).worldRevision(),
    },
  });
  sync(s);
  s.actors.identities[id] = { name, sex, birthAt: actorRuntime(s).time() };
  const child = readActor(s, id);
  if (!child) throw new Error('HF did not admit the newborn.');
  return child;
}
export function conceive(s: ActorHost, mother: Person, father: Person, offspring: string): number {
  sync(s);
  const e = actorEvidence(s, mother.id, 'conception');
  actorInput(s, 'lifecycle.received', {
    type: 'conception',
    mother: { kind: 'actor', id: mother.id },
    father: { kind: 'identified', entity: { kind: 'entity', id: father.id } },
    offspring: { kind: 'entity', id: offspring },
    pregnancyId: `${e.evidenceId}:pregnancy`,
    basis: {
      evidence: { kind: 'evidence', id: e.evidenceId },
      worldRevision: actorRuntime(s).worldRevision(),
    },
  });
  sync(s);
  const result = lifeValue(s, { kind: 'pregnancy', person: mother.id, at: actorRuntime(s).time() }) as {
    pregnancy: { dueAt: number } | null;
  };
  if (!result.pregnancy) throw new Error('HF did not record the conception.');
  return result.pregnancy.dueAt / 60_000;
}
