/**
 * SCOPE: coarse long-run stepping for one person (L5, 1.8.0). `liveRoutine` lives a stretch of routine days without
 * deciding minute by minute: each day the closed-form decays run for 24 hours (mood, memory, beliefs, habits,
 * relationships, voice pressure), the host's `Routine` says what such a day holds (activities with minutes, a skill
 * practised, companions, how it feels, and occasional events with a daily chance), and the day is summarized: skill
 * practice for the day's minutes (with rust, age-and-domain learning, transfer and practice conditions as in lived
 * time), shared time as one social event per companion, events as remembered episodes, the day's felt valence as one
 * appraisal, chronic onsets and natural death rolled on the person's own RNG (opt-in), and the day folded into the
 * yearbook, the character year and the gists (each when enabled). It is the long-run counterpart of `skip`, which
 * lives nothing: a person stepped by routine for decades grows, rusts, bonds and grieves; a skipped one only ages.
 *
 * Determinism: every draw comes from `p.rng`, in a fixed order (the activities' chance rolls in routine order, then
 * success rolls, then chronic onsets, then mortality), so the same person, routine and stretch give the same bits
 * however the host splits the stretch into whole days. The body is held as in `skip` (not starved or rested by the
 * routine; age, illness and death are its long-run changes), needs are not drained, and commitments whose windows
 * pass are closed without being counted missed at the end of the stretch, as in `skip`; a host that wants duties
 * kept or missed counts them in the routine (`RoutineActivity.keeps`). A day lived by routine is not a lived day:
 * nobody decides, refuses or is persuaded, and the felt valence is the host's summary, not an appraisal of outcomes.
 * The illness term (a day under chronic illness feels worse by `LONGRUN_DEFAULTS.illnessFelt` × summed severity) and
 * the companion event magnitude are engineering assumptions.
 */

import { advanceAffect, appraise, readAffect, skipAffect, skipCrisis } from './affect/index.ts';
import { advanceAgenda } from './agenda/index.ts';
import { advanceBeliefs } from './beliefs/index.ts';
import { die, sicken, skipBody } from './body/index.ts';
import { ageCharacter, noteCharacterDay } from './character/index.ts';
import { endDay, foldDay } from './chronicle/index.ts';
import { chance, clampSigned, dayOf } from './core/index.ts';
import { ambientMood } from './environment/index.ts';
import { aptitudeOf } from './family/index.ts';
import { advanceHabits } from './habits/index.ts';
import {
  type ChronicCondition,
  chronicOnsets,
  type HealthExposures,
  lifeStage,
  mortalityEvent,
} from './lifecourse/index.ts';
import { advanceMemory, foldGists, remember } from './memory/index.ts';
import { meanSatisfaction } from './needs/index.ts';
import { widowhoodMortality } from './partnering/index.ts';
import { learningFor, readPerson, skip } from './person.ts';
import type { LifecourseOptions } from './sim/sim.ts';
import { practise, type SkillTransfer, successChance } from './skills/index.ts';
import { advanceSocial, socialEvent } from './social/index.ts';
import type {
  Affordance,
  EntityId,
  LifeStage,
  Minute,
  Person,
  PersonId,
  PracticeConditions,
  Signed,
  SocialEventKind,
  Unit,
} from './types.ts';
import { MINUTES_PER_DAY } from './types.ts';
import { advanceWill } from './will/index.ts';

export const LONGRUN_DEFAULTS = {
  /** Felt valence lost per unit of summed illness severity on a routine day. */
  illnessFelt: 0.5,
  /** Social event magnitude for an hour with a companion (scaled by minutes, capped at 1). */
  companionPerHour: 0.25,
  /** Affect substeps per routine day (mood half-life is 8 hours; emotion decay stays exact). */
  affectSteps: 6,
};

/** One kind of activity in a routine day. */
export interface RoutineActivity {
  action: string;
  /** Minutes it takes on a day it happens. */
  minutes: number;
  /** Daily chance it happens (default 1: every day). Drawn from the person's RNG only when below 1. */
  chance?: Unit;
  /** The skill practised (difficulty, optional domain), as on an `Affordance`. */
  skill?: Affordance['skill'];
  practice?: PracticeConditions;
  /** Companions: one social event with each per day it happens (deceased ties are untouched). */
  with?: readonly PersonId[];
  /** Social event kind with companions (default 'shared-work' for activities tagged 'work', else 'chat'). */
  social?: SocialEventKind;
  /** How a day with it feels, -1..1 (default 0); summed into the day's appraisal. */
  valence?: Signed;
  tags?: readonly string[];
  placeId?: EntityId;
  /**
   * Remember it as an episode when it happens, with this summary (default: only activities with `chance` < 1, i.e.
   * events, are remembered, summarized by their action).
   */
  summary?: string;
  /** Counts as a commitment kept (or broken, with `false`) for the yearbook and character. */
  keeps?: boolean;
}

/** What a routine day holds. Hosts vary it by season, age or role through the function form of `liveRoutine`. */
export interface Routine {
  activities: readonly RoutineActivity[];
}

export interface RoutineOptions {
  lifecourse?: LifecourseOptions;
  transfer?: SkillTransfer;
}

/** What happened on one routine day. */
export interface RoutineDay {
  /** Minute the day ended (the person's `now` after it). */
  at: Minute;
  day: number;
  /** Mood valence at the end of the day. */
  mood: Signed;
  /** Actions done. */
  actions: string[];
  /** Episode ids remembered (events). */
  episodes: string[];
  /** Chronic conditions that began. */
  onsets: string[];
  died?: { cause: 'age' | 'illness' };
  /** Life stage entered during the day. */
  stage?: LifeStage;
}

/**
 * Live one routine day from `p.now` (see SCOPE). A dead person only moves the clock. Returns what happened.
 */
export function routineDay(p: Person, routine: Routine, opts: RoutineOptions = {}): RoutineDay {
  const D = LONGRUN_DEFAULTS;
  const start = p.now;
  const end = start + MINUTES_PER_DAY;
  const day = dayOf(start);
  const report: RoutineDay = { at: end, day, mood: 0, actions: [], episodes: [], onsets: [] };
  if (!p.body.alive) {
    p.now = end;
    return report;
  }
  const stageBefore = lifeStage(p);
  // Which activities happen today (chance rolls in routine order).
  const done = routine.activities.filter((a) => (a.chance ?? 1) >= 1 || chance(p.rng, a.chance ?? 1));

  // Closed-form decays over the day, as in `skip`.
  const satisfaction = meanSatisfaction(readPerson(p).needs);
  advanceAffect(p, MINUTES_PER_DAY, satisfaction, p.ambient ? ambientMood(p) : undefined, D.affectSteps);
  advanceMemory(p, MINUTES_PER_DAY);
  advanceBeliefs(p, MINUTES_PER_DAY);
  advanceHabits(p, MINUTES_PER_DAY);
  advanceSocial(p, MINUTES_PER_DAY);
  advanceWill(p, MINUTES_PER_DAY);
  skipCrisis(p, end);
  p.activity = null;
  skipBody(p, end);
  p.now = end;
  skipAffect(p, end);

  // The day's summary, at its end.
  let felt = 0;
  let kept = 0;
  let broken = 0;
  let socialMinutes = 0;
  const capacity = readPerson(p).body.capacity;
  for (const a of done) {
    const minutes = Math.max(0, a.minutes);
    report.actions.push(a.action);
    felt += a.valence ?? 0;
    if (a.keeps === true) kept += 1;
    else if (a.keeps === false) broken += 1;
    if (a.skill && minutes > 0) {
      const succeeded = chance(p.rng, successChance(p, a.skill.id, a.skill.difficulty, capacity));
      practise(
        p,
        a.skill.id,
        minutes,
        a.skill.difficulty,
        succeeded,
        learningFor(p, a.skill.domain) * aptitudeOf(p, a.skill.id),
        end,
        opts.transfer,
        a.practice,
      );
    }
    const companions = (a.with ?? []).filter((id) => id !== p.id);
    if (companions.length > 0) {
      socialMinutes += minutes;
      const kind = a.social ?? (a.tags?.includes('work') ? 'shared-work' : 'chat');
      const magnitude = Math.min(1, (D.companionPerHour * minutes) / 60);
      for (const other of companions)
        socialEvent(p, { at: end, kind, otherId: other, byMe: true, magnitude });
    }
    if (a.summary !== undefined || (a.chance ?? 1) < 1) {
      const ep: Parameters<typeof remember>[1] = {
        at: end,
        kind: 'outcome',
        action: a.action,
        actorId: p.id,
        valence: clampSigned(a.valence ?? 0),
        summary: a.summary ?? a.action,
        tags: [...(a.tags ?? []), 'routine'],
      };
      if (companions[0] !== undefined) ep.targetId = companions[0];
      if (a.placeId !== undefined) ep.placeId = a.placeId;
      report.episodes.push(remember(p, ep).id);
    }
  }
  let illness = 0;
  for (const i of p.body.illnesses) illness += i.severity;
  felt -= D.illnessFelt * illness;
  if (felt !== 0) appraise(p, { at: end, kind: 'event', desirability: clampSigned(felt), cause: 'routine' });

  // Life course (opt-in), on the person's own stream: onsets, then death.
  const lc = opts.lifecourse;
  if (lc?.chronicOnsets) {
    const o: Parameters<typeof chronicOnsets>[3] = {};
    if (lc.conditions) o.conditions = lc.conditions;
    const ex = lc.exposures?.(p);
    if (ex) o.exposures = ex;
    for (const ill of chronicOnsets(p, MINUTES_PER_DAY, p.rng, o)) {
      sicken(p, ill);
      report.onsets.push(ill.kind);
    }
  }
  if (lc?.mortality) {
    // Widowhood raises the hazard for a while (`partnering.widowhoodMortality`; 1 for anyone never widowed).
    const widowed = p.bonds ? widowhoodMortality(p, end) : 1;
    const multiplier = (lc.multiplier ?? 1) * widowed;
    const roll = mortalityEvent(
      p,
      MINUTES_PER_DAY,
      p.rng,
      lc.multiplier !== undefined || widowed !== 1 ? { multiplier } : {},
    );
    if (roll.died) {
      die(p);
      report.died = { cause: roll.cause };
    }
  }

  report.mood = readAffect(p).valence;
  const eps = report.episodes.flatMap((id) => {
    const e = p.memory.episodes.find((x) => x.id === id);
    return e ? [{ id: e.id, summary: e.summary, valence: e.valence, salience: e.salience }] : [];
  });
  foldDay(p, {
    day,
    mood: report.mood,
    kept,
    broken,
    actions: report.actions,
    episodes: eps,
    illness: report.onsets,
    alive: p.body.alive,
    routine: true,
  });
  if (p.character) {
    noteCharacterDay(p, {
      mood: report.mood,
      kept,
      broken,
      socialMinutes,
      variety: new Set(report.actions).size,
    });
    ageCharacter(p, end);
  }
  if (p.memory.gists) foldGists(p, end);
  const stageAfter = lifeStage(p);
  if (stageAfter !== stageBefore) report.stage = stageAfter;
  return report;
}

/** A routine, or one chosen per day (by season, age, role). */
export type RoutineSource = Routine | ((p: Person, day: number) => Routine);

const routineOf = (src: RoutineSource, p: Person): Routine =>
  typeof src === 'function' ? src(p, dayOf(p.now)) : src;

/**
 * Live from `p.now` to `to` by routine (see SCOPE): the running activity is dropped and the open chronicle day closed
 * first, whole days are lived with `routineDay`, a remainder shorter than a day is skipped (`skip`), and past
 * commitment windows are closed at the end as in `skip`. Returns the notable days (events, onsets, a stage entered,
 * death); the person's state carries the rest.
 */
export function liveRoutine(
  p: Person,
  to: Minute,
  routine: RoutineSource,
  opts: RoutineOptions = {},
): RoutineDay[] {
  const out: RoutineDay[] = [];
  if (to <= p.now) return out;
  if (!p.body.alive) {
    p.now = to;
    return out;
  }
  endDay(p);
  p.activity = null;
  while (p.now + MINUTES_PER_DAY <= to && p.body.alive) {
    const r = routineDay(p, routineOf(routine, p), opts);
    if (r.episodes.length > 0 || r.onsets.length > 0 || r.stage || r.died) out.push(r);
  }
  if (p.now < to) skip(p, to);
  else advanceAgenda(p, to);
  return out;
}
