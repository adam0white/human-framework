/**
 * The six villagers of the Human side as framework people (spec §5 "Six villagers"): traits, values, held
 * norms, relationships, commitments, role goals and trust in the player's voice. Also the host's norm catalog
 * and the clock offset between game minutes and framework minutes.
 *
 * Clock: the framework counts minutes from 00:00 of day 0; the game's minute 0 is Day 1 05:00. Framework
 * time is therefore `fw(m) = m + START_CLOCK`, so `DEFAULT_PRAYER_TIMES` line up with the spec's prayer times.
 */
import {
  type BodyRates,
  type Commitment,
  type HeldNorm,
  heldNorms,
  MINUTES_PER_DAY,
  MINUTES_PER_YEAR,
  type NormDefinition,
  type PersonSpec,
  prayerWindows,
} from '@adam0white/human-framework';
import { type Minute, START_CLOCK, type VillagerId, type VillagerSpec } from './world-types.ts';

/** Framework minute of a game minute. */
export const fw = (m: Minute): number => m + START_CLOCK;
/** Game minute of a framework minute. */
export const gm = (t: number): Minute => t - START_CLOCK;

/**
 * Host norms for this game (spec §5 "Norm catalog"). Standings are the host's engineering choices, recorded
 * as such; they are each person's understanding, not rulings.
 */
export const HOST_NORMS: NormDefinition[] = [
  {
    id: 'aid-injured',
    label: 'Help the injured',
    standing: 'obligatory',
    sources: [{ kind: 'assumption', ref: 'Twice at the Well host norm; standing chosen by the game design' }],
  },
  {
    id: 'feed-village',
    label: 'Feed the village',
    standing: 'obligatory',
    sources: [
      {
        kind: 'assumption',
        ref: 'Twice at the Well host norm: the cook’s duty to the people who eat from her pot',
      },
    ],
  },
  {
    id: 'abandon-dependents',
    label: 'Leaving the people who depend on you unfed',
    standing: 'forbidden',
    sources: [
      {
        kind: 'assumption',
        ref: 'The sole cook leaving a pending meal unprepared is treated as forbidden by this host (docs/games/colony.md §7 M3)',
      },
    ],
  },
  {
    id: 'daily-prayer',
    label: 'Pray at one’s own hours (Christian morning and evening prayer)',
    standing: 'recommended',
    sources: [
      {
        kind: 'assumption',
        ref: 'Twice at the Well host norm for Danyal; standing chosen by the game design',
      },
    ],
  },
];

export const HOST_NORM_IDS = HOST_NORMS.map((n) => n.id);

/** Readable labels for the why panel and refusals. */
export const NORM_LABELS: Record<string, string> = {
  salah: 'prayer is due',
  'aid-injured': 'help the injured',
  'feed-village': 'feed the village',
  'abandon-dependents': 'would leave the meal undone',
  'daily-prayer': 'his own prayer',
  theft: 'theft',
  'keep-promise': 'keep my word',
  'help-neighbor': 'help a neighbour',
};

/** Host-side physical strength: carrying a grown man home needs ≥ 0.6. */
export const STRENGTH: Record<VillagerId, number> = {
  maryam: 0.2,
  yusuf: 0.9,
  tariq: 0.55,
  idris: 0.8,
  samira: 0.4,
  danyal: 0.5,
};

/** Each person's role work, which a standing goal keeps pulling them toward. */
export const ROLE_GOALS: Record<
  VillagerId,
  { label: string; advancedBy: { action: string; amount: number }[] }
> = {
  maryam: { label: 'keep everyone fed', advancedBy: [{ action: 'cook', amount: 0.12 }] },
  yusuf: {
    label: 'finish the house',
    advancedBy: [
      { action: 'build', amount: 0.12 },
      { action: 'raise-beam', amount: 0.2 },
      { action: 'shutter-house', amount: 0.2 },
    ],
  },
  tariq: {
    label: 'learn to build',
    advancedBy: [
      { action: 'build', amount: 0.12 },
      { action: 'raise-beam', amount: 0.2 },
    ],
  },
  idris: {
    label: 'keep the woodpile full',
    advancedBy: [
      { action: 'gather-timber', amount: 0.12 },
      { action: 'fell-cedar', amount: 0.12 },
    ],
  },
  samira: {
    label: 'fill the granary',
    advancedBy: [
      { action: 'gather-grain', amount: 0.12 },
      { action: 'draw-water', amount: 0.06 },
    ],
  },
  danyal: {
    label: 'keep the well',
    advancedBy: [
      { action: 'draw-water', amount: 0.12 },
      { action: 'gather-grain', amount: 0.06 },
    ],
  },
};

interface CastEntry {
  sex: 'female' | 'male';
  traits: NonNullable<PersonSpec['traits']>;
  values: NonNullable<PersonSpec['values']>;
  practice: number;
  extraNorms: HeldNorm[];
  relationships: NonNullable<PersonSpec['relationships']>;
}

const rel = (
  otherId: VillagerId,
  roles: string[],
  affection: number,
  trust = 0.6,
): NonNullable<PersonSpec['relationships']>[number] => ({
  otherId,
  roles,
  affection,
  trust,
  familiarity: 0.9,
});

const CAST: Record<VillagerId, CastEntry> = {
  maryam: {
    sex: 'female',
    traits: {
      honesty: 0.8,
      emotionality: 0.6,
      extraversion: 0.6,
      agreeableness: 0.8,
      conscientiousness: 0.8,
      openness: 0.4,
    },
    values: {
      benevolence: 0.95,
      universalism: 0.7,
      tradition: 0.9,
      conformity: 0.7,
      security: 0.6,
      achievement: 0.3,
      power: 0.2,
      hedonism: 0.2,
      stimulation: 0.15,
      selfDirection: 0.4,
    },
    practice: 0.9,
    extraNorms: [
      { normId: 'feed-village', standing: 'obligatory', conviction: 0.95 },
      { normId: 'abandon-dependents', standing: 'forbidden', conviction: 0.95 },
      { normId: 'aid-injured', standing: 'obligatory', conviction: 0.8 },
    ],
    relationships: [
      rel('yusuf', ['child'], 0.9, 0.9),
      rel('tariq', ['grandchild'], 0.9, 0.8),
      rel('danyal', ['friend'], 0.7, 0.8),
      rel('idris', ['neighbor'], 0.5),
      rel('samira', ['neighbor'], 0.6),
    ],
  },
  yusuf: {
    sex: 'male',
    traits: {
      honesty: 0.75,
      emotionality: 0.4,
      extraversion: 0.5,
      agreeableness: 0.6,
      conscientiousness: 0.85,
      openness: 0.5,
    },
    values: {
      benevolence: 0.8,
      universalism: 0.6,
      tradition: 0.85,
      conformity: 0.6,
      security: 0.6,
      achievement: 0.6,
      power: 0.3,
      hedonism: 0.3,
      stimulation: 0.3,
      selfDirection: 0.5,
    },
    practice: 0.9,
    extraNorms: [
      { normId: 'keep-promise', standing: 'obligatory', conviction: 0.9 },
      { normId: 'aid-injured', standing: 'obligatory', conviction: 0.9 },
      { normId: 'feed-village', standing: 'recommended', conviction: 0.4 },
    ],
    relationships: [
      rel('maryam', ['parent'], 0.9, 0.9),
      rel('tariq', ['child'], 0.9, 0.8),
      rel('idris', ['friend', 'neighbor'], 0.75, 0.8),
      rel('samira', ['neighbor'], 0.5),
      rel('danyal', ['neighbor'], 0.5),
    ],
  },
  tariq: {
    sex: 'male',
    traits: {
      honesty: 0.6,
      emotionality: 0.3,
      extraversion: 0.7,
      agreeableness: 0.6,
      conscientiousness: 0.5,
      openness: 0.7,
    },
    values: {
      benevolence: 0.7,
      universalism: 0.5,
      tradition: 0.75,
      conformity: 0.6,
      security: 0.4,
      achievement: 0.65,
      power: 0.3,
      hedonism: 0.5,
      stimulation: 0.7,
      selfDirection: 0.5,
    },
    practice: 0.8,
    extraNorms: [
      { normId: 'aid-injured', standing: 'obligatory', conviction: 0.6 },
      { normId: 'feed-village', standing: 'recommended', conviction: 0.3 },
    ],
    relationships: [
      rel('yusuf', ['parent'], 0.9, 0.9),
      rel('maryam', ['grandparent'], 0.9, 0.9),
      rel('idris', ['neighbor'], 0.5),
      rel('samira', ['neighbor'], 0.4),
      rel('danyal', ['neighbor'], 0.4),
    ],
  },
  idris: {
    sex: 'male',
    traits: {
      honesty: 0.6,
      emotionality: 0.15,
      extraversion: 0.5,
      agreeableness: 0.5,
      conscientiousness: 0.6,
      openness: 0.5,
    },
    values: {
      benevolence: 0.6,
      universalism: 0.5,
      tradition: 0.8,
      conformity: 0.5,
      security: 0.3,
      achievement: 0.85,
      power: 0.4,
      hedonism: 0.3,
      stimulation: 0.6,
      selfDirection: 0.6,
    },
    practice: 0.8,
    extraNorms: [
      { normId: 'aid-injured', standing: 'obligatory', conviction: 0.7 },
      { normId: 'feed-village', standing: 'recommended', conviction: 0.3 },
    ],
    relationships: [
      rel('samira', ['spouse'], 0.9, 0.9),
      rel('yusuf', ['friend', 'neighbor'], 0.75, 0.8),
      rel('maryam', ['neighbor'], 0.5),
      rel('tariq', ['neighbor'], 0.5),
      rel('danyal', ['neighbor'], 0.4),
    ],
  },
  samira: {
    sex: 'female',
    traits: {
      honesty: 0.7,
      emotionality: 0.85,
      extraversion: 0.5,
      agreeableness: 0.7,
      conscientiousness: 0.85,
      openness: 0.5,
    },
    values: {
      benevolence: 0.85,
      universalism: 0.6,
      tradition: 0.8,
      conformity: 0.6,
      security: 0.8,
      achievement: 0.4,
      power: 0.2,
      hedonism: 0.3,
      stimulation: 0.2,
      selfDirection: 0.4,
    },
    practice: 0.85,
    extraNorms: [
      { normId: 'aid-injured', standing: 'obligatory', conviction: 0.8 },
      { normId: 'feed-village', standing: 'recommended', conviction: 0.4 },
    ],
    relationships: [
      rel('idris', ['spouse'], 0.9, 0.9),
      rel('maryam', ['neighbor'], 0.6),
      rel('yusuf', ['neighbor'], 0.5),
      rel('tariq', ['neighbor'], 0.5),
      rel('danyal', ['neighbor'], 0.5),
    ],
  },
  danyal: {
    sex: 'male',
    traits: {
      honesty: 0.9,
      emotionality: 0.4,
      extraversion: 0.4,
      agreeableness: 0.7,
      conscientiousness: 0.8,
      openness: 0.5,
    },
    values: {
      benevolence: 0.75,
      universalism: 0.7,
      tradition: 0.8,
      conformity: 0.5,
      security: 0.6,
      achievement: 0.4,
      power: 0.2,
      hedonism: 0.2,
      stimulation: 0.2,
      selfDirection: 0.6,
    },
    practice: 0,
    extraNorms: [
      { normId: 'daily-prayer', standing: 'recommended', conviction: 0.8 },
      { normId: 'theft', standing: 'forbidden', conviction: 0.9 },
      { normId: 'aid-injured', standing: 'obligatory', conviction: 0.8 },
      { normId: 'feed-village', standing: 'recommended', conviction: 0.6 },
    ],
    relationships: [
      rel('maryam', ['friend'], 0.7, 0.8),
      rel('yusuf', ['neighbor'], 0.5),
      rel('tariq', ['neighbor'], 0.5),
      rel('idris', ['neighbor'], 0.5),
      rel('samira', ['neighbor'], 0.5),
    ],
  },
};

/**
 * Depletion rates the colony was tuned on (framework defaults before engine 1.2.0 halved them for the
 * day-long fasts of the town). Pinned so the shipped seed's five moments and their timing table in
 * docs/games/colony.md stay valid; the two-day drama needs hunger and thirst on a scale of hours.
 */
export const COLONY_RATES: BodyRates = {
  satietyPerMinute: 0.0015,
  satietyEffortPerMinute: 0.0015,
  hydrationPerMinute: 0.002,
  hydrationEffortPerMinute: 0.003,
};

/** Maryam's three daily meals (spec: she cooks at 06:30, 12:00 and 18:00 by habit). Minutes of day. */
export const MEALS: readonly { label: string; from: number; until: number }[] = [
  { label: 'cook breakfast', from: 6 * 60, until: 7 * 60 + 30 },
  { label: 'cook lunch', from: 11 * 60 + 30, until: 13 * 60 },
  { label: 'cook supper', from: 17 * 60 + 30, until: 19 * 60 },
];

/**
 * Prayer windows: the framework's five windows on the spec's times, with two host corrections to the window
 * ends (Fajr until sunrise at 06:30, Maghrib until the light goes at 19:30; spec §7 M2).
 */
const PRAYER_END: Record<string, number> = { Fajr: 6 * 60 + 30, Maghrib: 19 * 60 + 30 };

function salahWindows(): Omit<Commitment, 'status'>[] {
  return prayerWindows(0).map((c) => {
    const end = c.label ? PRAYER_END[c.label] : undefined;
    return { ...c, id: `salah-${(c.label ?? 'prayer').toLowerCase()}`, ...(end ? { until: end } : {}) };
  });
}

function danyalPrayers(): Omit<Commitment, 'status'>[] {
  const mk = (id: string, label: string, from: number, until: number): Omit<Commitment, 'status'> => ({
    id,
    kind: 'worship',
    actions: ['pray'],
    from,
    until,
    normId: 'daily-prayer',
    importance: 0.7,
    recurEvery: MINUTES_PER_DAY,
    label,
  });
  return [
    mk('prayer-morning', 'morning prayer', 5 * 60 + 30, 6 * 60 + 30),
    mk('prayer-evening', 'evening prayer', 19 * 60, 20 * 60),
  ];
}

function mealDuties(): Omit<Commitment, 'status'>[] {
  return MEALS.map((m, i) => ({
    id: `meal-${i}`,
    kind: 'duty' as const,
    actions: ['cook'],
    from: m.from,
    until: m.until,
    normId: 'feed-village',
    importance: 0.9,
    recurEvery: MINUTES_PER_DAY,
    label: m.label,
  }));
}

/** Deterministic per-person seed from the game seed. */
function personSeed(seed: number, index: number): number {
  let h = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

/** The framework spec for one villager. */
export function villagerPersonSpec(seed: number, v: VillagerSpec): PersonSpec {
  const c = CAST[v.id];
  const now = fw(0);
  const commitments: Omit<Commitment, 'status'>[] = [];
  if (v.prays) commitments.push(...salahWindows());
  if (v.id === 'danyal') commitments.push(...danyalPrayers());
  if (v.id === 'maryam') commitments.push(...mealDuties());
  const goal = ROLE_GOALS[v.id];
  return {
    id: v.id,
    name: v.name,
    seed: personSeed(seed, v.index),
    now,
    bornAt: now - v.age * MINUTES_PER_YEAR,
    sex: c.sex,
    traits: c.traits,
    values: c.values,
    norms: heldNorms({ practice: c.practice, extraNorms: c.extraNorms }),
    skills: { ...v.skills },
    body: {
      satiety: v.satiety,
      hydration: 0.75,
      sleepPressure: 0.1,
      exertion: 0,
      asleep: false,
      rates: COLONY_RATES,
    },
    relationships: c.relationships,
    commitments,
    goals: [
      {
        id: 'role',
        label: goal.label,
        serves: ['competence'],
        advancedBy: goal.advancedBy,
        importance: 0.75,
      },
    ],
    voices: [{ voiceId: 'player', trust: v.trust }],
  };
}
