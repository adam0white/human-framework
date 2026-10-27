/** SCOPE: always-present body owner. Continuous engineering laws replace the 3.x
 * ordered 15-minute recurrence. Parameters are run-local; no clinical calibration.
 * See W1 METHOD-INTERFACE.md for equation provenance and numerical limits. */
import { cloneData } from '../core/clone.ts';
import { dcos, dexp, dlog } from '../core/libm.ts';
import { keyOf, Memo } from '../core/memo.ts';
import { modifiersForAge } from '../lifecourse/lifecourse.ts';
import type * as T from '../run-schema.ts';
import { bladderMotivation } from './bladder.ts';
import { dozeIntensity } from './doze.ts';
import { downedAllows, readCapacities } from './injury.ts';
import {
  ageYearsAt,
  arm,
  clip,
  clock,
  copy,
  DAY,
  draw,
  evaluateCell,
  firstMs,
  freezeData,
  hazardIssues,
  initialWidth,
  integrateCell,
  issue,
  LN2,
  maximumCell,
  minutes,
  newHazard,
  numericalIssues,
  output,
  rebaseHazard,
  required,
  sampledPath,
  scalarAt,
  smooth,
  thresholdTimes,
  validateNumbers,
  YEAR,
} from './span.ts';

const MINUTES_PER_DAY = 1440,
  MINUTES_PER_YEAR = 365.25 * 1440;
export const BODY_DEFAULTS = freezeData({
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
  /** Fatigue store (2.6.0, opt-in): depletion per hour at full effort (× (1 - 0.5 fitness) × (1 - depletion)). */
  depletionPerHour: 0.3,
  /** Effort below which the store does not fill and recovers while awake. */
  depletionFloor: 0.3,
  /** Half-life of depletion at rest awake and asleep (minutes, divided by the life-course recovery factor). */
  depletionRestHalfLife: 8 * 60,
  depletionSleepHalfLife: 3 * 60,
  /** How much a full store adds to felt fatigue: fatigue = 1 - (1 - exertion)(1 - 0.5 s)(1 - weight × depletion). */
  depletionFatigueWeight: 1,
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
  fastingBreakthrough: [0.03, 0.12],
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
  debtDriftRange: [4, 16],
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
});

export function circadianAlertness(at: number, peakMs: number): number {
  const m = (((at % DAY) + DAY) % DAY) / 60000,
    peak = peakMs / 60000;
  const d = ((((m - (peak - 120) + 720) % 1440) + 1440) % 1440) - 720;
  return clip(0.5 + 0.5 * dcos((2 * Math.PI * (m - peak)) / 1440) - 0.12 * dexp((-d * d) / (2 * 60 * 60)));
}
export function readBody(
  b: T.DeepReadonly<T.BodyState>,
  at: number,
  p: T.DeepReadonly<T.Effective_BODY_DEFAULTS>,
  perception: T.DeepReadonly<T.BodyPerceptionContext> = { fasting: false, fastingDays: 0 },
): T.BodyReadout {
  const alertness = circadianAlertness(at, b.circadianPeakMs),
    debt = p.sleepinessDebtWeight * (1 - dexp(-b.sleepDebtHours / 8));
  const sleepiness = clip(
    p.sleepinessPressureWeight * b.sleepPressure + p.sleepinessCircadianWeight * (1 - alertness) + debt,
  );
  const fatigueOf = (s: number) =>
    clip(1 - (1 - b.exertion) * (1 - 0.5 * s) * (1 - p.depletionFatigueWeight * clip(b.depletion)));
  const fatigue = fatigueOf(sleepiness),
    capacity = b.alive
      ? clip(
          (1 - 0.5 * fatigue) *
            (1 - 0.6 * b.pain) *
            (0.4 + 0.6 * b.health) *
            (1 - 0.3 * (1 - dexp(-b.sleepDebtHours / 16))) *
            (1 - 0.2 * smooth(0.2, 0, b.satiety)),
        )
      : 0;
  const oldest = b.injuries
    .filter((i) => i.severity > 0.05)
    .reduce((a, i) => Math.max(a, (at - i.since) / 60000), 0);
  const adapt = p.painAdaptation * smooth(0, 4320, oldest);
  const fa = perception.fasting
    ? p.fastingOnsetShare +
      (1 - p.fastingOnsetShare) * (1 - dexp(-Math.max(0, perception.fastingDays) / p.fastingAdaptDays))
    : 0;
  const damp = (v: number, k: number) =>
    clip(k * fa * smooth(required(p.fastingBreakthrough[0]), required(p.fastingBreakthrough[1]), v));
  const ps = clip(sleepiness - p.debtUnderperception * debt);
  return {
    hunger: 1 - b.satiety,
    thirst: 1 - b.hydration,
    sleepiness,
    fatigue,
    pain: b.pain,
    capacity,
    alertness,
    perceived: {
      hunger: clip((1 - b.satiety) * (1 - damp(b.satiety, p.fastingHungerDamp))),
      thirst: clip((1 - b.hydration) * (1 - damp(b.hydration, p.fastingThirstDamp))),
      sleepiness: ps,
      fatigue: fatigueOf(ps),
      pain: clip(b.pain * (1 - adapt)),
    },
  };
}
export function bodyVector(b: T.DeepReadonly<T.BodyState>): T.BodyVector {
  return {
    satiety: b.satiety,
    hydration: b.hydration,
    sleepPressure: b.sleepPressure,
    sleepDebtHours: b.sleepDebtHours,
    fitness: b.fitness,
    exertion: b.exertion,
    depletion: b.depletion,
    health: b.health,
    pain: b.pain,
    bladderFill: b.bladder.fill,
    bladderPending: b.bladder.pending,
    injuries: b.injuries.map((i) => ({ id: i.id, severity: i.severity, bleedingPerDay: i.bleeding ?? null })),
    illnesses: b.illnesses.map((i) => ({
      id: i.id,
      severity: i.severity,
      trendPerDay: i.trendPerDay,
      baseline: i.baseline ?? null,
      chronic: i.chronic ?? false,
    })),
    exposures: Object.entries(b.exposures)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([kind, e]) => ({ kind, recent: e.recent, cumulativeDose: e.cumulative })),
  };
}
const components = [
  'satiety',
  'hydration',
  'sleep-pressure',
  'sleep-debt-hours',
  'fitness',
  'exertion',
  'depletion',
  'health',
  'pain',
  'bladder-fill',
  'bladder-pending',
] as const;
function flatten(v: T.DeepReadonly<T.BodyVector>): { keys: T.BodyFieldKey[]; values: number[] } {
  const keys: T.BodyFieldKey[] = components.map((component) => ({ component, recordId: null }));
  const values = [
    v.satiety,
    v.hydration,
    v.sleepPressure,
    v.sleepDebtHours,
    v.fitness,
    v.exertion,
    v.depletion,
    v.health,
    v.pain,
    v.bladderFill,
    v.bladderPending,
  ];
  const add = (component: T.BodyComponent, recordId: string, n: number) => {
    keys.push({ component, recordId });
    values.push(n);
  };
  for (const i of v.injuries) {
    add('injury-severity', i.id, i.severity);
    if (i.bleedingPerDay !== null) add('injury-bleeding-per-day', i.id, i.bleedingPerDay);
  }
  for (const i of v.illnesses) {
    add('illness-severity', i.id, i.severity);
    add('illness-trend-per-day', i.id, i.trendPerDay);
  }
  for (const e of v.exposures) {
    add('exposure-recent', e.kind, e.recent);
    add('exposure-cumulative-dose', e.kind, e.cumulativeDose);
  }
  return { keys, values };
}
function materialize(
  b: T.DeepReadonly<T.BodyState>,
  keys: readonly T.DeepReadonly<T.BodyFieldKey>[],
  y: readonly number[],
): T.BodyState {
  const o: T.BodyState = cloneData(b) as T.BodyState;
  const get = (component: T.BodyComponent, recordId: string | null = null) => {
    const n = keys.findIndex((k) => k.component === component && k.recordId === recordId);
    if (n < 0) throw new RangeError('missing body component');
    return y[n] ?? 0;
  };
  o.satiety = clip(get('satiety'));
  o.hydration = clip(get('hydration'));
  o.sleepPressure = clip(get('sleep-pressure'));
  o.sleepDebtHours = Math.max(0, get('sleep-debt-hours'));
  o.fitness = clip(get('fitness'));
  o.exertion = clip(get('exertion'));
  o.depletion = clip(get('depletion'));
  o.health = clip(get('health'));
  o.pain = clip(get('pain'));
  o.bladder = { fill: clip(get('bladder-fill')), pending: Math.max(0, get('bladder-pending')) };
  for (const i of o.injuries) {
    i.severity = clip(get('injury-severity', i.id));
    if (i.bleeding !== undefined) i.bleeding = Math.max(0, get('injury-bleeding-per-day', i.id));
  }
  for (const i of o.illnesses) {
    i.severity = clip(get('illness-severity', i.id));
    i.trendPerDay = get('illness-trend-per-day', i.id);
  }
  for (const [id, e] of Object.entries(o.exposures)) {
    e.recent = clip(get('exposure-recent', id));
    e.cumulative = Math.max(0, get('exposure-cumulative-dose', id));
  }
  return o;
}
function sourcePain(b: T.DeepReadonly<T.BodyState>, p: T.DeepReadonly<T.Effective_BODY_DEFAULTS>) {
  let safe = 1;
  for (const i of b.injuries) safe *= 1 - i.severity;
  for (const i of b.illnesses) safe *= 1 - (i.chronic ? p.chronicPainWeight : 0.6) * i.severity;
  safe *= 1 - 0.4 * smooth(0.15, 0, b.satiety);
  safe *= 1 - 0.5 * smooth(0.15, 0, b.hydration);
  return clip(1 - safe);
}
const analyticComponents = new Set<T.BodyComponent>([
  'sleep-pressure',
  'sleep-debt-hours',
  'bladder-fill',
  'bladder-pending',
  'exposure-recent',
  'exposure-cumulative-dose',
  'injury-bleeding-per-day',
]);
const readoutNames = [
  'hunger',
  'thirst',
  'sleepiness',
  'fatigue',
  'pain',
  'capacity',
  'alertness',
  'perceived-hunger',
  'perceived-thirst',
  'perceived-sleepiness',
  'perceived-fatigue',
  'perceived-pain',
  'moving',
  'manipulation',
  'sight',
] as const;
const cellPaths = new Memo<{
  fields: readonly (readonly T.ScalarTrajectory['segments'][number][] | null)[];
  readout: readonly (readonly T.ScalarTrajectory['segments'][number][])[];
}>(256);
/**
 * Components whose bound clamp the right-hand side decides at the cell anchor. Satiety
 * and hydration fall at a state-independent rate; health moves at a rate that does not
 * depend on health. Clamping them per stage would put a derivative jump inside one
 * millisecond that no integer-ms cell can resolve, so integrateCell ends the cell where
 * the branch set (`branchGate`) changes instead.
 */
const anchorClamped = new Set<T.BodyComponent>(['satiety', 'hydration', 'health']);
/** The discrete branches of `rhs` that the anchor decides: bound clamps, fed, acute. */
function branches(satiety: number, hydration: number, health: number, acute: number): number {
  return (
    (satiety <= 0 ? 1 : 0) |
    (hydration <= 0 ? 2 : 0) |
    (health <= 0 ? 4 : 0) |
    (health >= 1 ? 8 : 0) |
    (satiety > 0.3 && hydration > 0.3 ? 16 : 0) |
    (acute < 0.3 ? 32 : 0)
  );
}
const branchGate = (keys: readonly T.DeepReadonly<T.BodyFieldKey>[], base: T.DeepReadonly<T.BodyState>) => {
  const at = (c: T.BodyComponent) => keys.findIndex((k) => k.component === c && k.recordId === null);
  const satiety = at('satiety'),
    hydration = at('hydration'),
    health = at('health');
  const acute = keys.flatMap((k, i) =>
    k.component === 'illness-severity' && base.illnesses.some((x) => x.id === k.recordId && !x.chronic)
      ? [i]
      : [],
  );
  const read = (v: readonly number[]) =>
    branches(
      v[satiety] ?? 0,
      v[hydration] ?? 0,
      v[health] ?? 0,
      acute.reduce((s, i) => s + clip(v[i] ?? 0), 0),
    );
  // A bound clamp the anchor already applies only zeroes motion past the bound, so
  // leaving the bound changes no branch; only arriving at one does. Masking the
  // anchor's held bounds keeps a slow departure from cutting millisecond cells.
  const held = branches(
    base.satiety,
    base.hydration,
    base.health,
    base.illnesses.filter((i) => !i.chronic).reduce((s, i) => s + i.severity, 0),
  );
  const mask = ~(held & 15);
  return (v: readonly number[]) => read(v) & mask;
};
function exactState(
  b: T.BodyState,
  base: T.DeepReadonly<T.BodyVector>,
  start: number,
  at: number,
  ctx: T.DeepReadonly<T.BodySpan>,
): T.BodyState {
  const t = (at - start) / 60000,
    p = ctx.effective.builtins.BODY_DEFAULTS,
    e = ctx.effective.builtins.ENVIRONMENT_DEFAULTS,
    q = ctx.effective.builtins.BLADDER_DEFAULTS;
  const tau = b.asleep
    ? p.sleepTau * (1 + e.coldSleep * (ctx.environment.cold ?? 0))
    : p.wakeTau * (1 - e.darkWake * (ctx.environment.dark ?? 0));
  const age = ageYearsAt(ctx.life.birthAt, start) + (at - start) / YEAR;
  b.fitness = Math.min(b.fitness, modifiersForAge(age, ctx.effective.builtins.LIFE_DEFAULTS).maxFitness);
  const s0 = base.sleepPressure;
  b.sleepPressure = b.asleep ? s0 * dexp(-t / tau) : 1 - (1 - s0) * dexp(-t / tau);
  if (b.asleep) {
    const crossing = s0 <= p.repayThreshold ? 0 : tau * dlog(s0 / p.repayThreshold);
    b.sleepDebtHours = Math.max(
      0,
      base.sleepDebtHours - (p.debtRepayPerHour * Math.max(0, t - crossing)) / 60,
    );
  } else {
    const crossing = s0 >= p.debtThreshold ? 0 : tau * dlog((1 - s0) / (1 - p.debtThreshold));
    b.sleepDebtHours = Math.min(
      p.maxSleepDebt,
      base.sleepDebtHours + (p.debtPerHourAbove * Math.max(0, t - crossing)) / 60,
    );
  }
  b.bladder.pending = base.bladderPending * dexp((-LN2 * t) / q.halfLife);
  b.bladder.fill = clip(base.bladderFill + q.basePerMinute * t + base.bladderPending - b.bladder.pending);
  for (const i of b.injuries) {
    const x = base.injuries.find((x) => x.id === i.id);
    if (x?.bleedingPerDay !== null && x?.bleedingPerDay !== undefined)
      i.bleeding =
        x.bleedingPerDay *
        dexp(
          (-LN2 * t) /
            (i.tendedAt === undefined
              ? ctx.effective.builtins.INJURY_DEFAULTS.clotHalfLife
              : ctx.effective.builtins.INJURY_DEFAULTS.tendedClotHalfLife),
        );
  }
  for (const [kind, x] of Object.entries(b.exposures)) {
    const a = base.exposures.find((x) => x.kind === kind);
    if (a) {
      x.recent = a.recent * dexp((-LN2 * t) / p.exposureRecentHalfLife);
      x.cumulative = a.cumulativeDose * dexp((-LN2 * t) / p.exposureCumulativeHalfLife);
    }
  }
  return b;
}
function rhs(
  base: T.DeepReadonly<T.BodyState>,
  keys: readonly T.BodyFieldKey[],
  ctx: T.DeepReadonly<T.BodySpan>,
  start: number,
) {
  const P = ctx.effective.builtins.BODY_DEFAULTS,
    I = ctx.effective.builtins.INJURY_DEFAULTS,
    B = ctx.effective.builtins.BLADDER_DEFAULTS,
    E = ctx.effective.builtins.ENVIRONMENT_DEFAULTS;
  return (at: number, y: readonly number[]) => {
    const b = exactState(materialize(base, keys, y), bodyVector(base), start, at, ctx),
      mods = modifiersForAge(
        ageYearsAt(ctx.life.birthAt, start) + (at - start) / YEAR,
        ctx.effective.builtins.LIFE_DEFAULTS,
      );
    const cold = ctx.environment.cold ?? 0,
      dark = ctx.environment.dark ?? 0;
    const effort = b.asleep ? 0 : clip(ctx.load.effort),
      recovery = Math.max(0.05, mods.recovery);
    const pregnancy =
      ctx.pregnancy && at - ctx.pregnancy.conceivedAt >= 13 * 7 * DAY
        ? ctx.effective.builtins.FAMILY_DEFAULTS.pregnancyMetabolism
        : 1;
    const meta =
      (b.asleep ? P.sleepMetabolism : 1) * mods.metabolism * (1 + E.coldMetabolism * cold) * pregnancy;
    const tau = b.asleep ? P.sleepTau * (1 + E.coldSleep * cold) : P.wakeTau * (1 - E.darkWake * dark);
    const starve = clip((0.1 - b.satiety) / 0.1),
      dry = clip((0.1 - b.hydration) / 0.1),
      exhausted = Math.max(smooth(0.8, 1, b.exertion), smooth(16, 32, b.sleepDebtHours));
    // `fed` and the acute gate are branches the anchor decides (see `branches`).
    const fed = base.satiety > 0.3 && base.hydration > 0.3,
      acuteGate = base.illnesses.filter((i) => !i.chronic).reduce((s, i) => s + i.severity, 0) < 0.3,
      underfed = smooth(P.underfedFrom, P.underfedFull, Math.min(b.satiety, b.hydration)),
      stress = Math.max(starve, dry, exhausted);
    const target = clip(effort * (1 - 0.5 * b.fitness) * P.exertionGain);
    const half =
      target > b.exertion
        ? P.exertionRiseHalfLife
        : ((b.asleep ? P.exertionRecoverHalfLifeAsleep : P.exertionRecoverHalfLife) *
            (1 + E.coldRecovery * cold)) /
          recovery;
    const kd = LN2 / P.detrainHalfLife,
      kt = effort > P.trainingEffort ? (kd * P.trainingRatio * (effort - P.trainingEffort)) / 0.6 : 0;
    const acute = b.illnesses.filter((i) => !i.chronic).reduce((s, i) => s + i.severity, 0),
      chronic = b.illnesses.filter((i) => i.chronic).reduce((s, i) => s + i.severity, 0);
    const derivative = (key: T.BodyFieldKey): number => {
      const id = key.recordId;
      switch (key.component) {
        case 'satiety':
          return -meta * (P.satietyPerMinute + P.satietyEffortPerMinute * effort);
        case 'hydration':
          return -meta * (P.hydrationPerMinute + P.hydrationEffortPerMinute * effort);
        case 'sleep-pressure':
          return (b.asleep ? -b.sleepPressure : 1 - b.sleepPressure) / tau;
        case 'sleep-debt-hours':
          return b.asleep
            ? b.sleepPressure < P.repayThreshold
              ? -P.debtRepayPerHour / 60
              : 0
            : b.sleepPressure > P.debtThreshold
              ? P.debtPerHourAbove / 60
              : 0;
        case 'fitness': {
          const normal =
            -kd * (b.fitness - Math.min(P.fitnessFloor, mods.maxFitness)) +
            kt * (mods.maxFitness - b.fitness);
          const age = mods.ageYears;
          const q = clip(age / 20);
          const limitRate =
            age < 20
              ? (0.7 * 6 * q * (1 - q)) / (20 * (YEAR / 60000))
              : age > ctx.effective.builtins.LIFE_DEFAULTS.fitnessPlateauEnd && mods.maxFitness > 0.15
                ? -ctx.effective.builtins.LIFE_DEFAULTS.fitnessDeclinePerYear / (YEAR / 60000)
                : 0;
          return b.fitness >= mods.maxFitness ? Math.min(normal, limitRate) : normal;
        }
        case 'exertion':
          return (LN2 * (target - b.exertion)) / half;
        case 'depletion':
          return effort > P.depletionFloor
            ? (((P.depletionPerHour * (effort - P.depletionFloor)) / (1 - P.depletionFloor)) *
                (1 - 0.5 * b.fitness) *
                (1 - b.depletion)) /
                60
            : (-LN2 * b.depletion) /
                ((b.asleep ? P.depletionSleepHalfLife : P.depletionRestHalfLife) / recovery);
        case 'health':
          return (
            ((fed && acuteGate ? P.healthRecoveryPerDay * recovery * (b.asleep ? 1.5 : 1) : 0) -
              P.starvationPerDay * starve -
              P.dehydrationPerDay * dry -
              P.illnessHealthPerDay * acute -
              P.chronicHealthPerDay * chronic -
              b.injuries.reduce((s, i) => s + (i.bleeding ?? 0), 0)) /
            1440
          );
        case 'pain':
          return (LN2 * (sourcePain(b, P) - b.pain)) / P.painHalfLife;
        case 'bladder-fill':
          return B.basePerMinute + (LN2 * b.bladder.pending) / B.halfLife;
        case 'bladder-pending':
          return (-LN2 * b.bladder.pending) / B.halfLife;
        case 'injury-severity': {
          const i = b.injuries.find((i) => i.id === id);
          return i
            ? (-i.healRatePerDay *
                recovery *
                (b.asleep ? 1.5 : 1) *
                (fed ? 1 : 0.5) *
                (1 - 0.5 * exhausted) *
                (i.tendedAt === undefined ? 1 : I.tendedHeal)) /
                1440
            : 0;
        }
        case 'injury-bleeding-per-day': {
          const i = b.injuries.find((i) => i.id === id);
          return i
            ? (-LN2 * (i.bleeding ?? 0)) / (i.tendedAt === undefined ? I.clotHalfLife : I.tendedClotHalfLife)
            : 0;
        }
        case 'illness-trend-per-day': {
          const i = b.illnesses.find((i) => i.id === id);
          if (!i || i.chronic || i.trendPerDay <= P.minIllnessTrend) return 0;
          const behaviour =
            (!b.asleep && effort <= P.restEffort ? 1 + P.restDriftBonus : 1) *
            (1 - P.underfedDriftLoss * underfed) *
            (1 - P.heavyEffortDriftLoss * clip((effort - P.heavyEffort) / (1 - P.heavyEffort))) *
            (1 -
              P.debtDriftLoss *
                smooth(required(P.debtDriftRange[0]), required(P.debtDriftRange[1]), b.sleepDebtHours));
          return (
            (-P.immuneResponsePerDay * recovery * (1 - 0.7 * stress) * (b.asleep ? 1.3 : 1) * behaviour) /
            1440
          );
        }
        case 'illness-severity': {
          const i = b.illnesses.find((i) => i.id === id);
          if (!i) return 0;
          if (i.chronic) {
            const q = clip(
              (i.baseline ?? i.severity) +
                P.chronicDebtGain * smooth(0, 16, b.sleepDebtHours) +
                P.chronicExposureGain *
                  (i.aggravatedBy ?? []).reduce((s, k) => s + (b.exposures[k]?.recent ?? 0), 0),
            );
            return (LN2 * (q - i.severity)) / P.chronicHalfLife + i.trendPerDay / 1440;
          }
          return (i.trendPerDay + P.illnessStressPerDay * stress + P.underfedWorsenPerDay * underfed) / 1440;
        }
        case 'exposure-recent':
          return (-LN2 * (b.exposures[id ?? '']?.recent ?? 0)) / P.exposureRecentHalfLife;
        case 'exposure-cumulative-dose':
          return (-LN2 * (b.exposures[id ?? '']?.cumulative ?? 0)) / P.exposureCumulativeHalfLife;
      }
    };
    const d = keys.map((k, j) => {
      let v = analyticComponents.has(k.component) ? 0 : derivative(k);
      // Anchor-clamped components take their bound clamp from the anchor (see
      // `anchorClamped`); integrateCell ends the cell at the crossing.
      const raw = anchorClamped.has(k.component)
        ? k.component === 'satiety'
          ? base.satiety
          : k.component === 'hydration'
            ? base.hydration
            : base.health
        : (y[j] ?? 0);
      const unbounded = [
        'illness-trend-per-day',
        'injury-bleeding-per-day',
        'exposure-cumulative-dose',
        'bladder-pending',
        'sleep-debt-hours',
      ].includes(k.component);
      const lo = k.component === 'illness-trend-per-day' ? P.minIllnessTrend : 0;
      const hi =
        k.component === 'sleep-debt-hours'
          ? P.maxSleepDebt
          : k.component === 'bladder-pending'
            ? B.maxPending
            : unbounded
              ? Infinity
              : 1;
      if ((raw <= lo && v < 0) || (raw >= hi && v > 0)) v = 0;
      return v;
    });
    const s = readBody(b, at, P).sleepiness;
    d.push(
      dozeIntensity(
        s,
        b.doze.context,
        b.alive && !b.asleep && !b.downed,
        ctx.effective.builtins.DOZE_DEFAULTS,
        ctx.effective.doze.hazardScale,
      ),
    );
    return d;
  };
}
// A local analytic upper bound prevents a narrow positive doze window from being
// discarded merely because all Runge–Kutta samples were closed. This is local
// branch isolation, not a global error certificate.
function possibleDoze(
  base: T.BodyState,
  start: number,
  end: number,
  ctx: T.DeepReadonly<T.BodySpan>,
): boolean {
  const p = ctx.effective.builtins.BODY_DEFAULTS,
    d = ctx.effective.builtins.DOZE_DEFAULTS;
  if (
    !base.alive ||
    base.asleep ||
    base.downed ||
    base.doze.context.posture === 'upright' ||
    base.doze.context.stimulation >= d.stimulation
  )
    return false;
  const v = bodyVector(base),
    a = readBody(base, start, p),
    b = readBody(exactState(copy<T.BodyState>(base), v, start, end, ctx), end, p);
  const phase = (((start - base.circadianPeakMs) % DAY) + DAY) % DAY;
  const width = end - start;
  const c0 = dcos((2 * Math.PI * phase) / DAY),
    c1 = dcos((2 * Math.PI * (phase + width)) / DAY);
  const nextTrough = phase <= DAY / 2 ? DAY / 2 - phase : DAY * 1.5 - phase;
  const minCos = width >= DAY || nextTrough <= width ? -1 : Math.min(c0, c1);
  const dip = (((base.circadianPeakMs - 120 * 60000) % DAY) + DAY) % DAY;
  const dayStart = start - (((start % DAY) + DAY) % DAY);
  let distance = Infinity;
  for (const shift of [-1, 0, 1, 2]) {
    const center = dayStart + dip + shift * DAY;
    distance = Math.min(distance, center < start ? start - center : center > end ? center - end : 0);
  }
  const minimumAlert = clip(
    0.5 + 0.5 * minCos - 0.12 * dexp((-distance * distance) / (2 * 3600000 * 3600000)),
  );
  const last = exactState(copy<T.BodyState>(base), v, start, end, ctx);
  const upper = clip(
    p.sleepinessPressureWeight * Math.max(base.sleepPressure, last.sleepPressure) +
      p.sleepinessCircadianWeight * (1 - minimumAlert) +
      p.sleepinessDebtWeight * (1 - dexp(-Math.max(base.sleepDebtHours, last.sleepDebtHours) / 8)),
  );
  return upper > d.sleepiness || a.sleepiness > d.sleepiness || b.sleepiness > d.sleepiness;
}
function continuation(
  b: T.DeepReadonly<T.BodyState>,
  at: number,
  id: string,
  hash: string,
): T.BodyContinuation {
  return {
    clock: clock(at, id, hash),
    anchor: bodyVector(b),
    acceptedThroughMs: at,
    materializedAtMs: at,
    nextTrialWidthMinutes: initialWidth(20) / 60000,
    cells: [],
    errors: [],
    circadian: { epochMs: 0, peakOffsetMs: b.circadianPeakMs },
    sleep: {
      asleep: b.asleep,
      sinceMs: b.since,
      dozeSinceMs: b.doze.since ?? null,
      lastSleep: b.lastSleep ? { fromMs: b.lastSleep.from, toMs: b.lastSleep.to } : null,
    },
    clipping: [],
    pendingRoots: [],
  };
}
function init(
  input: T.DeepReadonly<T.InitialBody>,
  c: T.DeepReadonly<T.FrameContext>,
): ReturnType<T.BodyOwner['initialize']> {
  const b: T.BodyState = {
    satiety: input.satiety,
    hydration: input.hydration,
    sleepPressure: input.sleepPressure,
    exertion: input.exertion,
    fitness: input.fitness,
    health: input.health,
    pain: input.pain,
    sleepDebtHours: input.sleepDebtHours,
    depletion: input.depletion,
    circadianPeakMs: input.circadianPeakMs,
    asleep: input.asleep,
    since: input.since,
    alive: input.health > 0,
    nextId: 0,
    doze: cloneData(input.doze),
    bladder: cloneData(input.bladder),
    injuries: cloneData(input.injuries) as T.Injury[],
    illnesses: cloneData(input.illnesses) as T.Illness[],
    exposures: Object.fromEntries(
      input.exposures.map((e) => [e.agent, { recent: e.recent, cumulative: e.cumulative, lastAt: e.lastAt }]),
    ),
  };
  if (input.downed) b.downed = cloneData(input.downed);
  for (const i of b.illnesses) if (i.chronic && i.baseline === undefined) i.baseline = i.severity;
  const id = `body:${c.person}:${c.at}`;
  const d: T.DozeContinuation = {
    hazard: newHazard({ kind: 'doze', channelId: 'onset' }, c.at, id, c.effectiveParametersHash),
    context: { ...b.doze.context, basis: 'authored', atMs: b.doze.basis.at, conditionId: id },
  };
  return {
    state: b,
    continuation: continuation(b, c.at, id, c.effectiveParametersHash),
    dozeContinuation: d,
  };
}
/** Satiety and hydration loss per minute at `at`: the rhs law without its floor clamp. */
function floorRates(b: T.DeepReadonly<T.BodyState>, at: number, ctx: T.DeepReadonly<T.BodySpan>) {
  const P = ctx.effective.builtins.BODY_DEFAULTS,
    E = ctx.effective.builtins.ENVIRONMENT_DEFAULTS;
  const mods = modifiersForAge(
    ageYearsAt(ctx.life.birthAt, Math.floor(at)) + (at - Math.floor(at)) / YEAR,
    ctx.effective.builtins.LIFE_DEFAULTS,
  );
  const effort = b.asleep ? 0 : clip(ctx.load.effort);
  const pregnancy =
    ctx.pregnancy && at - ctx.pregnancy.conceivedAt >= 13 * 7 * DAY
      ? ctx.effective.builtins.FAMILY_DEFAULTS.pregnancyMetabolism
      : 1;
  const meta =
    (b.asleep ? P.sleepMetabolism : 1) *
    mods.metabolism *
    (1 + E.coldMetabolism * (ctx.environment.cold ?? 0)) *
    pregnancy;
  return {
    satiety: meta * (P.satietyPerMinute + P.satietyEffortPerMinute * effort),
    hydration: meta * (P.hydrationPerMinute + P.hydrationEffortPerMinute * effort),
  };
}
/** Engineering law at the 1 ms time resolution: a store that would empty within the
 * next 2 ms of decline empties now. This drops at most 2 ms of loss (about 3e-8 at
 * default rates) so the emptying lands on an integer millisecond and starts a new
 * condition, instead of a sub-millisecond kink that no cell or readout can fit. */
function floorsDue(b: T.DeepReadonly<T.BodyState>, at: number, ctx: T.DeepReadonly<T.BodySpan>) {
  if (!b.alive) return [];
  const rates = floorRates(b, at, ctx);
  return (['satiety', 'hydration'] as const).filter((k) => b[k] > 0 && b[k] <= (2 * rates[k]) / 60000);
}
function snapFloors(b: T.BodyState, at: number, ctx: T.DeepReadonly<T.BodySpan>): void {
  for (const k of floorsDue(b, at, ctx)) b[k] = 0;
}
function eventPredicate(b: T.DeepReadonly<T.BodyState>, ctx: T.DeepReadonly<T.BodySpan>): boolean {
  const p = ctx.effective.builtins;
  return (
    b.health <= 0 ||
    floorsDue(b, ctx.to, ctx).length > 0 ||
    b.injuries.some(
      (i) => i.severity <= 0.001 || (i.bleeding !== undefined && i.bleeding <= p.INJURY_DEFAULTS.bleedStops),
    ) ||
    b.illnesses.some((i) => !i.chronic && i.severity <= 0.001 && i.trendPerDay <= 0) ||
    Object.values(b.exposures).some((e) => e.recent < 0.001 && e.cumulative < 0.001) ||
    (!b.downed &&
      (b.health < ctx.effective.fixedPriors.downing.health ||
        readCapacities(b).moving < ctx.effective.fixedPriors.downing.moving)) ||
    !!(
      b.downed &&
      (b.downed.until !== undefined
        ? b.downed.until <= ctx.to
        : (b.downed.reason === 'health' || b.downed.reason === 'capacity') &&
          b.health >= ctx.effective.fixedPriors.downing.health + p.INJURY_DEFAULTS.standMargin &&
          readCapacities(b).moving >=
            ctx.effective.fixedPriors.downing.moving + p.INJURY_DEFAULTS.standMargin)
    )
  );
}
function applyPhysical(
  b: T.BodyState,
  at: number,
  ctx: T.DeepReadonly<Pick<T.BodySpan, 'effective'>>,
): T.EventData[] {
  const e: T.EventData[] = [];
  const emit = (change: T.BodyChange) => e.push({ kind: 'body-change', change });
  if (b.health <= 0 && b.alive) {
    b.alive = false;
    b.asleep = false;
    delete b.doze.since;
    emit({ kind: 'died', discoveredAt: at });
  }
  b.injuries = b.injuries.filter((i) => i.severity > 0.001);
  for (const i of b.injuries)
    if (i.bleeding !== undefined && i.bleeding <= ctx.effective.builtins.INJURY_DEFAULTS.bleedStops)
      delete i.bleeding;
  b.illnesses = b.illnesses.filter((i) => i.chronic || i.severity > 0.001 || i.trendPerDay > 0);
  for (const [k, v] of Object.entries(b.exposures))
    if (v.recent < 0.001 && v.cumulative < 0.001) delete b.exposures[k];
  if (b.alive && !b.downed) {
    const reason =
      b.health < ctx.effective.fixedPriors.downing.health
        ? 'health'
        : readCapacities(b).moving < ctx.effective.fixedPriors.downing.moving
          ? 'capacity'
          : null;
    if (reason) {
      b.downed = { since: at, reason };
      emit({ kind: 'downed', since: at, reason });
    }
  } else if (
    b.alive &&
    b.downed &&
    ((b.downed.until !== undefined && b.downed.until <= at) ||
      ((b.downed.reason === 'health' || b.downed.reason === 'capacity') &&
        b.health >= ctx.effective.fixedPriors.downing.health + 0.05 &&
        readCapacities(b).moving >= ctx.effective.fixedPriors.downing.moving + 0.05))
  ) {
    const ended = { from: b.downed.since, to: at };
    b.lastDowned = ended;
    delete b.downed;
    emit({ kind: 'stood', ended });
  }
  return e;
}
function firstPhysicalBoundary(
  at: number,
  stop: number,
  cells: readonly T.ScalarCell[],
  keys: readonly T.BodyFieldKey[],
  bodyAt: (t: number) => T.BodyState,
  ctx: T.DeepReadonly<T.BodySpan>,
): number | null {
  const pred = (t: number) => eventPredicate(bodyAt(t), { ...ctx, to: t });
  if (pred(at)) return at;
  const points = [at, stop];
  for (let i = 0; i < keys.length; i++) {
    const k = required(keys[i]),
      cell = required(cells[i]);
    const thresholds =
      k.component === 'health'
        ? [
            0,
            ctx.effective.fixedPriors.downing.health,
            ctx.effective.fixedPriors.downing.health + ctx.effective.builtins.INJURY_DEFAULTS.standMargin,
          ]
        : k.component === 'illness-severity'
          ? [0.001]
          : k.component === 'illness-trend-per-day'
            ? [0]
            : k.component === 'injury-severity'
              ? [0.001]
              : [];
    for (const value of thresholds) points.push(...thresholdTimes(cell, at, stop, value));
  }
  if (bodyAt(at).downed) {
    const moving = sampledPath(at, stop, (t) => readCapacities(bodyAt(t)).moving);
    for (const segment of moving)
      if (segment.kind === 'quartic')
        for (const value of [
          ctx.effective.fixedPriors.downing.moving,
          ctx.effective.fixedPriors.downing.moving + ctx.effective.builtins.INJURY_DEFAULTS.standMargin,
        ])
          points.push(...thresholdTimes(segment.cell, segment.from, segment.to, value));
    const until = bodyAt(at).downed?.until;
    if (until !== undefined && until >= at && until <= stop) points.push(until);
  }
  const sorted = [...new Set(points)].sort((a, b) => a - b),
    probes = [...sorted, ...sorted.slice(0, -1).map((t, i) => (t + required(sorted[i + 1])) / 2)].sort(
      (a, b) => a - b,
    );
  let previous = at;
  for (const t of probes) {
    if (t < at || t > stop) continue;
    if (pred(t)) {
      const hi = Math.min(stop, Math.ceil(t));
      if (!pred(hi)) {
        const floor = Math.max(at, Math.floor(t));
        if (!pred(floor)) throw new RangeError('limit-exceeded: unresolved sub-ms physical transition');
        return firstMs(Math.max(at, Math.floor(previous)), floor, pred);
      }
      return firstMs(Math.max(at, Math.floor(previous)), hi, pred);
    }
    previous = t;
  }
  return null;
}
function constantBodyTrajectory(
  b: T.DeepReadonly<T.BodyState>,
  from: number,
  to: number,
  id: string,
  ctx: T.DeepReadonly<T.BodySpan>,
): T.BodyTrajectory {
  const v = flatten(bodyVector(b));
  const names = [
    'hunger',
    'thirst',
    'sleepiness',
    'fatigue',
    'pain',
    'capacity',
    'alertness',
    'perceived-hunger',
    'perceived-thirst',
    'perceived-sleepiness',
    'perceived-fatigue',
    'perceived-pain',
    'moving',
    'manipulation',
    'sight',
  ] as const;
  return {
    id,
    conditionId: id,
    from,
    to,
    fields: v.keys.map((field, i) => ({
      field,
      path: { from, to, segments: [{ kind: 'constant', from, to, value: required(v.values[i]) }] },
    })),
    readout: names.map((field) => {
      const f = (at: number) => {
        if (field === 'moving' || field === 'manipulation' || field === 'sight')
          return readCapacities(b)[field];
        const r = readBody(b, at, ctx.effective.builtins.BODY_DEFAULTS, ctx.perception);
        return field.startsWith('perceived-')
          ? r.perceived[field.slice(10) as keyof T.BodyReadout['perceived']]
          : r[field as Exclude<keyof T.BodyReadout, 'perceived'>];
      };
      return { field, path: { from, to, segments: sampledPath(from, to, f) } };
    }),
  };
}
const advance: T.BodyOwner['advance'] = (state, ctx) => {
  minutes(ctx.from, ctx.to);
  let b: T.BodyState = cloneData(state) as T.BodyState,
    c: T.BodyContinuation = copy<T.BodyContinuation>(ctx.continuation),
    d: T.DozeContinuation = copy<T.DozeContinuation>(ctx.dozeContinuation);
  if (!b.alive)
    return {
      ...output(b, ctx.to),
      continuation: {
        ...c,
        clock: { ...c.clock, advancedThroughMs: ctx.to },
        materializedAtMs: ctx.to,
        acceptedThroughMs: ctx.to,
      },
      // A dead body covers this elapsed span with zero doze hazard and no draw.
      dozeContinuation: {
        ...d,
        hazard: {
          ...d.hazard,
          clock: { ...d.hazard.clock, advancedThroughMs: ctx.to },
          materializedAtMs: ctx.to,
          acceptedThroughMs: ctx.to,
          eligibility: 'closed',
        },
      },
      randomBoundary: null,
      trajectory: constantBodyTrajectory(
        b,
        ctx.from,
        ctx.to,
        `${c.clock.conditionId}:${c.clock.conditionAnchorMs}`,
        ctx,
      ),
    };
  // Voluntary sleep takes over an existing doze without restarting sleep time.
  if (ctx.load.mode === 'sleep' && b.asleep) delete b.doze.since;
  if (
    (ctx.load.mode === 'sleep' && !b.asleep) ||
    (ctx.load.mode === 'awake' && b.asleep && b.doze.since === undefined)
  ) {
    if (b.asleep) b.lastSleep = { from: b.since, to: ctx.from };
    b.asleep = ctx.load.mode === 'sleep';
    b.since = ctx.from;
    delete b.doze.since;
    c = continuation(b, ctx.from, `body:${ctx.person}:mode:${ctx.from}`, ctx.effectiveParametersHash);
    const h = d.hazard;
    const integral = h.activeIntegralCell ? evaluateCell(h.activeIntegralCell, ctx.from) : h.acceptedIntegral;
    d = {
      ...d,
      hazard: {
        ...h,
        clock: clock(ctx.from, c.clock.conditionId, ctx.effectiveParametersHash),
        activeIntegralCell: null,
        anchorIntegral: integral,
        acceptedIntegral: integral,
        acceptedThroughMs: ctx.from,
      },
    };
  }
  const conditionId = JSON.stringify([
    'body',
    ctx.effectiveParametersHash,
    ctx.life.birthAt,
    ctx.load.effort,
    ctx.load.focus,
    ctx.load.mode,
    ctx.environment.cold ?? null,
    ctx.environment.dark ?? null,
    ctx.environment.crowding ?? null,
    ctx.environment.beauty ?? null,
    ctx.environment.weather ?? null,
    ctx.environment.dayLengthHours ?? null,
    ctx.environment.outdoors ?? null,
    ctx.pregnancy?.id ?? null,
    ctx.pregnancy?.conceivedAt ?? null,
    ctx.perception.fasting,
    ctx.perception.fastingDays,
    b.doze.context.posture,
    b.doze.context.stimulation,
  ]);
  if (c.clock.conditionId !== conditionId) {
    c = continuation(b, ctx.from, conditionId, ctx.effectiveParametersHash);
    d = { ...d, hazard: rebaseHazard(d.hazard, ctx.from, conditionId, ctx.effectiveParametersHash) };
  }
  let at = ctx.from;
  let boundary: T.HazardBoundary | null = null;
  const events: T.EventData[] = [];
  const paths = new Map<
    string,
    { field: T.BodyFieldKey; segments: T.ScalarTrajectory['segments'][number][] }
  >();
  const readSegments = new Map<
    T.BodyTrajectory['readout'][number]['field'],
    T.ScalarTrajectory['segments'][number][]
  >();
  let calls = 0,
    segments = 0;
  const lambda = (body: T.DeepReadonly<T.BodyState>, t: number) =>
    dozeIntensity(
      readBody(body, t, ctx.effective.builtins.BODY_DEFAULTS).sleepiness,
      body.doze.context,
      body.alive && !body.asleep && !body.downed,
      ctx.effective.builtins.DOZE_DEFAULTS,
      ctx.effective.doze.hazardScale,
    );
  if (b.alive && eventPredicate(b, { ...ctx, to: at })) {
    snapFloors(b, at, ctx);
    const physicalEvents = applyPhysical(b, at, ctx);
    c = continuation(b, at, conditionId, ctx.effectiveParametersHash);
    d = { ...d, hazard: rebaseHazard(d.hazard, at, conditionId, ctx.effectiveParametersHash) };
    return {
      ...output(b, at),
      events: physicalEvents,
      nextBoundary: at,
      continuation: c,
      dozeContinuation: d,
      randomBoundary: null,
      trajectory: constantBodyTrajectory(b, at, at, `${conditionId}:${at}`, ctx),
    };
  }
  if (!d.hazard.threshold && lambda(b, at) > 0) {
    boundary = { key: d.hazard.key, at, operation: 'allocate' };
    return {
      ...output(b, at),
      continuation: c,
      dozeContinuation: d,
      randomBoundary: boundary,
      trajectory: constantBodyTrajectory(
        b,
        at,
        at,
        `${c.clock.conditionId}:${c.clock.conditionAnchorMs}`,
        ctx,
      ),
    };
  }
  if (ctx.to === ctx.from)
    return {
      ...output(b, ctx.from),
      continuation: c,
      dozeContinuation: d,
      randomBoundary: null,
      trajectory: constantBodyTrajectory(
        b,
        ctx.from,
        ctx.to,
        `${c.clock.conditionId}:${c.clock.conditionAnchorMs}`,
        ctx,
      ),
    };
  while (at < ctx.to) {
    const flat = flatten(c.anchor);
    let cells = c.cells.map((x) => x.cell);
    let end = c.acceptedThroughMs;
    let start = cells[0]?.originMs ?? at;
    let hazardCell = d.hazard.activeIntegralCell;
    if (!cells.length || at >= end) {
      const baseAt = cells.length ? end : c.clock.conditionAnchorMs;
      const values = cells.length ? cells.map((x) => evaluateCell(x, end)) : flat.values;
      const base = exactState(materialize(b, flat.keys, values), c.anchor, start, baseAt, ctx);
      c = { ...c, anchor: bodyVector(base) };
      const f = flatten(c.anchor);
      const initial = d.hazard.acceptedIntegral;
      let trialWidth = Math.min(Math.max(1, c.nextTrialWidthMinutes * 60000), initialWidth(1440));
      let isolation = 0;
      while (
        possibleDoze(base, baseAt, baseAt + trialWidth, ctx) &&
        [0, 0.2, 0.3, 0.5, 0.8, 8 / 9, 1].every(
          (q) =>
            lambda(
              exactState(copy<T.BodyState>(base), c.anchor, baseAt, baseAt + q * trialWidth, ctx),
              baseAt + q * trialWidth,
            ) === 0,
        )
      ) {
        if (trialWidth <= 1 || ++isolation > 32)
          throw new RangeError('limit-exceeded: unresolved positive doze eligibility');
        trialWidth = Math.max(1, Math.floor(trialWidth / 2));
      }
      const result = integrateCell(
        baseAt,
        [...f.values, initial],
        trialWidth,
        rhs(base, f.keys, ctx, baseAt),
        1e-12,
        f.values
          .map((_, i) =>
            f.keys[i]?.component === 'sleep-debt-hours'
              ? ctx.effective.builtins.BODY_DEFAULTS.maxSleepDebt
              : 1,
          )
          .concat(1),
        [f.values.length],
        branchGate(f.keys, base),
      );
      calls += result.calls;
      if (calls > 8192 || ++segments > 1024)
        throw new RangeError('limit-exceeded: body span; use shorter span');
      cells = result.cells.slice(0, -1);
      hazardCell = result.cells.at(-1) ?? null;
      start = baseAt;
      end = result.to;
      c = {
        ...c,
        acceptedThroughMs: end,
        nextTrialWidthMinutes: result.nextWidth / 60000,
        errors: f.keys.map((field) => ({
          field,
          absoluteNormalizedErrorEstimate:
            (c.errors.find(
              (x) => x.field.component === field.component && x.field.recordId === field.recordId,
            )?.absoluteNormalizedErrorEstimate ?? 0) + result.error,
        })),
        cells: f.keys.map((field, i) => ({ field, cell: required(cells[i]) })),
      };
      d = { ...d, hazard: { ...d.hazard, activeIntegralCell: hazardCell, acceptedThroughMs: end } };
    }
    const keys = c.cells.map((x) => x.field);
    const bodyAt = (t: number) =>
      exactState(
        materialize(
          b,
          keys,
          cells.map((cell) => evaluateCell(cell, t)),
        ),
        c.anchor,
        start,
        t,
        ctx,
      );
    // Read-only views share one materialization per sample time: the 15 readouts,
    // analytic paths and boundary searches sample the same cell at the same times.
    const views = new Map<number, T.BodyState>();
    const viewAt = (t: number) => {
      const hit = views.get(t);
      if (hit) return hit;
      const v = bodyAt(t);
      views.set(t, v);
      return v;
    };
    const integral = (t: number) => (hazardCell ? evaluateCell(hazardCell, t) : d.hazard.acceptedIntegral);
    let stop = Math.min(ctx.to, end);
    let physical = false;
    const physicalAt = firstPhysicalBoundary(at, stop, cells, keys, viewAt, ctx);
    if (physicalAt !== null) {
      stop = physicalAt;
      physical = true;
    }
    const h = d.hazard;
    if (h.threshold) {
      if (integral(stop) >= h.threshold.exponentialBudget) {
        const time = firstMs(at, stop, (t) => integral(t) >= required(h.threshold).exponentialBudget);
        if (time < stop) physical = false;
        stop = time;
        boundary = { key: h.key, at: time, operation: 'fire' };
      }
    } else if (integral(stop) > h.anchorIntegral) {
      const eligibleAt = firstMs(at, stop, (t) => integral(t) > h.anchorIntegral);
      if (eligibleAt < stop) physical = false;
      stop = eligibleAt;
      boundary = { key: h.key, at: stop, operation: 'allocate' };
    }
    // Cells cover the full canonical numerical dependency, not just the caller target.
    // The sampled paths are a pure function of the cell and the body's non-integrated
    // fields, so every probe of this cell reuses them (see core/memo.ts).
    const derived = cellPaths.get(
      JSON.stringify([
        materialize(
          b,
          keys,
          keys.map(() => 0),
        ),
        c.cells,
        c.anchor,
        start,
        end,
        ctx.environment,
        ctx.life.birthAt,
        ctx.perception,
        ctx.pregnancy ?? null,
        keyOf(ctx.effective.builtins),
        ctx.effectiveParametersHash,
      ]),
      () => {
        const reads = new Map<number, T.BodyReadout>();
        const read = (t: number) => {
          const hit = reads.get(t);
          if (hit) return hit;
          const r = readBody(viewAt(t), t, ctx.effective.builtins.BODY_DEFAULTS, ctx.perception);
          reads.set(t, r);
          return r;
        };
        return {
          fields: keys.map((field, i) =>
            analyticComponents.has(field.component)
              ? sampledPath(start, end, (t) => required(flatten(bodyVector(viewAt(t))).values[i]))
              : null,
          ),
          readout: readoutNames.map((name) =>
            sampledPath(start, end, (t) => {
              if (name === 'moving' || name === 'manipulation' || name === 'sight')
                return readCapacities(viewAt(t))[name];
              if (name.startsWith('perceived-'))
                return read(t).perceived[name.slice(10) as keyof T.BodyReadout['perceived']];
              return read(t)[name as Exclude<keyof T.BodyReadout, 'perceived'>];
            }),
          ),
        };
      },
    );
    for (let i = 0; i < keys.length; i++) {
      const field = required(keys[i]);
      const id = JSON.stringify(field);
      const entry = paths.get(id) ?? { field, segments: [] };
      entry.segments.push(
        ...(derived.fields[i] ?? [
          { kind: 'quartic' as const, from: start, to: end, cell: required(cells[i]) },
        ]),
      );
      paths.set(id, entry);
    }
    readoutNames.forEach((name, i) => {
      readSegments.set(name, [...(readSegments.get(name) ?? []), ...required(derived.readout[i])]);
    });
    b = bodyAt(stop);
    at = stop;
    c = { ...c, clock: { ...c.clock, advancedThroughMs: at }, materializedAtMs: at };
    d = {
      ...d,
      hazard: {
        ...d.hazard,
        clock: { ...d.hazard.clock, advancedThroughMs: at },
        materializedAtMs: at,
        acceptedIntegral: integral(end),
      },
    };
    if (physical) {
      snapFloors(b, at, ctx);
      events.push(...applyPhysical(b, at, ctx));
      c = continuation(b, at, `${c.clock.conditionId}:event:${at}`, ctx.effectiveParametersHash);
      d = {
        ...d,
        hazard: {
          ...d.hazard,
          clock: clock(at, c.clock.conditionId, ctx.effectiveParametersHash),
          anchorIntegral: integral(at),
          acceptedIntegral: integral(at),
          activeIntegralCell: null,
          acceptedThroughMs: at,
        },
      };
      break;
    }
    if (boundary) break;
    if (at === end) {
      d = { ...d, hazard: { ...d.hazard, anchorIntegral: integral(end) } };
    }
  }
  const trajectory: T.BodyTrajectory = {
    id: `${c.clock.conditionId}:${c.clock.conditionAnchorMs}`,
    conditionId: c.clock.conditionId,
    from: ctx.from,
    to: [...paths.values()].reduce((end, x) => x.segments.reduce((end, s) => Math.max(end, s.to), end), at),
    fields: [...paths.values()].map((x) => ({
      field: x.field,
      path: {
        from: ctx.from,
        to: x.segments.reduce((end, s) => Math.max(end, s.to), at),
        segments: x.segments,
      },
    })),
    readout: [...readSegments].map(([field, s]) => ({
      field,
      path: { from: ctx.from, to: s.reduce((end, x) => Math.max(end, x.to), at), segments: s },
    })),
  };
  return {
    ...output(b, at),
    events,
    nextBoundary: boundary?.at ?? (at < ctx.to ? at : null),
    continuation: c,
    dozeContinuation: d,
    randomBoundary: boundary,
    trajectory,
  };
};
const receive: T.BodyOwner['receive'] = (state, input, ctx) => {
  const b: T.BodyState = cloneData(state) as T.BodyState;
  const events: T.EventData[] = [];
  const emit = (change: T.BodyChange) => events.push({ kind: 'body-change', change });
  const id = (prefix: string) => {
    let v: string;
    do {
      v = `${prefix}:${ctx.at}:${b.nextId++}`;
    } while (b.injuries.some((i) => i.id === v) || b.illnesses.some((i) => i.id === v));
    return v;
  };
  const receipt = (
    r: T.DeepReadonly<Exclude<T.BodyReceipt, { type: 'physical-contact' }>>,
    receiptId: string,
  ) => {
    if (!b.alive) return;
    switch (r.type) {
      case 'consumed': {
        const q = r.received;
        for (const x of Object.values(q))
          if (!Number.isFinite(x)) throw new RangeError('invalid consumed amount');
        if (q.food) b.satiety = clip(b.satiety + q.food);
        if (q.water) {
          b.hydration = clip(b.hydration + q.water);
          if (q.water > 0)
            b.bladder.pending = Math.min(
              ctx.effective.builtins.BLADDER_DEFAULTS.maxPending,
              b.bladder.pending + ctx.effective.builtins.BLADDER_DEFAULTS.intakeScale * clip(q.water),
            );
        }
        if (q.relief) b.pain = clip(b.pain - q.relief);
        emit({ kind: 'consumed', received: cloneData(q), receiptId });
        break;
      }
      case 'exerted':
        for (const k of ['sleepPressure', 'exertion'] as const) {
          const v = r.costs[k];
          if (v !== undefined && Number.isFinite(v) && v > 0) b[k] = clip(b[k] + v);
        }
        emit({ kind: 'exerted', costs: cloneData(r.costs), receiptId });
        break;
      case 'injured': {
        const injury: T.Injury = { ...cloneData(r.injury), id: id('injury'), since: ctx.at };
        b.injuries.push(injury);
        if (b.injuries.length > ctx.effective.builtins.BODY_DEFAULTS.maxInjuries) {
          let min = 0;
          for (let j = 1; j < b.injuries.length; j++)
            if (required(b.injuries[j]).severity < required(b.injuries[min]).severity) min = j;
          b.injuries.splice(min, 1);
        }
        b.pain = Math.max(b.pain, sourcePain(b, ctx.effective.builtins.BODY_DEFAULTS));
        emit({ kind: 'injured', injury });
        break;
      }
      case 'illness': {
        const illness: T.Illness = {
          ...cloneData(r.illness),
          aggravatedBy: r.illness.aggravatedBy ? [...r.illness.aggravatedBy] : undefined,
          id: id('illness'),
          since: ctx.at,
        } as T.Illness;
        if (illness.chronic && illness.baseline === undefined) illness.baseline = illness.severity;
        b.illnesses.push(illness);
        if (b.illnesses.length > ctx.effective.builtins.BODY_DEFAULTS.maxIllnesses) {
          const acute = b.illnesses.filter((i) => !i.chronic);
          const drop = [...(acute.length ? acute : b.illnesses)].sort((a, b) => a.severity - b.severity)[0];
          b.illnesses = b.illnesses.filter((i) => i !== drop);
        }
        emit({ kind: 'illness', illness });
        break;
      }
      case 'exposed': {
        if (!Number.isFinite(r.amount) || r.amount <= 0)
          throw new RangeError('positive actual exposure required');
        const e = b.exposures[r.agent] ?? { recent: 0, cumulative: 0, lastAt: ctx.at };
        e.recent = clip(
          e.recent + ctx.effective.builtins.BODY_DEFAULTS.exposureRecentGain * r.amount * (1 - e.recent),
        );
        e.cumulative += r.amount;
        e.lastAt = ctx.at;
        b.exposures[r.agent] = e;
        const keys = Object.keys(b.exposures);
        if (keys.length > ctx.effective.builtins.BODY_DEFAULTS.maxExposures) {
          const drop = keys
            .filter((k) => k !== r.agent)
            .sort((a, c) => required(b.exposures[a]).cumulative - required(b.exposures[c]).cumulative)[0];
          if (drop) delete b.exposures[drop];
        }
        break;
      }
      case 'treated': {
        const i = b.injuries.find((i) => i.id === r.injuryId);
        if (i) {
          i.tendedAt = ctx.at;
          if (i.bleeding !== undefined)
            i.bleeding *= 1 - ctx.effective.builtins.INJURY_DEFAULTS.tendBleedCut * r.quality;
        }
        break;
      }
      case 'fallen':
        b.downed = {
          since: ctx.at,
          reason: r.cause,
          ...(r.observedUntil === undefined ? {} : { until: r.observedUntil }),
        };
        emit({ kind: 'downed', ...b.downed });
        break;
      case 'stood':
        if (b.downed) {
          b.lastDowned = { from: b.downed.since, to: ctx.at };
          delete b.downed;
          emit({ kind: 'stood', ended: b.lastDowned });
        }
        break;
      case 'voided':
        if (!b.asleep) {
          b.bladder.fill = 0;
          emit({ kind: 'voided', receiptId });
        }
        break;
    }
  };
  if (input.kind === 'receipt') receipt(input.receipt, input.id);
  else if (input.kind === 'actual-death') {
    if (b.alive) {
      b.alive = false;
      b.health = 0;
      b.asleep = false;
      delete b.doze.since;
      emit({ kind: 'died', discoveredAt: ctx.at });
    }
  } else if (input.kind === 'ambient-context') {
    b.doze = { ...b.doze, context: cloneData(input.context), basis: cloneData(input.basis) };
  } else if (input.kind === 'wake') {
    const e = input.evidence;
    if (
      b.doze.since !== undefined &&
      e.occurredAt >= b.doze.since &&
      e.occurredAt <= ctx.at &&
      e.salience >= ctx.effective.builtins.DOZE_DEFAULTS.wakeSalience &&
      e.near !== false &&
      (e.targetId === ctx.person || e.near === true) &&
      ['heard', 'felt', 'social'].includes(e.channel)
    ) {
      const slept = { from: b.since, to: ctx.at };
      delete b.doze.since;
      b.asleep = false;
      b.lastSleep = slept;
      b.since = ctx.at;
      emit({ kind: 'woke', slept, evidenceId: e.id });
    }
  } else {
    const a = input.outcome.actual;
    const rid = input.outcome.evidenceId;
    if (a.consumed) receipt({ type: 'consumed', actionReceipt: rid, received: a.consumed }, rid);
    if (a.exerted) receipt({ type: 'exerted', actionReceipt: rid, costs: a.exerted }, rid);
    if (a.injury) receipt({ type: 'injured', injury: a.injury }, rid);
    if (a.illness) receipt({ type: 'illness', illness: a.illness }, rid);
    for (const e of a.exposures) receipt({ type: 'exposed', ...e }, rid);
    if (a.voidedBladder && input.outcome.status === 'completed')
      receipt({ type: 'voided', actionReceipt: rid }, rid);
  }
  events.push(...applyPhysical(b, ctx.at, ctx));
  const c = continuation(
    b,
    ctx.at,
    `body:${ctx.person}:${ctx.at}:${ctx.causes.join(':')}`,
    ctx.effectiveParametersHash,
  );
  const old = ctx.dozeContinuation.hazard;
  const integral = old.activeIntegralCell
    ? evaluateCell(old.activeIntegralCell, ctx.at)
    : old.acceptedIntegral;
  const d: T.DozeContinuation = {
    ...copy<T.DozeContinuation>(ctx.dozeContinuation),
    context: {
      ...b.doze.context,
      basis: b.doze.basis.kind,
      atMs: b.doze.basis.at,
      conditionId: c.clock.conditionId,
    },
    hazard: {
      ...cloneData(old),
      clock: clock(ctx.at, c.clock.conditionId, ctx.effectiveParametersHash),
      anchorIntegral: integral,
      acceptedIntegral: integral,
      acceptedThroughMs: ctx.at,
      materializedAtMs: ctx.at,
      activeIntegralCell: null,
    },
  };
  return { ...output(b, ctx.at), events, continuation: c, dozeContinuation: d };
};
const commitHazard: T.BodyOwner['commitHazard'] = (state, boundary, ctx) => {
  let b: T.BodyState = cloneData(state) as T.BodyState;
  let d: T.DozeContinuation = copy<T.DozeContinuation>(ctx.dozeContinuation),
    rng: T.ActorRandomCursor = cloneData(ctx.rng);
  const c = ctx.continuation;
  const intensity = dozeIntensity(
    readBody(b, ctx.at, ctx.effective.builtins.BODY_DEFAULTS).sleepiness,
    b.doze.context,
    true,
    ctx.effective.builtins.DOZE_DEFAULTS,
    ctx.effective.doze.hazardScale,
  );
  const prefix = d.hazard.activeIntegralCell
    ? evaluateCell(d.hazard.activeIntegralCell, ctx.at)
    : d.hazard.acceptedIntegral;
  const eligibleInterval = d.hazard.clock.conditionAnchorMs < ctx.at && prefix > d.hazard.anchorIntegral;
  if (boundary.at !== ctx.at || !b.alive || b.asleep || b.downed || (intensity <= 0 && !eligibleInterval))
    throw new RangeError('ineligible doze boundary');
  if (boundary.operation === 'allocate') {
    if (d.hazard.threshold) throw new RangeError('duplicate doze budget');
    const a = arm(d.hazard, rng, ctx.at);
    d = { ...d, hazard: a.hazard };
    rng = a.rng;
    return { ...output(b, ctx.at), continuation: copy<T.BodyContinuation>(c), dozeContinuation: d, rng };
  }
  if (!d.hazard.threshold) throw new RangeError('missing doze budget');
  const reached = d.hazard.activeIntegralCell
    ? evaluateCell(d.hazard.activeIntegralCell, ctx.at)
    : d.hazard.acceptedIntegral;
  if (reached < d.hazard.threshold.exponentialBudget) throw new RangeError('unreached doze threshold');
  b = { ...b, asleep: true, since: ctx.at, doze: { ...b.doze, since: ctx.at } };
  d = {
    ...d,
    hazard: {
      ...newHazard(d.hazard.key, ctx.at, c.clock.conditionId, ctx.effectiveParametersHash),
      episodeOrdinal: d.hazard.episodeOrdinal + 1,
    },
  };
  return {
    ...output(b, ctx.at),
    events: [{ kind: 'body-change', change: { kind: 'dozed', since: ctx.at } }],
    continuation: continuation(b, ctx.at, `doze:${ctx.person}:${ctx.at}`, ctx.effectiveParametersHash),
    dozeContinuation: d,
    rng,
  };
};
/** Actual one-shot physical contact. Parent/C0 freezes the closed receipt route.
 * No future/contact-free roll, and no host RNG. */
export const receiveContact: T.BodyOwner['receiveContact'] = (
  state: T.DeepReadonly<T.BodyState>,
  input: T.DeepReadonly<T.PhysicalContactReceipt>,
  ctx: T.DeepReadonly<
    T.FrameContext & {
      continuation: T.BodyContinuation;
      dozeContinuation: T.DozeContinuation;
      rng: T.ActorRandomCursor;
    }
  >,
) => {
  const rng = copy<T.ActorRandomCursor>(ctx.rng);
  if (!Number.isSafeInteger(input.durationMs) || input.durationMs < 0)
    throw new RangeError('invalid physical contact duration');
  if (
    !state.alive ||
    state.illnesses.some((i) => i.kind === input.carrier.kind) ||
    !input.carrier.contagious ||
    input.carrier.severity <= 0 ||
    input.durationMs <= 0
  )
    return {
      ...output(copy<T.BodyState>(state), ctx.at),
      continuation: copy<T.BodyContinuation>(ctx.continuation),
      dozeContinuation: copy<T.DozeContinuation>(ctx.dozeContinuation),
      rng,
    };
  const p = ctx.effective.builtins.BODY_DEFAULTS;
  const probability =
    1 - dexp((-p.transmissionPerMinute * clip(input.carrier.severity) * input.durationMs) / 60000);
  if (probability <= 0)
    return {
      ...output(copy<T.BodyState>(state), ctx.at),
      continuation: copy<T.BodyContinuation>(ctx.continuation),
      dozeContinuation: copy<T.DozeContinuation>(ctx.dozeContinuation),
      rng,
    };
  const d = draw(rng);
  if (d.value >= probability)
    return {
      ...output(copy<T.BodyState>(state), ctx.at),
      continuation: copy<T.BodyContinuation>(ctx.continuation),
      dozeContinuation: copy<T.DozeContinuation>(ctx.dozeContinuation),
      rng: d.rng,
    };
  return {
    ...receive(
      state,
      {
        kind: 'receipt',
        id: input.contactId,
        receipt: {
          type: 'illness',
          illness: {
            kind: input.carrier.kind,
            severity: p.contractedSeverity,
            trendPerDay: p.contractedTrendPerDay,
            contagious: true,
          },
        },
      },
      ctx,
    ),
    rng: d.rng,
  };
};

export const bodyOwner: T.BodyOwner = {
  initialize: init,
  capacities: (state) => readCapacities(state),
  downedAllows,
  bladderMotivation: (state, offer, success, ctx) =>
    bladderMotivation(state.bladder, offer, success, ctx.effective.builtins.BLADDER_DEFAULTS),
  receiveContact,
  read: (state, ctx) => readBody(state, ctx.at, ctx.effective.builtins.BODY_DEFAULTS, ctx.perception),
  forecast,
  advance,
  receive,
  commitHazard,
  validate(state, c, d) {
    const issues = validateNumbers({ state, c, d });
    for (const key of [
      'satiety',
      'hydration',
      'sleepPressure',
      'exertion',
      'fitness',
      'health',
      'pain',
      'depletion',
    ] as const)
      if (state[key] < 0 || state[key] > 1)
        issues.push({ path: `body.${key}`, code: 'invalid-schema', message: 'Unit required' });
    issues.push(
      ...numericalIssues(c.clock, c.materializedAtMs, c.acceptedThroughMs),
      ...hazardIssues(d.hazard),
    );
    if (
      state.sleepDebtHours < 0 ||
      state.bladder.fill < 0 ||
      state.bladder.fill > 1 ||
      state.bladder.pending < 0 ||
      state.bladder.pending > 4
    )
      issues.push(issue('body.storage', 'invalid physical storage bounds'));
    const ids = [...state.injuries.map((i) => i.id), ...state.illnesses.map((i) => i.id)];
    if (new Set(ids).size !== ids.length) issues.push(issue('body.records', 'duplicate record id'));
    for (const i of [...state.injuries, ...state.illnesses])
      if (i.severity < 0 || i.severity > 1 || !Number.isSafeInteger(i.since))
        issues.push(issue('body.records', 'invalid severity/time'));
    for (const i of state.illnesses)
      if (
        (i.chronic && i.baseline === undefined) ||
        (!i.chronic && i.trendPerDay < BODY_DEFAULTS.minIllnessTrend)
      )
        issues.push(issue('body.illnesses', 'missing chronic baseline or invalid acute trend'));
    for (const e of Object.values(state.exposures))
      if (e.recent < 0 || e.recent > 1 || e.cumulative < 0)
        issues.push(issue('body.exposures', 'invalid exposure'));
    for (const x of c.cells)
      if (x.cell.coefficients.length !== 5 || x.cell.rightOffsetMinutes <= x.cell.leftOffsetMinutes)
        issues.push(issue('body.cells', 'invalid dense cell'));
    if (new Set(c.cells.map((x) => JSON.stringify(x.field))).size !== c.cells.length)
      issues.push(issue('body.cells', 'duplicate continuous component'));
    if (!Number.isSafeInteger(state.nextId) || state.nextId < 0)
      issues.push(issue('body.nextId', 'invalid allocation counter'));
    return issues;
  },
};
/** Conditional physical forecast: declared loads and held evidence, without a
 * prediction of future autonomous onset, illness or successful host actions.
 * Same exactState/rhs/DP cells as advance; this detached read commits no RNG/events.
 */
function forecast(
  state: T.DeepReadonly<T.BodyState>,
  spans: T.DeepReadonly<readonly { label: string; durationMs: number; load: T.BodyLoad }[]>,
  ctx: T.DeepReadonly<T.FrameContext & T.BodyProjectionContext>,
): ReturnType<T.BodyOwner['forecast']> {
  const failure = (message: string): ReturnType<T.BodyOwner['forecast']> => ({
    ok: false,
    error: { code: 'limit-exceeded', path: 'body.forecast', message },
  });
  const p = ctx.effective.builtins.FORECAST_DEFAULTS;
  if (
    spans.length > p.maxSpans ||
    spans.reduce((s, x) => s + x.durationMs, 0) > Math.min(7 * DAY, p.maxMinutes * 60000)
  )
    return failure('unsupported forecast span; maximum is the bounded source horizon');
  if (spans.some((s) => !Number.isSafeInteger(s.durationMs) || s.durationMs < 0))
    return {
      ok: false,
      error: { code: 'invalid-schema', path: 'body.forecast', message: 'safe nonnegative duration required' },
    };
  let b = copy<T.BodyState>(state),
    at = ctx.at,
    calls = 0;
  const out: T.BodyForecastSpan[] = [];
  try {
    for (const span of spans) {
      const end = at + span.durationMs;
      if (!Number.isSafeInteger(end)) return failure('forecast time overflow');
      b.asleep = span.load.mode === 'sleep';
      const result: T.BodyForecastSpan = {
        label: span.label,
        endsAt: end,
        worst: 0,
        worstOf: 'fatigue',
        basis: 'conditional-load-projection',
      };
      let width = initialWidth(20);
      while (at < end && b.alive) {
        const base = copy<T.BodyState>(b),
          anchor = bodyVector(base),
          flat = flatten(anchor);
        const context: T.BodySpan = {
          ...ctx,
          from: at,
          to: end,
          phase: 1,
          priorWorldRevision: ctx.worldRevision,
          load: copy<T.BodyLoad>(span.load),
          life: copy<{ birthAt: number }>(ctx.life),
          environment: copy<T.AmbientPercept>(ctx.environment),
          continuation: copy<T.BodyContinuation>(ctx.continuation),
          dozeContinuation: copy<T.DozeContinuation>(ctx.dozeContinuation),
          perception: copy<T.BodyPerceptionContext>(ctx.perception),
          ...(ctx.pregnancy ? { pregnancy: copy<T.Pregnancy>(ctx.pregnancy) } : {}),
        };
        const r = integrateCell(
          at,
          [...flat.values, 0],
          width,
          rhs(base, flat.keys, context, at),
          1e-12,
          undefined,
          [],
          branchGate(flat.keys, base),
        );
        calls += r.calls;
        if (calls > 8192) return failure('forecast numerical work exhausted; shorten the declared spans');
        const start = at;
        let stop = Math.min(end, r.to);
        const bodyAt = (t: number) =>
          exactState(
            materialize(
              base,
              flat.keys,
              r.cells.slice(0, -1).map((c) => evaluateCell(c, t)),
            ),
            anchor,
            start,
            t,
            context,
          );
        const physicalAt = firstPhysicalBoundary(
          start,
          stop,
          r.cells.slice(0, -1),
          flat.keys,
          bodyAt,
          context,
        );
        const physical = physicalAt !== null;
        if (physicalAt !== null) stop = physicalAt;
        for (const key of ['fatigue', 'sleepiness', 'hunger', 'thirst'] as const) {
          const segments = sampledPath(
            start,
            stop,
            (t) =>
              readBody(bodyAt(t), t, ctx.effective.builtins.BODY_DEFAULTS, ctx.perception).perceived[key],
          );
          const worst = Math.max(
            ...segments.map((s) =>
              s.kind === 'quartic'
                ? maximumCell(s.cell, s.from, s.to)
                : s.kind === 'constant'
                  ? s.value
                  : Math.max(
                      scalarAt({ from: s.from, to: s.to, segments: [s] }, s.from),
                      scalarAt({ from: s.from, to: s.to, segments: [s] }, s.to),
                    ),
            ),
          );
          if (worst > result.worst) {
            result.worst = clip(worst);
            result.worstOf = key;
          }
        }
        b = bodyAt(stop);
        at = stop;
        width = physical ? initialWidth(20) : r.nextWidth;
        if (b.health <= 0) {
          b.alive = false;
          result.worst = 1;
        }
        snapFloors(b, at, context);
        applyPhysical(b, at, context);
      }
      at = end;
      out.push(result);
    }
    return { ok: true, value: out };
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'unsupported numerical forecast');
  }
}
