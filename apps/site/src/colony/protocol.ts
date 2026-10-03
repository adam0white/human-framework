/**
 * Worker protocol (spec §10, adapted to a main-thread clock): the main thread sends `tick{dtMs}` once per
 * animation frame; the worker converts real time to sim minutes (16 per second × speed) and replies with
 * at most one `frame` per tick. The sim itself never reads a clock, so a run is reproducible from the seed
 * and the order log.
 */
import type { EndSummary, Frame } from './sim/game.ts';
import type { Prediction, WhyBreakdown } from './sim/human-side.ts';
import type { OrderInput } from './sim/orders.ts';
import type { VillagerId } from './sim/world-types.ts';

export type Speed = 0.5 | 1 | 2;

export type MainToWorker =
  /** `gen` numbers the run; every reply echoes it so the page can drop replies from a run it replaced. */
  | { type: 'init'; seed: number; scenarioVersion: string; gen: number }
  | { type: 'tick'; dtMs: number }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'order'; input: OrderInput }
  | { type: 'cancel'; orderId: string }
  | { type: 'dismissNudge'; id: string }
  | { type: 'why'; personId: VillagerId; decisionId?: string }
  | { type: 'predict'; requestId: number; input: OrderInput };

/** A worker reply before the run number is attached. */
export type WorkerReply =
  | { type: 'frame'; frame: Frame; paused: boolean; speed: Speed; slowMo: boolean }
  | { type: 'why'; personId: VillagerId; decisionId?: string; why: WhyBreakdown | null }
  | { type: 'predicted'; requestId: number; prediction: Prediction }
  | { type: 'ended'; summary: EndSummary }
  | { type: 'error'; message: string };

export type WorkerToMain = WorkerReply & { gen: number };
