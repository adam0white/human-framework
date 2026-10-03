import { describe, expect, test } from 'vitest';
import { advanceHabits, cueMatches, HABIT_DEFAULTS, habitPull, reinforce } from '../src/habits/index.ts';
import type { Affordance, Habit, Person } from '../src/types.ts';

const DAY = 1440;
const H = 60;
type P = Pick<Person, 'habits'>;
const aff = (action: string): Affordance => ({
  id: action,
  action,
  label: action,
  duration: 10,
  effort: 0,
  advertises: {},
});

/** Daily repetition at 07:15 at home after waking, with advanceHabits between. */
function daily(p: P, days: number, skip: Set<number> = new Set()): number[] {
  const out: number[] = [];
  let t = 0;
  for (let d = 0; d < days; d++) {
    const at = d * DAY + 7 * H + 15;
    advanceHabits(p, at - t);
    t = at;
    if (!skip.has(d)) reinforce(p, 'pray', { now: at, placeId: 'home', lastAction: 'wake' });
    out.push(p.habits[0]?.strength ?? 0);
  }
  return out;
}

describe('habits', () => {
  test('cueMatches: hour falloff, place/after exact, absent cues ignored, no cue -> 0', () => {
    const h: Habit = {
      cue: { hour: 7, placeId: 'home' },
      action: 'a',
      strength: 1,
      repetitions: 1,
      lastAt: 0,
    };
    expect(cueMatches(h, { now: 7 * H + 10, placeId: 'home' })).toBe(1);
    expect(cueMatches(h, { now: 8 * H, placeId: 'home' })).toBeCloseTo(1, 6);
    expect(cueMatches(h, { now: 8 * H + 30, placeId: 'home' })).toBeCloseTo(0.5, 6);
    expect(cueMatches(h, { now: 6 * H + 30, placeId: 'home' })).toBeCloseTo(0.5, 6);
    expect(cueMatches(h, { now: 9 * H, placeId: 'home' })).toBe(0);
    expect(cueMatches(h, { now: 7 * H, placeId: 'work' })).toBe(0);
    expect(cueMatches(h, { now: 7 * H, placeId: 'home', lastAction: 'x' })).toBe(1);
    const late: Habit = { ...h, cue: { hour: 23 } };
    expect(cueMatches(late, { now: 3 * DAY + 10 })).toBeGreaterThan(0); // wraps past midnight
    expect(cueMatches({ ...h, cue: {} }, { now: 7 * H })).toBe(0);
  });

  test('daily repetition at same hour/place forms a habit that plateaus after ~2 months (Lally)', () => {
    const p: P = { habits: [] };
    const s = daily(p, 200);
    expect(p.habits).toHaveLength(1);
    const plateau = s[199] as number;
    expect(plateau).toBeGreaterThan(0.8);
    const day = s.findIndex((x) => x >= 0.95 * plateau) + 1;
    expect(day).toBeGreaterThan(45);
    expect(day).toBeLessThan(90);
    // Early gains are larger than late gains.
    expect((s[10] as number) - (s[0] as number)).toBeGreaterThan((s[110] as number) - (s[100] as number));
    expect(
      habitPull(p, aff('pray'), { now: 300 * DAY + 7 * H, placeId: 'home', lastAction: 'wake' }),
    ).toBeCloseTo(p.habits[0]?.strength ?? 0, 6);
    expect(habitPull(p, aff('pray'), { now: 300 * DAY + 15 * H, placeId: 'home', lastAction: 'wake' })).toBe(
      0,
    );
    expect(habitPull(p, aff('eat'), { now: 300 * DAY + 7 * H, placeId: 'home', lastAction: 'wake' })).toBe(0);
  });

  test('missing an occasional day barely hurts', () => {
    const a: P = { habits: [] };
    const b: P = { habits: [] };
    const full = daily(a, 60);
    const skipped = daily(b, 60, new Set([20, 41]));
    expect((full[59] as number) - (skipped[59] as number)).toBeLessThan(0.05);
    expect(skipped[59] as number).toBeGreaterThan(0.5);
  });

  test('rapid repeats do not build a habit in an afternoon (spacing)', () => {
    const p: P = { habits: [] };
    for (let i = 0; i < 60; i++) reinforce(p, 'snack', { now: 14 * H + i, placeId: 'home' });
    expect(p.habits[0]?.strength ?? 0).toBeLessThan(0.1);
    expect(p.habits).toHaveLength(1);
  });

  test('different places or preceding actions give distinct habits; nearby times share one', () => {
    const p: P = { habits: [] };
    reinforce(p, 'coffee', { now: 8 * H, placeId: 'home' });
    reinforce(p, 'coffee', { now: DAY + 8 * H + 50, placeId: 'home' });
    expect(p.habits).toHaveLength(1);
    reinforce(p, 'coffee', { now: 2 * DAY + 8 * H, placeId: 'work' });
    reinforce(p, 'coffee', { now: 3 * DAY + 8 * H, placeId: 'home', lastAction: 'run' });
    expect(p.habits).toHaveLength(3);
    expect(reinforce(p, '', { now: 0 })).toBeNull();
  });

  test('bounded at 40 habits, evicting the weakest', () => {
    const p: P = { habits: [] };
    for (let d = 0; d < 30; d++) reinforce(p, 'strong', { now: d * DAY + 6 * H, placeId: 'home' });
    for (let i = 0; i < 60; i++) reinforce(p, `a${i}`, { now: 40 * DAY + i, placeId: 'x' });
    expect(p.habits.length).toBe(HABIT_DEFAULTS.maxHabits);
    expect(p.habits.some((h) => h.action === 'strong')).toBe(true);
    expect(p.habits.some((h) => h.action === 'a59')).toBe(true);
  });

  test('decay is slow and split-consistent; strength bounded', () => {
    const a: P = { habits: [{ cue: { hour: 7 }, action: 'a', strength: 0.8, repetitions: 60, lastAt: 0 }] };
    const b: P = JSON.parse(JSON.stringify(a));
    advanceHabits(a, 600);
    for (let i = 0; i < 600; i++) advanceHabits(b, 1);
    expect(a.habits[0]?.strength).toBeCloseTo(b.habits[0]?.strength ?? 0, 9);
    advanceHabits(a, DAY);
    expect(a.habits[0]?.strength ?? 0).toBeGreaterThan(0.79);
    advanceHabits(a, 365 * DAY);
    expect(a.habits[0]?.strength ?? 1).toBeLessThan(0.3);
    expect(a.habits[0]?.strength ?? -1).toBeGreaterThanOrEqual(0);
  });

  test('headless control: Lally-style asymptotic curve vs linear accumulation', () => {
    // A linear counter (strength = reps / 66) has equal day-1 and day-60 gains and would exceed 1;
    // the model front-loads gains and saturates.
    const p: P = { habits: [] };
    const s = daily(p, 120);
    const early = (s[5] as number) - (s[4] as number);
    const late = (s[65] as number) - (s[64] as number);
    expect(early).toBeGreaterThan(3 * late);
    expect(Math.max(...s)).toBeLessThan(1);
  });
});

describe('action-wide refractory (engine 1.3.0)', () => {
  test('a habit just answered under another cue holds back every habit for the same action', () => {
    const mk = (hour: number, lastAt: number): Habit => ({
      cue: { hour },
      action: 'smoke',
      strength: 0.9,
      repetitions: 50,
      lastAt,
    });
    const now = 10 * DAY + 10 * H;
    // The 10:00 habit was last done yesterday; a 09:00 habit was answered 20 minutes ago.
    const fresh: P = { habits: [mk(10, now - DAY)] };
    const chained: P = { habits: [mk(10, now - DAY), mk(9, now - 20)] };
    const ctx = { now, placeId: 'home' };
    expect(habitPull(chained, aff('smoke'), ctx)).toBeLessThan(habitPull(fresh, aff('smoke'), ctx) / 2);
    // Answered a full refractory ago, the other habit no longer holds it back.
    const rested: P = { habits: [mk(10, now - DAY), mk(9, now - HABIT_DEFAULTS.refractory)] };
    expect(habitPull(rested, aff('smoke'), ctx)).toBeGreaterThan(habitPull(chained, aff('smoke'), ctx));
  });
});
