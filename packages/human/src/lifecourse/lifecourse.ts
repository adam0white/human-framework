/**
 * SCOPE: age-dependent multipliers for other faculties. Age comes from `p.life.bornAt` and `p.now`. The
 * shapes are smooth engineering curves: metabolic demand is higher in youth; recovery declines gradually
 * after about 30; learning rate is higher in childhood and declines gently; maturity of planning and
 * inhibition rises through adolescence and reaches 1 by about 25; maximum fitness peaks between 20 and 35.
 * Age-only mortality follows a Gompertz law (hazard about 0.0005/year at 30, doubling every 8 years).
 * These are not calibrated predictions. Infant and juvenile mortality, sex differences, cohort effects and
 * individual variation are not modelled. There is deliberately no universal age penalty: each multiplier
 * has its own trajectory, and consumers decide which ones apply.
 */
import { clamp, smoothstep } from '../core/index.ts';
import type { LifeModifiers, LifeStage, Person } from '../types.ts';
import { MINUTES_PER_YEAR } from '../types.ts';

export const LIFE_DEFAULTS = {
  /** Gompertz hazard at the reference age, per year. */
  gompertzBase: 0.0005,
  gompertzRefAge: 30,
  /** Years for the age-only hazard to double. */
  gompertzDoublingYears: 8,
  /** Fractional maxFitness lost per year after the plateau. */
  fitnessDeclinePerYear: 0.008,
  fitnessPlateauEnd: 35,
  /** Fractional recovery lost per year after 30. */
  recoveryDeclinePerYear: 0.008,
};

export function ageYears(p: Person): number {
  return (p.now - p.life.bornAt) / MINUTES_PER_YEAR;
}

export function stageForAge(age: number): LifeStage {
  if (age < 2) return 'infant';
  if (age < 12) return 'child';
  if (age < 18) return 'adolescent';
  if (age < 65) return 'adult';
  return 'elder';
}

export function lifeStage(p: Person): LifeStage {
  return stageForAge(ageYears(p));
}

/** Modifiers for a given age in years. 1 = prime adult for each multiplier. */
export function modifiersForAge(age: number, params = LIFE_DEFAULTS): LifeModifiers {
  const a = Math.max(0, age);
  const metabolism = 1 + 0.5 * Math.exp(-a / 6) - 0.15 * smoothstep(50, 80, a);
  const recovery = clamp(
    1.1 - 0.1 * smoothstep(15, 30, a) - params.recoveryDeclinePerYear * Math.max(0, a - 30),
    0.4,
    1.2,
  );
  const learning = clamp(0.9 + 0.5 * Math.exp(-a / 10) - 0.003 * Math.max(0, a - 30), 0.5, 1.5);
  const maturity = 0.1 + 0.9 * smoothstep(2, 25, a);
  const maxFitness = clamp(
    a < 20
      ? 0.3 + 0.7 * smoothstep(0, 20, a)
      : 1 - params.fitnessDeclinePerYear * Math.max(0, a - params.fitnessPlateauEnd),
    0.15,
    1,
  );
  const mortalityPerYear = Math.min(
    1,
    params.gompertzBase * 2 ** ((a - params.gompertzRefAge) / params.gompertzDoublingYears),
  );
  return {
    ageYears: age,
    stage: stageForAge(age),
    metabolism,
    recovery,
    learning,
    maturity,
    maxFitness,
    mortalityPerYear,
  };
}

export function lifeModifiers(p: Person): LifeModifiers {
  return modifiersForAge(ageYears(p));
}
