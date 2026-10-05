/**
 * SCOPE: Needs as concurrent pulls. Physiological needs (food, water, sleep, rest, relief) are read each
 * time from the body's *perceived* readout; psychological needs (safety, belonging, esteem, autonomy,
 * competence, leisure, meaning) are stored reservoirs that drift toward context-dependent targets by
 * exponential relaxation, which is closed form, so one 600-minute step equals 600 one-minute steps.
 * Urgency is a convex (super-linear) function of the deficit below a per-person comfort threshold, with a
 * small residual tail above it. Borrowed shapes: concurrent need satisfaction without a sequential lock
 * (Tay & Diener 2011, rejecting obligatory Maslow stages), the SDT trio autonomy/competence/relatedness
 * (belonging here), and HEXACO/Schwartz scores used only as threshold and rate coefficients. The 'rest'
 * need reads perceived fatigue minus a share of sleepiness so that sleepiness is not counted twice (the
 * body's fatigue already folds it in). Parameters are engineering defaults for game time scales; this does
 * not claim an exhaustive need list, calibrated rates, or a universal weighting between needs.
 */
import { clamp, clamp01, decay, dpow } from '../core/index.ts';
import type {
  BodyReadout,
  NeedId,
  NeedReading,
  NeedReservoirs,
  Person,
  PhysiologicalNeed,
  PsychologicalNeed,
  Unit,
} from '../types.ts';
import { PHYSIOLOGICAL_NEEDS, PSYCHOLOGICAL_NEEDS } from '../types.ts';

export interface NeedsContext {
  withOthers: boolean;
  activityTags: string[];
  asleep: boolean;
}

export const NEEDS_DEFAULTS = {
  /** Exponent on the relative deficit below threshold (2 = quadratic). */
  urgencySteepness: 2,
  /** Share of urgency from a gentle (1 - level)^2 tail that keeps a weak pull above threshold. */
  urgencyTail: 0.08,
  /** Base comfort thresholds before trait modulation. */
  thresholds: {
    food: 0.5,
    water: 0.55,
    sleep: 0.45,
    rest: 0.5,
    relief: 0.6,
    safety: 0.5,
    belonging: 0.45,
    esteem: 0.4,
    autonomy: 0.4,
    competence: 0.4,
    leisure: 0.4,
    meaning: 0.35,
  } satisfies Record<NeedId, Unit>,
  /** Threshold shift per unit of (trait - 0.5); 0.2 gives ±0.1 at the trait extremes. */
  traitCoefficient: 0.2,
  thresholdRange: [0.15, 0.85] as const,
  /** How much perceived sleepiness is subtracted from perceived fatigue to get the exertion part. */
  restSleepinessOverlap: 0.5,
  /** Rate multiplier on all reservoir drift while asleep. */
  asleepRate: 0.1,
  /** Half-lives in minutes and targets for reservoir drift. */
  belongingAloneHalfLife: 2160, // at extraversion 0.5; scaled by 1 / (0.5 + extraversion)
  belongingAloneTarget: 0,
  belongingTogetherHalfLife: 180,
  belongingSocialHalfLife: 90,
  belongingTogetherTarget: 1,
  leisureWorkHalfLife: 600,
  leisureWorkTarget: 0,
  leisureRecoverHalfLife: 90,
  leisureRecoverTarget: 1,
  leisureIdleHalfLife: 720,
  leisureIdleTarget: 0.6,
  autonomyHalfLife: 720,
  autonomyTarget: 0.7,
  competenceHalfLife: 2880,
  competenceTarget: 0.5,
  esteemHalfLife: 2880,
  esteemTarget: 0.5,
  meaningDecayHalfLife: 7200,
  meaningDecayTarget: 0,
  meaningRecoverHalfLife: 120,
  meaningRecoverTarget: 1,
  safetyHalfLife: 720,
  safetyTarget: 0.8,
  socialTags: ['social', 'chat', 'talk', 'family', 'visit', 'shared-work'],
  workTags: ['work'],
  leisureTags: ['leisure', 'play'],
  meaningTags: ['worship', 'service', 'charity', 'meaningful'],
  /** Minimum half-life so trait-scaled half-lives never hit decay()'s instant path. */
  minHalfLife: 1,
  /** Floor weight in meanSatisfaction so a well-satisfied person degrades to a plain mean. */
  meanFloorWeight: 0.1,
};

export const DEFAULT_NEEDS: NeedReservoirs = {
  safety: 0.8,
  belonging: 0.7,
  esteem: 0.6,
  autonomy: 0.7,
  competence: 0.6,
  leisure: 0.6,
  meaning: 0.6,
};

/** Fresh reservoirs, optionally overridden and clamped. */
export function createNeeds(overrides: Partial<NeedReservoirs> = {}): NeedReservoirs {
  const out = { ...DEFAULT_NEEDS };
  for (const id of PSYCHOLOGICAL_NEEDS) {
    const v = overrides[id];
    if (v !== undefined) out[id] = clamp01(v);
  }
  return out;
}

/**
 * Super-linear urgency: exactly 1 at level 0, rising convexly as level falls below `threshold`, and only a
 * small residual tail above it (≈0.003 at level 0.8 with defaults).
 */
export function urgency(level: Unit, threshold = 0.5, steepness = NEEDS_DEFAULTS.urgencySteepness): Unit {
  const l = clamp01(level);
  const t = clamp(threshold, 0.05, 0.95);
  const deficit = clamp01((t - l) / t);
  const tail = NEEDS_DEFAULTS.urgencyTail;
  return clamp01((1 - tail) * dpow(deficit, steepness) + tail * dpow(1 - l, 2));
}

/** Per-person comfort threshold for a need: base plus trait/value coefficients. */
export function needThreshold(p: Person, id: NeedId): Unit {
  const base = NEEDS_DEFAULTS.thresholds[id];
  const k = NEEDS_DEFAULTS.traitCoefficient;
  const t = p.traits;
  let shift = 0;
  switch (id) {
    case 'belonging':
      shift = k * (t.extraversion - 0.5);
      break;
    case 'safety':
      shift = k * (t.emotionality - 0.5);
      break;
    case 'leisure':
      shift = k * (0.5 * (t.openness - 0.5) + 0.5 * (p.values.stimulation - 0.5));
      break;
    case 'competence':
      shift = k * (t.conscientiousness - 0.5);
      break;
    case 'meaning':
      shift = k * (p.values.tradition - 0.5);
      break;
    case 'autonomy':
      shift = k * (p.values.selfDirection - 0.5);
      break;
    case 'esteem':
      shift = k * (p.values.achievement - 0.5);
      break;
    case 'relief':
      shift = k * 0.5 * (t.emotionality - 0.5);
      break;
    default:
      shift = 0;
  }
  const [lo, hi] = NEEDS_DEFAULTS.thresholdRange;
  return clamp(base + shift, lo, hi);
}

function physiologicalLevel(id: PhysiologicalNeed, body: BodyReadout): Unit {
  const s = body.perceived;
  switch (id) {
    case 'food':
      return 1 - clamp01(s.hunger);
    case 'water':
      return 1 - clamp01(s.thirst);
    case 'sleep':
      return 1 - clamp01(s.sleepiness);
    case 'rest':
      return 1 - clamp01(s.fatigue - NEEDS_DEFAULTS.restSleepinessOverlap * s.sleepiness);
    case 'relief':
      return 1 - clamp01(s.pain);
  }
}

/** A need's level in a reading (1 when absent). @internal */
export const levelOf = (needs: readonly NeedReading[], id: NeedId): number =>
  needs.find((n) => n.id === id)?.level ?? 1;
/** A need's urgency in a reading (0 when absent). @internal */
export const urgencyOf = (needs: readonly NeedReading[], id: NeedId): number =>
  needs.find((n) => n.id === id)?.urgency ?? 0;

/** All needs in stable order: physiological (types.ts order) then psychological. */
export function readNeeds(p: Person, body: BodyReadout): NeedReading[] {
  const out: NeedReading[] = [];
  for (const id of PHYSIOLOGICAL_NEEDS) {
    const level = physiologicalLevel(id, body);
    out.push({ id, level, urgency: urgency(level, needThreshold(p, id)) });
  }
  for (const id of PSYCHOLOGICAL_NEEDS) {
    const level = clamp01(p.needs[id]);
    out.push({ id, level, urgency: urgency(level, needThreshold(p, id)) });
  }
  return out;
}

const hasAny = (tags: readonly string[], set: readonly string[]): boolean =>
  tags.some((t) => set.includes(t));

/**
 * Reservoir drift over `dt` minutes. Every need relaxes exponentially toward a target chosen by the
 * context, so the result is exact for any step size while the context is constant.
 */
export function advanceNeeds(p: Person, dt: number, ctx: NeedsContext): void {
  if (dt <= 0) return;
  const D = NEEDS_DEFAULTS;
  const m = ctx.asleep ? dt * D.asleepRate : dt;
  const hl = (h: number) => Math.max(D.minHalfLife, h);
  const n = p.needs;
  const tags = ctx.activityTags;

  // Belonging
  const social = hasAny(tags, D.socialTags);
  if (ctx.withOthers || social) {
    const h = social ? D.belongingSocialHalfLife : D.belongingTogetherHalfLife;
    n.belonging = decay(n.belonging, m, hl(h), D.belongingTogetherTarget);
  } else {
    const h = D.belongingAloneHalfLife / (0.5 + clamp01(p.traits.extraversion));
    n.belonging = decay(n.belonging, m, hl(h), D.belongingAloneTarget);
  }

  // Leisure
  const working = hasAny(tags, D.workTags);
  const relaxing = hasAny(tags, D.leisureTags);
  if (relaxing && !working) {
    n.leisure = decay(n.leisure, m, hl(D.leisureRecoverHalfLife), D.leisureRecoverTarget);
  } else if (working && !relaxing) {
    n.leisure = decay(n.leisure, m, hl(D.leisureWorkHalfLife), D.leisureWorkTarget);
  } else {
    n.leisure = decay(n.leisure, m, hl(D.leisureIdleHalfLife), D.leisureIdleTarget);
  }

  // Meaning
  if (hasAny(tags, D.meaningTags)) {
    n.meaning = decay(n.meaning, m, hl(D.meaningRecoverHalfLife), D.meaningRecoverTarget);
  } else {
    n.meaning = decay(n.meaning, m, hl(D.meaningDecayHalfLife), D.meaningDecayTarget);
  }

  n.autonomy = decay(n.autonomy, m, hl(D.autonomyHalfLife), D.autonomyTarget);
  n.competence = decay(n.competence, m, hl(D.competenceHalfLife), D.competenceTarget);
  n.esteem = decay(n.esteem, m, hl(D.esteemHalfLife), D.esteemTarget);
  n.safety = decay(n.safety, m, hl(D.safetyHalfLife), D.safetyTarget);

  for (const id of PSYCHOLOGICAL_NEEDS) n[id] = clamp01(n[id]);
}

/** Add deltas to psychological reservoirs (positive satisfies), clamped to 0..1. */
export function satisfy(p: Person, deltas: Partial<Record<PsychologicalNeed, number>>): void {
  for (const id of PSYCHOLOGICAL_NEEDS) {
    const d = deltas[id];
    if (d !== undefined && Number.isFinite(d)) p.needs[id] = clamp01(p.needs[id] + d);
  }
}

/**
 * Urgency-weighted mean satisfaction: urgent needs dominate, and a floor weight makes a well-satisfied
 * person degrade to a plain mean. Empty input reads as fully satisfied.
 */
export function meanSatisfaction(readings: NeedReading[]): Unit {
  let num = 0;
  let den = 0;
  for (const r of readings) {
    const w = NEEDS_DEFAULTS.meanFloorWeight + r.urgency;
    num += w * clamp01(r.level);
    den += w;
  }
  return den > 0 ? clamp01(num / den) : 1;
}
