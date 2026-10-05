/**
 * Worker protocol (colony.md §10): the main thread sends `tick{dtMs}` once per animation frame; the worker
 * converts real time to sim minutes (`SIM_MINUTES_PER_SECOND` × speed) and replies with at most one `frame` per
 * tick. The worker starts paused (`pause.kind 'start'`) and decides auto-pauses itself (colony.md §8), so every UI
 * pauses at the same minutes. The sim never reads a clock, so a run is reproducible from the seed and the order log.
 */
import type { PlaytestFile, ReplayResult } from '../shared/playtest.ts';
import type { EndSummary, Frame } from './sim/game.ts';
import type { Prediction, WhyBreakdown } from './sim/human-side.ts';
import type { OrderInput } from './sim/orders.ts';
import type { Minute, VillagerId } from './sim/world-types.ts';

export type Speed = 0.5 | 1 | 2;

export type MainToWorker =
  /** `gen` numbers the run; every reply echoes it so the page can drop replies from a run it replaced. Starts paused. */
  | { type: 'init'; seed: number; scenarioVersion: string; gen: number; autoPause: boolean }
  | { type: 'tick'; dtMs: number }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'pause'; cause?: 'manual' | 'inspector' }
  | { type: 'resume' }
  | { type: 'setAutoPause'; on: boolean }
  /** `nudgeId`: the order came from that suggestion (it settles that card and may resume an auto-pause). */
  | { type: 'order'; input: OrderInput; nudgeId?: string }
  | { type: 'cancel'; orderId: string }
  | { type: 'dismissNudge'; id: string }
  | { type: 'why'; personId: VillagerId; decisionId?: string }
  | { type: 'predict'; requestId: number; input: OrderInput }
  /** "Another day": only honoured when `frame.canContinue`. */
  | { type: 'continue' }
  /** Playtest file: the worker answers `playtest` (the page fills in `build`). */
  | { type: 'exportPlaytest' }
  /** Replay a playtest file's text as run `gen`; answers `replayed` then frames, or `playtestError`. */
  | { type: 'loadPlaytest'; gen: number; text: string };

export type PauseReason = 'suggestion' | 'refusal' | 'moment' | 'storm';

export interface PauseInfo {
  kind: 'start' | 'manual' | 'inspector' | 'auto';
  reason?: PauseReason;
  /** e.g. "Tariq won't go: it is night and he is spent." Coalesced reasons follow the first, separated by " · ". */
  text: string;
  nudgeId?: string;
  orderId?: string;
  personId?: VillagerId;
  minute: Minute;
}

export interface PlaybackState {
  paused: boolean;
  pause: PauseInfo | null;
  speed: Speed;
  autoPause: boolean;
  slowMo: boolean;
}

/** A worker reply before the run number is attached. */
export type WorkerReply =
  /** `Frame.clock` stays the "Day 1 · 06:30" string. */
  | { type: 'frame'; frame: Frame; playback: PlaybackState }
  | { type: 'why'; personId: VillagerId; decisionId?: string; why: WhyBreakdown | null }
  | { type: 'predicted'; requestId: number; prediction: Prediction }
  | { type: 'ended'; summary: EndSummary }
  | { type: 'playtest'; file: PlaytestFile }
  | { type: 'replayed'; result: ReplayResult }
  | { type: 'playtestError'; message: string }
  | { type: 'error'; message: string };

export type WorkerToMain = WorkerReply & { gen: number };
