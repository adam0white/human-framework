/**
 * SCOPE: long-horizon health trajectory and mortality helpers, all host opt-in. `chronicHazard` gives the
 * yearly onset hazard of a catalogued chronic condition: it rises exponentially with age (a Gompertz-like
 * incidence curve, the common shape of age-related chronic disease) and is scaled by a few exposures as
 * relative risks (smoking, chronic sleep debt, low fitness). `chronicOnsets` rolls those hazards over an
 * interval; `mortalityEvent` rolls death from the Gompertz age hazard in `LifeModifiers` (doubling about every
 * 8 years) raised by poor health and illness load. The condition list, hazards and relative risks are
 * engineering assumptions chosen for plausible game-time behaviour, not epidemiological estimates for any
 * population; infant mortality, sex differences, period effects and treatment are not modelled. These helpers
 * never write the body: they return proposed illnesses or a death the composite applies, and they draw only from
 * the RNG the caller passes, so a host that does not call them keeps an unchanged random stream.
 */
import { chance, clamp, clamp01, dexp, dpow } from '../core/index.ts';
import type { Illness, NormDefinition, Person, RngState, Unit } from '../types.ts';
import { MINUTES_PER_YEAR } from '../types.ts';
import { ageYears, modifiersForAge } from './lifecourse.ts';

export interface ChronicCondition {
  kind: string;
  /** Onset hazard per year at `refAge`. */
  baseHazard: number;
  refAge: number;
  /** Years for the hazard to double. */
  doublingYears: number;
  /** Severity at onset, 0..1. */
  severity: Unit;
  /** Provenance of the numbers (here: engineering assumptions). */
  sources: NonNullable<NormDefinition['sources']>;
}

const ASSUMED: ChronicCondition['sources'] = [
  {
    kind: 'assumption',
    ref: 'lifecourse/health.ts: engineering default; shape only (incidence rising with age)',
  },
];

/** Default catalogue. Hosts pass their own list to change or extend it. */
export const CHRONIC_CONDITIONS: readonly ChronicCondition[] = [
  { kind: 'hypertension', baseHazard: 0.012, refAge: 40, doublingYears: 14, severity: 0.2, sources: ASSUMED },
  { kind: 'arthritis', baseHazard: 0.004, refAge: 40, doublingYears: 12, severity: 0.2, sources: ASSUMED },
  { kind: 'diabetes', baseHazard: 0.004, refAge: 40, doublingYears: 16, severity: 0.25, sources: ASSUMED },
];

/** Exposures that scale chronic hazards as relative risks. Hosts supply what they track. */
export interface HealthExposures {
  /** Smoking intensity 0..1 (host-tracked; the framework has no substance model). */
  smoking?: Unit;
  /** Chronic sleep debt in hours (defaults to the person's `body.sleepDebt` in `chronicOnsets`). */
  sleepDebtHours?: number;
  /** Fitness 0..1 (defaults to `body.fitness` in `chronicOnsets`). */
  fitness?: Unit;
  /** Extra host multiplier on every hazard. */
  multiplier?: number;
}

export const HEALTH_DEFAULTS = {
  /** Relative risk at full smoking intensity. */
  smokingRisk: 2,
  /** Added relative risk per hour of sleep debt, up to `maxSleepDebtHours`. */
  sleepDebtRiskPerHour: 0.03,
  maxSleepDebtHours: 20,
  /** Added relative risk per unit of fitness below 0.5 (and reduction above it). */
  fitnessRisk: 0.6,
  /** Mortality multiplier per unit of health lost. */
  healthMortality: 3,
  /** Mortality multiplier per unit of summed illness severity. */
  illnessMortality: 2,
};

/** Relative risk from exposures (1 = none). */
export function exposureRisk(exposures: HealthExposures = {}, params = HEALTH_DEFAULTS): number {
  const smoking = 1 + (params.smokingRisk - 1) * clamp01(exposures.smoking ?? 0);
  const debt =
    1 + params.sleepDebtRiskPerHour * clamp(exposures.sleepDebtHours ?? 0, 0, params.maxSleepDebtHours);
  const fitness = clamp(1 + params.fitnessRisk * (0.5 - (exposures.fitness ?? 0.5)), 0.6, 1.5);
  return smoking * debt * fitness * Math.max(0, exposures.multiplier ?? 1);
}

/** Yearly onset hazard of one condition at an age under exposures. */
export function chronicHazard(
  age: number,
  condition: ChronicCondition,
  exposures: HealthExposures = {},
): number {
  const h = condition.baseHazard * dpow(2, (age - condition.refAge) / condition.doublingYears);
  return Math.min(1, h * exposureRisk(exposures));
}

/** Probability of at least one new chronic condition within a year (none held yet). */
export function chronicRiskPerYear(
  age: number,
  exposures: HealthExposures = {},
  conditions: readonly ChronicCondition[] = CHRONIC_CONDITIONS,
): Unit {
  let none = 1;
  for (const c of conditions) none *= 1 - chronicHazard(age, c, exposures);
  return 1 - none;
}

/**
 * Roll chronic onsets over `dtMinutes` from `rng`. Conditions the person already has are skipped. Returns
 * illnesses for the composite to pass to `sicken` (non-contagious, `trendPerDay` 0, `chronic: true` with
 * `baseline` = onset severity, so the body never clears them by immune drift).
 */
export function chronicOnsets(
  p: Person,
  dtMinutes: number,
  rng: RngState,
  opts: { conditions?: readonly ChronicCondition[]; exposures?: HealthExposures } = {},
): Omit<Illness, 'id' | 'since'>[] {
  if (!p.body.alive || !(dtMinutes > 0)) return [];
  const exposures: HealthExposures = {
    sleepDebtHours: p.body.sleepDebt,
    fitness: p.body.fitness,
    ...opts.exposures,
  };
  const age = ageYears(p);
  const years = dtMinutes / MINUTES_PER_YEAR;
  const out: Omit<Illness, 'id' | 'since'>[] = [];
  for (const c of opts.conditions ?? CHRONIC_CONDITIONS) {
    if (p.body.illnesses.some((i) => i.kind === c.kind)) continue;
    const prob = 1 - dexp(-chronicHazard(age, c, exposures) * years);
    if (chance(rng, prob))
      out.push({
        kind: c.kind,
        severity: c.severity,
        trendPerDay: 0,
        contagious: false,
        chronic: true,
        baseline: c.severity,
      });
  }
  return out;
}

/** Yearly mortality hazard: Gompertz by age, raised by lost health and illness load. */
export function mortalityHazard(
  p: Person,
  opts: { multiplier?: number } = {},
  params = HEALTH_DEFAULTS,
): { hazardPerYear: number; ageShare: Unit } {
  const base = modifiersForAge(ageYears(p)).mortalityPerYear;
  let illness = 0;
  for (const i of p.body.illnesses) illness += i.severity;
  const factor =
    1 + params.healthMortality * (1 - clamp01(p.body.health)) + params.illnessMortality * illness;
  const hazardPerYear = Math.min(1, base * factor * Math.max(0, opts.multiplier ?? 1));
  return { hazardPerYear, ageShare: 1 / factor };
}

export interface MortalityRoll {
  died: boolean;
  /** Probability of death over the interval. */
  probability: Unit;
  hazardPerYear: number;
  /** 'age' when the age hazard dominates, else 'illness' (lost health and illness load). */
  cause: 'age' | 'illness';
}

/**
 * Roll death over `dtMinutes` from `rng` (host opt-in; call once per day boundary, not per segment, so chunking
 * does not change replay). Does not kill: the composite applies a death (body `alive = false`) when `died`.
 */
export function mortalityEvent(
  p: Person,
  dtMinutes: number,
  rng: RngState,
  opts: { multiplier?: number } = {},
): MortalityRoll {
  const { hazardPerYear, ageShare } = mortalityHazard(p, opts);
  const probability = dtMinutes > 0 ? 1 - dexp(-hazardPerYear * (dtMinutes / MINUTES_PER_YEAR)) : 0;
  const died = p.body.alive && probability > 0 && chance(rng, probability);
  return { died, probability, hazardPerYear, cause: ageShare >= 0.5 ? 'age' : 'illness' };
}
