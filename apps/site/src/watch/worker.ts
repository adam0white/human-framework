/**
 * Dedicated worker for The Night Watch. Real time enters only as `tick{dtMs}`; the pacer steps whole sim
 * minutes, and inputs apply between minutes and are logged by sim minute, so a seed and the log replay the run.
 * A frame goes out when something changed, at most about 20 times a second while the clock runs.
 */
import { hostWorker } from '../shared/worker-host.ts';
import { type MainToWorker, WATCH_SCENARIO_VERSION, type WorkerReply } from './protocol.ts';
import { Pacer } from './sim/pace.ts';
import { WatchRun } from './sim/run.ts';
import { buildFrame } from './sim/view.ts';

let run: WatchRun | null = null;
let pacer = new Pacer();
let lastKey = '';
let sinceFrame = 0;
const FRAME_MS = 50;

hostWorker<MainToWorker, WorkerReply>((msg, host) => {
  const flush = (force: boolean) => {
    if (!run) return;
    const frame = buildFrame(run.state, pacer.progress, pacer.slowed(run));
    // `sub` changes every tick; compare without it so an idle page sends nothing.
    const key = JSON.stringify({ ...frame, sub: 0, speed: pacer.speed });
    if (!force && key === lastKey && run.state.phase !== 'night') return;
    lastKey = key;
    sinceFrame = 0;
    host.post({ type: 'frame', frame, speed: pacer.speed });
  };

  switch (msg.type) {
    case 'init':
      host.gen = msg.gen;
      lastKey = '';
      if (msg.scenarioVersion !== WATCH_SCENARIO_VERSION) {
        run = null;
        host.post({
          type: 'error',
          message: `scenario ${msg.scenarioVersion} is not ${WATCH_SCENARIO_VERSION}`,
        });
        return;
      }
      run = new WatchRun(msg.seed);
      pacer = new Pacer();
      flush(true);
      return;
    case 'tick': {
      if (!run) return;
      sinceFrame += Math.max(0, msg.dtMs);
      pacer.tick(run, msg.dtMs);
      if (sinceFrame < FRAME_MS) return;
      flush(false);
      return;
    }
    case 'input':
      run?.input(msg.input);
      flush(true);
      return;
    case 'speed':
      pacer.speed = msg.speed;
      flush(true);
      return;
    case 'hold':
      pacer.held = msg.on;
      return;
    case 'export':
      if (run) host.post({ type: 'exported', requestId: msg.requestId, data: run.export() });
      return;
  }
});
