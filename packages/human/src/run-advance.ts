/** SCOPE: bounded RNG-free continuous proposals from frozen common-time views.
 * A proposal is private staging, never a committed actor. The dispatcher restages
 * every actor to the globally earliest boundary before committing reached effects.
 * Caller targets do not create decisions, semantic events or random draws.
 */

import { projectCharacterTrajectory } from './character/character.ts';
import { compareCodePoints } from './run-canonical.ts';
import { bodyPerception } from './run-person.ts';
import type * as T from './run-schema.ts';

export type PhysiologyOwners = {
  body: Pick<T.BodyOwner, 'advance'>;
  needs: Pick<T.NeedsOwner, 'advance'>;
  affect: Pick<T.AffectOwner, 'advance'>;
  crisis: Pick<T.CrisisOwner, 'advance'>;
  life: Pick<T.LifecycleOwner, 'advance'>;
  environment: Pick<T.EnvironmentOwner, 'forcing' | 'trajectory'>;
  will: Pick<T.WillOwner, 'commandForcing'>;
};
export type RetainedOwners = {
  family: Pick<T.FamilyOwner, 'advance'>;
  agenda: Pick<T.AgendaOwner, 'advance'>;
  beliefs: Pick<T.BeliefOwner, 'advance'>;
  memory: Pick<T.MemoryOwner, 'advance'>;
  social: Pick<T.SocialOwner, 'advance'>;
  habits: Pick<T.HabitsOwner, 'advance'>;
  skills: Pick<T.SkillsOwner, 'advance'>;
  promptings: Pick<T.PromptingsOwner, 'advance'>;
  character: Pick<T.CharacterOwner, 'advance'>;
  will: Pick<T.WillOwner, 'advance'>;
  persistence: Pick<T.PersistenceOwner, 'advance'>;
};
export type RetainedProposal = {
  person: T.PersonId;
  family: ReturnType<T.FamilyOwner['advance']>;
  agenda: ReturnType<T.AgendaOwner['advance']>;
  beliefs: ReturnType<T.BeliefOwner['advance']>;
  memory: ReturnType<T.MemoryOwner['advance']>;
  social: ReturnType<T.SocialOwner['advance']>;
  habits: ReturnType<T.HabitsOwner['advance']>;
  skills: ReturnType<T.SkillsOwner['advance']>;
  promptings: ReturnType<T.PromptingsOwner['advance']>;
  character: ReturnType<T.CharacterOwner['advance']>;
  will: ReturnType<T.WillOwner['advance']>;
  persistence: ReturnType<T.PersistenceOwner['advance']>;
};

/** Probe retained faculties from the same frozen frame as physiology. A memory
 * fold, command expiry or agenda boundary can shorten the global span. Their
 * effects and receipts remain private proposals until the whole span is reached.
 */
export function probeRetained(
  state: T.DeepReadonly<Pick<T.RunState, 'at' | 'people' | 'continuations' | 'world'>>,
  to: T.Time,
  fidelity: T.DeepReadonly<T.Fidelity>,
  effective: T.EffectiveParameters,
  effectiveParametersHash: T.Hash,
  catalog: T.DeepReadonly<readonly T.SourcedNorm[]>,
  allocations: T.DeepReadonly<Record<T.PersonId, readonly T.Reference[]>>,
  conditionCauses: T.DeepReadonly<Record<T.PersonId, readonly T.Id[]>>,
  owners: RetainedOwners,
): { from: T.Time; requestedTo: T.Time; through: T.Time; proposals: readonly RetainedProposal[] } {
  if (!Number.isSafeInteger(to) || to < state.at || !Number.isSafeInteger(to - state.at))
    throw new RangeError('invalid exact retained span');
  const proposals: RetainedProposal[] = [];
  let through = to;
  const note = (output: T.OwnerOutput<unknown>) => {
    if (
      !Number.isSafeInteger(output.advancedThrough) ||
      output.advancedThrough < state.at ||
      output.advancedThrough > to
    )
      throw new RangeError('retained owner advanced outside its requested span');
    through = Math.min(through, output.advancedThrough);
    if (output.nextBoundary !== null) {
      if (!Number.isSafeInteger(output.nextBoundary) || output.nextBoundary < state.at)
        throw new RangeError('retained owner returned an invalid boundary clock');
      through = Math.min(through, output.nextBoundary);
    }
  };
  for (const person of Object.keys(state.people).sort(compareCodePoints)) {
    const actor = state.people[person];
    const continuation = state.continuations.find((item) => item.person === person);
    const refs = allocations[person];
    const causes = conditionCauses[person];
    if (!actor || !continuation || refs === undefined || causes === undefined)
      throw new TypeError('missing retained continuation, allocation scope or condition causes');
    const span: T.SpanContext = {
      effective,
      effectiveParametersHash,
      person,
      from: state.at,
      to,
      phase: 1,
      fidelity,
      priorWorldRevision: state.world.revision,
      causes,
    };
    const { beliefs, sourceTrust, contradictions, ...memory } = actor.memory;
    const proposal: RetainedProposal = {
      person,
      family: owners.family.advance(actor.family, { ...span, life: actor.life }),
      agenda: owners.agenda.advance(actor.agenda, {
        ...span,
        body: actor.body,
        activity: actor.activity,
        norms: actor.conscience.norms,
        catalog,
      }),
      beliefs: owners.beliefs.advance(
        { beliefs, sourceTrust, contradictions },
        {
          ...span,
          continuation: continuation.deliberation.beliefs,
        },
      ),
      memory: owners.memory.advance(memory, {
        ...span,
        continuation: continuation.narrative.memory,
        allocations: refs,
      }),
      social: owners.social.advance(actor.social, {
        ...span,
        continuation: continuation.deliberation.social,
      }),
      habits: owners.habits.advance(actor.habits, {
        ...span,
        continuation: continuation.deliberation.habits,
      }),
      skills: owners.skills.advance(actor.skills, {
        ...span,
        continuation: continuation.deliberation.skills,
        sleeping: actor.body.asleep,
        consolidationHours: actor.skillRetention.consolidationHours,
      }),
      promptings: owners.promptings.advance(actor.promptings, {
        ...span,
        continuation: continuation.narrative.promptings,
      }),
      character: owners.character.advance(
        { character: actor.character, traits: actor.traits, values: actor.values },
        {
          ...span,
          life: actor.life,
          days: actor.chronicle,
          continuation: continuation.narrative.character,
        },
      ),
      will: owners.will.advance(actor.will, {
        ...span,
        activity: actor.activity,
        continuation: continuation.deliberation.will,
      }),
      persistence: owners.persistence.advance(actor.pursuit, {
        ...span,
        goals: actor.agenda.goals,
        activity: actor.activity,
      }),
    };
    for (const output of [
      proposal.family,
      proposal.agenda,
      proposal.beliefs,
      proposal.memory,
      proposal.social,
      proposal.habits,
      proposal.skills,
      proposal.promptings,
      proposal.character,
      proposal.will,
      proposal.persistence,
    ])
      note(output);
    proposals.push(proposal);
  }
  return { from: state.at, requestedTo: to, through, proposals };
}
export type SpanBoundary =
  | { kind: 'hazard'; at: T.Time; person: T.PersonId; boundary: T.HazardBoundary }
  | { kind: 'owner'; at: T.Time; person: T.PersonId; owner: T.FacultyId };
export type PhysicsProposal = {
  person: T.PersonId;
  body: ReturnType<T.BodyOwner['advance']>;
  needs: ReturnType<T.NeedsOwner['advance']> | null;
  affect: ReturnType<T.AffectOwner['advance']> | null;
  crisis: ReturnType<T.CrisisOwner['advance']> | null;
  life: ReturnType<T.LifecycleOwner['advance']> | null;
};
export type PhysicsProbe = {
  from: T.Time;
  requestedTo: T.Time;
  through: T.Time;
  proposals: readonly PhysicsProposal[];
  boundaries: readonly SpanBoundary[];
};
const hazardOrder = { doze: 0, crisis: 1, chronic: 2, mortality: 3 } as const;
export function compareSpanBoundaries(a: SpanBoundary, b: SpanBoundary): number {
  if (a.at !== b.at) return a.at < b.at ? -1 : 1;
  const person = compareCodePoints(a.person, b.person);
  if (person) return person;
  if (a.kind === 'hazard' && b.kind === 'hazard')
    return (
      hazardOrder[a.boundary.key.kind] - hazardOrder[b.boundary.key.kind] ||
      compareCodePoints(a.boundary.key.channelId, b.boundary.key.channelId)
    );
  if (a.kind === 'hazard') return -1;
  if (b.kind === 'hazard') return 1;
  return compareCodePoints(a.owner, b.owner);
}
function loadFor(actor: T.DeepReadonly<T.ActorState>, effective: T.EffectiveParameters): T.BodyLoad {
  if (actor.activity && actor.activity.dozedAt === undefined && actor.activity.interrupt === undefined)
    return {
      effort: actor.activity.offer.demands.effort,
      focus: actor.activity.offer.demands.focus,
      mode: actor.activity.offer.demands.mode,
    };
  return { ...effective.builtins.PERSON_DEFAULTS.idleLoad, mode: actor.body.asleep ? 'sleep' : 'awake' };
}
export function probePhysiology(
  state: T.DeepReadonly<Pick<T.RunState, 'at' | 'people' | 'continuations' | 'world'>>,
  to: T.Time,
  fidelity: T.DeepReadonly<T.Fidelity>,
  effective: T.EffectiveParameters,
  effectiveParametersHash: T.Hash,
  allocations: T.DeepReadonly<Record<T.PersonId, readonly T.Reference[]>>,
  conditionCauses: T.DeepReadonly<Record<T.PersonId, readonly T.Id[]>>,
  owners: PhysiologyOwners,
): PhysicsProbe {
  if (to < state.at || !Number.isSafeInteger(to - state.at))
    throw new RangeError('invalid exact proposal span');
  const boundaries: SpanBoundary[] = [];
  const proposals: PhysicsProposal[] = [];
  const note = (person: T.PersonId, owner: T.FacultyId, output: T.OwnerOutput<unknown>, target: T.Time) => {
    if (
      !Number.isSafeInteger(output.advancedThrough) ||
      output.advancedThrough < state.at ||
      output.advancedThrough > target
    )
      throw new RangeError('owner advanced outside its requested span');
    if (output.advancedThrough < target)
      boundaries.push({ kind: 'owner', at: output.advancedThrough, person, owner });
    if (output.nextBoundary !== null) {
      if (!Number.isSafeInteger(output.nextBoundary) || output.nextBoundary < state.at)
        throw new RangeError('owner returned an invalid boundary clock');
      if (output.nextBoundary <= target)
        boundaries.push({ kind: 'owner', at: output.nextBoundary, person, owner });
    }
  };
  const hazard = (person: T.PersonId, boundary: T.HazardBoundary | null) => {
    if (boundary) {
      if (!Number.isSafeInteger(boundary.at) || boundary.at < state.at || boundary.at > to)
        throw new RangeError('hazard outside proposal');
      boundaries.push({ kind: 'hazard', person, at: boundary.at, boundary });
    }
  };
  for (const person of Object.keys(state.people).sort(compareCodePoints)) {
    const actor = state.people[person];
    const continuation = state.continuations.find((item) => item.person === person);
    const refs = allocations[person];
    const causes = conditionCauses[person];
    if (!actor || !continuation || refs === undefined || causes === undefined)
      throw new TypeError('missing admitted actor continuation, allocation scope or condition causes');
    const span: T.SpanContext = {
      effective,
      effectiveParametersHash,
      person,
      from: state.at,
      to,
      phase: 1,
      fidelity,
      priorWorldRevision: state.world.revision,
      causes,
    };
    const frame: T.FrameContext = {
      effective,
      effectiveParametersHash,
      person,
      at: state.at,
      priorAt: state.at,
      phase: 1,
      fidelity,
      worldRevision: state.world.revision,
      causes,
    };
    const character = projectCharacterTrajectory({
      person,
      life: { bornAt: actor.life.bornAt },
      continuation: continuation.narrative.character,
      effective,
      effectiveParametersHash,
    });
    const environmentPath = owners.environment.trajectory(actor.ambient, {
      ...frame,
      character,
      asleep: actor.body.asleep,
    });
    const environment = owners.environment.forcing(actor.ambient, {
      ...frame,
      traits: actor.traits,
      asleep: actor.body.asleep,
    });
    const command = owners.will.commandForcing(actor.will, frame);
    const body = owners.body.advance(actor.body, {
      ...span,
      continuation: continuation.body,
      dozeContinuation: continuation.doze,
      load: loadFor(actor, effective),
      life: { birthAt: actor.life.bornAt },
      environment: actor.ambient.percept,
      ...(actor.family.pregnancy ? { pregnancy: actor.family.pregnancy } : {}),
      perception: bodyPerception(actor, state.at),
    });
    note(person, 'body', body, to);
    hazard(person, body.randomBoundary);
    const proposal: PhysicsProposal = { person, body, needs: null, affect: null, crisis: null, life: null };
    proposals.push(proposal);
    // An unarmed body boundary must commit first. Same-person crisis/life probes
    // follow on the next zero-time pass, preserving the declared hazard order.
    if (body.randomBoundary?.at === state.at) continue;
    const bodyTo = body.advancedThrough;
    const needs = owners.needs.advance(actor.needs, {
      ...span,
      character,
      environment: environmentPath,
      to: bodyTo,
      traits: actor.traits,
      values: actor.values,
      activity: actor.activity,
      socialContext: actor.social,
      continuation: continuation.deliberation.needs,
      body: body.trajectory,
      forcingPerMinute: { environment: environment.needsPerMinute, command: command.needsPerMinute },
      asleep: actor.body.asleep,
    });
    proposal.needs = needs;
    note(person, 'needs', needs, bodyTo);
    const { crisis: priorCrisis, ...priorAffect } = actor.affect;
    const affectTo = Math.min(bodyTo, needs.advancedThrough);
    const affect = owners.affect.advance(priorAffect, {
      ...span,
      environment: environmentPath,
      to: affectTo,
      continuation: continuation.affect,
      traits: actor.traits,
      body: body.trajectory,
      needs: needs.trajectory,
      moodOffset: environment.moodOffset,
    });
    proposal.affect = affect;
    note(person, 'affect', affect, affectTo);
    const crisisTo = Math.min(affectTo, affect.advancedThrough);
    const crisis = owners.crisis.advance(priorCrisis, {
      ...span,
      character,
      to: crisisTo,
      continuation: continuation.crisis,
      body: body.trajectory,
      mood: affect.trajectory,
      traits: actor.traits,
      asleep: actor.body.asleep,
      alive: actor.body.alive,
      commandStrainRatePerMinute: command.crisisStrainPerMinute,
    });
    proposal.crisis = crisis;
    note(person, 'crisis', crisis, crisisTo);
    hazard(person, crisis.randomBoundary);
    if (crisis.randomBoundary?.at === state.at) continue;
    const life = owners.life.advance(actor.life, {
      ...span,
      to: bodyTo,
      continuation: continuation.life,
      body: body.trajectory,
      alive: actor.body.alive,
      heldConditionKinds: actor.body.illnesses.map((illness) => illness.kind),
      bonds: actor.bonds,
      smoking: actor.context.smoking,
      conditions: effective.fixedPriors.chronicConditions,
    });
    proposal.life = life;
    note(person, 'lifecourse', life, bodyTo);
    hazard(person, life.randomBoundary);
  }
  boundaries.sort(compareSpanBoundaries);
  return { from: state.at, requestedTo: to, through: boundaries[0]?.at ?? to, proposals, boundaries };
}

export type ReachedPhysics = {
  state: T.RunState;
  lifeReceipts: readonly {
    person: T.PersonId;
    receipts: ReturnType<T.LifecycleOwner['advance']>['bodyReceipts'];
  }[];
  deliveries: readonly {
    person: T.PersonId;
    owner: T.FacultyId;
    effects: T.FacultyEffects;
    events: readonly T.EventData[];
    nextBoundary: T.Time | null;
  }[];
};

/** Materialize only a common reached endpoint. Earlier speculative proposals are
 * discarded and reprobed first. Hazard arming/commits remain reached frame work;
 * this function never draws RNG or applies an appraisal on another owner's behalf.
 */
export function materializePhysiology(state: T.RunState, probe: PhysicsProbe): ReachedPhysics {
  if (probe.from !== state.at || probe.requestedTo !== probe.through)
    throw new TypeError('physiology must be reprobed to its common reached endpoint');
  const people = { ...state.people };
  const replacements = new Map<T.PersonId, T.ActorContinuation>();
  const deliveries: ReachedPhysics['deliveries'][number][] = [];
  const lifeReceipts: ReachedPhysics['lifeReceipts'][number][] = [];
  const delivered = new Set<T.PersonId>();
  for (const proposal of probe.proposals) {
    const actor = state.people[proposal.person];
    const prior = state.continuations.find((item) => item.person === proposal.person);
    const { body, needs, affect, crisis, life } = proposal;
    if (!actor || !prior || delivered.has(proposal.person) || !needs || !affect || !crisis || !life)
      throw new TypeError('physiology requires one complete reached proposal per actor');
    delivered.add(proposal.person);
    lifeReceipts.push({ person: proposal.person, receipts: life.bodyReceipts });
    const outputs = [
      ['body', body],
      ['needs', needs],
      ['affect', affect],
      ['crisis', crisis],
      ['lifecourse', life],
    ] as const;
    for (const [owner, output] of outputs) {
      if (output.advancedThrough !== probe.through)
        throw new TypeError('physiology owners do not share the reached endpoint');
      deliveries.push({
        person: proposal.person,
        owner,
        effects: output.effects,
        events: output.events,
        nextBoundary: output.nextBoundary,
      });
    }
    people[proposal.person] = {
      ...actor,
      now: probe.through,
      body: body.state,
      needs: needs.state,
      affect: { ...affect.state, crisis: crisis.state },
      life: life.state,
    };
    replacements.set(proposal.person, {
      ...prior,
      body: body.continuation,
      doze: body.dozeContinuation,
      affect: affect.continuation,
      crisis: crisis.continuation,
      life: life.continuation,
      deliberation: { ...prior.deliberation, needs: needs.continuation },
    });
  }
  if (delivered.size !== Object.keys(state.people).length)
    throw new TypeError('physiology omitted an actor from the common frame');
  const advanced = new Set<T.FacultyId>(['body', 'needs', 'affect', 'crisis', 'lifecourse']);
  return {
    state: {
      ...state,
      at: probe.through,
      cursor: { ...state.cursor, at: probe.through },
      people,
      continuations: state.continuations.map((prior) => replacements.get(prior.person) ?? prior),
      ownerClocks: state.ownerClocks.map((clock) =>
        advanced.has(clock.owner) ? { ...clock, advancedThrough: probe.through } : clock,
      ),
    },
    deliveries,
    lifeReceipts,
  };
}

export function materializeRetained(
  state: T.RunState,
  probe: ReturnType<typeof probeRetained>,
): {
  state: T.RunState;
  deliveries: ReachedPhysics['deliveries'];
  allocations: T.ReceiptLedger['allocated'];
  upbringing: readonly { person: T.PersonId; receipts: readonly T.UpbringingExposure[] }[];
  willReceipts: readonly { person: T.PersonId; output: T.WillMutationOutput }[];
} {
  if (state.at !== probe.through || probe.requestedTo !== probe.through)
    throw new TypeError('retained faculties must share the materialized physics endpoint');
  const people = { ...state.people };
  const replacements = new Map<T.PersonId, T.ActorContinuation>();
  const deliveries: ReachedPhysics['deliveries'][number][] = [];
  const allocations: T.ReceiptLedger['allocated'][number][] = [];
  const upbringing: { person: T.PersonId; receipts: readonly T.UpbringingExposure[] }[] = [];
  const willReceipts: { person: T.PersonId; output: T.WillMutationOutput }[] = [];
  const delivered = new Set<T.PersonId>();
  for (const proposal of probe.proposals) {
    const actor = state.people[proposal.person];
    const prior = state.continuations.find((item) => item.person === proposal.person);
    if (!actor || !prior || delivered.has(proposal.person))
      throw new TypeError('retained faculties require one proposal per actor');
    delivered.add(proposal.person);
    const outputs = [
      ['family', proposal.family],
      ['agenda', proposal.agenda],
      ['beliefs', proposal.beliefs],
      ['memory', proposal.memory],
      ['social', proposal.social],
      ['habits', proposal.habits],
      ['skills', proposal.skills],
      ['promptings', proposal.promptings],
      ['character', proposal.character],
      ['will', proposal.will],
      ['persistence', proposal.persistence],
    ] as const;
    for (const [owner, output] of outputs) {
      if (output.advancedThrough !== probe.through)
        throw new TypeError('retained owners do not share the reached endpoint');
      deliveries.push({
        person: proposal.person,
        owner,
        effects: output.effects,
        events: output.events,
        nextBoundary: output.nextBoundary,
      });
    }
    const memory = proposal.memory.state;
    // A continuous memory span can fold existing episodes into gists. It cannot
    // encode a new observation. Record every allocated gist, including evictions,
    // before any later mutator receives this actor's allocation scope.
    if (
      memory.nextEpisode !== actor.memory.nextEpisode ||
      !Number.isSafeInteger(memory.nextGist) ||
      memory.nextGist < actor.memory.nextGist ||
      memory.nextGist - actor.memory.nextGist > actor.memory.episodes.length
    )
      throw new TypeError('invalid continuous memory allocation progression');
    for (let ordinal = actor.memory.nextGist; ordinal < memory.nextGist; ordinal++)
      allocations.push({
        scope: { kind: 'person', person: proposal.person },
        reference: { kind: 'gist', id: `g${ordinal}` },
        allocatedAt: probe.through,
      });
    upbringing.push({ person: proposal.person, receipts: proposal.family.upbringing });
    willReceipts.push({ person: proposal.person, output: proposal.will });
    people[proposal.person] = {
      ...actor,
      family: proposal.family.state,
      agenda: proposal.agenda.state,
      memory: { ...memory, ...proposal.beliefs.state },
      social: proposal.social.state,
      habits: [...proposal.habits.state],
      skills: proposal.skills.state,
      skillRetention: { consolidationHours: proposal.skills.consolidationHours },
      promptings: proposal.promptings.state,
      ...proposal.character.state,
      will: proposal.will.state,
      pursuit: proposal.persistence.state,
    };
    replacements.set(proposal.person, {
      ...prior,
      deliberation: {
        ...prior.deliberation,
        beliefs: proposal.beliefs.continuation,
        social: proposal.social.continuation,
        habits: proposal.habits.continuation,
        skills: proposal.skills.continuation,
        will: proposal.will.continuation,
      },
      narrative: {
        ...prior.narrative,
        memory: proposal.memory.continuation,
        promptings: proposal.promptings.continuation,
        character: proposal.character.continuation,
      },
    });
  }
  if (delivered.size !== Object.keys(state.people).length)
    throw new TypeError('retained faculties omitted an actor from the common frame');
  const advanced = new Set<T.FacultyId>([
    'family',
    'agenda',
    'beliefs',
    'memory',
    'social',
    'habits',
    'skills',
    'promptings',
    'character',
    'will',
    'persistence',
    // These owners change only on reached receipts or scheduled review/day
    // endpoints. They have no elapsed law to integrate between those endpoints.
    'conscience',
    'curiosity',
    'projects',
    'review',
    'chronicle',
    'prospection',
    'methods',
  ]);
  return {
    state: {
      ...state,
      people,
      continuations: state.continuations.map((prior) => replacements.get(prior.person) ?? prior),
      ownerClocks: state.ownerClocks.map((clock) =>
        advanced.has(clock.owner) ? { ...clock, advancedThrough: probe.through } : clock,
      ),
    },
    deliveries,
    allocations,
    upbringing,
    willReceipts,
  };
}
