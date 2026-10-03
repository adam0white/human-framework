/**
 * SCOPE: assent. Given scored options, the will applies hard vetoes (capacity: dead, asleep, effort beyond
 * capacity, skill far below difficulty; conscience: firmly held prohibitions, with the necessity exception
 * delegated to `conscience.normVeto`), then selects by argmax with hysteresis (the current activity keeps a
 * decaying inertia bonus of up to `switchMargin`) or, when `temperature > 0`, by softmax sampled from the
 * person's own RNG. A suggestion from an outside voice resolves to a typed verdict so that a refusal never
 * reads as a bug: assented, complied (only after insisting on a "not now"), deferred with a counter-offer,
 * modified (a near alternative serving the same aim), or refused as cannot / willNot (including distrust
 * of a voice that has pushed hard and earned little trust). Insisting never overrides a pressing bodily need
 * (refused/cannot with the need as reason), and `cannot` refusals move no voice counters. `predictResponse` gives the same verdict without
 * writing anything or consuming RNG. Trust in a voice is learned from how followed advice felt, with harm
 * costing more than benefit earns (trust asymmetry); pressure from being pushed decays over hours. No
 * willpower reservoir is modelled (rejected in research/empirical-models.md §6): acting against impulse
 * emerges from competing terms, fatigue cost, habits and precommitments. Autonomy loss from compliance is
 * returned as a delta for the composite to apply; this module writes only `p.will`.
 */

import { commitmentPressure } from '../agenda/index.ts';
import { normVeto } from '../conscience/index.ts';
import { clamp01, decay, random } from '../core/index.ts';
import { skillLevel } from '../skills/index.ts';
import type {
  Affordance,
  BodyReadout,
  Considered,
  EntityId,
  Minute,
  Person,
  RefusalKind,
  Signed,
  Suggestion,
  SuggestionResolution,
  SuggestionVerdict,
  VoiceRelation,
  WillState,
} from '../types.ts';
import { MINUTES_PER_HOUR } from '../types.ts';

export const WILL_DEFAULTS = {
  switchMargin: 0.15,
  temperature: 0,
  maxVoices: 16,
  defaultVoiceTrust: 0.5,
  /** An option is beyond capacity when effort exceeds capacity × this ratio. */
  effortCapacityRatio: 1.5,
  /** Skill veto when difficulty exceeds the level by more than this. */
  skillGap: 0.5,
  /** Desperation at which a sleeper wakes for an awake action. */
  wakeDesperation: 0.7,
  /** Distrust refusal: trust below this and pressure above `distrustPressure`. */
  distrustTrust: 0.25,
  distrustPressure: 0.6,
  /** Autonomy need lost when complying under insistence (scaled by how far the option trailed). */
  complyAutonomyCost: 0.2,
  /** Pressure added when a voice pushes against preference (more when insisting). */
  pressurePush: 0.15,
  pressureInsist: 0.3,
  pressureHalfLife: 4 * MINUTES_PER_HOUR,
  /** Trust learning: gain toward 1 on a good outcome, loss toward 0 on a bad one. */
  trustGain: 0.1,
  trustLoss: 0.25,
  /** Share of a tie's inertia bonus that remains when the activity is about to end. */
  inertiaFloor: 0.5,
  /**
   * Insisting cannot override survival: at this desperation (same scale as conscience's necessity threshold),
   * or when the person's own choice is driven by a bodily need at `survivalNeedUrgency`, the verdict is
   * `refused/cannot` with the need as reason ("I have to drink first").
   */
  survivalDesperation: 0.75,
  survivalNeedUrgency: 0.5,
  /** A sleep option is unavailable while awake and perceived sleepiness is below this. */
  sleepinessFloor: 0.3,
  /** A sleeper also wakes for an option that serves a pending commitment at this time pressure or more. */
  wakeCommitmentPressure: 0.9,
};

export interface WillContext {
  now: Minute;
  affordances: readonly Affordance[];
  body: BodyReadout;
  /** Max physiological urgency. */
  desperation: number;
  /** Hosts can turn the necessity exception off. */
  necessity?: boolean;
  /** Need urgencies (optional; used for the survival check on insisting). */
  needs?: readonly { id: string; urgency: number }[];
}

export interface ChoiceResolution {
  chosenAffordanceId: string | null;
  /** The input list with `vetoed` filled in (same order). */
  considered: Considered[];
  suggestion?: SuggestionResolution;
  /** Autonomy need delta for the composite to apply (≤ 0). */
  autonomyDelta: number;
}

export function createWill(voices: { voiceId: EntityId; trust?: number }[] = []): WillState {
  return {
    voices: voices.slice(0, WILL_DEFAULTS.maxVoices).map((v) => ({
      voiceId: v.voiceId,
      trust: clamp01(v.trust ?? WILL_DEFAULTS.defaultVoiceTrust),
      pressure: 0,
      accepted: 0,
      refused: 0,
    })),
    precommitments: [],
    switchMargin: WILL_DEFAULTS.switchMargin,
    temperature: WILL_DEFAULTS.temperature,
  };
}

export function voiceOf(p: Person, voiceId: EntityId): VoiceRelation | undefined {
  return p.will.voices.find((v) => v.voiceId === voiceId);
}

function ensureVoice(p: Person, voiceId: EntityId): VoiceRelation {
  const existing = voiceOf(p, voiceId);
  if (existing) return existing;
  const v: VoiceRelation = {
    voiceId,
    trust: WILL_DEFAULTS.defaultVoiceTrust,
    pressure: 0,
    accepted: 0,
    refused: 0,
  };
  if (p.will.voices.length >= WILL_DEFAULTS.maxVoices) {
    // Drop the voice with the fewest interactions.
    let idx = 0;
    for (let i = 1; i < p.will.voices.length; i++) {
      const a = p.will.voices[i] as VoiceRelation;
      const b = p.will.voices[idx] as VoiceRelation;
      if (a.accepted + a.refused < b.accepted + b.refused) idx = i;
    }
    p.will.voices.splice(idx, 1);
  }
  p.will.voices.push(v);
  return v;
}

const finite = (x: number | undefined): boolean => x === undefined || Number.isFinite(x);

/** Host numbers the framework computes with must be finite; a NaN offer is vetoed, never chosen. */
function wellFormed(aff: Affordance): boolean {
  if (!Number.isFinite(aff.effort) || !Number.isFinite(aff.duration) || !finite(aff.focus)) return false;
  if (!finite(aff.material)) return false;
  for (const v of Object.values(aff.advertises)) if (!finite(v)) return false;
  if (aff.risk && (!Number.isFinite(aff.risk.chance) || !Number.isFinite(aff.risk.severity))) return false;
  return true;
}

/** Whether `aff` serves a pending commitment whose window is about to close (pressure ≥ wake level). */
function pressingCommitment(p: Person, aff: Affordance, now: Minute): boolean {
  for (const c of p.agenda.commitments) {
    if (c.status !== 'pending') continue;
    const matches =
      (aff.fulfills?.includes(c.id) ?? false) ||
      (c.actions.includes(aff.action) && (c.targetId === undefined || c.targetId === aff.targetId));
    if (matches && commitmentPressure(c, now) >= WILL_DEFAULTS.wakeCommitmentPressure) return true;
  }
  return false;
}

/** Capacity and conscience vetoes for one option. */
export function vetoFor(
  p: Person,
  aff: Affordance,
  ctx: WillContext,
): { kind: 'cannot' | 'willNot'; reason: string } | undefined {
  const W = WILL_DEFAULTS;
  if (!p.body.alive) return { kind: 'cannot', reason: 'dead' };
  if (!wellFormed(aff)) return { kind: 'cannot', reason: 'invalid' };
  const mode = aff.mode ?? 'awake';
  if (
    p.body.asleep &&
    mode === 'awake' &&
    ctx.desperation < W.wakeDesperation &&
    !pressingCommitment(p, aff, ctx.now)
  )
    return { kind: 'cannot', reason: 'asleep' };
  if (mode === 'sleep' && !p.body.asleep && ctx.body.perceived.sleepiness < W.sleepinessFloor)
    return { kind: 'cannot', reason: 'not-sleepy' };
  if (mode === 'awake' && clamp01(aff.effort) > ctx.body.capacity * W.effortCapacityRatio)
    return { kind: 'cannot', reason: 'capacity' };
  if (aff.skill && clamp01(aff.skill.difficulty) - skillLevel(p, aff.skill.id) > W.skillGap)
    return { kind: 'cannot', reason: `skill:${aff.skill.id}` };
  const norm = normVeto(p, aff, ctx.desperation, { necessity: ctx.necessity ?? true });
  if (norm) return norm;
  return undefined;
}

const targets = (s: Suggestion, aff: Affordance): boolean =>
  s.affordanceId !== undefined
    ? s.affordanceId === aff.id
    : s.action !== undefined && s.action === aff.action;

/** NaN-safe utility: a non-finite score never wins. */
export const safeUtility = (u: number): number => (Number.isNaN(u) ? Number.NEGATIVE_INFINITY : u);

const byUtilityThenId = (a: Considered, b: Considered): number =>
  safeUtility(b.utility) - safeUtility(a.utility) ||
  (a.affordanceId < b.affordanceId ? -1 : a.affordanceId > b.affordanceId ? 1 : 0);

/** Dominant positive term of an option, or 'preference'. */
export function dominantTerm(c: Considered | undefined): string {
  if (!c) return 'preference';
  let best: { source: string; value: number } | undefined;
  for (const t of c.terms) if (t.value > 0 && (!best || t.value > best.value)) best = t;
  return best?.source ?? 'preference';
}

/** Largest advertised positive need of an option (the aim a near alternative may share). */
function mainAim(aff: Affordance | undefined): string | undefined {
  if (!aff) return undefined;
  let best: { id: string; v: number } | undefined;
  for (const [id, v] of Object.entries(aff.advertises)) {
    if (v !== undefined && v > 0 && (!best || v > best.v)) best = { id, v };
  }
  return best?.id;
}

const BODILY_TERMS = ['need:food', 'need:water', 'need:sleep', 'need:rest'];

/** The bodily need that overrides an insisted request, if any. */
function survivalReason(winnerTerm: string, ctx: WillContext): string | undefined {
  const W = WILL_DEFAULTS;
  if (BODILY_TERMS.includes(winnerTerm)) {
    const urgency = ctx.needs?.find((n) => `need:${n.id}` === winnerTerm)?.urgency ?? ctx.desperation;
    if (urgency >= W.survivalNeedUrgency || ctx.desperation >= W.survivalDesperation) return winnerTerm;
  }
  if (ctx.desperation >= W.survivalDesperation) {
    let top: { id: string; urgency: number } | undefined;
    for (const n of ctx.needs ?? [])
      if (BODILY_TERMS.includes(`need:${n.id}`) && (!top || n.urgency > top.urgency)) top = n;
    return top ? `need:${top.id}` : 'need:survival';
  }
  return undefined;
}

interface Evaluation {
  chosenId: string | null;
  considered: Considered[];
  suggestion?: SuggestionResolution;
  autonomyDelta: number;
  /** Will-owned side effects to apply on resolve (not on predict). */
  voice?: { id: EntityId; pressure: number; accepted: number; refused: number };
}

/**
 * Shared verdict logic. `draw` is a uniform sample for softmax (undefined = argmax); `predictResponse`
 * always passes undefined so no RNG is consumed.
 */
function evaluate(
  p: Person,
  input: readonly Considered[],
  ctx: WillContext,
  suggestion: Suggestion | undefined,
  draw: number | undefined,
): Evaluation {
  const W = WILL_DEFAULTS;
  const affById = new Map(ctx.affordances.map((a) => [a.id, a]));
  const considered: Considered[] = input.map((c) => {
    const aff = affById.get(c.affordanceId);
    const out: Considered = { ...c, terms: [...c.terms] };
    delete out.vetoed;
    const veto = aff ? vetoFor(p, aff, ctx) : { kind: 'cannot' as const, reason: 'unavailable' };
    if (veto) out.vetoed = veto;
    return out;
  });

  // Selection: inertia for the current activity, then argmax or softmax.
  const live = considered.filter((c) => !c.vetoed);
  const current = p.activity;
  const score = (c: Considered): number => {
    if (!current || c.affordanceId !== current.affordanceId) return safeUtility(c.utility);
    const span = Math.max(1, current.endsAt - current.startedAt);
    const remaining = clamp01((current.endsAt - ctx.now) / span);
    return c.utility + p.will.switchMargin * (W.inertiaFloor + (1 - W.inertiaFloor) * remaining);
  };
  const ranked = [...live].sort((a, b) => score(b) - score(a) || byUtilityThenId(a, b));
  let winner = ranked[0];
  if (winner && p.will.temperature > 0 && draw !== undefined && ranked.length > 1) {
    const top = score(winner);
    const weights = ranked.map((c) => Math.exp((score(c) - top) / p.will.temperature));
    let total = 0;
    for (const w of weights) total += w;
    let r = draw * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i] ?? 0;
      if (r < 0) {
        winner = ranked[i];
        break;
      }
    }
  }
  const ev: Evaluation = { chosenId: winner?.affordanceId ?? null, considered, autonomyDelta: 0 };
  if (!suggestion) return ev;
  let likelihood: number | undefined;
  if (winner && p.will.temperature > 0) {
    const top = score(winner);
    let total = 0;
    let hit = 0;
    for (const c of ranked) {
      const wgt = Math.exp((score(c) - top) / p.will.temperature);
      total += wgt;
      const aff = affById.get(c.affordanceId);
      if (aff && targets(suggestion, aff)) hit += wgt;
    }
    likelihood = total > 0 ? hit / total : 0;
  }

  // Suggestion verdict.
  const suggested = considered.filter((c) => {
    const aff = affById.get(c.affordanceId);
    return aff !== undefined && targets(suggestion, aff);
  });
  const voice = voiceOf(p, suggestion.voiceId);
  const trust = voice?.trust ?? W.defaultVoiceTrust;
  const pressure = voice?.pressure ?? 0;
  const side = { id: suggestion.voiceId, pressure: 0, accepted: 0, refused: 0 };
  ev.voice = side;
  const resolution = (
    verdict: SuggestionVerdict,
    reason: string,
    extra: Partial<SuggestionResolution> & { kind?: RefusalKind } = {},
  ): SuggestionResolution => ({
    voiceId: suggestion.voiceId,
    verdict,
    reason,
    says: '',
    ...extra,
    ...(likelihood !== undefined ? { likelihood } : {}),
  });

  // `cannot` refusals are facts about the situation, not resistance to the voice: they move no counters.
  if (suggested.length === 0) {
    ev.suggestion = resolution('refused', 'unavailable', { kind: 'cannot' });
    return ev;
  }
  const liveSuggested = suggested.filter((c) => !c.vetoed).sort(byUtilityThenId);
  const bestSuggested = liveSuggested[0];
  if (!bestSuggested) {
    // Every suggested option is vetoed: report the first veto (willNot outranks cannot).
    const vetoes = suggested.map((c) => c.vetoed).filter((v) => v !== undefined);
    const v = vetoes.find((x) => x.kind === 'willNot') ?? vetoes[0];
    if (v?.kind === 'willNot') side.refused = 1;
    ev.suggestion = resolution('refused', v?.reason ?? 'cannot', { kind: v?.kind ?? 'cannot' });
    return ev;
  }
  if (winner && suggested.some((c) => c.affordanceId === winner?.affordanceId)) {
    side.accepted = 1;
    ev.suggestion = resolution('assented', dominantTerm(winner));
    return ev;
  }
  // The suggestion lost to the person's own preference.
  if (trust < W.distrustTrust && pressure > W.distrustPressure) {
    side.refused = 1;
    ev.suggestion = resolution('refused', 'distrust', { kind: 'willNot' });
    return ev;
  }
  const winnerAff = winner ? affById.get(winner.affordanceId) : undefined;
  const suggestedAff = affById.get(bestSuggested.affordanceId);
  const reason = dominantTerm(winner);
  if (suggestion.insist) {
    // Survival first: insisting cannot make a person ignore a pressing bodily need.
    const survival = survivalReason(reason, ctx);
    if (survival) {
      ev.suggestion = resolution('refused', survival, {
        kind: 'cannot',
        insteadAffordanceId: winner?.affordanceId,
      });
      return ev;
    }
    const gap = Math.max(0, (winner ? score(winner) : 0) - bestSuggested.utility);
    ev.chosenId = bestSuggested.affordanceId;
    ev.autonomyDelta = -W.complyAutonomyCost * clamp01(0.5 + gap);
    side.pressure = W.pressureInsist;
    side.accepted = 1;
    ev.suggestion = resolution('complied', reason, {
      kind: 'notNow',
      insteadAffordanceId: winner?.affordanceId,
    });
    return ev;
  }
  side.pressure = W.pressurePush * clamp01(suggestion.strength);
  side.refused = 1;
  const near =
    winnerAff !== undefined &&
    suggestedAff !== undefined &&
    (winnerAff.action === suggestedAff.action ||
      (mainAim(suggestedAff) !== undefined && mainAim(suggestedAff) === mainAim(winnerAff)));
  if (near && winnerAff) {
    ev.suggestion = resolution('modified', reason, {
      kind: 'notNow',
      insteadAffordanceId: winnerAff.id,
      counterOffer: { affordanceId: winnerAff.id, label: winnerAff.label },
    });
    return ev;
  }
  ev.suggestion = resolution('deferred', reason, {
    kind: 'notNow',
    insteadAffordanceId: winnerAff?.id,
    counterOffer: winnerAff
      ? { affordanceId: bestSuggested.affordanceId, label: `after I ${winnerAff.label}` }
      : { affordanceId: bestSuggested.affordanceId, label: 'later' },
  });
  return ev;
}

/**
 * Resolve a choice. Writes voice pressure and counters (will-owned) unless `quiet` (a review that keeps the running
 * activity), and consumes RNG only when `temperature > 0`. The autonomy delta is returned for the composite.
 */
export function resolveChoice(
  p: Person,
  considered: readonly Considered[],
  ctx: WillContext,
  suggestion?: Suggestion,
  opts: { quiet?: boolean } = {},
): ChoiceResolution {
  const draw = p.will.temperature > 0 ? random(p.rng) : undefined;
  const ev = evaluate(p, considered, ctx, suggestion, draw);
  if (opts.quiet && (ev.chosenId === null || ev.chosenId === p.activity?.affordanceId)) {
    // A review that continues the running activity re-weighs a standing request: same verdict, but no
    // counters, pressure or autonomy cost. A review that switches activity is a new choice and counts.
    delete ev.voice;
    ev.autonomyDelta = 0;
  }
  if (ev.voice) {
    const v = ensureVoice(p, ev.voice.id);
    v.pressure = clamp01(v.pressure + ev.voice.pressure);
    v.accepted += ev.voice.accepted;
    v.refused += ev.voice.refused;
  }
  const out: ChoiceResolution = {
    chosenAffordanceId: ev.chosenId,
    considered: ev.considered,
    autonomyDelta: ev.autonomyDelta,
  };
  if (ev.suggestion) out.suggestion = ev.suggestion;
  return out;
}

/**
 * The verdict a suggestion would get now, without writing state or consuming RNG (for UI telegraphing).
 * With `temperature > 0` the verdict is the argmax outcome and `likelihood` gives the chance the suggested
 * option is actually drawn; the composite `predict` in person.ts builds the context for hosts.
 */
export function predictResponse(
  p: Person,
  considered: readonly Considered[],
  ctx: WillContext,
  suggestion: Suggestion,
): SuggestionResolution {
  const ev = evaluate(p, considered, ctx, suggestion, undefined);
  return (
    ev.suggestion ?? { voiceId: suggestion.voiceId, verdict: 'refused', reason: 'unavailable', says: '' }
  );
}

/**
 * After a suggested activity finished: how it felt updates trust in the voice. Harm from followed advice
 * costs more than benefit earns. Only assented/complied resolutions carry information about the advice.
 */
export function learnFromVoice(p: Person, resolution: SuggestionResolution, felt: Signed): void {
  if (resolution.verdict !== 'assented' && resolution.verdict !== 'complied') return;
  const W = WILL_DEFAULTS;
  const v = ensureVoice(p, resolution.voiceId);
  const f = Math.max(-1, Math.min(1, felt));
  // A coerced activity that went well earns no trust: the person did not choose to follow the advice.
  if (f > 0 && resolution.verdict !== 'complied')
    v.trust = clamp01(v.trust + W.trustGain * f * (1 - v.trust));
  else if (f < 0) v.trust = clamp01(v.trust + W.trustLoss * f * v.trust);
}

/** Voice pressure decays over hours. Exact for any dt. */
export function advanceWill(p: Person, dt: number): void {
  if (dt <= 0) return;
  for (const v of p.will.voices) v.pressure = decay(v.pressure, dt, WILL_DEFAULTS.pressureHalfLife);
}
