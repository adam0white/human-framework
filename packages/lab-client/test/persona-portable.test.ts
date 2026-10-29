import { readFileSync } from 'node:fs';
import { createPerson, promise } from '@adam0white/hf-legacy';
import type { PersonAuthoring, Result, RunSpec } from '@adam0white/human-framework';
import { describe, expect, it, vi } from 'vitest';
import { canonicalCast } from '../src/cast.ts';
import {
  claimCastChapter,
  claimCastChapterBatch,
  preparePersonaLife,
  projectCastClaimTransfer,
} from '../src/life.ts';
import { createPersona } from '../src/persona.ts';
import { admitPortablePerson, claimPortablePerson, projectPortablePerson } from '../src/persona-portable.ts';
import { PORTABLE_READERS } from '../src/portable-readers.ts';

const castId = 'hf.cast.burak.stairwell';
const actor = () =>
  createPerson({
    id: castId,
    name: 'Burak',
    bornAt: -31 * 525960,
    sex: 'male',
    seed: 9,
    traits: canonicalCast(castId).traits,
    values: canonicalCast(castId).values,
  });
const project = (person = actor()) =>
  projectPortablePerson({
    castId,
    game: 'commonstead',
    engine: '2.23.0',
    person,
    history: ['Worked with the workshop residents.'],
  });

describe('portable shelf contract', () => {
  it('binds a carried person and history to a registry role and refuses before replacing any input', async () => {
    const person = actor();
    person.body.satiety = 0.41;
    const p = await createPersona({
      format: 'hf-persona/1',
      castId,
      castRevision: '1',
      branchId: 'portable-control',
      parentRevision: null,
      source: { game: 'commonstead', engine: '2.23.0', build: 'control', rules: 'portable-1' },
      transfer: project(person),
      limitations: [],
    });
    const frozen = structuredClone(p);
    const opening = actor();
    expect(admitPortablePerson(p, 'commonstead', opening).body.satiety).toBe(0.41);
    expect(opening.body.satiety).toBe(0.8);
    expect(p).toEqual(frozen);
    expect(() =>
      projectPortablePerson({
        castId: 'hf.cast.selin.voice',
        game: 'days',
        engine: '4.3.0',
        person,
        history: [],
      }),
    ).toThrow(/authored chapter/);
    expect(() =>
      admitPortablePerson(
        { ...p, transfer: { ...p.transfer, castPassport: 'hf-portable-person/99' } },
        'commonstead',
        opening,
      ),
    ).toThrow();
    expect(() =>
      projectPortablePerson({
        castId,
        game: 'commonstead',
        engine: '2.23.0',
        person,
        history: [],
        hostObligations: ['Unfinished shared building'],
      }),
    ).toThrow(/unfinished responsibilities/);
    expect(p).toEqual(frozen);
  });
  it('carries Selin from Voice into her Good Hands role', async () => {
    const id = 'hf.cast.selin.voice';
    const person = createPerson({
      id: 'selin',
      name: 'Selin',
      bornAt: -32 * 525960,
      sex: 'female',
      seed: 9,
      traits: canonicalCast(id).traits,
      values: canonicalCast(id).values,
    });
    person.body.satiety = 0.41;
    const transfer = projectPortablePerson({
      castId: id,
      game: 'voice',
      engine: '2.23.0',
      person,
      history: ['Called Halil.'],
    });
    const parent = await createPersona({
      format: 'hf-persona/1',
      castId: id,
      castRevision: canonicalCast(id).revision,
      branchId: 'voice-control',
      parentRevision: null,
      source: { game: 'voice', engine: '2.23.0', build: 'control', rules: 'portable-1' },
      transfer,
      limitations: [],
    });
    const opening = createPerson({
      id: 'selin-voice',
      name: 'Selin',
      bornAt: -32 * 525960,
      sex: 'female',
      seed: 10,
      traits: canonicalCast(id).traits,
      values: canonicalCast(id).values,
    });
    expect(admitPortablePerson(parent, 'goodhands', opening).body.satiety).toBe(0.41);
    const readers = PORTABLE_READERS as Record<string, { client: string; perPersonSkips: boolean }>;
    const ready = readers.goodhands;
    try {
      delete readers.goodhands;
      expect(() => claimPortablePerson(parent, 'voice')).toThrow(/read-only.*goodhands/);
      readers.goodhands = { client: '0.5.5', perPersonSkips: true };
      expect(claimPortablePerson(parent, 'voice').portableClaim).toStrictEqual({ game: 'voice' });
      expect(parent.transfer.portableClaim).toBeUndefined();
    } finally {
      if (ready) readers.goodhands = ready;
    }
  });
  it('locks projected arrivals until a genuine current-actor departure succeeds', async () => {
    const parent = await createPersona({
      format: 'hf-persona/1',
      castId,
      castRevision: '1',
      branchId: 'claim-control',
      parentRevision: null,
      source: { game: 'commonstead', engine: '2.23.0', build: 'control', rules: 'portable-1' },
      transfer: project(),
      limitations: [],
    });
    const source = { ...parent.source, game: 'commonstead', engine: '2.23.0' };
    const arrival = projectPortablePerson({
      castId,
      game: 'commonstead',
      engine: '2.23.0',
      person: actor(),
      history: [],
      previous: parent,
    });
    const input = preparePersonaLife(parent, 3600000);
    const receiving = { ...source, game: 'days', engine: '4.0.0' };
    const shelf = {
      async request<T>(request: import('../src/persona.ts').PersonaRequest) {
        if (request.action === 'prepare') return input as T;
        if (request.action === 'prepareBatch')
          return {
            expectedHeads: { [castId]: parent.revision },
            inputs: [input],
            blocked: [],
          } as T;
        return undefined as T;
      },
    };
    const single = await claimCastChapter(shelf, castId, receiving, async () =>
      admitPortablePerson(parent, receiving.game, actor()),
    );
    const defaultBatch = await claimCastChapterBatch(shelf, [castId], receiving, async () =>
      admitPortablePerson(parent, receiving.game, actor()),
    );
    for (const claim of [single?.claim, defaultBatch?.claims[0]]) {
      if (!claim) throw new Error('The copied arrival was not claimed.');
      expect(claim.source).toEqual(parent.source);
      expect(claim.transfer.portableClaim).toEqual({ game: receiving.game });
      expect(() => admitPortablePerson(claim, 'commonstead', actor())).toThrow();
      expect(() => admitPortablePerson(claim, 'days', actor())).toThrow(/receiving chapter/);
    }
    const held = single?.claim;
    if (!held) throw new Error('Missing held arrival');
    const skipped = await claimCastChapterBatch(
      {
        async request<T>(request: import('../src/persona.ts').PersonaRequest) {
          if (request.action === 'prepareBatch')
            return {
              expectedHeads: { [castId]: held.revision },
              inputs: [preparePersonaLife(held, 3600000)],
              blocked: [],
            } as T;
          return undefined as T;
        },
      },
      [castId],
      source,
      async (available) => {
        expect(available).toEqual([]);
        return 'local opening';
      },
    );
    expect(skipped?.claims).toEqual([]);
    expect(skipped?.blocked).toEqual([{ castId, reason: expect.stringContaining('Days') }]);
    const result = await claimCastChapterBatch(
      {
        async request<T>(request: import('../src/persona.ts').PersonaRequest) {
          if (request.action === 'prepareBatch')
            return {
              expectedHeads: { [castId]: parent.revision },
              inputs: [input],
              blocked: [],
            } as T;
          return undefined as T;
        },
      },
      [castId],
      source,
      async () => arrival,
      { claimTransfer: (initial) => initial },
    );
    const claimed = result?.claims[0];
    if (!claimed) throw new Error('The portable arrival was not claimed.');
    expect(() => admitPortablePerson(claimed, 'days', actor())).toThrow(/receiving chapter/);
    expect(() => projectCastClaimTransfer(claimed, { ...source, game: 'days' }, arrival, input.life)).toThrow(
      /still belongs/,
    );
    expect(() =>
      projectPortablePerson({
        castId,
        game: 'commonstead',
        engine: '2.23.0',
        person: actor(),
        history: [],
        previous: claimed,
        hostObligations: ['Unfinished delivery'],
      }),
    ).toThrow(/unfinished responsibilities/);
    expect(() => admitPortablePerson(claimed, 'days', actor())).toThrow();
    const departed = {
      ...claimed,
      transfer: projectPortablePerson({
        castId,
        game: 'commonstead',
        engine: '2.23.0',
        person: actor(),
        history: ['Finished the chapter.'],
        previous: claimed,
      }),
    };
    expect(() => admitPortablePerson(departed, 'days', actor())).not.toThrow();
  });
  it('refuses all recurring chain states, precommitments and clinical injuries', () => {
    const person = actor();
    const duty = promise(person, {
      kind: 'promise',
      actions: ['rest'],
      from: 0,
      until: 60,
      importance: 0.5,
      recurEvery: 1440,
    });
    for (const status of ['pending', 'kept', 'broken', 'released'] as const) {
      duty.status = status;
      expect(() => project(person)).toThrow(/cannot continue/);
    }
    person.agenda.commitments = [];
    person.will.precommitments.push({} as never);
    expect(() => project(person)).toThrow(/cannot continue/);
    person.will.precommitments = [];
    person.body.injuries.push({} as never);
    expect(() => project(person)).toThrow(/cannot continue/);
  });
  it('refuses an active mourning period and permits its retained record after the source deadline', () => {
    const person = actor();
    person.bonds = {
      courtships: [],
      marriages: [{ spouseId: 'former-spouse', since: -100, endedAt: -10, end: 'widowed' }],
      mourning: { forId: 'former-spouse', since: -10, until: 1 },
    };
    expect(() => project(person)).toThrow(/cannot continue/);
    person.now = 1;
    expect(() => project(person)).not.toThrow();
  });
});

it('carries retained Stairwell history through an authored opening and replay', async () => {
  const {
    createPerson: createModernPerson,
    createRun,
    exportRun,
    replay,
  } = await import('@adam0white/human-framework');
  const fixture = JSON.parse(
    readFileSync(new URL('./fixtures/retained-authoring.json', import.meta.url), 'utf8'),
  ) as { spec: RunSpec; person: PersonAuthoring };
  const need = <T>(result: Result<T>): T => {
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
  };
  const spec = structuredClone(fixture.spec);
  const source = structuredClone(fixture.person);
  source.identity.castId = castId;
  source.biography = [
    {
      id: 'e0',
      at: spec.start - 1000,
      kind: 'observation',
      valence: 0.2,
      salience: 0.8,
      summary: 'Checked the stair rail.',
      tags: ['stairs'],
      basis: { kind: 'authored', author: 'world' },
      provenance: ['rail-check'],
    },
  ];
  source.state.beliefs = [
    { prop: 'rail-safe', logOdds: 1.3, updatedAt: spec.start - 500, sources: [{ id: 'world', value: true }] },
  ];
  source.state.sourceTrust = [{ sourceId: 'world', trust: 0.7 }];
  source.state.agenda.commitments = [
    {
      id: 'rail-duty',
      kind: 'duty',
      actions: ['work'],
      from: spec.start,
      until: spec.start + 60000,
      importance: 0.8,
    },
  ];
  const day = spec.definitions.calendar.days[0];
  if (!day) throw new Error('Missing source calendar day');
  day.windows = [{ commitmentId: 'rail-duty', from: spec.start, until: spec.start + 60000 }];
  const run = need(createRun(spec));
  need(createModernPerson(run, source));
  const transfer = projectPortablePerson({
    castId,
    game: 'stairwell',
    engine: '4.4.0',
    person: exportRun(run).current.people.burak,
    calendar: { definition: spec.definitions.calendar, norms: spec.definitions.norms },
    history: ['Worked on the stairs.'],
  });
  expect(transfer.castPassport).toBe('hf-portable-person/2');
  const parent = await createPersona({
    format: 'hf-persona/1',
    castId,
    castRevision: '1',
    branchId: 'retained-control',
    parentRevision: null,
    source: { game: 'stairwell', engine: '4.4.0', build: 'control', rules: 'portable-2' },
    transfer,
    limitations: [],
  });
  const opening = structuredClone(fixture.person);
  opening.identity.castId = castId;
  const mapping = { offsetMs: 0, references: [] };
  const before = structuredClone(parent);
  expect(() => admitPortablePerson(parent, 'stairwell', opening)).toThrow(/mapped authored/);
  expect(() => admitPortablePerson(parent, 'stairwell', actor(), mapping)).toThrow();
  expect(() => admitPortablePerson(parent, 'stairwell', { ...opening, id: 'tarik' }, mapping)).toThrow();
  expect(() =>
    admitPortablePerson(
      parent,
      'stairwell',
      { ...opening, identity: { ...opening.identity, castId: 'wrong' } },
      mapping,
    ),
  ).toThrow();
  expect(() =>
    admitPortablePerson(
      { ...parent, transfer: { ...transfer, castPassport: 'hf-portable-person/1' } },
      'stairwell',
      opening,
      mapping,
    ),
  ).toThrow();
  expect(() =>
    admitPortablePerson(
      { ...parent, transfer: { ...transfer, portableClaim: { game: 'stairwell' } } },
      'stairwell',
      opening,
      mapping,
    ),
  ).toThrow(/receiving chapter/);
  const admitted = admitPortablePerson(parent, 'stairwell', opening, mapping);
  const target = need(createRun(spec));
  need(createModernPerson(target, admitted));
  const archive = exportRun(target);
  expect(archive.current.people.burak?.memory.episodes[0]?.summary).toBe('Checked the stair rail.');
  expect(archive.current.people.burak?.memory.beliefs[0]?.logOdds).toBe(1.3);
  expect(archive.current.people.burak?.memory.sourceTrust.world).toBe(0.7);
  expect(archive.current.people.burak?.agenda.commitments[0]?.id).toBe('rail-duty');
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
  expect(parent).toEqual(before);
});

it('continues Aylin from Murmur into Good Hands through the existing v2 shelf format', async () => {
  const {
    createPerson: createModernPerson,
    createRun,
    inspect,
    exportRun,
    replay,
  } = await import('@adam0white/human-framework');
  const fixture = JSON.parse(
    readFileSync(new URL('./fixtures/retained-authoring.json', import.meta.url), 'utf8'),
  ) as { spec: RunSpec; person: PersonAuthoring };
  const need = <T>(result: Result<T>): T => {
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
  };
  const id = 'hf.cast.aylin.murmur',
    cast = canonicalCast(id);
  const spec = structuredClone(fixture.spec);
  spec.host.id = 'murmur';
  spec.definitions.sources = spec.definitions.sources.map((source) =>
    source.type === 'host' ? { ...source, id: 'murmur' } : source,
  );
  const source = structuredClone(fixture.person);
  source.id = 'aylin';
  source.identity.castId = id;
  source.biography = [
    {
      id: 'e0',
      at: spec.start - 1000,
      kind: 'observation',
      valence: 0.2,
      salience: 0.8,
      summary: 'Aylin spoke with her sister.',
      tags: ['family'],
      basis: { kind: 'authored', author: 'murmur' },
      provenance: ['family-note'],
    },
  ];
  const run = need(createRun(spec));
  need(createModernPerson(run, source));
  const projection = need(
    inspect(run, {
      perspective: { kind: 'host' },
      people: ['aylin'],
      select: ['persona'],
      portable: { person: 'aylin', castId: id, castRevision: cast.revision },
    }),
  );
  const person = projection.people[0]?.parts[0];
  if (person?.select !== 'persona' || !('format' in person.value)) throw new Error('Missing v2 person');
  const portable = person.value;
  expect(portable.version).toBe(2);
  const parent = await createPersona({
    format: 'hf-persona/1',
    castId: id,
    castRevision: cast.revision,
    branchId: 'murmur-goodhands-control',
    parentRevision: null,
    source: { game: 'murmur', engine: portable.source.engine, build: 'control', rules: 'portable-2' },
    transfer: { castPassport: 'hf-portable-person/2', portable },
    limitations: [],
  });
  const prepared = preparePersonaLife(parent, 0);
  expect(prepared.parent).toEqual(parent);
  const opening = structuredClone(fixture.person);
  opening.id = 'aylin';
  opening.identity.castId = id;
  const admitted = admitPortablePerson(parent, 'goodhands', opening, { offsetMs: 0, references: [] });
  const target = need(createRun(fixture.spec));
  need(createModernPerson(target, admitted));
  const archive = exportRun(target);
  expect(archive.current.people.aylin?.memory.episodes[0]?.summary).toBe('Aylin spoke with her sister.');
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});

// Simulated live peers isolate projection and ownership from deployment state.
vi.mock('../src/portable-readers.ts', async () => {
  const { CANONICAL_CAST } = await import('../src/cast.ts');
  return {
    PORTABLE_READERS: Object.fromEntries(
      CANONICAL_CAST.flatMap((person) => person.games).map((game) => [
        game,
        { client: '0.5.5', perPersonSkips: true },
      ]),
    ),
  };
});
