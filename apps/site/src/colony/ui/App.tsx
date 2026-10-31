import { setTelemetryOff, telemetryOn } from '@adam0white/lab-kit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CastLifeNote, CastMenu, CastStartGate } from '../../shared/CastMenu.tsx';
import { fileSession, readGameFile } from '../../shared/cast-runtime.ts';
import { DebugMenu } from '../../shared/DebugMenu.tsx';
import { FullscreenButton, useWakeLock } from '../../shared/fullscreen.tsx';
import { GameVersion } from '../../shared/GameVersion.tsx';
import { LabNotice } from '../../shared/LabNotice.tsx';
import { gameLabs, useLabScreen } from '../../shared/lab.tsx';
import { fileError as gameFileError, playerError } from '../../shared/player-error.ts';
import type { PlaytestFile } from '../../shared/playtest.ts';
import type { HurtNews, MomentRecord } from '../sim/game.ts';
import { WELL_OLD_SAVE } from '../sim/human-side.ts';
import type { PlaceId } from '../sim/map.ts';
import { APPEALS, type AppealChip, type OrderInput } from '../sim/orders.ts';
import type { Village } from '../sim/village.ts';
import { type VillagerId, villagerById } from '../sim/world-types.ts';
import { BubbleManager } from './bubbles.ts';
import { dayClock } from './contract.ts';
import { EndScreen } from './EndScreen.tsx';
import { Feedback } from './Feedback.tsx';
import { Inspector } from './Inspector.tsx';
import {
  Orders,
  People,
  PersonSheet,
  placesFor,
  RingTimer,
  riskyPlace,
  Stand,
  StateStrip,
} from './Layout.tsx';
import { latestPersonOrder, repeatPersonOrder } from './order-status.ts';
import { Pane } from './Pane.tsx';
import {
  CHIP_TEXT,
  inferredJob,
  PaneStats,
  PLACE_LABEL,
  shortName,
  statusLine,
  suggestionNeedsReview,
  TaskContext,
  Timeline,
} from './parts.tsx';
import { suggestionChoice, suggestionInput } from './suggestion-choice.ts';
import { useColony } from './useColony.ts';
import { VILLAGE_WORDS } from './village-words.ts';
import { wellWords as settingWords } from './words.ts';
import './layout.css';

type ReviewedDraft = {
  input: OrderInput;
  id: string;
  until: number;
  text: string;
  reason?: string;
  suggestedRush: boolean;
  suggestedInsist: boolean;
  suggestedAppeal?: AppealChip;
  dispatch(input: OrderInput, id?: string): void;
};
type Sheet = 'people' | 'person' | 'orders' | 'stand' | 'suggestion';
function savedRun(): PlaytestFile | null {
  if (fileSession) return null;
  try {
    const s = JSON.parse(localStorage.getItem('colony.run') ?? 'null') as PlaytestFile | null;
    return s?.kind === 'human-playtest' && s.game === 'colony' ? s : null;
  } catch {
    return null;
  }
}
function oldVillageError(error: unknown): string | null {
  const detail = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return detail === WELL_OLD_SAVE
    ? 'That village is from before the well was dug again; begin the first morning.'
    : null;
}
export function App() {
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRead = useRef(0);
  const colony = useColony();
  const { frame, actions, playback } = colony;
  const [shelf, setShelf] = useState(!fileSession),
    [save, setSave] = useState(savedRun),
    [newConfirm, setNewConfirm] = useState(false),
    [other, setOther] = useState(false);
  const [menu, setMenu] = useState(false),
    [info, setInfo] = useState(false),
    [feedback, setFeedback] = useState<'menu' | 'end' | null>(null);
  const [recording, setRecording] = useState(() => telemetryOn(gameLabs.well));
  const [sheet, setSheet] = useState<Sheet>('people'),
    [person, setPerson] = useState<VillagerId | null>(null),
    [following, setFollowing] = useState<VillagerId | null>(null);
  const [rush, setRush] = useState(false),
    [insist, setInsist] = useState(false),
    [appeal, setAppeal] = useState<AppealChip | null>(null),
    [appealOpen, setAppealOpen] = useState(false);
  const [draft, setDraft] = useState<ReviewedDraft | null>(null);
  const [villageReturn, setVillageReturn] = useState<{ id: VillagerId; side: 'human' | 'classic' } | null>(
    null,
  );
  const heldSuggestion = useRef<(() => void) | null>(null);
  const currentFrame = useRef(frame);
  currentFrame.current = frame;
  const [pending, setPending] = useState<PlaceId | null>(null),
    [asked, setAsked] = useState<PlaceId | null>(null),
    [outline, setOutline] = useState<PlaceId | null>(null),
    [nudgeId, setNudgeId] = useState<string | undefined>();
  const [inspect, setInspect] = useState<VillagerId | null>(null),
    [mapSide, setMapSide] = useState<'human' | 'classic'>('human'),
    [hover, setHover] = useState<PlaceId | null>(null),
    [followKey, setFollowKey] = useState(0);
  const [endOpen, setEndOpen] = useState(true),
    [flash, setFlash] = useState(''),
    [moment, setMoment] = useState<MomentRecord | null>(null),
    [newsReturn, setNewsReturn] = useState<{ id: VillagerId | null; side: 'human' | 'classic' } | null>(null);
  const cancelFileSelection = useCallback(() => {
    if (!fileSession) return;
    fileRead.current++;
    actions.cancelFileLoad();
  }, [actions]);
  const closeFileMenu = useCallback(() => {
    cancelFileSelection();
    setMenu(false);
  }, [cancelFileSelection]);
  const bubbles = useMemo(() => new BubbleManager(), []);
  const flashTimer = useRef(0);
  const saveSequence = useRef(0);
  const momentCount = useRef(0);
  const loadedRef = useRef<unknown>(null);
  const continueLoad = useRef(false);
  const hasSummary = Boolean(colony.summaries[2] || colony.summaries[3]);
  const showEnd = !shelf && hasSummary && frame?.ended && endOpen;
  const [loadPage, setLoadPage] = useState(false);
  const interstitial = !shelf && !frame?.ended && (playback.pause?.kind === 'start' || loadPage);
  const held =
    shelf || menu || info || Boolean(feedback) || Boolean(inspect) || Boolean(showEnd) || other || loadPage;
  useLabScreen(gameLabs.well, shelf ? 'title' : showEnd ? 'ending' : 'play');
  useWakeLock(Boolean(frame) && !held && !playback.paused && !frame?.ended);
  useEffect(() => {
    actions.setMenuOpen(held);
  }, [held, actions]);
  useEffect(() => {
    actions.setContext?.({
      person: inspect ?? (sheet === 'person' ? person : null),
      buildingDetails: true,
      reading: pending !== null || sheet === 'suggestion',
      info,
    });
  }, [actions, person, sheet, pending, info, inspect]);
  useEffect(() => {
    if (!inspect) {
      actions.clearWhy();
      return;
    }
    actions.requestWhy(inspect);
    const t = window.setInterval(() => actions.requestWhy(inspect), 1000);
    return () => window.clearInterval(t);
  }, [inspect, actions]);
  const momentsLength = frame?.moments.length ?? 0;
  const latestMoment = frame?.moments.at(-1);
  useEffect(() => {
    const count = momentsLength;
    if (count < momentCount.current) momentCount.current = 0;
    if (count === momentCount.current) return;
    momentCount.current = count;
    setMoment(latestMoment ?? null);
  }, [momentsLength, latestMoment]);
  useEffect(() => {
    if (!moment) return;
    const t = window.setTimeout(() => setMoment(null), 4500);
    return () => window.clearTimeout(t);
  }, [moment]);
  const loaded = colony.playtest && 'result' in colony.playtest ? colony.playtest.result : null;
  useEffect(() => {
    if (!loaded || loadedRef.current === loaded) return;
    loadedRef.current = loaded;
    setShelf(false);
    setOther(false);
    setLoadPage(true);
    saveSequence.current += 1;
    setSheet('people');
    setPerson(null);
    setFollowing(null);
    setEndOpen(true);
    bubbles.reset();
    setMoment(null);
    if (continueLoad.current) {
      continueLoad.current = false;
      actions.clearPlaytest();
    }
  }, [loaded, actions, bubbles]);
  const saveNow = useCallback(() => {
    if (fileSession || !frame || shelf) return;
    const sequence = ++saveSequence.current;
    void actions
      .getRun()
      .then((run) => {
        if (fileSession || saveSequence.current !== sequence) return;
        try {
          localStorage.setItem('colony.run', JSON.stringify(run));
          setSave(run);
        } catch {
          setFlash('This device could not save the run. Keep a copy in Feedback.');
        }
      })
      .catch(() => {
        if (saveSequence.current === sequence) setFlash('The run could not be saved.');
      });
  }, [actions, frame, shelf]);
  const saveRef = useRef(saveNow);
  saveRef.current = saveNow;
  useEffect(() => {
    if (fileSession || shelf) return;
    const t = window.setInterval(() => saveRef.current(), 60000);
    const hide = () => {
      if (document.hidden) saveRef.current();
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [shelf]);
  const errorDetail =
    colony.error ?? (colony.playtest && 'error' in colony.playtest ? colony.playtest.error : null);
  const notice = errorDetail
    ? oldVillageError(errorDetail)
      ? oldVillageError(errorDetail)
      : fileSession
        ? gameFileError(errorDetail)
        : playerError(errorDetail, colony.error ? 'play' : 'load')
    : null;
  const loadedNotice = loaded
    ? loaded.matches
      ? 'Your saved game is open.'
      : playerError('The restored game does not match.', 'load')
    : null;
  const resetHow = () => {
    setDraft(null);
    setRush(false);
    setInsist(false);
    setAppeal(null);
    setAppealOpen(false);
    setPending(null);
    setNudgeId(undefined);
    setOutline(null);
  };
  const refusedDestination = () => {
    const card = latestPersonOrder(frame?.cards ?? [], person);
    return card?.human.state === 'willNot' ? card.order.placeId : outline;
  };
  const pick = (id: VillagerId) => {
    const destination = refusedDestination();
    setPerson(id);
    setFollowing(id);
    setSheet('person');
    resetHow();
    setOutline(destination);
    setAsked(null);
    setFollowKey((k) => k + 1);
  };
  const backPeople = () => {
    const destination = refusedDestination();
    setSheet('people');
    setPerson(null);
    resetHow();
    setOutline(destination);
  };
  const send = useCallback(
    (input: OrderInput, id?: string) => {
      actions.order(input, id);
      setDraft(null);
      setPerson(input.personId);
      setFollowing(input.personId);
      setSheet('person');
      setAsked(input.placeId);
      setRush(false);
      setInsist(false);
      setAppeal(null);
      setAppealOpen(false);
      setPending(null);
      setOutline(null);
      setNudgeId(undefined);
      setHover(null);
      setFollowKey((k) => k + 1);
      setFlash(`Order given to both villages: ${shortName(input.personId)} → ${PLACE_LABEL[input.placeId]}`);
      window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlash(''), 2200);
      saveRef.current();
    },
    [actions],
  );
  const inputFor = (placeId: PlaceId): OrderInput | null =>
    person
      ? {
          personId: person,
          placeId,
          ...(rush ? { rush: true } : {}),
          ...(insist ? { insist: true } : {}),
          ...(appeal ? { appeal } : {}),
        }
      : null;
  const choosePlace = (place: PlaceId) => {
    if (!person || !frame || shelf) return;
    const sourceId = draft ? undefined : nudgeId;
    setDraft(null);
    setNudgeId(sourceId);
    const input = inputFor(place);
    if (!input) return;
    if (riskyPlace(frame, place)) {
      setPending(place);
      setAppealOpen(false);
    } else send(input, sourceId);
  };
  const confirm = () => {
    if (pending) {
      if (draft && pending === draft.input.placeId) {
        sendDraft(true);
        return;
      }
      const input = inputFor(pending);
      if (input) send(input, nudgeId);
    }
  };
  const scenePlace = (place: PlaceId) => {
    if (!person && following) {
      setPerson(following);
      setSheet('person');
      return;
    }
    choosePlace(place);
  };
  const sceneInputs = useMemo(
    () =>
      person
        ? placesFor(person, frame?.rules).map((placeId) => ({
            personId: person,
            placeId,
            ...(rush ? { rush: true } : {}),
            ...(insist ? { insist: true } : {}),
            ...(appeal ? { appeal } : {}),
          }))
        : [],
    [person, rush, insist, appeal, frame?.rules],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: Forecasts depend on the changing world.
  useEffect(() => {
    actions.predictPlaces?.(sceneInputs);
  }, [actions, sceneInputs, frame?.minute]);
  const nudge = frame?.nudges[0];
  const nudgeInput = useMemo(() => (nudge ? suggestionInput(nudge) : null), [nudge]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Forecasts depend on the changing world.
  useEffect(() => {
    actions.predictSuggestion?.(nudgeInput);
  }, [actions, nudgeInput, frame?.minute]);
  const suggestionForecast =
    colony.suggestionPrediction &&
    JSON.stringify(colony.suggestionPrediction.input) === JSON.stringify(nudgeInput)
      ? colony.suggestionPrediction.prediction
      : null;
  const choice = nudge ? suggestionChoice(nudge, frame, frame?.cards, suggestionForecast) : null;
  const review = nudge ? suggestionNeedsReview(choice?.nudge ?? nudge, frame) : false;
  const applyNudge = () => {
    if (!nudge) return;
    const now = currentFrame.current;
    if (!now || now.ended || now.minute >= nudge.until) {
      setFlash('This proposal is unavailable. Choose a new order deliberately.');
      return;
    }
    const actual = choice?.nudge ?? nudge;
    const input = suggestionInput(actual);
    if (!review && !suggestionNeedsReview(actual, now)) {
      send(input, nudge.id);
      return;
    }
    pick(input.personId);
    // Review is a proposal, not consent to any suggested modifier.
    setRush(false);
    setInsist(false);
    setAppeal(null);
    setDraft({
      input: { personId: input.personId, placeId: input.placeId },
      id: nudge.id,
      until: nudge.until,
      text: actual.text,
      reason: actual.reason,
      suggestedRush: Boolean(input.rush),
      suggestedInsist: Boolean(input.insist),
      suggestedAppeal: input.appeal,
      dispatch: send,
    });
    setOutline(input.placeId);
    setNudgeId(nudge.id);
  };
  const draftAvailable = Boolean(
    draft &&
      frame &&
      !frame.ended &&
      frame.minute < draft.until &&
      frame.human.some((p) => p.id === draft.input.personId) &&
      placesFor(draft.input.personId, frame.rules).includes(draft.input.placeId),
  );
  const sendDraft = (riskConfirmed = false) => {
    const now = currentFrame.current;
    if (
      !draft ||
      !now ||
      now.ended ||
      now.minute >= draft.until ||
      !now.human.some((p) => p.id === draft.input.personId) ||
      !placesFor(draft.input.personId, now.rules).includes(draft.input.placeId)
    )
      return;
    if (riskyPlace(now, draft.input.placeId) && !riskConfirmed) {
      setPending(draft.input.placeId);
      setAppealOpen(false);
      return;
    }
    draft.dispatch(
      {
        ...draft.input,
        ...(rush ? { rush: true } : {}),
        ...(insist ? { insist: true } : {}),
        ...(appeal ? { appeal } : {}),
      },
      draft.id,
    );
  };
  const showVillage = (side: 'human' | 'classic') => {
    const id = person ?? following;
    if (id) setVillageReturn({ id, side: mapSide });
    setMapSide(side);
    setPerson(null);
    setFollowing(null);
    setOutline(null);
    setHover(null);
    setPending(null);
    setSheet('people');
    setFollowKey((k) => k + 1);
  };
  const skipNudge = () => {
    if (nudge) {
      actions.dismissNudge(nudge.id);
      if (sheet === 'suggestion') setSheet(person ? 'person' : 'people');
      saveRef.current();
    }
  };
  const showNews = (news: HurtNews) => {
    setNewsReturn({ id: person ?? following, side: mapSide });
    pick(news.personId);
    setMapSide(news.side);
    setOutline(villagerById(news.personId)?.home ?? 'home-yusuf');
  };
  const restart = (village?: Village) => {
    if (fileSession) throw new Error('A file session cannot replace native play.');
    saveSequence.current += 1;
    actions.restart(village ?? frame?.village);
    setShelf(true);
    setLoadPage(false);
    setNewConfirm(false);
    setEndOpen(true);
    setSheet('people');
    setPerson(null);
    setFollowing(null);
    resetHow();
    bubbles.reset();
    momentCount.current = 0;
    setMoment(null);
    try {
      localStorage.removeItem('colony.run');
    } catch {}
    setSave(null);
  };
  const begin = () => {
    setShelf(false);
    actions.setPaused(false);
  };
  const live = useRef({
    menu,
    info,
    feedback,
    other,
    sheet,
    inspect,
    showEnd,
    pending,
    held,
    confirm,
    backPeople,
  });
  live.current = { menu, info, feedback, other, sheet, inspect, showEnd, pending, held, confirm, backPeople };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const x = live.current;
      if (e.key === 'Escape') {
        if (x.inspect) setInspect(null);
        else if (x.info) setInfo(false);
        else if (x.feedback) setFeedback(null);
        else if (x.menu) closeFileMenu();
        else if (x.other) setOther(false);
        else if (x.pending) setPending(null);
        else if (x.showEnd) setEndOpen(false);
        else x.backPeople();
        return;
      }
      if ((e.target as HTMLElement)?.closest('button,input,textarea,select,summary,[contenteditable]'))
        return;
      if (e.code === 'Space' && !x.held) {
        e.preventDefault();
        if (!e.repeat) actions.setPaused(!colony.playback.paused);
      }
      if (e.key === 'Enter' && x.pending && !x.held) {
        e.preventDefault();
        x.confirm();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [actions, colony.playback.paused, closeFileMenu]);
  const newest =
    latestPersonOrder(frame?.cards ?? [], person) ??
    frame?.cards.findLast((c) => c.human.state !== 'pending');
  const pace = frame?.ended
    ? 'the run is over'
    : menu
      ? 'held: the menu is open'
      : info
        ? 'held: you are reading'
        : inspect
          ? `held: you are reading ${shortName(inspect)}`
          : (playback.paceLine ?? '');
  const message =
    notice ??
    loadedNotice ??
    (newest && newest.human.state !== 'pending'
      ? `${shortName(newest.order.personId)} → ${PLACE_LABEL[newest.order.placeId]} · ${CHIP_TEXT[newest.human.state]} · “${newest.human.says ?? newest.human.label ?? ''}”`
      : flash ||
        (frame?.cards.length
          ? 'You do not need to make a choice now. The villages work on their own.'
          : 'Each order goes to both villages. Tap a person to begin.'));
  const title = frame
    ? `${dayClock(frame.minute)} · ${statusLine(frame).replace(/^Day \d+ of \d+ · /, '')}`
    : 'D1 05:00';
  const openMenu = () => {
    saveNow();
    setInfo(false);
    setFeedback(null);
    setMenu(true);
  };
  const scene = (
    <div className={`well-map-pair show-${mapSide}`}>
      <fieldset className="well-map-toggle">
        <legend className="visually-hidden">Map shown</legend>
        {(['classic', 'human'] as const).map((side) => (
          <button key={side} type="button" aria-pressed={mapSide === side} onClick={() => setMapSide(side)}>
            {side === 'classic' ? 'Classic' : 'Human'}
          </button>
        ))}
      </fieldset>
      {(['classic', 'human'] as const).map((side) => (
        <section
          className={`well-map well-map-${side}`}
          key={side}
          aria-label={settingWords(`${side === 'classic' ? 'Classic' : 'Human'} village`)}
        >
          <header>
            <strong>{side === 'classic' ? 'Classic' : 'Human'}</strong>
            <PaneStats frame={frame} side={side} />
          </header>
          <Pane
            side={side}
            store={colony.store}
            selectedId={person ?? following}
            hoverPlace={hover ?? outline}
            destination={pending}
            following={Boolean(following)}
            frameSelection={true}
            followKey={followKey}
            onShowVillage={() => showVillage(side)}
            onSelect={pick}
            onPlace={scenePlace}
            onHoverPlace={setHover}
            {...(side === 'human' ? { bubbles } : {})}
          />
        </section>
      ))}
      {!shelf && (
        <div className="well-scene-alert">
          {villageReturn ? (
            <button
              type="button"
              onClick={() => {
                const r = villageReturn;
                setMapSide(r.side);
                pick(r.id);
                setVillageReturn(null);
              }}
            >
              Back to {shortName(villageReturn.id)}
            </button>
          ) : newsReturn ? (
            <button
              type="button"
              onClick={() => {
                const r = newsReturn;
                setMapSide(r.side);
                if (r.id) pick(r.id);
                else backPeople();
                setNewsReturn(null);
              }}
            >
              Showing {shortName(person ?? following ?? 'idris')} ·{' '}
              {mapSide === 'human' ? 'Human' : 'Classic'} ← Back
            </button>
          ) : moment && moment.minute >= (frame?.news.at(-1)?.minute ?? -1) ? (
            <p>
              Moment {moment.id} · {moment.line}
            </p>
          ) : frame?.news.at(-1) ? (
            <button
              type="button"
              onClick={() => {
                const n = frame.news.at(-1);
                if (n) showNews(n);
              }}
            >
              Hurt · {shortName(frame.news.at(-1)?.personId ?? 'idris')} (
              {frame.news.at(-1)?.side === 'human' ? 'Human' : 'Classic'}) · Show
            </button>
          ) : null}
        </div>
      )}
      {shelf && <h1 className="well-title-overlay">Twice at the Well</h1>}
    </div>
  );
  const fileControls = fileSession ? (
    <section aria-label="Game file">
      <p>This file stays in this tab. Download it before closing.</p>
      <label>
        Open a game file{' '}
        <input
          type="file"
          accept="application/json,.json"
          ref={(input) => {
            if (!input) return;
            const cancel = () => {
              cancelFileSelection();
              setFileError(null);
            };
            input.addEventListener('cancel', cancel);
            return () => input.removeEventListener('cancel', cancel);
          }}
          onChange={(event) => {
            cancelFileSelection();
            const request = fileRead.current;
            setFileError(null);
            const file = event.target.files?.[0];
            if (!file) return;
            void readGameFile(file)
              .then((text) => {
                if (request !== fileRead.current) return;
                setFileError(null);
                actions.loadPlaytest(text);
                setShelf(false);
              })
              .catch((error) => {
                if (request === fileRead.current)
                  setFileError(oldVillageError(error) ?? gameFileError(error));
              });
            event.target.value = '';
          }}
        />
      </label>
      {frame && (
        <button
          type="button"
          onClick={() => {
            actions.exportPlaytest();
          }}
        >
          Download complete game file
        </button>
      )}
      {(fileError ||
        (colony.playtest && 'error' in colony.playtest ? colony.playtest.error : colony.error)) && (
        <p role="alert">{fileError ?? oldVillageError(errorDetail) ?? gameFileError(errorDetail)}</p>
      )}
    </section>
  ) : null;
  if (fileSession && !frame) return <main>{fileControls}</main>;
  return (
    <div className={`colony well-layout ${shelf ? 'well-on-shelf' : ''} ${showEnd ? 'well-on-end' : ''}`}>
      {fileControls}
      {!fileSession && <CastStartGate game="well" />}
      <header className="well-topbar">
        <div className="well-time">
          {shelf ? (
            <a href="/games/">All games</a>
          ) : (
            <>
              <span className="well-desktop-name">Twice at the Well · </span>
              {settingWords(title)}
            </>
          )}
        </div>
        {!shelf && (
          <>
            <Timeline frame={frame} />
            <div className="well-desktop-state">
              <StateStrip frame={frame} pace={pace} onOpen={() => setSheet('stand')} />
            </div>
          </>
        )}
        <button
          type="button"
          className="well-info-trigger"
          aria-label="Information"
          aria-expanded={info}
          onClick={() => {
            setInfo((v) => !v);
            closeFileMenu();
          }}
        >
          i
        </button>
        <button
          type="button"
          aria-label="Game menu"
          aria-expanded={menu}
          onClick={() => (menu ? closeFileMenu() : openMenu())}
        >
          ≡
        </button>
      </header>
      {!fileSession && (
        <div className="well-cast-disclosure">
          <CastLifeNote game="well" />
        </div>
      )}
      <LabNotice />
      {!shelf && !showEnd && !feedback && (
        <div className="well-phone-state">
          <StateStrip frame={frame} pace={pace} onOpen={() => setSheet('stand')} />
        </div>
      )}
      <main className={`well-main ${shelf ? 'well-shelf-main' : ''}`}>
        {scene}
        <aside className="well-column">
          {shelf ? (
            <>
              <div className="well-shelf-body">
                <h2 className="well-desktop-title">Twice at the Well</h2>
                <p>Two villages hear every order you give. One obeys. One decides.</p>
                <p>Build a roof and store 12 meals before the storm. Keep all six villagers alive.</p>
                <fieldset className="well-village-choice" disabled={Boolean(save)}>
                  <legend>Words by the well</legend>
                  {(['default', 'early-warning'] as const).map((v) => (
                    <label key={v}>
                      <input
                        type="radio"
                        name="village"
                        checked={
                          (save
                            ? save.log.some(
                                (entry) =>
                                  typeof entry === 'object' &&
                                  entry !== null &&
                                  'kind' in entry &&
                                  entry.kind === 'village' &&
                                  'village' in entry &&
                                  entry.village === 'early-warning',
                              )
                              ? 'early-warning'
                              : 'default'
                            : (frame?.village ?? 'default')) === v
                        }
                        onChange={() => actions.restart(v)}
                      />
                      <span>
                        {VILLAGE_WORDS[v].choice}
                        <small>{VILLAGE_WORDS[v].reply}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
                {save && <p>Choose again with A new run.</p>}
                {newConfirm && (
                  <div className="well-new-confirm">
                    <p>Starting again replaces your saved game.</p>
                    <button type="button" onClick={() => restart()}>
                      Yes, start over
                    </button>
                    <button type="button" onClick={() => setNewConfirm(false)}>
                      No
                    </button>
                  </div>
                )}
              </div>
              <footer className="well-actions">
                {save && (
                  <button type="button" onClick={() => setNewConfirm(true)}>
                    A new run
                  </button>
                )}
                <button
                  type="button"
                  className="well-primary"
                  onClick={() => {
                    if (save) {
                      continueLoad.current = true;
                      actions.loadPlaytest(JSON.stringify(save), true);
                    } else begin();
                  }}
                >
                  {save ? `Continue · ${dayClock(save.minute)}` : 'Begin the first morning'}
                </button>
              </footer>
              <DebugMenu>
                <button type="button" onClick={() => setOther(true)}>
                  Load a playtest run
                </button>
              </DebugMenu>
            </>
          ) : interstitial ? (
            <>
              <div className="well-reading well-interstitial">
                <h1>{loadPage ? 'Loaded run' : frame?.day.total === 3 ? 'Day 3' : 'The first morning'}</h1>
                <p>{settingWords(playback.pause?.text)}</p>
                <p>
                  {settingWords(
                    loadPage
                      ? loadedNotice
                      : frame?.day.total === 3
                        ? 'Finish the store-room and keep everyone alive.'
                        : 'Roof the house, store meals and keep all six alive.',
                  )}
                </p>
                <p>Each pair of bars compares Classic above Human. The tick is the target.</p>
              </div>
              <footer className="well-actions">
                <button
                  type="button"
                  className="well-primary"
                  onClick={() => {
                    setLoadPage(false);
                    actions.setPaused(false);
                  }}
                >
                  {loadPage
                    ? 'Play on from here'
                    : frame?.day.total === 3
                      ? 'Begin Day 3'
                      : 'Begin the first morning'}
                </button>
              </footer>
            </>
          ) : (
            <>
              <div className="well-caption" role="status">
                {frame?.ended ? (
                  <button type="button" className="well-primary" onClick={() => setEndOpen(true)}>
                    See the report
                  </button>
                ) : nudge ? (
                  <>
                    <RingTimer
                      left={Math.max(0, nudge.until - (frame?.minute ?? 0))}
                      span={nudge.until - nudge.minute}
                    />
                    <button
                      type="button"
                      className="well-caption-text"
                      onClick={() => setSheet('suggestion')}
                    >
                      <strong>
                        Suggestion · {shortName(nudge.order.personId)} → {PLACE_LABEL[nudge.order.placeId]}
                      </strong>
                      <small>
                        {settingWords(
                          choice?.underway
                            ? 'This work is already underway in both villages.'
                            : (choice?.refusal ??
                                suggestionForecast?.text ??
                                'This was suggested earlier. It may no longer be possible.'),
                        )}
                      </small>
                      {frame && !choice?.underway && (
                        <TaskContext job={inferredJob(frame, nudge.order.placeId)} compact />
                      )}
                    </button>
                    <button
                      type="button"
                      className="well-nudge-send"
                      onPointerDown={() => {
                        heldSuggestion.current = choice?.underway ? skipNudge : applyNudge;
                      }}
                      onPointerCancel={() => {
                        heldSuggestion.current = null;
                      }}
                      onClick={(event) => {
                        const selected = event.detail > 0 ? heldSuggestion.current : null;
                        heldSuggestion.current = null;
                        (selected ?? (choice?.underway ? skipNudge : applyNudge))();
                      }}
                    >
                      {choice?.underway ? 'Keep watching' : review ? 'Review' : 'Send'}
                    </button>
                    <button type="button" aria-label="Dismiss suggestion" onClick={skipNudge}>
                      ×
                    </button>
                    {(frame?.nudges.length ?? 0) > 1 && (
                      <span className="well-waiting">+{(frame?.nudges.length ?? 1) - 1}</span>
                    )}
                  </>
                ) : (
                  <p>{settingWords(message)}</p>
                )}
              </div>
              <section className="well-sheet" aria-label="Village orders">
                {frame &&
                  (sheet === 'people' ? (
                    <People
                      frame={frame}
                      onPick={pick}
                      onOrders={() => setSheet('orders')}
                      onStand={() => setSheet('stand')}
                    />
                  ) : sheet === 'stand' ? (
                    <Stand frame={frame} onBack={() => setSheet(person ? 'person' : 'people')} />
                  ) : sheet === 'orders' ? (
                    <Orders
                      frame={frame}
                      onBack={backPeople}
                      onShow={showNews}
                      onCancel={(id) => {
                        actions.cancel(id);
                        saveNow();
                      }}
                    />
                  ) : sheet === 'suggestion' ? (
                    <>
                      <header className="well-sheet-head">
                        <button
                          type="button"
                          aria-label="Back from suggestion"
                          onClick={() => setSheet(person ? 'person' : 'people')}
                        >
                          ←
                        </button>
                        <h2>Suggestion</h2>
                      </header>
                      <div className="well-reading">
                        <p>
                          {settingWords(
                            choice?.underway
                              ? 'This work is already underway in both villages.'
                              : (suggestionForecast?.text ??
                                  'This was suggested earlier. It may no longer be possible.'),
                          )}
                        </p>
                        <p>
                          {settingWords(
                            nudge ? `Earlier suggestion: ${nudge.text}` : 'This suggestion has passed.',
                          )}
                        </p>
                        {nudge?.reason && <p>Earlier reason: {settingWords(nudge.reason)}</p>}
                        {choice?.refusal && <p>{settingWords(choice.refusal)}</p>}
                        <p>The person can still refuse or wait.</p>
                        {nudge && (
                          <>
                            <button
                              type="button"
                              onPointerDown={() => {
                                heldSuggestion.current = choice?.underway ? skipNudge : applyNudge;
                              }}
                              onPointerCancel={() => {
                                heldSuggestion.current = null;
                              }}
                              onClick={(event) => {
                                const selected = event.detail > 0 ? heldSuggestion.current : null;
                                heldSuggestion.current = null;
                                (selected ?? (choice?.underway ? skipNudge : applyNudge))();
                              }}
                            >
                              {choice?.underway ? 'Keep watching' : review ? 'Review' : 'Send'}
                            </button>
                            <button type="button" onClick={skipNudge}>
                              ×
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  ) : person ? (
                    <>
                      {draft && (
                        <section className="well-reviewed" aria-label="Reviewed proposal">
                          <strong>
                            Reviewed proposal · {shortName(draft.input.personId)} →{' '}
                            {PLACE_LABEL[draft.input.placeId]}
                          </strong>
                          <p>{settingWords(draft.text)}</p>
                          {draft.reason && <p>Earlier reason: {settingWords(draft.reason)}</p>}
                          {draft.suggestedInsist && (
                            <p>Insist is suggested. It may cost trust. Choose it yourself below.</p>
                          )}
                          {draft.suggestedAppeal && (
                            <p>
                              Suggested appeal: {APPEALS.find((a) => a.id === draft.suggestedAppeal)?.label}.
                              Choose an appeal yourself below.
                            </p>
                          )}
                          {draft.suggestedRush && (
                            <p>Rush is suggested: faster work, more hunger. Choose it yourself below.</p>
                          )}
                          {!draftAvailable && (
                            <p role="status">
                              This proposal is unavailable. Choose a new order deliberately.
                            </p>
                          )}
                          <button type="button" disabled={!draftAvailable} onClick={() => sendDraft()}>
                            Send reviewed order
                          </button>
                          <button type="button" onClick={resetHow}>
                            Discard proposal
                          </button>
                        </section>
                      )}
                      <PersonSheet
                        frame={frame}
                        id={person}
                        rush={rush}
                        insist={insist}
                        appeal={appeal}
                        appealOpen={appealOpen}
                        pending={pending}
                        asked={asked}
                        forecasts={colony.scenePredictions ?? {}}
                        onBack={backPeople}
                        onRush={() => setRush((v) => !v)}
                        onInsist={() => setInsist((v) => !v)}
                        onAppeal={(a) => {
                          setAppeal(a);
                          setAppealOpen(false);
                        }}
                        onAppealOpen={() => {
                          setAppealOpen((v) => !v);
                          setPending(null);
                        }}
                        onAbout={() => setInspect(person)}
                        onPlace={choosePlace}
                        onHover={setHover}
                        onConfirm={confirm}
                        onCancelRisk={() => setPending(null)}
                        onCancel={(id) => {
                          actions.cancel(id);
                          saveNow();
                        }}
                        onRepeat={(card) => send({ ...repeatPersonOrder(card), insist: true })}
                        outline={outline}
                      />
                    </>
                  ) : null)}
              </section>
            </>
          )}
        </aside>
      </main>
      {other && !fileSession && (
        <div className="well-overlay">
          <section className="well-drawer" role="dialog" aria-modal="true" aria-label="Other ways in">
            <header className="well-sheet-head">
              <h2>Other ways in</h2>
              <button type="button" aria-label="Close other ways in" onClick={() => setOther(false)}>
                ×
              </button>
            </header>
            <div className="well-reading">
              <label className="well-load">
                Load a playtest run
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      void (fileSession ? readGameFile(file) : file.text())
                        .then(actions.loadPlaytest)
                        .catch((err) => actions.playtestError(String(err)));
                  }}
                />
              </label>
              {notice && <p role="alert">{settingWords(notice)}</p>}
            </div>
          </section>
        </div>
      )}
      {menu && !feedback && (
        // biome-ignore lint/a11y/noStaticElementInteractions: backdrop clicks dismiss the modal; Escape is handled globally.
        <div
          className="well-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeFileMenu();
          }}
          role="presentation"
          onKeyDown={() => undefined}
        >
          <section className="well-drawer well-menu" role="dialog" aria-modal="true" aria-label="Game menu">
            <header className="well-sheet-head">
              <h2>Game menu · {frame ? dayClock(frame.minute) : ''}</h2>
              <button type="button" aria-label="Close menu" onClick={closeFileMenu}>
                ×
              </button>
            </header>
            <div className="well-menu-body">
              <p>The game is paused while this menu is open.</p>
              <aside className="game-release">
                <GameVersion id="well" />
              </aside>
              <fieldset className="well-menu-pace">
                <legend>The village's pace</legend>
                {(['auto', 0.5, 1, 2] as const).map((s, i) => (
                  <button
                    type="button"
                    key={s}
                    aria-pressed={
                      s === 'auto'
                        ? playback.automatic !== false
                        : playback.automatic === false && playback.speed === s
                    }
                    onClick={() => actions.setPace?.(s)}
                  >
                    {settingWords(['Automatic', 'Slow', 'Steady', 'Fast'][i])}
                  </button>
                ))}
              </fieldset>
              <button type="button" onClick={() => setFeedback('menu')}>
                Feedback
              </button>

              <FullscreenButton variant="item" className="well-menu-fullscreen" />
              {!fileSession && (
                <button
                  type="button"
                  onClick={() => {
                    if (!newConfirm) {
                      setNewConfirm(true);
                      return;
                    }
                    restart();
                    closeFileMenu();
                  }}
                >
                  {newConfirm ? 'Replace this game and start again' : 'New game'}
                </button>
              )}
              <a href="/games/">All games</a>
              <label className="well-record">
                <input
                  type="checkbox"
                  checked={recording}
                  onChange={(e) => {
                    setTelemetryOff(gameLabs.well, !e.target.checked);
                    setRecording(telemetryOn(gameLabs.well));
                  }}
                />
                Recording
              </label>
              {!fileSession && <CastMenu game="well" />}
            </div>
            <footer className="well-actions">
              <button type="button" className="well-primary" onClick={closeFileMenu}>
                Resume
              </button>
            </footer>
            <DebugMenu>
              <button type="button" onClick={actions.exportPlaytest}>
                Keep a copy of this run
              </button>
            </DebugMenu>
          </section>
        </div>
      )}
      {info && (
        <>
          <button
            type="button"
            className="well-info-outside"
            aria-label="Dismiss information"
            onClick={() => setInfo(false)}
          />
          <section className="well-info" role="dialog" aria-label="Information">
            <header className="well-sheet-head">
              <h2>
                {shelf
                  ? 'Two villages'
                  : showEnd
                    ? 'The report'
                    : interstitial
                      ? 'Another day'
                      : 'Giving orders'}
              </h2>
              <button type="button" aria-label="Close information" onClick={() => setInfo(false)}>
                ×
              </button>
            </header>
            <div className="well-reading">
              {shelf ? (
                <>
                  <p>
                    Every order you give goes to both villages. Classic obeys. Human considers your words
                    alongside needs, duties and trust, and may say no or not yet.
                  </p>
                  <p>The bars and report compare your villages with the same villages receiving no orders.</p>
                  <p>
                    Suggestions appear at set times. Following only those suggestions will not finish the
                    Human house’s roof.
                  </p>
                </>
              ) : showEnd ? (
                <>
                  <p>“Without you” is the same village with no orders.</p>
                  <p>“What would have won” replays your run to a turning point, then plays a good plan.</p>
                  <p>The tally is the game's own count.</p>
                </>
              ) : interstitial ? (
                <>
                  <p>Building the store-room beside the house takes six steps.</p>
                  <p>They finish the house’s roof before starting the store-room.</p>
                  <p>People remember Day 1 and Day 2.</p>
                </>
              ) : (
                <>
                  <p>
                    Tap a person, then a place. Tapping the place sends the order to both villages. The pencil
                    shows the Human side's likely answer. Risky work needs confirmation.
                  </p>
                  <p>
                    Rush makes them work faster and become hungrier. Insist may reduce their trust in you. An
                    appeal gives them a reason.
                  </p>
                  <p>
                    People stop to eat, sleep and pray, then come back.{' '}
                    {frame?.rules && frame.rules >= 8
                      ? 'Home asks them to stay sheltered until the next dawn (05:00). They may still refuse or leave for needs and duties.'
                      : 'Home asks for one meal or one sleep; it does not keep them in.'}
                  </p>
                  <p>
                    Drag the map to look around. Press Space to pause or resume the clock on desktop. It slows
                    for answers and runs quickly at night.
                  </p>
                  <p>
                    The Classic bars appear above the Human bars. The tick marks the target. The roof and
                    meals are judged at 19:00 on day 2. Everyone must be alive at dawn on day 3. Tap the bars
                    for numbers.
                  </p>
                </>
              )}
            </div>
          </section>
        </>
      )}
      {inspect && (
        <Inspector personId={inspect} frame={frame} why={colony.why} onClose={() => setInspect(null)} />
      )}
      {showEnd && (
        <EndScreen
          summaries={colony.summaries}
          tally={true}
          humanKind={frame?.humanKind ?? 'placeholder'}
          canContinue={frame?.canContinue ?? false}
          onContinue={() => {
            actions.continueDay();
            setEndOpen(true);
            saveNow();
          }}
          onAgain={fileSession ? undefined : () => restart()}
          onClose={() => {
            setLoadPage(false);
            setEndOpen(false);
          }}
          onDownload={actions.exportPlaytest}
          onFeedback={() => setFeedback('end')}
        />
      )}
      {feedback && (
        <Feedback
          getRun={actions.getRun}
          onDownload={actions.exportPlaytest}
          onBack={() => {
            setFeedback(null);
            setRecording(telemetryOn(gameLabs.well));
          }}
        />
      )}
    </div>
  );
}
