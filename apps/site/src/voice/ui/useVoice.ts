/**
 * Owns the simulation transport (the worker, or the fixture mock). The main thread sends `tick{dtMs}` every
 * animation frame; frames, telegraphs, why sheets and the between/report views land in React state. Replies
 * from an earlier run (`gen`) and stale predictions (`requestId`) are dropped.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlaytestStatus } from '../../shared/PlaytestMenu.tsx';
import {
  downloadJson,
  fetchBuild,
  fetchPlaytestText,
  PLAYTEST_FILE_NAME,
  replayParam,
} from '../../shared/playtest.ts';
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
  /** Download this run as a playtest file. */
  exportPlaytest(): void;
  /** Replay a playtest file's text in the worker; it replaces this run only if it is valid. */
  loadPlaytest(text: string): void;
  clearPlaytest(): void;
  /** Show a playtest problem found on the page (a file too large to read). */
  playtestError(message: string): void;
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
  playtest: PlaytestStatus;
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
  const [playtest, setPlaytest] = useState<PlaytestStatus>(null);
  const gen = useRef(0);
  /** The run number a playtest load will use; its replies are accepted once the worker says it replayed. */
  const pendingLoad = useRef(0);
  const resetRef = useRef<() => void>(() => {});
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
          if (msg.gen === pendingLoad.current && msg.gen !== gen.current) {
            if (msg.type === 'replayed') {
              gen.current = msg.gen;
              resetRef.current();
              setPlaytest({ result: msg.result });
            } else if (msg.type === 'playtestError') setPlaytest({ error: msg.message });
            return;
          }
          if (msg.gen !== gen.current) return;
          switch (msg.type) {
            case 'playtest': {
              const file = msg.file;
              fetchBuild()
                .then((build) => {
                  downloadJson(PLAYTEST_FILE_NAME.voice, { ...file, build });
                  setPlaytest(null);
                })
                .catch((e: unknown) => setPlaytest({ error: `The download failed: ${String(e)}` }));
              return;
            }
            case 'playtestError':
              setPlaytest({ error: msg.message });
              return;
            case 'replayed':
              return;
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
        const url = replayParam();
        if (url) {
          setPlaytest({ busy: 'load' });
          fetchPlaytestText(url)
            .then((text) => {
              pendingLoad.current = gen.current + 1;
              t.post({ type: 'loadPlaytest', gen: pendingLoad.current, text });
            })
            .catch((e: unknown) => setPlaytest({ error: e instanceof Error ? e.message : String(e) }));
        }
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
    resetRef.current = resetRun;
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
      exportPlaytest: () => {
        setPlaytest({ busy: 'export' });
        send({ type: 'exportPlaytest' });
      },
      loadPlaytest: (text) => {
        setPlaytest({ busy: 'load' });
        pendingLoad.current = Math.max(gen.current, pendingLoad.current) + 1;
        send({ type: 'loadPlaytest', gen: pendingLoad.current, text });
      },
      clearPlaytest: () => setPlaytest(null),
      playtestError: (message) => setPlaytest({ error: message }),
      replay: (nextSeed) => {
        gen.current = Math.max(gen.current, pendingLoad.current) + 1;
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

  return { frame, between, report, telegraph, why, whyOpen, whyMissing, error, mock, playtest, actions };
}
