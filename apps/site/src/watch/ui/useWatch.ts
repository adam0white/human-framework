/**
 * Owns the worker: sends a tick every animation frame, keeps the latest frame in React state, and asks for the
 * playtest export. Replies from an earlier run (`gen`) are dropped.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchBuild } from '../../shared/playtest.ts';
import { startTickLoop } from '../../shared/tick-loop.ts';
import { type MainToWorker, type PageInfo, WATCH_SCENARIO_VERSION, type WorkerToMain } from '../protocol.ts';
import type { Input } from '../sim/night.ts';
import type { Speed } from '../sim/pace.ts';
import type { PlaytestExport } from '../sim/run.ts';
import type { Frame } from '../sim/view.ts';
import WatchWorker from '../worker.ts?worker';

export interface WatchActions {
  input(i: Input): void;
  setSpeed(s: Speed): void;
  hold(on: boolean): void;
  exportRun(): Promise<PlaytestExport>;
  restart(seed: number): void;
  /** Ask the worker for the saved pages again (the shelf refreshes itself on start). */
  refreshShelf(): void;
  /** Open a chronicle's running page or take up a closed volume; resolves false if it could not be read (the current run goes on). */
  load(id: string): Promise<boolean>;
}

export interface Watch {
  frame: Frame | null;
  speed: Speed;
  error: string | null;
  seed: number;
  /** Saved pages, newest first ([] without storage). */
  shelf: PageInfo[];
  /** False once a save has failed (storage unavailable or full): the shelf will not grow. */
  saving: boolean;
  /** The chronicle being played, as the shelf names it. */
  current: string;
  actions: WatchActions;
}

export function initialSeed(): number {
  try {
    const q = new URLSearchParams(window.location.search).get('seed');
    if (q && /^\d{1,9}$/.test(q)) return Number(q);
  } catch {
    // No URL access: fall through.
  }
  return 20261004;
}

export function useWatch(): Watch {
  const worker = useRef<Worker | null>(null);
  const gen = useRef(0);
  const [seed, setSeed] = useState(initialSeed);
  const seedRef = useRef(seed);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [speed, setSpeedState] = useState<Speed>('watch');
  const [error, setError] = useState<string | null>(null);
  const [shelf, setShelf] = useState<PageInfo[]>([]);
  const [saving, setSaving] = useState(true);
  const [current, setCurrent] = useState('');
  const loads = useRef(new Map<string, { prev: number; done: (ok: boolean) => void }>());
  const exports = useRef(new Map<number, (d: PlaytestExport) => void>());
  const exportSeq = useRef(0);

  const send = useCallback((msg: MainToWorker) => worker.current?.postMessage(msg), []);

  useEffect(() => {
    const w = new WatchWorker();
    worker.current = w;
    w.addEventListener('message', (e: MessageEvent<WorkerToMain>) => {
      const msg = e.data;
      if (msg.type === 'loaded') {
        const wait = loads.current.get(msg.id);
        loads.current.delete(msg.id);
        if (!msg.ok && wait && gen.current === msg.gen) gen.current = wait.prev;
        if (msg.ok && msg.seed !== undefined) {
          seedRef.current = msg.seed;
          setSeed(msg.seed);
          setError(null);
        }
        wait?.done(msg.ok);
        return;
      }
      if (msg.gen !== gen.current) return;
      switch (msg.type) {
        case 'shelf':
          setShelf(msg.pages);
          setSaving(msg.saving);
          setCurrent(msg.current);
          return;
        case 'frame':
          setFrame(msg.frame);
          setSpeedState(msg.speed);
          return;
        case 'exported': {
          const done = exports.current.get(msg.requestId);
          exports.current.delete(msg.requestId);
          done?.(msg.data);
          return;
        }
        case 'error':
          setError(msg.message);
          return;
      }
    });
    w.addEventListener('error', (e) =>
      setError(`The simulation failed to load: ${e.message || 'worker error'}`),
    );
    gen.current += 1;
    w.postMessage({
      type: 'init',
      seed: seedRef.current,
      gen: gen.current,
      scenarioVersion: WATCH_SCENARIO_VERSION,
    } satisfies MainToWorker);
    const stop = startTickLoop((dtMs) => w.postMessage({ type: 'tick', dtMs } satisfies MainToWorker));
    // Write the running page when the tab is hidden or closed, so a reload loses next to nothing.
    const keep = () => {
      if (document.visibilityState === 'hidden') w.postMessage({ type: 'save' } satisfies MainToWorker);
    };
    const leave = () => w.postMessage({ type: 'save' } satisfies MainToWorker);
    document.addEventListener('visibilitychange', keep);
    window.addEventListener('pagehide', leave);
    return () => {
      document.removeEventListener('visibilitychange', keep);
      window.removeEventListener('pagehide', leave);
      stop();
      w.terminate();
      worker.current = null;
    };
  }, []);

  const actions = useMemo<WatchActions>(
    () => ({
      input: (input) => send({ type: 'input', input }),
      setSpeed: (s) => {
        setSpeedState(s);
        send({ type: 'speed', speed: s });
      },
      hold: (on) => send({ type: 'hold', on }),
      // The page stamps the deployed commit (`/release.json`, as Games 1 and 2 do); the worker cannot know it.
      exportRun: async () => {
        const [data, build] = await Promise.all([
          new Promise<PlaytestExport>((resolve) => {
            exportSeq.current += 1;
            exports.current.set(exportSeq.current, resolve);
            send({ type: 'export', requestId: exportSeq.current });
          }),
          fetchBuild(),
        ]);
        return { ...data, build };
      },
      restart: (next) => {
        gen.current += 1;
        seedRef.current = next;
        setSeed(next);
        setFrame(null);
        setError(null);
        send({ type: 'init', seed: next, gen: gen.current, scenarioVersion: WATCH_SCENARIO_VERSION });
      },
      refreshShelf: () => send({ type: 'shelf' }),
      load: (id) =>
        new Promise<boolean>((resolve) => {
          const prev = gen.current;
          gen.current += 1;
          loads.current.set(id, {
            prev,
            done: resolve,
          });
          send({ type: 'load', id, gen: gen.current });
        }),
    }),
    [send],
  );

  return { frame, speed, error, seed, shelf, saving, current, actions };
}
