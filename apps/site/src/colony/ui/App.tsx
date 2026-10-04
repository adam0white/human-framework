import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlaytestMenu, PlaytestNotice } from '../../shared/PlaytestMenu.tsx';
import type { MomentRecord } from '../sim/game.ts';
import type { Bubble } from '../sim/human-side.ts';
import type { PlaceId } from '../sim/map.ts';
import { inferAction, type OrderInput } from '../sim/orders.ts';
import type { VillagerId } from '../sim/world-types.ts';
import { BubbleManager } from './bubbles.ts';
import type { Nudge } from './contract.ts';
import { EndScreen } from './EndScreen.tsx';
import { GoalCard } from './GoalCard.tsx';
import { Inspector } from './Inspector.tsx';
import { Pane } from './Pane.tsx';
import { PaneBody, PeopleRows } from './PeopleRows.tsx';
import {
  Composer,
  type ComposerState,
  EMPTY_COMPOSER,
  GoalStrip,
  MomentBanner,
  OrderLog,
  PaneStats,
  PauseRibbon,
  PLACE_LABEL,
  SuggestionCard,
  shortName,
  TopBar,
} from './parts.tsx';
import { useColony } from './useColony.ts';

const ONBOARDED_KEY = 'colony.onboarded';
/** Real ms a moment's caption stays up. */
const MOMENT_MS = 4500;
const TOAST_MS = 6000;

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
    // Storage may be blocked; the toast then shows again next time.
  }
}

function orderFrom(c: ComposerState): OrderInput | null {
  if (!c.personId || !c.placeId) return null;
  return {
    personId: c.personId,
    placeId: c.placeId,
    ...(c.rush ? { rush: true } : {}),
    ...(c.insist ? { insist: true } : {}),
    ...(c.appeal ? { appeal: c.appeal } : {}),
  };
}

/** Focus is in a form control (text, checkbox, radio, select): Space and Enter belong to it. */
function isEditable(t: EventTarget | null): boolean {
  return t instanceof HTMLElement && t.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

export function App() {
  const colony = useColony();
  const { frame, actions, playback } = colony;
  const bubbles = useMemo(() => new BubbleManager(), []);
  const [composer, setComposer] = useState<ComposerState>(EMPTY_COMPOSER);
  const [hoverPlace, setHoverPlace] = useState<PlaceId | null>(null);
  const [inspect, setInspect] = useState<{ personId: VillagerId; decisionId?: string } | null>(null);
  const [endOpen, setEndOpen] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const [moment, setMoment] = useState<MomentRecord | null>(null);
  const [drawer, setDrawer] = useState(false);
  const flashTimer = useRef(0);
  const momentTimer = useRef(0);
  const momentsSeen = useRef(0);
  const resultsButton = useRef<HTMLButtonElement>(null);
  const hasSummary = Boolean(colony.summaries[2] || colony.summaries[3]);
  const starting = playback.pause?.kind === 'start';

  // The one-time "Tap any bubble" toast, after the first Play.
  // Depends on whether a frame exists, not on each frame: a per-frame re-run would clear the timer before it fired.
  const toastShown = useRef(readOnboarded());
  const hasFrame = frame !== null;
  useEffect(() => {
    if (starting || toastShown.current || !hasFrame) return undefined;
    toastShown.current = true;
    writeOnboarded();
    setToast(true);
    const t = window.setTimeout(() => setToast(false), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [starting, hasFrame]);

  // Caption each new moment over the Human pane.
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

  // A loaded playtest file is a new run: clear what the page held for the old one.
  const loaded = colony.playtest && 'result' in colony.playtest ? colony.playtest.result : null;
  useEffect(() => {
    if (!loaded) return;
    bubbles.reset();
    setInspect(null);
    setHoverPlace(null);
    setComposer(EMPTY_COMPOSER);
    setDrawer(false);
    setEndOpen(true);
  }, [loaded, bubbles]);

  // Telegraph: the Human prediction for the committed place (or the hovered one while choosing).
  const previewPlace = composer.placeId ?? hoverPlace;
  const previewInput = useMemo(
    () => orderFrom({ ...composer, placeId: previewPlace }),
    [composer, previewPlace],
  );
  useEffect(() => {
    actions.predict(previewInput);
  }, [previewInput, actions]);

  // The job the order would infer, read from the Human side's world (as the sim does).
  const job = useMemo(() => {
    if (!frame || !composer.placeId) return null;
    return inferAction(composer.placeId, {
      minute: frame.minute,
      house: { stage: frame.humanWorld.houseStage, shuttered: frame.humanWorld.shuttered },
      cedarFelled: frame.humanWorld.cedarFelled,
      storeroom: frame.humanWorld.project.kind === 'storeroom' ? frame.humanWorld.project.stage : null,
    });
  }, [frame, composer.placeId]);

  // Inspector: opening pauses; closing resumes only if the inspector's pause is still the current one.
  const inspectPerson = inspect?.personId ?? null;
  const inspectDecision = inspect?.decisionId;
  const inspectOpen = inspect !== null;
  useEffect(() => {
    if (!inspectOpen) return undefined;
    actions.pauseForInspector();
    return () => actions.resumeFromInspector();
  }, [inspectOpen, actions]);
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

  const showFlash = useCallback((text: string) => {
    setFlash(text);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 2200);
  }, []);

  const pickWho = useCallback((id: VillagerId) => {
    // Tapping a villager (again) restarts the composer with that villager.
    setComposer({ ...EMPTY_COMPOSER, personId: id });
  }, []);

  const pickWhere = useCallback((placeId: PlaceId) => {
    setComposer((c) => (c.personId ? { ...c, placeId } : c));
  }, []);

  const live = useRef({ composer });
  live.current = { composer };
  const confirm = useCallback(() => {
    const c = live.current.composer;
    const input = orderFrom(c);
    if (!input) return;
    actions.order(input, c.nudgeId);
    showFlash(`Order given: ${shortName(input.personId)} → ${PLACE_LABEL[input.placeId]}`);
    setComposer(EMPTY_COMPOSER);
    setHoverPlace(null);
  }, [actions, showFlash]);

  const applyNudge = (n: Nudge) => {
    setComposer({
      ...EMPTY_COMPOSER,
      personId: n.order.personId,
      placeId: n.order.placeId,
      rush: Boolean(n.prefill?.rush ?? n.order.rush),
      insist: Boolean(n.prefill?.insist ?? n.order.insist),
      appeal: n.order.appeal ?? null,
      nudgeId: n.id,
      ...(n.reason ? { reason: n.reason } : {}),
    });
    // Only Confirm is left: move focus there so Enter confirms (focus would otherwise stay on Use).
    window.setTimeout(() => document.querySelector<HTMLButtonElement>('.composer .btn-confirm')?.focus(), 0);
  };

  const skipNudge = (id: string) => {
    actions.dismissNudge(id);
    setComposer((c) => (c.nudgeId === id ? EMPTY_COMPOSER : c));
  };

  // A suggestion that lapsed or was dismissed elsewhere no longer drives the composer's reason.
  const visibleNudgeIds = (frame?.nudges ?? []).map((n) => n.id).join(',');
  useEffect(() => {
    setComposer((c) =>
      c.nudgeId && !visibleNudgeIds.split(',').includes(c.nudgeId)
        ? (({ nudgeId: _n, reason: _r, ...rest }) => rest)(c)
        : c,
    );
  }, [visibleNudgeIds]);

  const openBubble = useCallback((b: Bubble) => {
    setInspect(b.decisionId ? { personId: b.personId, decisionId: b.decisionId } : { personId: b.personId });
  }, []);
  const inspectPersonCb = useCallback((id: VillagerId) => setInspect({ personId: id }), []);
  const closeInspect = useCallback(() => setInspect(null), []);

  const closeEnd = useCallback(() => {
    setEndOpen(false);
    window.setTimeout(() => resultsButton.current?.focus(), 0);
  }, []);

  // Keys (item 9): Space always toggles pause, in the capture phase, and its keyup is swallowed so a focused
  // button is not clicked. Enter confirms a ready order. Esc closes the end screen or clears the composer
  // (the inspector's <dialog> handles its own Esc).
  const keys = useRef({ paused: playback.paused, inspect: inspectOpen, end: false });
  keys.current = { paused: playback.paused, inspect: inspectOpen, end: hasSummary && endOpen };
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat) actions.setPaused(!keys.current.paused);
        return;
      }
      if (keys.current.inspect) return;
      if (e.key === 'Escape') {
        if (keys.current.end) closeEnd();
        else setComposer(EMPTY_COMPOSER);
        return;
      }
      // Enter confirms only from the page or the composer: on another button (Skip, ×, Results) it is that button's.
      const t = e.target;
      const inComposer = t === document.body || (t instanceof Element && t.closest('.composer') !== null);
      if (e.key === 'Enter' && inComposer && !keys.current.end && orderFrom(live.current.composer)) {
        e.preventDefault();
        e.stopPropagation();
        confirm();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', onDown, true);
    window.addEventListener('keyup', onUp, true);
    return () => {
      window.removeEventListener('keydown', onDown, true);
      window.removeEventListener('keyup', onUp, true);
    };
  }, [actions, confirm, closeEnd]);

  const restart = () => {
    bubbles.reset();
    momentsSeen.current = 0;
    setMoment(null);
    setInspect(null);
    setHoverPlace(null);
    setComposer(EMPTY_COMPOSER);
    setDrawer(false);
    setEndOpen(true);
    actions.restart();
  };

  const continueDay = () => {
    actions.continueDay();
    setEndOpen(true);
  };

  const nudges = frame?.nudges ?? [];
  const nudge = nudges[0];
  const cards = frame?.cards ?? [];
  const orderCount = cards.filter((c) => c.status !== 'cancelled').length;
  const highlightPlace = hoverPlace ?? composer.placeId;
  // The end screen is open for the latest report until closed; "Another day" closes it by clearing `ended`.
  const showEnd = hasSummary && endOpen && Boolean(frame?.ended);

  const paneProps = {
    store: colony.store,
    selectedId: composer.personId,
    hoverPlace: highlightPlace,
    onSelect: pickWho,
    onPlace: pickWhere,
    onHoverPlace: setHoverPlace,
    onInspect: inspectPersonCb,
  };

  return (
    <div className={`colony ${composer.personId ? 'is-choosing' : ''}`}>
      <TopBar
        frame={frame}
        playback={playback}
        onPause={actions.setPaused}
        onSpeed={actions.setSpeed}
        onAutoPause={actions.setAutoPause}
        {...(hasSummary && !showEnd && frame?.ended
          ? { onResults: () => setEndOpen(true), resultsRef: resultsButton }
          : {})}
        playtest={
          <PlaytestMenu
            className="topbar-playtest"
            onExport={actions.exportPlaytest}
            onLoad={actions.loadPlaytest}
            onError={actions.playtestError}
          />
        }
      />
      <GoalStrip goals={frame?.goals ?? []} />

      <main className="stage">
        <section className="pane pane-classic" aria-label="Classic village">
          <header className="pane-head">
            <h2>
              Classic <span>they obey</span>
            </h2>
            <PaneStats frame={frame} side="classic" />
          </header>
          <PaneBody
            rows={
              <PeopleRows frame={frame} side="classic" selectedId={composer.personId} onSelect={pickWho} />
            }
          >
            <Pane side="classic" {...paneProps} />
          </PaneBody>
        </section>

        <aside className="center">
          {playback.pause && <PauseRibbon pause={playback.pause} onResume={() => actions.setPaused(false)} />}
          <div className="composer-tray">
            <Composer
              state={composer}
              frame={frame}
              job={job}
              prediction={colony.prediction?.prediction ?? null}
              onChange={setComposer}
              onWho={pickWho}
              onWhere={pickWhere}
              onHover={setHoverPlace}
              onConfirm={confirm}
              onInspect={inspectPersonCb}
            />
            {nudge && frame && (
              <div
                className={`nudge-slot ${composer.nudgeId === nudge.id ? 'is-active' : ''}`}
                role="status"
                aria-live="polite"
              >
                <SuggestionCard
                  nudge={nudge}
                  minute={frame.minute}
                  queued={nudges.length - 1}
                  active={composer.nudgeId === nudge.id}
                  onUse={applyNudge}
                  onSkip={skipNudge}
                />
              </div>
            )}
          </div>
          <section className={`queue ${drawer ? 'is-open' : ''}`} aria-label="Order log">
            <div className="queue-head">
              <h2 className="col-head">Orders</h2>
              <button
                type="button"
                className="icon-x queue-close"
                aria-label="Close orders"
                onClick={() => setDrawer(false)}
              >
                ×
              </button>
            </div>
            <div className="queue-scroll">
              <OrderLog cards={cards} onCancel={actions.cancel} />
            </div>
          </section>
          <button type="button" className="orders-button" onClick={() => setDrawer(true)}>
            Orders ({orderCount})
          </button>
        </aside>

        <section className="pane pane-human" aria-label="Human village">
          <header className="pane-head">
            <h2>
              Human <span>they decide</span>
            </h2>
            <PaneStats frame={frame} side="human" />
          </header>
          <PaneBody
            rows={<PeopleRows frame={frame} side="human" selectedId={composer.personId} onSelect={pickWho} />}
          >
            <Pane side="human" {...paneProps} bubbles={bubbles} onBubble={openBubble} />
            {moment && <MomentBanner moment={moment} slowMo={playback.slowMo} />}
          </PaneBody>
        </section>
      </main>

      <div className="flash-region" role="status" aria-live="polite">
        {flash && <div className="flash">{flash}</div>}
        {toast && !flash && <div className="flash">Tap any bubble to see why.</div>}
      </div>
      {colony.error && (
        <div className="flash flash-error" role="alert">
          {colony.error}
        </div>
      )}

      {starting && (
        <GoalCard
          frame={frame}
          text={playback.pause?.text ?? ''}
          autoPause={playback.autoPause}
          onAutoPause={actions.setAutoPause}
          onPlay={() => actions.setPaused(false)}
        />
      )}
      {inspect && (
        <Inspector
          personId={inspect.personId}
          {...(inspect.decisionId ? { decisionId: inspect.decisionId } : {})}
          why={colony.why}
          frame={frame}
          onClose={closeInspect}
        />
      )}
      {showEnd && (
        <EndScreen
          summaries={colony.summaries}
          humanKind={frame?.humanKind ?? 'placeholder'}
          canContinue={frame?.canContinue ?? false}
          onContinue={continueDay}
          onAgain={restart}
          onClose={closeEnd}
          onDownload={actions.exportPlaytest}
        />
      )}
      <PlaytestNotice status={colony.playtest} onClose={actions.clearPlaytest} />
    </div>
  );
}
