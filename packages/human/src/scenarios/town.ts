/**
 * SCOPE: a small Anatolian town in Ramadan, the headless reference world for Game 2 ("The Day You Say Nothing").
 * Six places (home, mosque, tea house, workshop, market, clinic) and five people, each a full `Person`: Halil, a
 * widowed repairman of 61 with hypertension, a cigarette habit and a month of rent owed; Selin, his daughter in
 * the city, reachable by phone; Rıza, his friend at the tea house; Hacer, the neighbour who talks about people;
 * Osman, the landlord. Days carry per-day prayer times from a drifting calendar, the Ramadan fast and its meals,
 * dawn hooks (exemptions, prayer-time retiming, make-up scheduling), a money ledger that feeds scarcity, and
 * conversations through the driver's convention (testimony, gossip, standing advice). Outcomes use the town's
 * own seeded RNG. Travel is not modelled: every option is offered to whoever may take it, with duration standing
 * in for distance. This is a fixture for exercising the framework end to end, not a model of any town.
 *
 * Selin's own day happens off the map (place 'city'); she is in the community so that calls run `converse` both
 * ways and her advice reaches Halil as a standing voice.
 */
import {
  applyExemptions,
  calendarRetimer,
  owedMakeUps,
  type PrayerCalendar,
  prayerWindows,
  RAMADAN_DEFAULTS,
  ramadanFast,
  ramadanMeals,
  retimeCommitments,
  scheduleMakeUp,
} from '../agenda/index.ts';
import { believe } from '../beliefs/index.ts';
import { readBody, sicken } from '../body/index.ts';
import { heldNorms } from '../conscience/index.ts';
import type { ConverseContext } from '../conversation/index.ts';
import { chance, createRng, dayOf, minuteOfDay } from '../core/index.ts';
import { createPerson } from '../person.ts';
import type { World } from '../sim/index.ts';
import { successChance } from '../skills/index.ts';
import type {
  Activity,
  Affordance,
  Lexicon,
  Minute,
  Outcome,
  Percept,
  Person,
  PersonId,
  PersonSpec,
  RngState,
  Unit,
} from '../types.ts';
import { MINUTES_PER_DAY, MINUTES_PER_YEAR } from '../types.ts';

export const TOWN_DEFAULTS = {
  /** Clock at creation (minute of day 0). */
  start: 7 * 60,
  /** First day of Ramadan and its length; day 0 is an ordinary day. */
  ramadanFirstDay: 1,
  ramadanDays: 30,
  /** Monthly rent, the day it falls due (recurring every `rentEvery` days) and what a repair shift pays. */
  rent: 300,
  rentDueDay: 10,
  rentEvery: 30,
  wage: 25,
  /** Halil starts owing this many months. */
  monthsOwed: 1,
  startingMoney: { halil: 40, selin: 400, riza: 120, hacer: 90, osman: 900 } as Record<PersonId, number>,
  /** What a clinic visit costs, and how many days pass before the clinic is worth another visit. */
  clinicFee: 10,
  clinicCooldownDays: 7,
  /** Hours (minute of day) when the town is up and about. */
  dayFrom: 6 * 60,
  dayTo: 23 * 60,
  /** Halil's chronic condition at the start (below the exemption threshold on purpose). */
  hypertension: 0.2,
  /** Halil's mid-morning cigarette: cue hour, strength and craving susceptibility. */
  smokeHabit: { hour: 10, strength: 0.7, craving: 0.6 },
};

/**
 * Per-day prayer times for a spring Ramadan in Anatolia: fajr a minute earlier and maghrib/isha a minute later
 * each day from the defaults. The drift is an engineering stand-in for a real calendar, not an astronomical one.
 */
export const townCalendar: PrayerCalendar = (day) => ({
  fajr: 300 - day,
  dhuhr: 750,
  asr: 960 + Math.floor(day / 2),
  maghrib: 1125 + day,
  isha: 1215 + day,
});

/** Minute of day each job begins (the morning alarm); see `affordancesFor`. */
const JOB_START: Partial<Record<PersonId, number>> = { halil: 8 * 60, selin: 9 * 60, osman: 9 * 60 };

export const TOWN_IDS = ['halil', 'selin', 'riza', 'hacer', 'osman'] as const;
export type TownPersonId = (typeof TOWN_IDS)[number];

export interface TownState {
  now: Minute;
  rng: RngState;
  money: Record<PersonId, number>;
  /** Rent Halil owes Osman now (grows on each due day, cleared by paying). */
  rentOwed: number;
  /** Percepts queued per person, each delivered once. */
  queued: Record<PersonId, Percept[]>;
  /** Count of completed actions per person per action id (for tests). */
  completed: Record<PersonId, Record<string, number>>;
  /** Days the dawn hook has run for, per person (for tests). */
  days: Record<PersonId, number[]>;
  /** Last clinic visit per person (the clinic is offered again after `TOWN_DEFAULTS.clinicCooldownDays`). */
  lastClinic: Record<PersonId, Minute>;
  /** Day of the last paid work block per person: one block a day in Ramadan (the shop keeps short hours). */
  lastWorked: Record<PersonId, number>;
}

export interface Town extends World {
  state: TownState;
  calendar: PrayerCalendar;
  queue(personId: PersonId, percept: Percept): void;
  /** Material shortfall used for scarcity: rent owed beyond cash, as a share of a month's rent. */
  shortfall(p: Person): Unit;
}

export interface TownOptions {
  /** Clock at creation (default `TOWN_DEFAULTS.start`). */
  now?: Minute;
  /** First day of Ramadan (default 1) and its length (default 30). */
  ramadanFirstDay?: number;
  ramadanDays?: number;
  /** Give this person an acute, contagious cold at creation (tests of exemption and contagion). */
  cold?: PersonId;
  /** Player's voice id in Halil's will (default 'you'). */
  playerVoice?: string;
}

const HALIL_LEXICON: Lexicon = {
  locale: 'en',
  names: { halil: 'Halil', selin: 'Selin', riza: 'Rıza', hacer: 'Hacer', osman: 'Osman', you: 'you' },
  roles: {
    child: 'daughter',
    parent: 'father',
    friend: 'friend',
    neighbor: 'neighbour',
    landlord: 'landlord',
  },
  actions: {
    'work-repair': { base: 'repair', past: 'repaired', gerund: 'repairing' },
    'see-doctor': { base: 'see the doctor', past: 'saw the doctor', gerund: 'seeing the doctor' },
    'pay-rent': { base: 'pay the rent', past: 'paid the rent', gerund: 'paying the rent' },
    tea: { base: 'drink tea', past: 'drank tea', gerund: 'drinking tea' },
    call: { base: 'call', past: 'called', gerund: 'calling' },
    talk: { base: 'talk', past: 'talked', gerund: 'talking' },
    smoke: { base: 'smoke', past: 'smoked', gerund: 'smoking' },
  },
};

const ties = (pairs: [PersonId, string][]): NonNullable<PersonSpec['relationships']> =>
  pairs.map(([otherId, role]) => ({
    otherId,
    roles: [role],
    familiarity: 0.7,
    // Friends are warmer than neighbours and landlords, so tea with a friend competes with staying home.
    affection: role === 'friend' ? 0.5 : 0.3,
    trust: 0.6,
  }));

/** Person specs for the five townspeople. Ids are fixed; `now` is the creation minute. */
export function townSpecs(opts: TownOptions = {}): Record<TownPersonId, PersonSpec> {
  const T = TOWN_DEFAULTS;
  const now = opts.now ?? T.start;
  const day = dayOf(now);
  const first = opts.ramadanFirstDay ?? T.ramadanFirstDay;
  const days = opts.ramadanDays ?? T.ramadanDays;
  const player = opts.playerVoice ?? 'you';
  const born = (age: number) => now - age * MINUTES_PER_YEAR;
  const worship = (practice: number): NonNullable<PersonSpec['commitments']> =>
    practice >= 0.5 ? prayerWindows(day, townCalendar).map((c, i) => ({ ...c, id: `prayer${i}` })) : [];
  // Tea is drink: the tea house is an evening place in Ramadan.
  const fast = (violatedBy: string[] = ['eat', 'drink', 'tea']): NonNullable<PersonSpec['commitments']> => [
    { ...ramadanFast(first, days, townCalendar, { violatedBy }), id: 'fast' },
    ...ramadanMeals(first, days, townCalendar).map((c, i) => ({ ...c, id: `meal${i}` })),
  ];
  const job = (
    id: string,
    action: string,
    from: number,
    until: number,
    importance = 0.8,
  ): NonNullable<PersonSpec['commitments']>[number] => ({
    id,
    kind: 'job',
    actions: [action],
    from: day * MINUTES_PER_DAY + from,
    until: day * MINUTES_PER_DAY + until,
    importance,
    recurEvery: MINUTES_PER_DAY,
    label: action,
  });
  const halilPractice = 0.8;
  return {
    halil: {
      id: 'halil',
      name: 'Halil',
      seed: 1001,
      now,
      bornAt: born(61),
      sex: 'male',
      traits: {
        conscientiousness: 0.6,
        extraversion: 0.35,
        agreeableness: 0.6,
        emotionality: 0.5,
        honesty: 0.7,
      },
      values: { tradition: 0.8, security: 0.7, benevolence: 0.6, hedonism: 0.3 },
      norms: heldNorms({ practice: halilPractice }),
      skills: { repair: 0.7 },
      body: { fitness: 0.45 },
      relationships: ties([
        ['selin', 'child'],
        ['riza', 'friend'],
        ['hacer', 'neighbor'],
        ['osman', 'landlord'],
      ]),
      voices: [
        { voiceId: player, trust: 0.5 },
        { voiceId: 'selin', trust: 0.75 },
        { voiceId: 'riza', trust: 0.6 },
        { voiceId: 'hacer', trust: 0.3 },
        { voiceId: 'osman', trust: 0.35 },
      ],
      commitments: [
        ...worship(halilPractice),
        // 'tea' is drinking. 'smoke' breaking the fast is the TOWN'S ENGINEERING ASSUMPTION (agenda/prayer.ts asks
        // host additions beyond eating and drinking to carry provenance): it follows the widely held contemporary
        // view as Halil would understand it, but no source for it is recorded in research/ yet (review 2026-10-03).
        ...fast(['eat', 'drink', 'tea', 'smoke']),
        job('job', 'work-repair', 8 * 60, 12 * 60, 0.7),
        {
          id: 'rent',
          kind: 'promise',
          label: 'rent',
          actions: ['pay-rent'],
          toId: 'osman',
          from: T.rentDueDay * MINUTES_PER_DAY + 9 * 60,
          until: T.rentDueDay * MINUTES_PER_DAY + 20 * 60,
          importance: 0.8,
          recurEvery: T.rentEvery * MINUTES_PER_DAY,
        },
      ],
      lexicon: HALIL_LEXICON,
    },
    selin: {
      id: 'selin',
      name: 'Selin',
      seed: 1002,
      now,
      bornAt: born(32),
      sex: 'female',
      traits: { conscientiousness: 0.7, extraversion: 0.6, agreeableness: 0.65, honesty: 0.75 },
      values: { benevolence: 0.8, achievement: 0.6, tradition: 0.4 },
      norms: heldNorms({ practice: 0.4 }),
      skills: { office: 0.6 },
      relationships: ties([['halil', 'parent']]),
      voices: [{ voiceId: 'halil', trust: 0.7 }],
      commitments: [...fast(), job('job', 'work', 9 * 60, 18 * 60)],
    },
    riza: {
      id: 'riza',
      name: 'Rıza',
      seed: 1003,
      now,
      bornAt: born(63),
      sex: 'male',
      traits: { extraversion: 0.7, agreeableness: 0.7, honesty: 0.65, conscientiousness: 0.45 },
      values: { tradition: 0.85, benevolence: 0.7, hedonism: 0.45 },
      norms: heldNorms({ practice: 0.85 }),
      relationships: ties([
        ['halil', 'friend'],
        ['hacer', 'neighbor'],
        ['osman', 'neighbor'],
      ]),
      voices: [{ voiceId: 'halil', trust: 0.6 }],
      commitments: [...worship(0.85), ...fast()],
    },
    hacer: {
      id: 'hacer',
      name: 'Hacer',
      seed: 1004,
      now,
      bornAt: born(58),
      sex: 'female',
      traits: { extraversion: 0.8, agreeableness: 0.45, honesty: 0.5, emotionality: 0.6 },
      values: { tradition: 0.7, power: 0.5, stimulation: 0.5 },
      // She talks about people: a weakly held understanding of backbiting, so the cost rarely stops her.
      norms: heldNorms({
        practice: 0.7,
        extraNorms: [{ normId: 'backbiting', standing: 'forbidden', conviction: 0.15 }],
      }),
      relationships: ties([
        ['halil', 'neighbor'],
        ['riza', 'neighbor'],
        ['osman', 'neighbor'],
      ]),
      voices: [{ voiceId: 'halil', trust: 0.5 }],
      commitments: [...worship(0.7), ...fast()],
    },
    osman: {
      id: 'osman',
      name: 'Osman',
      seed: 1005,
      now,
      bornAt: born(55),
      sex: 'male',
      traits: { conscientiousness: 0.75, agreeableness: 0.35, honesty: 0.6, extraversion: 0.5 },
      values: { security: 0.8, power: 0.6, achievement: 0.6, tradition: 0.5 },
      norms: heldNorms({ practice: 0.5 }),
      skills: { trade: 0.7 },
      relationships: ties([
        ['halil', 'tenant'],
        ['riza', 'neighbor'],
        ['hacer', 'neighbor'],
      ]),
      voices: [{ voiceId: 'halil', trust: 0.4 }],
      commitments: [...worship(0.5), ...fast(), job('job', 'work-market', 9 * 60, 17 * 60)],
    },
  };
}

/** The five townspeople as `Person`s, with the beliefs, illness and habit the town's stories need. */
export function townPeople(opts: TownOptions = {}): Record<TownPersonId, Person> {
  const T = TOWN_DEFAULTS;
  const specs = townSpecs(opts);
  const people = {} as Record<TownPersonId, Person>;
  for (const id of TOWN_IDS) people[id] = createPerson(specs[id]);
  const now = people.halil.now;
  // Halil: hypertension (chronic, aggravated by smoking) and the mid-morning cigarette.
  sicken(people.halil, {
    kind: 'hypertension',
    severity: T.hypertension,
    trendPerDay: 0,
    contagious: false,
    chronic: true,
    baseline: T.hypertension,
    aggravatedBy: ['smoke'],
  });
  people.halil.habits.push({
    cue: { hour: T.smokeHabit.hour },
    action: 'smoke',
    strength: T.smokeHabit.strength,
    repetitions: 400,
    lastAt: now - MINUTES_PER_DAY,
    craving: T.smokeHabit.craving,
  });
  // What people believe going in. Advice beliefs ('<listener>:should:<action>') become suggestions in calls.
  believe(people.selin, 'halil:should:see-doctor', true, 0.9, 'selin', now);
  believe(people.selin, 'halil:should:rest', true, 0.7, 'selin', now);
  believe(people.riza, 'halil:should:tea', true, 0.8, 'riza', now);
  believe(people.hacer, 'osman:stingy', true, 0.9, 'hacer', now);
  believe(people.hacer, 'riza:lazy', true, 0.8, 'hacer', now);
  believe(people.osman, 'halil:owes:osman', true, 0.95, 'osman', now);
  believe(people.osman, 'halil:reliable', true, 0.6, 'osman', now);
  if (opts.cold) {
    const sick = people[opts.cold as TownPersonId];
    if (sick) sicken(sick, { kind: 'cold', severity: 0.6, trendPerDay: -0.08, contagious: true });
  }
  return people;
}

const isDaytime = (now: Minute): boolean => {
  const m = minuteOfDay(now);
  return m >= TOWN_DEFAULTS.dayFrom && m < TOWN_DEFAULTS.dayTo;
};

/** Build the town world over `people` (normally `townPeople()`); `seed` drives outcome randomness. */
export function createTown(people: readonly Person[], opts: TownOptions & { seed: number }): Town {
  const T = TOWN_DEFAULTS;
  const first = opts.ramadanFirstDay ?? T.ramadanFirstDay;
  const days = opts.ramadanDays ?? T.ramadanDays;
  const ids = new Set(people.map((p) => p.id));
  const has = (id: string) => ids.has(id);
  const state: TownState = {
    now: Math.min(...people.map((p) => p.now)),
    rng: createRng(opts.seed),
    money: {},
    rentOwed: T.rent * T.monthsOwed,
    queued: {},
    completed: {},
    days: {},
    lastClinic: {},
    lastWorked: {},
  };
  for (const p of people) state.money[p.id] = T.startingMoney[p.id] ?? 100;
  const count = (pid: PersonId, action: string) => {
    const row = state.completed[pid] ?? {};
    state.completed[pid] = row;
    row[action] = (row[action] ?? 0) + 1;
  };
  const queue = (personId: PersonId, percept: Percept) => {
    const list = state.queued[personId] ?? [];
    state.queued[personId] = list;
    list.push(percept);
  };
  const shortfall = (p: Person): Unit => {
    if (p.id !== 'halil') return 0;
    const debt = Math.max(0, state.rentOwed - (state.money[p.id] ?? 0));
    return Math.max(0, Math.min(1, debt / T.rent));
  };
  const retimer = calendarRetimer(townCalendar);

  const onDay = (p: Person, day: number): void => {
    const list = state.days[p.id] ?? [];
    state.days[p.id] = list;
    list.push(day);
    const now = p.now;
    // Prayer windows and fast meals follow the calendar; an illness or journey releases today's fast.
    retimeCommitments(p, now, retimer);
    applyExemptions(p, now);
    // Make-up fasts are scheduled one per owed day after Ramadan, starting the day AFTER Eid al-Fitr (the day
    // following the last fast, `first + days`): fasting on the day of Eid is widely held to be prohibited (Bukhari
    // 1990 / Muslim 1137 as cited by review 2026-10-03; sunnah.com returned 403, so not verified here and not
    // recorded in research/ yet). Skipping the day is a scheduling choice, not a ruling the framework applies.
    // Note: docs/games/voice.md calls day 30 Eid; with these defaults (30 fasts from day 1) Eid is day 31.
    let k = 0;
    for (const owed of owedMakeUps(p)) {
      const d = first + days + 1 + k++;
      const t = townCalendar(d);
      scheduleMakeUp(p, owed.ofId, {
        from: d * MINUTES_PER_DAY + t.fajr,
        until: d * MINUTES_PER_DAY + t.maghrib,
      });
    }
    if (p.id === 'halil' && day >= T.rentDueDay && (day - T.rentDueDay) % T.rentEvery === 0)
      state.rentOwed += T.rent;
  };

  /** Whether `at` falls in a Ramadan meal window (suhoor or iftar) of the day it belongs to. */
  const mealWindow = (at: Minute): 'suhoor' | 'iftar' | undefined => {
    const day = dayOf(at);
    if (day < first || day >= first + days) return undefined;
    const t = townCalendar(day);
    const m = minuteOfDay(at);
    if (m >= t.fajr - RAMADAN_DEFAULTS.suhoorLead && m < t.fajr) return 'suhoor';
    if (m >= t.maghrib && m < t.maghrib + RAMADAN_DEFAULTS.iftarLength) return 'iftar';
    return undefined;
  };
  /** Minutes until the next suhoor begins (the drummer's round), if one falls within `horizon`. */
  const untilSuhoor = (now: Minute, horizon: number): number | undefined => {
    for (const day of [dayOf(now), dayOf(now) + 1]) {
      if (day < first || day >= first + days) continue;
      const start = day * MINUTES_PER_DAY + townCalendar(day).fajr - RAMADAN_DEFAULTS.suhoorLead;
      if (start > now && start - now <= horizon) return start - now;
    }
    return undefined;
  };

  const untilJob = (id: PersonId, now: Minute, horizon: number): number | undefined => {
    const startOfDay = JOB_START[id];
    if (startOfDay === undefined) return undefined;
    for (const day of [dayOf(now), dayOf(now) + 1]) {
      const start = day * MINUTES_PER_DAY + startOfDay;
      if (start > now && start - now <= horizon) return start - now;
    }
    return undefined;
  };

  const affordancesFor = (p: Person): Affordance[] => {
    const now = p.now;
    state.now = Math.max(state.now, now);
    const daytime = isDaytime(now);
    const home = p.id === 'selin' ? 'city' : 'home';
    // In Ramadan the night's sleep ends when the drummer comes round for suhoor, and a working day starts
    // when the job does (the alarm is the host's; the choice to get up is the person's).
    const alarm = Math.min(untilSuhoor(now, 480) ?? 480, untilJob(p.id, now, 480) ?? 480);
    const sleepFor = Math.max(60, Math.min(480, alarm));
    const out: Affordance[] = [
      {
        id: 'sleep',
        action: 'sleep',
        label: 'sleep',
        placeId: home,
        duration: sleepFor,
        effort: 0,
        mode: 'sleep',
        advertises: { sleep: 0.8, rest: 0.4 },
        tags: ['sleep'],
      },
      {
        id: 'rest',
        action: 'rest',
        label: 'rest at home',
        placeId: home,
        duration: 30,
        effort: 0,
        advertises: { rest: 0.25, leisure: 0.1 },
        tags: ['rest', 'leisure'],
      },
      {
        id: 'eat',
        action: 'eat',
        label: 'eat at home',
        placeId: home,
        duration: 30,
        effort: 0.1,
        advertises: { food: 0.6 },
        tags: ['food'],
      },
      {
        id: 'drink',
        action: 'drink',
        label: 'drink water',
        placeId: home,
        duration: 5,
        effort: 0.02,
        advertises: { water: 0.6 },
      },
      {
        id: 'pray',
        action: 'pray',
        label: p.id === 'selin' ? 'pray at home' : 'pray at the mosque',
        placeId: p.id === 'selin' ? home : 'mosque',
        duration: 20,
        effort: 0.1,
        focus: 0.3,
        advertises: { meaning: 0.1 },
        norms: [{ normId: 'salah', relation: 'fulfills' }],
        tags: ['worship'],
      },
      { id: 'wait', action: 'wait', label: 'wait', duration: 15, effort: 0, advertises: {} },
    ];
    if (!daytime) return out;
    const mod = minuteOfDay(now);
    const talk = (other: PersonId, placeId: string, action: 'talk' | 'tea' | 'call', label: string) => {
      // The other party is assumed reachable; the driver skips the exchange if they are asleep or dead, but a
      // one-sided visit (Halil at work, Rıza "at tea with Halil") is not caught here. Known seam, see findings.
      if (!has(other)) return;
      out.push({
        id: `${action}:${other}`,
        action,
        label,
        placeId,
        with: [other],
        duration: action === 'call' ? 20 : 40,
        effort: 0.1,
        // Tea at the tea house is the town's rest as well as its company.
        advertises:
          action === 'tea'
            ? { belonging: 0.35, leisure: 0.25, rest: 0.1 }
            : { belonging: 0.3, leisure: 0.15 },
        tags: ['social', 'leisure', 'conversation'],
      });
    };
    switch (p.id) {
      case 'halil': {
        if (mod >= 8 * 60 && mod < 12 * 60 && state.lastWorked[p.id] !== dayOf(now))
          out.push({
            id: 'work-repair',
            action: 'work-repair',
            label: 'repair in the workshop',
            placeId: 'workshop',
            duration: 120,
            effort: 0.6,
            focus: 0.4,
            skill: { id: 'repair', difficulty: 0.35 },
            advertises: { competence: 0.15 },
            material: T.wage,
            tags: ['work'],
          });
        talk('riza', 'teahouse', 'tea', 'tea with Rıza');
        talk('hacer', 'home', 'talk', 'talk with Hacer at the door');
        if (mod >= 18 * 60) talk('selin', 'home', 'call', 'call Selin');
        out.push({
          id: 'smoke',
          action: 'smoke',
          label: 'smoke a cigarette',
          placeId: 'teahouse',
          duration: 10,
          effort: 0.02,
          advertises: { rest: 0.1, leisure: 0.1 },
          tags: ['leisure'],
        });
        if (
          mod >= 9 * 60 &&
          mod < 17 * 60 &&
          (state.money[p.id] ?? 0) >= T.clinicFee &&
          now - (state.lastClinic[p.id] ?? Number.NEGATIVE_INFINITY) >= T.clinicCooldownDays * MINUTES_PER_DAY
        )
          out.push({
            id: 'see-doctor',
            action: 'see-doctor',
            label: 'see the doctor at the clinic',
            placeId: 'clinic',
            duration: 60,
            effort: 0.2,
            advertises: { safety: 0.2 },
            tags: ['health'],
          });
        if (state.rentOwed > 0 && (state.money[p.id] ?? 0) >= T.rent)
          out.push({
            id: 'pay-rent',
            action: 'pay-rent',
            label: 'pay Osman the rent',
            placeId: 'market',
            targetId: 'osman',
            duration: 30,
            effort: 0.1,
            advertises: { safety: 0.2 },
            norms: [{ normId: 'keep-promise', relation: 'fulfills' }],
            tags: ['money'],
          });
        break;
      }
      case 'selin': {
        if (mod >= 9 * 60 && mod < 18 * 60)
          out.push({
            id: 'work',
            action: 'work',
            label: 'work at the office',
            placeId: 'city',
            duration: 180,
            effort: 0.4,
            focus: 0.5,
            skill: { id: 'office', difficulty: 0.3 },
            advertises: { competence: 0.1 },
            material: 60,
            tags: ['work'],
          });
        if (mod >= 18 * 60) talk('halil', 'city', 'call', 'call father');
        break;
      }
      case 'riza': {
        talk('halil', 'teahouse', 'tea', 'tea with Halil');
        talk('hacer', 'home', 'talk', 'talk with Hacer');
        out.push({
          id: 'walk',
          action: 'walk',
          label: 'walk by the river',
          placeId: 'market',
          duration: 45,
          effort: 0.3,
          advertises: { leisure: 0.2, rest: 0.05 },
          tags: ['leisure', 'outdoors'],
        });
        break;
      }
      case 'hacer': {
        talk('halil', 'home', 'talk', 'talk with Halil');
        talk('riza', 'home', 'talk', 'talk with Rıza');
        talk('osman', 'market', 'talk', 'talk with Osman at the market');
        out.push({
          id: 'housework',
          action: 'housework',
          label: 'housework',
          placeId: 'home',
          duration: 60,
          effort: 0.4,
          advertises: { competence: 0.08, safety: 0.05 },
          tags: ['work'],
        });
        break;
      }
      case 'osman': {
        if (mod >= 9 * 60 && mod < 17 * 60)
          out.push({
            id: 'work-market',
            action: 'work-market',
            label: 'keep the market stall',
            placeId: 'market',
            duration: 180,
            effort: 0.45,
            focus: 0.3,
            skill: { id: 'trade', difficulty: 0.3 },
            advertises: { competence: 0.1 },
            material: 80,
            tags: ['work'],
          });
        talk('hacer', 'market', 'talk', 'talk with Hacer');
        if (state.rentOwed > 0 && has('halil'))
          out.push({
            id: 'collect-rent',
            action: 'collect-rent',
            label: 'call on Halil about the rent',
            placeId: 'home',
            targetId: 'halil',
            duration: 20,
            effort: 0.15,
            advertises: { safety: 0.15, esteem: 0.05 },
            tags: ['money'],
          });
        break;
      }
      default:
        break;
    }
    return out;
  };

  const resolve = (p: Person, act: Activity, reason: 'ended' | 'interrupted'): Outcome => {
    const now = p.now;
    state.now = Math.max(state.now, now);
    const aff = act.affordance;
    const base: Outcome = {
      affordanceId: act.affordanceId,
      action: act.action,
      status: 'completed',
      at: now,
    };
    if (act.targetId !== undefined) base.targetId = act.targetId;
    if (reason === 'interrupted') {
      const span = Math.max(1, act.endsAt - act.startedAt);
      const progress = Math.max(0, Math.min(1, (now - act.startedAt) / span));
      const out: Outcome = { ...base, status: 'interrupted', summary: `${aff.label}: interrupted` };
      if (aff.material !== undefined && progress > 0) {
        out.material = aff.material * progress;
        state.money[p.id] = (state.money[p.id] ?? 0) + out.material;
      }
      return out;
    }
    const done = (o: Outcome) => {
      if (o.status === 'completed') count(p.id, act.action);
      return o;
    };
    const capacity = readBody(p).capacity;
    switch (act.action) {
      case 'eat': {
        // Suhoor and iftar are large meals meant to carry the fast; an ordinary meal is not.
        const meal = mealWindow(act.startedAt) ?? mealWindow(now);
        if (meal) return done({ ...base, needs: { food: 0.9, water: 0.5 }, summary: `ate ${meal}` });
        return done({ ...base, needs: { food: 0.6, water: 0.2 }, summary: 'ate at home' });
      }
      case 'drink':
        return done({ ...base, needs: { water: 0.6 }, summary: 'drank water' });
      case 'sleep':
        return done({ ...base, summary: 'slept' });
      case 'rest':
        return done({ ...base, needs: { leisure: 0.1 }, summary: 'rested' });
      case 'wait':
        return done({ ...base, summary: 'waited' });
      case 'pray':
        return done({ ...base, needs: { meaning: 0.1 }, summary: 'prayed' });
      case 'walk':
        return done({ ...base, needs: { leisure: 0.2 }, summary: 'walked by the river' });
      case 'housework':
        return done({ ...base, needs: { competence: 0.08 }, summary: 'did the housework' });
      case 'smoke':
        return done({
          ...base,
          needs: { rest: 0.05, leisure: 0.05 },
          exposures: [{ kind: 'smoke' }],
          summary: 'smoked a cigarette',
        });
      case 'work-repair':
      case 'work':
      case 'work-market': {
        const skillId = aff.skill?.id ?? 'repair';
        state.lastWorked[p.id] = dayOf(p.now);
        const ok = chance(state.rng, successChance(p, skillId, aff.skill?.difficulty ?? 0.3, capacity));
        const pay = aff.material ?? 0;
        const earned = ok ? pay : pay * 0.4;
        state.money[p.id] = (state.money[p.id] ?? 0) + earned;
        if (ok)
          return done({
            ...base,
            needs: { competence: 0.12 },
            material: earned,
            summary: `${aff.label}: a good day`,
          });
        return {
          ...base,
          status: 'failed',
          needs: { competence: 0.02 },
          material: earned,
          summary: `${aff.label}: a poor day`,
        };
      }
      case 'see-doctor': {
        state.money[p.id] = (state.money[p.id] ?? 0) - T.clinicFee;
        state.lastClinic[p.id] = now;
        const ill = p.body.illnesses.find((i) => i.kind === 'hypertension');
        const percepts: Percept[] = [
          {
            at: now,
            channel: 'told',
            kind: 'diagnosis',
            actorId: 'doctor',
            targetId: p.id,
            placeId: 'clinic',
            valence: ill ? -0.2 : 0.1,
            salience: 0.7,
            claims: [{ prop: `${p.id}:has:hypertension`, value: ill !== undefined, confidence: 0.9 }],
            advice: [
              { action: 'rest', strength: 0.5 },
              { action: 'walk', strength: 0.4 },
            ],
            summary: ill
              ? 'the doctor said the pressure is high and to rest, walk and stop smoking'
              : 'the doctor found nothing new',
          },
        ];
        return done({ ...base, needs: { safety: 0.2 }, percepts, summary: 'saw the doctor' });
      }
      case 'pay-rent': {
        const paid = Math.min(T.rent, state.rentOwed, state.money[p.id] ?? 0);
        state.money[p.id] = (state.money[p.id] ?? 0) - paid;
        state.rentOwed -= paid;
        if (has('osman')) {
          state.money.osman = (state.money.osman ?? 0) + paid;
          queue('osman', {
            at: now,
            channel: 'saw',
            kind: 'payment',
            actorId: p.id,
            targetId: 'osman',
            placeId: 'market',
            valence: 0.3,
            salience: 0.6,
            claims: [{ prop: 'halil:owes:osman', value: state.rentOwed > 0, confidence: 0.95 }],
            summary: `${p.name} paid the rent`,
          });
        }
        return done({ ...base, needs: { safety: 0.2 }, summary: 'paid the rent' });
      }
      case 'collect-rent': {
        if (has('halil'))
          queue('halil', {
            at: now,
            channel: 'told',
            kind: 'demand',
            actorId: p.id,
            targetId: 'halil',
            placeId: 'home',
            valence: -0.3,
            salience: 0.7,
            claims: [{ prop: 'halil:owes:osman', value: true, confidence: 0.95 }],
            advice: [{ action: 'pay-rent', strength: 0.6 }],
            summary: `${p.name} came about the rent`,
          });
        return done({ ...base, needs: { esteem: 0.05 }, summary: 'called on Halil about the rent' });
      }
      case 'tea':
      case 'talk':
      case 'call':
        // The exchange itself runs through the driver's conversation convention when this completes.
        return done({ ...base, needs: { belonging: 0.3, leisure: 0.15 }, summary: aff.label });
      default:
        return done({ ...base, summary: `${aff.label}: done` });
    }
  };

  const perceptsFor = (p: Person, since: Minute, until: Minute): Percept[] => {
    state.now = Math.max(state.now, until);
    const list = state.queued[p.id];
    if (!list || list.length === 0) return [];
    const due = list.filter((x) => x.at <= until && x.at > since - 1);
    state.queued[p.id] = list.filter((x) => !due.includes(x));
    return due;
  };

  const converse = (
    speaker: Person,
    listener: Person,
    act: Activity,
  ): Partial<ConverseContext> | undefined => {
    const placeId = act.affordance.placeId;
    const ctx: Partial<ConverseContext> = {};
    if (placeId !== undefined) ctx.placeId = placeId;
    // Hacer talks about the others; Selin about her father; everyone else about whoever comes up.
    if (speaker.id === 'hacer') ctx.topics = ['osman', 'riza', 'halil'].filter((id) => id !== listener.id);
    else if (speaker.id === 'selin') ctx.topics = ['halil'];
    return ctx;
  };

  return {
    state,
    calendar: townCalendar,
    now: () => state.now,
    queue,
    shortfall,
    affordancesFor,
    perceptsFor,
    resolve,
    scarcityFor: shortfall,
    onDay,
    converse,
  };
}
