/**
 * The Night Watch data (G3-1, G3-2): the wall, its posts, the cast and the threats. All of it is
 * game-side host data (spec §7, "Game-side only"). Numbers are engineering defaults tuned by the headless gate
 * test (`gate.test.ts`), not measurements of anything.
 */

export const SECTION_IDS = ['west', 'gate', 'mill', 'east'] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export interface SectionDef {
  id: SectionId;
  name: string;
  /** How the scout names the approach ("by the west wall"). */
  approach: string;
}

/** Left to right along the wall; the Keeper walks between neighbours. */
export const SECTIONS: readonly SectionDef[] = [
  { id: 'west', name: 'West wall', approach: 'by the west wall' },
  { id: 'gate', name: 'Gate', approach: 'on the gate road' },
  { id: 'mill', name: 'Mill wall', approach: 'along the mill race' },
  { id: 'east', name: 'East wall', approach: 'by the east wall' },
];

export function sectionIndex(id: SectionId): number {
  return SECTION_IDS.indexOf(id);
}

export function sectionDef(id: SectionId): SectionDef {
  const s = SECTIONS[sectionIndex(id)];
  if (!s) throw new Error(`unknown section ${id}`);
  return s;
}

export const POST_IDS = [
  'west-1',
  'west-2',
  'gate-1',
  'gate-2',
  'mill-1',
  'mill-2',
  'east-1',
  'east-2',
] as const;
/** A third post per section, opened when the fair extends the wall (G3-3). */
export const EXTRA_POST_IDS = ['west-3', 'gate-3', 'mill-3', 'east-3'] as const;
export type PostId = (typeof POST_IDS)[number] | (typeof EXTRA_POST_IDS)[number];
export const ALL_POST_IDS: readonly PostId[] = [...POST_IDS, ...EXTRA_POST_IDS];

export interface PostDef {
  id: PostId;
  section: SectionId;
  /** 0-based slot along the section. */
  slot: number;
}

/** Eight posts, two per section, for three watchers: there are always more posts than people (spec §4). */
export const POSTS: readonly PostDef[] = ALL_POST_IDS.map((id) => ({
  id,
  section: id.split('-')[0] as SectionId,
  slot: Number(id.split('-')[1]) - 1,
}));

export function postSection(id: PostId): SectionId {
  const p = POSTS.find((x) => x.id === id);
  if (!p) throw new Error(`unknown post ${id}`);
  return p.section;
}

/** The year-1 watchers, in cast order. Later villagers (children, newcomers) get ids at runtime. */
export const WATCHER_IDS = ['tamar', 'kian', 'mara', 'joss', 'yunus', 'ruslan'] as const;
/** A villager's id: a founder's name, or one given at birth or arrival (G3-3). */
export type WatcherId = string;

type TraitName =
  | 'honesty'
  | 'emotionality'
  | 'extraversion'
  | 'agreeableness'
  | 'conscientiousness'
  | 'openness';

/**
 * The cast (G3-2): host data for HF people (`people.ts`). Traits, skills and ties are the game's engineering
 * choices. `sling` is aim (the chance per minute to hit a lit, approaching target is `AIM_SCALE × sling`, then
 * capacities, fatigue and fear); `sight` (0..1) is how far into the dark they see; `craft` mends the rope.
 * `reserve` is how much they keep from showing (Tamar's pride hides pain). `known` is how well the Keeper knows
 * them on the night they arrive (0 for the newcomer). Ties are each person's own view of the other.
 */
export interface WatcherDef {
  id: WatcherId;
  name: string;
  sex: 'female' | 'male';
  age: number;
  /** The night they first stand the wall (1-based). */
  arrives: number;
  /** The post they take when nobody says otherwise (the standing post on their first night). */
  usual: PostId;
  /** What they are known for, in words, for the roster. */
  note: string;
  /** The stretch of wall their household sits behind. */
  home: SectionId;
  /** Who waits at home, in words, as the spec's cast sheet has it (the game reads the real household, `people.ts`). */
  family: string | null;
  traits: Partial<Record<TraitName, number>>;
  sling: number;
  sight: number;
  craft: number;
  fitness: number;
  keeperTrust: number;
  known: number;
  /** How firmly they hold that the watch must be kept (conviction in the host norm 'keep-watch'). */
  duty: number;
  reserve?: { pain?: number; fear?: number; fatigue?: number };
  prays?: boolean;
  newcomer?: boolean;
  ties: { otherId: WatcherId; roles: string[]; affection: number; trust?: number }[];
}

export const WATCHERS: readonly WatcherDef[] = [
  {
    id: 'tamar',
    name: 'Tamar',
    sex: 'female',
    age: 54,
    arrives: 1,
    usual: 'gate-1',
    note: 'Sling, steady',
    home: 'gate',
    family: null,
    traits: {
      emotionality: 0.2,
      conscientiousness: 0.85,
      agreeableness: 0.45,
      extraversion: 0.35,
      honesty: 0.6,
      openness: 0.4,
    },
    sling: 0.85,
    sight: 0.25,
    craft: 0.3,
    fitness: 0.5,
    keeperTrust: 0.7,
    known: 0.6,
    duty: 0.9,
    reserve: { pain: 0.85, fear: 0.6 },
    ties: [
      { otherId: 'kian', roles: ['student'], affection: 0.55, trust: 0.6 },
      { otherId: 'yunus', roles: ['friend'], affection: 0.5, trust: 0.7 },
      { otherId: 'ruslan', roles: ['neighbor'], affection: -0.2, trust: 0.35 },
    ],
  },
  {
    id: 'kian',
    name: 'Kian',
    sex: 'male',
    age: 16,
    arrives: 1,
    usual: 'gate-2',
    note: 'Fast, eager',
    home: 'west',
    family: 'his little sister',
    traits: {
      emotionality: 0.6,
      extraversion: 0.75,
      conscientiousness: 0.4,
      agreeableness: 0.6,
      openness: 0.8,
      honesty: 0.6,
    },
    sling: 0.65,
    sight: 0.45,
    craft: 0.2,
    fitness: 0.85,
    keeperTrust: 0.75,
    known: 0.4,
    duty: 0.6,
    ties: [
      { otherId: 'tamar', roles: ['mentor'], affection: 0.75, trust: 0.8 },
      { otherId: 'mara', roles: ['neighbor'], affection: 0.3 },
    ],
  },
  {
    id: 'mara',
    name: 'Mara',
    sex: 'female',
    age: 34,
    arrives: 1,
    usual: 'west-1',
    note: 'Best sight',
    home: 'east',
    family: 'her two children',
    traits: {
      emotionality: 0.7,
      agreeableness: 0.7,
      conscientiousness: 0.6,
      extraversion: 0.45,
      openness: 0.5,
      honesty: 0.7,
    },
    sling: 0.5,
    sight: 1,
    craft: 0.3,
    fitness: 0.6,
    keeperTrust: 0.6,
    known: 0.5,
    duty: 0.6,
    ties: [
      { otherId: 'joss', roles: ['spouse'], affection: 0.85, trust: 0.85 },
      { otherId: 'kian', roles: ['neighbor'], affection: 0.35 },
    ],
  },
  {
    id: 'joss',
    name: 'Joss',
    sex: 'male',
    age: 38,
    arrives: 2,
    usual: 'mill-1',
    note: 'Smith, strong',
    home: 'east',
    family: null,
    traits: {
      emotionality: 0.35,
      agreeableness: 0.3,
      conscientiousness: 0.65,
      extraversion: 0.5,
      openness: 0.35,
      honesty: 0.6,
    },
    sling: 0.5,
    sight: 0.35,
    craft: 0.9,
    fitness: 0.85,
    keeperTrust: 0.5,
    known: 0.5,
    duty: 0.75,
    ties: [
      { otherId: 'mara', roles: ['spouse'], affection: 0.8, trust: 0.85 },
      { otherId: 'ruslan', roles: ['neighbor'], affection: -0.55, trust: 0.2 },
    ],
  },
  {
    id: 'yunus',
    name: 'Yunus',
    sex: 'male',
    age: 61,
    arrives: 2,
    usual: 'mill-2',
    note: 'Miller, calm',
    home: 'mill',
    family: null,
    traits: {
      emotionality: 0.2,
      agreeableness: 0.8,
      conscientiousness: 0.7,
      honesty: 0.85,
      extraversion: 0.4,
      openness: 0.5,
    },
    sling: 0.35,
    sight: 0.3,
    craft: 0.5,
    fitness: 0.3,
    keeperTrust: 0.65,
    known: 0.6,
    duty: 0.7,
    prays: true,
    ties: [{ otherId: 'tamar', roles: ['friend'], affection: 0.5, trust: 0.7 }],
  },
  {
    id: 'ruslan',
    name: 'Ruslan',
    sex: 'male',
    age: 45,
    arrives: 3,
    usual: 'east-2',
    note: 'Spear, newcomer',
    home: 'gate',
    family: null,
    traits: {
      emotionality: 0.75,
      agreeableness: 0.5,
      conscientiousness: 0.55,
      extraversion: 0.3,
      openness: 0.6,
      honesty: 0.65,
    },
    sling: 0.6,
    sight: 0.5,
    craft: 0.4,
    fitness: 0.7,
    keeperTrust: 0.4,
    known: 0,
    duty: 0.45,
    newcomer: true,
    ties: [
      { otherId: 'joss', roles: ['neighbor'], affection: -0.3, trust: 0.3 },
      { otherId: 'tamar', roles: ['neighbor'], affection: 0 },
    ],
  },
];

/** Age at which a villager comes of age and stands the wall (spec §2: "who comes of age (15)"). */
export const WATCH_AGE = 15;
/** Watchers step off the wall at this age ("the stair is beyond her now"). */
export const RETIRE_AGE = 68;
/** A child under this age at home pulls a parent or guardian off the wall when a threat is near the house. */
export const HOME_CHILD_AGE = 12;

/**
 * The founders' kin who do not stand the wall yet (G3-3): children who will come of age within the first volume.
 * `parents` are their parents among the founders; `guardian` raises a child whose parents are gone (Kian's sister).
 */
export interface KinDef {
  id: WatcherId;
  name: string;
  sex: 'female' | 'male';
  age: number;
  home: SectionId;
  parents?: WatcherId[];
  guardian?: WatcherId;
  /** The founder they come to the wall with, on that founder's night. */
  with: WatcherId;
}

export const FOUNDER_KIN: readonly KinDef[] = [
  { id: 'lena', name: 'Lena', sex: 'female', age: 10, home: 'east', parents: ['mara', 'joss'], with: 'mara' },
  { id: 'pell', name: 'Pell', sex: 'male', age: 7, home: 'east', parents: ['mara', 'joss'], with: 'mara' },
  { id: 'ada', name: 'Ada', sex: 'female', age: 8, home: 'west', guardian: 'kian', with: 'kian' },
];

/** Founders who are married when the chronicle opens (married by HF `marry` the night both have come). */
export const FOUNDER_MARRIAGES: readonly [WatcherId, WatcherId][] = [['mara', 'joss']];

/**
 * From the second winter, the most sacks one night can carry off from a granary at START_GRAIN; a fuller granary
 * gives up one more sack for every NIGHT_CARRY_RICH above it (a full store is easier to raid and draws bolder
 * raiders), so a run of good harvests does not pin the granary at its cap.
 */
export const NIGHT_CARRY = 3;
export const NIGHT_CARRY_RICH = 8;

/** Hit chance per minute at sling 1, lit, unhurt, rested and calm. */
export const AIM_SCALE = 0.36;

export function watcherDef(id: WatcherId): WatcherDef {
  const w = WATCHERS.find((x) => x.id === id);
  if (!w) throw new Error(`unknown watcher ${id}`);
  return w;
}

export type ThreatKind = 'wolf' | 'thief';

export interface ThreatDef {
  kind: ThreatKind;
  /** Lane progress per minute (0 = treeline, 1 = foot of the wall). */
  speed: number;
  /** Hits to drive one off. */
  hp: number;
  /** Minutes at the foot of the wall before getting in. */
  climb: number;
  /** Sacks lost when one gets in. */
  takes: number;
  /** In the dark, seen only this close (a thief keeps low). Added to a watcher's dark reach. */
  stealth: number;
}

export const THREATS: Record<ThreatKind, ThreatDef> = {
  wolf: { kind: 'wolf', speed: 0.032, hp: 1, climb: 4, takes: 1, stealth: 0 },
  thief: { kind: 'thief', speed: 0.016, hp: 2, climb: 8, takes: 2, stealth: 0.08 },
};

/** Clock, in minutes of the day. */
export const DUSK_START = 17 * 60;
export const NIGHTFALL = 18 * 60;
export const DAWN = 6 * 60;
export const DAY = 24 * 60;
export const NIGHT_LENGTH = DAY - NIGHTFALL + DAWN;

export const START_GRAIN = 20;

/** Lit sections are seen from here outwards to the wall. */
export const LIT_REACH = 0.35;
/** In the dark a watcher with sight 0 sees only from here; sight 1 pulls it back by DARK_SIGHT_BONUS. */
export const DARK_REACH = 0.82;
export const DARK_SIGHT_BONUS = 0.2;
/** Hit chance multipliers. */
export const DARK_AIM = 0.5;
export const FOOT_AIM = 1.3;
/** Sitting at the post (resting) throws this often. */
export const SIT_AIM = 0.5;
/** Motion shows in the dark from this far out. */
export const MOTION_REACH = 0.3;

/** Minutes for the Keeper to walk the lantern to a neighbouring section. */
export const LANTERN_STEP_MIN = 5;

/**
 * The bell is a command (HF `command`): it orders the watchers in earshot of the Keeper (his section and its
 * neighbours) to hold their posts for this long. Each pull wears the rope; a snapped rope waits for a day's
 * mending (`day.ts`), which takes this much wear off per hour of work at craft 1.
 */
export const BELL_COMMAND_MIN = 90;
export const BELL_WEAR_BASE = 0.22;
export const BELL_WEAR_SPREAD = 0.1;
export const ROPE_MEND_PER_HOUR = 0.25;
/** A rope nobody mends still gets a quick knot at dawn: this much wear comes off. */
export const ROPE_DAWN_MEND = 0.1;

/** The scout is right about each wave this often. */
export const SCOUT_TRUE = 0.75;

/** Tactical slowdown window, in sim minutes. */
export const SLOW_WINDOW = 3;
