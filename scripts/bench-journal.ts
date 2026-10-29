/** Opt-in synthetic append-only checkpoint control: node scripts/bench-journal.ts [--full].
 * One person, one accepted world revision per one-second fine step. This is not
 * Valley/Child acceptance, a daily workload or a semantic retention experiment.
 */
import { deepStrictEqual } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { cpus, loadavg } from 'node:os';
import { relative, resolve } from 'node:path';
import {
  createPerson,
  createRun,
  type DeepReadonly,
  exportRun,
  exportRunJournal,
  type Input,
  type RunArchive,
  type RunJournalChunk,
  restoreRunJournal,
  step,
} from '../packages/human/src/index.ts';
import { authoredPerson, exampleSpec, need, START } from './bench-g7-child-host.ts';

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--full')) throw new Error('Usage: node scripts/bench-journal.ts [--full]');
const checkpoints = args.includes('--full') ? 256 : 16;
const root = resolve(import.meta.dirname, '..');
const sourceHash = createHash('sha256');
function hashSources(directory: string): void {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  )) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) hashSources(path);
    else sourceHash.update(relative(root, path)).update('\0').update(readFileSync(path)).update('\0');
  }
}
hashSources(resolve(root, 'packages/human/src'));
const source = {
  head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  dirty: execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).length > 0,
  humanSourceSha256: sourceHash.digest('hex'),
  benchmarkSha256: createHash('sha256')
    .update(readFileSync(import.meta.filename))
    .digest('hex'),
};
const emit = (value: unknown) => console.log(JSON.stringify(value));
const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value));
const spec = exampleSpec(410);
spec.host = { id: 'world', edition: 'journal-benchmark-1', schema: 'journal-benchmark-1' };
const run = need(createRun(spec));
need(createPerson(run, authoredPerson('person', 'Person')));
const openingStart = performance.now();
const opened = need(exportRunJournal(run));
const openingExportMs = performance.now() - openingStart;
if (!opened.opening || opened.chunk) throw new Error('Expected opening before the first transaction');
const opening = opened.opening;
let cursor = opened.cursor;
let head = opened.head;
const openingSerializationStart = performance.now();
const openingBytes = bytes(opening);
const openingSerializationMs = performance.now() - openingSerializationStart;
const chunks: DeepReadonly<RunJournalChunk>[] = [];
let cumulativeChunkBytes = 0;
let stepMs = 0;
let journalExportMs = 0;
let journalSerializationMs = 0;
let finalNative: DeepReadonly<RunArchive> | undefined;
const nativeMeasurements: unknown[] = [];
function inputAt(checkpoint: number): Input<'world.changed'> {
  return {
    id: `world-${String(checkpoint).padStart(8, '0')}`,
    at: START + checkpoint * 1000,
    source: { type: 'host', id: 'world' },
    kind: 'world.changed',
    payload: {
      expectedRevision: checkpoint - 1,
      revision: checkpoint,
      put: [],
      remove: [],
      hostState: { completed: 0, active: [] },
    },
  };
}
emit({
  stage: 'start',
  workload: 'synthetic-journal-checkpoints',
  checkpoints,
  scope:
    'Fixed one-person one-second fine steps. Newly written chunk bytes exclude earlier chunks; complete retained history still grows. No game acceptance or G16 claim.',
  node: process.version,
  cpu: cpus()[0]?.model,
  load: loadavg(),
  source,
  engine: opening.engine,
  opening: { bytes: openingBytes, exportMs: openingExportMs, serializationMs: openingSerializationMs },
});
for (let checkpoint = 1; checkpoint <= checkpoints; checkpoint++) {
  const from = performance.now();
  const reached = need(step(run, { until: START + checkpoint * 1000, inputs: [inputAt(checkpoint)] }));
  const oneStepMs = performance.now() - from;
  if (!reached.reachedUntil || reached.boundary.type !== 'until')
    throw new Error('Synthetic step unexpectedly requires a host resolution');
  stepMs += oneStepMs;
  const exportStart = performance.now();
  const exported = need(exportRunJournal(run, cursor));
  const exportMs = performance.now() - exportStart;
  if (
    !exported.chunk ||
    exported.opening ||
    exported.chunk.first !== checkpoint ||
    exported.chunk.last !== checkpoint
  )
    throw new Error('Expected exactly one new accepted transaction');
  const serializationStart = performance.now();
  const chunkBytes = bytes(exported.chunk);
  const headBytes = bytes(exported.head);
  const serializationMs = performance.now() - serializationStart;
  chunks.push(exported.chunk);
  cumulativeChunkBytes += chunkBytes;
  journalExportMs += exportMs;
  journalSerializationMs += serializationMs;
  // This in-memory control acknowledges the retained chunk before adopting its cursor.
  // A storage host must instead commit chunk + host state + head atomically first.
  cursor = exported.cursor;
  head = exported.head;
  const row = {
    stage: 'checkpoint',
    checkpoint,
    transactions: exported.chunk.last,
    acceptedInputs: checkpoint,
    newChunkBytes: chunkBytes,
    headBytes,
    cumulativeChunkBytes,
    cumulativeOpeningAndChunkBytes: openingBytes + cumulativeChunkBytes,
    stepMs: oneStepMs,
    journalExportMs: exportMs,
    serializationMs,
  };
  emit(row);
  if (checkpoint === 1 || checkpoint === checkpoints) {
    const nativeStart = performance.now();
    const archive = exportRun(run);
    const nativeExportMs = performance.now() - nativeStart;
    const nativeSerializationStart = performance.now();
    const nativeBytes = bytes(archive);
    const nativeSerializationMs = performance.now() - nativeSerializationStart;
    const native = {
      stage: 'native-export',
      checkpoint,
      bytes: nativeBytes,
      exportMs: nativeExportMs,
      serializationMs: nativeSerializationMs,
    };
    nativeMeasurements.push(native);
    emit(native);
    if (checkpoint === checkpoints) finalNative = archive;
  }
}
const journal = { opening, chunks, head };
const journalSerializationStart = performance.now();
const journalJson = JSON.stringify(journal);
const fullJournalSerializationMs = performance.now() - journalSerializationStart;
const parseStart = performance.now();
const parsed: unknown = JSON.parse(journalJson);
const parseMs = performance.now() - parseStart;
const restoreStart = performance.now();
const restored = need(restoreRunJournal(parsed));
const restoreMs = performance.now() - restoreStart;
const verificationStart = performance.now();
const restoredNative = exportRun(restored.run);
deepStrictEqual(restoredNative, finalNative, 'Cold journal recovery changed the complete native archive');
deepStrictEqual(restored.head, head, 'Cold journal recovery changed its committed head');
const next = { until: START + (checkpoints + 1) * 1000, inputs: [inputAt(checkpoints + 1)] };
const originalNext = need(step(run, next));
const recoveredNext = need(step(restored.run, next));
deepStrictEqual(recoveredNext, originalNext, 'Recovered next step changed');
deepStrictEqual(exportRun(restored.run), exportRun(run), 'Recovered next native archive changed');
const resumed = need(exportRunJournal(restored.run, restored.cursor));
if (resumed.opening || resumed.chunk?.first !== checkpoints + 1 || resumed.chunk.last !== checkpoints + 1)
  throw new Error('Recovered cursor did not emit exactly the next transaction');
emit({
  stage: 'result',
  checkpoints,
  people: 1,
  elapsedSimulationMs: checkpoints * 1000,
  transactions: head.ordinal,
  acceptedInputs: checkpoints,
  verificationNextTransactions: 1,
  openingBytes,
  cumulativeChunkBytes,
  committedHeadBytes: bytes(head),
  journalArchiveBytes: Buffer.byteLength(journalJson),
  totals: {
    stepMs,
    journalExportMs,
    journalSerializationMs,
    fullJournalSerializationMs,
    parseMs,
    restoreMs,
    verificationMs: performance.now() - verificationStart,
  },
  nativeExports: nativeMeasurements,
  nativeExportExact: true,
  nextStepExact: true,
  nextNativeExportExact: true,
  recoveredCursorContinues: true,
  nativeHash: restoredNative.hashes.full,
  load: loadavg(),
  limitation:
    'Synthetic transaction growth control; no disk/IndexedDB durability, host snapshot, Valley/Child timing or 881-day/G16 proof. Per-checkpoint chunk bytes can grow with newly accepted input bytes and ordinal digit width; cumulative storage is not bounded.',
});
