/**
 * Headless balance targets on the shipped seed (v2 plan §1, §14). The locked numbers live in code; nothing here
 * mutates a table. Each pattern is a player who issues orders minute by minute before the step.
 */
import { describe, expect, it } from 'vitest';
import { ColonyGame, DEFAULT_SEED, type GoalView, STOCK_GOAL } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import type { PlaceId } from './map.ts';
import type { OrderInput } from './orders.ts';
import { at, DAY3_END, END_MINUTE, STORM_START, type VillagerId } from './world-types.ts';

type Pattern = (g: ColonyGame, m: number) => void;
type Plan = (m: number) => Partial<Record<VillagerId, PlaceId>>;

const IDS: VillagerId[] = ['maryam', 'yusuf', 'tariq', 'idris', 'samira', 'danyal'];

/** Re-issue each villager's planned place when they have no open card and `gap` minutes passed since the last. */
function standing(plan: Plan, gap: number, extra?: Partial<OrderInput>): Pattern {
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
const GOOD2: Plan = (m) => {
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

const statuses = (r: RunResult, k: 'classic' | 'human', day: 2 | 3 = 2): Record<string, string> =>
  Object.fromEntries((day === 3 ? (r.day3 ?? []) : r.goals).map((goal) => [goal.id, goal[k].status]));

describe('v2 balance on the shipped seed', () => {
  const t0 = performance.now();
  const none = play(PATTERNS.none(), DEFAULT_SEED, true);
  const rush = play(PATTERNS.good2rush(), DEFAULT_SEED, true);
  const forest = play(PATTERNS.allForest());
  const insist = play(PATTERNS.good2insist());
  const sugg = play(PATTERNS.suggestions());
  const ms = performance.now() - t0;
  if (process.env.BALANCE) {
    for (const [name, r] of Object.entries({
      none,
      good2rush: rush,
      allForest: forest,
      good2insist: insist,
      suggestions: sugg,
    })) {
      console.log(name, JSON.stringify({ classic: r.classic, human: r.human }));
      console.log(name, 'C', statuses(r, 'classic'), 'H', statuses(r, 'human'));
      if (r.day3) console.log(name, 'Day 3 C', statuses(r, 'classic', 3), 'H', statuses(r, 'human', 3));
    }
  }

  it('Solo (Human, no orders) narrowly fails the roof and nothing else', () => {
    expect(statuses(none, 'human')).toEqual({ roof: 'failed', stock: 'met', lives: 'met' });
    expect(none.human.stormHouse).toBeGreaterThanOrEqual(9);
  });

  it('the Human store is tight: Solo meets the stock with at most one spare pot and a bit', () => {
    expect(none.human.stormMeals).toBeGreaterThanOrEqual(STOCK_GOAL);
    expect(none.human.stormMeals).toBeLessThanOrEqual(STOCK_GOAL + 6);
  });

  it('Classic with no orders lays in the storm stock but misses the roof (it roofs on some other seeds)', () => {
    expect(statuses(none, 'classic')).toEqual({ roof: 'failed', stock: 'met', lives: 'met' });
  });

  it('good orders (good2rush) win all three goals on both sides', () => {
    expect(statuses(rush, 'classic')).toEqual({ roof: 'met', stock: 'met', lives: 'met' });
    expect(statuses(rush, 'human')).toEqual({ roof: 'met', stock: 'met', lives: 'met' });
  });

  it('hostile orders (all to the forest) lose at least one goal on each side, and cost the Human roof visibly', () => {
    expect(Object.values(statuses(forest, 'classic'))).toContain('failed');
    expect(Object.values(statuses(forest, 'human'))).toContain('failed');
    expect(forest.human.stormHouse).toBeLessThan(none.human.stormHouse - 1);
  });

  it('insisting on every order (good2insist) costs the Human roof', () => {
    expect(statuses(insist, 'human').roof).toBe('failed');
  });

  it('following only the suggestions does not roof the Human house: winning takes your own orders', () => {
    // The cards set up the five moments and carry their costs (the cedar injures Idris, the squall costs trust).
    // Measured: the roof ends near 8.9, below Solo, while Classic, which simply obeys, wins all three.
    expect(statuses(sugg, 'human')).toEqual({ roof: 'failed', stock: 'met', lives: 'met' });
    expect(statuses(sugg, 'classic')).toEqual({ roof: 'met', stock: 'met', lives: 'met' });
  });

  it('Day 3: Solo misses the store-room deadline; good orders meet every Day-3 goal', () => {
    expect(statuses(none, 'human', 3).project).toBe('failed');
    expect(statuses(rush, 'human', 3)).toEqual({ project: 'met', stock: 'met', lives: 'met' });
  });

  it('meals are really eaten: each side eats at least 35 over the run', () => {
    // Not under allForest: a starving Classic village dies before it can eat.
    for (const r of [none, rush]) {
      expect(r.classic.eaten).toBeGreaterThanOrEqual(35);
      expect(r.human.eaten).toBeGreaterThanOrEqual(35);
    }
  });

  it('runs the five games (two with Day 3) in under 5 s', () => {
    console.log(`balance runs: ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(5000);
  });
});
