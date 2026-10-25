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
 * minutes for the days someone is watching. Switching fidelity is the host's decision and happens on a day boundary.
 *
 * With `deathHandling: 'community'`, entry and dawn catch-up deaths are discovered at the sync minute and
 * skip routine work. Routine deaths retain their whole-day batch ordering; attended news and proposal cleanup
 * run only after every person's routine. Suppressing news does not suppress cleanup. This adds no mortality,
 * funeral or religious model. The host pins the option after restore; omission retains the old path.
 *
 * It does not run decisions, conversation, joint activities, contagion or the world's percepts and affordances: those
 * belong to lived time. Companions are listed by the host on both sides (each person's routine names the other),
 * since a routine day writes only its own person. Births and arrivals are the host's (`birth`, `addPerson` in
 * `onDay`); a person added during the stretch starts on the next day.
 *
 * Opt-in `upbringing.model: 'warmth-through-25'` selects living parents or guardians from the young person's
 * ties, counting each different person once, through young adulthood (under 25). Guardianship does not supply
 * warmth: `raise` reads caregiver-to-child affection. Its continuous age taper and warmth-scaled rates are
 * engineering assumptions; no abuse, schooling or adult culture diffusion. Hosts pin `upbringing` in saved-run
 * configuration and supply it after restore. Marriage, parenthood and co-residence do not gate this model;
 * a living carer in the community suffices. Omitted, the under-18, parents-only path stays exact.
 */

import { endDay } from '../chronicle/index.ts';
import { dayOf } from '../core/index.ts';
import { type RaiseOptions, raise } from '../family/index.ts';
import { ageYears } from '../lifecourse/index.ts';
import { type RoutineDay, type RoutineSource, routineDay } from '../longrun.ts';
import type { SkillTransfer } from '../skills/index.ts';
import type { Minute, Person, PersonId } from '../types.ts';
import { MINUTES_PER_DAY } from '../types.ts';
import {
  advanceCommunityPerson,
  type Community,
  cleanupCommunityDeath,
  type LifecourseOptions,
  type SimEvent,
  type StepOptions,
  tellDeath,
} from './sim.ts';

export const LIVE_COMMUNITY_DEFAULTS = {
  /** Upbringing time a day with the parents (engineering assumption: a few waking hours together). */
  upbringingMinutes: 240,
};

/** Age below which a person is raised by their parents during a routine stretch. */
const UPBRINGING_UNTIL = 18;

export interface LiveCommunityOptions {
  /** Each living person's routine for a day (`day` is the day number being lived). */
  routineFor: RoutineSource;
  /** At each dawn, before anyone's day: births, arrivals, routine changes. */
  onDay?(c: Community, day: number, at: Minute): void;
  /** Tell each death to everyone with a tie (default true; see `tellDeath`). */
  tellDeaths?: boolean;
  /** Opt into attended death receipts and scheduler cleanup; pin on every resumed call. */
  deathHandling?: StepOptions['deathHandling'];
  /**
   * Minutes of upbringing a day for eligible young people with a living carer in the community (`family.raise`).
   * Default eligibility is under 18 with a parent; warmth-through-25 includes guardians and ages under 25.
   * Defaults to `LIVE_COMMUNITY_DEFAULTS.upbringingMinutes`; 0 turns it off.
   */
  upbringingMinutes?: number;
  /** Opt-in household model and voice selection, passed to `raise`. Pin in host saved-run configuration. */
  upbringing?: RaiseOptions;
  lifecourse?: LifecourseOptions;
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
  const log = (e: SimEvent) => {
    const p = c.people.find((q) => q.id === e.personId);
    events.push(p?.lexicon?.plainEnglish && e.kind === 'died' ? { ...e, detail: `${p.name} died.` } : e);
  };
  if (opts.deathHandling === 'community') {
    // Older raw community JSON lacks these maps. Only the opt-in needs them here.
    c.interrupts ??= {};
    c.joint ??= { nextId: 0, proposals: [], excluded: {} };
  }
  // Start at the first midnight at or after the community's clock: whoever is behind lives up to it minute by
  // minute, and open chronicle days are closed so none is carried through the stretch.
  let now = 0;
  for (const p of c.people) if (p.now > now) now = p.now;
  now = Math.ceil(now / MINUTES_PER_DAY) * MINUTES_PER_DAY;
  if (now + MINUTES_PER_DAY > until) return { events, days };
  for (const p of c.people) {
    if (p.body.alive && p.now < now) advanceCommunityPerson(c, p, now, opts, log);
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
      if (p.now < now) advanceCommunityPerson(c, p, now, opts, log);
      if (opts.deathHandling === 'community' && !p.body.alive) continue;
      if (p.now !== now) continue; // added mid-stretch with a later clock: joins when the day catches up
      const r = routineDay(p, opts.routineFor(p, day), routineOpts);
      if (r.episodes.length > 0 || r.onsets.length > 0 || r.stage || r.died) {
        const list = days[p.id] ?? [];
        list.push(r);
        days[p.id] = list;
      }
      for (const kind of r.onsets)
        events.push({
          at: r.at,
          personId: p.id,
          kind: 'onset',
          detail: p.lexicon?.plainEnglish ? `${p.name} developed ${kind}.` : `${p.name}: ${kind}`,
        });
      if (r.stage)
        events.push({
          at: r.at,
          personId: p.id,
          kind: 'stage',
          detail: p.lexicon?.plainEnglish
            ? `${p.name} entered the ${r.stage} stage of life.`
            : `${p.name} is now ${r.stage}`,
        });
      if (r.died) {
        events.push({
          at: r.at,
          personId: p.id,
          kind: 'died',
          detail: p.lexicon?.plainEnglish ? `${p.name} died.` : `${p.name} died`,
        });
        died.push(p);
      }
    }
    now += MINUTES_PER_DAY;
    for (const p of c.people) if (!p.body.alive && p.now < now) p.now = now;
    // Keep routine deaths batched: recipients must run their own routine before end-of-day news/cleanup.
    for (const d of died) {
      if (tell) tellDeath(c, d, now, opts.deathHandling === 'community' ? { receipt: 'attended' } : {});
      if (opts.deathHandling === 'community') cleanupCommunityDeath(c, d, now, opts, log);
    }
    // Legacy: minors with parents. Opt-in: household influence through young adulthood with parents/guardians.
    if (upbringing > 0) {
      const byId = new Map(c.people.map((q) => [q.id, q]));
      for (const child of c.people) {
        const continuous = opts.upbringing?.model === 'warmth-through-25';
        if (!child.body.alive || ageYears(child) >= (continuous ? 25 : UPBRINGING_UNTIL)) continue;
        const caregivers = child.social.relationships
          .filter((r) => r.roles.includes('parent') || (continuous && r.roles.includes('guardian')))
          .flatMap((r) => {
            const q = byId.get(r.otherId);
            return q?.body.alive ? [q] : [];
          });
        const selected = continuous
          ? [...new Map(caregivers.filter((q) => q.id !== child.id).map((q) => [q.id, q])).values()]
          : caregivers;
        if (selected.length > 0) raise(child, { caregivers: selected }, upbringing, opts.upbringing);
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
