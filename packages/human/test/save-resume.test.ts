import { describe, expect, test } from 'vitest';
import {
  communityState,
  createCommunity,
  createPerson,
  createTown,
  createVillage,
  MINUTES_PER_DAY,
  restore,
  type Suggestion,
  snapshot,
  stepCommunity,
  TOWN_IDS,
  townPeople,
  villagerSpec,
} from '../src/index.ts';

const rt = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const pray: Record<string, Suggestion> = { halil: { voiceId: 'you', action: 'pray', strength: 0.6 } };

function town() {
  const ppl = townPeople({});
  const people = TOWN_IDS.map((id) => ppl[id]);
  return {
    people,
    world: createTown(people, { seed: 7 }),
    c: createCommunity(people),
    start: people[0]?.now ?? 0,
  };
}

describe('a save is people + community + world state (adversarial review 2026-10-03)', () => {
  test('town: saving and restoring all three mid-run continues exactly as the straight run', () => {
    const a = town();
    const end = a.start + 4 * MINUTES_PER_DAY;
    stepCommunity(a.c, a.world, end, { suggestions: pray });

    const b = town();
    stepCommunity(b.c, b.world, b.start + 1.5 * MINUTES_PER_DAY, { suggestions: pray });
    const saved = rt({ people: b.c.people.map(snapshot), c: communityState(b.c), state: b.world.state });
    const people = saved.people.map((j) => restore(j));
    const world = createTown(people, { seed: 0, state: saved.state });
    const c = createCommunity(people, saved.c);
    stepCommunity(c, world, end, { suggestions: pray });

    expect(rt(c.people.map(snapshot))).toEqual(rt(a.c.people.map(snapshot)));
    expect(rt(world.state)).toEqual(rt(a.world.state));
  });

  test('village: createVillage resumes from a saved state', () => {
    const make = () => {
      const ids = ['a', 'b', 'c'];
      const people = ids.map((id, k) => createPerson(villagerSpec(id, id, k + 1, { others: ids })));
      return { people, world: createVillage(people, { seed: 3 }), c: createCommunity(people) };
    };
    const a = make();
    const end = (a.people[0]?.now ?? 0) + 3 * MINUTES_PER_DAY;
    stepCommunity(a.c, a.world, end);
    const b = make();
    stepCommunity(b.c, b.world, (b.people[0]?.now ?? 0) + 1.25 * MINUTES_PER_DAY);
    const saved = rt({ people: b.c.people.map(snapshot), c: communityState(b.c), state: b.world.state });
    const people = saved.people.map((j) => restore(j));
    const world = createVillage(people, { seed: 0, state: saved.state });
    const c = createCommunity(people, saved.c);
    stepCommunity(c, world, end);
    expect(rt(c.people.map(snapshot))).toEqual(rt(a.c.people.map(snapshot)));
    expect(rt(world.state)).toEqual(rt(a.world.state));
  });
});
