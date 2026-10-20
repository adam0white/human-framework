import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FullscreenButton, useWakeLock } from '../../shared/fullscreen.tsx';
import { gameLabs, LabMenuContent, useLabScreen } from '../../shared/lab.tsx';
import { PlaytestMenu, PlaytestNotice } from '../../shared/PlaytestMenu.tsx';
import type { HurtNews, MomentRecord } from '../sim/game.ts';
import type { PlaceId } from '../sim/map.ts';
import { inferAction, type OrderCard, type OrderInput } from '../sim/orders.ts';
import { type VillagerId, villagerById } from '../sim/world-types.ts';
import { BubbleManager } from './bubbles.ts';
import type { Nudge } from './contract.ts';
import { EndScreen } from './EndScreen.tsx';
import { GoalCard } from './GoalCard.tsx';
import { Inspector } from './Inspector.tsx';
import { latestPersonOrder, personOrderStatus, repeatPersonOrder } from './order-status.ts';
import { Pane } from './Pane.tsx';
import { PaneBody, PeopleRows } from './PeopleRows.tsx';
import { PhoneSheet, VillageStrip } from './PhoneStage.tsx';
import {
  AutoPauseToggle,
  Composer,
  type ComposerState,
  EMPTY_COMPOSER,
  GoalStrip,
  HurtLine,
  inferredJob,
  keepOneDisclosure,
  MomentBanner,
  OrderLog,
  PaneStats,
  PauseRibbon,
  PersonOrder,
  PLACE_LABEL,
  SuggestionCard,
  sameJobCopy,
  shortName,
  suggestionNeedsReview,
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
  return (
    t instanceof HTMLElement &&
    t.closest('input, textarea, select, summary, button, [contenteditable="true"]') !== null
  );
}

export function App() {
  const colony = useColony();
  const { frame, actions, playback } = colony;
  const bubbles = useMemo(() => new BubbleManager(), []);
  const stageRoot = useRef<HTMLElement>(null);
  const [sceneHeight, setSceneHeight] = useState(0);
  const [composer, setComposer] = useState<ComposerState>(EMPTY_COMPOSER);
  const [hoverPlace, setHoverPlace] = useState<PlaceId | null>(null);
  const [inspect, setInspect] = useState<{ personId: VillagerId; decisionId?: string } | null>(null);
  const [endOpen, setEndOpen] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const [moment, setMoment] = useState<MomentRecord | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [phoneSheetHeight, setPhoneSheetHeight] = useState<'closed' | 'peek' | 'half' | 'full' | 'fit'>(
    'closed',
  );
  const [watching, setWatching] = useState<VillagerId | null>(null);
  const [choosingPlace, setChoosingPlace] = useState(false);
  const [scopeExplained, setScopeExplained] = useState(false);
  const [followKey, setFollowKey] = useState(0);
  const [holdKey, setHoldKey] = useState(0);
  const [placeRequest, setPlaceRequest] = useState(0);
  const [personRequest, setPersonRequest] = useState(0);
  const [personOrderOpen, setPersonOrderOpen] = useState(false);
  // News changes camera focus only. The prepared order and prior worker stay intact.
  const [newsFollow, setNewsFollow] = useState<{
    personId: VillagerId;
    side: 'classic' | 'human';
    returnSide: 'classic' | 'human';
  } | null>(null);
  const [returnedFollow, setReturnedFollow] = useState(false);
  /** Phones show one village at a time. Switching keeps the prepared order. */
  const [mapSide, setMapSide] = useState<'classic' | 'human'>('human');
  const flashTimer = useRef(0);
  const momentTimer = useRef(0);
  const momentsSeen = useRef(0);
  const resultsButton = useRef<HTMLButtonElement>(null);
  const hasSummary = Boolean(colony.summaries[2] || colony.summaries[3]);
  const starting = playback.pause?.kind === 'start';
  useLabScreen(gameLabs.well, starting ? 'title' : frame?.ended ? 'ending' : 'play');

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
    setWatching(null);
    setChoosingPlace(false);
    setScopeExplained(false);
    setNewsFollow(null);
    setReturnedFollow(false);
    setOrdering(false);
    setPlaceRequest(0);
    setPersonRequest(0);
    setPersonOrderOpen(false);
    setDrawer(false);
    setEndOpen(true);
  }, [loaded, bubbles]);

  // Telegraph: the Human prediction for the committed place (or the hovered one while choosing).
  const previewPlace = composer.placeId ?? hoverPlace;
  const previewInput = useMemo(
    () => orderFrom({ ...composer, placeId: previewPlace }),
    [composer, previewPlace],
  );
  // Refresh the forecast as the village changes, even when the selected input stays the same.
  // biome-ignore lint/correctness/useExhaustiveDependencies: A forecast is time-dependent.
  useEffect(() => {
    actions.predict(previewInput);
  }, [previewInput, actions, frame?.minute]);

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

  // Inspection reads the live village; only the player or a pending choice controls playback.
  const inspectPerson = inspect?.personId ?? null;
  const inspectDecision = inspect?.decisionId;
  const inspectOpen = inspect !== null;
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
    setOrdering(true);
    setWatching(null);
    setChoosingPlace(true);
    setNewsFollow(null);
    setReturnedFollow(false);
    // Keep the chosen place while trying another worker; suggestion reasons belong to the old worker.
    setComposer((c) => (({ nudgeId: _n, reason: _r, ...rest }) => ({ ...rest, personId: id }))(c));
  }, []);

  const pickWhere = useCallback(
    (placeId: PlaceId) => {
      setNewsFollow(null);
      setReturnedFollow(false);
      if (watching) setOrdering(true);
      setComposer((c) =>
        c.personId ? { ...c, placeId } : watching ? { ...EMPTY_COMPOSER, personId: watching, placeId } : c,
      );
    },
    [watching],
  );

  const live = useRef({ composer, ordering });
  live.current = { composer, ordering };
  const sendOrder = useCallback(
    (input: OrderInput, nudgeId?: string) => {
      actions.order(input, nudgeId);
      showFlash(`Order given to both villages: ${shortName(input.personId)} → ${PLACE_LABEL[input.placeId]}`);
      setScopeExplained(true);
      setChoosingPlace(false);
      setNewsFollow(null);
      setReturnedFollow(false);
      setWatching(input.personId);
      setFollowKey((key) => key + 1);
      setOrdering(false);
      setComposer({ ...EMPTY_COMPOSER, personId: input.personId });
      setHoverPlace(null);
      document.querySelector<HTMLDetailsElement>('.order-options')?.removeAttribute('open');
    },
    [actions, showFlash],
  );
  const confirm = useCallback(() => {
    const c = live.current.composer;
    const input = orderFrom(c);
    if (input) sendOrder(input, c.nudgeId);
  }, [sendOrder]);
  const selectScenePerson = useCallback(
    (id: VillagerId) => {
      pickWho(id);
      setOrdering(false);
      setComposer({ ...EMPTY_COMPOSER, personId: id });
      setFollowKey((key) => key + 1);
      setPersonRequest((key) => key + 1);
      setPersonOrderOpen(true);
      if (latestPersonOrder(frame?.cards ?? [], id)) {
        setChoosingPlace(false);
        setWatching(id);
      }
    },
    [pickWho, frame?.cards],
  );
  const scenePerson = newsFollow?.personId ?? composer.personId ?? watching;
  const sendScenePlace = useCallback(
    (placeId: PlaceId) => {
      if (!scenePerson) return;
      if (placeId === 'cedar' && frame && inferredJob(frame, placeId) === 'fell-cedar') {
        setComposer({
          ...EMPTY_COMPOSER,
          personId: scenePerson,
          placeId,
          reason: 'The cedar can injure whoever fells it.',
        });
        setNewsFollow(null);
        setOrdering(true);
      } else sendOrder({ personId: scenePerson, placeId });
    },
    [scenePerson, sendOrder, frame],
  );
  const sceneInputs = useMemo<OrderInput[]>(
    () =>
      scenePerson
        ? (
            [
              'site',
              'forest',
              'cedar',
              'field',
              'well',
              'kitchen',
              'masjid',
              villagerById(scenePerson)?.home ?? 'home-yusuf',
            ] as PlaceId[]
          ).map((placeId) => ({ personId: scenePerson, placeId }))
        : [],
    [scenePerson],
  );
  // Forecasts use the existing read-only worker prediction path; orders retain their exact inputs.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Refresh when simulation time changes.
  useEffect(() => {
    actions.predictPlaces?.(sceneInputs);
  }, [actions, sceneInputs, frame?.minute]);
  const scenePlaces = sceneInputs.map((input) => {
    const person = frame?.human.find((p) => p.id === input.personId);
    const action = frame ? inferredJob(frame, input.placeId) : null;
    const predicted = colony.scenePredictions?.[input.placeId];
    const matching = predicted?.input.personId === input.personId;
    return {
      placeId: input.placeId,
      label: PLACE_LABEL[input.placeId],
      answer:
        input.placeId === 'cedar' && action === 'fell-cedar'
          ? 'Risk of injury · Review order'
          : action && person?.action === action && person.state === 'working'
            ? sameJobCopy(action, input.personId)
            : matching
              ? predicted.prediction.text
              : 'Checking answer…',
    };
  });

  const applyNudge = (n: Nudge) => {
    const prepared = {
      ...EMPTY_COMPOSER,
      personId: n.order.personId,
      placeId: n.order.placeId,
      rush: Boolean(n.prefill?.rush ?? n.order.rush),
      insist: Boolean(n.prefill?.insist ?? n.order.insist),
      appeal: n.order.appeal ?? null,
    };
    if (!suggestionNeedsReview(n, frame)) {
      const input = orderFrom(prepared);
      if (input) sendOrder(input, n.id);
      document.querySelector<HTMLDetailsElement>('.nudge-slot')?.removeAttribute('open');
      return;
    }
    setOrdering(true);
    setWatching(null);
    setChoosingPlace(true);
    setNewsFollow(null);
    setReturnedFollow(false);
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
    // The phone suggestion sheet closes after preparation so it cannot cover Confirm.
    document.querySelector<HTMLDetailsElement>('.nudge-slot')?.removeAttribute('open');
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

  const inspectPersonCb = useCallback((id: VillagerId) => {
    document.querySelectorAll('.composer details[open], .nudge-slot[open]').forEach((el) => {
      el.removeAttribute('open');
    });
    setInspect({ personId: id });
  }, []);
  const closeInspect = useCallback(() => setInspect(null), []);

  const closeEnd = useCallback(() => {
    setEndOpen(false);
    window.setTimeout(() => resultsButton.current?.focus(), 0);
  }, []);

  // Keys: Space on the page toggles pause; focused controls keep native activation. Enter confirms a ready order. Esc closes the end screen or clears the composer
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
        if (window.matchMedia('(max-width: 899px)').matches && stageRoot.current?.dataset.sheet !== 'closed')
          return;
        if (keys.current.end) closeEnd();
        else setComposer(EMPTY_COMPOSER);
        return;
      }
      // Enter confirms only from the page. Focused controls keep their native activation.
      const t = e.target;
      const fromPage = t === document.body;
      if (
        e.key === 'Enter' &&
        fromPage &&
        live.current.ordering &&
        !keys.current.end &&
        orderFrom(live.current.composer)
      ) {
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
    setWatching(null);
    setChoosingPlace(false);
    setScopeExplained(false);
    setNewsFollow(null);
    setReturnedFollow(false);
    setOrdering(false);
    setPlaceRequest(0);
    setPersonRequest(0);
    setPersonOrderOpen(false);
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
  const selectedOrder = latestPersonOrder(cards, scenePerson);
  const askAgain = (card: OrderCard) => sendOrder(repeatPersonOrder(card));
  const insistOrder = (card: OrderCard) => sendOrder({ ...repeatPersonOrder(card), insist: true });
  const orderCount = cards.filter((c) => c.status !== 'cancelled').length;
  const highlightPlace = !newsFollow && (choosingPlace || ordering) ? (hoverPlace ?? composer.placeId) : null;
  // The end screen is open for the latest report until closed; "Another day" closes it by clearing `ended`.
  const showEnd = hasSummary && endOpen && Boolean(frame?.ended);
  // Keep the screen awake only while the clock runs.
  useWakeLock(frame !== null && !playback.paused && !frame.ended);

  const showNewsPerson = (news: HurtNews) => {
    setNewsFollow((previous) => ({
      personId: news.personId,
      side: news.side,
      returnSide: previous?.returnSide ?? mapSide,
    }));
    setMapSide(news.side);
    setReturnedFollow(false);
    setFollowKey((key) => key + 1);
  };
  const returnFromNews = () => {
    if (!newsFollow) return;
    setMapSide(newsFollow.returnSide);
    setNewsFollow(null);
    setReturnedFollow(true);
    setFollowKey((key) => key + 1);
  };
  const returnWorker = composer.personId ?? watching;
  const watchVillage = () => {
    setChoosingPlace(false);
    setOrdering(false);
    setHoverPlace(null);
    setWatching(composer.personId ?? watching);
    setFollowKey((key) => key + 1);
  };

  const paneProps = {
    store: colony.store,
    selectedId: newsFollow?.personId ?? composer.personId ?? watching,
    hoverPlace: highlightPlace,
    destination: newsFollow || !ordering ? null : composer.placeId,
    following: newsFollow !== null || returnedFollow || (!ordering && watching !== null),
    frameSelection: true,
    sceneHeight,
    followKey,
    holdKey,
    onSelect: selectScenePerson,
    onPlace: sendScenePlace,
    scenePlaces: choosingPlace && !ordering && !newsFollow ? scenePlaces : [],
    onMorePlaces: () => {
      if (!scenePerson) return;
      setComposer({ ...EMPTY_COMPOSER, personId: scenePerson });
      setOrdering(true);
      setPlaceRequest((key) => key + 1);
      window.setTimeout(
        () => document.querySelector<HTMLDetailsElement>('.destination-picker')?.setAttribute('open', ''),
        0,
      );
    },
    onHoverPlace: setHoverPlace,
  };

  return (
    <div
      className={`colony ${choosingPlace ? 'is-choosing' : ''} ${ordering ? 'is-ordering' : 'is-watching'}`}
    >
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
            className="topbar-playtest pt-compact"
            onExport={actions.exportPlaytest}
            onLoad={actions.loadPlaytest}
            onError={actions.playtestError}
            extra={
              <>
                <LabMenuContent lab={gameLabs.well} onSend={actions.sendPlaytest} />
                <AutoPauseToggle on={playback.autoPause} onChange={actions.setAutoPause} />
                <FullscreenButton variant="item" />
              </>
            }
          />
        }
      />
      <GoalStrip goals={frame?.goals ?? []} />

      <main
        ref={stageRoot}
        className={`stage lk-stage show-${mapSide}`}
        data-sheet={phoneSheetHeight}
        data-inspecting={inspectOpen}
      >
        <VillageStrip frame={frame} side={mapSide} />
        <div className="well-scenes lk-scene">
          <div className="well-phone-status" role="status">
            {!scopeExplained && <p className="well-first-order">Each order goes to both villages.</p>}
            {flash && <p>{flash}</p>}
            {scenePerson && (
              <p className="well-selected-person">
                {shortName(scenePerson)} ·{' '}
                {selectedOrder
                  ? personOrderStatus(selectedOrder, mapSide)
                  : ((mapSide === 'human' ? frame?.human : frame?.classic)?.find((p) => p.id === scenePerson)
                      ?.label ?? 'waiting')}
              </p>
            )}
            <HurtLine
              news={frame?.news.slice(-1) ?? []}
              shownSide={mapSide}
              onShow={showNewsPerson}
              onRest={(news) =>
                sendOrder({
                  personId: news.personId,
                  placeId: villagerById(news.personId)?.home ?? 'home-yusuf',
                })
              }
            />
          </div>
          <fieldset className="map-toggle">
            <legend className="visually-hidden">Map shown</legend>
            <button type="button" aria-pressed={mapSide === 'classic'} onClick={() => setMapSide('classic')}>
              Classic · obey
            </button>
            <button type="button" aria-pressed={mapSide === 'human'} onClick={() => setMapSide('human')}>
              Human · decide
            </button>
          </fieldset>
          <section className="pane pane-classic" aria-label="Classic village">
            <header className="pane-head">
              <h2>
                Classic <span>they obey</span>
              </h2>
              <PaneStats frame={frame} side="classic" />
            </header>
            <PaneBody
              rows={
                <PeopleRows
                  frame={frame}
                  side="classic"
                  selectedId={composer.personId}
                  onSelect={selectScenePerson}
                />
              }
            >
              <Pane
                side="classic"
                {...paneProps}
                scenePlaces={paneProps.scenePlaces.map((place) => ({
                  ...place,
                  answer: `Human: ${place.answer}`,
                }))}
              />
            </PaneBody>
          </section>

          <aside className="center">
            {newsFollow && (
              <div className="news-follow" role="status">
                <span>
                  Watching {shortName(newsFollow.personId)} ·{' '}
                  {newsFollow.side === 'human' ? 'Human' : 'Classic'}
                </span>
                <button type="button" className="news-return" onClick={returnFromNews}>
                  {returnWorker ? `Back to ${shortName(returnWorker)}` : 'Back to village'}
                </button>
              </div>
            )}
            {!newsFollow && watching && !ordering && (
              <p className="watching-worker" role="status">
                Watching {shortName(watching)} ·{' '}
                {(mapSide === 'human' ? frame?.human : frame?.classic)?.find((p) => p.id === watching)
                  ?.label ?? 'waiting'}
              </p>
            )}
            <div className="order-alerts">
              {playback.pause && (
                <PauseRibbon
                  pause={playback.pause}
                  paused={playback.paused}
                  onResume={() => actions.setPaused(false)}
                />
              )}
              {moment && <MomentBanner moment={moment} />}
              <HurtLine
                news={frame?.news.slice(-1) ?? []}
                onShow={showNewsPerson}
                onRest={(news) =>
                  sendOrder({
                    personId: news.personId,
                    placeId: villagerById(news.personId)?.home ?? 'home-yusuf',
                  })
                }
              />
            </div>
            {personOrderOpen && selectedOrder && (
              <PersonOrder
                card={selectedOrder}
                onAgain={askAgain}
                onCancel={actions.cancel}
                onInsist={insistOrder}
              />
            )}
            <div className="composer-tray">
              <p className="order-scope">Each order goes to both villages.</p>
              <Composer
                state={composer}
                frame={frame}
                job={job}
                prediction={
                  colony.prediction &&
                  previewInput &&
                  JSON.stringify(colony.prediction.input) === JSON.stringify(previewInput)
                    ? colony.prediction.prediction
                    : null
                }
                onChange={setComposer}
                onWho={pickWho}
                onWhere={pickWhere}
                onHover={setHoverPlace}
                onConfirm={confirm}
                onInspect={inspectPersonCb}
                onWatch={watchVillage}
                onCompose={() => {
                  setNewsFollow(null);
                  setReturnedFollow(false);
                  setOrdering(true);
                  setHoldKey((key) => key + 1);
                }}
              />
            </div>
            <section className={`queue ${drawer ? 'is-open' : ''}`} aria-label="Order log">
              <div className="queue-head">
                <h2 className="col-head">History</h2>
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
            <div className="sheet-tools">
              <button
                type="button"
                className="order-toggle"
                aria-expanded={ordering}
                onClick={() => {
                  if (ordering) watchVillage();
                  else setOrdering(true);
                }}
              >
                {ordering ? 'Watch village' : 'Order options'}
              </button>
              {nudge && frame && (
                <details
                  onToggle={(e) => keepOneDisclosure(e.currentTarget)}
                  className={`nudge-slot ${composer.nudgeId === nudge.id ? 'is-active' : ''}`}
                  role="status"
                  aria-live="polite"
                >
                  <summary>
                    Suggestion<span className="nudge-who"> · {shortName(nudge.order.personId)}</span>
                    <small>
                      {suggestionNeedsReview(nudge, frame) ? 'Review, then Confirm.' : 'Send in one tap.'}
                    </small>
                  </summary>
                  <SuggestionCard
                    nudge={nudge}
                    frame={frame}
                    cards={cards}
                    minute={frame.minute}
                    queued={nudges.length - 1}
                    active={composer.nudgeId === nudge.id}
                    onUse={applyNudge}
                    onSkip={skipNudge}
                    onKeepWatching={() => {
                      // A manual pause resumes into decision slowdown; the second resume acknowledges it.
                      actions.setPaused(false);
                      if (playback.paused) actions.setPaused(false);
                    }}
                  />
                </details>
              )}
              <button type="button" className="orders-button" onClick={() => setDrawer(true)}>
                History ({orderCount})
              </button>
            </div>
          </aside>

          <section className="pane pane-human" aria-label="Human village">
            <header className="pane-head">
              <h2>
                Human <span>they decide</span>
              </h2>
              <PaneStats frame={frame} side="human" />
            </header>
            <PaneBody
              rows={
                <PeopleRows
                  frame={frame}
                  side="human"
                  selectedId={composer.personId}
                  onSelect={selectScenePerson}
                />
              }
            >
              <Pane side="human" {...paneProps} bubbles={bubbles} />
            </PaneBody>
          </section>
        </div>
        <PhoneSheet
          frame={frame}
          state={composer}
          ordering={ordering}
          onOrdering={setOrdering}
          onWatch={watchVillage}
          shownSide={mapSide}
          prediction={
            colony.prediction &&
            previewInput &&
            JSON.stringify(colony.prediction.input) === JSON.stringify(previewInput)
              ? colony.prediction.prediction
              : null
          }
          onChange={setComposer}
          onWho={pickWho}
          onWhere={pickWhere}
          onConfirm={confirm}
          onUse={applyNudge}
          onSkip={skipNudge}
          onCancel={actions.cancel}
          onInspect={inspectPersonCb}
          onSheet={setPhoneSheetHeight}
          stageRoot={stageRoot}
          onSceneHeight={setSceneHeight}
          onShowNews={showNewsPerson}
          onRestNews={(news) =>
            sendOrder({ personId: news.personId, placeId: villagerById(news.personId)?.home ?? 'home-yusuf' })
          }
          job={job}
          placeRequest={placeRequest}
          personRequest={personRequest}
          onAgain={askAgain}
          onInsist={insistOrder}
          onScenePlace={sendScenePlace}
          inspecting={inspectOpen}
          active={!starting && !showEnd}
          onKeepWatching={() => {
            actions.setPaused(false);
            if (playback.paused) actions.setPaused(false);
          }}
        />
      </main>

      <div className="flash-region" role="status" aria-live="polite">
        {flash && <div className="flash">{flash}</div>}
        {toast && !flash && <div className="flash">Select a worker, then About to see why.</div>}
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
