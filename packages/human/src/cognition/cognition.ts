/** SCOPE: one source of decision terms, composed from faculty-owned projections. */

import { cloneData } from '../core/clone.ts';
import * as affectModule from '../affect/affect.ts';
import { agendaTermsWithGoalEstimates } from '../agenda/agenda.ts';
import { trustOf } from '../beliefs/beliefs.ts';
import { bodyOwner } from '../body/body.ts';
import { normTerms } from '../conscience/conscience.ts';
import { clamp01, cmpStr, dexp, round } from '../core/index.ts';
import { keysOf } from '../core/keys.ts';
import { curiosityTerms } from '../curiosity/curiosity.ts';
import { type HabitContext, habitEase, habitPull } from '../habits/habits.ts';
import * as memoryModule from '../memory/memory.ts';
import { methodOwner } from '../methods/methods.ts';
import { levelOf, needThreshold, urgencyOf } from '../needs/needs.ts';
import * as partneringModule from '../partnering/partnering.ts';
import { persistenceTerms } from '../persistence/persistence.ts';
import * as promptingModule from '../promptings/promptings.ts';
import { bodyForecastTerm, receivedGoalRoute } from '../prospection/index.ts';
import * as reviewModule from '../review/review.ts';
import type {
  ActorState,
  BodyProjectionContext,
  BodyReadout,
  Considered,
  EffectiveParameters,
  ExpectedEffect,
  FrameContext,
  LifeModifiers,
  NeedReading,
  Offer,
  Suggestion,
  TermData as Term,
  TermSource,
  Time,
  Unit,
  ValueId,
} from '../run-schema.ts';
import {
  closeness,
  companionSteadiness,
  isDeceasedTie,
  relationshipWith,
  socialTerms,
} from '../social/index.ts';
import { adviceWeight, standingAdvice, suggestionTargets, voicesIn } from '../will/will.ts';

type CognitiveActor = ActorState & { effective: EffectiveParameters };
const PHYSIOLOGICAL_NEEDS = ['food', 'water', 'sleep', 'rest', 'relief'] as const;
const VALUE_KEYS = [
  'benevolence',
  'universalism',
  'tradition',
  'conformity',
  'security',
  'achievement',
  'power',
  'hedonism',
  'stimulation',
  'selfDirection',
] as const;
const minuteOfDay = (at: number) => ((at % 86400000) + 86400000) % 86400000;
/**
 * SCOPE: scoring of offered options. `consider` sums the utility terms listed in docs/framework.md
 * ("Utility of an option"): need terms use the person's need urgencies times the gain they *believe* an
 * option gives (the advertisement blended with learned expectation, times believed success); norm,
 * commitment/goal, habit, emotion-tendency, social, effort, risk, material, precommitment and suggestion
 * terms come from the owning faculties or from simple coefficient forms. Traits and values only scale
 * terms. `decide` processes affordances in stable id order, scores them all and hands the list to `will`
 * for vetoes and selection. Borrowed shapes: additive multi-attribute utility with a saturating money
 * term (diminishing marginal value of material gain), prediction-error-adjusted action values
 * (model-free cached values alongside the host's model-based advertisement). It does NOT claim calibrated
 * weights, rational-choice optimality, or that a weighted sum exhausts human deliberation; every term is
 * kept in the trace so the UI can show why.
 *
 * SCOPE (lane will+cognition, 2026-10-03): several voices add one `suggestion:<voiceId>` term each, with
 * reactance summed into one `autonomy` term; remembered advice adds `suggestion:remembered:<source>` terms
 * (see `rememberedTerms` and `will.rememberAdvice`). Scarcity (N13): a host-supplied 0..1 shortfall raises the
 * weight of the material term, shrinks its saturation scale so small sums still count, and raises the
 * `need:safety` term. Borrowed shapes: diminishing marginal utility of wealth (the same sum weighs more to
 * someone who has less) and the scarcity account of Mullainathan & Shafir, where a shortfall captures
 * attention and raises the felt value of the scarce resource. Neither source is catalogued in
 * research/empirical-models.md yet; the coefficients are engineering defaults. It does not model the claimed
 * cognitive cost of scarcity ("bandwidth tax"), debt itself (a host ledger plus commitments), or present
 * bias; and because losses are amplified too, a host must carry the benefit of paying a debt (a commitment,
 * an advertised `safety` gain) or paying looks only like a loss. The spec's "security need" is read as the
 * `safety` need: `security` is a value, not a need, and no need is added.
 *
 * SCOPE (2.8.0, both additive): an offer naming `alongside` partners (people already taking that course) gets one
 * `together:<id>` term per known, living partner, `togetherScale` × closeness, without belonging satiation: the
 * pull is not to be left behind, which stays when the pair is together and belonging is full (The Rope's resting
 * partner, 2026-10-18 reproduction: belonging terms near 0.01 against inertia of 0.07-0.15). Shape only, after
 * joint commitment and the sense of commitment in joint action (Gilbert 1990; Michael and Pacherie 2015; cited unaudited, research/empirical-models.md §6b); it does
 * not model who leads, negotiation, or obligations between the partners. For fullness, an offer
 * that advertises food, water or relief while that need is past its comfort threshold gets `full:<need>` =
 * -fullnessScale × gain × over²: eating or drinking when full is mildly unpleasant (negative alliesthesia, unaudited citation, Cabanac
 * 1971), so idle choice stops cycling short consumption at full hydration (The Rope, owner Kestrel export
 * 2026-10-19). It models no bladder, sensory-specific satiety by food, or overeating for comfort.
 */
export const COGNITION_DEFAULTS = {
  /** Multiplier on urgency × believed gain. */
  needScale: 4,
  /**
   * A norm-fulfil term whose norm is tracked by commitments (e.g. salah by prayer windows) is damped by this
   * factor while no window is open: the duty is discharged until the next window.
   */
  dischargedNormFactor: 0.15,
  /**
   * Multiplier on learned valence × confidence. A positive expectation is further scaled by the current
   * urgency of the needs the option is believed to serve (pleasure learned from relief does not pull when
   * there is nothing to relieve); a negative one is never scaled down, so remembered harm keeps biting.
   */
  expectationScale: 0.6,
  /**
   * Short-term satiation of a repeated action: positive norm pulls (unless a tracked duty's window is open),
   * emotion-tendency pulls and per-person social pulls are multiplied by
   * floor + (1 - floor) × min(1, minutes since the same action was last undertaken / refractory).
   */
  normRefractoryMinutes: 240,
  normRefractoryFloor: 0.25,
  habitScale: 0.6,
  emotionScale: 0.5,
  /** Multiplier on social terms (affection/belonging/benevolence pulls). */
  socialScale: 0.6,
  /** Positive social pulls satiate with belonging: multiplier is floor + (1 - floor) × (1 - belonging level). */
  socialSatiationFloor: 0.1,
  effortScale: 1,
  /** Effort always costs a little, even when fresh. */
  effortBase: 0.1,
  riskScale: 1.5,
  /**
   * Companions in danger (held impressions): on a risky offer shared with people the person holds
   * impressions of, each adds 'companion:<id>' = companionScale × chance × severity × believed steadiness (−1..1,
   * `companionSteadiness`): a steady neighbour makes the danger easier to face, a frightened or hurt one harder.
   */
  companionScale: 1,
  /** Host material units at which the saturating value term reaches 63%. */
  materialScale: 10,
  materialWeight: 1,
  suggestionScale: 1,
  /** Extra persuasion when the voice's appeal matches a motive (0..1 match adds up to this fraction). */
  appealBonus: 0.6,
  /** Options kept in the decision record. */
  maxConsidered: 8,
  /**
   * Reactance (Brehm): a suggested option loses appeal when the voice has been pushing hard. Term 'autonomy' =
   * -reactanceScale × max(0, pressure - reactanceFrom) / (1 - reactanceFrom) × selfDirection
   * × (0.5 + autonomy urgency). Insisting adds `reactanceInsist` to the pressure read.
   */
  reactanceScale: 0.8,
  reactanceFrom: 0.3,
  reactanceInsist: 0.2,
  /**
   * Promise inertia: a running activity begun with `begin(..., { promise })` gets a 'commitment' term of
   * commitmentInertia × importance at review, at full strength below conscience's necessity desperation and
   * fading to zero `commitmentInertiaFade` above it (a promise survives hunger, not starvation).
   */
  commitmentInertia: 0.8,
  commitmentInertiaFrom: 0.75,
  commitmentInertiaFade: 0.15,
  /** Social pull per partner on a joint offer: jointTrust × (relationship trust - 0.5). */
  jointTrust: 0.6,
  /**
   * Staying with a partner who is going (2.8.0, `Affordance.alongside`): 'together:<id>' = togetherScale ×
   * closeness. It does not satiate with belonging: being together now does not remove the pull of not being left.
   */
  togetherScale: 0.12,
  /**
   * Fullness: 'full:<need>' = -fullnessScale × gain × over², over = how far the
   * need's level is past its comfort threshold toward 1, for food, water and relief.
   */
  fullnessScale: 0.03,
  // --- lane will+cognition ---
  /** Multiplier on standing advice terms relative to a live suggestion of the same strength (N9). */
  rememberedScale: 1,
  /**
   * Scarcity (N13): with host scarcity s in 0..1 the material term's saturation scale shrinks to
   * materialScale × (1 - scarcityScaleShrink × s), so a small sum stops looking negligible; the term is also
   * multiplied by 1 + scarcityMaterialGain × s (default 0: review 2026-10-03 measured the two mechanisms together
   * making money outweigh commitments, norms and every voice, mean 1.20 / max 2.25 over 40 simulated days, so only the
   * scale shrink is on and the term stays under its scarcity-free ceiling 2 × materialWeight). The `need:safety`
   * term is multiplied by 1 + scarcitySafetyGain × s. Engineering defaults.
   */
  scarcityMaterialGain: 0,
  scarcityScaleShrink: 0.5,
  scarcitySafetyGain: 0.5,
};
export interface ConsiderContext {
  frame: FrameContext;
  bodyProjection: BodyProjectionContext;
  effective: EffectiveParameters;
  noticed: import('../run-schema.ts').NoticedPrompt[];
  now: Time;
  body: BodyReadout;
  needs: NeedReading[];
  mods: LifeModifiers;
  tendencies: Record<string, number>;
  /** Max physiological urgency (necessity input). */
  desperation: number;
  habit: HabitContext;
  suggestion?: Suggestion;
  /** Shared social inputs; `decide` fills this once per decision. */
  social?: SocialContext;
  /** Dominant emotion behind each tendency tag (from `affect.tendencyEmotions`), for term sources. */
  tendencyEmotions?: Record<string, string>;
  // --- lane will+cognition ---
  /** Several voices in one decision (N1); merged with `suggestion`, one per voice id, sorted by id. */
  suggestions?: Suggestion[];
  /**
   * How short of money the person is, 0..1, from the host (e.g. debt relative to income) (N13). Absent or 0
   * leaves the material and safety terms exactly as without it.
   */
  scarcity?: Unit;
  /** The body's perception context now (an open fast), for the bodily forecast (2.6.0). */

  /** Q26: held current conditions, used only by the bodily forecast, never other decision terms. */
}
function voiceTrust(p: CognitiveActor, voiceId: string): number {
  return p.will.voices.find((v) => v.voiceId === voiceId)?.trust ?? 0.5;
}
/**
 * 'open' when a commitment tracking this norm has an open window, 'discharged' when commitments track it but
 * none is open, 'untracked' when no commitment tracks it.
 */
function dutyTracking(p: CognitiveActor, normId: string, now: Time): 'open' | 'discharged' | 'untracked' {
  let tracked = false;
  for (const c of p.agenda.commitments) {
    // A make-up (qada) is kept only by its own actions; it does not open the obligation itself (1.7.0).
    if (c.normId !== normId || c.makeUpOf !== undefined) continue;
    tracked = true;
    if (c.status === 'pending' && now >= c.from && now <= c.until) return 'open';
  }
  return tracked ? 'discharged' : 'untracked';
}
/** Satiation multiplier from the minutes since this action was last undertaken (bounded intention log). */
function sinceFactor(p: CognitiveActor, action: string, now: Time): number {
  const K = p.effective.builtins.COGNITION_DEFAULTS;
  const log = p.conscience.intentions;
  for (let i = log.length - 1; i >= 0; i--) {
    const it = log[i];
    // Missed duties are logged with intention 'missed' (see person.ts recordMissed); they satisfy nothing.
    if (it?.action !== action || it.intention === 'missed') continue;
    const since = Math.max(0, now - it.at);
    return (
      K.normRefractoryFloor + (1 - K.normRefractoryFloor) * clamp01(since / (K.normRefractoryMinutes * 60000))
    );
  }
  return 1;
}
/**
 * Standing advice terms for one option: per source, the strongest matching entry's weight × trust in the source
 * (the voice relation when there is one, else belief source trust) × suggestionScale × rememberedScale.
 * Sources speaking now about this option are skipped. Sorted by source for stable traces.
 */
export function rememberedTerms(
  p: CognitiveActor,
  aff: Offer,
  now: Time,
  speaking: readonly Suggestion[] = [],
): Term[] {
  const K = p.effective.builtins.COGNITION_DEFAULTS;
  if (p.will.advice.length === 0) return [];
  const best = new Map<string, number>();
  for (const a of standingAdvice(p, now)) {
    const hits = a.affordanceId !== undefined ? a.affordanceId === aff.id : a.action === aff.actionId;
    if (!hits) continue;
    if (speaking.some((s) => s.voiceId === a.sourceId && suggestionTargets(s, aff))) continue;
    const w = adviceWeight(a, now);
    if (w > (best.get(a.sourceId) ?? 0)) best.set(a.sourceId, w);
  }
  const out: Term[] = [];
  for (const src of [...best.keys()].sort()) {
    const voice = p.will.voices.find((v) => v.voiceId === src);
    const trust = voice ? voice.trust : trustOf(p, src);
    const value = round(K.rememberedScale * K.suggestionScale * trust * (best.get(src) ?? 0));
    if (value !== 0) out.push({ source: `suggestion:remembered:${src}`, value });
  }
  return out;
}
const isValueId = (x: string): x is ValueId => (VALUE_KEYS as readonly string[]).includes(x);
function appealMatch(p: CognitiveActor, s: Suggestion, needs: NeedReading[]): number {
  if (!s.appeal) return 0;
  if (s.appeal === 'duty') return clamp01(0.5 * p.values.conformity + 0.5 * p.values.tradition);
  if (isValueId(s.appeal)) return clamp01(p.values[s.appeal]);
  return urgencyOf(needs, s.appeal);
}
/** Per-decision social inputs shared by every option (`decide` computes them once). */
export interface SocialContext {
  belongingUrgency: number;
  tendencies: Record<string, number>;
  /** Multiplier on positive social pulls: floor + (1 - floor) × (1 - belonging level). */
  satiation: number;
}
export function socialContext(ctx: ConsiderContext): SocialContext {
  const K = ctx.effective.builtins.COGNITION_DEFAULTS;
  const tendencies: Record<string, number> = {};
  for (const [k, v] of Object.entries(ctx.tendencies)) tendencies[k] = v * K.emotionScale;
  const belongingLevel = ctx.needs.find((n) => n.id === 'belonging')?.level ?? 0.5;
  return {
    belongingUrgency: urgencyOf(ctx.needs, 'belonging'),
    tendencies,
    satiation: K.socialSatiationFloor + (1 - K.socialSatiationFloor) * (1 - clamp01(belongingLevel)),
  };
}
/** Same perceived-body effort estimate for actual offers and received successors. @internal */
function effortValue(p: CognitiveActor, aff: Offer, ctx: ConsiderContext): number {
  const K = p.effective.builtins.COGNITION_DEFAULTS;
  const per = ctx.body.perceived;
  const effort = clamp01(aff.demands.effort);
  const focus = clamp01(aff.demands.focus ?? 0);
  // A cued habit eases initiation and attention (N4: the depleted fall back on habits), not physical exertion.
  const ease =
    p.habits.length === 0
      ? 1
      : habitEase(
          p.habits,
          aff.actionId,
          { ...ctx.habit, placeId: aff.place ?? ctx.habit.placeId },
          p.effective.builtins.HABIT_DEFAULTS,
        );
  const effortCost =
    (effort * K.effortBase + focus * per.sleepiness) * ease +
    effort * per.fatigue * (1 - clamp01(p.body.fitness));
  return -K.effortScale * effortCost;
}
/** Same material valuation for actual offers and received successor costs. @internal */
function materialValue(p: CognitiveActor, material: number, scarcity: number): number {
  const K = p.effective.builtins.COGNITION_DEFAULTS;
  const v = p.values;
  const weight = (v.security + v.achievement + v.power) / 3;
  const scale = K.materialScale * (1 - K.scarcityScaleShrink * scarcity);
  const sat = Math.sign(material) * (1 - dexp(-Math.abs(material) / scale));
  return K.materialWeight * sat * 2 * weight * (1 + K.scarcityMaterialGain * scarcity);
}
/** Shared whole-route valuation for scoring and the read-only plan readout. @internal */
export function prospectiveRoute(p: CognitiveActor, aff: Offer, ctx: ConsiderContext) {
  const scarcity = clamp01(Number.isFinite(ctx.scarcity) ? (ctx.scarcity as number) : 0);
  return receivedGoalRoute(
    p,
    aff,
    ctx.now,
    0.5 + 0.5 * clamp01(ctx.mods.maturity),
    (successor) =>
      effortValue(p, successor, ctx) +
      (successor.expected.material ? materialValue(p, successor.expected.material, scarcity) : 0),
    ctx.frame,
  );
}
/** Needs whose consumption can overfill (2.8.0 fullness): what `body.consume` feeds. */
const FULL_NEEDS = ['food', 'water', 'relief'] as const;
/** Score one option. Pure apart from reads; terms are rounded for stable snapshots. */
export function consider(p: CognitiveActor, aff: Offer, ctx: ConsiderContext): Considered {
  const K = p.effective.builtins.COGNITION_DEFAULTS;
  const scarcity = clamp01(Number.isFinite(ctx.scarcity) ? (ctx.scarcity as number) : 0);
  const terms: Term[] = [];
  const push = (source: TermSource, value: number, ref?: string) => {
    const v = round(value);
    // A non-finite term (bad host number) is dropped; the will vetoes the offer as invalid.
    if (v !== 0 && Number.isFinite(v))
      terms.push(ref === undefined ? { source, value: v } : { source, value: v, ref });
  };
  // Needs: urgency × believed gain × believed success.
  const expected: ExpectedEffect = memoryModule.memoryOwner.expectedEffect(p.memory, aff, ctx.frame);
  push('need:bladder', bodyOwner.bladderMotivation(p.body, aff, expected.successRate, ctx.frame));
  for (const id of keysOf(expected.needs)) {
    const gain = expected.needs[id] ?? 0;
    if (gain === 0) continue;
    const u = urgencyOf(ctx.needs, id);
    const success = gain > 0 ? expected.successRate : 1;
    const scarce = id === 'safety' ? 1 + K.scarcitySafetyGain * scarcity : 1;
    push(`need:${id}`, K.needScale * u * gain * success * scarce);
  }
  for (const id of FULL_NEEDS) {
    const gain = aff.expected.needs[id] ?? 0;
    if (!(gain > 0)) continue;
    const level = levelOf(ctx.needs, id);
    const comfort = needThreshold(p, id, p.effective.builtins.NEEDS_DEFAULTS);
    const over = clamp01((level - comfort) / Math.max(1e-6, 1 - comfort));
    if (over > 0) push(`full:${id}`, -K.fullnessScale * Math.min(1, gain) * over * over);
  }
  if (expected.samples > 0) {
    let relevance = 1;
    if (expected.valence > 0) {
      let served = -1;
      for (const id of keysOf(expected.needs))
        if ((expected.needs[id] ?? 0) > 0) served = Math.max(served, urgencyOf(ctx.needs, id));
      if (served >= 0) relevance = served;
    }
    push('expectation', K.expectationScale * expected.valence * expected.confidence * relevance);
  }
  // Lasting gists: what an old memory says about this option, fading as fresh experience of it
  // (the learned expectation's confidence) takes over.
  if (expected.gist) {
    push(
      'memory',
      K.expectationScale * expected.gist.valence * expected.gist.weight * (1 - expected.confidence),
    );
  }
  // Acquired cue-conditioned methods remain one pull among ordinary motives.
  if (aff.methodContext !== undefined)
    for (const t of methodOwner.evidence(p.methods, {
      ...ctx.frame,
      action: aff.actionId,
      contextId: aff.methodContext,
      available: p.body.alive && !p.body.asleep && !p.body.downed,
      sourceTrust: Object.entries(p.memory.sourceTrust).map(([sourceId, trust]) => ({ sourceId, trust })),
      voices: p.will.voices,
    }).terms)
      push(t.source, t.value);
  // Norms, commitments and goals. Planning terms scale with developmental maturity.
  let refractoryCache: number | undefined;
  const refractory = (): number => {
    refractoryCache ??= sinceFactor(p, aff.actionId, ctx.now);
    return refractoryCache;
  };
  for (const t of normTerms(p, aff, { desperation: ctx.desperation })) {
    const normId = t.source.startsWith('norm:') ? t.source.slice(5) : undefined;
    if (normId === undefined || t.value <= 0) {
      push(t.source, t.value);
      continue;
    }
    const tracked = dutyTracking(p, normId, ctx.now);
    if (tracked === 'open') push(t.source, t.value);
    else {
      const damp = tracked === 'discharged' ? K.dischargedNormFactor : 1;
      push(t.source, t.value * damp * refractory());
    }
  }
  const maturity = clamp01(ctx.mods.maturity);
  const maturityScale = 0.5 + 0.5 * maturity;
  const received = prospectiveRoute(p, aff, ctx);
  for (const t of agendaTermsWithGoalEstimates(p, aff, ctx.now, expected.successRate, received?.goals))
    push(t.source, t.value * maturityScale);
  if (received) push(received.cost.source, received.cost.value, received.cost.ref);
  // Habit: cue-matched automaticity (cued by the option's own place), stronger before planning matures.
  const habit =
    p.habits.length === 0
      ? 0
      : habitPull(
          p.habits,
          aff.actionId,
          { ...ctx.habit, placeId: aff.place ?? ctx.habit.placeId },
          p.effective.builtins.HABIT_DEFAULTS,
        );
  if (habit > 0) push('habit', K.habitScale * habit * (1.5 - 0.5 * maturity));
  // Emotion tendencies matched against tags.
  const social = ctx.social ?? socialContext(ctx);
  const tags = aff.tags ?? [];
  for (const tag of tags.length > 1 ? [...tags].sort() : tags) {
    const t = ctx.tendencies[tag];
    if (t === undefined || t === 0) continue;
    // The pull toward company satiates with belonging, like the per-person social pulls below.
    const sat = t > 0 ? (tag === 'social' ? social.satiation : 1) * refractory() : 1;
    const emotion = ctx.tendencyEmotions?.[tag];
    push(emotion ? `emotion:${emotion}:${tag}` : `emotion:${tag}`, K.emotionScale * t * sat);
  }
  // A place I fear (a threat aimed at it, 1.6.0): options there are avoided at the emotion scale.
  if (aff.place !== undefined) {
    const avoid = ctx.tendencies[`avoid:${aff.place}`];
    if (avoid !== undefined && avoid > 0) push(`avoid:${aff.place}`, -K.emotionScale * avoid);
  }
  // Social pulls. Per-person emotion tendencies enter at the same scale as tag tendencies.
  for (const t of socialTerms(p, aff, social))
    push(t.source, K.socialScale * (t.value > 0 ? social.satiation * refractory() : 1) * t.value);
  // Going with partners who are already taking this course (2.8.0).
  if (aff.alongside) {
    for (const id of [...new Set(aff.alongside)].sort()) {
      if (id === p.id || !p.social.relationships.some((r) => r.otherId === id)) continue;
      if (isDeceasedTie(relationshipWith(p, id))) continue;
      push(`together:${id}`, K.togetherScale * closeness(p, id));
    }
  }
  // Joint offers: whether I trust the partners to do their share.
  if (tags.includes('joint')) {
    for (const id of [...(aff.participants ?? [])].sort()) {
      if (id === p.id) continue;
      const trust = p.social.relationships.find((r) => r.otherId === id)?.trust ?? 0.5;
      push(`joint:${id}`, K.jointTrust * (trust - 0.5));
    }
  }
  // Courtship and proposals (1.8.0, `partnering/`): only offers tagged 'partnering'.
  if (tags.includes('partnering'))
    for (const t of partneringModule.partneringOwner.terms(p.bonds, aff, { ...ctx.frame, social: p.social }))
      push(t.source, t.value);
  // Promise inertia for the running activity (begin with { promise }).
  const act = p.activity;
  if (act?.commitmentId !== undefined && act.offer.id === aff.id) {
    const c = p.agenda.commitments.find((x) => x.id === act.commitmentId);
    if (c?.status === 'pending') {
      const fade = clamp01((ctx.desperation - K.commitmentInertiaFrom) / K.commitmentInertiaFade);
      push('commitment', K.commitmentInertia * c.importance * (1 - fade));
    }
  }
  // Effort and mental load, read from the perceived body.
  const effort = effortValue(p, aff, ctx);
  if (effort < 0) push('effort', effort);
  // Bodily forecast (2.5.0): only offers that declare known follow-on exertion.
  if (aff.expected.followedBy?.length) {
    const t = bodyForecastTerm(p.body, aff, { ...ctx.frame, ...ctx.bodyProjection });
    if (t) push(t.source, t.value);
  }
  // Risk: chance × severity × (fear + emotionality).
  if (aff.expected.risk && aff.expected.risk.chance > 0 && aff.expected.risk.severity > 0) {
    const fear = clamp01(
      p.affect.emotions.filter((e) => e.id === 'fear').reduce((sum, e) => sum + e.intensity, 0),
    );
    push(
      'risk',
      -K.riskScale * aff.expected.risk.chance * aff.expected.risk.severity * (fear + p.traits.emotionality),
    );
    if (p.social.impressions && aff.participants) {
      for (const id of [...aff.participants].sort()) {
        const steady = companionSteadiness(p, id, p.now);
        if (steady !== 0)
          push(
            `companion:${id}`,
            K.companionScale * aff.expected.risk.chance * aff.expected.risk.severity * steady,
          );
      }
    }
  }
  // Material: saturating value of host units, scaled by security/achievement/power.
  if (aff.expected.material) push('material', materialValue(p, aff.expected.material, scarcity));
  // Precommitments inside their daily window.
  const mod = minuteOfDay(ctx.now);
  for (const pc of p.will.precommitments) {
    if (pc.action !== aff.actionId) continue;
    const inside =
      pc.fromMsOfDay <= pc.toMsOfDay
        ? mod >= pc.fromMsOfDay && mod < pc.toMsOfDay
        : mod >= pc.fromMsOfDay || mod < pc.toMsOfDay;
    if (inside) push(`precommit:${pc.id}`, pc.bias);
  }
  // Suggestions: strength × voice trust × appeal match, one term per voice. Never bypasses vetoes (will enforces).
  // During a mental break no voice reaches them (crisis SCOPE): no live or remembered suggestion terms.
  const voices = p.affect.crisis.active ? [] : voicesIn(ctx.suggestion, ctx.suggestions);
  let reactance = 0;
  for (const s of voices) {
    if (!suggestionTargets(s, aff)) continue;
    const match = appealMatch(p, s, ctx.needs);
    push(
      `suggestion:${s.voiceId}`,
      K.suggestionScale * clamp01(s.strength) * voiceTrust(p, s.voiceId) * (1 + K.appealBonus * match),
    );
    // Reactance: being micromanaged makes the pushed option less appealing (summed over pushing voices).
    const pressure = clamp01(
      (p.will.voices.find((v) => v.voiceId === s.voiceId)?.pressure ?? 0) +
        (s.insist ? K.reactanceInsist : 0),
    );
    const excess = Math.max(0, pressure - K.reactanceFrom) / (1 - K.reactanceFrom);
    if (excess > 0)
      reactance +=
        K.reactanceScale * excess * p.values.selfDirection * (0.5 + urgencyOf(ctx.needs, 'autonomy'));
  }
  if (reactance > 0) push('autonomy', -reactance);
  // Standing advice (N9): remembered suggestions from told advice, by trust in the source. A source speaking
  // now about this option is counted once, through its live term above.
  if (!p.affect.crisis.active)
    for (const t of rememberedTerms(p, aff, ctx.now, voices)) push(t.source, t.value);
  for (const t of curiosityTerms(p.curiosity, aff, {
    needs: ctx.needs,
    traits: p.traits,
    life: ctx.mods,
    fear: clamp01(p.affect.emotions.filter((e) => e.id === 'fear').reduce((sum, e) => sum + e.intensity, 0)),
    at: ctx.now,
    expected,
    defaults: p.effective.builtins.CURIOSITY_DEFAULTS,
  }))
    push(t.source, t.value);
  for (const t of persistenceTerms(p.pursuit, terms, {
    at: ctx.now,
    goals: p.agenda.goals,
    needs: ctx.needs,
    fear: clamp01(p.affect.emotions.filter((e) => e.id === 'fear').reduce((sum, e) => sum + e.intensity, 0)),
    defaults: p.effective.builtins.PERSISTENCE_DEFAULTS,
  }))
    push(t.source, t.value);
  // Promptings: a recurrence pull under `fault` and a practised turning-away from a noticed prompt.
  const prompt = promptingModule.promptingsOwner.terms(p.promptings, {
    ...ctx.frame,
    offer: aff,
    terms,
    desperation: ctx.desperation,
  });
  for (const t of prompt.terms) push(t.source, t.value, t.ref);
  if (prompt.noticed) ctx.noticed.push(cloneData(prompt.noticed));
  for (const t of reviewModule.reviewOwner.terms(p.review, terms, { ...ctx.frame, agenda: p.agenda }))
    push(t.source, t.value, t.ref);
  let utility = 0;
  for (const t of terms) utility += t.value;
  const out: Considered = {
    affordanceId: aff.id,
    action: aff.actionId,
    label: aff.label,
    utility: round(utility),
    terms,
    advertised: { ...aff.expected.needs },
    believed: expected.needs,
  };
  if (expected.recalled.length > 0) out.recalled = [...expected.recalled];
  return out;
}
/** Highest physiological urgency: the input to the necessity exception. */
export function desperationOf(needs: NeedReading[]): number {
  let d = 0;
  for (const n of needs)
    if ((PHYSIOLOGICAL_NEEDS as readonly string[]).includes(n.id)) d = Math.max(d, n.urgency);
  return d;
}

export const cognitionOwner: import('../run-schema.ts').CognitionOwner = {
  terms(context) {
    const actor = { ...context.actor, effective: context.effective } as CognitiveActor;
    const tendencies = affectModule.affectOwner.tendencies(actor.affect, actor.traits, context);
    const noticed: import('../run-schema.ts').NoticedPrompt[] = [],
      effects: import('../run-schema.ts').TermEffect[] = [];
    const scarcity = context.scarcity.kind === 'unobserved' ? 0 : context.scarcity.value;
    const ctx: ConsiderContext = {
      frame: context as FrameContext,
      bodyProjection: context.bodyProjection as BodyProjectionContext,
      effective: context.effective,
      noticed,
      now: context.at,
      body: context.body as BodyReadout,
      needs: context.needs.map((n) => ({ ...n })),
      mods: context.life as LifeModifiers,
      tendencies: { ...tendencies.values },
      tendencyEmotions: { ...tendencies.emotions },
      desperation: desperationOf(context.needs.map((n) => ({ ...n }))),
      habit: { now: context.at, ...(actor.lastAction !== undefined ? { lastAction: actor.lastAction } : {}) },
      suggestions: context.suggestions.map((s) => ({ ...s })),
      scarcity,
    };
    for (const offer of [...context.offers].sort((a, b) => cmpStr(a.id, b.id))) {
      const result = consider(actor, offer as Offer, ctx);
      for (const [i, term] of result.terms.entries()) {
        const cause = context.causes[0] ?? `decision:${context.person}:${actor.nextDecision}`;
        effects.push({
          id: `${cause}:term:${offer.id}:${i}`,
          cause,
          person: context.person,
          at: context.at,
          applyPhase: context.phase,
          from: termFaculty(term.source),
          to: 'will',
          offerId: offer.id,
          term: term as Term,
        });
      }
    }
    return { terms: effects, noticed };
  },
};
function termFaculty(source: string): import('../run-schema.ts').FacultyId {
  const prefix = source.split(':')[0];
  if (prefix === 'norm' || prefix === 'conscience') return 'conscience';
  if (prefix === 'goal' || prefix === 'abstain' || prefix === 'commitment') return 'agenda';
  if (prefix === 'need' || prefix === 'full') return 'needs';
  if (prefix === 'habit') return 'habits';
  if (prefix === 'curiosity') return 'curiosity';
  if (prefix === 'pursuit') return 'persistence';
  if (prefix === 'method') return 'methods';
  if (prefix === 'emotion' || prefix === 'avoid') return 'affect';
  if (prefix === 'suggestion' || prefix === 'precommit' || prefix === 'autonomy') return 'will';
  if (prefix === 'social' || prefix === 'regard' || prefix === 'together' || prefix === 'companion')
    return 'social';
  if (prefix === 'memory' || prefix === 'expectation') return 'memory';
  if (prefix === 'partner') return 'partnering';
  if (prefix === 'forecast' || prefix === 'prospection') return 'prospection';
  if (prefix === 'promptings') return 'promptings';
  if (prefix === 'review') return 'review';
  return 'cognition';
}
