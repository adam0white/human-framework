/**
 * Save migration against real saves written by earlier engines.
 *
 * The fixtures were generated (2026-10-04) by running the framework source of the named commit unchanged:
 * `engine-1.4.0.json` from 1ea0616^ (engine 1.4.0), `engine-1.5.0.json` from 39afede (engine 1.5.0). Each holds a
 * village run (3 villagers, seed 3, saved at day 1.25) and, for 1.5.0, the town (seed 7, Halil advised to pray,
 * saved at day 1.5; the town half now lives in apps/site/test/fixtures/town-engine-1.5.0.json and is tested in
 * apps/site/src/voice/sim/town-save.test.ts, since the town moved out of the framework): every person's `snapshot`, `communityState` and the world state, plus a sha256 of what the old
 * engine produced one more day on (people snapshots with `engine` removed, then world state), so the test can tell
 * whether the current engine continues exactly as the old one did.
 *
 * Those engines used the platform's Math.exp/log/cos and `**`, which differ in the last bit between macOS arm64 and
 * Linux x64, so their original digests (kept as `continuedNativeMathDarwinArm64`) only reproduce on macOS arm64.
 * `continued` is the old engine's own source with those calls rewritten to core/libm, continued from the same save:
 * the same old rules, on math that is identical everywhere. `scripts/continue-old-engine.ts` regenerates both (see
 * its header); with `--native` on macOS arm64 it reproduces the original digests.
 *
 * Engine 1.7.0 changed behaviour on purpose (Fajr ends at sunrise, missed obligatory worship owes a make-up), so the
 * old engines' continuations no longer match: the 1.4.0 to 1.6.0 engines all produced the fixture `continued`
 * digests (checked through 1.6.0, natively and with libm), and `CONTINUED_1_7` pins what 1.7.0 produces from the
 * same saves.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  type CommunityState,
  communityState,
  createCommunity,
  createVillage,
  ENGINE_VERSION,
  MINUTES_PER_DAY,
  migratableVersions,
  migrate,
  type Person,
  restore,
  snapshot,
  stepCommunity,
} from '../src/index.ts';
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
/**
 * One more day on from each fixture save under engine 1.7.0 (the village saves are identical in both fixtures).
 * Re-checked under 1.8.0, 1.9.0 and 2.0.0: unchanged (the 1.9.0 omission-rule changes do not arise in this village day).
 */
const CONTINUED_1_7 = {
  village: '3fa3949b49d41dcff7053345b8ca626a48f004bac778372758372f9ff8551f82',
};

function continueRun(_kind: 'village', run: Run) {
  const saved = rt(run.saved);
  const people = saved.people.map((j) => restore(j));
  const world = createVillage(people, { seed: 0, state: saved.state as VillageState });
  const c = createCommunity(people, saved.c);
  stepCommunity(c, world, run.start + run.endAt * MINUTES_PER_DAY, {});
  return { c, world, digest: hash({ people: strip(c.people), state: rt(world.state) }) };
}

describe('migrate: saves from earlier engines restore under the current one', () => {
  const v140 = load('1.4.0');
  const v150 = load('1.5.0');

  test('the fixtures really are old saves', () => {
    expect(v140.engine).toBe('1.4.0');
    expect(v150.engine).toBe('1.5.0');
    for (const j of v140.village.saved.people) expect((j as { engine: string }).engine).toBe('1.4.0');
    expect(ENGINE_VERSION).toBe('2.0.0');
    expect(migratableVersions()).toEqual(['1.4.0', '1.5.0', '1.6.0', '1.7.0', '1.8.0', '1.9.0', '2.0.0']);
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

  test('1.4.0 village: restores and continues under the 1.7.0 rules', () => {
    const d = continueRun('village', v140.village).digest;
    expect(d).toBe(CONTINUED_1_7.village);
    // The 1.7.0 prayer rules reach the village (it has devout villagers), so it no longer matches the old engine.
    expect(d).not.toBe(v140.village.continued);
  });

  test('1.5.0 village: restores and continues under the 1.7.0 rules', () => {
    expect(continueRun('village', v150.village).digest).toBe(CONTINUED_1_7.village);
  });

  test('a migrated save round-trips: restore(snapshot(restore(old))) equals restore(old)', () => {
    for (const j of [...v140.village.saved.people, ...v150.village.saved.people]) {
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

  test('1.9.0 village with every long-run slice: restores and continues as 1.9.0 did (2.0.0 only renames a field)', () => {
    const v190 = load('1.9.0');
    expect(v190.engine).toBe('1.9.0');
    const people = v190.village.saved.people.map((j) => restore(rt(j)));
    expect(people.some((p) => (p.memory.gists?.length ?? 0) > 0)).toBe(true);
    expect(people.some((p) => p.bonds !== undefined && p.social.impressions !== undefined)).toBe(true);
    expect(people.some((p) => p.family !== undefined && p.ambient !== undefined)).toBe(true);
    expect(people.every((p) => p.ambient === undefined || 'percept' in p.ambient)).toBe(true);
    // 2.0.0 renamed `ambient.now` to `ambient.percept` and changed no behaviour: written back under the 1.9.0 name,
    // the day lived from the save is the one 1.9.0 lived.
    const { c, world } = continueRun('village', v190.village);
    const as190 = strip(c.people).map((j) => {
      const a = j.ambient as { percept: unknown; since: number } | undefined;
      return a ? { ...j, ambient: { now: a.percept, since: a.since } } : j;
    });
    expect(hash({ people: as190, state: rt(world.state) })).toBe(v190.village.continued);
  });

  test('migrate renames the 1.9.0 surroundings field and leaves the input alone', () => {
    const j = { engine: '1.9.0', ambient: { now: { cold: 0.3 }, since: 5 } };
    expect(migrate(j)).toEqual({ engine: '2.0.0', ambient: { percept: { cold: 0.3 }, since: 5 } });
    expect(j.ambient.now).toEqual({ cold: 0.3 });
    expect(migrate({ engine: '1.9.0' })).toEqual({ engine: '2.0.0' });
  });

  test('older and unknown engines are refused with the supported list', () => {
    const j = rt(v140.village.saved.people[0]) as Record<string, unknown>;
    expect(() => restore({ ...j, engine: '1.3.0' })).toThrow(/1\.4\.0, 1\.5\.0, 1\.6\.0/);
    expect(() => restore({ ...j, engine: '9.0.0' })).toThrow(/engine 9\.0\.0/);
    expect(() => migrate({ schema: 'human/person@1' })).toThrow(/missing engine/);
  });

  test('a version naming a built-in property matches no migration step (security review 2026-10-04)', () => {
    const j = rt(v140.village.saved.people[0]) as Record<string, unknown>;
    for (const v of ['__proto__', 'constructor', 'toString', 'hasOwnProperty'])
      expect(() => migrate({ ...j, engine: v }), v).toThrow(/unsupported|engine/);
    expect(migratableVersions()).not.toContain('__proto__');
  });

  test('restore drops unknown top-level keys and malformed 1.7.0 optional state', () => {
    const j = rt(snapshot(restore(rt(v140.village.saved.people[0])))) as unknown as Record<string, unknown>;
    const body = j.body as Record<string, unknown>;
    const p = restore({
      ...j,
      injected: { evil: true },
      __extra: 1,
      body: { ...body, lastSleep: { from: 'x' }, lastDowned: { from: 1, to: 2 } },
    });
    const keys = Object.keys(p);
    expect(keys).not.toContain('injected');
    expect(keys).not.toContain('__extra');
    expect(p.body.lastSleep).toBeUndefined();
    expect(p.body.lastDowned).toEqual({ from: 1, to: 2 });
  });
});
