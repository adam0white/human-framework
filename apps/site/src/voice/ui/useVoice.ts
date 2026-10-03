/**
 * Owns the simulation transport (the worker, or the fixture mock). The main thread sends `tick{dtMs}` every
 * animation frame; frames, telegraphs, why sheets and the between/report views land in React state. Replies
 * from an earlier run (`gen`) and stale predictions (`requestId`) are dropped.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BetweenView,
  Draft,
  Frame,
  MainToWorker,
  Pace,
  ReportView,
  StandingWhisper,
  Telegraph,
  WhyView,
} from '../protocol.ts';
import { SHIPPED_SEED, VOICE_SCENARIO_VERSION } from '../protocol.ts';
import { openTransport, type Transport } from './transport.ts';

export interface VoiceActions {
  begin(): void;
  setPaused(paused: boolean): void;
  setPace(pace: Pace): void;
  setAutoPause(on: boolean): void;
  predict(draft: Draft | null): void;
  suggest(draft: Draft): void;
  withdraw(): void;
  requestWhy(decisionId: string): void;
  clearWhy(): void;
  endDay(): void;
  advance(standing: StandingWhisper[]): void;
  dismissIntro(): void;
  keepListening(): void;
  replay(seed?: number): void;
}

export interface Voice {
  frame: Frame | null;
  between: BetweenView | null;
  report: ReportView | null;
  telegraph: { draft: Draft; telegraph: Telegraph } | null;
  why: WhyView | null;
  whyOpen: boolean;
  /** The worker no longer holds that decision (it is too far back). */
  whyMissing: boolean;
  error: string | null;
  mock: boolean;
  actions: VoiceActions;
}

export function useVoice(seed = SHIPPED_SEED): Voice {
  const transport = useRef<Transport | null>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [between, setBetween] = useState<BetweenView | null>(null);
  const [report, setReport] = useState<ReportView | null>(null);
  const [telegraph, setTelegraph] = useState<Voice['telegraph']>(null);
  const [why, setWhy] = useState<WhyView | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [whyMissing, setWhyMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const gen = useRef(0);
  const seedRef = useRef(seed);
  const predictSeq = useRef(0);
  const predictDrafts = useRef(new Map<number, Draft>());
  const whyWant = useRef<string | null>(null);

  const send = useCallback((msg: MainToWorker) => transport.current?.post(msg), []);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let opened: Transport | null = null;
    openTransport()
      .then((t) => {
        if (cancelled) {
          t.close();
          return;
        }
        opened = t;
        transport.current = t;
        setMock(t.kind === 'mock');
        t.onError(setError);
        t.onMessage((msg) => {
          if (msg.gen !== gen.current) return;
          switch (msg.type) {
            case 'frame':
              setFrame(msg.frame);
              return;
            case 'predicted': {
              const draft = predictDrafts.current.get(msg.requestId);
              predictDrafts.current.delete(msg.requestId);
              if (draft && msg.requestId === predictSeq.current)
                setTelegraph({ draft, telegraph: msg.telegraph });
              return;
            }
            case 'why':
              if (msg.decisionId !== whyWant.current) return;
              setWhy(msg.why);
              setWhyMissing(msg.why === null);
              return;
            case 'between':
              setBetween(msg.view);
              return;
            case 'report':
              setReport(msg.view);
              return;
            case 'error':
              setError(msg.message);
              return;
          }
        });
        gen.current += 1;
        t.post({
          type: 'init',
          seed: seedRef.current,
          gen: gen.current,
          scenarioVersion: VOICE_SCENARIO_VERSION,
        });
        let last = performance.now();
        const loop = (now: number) => {
          // The first timestamp can precede `last`; a negative tick would run the clock backwards.
          const dt = Math.max(0, now - last);
          last = now;
          t.post({ type: 'tick', dtMs: dt });
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch((e: unknown) => setError(`The simulation failed to load: ${String(e)}`));
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      opened?.close();
      transport.current = null;
    };
  }, []);

  const actions = useMemo<VoiceActions>(() => {
    const resetRun = () => {
      setFrame(null);
      setBetween(null);
      setReport(null);
      setTelegraph(null);
      setWhy(null);
      setWhyOpen(false);
      setError(null);
      whyWant.current = null;
      predictDrafts.current.clear();
    };
    return {
      begin: () => send({ type: 'begin' }),
      setPaused: (p) => send({ type: p ? 'pause' : 'resume' }),
      setPace: (pace) => send({ type: 'setPace', pace }),
      setAutoPause: (on) => send({ type: 'setAutoPause', on }),
      predict: (draft) => {
        predictSeq.current += 1;
        if (!draft) {
          setTelegraph(null);
          return;
        }
        predictDrafts.current.set(predictSeq.current, draft);
        send({ type: 'predict', requestId: predictSeq.current, draft });
      },
      suggest: (draft) => send({ type: 'suggest', draft }),
      withdraw: () => send({ type: 'withdraw' }),
      requestWhy: (decisionId) => {
        if (whyWant.current !== decisionId) setWhy(null);
        setWhyMissing(false);
        whyWant.current = decisionId;
        setWhyOpen(true);
        send({ type: 'why', decisionId });
      },
      clearWhy: () => {
        whyWant.current = null;
        setWhyOpen(false);
        setWhy(null);
        setWhyMissing(false);
      },
      endDay: () => send({ type: 'endDay' }),
      advance: (standing) => {
        setBetween(null);
        send({ type: 'advance', standing });
      },
      dismissIntro: () => send({ type: 'dismissIntro' }),
      keepListening: () => {
        setReport(null);
        send({ type: 'keepListening' });
      },
      replay: (nextSeed) => {
        gen.current += 1;
        if (nextSeed !== undefined) seedRef.current = nextSeed;
        resetRun();
        // A new gen and `init`: the worker restarts from the seed and answers on that gen.
        const t = transport.current;
        if (!t) return;
        t.post({
          type: 'init',
          seed: seedRef.current,
          gen: gen.current,
          scenarioVersion: VOICE_SCENARIO_VERSION,
        });
      },
    };
  }, [send]);

  return { frame, between, report, telegraph, why, whyOpen, whyMissing, error, mock, actions };
}
