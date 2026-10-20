/** The gate's unmodified three-night simulation, shared by Vitest and native workers. */

import { WatchRun } from '../../src/watch/sim/run.ts';
import type { PlanName } from './plans.ts';
import { planInputs } from './plans.ts';

export function playPlan(seed: number, plan: PlanName, lantern: boolean, nights = 3): number[] {
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
