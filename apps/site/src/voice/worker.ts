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

import { canonicalPersona, validatePersona } from '@adam0white/lab-client';
import { castRole, chapterPeople } from '../shared/cast-chapter.ts';
import { type FileImport, importedFileRecord, recordFile } from '../shared/file-record.ts';
import { checkGameFile } from '../shared/file-sources.ts';
import {
  decodeSnapshot,
  makePlaytestFile,
  PlaytestError,
  replayResult,
  stableStringify,
} from '../shared/playtest.ts';
import { requireValue } from '../shared/require-value.ts';
import { hostWorker } from '../shared/worker-host.ts';
import {
  type Frame,
  type MainToWorker,
  PACE_MINUTES_PER_SECOND,
  type ReportView,
  scenarioOf,
  VOICE_SCENARIO_VERSION,
  type VoiceRules,
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
import { captureVoicePerson, voiceTerminal } from './sim/hf4-portable.ts';
import { VOICE_HF4_EDITION } from './sim/hf4-run.ts';
import { returnedSelin, type SelinReturn } from './sim/persona.ts';
import {
  parseVoicePlaytest,
  RecordedGame,
  replayVoice,
  voiceHash,
  voiceSnapshot,
  voiceState,
} from './sim/record.ts';

let rec: RecordedGame | null = null;
let fileMode = false;
let imported: Record<string, unknown> = {};
let fileImport: FileImport | undefined;
let loadOperation = 0;
let initializing = false;
let checkpointError = '';
/** The silent game being stepped for the current run's seed (dropped once its facts are read, or on a new seed). */
let shadow: SilentMonth | null = null;
/** The finished silent month's facts, by seed (a Replay of the same seed reuses them). */
let silentFacts: { seed: number; rules: VoiceRules; facts: MonthFacts } | null = null;
/** Wall time asked of the silent game per tick; one headless turn (a whole skip) can run past it (voice.md §7.5). */
const SILENT_SLICE_MS = 6;

/** Drop a silent game that belongs to another seed or other rules (a replayed voice-1 file). */
function dropStale(seed: number, rules: VoiceRules): void {
  if (shadow && (shadow.seed !== seed || shadow.game.rules !== rules)) shadow = null;
}
const factsHeld = (seed: number, rules: VoiceRules) =>
  silentFacts?.seed === seed && silentFacts.rules === rules;

/**
 * Step the silent game a little while the player is reading (the clock is stopped: a pause, a card, an intro), so a
 * slice that runs long never holds up a running clock. Called after the tick's own work.
 */
function stepSilent(game: VoiceGame): void {
  if (game.phase === 'premise' || game.phase === 'report' || game.phase === 'free') return;
  if (factsHeld(game.seed, game.rules)) return;
  if (!(game.paused || game.intro || game.phase === 'between')) return;
  dropStale(game.seed, game.rules);
  shadow ??= startSilentMonth(game.seed, game.rules);
  if (advanceSilentMonth(shadow, SILENT_SLICE_MS)) {
    silentFacts = { seed: game.seed, rules: game.rules, facts: monthFacts(shadow.game) };
    shadow = null;
  }
}

/** The silent month's facts for `seed`, running whatever the slices left synchronously (about 1.1 s whole). */
function factsFor(seed: number, rules: VoiceRules): MonthFacts {
  if (silentFacts && factsHeld(seed, rules)) return silentFacts.facts;
  dropStale(seed, rules);
  const facts = monthFacts(finishSilentMonth(shadow ?? startSilentMonth(seed, rules)));
  silentFacts = { seed, rules, facts };
  shadow = null;
  return facts;
}

/** The report as posted: the game's own view plus the month you never spoke (one line when you never spoke). */
function withSilent(game: VoiceGame, view: ReportView): ReportView {
  return {
    ...view,
    silent: silentMonthView(game, view.spoke === false ? undefined : factsFor(game.seed, game.rules)),
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
  const frame = rec?.frame();
  if (!frame) return;
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

async function voiceFile(r: RecordedGame, full = false) {
  const g = r.game;
  const source = fileImport;
  const file = await makePlaytestFile({
    game: 'voice',
    seed: g.seed,
    scenario: scenarioOf(g.rules),
    minute: g.t,
    log: structuredClone(r.log),
    hash: voiceHash(g),
    engine: requireValue(g.run.c.runtime).save().archive.engine.package,
    snapshot: full ? voiceState(g) : voiceSnapshot(g),
    ...(full ? { plainSnapshot: true } : {}),
  });
  return recordFile(
    r,
    {
      ...file,
      voiceEdition: VOICE_HF4_EDITION,
      ...(g.castChapter ? { castChapter: structuredClone(g.castChapter) } : {}),
      ...(r.chapter ? { voicePersona: structuredClone(r.chapter) } : {}),
      ...(r.personaHead ? { voicePersonaHead: structuredClone(r.personaHead) } : {}),
      ...(r.oneCast.length ? { oneCast: structuredClone(r.oneCast) } : {}),
    },
    source,
  );
}
async function exportPlaytest(r: RecordedGame, full = false): Promise<void> {
  const gen = host.gen;
  const provenance = imported;
  const file = await voiceFile(r, full || fileMode);
  host.post(
    {
      type: 'playtest',
      file: fileMode
        ? {
            ...provenance,
            ...file,
            build: typeof provenance.build === 'string' ? provenance.build : file.build,
          }
        : file,
    },
    gen,
  );
}
let checkpointSending = false;
function publishBoundary(): void {
  if (fileMode) return;
  const r = rec;
  const state = r?.game.personaDeparture;
  if (!r || !state) return;
  if (state.error && state.error !== checkpointError) {
    checkpointError = state.error;
    host.post({
      type: 'personaCheckpoint',
      error: state.error,
    });
  }
  const transfer = state.transfer;
  const source = state.sourceSnapshot;
  if (!transfer || !source || checkpointSending) return;
  checkpointSending = true;
  const gen = host.gen;
  checkpointSending = false;
  host.post(
    {
      type: 'personaCheckpoint',
      error:
        'Selin’s earlier calendar enquiry mapping is unsupported in HF4. Continue through the shared cast shelf; keep the original file.',
    },
    gen,
  );
}

/** Validate and replay a file; only then does it replace the current run (a bad file leaves the run as it was). */
async function loadPlaytest(text: string, nextGen: number): Promise<void> {
  const operation = ++loadOperation;
  const raw = fileMode ? await checkGameFile(text) : undefined;
  // Refuse old editions before attempting current native replay.
  const { file: f, rules, chapter, rows, head } = parseVoicePlaytest(text);
  if (chapter) await validatePersona(chapter.admission);
  if (head) await validatePersona(head);
  dropStale(f.seed, rules);
  const { rec: replayed, driftAt } = replayVoice(f.seed, f.log, rules, chapter, 0, f.castChapter);
  replayed.personaHead = head ?? chapter?.acceptedHead;
  if (rows) replayed.oneCast.splice(0, replayed.oneCast.length, ...rows);
  const g = replayed.game;
  // Hash first: pausing for the page changes the state.
  const result = replayResult(
    f,
    voiceHash(g),
    requireValue(g.run.c.runtime).save().archive.engine.package,
    g.t,
    driftAt,
  );
  if (
    fileMode &&
    (!result.matches ||
      driftAt !== -1 ||
      stableStringify(await decodeSnapshot(raw as never)) !== stableStringify(voiceState(g)))
  )
    throw new Error('The complete Voice state does not replay. Keep the original file.');
  const source = raw ? await importedFileRecord(raw, text) : undefined;
  if (fileMode && operation !== loadOperation) return;
  if (raw) imported = structuredClone(raw);
  fileImport = source;
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

async function prepareSelinReturn(header: SelinReturn): Promise<SelinReturn> {
  throw new Error(
    'This Selin return uses an older calendar mapping. Start a fresh game; keep the original file.',
  );
}

const host = hostWorker<MainToWorker, WorkerReply>((msg) => {
  if (msg.type === 'cancelFileLoad') {
    if (!fileMode) throw new Error('File cancellation requires a file session.');
    loadOperation++;
    initializing = false;
    return;
  }
  if (msg.type === 'fileSession') {
    if (rec) throw new Error('Session mode must be selected before a game.');
    fileMode = true;
    return;
  }
  if (
    fileMode &&
    [
      'init',
      'castOwnership',
      'castPreflight',
      'castCheckpoint',
      'personaReturnCheck',
      'personaCheckpoint',
      'personaCheckpointCancel',
      'personaPublished',
    ].includes(msg.type)
  )
    throw new Error('Native continuity is unavailable in a file session.');
  if (msg.type === 'init') {
    host.gen = msg.gen;
    lastFields = new Map();
    dropStale(msg.seed, 4);
    if (msg.scenarioVersion !== VOICE_SCENARIO_VERSION) {
      rec = null;
      host.post({
        type: 'error',
        message: `scenario ${msg.scenarioVersion} is not ${VOICE_SCENARIO_VERSION}`,
      });
      return;
    }
    checkpointSending = false;
    checkpointError = '';
    if (msg.selinReturn) {
      const header = msg.selinReturn;
      initializing = true;
      const returnGen = msg.gen;
      prepareSelinReturn(header)
        .then((pinned) => {
          if (host.gen !== returnGen) return;
          if (!pinned.acceptedHead) throw new Error('No accepted return claim.');
          const prefix = parseVoicePlaytest(pinned.prefix);
          rec = replayVoice(prefix.file.seed, [], 4, pinned).rec;
          initializing = false;
          host.post({ type: 'personaStarted' });
          flush(true);
        })
        .catch((error) => {
          initializing = false;
          host.post({ type: 'error', message: `Selin could not return: ${String(error)}` });
        });
      return;
    }
    initializing = false;
    rec = new RecordedGame(new VoiceGame(msg.seed, 4, msg.castChapter));
    flush(true);
    return;
  }
  if (msg.type === 'castOwnership') return;
  if (msg.type === 'castPreflight' || msg.type === 'castCheckpoint') {
    try {
      if (msg.type === 'castPreflight') {
        new VoiceGame(msg.seed, 4, msg.chapter);
        host.post({
          type: 'castReady',
          requestId: msg.requestId,
          initials: Object.fromEntries(
            chapterPeople(msg.chapter).map((p) => [p.input.parent.castId, requireValue(p.initial)]),
          ),
        });
      } else {
        if (!rec || rec.game.phase === 'premise')
          throw new Error('Begin and play this chapter before saving a person.');
        const role = castRole('voice', msg.castId);
        const person = rec?.game.run.ppl[role as keyof typeof rec.game.run.ppl];
        if (!person || !rec) throw new Error('No current person checkpoint.');
        const gen = host.gen;
        if (voiceTerminal(requireValue(rec.game.run.c.runtime), role)) {
          host.post(
            {
              type: 'castReady',
              requestId: msg.requestId,
              terminal: { castId: msg.castId, at: requireValue(rec.game.run.c.runtime).at },
            },
            gen,
          );
          return;
        }
        void captureVoicePerson(
          requireValue(rec.game.run.c.runtime),
          msg.castId,
          rec.game.run.town.state.rentOwed > 0 && role === 'halil' ? ['the unpaid rent'] : [],
        )
          .then((t) =>
            host.post(
              {
                type: 'castReady',
                requestId: msg.requestId,
                transfer: {
                  ...t,
                  engine: requireValue(rec?.game.run.c.runtime).save().archive.engine.package,
                },
                sourceSnapshot: t.sourceSnapshot,
              },
              gen,
            ),
          )
          .catch((e) => host.post({ type: 'castReady', requestId: msg.requestId, error: String(e) }, gen));
      }
    } catch (e) {
      host.post({ type: 'castReady', requestId: msg.requestId, error: String(e) });
    }
    return;
  }
  if (msg.type === 'personaReturnCheck') {
    const gen = host.gen;
    void prepareSelinReturn(msg.header)
      .then((header) => host.post({ type: 'personaReturnReady', requestId: msg.requestId, header }, gen))
      .catch((error) =>
        host.post({ type: 'personaReturnReady', requestId: msg.requestId, error: String(error) }, gen),
      );
    return;
  }
  if (msg.type === 'loadPlaytest') {
    const operation = loadOperation + 1;
    initializing = true;
    void loadPlaytest(msg.text, msg.gen)
      .catch((err) => {
        if (fileMode && operation !== loadOperation) return;
        const message =
          err instanceof PlaytestError
            ? err.message
            : `The playtest file could not be replayed: ${String(err)}`;
        host.post({ type: 'playtestError', message }, msg.gen);
      })
      .finally(() => {
        if (!fileMode || operation === loadOperation) initializing = false;
      });
    return;
  }
  if (initializing) return;
  if (!rec) return;
  const game = rec.game;
  switch (msg.type) {
    case 'personaPublished':
      rec.oneCast.push(structuredClone(msg.row));
      rec.personaHead = structuredClone(msg.envelope);
      // Refresh the ordinary autosave after the shelf receipt, not only the separately pinned departure file.
      void exportPlaytest(rec).catch((error) => host.post({ type: 'playtestError', message: String(error) }));
      return;
    case 'personaCheckpoint':
      if (game.rules !== 4) {
        host.post({
          type: 'personaCheckpoint',
          error:
            'Start a new chapter to let Selin travel. Existing saved chapters keep their original rules.',
        });
        return;
      }
      checkpointSending = false;
      rec.apply(msg);
      if (game.personaDeparture?.error)
        host.post({ type: 'personaCheckpoint', error: game.personaDeparture.error });
      break;
    case 'personaCheckpointCancel':
      if (game.rules !== 4) return;
      checkpointSending = false;
      rec.apply(msg);
      break;
    case 'tick': {
      // Skip waits for each one-minute frame before sending its next tick.
      const minuteTick =
        Math.abs(msg.dtMs * (game.fastForward() ? 240 : PACE_MINUTES_PER_SECOND[game.pace]) - 1000) < 0.001;
      sinceFrame += Math.max(0, msg.wallDtMs ?? msg.dtMs);
      const moved = rec.tick(msg.dtMs);
      stepSilent(game);
      // A pause (a beat, the day's end) goes out at once; a running clock at most every FRAME_MS.
      if (!moved || (!game.paused && game.outbox.length === 0 && sinceFrame < FRAME_MS && !minuteTick))
        return;
      break;
    }
    case 'predict':
      host.post({ type: 'predicted', requestId: msg.requestId, telegraph: game.predict(msg.draft) });
      return;
    case 'why':
      host.post({ type: 'why', decisionId: msg.decisionId, why: game.why(msg.decisionId) });
      return;
    case 'telemetry': {
      const gen = host.gen;
      const logs = structuredClone(game.log);
      voiceFile(rec, true)
        .then((run) => host.post({ type: 'telemetry', requestId: msg.requestId, run, logs }, gen))
        .catch(() =>
          host.post({ type: 'telemetry', requestId: msg.requestId, error: 'Run snapshot failed' }, gen),
        );
      return;
    }
    case 'exportPlaytest':
      exportPlaytest(rec, msg.full).catch((err: unknown) =>
        host.post({ type: 'playtestError', message: `The playtest file could not be made: ${String(err)}` }),
      );
      return;
    default:
      rec.apply(msg);
  }
  publishBoundary();
  flush();
});
