/**
 * Watch UI: where and when in the top bar, drawn state above the scene, one scrolling sheet,
 * and frequent actions at its foot. The title owns save navigation. The menu holds reading,
 * hopes and feedback. Presentation pacing does not change simulation rules or replay inputs.
 */
import { phoneStage, telemetryNotice } from '@adam0white/lab-kit';
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useWakeLock } from '../../shared/fullscreen.tsx';
import { gameLabs } from '../../shared/lab.tsx';
import type { PageInfo } from '../protocol.ts';
import { type PostId, postSection, SECTIONS, type SectionId, type WatcherId } from '../sim/config.ts';
import type { Moment } from '../sim/moments.ts';
import type { Speed } from '../sim/pace.ts';
import type { Press } from '../sim/state.ts';
import { TALKS_PER_DAY, type Topic } from '../sim/talk.ts';
import type { Frame, FrameWatcher } from '../sim/view.ts';
import { Chronicle, HopesSheet, Shelf } from './chronicle.tsx';
import { FeedbackScreen } from './exporting.tsx';
import { Icon } from './icons.tsx';
import { MapCanvas } from './MapCanvas.tsx';
import type { Hit } from './map.ts';
import { groupedUnavailable, nightActKey, retainedNightActs } from './night-requests.ts';
import {
  ChronicleStrip,
  ClosedPage,
  FairPage,
  FallenPage,
  SeasonPanel,
  ThawPage,
  yearWords,
} from './pages.tsx';
import { Impressions, Pips, Rope, Sacks, WinterProgress } from './parts.tsx';
import { PageActions, PageCommitContext } from './SheetActions.tsx';
import { useWatch, type WatchActions } from './useWatch.ts';
import {
  awayWords,
  dawnOutcome,
  daylightWords,
  hourWords,
  PRESS_WORDS,
  pageWhen,
  ropeWords,
} from './words.ts';

const SPEEDS = ['Slow', 'Steady', 'Fast'] as const;
function speedIds(season: boolean): Speed[] {
  return season ? ['tactical', 'days', 'seasons'] : ['tactical', 'watch', 'days'];
}

const SEASON_PHASES = new Set<Frame['phase']>(['spring', 'summer', 'autumn']);
/** Phases where the clock runs and the speed control shows. */
const RUNNING = new Set<Frame['phase']>(['dusk', 'night', 'spring', 'summer', 'autumn']);
const WINTER_PHASES = new Set<Frame['phase']>(['dusk', 'night', 'dawn']);

/** The top bar's line: the date, and the hour on winter nights. */
function headerLine(f: Frame): string {
  if (f.phase === 'goal') return 'Before the first night';
  if (WINTER_PHASES.has(f.phase))
    return `${f.phase === 'dusk' ? 'Dusk · night' : f.phase === 'dawn' ? 'Dawn · night' : 'Night'} ${f.winter?.night ?? ''} · ${hourWords(f.clock, f.phase)}`;
  return f.date;
}

const PRESSES: Press[] = ['ask', 'urge', 'insist'];

const nameIn = (f: Frame, id: WatcherId) => f.watchers.find((w) => w.id === id)?.name ?? '';
const sectionName = (id: SectionId) => SECTIONS.find((s) => s.id === id)?.name ?? '';

/** The post `who` is posted to in a section, else the first post there nobody is posted to. */
function freePost(f: Frame, section: SectionId, who: WatcherId): PostId | null {
  const sec = f.sections.find((s) => s.id === section);
  if (!sec) return null;
  const mine = sec.posts.find((p) => p.posted === who);
  if (mine) return mine.id;
  return sec.posts.find((p) => p.posted === null)?.id ?? null;
}

export function App() {
  const { frame, speed, error, seed, shelf, saving, current, actions } = useWatch();
  const [selected, setSelectedState] = useState<WatcherId | null>(null);
  /** The press picked for the selected watcher before a post is tapped; null starts with Ask. */
  const [pressPick, setPressPick] = useState<Press | null>(null);
  const [pageCommit, setPageCommit] = useState<HTMLElement | null>(null);
  const [menu, setMenu] = useState(false);
  const [info, setInfo] = useState(false);
  const [title, setTitle] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [helper, setHelper] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const postingOrigin = useRef<WatcherId | null>(null);
  const menuOrigin = useRef<HTMLElement | null>(null);

  const setSelected = useCallback((w: WatcherId | null) => {
    if (w) postingOrigin.current = w;
    setSelectedState(w);
    setPressPick(null);
    if (!w)
      requestAnimationFrame(() => {
        const origin =
          document.querySelector<HTMLElement>(
            `.phase-dusk .w-person-${postingOrigin.current}, .w-night-roster .w-person-${postingOrigin.current}`,
          ) ?? document.querySelector<HTMLElement>('.w-night-roster button');
        origin?.focus();
      });
  }, []);

  useEffect(() => {
    if (selected) stage.current?.querySelector<HTMLButtonElement>('.w-order-back, .w-account-close')?.focus();
  }, [selected]);

  useEffect(() => {
    actions.hold(menu || info || title || feedback);
  }, [menu, info, title, feedback, actions]);

  const phase = frame?.phase;
  const previousPhase = useRef(phase);
  const ready = frame !== null;
  const pendingMoment = frame?.moment?.id;
  useEffect(() => {
    if (pendingMoment !== undefined) setSelectedState(null);
  }, [pendingMoment]);
  useEffect(() => {
    if (!ready || !stage.current) return;
    const root = stage.current;
    const controller = phoneStage(root, {
      observeOnly: true,
      onSceneRect: () => {
        root.dataset.reflow = String(
          Math.max(
            parseFloat(getComputedStyle(root).fontSize),
            parseFloat(getComputedStyle(document.documentElement).fontSize),
          ) > 24,
        );
      },
    });
    return () => controller.destroy();
  }, [ready]);
  useEffect(() => {
    const back = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector(':popover-open')) return;
      if (menu) setMenu(false);
      else if (selected) setSelected(null);
    };
    window.addEventListener('keydown', back);
    return () => window.removeEventListener('keydown', back);
  }, [menu, selected, setSelected]);
  useEffect(() => {
    if (menu) stage.current?.querySelector<HTMLButtonElement>('.w-menu .w-x')?.focus();
    else menuOrigin.current?.focus();
  }, [menu]);
  const labScreen = !phase ? null : phase === 'goal' ? 'title' : phase === 'fallen' ? 'ending' : 'play';
  useEffect(() => {
    if (!labScreen) return;
    const notice = telemetryNotice();
    if (notice) document.body.prepend(notice);
    gameLabs.watch.screen(labScreen);
    if (labScreen === 'play') gameLabs.watch.milestone('run started');
    if (labScreen === 'ending') gameLabs.watch.milestone('ending reached');
  }, [labScreen]);
  useEffect(() => {
    if (phase === 'night' && previousPhase.current !== 'night') setSelectedState(null);
    previousPhase.current = phase;
    if (phase !== 'dusk' && phase !== 'night' && phase !== 'goal') {
      setSelectedState(null);
      setPressPick(null);
    }
  }, [phase]);

  // Keep the screen awake only while the clock runs (dusk, night, the open seasons), chronicle closed.
  useWakeLock(frame !== null && RUNNING.has(frame.phase) && !menu);

  if (error) {
    return (
      <div className="watch watch-error">
        <p>{error}</p>
      </div>
    );
  }
  if (!frame) {
    return (
      <div className="watch watch-loading">
        <p>Lighting the lantern…</p>
      </div>
    );
  }

  const pressFor = (): Press => pressPick ?? 'ask';
  const post = (who: WatcherId, at: PostId | null) => {
    actions.input({ k: 'post', watcher: who, post: at, press: pressFor() });
    setSelected(null);
  };

  const onHit = (hit: Hit) => {
    if (!hit) return;
    if (frame.phase === 'night') {
      if (hit.kind === 'watcher') {
        setSelected(hit.watcher);
        return;
      }
      if (hit.kind === 'post') {
        const at = frame.sections.flatMap((s) => s.posts).find((p) => p.id === hit.post);
        const who = at?.watchers[0] ?? at?.posted;
        if (who) {
          setSelected(who);
          return;
        }
      }
      setSelectedState(null);
      const section = hit.kind === 'section' ? hit.section : postSection(hit.post as PostId);
      actions.input({ k: 'lantern', section });
      return;
    }
    if (frame.phase !== 'dusk' || hit.kind === 'watcher') return;
    if (hit.kind === 'post') {
      const p = frame.sections.flatMap((s) => s.posts).find((x) => x.id === hit.post);
      const occupant = p?.posted ?? p?.watcher ?? null;
      if (selected) {
        actions.input({ k: 'post', watcher: selected, post: hit.post as PostId, press: pressFor() });
        setSelected(null);
      } else if (occupant) setSelected(occupant);
      else actions.input({ k: 'lantern', section: postSection(hit.post as PostId) });
      return;
    }
    if (selected) {
      const at = freePost(frame, hit.section, selected);
      if (at) {
        actions.input({ k: 'post', watcher: selected, post: at, press: pressFor() });
        setSelected(null);
      }
    } else actions.input({ k: 'lantern', section: hit.section });
  };

  const showingTitle = title || frame.phase === 'goal';
  const showSpeed = !showingTitle && (frame.phase === 'night' || SEASON_PHASES.has(frame.phase));
  const ids = speedIds(SEASON_PHASES.has(frame.phase));
  const displayFrame = showingTitle ? { ...frame, phase: 'goal' as const } : frame;
  return (
    <div className={`watch phase-${displayFrame.phase}${frame.slowed ? ' is-slowed' : ''}`}>
      <header className="w-top">
        {showingTitle ? (
          <a className="w-home" href="/games/">
            All games
          </a>
        ) : (
          <p className="w-where">
            <span className="w-desktop-name">The Night Watch · </span>
            {headerLine(frame)} · {(frame.souls.split(' in ')[0] ?? '').toLowerCase()}
          </p>
        )}
        <PhaseInfo frame={displayFrame} onToggle={setInfo} />
        <button
          type="button"
          className="w-chronicle"
          aria-label="Game menu"
          aria-expanded={menu}
          onClick={(event) => {
            menuOrigin.current = event.currentTarget;
            setMenu((m) => !m);
          }}
        >
          ≡<span>Menu</span>
        </button>
      </header>

      <main
        className="w-stage lk-stage"
        ref={stage}
        data-sheet="fit"
        data-ordering={Boolean(selected)}
        data-menu={menu}
      >
        {!showingTitle ? (
          <div className={`w-state-wrap${showSpeed ? ' has-speeds' : ''}`}>
            <WatchStrip frame={frame} selected={selected} helper={helper} />
            {showSpeed ? (
              <fieldset className="w-speeds">
                <legend className="sr-only">Speed</legend>
                {SPEEDS.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    className="w-speed"
                    aria-pressed={speed === ids[i]}
                    onClick={() => actions.setSpeed(ids[i] ?? 'watch')}
                  >
                    {label}
                  </button>
                ))}
              </fieldset>
            ) : null}
          </div>
        ) : null}
        <div className="w-mapwrap lk-scene" inert={menu || feedback}>
          <MapCanvas frame={displayFrame} selected={selected} onHit={onHit} />
          {showingTitle ? (
            <h1 className="w-scene-title">The Night Watch</h1>
          ) : frame.phase === 'dusk' ? (
            <p className="w-scout-overlay">{frame.warning}</p>
          ) : SEASON_PHASES.has(frame.phase) || frame.phase === 'fair' ? (
            <ChronicleStrip frame={frame} />
          ) : (
            <Ticker frame={frame} />
          )}
        </div>
        <section
          className="w-panel lk-sheet"
          aria-label={!showingTitle && frame.phase === 'dusk' ? 'Post the watchers' : 'The watch'}
          aria-live={SEASON_PHASES.has(frame.phase) ? 'off' : 'polite'}
          // One key for the open seasons, so the people list keeps its fold across spring, summer and autumn.
          key={SEASON_PHASES.has(frame.phase) ? 'season' : frame.phase}
        >
          {menu ? (
            <Chronicle
              frame={frame}
              actions={actions}
              seed={seed}
              shelf={shelf}
              saving={saving}
              current={current}
              onClose={() => setMenu(false)}
              onFeedback={() => {
                setMenu(false);
                setFeedback(true);
              }}
              onTitle={() => {
                setMenu(false);
                setTitle(true);
                actions.refreshShelf();
              }}
            />
          ) : null}

          <PageCommitContext value={pageCommit}>
            {feedback ? <FeedbackScreen actions={actions} onBack={() => setFeedback(false)} /> : null}
            <div
              hidden={menu || feedback}
              className={
                !showingTitle && (frame.phase === 'dusk' || frame.phase === 'night')
                  ? 'w-panel-parts'
                  : 'lk-sheet-body'
              }
            >
              {showingTitle ? (
                <GoalPage
                  frame={frame}
                  actions={actions}
                  shelf={shelf}
                  current={current}
                  onContinue={title ? () => setTitle(false) : undefined}
                  onNew={() => {
                    setTitle(false);
                    if (frame.phase === 'goal') actions.input({ k: 'start' });
                    else actions.restart(Math.floor(Math.random() * 1e9));
                  }}
                />
              ) : null}
              {!showingTitle && frame.phase === 'dusk' ? (
                <DuskPanel
                  frame={frame}
                  actions={actions}
                  selected={selected}
                  setSelected={setSelected}
                  press={selected ? pressFor() : 'ask'}
                  setPress={setPressPick}
                  post={post}
                />
              ) : null}
              {!showingTitle && frame.phase === 'night' ? (
                <NightPanel
                  frame={frame}
                  actions={actions}
                  selected={selected}
                  onClose={() => setSelected(null)}
                  onSelect={setSelected}
                  onHelper={setHelper}
                />
              ) : null}
              {!showingTitle && frame.phase === 'dawn' ? <DawnPanel frame={frame} actions={actions} /> : null}
              {!showingTitle && frame.phase === 'fallen' ? (
                <FallenPage
                  frame={frame}
                  actions={actions}
                  seed={seed}
                  tally={true}
                  onFeedback={() => setFeedback(true)}
                />
              ) : null}
              {!showingTitle && SEASON_PHASES.has(frame.phase) ? (
                <SeasonPanel frame={frame} actions={actions} />
              ) : null}
              {!showingTitle && frame.phase === 'fair' ? <FairPage frame={frame} actions={actions} /> : null}
              {!showingTitle && frame.phase === 'thaw' ? <ThawPage frame={frame} actions={actions} /> : null}
              {!showingTitle && frame.phase === 'closed' ? (
                <ClosedPage frame={frame} actions={actions} onFeedback={() => setFeedback(true)} />
              ) : null}
            </div>
          </PageCommitContext>
          <footer className="lk-commit w-page-commit" hidden={menu || feedback} ref={setPageCommit} />
        </section>
      </main>
    </div>
  );
}

export function WatchStrip({
  frame,
  helper = false,
}: {
  frame: Frame;
  selected?: WatcherId | null;
  helper?: boolean;
}) {
  return (
    <section className="w-state lk-strip" aria-label="Watch state">
      <div className="w-thaw-state">
        <WinterProgress frame={frame} />
        <span>
          {helper
            ? 'Choosing a helper'
            : frame.slowed
              ? frame.moment
                ? `${nameIn(frame, frame.moment.who)} is deciding`
                : 'News from the village'
              : 'thaw'}
        </span>
      </div>
      <Sacks
        have={frame.grain}
        lost={0}
        need={frame.need}
        label="The granary; the mark feeds the village until harvest"
      />
      {frame.phase === 'dusk' ? (
        <progress
          className="w-nightfall"
          max={1}
          value={Math.max(0, 1 + frame.nightProgress * 12)}
          aria-label="Nightfall approaches"
        />
      ) : null}
    </section>
  );
}

function PhaseInfo({ frame, onToggle }: { frame: Frame; onToggle: (open: boolean) => void }) {
  const id = useId();
  const phase = frame.phase;
  let title = 'About keeping watch';
  let content: ReactNode = (
    <>
      <p>
        You are the Keeper. Post the watchers at dusk. Carry the lantern at night. Bring every soul and the
        granary to the thaw.
      </p>
      <p>The watchers are people. Tired, frightened or worried for home, they may refuse a request.</p>
    </>
  );
  if (phase === 'dusk') {
    title = 'Posting the watch';
    content = (
      <>
        <p>
          Tap a watcher, then a post, or tap a post on the wall. Ask leaves it to them; urge leans on them;
          insist wins no goodwill.
        </p>
        <p>
          Chooses still keeps them on watch. Send them down at night to give a night off. The lantern chip
          sets where you start.
        </p>
        <p>{frame.winter?.why}</p>
        <p>
          The granary must feed everyone from the thaw to the harvest. Spare grain can be spent at the fair.
        </p>
      </>
    );
  } else if (phase === 'night') {
    title = 'The lantern, your voice and the bell';
    content = (
      <>
        <p>Only the lantern’s stretch shows what approaches. Your voice reaches the next stretch.</p>
        <p>
          The bell wakes and calls back whoever hears it, loudest at the Gate. Pull from anywhere. Every pull
          wears the rope; a snapped rope leaves the bell silent until it is spliced.
        </p>
        <p>Tap a watcher to send them down, or to send relief or help.</p>
      </>
    );
  } else if (phase === 'dawn') {
    title = 'Mornings';
    content = (
      <p>Each talk costs them a little sleep. The night's account shows what each stretch saw and lost.</p>
    );
  } else if (SEASON_PHASES.has(phase)) {
    title = 'The open seasons';
    content = (
      <p>
        Days run on their own and slow for news and matters for you. The sacks’ mark is what the next thaw
        takes to feed everyone.
      </p>
    );
  } else if (phase === 'fair') {
    title = 'The fair';
    content = <p>What you take is paid from the granary and cannot be undone.</p>;
  } else if (phase !== 'goal') {
    title = 'The chronicle';
    content = (
      <p>
        A volume holds several years of the village. The next volume asks its own question. Closed volumes
        stay on the shelf.
      </p>
    );
  }
  return (
    <div className="w-info">
      <button type="button" className="game-help-button" popoverTarget={id} aria-label={title}>
        i
      </button>
      <div
        id={id}
        popover="auto"
        className="w-info-content"
        onToggle={(event) => onToggle(event.newState === 'open')}
      >
        <header>
          <strong>{title}</strong>
          <button type="button" popoverTarget={id} popoverTargetAction="hide" aria-label="Close information">
            ×
          </button>
        </header>
        {content}
      </div>
    </div>
  );
}

function Ticker({ frame }: { frame: Frame }) {
  if (frame.phase === 'dusk') return null;
  if (frame.phase !== 'night') return null;
  const now = frame.nightProgress;
  const recent = frame.alerts.slice(-2).reverse();
  return (
    <ol className="w-ticker" aria-label="What the Keeper hears">
      {recent.map((a) => (
        <li
          key={`${a.minute}-${a.text}`}
          className={`w-alert w-alert-${a.kind}${a.slowed ? ' is-moment' : ''}`}
        >
          {a.text}
        </li>
      ))}
      {recent.length === 0 && now < 0.1 ? (
        <li className="w-alert">The wall settles in for the night.</li>
      ) : null}
    </ol>
  );
}

/** Where a watcher is posted and where they stand, in words. */
function whereWords(w: FrameWatcher, phase: Frame['phase']): string {
  const posted = w.posted
    ? `${sectionName(postSection(w.posted))}, ${PRESS_WORDS[w.press].done}`
    : phase === 'dusk'
      ? 'no assigned post · may choose an open post'
      : 'not posted';
  if (!w.posted && phase === 'dusk' && !w.post) return posted;
  const stands = w.post ? `on the ${sectionName(postSection(w.post))}` : awayWords(w.place, phase);
  if (w.post && w.post === w.posted) return `${posted} · there now`;
  return `${posted} · ${stands}`;
}

export function GoalPage({
  frame,
  actions,
  shelf,
  current,
  onContinue,
  onNew,
}: {
  frame: Frame;
  actions: WatchActions;
  shelf: PageInfo[];
  current: string;
  onContinue?: () => void;
  onNew?: () => void;
}) {
  const saved = shelf.find((p) => p.kind === 'auto' && (onContinue || p.chronicle !== current));
  const [sheet, setSheet] = useState<'hopes' | 'shelf' | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState('');
  const resume = async () => {
    if (onContinue) onContinue();
    else if (saved && !(await actions.load(saved.id)))
      setNote('That page could not be read. You can begin a new village.');
  };
  const begin = () => (onNew ? onNew() : actions.input({ k: 'start' }));
  return (
    <div className="w-page w-goal">
      <h2>Bring every soul and the granary to the thaw.</h2>
      <Sacks have={frame.grain} lost={0} label="The granary is full" />
      <button type="button" className="w-menu-row" onClick={() => setSheet('hopes')}>
        The village’s hopes: “
        {frame.winterSetting?.next === 'milder'
          ? 'Let the winter go easier.'
          : 'Take the winter as it comes.'}
        ” ▸
      </button>
      {shelf.length ? (
        <button type="button" className="w-menu-row" onClick={() => setSheet('shelf')}>
          The shelf · {new Set(shelf.map((p) => p.chronicle)).size} chronicles ▸
        </button>
      ) : null}
      {note ? <p className="w-soft-fail">{note}</p> : null}
      <PageActions>
        {saved || onContinue ? (
          <>
            <button type="button" className="w-primary" onClick={resume}>
              Continue the chronicle
            </button>
            <small>{saved ? `${yearWords(saved.year)}, ${pageWhen(saved.when)}` : frame.date}</small>
            {confirm ? (
              <>
                <p>This chronicle stays on the shelf.</p>
                <button type="button" className="w-secondary" onClick={begin}>
                  Yes, begin
                </button>
                <button type="button" className="w-secondary" onClick={() => setConfirm(false)}>
                  No
                </button>
              </>
            ) : (
              <button type="button" className="w-secondary" onClick={() => setConfirm(true)}>
                Begin a new village
              </button>
            )}
          </>
        ) : (
          <button type="button" className="w-primary" onClick={begin}>
            Go up to the wall
          </button>
        )}
      </PageActions>
      {sheet === 'hopes' ? (
        <HopesSheet frame={frame} actions={actions} onClose={() => setSheet(null)} />
      ) : sheet === 'shelf' ? (
        <Shelf
          shelf={shelf}
          current={current}
          actions={actions}
          onClose={() => setSheet(null)}
          onLoaded={onContinue}
        />
      ) : null}
    </div>
  );
}

export function DuskPanel({
  frame,
  actions,
  selected,
  setSelected,
  press,
  setPress,
  post,
}: {
  frame: Frame;
  actions: WatchActions;
  selected: WatcherId | null;
  setSelected: (w: WatcherId | null) => void;
  press: Press;
  setPress: (p: Press) => void;
  post: (who: WatcherId, at: PostId | null) => void;
}) {
  const sel = frame.watchers.find((w) => w.id === selected);
  const reads = selected ? frame.postingReads?.[selected] : undefined;
  const [picker, setPicker] = useState(false);
  return (
    <div className="w-dusk">
      <header className="lk-sheet-head w-dusk-head">
        {sel ? (
          <>
            <button type="button" className="w-chip w-order-back" onClick={() => setSelected(null)}>
              ← {sel.name}
            </button>
            <p className="w-note">
              {sel.note} · {whereWords(sel, frame.phase)}
            </p>
            <fieldset className="w-presses">
              <legend className="sr-only">How hard do you press {sel.name}?</legend>
              {PRESSES.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="w-press"
                  aria-pressed={press === p}
                  onClick={() => {
                    setPress(p);
                    if (sel.posted) actions.input({ k: 'post', watcher: sel.id, post: sel.posted, press: p });
                  }}
                >
                  {PRESS_WORDS[p].verb}
                </button>
              ))}
            </fieldset>
            {reads ? <p className="w-posting-read">{reads[press]}</p> : null}
          </>
        ) : (
          <>
            <button
              type="button"
              className="w-chip"
              aria-haspopup="dialog"
              aria-expanded={picker}
              onClick={() => setPicker(!picker)}
            >
              🏮 Starts at {SECTIONS[frame.lantern.target]?.name} ▾
            </button>
            {picker ? (
              <div className="w-lantern-picker" role="dialog" aria-label="Starting lantern">
                {SECTIONS.map((section, i) => (
                  <button
                    key={section.id}
                    type="button"
                    className="w-chip"
                    disabled={frame.sections[i]?.fallen}
                    onClick={() => {
                      actions.input({ k: 'lantern', section: section.id });
                      setPicker(false);
                    }}
                  >
                    {section.name}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}
      </header>
      <div className="lk-sheet-body">
        {frame.grainWarning ? <p className="w-grain-warning">{frame.grainWarning}</p> : null}
        {!sel && frame.winter && frame.winter.night <= 2 ? (
          <p className="w-winter-q">{frame.winter.question?.text}</p>
        ) : null}
        {!sel && frame.day?.lines.length ? (
          <details className="w-day" open={frame.day.lines.some((l) => l.came)}>
            <summary>Today ▸</summary>
            <ul>
              {frame.day.lines.map((l) => (
                <li key={l.text}>{l.text}</li>
              ))}
            </ul>
          </details>
        ) : null}
        {sel ? (
          <Impressions impressions={sel.impressions} />
        ) : (
          <ul className="w-roster">
            {frame.watchers.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  className={`w-person w-person-${w.id}`}
                  onClick={() => setSelected(w.id)}
                >
                  <span className="w-person-head">
                    <strong>{w.name}</strong>
                    <span>{w.note}</span>
                  </span>
                  <span className="w-person-post">{whereWords(w, frame.phase)}</span>
                  <Impressions impressions={w.impressions} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <footer className="lk-commit">
        {sel ? (
          <>
            <p className="w-post-caption">Post {sel.name} at</p>
            <div className="w-places">
              {SECTIONS.map((section) => {
                const at = freePost(frame, section.id, sel.id);
                const sec = frame.sections.find((x) => x.id === section.id);
                const reason = at
                  ? null
                  : sec?.fallen
                    ? 'fallen'
                    : sec?.posts.length
                      ? 'full'
                      : 'closed tonight';
                return (
                  <button
                    key={section.id}
                    type="button"
                    className="w-place"
                    disabled={!at}
                    aria-pressed={sel.posted !== null && postSection(sel.posted) === section.id}
                    onClick={() => {
                      if (at) post(sel.id, at);
                    }}
                  >
                    {section.name}
                    {section.id === frame.warned ? ' · tracks' : null}
                    {reason ? <small>{reason}</small> : null}
                  </button>
                );
              })}
            </div>
            <div className="w-post-bottom">
              <button type="button" className="w-secondary" onClick={() => post(sel.id, null)}>
                {sel.name} chooses (still on watch)
              </button>
              <button type="button" className="w-primary" onClick={() => setSelected(null)}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <button type="button" className="w-primary" onClick={() => actions.input({ k: 'begin' })}>
              Begin the watch
            </button>
            <p className="w-note">Tap a watcher to post them.</p>
          </>
        )}
      </footer>
    </div>
  );
}

function MomentCard({
  m,
  seconds,
  actions,
  onLet,
}: {
  m: Moment;
  seconds: number | null;
  actions: WatchActions;
  onLet: () => void;
}) {
  return (
    <section className="w-moment" aria-label="A moment on the wall">
      <p className="w-moment-text">{m.text}</p>
      <progress className="w-decision-bar" max={120} value={seconds ?? 120} aria-label="Time to decide" />
      <div className="w-moment-options">
        {m.options.map((o) => (
          <button
            key={o.id}
            type="button"
            className="w-option"
            onClick={() => actions.input({ k: 'answer', id: m.id, choice: o.id })}
          >
            <span>{o.label}</span>
            {o.read ? <small>{o.read}</small> : null}
          </button>
        ))}
      </div>
      <button type="button" className="w-moment-let" onClick={onLet}>
        …or say nothing: they decide alone
      </button>
    </section>
  );
}

export function NightPanel({
  frame,
  actions,
  selected = null,
  onClose,
  onSelect,
  onHelper,
}: {
  frame: Frame;
  actions: WatchActions;
  selected?: WatcherId | null;
  onClose?: () => void;
  onSelect?: (id: WatcherId) => void;
  onHelper?: (open: boolean) => void;
}) {
  const who = frame.watchers.find((w) => w.id === selected);
  const body = useRef<HTMLDivElement>(null);
  const momentId = frame.moment?.id;
  useEffect(() => {
    if ((momentId !== undefined || selected) && body.current) body.current.scrollTop = 0;
  }, [momentId, selected]);
  const [dismissedMoment, setDismissedMoment] = useState<number | null>(null);
  const walking = frame.lit === null;
  const off = frame.watchers.filter((w) => w.post === null);
  // The bell answers a pull: the button rings for a moment when the rope wears.
  const wear = frame.rope.wear;
  const lastWear = useRef(wear);
  const [ringing, setRinging] = useState(0);
  useEffect(() => {
    if (wear > lastWear.current) setRinging((n) => n + 1);
    lastWear.current = wear;
  }, [wear]);
  return (
    <div className="w-night">
      <div className="lk-sheet-body" ref={body} hidden={Boolean(who?.account)}>
        {frame.moment && frame.moment.id !== dismissedMoment ? (
          <NightMoment
            frame={frame}
            actions={actions}
            dismissed={dismissedMoment}
            onDismiss={setDismissedMoment}
          />
        ) : (
          <>
            {off.length ? (
              <p className="w-offwall">
                Off the wall: {off.map((w) => `${w.name} (${awayWords(w.place, frame.phase)})`).join(', ')}
              </p>
            ) : null}
            <fieldset className="w-night-roster" aria-label="Hear a watcher">
              {frame.watchers.map((w) => (
                <button
                  type="button"
                  className={`w-chip w-person-${w.id}`}
                  key={w.id}
                  aria-pressed={selected === w.id}
                  onClick={() => onSelect?.(w.id)}
                >
                  {w.name}{' '}
                  <span
                    role="img"
                    aria-label={
                      w.post === null
                        ? 'off the wall'
                        : w.posture === 'doze'
                          ? 'dozing'
                          : w.limp
                            ? 'hurt'
                            : 'on post'
                    }
                  >
                    {w.post === null ? '◌' : w.posture === 'doze' ? '◐' : w.limp ? '✚' : '●'}
                  </span>
                </button>
              ))}
            </fieldset>
          </>
        )}
      </div>
      {who?.account ? (
        <NightAccount
          key={who.id}
          who={who}
          frame={frame}
          actions={actions}
          onClose={onClose}
          onHelper={onHelper}
        />
      ) : (
        <footer className="lk-commit w-night-commit">
          <fieldset
            className={`w-lantern-track${walking ? ' is-walking' : ''}`}
            aria-label="Move the lantern"
          >
            {SECTIONS.map((section, i) => (
              <button
                key={section.id}
                type="button"
                aria-pressed={frame.lantern.target === i}
                disabled={frame.sections[i]?.fallen}
                onClick={() => actions.input({ k: 'lantern', section: section.id })}
              >
                {frame.lantern.target === i ? (
                  <span role="img" className="w-lantern-icon" aria-label={walking ? 'walking' : 'lantern'}>
                    🏮
                  </span>
                ) : null}
                {section.name.replace(' wall', '')}
              </button>
            ))}
          </fieldset>
          <button
            type="button"
            className={`w-bellbtn${ringing === 0 ? '' : ringing % 2 ? ' is-ring-a' : ' is-ring-b'}`}
            aria-label={`${frame.bellSwinging ? 'Bell swinging' : 'Ring the bell'}. ${frame.bellRead ?? ''}. ${ropeWords(frame.rope.wear, frame.rope.snapped)}`}
            disabled={frame.rope.snapped || frame.bellSwinging}
            onClick={() => actions.input({ k: 'bell' })}
          >
            <span>
              <Icon name="bell" size={20} />
              {frame.bellSwinging ? 'Bell swinging' : 'Ring the bell'}
            </span>
            <small>{frame.bellRead ?? 'Calls watchers who hear it'}</small>
            <Rope wear={frame.rope.wear} snapped={frame.rope.snapped} />
          </button>
        </footer>
      )}
    </div>
  );
}

/** Helper choice replaces the account. An option never vanishes silently during this visit. */
function NightAccount({
  who,
  frame,
  actions,
  onClose,
  onHelper,
}: {
  who: FrameWatcher;
  frame: Frame;
  actions: WatchActions;
  onClose?: () => void;
  onHelper?: (open: boolean) => void;
}) {
  const [choice, setChoice] = useState<'relieve' | 'help' | null>(null);
  useEffect(() => {
    onHelper?.(choice !== null);
    actions.readingSlow?.(choice !== null);
    return () => {
      onHelper?.(false);
      actions.readingSlow?.(false);
    };
  }, [choice, onHelper, actions]);
  const [seenActs, setSeenActs] = useState(who.acts);
  const body = useRef<HTMLDivElement>(null);
  const focus = useRef<HTMLButtonElement>(null);
  const key = nightActKey;
  const seen = new Set(seenActs.map(key));
  const added = who.acts.filter((act) => !seen.has(key(act)));
  if (added.length) setSeenActs([...seenActs, ...added]);
  const acts = retainedNightActs(frame, who, seenActs);
  const down = acts.find((act) => act.input.k === 'down');
  const downLabel = down?.label.includes('hall') ? 'Send down' : 'Rest';
  const candidates = acts.filter((act) => act.input.k === choice);
  const available = candidates.filter((act) => act.available && !/isn.t on offer/i.test(act.read));
  const unavailable = candidates.filter((act) => !available.includes(act));
  const unavailableReasons = groupedUnavailable(unavailable, frame);
  const recentDoze = frame.alerts.findLast(
    (alert) => alert.who === who.id && alert.text.includes('nods off'),
  );
  // Off-wall people have no helper sheet, including after a live handover.
  const showingChoice = who.post !== null ? choice : null;
  const helperName = (act: FrameWatcher['acts'][number]) =>
    act.input.k === 'down' ? who.name : nameIn(frame, act.input.by);
  useEffect(() => {
    if (body.current) body.current.scrollTop = 0;
    // Both sheets have a Back control; focus follows the sheet being shown.
    if (choice !== undefined) focus.current?.focus();
  }, [choice]);
  useEffect(() => {
    if (!choice) return;
    const back = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector(':popover-open')) return;
      event.stopImmediatePropagation();
      setChoice(null);
    };
    window.addEventListener('keydown', back, true);
    return () => window.removeEventListener('keydown', back, true);
  }, [choice]);
  const dispatch = (act: FrameWatcher['acts'][number]) => {
    actions.input(act.input);
    setChoice(null);
  };
  return (
    <>
      {showingChoice ? (
        <header className="lk-sheet-head w-helper-head">
          <button type="button" className="w-chip" ref={focus} onClick={() => setChoice(null)}>
            ← {who.name}
          </button>
          <p className="w-voice-who">
            {choice === 'relieve' ? 'Send relief' : 'Send help'} for {who.name}
          </p>
        </header>
      ) : null}
      {!showingChoice ? (
        <header className="lk-sheet-head">
          <button type="button" className="w-chip w-account-close" ref={focus} onClick={onClose}>
            ← {who.name} · {whereWords(who, frame.phase)}
          </button>
        </header>
      ) : null}
      <div className="lk-sheet-body" ref={body}>
        {showingChoice ? (
          <section
            className="w-helper-choice"
            aria-label={`Send ${choice === 'relieve' ? 'relief' : 'help'} for ${who.name}`}
          >
            {unavailableReasons.map((reason) => (
              <p className="w-note" key={reason}>
                {reason}
              </p>
            ))}
            <ul className="w-night-acts">
              {available.map((act) => (
                <li key={key(act)}>
                  <p className="w-night-act-read">
                    {helperName(act)}: {act.read}
                  </p>
                  <button type="button" className="w-night-act" onClick={() => dispatch(act)}>
                    {act.label}
                  </button>
                </li>
              ))}
            </ul>
            {!candidates.length ? <p>No helper is available here.</p> : null}
          </section>
        ) : (
          <section className="w-account" aria-label={`${who.name} on watch`}>
            {who.account?.spoken ? <blockquote>{who.account.text}</blockquote> : <p>{who.account?.text}</p>}
            {recentDoze ? (
              <p className="w-note w-account-doze">
                Last heard: “{recentDoze.text}”{who.account?.spoken ? ' They can answer now.' : ''}
              </p>
            ) : null}
            {who.restRead ? <p className="w-note">Keeper’s read: {who.restRead}.</p> : null}
          </section>
        )}
      </div>
      {!showingChoice ? (
        <footer className="lk-commit w-account-commit">
          {!acts.length ? <p className="w-note w-account-unavailable">{who.actsUnavailable}</p> : null}
          {down ? (
            <>
              <p className="w-note">{down.read}</p>
              <button
                type="button"
                className="w-night-act"
                disabled={!down.available}
                onClick={() => dispatch(down)}
              >
                {downLabel}
              </button>
            </>
          ) : null}
          <div className="w-helper-controls">
            {(['relieve', 'help'] as const)
              .filter((kind) => acts.some((act) => act.input.k === kind))
              .map((kind) => (
                <button key={kind} type="button" className="w-chip" onClick={() => setChoice(kind)}>
                  {kind === 'relieve' ? 'Send relief' : 'Send help'}
                </button>
              ))}
          </div>
          {!down && acts.length > 0 && acts.every((act) => !act.available) ? (
            <p className="w-note w-account-unavailable">{acts[0]?.read}</p>
          ) : null}
          <p className="w-note">The watch continues. Each request is theirs to answer.</p>
          {frame.moment ? (
            <button type="button" className="w-decision-banner" onClick={onClose}>
              {nameIn(frame, frame.moment.who)} is deciding ▸
            </button>
          ) : null}
        </footer>
      ) : null}
    </>
  );
}

/** A decision occupies the sheet body; the scene and the action row keep their own space. */
function NightMoment({
  frame,
  actions,
  dismissed,
  onDismiss,
}: {
  frame: Frame;
  actions: WatchActions;
  dismissed: number | null;
  onDismiss: (id: number) => void;
}) {
  const m = frame.moment;
  if (!m || m.id === dismissed) return null;
  return (
    <MomentCard
      key={m.id}
      m={m}
      seconds={frame.decisionSeconds}
      actions={actions}
      onLet={() => onDismiss(m.id)}
    />
  );
}

/** The body ask, in the words a Keeper would use for this person. */
function bodyAsk(w: FrameWatcher | undefined): string {
  if (w?.limp) return 'How is the leg?';
  if (w?.age === 'old') return 'How are the knees?';
  return 'How are you holding up?';
}

/** A talk topic as the Keeper would put it to this person. */
function askWords(topic: Topic, w: FrameWatcher | undefined): string {
  if (topic === 'body') return bodyAsk(w);
  if (topic === 'home') return 'How are things at home?';
  if (topic === 'gate') return 'Would you keep the Gate one day?';
  return 'Tell me about last night';
}

/** Talks at dawn: a little daylight, spent one talk at a time, against the watchers' sleep. */
function Talks({ frame, actions }: { frame: Frame; actions: WatchActions }) {
  const t = frame.talks;
  const [picked, setPicked] = useState<WatcherId | null>(null);
  if (!t) return null;
  const chosen = t.can.includes(picked as WatcherId) ? picked : t.can[0];
  return (
    <section className="w-talks" aria-label="Talks before they sleep">
      <div className="w-talks-head">
        <h3>Before they sleep</h3>
        <Pips left={t.left} of={Math.max(TALKS_PER_DAY, t.left)} label={daylightWords(t.left)} />
      </div>
      <p className="w-note">{daylightWords(t.left)} Each talk costs them a little sleep.</p>
      {t.said.length > 0 ? (
        <ul className="w-voices">
          {t.said.slice(-1).map((x) => (
            <li key={`${x.who}-${x.topic}`}>
              <blockquote>{x.text}</blockquote>
              <span className="w-voice-who">{x.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {t.said.length > 1 ? (
        <details className="w-earlier">
          <summary>Earlier this morning ▸</summary>
          <ul className="w-voices">
            {t.said.slice(0, -1).map((x) => (
              <li key={`${x.who}-${x.topic}`}>
                <blockquote>{x.text}</blockquote>
                <span>{x.name}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {t.left > 0 && t.can.length > 0 ? (
        <ul className="w-asks">
          <li className="w-talk-person">
            <fieldset className="w-talk-chips" aria-label="Speak with">
              {t.can.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="w-chip"
                  aria-pressed={chosen === id}
                  onClick={() => setPicked(id)}
                >
                  {nameIn(frame, id)}
                </button>
              ))}
            </fieldset>
          </li>
          {t.can
            .filter((id) => id === chosen)
            .map((id) => {
              const w = frame.watchers.find((x) => x.id === id);
              return (
                <li key={id}>
                  <span className="w-ask-btns">
                    {(t.topics[id] ?? ['night', 'body']).slice(0, 2).map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        className="w-chip"
                        onClick={() => actions.input({ k: 'talk', who: id, topic })}
                      >
                        {askWords(topic, w)}
                      </button>
                    ))}
                  </span>
                </li>
              );
            })}
        </ul>
      ) : null}
    </section>
  );
}

export function DawnPanel({ frame, actions }: { frame: Frame; actions: WatchActions }) {
  const [account, setAccount] = useState(false);
  const d = frame.dawn;
  if (!d) return null;
  const last = frame.winter !== null && frame.winter.night >= frame.winter.nights;
  return (
    <div className="w-page w-dawn">
      <h2 className="w-dawn-outcome">{dawnOutcome(d)}</h2>
      {(frame.talks?.said.length ? [] : d.voices.slice(-1)).map((v) => (
        <blockquote className="w-dawn-heard" key={`${v.who}-${v.text}`}>
          {v.text} <cite>{nameIn(frame, v.who)}</cite>
        </blockquote>
      ))}
      <button type="button" className="w-secondary" onClick={() => setAccount(true)}>
        The night's account
      </button>
      <Talks frame={frame} actions={actions} />
      {d.scout ? <p className="w-scoutline">{d.scout}</p> : null}
      {frame.grainWarning ? <p className="w-grain-warning">{frame.grainWarning}</p> : null}

      {account ? (
        <div className="w-overlay">
          <section className="w-sub-sheet" role="dialog" aria-label="The night's account">
            <header>
              <h2>The night's account</h2>
              <button type="button" onClick={() => setAccount(false)}>
                ← Back
              </button>
            </header>
            <div className="w-sheet-body">
              <ul className="w-dawnlines">
                {d.lines.map((l) => (
                  <li key={l.section}>{l.text}</li>
                ))}
              </ul>
              {d.voices.length > 0 ? (
                <ul className="w-voices">
                  {d.voices.map((v) => (
                    <li key={`${v.who}-${v.text}`}>
                      <blockquote>{v.text}</blockquote>
                      <span className="w-voice-who">{nameIn(frame, v.who)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Sacks
                have={d.grainAfter}
                lost={d.grainBefore - d.grainAfter}
                need={frame.need}
                label={`${d.grainAfter === d.grainBefore ? 'No sacks lost' : 'Sacks lost in the night, drawn faded'}; the mark is what the village eats until the harvest`}
              />
              {d.ropeSnapped ? (
                <p className="w-note">Someone will have to splice the bell rope today; it will not be new.</p>
              ) : null}
              {last ? (
                <p className="w-note">
                  That was the last night watched this winter; the rest goes by routine.
                </p>
              ) : null}
            </div>
            <footer className="w-sheet-actions">
              <button type="button" className="w-primary" onClick={() => setAccount(false)}>
                Done
              </button>
            </footer>
          </section>
        </div>
      ) : null}
      <PageActions>
        <button type="button" className="w-primary" onClick={() => actions.input({ k: 'toDusk' })}>
          {last ? 'Into the thaw' : 'On to dusk'}
        </button>
      </PageActions>
    </div>
  );
}
