/**
 * SCOPE: a compact physiological state for game time scales: energy (satiety), hydration, sleep, short-term
 * exertion, trained fitness, injuries, illnesses, pain and a health reserve. Sleep follows the two-process
 * model of sleep regulation (Borbély): a homeostatic pressure (Process S) that rises exponentially toward a
 * ceiling while awake and decays exponentially during sleep, read against a circadian alertness rhythm
 * (Process C) with a night trough and a mild post-lunch dip. Chronic sleep debt accumulates when wake
 * extends past the normal saturation point, is repaid slowly by extra sleep, impairs objective capacity
 * and is under-perceived (cumulative-cost-of-wakefulness pattern, Van Dongen et al. 2003). Satiety and
 * hydration fall linearly with metabolic rate and effort. Fitness relaxes exponentially toward a training
 * target or a detraining floor. All rates are engineering defaults; none is a calibrated physiological
 * prediction. Not modelled: bladder, temperature, specific nutrients, endocrine and immune detail,
 * stress physiology, and masking of hunger or pain by emotion or focus (that belongs to other faculties).
 * `advanceBody` integrates in deterministic sub-steps of at most 15 minutes, using the exact solution
 * within each sub-step where the dynamics are linear, so one long step matches many short ones closely.
 *
 * SCOPE (fasting perception, N2b): while the host reports an open fast (`BodyPerceptionContext`), perceived
 * hunger is damped and the true body, capacity and health are untouched. Empirical shape: in a controlled
 * longitudinal study of Ramadan (Fleischmann et al. 2026, Frontiers in Nutrition, doi:10.3389/fnut.2026.1859780;
 * 287 fasting, 76 controls) the share reporting moderate-to-strong daily peak hunger fell from 60.7% at
 * baseline to 46.7% by day 7 and was 42.0% at day 24 (whether the day-7 to day-24 change was significant was
 * not confirmed in review, 2026-10-03), while peak *thirst* rose (48% to 57.5%). So hunger is damped and thirst is not (`fastingThirstDamp` = 0). The ramp over the first days
 * (part of the damping at once, the rest with a ~2.5-day time constant) is an assumption consistent with,
 * not shown by, those two time points; the damping magnitude is an engineering default, not a fitted rating
 * drop. Severe true deprivation breaks through the damping. Does not claim: a mechanism (ghrelin, routine,
 * meaning), sex differences, or post-fast persistence.
 *
 * SCOPE (illness and behaviour, N12): acute illness recovery (the immune drift of `trendPerDay`) is slowed
 * by being underfed or dehydrated in the ordinary range (satiety/hydration below 0.3, e.g. the afternoon
 * of a fast), by heavy effort and by sleep debt, and sped by rest; being underfed also adds slow worsening.
 * Shape: rest, food and sleep support recovery and their lack slows it (common clinical advice; qualitative
 * only). Chronic conditions (`Illness.chronic`, e.g. hypertension) have no drift: severity relaxes toward a
 * baseline raised by sleep debt and by host-driven exposures (`expose`), and costs health slowly, so a
 * moderate chronic condition is a slope over months, not a crisis in a week. Exposures keep a recent load
 * (days) and a cumulative dose (years) whose illness hazard the host reads with `exposureChance`.
 * Contagion is a host-called helper: transmission chance rises with contact minutes and source severity
 * (1 - e^{-k·severity·minutes}). Does not claim: calibrated recovery times, blood-pressure values, dose-
 * response curves for any real exposure, or epidemiological transmission rates.
 *
 * SCOPE (pinned rates, integration 2026-10-03): `BodyState.rates` lets a host replace the four depletion
 * rates for one body, so a scenario tuned on a different time scale (the colony game's two days) keeps the
 * cadence it was built on after the defaults were recalibrated (see docs/findings.md). It is a scenario
 * knob, not a physiological trait and not a life-course effect (`LifeModifiers.metabolism` is that), and
 * `readBody` thresholds ignore it.
 */
import {
  chance,
  clamp,
  clamp01,
  dcos,
  decay,
  dexp,
  dlog,
  isObj,
  minuteOfDay,
  smoothstep,
} from '../core/index.ts';
import type {
  BodyLoad,
  BodyRates,
  BodyReadout,
  BodyState,
  Exposure,
  Illness,
  Injury,
  LifeModifiers,
  Minute,
  Person,
  PersonSpec,
  Unit,
} from '../types.ts';
import { MINUTES_PER_DAY, MINUTES_PER_YEAR } from '../types.ts';
import { bleedStep, INJURY_DEFAULTS } from './injury.ts';

export const BODY_DEFAULTS = {
  maxSubStep: 15,
  /**
   * Satiety lost per minute awake at rest (adult): from 0.8 to hunger threshold 0.3 in ~10 h. Recalibrated
   * 2026-10-03 (was 0.0015, ~5.5 h): with the old pace a dawn-to-dusk fast from a full stomach reached the
   * necessity bound by mid-afternoon, which no person does; see docs/findings.md.
   */
  satietyPerMinute: 0.0008,
  /** Extra satiety loss per minute at effort 1. */
  satietyEffortPerMinute: 0.001,
  /** Hydration lost per minute awake at rest: from 0.85 to thirst threshold 0.3 in ~11 h (was 0.002, ~4.5 h). */
  hydrationPerMinute: 0.0008,
  hydrationEffortPerMinute: 0.0012,
  /** Multiplier on satiety and hydration loss while asleep. */
  sleepMetabolism: 0.5,
  /** Process S time constant awake (min): 0.2 -> ~0.75 after 16 h. */
  wakeTau: 825,
  /** Process S time constant asleep (min): 0.75 -> ~0.2 after 8 h. */
  sleepTau: 363,
  /** Sleep debt (hours) gained per hour awake with sleep pressure above debtThreshold (~16 h of wake). */
  debtPerHourAbove: 0.5,
  debtThreshold: 0.75,
  /** Sleep debt repaid (hours per hour asleep) once sleep pressure is below repayThreshold. */
  debtRepayPerHour: 0.5,
  repayThreshold: 0.2,
  maxSleepDebt: 48,
  /** Exertion target = effort * (1 - 0.5 * fitness) * exertionGain. */
  exertionGain: 1.3,
  exertionRiseHalfLife: 40,
  exertionRecoverHalfLife: 45,
  exertionRecoverHalfLifeAsleep: 25,
  /** Effort above which fitness trains. */
  trainingEffort: 0.4,
  /** Detraining half-life (min) toward fitnessFloor. */
  detrainHalfLife: 90 * MINUTES_PER_DAY,
  fitnessFloor: 0.25,
  /** Training rate relative to detraining at effort 1. */
  trainingRatio: 48,
  /** Starvation/dehydration health loss per day at satiety/hydration 0. */
  starvationPerDay: 0.06,
  dehydrationPerDay: 0.35,
  /** Health loss per day per unit illness severity. */
  illnessHealthPerDay: 0.08,
  healthRecoveryPerDay: 0.03,
  /** Rate at which an illness trend moves toward recovery (per day, per day). */
  immuneResponsePerDay: 0.15,
  minIllnessTrend: -0.3,
  /** Extra illness worsening per day under starvation, dehydration or exhaustion. */
  illnessStressPerDay: 0.1,
  /** Stored pain relaxes toward its sources with this half-life (min); lets relief act for a while. */
  painHalfLife: 20,
  maxInjuries: 16,
  maxIllnesses: 8,
  /** Weights of the sleepiness readout. */
  sleepinessPressureWeight: 0.7,
  sleepinessCircadianWeight: 0.3,
  sleepinessDebtWeight: 0.25,
  /** Fraction of the debt contribution to sleepiness that the person does not feel. */
  debtUnderperception: 0.8,
  /** Fraction of pain from long-standing injuries no longer noticed after ~3 days. */
  painAdaptation: 0.15,
  // --- fasting perception (N2b) ---
  /** Maximum fraction of hunger not felt while fasting, once adapted. */
  fastingHungerDamp: 0.35,
  /** Thirst is not damped: thirst rose during Ramadan in Fleischmann et al. 2026. */
  fastingThirstDamp: 0,
  /** Share of the maximum damping present on the first fasting day. */
  fastingOnsetShare: 0.4,
  /** Time constant (days) of the remaining adaptation (~94% by day 7). */
  fastingAdaptDays: 2.5,
  /** Damping fades out as true satiety falls from `fastingBreakthrough[1]` to `[0]`. */
  fastingBreakthrough: [0.03, 0.12] as const,
  // --- illness and behaviour (N12) ---
  /** Satiety/hydration below which an acute illness feels the lack of fuel (graded down to underfedFull). */
  underfedFrom: 0.3,
  underfedFull: 0.1,
  /** Fraction of immune drift lost when fully underfed. */
  underfedDriftLoss: 0.4,
  /** Extra acute worsening per day when fully underfed. */
  underfedWorsenPerDay: 0.04,
  /** Effort at or below which the person counts as resting. */
  restEffort: 0.15,
  /** Extra immune drift while resting awake. */
  restDriftBonus: 0.2,
  /** Effort above which drift is lost; fraction lost at effort 1. */
  heavyEffort: 0.4,
  heavyEffortDriftLoss: 0.4,
  /** Sleep debt (hours) range over which up to `debtDriftLoss` of drift is lost. */
  debtDriftRange: [4, 16] as const,
  debtDriftLoss: 0.3,
  // --- chronic conditions and exposures ---
  /** Half-life (min) of a chronic condition's relaxation toward its target. */
  chronicHalfLife: 5 * MINUTES_PER_DAY,
  /** Severity added to a chronic target at full sleep debt (smoothstep 0..16 h). */
  chronicDebtGain: 0.15,
  /** Severity added per unit of recent exposure load for each aggravating exposure. */
  chronicExposureGain: 0.2,
  /** Health loss per day per unit chronic severity (slow: 0.3 severity costs ~0.04 in 30 days). */
  chronicHealthPerDay: 0.004,
  /** Pain weight of a chronic condition relative to an acute one's 0.6 (largely silent). */
  chronicPainWeight: 0.1,
  maxExposures: 16,
  /** Recent load gained per exposure unit (saturating: recent += gain × amount × (1 - recent)). */
  exposureRecentGain: 0.1,
  exposureRecentHalfLife: 3 * MINUTES_PER_DAY,
  /** Cumulative dose decays very slowly (risk declines over years after cessation). */
  exposureCumulativeHalfLife: 5 * MINUTES_PER_YEAR,
  // --- contagion ---
  /** Transmission rate per contact minute at source severity 1 (60 min at severity 0.5 ≈ 11%). */
  transmissionPerMinute: 0.004,
  contractedSeverity: 0.1,
  contractedTrendPerDay: 0.15,
};

/** What the host knows about the person's practice that shapes interoception. */
export interface BodyPerceptionContext {
  /** An open fast (an abstention covering eating) is in force now. */
  fasting: boolean;
  /** Consecutive fasting days completed before today (0 on the first day; fractions allowed). */
  fastingDays: number;
}

export type BodyParams = typeof BODY_DEFAULTS;

const RATE_KEYS = [
  'satietyPerMinute',
  'satietyEffortPerMinute',
  'hydrationPerMinute',
  'hydrationEffortPerMinute',
] as const satisfies readonly (keyof BodyRates)[];

/** Keep only finite, non-negative pinned rates; undefined when nothing usable remains (used by `createBody` and `restore`). @internal */
export function sanitizeRates(input: unknown): BodyRates | undefined {
  if (typeof input !== 'object' || input === null) return undefined;
  const src = input as Record<string, unknown>;
  const rates: BodyRates = {};
  for (const k of RATE_KEYS) {
    const v = src[k];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) rates[k] = v;
  }
  return Object.keys(rates).length > 0 ? rates : undefined;
}

/**
 * Keep only well-formed exposures: finite numbers, `recent` clamped to 0..1, `cumulative` non-negative.
 * Undefined when nothing usable remains (used by `createBody` and `restore`).
 * @internal
 */
export function sanitizeExposures(input: unknown, now: Minute): Record<string, Exposure> | undefined {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return undefined;
  const out: Record<string, Exposure> = {};
  let n = 0;
  for (const [k, raw] of Object.entries(input as Record<string, unknown>)) {
    if (n >= BODY_DEFAULTS.maxExposures) break;
    if (typeof raw !== 'object' || raw === null) continue;
    const e = raw as Record<string, unknown>;
    const recent = typeof e.recent === 'number' && Number.isFinite(e.recent) ? clamp01(e.recent) : undefined;
    const cumulative =
      typeof e.cumulative === 'number' && Number.isFinite(e.cumulative)
        ? Math.max(0, e.cumulative)
        : undefined;
    if (recent === undefined || cumulative === undefined) continue;
    const lastAt = typeof e.lastAt === 'number' && Number.isFinite(e.lastAt) ? e.lastAt : now;
    out[k] = { recent, cumulative, lastAt };
    n++;
  }
  return n > 0 ? out : undefined;
}

/**
 * Restore-time check of the body's optional fields, in place: pinned rates and exposures (1.2.0), illnesses' chronic
 * fields, and the last sleep and downing spans (1.7.0). Malformed ones are dropped, never filled; injuries and
 * downing are checked by `sanitizeInjuries`. A save the engine wrote is unchanged. @internal
 */
export function sanitizeBody(b: BodyState, now: Minute): void {
  if (b.rates !== undefined) {
    const rates = sanitizeRates(b.rates);
    if (rates) b.rates = rates;
    else delete b.rates;
  }
  if (b.exposures !== undefined) {
    const ex = sanitizeExposures(b.exposures, now);
    if (ex) b.exposures = ex;
    else delete b.exposures;
  }
  sanitizeIllnesses(b);
  const span = (x: unknown) => isObj(x) && typeof x.from === 'number' && typeof x.to === 'number';
  if (b.lastSleep !== undefined && !span(b.lastSleep)) delete b.lastSleep;
  if (b.lastDowned !== undefined && !span(b.lastDowned)) delete b.lastDowned;
}

/**
 * Repair the optional chronic fields of saved illnesses in place: a non-finite or out-of-range `baseline` is
 * clamped (non-finite falls back to the severity), non-string `aggravatedBy` entries are dropped, and an
 * illness whose core numbers are not finite is removed. Used by `restore`.
 * @internal
 */
export function sanitizeIllnesses(b: BodyState): void {
  if (!Array.isArray(b.illnesses)) {
    b.illnesses = [];
    return;
  }
  b.illnesses = b.illnesses.filter(
    (i) =>
      typeof i === 'object' &&
      i !== null &&
      typeof i.severity === 'number' &&
      Number.isFinite(i.severity) &&
      typeof i.trendPerDay === 'number' &&
      Number.isFinite(i.trendPerDay),
  );
  for (const i of b.illnesses) {
    i.severity = clamp01(i.severity);
    if (i.baseline !== undefined)
      i.baseline =
        typeof i.baseline === 'number' && Number.isFinite(i.baseline) ? clamp01(i.baseline) : i.severity;
    if (i.aggravatedBy !== undefined) {
      if (!Array.isArray(i.aggravatedBy)) delete i.aggravatedBy;
      else i.aggravatedBy = i.aggravatedBy.filter((k): k is string => typeof k === 'string');
    }
  }
}

const LN2 = Math.LN2;

export function createBody(init: PersonSpec['body'] | undefined, now: Minute): BodyState {
  const b: BodyState = {
    satiety: 0.8,
    hydration: 0.85,
    sleepPressure: 0.2,
    exertion: 0,
    circadianPeak: 960,
    pain: 0,
    health: 1,
    fitness: 0.5,
    sleepDebt: 0,
    alive: true,
    asleep: false,
    since: now,
    ...init,
    injuries: [],
    illnesses: [],
    nextId: 0,
  };
  b.satiety = clamp01(b.satiety);
  b.hydration = clamp01(b.hydration);
  b.sleepPressure = clamp01(b.sleepPressure);
  b.exertion = clamp01(b.exertion);
  b.pain = clamp01(b.pain);
  b.health = clamp01(b.health);
  b.fitness = clamp01(b.fitness);
  b.sleepDebt = clamp(b.sleepDebt, 0, BODY_DEFAULTS.maxSleepDebt);
  b.circadianPeak = minuteOfDay(b.circadianPeak);
  if (init?.rates !== undefined) {
    const rates = sanitizeRates(init.rates);
    if (rates) b.rates = rates;
    else delete b.rates;
  }
  if (init?.exposures) {
    const ex = sanitizeExposures(init.exposures, now);
    if (ex) b.exposures = ex;
  }
  return b;
}

/** Pain implied by current injuries, illnesses and deprivation (before relaxation and relief). */
function sourcePain(b: BodyState): number {
  let none = 1;
  for (const inj of b.injuries) none *= 1 - inj.severity;
  for (const ill of b.illnesses)
    none *= 1 - (ill.chronic ? BODY_DEFAULTS.chronicPainWeight : 0.6) * ill.severity;
  none *= 1 - 0.4 * smoothstep(0.15, 0, b.satiety);
  none *= 1 - 0.5 * smoothstep(0.15, 0, b.hydration);
  return clamp01(1 - none);
}

/** Minutes within [0,h] that awake S(t) = 1 - (1 - s0) e^{-t/tau} spends above th. */
function awakeAbove(s0: number, h: number, tau: number, th: number): number {
  if (s0 >= th) return h;
  const tc = tau * dlog((1 - s0) / (1 - th));
  return Math.max(0, h - tc);
}

/** Minutes within [0,h] that asleep S(t) = s0 e^{-t/tau} spends below th. */
function asleepBelow(s0: number, h: number, tau: number, th: number): number {
  if (s0 <= th) return h;
  const tc = tau * dlog(s0 / th);
  return Math.max(0, h - tc);
}

function subStep(b: BodyState, h: number, load: BodyLoad, mods: LifeModifiers, P: BodyParams): void {
  const effort = clamp01(load.effort);
  const asleep = b.asleep;
  const meta = (asleep ? P.sleepMetabolism : 1) * mods.metabolism;
  const effortUsed = asleep ? 0 : effort;

  // Rates evaluated at the start of the sub-step for nonlinear couplings.
  const starving = clamp01((0.1 - b.satiety) / 0.1);
  const dehydrated = clamp01((0.1 - b.hydration) / 0.1);
  const exhausted = Math.max(smoothstep(0.8, 1, b.exertion), smoothstep(16, 32, b.sleepDebt));
  const fed = b.satiety > 0.3 && b.hydration > 0.3;
  const underfed = smoothstep(P.underfedFrom, P.underfedFull, Math.min(b.satiety, b.hydration));
  const debtSlow = smoothstep(P.debtDriftRange[0], P.debtDriftRange[1], b.sleepDebt);
  const debt0 = b.sleepDebt;

  // Energy and water: linear, exact. A host may pin this body's rates (`BodyState.rates`).
  const R = b.rates;
  const satietyRate = R?.satietyPerMinute ?? P.satietyPerMinute;
  const satietyEffortRate = R?.satietyEffortPerMinute ?? P.satietyEffortPerMinute;
  const hydrationRate = R?.hydrationPerMinute ?? P.hydrationPerMinute;
  const hydrationEffortRate = R?.hydrationEffortPerMinute ?? P.hydrationEffortPerMinute;
  b.satiety = clamp01(b.satiety - h * meta * (satietyRate + satietyEffortRate * effortUsed));
  b.hydration = clamp01(b.hydration - h * meta * (hydrationRate + hydrationEffortRate * effortUsed));

  // Process S and sleep debt: exact exponential solutions.
  const s0 = b.sleepPressure;
  if (asleep) {
    const below = asleepBelow(s0, h, P.sleepTau, P.repayThreshold);
    b.sleepDebt = Math.max(0, b.sleepDebt - (P.debtRepayPerHour * below) / 60);
    b.sleepPressure = clamp01(s0 * dexp(-h / P.sleepTau));
  } else {
    const above = awakeAbove(s0, h, P.wakeTau, P.debtThreshold);
    b.sleepDebt = Math.min(P.maxSleepDebt, b.sleepDebt + (P.debtPerHourAbove * above) / 60);
    b.sleepPressure = clamp01(1 - (1 - s0) * dexp(-h / P.wakeTau));
  }

  // Exertion relaxes toward an effort-dependent target.
  const target = clamp01(effortUsed * (1 - 0.5 * b.fitness) * P.exertionGain);
  const recovery = Math.max(0.05, mods.recovery);
  const hl =
    target > b.exertion
      ? P.exertionRiseHalfLife
      : (asleep ? P.exertionRecoverHalfLifeAsleep : P.exertionRecoverHalfLife) / recovery;
  b.exertion = clamp01(decay(b.exertion, h, hl, target));

  // Fitness: dF/dt = -kd (F - floor) + kt (max - F), exact for constant load.
  const maxFit = clamp01(mods.maxFitness);
  const kd = LN2 / P.detrainHalfLife;
  const kt =
    effortUsed > P.trainingEffort ? (kd * P.trainingRatio * (effortUsed - P.trainingEffort)) / 0.6 : 0;
  const floor = Math.min(P.fitnessFloor, maxFit);
  const fStar = (kd * floor + kt * maxFit) / (kd + kt);
  b.fitness = clamp(fStar + (b.fitness - fStar) * dexp(-(kd + kt) * h), 0, maxFit);

  // Injuries heal; faster asleep and fed, slower when exhausted.
  const healFactor = recovery * (asleep ? 1.5 : 1) * (fed ? 1 : 0.5) * (1 - 0.5 * exhausted);
  for (const inj of b.injuries) {
    const tended = inj.tendedAt !== undefined ? INJURY_DEFAULTS.tendedHeal : 1;
    inj.severity = clamp01(inj.severity - (inj.healRatePerDay * healFactor * tended * h) / MINUTES_PER_DAY);
  }
  // Bleeding (1.6.0, host-set): exact drain over the sub-step, measured before healed injuries are dropped.
  const bled = bleedStep(b, h);
  b.injuries = b.injuries.filter((inj) => inj.severity > 0.001);

  // Illnesses: severity follows the trend; the trend drifts toward recovery (immune response), and
  // deprivation or exhaustion both slow that drift and add worsening.
  // Behaviour couples in: rest speeds the drift; being underfed, heavy effort and sleep debt slow it.
  const stress = Math.max(starving, dehydrated, exhausted);
  const resting = asleep || effortUsed <= P.restEffort;
  const behaviour =
    (resting && !asleep ? 1 + P.restDriftBonus : 1) *
    (1 - P.underfedDriftLoss * underfed) *
    (1 - P.heavyEffortDriftLoss * clamp01((effortUsed - P.heavyEffort) / (1 - P.heavyEffort))) *
    (1 - P.debtDriftLoss * debtSlow);
  const debtGain = P.chronicDebtGain * smoothstep(0, 16, debt0);
  for (const ill of b.illnesses) {
    if (ill.chronic) {
      // No immune drift: relax toward a baseline raised by sleep debt and aggravating exposures, plus any
      // slow host-set trend (e.g. ageing).
      let target = (ill.baseline ?? ill.severity) + debtGain;
      for (const k of ill.aggravatedBy ?? [])
        target += P.chronicExposureGain * (b.exposures?.[k]?.recent ?? 0);
      const relaxed = decay(ill.severity, h, P.chronicHalfLife, clamp01(target));
      ill.severity = clamp01(relaxed + (ill.trendPerDay * h) / MINUTES_PER_DAY);
      continue;
    }
    const drift = P.immuneResponsePerDay * recovery * (1 - 0.7 * stress) * (asleep ? 1.3 : 1) * behaviour;
    ill.trendPerDay = Math.max(P.minIllnessTrend, ill.trendPerDay - (drift * h) / MINUTES_PER_DAY);
    const trend = ill.trendPerDay + P.illnessStressPerDay * stress + P.underfedWorsenPerDay * underfed;
    ill.severity = clamp01(ill.severity + (trend * h) / MINUTES_PER_DAY);
  }
  b.illnesses = b.illnesses.filter((ill) => ill.chronic || ill.severity > 0.001 || ill.trendPerDay > 0);

  // Exposures: recent load fades over days, cumulative dose over years.
  if (b.exposures) {
    for (const [k, e] of Object.entries(b.exposures)) {
      e.recent = clamp01(decay(e.recent, h, P.exposureRecentHalfLife));
      e.cumulative = decay(e.cumulative, h, P.exposureCumulativeHalfLife);
      if (e.cumulative < 1e-3 && e.recent < 1e-3) delete b.exposures[k];
    }
  }

  // Health reserve. Chronic conditions cost health slowly and do not block recovery.
  let illnessLoad = 0;
  let chronicLoad = 0;
  for (const ill of b.illnesses) {
    if (ill.chronic) chronicLoad += ill.severity;
    else illnessLoad += ill.severity;
  }
  const loss =
    P.starvationPerDay * starving +
    P.dehydrationPerDay * dehydrated +
    P.illnessHealthPerDay * illnessLoad +
    P.chronicHealthPerDay * chronicLoad;
  const gain = fed && illnessLoad < 0.3 ? P.healthRecoveryPerDay * recovery * (asleep ? 1.5 : 1) : 0;
  b.health = clamp01(b.health + ((gain - loss) * h) / MINUTES_PER_DAY);
  if (bled > 0) b.health = clamp01(b.health - bled);

  // Pain relaxes toward its sources (relief from consume() therefore fades over ~1 h).
  b.pain = clamp01(decay(b.pain, h, P.painHalfLife, sourcePain(b)));

  if (b.health <= 0) b.alive = false;
}

/**
 * Advance `p.body` over `dt` minutes under `load`. Call with `p.now` at the start of the interval: a mode
 * change sets `asleep` and `since = p.now`. Does not change `p.now`.
 */
export function advanceBody(
  p: Person,
  dt: number,
  load: BodyLoad,
  mods: LifeModifiers,
  params: BodyParams = BODY_DEFAULTS,
): void {
  const b = p.body;
  if (!b.alive) return;
  const wantAsleep = load.mode === 'sleep';
  if (wantAsleep !== b.asleep) {
    if (b.asleep) b.lastSleep = { from: b.since, to: p.now };
    b.asleep = wantAsleep;
    b.since = p.now;
  }
  if (!(dt > 0)) return;
  const n = Math.ceil(dt / params.maxSubStep);
  const h = dt / n;
  for (let i = 0; i < n && b.alive; i++) subStep(b, h, load, mods, params);
}

/** Circadian alertness 0..1 (Process C): cosine peaking at `circadianPeak`, trough 12 h earlier, post-lunch dip. */
export function circadianAlertness(now: Minute, circadianPeak: number): number {
  const delta = minuteOfDay(now) - circadianPeak;
  const base = 0.5 + 0.5 * dcos((2 * Math.PI * delta) / MINUTES_PER_DAY);
  // Post-lunch dip centred ~2 h before the peak (14:00 for a 16:00 peak).
  let d = minuteOfDay(now - (circadianPeak - 120));
  if (d > MINUTES_PER_DAY / 2) d -= MINUTES_PER_DAY;
  const dip = 0.12 * dexp(-(d * d) / (2 * 60 * 60));
  return clamp01(base - dip);
}

/**
 * Fraction of true hunger and thirst not felt under `ctx` (0 when not fasting). Exposed for explanation UI.
 * Damping = max × (onsetShare + (1 - onsetShare)(1 - e^{-days/adaptDays})), faded out by severe true
 * deprivation so starvation is still felt.
 */
export function fastingDamping(
  b: Pick<BodyState, 'satiety' | 'hydration'>,
  ctx: BodyPerceptionContext | undefined,
  params: BodyParams = BODY_DEFAULTS,
): { hunger: Unit; thirst: Unit } {
  if (!ctx?.fasting) return { hunger: 0, thirst: 0 };
  const days = Math.max(0, Number.isFinite(ctx.fastingDays) ? ctx.fastingDays : 0);
  const adapt =
    params.fastingOnsetShare + (1 - params.fastingOnsetShare) * (1 - dexp(-days / params.fastingAdaptDays));
  const [lo, hi] = params.fastingBreakthrough;
  return {
    hunger: clamp01(params.fastingHungerDamp * adapt * smoothstep(lo, hi, b.satiety)),
    thirst: clamp01(params.fastingThirstDamp * adapt * smoothstep(lo, hi, b.hydration)),
  };
}

/**
 * Physiological readout. `ctx` (optional) carries practice that shapes interoception, currently an open
 * fast: perceived hunger is damped (see SCOPE, N2b); true values, capacity and health are unchanged.
 */
export function readBody(
  p: Person,
  params: BodyParams = BODY_DEFAULTS,
  ctx?: BodyPerceptionContext,
): BodyReadout {
  const b = p.body;
  const alertness = circadianAlertness(p.now, b.circadianPeak);
  const debtTerm = params.sleepinessDebtWeight * (1 - dexp(-b.sleepDebt / 8));
  const sleepiness = clamp01(
    params.sleepinessPressureWeight * b.sleepPressure +
      params.sleepinessCircadianWeight * (1 - alertness) +
      debtTerm,
  );
  const fatigueOf = (s: number) => clamp01(1 - (1 - b.exertion) * (1 - 0.5 * s));
  const fatigue = fatigueOf(sleepiness);
  const hunger = clamp01(1 - b.satiety);
  const thirst = clamp01(1 - b.hydration);
  const pain = b.pain;
  // Objective impairment from chronic debt is not felt (see perceived.sleepiness).
  const debtImpair = 1 - 0.3 * (1 - dexp(-b.sleepDebt / 16));
  const capacity = b.alive
    ? clamp01(
        (1 - 0.5 * fatigue) *
          (1 - 0.6 * pain) *
          (0.4 + 0.6 * b.health) *
          debtImpair *
          (1 - 0.2 * smoothstep(0.2, 0, b.satiety)),
      )
    : 0;

  const perceivedSleepiness = clamp01(sleepiness - params.debtUnderperception * debtTerm);
  // Slight adaptation to long-standing injury pain (the oldest relevant injury's age).
  let oldest = 0;
  for (const inj of b.injuries) if (inj.severity > 0.05) oldest = Math.max(oldest, p.now - inj.since);
  const adapt = params.painAdaptation * smoothstep(0, 3 * MINUTES_PER_DAY, oldest);
  const fast = fastingDamping(b, ctx, params);
  return {
    hunger,
    thirst,
    sleepiness,
    fatigue,
    pain,
    capacity,
    alertness,
    perceived: {
      hunger: clamp01(hunger * (1 - fast.hunger)),
      thirst: clamp01(thirst * (1 - fast.thirst)),
      sleepiness: perceivedSleepiness,
      fatigue: fatigueOf(perceivedSleepiness),
      pain: clamp01(pain * (1 - adapt)),
    },
  };
}

/** Eat, drink or take pain relief. `relief` lowers current pain; it then relaxes back toward its sources. */
export function consume(p: Person, deltas: { food?: number; water?: number; relief?: number }): void {
  const b = p.body;
  if (!b.alive) return;
  if (deltas.food) b.satiety = clamp01(b.satiety + deltas.food);
  if (deltas.water) b.hydration = clamp01(b.hydration + deltas.water);
  if (deltas.relief) b.pain = clamp01(b.pain - deltas.relief);
}

/** `<prefix>:<minute>:<counter>`; the counter lives in `BodyState.nextId`, so ids stay unique after eviction. */
function freshId(b: BodyState, prefix: string, now: Minute): string {
  const id = `${prefix}:${now}:${b.nextId}`;
  b.nextId += 1;
  return id;
}

/**
 * `skip`'s side of the body: the body is not advanced over a skipped interval, so its current state simply
 * holds from `to` on.
 */
export function skipBody(p: Person, to: Minute): void {
  p.body.since = to;
}

/**
 * The body-owned death setter for host-rolled deaths (`lifecourse.mortalityEvent`): health 0, not alive, awake.
 * Idempotent. The composite clears the activity on its next tick.
 */
export function die(p: Person): void {
  const b = p.body;
  if (!b.alive) return;
  b.alive = false;
  b.health = 0;
  b.asleep = false;
  b.since = p.now;
}

export function injure(p: Person, injury: Omit<Injury, 'id' | 'since'>): Injury {
  const b = p.body;
  const inj: Injury = {
    ...injury,
    severity: clamp01(injury.severity),
    id: freshId(b, 'injury', p.now),
    since: p.now,
  };
  b.injuries.push(inj);
  if (b.injuries.length > BODY_DEFAULTS.maxInjuries) {
    // Drop the least severe so the collection stays bounded.
    let min = 0;
    for (let i = 1; i < b.injuries.length; i++) {
      if ((b.injuries[i]?.severity ?? 1) < (b.injuries[min]?.severity ?? 1)) min = i;
    }
    b.injuries.splice(min, 1);
  }
  b.pain = Math.max(b.pain, sourcePain(b));
  return inj;
}

export function sicken(p: Person, illness: Omit<Illness, 'id' | 'since'>): Illness {
  const b = p.body;
  const ill: Illness = {
    ...illness,
    severity: clamp01(illness.severity),
    id: freshId(b, 'illness', p.now),
    since: p.now,
  };
  if (ill.chronic && ill.baseline === undefined) ill.baseline = ill.severity;
  if (ill.baseline !== undefined) ill.baseline = clamp01(ill.baseline);
  b.illnesses.push(ill);
  if (b.illnesses.length > BODY_DEFAULTS.maxIllnesses) {
    // Evict the least severe acute illness; chronic conditions only when nothing else is left.
    let min = -1;
    for (let pass = 0; pass < 2 && min < 0; pass++) {
      for (let i = 0; i < b.illnesses.length; i++) {
        const x = b.illnesses[i];
        if (!x || (pass === 0 && x.chronic)) continue;
        const m = min < 0 ? undefined : b.illnesses[min];
        if (!m || x.severity < m.severity) min = i;
      }
    }
    if (min >= 0) b.illnesses.splice(min, 1);
  }
  return ill;
}

/**
 * Record `amount` units of a host-defined exposure (e.g. one cigarette). Raises the saturating recent load
 * (aggravates chronic conditions listed in their `aggravatedBy`) and the cumulative dose (read by
 * `exposureChance`). Bounded: beyond `maxExposures` kinds the smallest cumulative dose is dropped.
 */
export function expose(
  p: Person,
  kind: string,
  amount = 1,
  params: BodyParams = BODY_DEFAULTS,
): Exposure | null {
  const b = p.body;
  if (!b.alive || !kind || !(amount > 0) || !Number.isFinite(amount)) return null;
  b.exposures ??= {};
  const e: Exposure = b.exposures[kind] ?? { recent: 0, cumulative: 0, lastAt: p.now };
  e.recent = clamp01(e.recent + params.exposureRecentGain * amount * (1 - e.recent));
  e.cumulative += amount;
  e.lastAt = Math.max(e.lastAt, p.now);
  b.exposures[kind] = e;
  const keys = Object.keys(b.exposures);
  if (keys.length > params.maxExposures) {
    let drop: string | undefined;
    for (const k of keys) {
      if (k === kind) continue;
      if (drop === undefined || (b.exposures[k]?.cumulative ?? 0) < (b.exposures[drop]?.cumulative ?? 0))
        drop = k;
    }
    if (drop !== undefined) delete b.exposures[drop];
  }
  return e;
}

/**
 * Probability that a host-defined illness starts within `days` given an exposure's cumulative dose:
 * 1 - e^{-hazardPerUnitDay × cumulative × days}. Pure; the host rolls (e.g. `chance(p.rng, ...)`) and calls
 * `sicken`. 0 when the exposure is absent.
 */
export function exposureChance(
  b: Pick<BodyState, 'exposures'>,
  kind: string,
  days: number,
  hazardPerUnitDay: number,
): Unit {
  const cum = b.exposures?.[kind]?.cumulative ?? 0;
  if (!(cum > 0) || !(days > 0) || !(hazardPerUnitDay > 0)) return 0;
  return clamp01(1 - dexp(-hazardPerUnitDay * cum * days));
}

/** Transmission chance for `contactMinutes` of contact with someone carrying `source` (0 if not contagious). */
export function transmissionChance(
  source: Pick<Illness, 'contagious' | 'severity'>,
  contactMinutes: number,
  params: BodyParams = BODY_DEFAULTS,
): Unit {
  if (!source.contagious || !(contactMinutes > 0) || !(source.severity > 0)) return 0;
  return clamp01(1 - dexp(-params.transmissionPerMinute * clamp01(source.severity) * contactMinutes));
}

/**
 * Host-called contagion roll for `target` after contact with `source`. Draws from `target.rng`; on
 * transmission adds a mild, worsening illness of the same kind and returns it. A target already ill with
 * that kind, or dead, is not re-infected (returns null, no draw).
 */
export function contagionRoll(
  target: Person,
  source: Pick<Illness, 'kind' | 'contagious' | 'severity'>,
  contactMinutes: number,
  params: BodyParams = BODY_DEFAULTS,
): Illness | null {
  const b = target.body;
  if (!b.alive || b.illnesses.some((i) => i.kind === source.kind)) return null;
  const pr = transmissionChance(source, contactMinutes, params);
  if (pr <= 0 || !chance(target.rng, pr)) return null;
  return sicken(target, {
    kind: source.kind,
    severity: params.contractedSeverity,
    trendPerDay: params.contractedTrendPerDay,
    contagious: true,
  });
}

export interface BodyThresholds {
  hunger: number;
  thirst: number;
  sleepiness: number;
}

/** Plain copy of a body (injuries and illnesses copied too); far cheaper than structuredClone in hot loops. */
const cloneBody = (b: BodyState): BodyState => {
  const out: BodyState = {
    ...b,
    injuries: b.injuries.map((i) => (i.affects ? { ...i, affects: { ...i.affects } } : { ...i })),
    illnesses: b.illnesses.map((i) =>
      i.aggravatedBy ? { ...i, aggravatedBy: [...i.aggravatedBy] } : { ...i },
    ),
  };
  if (b.exposures) {
    const ex: Record<string, Exposure> = {};
    for (const [k, e] of Object.entries(b.exposures)) ex[k] = { ...e };
    out.exposures = ex;
  }
  if (b.rates) out.rates = { ...b.rates };
  if (b.downed) out.downed = { ...b.downed };
  if (b.lastSleep) out.lastSleep = { ...b.lastSleep };
  if (b.lastDowned) out.lastDowned = { ...b.lastDowned };
  if (b.downedBelow) out.downedBelow = { ...b.downedBelow };
  return out;
};

/**
 * Minutes until any perceived readout (hunger, thirst, sleepiness) rises across its threshold under a
 * constant `load` (read under `perception`, so a fast's damped hunger schedules the same interrupt the
 * decision sees), or Infinity if none does within `horizon`. Readouts already at or above their threshold
 * are ignored (they are already part of the current decision). Simulates a cloned body in 30-minute steps,
 * then refines minute by minute inside the crossing step. Does not mutate `p`.
 */
export function nextBodyThreshold(
  p: Person,
  load: BodyLoad,
  mods: LifeModifiers,
  thresholds: BodyThresholds = { hunger: 0.7, thirst: 0.7, sleepiness: 0.85 },
  horizon = 720,
  params: BodyParams = BODY_DEFAULTS,
  perception?: BodyPerceptionContext,
): number {
  if (!p.body.alive) return Number.POSITIVE_INFINITY;
  const keys = ['hunger', 'thirst', 'sleepiness'] as const;
  const start = readBody(p, params, perception).perceived;
  const watch = keys.filter((k) => start[k] < thresholds[k]);
  if (watch.length === 0) return Number.POSITIVE_INFINITY;
  const crossed = (q: Person) => {
    const r = readBody(q, params, perception).perceived;
    return watch.some((k) => r[k] >= thresholds[k]);
  };
  const sim: Person = { ...p, body: cloneBody(p.body) };
  advanceBody(sim, 0, load, mods, params); // apply mode change
  const coarse = 30;
  let t = 0;
  while (t < horizon) {
    const step = Math.min(coarse, horizon - t);
    const before: Person = { ...sim, body: cloneBody(sim.body) };
    advanceBody(sim, step, load, mods, params);
    sim.now += step;
    if (!sim.body.alive || crossed(sim)) {
      // Refine inside this step.
      const fine = before;
      for (let m = 1; m <= step; m++) {
        advanceBody(fine, 1, load, mods, params);
        fine.now += 1;
        if (!fine.body.alive || crossed(fine)) return t + m;
      }
      return t + step;
    }
    t += step;
  }
  return Number.POSITIVE_INFINITY;
}
