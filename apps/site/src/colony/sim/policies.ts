/**
 * Headless player policies for Game 1 (balance tests and the end screen's hindsight replay). Each pattern is a
 * player who issues orders minute by minute before the step. Pure and deterministic: a fresh `ColonyGame` per run.
 */
import { ColonyGame, DEFAULT_SEED, type GoalView } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import type { PlaceId } from './map.ts';
import type { OrderInput } from './orders.ts';
import { at, DAY3_END, END_MINUTE, STORM_START, type VillagerId } from './world-types.ts';

export type Pattern = (g: ColonyGame, m: number) => void;
export type Plan = (m: number) => Partial<Record<VillagerId, PlaceId>>;

const IDS: VillagerId[] = ['maryam', 'yusuf', 'tariq', 'idris', 'samira', 'danyal'];

/** Re-issue each villager's planned place when they have no open card and `gap` minutes passed since the last. */
export function standing(plan: Plan, gap: number, extra?: Partial<OrderInput>): Pattern {
  const last: Record<string, number> = {};
  return (g, m) => {
    const mod = (300 + m) % 1440;
    if (mod >= 21 * 60 + 30 || mod < 5 * 60) return; // players sleep too
    for (const [id, place] of Object.entries(plan(m)) as [VillagerId, PlaceId][]) {
      if (g.book.activeFor(id).length > 0) continue;
      if (m - (last[id] ?? -9999) < gap) continue;
      last[id] = m;
      g.issue({ personId: id, placeId: place, ...extra });
    }
  };
}

/** Everyone but the cook builds; the cook stocks the store on Day 2 afternoon. */
export const GOOD2: Plan = (m) => {
  const plan: Partial<Record<VillagerId, PlaceId>> = {
    yusuf: 'site',
    tariq: 'site',
    idris: 'site',
    samira: 'site',
    danyal: 'site',
  };
  if (m >= at(2, 13, 0) && m < at(2, 18, 0)) plan.maryam = 'kitchen';
  return plan;
};

const ALL =
  (place: PlaceId): Plan =>
  () =>
    Object.fromEntries(IDS.map((i) => [i, place]));

export interface SideResult {
  stormMeals: number;
  stormHouse: number;
  endMeals: number;
  endHouse: number;
  roofAt: number | null;
  eaten: number;
  injuries: number;
  deaths: number;
}

export interface RunResult {
  goals: GoalView[];
  /** Day-3 goals when the run went on to "Another day" (the same pattern keeps playing). */
  day3: GoalView[] | null;
  classic: SideResult;
  human: SideResult;
}

export function play(pattern: Pattern, seed = DEFAULT_SEED, day3 = false): RunResult {
  const g = new ColonyGame(seed, createFrameworkHumanSide);
  const storm = { classic: [0, 0], human: [0, 0] };
  const roofAt: Record<'classic' | 'human', number | null> = { classic: null, human: null };
  for (let m = 0; m < END_MINUTE; m++) {
    pattern(g, m);
    g.advance(1);
    for (const k of ['classic', 'human'] as const) {
      const w = k === 'classic' ? g.classicWorld : g.humanWorld;
      if (roofAt[k] === null && w.house.stage >= 10) roofAt[k] = g.minute;
      if (g.minute === STORM_START) storm[k] = [w.resources.meals, w.house.stage + w.house.progress];
    }
  }
  const side = (k: 'classic' | 'human'): SideResult => {
    const w = k === 'classic' ? g.classicWorld : g.humanWorld;
    return {
      stormMeals: storm[k][0] ?? 0,
      stormHouse: Math.round((storm[k][1] ?? 0) * 100) / 100,
      endMeals: w.resources.meals,
      endHouse: w.house.stage,
      roofAt: roofAt[k],
      eaten: w.eaten,
      injuries: w.injuries,
      deaths: w.deaths,
    };
  };
  const goals = g.goals();
  const classic = side('classic');
  const human = side('human');
  let goals3: GoalView[] | null = null;
  if (day3 && g.continueDay()) {
    for (let m = g.minute; m < DAY3_END; m++) {
      pattern(g, m);
      g.advance(1);
    }
    goals3 = g.goals();
  }
  return { goals, day3: goals3, classic, human };
}

/** Follow every director suggestion the minute it shows, with its prefill (Insist on the squall card). */
const suggestions = (): Pattern => (g) => {
  for (const n of g.visibleNudges()) g.issue({ ...n.order, ...(n.prefill ?? {}) }, n.id);
};

export const PATTERNS = {
  none: (): Pattern => () => {},
  suggestions,
  good2rush: (): Pattern => standing(GOOD2, 75, { rush: true }),
  allForest: (): Pattern => standing(ALL('forest'), 75),
  good2insist: (): Pattern => standing(GOOD2, 75, { insist: true }),
};
