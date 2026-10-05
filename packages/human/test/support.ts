/**
 * Shared test fixtures: plain affordances, suggestion builders, the Maghrib window, a devout adult with a Maghrib
 * promise, and a full cast-literal person for module-level tests. Changing a value here changes every test that
 * imports it, so keep each fixture exactly as the tests that share it need it.
 */

import { createRng } from '../src/core/index.ts';
import type { Community, Village } from '../src/index.ts';
import {
  createCommunity,
  createPerson,
  createVillage,
  prayerWindows,
  promise,
  villagerSpec,
  WILL_DEFAULTS,
} from '../src/index.ts';
import type {
  Affordance,
  NeedReservoirs,
  Person,
  PersonSpec,
  Suggestion,
  Traits,
  Values,
} from '../src/types.ts';
import { ENGINE_VERSION, MINUTES_PER_DAY, PERSON_SCHEMA } from '../src/types.ts';

/** `bornAt` of a 30-year-old at minute 0 (365-day years). */
export const ADULT = -30 * 365 * MINUTES_PER_DAY;
export const NOON = 12 * 60;

/** A plain affordance: one hour, effort 0.2, advertising nothing unless `over` says so. */
export const aff = (id: string, over: Partial<Affordance> = {}): Affordance => ({
  id,
  action: id,
  label: id,
  duration: 60,
  effort: 0.2,
  advertises: {},
  ...over,
});
export const REST = aff('rest', { advertises: { rest: 0.2 }, effort: 0, tags: ['rest'] });
export const WORK = aff('work', {
  advertises: { esteem: 0.15, competence: 0.1 },
  duration: 120,
  tags: ['work'],
});
export const PRAY = aff('pray', {
  duration: 15,
  effort: 0.05,
  tags: ['worship'],
  norms: [{ normId: 'salah', relation: 'fulfills' }],
});

/** The player insists on `action`. */
export const insist = (action: string): Suggestion => ({
  voiceId: 'player',
  action,
  strength: 1,
  insist: true,
});
/** The player asks for `action` at strength 0.6. */
export const ask = (action: string, extra: Partial<Suggestion> = {}): Suggestion => ({
  voiceId: 'player',
  action,
  strength: 0.6,
  ...extra,
});

const windows = prayerWindows(0);
const maghrib = windows[3];
if (!maghrib) throw new Error('no Maghrib window');
/** Day 0's Maghrib window. */
export const MAGHRIB = maghrib;
/** The minute from which the omission rule counts the window as nearly gone. */
export const STRETCH = Math.ceil(
  MAGHRIB.from + WILL_DEFAULTS.omissionFraction * (MAGHRIB.until - MAGHRIB.from),
);

/** A devout adult (seed 43) who holds prayer obligatory, wants work, and has promised day 0's Maghrib. */
export function devoutMaghrib(now: number, over: Partial<PersonSpec> = {}): Person {
  const p = createPerson({
    id: 'yusuf',
    name: 'Yusuf',
    seed: 43,
    bornAt: ADULT,
    sex: 'male',
    now,
    values: { tradition: 0.9, achievement: 0.9 },
    needs: { esteem: 0.1, competence: 0.1 },
    norms: [{ normId: 'salah', standing: 'obligatory', conviction: 0.95 }],
    ...over,
  });
  promise(p, MAGHRIB);
  return p;
}

/** A complete person written out as a literal (no `createPerson`), for tests of one module's functions. */
export function fullPerson(
  over: { traits?: Partial<Traits>; values?: Partial<Values>; needs?: Partial<NeedReservoirs> } = {},
): Person {
  return {
    schema: PERSON_SCHEMA,
    engine: ENGINE_VERSION,
    id: 'p1',
    name: 'Test',
    now: 0,
    rng: createRng(1),
    life: { bornAt: -30 * 525_600, sex: 'female' },
    body: {
      satiety: 1,
      hydration: 1,
      sleepPressure: 0,
      exertion: 0,
      circadianPeak: 900,
      pain: 0,
      health: 1,
      fitness: 0.5,
      injuries: [],
      illnesses: [],
      sleepDebt: 0,
      asleep: false,
      since: 0,
      alive: true,
      nextId: 0,
    },
    needs: {
      safety: 0.8,
      belonging: 0.7,
      esteem: 0.6,
      autonomy: 0.7,
      competence: 0.6,
      leisure: 0.6,
      meaning: 0.6,
      ...over.needs,
    },
    traits: {
      honesty: 0.5,
      emotionality: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      conscientiousness: 0.5,
      openness: 0.5,
      ...over.traits,
    },
    values: {
      benevolence: 0.5,
      universalism: 0.5,
      tradition: 0.5,
      conformity: 0.5,
      security: 0.5,
      achievement: 0.5,
      power: 0.5,
      hedonism: 0.5,
      stimulation: 0.5,
      selfDirection: 0.5,
      ...over.values,
    },
    conscience: { norms: [], breaches: [], intentions: [], nextBreach: 0 },
    affect: { mood: { valence: 0, arousal: 0.3 }, emotions: [], regulation: 0.3, lastUpdated: 0 },
    skills: {},
    habits: [],
    memory: { episodes: [], beliefs: [], expectations: [], sourceTrust: {}, nextEpisode: 0 },
    social: { relationships: [] },
    agenda: { commitments: [], goals: [], nextId: 0, lastProposalDay: -1 },
    will: { voices: [], precommitments: [], switchMargin: 0.15, temperature: 0 },
    activity: null,
    trace: [],
    nextDecision: 0,
  };
}

/** Villagers `ids` (seeds 100, 101, ...) in a village (seed 7 unless given) and a community; time 07:00 unless given. */
export interface VillageSetup {
  people: Person[];
  village: Village;
  community: Community;
}

export function setupVillage(
  ids: string[],
  opts: { devout?: string[]; seed?: number; foodStock?: number; now?: number } = {},
): VillageSetup {
  const now = opts.now ?? 7 * 60;
  const people = ids.map((id, i) =>
    createPerson(
      villagerSpec(id, id, 100 + i, { devout: opts.devout?.includes(id) ?? false, others: ids, now }),
    ),
  );
  const village = createVillage(people, {
    seed: opts.seed ?? 7,
    ...(opts.foodStock !== undefined ? { foodStock: opts.foodStock } : {}),
  });
  return { people, village, community: createCommunity(people) };
}
