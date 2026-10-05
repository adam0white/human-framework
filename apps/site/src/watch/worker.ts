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
import { DAY } from './sim/config.ts';
import { dayOfYear, seasonOfDay } from './sim/life.ts';
import { clockRuns } from './sim/night.ts';
import { Pacer } from './sim/pace.ts';
import { WatchRun } from './sim/run.ts';
import { isSeason } from './sim/season.ts';
import type { WatchState } from './sim/state.ts';
import { buildFrame, ordinal } from './sim/view.ts';
import { roman } from './sim/volume.ts';
import { listPages, loadPage, type PageInfo, savePage } from './store.ts';

let run: WatchRun | null = null;
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
  if (!run || !saving || run.state.phase === 'goal') return;
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
  const text = run.snapshotText();
  void savePage(info, text).then((ok) => {
    if (!ok) saving = false;
  });
}

/** Whether the running page is behind the run. */
function behind(): boolean {
  return run !== null && (run.state.minute !== savedMinute || run.log.length !== savedInputs);
}

/** Saves the pages that are due: a season backup, a closed volume, and the running page (see the file comment). */
function maybeSave(): void {
  if (!run) return;
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
  const flush = (force: boolean) => {
    if (!run) return;
    const s = run.state;
    const rate = pacer.held || !clockRuns(s) ? 0 : pacer.paced(run);
    // Only what can change the frame: the minute, an input, the phase, the speed and the pace.
    const key = `${s.minute}|${run.log.length}|${s.phase}|${pacer.speed}|${rate.toFixed(3)}|${pacer.slowed(run)}`;
    if (!force && key === lastKey) return;
    lastKey = key;
    sinceFrame = 0;
    const frame = buildFrame(s, pacer.progress, pacer.slowed(run), isSeason(s) ? rate * DAY : rate);
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
      if (run && behind()) save('auto');
      begin(new WatchRun(msg.seed), newChronicleId());
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
      return;
    case 'save':
      if (behind()) save('auto');
      return;
    case 'export':
      if (run) host.post({ type: 'exported', requestId: msg.requestId, data: run.export() });
      return;
    case 'shelf':
      postShelf();
      return;
    case 'load': {
      const gen = msg.gen;
      const id = msg.id;
      // Keep where this chronicle stands before opening another.
      if (run && behind()) save('auto');
      void loadPage(id).then((snap) => {
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
        host.gen = gen;
        // A closed volume taken up again is a new chronicle; a running page continues its own.
        const fork = id.includes(':vol:');
        begin(next, fork ? newChronicleId() : (id.split(':')[0] ?? id));
        if (fork) save('auto');
        host.post({ type: 'loaded', ok: true, id, seed: next.seed });
        flush(true);
        postShelf();
      });
      return;
    }
  }
});

function postShelf(): void {
  const gen = host.gen;
  void listPages().then((pages) => host.post({ type: 'shelf', pages, saving, current: chronicleId }, gen));
}
