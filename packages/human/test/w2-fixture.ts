import { environmentOwner } from '../src/environment/environment.ts';
/** Complete canonical owner fixtures. Parameters come from the real C0 constructor.
 * No root3 API, repair, absent faculty containers or incomplete parameter assertions. */

import * as affectModule from '../src/affect/affect.ts';
import * as crisisModule from '../src/affect/crisis.ts';
import { agendaOwner } from '../src/agenda/agenda.ts';
import { beliefOwner } from '../src/beliefs/beliefs.ts';
import * as bodyModule from '../src/body/body.ts';
import * as characterModule from '../src/character/character.ts';
import * as chronicleModule from '../src/chronicle/chronicle.ts';
import { conscienceOwner } from '../src/conscience/conscience.ts';
import { createRng, random } from '../src/core/random.ts';
import { curiosityOwner } from '../src/curiosity/curiosity.ts';
import { habitsOwner } from '../src/habits/habits.ts';
import * as memoryModule from '../src/memory/memory.ts';
import { methodOwner } from '../src/methods/methods.ts';
import { DEFAULT_NEEDS, needsOwner } from '../src/needs/needs.ts';
import { persistenceOwner } from '../src/persistence/persistence.ts';
import { projectsOwner } from '../src/projects/projects.ts';
import * as promptingModule from '../src/promptings/promptings.ts';
import { prospectionOwner } from '../src/prospection/prospection.ts';
import * as reviewModule from '../src/review/review.ts';
import { buildParameters } from '../src/run-parameters.ts';
import type {
  ActorActivity,
  ActorRandomCursor,
  ActorState,
  BodyProjectionContext,
  CognitionContext,
  EffectiveParameters,
  FrameContext,
  LifeModifiers,
  ObservedOutcome,
  Offer,
  RunTuning,
  TermData,
  TermEffect,
  Traits,
  Values,
} from '../src/run-schema.ts';
import { skillsOwner } from '../src/skills/skills.ts';
import { socialOwner } from '../src/social/social.ts';
import { willOwner } from '../src/will/will.ts';

const parameterHashes = new WeakMap<object, string>();
export function parameters(tuning?: RunTuning): EffectiveParameters {
  const result = buildParameters(tuning);
  if (!result.ok) throw new Error(result.error.message);
  parameterHashes.set(result.value.effective, result.value.hash);
  return result.value.effective;
}
export function frame(at = 0, effective = parameters()): FrameContext {
  const effectiveParametersHash = parameterHashes.get(effective);
  if (!effectiveParametersHash) throw new Error('Fixture parameters must come from buildParameters');
  return {
    effective,
    effectiveParametersHash,
    person: 'person',
    at,
    priorAt: at,
    phase: 5,
    fidelity: { mode: 'fine' },
    worldRevision: 0,
    causes: ['received'],
  };
}
export const traits: Traits = {
  honesty: 0.5,
  emotionality: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  conscientiousness: 0.5,
  openness: 0.5,
};
export const values: Values = {
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
};
export const life: LifeModifiers = {
  ageYears: 30,
  stage: 'adult',
  metabolism: 1,
  recovery: 1,
  learning: 1,
  maturity: 1,
  maxFitness: 1,
  mortalityPerYear: 0,
};
export function offer(id: string, over: Partial<Offer> = {}): Offer {
  return {
    id,
    actionId: id,
    label: id,
    person: 'person',
    durationMs: 60000,
    participants: [],
    alongside: [],
    demands: { effort: 0, focus: 0, mode: 'awake', requires: {} },
    tags: [],
    norms: [],
    expected: { needs: {}, followedBy: [], provenance: [] },
    fulfills: [],
    advances: [],
    diminishes: [],
    ...over,
  };
}
export function activity(offer: Offer): ActorActivity {
  return {
    id: `activity:${offer.id}`,
    offer,
    needsAtStart: {},
    startedAt: 0,
    endsAt: offer.durationMs,
    decisionId: 'decision',
    intention: offer.actionId,
    suggestions: [],
    reviewAt: offer.durationMs,
  };
}
export function outcome(act: ActorActivity, over: Partial<ObservedOutcome> = {}): ObservedOutcome {
  return {
    activityId: act.id,
    offerId: act.offer.id,
    actionId: act.offer.actionId,
    start: act.startedAt,
    end: act.endsAt,
    status: 'completed',
    evidenceId: `outcome:${act.id}`,
    actual: { exposures: [], observedProgress: [] },
    fulfills: [...act.offer.fulfills],
    advances: [...act.offer.advances],
    ...(act.offer.target !== undefined ? { target: act.offer.target } : {}),
    ...over,
  };
}
export function person(effective = parameters()): {
  actor: ActorState;
  frame: FrameContext;
  bodyProjection: BodyProjectionContext;
  cursor: ActorRandomCursor;
} {
  const ctx = frame(0, effective);
  const body = bodyModule.bodyOwner.initialize(
    {
      satiety: 0.8,
      hydration: 0.8,
      sleepPressure: 0.1,
      exertion: 0,
      fitness: 0.5,
      health: 1,
      pain: 0,
      sleepDebtHours: 0,
      depletion: 0,
      circadianPeakMs: 54000000,
      asleep: false,
      since: 0,
      doze: {
        context: { posture: 'upright', stimulation: 0.5 },
        basis: { kind: 'authored', author: 'fixture', at: 0 },
      },
      bladder: { fill: 0, pending: 0 },
      injuries: [],
      illnesses: [],
      exposures: [],
    },
    ctx,
  );
  const affect = affectModule.affectOwner.initialize(
    { mood: { valence: 0, arousal: 0.2 }, regulation: 0.5, emotions: [] },
    ctx,
  );
  const crisis = crisisModule.crisisOwner.initialize(ctx);
  const memory = memoryModule.memoryOwner.initialize(
    { episodes: [], expectations: [] },
    { ...ctx, allocations: [] },
  );
  const beliefs = beliefOwner.initialize({ beliefs: [], sourceTrust: [] }, ctx);
  const character = characterModule.characterOwner.initialize({ traits, values }, ctx);
  const conscience = conscienceOwner.initialize([], ctx);
  const habits = habitsOwner.initialize([], ctx);
  const will = willOwner.initialize({ voices: [], precommitments: [] }, ctx);
  const agenda = agendaOwner.initialize(
    {
      exemptions: { traveling: { kind: 'unobserved' }, illnessSeverity: { kind: 'unobserved' } },
      commitments: [],
      goals: [],
      precommitments: [],
      owed: [],
    },
    ctx,
  );
  const chronicle = chronicleModule.chronicleOwner.initialize({
    ...ctx,
    snapshot: {
      habits,
      will,
      body: body.state,
      conscience,
      memory: { ...memory, ...beliefs },
      affect: { ...affect.state, crisis: crisis.state },
      agenda,
      retention: { trace: 20, chronicleDays: 120 },
    },
  });
  const skills = skillsOwner.initialize([], ctx);
  const rng = createRng(7);
  for (let initializationDraw = 0; initializationDraw < 12; initializationDraw++) random(rng);
  const randomIdentity = {
    id: 'actor:person',
    seed: 7,
    uniformDraws: 0,
    initializationDraws: 12 as const,
    origin: { runSeed: 7, person: 'person' },
  };
  const actor: ActorState = {
    id: 'person',
    name: 'Person',
    now: 0,
    rng,
    randomIdentity,
    life: { bornAt: -30 * 365 * 86400000, sex: 'female' },
    body: body.state,
    needs: needsOwner.initialize(DEFAULT_NEEDS, ctx),
    traits: { ...character.traits },
    values: { ...character.values },
    conscience: conscienceOwner.initialize([], ctx),
    affect: { ...affect.state, crisis: crisis.state },
    ...skills,
    methods: methodOwner.initialize(ctx),
    prospection: prospectionOwner.initialize(ctx),
    planning: prospectionOwner.initializePlanning(ctx),
    promptings: promptingModule.promptingsOwner.initialize({ reading: 'none', responses: [] }, ctx),
    curiosity: curiosityOwner.initialize(ctx),
    projects: projectsOwner.initialize(ctx),
    pursuit: persistenceOwner.initialize(ctx),
    review: reviewModule.reviewOwner.initialize({ style: 'none', atMsOfDay: 75600000 }, ctx),
    habits: habitsOwner.initialize([], ctx),
    memory: { ...memory, ...beliefs },
    context: { scarcity: { kind: 'unobserved' }, smoking: { kind: 'unobserved' } },
    social: socialOwner.initialize({ relationships: [], groups: [], reserve: {} }, ctx),
    agenda: agendaOwner.initialize(
      {
        exemptions: { traveling: { kind: 'unobserved' }, illnessSeverity: { kind: 'unobserved' } },
        commitments: [],
        goals: [],
        precommitments: [],
        owed: [],
      },
      ctx,
    ),
    will: willOwner.initialize({ voices: [], precommitments: [] }, ctx),
    activity: null,
    trace: [],
    nextDecision: 0,
    chronicle: chronicle.days,
    chronicleDay: chronicle.open,
    chronicleYears: chronicle.years,
    character: character.character,
    family: { aptitudes: {}, contactCovered: [] },
    bonds: { courtships: [], marriages: [] },
    ambient: { percept: {}, contextId: null, basis: null, since: 0 },
    retention: { trace: 20, chronicleDays: 120 },
  };
  const bodyProjection: BodyProjectionContext = {
    continuation: body.continuation,
    dozeContinuation: body.dozeContinuation,
    life: { birthAt: actor.life.bornAt },
    environment: {},
    perception: { fasting: false, fastingDays: 0 },
  };
  return {
    actor,
    frame: ctx,
    bodyProjection,
    cursor: { words: { ...actor.rng }, identity: { ...randomIdentity } },
  };
}
export function decisionContext(
  p: ReturnType<typeof person>,
  offers: Offer[],
  terms: readonly TermData[] = [],
): CognitionContext & { terms: TermEffect[]; rng: ActorRandomCursor } {
  const body = bodyModule.bodyOwner.read(p.actor.body, {
    ...p.frame,
    perception: p.bodyProjection.perception,
  });
  const needs = needsOwner.read(p.actor.needs, {
    ...p.frame,
    body,
    traits: p.actor.traits,
    values: p.actor.values,
  });
  return {
    ...p.frame,
    actor: p.actor,
    offers,
    body,
    needs,
    life,
    suggestions: [],
    treatment: 'ordinary',
    scarcity: p.actor.context.scarcity,
    bodyProjection: p.bodyProjection,
    rng: p.cursor,
    terms: offers.flatMap((o) =>
      terms.map((term, i) => ({
        id: `term:${o.id}:${i}`,
        cause: 'received',
        person: p.actor.id,
        at: p.frame.at,
        applyPhase: p.frame.phase,
        from: 'cognition' as const,
        to: 'will' as const,
        offerId: o.id,
        term,
      })),
    ),
  };
}

export function commitment(
  id: string,
  over: Partial<import('../src/run-schema.ts').Commitment> = {},
): import('../src/run-schema.ts').Commitment {
  return {
    id,
    kind: 'duty',
    actions: ['work'],
    from: 0,
    until: 3600000,
    importance: 0.8,
    status: 'pending',
    ...over,
  };
}
export function goal(
  id: string,
  over: Partial<import('../src/run-schema.ts').Goal> = {},
): import('../src/run-schema.ts').Goal {
  return {
    id,
    label: id,
    serves: ['competence'],
    progress: 0,
    advancedBy: [{ action: 'work', amount: 0.1 }],
    importance: 0.7,
    baseImportance: 0.7,
    status: 'active',
    adoptedAt: 0,
    lastAdvancedAt: 0,
    completionHalfLifeMs: 7200000,
    ...over,
  };
}
export function socialContext(p: ReturnType<typeof person>) {
  return {
    ...p.frame,
    personIds: [p.actor.id, 'other', 'friend'],
    traits: p.actor.traits,
    values: p.actor.values,
    norms: p.actor.conscience.norms,
    catalog: [],
    sourceTrust: Object.entries(p.actor.memory.sourceTrust).map(([sourceId, trust]) => ({ sourceId, trust })),
    rng: p.cursor,
  };
}
export function projectContext(p: ReturnType<typeof person>) {
  const c = decisionContext(p, []);
  return {
    ...p.frame,
    goals: p.actor.agenda.goals,
    commitments: p.actor.agenda.commitments,
    body: c.body,
    needs: c.needs,
    affect: p.actor.affect,
    curiosity: p.actor.curiosity,
    traits: p.actor.traits,
    alive: p.actor.body.alive,
    asleep: p.actor.body.asleep,
    activity: p.actor.activity,
    life,
  };
}
export function span(
  from: number,
  to: number,
  effective = parameters(),
): import('../src/run-schema.ts').SpanContext {
  const f = frame(to, effective);
  return {
    effective,
    effectiveParametersHash: f.effectiveParametersHash,
    person: f.person,
    from,
    to,
    phase: 1,
    fidelity: { mode: 'fine' },
    priorWorldRevision: 0,
    causes: ['elapsed'],
  };
}
export function percept(
  id: string,
  over: Partial<import('../src/run-schema.ts').PerceptData> = {},
): import('../src/run-schema.ts').PerceptData {
  return {
    id,
    occurredAt: 0,
    channel: 'saw',
    kind: 'act',
    salience: 0.8,
    summary: id,
    claims: [],
    norms: [],
    advice: [],
    consequences: [],
    withdrawConsequences: [],
    witnesses: [],
    reports: [],
    provenance: [],
    ...over,
  };
}
export function consequence(id: string): import('../src/run-schema.ts').ReceivedConsequence {
  return {
    id,
    revision: 1,
    trigger: { action: 'prepare' },
    successor: { action: 'work', durationMs: 60000, effort: 0.1, advances: ['task'] },
    availableFrom: 0,
    availableUntil: 3600000,
    expiresAt: 3600000,
    chance: 1,
    confidence: 1,
  };
}
export function held(
  id: string,
  standing: import('../src/run-schema.ts').NormStanding = 'obligatory',
  conviction = 0.9,
): import('../src/run-schema.ts').HeldNorm {
  return {
    normId: id,
    standing,
    conviction,
    provenance: { kind: 'authored-world', author: 'fixture', ruleId: id, edition: 'one' },
  };
}
export function catalog(
  id: string,
  standing: import('../src/run-schema.ts').NormStanding = 'obligatory',
): import('../src/run-schema.ts').NormDefinition {
  return {
    id,
    label: id,
    standing,
    sources: [{ kind: 'assumption', ref: 'fixture authored rule' }],
    provenance: { kind: 'authored-world', author: 'fixture', ruleId: id, edition: 'one' },
    exemptions: [],
  };
}
export function agendaContext(p: ReturnType<typeof person>) {
  return {
    ...p.frame,
    activity: p.actor.activity,
    norms: p.actor.conscience.norms,
    catalog: p.actor.conscience.norms.map((n) => catalog(n.normId, n.standing)),
  };
}

/** Use the actual owner law for elapsed trait/value forcing; no test equations. */
export function characterPath(
  ctx = frame(),
  inputTraits = traits,
  inputValues = values,
  bornAt = -30 * 365 * 86400000,
) {
  const state = characterModule.characterOwner.initialize({ traits: inputTraits, values: inputValues }, ctx);
  return characterModule.projectCharacterTrajectory({
    ...ctx,
    life: { bornAt },
    continuation: { anchor: { at: ctx.at, conditionId: 'initial' }, state },
  });
}
export function environmentPath(
  character = characterPath(),
  percept: import('../src/run-schema.ts').AmbientPercept = {},
  ctx = frame(),
  asleep = false,
) {
  return environmentOwner.trajectory(
    { percept, contextId: 'room', basis: null, since: ctx.at },
    { ...ctx, character, asleep },
  );
}
