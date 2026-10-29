import { readFileSync } from 'node:fs';
import {
  createPerson,
  createRun,
  exportRun,
  inspect,
  type PersonAuthoring,
  type Result,
  type RunSpec,
} from '@adam0white/human-framework';
import { expect, it, vi } from 'vitest';
import { canonicalCast } from '../src/cast.ts';
import { claimCastChapterBatch, preparePersonaLife } from '../src/life.ts';
import { createPersona, type PersonaEnvelope, type PersonaRequest } from '../src/persona.ts';
import { admitPortablePerson, projectPortablePerson } from '../src/persona-portable.ts';

it('continues the Left Hand cast through an authored shelf chapter and refuses invalid departures', async () => {
  const fixture = JSON.parse(
    readFileSync(new URL('./fixtures/retained-authoring.json', import.meta.url), 'utf8'),
  ) as { spec: RunSpec; person: PersonAuthoring };
  const need = <T>(r: Result<T>): T => {
    if (!r.ok) throw new Error(r.error.message);
    return r.value;
  };
  const parents: PersonaEnvelope[] = [];
  for (const id of ['yusuf', 'idris', 'samira', 'danyal', 'tariq']) {
    const castId = `hf.cast.${id}.well`;
    const spec = structuredClone(fixture.spec);
    spec.host.id = 'lefthand';
    spec.definitions.sources = spec.definitions.sources.map((s) =>
      s.type === 'host' ? { ...s, id: 'lefthand' } : s,
    );
    const opening = structuredClone(fixture.person);
    opening.id = id;
    opening.identity.castId = castId;
    opening.state.body.satiety = 0.43;
    const run = need(createRun(spec));
    need(createPerson(run, opening));
    const view = need(
      inspect(run, {
        perspective: { kind: 'host' },
        people: [id],
        select: ['persona'],
        portable: { person: id, castId, castRevision: canonicalCast(castId).revision },
      }),
    );
    const part = view.people[0]?.parts[0];
    if (part?.select !== 'persona' || !('format' in part.value)) throw new Error('Missing portable person');
    const portable = part.value;
    const parent = await createPersona({
      format: 'hf-persona/1',
      castId,
      castRevision: '1',
      branchId: `control-${id}`,
      parentRevision: null,
      source: { game: 'lefthand', engine: portable.source.engine, build: 'control', rules: 'portable-2' },
      transfer: { castPassport: `hf-portable-person/${portable.version}`, portable },
      limitations: [],
    });
    parents.push(parent);
    const before = structuredClone(parent);
    const targetOpening = structuredClone(opening);
    targetOpening.state.body.satiety = 0.8;
    const target = need(createRun(spec));
    need(
      createPerson(
        target,
        admitPortablePerson(parent, 'lefthand', targetOpening, { offsetMs: 0, references: [] }),
      ),
    );
    expect(exportRun(target).current.people[id]?.body.satiety).toBe(0.43);
    expect(targetOpening.state.body.satiety).toBe(0.8);
    expect(() =>
      admitPortablePerson(parent, 'lefthand', { ...opening, id: 'wrong' }, { offsetMs: 0, references: [] }),
    ).toThrow();
    expect(() =>
      admitPortablePerson({ ...parent, source: { ...parent.source, game: 'wrong' } }, 'lefthand', opening, {
        offsetMs: 0,
        references: [],
      }),
    ).toThrow();
    if (id === 'idris') {
      const injured = structuredClone(opening);
      injured.state.body.health = 0.3;
      const conflict = need(createRun(spec));
      expect(
        createPerson(
          conflict,
          admitPortablePerson(parent, 'lefthand', injured, { offsetMs: 0, references: [] }),
        ).ok,
      ).toBe(false);
    }
    const person = exportRun(run).current.people[id];
    expect(() =>
      projectPortablePerson({
        castId,
        game: 'lefthand',
        engine: portable.source.engine,
        person,
        history: [],
        hostObligations: ['delivery'],
      }),
    ).toThrow(/unfinished responsibilities/);
    expect(parent).toEqual(before);
  }
  const good = parents.find((p) => p.castId === 'hf.cast.samira.well');
  const bad = parents.find((p) => p.castId === 'hf.cast.yusuf.well');
  if (!good || !bad) throw new Error('Missing source fixtures');
  const { revision: _revision, ...body } = bad;
  const passport = structuredClone(body.transfer.portable) as { source: { personId: string } };
  passport.source.personId = 'wrong-role';
  const malformed = await createPersona({ ...body, transfer: { ...body.transfer, portable: passport } });
  const heads = { [good.castId]: good.revision, [malformed.castId]: malformed.revision };
  const writes: PersonaRequest[] = [];
  const result = await claimCastChapterBatch(
    {
      async request<T>(request: PersonaRequest): Promise<T> {
        if (request.action === 'prepareBatch')
          return {
            expectedHeads: heads,
            inputs: [preparePersonaLife(good, 0), preparePersonaLife(malformed, 0)],
            blocked: [],
          } as T;
        writes.push(request);
        return undefined as T;
      },
    },
    [good.castId, malformed.castId],
    good.source,
    async (inputs) => inputs.map((i) => i.parent.castId),
  );
  expect(result?.initial).toEqual([good.castId]);
  expect(result?.blocked).toEqual([
    { castId: malformed.castId, reason: expect.stringContaining('source chapter') },
  ]);
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ action: 'putBatch', expectedHeads: heads });
  expect(result?.claims.map((p) => p.castId)).toEqual([good.castId]);
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
