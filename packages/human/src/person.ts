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
 *
 * Integration pass (2026-10-03, engine 1.2.0): several voices per decision (`DecideOptions.suggestions`), standing
 * advice remembered from `told` percepts, hearsay moving relationships, deaths marking ties, cue-triggered recall on
 * `begin` and on attended percepts (re-appraisal and grief), the fast's perception context read from the agenda and
 * the chronicle (`fastingCtx`), abstentions broken by eating, habit extinction on every completed action, exposures
 * reported by outcomes, purpose revision and the chronicle's day accumulator closed at midnight, and `skip` for
 * long-horizon runs. Each hook calls the owning module; nothing here writes another module's slice.
 */
import {
  actionTendencies,
  advanceAffect,
  appraise,
  CRISIS_DEFAULTS,
  checkCrisis,
  createAffect,
  easeBreak,
  emotionLevel,
  feel,
  readAffect,
  regulate,
  release,
  skipAffect,
  skipCrisis,
  strain,
  tendencyEmotions,
} from './affect/index.ts';
import {
  advanceAgenda,
  createAgenda,
  onFinished,
  promise,
  proposeGoals,
  revisePurposes,
} from './agenda/index.ts';
import { advanceBeliefs, attend, believe, confirm, credence } from './beliefs/index.ts';
import {
  advanceBody,
  BODY_DEFAULTS,
  type BodyPerceptionContext,
  checkDowned,
  clearDowned,
  consume,
  createBody,
  downedAllows,
  expose,
  injure,
  nextBodyThreshold,
  readBody,
  setDowned,
  sicken,
  skipBody,
} from './body/index.ts';
import {
  ageCharacter,
  enableCharacterChange,
  noteCharacterDay,
  noteCharacterSocial,
} from './character/index.ts';
import {
  closeDay,
  enableYearbook,
  endDay,
  noteAnswer,
  noteCommitments,
  noteDecision,
  noteMood,
  noteOutcome,
  trimChronicle,
} from './chronicle/index.ts';
import { decide as cognitionDecide, desperationOf, scoreAll } from './cognition/index.ts';
import {
  createConscience,
  heldNorms,
  normVeto,
  recordDeed,
  recordRepair,
  repent,
} from './conscience/index.ts';
import { clamp01, clampSigned, createRng, dayOf, isObj, minuteOfDay } from './core/index.ts';
import { ambientBodyParams, ambientModifiers, ambientMood, ambientNeeds } from './environment/index.ts';
import { aptitudeOf, createFamily, pregnancyModifiers } from './family/index.ts';
import { advanceHabits, reinforce, withholdCued } from './habits/index.ts';
import { ageYears, learningMultiplier, lifeModifiers } from './lifecourse/index.ts';
import {
  advanceMemory,
  type CueRecall,
  createMemory,
  enableGists,
  foldGists,
  learnOutcome,
  recallByCue,
  remember,
} from './memory/index.ts';
import { intentionFor, narrateDecision, voiceLine } from './narrate/index.ts';
import {
  advanceNeeds,
  createNeeds,
  levelOf,
  meanSatisfaction,
  readNeeds,
  satisfy,
  urgencyOf,
} from './needs/index.ts';
import { widow } from './partnering/index.ts';
import {
  enableSkillRetention,
  learnByWatching,
  practise,
  type SkillTransfer,
  seedSkills,
} from './skills/index.ts';
import {
  advanceSocial,
  applyReputationBelief,
  careFor,
  closeness,
  judge,
  markDeceased,
  relationshipWith,
  seedRelationships,
  socialEvent,
  threatAppraisal,
} from './social/index.ts';
import type {
  Activity,
  Affordance,
  AppraisalEvent,
  BodyLoad,
  BodyReadout,
  Command,
  Commitment,
  DayRecord,
  DecisionRecord,
  LearningDomain,
  Minute,
  NeedId,
  NeedReading,
  NormDefinition,
  Outcome,
  Percept,
  Person,
  PersonSpec,
  PsychologicalNeed,
  Retention,
  SocialEventKind,
  Suggestion,
  SuggestionResolution,
  Traits,
  Unit,
  Values,
} from './types.ts';
import {
  ENGINE_VERSION,
  MAX_MINUTE,
  PERSON_SCHEMA,
  PHYSIOLOGICAL_NEEDS,
  PSYCHOLOGICAL_NEEDS,
  TRAIT_KEYS,
  VALUE_KEYS,
} from './types.ts';
import {
  advanceWill,
  answerSuggestion,
  type CommandOutcome,
  chargeCommand,
  commandTargets,
  createWill,
  creditedVoices,
  dischargeAdvice,
  dutyReviewAt,
  endCommand,
  learnFromVoice,
  noteCommandOutcome,
  predictResponse,
  rememberAdvice,
  resolveCommand,
  takeCommand,
  voicesIn,
  WILL_DEFAULTS,
  wakeReviewAt,
} from './will/index.ts';

export const PERSON_DEFAULTS = {
  /** Body load while idle and awake. */
  idleLoad: { effort: 0.05, focus: 0.05, mode: 'awake' } as BodyLoad,
  /** Re-decide at least this often while an activity runs. */
  reviewInterval: 30,
  /** Closeness at or above which a 'comfort' percept from that person eases a mental break. */
  comfortCloseness: 0.3,
  /** Review cadence while asleep: a sleeper only wakes for a body need or a strong disturbance. */
  sleepReviewInterval: 120,
  /** Longest interval advanced in one segment, so need-driven feelings are sampled on long idle ticks too. */
  maxSegment: 60,
  /** Perceived readouts at which a body need interrupts the current activity. */
  interruptThresholds: { hunger: 0.7, thirst: 0.7, sleepiness: 0.85 },
  /** Decision records kept in `trace` (the most `Retention.trace` may ask for). */
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
  /** Outcome quality assumed for work done under protest when the host reports none (`Outcome.quality`). */
  protestQuality: 0.7,
  /** Felt valence lost per unit of quality below 1. */
  qualityPenalty: 0.4,
  /** Minutes after the activity's planned end during which a `begin` promise can still be kept. */
  promiseSlack: 30,
  /** Minutes of day treated as night for episode tags. */
  nightFrom: 20 * 60,
  nightTo: 5 * 60,
};

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

function fill<T extends object>(keys: readonly (keyof T)[], given: Partial<T> | undefined, def: number): T {
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
  if (spec.lexicon) p.lexicon = structuredClone(spec.lexicon);
  if (spec.retention) setRetention(p, spec.retention);
  const family = createFamily(spec.family);
  if (family) p.family = family;
  const on = spec.enable;
  if (on?.gists) enableGists(p);
  if (on?.yearbook) enableYearbook(p);
  if (on?.character) enableCharacterChange(p);
  if (on?.skillRetention) enableSkillRetention(p);
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

/**
 * What the person's practice does to interoception (N2b): an open `abstain` commitment covering `eat` means a
 * fast is in force now, and the consecutive prior days on which such a fast was kept (read from the chronicle's
 * kept notes, since the agenda prunes closed commitments within days) give the adaptation. Undefined when no
 * fast is open. Read only.
 */
function fastingCtx(p: Person): BodyPerceptionContext | undefined {
  const now = p.now;
  let open: Commitment | undefined;
  for (const c of p.agenda.commitments) {
    if (c.kind !== 'abstain' || c.status !== 'pending' || c.exempt !== undefined) continue;
    if (!(c.violatedBy?.includes('eat') ?? false) || now < c.from || now >= c.until) continue;
    open = c;
    break;
  }
  if (!open) return undefined;
  const label = open.label;
  const today = dayOf(now);
  const chronicle = p.chronicle ?? [];
  let days = 0;
  for (let i = chronicle.length - 1; i >= 0; i--) {
    const r = chronicle[i];
    if (!r || r.day !== today - 1 - days) break;
    if (!r.kept.some((n) => n.kind === 'abstain' && (label === undefined || n.label === label))) break;
    days += 1;
  }
  return { fasting: true, fastingDays: days };
}

/** `readBody` under the person's current perception context (the fast). Every readout in this file uses it. */
const readBodyOf = (p: Person): BodyReadout => readBody(p, BODY_DEFAULTS, fastingCtx(p));

export function readPerson(p: Person): PersonReadout {
  const body = readBodyOf(p);
  const needs = readNeeds(p, body);
  return { body, needs, desperation: desperationOf(needs) };
}

/**
 * Apply a cue recall: re-appraise non-loss memories at reduced intensity and feel grief for loss memories.
 * Returns the recalled episode ids.
 */
function applyRecall(p: Person, r: CueRecall): string[] {
  for (const ev of r.appraisals) appraise(p, ev);
  for (const g of r.grief) feel(p, 'grief', g.intensity, g.cause, g.at, g.targetId);
  return r.recalled;
}

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

/** Life modifiers for time passing: age, then pregnancy and the surroundings when present (1.8.0). */
function segmentModifiers(p: Person) {
  let mods = lifeModifiers(p);
  if (p.family?.pregnancy) mods = pregnancyModifiers(p, mods);
  if (p.ambient) mods = ambientModifiers(p, mods);
  return mods;
}

function advanceSegment(p: Person, dt: number, load: BodyLoad, aff: Affordance | undefined): void {
  const mods = segmentModifiers(p);
  const satisfaction = meanSatisfaction(readNeeds(p, readBodyOf(p)));
  advanceBody(p, dt, load, mods, p.ambient ? ambientBodyParams(p, BODY_DEFAULTS) : BODY_DEFAULTS);
  advanceNeeds(p, dt, {
    withOthers: (aff?.with?.length ?? 0) > 0,
    activityTags: aff?.tags ?? [],
    asleep: p.body.asleep,
  });
  if (p.ambient) satisfy(p, ambientNeeds(p, dt));
  advanceAffect(p, dt, satisfaction, p.ambient ? ambientMood(p) : undefined);
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
    const current = emotionLevel(p, id);
    if (target > current + 0.05) feel(p, id, target, cause, p.now);
  };
  inject('loneliness', urgencyOf(needs, 'belonging'), D.lonelinessFrom, 'need:belonging');
  inject('boredom', urgencyOf(needs, 'leisure'), D.boredomFrom, 'need:leisure');
}

/**
 * Every broken commitment leaves a trace: a `missed` episode, distress scaled by importance, and a small
 * loss of esteem. Commitments with a linked norm are also routed through conscience as a breach.
 */
function recordMissed(p: Person, broken: Commitment[], now: Minute, brokenBy?: string): void {
  for (const c of broken) {
    // An abstention has no fulfilling action; it is broken by the action that violated it.
    const action =
      c.actions[0] ?? (c.kind === 'abstain' ? (brokenBy ?? c.violatedBy?.[0]) : undefined) ?? c.kind;
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
      action,
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
 * A kept abstention (the fast held to its end) is the person's own deed: recorded through conscience as a
 * fulfilment of the linked norm (a felt sense of having kept a duty; nothing is computed about acceptance).
 */
function recordKeptAbstentions(p: Person, kept: Commitment[], now: Minute): void {
  for (const c of kept) {
    if (c.kind !== 'abstain' || !c.normId) continue;
    const aff: Affordance = {
      id: `kept:${c.id}`,
      action: c.label ?? 'abstain',
      label: `kept ${c.label ?? c.kind}`,
      duration: 0,
      effort: 0,
      advertises: {},
      norms: [{ normId: c.normId, relation: 'fulfills' }],
    };
    const { appraisal } = recordDeed(p, aff, 'kept', now, true);
    for (const ev of appraisal) appraise(p, ev);
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
    // A minute so large that the grid step rounds away cannot advance (security review H2): stop, never spin.
    if (!(end > p.now)) {
      p.now = now;
      return;
    }
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
      const needs = readNeeds(p, readBodyOf(p));
      feelFromNeeds(p, needs);
      const { broken, kept, released } = advanceAgenda(p, end);
      recordMissed(p, broken, end);
      if (broken.length > 0) noteCommitments(p, 'broken', broken);
      if (released.length > 0) noteCommitments(p, 'released', released);
      if (kept.length > 0) {
        noteCommitments(p, 'kept', kept);
        recordKeptAbstentions(p, kept, end);
      }
      const { episodes } = revisePurposes(p, end);
      for (const ep of episodes) remember(p, ep);
      proposeGoals(p, readNeeds(p, readBodyOf(p)), end);
      // Mental breaks (opt-in, `enableBreaks`): stress, recovery and the onset roll, hourly on the grid.
      if (p.affect.crisis) crisisStep(p, end);
      // Downing (1.6.0): timed downings end, derived ones (opt-in floor) start and lift, hourly on the grid.
      if (p.body.downed || p.body.downedBelow) downedStep(p, end);
      // Chronicle: hourly mood sample; at midnight the day closes (notes at exactly midnight still belong to it)
      // and the new date is itself a recall cue (anniversaries).
      noteMood(p);
      let closed: DayRecord | undefined;
      if (p.chronicleDay && dayOf(end) > p.chronicleDay.day) {
        closed = closeDay(p);
        applyRecall(p, recallByCue(p, { at: end }));
      }
      if (minuteOfDay(end) === 0) {
        // Lasting gists (1.8.0, opt-in): at midnight, episodes past the horizon fold into gists.
        if (p.memory.gists) foldGists(p, end);
        // Character change (1.8.0, opt-in): the day joins the year's experience; maturation runs to midnight.
        if (p.character) {
          noteCharacterDay(
            p,
            closed
              ? {
                  mood: closed.mood,
                  kept: closed.kept.length,
                  broken: closed.broken.length,
                  variety: closed.actions.length,
                }
              : { mood: readAffect(p).valence },
          );
          ageCharacter(p, end);
        }
      }
    }
  }
}

/** The composite's side of the hourly crisis check: interrupt and remember an onset, remember a recovery. */
function crisisStep(p: Person, at: Minute): void {
  const ev = checkCrisis(p, at);
  if (!ev) return;
  const label = ev.kind === 'onset' ? (ev.behaviour?.label ?? ev.behaviourId) : ev.behaviourId;
  remember(p, {
    at,
    kind: 'break',
    action: ev.behaviourId,
    actorId: p.id,
    valence: ev.kind === 'onset' ? -0.6 : 0.2,
    summary: ev.kind === 'onset' ? `I broke down (${label})` : 'I came back to myself',
    tags: ['break', ev.kind],
  });
  if (ev.kind === 'onset') interrupt(p, at, 'break');
}

/** The composite's side of the hourly downing check: interrupt and remember going down, remember getting up. */
function downedStep(p: Person, at: Minute): void {
  const ev = checkDowned(p, at);
  if (!ev) return;
  rememberDowned(p, at, ev.kind, ev.reason);
  if (ev.kind === 'down') interruptUnlessFloor(p, at);
}

function rememberDowned(p: Person, at: Minute, kind: 'down' | 'up', reason: string): void {
  remember(p, {
    at,
    kind: 'downed',
    action: reason,
    actorId: p.id,
    valence: kind === 'down' ? -0.5 : 0.3,
    summary: kind === 'down' ? 'I went down and could not get up' : 'I got back on my feet',
    tags: ['downed', kind, reason],
  });
}

function interruptUnlessFloor(p: Person, at: Minute): void {
  const act = p.activity;
  if (act && !downedAllows(act.affordance)) interrupt(p, at, 'downed');
}

/**
 * Down a person (1.6.0; see the injury SCOPE in `body/`): from the next decision they can only lie, rest or sleep
 * where they are, a command in force ends, and a running activity that is not one of those is interrupted. `until`
 * makes it timed (checked hourly on the tick grid); otherwise it lasts until `standUp`. Remembered. Returns false
 * when the person is dead.
 */
export function knockDown(p: Person, opts: { reason?: string; until?: Minute } = {}): boolean {
  const reason = opts.reason ?? 'knocked-down';
  if (!setDowned(p, reason, opts.until)) return false;
  rememberDowned(p, p.now, 'down', reason);
  interruptUnlessFloor(p, p.now);
  return true;
}

/** Lift a downing now (host: helped up, carried to bed). Returns whether the person was downed. */
export function standUp(p: Person): boolean {
  const reason = p.body.downed?.reason;
  if (!clearDowned(p)) return false;
  rememberDowned(p, p.now, 'up', reason ?? 'helped');
  return true;
}

/**
 * Jump the clock to `to` without living the interval (long-horizon runs, e.g. forty years of aging). Closed-form
 * decays run for the gap (memory, beliefs, habits, relationships, voice pressure, mood), the activity is dropped,
 * past commitment windows are closed without recording them as missed, and the chronicle's open day is closed so
 * the next event opens the right one. The body is not advanced: a skipped decade neither starves nor rests anyone;
 * only age (from `life.bornAt`) changes. Hosts that want the interval lived call `tick`.
 */
export function skip(p: Person, to: Minute): void {
  const dt = to - p.now;
  if (dt <= 0) return;
  // Close the open day first, so its record diffs the day as lived, not the state decades later.
  endDay(p);
  const satisfaction = meanSatisfaction(readNeeds(p, readBodyOf(p)));
  advanceAffect(p, dt, satisfaction);
  advanceMemory(p, dt);
  advanceBeliefs(p, dt);
  advanceHabits(p, dt);
  advanceSocial(p, dt);
  advanceWill(p, dt);
  skipCrisis(p, to);
  p.activity = null;
  skipBody(p, to);
  p.now = to;
  skipAffect(p, to);
  advanceAgenda(p, to);
  // Lasting gists (1.8.0, opt-in): episodes now past the horizon fold into gists.
  if (p.memory.gists) foldGists(p, to);
  // Character change (1.8.0, opt-in): maturation across the gap; a skipped gap brings no experience.
  if (p.character) ageCharacter(p, to);
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
    const before = credence(p, claim.prop);
    if (direct && claim.confidence >= 0.9) confirm(p, claim.prop, claim.value, at);
    else believe(p, claim.prop, claim.value, claim.confidence, direct ? p.id : (actor ?? 'rumour'), at);
    // Hearsay about someone's character moves my relationship with them (reputation).
    applyReputationBelief(p, claim.prop, before, credence(p, claim.prop), at);
  }
  // Advice carried by testimony keeps pulling after the speaker falls silent (standing advice, N9).
  if (pc.channel === 'told') rememberAdvice(p, pc);
  // Watching someone skilled at work teaches a little (1.8.0, observational learning).
  const demo = pc.demonstrates;
  if (demo && !byMe && demo.minutes > 0) {
    learnByWatching(p, demo.skill, demo.minutes, demo.level, learningFor(p, demo.domain), p.now);
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
    // Comfort from someone close shortens a break (crisis SCOPE).
    if (pc.kind === 'comfort' && closeness(p, actor) >= PERSON_DEFAULTS.comfortCloseness) easeBreak(p, at);
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
  else if (target !== undefined && target !== actor) desirability = valence * careFor(p, target);
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
  // A threat (1.6.0): fear by how much the threatened party matters, aimed at its source (social/groups SCOPE).
  const threat = pc.threat && !byMe ? threatAppraisal(p, pc.threat, actor) : undefined;
  if (threat) {
    const tev: AppraisalEvent = {
      at,
      kind: 'prospect',
      desirability: threat.desirability,
      likelihood: threat.likelihood,
      cause: threat.cause,
    };
    if (threat.sourceId !== undefined) tev.threatFrom = threat.sourceId;
    appraise(p, tev);
  }
  // A death I hear of: the tie is kept and marked, so recalling them is a grief cue from now on.
  if (pc.kind === 'death' && target !== undefined && target !== p.id && !byMe) {
    if (p.social.relationships.some((r) => r.otherId === target)) markDeceased(p, target, at);
    // A spouse's death ends the marriage and begins any waiting period (1.8.0, `partnering/`).
    if (p.bonds) widow(p, target, at);
  }

  // Memory.
  const kind = pc.channel === 'told' ? 'told' : aboutMe && actor !== undefined ? 'social' : 'witnessed';
  const episode: Parameters<typeof remember>[1] = {
    at,
    kind,
    action: pc.kind,
    valence: byMe ? valence : desirability,
    summary: pc.summary,
    tags: [pc.kind, pc.channel, ...(isNight(at) ? ['night'] : []), ...(threat ? ['threat'] : [])],
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
  const body = readBodyOf(p);
  const attended = attend(p, [...percepts], {
    focus: p.activity?.focus ?? 0,
    fatigue: body.perceived.fatigue,
    fear: emotionLevel(p, 'fear'),
  });
  for (const pc of attended) {
    perceiveOne(p, pc);
    // What I just noticed may bring a memory back (the cemetery road, her name on the phone).
    const at = Math.min(Math.max(pc.at, p.affect.lastUpdated), p.now);
    const cue: Parameters<typeof recallByCue>[1] = { at, action: pc.kind, tags: [pc.kind] };
    if (pc.placeId !== undefined) cue.placeId = pc.placeId;
    const who = pc.actorId !== undefined && pc.actorId !== p.id ? pc.actorId : pc.targetId;
    if (who !== undefined && who !== p.id) cue.personId = who;
    applyRecall(p, recallByCue(p, cue));
  }
  return attended;
}

// ---------------------------------------------------------------------------------------------
// decide / begin / finish
// ---------------------------------------------------------------------------------------------

export interface DecideOptions {
  suggestion?: Suggestion;
  /** Several voices in one decision (N1); merged with `suggestion`, one per voice id. */
  suggestions?: readonly Suggestion[];
  /** How short of money the person is, 0..1 (N13); the host's ledger decides (e.g. debt relative to income). */
  scarcity?: Unit;
  /** Advance the person to this minute first. */
  now?: Minute;
  /** Hosts may disable the necessity exception. */
  necessity?: boolean;
  /** Why this decision was forced (recorded on the decision); defaults to the activity's pending interrupt. */
  interrupt?: string;
  /** @internal Read a command without it being in force (`previewCommand`). */
  command?: Command;
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
  if (p.activity && p.now >= p.activity.endsAt && p.activity.affordance.placeId !== undefined)
    habit.placeId = p.activity.affordance.placeId;
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
    tendencyEmotions: tendencyEmotions(p),
  };
  if (opts.suggestion) ctx.suggestion = opts.suggestion;
  // Only set when voices were given this way, so single-voice records keep their shape.
  if (opts.suggestions && opts.suggestions.length > 0) ctx.suggestions = [...opts.suggestions];
  if (opts.scarcity !== undefined && opts.scarcity > 0) ctx.scarcity = clamp01(opts.scarcity);
  const cmd = opts.command ?? p.will.command;
  if (cmd) ctx.command = commandOf(cmd);
  return { list, ctx };
}

/** The `Command` part of a command in force (without the will's bookkeeping). */
function commandOf(c: Command): Command {
  const out: Command = { voiceId: c.voiceId, since: c.since };
  if (c.affordanceId !== undefined) out.affordanceId = c.affordanceId;
  if (c.action !== undefined) out.action = c.action;
  if (c.repeat) out.repeat = true;
  return out;
}

/**
 * How this person would answer a suggestion right now, without changing them or consuming randomness
 * (hover telegraph). Does not advance time. With `temperature > 0`, read `likelihood` rather than the verdict.
 */
export function predict(
  p: Person,
  affordances: readonly Affordance[],
  suggestion: Suggestion,
  opts: { necessity?: boolean; others?: readonly Suggestion[]; scarcity?: Unit } = {},
): SuggestionResolution {
  const others = (opts.others ?? []).filter((s) => s.voiceId !== suggestion.voiceId);
  const decideOpts: DecideOptions = { suggestion };
  if (others.length > 0) decideOpts.suggestions = others;
  if (opts.necessity !== undefined) decideOpts.necessity = opts.necessity;
  if (opts.scarcity !== undefined) decideOpts.scarcity = opts.scarcity;
  const { list, ctx } = decisionInputs(p, affordances, 'predict', decideOpts);
  const { considered, willCtx } = scoreAll(p, list, ctx);
  const res = predictResponse(p, considered, willCtx, suggestion, others);
  res.says = voiceLine(p, res, 'predict');
  return res;
}

/**
 * Answer a suggestion now, between decision points, without touching the running activity. When the answer is
 * a refusal it is committed as a real resolution: the will books it as a decision would (pressure, refused
 * counter, `pushed`/`worn` trust costs), the chronicle tallies the verdict, and `booked` is true. Any other
 * verdict would mean switching activity, so nothing is written (`booked: false`, the result equals `predict`)
 * and the host should interrupt and let the next decision resolve it. Consumes no RNG and does not advance time
 * or record a trace entry; a later decision on the same standing suggestion counts again (hosts that answer
 * now should drop the suggestion once it is refused).
 */
export function answerNow(
  p: Person,
  affordances: readonly Affordance[],
  suggestion: Suggestion,
  opts: { necessity?: boolean; others?: readonly Suggestion[]; scarcity?: Unit } = {},
): { resolution: SuggestionResolution; booked: boolean } {
  const others = (opts.others ?? []).filter((s) => s.voiceId !== suggestion.voiceId);
  const decideOpts: DecideOptions = { suggestion };
  if (others.length > 0) decideOpts.suggestions = others;
  if (opts.necessity !== undefined) decideOpts.necessity = opts.necessity;
  if (opts.scarcity !== undefined) decideOpts.scarcity = opts.scarcity;
  const { list, ctx } = decisionInputs(p, affordances, 'answer', decideOpts);
  const { considered, willCtx } = scoreAll(p, list, ctx);
  const out = answerSuggestion(p, considered, willCtx, suggestion, others);
  out.resolution.says = voiceLine(p, out.resolution, out.booked ? `a${ctx.now}` : 'predict');
  if (out.booked) {
    let action = suggestion.action;
    if (action === undefined && suggestion.affordanceId !== undefined)
      action = list.find((a) => a.id === suggestion.affordanceId)?.action;
    noteAnswer(p, out.resolution, action);
  }
  return out;
}

/** Every resolution of a decision record (all voices), oldest API first. */
export const resolutionsOf = (r: {
  suggestion?: SuggestionResolution;
  suggestions?: SuggestionResolution[];
}) => r.suggestions ?? (r.suggestion ? [r.suggestion] : []);

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
  const { record, needDeltas, command: co } = cognitionDecide(p, list, ctx);
  if (review) record.review = true;
  const interruptReason = opts.interrupt ?? p.activity?.interrupt?.reason;
  if (interruptReason !== undefined) record.interrupt = interruptReason;
  if (needDeltas.autonomy !== undefined) satisfy(p, { autonomy: needDeltas.autonomy });
  if (co) applyCommandOutcome(p, co, list);
  record.intention = intentionFor(p, record);
  record.narration = narrateDecision(p, record);
  const resolutions = resolutionsOf(record);
  const continuing =
    review && (record.chosenAffordanceId === null || record.chosenAffordanceId === p.activity?.affordanceId);
  for (const res of resolutions) {
    res.says = voiceLine(p, res, record.id);
    if (res.verdict === 'complied' && !continuing) {
      const chosen = list.find((a) => a.id === record.chosenAffordanceId);
      remember(p, {
        at: p.now,
        kind: 'suggestion',
        action: chosen?.action ?? 'comply',
        actorId: res.voiceId,
        targetId: p.id,
        valence: -0.3,
        summary: `${res.voiceId} insisted that I ${chosen?.label ?? 'do as told'}`,
        tags: ['suggestion', 'insist'],
        voiceId: res.voiceId,
      });
    }
  }
  noteDecision(p, record, voicesIn(opts.suggestion, opts.suggestions));
  const keep = traceLimit(p);
  if (keep > 0) p.trace.push(record);
  if (p.trace.length > keep) p.trace.splice(0, p.trace.length - keep);
  return record;
}

/**
 * The composite's side of a command outcome: charge the controlled time so far, then either end control (with
 * why) or note whether it was obeyed this time. The first time it is obeyed costs autonomy once (as compliance
 * does) and leaves a memory of being commanded.
 */
/** Charge a command's controlled time to now: autonomy (needs), pressure and trust (will), stress (affect). */
function chargeControlled(p: Person): void {
  const c = p.will.command;
  if (!c) return;
  if (c.obeyed) {
    const hours = Math.max(0, p.now - c.chargedAt) / 60;
    strain(p, CRISIS_DEFAULTS.commandStrainPerHour * hours * Math.min(1, c.margin));
  }
  const autonomy = chargeCommand(p, p.now);
  if (autonomy < 0) satisfy(p, { autonomy });
}

function applyCommandOutcome(p: Person, co: CommandOutcome, list: readonly Affordance[]): void {
  const c = p.will.command;
  if (!c) return;
  chargeControlled(p);
  if (co.ends) {
    endCommand(p, co.reason, p.now);
    return;
  }
  if (!noteCommandOutcome(p, co.holds, co.margin)) return;
  satisfy(p, { autonomy: -WILL_DEFAULTS.commandAutonomyCost * clamp01(0.5 + co.margin) });
  const target = list.find((a) => a.id === co.targetAffordanceId);
  remember(p, {
    at: p.now,
    kind: 'suggestion',
    action: target?.action ?? 'commanded',
    actorId: c.voiceId,
    targetId: p.id,
    valence: -0.2 - 0.3 * Math.min(1, co.margin),
    summary: `${c.voiceId} took charge and had me ${target?.label ?? 'do as ordered'}`,
    tags: ['suggestion', 'command'],
    voiceId: c.voiceId,
  });
}

/**
 * Put a host command in force (1.6.0; see `Command` and the command SCOPE in `will/`). From the next decision the
 * person does the commanded offer while the command holds. A running activity that is not the target gets its
 * review brought forward to now. Re-sending the command already in force, or one that already ended (same voice
 * and `since`), changes nothing. Returns false when the person is dead or the command was not (re)started.
 */
export function command(p: Person, cmd: Command): boolean {
  if (!p.body.alive) return false;
  const cur = p.will.command;
  if (cur && cur.voiceId === cmd.voiceId && cur.since === cmd.since) return true;
  const last = p.will.lastCommand;
  if (last && last.voiceId === cmd.voiceId && last.since === cmd.since) return false;
  if (cur) releaseCommand(p, 'replaced');
  takeCommand(p, cmd, p.now);
  const act = p.activity;
  if (act && !commandTargets(cmd, act.affordance)) interrupt(p, p.now, 'command');
  return true;
}

/** End the command in force (host release, default reason 'released'), charging its controlled time first. */
export function releaseCommand(p: Person, reason = 'released'): boolean {
  if (!p.will.command) return false;
  chargeControlled(p);
  endCommand(p, reason, p.now);
  return true;
}

/**
 * Whether `cmd` would hold right now and at what price, without changing the person or consuming randomness
 * (a UI showing "he will do it, but he would rather eat" before the player takes control). `margin` is the gap
 * the hourly autonomy and trust costs scale with.
 */
export function previewCommand(p: Person, affordances: readonly Affordance[], cmd: Command): CommandOutcome {
  const { list, ctx } = decisionInputs(p, affordances, 'preview', { command: cmd });
  const { considered, willCtx } = scoreAll(p, list, ctx);
  return resolveCommand(p, considered, willCtx);
}

export interface BeginOptions {
  /**
   * Make a commitment at begin (e.g. carrying the injured): a pending commitment for this action and target,
   * from now until the activity's end plus `PERSON_DEFAULTS.promiseSlack`. While it is pending the running
   * activity gets a strong 'commitment' term at review, so ordinary need interrupts do not end it; completing
   * the activity keeps it, abandoning it breaks it (a missed episode, and a breach if `normId` is set).
   */
  promise?: { importance: number; toId?: string; normId?: string; kind?: Commitment['kind']; label?: string };
  /** Joint-activity proposal id (set by `sim/` when both partners begin together). */
  jointId?: string;
}

/** Minute a perceived need crosses its interrupt threshold under `load` (cached on the activity), or undefined. */
function thresholdFor(p: Person, load: BodyLoad, review: number): Minute | undefined {
  const t = nextBodyThreshold(
    p,
    load,
    segmentModifiers(p),
    PERSON_DEFAULTS.interruptThresholds,
    review,
    p.ambient ? ambientBodyParams(p, BODY_DEFAULTS) : BODY_DEFAULTS,
    fastingCtx(p),
  );
  return Number.isFinite(t) ? p.now + t : undefined;
}

/** Start an activity chosen by `record`. Returns null when the person is dead. */
export function begin(
  p: Person,
  aff: Affordance,
  record: DecisionRecord,
  opts: BeginOptions = {},
): Activity | null {
  if (!p.body.alive) return null;
  const now = p.now;
  const duration = Number.isFinite(aff.duration) ? Math.max(1, Math.round(aff.duration)) : 1;
  const mode = aff.mode ?? 'awake';
  const load: BodyLoad = { effort: clamp01(aff.effort), focus: clamp01(aff.focus ?? 0), mode };
  const mods = lifeModifiers(p);
  const needsAtStart: Partial<Record<NeedId, number>> = {};
  for (const n of readNeeds(p, readBodyOf(p))) needsAtStart[n.id] = n.level;
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
  // A conscience veto blocks this act without the necessity exception / capacity bound and the exception lifts it
  // at the current desperation: the act is done under necessity. (A host forcing a vetoed act through `begin`
  // without that desperation gets no excuse.)
  if (normVeto(p, aff, 0, { necessity: false, now }) !== undefined) {
    const { desperation } = readPerson(p);
    if (normVeto(p, aff, desperation, { necessity: true, now }) === undefined) activity.necessity = true;
  }
  const credited = creditedVoices(resolutionsOf(record));
  if (credited.length > 0) activity.suggestions = credited;
  if (
    record.suggestion &&
    (record.suggestion.verdict === 'assented' ||
      record.suggestion.verdict === 'complied' ||
      record.suggestion.verdict === 'commanded')
  ) {
    activity.suggestion = record.suggestion;
    if (record.suggestion.verdict === 'complied') activity.protest = true;
  }
  if (opts.jointId !== undefined) activity.jointId = opts.jointId;
  if (opts.promise) {
    const pr = opts.promise;
    const c = promise(p, {
      kind: pr.kind ?? 'promise',
      actions: [aff.action],
      from: now,
      until: activity.endsAt + PERSON_DEFAULTS.promiseSlack,
      importance: pr.importance,
      ...(aff.targetId !== undefined ? { targetId: aff.targetId } : {}),
      ...(pr.toId !== undefined ? { toId: pr.toId } : {}),
      ...(pr.normId !== undefined ? { normId: pr.normId } : {}),
      ...(pr.label !== undefined ? { label: pr.label } : {}),
    });
    activity.commitmentId = c.id;
  }
  p.activity = activity;
  advanceBody(p, 0, load, mods); // apply the sleep/wake switch now
  const review = load.mode === 'sleep' ? PERSON_DEFAULTS.sleepReviewInterval : PERSON_DEFAULTS.reviewInterval;
  const thresholdAt = thresholdFor(p, load, review);
  if (thresholdAt !== undefined) activity.thresholdAt = thresholdAt;
  activity.reviewAt = now + Math.max(1, Math.min(review, (thresholdAt ?? Number.POSITIVE_INFINITY) - now));
  activity.reviewAt = capForDuty(p, activity, activity.reviewAt);
  if (aff.risk && aff.risk.chance > 0 && aff.risk.severity > 0) {
    appraise(p, {
      at: now,
      kind: 'prospect',
      desirability: -clamp01(aff.risk.severity),
      likelihood: clamp01(aff.risk.chance),
      cause: `prospect:${aff.action}${aff.targetId !== undefined ? `@${aff.targetId}` : ''}`,
    });
  }
  // Starting here, with these people, may bring a memory back (N11); the record cites it.
  const cue: Parameters<typeof recallByCue>[1] = { at: now, action: aff.action };
  if (aff.placeId !== undefined) cue.placeId = aff.placeId;
  const who = aff.targetId ?? aff.with?.[0];
  if (who !== undefined && who !== p.id) cue.personId = who;
  if (aff.tags !== undefined) cue.tags = aff.tags;
  const recalled = applyRecall(p, recallByCue(p, cue));
  if (recalled.length > 0) {
    const c = record.considered.find((x) => x.affordanceId === aff.id);
    if (c) c.recalled = [...new Set([...(c.recalled ?? []), ...recalled])];
  }
  return activity;
}

/**
 * Push the review time forward after a decision to continue the current activity, refresh the cached
 * `thresholdAt`, and clear a handled interrupt. `nextBodyThreshold` runs only here and in `begin` (once per
 * activity or review, a bounded simulation of at most `review` minutes), never per tick.
 */
export function reviewed(p: Person): void {
  const act = p.activity;
  if (!act) return;
  delete act.interrupt;
  const load: BodyLoad = { effort: act.effort, focus: act.focus, mode: act.mode };
  const review = load.mode === 'sleep' ? PERSON_DEFAULTS.sleepReviewInterval : PERSON_DEFAULTS.reviewInterval;
  const thresholdAt = thresholdFor(p, load, review);
  if (thresholdAt !== undefined) act.thresholdAt = thresholdAt;
  else delete act.thresholdAt;
  act.reviewAt = p.now + Math.max(1, Math.min(review, (thresholdAt ?? Number.POSITIVE_INFINITY) - p.now));
  act.reviewAt = capForDuty(p, act, act.reviewAt);
}

/**
 * Cap a review for pending duties. A sleeper is reviewed no later than the minute a pending duty becomes pressing
 * enough to wake for. Any activity that would cover a protected duty's whole closing stretch and run past the
 * window's end is reviewed when that stretch begins (1.9.0, `will.dutyReviewAt`), so the omission rule weighs it.
 */
function capForDuty(p: Person, act: Activity, reviewAt: Minute): Minute {
  let at = reviewAt;
  if (act.mode === 'sleep') {
    const wake = wakeReviewAt(p, p.now);
    if (wake !== undefined && wake < at) at = Math.max(p.now + 1, wake);
  }
  const stretch = dutyReviewAt(p, act.affordance, p.now, act.endsAt);
  if (stretch !== undefined && stretch < at) at = Math.max(p.now + 1, stretch);
  return at;
}

/**
 * Force re-decision: bring the running activity's review forward to `now` (not earlier than `p.now`) and record
 * why; the next `decide` carries the reason in `DecisionRecord.interrupt`. Returns false when the person is
 * idle or dead (an idle person decides at the host's next look anyway; `sim/` handles that case).
 */
export function interrupt(p: Person, now: Minute, reason: string): boolean {
  const act = p.activity;
  if (!act || !p.body.alive) return false;
  const at = Math.max(p.now, now);
  act.reviewAt = Math.min(act.reviewAt, at);
  act.interrupt = { at, reason };
  return true;
}

export interface FinishReport {
  status: Outcome['status'];
  /** How it felt, -1..1. */
  felt: number;
  realized: Partial<Record<NeedId, number>>;
  /** Quality used for felt valence (host value, protest default, or 1). */
  quality: number;
  fulfilled: string[];
  breached: string[];
  kept: string[];
}

/**
 * Apply what happened. Physiological deltas go to the body, psychological ones to the needs, then skills,
 * habits, memory (expectation learning and an episode), conscience (deed, breaches, repair), agenda,
 * relationships, trust in the advising voice, injuries and illness. Clears the activity.
 */
/**
 * Learning-rate multiplier for a skill domain at the person's age (1.8.0): the domain's curve from
 * `lifecourse.learningMultiplier`, or the general one (`LifeModifiers.learning`) when no domain is given.
 */
export function learningFor(p: Person, domain?: LearningDomain): number {
  return domain === undefined ? lifeModifiers(p).learning : learningMultiplier(ageYears(p), domain);
}

/**
 * Watch someone practise skill `skill` at `modelLevel` for `minutes` (observational learning, 1.8.0): the
 * composite's side of `skills.learnByWatching` at the person's age-and-domain learning rate. A `Percept.demonstrates` on an
 * attended percept does the same. Returns the level before and after.
 */
export function observeSkill(
  p: Person,
  skill: string,
  minutes: number,
  modelLevel: Unit,
  domain?: LearningDomain,
): { before: Unit; after: Unit } {
  return learnByWatching(p, skill, minutes, modelLevel, learningFor(p, domain), p.now);
}

export interface FinishOptions {
  catalog?: readonly NormDefinition[];
  /**
   * Related skills (1.8.0): practising a skill also moves the skills this map relates to it (`skills.SkillTransfer`,
   * `skillFamilies`). Absent: no transfer, as before.
   */
  transfer?: SkillTransfer;
}

export function finish(p: Person, outcome: Outcome, opts: FinishOptions = {}): FinishReport | null {
  const act = p.activity;
  if (!act) return null;
  if (outcome.at > p.now) tick(p, outcome.at);
  const now = p.now;
  const aff = act.affordance;
  const completed = outcome.status === 'completed';
  const minutes = Math.max(0, now - act.startedAt);
  const mods = lifeModifiers(p);
  const D = PERSON_DEFAULTS;

  const before = readNeeds(p, readBodyOf(p));
  const given = outcome.needs ?? {};
  const bodyDeltas: { food?: number; water?: number; relief?: number } = {};
  if (given.food) bodyDeltas.food = given.food;
  if (given.water) bodyDeltas.water = given.water;
  if (given.relief) bodyDeltas.relief = given.relief;
  consume(p, bodyDeltas);
  const psych: Partial<Record<PsychologicalNeed, number>> = {};
  for (const id of PSYCHOLOGICAL_NEEDS) if (given[id] !== undefined) psych[id] = given[id];
  satisfy(p, psych);
  if (outcome.injury) {
    injure(p, outcome.injury);
    strain(p, CRISIS_DEFAULTS.injuryStrain * clamp01(outcome.injury.severity));
  }
  if (outcome.illness) sicken(p, outcome.illness);
  for (const e of outcome.exposures ?? []) expose(p, e.kind, e.amount ?? 1);

  // Realized deltas: what the body actually took in for food/water/relief (a drink at full hydration
  // realizes nothing), host values for psychological needs, and measured since the start for sleep/rest.
  const after = readNeeds(p, readBodyOf(p));
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
  const quality = clamp01(outcome.quality ?? (act.protest ? D.protestQuality : 1));
  if (completed) felt -= D.qualityPenalty * (1 - quality);
  felt = clampSigned(felt);
  appraise(p, {
    at: now,
    kind: 'outcome',
    desirability: felt,
    cause: `outcome:${aff.action}${aff.targetId !== undefined ? `@${aff.targetId}` : ''}`,
  });

  // Skills and habits. Time spent practising counts even when the activity was interrupted.
  if (aff.skill && minutes > 0) {
    // 1.8.0: a declared domain picks its age curve; transfer and practice conditions come from the host.
    const learning =
      (aff.skill.domain === undefined ? mods.learning : learningFor(p, aff.skill.domain)) *
      aptitudeOf(p, aff.skill.id);
    practise(
      p,
      aff.skill.id,
      minutes,
      aff.skill.difficulty,
      completed,
      learning,
      now,
      opts.transfer,
      outcome.practice,
    );
  }
  const prev = lastAction(p);
  if (completed) {
    const hctx: { now: Minute; placeId?: string; lastAction?: string } = { now };
    if (aff.placeId !== undefined) hctx.placeId = aff.placeId;
    if (prev !== undefined) hctx.lastAction = prev;
    reinforce(p, aff.action, hctx);
    // Habits for other actions cued here were not acted on: extinction by withholding (N8).
    withholdCued(p, aff.action, hctx);
    dischargeAdvice(p, aff.action);
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
  if (act.suggestion) episode.voiceId = act.suggestion.voiceId;
  remember(p, episode);

  // Conscience.
  const deed = recordDeed(p, aff, act.intention, now, completed, act.necessity ? { necessity: true } : {});
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
  const routed: Outcome = { ...outcome };
  if (routed.fulfills === undefined && aff.fulfills !== undefined) routed.fulfills = aff.fulfills;
  if (routed.advances === undefined && aff.advances !== undefined) routed.advances = aff.advances;
  // An abstention excused under necessity closes as released at its window's end (noted then by `tick`).
  const { kept, broken } = onFinished(p, routed, act.startedAt, {
    ...(act.necessity ? { necessity: true } : {}),
    ...(opts.catalog ? { catalog: opts.catalog } : {}),
  });
  // A completed violating action inside an open abstention's window broke it (the fast, "no cards after Isha").
  if (broken.length > 0) {
    recordMissed(p, broken, now, outcome.action);
    noteCommitments(p, 'broken', broken);
  }
  for (const c of kept) {
    if (c.toId && c.toId !== 'self') {
      socialEvent(p, { at: now, kind: 'promise-kept', otherId: c.toId, byMe: true, magnitude: c.importance });
    }
  }

  // Relationships from taking part together.
  if (completed) {
    if (p.character && (aff.with ?? []).some((o) => o !== p.id)) noteCharacterSocial(p, minutes);
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

  // Trust in every voice that pushed this activity: how it felt, minus bodily harm the host's deltas do not
  // show (needs that fell during the activity and are now urgent).
  const voices = act.suggestions ?? (act.suggestion ? [act.suggestion] : []);
  if (voices.length > 0) {
    let harm = 0;
    for (const id of ['food', 'water', 'sleep', 'rest'] as const) {
      if (urgencyOf(after, id) < D.voiceHarmUrgency) continue;
      harm += Math.max(0, (act.needsAtStart[id] ?? levelOf(after, id)) - levelOf(after, id));
    }
    // Doing what a voice pushed broke a commitment or the person's own standards: that costs the voice as harm
    // does (review 2026-10-03: thirty broken fasts under insistence had moved trust only 0.50 -> 0.41). Omissions
    // the push caused later (a missed prayer during a pushed activity) are not attributed here.
    let breach = 0;
    for (const c of broken) breach += D.missedDistress * c.importance;
    breach += D.missedDistress * 0.5 * deed.breached.length;
    for (const res of voices) {
      const protest = res.verdict === 'complied' || res.verdict === 'commanded';
      const reason =
        breach > 0
          ? protest
            ? 'breach-under-protest'
            : 'breach'
          : harm > 0
            ? protest
              ? 'harm-under-protest'
              : 'harm'
            : felt >= 0
              ? 'went-well'
              : 'went-badly';
      learnFromVoice(p, res, clampSigned(felt - D.voiceHarmGain * harm - breach), {
        at: now,
        action: aff.action,
        reason,
      });
    }
  }

  // Chronicle, while the activity is still current.
  const noted: Parameters<typeof noteOutcome>[2] = { kept: kept.map((c) => c.id) };
  if (act.suggestion) noted.suggestion = act.suggestion;
  noteOutcome(p, outcome, noted);

  p.activity = null;
  // A one-job command ends when its activity completes or fails (an interrupted one resumes at the next decision).
  const cmd = p.will.command;
  if (
    cmd &&
    !cmd.repeat &&
    act.suggestion?.verdict === 'commanded' &&
    act.suggestion.voiceId === cmd.voiceId
  ) {
    if (outcome.status !== 'interrupted') releaseCommand(p, 'done');
  }
  // Leave the activity's body mode now (wake up from sleep) so the next decision is not vetoed 'asleep'.
  advanceBody(p, 0, PERSON_DEFAULTS.idleLoad, mods);
  if (outcome.percepts && outcome.percepts.length > 0) perceive(p, outcome.percepts);
  return {
    status: outcome.status,
    felt,
    realized,
    quality,
    fulfilled: deed.fulfilled,
    breached: deed.breached,
    kept: kept.map((c) => c.id),
  };
}

// ---------------------------------------------------------------------------------------------
// Retention (snapshot and restore live in restore.ts)
// ---------------------------------------------------------------------------------------------

/** Decision records this person keeps (`Retention.trace`, else `PERSON_DEFAULTS.maxTrace`). @internal */
export const traceLimit = (p: Person): number => p.retention?.trace ?? PERSON_DEFAULTS.maxTrace;

/** A valid retention (2.0.0) from host or saved JSON; undefined when nothing valid remains. @internal */
export function cleanRetention(x: unknown): Retention | undefined {
  if (!isObj(x)) return undefined;
  const out: Retention = {};
  const t = x.trace;
  if (typeof t === 'number' && Number.isInteger(t) && t >= 0 && t <= PERSON_DEFAULTS.maxTrace) out.trace = t;
  const d = x.chronicleDays;
  if (typeof d === 'number' && Number.isInteger(d) && d >= 31 && d <= MAX_MINUTE) out.chronicleDays = d;
  return out.trace === undefined && out.chronicleDays === undefined ? undefined : out;
}

/**
 * Set this person's bounds on record slices (2.0.0; see `Retention`) and trim the slices to them now. Invalid
 * entries are ignored; an empty or wholly invalid retention restores the defaults. Changes no decision.
 */
export function setRetention(p: Person, retention: Retention): void {
  const r = cleanRetention(retention);
  if (r) p.retention = r;
  else delete p.retention;
  const keep = traceLimit(p);
  if (p.trace.length > keep) p.trace.splice(0, p.trace.length - keep);
  trimChronicle(p);
}
