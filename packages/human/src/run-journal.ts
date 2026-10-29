/** SCOPE: append-only persistence evidence, separate from native archives. Export
 * touches initial authoring once and only new accepted transactions thereafter.
 * Hosts commit chunks + matching host snapshot + head atomically before adopting
 * the returned cursor. Cold recovery executes every input; no current snapshot,
 * storage adapter, trusted-state shortcut or history omission is provided here.
 */
import { cloneData } from './core/clone.ts';
import { canonicalJson, hashCanonical } from './run-canonical.ts';
import { RUN_ENGINE } from './run-engine.ts';
import { packHistory, unpackHistory } from './run-history.ts';
import { freezeData, type HistoryNode, historyEntries, historySince, readKernel } from './run-kernel.ts';
import {
  executeAcceptedTransaction,
  type RecoveryOperations,
  validateReconstructedState,
} from './run-recovery.ts';
import type * as T from './run-schema.ts';
import { validateData } from './run-validation.ts';

const same = (a: unknown, b: unknown): boolean => canonicalJson(a) === canonicalJson(b);
function reject(
  path: string,
  message: string,
  code: T.ContractError['code'] = 'invalid-admission',
): T.Result<never> {
  return { ok: false, error: { code, path, message } };
}
export function journalOpeningDigest(body: T.DeepReadonly<Omit<T.RunJournalOpening, 'digest'>>): T.Hash {
  return hashCanonical('hf-journal1/opening', body);
}
export function journalChunkDigest(body: T.DeepReadonly<Omit<T.RunJournalChunk, 'digest'>>): T.Hash {
  return hashCanonical('hf-journal1/chunk', body);
}
function openingFor(run: T.Run): T.DeepReadonly<T.RunJournalOpening> {
  const record = readKernel(run);
  const body = {
    format: 'hf-run-journal' as const,
    version: 1 as const,
    engine: RUN_ENGINE,
    initial: {
      spec: record.spec,
      effective: record.parameters.effective,
      parameterProvenance: record.parameters.provenance,
      people: record.initialPeople,
    },
  };
  return freezeData(cloneData({ ...body, digest: journalOpeningDigest(body) }));
}
type CursorRecord = {
  run: T.Run;
  position: HistoryNode | null;
  people: ReturnType<typeof readKernel>['initialPeople'];
  head: T.DeepReadonly<T.RunJournalHead>;
};
class Cursor {
  #record: CursorRecord;
  constructor(record: CursorRecord) {
    this.#record = record;
  }
  static create(record: CursorRecord): T.RunJournalCursor {
    const cursor = new Cursor(record);
    Object.setPrototypeOf(cursor, null);
    Object.freeze(cursor);
    return cursor as unknown as T.RunJournalCursor;
  }
  static read(value: T.RunJournalCursor): CursorRecord | null {
    return value !== null && typeof value === 'object' && #record in value ? value.#record : null;
  }
}
function cursorFor(run: T.Run, head: T.DeepReadonly<T.RunJournalHead>): T.RunJournalCursor {
  const record = readKernel(run);
  return Cursor.create({ run, position: record.history, people: record.initialPeople, head });
}

export function exportJournal(
  run: T.Run,
  cursor?: T.RunJournalCursor,
): T.Result<T.DeepReadonly<T.RunJournalExport>> {
  const record = readKernel(run);
  let opening: T.DeepReadonly<T.RunJournalOpening> | undefined;
  let prior: T.DeepReadonly<T.RunJournalHead>;
  let position: HistoryNode | null = null;
  if (cursor !== undefined) {
    const captured = Cursor.read(cursor);
    if (!captured || captured.run !== run || captured.people !== record.initialPeople)
      return reject('$.cursor', 'cursor belongs to another run or initial authoring');
    prior = captured.head;
    position = captured.position;
  } else {
    opening = openingFor(run);
    prior = { lineage: opening.digest, digest: opening.digest, ordinal: 0, at: record.spec.start };
  }
  const transactions = historySince(run, position);
  if (!transactions) return reject('$.cursor', 'cursor is not a prefix of this run');
  let chunk: T.DeepReadonly<T.RunJournalChunk> | null = null;
  let head = prior;
  if (transactions.length) {
    const last = transactions.at(-1);
    if (!last) throw new TypeError('missing journal transaction');
    const body = {
      format: 'hf-run-journal-chunk' as const,
      version: 1 as const,
      lineage: prior.lineage,
      previous: prior.digest,
      first: prior.ordinal + 1,
      last: last.ordinal,
      at: last.reachedAt,
      history: packHistory(transactions),
    };
    chunk = freezeData({ ...body, digest: journalChunkDigest(body) });
    head = freezeData({
      lineage: prior.lineage,
      digest: chunk.digest,
      ordinal: last.ordinal,
      at: last.reachedAt,
    });
  }
  const frozenHead = freezeData({ ...head });
  return {
    ok: true,
    value: Object.freeze({
      ...(opening ? { opening } : {}),
      chunk,
      head: frozenHead,
      cursor: cursorFor(run, frozenHead),
    }),
  };
}

export function restoreJournal(
  input: unknown,
  operations: RecoveryOperations,
): T.Result<T.DeepReadonly<T.RunJournalRestored>> {
  const structural = validateData('RunJournalArchive', input);
  if (!structural.ok) return structural;
  const archive = cloneData(structural.value);
  const { opening } = archive;
  if (!same(opening.engine, RUN_ENGINE))
    return reject(
      '$.opening.engine',
      'journal requires this exact package, build and schema',
      'unsupported-archive',
    );
  const { digest: openingDigest, ...openingBody } = opening;
  if (journalOpeningDigest(openingBody) !== openingDigest)
    return reject('$.opening.digest', 'journal opening digest mismatch', 'hash-mismatch');
  let head: T.DeepReadonly<T.RunJournalHead> = {
    lineage: openingDigest,
    digest: openingDigest,
    ordinal: 0,
    at: opening.initial.spec.start,
  };
  const histories: T.DeepReadonly<readonly T.AcceptedTransaction[]>[] = [];
  for (const [index, chunk] of archive.chunks.entries()) {
    const path = `$.chunks[${index}]`;
    if (
      chunk.lineage !== head.lineage ||
      chunk.previous !== head.digest ||
      chunk.first !== head.ordinal + 1 ||
      !Number.isSafeInteger(chunk.last) ||
      chunk.last < chunk.first
    )
      return reject(path, 'journal lineage, predecessor or ordinal range differs');
    const { digest, ...body } = chunk;
    if (journalChunkDigest(body) !== digest)
      return reject(`${path}.digest`, 'journal chunk digest mismatch', 'hash-mismatch');
    let decoded: unknown;
    try {
      decoded = unpackHistory(chunk.history);
    } catch (failure) {
      return reject(`${path}.history`, failure instanceof Error ? failure.message : 'invalid history pool');
    }
    const history = validateData('RunHistory', decoded);
    if (!history.ok) return history;
    if (
      history.value.length !== chunk.last - chunk.first + 1 ||
      history.value.some((transaction, offset) => transaction.ordinal !== chunk.first + offset) ||
      history.value.at(-1)?.reachedAt !== chunk.at
    )
      return reject(path, 'journal transaction range or reached time differs');
    histories.push(history.value);
    head = { lineage: head.lineage, digest, ordinal: chunk.last, at: chunk.at };
  }
  if (!same(archive.head, head))
    return reject('$.head', 'journal does not contain the complete committed prefix');
  const created = operations.createRun(JSON.parse(canonicalJson(opening.initial.spec)) as T.RunSpec);
  if (!created.ok) return created;
  const run = created.value;
  for (const person of opening.initial.people) {
    const admitted = operations.createPerson(run, cloneData(person));
    if (!admitted.ok) return admitted;
    if (admitted.value !== person.id)
      return reject('$.opening.initial.people', 'constructor returned a different identity');
  }
  if (openingFor(run).digest !== openingDigest)
    return reject('$.opening.initial', 'effective parameters or authoring differ from constructors');
  for (const [index, history] of histories.entries())
    for (const [transactionIndex, transaction] of history.entries()) {
      const reached = executeAcceptedTransaction(
        run,
        transaction,
        operations,
        `$.chunks[${index}].history[${transactionIndex}]`,
      );
      if (!reached.ok) return reached;
    }
  if (readKernel(run).current.at !== head.at) return reject('$.head.at', 'executed journal clock differs');
  const record = readKernel(run);
  const valid = validateReconstructedState(
    { current: record.current, initial: opening.initial, history: historyEntries(run) },
    record.parameters.hash,
  );
  if (!valid.ok) return valid;
  const frozenHead = freezeData({ ...head });
  return { ok: true, value: Object.freeze({ run, head: frozenHead, cursor: cursorFor(run, frozenHead) }) };
}
