/** Scarcity-aware material term (Game 2 spec N13). */
import { describe, expect, test } from 'vitest';
import type { ConsiderContext } from '../src/index.ts';
import {
  actionTendencies,
  COGNITION_DEFAULTS,
  consider,
  createPerson,
  lifeModifiers,
  readPerson,
} from '../src/index.ts';
import type { Affordance, Person } from '../src/types.ts';
import { MINUTES_PER_DAY } from '../src/types.ts';

function person(): Person {
  return createPerson({
    id: 'halil',
    name: 'Halil',
    seed: 3,
    bornAt: -61 * 365 * MINUTES_PER_DAY,
    sex: 'male',
    now: 600,
    needs: { safety: 0.2 },
  });
}

function ctxOf(p: Person, scarcity?: number): ConsiderContext {
  const { body, needs, desperation } = readPerson(p);
  const ctx: ConsiderContext = {
    now: p.now,
    body,
    needs,
    mods: lifeModifiers(p),
    tendencies: actionTendencies(p),
    desperation,
    habit: { now: p.now },
  };
  if (scarcity !== undefined) ctx.scarcity = scarcity;
  return ctx;
}

const repair = (material: number): Affordance => ({
  id: `repair${material}`,
  action: 'repair',
  label: 'repair',
  duration: 60,
  effort: 0.2,
  advertises: {},
  material,
});
const SAVE: Affordance = {
  id: 'save',
  action: 'save',
  label: 'save',
  duration: 10,
  effort: 0,
  advertises: { safety: 0.2 },
};

const term = (p: Person, a: Affordance, scarcity: number | undefined, source: string): number =>
  consider(p, a, ctxOf(p, scarcity)).terms.find((t) => t.source === source)?.value ?? 0;

describe('scarcity', () => {
  test('absent, zero or non-finite scarcity leaves every term exactly as before', () => {
    const p = person();
    const base = consider(p, repair(3), ctxOf(p));
    expect(consider(p, repair(3), ctxOf(p, 0))).toEqual(base);
    expect(consider(p, repair(3), ctxOf(p, Number.NaN))).toEqual(base);
    expect(consider(p, SAVE, ctxOf(p, 0))).toEqual(consider(p, SAVE, ctxOf(p)));
  });

  test('a small sum weighs more to a man far behind (slower saturation)', () => {
    const p = person();
    const calm = term(p, repair(3), 0, 'material');
    const short = term(p, repair(3), 1, 'material');
    expect(calm).toBeGreaterThan(0);
    expect(short / calm).toBeGreaterThan(1.5);
    // Large sums saturate either way, so scarcity mainly lifts the small ones.
    const bigRatio = term(p, repair(200), 1, 'material') / term(p, repair(200), 0, 'material');
    expect(bigRatio).toBeLessThan(short / calm);
  });

  test('spending also hurts more, and the safety need term rises with scarcity', () => {
    const p = person();
    expect(term(p, repair(-3), 1, 'material')).toBeLessThan(term(p, repair(-3), 0, 'material'));
    const s0 = term(p, SAVE, 0, 'need:safety');
    expect(s0).toBeGreaterThan(0);
    expect(term(p, SAVE, 1, 'need:safety') / s0).toBeCloseTo(1 + COGNITION_DEFAULTS.scarcitySafetyGain, 2);
  });

  test('scarcity is clamped to 0..1', () => {
    const p = person();
    expect(term(p, repair(3), 5, 'material')).toBe(term(p, repair(3), 1, 'material'));
    expect(term(p, repair(3), -1, 'material')).toBe(term(p, repair(3), 0, 'material'));
  });

  test('regression: scarcity does not lift money past its ceiling, and a strong trusted voice with a reason still wins (review 2026-10-03)', () => {
    const p = createPerson({
      id: 'halil',
      name: 'Halil',
      seed: 3,
      bornAt: -61 * 365 * MINUTES_PER_DAY,
      sex: 'male',
      now: 600,
      voices: [{ voiceId: 'you', trust: 0.9 }],
    });
    const ceiling = 2 * COGNITION_DEFAULTS.materialWeight;
    for (const m of [3, 25, 300]) expect(term(p, repair(m), 1, 'material')).toBeLessThanOrEqual(ceiling);
    const walk: Affordance = {
      id: 'walk',
      action: 'walk',
      label: 'walk',
      duration: 30,
      effort: 0.2,
      advertises: {},
    };
    const ctx = ctxOf(p, 1);
    ctx.suggestion = { voiceId: 'you', action: 'walk', strength: 0.9, appeal: 'duty' };
    const w = consider(p, walk, ctx).utility;
    const r = consider(p, repair(25), ctx).utility;
    expect(w).toBeGreaterThan(r);
  });
});
