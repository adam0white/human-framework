import { ENGINE_VERSION } from '@adam0white/human-framework';
import { canonicalPersona, validatePersona } from '@adam0white/lab-client';
import { castRole, chapterPeople, siteCastCheckpoint } from '../shared/cast-chapter.ts';
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
import { DAY } from './sim/config.ts';
import { validWatchOptions } from './sim/dusk-rest.ts';
import { dayOfYear, seasonOfDay } from './sim/life.ts';
import { clockRuns, nightEnd } from './sim/night.ts';
import { Pacer } from './sim/pace.ts';
import { prepareWatchCast, WATCH_NORMS, watchTerminalReceipts } from './sim/people.ts';
import { type PlaytestExport, replay, type Snapshot, scenarioForOptions, WatchRun } from './sim/run.ts';
import { isSeason } from './sim/season.ts';
import type { WatchState } from './sim/state.ts';
import { buildFrame, ordinal } from './sim/view.ts';
import { roman } from './sim/volume.ts';
import { listPages, loadPage, type PageInfo, savePage } from './store.ts';

/** Imported receipt archives are provenance only; validate their binding without any Shelf access. */
async function validateFileSources(raw: Record<string, unknown>): Promise<void> {
  const ownership = raw.castOwnership;
  const sources = raw.castSources;
  if (ownership !== undefined && (!ownership || typeof ownership !== 'object' || Array.isArray(ownership)))
    throw new Error('Invalid imported ownership provenance.');
  if (sources !== undefined && (!sources || typeof sources !== 'object' || Array.isArray(sources)))
    throw new Error('Invalid imported source archive.');
  const heads = Object.entries((ownership ?? {}) as Record<string, unknown>);
  if (heads.length > 8) throw new Error('Too many imported ownership receipts.');
  for (const [id, value] of heads) {
    const head = await validatePersona(value);
    if (id !== head.castId) throw new Error('Imported receipt identity differs.');
  }
  for (const [id, source] of Object.entries((sources ?? {}) as Record<string, unknown>)) {
    const head = (
      ownership as Record<string, { transfer: { checkpoint?: { sha256?: string } } }> | undefined
    )?.[id];
    if (!head?.transfer.checkpoint?.sha256 || !source || typeof source !== 'object')
      throw new Error('Imported source has no bound full-source receipt.');
    const digest = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalPersona(source))),
      ),
      (byte) => byte.toString(16).padStart(2, '0'),
    ).join('');
    if (digest !== head.transfer.checkpoint.sha256) throw new Error('Imported source checksum differs.');
  }
}

let run: WatchRun | null = null;
let fileMode = false;
let imported: Record<string, unknown> = {};
/** Only the latest explicit init/load may install a run after storage awaits. */
let loadOperation = 0;
let castOwnership: import('../shared/cast-runtime.ts').CastHeads = {};
const pacer = new Pacer();
let lastKey = '';
let sinceFrame = 0;
const FRAME_MS = 50;
/** The most real time one tick may carry (a stalled tab or a long GC pause). */
const MAX_TICK_MS = 250;
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
  const info: PageInfo = {
    id,
    chronicle: chronicleId,
    kind,
    seed: run.seed,
    year: s.year,
    when: whenWords(s),
    savedAt: Date.now(),
    ...(kind === 'volume'
      ? { volume: { numeral: roman(s.volume.n), title: s.volume.title, end: s.volume.end ?? null } }
      : {}),
  };
  if (kind === 'auto') {
    savedMinute = s.minute;
    savedInputs = run.log.length;
    sinceSave = 0;
  }
  const text = JSON.stringify({ ...run.snapshot(), castOwnership });
  const gen = host.gen;
  void savePage(info, text).then((ok) => {
    if (!ok) saving = false;
    else host.post({ type: 'saved', value: JSON.parse(text) }, gen);
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
      if (new TextEncoder().encode(msg.text).length > 5 * 1024 * 1024)
        throw new Error('This file is too large.');
      const raw = JSON.parse(msg.text) as PlaytestExport & { snapshot: Snapshot; fileOrigin?: true };
      if (raw.game !== 'the-night-watch' || raw.framework !== FRAMEWORK_PACKAGE_VERSION || !raw.snapshot)
        throw new Error('A complete current Watch native file is required.');
      await validateFileSources(raw as unknown as Record<string, unknown>);
      const state = replay(raw);
      const expected = {
        scenario: raw.scenario,
        seed: raw.seed,
        log: raw.inputs,
        state,
        ...(raw.origin ? { origin: raw.origin } : {}),
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
      if (operation !== loadOperation) return;
      imported = structuredClone(raw) as unknown as Record<string, unknown>;
      castOwnership = {};
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
        void siteCastCheckpoint(
          'watch',
          person,
          WATCH_NORMS,
          role === 'kian' ? requireValue(run).state.refugeDeparture?.watchCare : undefined,
        )
          .then((transfer) =>
            host.post(
              {
                type: 'castReady',
                requestId: msg.requestId,
                transfer: { ...transfer, engine: ENGINE_VERSION },
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
      if (!validWatchOptions(msg.options) || msg.scenarioVersion !== scenarioForOptions(msg.options)) {
        host.gen = msg.gen;
        run = null;
        host.post({
          type: 'error',
          message: `scenario ${msg.scenarioVersion} is not ${WATCH_SCENARIO_VERSION}`,
        });
        return;
      }
      if (run && behind()) save('auto');
      castOwnership = {};
      host.gen = msg.gen;
      begin(new WatchRun(msg.seed, undefined, msg.castChapter, msg.options), newChronicleId());
      if (msg.startAtDusk) run?.input({ k: 'start' });
      flush(true);
      postShelf();
      return;
    case 'tick': {
      if (!run) return;
      const dt = Math.min(MAX_TICK_MS, Math.max(0, msg.dtMs));
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
          run: { ...run.export(), snapshot: run.snapshot() },
          logs: run.state.chronicle,
        });
      return;
    case 'export':
      if (run)
        host.post({
          type: 'exported',
          requestId: msg.requestId,
          data: fileMode
            ? {
                ...imported,
                ...run.export(),
                snapshot: run.snapshot(),
                build: typeof imported.build === 'string' ? imported.build : 'dev',
              }
            : run.export(),
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
        try {
          next = snap ? WatchRun.resume(snap) : null;
          // A page that parses but has the wrong shape fails here, before it replaces the running game
          // (security review H2, S4), not on the next tick.
          if (next) buildFrame(next.state, 0, false);
        } catch {
          next = null;
        }
        if (!next) {
          host.post({ type: 'loaded', ok: false, id }, gen);
          return;
        }
        if (operation !== loadOperation) return;
        host.gen = gen;
        // A closed volume taken up again is a new chronicle; a running page continues its own.
        const fork = id.includes(':vol:');
        begin(next, fork ? newChronicleId() : (id.split(':')[0] ?? id));
        if (fork) save('auto');
        castOwnership = snap?.fileOrigin ? {} : structuredClone(snap?.castOwnership ?? {});
        host.post({ type: 'loaded', ok: true, id, seed: next.seed });
        host.post({ type: 'castReady', requestId: 0, ownership: castOwnership });
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
