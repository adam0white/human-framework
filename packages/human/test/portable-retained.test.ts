import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import {
  createPerson,
  createRun,
  DEFAULT_NORMS,
  exportRun,
  inspect,
  type PortablePerson,
  projectPortablePerson,
  replay,
  restoreRun,
} from '../src/index.ts';
import { actor, authoredPerson, exampleSpec, need, START, setup } from './support.ts';

function source() {
  const spec = exampleSpec();
  spec.definitions.norms = structuredClone(DEFAULT_NORMS);
  const person = authoredPerson('ada', 'Ada');
  person.identity.castId = 'cast.ada';
  person.state.beliefs = [
    {
      prop: 'stairs-safe',
      logOdds: 1.2,
      updatedAt: START - 100,
      sources: [{ id: 'world', value: true }],
      provenance: { origin: 'world', firstFrom: 'world', at: START - 100, lineage: 'inspection-1' },
    },
  ];
  person.state.sourceTrust = [{ sourceId: 'world', trust: 0.7 }];
  person.state.agenda.exemptions = {
    traveling: { kind: 'known', value: true, evidenceIds: ['trip-1'] },
    illnessSeverity: { kind: 'unobserved' },
    validUntil: START + 120000,
  };
  const prayer = DEFAULT_NORMS.find((n) => n.id === 'salah');
  if (!prayer) throw Error('missing researched prayer norm');
  person.state.heldNorms = [
    {
      normId: 'salah',
      standing: 'obligatory',
      conviction: 0.8,
      provenance: structuredClone(prayer.provenance),
    },
  ];
  person.state.expectations = [
    { key: 'work', needs: { competence: 0.1 }, successRate: 0.7, samples: 3, valence: 0.2 },
  ];
  person.biography = [
    {
      id: 'e0',
      at: START - 200,
      kind: 'outcome',
      action: 'work',
      actorId: 'ada',
      valence: 0.3,
      salience: 0.6,
      summary: 'I finished the earlier repair.',
      tags: ['completed'],
      basis: { kind: 'authored', author: 'world' },
      provenance: ['repair-1'],
    },
  ];
  person.state.agenda.commitments = [
    {
      id: 'c3',
      kind: 'duty',
      actions: ['work'],
      from: START,
      until: START + 60000,
      importance: 0.8,
      normId: 'salah',
    },
  ];
  person.state.agenda.owed = [
    {
      ofId: 'old-prayer',
      kind: 'worship',
      actions: ['work'],
      reason: 'missed',
      at: START - 1000,
      normId: 'salah',
    },
  ];
  const run = setup([person], spec);
  const reading = need(
    inspect(run, {
      perspective: { kind: 'host' },
      people: ['ada'],
      select: ['persona', 'calendar'],
      portable: { person: 'ada', castId: 'cast.ada', castRevision: '1' },
    }),
  );
  const part = reading.people[0];
  if (part?.kind !== 'host') throw Error('missing host projection');
  const portable = part.parts.find((p) => p.select === 'persona');
  if (portable?.select !== 'persona') throw Error('missing portable projection');
  return { run, spec, passport: structuredClone(portable.value) as PortablePerson };
}
function destination(passport: PortablePerson) {
  const spec = exampleSpec(42);
  spec.id = 'third-world';
  spec.host = { id: 'third-world', edition: 'third-world-1', schema: 'third-world-1' };
  spec.definitions.sources = [
    { type: 'host', id: 'third-world' },
    { type: 'voice', id: 'player' },
  ];
  spec.definitions.actions = spec.definitions.actions.map((a) =>
    a.id === 'work' ? { ...a, id: 'help' } : a,
  );
  spec.definitions.norms = structuredClone(DEFAULT_NORMS);
  const opening = authoredPerson('guest', 'Guest');
  opening.portable = {
    person: passport,
    mapping: {
      offsetMs: 0,
      references: [
        { kind: 'action', source: 'work', target: 'help' },
        { kind: 'source', source: 'world', target: 'third-world' },
      ],
    },
  };
  return { spec, opening };
}

test('supported public projection admits remembered beliefs, trust, duties and sourced calendar into a third world and replays', () => {
  const { passport } = source();
  expect(passport.version).toBe(2);
  expect(passport.retained?.calendar.norms.find((n) => n.id === 'salah')?.provenance.kind).toBe('religious');
  const { spec, opening } = destination(passport),
    before = structuredClone(opening);
  const run = need(createRun(spec));
  need(createPerson(run, opening));
  expect(opening).toEqual(before);
  const arrived = actor(run, 'guest');
  expect(arrived.memory.beliefs[0]).toMatchObject({
    prop: 'stairs-safe',
    logOdds: 1.2,
    sources: [{ id: 'third-world', value: true }],
    provenance: { origin: 'third-world', firstFrom: 'third-world', lineage: 'inspection-1' },
  });
  expect(arrived.memory.sourceTrust).toEqual({ 'third-world': 0.7 });
  expect(arrived.agenda.exemptions).toEqual({
    traveling: { kind: 'known', value: true, evidenceIds: ['trip-1'] },
    illnessSeverity: { kind: 'unobserved' },
    validUntil: START + 120000,
  });
  expect(arrived.memory.episodes[0]).toMatchObject({
    id: 'e0',
    actorId: 'guest',
    action: 'help',
    summary: 'I finished the earlier repair.',
  });
  expect(arrived.memory.expectations[0]?.key).toBe('help');
  expect(arrived.agenda.commitments[0]).toMatchObject({
    id: 'c3',
    status: 'pending',
    actions: ['help'],
    normId: 'salah',
  });
  expect(arrived.agenda.owed[0]).toMatchObject({ ofId: 'old-prayer', actions: ['help'], normId: 'salah' });
  const archive = exportRun(run);
  expect(exportRun(need(restoreRun(JSON.parse(JSON.stringify(archive))))).hashes).toEqual(archive.hashes);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});

test('missing action map, changed norm provenance, cast mismatch and memory counter rewind refuse atomically', () => {
  const { passport } = source();
  for (const change of ['action', 'norm', 'cast', 'counter', 'collision'] as const) {
    const { spec, opening } = destination(passport);
    if (change === 'action' && opening.portable)
      opening.portable.mapping.references = opening.portable.mapping.references.filter(
        (x) => x.kind !== 'action',
      );
    if (change === 'norm')
      spec.definitions.norms = spec.definitions.norms.map((n) =>
        n.id === 'salah' ? { ...n, label: 'Changed understanding' } : n,
      );
    if (change === 'cast') opening.identity.castId = 'other-cast';
    if (change === 'collision' && opening.portable)
      opening.portable.mapping.references = [
        ...opening.portable.mapping.references,
        { kind: 'source', source: 'other', target: 'third-world' },
      ];
    if (change === 'counter' && opening.portable?.person.retained)
      opening.portable.person.retained.memory.nextEpisode = 0;
    const run = need(createRun(spec)),
      before = exportRun(run).hashes.full;
    expect(createPerson(run, opening).ok, change).toBe(false);
    expect(exportRun(run).hashes.full).toBe(before);
    need(createPerson(run, authoredPerson('guest', 'Unchanged opening')));
  }
});

test('unsupported active work refuses projection without changing the run and a calm control succeeds', () => {
  const run = setup();
  const before = exportRun(run).hashes.full;
  const query = {
    perspective: { kind: 'host' as const },
    people: ['ada'],
    select: ['persona' as const],
    portable: { person: 'ada', castId: 'ada', castRevision: '1' },
  };
  expect(inspect(run, query).ok).toBe(true);
  expect(exportRun(run).hashes.full).toBe(before);
  const person = authoredPerson('ada', 'Ada');
  person.state.agenda.precommitments = [
    { id: 'pre1', action: 'work', bias: 0.3, fromMsOfDay: 0, toMsOfDay: 86399999 },
  ];
  const active = setup([person]),
    activeBefore = exportRun(active).hashes.full;
  expect(inspect(active, query).ok).toBe(false);
  expect(exportRun(active).hashes.full).toBe(activeBefore);
});

// Captured from actual @adam0white/human-framework@3.0.0 (engine 2.23.0)
// using createPerson, heldNorms, promise, seedSourceTrust, seedBelief, remember,
// snapshot and restore. This fixture has no HF4-manufactured legacy state.
test('actual native legacy source retains age, minute-based prayer duty, belief, trust and memory through a shifted arrival', () => {
  const native = JSON.parse(
    readFileSync(new URL('./fixtures/portable-legacy-2.23.json', import.meta.url), 'utf8'),
  );
  const spec = exampleSpec();
  spec.definitions.norms = structuredClone(DEFAULT_NORMS);
  spec.definitions.sources = [...spec.definitions.sources, { type: 'person', id: 'neighbor' }];
  const input = {
    castId: 'cast.legacy',
    castRevision: '1',
    game: 'legacy-source',
    engine: native.engineVersion,
    person: native.person,
    history: [],
    calendar: { definition: spec.definitions.calendar, norms: DEFAULT_NORMS },
    legacyNormProvenance: Object.fromEntries(DEFAULT_NORMS.map((n) => [n.id, n.provenance])),
    legacyNormCatalogue: native.sourceNorms,
  };
  const passport = projectPortablePerson(input);
  if (passport.version !== 2) throw Error('missing retained projection');
  expect(passport.retained.at).toBe(60000000);
  expect(passport.retained.bornAt).toBe(native.person.life.bornAt * 60000);
  const opening = authoredPerson('arrival', 'Arrival');
  opening.portable = {
    person: passport,
    mapping: {
      offsetMs: START - passport.retained.at,
      references: [{ kind: 'action', source: 'pray', target: 'work' }],
    },
  };
  const run = need(createRun(spec));
  need(createPerson(run, opening));
  const arrival = actor(run, 'arrival');
  expect(arrival.now - arrival.life.bornAt).toBe((native.person.now - native.person.life.bornAt) * 60000);
  expect(arrival.agenda.commitments[0]).toMatchObject({
    id: 'c1',
    kind: 'worship',
    status: 'pending',
    from: START,
    until: START + 3600000,
    actions: ['work'],
    normId: 'salah',
  });
  expect(arrival.memory.beliefs[0]).toMatchObject({
    prop: 'well:open',
    logOdds: native.person.memory.beliefs[0].logOdds,
    updatedAt: START,
  });
  expect(arrival.memory.sourceTrust).toEqual({ neighbor: 0.7 });
  expect(arrival.memory.episodes[0]).toMatchObject({
    id: 'e0',
    at: START - 600000,
    summary: 'Visited the well.',
  });
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
  expect(() => projectPortablePerson({ ...input, legacyNormProvenance: undefined })).toThrow();
  expect(() => projectPortablePerson({ ...input, engine: '2.21.0' })).toThrow();
  const divergent = structuredClone(native.sourceNorms);
  divergent[0].label = 'An unsourced replacement claim';
  expect(() => projectPortablePerson({ ...input, legacyNormCatalogue: divergent })).toThrow();
});

test('released approximate v1 still accepts an actual quiet native legacy shape with optional stores absent', () => {
  const native = JSON.parse(
    readFileSync(new URL('./fixtures/portable-legacy-2.23.json', import.meta.url), 'utf8'),
  );
  // The source duty is released explicitly in this source fixture control. Optional
  // gists and contradiction stores remain absent exactly as the source emitted them.
  native.person.agenda.commitments[0].status = 'released';
  const passport = projectPortablePerson({
    castId: 'cast.legacy',
    castRevision: '1',
    game: 'legacy-source',
    engine: native.engineVersion,
    person: native.person,
    history: ['Approximate arrival; the full source memory remains archived.'],
  });
  expect(passport.version).toBe(1);
  expect(passport.history[0]?.summary).toContain('full source memory remains archived');
});
