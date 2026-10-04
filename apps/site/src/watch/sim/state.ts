/**
 * The whole game state of a Night Watch run, as plain JSON: the clock, the wall, the watchers (HF people in a
 * community, the Keeper's postings and where each one is), the tokens on the lanes, grain, the rope and the
 * seeded RNG. Nothing here knows about real time or the UI.
 */
import type { Command, Community, Percept, Person } from '@human/framework';
import {
  DUSK_START,
  NIGHTFALL,
  type PostId,
  type SectionId,
  START_GRAIN,
  type ThreatKind,
  type WatcherId,
} from './config.ts';
import { createKeeper, createWatchCommunity, type Place } from './people.ts';

export type Phase = 'goal' | 'dusk' | 'night' | 'dawn' | 'fallen';

/** How hard the Keeper presses a posting: asked, urged (a stronger suggestion) or insisted on. */
export type Press = 'ask' | 'urge' | 'insist';

export interface Spawn {
  /** Absolute minute it leaves the treeline. */
  at: number;
  section: SectionId;
  kind: ThreatKind;
  count: number;
}

export interface Token {
  id: number;
  kind: ThreatKind;
  section: SectionId;
  /** 0 at the treeline, 1 at the foot of the wall. */
  pos: number;
  hp: number;
  /** Minutes spent at the foot of the wall. */
  climb: number;
  state: 'coming' | 'foot' | 'fled' | 'in';
  /** Absolute minute of the last change of `state`, for the UI's fade-outs. */
  since: number;
}

export interface Alert {
  minute: number;
  section: SectionId;
  kind: 'motion' | 'sighted' | 'foot' | 'in' | 'driven' | 'bell' | 'rope' | 'person';
  text: string;
  /** Whether it eased play to the tactical speed. */
  slowed: boolean;
  /** The watcher it is about, if any. */
  who?: WatcherId;
}

export interface NightTally {
  /** Per section: driven off and got in, by kind. */
  driven: Record<SectionId, Partial<Record<ThreatKind, number>>>;
  got: Record<SectionId, Partial<Record<ThreatKind, number>>>;
  /** Who drove one off, per section. */
  heroes: Record<SectionId, WatcherId[]>;
  grainAtDusk: number;
  bellRung: number;
}

/** Something a watcher did or suffered in the night, for the dawn page (in their voice) and the export. */
export interface NightNote {
  minute: number;
  who: WatcherId;
  kind:
    | 'refused'
    | 'deferred'
    | 'modified'
    | 'fled'
    | 'home'
    | 'slept'
    | 'froze'
    | 'ran'
    | 'bitten'
    | 'downed'
    | 'carried'
    | 'carrier'
    | 'commanded'
    | 'defied'
    | 'prayed'
    | 'shaken'
    | 'together';
  section?: SectionId;
  /** The other person involved (who carried, who was carried). */
  other?: WatcherId;
}

export interface DawnPage {
  night: number;
  lines: { section: SectionId; text: string }[];
  /** Said when the lead threat came somewhere the scout did not name. */
  scout: string | null;
  grainBefore: number;
  grainAfter: number;
  ropeSnapped: boolean;
  /** What the watchers say at dawn, in their own words. */
  voices: { who: WatcherId; text: string }[];
}

export interface DaySummary {
  night: number;
  /** One line per watcher: what their day was. */
  lines: { who: WatcherId; text: string }[];
  ropeBefore: number;
  ropeAfter: number;
}

export interface WatchState {
  version: 2;
  seed: number;
  /** mulberry32 state. */
  rng: number;
  /** Absolute sim minute; day 0 starts at midnight, the game at 17:00 on day 0. Framework time is the same. */
  minute: number;
  /** Absolute minute this night falls (18:00 of the dusk's day). */
  nightStart: number;
  phase: Phase;
  /** 1-based. */
  night: number;
  /** The Keeper's postings: standing suggestions, kept until changed (null: no posting). */
  posts: Record<WatcherId, PostId | null>;
  press: Record<WatcherId, Press>;
  /** Minute each posting was given (the suggestion's `since`). */
  postedAt: Record<WatcherId, number>;
  /** Where each watcher is now. */
  place: Record<WatcherId, Place>;
  /** The watchers as HF people (plain JSON). */
  community: Community;
  /** The Keeper as a Person: holds impressions of the watchers, never stepped. */
  keeper: Person;
  /** Bell commands in force, each until a minute. */
  commands: Partial<Record<WatcherId, { cmd: Command; until: number }>>;
  /** Percepts queued for each watcher (pulled by the driver, pruned once perceived). */
  percepts: Partial<Record<WatcherId, Percept[]>>;
  /** Per section, the last minute a threat was seen there (the families behind it hear of it). */
  homeThreat: Record<SectionId, number>;
  /** Downed watchers already carried to the hall tonight. */
  carried: Partial<Record<WatcherId, boolean>>;
  /** The night's notes, for the dawn page. */
  notes: NightNote[];
  /** The last day, summarised at dusk. */
  day: DaySummary | null;
  /** The Keeper's position along the wall as a section index; lit only when standing at `target`. */
  lantern: { x: number; target: number };
  rope: { wear: number; snapped: boolean };
  grain: number;
  /** The night's plan, drawn at dusk. */
  lead: ThreatKind;
  warned: SectionId;
  warning: string;
  /** Sections the lead threat's waves were drawn on (for the dawn page's word on the scout). */
  leadCame: SectionId[];
  spawns: Spawn[];
  tokens: Token[];
  nextTokenId: number;
  /** Per section, whether motion was already called this night (each lane raises one first-motion alert). */
  called: Record<SectionId, boolean>;
  alerts: Alert[];
  slowUntil: number;
  /** Who threw this minute and whether it hit, for drawing. */
  throws: { watcher: WatcherId; token: number; hit: boolean }[];
  tally: NightTally;
  dawn: DawnPage | null;
  /** Grain lost on each finished night, for the export. */
  history: { night: number; warned: SectionId; lead: ThreatKind; lost: number }[];
}

/** mulberry32: a small seeded generator whose whole state is one 32-bit integer held in game state. */
export function nextRandom(s: { rng: number }): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function pick<T>(s: { rng: number }, items: readonly T[]): T {
  const v = items[Math.floor(nextRandom(s) * items.length)];
  if (v === undefined) throw new Error('pick from an empty list');
  return v;
}

export function emptyTally(grain: number): NightTally {
  const per = <T>(f: () => T): Record<SectionId, T> => ({ west: f(), gate: f(), mill: f(), east: f() });
  return {
    driven: per(() => ({})),
    got: per(() => ({})),
    heroes: per(() => []),
    grainAtDusk: grain,
    bellRung: 0,
  };
}

export function perWatcher<T>(f: (id: WatcherId) => T): Record<WatcherId, T> {
  return {
    tamar: f('tamar'),
    kian: f('kian'),
    mara: f('mara'),
    joss: f('joss'),
    yunus: f('yunus'),
    ruslan: f('ruslan'),
  };
}

export function createState(seed: number): WatchState {
  return {
    version: 2,
    seed,
    rng: seed | 0,
    minute: DUSK_START,
    nightStart: NIGHTFALL,
    phase: 'goal',
    night: 1,
    posts: perWatcher(() => null),
    press: perWatcher(() => 'ask'),
    postedAt: perWatcher(() => DUSK_START),
    place: perWatcher(() => 'away'),
    community: createWatchCommunity(),
    keeper: createKeeper(seed, DUSK_START),
    commands: {},
    percepts: {},
    homeThreat: { west: -1e9, gate: -1e9, mill: -1e9, east: -1e9 },
    carried: {},
    notes: [],
    day: null,
    lantern: { x: 1, target: 1 },
    rope: { wear: 0, snapped: false },
    grain: START_GRAIN,
    lead: 'wolf',
    warned: 'gate',
    warning: '',
    leadCame: [],
    spawns: [],
    tokens: [],
    nextTokenId: 1,
    called: { west: false, gate: false, mill: false, east: false },
    alerts: [],
    slowUntil: -1,
    throws: [],
    tally: emptyTally(START_GRAIN),
    dawn: null,
    history: [],
  };
}
