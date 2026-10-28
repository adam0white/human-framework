import { cloneData } from '../core/clone.ts';
import type {
  ActorState,
  BodyReadout,
  Command,
  Commitment,
  Considered,
  EffectiveParameters,
  EntityId,
  Offer,
  PerceptData,
  RefusalKind,
  Signed,
  StandingAdvice,
  Suggestion,
  SuggestionResolution,
  SuggestionVerdict,
  Time,
  Unit,
  VoiceRelation,
  WillState,
} from '../run-schema.ts';

type WillActor = ActorState & { effective: EffectiveParameters };
type WillMutable = Pick<WillActor, 'will' | 'now'>;
const MINUTES_PER_DAY = 1440,
  MINUTES_PER_HOUR = 60;

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
 * 2.8.0: `seedVoice` sets an authored starting trust after creation; `noteVoicePromise` learns from whether the
 * voice kept its own promise; a decision with `reconsider` (WillContext) gives the running activity no inertia
 * bonus, for a review the host forces because something changed (promise inertia, a cognition term, stays).
 */
import { crisisOwner } from '../affect/crisis.ts';
import { commitmentPressure, isUnderWay, pressureReachedAt, spanMeetsWindow } from '../agenda/index.ts';
import { bodyOwner } from '../body/body.ts';
import { CONSCIENCE_DEFAULTS, normVeto } from '../conscience/index.ts';
import { clamp01, cmpStr, decay, dexp, dpow, random, round } from '../core/index.ts';

import { skillLevel } from '../skills/index.ts';
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
   * A voice's own promise (2.8.0, `noteVoicePromise`): a kept promise moves trust this share of the way toward 1, a
   * broken one this share toward 0. Broken weighs more than kept (trust asymmetry, unaudited citations in research/empirical-models.md §6b: Slovic 1993; broken promises
   * damage trust and kept ones restore it only gradually, Schweitzer, Hershey and Bradlow 2006: research/
   * empirical-models.md §6b). Shape only; the numbers are engineering defaults equal to `trustGain`/`trustLoss`.
   */
  promiseKeptGain: 0.1,
  promiseBrokenLoss: 0.25,
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
interface WillContext {
  frame: import('../run-schema.ts').FrameContext;
  now: Time;
  affordances: readonly Offer[];
  body: BodyReadout;
  /** Max physiological urgency. */
  desperation: number;

  /** Need urgencies (optional; used for the survival check on insisting). */
  needs?: readonly {
    id: string;
    urgency: number;
  }[];
  /** A host command in force (1.6.0); see the command SCOPE on `commandOutcome`. */
  command?: Command;
  /** No inertia bonus for the running activity in this decision (2.8.0, `DecideOptions.reconsider`). */
  reconsider?: boolean;
}
/**
 * How a command fared in one decision. `holds`: the commanded option was chosen. Otherwise `ends` says whether
 * control is lost (dead, a break, downed, or an act they will not do) or only suspended for this decision (the
 * target is not on offer, or they cannot right now: asleep, beyond capacity, a pressing bodily need).
 */
interface CommandOutcome {
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
interface ChoiceResolution {
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
function voiceOf(p: WillMutable, voiceId: EntityId): VoiceRelation | undefined {
  return p.will.voices.find((v) => v.voiceId === voiceId);
}
function ensureVoice(p: WillMutable, voiceId: EntityId): VoiceRelation {
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
function adoptVoiceTrust(p: WillMutable, voiceId: EntityId, target: Unit, rate: Unit): VoiceRelation {
  const v = ensureVoice(p, voiceId);
  const r = clamp01(Number.isFinite(rate) ? rate : 0);
  const t = clamp01(Number.isFinite(target) ? target : v.trust);
  v.trust = clamp01(v.trust + r * (t - v.trust));
  return v;
}
/**
 * SCOPE (a voice's own promise, 2.8.0): the voice said it would do something ("I will carry food up by 18:00") and
 * the host reports whether it did. This is evidence about the voice's word, separate from how following its advice
 * felt (`learnFromVoice`), so it needs no suggestion resolution and works for a request that was only deferred.
 * Kept moves trust `promiseKeptGain` of the way toward 1, divided by 1 + n where n is the decayed count of kept
 * promises already credited for the same action (key `promise:<action>` in `credited`), so a string of trivial
 * promises cannot farm trust (these keys share `credited` and its `maxCredited` bound with advice credits, so a
 * host with many promise actions can evict older entries of either kind, which only shortens a discount);
 * broken moves it `promiseBrokenLoss` toward 0, undiscounted. History reasons are
 * `promise-kept` and `promise-broken`. The voice is added if absent (bounded like any new voice). Does not model
 * excuses, partial keeping, apology, or the size of what was promised; the host judges kept or broken.
 */
function noteVoicePromise(
  p: WillActor,
  voiceId: EntityId,
  event: {
    kept: boolean;
    at?: Time;
    action?: string;
  },
): VoiceRelation {
  const W = WILL_DEFAULTS;
  const v = ensureVoice(p, voiceId);
  const at = event.at !== undefined && Number.isFinite(event.at) ? event.at : p.now;
  const before = v.trust;
  if (event.kept) {
    const key = `promise:${event.action ?? ''}`;
    v.credited ??= [];
    const list = v.credited;
    const prior = list.find((c) => c.action === key);
    const n = prior ? decay(prior.n, Math.max(0, at - prior.at), W.creditHalfLife * 60000) : 0;
    v.trust = clamp01(v.trust + (W.promiseKeptGain * (1 - v.trust)) / (1 + n));
    if (prior) {
      prior.n = n + 1;
      prior.at = at;
    } else list.push({ action: key, n: 1, at });
    if (list.length > W.maxCredited) {
      list.sort((a, b) => b.at - a.at);
      list.length = W.maxCredited;
    }
  } else v.trust = clamp01(v.trust - W.promiseBrokenLoss * v.trust);
  noteTrust(v, v.trust - before, event.kept ? 'promise-kept' : 'promise-broken', at, event.action);
  return v;
}
const finite = (x: number | undefined): boolean => x === undefined || Number.isFinite(x);
/** Host numbers the framework computes with must be finite; a NaN offer is vetoed, never chosen. */
function wellFormed(aff: Offer): boolean {
  if (!Number.isFinite(aff.demands.effort) || !Number.isFinite(aff.durationMs) || !finite(aff.demands.focus))
    return false;
  if (!finite(aff.expected.material)) return false;
  for (const v of Object.values(aff.expected.needs)) if (!finite(v)) return false;
  if (
    aff.expected.risk &&
    (!Number.isFinite(aff.expected.risk.chance) || !Number.isFinite(aff.expected.risk.severity))
  )
    return false;
  return true;
}
const servesCommitment = (c: Commitment, aff: import('../run-schema.ts').DeepReadonly<Offer>): boolean =>
  (aff.fulfills?.includes(c.id) ?? false) ||
  (c.actions.includes(aff.actionId) && (c.targetId === undefined || c.targetId === aff.target));
/** Whether `aff` serves a pending commitment whose window is about to close (pressure ≥ wake level). */
function pressingCommitment(p: WillActor, aff: Offer, now: Time): boolean {
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
function wakeReviewAt(p: WillActor, now: Time): Time | undefined {
  let best: Time | undefined;
  for (const c of p.agenda.commitments) {
    if (c.status !== 'pending' || c.kind === 'abstain' || c.exempt !== undefined || now >= c.until) continue;
    const at = pressureReachedAt(c, WILL_DEFAULTS.wakeCommitmentPressure);
    if (at === undefined || at <= now) continue;
    if (best === undefined || at < best) best = at;
  }
  return best;
}
/** A pending commitment linked to a held obligatory norm with conviction >= `omissionConviction` (no time test). */
function protectedDuty(p: WillActor, c: Commitment): boolean {
  if (c.status !== 'pending' || c.normId === undefined) return false;
  const held = p.conscience.norms.find((n) => n.normId === c.normId);
  return held?.standing === 'obligatory' && held.conviction >= WILL_DEFAULTS.omissionConviction;
}
/** The first minute of a commitment's protected closing stretch (the last 1 - omissionFraction of the window). */
const stretchStart = (c: Commitment): Time => c.from + WILL_DEFAULTS.omissionFraction * (c.until - c.from);
/**
 * Whether `aff` would keep duty `c` if chosen at `now`. Inside the window: any option serving it. Past the window's
 * end (1.9.0): only continuing the running activity that began inside the window (`agenda.isUnderWay`); a fresh start
 * after `until` would not count, so it does not exempt. Explicit completion-time commitments also require
 * the offered completion minute to fit; their underway activity never extends the deadline.
 */
function keepsDuty(p: WillActor, c: Commitment, aff: Offer, now: Time): boolean {
  if (now <= c.until)
    return (
      (c.completion !== 'end' || spanMeetsWindow(c, now, now + Math.max(0, aff.durationMs))) &&
      servesCommitment(c, aff)
    );
  return p.activity?.offer.id === aff.id && isUnderWay(p, c, now);
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
function closingDuties(p: WillActor, ctx: WillContext): Commitment[] {
  if (ctx.desperation >= CONSCIENCE_DEFAULTS.necessityThreshold) return [];
  const out: Commitment[] = [];
  for (const c of p.agenda.commitments) {
    if (!protectedDuty(p, c) || ctx.now < stretchStart(c)) continue;
    if (ctx.now > c.until && !isUnderWay(p, c, ctx.now)) continue;
    if (!ctx.affordances.some((a) => keepsDuty(p, c, a, ctx.now) && vetoFor(p, a, ctx) === undefined))
      continue;
    out.push(c);
  }
  return out;
}
/** The closing duty this option would make the person miss, if any (options keeping another duty are exempt). */
function omissionFor(
  p: WillActor,
  duties: readonly Commitment[],
  aff: Offer,
  now: Time,
): Commitment | undefined {
  if (duties.length === 0 || duties.some((c) => keepsDuty(p, c, aff, now))) return undefined;
  const end = now + Math.max(0, aff.durationMs);
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
function dutyReviewAt(
  p: WillActor,
  aff: import('../run-schema.ts').DeepReadonly<Offer>,
  now: Time,
  endsAt: Time,
): Time | undefined {
  let best: Time | undefined;
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
function distrustEpisode(p: WillActor, voiceId: EntityId, action: string, now: Time): string | undefined {
  const W = WILL_DEFAULTS;
  const trust = voiceOf(p, voiceId)?.trust ?? W.defaultVoiceTrust;
  if (trust >= W.distrustEpisodeTrust) return undefined;
  const eps = p.memory.episodes;
  for (let i = eps.length - 1; i >= 0; i--) {
    const e = eps[i];
    if (!e || now - e.at > W.distrustWindow * 60000) continue;
    if (e.kind !== 'outcome' || e.voiceId !== voiceId || e.action !== action) continue;
    if (e.valence <= W.distrustValence && e.salience >= W.distrustSalience) return e.id;
  }
  return undefined;
}
/** Capacity and conscience vetoes for one option. */
function vetoFor(
  p: WillActor,
  aff: Offer,
  ctx: WillContext,
):
  | {
      kind: 'cannot' | 'willNot';
      reason: string;
    }
  | undefined {
  const W = WILL_DEFAULTS;
  if (!p.body.alive) return { kind: 'cannot', reason: 'dead' };
  if (!wellFormed(aff)) return { kind: 'cannot', reason: 'invalid' };
  // A mental break narrows what they will do to its behaviour; a body at the edge may still eat, drink or sleep.
  if (
    crisisOwner.inBreak(p.affect.crisis, ctx.frame) &&
    !crisisOwner.allows(p.affect.crisis, aff, ctx.frame) &&
    !(ctx.desperation >= W.survivalDesperation && servesBody(aff))
  )
    return { kind: 'cannot', reason: 'break' };
  // Downed (body, 1.6.0): only lying, resting or sleeping where they are.
  if (p.body.downed && !bodyOwner.downedAllows(aff)) return { kind: 'cannot', reason: 'downed' };
  const mode = aff.demands.mode ?? 'awake';
  if (
    p.body.asleep &&
    mode === 'awake' &&
    ctx.desperation < W.wakeDesperation &&
    !pressingCommitment(p, aff, ctx.now)
  )
    return { kind: 'cannot', reason: 'asleep' };
  if (mode === 'sleep' && !p.body.asleep && ctx.body.perceived.sleepiness < W.sleepinessFloor)
    return { kind: 'cannot', reason: 'not-sleepy' };
  if (mode === 'awake' && clamp01(aff.demands.effort) > ctx.body.capacity * W.effortCapacityRatio)
    return { kind: 'cannot', reason: 'capacity' };
  if (aff.demands.requires) {
    const caps = bodyOwner.capacities(p.body, ctx.frame);
    for (const [c, need] of Object.entries(aff.demands.requires) as [keyof typeof caps, number][])
      if (caps[c] < need) return { kind: 'cannot', reason: `capacity:${c}` };
  }
  // A joint activity lends the partner's support, so the skill veto allows a wider gap.
  const support =
    aff.tags?.includes('joint') && (aff.participants?.length ?? 0) > 0 ? W.jointSkillSupport : 0;
  if (
    aff.demands.skill &&
    clamp01(aff.demands.skill.difficulty) - skillLevel(p, aff.demands.skill.id) > W.skillGap + support
  )
    return { kind: 'cannot', reason: `skill:${aff.demands.skill.id}` };
  const norm = normVeto(p, aff, ctx.desperation, { now: ctx.now });
  if (norm) return norm;
  return undefined;
}
/**
 * Whether suggestion `s` names offer `aff` (by affordance id, or by action class when it names no affordance); false
 * when there is no suggestion.
 */
export function suggestionTargets(s: Suggestion | undefined, aff: Offer): boolean {
  if (!s) return false;
  if (s.affordanceId !== undefined) return s.affordanceId === aff.id;
  return s.action !== undefined && s.action === aff.actionId;
}
/** NaN-safe utility: a non-finite score never wins. @internal */
export const safeUtility = (u: number): number => (Number.isNaN(u) ? Number.NEGATIVE_INFINITY : u);
const byUtilityThenId = (a: Considered, b: Considered): number =>
  safeUtility(b.utility) - safeUtility(a.utility) || cmpStr(a.affordanceId, b.affordanceId);
/** Dominant positive term of an option, or 'preference'. */
export function dominantTerm(c: Considered | undefined): string {
  if (!c) return 'preference';
  let best:
    | {
        source: string;
        value: number;
      }
    | undefined;
  for (const t of c.terms) if (t.value > 0 && (!best || t.value > best.value)) best = t;
  return best?.source ?? 'preference';
}
/** Largest advertised positive need of an option (the aim a near alternative may share). */
function mainAim(aff: Offer | undefined): string | undefined {
  if (!aff) return undefined;
  let best:
    | {
        id: string;
        v: number;
      }
    | undefined;
  for (const [id, v] of Object.entries(aff.expected.needs)) {
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
    let top:
      | {
          id: string;
          urgency: number;
        }
      | undefined;
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
  assentPressure?: number;
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
  p: WillActor,
  input: readonly Considered[],
  ctx: WillContext,
  given: readonly Suggestion[],
  draw: (() => number) | undefined,
): Evaluation {
  const cmd = ctx.command;
  // A commanding voice is not also weighed as a suggestion in the same decision.
  const suggestions = cmd ? given.filter((s) => s.voiceId !== cmd.voiceId) : given;
  const prepared = prepareVetoes(p, input, ctx, suggestions);
  const { considered, affById } = prepared;
  const selection = selectOption(
    p,
    considered,
    ctx,
    considered.some((c) => !c.vetoed) ? draw?.() : undefined,
  );
  const ev: Evaluation = {
    chosenId: selection.winner?.affordanceId ?? null,
    considered,
    resolutions: [],
    autonomyDelta: 0,
    voices: [],
  };
  if (cmd && arbitrateCommand(p, ctx, cmd, suggestions, prepared, selection, ev)) return ev;
  if (suggestions.length === 0) return withCommandRefusal(ev, cmd);
  if (crisisOwner.inBreak(p.affect.crisis, ctx.frame)) {
    // During a mental break no voice reaches them; nothing is counted for or against any of them.
    ev.resolutions = suggestions.map((s) => ({
      voiceId: s.voiceId,
      verdict: 'refused' as const,
      kind: 'cannot' as const,
      reason: 'break',
    }));
    ev.voices = suggestions.map((s) => ({ id: s.voiceId, pressure: 0, accepted: 0, refused: 0 }));
    if (ev.resolutions.length === 1) ev.suggestion = ev.resolutions[0];
    return withCommandRefusal(ev, cmd);
  }
  const judged = judgeVoices(p, ctx, suggestions, prepared, selection);
  arbitrateInsistence(p, judged, considered, affById, ev);
  ev.resolutions = judged.map((j) => j.res);
  ev.voices = judged.map((j) => j.side);
  const chosen = considered.find((c) => c.affordanceId === ev.chosenId);
  ev.suggestion =
    creditedResolution(ev.resolutions, chosen) ??
    (ev.resolutions.length === 1 ? ev.resolutions[0] : undefined);
  return withCommandRefusal(ev, cmd);
}
interface VetoPreparation {
  affById: ReadonlyMap<string, Offer>;
  duties: readonly Commitment[];
  baseVeto: ReadonlyMap<string, Considered['vetoed']>;
  distrustOf: ReadonlyMap<EntityId, string | undefined>;
  considered: Considered[];
}
/** Apply capacity, conscience, per-voice distrust and omission vetoes, in that order. */
function prepareVetoes(
  p: WillActor,
  input: readonly Considered[],
  ctx: WillContext,
  suggestions: readonly Suggestion[],
): VetoPreparation {
  const affById = new Map(ctx.affordances.map((a) => [a.id, a]));
  const duties = closingDuties(p, ctx);
  const servesDuty = (aff: Offer): boolean => duties.some((c) => keepsDuty(p, c, aff, ctx.now));
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
      if (!aff || !suggestionTargets(s, aff) || baseVeto.get(c.affordanceId) || tried.has(aff.actionId))
        continue;
      tried.add(aff.actionId);
      ep = distrustEpisode(p, s.voiceId, aff.actionId, ctx.now);
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
  return { affById, duties, baseVeto, distrustOf, considered };
}
interface Selection {
  winner: Considered | undefined;
  ranked: readonly Considered[];
  /** Inertia-adjusted score; target ranking still uses raw utility. */
  score: (c: Considered) => number;
}
/** Select once using the supplied draw; prediction passes no draw and stays deterministic. */
function selectOption(
  p: WillActor,
  considered: readonly Considered[],
  ctx: WillContext,
  draw: number | undefined,
): Selection {
  const W = WILL_DEFAULTS;
  // Selection: inertia for the current activity, then argmax or softmax.
  const live = considered.filter((c) => !c.vetoed);
  const current = p.activity;
  const score = (c: Considered): number => {
    if (!current || c.affordanceId !== current.offer.id || ctx.reconsider) return safeUtility(c.utility);
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
  return { winner, ranked, score };
}
/** Return true when a command holds and completes the evaluation ahead of all suggestions. */
function arbitrateCommand(
  p: WillActor,
  ctx: WillContext,
  cmd: Command,
  suggestions: readonly Suggestion[],
  prepared: VetoPreparation,
  selection: Selection,
  ev: Evaluation,
): boolean {
  const { considered, baseVeto, duties } = prepared;
  const { winner, score } = selection;
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
        }),
      ),
    ].sort((a, b) => cmpStr(a.voiceId, b.voiceId));
    ev.resolutions = all;
    ev.voices = all.map((r) => ({ id: r.voiceId, pressure: 0, accepted: 0, refused: 0 }));
    ev.suggestion = res;
    return true;
  }
  return false;
}
interface Judged {
  s: Suggestion;
  res: SuggestionResolution;
  side: VoiceSide;
  /** Insisted and would be complied with: the option and the utility gap it trailed by. */
  comply?: {
    target: Considered;
    gap: number;
  };
  targetIds: Set<string>;
}
function scoreReason(
  selection: Selection,
  live: readonly Considered[],
  targetIds: ReadonlySet<string>,
): SuggestionResolution['decidedBy'] {
  const { winner, ranked, score } = selection;
  if (!winner) return undefined;
  // A stochastic draw below the best live score was not decided by the scores.
  if (ranked.some((c) => !c.vetoed && score(c) > score(winner))) return undefined;
  // Compare against the closest suggested option by the same adjusted score the winner was chosen on.
  const suggested = [...live].sort(
    (a, b) => score(b) - score(a) || cmpStr(a.affordanceId, b.affordanceId),
  )[0];
  if (!suggested) return undefined;
  const gap = score(winner) - score(suggested);
  if (!Number.isFinite(gap) || gap < 0) return undefined;
  const margin = round(gap);
  const withoutInertia = [...ranked].sort(byUtilityThenId)[0];
  if (score(winner) > winner.utility && withoutInertia && targetIds.has(withoutInertia.affordanceId))
    return { kind: 'inertia', margin };
  const differences = new Map<string, number>();
  for (const t of winner.terms) differences.set(t.source, (differences.get(t.source) ?? 0) + t.value);
  for (const t of suggested.terms) differences.set(t.source, (differences.get(t.source) ?? 0) - t.value);
  const term = [...differences]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1] || cmpStr(a[0], b[0]))[0];
  return { kind: 'term', ...(term ? { source: term[0] } : {}), margin };
}
/** Judge each voice against the same selected option before resolving competing insistence. */
function judgeVoices(
  p: WillActor,
  ctx: WillContext,
  suggestions: readonly Suggestion[],
  prepared: VetoPreparation,
  selection: Selection,
): Judged[] {
  const W = WILL_DEFAULTS;
  const { considered, affById, distrustOf } = prepared;
  const { winner, ranked, score } = selection;
  const winnerAff = winner ? affById.get(winner.affordanceId) : undefined;
  const reason = dominantTerm(winner);
  return suggestions.map((s) => {
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
    // Eligibility follows the request; booking follows the final arbitrated verdict.
    if (!s.insist && Number.isFinite(s.strength) && s.strength >= p.effective.assent.minStrength)
      side.assentPressure = p.effective.assent.pressure;
    const resolution = (
      verdict: SuggestionVerdict,
      why: string,
      extra: Partial<SuggestionResolution> & {
        kind?: RefusalKind;
      } = {},
    ): SuggestionResolution => ({
      voiceId: s.voiceId,
      verdict,
      reason: why,
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
              counterOffer: {
                affordanceId: suggested[0]?.affordanceId,
                label: dutyLabel(duty, winnerAff, p),
              },
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
    const decidedBy = scoreReason(selection, liveSuggested, targetIds);
    const explanation = decidedBy ? { decidedBy } : {};
    const near =
      winnerAff !== undefined &&
      suggestedAff !== undefined &&
      (winnerAff.actionId === suggestedAff.actionId ||
        (mainAim(suggestedAff) !== undefined && mainAim(suggestedAff) === mainAim(winnerAff)));
    if (near && winnerAff)
      return out(
        resolution('modified', reason, {
          ...explanation,
          kind: 'notNow',
          insteadAffordanceId: winnerAff.id,
          counterOffer: { affordanceId: winnerAff.id, label: winnerAff.label },
        }),
      );
    return out(
      resolution('deferred', reason, {
        ...explanation,
        kind: 'notNow',
        insteadAffordanceId: winnerAff?.id,
        counterOffer: winnerAff
          ? {
              affordanceId: bestSuggested.affordanceId,
              label: afterTask(p, winnerAff.label),
            }
          : { affordanceId: bestSuggested.affordanceId, label: 'later' },
      }),
    );
  });
}
/** Settle competing insistence in the existing voice order, preserving equal-trust/strength ties. */
function arbitrateInsistence(
  p: WillActor,
  judged: Judged[],
  considered: readonly Considered[],
  affById: ReadonlyMap<string, Offer>,
  ev: Evaluation,
): void {
  const W = WILL_DEFAULTS;
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
    // The final option is imposed by insistence, not selected by scores.
    for (const j of judged) delete j.res.decidedBy;
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
          insteadAffordanceId: forced,
          counterOffer: {
            ...(firstTarget !== undefined ? { affordanceId: firstTarget } : {}),
            label: forcedAff ? afterTask(p, forcedAff.label) : 'later',
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
        };
        if (j.res.likelihood !== undefined) res.likelihood = j.res.likelihood;
        j.res = res;
      }
    }
  }
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
  p: WillActor,
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
    o: Omit<CommandOutcome, 'ownAffordanceId' | 'margin'> & {
      margin?: number;
    },
  ): CommandOutcome => ({
    margin: 0,
    ownAffordanceId: own,
    ...o,
  });
  if (!p.body.alive) return out({ holds: false, ends: true, reason: 'dead', kind: 'cannot' });
  const blocked = controlBlock(p, ctx);
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
const commandTargets = (cmd: Command, aff: Offer): boolean =>
  cmd.affordanceId !== undefined
    ? cmd.affordanceId === aff.id
    : cmd.action !== undefined && cmd.action === aff.actionId;
/** A state that ends direct control whatever the target: a mental break (affect) or being downed (body). */
function controlBlock(p: WillActor, ctx: WillContext): string | undefined {
  if (crisisOwner.inBreak(p.affect.crisis, ctx.frame)) return 'break';
  if (p.body.downed) return 'downed';
  return undefined;
}
/** Whether an offer serves a bodily need (positive food, water, sleep or rest advertisement). */
function servesBody(aff: Offer): boolean {
  const a = aff.expected.needs;
  return (a.food ?? 0) > 0 || (a.water ?? 0) > 0 || (a.sleep ?? 0) > 0 || (a.rest ?? 0) > 0;
}
/**
 * The resolution credited with the chosen option: a complied one first (the person did it because that voice
 * insisted), else the assented one whose suggestion term on the chosen option was largest, ties by voice id.
 */
function creditedResolution(
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
function creditedVoices(resolutions: readonly SuggestionResolution[]): SuggestionResolution[] {
  return resolutions.filter(
    (r) => r.verdict === 'assented' || r.verdict === 'complied' || r.verdict === 'commanded',
  );
}
/**
 * Literal-v1 contains arbitrary labels without inferring verbs or changing their bytes.
 * Only new counter-offers opt in; existing labels, rules, IDs and RNG remain unchanged.
 */
function afterTask(_p: WillActor, label: string): string {
  return label;
}
/** Counter-offer for a request deferred behind a duty: "after I pray", "after I feed the children". */
function dutyLabel(duty: Commitment | undefined, winner: Offer | undefined, _p: WillActor): string {
  return duty?.label ?? winner?.label ?? 'duty';
}
/**
 * Resolve a choice. `suggestion` is one voice or several (N1); with several, `suggestions` holds one resolution
 * per voice and `suggestion` the credited one. Writes voice pressure and counters (will-owned) unless `quiet`
 * (a review that keeps the running activity), and consumes RNG only when `temperature > 0`. The autonomy delta
 * is returned for the composite.
 */
function resolveChoice(
  p: WillActor,
  considered: readonly Considered[],
  ctx: WillContext,
  suggestion?: Suggestion | readonly Suggestion[],
  opts: {
    quiet?: boolean;
  } = {},
): ChoiceResolution {
  const list = asList(suggestion);
  const draw = p.will.temperature > 0 ? () => random(p.rng) : undefined;
  const ev = evaluate(p, considered, ctx, list, draw);
  if (opts.quiet && (ev.chosenId === null || ev.chosenId === p.activity?.offer.id)) {
    // A review that continues the running activity answers each received suggestion as 3.x answerNow did:
    // a refusal books that voice's side (counters, pressure, trust cost); anything else books nothing, and
    // there is no autonomy cost. A review that switches activity is a new choice and counts in full.
    const kept = ev.voices.flatMap((side, i) => {
      const res = ev.resolutions[i];
      return res?.verdict === 'refused' ? [{ side, res }] : [];
    });
    bookVoices(
      p,
      kept.map((k) => k.side),
      kept.map((k) => k.res),
      ctx.now,
    );
    ev.autonomyDelta = 0;
  } else bookVoices(p, ev.voices, ev.resolutions, ctx.now);
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
  p: WillActor,
  voices: Evaluation['voices'],
  resolutions: readonly SuggestionResolution[],
  now: Time,
): void {
  const W = WILL_DEFAULTS;
  for (const [i, side] of voices.entries()) {
    const v = ensureVoice(p, side.id);
    const res = resolutions[i];
    if (res?.verdict === 'assented' && side.accepted > 0 && side.assentPressure) {
      const pressure = clamp01(v.pressure + side.assentPressure) - v.pressure;
      v.pressure += pressure;
      res.assentCost = { pressure, provenance: 'engineering:hf4-assent-unfitted' };
    }
    v.pressure = clamp01(v.pressure + side.pressure);
    v.accepted += side.accepted;
    v.refused += side.refused;
    // Being insisted at while already pressed wears trust down, whatever they then do (engineering default), so
    // a voice that insists at every turn reaches the distrust refusal.
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
      (v.lastWornAt === undefined || now - v.lastWornAt >= W.wornInterval * 60000)
    ) {
      v.lastWornAt = now;
      const before = v.trust;
      v.trust = clamp01(v.trust * (1 - W.trustLossWorn));
      noteTrust(v, v.trust - before, 'worn', now);
    }
  }
}
const asList = (s: Suggestion | readonly Suggestion[] | undefined): Suggestion[] =>
  s === undefined
    ? []
    : Array.isArray(s)
      ? voicesIn(undefined, s as readonly Suggestion[])
      : [s as Suggestion];
/** Put a command in force (writes `p.will` only; the composite's `command` adds the memory and the interrupt). */
function takeCommand(p: WillActor, cmd: Command, now: Time): void {
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
function noteCommandOutcome(p: WillActor, holds: boolean, margin: number): boolean {
  const c = p.will.command;
  if (!c) return false;
  c.obeyed = holds;
  if (!holds) return false;
  c.margin = margin;
  if (c.remembered) return false;
  c.remembered = true;
  return true;
}
/** End the command in force, recording why (`lastCommand`). The composite materializes its time law before this boundary. */
function endCommand(p: WillMutable, reason: string, now: Time): void {
  const c = p.will.command;
  if (!c) return;
  p.will.lastCommand = { voiceId: c.voiceId, since: c.since, endedAt: now, reason };
  delete p.will.command;
}
/**
 * After a suggested activity finished: how it felt updates trust in the voice. Harm from followed advice
 * costs more than benefit earns. Only assented, complied or commanded resolutions carry information about the advice.
 */
function learnFromVoice(
  p: WillActor,
  resolution: SuggestionResolution,
  felt: Signed,
  event: {
    at?: Time;
    action?: string;
    reason?: string;
  } = {},
): void {
  const verdict = resolution.verdict;
  if (verdict !== 'assented' && verdict !== 'complied' && verdict !== 'commanded') return;
  learnVoiceOutcome(
    p,
    resolution.voiceId,
    felt,
    event,
    verdict === 'complied' || verdict === 'commanded',
    resolution.insisted === true,
  );
}
/** One trust-learning kernel for experienced advice and actual voice outcomes. */
function learnVoiceOutcome(
  p: WillActor,
  voiceId: EntityId,
  felt: Signed,
  event: { at?: Time; action?: string; reason?: string; creditKey?: string } = {},
  complied = false,
  insisted = false,
): void {
  const W = WILL_DEFAULTS;
  const v = ensureVoice(p, voiceId);
  const f = Math.max(-1, Math.min(1, felt));
  const before = v.trust;
  // A commanded activity is learned from as a complied one: no credit when it goes well, the faster loss when not.
  // A coerced or insisted activity that went well earns no trust: the person did not choose to follow the
  // advice freely (insisting on what they would have done anyway takes the credit away too).
  if (f > 0 && !complied && !insisted) {
    const at = event.at ?? p.now;
    const key = event.creditKey ?? event.action ?? '';
    v.credited ??= [];
    const list = v.credited;
    const prior = list.find((c) => c.action === key);
    const n = prior ? decay(prior.n, Math.max(0, at - prior.at), W.creditHalfLife * 60000) : 0;
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
function noteTrust(v: VoiceRelation, delta: number, reason: string, at: Time, action?: string): void {
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
 * Voice pressure decays over hours. Exact for any dt. Standing advice is not decayed here (its weight is read
 * in closed form from its `at`); entries already below the floor at `p.now + dt` are dropped to bound the list.
 */
function advanceWill(p: WillMutable, dt: number, d: EffectiveParameters['builtins']['WILL_DEFAULTS']): void {
  if (dt < 0 || !Number.isSafeInteger(dt)) throw new RangeError('Invalid Will duration');
  const k = Math.LN2 / (d.pressureHalfLife * 60000),
    attenuation = dexp(-k * dt);
  const command = p.will.command;
  for (const voice of p.will.voices) {
    const forcing =
      command?.obeyed && command.voiceId === voice.voiceId ? d.commandPressurePerHour / 3600000 : 0;
    voice.pressure = clamp01(voice.pressure * attenuation + (forcing / k) * (1 - attenuation));
    if (command?.obeyed && command.voiceId === voice.voiceId) {
      const before = voice.trust;
      voice.trust = clamp01(before * dexp((-d.commandTrustPerHour * clamp01(command.margin) * dt) / 3600000));
      noteTrust(voice, voice.trust - before, 'commanded', p.now + dt);
    }
  }
  if (command) command.chargedAt = p.now + dt;
  if (p.will.advice.length > 0) pruneAdvice(p, p.now + dt);
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
export function adviceWeight(a: StandingAdvice, now: Time): number {
  const dt = Math.max(0, now - a.at);
  return clamp01(a.strength) * clamp01(a.salience) * dpow(0.5, dt / (WILL_DEFAULTS.adviceHalfLife * 60000));
}
/** Standing advice still above the floor at `now` (read only; stable stored order). */
export function standingAdvice(p: WillMutable, now: Time): StandingAdvice[] {
  return p.will.advice.filter((a) => adviceWeight(a, now) >= WILL_DEFAULTS.adviceFloor);
}
function pruneAdvice(p: WillMutable, now: Time): void {
  const kept = standingAdvice(p, now);
  if (kept.length === 0) p.will.advice = [];
  else p.will.advice = kept;
}
const sameAdvice = (
  a: StandingAdvice,
  b: {
    sourceId: EntityId;
    action: string;
    affordanceId?: string;
  },
) => a.sourceId === b.sourceId && a.action === b.action && a.affordanceId === b.affordanceId;
/**
 * Store the advice carried by an attended percept (only `told` percepts with an `actorId` other than the
 * person). Returns the entries written. Writes only `p.will.advice`.
 */
function rememberAdvice(p: WillActor, pc: PerceptData): StandingAdvice[] {
  const W = WILL_DEFAULTS;
  if (pc.channel !== 'told' || pc.actorId === undefined || pc.actorId === p.id) return [];
  const written: StandingAdvice[] = [];
  const at = Number.isFinite(pc.occurredAt) ? Math.min(pc.occurredAt, p.now) : p.now;
  const list = p.will.advice;
  for (const item of pc.advice) {
    if (typeof item.action !== 'string' || item.action.length === 0) continue;
    const strength = clamp01(Number.isFinite(item.strength) ? (item.strength as number) : W.adviceStrength);
    const entry: StandingAdvice = {
      adviceId: item.adviceId,
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
function dischargeAdvice(p: WillMutable, action: string): void {
  const kept = p.will.advice.filter((a) => a.action !== action);
  if (kept.length === 0) p.will.advice = [];
  else p.will.advice = kept;
}

/** The canonical actor view is shallow: only this owner's state and cursor are copied. */
export const willOwner: import('../run-schema.ts').WillOwner = {
  commandForcing(state, context) {
    const command = state.command;
    if (!command?.obeyed) return { crisisStrainPerMinute: 0, needsPerMinute: {} };
    return {
      crisisStrainPerMinute: context.effective.builtins.CRISIS_DEFAULTS.commandStrainPerHour / 60,
      needsPerMinute: {
        autonomy:
          (-context.effective.builtins.WILL_DEFAULTS.commandAutonomyPerHour * clamp01(0.5 + command.margin)) /
          60,
      },
    };
  },
  initialize(input, context) {
    const d = context.effective.builtins.WILL_DEFAULTS;
    return {
      voices: input.voices.map((v) => ({
        voiceId: v.voiceId,
        trust: v.trust,
        pressure: 0,
        accepted: 0,
        refused: 0,
        history: [],
        seeded: true,
      })),
      precommitments: input.precommitments.map((p) => ({ ...p })),
      switchMargin: d.switchMargin,
      temperature: d.temperature,
      advice: [],
    };
  },
  decide(previous, context) {
    const state = cloneData(previous) as WillState;
    const cursor = {
      words: { ...context.rng.words },
      identity: { ...context.rng.identity, origin: { ...context.rng.identity.origin } },
    };
    const actor = {
      ...context.actor,
      will: state,
      rng: cursor.words,
      effective: context.effective,
    } as WillActor;
    const considered: Considered[] = context.offers.map((offer) => {
      const terms = context.terms.filter((t) => t.offerId === offer.id).map((t) => ({ ...t.term }));
      return {
        affordanceId: offer.id,
        action: offer.actionId,
        label: offer.label,
        utility: round(terms.reduce((sum, t) => sum + t.value, 0)),
        terms,
      };
    });
    const desperation = Math.max(
      0,
      ...context.needs
        .filter((n) => ['food', 'water', 'sleep', 'rest', 'relief'].includes(n.id))
        .map((n) => n.urgency),
    );
    const ctx: WillContext = {
      frame: context as import('../run-schema.ts').FrameContext,
      now: context.at,
      affordances: context.offers.map((o) => cloneData(o)) as Offer[],
      body: context.body as BodyReadout,
      desperation,
      reconsider: context.treatment === 'reconsider',
      needs: context.needs.map((n) => ({ ...n })),
      ...(state.command ? { command: state.command } : {}),
    };
    const result = resolveChoice(
      actor,
      considered,
      ctx,
      context.suggestions.map((s) => ({ ...s })),
      { quiet: context.actor.activity !== null },
    );
    // sfc32 advances d exactly once per consumed uniform, including uint32 wrap.
    cursor.identity.uniformDraws += (cursor.words.d - context.rng.words.d) >>> 0;
    const chosen = context.offers.find((o) => o.id === result.chosenAffordanceId);
    const decision: import('../run-schema.ts').DecisionRecord = {
      id: `d${context.person}-${context.actor.nextDecision}`,
      at: context.at,
      chosenAffordanceId: result.chosenAffordanceId,
      chosenAction: chosen?.actionId ?? null,
      considered: result.considered,
      intention: chosen?.actionId ?? 'wait',
    };
    if (result.suggestion) decision.suggestion = result.suggestion;
    if (result.suggestions) decision.suggestions = result.suggestions;
    // 3.x begin: an act a held prohibition vetoes, whose veto lifts only under the current
    // desperation, is done under necessity (Qur'an 2:173); conscience and agenda read the flag.
    const necessity =
      chosen !== undefined &&
      normVeto(actor, chosen as Offer, 0, { now: context.at }) !== undefined &&
      normVeto(actor, chosen as Offer, desperation, { now: context.at }) === undefined;
    const needReceipts: import('../run-schema.ts').WillAutonomyReceipt[] =
      result.autonomyDelta !== 0
        ? [{ kind: 'will-autonomy', evidenceId: decision.id, autonomy: result.autonomyDelta }]
        : [];
    const command =
      result.command && state.command
        ? {
            holds: result.command.holds,
            margin: result.command.margin,
            voiceId: state.command.voiceId,
            ends: result.command.ends,
            reason: result.command.reason,
          }
        : null;
    const reviewBoundaries = [
      wakeReviewAt(actor, context.at),
      chosen
        ? dutyReviewAt(actor, chosen, context.at, context.at + chosen.durationMs)
        : // Going on with the running activity keeps its duty boundary.
          actor.activity
          ? dutyReviewAt(actor, actor.activity.offer as Offer, context.at, actor.activity.endsAt)
          : undefined,
    ].filter((at): at is number => at !== undefined && at > context.at);
    return {
      state,
      decision,
      rng: cursor,
      resolutions: result.suggestions ?? [],
      needReceipts,
      command,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: reviewBoundaries.length ? Math.min(...reviewBoundaries) : null,
      advancedThrough: context.at,
      necessity,
    };
  },
  receive(previous, input, context) {
    const state = cloneData(previous) as WillState;
    const actor = { ...context.actor, will: state, effective: context.effective } as WillActor;
    const needReceipts: import('../run-schema.ts').WillAutonomyReceipt[] = [];
    const crisisReceipts: import('../run-schema.ts').WillMutationOutput['crisisReceipts'][number][] = [];
    const events: import('../run-schema.ts').EventData[] = [];
    if ('type' in input) {
      if (input.type === 'precommit') {
        const pc = input.precommitment;
        state.precommitments = state.precommitments.filter(
          (p) =>
            !(p.action === pc.action && p.fromMsOfDay === pc.fromMsOfDay && p.toMsOfDay === pc.toMsOfDay),
        );
        state.precommitments.push({ ...pc });
        state.precommitments = state.precommitments.slice(
          -context.effective.builtins.WILL_DEFAULTS.maxPrecommitments,
        );
      } else state.precommitments = state.precommitments.filter((p) => p.id !== input.precommitmentId);
    } else
      switch (input.kind) {
        case 'suggestion':
          ensureVoice(
            actor,
            input.received.kind === 'ordinary' ? input.received.suggestion.voiceId : input.received.voiceId,
          );
          break;
        case 'advice':
          rememberAdvice(actor, input.percept as PerceptData);
          break;
        case 'advice-withdrawn':
          state.advice = state.advice.filter(
            (a) => !(a.sourceId === input.data.voiceId && a.adviceId === input.data.adviceId),
          );
          break;
        case 'coercion': {
          takeCommand(
            actor,
            {
              voiceId: input.data.voiceId,
              affordanceId: input.data.offerId,
              since: context.at,
              repeat: input.data.repeat,
            },
            context.at,
          );
          break;
        }
        case 'coercion-withdrawn': {
          endCommand(actor, input.data.reason, context.at);
          break;
        }
        // SCOPE G8/G9: actual acts, answered requests and received support share
        // will's existing evidence owner. No synthetic assent, new trust rate or Person.
        case 'voice-evidence': {
          const { voiceId, evidence, evidenceId } = input.data;
          const voice = ensureVoice(actor, voiceId);
          const before = voice.trust;
          if (evidence.kind === 'support') {
            if (evidence.effect === 'comfort')
              crisisReceipts.push({ kind: 'comfort', receiptId: evidenceId });
          } else {
            learnVoiceOutcome(actor, voiceId, evidence.felt, {
              at: context.at,
              action: evidence.action,
              creditKey: `evidence:${evidence.kind}:${evidence.action}`,
              reason:
                evidence.kind === 'request'
                  ? evidence.granted
                    ? 'request-granted'
                    : 'request-refused'
                  : 'voice-act',
            });
          }
          events.push({
            kind: 'voice-evidence',
            voiceId,
            evidenceId,
            evidence: cloneData(evidence),
            before,
            after: voice.trust,
          });
          break;
        }
        case 'promise':
          noteVoicePromise(actor, input.data.voiceId, { ...input.data.promise, at: context.at });
          break;
        case 'settled':
          for (const resolution of creditedVoices(input.activity.suggestions))
            learnFromVoice(actor, resolution, input.felt, {
              at: context.at,
              action: input.activity.offer.actionId,
            });
          break;
        case 'action-started':
          dischargeAdvice(actor, input.activity.offer.actionId);
          break;
        case 'command-decision': {
          if (state.command && state.command.voiceId === input.decision.voiceId) {
            const first = noteCommandOutcome(actor, input.decision.holds, input.decision.margin);
            if (first)
              needReceipts.push({
                kind: 'will-autonomy',
                evidenceId: input.evidenceId,
                autonomy: -context.effective.builtins.WILL_DEFAULTS.commandAutonomyCost,
              });
          }
          if (input.decision.ends && state.command?.voiceId === input.decision.voiceId)
            endCommand(actor, input.decision.reason, context.at);
          break;
        }
      }
    return {
      state,
      resolutions: [],
      needReceipts,
      crisisReceipts,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events,
      nextBoundary: null,
      advancedThrough: context.at,
    };
  },
  advance(_previous, context) {
    const state = cloneData(context.continuation.state) as WillState;
    const elapsed = BigInt(context.to) - BigInt(context.continuation.anchor.at);
    if (elapsed < 0n || elapsed > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Invalid will span');
    const actor = { will: state, now: context.continuation.anchor.at };
    advanceWill(actor, Number(elapsed), context.effective.builtins.WILL_DEFAULTS);
    const needReceipts: import('../run-schema.ts').WillAutonomyReceipt[] = [];
    const crisisReceipts: import('../run-schema.ts').WillMutationOutput['crisisReceipts'][number][] = [];
    return {
      state,
      continuation: cloneData(
        context.continuation,
      ) as import('../run-schema.ts').DeliberationContinuation['will'],
      resolutions: [],
      needReceipts,
      crisisReceipts,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: context.to,
    };
  },
  receiveUpbringing(previous, input, context) {
    const state = cloneData(previous) as WillState;
    const carers = input.caregivers.filter((c) => c.id !== context.person),
      total = carers.reduce((sum, c) => sum + Math.max(0, c.warmth), 0);
    const age = (context.at - context.life.bornAt) / (365 * 86400000),
      plasticity = age <= 12 ? 1 : clamp01((25 - age) / 13);
    if (total > 0 && plasticity > 0) {
      const years = Number(BigInt(input.to) - BigInt(input.from)) / (365 * 86400000);
      const k = clamp01(
        1 -
          dpow(
            1 -
              clamp01((context.effective.builtins.FAMILY_DEFAULTS.voiceRatePerYear * total) / carers.length),
            years * plasticity,
          ),
      );
      const actor = { will: state, now: context.at };
      for (const id of [...new Set(carers.flatMap((c) => c.voices.map((v) => v.voiceId)))].sort(cmpStr)) {
        let target = 0,
          weight = 0;
        for (const carer of carers) {
          const voice = carer.voices.find((v) => v.voiceId === id);
          if (voice) {
            target += carer.warmth * voice.trust;
            weight += carer.warmth;
          }
        }
        if (weight > 0 && k > 0) adoptVoiceTrust(actor, id, target / weight, k);
      }
    }
    return {
      state,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: context.at,
    };
  },
  validate(state) {
    const issues: import('../run-schema.ts').ValidationIssue[] = [];
    const fail = (path: string) =>
      issues.push({ path, code: 'invalid-schema', message: 'Invalid will state' });
    if (
      state.voices.length > WILL_DEFAULTS.maxVoices ||
      state.advice.length > WILL_DEFAULTS.maxAdvice ||
      state.precommitments.length > WILL_DEFAULTS.maxPrecommitments ||
      new Set(state.voices.map((v) => v.voiceId)).size !== state.voices.length ||
      !Number.isFinite(state.temperature) ||
      state.temperature < 0 ||
      !Number.isFinite(state.switchMargin) ||
      state.switchMargin < 0
    )
      fail('will');
    for (const v of state.voices) {
      if (
        !v.voiceId ||
        !Number.isFinite(v.trust) ||
        v.trust < 0 ||
        v.trust > 1 ||
        !Number.isFinite(v.pressure) ||
        v.pressure < 0 ||
        v.pressure > 1 ||
        !Number.isSafeInteger(v.accepted) ||
        v.accepted < 0 ||
        !Number.isSafeInteger(v.refused) ||
        v.refused < 0 ||
        v.history.length > WILL_DEFAULTS.maxVoiceHistory
      )
        fail('will.voices');
      for (const h of v.history)
        if (!Number.isSafeInteger(h.at) || !Number.isFinite(h.delta) || !h.reason)
          fail('will.voices.history');
    }
    for (const advice of state.advice)
      if (
        !advice.adviceId ||
        !advice.sourceId ||
        !advice.action ||
        !Number.isSafeInteger(advice.at) ||
        !Number.isFinite(advice.strength) ||
        advice.strength < 0 ||
        advice.strength > 1 ||
        !Number.isFinite(advice.salience) ||
        advice.salience < 0 ||
        advice.salience > 1
      )
        fail('will.advice');
    if (
      new Set(state.advice.map((a) => JSON.stringify([a.sourceId, a.adviceId]))).size !== state.advice.length
    )
      fail('will.advice');
    if (
      state.command &&
      (!state.command.voiceId ||
        !Number.isSafeInteger(state.command.since) ||
        !Number.isSafeInteger(state.command.startedAt) ||
        !Number.isSafeInteger(state.command.chargedAt) ||
        state.command.chargedAt < state.command.startedAt ||
        !Number.isFinite(state.command.margin))
    )
      fail('will.command');
    for (const p of state.precommitments)
      if (
        !p.id ||
        !p.action ||
        !Number.isFinite(p.bias) ||
        !Number.isSafeInteger(p.fromMsOfDay) ||
        p.fromMsOfDay < 0 ||
        p.fromMsOfDay >= 86400000 ||
        !Number.isSafeInteger(p.toMsOfDay) ||
        p.toMsOfDay < 0 ||
        p.toMsOfDay >= 86400000
      )
        fail('will.precommitments');
    return issues;
  },
};
