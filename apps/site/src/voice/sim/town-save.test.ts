/**
 * The town (Game 2's world) as a save: people + community + world state resume exactly, and the engine-1.5.0 town
 * save still restores and continues under the current engine.
 *
 * These lived in packages/human/test (save-resume.test.ts, migrate.test.ts) while the town was a framework scenario;
 * they moved here with it (review 2026-10-04, quality 1a). The fixture is the `town` half of the framework's
 * `engine-1.5.0.json`, unchanged (generated 2026-10-04 from 39afede; see packages/human/test/migrate.test.ts and
 * scripts/continue-old-engine.ts for how it was written and how its `continued` digests are regenerated).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  type CommunityState,
  communityState,
  createCommunity,
  MINUTES_PER_DAY,
  type Person,
  restore,
  type Suggestion,
  snapshot,
  stepCommunity,
} from '@human/framework';
import { describe, expect, test } from 'vitest';
import { createTown, TOWN_IDS, type TownState, townPeople } from './town.ts';

interface Run {
  start: number;
  saveAt: number;
  endAt: number;
  saved: { people: unknown[]; c: CommunityState; state: unknown };
  continued: string;
}

const rt = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const strip = (people: Person[]) =>
  rt(people.map(snapshot)).map((j) => {
    const { engine: _engine, ...rest } = j;
    return rest;
  });
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

  test('the engine-1.5.0 town save restores and continues under the 1.7.0 rules', () => {
    const fx = JSON.parse(
      readFileSync(new URL('../../../test/fixtures/town-engine-1.5.0.json', import.meta.url), 'utf8'),
    ) as { engine: string; town: Run };
    expect(fx.engine).toBe('1.5.0');
    const saved = rt(fx.town.saved);
    const people = saved.people.map((j) => restore(j));
    const world = createTown(people, { seed: 0, state: saved.state as TownState });
    const c = createCommunity(people, saved.c);
    stepCommunity(c, world, fx.town.start + fx.town.endAt * MINUTES_PER_DAY, { suggestions: pray });
    // First pinned in packages/human/test/migrate.test.ts (CONTINUED_1_7.town) before the town moved out of the
    // framework. Re-pinned 2026-10-04 (voice-build §13, tenth pass): the town's rules changed (the Eid market,
    // unanswered calls at the tea house, Selin calling after her iftar, an interrupted job counting as the day's).
    expect(hash({ people: strip(c.people), state: rt(world.state) })).toBe(
      '51557764b82eb099bee4f9f9e9019c254fd64e0342ecafdd14a9a5ca58482cb6',
    );
    for (const j of fx.town.saved.people) {
      const once = restore(rt(j));
      expect(rt(restore(rt(snapshot(once))))).toEqual(rt(once));
    }
  }, 30_000);
});
