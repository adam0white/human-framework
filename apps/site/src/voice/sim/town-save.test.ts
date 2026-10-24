/** Current canonical town saves resume every person, community and world field exactly. */
import {
  communityState,
  createCommunity,
  MINUTES_PER_DAY,
  restore,
  type Suggestion,
  snapshot,
  stepCommunity,
} from '@adam0white/human-framework';
import { describe, expect, test } from 'vitest';
import { createTown, TOWN_IDS, townPeople } from './town.ts';

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

describe('the town as a save', () => {
  test('saving and restoring people, community and world mid-run continues exactly as the straight run', () => {
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
  }, 30_000);
});
