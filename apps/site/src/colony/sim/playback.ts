/**
 * Playback: the worker's state machine without `postMessage` (v2 plan §5, §6), so it runs and tests headless.
 * It owns the game, the speed, pause and auto-pause, and turns real time (`tick{dtMs}`) into whole sim minutes.
 *
 * Auto-pause rules (v2 plan §6, as shipped): pause after the minute that caused it, for a suggestion becoming visible
 * (once per nudge), the first Human verdict on a player card that is notNow, willNot or complied (once per card;
 * `cannot` does not pause), a moment (once per moment) and the storm warning and start (once each). Reasons in the same minute
 * coalesce into one pause; the first in that order names it. Stepping stops at the pausing minute and the rest of
 * the tick is dropped. Auto-pause changes only when the player acts, so it is not logged and replay ignores it.
 */
import type { MainToWorker, PauseInfo, PauseReason, PlaybackState, Speed, WorkerReply } from '../protocol.ts';
import { ColonyGame, SCENARIO_VERSION } from './game.ts';
import type { HumanSideFactory } from './human-side.ts';
import {
  type Minute,
  SIM_MINUTES_PER_SECOND,
  STORM_START,
  VILLAGERS,
  type VillagerId,
  WARNING_AT,
} from './world-types.ts';

/** Never advance more than this many sim minutes per tick (a backgrounded tab must not fast-forward). */
export const MAX_MINUTES_PER_TICK = 8;
/** Slow-mo when a moment fires with auto-pause off (spec §7, §8): this fraction of the speed for this many ms. */
const SLOW_FACTOR = 0.25;
const SLOW_MS = 3000;
/** Longest real-time step one tick may account for. */
const MAX_DT_MS = 250;

/** Verdicts that pause, once per card (the first one). `cannot` ("I'm asleep") shows on the card but does not stop play. */
const REFUSALS = new Set(['notNow', 'willNot', 'complied']);

export const START_TEXT =
  'Before the storm at Day 2 19:00: roof the house and store 12 meals. Keep all six alive until dawn on Day 3.';
export const DAY3_TEXT =
  'Another day: build a store-room beside the house (finish the house first if it is open) and keep 12 meals by 18:00. Keep all six alive.';

const firstName = (id: VillagerId): string =>
  (VILLAGERS.find((v) => v.id === id)?.name ?? id).replace(/^Hajja /, '');

export interface Candidate {
  reason: PauseReason;
  text: string;
  nudgeId?: string;
  orderId?: string;
  personId?: VillagerId;
}

export class Playback {
  game: ColonyGame | null = null;
  speed: Speed = 1;
  paused = true;
  pause: PauseInfo | null = null;
  autoPause = true;
  private carry = 0;
  private slowLeft = 0;
  private endedSent = false;
  /** Once-per keys already used (`suggestion:id`, `refusal:order:kind`, `moment:id`, `storm:warning`). */
  private seen = new Set<string>();

  constructor(private readonly factory: HumanSideFactory) {}

  state(): PlaybackState {
    return {
      paused: this.paused,
      pause: this.pause,
      speed: this.speed,
      autoPause: this.autoPause,
      slowMo: this.slowLeft > 0,
    };
  }

  private frame(): WorkerReply[] {
    const g = this.game;
    if (!g) return [];
    const out: WorkerReply[] = [{ type: 'frame', frame: g.frame(), playback: this.state() }];
    if (g.ended && !this.endedSent) {
      this.endedSent = true;
      out.push({ type: 'ended', summary: g.summary() });
    }
    return out;
  }

  private stop(kind: PauseInfo['kind'], text: string, extra: Partial<PauseInfo> = {}): void {
    this.paused = true;
    this.pause = { kind, text, minute: this.game?.minute ?? 0, ...extra };
  }

  private resume(): void {
    this.paused = false;
    this.pause = null;
  }

  /** Handle one message from the page; returns the replies (without the run number). */
  handle(msg: MainToWorker): WorkerReply[] {
    switch (msg.type) {
      case 'init':
        if (msg.scenarioVersion !== SCENARIO_VERSION) {
          this.game = null;
          return [{ type: 'error', message: `scenario ${msg.scenarioVersion} is not ${SCENARIO_VERSION}` }];
        }
        this.game = new ColonyGame(msg.seed, this.factory);
        this.carry = 0;
        this.slowLeft = 0;
        this.endedSent = false;
        this.seen = new Set();
        this.autoPause = msg.autoPause;
        this.stop('start', START_TEXT);
        return this.frame();
      case 'tick':
        return this.tick(msg.dtMs);
      case 'setSpeed':
        this.speed = msg.speed;
        return this.frame();
      case 'pause':
        if (msg.cause === 'inspector') {
          // An existing pause wins: closing the inspector must not resume it.
          if (!this.paused) this.stop('inspector', 'Inspecting');
        } else if (!this.paused || this.pause?.kind === 'inspector') this.stop('manual', 'Paused');
        return this.frame();
      case 'resume':
        this.resume();
        return this.frame();
      case 'setAutoPause':
        this.autoPause = msg.on;
        if (msg.on) this.slowLeft = 0;
        return this.frame();
      case 'order':
        // Any order that settles the pausing suggestion resumes, also one typed in the composer without `nudgeId`.
        this.game?.issue(msg.input, msg.nudgeId);
        for (const id of this.game?.lastSettled ?? []) this.resumeOnAct(id);
        return this.frame();
      case 'cancel':
        this.game?.cancel(msg.orderId);
        return this.frame();
      case 'dismissNudge':
        this.game?.dismissNudge(msg.id);
        this.resumeOnAct(msg.id);
        return this.frame();
      case 'why':
        if (!this.game) return [];
        return [
          {
            type: 'why',
            personId: msg.personId,
            ...(msg.decisionId ? { decisionId: msg.decisionId } : {}),
            why: this.game.why(msg.personId, msg.decisionId),
          },
        ];
      case 'predict':
        if (!this.game) return [];
        return [{ type: 'predicted', requestId: msg.requestId, prediction: this.game.predict(msg.input) }];
      case 'continue':
        if (this.game?.continueDay()) {
          this.endedSent = false;
          this.carry = 0;
          this.stop('start', DAY3_TEXT);
        }
        return this.frame();
    }
  }

  /** Resume on act: the player confirmed or skipped the suggestion that caused the current pause. */
  private resumeOnAct(nudgeId: string): void {
    const p = this.pause;
    if (this.paused && p?.kind === 'auto' && p.reason === 'suggestion' && p.nudgeId === nudgeId)
      this.resume();
  }

  private tick(dtMs: number): WorkerReply[] {
    const g = this.game;
    if (!g || this.paused || g.ended) return [];
    const dt = Math.max(0, Math.min(dtMs, MAX_DT_MS));
    this.carry += (dt / 1000) * SIM_MINUTES_PER_SECOND * this.speed * (this.slowLeft > 0 ? SLOW_FACTOR : 1);
    this.slowLeft = Math.max(0, this.slowLeft - dt);
    const whole = Math.min(MAX_MINUTES_PER_TICK, Math.floor(this.carry));
    if (whole <= 0) return [];
    this.carry -= whole;
    this.step(whole);
    return this.frame();
  }

  /** Step up to `minutes` sim minutes, stopping at the first minute that auto-pauses. Returns minutes stepped. */
  step(minutes: number): number {
    const g = this.game;
    if (!g) return 0;
    let n = 0;
    for (; n < minutes && !g.ended; ) {
      const before = new Set(g.visibleNudges().map((x) => x.id));
      g.advance(1);
      n += 1;
      if (!this.autoPause && g.lastStep.moments.length > 0) this.slowLeft = SLOW_MS;
      const pause = coalesce(this.candidates(before), g.minute);
      if (!pause || !this.autoPause) continue;
      this.paused = true;
      this.pause = pause;
      this.carry = 0;
      break;
    }
    return n;
  }

  /** Auto-pause reasons the last stepped minute produced, in table order; marks each once-per key as used. */
  private candidates(visibleBefore: ReadonlySet<string>): Candidate[] {
    const g = this.game;
    if (!g) return [];
    const out: Candidate[] = [];
    const once = (key: string): boolean => {
      if (this.seen.has(key)) return false;
      this.seen.add(key);
      return true;
    };
    for (const n of g.visibleNudges()) {
      if (visibleBefore.has(n.id) || !once(`suggestion:${n.id}`)) continue;
      out.push({ reason: 'suggestion', text: n.text, nudgeId: n.id, personId: n.order.personId });
    }
    for (const v of g.lastStep.verdicts) {
      if (!REFUSALS.has(v.kind) || !once(`refusal:${v.orderId}`)) continue;
      out.push({
        reason: 'refusal',
        text: `${firstName(v.personId)}: ${v.says}`,
        orderId: v.orderId,
        personId: v.personId,
      });
    }
    for (const m of g.lastStep.moments) {
      if (!once(`moment:${m.id}`)) continue;
      out.push({ reason: 'moment', text: m.line, personId: m.personId });
    }
    const storm = stormAt(g.minute);
    if (storm && once(`storm:${storm.key}`)) out.push({ reason: 'storm', text: storm.text });
    return out;
  }
}

/**
 * One pause from the reasons of one minute (v2 plan §6): candidates come in table order (suggestion, refusal,
 * moment, storm); the first names the pause and the others follow it in the text.
 */
export function coalesce(found: readonly Candidate[], minute: Minute): PauseInfo | null {
  const [first, ...rest] = found;
  if (!first) return null;
  const { reason, text, ...ids } = first;
  return { kind: 'auto', reason, text: [text, ...rest.map((c) => c.text)].join(' · '), minute, ...ids };
}

/** The storm events that pause when the clock reaches them. */
function stormAt(minute: Minute): { key: string; text: string } | null {
  if (minute === WARNING_AT)
    return { key: 'warning', text: 'The sky darkens in the west. The storm comes at 19:00.' };
  if (minute === STORM_START)
    return { key: 'start', text: 'The storm breaks. The roof and the store are judged now.' };
  return null;
}
