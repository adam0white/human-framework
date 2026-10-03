/**
 * Dedicated worker running both sides in lockstep. Real time enters only as `tick{dtMs}` pacing; the
 * engine steps whole sim minutes, so the same seed and order log always give the same run.
 */
import type { MainToWorker, Speed, WorkerReply, WorkerToMain } from './protocol.ts';
import { ColonyGame, SCENARIO_VERSION } from './sim/game.ts';
import { createFrameworkHumanSide } from './sim/human.ts';
import { SIM_MINUTES_PER_SECOND } from './sim/world-types.ts';

/** Never advance more than this many sim minutes per tick (a backgrounded tab must not fast-forward). */
const MAX_MINUTES_PER_TICK = 8;
/** Slow-mo when a moment fires (spec §7, §8): this fraction of the chosen speed for this many real ms. */
const SLOW_FACTOR = 0.25;
const SLOW_MS = 3000;

let game: ColonyGame | null = null;
let speed: Speed = 1;
let paused = false;
let carry = 0;
let endedSent = false;
let gen = 0;
let slowLeft = 0;
let momentsSeen = 0;

function post(msg: WorkerReply): void {
  const out: WorkerToMain = { ...msg, gen };
  postMessage(out);
}

function sendFrame(): void {
  if (!game) return;
  post({ type: 'frame', frame: game.frame(), paused, speed, slowMo: slowLeft > 0 });
  if (game.ended && !endedSent) {
    endedSent = true;
    post({ type: 'ended', summary: game.summary() });
  }
}

function handle(msg: MainToWorker): void {
  switch (msg.type) {
    case 'init':
      gen = msg.gen;
      if (msg.scenarioVersion !== SCENARIO_VERSION) {
        game = null;
        post({ type: 'error', message: `scenario ${msg.scenarioVersion} is not ${SCENARIO_VERSION}` });
        return;
      }
      game = new ColonyGame(msg.seed, createFrameworkHumanSide);
      carry = 0;
      endedSent = false;
      paused = false;
      slowLeft = 0;
      momentsSeen = 0;
      sendFrame();
      return;
    case 'tick': {
      if (!game || paused || game.ended) return;
      const dt = Math.max(0, Math.min(msg.dtMs, 250));
      carry += (dt / 1000) * SIM_MINUTES_PER_SECOND * speed * (slowLeft > 0 ? SLOW_FACTOR : 1);
      slowLeft = Math.max(0, slowLeft - dt);
      const whole = Math.min(MAX_MINUTES_PER_TICK, Math.floor(carry));
      if (whole <= 0) return;
      carry -= whole;
      game.advance(whole);
      if (game.moments.length > momentsSeen) {
        momentsSeen = game.moments.length;
        slowLeft = SLOW_MS;
      }
      sendFrame();
      return;
    }
    case 'setSpeed':
      speed = msg.speed;
      sendFrame();
      return;
    case 'pause':
      paused = true;
      sendFrame();
      return;
    case 'resume':
      paused = false;
      sendFrame();
      return;
    case 'order':
      game?.issue(msg.input);
      sendFrame();
      return;
    case 'cancel':
      game?.cancel(msg.orderId);
      sendFrame();
      return;
    case 'dismissNudge':
      game?.dismissNudge(msg.id);
      sendFrame();
      return;
    case 'why':
      if (game)
        post({
          type: 'why',
          personId: msg.personId,
          ...(msg.decisionId ? { decisionId: msg.decisionId } : {}),
          why: game.why(msg.personId, msg.decisionId),
        });
      return;
    case 'predict':
      if (game) post({ type: 'predicted', requestId: msg.requestId, prediction: game.predict(msg.input) });
      return;
  }
}

addEventListener('message', (e: MessageEvent<MainToWorker>) => {
  try {
    handle(e.data);
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
});
