import { describe, expect, test } from 'vitest';
import { ageYears, lifeModifiers, lifeStage, modifiersForAge } from '../src/lifecourse/index.ts';
import type { Person } from '../src/types.ts';
import { MINUTES_PER_YEAR } from '../src/types.ts';

const at = (age: number) =>
  ({ now: 1000, life: { bornAt: 1000 - age * MINUTES_PER_YEAR, sex: 'male' } }) as unknown as Person;

describe('lifecourse', () => {
  test('age and stage boundaries', () => {
    expect(ageYears(at(30))).toBeCloseTo(30, 9);
    expect(lifeStage(at(1.9))).toBe('infant');
    expect(lifeStage(at(2))).toBe('child');
    expect(lifeStage(at(11.99))).toBe('child');
    expect(lifeStage(at(12))).toBe('adolescent');
    expect(lifeStage(at(18))).toBe('adult');
    expect(lifeStage(at(64.9))).toBe('adult');
    expect(lifeStage(at(65))).toBe('elder');
    expect(lifeModifiers(at(40)).stage).toBe('adult');
  });

  test('prime adult is ~1 on every multiplier', () => {
    const m = modifiersForAge(30);
    expect(m.metabolism).toBeCloseTo(1, 1);
    expect(m.recovery).toBeCloseTo(1, 2);
    expect(m.maturity).toBe(1);
    expect(m.maxFitness).toBe(1);
    expect(m.learning).toBeGreaterThan(0.9);
    expect(m.learning).toBeLessThan(1);
  });

  test('trajectories have their own shapes rather than one age penalty', () => {
    const ages = [1, 6, 14, 20, 25, 30, 35, 50, 70, 85];
    const ms = ages.map((a) => modifiersForAge(a));
    const get = (a: number) => ms[ages.indexOf(a)] ?? modifiersForAge(a);
    // Metabolism and learning highest in childhood.
    expect(get(6).metabolism).toBeGreaterThan(get(30).metabolism);
    expect(get(6).learning).toBeGreaterThan(get(30).learning);
    expect(get(70).learning).toBeLessThan(get(30).learning);
    // Maturity rises through adolescence and reaches 1 by 25.
    expect(get(6).maturity).toBeLessThan(get(14).maturity);
    expect(get(14).maturity).toBeLessThan(get(20).maturity);
    expect(get(25).maturity).toBe(1);
    expect(get(85).maturity).toBe(1);
    // Fitness ceiling plateaus 20-35 then declines; it is low in childhood.
    expect(get(20).maxFitness).toBe(1);
    expect(get(35).maxFitness).toBe(1);
    expect(get(6).maxFitness).toBeLessThan(0.7);
    expect(get(70).maxFitness).toBeLessThan(get(50).maxFitness);
    // Recovery declines gradually after 30.
    expect(get(50).recovery).toBeLessThan(get(30).recovery);
    expect(get(50).recovery).toBeGreaterThan(0.8);
    // Elders keep full maturity while recovery falls: no universal penalty.
    expect(get(70).maturity).toBeGreaterThan(get(14).maturity);
    for (const m of ms) {
      for (const v of [m.metabolism, m.recovery, m.learning, m.maturity, m.maxFitness]) {
        expect(v).toBeGreaterThan(0);
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  test('Gompertz mortality: ~0.0005 at 30, doubling every 8 years, capped at 1', () => {
    expect(modifiersForAge(30).mortalityPerYear).toBeCloseTo(0.0005, 6);
    expect(modifiersForAge(38).mortalityPerYear / modifiersForAge(30).mortalityPerYear).toBeCloseTo(2, 6);
    expect(modifiersForAge(200).mortalityPerYear).toBe(1);
  });

  test('headless control: Gompertz differs from a linear-in-age hazard with the same 30 and 38 values', () => {
    // Linear through (30, 5e-4) and (38, 1e-3) predicts 80-year hazard ~3.6e-3; Gompertz is an order larger.
    const linear80 = 0.0005 + ((0.001 - 0.0005) / 8) * 50;
    expect(modifiersForAge(80).mortalityPerYear).toBeGreaterThan(5 * linear80);
  });
});
