/**
 * The Night Watch shell (G3-1): a top bar with the hour and the speeds, the map, and one panel that changes
 * with the phase (goal page, dusk posting, the night's lantern and bell, the dawn page). The chronicle menu
 * holds the playtest export and a new village. Play shows no numbers: sacks, strands and words.
 */
import { useEffect, useState } from 'react';
import {
  type PostId,
  postSection,
  SECTIONS,
  type SectionId,
  WATCHERS,
  type WatcherId,
} from '../sim/config.ts';
import type { Speed } from '../sim/pace.ts';
import type { Frame } from '../sim/view.ts';
import { Icon, type IconName } from './icons.tsx';
import { MapCanvas } from './MapCanvas.tsx';
import type { Hit } from './map.ts';
import { useWatch, type WatchActions } from './useWatch.ts';
import { hourWords, nightName, ropeWords } from './words.ts';

const SPEEDS: { id: Speed; label: string; icon: IconName }[] = [
  { id: 'tactical', label: 'Slow', icon: 'snail' },
  { id: 'watch', label: 'Watch', icon: 'play' },
  { id: 'fast', label: 'Fast', icon: 'fast-forward' },
];

function freePost(f: Frame, section: SectionId, who: WatcherId): PostId | null {
  const sec = f.sections.find((s) => s.id === section);
  if (!sec) return null;
  const mine = sec.posts.find((p) => p.watcher === who);
  if (mine) return mine.id;
  return sec.posts.find((p) => p.watcher === null)?.id ?? null;
}

export function App() {
  const { frame, speed, error, seed, actions } = useWatch();
  const [selected, setSelected] = useState<WatcherId | null>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    actions.hold(menu);
  }, [menu, actions]);

  useEffect(() => {
    if (frame && frame.phase !== 'dusk' && frame.phase !== 'goal') setSelected(null);
  }, [frame]);

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

  const onHit = (hit: Hit) => {
    if (!hit) return;
    if (frame.phase === 'night') {
      const section = hit.kind === 'section' ? hit.section : postSection(hit.post as PostId);
      actions.input({ k: 'lantern', section });
      return;
    }
    if (frame.phase !== 'dusk') return;
    if (hit.kind === 'post') {
      const occupant = frame.sections.flatMap((s) => s.posts).find((p) => p.id === hit.post)?.watcher ?? null;
      if (selected) {
        actions.input({ k: 'post', watcher: selected, post: hit.post as PostId });
        setSelected(null);
      } else if (occupant) {
        setSelected(occupant);
      }
      return;
    }
    if (selected) {
      const post = freePost(frame, hit.section, selected);
      if (post) {
        actions.input({ k: 'post', watcher: selected, post });
        setSelected(null);
      }
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
                aria-pressed={speed === s.id}
                onClick={() => actions.setSpeed(s.id)}
              >
                <Icon name={s.icon} size={16} />
                <span>{s.label}</span>
              </button>
            ))}
          </fieldset>
        ) : null}
        <button type="button" className="w-chronicle" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          <Icon name="book-open" size={18} />
          <span>Chronicle</span>
        </button>
      </header>

      {menu ? <Chronicle actions={actions} seed={seed} onClose={() => setMenu(false)} /> : null}

      <main className="w-stage">
        <div className="w-mapwrap">
          <MapCanvas frame={frame} selected={selected} onHit={onHit} />
          <Ticker frame={frame} />
        </div>
        <section className="w-panel" aria-live="polite">
          {frame.phase === 'goal' ? <GoalPage frame={frame} actions={actions} /> : null}
          {frame.phase === 'dusk' ? (
            <DuskPanel frame={frame} actions={actions} selected={selected} setSelected={setSelected} />
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

function GoalPage({ frame, actions }: { frame: Frame; actions: WatchActions }) {
  return (
    <div className="w-page">
      <p className="w-kicker">The chronicle opens</p>
      <h2>Bring every soul and the granary to the thaw.</h2>
      <p>
        You are the Keeper. At dusk the scout tells you what is coming; you post the watchers. At night you
        carry the lantern to one stretch of wall, and only there can you see what comes. Ring the bell when
        you must; the rope wears with every pull.
      </p>
      <p className="w-note">
        Early prototype: the watchers here always obey. In the full game they are people who can say no.
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
}: {
  frame: Frame;
  actions: WatchActions;
  selected: WatcherId | null;
  setSelected: (w: WatcherId | null) => void;
}) {
  const sectionName = (id: SectionId | null) => (id ? (SECTIONS.find((s) => s.id === id)?.name ?? '') : '');
  return (
    <div className="w-dusk">
      <p className="w-warning">
        <Icon name="sunrise" size={18} /> {frame.warning}
      </p>
      <p className="w-hint">
        {selected
          ? `Where should ${WATCHERS.find((w) => w.id === selected)?.name} stand? Tap a post on the wall or a stretch below.`
          : 'Tap a watcher, then a post. Three watchers, eight posts: some wall stands empty.'}
      </p>
      <ul className="w-roster">
        {frame.watchers.map((w) => (
          <li key={w.id}>
            <button
              type="button"
              className={`w-person w-person-${w.id}`}
              aria-pressed={selected === w.id}
              onClick={() => setSelected(selected === w.id ? null : w.id)}
            >
              <span className="w-person-name">{w.name}</span>
              <span className="w-person-note">{w.note}</span>
              <span className="w-person-post">{w.section ? sectionName(w.section) : 'Off the wall'}</span>
            </button>
          </li>
        ))}
      </ul>
      {selected ? (
        <div className="w-places">
          {SECTIONS.map((s) => {
            const post = freePost(frame, s.id, selected);
            return (
              <button
                key={s.id}
                type="button"
                className="w-place"
                disabled={!post}
                onClick={() => {
                  if (post) actions.input({ k: 'post', watcher: selected, post });
                  setSelected(null);
                }}
              >
                {s.name}
                {s.id === frame.warned ? <span className="w-tracks"> · tracks</span> : null}
              </button>
            );
          })}
          <button
            type="button"
            className="w-place w-place-off"
            onClick={() => {
              actions.input({ k: 'post', watcher: selected, post: null });
              setSelected(null);
            }}
          >
            Off the wall
          </button>
        </div>
      ) : null}
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

function NightPanel({ frame, actions }: { frame: Frame; actions: WatchActions }) {
  const walking = frame.lit === null;
  return (
    <div className="w-night">
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
          <span>{frame.roused ? 'The bell is ringing' : 'Ring the bell'}</span>
        </button>
        <div className="w-ropebox">
          <Rope wear={frame.rope.wear} snapped={frame.rope.snapped} />
          <span className="w-ropewords">{ropeWords(frame.rope.wear, frame.rope.snapped)}</span>
        </div>
      </div>
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
        {fallen ? 'The granary is empty.' : d.grainAfter === d.grainBefore ? 'The wall held.' : 'Morning.'}
      </h2>
      <ul className="w-dawnlines">
        {d.lines.map((l) => (
          <li key={l.section}>{l.text}</li>
        ))}
      </ul>
      <Sacks
        have={d.grainAfter}
        lost={d.grainBefore - d.grainAfter}
        label={d.grainAfter === d.grainBefore ? 'No sacks lost' : 'Sacks lost in the night, drawn faded'}
      />
      {d.ropeSnapped ? (
        <p className="w-note">Joss will splice the bell rope today; it will not be new.</p>
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
    </div>
  );
}
