/** SCOPE: opaque per-run storage. No process-wide handle map or instance methods.
 * Transaction history uses immutable append nodes; frames never copy prior history.
 * Export/replay materializes that history. Preview clones only its current branch
 * state, and shares immutable definitions/parameters/history nodes.
 */

import { cloneData } from './core/clone.ts';
import { EngineLimitError } from './core/limit.ts';
import type { DerivedParameters } from './run-parameters.ts';
import type * as T from './run-schema.ts';
import { initialRunState } from './run-state.ts';

type HistoryNode = Readonly<{
  previous: HistoryNode | null;
  transaction: T.DeepReadonly<T.AcceptedTransaction>;
  length: number;
}>;
type ReceiptJournal = { [K in keyof T.ReceiptLedger]: T.ReceiptLedger[K][number][] };
type RunJournal = { events: T.RunEvent[]; receipts: ReceiptJournal };
/** Internal exact counter/work exhaustion; callers receive a structured limit error. */
export class RunLimitError extends EngineLimitError {}

export type RunRecord = {
  spec: T.DeepReadonly<T.RunSpec>;
  parameters: T.DeepReadonly<DerivedParameters>;
  initialPeople: readonly T.DeepReadonly<T.PersonAuthoring>[];
  current: T.RunState;
  started: boolean;
  history: HistoryNode | null;
  inputIds: Set<T.Id>; // derived private index; archive ledger remains authoritative
  journal: RunJournal;
  allocations: Map<T.PersonId, T.Reference[]>;
  effectIds: Set<T.Id>;
  evidenceIds: Set<string>;
  activityOffers: Map<T.Id, number>; // current activities only; derived from original start requests
};
// Only cold construction/restore/preview copies existing journals. Hot transactions
// append validated deltas to these arrays after all fallible work has succeeded.
function bindJournal(current: T.RunState): RunJournal {
  const receipts: ReceiptJournal = {
    dispositions: [...current.receipts.dispositions],
    communications: [...current.receipts.communications],
    inputs: [...current.receipts.inputs],
    settlements: [...current.receipts.settlements],
    evidence: [...current.receipts.evidence],
    effects: [...current.receipts.effects],
    allocated: [...current.receipts.allocated],
  };
  const journal = { events: [...current.events], receipts };
  current.events = journal.events;
  current.receipts = receipts;
  return journal;
}
export function freezeData<T>(value: T): T.DeepReadonly<T> {
  const pending: unknown[] = [value];
  const visited = new Set<object>();
  while (pending.length) {
    const item = pending.pop();
    if (item !== null && typeof item === 'object' && !visited.has(item)) {
      visited.add(item);
      // One push per value: spreading a long array (history, events) overflows the call stack.
      for (const child of Object.values(item)) pending.push(child);
      Object.freeze(item);
    }
  }
  return value as T.DeepReadonly<T>;
}
class Kernel {
  #record: RunRecord;
  constructor(record: RunRecord) {
    this.#record = record;
  }
  static create(record: RunRecord): T.Run {
    const handle = new Kernel(record);
    Object.setPrototypeOf(handle, null);
    Object.freeze(handle);
    // The public nominal brand has no runtime value. This is its sole constructor
    // boundary; private-field membership below validates every internal access.
    return handle as unknown as T.Run;
  }
  static read(handle: T.Run): RunRecord {
    if (handle === null || typeof handle !== 'object' || !(#record in handle))
      throw new TypeError('expected an HF4 run created by this engine');
    return handle.#record;
  }
}
function activityOfferIndex(state: T.DeepReadonly<T.RunState>): Map<T.Id, number> {
  const active = new Set(
    Object.values(state.people).flatMap((actor) => (actor.activity ? [actor.activity.id] : [])),
  );
  const offers = new Map<T.Id, number>();
  for (const event of state.events)
    if (
      event.data.kind === 'action-requested' &&
      event.data.request.stage === 'start' &&
      active.has(event.data.request.activityId)
    )
      offers.set(event.data.request.activityId, event.data.request.offerRevision);
  return offers;
}
export function makeKernel(
  spec: T.DeepReadonly<T.RunSpec>,
  parameters: T.DeepReadonly<DerivedParameters>,
): T.Run {
  const privateSpec = freezeData(cloneData(spec));
  const current = initialRunState(privateSpec);
  return Kernel.create({
    spec: privateSpec,
    parameters,
    initialPeople: [],
    current,
    started: false,
    history: null,
    inputIds: new Set(),
    journal: bindJournal(current),
    allocations: new Map(),
    effectIds: new Set(),
    evidenceIds: new Set(),
    activityOffers: new Map(),
  });
}
export function readKernel(run: T.Run): RunRecord {
  return Kernel.read(run);
}
/** Cold private reconstruction, after complete recovery admission. The sole
 * assertion removes readonly qualifiers from a detached, fully checked JSON DTO;
 * it supplies no missing field, migration, repair or counter reset.
 */
export function restoreKernel(
  archive: T.DeepReadonly<T.RunArchive>,
  parameters: T.DeepReadonly<DerivedParameters>,
): T.Run {
  const current = cloneData(archive.current) as T.RunState;
  const journal = bindJournal(current);
  const allocations = new Map<T.PersonId, T.Reference[]>();
  for (const allocation of current.receipts.allocated) {
    if (allocation.scope.kind !== 'person') continue;
    const person = allocation.scope.person;
    let refs = allocations.get(person);
    if (!refs) {
      refs = [];
      allocations.set(person, refs);
    }
    refs.push(allocation.reference);
  }
  let history: HistoryNode | null = null;
  for (const transaction of archive.history)
    history = Object.freeze({
      previous: history,
      transaction: freezeData(cloneData(transaction)),
      length: transaction.ordinal,
    });
  return Kernel.create({
    spec: freezeData(cloneData(archive.initial.spec)),
    parameters,
    initialPeople: freezeData(cloneData(archive.initial.people)),
    current,
    started: archive.history.length > 0,
    history,
    inputIds: new Set(current.receipts.inputs.map((input) => input.id)),
    journal,
    allocations,
    effectIds: new Set(current.receipts.effects.map((effect) => effect.id)),
    evidenceIds: new Set(
      current.receipts.evidence.map((receipt) => JSON.stringify([receipt.person, receipt.id])),
    ),
    activityOffers: activityOfferIndex(current),
  });
}
export function forkKernel(run: T.Run): T.Run {
  const source = Kernel.read(run);
  const current = cloneData(source.current);
  return Kernel.create({
    spec: source.spec,
    parameters: source.parameters,
    initialPeople: source.initialPeople,
    current,
    started: source.started,
    history: source.history,
    inputIds: new Set(source.inputIds),
    journal: bindJournal(current),
    allocations: new Map([...source.allocations].map(([person, refs]) => [person, [...refs]])),
    effectIds: new Set(source.effectIds),
    evidenceIds: new Set(source.evidenceIds),
    activityOffers: new Map(source.activityOffers),
  });
}

export type TransactionStage = {
  base: T.RunState;
  current: T.RunState;
  events: T.RunEvent[];
  receipts: ReceiptJournal;
};
export function stageTransaction(run: T.Run): TransactionStage {
  const base = Kernel.read(run).current;
  return {
    base,
    // Frame handlers replace changed slices. No prior events, receipts or input
    // index are cloned, and handlers never mutate a shared slice in place.
    current: { ...base, counters: { ...base.counters } },
    events: [],
    receipts: {
      dispositions: [],
      communications: [],
      inputs: [],
      settlements: [],
      evidence: [],
      effects: [],
      allocated: [],
    },
  };
}
export function commitTransaction(
  run: T.Run,
  stage: TransactionStage,
  startsRun = true,
  transaction?: T.DeepReadonly<T.AcceptedTransaction>,
): void {
  const record = Kernel.read(run);
  if (record.current !== stage.base) throw new TypeError('stale transaction stage');
  if (stage.current.events !== stage.base.events || stage.current.receipts !== stage.base.receipts)
    throw new TypeError('transaction replaced an append-only journal');
  // Preflight finishes before the first mutation. The dispatcher supplies only
  // new input IDs after complete batch admission, including IDs queued for later.
  const newIds = new Set<T.Id>();
  for (const input of stage.receipts.inputs) {
    if (record.inputIds.has(input.id) || newIds.has(input.id)) throw new TypeError('input already committed');
    newIds.add(input.id);
  }
  let history = record.history;
  if (transaction) {
    const ordinal = (history?.length ?? 0) + 1;
    if (transaction.ordinal !== ordinal) throw new TypeError('non-successive transaction ordinal');
    history = Object.freeze({
      previous: history,
      transaction: freezeData(cloneData(transaction)),
      length: ordinal,
    });
  }
  // Detach only this transaction's new records. A later owner mutation cannot
  // rewrite previously committed evidence through a shared nested object.
  const events = cloneData(stage.events);
  const receipts = cloneData(stage.receipts);
  freezeData(events);
  freezeData(receipts);
  const active = new Set(
    Object.values(stage.current.people).flatMap((actor) => (actor.activity ? [actor.activity.id] : [])),
  );
  const activityOffers = new Map([...record.activityOffers].filter(([id]) => active.has(id)));
  for (const event of events)
    if (
      event.data.kind === 'action-requested' &&
      event.data.request.stage === 'start' &&
      active.has(event.data.request.activityId)
    )
      activityOffers.set(event.data.request.activityId, event.data.request.offerRevision);
  if ([...active].some((id) => !activityOffers.has(id)))
    throw new TypeError('Activity lacks its original start offer revision');
  for (const event of events) record.journal.events.push(event);
  const append = <K extends keyof ReceiptJournal>(key: K) => {
    for (const receipt of receipts[key]) record.journal.receipts[key].push(receipt);
  };
  append('dispositions');
  append('communications');
  append('inputs');
  append('settlements');
  append('evidence');
  append('effects');
  append('allocated');
  for (const input of stage.receipts.inputs) record.inputIds.add(input.id);
  for (const allocation of receipts.allocated) {
    if (allocation.scope.kind !== 'person') continue;
    const person = allocation.scope.person;
    let refs = record.allocations.get(person);
    if (!refs) {
      refs = [];
      record.allocations.set(person, refs);
    }
    refs.push(allocation.reference);
  }
  for (const effect of receipts.effects) record.effectIds.add(effect.id);
  for (const receipt of receipts.evidence)
    record.evidenceIds.add(JSON.stringify([receipt.person, receipt.id]));
  record.current = stage.current;
  record.history = history;
  record.activityOffers = activityOffers;
  record.started ||= startsRun;
}
export function appendHistory(run: T.Run, transaction: T.DeepReadonly<T.AcceptedTransaction>): void {
  const record = Kernel.read(run);
  const ordinal = (record.history?.length ?? 0) + 1;
  if (transaction.ordinal !== ordinal) throw new TypeError('non-successive transaction ordinal');
  record.history = Object.freeze({
    previous: record.history,
    transaction: freezeData(cloneData(transaction)),
    length: ordinal,
  });
}
export function historyEntries(run: T.Run): readonly T.DeepReadonly<T.AcceptedTransaction>[] {
  let node = Kernel.read(run).history;
  const entries: T.DeepReadonly<T.AcceptedTransaction>[] = new Array(node?.length ?? 0);
  while (node) {
    entries[node.length - 1] = node.transaction;
    node = node.previous;
  }
  return Object.freeze(entries);
}
