/** SCOPE: strict current-version cold recovery. Reconstruct through the actual
 * constructor/dispatcher so only the kernel owns journals and private indexes.
 * No host adapter, migration, repair, or archived-state execution shortcut.
 */

import { projectChapterClock } from './chapter-clock.ts';
import { cloneData } from './core/clone.ts';
import { selectEventWording, wordingIssue } from './narrate/variants.ts';
import { compareInputs } from './run-admission.ts';
import { archiveHashes, checkArchiveEnvelope } from './run-archive.ts';
import { canonicalJson, hashCanonical } from './run-canonical.ts';
import { RUN_ENGINE } from './run-engine.ts';
import { validateActor, validateRequestHash } from './run-integrity.ts';
import * as kernel from './run-kernel.ts';
import { newestTransaction, readKernel } from './run-kernel.ts';
import { OWNERS } from './run-owners.ts';
import { buildParameters } from './run-parameters.ts';
import type * as T from './run-schema.ts';
import { constructionStream } from './run-state.ts';

export type RecoveryOperations = Pick<T.RunOperations, 'createRun' | 'createPerson' | 'step' | 'exportRun'>;
const same = (a: unknown, b: unknown): boolean =>
  a === undefined || b === undefined ? a === b : canonicalJson(a) === canonicalJson(b);
function reject(path: string, message: string): T.Result<never> {
  return { ok: false, error: { code: 'invalid-admission', path, message } };
}

/** Mirrors the actual Frame.evidence carrier admission, without executing an
 * owner or interpreting opaque world JSON. Historical reception itself is replay's
 * claim; current restore checks the recorded consumed carrier and its membership.
 */
function carriesEvidence(input: T.DeepReadonly<T.Input>, person: T.PersonId, id: T.Id): boolean {
  const payload = input.payload;
  const target =
    'person' in payload && typeof payload.person === 'string'
      ? payload.person
      : 'speaker' in payload && typeof payload.speaker === 'string'
        ? payload.speaker
        : 'teller' in payload && typeof payload.teller === 'string'
          ? payload.teller
          : undefined;
  if (target === person && 'evidenceId' in payload && payload.evidenceId === id) return true;
  return (
    input.kind === 'communication.resolved' &&
    input.payload.received.some(
      (reception) => reception.recipient === person && reception.evidenceId === id && reception.attention > 0,
    )
  );
}

/** Current validation is independent of historical reproduction. */
function validateCurrent(archive: T.DeepReadonly<T.RunArchive>, parametersHash: T.Hash): T.Result<true> {
  const state = archive.current;
  const spec = archive.initial.spec;
  const wordingError = wordingIssue(spec.definitions.lexicon);
  if (wordingError) return reject('$.initial.spec.definitions.lexicon', wordingError);
  const wordingState: Pick<T.RunState, 'wording'> = { wording: {} };
  for (const event of state.events) {
    const selected = { ...event, wording: undefined as T.RunEvent['wording'] };
    selectEventWording(selected, spec.definitions.lexicon, spec.seed, wordingState);
    if (!same(selected.wording, event.wording))
      return reject('$.current.events', 'wording choice differs from its seeded occurrence');
  }
  if (!same(wordingState.wording, state.wording))
    return reject('$.current.wording', 'wording streams differ from retained events');
  if (state.world.revision < spec.world.revision)
    return reject('$.current.world.revision', 'current world revision precedes its authored opening');
  const last = archive.history.at(-1);
  if (last && !same(last.cursor, state.cursor))
    return reject('$.current.cursor', 'current cursor differs from last accepted cursor');
  if (last?.stateHash !== undefined && last.stateHash !== hashCanonical('hf-run4/current', state))
    return reject('$.current', 'current state differs from its recorded checkpoint');
  if (state.counters.nextEvent !== state.events.length + 1)
    return reject('$.current.counters.nextEvent', 'event counter differs from retained event ledger');
  const validWords = (rng: T.DeepReadonly<T.RunRngState>): boolean =>
    Number.isInteger(rng.a) &&
    rng.a >= -0x80000000 &&
    rng.a <= 0xffffffff &&
    [rng.b, rng.c, rng.d].every((word) => Number.isInteger(word) && word >= 0 && word <= 0xffffffff);
  if (!validWords(state.rng)) return reject('$.current.rng', 'invalid run RNG words');
  const facts = new Set<T.Id>();
  for (const fact of state.world.facts) {
    if (facts.has(fact.id) || fact.at > state.at)
      return reject('$.current.world.facts', 'duplicate or future world fact');
    facts.add(fact.id);
  }
  const expectedClockOwners: readonly T.FacultyId[] = [
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
  ];
  for (const person of Object.keys(state.people)) {
    const clocks = state.ownerClocks.filter((clock) => clock.person === person);
    if (
      clocks.length !== expectedClockOwners.length ||
      expectedClockOwners.some((owner) => !clocks.some((clock) => clock.owner === owner))
    )
      return reject('$.current.ownerClocks', 'required owner clock coverage differs from constructor');
  }
  for (const [index, event] of state.events.entries()) {
    if (
      event.id !== hashCanonical('hf-run4/event-id', spec.id, index + 1) ||
      event.at < spec.start ||
      event.at > state.at ||
      (event.person !== undefined && !state.people[event.person])
    )
      return reject('$.current.events', 'event allocation, clock or person mismatch');
  }
  for (const transaction of archive.history)
    if (
      transaction.inputs.some((input, index) => {
        const previous = transaction.inputs[index - 1];
        return previous !== undefined && compareInputs(previous, input) >= 0;
      })
    )
      return reject('$.history.inputs', 'accepted input order differs from canonical admission');
  const inputs = new Map(
    archive.history.flatMap((transaction) => transaction.inputs.map((input) => [input.id, input] as const)),
  );
  for (const input of inputs.values())
    if (
      input.source.type === 'host'
        ? input.source.id !== spec.host.id
        : !spec.definitions.sources.some(
            (source) => source.type === input.source.type && source.id === input.source.id,
          )
    )
      return reject('$.history.inputs.source', 'accepted carrier names an unregistered immutable source');
  const evidence = new Set<string>();
  for (const receipt of state.receipts.evidence) {
    const key = canonicalJson([receipt.person, receipt.id]);
    const carrier = inputs.get(receipt.inputId);
    if (
      evidence.has(key) ||
      !state.people[receipt.person] ||
      !carrier ||
      !carriesEvidence(carrier, receipt.person, receipt.id) ||
      !state.receipts.dispositions.some(
        (disposition) => disposition.inputId === carrier.id && disposition.kind === 'consumed',
      ) ||
      (carrier.kind === 'communication.resolved' &&
        !state.receipts.communications.some((communication) => communication.inputId === carrier.id)) ||
      receipt.hash !== hashCanonical('hf-run4/evidence', receipt.person, receipt.id, carrier)
    )
      return reject('$.current.receipts.evidence', 'duplicate, detached or inconsistent received evidence');
    evidence.add(key);
  }
  for (const queued of state.queue) {
    if (queued.data.kind === 'input' && !same(queued.data.input, inputs.get(queued.data.input.id)))
      return reject('$.current.queue', 'queued bytes differ from accepted input');
    if ('person' in queued.data && !state.people[queued.data.person])
      return reject('$.current.queue', 'queued owner refers to an absent actor');
    if (queued.data.kind === 'effect' && queued.data.effect.at !== queued.at)
      return reject('$.current.queue', 'scheduled effect clock differs from queue clock');
  }
  for (const receipt of state.receipts.dispositions) {
    const input = inputs.get(receipt.inputId);
    if (!input || receipt.at < input.at)
      return reject('$.current.receipts.dispositions', 'input disposed before acceptance time');
  }
  const issued = new Map<T.Id, T.DeepReadonly<T.HostRequest>>();
  for (const event of state.events) {
    if (event.data.kind !== 'action-requested' && event.data.kind !== 'communication-requested') continue;
    const request = event.data.request;
    if (
      issued.has(request.id) ||
      !validateRequestHash(request) ||
      request.issuedAt !== event.at ||
      request.id !== hashCanonical('hf-run4/request-id', spec.id, issued.size + 1)
    )
      return reject('$.current.events', 'duplicate or invalid issued request');
    issued.set(request.id, request);
  }
  if (state.counters.nextRequest !== issued.size + 1)
    return reject('$.current.counters.nextRequest', 'request counter differs from issued request ledger');
  const activities = [...issued.values()].filter(
    (request): request is T.DeepReadonly<T.ActionRequest> =>
      request.kind === 'action' && request.stage === 'start',
  );
  if (
    state.counters.nextActivity !== activities.length + 1 ||
    activities.some(
      (request, index) => request.activityId !== hashCanonical('hf-run4/activity-id', spec.id, index + 1),
    )
  )
    return reject(
      '$.current.counters.nextActivity',
      'activity counter or identity differs from start request ledger',
    );
  const allocatedRequests = state.receipts.allocated.filter(
    (entry) => entry.scope.kind === 'run' && entry.reference.kind === 'request',
  );
  if (
    allocatedRequests.length !== issued.size ||
    allocatedRequests.some((entry) => !issued.has(entry.reference.id))
  )
    return reject('$.current.receipts.allocated', 'issued request allocation evidence differs from ledger');
  for (const request of state.pending) {
    if (
      !validateRequestHash(request) ||
      !same(request, issued.get(request.id)) ||
      request.worldRevision > state.world.revision
    )
      return reject('$.current.pending', 'pending request differs from issued immutable request');
    const participants =
      request.kind === 'action'
        ? [request.person, ...request.participants]
        : [request.speaker, ...request.recipients];
    if (participants.some((person) => !state.people[person]))
      return reject('$.current.pending', 'pending request refers to an absent actor');
  }
  const resolved = new Set<T.Id>();
  for (const receipt of state.receipts.settlements) {
    const request = issued.get(receipt.requestId);
    const input = inputs.get(receipt.inputId);
    if (
      request?.kind !== 'action' ||
      input?.kind !== 'action.resolved' ||
      request.requestHash !== receipt.requestHash ||
      request.activityId !== receipt.activityId ||
      request.stage !== receipt.stage ||
      input.payload.requestId !== receipt.requestId ||
      input.payload.requestHash !== receipt.requestHash ||
      input.payload.person !== request.person ||
      input.payload.stage !== request.stage ||
      input.payload.activityId !== request.activityId ||
      (receipt.outcomeEvidenceId !== undefined &&
        input.payload.outcome?.evidenceId !== receipt.outcomeEvidenceId)
    )
      return reject(
        '$.current.receipts.settlements',
        'settlement differs from issued request or accepted input',
      );
    resolved.add(receipt.requestId);
  }
  for (const receipt of state.receipts.communications) {
    const request = issued.get(receipt.requestId);
    const input = inputs.get(receipt.inputId);
    if (
      request?.kind !== 'communication' ||
      input?.kind !== 'communication.resolved' ||
      request.requestHash !== receipt.requestHash ||
      input.payload.requestId !== receipt.requestId ||
      input.payload.requestHash !== receipt.requestHash
    )
      return reject(
        '$.current.receipts.communications',
        'communication receipt differs from issued request or input',
      );
    const emitted = new Set(input.payload.emittedItemIds);
    const recipients = new Set<T.Id>();
    if (
      input.payload.speaker !== request.speaker ||
      emitted.size !== input.payload.emittedItemIds.length ||
      [...emitted].some((id) => !request.items.some((item) => item.id === id))
    )
      return reject(
        '$.current.receipts.communications',
        'communication emission exceeds issued speaker/content',
      );
    for (const reception of receipt.receptions) {
      if (
        recipients.has(reception.recipient) ||
        !request.recipients.includes(reception.recipient) ||
        reception.itemIds.some((id) => !emitted.has(id)) ||
        new Set(reception.itemIds).size !== reception.itemIds.length
      )
        return reject(
          '$.current.receipts.communications',
          'communication reception exceeds issued recipients/content',
        );
      recipients.add(reception.recipient);
    }
    if (!same(receipt.receptions, input.payload.received))
      return reject(
        '$.current.receipts.communications',
        'recorded receptions differ from accepted settlement',
      );
    resolved.add(receipt.requestId);
  }
  if (issued.size !== resolved.size + state.pending.length)
    return reject('$.current.pending', 'issued request has neither settlement nor pending entry');
  const entities = new Set(state.lifecycle.entities.map((entity) => entity.id));
  if (
    entities.size !== state.lifecycle.entities.length ||
    !Number.isSafeInteger(state.lifecycle.kinRevision) ||
    state.lifecycle.kinRevision < 0
  )
    return reject('$.current.lifecycle', 'duplicate entities or invalid kin revision');
  const origins = new Set<T.Id>();
  for (const origin of state.lifecycle.origins) {
    if (origins.has(origin.person) || !state.people[origin.person] || !entities.has(origin.person))
      return reject('$.current.lifecycle.origins', 'duplicate or detached actor origin');
    origins.add(origin.person);
  }
  if (origins.size !== Object.keys(state.people).length)
    return reject('$.current.lifecycle.origins', 'actor origin is missing');
  const premises = new Set<T.Id>();
  for (const premise of state.lifecycle.kinPremises) {
    if (premises.has(premise.id) || !entities.has(premise.from.id) || !entities.has(premise.to.id))
      return reject('$.current.lifecycle.kinPremises', 'duplicate premise or absent entity');
    premises.add(premise.id);
  }
  const scopes = new Set<T.Id>();
  for (const scope of state.lifecycle.kinScopes) {
    if (
      scopes.has(scope.id) ||
      scope.at > state.at ||
      scope.kinRevision > state.lifecycle.kinRevision ||
      scope.people.some((person) => !entities.has(person.id)) ||
      scope.premiseIds.some((id) => !premises.has(id))
    )
      return reject('$.current.lifecycle.kinScopes', 'invalid kin scope identity, time or reference');
    scopes.add(scope.id);
  }
  const streams = new Set<T.Id>();
  for (const stream of state.lifecycle.streams) {
    const expected = constructionStream(spec.seed, stream.identity);
    if (
      streams.has(stream.id) ||
      stream.id !== expected.id ||
      stream.seed !== expected.seed ||
      !same(stream.origin, expected.origin) ||
      stream.initializationDraws !== 12 ||
      !Number.isSafeInteger(stream.uniformDraws) ||
      stream.uniformDraws < 12 ||
      !validWords(stream.state)
    )
      return reject('$.current.lifecycle.streams', 'invalid construction stream provenance or cursor');
    streams.add(stream.id);
  }
  for (const entry of state.lifecycle.origins) {
    const origin = entry.origin;
    if (origin.kind !== 'two-parent-derived') continue;
    const stream = state.lifecycle.streams.find((candidate) => candidate.id === origin.inheritanceStream);
    if (
      origin.parents.some((parent) => !entities.has(parent.id)) ||
      stream?.identity.kind !== 'inheritance' ||
      stream.identity.child !== entry.person
    )
      return reject(
        '$.current.lifecycle.origins',
        'derived origin has an unmapped parent or inheritance stream',
      );
  }
  const effectIds = new Set<T.Id>();
  for (const effect of state.effects) {
    if (
      effectIds.has(effect.id) ||
      !state.people[effect.person] ||
      effect.at < spec.start ||
      (!state.queue.some((event) => event.data.kind === 'effect' && same(event.data.effect, effect)) &&
        !state.receipts.effects.some(
          (receipt) =>
            receipt.id === effect.id && receipt.person === effect.person && receipt.owner === effect.to,
        ))
    )
      return reject('$.current.effects', 'duplicate effect or missing owner, queue or receipt');
    effectIds.add(effect.id);
  }
  for (const clock of Object.values(state.chapter)) {
    const valid = projectChapterClock(clock, clock.wallAtMs);
    if (!valid.ok) return valid;
    if (!same(valid.value.clock, clock)) return reject('$.current.chapter', 'chapter clock requires repair');
  }
  const applied = new Set(state.lifecycle.appliedEffects);
  if (applied.size !== state.lifecycle.appliedEffects.length)
    return reject('$.current.lifecycle.appliedEffects', 'duplicate lifecycle effect identity');
  for (const person of archive.initial.people) {
    const actor = state.people[person.id];
    if (!actor || actor.name !== person.identity.name || actor.life.bornAt !== person.identity.birthAt)
      return reject('$.initial.people', 'initial actor identity is missing or changed');
  }
  const allocations = new Map<T.Id, T.Reference[]>();
  for (const entry of state.receipts.allocated) {
    if (entry.allocatedAt < spec.start)
      return reject('$.current.receipts.allocated', 'allocation precedes run');
    if (entry.scope.kind !== 'person') continue;
    const refs = allocations.get(entry.scope.person) ?? [];
    refs.push(entry.reference);
    allocations.set(entry.scope.person, refs);
  }
  for (const continuation of state.continuations) {
    const actor = state.people[continuation.person];
    if (!actor) return reject('$.current.continuations', 'continuation has no actor');
    if (actor.randomIdentity.origin.runSeed !== spec.seed || actor.randomIdentity.origin.person !== actor.id)
      return reject('$.current.people', 'actor random stream belongs to another run or person');
    if (
      actor.memory.episodes.some(
        (episode) =>
          episode.at > state.at || (episode.recalledAt !== undefined && episode.recalledAt > state.at),
      ) ||
      actor.memory.gists.some(
        (gist) => gist.at > state.at || gist.firstAt > state.at || gist.lastAt > state.at,
      ) ||
      Object.values(actor.skills).some((skill) => skill.lastPracticed > state.at)
    )
      return reject(`$.current.people.${actor.id}`, 'retained experience or practice is future-dated');
    const drawOrdinals = new Set<number>();
    for (const hazard of [
      continuation.doze.hazard,
      continuation.crisis.hazard,
      ...continuation.life.hazards,
    ]) {
      const budget = hazard.threshold;
      if (budget === null) continue;
      if (
        !Number.isSafeInteger(budget.drawOrdinal) ||
        budget.drawOrdinal <= actor.randomIdentity.initializationDraws ||
        budget.drawOrdinal > actor.randomIdentity.uniformDraws ||
        drawOrdinals.has(budget.drawOrdinal) ||
        budget.allocatedAtMs < spec.start ||
        budget.allocatedAtMs > state.at
      )
        return reject(
          `$.current.continuations.${actor.id}`,
          'hazard budget is detached from the single actor draw cursor',
        );
      drawOrdinals.add(budget.drawOrdinal);
    }
    const refs = allocations.get(actor.id) ?? [];
    const issue = validateActor(actor, continuation, refs, state.at, parametersHash, OWNERS)[0];
    if (issue) return reject(issue.path, issue.message);
    const referenceIssue = [
      ...OWNERS.projects.validatePortable(actor.projects, actor.agenda.goals, refs),
      ...OWNERS.persistence.validatePortable(actor.pursuit, actor.agenda.goals, refs),
    ][0];
    if (referenceIssue) return reject(`$.current.people.${actor.id}`, referenceIssue.message);
    const parameterRecord = buildParameters(spec.tuning);
    if (!parameterRecord.ok) return parameterRecord;
    const effective = parameterRecord.value.effective;
    if (actor.skillRetention.consolidationHours !== effective.builtins.SKILL_DEFAULTS.consolidationHours)
      return reject(
        `$.current.people.${actor.id}.skillRetention`,
        'skill retention differs from immutable run parameters',
      );
    const decisions = state.events.flatMap((event) =>
      event.person === actor.id && event.data.kind === 'decision' ? [event.data.decision] : [],
    );
    if (
      !Number.isSafeInteger(actor.retention.trace) ||
      actor.retention.trace < 0 ||
      actor.retention.trace > effective.builtins.PERSON_DEFAULTS.maxTrace ||
      !Number.isSafeInteger(actor.retention.chronicleDays) ||
      actor.retention.chronicleDays < 31 ||
      actor.nextDecision !== decisions.length + 1 ||
      decisions.some(
        (decision, index) => decision.id !== `d${actor.id}-${index + 1}` || decision.at > state.at,
      ) ||
      !same(actor.trace, actor.retention.trace === 0 ? [] : decisions.slice(-actor.retention.trace))
    )
      return reject(
        `$.current.people.${actor.id}.trace`,
        'retained decisions, allocation counter or retention differ from event ledger',
      );
    if (
      actor.activity &&
      !decisions.some(
        (decision) =>
          decision.id === actor.activity?.decisionId &&
          decision.chosenAffordanceId === actor.activity.offer.id &&
          decision.chosenAction === actor.activity.offer.actionId,
      )
    )
      return reject(`$.current.people.${actor.id}.activity`, 'activity has no matching accepted decision');
    if (!same(actor.planning, parameterRecord.value.effective.planning))
      return reject(
        `$.current.people.${actor.id}.planning`,
        'planning differs from immutable run parameters',
      );
    for (const held of [
      ...Object.values(continuation.deliberation),
      ...Object.values(continuation.narrative),
    ])
      if (held.anchor.at < spec.start || held.anchor.at > state.at)
        return reject('$.current.continuations', 'retained anchor is outside current run');
    const d = continuation.deliberation;
    const n = continuation.narrative;
    const anchorIssues = [
      ...OWNERS.needs.validate(d.needs.state),
      ...OWNERS.beliefs.validate(d.beliefs.state),
      ...OWNERS.social.validate(d.social.state),
      ...OWNERS.habits.validate(d.habits.state),
      ...OWNERS.conscience.validate(d.conscience.state),
      ...OWNERS.skills.validate(d.skills.state),
      ...OWNERS.projects.validate(d.projects.state),
      ...OWNERS.persistence.validate(d.persistence.state),
      ...OWNERS.prospection.validate(d.prospection.state),
      ...OWNERS.methods.validate(d.methods.state),
      ...OWNERS.curiosity.validate(d.curiosity.state),
      ...OWNERS.will.validate(d.will.state),
      ...OWNERS.agenda.validate(d.agenda.state),
      ...OWNERS.memory.validate(n.memory.state, refs),
      ...OWNERS.promptings.validate(n.promptings.state),
      ...OWNERS.review.validate(n.review.state),
      ...OWNERS.character.validate(n.character.state),
      ...OWNERS.chronicle.validate({
        days: actor.chronicle,
        years: actor.chronicleYears,
        open: n.chronicle.open,
      }),
    ];
    const anchorIssue = anchorIssues[0];
    if (anchorIssue) return reject(`$.current.continuations.${actor.id}`, anchorIssue.message);
    if (
      actor.activity &&
      (actor.activity.offer.person !== actor.id ||
        actor.activity.startedAt < spec.start ||
        actor.activity.startedAt > state.at ||
        actor.activity.endsAt < state.at ||
        actor.activity.endsAt < actor.activity.startedAt)
    )
      return reject('$.current.people', 'current activity has invalid person or clock');
  }
  for (const [person, book] of Object.entries(state.offers))
    if (
      !state.people[person] ||
      book.receivedAt > state.at ||
      !inputs.has(book.cause) ||
      !Number.isSafeInteger(book.revision) ||
      book.revision < 0 ||
      book.offers.some(
        (offer) =>
          offer.person !== person || !spec.definitions.actions.some((action) => action.id === offer.actionId),
      )
    )
      return reject('$.current.offers', 'offer book has invalid owner, cause or action');
  const routineKeys = new Set<string>();
  for (const routine of state.routines) {
    const key = canonicalJson([routine.person, routine.id]);
    if (routineKeys.has(key) || !state.people[routine.person])
      return reject('$.current.routines', 'duplicate routine or absent actor');
    routineKeys.add(key);
    const source = routine.source;
    const definition =
      source.kind === 'definition'
        ? spec.definitions.routines.find((entry) => entry.id === source.id)
        : undefined;
    const input = source.kind === 'input' ? inputs.get(source.inputId) : undefined;
    if (
      source.kind === 'definition'
        ? !definition || !same(definition.entries, routine.entries)
        : input?.kind !== 'routine.authored' ||
          input.payload.person !== routine.person ||
          input.payload.scheduleId !== routine.id ||
          !same(input.payload.entries, routine.entries)
    )
      return reject('$.current.routines', 'routine differs from declared definition or accepted authoring');
    const entries = new Set<T.Id>();
    for (const entry of routine.entries) {
      if (
        entries.has(entry.id) ||
        entry.offer.person !== routine.person ||
        !spec.definitions.actions.some((action) => action.id === entry.offer.actionId)
      )
        return reject('$.current.routines', 'routine entry identity, actor or action reference mismatch');
      entries.add(entry.id);
    }
  }
  for (const queued of state.queue) {
    if (queued.data.kind !== 'routine-opportunity') continue;
    const data = queued.data;
    const routine = state.routines.find(
      (entry) => entry.person === data.person && entry.id === data.scheduleId,
    );
    const entry = routine?.entries.find((candidate) => candidate.id === data.entryId);
    if (!entry || entry.at !== queued.at)
      return reject('$.current.queue', 'routine opportunity has no matching active routine entry');
  }
  const proposals = new Set<T.Id>();
  for (const proposal of state.community.joint.proposals) {
    if (
      proposals.has(proposal.id) ||
      !state.people[proposal.proposerId] ||
      proposal.at > state.at ||
      proposal.partnerIds.some((person) => !state.people[person] || person === proposal.proposerId) ||
      new Set(proposal.partnerIds).size !== proposal.partnerIds.length ||
      proposal.accepted.some((person) => !proposal.partnerIds.includes(person)) ||
      Object.keys(proposal.partnerRecords).some((person) => !proposal.partnerIds.includes(person))
    )
      return reject(
        '$.current.community.joint.proposals',
        'joint proposal has invalid identity, time or participant reference',
      );
    proposals.add(proposal.id);
  }
  for (const field of [
    'idleUntil',
    'perceivedUntil',
    'interrupts',
    'partnerDeaths',
    'queued',
    'dayDone',
    'standingDone',
  ] as const)
    if (Object.keys(state.community[field]).some((person) => !state.people[person]))
      return reject(`$.current.community.${field}`, 'community entry has no actor');
  if (!Number.isSafeInteger(state.community.joint.nextId) || state.community.joint.nextId < 1)
    return reject('$.current.community.joint.nextId', 'invalid joint allocation counter');
  return { ok: true, value: true };
}

function admit(
  input: unknown,
  operations: RecoveryOperations,
): T.Result<{
  archive: T.DeepReadonly<T.RunArchive>;
  opening: T.Run;
  parameters: ReturnType<typeof readKernel>['parameters'];
}> {
  const checked = checkArchiveEnvelope(input, RUN_ENGINE);
  if (!checked.ok) return checked;
  const archive = cloneData(checked.value);
  const parameters = buildParameters(archive.initial.spec.tuning);
  if (!parameters.ok) return parameters;
  const current = validateCurrent(archive, parameters.value.hash);
  if (!current.ok) return current;
  const spec: T.RunSpec = JSON.parse(canonicalJson(archive.initial.spec));
  const created = operations.createRun(spec);
  if (!created.ok) return created;
  const run = created.value;
  for (const person of archive.initial.people) {
    const admitted = operations.createPerson(run, cloneData(person));
    if (!admitted.ok) return admitted;
    if (admitted.value !== person.id)
      return reject('$.initial.people', 'constructor returned a different identity');
  }
  if (archive.history.length === 0 && !same(operations.exportRun(run), archive))
    return reject('$.current', 'unstarted current differs from admitted initial authoring');
  return { ok: true, value: { archive, opening: run, parameters: parameters.value } };
}

function reconstruct(input: unknown, operations: RecoveryOperations): T.Result<T.Run> {
  const admitted = admit(input, operations);
  if (!admitted.ok) return admitted;
  const { archive, opening: run } = admitted.value;
  const verifiedHistory: T.DeepReadonly<T.AcceptedTransaction>[] = [];
  for (const [index, transaction] of archive.history.entries()) {
    const path = `$.history[${index}]`;
    const reached = operations.step(run, {
      until: transaction.until,
      inputs: cloneData(transaction.inputs),
      fidelity: cloneData(transaction.fidelity),
    });
    if (!reached.ok) return reached;
    const current = readKernel(run).current;
    if (
      reached.value.at !== transaction.reachedAt ||
      (transaction.boundary.type === 'until' && !reached.value.reachedUntil) ||
      !same(reached.value.boundary, transaction.boundary) ||
      !same(current.cursor, transaction.cursor)
    )
      return reject(path, 'executed boundary or scheduler cursor differs from accepted history');
    // The newest node is this transaction; materializing the whole history here made replay quadratic.
    const actual = newestTransaction(run, index + 1);
    if (!actual) return reject(path, 'dispatcher did not record the accepted transaction');
    if (
      transaction.eventHash !== undefined &&
      transaction.eventHash !== hashCanonical('hf-run4/events', reached.value.events)
    )
      return reject(`${path}.eventHash`, 'executed event checkpoint differs');
    if (
      transaction.stateHash !== undefined &&
      transaction.stateHash !== hashCanonical('hf-run4/current', current)
    )
      return reject(`${path}.stateHash`, 'executed state checkpoint differs');
    const { eventHash: _actualEvents, stateHash: _actualState, ...actualAccepted } = actual;
    const { eventHash: _events, stateHash: _state, ...accepted } = transaction;
    if (!same(actualAccepted, accepted))
      return reject(path, 'executed accepted transaction differs from history');
    // These are the actual accepted semantics plus independently verified optional
    // checkpoint metadata. They never replace executed outcome or current state.
    verifiedHistory.push({
      ...actualAccepted,
      ...(transaction.eventHash === undefined ? {} : { eventHash: transaction.eventHash }),
      ...(transaction.stateHash === undefined ? {} : { stateHash: transaction.stateHash }),
    });
  }
  const reached = operations.exportRun(run);
  const verifiedBody = { ...reached, history: verifiedHistory };
  const verified = { ...verifiedBody, hashes: archiveHashes(verifiedBody) };
  if (!same(verified, archive))
    return reject('$.current', 'executed initial state, history or current archive differs');
  // Revalidate the actual result, including all ledger/reference/cursor checks.
  const valid = checkArchiveEnvelope(verified, RUN_ENGINE);
  if (!valid.ok) return valid;
  return {
    ok: true,
    value: same(reached, verified) ? run : kernel.restoreKernel(verified, admitted.value.parameters),
  };
}

export function restoreCurrentRun(input: unknown, operations: RecoveryOperations): T.Result<T.Run> {
  const admitted = admit(input, operations);
  if (!admitted.ok) return admitted;
  return { ok: true, value: kernel.restoreKernel(admitted.value.archive, admitted.value.parameters) };
}
export function replayCurrentRun(
  input: unknown,
  operations: RecoveryOperations,
): T.Result<T.DeepReadonly<T.ReplayResult>> {
  const restored = reconstruct(input, operations);
  if (!restored.ok) return restored;
  const archive = operations.exportRun(restored.value);
  return {
    ok: true,
    value: Object.freeze({
      run: restored.value,
      verified: true,
      fullHash: archive.hashes.full,
      transactions: archive.history.length,
      hostEdition: archive.host.edition,
    }),
  };
}
