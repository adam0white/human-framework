/**
 * A headless Keeper for long runs (G3-3): plays the game's own world year after year with a plain policy. At dusk
 * the watch concentrates on the warned stretch (the `matched` plan) with the lantern there; night cards are left to the person; at the
 * fair the offers are taken in order while grain allows; proposal cards get a blessing. Used by the multi-year
 * tests and the 50-year check.
 */

import { WatchRun } from '../../src/watch/sim/run.ts';
import { isSeason } from '../../src/watch/sim/season.ts';
import type { WatchState } from '../../src/watch/sim/state.ts';
import { planInputs } from './plans.ts';

/** Called once as each year ends (at the next winter's first dusk) and once if the village falls. */
export type YearHook = (s: WatchState, year: number) => void;

/** Plays `years` whole years (to the first dusk of year `years + 1`), until the village falls or until `stop`. */
export function playYears(
  seed: number,
  years: number,
  onYear?: YearHook,
  stop?: (s: WatchState) => boolean,
): WatchRun {
  const run = new WatchRun(seed);
  run.input({ k: 'start' });
  let year = 1;
  for (let guard = 0; guard < 50_000_000; guard++) {
    const s = run.state;
    if (stop?.(s)) return run;
    if (s.year !== year) {
      onYear?.(s, year);
      year = s.year;
    }
    if (s.phase === 'fallen') {
      onYear?.(s, year);
      return run;
    }
    if (s.year > years) return run;
    switch (s.phase) {
      case 'goal':
        run.input({ k: 'start' });
        break;
      case 'dusk':
        for (const i of planInputs(s, 'matched', true)) run.input(i);
        run.input({ k: 'begin' });
        break;
      case 'night':
        run.step();
        break;
      case 'dawn':
        run.input({ k: 'toDusk' });
        break;
      case 'thaw':
      case 'closed':
        run.input({ k: 'continue' });
        break;
      case 'fair':
        // Keep enough grain for the winter: buy only what leaves twenty-two sacks.
        for (const o of s.fair?.offers ?? [])
          if (run.state.grain - o.cost >= 22) run.input({ k: 'fair', pick: o.id });
        run.input({ k: 'continue' });
        break;
      default:
        if (!isSeason(s)) throw new Error(`no policy for ${s.phase}`);
        if (s.card) run.input({ k: 'card', id: s.card.id, choice: 'bless' });
        run.step();
    }
  }
  throw new Error('playYears did not finish');
}
