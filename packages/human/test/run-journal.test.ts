/** SCOPE: append-only checkpoint evidence replays the complete committed prefix,
 * rejects forks/corruption without changing a live run, and continues identically
 * to the full native archive. Incremental export never reads current actor state.
 */
import { expect, it } from 'vitest';
import {
  createPerson,
  createRun,
  exportRun,
  exportRunJournal,
  readRunHistory,
  restoreRun,
  restoreRunJournal,
  step,
} from '../src/index.ts';
import { archiveSnapshot } from '../src/run-archive.ts';
import { hashCanonical } from '../src/run-canonical.ts';
import { packHistory, unpackHistory } from '../src/run-history.ts';
import { journalChunkDigest, restoreJournal } from '../src/run-journal.ts';
import { forkKernel, readKernel } from '../src/run-kernel.ts';
import type {
  AcceptedTransaction,
  RunJournalArchive,
  RunJournalChunk,
  RunJournalOpening,
} from '../src/run-schema.ts';
import { emptyRunSpec } from './run-fixture.ts';
import { accepted, numericalPerson } from './run-numerical-fixture.ts';

const change = (revision: number) => ({
  id: `world-${revision}`,
  at: revision,
  source: { type: 'host' as const, id: 'world' },
  kind: 'world.changed' as const,
  payload: { expectedRevision: revision - 1, revision, put: [], remove: [], hostState: { revision } },
});

it('appends exact new evidence, rejects forks and corrupt prefixes, then restores and continues like native archives', () => {
  const run = accepted(createRun(emptyRunSpec()));
  accepted(createPerson(run, numericalPerson(1)));
  const opening = accepted(exportRunJournal(run));
  expect(opening.chunk).toBe(null);
  expect(opening.opening).toBeDefined();
  expect(Object.isFrozen(opening.head)).toBe(true);
  accepted(step(run, { until: 1, inputs: [change(1)] }));
  const first = accepted(exportRunJournal(run, opening.cursor));
  expect(first.opening).toBeUndefined();
  expect(first.chunk?.first).toBe(1);
  expect(first.chunk?.last).toBe(1);
  expect(accepted(exportRunJournal(run, opening.cursor)).chunk).toEqual(first.chunk);
  const prefix = JSON.stringify(first.chunk);
  const before = exportRun(run);
  const fork = forkKernel(run);
  expect(exportRunJournal(fork, first.cursor).ok).toBe(false);
  expect(exportRun(fork)).toEqual(before);
  expect(exportRunJournal(run, {} as typeof first.cursor).ok).toBe(false);
  expect(exportRun(run)).toEqual(before);
  expect(accepted(exportRunJournal(run, first.cursor)).chunk).toBe(null);
  accepted(step(run, { until: 2, inputs: [change(2)] }));
  // Any whole-current traversal would invoke this getter. Ordinary journal export
  // uses the immutable accepted history instead and does not inspect live state.
  const originalPeople = readKernel(run).current.people;
  Object.defineProperty(readKernel(run).current, 'people', {
    get() {
      throw Error('current state read');
    },
    configurable: true,
  });
  const second = accepted(exportRunJournal(run, first.cursor));
  Object.defineProperty(readKernel(run).current, 'people', {
    value: originalPeople,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  expect(second.chunk?.first).toBe(2);
  expect(second.chunk?.last).toBe(2);
  expect(JSON.stringify(first.chunk)).toBe(prefix);
  const archive: RunJournalArchive = JSON.parse(
    JSON.stringify({ opening: opening.opening, chunks: [first.chunk, second.chunk], head: second.head }),
  );
  const restored = accepted(restoreRunJournal(archive));
  const native = accepted(restoreRun(exportRun(run)));
  expect(exportRun(restored.run)).toEqual(exportRun(native));
  const corruptions = [
    { ...archive, chunks: [archive.chunks[0], archive.chunks[0], archive.chunks[1]] },
    { ...archive, chunks: [archive.chunks[1]] },
    { ...archive, chunks: [archive.chunks[1], archive.chunks[0]] },
    { ...archive, chunks: archive.chunks.slice(0, 1) },
    {
      ...archive,
      opening: { ...archive.opening, engine: { ...archive.opening.engine, build: '0'.repeat(64) } },
    },
    { ...archive, chunks: archive.chunks.map((chunk, index) => (index === 1 ? { ...chunk, at: 3 } : chunk)) },
  ];
  for (const damaged of corruptions) expect(restoreRunJournal(damaged).ok).toBe(false);
  expect(exportRun(run)).toEqual(exportRun(native));
  for (const live of [run, native, restored.run]) accepted(step(live, { until: 3, inputs: [change(3)] }));
  expect(exportRun(restored.run)).toEqual(exportRun(native));
  expect(exportRun(run)).toEqual(exportRun(native));
  const third = accepted(exportRunJournal(restored.run, restored.cursor));
  expect(third.opening).toBeUndefined();
  expect(third.chunk?.first).toBe(3);
  expect(third.chunk?.previous).toBe(second.head.digest);

  // Optional checkpoints remain verified and retained, through the same executed
  // transaction verifier used by native archive recovery.
  const checkpointRun = accepted(createRun(emptyRunSpec()));
  const reached = accepted(step(checkpointRun, { until: 1, inputs: [change(1)] }));
  const full = exportRun(checkpointRun);
  const checkpointed: AcceptedTransaction[] = JSON.parse(JSON.stringify(readRunHistory(full)));
  const transaction = checkpointed[0];
  if (!transaction) throw Error('missing accepted transaction');
  transaction.eventHash = hashCanonical('hf-run4/events', reached.events);
  transaction.stateHash = hashCanonical(
    'hf-run4/current',
    archiveSnapshot(readKernel(checkpointRun).current),
  );
  const checkpointExport = accepted(exportRunJournal(checkpointRun));
  const raw = checkpointExport.chunk as RunJournalChunk;
  const { digest: _digest, ...body } = raw;
  const checkpointBody = { ...body, history: packHistory(checkpointed) };
  const checkpointChunk = { ...checkpointBody, digest: journalChunkDigest(checkpointBody) };
  const checkpointArchive = {
    opening: checkpointExport.opening as RunJournalOpening,
    chunks: [checkpointChunk],
    head: { ...checkpointExport.head, digest: checkpointChunk.digest },
  };
  const recovered = accepted(restoreRunJournal(checkpointArchive));
  expect(readRunHistory(exportRun(recovered.run))).toEqual(checkpointed);
  transaction.stateHash = '0'.repeat(64);
  const invalidBody = { ...checkpointBody, history: packHistory(checkpointed) };
  const invalidChunk = { ...invalidBody, digest: journalChunkDigest(invalidBody) };
  const invalidCheckpoint = restoreRunJournal({
    ...checkpointArchive,
    chunks: [invalidChunk],
    head: { ...checkpointArchive.head, digest: invalidChunk.digest },
  });
  expect(invalidCheckpoint.ok).toBe(false);
  if (!invalidCheckpoint.ok) expect(invalidCheckpoint.error.path).toContain('$.chunks[0].history[0]');
  expect(unpackHistory(checkpointChunk.history)).toEqual(readRunHistory(exportRun(recovered.run)));
});

it('validates the complete executed state before accepting journal recovery', () => {
  const run = accepted(createRun(emptyRunSpec()));
  accepted(step(run, { until: 1, inputs: [change(1)] }));
  const exported = accepted(exportRunJournal(run));
  const archive = { opening: exported.opening, chunks: [exported.chunk], head: exported.head };
  const recovered = restoreJournal(archive, {
    createRun,
    createPerson,
    exportRun,
    step(target, input) {
      const result = step(target, input);
      if (result.ok) readKernel(target).current.counters.nextEvent += 1;
      return result;
    },
  });
  expect(recovered.ok).toBe(false);
  if (!recovered.ok) expect(recovered.error.path).toBe('$.current.counters.nextEvent');
  expect(restoreRunJournal(archive).ok).toBe(true);
});
