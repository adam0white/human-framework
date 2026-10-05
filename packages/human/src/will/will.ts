/**
 * SCOPE: assent. Given scored options, the will applies hard vetoes (capacity: dead, asleep, effort beyond
 * capacity, skill far below difficulty; conscience: firmly held prohibitions, with the necessity exception
 * delegated to `conscience.normVeto`), then selects by argmax with hysteresis (the current activity keeps a
 * decaying inertia bonus of up to `switchMargin`) or, when `temperature > 0`, by softmax sampled from the
 * person's own RNG. A suggestion from an outside voice resolves to a typed verdict so that a refusal never
 * reads as a bug: assented, complied (only after insisting on a "not now"), deferred with a counter-offer,
 * modified (a near alternative serving the same aim), or refused as cannot / willNot (including distrust
 * of a voice that has pushed hard and earned little trust, or whose advice recently hurt the person at the same
 * action). An omission rule protects a closing obligatory duty: options that would make a firmly convinced
 * person miss it are blocked while the duty can still be met (obligation follows capacity, Qur'an 2:286, so the
 * block lifts when no fulfilling option is available or a bodily need is extreme). The duty stays protected past the window's end
 * while a prayer begun inside it is under way, and an activity that would cover the closing stretch is reviewed when
 * it begins (`dutyReviewAt`, 1.9.0). Insisting never overrides a pressing bodily need
 * (refused/cannot with the need as reason), and `cannot` refusals move no voice counters. `predictResponse` gives the same verdict without
 * writing anything or consuming RNG. Trust in a voice is learned from how followed advice felt, with harm
 * costing more than benefit earns (trust asymmetry); an insisted suggestion earns no trust when it goes well, and
 * insisting while the voice's pressure is already high costs trust outright ('pushed'), so a voice that insists at
 * every turn ends in distrust refusals (engineering default); pressure from being pushed decays over hours. Asking
 * again, without insisting, for something they decline while pressure is high wears trust a little ('worn', at most
 * once per `wornInterval`), and each repeat good outcome of the same suggested action earns less than the last
 * (gain / (1 + n), n = decayed count of credited outcomes), so one easy yes cannot be farmed into trust. No
 * willpower reservoir is modelled (rejected in research/empirical-models.md §6): acting against impulse
 * emerges from competing terms, fatigue cost, habits and precommitments. Autonomy loss from compliance is
 * returned as a delta for the composite to apply; this module writes only `p.will`. Several voices may speak in
 * one decision (each gets its own verdict, counters and pressure; see `evaluate`), and told advice is kept as
 * decaying standing advice (see `rememberAdvice`). `answerSuggestion` answers one voice outside a decision point
 * when the answer leaves the person doing what they are doing. A host command is a separate input that yields the
 * `commanded` verdict (see the commanded-control SCOPE on `commandOutcome`); `learnFromVoice` learns from assented,
 * complied and commanded activities, and `adoptVoiceTrust` moves trust toward a target without a suggestion.
 */

import { breakAllows, inBreak } from '../affect/index.ts';
import { commitmentPressure, isUnderWay, pressureReachedAt } from '../agenda/index.ts';
import { downedAllows, readCapacities } from '../body/index.ts';
import { CONSCIENCE_DEFAULTS, normVeto } from '../conscience/index.ts';
import { clamp01, cmpStr, decay, dexp, dpow, hasNumbers, isObj, random } from '../core/index.ts';
import { skillLevel } from '../skills/index.ts';
import type {
  Affordance,
  BodyReadout,
  Command,
  Commitment,
  Considered,
  EntityId,
  Minute,
  Percept,
  Person,
  RefusalKind,
  Signed,
  StandingAdvice,
  Suggestion,
  SuggestionResolution,
  SuggestionVerdict,
  Unit,
  VoiceConflict,
  VoiceRelation,
  WillState,
} from '../types.ts';
import { MINUTES_PER_DAY, MINUTES_PER_HOUR } from '../types.ts';

export const WILL_DEFAULTS = {
  switchMargin: 0.15,
  temperature: 0,
  maxVoices: 16,
  defaultVoiceTrust: 0.5,
  /** An option is beyond capacity when effort exceeds capacity × this ratio. */
  effortCapacityRatio: 1.5,
  /** Skill veto when difficulty exceeds the level by more than this. */
  skillGap: 0.5,
  /** Extra allowed skill gap for an option tagged 'joint' with partners (same as skills' `supportBonus`). */
  jointSkillSupport: 0.15,
  /** Desperation at which a sleeper wakes for an awake action. */
  wakeDesperation: 0.7,
  /** Distrust refusal: trust below this and pressure above `distrustPressure`. */
  distrustTrust: 0.25,
  distrustPressure: 0.6,
  /**
   * Episode distrust (a second, independent rule): trust below this AND a remembered outcome of following this
   * voice at the same action, within `distrustWindow` minutes, with valence ≤ `distrustValence` and salience ≥
   * `distrustSalience`. Then every suggested option with that action is refused willNot 'distrust', even when
   * the person might have chosen it unprompted (they will not do it on this voice's word).
   */
  distrustEpisodeTrust: 0.45,
  distrustWindow: 24 * MINUTES_PER_HOUR,
  distrustValence: -0.2,
  distrustSalience: 0.4,
  /**
   * Omission rule: a held obligatory norm with conviction ≥ this, linked to a pending commitment that is in the
   * last (1 - omissionFraction) of its window, blocks options that would run past the window's end. Applies only
   * while some offered option can still fulfil the commitment and desperation is below conscience's necessity
   * threshold (capacity bounds obligation). Past the window's end it holds while a fulfilling activity begun inside
   * the window is under way (1.9.0).
   */
  omissionConviction: 0.7,
  omissionFraction: 0.75,
  /** Trust events kept per voice for UI. */
  maxVoiceHistory: 5,
  /** Precommitments held at once; the oldest is dropped beyond this. */
  maxPrecommitments: 8,
  /** Trust changes smaller than this fold into the latest same-reason history entry (UI shows two decimals). */
  historyEpsilon: 0.01,
  /** Autonomy need lost when complying under insistence (scaled by how far the option trailed). */
  complyAutonomyCost: 0.2,
  /** Pressure added when a voice pushes against preference (more when insisting). */
  pressurePush: 0.15,
  pressureInsist: 0.3,
  pressureHalfLife: 4 * MINUTES_PER_HOUR,
  /** Trust learning: gain toward 1 on a good outcome, loss toward 0 on a bad one. */
  trustGain: 0.1,
  trustLoss: 0.25,
  /**
   * Loss rate when the harmful activity was done under protest: the person said no, was overruled and was
   * proved right, so trust falls faster (one bad night: 0.75 → ~0.41 at felt -1). Engineering default.
   */
  trustLossComplied: 0.45,
  /**
   * Share of trust lost each time a voice insists while its pressure is at `distrustPressure` or more (engineering
   * default, 2026-10-03 testing: insisting at every turn raised trust). Eight such pushes take 0.5 below 0.25.
   */
  trustLossPushed: 0.08,
  /**
   * Share of trust lost when a voice's suggestion (not insisted) is turned down while its pressure is already at
   * `distrustPressure` or more: being asked again and again for what they do not want wears on them (engineering
   * default, testing 2026-10-03: a standing urge for two weeks raised trust). A mention (strength 0.35) adds
   * too little pressure to reach it; an urge heard at every decision does.
   */
  trustLossWorn: 0.03,
  /** At most one 'worn' loss per voice in this many minutes (it is a mood about the voice, not a per-decision fee). */
  wornInterval: 12 * MINUTES_PER_HOUR,
  /**
   * Repetition discount on trust gain: a good outcome at an action this voice already got credit for earns
   * gain / (1 + n), n the credited count halving every `creditHalfLife` minutes (engineering default, same
   * testing: the twentieth good outcome from the same word taught as much as the first).
   */
  creditHalfLife: MINUTES_PER_DAY,
  maxCredited: 8,
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
  // --- lane will+cognition ---
  /** Standing advice entries kept (N9); the weakest is dropped first. */
  maxAdvice: 16,
  /** Standing advice weight halves over this many minutes (about two days, engineering default). */
  adviceHalfLife: 2 * 24 * MINUTES_PER_HOUR,
  /** Standing advice whose decayed weight (strength × salience × decay) falls below this is forgotten. */
  adviceFloor: 0.02,
  /** Strength assumed for an advice item that names none. */
  adviceStrength: 0.5,
  // --- commanded control (1.6.0) ---
  /** Autonomy lost when a command is first obeyed, scaled by clamp01(0.5 + margin) (as `complyAutonomyCost`). */
  commandAutonomyCost: 0.2,
  /** Autonomy lost per controlled hour, scaled by clamp01(0.5 + margin). Engineering default. */
  commandAutonomyPerHour: 0.03,
  /** Voice pressure added per controlled hour (it decays with `pressureHalfLife` as any pressure does). */
  commandPressurePerHour: 0.1,
  /** Share of trust lost per controlled hour, scaled by min(1, margin): being made to do what they did not want. */
  commandTrustPerHour: 0.02,
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
  /** A host command in force (1.6.0); see the command SCOPE on `commandOutcome`. */
  command?: Command;
}

/**
 * How a command fared in one decision. `holds`: the commanded option was chosen. Otherwise `ends` says whether
 * control is lost (dead, a break, downed, or an act they will not do) or only suspended for this decision (the
 * target is not on offer, or they cannot right now: asleep, beyond capacity, a pressing bodily need).
 */
export interface CommandOutcome {
  holds: boolean;
  ends: boolean;
  reason: string;
  kind?: RefusalKind;
  /** How far their own choice out-scored the commanded option (>= 0). */
  margin: number;
  /** What they would have chosen without the command. */
  ownAffordanceId: string | null;
  targetAffordanceId?: string;
  /** For an omission end: the closing duty they will not miss. */
  commitmentId?: string;
}

export interface ChoiceResolution {
  chosenAffordanceId: string | null;
  /** The input list with `vetoed` filled in (same order). */
  considered: Considered[];
  /** The credited voice's resolution, or the only voice's (see `creditedResolution`). */
  suggestion?: SuggestionResolution;
  /** One resolution per voice that spoke, in voice-id order (N1). */
  suggestions?: SuggestionResolution[];
  /** Autonomy need delta for the composite to apply (≤ 0). */
  autonomyDelta: number;
  /** How a command in force fared (absent when none). */
  command?: CommandOutcome;
}

/**
 * Restore-time check of the will's optional fields, in place: a non-list `advice` (1.2.0), and a malformed `command`
 * or `lastCommand` (1.6.0, 1.7.0) are dropped (absent means none). A save the engine wrote is unchanged. @internal
 */
export function sanitizeWill(w: WillState): void {
  if (w.advice !== undefined && !Array.isArray(w.advice)) delete w.advice;
  const cmd = w.command as unknown;
  if (
    cmd !== undefined &&
    !(
      isObj(cmd) &&
      typeof cmd.voiceId === 'string' &&
      hasNumbers(cmd, 'since', 'startedAt', 'chargedAt', 'margin')
    )
  )
    delete w.command;
  const last = w.lastCommand as unknown;
  if (last !== undefined && !(isObj(last) && typeof last.voiceId === 'string' && hasNumbers(last, 'since')))
    delete w.lastCommand;
}

export function createWill(voices: { voiceId: EntityId; trust?: number }[] = []): WillState {
  return {
    voices: voices.slice(0, WILL_DEFAULTS.maxVoices).map((v) => ({
      voiceId: v.voiceId,
      trust: clamp01(v.trust ?? WILL_DEFAULTS.defaultVoiceTrust),
      pressure: 0,
      accepted: 0,
      refused: 0,
      history: [],
      seeded: true,
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
    history: [],
  };
  if (p.will.voices.length >= WILL_DEFAULTS.maxVoices) {
    // Drop the unseeded voice with the fewest interactions (seeded voices, e.g. a host's own voice, are kept; when only
    // seeded voices remain, the fewest-interaction one goes).
    const pool = p.will.voices.some((x) => !x.seeded) ? (x: VoiceRelation) => !x.seeded : () => true;
    let idx = -1;
    let b: VoiceRelation | undefined;
    for (const [i, a] of p.will.voices.entries()) {
      if (!pool(a)) continue;
      if (!b || a.accepted + a.refused < b.accepted + b.refused) {
        idx = i;
        b = a;
      }
    }
    if (idx >= 0) p.will.voices.splice(idx, 1);
  }
  p.will.voices.push(v);
  return v;
}

/**
 * Move `p`'s trust in a voice a fraction `rate` (0..1) of the way toward `target` (1.8.0), adding the voice if
 * absent (bounded like any new voice). Used by upbringing: a child comes to trust whom the household trusts. It
 * records no history event and no credit, since no suggestion of that voice was weighed.
 */
export function adoptVoiceTrust(p: Person, voiceId: EntityId, target: Unit, rate: Unit): VoiceRelation {
  const v = ensureVoice(p, voiceId);
  const r = clamp01(Number.isFinite(rate) ? rate : 0);
  const t = clamp01(Number.isFinite(target) ? target : v.trust);
  v.trust = clamp01(v.trust + r * (t - v.trust));
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

const servesCommitment = (c: Commitment, aff: Affordance): boolean =>
  (aff.fulfills?.includes(c.id) ?? false) ||
  (c.actions.includes(aff.action) && (c.targetId === undefined || c.targetId === aff.targetId));

/** Whether `aff` serves a pending commitment whose window is about to close (pressure ≥ wake level). */
function pressingCommitment(p: Person, aff: Affordance, now: Minute): boolean {
  for (const c of p.agenda.commitments) {
    if (c.status !== 'pending') continue;
    if (servesCommitment(c, aff) && commitmentPressure(c, now) >= WILL_DEFAULTS.wakeCommitmentPressure)
      return true;
  }
  return false;
}

/**
 * The next minute after `now` at which a pending commitment reaches `wakeCommitmentPressure`, the level at which a
 * sleeper may wake to serve it (the asleep veto lifts). The composite caps a sleeper's review there so a duty whose
 * closing stretch is shorter than the sleep review interval is not slept through (review 2026-10-03: a person who
 * naps through an afternoon prayer window most days, reviewed every 120 minutes). Undefined when none is ahead.
 */
export function wakeReviewAt(p: Person, now: Minute): Minute | undefined {
  let best: Minute | undefined;
  for (const c of p.agenda.commitments) {
    if (c.status !== 'pending' || c.kind === 'abstain' || c.exempt !== undefined || now >= c.until) continue;
    const at = pressureReachedAt(c, WILL_DEFAULTS.wakeCommitmentPressure);
    if (at === undefined || at <= now) continue;
    if (best === undefined || at < best) best = at;
  }
  return best;
}

/** A pending commitment linked to a held obligatory norm with conviction >= `omissionConviction` (no time test). */
function protectedDuty(p: Person, c: Commitment): boolean {
  if (c.status !== 'pending' || c.normId === undefined) return false;
  const held = p.conscience.norms.find((n) => n.normId === c.normId);
  return held?.standing === 'obligatory' && held.conviction >= WILL_DEFAULTS.omissionConviction;
}

/** The first minute of a commitment's protected closing stretch (the last 1 - omissionFraction of the window). */
const stretchStart = (c: Commitment): Minute => c.from + WILL_DEFAULTS.omissionFraction * (c.until - c.from);

/**
 * Whether `aff` would keep duty `c` if chosen at `now`. Inside the window: any option serving it. Past the window's
 * end (1.9.0): only continuing the running activity that began inside the window (`agenda.isUnderWay`); a fresh start
 * after `until` would not count, so it does not exempt.
 */
function keepsDuty(p: Person, c: Commitment, aff: Affordance, now: Minute): boolean {
  if (now <= c.until) return servesCommitment(c, aff);
  return p.activity?.affordance.id === aff.id && isUnderWay(p, c, now);
}

/**
 * Pending commitments protected by the omission rule right now: linked to a held obligatory norm with conviction
 * ≥ `omissionConviction`, in the last (1 - omissionFraction) of the window, with at least one offered option
 * that keeps it and passes the capacity/conscience vetoes. Past the window's end the duty stays protected while an
 * activity that keeps it, begun inside the window, is under way (1.9.0): a prayer begun in time counts when finished
 * after it (research/decisions.md, "A prayer begun in its time"), so leaving it is an omission; the running activity
 * is then the only option that keeps it. Empty under desperation ≥ necessity threshold.
 * @internal
 */
export function closingDuties(
  p: Person,
  ctx: Pick<WillContext, 'now' | 'affordances' | 'body' | 'desperation' | 'necessity'>,
): Commitment[] {
  if (ctx.desperation >= CONSCIENCE_DEFAULTS.necessityThreshold) return [];
  const out: Commitment[] = [];
  for (const c of p.agenda.commitments) {
    if (!protectedDuty(p, c) || ctx.now < stretchStart(c)) continue;
    if (ctx.now > c.until && !isUnderWay(p, c, ctx.now)) continue;
    const wctx = ctx as WillContext;
    if (!ctx.affordances.some((a) => keepsDuty(p, c, a, ctx.now) && vetoFor(p, a, wctx) === undefined))
      continue;
    out.push(c);
  }
  return out;
}

/** The closing duty this option would make the person miss, if any (options keeping another duty are exempt). */
function omissionFor(
  p: Person,
  duties: readonly Commitment[],
  aff: Affordance,
  now: Minute,
): Commitment | undefined {
  if (duties.length === 0 || duties.some((c) => keepsDuty(p, c, aff, now))) return undefined;
  const end = now + Math.max(0, aff.duration);
  return duties.find((c) => end > c.until);
}

/**
 * The start of the next protected closing stretch that an activity running until `endsAt` would cover entirely
 * without keeping the duty (1.9.0): a protected duty (see `closingDuties`) whose stretch begins after `now` and whose
 * window ends before `endsAt`, and which `aff` does not serve. The composite caps the activity's review there, so a
 * long option begun before the stretch (a sleep that starts 29 minutes before the dawn prayer's window closes, when its protected stretch is the last 22) is weighed
 * again when the stretch begins, under the omission rule. Capacity and necessity are judged at that review, as for
 * any decision: a sleeper who cannot yet wake for the duty sleeps on. Undefined when none is ahead.
 */
export function dutyReviewAt(p: Person, aff: Affordance, now: Minute, endsAt: Minute): Minute | undefined {
  let best: Minute | undefined;
  for (const c of p.agenda.commitments) {
    if (c.kind === 'abstain' || c.exempt !== undefined || !protectedDuty(p, c)) continue;
    if (c.until >= endsAt || servesCommitment(c, aff)) continue;
    const s = Math.ceil(stretchStart(c));
    if (s <= now || s > c.until) continue;
    if (best === undefined || s < best) best = s;
  }
  return best;
}

/**
 * The remembered episode that makes this person refuse `voiceId` at `action` (episode distrust rule), if any.
 * @internal
 */
export function distrustEpisode(
  p: Person,
  voiceId: EntityId,
  action: string,
  now: Minute,
): string | undefined {
  const W = WILL_DEFAULTS;
  const trust = voiceOf(p, voiceId)?.trust ?? W.defaultVoiceTrust;
  if (trust >= W.distrustEpisodeTrust) return undefined;
  const eps = p.memory.episodes;
  for (let i = eps.length - 1; i >= 0; i--) {
    const e = eps[i];
    if (!e || now - e.at > W.distrustWindow) continue;
    if (e.kind !== 'outcome' || e.voiceId !== voiceId || e.action !== action) continue;
    if (e.valence <= W.distrustValence && e.salience >= W.distrustSalience) return e.id;
  }
  return undefined;
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
  // A mental break narrows what they will do to its behaviour; a body at the edge may still eat, drink or sleep.
  if (inBreak(p) && !breakAllows(p, aff) && !(ctx.desperation >= W.survivalDesperation && servesBody(aff)))
    return { kind: 'cannot', reason: 'break' };
  // Downed (body, 1.6.0): only lying, resting or sleeping where they are.
  if (p.body.downed && !downedAllows(aff)) return { kind: 'cannot', reason: 'downed' };
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
  if (aff.requires) {
    const caps = readCapacities(p);
    for (const [c, need] of Object.entries(aff.requires) as [keyof typeof caps, number][])
      if (caps[c] < need) return { kind: 'cannot', reason: `capacity:${c}` };
  }
  // A joint activity lends the partner's support, so the skill veto allows a wider gap.
  const support = aff.tags?.includes('joint') && (aff.with?.length ?? 0) > 0 ? W.jointSkillSupport : 0;
  if (aff.skill && clamp01(aff.skill.difficulty) - skillLevel(p, aff.skill.id) > W.skillGap + support)
    return { kind: 'cannot', reason: `skill:${aff.skill.id}` };
  const norm = normVeto(p, aff, ctx.desperation, { necessity: ctx.necessity ?? true, now: ctx.now });
  if (norm) return norm;
  return undefined;
}

/**
 * Whether suggestion `s` names offer `aff` (by affordance id, or by action class when it names no affordance); false
 * when there is no suggestion.
 */
export function suggestionTargets(s: Suggestion | undefined, aff: Affordance): boolean {
  if (!s) return false;
  if (s.affordanceId !== undefined) return s.affordanceId === aff.id;
  return s.action !== undefined && s.action === aff.action;
}

/** NaN-safe utility: a non-finite score never wins. @internal */
export const safeUtility = (u: number): number => (Number.isNaN(u) ? Number.NEGATIVE_INFINITY : u);

const byUtilityThenId = (a: Considered, b: Considered): number =>
  safeUtility(b.utility) - safeUtility(a.utility) || cmpStr(a.affordanceId, b.affordanceId);

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

interface VoiceSide {
  id: EntityId;
  pressure: number;
  accepted: number;
  refused: number;
}

interface Evaluation {
  chosenId: string | null;
  considered: Considered[];
  /** One per voice, in voice-id order. */
  resolutions: SuggestionResolution[];
  /** The credited resolution (see `creditedResolution`), or the only one. */
  suggestion?: SuggestionResolution;
  autonomyDelta: number;
  /** Will-owned side effects to apply on resolve (not on predict), one per voice. */
  voices: VoiceSide[];
  command?: CommandOutcome;
}

/**
 * The voices speaking in one decision: `list` plus `single` (sugar), one per voice id (the first given wins),
 * sorted by voice id and bounded by `maxVoices`, so the outcome never depends on the host's argument order.
 */
export function voicesIn(
  single: Suggestion | undefined,
  list: readonly Suggestion[] | undefined,
): Suggestion[] {
  const out: Suggestion[] = [];
  const seen = new Set<EntityId>();
  for (const s of [...(list ?? []), ...(single ? [single] : [])]) {
    if (seen.has(s.voiceId)) continue;
    seen.add(s.voiceId);
    out.push(s);
  }
  out.sort((a, b) => cmpStr(a.voiceId, b.voiceId));
  return out.slice(0, WILL_DEFAULTS.maxVoices);
}

/** Value of `voiceId`'s own suggestion term on an option (0 when absent). */
const voiceTerm = (c: Considered | undefined, voiceId: EntityId): number =>
  c?.terms.find((t) => t.source === `suggestion:${voiceId}`)?.value ?? 0;

/**
 * Shared verdict logic for any number of voices. `draw` is a uniform sample for softmax (undefined = argmax);
 * `predictResponse` always passes undefined so no RNG is consumed.
 *
 * SCOPE (several voices, N1): every voice's suggestion term is already in the option utilities (cognition adds
 * one `suggestion:<voiceId>` term per voice), so the person's own choice is a single argmax over the combined
 * pulls; each voice then gets its own verdict against that choice, with its own counters and pressure. Two
 * deterministic rules settle what one voice never raised: (a) when several voices `insist` on different
 * options, only one can be complied with: the most trusted (then the stronger push, then voice id); the others
 * are deferred behind it (reason `voice:<id>`), and a voice whose assent was displaced is deferred the same way
 * without counters; (b) when several voices targeted the chosen option, all assented and the credited one (the
 * resolution attached to the activity) is the one whose term on it was largest, ties by voice id. Distrust is
 * per voice: an option is vetoed `distrust` only when every voice targeting it is distrusted for that action,
 * so a distrusted voice cannot spoil a trusted voice's advice by repeating it. An option that serves a closing
 * obligatory duty is never distrust-vetoed (the person does the duty for its own sake; the voice is still
 * refused 'distrust'): otherwise a distrusted voice urging the duty while the omission rule blocks every other
 * option would leave nothing to choose and the duty missed. The omission rule itself is per option, so no
 * number of voices, pushing or insisting, adds up to pulling a firmly convinced person off a closing duty.
 * Known seam: a distrusted voice's own `suggestion:<voiceId>` term (added by cognition) still counts in the
 * utility of an option that stays live; only its verdict says "not on your word". Multi-voice resolution borrows
 * group-advice findings only in shape (advice is weighed by trust in each adviser, not by headcount); it does not model conformity to a majority, persuasion between the voices, or the person asking for advice.
 */
function evaluate(
  p: Person,
  input: readonly Considered[],
  ctx: WillContext,
  given: readonly Suggestion[],
  draw: number | undefined,
): Evaluation {
  const W = WILL_DEFAULTS;
  const cmd = ctx.command;
  // A commanding voice is not also weighed as a suggestion in the same decision.
  const suggestions = cmd ? given.filter((s) => s.voiceId !== cmd.voiceId) : given;
  const affById = new Map(ctx.affordances.map((a) => [a.id, a]));
  const duties = closingDuties(p, ctx);
  const servesDuty = (aff: Affordance): boolean => duties.some((c) => keepsDuty(p, c, aff, ctx.now));
  // Per-voice distrust episode, over the voice's targets that pass the capacity/conscience vetoes.
  const baseVeto = new Map<string, Considered['vetoed']>();
  for (const c of input) {
    const aff = affById.get(c.affordanceId);
    baseVeto.set(
      c.affordanceId,
      aff ? vetoFor(p, aff, ctx) : { kind: 'cannot' as const, reason: 'unavailable' },
    );
  }
  const distrustOf = new Map<EntityId, string | undefined>();
  for (const s of suggestions) {
    let ep: string | undefined;
    const tried = new Set<string>();
    for (const c of input) {
      const aff = affById.get(c.affordanceId);
      if (!aff || !suggestionTargets(s, aff) || baseVeto.get(c.affordanceId) || tried.has(aff.action))
        continue;
      tried.add(aff.action);
      ep = distrustEpisode(p, s.voiceId, aff.action, ctx.now);
      if (ep !== undefined) break;
    }
    distrustOf.set(s.voiceId, ep);
  }
  const considered: Considered[] = input.map((c) => {
    const aff = affById.get(c.affordanceId);
    const out: Considered = { ...c, terms: [...c.terms] };
    delete out.vetoed;
    let veto = baseVeto.get(c.affordanceId);
    if (!veto && aff && !servesDuty(aff)) {
      const by = suggestions.filter((s) => suggestionTargets(s, aff));
      if (by.length > 0 && by.every((s) => distrustOf.get(s.voiceId) !== undefined))
        veto = { kind: 'willNot', reason: 'distrust' };
    }
    if (!veto && aff) {
      const missed = omissionFor(p, duties, aff, ctx.now);
      if (missed) veto = { kind: 'willNot', reason: `norm:${missed.normId}`, omission: missed.id };
    }
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
    const weights = ranked.map((c) => dexp((score(c) - top) / p.will.temperature));
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
  const ev: Evaluation = {
    chosenId: winner?.affordanceId ?? null,
    considered,
    resolutions: [],
    autonomyDelta: 0,
    voices: [],
  };
  if (cmd) {
    const co = commandOutcome(p, considered, ctx, cmd, winner, score, baseVeto, duties);
    ev.command = co;
    if (co.holds && co.targetAffordanceId !== undefined) {
      // Direct control: the commanded option is done; every other voice is set aside (no counters) and a
      // distrust veto another voice caused does not stand in the way.
      ev.chosenId = co.targetAffordanceId;
      for (const c of considered) if (c.vetoed?.reason === 'distrust') delete c.vetoed;
      const res: SuggestionResolution = {
        voiceId: cmd.voiceId,
        verdict: 'commanded',
        reason: 'command',
        says: '',
        margin: co.margin,
      };
      if (co.ownAffordanceId !== null && co.ownAffordanceId !== co.targetAffordanceId)
        res.insteadAffordanceId = co.ownAffordanceId;
      const all: SuggestionResolution[] = [
        res,
        ...suggestions.map(
          (s): SuggestionResolution => ({
            voiceId: s.voiceId,
            verdict: 'refused',
            kind: 'cannot',
            reason: 'commanded',
            says: '',
          }),
        ),
      ].sort((a, b) => cmpStr(a.voiceId, b.voiceId));
      ev.resolutions = all;
      ev.voices = all.map((r) => ({ id: r.voiceId, pressure: 0, accepted: 0, refused: 0 }));
      ev.suggestion = res;
      return ev;
    }
  }
  if (suggestions.length === 0) return withCommandRefusal(ev, cmd);
  if (inBreak(p)) {
    // During a mental break no voice reaches them; nothing is counted for or against any of them.
    ev.resolutions = suggestions.map((s) => ({
      voiceId: s.voiceId,
      verdict: 'refused' as const,
      kind: 'cannot' as const,
      reason: 'break',
      says: '',
    }));
    ev.voices = suggestions.map((s) => ({ id: s.voiceId, pressure: 0, accepted: 0, refused: 0 }));
    if (ev.resolutions.length === 1) ev.suggestion = ev.resolutions[0];
    return withCommandRefusal(ev, cmd);
  }

  const winnerAff = winner ? affById.get(winner.affordanceId) : undefined;
  const reason = dominantTerm(winner);
  interface Judged {
    s: Suggestion;
    res: SuggestionResolution;
    side: VoiceSide;
    /** Insisted and would be complied with: the option and the utility gap it trailed by. */
    comply?: { target: Considered; gap: number };
    targetIds: Set<string>;
  }
  const judged: Judged[] = suggestions.map((s) => {
    const suggested = considered.filter((c) => {
      const aff = affById.get(c.affordanceId);
      return aff !== undefined && suggestionTargets(s, aff);
    });
    const targetIds = new Set(suggested.map((c) => c.affordanceId));
    let likelihood: number | undefined;
    if (winner && p.will.temperature > 0) {
      const top = score(winner);
      let total = 0;
      let hit = 0;
      for (const c of ranked) {
        const wgt = dexp((score(c) - top) / p.will.temperature);
        total += wgt;
        if (targetIds.has(c.affordanceId)) hit += wgt;
      }
      likelihood = total > 0 ? hit / total : 0;
    }
    const side: VoiceSide = { id: s.voiceId, pressure: 0, accepted: 0, refused: 0 };
    const resolution = (
      verdict: SuggestionVerdict,
      why: string,
      extra: Partial<SuggestionResolution> & { kind?: RefusalKind } = {},
    ): SuggestionResolution => ({
      voiceId: s.voiceId,
      verdict,
      reason: why,
      says: '',
      ...extra,
      ...(likelihood !== undefined ? { likelihood } : {}),
      ...(s.insist ? { insisted: true } : {}),
    });
    const out = (res: SuggestionResolution, comply?: Judged['comply']): Judged =>
      comply ? { s, res, side, comply, targetIds } : { s, res, side, targetIds };

    // `cannot` refusals are facts about the situation, not resistance to the voice: they move no counters.
    if (suggested.length === 0) return out(resolution('refused', 'unavailable', { kind: 'cannot' }));
    const distrustEp = distrustOf.get(s.voiceId);
    if (distrustEp !== undefined) {
      side.refused = 1;
      const doingAnyway = winner !== undefined && targetIds.has(winner.affordanceId);
      return out(
        resolution('refused', 'distrust', {
          kind: 'willNot',
          episodeId: distrustEp,
          ...(doingAnyway && winner ? { insteadAffordanceId: winner.affordanceId } : {}),
        }),
      );
    }
    const liveSuggested = suggested.filter((c) => !c.vetoed).sort(byUtilityThenId);
    const bestSuggested = liveSuggested[0];
    if (!bestSuggested) {
      // Every suggested option is vetoed: report the first veto (willNot outranks cannot; a standing refusal
      // outranks an omission, which is only "not before my duty").
      const vetoes = suggested.map((c) => c.vetoed).filter((v) => v !== undefined);
      const v =
        vetoes.find((x) => x.kind === 'willNot' && x.omission === undefined) ??
        vetoes.find((x) => x.kind === 'willNot') ??
        vetoes[0];
      if (v?.omission !== undefined) {
        const duty = p.agenda.commitments.find((c) => c.id === v.omission);
        side.refused = 1;
        if (!s.insist) {
          // Not refused outright: the duty comes first, then the request.
          side.pressure = W.pressurePush * clamp01(s.strength);
          return out(
            resolution('deferred', v.reason, {
              kind: 'notNow',
              commitmentId: v.omission,
              ...(winnerAff ? { insteadAffordanceId: winnerAff.id } : {}),
              counterOffer: { affordanceId: suggested[0]?.affordanceId, label: dutyLabel(duty, winnerAff) },
            }),
          );
        }
        return out(resolution('refused', v.reason, { kind: 'willNot', commitmentId: v.omission }));
      }
      if (v?.kind === 'willNot') side.refused = 1;
      return out(resolution('refused', v?.reason ?? 'cannot', { kind: v?.kind ?? 'cannot' }));
    }
    if (winner && targetIds.has(winner.affordanceId)) {
      side.accepted = 1;
      // Insisting on what they take up still pushes them: the pressure lands even when they agree.
      if (s.insist) side.pressure = W.pressureInsist;
      return out(resolution('assented', reason));
    }
    // The suggestion lost to the person's own preference (and any other voices' pulls).
    const voice = voiceOf(p, s.voiceId);
    const trust = voice?.trust ?? W.defaultVoiceTrust;
    if (trust < W.distrustTrust && (voice?.pressure ?? 0) > W.distrustPressure) {
      side.refused = 1;
      return out(resolution('refused', 'distrust', { kind: 'willNot' }));
    }
    const suggestedAff = affById.get(bestSuggested.affordanceId);
    if (s.insist) {
      // Survival first: insisting cannot make a person ignore a pressing bodily need.
      const survival = survivalReason(reason, ctx);
      if (survival)
        return out(
          resolution('refused', survival, { kind: 'cannot', insteadAffordanceId: winner?.affordanceId }),
        );
      const gap = Math.max(0, (winner ? score(winner) : 0) - bestSuggested.utility);
      side.pressure = W.pressureInsist;
      side.accepted = 1;
      return out(
        resolution('complied', reason, { kind: 'notNow', insteadAffordanceId: winner?.affordanceId }),
        {
          target: bestSuggested,
          gap,
        },
      );
    }
    side.pressure = W.pressurePush * clamp01(s.strength);
    side.refused = 1;
    const near =
      winnerAff !== undefined &&
      suggestedAff !== undefined &&
      (winnerAff.action === suggestedAff.action ||
        (mainAim(suggestedAff) !== undefined && mainAim(suggestedAff) === mainAim(winnerAff)));
    if (near && winnerAff)
      return out(
        resolution('modified', reason, {
          kind: 'notNow',
          insteadAffordanceId: winnerAff.id,
          counterOffer: { affordanceId: winnerAff.id, label: winnerAff.label },
        }),
      );
    return out(
      resolution('deferred', reason, {
        kind: 'notNow',
        insteadAffordanceId: winnerAff?.id,
        counterOffer: winnerAff
          ? { affordanceId: bestSuggested.affordanceId, label: `after I ${winnerAff.label}` }
          : { affordanceId: bestSuggested.affordanceId, label: 'later' },
      }),
    );
  });

  // Rule (a): at most one insisted option is complied with.
  const insisting = judged.filter((j) => j.comply !== undefined);
  let forcer: Judged | undefined;
  for (const j of insisting) {
    if (!forcer) {
      forcer = j;
      continue;
    }
    const tj = voiceOf(p, j.s.voiceId)?.trust ?? W.defaultVoiceTrust;
    const tf = voiceOf(p, forcer.s.voiceId)?.trust ?? W.defaultVoiceTrust;
    if (tj > tf || (tj === tf && clamp01(j.s.strength) > clamp01(forcer.s.strength))) forcer = j;
  }
  if (forcer?.comply) {
    const forced = forcer.comply.target.affordanceId;
    const forcedAff = affById.get(forced);
    ev.chosenId = forced;
    ev.autonomyDelta = -W.complyAutonomyCost * clamp01(0.5 + forcer.comply.gap);
    const behind = `voice:${forcer.s.voiceId}`;
    for (const j of judged) {
      if (j === forcer) continue;
      const v = j.res.verdict;
      if (j.comply && j.comply.target.affordanceId === forced) continue; // insisted on the same option
      if (j.comply || v === 'assented') {
        // Deferred behind the voice that prevailed; a displaced assent costs nothing on either side.
        if (v === 'assented') j.side.accepted = 0;
        else {
          j.side.accepted = 0;
          j.side.refused = 1;
        }
        const firstTarget = considered.find((c) => j.targetIds.has(c.affordanceId))?.affordanceId;
        const res: SuggestionResolution = {
          voiceId: j.s.voiceId,
          verdict: 'deferred',
          kind: 'notNow',
          reason: behind,
          says: '',
          insteadAffordanceId: forced,
          counterOffer: {
            ...(firstTarget !== undefined ? { affordanceId: firstTarget } : {}),
            label: forcedAff ? `after I ${forcedAff.label}` : 'later',
          },
        };
        if (j.res.likelihood !== undefined) res.likelihood = j.res.likelihood;
        j.res = res;
      } else if ((v === 'deferred' || v === 'modified') && j.targetIds.has(forced)) {
        // Another voice asked once for what is now being done.
        j.side.pressure = 0;
        j.side.refused = 0;
        j.side.accepted = 1;
        const res: SuggestionResolution = {
          voiceId: j.s.voiceId,
          verdict: 'assented',
          reason: behind,
          says: '',
        };
        if (j.res.likelihood !== undefined) res.likelihood = j.res.likelihood;
        j.res = res;
      }
    }
  }

  ev.resolutions = judged.map((j) => j.res);
  ev.voices = judged.map((j) => j.side);
  const chosen = considered.find((c) => c.affordanceId === ev.chosenId);
  ev.suggestion =
    creditedResolution(ev.resolutions, chosen) ??
    (ev.resolutions.length === 1 ? ev.resolutions[0] : undefined);
  return withCommandRefusal(ev, cmd);
}

/** Add the commanding voice's refusal (a command that did not hold) to the resolutions, in voice-id order. */
function withCommandRefusal(ev: Evaluation, cmd: Command | undefined): Evaluation {
  const co = ev.command;
  if (!cmd || !co || co.holds) return ev;
  const res: SuggestionResolution = {
    voiceId: cmd.voiceId,
    verdict: 'refused',
    kind: co.kind ?? 'cannot',
    reason: co.reason,
    says: '',
  };
  if (co.commitmentId !== undefined) res.commitmentId = co.commitmentId;
  if (co.ownAffordanceId !== null) res.insteadAffordanceId = co.ownAffordanceId;
  const at = ev.resolutions.findIndex((r) => r.voiceId > cmd.voiceId);
  const idx = at < 0 ? ev.resolutions.length : at;
  ev.resolutions.splice(idx, 0, res);
  ev.voices.splice(idx, 0, { id: cmd.voiceId, pressure: 0, accepted: 0, refused: 0 });
  if (ev.suggestion === undefined && ev.resolutions.length === 1) ev.suggestion = res;
  return ev;
}

/**
 * SCOPE (commanded control, 1.6.0): a host voice may take direct control of a person (an order that is not a request,
 * as in drafting a unit). While a command is in force the person does the commanded offer (the best-scoring
 * offer it names that passes the vetoes) whatever they would have chosen; other voices are set aside without
 * counters. The suggestion model is untouched: a command is a separate input (`WillContext.command`), and without
 * one `evaluate` runs exactly as before. Control is lost (`ends`) when the person dies, is in a mental break, is
 * downed, or would have to do what they will not: a held prohibition or a closing obligatory duty (the same willNot
 * vetoes a suggestion meets, so no order makes a firmly convinced person break a norm). It is only suspended for
 * the decision, and resumes at the next, when the target is not on offer, they cannot (asleep, capacity, skill), or
 * a pressing bodily need comes first (`survivalReason`, as for insisting). `margin` is how far their own choice
 * out-scored the commanded option; the composite charges autonomy, voice pressure and trust per controlled hour
 * from it. Does not cover: obedience as a learned disposition, rank or legitimacy of the commanding voice,
 * partial obedience (doing it badly on purpose), or orders addressed to several people at once.
 */
function commandOutcome(
  p: Person,
  considered: readonly Considered[],
  ctx: WillContext,
  cmd: Command,
  winner: Considered | undefined,
  score: (c: Considered) => number,
  baseVeto: ReadonlyMap<string, Considered['vetoed']>,
  duties: readonly Commitment[],
): CommandOutcome {
  const own = winner?.affordanceId ?? null;
  const out = (
    o: Omit<CommandOutcome, 'ownAffordanceId' | 'margin'> & { margin?: number },
  ): CommandOutcome => ({
    margin: 0,
    ownAffordanceId: own,
    ...o,
  });
  if (!p.body.alive) return out({ holds: false, ends: true, reason: 'dead', kind: 'cannot' });
  const blocked = controlBlock(p);
  if (blocked) return out({ holds: false, ends: true, reason: blocked, kind: 'cannot' });
  const affById = new Map(ctx.affordances.map((a) => [a.id, a]));
  const named = considered.filter((c) => {
    const aff = affById.get(c.affordanceId);
    return aff !== undefined && commandTargets(cmd, aff);
  });
  if (named.length === 0) return out({ holds: false, ends: false, reason: 'unavailable', kind: 'cannot' });
  const vetoOf = (c: Considered): Considered['vetoed'] => {
    const v = baseVeto.get(c.affordanceId);
    if (v) return v;
    const aff = affById.get(c.affordanceId);
    const missed = aff ? omissionFor(p, duties, aff, ctx.now) : undefined;
    return missed ? { kind: 'willNot', reason: `norm:${missed.normId}`, omission: missed.id } : undefined;
  };
  const live = named.filter((c) => vetoOf(c) === undefined).sort(byUtilityThenId);
  const target = live[0];
  if (!target) {
    const vetoes = named.map(vetoOf).filter((v) => v !== undefined);
    const v = vetoes.find((x) => x.kind === 'willNot') ?? vetoes[0];
    if (v?.kind === 'willNot')
      return out({
        holds: false,
        ends: true,
        reason: v.reason,
        kind: 'willNot',
        ...(v.omission !== undefined ? { commitmentId: v.omission } : {}),
      });
    return out({ holds: false, ends: false, reason: v?.reason ?? 'cannot', kind: 'cannot' });
  }
  if (winner && winner.affordanceId !== target.affordanceId) {
    const survival = survivalReason(dominantTerm(winner), ctx);
    if (survival) return out({ holds: false, ends: false, reason: survival, kind: 'cannot' });
  }
  const gap = winner ? score(winner) - score(target) : 0;
  return out({
    holds: true,
    ends: false,
    reason: 'command',
    margin: Number.isFinite(gap) ? Math.max(0, gap) : 0,
    targetAffordanceId: target.affordanceId,
  });
}

/** Whether a command names offer `aff` (by affordance id, or by action class when it names no affordance). */
export const commandTargets = (cmd: Command, aff: Affordance): boolean =>
  cmd.affordanceId !== undefined
    ? cmd.affordanceId === aff.id
    : cmd.action !== undefined && cmd.action === aff.action;

/** A state that ends direct control whatever the target: a mental break (affect) or being downed (body). */
function controlBlock(p: Person): string | undefined {
  if (inBreak(p)) return 'break';
  if (p.body.downed) return 'downed';
  return undefined;
}

/** Whether an offer serves a bodily need (positive food, water, sleep or rest advertisement). */
function servesBody(aff: Affordance): boolean {
  const a = aff.advertises;
  return (a.food ?? 0) > 0 || (a.water ?? 0) > 0 || (a.sleep ?? 0) > 0 || (a.rest ?? 0) > 0;
}

/**
 * The resolution credited with the chosen option: a complied one first (the person did it because that voice
 * insisted), else the assented one whose suggestion term on the chosen option was largest, ties by voice id.
 */
export function creditedResolution(
  resolutions: readonly SuggestionResolution[],
  chosen: Considered | undefined,
): SuggestionResolution | undefined {
  const commanded = resolutions.find((r) => r.verdict === 'commanded');
  if (commanded) return commanded;
  const complied = resolutions.find((r) => r.verdict === 'complied');
  if (complied) return complied;
  let best: SuggestionResolution | undefined;
  for (const r of resolutions) {
    if (r.verdict !== 'assented') continue;
    if (!best || voiceTerm(chosen, r.voiceId) > voiceTerm(chosen, best.voiceId)) best = r;
  }
  return best;
}

/** Resolutions whose voice should learn from how the chosen activity went (assented, complied or commanded). */
export function creditedVoices(resolutions: readonly SuggestionResolution[]): SuggestionResolution[] {
  return resolutions.filter(
    (r) => r.verdict === 'assented' || r.verdict === 'complied' || r.verdict === 'commanded',
  );
}

/**
 * Which voice prevailed and why, for narration ("I went with my sister; my friend can wait"). Pure and cheap: reads
 * only the decision's considered list and resolutions. Undefined when no voice spoke.
 */
export function conflictBetweenVoices(
  considered: readonly Considered[],
  resolutions: readonly SuggestionResolution[],
  chosenAffordanceId: string | null,
): VoiceConflict | undefined {
  if (resolutions.length === 0) return undefined;
  const chosen = considered.find((c) => c.affordanceId === chosenAffordanceId);
  const credited = creditedResolution(resolutions, chosen);
  return {
    creditedVoiceId: credited?.voiceId ?? null,
    chosenAffordanceId,
    reason: dominantTerm(chosen),
    voices: resolutions.map((r) => {
      let best: Considered | undefined;
      for (const c of considered) {
        const t = voiceTerm(c, r.voiceId);
        if (t !== 0 && (!best || t > voiceTerm(best, r.voiceId))) best = c;
      }
      const v: VoiceConflict['voices'][number] = {
        voiceId: r.voiceId,
        verdict: r.verdict,
        term: voiceTerm(best, r.voiceId),
      };
      if (best) {
        v.targetAffordanceId = best.affordanceId;
        v.targetUtility = best.utility;
      }
      return v;
    }),
  };
}

/** Counter-offer for a request deferred behind a duty: "after I pray", "after I feed the children". */
function dutyLabel(duty: Commitment | undefined, winner: Affordance | undefined): string {
  if (duty?.kind === 'worship') return duty.label ? `after I pray ${duty.label}` : 'after I pray';
  if (duty?.label) return `after I ${duty.label}`;
  return winner ? `after I ${winner.label}` : 'after my duty';
}

/**
 * Resolve a choice. `suggestion` is one voice or several (N1); with several, `suggestions` holds one resolution
 * per voice and `suggestion` the credited one. Writes voice pressure and counters (will-owned) unless `quiet`
 * (a review that keeps the running activity), and consumes RNG only when `temperature > 0`. The autonomy delta
 * is returned for the composite.
 */
export function resolveChoice(
  p: Person,
  considered: readonly Considered[],
  ctx: WillContext,
  suggestion?: Suggestion | readonly Suggestion[],
  opts: { quiet?: boolean } = {},
): ChoiceResolution {
  const list = asList(suggestion);
  const draw = p.will.temperature > 0 ? random(p.rng) : undefined;
  const ev = evaluate(p, considered, ctx, list, draw);
  if (opts.quiet && (ev.chosenId === null || ev.chosenId === p.activity?.affordanceId)) {
    // A review that continues the running activity re-weighs standing requests: same verdicts, but no
    // counters, pressure or autonomy cost. A review that switches activity is a new choice and counts.
    ev.voices = [];
    ev.autonomyDelta = 0;
  }
  bookVoices(p, ev.voices, ev.resolutions, ctx.now);
  const out: ChoiceResolution = {
    chosenAffordanceId: ev.chosenId,
    considered: ev.considered,
    autonomyDelta: ev.autonomyDelta,
  };
  if (ev.command) out.command = ev.command;
  if (ev.suggestion) out.suggestion = ev.suggestion;
  if (ev.resolutions.length > 0) out.suggestions = ev.resolutions;
  return out;
}

/** Write each voice's side of a resolution: pressure, counters, and the `pushed`/`worn` trust costs. */
function bookVoices(
  p: Person,
  voices: Evaluation['voices'],
  resolutions: readonly SuggestionResolution[],
  now: Minute,
): void {
  const W = WILL_DEFAULTS;
  for (const [i, side] of voices.entries()) {
    const v = ensureVoice(p, side.id);
    v.pressure = clamp01(v.pressure + side.pressure);
    v.accepted += side.accepted;
    v.refused += side.refused;
    // Being insisted at while already pressed wears trust down, whatever they then do (engineering default), so
    // a voice that insists at every turn reaches the distrust refusal.
    const res = resolutions[i];
    if (res?.insisted && res.kind !== 'cannot' && v.pressure >= W.distrustPressure) {
      const before = v.trust;
      v.trust = clamp01(v.trust * (1 - W.trustLossPushed));
      noteTrust(v, v.trust - before, 'pushed', now);
    } else if (
      res &&
      !res.insisted &&
      res.kind !== 'cannot' &&
      res.reason !== 'distrust' &&
      (res.verdict === 'deferred' || res.verdict === 'modified' || res.verdict === 'refused') &&
      v.pressure >= W.distrustPressure &&
      (v.lastWornAt === undefined || now - v.lastWornAt >= W.wornInterval)
    ) {
      v.lastWornAt = now;
      const before = v.trust;
      v.trust = clamp01(v.trust * (1 - W.trustLossWorn));
      noteTrust(v, v.trust - before, 'worn', now);
    }
  }
}

/**
 * Answer one voice now, outside a decision point, when the answer leaves the person doing what they are doing: a
 * refusal is booked as it would be at a decision (pressure, refused counter, `pushed`/`worn` trust costs) and
 * returned with `booked: true`. Any other verdict would mean switching activity, so nothing is written and the
 * host should interrupt and let the next decision resolve it. Always uses the argmax outcome (no RNG), so the
 * verdict equals `predictResponse` on the same input. The composite `answerNow` in person.ts builds the context.
 */
export function answerSuggestion(
  p: Person,
  considered: readonly Considered[],
  ctx: WillContext,
  suggestion: Suggestion,
  others: readonly Suggestion[] = [],
): { resolution: SuggestionResolution; booked: boolean } {
  const list = voicesIn(
    suggestion,
    others.filter((s) => s.voiceId !== suggestion.voiceId),
  );
  const ev = evaluate(p, considered, ctx, list, undefined);
  const i = ev.resolutions.findIndex((r) => r.voiceId === suggestion.voiceId);
  const resolution: SuggestionResolution = ev.resolutions[i] ?? {
    voiceId: suggestion.voiceId,
    verdict: 'refused',
    reason: 'unavailable',
    says: '',
  };
  // Not heard at all (dropped by `maxVoices`, or the commanding voice): nothing to book (2.0.0).
  if (i < 0 || resolution.verdict !== 'refused') return { resolution, booked: false };
  const side = ev.voices[i];
  if (side) bookVoices(p, [side], [resolution], ctx.now);
  return { resolution, booked: true };
}

const asList = (s: Suggestion | readonly Suggestion[] | undefined): Suggestion[] =>
  s === undefined
    ? []
    : Array.isArray(s)
      ? voicesIn(undefined, s as readonly Suggestion[])
      : [s as Suggestion];

/**
 * The verdict a suggestion would get now, without writing state or consuming RNG (for UI telegraphing).
 * With `others`, the verdict for `suggestion` amid those voices (N1); `considered` must then already carry
 * every voice's terms (score with `suggestions: [...others, suggestion]`). With `temperature > 0` the verdict
 * is the argmax outcome and `likelihood` gives the chance the suggested option is actually drawn; the
 * composite `predict` in person.ts builds the context for hosts.
 */
export function predictResponse(
  p: Person,
  considered: readonly Considered[],
  ctx: WillContext,
  suggestion: Suggestion,
  others: readonly Suggestion[] = [],
): SuggestionResolution {
  const list = voicesIn(
    suggestion,
    others.filter((s) => s.voiceId !== suggestion.voiceId),
  );
  const ev = evaluate(p, considered, ctx, list, undefined);
  return (
    ev.resolutions.find((r) => r.voiceId === suggestion.voiceId) ?? {
      voiceId: suggestion.voiceId,
      verdict: 'refused',
      reason: 'unavailable',
      says: '',
    }
  );
}

/** Every voice's predicted verdict at once (same rules as `predictResponse`, voice-id order). */
export function predictResponses(
  p: Person,
  considered: readonly Considered[],
  ctx: WillContext,
  suggestions: readonly Suggestion[],
): SuggestionResolution[] {
  return evaluate(p, considered, ctx, voicesIn(undefined, suggestions), undefined).resolutions;
}

/** How a command would fare against these scored options, without writing state or consuming RNG. */
export function resolveCommand(
  p: Person,
  considered: readonly Considered[],
  ctx: WillContext,
): CommandOutcome {
  const ev = evaluate(p, considered, ctx, [], undefined);
  return ev.command ?? { holds: false, ends: false, reason: 'none', margin: 0, ownAffordanceId: ev.chosenId };
}

/** Put a command in force (writes `p.will` only; the composite's `command` adds the memory and the interrupt). */
export function takeCommand(p: Person, cmd: Command, now: Minute): void {
  ensureVoice(p, cmd.voiceId);
  const c: NonNullable<WillState['command']> = {
    voiceId: cmd.voiceId,
    since: cmd.since,
    startedAt: now,
    chargedAt: now,
    margin: 0,
  };
  if (cmd.affordanceId !== undefined) c.affordanceId = cmd.affordanceId;
  if (cmd.action !== undefined) c.action = cmd.action;
  if (cmd.repeat) c.repeat = true;
  p.will.command = c;
}

/**
 * Note a decision's command outcome while the command stays in force: whether it was obeyed and, if so, by what
 * margin. Returns true the first time it is obeyed, so the composite can charge autonomy and remember it once.
 */
export function noteCommandOutcome(p: Person, holds: boolean, margin: number): boolean {
  const c = p.will.command;
  if (!c) return false;
  c.obeyed = holds;
  if (!holds) return false;
  c.margin = margin;
  if (c.remembered) return false;
  c.remembered = true;
  return true;
}

/** End the command in force, recording why (`lastCommand`). Charge it first (`chargeCommand`). */
export function endCommand(p: Person, reason: string, now: Minute): void {
  const c = p.will.command;
  if (!c) return;
  p.will.lastCommand = { voiceId: c.voiceId, since: c.since, endedAt: now, reason };
  delete p.will.command;
}

/**
 * Charge the controlled time since the last charge, if the command was being obeyed: voice pressure per hour and,
 * scaled by the margin, a trust loss ('commanded'). Returns the autonomy delta (<= 0) for the composite to apply.
 */
export function chargeCommand(p: Person, now: Minute): number {
  const W = WILL_DEFAULTS;
  const c = p.will.command;
  if (!c) return 0;
  const hours = Math.max(0, now - c.chargedAt) / MINUTES_PER_HOUR;
  c.chargedAt = Math.max(c.chargedAt, now);
  if (!c.obeyed || hours <= 0) return 0;
  const v = ensureVoice(p, c.voiceId);
  v.pressure = clamp01(v.pressure + W.commandPressurePerHour * hours);
  const loss = clamp01(W.commandTrustPerHour * hours * Math.min(1, c.margin));
  if (loss > 0) {
    const before = v.trust;
    v.trust = clamp01(v.trust * (1 - loss));
    noteTrust(v, v.trust - before, 'commanded', now);
  }
  return -W.commandAutonomyPerHour * hours * clamp01(0.5 + c.margin);
}

/**
 * After a suggested activity finished: how it felt updates trust in the voice. Harm from followed advice
 * costs more than benefit earns. Only assented, complied or commanded resolutions carry information about the advice.
 */
export function learnFromVoice(
  p: Person,
  resolution: SuggestionResolution,
  felt: Signed,
  event: { at?: Minute; action?: string; reason?: string } = {},
): void {
  const verdict = resolution.verdict;
  if (verdict !== 'assented' && verdict !== 'complied' && verdict !== 'commanded') return;
  const W = WILL_DEFAULTS;
  const v = ensureVoice(p, resolution.voiceId);
  const f = Math.max(-1, Math.min(1, felt));
  const before = v.trust;
  // A commanded activity is learned from as a complied one: no credit when it goes well, the faster loss when not.
  const complied = verdict === 'complied' || verdict === 'commanded';
  // A coerced or insisted activity that went well earns no trust: the person did not choose to follow the
  // advice freely (insisting on what they would have done anyway takes the credit away too).
  if (f > 0 && !complied && !resolution.insisted) {
    const at = event.at ?? p.now;
    const key = event.action ?? '';
    v.credited ??= [];
    const list = v.credited;
    const prior = list.find((c) => c.action === key);
    const n = prior ? decay(prior.n, Math.max(0, at - prior.at), W.creditHalfLife) : 0;
    v.trust = clamp01(v.trust + (W.trustGain * f * (1 - v.trust)) / (1 + n));
    if (prior) {
      prior.n = n + 1;
      prior.at = at;
    } else list.push({ action: key, n: 1, at });
    if (list.length > W.maxCredited) {
      list.sort((a, b) => b.at - a.at);
      list.length = W.maxCredited;
    }
  } else if (f < 0) v.trust = clamp01(v.trust + (complied ? W.trustLossComplied : W.trustLoss) * f * v.trust);
  const delta = v.trust - before;
  const reason = event.reason ?? (delta > 0 ? 'went-well' : complied ? 'harm-under-protest' : 'went-badly');
  noteTrust(v, delta, reason, event.at ?? p.now, event.action);
}

/** Append a trust change to a voice's history (small changes fold into the latest same-reason entry). */
function noteTrust(v: VoiceRelation, delta: number, reason: string, at: Minute, action?: string): void {
  const W = WILL_DEFAULTS;
  if (Math.abs(delta) < 1e-9) return;
  v.history ??= [];
  // A change too small to show (|δ| < historyEpsilon) folds into the latest entry with the same reason, so a
  // trust meter names events that add up instead of a string of "+0.00" (review 2026-10-03).
  const last = v.history[v.history.length - 1];
  if (Math.abs(delta) < W.historyEpsilon && last && last.reason === reason) {
    // Keep the span: `from` is the first change folded in, `at` the latest (a UI filtering by day reads both).
    last.from ??= last.at;
    last.count = (last.count ?? 1) + 1;
    last.delta += delta;
    last.at = at;
    if (last.action !== action) delete last.action;
    return;
  }
  const entry: VoiceRelation['history'][number] = { at, delta, reason };
  if (action !== undefined) entry.action = action;
  v.history.push(entry);
  if (v.history.length > W.maxVoiceHistory) v.history.splice(0, v.history.length - W.maxVoiceHistory);
}

/**
 * SCOPE (precommitment, owner API): the person binds their own future choice ("no work after the evening prayer",
 * "walk instead of eating when bored"): a `precommit:<id>` term of `bias` (negative = against, positive = toward) on the
 * action inside a daily window of minutes-of-day (`from` > `to` wraps midnight). Shape: self-imposed
 * restraint as a standing cost on the tempting option (Ariely & Wertenbroch 2002, qualitative effect only); the
 * bias is the host's number, not fitted. It never vetoes, so need and duty still win when strong.
 * A precommitment with the same action and window replaces the earlier one; at most `maxPrecommitments` are
 * held (oldest dropped). Does not model forgetting, renegotiation or lapse-then-abandon dynamics.
 */
export function precommit(
  p: Person,
  pc: { action: string; bias: number; from: number; to: number },
): WillState['precommitments'][number] {
  const W = WILL_DEFAULTS;
  const norm = (m: number) => ((Math.round(m) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const bias = Number.isFinite(pc.bias) ? Math.max(-1, Math.min(1, pc.bias)) : 0;
  const fromMinuteOfDay = norm(Number.isFinite(pc.from) ? pc.from : 0);
  const toMinuteOfDay = norm(Number.isFinite(pc.to) ? pc.to : 0);
  const list = p.will.precommitments;
  const i = list.findIndex(
    (x) =>
      x.action === pc.action && x.fromMinuteOfDay === fromMinuteOfDay && x.toMinuteOfDay === toMinuteOfDay,
  );
  if (i >= 0) list.splice(i, 1);
  const entry = { id: `pc${p.now}-${pc.action}`, action: pc.action, bias, fromMinuteOfDay, toMinuteOfDay };
  list.push(entry);
  if (list.length > W.maxPrecommitments) list.splice(0, list.length - W.maxPrecommitments);
  return entry;
}

/** Drop a precommitment by id; returns whether one was held. */
export function releasePrecommitment(p: Person, id: string): boolean {
  const i = p.will.precommitments.findIndex((x) => x.id === id);
  if (i < 0) return false;
  p.will.precommitments.splice(i, 1);
  return true;
}

/**
 * Voice pressure decays over hours. Exact for any dt. Standing advice is not decayed here (its weight is read
 * in closed form from its `at`); entries already below the floor at `p.now + dt` are dropped to bound the list.
 */
export function advanceWill(p: Person, dt: number): void {
  if (dt <= 0) return;
  for (const v of p.will.voices) v.pressure = decay(v.pressure, dt, WILL_DEFAULTS.pressureHalfLife);
  if (p.will.advice && p.will.advice.length > 0) pruneAdvice(p, p.now + dt);
}

// --- lane will+cognition: standing advice (N9) ---

/**
 * SCOPE: standing advice. A `told` percept whose `advice` names an action ("see the doctor this week") leaves
 * a remembered suggestion from the speaker. Its weight is strength × the telling's salience × 0.5^(elapsed /
 * `adviceHalfLife`, about two days); cognition turns it into a `suggestion:remembered:<source>` term on that
 * action, scaled by trust in the source, so advice keeps pulling after the call ends and fades unless repeated.
 * Repeating the advice refreshes the entry (one per source and action); doing the advised action discharges it.
 * Borrowed shape: advice taking (people weigh advice by trust in the adviser) and exponential forgetting of
 * a single told item; the half-life is an engineering default, not a fitted value. It does not model
 * persuasion by repetition beyond the refresh, nagging (no pressure or reactance is added: the voice is not
 * speaking now), or advice the person argues back against; it yields no verdict and moves no voice counters.
 */
export function adviceWeight(a: StandingAdvice, now: Minute): number {
  const dt = Math.max(0, now - a.at);
  return clamp01(a.strength) * clamp01(a.salience) * dpow(0.5, dt / WILL_DEFAULTS.adviceHalfLife);
}

/** Standing advice still above the floor at `now` (read only; stable stored order). */
export function standingAdvice(p: Person, now: Minute): StandingAdvice[] {
  return (p.will.advice ?? []).filter((a) => adviceWeight(a, now) >= WILL_DEFAULTS.adviceFloor);
}

function pruneAdvice(p: Person, now: Minute): void {
  const kept = standingAdvice(p, now);
  if (kept.length === 0) delete p.will.advice;
  else p.will.advice = kept;
}

const sameAdvice = (a: StandingAdvice, b: { sourceId: EntityId; action: string; affordanceId?: string }) =>
  a.sourceId === b.sourceId && a.action === b.action && a.affordanceId === b.affordanceId;

/**
 * Store the advice carried by an attended percept (only `told` percepts with an `actorId` other than the
 * person). Returns the entries written. Writes only `p.will.advice`.
 */
export function rememberAdvice(p: Person, pc: Percept): StandingAdvice[] {
  const W = WILL_DEFAULTS;
  if (pc.channel !== 'told' || pc.actorId === undefined || pc.actorId === p.id || !pc.advice) return [];
  const written: StandingAdvice[] = [];
  const at = Number.isFinite(pc.at) ? Math.min(pc.at, p.now) : p.now;
  const list = p.will.advice ?? [];
  for (const item of pc.advice) {
    if (typeof item.action !== 'string' || item.action.length === 0) continue;
    const strength = clamp01(Number.isFinite(item.strength) ? (item.strength as number) : W.adviceStrength);
    const entry: StandingAdvice = {
      sourceId: pc.actorId,
      action: item.action,
      strength,
      salience: clamp01(Number.isFinite(pc.salience) ? pc.salience : 0),
      at,
    };
    if (item.affordanceId !== undefined) entry.affordanceId = item.affordanceId;
    const idx = list.findIndex((a) => sameAdvice(a, entry));
    if (idx >= 0) list.splice(idx, 1);
    list.push(entry);
    written.push(entry);
  }
  while (list.length > W.maxAdvice) {
    let weakest = 0;
    let b: StandingAdvice | undefined;
    for (const [i, a] of list.entries()) {
      if (b && adviceWeight(a, p.now) >= adviceWeight(b, p.now)) continue;
      weakest = i;
      b = a;
    }
    list.splice(weakest, 1);
  }
  if (list.length > 0) p.will.advice = list;
  return written;
}

/** The advised action was done: its standing advice (from every source) stops pulling. */
export function dischargeAdvice(p: Person, action: string): void {
  if (!p.will.advice) return;
  const kept = p.will.advice.filter((a) => a.action !== action);
  if (kept.length === 0) delete p.will.advice;
  else p.will.advice = kept;
}
