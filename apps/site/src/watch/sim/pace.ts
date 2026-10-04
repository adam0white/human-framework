/**
 * Real time to sim minutes (spec §2). Speeds are a continuous clock the Keeper sets; a moment eases play to the
 * tactical speed for a few sim minutes on its own and then hands back the chosen speed. Dusk runs at the slow
 * dusk pace until the Keeper begins the watch. Pacing never touches the rules: it only decides how many whole
 * minutes to step, so outcomes depend on the seed and the input log alone.
 *
 * G3-3: the open seasons step a whole day at a time, so there the same speeds are days per second, up to
 * `seasons` (a season in about thirteen seconds). A season card slows play to the tactical pace while it is open;
 * nothing pauses. Entering the seasons from a page sets `days` (unless the Keeper chose `seasons`), and the first
 * dusk of a winter sets `watch`.
 */
import { clockRuns } from './night.ts';
import type { WatchRun } from './run.ts';
import { isSeason } from './season.ts';

export type Speed = 'tactical' | 'watch' | 'fast' | 'days' | 'seasons';

/** Sim minutes per real second. At `watch` a 12-hour night takes three real minutes. */
export const RATE: Record<Speed, number> = { tactical: 1, watch: 4, fast: 12, days: 30, seasons: 60 };
/** Days per real second in the open seasons. At `days` a season of ninety days takes about forty-five seconds. */
export const DAY_RATE: Record<Speed, number> = { tactical: 0.15, watch: 0.5, fast: 1, days: 2, seasons: 7 };
/** Dusk: 1/16 of `watch`, so the hour of posting lasts about four real minutes unless the Keeper begins. */
export const DUSK_RATE = 0.25;
/** Never step more than this many minutes on one tick (a backgrounded tab returns in one piece). */
const MAX_STEPS_PER_TICK = 20;

export class Pacer {
  speed: Speed = 'watch';
  /** The chronicle is open: the only thing that stops the clock (spec §2). */
  held = false;
  private acc = 0;
  /** Whether the last tick was in the open seasons (for the speed a season or a winter starts at). */
  private wasSeason: boolean | null = null;

  /** How far into the next minute real time has carried (0..1), for drawing between minutes. */
  get progress(): number {
    return this.acc;
  }

  /** Whether a moment is easing play right now. */
  slowed(run: WatchRun): boolean {
    const s = run.state;
    if (isSeason(s)) return s.card !== null;
    return s.phase === 'night' && s.minute < s.slowUntil;
  }

  rate(run: WatchRun): number {
    const s = run.state;
    if (s.phase === 'dusk') return DUSK_RATE;
    if (isSeason(s)) return s.card ? DAY_RATE.tactical : DAY_RATE[this.speed];
    if (s.phase !== 'night') return 0;
    // A card is open: 1/16 of the watch speed while the Keeper reads it.
    if (s.moment && s.minute < s.moment.until) return DUSK_RATE;
    const chosen = RATE[this.speed];
    return this.slowed(run) ? Math.min(chosen, RATE.tactical) : chosen;
  }

  /** Steps the run for `dtMs` of real time. Returns the minutes stepped. */
  tick(run: WatchRun, dtMs: number): number {
    this.follow(run);
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
    this.follow(run);
    return stepped;
  }

  /**
   * Takes up another run (a loaded page) without a fresh Pacer: the chosen speed and the chronicle's hold stay,
   * the part-minute is dropped, and where the run stands decides what `follow` does next.
   */
  adopt(run: WatchRun): void {
    const s = run.state;
    this.acc = 0;
    this.wasSeason = s.phase === 'goal' ? null : isSeason(s) || s.phase === 'fair';
    if (s.phase === 'dusk' || s.phase === 'night') {
      if (this.speed === 'days' || this.speed === 'seasons') this.speed = 'watch';
    } else if (isSeason(s) && this.speed !== 'seasons') this.speed = 'days';
  }

  /** Sets the speed a season or a winter starts at when the run crosses into it. */
  follow(run: WatchRun): void {
    const s = run.state;
    const season = isSeason(s);
    if (this.wasSeason !== true && season && this.speed !== 'seasons') this.speed = 'days';
    if (this.wasSeason === true && s.phase === 'dusk') this.speed = 'watch';
    if (season || s.phase === 'dusk' || s.phase === 'night') this.wasSeason = season;
  }
}
