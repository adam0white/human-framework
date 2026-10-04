/**
 * SCOPE: a community lived by routine for years (L5, 1.8.0). `liveCommunity` steps every living person one routine
 * day at a time (`routineDay`, in id order, all on the same day before the next), so long stretches of a settlement
 * run in milliseconds per person-year instead of seconds. The host supplies each person's routine per day (by season,
 * age, role, who is still alive) and may act at each dawn through `onDay` (births, arrivals, a change of routine);
 * deaths are told to everyone who had a tie to the dead person as a death percept (`tellDeath`), so they grieve, keep
 * the tie as a memory and a spouse is widowed; and each living minor is raised by their living parents for
 * `upbringingMinutes` a day (`family.raise`: values, norm understanding and attachment move with the parents' warmth). Anyone behind the community's clock is first ticked up to it (lived time), and the bookkeeping the
 * fine-grained driver reads (`idleUntil`, `perceivedUntil`, `dayDone`) is moved to the end, so the host can switch
 * back to `stepCommunity` at the stretch's end: a common pattern is routine for the years nobody watches, lived
 * minutes for the days the player does. Switching fidelity is the host's decision and happens on a day boundary.
 *
 * It does not run decisions, conversation, joint activities, contagion or the world's percepts and affordances: those
 * belong to lived time. Companions are listed by the host on both sides (each person's routine names the other),
 * since a routine day writes only its own person. Births and arrivals are the host's (`birth`, `addPerson` in
 * `onDay`); a person added during the stretch starts on the next day.
 */

import { endDay } from '../chronicle/index.ts';
import { dayOf } from '../core/index.ts';
import { raise } from '../family/index.ts';
import { ageYears } from '../lifecourse/index.ts';
import { type Routine, type RoutineDay, type RoutineLifecourse, routineDay } from '../longrun.ts';
import { tick } from '../person.ts';
import type { SkillTransfer } from '../skills/index.ts';
import type { Minute, Person, PersonId } from '../types.ts';
import { MINUTES_PER_DAY } from '../types.ts';
import { type Community, type SimEvent, tellDeath } from './sim.ts';

export const LIVE_COMMUNITY_DEFAULTS = {
  /** Upbringing time a day with the parents (engineering assumption: a few waking hours together). */
  upbringingMinutes: 240,
};

/** Age below which a person is raised by their parents during a routine stretch. */
const UPBRINGING_UNTIL = 18;

export interface LiveCommunityOptions {
  /** Each living person's routine for a day (`day` is the day number being lived). */
  routineFor(p: Person, day: number, c: Community): Routine;
  /** At each dawn, before anyone's day: births, arrivals, routine changes. */
  onDay?(c: Community, day: number, at: Minute): void;
  /** Tell each death to everyone with a tie (default true; see `tellDeath`). */
  tellDeaths?: boolean;
  /**
   * Minutes of upbringing a day for each living minor with a living parent in the community (`family.raise`; default
   * `LIVE_COMMUNITY_DEFAULTS.upbringingMinutes`, 0 turns it off).
   */
  upbringingMinutes?: number;
  lifecourse?: RoutineLifecourse;
  transfer?: SkillTransfer;
}

/** Notable days of each person, by id, plus the community's event log (deaths, stages entered, onsets). */
export interface LiveCommunityResult {
  events: SimEvent[];
  days: Record<PersonId, RoutineDay[]>;
}

/**
 * Live the community by routine from its clock (the latest `now` of anyone in it) to `until`, whole days only; a
 * remainder shorter than a day is left for the fine-grained driver. Returns notable days and events (see SCOPE).
 */
export function liveCommunity(c: Community, until: Minute, opts: LiveCommunityOptions): LiveCommunityResult {
  const events: SimEvent[] = [];
  const days: Record<PersonId, RoutineDay[]> = {};
  // Start at the first midnight at or after the community's clock: whoever is behind lives up to it minute by
  // minute, and open chronicle days are closed so none is carried through the stretch.
  let now = 0;
  for (const p of c.people) if (p.now > now) now = p.now;
  now = Math.ceil(now / MINUTES_PER_DAY) * MINUTES_PER_DAY;
  if (now + MINUTES_PER_DAY > until) return { events, days };
  for (const p of c.people) {
    if (p.body.alive && p.now < now) tick(p, now);
    endDay(p);
    if (!p.body.alive && p.now < now) p.now = now;
  }
  const routineOpts: Parameters<typeof routineDay>[2] = {};
  if (opts.lifecourse) routineOpts.lifecourse = opts.lifecourse;
  if (opts.transfer) routineOpts.transfer = opts.transfer;
  const tell = opts.tellDeaths ?? true;
  const upbringing = Math.max(0, opts.upbringingMinutes ?? LIVE_COMMUNITY_DEFAULTS.upbringingMinutes);

  while (now + MINUTES_PER_DAY <= until) {
    const day = dayOf(now);
    opts.onDay?.(c, day, now);
    const died: Person[] = [];
    for (const p of c.people) {
      if (!p.body.alive) continue;
      if (p.now < now) tick(p, now);
      if (p.now !== now) continue; // added mid-stretch with a later clock: joins when the day catches up
      const r = routineDay(p, opts.routineFor(p, day, c), routineOpts);
      if (r.episodes.length > 0 || r.onsets.length > 0 || r.stage || r.died) {
        const list = days[p.id] ?? [];
        list.push(r);
        days[p.id] = list;
      }
      for (const kind of r.onsets)
        events.push({ at: r.at, personId: p.id, kind: 'onset', detail: `${p.name}: ${kind}` });
      if (r.stage)
        events.push({ at: r.at, personId: p.id, kind: 'stage', detail: `${p.name} is now ${r.stage}` });
      if (r.died) {
        events.push({ at: r.at, personId: p.id, kind: 'died', detail: `${p.name} died` });
        died.push(p);
      }
    }
    now += MINUTES_PER_DAY;
    for (const p of c.people) if (!p.body.alive && p.now < now) p.now = now;
    if (tell) for (const d of died) tellDeath(c, d, now);
    // Upbringing (1.8.0): each living minor spends the day's upbringing time with their living parents.
    if (upbringing > 0) {
      const byId = new Map(c.people.map((q) => [q.id, q]));
      for (const child of c.people) {
        if (!child.body.alive || ageYears(child) >= UPBRINGING_UNTIL) continue;
        const caregivers = child.social.relationships
          .filter((r) => r.roles.includes('parent'))
          .flatMap((r) => {
            const q = byId.get(r.otherId);
            return q?.body.alive ? [q] : [];
          });
        if (caregivers.length > 0) raise(child, { caregivers }, upbringing);
      }
    }
  }
  for (const p of c.people) {
    c.idleUntil[p.id] = Math.max(c.idleUntil[p.id] ?? p.now, p.now);
    c.perceivedUntil[p.id] = Math.max(c.perceivedUntil[p.id] ?? p.now, p.now);
    if (c.dayDone) c.dayDone[p.id] = dayOf(p.now);
  }
  return { events, days };
}
