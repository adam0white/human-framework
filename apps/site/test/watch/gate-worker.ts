/** Native workers run the current source, with the same workspace aliases as vite.config.ts. */
import { registerHooks } from 'node:module';
import { parentPort, workerData } from 'node:worker_threads';
import type { PlanName } from './plans.ts';

export interface GateResult {
  seed: number;
  plan: PlanName;
  lantern: boolean;
  lost: number[];
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier === '@adam0white/human-framework'
        ? new URL('../../../../packages/human/src/index.ts', import.meta.url).href
        : specifier === '@adam0white/lab-client'
          ? new URL('../../../../packages/lab-client/src/index.ts', import.meta.url).href
          : specifier,
      context,
    );
  },
});

const { playPlan } = await import('./gate-plan.ts');
const { seeds, nights } = workerData as { seeds: number[]; nights: number };
const results: GateResult[] = [];
for (const seed of seeds) {
  for (const plan of ['matched', 'usual', 'mismatched'] as const) {
    for (const lantern of [false, true]) {
      results.push({ seed, plan, lantern, lost: playPlan(seed, plan, lantern, nights) });
    }
  }
}
parentPort?.postMessage(results);
