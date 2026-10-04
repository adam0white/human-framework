/** Messages between the Night Watch page and its worker. Every reply echoes the run's `gen`. */
import type { Input } from './sim/night.ts';
import type { Speed } from './sim/pace.ts';
import type { PlaytestExport } from './sim/run.ts';
import type { Frame } from './sim/view.ts';
import type { PageInfo } from './store.ts';

export { WATCH_SCENARIO_VERSION } from './sim/run.ts';
export type { PageInfo } from './store.ts';

export type MainToWorker =
  | { type: 'init'; seed: number; gen: number; scenarioVersion: number }
  | { type: 'tick'; dtMs: number }
  | { type: 'input'; input: Input }
  | { type: 'speed'; speed: Speed }
  | { type: 'hold'; on: boolean }
  | { type: 'export'; requestId: number }
  /** List the saved pages (answered with `shelf`). */
  | { type: 'shelf' }
  /** Resume a saved page as a new run generation. */
  | { type: 'load'; id: string; gen: number };

export type WorkerReply =
  | { type: 'frame'; frame: Frame; speed: Speed }
  | { type: 'exported'; requestId: number; data: PlaytestExport }
  /** The saved pages, newest first ([] without storage), and whether this run's saves are being kept. */
  | { type: 'shelf'; pages: PageInfo[]; saving: boolean; current: string }
  /** A load finished: `ok` false if the page was gone or unreadable (the old run goes on). */
  | { type: 'loaded'; ok: boolean; id: string; seed?: number }
  | { type: 'error'; message: string };

export type WorkerToMain = WorkerReply & { gen: number };
