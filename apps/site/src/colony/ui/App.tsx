import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MomentRecord, Nudge } from '../sim/game.ts';
import type { Bubble } from '../sim/human-side.ts';
import type { PlaceId } from '../sim/map.ts';
import type { OrderInput } from '../sim/orders.ts';
import type { VillagerId } from '../sim/world-types.ts';
import { BubbleManager } from './bubbles.ts';
import { EndScreen } from './EndScreen.tsx';
import { Inspector } from './Inspector.tsx';
import { Hand, IntroCard, type OnboardingStep } from './Onboarding.tsx';
import { Pane } from './Pane.tsx';
import {
  Composer,
  type ComposerState,
  MomentBanner,
  NudgeCards,
  Queue,
  Roster,
  Scoreboard,
  SpeedControls,
  shortName,
  TopBar,
} from './parts.tsx';
import { useColony } from './useColony.ts';

const ONBOARDED_KEY = 'colony.onboarded';
const EMPTY_COMPOSER: ComposerState = { rush: false, insist: false, appeal: null };
/** Real ms a moment's caption stays up (the worker runs slow-mo for 3 s of it). */
const MOMENT_MS = 4500;

function readOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    // Storage may be blocked; onboarding simply shows again next time.
  }
}

/** The order the composer would issue for a place (the same for the telegraph and the real order). */
function orderFrom(personId: VillagerId, placeId: PlaceId, c: ComposerState): OrderInput {
  return {
    personId,
    placeId,
    ...(c.rush ? { rush: true } : {}),
    ...(c.insist ? { insist: true } : {}),
    ...(c.appeal ? { appeal: c.appeal } : {}),
  };
}

export function App() {
  const colony = useColony();
  const { frame, actions } = colony;
  const bubbles = useMemo(() => new BubbleManager(), []);
  const [selectedId, setSelectedId] = useState<VillagerId | null>(null);
  const [hoverPlace, setHoverPlace] = useState<PlaceId | null>(null);
  const [composer, setComposer] = useState<ComposerState>(EMPTY_COMPOSER);
  const [insistHint, setInsistHint] = useState(false);
  const [inspect, setInspect] = useState<{ personId: VillagerId; decisionId?: string } | null>(null);
  const [step, setStep] = useState<OnboardingStep>(() => (readOnboarded() ? 'done' : 'intro'));
  const [endOpen, setEndOpen] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [moment, setMoment] = useState<MomentRecord | null>(null);
  const flashTimer = useRef(0);
  const momentTimer = useRef(0);
  const momentsSeen = useRef(0);
  const resultsButton = useRef<HTMLButtonElement>(null);
  const tutorial = step === 'intro' || step === 'hand';

  // Onboarding clock (spec §8): 0 s intro, 3 s hand, toast after the first order (not before 10 s).
  useEffect(() => {
    if (step === 'intro') {
      const t = window.setTimeout(() => setStep('hand'), 3000);
      return () => window.clearTimeout(t);
    }
    if (step === 'hand') {
      const t = window.setTimeout(() => setStep('toast'), 20000);
      return () => window.clearTimeout(t);
    }
    if (step === 'toast') {
      writeOnboarded();
      const t = window.setTimeout(() => setStep('done'), 6000);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [step]);

  // The village waits while the intro and the hand are up, so the first card's window does not run out under them.
  useEffect(() => {
    actions.setPaused(tutorial);
  }, [tutorial, actions]);

  // Caption each new moment over the Human pane while the worker slows the clock.
  const moments = frame?.moments;
  useEffect(() => {
    if (!moments) return;
    if (moments.length < momentsSeen.current) momentsSeen.current = 0;
    if (moments.length === momentsSeen.current) return;
    momentsSeen.current = moments.length;
    setMoment(moments[moments.length - 1] ?? null);
    window.clearTimeout(momentTimer.current);
    momentTimer.current = window.setTimeout(() => setMoment(null), MOMENT_MS);
  }, [moments]);

  // Telegraph before commit: predicted response for the hovered place, with every chip the order would carry.
  useEffect(() => {
    actions.predict(selectedId && hoverPlace ? orderFrom(selectedId, hoverPlace, composer) : null);
  }, [selectedId, hoverPlace, composer, actions]);

  // Keep an open "why" sheet current when it follows the person rather than one bubble.
  const inspectPerson = inspect?.personId ?? null;
  const inspectDecision = inspect?.decisionId;
  useEffect(() => {
    if (!inspectPerson) {
      actions.clearWhy();
      return undefined;
    }
    actions.requestWhy(inspectPerson, inspectDecision);
    if (inspectDecision) return undefined;
    const t = window.setInterval(() => actions.requestWhy(inspectPerson), 1000);
    return () => window.clearInterval(t);
  }, [inspectPerson, inspectDecision, actions]);

  // Keyboard: Space pauses (unless a control has focus), Escape closes the sheet or deselects.
  const keys = useRef({ paused: colony.paused, inspect: inspect !== null });
  keys.current = { paused: colony.paused, inspect: inspect !== null };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest('input, textarea, select, button, a, [role="button"], [contenteditable="true"]')
      )
        return;
      if (e.key === ' ') {
        e.preventDefault();
        actions.setPaused(!keys.current.paused);
      } else if (e.key === 'Escape') {
        if (keys.current.inspect) setInspect(null);
        else setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions]);

  const showFlash = useCallback((text: string) => {
    setFlash(text);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 2200);
  }, []);

  const select = useCallback((id: VillagerId) => {
    setSelectedId((cur) => (cur === id ? null : id));
    setComposer(EMPTY_COMPOSER);
  }, []);

  // `issue` reads the live selection through a ref so the panes keep one callback identity.
  const live = useRef({ selectedId, composer, step });
  live.current = { selectedId, composer, step };
  const issue = useCallback(
    (placeId: PlaceId) => {
      const { selectedId: who, composer: c, step: s } = live.current;
      if (!who) return;
      actions.order(orderFrom(who, placeId, c));
      showFlash(`Order given: ${shortName(who)} → ${placeId.startsWith('home') ? 'home' : placeId}`);
      if ((s === 'hand' || s === 'intro') && who === 'yusuf' && placeId === 'site') setStep('toast');
      setSelectedId(null);
      setHoverPlace(null);
      setComposer(EMPTY_COMPOSER);
      setInsistHint(false);
    },
    [actions, showFlash],
  );

  const give = (n: Nudge, insist: boolean) => {
    actions.order({ ...n.order, ...(insist ? { insist: true } : {}) });
    showFlash(`Order given: ${shortName(n.order.personId)}${insist ? ' (insisted)' : ''}`);
    if (tutorial && n.order.personId === 'yusuf' && n.order.placeId === 'site') setStep('toast');
  };

  const openBubble = useCallback((b: Bubble) => {
    setInspect(b.decisionId ? { personId: b.personId, decisionId: b.decisionId } : { personId: b.personId });
  }, []);

  const restart = () => {
    bubbles.reset();
    momentsSeen.current = 0;
    setMoment(null);
    setSelectedId(null);
    setInspect(null);
    setHoverPlace(null);
    setComposer(EMPTY_COMPOSER);
    setEndOpen(true);
    actions.restart();
  };

  const closeEnd = () => {
    setEndOpen(false);
    // Return focus to the control that brings the results back.
    window.setTimeout(() => resultsButton.current?.focus(), 0);
  };

  // The coach's first step is this order; its card waits until the coach is done.
  const nudges = (frame?.nudges ?? []).filter((n) => !(tutorial && n.id === 'dawn-site'));
  const insistNudge = nudges.find((n) => n.insistHint);

  return (
    <div className={`colony ${selectedId ? 'is-choosing' : ''} ${step === 'intro' ? 'is-intro' : ''}`}>
      <TopBar
        frame={frame}
        paused={colony.paused}
        speed={colony.speed}
        onPause={actions.setPaused}
        onSpeed={actions.setSpeed}
        {...(colony.summary && !endOpen
          ? { onResults: () => setEndOpen(true), resultsRef: resultsButton }
          : {})}
      />
      <Scoreboard sb={frame?.scoreboard ?? null} />

      <main className="stage">
        <section className="pane pane-classic" aria-label="Classic village">
          <header className="pane-head">
            <h2>
              Classic <span>they obey</span>
            </h2>
            <span className="pane-note">generic colony AI</span>
          </header>
          <Pane
            side="classic"
            store={colony.store}
            selectedId={selectedId}
            hoverPlace={hoverPlace}
            onSelect={select}
            onPlace={issue}
            onHoverPlace={setHoverPlace}
          />
        </section>

        <aside className="center">
          <Roster selectedId={selectedId} onSelect={select} frame={frame} />
          <NudgeCards
            nudges={nudges}
            onGive={give}
            onDismiss={(id) => {
              actions.dismissNudge(id);
              if (insistNudge?.id === id) setInsistHint(false);
            }}
          />
          {selectedId && (
            <Composer
              personId={selectedId}
              state={composer}
              frame={frame}
              prediction={colony.prediction?.prediction ?? null}
              hoverPlace={hoverPlace}
              insistHint={insistHint || insistNudge?.order.personId === selectedId}
              onChange={setComposer}
              onPlace={issue}
              onHover={setHoverPlace}
              onWhy={() => setInspect({ personId: selectedId })}
              onClose={() => setSelectedId(null)}
            />
          )}
          <Queue cards={frame?.cards ?? []} onCancel={actions.cancel} />
        </aside>

        <section className="pane pane-human" aria-label="Human village">
          <header className="pane-head">
            <h2>
              Human <span>they decide</span>
            </h2>
            <span className="pane-note">
              {frame?.humanKind === 'placeholder' ? 'placeholder: mirrors Classic' : 'Human Framework v1'}
            </span>
          </header>
          <div className="pane-stack">
            <Pane
              side="human"
              store={colony.store}
              selectedId={selectedId}
              hoverPlace={hoverPlace}
              onSelect={select}
              onPlace={issue}
              onHoverPlace={setHoverPlace}
              bubbles={bubbles}
              onBubble={openBubble}
            />
            {step === 'hand' && <Hand frame={frame} />}
            {moment && <MomentBanner moment={moment} slowMo={colony.slowMo} />}
          </div>
        </section>
      </main>

      <ul className="hints" aria-label="How to play">
        <li>
          <b>Tap a villager</b>, then a place. Both villages get the order at the same minute.
        </li>
        <li>
          <b>Tap a bubble</b> to see why they answered that way.
        </li>
        <li>
          <b>Rush</b> and <b>Insist</b> push harder, at a price. Orders lapse after two hours unless the job
          is under way.
        </li>
        <li>
          <kbd>Space</kbd> pauses.
        </li>
      </ul>

      <footer className="bottombar">
        <SpeedControls
          paused={colony.paused}
          speed={colony.speed}
          onPause={actions.setPaused}
          onSpeed={actions.setSpeed}
        />
      </footer>

      <IntroCard
        step={step}
        onSkip={() => {
          writeOnboarded();
          setStep('done');
        }}
      />
      <div className="flash-region" role="status" aria-live="polite">
        {flash && <div className="flash">{flash}</div>}
      </div>
      {colony.error && (
        <div className="flash flash-error" role="alert">
          {colony.error}
        </div>
      )}

      {inspect && (
        <Inspector
          personId={inspect.personId}
          {...(inspect.decisionId ? { decisionId: inspect.decisionId } : {})}
          why={colony.why}
          frame={frame}
          onClose={() => setInspect(null)}
        />
      )}
      {colony.summary && endOpen && (
        <EndScreen
          summary={colony.summary}
          humanKind={frame?.humanKind ?? 'placeholder'}
          onAgain={restart}
          onClose={closeEnd}
        />
      )}
    </div>
  );
}
