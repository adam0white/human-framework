/**
 * Shared world rules for Twice at the Well: clock, prayer times, weather schedule, job table, villager
 * roster, per-side world state and the scenario roll. Both the Classic side and any HumanSide read these,
 * so "same seed, same schedule" holds by construction. Pure TS; no DOM, no wall clock, no Math.random.
 */
import { type PlaceId, spotFor, type Tile } from './map.ts';

export type Minute = number;

// ---------------------------------------------------------------------------------------------
// Clock (sim minute 0 = Day 1 05:00, end = Day 3 05:00)
// ---------------------------------------------------------------------------------------------

export const START_CLOCK = 5 * 60;
export const END_MINUTE: Minute = 2880;
/** Default pace: 16 sim minutes per real second at 1×. */
export const SIM_MINUTES_PER_SECOND = 16;

export function clockOf(m: Minute): { day: number; hour: number; minute: number; minuteOfDay: number } {
  const abs = START_CLOCK + m;
  const minuteOfDay = ((abs % 1440) + 1440) % 1440;
  return {
    day: Math.floor(abs / 1440) + 1,
    hour: Math.floor(minuteOfDay / 60),
    minute: minuteOfDay % 60,
    minuteOfDay,
  };
}

/** Sim minute of a given day (1-based) and clock time. */
export function at(day: number, hour: number, minute = 0): Minute {
  return (day - 1) * 1440 + hour * 60 + minute - START_CLOCK;
}

export function formatClock(m: Minute): string {
  const c = clockOf(m);
  return `Day ${c.day} · ${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
}

export type PrayerId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

/** Fixed prayer times as minute of day (spec §2). */
export const PRAYER_TIMES: readonly { id: PrayerId; label: string; minuteOfDay: number }[] = [
  { id: 'fajr', label: 'Fajr', minuteOfDay: 5 * 60 },
  { id: 'dhuhr', label: 'Dhuhr', minuteOfDay: 12 * 60 + 30 },
  { id: 'asr', label: 'Asr', minuteOfDay: 16 * 60 },
  { id: 'maghrib', label: 'Maghrib', minuteOfDay: 18 * 60 + 45 },
  { id: 'isha', label: 'Isha', minuteOfDay: 20 * 60 + 15 },
];

/** The adhan that sounds exactly at minute `m`, if any. */
export function adhanAt(m: Minute): PrayerId | null {
  const mod = clockOf(m).minuteOfDay;
  return PRAYER_TIMES.find((p) => p.minuteOfDay === mod)?.id ?? null;
}

/** Night is 19:30–05:00 (darker palette, lanterns). */
export function isNight(m: Minute): boolean {
  const mod = clockOf(m).minuteOfDay;
  return mod >= 19 * 60 + 30 || mod < 5 * 60;
}

/** Classic sleep window 22:00–05:00. */
export function isSleepTime(m: Minute): boolean {
  const mod = clockOf(m).minuteOfDay;
  return mod >= 22 * 60 || mod < 5 * 60;
}

/** 0 at full day, 1 at deep night, with a 45-minute dusk and dawn ramp. Render-only helper. */
export function darkness(m: Minute): number {
  const mod = clockOf(m).minuteOfDay;
  const dusk = 19 * 60 + 30;
  const dawn = 5 * 60;
  if (mod >= dusk - 45 && mod < dusk) return (mod - (dusk - 45)) / 45;
  if (mod >= dusk || mod < dawn) return 1;
  if (mod >= dawn && mod < dawn + 45) return 1 - (mod - dawn) / 45;
  return 0;
}

// ---------------------------------------------------------------------------------------------
// Weather (spec §2): squall Day 1 21:30–23:00, warning Day 2 16:00, storm Day 2 19:00 → Day 3 03:00
// ---------------------------------------------------------------------------------------------

export const SQUALL_START = at(1, 21, 30);
export const SQUALL_END = at(1, 23, 0);
export const WARNING_AT = at(2, 16, 0);
export const STORM_START = at(2, 19, 0);
export const STORM_END = at(3, 3, 0);
/** Shuttering becomes available when the sky darkens. */
export const SHUTTER_AVAILABLE = WARNING_AT;

export type WeatherKind = 'clear' | 'squall' | 'darkening' | 'storm';

export interface Weather {
  kind: WeatherKind;
  /** 0..1, for rendering rain and sway. */
  wind: number;
  /** Outdoors is `risky` (forest and field during the squall; everywhere outdoors in the storm). */
  risky: boolean;
}

export function weatherAt(m: Minute): Weather {
  if (m >= SQUALL_START && m < SQUALL_END) return { kind: 'squall', wind: 0.6, risky: true };
  if (m >= STORM_START && m < STORM_END) return { kind: 'storm', wind: 1, risky: true };
  if (m >= WARNING_AT && m < STORM_START) return { kind: 'darkening', wind: 0.25, risky: false };
  return { kind: 'clear', wind: 0.05, risky: false };
}

// ---------------------------------------------------------------------------------------------
// Scenario roll: identical on both sides for the same (tag, minute, subject), regardless of draw order
// ---------------------------------------------------------------------------------------------

function mix32(h: number): number {
  let z = h >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
  return (z ^ (z >>> 16)) >>> 0;
}

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * A uniform [0, 1) roll keyed by (seed, tag, minute, subject). Used for weather injuries, the cedar and the
 * beam: the same order at the same minute gets the same roll on both sides (spec §10 "scenario" stream).
 */
export function scenarioRoll(seed: number, tag: string, minute: Minute, subject: number): number {
  let h = mix32(seed ^ 0x9e3779b9);
  h = mix32(h ^ hashString(tag));
  h = mix32(h ^ (minute >>> 0));
  h = mix32(h ^ Math.imul(subject + 1, 0x27d4eb2d));
  return h / 4294967296;
}

// ---------------------------------------------------------------------------------------------
// Jobs and actions
// ---------------------------------------------------------------------------------------------

export type ActionId =
  | 'gather-grain'
  | 'gather-timber'
  | 'fell-cedar'
  | 'draw-water'
  | 'cook'
  | 'build'
  | 'raise-beam'
  | 'shutter-house'
  | 'eat'
  | 'pray'
  | 'shelter'
  | 'sleep'
  | 'rest'
  | 'carry-injured';

export interface Resources {
  grain: number;
  water: number;
  timber: number;
  meals: number;
}

export interface JobSpec {
  action: ActionId;
  label: string;
  /** Present-participle label for the inspector ("gathering grain"). */
  doing: string;
  place: PlaceId;
  /** Work minutes at base speed, excluding travel. */
  work: number;
  consumes?: Partial<Resources>;
  yields?: Partial<Resources>;
  outdoors: boolean;
  /** Classic skill tag that doubles speed at this job. */
  skillTag?: SkillTag;
}

export type SkillTag = 'builder' | 'cook' | 'forester';

/**
 * Job table (spec §2 flows and §4 Classic rates). Rates: grain 1 / 20 min, timber 1 / 30 min, the cedar 3
 * in one felling, cooking 1 grain + 1 water → 3 meals in 40 min, one build stage per four hours at base speed (two for a builder) per 2 timber.
 */
export const JOBS: Record<ActionId, JobSpec> = {
  'gather-grain': {
    action: 'gather-grain',
    label: 'Gather grain',
    doing: 'gathering grain',
    place: 'field',
    work: 60,
    yields: { grain: 3 },
    outdoors: true,
  },
  'gather-timber': {
    action: 'gather-timber',
    label: 'Gather timber',
    doing: 'gathering timber',
    place: 'forest',
    work: 60,
    yields: { timber: 2 },
    outdoors: true,
    skillTag: 'forester',
  },
  'fell-cedar': {
    action: 'fell-cedar',
    label: 'Fell the big cedar',
    doing: 'felling the cedar',
    place: 'cedar',
    work: 90,
    yields: { timber: 3 },
    outdoors: true,
    skillTag: 'forester',
  },
  'draw-water': {
    action: 'draw-water',
    label: 'Draw water',
    doing: 'drawing water',
    place: 'well',
    work: 20,
    yields: { water: 2 },
    outdoors: true,
  },
  cook: {
    action: 'cook',
    label: 'Cook',
    doing: 'cooking',
    place: 'kitchen',
    work: 40,
    consumes: { grain: 1, water: 1 },
    yields: { meals: 3 },
    outdoors: false,
    skillTag: 'cook',
  },
  build: {
    action: 'build',
    label: 'Build',
    doing: 'building',
    place: 'site',
    work: 240,
    consumes: { timber: 2 },
    outdoors: true,
    skillTag: 'builder',
  },
  'raise-beam': {
    action: 'raise-beam',
    label: 'Raise the roof beam',
    doing: 'raising the beam',
    place: 'site',
    work: 45,
    consumes: { timber: 2 },
    outdoors: true,
    skillTag: 'builder',
  },
  'shutter-house': {
    action: 'shutter-house',
    label: 'Shutter the house',
    doing: 'shuttering',
    place: 'site',
    work: 40,
    outdoors: true,
    skillTag: 'builder',
  },
  eat: { action: 'eat', label: 'Eat', doing: 'eating', place: 'kitchen', work: 20, outdoors: false },
  pray: { action: 'pray', label: 'Pray', doing: 'praying', place: 'masjid', work: 15, outdoors: false },
  shelter: {
    action: 'shelter',
    label: 'Shelter',
    doing: 'sheltering',
    place: 'masjid',
    work: 60,
    outdoors: false,
  },
  sleep: { action: 'sleep', label: 'Sleep', doing: 'asleep', place: 'home-yusuf', work: 0, outdoors: false },
  rest: {
    action: 'rest',
    label: 'Rest',
    doing: 'resting at home',
    place: 'home-yusuf',
    work: 15,
    outdoors: false,
  },
  'carry-injured': {
    action: 'carry-injured',
    label: 'Carry the injured',
    doing: 'carrying',
    place: 'home-yusuf',
    work: 0,
    outdoors: true,
  },
};

/** Build stages; stage 7 is the roof beam (spec §2). */
export const HOUSE_STAGES = 10;
export const BEAM_STAGE = 7;
export const ORDER_LIFETIME = 120;

// ---------------------------------------------------------------------------------------------
// Villagers (spec §5 "Six villagers")
// ---------------------------------------------------------------------------------------------

export type VillagerId = 'maryam' | 'yusuf' | 'tariq' | 'idris' | 'samira' | 'danyal';
export type Role = 'cook' | 'builder' | 'apprentice' | 'forester' | 'gatherer' | 'well-keeper';
export type Look = 'headscarf' | 'cap' | 'bare';

export interface VillagerSpec {
  id: VillagerId;
  index: number;
  name: string;
  age: number;
  role: Role;
  /** Classic skill tag (doubles speed at the matching job). */
  skillTag: SkillTag | null;
  /** Human-side skill levels (framework ids), for the adapter. */
  skills: Record<string, number>;
  home: PlaceId;
  look: Look;
  /** Drawn a head shorter. */
  short: boolean;
  /** Starting satiety 0..1 (spec: 0.45, Idris lower). Classic hunger = 100 × (1 − satiety). */
  satiety: number;
  /** Starting trust in the player's voice. */
  trust: number;
  /** Holds the `salah` norm (all but Danyal). */
  prays: boolean;
  line: string;
}

export const VILLAGERS: readonly VillagerSpec[] = [
  {
    id: 'maryam',
    index: 0,
    name: 'Hajja Maryam',
    age: 68,
    role: 'cook',
    skillTag: 'cook',
    skills: { cooking: 0.8, farming: 0.3 },
    home: 'home-maryam',
    look: 'headscarf',
    short: false,
    satiety: 0.45,
    trust: 0.5,
    prays: true,
    line: 'Widow, everyone’s grandmother. Cooks at 06:30, 12:00 and 18:00 by habit.',
  },
  {
    id: 'yusuf',
    index: 1,
    name: 'Yusuf',
    age: 34,
    role: 'builder',
    skillTag: 'builder',
    skills: { building: 0.7, forestry: 0.4, cooking: 0.1 },
    home: 'home-yusuf',
    look: 'bare',
    short: false,
    satiety: 0.45,
    trust: 0.5,
    prays: true,
    line: 'Maryam’s son, Tariq’s father. Keeps promises; prays on time.',
  },
  {
    id: 'tariq',
    index: 2,
    name: 'Tariq',
    age: 16,
    role: 'apprentice',
    skillTag: null,
    skills: { building: 0.3, forestry: 0.3, cooking: 0.2 },
    home: 'home-maryam',
    look: 'bare',
    short: true,
    satiety: 0.45,
    trust: 0.75,
    prays: true,
    line: 'Yusuf’s son. Eager, learns fast, trusts your voice most.',
  },
  {
    id: 'idris',
    index: 3,
    name: 'Idris',
    age: 41,
    role: 'forester',
    skillTag: 'forester',
    skills: { forestry: 0.7, building: 0.3, cooking: 0.1 },
    home: 'home-idris',
    look: 'bare',
    short: false,
    satiety: 0.3,
    trust: 0.5,
    prays: true,
    line: 'Forester, Yusuf’s friend. Low fear, high ambition: the cedar tempts him.',
  },
  {
    id: 'samira',
    index: 4,
    name: 'Samira',
    age: 29,
    role: 'gatherer',
    skillTag: null,
    skills: { farming: 0.6, cooking: 0.25, forestry: 0.2 },
    home: 'home-idris',
    look: 'headscarf',
    short: false,
    satiety: 0.45,
    trust: 0.5,
    prays: true,
    line: 'Idris’s wife. Careful; weighs risk double and offers to go “with someone”.',
  },
  {
    id: 'danyal',
    index: 5,
    name: 'Danyal',
    age: 52,
    role: 'well-keeper',
    skillTag: null,
    skills: { farming: 0.4, cooking: 0.2 },
    home: 'wellhouse',
    look: 'cap',
    short: false,
    satiety: 0.45,
    trust: 0.5,
    prays: false,
    line: 'Christian widower, Maryam’s old friend. Keeps the well and his own grain jar.',
  },
];

export function villagerById(id: string): VillagerSpec | undefined {
  return VILLAGERS.find((v) => v.id === id);
}

/** Where each villager starts at Fajr: outside their own door. */
export function startTile(v: VillagerSpec): Tile {
  return homeDoor(v);
}

export function homeDoor(v: VillagerSpec): Tile {
  return spotFor(v.home, v.index);
}

// ---------------------------------------------------------------------------------------------
// Per-side world state (one instance per pane)
// ---------------------------------------------------------------------------------------------

export interface HouseState {
  /** 0..10 completed stages. */
  stage: number;
  shuttered: boolean;
}

export interface SideWorld {
  minute: Minute;
  resources: Resources;
  house: HouseState;
  cedarFelled: boolean;
  /** Injuries including collapses, counted when they happen. */
  injuries: number;
  deaths: number;
  /** Villager currently drawing water (one at a time), or null. */
  wellUser: VillagerId | null;
}

export const START_RESOURCES: Resources = { grain: 6, water: 2, timber: 6, meals: 0 };
export const START_HOUSE_STAGE = 2;

export function createSideWorld(): SideWorld {
  return {
    minute: 0,
    resources: { ...START_RESOURCES },
    house: { stage: START_HOUSE_STAGE, shuttered: false },
    cedarFelled: false,
    injuries: 0,
    deaths: 0,
    wellUser: null,
  };
}

/**
 * World-level weather effects the engine applies to both sides each minute (so no side can forget them):
 * during the storm, an unshuttered house below the beam stage loses one stage per hour.
 */
export function applyWorldMinute(world: SideWorld, m: Minute): void {
  world.minute = m;
  const w = weatherAt(m);
  if (w.kind === 'storm' && (m - STORM_START) % 60 === 59) {
    if (!world.house.shuttered && world.house.stage < BEAM_STAGE && world.house.stage > 0) {
      world.house.stage -= 1;
    }
  }
}

export function canAfford(r: Resources, cost: Partial<Resources> | undefined): boolean {
  if (!cost) return true;
  return (
    r.grain >= (cost.grain ?? 0) &&
    r.water >= (cost.water ?? 0) &&
    r.timber >= (cost.timber ?? 0) &&
    r.meals >= (cost.meals ?? 0)
  );
}

export function addResources(r: Resources, delta: Partial<Resources> | undefined, sign = 1): void {
  if (!delta) return;
  r.grain += sign * (delta.grain ?? 0);
  r.water += sign * (delta.water ?? 0);
  r.timber += sign * (delta.timber ?? 0);
  r.meals += sign * (delta.meals ?? 0);
}
