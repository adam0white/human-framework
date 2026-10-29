import { expect, it } from 'vitest';
import { actorRuntime, saveActors } from './actor.ts';
import { ageOf, householdOf, hungrySpring, leaving, living } from './life.ts';
import { publicFixture } from './public-fixture.ts';
import { installActorViews } from './state.ts';

it('requires actual public leave decisions from every departing adult, with cold full replay', () => {
  // A new authored opening gives this household a strong unmet wish for autonomy.
  // Other households retain their ordinary profiles and can refuse.
  const s = publicFixture(1800, (people) => {
    for (const person of people.filter((p) => p.id === 'samira' || p.id === 'idris')) {
      for (const key of Object.keys(person.state.needs))
        person.state.needs[key as keyof typeof person.state.needs] = key === 'autonomy' ? 0 : 1;
      person.state.body.sleepPressure = 0;
      person.state.body.asleep = false;
    }
  });
  s.year = 2;
  s.grain = 0;
  const before = living(s).map((p) => ({
    id: p.id,
    adults: householdOf(s, p)
      .filter((q) => ageOf(q, s.minute) >= 18)
      .map((q) => q.id),
  }));
  saveActors(s);
  const cold = installActorViews(JSON.parse(JSON.stringify(s)));
  const n = leaving(s).length;
  expect(n).toBeGreaterThan(0);
  expect(leaving(cold).length).toBe(n);
  const choices = s.actorEvents
    .flatMap((e) => (e.record ? [{ person: e.personId, record: e.record }] : []))
    .filter((e) => ['leave-village', 'stay-village'].includes(e.record.chosenAction ?? ''));
  expect(choices.length).toBeGreaterThan(0);
  expect(choices.some((c) => c.record.chosenAction === 'stay-village')).toBe(true);
  for (const c of choices.filter((c) => c.record.chosenAction === 'stay-village'))
    expect(s.cast[c.person ?? '']?.status).toBe('here');
  const departed = before.filter((p) => s.cast[p.id]?.status === 'left');
  for (const p of departed)
    for (const id of p.adults) {
      expect(choices.some((c) => c.person === id && c.record.chosenAction === 'leave-village')).toBe(true);
    }
  expect(n).toBe(departed.length);
  for (const p of departed)
    expect(
      actorRuntime(s)
        .hostState()
        .offers.find((row) => row.person === p.id)?.offers ?? [],
    ).toEqual([]);
  actorRuntime(s).verify();
  expect(actorRuntime(cold).snapshot().archive.hashes.full).toBe(
    actorRuntime(s).snapshot().archive.hashes.full,
  );
  saveActors(s);
  const restored = installActorViews(JSON.parse(JSON.stringify(s)));
  expect(actorRuntime(restored).snapshot().archive.hashes.full).toBe(
    actorRuntime(s).snapshot().archive.hashes.full,
  );
  actorRuntime(restored).verify();
  restored.minute += 11;
  s.minute += 11;
  leaving(restored);
  leaving(s);
  expect(actorRuntime(restored).snapshot().archive.hashes.full).toBe(
    actorRuntime(s).snapshot().archive.hashes.full,
  );
  actorRuntime(restored).verify();
}, 30000);

it('does not request departure decisions for first-year hunger or an already sufficient granary', () => {
  const s = publicFixture();
  s.grain = 0;
  expect(hungrySpring(s, 100)).toBe(0);
  expect(leaving(s)).toEqual([]);
  s.year = 2;
  s.grain = 100000;
  expect(hungrySpring(s, 1)).toBe(0);
  expect(
    s.actorEvents.some(
      (e) => e.record?.chosenAction === 'leave-village' || e.record?.chosenAction === 'stay-village',
    ),
  ).toBe(false);
});
