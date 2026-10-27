import { expect, test } from 'vitest';
import { cueMatches, HABIT_DEFAULTS, habitEase, habitPull, habitsOwner } from '../src/habits/habits.ts';

import { activity, offer, outcome, person } from './w2-fixture.ts';

test('habit refractory follows the last action across contexts; attention ease never removes physical effort', () => {
  const habits = [
    { action: 'tea', cue: { placeId: 'home' }, strength: 0.8, repetitions: 20, lastAt: 0 },
    { action: 'tea', cue: { placeId: 'work' }, strength: 0.8, repetitions: 20, lastAt: 86400000 },
  ];
  const ctx = { now: 86400000, placeId: 'home' };
  expect(habitPull(habits, 'tea', ctx, HABIT_DEFAULTS)).toBe(0);
  expect(
    habitPull(habits, 'tea', { ...ctx, now: 86400000 + HABIT_DEFAULTS.refractory * 60000 }, HABIT_DEFAULTS),
  ).toBeCloseTo(0.8, 14);
  expect(habitEase(habits, 'tea', ctx, HABIT_DEFAULTS)).toBeCloseTo(0.6, 14);
  expect(
    cueMatches(
      { ...habits[0], action: 'tea', cue: { after: 'work' }, strength: 0.8, repetitions: 20, lastAt: 0 },
      { now: 0, lastAction: 'rest' },
      HABIT_DEFAULTS,
    ),
  ).toBe(0);
});

test('an after-only habit learns from the actual preceding action', () => {
  const p = person();
  p.frame = { ...p.frame, at: 86400000 };
  const act = activity(offer('tea', { durationMs: 86400000 }));
  const existing = [{ action: 'tea', cue: { after: 'work' }, strength: 0.5, repetitions: 10, lastAt: 0 }];
  const result = habitsOwner.learn(
    existing,
    { activity: act, outcome: outcome(act) },
    { ...p.frame, lastAction: 'work' },
  ).state;
  expect(result).toHaveLength(1);
  expect(result[0]?.strength).toBeGreaterThan(0.5);
  expect(result[0]?.repetitions).toBe(11);
});
