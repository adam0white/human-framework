/** Current archives reject malformed state. They never repair, clamp or drop it. */
import { expect, test } from 'vitest';
import { exportRun, restoreRun, step } from '../src/index.ts';
import { archiveHashes } from '../src/run-archive.ts';
import type { RunArchive } from '../src/run-schema.ts';
import { authoredPerson, MINUTE, need, START, setup } from './support.ts';

function checkpoint() {
  const run = setup([authoredPerson('ada', 'Ada'), authoredPerson('bora', 'Bora', 'male')]);
  // The JSON boundary is deliberate: these controls craft wire data, not live actors.
  const wire: RunArchive = JSON.parse(JSON.stringify(exportRun(run)));
  return { run, wire };
}
function ada(wire: RunArchive) {
  const person = wire.current.people.ada;
  if (!person) throw new Error('Missing current actor');
  return person;
}
function rejected(wire: RunArchive) {
  // Recompute envelope hashes so owner validation, rather than a stale digest alone,
  // must reject a malformed current slice. No continuation or actor data is repaired.
  wire.hashes = archiveHashes(wire);
  const before = structuredClone(wire);
  expect(restoreRun(wire).ok).toBe(false);
  expect(wire).toStrictEqual(before);
}

test('a current engine-written archive restores exactly and continues through the same dispatcher', () => {
  const { run, wire } = checkpoint();
  const restored = need(restoreRun(wire));
  expect(exportRun(restored)).toStrictEqual(exportRun(run));
  need(step(run, { until: START + MINUTE, inputs: [] }));
  need(step(restored, { until: START + MINUTE, inputs: [] }));
  expect(exportRun(restored)).toStrictEqual(exportRun(run));
});

test('an unsafe clock is refused without changing the live run or wire data', () => {
  const { run, wire } = checkpoint();
  const live = exportRun(run);
  wire.current.at = Number.MAX_SAFE_INTEGER + 1;
  wire.current.cursor.at = wire.current.at;
  rejected(wire);
  expect(exportRun(run)).toStrictEqual(live);
});

test('out-of-range character state is refused rather than clamped or dropped', () => {
  const { wire } = checkpoint();
  ada(wire).character.baseTraits.honesty = 5;
  rejected(wire);
});

test('negative impression evidence is refused rather than silently removed', () => {
  const { wire } = checkpoint();
  ada(wire).social.impressions = [
    {
      targetId: 'bora',
      seenAt: START,
      cues: [{ key: 'fear', mean: 0.5, weight: -1.5, at: START }],
    },
  ];
  rejected(wire);
});

test('duplicate courtships and reversed mourning are refused rather than deduplicated or reordered', () => {
  const { wire } = checkpoint();
  const courtship = { withId: 'bora', since: START, warmth: 0.5, appeal: 0.5, meetings: 2, lastAt: START };
  ada(wire).bonds.courtships = [courtship, structuredClone(courtship)];
  rejected(wire);
  const fresh = checkpoint().wire;
  ada(fresh).bonds.mourning = { forId: 'bora', since: START, until: START - 1 };
  rejected(fresh);
});

test('negative retention is refused rather than restored as a default', () => {
  const { wire } = checkpoint();
  ada(wire).retention.trace = -1;
  rejected(wire);
});

test('an oversized gist list is refused rather than truncated to the live bound', () => {
  const { wire } = checkpoint();
  const limit = wire.initial.effective.builtins.GIST_DEFAULTS.maxGists;
  ada(wire).memory.gists = Array.from({ length: limit + 1 }, (_, index) => ({
    id: `g${index}`,
    at: START,
    kind: 'outcome',
    valence: -0.5,
    salience: 0.5,
    summary: `remembered:${index}`,
    tags: [],
    count: 1,
    firstAt: START,
    lastAt: START,
    weight: 1,
    peak: 0.5,
  }));
  ada(wire).memory.nextGist = limit + 1;
  rejected(wire);
});

test('a rewound run counter is refused rather than advanced during restore', () => {
  const { wire } = checkpoint();
  wire.current.counters.nextTransaction = 0;
  rejected(wire);
});

test('another archive version is refused without migration or input mutation', () => {
  const { run, wire } = checkpoint();
  const input = { ...wire, version: 3 },
    before = structuredClone(input),
    live = exportRun(run);
  const result = restoreRun(input);
  expect(result.ok).toBe(false);
  if (!result.ok) expect([result.error.code, result.error.path]).toEqual(['invalid-schema', '$.version']);
  expect(input).toStrictEqual(before);
  expect(exportRun(run)).toStrictEqual(live);
});

test('a prototype-key actor entry is refused before it can become a live actor', () => {
  const { run, wire } = checkpoint();
  Object.defineProperty(wire.current.people, '__proto__', {
    value: structuredClone(ada(wire)),
    enumerable: true,
    configurable: true,
    writable: true,
  });
  // Forbidden keys have no canonical encoding; admission must reject before digest comparison.
  const before = structuredClone(wire),
    live = exportRun(run);
  const result = restoreRun(wire);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).not.toBe('hash-mismatch');
  expect(wire).toStrictEqual(before);
  expect(exportRun(run)).toStrictEqual(live);
  expect(Object.getPrototypeOf(wire.current.people)).toBe(Object.prototype);
});
