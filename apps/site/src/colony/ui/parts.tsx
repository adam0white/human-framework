import { memo, type ReactNode, type RefObject, useState } from 'react';
import type { HurtNews, MomentRecord } from '../sim/game.ts';
import type { Prediction, VillagerView } from '../sim/human-side.ts';
import type { PlaceId } from '../sim/map.ts';
import { APPEALS, type AppealChip, type ChipState, inferAction, type OrderCard } from '../sim/orders.ts';
import {
  type ActionId,
  clockOf,
  formatClock,
  JOBS,
  type Minute,
  SIM_MINUTES_PER_SECOND,
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
import { moodDescription, trustDescription } from './descriptions.ts';
import { goalValue, humanQuotes } from './end-report.ts';
import { Icon, type IconName, RingTimer } from './Icon.tsx';
import { homeOrderMeaning, PLACE_LABEL, personOrderStatus } from './order-status.ts';
import { LOOKS } from './renderer.ts';
import { suggestionChoice } from './suggestion-choice.ts';

export const ROLE_LABEL: Record<string, string> = {
  cook: 'Cook',
  builder: 'Builder',
  apprentice: 'Apprentice',
  forester: 'Forester',
  gatherer: 'Gatherer',
  'well-keeper': 'Well-keeper',
};

export { PLACE_LABEL } from './order-status.ts';

/** Place chip icons. */
export const PLACE_ICON: Record<PlaceId, IconName> = {
  forest: 'forest',
  cedar: 'cedar',
  field: 'field',
  well: 'well',
  wellhouse: 'well',
  kitchen: 'kitchen',
  site: 'house',
  masjid: 'masjid',
  'home-maryam': 'home',
  'home-yusuf': 'home',
  'home-idris': 'home',
};

/** Short appeal labels for narrow screens (the full line is the button's accessible name). */
const APPEAL_SHORT: Record<string, string> = { children: 'children', duty: 'duty', safety: 'safer' };

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

/** Infer exactly the ordinary order the current issuing-side world would send. */
export function inferredJob(frame: Frame, place: PlaceId, side: 'human' | 'classic' = 'human'): ActionId {
  const world = side === 'human' ? frame.humanWorld : frame.classicWorld;
  return inferAction(place, {
    minute: frame.minute,
    house: { stage: world.houseStage, shuttered: world.shuttered },
    cedarFelled: world.cedarFelled,
    storeroom: world.project.kind === 'storeroom' ? world.project.stage : null,
  });
}

/** Describe an ordinary repeat order without promising that the person will agree. */
export function sameJobCopy(action: ActionId, personId: VillagerId): string {
  const ongoing: Partial<Record<ActionId, string>> = {
    'gather-timber': 'gathering timber',
    'gather-grain': 'gathering grain',
    'fell-cedar': 'felling the big cedar',
    'draw-water': 'drawing water',
    cook: 'cooking',
    build: 'building',
    'raise-beam': 'raising the roof beam',
    'shutter-house': 'shuttering the house',
    eat: 'eating',
    pray: 'praying',
    shelter: 'sheltering',
    sleep: 'sleeping',
    rest: 'resting',
  };
  const pronoun = personId === 'maryam' || personId === 'samira' ? 'her' : 'him';
  return `Already ${ongoing[action] ?? jobPhrase(action)}: keeps ${pronoun} at it`;
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
    <label className="autopause" title="Slow the clock while a suggestion awaits your decision">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.currentTarget.checked)} />
      <span className="autopause-track" aria-hidden="true" />
      <span>Slow for choices</span>
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
  /** The playtest menu (shared/PlaytestMenu.tsx). */
  playtest?: ReactNode;
}) {
  const f = props.frame;
  const night = f ? f.darkness > 0.5 : false;
  return (
    <header className="topbar">
      <a href="/" className="back" aria-label="Human Framework home">
        <span className="wordmark-mark" aria-hidden="true" />
        <span className="sr-only">Home</span>
      </a>
      <h1 className="title">Twice at the Well</h1>
      <div className={`clock ${night ? 'is-night' : ''} weather-${f?.weather.kind ?? 'clear'}`}>
        <span className="clock-time">
          <span className="phone-day">D{f ? clockOf(f.minute).day : 1} </span>
          {f ? hhmm(f.minute) : '05:00'}
        </span>
        <span className="clock-status">{statusLine(f)}</span>
      </div>
      <Timeline frame={f} />
      <span className="clock-rate" role="status">
        {f?.ended
          ? 'Ended'
          : props.playback.paused
            ? 'Paused'
            : props.playback.slowMo
              ? 'Slow · 1 min/s · suggestion pending'
              : `Running · ${props.playback.speed * SIM_MINUTES_PER_SECOND} min/s`}
      </span>
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
        {props.playtest}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------------------------

const GOAL_ICON: Record<string, IconName> = {
  roof: 'house',
  stock: 'meals',
  lives: 'lives',
  project: 'build',
};
/** Short goal names for the phone strip. */
const GOAL_SHORT: Record<string, string> = { roof: 'Roof', stock: 'Meals', lives: 'Alive', project: 'Store' };
const STATUS_MARK: Record<GoalSide['status'], string> = { open: '…', met: '✓', failed: '✗' };

export { goalValue };

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
  const roof = goals.find((g) => g.id === 'roof');
  const lives = goals.find((g) => g.id === 'lives');
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
            <Icon name={GOAL_ICON[g.id] ?? 'house'} size={16} />
          </span>
          <span className="goal-label">
            {g.label}
            <small> by {dayClock(g.deadlineMinute)}</small>
          </span>
          <span className="goal-dots" aria-hidden="true">
            <i className={`dot goal-${g.classic.status}`} />
            <i className={`dot goal-${g.human.status}`} />
          </span>
          {/* The collapsed phone strip: a short name and one bar per side with a tick at the target. */}
          <GoalBars goal={g} />
          <GoalChip goal={g} side="classic" s={g.classic} />
          <GoalChip goal={g} side="human" s={g.human} />
        </div>
      ))}
      {(roof || lives) && (
        <div className="goal-deadlines">
          {roof && <span>Roof before {dayClock(roof.deadlineMinute)}</span>}
          {lives && <span>Everyone lives by {dayClock(lives.deadlineMinute)}</span>}
        </div>
      )}
    </section>
  );
});

/**
 * Two mini progress bars (Classic over Human) with a tick at the target, for the collapsed phone strip. The scale
 * reaches past the target when a value does (17 meals against 12), so the tick stays where the goal is.
 */
export function GoalBars({ goal }: { goal: GoalView }) {
  const target = goal.targetValue;
  const max = Math.max(target, goal.classic.value, goal.human.value, 1) * (goal.id === 'stock' ? 1.25 : 1);
  const tick = `${(target / max) * 100}%`;
  const row = (tag: 'C' | 'H', s: GoalSide) => (
    <span className={`gbar goal-${s.status}`}>
      <span className="gbar-tag">{tag}</span>
      <span className="gbar-track">
        <span className="gbar-fill" style={{ width: `${Math.min(1, s.value / max) * 100}%` }} />
        <span className="gbar-tick" style={{ left: tick }} />
      </span>
    </span>
  );
  return (
    <span
      className="goal-bars"
      role="img"
      aria-label={`${goal.label}: Classic ${goalValue(goal, goal.classic)} (${goal.classic.status}), Human ${goalValue(goal, goal.human)} (${goal.human.status}); target ${target}`}
    >
      <span className="gbar-name">
        {GOAL_SHORT[goal.id] ?? goal.label} <small>{target}</small>
      </span>
      {row('C', goal.classic)}
      {row('H', goal.human)}
    </span>
  );
}

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
            <dt>Morale</dt>
            <dd>{h ? moodDescription(h.morale) : 'Settled'}</dd>
          </div>
          <div>
            <dt>Trust</dt>
            <dd>{h ? trustDescription(h.trust) : 'Getting acquainted'}</dd>
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
  pending: 'waiting',
  ok: 'agreed',
  done: 'done',
  noop: 'could not',
  assent: 'agreed',
  notNow: 'not now',
  complied: 'agreed under protest',
  cannot: 'cannot',
  willNot: 'will not',
};

function chipText(state: ChipState, settled?: boolean): string {
  if (settled && state === 'complied') return 'done under protest';
  return CHIP_TEXT[state === 'ok' && settled ? 'done' : state];
}

function Chip({
  side,
  state,
  label,
  settled,
}: {
  side: 'classic' | 'human';
  state: ChipState;
  label?: string | undefined;
  settled?: boolean | undefined;
}) {
  return (
    <span className={`chip chip-${state}`} title={label ? `${side}: ${label}` : side}>
      <span className="chip-side">{side === 'classic' ? 'C' : 'H'}</span>
      {chipText(state, settled)}
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
          {o.rush && (
            <span className="flag" title="Rush">
              <Icon name="rush" size={12} label="Rush" />
            </span>
          )}
          {o.insist && (
            <span className="flag flag-insist" title="Insist">
              <Icon name="insist" size={12} label="Insist" />
            </span>
          )}
        </div>
        <div className="card-sub">
          {jobPhrase(o.action)}
          {card.status === 'lapsed' && ' · lapsed'}
          {card.status === 'replaced' && ` · replaced by ${card.replacedBy ?? 'a newer order'}`}
          {card.human.label &&
            card.human.state !== 'pending' &&
            (card.status === 'active' || card.human.state === 'willNot' || card.human.state === 'cannot') && (
              <span className={`card-says says-${card.human.state}`}> · {humanQuotes(card)}</span>
            )}
          {card.classic.state === 'noop' && card.classic.label && (
            <span className="card-says says-noop"> · Classic: {card.classic.label}</span>
          )}
        </div>
        {card.classic.outcome && <p className="card-outcome">Classic · {card.classic.outcome}</p>}
        {card.human.outcome && <p className="card-outcome">Human · {card.human.outcome}</p>}
        {homeOrderMeaning(card) && <p className="card-outcome">{homeOrderMeaning(card)}</p>}
        <div className="card-chips">
          <Chip
            side="classic"
            state={card.classic.state}
            label={card.classic.label}
            settled={card.classic.settled}
          />
          <Chip side="human" state={card.human.state} label={card.human.label} settled={card.human.settled} />
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

/** A person's latest answer and direct controls stay outside History. */
export function PersonOrder({
  card,
  person,
  onAgain,
  onCancel,
  onInsist,
}: {
  card: OrderCard;
  person?: VillagerView | undefined;
  onAgain(card: OrderCard): void;
  onCancel(id: string): void;
  onInsist(card: OrderCard): void;
}) {
  const refused = card.human.state === 'willNot';
  const pushed = card.human.state === 'complied' || card.human.first?.state === 'complied';
  const trustCosts =
    person?.id === card.order.personId
      ? person.trust.history.filter((event) => event.minute > card.order.issuedAt && event.delta < 0)
      : [];
  return (
    <section className="person-order" aria-label="Latest order">
      <p className="person-order-state">
        <strong>Human · {personOrderStatus(card)}</strong>
      </p>
      {(card.human.says ?? card.human.label) && (
        <p className="person-order-reply">
          {card.human.outcome ? 'Before completion' : 'Latest Human reply'}:{' '}
          {card.human.says ?? card.human.label}
        </p>
      )}
      {homeOrderMeaning(card) && <p>{homeOrderMeaning(card)}</p>}
      {pushed && <p>{shortName(card.order.personId)} went along, but minded being pushed.</p>}
      {trustCosts.map((event) => (
        <p className="person-order-cost" key={`${event.minute}-${event.label}-${event.delta}`}>
          Recent trust change · {dayClock(event.minute)} · {shortName(card.order.personId)} trusts you less.{' '}
          {event.label}.
        </p>
      ))}
      {card.order.insist && person && trustCosts.length === 0 && (
        <p>The recent record shows no trust loss after this request.</p>
      )}
      {card.order.insist && <p>Insist was used. Asking again may cost trust.</p>}
      <div className="person-order-actions">
        <button type="button" onClick={() => onAgain(card)}>
          Ask again
        </button>
        <button type="button" disabled={card.status !== 'active'} onClick={() => onCancel(card.order.id)}>
          Cancel order
        </button>
      </div>
      {refused && (
        <button type="button" className="person-order-insist" onClick={() => onInsist(card)}>
          Insist · may cost trust
        </button>
      )}
    </section>
  );
}

/** The newest answered order stays beside the phone composer. Labels can be counter-offers, not speech. */
export function OrderReply({ cards }: { cards: OrderCard[] }) {
  const card = cards.findLast(
    (c) => (c.status === 'active' || c.status === 'done') && c.human.state !== 'pending' && c.human.label,
  );
  if (!card) return null;
  return (
    <p className="order-reply" role="status">
      Human · <strong>{shortName(card.order.personId)}</strong> → {PLACE_LABEL[card.order.placeId]}:{' '}
      {chipText(card.human.state, card.human.settled)} · {card.human.label}
    </p>
  );
}

// ---------------------------------------------------------------------------------------------
// Suggestion card (items 6, 8): text, reason, countdown in sim time, Use and skip
// ---------------------------------------------------------------------------------------------

/** Review known dangers and authored trade-offs; ordinary suggestions use the existing default order. */
export function suggestionNeedsReview(n: Nudge, frame?: Frame | null): boolean {
  if (!frame) return true;
  if (n.prefill?.rush ?? n.order.rush) return true;
  if ((n.prefill?.insist ?? n.order.insist) || n.order.appeal) return true;
  if (n.id === 'cook-forest' || n.id === 'storm-shutter') return true;
  return (['classic', 'human'] as const).some((side) => {
    const job = inferredJob(frame, n.order.placeId, side);
    if (job === 'fell-cedar' || job === 'raise-beam' || job === 'shutter-house') return true;
    return (
      (frame.weather.kind === 'squall' || frame.weather.kind === 'storm') &&
      ['forest', 'cedar', 'field', 'site', 'well'].includes(n.order.placeId)
    );
  });
}

export function SuggestionCard(props: {
  nudge: Nudge;
  prediction?: Prediction | null;
  cards?: OrderCard[];
  frame?: Frame;
  minute: Minute;
  queued: number;
  active: boolean;
  onUse(n: Nudge): void;
  onSkip(id: string): void;
  onKeepWatching?(): void;
}) {
  const n = props.nudge;
  const choice = suggestionChoice(n, props.frame, props.cards, props.prediction);
  const review = suggestionNeedsReview(n, props.frame);
  const refusal = [...(props.cards ?? [])]
    .reverse()
    .find(
      (card) =>
        card.order.personId === n.order.personId &&
        (props.frame
          ? card.order.action === inferredJob(props.frame, n.order.placeId)
          : card.order.placeId === n.order.placeId) &&
        (card.human.state === 'willNot' || card.human.state === 'notNow'),
    );
  const history = refusal
    ? `Suggested at ${dayClock(n.minute)}. ${shortName(n.order.personId)} answered an order issued at ${dayClock(refusal.order.issuedAt)}: “${refusal.human.label ?? 'Not now.'}” This is an old suggestion; the person may answer differently now.`
    : null;
  const left = Math.max(0, n.until - props.minute);
  const span = Math.max(1, n.until - n.minute);
  return (
    <div className={`nudge ${props.active ? 'is-active' : ''}`}>
      <div className="nudge-head">
        <div className="nudge-proposal">
          {choice.refusal && <p className="nudge-refusal">{choice.refusal}</p>}
          <p className="nudge-order">
            {shortName(n.order.personId)} → {PLACE_LABEL[n.order.placeId]}
          </p>
          {!choice.refusal && <p className="nudge-text">{history ?? n.text}</p>}
          {!choice.refusal && n.reason && <p className="nudge-reason">{n.reason}</p>}
        </div>
        <button type="button" className="btn btn-small nudge-use" onClick={() => props.onUse(choice.nudge)}>
          {choice.refusal
            ? 'Insist · may cost trust'
            : props.active
              ? 'In composer'
              : review
                ? 'Review order'
                : 'Send order'}
        </button>
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
      {props.onKeepWatching && (
        <button type="button" className="btn btn-small nudge-keep-watching" onClick={props.onKeepWatching}>
          Keep watching
        </button>
      )}
      {choice.refusal && (
        <p className="nudge-warning">
          Insisting may cost trust. {shortName(n.order.personId)} can still refuse. Review the warning before
          Confirm.
        </p>
      )}
      <p className="nudge-availability">
        Availability may have changed. The person can still refuse or wait.
      </p>
      <div className="nudge-foot">
        {props.queued > 0 && <span className="nudge-more">+{props.queued} waiting</span>}
        <span className="nudge-timer">
          <RingTimer left={left} span={span} />
          <span>
            lapses {hhmm(n.until)} · in {left} min
          </span>
        </span>
      </div>
      <p className="nudge-help">
        {choice.refusal
          ? 'Choose Insist to review the order, or keep watching.'
          : review
            ? 'Review the order, then Confirm sends it.'
            : 'Send order sends it to both villages.'}{' '}
        You can skip or choose your own.
      </p>
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

/** A picker, options or suggestion replaces the previous sheet. */
export function keepOneDisclosure(current: HTMLDetailsElement): void {
  if (!current.open) return;
  current
    .closest('.center')
    ?.querySelectorAll('details[open]')
    .forEach((el) => {
      if (el !== current) el.removeAttribute('open');
    });
}

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
  /** Opening a picker holds the current map even when returning from watching. */
  onCompose?(): void;
  onWatch?(): void;
}) {
  const s = props.state;
  const who = s.personId;
  const v = who ? villagerById(who) : undefined;
  const places: PlaceId[] = [...PLACES_FOR_CHIPS, (v?.home ?? 'home-yusuf') as PlaceId];
  const ready = who !== null && s.placeId !== null;
  const pred = props.prediction && ready && props.prediction.personId === who ? props.prediction : null;
  return (
    <section
      className={`composer ${ready ? 'is-ready' : ''} ${s.rush || s.insist || s.appeal ? 'has-costs' : ''}`}
      aria-label="Order"
    >
      <div className="phone-order-fields">
        <details
          className="worker-picker"
          onToggle={(e) => {
            keepOneDisclosure(e.currentTarget);
            if (e.currentTarget.open) props.onCompose?.();
          }}
        >
          <summary>Worker · {who ? shortName(who) : 'Choose'}</summary>
          <fieldset className="picker-chips" aria-label="Worker">
            {VILLAGERS.map((p) => (
              <button
                key={p.id}
                type="button"
                data-person={p.id}
                aria-pressed={who === p.id}
                onClick={(e) => {
                  props.onWho(p.id);
                  e.currentTarget.closest('details')?.removeAttribute('open');
                }}
              >
                {shortName(p.id)}
              </button>
            ))}
          </fieldset>
        </details>
        <details
          className="destination-picker"
          onToggle={(e) => {
            keepOneDisclosure(e.currentTarget);
            if (e.currentTarget.open) props.onCompose?.();
          }}
        >
          <summary>Place · {s.placeId ? PLACE_LABEL[s.placeId] : 'Choose'}</summary>
          <fieldset className="picker-chips" aria-label="Destination">
            {places.map((p) => (
              <button
                key={p}
                type="button"
                data-place={p}
                aria-pressed={s.placeId === p}
                disabled={!who}
                onClick={(e) => {
                  props.onWhere(p);
                  e.currentTarget.closest('details')?.removeAttribute('open');
                }}
              >
                {PLACE_LABEL[p]}
              </button>
            ))}
          </fieldset>
        </details>
      </div>
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
              <Portrait id={p.id} size={20} />
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
            <Icon name={PLACE_ICON[p]} size={16} />
            <span className="place-chip-label">{PLACE_LABEL[p]}</span>
          </button>
        ))}
      </div>
      <p className="composer-line" aria-live="polite" title={pred?.text}>
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
            {!pred && <span className="predict muted">Checking current answer…</span>}
            {pred && (
              <span className={`predict predict-${pred.kind}`}>
                {pred.text}
                {who === 'maryam' && pred.text === 'Will refuse: the others would go unfed' && (
                  <>. Ask again after she cooks the meal.</>
                )}
              </span>
            )}
          </>
        )}
        {(s.rush || s.insist || s.appeal) && (
          <span className="active-costs">
            {[
              s.rush && 'Rush: hungrier',
              s.insist && 'Insist: trust at risk',
              s.appeal === 'safety' && 'Safety: promise',
              s.appeal === 'children' && 'For the children',
              s.appeal === 'duty' && 'Duty',
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        )}
      </p>
      {s.reason && <p className="composer-reason">{s.reason}</p>}
      <details className="order-options" onToggle={(e) => keepOneDisclosure(e.currentTarget)}>
        <summary>
          Order options
          {s.rush && <small> · Rush: faster, hungrier</small>}
          {s.insist && <small> · Insist: may cost trust</small>}
          {s.appeal && <small> · Appeal: “{APPEALS.find((a) => a.id === s.appeal)?.label}”</small>}
        </summary>
        <div className="option-person-actions">
          <p>
            {who ? shortName(who) : 'Choose worker'} → {s.placeId ? PLACE_LABEL[s.placeId] : 'Choose place'}
          </p>
          {who && (
            <button type="button" className="btn" onClick={() => props.onInspect(who)}>
              About {shortName(who)}
            </button>
          )}
          <button type="button" className="btn" onClick={() => props.onChange(EMPTY_COMPOSER)}>
            Clear
          </button>
        </div>
        <div className="composer-row toggles">
          <button
            type="button"
            className={`toggle ${s.rush ? 'is-on' : ''}`}
            aria-pressed={s.rush}
            disabled={!who}
            onClick={() => props.onChange({ ...s, rush: !s.rush })}
          >
            <Icon name="rush" size={16} />
            <span className="toggle-label">Rush</span> <small>faster, hungrier</small>
          </button>
          <button
            type="button"
            className={`toggle toggle-insist ${s.insist ? 'is-on' : ''}`}
            aria-pressed={s.insist}
            disabled={!who}
            onClick={() => props.onChange({ ...s, insist: !s.insist })}
          >
            <Icon name="insist" size={16} />
            <span className="toggle-label">Insist</span> <small>may cost trust</small>
          </button>
        </div>
        <div className="composer-row appeals">
          {APPEALS.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`appeal ${s.appeal === a.id ? 'is-on' : ''}`}
              aria-pressed={s.appeal === a.id}
              aria-label={`Appeal: “${a.label}”`}
              title={`“${a.label}”`}
              disabled={!who}
              onClick={() => props.onChange({ ...s, appeal: s.appeal === a.id ? null : a.id })}
            >
              <span className="appeal-full">“{a.label}”</span>
              <span className="appeal-short" aria-hidden="true">
                “{APPEAL_SHORT[a.id] ?? a.label}”
              </span>
            </button>
          ))}
        </div>
      </details>
      {s.appeal === 'safety' && (
        <p className="composer-reason">A promise: hurt on this job, they will hold you to it.</p>
      )}
      <div className="composer-actions">
        {props.onWatch && (
          <button type="button" className="btn watch-village" onClick={props.onWatch}>
            Watch village
          </button>
        )}
        {who && (
          <button type="button" className="btn btn-small btn-ghost" onClick={() => props.onInspect(who)}>
            About {shortName(who)}
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

export function PauseRibbon({
  pause,
  paused = true,
  onResume,
}: {
  pause: PauseInfo;
  paused?: boolean;
  onResume(): void;
}) {
  if (pause.kind === 'start') return null;
  const title = !paused
    ? 'Suggestion pending'
    : pause.kind === 'auto'
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
        {paused ? (
          <>
            Resume <kbd>Space</kbd>
          </>
        ) : (
          'Keep watching'
        )}
      </button>
    </div>
  );
}

/** Injuries said as they happen, newest first (the storm night used to move only the Injuries number). */
export function HurtLine({
  news,
  onShow,
  onRest,
  shownSide,
}: {
  shownSide?: 'classic' | 'human';
  news: readonly HurtNews[];
  onShow?(news: HurtNews): void;
  onRest?(news: HurtNews): void;
}) {
  const [heldNews, setHeldNews] = useState<readonly HurtNews[] | null>(null);
  const shownNews = heldNews ?? news;
  const latestNews = shownNews.at(-1);
  if (!latestNews) return null;
  return (
    <div
      className="hurt-line"
      role="status"
      onPointerDownCapture={() => setHeldNews(shownNews)}
      onPointerCancel={() => setHeldNews(null)}
      onPointerUp={() => window.setTimeout(() => setHeldNews(null), 0)}
    >
      {onShow && (
        <button
          type="button"
          className="hurt-summary"
          aria-label={`Show ${hurtText(latestNews)}`}
          onClick={() => {
            onShow(latestNews);
            setHeldNews(null);
          }}
        >
          Hurt · {shortName(latestNews.personId)} ({latestNews.side === 'human' ? 'Human' : 'Classic'}) · Show
        </button>
      )}
      <strong>Hurt</strong>
      {[...shownNews].reverse().map((n) => (
        <div className="hurt-item" key={`${n.side}-${n.personId}-${n.minute}`}>
          <span>
            {hurtText(n)}
            {shownSide && n.side !== shownSide
              ? ` · ${n.side === 'classic' ? 'Classic' : 'Human'} village · not shown`
              : ''}
          </span>
          {onRest && n.side === 'human' && (
            <button
              type="button"
              className="btn btn-small"
              onClick={() => {
                onRest(n);
                setHeldNews(null);
              }}
            >
              Send {shortName(n.personId)} home
            </button>
          )}
          {onShow && (
            <button
              type="button"
              className="btn btn-small"
              onClick={() => {
                onShow(n);
                setHeldNews(null);
              }}
            >
              Show {shortName(n.personId)}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** "D2 21:10 Tariq (Classic), hurt in the storm, out in the open". */
export function hurtText(n: HurtNews): string {
  const name = (VILLAGERS.find((v) => v.id === n.personId)?.name ?? n.personId).replace(/^Hajja /, '');
  return `${formatClock(n.minute)} ${name} (${n.side === 'classic' ? 'Classic' : 'Human'}), ${n.how}`;
}

const MOMENT_TITLE: Record<number, string> = {
  1: 'Carried home before eating',
  2: 'Same job, different answer',
  3: 'A refusal on principle',
  4: 'Done together',
  5: 'Trust remembered',
};

export function MomentBanner({ moment }: { moment: MomentRecord }) {
  return (
    <div className="moment-banner" role="status" aria-live="polite" key={`${moment.id}-${moment.minute}`}>
      <span className="moment-banner-n">Moment {moment.id}</span>
      <strong>{MOMENT_TITLE[moment.id] ?? ''}</strong>
      <p>{moment.line}</p>
    </div>
  );
}

export { NO_CONCEPT };
