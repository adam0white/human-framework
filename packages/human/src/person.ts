/**
 * SCOPE: the composite. `createPerson` wires every faculty's constructor; `tick` advances all faculties in
 * closed form from `p.now` to a later minute under the current activity's body load (idle awake otherwise),
 * splitting at the activity's end; `perceive` runs attention, then beliefs, relationships, judgement of
 * others' acts, memory and appraisal; `decide` scores offers and resolves the will; `begin` and `finish`
 * bracket an activity and route the outcome into body, needs, skills, habits, memory, conscience, agenda,
 * relationships and trust in advising voices; `snapshot`/`restore` serialise. This file owns `now`,
 * `activity`, `trace` and `nextDecision`; every other slice is written only through its owning module. It
 * sequences the modules and makes no behavioural claims of its own beyond the engineering defaults listed in
 * `PERSON_DEFAULTS`.
 */
import {
  actionTendencies,
  advanceAffect,
  appraise,
  createAffect,
  feel,
  regulate,
  release,
} from './affect/index.ts';
import { advanceAgenda, createAgenda, onFinished, proposeGoals } from './agenda/index.ts';
import { advanceBeliefs, attend, believe, confirm } from './beliefs/index.ts';
import {
  advanceBody,
  consume,
  createBody,
  injure,
  nextBodyThreshold,
  readBody,
  sicken,
} from './body/index.ts';
import { decide as cognitionDecide, desperationOf, scoreAll } from './cognition/index.ts';
import { createConscience, heldNorms, recordDeed, recordRepair, repent } from './conscience/index.ts';
import { clamp01, clampSigned, createRng, minuteOfDay } from './core/index.ts';
import { advanceHabits, reinforce } from './habits/index.ts';
import { lifeModifiers } from './lifecourse/index.ts';
import { advanceMemory, createMemory, learnOutcome, remember } from './memory/index.ts';
import { intentionFor, narrateDecision, voiceLine } from './narrate/index.ts';
import { advanceNeeds, createNeeds, meanSatisfaction, readNeeds, satisfy } from './needs/index.ts';
import { practise, seedSkills } from './skills/index.ts';
import {
  advanceSocial,
  closeness,
  judge,
  relationshipWith,
  seedRelationships,
  socialEvent,
} from './social/index.ts';
import type {
  Activity,
  Affordance,
  AppraisalEvent,
  BodyLoad,
  BodyReadout,
  Commitment,
  DecisionRecord,
  Minute,
  NeedId,
  NeedReading,
  Outcome,
  Percept,
  Person,
  PersonSpec,
  PsychologicalNeed,
  SocialEventKind,
  Suggestion,
  SuggestionResolution,
  Traits,
  Values,
} from './types.ts';
import { ENGINE_VERSION, PERSON_SCHEMA, PHYSIOLOGICAL_NEEDS, PSYCHOLOGICAL_NEEDS } from './types.ts';
import { advanceWill, createWill, learnFromVoice, predictResponse } from './will/index.ts';

export const PERSON_DEFAULTS = {
  /** Body load while idle and awake. */
  idleLoad: { effort: 0.05, focus: 0.05, mode: 'awake' } as BodyLoad,
  /** Re-decide at least this often while an activity runs. */
  reviewInterval: 30,
  /** Review cadence while asleep: a sleeper only wakes for a body need or a strong disturbance. */
  sleepReviewInterval: 120,
  /** Longest interval advanced in one segment, so need-driven feelings are sampled on long idle ticks too. */
  maxSegment: 60,
  /** Perceived readouts at which a body need interrupts the current activity. */
  interruptThresholds: { hunger: 0.7, thirst: 0.7, sleepiness: 0.85 },
  maxTrace: 32,
  /** Belonging/leisure urgency above which loneliness/boredom are felt, and their gain. */
  lonelinessFrom: 0.25,
  boredomFrom: 0.35,
  moodEmotionGain: 0.8,
  /** Felt valence of an outcome: Σ (base + urgency) × realized delta. */
  feltBase: 0.3,
  feltGain: 1,
  failedPenalty: 0.3,
  /** Distress and esteem loss from a broken commitment, times its importance. */
  missedDistress: 0.4,
  missedEsteemCost: 0.05,
  /** Trust penalty per unit of bodily-need level lost during a suggested activity (needs left urgent). */
  voiceHarmGain: 1,
  /** Urgency above which a bodily need that fell during a suggested activity counts as harm. */
  voiceHarmUrgency: 0.5,
  /** Magnitude of social events implied by taking part together. */
  participationMagnitude: 0.5,
  /** Minutes of day treated as night for episode tags. */
  nightFrom: 20 * 60,
  nightTo: 5 * 60,
};

const TRAIT_KEYS: (keyof Traits)[] = [
  'honesty',
  'emotionality',
  'extraversion',
  'agreeableness',
  'conscientiousness',
  'openness',
];
const VALUE_KEYS: (keyof Values)[] = [
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
const SOCIAL_KINDS: readonly SocialEventKind[] = [
  'help',
  'harm',
  'gift',
  'insult',
  'thanks',
  'apology',
  'forgive',
  'promise-kept',
  'promise-broken',
  'chat',
  'conflict',
  'praise',
  'deceit-discovered',
  'shared-work',
];
const SOCIAL_ALIASES: Record<string, SocialEventKind> = { theft: 'harm', attack: 'harm', steal: 'harm' };

function fill<T extends object>(keys: (keyof T)[], given: Partial<T> | undefined, def: number): T {
  const out = {} as T;
  for (const k of keys) {
    const v = given?.[k];
    (out as Record<string, number>)[k as string] = clamp01(typeof v === 'number' ? v : def);
  }
  return out;
}

export function createPerson(spec: PersonSpec): Person {
  const now = spec.now ?? 0;
  const traits = fill<Traits>(TRAIT_KEYS, spec.traits, 0.5);
  const values = fill<Values>(VALUE_KEYS, spec.values, 0.5);
  const norms = spec.norms ?? heldNorms({ practice: values.tradition });
  const p: Person = {
    schema: PERSON_SCHEMA,
    engine: ENGINE_VERSION,
    id: spec.id,
    name: spec.name,
    now,
    rng: createRng(spec.seed),
    life: { bornAt: spec.bornAt, sex: spec.sex },
    body: createBody(spec.body, now),
    needs: createNeeds(spec.needs),
    traits,
    values,
    conscience: createConscience(norms),
    affect: createAffect(now),
    skills: seedSkills(spec.skills ?? {}, now),
    habits: [],
    memory: createMemory(),
    social: seedRelationships(spec.relationships ?? [], now),
    agenda: createAgenda({ commitments: spec.commitments, goals: spec.goals }, now),
    will: createWill(spec.voices),
    activity: null,
    trace: [],
    nextDecision: 0,
  };
  return p;
}

// ---------------------------------------------------------------------------------------------
// Readouts
// ---------------------------------------------------------------------------------------------

export interface PersonReadout {
  body: BodyReadout;
  needs: NeedReading[];
  desperation: number;
}

export function readPerson(p: Person): PersonReadout {
  const body = readBody(p);
  const needs = readNeeds(p, body);
  return { body, needs, desperation: desperationOf(needs) };
}

const levelOf = (needs: NeedReading[], id: NeedId): number => needs.find((n) => n.id === id)?.level ?? 1;
const urgencyOf = (needs: NeedReading[], id: NeedId): number => needs.find((n) => n.id === id)?.urgency ?? 0;

const emotionSum = (p: Person, id: string): number => {
  let s = 0;
  for (const e of p.affect.emotions) if (e.id === id) s += e.intensity;
  return clamp01(s);
};

/**
 * The last completed activity's action (habit cue), from the newest completed outcome episode. The
 * intention log is not used: it also records missed, interrupted and failed deeds.
 */
function lastAction(p: Person): string | undefined {
  const eps = p.memory.episodes;
  for (let i = eps.length - 1; i >= 0; i--) {
    const e = eps[i];
    if (e?.kind === 'outcome' && e.actorId === p.id && e.tags.includes('completed')) return e.action;
  }
  return undefined;
}

const isNight = (now: Minute): boolean => {
  const m = minuteOfDay(now);
  return m >= PERSON_DEFAULTS.nightFrom || m < PERSON_DEFAULTS.nightTo;
};

// ---------------------------------------------------------------------------------------------
// tick
// ---------------------------------------------------------------------------------------------

function advanceSegment(p: Person, dt: number, load: BodyLoad, aff: Affordance | undefined): void {
  const mods = lifeModifiers(p);
  const satisfaction = meanSatisfaction(readNeeds(p, readBody(p)));
  advanceBody(p, dt, load, mods);
  advanceNeeds(p, dt, {
    withOthers: (aff?.with?.length ?? 0) > 0,
    activityTags: aff?.tags ?? [],
    asleep: p.body.asleep,
  });
  advanceAffect(p, dt, satisfaction);
  advanceMemory(p, dt);
  advanceBeliefs(p, dt);
  advanceHabits(p, dt);
  advanceSocial(p, dt);
  advanceWill(p, dt);
}

/** Inject the emotions appraisal does not produce, without ratcheting repeated injections. */
function feelFromNeeds(p: Person, needs: NeedReading[]): void {
  const D = PERSON_DEFAULTS;
  const inject = (id: 'loneliness' | 'boredom', urgency: number, from: number, cause: string) => {
    if (urgency <= from) return;
    const target = clamp01((urgency - from) / (1 - from));
    const current = emotionSum(p, id);
    if (target > current + 0.05) feel(p, id, target, cause, p.now);
  };
  inject('loneliness', urgencyOf(needs, 'belonging'), D.lonelinessFrom, 'need:belonging');
  inject('boredom', urgencyOf(needs, 'leisure'), D.boredomFrom, 'need:leisure');
}

/**
 * Every broken commitment leaves a trace: a `missed` episode, distress scaled by importance, and a small
 * loss of esteem. Commitments with a linked norm are also routed through conscience as a breach.
 */
function recordMissed(p: Person, broken: Commitment[], now: Minute): void {
  for (const c of broken) {
    const action = c.actions[0] ?? c.kind;
    remember(p, {
      at: now,
      kind: 'missed',
      action,
      actorId: p.id,
      valence: -0.5 * c.importance,
      summary: `missed ${c.kind}: ${action}`,
      tags: ['missed', c.kind, ...(isNight(now) ? ['night'] : [])],
      ...(c.toId !== undefined && c.toId !== 'self' ? { targetId: c.toId } : {}),
    });
    appraise(p, {
      at: now,
      kind: 'event',
      desirability: -PERSON_DEFAULTS.missedDistress * c.importance,
      cause: `missed:${c.kind}:${action}`,
    });
    satisfy(p, { esteem: -PERSON_DEFAULTS.missedEsteemCost * c.importance });
    if (!c.normId) continue;
    const aff: Affordance = {
      id: `missed:${c.id}`,
      action: c.actions[0] ?? c.kind,
      label: `missed ${c.kind}`,
      duration: 0,
      effort: 0,
      advertises: {},
      norms: [{ normId: c.normId, relation: 'violates' }],
    };
    if (c.toId && c.toId !== 'self') aff.targetId = c.toId;
    const { appraisal } = recordDeed(p, aff, 'missed', now, true);
    for (const ev of appraisal) appraise(p, ev);
    if (c.toId && c.toId !== 'self') {
      socialEvent(p, {
        at: now,
        kind: 'promise-broken',
        otherId: c.toId,
        byMe: true,
        magnitude: c.importance,
      });
    }
  }
}

/**
 * Advance every faculty from `p.now` to `now`. The body load is the current activity's while it runs and
 * the idle awake load otherwise; the interval is split at the activity's end and at every multiple of
 * `maxSegment` minutes. At each such grid minute: feel loneliness/boredom from need urgency, close and recur
 * commitments (missed ones are recorded, with a breach when a norm is linked), and propose goals. Discrete
 * events are therefore independent of how a host chunks its calls; continuous state agrees to floating-point
 * rounding (~1e-9) unless calls also fall on the grid, in which case replay is byte-identical.
 */
export function tick(p: Person, now: Minute): void {
  if (now <= p.now) return;
  if (!p.body.alive) {
    p.now = now;
    return;
  }
  const seg = PERSON_DEFAULTS.maxSegment;
  while (p.now < now) {
    const act = p.activity;
    const active = act !== null && p.now < act.endsAt;
    // Segment boundaries sit on an absolute grid, so how a host chunks its calls does not change the result.
    const grid = (Math.floor(p.now / seg) + 1) * seg;
    const end = Math.min(active ? Math.min(now, act.endsAt) : now, grid);
    const load: BodyLoad =
      active && act ? { effort: act.effort, focus: act.focus, mode: act.mode } : PERSON_DEFAULTS.idleLoad;
    advanceSegment(p, end - p.now, load, active && act ? act.affordance : undefined);
    p.now = end;
    if (!p.body.alive) {
      p.activity = null;
      p.now = now;
      return;
    }
    // Discrete bookkeeping runs only on grid boundaries, so it happens at the same minutes whatever the
    // host's call pattern: feelings sampled from needs, missed commitments, spontaneous goals.
    if (end === grid) {
      const needs = readNeeds(p, readBody(p));
      feelFromNeeds(p, needs);
      const { broken } = advanceAgenda(p, end);
      recordMissed(p, broken, end);
      proposeGoals(p, readNeeds(p, readBody(p)), end);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// perceive
// ---------------------------------------------------------------------------------------------

function socialKindOf(kind: string): SocialEventKind | undefined {
  if ((SOCIAL_KINDS as readonly string[]).includes(kind)) return kind as SocialEventKind;
  return SOCIAL_ALIASES[kind];
}

function perceiveOne(p: Person, pc: Percept): void {
  const at = Math.min(Math.max(pc.at, p.affect.lastUpdated), p.now);
  const actor = pc.actorId;
  const target = pc.targetId;
  const aboutMe = target === p.id;
  const byMe = actor === p.id;

  // Beliefs: observation confirms, testimony persuades by source trust.
  for (const claim of pc.claims ?? []) {
    const direct = pc.channel === 'saw' || pc.channel === 'felt';
    if (direct && claim.confidence >= 0.9) confirm(p, claim.prop, claim.value, at);
    else believe(p, claim.prop, claim.value, claim.confidence, direct ? p.id : (actor ?? 'rumour'), at);
  }

  // Relationships: interactions I took part in.
  const social = socialKindOf(pc.kind);
  const magnitude = clamp01(Math.abs(pc.valence ?? pc.salience));
  if (social && actor !== undefined && target !== undefined && actor !== target) {
    if (aboutMe && !byMe) socialEvent(p, { at, kind: social, otherId: actor, byMe: false, magnitude });
    else if (byMe && !aboutMe) socialEvent(p, { at, kind: social, otherId: target, byMe: true, magnitude });
  }
  if (aboutMe && actor !== undefined && actor !== p.id) {
    if (pc.kind === 'apology') release(p, { id: 'anger', targetId: actor }, 0.5);
    if (pc.kind === 'forgive') release(p, { id: 'guilt', targetId: actor }, 0.5);
  }

  // Judgement of another's outward act by my own norms.
  let praiseworthiness = 0;
  if (!byMe && actor !== undefined && pc.norms && pc.norms.length > 0) {
    praiseworthiness = judgeDeed(p, actor, pc, at);
  }

  // Appraisal: how good or bad this is for me.
  let desirability = 0;
  const valence = clampSigned(pc.valence ?? 0);
  if (aboutMe) desirability = valence;
  else if (target !== undefined && target !== actor) desirability = valence * closeness(p, target);
  else if (target === undefined) desirability = 0.3 * valence;
  const loss = pc.kind === 'death' && target !== undefined && target !== p.id && closeness(p, target) > 0.3;
  if (!byMe && (desirability !== 0 || praiseworthiness !== 0 || loss)) {
    const ev: AppraisalEvent = {
      at,
      kind: praiseworthiness !== 0 ? 'deed' : 'event',
      desirability,
      cause: `event:${pc.kind}:${actor ?? pc.placeId ?? 'world'}`,
    };
    if (praiseworthiness !== 0) ev.praiseworthiness = praiseworthiness;
    if (actor !== undefined) {
      ev.agentId = actor;
      ev.affectionToAgent = relationshipWith(p, actor).affection;
    }
    if (target !== undefined) ev.targetId = target;
    if (loss) ev.loss = true;
    appraise(p, ev);
  }

  // Memory.
  const kind = pc.channel === 'told' ? 'told' : aboutMe && actor !== undefined ? 'social' : 'witnessed';
  const episode: Parameters<typeof remember>[1] = {
    at,
    kind,
    action: pc.kind,
    valence: byMe ? valence : desirability,
    summary: pc.summary,
    tags: [pc.kind, pc.channel, ...(isNight(at) ? ['night'] : [])],
  };
  if (actor !== undefined) episode.actorId = actor;
  if (target !== undefined) episode.targetId = target;
  if (pc.placeId !== undefined) episode.placeId = pc.placeId;
  remember(p, episode);
}

function judgeDeed(p: Person, actor: string, pc: Percept, at: Minute): number {
  const observed: {
    actorId: string;
    norms: NonNullable<Percept['norms']>;
    targetId?: string;
    valence?: number;
  } = {
    actorId: actor,
    norms: pc.norms ?? [],
  };
  if (pc.targetId !== undefined) observed.targetId = pc.targetId;
  if (pc.valence !== undefined) observed.valence = pc.valence;
  return judge(p, observed, p.conscience.norms, at).praiseworthiness;
}

/**
 * Attend to percepts (limited capacity), then encode what got through: claims into beliefs, interactions
 * into relationships, others' acts judged by my norms, appraisal into emotions, and an episode each.
 * Returns the percepts that were attended to.
 */
export function perceive(p: Person, percepts: readonly Percept[]): Percept[] {
  if (percepts.length === 0 || !p.body.alive) return [];
  const body = readBody(p);
  const attended = attend(p, [...percepts], {
    focus: p.activity?.focus ?? 0,
    fatigue: body.perceived.fatigue,
    fear: emotionSum(p, 'fear'),
  });
  for (const pc of attended) perceiveOne(p, pc);
  return attended;
}

// ---------------------------------------------------------------------------------------------
// decide / begin / finish
// ---------------------------------------------------------------------------------------------

export interface DecideOptions {
  suggestion?: Suggestion;
  /** Advance the person to this minute first. */
  now?: Minute;
  /** Hosts may disable the necessity exception. */
  necessity?: boolean;
}

/** The current activity as an offer with its remaining duration (so inertia can apply). */
function currentOffer(p: Person): Affordance | undefined {
  const act = p.activity;
  if (!act || p.now >= act.endsAt) return undefined;
  return { ...act.affordance, duration: act.endsAt - p.now };
}

/** Offers (plus the current activity) and the scoring context for a decision at `p.now`. Reads only. */
function decisionInputs(
  p: Person,
  affordances: readonly Affordance[],
  id: string,
  opts: DecideOptions,
): { list: Affordance[]; ctx: Parameters<typeof cognitionDecide>[2] } {
  const list = [...affordances];
  const current = currentOffer(p);
  if (current && !list.some((a) => a.id === current.id)) list.push(current);
  const { body, needs, desperation } = readPerson(p);
  const habit: { now: Minute; placeId?: string; lastAction?: string } = { now: p.now };
  const last = lastAction(p);
  if (last !== undefined) habit.lastAction = last;
  const ctx: Parameters<typeof cognitionDecide>[2] = {
    id,
    now: p.now,
    body,
    needs,
    mods: lifeModifiers(p),
    tendencies: actionTendencies(p),
    desperation,
    habit,
    necessity: opts.necessity ?? true,
  };
  if (opts.suggestion) ctx.suggestion = opts.suggestion;
  return { list, ctx };
}

/**
 * How this person would answer a suggestion right now, without changing them or consuming randomness
 * (hover telegraph). Does not advance time. With `temperature > 0`, read `likelihood` rather than the verdict.
 */
export function predict(
  p: Person,
  affordances: readonly Affordance[],
  suggestion: Suggestion,
  opts: { necessity?: boolean } = {},
): SuggestionResolution {
  const decideOpts: DecideOptions = { suggestion };
  if (opts.necessity !== undefined) decideOpts.necessity = opts.necessity;
  const { list, ctx } = decisionInputs(p, affordances, 'predict', decideOpts);
  const { considered, willCtx } = scoreAll(p, list, ctx);
  const res = predictResponse(p, considered, willCtx, suggestion);
  res.says = voiceLine(p, res, 'predict');
  return res;
}

/**
 * Score offers, resolve the will and record the decision (bounded trace). The current activity is always
 * among the options so that it can keep its inertia; choosing it again means "continue". A review that keeps
 * the running activity resolves a suggestion quietly: same verdict, no voice counters, pressure or autonomy
 * cost. A review that switches activity counts as a new choice.
 */
export function decide(
  p: Person,
  affordances: readonly Affordance[],
  opts: DecideOptions = {},
): DecisionRecord {
  if (opts.now !== undefined && opts.now > p.now) tick(p, opts.now);
  const { list, ctx } = decisionInputs(p, affordances, `d${p.nextDecision}`, opts);
  p.nextDecision += 1;
  const review = p.activity !== null;
  if (review) ctx.quiet = true;
  const { record, needDeltas } = cognitionDecide(p, list, ctx);
  if (review) record.review = true;
  if (needDeltas.autonomy !== undefined) satisfy(p, { autonomy: needDeltas.autonomy });
  record.intention = intentionFor(p, record);
  record.narration = narrateDecision(p, record);
  if (record.suggestion) {
    record.suggestion.says = voiceLine(p, record.suggestion, record.id);
    const continuing =
      review &&
      (record.chosenAffordanceId === null || record.chosenAffordanceId === p.activity?.affordanceId);
    if (record.suggestion.verdict === 'complied' && !continuing) {
      const chosen = list.find((a) => a.id === record.chosenAffordanceId);
      remember(p, {
        at: p.now,
        kind: 'suggestion',
        action: chosen?.action ?? 'comply',
        actorId: record.suggestion.voiceId,
        targetId: p.id,
        valence: -0.3,
        summary: `${record.suggestion.voiceId} insisted that I ${chosen?.label ?? 'do as told'}`,
        tags: ['suggestion', 'insist'],
      });
    }
  }
  p.trace.push(record);
  if (p.trace.length > PERSON_DEFAULTS.maxTrace) p.trace.splice(0, p.trace.length - PERSON_DEFAULTS.maxTrace);
  return record;
}

/** Start an activity chosen by `record`. Returns null when the person is dead. */
export function begin(p: Person, aff: Affordance, record: DecisionRecord): Activity | null {
  if (!p.body.alive) return null;
  const now = p.now;
  const duration = Number.isFinite(aff.duration) ? Math.max(1, Math.round(aff.duration)) : 1;
  const mode = aff.mode ?? 'awake';
  const load: BodyLoad = { effort: clamp01(aff.effort), focus: clamp01(aff.focus ?? 0), mode };
  const mods = lifeModifiers(p);
  const needsAtStart: Partial<Record<NeedId, number>> = {};
  for (const n of readNeeds(p, readBody(p))) needsAtStart[n.id] = n.level;
  const activity: Activity = {
    affordanceId: aff.id,
    action: aff.action,
    affordance: { ...aff, advertises: { ...aff.advertises } },
    needsAtStart,
    startedAt: now,
    endsAt: now + duration,
    effort: load.effort,
    focus: load.focus,
    mode,
    decisionId: record.id,
    intention: record.intention,
    reviewAt: now,
  };
  if (aff.targetId !== undefined) activity.targetId = aff.targetId;
  if (
    record.suggestion &&
    (record.suggestion.verdict === 'assented' || record.suggestion.verdict === 'complied')
  ) {
    activity.suggestion = record.suggestion;
    if (record.suggestion.verdict === 'complied') activity.protest = true;
  }
  p.activity = activity;
  advanceBody(p, 0, load, mods); // apply the sleep/wake switch now
  const review = load.mode === 'sleep' ? PERSON_DEFAULTS.sleepReviewInterval : PERSON_DEFAULTS.reviewInterval;
  const threshold = nextBodyThreshold(p, load, mods, PERSON_DEFAULTS.interruptThresholds, review);
  activity.reviewAt = now + Math.max(1, Math.min(review, threshold));
  if (aff.risk && aff.risk.chance > 0 && aff.risk.severity > 0) {
    appraise(p, {
      at: now,
      kind: 'prospect',
      desirability: -clamp01(aff.risk.severity),
      likelihood: clamp01(aff.risk.chance),
      cause: `prospect:${aff.action}${aff.targetId !== undefined ? `@${aff.targetId}` : ''}`,
    });
  }
  return activity;
}

/** Push the review time forward after a decision to continue the current activity. */
export function reviewed(p: Person): void {
  const act = p.activity;
  if (!act) return;
  const load: BodyLoad = { effort: act.effort, focus: act.focus, mode: act.mode };
  const review = load.mode === 'sleep' ? PERSON_DEFAULTS.sleepReviewInterval : PERSON_DEFAULTS.reviewInterval;
  const threshold = nextBodyThreshold(p, load, lifeModifiers(p), PERSON_DEFAULTS.interruptThresholds, review);
  act.reviewAt = p.now + Math.max(1, Math.min(review, threshold));
}

export interface FinishReport {
  status: Outcome['status'];
  /** How it felt, -1..1. */
  felt: number;
  realized: Partial<Record<NeedId, number>>;
  fulfilled: string[];
  breached: string[];
  kept: string[];
}

/**
 * Apply what happened. Physiological deltas go to the body, psychological ones to the needs, then skills,
 * habits, memory (expectation learning and an episode), conscience (deed, breaches, repair), agenda,
 * relationships, trust in the advising voice, injuries and illness. Clears the activity.
 */
export function finish(p: Person, outcome: Outcome): FinishReport | null {
  const act = p.activity;
  if (!act) return null;
  if (outcome.at > p.now) tick(p, outcome.at);
  const now = p.now;
  const aff = act.affordance;
  const completed = outcome.status === 'completed';
  const minutes = Math.max(0, now - act.startedAt);
  const mods = lifeModifiers(p);
  const D = PERSON_DEFAULTS;

  const before = readNeeds(p, readBody(p));
  const given = outcome.needs ?? {};
  const bodyDeltas: { food?: number; water?: number; relief?: number } = {};
  if (given.food) bodyDeltas.food = given.food;
  if (given.water) bodyDeltas.water = given.water;
  if (given.relief) bodyDeltas.relief = given.relief;
  consume(p, bodyDeltas);
  const psych: Partial<Record<PsychologicalNeed, number>> = {};
  for (const id of PSYCHOLOGICAL_NEEDS) if (given[id] !== undefined) psych[id] = given[id];
  satisfy(p, psych);
  if (outcome.injury) injure(p, outcome.injury);
  if (outcome.illness) sicken(p, outcome.illness);

  // Realized deltas: what the body actually took in for food/water/relief (a drink at full hydration
  // realizes nothing), host values for psychological needs, and measured since the start for sleep/rest.
  const after = readNeeds(p, readBody(p));
  const realized: Partial<Record<NeedId, number>> = {};
  for (const id of [...PHYSIOLOGICAL_NEEDS, ...PSYCHOLOGICAL_NEEDS]) {
    if (given[id] === undefined) continue;
    realized[id] =
      id === 'food' || id === 'water' || id === 'relief'
        ? levelOf(after, id) - levelOf(before, id)
        : given[id];
  }
  for (const id of ['sleep', 'rest'] as const) {
    if (aff.advertises[id] !== undefined && given[id] === undefined) {
      realized[id] = levelOf(after, id) - (act.needsAtStart[id] ?? levelOf(before, id));
    }
  }

  // Felt valence.
  let felt = 0;
  for (const id of Object.keys(realized) as NeedId[]) {
    felt += D.feltGain * (D.feltBase + urgencyOf(before, id)) * (realized[id] ?? 0);
  }
  if (outcome.status === 'failed') felt -= D.failedPenalty;
  if (outcome.injury) felt -= clamp01(outcome.injury.severity);
  if (outcome.illness) felt -= 0.5 * clamp01(outcome.illness.severity);
  if (outcome.material) felt += 0.1 * Math.sign(outcome.material);
  felt = clampSigned(felt);
  appraise(p, {
    at: now,
    kind: 'outcome',
    desirability: felt,
    cause: `outcome:${aff.action}${aff.targetId !== undefined ? `@${aff.targetId}` : ''}`,
  });

  // Skills and habits. Time spent practising counts even when the activity was interrupted.
  if (aff.skill && minutes > 0) {
    practise(p, aff.skill.id, minutes, aff.skill.difficulty, completed, mods.learning, now);
  }
  const prev = lastAction(p);
  if (completed) {
    const hctx: { now: Minute; placeId?: string; lastAction?: string } = { now };
    if (aff.placeId !== undefined) hctx.placeId = aff.placeId;
    if (prev !== undefined) hctx.lastAction = prev;
    reinforce(p, aff.action, hctx);
  }

  // Memory.
  learnOutcome(p, aff, outcome, realized, felt);
  const episode: Parameters<typeof remember>[1] = {
    at: now,
    kind: 'outcome',
    action: aff.action,
    actorId: p.id,
    valence: felt,
    summary: outcome.summary ?? `${aff.label}: ${outcome.status}`,
    tags: [...(aff.tags ?? []), outcome.status, ...(isNight(act.startedAt) ? ['night'] : [])],
  };
  if (aff.targetId !== undefined) episode.targetId = aff.targetId;
  if (aff.placeId !== undefined) episode.placeId = aff.placeId;
  remember(p, episode);

  // Conscience.
  const deed = recordDeed(p, aff, act.intention, now, completed);
  for (const ev of deed.appraisal) appraise(p, ev);
  const tags = aff.tags ?? [];
  if (completed && (tags.includes('worship') || tags.includes('repent'))) {
    // Worship closes breaches against God alone; guilt toward a wronged person waits for repair.
    const repented = new Set<string>();
    for (const b of p.conscience.breaches) {
      if (!b.repaired && b.victimId === undefined && repent(p, b.id, now)) repented.add(b.normId);
    }
    for (const b of p.conscience.breaches)
      if (!b.repaired && b.victimId !== undefined) repented.delete(b.normId);
    for (const normId of [...repented].sort())
      release(p, { id: 'guilt', causePrefix: `breach:${normId}` }, 0.6);
    regulate(p, minutes, 'worship');
  }
  if (completed && (tags.includes('repair') || tags.includes('apologize')) && aff.targetId !== undefined) {
    recordRepair(p, aff.targetId, now);
    release(p, { id: 'guilt', targetId: aff.targetId });
    socialEvent(p, { at: now, kind: 'apology', otherId: aff.targetId, byMe: true, magnitude: 0.7 });
  }
  if (act.mode === 'sleep' || tags.includes('rest') || tags.includes('reflection')) {
    regulate(p, minutes, tags.includes('reflection') ? 'reflection' : 'rest');
  }

  // Agenda.
  const { kept } = onFinished(p, outcome, act.startedAt);
  for (const c of kept) {
    if (c.toId && c.toId !== 'self') {
      socialEvent(p, { at: now, kind: 'promise-kept', otherId: c.toId, byMe: true, magnitude: c.importance });
    }
  }

  // Relationships from taking part together.
  if (completed) {
    const kind: SocialEventKind = tags.includes('work') ? 'shared-work' : 'chat';
    for (const other of aff.with ?? []) {
      if (other === p.id) continue;
      socialEvent(p, { at: now, kind, otherId: other, byMe: true, magnitude: D.participationMagnitude });
    }
    if (aff.targetId !== undefined && aff.targetId !== p.id) {
      const care = tags.includes('help') ? 'help' : tags.includes('gift') ? 'gift' : undefined;
      if (care) socialEvent(p, { at: now, kind: care, otherId: aff.targetId, byMe: true, magnitude: 0.7 });
    }
  }

  // Trust in the voice that suggested it: how it felt, minus bodily harm the host's deltas do not show
  // (needs that fell during the activity and are now urgent).
  if (act.suggestion) {
    let harm = 0;
    for (const id of ['food', 'water', 'sleep', 'rest'] as const) {
      if (urgencyOf(after, id) < D.voiceHarmUrgency) continue;
      harm += Math.max(0, (act.needsAtStart[id] ?? levelOf(after, id)) - levelOf(after, id));
    }
    learnFromVoice(p, act.suggestion, clampSigned(felt - D.voiceHarmGain * harm));
  }

  p.activity = null;
  // Leave the activity's body mode now (wake up from sleep) so the next decision is not vetoed 'asleep'.
  advanceBody(p, 0, PERSON_DEFAULTS.idleLoad, mods);
  if (outcome.percepts && outcome.percepts.length > 0) perceive(p, outcome.percepts);
  return {
    status: outcome.status,
    felt,
    realized,
    fulfilled: deed.fulfilled,
    breached: deed.breached,
    kept: kept.map((c) => c.id),
  };
}

// ---------------------------------------------------------------------------------------------
// snapshot / restore
// ---------------------------------------------------------------------------------------------

export function snapshot(p: Person): Person {
  return structuredClone(p);
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

const REQUIRED_OBJECTS: (keyof Person)[] = [
  'rng',
  'life',
  'body',
  'needs',
  'traits',
  'values',
  'conscience',
  'affect',
  'skills',
  'memory',
  'social',
  'agenda',
  'will',
];

/** Kind of a JSON value for the per-field type check in `restore`. */
const kindOf = (x: unknown): string => (Array.isArray(x) ? 'array' : x === null ? 'null' : typeof x);

/**
 * Fill `saved` from `defaults`, recursively for plain objects: a field that is missing, non-finite, or of a
 * different JSON kind than the default takes the default. Fields absent from the defaults (optional ones)
 * are kept as saved. Arrays are taken whole.
 */
function fillFrom(
  defaults: Record<string, unknown>,
  saved: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...saved };
  for (const [k, def] of Object.entries(defaults)) {
    const v = saved[k];
    const dk = kindOf(def);
    if (v === undefined || kindOf(v) !== dk || (dk === 'number' && !Number.isFinite(v as number))) {
      out[k] = structuredClone(def);
    } else if (dk === 'object') {
      out[k] = fillFrom(def as Record<string, unknown>, v as Record<string, unknown>);
    }
  }
  return out;
}

/**
 * Validate a saved person and fill defaults for missing or mistyped fields, slice by slice and field by
 * field. Throws on a wrong schema, a missing core slice, or a save from a different engine version
 * (incompatible simulation changes are versioned explicitly; migrate the JSON before restoring).
 */
export function restore(json: unknown): Person {
  if (!isObject(json)) throw new Error('restore: not an object');
  if (json.schema !== PERSON_SCHEMA) throw new Error(`restore: unsupported schema ${String(json.schema)}`);
  if (typeof json.engine !== 'string') throw new Error('restore: missing engine');
  if (json.engine !== ENGINE_VERSION)
    throw new Error(
      `restore: save is from engine ${json.engine}, this is ${ENGINE_VERSION}; migrate it first`,
    );
  if (typeof json.id !== 'string' || typeof json.name !== 'string')
    throw new Error('restore: missing identity');
  if (typeof json.now !== 'number') throw new Error('restore: missing now');
  for (const k of REQUIRED_OBJECTS) if (!isObject(json[k])) throw new Error(`restore: missing ${k}`);
  const life = json.life as Record<string, unknown>;
  const defaults = createPerson({
    id: json.id,
    name: json.name,
    seed: 0,
    now: json.now,
    bornAt: typeof life.bornAt === 'number' ? life.bornAt : 0,
    sex: life.sex === 'female' ? 'female' : 'male',
  });
  const saved = structuredClone(json);
  const out = { ...defaults, ...(saved as Partial<Person>) } as Person;
  const slices = out as unknown as Record<string, unknown>;
  const defs = defaults as unknown as Record<string, unknown>;
  for (const k of REQUIRED_OBJECTS) {
    slices[k] = fillFrom(defs[k] as Record<string, unknown>, saved[k] as Record<string, unknown>);
  }
  if (!Array.isArray(out.habits)) out.habits = [];
  if (!Array.isArray(out.trace)) out.trace = [];
  if (typeof out.nextDecision !== 'number') out.nextDecision = 0;
  if (out.activity === undefined) out.activity = null;
  return out;
}
