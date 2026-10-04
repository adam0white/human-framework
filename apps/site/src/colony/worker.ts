/**
 * Dedicated worker running both sides in lockstep. Real time enters only as `tick{dtMs}` pacing; the engine
 * steps whole sim minutes, so the same seed and order log always give the same run. The state machine (speed,
 * pause, auto-pause, "Another day") lives in `sim/playback.ts` so it can be tested headless. Playtest files are
 * made and replayed here (a loaded file is replayed from its seed and log; its snapshot is never loaded).
 */
import { ENGINE_VERSION } from '@human/framework';
import { PlaytestError } from '../shared/playtest.ts';
import type { MainToWorker, WorkerReply, WorkerToMain } from './protocol.ts';
import { createFrameworkHumanSide } from './sim/human.ts';
import { Playback } from './sim/playback.ts';

const playback = new Playback(createFrameworkHumanSide);
let gen = 0;

function post(msg: WorkerReply, g = gen): void {
  const out: WorkerToMain = { ...msg, gen: g };
  postMessage(out);
}

addEventListener('message', (e: MessageEvent<MainToWorker>) => {
  const msg = e.data;
  try {
    if (msg.type === 'exportPlaytest') {
      playback
        .playtestFile(ENGINE_VERSION)
        .then((file) => post({ type: 'playtest', file }))
        .catch((err: unknown) =>
          post({ type: 'playtestError', message: `The playtest file could not be made: ${String(err)}` }),
        );
      return;
    }
    if (msg.type === 'loadPlaytest') {
      try {
        const { result, replies } = playback.load(msg.text, ENGINE_VERSION);
        gen = msg.gen;
        post({ type: 'replayed', result });
        for (const reply of replies) post(reply);
      } catch (err) {
        const message =
          err instanceof PlaytestError
            ? err.message
            : `The playtest file could not be replayed: ${err instanceof Error ? err.message : String(err)}`;
        post({ type: 'playtestError', message }, msg.gen);
      }
      return;
    }
    if (msg.type === 'init') gen = msg.gen;
    for (const reply of playback.handle(msg)) post(reply);
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
});
