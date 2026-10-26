/**
 * Game 2, *The Day You Say Nothing*. The Day view leads with a scene, a quiet routine disclosure,
 * and plain suggestions. Halil and Ends remain available through tabs. Space toggles the clock.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { sceneKey } from '../../free-text/core.ts';
import { RequestTranslator } from '../../free-text/RequestTranslator.tsx';
import { CastLifeNote, CastStartGate } from '../../shared/CastMenu.tsx';
import { useWakeLock } from '../../shared/fullscreen.tsx';
import { LabNotice } from '../../shared/LabNotice.tsx';
import { gameLabs, useLabScreen } from '../../shared/lab.tsx';
import { PlaytestNotice } from '../../shared/PlaytestMenu.tsx';
import { playerError } from '../../shared/player-error.ts';
import type { Draft } from '../protocol.ts';
import { Between } from './Between.tsx';
import { DayLog } from './DayLog.tsx';
import { EndsPane } from './EndsPane.tsx';
import { HalilPane } from './HalilPane.tsx';
import { Intro } from './Intro.tsx';
import { Premise } from './Premise.tsx';
import { Report } from './Report.tsx';
import { SceneDay } from './SceneDay.tsx';
import { SendWord } from './SendWord.tsx';
import { InfoPanel, MenuPanel, OtherWays } from './ShellPanels.tsx';
import { useStableSpeechFrame } from './stable-speech-frame.ts';
import { TopBar } from './TopBar.tsx';
import { useVoice } from './useVoice.ts';
import { VoicesPane } from './VoicesPane.tsx';
import { Why } from './Why.tsx';
import { voiceWords as settingWords } from './words.ts';

type Tab = 'halil' | 'ends' | 'today';
const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'halil', label: 'Halil' },
  { id: 'ends', label: 'His goals' },
];

export function App() {
  const liveVoice = useVoice();
  const stable = useStableSpeechFrame(liveVoice.frame);
  const voice = { ...liveVoice, frame: stable.frame };
  const { frame, actions } = voice;
  const [tab, setTab] = useState<Tab>('halil');
  const [panelOpen, setPanelOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [freeText, setFreeText] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [otherWays, setOtherWays] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const [speakRequest, setSpeakRequest] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [readingScene, setReadingScene] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [speakCaption, setSpeakCaption] = useState('You can wait without choosing a suggestion.');
  const [holdingReply, setHoldingReply] = useState(false);
  const [whyId, setWhyId] = useState<string | null>(null);

  useEffect(() => {
    if (voice.runId > 0) {
      setTitleOpen(false);
      setPanelOpen(false);
    }
  }, [voice.runId]);

  const phase = frame?.phase ?? 'premise';
  useLabScreen(gameLabs.voice, phase === 'premise' ? 'title' : phase === 'report' ? 'ending' : 'play');
  const live = phase === 'day' || phase === 'eid' || phase === 'free';
  const overlay: 'premise' | 'intro' | 'between' | 'report' | null =
    !frame || phase === 'premise' || titleOpen
      ? 'premise'
      : phase === 'between'
        ? holdingReply
          ? null
          : 'between'
        : phase === 'report'
          ? holdingReply
            ? null
            : 'report'
          : frame.intro
            ? 'intro'
            : null;

  // Keep the screen awake only while the day's clock runs (not paused, not on a card or the report).
  useWakeLock(live && overlay === null && frame !== null && !frame.paused);

  useEffect(() => {
    actions.setReading(readingScene || panelOpen);
  }, [actions, readingScene, panelOpen]);

  const clockHeld = menuOpen || infoOpen || feedbackOpen || titleOpen || otherWays;
  useEffect(() => {
    actions.setMenuOpen(clockHeld);
    return () => actions.setMenuOpen(false);
  }, [actions, clockHeld]);
  useEffect(() => {
    if (!infoOpen) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        !event.target.closest('.v-info-popover, [aria-label="Information"]')
      )
        setInfoOpen(false);
    };
    window.addEventListener('pointerdown', outside);
    return () => window.removeEventListener('pointerdown', outside);
  }, [infoOpen]);
  useEffect(() => {
    if (panelOpen && voice.skipping) actions.skip();
  }, [panelOpen, voice.skipping, actions]);
  const keyState = useRef({ overlay, live, held: clockHeld, paused: frame?.paused ?? true });
  keyState.current = { overlay, live, held: clockHeld, paused: frame?.paused ?? true };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (keyState.current.held) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        setInfoOpen(false);
        setMenuOpen(false);
        setPanelOpen(false);
        setOtherWays(false);
        return;
      }
      if (
        event.code !== 'Space' ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        keyState.current.held ||
        (event.target instanceof Element &&
          event.target.closest('input,textarea,select,button,a,[contenteditable]'))
      )
        return;
      const state = keyState.current;
      if (state.overlay) {
        document
          .querySelector<HTMLButtonElement>(
            '.v-page .v-btn-primary:not(:disabled), .v-overlay .v-btn-primary:not(:disabled)',
          )
          ?.click();
        event.preventDefault();
      } else if (state.live && state.paused) {
        actions.dismissSceneOffer();
        actions.setPaused(false);
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions]);

  const openWhy = useCallback(
    (decisionId: string) => {
      setWhyId(decisionId);
      actions.requestWhy(decisionId);
    },
    [actions],
  );
  const closeWhy = useCallback(() => {
    setWhyId(null);
    actions.clearWhy();
  }, [actions]);

  // The game resumes itself on Confirm (and stays paused if the option went away), so no setPaused here.
  const suggest = useCallback((d: Draft, line?: string) => actions.suggest(d, line), [actions]);
  const sayNothing = useCallback(() => {
    actions.dismissSceneOffer();
    actions.setPaused(false);
  }, [actions]);

  // A new run closes any open why sheet.
  useEffect(() => {
    if (overlay) closeWhy();
  }, [overlay, closeWhy]);

  return (
    <div
      className={`voice phase-${phase}`}
      data-tab={tab}
      data-clock-held={clockHeld}
      onPointerDownCapture={stable.onPointerDownCapture}
      onKeyDownCapture={stable.onKeyDownCapture}
    >
      <CastStartGate game="voice" />
      <CastLifeNote game="voice" />
      <TopBar
        frame={liveVoice.frame}
        title={overlay === 'premise'}
        reading={readingScene || panelOpen}
        skipping={voice.skipping}
        infoOpen={infoOpen}
        menuOpen={menuOpen}
        onInfo={() => {
          setInfoOpen((open) => !open);
          setMenuOpen(false);
        }}
        onMenu={() => {
          setMenuOpen((open) => !open);
          setInfoOpen(false);
        }}
      />
      <LabNotice />
      {frame && !overlay && (
        <main className="v-play-layout">
          <nav className="v-panel-chips" aria-label="Panels">
            {[TABS[1], TABS[2], TABS[0]]
              .filter((t) => !!t)
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={panelOpen && tab === t.id}
                  onClick={() => {
                    setTab(t.id);
                    setPanelOpen((open) => (tab === t.id ? !open : true));
                  }}
                >
                  {settingWords(t.label)} ▸
                </button>
              ))}
          </nav>
          <div className="v-scene-column">
            {freeText && (liveVoice.frame ?? frame).composer.open && !(liveVoice.frame ?? frame).muted && (
              <RequestTranslator
                acts={(liveVoice.frame ?? frame).options.map(({ id, label }) => ({ id, label }))}
                scene={sceneKey(
                  String(voice.runId),
                  (liveVoice.frame ?? frame).day,
                  (liveVoice.frame ?? frame).minute,
                  (liveVoice.frame ?? frame).options.map(({ id, label }) => ({ id, label })),
                )}
                onHold={() => actions.setPaused(true)}
                onConfirm={suggest}
              />
            )}
            <SceneDay
              key={voice.runId}
              frame={frame}
              liveFrame={liveVoice.frame ?? frame}
              active
              telegraph={voice.telegraph}
              whyOpen={voice.whyOpen}
              selected={whyId}
              onWhy={openWhy}
              onRetainWhy={actions.retainWhy}
              onPredict={actions.predict}
              onSuggest={suggest}
              onSceneWord={actions.sceneWord}
              onReading={setReadingScene}
              sceneReading={voice.sceneReading}
              onPersonalReply={setHoldingReply}
              onSayNothing={sayNothing}
              onWithdraw={actions.withdraw}
              onPause={() => actions.setPaused(true)}
              speakRequest={speakRequest}
              onSpeakingChange={setSpeaking}
              onSpeakAvailability={(available, caption) => {
                setCanSpeak(available);
                setSpeakCaption(caption);
              }}
            />
          </div>
          <aside className={`v-context-column ${panelOpen ? 'is-open' : ''}`}>
            <header className="v-context-header">
              <nav aria-label="Panels">
                {[TABS[1], TABS[2], TABS[0]]
                  .filter((t) => !!t)
                  .map((t) => (
                    <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
                      {settingWords(t.label)}
                    </button>
                  ))}
              </nav>
              <button type="button" aria-label="Close panel" onClick={() => setPanelOpen(false)}>
                ×
              </button>
            </header>
            <div className="v-context-body">
              {tab === 'halil' ? (
                <>
                  <button
                    type="button"
                    className="v-current-why v-btn"
                    onClick={() => {
                      const id = frame.log.findLast((entry) => entry.decisionId)?.decisionId;
                      if (id) openWhy(id);
                    }}
                  >
                    Why is he doing this? ▸
                  </button>
                  <HalilPane halil={frame.halil} />
                </>
              ) : tab === 'ends' ? (
                <>
                  <EndsPane ends={frame.ends} {...(frame.unasked ? { unasked: frame.unasked } : {})} />
                  <h2 className="v-sub">Who else he hears</h2>
                  <VoicesPane voices={frame.voices} />
                </>
              ) : (
                <DayLog
                  log={frame.log}
                  paused={frame.paused || readingScene || panelOpen}
                  {...(frame.pauseBeat ? { pauseBeat: frame.pauseBeat } : {})}
                  onWhy={openWhy}
                  selected={whyId}
                  onRetainWhy={actions.retainWhy}
                />
              )}
            </div>
          </aside>
          {!speaking && (
            <footer className="v-live-actions">
              <p>{settingWords(frame.muted ? 'You are silent today. Watch.' : speakCaption)}</p>
              <div>
                {canSpeak && !frame.muted && (
                  <button
                    type="button"
                    className="v-btn"
                    onClick={() => {
                      setPanelOpen(false);
                      setSpeakRequest((value) => value + 1);
                    }}
                  >
                    Speak
                  </button>
                )}
                {frame.paused || voice.sceneReading ? (
                  <button type="button" className="v-btn" onClick={sayNothing}>
                    Let time pass
                  </button>
                ) : (
                  !panelOpen && (
                    <button
                      type="button"
                      className="v-btn"
                      aria-label="Skip to the next event"
                      aria-pressed={voice.skipping}
                      onClick={actions.skip}
                    >
                      Skip ⏩
                    </button>
                  )
                )}
              </div>
            </footer>
          )}
        </main>
      )}
      {voice.whyOpen && !overlay && <Why why={voice.why} missing={voice.whyMissing} onClose={closeWhy} />}

      {overlay === 'premise' && (
        <Premise
          ready={frame !== null}
          savedRun={voice.savedRun}
          onContinue={() => {
            setTitleOpen(false);
            actions.continueRun();
          }}
          onOtherWays={() => setOtherWays(true)}
          onBegin={() => {
            setTitleOpen(false);
            if (phase === 'premise') actions.begin();
            else {
              actions.replay();
              actions.begin();
            }
          }}
        />
      )}
      {overlay === 'intro' && frame?.intro && (
        <Intro intro={frame.intro} eid={phase === 'eid'} onContinue={actions.dismissIntro} />
      )}
      {overlay === 'between' &&
        (voice.between ? (
          <Between
            sceneWords={frame?.sceneWords}
            day={frame?.day}
            view={voice.between}
            onAdvance={actions.advance}
          />
        ) : (
          <div className="v-overlay v-overlay-night">
            <div className="v-card">
              <p>The day closes…</p>
            </div>
          </div>
        ))}
      {overlay === 'report' &&
        (voice.report ? (
          <Report
            view={voice.report}
            tally={true}
            sceneWords={frame?.sceneWords}
            onKeepListening={actions.keepListening}
            onReplay={() => actions.replay()}
            onNewTown={() => actions.replay(1 + Math.floor(Math.random() * 1_000_000))}
            onDownload={actions.exportPlaytest}
            onSendWord={() => setFeedbackOpen(true)}
          />
        ) : (
          <div className="v-overlay v-overlay-eid">
            <div className="v-card">
              <p>Running the week after…</p>
            </div>
          </div>
        ))}

      {infoOpen && (
        <InfoPanel phase={overlay === 'premise' ? 'premise' : phase} onClose={() => setInfoOpen(false)} />
      )}
      {menuOpen && (
        <MenuPanel
          freeText={freeText}
          onFreeText={setFreeText}
          canReturn={phase === 'premise' || phase === 'report'}
          label={frame ? `${frame.dayLabel} · ${frame.clock}` : 'Halil'}
          pace={voice.paceSetting}
          actions={actions}
          onClose={() => setMenuOpen(false)}
          onTitle={() => {
            setMenuOpen(false);
            setTitleOpen(false);
            actions.replay();
            actions.begin();
          }}
          onSendWord={() => {
            setMenuOpen(false);
            setFeedbackOpen(true);
          }}
        />
      )}
      {otherWays && (
        <OtherWays
          actions={actions}
          onClose={() => setOtherWays(false)}
          onNewTown={() => {
            setOtherWays(false);
            setTitleOpen(false);
            actions.replay(1 + Math.floor(Math.random() * 1_000_000));
          }}
        />
      )}
      {feedbackOpen && (
        <div className="v-feedback-screen">
          <SendWord
            actions={actions}
            onReturn={() => setFeedbackOpen(false)}
            onBack={() => {
              setFeedbackOpen(false);
              setMenuOpen(true);
            }}
          />
        </div>
      )}
      {voice.error && !feedbackOpen && (
        <div className="v-error" role="alert">
          {settingWords(playerError(voice.error, 'play'))}{' '}
          <button type="button" className="v-btn v-btn-small" onClick={() => actions.replay()}>
            Start again
          </button>
          <button type="button" className="v-btn v-btn-small" onClick={() => setFeedbackOpen(true)}>
            Feedback
          </button>
        </div>
      )}
      <PlaytestNotice status={voice.playtest} onClose={actions.clearPlaytest} />
      {voice.mock && (
        <div className="v-mockflag" title="The page is running on sample data, not the simulation.">
          sample data
        </div>
      )}
    </div>
  );
}
