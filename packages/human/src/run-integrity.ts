/** SCOPE: compose faculty-owned admission checks without repairing any slice.
 * C0 checks actor identity/clock/RNG provenance; faculty validators own numerical
 * continuations, behavioral ranges, bounded queues and their local references.
 */
import { hashCanonical } from './run-canonical.ts';
import type * as T from './run-schema.ts';
import { actorStream } from './run-state.ts';

export type IntegrityOwners = {
  body: Pick<T.BodyOwner, 'validate'>;
  affect: Pick<T.AffectOwner, 'validate'>;
  crisis: Pick<T.CrisisOwner, 'validate'>;
  life: Pick<T.LifecycleOwner, 'validate'>;
  family: Pick<T.FamilyOwner, 'validate'>;
  partnering: Pick<T.PartneringOwner, 'validate'>;
  agenda: Pick<T.AgendaOwner, 'validate'>;
  beliefs: Pick<T.BeliefOwner, 'validate'>;
  memory: Pick<T.MemoryOwner, 'validate'>;
  conscience: Pick<T.ConscienceOwner, 'validate'>;
  social: Pick<T.SocialOwner, 'validate'>;
  skills: Pick<T.SkillsOwner, 'validate'>;
  will: Pick<T.WillOwner, 'validate'>;
  promptings: Pick<T.PromptingsOwner, 'validate'>;
  review: Pick<T.ReviewOwner, 'validate'>;
  needs: Pick<T.NeedsOwner, 'validate'>;
  habits: Pick<T.HabitsOwner, 'validate'>;
  methods: Pick<T.MethodOwner, 'validate'>;
  prospection: Pick<T.ProspectionOwner, 'validate'>;
  projects: Pick<T.ProjectsOwner, 'validate'>;
  persistence: Pick<T.PersistenceOwner, 'validate'>;
  curiosity: Pick<T.CuriosityOwner, 'validate'>;
  character: Pick<T.CharacterOwner, 'validate'>;
  chronicle: Pick<T.ChronicleOwner, 'validate'>;
  environment: Pick<T.EnvironmentOwner, 'validate'>;
};
export function validateActor(
  actor: T.DeepReadonly<T.ActorState>,
  continuation: T.DeepReadonly<T.ActorContinuation>,
  allocations: readonly T.DeepReadonly<T.Reference>[],
  at: T.Time,
  effectiveParametersHash: T.Hash,
  owners: IntegrityOwners,
): readonly T.ValidationIssue[] {
  const issues: T.ValidationIssue[] = [];
  const add = (owner: T.FacultyId, list: readonly T.ValidationIssue[]) => {
    for (const issue of list)
      issues.push({
        ...issue,
        path: `$.people.${actor.id}.${owner}${issue.path === '$' ? '' : issue.path.startsWith('$') ? issue.path.slice(1) : `.${issue.path}`}`,
      });
  };
  const own = (path: string, message: string) => issues.push({ path, code: 'invalid-admission', message });
  if (actor.id !== continuation.person || actor.now !== at || actor.life.bornAt > at)
    own(`$.people.${actor.id}`, 'actor identity, continuation or clock mismatch');
  if (!Number.isSafeInteger(actor.nextDecision) || actor.nextDecision < 1)
    own(`$.people.${actor.id}.nextDecision`, 'invalid decision counter');
  const identity = actor.randomIdentity;
  const origin = actorStream(identity.origin.runSeed, identity.origin.person).identity;
  if (
    identity.id !== origin.id ||
    identity.seed !== origin.seed ||
    identity.initializationDraws !== 12 ||
    !Number.isSafeInteger(identity.uniformDraws) ||
    identity.uniformDraws < 12
  )
    own(`$.people.${actor.id}.randomIdentity`, 'actor stream provenance or draw count mismatch');
  // sfc32 writes a signed XOR into a, and unsigned 32-bit words into b/c/d.
  if (
    !Number.isInteger(actor.rng.a) ||
    actor.rng.a < -0x80000000 ||
    actor.rng.a > 0xffffffff ||
    [actor.rng.b, actor.rng.c, actor.rng.d].some(
      (word) => !Number.isInteger(word) || word < 0 || word > 0xffffffff,
    )
  )
    own(`$.people.${actor.id}.rng`, 'invalid sfc32 word');
  for (const [owner, numerical] of [
    ['body', continuation.body],
    ['doze', continuation.doze.hazard],
    ['affect', continuation.affect],
    ['crisis', continuation.crisis],
    ['life', continuation.life],
  ] as const)
    if (
      numerical.clock.advancedThroughMs !== at ||
      numerical.clock.effectiveParametersHash !== effectiveParametersHash
    )
      own(
        `$.continuations.${actor.id}.${owner}.clock`,
        'numerical clock or effective parameter identity mismatch',
      );
  const { crisis, ...affect } = actor.affect;
  const { beliefs, sourceTrust, contradictions, ...memory } = actor.memory;
  add('body', owners.body.validate(actor.body, continuation.body, continuation.doze));
  add('affect', owners.affect.validate(affect, continuation.affect));
  add('crisis', owners.crisis.validate(crisis, continuation.crisis));
  add('lifecourse', owners.life.validate(actor.life, continuation.life));
  add('family', owners.family.validate(actor.family));
  add('partnering', owners.partnering.validate(actor.bonds));
  add('agenda', owners.agenda.validate(actor.agenda));
  add('beliefs', owners.beliefs.validate({ beliefs, sourceTrust, contradictions }));
  add('memory', owners.memory.validate(memory, allocations));
  add('conscience', owners.conscience.validate(actor.conscience));
  add('social', owners.social.validate(actor.social));
  add('skills', owners.skills.validate(actor.skills));
  add('will', owners.will.validate(actor.will));
  add('promptings', owners.promptings.validate(actor.promptings));
  add('review', owners.review.validate(actor.review));
  add('needs', owners.needs.validate(actor.needs));
  add('habits', owners.habits.validate(actor.habits));
  add('methods', owners.methods.validate(actor.methods));
  add('prospection', owners.prospection.validate(actor.prospection));
  add('projects', owners.projects.validate(actor.projects));
  add('persistence', owners.persistence.validate(actor.pursuit));
  add('curiosity', owners.curiosity.validate(actor.curiosity));
  add(
    'character',
    owners.character.validate({ character: actor.character, traits: actor.traits, values: actor.values }),
  );
  add(
    'chronicle',
    owners.chronicle.validate({
      days: actor.chronicle,
      years: actor.chronicleYears,
      open: actor.chronicleDay,
    }),
  );
  add('environment', owners.environment.validate(actor.ambient));
  return issues;
}

export function validateRequestHash(request: T.DeepReadonly<T.HostRequest>): boolean {
  const { requestHash, ...body } = request;
  return requestHash === hashCanonical('hf-run4/request', body);
}
