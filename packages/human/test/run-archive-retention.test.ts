/** SCOPE: format-five cold archives bound duplicated journals, preserve every
 * accepted input, reconstruct exact replay and continue with complete deduplication.
 */
import { expect, it } from 'vitest';
import { createRun, exportRun, replay, restoreRun, step } from '../src/index.ts';
import { emptyRunSpec } from './run-fixture.ts';
import { accepted } from './run-numerical-fixture.ts';

it('bounds duplicate journals while retaining the complete replay and continuation', () => {
  const run = accepted(createRun(emptyRunSpec()));
  const change = (revision: number) => ({
    id: `world-${revision}`,
    at: revision,
    source: { type: 'host' as const, id: 'world' },
    kind: 'world.changed' as const,
    payload: { expectedRevision: revision - 1, revision, put: [], remove: [], hostState: { revision } },
  });
  for (let revision = 1; revision <= 192; revision++)
    accepted(step(run, { until: revision, inputs: [change(revision)] }));
  const archive = JSON.parse(JSON.stringify(exportRun(run)));
  expect(archive.version).toBe(5);
  expect(archive.history.flatMap((transaction: { inputs: unknown[] }) => transaction.inputs)).toHaveLength(
    192,
  );
  expect(archive.current.receipts.inputs.length).toBeLessThanOrEqual(64);
  expect(archive.current.receipts.dispositions.length).toBeLessThanOrEqual(64);
  expect(archive.current.events.length).toBeLessThanOrEqual(64);
  const restored = accepted(restoreRun(archive));
  const reproduced = accepted(replay(archive));
  expect(reproduced.fullHash).toBe(archive.hashes.full);
  expect(exportRun(restored)).toEqual(archive);
  expect(exportRun(reproduced.run)).toEqual(archive);
  // A pruned input must remain in the reconstructed private deduplication index.
  expect(step(restored, { until: 193, inputs: [{ ...change(1), at: 193 }] }).ok).toBe(false);
  accepted(step(run, { until: 193, inputs: [change(193)] }));
  accepted(step(restored, { until: 193, inputs: [change(193)] }));
  expect(exportRun(restored)).toEqual(exportRun(run));
});
