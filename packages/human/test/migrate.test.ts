/**
 * Save migration against real saves written by earlier engines.
 *
 * The fixtures were generated (2026-10-04) by running the framework source of the named commit unchanged:
 * `engine-1.4.0.json` from 1ea0616^ (engine 1.4.0), `engine-1.5.0.json` from 39afede (engine 1.5.0). Each holds a
 * village run (3 villagers, seed 3, saved at day 1.25) and, for 1.5.0, the town (seed 7, Halil advised to pray,
 * saved at day 1.5): every person's `snapshot`, `communityState` and the world state, plus a sha256 of what the old
 * engine produced one more day on (people snapshots with `engine` removed, then world state), so the test can tell
 * whether the current engine continues exactly as the old one did.
 *
 * Those engines used the platform's Math.exp/log/cos and `**`, which differ in the last bit between macOS arm64 and
 * Linux x64, so their original digests (kept as `continuedNativeMathDarwinArm64`) only reproduce on macOS arm64.
 * `continued` is the old engine's own source with those calls rewritten to core/libm, continued from the same save:
 * the same old rules, on math that is identical everywhere. `scripts/continue-old-engine.ts` regenerates both (see
 * its header); with `--native` on macOS arm64 it reproduces the original digests, which the pre-libm engine also
 * matched (checked 2026-10-04 before the switch).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  type CommunityState,
  communityState,
  createCommunity,
  createTown,
  createVillage,
  ENGINE_VERSION,
  MINUTES_PER_DAY,
  migratableVersions,
  migrate,
  type Person,
  restore,
  type Suggestion,
  snapshot,
  stepCommunity,
} from '../src/index.ts';
import type { TownState } from '../src/scenarios/town.ts';
import type { VillageState } from '../src/scenarios/village.ts';

interface Run {
  start: number;
  saveAt: number;
  endAt: number;
  saved: { people: unknown[]; c: CommunityState; state: unknown };
  continued: string;
}
interface Fixture {
  engine: string;
  village: Run;
  town?: Run;
}

const load = (v: string): Fixture =>
  JSON.parse(readFileSync(new URL(`./fixtures/engine-${v}.json`, import.meta.url), 'utf8')) as Fixture;
const rt = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const strip = (people: Person[]) =>
  rt(people.map(snapshot)).map((j) => {
    const { engine: _engine, ...rest } = j;
    return rest;
  });
const pray: Record<string, Suggestion> = { halil: { voiceId: 'you', action: 'pray', strength: 0.6 } };

function continueRun(kind: 'village' | 'town', run: Run) {
  const saved = rt(run.saved);
  const people = saved.people.map((j) => restore(j));
  const world =
    kind === 'village'
      ? createVillage(people, { seed: 0, state: saved.state as VillageState })
      : createTown(people, { seed: 0, state: saved.state as TownState });
  const c = createCommunity(people, saved.c);
  stepCommunity(
    c,
    world,
    run.start + run.endAt * MINUTES_PER_DAY,
    kind === 'town' ? { suggestions: pray } : {},
  );
  return { c, world, digest: hash({ people: strip(c.people), state: rt(world.state) }) };
}

describe('migrate: saves from earlier engines restore under the current one', () => {
  const v140 = load('1.4.0');
  const v150 = load('1.5.0');

  test('the fixtures really are old saves', () => {
    expect(v140.engine).toBe('1.4.0');
    expect(v150.engine).toBe('1.5.0');
    for (const j of v140.village.saved.people) expect((j as { engine: string }).engine).toBe('1.4.0');
    expect(ENGINE_VERSION).toBe('1.6.0');
    expect(migratableVersions()).toEqual(['1.4.0', '1.5.0', '1.6.0']);
  });

  test('migrate stamps the current version and leaves the input alone', () => {
    const j = v140.village.saved.people[0] as Record<string, unknown>;
    const before = JSON.stringify(j);
    const m = migrate(j);
    expect(m.engine).toBe(ENGINE_VERSION);
    expect(JSON.stringify(j)).toBe(before);
    const { engine: _a, ...restIn } = j;
    const { engine: _b, ...restOut } = m;
    expect(restOut).toEqual(restIn);
  });

  test('1.4.0 village: restores and continues exactly as the 1.4.0 engine did', () => {
    // The village never uses standing advice, so the 1.4.0 -> 1.5.0 rule change does not touch it.
    expect(continueRun('village', v140.village).digest).toBe(v140.village.continued);
  });

  test('1.5.0 village and town: restore and continue exactly as the 1.5.0 engine did', () => {
    expect(continueRun('village', v150.village).digest).toBe(v150.village.continued);
    const town = v150.town;
    if (!town) throw new Error('fixture lacks town');
    expect(continueRun('town', town).digest).toBe(town.continued);
  });

  test('a migrated save round-trips: restore(snapshot(restore(old))) equals restore(old)', () => {
    for (const j of [...v140.village.saved.people, ...(v150.town?.saved.people ?? [])]) {
      const once = restore(rt(j));
      expect(rt(restore(rt(snapshot(once))))).toEqual(rt(once));
    }
  });

  test('two restores of the same old save step identically', () => {
    const a = continueRun('village', v140.village);
    const b = continueRun('village', v140.village);
    expect(a.digest).toBe(b.digest);
    expect(rt(communityState(a.c))).toEqual(rt(communityState(b.c)));
  });

  test('older and unknown engines are refused with the supported list', () => {
    const j = rt(v140.village.saved.people[0]) as Record<string, unknown>;
    expect(() => restore({ ...j, engine: '1.3.0' })).toThrow(/1\.4\.0, 1\.5\.0, 1\.6\.0/);
    expect(() => restore({ ...j, engine: '9.0.0' })).toThrow(/engine 9\.0\.0/);
    expect(() => migrate({ schema: 'human/person@1' })).toThrow(/missing engine/);
  });
});
