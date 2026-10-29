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
  step,
} from '../src/index.ts';
import {
  actor,
  authoredPerson,
  exampleOffers,
  exampleSpec,
  need,
  openingInputs,
  START,
  setup,
} from './support.ts';

function source(actionId = 'work') {
  const spec = exampleSpec();
  spec.definitions.norms = structuredClone(DEFAULT_NORMS);
  spec.definitions.actions = spec.definitions.actions.map((a) =>
    a.id === 'work' ? { ...a, id: actionId } : a,
  );
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
    { key: actionId, needs: { competence: 0.1 }, successRate: 0.7, samples: 3, valence: 0.2 },
  ];
  person.biography = [
    {
      id: 'e0',
      at: START - 200,
      kind: 'outcome',
      action: actionId,
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
      actions: [actionId],
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
      actions: [actionId],
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
  const { run: sourceRun, passport } = source();
  expect(actor(sourceRun, 'ada').lastAction).toBe('work');
  expect(passport.version).toBe(2);
  expect(passport.retained?.calendar.norms.find((n) => n.id === 'salah')?.provenance.kind).toBe('religious');
  const { spec, opening } = destination(passport),
    before = structuredClone(opening);
  const run = need(createRun(spec));
  need(createPerson(run, opening));
  expect(opening).toEqual(before);
  const arrived = actor(run, 'guest');
  expect(arrived.lastAction).toBe('help');
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

test('retained expectations resolve complete action IDs containing @ before targeted keys', () => {
  const { passport } = source('work@stairs');
  if (passport.version !== 2) throw Error('expected retained passport');
  passport.retained.memory.expectations.push({
    ...passport.retained.memory.expectations[0]!,
    key: 'work@stairs@ada',
  });
  const { spec, opening } = destination(passport);
  spec.definitions.actions = spec.definitions.actions.map((a) =>
    a.id === 'help' ? { ...a, id: 'help@landing' } : a,
  );
  opening.portable!.mapping.references = [
    { kind: 'action', source: 'work@stairs', target: 'help@landing' },
    { kind: 'source', source: 'world', target: 'third-world' },
  ];
  const run = need(createRun(spec));
  need(createPerson(run, opening));
  expect(actor(run, 'guest').memory.expectations.map((e) => e.key)).toEqual([
    'help@landing',
    'help@landing@guest',
  ]);
  const archive = exportRun(run);
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

test('future retained recall refuses atomically while a present recall restores and replays', () => {
  const { passport } = source();
  if (passport.version !== 2) throw Error('expected retained passport');
  passport.retained.memory.episodes[0]!.recalledAt = passport.retained.at + 1;
  const { spec, opening } = destination(passport);
  const run = need(createRun(spec)),
    before = exportRun(run).hashes.full;
  expect(createPerson(run, opening).ok).toBe(false);
  expect(exportRun(run).hashes.full).toBe(before);
  passport.retained.memory.episodes[0]!.recalledAt = passport.retained.at;
  need(createPerson(run, opening));
  const archive = exportRun(run);
  expect(exportRun(need(restoreRun(JSON.parse(JSON.stringify(archive))))).hashes).toEqual(archive.hashes);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
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
  opening.identity.birthAt = -500000000000;
  opening.identity.sex = passport.retained.sex === 'female' ? 'male' : 'female';
  const originalIdentity = structuredClone(opening.identity);
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
  const initialArchive = exportRun(run);
  expect(opening.identity).toEqual(originalIdentity);
  expect(initialArchive.initial.people[0]?.identity.birthAt).toBe(arrival.life.bornAt);
  expect(initialArchive.initial.people[0]?.identity.sex).toBe(passport.retained.sex);
  expect(exportRun(need(restoreRun(JSON.parse(JSON.stringify(initialArchive))))).hashes).toEqual(
    initialArchive.hashes,
  );
  need(step(run, { until: START + 1000, inputs: [] }));
  const archive = exportRun(run);
  expect(exportRun(need(restoreRun(JSON.parse(JSON.stringify(archive))))).hashes).toEqual(archive.hashes);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
  expect(() => projectPortablePerson({ ...input, legacyNormProvenance: undefined })).toThrow();
  expect(() => projectPortablePerson({ ...input, engine: '2.21.0' })).toThrow();
  const divergent = structuredClone(native.sourceNorms);
  divergent[0].label = 'An unsourced replacement claim';
  expect(() => projectPortablePerson({ ...input, legacyNormCatalogue: divergent })).toThrow();
});

test('legacy optional exemption expiry converts minutes before shifted admission', () => {
  const native = JSON.parse(
    readFileSync(new URL('./fixtures/portable-legacy-2.23.json', import.meta.url), 'utf8'),
  );
  // A bounded legacy optional-field control; the actual native fixture is unchanged.
  native.person.agenda.exemptions = {
    traveling: { kind: 'known', value: true, evidenceIds: ['trip-legacy'] },
    illnessSeverity: { kind: 'unobserved' },
    validUntil: 1060,
  };
  const passport = projectPortablePerson({
    castId: 'cast.legacy',
    castRevision: '1',
    game: 'legacy-source',
    engine: native.engineVersion,
    person: native.person,
    history: [],
    calendar: { definition: exampleSpec().definitions.calendar, norms: DEFAULT_NORMS },
    legacyNormProvenance: Object.fromEntries(DEFAULT_NORMS.map((n) => [n.id, n.provenance])),
    legacyNormCatalogue: native.sourceNorms,
  });
  if (passport.version !== 2) throw Error('missing retained projection');
  expect(passport.retained.agenda.exemptions.validUntil).toBe(63600000);
  const spec = exampleSpec();
  spec.definitions.norms = structuredClone(DEFAULT_NORMS);
  spec.definitions.sources = [...spec.definitions.sources, { type: 'person', id: 'neighbor' }];
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
  expect(actor(run, 'arrival').agenda.exemptions).toMatchObject({
    traveling: { kind: 'known', value: true, evidenceIds: ['trip-legacy'] },
    validUntil: START + 3600000,
  });
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
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

test('runtime portable arrival preserves prior history and refuses invalid admission atomically', () => {
  const { passport } = source();
  passport.history = [{ game: 'prior-world', summary: 'Finished the earlier repair.' }];
  passport.omittedHistory = 3;
  const { spec, opening } = destination(passport);
  const run = need(createRun(spec));
  need(createPerson(run, authoredPerson('resident', 'Resident')));
  need(step(run, { until: START + 1000, inputs: [] }));
  opening.portable!.mapping.offsetMs = 0;
  const input = {
    id: 'retained-arrival',
    at: START + 1001,
    source: { type: 'host' as const, id: spec.host.id },
    kind: 'person.arrived' as const,
    payload: { authored: opening, arrivalEvidenceId: 'accepted-job' },
  };
  const before = exportRun(run);
  const future = structuredClone(input);
  future.payload.authored.portable!.mapping.offsetMs = 1002;
  expect(step(run, { until: START + 1001, inputs: [future] }).ok).toBe(false);
  expect(exportRun(run)).toEqual(before);
  const malformed = structuredClone(input);
  malformed.payload.authored.portable!.person.castId = 'not a valid id';
  expect(step(run, { until: START + 1001, inputs: [malformed] }).ok).toBe(false);
  expect(exportRun(run)).toEqual(before);
  const invalid = structuredClone(input);
  invalid.payload.authored.portable!.mapping.references = [];
  expect(step(run, { until: START + 1001, inputs: [invalid] }).ok).toBe(false);
  expect(exportRun(run)).toEqual(before);
  need(step(run, { until: START + 1001, inputs: [input] }));
  expect(actor(run, 'guest').memory.beliefs[0]?.prop).toBe('stairs-safe');
  expect(actor(run, 'guest').agenda.commitments[0]).toMatchObject({
    from: START,
    until: START + 60000,
    status: 'pending',
  });
  const query = {
    perspective: { kind: 'host' as const },
    people: ['guest'],
    select: ['persona' as const],
    portable: { person: 'guest', castId: 'cast.ada', castRevision: '1' },
  };
  const projected = need(inspect(run, query)).people[0];
  if (projected?.kind !== 'host') throw Error('missing host');
  const part = projected.parts.find((p) => p.select === 'persona');
  if (part?.select !== 'persona') throw Error('missing passport');
  expect(part.value.history).toEqual(passport.history);
  expect(part.value.omittedHistory).toBe(3);
  expect(inspect(run, { ...query, portable: { ...query.portable, castId: 'forged' } }).ok).toBe(false);
  const queued = structuredClone(input);
  queued.id = 'not-yet-arrived';
  queued.at = START + 2000;
  queued.payload.authored.portable!.person.castId = 'forged';
  const deciding = openingInputs([{ id: 'resident', offers: exampleOffers('resident') }]).map((entry) => ({
    ...entry,
    at: START + 1002,
    source: { type: 'host' as const, id: spec.host.id },
  }));
  const boundary = need(step(run, { until: START + 2000, inputs: [...deciding, queued] }));
  expect(boundary.at).toBe(START + 1002);
  need(inspect(run, query));
  const archive = exportRun(run);
  const restored = need(restoreRun(JSON.parse(JSON.stringify(archive))));
  expect(exportRun(restored)).toEqual(archive);
  expect(inspect(restored, query)).toEqual(inspect(run, query));
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
  const late = need(createRun(spec));
  need(step(late, { until: START + 61000, inputs: [] }));
  need(step(late, { until: START + 61001, inputs: [{ ...input, at: START + 61001 }] }));
  expect(actor(late, 'guest').agenda.commitments[0]).toMatchObject({
    from: START,
    until: START + 60000,
    status: 'pending',
  });
  expect(need(replay(exportRun(late))).verified).toBe(true);
});
