/** SCOPE: C0-owned run infrastructure and stable identity-derived streams.
 * Faculty constructors own person slices; none are initialized here.
 */
import { createRng } from './core/random.ts';
import { canonicalJson, compareCodePoints, hashCanonical } from './run-canonical.ts';
import type {
  ActorRandomCursor,
  ConstructionRandomCursor,
  DeepReadonly,
  EntityRef,
  RunSpec,
  RunState,
  StreamIdentity,
} from './run-schema.ts';

function seedFor(runSeed: number, identity: DeepReadonly<StreamIdentity>): number {
  return Number.parseInt(hashCanonical('hf-run4/stream-seed', runSeed, identity).slice(0, 8), 16);
}
export function actorStream(runSeed: number, person: string): ActorRandomCursor {
  const identity = { kind: 'actor' as const, person };
  const seed = seedFor(runSeed, identity);
  return {
    words: createRng(seed),
    identity: {
      id: hashCanonical('hf-run4/stream-id', runSeed, identity),
      seed,
      uniformDraws: 12,
      initializationDraws: 12,
      origin: { runSeed, person },
    },
  };
}
export function constructionStream<K extends 'gestation' | 'inheritance'>(
  runSeed: number,
  identity: Extract<StreamIdentity, { kind: K }>,
): ConstructionRandomCursor<K> {
  const seed = seedFor(runSeed, identity);
  return {
    id: hashCanonical('hf-run4/stream-id', runSeed, identity),
    identity,
    origin: { runSeed, identity },
    seed,
    words: createRng(seed),
    uniformDraws: 12,
    initializationDraws: 12,
    status: 'active',
  };
}
export function initialRunState(spec: DeepReadonly<RunSpec>): RunState {
  const entities = new Map<string, EntityRef>();
  // A declared person source is a known external identity, not a fabricated actor.
  // It can therefore be named by authored ties before later materialization.
  for (const source of spec.definitions.sources)
    if (source.type === 'person') entities.set(source.id, { kind: 'entity', id: source.id });
  for (const fact of spec.world.facts) entities.set(fact.subject, { kind: 'entity', id: fact.subject });

  for (const premise of spec.lifecycle.kinPremises) {
    entities.set(premise.from.id, { ...premise.from });
    entities.set(premise.to.id, { ...premise.to });
  }
  for (const scope of spec.lifecycle.kinScopes)
    for (const entity of scope.people) entities.set(entity.id, { ...entity });
  return {
    at: spec.start,
    cursor: {
      at: spec.start,
      closed: false,
      phase: 0,
      fidelity: { mode: 'fine' },
      frameOrdinal: 0,
      localOrdinal: 0,
      resolutionLane: [],
    },
    ownerClocks: [],
    world: JSON.parse(canonicalJson(spec.world)) as RunState['world'],
    people: {},
    community: {
      idleUntil: {},
      perceivedUntil: {},
      interrupts: {},
      joint: { nextId: 1, proposals: [], excluded: {} },
      partnerDeaths: {},
      queued: {},
      dayDone: {},
      standingDone: {},
    },
    offers: {},
    routines: [],
    rng: createRng(spec.seed),
    wording: {},
    queue: [],
    pending: [],
    receipts: {
      dispositions: [],
      communications: [],
      inputs: [],
      settlements: [],
      evidence: [],
      effects: [],
      allocated: [],
    },
    effects: [],
    events: [],
    counters: {
      nextInput: 1,
      nextRequest: 1,
      nextEvent: 1,
      nextActivity: 1,
      nextTransaction: 1,
    },
    lifecycle: {
      kinRevision: 0,
      entities: [...entities.values()].sort((a, b) => compareCodePoints(a.id, b.id)),
      origins: [],
      kinPremises: JSON.parse(
        canonicalJson(spec.lifecycle.kinPremises),
      ) as RunState['lifecycle']['kinPremises'],
      kinScopes: JSON.parse(canonicalJson(spec.lifecycle.kinScopes)) as RunState['lifecycle']['kinScopes'],
      streams: [],
      appliedEffects: [],
    },
    continuations: [],
    chapter: {},
  };
}
