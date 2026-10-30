import { expect, it } from 'vitest';
import { actorEvidence, actorInput, actorRuntime } from './actor.ts';
import { canMarry, spousesOf } from './actor-life.ts';
import { flushActors } from './actor-world.ts';
import { bear, readDeaths } from './life.ts';
import { publicFixture, requirePerson } from './public-fixture.ts';

it('uses HF inheritance and actual death while retaining the village family graph', () => {
  const s = publicFixture(),
    mother = requirePerson(s, 'samira'),
    father = requirePerson(s, 'idris');
  const child = bear(s, mother, father, s.minute);
  expect(child.life.sex === 'female' || child.life.sex === 'male').toBe(true);
  expect(
    child.social.relationships
      .filter((r) => r.roles.includes('parent'))
      .map((r) => r.otherId)
      .sort(),
  ).toEqual(['idris', 'samira']);
  expect(canMarry(requirePerson(s, 'lena'), requirePerson(s, 'pell'), { id: 'watch-village' }).ok).toBe(
    false,
  );
  const e = actorEvidence(s, 'idris', 'actual-host-death');
  actorInput(s, 'lifecycle.received', {
    type: 'death',
    person: { kind: 'actor', id: 'idris' },
    basis: {
      evidence: { kind: 'evidence', id: e.evidenceId },
      worldRevision: actorRuntime(s).worldRevision(),
    },
  });
  readDeaths(s, flushActors(s, s.minute));
  const death = s.chronicle.find((l) => l.kind === 'death' && l.who === 'idris');
  expect(death?.text).toContain('died');
  expect(death?.text).not.toMatch(/sickness|illness|disease/);
  expect(requirePerson(s, 'idris').body.alive).toBe(false);
  expect(spousesOf(requirePerson(s, 'samira'))).not.toContain('idris');
  actorRuntime(s).verify();
}, 30000);
