/**
 * The watchers as HF people (G3-2) and the `World` adapter the community driver steps them in.
 *
 * Scope. Each watcher is a framework `Person` built from `WATCHERS` (traits, skills, ties, trust in the Keeper's
 * voice, a held host norm 'keep-watch' at their own conviction), opted into mental breaks (freeze, run), derived
 * downing and impressions of the others. The Keeper is a `Person` too, never stepped: he only holds impressions.
 * Framework time is the game's absolute minute (day 0 starts at midnight), so `prayerWindows` line up.
 *
 * The world offers, at watch time (dusk and night): each free post (`post:<id>`, hold the post; its risk is the
 * danger the person can know of there, and it fulfils 'keep-watch'), sitting or eating at one's post, praying at
 * one's post in a prayer window (Yunus), running to the hall, going home to the family when a threat is at home
 * (a duty the person takes on), going to sleep, carrying a downed watcher to the hall, and the break behaviours
 * (freeze, run off) while in a break. By day (06:00 to 17:00, stepped in one go at the dusk transition): sleep,
 * eat, work, rest and mend the bell rope. Leaving the wall violates 'keep-watch'.
 *
 * Not covered: walking time between posts, private conversation, the fair, seasons and ageing (G3-3).
 */
import {
  type Activity,
  type Affordance,
  acquaintWith,
  addPerson,
  type Community,
  createCommunity,
  createPerson,
  DEFAULT_NORMS,
  enableBreaks,
  enableDowned,
  heldNorms,
  inBreak,
  joinGroups,
  MINUTES_PER_DAY,
  MINUTES_PER_YEAR,
  meet,
  type NormDefinition,
  type Outcome,
  type Percept,
  type Person,
  type PersonSpec,
  prayerWindows,
  setReserve,
  type World,
} from '@human/framework';
import {
  DAWN,
  DAY,
  DUSK_START,
  MOTION_REACH,
  POST_IDS,
  type PostId,
  postSection,
  type SectionId,
  WATCHERS,
  type WatcherDef,
  type WatcherId,
  watcherDef,
} from './config.ts';
import type { WatchState } from './state.ts';

export const KEEPER_ID = 'keeper';

/** Host norms of the watch. Standings are the game's choices, recorded as such; each person's understanding. */
export const WATCH_NORMS: NormDefinition[] = [
  {
    id: 'keep-watch',
    label: 'Keep the watch you stand',
    standing: 'obligatory',
    sources: [{ kind: 'assumption', ref: 'The Night Watch host norm; standing chosen by the game design' }],
  },
];

/** Where a watcher is: a post, the hall behind the gate, home, the village (by day) or not yet come. */
export type Place = PostId | 'hall' | 'home' | 'village' | 'away';

export function isPost(x: Place | undefined): x is PostId {
  return x !== undefined && (POST_IDS as readonly string[]).includes(x);
}

/** Watch time: dusk and night (17:00 to 06:00). */
export function isWatchTime(minute: number): boolean {
  const m = ((minute % DAY) + DAY) % DAY;
  return m >= DUSK_START || m < DAWN;
}

function personSeed(seed: number, index: number): number {
  let h = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

/** The framework spec for one watcher at `now`. */
export function watcherSpec(seed: number, def: WatcherDef, now: number): PersonSpec {
  const index = WATCHERS.indexOf(def);
  const relationships: NonNullable<PersonSpec['relationships']> = def.ties.map((t) => ({
    otherId: t.otherId,
    roles: t.roles,
    affection: t.affection,
    trust: t.trust ?? 0.55,
    familiarity: def.newcomer ? 0.2 : 0.8,
  }));
  return {
    id: def.id,
    name: def.name,
    seed: personSeed(seed, index),
    now,
    bornAt: now - def.age * MINUTES_PER_YEAR,
    sex: def.sex,
    traits: def.traits,
    norms: heldNorms(
      {
        practice: def.prays ? 0.9 : 0.3,
        extraNorms: [{ normId: 'keep-watch', standing: 'obligatory', conviction: def.duty }],
      },
      undefined,
    ),
    skills: { sling: def.sling, sight: def.sight, craft: def.craft },
    body: {
      satiety: 0.75,
      hydration: 0.85,
      sleepPressure: 0.15,
      exertion: 0,
      asleep: false,
      fitness: def.fitness,
    },
    relationships,
    commitments: def.prays ? prayerWindows(Math.floor(now / MINUTES_PER_DAY)) : [],
    voices: [{ voiceId: KEEPER_ID, trust: def.keeperTrust }],
  };
}

const BREAKS = [
  { id: 'freeze', label: 'froze', actions: ['freeze'], weight: 1, minutes: [40, 120] as [number, number] },
  { id: 'run', label: 'ran', actions: ['run-off'], weight: 1, minutes: [60, 180] as [number, number] },
];

/** A watcher as a Person, opted into breaks, downing and impressions. */
export function castPerson(seed: number, def: WatcherDef, now: number): Person {
  const p = createPerson(watcherSpec(seed, def, now));
  enableBreaks(p, BREAKS);
  enableDowned(p, { moving: 0.3, health: 0.35 });
  if (def.reserve) setReserve(p, def.reserve);
  joinGroups(p, [def.newcomer ? 'incomers' : 'village']);
  return p;
}

/** The Keeper: holds impressions; never stepped. */
export function createKeeper(seed: number, now: number): Person {
  const k = createPerson({
    id: KEEPER_ID,
    name: 'Keeper',
    seed: personSeed(seed, 99),
    now,
    bornAt: now - 40 * MINUTES_PER_YEAR,
    sex: 'male',
  });
  k.social.impressions = [];
  return k;
}

export function personOf(s: WatchState, id: WatcherId): Person | undefined {
  return s.community.people.find((p) => p.id === id);
}

export function present(s: WatchState): Person[] {
  return s.community.people;
}

/**
 * Watchers who arrive on night `s.night` join: each meets the others (insiders or the newcomer), and they come to
 * know each other as far as their ties go; the Keeper knows them by `known`.
 */
export function arrive(s: WatchState): WatcherId[] {
  const now = s.minute;
  const came: WatcherId[] = [];
  for (const def of WATCHERS) {
    if (def.arrives !== s.night || personOf(s, def.id)) continue;
    const p = castPerson(s.seed, def, now);
    addPerson(s.community, p);
    s.place[def.id] = 'village';
    came.push(def.id);
  }
  if (came.length === 0) return came;
  const people = s.community.people;
  for (const p of people) {
    const def = watcherDef(p.id as WatcherId);
    for (const q of people) {
      if (q.id === p.id) continue;
      const qd = watcherDef(q.id as WatcherId);
      if (!came.includes(p.id as WatcherId) && !came.includes(q.id as WatcherId)) continue;
      meet(p, q.id, [qd.newcomer ? 'incomers' : 'village']);
      const tie = p.social.relationships.find((r) => r.otherId === q.id);
      const familiarity = def.newcomer || qd.newcomer ? 0.15 : Math.max(0.35, tie?.familiarity ?? 0.35);
      acquaintWith(p, q, familiarity, now);
    }
  }
  for (const id of came) {
    const p = personOf(s, id);
    const def = watcherDef(id);
    if (p && def.known > 0) acquaintWith(s.keeper, p, def.known, now);
    else if (p) s.keeper.social.impressions ??= [];
  }
  return came;
}

export function createWatchCommunity(): Community {
  return createCommunity([]);
}

// ---------------------------------------------------------------------------------------------
// Danger the watchers can know of, per section (pure reads of state)
// ---------------------------------------------------------------------------------------------

export interface Danger {
  chance: number;
  severity: number;
}

/** What a person standing at `section` could know of: tokens close enough to be seen moving, and the scout. */
/** `expect`: read the warned section as it will be at night (the Keeper's dusk reads). */
export function sectionDanger(s: WatchState, section: SectionId, expect = false): Danger {
  let n = 0;
  let wolf = false;
  for (const t of s.tokens) {
    if (t.section !== section || (t.state !== 'coming' && t.state !== 'foot')) continue;
    if (t.state === 'coming' && t.pos < MOTION_REACH) continue;
    n += 1;
    if (t.kind === 'wolf') wolf = true;
  }
  if (n === 0)
    return section === s.warned && (s.phase === 'night' || expect)
      ? { chance: 0.08, severity: 0.3 }
      : { chance: 0, severity: 0 };
  return { chance: Math.min(0.75, 0.2 + 0.12 * n), severity: wolf ? 0.5 : 0.35 };
}

/** Who is at a post in `section` (standing, sitting, frozen or down). */
export function atSection(s: WatchState, section: SectionId, except?: string): WatcherId[] {
  const out: WatcherId[] = [];
  for (const p of s.community.people) {
    if (p.id === except) continue;
    const pl = s.place[p.id as WatcherId];
    if (isPost(pl) && postSection(pl) === section) out.push(p.id as WatcherId);
  }
  return out;
}

function occupied(s: WatchState, post: PostId, except: string): boolean {
  for (const p of s.community.people) {
    if (p.id === except) continue;
    if (s.place[p.id as WatcherId] === post && p.body.alive) return true;
  }
  return false;
}

const KEEP: { normId: string; relation: 'fulfills' | 'violates' }[] = [
  { normId: 'keep-watch', relation: 'fulfills' },
];
const LEAVE: { normId: string; relation: 'fulfills' | 'violates' }[] = [
  { normId: 'keep-watch', relation: 'violates' },
];

/** Place an activity puts its person at (undefined: stays where they are). */
export function placeOfActivity(act: Activity): Place | undefined {
  const [kind, arg] = act.affordanceId.split(':');
  if (
    (kind === 'post' ||
      kind === 'sit' ||
      kind === 'doze' ||
      kind === 'eat' ||
      kind === 'pray' ||
      kind === 'freeze') &&
    arg
  )
    return arg as PostId;
  if (kind === 'flee' || kind === 'run-off') return 'hall';
  if (kind === 'go-home' || kind === 'sleep') return 'home';
  if (kind === 'day') return 'village';
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// The World adapter
// ---------------------------------------------------------------------------------------------

export class WatchWorld implements World {
  readonly catalog = [...DEFAULT_NORMS, ...WATCH_NORMS];
  /** `expect`: offer the warned section as dangerous already (for the Keeper's dusk reads; never stepped). */
  constructor(
    private readonly s: WatchState,
    private readonly expect = false,
  ) {}

  now(): number {
    return this.s.minute;
  }

  affordancesFor(p: Person): Affordance[] {
    return isWatchTime(p.now) ? this.watchOffers(p) : this.dayOffers(p);
  }

  private watchOffers(p: Person): Affordance[] {
    const s = this.s;
    const id = p.id as WatcherId;
    const def = watcherDef(id);
    const here = s.place[id];
    const out: Affordance[] = [];
    const brk = inBreak(p);
    // At dusk every free post is open; once night falls a watcher on the wall weighs only staying where they are
    // against leaving it, unless the Keeper has sent word of another post (the posting or a card's ask).
    const night = s.phase === 'night' && isPost(here);
    const asked = s.asks[id]?.sug.affordanceId;
    for (const post of POST_IDS) {
      if (occupied(s, post, p.id) && here !== post) continue;
      if (night && post !== here && s.posts[id] !== post && asked !== `post:${post}`) continue;
      const section = postSection(post);
      const d = sectionDanger(s, section, this.expect);
      const others = atSection(s, section, p.id);
      const a: Affordance = {
        id: `post:${post}`,
        action: 'hold-post',
        label: `stand the ${section} wall`,
        targetId: section,
        placeId: section,
        duration: 60,
        effort: 0.15,
        focus: 0.3,
        advertises: { competence: 0.03, meaning: 0.04 },
        norms: KEEP,
        tags: ['watch'],
        requires: { moving: section === 'gate' ? 0.45 : 0.3 },
      };
      if (others.length > 0) a.with = others;
      if (d.chance > 0) {
        a.risk = { chance: d.chance, severity: d.severity, kind: 'bite' };
        // Fear pulls away from risky offers (HF emotion tendencies).
        a.tags = ['watch', 'risky'];
      }
      out.push(a);
    }
    if (isPost(here)) {
      // Sitting or eating at a post under threat is as exposed as standing it: fear pulls from all three alike,
      // so the choice it makes is to leave the wall, not to sit down on it.
      const exposed = sectionDanger(s, postSection(here), this.expect).chance > 0;
      out.push({
        id: `sit:${here}`,
        action: 'sit',
        label: 'sit down at the post',
        targetId: postSection(here),
        placeId: postSection(here),
        duration: 30,
        effort: 0,
        advertises: { rest: 0.12 },
        tags: exposed ? ['rest', 'watch', 'risky'] : ['rest', 'watch'],
      });
      // Nodding off at the post: no norm is broken on purpose, but nothing is watched either; a threat near
      // them wakes them (the driver interrupts sleep on a near percept).
      out.push({
        id: `doze:${here}`,
        action: 'doze',
        label: 'nod off at the post',
        targetId: postSection(here),
        placeId: postSection(here),
        duration: 30,
        effort: 0,
        mode: 'sleep',
        advertises: { sleep: 0.25, rest: 0.1 },
        tags: exposed ? ['rest', 'risky'] : ['rest'],
      });
      out.push({
        id: `eat:${here}`,
        action: 'eat',
        label: 'eat bread at the post',
        targetId: postSection(here),
        placeId: postSection(here),
        duration: 15,
        effort: 0,
        advertises: { food: 0.3, water: 0.2 },
        tags: exposed ? ['watch', 'risky'] : ['watch'],
      });
      if (
        def.prays &&
        p.agenda.commitments.some(
          (c) => c.status === 'pending' && c.kind === 'worship' && c.from <= p.now && p.now < c.until,
        )
      )
        out.push({
          id: `pray:${here}`,
          action: 'pray',
          label: 'pray at the post',
          duration: 10,
          effort: 0.05,
          advertises: { meaning: 0.1 },
          tags: ['worship'],
        });
      if (brk) {
        out.push({
          id: `freeze:${here}`,
          action: 'freeze',
          label: 'stand frozen',
          duration: 30,
          effort: 0,
          advertises: {},
          tags: ['break:freeze'],
        });
      }
    }
    if (brk)
      out.push({
        id: 'run-off',
        action: 'run-off',
        label: 'run from the wall',
        placeId: 'hall',
        duration: 60,
        effort: 0.5,
        advertises: { safety: 0.3 },
        tags: ['break:run'],
        norms: LEAVE,
      });
    out.push({
      id: 'flee',
      action: 'flee',
      label: 'go to the hall',
      placeId: 'hall',
      duration: 45,
      effort: 0.2,
      advertises: { safety: 0.5, rest: 0.1 },
      // The hall is lit and full of people: fear and distress pull toward it (HF 'comfort' tendency).
      tags: ['comfort'],
      norms: LEAVE,
    });
    out.push({
      id: 'sleep',
      action: 'sleep',
      label: 'go home to sleep',
      placeId: 'home',
      duration: 240,
      effort: 0,
      mode: 'sleep',
      advertises: { sleep: 0.8, rest: 0.4 },
      norms: LEAVE,
    });
    const homeThreat = def.family !== null && s.homeThreat[def.home] > p.now - 60;
    if (homeThreat)
      out.push({
        id: 'go-home',
        action: 'go-home',
        label: `go home to ${def.family}`,
        targetId: `home:${def.home}`,
        placeId: 'home',
        duration: 60,
        effort: 0.3,
        advertises: { safety: 0.2, belonging: 0.2 },
        norms: LEAVE,
      });
    for (const q of s.community.people) {
      if (q.id === p.id || !q.body.downed || s.carried[q.id as WatcherId]) continue;
      const qp = s.place[q.id as WatcherId];
      if (!isPost(qp)) continue;
      out.push({
        id: `carry:${q.id}`,
        action: 'carry',
        label: `carry ${q.name} to the hall`,
        targetId: q.id,
        placeId: postSection(qp),
        with: [q.id],
        duration: 20,
        effort: 0.6,
        advertises: { meaning: 0.1 },
        norms: [{ normId: 'help-neighbor', relation: 'fulfills' }],
        requires: { moving: 0.5 },
      });
    }
    return out;
  }

  private dayOffers(p: Person): Affordance[] {
    const s = this.s;
    // A day's sleep ends by 16:30 so nobody sleeps through dusk.
    const tod = ((p.now % DAY) + DAY) % DAY;
    const out: Affordance[] = [
      {
        id: 'sleep',
        action: 'sleep',
        label: 'sleep',
        placeId: 'home',
        duration: Math.max(30, Math.min(480, DUSK_START - 30 - tod)),
        effort: 0,
        mode: 'sleep',
        advertises: { sleep: 0.9, rest: 0.5 },
      },
      {
        id: 'day:eat',
        action: 'eat',
        label: 'eat',
        duration: 30,
        effort: 0,
        advertises: { food: 0.6, water: 0.5, belonging: 0.05 },
      },
      {
        id: 'day:work',
        action: 'work',
        label: 'work at their trade',
        duration: 120,
        effort: 0.35,
        advertises: { competence: 0.1, meaning: 0.04 },
        tags: ['work'],
      },
      {
        id: 'day:rest',
        action: 'rest',
        label: 'rest',
        duration: 60,
        effort: 0,
        advertises: { rest: 0.3, leisure: 0.1 },
        tags: ['rest'],
      },
    ];
    if (s.rope.wear > 0.02)
      out.push({
        id: 'day:mend',
        action: 'mend',
        label: 'mend the bell rope',
        targetId: 'rope',
        duration: 120,
        effort: 0.25,
        skill: { id: 'craft', difficulty: 0.5 },
        advertises: { competence: 0.1, meaning: 0.06 },
        norms: KEEP,
        tags: ['work'],
      });
    if (
      watcherDef(p.id as WatcherId).prays &&
      p.agenda.commitments.some(
        (c) => c.status === 'pending' && c.kind === 'worship' && c.from <= p.now && p.now < c.until,
      )
    )
      out.push({
        id: 'day:pray',
        action: 'pray',
        label: 'pray',
        duration: 10,
        effort: 0.05,
        advertises: { meaning: 0.1 },
        tags: ['worship'],
      });
    return out;
  }

  perceptsFor(p: Person, since: number, until: number): Percept[] {
    const q = this.s.percepts[p.id as WatcherId] ?? [];
    return q.filter((x) => x.at > since && x.at <= until);
  }

  resolve(p: Person, act: Activity, reason: 'ended' | 'interrupted'): Outcome {
    const at = Math.max(p.now, reason === 'ended' ? act.endsAt : p.now);
    const span = Math.max(1, act.endsAt - act.startedAt);
    const share = reason === 'ended' ? 1 : Math.max(0, Math.min(1, (at - act.startedAt) / span));
    const needs: Outcome['needs'] = {};
    for (const [k, v] of Object.entries(act.affordance.advertises))
      needs[k as keyof typeof needs] = (v ?? 0) * share;
    return {
      affordanceId: act.affordanceId,
      action: act.action,
      ...(act.targetId !== undefined ? { targetId: act.targetId } : {}),
      status: reason === 'ended' ? 'completed' : 'interrupted',
      at,
      needs,
    };
  }
}
