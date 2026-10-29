/** SCOPE: format-six accepted history is lossless and canonical, remains fully
 * replayed, and refuses corrupt or exponentially expanding dictionary inputs.
 */
import { expect, it } from 'vitest';
import { createRun, exportRun, readRunHistory, replay, restoreRun, step } from '../src/index.ts';
import { packHistory, unpackHistory } from '../src/run-history.ts';
import type { HistoryPool } from '../src/run-schema.ts';
import { emptyRunSpec } from './run-fixture.ts';
import { accepted } from './run-numerical-fixture.ts';

it('interns repeated accepted evidence without dropping opaque values or replay checks', () => {
  const run = accepted(createRun(emptyRunSpec()));
  const opaque = {
    ref: 0,
    pool: [
      [0, 1],
      [1, 2],
    ],
    nested: { text: 'same'.repeat(100), absent: null },
  };
  for (let day = 1; day <= 128; day++)
    accepted(
      step(run, {
        until: day,
        inputs: [
          {
            id: `world-${day}`,
            at: day,
            source: { type: 'host', id: 'world' },
            kind: 'world.changed',
            payload: { expectedRevision: day - 1, revision: day, put: [], remove: [], hostState: opaque },
          },
        ],
      }),
    );
  const archive = JSON.parse(JSON.stringify(exportRun(run)));
  const history = readRunHistory(archive);
  expect(history).toHaveLength(128);
  expect(history[0]?.inputs[0]?.payload).toMatchObject({ hostState: opaque });
  expect(JSON.stringify(archive.history).length).toBeLessThan(JSON.stringify(history).length * 0.6);
  expect(unpackHistory(archive.history)).toEqual(history);
  expect(packHistory(history)).toEqual(archive.history);
  expect(Object.isFrozen(history[0]?.inputs)).toBe(true);
  expect(exportRun(accepted(restoreRun(archive)))).toEqual(archive);
  expect(accepted(replay(archive)).fullHash).toBe(archive.hashes.full);
  expect(restoreRun({ ...archive, version: 5 }).ok).toBe(false);
  // A closed-schema input cannot be hidden inside an otherwise well-formed pool.
  const invalidKind = structuredClone(archive);
  invalidKind.history.pool = invalidKind.history.pool.map((node: unknown) =>
    node === 'world.changed' ? 'invented.kind' : node,
  );
  expect(() => readRunHistory(invalidKind)).toThrow();
});

it('rejects forward, duplicate, unreachable, reordered and expanding dictionary nodes', () => {
  const corrupt: HistoryPool[] = [
    { root: 0, pool: [[0, 0]] },
    { root: 2, pool: [1, 1, [0, 0, 1]] },
    { root: 1, pool: [1, [0]] },
    { root: 2, pool: ['second', 'first', [0, 1, 0]] },
    { root: 3, pool: ['z', 'a', 1, [1, 0, 2, 1, 2]] },
  ];
  for (const pool of corrupt) expect(() => unpackHistory(pool)).toThrow();
  const pool: HistoryPool['pool'][number][] = [null];
  for (let index = 1; index < 25; index++) pool.push([0, index - 1, index - 1]);
  expect(() => unpackHistory({ root: pool.length - 1, pool })).toThrow('history exceeds expansion budget');
});
