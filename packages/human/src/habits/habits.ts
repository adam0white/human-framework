/**
 * SCOPE: Cue-linked automaticity: an action repeated in a stable context (time of day, place, preceding
 * action) gains a habit whose strength later pulls toward that action when the cues recur. Borrows the
 * asymptotic automaticity curve of Lally et al. (2010; median ~66 days to reach 95% of the plateau with
 * daily repetition, wide individual variation) and their finding that missing one occasional day barely
 * changed the curve; cue-dependence follows Wood & Neal's context-cued habit account. Spacing caps gains at
 * roughly one meaningful repetition per day, so rapid repeats do not build a habit in an afternoon.
 * Does NOT claim: a universal number of days to form a habit, that habit strength is moral approval,
 * or a model of habit change strategies beyond cue mismatch, withholding and slow decay.
 *
 * SCOPE (extinction by withholding, N8): when a habit's cue occurs (match ≥ sameContext) and the person
 * completes a different action, the habit loses a fraction of its strength (`extinction`, smaller than
 * `gain`, at most once per cue occasion), so a plateau habit withheld daily falls below half within a month
 * while one whose cue never recurs keeps its strength and fires again on return to the old context. Shape:
 * habits survive a move only where the performance context stays the same (habit discontinuity; Wood, Tam &
 * Guerrero Witt 2005, JPSP 88:918). The extinction rate is an engineering default, not fitted. Known
 * divergence: Bouton (2004, Learn Mem 11:485) shows extinction is new context-specific learning that leaves
 * the original intact (renewal, spontaneous recovery); here withholding lowers stored strength, so renewal
 * after withholding is not modelled, only the return of a habit whose cue was absent. Does not claim a
 * cessation success rate.
 *
 * SCOPE (urges after abstinence): a habit with host-set `craving` > 0 that has been withheld gains a
 * temporary multiplier on its pull once its usual daily interval has passed without performance: a bump
 * that peaks ~2.5 days into abstinence and fades over 2-4 weeks, so the pull rises briefly before falling
 * (with extinction lowering the strength underneath). The time course borrows the shape of tobacco
 * withdrawal symptoms (peak within the first week, lasting 2-4 weeks; Hughes 2007, Nicotine Tob Res
 * 9:315), which explicitly does not validate craving itself; applying it to cue-reactive urges is an
 * assumption. Does not claim: pharmacology, dependence severity or relapse probabilities.
 *
 * SCOPE (habit ease, N4): `habitEase` is a multiplier < 1 on the initiation and attentional parts of an
 * option's effort cost for a cued habitual action. Chosen by the discriminating experiment in
 * `test/habits.test.ts`: depletion increases habit performance relative to deliberate alternatives (Neal,
 * Wood & Drolet 2013, JPSP 104:959); an additive habit term cannot produce that (fatigue costs habitual and
 * deliberate options alike), an ease multiplier can. Physical exertion is not eased (habit does not make a
 * walk lighter). Does not claim: a measured size of the effect, or that automaticity removes intention.
 */
import { clamp01, decay, hourOf, minuteOfDay } from '../core/index.ts';
import {
  type Affordance,
  type Habit,
  MINUTES_PER_DAY,
  type Minute,
  type Person,
  type Unit,
} from '../types.ts';

export interface HabitContext {
  now: Minute;
  placeId?: string;
  lastAction?: string;
}

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
   * cigarettes in a row). Engineering default.
   */
  refractory: 4 * 60,
} as const;

/** Circular distance in minutes between two minute-of-day values. */
function dayDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % MINUTES_PER_DAY;
  return Math.min(d, MINUTES_PER_DAY - d);
}

/**
 * 0..1 match of a context to a habit's cues. Each present cue must match (product): time by distance from
 * the hour bucket's centre (full within the bucket, linear falloff over the next hour), place and preceding
 * action exactly. Absent cues are ignored; a habit with no cues matches nothing.
 */
export function cueMatches(h: Habit, ctx: HabitContext): Unit {
  const d = HABIT_DEFAULTS;
  const { hour, placeId, after } = h.cue;
  if (hour === undefined && placeId === undefined && after === undefined) return 0;
  let m = 1;
  if (hour !== undefined) {
    const dist = dayDistance(minuteOfDay(ctx.now), hour * 60 + 30);
    m *= clamp01(1 - (dist - d.hourCore) / d.hourFalloff);
  }
  if (placeId !== undefined && ctx.placeId !== placeId) return 0;
  if (after !== undefined && ctx.lastAction !== after) return 0;
  return m;
}

/**
 * 0..1 urge multiplier for a withheld craving habit at `now`: craving × urgeGain × gamma bump of the days
 * past the usual interval since last performance, (t/peak)·e^{1 - t/peak}. 0 for habits never withheld.
 */
export function habitUrge(h: Habit, now: Minute, lastAt: Minute = h.lastAt): number {
  const d = HABIT_DEFAULTS;
  const c = clamp01(h.craving ?? 0);
  if (c <= 0 || !((h.withheld ?? 0) > 0)) return 0;
  const t = Math.max(0, now - Math.max(h.lastAt, lastAt) - d.urgeInterval) / MINUTES_PER_DAY;
  if (t <= 0) return 0;
  const x = t / d.urgePeakDays;
  return c * d.urgeGain * x * Math.exp(1 - x);
}

/**
 * Habitual pull toward an affordance: sum of strength × cue match × refractory ramp over habits for its action,
 * capped at 1, plus any abstinence urge (strength × match × habitUrge, capped at urgeMax). The ramp is 0 right
 * after the action was last performed and full `refractory` minutes later (no immediate re-pull from an answered cue).
 * The refractory and the urge run from the last time the ACTION was performed under any of its habits (fix
 * 2026-10-03: a habit whose cues never matched a performance kept its seed `lastAt`, so its craving grew all month
 * and he chain-smoked on Eid). Without craving habits the result is 0..1 as before.
 */
export function habitPull(p: Pick<Person, 'habits'>, aff: Affordance, ctx: HabitContext): number {
  let sum = 0;
  let urge = 0;
  let last = Number.NEGATIVE_INFINITY;
  for (const h of p.habits)
    if (h.action === aff.action && h.lastAt <= ctx.now) last = Math.max(last, h.lastAt);
  for (const h of p.habits) {
    if (h.action !== aff.action) continue;
    const since = ctx.now - Math.max(h.lastAt, last);
    const ready = since >= 0 ? clamp01(since / HABIT_DEFAULTS.refractory) : 1;
    const m = h.strength * cueMatches(h, ctx) * ready;
    sum += m;
    if (m > 0) urge += m * habitUrge(h, ctx.now, last);
  }
  return Math.min(1, sum) + Math.min(HABIT_DEFAULTS.urgeMax, urge);
}

/**
 * Effort multiplier (1 - easeMax × cued strength, in [1 - easeMax, 1]) for an option's initiation and
 * attentional cost (cognition's effortBase × effort and focus × sleepiness parts; not the physical
 * effort × fatigue part). Urges do not ease. See SCOPE (habit ease, N4).
 */
export function habitEase(p: Pick<Person, 'habits'>, aff: Affordance, ctx: HabitContext): number {
  let sum = 0;
  for (const h of p.habits) if (h.action === aff.action) sum += h.strength * cueMatches(h, ctx);
  return 1 - HABIT_DEFAULTS.easeMax * Math.min(1, sum);
}

/**
 * A different action (`completedAction`) was completed in this context: every habit for another action
 * whose cue matched ≥ sameContext loses extinction × match × spacing × strength, at most one full loss per
 * cue occasion (spacing measured from the later of its last performance and last withholding). Call after
 * each completed action with the same context passed to `reinforce`. Returns the habits weakened.
 */
export function withholdCued(p: Pick<Person, 'habits'>, completedAction: string, ctx: HabitContext): Habit[] {
  const d = HABIT_DEFAULTS;
  const out: Habit[] = [];
  if (!completedAction) return out;
  for (const h of p.habits) {
    if (h.action === completedAction || h.strength <= 0) continue;
    const m = cueMatches(h, ctx);
    if (m < d.sameContext) continue;
    const since = ctx.now - Math.max(h.lastAt, h.lastWithheldAt ?? Number.NEGATIVE_INFINITY);
    const spacing = clamp01(since / d.fullSpacing);
    if (spacing <= 0) continue;
    h.strength = clamp01(h.strength * (1 - d.extinction * m * spacing));
    h.withheld = (h.withheld ?? 0) + 1;
    h.lastWithheldAt = Math.max(h.lastWithheldAt ?? ctx.now, ctx.now);
    out.push(h);
  }
  return out;
}

/**
 * Record a completed action. Strengthens the best-matching habit for this action (cue match ≥ sameContext),
 * or starts one keyed on the current hour bucket, place and preceding action. Gain is asymptotic toward 1,
 * scaled by cue match and by spacing since the last repetition. Returns the habit, or null for an empty action.
 */
export function reinforce(p: Pick<Person, 'habits'>, action: string, ctx: HabitContext): Habit | null {
  const d = HABIT_DEFAULTS;
  if (!action) return null;
  let best: Habit | null = null;
  let bestMatch = 0;
  for (const h of p.habits) {
    if (h.action !== action) continue;
    // A habit without a place/after cue would match any place; require the key cues to agree so
    // "coffee at home" and "coffee at work" stay distinct.
    if ((h.cue.placeId ?? null) !== (ctx.placeId ?? null)) continue;
    if ((h.cue.after ?? null) !== (ctx.lastAction ?? null)) continue;
    const m = cueMatches(h, ctx);
    if (m > bestMatch) {
      best = h;
      bestMatch = m;
    }
  }
  if (!best || bestMatch < d.sameContext) {
    const cue: Habit['cue'] = { hour: hourOf(ctx.now) };
    if (ctx.placeId !== undefined) cue.placeId = ctx.placeId;
    if (ctx.lastAction !== undefined) cue.after = ctx.lastAction;
    best = { cue, action, strength: 0, repetitions: 0, lastAt: ctx.now };
    bestMatch = 1;
    p.habits.push(best);
    if (p.habits.length > d.maxHabits) evictWeakest(p, best);
  }
  const spacing = best.repetitions === 0 ? 1 : clamp01((ctx.now - best.lastAt) / d.fullSpacing);
  best.strength = clamp01(best.strength + d.gain * bestMatch * spacing * (1 - best.strength));
  best.repetitions += 1;
  best.lastAt = Math.max(best.lastAt, ctx.now);
  return best;
}

function evictWeakest(p: Pick<Person, 'habits'>, keep: Habit): void {
  let idx = -1;
  for (let i = 0; i < p.habits.length; i++) {
    const h = p.habits[i];
    if (!h || h === keep) continue;
    const w = idx < 0 ? undefined : p.habits[idx];
    if (!w || h.strength < w.strength || (h.strength === w.strength && h.lastAt < w.lastAt)) idx = i;
  }
  if (idx >= 0) p.habits.splice(idx, 1);
}

/** Slow exponential decay of every habit without repetition (closed form; split steps compose exactly). */
export function advanceHabits(p: Pick<Person, 'habits'>, dt: number): void {
  if (dt <= 0) return;
  for (const h of p.habits) h.strength = decay(h.strength, dt, HABIT_DEFAULTS.decayHalfLife);
}
