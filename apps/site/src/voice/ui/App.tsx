/**
 * Game 2, *The Day You Say Nothing* (build plan docs/games/voice-build.md §6). One viewport, panels that scroll
 * inside themselves. Desktop: ends and voices | the day with the composer docked | Halil. Phones: tabs plus a
 * bottom-sheet composer. Space toggles pause from every focus state.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWakeLock } from '../../shared/fullscreen.tsx';
import { PlaytestNotice } from '../../shared/PlaytestMenu.tsx';
import type { Draft } from '../protocol.ts';
import { Between } from './Between.tsx';
import { Composer } from './Composer.tsx';
import { DayLog } from './DayLog.tsx';
import { EndsPane } from './EndsPane.tsx';
import { HalilPane } from './HalilPane.tsx';
import { Intro } from './Intro.tsx';
import { Premise } from './Premise.tsx';
import { Report } from './Report.tsx';
import { StandingCard } from './StandingCard.tsx';
import { TopBar } from './TopBar.tsx';
import { useVoice } from './useVoice.ts';
import { VoicesPane } from './VoicesPane.tsx';
import { Why } from './Why.tsx';

type Tab = 'day' | 'halil' | 'ends';
const TABS: { id: Tab; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'halil', label: 'Halil' },
  { id: 'ends', label: 'Ends & voices' },
];

export function App() {
  const voice = useVoice();
  const { frame, actions } = voice;
  const [tab, setTab] = useState<Tab>('day');
  const [whyId, setWhyId] = useState<string | null>(null);

  const phase = frame?.phase ?? 'premise';
  const live = phase === 'day' || phase === 'eid' || phase === 'free';
  const overlay: 'premise' | 'intro' | 'between' | 'report' | null =
    !frame || phase === 'premise'
      ? 'premise'
      : phase === 'between'
        ? 'between'
        : phase === 'report'
          ? 'report'
          : frame.intro
            ? 'intro'
            : null;

  // Keep the screen awake only while the day's clock runs (not paused, not on a card or the report).
  useWakeLock(live && overlay === null && frame !== null && !frame.paused);

  // Space: continue on the premise, intro and between-days cards; toggle pause in play, whatever has focus (a
  // focused control is never activated by it). Typing fields keep their Space. On the report, Space keeps its
  // native meaning (scroll, or press the focused button).
  const keyState = useRef({ overlay, live, paused: frame?.paused ?? true, ready: frame !== null });
  keyState.current = { overlay, live, paused: frame?.paused ?? true, ready: frame !== null };
  useEffect(() => {
    const isSpace = (e: KeyboardEvent) => e.code === 'Space' || e.key === ' ';
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      t instanceof HTMLSelectElement ||
      (t instanceof HTMLElement && t.isContentEditable);
    const ours = (e: KeyboardEvent) =>
      isSpace(e) &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      !typing(e.target) &&
      keyState.current.overlay !== 'report';
    const onDown = (e: KeyboardEvent) => {
      if (!ours(e)) return;
      const s = keyState.current;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      if (s.overlay === 'premise') {
        if (s.ready) actions.begin();
      } else if (s.overlay === 'intro') actions.dismissIntro();
      else if (s.overlay === 'between')
        document.querySelector<HTMLButtonElement>('.v-overlay .v-btn-primary:not(:disabled)')?.click();
      else if (!s.overlay && s.live) actions.setPaused(!s.paused);
    };
    // Buttons activate on Space keyup; swallow that too.
    const onUp = (e: KeyboardEvent) => {
      if (ours(e)) e.preventDefault();
    };
    window.addEventListener('keydown', onDown, { capture: true });
    window.addEventListener('keyup', onUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', onDown, { capture: true });
      window.removeEventListener('keyup', onUp, { capture: true });
    };
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
  const suggest = useCallback((d: Draft) => actions.suggest(d), [actions]);
  const sayNothing = useCallback(() => actions.setPaused(false), [actions]);

  // A new run closes any open why sheet.
  useEffect(() => {
    if (overlay) closeWhy();
  }, [overlay, closeWhy]);

  return (
    <div className={`voice phase-${phase}`} data-tab={tab}>
      {frame && <TopBar frame={frame} actions={actions} onPlaytestError={actions.playtestError} />}
      {frame && (
        <div className="v-main">
          <div className="v-col v-col-left">
            <EndsPane ends={frame.ends} {...(frame.unasked ? { unasked: frame.unasked } : {})} />
            <VoicesPane voices={frame.voices} />
          </div>
          <div className="v-col v-col-centre">
            <DayLog
              log={frame.log}
              pauseBeat={frame.pauseBeat}
              paused={frame.paused}
              onWhy={openWhy}
              selected={whyId}
            />
          </div>
          <div className="v-col v-col-right">
            <HalilPane halil={frame.halil} />
          </div>
          <div className="v-dock">
            {frame.standing && !frame.muted && (
              <StandingCard standing={frame.standing} onWithdraw={actions.withdraw} />
            )}
            {!overlay && (
              <Composer
                frame={frame}
                telegraph={voice.telegraph}
                whyOpen={voice.whyOpen}
                onPredict={actions.predict}
                onSuggest={suggest}
                onSayNothing={sayNothing}
              />
            )}
          </div>
        </div>
      )}
      <nav className="v-tabs" aria-label="Panels">
        {TABS.map((t) => (
          <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {voice.whyOpen && !overlay && <Why why={voice.why} missing={voice.whyMissing} onClose={closeWhy} />}

      {overlay === 'premise' && <Premise ready={frame !== null} onBegin={actions.begin} />}
      {overlay === 'intro' && frame?.intro && (
        <Intro intro={frame.intro} eid={phase === 'eid'} onContinue={actions.dismissIntro} />
      )}
      {overlay === 'between' &&
        (voice.between ? (
          <Between view={voice.between} onAdvance={actions.advance} />
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
            onKeepListening={actions.keepListening}
            onReplay={() => actions.replay()}
            onNewTown={() => actions.replay(1 + Math.floor(Math.random() * 1_000_000))}
            onDownload={actions.exportPlaytest}
          />
        ) : (
          <div className="v-overlay v-overlay-eid">
            <div className="v-card">
              <p>Running the week after…</p>
            </div>
          </div>
        ))}

      {voice.error && (
        <div className="v-error" role="alert">
          {voice.error}{' '}
          <button type="button" className="v-btn v-btn-small" onClick={() => actions.replay()}>
            Start again
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
