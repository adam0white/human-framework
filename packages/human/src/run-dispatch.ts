/** SCOPE: reached-frame composition. Only a faculty owner mutates its slice.
 * Journals remain append deltas until the complete transaction succeeds.
 */

import { cloneData } from './core/clone.ts';
import { attendEvidence } from './beliefs/beliefs.ts';
import { ageYearsAt } from './body/span.ts';
import { projectChapterClock } from './chapter-clock.ts';
import { cognitionOwner } from './cognition/cognition.ts';
import { conversationOwner } from './conversation/conversation.ts';
import { checkPersonAuthoring, classifyQueuedInput } from './run-admission.ts';

export function copyOffer(offer: T.DeepReadonly<T.Offer>): T.Offer {
  const { promise, ...rest } = offer;
  if (!promise) return rest;
  const { actions, violatedBy, exemptWhen, ...data } = promise;
  return {
    ...rest,
    promise: {
      ...data,
      actions: [...actions],
      ...(violatedBy === undefined ? {} : { violatedBy: [...violatedBy] }),
      ...(exemptWhen === undefined ? {} : { exemptWhen: [...exemptWhen] }),
    },
  };
}
export function copyPercept(percept: T.DeepReadonly<T.PerceptData>): T.PerceptData {
  const { prospect, consequences, ...rest } = percept;
  const converted = consequences.map((entry): T.ReceivedConsequence => {
    const { diminishes, advances, ...successor } = entry.successor;
    return {
      ...entry,
      successor: {
        ...successor,
        ...(diminishes === undefined ? {} : { diminishes: [...diminishes] }),
        ...(advances === undefined ? {} : { advances: [...advances] }),
      },
    };
  });
  if (!prospect) return { ...rest, consequences: converted };
  const { materialIds, ...data } = prospect;
  return {
    ...rest,
    consequences: converted,
    prospect: { ...data, ...(materialIds === undefined ? {} : { materialIds: [...materialIds] }) },
  };
}

import { clamp01, clampSigned, sigmoid } from './core/index.ts';
import { random } from './core/random.ts';
import { rendererOwner } from './narrate/literal.ts';
import { levelOf, urgencyOf } from './needs/needs.ts';
import { canonicalJson, compareCodePoints, hashCanonical } from './run-canonical.ts';
import { validateActor } from './run-integrity.ts';
import type { RunRecord, TransactionStage } from './run-kernel.ts';
import { knownKin as kinSnapshot } from './run-lifecycle.ts';
import { RunLimitError } from './run-kernel.ts';
import { OWNERS } from './run-owners.ts';
import { bodyPerception, constructAuthoredActor } from './run-person.ts';
import { joinedReferences } from './run-references.ts';
import type * as T from './run-schema.ts';
import { constructionStream } from './run-state.ts';
import { applyWorldChange, consumeHostResolution } from './run-world.ts';

export class Frame {
  readonly addedReferences = new Map<T.PersonId, T.Reference[]>();
  readonly appliedEffects = new Set<T.Id>();
  readonly evidenceIds = new Set<string>();
  readonly inputById = new Map<T.InputId, T.DeepReadonly<T.Input>>();
  readonly decisions = new Map<T.PersonId, { treatment: 'ordinary' | 'reconsider'; causes: T.Id[] }>();
  readonly record: RunRecord;
  readonly stage: TransactionStage;
  constructor(record: RunRecord, stage: TransactionStage) {
    this.record = record;
    this.stage = stage;
    this.commonPeople = stage.current.people;
  }
  get state() {
    return this.stage.current;
  }
  actor(person: T.PersonId): T.ActorState {
    const actor = this.state.people[person];
    if (!actor) throw new RangeError(`Unknown actor ${person}`);
    return actor;
  }
  continuation(person: T.PersonId): T.ActorContinuation {
    const continuation = this.state.continuations.find((item) => item.person === person);
    if (!continuation) throw new RangeError(`Missing continuation for ${person}`);
    return continuation;
  }
  context(person: T.PersonId, phase: T.Phase, causes: readonly T.Id[]): T.FrameContext {
    return {
      effective: this.record.parameters.effective,
      effectiveParametersHash: this.record.parameters.hash,
      person,
      at: this.state.at,
      priorAt: this.stage.base.at,
      phase,
      fidelity: this.state.cursor.fidelity,
      worldRevision: this.state.world.revision,
      causes,
    };
  }
  install(
    person: T.PersonId,
    patch: Partial<T.ActorState>,
    continuation?: Partial<T.ActorContinuation>,
  ): void {
    this.stage.current = {
      ...this.state,
      people: { ...this.state.people, [person]: { ...this.actor(person), ...patch } },
      continuations: continuation
        ? this.state.continuations.map((prior) =>
            prior.person === person ? { ...prior, ...continuation } : prior,
          )
        : this.state.continuations,
    };
  }
  /** A discrete Character change starts a new trait path at `context.at`. Needs
   * integrate that path from their own anchor, so they restart from their value
   * materialized now; otherwise the closed form would read the new path before
   * it begins. */
  installCharacter(
    person: T.PersonId,
    state: Partial<T.ActorState>,
    character: T.ActorContinuation['narrative']['character'],
    context: T.FrameContext,
  ): void {
    const continuation = this.continuation(person);
    const needs =
      continuation.deliberation.needs.anchor.at < context.at
        ? {
            anchor: { at: context.at, conditionId: context.causes[0] ?? person },
            state: { ...this.actor(person).needs },
          }
        : continuation.deliberation.needs;
    this.install(person, state, {
      narrative: { ...continuation.narrative, character },
      deliberation: { ...continuation.deliberation, needs },
    });
  }
  references(person: T.PersonId): readonly T.Reference[] {
    let added = this.addedReferences.get(person);
    if (!added) {
      added = [];
      this.addedReferences.set(person, added);
    }
    return joinedReferences(this.record.allocations.get(person) ?? [], added);
  }
  evidence(person: T.PersonId, id: T.Id, inputId: T.InputId): void {
    const key = JSON.stringify([person, id]);
    if (this.record.evidenceIds.has(key) || this.evidenceIds.has(key)) return;
    const input = this.inputById.get(inputId);
    if (!input) throw new RangeError('Received evidence lacks an actual input carrier');
    this.evidenceIds.add(key);
    this.stage.receipts.evidence.push({
      id,
      person,
      inputId,
      hash: hashCanonical('hf-run4/evidence', person, id, input),
    });
  }
  receipt(person: T.PersonId, owner: T.FacultyId, semanticId: T.Id, cause: T.Id, data: unknown): void {
    const id = hashCanonical('hf-run4/received-id', person, owner, semanticId);
    if (this.record.effectIds.has(id) || this.appliedEffects.has(id))
      throw new RangeError('Causal receipt was already applied');
    this.appliedEffects.add(id);
    this.stage.receipts.effects.push({
      id,
      cause,
      owner,
      person,
      causalEffectKey: hashCanonical('hf-run4/received-content', person, owner, semanticId, data),
      appliedAt: this.state.at,
    });
  }
  allocate(person: T.PersonId, reference: T.Reference): void {
    let added = this.addedReferences.get(person);
    if (!added) {
      added = [];
      this.addedReferences.set(person, added);
    }
    added.push(reference);
    this.stage.receipts.allocated.push({
      scope: { kind: 'person', person },
      reference,
      allocatedAt: this.state.at,
    });
  }
  emit(
    person: T.PersonId | undefined,
    data: T.EventData,
    context: T.FrameContext,
    settlement: T.ChronicleSettlement | null = null,
  ): T.RunEvent {
    const ordinal = this.state.counters.nextEvent++;
    if (!Number.isSafeInteger(this.state.counters.nextEvent))
      throw new RunLimitError('Event counter exhausted');
    const event: T.RunEvent = {
      id: hashCanonical('hf-run4/event-id', this.record.spec.id, ordinal),
      at: this.state.at,
      phase: context.phase,
      ...(person === undefined ? {} : { person }),
      causeIds: [...context.causes],
      data,
      narration: [],
    };
    event.narration = rendererOwner.render(
      event,
      { kind: 'host' },
      this.record.spec.definitions.lexicon,
      this.record.spec.seed,
    );
    this.stage.events.push(event);
    if (person !== undefined) {
      const actor = this.actor(person);
      const out = OWNERS.chronicle.receive(
        { days: actor.chronicle, years: actor.chronicleYears, open: actor.chronicleDay },
        data,
        { ...context, snapshot: actor, settlement },
      );
      const continuation = this.continuation(person);
      this.install(
        person,
        {
          chronicle: [...out.state.days],
          chronicleYears: [...out.state.years],
          chronicleDay: out.state.open,
        },
        {
          narrative: {
            ...continuation.narrative,
            chronicle: { anchor: { at: context.at, conditionId: event.id }, open: out.state.open },
          },
        },
      );
      if (
        out.events.length ||
        out.effects.appraisals.length ||
        out.effects.modifiers.length ||
        out.effects.terms.length
      )
        this.output(person, 'chronicle', out, context);
      // Every route that breaks a commitment (agenda receipts and retained agenda spans) passes here once.
      // The chronicle notes the break before its consequences.
      if (data.kind === 'commitment-changed' && data.after.status === 'broken' && data.before !== 'broken')
        this.missed(person, data.after, event.id, context);
    }
    return event;
  }
  /**
   * A broken commitment leaves a trace (3.x person.ts recordMissed): a 'missed' episode, distress and an
   * esteem cost scaled by importance; a breach when it is linked to a held norm; a broken promise to another.
   */
  missed(person: T.PersonId, c: T.DeepReadonly<T.Commitment>, cause: T.Id, context: T.FrameContext): void {
    const actor = this.actor(person);
    if (!actor.body.alive) return;
    const defaults = context.effective.builtins.PERSON_DEFAULTS;
    // An abstention has no fulfilling action; the running act that violated it broke it.
    const action =
      c.actions[0] ??
      (c.kind === 'abstain' ? (actor.activity?.offer.actionId ?? c.violatedBy?.[0]) : undefined) ??
      c.kind;
    // Keyed on the break event: a host may reuse a commitment id after the closed one is pruned.
    const evidenceId = hashCanonical('hf-run4/missed-commitment', cause);
    const other = c.toId !== undefined && c.toId !== 'self' ? c.toId : undefined;
    this.memory(
      person,
      {
        kind: 'episode',
        receiptId: evidenceId,
        episode: {
          at: context.at,
          kind: 'missed',
          action,
          actorId: person,
          ...(other === undefined ? {} : { targetId: other }),
          valence: -0.5 * c.importance,
          // 3.x defaultSalience: 'missed' has no kind entry, so the default base plus the valence share.
          salience: clamp01(
            context.effective.builtins.MEMORY_DEFAULTS.defaultKindSalience +
              context.effective.builtins.MEMORY_DEFAULTS.valenceSalience * 0.5 * c.importance,
          ),
          summary: '',
          tags: ['missed', c.kind],
        },
      },
      context,
    );
    this.effect(
      {
        id: hashCanonical('hf-run4/missed-appraisal', evidenceId),
        cause: evidenceId,
        person,
        at: context.at,
        applyPhase: context.phase,
        from: 'run',
        to: 'affect',
        appraisal: {
          at: context.at,
          kind: 'event',
          desirability: -defaults.missedDistress * c.importance,
          cause: `missed:${c.kind}:${action}`,
        },
      },
      context,
    );
    this.need(
      person,
      { kind: 'realized-outcome', evidenceId, needs: { esteem: -defaults.missedEsteemCost * c.importance } },
      context,
    );
    // 3.x: only a commitment linked to a norm is a deed, a breach and, when owed to another, a broken promise.
    if (c.normId === undefined) return;
    this.conscience(
      person,
      {
        kind: 'missed-commitment',
        evidenceId,
        action,
        normId: c.normId,
        ...(other === undefined ? {} : { target: other }),
      },
      context,
    );
    if (other !== undefined)
      this.social(
        person,
        {
          kind: 'event',
          data: {
            person,
            evidenceId,
            other,
            event: { kind: 'promise-broken', byMe: true, magnitude: c.importance },
          },
        },
        context,
      );
  }
  output<S>(person: T.PersonId, owner: T.FacultyId, output: T.OwnerOutput<S>, context: T.FrameContext): void {
    if (output.advancedThrough !== this.state.at)
      throw new RangeError('Endpoint owner changed the reached clock');
    for (const data of output.events) this.emit(person, data, context);
    for (const effect of [...output.effects.terms, ...output.effects.modifiers, ...output.effects.appraisals])
      this.effect(effect, context);
    if (output.nextBoundary !== null && output.nextBoundary > this.state.at) {
      const event: T.ScheduledEvent = {
        id: hashCanonical('hf-run4/owner-boundary', person, owner, output.nextBoundary),
        at: output.nextBoundary,
        phase: 2,
        person,
        causalId: context.causes[0] ?? person,
        localOrdinal: 0,
        data: { kind: 'owner-boundary', owner, person, boundary: 'threshold' },
      };
      if (!this.state.queue.some((queued) => queued.id === event.id))
        this.stage.current.queue = [...this.state.queue, event];
    }
  }
  effect(effect: T.ScheduledEffect, context: T.FrameContext): void {
    if (this.record.effectIds.has(effect.id) || this.appliedEffects.has(effect.id))
      throw new RangeError('Effect was already applied');
    if (effect.at > this.state.at || effect.applyPhase > context.phase) {
      const scheduled: T.ScheduledEvent = {
        id: hashCanonical('hf-run4/scheduled-effect', effect.id),
        at: effect.at,
        phase: effect.applyPhase,
        person: effect.person,
        causalId: effect.cause,
        localOrdinal: 0,
        data: { kind: 'effect', effect },
      };
      if (!this.state.queue.some((queued) => queued.id === scheduled.id))
        this.stage.current.queue = [...this.state.queue, scheduled];
      return;
    }
    if (effect.at !== this.state.at) throw new RangeError('Effect precedes its reached frame');
    this.appliedEffects.add(effect.id);
    if ('appraisal' in effect) {
      const actor = this.actor(effect.person),
        continuation = this.continuation(effect.person);
      const { crisis, ...affect } = actor.affect;
      const out = OWNERS.affect.appraise(affect, effect, {
        ...context,
        person: effect.person,
        continuation: continuation.affect,
        traits: actor.traits,
      });
      this.install(effect.person, { affect: { ...out.state, crisis } }, { affect: out.continuation });
      this.output(effect.person, 'affect', out, context);
    } else if ('term' in effect) this.stage.current.effects = [...this.state.effects, effect];
    this.stage.receipts.effects.push({
      id: effect.id,
      cause: effect.cause,
      owner: effect.to,
      person: effect.person,
      causalEffectKey: hashCanonical(
        'hf-run4/effect-key',
        effect.from,
        effect.to,
        effect.person,
        effect.cause,
        effect.id,
      ),
      appliedAt: this.state.at,
    });
  }
  body(person: T.PersonId, input: T.DeepReadonly<T.BodyEndpoint>, context: T.FrameContext): void {
    const actor = this.actor(person),
      continuation = this.continuation(person);
    if (actor.body.alive) {
      const applied = (
        receipt: T.DeepReadonly<Exclude<T.BodyReceipt, { type: 'physical-contact' }>>,
        fallback: T.Id,
      ) => {
        const identity =
          'actionReceipt' in receipt
            ? receipt.actionReceipt
            : 'exposureId' in receipt
              ? receipt.exposureId
              : fallback;
        this.receipt(
          person,
          'body',
          hashCanonical('hf-run4/body-receipt', receipt.type, identity),
          context.causes[0] ?? fallback,
          receipt,
        );
      };
      if (input.kind === 'receipt') applied(input.receipt, input.id);
      if (input.kind === 'outcome') {
        const actual = input.outcome.actual,
          id = input.outcome.evidenceId;
        if (actual.consumed) applied({ type: 'consumed', actionReceipt: id, received: actual.consumed }, id);
        if (actual.exerted) applied({ type: 'exerted', actionReceipt: id, costs: actual.exerted }, id);
        if (actual.injury) applied({ type: 'injured', injury: actual.injury }, id);
        if (actual.illness) applied({ type: 'illness', illness: actual.illness }, id);
        for (const exposure of actual.exposures) applied({ type: 'exposed', ...exposure }, id);
        if (actual.voidedBladder && input.outcome.status === 'completed')
          applied({ type: 'voided', actionReceipt: id }, id);
      }
    }
    const out = OWNERS.body.receive(actor.body, input, {
      ...context,
      continuation: continuation.body,
      dozeContinuation: continuation.doze,
    });
    this.install(person, { body: out.state }, { body: out.continuation, doze: out.dozeContinuation });
    this.output(person, 'body', out, context);
  }
  affect(person: T.PersonId, input: T.DeepReadonly<T.AffectEndpoint>, context: T.FrameContext): void {
    const actor = this.actor(person),
      continuation = this.continuation(person),
      { crisis, ...affect } = actor.affect;
    const out = OWNERS.affect.receive(affect, input, {
      ...context,
      traits: actor.traits,
      continuation: continuation.affect,
    });
    this.install(person, { affect: { ...out.state, crisis } }, { affect: out.continuation });
    this.output(person, 'affect', out, context);
  }
  memory(person: T.PersonId, input: T.DeepReadonly<T.MemoryInput>, context: T.FrameContext): void {
    const actor = this.actor(person),
      continuation = this.continuation(person);
    const { beliefs, sourceTrust, contradictions, ...memory } = actor.memory;
    const out = OWNERS.memory.receive(memory, input, { ...context, allocations: this.references(person) });
    this.memoryOutput(person, out, context);
  }
  memoryOutput(person: T.PersonId, out: T.OwnerOutput<T.MemoryOwnedState>, context: T.FrameContext): void {
    const actor = this.actor(person),
      continuation = this.continuation(person);
    const { beliefs, sourceTrust, contradictions, ...memory } = actor.memory;
    for (const [kind, prefix, before, after] of [
      ['episode', 'e', memory.nextEpisode, out.state.nextEpisode],
      ['gist', 'g', memory.nextGist, out.state.nextGist],
    ] as const) {
      if (!Number.isSafeInteger(after) || after < before)
        throw new RangeError('Memory allocation counter rewound');
      for (let ordinal = before; ordinal < after; ordinal++)
        this.allocate(person, { kind, id: `${prefix}${ordinal}` });
    }
    this.install(
      person,
      { memory: { ...out.state, beliefs, sourceTrust, contradictions } },
      {
        narrative: {
          ...continuation.narrative,
          memory: { anchor: { at: context.at, conditionId: context.causes[0] ?? person }, state: out.state },
        },
      },
    );
    this.output(person, 'memory', out, context);
  }
  beliefs(person: T.PersonId, input: T.DeepReadonly<T.BeliefInput>, context: T.FrameContext): void {
    const actor = this.actor(person),
      continuation = this.continuation(person);
    const { beliefs, sourceTrust, contradictions } = actor.memory;
    const out = OWNERS.beliefs.receive({ beliefs, sourceTrust, contradictions }, input, context);
    this.install(
      person,
      { memory: { ...actor.memory, ...out.state } },
      {
        deliberation: {
          ...continuation.deliberation,
          beliefs: { anchor: { at: context.at, conditionId: context.causes[0] ?? person }, state: out.state },
        },
      },
    );
    // The owner returns authoritative before/after belief data. Compose receipt
    // events from those actual deltas; no belief or reputation law is repeated here.
    const events: T.EventData[] = [...out.events];
    const sourceTrustChanges = Object.keys(out.state.sourceTrust)
      .sort(compareCodePoints)
      .flatMap((sourceId) => {
        const before = sourceTrust[sourceId] ?? context.effective.builtins.BELIEF_DEFAULTS.defaultTrust;
        const after = out.state.sourceTrust[sourceId];
        return after !== undefined && after !== before ? [{ sourceId, before, after }] : [];
      });
    if (input.kind !== 'contradiction') {
      const affected = new Set(
        input.kind === 'confirm' ? [input.prop] : input.claims.map((claim) => claim.prop),
      );
      for (const after of out.state.beliefs) {
        if (
          !affected.has(after.prop) ||
          events.some((event) => event.kind === 'belief-revised' && event.prop === after.prop)
        )
          continue;
        const before = beliefs.find((belief) => belief.prop === after.prop);
        if (!before || canonicalJson(before) !== canonicalJson(after) || sourceTrustChanges.length)
          events.push({
            kind: 'belief-revised',
            prop: after.prop,
            beforeLogOdds: before?.logOdds ?? null,
            after,
            evidenceId: input.evidenceId,
            sourceTrustChanges,
          });
      }
    }
    this.output(person, 'beliefs', { ...out, events }, context);
    for (const event of events)
      if (event.kind === 'belief-revised')
        this.social(
          person,
          {
            kind: 'reputation',
            prop: event.prop,
            before: sigmoid(event.beforeLogOdds ?? 0),
            credence: sigmoid(event.after.logOdds),
            evidenceId: event.evidenceId,
          },
          context,
        );
  }
  social(person: T.PersonId, input: T.DeepReadonly<T.SocialInput>, context: T.FrameContext): void {
    const actor = this.actor(person),
      continuation = this.continuation(person);
    const out = OWNERS.social.receive(actor.social, input, {
      ...context,
      traits: actor.traits,
      values: actor.values,
      sourceTrust: Object.entries(actor.memory.sourceTrust).map(([sourceId, trust]) => ({ sourceId, trust })),
      norms: actor.conscience.norms,
      catalog: this.record.spec.definitions.norms,
      rng: { words: actor.rng, identity: actor.randomIdentity },
    });
    this.install(
      person,
      { social: out.state, rng: out.rng.words, randomIdentity: out.rng.identity },
      {
        deliberation: {
          ...continuation.deliberation,
          social: { anchor: { at: context.at, conditionId: context.causes[0] ?? person }, state: out.state },
        },
      },
    );
    this.output(person, 'social', out, context);
  }
  need(
    person: T.PersonId,
    input: T.DeepReadonly<T.NeedRewardReceipt | T.WillAutonomyReceipt | T.RealizedNeedReceipt>,
    context: T.FrameContext,
  ): void {
    const actor = this.actor(person),
      continuation = this.continuation(person);
    const out = OWNERS.needs.receive(actor.needs, input, {
      ...context,
      continuation: continuation.deliberation.needs,
    });
    this.install(
      person,
      { needs: out.state },
      { deliberation: { ...continuation.deliberation, needs: out.continuation } },
    );
    this.output(person, 'needs', out, context);
  }
  agenda(
    person: T.PersonId,
    input: Parameters<T.AgendaOwner['receive']>[1],
    context: T.FrameContext,
  ): T.OwnerOutput<T.AgendaState> {
    const actor = this.actor(person);
    const out = OWNERS.agenda.receive(actor.agenda, input, {
      ...context,
      activity: actor.activity,
      norms: actor.conscience.norms,
      catalog: this.record.spec.definitions.norms,
    });
    this.install(person, { agenda: out.state });
    this.output(person, 'agenda', out, context);
    return out;
  }
  will(
    person: T.PersonId,
    input: T.DeepReadonly<T.WillInput>,
    context: T.FrameContext,
  ): T.WillMutationOutput {
    const actor = this.actor(person),
      continuation = this.continuation(person);
    const out = OWNERS.will.receive(actor.will, input, {
      ...context,
      actor,
      offers: this.state.offers[person]?.offers ?? [],
    });
    this.install(
      person,
      { will: out.state },
      {
        deliberation: {
          ...continuation.deliberation,
          will: { anchor: { at: context.at, conditionId: context.causes[0] ?? person }, state: out.state },
        },
      },
    );
    this.willReceipts(person, out, context);
    this.output(person, 'will', out, context);
    return out;
  }
  willReceipts(person: T.PersonId, out: T.DeepReadonly<T.WillMutationOutput>, context: T.FrameContext): void {
    for (const receipt of out.needReceipts) this.need(person, receipt, context);
    for (const receipt of out.crisisReceipts) {
      const current = this.actor(person),
        prior = this.continuation(person);
      const received = OWNERS.crisis.receive(current.affect.crisis, receipt, {
        ...context,
        continuation: prior.crisis,
      });
      this.install(
        person,
        { affect: { ...current.affect, crisis: received.state } },
        { crisis: received.continuation },
      );
      this.output(person, 'crisis', received, context);
    }
  }
  conscience(
    person: T.PersonId,
    input: Parameters<T.ConscienceOwner['receive']>[1],
    context: T.FrameContext,
  ): void {
    const actor = this.actor(person);
    const out = OWNERS.conscience.receive(actor.conscience, input, {
      ...context,
      catalog: this.record.spec.definitions.norms,
    });
    this.install(person, { conscience: out.state });
    this.output(person, 'conscience', out, context);
  }
  projectContext(person: T.PersonId, context: T.FrameContext): T.ProjectContext {
    const actor = this.actor(person);
    const body = OWNERS.body.read(actor.body, { ...context, perception: bodyPerception(actor, context.at) });
    const needs = OWNERS.needs.read(actor.needs, {
      ...context,
      body,
      traits: actor.traits,
      values: actor.values,
    });
    return {
      ...context,
      body,
      needs,
      goals: actor.agenda.goals,
      commitments: actor.agenda.commitments,
      affect: actor.affect,
      curiosity: actor.curiosity,
      traits: actor.traits,
      alive: actor.body.alive,
      asleep: actor.body.asleep,
      activity: actor.activity,
      life: OWNERS.life.modifiers(actor.life, context),
    };
  }
  projects(
    person: T.PersonId,
    input: Parameters<T.ProjectsOwner['receive']>[1],
    context: T.FrameContext,
  ): void {
    const out = OWNERS.projects.receive(
      this.actor(person).projects,
      input,
      this.projectContext(person, context),
    );
    this.install(person, { projects: out.state });
    this.output(person, 'projects', out, context);
    for (const receipt of out.agendaReceipts) this.agenda(person, receipt, context);
  }
  considerProjects(person: T.PersonId, context: T.FrameContext): void {
    const out = OWNERS.projects.consider(this.actor(person).projects, this.projectContext(person, context));
    this.install(person, { projects: out.state });
    this.output(person, 'projects', out, context);
    for (const receipt of out.agendaReceipts) this.agenda(person, receipt, context);
  }
  skills(person: T.PersonId, input: Parameters<T.SkillsOwner['learn']>[1], context: T.FrameContext): void {
    const actor = this.actor(person),
      continuation = this.continuation(person);
    const out = OWNERS.skills.learn(actor.skills, input, {
      ...context,
      life: OWNERS.life.modifiers(actor.life, context),
      body: OWNERS.body.read(actor.body, { ...context, perception: bodyPerception(actor, context.at) }),
      traits: actor.traits,
      aptitude: actor.family.aptitudes,
      ageYears: ageYearsAt(actor.life.bornAt, context.at),
      skills: this.record.spec.definitions.skills,
      transfers: this.record.spec.definitions.skillTransfers,
    });
    this.install(
      person,
      { skills: out.state },
      {
        deliberation: {
          ...continuation.deliberation,
          skills: { anchor: { at: context.at, conditionId: context.causes[0] ?? person }, state: out.state },
        },
      },
    );
    this.output(person, 'skills', out, context);
  }
  methods(person: T.PersonId, input: T.DeepReadonly<T.MethodInput>, context: T.FrameContext): void {
    const actor = this.actor(person),
      continuation = this.continuation(person);
    const out = OWNERS.methods.receive(actor.methods, input, {
      ...context,
      available: actor.body.alive && !actor.body.asleep,
      sourceTrust: Object.entries(actor.memory.sourceTrust).map(([sourceId, trust]) => ({ sourceId, trust })),
    });
    this.install(
      person,
      { methods: out.state },
      {
        deliberation: {
          ...continuation.deliberation,
          methods: { anchor: { at: context.at, conditionId: context.causes[0] ?? person }, state: out.state },
        },
      },
    );
    this.output(person, 'methods', out, context);
  }
  review(person: T.PersonId, context: T.FrameContext): void {
    const actor = this.actor(person);
    const out = OWNERS.review.review(actor.review, {
      ...context,
      agenda: actor.agenda,
      days: actor.chronicle,
      open: actor.chronicleDay,
      traits: actor.traits,
    });
    const continuation = this.continuation(person);
    this.install(
      person,
      { review: out.state },
      {
        narrative: {
          ...continuation.narrative,
          review: { anchor: { at: context.at, conditionId: context.causes[0] ?? person }, state: out.state },
        },
      },
    );
    this.output(person, 'review', out, context);
    for (const receipt of out.affectReceipts) this.affect(person, receipt, context);
  }
  requestDecision(person: T.PersonId, treatment: 'ordinary' | 'reconsider', cause: T.Id): void {
    const prior = this.decisions.get(person);
    this.decisions.set(person, {
      treatment: treatment === 'reconsider' || prior?.treatment === 'reconsider' ? 'reconsider' : 'ordinary',
      causes: [...(prior?.causes ?? []), cause],
    });
  }
  readonly resolvedRequests = new Map<T.Id, T.HostRequest>();
  readonly outcomeWork = new Map<
    T.Id,
    {
      activity: T.ActorActivity;
      beforeNeeds: readonly T.NeedReading[];
      before: T.CuriosityLearningPremises;
      expected: T.ActionExpectation;
    }
  >();
  readonly disposed = new Set<T.Id>();
  commonPeople: T.RunState['people'];
  readonly contacts: T.DeepReadonly<T.Input<'family.contact'>>[] = [];
  phase: T.Phase = 0;
  readonly ingress: { phase: T.Phase; input: T.DeepReadonly<T.Input> }[] = [];
  receive(input: T.DeepReadonly<T.Input>): void {
    this.inputById.set(input.id, input);
    if (input.kind === 'action.resolved' || input.kind === 'communication.resolved') {
      const consumed = consumeHostResolution(this.state, input);
      if (!consumed.ok) throw new RangeError(consumed.error.message);
      this.stage.current = consumed.value.state;
      this.resolvedRequests.set(input.id, consumed.value.request);
      this.ingress.push({ phase: input.kind === 'action.resolved' ? 1 : 2, input });
      return;
    }
    let phase: T.Phase = 2;
    if (
      input.kind === 'world.changed' ||
      input.kind === 'offers.received' ||
      input.kind === 'routine.authored' ||
      input.kind === 'routine.withdrawn' ||
      input.kind === 'chapter.elapsed'
    )
      phase = 0;
    else if (
      input.kind === 'body.received' ||
      input.kind === 'lifecycle.received' ||
      input.kind === 'person.arrived'
    )
      phase = 1;
    else if (
      input.kind === 'review.requested' ||
      input.kind === 'agenda.requested' ||
      input.kind === 'agenda.received' ||
      input.kind === 'decision.requested'
    )
      phase = 4;
    if (phase === 0) this.applyInput(input);
    else this.ingress.push({ phase, input });
  }
  runIngress(phase: T.Phase): void {
    this.phase = phase;
    this.commonPeople = this.state.people;
    for (let index = 0; index < this.ingress.length; index++) {
      const entry = this.ingress[index];
      if (entry?.phase === phase) {
        this.ingress.splice(index--, 1);
        this.applyInput(entry.input);
      }
    }
  }
  issueAction(person: T.PersonId, stage: T.ActionRequest['stage'], context: T.FrameContext): T.ActionRequest {
    const actor = this.actor(person),
      activity = actor.activity;
    if (!activity) throw new RangeError('Action request has no activity');
    if (
      this.state.pending.some(
        (request) =>
          request.kind === 'action' && request.person === person && request.activityId === activity.id,
      )
    )
      throw new RangeError('Activity already has a pending host request');
    const ordinal = this.state.counters.nextRequest++;
    if (!Number.isSafeInteger(this.state.counters.nextRequest))
      throw new RunLimitError('Request counter exhausted');
    const offerRevision =
      stage === 'start' ? this.state.offers[person]?.revision : this.record.activityOffers.get(activity.id);
    if (offerRevision === undefined) throw new RangeError('Activity lacks its original offer revision');
    const body: Omit<T.ActionRequest, 'requestHash'> = {
      kind: 'action',
      id: hashCanonical('hf-run4/request-id', this.record.spec.id, ordinal),
      person,
      activityId: activity.id,
      offerId: activity.offer.id,
      offerRevision,
      issuedAt: this.state.at,
      boundaryAt: this.state.at,
      stage,
      worldRevision: this.state.world.revision,
      participants: [...activity.offer.participants],
    };
    const request = { ...body, requestHash: hashCanonical('hf-run4/request', body) };
    this.stage.current.pending = [...this.state.pending, request];
    this.stage.current.cursor = {
      ...this.state.cursor,
      resolutionLane: [...this.state.cursor.resolutionLane, request.id],
    };
    this.stage.receipts.allocated.push({
      scope: { kind: 'run' },
      reference: { kind: 'request', id: request.id },
      allocatedAt: this.state.at,
    });
    this.emit(person, { kind: 'action-requested', request }, context);
    return request;
  }
  interrupt(person: T.PersonId, activityId: T.Id, reason: string, context: T.FrameContext): void {
    const actor = this.actor(person);
    if (!actor.activity || actor.activity.id !== activityId) return;
    this.install(person, { activity: { ...actor.activity, interrupt: { at: this.state.at, reason } } });
    this.stage.current.queue = this.state.queue.filter(
      (event) =>
        !(
          (event.data.kind === 'activity-finish' || event.data.kind === 'activity-review') &&
          event.data.activityId === activityId
        ),
    );
    this.issueAction(person, 'interrupt', context);
  }
  choose(person: T.PersonId, treatment: 'ordinary' | 'reconsider', causes: readonly T.Id[]): void {
    let actor = this.actor(person);
    if (!actor.body.alive) return;
    // Project consideration runs at every decision point, before offers are read, as 3.x tick ran
    // considerProjects: adoption, staleness and history need no offer and no free hand.
    this.considerProjects(person, this.context(person, 5, causes));
    actor = this.actor(person);
    if (this.state.pending.some((request) => request.kind === 'action' && request.person === person)) return;
    const book = this.state.offers[person];
    const offers = (book?.offers ?? []).filter(
      (offer) =>
        !book?.rejected.some(
          (rejected) => rejected.offerId === offer.id && rejected.offerRevision === book.revision,
        ),
    );
    if (offers.length === 0) return;
    const context = this.context(person, 5, causes);
    const {
      beliefs: cueBeliefs,
      sourceTrust: cueTrust,
      contradictions: cueContradictions,
      ...cueMemory
    } = actor.memory;
    const memory = OWNERS.memory.receiveCue(
      cueMemory,
      {
        at: context.at,
        hour: Math.floor((((context.at % 86400000) + 86400000) % 86400000) / 3600000),
        tags: [],
      },
      {
        ...context,
        allocations: this.references(person),
        deceased: actor.social.relationships
          .filter((tie) => tie.deceasedAt !== undefined)
          .map((tie) => tie.otherId),
        emotionality: actor.traits.emotionality,
      },
    );
    const prior = this.continuation(person);
    this.install(
      person,
      {
        memory: {
          ...memory.state,
          beliefs: actor.memory.beliefs,
          sourceTrust: actor.memory.sourceTrust,
          contradictions: actor.memory.contradictions,
        },
      },
      {
        narrative: {
          ...prior.narrative,
          memory: { anchor: { at: context.at, conditionId: causes[0] ?? person }, state: memory.state },
        },
      },
    );
    this.output(person, 'memory', memory, context);
    for (const receipt of memory.affectReceipts) this.affect(person, receipt, context);
    actor = this.actor(person);
    const body = OWNERS.body.read(actor.body, { ...context, perception: bodyPerception(actor, context.at) });
    const needs = OWNERS.needs.read(actor.needs, {
      ...context,
      body,
      traits: actor.traits,
      values: actor.values,
    });
    const continuation = this.continuation(person);
    const cognitive: T.CognitionContext = {
      ...context,
      actor,
      offers,
      body,
      needs,
      life: OWNERS.life.modifiers(actor.life, context),
      suggestions: this.state.community.queued[person] ?? [],
      treatment,
      scarcity: actor.context.scarcity,
      bodyProjection: {
        continuation: continuation.body,
        dozeContinuation: continuation.doze,
        life: { birthAt: actor.life.bornAt },
        environment: actor.ambient.percept,
        ...(actor.family.pregnancy ? { pregnancy: actor.family.pregnancy } : {}),
        perception: bodyPerception(actor, context.at),
      },
    };
    const terms = cognitionOwner.terms(cognitive);
    for (const effect of terms.terms) this.effect(effect, context);
    const out = OWNERS.will.decide(actor.will, {
      ...cognitive,
      terms: this.state.effects.filter(
        (effect): effect is T.TermEffect => 'term' in effect && effect.person === person,
      ),
      rng: { words: actor.rng, identity: actor.randomIdentity },
    });
    this.install(
      person,
      { will: out.state, rng: out.rng.words, randomIdentity: out.rng.identity },
      {
        deliberation: {
          ...continuation.deliberation,
          will: { anchor: { at: context.at, conditionId: causes[0] ?? person }, state: out.state },
        },
      },
    );
    this.stage.current.effects = this.state.effects.filter(
      (effect) => !('term' in effect && effect.person === person),
    );
    const provisional: T.RunEvent = {
      id: hashCanonical('hf-run4/event-id', this.record.spec.id, this.state.counters.nextEvent),
      at: context.at,
      phase: 5,
      person,
      causeIds: [...causes],
      data: { kind: 'decision', decision: out.decision },
      narration: [],
    };
    const decision: T.DecisionRecord = {
      ...out.decision,
      intention:
        rendererOwner.render(
          provisional,
          { kind: 'person', observer: person },
          this.record.spec.definitions.lexicon,
          this.record.spec.seed,
        )[0]?.text ?? '',
    };
    const now = this.actor(person);
    if (!Number.isSafeInteger(now.nextDecision + 1)) throw new RunLimitError('Decision counter exhausted');
    this.install(person, {
      trace: now.retention.trace === 0 ? [] : [...now.trace, decision].slice(-now.retention.trace),
      nextDecision: now.nextDecision + 1,
    });
    this.emit(person, { kind: 'decision', decision }, context);
    for (const receipt of out.needReceipts) this.need(person, receipt, context);
    for (const resolution of out.resolutions) {
      const suggestion = cognitive.suggestions.find(
        (suggestion) => suggestion.voiceId === resolution.voiceId,
      );
      if (!suggestion) continue;
      this.emit(
        person,
        { kind: 'suggestion-resolved', adviceId: suggestion.adviceId, decisionId: decision.id, resolution },
        context,
      );
    }
    this.stage.current.community = {
      ...this.state.community,
      queued: { ...this.state.community.queued, [person]: [] },
    };
    if (out.command)
      this.will(
        person,
        { kind: 'command-decision', decision: out.command, evidenceId: decision.id },
        context,
      );
    const prompting = OWNERS.promptings.receive(
      this.actor(person).promptings,
      { decision, activity: this.actor(person).activity, noticed: terms.noticed },
      context,
    );
    const promptContinuation = this.continuation(person);
    this.install(
      person,
      { promptings: prompting.state },
      {
        narrative: {
          ...promptContinuation.narrative,
          promptings: { anchor: { at: context.at, conditionId: decision.id }, state: prompting.state },
        },
      },
    );
    this.output(person, 'promptings', prompting, context);
    for (const receipt of prompting.affectReceipts) this.affect(person, receipt, context);
    const chosen = offers.find((offer) => offer.id === decision.chosenAffordanceId);
    if (!chosen) return;
    const active = this.actor(person).activity;
    if (active) {
      if (active.offer.id !== chosen.id) this.interrupt(person, active.id, 'reconsidered', context);
      return;
    }
    const endsAt = context.at + chosen.durationMs;
    if (!Number.isSafeInteger(endsAt)) throw new RangeError('Activity exceeds exact clock range');
    const ordinal = this.state.counters.nextActivity++;
    if (!Number.isSafeInteger(this.state.counters.nextActivity))
      throw new RunLimitError('Activity counter exhausted');
    const activity: T.ActorActivity = {
      id: hashCanonical('hf-run4/activity-id', this.record.spec.id, ordinal),
      offer: copyOffer(chosen),
      needsAtStart: Object.fromEntries(needs.map((need) => [need.id, need.level])),
      startedAt: context.at,
      endsAt,
      decisionId: decision.id,
      intention: decision.intention,
      suggestions: out.resolutions,
      // 3.x begin: only a voice the person went along with is credited with the activity.
      ...(out.decision.suggestion?.verdict === 'assented' ||
      out.decision.suggestion?.verdict === 'complied' ||
      out.decision.suggestion?.verdict === 'commanded'
        ? { suggestion: out.decision.suggestion }
        : {}),
      reviewAt: Math.min(
        endsAt,
        out.nextBoundary ?? endsAt,
        context.at + context.effective.builtins.PERSON_DEFAULTS.reviewInterval * 60000,
      ),
      ...(chosen.promise ? { commitmentId: chosen.promise.id } : {}),
      ...(chosen.jointId === undefined ? {} : { jointId: chosen.jointId }),
      ...(out.resolutions.some(
        (resolution) => resolution.verdict === 'complied' || resolution.verdict === 'commanded',
      )
        ? { protest: true }
        : {}),
    };
    this.install(person, { activity });
    this.issueAction(person, 'start', context);
  }
  scheduleDecision(person: T.PersonId, cause: T.Id): void {
    const at = this.state.at + 1;
    if (!Number.isSafeInteger(at)) throw new RunLimitError('Next decision exceeds exact clock range');
    this.stage.current.queue = [
      ...this.state.queue,
      {
        id: hashCanonical('hf-run4/reconsider', person, cause),
        at,
        phase: 5,
        person,
        causalId: cause,
        localOrdinal: 0,
        data: { kind: 'owner-boundary', owner: 'will', person, boundary: 'expiry' },
      },
    ];
  }
  settleAction(input: T.DeepReadonly<T.Input<'action.resolved'>>, context: T.FrameContext): void {
    const resolution = input.payload,
      person = resolution.person,
      actor = this.actor(person);
    const request = this.resolvedRequests.get(input.id);
    if (!request || request.kind !== 'action') throw new RangeError('Missing admitted action request');
    const activity = actor.activity;
    if (!activity || activity.id !== resolution.activityId)
      throw new RangeError('Settled activity is not current');
    if (this.phase === 1) {
      this.stage.receipts.settlements.push({
        requestId: request.id,
        inputId: input.id,
        requestHash: request.requestHash,
        activityId: activity.id,
        stage: request.stage,
        ...(resolution.outcome ? { outcomeEvidenceId: resolution.outcome.evidenceId } : {}),
      });
      if (resolution.stage === 'start') {
        if (resolution.disposition === 'rejected') {
          const book = this.state.offers[person];
          if (book)
            this.stage.current.offers = {
              ...this.state.offers,
              [person]: {
                ...book,
                rejected: [
                  ...book.rejected,
                  { offerId: request.offerId, offerRevision: request.offerRevision, requestId: request.id },
                ],
              },
            };
          this.install(person, { activity: null });
          this.scheduleDecision(person, input.id);
        } else {
          if (activity.offer.promise)
            this.agenda(person, { type: 'commit', commitment: activity.offer.promise }, context);
          this.will(person, { kind: 'action-started', activity, evidenceId: input.id }, context);
          this.stage.current.queue = [
            ...this.state.queue,
            {
              id: hashCanonical('hf-run4/activity-finish', activity.id),
              at: activity.endsAt,
              phase: 6,
              person,
              causalId: request.id,
              localOrdinal: 0,
              data: { kind: 'activity-finish', person, activityId: activity.id },
            },
          ];
          if (activity.reviewAt < activity.endsAt)
            this.stage.current.queue = [
              ...this.state.queue,
              {
                id: hashCanonical('hf-run4/activity-review', activity.id, activity.reviewAt),
                at: activity.reviewAt,
                phase: 4,
                person,
                causalId: request.id,
                localOrdinal: 0,
                data: {
                  kind: 'activity-review',
                  person,
                  activityId: activity.id,
                  reason: 'scheduled-review',
                },
              },
            ];
        }
        this.emit(
          person,
          {
            kind: 'action-settled',
            requestId: request.id,
            activityId: activity.id,
            disposition: resolution.disposition,
            worldRevision: this.state.world.revision,
          },
          context,
        );
        return;
      }
      const outcome = resolution.outcome;
      if (!outcome) throw new RangeError('Completed settlement lacks actual outcome');
      const before = this.projectContext(person, context);
      const effect = OWNERS.memory.expectedEffect(actor.memory, activity.offer, context);
      this.outcomeWork.set(input.id, {
        activity,
        beforeNeeds: before.needs,
        before: {
          needs: before.needs,
          traits: actor.traits,
          life: before.life,
          fear: actor.affect.emotions.find((emotion) => emotion.id === 'fear')?.intensity ?? 0,
        },
        expected: {
          key: activity.offer.actionId,
          needs: effect.needs,
          successRate: effect.successRate,
          samples: effect.samples,
          valence: effect.valence,
        },
      });
      this.body(person, { kind: 'outcome', outcome }, context);
      this.ingress.push({ phase: 6, input });
      return;
    }
    const work = this.outcomeWork.get(input.id),
      outcome = resolution.outcome;
    if (!work || !outcome) throw new RangeError('Missing reached outcome evidence');
    if (!this.actor(person).body.alive) {
      this.emit(
        person,
        {
          kind: 'action-settled',
          requestId: request.id,
          activityId: work.activity.id,
          disposition: resolution.disposition,
          outcomeEvidenceId: outcome.evidenceId,
          worldRevision: this.state.world.revision,
        },
        context,
      );
      this.install(person, { activity: null, lastAction: outcome.actionId });
      this.stage.current.queue = this.state.queue.filter(
        (event) =>
          !(
            (event.data.kind === 'activity-finish' || event.data.kind === 'activity-review') &&
            event.data.activityId === work.activity.id
          ),
      );
      return;
    }
    if (outcome.actual.psychological)
      this.need(
        person,
        { kind: 'realized-outcome', evidenceId: outcome.evidenceId, needs: outcome.actual.psychological },
        context,
      );
    const after = this.projectContext(person, context);
    const realized: Partial<Record<T.NeedId, T.Signed>> = {};
    for (const id of ['food', 'water', 'relief'] as const)
      if (outcome.actual.consumed?.[id] !== undefined || (id === 'relief' && outcome.actual.voidedBladder))
        realized[id] = clampSigned(levelOf([...after.needs], id) - levelOf([...work.beforeNeeds], id));
    for (const [id, value] of Object.entries(outcome.actual.psychological ?? {})) {
      if (
        value !== undefined &&
        (id === 'safety' ||
          id === 'belonging' ||
          id === 'esteem' ||
          id === 'autonomy' ||
          id === 'competence' ||
          id === 'meaning' ||
          id === 'leisure')
      )
        realized[id] = value;
    }
    for (const id of ['sleep', 'rest'] as const)
      if (activity.offer.expected.needs[id] !== undefined)
        realized[id] = clampSigned(
          levelOf([...after.needs], id) - (activity.needsAtStart[id] ?? levelOf([...work.beforeNeeds], id)),
        );
    const defaults = context.effective.builtins.PERSON_DEFAULTS;
    let felt = 0;
    for (const reading of work.beforeNeeds)
      felt += defaults.feltGain * (defaults.feltBase + reading.urgency) * (realized[reading.id] ?? 0);
    if (outcome.status === 'failed') felt -= defaults.failedPenalty;
    if (outcome.actual.injury) felt -= outcome.actual.injury.severity;
    if (outcome.actual.illness) felt -= 0.5 * outcome.actual.illness.severity;
    if (outcome.actual.material) felt += 0.1 * Math.sign(outcome.actual.material);
    if (outcome.status === 'completed' && outcome.quality !== undefined)
      felt -= defaults.qualityPenalty * (1 - outcome.quality);
    felt = clampSigned(felt);
    this.effect(
      {
        id: hashCanonical('hf-run4/outcome-appraisal', input.id),
        cause: input.id,
        person,
        at: context.at,
        applyPhase: 6,
        from: 'run',
        to: 'affect',
        appraisal: {
          at: context.at,
          kind: 'outcome',
          desirability: felt,
          cause: `outcome:${activity.offer.actionId}${activity.offer.target === undefined ? '' : `@${activity.offer.target}`}`,
        },
      },
      context,
    );
    this.skills(person, { kind: 'practice', activity, outcome }, context);
    const current = this.actor(person),
      continuation = this.continuation(person);
    const habits = OWNERS.habits.learn(
      current.habits,
      { activity, outcome },
      { ...context, ...(current.lastAction === undefined ? {} : { lastAction: current.lastAction }) },
    );
    this.install(
      person,
      { habits: [...habits.state] },
      {
        deliberation: {
          ...continuation.deliberation,
          habits: { anchor: { at: context.at, conditionId: outcome.evidenceId }, state: habits.state },
        },
      },
    );
    this.output(person, 'habits', habits, context);
    // 3.x credited the episode to the one suggestion the decision credited (assented, complied or commanded).
    const followed = activity.suggestion;
    this.memory(
      person,
      {
        kind: 'outcome',
        outcome,
        offer: activity.offer,
        realized,
        felt,
        // One kind for a person's own settled action: 'outcome' (3.x person.ts finish). The after-action
        // cue (run-person.ts) and the voice distrust rule (will.ts) read it, with the followed voice.
        episode: {
          at: context.at,
          kind: 'outcome',
          action: outcome.actionId,
          actorId: person,
          ...(outcome.target === undefined ? {} : { targetId: outcome.target }),
          ...(followed === undefined ? {} : { voiceId: followed.voiceId }),
          ...(activity.offer.place === undefined ? {} : { placeId: activity.offer.place }),
          valence: felt,
          salience: clamp01(Math.abs(felt)),
          summary: outcome.summary ?? '',
          tags: [...activity.offer.tags, outcome.status],
        },
      },
      context,
    );
    this.conscience(person, { kind: 'act', activity, outcome }, context);
    const agendaResult = this.agenda(person, outcome, context);
    const kept = agendaResult.events.flatMap((event) =>
      event.kind === 'commitment-changed' && event.before !== 'kept' && event.after.status === 'kept'
        ? [event.commitmentId]
        : [],
    );
    this.projects(person, { kind: 'outcome', activity, outcome }, context);
    const prospects = OWNERS.prospection.receive(
      this.actor(person).prospection,
      { kind: 'completed-trigger', outcome, activity },
      context,
    );
    this.install(person, { prospection: prospects.state });
    this.output(person, 'prospection', prospects, context);
    const curiosity = OWNERS.curiosity.learn(
      this.actor(person).curiosity,
      { activity, outcome, expected: work.expected },
      { ...context, before: work.before, felt },
    );
    this.install(person, { curiosity: curiosity.state });
    this.output(person, 'curiosity', curiosity, context);
    if (curiosity.needReward) this.need(person, curiosity.needReward, context);
    if (outcome.status === 'completed') {
      for (const other of activity.offer.participants)
        if (other !== person)
          this.social(
            person,
            {
              kind: 'event',
              data: {
                person,
                evidenceId: outcome.evidenceId,
                other,
                event: {
                  kind: activity.offer.tags.includes('work') ? 'shared-work' : 'chat',
                  byMe: true,
                  magnitude: defaults.participationMagnitude,
                },
              },
            },
            context,
          );
      if (activity.offer.target && activity.offer.target !== person) {
        const kind = activity.offer.tags.includes('help')
          ? 'help'
          : activity.offer.tags.includes('gift')
            ? 'gift'
            : null;
        if (kind)
          this.social(
            person,
            {
              kind: 'event',
              data: {
                person,
                evidenceId: outcome.evidenceId,
                other: activity.offer.target,
                event: { kind, byMe: true, magnitude: 0.7 },
              },
            },
            context,
          );
      }
    }
    this.will(person, { kind: 'settled', activity, outcome, felt }, context);
    this.emit(
      person,
      {
        kind: 'action-settled',
        requestId: request.id,
        activityId: activity.id,
        disposition: resolution.disposition,
        outcomeEvidenceId: outcome.evidenceId,
        worldRevision: this.state.world.revision,
      },
      context,
      { activity, outcome, kept },
    );
    this.install(person, { activity: null, lastAction: outcome.actionId });
    this.stage.current.queue = this.state.queue.filter(
      (event) =>
        !(
          (event.data.kind === 'activity-finish' || event.data.kind === 'activity-review') &&
          event.data.activityId === activity.id
        ),
    );
    this.scheduleDecision(person, input.id);
    for (const observed of resolution.observations)
      this.observe(observed.person, observed.percepts, outcome.evidenceId, input.source.id, context);
  }
  issueCommunication(
    speaker: T.PersonId,
    recipients: readonly T.PersonId[],
    items: readonly T.CommunicationItem[],
    context: T.FrameContext,
  ): void {
    if (!items.length) return;
    const ordinal = this.state.counters.nextRequest++;
    if (!Number.isSafeInteger(this.state.counters.nextRequest))
      throw new RunLimitError('Request counter exhausted');
    const body: Omit<T.CommunicationRequest, 'requestHash'> = {
      kind: 'communication',
      id: hashCanonical('hf-run4/request-id', this.record.spec.id, ordinal),
      issuedAt: context.at,
      boundaryAt: context.at,
      worldRevision: this.state.world.revision,
      speaker,
      recipients: [...recipients],
      items,
    };
    const request = { ...body, requestHash: hashCanonical('hf-run4/request', body) };
    this.stage.current.pending = [...this.state.pending, request];
    this.stage.current.cursor = {
      ...this.state.cursor,
      resolutionLane: [...this.state.cursor.resolutionLane, request.id],
    };
    this.stage.receipts.allocated.push({
      scope: { kind: 'run' },
      reference: { kind: 'request', id: request.id },
      allocatedAt: context.at,
    });
    this.emit(speaker, { kind: 'communication-requested', request }, context);
  }
  conversation(input: T.DeepReadonly<T.Input<'conversation.requested'>>, context: T.FrameContext): void {
    const data = input.payload,
      speaker = this.actor(data.speaker);
    const heldDead = speaker.social.relationships
      .filter((tie) => tie.deceasedAt !== undefined || tie.roles.includes('deceased'))
      .map((tie) => tie.otherId);
    const conversation = conversationOwner.prepare(data, {
      ...context,
      person: data.speaker,
      speaker,
      norms: this.record.spec.definitions.norms,
      listenerKnown: {
        social: speaker.social,
        beliefs: { kind: 'unobserved' },
        alive: heldDead.includes(data.listener)
          ? { kind: 'known', value: false, evidenceIds: [] }
          : { kind: 'unobserved' },
        deceased: heldDead,
      },
    });
    const items: T.CommunicationItem[] = [];
    for (const [index, claim] of conversation.claims.entries())
      items.push({
        id: hashCanonical('hf-run4/claim-item', input.id, index),
        data: {
          kind: 'claim',
          private: claim,
          told: {
            prop: claim.prop,
            value: claim.value,
            confidence: claim.confidence,
            ...(claim.origin === undefined ? {} : { origin: claim.origin }),
            ...(claim.lineage === undefined ? {} : { lineage: claim.lineage }),
          },
        },
      });
    for (const [index, advice] of conversation.advice.entries())
      items.push({
        id: hashCanonical('hf-run4/advice-item', input.id, index),
        data: { kind: 'advice', percept: advice.percept, suggestion: advice.suggestion },
      });
    if (conversation.socialEvents.speaker.length !== conversation.socialEvents.listener.length)
      throw new TypeError('Unpaired prepared social receipt');
    for (const [index, event] of conversation.socialEvents.speaker.entries()) {
      const listener = conversation.socialEvents.listener[index];
      if (!listener) throw new TypeError('Missing prepared listener social receipt');
      items.push({
        id: hashCanonical('hf-run4/social-item', input.id, index),
        data: { kind: 'social-act', speaker: event, listener },
      });
    }
    if (conversation.norms.length)
      items.push({
        id: hashCanonical('hf-run4/speech-deed-item', input.id),
        data: { kind: 'speaker-deed', norms: conversation.norms },
      });
    this.issueCommunication(data.speaker, [data.listener], items, { ...context, person: data.speaker });
  }
  settleCommunication(
    input: T.DeepReadonly<T.Input<'communication.resolved'>>,
    context: T.FrameContext,
  ): void {
    const request = this.resolvedRequests.get(input.id),
      receipt = input.payload;
    if (!request || request.kind !== 'communication')
      throw new RangeError('Missing admitted communication request');
    const emitted = request.items.filter((item) => receipt.emittedItemIds.includes(item.id));
    this.stage.receipts.communications.push({
      requestId: request.id,
      inputId: input.id,
      requestHash: request.requestHash,
      receptions: receipt.received,
    });
    for (const item of emitted) {
      if (item.data.kind === 'speaker-deed' && this.actor(request.speaker).body.alive)
        for (const target of request.recipients)
          this.conscience(
            request.speaker,
            {
              kind: 'communication-deed',
              requestId: request.id,
              evidenceId: input.id,
              target,
              norms: item.data.norms,
              intention: '',
            },
            { ...context, person: request.speaker },
          );
      if (item.data.kind === 'social-act' && this.actor(request.speaker).body.alive)
        for (const other of request.recipients)
          this.social(
            request.speaker,
            {
              kind: 'event',
              data: { person: request.speaker, other, evidenceId: input.id, event: item.data.speaker },
            },
            { ...context, person: request.speaker },
          );
    }
    for (const reception of receipt.received) {
      const listener = this.actor(reception.recipient);
      if (!listener.body.alive || reception.attention <= 0) continue;
      const heard = emitted.filter((item) => reception.itemIds.includes(item.id));
      this.evidence(listener.id, reception.evidenceId, input.id);
      const listenerContext = { ...context, person: listener.id, causes: [input.id, reception.evidenceId] };
      const gists = heard.flatMap((item) => (item.data.kind === 'gist' ? [item.data] : []));
      if (gists.length) {
        const {
          beliefs: _beliefs,
          sourceTrust: _sourceTrust,
          contradictions: _contradictions,
          ...memory
        } = this.actor(listener.id).memory;
        const out = OWNERS.memory.receiveRetelling(
          memory,
          { requestId: request.id, speaker: request.speaker, reception, items: gists },
          {
            ...listenerContext,
            allocations: this.references(listener.id),
            sourceTrust:
              listener.memory.sourceTrust[request.speaker] ??
              context.effective.builtins.BELIEF_DEFAULTS.defaultTrust,
          },
        );
        this.memoryOutput(listener.id, out, listenerContext);
      }
      for (const item of heard)
        switch (item.data.kind) {
          case 'claim': {
            const event = this.emit(
              request.speaker,
              {
                kind: 'claim-told',
                speaker: request.speaker,
                listener: listener.id,
                deliveryRequestId: request.id,
                claim: item.data.private,
              },
              listenerContext,
            );
            const percept: T.PerceptData = {
              id: hashCanonical('hf-run4/heard-claim', request.id, item.id, listener.id),
              occurredAt: context.at,
              channel: 'told',
              kind: 'claim',
              actorId: request.speaker,
              targetId: listener.id,
              salience: Math.round((0.3 + 0.4 * item.data.told.confidence) * 1e9) / 1e9,
              summary:
                rendererOwner.render(
                  event,
                  { kind: 'person', observer: listener.id },
                  this.record.spec.definitions.lexicon,
                  this.record.spec.seed,
                )[0]?.text ?? '',
              claims: [item.data.told],
              norms: [],
              advice: [],
              consequences: [],
              withdrawConsequences: [],
              witnesses: [],
              reports: [],
              provenance: [reception.evidenceId],
            };
            this.observe(
              listener.id,
              [percept],
              reception.evidenceId,
              request.speaker,
              listenerContext,
              reception.attention,
            );
            break;
          }
          case 'advice': {
            this.observe(
              listener.id,
              [item.data.percept],
              reception.evidenceId,
              request.speaker,
              listenerContext,
              reception.attention,
            );
            this.will(
              listener.id,
              {
                kind: 'suggestion',
                received: { kind: 'ordinary', suggestion: item.data.suggestion },
                evidenceId: reception.evidenceId,
              },
              listenerContext,
            );
            this.stage.current.community = {
              ...this.state.community,
              queued: {
                ...this.state.community.queued,
                [listener.id]: [...(this.state.community.queued[listener.id] ?? []), item.data.suggestion],
              },
            };
            this.requestDecision(listener.id, 'reconsider', input.id);
            break;
          }
          case 'social-act':
            this.social(
              listener.id,
              {
                kind: 'event',
                data: {
                  person: listener.id,
                  other: request.speaker,
                  evidenceId: reception.evidenceId,
                  event: item.data.listener,
                },
              },
              listenerContext,
            );
            break;
        }
    }
    this.emit(
      request.speaker,
      { kind: 'communication-settled', requestId: request.id, received: receipt.received },
      context,
    );
  }
  private applyInput(input: T.DeepReadonly<T.Input>): void {
    if (this.disposed.has(input.id)) {
      this.applyOwnedInput(input);
      return;
    }
    const payload = input.payload;
    const person =
      'person' in payload && typeof payload.person === 'string'
        ? payload.person
        : 'speaker' in payload && typeof payload.speaker === 'string'
          ? payload.speaker
          : 'teller' in payload && typeof payload.teller === 'string'
            ? payload.teller
            : undefined;
    const actor = person === undefined ? undefined : this.state.people[person];
    const classified = classifyQueuedInput(input, {
      alive: actor?.body.alive ?? person === undefined,
      worldRevision: this.state.world.revision,
      ...(actor?.activity ? { activity: actor.activity } : {}),
      ...(input.kind === 'decision.requested'
        ? {
            offerAvailable: this.state.offers[input.payload.person]?.revision === input.payload.offerRevision,
          }
        : {}),
    });
    if (classified.kind === 'consumed') {
      if (person !== undefined && 'evidenceId' in payload && typeof payload.evidenceId === 'string')
        this.evidence(person, payload.evidenceId, input.id);
      this.applyOwnedInput(input);
    }
    const disposition: T.InputDisposition = {
      inputId: input.id,
      at: this.state.at,
      owner: 'run',
      ...classified,
      evidenceIds:
        'evidenceId' in payload && typeof payload.evidenceId === 'string' ? [payload.evidenceId] : [],
      causeIds: [input.id],
    };
    this.stage.receipts.dispositions.push(disposition);
    this.disposed.add(input.id);
    this.emit(
      person,
      { kind: 'input-disposed', disposition },
      this.context(person ?? this.record.spec.id, this.phase, [input.id]),
    );
  }
  flushContacts(): void {
    const people = [...new Set(this.contacts.map((input) => input.payload.person))].sort();
    for (const person of people) {
      const actor = this.actor(person);
      if (!actor.body.alive) continue;
      const inputs = this.contacts.filter((input) => input.payload.person === person);
      const context = this.context(
        person,
        3,
        inputs.map((input) => input.id),
      );
      const ids = [...new Set(inputs.map((input) => input.payload.caregiver))];
      const caregivers = ids.flatMap((id): T.UpbringingExposure['caregivers'][number][] => {
        const caregiver = this.commonPeople[id];
        if (!caregiver || !caregiver.body.alive) return [];
        return [
          {
            id,
            warmth: Math.max(
              0,
              caregiver.social.relationships.find((tie) => tie.otherId === person)?.affection ?? 0,
            ),
            values: caregiver.values,
            norms: caregiver.conscience.norms,
            breaches: caregiver.conscience.breaches.map((breach) => ({
              normId: breach.normId,
              at: breach.at,
            })),
            moodValence: caregiver.affect.mood.valence,
            voices: caregiver.will.voices.map((voice) => ({ voiceId: voice.voiceId, trust: voice.trust })),
          },
        ];
      });
      const out = OWNERS.family.receiveContacts(
        actor.family,
        inputs.map((input) => input.payload),
        { ...context, life: actor.life, caregivers, knownVoices: actor.will.voices },
      );
      this.install(person, { family: out.state });
      this.output(person, 'family', out, context);
      this.upbringing(person, out.upbringing, context);
    }
    this.contacts.length = 0;
  }
  upbringing(
    person: T.PersonId,
    receipts: T.DeepReadonly<readonly T.UpbringingExposure[]>,
    context: T.FrameContext,
  ): void {
    for (const exposure of receipts) {
      if (!this.actor(person).body.alive) continue;
      let current = this.actor(person),
        continuation = this.continuation(person);
      const character = OWNERS.character.receiveUpbringing(
        { character: current.character, traits: current.traits, values: current.values },
        exposure,
        {
          ...context,
          life: current.life,
          raisedMs: current.family.raisedMs ?? 0,
          continuation: continuation.narrative.character,
        },
      );
      this.installCharacter(person, character.state, character.continuation, context);
      this.output(person, 'character', character, context);
      current = this.actor(person);
      const conscience = OWNERS.conscience.receiveUpbringing(current.conscience, exposure, {
        ...context,
        life: current.life,
      });
      this.install(person, { conscience: conscience.state });
      this.output(person, 'conscience', conscience, context);
      current = this.actor(person);
      continuation = this.continuation(person);
      const will = OWNERS.will.receiveUpbringing(current.will, exposure, {
        ...context,
        life: current.life,
      });
      this.install(
        person,
        { will: will.state },
        {
          deliberation: {
            ...continuation.deliberation,
            will: { anchor: { at: context.at, conditionId: exposure.id }, state: will.state },
          },
        },
      );
      this.output(person, 'will', will, context);
    }
  }
  private applyOwnedInput(input: T.DeepReadonly<T.Input>): void {
    const payload = input.payload;
    const person = 'person' in payload && typeof payload.person === 'string' ? payload.person : undefined;
    const context = this.context(person ?? this.record.spec.id, this.phase, [input.id]);
    switch (input.kind) {
      case 'person.arrived':
        this.addPerson(input.payload.authored, input.id);
        return;
      case 'lifecycle.received':
        this.lifecycle(input.payload, input.id);
        return;
      case 'communication.resolved':
        this.settleCommunication(input, context);
        return;
      case 'conversation.requested':
        this.conversation(input, context);
        return;
      case 'retelling.requested': {
        const speaker = this.actor(input.payload.teller);
        const items = conversationOwner.prepareRetelling(input.payload, {
          ...context,
          person: speaker.id,
          speaker,
        });
        this.issueCommunication(speaker.id, [input.payload.listener], items, {
          ...context,
          person: speaker.id,
        });
        return;
      }
      case 'family.contact':
        this.contacts.push(input);
        return;
      case 'testimony.received':
        this.beliefs(
          input.payload.person,
          {
            kind: 'claims',
            teller: input.payload.teller,
            claims: input.payload.claims,
            attention: 1,
            evidenceId: input.payload.evidenceId,
          },
          context,
        );
        return;
      case 'activity.interrupted':
        this.interrupt(input.payload.person, input.payload.activityId, input.payload.reason, context);
        return;
      case 'action.resolved':
        this.settleAction(input, context);
        return;
      case 'world.changed': {
        const changed = applyWorldChange(this.state.world, input.payload, this.state.at);
        if (!changed.ok) throw new RangeError(changed.error.message);
        this.stage.current.world = changed.value;
        return;
      }
      case 'offers.received': {
        const data = input.payload;
        const ids = new Set<T.Id>();
        if (!Number.isSafeInteger(data.revision) || data.revision < 0)
          throw new RangeError('Invalid offer revision');
        const old = this.state.offers[data.person];
        if (old && data.revision <= old.revision) throw new RangeError('Offer revision must increase');
        for (const offer of data.offers) {
          if (
            offer.person !== data.person ||
            ids.has(offer.id) ||
            !Number.isSafeInteger(offer.durationMs) ||
            offer.durationMs < 1 ||
            !this.record.spec.definitions.actions.some((action) => action.id === offer.actionId)
          )
            throw new RangeError('Invalid offer identity, action or duration');
          ids.add(offer.id);
        }
        this.stage.current.offers = {
          ...this.state.offers,
          [data.person]: {
            revision: data.revision,
            receivedAt: this.state.at,
            cause: input.id,
            offers: data.offers.map(copyOffer),
            rejected: [],
          },
        };
        if (!this.actor(data.person).activity) this.requestDecision(data.person, 'ordinary', input.id);
        return;
      }
      case 'context.received': {
        const data = input.payload,
          actor = this.actor(data.person);
        const received: T.Knowledge<T.Unit> = {
          kind: 'known',
          value: data.context.value,
          evidenceIds: [data.evidenceId],
        };
        this.install(data.person, {
          context: {
            ...actor.context,
            ...(data.context.kind === 'scarcity' ? { scarcity: received } : { smoking: received }),
          },
        });
        return;
      }
      case 'decision.requested': {
        const data = input.payload;
        if (this.state.offers[data.person]?.revision !== data.offerRevision)
          throw new RangeError('Decision offer revision changed');
        this.requestDecision(data.person, data.treatment, input.id);
        return;
      }
      case 'observation.received':
        this.observe(
          input.payload.person,
          input.payload.percepts,
          input.payload.evidenceId,
          input.source.id,
          context,
        );
        return;
      case 'ambient.received':
      case 'ambient.left': {
        const data = input.payload,
          actor = this.actor(data.person);
        const endpoint: T.DeepReadonly<T.EnvironmentEndpoint> =
          input.kind === 'ambient.received'
            ? { kind: 'received', evidenceId: input.payload.evidenceId, evidence: input.payload.environment }
            : { kind: 'left', contextId: input.payload.contextId };
        const out = OWNERS.environment.receive(actor.ambient, endpoint, {
          ...context,
          alive: actor.body.alive,
        });
        this.install(data.person, { ambient: out.state });
        this.output(data.person, 'environment', out, context);
        if (input.kind === 'ambient.received' && input.payload.environment.dozeContext)
          this.body(
            data.person,
            {
              kind: 'ambient-context',
              context: input.payload.environment.dozeContext,
              basis: input.payload.environment.basis,
            },
            context,
          );
        for (const receipt of out.affectReceipts) this.affect(data.person, receipt, context);
        return;
      }
      case 'body.received': {
        const { person, receipt } = input.payload;
        if (receipt.type === 'physical-contact') {
          this.receipt(person, 'body', receipt.contactId, input.id, receipt);
          const actor = this.actor(person),
            continuation = this.continuation(person);
          const out = OWNERS.body.receiveContact(actor.body, receipt, {
            ...context,
            continuation: continuation.body,
            dozeContinuation: continuation.doze,
            rng: { words: actor.rng, identity: actor.randomIdentity },
          });
          this.install(
            person,
            { body: out.state, rng: out.rng.words, randomIdentity: out.rng.identity },
            { body: out.continuation, doze: out.dozeContinuation },
          );
          this.output(person, 'body', out, context);
        } else this.body(person, { kind: 'receipt', id: input.payload.evidenceId, receipt }, context);
        return;
      }
      case 'social.received':
        this.social(input.payload.person, { kind: 'event', data: input.payload }, context);
        return;
      case 'person.glimpsed':
        this.social(input.payload.person, { kind: 'glimpse', data: input.payload }, context);
        return;
      case 'person.reported':
        this.social(input.payload.person, { kind: 'report', data: input.payload }, context);
        return;
      case 'act.witnessed':
        this.social(input.payload.person, { kind: 'act', data: input.payload }, context);
        return;
      case 'acquaintance.received':
        this.social(input.payload.person, { kind: 'acquaintance', data: input.payload }, context);
        return;
      case 'groups.received':
        this.social(input.payload.person, { kind: 'groups', data: input.payload }, context);
        return;
      case 'death.heard': {
        // Hearing of a death is told news (3.x sim.ts tellDeath): attended like any told percept, so it
        // leaves an episode and, for someone close, grief. The tie is then marked deceased.
        const data = input.payload,
          name = this.state.people[data.deceased]?.name,
          tie = this.actor(data.person).social.relationships.find((r) => r.otherId === data.deceased);
        // Only news of someone known, and only the first time, is news (3.x tellDeath and markDeceased).
        if (tie && tie.deceasedAt === undefined)
          this.observe(
            data.person,
            [
              {
                id: hashCanonical('hf-run4/death-heard', input.id),
                occurredAt: context.at,
                channel: 'told',
                kind: 'death',
                targetId: data.deceased,
                valence: -0.8,
                salience: 0.9,
                summary: name === undefined ? '' : `${name} died.`,
                claims: [],
                norms: [],
                advice: [],
                consequences: [],
                withdrawConsequences: [],
                witnesses: [],
                reports: [],
                provenance: [data.evidenceId],
              },
            ],
            data.evidenceId,
            data.reporter,
            context,
          );
        this.social(data.person, { kind: 'death-heard', data }, context);
        return;
      }
      case 'contradiction.received':
        this.beliefs(input.payload.person, { kind: 'contradiction', ...input.payload }, context);
        return;
      case 'fact.confirmed':
        this.beliefs(input.payload.person, { kind: 'confirm', ...input.payload }, context);
        return;
      case 'suggestion.received': {
        const received = input.payload.received;
        const suggestion =
          received.kind === 'ordinary'
            ? received.suggestion
            : OWNERS.partnering.familyVoice(received, context);
        if (suggestion)
          this.stage.current.community = {
            ...this.state.community,
            queued: {
              ...this.state.community.queued,
              [input.payload.person]: [
                ...(this.state.community.queued[input.payload.person] ?? []),
                suggestion,
              ],
            },
          };
        this.will(
          input.payload.person,
          { kind: 'suggestion', received: input.payload.received, evidenceId: input.id },
          context,
        );
        this.requestDecision(input.payload.person, 'reconsider', input.id);
        return;
      }
      case 'advice.withdrawn':
        this.will(input.payload.person, { kind: 'advice-withdrawn', data: input.payload }, context);
        return;
      case 'coercion.received':
        this.will(input.payload.person, { kind: 'coercion', data: input.payload }, context);
        this.requestDecision(input.payload.person, 'reconsider', input.id);
        return;
      case 'coercion.withdrawn':
        this.will(input.payload.person, { kind: 'coercion-withdrawn', data: input.payload }, context);
        return;
      case 'voice.promise-received':
        this.will(input.payload.person, { kind: 'promise', data: input.payload }, context);
        return;
      case 'method.cues':
        this.methods(
          input.payload.person,
          {
            kind: 'cues',
            evidenceId: input.payload.evidenceId,
            contextId: input.payload.contextId,
            cues: input.payload.cues,
          },
          context,
        );
        return;
      case 'method.context-left':
        this.methods(
          input.payload.person,
          { kind: 'context-left', contextId: input.payload.contextId },
          context,
        );
        return;
      case 'method.demonstrated':
        this.methods(input.payload.person, { kind: 'demonstration', data: input.payload }, context);
        return;
      case 'skill.witnessed':
        this.skills(input.payload.person, { kind: 'witness', data: input.payload }, context);
        return;
      case 'agenda.received':
        this.agenda(input.payload.person, input.payload.evidence, context);
        return;
      case 'agenda.requested': {
        const request = input.payload.request;
        if (request.type === 'precommit' || request.type === 'release-precommitment')
          this.will(input.payload.person, request, context);
        else this.agenda(input.payload.person, request, context);
        return;
      }
      case 'norm.interpretation-received':
        this.conscience(input.payload.person, { kind: 'interpretation', data: input.payload }, context);
        return;
      case 'repair.received':
        this.conscience(input.payload.person, { kind: 'repair', data: input.payload }, context);
        return;
      case 'repentance.requested':
        this.conscience(input.payload.person, { kind: 'repent', data: input.payload }, context);
        return;
      case 'practice.requested':
        this.affect(
          input.payload.person,
          { kind: 'regulated', practice: input.payload.practice, durationMs: input.payload.durationMs },
          context,
        );
        return;
      case 'review.requested':
        this.review(input.payload.person, context);
        return;
      case 'consequences.received': {
        const data = input.payload,
          actor = this.actor(data.person);
        const out = OWNERS.prospection.receive(actor.prospection, { kind: 'received', data }, context);
        this.install(data.person, { prospection: out.state });
        this.output(data.person, 'prospection', out, context);
        return;
      }
      case 'routine.authored': {
        const data = input.payload;
        this.installRoutine(
          data.person,
          data.scheduleId,
          data.entries,
          { kind: 'input', inputId: input.id },
          input.id,
          false,
        );
        return;
      }
      case 'routine.withdrawn':
        this.stage.current.routines = this.state.routines.filter(
          (routine) => routine.person !== input.payload.person || routine.id !== input.payload.scheduleId,
        );
        this.stage.current.queue = this.state.queue.filter(
          (event) =>
            event.data.kind !== 'routine-opportunity' ||
            event.data.person !== input.payload.person ||
            event.data.scheduleId !== input.payload.scheduleId,
        );
        return;
      case 'chapter.elapsed': {
        const data = input.payload;
        const clock = this.state.chapter[data.chapterId];
        if (!clock || clock.wallAtMs !== data.fromWallMs)
          throw new RangeError('Chapter clock is not initialized at its declared wall watermark');
        const projected = projectChapterClock(clock, data.untilWallMs);
        if (!projected.ok) throw new RangeError(projected.error.message);
        this.stage.current.chapter = { ...this.state.chapter, [data.chapterId]: projected.value.clock };
        this.emit(
          undefined,
          { kind: 'chapter-change', chapterId: data.chapterId, projection: projected.value },
          context,
        );
        return;
      }
    }
    const unfinished: never = input;
    throw new TypeError(`Unimplemented input ${unfinished}`);
  }
  installRoutine(
    person: T.PersonId,
    id: T.Id,
    entries: T.DeepReadonly<readonly T.RoutineEntry[]>,
    source: T.ActiveRoutine['source'],
    cause: T.Id,
    allowPast: boolean,
  ): void {
    this.actor(person);
    const ids = new Set<T.Id>();
    for (const entry of entries) {
      if (
        ids.has(entry.id) ||
        entry.offer.person !== person ||
        entry.offer.durationMs < 1 ||
        !Number.isSafeInteger(entry.offer.durationMs) ||
        !this.record.spec.definitions.actions.some((action) => action.id === entry.offer.actionId)
      )
        throw new RangeError('Routine has duplicate, foreign or invalid action entries');
      ids.add(entry.id);
      if (!allowPast && entry.at < this.state.at) throw new RangeError('Routine entry precedes receipt');
    }
    const copied = entries.map((entry): T.RoutineEntry => {
      const { received, ...rest } = entry;
      return {
        ...rest,
        offer: copyOffer(entry.offer),
        ...(received ? { received: { ...received, percepts: received.percepts.map(copyPercept) } } : {}),
      };
    });
    this.stage.current.routines = [
      ...this.state.routines.filter((routine) => routine.person !== person || routine.id !== id),
      { person, id, entries: copied, source },
    ];
    this.stage.current.queue = [
      ...this.state.queue.filter(
        (event) =>
          event.data.kind !== 'routine-opportunity' ||
          event.data.person !== person ||
          event.data.scheduleId !== id,
      ),
      ...copied
        .filter((entry) => entry.at >= this.state.at)
        .map(
          (entry): T.ScheduledEvent => ({
            id: hashCanonical('hf-run4/routine', person, id, entry.id, cause),
            at: entry.at,
            phase: 2,
            person,
            causalId: cause,
            localOrdinal: 0,
            data: { kind: 'routine-opportunity', person, scheduleId: id, entryId: entry.id },
          }),
        ),
    ];
  }
  installDefinitionRoutines(person: T.PersonId): void {
    for (const routine of this.record.spec.definitions.routines)
      if (routine.entries[0]?.offer.person === person)
        this.installRoutine(
          person,
          routine.id,
          routine.entries,
          { kind: 'definition', id: routine.id },
          routine.id,
          true,
        );
  }
  routine(person: T.PersonId, entry: T.DeepReadonly<T.RoutineEntry>, cause: T.Id): void {
    const actor = this.actor(person);
    if (!actor.body.alive) return;
    const words = { ...actor.rng };
    const selected = random(words) < entry.chance;
    this.install(person, {
      rng: words,
      randomIdentity: { ...actor.randomIdentity, uniformDraws: actor.randomIdentity.uniformDraws + 1 },
    });
    if (!selected) return;
    if (entry.received)
      this.observe(
        person,
        entry.received.percepts,
        entry.received.evidenceId,
        this.record.spec.host.id,
        this.context(person, 2, [cause]),
      );
    const prior = this.state.offers[person];
    if (!prior) throw new RangeError('Routine offer requires an actual received offer book');
    if (!prior.offers.some((offer) => offer.id === entry.offer.id))
      throw new RangeError('Routine offer is absent from the current host snapshot');
    this.requestDecision(person, 'ordinary', cause);
  }
  closeDay(person: T.PersonId, cause: T.Id): void {
    const actor = this.actor(person),
      context = this.context(person, 4, [cause]);
    if (actor.chronicleDay.day >= Math.floor(context.at / 86400000)) return;
    const out = OWNERS.chronicle.close(
      { days: actor.chronicle, years: actor.chronicleYears, open: actor.chronicleDay },
      { ...context, snapshot: actor },
    );
    const prior = this.continuation(person);
    this.install(
      person,
      {
        chronicle: [...out.state.days],
        chronicleYears: [...out.state.years],
        chronicleDay: out.state.open,
      },
      {
        narrative: {
          ...prior.narrative,
          chronicle: { anchor: { at: context.at, conditionId: cause }, open: out.state.open },
        },
      },
    );
    this.output(person, 'chronicle', out, context);
    const current = this.actor(person),
      continuation = this.continuation(person);
    const changed = OWNERS.character.receiveDay(
      { character: current.character, traits: current.traits, values: current.values },
      out.day,
      { ...context, socialMs: out.socialMs, continuation: continuation.narrative.character },
    );
    this.installCharacter(person, changed.state, changed.continuation, context);
    this.output(person, 'character', changed, context);
  }
  hazard(person: T.PersonId, boundary: T.DeepReadonly<T.HazardBoundary>, mood?: T.AffectTrajectory): void {
    const actor = this.actor(person),
      continuation = this.continuation(person),
      context = this.context(person, 2, [boundary.key.channelId]);
    const rng = { words: actor.rng, identity: actor.randomIdentity };
    switch (boundary.key.kind) {
      case 'doze': {
        const out = OWNERS.body.commitHazard(
          actor.body,
          { ...boundary, key: { ...boundary.key, kind: 'doze' } },
          { ...context, continuation: continuation.body, dozeContinuation: continuation.doze, rng },
        );
        this.install(
          person,
          { body: out.state, rng: out.rng.words, randomIdentity: out.rng.identity },
          { body: out.continuation, doze: out.dozeContinuation },
        );
        this.output(person, 'body', out, context);
        if (out.state.asleep && actor.activity && actor.activity.dozedAt === undefined) {
          this.install(person, { activity: { ...actor.activity, dozedAt: context.at } });
          this.interrupt(person, actor.activity.id, 'dozed', context);
        }
        return;
      }
      case 'crisis': {
        if (!mood) throw new TypeError('Reached crisis hazard requires its actual mood trajectory');
        const out = OWNERS.crisis.commitHazard(
          actor.affect.crisis,
          { ...boundary, key: { ...boundary.key, kind: 'crisis' } },
          {
            ...context,
            continuation: continuation.crisis,
            rng,
            alive: actor.body.alive,
            asleep: actor.body.asleep,
            traits: actor.traits,
            mood,
          },
        );
        this.install(
          person,
          {
            affect: { ...actor.affect, crisis: out.state },
            rng: out.rng.words,
            randomIdentity: out.rng.identity,
          },
          { crisis: out.continuation },
        );
        this.output(person, 'crisis', out, context);
        return;
      }
      case 'chronic':
      case 'mortality': {
        const out = OWNERS.life.commitHazard(
          actor.life,
          { ...boundary, key: { ...boundary.key, kind: boundary.key.kind } },
          {
            ...context,
            continuation: continuation.life,
            rng,
            alive: actor.body.alive,
            heldConditionKinds: actor.body.illnesses.map((illness) => illness.kind),
          },
        );
        this.install(
          person,
          { life: out.state, rng: out.rng.words, randomIdentity: out.rng.identity },
          { life: out.continuation },
        );
        this.output(person, 'lifecourse', out, context);
        this.lifeReceipts(person, out.bodyReceipts, context);
        return;
      }
    }
  }
  lifeReceipts(
    person: T.PersonId,
    receipts: ReturnType<T.LifecycleOwner['advance']>['bodyReceipts'],
    context: T.FrameContext,
  ): void {
    for (const receipt of receipts) {
      if (receipt.kind === 'illness-onset')
        this.body(
          person,
          {
            kind: 'receipt',
            id: hashCanonical('hf-run4/illness', person, context.at, receipt.illness),
            receipt: { type: 'illness', illness: receipt.illness },
          },
          context,
        );
      else
        this.lifecycle(
          {
            type: 'death',
            person: { kind: 'actor', id: person },
            basis: {
              evidence: { kind: 'evidence', id: hashCanonical('hf-run4/mortality', person, receipt.at) },
              worldRevision: this.state.world.revision,
            },
          },
          context.causes[0] ?? person,
        );
    }
  }
  addPerson(input: T.DeepReadonly<T.PersonAuthoring>, cause: T.Id): void {
    const admitted = checkPersonAuthoring(this.state, this.record.spec.definitions, false, input);
    if (!admitted.ok) throw new RangeError(admitted.error.message);
    if (input.admission) throw new RangeError('Portable admission composition is incomplete');
    const context = this.context(input.id, 1, [cause]);
    const built = constructAuthoredActor(admitted.value, context, this.record.spec.seed, OWNERS);
    const issues = validateActor(
      built.actor,
      built.continuation,
      built.allocations,
      context.at,
      this.record.parameters.hash,
      OWNERS,
    );
    if (issues[0]) throw new RangeError(issues[0].message);
    this.stage.current.people = { ...this.state.people, [input.id]: built.actor };
    this.stage.current.continuations = [...this.state.continuations, built.continuation];
    this.stage.current.ownerClocks = [...this.state.ownerClocks, ...built.clocks];
    this.stage.current.lifecycle = {
      ...this.state.lifecycle,
      entities: this.state.lifecycle.entities.some((entity) => entity.id === input.id)
        ? this.state.lifecycle.entities
        : [...this.state.lifecycle.entities, { kind: 'entity', id: input.id }],
      origins: [
        ...this.state.lifecycle.origins,
        { person: input.id, origin: { kind: 'authored', basis: input.origin.basis } },
      ],
    };
    for (const reference of built.allocations) this.allocate(input.id, reference);
    for (const event of built.constructionEvents) this.emit(input.id, event, context);
    this.installDefinitionRoutines(input.id);
    for (const effect of [
      ...built.constructionEffects.terms,
      ...built.constructionEffects.modifiers,
      ...built.constructionEffects.appraisals,
    ])
      this.effect(effect, context);
  }
  inheritedNewborn(
    input: T.DeepReadonly<T.InheritedNewborn>,
    basis: T.DeepReadonly<T.ActualBasis>,
    cause: T.Id,
  ): void {
    if (input.parents[0].id === input.parents[1].id)
      throw new RangeError('Inheritance requires two distinct parents');
    const parents = input.parents.map((parent) => this.actor(parent.id));
    const first = parents[0],
      second = parents[1];
    if (!first || !second) throw new RangeError('Two admitted inheritance parents required');
    let cursor = constructionStream(this.record.spec.seed, { kind: 'inheritance', child: input.id });
    if (this.state.lifecycle.streams.some((stream) => stream.id === cursor.id))
      throw new RangeError('Inheritance identity already used');
    let sex: T.LifeCourse['sex'];
    if (input.sex.kind === 'authored') sex = input.sex.value;
    else {
      sex = random(cursor.words) < 0.5 ? 'female' : 'male';
      cursor.uniformDraws++;
    }
    const traits = OWNERS.character.deriveTraits([first.traits, second.traits], cursor);
    cursor = traits.rng;
    const aptitudes = OWNERS.family.deriveAptitudes(
      [first.family, second.family],
      this.record.spec.definitions.skills,
      cursor,
    );
    cursor = aptitudes.rng;
    const person: T.PersonAuthoring = {
      id: input.id,
      identity: { ...input.identity, birthAt: this.state.at, sex },
      biography: [],
      origin: {
        kind: 'authored',
        basis: basis.evidence,
        traits: { kind: 'explicit-authoring', evidence: basis.evidence },
      },
      state: {
        ...input.context,
        traits: traits.traits,
        skills: [],
        heldNorms: [],
        beliefs: [],
        consequences: [],
        sourceTrust: [],
        context: { scarcity: { kind: 'unobserved' }, smoking: { kind: 'unobserved' } },
        relationships: [],
        voices: [],
        agenda: {
          commitments: [],
          goals: [],
          precommitments: [],
          owed: [],
          exemptions: { traveling: { kind: 'unobserved' }, illnessSeverity: { kind: 'unobserved' } },
        },
        family: { contactCovered: [], aptitudes: aptitudes.aptitudes },
        groups: [],
        // Source d87 person.ts:330 neutral learned-values prior; never genetic inheritance.
        values: {
          benevolence: 0.5,
          universalism: 0.5,
          tradition: 0.5,
          conformity: 0.5,
          security: 0.5,
          achievement: 0.5,
          power: 0.5,
          hedonism: 0.5,
          stimulation: 0.5,
          selfDirection: 0.5,
        },
        habits: [],
        expectations: [],
        bonds: { courtships: [], marriages: [] },
      },
    };
    this.addPerson(person, cause);
    const { words, ...stream } = cursor;
    this.stage.current.lifecycle = {
      ...this.state.lifecycle,
      streams: [...this.state.lifecycle.streams, { ...stream, state: words, status: 'completed' }],
      origins: this.state.lifecycle.origins.map((origin) =>
        origin.person === input.id
          ? {
              person: input.id,
              origin: {
                kind: 'two-parent-derived',
                parents: [
                  { kind: 'entity', id: first.id },
                  { kind: 'entity', id: second.id },
                ],
                parentSnapshotHash: hashCanonical(
                  'hf-run4/inheritance-parents',
                  first.traits,
                  second.traits,
                  first.family,
                  second.family,
                ),
                inheritanceStream: cursor.id,
              },
            }
          : origin,
      ),
    };
  }
  lifecycle(input: T.DeepReadonly<T.Lifecycle>, cause: T.Id): void {
    if (input.basis.worldRevision !== this.state.world.revision)
      throw new RangeError('Lifecycle receipt requires the current world revision');
    if (input.type === 'kin-premise') {
      if (
        input.scope.at !== this.state.at ||
        !(
          input.scope.kinRevision === this.state.lifecycle.kinRevision + 1 ||
          (input.scope.kinRevision === this.state.lifecycle.kinRevision && input.premises.length === 0)
        )
      )
        throw new RangeError(
          'Kin scope must describe the current facts or next authoritative revision at this frame',
        );
      const premises = [...this.state.lifecycle.kinPremises];
      for (const premise of input.premises) {
        if (premises.some((old) => old.id === premise.id)) throw new RangeError('Duplicate kin premise');
        premises.push(cloneData(premise));
      }
      if (input.scope.premiseIds.some((id) => !premises.some((premise) => premise.id === id)))
        throw new RangeError('Kin scope references an absent premise');
      const entities = new Map(this.state.lifecycle.entities.map((entity) => [entity.id, entity]));
      for (const premise of premises) {
        entities.set(premise.from.id, premise.from);
        entities.set(premise.to.id, premise.to);
      }
      for (const entity of input.scope.people) entities.set(entity.id, entity);
      this.stage.current.lifecycle = {
        ...this.state.lifecycle,
        kinRevision: input.scope.kinRevision,
        kinPremises: premises,
        kinScopes: [
          ...this.state.lifecycle.kinScopes.filter((scope) => scope.id !== input.scope.id),
          cloneData(input.scope),
        ],
        entities: [...entities.values()],
      };
      return;
    }
    if (input.type === 'conception' || input.type === 'birth') {
      const receivedEntities: T.EntityRef[] =
        input.type === 'conception'
          ? [input.father.entity, input.offspring]
          : input.child.kind === 'reference'
            ? [input.child.child]
            : [];
      const entities = new Map(this.state.lifecycle.entities.map((entity) => [entity.id, entity]));
      for (const entity of receivedEntities) entities.set(entity.id, { ...entity });
      this.stage.current.lifecycle = { ...this.state.lifecycle, entities: [...entities.values()] };

      if (input.type === 'birth' && input.child.kind === 'create') {
        if (input.child.newborn.kind === 'authored') {
          if (input.child.newborn.person.identity.birthAt !== this.state.at)
            throw new RangeError('Newborn birthAt must equal its actual birth frame');
          this.addPerson(input.child.newborn.person, cause);
        } else this.inheritedNewborn(input.child.newborn, input.basis, cause);
      }
      const mother =
        input.type === 'conception'
          ? input.mother.id
          : input.delivery.kind === 'open-pregnancy'
            ? input.delivery.mother.id
            : undefined;
      if (mother === undefined) return;
      const actor = this.actor(mother),
        context = this.context(mother, 1, [cause]);

      const cursor =
        input.type === 'conception'
          ? constructionStream(this.record.spec.seed, {
              kind: 'gestation',
              mother,
              pregnancyId: input.pregnancyId,
            })
          : undefined;
      if (cursor && this.state.lifecycle.streams.some((stream) => stream.id === cursor.id))
        throw new RangeError('Gestation identity already used');
      const out = OWNERS.family.receive(actor.family, input, {
        ...context,
        life: actor.life,
        body: actor.body,
        ...(actor.family.pregnancy ? { pregnancy: actor.family.pregnancy } : {}),
        construction: cursor ? { kind: 'gestation', cursor } : { kind: 'none' },
      });
      this.install(mother, { family: out.state });
      if (out.construction.kind === 'gestation') {
        const { words, ...stream } = out.construction.cursor;
        this.stage.current.lifecycle = {
          ...this.state.lifecycle,
          streams: [...this.state.lifecycle.streams, { ...stream, state: words }],
        };
      }
      this.output(mother, 'family', out, context);
      for (const receipt of out.memoryReceipts) {
        const current = this.actor(mother);
        const { beliefs, sourceTrust, contradictions, ...memory } = current.memory;
        this.memoryOutput(
          mother,
          OWNERS.memory.receiveMaternalBirth(memory, receipt, {
            ...context,
            allocations: this.references(mother),
          }),
          context,
        );
      }
      return;
    }
    if (input.type === 'death') {
      const context = this.context(input.person.id, 1, [cause]);
      this.body(input.person.id, { kind: 'actual-death', evidenceId: input.basis.evidence.id }, context);
    }
    const snapshot = this.state.people;
    const people =
      input.type === 'death' ? Object.keys(snapshot).sort() : input.partners.map((ref) => ref.id).sort();
    const knownKin =
      input.type === 'marriage'
        ? kinSnapshot(this.state, input.kinScopeId, [input.partners[0].id, input.partners[1].id])
        : undefined;
    for (const person of people) {
      const actor = this.actor(person),
        context = this.context(person, 1, [cause]);
      const custom =
        input.type === 'marriage'
          ? this.record.spec.definitions.marriageCustoms.find((custom) => custom.id === input.customId)
          : undefined;
      const out = OWNERS.partnering.receive(actor.bonds, input, {
        ...context,
        life: actor.life,
        body: actor.body,
        ...(custom ? { custom } : {}),
        rng: { words: actor.rng, identity: actor.randomIdentity },
        actors: Object.values(snapshot).map((actor) => ({ ...actor, ...(knownKin ? { knownKin } : {}) })),
      });
      this.install(person, { bonds: out.state });
      this.output(person, 'partnering', out, context);
      for (const receipt of out.receipts.social) this.social(person, receipt, context);
      for (const receipt of out.receipts.memory) this.memory(person, receipt, context);
      for (const receipt of out.receipts.affect) this.affect(person, receipt, context);
    }
  }
  observe(
    person: T.PersonId,
    percepts: T.DeepReadonly<readonly T.PerceptData[]>,
    evidenceId: T.Id,
    sourceId: T.Id,
    context: T.FrameContext,
    attention = 1,
  ): void {
    const actor = this.actor(person);
    if (!actor.body.alive || attention <= 0) return;
    const body = OWNERS.body.read(actor.body, { ...context, perception: bodyPerception(actor, context.at) });
    const selected = attendEvidence(actor, percepts, {
      focus: actor.activity?.offer.demands.focus ?? 0,
      fatigue: body.perceived.fatigue,
      fear: actor.affect.emotions.find((emotion) => emotion.id === 'fear')?.intensity ?? 0,
      interests: actor.agenda.goals.flatMap((goal) => goal.advancedBy.map((action) => action.action)),
      defaults: context.effective.builtins.BELIEF_DEFAULTS,
    });
    for (const percept of selected) {
      this.receipt(person, 'memory', percept.id, context.causes[0] ?? evidenceId, percept);
      this.body(person, { kind: 'wake', evidence: percept }, context);
      const current = this.actor(person),
        prior = this.continuation(person);
      const prospect = OWNERS.prospection.receive(
        current.prospection,
        {
          kind: 'received',
          data: {
            person,
            evidenceId,
            sourceId,
            claims: percept.consequences,
            withdrawals: percept.withdrawConsequences,
          },
        },
        context,
      );
      this.install(
        person,
        { prospection: prospect.state },
        {
          deliberation: {
            ...prior.deliberation,
            prospection: { anchor: { at: context.at, conditionId: percept.id }, state: prospect.state },
          },
        },
      );
      this.output(person, 'prospection', prospect, context);
      this.projects(person, { kind: 'attended', percept }, context);
      if (percept.channel === 'told' && percept.advice.length)
        this.will(person, { kind: 'advice', percept, evidenceId }, context);
      if (
        percept.demonstrates &&
        percept.actorId !== undefined &&
        percept.actorId !== person &&
        percept.demonstrates.durationMs > 0
      )
        this.skills(
          person,
          {
            kind: 'witness',
            data: {
              person,
              evidenceId,
              teacher: percept.actorId,
              skill: percept.demonstrates.skill,
              durationMs: percept.demonstrates.durationMs,
              modelLevel: percept.demonstrates.level,
              domain: percept.demonstrates.domain,
            },
          },
          context,
        );
      this.memory(person, { kind: 'attended', percept, attention }, context);
      this.social(person, { kind: 'attended', percept }, context);
      for (const claim of percept.claims) {
        const direct = percept.channel === 'saw' || percept.channel === 'felt';
        if (direct && claim.confidence >= 0.9)
          this.beliefs(
            person,
            { kind: 'confirm', prop: claim.prop, value: claim.value, observationId: percept.id, evidenceId },
            context,
          );
        else {
          const teller = direct ? person : (percept.actorId ?? sourceId);
          this.beliefs(
            person,
            {
              kind: 'claims',
              teller,
              claims: [{ ...claim, sourceId: teller, evidenceId, provenance: percept.provenance }],
              attention,
              evidenceId,
            },
            context,
          );
        }
      }
      this.emit(
        person,
        {
          kind: 'observation-attended',
          evidenceId,
          perceptId: percept.id,
          attention,
          deliveredAt: context.at,
          occurredAt: percept.occurredAt,
        },
        context,
      );
    }
  }
}
