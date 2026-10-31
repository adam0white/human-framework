/**
 * Owns the simulation transport (the worker, or the fixture mock). The main thread sends `tick{dtMs}` every
 * animation frame; frames, telegraphs, why sheets and the between/report views land in React state. Replies
 * from an earlier run (`gen`) and stale predictions (`requestId`) are dropped.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fileSession } from '../../shared/cast-runtime.ts';
import { gameLabs } from '../../shared/lab.tsx';
import type { PlaytestStatus } from '../../shared/PlaytestMenu.tsx';
import {
  downloadJson,
  fetchBuild,
  fetchPlaytestText,
  PLAYTEST_FILE_NAME,
  replayParam,
} from '../../shared/playtest.ts';
import { startTickLoop } from '../../shared/tick-loop.ts';
import { trackTransportRun } from '../../shared/worker-telemetry.ts';
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
import { automaticTick, type PaceSetting, skipStop, skipTick } from './automatic-pace.ts';
import { savedVoice, saveVoice, type VoicePlaytest } from './autosave.ts';
import {
  bindVoicePersona,
  checkpointVoicePersona,
  gateVoiceFile,
  prepareVoiceReturn,
  receiveVoicePersona,
  resetVoicePersona,
  settleVoiceFileGate,
  voicePersonaReady,
} from './persona.tsx';

export type { VoicePlaytest } from './autosave.ts';

import { ExportRequest } from './export-request.ts';
import { predictionContext } from './obstacle.ts';
import { PausePolicy } from './pause-policy.ts';
import { pendingSceneOffer } from './reading-pace.ts';
import { openTransport, type Transport } from './transport.ts';

export interface VoiceActions {
  cancelFileLoad(): void;
  begin(): void;
  continueRun(): void;
  skip(): void;
  setAutomaticPace(pace: PaceSetting): void;
  getPlaytest(): Promise<VoicePlaytest>;
  setPaused(paused: boolean): void;
  /** UI clock hold; never changes playback state or the input log. */
  setMenuOpen(open: boolean): void;
  setPace(pace: Pace): void;
  setAutoPause(on: boolean): void;
  predict(draft: Draft | null): void;
  suggest(draft: Draft, sceneLine?: string): void;
  setReading(reading: boolean): void;
  dismissSceneOffer(): void;
  sceneWord(kind: 'care' | 'question', beat: string, words: string): void;
  withdraw(): void;
  requestWhy(decisionId: string): void;
  /** Keep the held answer readable after the worker’s recent trace expires. */
  retainWhy(decisionId: string): void;
  clearWhy(): void;
  endDay(): void;
  advance(standing: StandingWhisper[]): void;
  dismissIntro(): void;
  keepListening(): void;
  replay(seed?: number): void;
  /** Download this run as a playtest file. */
  exportPlaytest(): void;
  sendPlaytest(): void;
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
  reading: boolean;
  sceneReading: boolean;
  runId: number;
  playtest: PlaytestStatus;
  savedRun: { label: string } | null;
  paceSetting: PaceSetting;
  skipping: boolean;
  actions: VoiceActions;
}

export function useVoice(seed = SHIPPED_SEED): Voice {
  const [savedRun, setSavedRun] = useState<{ label: string } | null>(() => {
    try {
      return fileSession ? null : savedVoice(localStorage);
    } catch {
      return null;
    }
  });
  const [paceSetting, setPaceSetting] = useState<PaceSetting>('automatic');
  const paceRef = useRef<PaceSetting>('automatic');
  const [skipping, setSkipping] = useState(false);
  const skipRef = useRef(false);
  const skipAwait = useRef(false);
  const exportPending = useRef(false);
  const exportAgain = useRef(false);
  const exportWaiters = useRef<{ resolve: (file: VoicePlaytest) => void; reject: (error: Error) => void }[]>(
    [],
  );
  const returnChecks = useRef(
    new Map<
      number,
      { resolve: (header: import('../sim/persona.ts').SelinReturn) => void; reject: (error: Error) => void }
    >(),
  );
  const returnSequence = useRef(0);
  const transport = useRef<Transport | null>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [runId, setRunId] = useState(0);
  /** The last frame received on this run: partial frames are filled in from it. */
  const frameRef = useRef<Frame | null>(null);
  const [between, setBetween] = useState<BetweenView | null>(null);
  const [report, setReport] = useState<ReportView | null>(null);
  const [telegraph, setTelegraph] = useState<Voice['telegraph']>(null);
  const [why, setWhy] = useState<WhyView | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [whyMissing, setWhyMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const [playtest, setPlaytest] = useState<PlaytestStatus>(null);
  const exportRequest = useRef(new ExportRequest());
  const gen = useRef(0);
  /** The run number a playtest load will use; its replies are accepted once the worker says it replayed. */
  const pendingLoad = useRef(0);
  const loadingRun = useRef(false);
  const resetRef = useRef<() => void>(() => {});
  const seedRef = useRef(seed);
  const predictSeq = useRef(0);
  const predictDrafts = useRef(new Map<number, Draft>());
  const activeDraft = useRef<Draft | null>(null);
  const predictionFrame = useRef<string | null>(null);
  const whyWant = useRef<string | null>(null);
  const retainedWhy = useRef<{ id: string; view: WhyView | null } | null>(null);
  const pausePolicy = useRef(new PausePolicy());
  const manualHold = useRef(false);
  const menuOpen = useRef(false);
  const reading = useRef(false);
  const [resolvedSceneOffer, setResolvedSceneOffer] = useState<string | null>(null);
  const resolvedScene = useRef<string | null>(null);
  const sceneReading = useCallback((current: Frame | null) => {
    const key = pendingSceneOffer(current);
    return key !== null && key !== resolvedScene.current;
  }, []);
  const [readingView, setReadingView] = useState(false);
  const readingWhy = useRef(false);
  const awaitingSuggestion = useRef(false);

  const requestSave = useCallback(() => {
    if (fileSession || loadingRun.current || !frameRef.current || frameRef.current.phase === 'premise')
      return;
    if (exportPending.current) {
      exportAgain.current = true;
      return;
    }
    exportPending.current = true;
    transport.current?.post({ type: 'exportPlaytest' });
  }, []);
  const cancelSkip = useCallback(() => {
    skipRef.current = false;
    skipAwait.current = false;
    setSkipping(false);
  }, []);
  const send = useCallback(
    (msg: MainToWorker) => {
      const stamped = { ...msg, castRunGeneration: gen.current };
      transport.current?.post(stamped);
      if (
        !['predict', 'why', 'tick', 'init', 'loadPlaytest', 'exportPlaytest', 'telemetry'].includes(msg.type)
      )
        requestSave();
    },
    [requestSave],
  );

  useEffect(() => {
    let cancelled = false;
    let stopTicks = () => {};
    let stopTelemetry = () => {};
    let stopPersona = () => {};
    let opened: Transport | null = null;
    if (fileSession && new URLSearchParams(window.location.search).get('mock') === '1') {
      setError('Remove mock=1 to open a game file.');
      return;
    }
    openTransport()
      .then(async (t) => {
        if (cancelled) {
          t.close();
          return;
        }
        opened = t;
        transport.current = t;
        setMock(t.kind === 'mock');
        t.onError((message) => {
          for (const waiter of returnChecks.current.values()) waiter.reject(new Error(message));
          returnChecks.current.clear();
          settleVoiceFileGate(false);
          setError(message);
          exportPending.current = false;
          for (const waiter of exportWaiters.current.splice(0)) waiter.reject(new Error(message));
        });
        stopPersona = bindVoicePersona(
          (message) => t.post(message),
          (header, sourceSeed) => {
            gen.current = Math.max(gen.current, pendingLoad.current) + 1;
            resetRef.current();
            t.post({
              type: 'init',
              seed: sourceSeed,
              gen: gen.current,
              scenarioVersion: VOICE_SCENARIO_VERSION,
              selinReturn: header,
            });
          },
          (header) =>
            new Promise((resolve, reject) => {
              const requestId = ++returnSequence.current;
              returnChecks.current.set(requestId, { resolve, reject });
              t.post({ type: 'personaReturnCheck', requestId, header });
            }),
        );
        t.onMessage((msg) => {
          if (msg.type === 'personaReturnReady') {
            const waiter = returnChecks.current.get(msg.requestId);
            returnChecks.current.delete(msg.requestId);
            if (msg.header) waiter?.resolve(msg.header);
            else waiter?.reject(new Error(msg.error ?? 'Return validation failed.'));
            return;
          }
          if (msg.gen === pendingLoad.current && msg.gen !== gen.current) {
            if (msg.type === 'replayed') {
              settleVoiceFileGate(true);
              loadingRun.current = false;
              gen.current = msg.gen;
              resetRef.current();
              manualHold.current = true;
              setPlaytest({ result: msg.result });
            } else if (msg.type === 'playtestError') {
              settleVoiceFileGate(false);
              loadingRun.current = false;
              setPlaytest({ error: msg.message });
            }
            return;
          }
          if (msg.gen !== gen.current) return;
          if (msg.type === 'personaStarted') {
            settleVoiceFileGate(true);
            return;
          }
          if (msg.type === 'personaCheckpoint') {
            void receiveVoicePersona(msg);
            return;
          }
          switch (msg.type) {
            case 'playtest': {
              exportPending.current = false;
              try {
                if (
                  !fileSession &&
                  frameRef.current?.phase !== 'premise' &&
                  saveVoice(localStorage, msg.file)
                )
                  setSavedRun(savedVoice(localStorage));
              } catch {
                /* Storage may be unavailable. */
              }
              for (const waiter of exportWaiters.current.splice(0)) waiter.resolve(msg.file);
              if (exportAgain.current) {
                exportAgain.current = false;
                requestSave();
              }
              const ticket = exportRequest.current.replyTicket(msg.gen, msg.requestId);
              if (ticket === null) return;
              const file = msg.file;
              const toLab = exportRequest.current.destination(msg.gen);
              (fileSession ? Promise.resolve(file.build) : fetchBuild())
                .then((build) => {
                  if (exportRequest.current.ticket(msg.gen) !== ticket) return;
                  if (toLab) {
                    gameLabs.voice.openSendDialog({ getRun: () => ({ ...file, build }) });
                  } else downloadJson(PLAYTEST_FILE_NAME.voice, { ...file, build });
                  exportRequest.current.finish(msg.gen, ticket);
                  setPlaytest(null);
                })
                .catch((e: unknown) => {
                  if (!exportRequest.current.finish(msg.gen, ticket)) return;
                  setPlaytest({ error: `The download failed: ${String(e)}` });
                });
              return;
            }
            case 'playtestError': {
              const exporting = exportPending.current;
              exportPending.current = false;
              for (const waiter of exportWaiters.current.splice(0)) waiter.reject(new Error(msg.message));
              if (msg.restore) exportAgain.current = false;
              const finished = exportRequest.current.finish(msg.gen);
              // A failed people restore is the player's only explanation for a stopped game, so it always
              // shows, even while the loaded frame's autosave export waits. Other errors stay quiet then.
              if (!finished && exporting && !msg.restore) return;
              setPlaytest({ error: msg.message });
              return;
            }
            case 'replayed':
              return;
            case 'frame': {
              // Unchanged fields keep their previous objects, so memoized panels and DayLog's collapse skip work.
              const { frame: part, same } = msg;
              const prev = frameRef.current;
              if (same && !prev) {
                setError('The simulation sent part of a frame before a whole one.');
                return;
              }
              const next = { ...part } as Record<string, unknown>;
              if (same && prev) for (const k of same) next[k] = prev[k];
              frameRef.current = next as unknown as Frame;
              setFrame(frameRef.current);
              const current = frameRef.current;
              skipAwait.current = false;
              if (skipRef.current && prev && skipStop(prev, current)) {
                cancelSkip();
                if (!current.paused && ['day', 'free', 'eid'].includes(current.phase)) {
                  manualHold.current = true;
                  send({ type: 'pause' });
                }
              }
              if (
                !prev ||
                current.minute !== prev.minute ||
                current.day !== prev.day ||
                current.phase !== prev.phase
              )
                requestSave();
              const pacing = pausePolicy.current.update(
                current,
                prev,
                loadingRun.current ||
                  manualHold.current ||
                  readingWhy.current ||
                  reading.current ||
                  awaitingSuggestion.current,
              );
              // An unavailable suggestion stays held. The reader controls when the answer gives way to the clock.
              if (awaitingSuggestion.current) {
                const last = current.log.at(-1);
                const failed =
                  (last?.who === 'you' && last.kind === 'note' && /Nothing was said/.test(last.text)) ||
                  current.sceneWords?.at(-1)?.said === false;
                manualHold.current = current.paused && !!failed;
                awaitingSuggestion.current = false;
              }
              if (pacing && !reading.current) {
                if (pacing === 'pause') manualHold.current = true;
                send({ type: pacing });
              }
              const context = predictionContext(current);
              if (context !== predictionFrame.current) {
                predictionFrame.current = context;
                const draft = activeDraft.current;
                if (draft) {
                  // A matching draft is insufficient: his likely answer belongs to a particular moment.
                  predictSeq.current += 1;
                  predictDrafts.current.clear();
                  setTelegraph(null);
                  if (
                    current.composer.open &&
                    !current.muted &&
                    current.options.some((o) => o.id === draft.optionId)
                  ) {
                    predictDrafts.current.set(predictSeq.current, draft);
                    send({ type: 'predict', requestId: predictSeq.current, draft });
                  } else activeDraft.current = null;
                }
              }
              return;
            }
            case 'predicted': {
              const draft = predictDrafts.current.get(msg.requestId);
              predictDrafts.current.delete(msg.requestId);
              if (draft && msg.requestId === predictSeq.current)
                setTelegraph({ draft, telegraph: msg.telegraph });
              return;
            }
            case 'why':
              if (retainedWhy.current?.id === msg.decisionId) retainedWhy.current.view = msg.why;
              if (msg.decisionId !== whyWant.current) return;
              setWhy(msg.why);
              setWhyMissing(msg.why === null);
              return;
            case 'between':
              checkpointVoicePersona();
              setBetween(msg.view);
              return;
            case 'report':
              checkpointVoicePersona();
              setReport(msg.view);
              return;
            case 'error':
              settleVoiceFileGate(false);
              exportPending.current = false;
              for (const waiter of exportWaiters.current.splice(0)) waiter.reject(new Error(msg.message));
              setError(msg.message);
              return;
          }
        });
        await voicePersonaReady;
        if (cancelled) return;
        gen.current += 1;
        if (fileSession) t.post({ type: 'fileSession' });
        else
          t.post({
            type: 'init',
            seed: seedRef.current,
            castPreview: true,
            gen: gen.current,
            scenarioVersion: VOICE_SCENARIO_VERSION,
          });
        if (t.kind === 'worker')
          stopTelemetry = trackTransportRun(
            {
              post: (message) => t.post(message),
              listen: (receive) => {
                t.onMessage((message) => {
                  if (message.type === 'telemetry' || message.type === 'saved' || message.type === 'error')
                    receive(message);
                });
                return () => {};
              },
            },
            gameLabs.voice,
            () => gen.current,
          );
        stopTicks = startTickLoop((dtMs) => {
          if (menuOpen.current || loadingRun.current) return;
          if (skipRef.current && (reading.current || readingWhy.current || sceneReading(frameRef.current)))
            cancelSkip();
          if (skipRef.current && skipAwait.current) return;
          if (skipRef.current) skipAwait.current = true;
          t.post({
            type: 'tick',
            wallDtMs: dtMs,
            dtMs:
              skipRef.current && frameRef.current
                ? skipTick(frameRef.current)
                : automaticTick(
                    dtMs,
                    frameRef.current,
                    paceRef.current,
                    reading.current,
                    sceneReading(frameRef.current),
                  ),
          });
        });
        const url = fileSession ? null : replayParam();
        if (url) {
          setPlaytest({ busy: 'load' });
          fetchPlaytestText(url)
            .then(async (text) => {
              pendingLoad.current = gen.current + 1;
              loadingRun.current = true;
              await gateVoiceFile(text);
              t.post({ type: 'loadPlaytest', gen: pendingLoad.current, text });
            })
            .catch((e: unknown) => setPlaytest({ error: e instanceof Error ? e.message : String(e) }));
        }
      })
      .catch((e: unknown) => setError(`The simulation failed to load: ${String(e)}`));
    return () => {
      cancelled = true;
      for (const waiter of returnChecks.current.values()) waiter.reject(new Error('The game was closed.'));
      returnChecks.current.clear();
      for (const waiter of exportWaiters.current.splice(0)) waiter.reject(new Error('The game was closed.'));
      exportRequest.current.reset();
      stopPersona();
      stopTelemetry();
      stopTicks();
      opened?.close();
      transport.current = null;
    };
  }, [send, sceneReading, requestSave, cancelSkip]);

  const automaticReturnPending = useRef(false);
  const actions = useMemo<VoiceActions>(() => {
    const resetRun = () => {
      for (const waiter of returnChecks.current.values()) waiter.reject(new Error('The run changed.'));
      returnChecks.current.clear();
      setRunId((id) => id + 1);
      exportRequest.current.reset();
      exportPending.current = false;
      exportAgain.current = false;
      for (const waiter of exportWaiters.current.splice(0)) waiter.reject(new Error('The run changed.'));
      cancelSkip();
      setPlaytest(null);
      frameRef.current = null;
      setFrame(null);
      setBetween(null);
      setReport(null);
      setTelegraph(null);
      setWhy(null);
      setWhyOpen(false);
      setError(null);
      whyWant.current = null;
      retainedWhy.current = null;
      pausePolicy.current = new PausePolicy();
      loadingRun.current = false;
      manualHold.current = false;
      reading.current = false;
      resolvedScene.current = null;
      setResolvedSceneOffer(null);
      setReadingView(false);
      readingWhy.current = false;
      awaitingSuggestion.current = false;
      predictDrafts.current.clear();
      activeDraft.current = null;
      predictionFrame.current = null;
    };
    resetRef.current = resetRun;
    const continuePerson = async (): Promise<boolean> => {
      if (fileSession) return false;
      if (automaticReturnPending.current) return true;
      const priorGeneration = gen.current;
      const priorLoad = pendingLoad.current;
      const priorTransport = transport.current;
      automaticReturnPending.current = true;
      let prepared: Awaited<ReturnType<typeof prepareVoiceReturn>>;
      try {
        prepared = await prepareVoiceReturn(
          true,
          undefined,
          () =>
            priorGeneration === gen.current &&
            priorLoad === pendingLoad.current &&
            priorTransport === transport.current &&
            !!transport.current,
        );
      } catch (error) {
        setError(String(error));
        return true;
      } finally {
        automaticReturnPending.current = false;
      }
      if (
        priorGeneration !== gen.current ||
        priorLoad !== pendingLoad.current ||
        priorTransport !== transport.current ||
        !transport.current
      )
        return true;
      if (!prepared) return false;
      gen.current = Math.max(gen.current, pendingLoad.current) + 1;
      resetRun();
      send({
        type: 'init',
        seed: prepared.seed,
        gen: gen.current,
        scenarioVersion: VOICE_SCENARIO_VERSION,
        selinReturn: prepared.header,
      });
      return true;
    };
    return {
      cancelFileLoad: () => {
        if (!fileSession) throw new Error('File cancellation requires a file session.');
        setPlaytest(null);
        pendingLoad.current = Math.max(gen.current, pendingLoad.current) + 1;
        loadingRun.current = false;
        transport.current?.post({ type: 'cancelFileLoad' });
      },
      continueRun: () => {
        if (fileSession) throw new Error('A file session cannot restore native play.');
        void continuePerson().then((continued) => {
          if (continued) return;
          try {
            const saved = savedVoice(localStorage);
            if (saved) {
              loadingRun.current = true;
              pendingLoad.current = Math.max(gen.current, pendingLoad.current) + 1;
              setPlaytest({ busy: 'load' });
              void gateVoiceFile(saved.text)
                .then(() =>
                  send({ type: 'loadPlaytest', gen: pendingLoad.current, text: saved.text, local: true }),
                )
                .catch((error) => {
                  loadingRun.current = false;
                  settleVoiceFileGate(false);
                  setPlaytest({ error: String(error) });
                });
            }
          } catch {
            /* No storage. */
          }
        });
      },
      skip: () => {
        if (skipRef.current) {
          cancelSkip();
          return;
        }
        const current = frameRef.current;
        if (
          !current ||
          current.paused ||
          current.intro ||
          menuOpen.current ||
          reading.current ||
          readingWhy.current ||
          sceneReading(current) ||
          !['day', 'eid', 'free'].includes(current.phase)
        )
          return;
        skipRef.current = true;
        setSkipping(true);
      },
      setAutomaticPace: (pace) => {
        paceRef.current = pace;
        setPaceSetting(pace);
        cancelSkip();
      },
      getPlaytest: () =>
        new Promise<VoicePlaytest>((resolve, reject) => {
          if (!transport.current || loadingRun.current) {
            reject(new Error('The game is still loading.'));
            return;
          }
          exportWaiters.current.push({ resolve, reject });
          // Explicit feedback exports work on the title page too. Autosave still excludes the premise.
          if (!exportPending.current) {
            exportPending.current = true;
            send({ type: 'exportPlaytest', ...(fileSession ? { full: true } : {}) });
          }
        }),
      begin: () => {
        manualHold.current = false;
        void continuePerson().then((continued) => {
          if (!continued) send({ type: 'begin' });
        });
      },
      setMenuOpen: (open) => {
        menuOpen.current = open;
        if (open) {
          cancelSkip();
          requestSave();
        }
      },
      setPaused: (p) => {
        manualHold.current = p;
        send({ type: p ? 'pause' : 'resume' });
      },
      setPace: (pace) => {
        paceRef.current = pace;
        setPaceSetting(pace);
      },
      setAutoPause: (on) => send({ type: 'setAutoPause', on }),
      predict: (draft) => {
        predictSeq.current += 1;
        predictDrafts.current.clear();
        activeDraft.current = draft;
        setTelegraph(null);
        if (!draft) {
          setTelegraph(null);
          return;
        }
        predictDrafts.current.set(predictSeq.current, draft);
        send({ type: 'predict', requestId: predictSeq.current, draft });
      },
      dismissSceneOffer: () => {
        resolvedScene.current = pendingSceneOffer(frameRef.current);
        setResolvedSceneOffer(resolvedScene.current);
      },
      suggest: (draft, sceneLine) => {
        resolvedScene.current = pendingSceneOffer(frameRef.current);
        setResolvedSceneOffer(resolvedScene.current);
        manualHold.current = false;
        awaitingSuggestion.current = true;
        send({ type: 'suggest', draft, ...(sceneLine ? { sceneLine } : {}) });
      },
      setReading: (on) => {
        if (on) cancelSkip();
        reading.current = on;
        setReadingView(on);
      },
      sceneWord: (kind, beat, words) => send({ type: 'sceneWord', kind, beat, words }),
      withdraw: () => send({ type: 'withdraw' }),
      retainWhy: (decisionId) => {
        retainedWhy.current = { id: decisionId, view: null };
        send({ type: 'why', decisionId });
      },
      requestWhy: (decisionId) => {
        readingWhy.current = true;
        const retained = retainedWhy.current;
        if (retained?.id === decisionId && retained.view) {
          whyWant.current = decisionId;
          setWhy(retained.view);
          setWhyMissing(false);
          setWhyOpen(true);
          return;
        }
        if (whyWant.current !== decisionId) setWhy(null);
        setWhyMissing(false);
        whyWant.current = decisionId;
        setWhyOpen(true);
        send({ type: 'why', decisionId });
      },
      clearWhy: () => {
        readingWhy.current = false;
        whyWant.current = null;
        setWhyOpen(false);
        setWhy(null);
        setWhyMissing(false);
      },
      endDay: () => send({ type: 'endDay' }),
      advance: (standing) => {
        manualHold.current = false;
        awaitingSuggestion.current = false;
        setBetween(null);
        send({ type: 'advance', standing });
      },
      dismissIntro: () => {
        manualHold.current = false;
        send({ type: 'dismissIntro' });
      },
      keepListening: () => {
        manualHold.current = false;
        setReport(null);
        send({ type: 'keepListening' });
      },
      sendPlaytest: () => {
        if (!exportRequest.current.begin(gen.current, true)) return;
        setPlaytest({ busy: 'export' });
        send({
          type: 'exportPlaytest',
          full: true,
          requestId: exportRequest.current.ticket(gen.current) ?? undefined,
        });
      },
      exportPlaytest: () => {
        if (!exportRequest.current.begin(gen.current, false)) return;
        setPlaytest({ busy: 'export' });
        send({
          type: 'exportPlaytest',
          full: true,
          requestId: exportRequest.current.ticket(gen.current) ?? undefined,
        });
      },
      loadPlaytest: (text) => {
        if (automaticReturnPending.current) {
          setPlaytest({ error: 'A person is arriving. Wait for that chapter before importing a run.' });
          return;
        }
        // Old frames can still arrive while the worker replaces the run. Never send a stale resume into it.
        loadingRun.current = true;
        reading.current = false;
        setReadingView(false);
        exportRequest.current.reset();
        setPlaytest({ busy: 'load' });
        pendingLoad.current = Math.max(gen.current, pendingLoad.current) + 1;
        void gateVoiceFile(text)
          .then(() => send({ type: 'loadPlaytest', gen: pendingLoad.current, text }))
          .catch((error) => {
            loadingRun.current = false;
            settleVoiceFileGate(false);
            setPlaytest({ error: String(error) });
          });
      },
      clearPlaytest: () => setPlaytest(null),
      playtestError: (message) => setPlaytest({ error: message }),
      replay: (nextSeed) => {
        if (automaticReturnPending.current) {
          setPlaytest({ error: 'A person is arriving. Wait for that chapter before starting again.' });
          return;
        }
        if (fileSession) throw new Error('A file session cannot start a native town.');
        resetVoicePersona();
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
  }, [send, requestSave, cancelSkip, sceneReading]);

  return {
    frame,
    between,
    report,
    telegraph,
    why,
    whyOpen,
    whyMissing,
    error,
    mock,
    reading:
      readingView || (pendingSceneOffer(frame) !== null && pendingSceneOffer(frame) !== resolvedSceneOffer),
    sceneReading: sceneReading(frame),
    runId,
    playtest,
    savedRun,
    paceSetting,
    skipping,
    actions,
  };
}
