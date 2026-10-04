/**
 * Owns the worker: sends a tick every animation frame, keeps the latest frame in React state, and asks for the
 * playtest export. Replies from an earlier run (`gen`) are dropped.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { startTickLoop } from '../../shared/tick-loop.ts';
import { type MainToWorker, WATCH_SCENARIO_VERSION, type WorkerToMain } from '../protocol.ts';
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
}

export interface Watch {
  frame: Frame | null;
  speed: Speed;
  error: string | null;
  seed: number;
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
  const exports = useRef(new Map<number, (d: PlaytestExport) => void>());
  const exportSeq = useRef(0);

  const send = useCallback((msg: MainToWorker) => worker.current?.postMessage(msg), []);

  useEffect(() => {
    const w = new WatchWorker();
    worker.current = w;
    w.addEventListener('message', (e: MessageEvent<WorkerToMain>) => {
      const msg = e.data;
      if (msg.gen !== gen.current) return;
      switch (msg.type) {
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
    return () => {
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
      exportRun: () =>
        new Promise<PlaytestExport>((resolve) => {
          exportSeq.current += 1;
          exports.current.set(exportSeq.current, resolve);
          send({ type: 'export', requestId: exportSeq.current });
        }),
      restart: (next) => {
        gen.current += 1;
        seedRef.current = next;
        setSeed(next);
        setFrame(null);
        setError(null);
        send({ type: 'init', seed: next, gen: gen.current, scenarioVersion: WATCH_SCENARIO_VERSION });
      },
    }),
    [send],
  );

  return { frame, speed, error, seed, actions };
}
