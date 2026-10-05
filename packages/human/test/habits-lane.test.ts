import { describe, expect, test } from 'vitest';
import { COGNITION_DEFAULTS } from '../src/cognition/index.ts';
import {
  advanceHabits,
  HABIT_DEFAULTS,
  habitEase,
  habitPull,
  habitUrge,
  reinforce,
  withholdCued,
} from '../src/habits/index.ts';
import type { Affordance, Habit, Person } from '../src/types.ts';

const DAY = 1440;
const H = 60;
type P = Pick<Person, 'habits'>;
const aff = (action: string, effort = 0, focus = 0): Affordance => ({
  id: action,
  action,
  label: action,
  duration: 10,
  effort,
  focus,
  advertises: {},
});
const smokeAfterEat = (strength: number, craving?: number): Habit => {
  const h: Habit = { cue: { after: 'eat' }, action: 'smoke', strength, repetitions: 5000, lastAt: 0 };
  if (craving !== undefined) h.craving = craving;
  return h;
};

/** Daily lunch at 13:00; after it he completes `next` (smoke = performs, anything else = withholds). */
function lunches(p: P, days: number, next: (d: number) => string, from = 0): number[] {
  const out: number[] = [];
  let t = from * DAY;
  for (let d = from; d < from + days; d++) {
    const at = d * DAY + 13 * H + 30;
    advanceHabits(p, at - t);
    t = at;
    const ctx = { now: at, lastAction: 'eat' };
    out.push(habitPull(p, aff('smoke'), ctx));
    const a = next(d);
    if (a === 'smoke') reinforce(p, 'smoke', ctx);
    withholdCued(p, a, ctx);
  }
  return out;
}

describe('N8 extinction by withholding', () => {
  test('a plateau habit withheld daily falls below 0.5 within a month; decay alone barely moves it', () => {
    const withheld: P = { habits: [smokeAfterEat(0.9)] };
    lunches(withheld, 30, () => 'tea');
    expect(withheld.habits[0]?.strength ?? 1).toBeLessThan(0.5);
    expect(withheld.habits[0]?.withheld).toBe(30);
    // Cue never recurs (he no longer eats lunch there): only the 120-day decay applies.
    const absent: P = { habits: [smokeAfterEat(0.9)] };
    advanceHabits(absent, 30 * DAY);
    expect(absent.habits[0]?.strength ?? 0).toBeGreaterThan(0.75);
    // ...and it pulls again as soon as the old context returns (habit discontinuity, Wood et al. 2005).
    expect(habitPull(absent, aff('smoke'), { now: 31 * DAY, lastAction: 'eat' })).toBeGreaterThan(0.75);
  });

  test('performing the habit is not withholding; unmatched cues are untouched; one loss per occasion', () => {
    const p: P = {
      habits: [
        smokeAfterEat(0.9),
        { cue: { placeId: 'masjid' }, action: 'pray', strength: 0.6, repetitions: 50, lastAt: 0 },
      ],
    };
    expect(withholdCued(p, 'smoke', { now: DAY, lastAction: 'eat' })).toHaveLength(0);
    const ctx = { now: 2 * DAY, lastAction: 'eat', placeId: 'shop' };
    expect(withholdCued(p, 'tea', ctx).map((h) => h.action)).toEqual(['smoke']);
    const once = p.habits[0]?.strength ?? 0;
    withholdCued(p, 'talk', { ...ctx, now: ctx.now + 10 });
    expect(once - (p.habits[0]?.strength ?? 0)).toBeLessThan(1e-3);
    expect(p.habits[1]?.strength).toBe(0.6);
    expect(withholdCued(p, '', ctx)).toHaveLength(0);
  });

  test('withholding is asymmetric: smaller per occasion than a repetition gains', () => {
    expect(HABIT_DEFAULTS.extinction).toBeLessThan(HABIT_DEFAULTS.gain);
  });
});

describe('urges after abstinence', () => {
  test('a craving habit pulls harder for a few days of abstinence, then falls below where it started', () => {
    const p: P = { habits: [smokeAfterEat(0.9, 1)] };
    lunches(p, 10, () => 'smoke'); // ordinary smoking days: no urge on top
    const steady = lunches(p, 1, () => 'tea', 10)[0] ?? 0;
    const quit = lunches(p, 30, () => 'tea', 11);
    const peak = Math.max(...quit.slice(0, 7));
    expect(steady).toBeGreaterThan(0.85);
    expect(peak).toBeGreaterThan(steady + 0.1);
    expect(quit.indexOf(peak)).toBeGreaterThanOrEqual(1);
    expect(quit.indexOf(peak)).toBeLessThanOrEqual(5);
    expect(quit[29] ?? 1).toBeLessThan(steady * 0.6);
    // Relapse resets abstinence: no urge the next day.
    lunches(p, 1, () => 'smoke', 41);
    const h = p.habits[0];
    expect(h ? habitUrge(h, 42 * DAY + 13 * H + 30) : 1).toBe(0);
  });

  test('without host-set craving, withholding only lowers the pull', () => {
    const p: P = { habits: [smokeAfterEat(0.9)] };
    const pulls = lunches(p, 20, () => 'tea');
    for (let i = 1; i < pulls.length; i++) expect(pulls[i] ?? 1).toBeLessThanOrEqual(pulls[i - 1] ?? 0);
  });
});

describe('habitEase', () => {
  test('1 without a cued habit; falls toward 1 - easeMax with cued strength; ignores urges', () => {
    const none: P = { habits: [] };
    expect(habitEase(none, aff('smoke'), { now: 0, lastAction: 'eat' })).toBe(1);
    const p: P = { habits: [smokeAfterEat(1, 1)] };
    expect(habitEase(p, aff('smoke'), { now: 0, lastAction: 'eat' })).toBeCloseTo(
      1 - HABIT_DEFAULTS.easeMax,
      9,
    );
    expect(habitEase(p, aff('smoke'), { now: 0, lastAction: 'pray' })).toBe(1);
    const weak: P = { habits: [smokeAfterEat(0.4)] };
    expect(habitEase(weak, aff('smoke'), { now: 0, lastAction: 'eat' })).toBeCloseTo(
      1 - 0.4 * HABIT_DEFAULTS.easeMax,
      9,
    );
    if (p.habits[0]) p.habits[0].withheld = 3;
    expect(habitEase(p, aff('smoke'), { now: 5 * DAY, lastAction: 'eat' })).toBeCloseTo(
      1 - HABIT_DEFAULTS.easeMax,
      9,
    );
  });
});

/**
 * N4 calibration experiment (docs/games/voice.md §13). Question: should a plateau habit only add utility
 * (current `habitScale` term), add utility scaled by the action's cost, or lower the cost of the habitual
 * action (habitEase)? Discriminating finding: Neal, Wood & Drolet (2013, JPSP 104:959): when self-control is
 * depleted, people fall back on their habits; habit performance rises relative to deliberate alternatives.
 * Prediction checked: the habitual person's advantage for the habitual option over a deliberate
 * alternative must GROW from a fresh to a depleted state. Only the effort and habit terms differ between
 * the hypotheses; every other term is identical across conditions and cancels.
 */
describe('N4 habit-term calibration experiment', () => {
  const K = COGNITION_DEFAULTS;
  // Plateau habit built the way the game builds it: ~66 spaced daily repetitions.
  const habitual: P = { habits: [] };
  let t = 0;
  for (let d = 0; d < 66; d++) {
    const at = d * DAY + 5 * H + 10;
    advanceHabits(habitual, at - t);
    t = at;
    reinforce(habitual, 'pray', { now: at, placeId: 'masjid' });
  }
  const now = 66 * DAY + 5 * H + 10;
  const ctx = { now, placeId: 'masjid' };
  const pray = { ...aff('pray', 0.3, 0.4), placeId: 'masjid' };
  const pull = habitPull(habitual, pray, ctx);
  const ease = habitEase(habitual, pray, ctx);
  const fitness = 0.4;

  type Model = 'additive' | 'cost-scaled' | 'ease-all' | 'ease-initiation';
  /** Effort + habit terms for an option, mirroring cognition.consider (maturity 1). */
  function terms(
    model: Model,
    a: Affordance,
    habit: number,
    e: number,
    fatigue: number,
    sleepiness: number,
  ): number {
    const effort = a.effort;
    const focus = a.focus ?? 0;
    const initiation = effort * K.effortBase + focus * sleepiness;
    const physical = effort * fatigue * (1 - fitness);
    let cost = initiation + physical;
    let h = K.habitScale * habit;
    if (model === 'cost-scaled') h *= 1 + effort + focus;
    if (model === 'ease-all') cost *= e;
    if (model === 'ease-initiation') cost = initiation * e + physical;
    return h - K.effortScale * cost;
  }
  const deliberate = aff('read', 0.05, 0.6); // the alternative he would choose by thinking it through
  /** Habitual person's margin (pray - read) minus a non-habitual person's margin. */
  function advantage(model: Model, fatigue: number, sleepiness: number): number {
    const withHabit =
      terms(model, pray, pull, ease, fatigue, sleepiness) -
      terms(model, deliberate, 0, 1, fatigue, sleepiness);
    const without =
      terms(model, pray, 0, 1, fatigue, sleepiness) - terms(model, deliberate, 0, 1, fatigue, sleepiness);
    return withHabit - without;
  }
  const fresh = [0.15, 0.15] as const;
  const depleted = [0.7, 0.75] as const;

  test('setup: a real plateau habit', () => {
    expect(pull).toBeGreaterThan(0.6);
    expect(ease).toBeLessThan(0.75);
  });

  test('additive and cost-scaled habit terms cannot reproduce depletion -> habit (rejected)', () => {
    for (const m of ['additive', 'cost-scaled'] as const)
      expect(advantage(m, ...depleted) - advantage(m, ...fresh)).toBeCloseTo(0, 9);
  });

  test('an ease multiplier reproduces it (accepted)', () => {
    for (const m of ['ease-all', 'ease-initiation'] as const)
      expect(advantage(m, ...depleted)).toBeGreaterThan(advantage(m, ...fresh) + 0.05);
  });

  test('ease does not overturn the 2026-10-03 negative finding: habit alone still loses to a moderate sleep need', () => {
    // docs/findings.md: a 30-day pray habit (term ~0.41) loses to a moderate sleep need (~0.77) at 05:10.
    const h30: P = { habits: [] };
    let s = 0;
    for (let d = 0; d < 30; d++) {
      const at = d * DAY + 5 * H + 10;
      advanceHabits(h30, at - s);
      s = at;
      reinforce(h30, 'pray', { now: at, placeId: 'masjid' });
    }
    const c30 = { now: 30 * DAY + 5 * H + 10, placeId: 'masjid' };
    const prayTerm = terms(
      'ease-initiation',
      pray,
      habitPull(h30, pray, c30),
      habitEase(h30, pray, c30),
      0.3,
      0.6,
    );
    const sleepNeedTerm = 0.77;
    const sleepEffort = 0; // sleeping costs nothing
    expect(prayTerm).toBeLessThan(sleepNeedTerm - sleepEffort);
  });
});
