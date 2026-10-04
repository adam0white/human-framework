/**
 * Dedicated worker for Game 2 (build plan §9). Real time enters only as `tick{dtMs}`; the game steps whole sim
 * minutes at the pace (8/20/60 per second) or fast-forward (240 per second, with a matching per-tick cap), so the
 * same seed, inputs and tick schedule give the same frames. A frame is posted at most once per message, and only
 * when it changed. Every reply carries the run's `gen` (`shared/worker-host.ts`).
 *
 * Every state-changing message goes through `RecordedGame` (sim/record.ts), which keeps the playtest log; a
 * loaded playtest file is replayed here from its seed and log (its snapshot is never loaded as state).
 */
import { ENGINE_VERSION } from '@human/framework';
import { makePlaytestFile, PlaytestError, parsePlaytest, replayResult } from '../shared/playtest.ts';
import { hostWorker } from '../shared/worker-host.ts';
import { type MainToWorker, VOICE_SCENARIO_VERSION, type WorkerReply } from './protocol.ts';
import { VoiceGame } from './sim/game.ts';
import { RecordedGame, replayVoice, validateVoiceLog, voiceHash, voiceSnapshot } from './sim/record.ts';

let rec: RecordedGame | null = null;
let lastFrame = '';
/** Real milliseconds since the last frame posted on a tick: running frames go out at most ~15 times a second. */
let sinceFrame = 0;
const FRAME_MS = 66;

function flush(force = false): void {
  const game = rec?.game;
  if (!game) return;
  for (const m of game.outbox.splice(0)) host.post(m);
  const frame = game.frame();
  const json = JSON.stringify(frame);
  if (!force && json === lastFrame) return;
  lastFrame = json;
  sinceFrame = 0;
  host.post({ type: 'frame', frame });
}

async function exportPlaytest(r: RecordedGame): Promise<void> {
  const g = r.game;
  const file = await makePlaytestFile({
    game: 'voice',
    seed: g.seed,
    scenario: VOICE_SCENARIO_VERSION,
    minute: g.t,
    log: structuredClone(r.log),
    hash: voiceHash(g),
    engine: ENGINE_VERSION,
    snapshot: voiceSnapshot(g),
  });
  host.post({ type: 'playtest', file });
}

/** Validate and replay a file; only then does it replace the current run (a bad file leaves the run as it was). */
function loadPlaytest(text: string, nextGen: number): void {
  const f = parsePlaytest(text, 'voice', VOICE_SCENARIO_VERSION, validateVoiceLog);
  const { rec: replayed, driftAt } = replayVoice(f.seed, f.log);
  const g = replayed.game;
  // Hash first: pausing for the page changes the state.
  const result = replayResult(f, voiceHash(g), ENGINE_VERSION, g.t, driftAt);
  rec = replayed;
  host.gen = nextGen;
  lastFrame = '';
  if (g.live() && !g.paused) replayed.apply({ type: 'pause' });
  host.post({ type: 'replayed', result });
  // The replay cleared its outbox: show the card the run stands at.
  if (g.phase === 'between' && g.between) host.post({ type: 'between', view: g.between });
  if (g.phase === 'report' && g.report) host.post({ type: 'report', view: g.report });
  flush(true);
}

const host = hostWorker<MainToWorker, WorkerReply>((msg) => {
  if (msg.type === 'init') {
    host.gen = msg.gen;
    lastFrame = '';
    if (msg.scenarioVersion !== VOICE_SCENARIO_VERSION) {
      rec = null;
      host.post({
        type: 'error',
        message: `scenario ${msg.scenarioVersion} is not ${VOICE_SCENARIO_VERSION}`,
      });
      return;
    }
    rec = new RecordedGame(new VoiceGame(msg.seed));
    flush(true);
    return;
  }
  if (msg.type === 'loadPlaytest') {
    try {
      loadPlaytest(msg.text, msg.gen);
    } catch (err) {
      const message =
        err instanceof PlaytestError
          ? err.message
          : `The playtest file could not be replayed: ${err instanceof Error ? err.message : String(err)}`;
      host.post({ type: 'playtestError', message }, msg.gen);
    }
    return;
  }
  if (!rec) return;
  const game = rec.game;
  switch (msg.type) {
    case 'tick': {
      sinceFrame += Math.max(0, msg.dtMs);
      const moved = rec.tick(msg.dtMs);
      // A pause (a beat, the day's end) goes out at once; a running clock at most every FRAME_MS.
      if (!moved || (!game.paused && game.outbox.length === 0 && sinceFrame < FRAME_MS)) return;
      break;
    }
    case 'predict':
      host.post({ type: 'predicted', requestId: msg.requestId, telegraph: game.predict(msg.draft) });
      return;
    case 'why':
      host.post({ type: 'why', decisionId: msg.decisionId, why: game.why(msg.decisionId) });
      return;
    case 'exportPlaytest':
      exportPlaytest(rec).catch((err: unknown) =>
        host.post({ type: 'playtestError', message: `The playtest file could not be made: ${String(err)}` }),
      );
      return;
    default:
      rec.apply(msg);
  }
  flush();
});
