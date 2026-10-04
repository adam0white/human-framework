/**
 * Dedicated worker for The Night Watch. Real time enters only as `tick{dtMs}`; the pacer steps whole sim
 * minutes, and inputs apply between minutes and are logged by sim minute, so a seed and the log replay the run.
 * A frame goes out when something changed, at most about 20 times a second while the clock runs.
 *
 * G3-3: the worker keeps the chronicle's saved pages (`store.ts`): a page as each season opens and an autosave at
 * each dawn and page, taken between minutes. `load` resumes a page as a new run generation; storage failing only
 * leaves the shelf empty.
 */
import { hostWorker } from '../shared/worker-host.ts';
import { type MainToWorker, WATCH_SCENARIO_VERSION, type WorkerReply } from './protocol.ts';
import { dayOfYear, seasonOfDay } from './sim/life.ts';
import { Pacer } from './sim/pace.ts';
import { WatchRun } from './sim/run.ts';
import type { WatchState } from './sim/state.ts';
import { buildFrame } from './sim/view.ts';
import { listPages, loadPage, type PageInfo, savePage } from './store.ts';

let run: WatchRun | null = null;
let pacer = new Pacer();
let lastKey = '';
let sinceFrame = 0;
const FRAME_MS = 50;
/** This chronicle's id on the shelf, and the last season and phase saved. */
let chronicleId = '';
let savedSeason = '';
let savedPhase = '';
let saving = true;

const PAGE_PHASES = new Set(['dawn', 'thaw', 'fair', 'closed', 'fallen']);

function seasonMark(s: WatchState): string {
  if (s.phase === 'goal') return '';
  return `${s.year}:${seasonOfDay(dayOfYear(s))}`;
}

function whenWords(s: WatchState): string {
  const season = seasonOfDay(dayOfYear(s));
  if (s.phase === 'dawn') return `winter, after night ${s.winterNight}`;
  if (s.phase === 'fair') return 'autumn, the fair';
  if (s.phase === 'thaw') return 'the thaw';
  if (s.phase === 'closed') return 'a volume closed';
  if (s.phase === 'fallen') return 'the end';
  return season;
}

function save(kind: PageInfo['kind']): void {
  if (!run || !saving) return;
  const s = run.state;
  const info: PageInfo = {
    id: kind === 'auto' ? `${chronicleId}:auto` : `${chronicleId}:${s.year}:${seasonOfDay(dayOfYear(s))}`,
    chronicle: chronicleId,
    kind,
    seed: run.seed,
    year: s.year,
    when: whenWords(s),
    savedAt: Date.now(),
  };
  const text = run.snapshotText();
  void savePage(info, text).then((ok) => {
    if (!ok) saving = false;
  });
}

/** Saves a season page when a season opens and the autosave at each dawn and page. */
function maybeSave(): void {
  if (!run) return;
  const s = run.state;
  const mark = seasonMark(s);
  const phase = PAGE_PHASES.has(s.phase) ? `${s.phase}:${s.minute}` : '';
  if (mark && mark !== savedSeason) {
    savedSeason = mark;
    save('season');
    save('auto');
  } else if (phase && phase !== savedPhase) save('auto');
  savedPhase = phase;
}

function begin(r: WatchRun, id: string): void {
  run = r;
  pacer = new Pacer();
  chronicleId = id;
  savedSeason = seasonMark(r.state);
  savedPhase = '';
  lastKey = '';
  saving = true;
}

const host = hostWorker<MainToWorker, WorkerReply>((msg, host) => {
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
      begin(new WatchRun(msg.seed), `c${Date.now().toString(36)}`);
      flush(true);
      postShelf();
      return;
    case 'tick': {
      if (!run) return;
      sinceFrame += Math.max(0, msg.dtMs);
      pacer.tick(run, msg.dtMs);
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
      void loadPage(id).then((snap) => {
        let next: WatchRun | null = null;
        try {
          next = snap ? WatchRun.resume(snap) : null;
        } catch {
          next = null;
        }
        if (!next) {
          host.post({ type: 'loaded', ok: false, id }, gen);
          return;
        }
        host.gen = gen;
        begin(next, id.split(':')[0] ?? id);
        host.post({ type: 'loaded', ok: true, id, seed: next.seed });
        flush(true);
      });
      return;
    }
  }
});

function postShelf(): void {
  const gen = host.gen;
  void listPages().then((pages) => host.post({ type: 'shelf', pages, saving }, gen));
}
