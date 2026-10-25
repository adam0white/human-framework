import assert from 'node:assert/strict';
import { describe, expect, test } from 'vitest';
import { hostApiSpec, runHostApiControl } from '../examples/host-api-control.ts';
import { addTiredness } from '../src/body/index.ts';
import { HABIT_DEFAULTS } from '../src/habits/index.ts';
import { MEMORY_DEFAULTS } from '../src/memory/index.ts';
import { createPerson } from '../src/person.ts';
import type { ActionExpectation, Habit } from '../src/types.ts';
import { gestureVoiceTrust, WILL_DEFAULTS } from '../src/will/index.ts';

const habit: Habit = {
  cue: { hour: 7, placeId: 'home', after: 'wake' },
  action: 'eat',
  strength: 0.4,
  repetitions: 3,
  lastAt: -1440,
  craving: 0.2,
  withheld: 1,
  lastWithheldAt: -60,
};
const expectation: ActionExpectation = {
  key: 'eat@home',
  needs: { food: 0.5, autonomy: -0.1 },
  successRate: 0.8,
  samples: 4,
  valence: 0.3,
};

describe('authored habit and expectation setup', () => {
  test('copies validated inherited fields and strips unsupported nested data', () => {
    const metadata = { mutable: true };
    const inheritedHabit = Object.assign(Object.create(habit), {
      cue: Object.create({ hour: 7.5 }),
      metadata,
    });
    const inheritedExpectation = Object.assign(Object.create(expectation), {
      needs: { food: 0.5 },
      metadata,
    });
    const p = createPerson({
      ...hostApiSpec,
      habits: [inheritedHabit],
      expectations: [inheritedExpectation],
    });
    expect(p.habits[0]).toEqual({ ...habit, cue: { hour: 7.5 } });
    expect(p.memory.expectations[0]).toEqual({ ...expectation, needs: { food: 0.5 } });
    expect(JSON.stringify(p)).not.toContain('mutable');
    const input = { ...habit, metadata, cue: { ...habit.cue, metadata } };
    const detached = createPerson({ ...hostApiSpec, habits: [input] });
    expect(detached.habits[0]).toEqual(habit);
    metadata.mutable = false;
    expect(detached.habits[0]).toEqual(habit);
  });
  test('copies nested inputs in order without changing other state', () => {
    const habits = [structuredClone(habit), { ...habit, cue: {}, action: 'rest' }];
    const expectations = [structuredClone(expectation), { ...expectation, key: 'rest' }];
    const p = createPerson({ ...hostApiSpec, habits, expectations });
    const manual = createPerson(hostApiSpec);
    manual.habits = structuredClone(habits);
    manual.memory.expectations = structuredClone(expectations);
    expect(p).toEqual(manual);
    assert(habits[0] && expectations[0] && p.habits[1] && p.memory.expectations[1]);
    habits[0].cue.hour = 9;
    expectations[0].needs.food = 0;
    expect(p.habits[0]?.cue.hour).toBe(7);
    expect(p.memory.expectations[0]?.needs.food).toBe(0.5);
    p.habits[1].cue.placeId = 'elsewhere';
    p.memory.expectations[1].needs.food = 1;
    expect(habits[1]?.cue).toEqual({});
    expect(expectations[1]?.needs.food).toBe(0.5);
  });

  test('rejects invalid setup rather than clamping, reordering or evicting', () => {
    for (const bad of [
      { ...habit, action: '' },
      { ...habit, strength: Number.NaN },
      { ...habit, repetitions: -1 },
      { ...habit, cue: { hour: 24 } },
      { ...habit, craving: 2 },
    ])
      expect(() => createPerson({ ...hostApiSpec, habits: [bad] })).toThrow(RangeError);
    for (const bad of [
      { ...expectation, key: '' },
      { ...expectation, samples: 0.5 },
      { ...expectation, successRate: 2 },
      { ...expectation, valence: Infinity },
      { ...expectation, needs: { food: Number.NaN } },
    ])
      expect(() => createPerson({ ...hostApiSpec, expectations: [bad] })).toThrow(RangeError);
    expect(() =>
      createPerson({
        ...hostApiSpec,
        habits: Array.from({ length: HABIT_DEFAULTS.maxHabits + 1 }, () => habit),
      }),
    ).toThrow(RangeError);
    expect(() =>
      createPerson({
        ...hostApiSpec,
        expectations: Array.from({ length: MEMORY_DEFAULTS.maxExpectations + 1 }, () => expectation),
      }),
    ).toThrow(RangeError);
  });
});

test('trust gestures clamp, retain bounded history and change no other slices or voice fields', () => {
  const p = createPerson(hostApiSpec);
  const before = structuredClone(p);
  for (let i = 0; i < 10; i++)
    gestureVoiceTrust(p, 'host', i % 2 ? -2 : 2, {
      reason: `gesture-${i}`,
      at: i,
      action: 'care',
    });
  const v = p.will.voices[0];
  assert(v);
  expect(v.trust).toBe(0);
  expect(v.history).toHaveLength(WILL_DEFAULTS.maxVoiceHistory);
  expect(v.history.at(-1)).toEqual({ at: 9, delta: -1, reason: 'gesture-9', action: 'care' });
  const expected = before.will.voices[0];
  assert(expected);
  expected.trust = v.trust;
  expected.history = structuredClone(v.history);
  expect(p).toEqual(before);
  const unchanged = structuredClone(p);
  expect(gestureVoiceTrust(p, 'missing', 0.2, { reason: 'care' })).toBeUndefined();
  gestureVoiceTrust(p, 'host', NaN, { reason: 'care' });
  gestureVoiceTrust(p, 'host', 0, { reason: 'care' });
  expect(p).toEqual(unchanged);
});

test('small gestures use history folding and non-finite event time falls back to now', () => {
  const p = createPerson(hostApiSpec);
  gestureVoiceTrust(p, 'host', 0.001, { reason: 'care', at: NaN });
  gestureVoiceTrust(p, 'host', 0.001, { reason: 'care' });
  expect(p.will.voices[0]?.history).toHaveLength(1);
  expect(p.will.voices[0]?.history[0]).toMatchObject({ at: p.now, from: p.now, count: 2 });
});

test('malformed trust history metadata rejects before changing the person', () => {
  const p = createPerson(hostApiSpec);
  const before = structuredClone(p);
  expect(() => gestureVoiceTrust(p, 'host', 0.1, { reason: '' })).toThrow(RangeError);
  expect(() => gestureVoiceTrust(p, 'host', 0.1, { reason: undefined as unknown as string })).toThrow(
    RangeError,
  );
  expect(() => gestureVoiceTrust(p, 'host', 0.1, { reason: 'care', action: 2 as unknown as string })).toThrow(
    RangeError,
  );
  expect(p).toEqual(before);
});

test('tiredness costs saturate, ignore invalid costs, and leave a dead body unchanged', () => {
  const p = createPerson(hostApiSpec);
  const before = structuredClone(p);
  addTiredness(p, { sleepPressure: 2, exertion: 2 });
  before.body.sleepPressure = 1;
  before.body.exertion = 1;
  expect(p).toEqual(before);
  addTiredness(p, { sleepPressure: NaN, exertion: -1 });
  addTiredness(p, { sleepPressure: Infinity });
  addTiredness(p, {});
  expect(p).toEqual(before);
  p.body.alive = false;
  p.body.exertion = 0;
  const dead = structuredClone(p);
  addTiredness(p, { exertion: 0.5 });
  expect(p).toEqual(dead);
});

test('headless host API control preserves direct-write and omitted-option continuations', runHostApiControl);
