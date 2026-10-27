/** SCOPE: HF4 always-present owner. Source equations use immutable run parameters; no legacy continuation. */
import { clamp01, decay, dexp } from '../core/index.ts';

const MINUTES_PER_DAY = 1440;
export const HABIT_DEFAULTS = {
  /** Maximum habits held; the weakest is evicted. */
  maxHabits: 40,
  /** Fraction of the remaining gap to 1 gained per full-weight repetition (calibrated with decay below
   * so daily repetition reaches ~95% of its plateau near day 66, the Lally et al. 2010 median). */
  gain: 0.0386,
  /** Half-life (minutes) of habit strength without repetition. */
  decayHalfLife: 120 * MINUTES_PER_DAY,
  /** Minutes since the last repetition at which a repetition counts fully (spacing). */
  fullSpacing: 20 * 60,
  /** Minutes around the hour bucket's centre with full time match. */
  hourCore: 30,
  /** Further minutes over which the time match falls to 0 (±1 h tolerance). */
  hourFalloff: 60,
  /** Minimum cue match for a repetition to count toward an existing habit instead of starting a new one. */
  sameContext: 0.5,
  /** Fraction of strength lost per fully spaced withheld cue occasion (0.9 -> below 0.5 in ~26 daily withholds). */
  extinction: 0.023,
  /** Usual interval (min) between performances before abstinence counts. */
  urgeInterval: MINUTES_PER_DAY,
  /** Days into abstinence at which the urge bump peaks. */
  urgePeakDays: 2.5,
  /** Urge multiplier at the peak for craving 1. */
  urgeGain: 0.6,
  /** Cap on the pull added by urges (pull may reach 1 + urgeMax). */
  urgeMax: 0.5,
  /** Fraction of initiation/attentional effort removed by a fully cued plateau habit. */
  easeMax: 0.5,
  /**
   * Minutes after a performance over which the habit's pull ramps back from 0 to full (post-completion
   * refractory: a cue occasion already answered does not pull again at once; review 2026-10-03 saw ten
   * performances in a row). Engineering default.
   */
  refractory: 4 * 60,
} as const;

/** HF4 owned habit state. Elapsed decay always uses the retained condition anchor. */
export const habitsOwner: import('../run-schema.ts').HabitsOwner = {
  initialize(input) {
    return input.map((h) => structuredClone(h)) as import('../run-schema.ts').Habit[];
  },
  advance(_state, context) {
    const state = materializeHabits(
      context.continuation,
      context.to,
      context.effective.builtins.HABIT_DEFAULTS.decayHalfLife,
    );
    return {
      state,
      continuation: structuredClone(
        context.continuation,
      ) as import('../run-schema.ts').DeliberationContinuation['habits'],
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: context.to,
    };
  },
  learn(previous, input, context) {
    const state = previous.map((h) => structuredClone(h)) as import('../run-schema.ts').Habit[];
    const d = context.effective.builtins.HABIT_DEFAULTS;
    const now = context.at;
    if (input.outcome.status === 'completed') {
      const offer = input.activity.offer;
      const minuteOfDay = (((now / 60000) % 1440) + 1440) % 1440;
      const match = (h: import('../run-schema.ts').Habit) =>
        cueMatches(
          h,
          {
            now,
            ...(context.lastAction !== undefined ? { lastAction: context.lastAction } : {}),
            ...(offer.place !== undefined ? { placeId: offer.place } : {}),
          },
          d,
        );
      for (const h of state)
        if (h.action !== offer.actionId && h.strength > 0) {
          const m = match(h);
          const spacing = clamp01(
            (now - Math.max(h.lastAt, h.lastWithheldAt ?? h.lastAt)) / (d.fullSpacing * 60000),
          );
          if (m >= d.sameContext && spacing > 0) {
            h.strength = clamp01(h.strength * (1 - d.extinction * m * spacing));
            h.withheld = (h.withheld ?? 0) + 1;
            h.lastWithheldAt = now;
          }
        }
      let best: import('../run-schema.ts').Habit | undefined;
      let bestMatch = 0;
      for (const h of state)
        if (
          h.action === offer.actionId &&
          h.cue.placeId === offer.place &&
          h.cue.after === context.lastAction
        ) {
          const m = match(h);
          if (m > bestMatch) {
            best = h;
            bestMatch = m;
          }
        }
      if (!best || bestMatch < d.sameContext) {
        best = {
          action: offer.actionId,
          cue: { hour: Math.floor(minuteOfDay / 60) },
          strength: 0,
          repetitions: 0,
          lastAt: now,
        };
        if (offer.place !== undefined) best.cue.placeId = offer.place;
        if (context.lastAction !== undefined) best.cue.after = context.lastAction;
        state.push(best);
        bestMatch = 1;
        if (state.length > d.maxHabits) {
          const weakest = state
            .filter((h) => h !== best)
            .sort((a, b) => a.strength - b.strength || a.lastAt - b.lastAt)[0];
          if (weakest) state.splice(state.indexOf(weakest), 1);
        }
      }
      const spacing = best.repetitions === 0 ? 1 : clamp01((now - best.lastAt) / (d.fullSpacing * 60000));
      best.strength = clamp01(best.strength + d.gain * bestMatch * spacing * (1 - best.strength));
      best.repetitions++;
      best.lastAt = Math.max(now, best.lastAt);
    }
    return {
      state,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: now,
    };
  },
  validate(state) {
    const issues: import('../run-schema.ts').ValidationIssue[] = [];
    const fail = (path: string) =>
      issues.push({ path, code: 'invalid-schema', message: 'Invalid habit state' });
    if (state.length > HABIT_DEFAULTS.maxHabits) fail('habits');
    for (const [i, h] of state.entries()) {
      if (
        !h.action ||
        !Number.isFinite(h.strength) ||
        h.strength < 0 ||
        h.strength > 1 ||
        !Number.isSafeInteger(h.repetitions) ||
        h.repetitions < 0 ||
        !Number.isSafeInteger(h.lastAt) ||
        (h.lastWithheldAt !== undefined && !Number.isSafeInteger(h.lastWithheldAt)) ||
        (h.cue.hour !== undefined && (!Number.isInteger(h.cue.hour) || h.cue.hour < 0 || h.cue.hour > 23)) ||
        (h.craving !== undefined && (!Number.isFinite(h.craving) || h.craving < 0 || h.craving > 1))
      )
        fail(`habits.${i}`);
    }
    return issues;
  },
};

/** Internal anchored projection. Caller materializations never replace the anchor. */
export function materializeHabits(
  continuation: import('../run-schema.ts').DeepReadonly<
    import('../run-schema.ts').DeliberationContinuation['habits']
  >,
  to: number,
  halfLifeMinutes: number,
): import('../run-schema.ts').Habit[] {
  if (!Number.isSafeInteger(to) || !Number.isSafeInteger(continuation.anchor.at))
    throw new RangeError('Invalid habit clock');
  const elapsed = BigInt(to) - BigInt(continuation.anchor.at);
  if (elapsed < 0n || elapsed > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Invalid habit span');
  return continuation.state.map((h) => ({
    ...structuredClone(h),
    strength: decay(h.strength, Number(elapsed) / 60000, halfLifeMinutes),
  }));
}

export type HabitContext = { now: number; placeId?: string; lastAction?: string };
export function cueMatches(
  h: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').Habit>,
  ctx: HabitContext,
  d: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').Effective_HABIT_DEFAULTS>,
): number {
  const { hour, placeId, after } = h.cue;
  if (hour === undefined && placeId === undefined && after === undefined) return 0;
  if ((placeId !== undefined && placeId !== ctx.placeId) || (after !== undefined && after !== ctx.lastAction))
    return 0;
  if (hour === undefined) return 1;
  const minute = (((ctx.now / 60000) % 1440) + 1440) % 1440,
    dist = Math.abs(minute - (hour * 60 + 30)) % 1440;
  return clamp01(1 - (Math.min(dist, 1440 - dist) - d.hourCore) / d.hourFalloff);
}
export function habitPull(
  habits: import('../run-schema.ts').DeepReadonly<readonly import('../run-schema.ts').Habit[]>,
  action: string,
  ctx: HabitContext,
  d: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').Effective_HABIT_DEFAULTS>,
): number {
  let last = -Infinity;
  for (const h of habits) if (h.action === action && h.lastAt <= ctx.now) last = Math.max(last, h.lastAt);
  let sum = 0,
    urge = 0;
  for (const h of habits)
    if (h.action === action) {
      const since = ctx.now - Math.max(h.lastAt, last),
        ready = since >= 0 ? clamp01(since / (d.refractory * 60000)) : 1;
      const value = h.strength * cueMatches(h, ctx, d) * ready;
      sum += value;
      if (value > 0 && (h.craving ?? 0) > 0 && (h.withheld ?? 0) > 0) {
        const t = Math.max(0, (ctx.now - Math.max(h.lastAt, last)) / 60000 - d.urgeInterval) / 1440;
        if (t > 0) {
          const x = t / d.urgePeakDays;
          urge += value * clamp01(h.craving ?? 0) * d.urgeGain * x * dexp(1 - x);
        }
      }
    }
  return Math.min(1, sum) + Math.min(d.urgeMax, urge);
}
export function habitEase(
  habits: import('../run-schema.ts').DeepReadonly<readonly import('../run-schema.ts').Habit[]>,
  action: string,
  ctx: HabitContext,
  d: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').Effective_HABIT_DEFAULTS>,
): number {
  const sum = habits
    .filter((h) => h.action === action)
    .reduce((sum, h) => sum + h.strength * cueMatches(h, ctx, d), 0);
  return 1 - d.easeMax * Math.min(1, sum);
}
