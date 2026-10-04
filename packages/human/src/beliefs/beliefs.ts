/**
 * SCOPE: selective attention, propositional beliefs and trust in information sources. Attention is a
 * limited-capacity filter (a small working-memory-like budget of a few items that shrinks with mental load
 * and fatigue) with priority for self-relevant, socially relevant and, under fear, threat-related percepts.
 * Beliefs are log-odds credences updated additively by testimony weighted by source reliability
 * (Bayesian-style evidence accumulation in log-odds form), drifting slowly toward uncertainty. Direct
 * observation resets a belief and recalibrates source trust asymmetrically (trust is lost faster than it is
 * gained, the trust-asymmetry finding). It does NOT model motivated reasoning, belief networks or
 * inference between propositions, source memory errors, or social consensus effects; parameters are
 * engineering defaults for game time scales.
 */
import { clamp, clamp01, decay, dpow, expit, logit } from '../core/index.ts';
import type { Belief, EntityId, Minute, Percept, Person, Unit } from '../types.ts';
import { MINUTES_PER_DAY } from '../types.ts';

export const BELIEF_DEFAULTS = {
  maxBeliefs: 300,
  maxSources: 6,
  maxLogOdds: 6,
  defaultTrust: 0.5,
  selfTrust: 0.95,
  /** Testimony weight w = clamp01((trust - trustFloor) / (1 - trustFloor)) ^ trustExponent. */
  trustFloor: 0.2,
  trustExponent: 1.5,
  /** Weight multiplier when the same source repeats a claim it already made (not independent evidence). */
  repeatDiscount: 0.5,
  /** Weight multiplier on testimony that contradicts the person's own observation of the proposition. */
  observedDiscount: 0.25,
  /** Log-odds magnitude set by direct observation. */
  confirmLogOdds: 4,
  /** Trust change on confirmation: gain toward 1, loss toward 0 (loss > gain). */
  trustGain: 0.1,
  trustLoss: 0.25,
  /** Half-life of log-odds drift toward 0. */
  driftHalfLife: 45 * MINUTES_PER_DAY,
  // Attention
  attentionBase: 2,
  attentionRange: 4,
  selfRelevance: 0.4,
  selfValenceRelevance: 0.2,
  affectionThreshold: 0.4,
  socialRelevance: 0.3,
  threatRelevance: 0.5,
  interestRelevance: 0.25,
  alwaysSalience: 0.9,
  alwaysSelfValence: 0.5,
  threatKinds: [
    'theft',
    'harm',
    'attack',
    'threat',
    'danger',
    'fire',
    'death',
    'insult',
    'conflict',
    'injury',
  ],
};

export interface AttendContext {
  focus: Unit;
  fatigue: Unit;
  fear: Unit;
  interests?: string[];
}

function affectionWith(p: Person, id: EntityId | undefined): number {
  if (id === undefined) return 0;
  const r = p.social.relationships.find((x) => x.otherId === id);
  return r ? Math.abs(r.affection) : 0;
}

/** Attention as limited capacity: keep the K most relevant percepts plus any that cannot be ignored. */
export function attend(p: Person, percepts: Percept[], ctx: AttendContext): Percept[] {
  const d = BELIEF_DEFAULTS;
  const capacity = Math.round(
    d.attentionBase + d.attentionRange * (1 - clamp01(ctx.focus)) * (1 - clamp01(ctx.fatigue)),
  );
  const scored = percepts.map((pc, index) => {
    const v = Math.abs(pc.valence ?? 0);
    let score = pc.salience;
    const aboutSelf = pc.targetId === p.id;
    if (aboutSelf) score += d.selfRelevance + d.selfValenceRelevance * v;
    const aff = Math.max(affectionWith(p, pc.actorId), affectionWith(p, pc.targetId));
    if (aff >= d.affectionThreshold) score += d.socialRelevance * aff;
    if (d.threatKinds.includes(pc.kind)) score += d.threatRelevance * clamp01(ctx.fear);
    const interests = ctx.interests ?? [];
    if (
      interests.length > 0 &&
      [pc.kind, pc.actorId, pc.targetId, pc.placeId].some((x) => x !== undefined && interests.includes(x))
    ) {
      score += d.interestRelevance;
    }
    const mustKeep = pc.salience >= d.alwaysSalience || (aboutSelf && v >= d.alwaysSelfValence);
    return { pc, index, score, mustKeep };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  const out: Percept[] = [];
  let used = 0;
  for (const s of scored) {
    if (s.mustKeep) out.push(s.pc);
    else if (used < capacity) {
      out.push(s.pc);
      used += 1;
    }
  }
  return out;
}

export function trustOf(p: Person, sourceId: EntityId): Unit {
  if (sourceId === p.id || sourceId === 'self') return BELIEF_DEFAULTS.selfTrust;
  return p.memory.sourceTrust[sourceId] ?? BELIEF_DEFAULTS.defaultTrust;
}

/** Testimony weight from trust: 0 at or below the floor, never negative, so low trust alone never flips a claim. @internal */
export function testimonyWeight(trust: Unit): Unit {
  const d = BELIEF_DEFAULTS;
  return dpow(clamp01((trust - d.trustFloor) / (1 - d.trustFloor)), d.trustExponent);
}

function findBelief(p: Person, prop: string): Belief | undefined {
  return p.memory.beliefs.find((b) => b.prop === prop);
}

function evictBeliefs(p: Person, keep: string): void {
  const list = p.memory.beliefs;
  while (list.length > BELIEF_DEFAULTS.maxBeliefs) {
    let worst = -1;
    for (let i = 0; i < list.length; i++) {
      const b = list[i] as Belief;
      if (b.prop === keep) continue;
      const w = worst < 0 ? undefined : (list[worst] as Belief);
      const strength = Math.abs(b.logOdds);
      if (
        !w ||
        strength < Math.abs(w.logOdds) - 1e-9 ||
        (Math.abs(strength - Math.abs(w.logOdds)) <= 1e-9 &&
          (b.updatedAt < w.updatedAt || (b.updatedAt === w.updatedAt && b.prop < w.prop)))
      ) {
        worst = i;
      }
    }
    if (worst < 0) break;
    list.splice(worst, 1);
  }
}

function ensureBelief(p: Person, prop: string, now: Minute): Belief {
  let b = findBelief(p, prop);
  if (!b) {
    b = { prop, logOdds: 0, updatedAt: now, sources: [] };
    p.memory.beliefs.push(b);
    evictBeliefs(p, prop);
  }
  return b;
}

/** Testimony or inference: add reliability-weighted log-odds evidence for (or against) `prop`. */
export function believe(
  p: Person,
  prop: string,
  value: boolean,
  confidence: Unit,
  sourceId: EntityId,
  now: Minute,
): Belief {
  const d = BELIEF_DEFAULTS;
  const b = ensureBelief(p, prop, now);
  const prior = b.sources.find((s) => s.id === sourceId);
  let w = testimonyWeight(trustOf(p, sourceId));
  if (prior && prior.value === value) w *= d.repeatDiscount;
  // Testimony against what I saw for myself counts for little (see the revision SCOPE below).
  const observed = b.sources.find((s) => s.id === p.id || s.id === 'self');
  if (observed && observed.value !== value && sourceId !== p.id && sourceId !== 'self')
    w *= d.observedDiscount;
  const delta = logit(0.5 + (clamp01(confidence) - 0.5) * w);
  b.logOdds = clamp(b.logOdds + (value ? delta : -delta), -d.maxLogOdds, d.maxLogOdds);
  b.updatedAt = now;
  b.sources = b.sources.filter((s) => s.id !== sourceId);
  b.sources.push({ id: sourceId, value });
  if (b.sources.length > d.maxSources) b.sources.splice(0, b.sources.length - d.maxSources);
  return b;
}

export function credence(p: Person, prop: string): Unit {
  const b = findBelief(p, prop);
  return b ? expit(b.logOdds) : 0.5;
}

/**
 * Direct observation of the truth: set the belief firmly and recalibrate the sources that spoke on it.
 * Returns the sources whose claim turned out false (`misled`), sorted; the person knows only that they were
 * told wrong, not whether it was a lie, so the caller decides what social consequence, if any, follows.
 */
export function confirm(p: Person, prop: string, truth: boolean, now: Minute): EntityId[] {
  const misled: EntityId[] = [];
  const d = BELIEF_DEFAULTS;
  const b = ensureBelief(p, prop, now);
  const sign = truth ? 1 : -1;
  const sameSide = Math.sign(b.logOdds) === sign;
  b.logOdds = sign * (sameSide ? Math.max(d.confirmLogOdds, Math.abs(b.logOdds)) : d.confirmLogOdds);
  for (const s of b.sources) {
    if (s.id === p.id || s.id === 'self') continue;
    const t = trustOf(p, s.id);
    p.memory.sourceTrust[s.id] = clamp01(s.value === truth ? t + d.trustGain * (1 - t) : t - d.trustLoss * t);
    if (s.value !== truth) misled.push(s.id);
  }
  // The belief now rests on observation; earlier claims are settled and are not judged twice.
  b.sources = [{ id: p.id, value: truth }];
  b.updatedAt = now;
  return misled.sort();
}

/** Unrefreshed beliefs drift toward 50/50 (closed-form exponential; exact for any dt). */
export function advanceBeliefs(p: Person, dt: number): void {
  if (dt <= 0) return;
  for (const b of p.memory.beliefs) b.logOdds = decay(b.logOdds, dt, BELIEF_DEFAULTS.driftHalfLife);
}

/**
 * SCOPE (revision under conflicting testimony): sources that disagree about a proposition add opposing
 * reliability-weighted evidence, so a contested belief sits nearer 50/50 and `contested` reports who said
 * what. Once the person has observed the truth, testimony against that observation is discounted
 * (`observedDiscount`), so a rumour confirmed false does not simply return with the next telling; it only
 * creeps back as the observed belief drifts toward uncertainty over weeks. Named shape: corrections reduce
 * misinformation's influence without being instantaneous for testimony-only corrections (the continued-
 * influence literature, Lewandowsky et al. 2012), while first-hand evidence is weighted above hearsay. It
 * does NOT model the continued-influence effect after observation (correction here is complete), memory of
 * which source was retracted, or backfire effects; the discount is an engineering default.
 */
export function contested(
  p: Person,
  prop: string,
): { for: EntityId[]; against: EntityId[]; contested: boolean } {
  const b = findBelief(p, prop);
  const pro: EntityId[] = [];
  const con: EntityId[] = [];
  for (const s of b?.sources ?? []) (s.value ? pro : con).push(s.id);
  pro.sort();
  con.sort();
  return { for: pro, against: con, contested: pro.length > 0 && con.length > 0 };
}

// Remembered advice (N9) is owned by `will/` (`standingAdvice`, fed from `Percept.advice`); review 2026-10-03
// removed a second, unused belief-based implementation here so the two could not drift apart.
