import { expect, test } from 'vitest';
import { random } from '../src/core/random.ts';
import {
  appendHistory,
  commitTransaction,
  forkKernel,
  historyEntries,
  makeKernel,
  readKernel,
  stageTransaction,
} from '../src/run-kernel.ts';
import { buildParameters } from '../src/run-parameters.ts';
import { actorStream, constructionStream } from '../src/run-state.ts';
import { emptyRunSpec } from './run-fixture.ts';

test('discarded staging leaves live journals unchanged and committed deltas preserve their identity', () => {
  const parameters = buildParameters();
  if (!parameters.ok) throw new Error(parameters.error.message);
  const run = makeKernel(emptyRunSpec(), parameters.value);
  const record = readKernel(run);
  const inputs = record.current.receipts.inputs;
  const discarded = stageTransaction(run);
  discarded.current.at = 10;
  discarded.receipts.inputs.push({ id: 'discarded', hash: '0'.repeat(64), ordinal: 1 });
  expect(record.current.at).toBe(0);
  expect(inputs).toHaveLength(0);
  expect(record.inputIds.has('discarded')).toBe(false);

  const accepted = stageTransaction(run);
  accepted.receipts.inputs.push({ id: 'accepted', hash: '1'.repeat(64), ordinal: 1 });
  commitTransaction(run, accepted);
  expect(record.current.receipts.inputs).toBe(inputs);
  expect(inputs.map((input) => input.id)).toEqual(['accepted']);
  expect(record.inputIds.has('accepted')).toBe(true);
  expect(() => commitTransaction(run, discarded)).toThrow('stale transaction stage');
  expect(inputs).toHaveLength(1);
});

// Catches source/caller aliasing or a process-wide tuning write during interleaved construction.
test('interleaved parameter construction keeps each frozen run copy independent', () => {
  const authored = { assent: { minStrength: 0.5, pressure: 0.05 }, promptings: { practiceHalfLifeDays: 30 } };
  const first = buildParameters(authored);
  expect(first.ok).toBe(true);
  if (!first.ok) throw new Error(first.error.message);
  const before = first.value.hash;
  authored.assent.pressure = 0.15;
  const second = buildParameters(authored);
  const repeated = buildParameters({
    assent: { minStrength: 0.5, pressure: 0.05 },
    promptings: { practiceHalfLifeDays: 30 },
  });
  if (!second.ok || !repeated.ok) throw new Error('valid tuning rejected');
  expect(first.value.effective.assent.pressure).toBe(0.05);
  expect(second.value.effective.assent.pressure).toBe(0.15);
  expect(first.value.hash).toBe(before);
  expect(repeated.value.hash).toBe(before);
  expect(second.value.hash).not.toBe(before);
  expect(Reflect.set(first.value.effective.builtins.PROMPTINGS_DEFAULTS, 'practiceHalfLifeDays', 99)).toBe(
    false,
  );
  expect(first.value.effective.builtins.PROMPTINGS_DEFAULTS.practiceHalfLifeDays).toBe(30);
});

test('named actor and construction streams stay independent of creation and draw order', () => {
  const first = actorStream(12, 'ada');
  const other = actorStream(12, 'ben');
  const child = constructionStream(12, { kind: 'inheritance', child: 'child' });
  const original = JSON.stringify(first);
  random({ ...other.words });
  random(child.words);
  expect(JSON.stringify(actorStream(12, 'ada'))).toBe(original);
  expect(first.identity.uniformDraws).toBe(12);
  expect(first.identity.initializationDraws).toBe(12);
  expect(first.identity.id).not.toBe(other.identity.id);
  expect(first.identity.id).not.toBe(actorStream(13, 'ada').identity.id);
  expect(child.id).not.toBe(
    constructionStream(12, { kind: 'gestation', mother: 'ada', pregnancyId: 'child' }).id,
  );
});

test('opaque runs expose no mutable state or methods and preview history stays private', () => {
  const parameters = buildParameters();
  if (!parameters.ok) throw new Error(parameters.error.message);
  const run = makeKernel(emptyRunSpec(), parameters.value);
  expect(Object.getPrototypeOf(run)).toBe(null);
  expect(Object.keys(run)).toEqual([]);
  expect(Object.isFrozen(run)).toBe(true);
  const branch = forkKernel(run);
  const draft = readKernel(branch);
  const transaction = {
    ordinal: 1,
    until: 0,
    inputs: [],
    fidelity: { mode: 'fine' as const },
    reachedAt: 0,
    cursor: draft.current.cursor,
    boundary: { type: 'until' as const },
  };
  appendHistory(branch, transaction);
  expect(historyEntries(run)).toEqual([]);
  expect(historyEntries(branch)).toHaveLength(1);
  draft.current.world.hostState = { hypothetical: true };
  expect(readKernel(run).current.world.hostState).toBe(null);
});
