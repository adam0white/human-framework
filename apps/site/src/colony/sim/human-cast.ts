/**
 * The six villagers of the Human side as framework people (spec §5 "Six villagers"): traits, values, held
 * norms, relationships, commitments, role goals and trust in the player's voice. Also the host's norm catalog
 * and the clock offset between game minutes and framework minutes.
 *
 * Clock: the framework counts minutes from 00:00 of day 0; the game's minute 0 is Day 1 05:00. Framework
 * time is therefore `fw(m) = m + START_CLOCK`, so `DEFAULT_PRAYER_TIMES` line up with the spec's prayer times.
 */
import {
  DEFAULT_NORMS,
  type PersonAuthoring,
  type RunSpec,
  type SourcedNorm,
} from '@adam0white/human-framework';
import { canonicalCast } from '@adam0white/lab-client';
import { type Minute, START_CLOCK, type VillagerId, type VillagerSpec } from './world-types.ts';

/** Framework minute of a game minute. */
export const fw = (m: Minute): number => m + START_CLOCK;
/** Game minute of a framework minute. */
export const gm = (t: number): Minute => t - START_CLOCK;

/**
 * Host norms for this game (spec §5 "Norm catalog"). Standings are the host's engineering choices, recorded
 * as such; they are each person's understanding, not rulings.
 */
export function provenance(id: string): SourcedNorm['provenance'] {
  return { kind: 'authored-world', author: 'well', ruleId: id, edition: 'well-hf4/1' };
}
export const HOST_NORMS: SourcedNorm[] = [
  ['aid-injured', 'Help the injured', 'obligatory'],
  ['feed-village', 'Feed the village', 'obligatory'],
  ['abandon-dependents', 'Leaving the people who depend on you unfed', 'forbidden'],
  ['daily-prayer', 'Pray at one’s own hours (Christian morning and evening prayer)', 'recommended'],
].map(([id, label, standing]) => ({
  id: id!,
  label: label!,
  standing: standing as SourcedNorm['standing'],
  sources: [{ kind: 'assumption', ref: 'Twice at the Well host norm; docs/games/colony.md' }],
  provenance: provenance(id!),
  exemptions: [],
}));

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
  traits: PersonAuthoring['state']['traits'];
  values: PersonAuthoring['state']['values'];
  practice: number;
  extraNorms: Omit<PersonAuthoring['state']['heldNorms'][number], 'provenance'>[];
  relationships: PersonAuthoring['state']['relationships'];
}

const rel = (
  otherId: VillagerId,
  roles: string[],
  affection: number,
  trust = 0.6,
): PersonAuthoring['state']['relationships'][number] => ({
  otherId,
  roles,
  affection,
  trust,
  familiarity: 0.9,
  respect: 0.6,
  ledger: 0,
  lastInteraction: fw(0) * 60_000,
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

/** HF4 owns bodily rates. The HF3 per-person rate override has deliberately been removed. */
export const MINUTE = 60_000;
export const DAY = 86_400_000;
export const MEALS = [
  { label: 'cook breakfast', from: 360, until: 450 },
  { label: 'cook lunch', from: 690, until: 780 },
  { label: 'cook supper', from: 1050, until: 1140 },
];
export function wellRunSpec(seed: number, villagers: readonly VillagerSpec[]): RunSpec {
  const actions = [
    'gather-grain',
    'gather-timber',
    'fell-cedar',
    'draw-water',
    'cook',
    'build',
    'raise-beam',
    'shutter-house',
    'eat',
    'drink',
    'pray',
    'shelter',
    'sleep',
    'rest',
    'carry-injured',
    'tend-injured',
    'take-grain',
    'wait',
  ];
  return {
    id: 'well',
    seed,
    start: fw(0) * MINUTE,
    host: { id: 'well', edition: 'well-hf4/1', schema: 'well-hf4/1' },
    definitions: {
      actions: actions.map((id) => ({
        id,
        label: id,
        demands: { effort: 0, focus: 0, mode: 'awake', requires: {} },
        tags: [],
        norms: [],
      })),
      norms: [...DEFAULT_NORMS, ...HOST_NORMS],
      marriageCustoms: [],
      skills: ['farming', 'forestry', 'cooking', 'building'].map((id) => ({
        id,
        label: id,
        domain: 'motor',
      })),
      skillTransfers: [],
      methods: [],
      routines: [],
      sources: [
        { type: 'host', id: 'well' },
        { type: 'voice', id: 'player' },
        ...villagers.map((v) => ({ type: 'person' as const, id: v.id })),
      ],
      lexicon: {
        names: Object.fromEntries(villagers.map((v) => [v.id, v.name])),
        roles: {},
        prefer: 'name',
        actions: {},
      },
      calendar: {
        id: 'well-calendar',
        epoch: { id: 'well-epoch', simulationAt: 0, dayIndex: 0, msOfDay: 0 },
        dayMs: 86400000,
        days: [],
      },
    },
    lifecycle: { kinPremises: [], kinScopes: [] },
    world: { revision: 0, facts: [], hostState: null },
  };
}
export function villagerPersonSpec(_seed: number, v: VillagerSpec): PersonAuthoring {
  const c = CAST[v.id];
  const canonical = canonicalCast(`hf.cast.${v.id}.well`);
  const now = fw(0) * MINUTE;
  const commitment = (
    id: string,
    label: string,
    from: number,
    until: number,
    normId: string,
    kind: 'worship' | 'duty',
    action: string,
  ) => ({
    id,
    label,
    kind,
    actions: [action],
    from: from * MINUTE,
    until: until * MINUTE,
    normId,
    importance: 0.9,
    recurEveryMs: DAY,
  });
  const commitments: PersonAuthoring['state']['agenda']['commitments'][number][] = [];
  if (v.prays)
    for (const [id, from, until] of [
      ['Fajr', 300, 390],
      ['Dhuhr', 750, 960],
      ['Asr', 960, 1125],
      ['Maghrib', 1125, 1170],
      ['Isha', 1215, 1740],
    ] as const)
      commitments.push(commitment(`salah-${id.toLowerCase()}`, id, from, until, 'salah', 'worship', 'pray'));
  if (v.id === 'danyal')
    commitments.push(
      commitment('prayer-morning', 'morning prayer', 330, 390, 'daily-prayer', 'worship', 'pray'),
      commitment('prayer-evening', 'evening prayer', 1140, 1200, 'daily-prayer', 'worship', 'pray'),
    );
  if (v.id === 'maryam')
    for (const [i, m] of MEALS.entries())
      commitments.push(commitment(`meal-${i}`, m.label, m.from, m.until, 'feed-village', 'duty', 'cook'));
  const goal = ROLE_GOALS[v.id];
  return {
    id: v.id,
    identity: {
      name: v.name,
      birthAt: now - canonical.age * 365 * DAY,
      sex: c.sex,
      castId: `hf.cast.${v.id}.well`,
    },
    biography: [],
    origin: {
      kind: 'authored',
      basis: { kind: 'evidence', id: `well:${v.id}` },
      traits: { kind: 'explicit-authoring', evidence: { kind: 'evidence', id: `well:traits:${v.id}` } },
    },
    state: {
      traits: canonical.traits,
      values: canonical.values,
      body: {
        satiety: v.satiety,
        hydration: 0.75,
        sleepPressure: 0.1,
        exertion: 0,
        fitness: 0.5,
        health: 1,
        pain: 0,
        sleepDebtHours: 0,
        depletion: 0,
        circadianPeakMs: 16 * 60 * MINUTE,
        asleep: false,
        since: now,
        doze: {
          context: { posture: 'upright', stimulation: 0.5 },
          basis: { kind: 'authored', author: 'well', at: now },
        },
        bladder: { fill: 0, pending: 0 },
        injuries: [],
        illnesses: [],
        exposures: [],
      },
      needs: {
        safety: 0.8,
        belonging: 0.7,
        esteem: 0.6,
        autonomy: 0.7,
        competence: 0.6,
        leisure: 0.6,
        meaning: 0.6,
      },
      skills: Object.entries(v.skills).map(([id, level]) => ({
        id,
        level,
        practicedMs: 0,
        lastPracticed: now,
      })),
      heldNorms: [
        ...DEFAULT_NORMS.filter((n) => c.practice > 0 && n.id === 'salah').map((n) => ({
          normId: n.id,
          standing: n.standing,
          conviction: c.practice,
          provenance: n.provenance,
        })),
        ...c.extraNorms.map((n) => ({ ...n, provenance: provenance(n.normId) })),
      ],
      beliefs: [],
      consequences: [],
      sourceTrust: [],
      context: {
        scarcity: { kind: 'prior', value: 0, basis: 'well:authored' },
        smoking: { kind: 'unobserved' },
      },
      relationships: c.relationships,
      voices: [{ voiceId: 'player', trust: v.trust }],
      agenda: {
        exemptions: { traveling: { kind: 'unobserved' }, illnessSeverity: { kind: 'unobserved' } },
        commitments,
        goals: [
          {
            id: 'role:0',
            label: goal.label,
            serves: ['competence'],
            advancedBy: goal.advancedBy,
            importance: 0.75,
            baseImportance: 0.75,
            completionHalfLifeMs: DAY,
            progress: 0,
          },
        ],
        precommitments: [],
        owed: [],
      },
      family: { contactCovered: [], aptitudes: {} },
      groups: [],
      reserve: {},
      retention: { trace: 32, chronicleDays: 120 },
      habits: [],
      expectations: [],
      affect: { mood: { valence: 0, arousal: 0.3 }, regulation: 0.3, emotions: [] },
      promptings: { reading: 'none', responses: [] },
      review: { style: 'accounting', atMsOfDay: 21 * 60 * MINUTE },
      bonds: { courtships: [], marriages: [] },
    },
  };
}
