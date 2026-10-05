/**
 * The village over years (G3-3): routines by season and age, births, courtship and proposals, deaths, newcomers,
 * coming of age, households leaving, and the permanent losses short of death. Everything is drawn from the state's
 * seeded RNG; HF decides what is a person's to decide (a proposal is an Assent choice with the family's and the
 * Keeper's voices; grief, widowhood and upbringing come from the framework's long-run driver).
 *
 * Scope. Routine days (`routineFor`) give each living villager a day's activities by season, age and role, with
 * their household and two closest ties as companions: field and craft work, sling practice for watchers and older
 * children, supper with the household, and a quiet prayer for those who pray. Winter routine days after the played
 * nights include a stint on the wall. Births follow `conceptionChance` for married couples (the birth folds
 * conception and pregnancy into one day; engineering simplification). Courtship meets on seeded days between
 * eligible single adults who fancy each other most (HF `attraction`, `court`); a ready courtship becomes a proposal
 * (HF `decide` over `proposeOffer`), answered by HF over `proposalOffers` with family voices and, when the Keeper
 * speaks, his voice. Households leave at a thaw after a hard winter when mood and trust in the Keeper are low and
 * ties are few. Not covered: divorce, illness by name (HF chronic conditions run underneath), inheritance of houses,
 * trade.
 */
import {
  type Affordance,
  acquaintWith,
  addPerson,
  attraction,
  birth,
  canMarry,
  conceptionChance,
  court,
  courtshipStage,
  createPerson,
  decide,
  familyVoices,
  GENERIC_CUSTOM,
  heldNorms,
  instructionFrom,
  learnOutcome,
  type MarriageCustom,
  MINUTES_PER_YEAR,
  marry,
  meet,
  type Person,
  proposalOffers,
  proposeOffer,
  type Routine,
  type RoutineActivity,
  retell,
  skillLevel,
  spousesOf,
} from '@adam0white/human-framework';
import {
  DAY,
  type PostId,
  postSection,
  RETIRE_AGE,
  SECTION_IDS,
  type SectionId,
  START_GRAIN,
  WATCH_AGE,
  type WatcherId,
} from './config.ts';
import {
  careCandidates,
  equip,
  isHere,
  KEEPER_ID,
  nameOf,
  personOf,
  personSeed,
  them,
  villager,
} from './people.ts';
import {
  type ChronicleLine,
  nextRandom,
  pick,
  type Season,
  type Villager,
  type WatchState,
} from './state.ts';

/** The village's marriage custom (host data): the generic custom, adults of 18 and over. */
export const WATCH_CUSTOM: MarriageCustom = { ...GENERIC_CUSTOM, id: 'watch-village' };
/** A child of this age starts practising the sling with the watchers. */
const SLING_CHILD_AGE = 9;
/** Couples stop having children past this age of the mother, and at this many living children. */
const MOTHER_MAX_AGE = 42;
const MAX_CHILDREN = 4;
/** Chance per day that two people who fancy each other meet to court. */
const COURT_CHANCE = 0.25;
/** Chance per day that a ready courtship becomes a proposal. */
const PROPOSE_CHANCE = 0.25;

export { RETIRE_AGE };

/** Not asking yet: the alternative to a proposal. */
const WAIT: Affordance = {
  id: 'wait',
  action: 'wait',
  label: 'Wait',
  duration: 10,
  effort: 0,
  advertises: {},
};
/** The Keeper's word on a proposal, as a family voice's approval. */
export const KEEPER_WORD = 0.7;

export const NAMES: Record<'female' | 'male', readonly string[]> = {
  female: [
    'Nell',
    'Iva',
    'Sena',
    'Maren',
    'Dilan',
    'Petra',
    'Yara',
    'Elif',
    'Rosa',
    'Tova',
    'Asel',
    'Brin',
    'Hale',
    'Inge',
    'Leyla',
    'Mira',
    'Noor',
    'Oda',
    'Saba',
    'Wren',
    'Zehra',
    'Agnes',
    'Cansu',
    'Edda',
    'Fern',
    'Gul',
    'Hana',
    'Jale',
    'Kira',
    'Lise',
  ],
  male: [
    'Oren',
    'Tobi',
    'Emre',
    'Bram',
    'Davit',
    'Hamid',
    'Ivo',
    'Luka',
    'Nico',
    'Rafe',
    'Sami',
    'Teo',
    'Umut',
    'Vas',
    'Aras',
    'Bo',
    'Cem',
    'Dario',
    'Efe',
    'Finn',
    'Goran',
    'Hugo',
    'Ilya',
    'Jonas',
    'Kerem',
    'Lev',
    'Matti',
    'Nazim',
    'Osman',
    'Piet',
  ],
};

/** Sets (or adds) a voice a person heeds, at `trust`, as seeded host data. */
export function setVoice(p: Person, voiceId: string, trust: number): void {
  const t = Math.max(0, Math.min(1, trust));
  const v = p.will.voices.find((x) => x.voiceId === voiceId);
  if (v) v.trust = t;
  else
    p.will.voices = [
      ...p.will.voices,
      { voiceId, trust: t, pressure: 0, accepted: 0, refused: 0, history: [], seeded: true },
    ];
}

export function ageOf(p: Person, now: number): number {
  return (now - p.life.bornAt) / MINUTES_PER_YEAR;
}

export function dayOfYear(s: WatchState, minute = s.minute): number {
  return Math.floor(minute / DAY) - (s.year - 1) * 365;
}

export function seasonOfDay(d: number): Season {
  if (d < 90) return 'winter';
  if (d < 180) return 'spring';
  if (d < 270) return 'summer';
  return 'autumn';
}

export function seasonNow(s: WatchState): Season {
  return seasonOfDay(dayOfYear(s));
}

/** Adds a line to the permanent chronicle. */
export function chronicle(s: WatchState, kind: ChronicleLine['kind'], text: string, who?: WatcherId): void {
  const line: ChronicleLine = { year: s.year, season: seasonNow(s), minute: s.minute, kind, text };
  if (who !== undefined) line.who = who;
  s.chronicle.push(line);
}

const lookupIn = (s: WatchState) => (id: string) => personOf(s, id);

/** Living villagers who are here. */
export function living(s: WatchState): Person[] {
  return s.community.people.filter((p) => isHere(s, p));
}

/** Children (by the children's own ties to the parent) who are here, in people order. */
export function childrenOf(s: WatchState, p: Person): Person[] {
  // The index narrows who to test (P7); the test itself is the full one, so a lost tie is never counted.
  return careCandidates(s, p.id).filter(
    (q) =>
      isHere(s, q) &&
      q.social.relationships.some(
        (r) => r.otherId === p.id && (r.roles.includes('parent') || r.roles.includes('guardian')),
      ),
  );
}

/** A person's household: themself, a living spouse, and minor children or wards (under 18). */
export function householdOf(s: WatchState, p: Person): Person[] {
  const out = new Map<string, Person>([[p.id, p]]);
  for (const id of spousesOf(p)) {
    const q = personOf(s, id);
    if (q && isHere(s, q)) out.set(q.id, q);
  }
  for (const head of [...out.values()])
    for (const c of childrenOf(s, head)) if (ageOf(c, s.minute) < 18) out.set(c.id, c);
  return [...out.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
}

/** The two living, here ties a person is closest to (not their household). */
function friends(s: WatchState, p: Person, house: Set<string>): string[] {
  return p.social.relationships
    .filter((r) => r.affection > 0.1 && !house.has(r.otherId))
    .filter((r) => {
      const q = personOf(s, r.otherId);
      return q !== undefined && isHere(s, q);
    })
    .sort((a, b) => b.affection - a.affection || (a.otherId < b.otherId ? -1 : 1))
    .slice(0, 2)
    .map((r) => r.otherId);
}

const practise = (id: string, p: Person, lift: number) => ({
  id,
  difficulty: Math.min(0.95, skillLevel(p, id) + lift),
});

/**
 * A villager's routine for one day (see the file comment). `day` is the absolute day number; winter days after the
 * played nights put watchers on the wall for a stint.
 */
export function routineFor(s: WatchState) {
  return (p: Person, day: number): Routine => {
    const now = day * DAY;
    const age = ageOf(p, now);
    const season = seasonOfDay(day - (s.year - 1) * 365);
    const house = householdOf(s, p);
    const homeIds = house.filter((q) => q.id !== p.id).map((q) => q.id);
    const pals = friends(s, p, new Set(house.map((q) => q.id)));
    const v = s.cast[p.id];
    const acts: RoutineActivity[] = [];
    if (age < 5) {
      acts.push({ action: 'play', minutes: 120, with: homeIds.slice(0, 2), valence: 0.2 });
    } else if (age < 15) {
      acts.push({ action: 'play', minutes: 180, with: pals, valence: 0.2, tags: ['play'] });
      acts.push({ action: 'chores', minutes: 120, with: homeIds.slice(0, 1), tags: ['work'], keeps: true });
      acts.push({ action: 'gather stones', minutes: 60, chance: 0.3, valence: 0.05 });
      if (age >= SLING_CHILD_AGE)
        acts.push({
          action: 'sling practice',
          minutes: 60,
          chance: season === 'winter' ? 0.2 : 0.4,
          skill: practise('sling', p, 0.1),
          practice: { quality: 0.7 },
          with: pals.slice(0, 1),
        });
    } else {
      const elder = age >= 60;
      const watcher = age < RETIRE_AGE && !v?.limp;
      if (season === 'winter') {
        if (watcher)
          acts.push({
            action: 'stand the wall',
            minutes: 300,
            chance: 0.6,
            skill: practise('sling', p, 0.05),
            practice: { quality: 0.6 },
            tags: ['work'],
            valence: -0.05,
            keeps: true,
          });
        acts.push({
          action: 'mend and carry',
          minutes: 180,
          tags: ['work'],
          skill: practise('craft', p, 0.08),
        });
      } else {
        acts.push({
          action: season === 'summer' ? 'the fields' : season === 'autumn' ? 'the harvest' : 'sowing',
          minutes: elder ? 180 : 420,
          with: pals.slice(0, 1),
          tags: ['work'],
          valence: 0.05,
          keeps: true,
        });
        const lesson = s.pairings.find((x) => x.who === p.id && now < x.until);
        const teacher = lesson ? personOf(s, lesson.with) : undefined;
        if (watcher && teacher?.body.alive)
          // A lesson the Keeper allowed: more often, taught, and side by side with the teacher.
          acts.push({
            action: 'a sling lesson',
            minutes: 60,
            chance: 0.6,
            skill: practise('sling', p, 0.15),
            practice: { quality: 0.9, instruction: instructionFrom(teacher, 'sling') },
            with: [teacher.id],
          });
        else if (watcher)
          acts.push({
            action: 'sling practice',
            minutes: 60,
            chance: 0.25,
            skill: practise('sling', p, 0.1),
            practice: { quality: 0.8 },
            with: s.gateKeeper && s.gateKeeper !== p.id ? [s.gateKeeper] : [],
          });
        acts.push({ action: 'craft', minutes: 90, chance: 0.3, skill: practise('craft', p, 0.1) });
      }
      acts.push({ action: 'supper', minutes: 90, with: homeIds, valence: 0.1 });
      if (pals[0])
        acts.push({
          action: 'an evening at the well',
          minutes: 60,
          chance: 0.3,
          with: [pals[0]],
          valence: 0.15,
        });
    }
    if (v?.prays) acts.push({ action: 'pray', minutes: 30 });
    return { activities: acts };
  };
}

// ---------------------------------------------------------------------------------------------
// Births, newcomers, coming of age
// ---------------------------------------------------------------------------------------------

function freshName(s: WatchState, sex: 'female' | 'male'): string {
  const used = new Set(
    Object.values(s.cast)
      .filter((v) => v.status === 'here')
      .map((v) => v.name),
  );
  const pool = NAMES[sex].filter((n) => !used.has(n));
  return pick(s, pool.length > 0 ? pool : NAMES[sex]);
}

/** A free post on `section`'s wall, or the first open post. */
export function freePostNear(s: WatchState, section: SectionId): PostId {
  const taken = new Set(Object.values(s.posts));
  const here = s.openPosts.filter((p) => postSection(p) === section && !taken.has(p));
  return here[0] ?? s.openPosts.find((p) => !taken.has(p)) ?? s.openPosts[0] ?? 'gate-1';
}

/** A child born to `mother` and `father` at `at`. */
export function bear(s: WatchState, mother: Person, father: Person, at: number): Person {
  const n = s.nextBorn++;
  const id = `b${n}`;
  const sex = nextRandom(s) < 0.5 ? 'female' : 'male';
  const name = freshName(s, sex);
  const child = birth(s.community, mother, father, {
    id,
    name,
    seed: personSeed(s.seed, 1000 + n),
    bornAt: at,
    now: at,
    sex,
    aptitudes: ['sling', 'sight', 'craft'],
    valueTransmission: 0.4,
    normExposure: 0.5,
  });
  // A newborn's trust in the Keeper starts from the household's (the stories they will hear; upbringing moves it).
  const trust =
    ((mother.will.voices.find((x) => x.voiceId === KEEPER_ID)?.trust ?? 0.5) +
      (father.will.voices.find((x) => x.voiceId === KEEPER_ID)?.trust ?? 0.5)) /
    2;
  setVoice(child, KEEPER_ID, trust);
  equip(child);
  const mv = villager(s, mother.id);
  const fv = villager(s, father.id);
  const v: Villager = {
    id,
    name,
    sex,
    home: mv.home,
    usual: mv.usual,
    note: `Born under the wall, ${their2(mv)} child`,
    look: (s.order.length * 5 + n) % 12,
    prays: mv.prays || fv.prays,
    newcomer: false,
    known: 0.4,
    comes: { year: s.year, night: 0 },
    status: 'here',
    gen: Math.max(mv.gen, fv.gen) + 1,
    bornHere: true,
    parents: [mother.id, father.id],
  };
  s.cast[id] = v;
  s.order.push(id);
  chronicle(
    s,
    'birth',
    `${mv.name} and ${fv.name} had a ${sex === 'female' ? 'daughter' : 'son'}, ${name}.`,
    id,
  );
  return child;
}

const their2 = (v: Villager) => `${v.name}’s`;

/** A newcomer of `sex`, aged `age`, arriving at `at` (refugees, a fair-day family). */
export function newcomer(
  s: WatchState,
  sex: 'female' | 'male',
  age: number,
  at: number,
  opts: { home?: SectionId; note?: string; ties?: { otherId: string; roles: string[] }[] } = {},
): Person {
  const n = s.nextBorn++;
  const id = `n${n}`;
  const name = freshName(s, sex);
  const r = () => nextRandom(s);
  const p = createPerson({
    id,
    name,
    seed: personSeed(s.seed, 1000 + n),
    now: at,
    bornAt: at - age * MINUTES_PER_YEAR - Math.floor(r() * 300) * DAY,
    sex,
    traits: {
      honesty: 0.25 + 0.5 * r(),
      emotionality: 0.25 + 0.5 * r(),
      extraversion: 0.25 + 0.5 * r(),
      agreeableness: 0.25 + 0.5 * r(),
      conscientiousness: 0.25 + 0.5 * r(),
      openness: 0.25 + 0.5 * r(),
    },
    norms: heldNorms(
      {
        practice: 0.4,
        extraNorms: [{ normId: 'keep-watch', standing: 'obligatory', conviction: 0.3 + 0.3 * r() }],
      },
      undefined,
    ),
    skills: { sling: 0.15 + 0.35 * r(), sight: 0.3 + 0.4 * r(), craft: 0.2 + 0.4 * r() },
    relationships: (opts.ties ?? []).map((t) => ({
      otherId: t.otherId,
      roles: t.roles,
      affection: 0.75,
      trust: 0.75,
      familiarity: 0.9,
    })),
    voices: [{ voiceId: KEEPER_ID, trust: 0.35 + 0.2 * r() }],
  });
  equip(p, { newcomer: true });
  addPerson(s.community, p);
  const home = opts.home ?? pick(s, SECTION_IDS);
  s.cast[id] = {
    id,
    name,
    sex,
    home,
    usual: freePostNear(s, home),
    note: opts.note ?? 'Came through the gate',
    look: (n * 7) % 12,
    prays: r() < 0.4,
    newcomer: true,
    known: 0,
    comes: { year: s.year, night: 0 },
    status: 'here',
    gen: 1,
    bornHere: false,
  };
  s.order.push(id);
  s.place[id] = 'village';
  s.posts[id] = null;
  s.press[id] = 'ask';
  s.postedAt[id] = at;
  // They meet the village; the village meets them, warily.
  for (const q of living(s)) {
    if (q.id === id) continue;
    meet(p, q.id, ['village']);
    meet(q, id, ['incomers']);
    acquaintWith(p, q, 0.1, at);
    acquaintWith(q, p, 0.1, at);
  }
  return p;
}

/** Marks a villager gone (dead or left) and clears their place on the wall. */
export function gone(s: WatchState, id: WatcherId, status: 'dead' | 'left'): void {
  const v = s.cast[id];
  if (!v) return;
  v.status = status;
  v.until = s.minute;
  delete s.posts[id];
  delete s.press[id];
  delete s.postedAt[id];
  delete s.place[id];
  delete s.letGo[id];
  delete s.commands[id];
  delete s.percepts[id];
  if (s.gateKeeper === id) s.gateKeeper = null;
  if (s.heir === id) s.heir = null;
}

/** Removes the dead and the gone from the community (their chronicle record stays). */
export function prune(s: WatchState): void {
  const keep = s.community.people.filter((p) => p.body.alive && s.cast[p.id]?.status === 'here');
  if (keep.length === s.community.people.length) return;
  const drop = new Set(s.community.people.filter((p) => !keep.includes(p)).map((p) => p.id));
  s.community.people = keep;
  for (const id of drop) {
    delete s.community.idleUntil[id];
    delete s.community.perceivedUntil[id];
    if (s.community.dayDone) delete s.community.dayDone[id];
    delete s.community.interrupts[id];
  }
}

function deathLine(s: WatchState, p: Person): string {
  const v = villager(s, p.id);
  const age = Math.floor(ageOf(p, s.minute));
  const season = seasonNow(s);
  const when = season === 'winter' ? 'in the dark of the winter' : `in the ${season}`;
  if (age < 15)
    return `${v.name} died ${when}, a child of ${age}. The village buried ${them(s, p.id)} by the mill.`;
  if (age >= 60)
    return `${v.name} died ${when}, at ${age}. ${v.home === 'gate' ? 'The Gate' : 'The house'} is quiet.`;
  return `${v.name} died ${when}, at ${age}, of a sickness that would not lift.`;
}

/** Reads a liveCommunity result's deaths into the chronicle. */
export function readDeaths(s: WatchState, events: { kind: string; personId?: string }[]): void {
  for (const e of events) {
    if (e.kind !== 'died' || !e.personId) continue;
    const p = personOf(s, e.personId);
    const v = s.cast[e.personId];
    if (!p || !v || v.status !== 'here') continue;
    chronicle(s, 'death', deathLine(s, p), p.id);
    gone(s, p.id, 'dead');
  }
}

/** Coming of age: a villager who turned 15 today. */
function comingOfAge(s: WatchState, at: number): void {
  for (const p of living(s)) {
    const before = ageOf(p, at - DAY);
    const now = ageOf(p, at);
    if (before < 15 && now >= 15) {
      const v = villager(s, p.id);
      v.usual = freePostNear(s, v.home);
      if (!s.keeper.social.impressions?.some((x) => x.targetId === p.id)) acquaintWith(s.keeper, p, 0.35, at);
      chronicle(s, 'age', `${v.name} turned fifteen: old enough for the wall this winter.`, p.id);
    }
    if (before < RETIRE_AGE && now >= RETIRE_AGE) {
      chronicle(s, 'age', `${nameOf(s, p.id)} is too old for the stair now and keeps to the village.`, p.id);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Courtship, proposals, marriage
// ---------------------------------------------------------------------------------------------

function single(p: Person, at: number): boolean {
  const a = ageOf(p, at);
  return a >= 18 && a <= 50 && spousesOf(p).length === 0;
}

/** The single adult each single adult fancies most, if anyone (HF attraction, both ways, custom allowing). */
function fancy(s: WatchState, p: Person, at: number): Person | null {
  let best: Person | null = null;
  let score = 0.18;
  const lookup = lookupIn(s);
  for (const q of living(s)) {
    if (q.id === p.id || !single(q, at)) continue;
    if (!canMarry(p, q, WATCH_CUSTOM, { at, lookup }).ok) continue;
    const a = Math.min(attraction(p, q), attraction(q, p));
    if (a > score) {
      score = a;
      best = q;
    }
  }
  return best;
}

/**
 * Courtship for the day: pairs who fancy each other meet on seeded days; a ready courtship may become a proposal.
 * Returns a proposal the Keeper can speak to (the caller opens a card), or resolves it at once when a card is open.
 */
function courting(s: WatchState, at: number): void {
  const singles = living(s)
    .filter((p) => single(p, at))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const done = new Set<string>();
  for (const p of singles) {
    if (done.has(p.id)) continue;
    const q = fancy(s, p, at);
    if (!q || done.has(q.id)) continue;
    done.add(p.id);
    done.add(q.id);
    if (nextRandom(s) >= COURT_CHANCE) continue;
    const before = courtshipStage(p, q.id, at);
    court(p, q, at, { quality: 0.6 + 0.4 * nextRandom(s) });
    if (before === 'none')
      chronicle(
        s,
        'courting',
        `${nameOf(s, p.id)} and ${nameOf(s, q.id)} are seen walking out together.`,
        p.id,
      );
    if (courtshipStage(p, q.id, at) !== 'ready' || courtshipStage(q, p.id, at) !== 'ready') continue;
    if (nextRandom(s) >= PROPOSE_CHANCE) continue;
    // Who asks: HF decides for each whether to propose now; the first in id order who does, asks.
    const lookup = lookupIn(s);
    const asker = [p, q].find((x) => {
      const other = x === p ? q : p;
      const d = decide(x, [proposeOffer(x, other, { lookup }), WAIT]);
      return d.chosenAction === 'propose';
    });
    if (!asker) continue;
    const answerer = asker === p ? q : p;
    if (s.card) {
      settleProposal(s, asker, answerer, null, at);
    } else {
      s.card = {
        id: s.nextCardId++,
        kind: 'proposal',
        who: asker.id,
        other: answerer.id,
        text: `${nameOf(s, asker.id)} has asked for ${nameOf(s, answerer.id)}’s hand.`,
        read: proposalRead(s, answerer, asker),
        options: [
          { id: 'bless', label: 'Give your blessing' },
          { id: 'against', label: 'Speak against it' },
        ],
        until: at + CARD_DAYS * DAY,
        choice: null,
      };
    }
  }
}

/** What the Keeper can tell of how the answer will go, in words (his impression of the answerer). */
function proposalRead(s: WatchState, answerer: Person, asker: Person): string {
  const tie = s.keeper.social.impressions?.find((x) => x.targetId === answerer.id);
  if (!tie)
    return 'You can’t tell what she will say.'.replace('she', answerer.life.sex === 'female' ? 'she' : 'he');
  const warm = courtshipStage(answerer, asker.id) === 'ready';
  const pron = answerer.life.sex === 'female' ? 'she' : 'he';
  return warm
    ? `They have been walking out a long while; ${pron} looks glad of it.`
    : `You are not sure ${pron} is ready.`;
}

/** The answer to a proposal, by HF with the family's voices and the Keeper's word (`word`: +1, −1 or null). */
export function settleProposal(
  s: WatchState,
  asker: Person,
  answerer: Person,
  word: number | null,
  at: number,
): void {
  const lookup = lookupIn(s);
  const offers = proposalOffers(answerer, asker, { lookup });
  const approvals: { voiceId: string; approval: number }[] = [];
  // Parents and guardians weigh in by their own regard for the one asking.
  for (const r of answerer.social.relationships) {
    if (!r.roles.includes('parent') && !r.roles.includes('guardian')) continue;
    const parent = personOf(s, r.otherId);
    if (!parent || !isHere(s, parent)) continue;
    const regard = parent.social.relationships.find((x) => x.otherId === asker.id)?.affection ?? 0;
    approvals.push({ voiceId: parent.id, approval: Math.max(-1, Math.min(1, regard * 1.5)) });
    if (!answerer.will.voices.some((x) => x.voiceId === parent.id))
      setVoice(answerer, parent.id, Math.max(0.2, r.trust));
  }
  if (word !== null) approvals.push({ voiceId: KEEPER_ID, approval: word * KEEPER_WORD });
  const d = decide(answerer, offers, { suggestions: familyVoices(offers, approvals) });
  const a = nameOf(s, asker.id);
  const b = nameOf(s, answerer.id);
  if (d.chosenAction === 'accept-proposal' && marry(asker, answerer, at, WATCH_CUSTOM, { lookup }).ok) {
    // The couple make a home behind the asker's stretch, or the answerer's if the asker is a newcomer.
    const av = villager(s, asker.id);
    const bv = villager(s, answerer.id);
    bv.home = av.home;
    chronicle(
      s,
      'marriage',
      `${a} and ${b} were married${word === 1 ? ', with your blessing' : ''}.`,
      asker.id,
    );
    if (av.newcomer !== bv.newcomer)
      fillLeaf(s, 'married-in', `${a} and ${b} married: an outsider married in.`);
  } else {
    chronicle(
      s,
      'courting',
      `${b} would not have ${a}${word === -1 ? ', and you had spoken against it' : ''}.`,
      answerer.id,
    );
  }
}

// ---------------------------------------------------------------------------------------------
// Births by day
// ---------------------------------------------------------------------------------------------

/** Days from the news of a child to the birth (G3-4 review: births arrived with no lead-up). */
export const CARRYING_DAYS = 200;
/** Days a season card stays open (about 40 s at the tactical pace) before they decide alone. */
export const CARD_DAYS = 6;

function births(s: WatchState, at: number): void {
  const lookup = lookupIn(s);
  // Children due today are born; a mother or father gone or dead by then loses the place in the queue.
  for (const e of s.expecting.filter((x) => x.due <= at)) {
    const mother = personOf(s, e.mother);
    const father = personOf(s, e.father);
    if (!mother || !father || !isHere(s, mother) || !mother.body.alive) continue;
    const child = bear(s, mother, father, at);
    birthCard(s, mother, child, at);
    const mv = villager(s, mother.id);
    if (mv.bornHere)
      fillLeaf(s, 'grandchild', `${mv.name}, born here, had a child of her own: ${child.name}.`);
  }
  s.expecting = s.expecting.filter((x) => x.due > at);
  for (const mother of living(s)) {
    if (mother.life.sex !== 'female') continue;
    if (s.expecting.some((x) => x.mother === mother.id)) continue;
    const age = ageOf(mother, at);
    if (age < 18 || age > MOTHER_MAX_AGE) continue;
    const father = spousesOf(mother)
      .map(lookup)
      .find((q) => q !== undefined && isHere(s, q));
    if (!father) continue;
    if (childrenOf(s, mother).filter((c) => ageOf(c, at) < 18).length >= MAX_CHILDREN) continue;
    // No two births within two years.
    const youngest = Math.min(...childrenOf(s, mother).map((c) => ageOf(c, at)), 99);
    if (youngest < 2) continue;
    // Not in the first nine months of a marriage (the birth folds conception and pregnancy into one day).
    const wed = mother.bonds?.marriages.find((m) => m.spouseId === father.id && m.endedAt === undefined);
    if (wed && at - wed.since < 270 * DAY) continue;
    // A lean granary (less than a sack a head) halves the chance: families wait for a better year.
    const lean = s.grain < living(s).length ? 0.5 : 1;
    if (nextRandom(s) >= conceptionChance(mother, father, 1) * lean * crowding(s)) continue;
    // The news comes first; the child some months later.
    s.expecting.push({ mother: mother.id, father: father.id, due: at + CARRYING_DAYS * DAY });
    chronicle(
      s,
      'birth',
      `${nameOf(s, mother.id)} and ${nameOf(s, father.id)} are expecting a child.`,
      mother.id,
    );
  }
}

/** Seasons in which a card can open (the Keeper is reading days, not nights). */
const cardSeason = (s: WatchState): boolean =>
  s.phase === 'spring' || s.phase === 'summer' || s.phase === 'autumn';

/** A birth as a moment (G3-4): the Keeper may call on the family, or send a sack from the granary. */
function birthCard(s: WatchState, mother: Person, child: Person, at: number, winter = false): void {
  if (s.card || !cardSeason(s)) {
    s.newborns.push({ mother: mother.id, child: child.id, winter: !cardSeason(s) || winter });
    return;
  }
  const father = spousesOf(mother).find((id) => s.cast[id]?.status === 'here');
  const parents = father ? `${nameOf(s, mother.id)} and ${nameOf(s, father)}` : nameOf(s, mother.id);
  s.card = {
    id: s.nextCardId++,
    kind: 'birth',
    who: mother.id,
    other: child.id,
    text: winter
      ? `${parents} had a ${child.life.sex === 'female' ? 'daughter' : 'son'} in the winter: ${child.name}. The family is out in the spring sun with ${them(s, child.id)}.`
      : `${parents} have a ${child.life.sex === 'female' ? 'daughter' : 'son'}: ${child.name}.`,
    read:
      s.grain < living(s).length
        ? 'The granary is thin this year; a sack would be felt.'
        : 'A sack would not be missed this year.',
    options: [
      { id: 'visit', label: 'Call on them' },
      { id: 'grain', label: 'Send a sack from the granary' },
    ],
    until: at + CARD_DAYS * DAY,
    choice: null,
  };
}

/** Day of the year a young watcher may ask to learn the sling (mid-summer). */
export const LESSON_DAY = 195;

/**
 * Mid-summer, a young watcher with a poor arm asks to learn from the surest sling (G3-4 person card). Allowed, they
 * practise together, taught, until the winter: a better arm and a closer tie. Refused, the young one is let down.
 */
function lessonCard(s: WatchState, at: number): void {
  if (s.card || !cardSeason(s)) return;
  const watchers = living(s).filter((p) => isHere(s, p) && ageOf(p, at) >= 15 && ageOf(p, at) < RETIRE_AGE);
  const sling = (p: Person) => skillLevel(p, 'sling');
  const young = watchers
    .filter((p) => ageOf(p, at) < 24 && !s.pairings.some((x) => x.who === p.id))
    .sort((a, b) => sling(a) - sling(b) || (a.id < b.id ? -1 : 1))[0];
  if (!young) return;
  const teacher = watchers
    .filter((p) => p.id !== young.id && ageOf(p, at) >= 25)
    .sort((a, b) => sling(b) - sling(a) || (a.id < b.id ? -1 : 1))[0];
  if (!teacher || sling(teacher) <= sling(young) + 0.05) return;
  s.card = {
    id: s.nextCardId++,
    kind: 'practise',
    who: young.id,
    other: teacher.id,
    text: `${nameOf(s, young.id)} asks if ${nameOf(s, teacher.id)} could teach ${them(s, young.id)} the sling this summer, in the evenings after the fields.`,
    read: `${nameOf(s, teacher.id)} has the surest arm on the wall. The fields would miss them both an hour a day.`,
    options: [
      { id: 'bless', label: 'Let them practise together' },
      { id: 'refuse', label: 'The fields come first' },
    ],
    until: at + CARD_DAYS * DAY,
    choice: null,
  };
}

/** The Keeper's word on a birth or lesson card (`null`: it closed unanswered). */
export function settleLifeCard(
  s: WatchState,
  card: { kind: string; who: string; other: string },
  choice: string | null,
): void {
  const lift = (id: string, d: number) => {
    const p = personOf(s, id);
    if (!p) return;
    p.will.voices = p.will.voices.map((v) =>
      v.voiceId === KEEPER_ID ? { ...v, trust: Math.max(0, Math.min(1, v.trust + d)) } : v,
    );
  };
  const mother = personOf(s, card.who);
  const family = mother
    ? [mother.id, ...spousesOf(mother).filter((id) => s.cast[id]?.status === 'here')]
    : [];
  if (card.kind === 'birth') {
    if (choice === 'visit') for (const id of family) lift(id, 0.03);
    else if (choice === 'grain' && s.grain >= 1) {
      s.grain -= 1;
      for (const id of family) lift(id, 0.06);
      chronicle(s, 'birth', `You sent a sack from the granary for ${nameOf(s, card.other)}.`, card.other);
    }
  } else if (card.kind === 'practise') {
    if (choice === 'bless') {
      const until = s.year * 365 * DAY;
      const pupil = personOf(s, card.who);
      s.pairings.push({
        who: card.who,
        with: card.other,
        until,
        ...(pupil ? { from: skillLevel(pupil, 'sling') } : {}),
      });
      lift(card.who, 0.03);
      chronicle(
        s,
        'courting',
        `${nameOf(s, card.who)} took sling lessons from ${nameOf(s, card.other)} in the summer evenings.`,
        card.who,
      );
    } else if (choice === 'refuse') lift(card.who, -0.03);
  }
}

// ---------------------------------------------------------------------------------------------
// The day hook, leaving, losses
// ---------------------------------------------------------------------------------------------

/** At each dawn of a lived day: coming of age, courtship, births, winter stints. */
export function dayHook(s: WatchState) {
  return (_c: unknown, day: number, at: number): void => {
    s.minute = at;
    comingOfAge(s, at);
    courting(s, at);
    births(s, at);
    const d = day - (s.year - 1) * 365;
    if (seasonOfDay(d) === 'winter') calmStints(s, at);
    if (d === LESSON_DAY) lessonCard(s, at);
    // A birth not yet brought to the Keeper comes as a card on the next open day.
    if (!s.card && cardSeason(s)) {
      const next = s.newborns.shift();
      const mother = next ? personOf(s, next.mother) : undefined;
      const child = next ? personOf(s, next.child) : undefined;
      if (next && mother?.body.alive && child?.body.alive) birthCard(s, mother, child, at, next.winter);
    }
  };
}

/**
 * A quiet stint on the wall eases a fear of that stretch a little (HF `learnOutcome` with a mildly good outcome):
 * fears learned on bad nights fade over quiet winters unless another bad night hardens them.
 */
function calmStints(s: WatchState, at: number): void {
  for (const p of living(s)) {
    const post = s.posts[p.id];
    if (!post || nextRandom(s) >= 0.3) continue;
    const sec = postSection(post);
    const key = `${p.id}@${sec}`;
    s.yearGrain.stints[key] = (s.yearGrain.stints[key] ?? 0) + 1;
    const aff = {
      id: `post:${sec}`,
      action: 'hold-post',
      label: 'stand the wall',
      targetId: sec,
      duration: 60,
      effort: 0.15,
      advertises: {},
    };
    learnOutcome(
      p,
      aff,
      { affordanceId: aff.id, action: aff.action, targetId: sec, status: 'completed', at },
      {},
      0.15,
    );
  }
}

/** Below this many living the village is small: a hungry spring sends nobody away, and refugees may come. */
export const SMALL_VILLAGE = 10;

/** Above this many living, the village is crowded: births slow and nobody new comes alone. */
export const VILLAGE_FULL = 22;

/** Births slow as the houses fill: full chance up to `VILLAGE_FULL`, none at six more. */
function crowding(s: WatchState): number {
  const over = living(s).length - VILLAGE_FULL;
  return over <= 0 ? 1 : Math.max(0, 1 - over / 6);
}

/**
 * A crowded village sends its young away (at the thaw): a married couple under thirty-five leaves, with their
 * young children, to clear new land down the valley, with chance 0.5 per couple while the village is over full.
 * Couples who came from outside go first; a couple with one born here only if that is not enough, so the
 * village's own line can run on through generations. A loss the chronicle keeps, but not a failure.
 */
export function outgrown(s: WatchState): void {
  for (const rooted of [false, true]) outgrownPass(s, rooted);
}

function outgrownPass(s: WatchState, rooted: boolean): void {
  const lookup = lookupIn(s);
  for (const p of living(s)) {
    if (living(s).length <= VILLAGE_FULL) return;
    if (!isHere(s, p) || ageOf(p, s.minute) >= 35) continue;
    const spouse = spousesOf(p)
      .map(lookup)
      .find((q) => q !== undefined && isHere(s, q));
    if (!spouse || ageOf(spouse, s.minute) >= 35) continue;
    const born = !!s.cast[p.id]?.bornHere || !!s.cast[spouse.id]?.bornHere;
    if (born !== rooted || nextRandom(s) >= 0.5) continue;
    const kids = childrenOf(s, p).filter((c) => isHere(s, c) && ageOf(c, s.minute) < 15);
    chronicle(
      s,
      'leave',
      `${nameOf(s, p.id)} and ${nameOf(s, spouse.id)}${kids.length > 0 ? `, with ${kids.length === 1 ? 'their child' : 'their children'},` : ''} went down the valley to clear new land of their own. The village had grown too full for another house.`,
      p.id,
    );
    for (const q of [p, spouse, ...kids]) gone(s, q.id, 'left');
  }
}

interface HouseholdPull {
  head: Person;
  house: Person[];
  adults: Person[];
  pull: number;
}

/** How many households live here (each counted by its first adult). */
export function householdCount(s: WatchState): number {
  const seen = new Set<string>();
  let n = 0;
  for (const p of living(s)) {
    if (seen.has(p.id) || ageOf(p, s.minute) < 18) continue;
    for (const q of householdOf(s, p)) seen.add(q.id);
    n++;
  }
  return n;
}

/** Each household's pull to leave: low trust in the Keeper, low mood and few ties outside it, plus a hard winter. */
function householdPulls(s: WatchState): HouseholdPull[] {
  const hard = s.yearGrain.lostWinter / START_GRAIN;
  const seen = new Set<string>();
  const out: HouseholdPull[] = [];
  for (const p of living(s)) {
    if (seen.has(p.id) || ageOf(p, s.minute) < 18) continue;
    const house = householdOf(s, p);
    for (const q of house) seen.add(q.id);
    const adults = house.filter((q) => ageOf(q, s.minute) >= 18);
    const ids = new Set(house.map((q) => q.id));
    let pull = 0;
    for (const a of adults) {
      const mood = a.affect.mood.valence;
      const trust = a.will.voices.find((x) => x.voiceId === KEEPER_ID)?.trust ?? 0.5;
      const ties = a.social.relationships.filter((r) => r.affection > 0.4 && !ids.has(r.otherId)).length;
      pull += 0.6 * (0.45 - trust) - 0.5 * mood - 0.06 * ties;
    }
    out.push({ head: p, house, adults, pull: pull / Math.max(1, adults.length) + 0.25 * hard });
  }
  return out;
}

function leaveHouse(s: WatchState, h: HouseholdPull, why: string): string[] {
  const names = h.adults.map((a) => nameOf(s, a.id));
  const kids = h.house.length - h.adults.length;
  chronicle(
    s,
    'leave',
    `${names.join(' and ')}${kids > 0 ? ` and ${kids === 1 ? 'the child' : 'the children'}` : ''} ${why}. Their house stands empty.`,
    h.head.id,
  );
  fillLeaf(s, 'left', `${names.join(' and ')} left: the first household to go.`);
  for (const q of h.house) gone(s, q.id, 'left');
  return h.house.map((q) => q.id);
}

/** At the thaw (from year 2): each household may give up and go down the valley. */
export function leaving(s: WatchState): string[] {
  if (s.year < 2) return [];
  const left: string[] = [];
  for (const h of householdPulls(s)) {
    if (h.pull < 0.25 || nextRandom(s) >= h.pull) continue;
    left.push(...leaveHouse(s, h, 'left with the thaw, down the valley road'));
  }
  return left;
}

/**
 * A hungry spring (from year 2): the granary cannot feed everyone to the harvest, so the households most ready to
 * go leave, one by one, until those who stay can be fed from what is left or one household has gone (two in a
 * village of more than fifteen, none in a small one); the rest stay and go short. Returns how many people left.
 */
export function hungrySpring(s: WatchState, perHead: number): number {
  const ranked = householdPulls(s)
    .sort((a, b) => b.pull - a.pull)
    .slice(0, living(s).length > 15 ? 2 : living(s).length >= SMALL_VILLAGE ? 1 : 0);
  let left = 0;
  for (const h of ranked) {
    if (s.grain >= Math.ceil(living(s).length * perHead)) break;
    left += leaveHouse(s, h, 'went down the valley in the hungry spring, to kin who could feed them').length;
  }
  return left;
}

/** A dry summer may burn a house: the household moves behind another stretch and the ruin stays on the map. */
export function maybeFire(s: WatchState): void {
  if (nextRandom(s) >= 0.12) return;
  const heads = living(s).filter((p) => ageOf(p, s.minute) >= 18);
  if (heads.length === 0) return;
  const head = pick(s, heads);
  const v = villager(s, head.id);
  const from = v.home;
  const to = SECTION_IDS.find((x) => x !== from && !s.marks.ruins.some((r) => r.section === x)) ?? 'gate';
  s.marks.ruins.push({ section: from, year: s.year, who: head.id });
  for (const q of householdOf(s, head)) villager(s, q.id).home = to;
  s.grain = Math.max(0, s.grain - 2);
  chronicle(
    s,
    'loss',
    `${v.name}’s house by the ${from === 'gate' ? 'Gate' : `${from} wall`} burned in the dry heat. They live behind the ${to === 'gate' ? 'Gate' : `${to} wall`} now.`,
    head.id,
  );
}

/** A lone newcomer when the single adults have nobody to court (the director's partners). */
export function maybePartner(s: WatchState): void {
  if (living(s).length >= VILLAGE_FULL) return;
  const singles = living(s).filter((p) => single(p, s.minute) && ageOf(p, s.minute) <= 35);
  if (singles.length === 0) return;
  const stuck = singles.filter((p) => fancy(s, p, s.minute) === null);
  if (stuck.length === 0 || nextRandom(s) >= 0.5) return;
  const first = stuck[0];
  if (!first) return;
  const sex = first.life.sex === 'female' ? 'male' : 'female';
  const p = newcomer(s, sex, 19 + Math.floor(nextRandom(s) * 10), s.minute, {
    note: 'Came up the valley alone',
  });
  chronicle(s, 'arrive', `${p.name} came up the valley alone and asked to stay.`, p.id);
}

/** A severe wound may end a watcher's time on the wall (a limp for life). */
export function maybeLimp(s: WatchState, p: Person): void {
  const v = s.cast[p.id];
  if (!v || v.limp) return;
  const worst = Math.max(0, ...p.body.injuries.map((i) => i.severity));
  if (worst < 0.55 || nextRandom(s) >= 0.3) return;
  v.limp = true;
  // Off the wall for good, so no standing posting either (owner's year-4 export: lamed Tamar kept gate-1 for a
  // year, and a second watcher was posted on top of her).
  s.posts[p.id] = null;
  chronicle(
    s,
    'loss',
    `${v.name}’s leg did not heal straight. ${v.sex === 'female' ? 'She' : 'He'} will limp for life, and the wall stair is beyond ${them(s, p.id)}.`,
    p.id,
  );
}

export function fillLeaf(s: WatchState, id: string, text: string): void {
  const leaf = s.leaves.find((l) => l.id === id && l.filled === null);
  if (!leaf) return;
  leaf.filled = text;
  chronicle(s, 'leaf', text);
}

/** Posts the unposted watchers on their usual post (or one free nearby), for a new winter. */
export function postEveryone(s: WatchState, ids: readonly WatcherId[]): void {
  for (const id of ids) {
    const post = s.posts[id];
    if (post && s.openPosts.includes(post)) continue;
    const v = villager(s, id);
    const taken = new Set(
      Object.entries(s.posts)
        .filter(([w]) => w !== id)
        .map(([, x]) => x),
    );
    s.posts[id] = s.openPosts.includes(v.usual) && !taken.has(v.usual) ? v.usual : null;
    if (s.posts[id] === null) {
      const free = s.openPosts.find((x) => !taken.has(x));
      s.posts[id] = free ?? null;
    }
    s.press[id] ??= 'ask';
    s.postedAt[id] = s.minute;
  }
}

/** Children this young hear no winter stories yet. */
const STORY_AGE = 4;

/**
 * Winter stories (H2, spec §3: a child who hears how the east wall broke fears it before standing there). At the
 * thaw each child too young for the wall hears their parents' and guardians' lasting gists of the wall's stretches
 * (HF `retell`), weighed by the child's trust in them. A told fear becomes the child's own, weaker gist, which
 * weighs on their postings once they come of age, until their own nights outweigh it. Writes no chronicle line.
 */
export function winterStories(s: WatchState): void {
  for (const child of living(s)) {
    const age = ageOf(child, s.minute);
    if (age < STORY_AGE || age >= WATCH_AGE) continue;
    for (const r of child.social.relationships) {
      if (!r.roles.includes('parent') && !r.roles.includes('guardian')) continue;
      const teller = personOf(s, r.otherId);
      if (!teller || !isHere(s, teller)) continue;
      retell(teller, child, s.minute, { trust: r.trust, placeIds: SECTION_IDS, limit: 2 });
    }
  }
}
