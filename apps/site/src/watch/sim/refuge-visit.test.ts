import { expect, it } from 'vitest';
import { actorRuntime, interruptActor } from './actor.ts';
import { flushActors, physicalLedger } from './actor-world.ts';
import { stepPeople } from './night.ts';
import { WatchWorld } from './people.ts';
import { publicFixture, requirePerson } from './public-fixture.ts';
import { agreeRefugeVisit, stayRefugeVisit } from './refuge-visit.ts';

it('retains Ada as Kian’s ward and admits separate care and return duties', () => {
  const s = publicFixture();
  expect(agreeRefugeVisit(s)).toContain('Only together');
  flushActors(s, s.minute);
  const kian = requirePerson(s, 'kian'),
    ada = requirePerson(s, 'ada');
  expect(ada.social.relationships.some((r) => r.otherId === 'kian' && r.roles.includes('guardian'))).toBe(
    true,
  );
  expect(kian.agenda.commitments.filter((c) => c.toId === 'ada').map((c) => c.actions)).toEqual([
    ['care-ada'],
    ['return-with-ada'],
  ]);
  expect(stayRefugeVisit(s)).toBe(true);
  flushActors(s, s.minute);
  expect(
    requirePerson(s, 'kian')
      .agenda.commitments.filter((c) => c.toId === 'ada')
      .every((c) => c.status === 'released'),
  ).toBe(true);
  actorRuntime(s).verify();
});

it('settles actual shared care, consumes its source meal once, and retains the separate return duty', () => {
  const s = publicFixture(),
    grain = s.grain;
  agreeRefugeVisit(s);
  flushActors(s, s.minute);
  const world = new WatchWorld(s),
    offers = world.affordancesFor.bind(world);
  world.affordancesFor = (p) => {
    const book = offers(p);
    return p.id === 'kian' ? book.filter((o) => o.action === 'care-ada') : book;
  };
  interruptActor(s, 'kian', 'Kian and Ada have agreed to share care');
  stepPeople(s, s.minute, world);
  s.minute += 31;
  stepPeople(s, s.minute, world);
  flushActors(s, s.minute);
  expect(physicalLedger(s).care?.completedAt).toBeDefined();
  const duties = requirePerson(s, 'kian').agenda.commitments.filter((c) => c.toId === 'ada');
  expect(duties.find((c) => c.actions.includes('care-ada'))?.status).toBe('kept');
  expect(duties.find((c) => c.actions.includes('return-with-ada'))?.status).toBe('pending');
  expect(s.refugeVisit?.careCompletedAt).toBeDefined();
  expect(s.grain).toBeCloseTo(grain - 0.1);
  s.minute += 31;
  stepPeople(s, s.minute, world);
  flushActors(s, s.minute);
  expect(s.grain).toBeCloseTo(grain - 0.1);
  actorRuntime(s).verify();
}, 30000);
