/**
 * Owns the simulation worker. Frames land in a ref for the canvas loops (no React churn per animation
 * frame) and in state for the React chrome (cards, goals, inspector), at most once per worker frame.
 * Everything the worker sends passes through `contract.ts` first, so the rest of the UI reads one shape.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WorkerToMain } from '../protocol.ts';
import { DEFAULT_SEED, SCENARIO_VERSION } from '../sim/game.ts';
import type { Prediction, WhyBreakdown } from '../sim/human-side.ts';
import type { OrderInput } from '../sim/orders.ts';
import type { VillagerId } from '../sim/world-types.ts';
import type { EndSummary, Frame, OutMsg, PlaybackState, Speed } from './contract.ts';

export interface FrameStore {
  prev: Frame | null;
  curr: Frame | null;
  /** performance.now() when `curr` arrived. */
  at: number;
  /** Smoothed real ms between frames, for interpolation. */
  interval: number;
}

export interface Colony {
  store: React.RefObject<FrameStore>;
  frame: Frame | null;
  playback: PlaybackState;
  why: WhyBreakdown | null;
  prediction: { input: OrderInput; prediction: Prediction } | null;
  /** End-of-day reports, by day (Day 2, then Day 3 after "Another day"). */
  summaries: Partial<Record<2 | 3, EndSummary>>;
  error: string | null;
  actions: ColonyActions;
}

/** Stable action functions (same identities for the life of the hook). */
export interface ColonyActions {
  order(input: OrderInput, nudgeId?: string): void;
  cancel(orderId: string): void;
  dismissNudge(id: string): void;
  setSpeed(speed: Speed): void;
  /** Manual pause or resume (Space, the pause button, Play on the goal card). */
  setPaused(paused: boolean): void;
  /** Pause for the inspector (the worker keeps any pause already in place). */
  pauseForInspector(): void;
  /** Resume after the inspector, only if its pause is still the current one. */
  resumeFromInspector(): void;
  setAutoPause(on: boolean): void;
  continueDay(): void;
  requestWhy(personId: VillagerId, decisionId?: string): void;
  clearWhy(): void;
  predict(input: OrderInput | null): void;
  restart(): void;
}

const AUTO_PAUSE_KEY = 'colony.autoPause';

function readAutoPause(): boolean {
  try {
    return localStorage.getItem(AUTO_PAUSE_KEY) !== '0';
  } catch {
    return true;
  }
}

function writeAutoPause(on: boolean): void {
  try {
    localStorage.setItem(AUTO_PAUSE_KEY, on ? '1' : '0');
  } catch {
    // Storage may be blocked; the toggle then resets to on next visit.
  }
}

const emptyStore = (): FrameStore => ({ prev: null, curr: null, at: 0, interval: 62 });

const START_PLAYBACK = (autoPause: boolean): PlaybackState => ({
  paused: true,
  pause: { kind: 'start', text: '', minute: 0 },
  speed: 1,
  autoPause,
  slowMo: false,
});

export function useColony(seed = DEFAULT_SEED): Colony {
  const worker = useRef<Worker | null>(null);
  const store = useRef<FrameStore>(emptyStore());
  const [frame, setFrame] = useState<Frame | null>(null);
  const [autoPauseInit] = useState(readAutoPause);
  const [playback, setPlayback] = useState<PlaybackState>(() => START_PLAYBACK(autoPauseInit));
  const [why, setWhy] = useState<WhyBreakdown | null>(null);
  const [summaries, setSummaries] = useState<Colony['summaries']>({});
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<Colony['prediction']>(null);
  const predictSeq = useRef(0);
  const predictInputs = useRef(new Map<number, OrderInput>());
  /** Run number: replies from an earlier run (queued before a restart) are dropped. */
  const gen = useRef(0);
  /** The why the page is waiting for; replies for another person or decision are dropped. */
  const whyWant = useRef<{ personId: VillagerId; decisionId?: string } | null>(null);
  const autoPause = useRef(autoPauseInit);
  const playbackRef = useRef(playback);
  playbackRef.current = playback;

  const send = useCallback((msg: OutMsg) => worker.current?.postMessage(msg), []);

  const init = useCallback(
    (w: Worker | null) => {
      gen.current += 1;
      setPlayback(START_PLAYBACK(autoPause.current));
      const msg: OutMsg = {
        type: 'init',
        seed,
        scenarioVersion: SCENARIO_VERSION,
        gen: gen.current,
        autoPause: autoPause.current,
      };
      w?.postMessage(msg);
    },
    [seed],
  );

  useEffect(() => {
    const w = new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    w.addEventListener('message', (e: MessageEvent<WorkerToMain>) => {
      const msg = e.data;
      if (msg.gen !== gen.current) return;
      switch (msg.type) {
        case 'frame': {
          const f = msg.frame;
          const s = store.current;
          const now = performance.now();
          if (s.curr && f.minute !== s.curr.minute) {
            const gap = now - s.at;
            s.interval = Math.max(24, Math.min(400, s.interval * 0.8 + gap * 0.2));
            s.prev = s.curr;
            s.at = now;
          } else if (!s.curr) {
            s.at = now;
          }
          s.curr = f;
          setFrame(f);
          const pb = msg.playback;
          setPlayback(pb);
          return;
        }
        case 'why': {
          const want = whyWant.current;
          if (!want || want.personId !== msg.personId || want.decisionId !== msg.decisionId) return;
          setWhy(msg.why);
          return;
        }
        case 'predicted': {
          const input = predictInputs.current.get(msg.requestId);
          predictInputs.current.delete(msg.requestId);
          if (input && msg.requestId === predictSeq.current)
            setPrediction({ input, prediction: msg.prediction });
          return;
        }
        case 'ended': {
          const sum = msg.summary;
          setSummaries((cur) => ({ ...cur, [sum.day]: sum }));
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
    w.addEventListener('messageerror', () =>
      setError('The simulation sent a message the page could not read.'),
    );
    init(w);

    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      // The first frame's timestamp can precede `last`; a negative tick would run the clock backwards.
      const dt = Math.max(0, t - last);
      last = t;
      w.postMessage({ type: 'tick', dtMs: dt } satisfies OutMsg);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      w.terminate();
      worker.current = null;
      store.current = emptyStore();
    };
  }, [init]);

  const actions = useMemo<ColonyActions>(
    () => ({
      order: (input, nudgeId) => send(nudgeId ? { type: 'order', input, nudgeId } : { type: 'order', input }),
      cancel: (orderId) => send({ type: 'cancel', orderId }),
      dismissNudge: (id) => send({ type: 'dismissNudge', id }),
      setSpeed: (s) => send({ type: 'setSpeed', speed: s }),
      setPaused: (p) => {
        send(p ? { type: 'pause', cause: 'manual' } : { type: 'resume' });
      },
      // The worker keeps an existing pause when the inspector opens, so closing it cannot resume a manual pause.
      pauseForInspector: () => send({ type: 'pause', cause: 'inspector' }),
      resumeFromInspector: () => {
        const pb = playbackRef.current;
        if (pb.paused && pb.pause?.kind === 'inspector') send({ type: 'resume' });
      },
      setAutoPause: (on) => {
        autoPause.current = on;
        writeAutoPause(on);
        setPlayback((pb) => ({ ...pb, autoPause: on }));
        send({ type: 'setAutoPause', on });
      },
      continueDay: () => send({ type: 'continue' }),
      requestWhy: (personId, decisionId) => {
        const cur = whyWant.current;
        if (cur?.personId !== personId || cur.decisionId !== decisionId) setWhy(null);
        whyWant.current = decisionId ? { personId, decisionId } : { personId };
        send(decisionId ? { type: 'why', personId, decisionId } : { type: 'why', personId });
      },
      clearWhy: () => {
        whyWant.current = null;
        setWhy(null);
      },
      predict: (input) => {
        predictSeq.current += 1;
        if (!input) {
          setPrediction(null);
          return;
        }
        predictInputs.current.set(predictSeq.current, input);
        send({ type: 'predict', requestId: predictSeq.current, input });
      },
      restart: () => {
        setSummaries({});
        setWhy(null);
        setPrediction(null);
        setError(null);
        whyWant.current = null;
        predictInputs.current.clear();
        store.current = emptyStore();
        init(worker.current);
      },
    }),
    [send, init],
  );

  return { store, frame, playback, why, prediction, summaries, error, actions };
}
