/**
 * Real time to sim minutes (spec §2). Speeds are a continuous clock the Keeper sets; a moment eases play to the
 * tactical speed for a few sim minutes on its own and then hands back the chosen speed. Dusk runs at the slow
 * dusk pace until the Keeper begins the watch. Pacing never touches the rules: it only decides how many whole
 * minutes to step, so outcomes depend on the seed and the input log alone.
 */
import { clockRuns } from './night.ts';
import type { WatchRun } from './run.ts';

export type Speed = 'tactical' | 'watch' | 'fast';

/** Sim minutes per real second. At `watch` a 12-hour night takes three real minutes. */
export const RATE: Record<Speed, number> = { tactical: 1, watch: 4, fast: 12 };
/** Dusk: 1/16 of `watch`, so the hour of posting lasts about four real minutes unless the Keeper begins. */
export const DUSK_RATE = 0.25;
/** Never step more than this many minutes on one tick (a backgrounded tab returns in one piece). */
const MAX_STEPS_PER_TICK = 20;

export class Pacer {
  speed: Speed = 'watch';
  /** The chronicle is open: the only thing that stops the clock (spec §2). */
  held = false;
  private acc = 0;

  /** How far into the next minute real time has carried (0..1), for drawing between minutes. */
  get progress(): number {
    return this.acc;
  }

  /** Whether a moment is easing play right now. */
  slowed(run: WatchRun): boolean {
    return run.state.phase === 'night' && run.state.minute < run.state.slowUntil;
  }

  rate(run: WatchRun): number {
    const s = run.state;
    if (s.phase === 'dusk') return DUSK_RATE;
    if (s.phase !== 'night') return 0;
    const chosen = RATE[this.speed];
    return this.slowed(run) ? Math.min(chosen, RATE.tactical) : chosen;
  }

  /** Steps the run for `dtMs` of real time. Returns the minutes stepped. */
  tick(run: WatchRun, dtMs: number): number {
    if (this.held || !clockRuns(run.state)) {
      this.acc = 0;
      return 0;
    }
    let stepped = 0;
    let budget = Math.max(0, dtMs) / 1000;
    while (budget > 0 && stepped < MAX_STEPS_PER_TICK && clockRuns(run.state)) {
      // Re-read the rate after every minute: a moment may have just slowed play.
      const rate = this.rate(run);
      const need = 1 - this.acc;
      const gain = budget * rate;
      if (gain < need) {
        this.acc += gain;
        break;
      }
      budget -= need / rate;
      this.acc = 0;
      run.step();
      stepped += 1;
    }
    if (stepped >= MAX_STEPS_PER_TICK) this.acc = 0;
    return stepped;
  }
}
