/**
 * The Night Watch shell: a top bar with the hour and the speeds, the map, and one panel that changes with the
 * phase (goal page, dusk posting, the night's lantern, cards and bell, the dawn page). The chronicle menu holds
 * the playtest export and a new village. Play shows no numbers: sacks, strands and words.
 *
 * G3-2: the watchers are people. The roster shows the Keeper's impressions of each (phrases whose sureness is
 * drawn as a soft bar, never printed), postings carry how hard he pressed (ask, urge, insist) with his read of
 * the answer, and the night panel opens a moment card when someone on the lit stretch wavers.
 *
 * G3-3: the whole year. One five-step speed control (Slow to Seasons) runs whenever the clock does; the open seasons
 * get their own panel (date, volume, granary, people, season cards) and the chronicle strip over the map; the fair,
 * the thaw, a closed volume and a fallen village are pages (`pages.tsx`). Dawn adds talks. The chronicle dialog is
 * the menu and the saves shelf (`chronicle.tsx`).
 */
import { phoneStage, telemetryNotice } from '@adam0white/lab-kit';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FullscreenButton, useWakeLock } from '../../shared/fullscreen.tsx';
import { Help } from '../../shared/Help.tsx';
import { gameLabs } from '../../shared/lab.tsx';
import type { PageInfo } from '../protocol.ts';
import { type PostId, postSection, SECTIONS, type SectionId, type WatcherId } from '../sim/config.ts';
import type { Moment } from '../sim/moments.ts';
import type { Speed } from '../sim/pace.ts';
import type { Press } from '../sim/state.ts';
import { TALKS_PER_DAY, type Topic } from '../sim/talk.ts';
import type { Frame, FrameWatcher } from '../sim/view.ts';
import { Chronicle } from './chronicle.tsx';
import { Icon, type IconName } from './icons.tsx';
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
import { PageCommitContext } from './SheetActions.tsx';
import { useWatch, type WatchActions } from './useWatch.ts';
import { WinterSetting } from './WinterSetting.tsx';
import {
  awayWords,
  clockRateWords,
  dawnOutcome,
  daylightWords,
  grainCondition,
  hourWords,
  PRESS_WORDS,
  pageWhen,
  ropeWords,
  thawProgress,
} from './words.ts';

const SPEEDS: { id: Speed; label: string; icon: IconName }[] = [
  { id: 'tactical', label: 'Slow', icon: 'snail' },
  { id: 'watch', label: 'Watch', icon: 'play' },
  { id: 'fast', label: 'Fast', icon: 'fast-forward' },
  { id: 'days', label: 'Days', icon: 'sun' },
  { id: 'seasons', label: 'Seasons', icon: 'calendar-days' },
];

const SEASON_PHASES = new Set<Frame['phase']>(['spring', 'summer', 'autumn']);
/** Phases where the clock runs and the speed control shows. */
const RUNNING = new Set<Frame['phase']>(['dusk', 'night', 'spring', 'summer', 'autumn']);
const WINTER_PHASES = new Set<Frame['phase']>(['dusk', 'night', 'dawn']);

/** The top bar's line: the date, and the hour on winter nights. */
function headerLine(f: Frame): string {
  if (f.phase === 'goal') return 'Before the first night';
  if (WINTER_PHASES.has(f.phase)) return `${f.date} · ${hourWords(f.clock, f.phase)}`;
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
            `.phase-dusk .w-person-${postingOrigin.current}, .w-night-details[open] .w-person-${postingOrigin.current}`,
          ) ?? document.querySelector<HTMLElement>('.w-night-details summary');
        origin?.focus();
      });
  }, []);

  useEffect(() => {
    if (selected) stage.current?.querySelector<HTMLButtonElement>('.w-order-back, .w-account-close')?.focus();
  }, [selected]);

  useEffect(() => {
    actions.hold(menu);
  }, [menu, actions]);

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
        actions.input({ k: 'post', watcher: selected, post: hit.post as PostId, press: 'ask' });
        setSelected(null);
      } else if (occupant) setSelected(occupant);
      return;
    }
    if (selected) {
      const at = freePost(frame, hit.section, selected);
      if (at) {
        actions.input({ k: 'post', watcher: selected, post: at, press: 'ask' });
        setSelected(null);
      }
    }
  };

  return (
    <div className={`watch phase-${frame.phase}${frame.slowed ? ' is-slowed' : ''}`}>
      <header className="w-top">
        <a className="w-home" href="/games/" aria-label="All games">
          All games
        </a>
        <div className="w-title">
          <h1>The Night Watch</h1>
          <p>{headerLine(frame)}</p>
        </div>

        {frame.phase !== 'goal' ? (
          <fieldset
            className={`w-speeds${frame.slowed ? ' is-slowed' : ''}${RUNNING.has(frame.phase) ? '' : ' is-idle'}`}
            title={RUNNING.has(frame.phase) ? undefined : 'The clock stands while you read this page.'}
          >
            <legend className="sr-only">Speed</legend>
            {SPEEDS.map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-speed"
                aria-label={s.label}
                aria-pressed={speed === s.id}
                onClick={() => actions.setSpeed(s.id)}
              >
                <Icon name={s.icon} size={16} />
                <span>{s.label}</span>
              </button>
            ))}
          </fieldset>
        ) : null}
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
          <Icon name="book-open" size={18} />
          <span>Game menu</span>
        </button>
        <FullscreenButton className="w-fs" />
        {frame.phase !== 'goal' ? <p className="w-clock-rate">{clockRateWords(frame, speed)}</p> : null}
      </header>

      <main
        className="w-stage lk-stage"
        ref={stage}
        data-sheet="fit"
        data-ordering={Boolean(selected)}
        data-menu={menu}
      >
        <WatchStrip frame={frame} selected={selected} />
        <div className="w-mapwrap lk-scene" inert={menu}>
          <MapCanvas frame={frame} selected={selected} onHit={onHit} />
          {SEASON_PHASES.has(frame.phase) || frame.phase === 'fair' ? (
            <ChronicleStrip frame={frame} />
          ) : (
            <Ticker frame={frame} />
          )}
        </div>
        <section
          className="w-panel lk-sheet"
          aria-label={frame.phase === 'dusk' ? 'Post the watchers' : 'The watch'}
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
            />
          ) : null}

          <PageCommitContext value={pageCommit}>
            <div
              hidden={menu}
              className={
                frame.phase === 'dusk' || frame.phase === 'night' ? 'w-panel-parts' : 'lk-sheet-body'
              }
            >
              {frame.phase === 'goal' ? (
                <GoalPage frame={frame} actions={actions} shelf={shelf} current={current} />
              ) : null}
              {frame.phase === 'dusk' ? (
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
              {frame.phase === 'night' ? (
                <NightPanel
                  frame={frame}
                  actions={actions}
                  selected={selected}
                  onClose={() => setSelected(null)}
                  onSelect={setSelected}
                />
              ) : null}
              {frame.phase === 'dawn' ? <DawnPanel frame={frame} actions={actions} /> : null}
              {frame.phase === 'fallen' ? (
                <FallenPage frame={frame} actions={actions} seed={seed} tally={true} />
              ) : null}
              {SEASON_PHASES.has(frame.phase) ? <SeasonPanel frame={frame} actions={actions} /> : null}
              {frame.phase === 'fair' ? <FairPage frame={frame} actions={actions} /> : null}
              {frame.phase === 'thaw' ? <ThawPage frame={frame} actions={actions} /> : null}
              {frame.phase === 'closed' ? <ClosedPage frame={frame} actions={actions} /> : null}
            </div>
          </PageCommitContext>
          <footer className="lk-commit w-page-commit" hidden={menu} ref={setPageCommit} />
        </section>
      </main>
    </div>
  );
}

export function WatchStrip({ frame, selected }: { frame: Frame; selected: WatcherId | null }) {
  const who = frame.watchers.find((w) => w.id === selected);
  return (
    <section className="w-state lk-strip" aria-label="Watch state">
      {frame.winter ? (
        <p className="w-watch-progress">
          {frame.date} · {hourWords(frame.clock, frame.phase)}
          {frame.winterSetting
            ? ` · ${frame.winterSetting.active === 'milder' ? 'Milder winter' : 'Hard winter'}`
            : ''}
        </p>
      ) : null}
      {frame.winter ? (
        <section className="w-goal-state" aria-label="To the thaw">
          <p>{thawProgress(frame)}</p>
          <p className="w-grain-condition">{grainCondition(frame)}</p>
          <p>{frame.souls.split(' in ')[0]} still here.</p>
        </section>
      ) : null}
      {frame.phase === 'dusk' ? <p className="w-state-warning">{frame.warning}</p> : null}
      {who ? (
        <div className="w-selected-state">
          <p>
            <strong>{who.name}</strong>
            {frame.phase === 'dusk' ? ` · ${who.note}` : ''}
          </p>
          <p className="w-person-post">{whereWords(who, frame.phase)}</p>
          {who.handover ? <p className="w-handover">{who.handover}</p> : null}
          {frame.phase === 'dusk' ? <Impressions impressions={who.impressions} /> : null}
        </div>
      ) : null}
    </section>
  );
}

function Ticker({ frame }: { frame: Frame }) {
  if (frame.phase === 'dusk') return null;
  if (frame.phase !== 'night') return null;
  const now = frame.nightProgress;
  const recent = frame.alerts.slice(-3);
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
}: {
  frame: Frame;
  actions: WatchActions;
  shelf: PageInfo[];
  current: string;
}) {
  // The shelf is newest first: the first running page of another chronicle is the one last kept.
  const saved = shelf.find((p) => p.kind === 'auto' && p.chronicle !== current) ?? null;
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const resume = async () => {
    if (!saved) return;
    setBusy(true);
    const ok = await actions.load(saved.id);
    setBusy(false);
    if (!ok)
      setNote(
        'That page could not be read; it may have been written by an older version of the game. You can begin anew.',
      );
  };
  return (
    <div className="w-page">
      {saved ? (
        <div className="w-resume">
          <button type="button" className="w-primary" disabled={busy} onClick={resume}>
            <Icon name="book-open" size={18} /> {busy ? 'Opening the chronicle…' : 'Continue the chronicle'}
          </button>
          <p className="w-note">
            The village of seed {saved.seed}, {yearWords(saved.year)}, {pageWhen(saved.when)}.
          </p>
          {note ? <p className="w-note w-soft-fail">{note}</p> : null}
          <p className="w-note">Or begin a new chronicle below.</p>
        </div>
      ) : null}
      <h2>Bring every soul and the granary to the thaw.</h2>
      <button
        type="button"
        className={saved ? 'w-secondary' : 'w-primary'}
        onClick={() => actions.input({ k: 'start' })}
      >
        {saved ? 'Begin anew: go up to the wall' : 'Go up to the wall'}
      </button>
      <Help title="Words for the winter ahead">
        <WinterSetting frame={frame} actions={actions} />
      </Help>
      <Help title="About keeping watch">
        <p>
          You are the Keeper. At dusk the scout tells you what is coming; you post the watchers. At night you
          carry the lantern to one stretch of wall, and only there can you see what comes. The bell hangs over
          the Gate and its rope runs the length of the wall-walk, so you can pull it from anywhere: it wakes
          and calls back everyone who hears it, loudest near the Gate. Your own voice carries only from your
          lantern to the next stretch. Every pull wears the rope, and a snapped rope leaves the bell silent.
        </p>
        <p className="w-note">
          The watchers are people. Tired, frightened or worried for home, they may not stand where you put
          them. Ask leaves it to them; urge leans on them; insist can get them there under protest, and wins
          you no goodwill when it goes well.
        </p>
      </Help>
      <Sacks have={frame.grain} lost={0} label="The granary is full" />
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
  const sel = selected ? frame.watchers.find((w) => w.id === selected) : undefined;
  const reads = selected ? frame.postingReads?.[selected] : undefined;
  return (
    <div className="w-dusk">
      {sel ? (
        <header className="lk-sheet-head">
          <button type="button" className="w-chip w-order-back" onClick={() => setSelected(null)}>
            Back to watchers
          </button>
          <p className="w-hint">Tap a scene post to ask.</p>
        </header>
      ) : null}
      <div className="lk-sheet-body">
        {!sel && (
          <>
            {frame.winter ? (
              <Help title="This winter">
                <WinterNote frame={frame} />
              </Help>
            ) : null}
            {frame.day && frame.day.lines.length > 0 ? (
              // Opened when someone arrived, so a new name on the roster is explained as it appears (owner's playtest).
              <details className="w-day" open={frame.day.lines.some((l) => l.came)}>
                <summary>Today</summary>
                <ul>
                  {frame.day.lines.map((l) => (
                    <li key={`${l.who}-${l.text}`}>{l.text}</li>
                  ))}
                </ul>
              </details>
            ) : null}
            <p className="w-hint">Tap a watcher, then a post.</p>
          </>
        )}
        {sel ? (
          <div className="w-postcard">
            <fieldset className="w-presses">
              <legend>
                How hard do you press {sel.name}?
                {reads ? null : <span className="w-note"> Pick a post to read them.</span>}
              </legend>
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
                  <span>{PRESS_WORDS[p].verb}</span>
                </button>
              ))}
            </fieldset>
            {reads ? (
              <p className="w-note w-posting-read" aria-live="polite">
                {reads[press]}
              </p>
            ) : null}
            <Help title="About asking and pressing">
              <p className="w-note">
                Ask leaves it to them; urge leans on them; insist can get them there under protest. Tired or
                frightened watchers may leave their post.
              </p>
            </Help>
          </div>
        ) : null}
        {!sel && (
          <ul className="w-roster">
            {frame.watchers.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  className={`w-person w-person-${w.id}`}
                  aria-pressed={selected === w.id}
                  onClick={() => setSelected(selected === w.id ? null : w.id)}
                >
                  <span className="w-person-head">
                    <span className="w-person-name">{w.name}</span>
                    <span className="w-person-note">{w.note}</span>
                  </span>
                  <span className="w-person-post">{whereWords(w, frame.phase)}</span>
                  <Impressions impressions={w.impressions} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {!sel && (
          <div className="w-lantern-pick">
            <span>Start the lantern at</span>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-chip"
                aria-pressed={frame.lantern.target === SECTIONS.indexOf(s)}
                disabled={frame.sections.find((x) => x.id === s.id)?.fallen === true}
                onClick={() => actions.input({ k: 'lantern', section: s.id })}
              >
                {s.name}
                {frame.sections.find((x) => x.id === s.id)?.fallen ? ' · fallen' : ''}
              </button>
            ))}
          </div>
        )}
      </div>
      <footer className="lk-commit">
        {sel ? (
          <div className="w-places">
            {SECTIONS.map((s) => {
              const at = freePost(frame, s.id, sel.id);
              const section = frame.sections.find((section) => section.id === s.id);
              const reason = !at
                ? section?.fallen
                  ? 'The wall has fallen.'
                  : section?.posts.length
                    ? 'Every post is assigned.'
                    : 'No post is open tonight.'
                : null;
              return (
                <div key={s.id} className="w-place-choice">
                  <button
                    type="button"
                    className="w-place"
                    aria-describedby={reason ? `post-unavailable-${s.id}` : undefined}
                    disabled={!at}
                    aria-pressed={sel.posted !== null && postSection(sel.posted) === s.id}
                    onClick={() => {
                      if (at) post(sel.id, at);
                    }}
                  >
                    {s.name}
                    {s.id === frame.warned ? <span className="w-tracks"> · tracks</span> : null}
                  </button>
                  {reason ? (
                    <p className="w-note w-post-unavailable" id={`post-unavailable-${s.id}`}>
                      {reason}
                    </p>
                  ) : null}
                </div>
              );
            })}
            <button type="button" className="w-place w-place-off" onClick={() => post(sel.id, null)}>
              Choose own post
            </button>
            <p className="w-note w-own-post-note">
              This does not give the night off. At night, ask them to go down to rest.
            </p>
          </div>
        ) : (
          <>
            <button type="button" className="w-primary" onClick={() => actions.input({ k: 'begin' })}>
              <Icon name="moon" size={18} /> Begin the watch
            </button>
            <p className="w-note">The sun is going down; the watch begins at nightfall on its own.</p>
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
      <p className="w-note w-decision-time">
        {seconds === null ? 'The clock is stopped.' : `About ${seconds} seconds; then they decide alone.`}
      </p>
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
}: {
  frame: Frame;
  actions: WatchActions;
  selected?: WatcherId | null;
  onClose?: () => void;
  onSelect?: (id: WatcherId) => void;
}) {
  const who = frame.watchers.find((w) => w.id === selected);
  const body = useRef<HTMLDivElement>(null);
  const momentId = frame.moment?.id;
  useEffect(() => {
    if ((momentId !== undefined || selected) && body.current) body.current.scrollTop = 0;
  }, [momentId, selected]);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [dismissedMoment, setDismissedMoment] = useState<number | null>(null);
  useEffect(() => {
    if (momentId !== undefined) setRosterOpen(false);
  }, [momentId]);
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
      {!who ? (
        <header className="lk-sheet-head w-watch-entry">
          <Help title="About watchers and the lantern">
            <p>Tap a watcher to ask for rest, help or to go down.</p>
            <p>Only the lantern’s stretch shows what approaches. Your voice reaches the next stretch.</p>
          </Help>
          <button
            type="button"
            className="w-chip"
            aria-expanded={rosterOpen}
            onClick={() => setRosterOpen((open) => !open)}
          >
            {rosterOpen ? 'Back to the watch' : 'Watchers'}
          </button>
        </header>
      ) : null}
      <div className="lk-sheet-body" ref={body} hidden={Boolean(who?.account)}>
        <div hidden={Boolean(who)}>
          {!rosterOpen ? (
            <NightMoment
              frame={frame}
              actions={actions}
              dismissed={dismissedMoment}
              onDismiss={setDismissedMoment}
            />
          ) : null}
        </div>
        <details
          className="w-about w-night-details"
          open={rosterOpen}
          onToggle={(event) => setRosterOpen(event.currentTarget.open)}
        >
          <summary>Watchers and bell</summary>
          <fieldset className="w-night-roster" aria-label="Hear a watcher">
            {frame.watchers.map((w) => (
              <button
                type="button"
                className={`w-chip w-person-${w.id}`}
                key={w.id}
                aria-pressed={selected === w.id}
                onClick={() => onSelect?.(w.id)}
              >
                {w.name}
              </button>
            ))}
          </fieldset>
          <p className="w-note" id="watch-bell-context">
            Pull from anywhere. Calls back watchers who hear it, loudest at the Gate. Every pull wears the
            rope; a snapped rope leaves it silent.
          </p>
          <p className="w-offwall">
            {off.length
              ? `Off the wall: ${off.map((w) => `${w.name} (${awayWords(w.place, frame.phase)})`).join(', ')}`
              : 'Everyone is on the wall.'}
          </p>
          {off.length ? (
            <p className="w-note">
              Posts are planned at dusk. Tap a watcher to ask for relief or help within your voice.
            </p>
          ) : null}
          <Sacks
            have={frame.grain}
            lost={Math.max(0, frame.grainAtDusk - frame.grain)}
            need={frame.need}
            label="The granary; the mark is what the village eats until the harvest"
          />
        </details>
      </div>
      {who?.account ? (
        <NightAccount key={who.id} who={who} frame={frame} actions={actions} onClose={onClose} />
      ) : (
        <footer className="lk-commit w-night-commit">
          <div className="w-lantern-pick">
            <span>
              <Icon name="lamp" size={16} /> {walking ? 'The lantern is on its way' : 'The lantern'}
              <span className="w-tap-hint"> · choose a stretch, or tap the wall</span>
            </span>
            {SECTIONS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className="w-chip"
                aria-pressed={frame.lantern.target === i}
                disabled={frame.sections[i]?.fallen === true}
                onClick={() => actions.input({ k: 'lantern', section: s.id })}
              >
                {s.name}
                {frame.sections[i]?.fallen ? ' · fallen' : ''}
              </button>
            ))}
          </div>
          <div className="w-bell">
            <button
              type="button"
              className={`w-bellbtn${ringing === 0 ? '' : ringing % 2 ? ' is-ring-a' : ' is-ring-b'}`}
              aria-describedby="watch-bell-context"
              disabled={frame.rope.snapped || frame.bellSwinging}
              onClick={() => actions.input({ k: 'bell' })}
            >
              <Icon name="bell" size={20} />
              <span>{frame.bellSwinging ? 'Bell swinging' : 'Ring the bell'}</span>
            </button>
            <div className="w-ropebox">
              <span className="w-bellread">{frame.bellRead ?? '\u00a0'}</span>
              <Rope wear={frame.rope.wear} snapped={frame.rope.snapped} />
              <span className="w-ropewords">{ropeWords(frame.rope.wear, frame.rope.snapped)}</span>
            </div>
          </div>
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
}: {
  who: FrameWatcher;
  frame: Frame;
  actions: WatchActions;
  onClose?: () => void;
}) {
  const [choice, setChoice] = useState<'relieve' | 'help' | null>(null);
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
            Back to {who.name}
          </button>
          <p className="w-voice-who">
            {choice === 'relieve' ? 'Send relief' : 'Send help'} for {who.name}
          </p>
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
            <button type="button" className="w-chip w-account-close" ref={focus} onClick={onClose}>
              Back to the wall
            </button>
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
          {frame.moment ? <p className="w-note">A watcher’s decision is still waiting.</p> : null}
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

/** The winter's reason and its question, briefly, at dusk. */
function WinterNote({ frame }: { frame: Frame }) {
  const w = frame.winter;
  if (!w) return null;
  return (
    <div className="w-winter">
      {frame.grainWarning ? <p className="w-grain-warning">{frame.grainWarning}</p> : null}
      {w.night <= 1 && w.why ? <p className="w-note">{w.why}</p> : null}
      {frame.year === 1 && w.night === 1 ? (
        <p className="w-note">More hands will come up to the wall over the first nights.</p>
      ) : null}
      {w.night <= 2 ? (
        // Owner's playtest: "why do we fight for each one?"
        <p className="w-note">
          The granary must feed {frame.souls.charAt(0).toLowerCase() + frame.souls.slice(1)} from the thaw to
          the harvest. Short of the mark, the spring is hungry and households leave; sacks past it are spare
          for the fair.
        </p>
      ) : null}
      {w.night <= 2 ? (
        <Sacks
          have={frame.grain}
          lost={0}
          need={frame.need}
          label="The granary, and the mark of what it must feed"
        />
      ) : null}
      {w.question ? (
        <p className="w-winter-q">
          <span className="w-kicker">This winter</span> {w.question.text}
        </p>
      ) : null}
    </div>
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
        <Help title="Earlier morning talks">
          <ul className="w-voices">
            {t.said.slice(0, -1).map((x) => (
              <li key={`${x.who}-${x.topic}`}>
                <blockquote>{x.text}</blockquote>
                <span>{x.name}</span>
              </li>
            ))}
          </ul>
        </Help>
      ) : null}
      {t.left > 0 && t.can.length > 0 ? (
        <ul className="w-asks">
          <li className="w-talk-person">
            <label>
              Speak with{' '}
              <select
                value={chosen ?? ''}
                onChange={(event) => setPicked(event.currentTarget.value as WatcherId)}
              >
                {t.can.map((id) => (
                  <option key={id} value={id}>
                    {nameIn(frame, id)}
                  </option>
                ))}
              </select>
            </label>
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

function DawnPanel({ frame, actions }: { frame: Frame; actions: WatchActions }) {
  const d = frame.dawn;
  if (!d) return null;
  const last = frame.winter !== null && frame.winter.night >= frame.winter.nights;
  return (
    <div className="w-page w-dawn">
      <p className="w-kicker">Dawn · {frame.date}</p>
      <h2 className="w-dawn-outcome">{dawnOutcome(d)}</h2>
      <WinterProgress frame={frame} />
      {(frame.talks?.said.length ? [] : d.voices.slice(-1)).map((v) => (
        <blockquote className="w-dawn-heard" key={`${v.who}-${v.text}`}>
          {v.text} <cite>{nameIn(frame, v.who)}</cite>
        </blockquote>
      ))}
      <Talks frame={frame} actions={actions} />
      {d.scout ? <p className="w-scoutline">{d.scout}</p> : null}
      {frame.grainWarning ? <p className="w-grain-warning">{frame.grainWarning}</p> : null}
      <Help title="The night’s account">
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
          <p className="w-note">That was the last night watched this winter; the rest goes by routine.</p>
        ) : null}
      </Help>
      <div className="w-dawn-continue">
        <button type="button" className="w-primary" onClick={() => actions.input({ k: 'toDusk' })}>
          {last ? 'Into the thaw' : 'On to dusk'}
        </button>
      </div>
    </div>
  );
}
