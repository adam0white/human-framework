import { memo, type RefObject, useState } from 'react';
import type { MomentRecord } from '../sim/game.ts';
import type { Prediction } from '../sim/human-side.ts';
import type { PlaceId } from '../sim/map.ts';
import { APPEALS, type AppealChip, type ChipState, type OrderCard } from '../sim/orders.ts';
import {
  type ActionId,
  clockOf,
  JOBS,
  type Minute,
  STOREROOM_STAGES,
  VILLAGERS,
  type VillagerId,
  villagerById,
} from '../sim/world-types.ts';
import {
  dayClock,
  type Frame,
  type GoalSide,
  type GoalView,
  hhmm,
  NO_CONCEPT,
  type Nudge,
  type PauseInfo,
  type PlaybackState,
  type Speed,
} from './contract.ts';
import { LOOKS } from './renderer.ts';

export const ROLE_LABEL: Record<string, string> = {
  cook: 'Cook',
  builder: 'Builder',
  apprentice: 'Apprentice',
  forester: 'Forester',
  gatherer: 'Gatherer',
  'well-keeper': 'Well-keeper',
};

/** Visible place names. `site` is the House everywhere on screen (playtest item 12). */
export const PLACE_LABEL: Record<PlaceId, string> = {
  forest: 'Forest',
  cedar: 'Cedar',
  field: 'Field',
  well: 'Well',
  wellhouse: 'Well',
  kitchen: 'Kitchen',
  site: 'House',
  masjid: 'Masjid',
  'home-maryam': 'Home',
  'home-yusuf': 'Home',
  'home-idris': 'Home',
};

/** The inferred job as a phrase ("build the house"). Unknown actions fall back to the job table's label. */
const JOB_PHRASE: Partial<Record<string, string>> = {
  'gather-grain': 'gather grain',
  'gather-timber': 'gather timber',
  'fell-cedar': 'fell the big cedar',
  'draw-water': 'draw water',
  cook: 'cook a pot',
  build: 'build the house',
  'raise-beam': 'raise the roof beam',
  'shutter-house': 'shutter the house',
  eat: 'eat',
  pray: 'pray',
  shelter: 'shelter',
  sleep: 'sleep',
  rest: 'rest',
};

export function jobPhrase(action: ActionId | string): string {
  return JOB_PHRASE[action] ?? JOBS[action as ActionId]?.label.toLowerCase() ?? String(action);
}

export function shortName(id: VillagerId): string {
  const n = villagerById(id)?.name ?? id;
  return n.replace('Hajja ', '');
}

export function Portrait({ id, size = 28 }: { id: VillagerId; size?: number }) {
  const look = LOOKS[id];
  return (
    <span
      className="portrait"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 36%, ${look.skin} 0 24%, transparent 25%), linear-gradient(160deg, ${look.hat?.kind === 'scarf' ? look.hat.color : look.body} 0 40%, ${look.body} 41%)`,
        boxShadow: `inset 0 -4px 0 ${look.sash}`,
      }}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Top bar: clock, timeline, speed, pause, auto-pause
// ---------------------------------------------------------------------------------------------

/** Header line (item 5): "Day 1 of 2 · storm in 13 h", "Storm · ends 03:00", "Day 3 · dawn". */
export function statusLine(f: Frame | null): string {
  if (!f) return 'Day 1 of 2';
  // The last night runs past midnight to dawn; the clock's day then exceeds the run's days.
  const day = `Day ${Math.min(f.day.current, f.day.total)} of ${f.day.total}`;
  const storm = f.timeline.markers.find((m) => m.kind === 'storm');
  if (f.ended) return `Day ${clockOf(f.minute).day} · dawn`;
  if (storm && f.minute < storm.minute) {
    const left = storm.minute - f.minute;
    const when = left >= 60 ? `${Math.round(left / 60)} h` : `${left} min`;
    return `${day} · storm in ${when}`;
  }
  if (storm?.until !== undefined && f.minute < storm.until) return `Storm · ends ${hhmm(storm.until)}`;
  return day;
}

export function Timeline({ frame }: { frame: Frame | null }) {
  if (!frame) return <div className="timeline" aria-hidden="true" />;
  const end = frame.timeline.end || 1;
  const pct = (m: Minute) => `${Math.max(0, Math.min(100, (m / end) * 100))}%`;
  return (
    <div
      className="timeline"
      role="img"
      aria-label={`${frame.clock}. ${frame.timeline.markers
        .filter((m) => m.kind !== 'day')
        .map((m) => `${m.label} at ${dayClock(m.minute)}`)
        .join(', ')}`}
    >
      <span className="tl-fill" style={{ width: pct(frame.minute) }} />
      {frame.timeline.markers.map((m) =>
        m.until !== undefined ? (
          <span
            key={`${m.kind}-${m.minute}`}
            className={`tl-band tl-${m.kind}`}
            style={{ left: pct(m.minute), width: `calc(${pct(m.until)} - ${pct(m.minute)})` }}
            title={`${m.label} ${dayClock(m.minute)}–${hhmm(m.until)}`}
          />
        ) : (
          <span
            key={`${m.kind}-${m.minute}`}
            className={`tl-tick tl-${m.kind}`}
            style={{ left: pct(m.minute) }}
            title={`${m.label} ${dayClock(m.minute)}`}
          >
            {m.kind === 'day' && <span className="tl-label">{m.label.replace('Day ', 'D')}</span>}
          </span>
        ),
      )}
      <span className="tl-now" style={{ left: pct(frame.minute) }} />
    </div>
  );
}

export function SpeedControls(props: {
  playback: PlaybackState;
  onPause(p: boolean): void;
  onSpeed(s: Speed): void;
}) {
  const speeds: Speed[] = [0.5, 1, 2];
  const { paused, speed } = props.playback;
  return (
    <fieldset className="speed">
      <legend className="visually-hidden">Speed</legend>
      <button
        type="button"
        className={`speed-btn speed-play ${paused ? 'is-paused' : ''}`}
        onClick={() => props.onPause(!paused)}
        aria-label={paused ? 'Resume (Space)' : 'Pause (Space)'}
        title={paused ? 'Resume (Space)' : 'Pause (Space)'}
      >
        {paused ? '▶' : '❚❚'}
      </button>
      {speeds.map((s) => (
        <button
          key={s}
          type="button"
          className={`speed-btn ${speed === s ? 'is-on' : ''}`}
          aria-pressed={speed === s}
          onClick={() => props.onSpeed(s)}
        >
          {s === 0.5 ? '½×' : `${s}×`}
        </button>
      ))}
    </fieldset>
  );
}

export function AutoPauseToggle({ on, onChange }: { on: boolean; onChange(on: boolean): void }) {
  return (
    <label className="autopause" title="Pause on suggestions, refusals, moments and the storm">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.currentTarget.checked)} />
      <span className="autopause-track" aria-hidden="true" />
      <span>Auto-pause</span>
    </label>
  );
}

export function TopBar(props: {
  frame: Frame | null;
  playback: PlaybackState;
  onPause(p: boolean): void;
  onSpeed(s: Speed): void;
  onAutoPause(on: boolean): void;
  /** After the run, with the end screen closed: bring it back. */
  onResults?: () => void;
  resultsRef?: RefObject<HTMLButtonElement | null>;
}) {
  const f = props.frame;
  const [menu, setMenu] = useState(false);
  const night = f ? f.darkness > 0.5 : false;
  return (
    <header className="topbar">
      <a href="/" className="back" aria-label="Human Framework home">
        <span className="wordmark-mark" aria-hidden="true" />
        <span className="sr-only">Home</span>
      </a>
      <h1 className="title">Twice at the Well</h1>
      <div className={`clock ${night ? 'is-night' : ''} weather-${f?.weather.kind ?? 'clear'}`}>
        <span className="clock-time">{f ? hhmm(f.minute) : '05:00'}</span>
        <span className="clock-status">{statusLine(f)}</span>
      </div>
      <Timeline frame={f} />
      <div className="topbar-controls">
        {props.onResults && (
          <button type="button" className="btn btn-small" ref={props.resultsRef} onClick={props.onResults}>
            Results
          </button>
        )}
        <SpeedControls playback={props.playback} onPause={props.onPause} onSpeed={props.onSpeed} />
        <span className="topbar-autopause">
          <AutoPauseToggle on={props.playback.autoPause} onChange={props.onAutoPause} />
        </span>
        <span className="topbar-more">
          <button
            type="button"
            className="speed-btn"
            aria-label="More"
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
          >
            ⋯
          </button>
          {menu && (
            <span className="more-menu">
              <AutoPauseToggle on={props.playback.autoPause} onChange={props.onAutoPause} />
            </span>
          )}
        </span>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------------------------

const GOAL_ICON: Record<string, string> = { roof: '⌂', stock: '◒', lives: '♥', project: '⌂' };
const STATUS_MARK: Record<GoalSide['status'], string> = { open: '…', met: '✓', failed: '✗' };

export function goalValue(g: Pick<GoalView, 'id' | 'target'>, s: GoalSide): string {
  if (g.id === 'roof') return `${Math.floor(s.value)}/10`;
  if (g.id === 'stock') return `${s.value} meals`;
  if (g.id === 'lives') return `${s.value}/6`;
  // The Day-3 project is the store-room on both sides (a side still finishing the house shows 0).
  return `${s.value}/${STOREROOM_STAGES}`;
}

export function GoalChip({
  goal,
  side,
  s,
}: {
  goal: Pick<GoalView, 'id' | 'target'>;
  side: 'classic' | 'human' | 'solo';
  s: GoalSide;
}) {
  const tag = side === 'classic' ? 'C' : side === 'human' ? 'H' : 'S';
  return (
    <span className={`goal-chip goal-${s.status} goal-chip-${side}`} title={`${side}: ${s.status}`}>
      <span className="goal-chip-side">{tag}</span>
      <span className="goal-chip-mark" aria-hidden="true">
        {STATUS_MARK[s.status]}
      </span>
      <span className="goal-chip-value">{goalValue(goal, s)}</span>
      <span className="visually-hidden">{s.status}</span>
    </span>
  );
}

export const GoalStrip = memo(function GoalStrip({ goals }: { goals: GoalView[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`goal-strip ${open ? 'is-open' : ''}`} aria-label="Goals">
      <button
        type="button"
        className="goal-strip-toggle"
        aria-expanded={open}
        aria-label={open ? 'Hide goal labels' : 'Show goal labels'}
        onClick={() => setOpen((o) => !o)}
      >
        Goals
      </button>
      {goals.map((g) => (
        <div className="goal" key={g.id}>
          <span className="goal-icon" aria-hidden="true">
            {GOAL_ICON[g.id] ?? '•'}
          </span>
          <span className="goal-label">
            {g.label}
            <small> by {dayClock(g.deadlineMinute)}</small>
          </span>
          <span className="goal-dots" aria-hidden="true">
            <i className={`dot goal-${g.classic.status}`} />
            <i className={`dot goal-${g.human.status}`} />
          </span>
          {/* Game design review (GD7): the collapsed phone strip shows each side's number, not only a dot. */}
          <span className="goal-nums" aria-hidden="true">
            <b className={`goal-num goal-${g.classic.status}`}>C{Math.floor(g.classic.value)}</b>
            <b className={`goal-num goal-${g.human.status}`}>H{Math.floor(g.human.value)}</b>
          </span>
          <GoalChip goal={g} side="classic" s={g.classic} />
          <GoalChip goal={g} side="human" s={g.human} />
        </div>
      ))}
    </section>
  );
});

// ---------------------------------------------------------------------------------------------
// Pane header stats
// ---------------------------------------------------------------------------------------------

export function PaneStats({ frame, side }: { frame: Frame | null; side: 'classic' | 'human' }) {
  const sb = frame?.scoreboard;
  const w = side === 'classic' ? frame?.classicWorld : frame?.humanWorld;
  const p = w?.project;
  const s = side === 'classic' ? sb?.classic : sb?.human;
  const stage = p?.stage ?? 2;
  const stages = p?.stages ?? 10;
  const fill = Math.min(1, (stage + (stage < stages ? (w?.houseProgress ?? 0) : 0)) / stages);
  const h = sb?.human;
  return (
    <dl className="stats">
      <div>
        <dt>Meals</dt>
        <dd>{s?.meals ?? 0}</dd>
      </div>
      <div className="stat-house">
        <dt>{p?.kind === 'storeroom' ? 'Store-room' : 'House'}</dt>
        <dd>
          {stage}/{stages}
          <span className="stat-bar" aria-hidden="true">
            <span style={{ width: `${fill * 100}%` }} />
          </span>
        </dd>
      </div>
      <div>
        <dt>Injuries</dt>
        <dd>{s?.injuries ?? 0}</dd>
      </div>
      <div>
        <dt>Alive</dt>
        <dd>{s?.alive ?? 6}</dd>
      </div>
      {side === 'classic' && (
        <div className="stat-no-concept">
          <dt>Prayers · morale · trust</dt>
          <dd>{NO_CONCEPT}</dd>
        </div>
      )}
      {side === 'human' && (
        <>
          <div>
            <dt>Prayers</dt>
            <dd>{h && h.prayersDue > 0 ? `${Math.round((100 * h.prayersKept) / h.prayersDue)}%` : '–'}</dd>
          </div>
          <div>
            <dt>Morale</dt>
            <dd>{h ? `${h.morale >= 0 ? '+' : ''}${h.morale.toFixed(2)}` : '0'}</dd>
          </div>
          <div>
            <dt>Trust</dt>
            <dd>{h ? `${Math.round(h.trust * 100)}%` : '–'}</dd>
          </div>
        </>
      )}
    </dl>
  );
}

// ---------------------------------------------------------------------------------------------
// Order log
// ---------------------------------------------------------------------------------------------

export const CHIP_TEXT: Record<ChipState, string> = {
  pending: '…',
  ok: '✓',
  done: '✓',
  noop: '—',
  assent: 'yes',
  notNow: 'not now',
  complied: 'under protest',
  cannot: 'cannot',
  willNot: 'will not',
};

function Chip({
  side,
  state,
  label,
}: {
  side: 'classic' | 'human';
  state: ChipState;
  label?: string | undefined;
}) {
  return (
    <span className={`chip chip-${state}`} title={label ? `${side}: ${label}` : side}>
      <span className="chip-side">{side === 'classic' ? 'C' : 'H'}</span>
      {CHIP_TEXT[state]}
    </span>
  );
}

export function OrderCardView({ card, onCancel }: { card: OrderCard; onCancel(id: string): void }) {
  const o = card.order;
  return (
    <li className={`card card-${card.status}`}>
      <Portrait id={o.personId} />
      <div className="card-main">
        <div className="card-title">
          <strong>{shortName(o.personId)}</strong> → {PLACE_LABEL[o.placeId]}
          {o.rush && <span className="flag">rush</span>}
          {o.insist && <span className="flag flag-insist">insist</span>}
        </div>
        <div className="card-sub">
          {jobPhrase(o.action)}
          {card.status === 'lapsed' && ' · lapsed'}
          {card.human.label && card.human.state !== 'pending' && card.status === 'active' && (
            <span className={`card-says says-${card.human.state}`}> · “{card.human.label}”</span>
          )}
        </div>
        <div className="card-chips">
          <Chip side="classic" state={card.classic.state} label={card.classic.label} />
          <Chip side="human" state={card.human.state} label={card.human.label} />
        </div>
      </div>
      {card.status === 'active' && (
        <button type="button" className="card-x" aria-label="Cancel order" onClick={() => onCancel(o.id)}>
          ×
        </button>
      )}
    </li>
  );
}

export const OrderLog = memo(function OrderLog({
  cards,
  onCancel,
}: {
  cards: OrderCard[];
  onCancel(id: string): void;
}) {
  const list = cards.filter((c) => c.status !== 'cancelled').reverse();
  return list.length === 0 ? (
    <p className="queue-empty">No orders yet. Pick a villager, then a place.</p>
  ) : (
    <ul className="queue-list">
      {list.map((c) => (
        <OrderCardView key={c.order.id} card={c} onCancel={onCancel} />
      ))}
    </ul>
  );
});

// ---------------------------------------------------------------------------------------------
// Suggestion card (items 6, 8): text, reason, countdown in sim time, Use and skip
// ---------------------------------------------------------------------------------------------

export function SuggestionCard(props: {
  nudge: Nudge;
  minute: Minute;
  queued: number;
  active: boolean;
  onUse(n: Nudge): void;
  onSkip(id: string): void;
}) {
  const n = props.nudge;
  const left = Math.max(0, n.until - props.minute);
  const span = Math.max(1, n.until - n.minute);
  return (
    <div className={`nudge ${props.active ? 'is-active' : ''}`}>
      <div className="nudge-head">
        <Portrait id={n.order.personId} size={24} />
        <span className="kicker">Suggestion</span>
        {props.queued > 0 && <span className="nudge-more">+{props.queued}</span>}
        <button
          type="button"
          className="nudge-skip"
          aria-label="Skip suggestion"
          title="Skip"
          onClick={() => props.onSkip(n.id)}
        >
          ×
        </button>
      </div>
      <p className="nudge-text">{n.text}</p>
      {n.reason && <p className="nudge-reason">{n.reason}</p>}
      <div className="nudge-foot">
        <span className="nudge-timer">
          lapses {hhmm(n.until)} · in {left} min
          <span className="nudge-bar" aria-hidden="true">
            <span style={{ width: `${(left / span) * 100}%` }} />
          </span>
        </span>
        <button type="button" className="btn btn-small" onClick={() => props.onUse(n)}>
          {props.active ? 'In composer' : 'Use'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Composer (item 7): who → where → how → Confirm
// ---------------------------------------------------------------------------------------------

export interface ComposerState {
  personId: VillagerId | null;
  placeId: PlaceId | null;
  rush: boolean;
  insist: boolean;
  appeal: AppealChip | null;
  /** Filled from a suggestion: the order goes out with this `nudgeId`, and the reason is shown. */
  nudgeId?: string;
  reason?: string;
}

export const EMPTY_COMPOSER: ComposerState = {
  personId: null,
  placeId: null,
  rush: false,
  insist: false,
  appeal: null,
};

const PLACES_FOR_CHIPS: PlaceId[] = ['site', 'forest', 'cedar', 'field', 'well', 'kitchen', 'masjid'];

export function Composer(props: {
  state: ComposerState;
  frame: Frame | null;
  job: ActionId | null;
  prediction: Prediction | null;
  onChange(s: ComposerState): void;
  onWho(id: VillagerId): void;
  onWhere(p: PlaceId): void;
  onHover(p: PlaceId | null): void;
  onConfirm(): void;
  onInspect(id: VillagerId): void;
}) {
  const s = props.state;
  const who = s.personId;
  const v = who ? villagerById(who) : undefined;
  const places: PlaceId[] = [...PLACES_FOR_CHIPS, (v?.home ?? 'home-yusuf') as PlaceId];
  const ready = who !== null && s.placeId !== null;
  const pred = props.prediction && ready && props.prediction.personId === who ? props.prediction : null;
  return (
    <section className={`composer ${ready ? 'is-ready' : ''}`} aria-label="Order">
      <div className="composer-row roster" role="toolbar" aria-label="Who">
        {VILLAGERS.map((p) => {
          const hv = props.frame?.human.find((h) => h.id === p.id);
          return (
            <button
              key={p.id}
              type="button"
              className={`roster-btn ${who === p.id ? 'is-on' : ''} ${hv?.state === 'dead' ? 'is-dead' : ''}`}
              aria-pressed={who === p.id}
              onClick={() => props.onWho(p.id)}
            >
              <Portrait id={p.id} size={22} />
              <span>{shortName(p.id)}</span>
            </button>
          );
        })}
      </div>
      <div className="composer-row place-chips" role="toolbar" aria-label="Where">
        {places.map((p) => (
          <button
            key={p}
            type="button"
            className={`place-chip ${s.placeId === p ? 'is-on' : ''}`}
            aria-pressed={s.placeId === p}
            disabled={!who}
            onClick={() => props.onWhere(p)}
            onPointerEnter={() => props.onHover(p)}
            onPointerLeave={() => props.onHover(null)}
          >
            {PLACE_LABEL[p]}
          </button>
        ))}
      </div>
      <p className="composer-line" aria-live="polite">
        {!who ? (
          <span className="muted">Pick a villager here or on either map.</span>
        ) : !s.placeId ? (
          <span className="muted">{shortName(who)}: now pick a place.</span>
        ) : (
          <>
            <span className="composer-job">
              {shortName(who)} → {PLACE_LABEL[s.placeId]}
              {props.job && <> · {jobPhrase(props.job)}</>}
            </span>
            {pred && (
              <span className={`predict predict-${pred.kind}`}>
                {shortName(who)}: {pred.text.charAt(0).toLowerCase() + pred.text.slice(1)}
              </span>
            )}
          </>
        )}
      </p>
      {s.reason && <p className="composer-reason">{s.reason}</p>}
      <div className="composer-row toggles">
        <button
          type="button"
          className={`toggle ${s.rush ? 'is-on' : ''}`}
          aria-pressed={s.rush}
          disabled={!who}
          onClick={() => props.onChange({ ...s, rush: !s.rush })}
        >
          Rush <small>faster, hungrier</small>
        </button>
        <button
          type="button"
          className={`toggle toggle-insist ${s.insist ? 'is-on' : ''}`}
          aria-pressed={s.insist}
          disabled={!who}
          onClick={() => props.onChange({ ...s, insist: !s.insist })}
        >
          Insist <small>may cost trust</small>
        </button>
      </div>
      <div className="composer-row appeals">
        {APPEALS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`appeal ${s.appeal === a.id ? 'is-on' : ''}`}
            aria-pressed={s.appeal === a.id}
            disabled={!who}
            onClick={() => props.onChange({ ...s, appeal: s.appeal === a.id ? null : a.id })}
          >
            “{a.label}”
          </button>
        ))}
      </div>
      <div className="composer-actions">
        {who && (
          <button type="button" className="btn btn-small btn-ghost" onClick={() => props.onInspect(who)}>
            Inspect
          </button>
        )}
        {(who || s.nudgeId) && (
          <button
            type="button"
            className="btn btn-small btn-ghost"
            onClick={() => props.onChange(EMPTY_COMPOSER)}
            title="Clear (Esc)"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          className="btn btn-confirm"
          disabled={!ready}
          onClick={props.onConfirm}
          title="Confirm (Enter)"
        >
          Confirm
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Pause ribbon and moment caption
// ---------------------------------------------------------------------------------------------

const PAUSE_TITLE: Record<string, string> = {
  suggestion: 'A suggestion',
  refusal: 'An answer',
  moment: 'A moment',
  storm: 'The storm',
};

export function PauseRibbon({ pause, onResume }: { pause: PauseInfo; onResume(): void }) {
  if (pause.kind === 'start') return null;
  const title =
    pause.kind === 'auto'
      ? `Paused · ${PAUSE_TITLE[pause.reason ?? ''] ?? 'Auto-pause'}`
      : pause.kind === 'inspector'
        ? 'Paused while you inspect'
        : 'Paused';
  return (
    <div className={`pause-ribbon pause-${pause.kind}`} role="status">
      <div>
        <strong>{title}</strong>
        {pause.kind === 'auto' && pause.text && <p>{pause.text}</p>}
      </div>
      <button type="button" className="btn btn-small" onClick={onResume}>
        Resume <kbd>Space</kbd>
      </button>
    </div>
  );
}

const MOMENT_TITLE: Record<number, string> = {
  1: 'Carried home before eating',
  2: 'Same job, different answer',
  3: 'A refusal on principle',
  4: 'Done together',
  5: 'Trust remembered',
};

export function MomentBanner({ moment, slowMo }: { moment: MomentRecord; slowMo: boolean }) {
  return (
    <div className="moment-banner" role="status" aria-live="polite" key={`${moment.id}-${moment.minute}`}>
      <span className="moment-banner-n">Moment {moment.id}</span>
      <strong>{MOMENT_TITLE[moment.id] ?? ''}</strong>
      <p>{moment.line}</p>
      {slowMo && <span className="moment-banner-slow">slow motion</span>}
    </div>
  );
}

export { NO_CONCEPT };
