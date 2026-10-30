import { castRole, chapterPeople } from '../shared/cast-chapter.ts';
import { type FileImport, importedFileRecord, recordFile } from '../shared/file-record.ts';
import { checkGameFile } from '../shared/file-sources.ts';
import { FRAMEWORK_PACKAGE_VERSION, stableStringify } from '../shared/playtest.ts';
import { requireValue } from '../shared/require-value.ts';
/**
 * Dedicated worker for The Night Watch. Real time enters only as `tick{dtMs}`; the pacer steps whole sim
 * minutes, and inputs apply between minutes and are logged by sim minute, so a seed and the log replay the run.
 * A frame goes out when something changed (a sim minute stepped, an input, the speed or pace), at most about 20
 * times a second; it carries the pace so the page can draw motion between minutes on its own clock (2026-10-05:
 * the old 20-a-second frames at night rebuilt and compared the whole frame each time). A tick is capped at 250 ms
 * of real time, so a stalled page loses a moment rather than lurching the clock forward when it wakes.
 *
 * Saves (`store.ts`, spec §6). The running page is written soon after each input, every few real seconds while
 * the clock runs (every half minute during a night), when the chronicle is opened and when the tab is hidden; a
 * season backup as each season opens; a volume's page when it closes. `load` opens a chronicle at its running page (no rewind) or takes up a closed
 * volume as a new chronicle. Loading keeps the Pacer, so the chosen speed and the chronicle's hold stay. Storage
 * failing only leaves the shelf empty.
 */
import { hostWorker } from '../shared/worker-host.ts';
import { type MainToWorker, WATCH_SCENARIO_VERSION, type WorkerReply } from './protocol.ts';
import { canRestoreSeason } from './season-recovery.ts';
import { actorRuntime } from './sim/actor.ts';
import { captureWatchPerson } from './sim/cast.ts';
import { DAY } from './sim/config.ts';
import { WATCH_OLD_SAVE } from './sim/hf4.ts';
import { dayOfYear, seasonOfDay } from './sim/life.ts';
import { clockRuns, nightEnd } from './sim/night.ts';
import { Pacer } from './sim/pace.ts';
import { prepareWatchCast, watchTerminalReceipts } from './sim/people.ts';
import { type PlaytestExport, replay, type Snapshot, WatchRun } from './sim/run.ts';
import { isSeason } from './sim/season.ts';
import type { WatchState } from './sim/state.ts';
import { buildFrame, ordinal } from './sim/view.ts';
import { roman } from './sim/volume.ts';
import { listPages, loadPage, type PageInfo, savePage } from './store.ts';

let run: WatchRun | null = null;
let fileMode = false;
let imported: Record<string, unknown> = {};
let fileImport: FileImport | undefined;
/** Only the latest explicit init/load may install a run after storage awaits. */
let loadOperation = 0;
let castOwnership: import('../shared/cast-runtime.ts').CastHeads = {};
let castLocalOnly = false;
let castSkipped: string[] = [];
const pacer = new Pacer();
let lastKey = '';
let sinceFrame = 0;
const FRAME_MS = 50;
/** The most real time one tick may carry (a stalled tab or a long GC pause). */
const MAX_TICK_MS = 250;
/**
 * WATCH-cold-timing diagnostic: real time offered by the page against real time admitted to the clock, over the
 * run and over the open timed decision. Kept here, outside the game state, and added to the playtest file only, so
 * it changes no rule, hash or replay. A decision that seems stuck shows whether ticks stopped coming (few ticks),
 * came coarse (raw far above admitted), or the clock was held.
 */
const clock = {
  ticks: 0,
  rawMs: 0,
  admittedMs: 0,
  cappedTicks: 0,
  maxRawMs: 0,
  heldTicks: 0,
  moment: null as null | { id: number; ticks: number; rawMs: number; admittedMs: number },
};
/**
 * Write the running page at most this often after an input, and this often while the clock runs. During a night
 * both wait `NIGHT_SAVE_MS`: writing the page stops the clock for a moment (the snapshot is taken between minutes),
 * the Keeper's lantern moves are inputs, and hiding or closing the tab still writes it at once.
 */
const INPUT_SAVE_MS = 1500;
const RUNNING_SAVE_MS = 8000;
const NIGHT_SAVE_MS = 30000;
/** This chronicle's id on the shelf, the last season and page phase saved, and what the running page holds. */
let chronicleId = '';
let savedSeason = '';
let savedPhase = '';
let savedMinute = -1;
let savedInputs = -1;
let sinceSave = 0;
let saving = true;

const PAGE_PHASES = new Set(['dawn', 'thaw', 'fair', 'closed', 'fallen']);

function newChronicleId(): string {
  return `c${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

function seasonMark(s: WatchState): string {
  if (s.phase === 'goal') return '';
  return `${s.year}:${seasonOfDay(dayOfYear(s))}`;
}

function whenWords(s: WatchState): string {
  const season = seasonOfDay(dayOfYear(s));
  if (s.phase === 'dusk') return `winter, dusk before the ${ordinal(s.winterNight)} night`;
  if (s.phase === 'night') return `winter, the ${ordinal(s.winterNight)} night`;
  if (s.phase === 'dawn') return `winter, after the ${ordinal(s.winterNight)} night`;
  if (s.phase === 'fair') return 'autumn, the fair';
  if (s.phase === 'thaw') return 'the thaw';
  if (s.phase === 'closed') return 'a volume closed';
  if (s.phase === 'fallen') return 'the end';
  return season;
}

function save(kind: PageInfo['kind']): void {
  if (fileMode || !run || !saving || run.state.phase === 'goal') return;
  const s = run.state;
  const id =
    kind === 'auto'
      ? `${chronicleId}:auto`
      : kind === 'volume'
        ? `${chronicleId}:vol:${s.volume.n}`
        : `${chronicleId}:${s.year}:${seasonOfDay(dayOfYear(s))}`;
  const snapshot = run.snapshot();
  const info: PageInfo = {
    id,
    chronicle: chronicleId,
    kind,
    seed: run.seed,
    year: s.year,
    when: whenWords(s),
    savedAt: Date.now(),
    scenario: snapshot.scenario,
    ...(kind === 'volume'
      ? { volume: { numeral: roman(s.volume.n), title: s.volume.title, end: s.volume.end ?? null } }
      : {}),
  };
  if (kind === 'auto') {
    savedMinute = s.minute;
    savedInputs = run.log.length;
    sinceSave = 0;
  }
  const text = JSON.stringify({ ...snapshot, castOwnership, castLocalOnly, castSkipped });
  const gen = host.gen;
  void savePage(info, text).then((ok) => {
    if (!ok) {
      saving = false;
      postShelf();
    } else host.post({ type: 'saved', value: JSON.parse(text) }, gen);
  });
}

/** Whether the running page is behind the run. */
function behind(): boolean {
  return run !== null && (run.state.minute !== savedMinute || run.log.length !== savedInputs);
}

/** Saves the pages that are due: a season backup, a closed volume, and the running page (see the file comment). */
function maybeSave(): void {
  if (fileMode || !run) return;
  const s = run.state;
  const mark = seasonMark(s);
  const phase = PAGE_PHASES.has(s.phase) ? `${s.phase}:${s.minute}` : '';
  if (mark && mark !== savedSeason) {
    savedSeason = mark;
    save('season');
    save('auto');
  } else if (phase && phase !== savedPhase) {
    if (s.phase === 'closed' || s.phase === 'fallen') save('volume');
    save('auto');
  } else if (behind()) {
    const inputWaiting = run.log.length !== savedInputs;
    const wait = s.phase === 'night' ? NIGHT_SAVE_MS : inputWaiting ? INPUT_SAVE_MS : RUNNING_SAVE_MS;
    if (sinceSave >= wait) save('auto');
  }
  savedPhase = phase;
}

function begin(r: WatchRun, id: string): void {
  run = r;
  Object.assign(clock, {
    ticks: 0,
    rawMs: 0,
    admittedMs: 0,
    cappedTicks: 0,
    maxRawMs: 0,
    heldTicks: 0,
    moment: null,
  });
  pacer.adopt(r);
  chronicleId = id;
  savedSeason = seasonMark(r.state);
  savedPhase = PAGE_PHASES.has(r.state.phase) ? `${r.state.phase}:${r.state.minute}` : '';
  savedMinute = r.state.minute;
  savedInputs = r.log.length;
  sinceSave = 0;
  lastKey = '';
  saving = true;
}

const host = hostWorker<MainToWorker, WorkerReply>((msg, host) => {
  if (msg.type === 'cancelFileLoad') {
    if (!fileMode) throw new Error('File cancellation requires a file session.');
    loadOperation++;
    return;
  }
  if (msg.type === 'fileSession') {
    if (run) throw new Error('Session mode must be selected before a game.');
    fileMode = true;
    return;
  }
  if (
    fileMode &&
    ['init', 'load', 'shelf', 'castOwnership', 'castPreflight', 'castCheckpoint'].includes(msg.type)
  )
    throw new Error('Native chronicles and continuity are unavailable in a file session.');
  const deaths = () => {
    if (fileMode || !run) return;
    for (const terminal of watchTerminalReceipts(run.state, castOwnership))
      host.post({ type: 'castReady', requestId: 0, terminal });
  };
  if (msg.type === 'castOwnership') {
    castOwnership = structuredClone(msg.heads);
    castLocalOnly = msg.localOnly ?? false;
    castSkipped = structuredClone(msg.skipped ?? []);
    deaths();
    if (run && run.state.phase !== 'goal') save('auto');
    return;
  }
  const flush = (force: boolean) => {
    if (!run) return;
    const s = run.state;
    const rate = pacer.held || !clockRuns(s) ? 0 : pacer.paced(run);
    // Only what can change the frame: the minute, an input, the phase, the speed and the pace.
    // Reading takes several seconds within one sim minute. Refresh the countdown each real second too.
    const decisionSeconds =
      s.moment && rate > 0
        ? Math.ceil((Math.min(s.moment.until, nightEnd(s)) - s.minute - pacer.progress) / rate - 1e-9)
        : null;
    const key = `${s.minute}|${run.log.length}|${s.phase}|${pacer.speed}|${rate.toFixed(3)}|${pacer.slowed(run)}|${decisionSeconds}`;
    if (!force && key === lastKey) return;
    lastKey = key;
    sinceFrame = 0;
    const frame = buildFrame(s, pacer.progress, pacer.slowed(run), isSeason(s) ? rate * DAY : rate);
    deaths();
    host.post({ type: 'frame', frame, speed: pacer.speed });
  };

  if (msg.type === 'loadFile') {
    if (!fileMode) throw new Error('Open a file session first.');
    const operation = ++loadOperation;
    void (async () => {
      const raw = (await checkGameFile(msg.text)) as unknown as PlaytestExport & {
        snapshot: Snapshot;
        fileOrigin?: true;
      };
      if (raw.game !== 'the-night-watch' || !raw.snapshot)
        throw new Error('A complete current Watch native file is required.');
      if (raw.framework !== FRAMEWORK_PACKAGE_VERSION) throw new Error(WATCH_OLD_SAVE);
      const state = replay(raw);
      const expected = {
        scenario: raw.scenario,
        seed: raw.seed,
        log: raw.inputs,
        state,
        ...(raw.fileOrigin ? { fileOrigin: true } : {}),
      };
      if (stableStringify(expected) !== stableStringify(raw.snapshot))
        throw new Error('The complete Watch state does not replay. Keep the original file.');
      const next = WatchRun.resume(raw.snapshot);
      if (
        stableStringify(next.snapshot()) !== stableStringify(raw.snapshot) ||
        stableStringify(next.export().end) !== stableStringify(raw.end)
      )
        throw new Error('The Watch native envelope differs from its complete state.');
      buildFrame(next.state, 0, false);
      const source = await importedFileRecord(raw as unknown as Record<string, unknown>, msg.text);
      if (operation !== loadOperation) return;
      fileImport = source;
      imported = structuredClone(raw) as unknown as Record<string, unknown>;
      castOwnership = {};
      castLocalOnly = true;
      castSkipped = [];
      host.gen = msg.gen;
      begin(next, '');
      host.post({ type: 'fileLoaded', ok: true, seed: next.seed });
      // Re-enter only the frame branch, after the accepted generation is installed.
      flush(true);
    })().catch((error) => {
      if (operation === loadOperation)
        host.post({ type: 'fileLoaded', ok: false, error: String(error) }, msg.gen);
    });
    return;
  }
  if (msg.type === 'castPreflight' || msg.type === 'castCheckpoint') {
    try {
      if (msg.type === 'castPreflight') {
        prepareWatchCast(msg.seed, msg.chapter);
        host.post({
          type: 'castReady',
          requestId: msg.requestId,
          initials: Object.fromEntries(
            chapterPeople(msg.chapter).map((p) => [p.input.parent.castId, requireValue(p.initial)]),
          ),
        });
        return;
      }
      if (msg.type === 'castCheckpoint' && run?.state.phase === 'goal')
        throw new Error('Begin and play this chapter before saving a person.');
      const role = msg.type === 'castCheckpoint' ? castRole('watch', msg.castId) : undefined;
      const person =
        role === 'kian' && run?.state.refugeDeparture
          ? run.state.refugeDeparture.person
          : role
            ? run?.state.community.people.find((p) => p.id === role)
            : undefined;
      if (msg.type === 'castCheckpoint' && !person) throw new Error('This person has not arrived.');
      if (person && !person.body.alive && role) {
        host.post({
          type: 'castReady',
          requestId: msg.requestId,
          terminal: {
            castId: msg.type === 'castCheckpoint' ? msg.castId : '',
            at: requireValue(run).state.minute,
          },
        });
        return;
      }
      if (person) {
        const gen = host.gen;
        const state = requireValue(run).state;
        const obligations = [
          ...(state.phase === 'night' || state.phase === 'dusk' ? ['the current watch'] : []),
          ...(role === 'kian'
            ? ['Ada’s care and return agreement requires a supported dependent reader']
            : []),
        ];
        void captureWatchPerson(state, msg.castId, obligations)
          .then((transfer) =>
            host.post(
              {
                type: 'castReady',
                requestId: msg.requestId,
                transfer: {
                  ...transfer,
                  engine: actorRuntime(state).snapshot().archive.engine.package.split('@').at(-1),
                },
                sourceSnapshot: transfer.sourceSnapshot,
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
  switch (msg.type) {
    case 'init':
      loadOperation++;
      lastKey = '';
      if (msg.scenarioVersion !== WATCH_SCENARIO_VERSION) {
        host.gen = msg.gen;
        run = null;
        host.post({
          type: 'error',
          message: WATCH_OLD_SAVE,
        });
        return;
      }
      if (run && behind()) save('auto');
      castOwnership = {};
      castLocalOnly = false;
      castSkipped = [];
      host.gen = msg.gen;
      begin(new WatchRun(msg.seed, undefined, msg.castChapter), newChronicleId());
      if (msg.startAtDusk) run?.input({ k: 'start' });
      flush(true);
      postShelf();
      return;
    case 'tick': {
      if (!run) return;
      const dt = Math.min(MAX_TICK_MS, Math.max(0, msg.dtMs));
      const raw = Math.max(0, msg.dtMs);
      clock.ticks += 1;
      clock.rawMs += raw;
      clock.admittedMs += dt;
      if (raw > MAX_TICK_MS) clock.cappedTicks += 1;
      clock.maxRawMs = Math.max(clock.maxRawMs, raw);
      if (pacer.held) clock.heldTicks += 1;
      const open = run.state.moment;
      if (!open) clock.moment = null;
      else {
        if (clock.moment?.id !== open.id) clock.moment = { id: open.id, ticks: 0, rawMs: 0, admittedMs: 0 };
        clock.moment.ticks += 1;
        clock.moment.rawMs += raw;
        clock.moment.admittedMs += dt;
      }
      sinceFrame += dt;
      sinceSave += dt;
      pacer.tick(run, dt);
      maybeSave();
      if (sinceFrame < FRAME_MS) return;
      flush(false);
      return;
    }
    case 'input':
      if (run?.input(msg.input)) {
        pacer.follow(run);
        maybeSave();
      }
      flush(true);
      return;
    case 'speed':
      pacer.speed = msg.speed;
      flush(true);
      return;
    case 'hold':
      pacer.held = msg.on;
      // Opening the chronicle writes the running page, so the shelf shows where the Keeper stands.
      if (msg.on && behind()) save('auto');
      flush(true);
      return;
    case 'save':
      if (behind()) save('auto');
      return;
    case 'telemetry':
      if (run)
        host.post({
          type: 'telemetry',
          requestId: msg.requestId,
          run: recordFile(run, { ...run.export(), snapshot: run.snapshot() }, fileImport),
          logs: run.state.chronicle,
        });
      return;
    case 'export':
      if (run)
        host.post({
          type: 'exported',
          requestId: msg.requestId,
          data: {
            ...recordFile(
              run,
              fileMode
                ? {
                    ...imported,
                    ...run.export(),
                    snapshot: run.snapshot(),
                    build: typeof imported.build === 'string' ? imported.build : 'dev',
                  }
                : run.export(),
              fileImport,
            ),
            clock: structuredClone(clock),
          },
        });
      return;
    case 'shelf':
      postShelf();
      return;
    case 'load': {
      const operation = ++loadOperation;
      const gen = msg.gen;
      const id = msg.id;
      // Keep where this chronicle stands before opening another.
      if (run && behind()) save('auto');
      void loadPage(id).then(async (snap) => {
        if (operation !== loadOperation) return;
        if (!id.endsWith(':auto') && !id.includes(':vol:')) {
          const page = (await listPages()).find((p) => p.id === id);
          if (operation !== loadOperation) return;
          if (!page || !canRestoreSeason(page, snap)) {
            host.post({ type: 'loaded', ok: false, id }, gen);
            return;
          }
        }
        let next: WatchRun | null = null;
        let loadError: string | undefined;
        try {
          next = snap ? WatchRun.resume(snap) : null;
          // A page that parses but has the wrong shape fails here, before it replaces the running game
          // (security review H2, S4), not on the next tick.
          if (next) buildFrame(next.state, 0, false);
        } catch (error) {
          loadError = error instanceof Error ? error.message : String(error);
          next = null;
        }
        if (!next) {
          host.post({ type: 'loaded', ok: false, id, ...(loadError ? { error: loadError } : {}) }, gen);
          return;
        }
        if (operation !== loadOperation) return;
        host.gen = gen;
        // A closed volume taken up again is a new chronicle; a running page continues its own.
        const fork = id.includes(':vol:');
        begin(next, fork ? newChronicleId() : (id.split(':')[0] ?? id));
        castOwnership = snap?.fileOrigin ? {} : structuredClone(snap?.castOwnership ?? {});
        castLocalOnly = snap?.fileOrigin ? true : (snap?.castLocalOnly ?? false);
        castSkipped = snap?.fileOrigin ? [] : structuredClone(snap?.castSkipped ?? []);
        if (fork) save('auto');
        host.post({ type: 'loaded', ok: true, id, seed: next.seed });
        host.post({
          type: 'castReady',
          requestId: 0,
          ownership: castOwnership,
          localOnly: castLocalOnly,
          skipped: castSkipped,
        });
        flush(true);
        postShelf();
      });
      return;
    }
  }
});

function postShelf(): void {
  if (fileMode) return;
  const gen = host.gen;
  void listPages().then(async (pages) => {
    const checked = await Promise.all(
      pages.map(async (page) => {
        const { castRecovery: _discard, ...info } = page;
        return page.kind === 'season' && canRestoreSeason(page, await loadPage(page.id))
          ? { ...info, castRecovery: true as const }
          : info;
      }),
    );
    host.post({ type: 'shelf', pages: checked, saving, current: chronicleId }, gen);
  });
}
