/**
 * SCOPE: Cue-linked automaticity: an action repeated in a stable context (time of day, place, preceding
 * action) gains a habit whose strength later pulls toward that action when the cues recur. Borrows the
 * asymptotic automaticity curve of Lally et al. (2010; median ~66 days to reach 95% of the plateau with
 * daily repetition, wide individual variation) and their finding that missing one occasional day barely
 * changed the curve; cue-dependence follows Wood & Neal's context-cued habit account. Spacing caps gains at
 * roughly one meaningful repetition per day, so rapid repeats do not build a habit in an afternoon.
 * Does NOT claim: a universal number of days to form a habit, that habit strength is moral approval,
 * or a model of habit change strategies beyond cue mismatch and slow decay.
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

/** Habitual pull toward an affordance: sum of strength × cue match over habits for its action, capped at 1. */
export function habitPull(p: Pick<Person, 'habits'>, aff: Affordance, ctx: HabitContext): number {
  let sum = 0;
  for (const h of p.habits) if (h.action === aff.action) sum += h.strength * cueMatches(h, ctx);
  return Math.min(1, sum);
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
