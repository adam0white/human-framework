/**
 * Owns the simulation worker. Frames land in a ref for the canvas loops (no React churn per animation
 * frame) and in state for the React chrome (cards, scoreboard, inspector), at most once per worker frame.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MainToWorker, Speed, WorkerToMain } from '../protocol.ts';
import { DEFAULT_SEED, type EndSummary, type Frame, SCENARIO_VERSION } from '../sim/game.ts';
import type { Prediction, WhyBreakdown } from '../sim/human-side.ts';
import type { OrderInput } from '../sim/orders.ts';
import type { VillagerId } from '../sim/world-types.ts';

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
  paused: boolean;
  speed: Speed;
  /** The worker is running a moment's slow-mo. */
  slowMo: boolean;
  why: WhyBreakdown | null;
  prediction: { input: OrderInput; prediction: Prediction } | null;
  summary: EndSummary | null;
  error: string | null;
  actions: ColonyActions;
}

/** Stable action functions (same identities for the life of the hook). */
export interface ColonyActions {
  order(input: OrderInput): void;
  cancel(orderId: string): void;
  dismissNudge(id: string): void;
  setSpeed(speed: Speed): void;
  setPaused(paused: boolean): void;
  requestWhy(personId: VillagerId, decisionId?: string): void;
  clearWhy(): void;
  predict(input: OrderInput | null): void;
  restart(): void;
}

const emptyStore = (): FrameStore => ({ prev: null, curr: null, at: 0, interval: 62 });

export function useColony(seed = DEFAULT_SEED): Colony {
  const worker = useRef<Worker | null>(null);
  const store = useRef<FrameStore>(emptyStore());
  const [frame, setFrame] = useState<Frame | null>(null);
  const [paused, setPausedState] = useState(false);
  const [speed, setSpeedState] = useState<Speed>(1);
  const [slowMo, setSlowMo] = useState(false);
  const [why, setWhy] = useState<WhyBreakdown | null>(null);
  const [summary, setSummary] = useState<EndSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<Colony['prediction']>(null);
  const predictSeq = useRef(0);
  const predictInputs = useRef(new Map<number, OrderInput>());
  /** Run number: replies from an earlier run (queued before a restart) are dropped. */
  const gen = useRef(0);
  /** The why the page is waiting for; replies for another person or decision are dropped. */
  const whyWant = useRef<{ personId: VillagerId; decisionId?: string } | null>(null);

  const send = useCallback((msg: MainToWorker) => worker.current?.postMessage(msg), []);

  useEffect(() => {
    const w = new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    w.addEventListener('message', (e: MessageEvent<WorkerToMain>) => {
      const msg = e.data;
      if (msg.gen !== gen.current) return;
      switch (msg.type) {
        case 'frame': {
          const s = store.current;
          const now = performance.now();
          if (s.curr && msg.frame.minute !== s.curr.minute) {
            const gap = now - s.at;
            s.interval = Math.max(24, Math.min(400, s.interval * 0.8 + gap * 0.2));
            s.prev = s.curr;
            s.at = now;
          } else if (!s.curr) {
            s.at = now;
          }
          s.curr = msg.frame;
          setFrame(msg.frame);
          setPausedState(msg.paused);
          setSpeedState(msg.speed);
          setSlowMo(msg.slowMo);
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
        case 'ended':
          setSummary(msg.summary);
          return;
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
    gen.current += 1;
    w.postMessage({
      type: 'init',
      seed,
      scenarioVersion: SCENARIO_VERSION,
      gen: gen.current,
    } satisfies MainToWorker);

    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      // The first frame's timestamp can precede `last`; a negative tick would run the clock backwards.
      const dt = Math.max(0, t - last);
      last = t;
      w.postMessage({ type: 'tick', dtMs: dt } satisfies MainToWorker);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      w.terminate();
      worker.current = null;
      store.current = emptyStore();
    };
  }, [seed]);

  const actions = useMemo<ColonyActions>(
    () => ({
      order: (input) => send({ type: 'order', input }),
      cancel: (orderId) => send({ type: 'cancel', orderId }),
      dismissNudge: (id) => send({ type: 'dismissNudge', id }),
      setSpeed: (s) => send({ type: 'setSpeed', speed: s }),
      setPaused: (p) => send({ type: p ? 'pause' : 'resume' }),
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
        gen.current += 1;
        setSummary(null);
        setWhy(null);
        setPrediction(null);
        setError(null);
        whyWant.current = null;
        predictInputs.current.clear();
        store.current = emptyStore();
        send({ type: 'init', seed, scenarioVersion: SCENARIO_VERSION, gen: gen.current });
      },
    }),
    [send, seed],
  );

  return { store, frame, paused, speed, slowMo, why, prediction, summary, error, actions };
}
