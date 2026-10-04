/**
 * SCOPE (mental breaks, 1.6.0): a crisis state inside affect. A host opts a person in with `enableBreaks(p,
 * behaviours)`, handing over the break behaviours its world can express (wander off, binge, hide, lash out); the
 * framework owns the state, its onset and its recovery, and the host owns what each behaviour means in its world
 * (which offers it allows, by action or tag). Without `enableBreaks` nothing here runs, no randomness is drawn and
 * a person's state is unchanged, so existing runs replay byte for byte.
 *
 * Stress is strain that accumulates from discrete events the composite reports (`strain`: commanded hours against
 * one's will, injuries) and from a low mood (`stressMoodRate` per day at valence -1), and halves over
 * `stressHalfLife`. Once an hour, on the tick grid (so chunking does not change it), while awake, outside a break
 * and past the refractory period, a break starts with probability 1 - exp(-h * 1h), where
 * h = baseHazard * pressure * (0.5 + emotionality) and pressure is how far the felt mood is below `breakMood` or
 * stress above `breakStress` (the larger, 0..1). The behaviour is drawn by host weight from the person's RNG, and
 * lasts its own minutes range (default 2-6 h). Recovery: the break ends at `until`; an hour asleep counts double, and
 * comfort from someone close (`easeBreak`) halves what is left. Afterwards stress is halved and a refractory period
 * (`refractory`) follows.
 *
 * During a break (enforced by `will/` and `cognition/`): options outside the behaviour are vetoed cannot 'break',
 * except bodily-need options at survival desperation; every voice is refused cannot 'break' with no counters; a
 * command ends. Hazard shape and every number are engineering defaults chosen for game time scales (a bad stretch
 * gives a break every day or two), not calibrated against any clinical data. Does not model: psychiatric conditions,
 * diagnosis, suicidality, trauma memory, contagion of panic between people, or the content of the behaviours.
 */
import { chance, clamp01, decay, dexp, random } from '../core/index.ts';
import type { BreakBehaviour, CrisisState, Minute, Person, Unit } from '../types.ts';
import { MINUTES_PER_DAY, MINUTES_PER_HOUR } from '../types.ts';
import { readAffect } from './affect.ts';

export const CRISIS_DEFAULTS = {
  /** Felt valence below which mood pressure starts. */
  breakMood: -0.35,
  /** Stress above which stress pressure starts. */
  breakStress: 0.6,
  /** Hazard per hour at full pressure and average emotionality (h = base × pressure × (0.5 + emotionality)). */
  baseHazard: 0.15,
  stressHalfLife: MINUTES_PER_DAY,
  /** Stress gained per day at mood valence -1 (linear in how negative the mood is). */
  stressMoodRate: 0.6,
  /** Default break length range in minutes. */
  minutes: [120, 360] as readonly [number, number],
  /** No new break for this long after one ends. */
  refractory: 12 * MINUTES_PER_HOUR,
  /** Share of stress kept when a break ends. */
  afterBreakStress: 0.5,
  /** Behaviours kept per person. */
  maxBehaviours: 16,
  /** Stress per controlled hour against one's will (× the command margin, capped at 1). */
  commandStrainPerHour: 0.05,
  /** Stress per unit of injury severity. */
  injuryStrain: 0.3,
};

/**
 * Opt a person into mental breaks with the host's behaviours (replacing any earlier list). An empty list turns
 * breaks off again (the state is removed). Plain JSON; saved with the person.
 */
export function enableBreaks(p: Person, behaviours: readonly BreakBehaviour[]): void {
  if (behaviours.length === 0) {
    delete p.affect.crisis;
    return;
  }
  const list = behaviours.slice(0, CRISIS_DEFAULTS.maxBehaviours).map((b) => structuredClone(b));
  if (p.affect.crisis) p.affect.crisis.behaviours = list;
  else p.affect.crisis = { stress: 0, checkedAt: p.now, breaks: 0, behaviours: list };
}

/** The break in progress, if any. */
export function inBreak(p: Person): CrisisState['break'] {
  return p.affect.crisis?.break;
}

/** The behaviour of the break in progress, if any. */
export function breakBehaviour(p: Person): BreakBehaviour | undefined {
  const c = p.affect.crisis;
  if (!c?.break) return undefined;
  const id = c.break.behaviourId;
  return c.behaviours.find((b) => b.id === id);
}

/** Whether an offer belongs to the break in progress (by action, by tag, or tagged `break:<id>`). */
export function breakAllows(p: Person, aff: { action: string; tags?: readonly string[] }): boolean {
  const b = breakBehaviour(p);
  const brk = p.affect.crisis?.break;
  if (!brk) return true;
  const tags = aff.tags ?? [];
  if (tags.includes(`break:${brk.behaviourId}`)) return true;
  if (!b) return false;
  return (b.actions?.includes(aff.action) ?? false) || (b.tags?.some((t) => tags.includes(t)) ?? false);
}

/** Add strain (0..1 scale) to a person who has breaks enabled; a no-op otherwise. */
export function strain(p: Person, amount: number): void {
  const c = p.affect.crisis;
  if (!c || !(amount > 0)) return;
  c.stress = clamp01(c.stress + amount);
}

/** Break pressure (0..1) and hazard per hour right now, without changing anything (for UI). */
export function breakHazard(p: Person): { pressure: Unit; perHour: number } {
  const K = CRISIS_DEFAULTS;
  const feltValence = readAffect(p).valence;
  const c = p.affect.crisis;
  if (!c || c.break || !p.body.alive) return { pressure: 0, perHour: 0 };
  const mood = clamp01((K.breakMood - feltValence) / (1 + K.breakMood));
  const stress = clamp01((c.stress - K.breakStress) / (1 - K.breakStress));
  const pressure = Math.max(mood, stress);
  return { pressure, perHour: K.baseHazard * pressure * (0.5 + p.traits.emotionality) };
}

export type CrisisEvent =
  | { kind: 'onset'; behaviour: BreakBehaviour | undefined; behaviourId: string; until: Minute }
  | { kind: 'recovered'; behaviourId: string };

/**
 * Hourly crisis bookkeeping on the tick grid (the composite calls it there): stress update, recovery, onset roll.
 * Returns what happened so the composite can remember it and interrupt.
 */
export function checkCrisis(p: Person, now: Minute): CrisisEvent | undefined {
  const K = CRISIS_DEFAULTS;
  const c = p.affect.crisis;
  if (!c) return undefined;
  const feltValence = readAffect(p).valence;
  const dt = Math.max(0, now - c.checkedAt);
  c.checkedAt = Math.max(c.checkedAt, now);
  c.stress = clamp01(
    decay(c.stress, dt, K.stressHalfLife) +
      (K.stressMoodRate * Math.max(0, -feltValence) * dt) / MINUTES_PER_DAY,
  );
  if (c.break) {
    // Sleep heals faster: an hour asleep takes an extra hour off the break.
    if (p.body.asleep) c.break.until -= dt;
    if (now >= c.break.until) {
      const behaviourId = c.break.behaviourId;
      c.lastBreakAt = now;
      delete c.break;
      c.stress *= K.afterBreakStress;
      return { kind: 'recovered', behaviourId };
    }
    return undefined;
  }
  if (!p.body.alive || p.body.asleep || c.behaviours.length === 0) return undefined;
  if (c.lastBreakAt !== undefined && now - c.lastBreakAt < K.refractory) return undefined;
  const { perHour } = breakHazard(p);
  if (perHour <= 0 || dt <= 0) return undefined;
  if (!chance(p.rng, 1 - dexp((-perHour * dt) / MINUTES_PER_HOUR))) return undefined;
  let total = 0;
  for (const b of c.behaviours) total += Math.max(0, b.weight ?? 1);
  let r = random(p.rng) * total;
  let pick = c.behaviours[c.behaviours.length - 1] as BreakBehaviour;
  for (const b of c.behaviours) {
    r -= Math.max(0, b.weight ?? 1);
    if (r < 0) {
      pick = b;
      break;
    }
  }
  const [lo, hi] = pick.minutes ?? K.minutes;
  const minutes = Math.round(lo + random(p.rng) * Math.max(0, hi - lo));
  c.break = { behaviourId: pick.id, since: now, until: now + Math.max(1, minutes) };
  c.breaks += 1;
  return { kind: 'onset', behaviour: pick, behaviourId: pick.id, until: c.break.until };
}

/** Comfort from someone close: halve what is left of the break (`share` of it remains). Returns true if eased. */
export function easeBreak(p: Person, now: Minute, share = 0.5): boolean {
  const b = p.affect.crisis?.break;
  if (!b || now >= b.until) return false;
  b.until = now + Math.max(1, Math.round((b.until - now) * clamp01(share)));
  return true;
}

/** Skip-time bookkeeping: no onset is rolled for a skipped interval; the clock and stress decay advance. */
export function skipCrisis(p: Person, to: Minute): void {
  const c = p.affect.crisis;
  if (!c) return;
  c.stress = decay(c.stress, Math.max(0, to - c.checkedAt), CRISIS_DEFAULTS.stressHalfLife);
  c.checkedAt = to;
  if (c.break && to >= c.break.until) {
    c.lastBreakAt = c.break.until;
    delete c.break;
  }
}
