/** Messages between the Night Watch page and its worker. Every reply echoes the run's `gen`. */
import type { Input } from './sim/night.ts';
import type { Speed } from './sim/pace.ts';
import type { PlaytestExport } from './sim/run.ts';
import type { Frame } from './sim/view.ts';

export { WATCH_SCENARIO_VERSION } from './sim/run.ts';

export type MainToWorker =
  | { type: 'init'; seed: number; gen: number; scenarioVersion: number }
  | { type: 'tick'; dtMs: number }
  | { type: 'input'; input: Input }
  | { type: 'speed'; speed: Speed }
  | { type: 'hold'; on: boolean }
  | { type: 'export'; requestId: number };

export type WorkerReply =
  | { type: 'frame'; frame: Frame; speed: Speed }
  | { type: 'exported'; requestId: number; data: PlaytestExport }
  | { type: 'error'; message: string };

export type WorkerToMain = WorkerReply & { gen: number };
