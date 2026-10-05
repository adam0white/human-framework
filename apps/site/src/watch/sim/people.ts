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
  enableCharacterChange,
  enableDowned,
  enableGists,
  enableSkillRetention,
  enableYearbook,
  GENERIC_CUSTOM,
  heldNorms,
  inBreak,
  joinGroups,
  MINUTES_PER_DAY,
  MINUTES_PER_YEAR,
  marry,
  meet,
  type NormDefinition,
  type Outcome,
  type Percept,
  type Person,
  type PersonSpec,
  prayerWindows,
  type Relationship,
  setReserve,
  setRetention,
  skillLevel,
  spousesOf,
  type World,
} from '@adam0white/human-framework';
import {
  ALL_POST_IDS,
  BELL_ROUSE_BASE,
  BELL_ROUSE_LOUD,
  DAWN,
  DAY,
  DUSK_START,
  FOUNDER_KIN,
  FOUNDER_MARRIAGES,
  HOME_CHILD_AGE,
  type KinDef,
  MOTION_REACH,
  type PostId,
  postSection,
  RETIRE_AGE,
  ROPE_MEND_PER_HOUR,
  type SectionId,
  WATCH_AGE,
  WATCHERS,
  type WatcherDef,
  type WatcherId,
} from './config.ts';
import type { Villager, WatchState } from './state.ts';

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

/**
 * The long-run faculties every villager carries (HF L1, G3-3): lasting gists of memorable nights, a yearbook, slow
 * character change and skills that consolidate with practice. Saves carry no decision trace (the game never shows
 * one) and keep detailed days for about a season (`CHRONICLE_DAYS`), which folds the rest into the yearbook at once
 * (HF 2.0 retention; the H2 performance review found trace and day records were most of a page).
 */
export function enableLongLife(p: Person): void {
  enableGists(p);
  enableYearbook(p);
  enableCharacterChange(p);
  enableSkillRetention(p);
  setRetention(p, { trace: 0, chronicleDays: CHRONICLE_DAYS });
}

/** Days of detailed day records a villager keeps (HF `Retention.chronicleDays`). */
const CHRONICLE_DAYS = 40;

/** Opt a villager into what the wall asks of them: breaks, downing, reserve, their group, the long run. */
export function equip(p: Person, opts: { reserve?: WatcherDef['reserve']; newcomer?: boolean } = {}): void {
  enableBreaks(p, BREAKS);
  enableDowned(p, { moving: 0.3, health: 0.35 });
  if (opts.reserve) setReserve(p, opts.reserve);
  joinGroups(p, [opts.newcomer ? 'incomers' : 'village']);
  enableLongLife(p);
}

/** A watcher as a Person, opted into breaks, downing and impressions. */
export function castPerson(seed: number, def: WatcherDef, now: number): Person {
  const p = createPerson(watcherSpec(seed, def, now));
  equip(p, { ...(def.reserve ? { reserve: def.reserve } : {}), newcomer: def.newcomer === true });
  return p;
}

/** A founder's child or ward as a Person (G3-3): at home, raised by the household, years from the wall. */
export function kinPerson(seed: number, kin: KinDef, index: number, now: number): Person {
  const relationships: NonNullable<PersonSpec['relationships']> = [];
  for (const parent of kin.parents ?? [])
    relationships.push({
      otherId: parent,
      roles: ['parent'],
      affection: 0.75,
      trust: 0.75,
      familiarity: 0.9,
    });
  if (kin.guardian)
    relationships.push({
      otherId: kin.guardian,
      roles: ['guardian', 'sibling'],
      affection: 0.8,
      trust: 0.75,
      familiarity: 0.9,
    });
  const p = createPerson({
    id: kin.id,
    name: kin.name,
    seed: personSeed(seed, 20 + index),
    now,
    bornAt: now - kin.age * MINUTES_PER_YEAR - index * 9_973,
    sex: kin.sex,
    relationships,
    skills: { sling: 0.1, sight: 0.3, craft: 0.1 },
    voices: [{ voiceId: KEEPER_ID, trust: 0.6 }],
  });
  equip(p);
  return p;
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
  return (now - p.life.bornAt) / MINUTES_PER_YEAR;
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
  const kids: { sibling: boolean; female: boolean }[] = [];
  for (const q of s.community.people) {
    if (q.id === id || !isHere(s, q) || ageAt(q, s.minute) >= HOME_CHILD_AGE) continue;
    const tie = q.social.relationships.find((r) => r.otherId === id);
    if (!tie) continue;
    const female = q.life.sex === 'female';
    if (tie.roles.includes('parent')) kids.push({ sibling: false, female });
    else if (tie.roles.includes('guardian')) kids.push({ sibling: tie.roles.includes('sibling'), female });
  }
  const my = their(s, id);
  const k = kids[0];
  if (!k) return null;
  if (kids.length > 1) return `${my} ${['two', 'three', 'four', 'five'][kids.length - 2] ?? 'many'} children`;
  if (k.sibling) return `${my} little ${k.female ? 'sister' : 'brother'}`;
  return `${my} ${k.female ? 'daughter' : 'son'}`;
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
interface CastIndex {
  length: number;
  byId: Map<string, Person>;
  kids: Map<string, Person[]> | null;
  /** Per person, in people order: the relationship list, its length and its last entry when `kids` was built. */
  ties: (readonly [Relationship[], number, Relationship | undefined])[];
}

const castIndexes = new WeakMap<Person[], CastIndex>();

function castIndex(s: WatchState): CastIndex {
  const people = s.community.people;
  let ix = castIndexes.get(people);
  if (!ix || ix.length !== people.length) {
    const byId = new Map<string, Person>();
    for (const p of people) if (!byId.has(p.id)) byId.set(p.id, p);
    ix = { length: people.length, byId, kids: null, ties: [] };
    castIndexes.set(people, ix);
  }
  return ix;
}

const isCareTie = (r: Relationship): boolean => r.roles.includes('parent') || r.roles.includes('guardian');

/**
 * Everyone (here or not) whose own tie to `parentId` names them a child or ward, in people order. Candidates only:
 * callers re-test the tie and `isHere` (see `childrenOf` in life.ts).
 */
export function careCandidates(s: WatchState, parentId: WatcherId): readonly Person[] {
  const people = s.community.people;
  const ix = castIndex(s);
  let fresh = ix.kids !== null;
  for (let i = 0; fresh && i < people.length; i++) {
    const rels = people[i]?.social.relationships;
    const t = ix.ties[i];
    if (!rels || !t || t[0] !== rels || t[1] !== rels.length || t[2] !== rels[rels.length - 1]) fresh = false;
  }
  if (!fresh || !ix.kids) {
    const kids = new Map<string, Person[]>();
    ix.ties = [];
    for (const q of people) {
      const rels = q.social.relationships;
      ix.ties.push([rels, rels.length, rels[rels.length - 1]]);
      for (const r of rels) {
        if (!isCareTie(r)) continue;
        const list = kids.get(r.otherId);
        if (!list) kids.set(r.otherId, [q]);
        else if (list[list.length - 1] !== q) list.push(q);
      }
    }
    ix.kids = kids;
  }
  return ix.kids.get(parentId) ?? [];
}

export function personOf(s: WatchState, id: WatcherId): Person | undefined {
  return castIndex(s).byId.get(id);
}

export function present(s: WatchState): Person[] {
  return s.community.people.filter((p) => isHere(s, p));
}

/**
 * Villagers who come on this night of this year join: founders as watchers, their kin at home. Each meets the others
 * (insiders or the newcomer) and they come to know each other as far as their ties go; the Keeper knows them by
 * `known`. Returns the ids who came.
 */
export function arrive(s: WatchState): WatcherId[] {
  const now = s.minute;
  const came: WatcherId[] = [];
  for (const id of s.order) {
    const v = s.cast[id];
    if (v?.status !== 'coming' || v.comes.year !== s.year || v.comes.night !== s.winterNight) continue;
    if (personOf(s, id)) continue;
    const def = WATCHERS.find((d) => d.id === id);
    const ki = FOUNDER_KIN.findIndex((k) => k.id === id);
    const kin = FOUNDER_KIN[ki];
    let p: Person;
    if (def) p = castPerson(s.seed, def, now);
    else if (kin) p = kinPerson(s.seed, kin, ki, now);
    else continue;
    addPerson(s.community, p);
    v.status = 'here';
    s.place[id] = 'village';
    s.posts[id] = null;
    s.press[id] = 'ask';
    s.postedAt[id] = now;
    came.push(id);
  }
  if (came.length === 0) return came;
  const people = s.community.people;
  for (const p of people) {
    const v = s.cast[p.id];
    if (!v || !isHere(s, p)) continue;
    for (const q of people) {
      if (q.id === p.id || !isHere(s, q)) continue;
      const qv = s.cast[q.id];
      if (!qv) continue;
      if (!came.includes(p.id) && !came.includes(q.id)) continue;
      meet(p, q.id, [qv.newcomer ? 'incomers' : 'village']);
      // A parent or guardian who comes after the children knows them as their own.
      const kin = FOUNDER_KIN.find((k) => k.id === q.id);
      if (kin && (kin.parents?.includes(p.id) || kin.guardian === p.id)) {
        const r = p.social.relationships.find((x) => x.otherId === q.id);
        const role = kin.guardian === p.id ? 'ward' : 'child';
        if (r && !r.roles.includes(role)) {
          r.roles = [...r.roles, role];
          r.affection = Math.max(r.affection, 0.8);
          r.trust = Math.max(r.trust, 0.7);
          r.familiarity = Math.max(r.familiarity, 0.9);
        }
      }
      const tie = p.social.relationships.find((r) => r.otherId === q.id);
      const familiarity = v.newcomer || qv.newcomer ? 0.15 : Math.max(0.35, tie?.familiarity ?? 0.35);
      acquaintWith(p, q, familiarity, now);
    }
  }
  for (const [a, b] of FOUNDER_MARRIAGES) {
    const pa = personOf(s, a);
    const pb = personOf(s, b);
    if (!pa || !pb || (!came.includes(a) && !came.includes(b)) || spousesOf(pa).includes(b)) continue;
    marry(pa, pb, now, GENERIC_CUSTOM);
  }
  for (const id of came) {
    const p = personOf(s, id);
    const v = s.cast[id];
    if (!p || !v || !isWatcher(s, p)) continue;
    if (v.known > 0) acquaintWith(s.keeper, p, v.known, now);
    else s.keeper.social.impressions ??= [];
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
  if (kind === 'go-home' || kind === 'sleep' || kind === 'home') return 'home';
  if (kind === 'day') return 'village';
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// The World adapter
// ---------------------------------------------------------------------------------------------

export class WatchWorld implements World {
  readonly catalog = [...DEFAULT_NORMS, ...WATCH_NORMS];
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
    const brk = inBreak(p);
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
        v.prays &&
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
      s.cast[p.id]?.prays &&
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
    const q = this.s.percepts[p.id] ?? [];
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
