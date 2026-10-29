import { expect, test } from 'vitest';
import * as actualRun from '../src/run.ts';
import { archiveHashes, checkArchiveEnvelope } from '../src/run-archive.ts';
import { canonicalJson, hashCanonical } from '../src/run-canonical.ts';
import { packHistory } from '../src/run-history.ts';
import { buildParameters } from '../src/run-parameters.ts';
import { type RecoveryOperations, replayCurrentRun, restoreCurrentRun } from '../src/run-recovery.ts';
import type { PersonAuthoring, RunArchive } from '../src/run-schema.ts';
import { initialRunState } from '../src/run-state.ts';
import { emptyRunSpec } from './run-fixture.ts';

// Catches UTF16 sort, JSON.stringify's numeric-key reorder and a different hash wire contract.
// The expected bytes/digest were independently derived with Python Unicode ordering/hashlib.
test('the archive hash emits numeric and astral keys in code-point order', () => {
  const input = { '2': 2, '10': 10, '\u{10000}': 4, '\uE000': 3 };
  expect(canonicalJson(input)).toBe('{"10":10,"2":2,"\uE000":3,"\u{10000}":4}');
  expect(hashCanonical('hf-run4/control', input)).toBe(
    '99aa27f48ab2f175b12463f5d5a7199067da03e577859106d68a75ac8d405cb8',
  );
  expect(hashCanonical('hf-run4/control', { '\uE000': 3, '10': 10, '\u{10000}': 4, '2': 2 })).toBe(
    '99aa27f48ab2f175b12463f5d5a7199067da03e577859106d68a75ac8d405cb8',
  );
});

test('canonical admission rejects an accessor without evaluating it', () => {
  let reads = 0;
  const input = {
    get hidden() {
      reads += 1;
      return 7;
    },
  };
  expect(() => canonicalJson(input)).toThrow();
  expect(reads).toBe(0);
  expect(() => canonicalJson({ value: -0 })).toThrow();
});

test('strict archive admission rejects altered bytes, stale engines and rewound infrastructure', () => {
  const spec = emptyRunSpec();
  const parameters = buildParameters();
  if (!parameters.ok) throw new Error(parameters.error.message);
  const engine = {
    package: '@adam0white/human-framework@4.0.0',
    build: 'a'.repeat(64),
    schema: 'b'.repeat(64),
  };
  const body = {
    format: 'hf-run' as const,
    version: 6 as const,
    engine,
    host: spec.host,
    initial: {
      spec,
      effective: parameters.value.effective,
      parameterProvenance: parameters.value.provenance,
      people: [],
    },
    history: packHistory([]),
    current: initialRunState(spec),
  };
  const archive: RunArchive = { ...body, hashes: archiveHashes(body) };
  const checked = checkArchiveEnvelope(archive, engine);
  if (!checked.ok) throw new Error(JSON.stringify(checked.error));
  expect(checked.ok).toBe(true);
  expect(checkArchiveEnvelope({ ...archive, current: { ...archive.current, at: 1 } }, engine).ok).toBe(false);
  expect(checkArchiveEnvelope(archive, { ...engine, build: 'c'.repeat(64) }).ok).toBe(false);
  const rewound = {
    ...body,
    current: { ...body.current, counters: { ...body.current.counters, nextTransaction: 0 } },
  };
  expect(checkArchiveEnvelope({ ...rewound, hashes: archiveHashes(rewound) }, engine).ok).toBe(false);
  expect(checkArchiveEnvelope({ ...archive, version: 3 }, engine).ok).toBe(false);
});

// Uses only the actual API. The supplied C0 root must provide its real step;
// missing integration stays RED rather than installing a synthetic dispatcher.
test('current run restore/replay rejects tampering and preserves accepted continuation', () => {
  const operations: RecoveryOperations = actualRun;
  const created = operations.createRun(emptyRunSpec());
  if (!created.ok) throw new Error(created.error.message);
  const person: PersonAuthoring = {
    id: 'reader',
    identity: { name: 'Reader', birthAt: -946080000000, sex: 'female' },
    biography: [
      {
        id: 'e0',
        at: -1,
        kind: 'observation',
        valence: 0.2,
        salience: 0.5,
        summary: 'The door was open.',
        tags: [],
        basis: { kind: 'authored', author: 'world' },
        provenance: [],
      },
    ],
    origin: {
      kind: 'authored',
      basis: { kind: 'evidence', id: 'opening' },
      traits: { kind: 'unknown-genetics-prior', prior: 'source-population-midpoint' },
    },
    state: {
      traits: {
        honesty: 0.5,
        emotionality: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        conscientiousness: 0.5,
        openness: 0.5,
      },
      values: {
        benevolence: 0.5,
        universalism: 0.5,
        tradition: 0.5,
        conformity: 0.5,
        security: 0.5,
        achievement: 0.5,
        power: 0.5,
        hedonism: 0.5,
        stimulation: 0.5,
        selfDirection: 0.5,
      },
      body: {
        satiety: 0.8,
        hydration: 0.8,
        sleepPressure: 0.1,
        exertion: 0.1,
        fitness: 0.5,
        health: 1,
        pain: 0,
        sleepDebtHours: 0,
        depletion: 0,
        circadianPeakMs: 54000000,
        asleep: false,
        since: 0,
        doze: {
          context: { posture: 'seated', stimulation: 0.5 },
          basis: { kind: 'authored', author: 'world', at: 0 },
        },
        bladder: { fill: 0, pending: 0 },
        injuries: [],
        illnesses: [],
        exposures: [],
      },
      needs: {
        safety: 0.8,
        belonging: 0.8,
        esteem: 0.8,
        autonomy: 0.8,
        competence: 0.8,
        leisure: 0.8,
        meaning: 0.8,
      },
      skills: [],
      heldNorms: [],
      beliefs: [],
      consequences: [],
      sourceTrust: [],
      context: { scarcity: { kind: 'unobserved' }, smoking: { kind: 'unobserved' } },
      relationships: [],
      voices: [],
      agenda: {
        exemptions: { traveling: { kind: 'unobserved' }, illnessSeverity: { kind: 'unobserved' } },
        commitments: [],
        goals: [],
        precommitments: [],
        owed: [],
      },
      family: { contactCovered: [], aptitudes: {} },
      groups: [],
      reserve: {},
      retention: { trace: 32, chronicleDays: 365 },
      habits: [],
      expectations: [],
      affect: { mood: { valence: 0, arousal: 0.5 }, regulation: 0.5, emotions: [] },
      promptings: { reading: 'none', responses: [] },
      review: { style: 'none', atMsOfDay: 72000000 },
      bonds: { courtships: [], marriages: [] },
    },
  };
  const authored = operations.createPerson(created.value, person);
  if (!authored.ok) throw new Error(JSON.stringify(authored.error));
  const other = operations.createPerson(created.value, {
    ...person,
    id: 'reader-2',
    identity: { ...person.identity, name: 'Second Reader' },
  });
  if (!other.ok) throw new Error(JSON.stringify(other.error));
  const opening = structuredClone(operations.exportRun(created.value)) as RunArchive;
  const rewoundActor = structuredClone(opening) as RunArchive;
  const reader = rewoundActor.current.people.reader;
  if (!reader) throw new Error('actor missing from archive');
  reader.memory.nextEpisode = 0;
  rewoundActor.hashes = archiveHashes(rewoundActor);
  expect(restoreCurrentRun(rewoundActor, operations).ok).toBe(false);
  const cold = restoreCurrentRun(opening, operations);
  const coldReplay = replayCurrentRun(opening, operations);
  if (!cold.ok) throw new Error(JSON.stringify(cold.error));
  if (!coldReplay.ok) throw new Error(JSON.stringify(coldReplay.error));
  expect(operations.exportRun(cold.value)).toEqual(opening);
  opening.current.world = { ...opening.current.world, hostState: { callerMutation: true } };
  const callerEpisode = opening.current.people.reader?.memory.episodes[0];
  if (!callerEpisode) throw new Error('authored episode missing');
  callerEpisode.summary = 'Caller changed this after restore.';
  expect(operations.exportRun(cold.value)).toEqual(operations.exportRun(created.value));
  expect(restoreCurrentRun(opening, operations).ok).toBe(false);
  opening.hashes = archiveHashes(opening);
  expect(restoreCurrentRun(opening, operations).ok).toBe(false);
  expect(replayCurrentRun(opening, operations).ok).toBe(false);
  const first = operations.step(created.value, {
    until: 10,
    inputs: [
      {
        id: 'world-1',
        at: 5,
        source: { type: 'host', id: 'world' },
        kind: 'world.changed',
        payload: { expectedRevision: 0, revision: 1, put: [], remove: [], hostState: { observed: 1 } },
      },
      {
        id: 'context-1',
        at: 6,
        source: { type: 'host', id: 'world' },
        kind: 'context.received',
        payload: { person: 'reader', evidenceId: 'shared-event', context: { kind: 'scarcity', value: 0.3 } },
      },
      {
        id: 'context-2',
        at: 6,
        source: { type: 'host', id: 'world' },
        kind: 'context.received',
        payload: {
          person: 'reader-2',
          evidenceId: 'shared-event',
          context: { kind: 'scarcity', value: 0.3 },
        },
      },
    ],
  });
  if (!first.ok) throw new Error(first.error.message);
  const archive = operations.exportRun(created.value);
  const staleClocks = archive.current.ownerClocks.filter(
    (clock) => clock.advancedThrough !== archive.current.at,
  );
  if (staleClocks.length) throw new Error(JSON.stringify({ at: archive.current.at, staleClocks }));
  expect(archive.current.receipts.evidence.filter((receipt) => receipt.id === 'shared-event')).toHaveLength(
    2,
  );
  const checkpointed = structuredClone(archive) as RunArchive;
  checkpointed.history = packHistory(
    actualRun.readRunHistory(checkpointed).map((transaction) => ({
      ...transaction,
      stateHash: archive.hashes.current,
      eventHash: hashCanonical('hf-run4/events', first.value.events),
    })),
  );
  checkpointed.hashes = archiveHashes(checkpointed);
  const verifiedCheckpoint = replayCurrentRun(checkpointed, operations);
  if (!verifiedCheckpoint.ok) throw new Error(JSON.stringify(verifiedCheckpoint.error));
  expect(operations.exportRun(verifiedCheckpoint.value.run)).toEqual(checkpointed);
  const restored = restoreCurrentRun(archive, operations);
  const replayed = replayCurrentRun(archive, operations);
  if (!restored.ok) throw new Error(JSON.stringify(restored.error));
  if (!replayed.ok) throw new Error(JSON.stringify(replayed.error));
  expect(replayed.value.fullHash).toBe(archive.hashes.full);
  expect(replayed.value.transactions).toBe(1);
  expect(operations.exportRun(restored.value)).toEqual(archive);
  const tampered = structuredClone(archive) as RunArchive;
  tampered.current.world = { ...tampered.current.world, hostState: { observed: 2 } };
  expect(restoreCurrentRun(tampered, operations).ok).toBe(false);
  const drifted = structuredClone(tampered) as RunArchive;
  drifted.hashes = archiveHashes(drifted);
  expect(replayCurrentRun(drifted, operations).ok).toBe(false);
  tampered.current.counters = { ...tampered.current.counters, nextEvent: 0 };
  tampered.hashes = archiveHashes(tampered);
  expect(restoreCurrentRun(tampered, operations).ok).toBe(false);
  expect(replayCurrentRun(tampered, operations).ok).toBe(false);
  const rewound = structuredClone(archive) as RunArchive;
  rewound.current.counters = { ...rewound.current.counters, nextEvent: 900 };
  rewound.hashes = archiveHashes(rewound);
  expect(restoreCurrentRun(rewound, operations).ok).toBe(false);
  const continuation = {
    until: 20,
    inputs: [
      {
        id: 'world-2',
        at: 15,
        source: { type: 'host' as const, id: 'world' },
        kind: 'world.changed' as const,
        payload: { expectedRevision: 1, revision: 2, put: [], remove: [], hostState: { observed: 3 } },
      },
      {
        id: 'context-3',
        at: 16,
        source: { type: 'host' as const, id: 'world' },
        kind: 'context.received' as const,
        payload: {
          person: 'reader',
          evidenceId: 'shared-event',
          context: { kind: 'scarcity' as const, value: 0.3 },
        },
      },
    ],
  };
  const duplicate = continuation.inputs[0];
  if (!duplicate) throw new Error('missing continuation input');
  for (const run of [created.value, restored.value, replayed.value.run]) {
    // Once-only input admission must survive reconstruction; rejection is atomic.
    const before = operations.exportRun(run);
    expect(operations.step(run, { until: 20, inputs: [{ ...duplicate, id: 'world-1' }] }).ok).toBe(false);
    expect(operations.exportRun(run)).toEqual(before);
    expect(operations.step(run, continuation).ok).toBe(true);
    expect(
      operations.exportRun(run).current.receipts.evidence.filter((receipt) => receipt.id === 'shared-event'),
    ).toHaveLength(2);
  }
  expect(operations.exportRun(restored.value)).toEqual(operations.exportRun(created.value));
  expect(operations.exportRun(replayed.value.run)).toEqual(operations.exportRun(created.value));
});
