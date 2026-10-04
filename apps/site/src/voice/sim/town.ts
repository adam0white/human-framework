/**
 * SCOPE: a small Anatolian town in Ramadan, the headless reference world for Game 2 ("The Day You Say Nothing").
 * Six places (home, mosque, tea house, workshop, market, clinic) and five people, each a full `Person`: Halil, a
 * widowed repairman of 61 with hypertension, a cigarette habit and a month of rent owed; Selin, his daughter in
 * the city, reachable by phone; Rıza, his friend at the tea house; Hacer, the neighbour who talks about people;
 * Osman, the landlord. Days carry per-day prayer times from a drifting calendar, the Ramadan fast and its meals,
 * dawn hooks (exemptions, prayer-time retiming, make-up scheduling), a money ledger that feeds scarcity, and
 * conversations through the driver's convention (testimony, gossip, standing advice). Outcomes use the town's
 * own seeded RNG. Travel is not modelled: every option is offered to whoever may take it, with duration standing
 * in for distance. This is a fixture for exercising the framework end to end, not a model of any town. It lived in
 * packages/human/src/scenarios until the 2026-10-04 review moved it here: it is game content, and it uses only the
 * framework's public API.
 *
 * Selin's own day happens off the map (place 'city'); she is in the community so that calls run `converse` both
 * ways and her advice reaches Halil as a standing voice.
 */
import {
  type Activity,
  type Affordance,
  applyExemptions,
  believe,
  type ConverseContext,
  calendarRetimer,
  chance,
  createPerson,
  createRng,
  dayOf,
  eidPrayer,
  eidWindow,
  heldNorms,
  type Lexicon,
  MINUTES_PER_DAY,
  MINUTES_PER_YEAR,
  type Minute,
  minuteOfDay,
  type Outcome,
  owedMakeUps,
  type Percept,
  type Person,
  type PersonId,
  type PersonSpec,
  type PrayerCalendar,
  prayerWindows,
  RAMADAN_DEFAULTS,
  type RngState,
  ramadanFast,
  ramadanMeals,
  readBody,
  remember,
  retimeCommitments,
  scheduleMakeUp,
  sicken,
  successChance,
  type Unit,
  type World,
} from '@human/framework';

export const TOWN_DEFAULTS = {
  /** Clock at creation (minute of day 0). */
  start: 7 * 60,
  /** First day of Ramadan and its length; day 0 is an ordinary day. */
  ramadanFirstDay: 1,
  ramadanDays: 30,
  /**
   * Monthly rent, the day the next month falls due (recurring every `rentEvery` days; override with
   * `TownOptions.rentDueDay`) and what a repair shift pays.
   */
  rent: 300,
  rentDueDay: 40,
  rentEvery: 30,
  /**
   * What the morning repair block pays. Tuned (fix pass 2, 2026-10-03) so that a month of mornings alone does not
   * reach Osman's 300 by Ramadan 15 (40 + 16 × 15 = 280): his date needs an afternoon shift or two, which he
   * rarely takes on his own in the fast. Engineering default.
   */
  wage: 16,
  /**
   * The optional afternoon shift: offered from `extraFrom` minutes after Dhuhr until `extraLast` minutes before
   * Asr, once a day, never on Eid. Longer work in the fast's afternoon costs thirst and rest (engineering default).
   */
  extraWage: 16,
  extraMinutes: 90,
  extraFrom: 15,
  extraLast: 90,
  /** Halil starts owing this many months (600 at Ramadan 1). */
  monthsOwed: 2,
  /** Osman's date: one payment of `rent` promised from this day 09:00 to `rentPromiseDay` 20:00. */
  rentPromiseFrom: 1,
  rentPromiseDay: 15,
  /** Osman calls on Halil about the rent from this day, at most once every `collectEvery` days. */
  collectFrom: 10,
  collectEvery: 4,
  /** After Osman's date with nothing paid, his demand carries this advice strength (before it, 0.6). */
  collectStrengthLate: 0.8,
  startingMoney: { halil: 40, selin: 400, riza: 120, hacer: 90, osman: 900 } as Record<PersonId, number>,
  /** What a clinic visit costs, and how many days pass before the clinic is worth another visit. */
  clinicFee: 10,
  clinicCooldownDays: 7,
  /** Longest sleep offered in the daytime (a nap). */
  napMinutes: 90,
  /** Hours (minute of day) when the town is up and about. */
  dayFrom: 6 * 60,
  dayTo: 23 * 60,
  /** Halil's chronic condition at the start (below the exemption threshold on purpose). */
  hypertension: 0.2,
  /** Halil's mid-morning cigarette: cue hour, strength and craving susceptibility. */
  smokeHabit: { hour: 10, strength: 0.7, craving: 0.6 },
  /** His cigarette after a meal (forty years of it): strength and craving. In Ramadan iftar is its only cue. */
  mealSmokeHabit: { strength: 0.55, craving: 0.5 },
  /** The doctor's walk: minutes, and the minutes of day it is offered (in Ramadan from Maghrib). */
  walkMinutes: 30,
  walkFrom: 8 * 60,
  walkTo: 22 * 60 + 30,
  /** Nuran died this many days before the game's start. */
  nuranDiedDaysBefore: 98,
  /** Minutes: the walk to the mosque and back plus the prayer, and a prayer at home. */
  mosqueMinutes: 35,
  homePrayerMinutes: 15,
  /**
   * The weeks after the funeral at the mosque, as a learned expectation of how praying there feels to Halil
   * (engineering default: samples and valence chosen so home wins most days and the mosque stays reachable).
   */
  mosqueExpectation: { samples: 4, valence: -0.6 },
  /**
   * The clinic is where Nuran's illness was found, and going there again is heavy for him (engineering default,
   * the same lever as the mosque): Selin's word alone rarely gets him there; a second voice can, and a visit that
   * goes well softens it.
   */
  clinicExpectation: { samples: 6, valence: -0.9 },
  /**
   * Calling Selin since the funeral: the calls end with her crying and him with nothing to say (engineering
   * default). He waits for her to call; calls that go well soften it.
   */
  selinCallExpectation: { samples: 4, valence: -0.6 },
  /** Selin calls her father only when they have not spoken for this many minutes. */
  selinCallGap: 30 * 60,
  /** Halil places at most one call an evening: none within this many minutes of the last. */
  halilCallGap: 12 * 60,
  /** On Eid and after, his calls open at this minute of day (in Ramadan, after 18:00). */
  eidCallFrom: 10 * 60,
  /**
   * On Eid and after, Selin calls from this minute of day: the morning of Eid is hers with her own family, so
   * whether he calls her first is his to do (fix pass 2026-10-03: her 10:00 call had made every Eid the same).
   */
  selinEidCallFrom: 18 * 60,
  /**
   * On Eid Selin waits this long past the hour he usually calls her (the mean of his last calls), up to
   * `selinEidCallLatest`, so whether he calls first is decided by him and not by her clock (game design review
   * 2026-10-03: at 18:00 she always beat his 20:30 habit).
   */
  selinEidWait: 30,
  selinEidCallLatest: 21 * 60,
  /** His last calls remembered for that hour. */
  halilCallTimesKept: 7,
  /** On Eid, tea with Rıza and the grave from this minute of day. */
  eidMorningFrom: 9 * 60,
  /** Missed prayers offered for make-up per day, and how much that quiet commitment weighs (engineering defaults). */
  qadaPerDay: 2,
  qadaImportance: 0.3,
};

/** The day of Eid al-Fitr: the day after the last fast (day 31 with 30 fasts from day 1). */
export const TOWN_EID_DAY = TOWN_DEFAULTS.ramadanFirstDay + TOWN_DEFAULTS.ramadanDays;

export interface TownDay {
  kind: 'before' | 'ramadan' | 'eid' | 'after';
  /** Day of Ramadan (1..30), 1 on Eid, the day of Shawwal after it (Eid is Shawwal 1), or days before Ramadan. */
  n: number;
  label: string;
}

/** Where a town day falls in the month: "Ramadan n", "Eid al-Fitr", "Shawwal n". */
export function townDay(day: number, opts: { ramadanFirstDay?: number; ramadanDays?: number } = {}): TownDay {
  const first = opts.ramadanFirstDay ?? TOWN_DEFAULTS.ramadanFirstDay;
  const eid = first + (opts.ramadanDays ?? TOWN_DEFAULTS.ramadanDays);
  if (day < first) return { kind: 'before', n: first - day, label: `${first - day} days before Ramadan` };
  if (day < eid) return { kind: 'ramadan', n: day - first + 1, label: `Ramadan ${day - first + 1}` };
  if (day === eid) return { kind: 'eid', n: 1, label: 'Eid al-Fitr' };
  return { kind: 'after', n: day - eid + 1, label: `Shawwal ${day - eid + 1}` };
}

/**
 * The town's standard opening, shared by its tests and by Game 2: created on the evening before Ramadan (day 0,
 * 22:00) and run unseen to Ramadan 1, 03:40, so that Halil is asleep about twenty minutes before the suhoor drummer.
 */
export const TOWN_GAME_CREATE = MINUTES_PER_DAY - 120;
export const TOWN_GAME_START = MINUTES_PER_DAY + 220;

/**
 * The minute of day from which Selin calls her father on Eid if they have not spoken: past the hour he usually
 * calls her (the mean of his last calls, `TownState.halilCallTimes`) by `selinEidWait`, between `selinEidCallFrom`
 * and `selinEidCallLatest`.
 */
export function selinEidCallMinute(state: Pick<TownState, 'halilCallTimes'>): number {
  const T = TOWN_DEFAULTS;
  const times = state.halilCallTimes ?? [];
  const usual = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  return Math.min(T.selinEidCallLatest, Math.max(T.selinEidCallFrom, Math.round(usual) + T.selinEidWait));
}

/** Each person's house (Selin lives in the city). */
export const homeOf = (id: PersonId): string => (id === 'selin' ? 'city' : `${id}-home`);

/**
 * Per-day prayer times for a spring Ramadan in Anatolia: fajr and sunrise a minute earlier and maghrib/isha a minute
 * later each day from the defaults. The drift is an engineering stand-in for a real calendar, not an astronomical
 * one. Following research/decisions.md, Fajr ends at `sunrise`; `asr` stands for the one-shadow-length time and
 * `isha` for the end of the red twilight (90 minutes after sunset). The numbers are fictional, not computed.
 */
export const townCalendar: PrayerCalendar = (day) => ({
  fajr: 300 - day,
  sunrise: 390 - day,
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
  /** Day of Halil's last afternoon shift (optional; absent in states from before it existed). */
  lastExtra?: Record<PersonId, number>;
  /** Rent Halil has paid Osman in total. */
  rentPaid: number;
  /** Day Osman last called on Halil about the rent. */
  lastCollect?: number;
  /** Minute the last call between Halil and Selin ended, and who placed it. */
  lastCall?: { at: Minute; by: PersonId };
  /** Minute of day of Halil's last few own calls to Selin (optional; absent in states from before it existed). */
  halilCallTimes?: number[];
  /** What the doctor last told each person, and when (optional; absent in states from before it existed). */
  doctorSaid?: Record<PersonId, { at: Minute; text: string }>;
  /** Day of each person's last completed walk (optional; absent in states from before it existed). */
  lastWalk?: Record<PersonId, number>;
  /** Minute each person last finished a meal (optional; absent in states from before it existed). */
  lastAte?: Record<PersonId, Minute>;
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
  /**
   * The Eid prayer at the mosque on Eid morning (default true since engine 1.7.0, research/decisions.md): offered
   * from `eidWindow` (20 minutes after sunrise until the zenith before Dhuhr), congregational, linked to the
   * recommended `eid-prayer` norm (research/eid-and-mourning-sources.md §1), and a quiet commitment for those who
   * keep the daily prayers. No individual make-up. Pass false to leave it out.
   */
  eidPrayer?: boolean;
  /** First day the next month's rent falls due (default `TOWN_DEFAULTS.rentDueDay`). */
  rentDueDay?: number;
  /** Resume over this existing state (a deep clone of another town's `state`); `seed` is then ignored. */
  state?: TownState;
}

const HALIL_LEXICON: Lexicon = {
  locale: 'en',
  names: {
    halil: 'Halil',
    selin: 'Selin',
    riza: 'Rıza',
    hacer: 'Hacer',
    osman: 'Osman',
    nuran: 'Nuran',
    doctor: 'the doctor',
    you: 'you',
  },
  roles: {
    wife: 'wife',
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
    'pray-home': { base: 'pray at home', past: 'prayed at home', gerund: 'praying at home' },
    'pray-qada': {
      base: 'make up a missed prayer',
      past: 'made up a missed prayer',
      gerund: 'making up a missed prayer',
    },
    'pray-eid': {
      base: 'join the Eid prayer',
      past: 'joined the Eid prayer',
      gerund: 'joining the Eid prayer',
    },
    'visit-grave': {
      base: "visit Nuran's grave",
      past: "visited Nuran's grave",
      gerund: "visiting Nuran's grave",
    },
    rest: { base: 'rest', past: 'rested', gerund: 'resting' },
  },
  lines: {
    // Meal appointments are kept "for suhoor" and "to break the fast", not "to keep my word" (narrate: label lines).
    'intention.label:suhoor': ['for suhoor'],
    'intention.label:iftar': ['to break the fast'],
    // His one abstention is the fast (day cards: "He kept the fast", not "1 of 1 abstentions").
    'kind:abstain': ['the fast'],
    'kinds:abstain': ['fasts'],
  },
};

const ties = (pairs: [PersonId, string][]): NonNullable<PersonSpec['relationships']> =>
  pairs.map(([otherId, role]) => ({
    otherId,
    roles: [role],
    familiarity: 0.7,
    // Friends are warmer than neighbours and landlords, so tea with a friend competes with staying home.
    // Family is warmer still (Halil and Selin, father and daughter).
    affection: role === 'child' || role === 'parent' ? 0.4 : role === 'friend' ? 0.5 : 0.3,
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
  const eidDay = first + days;
  const eidWindowAt = eidWindow(eidDay, townCalendar);
  const worship = (practice: number): NonNullable<PersonSpec['commitments']> =>
    practice >= 0.5
      ? [
          ...prayerWindows(day, townCalendar).map((c, i) =>
            // A window already closed at creation starts tomorrow: it was not missed, it had not begun for him yet
            // (game design review 2026-10-03: "ashamed (a prayer missed)" on the first screen).
            c.until <= now
              ? { ...c, from: c.from + MINUTES_PER_DAY, until: c.until + MINUTES_PER_DAY, id: `prayer${i}` }
              : { ...c, id: `prayer${i}` },
          ),
          ...(opts.eidPrayer !== false && eidWindowAt.until > now
            ? [{ ...eidPrayer(eidWindowAt), id: 'eid-prayer' }]
            : []),
        ]
      : [];
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
      relationships: [
        ...ties([
          ['selin', 'child'],
          ['riza', 'friend'],
          ['hacer', 'neighbor'],
          ['osman', 'landlord'],
        ]),
        // Nuran, his wife of 35 years, died fourteen weeks before the first night of Ramadan.
        {
          otherId: 'nuran',
          roles: ['wife', 'deceased'],
          familiarity: 1,
          affection: 0.9,
          trust: 0.9,
          deceasedAt: now - T.nuranDiedDaysBefore * MINUTES_PER_DAY,
        },
      ],
      voices: [
        { voiceId: player, trust: 0.5 },
        { voiceId: 'selin', trust: 0.75 },
        { voiceId: 'riza', trust: 0.6 },
        { voiceId: 'hacer', trust: 0.3 },
        { voiceId: 'osman', trust: 0.35 },
      ],
      commitments: [
        ...worship(halilPractice),
        // 'tea' is drinking. 'smoke' breaks the fast as Halil understands it: Diyanet's Board and Hanafi fatwa sites
        // hold that smoking breaks the fast and the day is made up (research/fasting-sources.md §1; the framework
        // default per research/decisions.md). Expiation (kaffara) is disputed and not modelled.
        ...fast(['eat', 'drink', 'tea', 'smoke']),
        job('job', 'work-repair', 8 * 60, 12 * 60, 0.7),
        // Osman's date: 300 of the 600 owed by Ramadan 15, 20:00. One payment, no recurrence inside the game.
        {
          id: 'rent',
          kind: 'promise',
          label: 'rent',
          actions: ['pay-rent'],
          toId: 'osman',
          from: T.rentPromiseFrom * MINUTES_PER_DAY + 9 * 60,
          until: T.rentPromiseDay * MINUTES_PER_DAY + 20 * 60,
          importance: 0.8,
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
  // And the cigarette after a meal (with Nuran's tea, for years). In Ramadan only iftar and suhoor can cue it.
  people.halil.habits.push({
    cue: { after: 'eat' },
    action: 'smoke',
    strength: T.mealSmokeHabit.strength,
    repetitions: 400,
    lastAt: now - MINUTES_PER_DAY,
    craving: T.mealSmokeHabit.craving,
  });
  seedGrief(people.halil, now);
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

/**
 * Halil's memories of Nuran (W3) and the weeks after the funeral at the mosque (W4). Engineering defaults: the
 * episodes are what the story needs to be recallable, and the mosque expectation is the lever that makes praying
 * there heavy for him (recall runs after a choice, so the mosque episode alone would not move it).
 */
function seedGrief(halil: Person, now: Minute): void {
  const T = TOWN_DEFAULTS;
  const died = now - T.nuranDiedDaysBefore * MINUTES_PER_DAY;
  const dayStart = (m: Minute) => Math.floor(m / MINUTES_PER_DAY) * MINUTES_PER_DAY;
  const lastRamadan = dayStart(now) - 354 * MINUTES_PER_DAY;
  // Not 'outcome' episodes tagged 'completed': those are read as his last action (the habit cue).
  const base = { kind: 'witnessed', actorId: 'halil', targetId: 'nuran' } as const;
  remember(halil, {
    ...base,
    at: dayStart(died) + MINUTES_PER_DAY + 14 * 60,
    action: 'funeral',
    placeId: 'cemetery',
    valence: -0.9,
    salience: 0.9,
    summary: "Nuran's funeral",
    tags: ['death', 'funeral', 'grave'],
  });
  // The two home memories carry no place: every activity at home would cue them (place alone crosses the recall
  // threshold), so only eating and the cigarette bring them back.
  remember(halil, {
    ...base,
    at: lastRamadan + 19 * 60,
    action: 'eat',
    valence: 0.5,
    salience: 0.5,
    summary: 'iftar with Nuran at our table, last Ramadan',
    tags: ['food'],
  });
  remember(halil, {
    ...base,
    at: lastRamadan + 20 * 60,
    action: 'smoke',
    valence: 0.4,
    salience: 0.4,
    summary: 'her tea and my cigarette after iftar',
    tags: ['leisure'],
  });
  // Not action 'pray': a prayer at home must not bring the mosque back; being at the mosque does.
  remember(halil, {
    ...base,
    kind: 'social',
    at: dayStart(died) + 2 * MINUTES_PER_DAY + 13 * 60,
    action: 'condolences',
    placeId: 'mosque',
    valence: -0.5,
    salience: 0.7,
    summary: 'condolences at the mosque after the funeral',
    tags: ['loss'],
  });
  remember(halil, {
    ...base,
    at: dayStart(died) - 40 * MINUTES_PER_DAY + 11 * 60,
    action: 'see-doctor',
    placeId: 'clinic',
    valence: -0.7,
    salience: 0.6,
    summary: 'the clinic, the day they found her illness',
    tags: ['loss'],
  });
  halil.memory.expectations.push({
    key: 'see-doctor',
    needs: { safety: 0.2 },
    successRate: 0.9,
    samples: T.clinicExpectation.samples,
    valence: T.clinicExpectation.valence,
  });
  halil.memory.expectations.push({
    key: 'call@selin',
    needs: { belonging: 0.3, leisure: 0.15 },
    successRate: 0.9,
    samples: T.selinCallExpectation.samples,
    valence: T.selinCallExpectation.valence,
  });
  halil.memory.expectations.push({
    key: 'pray@mosque',
    needs: { meaning: 0.1, belonging: 0 },
    successRate: 0.9,
    samples: T.mosqueExpectation.samples,
    valence: T.mosqueExpectation.valence,
  });
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
  const state: TownState = opts.state ?? {
    now: Math.min(...people.map((p) => p.now)),
    rng: createRng(opts.seed),
    money: {},
    rentOwed: T.rent * T.monthsOwed,
    queued: {},
    completed: {},
    days: {},
    lastClinic: {},
    lastWorked: {},
    rentPaid: 0,
  };
  if (!opts.state) for (const p of people) state.money[p.id] = T.startingMoney[p.id] ?? 100;
  const eidDay = first + days;
  const rentDueDay = opts.rentDueDay ?? T.rentDueDay;
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
    // Missed prayers (qada, research/decisions.md) are offered quietly the same day, between Dhuhr and Asr: a window
    // with no disliked time in it (agenda/prayer.ts `makruhWindows`), at most `qadaPerDay` a day, at low importance.
    // A make-up left undone carries no blame and is offered again on a later day (agenda SCOPE, missed duties).
    let k = 0;
    let qada = 0;
    for (const owed of owedMakeUps(p)) {
      if (owed.kind === 'worship') {
        if (qada >= T.qadaPerDay) continue;
        qada++;
        const t = townCalendar(day);
        scheduleMakeUp(
          p,
          owed.ofId,
          { from: day * MINUTES_PER_DAY + t.dhuhr + 15, until: day * MINUTES_PER_DAY + t.asr - 15 },
          { importance: T.qadaImportance, actions: ['pray-qada'] },
        );
        continue;
      }
      const d = first + days + 1 + k++;
      const t = townCalendar(d);
      scheduleMakeUp(p, owed.ofId, {
        from: d * MINUTES_PER_DAY + t.fajr,
        until: d * MINUTES_PER_DAY + t.maghrib,
      });
    }
    if (p.id === 'halil' && day >= rentDueDay && (day - rentDueDay) % T.rentEvery === 0)
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
    const home = homeOf(p.id);
    const day = dayOf(now);
    const mod = minuteOfDay(now);
    const eid = day === eidDay;
    // In Ramadan the night's sleep ends when the drummer comes round for suhoor, and a working day starts
    // when the job does (the alarm is the host's; the choice to get up is the person's).
    const alarm = Math.min(untilSuhoor(now, 480) ?? 480, untilJob(p.id, now, 480) ?? 480);
    // By day sleep is a nap (findings 2026-10-03: an 8-hour sleep from 11:30 read as a sim artefact).
    const sleepFor = daytime
      ? Math.min(T.napMinutes, Math.max(30, alarm))
      : Math.max(60, Math.min(480, alarm));
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
      p.id === 'selin'
        ? {
            id: 'pray',
            action: 'pray',
            label: 'pray at home',
            placeId: home,
            duration: 20,
            effort: 0.1,
            focus: 0.3,
            advertises: { meaning: 0.1 },
            norms: [{ normId: 'salah', relation: 'fulfills' }],
            tags: ['worship'],
          }
        : {
            // The walk there and back is in the duration. `targetId` keys Halil's learned expectation of the mosque
            // apart from prayer at home (expectations are per action and per action@target).
            id: 'pray',
            action: 'pray',
            label: 'pray at the mosque',
            placeId: 'mosque',
            targetId: 'mosque',
            duration: T.mosqueMinutes,
            effort: 0.15,
            focus: 0.3,
            advertises: { meaning: 0.1, belonging: 0.1 },
            norms: [{ normId: 'salah', relation: 'fulfills' }],
            tags: ['worship'],
          },
      { id: 'wait', action: 'wait', label: 'wait', duration: 15, effort: 0, advertises: {} },
    ];
    if (p.id === 'halil')
      out.push({
        id: 'pray-home',
        action: 'pray',
        label: 'pray at home',
        placeId: home,
        duration: T.homePrayerMinutes,
        effort: 0.1,
        focus: 0.3,
        advertises: { meaning: 0.1 },
        norms: [{ normId: 'salah', relation: 'fulfills' }],
        tags: ['worship'],
      });
    // A make-up prayer scheduled for now (see `onDay`): quiet, at home, no norm term of its own (the make-up
    // commitment's low importance is its whole pull).
    if (
      p.agenda.commitments.some(
        (c) => c.status === 'pending' && c.actions.includes('pray-qada') && now >= c.from && now < c.until,
      )
    )
      out.push({
        id: 'pray-qada',
        action: 'pray-qada',
        label: 'make up a missed prayer',
        placeId: home,
        duration: 15,
        effort: 0.1,
        focus: 0.3,
        advertises: { meaning: 0.05 },
        tags: ['worship'],
      });
    if (!daytime) return out;
    const calls = eid || day > eidDay ? mod >= T.eidCallFrom : mod >= 18 * 60;
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
        // The workshop is shut on Eid: a town custom (engineering assumption, no norm attached).
        if (!eid && mod >= 8 * 60 && mod < 12 * 60 && state.lastWorked[p.id] !== dayOf(now))
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
        // The afternoon shift: optional extra pay between Dhuhr and Asr, once a day, not on Eid.
        {
          const cal = townCalendar(day);
          if (
            !eid &&
            mod >= cal.dhuhr + T.extraFrom &&
            mod <= cal.asr - T.extraLast &&
            state.lastExtra?.[p.id] !== day
          )
            out.push({
              id: 'work-extra',
              action: 'work-repair',
              label: 'take an afternoon shift',
              placeId: 'workshop',
              duration: T.extraMinutes,
              effort: 0.6,
              focus: 0.4,
              skill: { id: 'repair', difficulty: 0.35 },
              // No `material`: he does not reckon on the afternoon pay (he believes the mornings will cover
              // Osman), so on his own he rarely takes it. The pay is real when he works it (see `resolve`).
              advertises: { competence: 0.1 },
              tags: ['work'],
            });
        }
        if (!eid || mod >= T.eidMorningFrom) talk('riza', 'teahouse', 'tea', 'tea with Rıza');
        talk('hacer', 'halil-home', 'talk', 'talk with Hacer at the door');
        // One call an evening at most from his side.
        if (calls && (state.lastCall === undefined || now - state.lastCall.at >= T.halilCallGap)) {
          talk('selin', 'halil-home', 'call', 'call Selin');
          // Keyed to Selin, so his learned expectation of calling her is apart from any other call.
          const call = out.at(-1);
          if (call?.id === 'call:selin') call.targetId = 'selin';
        }
        // Nuran's grave: after Asr on any day, and from the morning on Eid.
        // The Eid prayer (on unless `eidPrayer: false`): congregational at the mosque over `eidWindow`, linked to the
        // recommended 'eid-prayer' norm (research/eid-and-mourning-sources.md §1). A quiet option, not a goal.
        if (opts.eidPrayer !== false && eid) {
          const w = eidWindow(day, townCalendar);
          if (now >= w.from && now < w.until)
            out.push({
              id: 'pray-eid',
              action: 'pray-eid',
              label: 'join the Eid prayer at the mosque',
              placeId: 'mosque',
              targetId: 'mosque',
              duration: 60,
              effort: 0.15,
              advertises: { meaning: 0.15, belonging: 0.3 },
              norms: [{ normId: 'eid-prayer', relation: 'fulfills' }],
              tags: ['worship', 'social'],
            });
        }
        if (mod >= townCalendar(day).asr || (eid && mod >= T.eidMorningFrom))
          out.push({
            id: 'visit-grave',
            action: 'visit-grave',
            label: "visit Nuran's grave",
            placeId: 'cemetery',
            targetId: 'nuran',
            duration: 45,
            effort: 0.25,
            advertises: { meaning: 0.15, belonging: 0.1 },
            tags: ['grave'],
          });
        out.push({
          id: 'smoke',
          action: 'smoke',
          label: 'smoke a cigarette',
          // No place: he smokes where he is. With a place, every cigarette after a meal at home built a habit keyed
          // to the tea house, which never pulls at home, and the seeded after-meal habit was never reinforced, so
          // neither a cigarette nor a walk instead could move it (round 5 finding).
          duration: 10,
          effort: 0.02,
          advertises: { rest: 0.1, leisure: 0.1 },
          tags: ['leisure'],
        });
        // The doctor's walk (Game 2 round 5): once she has told him to walk, a walk by the river is his to take, once
        // a day, in Ramadan after iftar and in the daytime after it. Before the clinic it is not
        // something he does. Engineering default. A walk completed where a cigarette is cued (after a meal, at its
        // hour) withholds that habit (habits SCOPE: extinction by withholding), so it is how a voice can wear the
        // forty-year habit down, slowly; nothing else about smoking changes.
        if (state.doctorSaid?.[p.id] && state.lastWalk?.[p.id] !== day) {
          const ramadanDay = townDay(day).kind === 'ramadan';
          const maghrib = townCalendar(day).maghrib;
          // In Ramadan, once he has broken the fast and not in the middle of a meal (a voice must not walk him out of
          // his iftar): the walk then comes where the after-meal cigarette would.
          const open = ramadanDay
            ? mod >= maghrib &&
              (state.lastAte?.[p.id] ?? Number.NEGATIVE_INFINITY) >= day * MINUTES_PER_DAY + maghrib &&
              p.activity?.action !== 'eat'
            : mod >= T.walkFrom;
          if (open && mod < T.walkTo)
            out.push({
              id: 'walk',
              action: 'walk',
              label: 'walk by the river',
              placeId: 'market',
              duration: T.walkMinutes,
              effort: 0.3,
              advertises: { leisure: 0.15, safety: 0.05 },
              tags: ['leisure', 'outdoors', 'health'],
            });
        }
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
        // She calls when they have not spoken for a day and a half, so some evenings are his to call. On Eid she
        // calls if they have not spoken that day, after the hour he usually calls has passed.
        if (eid) {
          const from = selinEidCallMinute(state);
          const spokeToday = state.lastCall !== undefined && dayOf(state.lastCall.at) === day;
          if (mod >= from && !spokeToday) talk('halil', 'city', 'call', 'call father');
        } else {
          const herCalls = day > eidDay ? mod >= T.selinEidCallFrom : calls;
          if (herCalls && (state.lastCall === undefined || now - state.lastCall.at >= T.selinCallGap))
            talk('halil', 'city', 'call', 'call father');
        }
        break;
      }
      case 'riza': {
        talk('halil', 'teahouse', 'tea', 'tea with Halil');
        talk('hacer', 'hacer-home', 'talk', 'talk with Hacer');
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
        talk('halil', 'halil-home', 'talk', 'talk with Halil');
        talk('riza', 'riza-home', 'talk', 'talk with Rıza');
        talk('osman', 'market', 'talk', 'talk with Osman at the market');
        out.push({
          id: 'housework',
          action: 'housework',
          label: 'housework',
          placeId: home,
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
        if (
          state.rentOwed > 0 &&
          has('halil') &&
          day >= T.collectFrom &&
          (state.lastCollect === undefined ||
            day - state.lastCollect >= T.collectEvery ||
            // On his date with nothing paid, Osman comes whatever the interval.
            (day === T.rentPromiseDay && state.rentPaid === 0 && state.lastCollect !== day))
        )
          out.push({
            id: 'collect-rent',
            action: 'collect-rent',
            label: 'call on Halil about the rent',
            placeId: 'halil-home',
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
      const pay = aff.material ?? (act.affordanceId === 'work-extra' ? T.extraWage : undefined);
      if (pay !== undefined && progress > 0) {
        out.material = pay * progress;
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
        state.lastAte ??= {};
        state.lastAte[p.id] = now;
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
        return done({
          ...base,
          needs: aff.placeId === 'mosque' ? { meaning: 0.1, belonging: 0.1 } : { meaning: 0.1 },
          summary: aff.placeId === 'mosque' ? 'prayed at the mosque' : 'prayed at home',
        });
      case 'pray-qada':
        return done({ ...base, needs: { meaning: 0.05 }, summary: 'made up a missed prayer' });
      case 'pray-eid':
        return done({ ...base, needs: { meaning: 0.15, belonging: 0.3 }, summary: 'joined the Eid prayer' });
      case 'visit-grave':
        return done({ ...base, needs: { meaning: 0.15 }, summary: "visited Nuran's grave" });
      case 'walk':
        state.lastWalk ??= {};
        state.lastWalk[p.id] = dayOf(now);
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
        if (act.affordanceId === 'work-extra') {
          state.lastExtra ??= {};
          state.lastExtra[p.id] = dayOf(p.now);
        } else state.lastWorked[p.id] = dayOf(p.now);
        const ok = chance(state.rng, successChance(p, skillId, aff.skill?.difficulty ?? 0.3, capacity));
        const pay = aff.material ?? (act.affordanceId === 'work-extra' ? T.extraWage : 0);
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
        // Selin sees the clinic slip he sends her, so she stops asking. Told testimony was not enough: her own
        // concern is held as observation, which discounts contradicting testimony (findings 2026-10-03).
        if (has('selin'))
          queue('selin', {
            at: now,
            channel: 'saw',
            kind: 'news',
            actorId: p.id,
            targetId: p.id,
            placeId: 'city',
            valence: 0.3,
            salience: 0.6,
            claims: [{ prop: `${p.id}:should:see-doctor`, value: false, confidence: 0.95 }],
            summary: `${p.name} sent a photo of the clinic slip`,
          });
        state.doctorSaid ??= {};
        state.doctorSaid[p.id] = { at: now, text: percepts[0]?.summary ?? 'the doctor found nothing new' };
        return done({ ...base, needs: { safety: 0.2 }, percepts, summary: 'saw the doctor' });
      }
      case 'pay-rent': {
        const paid = Math.min(T.rent, state.rentOwed, state.money[p.id] ?? 0);
        state.money[p.id] = (state.money[p.id] ?? 0) - paid;
        state.rentOwed -= paid;
        state.rentPaid += paid;
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
        state.lastCollect = dayOf(now);
        const late = dayOf(now) > T.rentPromiseDay && state.rentPaid === 0;
        if (has('halil'))
          queue('halil', {
            at: now,
            channel: 'told',
            kind: 'demand',
            actorId: p.id,
            targetId: 'halil',
            placeId: 'halil-home',
            valence: -0.3,
            salience: 0.7,
            claims: [{ prop: 'halil:owes:osman', value: true, confidence: 0.95 }],
            advice: [{ action: 'pay-rent', strength: late ? T.collectStrengthLate : 0.6 }],
            summary: `${p.name} came about the rent`,
          });
        return done({ ...base, needs: { esteem: 0.05 }, summary: 'called on Halil about the rent' });
      }
      case 'call':
        if (
          (p.id === 'halil' && aff.with?.includes('selin')) ||
          (p.id === 'selin' && aff.with?.includes('halil'))
        ) {
          state.lastCall = { at: now, by: p.id };
          if (p.id === 'halil') {
            const kept = [...(state.halilCallTimes ?? []), minuteOfDay(act.startedAt)];
            state.halilCallTimes = kept.slice(-T.halilCallTimesKept);
          }
        }
        return done({ ...base, needs: { belonging: 0.3, leisure: 0.15 }, summary: aff.label });
      case 'tea':
      case 'talk':
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
