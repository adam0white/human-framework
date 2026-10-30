import { expect, it } from 'vitest';
import { actorRuntime } from './actor.ts';
import { injure, knockDown, readCapacities } from './actor-effects.ts';
import { flushActors } from './actor-world.ts';
import { publicFixture, requirePerson } from './public-fixture.ts';

it('admits physical injury and collapse and uses the public overall capacity for world work', () => {
  const s = publicFixture(),
    before = requirePerson(s, 'tamar');
  injure(before, { part: 'head', severity: 0.4, healRatePerDay: 0.2 });
  knockDown(before, { reason: 'an actual falling beam', until: s.minute + 120 });
  expect(requirePerson(s, 'tamar').body.downed).toBe(before.body.downed);
  flushActors(s, s.minute);
  const after = requirePerson(s, 'tamar');
  expect(after.body.injuries.some((i) => i.part === 'head')).toBe(true);
  expect(after.body.downed).toBeTruthy();
  expect(readCapacities(after)).toEqual({
    moving: after.bodyReading.capacity,
    manipulation: after.bodyReading.capacity,
    sight: after.bodyReading.capacity,
  });
  actorRuntime(s).verify();
});
