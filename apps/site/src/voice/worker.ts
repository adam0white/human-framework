/**
 * Dedicated worker for Game 2 (build plan §9). Real time enters only as `tick{dtMs}`; the game steps whole sim
 * minutes at the pace (8/20/60 per second) or fast-forward (240 per second, with a matching per-tick cap), so the
 * same seed, inputs and tick schedule give the same frames. A frame is posted at most once per message, and only
 * when it changed. Every reply carries the run's `gen`.
 */
import {
  type MainToWorker,
  VOICE_SCENARIO_VERSION,
  type WorkerReply,
  type WorkerToMain,
} from './protocol.ts';
import { VoiceGame } from './sim/game.ts';

let game: VoiceGame | null = null;
let gen = 0;
let lastFrame = '';
/** Real milliseconds since the last frame posted on a tick: running frames go out at most ~15 times a second. */
let sinceFrame = 0;
const FRAME_MS = 66;

function post(msg: WorkerReply): void {
  const out: WorkerToMain = { ...msg, gen };
  postMessage(out);
}

function flush(force = false): void {
  if (!game) return;
  for (const m of game.outbox.splice(0)) post(m);
  const frame = game.frame();
  const json = JSON.stringify(frame);
  if (!force && json === lastFrame) return;
  lastFrame = json;
  sinceFrame = 0;
  post({ type: 'frame', frame });
}

function handle(msg: MainToWorker): void {
  if (msg.type === 'init') {
    gen = msg.gen;
    lastFrame = '';
    if (msg.scenarioVersion !== VOICE_SCENARIO_VERSION) {
      game = null;
      post({ type: 'error', message: `scenario ${msg.scenarioVersion} is not ${VOICE_SCENARIO_VERSION}` });
      return;
    }
    game = new VoiceGame(msg.seed);
    flush(true);
    return;
  }
  if (!game) return;
  switch (msg.type) {
    case 'tick': {
      sinceFrame += Math.max(0, msg.dtMs);
      const moved = game.tick(msg.dtMs);
      // A pause (a beat, the day's end) goes out at once; a running clock at most every FRAME_MS.
      if (!moved || (!game.paused && game.outbox.length === 0 && sinceFrame < FRAME_MS)) return;
      break;
    }
    case 'pause':
      game.pause();
      break;
    case 'resume':
      game.resume();
      break;
    case 'setPace':
      game.setPace(msg.pace);
      break;
    case 'setAutoPause':
      game.setAutoPause(msg.on);
      break;
    case 'begin':
      game.begin();
      break;
    case 'predict':
      post({ type: 'predicted', requestId: msg.requestId, telegraph: game.predict(msg.draft) });
      return;
    case 'suggest':
      game.suggest(msg.draft);
      break;
    case 'withdraw':
      game.withdraw();
      break;
    case 'why':
      post({ type: 'why', decisionId: msg.decisionId, why: game.why(msg.decisionId) });
      return;
    case 'endDay':
      game.endDay();
      break;
    case 'advance':
      game.advance(msg.standing);
      break;
    case 'dismissIntro':
      game.dismissIntro();
      break;
    case 'keepListening':
      game.keepListening();
      break;
  }
  flush();
}

addEventListener('message', (e: MessageEvent<MainToWorker>) => {
  try {
    handle(e.data);
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
});
