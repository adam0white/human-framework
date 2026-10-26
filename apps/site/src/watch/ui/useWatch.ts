/**
 * Owns the worker: sends a tick every animation frame, keeps the latest frame in React state, and asks for the
 * playtest export. Replies from an earlier run (`gen`) are dropped.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bindCastWorker, postCastMessage } from '../../shared/cast-runtime.ts';
import { gameLabs } from '../../shared/lab.tsx';
import { fetchBuild } from '../../shared/playtest.ts';
import { startTickLoop } from '../../shared/tick-loop.ts';
import { trackWorkerRun } from '../../shared/worker-telemetry.ts';
import { type MainToWorker, type PageInfo, WATCH_SCENARIO_VERSION, type WorkerToMain } from '../protocol.ts';
import type { WatchOptions } from '../sim/dusk-rest.ts';
import type { Input } from '../sim/night.ts';
import { DECISION_RATE, RAMP_MS, type Speed } from '../sim/pace.ts';
import { type PlaytestExport, scenarioForOptions } from '../sim/run.ts';
import type { Frame } from '../sim/view.ts';
import WatchWorker from '../worker.ts?worker';

export interface WatchActions {
  input(i: Input): void;
  setSpeed(s: Speed): void;
  hold(on: boolean): void;
  /** A helper sheet uses the same reading pace as a pending night decision. */
  readingSlow?(on: boolean): void;
  exportRun(): Promise<PlaytestExport>;
  restart(seed: number, options?: WatchOptions, startAtDusk?: boolean): void;
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
  const reading = useRef(false);
  const loadedPace = useRef(false);
  const latest = useRef<{ speed: Speed; frame: Frame | null }>({ speed: 'watch', frame: null });
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

  const send = useCallback(
    (msg: MainToWorker) =>
      worker.current &&
      postCastMessage(worker.current, 'watch', {
        ...msg,
        castRunGeneration: 'gen' in msg ? msg.gen : gen.current,
      }),
    [],
  );

  useEffect(() => {
    const w = new WatchWorker();
    const stopCast = bindCastWorker(w, 'watch', gameLabs.watch);
    worker.current = w;
    w.addEventListener('message', (e: MessageEvent<WorkerToMain>) => {
      const msg = e.data;
      if (msg.type === 'loaded') {
        const wait = loads.current.get(msg.id);
        loads.current.delete(msg.id);
        if (!msg.ok && wait && gen.current === msg.gen) gen.current = wait.prev;
        if (msg.ok && msg.seed !== undefined) {
          loadedPace.current = true;
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
          if (loadedPace.current) {
            loadedPace.current = false;
            const phase = msg.frame.phase;
            w.postMessage({
              type: 'speed',
              speed: phase === 'spring' || phase === 'summer' || phase === 'autumn' ? 'seasons' : 'watch',
            } satisfies MainToWorker);
          }
          latest.current = { speed: msg.speed, frame: msg.frame };
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
    postCastMessage(w, 'watch', {
      type: 'init',
      castPreview: true,
      seed: seedRef.current,
      gen: gen.current,
      scenarioVersion: WATCH_SCENARIO_VERSION,
    } satisfies MainToWorker);
    const stopTelemetry = trackWorkerRun(w, gameLabs.watch, () => gen.current);
    let readingFactor = 1;
    const stop = startTickLoop((dtMs) => {
      const { frame } = latest.current;
      const target =
        reading.current && frame?.phase === 'night' && !frame.moment
          ? Math.min(1, DECISION_RATE / Math.max(DECISION_RATE, frame.rate))
          : 1;
      readingFactor = target < readingFactor ? target : Math.min(target, readingFactor + dtMs / RAMP_MS);
      w.postMessage({ type: 'tick', dtMs: dtMs * readingFactor } satisfies MainToWorker);
    });
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
      stopTelemetry();
      stopCast();
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
      readingSlow: (on) => {
        reading.current = on;
      },
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
      restart: (next, options, startAtDusk) => {
        gen.current += 1;
        seedRef.current = next;
        setSeed(next);
        setFrame(null);
        setError(null);
        send({
          type: 'init',
          seed: next,
          gen: gen.current,
          scenarioVersion: scenarioForOptions(options),
          ...(startAtDusk ? { startAtDusk: true } : {}),
          ...(options ? { options } : {}),
        });
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
