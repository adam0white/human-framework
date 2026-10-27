import { describe, expect, test } from 'vitest';
import { HABIT_DEFAULTS, habitsOwner, materializeHabits } from '../src/habits/habits.ts';

describe('HF4 anchored habits', () => {
  test('materialization targets do not compound decay or change the retained anchor', () => {
    const anchor = {
      anchor: { at: -60000, conditionId: 'same-context' },
      state: [{ action: 'tea', cue: { hour: 12 }, strength: 0.8, repetitions: 20, lastAt: -60000 }],
    };
    const snapshot = structuredClone(anchor);
    const halfLife = HABIT_DEFAULTS.decayHalfLife;
    for (const at of [1, 123456, 86400000]) materializeHabits(anchor, at, halfLife);
    const finalAt = anchor.anchor.at + halfLife * 60000;
    const final = materializeHabits(anchor, finalAt, halfLife);
    expect(final[0]?.strength).toBeCloseTo(0.4, 14);
    expect(materializeHabits(structuredClone(anchor), finalAt, halfLife)).toEqual(final);
    expect(anchor).toEqual(snapshot);
    expect(habitsOwner.validate(final)).toEqual([]);
  });
  test('unsafe duration and backwards spans reject before materializing', () => {
    const state = { anchor: { at: -Number.MAX_SAFE_INTEGER, conditionId: 'condition' }, state: [] };
    expect(() => materializeHabits(state, Number.MAX_SAFE_INTEGER, HABIT_DEFAULTS.decayHalfLife)).toThrow(
      RangeError,
    );
    expect(() =>
      materializeHabits(state, -Number.MAX_SAFE_INTEGER - 1, HABIT_DEFAULTS.decayHalfLife),
    ).toThrow(RangeError);
  });
});
