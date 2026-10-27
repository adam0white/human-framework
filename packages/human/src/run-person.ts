/** SCOPE: compose fresh authored actors exclusively through faculty constructors.
 * Portable admission and two-parent construction prepare distinct validated owner
 * inputs upstream. This helper does not infer genetics, norms, kin or memories.
 */
import { canonicalJson, hashCanonical } from './run-canonical.ts';
import type * as T from './run-schema.ts';
import { actorStream } from './run-state.ts';

export type ConstructorOwners = {
  body: Pick<T.BodyOwner, 'initialize'>;
  affect: Pick<T.AffectOwner, 'initialize'>;
  crisis: Pick<T.CrisisOwner, 'initialize'>;
  life: Pick<T.LifecycleOwner, 'initialize'>;
  family: Pick<T.FamilyOwner, 'initialize'>;
  partnering: Pick<T.PartneringOwner, 'initialize'>;
  agenda: Pick<T.AgendaOwner, 'initialize'>;
  beliefs: Pick<T.BeliefOwner, 'initialize'>;
  memory: Pick<T.MemoryOwner, 'initialize'>;
  conscience: Pick<T.ConscienceOwner, 'initialize'>;
  social: Pick<T.SocialOwner, 'initialize'>;
  skills: Pick<T.SkillsOwner, 'initialize'>;
  will: Pick<T.WillOwner, 'initialize'>;
  promptings: Pick<T.PromptingsOwner, 'initialize'>;
  review: Pick<T.ReviewOwner, 'initialize'>;
  needs: Pick<T.NeedsOwner, 'initialize'>;
  habits: Pick<T.HabitsOwner, 'initialize'>;
  methods: Pick<T.MethodOwner, 'initialize'>;
  prospection: Pick<T.ProspectionOwner, 'initialize' | 'initializePlanning' | 'receive'>;
  projects: Pick<T.ProjectsOwner, 'initialize'>;
  persistence: Pick<T.PersistenceOwner, 'initialize'>;
  curiosity: Pick<T.CuriosityOwner, 'initialize'>;
  character: Pick<T.CharacterOwner, 'initialize'>;
  chronicle: Pick<T.ChronicleOwner, 'initialize'>;
  environment: Pick<T.EnvironmentOwner, 'initialize'>;
};
export type ConstructedActor = {
  actor: T.ActorState;
  continuation: T.ActorContinuation;
  clocks: readonly T.OwnerClock[];
  allocations: readonly T.Reference[];
  constructionEvents: readonly T.EventData[];
  constructionEffects: T.FacultyEffects;
};
export function constructAuthoredActor(
  spec: T.DeepReadonly<T.PersonAuthoring>,
  context: T.DeepReadonly<T.FrameContext>,
  runSeed: number,
  owners: ConstructorOwners,
): ConstructedActor {
  const source = spec.state;
  const life = owners.life.initialize(spec.identity, context);
  const body = owners.body.initialize(source.body, context);
  const affect = owners.affect.initialize(source.affect, context);
  const crisis = owners.crisis.initialize(context);
  const family = owners.family.initialize(source.family, context);
  const bonds = owners.partnering.initialize(source.bonds, context);
  const agenda = owners.agenda.initialize(source.agenda, context);
  const beliefs = owners.beliefs.initialize(
    { beliefs: source.beliefs, sourceTrust: source.sourceTrust },
    context,
  );
  const allocations: T.Reference[] = spec.biography.map((episode) => ({ kind: 'episode', id: episode.id }));
  const memory = owners.memory.initialize(
    { episodes: spec.biography, expectations: source.expectations },
    { ...context, allocations },
  );
  const conscience = owners.conscience.initialize(source.heldNorms, context);
  const social = owners.social.initialize(
    { relationships: source.relationships, groups: source.groups, reserve: source.reserve },
    context,
  );
  const skills = owners.skills.initialize(source.skills, context);
  const will = owners.will.initialize(
    { voices: source.voices, precommitments: source.agenda.precommitments },
    context,
  );
  const promptings = owners.promptings.initialize(source.promptings, context);
  const review = owners.review.initialize(source.review, context);
  const needs = owners.needs.initialize(source.needs, context);
  const habits = owners.habits.initialize(source.habits, context);
  const methods = owners.methods.initialize(context);
  let prospection = owners.prospection.initialize(context);
  const constructionEvents: T.EventData[] = [];
  const constructionEffects = {
    terms: [] as T.TermEffect[],
    modifiers: [] as T.ModifierEffect[],
    appraisals: [] as T.AppraisalEffect[],
  };
  for (const authored of source.consequences) {
    const received = owners.prospection.receive(prospection, { kind: 'authored', data: authored }, context);
    prospection = received.state;
    constructionEvents.push(...received.events);
    constructionEffects.terms.push(...received.effects.terms);
    constructionEffects.modifiers.push(...received.effects.modifiers);
    constructionEffects.appraisals.push(...received.effects.appraisals);
  }
  const planning = owners.prospection.initializePlanning(context);
  const projects = owners.projects.initialize(context);
  const pursuit = owners.persistence.initialize(context);
  const curiosity = owners.curiosity.initialize(context);
  const character = owners.character.initialize({ traits: source.traits, values: source.values }, context);
  const retention = structuredClone(source.retention);
  const chronicle = owners.chronicle.initialize({
    ...context,
    snapshot: {
      habits,
      will,
      body: body.state,
      conscience,
      memory: { ...memory, ...beliefs },
      affect: { ...affect.state, crisis: crisis.state },
      agenda,
      retention,
    },
  });
  const ambient = owners.environment.initialize(context);
  const random = actorStream(runSeed, spec.id);
  const actor: T.ActorState = {
    id: spec.id,
    name: spec.identity.name,
    now: context.at,
    rng: { ...random.words },
    randomIdentity: structuredClone(random.identity),
    life: life.state,
    body: body.state,
    needs,
    traits: character.traits,
    values: character.values,
    conscience,
    affect: { ...affect.state, crisis: crisis.state },
    skills: skills.skills,
    methods,
    prospection,
    planning,
    promptings,
    curiosity,
    projects,
    pursuit,
    review,
    skillRetention: skills.skillRetention,
    habits,
    memory: { ...memory, ...beliefs },
    social,
    context: structuredClone(source.context),
    agenda,
    will,
    activity: null,
    trace: [],
    nextDecision: 1,
    chronicle: chronicle.days,
    chronicleDay: chronicle.open,
    chronicleYears: chronicle.years,
    character: character.character,
    family,
    bonds,
    ambient,
    retention,
  };
  // Only completed actual/authored outcome history supplies the after-action cue.
  // A request, intention, failure or interruption is not the previous completed act.
  for (let index = actor.memory.episodes.length - 1; index >= 0; index--) {
    const episode = actor.memory.episodes[index];
    if (episode?.kind === 'outcome' && episode.actorId === actor.id && episode.tags.includes('completed')) {
      if (episode.action !== undefined) actor.lastAction = episode.action;
      break;
    }
  }
  const anchor = (owner: T.FacultyId): T.ContinuousAnchor => ({
    at: context.at,
    conditionId: hashCanonical(
      'hf-run4/initial-condition',
      spec.id,
      context.at,
      owner,
      context.effectiveParametersHash,
    ),
  });
  // Continuation envelopes are scheduler-owned; numerical interior state comes from owners.
  const continuation: T.ActorContinuation = {
    person: spec.id,
    body: body.continuation,
    doze: body.dozeContinuation,
    affect: affect.continuation,
    crisis: crisis.continuation,
    life: life.continuation,
    deliberation: {
      needs: { anchor: anchor('needs'), state: needs },
      beliefs: { anchor: anchor('beliefs'), state: beliefs },
      social: { anchor: anchor('social'), state: social },
      habits: { anchor: anchor('habits'), state: habits },
      conscience: { anchor: anchor('conscience'), state: conscience },
      skills: { anchor: anchor('skills'), state: skills.skills },
      projects: { anchor: anchor('projects'), state: projects },
      persistence: { anchor: anchor('persistence'), state: pursuit },
      prospection: { anchor: anchor('prospection'), state: prospection },
      methods: { anchor: anchor('methods'), state: methods },
      curiosity: { anchor: anchor('curiosity'), state: curiosity },
      will: { anchor: anchor('will'), state: will },
      agenda: { anchor: anchor('agenda'), state: agenda },
    },
    narrative: {
      memory: { anchor: anchor('memory'), state: memory },
      promptings: { anchor: anchor('promptings'), state: promptings },
      review: { anchor: anchor('review'), state: review },
      character: { anchor: anchor('character'), state: character },
      chronicle: { anchor: anchor('chronicle'), open: chronicle.open },
    },
  };
  const clocks = (
    [
      'body',
      'affect',
      'crisis',
      'lifecourse',
      'family',
      'agenda',
      'beliefs',
      'social',
      'habits',
      'skills',
      'needs',
      'conscience',
      'curiosity',
      'projects',
      'persistence',
      'promptings',
      'review',
      'chronicle',
      'character',
      'prospection',
      'methods',
      'will',
    ] as const
  ).map((owner) => ({ person: spec.id, owner, advancedThrough: context.at }));
  return { actor, continuation, clocks, allocations, constructionEvents, constructionEffects };
}

/** Source interoception premise: current held fast and consecutive retained kept
 * abstention records. This is not a claim about unrecorded lifetime practice. */
export function reanchorConstructedActor(
  actor: T.ActorState,
  built: ConstructedActor,
  context: T.DeepReadonly<T.FrameContext>,
  owners: ConstructorOwners & { body: Pick<T.BodyOwner, 'initialize' | 'receive'> },
): ConstructedActor {
  if (actor.id !== context.person || actor.now !== context.at)
    throw new RangeError('Portable construction identity or clock mismatch');
  if (canonicalJson(actor.affect.crisis) !== canonicalJson(built.actor.affect.crisis))
    throw new RangeError('Portable crisis requires an explicit carried continuation representation');
  // The actual target doze context is already authored in this construction.
  // Reinstalling it asks the owning body endpoint to anchor the carried vector;
  // no receipt or elapsed recovery is invented, and any actual state change fails.
  const body = owners.body.receive(
    actor.body,
    { kind: 'ambient-context', context: actor.body.doze.context, basis: actor.body.doze.basis },
    { ...context, continuation: built.continuation.body, dozeContinuation: built.continuation.doze },
  );
  if (canonicalJson(body.state) !== canonicalJson(actor.body) || body.events.length)
    throw new RangeError('Portable body arrival would require an unrecorded physical consequence');
  const { crisis, ...affectState } = actor.affect;
  const affect = owners.affect.initialize(affectState, context);
  const life = owners.life.initialize(
    { name: actor.name, birthAt: actor.life.bornAt, sex: actor.life.sex },
    context,
  );
  const { beliefs, sourceTrust, contradictions, ...memory } = actor.memory;
  const anchor = (owner: T.FacultyId): T.ContinuousAnchor => ({
    at: context.at,
    conditionId: hashCanonical('hf-run4/admission-anchor', actor.id, owner, context.at, context.causes),
  });
  return {
    ...built,
    actor: { ...actor, body: body.state, life: life.state, affect: { ...affect.state, crisis } },
    continuation: {
      ...built.continuation,
      person: actor.id,
      body: body.continuation,
      doze: body.dozeContinuation,
      affect: affect.continuation,
      life: life.continuation,
      deliberation: {
        needs: { anchor: anchor('needs'), state: actor.needs },
        beliefs: { anchor: anchor('beliefs'), state: { beliefs, sourceTrust, contradictions } },
        social: { anchor: anchor('social'), state: actor.social },
        habits: { anchor: anchor('habits'), state: actor.habits },
        conscience: { anchor: anchor('conscience'), state: actor.conscience },
        skills: { anchor: anchor('skills'), state: actor.skills },
        projects: { anchor: anchor('projects'), state: actor.projects },
        persistence: { anchor: anchor('persistence'), state: actor.pursuit },
        prospection: { anchor: anchor('prospection'), state: actor.prospection },
        methods: { anchor: anchor('methods'), state: actor.methods },
        curiosity: { anchor: anchor('curiosity'), state: actor.curiosity },
        will: { anchor: anchor('will'), state: actor.will },
        agenda: { anchor: anchor('agenda'), state: actor.agenda },
      },
      narrative: {
        memory: { anchor: anchor('memory'), state: memory },
        promptings: { anchor: anchor('promptings'), state: actor.promptings },
        review: { anchor: anchor('review'), state: actor.review },
        character: {
          anchor: anchor('character'),
          state: { character: actor.character, traits: actor.traits, values: actor.values },
        },
        chronicle: { anchor: anchor('chronicle'), open: actor.chronicleDay },
      },
    },
    clocks: built.clocks.map((clock) => ({ ...clock, advancedThrough: context.at })),
  };
}

export function bodyPerception(actor: T.DeepReadonly<T.ActorState>, at: T.Time): T.BodyPerceptionContext {
  const open = actor.agenda.commitments.find(
    (c) =>
      c.kind === 'abstain' &&
      c.status === 'pending' &&
      c.exempt === undefined &&
      (c.violatedBy?.includes('eat') ?? false) &&
      at >= c.from &&
      at < c.until,
  );
  if (!open) return { fasting: false, fastingDays: 0 };
  const today = Math.floor(at / 86400000);
  let fastingDays = 0;
  for (let index = actor.chronicle.length - 1; index >= 0; index--) {
    const day = actor.chronicle[index];
    if (
      !day ||
      day.day !== today - 1 - fastingDays ||
      !day.kept.some(
        (note) => note.kind === 'abstain' && (open.label === undefined || note.label === open.label),
      )
    )
      break;
    fastingDays++;
  }
  return { fasting: true, fastingDays };
}
