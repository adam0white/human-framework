/**
 * The Night Watch shell: a top bar with the hour and the speeds, the map, and one panel that changes with the
 * phase (goal page, dusk posting, the night's lantern, cards and bell, the dawn page). The chronicle menu holds
 * the playtest export and a new village. Play shows no numbers: sacks, strands and words.
 *
 * G3-2: the watchers are people. The roster shows the Keeper's impressions of each (phrases whose sureness is
 * drawn as a soft bar, never printed), postings carry how hard he pressed (ask, urge, insist) with his read of
 * the answer, and the night panel opens a moment card when someone on the lit stretch wavers.
 */
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { FullscreenButton, useWakeLock } from '../../shared/fullscreen.tsx';
import {
  type PostId,
  postSection,
  SECTIONS,
  type SectionId,
  WATCHERS,
  type WatcherId,
} from '../sim/config.ts';
import type { Moment } from '../sim/moments.ts';
import type { Speed } from '../sim/pace.ts';
import type { Press } from '../sim/state.ts';
import type { Frame, FrameWatcher } from '../sim/view.ts';
import { Icon, type IconName } from './icons.tsx';
import { MapCanvas } from './MapCanvas.tsx';
import type { Hit } from './map.ts';
import { useWatch, type WatchActions } from './useWatch.ts';
import { awayWords, hourWords, nightName, PRESS_WORDS, ropeWords } from './words.ts';

const SPEEDS: { id: Speed; label: string; icon: IconName }[] = [
  { id: 'tactical', label: 'Slow', icon: 'snail' },
  { id: 'watch', label: 'Watch', icon: 'play' },
  { id: 'fast', label: 'Fast', icon: 'fast-forward' },
];

const PRESSES: Press[] = ['ask', 'urge', 'insist'];

const nameOf = (id: WatcherId) => WATCHERS.find((w) => w.id === id)?.name ?? '';
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
  const { frame, speed, error, seed, actions } = useWatch();
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

  // Keep the screen awake only while the clock runs: dusk and night, chronicle closed.
  useWakeLock(frame !== null && (frame.phase === 'dusk' || frame.phase === 'night') && !menu);

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
            {nightName(frame.night)} · {hourWords(frame.clock, frame.phase)}
            {frame.slowed ? <span className="w-slowed"> · the night slows</span> : null}
          </p>
        </div>
        {frame.phase === 'night' ? (
          <fieldset className="w-speeds">
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

      {menu ? <Chronicle actions={actions} seed={seed} onClose={() => setMenu(false)} /> : null}

      <main className="w-stage">
        <div className="w-mapwrap">
          <MapCanvas frame={frame} selected={selected} onHit={onHit} />
          <Ticker frame={frame} />
        </div>
        <section className="w-panel" aria-live="polite" key={frame.phase} ref={panel}>
          {frame.phase === 'goal' ? <GoalPage frame={frame} actions={actions} /> : null}
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
          {frame.phase === 'dawn' || frame.phase === 'fallen' ? (
            <DawnPanel frame={frame} actions={actions} seed={seed} />
          ) : null}
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

/** 0..n-1 as plain values, so list keys are the sack's own number rather than a map index. */
function range(n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(i);
  return out;
}

function Sacks({ have, lost, label }: { have: number; lost: number; label: string }) {
  const total = have + lost;
  const perRow = 10;
  const rows = Math.max(1, Math.ceil(total / perRow));
  return (
    <svg
      className="w-sacks"
      viewBox={`0 0 ${perRow * 18 + 4} ${rows * 16 + 4}`}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {range(total).map((n) => {
        const x = 2 + (n % perRow) * 18 + 8;
        const y = 2 + Math.floor(n / perRow) * 16 + 8;
        const gone = n >= have;
        return (
          <g key={n} className={gone ? 'sack sack-gone' : 'sack'}>
            <ellipse cx={x} cy={y + 1} rx={7.5} ry={6.5} />
            <path d={`M${x - 3} ${y - 5} q3 -3 6 0`} />
          </g>
        );
      })}
    </svg>
  );
}

function Rope({ wear, snapped }: { wear: number; snapped: boolean }) {
  const strands = 6;
  const left = snapped ? 0 : Math.max(1, Math.round(strands * (1 - wear)));
  const label = ropeWords(wear, snapped);
  return (
    <svg className="w-rope" viewBox="0 0 120 24" role="img" aria-label={label}>
      <title>{label}</title>
      {range(strands).map((i) => {
        const y = 6 + i * 2.4;
        const whole = i < left;
        return whole ? (
          <path key={i} className="strand" d={`M4 ${y} C40 ${y - 3} 80 ${y + 3} 116 ${y}`} />
        ) : (
          <g key={i} className="strand strand-cut">
            <path d={`M4 ${y} C24 ${y - 2} 44 ${y + 1} ${54 - i * 2} ${y + 3}`} />
            <path d={`M${66 + i * 2} ${y + 3} C80 ${y + 2} 98 ${y - 1} 116 ${y}`} />
          </g>
        );
      })}
    </svg>
  );
}

/** The Keeper's impressions: each phrase is as solid as he is sure, with a soft bar that fades where he isn't. */
function Impressions({ w }: { w: FrameWatcher }) {
  return (
    // Spans, not a list: this sits inside the roster button.
    <span className="w-imps">
      {w.impressions.map((im) => (
        <span
          key={im.text}
          className={im.sure <= 0 ? 'w-imp is-unknown' : 'w-imp'}
          style={{ '--sure': im.sure } as CSSProperties}
        >
          {im.text}
        </span>
      ))}
    </span>
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

function GoalPage({ frame, actions }: { frame: Frame; actions: WatchActions }) {
  return (
    <div className="w-page">
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
      <button type="button" className="w-primary" onClick={() => actions.input({ k: 'start' })}>
        Go up to the wall
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
      {frame.day && frame.day.lines.length > 0 ? (
        <details className="w-day">
          <summary>Today</summary>
          <ul>
            {frame.day.lines.map((l) => (
              <li key={l.who}>{l.text}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <p className="w-hint">
        {sel
          ? `Where should ${sel.name} stand? Tap a post on the wall or a stretch below.`
          : `Tap a watcher, then a post. ${count === 1 ? 'One watcher' : `${count} watchers`}, ${posts} posts: some wall stands empty.`}
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
              <Impressions w={w} />
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
            onClick={() => actions.input({ k: 'lantern', section: s.id })}
          >
            {s.name}
          </button>
        ))}
      </div>
      <button type="button" className="w-primary" onClick={() => actions.input({ k: 'begin' })}>
        <Icon name="moon" size={18} /> Begin the watch
      </button>
      <p className="w-note">The sun is going down; the watch begins at nightfall on its own.</p>
    </div>
  );
}

function MomentCard({ m, actions }: { m: Moment; actions: WatchActions }) {
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
      <p className="w-moment-let">…or let it be.</p>
    </section>
  );
}

function NightPanel({ frame, actions }: { frame: Frame; actions: WatchActions }) {
  const walking = frame.lit === null;
  const off = frame.watchers.filter((w) => w.post === null);
  return (
    <div className="w-night">
      {frame.moment ? <MomentCard key={frame.moment.id} m={frame.moment} actions={actions} /> : null}
      <div className="w-lantern-pick">
        <span>
          <Icon name="lamp" size={16} /> {walking ? 'Walking the lantern to' : 'The lantern is at'}
        </span>
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className="w-chip"
            aria-pressed={frame.lantern.target === i}
            onClick={() => actions.input({ k: 'lantern', section: s.id })}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className="w-bell">
        <button
          type="button"
          className="w-bellbtn"
          disabled={frame.rope.snapped}
          onClick={() => actions.input({ k: 'bell' })}
        >
          <Icon name="bell" size={20} />
          <span>{frame.roused ? 'Ring again: hold!' : 'Ring: hold your posts!'}</span>
        </button>
        <div className="w-ropebox">
          {frame.bellRead ? <span className="w-bellread">{frame.bellRead}</span> : null}
          <Rope wear={frame.rope.wear} snapped={frame.rope.snapped} />
          <span className="w-ropewords">{ropeWords(frame.rope.wear, frame.rope.snapped)}</span>
        </div>
      </div>
      {off.length > 0 ? (
        <p className="w-offwall">
          Off the wall:{' '}
          {off.map((w, i) => (
            <span key={w.id}>
              {i > 0 ? ', ' : ''}
              {w.name} ({awayWords(w.place, frame.phase)})
            </span>
          ))}
        </p>
      ) : null}
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

function DawnPanel({ frame, actions, seed }: { frame: Frame; actions: WatchActions; seed: number }) {
  const d = frame.dawn;
  if (!d) return null;
  const fallen = frame.phase === 'fallen';
  return (
    <div className="w-page w-dawn">
      <p className="w-kicker">Dawn · {nightName(d.night).toLowerCase()}</p>
      <h2>
        {fallen
          ? 'The granary is empty.'
          : d.grainAfter === d.grainBefore
            ? 'The wall held.'
            : 'The wall was crossed.'}
      </h2>
      {d.scout ? <p className="w-scoutline">{d.scout}</p> : null}
      <ul className="w-dawnlines">
        {d.lines.map((l) => (
          <li key={l.section}>{l.text}</li>
        ))}
      </ul>
      {d.voices.length > 0 ? (
        <ul className="w-voices">
          {d.voices.map((v) => (
            <li key={v.who}>
              <blockquote>{v.text}</blockquote>
              <span className="w-voice-who">{nameOf(v.who)}</span>
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
      {fallen ? (
        <>
          <p>The village cannot reach the thaw. The chronicle closes this volume.</p>
          <button type="button" className="w-primary" onClick={() => actions.restart(seed + 1)}>
            Begin a new village
          </button>
        </>
      ) : (
        <button type="button" className="w-primary" onClick={() => actions.input({ k: 'toDusk' })}>
          On to dusk
        </button>
      )}
    </div>
  );
}

function Chronicle({ actions, seed, onClose }: { actions: WatchActions; seed: number; onClose: () => void }) {
  const [status, setStatus] = useState('');
  const [text, setText] = useState('');
  const copy = async () => {
    const data = await actions.exportRun();
    const json = JSON.stringify(data);
    try {
      await navigator.clipboard.writeText(json);
      setStatus('Copied. Paste it into a message to the team.');
    } catch {
      setText(json);
      setStatus('Copy was blocked; select the text below.');
    }
  };
  return (
    <div className="w-menu" role="dialog" aria-label="The chronicle">
      <div className="w-menu-head">
        <h2>The chronicle</h2>
        <button type="button" className="w-x" onClick={onClose}>
          <Icon name="x" size={18} label="Close" />
        </button>
      </div>
      <p>The clock stands still while the chronicle is open.</p>
      <button type="button" className="w-secondary" onClick={copy}>
        <Icon name="copy" size={16} /> Copy this volume (playtest export)
      </button>
      {status ? <p className="w-note">{status}</p> : null}
      {text ? <textarea className="w-export" readOnly value={text} rows={4} /> : null}
      <button
        type="button"
        className="w-secondary"
        onClick={() => {
          actions.restart((seed * 48271 + 11) % 2147483647);
          onClose();
        }}
      >
        Begin a new village
      </button>
      <FullscreenButton variant="item" className="w-secondary w-fs-item" />
    </div>
  );
}
