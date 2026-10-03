/**
 * Dedicated worker running both sides in lockstep. Real time enters only as `tick{dtMs}` pacing; the engine
 * steps whole sim minutes, so the same seed and order log always give the same run. The state machine (speed,
 * pause, auto-pause, "Another day") lives in `sim/playback.ts` so it can be tested headless.
 */
import type { MainToWorker, WorkerReply, WorkerToMain } from './protocol.ts';
import { createFrameworkHumanSide } from './sim/human.ts';
import { Playback } from './sim/playback.ts';

const playback = new Playback(createFrameworkHumanSide);
let gen = 0;

function post(msg: WorkerReply): void {
  const out: WorkerToMain = { ...msg, gen };
  postMessage(out);
}

addEventListener('message', (e: MessageEvent<MainToWorker>) => {
  try {
    if (e.data.type === 'init') gen = e.data.gen;
    for (const reply of playback.handle(e.data)) post(reply);
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
});
