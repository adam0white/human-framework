/** Headless control: a bleeding death between decisions is discovered at catch-up minute 10. */
import { pathToFileURL } from 'node:url';
import { injure } from '../src/body/index.ts';
import { createPerson } from '../src/person.ts';
import { createCommunity, stepCommunity, type World } from '../src/sim/sim.ts';
import { seedTie } from '../src/social/index.ts';

export function deathDispatchControl() {
  const dead = createPerson({ id: 'a', name: 'Ada', seed: 7, sex: 'female', now: 0, bornAt: -15_000_000 });
  const friend = createPerson({ id: 'b', name: 'Bo', seed: 8, sex: 'male', now: 0, bornAt: -15_000_000 });
  seedTie(friend, { otherId: dead.id, roles: ['friend'], affection: 0.8 });
  injure(dead, { part: 'leg', severity: 0.5, bleeding: 1, healRatePerDay: 0 });
  dead.body.health = 0.0001;
  const c = createCommunity([dead, friend]);
  c.idleUntil = { a: 20, b: 20 };
  const world: World = {
    now: () => 10,
    affordancesFor: () => [],
    perceptsFor: () => [],
    resolve: (p, a) => ({ status: 'completed', affordanceId: a.affordanceId, action: a.action, at: p.now }),
  };
  const first = stepCommunity(c, world, 10, { deathHandling: 'community' });
  const restored = JSON.parse(JSON.stringify(c)) as typeof c;
  const second = stepCommunity(restored, world, 11, { deathHandling: 'community' });
  const result = {
    deaths: first.filter((e) => e.kind === 'died').map((e) => ({ id: e.personId, at: e.at })),
    deceasedAt: friend.social.relationships.find((r) => r.otherId === dead.id)?.deceasedAt,
    repeatedDeaths: second.filter((e) => e.kind === 'died').length,
  };
  if (result.deaths.length !== 1 || result.deceasedAt !== 10 || result.repeatedDeaths !== 0)
    throw new Error(`Death control failed: ${JSON.stringify(result)}`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(deathDispatchControl()));
