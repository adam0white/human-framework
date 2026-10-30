/** SCOPE: current4 archive envelope, export-time canonical hashes and C0-owned
 * infrastructure admission. Owners still validate their slices and continuations;
 * format seven interns complete history, bounds duplicated journals and records
 * always-on wording; cold recovery executes complete inputs.
 * No repair, migration, historical hash on every frame or legacy fallback.
 */
import { checkRunSpec } from './run-admission.ts';
import { canonicalJson, hashCanonical } from './run-canonical.ts';
import { packHistory, unpackHistory } from './run-history.ts';
import { buildParameters } from './run-parameters.ts';
import type { ContractError, DeepReadonly, Id, Result, RunArchive } from './run-schema.ts';
import { validateData } from './run-validation.ts';

export type ExpandedRunArchive = Omit<RunArchive, 'history'> & {
  history: readonly import('./run-schema.ts').AcceptedTransaction[];
};
type ArchiveBody = Omit<RunArchive, 'hashes'> | Omit<ExpandedRunArchive, 'hashes'>;
export function expandedArchive(archive: DeepReadonly<RunArchive>): DeepReadonly<ExpandedRunArchive> {
  const history = validateData('RunHistory', unpackHistory(archive.history));
  if (!history.ok) throw new TypeError(history.error.message);
  return { ...archive, history: history.value };
}
const JOURNAL_LIMIT = 64;
export function archiveHashes(body: DeepReadonly<ArchiveBody>): RunArchive['hashes'] {
  const initial = hashCanonical('hf-run4/initial', body.engine, body.host, body.initial);
  const history = hashCanonical(
    'hf-run4/history',
    Array.isArray(body.history) ? packHistory(body.history) : body.history,
  );
  const current = hashCanonical('hf-run4/current', body.current);
  return {
    initial,
    history,
    current,
    full: hashCanonical(
      'hf-run4/full',
      body.format,
      body.version,
      body.engine,
      body.host,
      initial,
      history,
      current,
    ),
  };
}
function error(
  path: string,
  message: string,
  code: ContractError['code'] = 'invalid-admission',
): Result<never> {
  return { ok: false, error: { code, path, message } };
}
function positiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 1;
}
function nonnegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
export function checkArchiveEnvelope(
  input: unknown,
  engine: DeepReadonly<RunArchive['engine']>,
): Result<DeepReadonly<ExpandedRunArchive>> {
  const admitted = validateData('RunArchive', input);
  if (!admitted.ok) return admitted;
  const wire = admitted.value;
  let archive: DeepReadonly<ExpandedRunArchive>;
  try {
    archive = expandedArchive(wire);
  } catch (failure) {
    return error('$.history', failure instanceof Error ? failure.message : 'invalid history pool');
  }
  if (canonicalJson(archive.engine) !== canonicalJson(engine))
    return error('$.engine', 'archive requires this exact package, build and schema', 'unsupported-archive');
  if (canonicalJson(archive.host) !== canonicalJson(archive.initial.spec.host))
    return error('$.host', 'host identity differs from initial specification');
  const spec = checkRunSpec(archive.initial.spec);
  if (!spec.ok) return spec;
  const parameters = buildParameters(spec.value.tuning);
  if (!parameters.ok) return parameters;
  if (
    canonicalJson(parameters.value.effective) !== canonicalJson(archive.initial.effective) ||
    canonicalJson(parameters.value.provenance) !== canonicalJson(archive.initial.parameterProvenance)
  )
    return error(
      '$.initial.effective',
      'effective parameters must derive exactly from the declared tuning and engine',
    );
  if (canonicalJson(archive.hashes) !== canonicalJson(archiveHashes(archive)))
    return error('$.hashes', 'archive hash mismatch', 'hash-mismatch');
  const state = archive.current;
  if (
    state.at < spec.value.start ||
    state.cursor.at !== state.at ||
    !Number.isSafeInteger(state.at - spec.value.start) ||
    !nonnegativeInteger(state.cursor.frameOrdinal) ||
    !nonnegativeInteger(state.cursor.localOrdinal)
  )
    return error('$.current.cursor', 'inconsistent run clock or frame cursor');
  if (
    Object.values(state.counters).some((value) => !positiveInteger(value)) ||
    state.counters.nextTransaction !== archive.history.length + 1
  )
    return error('$.current.counters', 'invalid or rewound counter');
  if (!nonnegativeInteger(state.world.revision))
    return error('$.current.world.revision', 'invalid world revision');
  const inputIds = new Set<Id>();
  let priorAt = spec.value.start;
  let ordinal = 0;
  for (const transaction of archive.history) {
    ordinal++;
    if (
      transaction.ordinal !== ordinal ||
      transaction.reachedAt < priorAt ||
      transaction.until < transaction.reachedAt ||
      transaction.cursor.at !== transaction.reachedAt ||
      !Number.isSafeInteger(transaction.until - priorAt)
    )
      return error('$.history', 'inconsistent transaction ordinal, clock or boundary cursor');
    if (transaction.boundary.type === 'until' && transaction.reachedAt !== transaction.until)
      return error('$.history', 'until boundary did not reach its declared target');
    for (const entry of transaction.inputs) {
      if (inputIds.has(entry.id))
        return error('$.history.inputs', 'input ID was accepted twice', 'duplicate-id');
      inputIds.add(entry.id);
      if (entry.at < priorAt || entry.at > transaction.until)
        return error('$.history.inputs', 'input is outside its accepted transaction span');
    }
    priorAt = transaction.reachedAt;
  }
  if (priorAt !== state.at) return error('$.current.at', 'current clock differs from accepted history');
  if (
    state.events.length > JOURNAL_LIMIT ||
    Object.values(state.receipts).some((entries) => entries.length > JOURNAL_LIMIT)
  )
    return error('$.current', 'archive journals exceed their retention bound');
  return { ok: true, value: archive };
}

/** Full journal checks run only on history reconstructed by the dispatcher. */
export function checkReconstructedJournals(
  archive: Pick<DeepReadonly<ExpandedRunArchive>, 'current' | 'history'>,
): Result<true> {
  const state = archive.current;
  const inputIds = new Set(
    archive.history.flatMap((transaction) => transaction.inputs.map((input) => input.id)),
  );
  const ledgerInputs = new Map<Id, string>();
  for (const [index, receipt] of state.receipts.inputs.entries()) {
    if (!inputIds.has(receipt.id) || ledgerInputs.has(receipt.id) || receipt.ordinal !== index + 1)
      return error(
        '$.current.receipts.inputs',
        'input ledger is duplicated, rewound or detached from history',
      );
    ledgerInputs.set(receipt.id, receipt.hash);
  }
  if (ledgerInputs.size !== inputIds.size || state.counters.nextInput !== ledgerInputs.size + 1)
    return error('$.current.receipts.inputs', 'input deduplication evidence is missing');
  // Hash each accepted input only at archive admission, not during every frame.
  for (const transaction of archive.history)
    for (const entry of transaction.inputs)
      if (ledgerInputs.get(entry.id) !== hashCanonical('hf-run4/input', entry))
        return error('$.current.receipts.inputs', 'input hash differs from accepted bytes', 'hash-mismatch');
  const people = new Set(Object.keys(state.people));
  for (const [id, actor] of Object.entries(state.people))
    if (id !== actor.id || actor.now !== state.at || actor.life.bornAt > actor.now)
      return error(`$.current.people.${id}`, 'actor identity or clock mismatch');
  const clocks = new Set<string>();
  for (const clock of state.ownerClocks) {
    const key = canonicalJson([clock.person, clock.owner]);
    if (!people.has(clock.person) || clocks.has(key) || clock.advancedThrough !== state.at)
      return error('$.current.ownerClocks', 'duplicate, foreign or unadvanced owner clock');
    clocks.add(key);
  }
  const continuations = new Set<Id>();
  for (const continuation of state.continuations) {
    if (!people.has(continuation.person) || continuations.has(continuation.person))
      return error('$.current.continuations', 'duplicate or foreign actor continuation');
    continuations.add(continuation.person);
  }
  if (continuations.size !== people.size)
    return error('$.current.continuations', 'actor continuation missing');
  const queueIds = new Set<Id>();
  const queuedInputs = new Set<Id>();
  for (const event of state.queue) {
    if (
      queueIds.has(event.id) ||
      event.at < state.at ||
      !nonnegativeInteger(event.localOrdinal) ||
      (event.person !== undefined && !people.has(event.person))
    )
      return error('$.current.queue', 'duplicate, past or foreign scheduled event');
    queueIds.add(event.id);
    if (event.data.kind === 'input') {
      if (
        !inputIds.has(event.data.input.id) ||
        queuedInputs.has(event.data.input.id) ||
        event.data.input.at !== event.at
      )
        return error('$.current.queue', 'queued input lacks accepted unique identity');
      queuedInputs.add(event.data.input.id);
    }
  }
  const disposed = new Set<Id>();
  for (const disposition of state.receipts.dispositions) {
    if (
      !inputIds.has(disposition.inputId) ||
      disposed.has(disposition.inputId) ||
      queuedInputs.has(disposition.inputId) ||
      disposition.at > state.at
    )
      return error(
        '$.current.receipts.dispositions',
        'input was disposed twice, in the future or while queued',
      );
    disposed.add(disposition.inputId);
  }
  if (disposed.size + queuedInputs.size !== inputIds.size)
    return error(
      '$.current.receipts.dispositions',
      'accepted input has neither a disposition nor a queue entry',
    );
  const pending = new Set<Id>();
  for (const request of state.pending) {
    if (
      pending.has(request.id) ||
      request.boundaryAt !== state.at ||
      request.issuedAt > request.boundaryAt ||
      !nonnegativeInteger(request.worldRevision)
    )
      return error('$.current.pending', 'pending request identity or boundary mismatch');
    pending.add(request.id);
  }
  const lane = new Set(state.cursor.resolutionLane);
  if (
    lane.size !== state.cursor.resolutionLane.length ||
    lane.size !== pending.size ||
    [...pending].some((id) => !lane.has(id)) ||
    (pending.size > 0 && state.cursor.closed)
  )
    return error('$.current.cursor.resolutionLane', 'pending request lane mismatch');
  const resolved = new Set<Id>();
  for (const field of ['settlements', 'communications'] as const) {
    for (const receipt of state.receipts[field]) {
      if (resolved.has(receipt.requestId) || pending.has(receipt.requestId) || !inputIds.has(receipt.inputId))
        return error(`$.current.receipts.${field}`, 'request resolved twice, still pending or unaccepted');
      resolved.add(receipt.requestId);
    }
  }
  const allocated = new Set<string>();
  for (const allocation of state.receipts.allocated) {
    const key = canonicalJson([allocation.scope, allocation.reference]);
    if (
      allocated.has(key) ||
      allocation.allocatedAt > state.at ||
      (allocation.scope.kind === 'person' && !people.has(allocation.scope.person))
    )
      return error('$.current.receipts.allocated', 'duplicate or future allocation evidence');
    allocated.add(key);
  }
  const effects = new Set<Id>();
  const causes = new Set<Id>();
  for (const effect of state.receipts.effects) {
    if (
      effects.has(effect.id) ||
      causes.has(effect.causalEffectKey) ||
      !people.has(effect.person) ||
      effect.appliedAt > state.at
    )
      return error('$.current.receipts.effects', 'duplicate causal effect or invalid owner clock');
    effects.add(effect.id);
    causes.add(effect.causalEffectKey);
  }
  return { ok: true, value: true };
}

/** SCOPE: exported-current retention (cold export and explicit host inspection). Live journals and private deduplication indexes
 * remain complete; accepted input history is never trimmed. This bounds duplicate
 * diagnostics, not actor memory or the input log, and never changes a reached step.
 */
export function archiveSnapshot(
  state: DeepReadonly<import('./run-schema.ts').RunState>,
): DeepReadonly<import('./run-schema.ts').RunState> {
  const receipts = state.receipts;
  return {
    ...state,
    events: state.events.slice(-JOURNAL_LIMIT),
    receipts: {
      inputs: receipts.inputs.slice(-JOURNAL_LIMIT),
      dispositions: receipts.dispositions.slice(-JOURNAL_LIMIT),
      settlements: receipts.settlements.slice(-JOURNAL_LIMIT),
      communications: receipts.communications.slice(-JOURNAL_LIMIT),
      evidence: receipts.evidence.slice(-JOURNAL_LIMIT),
      effects: receipts.effects.slice(-JOURNAL_LIMIT),
      allocated: receipts.allocated.slice(-JOURNAL_LIMIT),
    },
  };
}
