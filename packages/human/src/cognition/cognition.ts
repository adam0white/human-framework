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
 */
import { inBreak } from '../affect/index.ts';
import { agendaTerms } from '../agenda/index.ts';
import { trustOf } from '../beliefs/index.ts';
import { normTerms } from '../conscience/index.ts';
import { clamp01, minuteOfDay, round } from '../core/index.ts';
import { type HabitContext, habitEase, habitPull } from '../habits/index.ts';
import { expectedEffect } from '../memory/index.ts';
import { socialTerms } from '../social/index.ts';
import type {
  Affordance,
  BodyReadout,
  Command,
  Considered,
  DecisionRecord,
  LifeModifiers,
  Minute,
  NeedId,
  NeedReading,
  Person,
  Suggestion,
  Term,
  Unit,
  ValueId,
} from '../types.ts';
import { PHYSIOLOGICAL_NEEDS } from '../types.ts';
import {
  adviceWeight,
  type CommandOutcome,
  resolveChoice,
  safeUtility,
  standingAdvice,
  voicesIn,
  type WillContext,
} from '../will/index.ts';

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
  // --- lane will+cognition ---
  /** Multiplier on standing advice terms relative to a live suggestion of the same strength (N9). */
  rememberedScale: 1,
  /**
   * Scarcity (N13): with host scarcity s in 0..1 the material term's saturation scale shrinks to
   * materialScale × (1 - scarcityScaleShrink × s), so a small sum stops looking negligible; the term is also
   * multiplied by 1 + scarcityMaterialGain × s (default 0: review 2026-10-03 measured the two mechanisms together
   * making money outweigh commitments, norms and every voice, mean 1.20 / max 2.25 over 40 town days, so only the
   * scale shrink is on and the term stays under its scarcity-free ceiling 2 × materialWeight). The `need:safety`
   * term is multiplied by 1 + scarcitySafetyGain × s. Engineering defaults.
   */
  scarcityMaterialGain: 0,
  scarcityScaleShrink: 0.5,
  scarcitySafetyGain: 0.5,
};

export interface ConsiderContext {
  now: Minute;
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
}

const urgencyOf = (needs: NeedReading[], id: NeedId): number => needs.find((n) => n.id === id)?.urgency ?? 0;

const emotionSum = (p: Person, id: string): number => {
  let s = 0;
  for (const e of p.affect.emotions) if (e.id === id) s += e.intensity;
  return clamp01(s);
};

const VALUE_IDS: readonly ValueId[] = [
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
];

function voiceTrust(p: Person, voiceId: string): number {
  return p.will.voices.find((v) => v.voiceId === voiceId)?.trust ?? 0.5;
}

/**
 * 'open' when a commitment tracking this norm has an open window, 'discharged' when commitments track it but
 * none is open, 'untracked' when no commitment tracks it.
 */
function dutyTracking(p: Person, normId: string, now: Minute): 'open' | 'discharged' | 'untracked' {
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
function sinceFactor(p: Person, action: string, now: Minute): number {
  const K = COGNITION_DEFAULTS;
  const log = p.conscience.intentions;
  for (let i = log.length - 1; i >= 0; i--) {
    const it = log[i];
    // Missed duties are logged with intention 'missed' (see person.ts recordMissed); they satisfy nothing.
    if (it?.action !== action || it.intention === 'missed') continue;
    const since = Math.max(0, now - it.at);
    return K.normRefractoryFloor + (1 - K.normRefractoryFloor) * clamp01(since / K.normRefractoryMinutes);
  }
  return 1;
}

/** Whether a suggestion points at this option. */
export function suggestionTargets(s: Suggestion | undefined, aff: Affordance): boolean {
  if (!s) return false;
  if (s.affordanceId !== undefined) return s.affordanceId === aff.id;
  return s.action !== undefined && s.action === aff.action;
}

/**
 * Standing advice terms for one option: per source, the strongest matching entry's weight × trust in the source
 * (the voice relation when there is one, else belief source trust) × suggestionScale × rememberedScale.
 * Sources speaking now about this option are skipped. Sorted by source for stable traces.
 */
export function rememberedTerms(
  p: Person,
  aff: Affordance,
  now: Minute,
  speaking: readonly Suggestion[] = [],
): Term[] {
  const K = COGNITION_DEFAULTS;
  if (!p.will.advice || p.will.advice.length === 0) return [];
  const best = new Map<string, number>();
  for (const a of standingAdvice(p, now)) {
    const hits = a.affordanceId !== undefined ? a.affordanceId === aff.id : a.action === aff.action;
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

function appealMatch(p: Person, s: Suggestion, needs: NeedReading[]): number {
  if (!s.appeal) return 0;
  if (s.appeal === 'duty') return clamp01(0.5 * p.values.conformity + 0.5 * p.values.tradition);
  if ((VALUE_IDS as readonly string[]).includes(s.appeal)) return clamp01(p.values[s.appeal as ValueId]);
  return urgencyOf(needs, s.appeal as NeedId);
}

/** Per-decision social inputs shared by every option (`decide` computes them once). */
export interface SocialContext {
  belongingUrgency: number;
  tendencies: Record<string, number>;
  /** Multiplier on positive social pulls: floor + (1 - floor) × (1 - belonging level). */
  satiation: number;
}

export function socialContext(ctx: ConsiderContext): SocialContext {
  const K = COGNITION_DEFAULTS;
  const tendencies: Record<string, number> = {};
  for (const [k, v] of Object.entries(ctx.tendencies)) tendencies[k] = v * K.emotionScale;
  const belongingLevel = ctx.needs.find((n) => n.id === 'belonging')?.level ?? 0.5;
  return {
    belongingUrgency: urgencyOf(ctx.needs, 'belonging'),
    tendencies,
    satiation: K.socialSatiationFloor + (1 - K.socialSatiationFloor) * (1 - clamp01(belongingLevel)),
  };
}

/** Score one option. Pure apart from reads; terms are rounded for stable snapshots. */
export function consider(p: Person, aff: Affordance, ctx: ConsiderContext): Considered {
  const K = COGNITION_DEFAULTS;
  const scarcity = clamp01(Number.isFinite(ctx.scarcity) ? (ctx.scarcity as number) : 0);
  const terms: Term[] = [];
  const push = (source: string, value: number) => {
    const v = round(value);
    // A non-finite term (bad host number) is dropped; the will vetoes the offer as invalid.
    if (v !== 0 && Number.isFinite(v)) terms.push({ source, value: v });
  };

  // Needs: urgency × believed gain × believed success.
  const expected = expectedEffect(p, aff);
  for (const id of Object.keys(expected.needs) as NeedId[]) {
    const gain = expected.needs[id] ?? 0;
    if (gain === 0) continue;
    const u = urgencyOf(ctx.needs, id);
    const success = gain > 0 ? expected.successRate : 1;
    const scarce = id === 'safety' ? 1 + K.scarcitySafetyGain * scarcity : 1;
    push(`need:${id}`, K.needScale * u * gain * success * scarce);
  }
  if (expected.samples > 0) {
    let relevance = 1;
    if (expected.valence > 0) {
      let served = -1;
      for (const id of Object.keys(expected.needs) as NeedId[])
        if ((expected.needs[id] ?? 0) > 0) served = Math.max(served, urgencyOf(ctx.needs, id));
      if (served >= 0) relevance = served;
    }
    push('expectation', K.expectationScale * expected.valence * expected.confidence * relevance);
  }

  // Norms, commitments and goals. Planning terms scale with developmental maturity.
  let refractoryCache: number | undefined;
  const refractory = (): number => {
    refractoryCache ??= sinceFactor(p, aff.action, ctx.now);
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
  for (const t of agendaTerms(p, aff, ctx.now)) push(t.source, t.value * (0.5 + 0.5 * maturity));

  // Habit: cue-matched automaticity (cued by the option's own place), stronger before planning matures.
  const habit =
    p.habits.length === 0
      ? 0
      : habitPull(p, aff, { ...ctx.habit, placeId: aff.placeId ?? ctx.habit.placeId });
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
  if (aff.placeId !== undefined) {
    const avoid = ctx.tendencies[`avoid:${aff.placeId}`];
    if (avoid !== undefined && avoid > 0) push(`avoid:${aff.placeId}`, -K.emotionScale * avoid);
  }

  // Social pulls. Per-person emotion tendencies enter at the same scale as tag tendencies.
  for (const t of socialTerms(p, aff, social))
    push(t.source, K.socialScale * (t.value > 0 ? social.satiation * refractory() : 1) * t.value);
  // Joint offers: whether I trust the partners to do their share.
  if (tags.includes('joint')) {
    for (const id of [...(aff.with ?? [])].sort()) {
      if (id === p.id) continue;
      const trust = p.social.relationships.find((r) => r.otherId === id)?.trust ?? 0.5;
      push(`joint:${id}`, K.jointTrust * (trust - 0.5));
    }
  }

  // Promise inertia for the running activity (begin with { promise }).
  const act = p.activity;
  if (act?.commitmentId !== undefined && act.affordanceId === aff.id) {
    const c = p.agenda.commitments.find((x) => x.id === act.commitmentId);
    if (c?.status === 'pending') {
      const fade = clamp01((ctx.desperation - K.commitmentInertiaFrom) / K.commitmentInertiaFade);
      push('commitment', K.commitmentInertia * c.importance * (1 - fade));
    }
  }

  // Effort and mental load, read from the perceived body.
  const per = ctx.body.perceived;
  const effort = clamp01(aff.effort);
  const focus = clamp01(aff.focus ?? 0);
  // A cued habit eases initiation and attention (N4: the depleted fall back on habits), not physical exertion.
  const ease =
    p.habits.length === 0
      ? 1
      : habitEase(p, aff, { ...ctx.habit, placeId: aff.placeId ?? ctx.habit.placeId });
  const effortCost =
    (effort * K.effortBase + focus * per.sleepiness) * ease +
    effort * per.fatigue * (1 - clamp01(p.body.fitness));
  if (effortCost > 0) push('effort', -K.effortScale * effortCost);

  // Risk: chance × severity × (fear + emotionality).
  if (aff.risk && aff.risk.chance > 0 && aff.risk.severity > 0) {
    const fear = emotionSum(p, 'fear');
    push('risk', -K.riskScale * aff.risk.chance * aff.risk.severity * (fear + p.traits.emotionality));
  }

  // Material: saturating value of host units, scaled by security/achievement/power.
  if (aff.material) {
    const v = p.values;
    const weight = (v.security + v.achievement + v.power) / 3;
    const scale = K.materialScale * (1 - K.scarcityScaleShrink * scarcity);
    const sat = Math.sign(aff.material) * (1 - Math.exp(-Math.abs(aff.material) / scale));
    push('material', K.materialWeight * sat * 2 * weight * (1 + K.scarcityMaterialGain * scarcity));
  }

  // Precommitments inside their daily window.
  const mod = minuteOfDay(ctx.now);
  for (const pc of p.will.precommitments) {
    if (pc.action !== aff.action) continue;
    const inside =
      pc.fromMinuteOfDay <= pc.toMinuteOfDay
        ? mod >= pc.fromMinuteOfDay && mod < pc.toMinuteOfDay
        : mod >= pc.fromMinuteOfDay || mod < pc.toMinuteOfDay;
    if (inside) push(`precommit:${pc.id}`, pc.bias);
  }

  // Suggestions: strength × voice trust × appeal match, one term per voice. Never bypasses vetoes (will enforces).
  // During a mental break no voice reaches him (crisis SCOPE): no live or remembered suggestion terms.
  const voices = inBreak(p) ? [] : voicesIn(ctx.suggestion, ctx.suggestions);
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
  if (!inBreak(p)) for (const t of rememberedTerms(p, aff, ctx.now, voices)) push(t.source, t.value);

  let utility = 0;
  for (const t of terms) utility += t.value;
  const out: Considered = {
    affordanceId: aff.id,
    action: aff.action,
    label: aff.label,
    utility: round(utility),
    terms,
    advertised: { ...aff.advertises },
    believed: expected.needs,
  };
  if (expected.recalled.length > 0) out.recalled = expected.recalled;
  return out;
}

export interface DecideContext extends ConsiderContext {
  /** Decision id assigned by the composite. */
  id: string;
  /** Hosts can disable the necessity exception. */
  necessity?: boolean;
  /** A review of a running activity: if it continues, the suggestion verdict moves no voice counters. */
  quiet?: boolean;
  /** A host command in force (1.6.0); passed to the will. */
  command?: Command;
}

export interface Decision {
  record: DecisionRecord;
  /** Need deltas the composite must apply (will does not write `p.needs`). */
  needDeltas: Partial<Record<'autonomy', number>>;
  /** How a command in force fared (absent when none). */
  command?: CommandOutcome;
}

/** Highest physiological urgency: the input to the necessity exception. */
export function desperationOf(needs: NeedReading[]): number {
  let d = 0;
  for (const n of needs)
    if ((PHYSIOLOGICAL_NEEDS as readonly string[]).includes(n.id)) d = Math.max(d, n.urgency);
  return d;
}

/** Score every affordance in stable id order without resolving; pure apart from reads. */
export function scoreAll(
  p: Person,
  affordances: readonly Affordance[],
  ctx: DecideContext,
): { sorted: Affordance[]; considered: Considered[]; willCtx: WillContext } {
  const sorted = [...affordances].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const shared: DecideContext = { ...ctx, social: ctx.social ?? socialContext(ctx) };
  const considered = sorted.map((aff) => consider(p, aff, shared));
  const willCtx: WillContext = {
    now: ctx.now,
    affordances: sorted,
    body: ctx.body,
    desperation: ctx.desperation,
    necessity: ctx.necessity ?? true,
    needs: ctx.needs,
  };
  if (ctx.command) willCtx.command = ctx.command;
  return { sorted, considered, willCtx };
}

/**
 * Score every affordance (stable id order), resolve vetoes, selection and the suggestion verdict through
 * `will`. Narration and intention are filled in by the composite.
 */
export function decide(p: Person, affordances: readonly Affordance[], ctx: DecideContext): Decision {
  const { sorted, considered, willCtx } = scoreAll(p, affordances, ctx);
  const voices = voicesIn(ctx.suggestion, ctx.suggestions);
  const res = resolveChoice(p, considered, willCtx, voices, { quiet: ctx.quiet ?? false });
  const chosen = res.chosenAffordanceId === null ? null : sorted.find((a) => a.id === res.chosenAffordanceId);
  // Live options first by utility, then vetoed ones, ties by id.
  const ranked = [...res.considered].sort(
    (a, b) =>
      Number(a.vetoed !== undefined) - Number(b.vetoed !== undefined) ||
      safeUtility(b.utility) - safeUtility(a.utility) ||
      (a.affordanceId < b.affordanceId ? -1 : 1),
  );
  const record: DecisionRecord = {
    id: ctx.id,
    at: ctx.now,
    chosenAffordanceId: chosen?.id ?? null,
    chosenAction: chosen?.action ?? null,
    considered: ranked.slice(0, COGNITION_DEFAULTS.maxConsidered),
    intention: '',
    narration: '',
  };
  if (res.suggestion) record.suggestion = res.suggestion;
  if (res.suggestions && (res.suggestions.length > 1 || ctx.suggestions !== undefined))
    record.suggestions = res.suggestions;
  const needDeltas: Decision['needDeltas'] = {};
  if (res.autonomyDelta !== 0) needDeltas.autonomy = res.autonomyDelta;
  const out: Decision = { record, needDeltas };
  if (res.command) out.command = res.command;
  return out;
}
