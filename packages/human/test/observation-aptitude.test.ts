import { expect, test } from 'vitest';
import {
  begin,
  createPerson,
  decide,
  finish,
  observeSkill,
  perceive,
  restore,
  skillLevel,
  snapshot,
} from '../src/index.ts';

const make = (aptitude?: number) =>
  createPerson({
    id: 'learner',
    name: 'Learner',
    seed: 35,
    now: 480,
    bornAt: -20_000_000,
    sex: 'female',
    ...(aptitude === undefined ? {} : { family: { aptitudes: { smith: aptitude } } }),
  });

const demonstration = (inheritedAptitude?: boolean) => ({
  at: 480,
  channel: 'saw' as const,
  kind: 'work',
  actorId: 'teacher',
  salience: 1,
  summary: 'watched a smith',
  demonstrates: {
    skill: 'smith',
    level: 0.9,
    minutes: 120,
    ...(inheritedAptitude === undefined ? {} : { inheritedAptitude }),
  },
});

test('explicit observation aptitude follows the same direction as direct practice', () => {
  const practice = (aptitude: number) => {
    const p = make(aptitude);
    const aff = {
      id: 'forge',
      action: 'forge',
      label: 'forge',
      duration: 120,
      effort: 0.2,
      advertises: { competence: 0.2 },
      skill: { id: 'smith', difficulty: 0.4 },
    };
    begin(p, aff, decide(p, [aff]));
    finish(p, { affordanceId: 'forge', action: 'forge', status: 'completed', at: 600 });
    return skillLevel(p, 'smith');
  };
  const watch = (aptitude: number) =>
    observeSkill(make(aptitude), 'smith', 120, 0.9, undefined, { inheritedAptitude: true }).after;
  expect(practice(2)).toBeGreaterThan(practice(1));
  expect(practice(0.5)).toBeLessThan(practice(1));
  expect(watch(2)).toBeGreaterThan(watch(1));
  expect(watch(0.5)).toBeLessThan(watch(1));
});

test('attended demonstrates uses explicit aptitude and neutral baseline', () => {
  const watched = (aptitude?: number) => {
    const p = make(aptitude);
    perceive(p, [demonstration(true)]);
    return skillLevel(p, 'smith');
  };
  expect(watched(2)).toBeGreaterThan(watched());
  expect(watched(0.5)).toBeLessThan(watched());
  expect(watched(1)).toBe(watched());
});

test('absent option keeps family-authored saved continuation and RNG exact', () => {
  const original = make(2);
  const resumed = restore(JSON.parse(JSON.stringify(snapshot(original))));
  const expected = make();
  observeSkill(original, 'smith', 120, 0.9);
  perceive(original, [demonstration()]);
  observeSkill(resumed, 'smith', 120, 0.9);
  perceive(resumed, [demonstration()]);
  observeSkill(expected, 'smith', 120, 0.9);
  perceive(expected, [demonstration()]);
  expect(snapshot(resumed)).toEqual(snapshot(original));
  expect(original.skills).toEqual(expected.skills);
  expect(original.rng).toEqual(expected.rng);
});

test('invalid authored aptitude sanitizes to a neutral observation multiplier', () => {
  const invalid = make();
  invalid.family = { aptitudes: { smith: Number.POSITIVE_INFINITY } };
  const restored = restore(snapshot(invalid));
  const neutral = make();
  expect(restored.family).toBeUndefined();
  expect(observeSkill(restored, 'smith', 120, 0.9, undefined, { inheritedAptitude: true })).toEqual(
    observeSkill(neutral, 'smith', 120, 0.9, undefined, { inheritedAptitude: true }),
  );
});
