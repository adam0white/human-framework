import type { CastChapter } from '../shared/cast-chapter.ts';
import type { CastReply, CastRequest } from '../shared/cast-runtime.ts';
import type { TelemetryReply, TelemetryRequest } from '../shared/worker-telemetry.ts';
/** Messages between the Night Watch page and its worker. Every reply echoes the run's `gen`. */
import type { Input } from './sim/night.ts';
import type { Speed } from './sim/pace.ts';
import type { PlaytestExport } from './sim/run.ts';
import type { Frame } from './sim/view.ts';
import type { PageInfo } from './store.ts';

export { WATCH_SCENARIO_VERSION } from './sim/run.ts';
export type { PageInfo } from './store.ts';

export type MainToWorker =
  | { type: 'fileSession' }
  | { type: 'cancelFileLoad' }
  | { type: 'loadFile'; text: string; gen: number }
  | CastRequest
  | TelemetryRequest
  | {
      type: 'init';
      castPreview?: boolean;
      castChapter?: CastChapter;
      seed: number;
      gen: number;
      scenarioVersion: number;
      startAtDusk?: boolean;
      options?: import('./sim/dusk-rest.ts').WatchOptions;
    }
  | { type: 'tick'; dtMs: number }
  | { type: 'input'; input: Input }
  | { type: 'speed'; speed: Speed }
  | { type: 'hold'; on: boolean }
  /** Write the running page now (the tab is being hidden or closed). */
  | { type: 'save' }
  | { type: 'export'; requestId: number }
  /** List the saved pages (answered with `shelf`). */
  | { type: 'shelf' }
  /** Open a chronicle at its running page, or take up a closed volume as a new chronicle, as a new run generation. */
  | { type: 'load'; id: string; gen: number };

export type WorkerReply =
  | { type: 'fileLoaded'; ok: boolean; error?: string; seed?: number }
  | CastReply
  | TelemetryReply
  | { type: 'frame'; frame: Frame; speed: Speed }
  | {
      type: 'exported';
      requestId: number;
      data: PlaytestExport & { snapshot?: import('./sim/run.ts').Snapshot };
    }
  /** The saved pages, newest first ([] without storage), and whether this run's saves are being kept. */
  | { type: 'shelf'; pages: PageInfo[]; saving: boolean; current: string }
  /** A load finished: `ok` false if the page was gone or unreadable (the old run goes on). */
  | { type: 'loaded'; ok: boolean; id: string; seed?: number; error?: string }
  | { type: 'error'; message: string };

export type WorkerToMain = WorkerReply & { gen: number };
