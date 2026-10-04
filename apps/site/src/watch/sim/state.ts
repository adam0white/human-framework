/**
 * The whole game state of a Night Watch run, as plain JSON: the clock, the wall, the watchers' posts, the
 * tokens on the lanes, grain, the rope and the seeded RNG. Nothing here knows about real time or the UI.
 */
import {
  DUSK_START,
  NIGHTFALL,
  type PostId,
  type SectionId,
  START_GRAIN,
  type ThreatKind,
  WATCHERS,
  type WatcherId,
} from './config.ts';

export type Phase = 'goal' | 'dusk' | 'night' | 'dawn' | 'fallen';

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
  kind: 'motion' | 'sighted' | 'foot' | 'in' | 'driven' | 'bell' | 'rope';
  text: string;
  /** Whether it eased play to the tactical speed. */
  slowed: boolean;
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

export interface DawnPage {
  night: number;
  lines: { section: SectionId; text: string }[];
  grainBefore: number;
  grainAfter: number;
  ropeSnapped: boolean;
}

export interface WatchState {
  version: 1;
  seed: number;
  /** mulberry32 state. */
  rng: number;
  /** Absolute sim minute; day 0 starts at midnight, the game at 17:00 on day 0. */
  minute: number;
  /** Absolute minute this night falls (18:00 of the dusk's day). */
  nightStart: number;
  phase: Phase;
  /** 1-based. */
  night: number;
  /** Standing posts: a watcher's post stays until changed. */
  posts: Record<WatcherId, PostId | null>;
  /** The Keeper's position along the wall as a section index; lit only when standing at `target`. */
  lantern: { x: number; target: number };
  rope: { wear: number; snapped: boolean };
  rousedUntil: number;
  grain: number;
  /** The night's plan, drawn at dusk. */
  lead: ThreatKind;
  warned: SectionId;
  warning: string;
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

export function createState(seed: number): WatchState {
  const posts = {} as Record<WatcherId, PostId | null>;
  for (const w of WATCHERS) posts[w.id] = w.usual;
  return {
    version: 1,
    seed,
    rng: seed | 0,
    minute: DUSK_START,
    nightStart: NIGHTFALL,
    phase: 'goal',
    night: 1,
    posts,
    lantern: { x: 1, target: 1 },
    rope: { wear: 0, snapped: false },
    rousedUntil: -1,
    grain: START_GRAIN,
    lead: 'wolf',
    warned: 'gate',
    warning: '',
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
