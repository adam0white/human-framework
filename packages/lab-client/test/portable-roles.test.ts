import { createPerson } from '@adam0white/hf-legacy';
import { expect, it, vi } from 'vitest';
import { canonicalCast } from '../src/cast.ts';
import { claimCastChapterBatch, preparePersonaLife } from '../src/life.ts';
import { createPersona } from '../src/persona.ts';
import {
  admitPortablePerson,
  claimPortablePerson,
  portablePersonRole,
  portableWriteBlockers,
  projectPortablePerson,
} from '../src/persona-portable.ts';
import { PORTABLE_READERS } from '../src/portable-readers.ts';

// Synthetic bodies isolate binding from biography. No second cast table or actor matrix.
function actor(castId: string, id: string) {
  const cast = canonicalCast(castId);
  return createPerson({
    id,
    name: cast.name,
    bornAt: -cast.age * 525960,
    sex: 'male',
    seed: 9,
    traits: cast.traits,
    values: cast.values,
  });
}
async function departure(game: string, castId: string, id: string) {
  const person = actor(castId, id);
  person.body.satiety = 0.41;
  return createPersona({
    format: 'hf-persona/1',
    castId,
    castRevision: canonicalCast(castId).revision,
    branchId: `bridge-${game}-${id}`,
    parentRevision: null,
    source: { game, engine: '2.23.0', build: 'control', rules: 'portable-1' },
    transfer: projectPortablePerson({ castId, game, engine: '2.23.0', person, history: [] }),
    limitations: [],
  });
}

it.each([
  ['hf.cast.yusuf.warren', 'warren', 'yusuf', 'valley', 'yusuf-usta'],
  ['hf.cast.bilal.rope', 'rope', 'bilal', 'glance', 'bilal'],
])('continues %s from %s under its authored receiving role', async (castId, source, id, target, targetId) => {
  const parent = await departure(source, castId, id);
  const opening = actor(castId, targetId);
  const before = structuredClone(parent);
  expect(admitPortablePerson(parent, target, opening).body.satiety).toBe(0.41);
  expect(opening.body.satiety).toBe(0.8);
  expect(parent).toEqual(before);
});

it('binds the six Neighbours runtime actors and refuses forged source identities', async () => {
  const roles = [
    ['hf.cast.nora.smallworks', 'repair', 'nora', 'ada'],
    ['hf.cast.derya.stairwell', 'stairwell', 'derya', 'elin'],
    ['hf.cast.sam.smallworks', 'repair', 'sam', 'sam'],
    ['hf.cast.bilal.rope', 'rope', 'bilal', 'jo'],
    ['hf.cast.rafi.pass', 'pass', 'rafi', 'ravi'],
    ['hf.cast.ece.murmur', 'murmur', 'ece', 'noor'],
  ] as const;
  for (const [castId, source, sourceId, neighbourId] of roles) {
    const parent = await departure(source, castId, sourceId);
    expect(portablePersonRole(parent, 'neighbours')).toBe(neighbourId);
    const projected = await departure('neighbours', castId, neighbourId);
    expect(portablePersonRole(projected, source)).toBe(sourceId);
    expect(() =>
      projectPortablePerson({
        castId,
        game: 'neighbours',
        engine: '2.23.0',
        person: actor(castId, 'unknown'),
        history: [],
      }),
    ).toThrow(/no authored chapter/);
    const forged = structuredClone(projected);
    (forged.transfer.portable as { source: { personId: string } }).source.personId = 'unknown';
    expect(() => portablePersonRole(forged, source)).toThrow(/incompatible identity or source/);
    const unknownSource = structuredClone(projected);
    unknownSource.source.game = 'unknown';
    expect(() => portablePersonRole(unknownSource, source)).toThrow(/incompatible identity or source/);
  }
});

// Synthetic identity bodies test role provenance, not biography or host admission.
it('validates the eight Commonstead native roles and refuses forged source identities', async () => {
  const castIds = [
    'hf.cast.nora.smallworks',
    'hf.cast.sam.smallworks',
    'hf.cast.dai.glance',
    'hf.cast.nerys.glance',
    'hf.cast.dilek.pass',
    'hf.cast.burak.stairwell',
    'hf.cast.sevim.stairwell',
    'hf.cast.oskar.rope',
  ];
  for (const castId of castIds) {
    const parent = await departure('commonstead', castId, castId);
    expect(portablePersonRole(parent, 'commonstead')).toBe(castId);
    const forged = structuredClone(parent);
    (forged.transfer.portable as { source: { personId: string } }).source.personId = 'unknown';
    expect(() => portablePersonRole(forged, 'commonstead')).toThrow(/incompatible identity or source/);
  }
});

it('refuses to swap Master Yusuf and builder Yusuf in Valley', async () => {
  const master = await departure('warren', 'hf.cast.yusuf.warren', 'yusuf');
  const builder = await departure('well', 'hf.cast.yusuf.well', 'yusuf');
  for (const [parent, wrongRole] of [
    [master, 'yusuf'],
    [builder, 'yusuf-usta'],
  ] as const) {
    const before = structuredClone(parent);
    expect(() => admitPortablePerson(parent, 'valley', actor(parent.castId, wrongRole))).toThrow(
      /matching authored role/,
    );
    expect(parent).toEqual(before);
  }
});

it('keeps the role readable but refuses departure and claims until every peer is safe', async () => {
  const castId = 'hf.cast.yusuf.warren';
  const parent = await departure('warren', castId, 'yusuf');
  const before = structuredClone(parent);
  const deployments = PORTABLE_READERS as Record<string, { client: string; perPersonSkips: boolean }>;
  const ready = deployments.warren;
  const source = { ...parent.source, game: 'valley' };
  const writes: string[] = [];
  try {
    // Threshold, skip capability and unknown deployment all keep the same peer closed.
    for (const unsafe of [
      { client: '0.5.4', perPersonSkips: true },
      { client: '0.5.5', perPersonSkips: false },
      { client: '0.5.5-rc.1', perPersonSkips: true },
      undefined,
    ]) {
      if (unsafe) deployments.warren = unsafe;
      else delete deployments.warren;
      expect(portableWriteBlockers(castId, 'valley')).toEqual(['warren']);
      expect(admitPortablePerson(parent, 'valley', actor(castId, 'yusuf-usta')).body.satiety).toBe(0.41);
      expect(() =>
        projectPortablePerson({
          castId,
          game: 'valley',
          engine: '2.23.0',
          person: actor(castId, 'yusuf-usta'),
          history: [],
        }),
      ).toThrow(/read-only.*warren/);
      expect(() => claimPortablePerson(parent, 'valley')).toThrow(/read-only.*warren/);
    }
    const result = await claimCastChapterBatch(
      {
        async request<T>(request: import('../src/persona.ts').PersonaRequest): Promise<T> {
          if (request.action === 'prepareBatch')
            return {
              expectedHeads: { [castId]: parent.revision },
              inputs: [preparePersonaLife(parent, 0)],
              blocked: [],
            } as T;
          writes.push(request.action);
          return undefined as T;
        },
      },
      [castId],
      source,
      async (inputs) => inputs.map((input) => input.parent.castId),
    );
    expect(result?.claims).toEqual([]);
    expect(result?.initial).toEqual([]);
    expect(result?.blocked).toEqual([{ castId, reason: expect.stringContaining('read-only') }]);
    expect(parent).toEqual(before);
  } finally {
    if (ready) deployments.warren = ready;
  }
  expect(writes).toEqual(['putBatch']); // Empty atomic batch preserves expected-head CAS.
  expect(portableWriteBlockers(castId, 'valley')).toEqual([]);
  expect(
    projectPortablePerson({
      castId,
      game: 'valley',
      engine: '2.23.0',
      person: actor(castId, 'yusuf-usta'),
      history: [],
    }).castPassport,
  ).toBe('hf-portable-person/1');
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
