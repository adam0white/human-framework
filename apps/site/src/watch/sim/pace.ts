/**
 * Real time to sim minutes (spec §2). Speeds are a continuous clock the Keeper sets; a moment eases play to the
 * tactical speed for a few sim minutes on its own and then hands back the chosen speed. Dusk runs at the slow
 * dusk pace until the Keeper begins the watch. Pacing never touches the rules: it only decides how many whole
 * minutes to step, so outcomes depend on the seed and the input log alone.
 *
 * G3-3: the open seasons step a whole day at a time, so there the same speeds are days per second, up to
 * `seasons` (a season in about thirteen seconds). A season card slows play to the tactical pace while it is open;
 * nothing pauses. The first dusk of a winter sets `watch`.
 *
 * After the owner's playtest (2026-10-05):
 * - The open seasons run themselves: entering them sets `seasons`, a card slows play as before, and news written
 *   into the chronicle (a birth, an arrival, the harvest) eases play to `days` for a few days so it can be read.
 * - A slowdown hands the chosen speed back over about a second and a half instead of at once, so the end of a
 *   moment no longer reads as the clock jumping.
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
/** Real milliseconds over which a slowdown hands the chosen speed back. */
export const RAMP_MS = 1500;
/** Sim days the open seasons run at `days` after news is written into the chronicle. */
export const NEWS_DAYS = 5;
const DAY_MINUTES = 1440;

export class Pacer {
  speed: Speed = 'watch';
  /** The chronicle is open: the only thing that stops the clock (spec §2). */
  held = false;
  private acc = 0;
  /** Whether the last tick was in the open seasons (for the speed a season or a winter starts at). */
  private wasSeason: boolean | null = null;
  /** The rate a slowdown ended at, and the real time since: the chosen speed comes back over `RAMP_MS`. */
  private rampFrom: number | null = null;
  private rampMs = 0;
  private wasSlowed = false;
  private slowRate = 0;
  /** The chronicle's length last seen, and the sim minute news eases the seasons until. */
  private lines = -1;
  private newsUntil = -1;

  /** How far into the next minute real time has carried (0..1), for drawing between minutes. */
  get progress(): number {
    return this.acc;
  }

  /** Whether a moment (or, in the seasons, a card or fresh news) is easing play right now. */
  slowed(run: WatchRun): boolean {
    const s = run.state;
    if (isSeason(s)) return s.card !== null || this.news(run);
    return s.phase === 'night' && s.minute < s.slowUntil;
  }

  /** Fresh news in the open seasons, while the Keeper runs them faster than `days`. */
  private news(run: WatchRun): boolean {
    return run.state.minute < this.newsUntil && DAY_RATE[this.speed] > DAY_RATE.days;
  }

  /** The rate the clock should run at now (sim minutes, or in the seasons days, per real second). */
  rate(run: WatchRun): number {
    const s = run.state;
    if (s.phase === 'dusk') return DUSK_RATE;
    if (isSeason(s)) {
      if (s.card) return DAY_RATE.tactical;
      return this.news(run) ? DAY_RATE.days : DAY_RATE[this.speed];
    }
    if (s.phase !== 'night') return 0;
    // A card is open: 1/16 of the watch speed while the Keeper reads it.
    if (s.moment && s.minute < s.moment.until) return DUSK_RATE;
    const chosen = RATE[this.speed];
    return this.slowed(run) ? Math.min(chosen, RATE.tactical) : chosen;
  }

  /**
   * The rate the clock actually runs at: `rate`, except that after a slowdown the chosen speed comes back over
   * `RAMP_MS` of real time. Slowing down is always at once.
   */
  paced(run: WatchRun): number {
    const target = this.rate(run);
    if (this.rampFrom === null || this.rampFrom >= target) return target;
    return this.rampFrom + (target - this.rampFrom) * Math.min(1, this.rampMs / RAMP_MS);
  }

  /** Tracks slowdowns and news for `paced` and `rate` (real time `dtMs` has passed). */
  private watch(run: WatchRun, dtMs: number): void {
    const s = run.state;
    const slowed = this.slowed(run);
    if (slowed) {
      this.rampFrom = null;
      this.slowRate = this.rate(run);
    } else if (this.wasSlowed) {
      this.rampFrom = this.slowRate;
      this.rampMs = 0;
    } else if (this.rampFrom !== null) {
      this.rampMs += dtMs;
      if (this.rampMs >= RAMP_MS) this.rampFrom = null;
    }
    this.wasSlowed = slowed;
    const n = s.chronicle.length;
    if (this.lines >= 0 && n > this.lines && isSeason(s)) this.newsUntil = s.minute + NEWS_DAYS * DAY_MINUTES;
    this.lines = n;
  }

  /** Steps the run for `dtMs` of real time. Returns the minutes stepped. */
  tick(run: WatchRun, dtMs: number): number {
    this.follow(run);
    this.watch(run, Math.max(0, dtMs));
    if (this.held || !clockRuns(run.state)) {
      this.acc = 0;
      return 0;
    }
    let stepped = 0;
    let budget = Math.max(0, dtMs) / 1000;
    while (budget > 0 && stepped < MAX_STEPS_PER_TICK && clockRuns(run.state)) {
      // Re-read the rate after every minute: a moment may have just slowed play.
      const rate = this.paced(run);
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
    this.rampFrom = null;
    this.wasSlowed = false;
    this.lines = -1;
    this.newsUntil = -1;
    this.wasSeason = s.phase === 'goal' ? null : isSeason(s) || s.phase === 'fair';
    if (s.phase === 'dusk' || s.phase === 'night') {
      if (this.speed === 'days' || this.speed === 'seasons') this.speed = 'watch';
    } else if (isSeason(s)) this.speed = 'seasons';
  }

  /** Sets the speed a season or a winter starts at when the run crosses into it. */
  follow(run: WatchRun): void {
    const s = run.state;
    const season = isSeason(s);
    if (this.wasSeason !== true && season) this.speed = 'seasons';
    if (this.wasSeason === true && s.phase === 'dusk') this.speed = 'watch';
    if (season || s.phase === 'dusk' || s.phase === 'night') this.wasSeason = season;
  }
}
