import { memo, type RefObject } from 'react';
import type { Speed } from '../protocol.ts';
import type { Frame, MomentRecord, Nudge, Scoreboard as Score } from '../sim/game.ts';
import type { Prediction } from '../sim/human-side.ts';
import type { PlaceId } from '../sim/map.ts';
import { APPEALS, type AppealChip, type ChipState, type OrderCard } from '../sim/orders.ts';
import { JOBS, VILLAGERS, type VillagerId, villagerById } from '../sim/world-types.ts';
import { LOOKS } from './renderer.ts';

export const ROLE_LABEL: Record<string, string> = {
  cook: 'Cook',
  builder: 'Builder',
  apprentice: 'Apprentice',
  forester: 'Forester',
  gatherer: 'Gatherer',
  'well-keeper': 'Well-keeper',
};

export const PLACE_LABEL: Record<PlaceId, string> = {
  forest: 'Forest',
  cedar: 'Big cedar',
  field: 'Field',
  well: 'Well',
  wellhouse: 'Well-house',
  kitchen: 'Kitchen',
  site: 'Site',
  masjid: 'Masjid',
  'home-maryam': 'Home',
  'home-yusuf': 'Home',
  'home-idris': 'Home',
};

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
// Top bar and speed
// ---------------------------------------------------------------------------------------------

const WEATHER_LABEL: Record<string, string> = {
  clear: 'Clear',
  squall: 'Squall',
  darkening: 'Sky darkening',
  storm: 'Storm',
};

export function SpeedControls(props: {
  paused: boolean;
  speed: Speed;
  onPause(p: boolean): void;
  onSpeed(s: Speed): void;
}) {
  const speeds: Speed[] = [0.5, 1, 2];
  return (
    <fieldset className="speed">
      <legend className="visually-hidden">Speed</legend>
      <button
        type="button"
        className={`speed-btn speed-play ${props.paused ? 'is-paused' : ''}`}
        onClick={() => props.onPause(!props.paused)}
        aria-label={props.paused ? 'Resume' : 'Pause'}
      >
        {props.paused ? '▶' : '❚❚'}
      </button>
      {speeds.map((s) => (
        <button
          key={s}
          type="button"
          className={`speed-btn ${!props.paused && props.speed === s ? 'is-on' : ''}`}
          aria-pressed={!props.paused && props.speed === s}
          onClick={() => {
            props.onSpeed(s);
            if (props.paused) props.onPause(false);
          }}
        >
          {s === 0.5 ? '½×' : `${s}×`}
        </button>
      ))}
    </fieldset>
  );
}

export function TopBar(props: {
  frame: Frame | null;
  paused: boolean;
  speed: Speed;
  onPause(p: boolean): void;
  onSpeed(s: Speed): void;
  /** After the run, with the end screen closed: bring it back. */
  onResults?: () => void;
  resultsRef?: RefObject<HTMLButtonElement | null>;
}) {
  const f = props.frame;
  const night = f ? f.darkness > 0.5 : false;
  return (
    <header className="topbar">
      <a href="/" className="back" aria-label="Human Framework home">
        <span className="wordmark-mark" aria-hidden="true" />
        <span className="sr-only">Home</span>
      </a>
      <div className="title">
        <h1>Twice at the Well</h1>
        <p className="subtitle">Two villages, one voice. Give an order; both hear it.</p>
      </div>
      <div className={`clock ${night ? 'is-night' : ''} weather-${f?.weather.kind ?? 'clear'}`}>
        <span className="clock-time">{f?.clock ?? 'Day 1 · 05:00'}</span>
        <span className="clock-weather">
          {night ? 'Night' : 'Day'} · {WEATHER_LABEL[f?.weather.kind ?? 'clear']}
        </span>
        <span className="clock-track" aria-hidden="true">
          <span style={{ width: `${((f?.minute ?? 0) / 2880) * 100}%` }} />
        </span>
      </div>
      <div className="topbar-speed">
        {props.onResults ? (
          <button type="button" className="btn btn-small" ref={props.resultsRef} onClick={props.onResults}>
            Results
          </button>
        ) : (
          <SpeedControls {...props} />
        )}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------------------------
// Scoreboard
// ---------------------------------------------------------------------------------------------

export const Scoreboard = memo(function Scoreboard({ sb }: { sb: Score | null }) {
  const c = sb?.classic;
  const h = sb?.human;
  const cells: { label: string; classic: string; human: string }[] = [
    { label: 'Meals', classic: String(c?.meals ?? 0), human: String(h?.meals ?? 0) },
    { label: 'House', classic: `${c?.housePct ?? 0}%`, human: `${h?.housePct ?? 0}%` },
    { label: 'Injuries', classic: String(c?.injuries ?? 0), human: String(h?.injuries ?? 0) },
    {
      // Counted per person per prayer time, so a ratio like 25/25 misleads; a share reads plainly.
      label: 'Prayers kept',
      classic: '—',
      human: h && h.prayersDue > 0 ? `${Math.round((100 * h.prayersKept) / h.prayersDue)}%` : '—',
    },
    { label: 'Morale', classic: '—', human: h ? `${h.morale >= 0 ? '+' : ''}${h.morale.toFixed(2)}` : '0' },
    { label: 'Trust in you', classic: '—', human: h ? `${Math.round(h.trust * 100)}%` : '—' },
    { label: 'Alive', classic: String(c?.alive ?? 6), human: String(h?.alive ?? 6) },
  ];
  return (
    <section className="scoreboard" aria-label="Scoreboard">
      <div className="score-legend" aria-hidden="true">
        <span className="tag tag-classic">Classic</span>
        <span className="tag tag-human">Human</span>
      </div>
      {cells.map((cell) => (
        <div className="score" key={cell.label}>
          <span className="score-label">{cell.label}</span>
          <span className="score-values">
            <span className="v-classic" title="Classic">
              {cell.classic}
            </span>
            <span className="v-human" title="Human">
              {cell.human}
            </span>
          </span>
        </div>
      ))}
    </section>
  );
});

// ---------------------------------------------------------------------------------------------
// Order cards
// ---------------------------------------------------------------------------------------------

const CHIP_TEXT: Record<ChipState, string> = {
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
  const job = JOBS[o.action];
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
          {job.label}
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

export const Queue = memo(function Queue({
  cards,
  onCancel,
}: {
  cards: OrderCard[];
  onCancel(id: string): void;
}) {
  const list = cards
    .filter((c) => c.status !== 'cancelled')
    .slice(-12)
    .reverse();
  return (
    <section className="queue" aria-label="Orders">
      <h2 className="col-head">Orders</h2>
      {list.length === 0 ? (
        <p className="queue-empty">No orders yet. Tap a villager, then a place.</p>
      ) : (
        <ul>
          {list.map((c) => (
            <OrderCardView key={c.order.id} card={c} onCancel={onCancel} />
          ))}
        </ul>
      )}
    </section>
  );
});

export function NudgeCards(props: {
  nudges: Nudge[];
  onGive(n: Nudge, insist: boolean): void;
  onDismiss(id: string): void;
}) {
  // One polite live region for all cards (not one per card).
  return (
    <div className="nudges" role="status" aria-live="polite" hidden={props.nudges.length === 0}>
      {props.nudges.map((n) => (
        <div className="nudge" key={n.id}>
          <Portrait id={n.order.personId} size={24} />
          <p>{n.text}</p>
          <div className="nudge-actions">
            <button type="button" className="btn btn-small" onClick={() => props.onGive(n, false)}>
              Send {shortName(n.order.personId)}
            </button>
            {n.insistHint && (
              <button
                type="button"
                className="btn btn-small btn-insist"
                onClick={() => props.onGive(n, true)}
              >
                Insist
              </button>
            )}
            <button type="button" className="btn btn-small btn-ghost" onClick={() => props.onDismiss(n.id)}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Roster and composer
// ---------------------------------------------------------------------------------------------

export function Roster(props: {
  selectedId: VillagerId | null;
  onSelect(id: VillagerId): void;
  frame: Frame | null;
}) {
  return (
    <div className="roster" role="toolbar" aria-label="Villagers">
      {VILLAGERS.map((v) => {
        const hv = props.frame?.human.find((h) => h.id === v.id);
        return (
          <button
            key={v.id}
            type="button"
            className={`roster-btn ${props.selectedId === v.id ? 'is-on' : ''} ${hv?.state === 'dead' ? 'is-dead' : ''}`}
            aria-pressed={props.selectedId === v.id}
            onClick={() => props.onSelect(v.id)}
          >
            <Portrait id={v.id} size={26} />
            <span>{shortName(v.id)}</span>
          </button>
        );
      })}
    </div>
  );
}

export interface ComposerState {
  rush: boolean;
  insist: boolean;
  appeal: AppealChip | null;
}

const QUICK_PLACES: PlaceId[] = ['forest', 'cedar', 'field', 'well', 'kitchen', 'site', 'masjid'];

export function Composer(props: {
  personId: VillagerId;
  state: ComposerState;
  frame: Frame | null;
  prediction: Prediction | null;
  hoverPlace: PlaceId | null;
  insistHint: boolean;
  onChange(s: ComposerState): void;
  onPlace(p: PlaceId): void;
  onHover(p: PlaceId | null): void;
  onWhy(): void;
  onClose(): void;
}) {
  const v = villagerById(props.personId);
  const hv = props.frame?.human.find((h) => h.id === props.personId);
  const cu = props.frame?.classic.find((u) => u.id === props.personId);
  const s = props.state;
  const home = v?.home ?? 'home-yusuf';
  const places = [...QUICK_PLACES, home];
  return (
    <section className="composer" aria-label={`Order for ${v?.name ?? ''}`}>
      <div className="composer-head">
        <Portrait id={props.personId} size={36} />
        <div>
          <h2>{v?.name}</h2>
          <p>
            {ROLE_LABEL[v?.role ?? 'cook']} · {v?.age}
          </p>
        </div>
        <button type="button" className="btn btn-small btn-ghost" onClick={props.onWhy}>
          Why?
        </button>
        <button type="button" className="icon-x" aria-label="Deselect" onClick={props.onClose}>
          ×
        </button>
      </div>
      <div className="composer-now">
        <span>
          <b>H</b> {hv?.label ?? '—'}
        </span>
        <span>
          <b>C</b> {cu?.label ?? '—'}
        </span>
      </div>
      <p className="composer-hint">Tap a place on either map, or:</p>
      {/* Its own fixed-height row, so the telegraph never reflows the chips under the pointer. */}
      <p className="predict-row" aria-live="polite">
        {props.prediction && props.hoverPlace ? (
          <span className={`predict predict-${props.prediction.kind}`}>{props.prediction.text}</span>
        ) : (
          <span className="predict-idle">Point at a place to hear the likely answer.</span>
        )}
      </p>
      <div className="place-chips">
        {places.map((p) => (
          <button
            key={p}
            type="button"
            className="place-chip"
            onClick={() => props.onPlace(p)}
            onPointerEnter={() => props.onHover(p)}
            onPointerLeave={() => props.onHover(null)}
            onFocus={() => props.onHover(p)}
            onBlur={() => props.onHover(null)}
          >
            {PLACE_LABEL[p]}
          </button>
        ))}
      </div>
      <div className="toggles">
        <button
          type="button"
          className={`toggle ${s.rush ? 'is-on' : ''}`}
          aria-pressed={s.rush}
          onClick={() => props.onChange({ ...s, rush: !s.rush })}
        >
          Rush <small>faster, hungrier</small>
        </button>
        <button
          type="button"
          className={`toggle toggle-insist ${s.insist ? 'is-on' : ''} ${props.insistHint && !s.insist ? 'is-hint' : ''}`}
          aria-pressed={s.insist}
          onClick={() => props.onChange({ ...s, insist: !s.insist })}
        >
          Insist <small>autonomy −, trust risk</small>
        </button>
      </div>
      <div className="appeals">
        {APPEALS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`appeal ${s.appeal === a.id ? 'is-on' : ''}`}
            aria-pressed={s.appeal === a.id}
            onClick={() => props.onChange({ ...s, appeal: s.appeal === a.id ? null : a.id })}
          >
            “{a.label}”
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Moment caption (spec §7: slow-mo with a caption when a moment fires)
// ---------------------------------------------------------------------------------------------

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
