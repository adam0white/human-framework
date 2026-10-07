/**
 * Dedicated worker for Game 2 (docs/games/voice.md §10). Real time enters only as `tick{dtMs}`; the game steps whole sim
 * minutes at the pace (8/20/60 per second) or fast-forward (240 per second, with a matching per-tick cap), so the
 * same seed, inputs and tick schedule give the same frames. A frame is posted at most once per message, and only
 * when it changed. Every reply carries the run's `gen` (`shared/worker-host.ts`).
 *
 * Every state-changing message goes through `RecordedGame` (sim/record.ts), which keeps the playtest log; a
 * loaded playtest file is replayed here from its seed and log (its snapshot is never loaded as state).
 *
 * The month you never spoke (sim/counterfactual.ts) is a second game from the same seed with no input. It is held
 * here, outside the played game, stepped a few milliseconds per tick only while the player is reading (paused, a
 * card or an intro up), finished at once when the report is posted if the slices have not got there, and attached
 * to the posted report only (the game's own report and hash do not carry it). Once finished only its facts are
 * kept, by seed; the game is dropped.
 */
import { ENGINE_VERSION } from '@adam0white/human-framework';
import { makePlaytestFile, PlaytestError, parsePlaytest, replayResult } from '../shared/playtest.ts';
import { hostWorker } from '../shared/worker-host.ts';
import {
  type Frame,
  type MainToWorker,
  type ReportView,
  VOICE_SCENARIO_VERSION,
  type WorkerReply,
} from './protocol.ts';
import {
  advanceSilentMonth,
  finishSilentMonth,
  type MonthFacts,
  monthFacts,
  type SilentMonth,
  silentMonthView,
  startSilentMonth,
} from './sim/counterfactual.ts';
import { VoiceGame } from './sim/game.ts';
import { RecordedGame, replayVoice, validateVoiceLog, voiceHash, voiceSnapshot } from './sim/record.ts';

let rec: RecordedGame | null = null;
/** The silent game being stepped for the current run's seed (dropped once its facts are read, or on a new seed). */
let shadow: SilentMonth | null = null;
/** The finished silent month's facts, by seed (a Replay of the same seed reuses them). */
let silentFacts: { seed: number; facts: MonthFacts } | null = null;
/** Wall time asked of the silent game per tick; one headless turn (a whole skip) can run past it (voice.md §7.5). */
const SILENT_SLICE_MS = 6;

/** Drop a silent game that belongs to another seed. */
function dropStale(seed: number): void {
  if (shadow && shadow.seed !== seed) shadow = null;
}

/**
 * Step the silent game a little while the player is reading (the clock is stopped: a pause, a card, an intro), so a
 * slice that runs long never holds up a running clock. Called after the tick's own work.
 */
function stepSilent(game: VoiceGame): void {
  if (game.phase === 'premise' || game.phase === 'report' || game.phase === 'free') return;
  if (silentFacts?.seed === game.seed) return;
  if (!(game.paused || game.intro || game.phase === 'between')) return;
  dropStale(game.seed);
  shadow ??= startSilentMonth(game.seed);
  if (advanceSilentMonth(shadow, SILENT_SLICE_MS)) {
    silentFacts = { seed: game.seed, facts: monthFacts(shadow.game) };
    shadow = null;
  }
}

/** The silent month's facts for `seed`, running whatever the slices left synchronously (about 1.1 s whole). */
function factsFor(seed: number): MonthFacts {
  if (silentFacts?.seed === seed) return silentFacts.facts;
  dropStale(seed);
  const facts = monthFacts(finishSilentMonth(shadow ?? startSilentMonth(seed)));
  silentFacts = { seed, facts };
  shadow = null;
  return facts;
}

/** The report as posted: the game's own view plus the month you never spoke (one line when you never spoke). */
function withSilent(game: VoiceGame, view: ReportView): ReportView {
  return {
    ...view,
    silent: silentMonthView(game, view.spoke === false ? undefined : factsFor(game.seed)),
  };
}
/**
 * Each frame field's JSON as last posted. A frame carries only the fields that changed and names the rest in
 * `same`, so the page keeps its previous objects for them: the 300-entry log (most of a frame's bytes) is cloned
 * only when it grows, and memoized panels skip renders while their slice holds still (perf review V16).
 * Emptied on every new run so its first frame is whole.
 */
let lastFields = new Map<string, string | undefined>();
/** Real milliseconds since the last frame posted on a tick: running frames go out at most ~15 times a second. */
let sinceFrame = 0;
const FRAME_MS = 66;

function flush(force = false): void {
  const game = rec?.game;
  if (!game) return;
  for (const m of game.outbox.splice(0))
    host.post(m.type === 'report' ? { ...m, view: withSilent(game, m.view) } : m);
  const frame = game.frame();
  const fields = new Map<string, string | undefined>();
  const changed: Partial<Record<keyof Frame, unknown>> = {};
  const same: (keyof Frame)[] = [];
  for (const k of Object.keys(frame) as (keyof Frame)[]) {
    const json = JSON.stringify(frame[k]);
    fields.set(k, json);
    if (lastFields.has(k) && lastFields.get(k) === json) same.push(k);
    else changed[k] = frame[k];
  }
  const unchanged = same.length === fields.size && fields.size === lastFields.size;
  if (!force && unchanged) return;
  lastFields = fields;
  sinceFrame = 0;
  host.post({ type: 'frame', frame: changed as Partial<Frame>, ...(same.length > 0 ? { same } : {}) });
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
  dropStale(f.seed);
  const { rec: replayed, driftAt } = replayVoice(f.seed, f.log);
  const g = replayed.game;
  // Hash first: pausing for the page changes the state.
  const result = replayResult(f, voiceHash(g), ENGINE_VERSION, g.t, driftAt);
  rec = replayed;
  host.gen = nextGen;
  lastFields = new Map();
  if (g.live() && !g.paused) replayed.apply({ type: 'pause' });
  host.post({ type: 'replayed', result });
  // The replay cleared its outbox: show the card the run stands at.
  if (g.phase === 'between' && g.between) host.post({ type: 'between', view: g.between });
  // A file that ends at the report has had no reading time for the silent month: it runs here, synchronously
  // (about 1.1 s on the bench; more on a phone), before the report is posted.
  if (g.phase === 'report' && g.report) host.post({ type: 'report', view: withSilent(g, g.report) });
  flush(true);
}

const host = hostWorker<MainToWorker, WorkerReply>((msg) => {
  if (msg.type === 'init') {
    host.gen = msg.gen;
    lastFields = new Map();
    dropStale(msg.seed);
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
      stepSilent(game);
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
