/** SCOPE: map the sole versioned portable route into an ordinary authored opening.
 * Unmapped duties and unsupported active work refuse the whole admission. Calendar
 * and norm provenance remain replay inputs; none of these data compute a ruling.
 */
import { cloneData } from './core/clone.ts';
import {
  admitPortablePerson,
  type PortableAdmission,
  type PortableRetainedState,
  validatePortablePerson,
} from './portable-person.ts';
import { canonicalJson } from './run-canonical.ts';
import { type ConstructedActor, restoreAfterActionCue } from './run-person.ts';
import type * as T from './run-schema.ts';

const refuse = (): never => {
  throw new TypeError(
    'This person cannot continue here with this saved history. Keep the source chapter or export it. Your saved history has not been replaced.',
  );
};
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
export function preparePortable(
  input: T.DeepReadonly<T.PersonAuthoring>,
  definitions: T.DeepReadonly<T.Definitions>,
  at: number,
  knownEntities: readonly string[] = [],
): { authored: T.PersonAuthoring; retained?: PortableRetainedState } {
  const authored = cloneData(input) as T.PersonAuthoring;
  delete authored.portable;
  if (!input.portable) return { authored };
  const admission = input.portable as PortableAdmission;
  const passport = validatePortablePerson(admission.person);
  if (authored.identity.castId !== undefined && authored.identity.castId !== passport.castId) refuse();
  authored.identity.castId = passport.castId;
  if (passport.version === 1) return { authored: admitPortablePerson(passport, authored) };
  const retained = cloneData(passport.retained) as PortableRetainedState;
  const offset = admission.mapping.offsetMs;
  if (!Number.isSafeInteger(offset) || retained.at + offset !== at) refuse();
  const source = retained.calendar.definition,
    target = definitions.calendar;
  if (source.dayMs !== target.dayMs) refuse();
  const maps = new Map<string, string>();
  const declaredTargets = new Set<string>();
  const resolvedTargets = new Map<string, string>();
  for (const binding of admission.mapping.references) {
    const key = `${binding.kind}:${binding.source}`;
    const destination = `${binding.kind}:${binding.target}`;
    if (maps.has(key) || declaredTargets.has(destination)) refuse();
    declaredTargets.add(destination);
    maps.set(key, binding.target);
  }
  const entities = new Set([
    authored.id,
    ...knownEntities,
    ...definitions.sources.filter((x) => x.type === 'person').map((x) => x.id),
  ]);
  const allowed = {
    action: new Set(definitions.actions.map((x) => x.id)),
    source: new Set([authored.id, ...definitions.sources.map((x) => x.id)]),
    norm: new Set(definitions.norms.map((x) => x.id)),
    entity: entities,
    proposition: undefined,
  };
  const mappedId = (kind: keyof typeof allowed, id: string): string =>
    maps.get(`${kind}:${id}`) ??
    ((kind === 'entity' || kind === 'source') && (id === passport.source.personId || id === 'self')
      ? authored.id
      : id);
  const map = (kind: keyof typeof allowed, id: string): string => {
    const mapped = mappedId(kind, id);
    const destination = `${kind}:${mapped}`;
    const source = (kind === 'entity' || kind === 'source') && id === 'self' ? passport.source.personId : id;
    if (resolvedTargets.has(destination) && resolvedTargets.get(destination) !== source) refuse();
    resolvedTargets.set(destination, source);
    if (allowed[kind] && !allowed[kind]?.has(mapped)) refuse();
    return mapped;
  };
  const clock = (time: number) => {
    const shifted = time + offset;
    if (!Number.isSafeInteger(shifted)) refuse();
    return shifted;
  };
  for (const belief of retained.memory.beliefs) {
    belief.prop = map('proposition', belief.prop);
    belief.updatedAt = clock(belief.updatedAt);
    for (const source of belief.sources) source.id = map('source', source.id);
    if (belief.provenance) {
      belief.provenance.at = clock(belief.provenance.at);
      belief.provenance.origin = map('source', belief.provenance.origin);
      belief.provenance.firstFrom = map('source', belief.provenance.firstFrom);
    }
  }
  const trust: Record<string, number> = {};
  for (const [id, value] of Object.entries(retained.memory.sourceTrust)) {
    const target = map('source', id);
    if (Object.hasOwn(trust, target)) refuse();
    trust[target] = value;
  }
  retained.memory.sourceTrust = trust;
  for (const episode of [...retained.memory.episodes, ...retained.memory.gists]) {
    episode.at = clock(episode.at);
    if (episode.recalledAt !== undefined) episode.recalledAt = clock(episode.recalledAt);
    if (episode.action !== undefined) episode.action = map('action', episode.action);
    for (const key of ['actorId', 'targetId', 'placeId'] as const)
      if (episode[key] !== undefined) episode[key] = map('entity', episode[key]);
    if (episode.voiceId !== undefined) episode.voiceId = map('source', episode.voiceId);
  }
  for (const gist of retained.memory.gists) {
    gist.firstAt = clock(gist.firstAt);
    gist.lastAt = clock(gist.lastAt);
  }
  for (const expectation of retained.memory.expectations) {
    const key = expectation.key;
    // Memory uses a complete action ID for an untargeted expectation. IDs may
    // contain @, so only interpret a separator after resolving that whole ID.
    if (maps.has(`action:${key}`) || allowed.action.has(key)) {
      expectation.key = map('action', key);
      continue;
    }
    const pairs: { action: string; target: string }[] = [];
    for (let at = key.indexOf('@'); at >= 0; at = key.indexOf('@', at + 1)) {
      const action = key.slice(0, at),
        target = key.slice(at + 1);
      if (allowed.action.has(mappedId('action', action)) && allowed.entity.has(mappedId('entity', target)))
        pairs.push({ action, target });
    }
    // The flat memory key cannot distinguish multiple valid action/target
    // decompositions. Refuse ambiguity rather than change its remembered meaning.
    if (pairs.length !== 1) refuse();
    const pair = pairs[0]!;
    expectation.key = `${map('action', pair.action)}@${map('entity', pair.target)}`;
  }
  for (const contradiction of retained.memory.contradictions) {
    contradiction.sourceId = map('source', contradiction.sourceId);
    contradiction.prop = map('proposition', contradiction.prop);
    contradiction.at = clock(contradiction.at);
  }
  for (const norm of retained.heldNorms) norm.normId = map('norm', norm.normId);
  for (const norm of retained.calendar.norms) {
    const mapped = definitions.norms.find((n) => n.id === map('norm', norm.id));
    if (!mapped || !same({ ...norm, id: mapped.id }, mapped)) refuse();
  }
  for (const commitment of retained.agenda.commitments) {
    commitment.actions = commitment.actions.map((id) => map('action', id));
    if (commitment.violatedBy) commitment.violatedBy = commitment.violatedBy.map((id) => map('action', id));
    if (commitment.toId !== undefined) commitment.toId = map('entity', commitment.toId);
    if (commitment.targetId !== undefined) commitment.targetId = map('entity', commitment.targetId);
    if (commitment.normId !== undefined) commitment.normId = map('norm', commitment.normId);
    commitment.from = clock(commitment.from);
    commitment.until = clock(commitment.until);
    if (commitment.recurUntil !== undefined) commitment.recurUntil = clock(commitment.recurUntil);
    if (commitment.exempt) commitment.exempt.at = clock(commitment.exempt.at);
  }
  for (const owed of retained.agenda.owed) {
    owed.actions = owed.actions.map((id) => map('action', id));
    if (owed.violatedBy) owed.violatedBy = owed.violatedBy.map((id) => map('action', id));
    if (owed.normId !== undefined) owed.normId = map('norm', owed.normId);
    owed.at = clock(owed.at);
    if (owed.lapseSince !== undefined) owed.lapseSince = clock(owed.lapseSince);
  }
  if (retained.agenda.lapse) retained.agenda.lapse.since = clock(retained.agenda.lapse.since);
  authored.identity.birthAt = clock(retained.bornAt);
  authored.identity.sex = retained.sex;
  if (authored.identity.birthAt > at) refuse();
  const opening = authored.state;
  // A receiving opening cannot replace the incoming remembered life or duties.
  if (
    authored.biography.length ||
    opening.beliefs.length ||
    opening.expectations.length ||
    opening.sourceTrust.length ||
    opening.heldNorms.length ||
    opening.agenda.commitments.length ||
    opening.agenda.owed.length ||
    opening.agenda.goals.length ||
    opening.agenda.precommitments.length
  )
    refuse();
  const { retained: _retained, ...base } = passport;
  const approximate = { ...base, version: 1 as const };
  const arrival = admitPortablePerson(approximate, authored);
  if (retained.agenda.exemptions.validUntil !== undefined)
    retained.agenda.exemptions.validUntil = clock(retained.agenda.exemptions.validUntil);
  arrival.state.agenda.exemptions = retained.agenda.exemptions;
  arrival.state.beliefs = retained.memory.beliefs;
  arrival.state.sourceTrust = Object.entries(retained.memory.sourceTrust).map(([sourceId, trust]) => ({
    sourceId,
    trust,
  }));
  arrival.state.heldNorms = retained.heldNorms;
  arrival.state.agenda.commitments = retained.agenda.commitments.map(
    ({ status: _status, exempt: _exempt, ...data }) => data,
  );
  arrival.state.agenda.owed = retained.agenda.owed;
  // The full memory passes the memory owner validator below; do not manufacture
  // authored salience metadata just to force it through the biography constructor.
  return { authored: arrival, retained };
}
export function installPortable(built: ConstructedActor, retained: PortableRetainedState): void {
  built.actor.memory = cloneData(retained.memory);
  restoreAfterActionCue(built.actor);
  built.actor.agenda.commitments = cloneData(retained.agenda.commitments);
  built.actor.agenda.owed = cloneData(retained.agenda.owed);
  built.actor.agenda.nextId = retained.agenda.nextId;
  if (retained.agenda.lapse) built.actor.agenda.lapse = cloneData(retained.agenda.lapse);
  const { beliefs, sourceTrust, contradictions, ...memory } = built.actor.memory;
  built.continuation.deliberation.beliefs.state = { beliefs, sourceTrust, contradictions };
  built.continuation.narrative.memory.state = memory;
  built.continuation.deliberation.agenda.state = cloneData(built.actor.agenda);
  built.allocations = [
    ...built.allocations,
    ...retained.memory.episodes.map((e) => ({ kind: 'episode' as const, id: e.id })),
    ...retained.memory.gists.map((e) => ({ kind: 'gist' as const, id: e.id })),
  ];
}
