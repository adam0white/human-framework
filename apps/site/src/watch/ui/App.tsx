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
import { useEffect, useRef, useState } from 'react';
import { FullscreenButton, useWakeLock } from '../../shared/fullscreen.tsx';
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
import {
  ChronicleStrip,
  ClosedPage,
  FairPage,
  FallenPage,
  SeasonPanel,
  ThawPage,
  yearWords,
} from './pages.tsx';
import { Impressions, Pips, Rope, Sacks } from './parts.tsx';
import { useWatch, type WatchActions } from './useWatch.ts';
import { awayWords, daylightWords, hourWords, PRESS_WORDS, pageWhen, ropeWords } from './words.ts';

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

function slowedWords(f: Frame): string {
  if (SEASON_PHASES.has(f.phase)) return 'the days slow';
  return 'the night slows';
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
  /** The press picked for the selected watcher before a post is tapped; null follows their current press. */
  const [pressPick, setPressPick] = useState<Press | null>(null);
  const [menu, setMenu] = useState(false);
  const panel = useRef<HTMLElement | null>(null);

  const setSelected = (w: WatcherId | null) => {
    setSelectedState(w);
    setPressPick(null);
  };

  useEffect(() => {
    actions.hold(menu);
  }, [menu, actions]);

  const phase = frame?.phase;
  useEffect(() => {
    if (phase !== 'dusk' && phase !== 'goal') {
      setSelectedState(null);
      setPressPick(null);
    }
  }, [phase]);

  // A new card goes to the top of the panel, where the player will see it even after scrolling.
  const momentId = frame?.moment?.id;
  useEffect(() => {
    if (momentId !== undefined && panel.current) panel.current.scrollTop = 0;
  }, [momentId]);

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

  const pressFor = (who: WatcherId): Press =>
    pressPick ?? frame.watchers.find((w) => w.id === who)?.press ?? 'ask';
  const post = (who: WatcherId, at: PostId | null) => {
    actions.input({ k: 'post', watcher: who, post: at, press: pressFor(who) });
    setSelected(null);
  };

  const onHit = (hit: Hit) => {
    if (!hit) return;
    if (frame.phase === 'night') {
      const section = hit.kind === 'section' ? hit.section : postSection(hit.post as PostId);
      actions.input({ k: 'lantern', section });
      return;
    }
    if (frame.phase !== 'dusk') return;
    if (hit.kind === 'post') {
      const p = frame.sections.flatMap((s) => s.posts).find((x) => x.id === hit.post);
      const occupant = p?.posted ?? p?.watcher ?? null;
      if (selected) post(selected, hit.post as PostId);
      else if (occupant) setSelected(occupant);
      return;
    }
    if (selected) {
      const at = freePost(frame, hit.section, selected);
      if (at) post(selected, at);
    }
  };

  return (
    <div className={`watch phase-${frame.phase}${frame.slowed ? ' is-slowed' : ''}`}>
      <header className="w-top">
        <a className="w-home" href="/" aria-label="Human Framework home">
          HF
        </a>
        <div className="w-title">
          <h1>The Night Watch</h1>
          <p>
            {headerLine(frame)}
            {frame.slowed ? <span className="w-slowed"> · {slowedWords(frame)}</span> : null}
          </p>
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
          aria-label="Chronicle"
          aria-expanded={menu}
          onClick={() => setMenu((m) => !m)}
        >
          <Icon name="book-open" size={18} />
          <span>Chronicle</span>
        </button>
        <FullscreenButton className="w-fs" />
      </header>

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

      <main className="w-stage">
        <div className="w-mapwrap">
          <MapCanvas frame={frame} selected={selected} onHit={onHit} />
          {SEASON_PHASES.has(frame.phase) || frame.phase === 'fair' ? (
            <ChronicleStrip frame={frame} />
          ) : (
            <Ticker frame={frame} />
          )}
        </div>
        <section
          className="w-panel"
          aria-live={SEASON_PHASES.has(frame.phase) ? 'off' : 'polite'}
          // One key for the open seasons, so the people list keeps its fold across spring, summer and autumn.
          key={SEASON_PHASES.has(frame.phase) ? 'season' : frame.phase}
          ref={panel}
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
              press={selected ? pressFor(selected) : 'ask'}
              setPress={setPressPick}
              post={post}
            />
          ) : null}
          {frame.phase === 'night' ? <NightPanel frame={frame} actions={actions} /> : null}
          {frame.phase === 'dawn' ? <DawnPanel frame={frame} actions={actions} /> : null}
          {frame.phase === 'fallen' ? <FallenPage frame={frame} actions={actions} seed={seed} /> : null}
          {SEASON_PHASES.has(frame.phase) ? <SeasonPanel frame={frame} actions={actions} /> : null}
          {frame.phase === 'fair' ? <FairPage frame={frame} actions={actions} /> : null}
          {frame.phase === 'thaw' ? <ThawPage frame={frame} actions={actions} /> : null}
          {frame.phase === 'closed' ? <ClosedPage frame={frame} actions={actions} /> : null}
        </section>
      </main>
    </div>
  );
}

function Ticker({ frame }: { frame: Frame }) {
  if (frame.phase === 'dusk') {
    return (
      <ol className="w-ticker" aria-hidden="true">
        <li className="w-alert is-moment">{frame.warning}</li>
      </ol>
    );
  }
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
      ? 'not posted · will find a spot on the wall'
      : 'not posted';
  if (!w.posted && phase === 'dusk' && !w.post) return posted;
  const stands = w.post ? `on the ${sectionName(postSection(w.post))}` : awayWords(w.place, phase);
  if (w.post && w.post === w.posted) return `${posted} · there now`;
  return `${posted} · ${stands}`;
}

function GoalPage({
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
      <p className="w-kicker">The chronicle opens</p>
      <h2>Bring every soul and the granary to the thaw.</h2>
      <p>
        You are the Keeper. At dusk the scout tells you what is coming; you post the watchers. At night you
        carry the lantern to one stretch of wall, and only there can you see what comes. Ring the bell when
        you must: every pull wears its rope, and a snapped rope leaves the bell silent.
      </p>
      <p className="w-note">
        The watchers are people. Tired, frightened or worried for home, they may not stand where you put them.
        Ask leaves it to them; urge leans on them; insist can get them there under protest, and wins you no
        goodwill when it goes well.
      </p>
      <Sacks have={frame.grain} lost={0} label="The granary is full" />
      <button
        type="button"
        className={saved ? 'w-secondary' : 'w-primary'}
        onClick={() => actions.input({ k: 'start' })}
      >
        {saved ? 'Begin anew: go up to the wall' : 'Go up to the wall'}
      </button>
    </div>
  );
}

function DuskPanel({
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
  const posts = frame.sections.reduce((n, s) => n + s.posts.length, 0);
  const count = frame.watchers.length;
  return (
    <div className="w-dusk">
      <p className="w-warning">
        <Icon name="sunrise" size={18} /> {frame.warning}
      </p>
      {frame.winter ? <WinterNote frame={frame} /> : null}
      {frame.day && frame.day.lines.length > 0 ? (
        <details className="w-day">
          <summary>Today</summary>
          <ul>
            {frame.day.lines.map((l) => (
              <li key={`${l.who}-${l.text}`}>{l.text}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <p className="w-hint">
        {sel
          ? `Where should ${sel.name} stand? Tap a post on the wall or a stretch below.`
          : `Tap a watcher, then a post. ${count < posts ? 'There are more posts than watchers: some wall stands empty.' : 'Every post can be held.'}`}
      </p>
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
                {reads ? <small>{reads[p]}</small> : null}
              </button>
            ))}
          </fieldset>
          <div className="w-places">
            {SECTIONS.map((s) => {
              const at = freePost(frame, s.id, sel.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  className="w-place"
                  disabled={!at}
                  aria-pressed={sel.posted !== null && postSection(sel.posted) === s.id}
                  onClick={() => {
                    if (at) post(sel.id, at);
                  }}
                >
                  {s.name}
                  {s.id === frame.warned ? <span className="w-tracks"> · tracks</span> : null}
                </button>
              );
            })}
            <button type="button" className="w-place w-place-off" onClick={() => post(sel.id, null)}>
              Off the wall
            </button>
          </div>
        </div>
      ) : null}
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
      <button type="button" className="w-primary w-sticky" onClick={() => actions.input({ k: 'begin' })}>
        <Icon name="moon" size={18} /> Begin the watch
      </button>
      <p className="w-note">The sun is going down; the watch begins at nightfall on its own.</p>
    </div>
  );
}

function MomentCard({ m, actions, onLet }: { m: Moment; actions: WatchActions; onLet: () => void }) {
  return (
    <section className="w-moment" aria-label="A moment on the wall">
      <p className="w-moment-text">{m.text}</p>
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

function NightPanel({ frame, actions }: { frame: Frame; actions: WatchActions }) {
  const walking = frame.lit === null;
  const off = frame.watchers.filter((w) => w.post === null);
  // A card the Keeper let be is put away here; it runs out in the night on its own.
  const [letBe, setLetBe] = useState<number | null>(null);
  // The bell answers a pull: the button rings for a moment when the rope wears.
  const wear = frame.rope.wear;
  const lastWear = useRef(wear);
  const [ringing, setRinging] = useState(0);
  useEffect(() => {
    if (wear > lastWear.current) setRinging((n) => n + 1);
    lastWear.current = wear;
  }, [wear]);
  const m = frame.moment;
  return (
    <div className="w-night">
      {m && m.id !== letBe ? (
        <MomentCard key={m.id} m={m} actions={actions} onLet={() => setLetBe(m.id)} />
      ) : null}
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
          disabled={frame.rope.snapped}
          onClick={() => actions.input({ k: 'bell' })}
        >
          <Icon name="bell" size={20} />
          <span>{frame.roused ? 'Ring again: hold!' : 'Ring: hold your posts!'}</span>
        </button>
        <div className="w-ropebox">
          <span className="w-bellread">{frame.bellRead ?? '\u00a0'}</span>
          <Rope wear={frame.rope.wear} snapped={frame.rope.snapped} />
          <span className="w-ropewords">{ropeWords(frame.rope.wear, frame.rope.snapped)}</span>
        </div>
      </div>
      <p className="w-offwall">
        {off.length > 0 ? 'Off the wall: ' : 'Everyone is on the wall.'}
        {off.map((w, i) => (
          <span key={w.id}>
            {i > 0 ? ', ' : ''}
            {w.name} ({awayWords(w.place, frame.phase)})
          </span>
        ))}
      </p>
      <div className="w-granary">
        <span>The granary</span>
        <Sacks
          have={frame.grain}
          lost={Math.max(0, frame.grainAtDusk - frame.grain)}
          label={frame.grain < frame.grainAtDusk ? 'Sacks have been taken tonight' : 'No sacks taken tonight'}
        />
      </div>
    </div>
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
  if (!t) return null;
  return (
    <section className="w-talks" aria-label="Talks before they sleep">
      <div className="w-talks-head">
        <h3>Before they sleep</h3>
        <Pips left={t.left} of={Math.max(TALKS_PER_DAY, t.left)} label={daylightWords(t.left)} />
      </div>
      <p className="w-note">{daylightWords(t.left)} Each talk costs them a little sleep.</p>
      {t.said.length > 0 ? (
        <ul className="w-voices">
          {t.said.map((x) => (
            <li key={`${x.who}-${x.topic}`}>
              <blockquote>{x.text}</blockquote>
              <span className="w-voice-who">{x.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {t.left > 0 && t.can.length > 0 ? (
        <ul className="w-asks">
          {t.can.map((id) => {
            const w = frame.watchers.find((x) => x.id === id);
            return (
              <li key={id}>
                <span className="w-person-name">{w?.name ?? id}</span>
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
      <h2>{d.grainAfter === d.grainBefore && !d.crossed ? 'The wall held.' : 'The wall was crossed.'}</h2>
      {d.scout ? <p className="w-scoutline">{d.scout}</p> : null}
      {frame.grainWarning ? <p className="w-grain-warning">{frame.grainWarning}</p> : null}
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
        label={d.grainAfter === d.grainBefore ? 'No sacks lost' : 'Sacks lost in the night, drawn faded'}
      />
      {d.ropeSnapped ? (
        <p className="w-note">Someone will have to splice the bell rope today; it will not be new.</p>
      ) : null}
      <Talks frame={frame} actions={actions} />
      <button type="button" className="w-primary" onClick={() => actions.input({ k: 'toDusk' })}>
        {last ? 'Into the thaw' : 'On to dusk'}
      </button>
      {last ? (
        <p className="w-note">That was the last night watched this winter; the rest goes by routine.</p>
      ) : null}
    </div>
  );
}
