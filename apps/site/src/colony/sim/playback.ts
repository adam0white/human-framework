/**
 * Clock/UI playback only. Pending suggestions slow the clock to one sim minute per real second until answered,
 * dismissed, expired or acknowledged. Narrative moments, verdicts and weather never interrupt time.
 * Manual/start pauses remain explicit. None of this changes sim state, inputs or replay rules.
 */
import {
  makePlaytestFile,
  type PlaytestFile,
  type ReplayResult,
  replayResult,
} from '../../shared/playtest.ts';
import type { MainToWorker, PauseInfo, PauseReason, PlaybackState, Speed, WorkerReply } from '../protocol.ts';
import { ColonyGame, type LogEntry, SCENARIO_VERSION } from './game.ts';
import type { HumanSideFactory } from './human-side.ts';
import { colonyHash, colonySnapshot, colonyState, parseColonyPlaytest, replayColony } from './playtest.ts';
import { type Minute, SIM_MINUTES_PER_SECOND, type VillagerId } from './world-types.ts';
/** Never advance more than this many sim minutes per tick (a backgrounded tab must not fast-forward). */
export const MAX_MINUTES_PER_TICK = 8;
/** Pending choices stay readable while the simulation continues. */
const DECISION_MINUTES_PER_SECOND = 1;
/** Longest real-time step one tick may account for. */
const MAX_DT_MS = 250;

/** Historical verdict classification retained for the level-up control. Verdicts never alter today's clock. */
export const passesByItself = (v: { kind: string; reason: string }): boolean =>
  v.kind === 'notNow' &&
  (v.reason.startsWith('need:') || v.reason.startsWith('commitment:salah') || v.reason === 'norm:salah');

export const START_TEXT =
  'Before the storm at Day 2 19:00: roof the house and store 12 meals. Keep all six alive until dawn on Day 3.';
export const LOADED_TEXT = 'Playtest file loaded. Play on from here, or look around.';
export const DAY3_TEXT =
  'Another day: build a store-room beside the house (finish the house first if it is open) and keep 12 meals by 18:00. Keep all six alive.';

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
  private endedSent = false;
  /** Playback acknowledgements do not settle suggestions or enter the simulation log. */
  private acknowledged = new Set<string>();

  private readonly factory: HumanSideFactory;

  constructor(factory: HumanSideFactory) {
    this.factory = factory;
  }

  state(): PlaybackState {
    return {
      paused: this.paused,
      pause: this.pause,
      speed: this.speed,
      autoPause: this.autoPause,
      slowMo: !this.paused && this.pause?.kind === 'auto',
    };
  }

  private frame(): WorkerReply[] {
    const g = this.game;
    if (!g) return [];
    this.syncDecision();
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

  /** This run as a playtest file (its `build` is filled in by the page). `engine`: the framework's ENGINE_VERSION. */
  async playtestFile(engine: string, full = false): Promise<PlaytestFile<LogEntry>> {
    const g = this.game;
    if (!g) throw new Error('No run to save yet.');
    return makePlaytestFile({
      game: 'colony',
      seed: g.seed,
      scenario: g.scenarioVersion,
      minute: g.minute,
      log: structuredClone(g.log),
      hash: colonyHash(g),
      engine,
      snapshot: full ? colonyState(g) : colonySnapshot(g),
      ...(full ? { plainSnapshot: true } : {}),
    });
  }

  /**
   * Validate a playtest file and replay its seed and log to its minute; only then does it replace the current run
   * (a bad file throws and leaves the run as it was). Returns the comparison and the replies for the new run.
   */
  load(text: string, engine: string): { result: ReplayResult; replies: WorkerReply[] } {
    // An older save replays under the rules it was played with (colony.md, "2026-10-19 level-up").
    const { file: f, rules } = parseColonyPlaytest(text);
    const g = replayColony(f.seed, this.factory, f.log, f.minute, rules);
    const result = replayResult(f, colonyHash(g), engine, g.minute);
    this.game = g;
    this.carry = 0;
    this.endedSent = false;
    this.acknowledged = new Set();
    this.stop(
      'manual',
      g.scenarioVersion === SCENARIO_VERSION
        ? LOADED_TEXT
        : `${LOADED_TEXT} It was saved under the older rules (${g.scenarioVersion}) and plays on under them.`,
    );
    return { result, replies: this.frame() };
  }

  /** Handle one message from the page; returns the replies (without the run number). */
  handle(msg: MainToWorker): WorkerReply[] {
    switch (msg.type) {
      case 'telemetry':
      case 'exportPlaytest':
      case 'loadPlaytest':
        // Handled by the worker (async export; the load changes the run number).
        return [];
      case 'init':
        if (msg.scenarioVersion !== SCENARIO_VERSION) {
          this.game = null;
          return [{ type: 'error', message: `scenario ${msg.scenarioVersion} is not ${SCENARIO_VERSION}` }];
        }
        this.game = new ColonyGame(msg.seed, this.factory, undefined, msg.village);
        this.carry = 0;
        this.endedSent = false;
        this.acknowledged = new Set();
        this.autoPause = msg.autoPause;
        this.stop('start', START_TEXT);
        return this.frame();
      case 'tick':
        return this.tick(msg.dtMs);
      case 'setSpeed':
        this.speed = msg.speed;
        return this.frame();
      case 'pause':
        if (msg.cause !== 'inspector') this.stop('manual', 'Paused');
        return this.frame();
      case 'resume':
        if (this.pause?.kind === 'auto') {
          for (const n of this.game?.visibleNudges() ?? []) this.acknowledged.add(n.id);
        }
        this.resume();
        return this.frame();
      case 'setAutoPause':
        this.autoPause = msg.on;
        return this.frame();
      case 'order':
        // Any order that settles the pausing suggestion resumes, also one typed in the composer without `nudgeId`.
        this.game?.issue(msg.input, msg.nudgeId);
        return this.frame();
      case 'cancel':
        this.game?.cancel(msg.orderId);
        return this.frame();
      case 'dismissNudge':
        this.game?.dismissNudge(msg.id);
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

  /** Keep only a live unanswered suggestion in clock metadata; explicit pauses take precedence. */
  private syncDecision(): void {
    if (this.paused) return;
    const n =
      this.autoPause && !this.game?.ended
        ? this.game?.visibleNudges().find((nudge) => !this.acknowledged.has(nudge.id))
        : undefined;
    this.pause = n
      ? {
          kind: 'auto',
          reason: 'suggestion',
          text: n.text,
          nudgeId: n.id,
          personId: n.order.personId,
          minute: this.game?.minute ?? 0,
        }
      : null;
  }

  private tick(dtMs: number): WorkerReply[] {
    const g = this.game;
    if (!g || this.paused || g.ended) return [];
    const dt = Math.max(0, Math.min(dtMs, MAX_DT_MS));
    this.syncDecision();
    const chosenRate = SIM_MINUTES_PER_SECOND * this.speed;
    const rate = this.state().slowMo ? Math.min(chosenRate, DECISION_MINUTES_PER_SECOND) : chosenRate;
    this.carry += (dt / 1000) * rate;
    const whole = Math.min(MAX_MINUTES_PER_TICK, Math.floor(this.carry));
    if (whole <= 0) return [];
    this.carry -= whole;
    this.step(whole);
    // The Solo control keeps pace with play, so the end report has nothing left to simulate.
    g.advanceSolo();
    return this.frame();
  }

  /** Step whole sim minutes, dropping fast-clock carry when a new pending decision appears. */
  step(minutes: number): number {
    const g = this.game;
    if (!g) return 0;
    let n = 0;
    for (; n < minutes && !g.ended; ) {
      const wasSlow = this.state().slowMo;
      g.advance(1);
      n += 1;
      this.syncDecision();
      if (!wasSlow && this.state().slowMo) {
        this.carry = 0;
        break;
      }
    }
    return n;
  }
}

/**
 * One pause from the reasons of one minute (colony.md §8): candidates come in table order (suggestion, refusal,
 * moment, storm); the first names the pause and the others follow it in the text.
 */
export function coalesce(found: readonly Candidate[], minute: Minute): PauseInfo | null {
  const [first, ...rest] = found;
  if (!first) return null;
  const { reason, text, ...ids } = first;
  return { kind: 'auto', reason, text: [text, ...rest.map((c) => c.text)].join(' · '), minute, ...ids };
}
