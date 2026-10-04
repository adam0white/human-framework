/**
 * The G3-1 gate, headless: dusk planning against the scout's warning visibly matters. Each seed plays three
 * nights with one plan applied at every dusk and no night inputs; outcomes are sacks lost.
 */
import { describe, expect, it } from 'vitest';
import { START_GRAIN } from './config.ts';
import { type PlanName, planInputs } from './plans.ts';
import { WatchRun } from './run.ts';

const SEEDS = Array.from({ length: 24 }, (_, i) => 1000 + i * 7919);
const NIGHTS = 3;

export function playPlan(seed: number, plan: PlanName, lantern: boolean, nights = NIGHTS): number[] {
  const run = new WatchRun(seed);
  run.input({ k: 'start' });
  const lost: number[] = [];
  for (let n = 0; n < nights; n++) {
    for (const i of planInputs(run.state, plan, lantern)) run.input(i);
    run.input({ k: 'begin' });
    while (run.state.phase === 'night') run.step();
    const last = run.state.history.at(-1);
    lost.push(last?.lost ?? 0);
    if (run.state.phase !== 'dawn') break;
    run.input({ k: 'toDusk' });
  }
  return lost;
}

function summarise(plan: PlanName, lantern: boolean) {
  const totals = SEEDS.map((seed) => playPlan(seed, plan, lantern).reduce((a, b) => a + b, 0));
  const firstNight = SEEDS.map((seed) => playPlan(seed, plan, lantern, 1)[0] ?? 0);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const sorted = [...totals].sort((a, b) => a - b);
  return {
    plan,
    lantern,
    meanLost3: mean(totals),
    median3: sorted[Math.floor(sorted.length / 2)] ?? 0,
    fallen: totals.filter((t) => t >= START_GRAIN).length,
    meanNight1: mean(firstNight),
    totals,
  };
}

describe('G3-1 gate: dusk planning against the warning', () => {
  const rows = (['matched', 'usual', 'mismatched'] as const).flatMap((plan) => [
    summarise(plan, false),
    summarise(plan, true),
  ]);
  const row = (plan: PlanName, lantern: boolean) => {
    const r = rows.find((x) => x.plan === plan && x.lantern === lantern);
    if (!r) throw new Error('missing row');
    return r;
  };

  it('prints the table', () => {
    for (const r of rows)
      console.log(
        `${r.plan.padEnd(10)} lantern=${String(r.lantern).padEnd(5)} mean lost over ${NIGHTS} nights ${r.meanLost3.toFixed(2)} median ${r.median3} fallen ${r.fallen}/${SEEDS.length} night-1 mean ${r.meanNight1.toFixed(2)}`,
      );
    expect(rows).toHaveLength(6);
  });

  it('a plan that matches the warning loses clearly fewer sacks than no plan, which loses fewer than a wrong plan', () => {
    for (const lantern of [false, true]) {
      const m = row('matched', lantern).meanLost3;
      const u = row('usual', lantern).meanLost3;
      const x = row('mismatched', lantern).meanLost3;
      expect(u - m).toBeGreaterThan(1.5);
      expect(x - u).toBeGreaterThan(0.5);
    }
  });

  it('the matched plan beats the mismatched one on most seeds, not just on average', () => {
    const m = row('matched', true).totals;
    const x = row('mismatched', true).totals;
    const wins = m.filter((v, i) => v < (x[i] ?? 0)).length;
    expect(wins).toBeGreaterThanOrEqual(Math.ceil(SEEDS.length * 0.75));
  });

  it('the lantern at the warned approach adds to a matched plan', () => {
    expect(row('matched', true).meanLost3).toBeLessThan(row('matched', false).meanLost3);
  });
});
