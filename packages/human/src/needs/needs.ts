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

import {
  DAILY_NUMERICAL_POLICY,
  dailyPolicy,
  numericalTolerance,
  numericalWidth,
} from '../body/daily-policy.ts';

import { evaluateCell, initialWidth, integrateCell, quarticCoefficients, required } from '../body/span.ts';
import { characterTraitSegments, readCharacterTrajectory } from '../character/character.ts';
import { cloneData } from '../core/clone.ts';
import { clamp, clamp01, dexp, dlog, dpow } from '../core/index.ts';
import { EngineLimitError } from '../core/limit.ts';
import { keyOf, Memo } from '../core/memo.ts';
import { readEnvironmentTrajectory } from '../environment/environment.ts';
import { hashCanonical } from '../run-canonical.ts';
import type {
  ActorState,
  NeedId,
  NeedReading,
  NeedReservoirs,
  PsychologicalNeed,
  Unit,
} from '../run-schema.ts';

const PHYSIOLOGICAL_NEEDS = ['food', 'water', 'sleep', 'rest', 'relief'] as const;
const PSYCHOLOGICAL_NEEDS = [
  'safety',
  'belonging',
  'esteem',
  'autonomy',
  'competence',
  'leisure',
  'meaning',
] as const;

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
export function needThreshold(
  p: Pick<ActorState, 'traits' | 'values'>,
  id: NeedId,
  defaults: import('../run-schema.ts').DeepReadonly<
    import('../run-schema.ts').Effective_NEEDS_DEFAULTS
  > = NEEDS_DEFAULTS,
): Unit {
  const base = defaults.thresholds[id];
  const k = defaults.traitCoefficient;
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
  const [lo, hi] = defaults.thresholdRange;
  if (lo === undefined || hi === undefined) throw new RangeError('Invalid need threshold range');
  return clamp(base + shift, lo, hi);
}

/** A need's level in a reading (1 when absent). @internal */
export const levelOf = (needs: readonly NeedReading[], id: NeedId): number =>
  needs.find((n) => n.id === id)?.level ?? 1;
/** A need's urgency in a reading (0 when absent). @internal */
export const urgencyOf = (needs: readonly NeedReading[], id: NeedId): number =>
  needs.find((n) => n.id === id)?.urgency ?? 0;

const hasAny = (tags: readonly string[], set: readonly string[]): boolean =>
  tags.some((t) => set.includes(t));

/** Internal ms trajectory projection. Missing body evidence is a contract error. */
export function readNeedScalar(
  path: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').ScalarTrajectory>,
  at: number,
): number {
  const segment = path.segments.find((s) => s.from <= at && at <= s.to);
  if (!segment) throw new RangeError('Need trajectory lacks body coverage');
  const minutes = (at - segment.from) / 60000;
  switch (segment.kind) {
    case 'constant':
      return segment.value;
    case 'linear':
      return segment.initial + segment.ratePerMinute * minutes;
    case 'exponential':
      return segment.target + (segment.initial - segment.target) * dexp(-segment.ratePerMinute * minutes);
    case 'quartic': {
      const c = segment.cell;
      const theta =
        ((at - c.originMs) / 60000 - c.leftOffsetMinutes) / (c.rightOffsetMinutes - c.leftOffsetMinutes);
      const [a0, a1, a2, a3, a4] = c.coefficients;
      if (a0 === undefined || a1 === undefined || a2 === undefined || a3 === undefined || a4 === undefined)
        throw new RangeError('Invalid scalar coefficients');
      return (((a4 * theta + a3) * theta + a2) * theta + a1) * theta + a0;
    }
  }
}

type NeedSpan = Parameters<import('../run-schema.ts').NeedsOwner['advance']>[1];
type NeedKernelContext = Pick<
  NeedSpan,
  | 'person'
  | 'traits'
  | 'values'
  | 'character'
  | 'environment'
  | 'activity'
  | 'continuation'
  | 'body'
  | 'forcingPerMinute'
  | 'asleep'
> & {
  fidelity?: NeedSpan['fidelity'];
  effective: {
    builtins: Pick<
      import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').EffectiveBuiltins>,
      'NEEDS_DEFAULTS' | 'ENVIRONMENT_DEFAULTS'
    >;
  };
};
/** Integrated trait-dependent coefficient. Each piece is affine, possibly capped by minHalfLife. */
function belongingExposure(context: NeedKernelContext, at: number): number {
  const d = context.effective.builtins.NEEDS_DEFAULTS;
  const path = characterTraitSegments(context.character, 'extraversion', context.continuation.anchor.at, at);
  const scale = dlog(2) * (context.asleep ? d.asleepRate : 1);
  let integral = 0;
  for (const segment of path.segments) {
    if (segment.kind !== 'linear' && segment.kind !== 'constant')
      throw new RangeError('Expected affine Character law');
    const duration = (segment.to - segment.from) / 60000;
    const initial = segment.kind === 'constant' ? segment.value : segment.initial;
    const slope = segment.kind === 'constant' ? 0 : segment.ratePerMinute;
    const a = (0.5 + initial) / d.belongingAloneHalfLife;
    const b = slope / d.belongingAloneHalfLife;
    const cap = 1 / d.minHalfLife;
    const split = b === 0 ? duration : Math.max(0, Math.min(duration, (cap - a) / b));
    const points = [0, split, duration];
    for (let i = 1; i < points.length; i++) {
      const left = required(points[i - 1]),
        right = required(points[i]);
      const middle = a + b * (left + (right - left) / 2);
      integral +=
        middle >= cap ? cap * (right - left) : (right - left) * (a + b * (left + (right - left) / 2));
    }
  }
  return scale * integral;
}
/** Retained-anchor source relaxation with live trait rates and ambient forcing. */
export function materializeNeeds(context: NeedKernelContext, at: number): NeedReservoirs {
  const d = context.effective.builtins.NEEDS_DEFAULTS;
  if (
    !Number.isFinite(at) ||
    !Number.isSafeInteger(Math.floor(at)) ||
    !Number.isSafeInteger(context.continuation.anchor.at)
  )
    throw new RangeError('Invalid need clock');
  const elapsed = BigInt(Math.floor(at)) - BigInt(context.continuation.anchor.at);
  const elapsedMinutes = (Number(elapsed) + (at - Math.floor(at))) / 60000;
  if (elapsed < 0n || elapsed > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError('Invalid need duration');
  const tags = context.activity?.offer.tags ?? [];
  const social = hasAny(tags, d.socialTags);
  const together = context.activity?.offer.participants.some((id) => id !== context.person) ?? false;
  const work = hasAny(tags, d.workTags),
    leisure = hasAny(tags, d.leisureTags),
    meaning = hasAny(tags, d.meaningTags);
  const live = readCharacterTrajectory(context.character, context.continuation.anchor.at);
  const settings: Record<PsychologicalNeed, [number, number]> = {
    belonging:
      together || social
        ? [social ? d.belongingSocialHalfLife : d.belongingTogetherHalfLife, d.belongingTogetherTarget]
        : [d.belongingAloneHalfLife / (0.5 + clamp01(live.traits.extraversion)), d.belongingAloneTarget],
    leisure:
      leisure && !work
        ? [d.leisureRecoverHalfLife, d.leisureRecoverTarget]
        : work && !leisure
          ? [d.leisureWorkHalfLife, d.leisureWorkTarget]
          : [d.leisureIdleHalfLife, d.leisureIdleTarget],
    meaning: meaning
      ? [d.meaningRecoverHalfLife, d.meaningRecoverTarget]
      : [d.meaningDecayHalfLife, d.meaningDecayTarget],
    safety: [d.safetyHalfLife, d.safetyTarget],
    autonomy: [d.autonomyHalfLife, d.autonomyTarget],
    competence: [d.competenceHalfLife, d.competenceTarget],
    esteem: [d.esteemHalfLife, d.esteemTarget],
  };
  const state = { ...context.continuation.state };
  const environment = readEnvironmentTrajectory(
    context.environment,
    context.continuation.anchor.at,
    context.effective,
  );
  for (const id of PSYCHOLOGICAL_NEEDS) {
    const [halfLife, target] = settings[id];
    const rate = (dlog(2) / Math.max(d.minHalfLife, halfLife)) * (context.asleep ? d.asleepRate : 1);
    const force = (environment.needsPerMinute[id] ?? 0) + (context.forcingPerMinute.command[id] ?? 0);
    const varyingRate = id === 'belonging' && !together && !social;
    const varyingForce = id === 'autonomy' && (context.environment.percept.crowding ?? 0) > 0;
    if (varyingRate && force === 0) {
      state[id] = clamp01(target + (state[id] - target) * dexp(-belongingExposure(context, at)));
    } else if (varyingRate || varyingForce) {
      // Recompute from the retained semantic anchor with target-independent canonical cells.
      // Only the reached evaluation is returned. No actor/RNG work runs at these samples.
      let left = context.continuation.anchor.at,
        y = state[id],
        width = context.fidelity
          ? numericalWidth(initialWidth(halfLife), context.fidelity, true)
          : initialWidth(halfLife),
        calls = 0;
      while (left < at) {
        const cell = integrateCell(
          left,
          [y],
          width,
          (t, values) => {
            const trait = readCharacterTrajectory(context.character, t).traits.extraversion;
            const h = varyingRate ? d.belongingAloneHalfLife / (0.5 + clamp01(trait)) : halfLife;
            const k = (dlog(2) / Math.max(d.minHalfLife, h)) * (context.asleep ? d.asleepRate : 1);
            const forcing =
              (readEnvironmentTrajectory(context.environment, t, context.effective).needsPerMinute[id] ?? 0) +
              (context.forcingPerMinute.command[id] ?? 0);
            return [k * (target - (values[0] ?? 0)) + forcing];
          },
          numericalTolerance(context.fidelity),
        );
        calls += cell.calls;
        if (calls > 8192) throw new EngineLimitError('Need forced relaxation work limit exceeded');
        y = evaluateCell(required(cell.cells[0]), Math.min(at, cell.to));
        left = cell.to;
        width = cell.nextWidth;
      }
      state[id] = clamp01(y);
    } else {
      const equilibrium = target + force / rate;
      state[id] = clamp01(equilibrium + (state[id] - equilibrium) * dexp(-rate * elapsedMinutes));
    }
  }
  return state;
}

/** Both perceived physiological paths and psychological reservoirs force affect. */
export function needSatisfactionAt(context: NeedKernelContext, at: number): number {
  const d = context.effective.builtins.NEEDS_DEFAULTS;
  const reservoirs = materializeNeeds(context, at);
  const body = (field: import('../run-schema.ts').BodyTrajectory['readout'][number]['field']) => {
    const row = context.body.readout.find((r) => r.field === field);
    if (!row) throw new RangeError(`Need trajectory lacks ${field}`);
    return readNeedScalar(row.path, at);
  };
  const sleepy = body('perceived-sleepiness');
  const levels: Record<NeedId, number> = {
    ...reservoirs,
    food: 1 - clamp01(body('perceived-hunger')),
    water: 1 - clamp01(body('perceived-thirst')),
    sleep: 1 - clamp01(sleepy),
    rest: 1 - clamp01(body('perceived-fatigue') - d.restSleepinessOverlap * sleepy),
    relief: 1 - clamp01(body('perceived-pain')),
  };
  const [lowThreshold, highThreshold] = d.thresholdRange;
  if (lowThreshold === undefined || highThreshold === undefined)
    throw new RangeError('Invalid need threshold range');
  let num = 0,
    den = 0;
  const { traits: t, values: v } = readCharacterTrajectory(context.character, at),
    k = d.traitCoefficient;
  for (const id of [...PHYSIOLOGICAL_NEEDS, ...PSYCHOLOGICAL_NEEDS]) {
    const shifts: Partial<Record<NeedId, number>> = {
      belonging: t.extraversion - 0.5,
      safety: t.emotionality - 0.5,
      leisure: 0.5 * (t.openness - 0.5) + 0.5 * (v.stimulation - 0.5),
      competence: t.conscientiousness - 0.5,
      meaning: v.tradition - 0.5,
      autonomy: v.selfDirection - 0.5,
      esteem: v.achievement - 0.5,
      relief: 0.5 * (t.emotionality - 0.5),
    };
    const threshold = clamp(d.thresholds[id] + k * (shifts[id] ?? 0), lowThreshold, highThreshold);
    const level = clamp01(levels[id]),
      deficit = clamp01((threshold - level) / threshold);
    const u = clamp01(
      (1 - d.urgencyTail) * dpow(deficit, d.urgencySteepness) + d.urgencyTail * dpow(1 - level, 2),
    );
    const weight = d.meanFloorWeight + u;
    num += weight * level;
    den += weight;
  }
  return clamp01(num / den);
}

/** Deterministic adaptive quartic projection; error values are estimates, not certificates. */
export function projectNeedTrajectory(context: NeedKernelContext): import('../run-schema.ts').NeedTrajectory {
  // Pure in the inputs below; frozen trajectory pieces (memo products) enter by identity.
  // body.id names only the condition, so the readout segments themselves are keyed.
  const d = context.effective.builtins;
  return needPaths.get(
    JSON.stringify([
      context.person,
      keyOf(context.character),
      keyOf(context.environment),
      context.body.id,
      numericalTolerance(context.fidelity),
      context.body.readout.map((r) => [r.field, r.path.segments.map((s) => keyOf(s))]),
      context.continuation,
      context.activity,
      context.forcingPerMinute.command,
      context.asleep,
      keyOf(d.NEEDS_DEFAULTS),
      keyOf(d.ENVIRONMENT_DEFAULTS),
    ]),
    () => buildNeedTrajectory(context),
  );
}
const needPaths = new Memo<import('../run-schema.ts').NeedTrajectory>(256);
function buildNeedTrajectory(context: NeedKernelContext): import('../run-schema.ts').NeedTrajectory {
  // Body descriptors retain full canonical cells even when materialized inside one.
  // Fit those cells, never a caller-clipped subinterval under the same identity.
  const from = Math.max(
      context.continuation.anchor.at,
      context.character.continuation.state.character.agedTo,
      ...context.body.readout.map((r) => Math.min(...r.path.segments.map((s) => s.from))),
    ),
    to = Math.min(...context.body.readout.map((r) => Math.max(...r.path.segments.map((s) => s.to))));
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from)
    throw new RangeError('Need trajectory lacks canonical body coverage');
  const segments: import('../run-schema.ts').ScalarTrajectory['segments'][number][] = [];
  let evaluations = 0;
  const sample = (at: number) => {
    if (++evaluations > 8192) throw new EngineLimitError('Need trajectory work limit exceeded');
    return needSatisfactionAt(context, at);
  };
  const fit = (left: number, right: number): void => {
    if (segments.length >= 1024) throw new EngineLimitError('Need trajectory segment limit exceeded');
    const values = [0, 0.25, 0.5, 0.75, 1].map((x) => sample(left + (right - left) * x));
    const c = quarticCoefficients(values);
    let error = 0;
    for (const x of [0.125, 0.375, 0.625, 0.875])
      error = Math.max(
        error,
        Math.abs(
          sample(left + (right - left) * x) - ((((c[4] * x + c[3]) * x + c[2]) * x + c[1]) * x + c[0]),
        ),
      );
    // A kink (a pain or injury threshold) is isolated by bisection to one millisecond and kept there with
    // its estimated error, as body readouts are (span.ts sampledPath); no wider residual is accepted.
    if (error > numericalTolerance(context.fidelity) && right - left > 1) {
      const mid = left + Math.floor((right - left) / 2);
      fit(left, mid);
      fit(mid, right);
      return;
    }
    segments.push({
      kind: 'quartic',
      from: left,
      to: right,
      cell: {
        originMs: left,
        leftOffsetMinutes: 0,
        rightOffsetMinutes: (right - left) / 60000,
        coefficients: c,
        estimatedError: error,
      },
    });
  };
  if (from === to) segments.push({ kind: 'constant', from, to, value: sample(from) });
  else {
    const boundaries = [
      ...new Set([
        from,
        to,
        ...context.body.readout
          .flatMap((r) => r.path.segments.flatMap((s) => [s.from, s.to]))
          .filter((t) => t > from && t < to),
      ]),
    ].sort((a, b) => a - b);
    for (let i = 1; i < boundaries.length; i++) {
      const a = boundaries[i - 1],
        b = boundaries[i];
      if (a !== undefined && b !== undefined) fit(a, b);
    }
  }
  return {
    id: hashCanonical(
      'need-path',
      context.person,
      context.continuation,
      context.character.id,
      context.environment.id,
      context.body.id,
      context.activity,
      context.forcingPerMinute.command,
      context.asleep,
      context.effective.builtins.NEEDS_DEFAULTS,
    ),
    from,
    to,
    satisfaction: { from, to, segments },
  };
}

export const needsOwner: import('../run-schema.ts').NeedsOwner = {
  read(state, context) {
    const d = context.effective.builtins.NEEDS_DEFAULTS,
      perceived = context.body.perceived;
    const levels: Record<NeedId, number> = {
      ...state,
      food: 1 - clamp01(perceived.hunger),
      water: 1 - clamp01(perceived.thirst),
      sleep: 1 - clamp01(perceived.sleepiness),
      rest: 1 - clamp01(perceived.fatigue - d.restSleepinessOverlap * perceived.sleepiness),
      relief: 1 - clamp01(perceived.pain),
    };
    return [...PHYSIOLOGICAL_NEEDS, ...PSYCHOLOGICAL_NEEDS].map((id) => {
      const level = clamp01(levels[id]),
        threshold = needThreshold(context, id, d),
        deficit = clamp01((threshold - level) / threshold);
      return {
        id,
        level,
        urgency: clamp01(
          (1 - d.urgencyTail) * dpow(deficit, d.urgencySteepness) + d.urgencyTail * dpow(1 - level, 2),
        ),
      };
    });
  },
  initialize(input) {
    return { ...input };
  },
  advance(priorState, context) {
    const wasDaily = context.continuation.numericalPolicy === DAILY_NUMERICAL_POLICY;
    const isDaily = dailyPolicy(context.fidelity);
    // Rebase only a fidelity transition from the state already reached. In
    // particular, daily accuracy must never be applied to a preceding fine span.
    const kernel: typeof context =
      wasDaily === isDaily
        ? context
        : {
            ...context,
            continuation: {
              anchor: {
                at: context.from,
                conditionId: context.continuation.anchor.conditionId,
              },
              state: cloneData(priorState),
              ...(isDaily ? { numericalPolicy: DAILY_NUMERICAL_POLICY } : {}),
            },
          };
    const state = materializeNeeds(kernel, context.to);
    // Every daily boundary is already a semantic scheduler boundary. Retaining
    // its reached reservoir values bounds varying-force integration to one day
    // instead of reintegrating the entire chapter at every trajectory sample.
    const atDailyBoundary =
      context.fidelity.mode === 'daily' &&
      (context.to - context.fidelity.anchor) % context.fidelity.dayMs === 0;
    const continuation =
      atDailyBoundary && context.to > kernel.continuation.anchor.at
        ? {
            ...kernel.continuation,
            anchor: { at: context.to, conditionId: kernel.continuation.anchor.conditionId },
            state: cloneData(state),
          }
        : cloneData(kernel.continuation);
    return {
      state,
      continuation,
      trajectory: projectNeedTrajectory(kernel),
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: context.to,
    };
  },
  receive(previous, input, context) {
    const state = { ...previous };
    if (input.kind === 'curiosity-reward') {
      state.leisure = clamp01(state.leisure + input.leisure);
      state.competence = clamp01(state.competence + input.competence);
    } else if (input.kind === 'realized-outcome') {
      for (const id of PSYCHOLOGICAL_NEEDS) {
        const delta = input.needs[id];
        if (delta !== undefined) state[id] = clamp01(state[id] + delta);
      }
    } else state.autonomy = clamp01(state.autonomy + input.autonomy);
    return {
      state,
      continuation: {
        anchor: { at: context.at, conditionId: input.evidenceId },
        state: { ...state },
        ...(dailyPolicy(context.fidelity) ? { numericalPolicy: DAILY_NUMERICAL_POLICY } : {}),
      },
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: context.at,
    };
  },
  validate(state) {
    return PSYCHOLOGICAL_NEEDS.filter(
      (id) => !Number.isFinite(state[id]) || state[id] < 0 || state[id] > 1,
    ).map((id) => ({
      path: `needs.${id}`,
      code: 'invalid-schema' as const,
      message: 'Invalid need reservoir',
    }));
  },
};
