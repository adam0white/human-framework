import { expect, test } from 'vitest';
import { skillLevel, skillsOwner } from '../src/skills/skills.ts';
import { activity, frame, life, offer, outcome, person, traits } from './w2-fixture.ts';

const ctx = () => ({
  ...frame(),
  life,
  ageYears: 30,
  traits,
  aptitude: {},
  skills: [
    { id: 'craft', label: 'Craft', domain: 'motor' as const },
    { id: 'related', label: 'Related', domain: 'motor' as const },
  ],
  transfers: [{ from: 'craft', to: 'related', fraction: 0.3 }],
  body: {
    hunger: 0,
    thirst: 0,
    sleepiness: 0,
    fatigue: 0,
    pain: 0,
    capacity: 1,
    alertness: 1,
    perceived: { hunger: 0, thirst: 0, sleepiness: 0, fatigue: 0, pain: 0 },
  },
});
test('practice and sparse transfer teach without charging related practice time', () => {
  const act = activity(
    offer('work', {
      durationMs: 3600000,
      demands: {
        effort: 0.1,
        focus: 0.2,
        mode: 'awake',
        requires: {},
        skill: { id: 'craft', difficulty: 0.2, domain: 'motor' },
      },
    }),
  );
  const learned = skillsOwner.learn(
    {},
    { kind: 'practice', activity: act, outcome: outcome(act) },
    ctx(),
  ).state;
  expect(learned.craft?.level).toBeGreaterThan(0.05);
  expect(learned.craft?.practicedMs).toBe(3600000);
  expect(learned.related?.level).toBeGreaterThan(0.05);
  expect(learned.related?.practicedMs).toBe(0);
  expect(skillsOwner.validate(learned)).toEqual([]);
});
test('watching retains its ceiling and adds no direct practice; interrupted practice retains actual elapsed failed-attempt learning', () => {
  const context = ctx(),
    state = { craft: { level: 0.2, practicedMs: 3600000, lastPracticed: 0 } };
  const watched = skillsOwner.learn(
    state,
    {
      kind: 'witness',
      data: {
        person: 'person',
        evidenceId: 'seen',
        teacher: 'teacher',
        skill: 'craft',
        durationMs: 3600000,
        modelLevel: 1,
        domain: 'motor',
      },
    },
    context,
  ).state;
  expect(watched.craft?.level).toBeGreaterThan(0.2);
  expect(watched.craft?.level).toBeLessThan(1);
  expect(watched.craft?.practicedMs).toBe(3600000);
  const act = activity(
    offer('work', {
      demands: {
        effort: 0,
        focus: 0,
        mode: 'awake',
        requires: {},
        skill: { id: 'craft', difficulty: 0.3, domain: 'motor' },
      },
    }),
  );
  const interrupted = skillsOwner.learn(
    state,
    { kind: 'practice', activity: act, outcome: outcome(act, { status: 'interrupted', end: 1800000 }) },
    context,
  ).state;
  const failed = skillsOwner.learn(
    state,
    { kind: 'practice', activity: act, outcome: outcome(act, { status: 'failed', end: 1800000 }) },
    context,
  ).state;
  expect(interrupted).toEqual(failed);
  expect(interrupted.craft?.practicedMs).toBe(5400000);
  expect(interrupted.craft?.level).toBeCloseTo(0.20461574283460215, 14);
  expect(interrupted.related?.practicedMs).toBe(0);
  expect(state.craft).toEqual({ level: 0.2, practicedMs: 3600000, lastPracticed: 0 });
});

test('current competence drives the original chance law without changing state or RNG', () => {
  const p = person();
  p.actor.skills.craft = { level: 0.8, practicedMs: 0, lastPracticed: 0 };
  p.actor.now = 180 * 86400000;
  const context = frame(p.actor.now, p.frame.effective);
  const input = { skill: 'craft', difficulty: 0.5, capacity: 0.4, support: 0.6 };
  const before = structuredClone({ actor: p.actor, cursor: p.cursor, context, input });
  const competence = skillLevel({ ...p.actor, effective: context.effective }, 'craft');
  expect(competence).toBeCloseTo(0.65, 12);
  // Original defaults: effective = 0.65 * (0.5 + 0.5 * 0.4) + 0.15 * 0.6 = 0.545.
  expect(skillsOwner.successChance(p.actor, input, context)).toBeCloseTo(0.8099984339846871, 12);
  expect(skillsOwner.successChance(p.actor, { ...input, skill: 'unknown' }, context)).toBeCloseTo(
    0.060086650174007626,
    12,
  );
  const altered = {
    ...context,
    effective: {
      ...context.effective,
      builtins: {
        ...context.effective.builtins,
        SKILL_DEFAULTS: { ...context.effective.builtins.SKILL_DEFAULTS, successBias: 2 },
      },
    },
  };
  expect(skillsOwner.successChance(p.actor, input, altered)).toBeCloseTo(0.9205614508160216, 12);
  expect({ actor: p.actor, cursor: p.cursor, context, input }).toEqual(before);
});
