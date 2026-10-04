/**
 * The Night Watch, phase G3-1 data: the wall, its posts, the placeholder watchers and the threats. All of it is
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
export type PostId = (typeof POST_IDS)[number];

export interface PostDef {
  id: PostId;
  section: SectionId;
}

/** Eight posts, two per section, for three watchers: there are always more posts than people (spec §4). */
export const POSTS: readonly PostDef[] = POST_IDS.map((id) => ({
  id,
  section: id.split('-')[0] as SectionId,
}));

export function postSection(id: PostId): SectionId {
  const p = POSTS.find((x) => x.id === id);
  if (!p) throw new Error(`unknown post ${id}`);
  return p.section;
}

export const WATCHER_IDS = ['tamar', 'kian', 'mara'] as const;
export type WatcherId = (typeof WATCHER_IDS)[number];

/**
 * Placeholder watchers: fixed stats, always obey. G3-2 replaces them with HF people. `aim` is the chance per
 * minute to hit a lit, approaching target; `sight` (0..1) is how far into the dark they see.
 */
export interface WatcherDef {
  id: WatcherId;
  name: string;
  aim: number;
  sight: number;
  /** The post they take when nobody says otherwise (the standing post on the first night). */
  usual: PostId;
  /** What they are known for, in words, for the roster. */
  note: string;
}

export const WATCHERS: readonly WatcherDef[] = [
  { id: 'tamar', name: 'Tamar', aim: 0.3, sight: 0.25, usual: 'gate-1', note: 'Sling, steady' },
  { id: 'kian', name: 'Kian', aim: 0.24, sight: 0.45, usual: 'gate-2', note: 'Fast, eager' },
  { id: 'mara', name: 'Mara', aim: 0.18, sight: 1, usual: 'west-1', note: 'Best sight' },
];

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
export const ROUSED_AIM = 1.25;
/** Motion shows in the dark from this far out. */
export const MOTION_REACH = 0.3;

/** Minutes for the Keeper to walk the lantern to a neighbouring section. */
export const LANTERN_STEP_MIN = 5;

/** The bell: how long a ring rouses the wall, how much each pull wears the rope, and dawn mending. */
export const BELL_ROUSE_MIN = 15;
export const BELL_WEAR_BASE = 0.22;
export const BELL_WEAR_SPREAD = 0.1;
export const ROPE_DAWN_MEND = 0.3;
export const ROUSED_SPEED = 0.5;

/** The scout is right about each wave this often. */
export const SCOUT_TRUE = 0.75;

/** Tactical slowdown window, in sim minutes. */
export const SLOW_WINDOW = 3;
