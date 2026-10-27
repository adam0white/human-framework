import { freezeData } from '../body/span.ts';
/** SCOPE: source engineering health hazards. Per-year intensity is not probability. */

import { clip } from '../body/span.ts';
import { dexp, dpow } from '../core/libm.ts';
import type * as T from '../run-schema.ts';
export const HEALTH_DEFAULTS = Object.freeze({
  smokingRisk: 2,
  sleepDebtRiskPerHour: 0.03,
  maxSleepDebtHours: 20,
  fitnessRisk: 0.6,
  healthMortality: 3,
  illnessMortality: 2,
});
export const CHRONIC_CONDITIONS: readonly T.ChronicConditionData[] = freezeData([
  {
    kind: 'hypertension',
    baseHazard: 0.012,
    refAge: 40,
    doublingYears: 14,
    severity: 0.2,
    sources: [{ kind: 'assumption', ref: 'lifecourse/health.ts: engineering default; shape only' }],
  },
  {
    kind: 'arthritis',
    baseHazard: 0.004,
    refAge: 40,
    doublingYears: 12,
    severity: 0.2,
    sources: [{ kind: 'assumption', ref: 'lifecourse/health.ts: engineering default; shape only' }],
  },
  {
    kind: 'diabetes',
    baseHazard: 0.004,
    refAge: 40,
    doublingYears: 16,
    severity: 0.25,
    sources: [{ kind: 'assumption', ref: 'lifecourse/health.ts: engineering default; shape only' }],
  },
]);
export function chronicHazard(
  age: number,
  c: T.DeepReadonly<T.ChronicConditionData>,
  exposures: T.DeepReadonly<T.Exposures>,
  p: T.DeepReadonly<T.Effective_HEALTH_DEFAULTS>,
): number {
  const risk =
    (1 + (p.smokingRisk - 1) * clip(exposures.smoking ?? 0)) *
    (1 + p.sleepDebtRiskPerHour * clip(exposures.sleepDebtHours ?? 0, 0, p.maxSleepDebtHours)) *
    clip(1 + p.fitnessRisk * (0.5 - (exposures.fitness ?? 0.5)), 0.6, 1.5);
  return Math.min(1, c.baseHazard * dpow(2, (age - c.refAge) / c.doublingYears) * risk);
}
/** Frozen-age one-year diagnostic; changed from 3.x product of (1-h). */
export function chronicRiskPerYear(
  age: number,
  exposures: T.DeepReadonly<T.Exposures>,
  conditions: readonly T.DeepReadonly<T.ChronicConditionData>[],
  p: T.DeepReadonly<T.Effective_HEALTH_DEFAULTS>,
): number {
  return 1 - dexp(-conditions.reduce((s, c) => s + chronicHazard(age, c, exposures, p), 0));
}
