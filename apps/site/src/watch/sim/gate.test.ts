/**
 * The G3-1 gate, headless: dusk planning against the scout's warning visibly matters. Each seed plays three
 * nights with one plan applied at every dusk and no night inputs; outcomes are sacks lost.
 */

import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { GateResult } from '../../../test/watch/gate-worker.ts';
import type { PlanName } from '../../../test/watch/plans.ts';
import { START_GRAIN } from './config.ts';

const SEEDS = Array.from({ length: 24 }, (_, i) => 1000 + i * 7919);
const NIGHTS = 3;

function summarise(plan: PlanName, lantern: boolean, results: GateResult[]) {
  // One run per seed: night 1 of the three-night run is the first-night figure (a one-night run is its prefix).
  const runs = SEEDS.map((seed) => {
    const found = results.filter((r) => r.seed === seed && r.plan === plan && r.lantern === lantern);
    if (found.length !== 1 || !found[0]) throw new Error(`expected one run for ${seed}/${plan}/${lantern}`);
    return found[0].lost;
  });
  const totals = runs.map((lost) => lost.reduce((a, b) => a + b, 0));
  const firstNight = runs.map((lost) => lost[0] ?? 0);
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
  let rows: ReturnType<typeof summarise>[] = [];
  const workers: Worker[] = [];
  // This also runs if Vitest times out the hook before its pending work settles.
  afterAll(async () => {
    await Promise.all(workers.map((worker) => worker.terminate()));
  });
  // The runs are made once, before the tests, not while collecting them.
  beforeAll(async () => {
    // These CPU-bound runs share no state. Bound workers, and preserve the seed pairing below.
    const count = Math.min(8, availableParallelism());
    const batches = Array.from({ length: count }, (_, i) => SEEDS.filter((_, j) => j % count === i));
    let results: GateResult[];
    try {
      for (const seeds of batches) {
        workers.push(
          new Worker(new URL('../../../test/watch/gate-worker.ts', import.meta.url), {
            workerData: { seeds, nights: NIGHTS },
            execArgv: [],
          }),
        );
      }
      results = (
        await Promise.all(
          workers.map(
            (worker) =>
              new Promise<GateResult[]>((resolve, reject) => {
                worker.once('message', resolve);
                worker.once('error', reject);
                worker.once('exit', (code) =>
                  reject(new Error(`gate worker exited before returning results (${code})`)),
                );
              }),
          ),
        )
      ).flat();
    } finally {
      await Promise.all(workers.map((worker) => worker.terminate()));
    }
    rows = (['matched', 'usual', 'mismatched'] as const).flatMap((plan) => [
      summarise(plan, false, results),
      summarise(plan, true, results),
    ]);
  }, 300_000);
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
      // Without the lantern the margin is smaller (2026-10-05, world streams): every plan now meets the same threats,
      // and the usual posting already loses 17–18 of 20 on half the seeds (the opening's carry cap), so a wrong one
      // has little left to lose: paired by seed it loses more on 5, fewer on 2, the same on 17 (mean +0.33). The
      // old 0.5 margin (1.42 measured) also held the noise of each plan meeting a different schedule.
      expect(x - u).toBeGreaterThan(lantern ? 0.5 : 0.2);
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
