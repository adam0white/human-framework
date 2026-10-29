/** SCOPE: transactional envelope preflight. This module reads an admitted run
 * snapshot and returns detached canonical inputs. It never mutates run state.
 * Faculty/reference and lifecycle admission remains in the owning validators.
 */

import { prayerWindows } from './agenda/prayer.ts';
import { wordingIssue } from './narrate/variants.ts';
import { compareCodePoints } from './run-canonical.ts';
import { PERSON_DEFAULTS } from './run-person-priors.ts';
import type {
  ContractError,
  DeepReadonly,
  HostRequest,
  Id,
  Input,
  InputDisposition,
  Result,
  Source,
  StepBatch,
  Time,
  WorldChange,
} from './run-schema.ts';
import { validateData } from './run-validation.ts';
import { REPUTATION_TRAITS } from './social/social.ts';

export type BoundaryAdmission = {
  at: Time;
  closed: boolean;
  resolutionLane: readonly Id[];
  worldRevision: number;
  hostId: Id;
  sources: readonly Source[];
  people: readonly Id[];
  acceptedInputIds: ReadonlySet<Id>;
  queued: readonly Input[];
  pending: readonly HostRequest[];
};
function fail(code: ContractError['code'], path: string, message: string): Result<never> {
  return { ok: false, error: { code, path, message } };
}
export function compareInputs(a: DeepReadonly<Input>, b: DeepReadonly<Input>): number {
  return (
    a.at - b.at ||
    compareCodePoints(a.source.type, b.source.type) ||
    compareCodePoints(a.source.id, b.source.id) ||
    compareCodePoints(a.id, b.id)
  );
}

/** The archived hf-person/4 DTO and chapter projection remain unsupported.
 * Retained people use the versioned PortablePerson route through createPerson.
 */
export const PORTABLE_ADMISSION_REJECTED =
  'Archived persona admission and chapter projection are unsupported; use the versioned portable route through createPerson';

/** C0 constructor admission. Faculty validators still check their own retained
 * state. Known external identities permit forward cast ties without fake actors.
 */
export function checkPersonAuthoring(
  state: DeepReadonly<Pick<import('./run-schema.ts').RunState, 'at' | 'people' | 'lifecycle'>>,
  definitions: DeepReadonly<import('./run-schema.ts').Definitions>,
  started: boolean,
  input: unknown,
): Result<DeepReadonly<import('./run-schema.ts').PersonAuthoring>> {
  const parsed = validateData('PersonAuthoring', input);
  if (!parsed.ok) return parsed;
  const person = parsed.value;
  if (person.portable !== undefined)
    return fail(
      'invalid-admission',
      '$.portable',
      'Portable admission uses createPerson before the first step',
    );
  if (
    !Number.isSafeInteger(person.state.retention.trace) ||
    person.state.retention.trace < 0 ||
    person.state.retention.trace > PERSON_DEFAULTS.maxTrace ||
    !Number.isSafeInteger(person.state.retention.chronicleDays) ||
    person.state.retention.chronicleDays < 31
  )
    return fail(
      'invalid-admission',
      '$.state.retention',
      'trace must be within the source bound and chronicleDays must retain at least31 days',
    );
  if (started) return fail('closed-time', '$', 'authored people must be constructed before the first step');
  if (Object.hasOwn(state.people, person.id)) return fail('duplicate-id', '$.id', 'person already exists');
  if (person.identity.birthAt > state.at || !Number.isSafeInteger(state.at - person.identity.birthAt))
    return fail(
      'invalid-admission',
      '$.identity.birthAt',
      'birth must precede construction within exact clock range',
    );
  const entities = new Set([
    person.id,
    ...Object.keys(state.people),
    ...state.lifecycle.entities.map((entity) => entity.id),
  ]);
  const skills = new Set(definitions.skills.map((skill) => skill.id));
  const norms = new Set(definitions.norms.map((norm) => norm.id));
  const actions = new Set(definitions.actions.map((action) => action.id));
  const voices = new Set(
    definitions.sources
      .filter((source) => source.type === 'voice' || source.type === 'person')
      .map((source) => source.id),
  );
  const sources = new Set(definitions.sources.map((source) => source.id));
  const refs: { id: Id; path: string; known: ReadonlySet<Id> }[] = [];
  for (const [index, tie] of person.state.relationships.entries())
    refs.push({ id: tie.otherId, path: `$.state.relationships[${index}].otherId`, known: entities });
  for (const [index, skill] of person.state.skills.entries())
    refs.push({ id: skill.id, path: `$.state.skills[${index}].id`, known: skills });
  for (const [index, norm] of person.state.heldNorms.entries())
    refs.push({ id: norm.normId, path: `$.state.heldNorms[${index}].normId`, known: norms });
  for (const [index, habit] of person.state.habits.entries())
    refs.push({ id: habit.action, path: `$.state.habits[${index}].action`, known: actions });
  for (const [index, voice] of person.state.voices.entries())
    refs.push({ id: voice.voiceId, path: `$.state.voices[${index}].voiceId`, known: voices });
  for (const [index, source] of person.state.sourceTrust.entries())
    refs.push({ id: source.sourceId, path: `$.state.sourceTrust[${index}].sourceId`, known: sources });
  const episodeIds = new Set<Id>();
  for (const [index, episode] of person.biography.entries()) {
    const path = `$.biography[${index}]`;
    if (episodeIds.has(episode.id)) return fail('duplicate-id', `${path}.id`, 'duplicate authored episode');
    episodeIds.add(episode.id);
    if (episode.at > state.at || (episode.recalledAt !== undefined && episode.recalledAt > state.at))
      return fail('invalid-admission', `${path}.at`, 'biography cannot contain future experience');
    if (episode.action !== undefined)
      refs.push({ id: episode.action, path: `${path}.action`, known: actions });
    for (const key of ['actorId', 'targetId', 'placeId'] as const) {
      const id = episode[key];
      if (id !== undefined) refs.push({ id, path: `${path}.${key}`, known: entities });
    }
    if (episode.voiceId !== undefined)
      refs.push({ id: episode.voiceId, path: `${path}.voiceId`, known: voices });
  }
  for (const reference of refs)
    if (!reference.known.has(reference.id))
      return fail('unknown-id', reference.path, 'reference must name a declared definition or known entity');
  return parsed;
}
function changedRevision(
  change: DeepReadonly<WorldChange>,
  revision: number,
  path: string,
  at: Time,
): Result<number> {
  if (
    !Number.isSafeInteger(change.expectedRevision) ||
    !Number.isSafeInteger(change.revision) ||
    change.expectedRevision !== revision ||
    change.revision !== revision + 1
  )
    return fail('world-revision', path, 'world changes must form a successive revision chain');
  const puts = new Set<Id>();
  for (const fact of change.put) {
    if (puts.has(fact.id)) return fail('duplicate-id', path, 'duplicate world fact');
    if (fact.at > at) return fail('invalid-admission', path, 'world change contains future evidence');
    puts.add(fact.id);
  }
  const removes = new Set<Id>();
  for (const id of change.remove) {
    if (removes.has(id) || puts.has(id)) return fail('duplicate-id', path, 'ambiguous world change');
    removes.add(id);
  }
  return { ok: true, value: change.revision };
}
function personTarget(input: DeepReadonly<Input>): Id | undefined {
  const p = input.payload;
  if ('person' in p && typeof p.person === 'string') return p.person;
  if ('speaker' in p) return p.speaker;
  if ('teller' in p) return p.teller;
  return undefined;
}
function resolution(
  input: DeepReadonly<Input>,
): input is DeepReadonly<Input<'action.resolved' | 'communication.resolved'>> {
  return input.kind === 'action.resolved' || input.kind === 'communication.resolved';
}
export function checkBatchEnvelope(
  state: DeepReadonly<Omit<BoundaryAdmission, 'acceptedInputIds'>> & {
    readonly acceptedInputIds: ReadonlySet<Id>;
  },
  input: unknown,
): Result<DeepReadonly<StepBatch>> {
  const parsed = validateData('StepBatch', input);
  if (!parsed.ok) return parsed;
  const batch = parsed.value;
  if (batch.until < state.at) return fail('past-input', '$.until', 'until precedes run time');
  if (!Number.isSafeInteger(batch.until - state.at))
    return fail('invalid-schema', '$.until', 'elapsed duration exceeds exact integer range');
  const seen = new Set<Id>();
  // Queued IDs were accepted already. The ledger and queue deliberately overlap.
  for (const queued of state.queued) seen.add(queued.id);
  const sorted = [...batch.inputs].sort(compareInputs);
  for (const [index, entry] of sorted.entries()) {
    const path = `$.inputs[${index}]`;
    if (
      entry.kind === 'conversation.requested' &&
      entry.payload.confidentMin !== undefined &&
      entry.payload.confidentMin > 0.5
    )
      return fail(
        'invalid-schema',
        `${path}.payload.confidentMin`,
        'confidence distance must be between 0 and 0.5',
      );
    if (
      entry.kind === 'retelling.requested' &&
      entry.payload.limit !== undefined &&
      (!Number.isInteger(entry.payload.limit) || entry.payload.limit < 0 || entry.payload.limit > 3)
    )
      return fail('invalid-schema', `${path}.payload.limit`, 'limit must be an integer from 0 through 3');
    if (entry.kind === 'voice.evidence-received') {
      const { evidence, evidenceId, voiceId } = entry.payload;
      if (entry.id !== evidenceId || evidenceId !== evidence.id)
        return fail(
          'invalid-admission',
          `${path}.id`,
          'use the stable outcome identity as input and evidence id',
        );
      if (evidence.occurredAt > entry.at)
        return fail(
          'invalid-admission',
          `${path}.payload.evidence.occurredAt`,
          'actual evidence cannot occur in the future',
        );
      if (!state.sources.some((source) => source.type === 'voice' && source.id === voiceId))
        return fail('unknown-id', `${path}.payload.voiceId`, 'evidence requires a registered voice');
    }
    if (entry.kind === 'social.received' && entry.payload.sourceTrustResponse) {
      const response = entry.payload.sourceTrustResponse;
      if (response.sourceId !== entry.payload.other)
        return fail(
          'invalid-admission',
          `${path}.payload.sourceTrustResponse.sourceId`,
          'response source must be the other person',
        );
      if (response.sourceId === entry.payload.person || response.sourceId === 'self')
        return fail(
          'invalid-admission',
          `${path}.payload.sourceTrustResponse.sourceId`,
          'authored source trust responses cannot target self',
        );
      if (!state.sources.some((source) => source.id === response.sourceId))
        return fail(
          'unknown-id',
          `${path}.payload.sourceTrustResponse.sourceId`,
          'source trust response requires a registered source',
        );
    }
    if (seen.has(entry.id) || state.acceptedInputIds.has(entry.id))
      return fail('duplicate-id', `${path}.id`, 'input ID already accepted');
    seen.add(entry.id);
    if (entry.at < state.at) return fail('past-input', `${path}.at`, 'input precedes run time');
    if (entry.at > batch.until) return fail('invalid-schema', `${path}.at`, 'input exceeds until');
    if (
      entry.at === state.at &&
      (state.closed || state.resolutionLane.length > 0) &&
      !(resolution(entry) && state.resolutionLane.includes(entry.payload.requestId))
    )
      return fail('closed-time', `${path}.at`, 'timestamp accepts only its pending resolution lane');
    if (
      entry.source.type === 'host'
        ? entry.source.id !== state.hostId
        : !state.sources.some((source) => source.type === entry.source.type && source.id === entry.source.id)
    )
      return fail('unknown-id', `${path}.source`, 'source is not registered in this run');
    const target = personTarget(entry);
    if (target !== undefined && !state.people.includes(target))
      return fail('unknown-id', `${path}.payload`, 'recipient is not an admitted person');
    if (entry.source.type === 'person' && target !== entry.source.id)
      return fail('invalid-admission', `${path}.source`, 'person source may act only as itself');
    if (entry.source.type === 'voice') {
      const p = entry.payload;
      for (const [key, value] of Object.entries(p))
        if (
          ['voiceId', 'sourceId', 'teacher', 'teller', 'reporter', 'reporterId'].includes(key) &&
          value !== entry.source.id
        )
          return fail('invalid-admission', `${path}.payload.${key}`, 'voice source may name only itself');
    }
  }
  // Include queued changes: later accepted input must respect their future chain.
  let revision = state.worldRevision;
  const settled = new Set<Id>();
  for (const entry of [...state.queued, ...sorted].sort(compareInputs)) {
    const path = `$.input:${entry.id}`;
    if (entry.kind === 'world.changed') {
      // A previously accepted future snapshot can become superseded while the
      // run waits at an earlier host boundary. Consumption records its refusal.
      if (state.acceptedInputIds.has(entry.id) && entry.payload.expectedRevision !== revision) continue;
      const next = changedRevision(entry.payload, revision, path, entry.at);
      if (!next.ok) return next;
      revision = next.value;
    } else if (entry.kind === 'action.resolved' || entry.kind === 'communication.resolved') {
      const receipt = entry.payload;
      if (settled.has(receipt.requestId)) return fail('already-resolved', path, 'request settled twice');
      settled.add(receipt.requestId);
      const request = state.pending.find((r) => r.id === receipt.requestId);
      if (!request || request.boundaryAt !== entry.at || request.requestHash !== receipt.requestHash)
        return fail('request-mismatch', path, 'resolution does not match an existing pending request');
      if (receipt.worldRevision !== revision)
        return fail('world-revision', path, 'resolution uses a stale world revision');
      if (entry.kind === 'action.resolved') {
        const r = entry.payload;
        if (
          request.kind !== 'action' ||
          r.person !== request.person ||
          r.activityId !== request.activityId ||
          r.stage !== request.stage
        )
          return fail('request-mismatch', path, 'action identity or stage mismatch');
        const allowed =
          r.stage === 'start'
            ? r.disposition === 'accepted' || r.disposition === 'rejected'
            : r.stage === 'finish'
              ? r.disposition === 'completed' || r.disposition === 'failed'
              : r.disposition === 'interrupted' || r.disposition === 'failed';
        if (!allowed || (r.stage === 'start' ? r.outcome !== undefined : r.outcome === undefined))
          return fail('request-mismatch', path, 'invalid stage disposition or outcome presence');
        if (
          r.outcome &&
          (r.outcome.activityId !== request.activityId ||
            r.outcome.offerId !== request.offerId ||
            r.outcome.end !== entry.at ||
            r.outcome.start > r.outcome.end ||
            !Number.isSafeInteger(r.outcome.end - r.outcome.start) ||
            r.outcome.status !== r.disposition)
        )
          return fail('request-mismatch', path, 'outcome clock, status or identity mismatch');
      } else {
        const r = entry.payload;
        if (request.kind !== 'communication' || request.speaker !== r.speaker)
          return fail('request-mismatch', path, 'communication speaker mismatch');
        const emitted = new Set(r.emittedItemIds);
        if (
          emitted.size !== r.emittedItemIds.length ||
          r.emittedItemIds.some((id) => !request.items.some((item) => item.id === id))
        )
          return fail('request-mismatch', path, 'unknown or repeated emitted communication item');
        const received = new Set<Id>();
        const evidence = new Set<Id>();
        for (const reception of r.received) {
          if (
            received.has(reception.recipient) ||
            evidence.has(reception.evidenceId) ||
            !request.recipients.includes(reception.recipient) ||
            new Set(reception.itemIds).size !== reception.itemIds.length ||
            reception.itemIds.some((id) => !emitted.has(id))
          )
            return fail('request-mismatch', path, 'unknown or duplicate communication reception');
          received.add(reception.recipient);
          evidence.add(reception.evidenceId);
        }
      }
      if (receipt.worldChange) {
        const next = changedRevision(receipt.worldChange, revision, path, entry.at);
        if (!next.ok) return next;
        revision = next.value;
      }
    }
  }
  return { ok: true, value: Object.freeze({ ...batch, inputs: Object.freeze(sorted) }) };
}

export type ConsumptionPremises = {
  alive: boolean;
  worldRevision?: number;
  activity?: { id: Id } | null;
  offerAvailable?: boolean;
  contextAvailable?: boolean;
  goalActive?: boolean;
  pregnancyOpen?: boolean;
  bondOpen?: boolean;
};
export function classifyQueuedInput(
  input: DeepReadonly<Input>,
  premises: DeepReadonly<ConsumptionPremises>,
): Pick<InputDisposition, 'kind' | 'reason'> {
  if (
    input.kind === 'world.changed' &&
    premises.worldRevision !== undefined &&
    input.payload.expectedRevision !== premises.worldRevision
  )
    return { kind: 'inapplicable', reason: 'world-revision-changed' };
  // Lifecycle/arrival/world/settlements have their own factual admission. A dead
  // recipient cannot carry out an ordinary queued intention or attend new evidence.
  if (
    !resolution(input) &&
    input.kind !== 'lifecycle.received' &&
    input.kind !== 'person.arrived' &&
    input.kind !== 'world.changed' &&
    input.kind !== 'chapter.elapsed' &&
    !premises.alive
  )
    return { kind: 'inapplicable', reason: 'actor-dead' };
  if (input.kind === 'activity.interrupted' && premises.activity?.id !== input.payload.activityId)
    return { kind: 'inapplicable', reason: 'activity-ended' };
  if (premises.offerAvailable === false) return { kind: 'inapplicable', reason: 'offer-withdrawn' };
  if (premises.contextAvailable === false) return { kind: 'inapplicable', reason: 'context-ended' };
  if (premises.goalActive === false) return { kind: 'inapplicable', reason: 'goal-closed' };
  if (premises.pregnancyOpen === false) return { kind: 'inapplicable', reason: 'pregnancy-ended' };
  if (premises.bondOpen === false) return { kind: 'inapplicable', reason: 'bond-ended' };
  return { kind: 'consumed', reason: 'applied' };
}

// Run definition membership is fixed before any person or input can enter.
export function checkRunSpec(input: unknown): Result<DeepReadonly<import('./run-schema.ts').RunSpec>> {
  const admitted = validateData('RunSpec', input);
  if (!admitted.ok) return admitted;
  const spec = admitted.value;
  const reputationIds = new Set(Object.keys(REPUTATION_TRAITS));
  for (const trait of spec.definitions.reputationTraits ?? []) {
    if (reputationIds.has(trait.id))
      return fail('duplicate-id', '$.definitions.reputationTraits', 'duplicate or builtin reputation trait');
    if (trait.id.includes(':'))
      return fail(
        'invalid-schema',
        '$.definitions.reputationTraits',
        'reputation trait IDs cannot contain a colon',
      );
    reputationIds.add(trait.id);
  }
  const wordingError = wordingIssue(spec.definitions.lexicon);
  if (wordingError)
    return fail(wordingError.code, `$.definitions.lexicon${wordingError.path}`, wordingError.message);
  if (!Number.isSafeInteger(spec.seed) || spec.seed < 0 || spec.seed > 0xffffffff)
    return fail('invalid-schema', '$.seed', 'seed must be an unsigned 32-bit integer');
  if (!Number.isSafeInteger(spec.world.revision) || spec.world.revision < 0)
    return fail('world-revision', '$.world.revision', 'world revision must be a nonnegative integer');
  const groups = [
    ['actions', spec.definitions.actions],
    ['norms', spec.definitions.norms],
    ['marriageCustoms', spec.definitions.marriageCustoms],
    ['skills', spec.definitions.skills],
    ['methods', spec.definitions.methods],
    ['routines', spec.definitions.routines],
    ['facts', spec.world.facts],
    ['kinPremises', spec.lifecycle.kinPremises],
    ['kinScopes', spec.lifecycle.kinScopes],
  ] as const;
  for (const [name, rows] of groups) {
    const ids = new Set<Id>();
    for (const row of rows) {
      if (ids.has(row.id)) return fail('duplicate-id', `$.${name}`, 'duplicate definition ID');
      ids.add(row.id);
    }
  }
  for (const routine of spec.definitions.routines) {
    const person = routine.entries[0]?.offer.person,
      ids = new Set<Id>();
    for (const entry of routine.entries) {
      if (
        ids.has(entry.id) ||
        entry.offer.person !== person ||
        entry.at < spec.start ||
        entry.offer.durationMs < 1 ||
        !Number.isSafeInteger(entry.offer.durationMs) ||
        !spec.definitions.actions.some((action) => action.id === entry.offer.actionId)
      )
        return fail(
          'invalid-admission',
          '$.definitions.routines',
          'Each routine belongs to one actor and has distinct valid future entries',
        );
      ids.add(entry.id);
    }
  }
  const sources = new Set<string>();
  for (const source of spec.definitions.sources) {
    const key = JSON.stringify([source.type, source.id]);
    if (sources.has(key)) return fail('duplicate-id', '$.definitions.sources', 'duplicate source');
    if (source.type === 'host' && source.id !== spec.host.id)
      return fail(
        'invalid-admission',
        '$.definitions.sources',
        'only the declared host may own world receipts',
      );
    sources.add(key);
  }
  const skills = new Set(spec.definitions.skills.map((skill) => skill.id));
  const transfers = new Set<string>();
  for (const transfer of spec.definitions.skillTransfers) {
    if (!skills.has(transfer.from) || !skills.has(transfer.to) || transfer.from === transfer.to)
      return fail(
        'unknown-id',
        '$.definitions.skillTransfers',
        'transfer must name two distinct declared skills',
      );
    const key = JSON.stringify([transfer.from, transfer.to]);
    if (transfers.has(key))
      return fail('duplicate-id', '$.definitions.skillTransfers', 'duplicate skill transfer');
    transfers.add(key);
  }
  const actions = new Set(spec.definitions.actions.map((action) => action.id));
  for (const action of spec.definitions.actions)
    if (action.demands.skill && !skills.has(action.demands.skill.id))
      return fail('unknown-id', '$.definitions.actions', 'action names an undeclared skill');
  for (const method of spec.definitions.methods)
    if (!actions.has(method.action))
      return fail('unknown-id', '$.definitions.methods', 'method names an undeclared action');
  for (const fact of spec.world.facts)
    if (fact.at > spec.start)
      return fail('invalid-admission', '$.world.facts', 'initial fact is future evidence');
  const calendar = spec.definitions.calendar;
  if (!Number.isSafeInteger(calendar.epoch.dayIndex) || calendar.epoch.msOfDay >= calendar.dayMs)
    return fail('invalid-schema', '$.definitions.calendar.epoch', 'invalid calendar epoch');
  // 4.0 reads time of day from simulation time: day boundaries fall on multiples of 86400000 ms.
  if (
    calendar.dayMs !== 86400000 ||
    (BigInt(calendar.epoch.msOfDay) - BigInt(calendar.epoch.simulationAt)) % 86400000n !== 0n
  )
    return fail(
      'invalid-admission',
      '$.definitions.calendar.epoch',
      'calendar days must be 86400000 ms and simulation time 0 must fall at midnight',
    );
  const days = new Set<number>();
  for (const day of calendar.days) {
    const elapsed = day.start - calendar.epoch.simulationAt;
    if (
      !Number.isSafeInteger(day.dayIndex) ||
      days.has(day.dayIndex) ||
      !Number.isSafeInteger(elapsed) ||
      BigInt(day.start) - BigInt(calendar.epoch.simulationAt) + BigInt(calendar.epoch.msOfDay) !==
        (BigInt(day.dayIndex) - BigInt(calendar.epoch.dayIndex)) * BigInt(calendar.dayMs)
    )
      return fail('invalid-schema', '$.definitions.calendar.days', 'duplicate or inconsistent calendar day');
    days.add(day.dayIndex);
    try {
      prayerWindows(day);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return fail('invalid-schema', '$.definitions.calendar.days', error.message);
    }
    for (const window of day.windows)
      if (window.until < window.from)
        return fail('invalid-schema', '$.definitions.calendar.days', 'reversed commitment window');
  }
  return admitted;
}
