/** Watch's authored starting state. These are game character choices, never actor update formulas. */

import {
  DEFAULT_NORMS,
  type Input,
  type Offer,
  type PersonAuthoring,
  type RunSpec,
} from '@adam0white/human-framework';
import { canonicalCast } from '@adam0white/lab-client';
import {
  ALL_POST_IDS,
  DAY,
  DUSK_START,
  FOUNDER_KIN,
  FOUNDER_MARRIAGES,
  type KinDef,
  SECTION_IDS,
  WATCH_CAST,
  WATCHERS,
  type WatcherDef,
} from './config.ts';
import { minuteMs, WATCH_HF4_EDITION } from './hf4.ts';

export const WATCH_START = minuteMs(DUSK_START);
const YEAR = minuteMs(365 * DAY);
const provenance = {
  kind: 'authored-world' as const,
  author: 'watch',
  ruleId: 'watch-authoring',
  edition: WATCH_HF4_EDITION,
};
const ACTIONS = [
  'hold-post',
  'sit',
  'doze',
  'eat',
  'pray',
  'freeze',
  'run-off',
  'flee',
  'sleep',
  'go-home',
  'carry',
  'work',
  'rest',
  'mend',
  'care-ada',
  'wait',
  'leave-village',
  'stay-village',
  'propose',
  'accept-proposal',
  'decline-proposal',
  'accept-gate-role',
  'decline-gate-role',
  'play',
  'chores',
  'gather stones',
  'sling practice',
  'stand the wall',
  'mend and carry',
  'the fields',
  'the harvest',
  'sowing',
  'a sling lesson',
  'craft',
  'supper',
  'an evening at the well',
];

export function watchSpec(seed: number, game: import('@adam0white/human-framework').Json): RunSpec {
  return {
    id: 'night-watch',
    seed,
    start: WATCH_START,
    host: { id: 'watch', edition: WATCH_HF4_EDITION, schema: WATCH_HF4_EDITION },
    definitions: {
      actions: ACTIONS.map((id) => ({
        id,
        label: id,
        demands: {
          effort: 0,
          focus: 0,
          mode: id === 'sleep' ? 'sleep' : 'awake',
          requires: {},
        },
        tags: [],
        norms: [],
      })),
      norms: [
        ...DEFAULT_NORMS,
        {
          id: 'keep-watch',
          label: 'Keep the watch you stand',
          standing: 'obligatory',
          provenance,
          exemptions: [],
          sources: [
            { kind: 'assumption', ref: 'The Night Watch host norm; standing chosen by the game design' },
          ],
        },
      ],
      marriageCustoms: [
        {
          id: 'watch-village',
          minAgeYears: 18,
          forbiddenKin: [
            'parent',
            'child',
            'sibling',
            'grandparent',
            'grandchild',
            'aunt-uncle',
            'niece-nephew',
          ],
          guardianForBride: false,
          mourningDays: { widow: 120, widower: 0 },
          maxSpouses: 1,
          pairing: 'opposite-sex',
          provenance,
          engineeringPremises: [
            { kind: 'assumption', ref: 'The Watch village authored adult monogamous custom.' },
          ],
        },
      ],
      skills: [
        { id: 'sling', label: 'sling', domain: 'motor' },
        { id: 'sight', label: 'sight', domain: 'motor' },
        { id: 'craft', label: 'craft', domain: 'motor' },
      ],
      skillTransfers: [],
      methods: [],
      routines: [],
      sources: [
        { type: 'host', id: 'watch' },
        { type: 'voice', id: 'keeper' },
        ...[...WATCHERS, ...FOUNDER_KIN].map((person) => ({ type: 'person' as const, id: person.id })),
      ],
      lexicon: {
        names: Object.fromEntries([
          ['keeper', 'Keeper'],
          ...WATCHERS.map((p) => [p.id, p.name]),
          ...FOUNDER_KIN.map((p) => [p.id, p.name]),
          ...SECTION_IDS.map((id) => [id, id === 'gate' ? 'the Gate' : `the ${id} wall`]),
          ...ALL_POST_IDS.map((id) => [id, id]),
        ]),
        roles: {},
        prefer: 'name',
        actions: Object.fromEntries(ACTIONS.map((id) => [id, { base: id }])),
      },
      calendar: {
        id: 'watch-calendar',
        epoch: { id: 'watch-epoch', simulationAt: 0, dayIndex: 0, msOfDay: 0 },
        dayMs: 86400000,
        days: [0, 1].map((dayIndex) => ({ dayIndex, start: minuteMs(dayIndex * DAY), windows: [] })),
      },
    },
    lifecycle: {
      kinPremises: [
        ...FOUNDER_KIN.flatMap((kin) =>
          (kin.parents ?? []).flatMap((parent) => [
            {
              id: `watch:kin:${parent}:${kin.id}`,
              from: { kind: 'entity' as const, id: parent },
              to: { kind: 'entity' as const, id: kin.id },
              role: 'child' as const,
              basis: { kind: 'evidence' as const, id: `watch:founder-parent:${parent}:${kin.id}` },
            },
            {
              id: `watch:kin:${kin.id}:${parent}`,
              from: { kind: 'entity' as const, id: kin.id },
              to: { kind: 'entity' as const, id: parent },
              role: 'parent' as const,
              basis: { kind: 'evidence' as const, id: `watch:founder-parent:${parent}:${kin.id}` },
            },
          ]),
        ),
        ...FOUNDER_KIN.flatMap((kin) =>
          kin.guardian
            ? [
                [kin.id, kin.guardian],
                [kin.guardian, kin.id],
              ].map(([from, to]) => ({
                id: `watch:kin:sibling:${from}:${to}`,
                from: { kind: 'entity' as const, id: from as string },
                to: { kind: 'entity' as const, id: to as string },
                role: 'sibling' as const,
                basis: { kind: 'evidence' as const, id: `watch:founder-siblings:${kin.id}:${kin.guardian}` },
              }))
            : [],
        ),
        ...FOUNDER_MARRIAGES.flatMap(([a, b]) =>
          [
            [a, b],
            [b, a],
          ].map(([from, to]) => ({
            id: `watch:kin:${from}:${to}`,
            from: { kind: 'entity' as const, id: from as string },
            to: { kind: 'entity' as const, id: to as string },
            role: 'spouse' as const,
            basis: { kind: 'evidence' as const, id: `watch:founder-marriage:${a}:${b}` },
          })),
        ),
      ],
      kinScopes: [],
    },
    world: {
      revision: 0,
      facts: [...SECTION_IDS, ...ALL_POST_IDS, 'home', 'village'].map((id) => ({
        id: `watch:place:${id}`,
        subject: id,
        predicate: 'watch:physical-place',
        value: { kind: 'place' },
        at: WATCH_START,
        provenance: { source: 'watch', evidenceId: `watch:authored-geography:${id}` },
      })),
      hostState: game,
    },
  };
}

export function watchPerson(
  id: string,
  name: string,
  sex: 'female' | 'male',
  age: number,
  at = WATCH_START,
): PersonAuthoring {
  return {
    id,
    identity: { name, sex, birthAt: at - age * YEAR },
    biography: [],
    origin: {
      kind: 'authored',
      basis: { kind: 'evidence', id: `watch:author:${id}` },
      traits: {
        kind: 'explicit-authoring',
        evidence: { kind: 'evidence', id: `watch:traits:${id}` },
      },
    },
    state: {
      traits: {
        honesty: 0.5,
        emotionality: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        conscientiousness: 0.5,
        openness: 0.5,
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
      },
      body: {
        satiety: 0.75,
        hydration: 0.85,
        sleepPressure: 0.15,
        exertion: 0,
        fitness: 0.5,
        health: 1,
        pain: 0,
        sleepDebtHours: 0,
        depletion: 0,
        circadianPeakMs: minuteMs(16 * 60),
        asleep: false,
        since: at,
        doze: {
          context: { posture: 'upright', stimulation: 0.5 },
          basis: { kind: 'authored', author: 'watch', at },
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
      skills: [],
      heldNorms: [],
      beliefs: [],
      consequences: [],
      sourceTrust: [],
      context: {
        scarcity: { kind: 'prior', value: 0, basis: 'watch:opening-granary' },
        smoking: { kind: 'unobserved' },
      },
      relationships: [],
      voices: [{ voiceId: 'keeper', trust: 0.5 }],
      agenda: {
        exemptions: { traveling: { kind: 'unobserved' }, illnessSeverity: { kind: 'unobserved' } },
        commitments: [],
        goals: [],
        precommitments: [],
        owed: [],
      },
      family: { contactCovered: [], aptitudes: {} },
      groups: ['village'],
      reserve: {},
      retention: { trace: 0, chronicleDays: 40 },
      habits: [],
      expectations: [],
      affect: { mood: { valence: 0, arousal: 0.3 }, regulation: 0.3, emotions: [] },
      promptings: { reading: 'none', responses: [] },
      review: { style: 'accounting', atMsOfDay: minuteMs(21 * 60) },
      bonds: { courtships: [], marriages: [] },
    },
  };
}

export function authoredWatcher(def: WatcherDef, at = WATCH_START): PersonAuthoring {
  const person = watchPerson(def.id, def.name, def.sex, def.age, at);
  person.identity.castId = WATCH_CAST[def.id];
  person.state.traits = { ...person.state.traits, ...def.traits };
  person.state.values = { ...canonicalCast(WATCH_CAST[def.id] ?? '').values };
  person.state.body.fitness = def.fitness;
  person.state.skills = [
    ['sling', def.sling],
    ['sight', def.sight],
    ['craft', def.craft],
  ].map(([id, level]) => ({
    id: id as string,
    level: level as number,
    practicedMs: 0,
    lastPracticed: at,
  }));
  // Preserve the 3.x Watch opening profile as authored starting values.
  const religious = new Set([
    'salah',
    'eid-prayer',
    'sawm-ramadan',
    'zakat',
    'charity',
    'intoxicants',
    'forbidden-food',
  ]);
  const core = new Set(['lying', 'theft', 'harm-others', 'keep-promise']);
  const practice = def.prays ? 0.9 : 0.3;
  person.state.heldNorms = [
    ...DEFAULT_NORMS.map((norm) => ({
      normId: norm.id,
      standing: norm.standing,
      conviction: religious.has(norm.id)
        ? 0.95 * practice
        : core.has(norm.id)
          ? 0.6 + 0.3 * practice
          : 0.4 + 0.4 * practice,
      provenance: norm.provenance,
    })),
    { normId: 'keep-watch', standing: 'obligatory', conviction: def.duty, provenance },
  ];
  person.state.relationships = def.ties.map((tie) => ({
    otherId: tie.otherId,
    roles: tie.roles,
    affection: tie.affection,
    trust: tie.trust ?? 0.55,
    familiarity: def.newcomer ? 0.2 : 0.8,
    respect: 0.5,
    ledger: 0,
    lastInteraction: at,
  }));
  person.state.voices = [{ voiceId: 'keeper', trust: def.keeperTrust }];
  person.state.reserve = { ...def.reserve };
  person.state.groups = [def.newcomer ? 'incomers' : 'village'];
  // This bond predates play. It is not a proposal accepted during this run.
  person.state.bonds.marriages = FOUNDER_MARRIAGES.flatMap(([a, b]) =>
    def.id === a || def.id === b ? [{ spouseId: def.id === a ? b : a, since: WATCH_START - YEAR * 12 }] : [],
  );
  for (const kin of FOUNDER_KIN) {
    const role = kin.parents?.includes(def.id) ? 'child' : kin.guardian === def.id ? 'ward' : undefined;
    if (!role) continue;
    const tie = person.state.relationships.find((tie) => tie.otherId === kin.id);
    if (tie) {
      tie.roles = [...new Set([...tie.roles, role])];
      tie.affection = Math.max(tie.affection, 0.8);
      tie.trust = Math.max(tie.trust, 0.7);
      tie.familiarity = Math.max(tie.familiarity, 0.9);
    } else
      person.state.relationships = [
        ...person.state.relationships,
        {
          otherId: kin.id,
          roles: [role],
          affection: 0.8,
          trust: 0.7,
          familiarity: 0.9,
          respect: 0.5,
          ledger: 0,
          lastInteraction: at,
        },
      ];
  }
  return person;
}

/** The household ties and starting skills authored for each founder's child or ward. */
export function authoredKin(kin: KinDef, index: number, at = WATCH_START): PersonAuthoring {
  const person = watchPerson(kin.id, kin.name, kin.sex, kin.age, at);
  person.identity.birthAt = at - kin.age * YEAR - minuteMs(index * 9973);
  person.state.skills = [
    ['sling', 0.1],
    ['sight', 0.3],
    ['craft', 0.1],
  ].map(([id, level]) => ({
    id: id as string,
    level: level as number,
    practicedMs: 0,
    lastPracticed: at,
  }));
  person.state.relationships = [
    ...(kin.parents ?? []).map((parent) => ({
      otherId: parent,
      roles: ['parent'],
      affection: 0.75,
      trust: 0.75,
      familiarity: 0.9,
    })),
    ...(kin.guardian
      ? [
          {
            otherId: kin.guardian,
            roles: ['guardian', 'sibling'],
            affection: 0.8,
            trust: 0.75,
            familiarity: 0.9,
          },
        ]
      : []),
  ].map((tie) => ({ ...tie, respect: 0.5, ledger: 0, lastInteraction: at }));
  person.state.voices = [{ voiceId: 'keeper', trust: 0.6 }];
  return person;
}

/** The Watch's fixed fictional prayer times, carried forward from its 3.x schedule. */
export function watchPrayerInputs(person: string, day: number): Input[] {
  const base = minuteMs(day * DAY);
  const windows = [
    ['Fajr', 300, 390],
    ['Dhuhr', 750, 960],
    ['Asr', 960, 1125],
    ['Maghrib', 1125, 1215],
    ['Isha', 1215, DAY + 300],
  ] as const;
  return windows.map(([name, from, until]) => ({
    id: `watch:prayer:${person}:${day}:${name.toLowerCase()}`,
    at: base,
    source: { type: 'host', id: 'watch' },
    kind: 'agenda.requested',
    payload: {
      person,
      request: {
        type: 'commit',
        commitment: {
          id: `salah:${day}:${name.toLowerCase()}`,
          kind: 'worship',
          actions: ['pray'],
          from: base + minuteMs(from),
          until: base + minuteMs(until),
          normId: 'salah',
          importance: 0.8,
          label: name,
          chain: `salah:${name.toLowerCase()}`,
        },
      },
    },
  }));
}

/** Convert the game's authored affordance once. No actor state is read here. */
export function watchOffer(
  person: string,
  data: {
    id: string;
    action: string;
    label: string;
    duration: number;
    effort?: number;
    focus?: number;
    targetId?: string;
    placeId?: string;
    advertises?: Offer['expected']['needs'];
    risk?: Offer['expected']['risk'];
    tags?: readonly string[];
    norms?: Offer['norms'];
    fulfills?: readonly string[];
  },
): Offer {
  return {
    id: data.id,
    actionId: data.action,
    label: data.label,
    person,
    durationMs: minuteMs(data.duration),
    ...(data.targetId ? { target: data.targetId } : {}),
    ...(data.placeId ? { place: data.placeId } : {}),
    participants: [],
    alongside: [],
    demands: {
      effort: data.effort ?? 0,
      focus: data.focus ?? 0,
      mode: data.action === 'sleep' ? 'sleep' : 'awake',
      requires: {},
    },
    tags: data.tags ?? [],
    norms: data.norms ?? [],
    expected: {
      needs: data.advertises ?? {},
      ...(data.risk ? { risk: data.risk } : {}),
      followedBy: [],
      provenance: ['watch:authored-offer'],
    },
    fulfills: data.fulfills ?? [],
    advances: [],
    diminishes: [],
  };
}
