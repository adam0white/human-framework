/**
 * Headless balance targets on the shipped seed (v2 plan §1, §14). The locked numbers live in code; nothing here
 * mutates a table. The player patterns live in `policies.ts` (shared with the end screen's hindsight replay).
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SEED, STOCK_GOAL } from './game.ts';
import { PATTERNS, play, type RunResult } from './policies.ts';

const statuses = (r: RunResult, k: 'classic' | 'human', day: 2 | 3 = 2): Record<string, string> =>
  Object.fromEntries((day === 3 ? (r.day3 ?? []) : r.goals).map((goal) => [goal.id, goal[k].status]));

describe('v2 balance on the shipped seed', () => {
  const none = play(PATTERNS.none(), DEFAULT_SEED, true);
  const rush = play(PATTERNS.good2rush(), DEFAULT_SEED, true);
  const forest = play(PATTERNS.allForest());
  const insist = play(PATTERNS.good2insist());
  const sugg = play(PATTERNS.suggestions());
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

  // The five runs' wall-clock budget (under 5 s) is in colony.timing.ts, run by `npm run bench`.
});
