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
 */
import { clamp, clamp01, decay, minuteOfDay, smoothstep } from '../core/index.ts';
import type {
  BodyLoad,
  BodyReadout,
  BodyState,
  Illness,
  Injury,
  LifeModifiers,
  Minute,
  Person,
  PersonSpec,
} from '../types.ts';
import { MINUTES_PER_DAY } from '../types.ts';

export const BODY_DEFAULTS = {
  maxSubStep: 15,
  /** Satiety lost per minute awake at rest (adult): from 0.8 to hunger threshold 0.3 in ~5.5 h. */
  satietyPerMinute: 0.0015,
  /** Extra satiety loss per minute at effort 1. */
  satietyEffortPerMinute: 0.0015,
  /** Hydration lost per minute awake at rest: from 0.85 to thirst threshold 0.3 in ~4.5 h. */
  hydrationPerMinute: 0.002,
  hydrationEffortPerMinute: 0.003,
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
};

export type BodyParams = typeof BODY_DEFAULTS;

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
  return b;
}

/** Pain implied by current injuries, illnesses and deprivation (before relaxation and relief). */
function sourcePain(b: BodyState): number {
  let none = 1;
  for (const inj of b.injuries) none *= 1 - inj.severity;
  for (const ill of b.illnesses) none *= 1 - 0.6 * ill.severity;
  none *= 1 - 0.4 * smoothstep(0.15, 0, b.satiety);
  none *= 1 - 0.5 * smoothstep(0.15, 0, b.hydration);
  return clamp01(1 - none);
}

/** Minutes within [0,h] that awake S(t) = 1 - (1 - s0) e^{-t/tau} spends above th. */
function awakeAbove(s0: number, h: number, tau: number, th: number): number {
  if (s0 >= th) return h;
  const tc = tau * Math.log((1 - s0) / (1 - th));
  return Math.max(0, h - tc);
}

/** Minutes within [0,h] that asleep S(t) = s0 e^{-t/tau} spends below th. */
function asleepBelow(s0: number, h: number, tau: number, th: number): number {
  if (s0 <= th) return h;
  const tc = tau * Math.log(s0 / th);
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

  // Energy and water: linear, exact.
  b.satiety = clamp01(b.satiety - h * meta * (P.satietyPerMinute + P.satietyEffortPerMinute * effortUsed));
  b.hydration = clamp01(
    b.hydration - h * meta * (P.hydrationPerMinute + P.hydrationEffortPerMinute * effortUsed),
  );

  // Process S and sleep debt: exact exponential solutions.
  const s0 = b.sleepPressure;
  if (asleep) {
    const below = asleepBelow(s0, h, P.sleepTau, P.repayThreshold);
    b.sleepDebt = Math.max(0, b.sleepDebt - (P.debtRepayPerHour * below) / 60);
    b.sleepPressure = clamp01(s0 * Math.exp(-h / P.sleepTau));
  } else {
    const above = awakeAbove(s0, h, P.wakeTau, P.debtThreshold);
    b.sleepDebt = Math.min(P.maxSleepDebt, b.sleepDebt + (P.debtPerHourAbove * above) / 60);
    b.sleepPressure = clamp01(1 - (1 - s0) * Math.exp(-h / P.wakeTau));
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
  b.fitness = clamp(fStar + (b.fitness - fStar) * Math.exp(-(kd + kt) * h), 0, maxFit);

  // Injuries heal; faster asleep and fed, slower when exhausted.
  const healFactor = recovery * (asleep ? 1.5 : 1) * (fed ? 1 : 0.5) * (1 - 0.5 * exhausted);
  for (const inj of b.injuries) {
    inj.severity = clamp01(inj.severity - (inj.healRatePerDay * healFactor * h) / MINUTES_PER_DAY);
  }
  b.injuries = b.injuries.filter((inj) => inj.severity > 0.001);

  // Illnesses: severity follows the trend; the trend drifts toward recovery (immune response), and
  // deprivation or exhaustion both slow that drift and add worsening.
  const stress = Math.max(starving, dehydrated, exhausted);
  for (const ill of b.illnesses) {
    const drift = P.immuneResponsePerDay * recovery * (1 - 0.7 * stress) * (asleep ? 1.3 : 1);
    ill.trendPerDay = Math.max(P.minIllnessTrend, ill.trendPerDay - (drift * h) / MINUTES_PER_DAY);
    const trend = ill.trendPerDay + P.illnessStressPerDay * stress;
    ill.severity = clamp01(ill.severity + (trend * h) / MINUTES_PER_DAY);
  }
  b.illnesses = b.illnesses.filter((ill) => ill.severity > 0.001 || ill.trendPerDay > 0);

  // Health reserve.
  let illnessLoad = 0;
  for (const ill of b.illnesses) illnessLoad += ill.severity;
  const loss =
    P.starvationPerDay * starving + P.dehydrationPerDay * dehydrated + P.illnessHealthPerDay * illnessLoad;
  const gain = fed && illnessLoad < 0.3 ? P.healthRecoveryPerDay * recovery * (asleep ? 1.5 : 1) : 0;
  b.health = clamp01(b.health + ((gain - loss) * h) / MINUTES_PER_DAY);

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
  const base = 0.5 + 0.5 * Math.cos((2 * Math.PI * delta) / MINUTES_PER_DAY);
  // Post-lunch dip centred ~2 h before the peak (14:00 for a 16:00 peak).
  let d = minuteOfDay(now - (circadianPeak - 120));
  if (d > MINUTES_PER_DAY / 2) d -= MINUTES_PER_DAY;
  const dip = 0.12 * Math.exp(-(d * d) / (2 * 60 * 60));
  return clamp01(base - dip);
}

export function readBody(p: Person, params: BodyParams = BODY_DEFAULTS): BodyReadout {
  const b = p.body;
  const alertness = circadianAlertness(p.now, b.circadianPeak);
  const debtTerm = params.sleepinessDebtWeight * (1 - Math.exp(-b.sleepDebt / 8));
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
  const debtImpair = 1 - 0.3 * (1 - Math.exp(-b.sleepDebt / 16));
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
  return {
    hunger,
    thirst,
    sleepiness,
    fatigue,
    pain,
    capacity,
    alertness,
    perceived: {
      hunger,
      thirst,
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
  b.illnesses.push(ill);
  if (b.illnesses.length > BODY_DEFAULTS.maxIllnesses) {
    let min = 0;
    for (let i = 1; i < b.illnesses.length; i++) {
      if ((b.illnesses[i]?.severity ?? 1) < (b.illnesses[min]?.severity ?? 1)) min = i;
    }
    b.illnesses.splice(min, 1);
  }
  return ill;
}

export interface BodyThresholds {
  hunger: number;
  thirst: number;
  sleepiness: number;
}

/** Plain copy of a body (injuries and illnesses copied too); far cheaper than structuredClone in hot loops. */
const cloneBody = (b: BodyState): BodyState => ({
  ...b,
  injuries: b.injuries.map((i) => ({ ...i })),
  illnesses: b.illnesses.map((i) => ({ ...i })),
});

/**
 * Minutes until any perceived readout (hunger, thirst, sleepiness) rises across its threshold under a
 * constant `load`, or Infinity if none does within `horizon`. Readouts already at or above their threshold
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
): number {
  if (!p.body.alive) return Number.POSITIVE_INFINITY;
  const keys = ['hunger', 'thirst', 'sleepiness'] as const;
  const start = readBody(p, params).perceived;
  const watch = keys.filter((k) => start[k] < thresholds[k]);
  if (watch.length === 0) return Number.POSITIVE_INFINITY;
  const crossed = (q: Person) => {
    const r = readBody(q, params).perceived;
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
