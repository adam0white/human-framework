/**
 * The villagers as HF people (G3-2, G3-3) and the `World` adapter the community driver steps them in.
 *
 * Scope. Each founder is a framework `Person` built from `WATCHERS` (traits, skills, ties, trust in the Keeper's
 * voice, a held host norm 'keep-watch' at their own conviction); their kin (`FOUNDER_KIN`), the children born in
 * the village and newcomers are people too. All are opted into mental breaks (freeze, run), derived downing,
 * impressions of the others and the long-run faculties (gists, yearbook, character change, skill consolidation).
 * The Keeper is a `Person` too, never stepped: he only holds impressions. Framework time is the game's absolute
 * minute (day 0 starts at midnight), so `prayerWindows` line up. The chronicle's record of each villager (name,
 * home, status) is game state (`Villager`), apart from the person.
 *
 * The world offers a watcher (of age, here), at watch time (dusk and night): each free post (`post:<id>`, hold the
 * post; its risk is the danger the person can know of there, and it fulfils 'keep-watch'), sitting or eating at
 * one's post, praying at one's post in a prayer window, running to the hall, going home to the children when a
 * threat is near the house (a duty the person takes on), going to sleep, carrying a downed watcher to the hall, and
 * the break behaviours (freeze, run off) while in a break. A child is offered only home: sleep and rest. By day
 * (06:00 to 17:00, stepped in one go at the dusk transition): sleep, eat, work, rest and mend the bell rope.
 * Leaving the wall violates 'keep-watch'.
 *
 * Not covered: walking time between posts, private conversation. Seasons are lived by routine (`year.ts`).
 */
import type { PersonAuthoring } from '@adam0white/human-framework';
import { canonicalCast } from '@adam0white/lab-client';
import { chapterPeople, personChapter } from '../../shared/cast-chapter.ts';
import { requireValue } from '../../shared/require-value.ts';
import { type Affordance, actorEvidence, actorInput, type Percept, type Person, readActor } from './actor.ts';
import { skillLevel } from './actor-effects.ts';
import { arriveActor, flushActors, schedulePrayerDay } from './actor-world.ts';
import { admitWatchPerson } from './cast.ts';
import {
  ALL_POST_IDS,
  BELL_ROUSE_BASE,
  BELL_ROUSE_LOUD,
  DAWN,
  DAY,
  DUSK_START,
  FOUNDER_KIN,
  HOME_CHILD_AGE,
  type KinDef,
  type PostId,
  postSection,
  RETIRE_AGE,
  ROPE_MEND_PER_HOUR,
  type SectionId,
  WATCH_AGE,
  WATCH_CAST,
  WATCHERS,
  type WatcherDef,
  type WatcherId,
  WINTER_RULES,
} from './config.ts';
import { minuteMs, WatchActors } from './hf4.ts';
import { authoredKin, authoredWatcher, watchPerson, watchSpec } from './hf4-authoring.ts';
import type { Villager, WatchState } from './state.ts';

export const KEEPER_ID = 'keeper';

/** Host norms of the watch. Standings are the game's choices, recorded as such; each person's understanding. */
export { WATCH_CAST_NORMS as WATCH_NORMS } from '../../shared/cast-norms.ts';

/** Where a villager is: a post, the hall behind the gate, home, the village (by day) or not yet come. */
export type Place = PostId | 'hall' | 'home' | 'village' | 'away';

export function isPost(x: Place | undefined | null): x is PostId {
  return x !== undefined && x !== null && (ALL_POST_IDS as readonly string[]).includes(x);
}

/** Watch time: dusk and night (17:00 to 06:00). */
export function isWatchTime(minute: number): boolean {
  const m = ((minute % DAY) + DAY) % DAY;
  return m >= DUSK_START || m < DAWN;
}

export function personSeed(seed: number, index: number): number {
  let h = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

/** Actual actor death or retained death status closes only an owned canonical branch. */
export function watchTerminalReceipts(s: WatchState, heads: Record<string, unknown>) {
  return Object.keys(heads).flatMap((castId) => {
    const role = Object.entries(WATCH_CAST).find(([, cast]) => cast === castId)?.[0];
    return role &&
      (s.cast[role]?.status === 'dead' || s.community.people.some((p) => p.id === role && !p.body.alive))
      ? [{ castId, at: s.minute }]
      : [];
  });
}
/** Every allocated carried actor is preflighted before the batch claim, including later arrivals. */
export function prepareWatchCast(
  seed: number,
  chapter: import('../../shared/cast-chapter.ts').CastChapter,
): void {
  for (const single of chapterPeople(chapter)) {
    const def = WATCHERS.find((w) => WATCH_CAST[w.id] === single.input.parent.castId);
    if (!def) throw new Error('No authored Watch role.');
    const now = DUSK_START + (def.arrives - 1) * DAY;
    const authored = admitWatchPerson(authoredWatcher(def, minuteMs(now)), single);
    const physical = { actions: [], care: null };
    const spec = { ...watchSpec(seed, physical), start: minuteMs(now) };
    WatchActors.create(spec, [createKeeper(seed, now), authored], physical).snapshot();
  }
}
export function watcherSpec(_seed: number, def: WatcherDef, now: number): PersonAuthoring {
  return authoredWatcher(def, minuteMs(now));
}
export function castPerson(_seed: number, def: WatcherDef, now: number): PersonAuthoring {
  return authoredWatcher(def, minuteMs(now));
}
export function kinPerson(_seed: number, kin: KinDef, index: number, now: number): PersonAuthoring {
  return authoredKin(kin, index, minuteMs(now));
}

/** The founders and their kin as the chronicle's first cast, all still to come. */
export function foundingCast(): Villager[] {
  const out: Villager[] = WATCHERS.map((def, i) => ({
    id: def.id,
    name: def.name,
    sex: def.sex,
    home: def.home,
    usual: def.usual,
    note: def.note,
    look: i,
    prays: def.prays === true,
    newcomer: def.newcomer === true,
    known: def.known,
    comes: { year: 1, night: def.arrives },
    status: 'coming' as const,
    gen: 1,
    bornHere: false,
  }));
  FOUNDER_KIN.forEach((kin, i) => {
    const w = WATCHERS.find((d) => d.id === kin.with);
    out.push({
      id: kin.id,
      name: kin.name,
      sex: kin.sex,
      home: kin.home,
      usual: w?.usual ?? 'gate-1',
      note: 'Grew up under the wall',
      look: WATCHERS.length + i,
      prays: false,
      newcomer: false,
      known: 0.5,
      comes: { year: 1, night: w?.arrives ?? 1 },
      status: 'coming',
      gen: 2,
      bornHere: false,
      ...(kin.parents ? { parents: [...kin.parents] } : {}),
    });
  });
  return out;
}

export function addVillager(s: WatchState, v: Villager): void {
  if (s.cast[v.id]) return;
  s.cast[v.id] = v;
  s.order.push(v.id);
}

/** The chronicle's record of a villager. Throws for an unknown id (a bug, not a game state). */
export function villager(s: WatchState, id: WatcherId): Villager {
  const v = s.cast[id];
  if (!v) throw new Error(`unknown villager ${id}`);
  return v;
}

export function nameOf(s: WatchState, id: WatcherId): string {
  return s.cast[id]?.name ?? 'someone';
}

/** "her" or "his". */
export function their(s: WatchState, id: WatcherId): string {
  return s.cast[id]?.sex === 'female' ? 'her' : 'his';
}

/** "her" or "him". */
export function them(s: WatchState, id: WatcherId): string {
  return s.cast[id]?.sex === 'female' ? 'her' : 'him';
}

/** Living and here: in the community, alive, not gone. */
export function isHere(s: WatchState, p: Person): boolean {
  return p.body.alive && s.cast[p.id]?.status === 'here';
}

export function ageAt(p: Person, now: number): number {
  return (now - p.life.bornAt) / (365 * DAY);
}

/** Of watch age and here: the people who stand the wall, are posted and speak at dawn. */
export function isWatcher(s: WatchState, p: Person, now: number = s.minute): boolean {
  const age = ageAt(p, now);
  return isHere(s, p) && age >= WATCH_AGE && age < RETIRE_AGE && s.cast[p.id]?.limp !== true;
}

/**
 * The children at home a watcher would run to when a threat is near the house: their own children, or a ward,
 * under `HOME_CHILD_AGE`, alive and here. In words ("her two children", "his little sister"), or null.
 */
export function familyWords(s: WatchState, id: WatcherId): string | null {
  const kids: { sibling: boolean; female: boolean; parent: boolean; name: string }[] = [];
  for (const q of s.community.people) {
    if (q.id === id || !isHere(s, q) || ageAt(q, s.minute) >= HOME_CHILD_AGE) continue;
    const tie = q.social.relationships.find((r) => r.otherId === id);
    if (!tie) continue;
    const female = q.life.sex === 'female';
    if (tie.roles.includes('parent'))
      kids.push({ sibling: false, female, parent: true, name: nameOf(s, q.id) });
    else if (tie.roles.includes('guardian'))
      kids.push({ sibling: tie.roles.includes('sibling'), female, parent: false, name: nameOf(s, q.id) });
  }
  const my = their(s, id);
  const k = kids[0];
  if (!k) return null;
  if (kids.length > 1) {
    const names = `${kids
      .slice(0, -1)
      .map((child) => child.name)
      .join(', ')} and ${kids.at(-1)?.name}`;
    return kids.every((child) => child.parent)
      ? `${my} children, ${names}`
      : `${names}, the children in ${my} care`;
  }
  if (k.sibling) return `${my} little ${k.female ? 'sister' : 'brother'}, ${k.name}`;
  return k.parent
    ? `${my} ${k.female ? 'daughter' : 'son'}, ${k.name}`
    : `${k.name}, the child in ${my} care`;
}

/** The Keeper: holds impressions; never stepped. */
export function createKeeper(_seed: number, now: number): PersonAuthoring {
  return watchPerson(KEEPER_ID, 'Keeper', 'male', 40, minuteMs(now));
}

/**
 * Lookups over `s.community.people` that do not scan everyone (H2 performance review, P7). Derived, never saved: held
 * in a WeakMap keyed by the people array, so a resumed page or a cloned state starts its own. The framework's
 * `addPerson` and Game 3's `prune` both replace the array, so a new array means a changed cast; the length is
 * checked as well in case anything ever pushes in place.
 *
 * `byId` is first-wins, like `find`. `kids` maps a parent's id to the people whose own tie to that parent carries
 * 'parent' or 'guardian', in people order. Those roles are seeded on the child's side when the child is created,
 * before it joins the array; a tie can still be lost later (eviction at the relationship cap) or, in principle,
 * gained, so `kids` is rebuilt when any person's relationship list is replaced, grows or shrinks, or gets a new last
 * entry (an eviction at the cap is a splice and a push), and `childrenOf` re-tests every candidate on read.
 */
export function careCandidates(s: WatchState, parentId: WatcherId): readonly Person[] {
  return s.community.people.filter((p) =>
    p.social.relationships.some(
      (r) => r.otherId === parentId && (r.roles.includes('parent') || r.roles.includes('guardian')),
    ),
  );
}
export function personOf(s: WatchState, id: WatcherId): Person | undefined {
  return readActor(s, id);
}

/**
 * Villagers who come on this night of this year join: founders as watchers, their kin at home. Each meets the others
 * (insiders or the newcomer) and they come to know each other as far as their ties go; the Keeper knows them by
 * `known`. Returns the ids who came.
 */
export function arrive(s: WatchState): WatcherId[] {
  const came: WatcherId[] = [];
  for (const id of s.order) {
    const v = s.cast[id];
    if (
      v?.status !== 'coming' ||
      v.comes.year !== s.year ||
      v.comes.night !== s.winterNight ||
      personOf(s, id)
    )
      continue;
    const def = WATCHERS.find((d) => d.id === id),
      ki = FOUNDER_KIN.findIndex((k) => k.id === id),
      kin = FOUNDER_KIN[ki];
    let authored = def
      ? authoredWatcher(def, minuteMs(s.minute))
      : kin
        ? authoredKin(kin, ki, minuteMs(s.minute))
        : undefined;
    if (!authored) continue;
    const single = personChapter(s.castChapter, WATCH_CAST[id]);
    if (single) authored = admitWatchPerson(authored, single);
    s.actorEvents.push(...arriveActor(s, authored));
    v.status = 'here';
    s.place[id] = 'village';
    s.posts[id] = null;
    s.press[id] = 'ask';
    s.postedAt[id] = s.minute;
    came.push(id);
    if (v.prays || single) schedulePrayerDay(s, id, Math.floor(s.minute / DAY));
  }
  for (const id of came) {
    const v = s.cast[id];
    if (!v) continue;
    for (const q of s.community.people) {
      if (q.id === id || !isHere(s, q)) continue;
      for (const [observer, target] of [
        [id, q.id],
        [q.id, id],
      ] as const) {
        actorInput(s, 'groups.received', {
          ...actorEvidence(s, observer, 'arrival-groups'),
          self: [s.cast[observer]?.newcomer ? 'incomers' : 'village'],
          others: [{ person: target, groups: [s.cast[target]?.newcomer ? 'incomers' : 'village'] }],
        });
        actorInput(s, 'acquaintance.received', {
          ...actorEvidence(s, observer, 'arrival'),
          target,
          familiarity: v.newcomer || s.cast[q.id]?.newcomer ? 0.15 : 0.35,
          known: [],
        });
      }
    }
    if (v.known > 0)
      actorInput(s, 'acquaintance.received', {
        ...actorEvidence(s, KEEPER_ID, 'arrival'),
        target: id,
        familiarity: v.known,
        known: [],
      });
  }
  if (came.length) s.actorEvents.push(...flushActors(s, s.minute));
  return came;
}

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
    if (t.state === 'coming' && t.pos < WINTER_RULES[s.winterSetting?.active ?? 'hard'].motionReach) continue;
    n += 1;
    if (t.kind === 'wolf') wolf = true;
  }
  if (n === 0)
    return isWarned(s, section) && (s.phase === 'night' || expect)
      ? { chance: 0.08, severity: 0.3 }
      : { chance: 0, severity: 0 };
  return { chance: Math.min(0.75, 0.2 + 0.12 * n), severity: wolf ? 0.5 : 0.35 };
}

/** Whether the scout named this stretch tonight (one stretch, or either of two). */
export function isWarned(s: WatchState, section: SectionId): boolean {
  return section === s.warned || s.warnedAlso === section;
}

/** Who is at a post in `section` (standing, sitting, frozen or down). */
export function atSection(s: WatchState, section: SectionId, except?: string): WatcherId[] {
  const out: WatcherId[] = [];
  for (const p of s.community.people) {
    if (p.id === except || !isHere(s, p)) continue;
    const pl = s.place[p.id];
    if (isPost(pl) && postSection(pl) === section) out.push(p.id);
  }
  return out;
}

function occupied(s: WatchState, post: PostId, except: string): boolean {
  for (const p of s.community.people) {
    if (p.id === except) continue;
    if (s.place[p.id] !== post || !isHere(s, p)) continue;
    // At dusk someone standing here but posted elsewhere is about to walk over, so two watchers posted onto each
    // other's stretches swap instead of each waiting for the other to leave.
    const request = s.nightRequests?.[except];
    if (request && request.until > s.minute && request.who === p.id && request.affordance === `post:${post}`)
      continue;
    const posted = s.posts[p.id];
    if (s.phase === 'dusk' && posted && posted !== post) continue;
    return true;
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
export function placeOfActivity(act: NonNullable<Person['activity']>): Place | undefined {
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
  if (kind === 'dusk-rest' || kind === 'go-home' || kind === 'sleep' || kind === 'home') return 'home';
  if (kind === 'day') return 'village';
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// The World adapter
// ---------------------------------------------------------------------------------------------

export class WatchWorld {
  private readonly s: WatchState;
  /** Offer the warned section as dangerous already (for the Keeper's dusk reads; never stepped). */
  private readonly expect: boolean;

  constructor(s: WatchState, expect = false) {
    this.s = s;
    this.expect = expect;
  }

  now(): number {
    return this.s.minute;
  }

  affordancesFor(p: Person): Affordance[] {
    if (!isWatcher(this.s, p, p.now)) return this.homeOffers(p);
    return isWatchTime(p.now) ? this.watchOffers(p) : this.dayOffers(p);
  }

  /** A child, or anyone not of the watch: home, sleep and rest; by day eating too. */
  private homeOffers(p: Person): Affordance[] {
    const tod = ((p.now % DAY) + DAY) % DAY;
    const night = isWatchTime(p.now);
    const out: Affordance[] = [
      {
        id: 'sleep',
        action: 'sleep',
        label: 'sleep',
        placeId: 'home',
        duration: night ? 240 : Math.max(30, Math.min(240, DUSK_START - 30 - tod)),
        effort: 0,
        mode: 'sleep',
        advertises: { sleep: 0.9, rest: 0.5 },
      },
      {
        id: 'home:rest',
        action: 'rest',
        label: 'stay at home',
        placeId: 'home',
        duration: 60,
        effort: 0,
        advertises: { rest: 0.3, leisure: 0.15, belonging: 0.05 },
        tags: ['rest'],
      },
      {
        id: 'home:eat',
        action: 'eat',
        label: 'eat',
        duration: 30,
        effort: 0,
        advertises: { food: 0.6, water: 0.5 },
      },
    ];
    return out;
  }

  private watchOffers(p: Person): Affordance[] {
    const s = this.s;
    const id = p.id;
    const v = villager(s, id);
    const here = s.place[id];
    const out: Affordance[] = [];

    // At dusk every free post is open; once night falls a watcher on the wall weighs only staying where they are
    // against leaving it, unless the Keeper has sent word of another post (the posting or a card's ask).
    const night = s.phase === 'night' && isPost(here);
    const asked = s.asks[id]?.sug.affordanceId;
    for (const post of s.openPosts) {
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
      // Nodding off at the post: no norm is broken on purpose, but nothing is watched either. A threat near them
      // brings their review forward (the driver interrupts on a near percept), but the review keeps the sleep unless
      // need is desperate; the bell wakes them outright (`ringBell`). Nobody who just heard the bell nods off:
      // for BELL_ROUSE_BASE + BELL_ROUSE_LOUD × loudness minutes after the pull the doze is not on offer.
      const heard = s.bell.heard[id] ?? 0;
      const roused = heard > 0 && s.minute < s.bell.rungAt + BELL_ROUSE_BASE + BELL_ROUSE_LOUD * heard;
      if (!roused)
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
        (v.prays || Boolean(personChapter(s.castChapter, WATCH_CAST[p.id]))) &&
        p.agenda.commitments.some(
          (c) =>
            c.status === 'pending' &&
            c.kind === 'worship' &&
            c.from <= minuteMs(p.now) &&
            minuteMs(p.now) < c.until,
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
    const request = s.duskRest?.requests[id];
    if (request && ['pending', 'deferred', 'resting'].includes(request.status) && p.now < request.until)
      out.push({
        id: 'dusk-rest',
        action: 'sleep',
        label: 'take tonight off at home',
        placeId: 'home',
        duration: request.until - p.now,
        effort: 0,
        mode: 'sleep',
        advertises: { sleep: 0.8, rest: 0.4 },
        norms: LEAVE,
      });
    const family = familyWords(s, id);
    const homeThreat = family !== null && (s.homeThreat[v.home] ?? -1e9) > p.now - 60;
    if (homeThreat)
      out.push({
        id: 'go-home',
        action: 'go-home',
        label: `go home to ${family}`,
        targetId: `home:${v.home}`,
        placeId: 'home',
        duration: 60,
        effort: 0.3,
        advertises: { safety: 0.2, belonging: 0.2 },
        norms: LEAVE,
      });
    for (const q of s.community.people) {
      if (q.id === p.id || !q.body.downed || s.carried[q.id] || !isHere(s, q)) continue;
      const qp = s.place[q.id];
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
        label: personChapter(s.castChapter, WATCH_CAST[p.id])
          ? (canonicalCast(requireValue(WATCH_CAST[p.id])).assignments[
              requireValue(personChapter(s.castChapter, WATCH_CAST[p.id])).input.life.assignment
            ] ?? 'work at their trade')
          : 'work at their trade',
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
    // Only as many hands on the rope as its wear needs (owner's year-4 export: after a single pull, seven watchers
    // each spent two hours of their day mending 0.12 of wear instead of sleeping before the night). Those already
    // mending will take off ROPE_MEND_PER_HOUR × 2 × craft each when they finish (day.ts).
    let mending = 0;
    for (const q of s.community.people)
      if (q.id !== p.id && q.activity?.affordanceId === 'day:mend')
        mending += ROPE_MEND_PER_HOUR * 2 * skillLevel(q, 'craft');
    if (s.rope.wear - mending > 0.02)
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
      (s.cast[p.id]?.prays || Boolean(personChapter(s.castChapter, WATCH_CAST[p.id]))) &&
      p.agenda.commitments.some(
        (c) =>
          c.status === 'pending' &&
          c.kind === 'worship' &&
          c.from <= minuteMs(p.now) &&
          minuteMs(p.now) < c.until,
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
    if (
      p.id === 'kian' &&
      s.refugeVisit?.status === 'agreed' &&
      s.refugeVisit.careCompletedAt === undefined &&
      s.grain >= 0.1 &&
      (s.homeThreat.west ?? -1e9) <= p.now - 90
    )
      out.push({
        id: 'day:care-ada',
        action: 'care-ada',
        targetId: 'ada',
        placeId: 'home',
        label: 'Share a small meal and water with Ada, then rest together',
        duration: 30,
        effort: 0.05,
        advertises: { belonging: 0.2, rest: 0.1 },
        tags: ['care'],
      });

    return out;
  }

  perceptsFor(p: Person, since: number, until: number): Percept[] {
    const q = this.s.percepts[p.id] ?? [];
    return q.filter((x) => x.at > since && x.at <= until);
  }
}
