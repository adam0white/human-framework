import type { ReactNode } from 'react';
import { settingWords } from '../../shared/setting-words.ts';
import type { HurtNews } from '../sim/game.ts';
import type { Prediction } from '../sim/human-side.ts';
import type { PlaceId } from '../sim/map.ts';
import { APPEALS, type AppealChip, type OrderCard, type OrderInput } from '../sim/orders.ts';
import { VILLAGERS, type VillagerId, villagerById } from '../sim/world-types.ts';
import { dayClock, type Frame, NO_CONCEPT } from './contract.ts';
import { activityDescription, moodDescription, trustDescription } from './descriptions.ts';
import { RingTimer } from './Icon.tsx';
import { homeOrderMeaning, latestPersonOrder } from './order-status.ts';
import {
  CHIP_TEXT,
  GoalBars,
  hurtText,
  inferredJob,
  jobPhrase,
  OrderLog,
  PLACE_LABEL,
  Portrait,
  shortName,
} from './parts.tsx';
import { VILLAGE_WORDS } from './village-words.ts';

export const JOB_SHORT: Record<string, string> = {
  'gather-timber': 'timber',
  'gather-grain': 'grain',
  'fell-cedar': 'fell',
  'draw-water': 'water',
  'raise-beam': 'raise beam',
  'shutter-house': 'shutter',
  build: 'build',
  cook: 'cook',
  eat: 'eat',
  sleep: 'sleep',
  pray: 'pray',
  shelter: 'shelter',
};
export function placesFor(id: VillagerId, rules = 7): PlaceId[] {
  const home = villagerById(id)?.home ?? 'home-yusuf';
  return [
    'site',
    'forest',
    'cedar',
    'field',
    'well',
    'kitchen',
    'masjid',
    rules >= 8 && home === 'wellhouse' ? 'home-idris' : home,
  ];
}
export function riskyPlace(frame: Frame, place: PlaceId): string | null {
  const jobs = (['human', 'classic'] as const).map((side) => inferredJob(frame, place, side));
  if (jobs.includes('fell-cedar')) return 'The cedar can injure whoever fells it.';
  if (jobs.includes('raise-beam')) return 'Raising the roof beam can injure the builder.';
  if (jobs.includes('shutter-house')) return 'Shuttering the house is risky work.';
  if (
    ['squall', 'storm'].includes(frame.weather.kind) &&
    ['forest', 'cedar', 'field', 'site', 'well'].includes(place)
  )
    return 'Outdoor work in this weather can injure them.';
  return null;
}
function glyph(state: string) {
  return state === 'willNot' || state === 'cannot' || state === 'noop'
    ? '✗'
    : state === 'pending'
      ? '…'
      : state === 'notNow'
        ? '◷'
        : '✓';
}
export function Status({ card }: { card: OrderCard }) {
  return (
    <span className="well-answer-pair">
      {(['classic', 'human'] as const).map((side) => (
        <span key={side} className={`chip chip-${card[side].state}`}>
          {side === 'classic' ? 'C' : 'H'}
          {settingWords(glyph(card[side].state))}{' '}
          {settingWords(
            card[side].settled && ['ok', 'assent', 'complied', 'done'].includes(card[side].state)
              ? card[side].state === 'complied'
                ? 'done under protest'
                : 'done'
              : CHIP_TEXT[card[side].state],
          )}
        </span>
      ))}
    </span>
  );
}
export function StateStrip({ frame, pace, onOpen }: { frame: Frame | null; pace: string; onOpen(): void }) {
  return (
    <section className="well-state">
      <button type="button" className="well-goals" aria-label="Where the villages stand" onClick={onOpen}>
        {frame?.goals.map((g) => (
          <span className="well-goal" key={g.id}>
            <span className="well-goal-icon" aria-hidden="true">
              {g.id === 'roof' || g.id === 'project' ? '⌂' : g.id === 'stock' ? '▤' : '♥'}
            </span>
            <GoalBars goal={g} />
            <small className="well-deadline">by {dayClock(g.deadlineMinute)}</small>
          </span>
        ))}
      </button>
      <p className="well-pace" role="status">
        {settingWords(pace)}
      </p>
    </section>
  );
}
export function SheetHeader({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack?(): void;
  children?: ReactNode;
}) {
  return (
    <header className="well-sheet-head">
      {onBack && (
        <button type="button" aria-label="Back to people" onClick={onBack}>
          ←
        </button>
      )}
      <h2>{settingWords(title)}</h2>
      {children}
    </header>
  );
}
export function People({
  frame,
  onPick,
  onOrders,
  onStand,
}: {
  frame: Frame;
  onPick(id: VillagerId): void;
  onOrders(): void;
  onStand(): void;
}) {
  return (
    <>
      <button type="button" className="well-village-heading" onClick={onStand}>
        <strong>Human village · {moodDescription(frame.scoreboard.human.morale)}</strong>
        <small>{VILLAGE_WORDS[frame.village].season}</small>
      </button>
      <div className="well-people">
        {VILLAGERS.map((v) => {
          const p = frame.human.find((p) => p.id === v.id);
          const card = latestPersonOrder(frame.cards, v.id);
          return (
            <button type="button" key={v.id} data-person={v.id} onClick={() => onPick(v.id)}>
              <Portrait id={v.id} />
              <span>
                <strong>{shortName(v.id)}</strong>
                <small>{settingWords(activityDescription(p?.label ?? 'waiting'))}</small>
              </span>
              {card && (
                <span
                  className="well-person-glyphs"
                  role="img"
                  aria-label={settingWords(
                    `Classic ${CHIP_TEXT[card.classic.state]}, Human ${CHIP_TEXT[card.human.state]}`,
                  )}
                >
                  C{settingWords(glyph(card.classic.state))} H{settingWords(glyph(card.human.state))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button type="button" className="well-orders-row" onClick={onOrders}>
        All orders ({frame.cards.filter((c) => c.status !== 'cancelled').length}) <span>›</span>
      </button>
    </>
  );
}
export function Stand({ frame, onBack }: { frame: Frame; onBack(): void }) {
  const c = frame.scoreboard.classic,
    h = frame.scoreboard.human;
  const rows = [
    ['Roof', `${frame.classicWorld.houseStage} of 10`, `${frame.humanWorld.houseStage} of 10`],
    ['Meals', c.meals, h.meals],
    ['Injuries', c.injuries, h.injuries],
    ['Alive', c.alive, h.alive],
    ['Mood', NO_CONCEPT, moodDescription(h.morale)],
    ['Trust', NO_CONCEPT, trustDescription(h.trust)],
    ['Prayers kept', NO_CONCEPT, `${h.prayersKept} of ${h.prayersDue}`],
  ];
  return (
    <>
      <SheetHeader title="Where the villages stand" onBack={onBack} />
      <div className="well-reading">
        <table className="well-stand">
          <thead>
            <tr>
              <th> </th>
              <th>Classic</th>
              <th>Human</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, c, h]) => (
              <tr key={name}>
                <th>{name}</th>
                <td>
                  {name === 'Roof' && (
                    <progress aria-label="Classic roof" value={frame.classicWorld.houseStage} max={10} />
                  )}
                  {c === NO_CONCEPT ? '∅ ' : ''}
                  {c}
                </td>
                <td>
                  {name === 'Roof' && (
                    <progress aria-label="Human roof" value={frame.humanWorld.houseStage} max={10} />
                  )}
                  {h}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>The roof and meals are judged at 19:00 on day 2. Everyone must be alive at dawn on day 3.</p>
        <button type="button" aria-label="Close village comparison" onClick={onBack}>
          ×
        </button>
      </div>
    </>
  );
}
export function News({ news, onShow }: { news: readonly HurtNews[]; onShow(n: HurtNews): void }) {
  return (
    <div className="well-news-list">
      {[...news].reverse().map((n) => (
        <div key={`${n.minute}-${n.side}-${n.personId}`}>
          <p>{settingWords(hurtText(n))}</p>
          <button type="button" onClick={() => onShow(n)}>
            Show {shortName(n.personId)}
          </button>
          {n.side === 'human' && (
            <button type="button" onClick={() => onShow(n)}>
              {shortName(n.personId)} · Home
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
export function Orders({
  frame,
  onBack,
  onShow,
  onCancel,
}: {
  frame: Frame;
  onBack(): void;
  onShow(n: HurtNews): void;
  onCancel(id: string): void;
}) {
  return (
    <>
      <SheetHeader
        title={settingWords(`All orders (${frame.cards.filter((c) => c.status !== 'cancelled').length})`)}
        onBack={onBack}
      />
      <div className="well-reading">
        <News news={frame.news} onShow={onShow} />
        <OrderLog cards={frame.cards} onCancel={onCancel} />
      </div>
    </>
  );
}
export function PersonSheet({
  frame,
  id,
  rush,
  insist,
  appeal,
  appealOpen,
  pending,
  asked,
  forecasts,
  onBack,
  onRush,
  onInsist,
  onAppeal,
  onAppealOpen,
  onAbout,
  onPlace,
  onHover,
  onConfirm,
  onCancelRisk,
  onCancel,
  onRepeat,
  outline,
}: {
  frame: Frame;
  id: VillagerId;
  rush: boolean;
  insist: boolean;
  appeal: AppealChip | null;
  appealOpen: boolean;
  pending: PlaceId | null;
  asked: PlaceId | null;
  forecasts: Partial<Record<PlaceId, { input: OrderInput; prediction: Prediction }>>;
  onBack(): void;
  onRush(): void;
  onInsist(): void;
  onAppeal(a: AppealChip | null): void;
  onAppealOpen(): void;
  onAbout(): void;
  onPlace(p: PlaceId): void;
  onHover(p: PlaceId | null): void;
  onConfirm(): void;
  onCancelRisk(): void;
  onCancel(id: string): void;
  onRepeat(card: OrderCard): void;
  outline: PlaceId | null;
}) {
  const h = frame.human.find((p) => p.id === id),
    c = frame.classic.find((p) => p.id === id),
    card = latestPersonOrder(frame.cards, id);
  const refused = card && ['willNot', 'notNow'].includes(card.human.state);
  const places = placesFor(id, frame.rules);
  if (outline?.startsWith('home-')) places.unshift(...places.splice(7, 1));
  return (
    <>
      <SheetHeader
        title={settingWords(`${shortName(id)} · H: ${h?.label ?? 'waiting'} · C: ${c?.label ?? 'waiting'}`)}
        onBack={onBack}
      />
      <div className="well-person-body">
        <section className="well-latest" aria-label="Latest order">
          {card ? (
            <>
              <div>
                <strong>
                  Latest · {PLACE_LABEL[card.order.placeId]} · {jobPhrase(card.order.action)}
                </strong>
                <Status card={card} />
              </div>
              <div className="well-reply-row">
                <p>{card.human.says ?? card.human.label ?? 'Waiting for an answer.'}</p>
                {refused ? (
                  <button type="button" onClick={() => onRepeat(card)}>
                    Insist on it
                  </button>
                ) : card.status === 'active' ? (
                  <button type="button" onClick={() => onCancel(card.order.id)}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <p>Choose a place. Each order goes to both villages.</p>
          )}
        </section>
        <div className="well-how">
          <button type="button" aria-pressed={rush} onClick={onRush}>
            Rush
          </button>
          <button type="button" aria-pressed={insist} onClick={onInsist}>
            Insist
          </button>
          <button type="button" aria-expanded={appealOpen} onClick={onAppealOpen}>
            {appeal ? `Appeal: ${appeal}` : 'Appeal ▾'}
          </button>
          <button type="button" onClick={onAbout}>
            About
          </button>
        </div>
        {pending ? (
          <div className="well-risk">
            <strong>
              {shortName(id)} → {PLACE_LABEL[pending]} · {jobPhrase(inferredJob(frame, pending))}
            </strong>
            <p>
              {settingWords(riskyPlace(frame, pending))} Human:{' '}
              {forecasts[pending]?.prediction.text ?? 'checking the answer…'}
            </p>
            <button type="button" className="well-send-anyway" onClick={onConfirm}>
              Send anyway
            </button>
            <button type="button" onClick={onCancelRisk}>
              Back
            </button>
          </div>
        ) : appealOpen ? (
          <div className="well-appeals">
            {APPEALS.map((a) => (
              <button type="button" key={a.id} aria-pressed={appeal === a.id} onClick={() => onAppeal(a.id)}>
                {a.id === 'children' ? 'For the children' : a.id === 'duty' ? 'Duty' : "You'll be safer"}
              </button>
            ))}
            <button type="button" onClick={() => onAppeal(null)}>
              No appeal
            </button>
          </div>
        ) : (
          <div className="well-places">
            {places.map((p) => {
              const risk = riskyPlace(frame, p),
                prediction = forecasts[p];
              const match =
                prediction?.input.personId === id &&
                Boolean(prediction.input.rush) === rush &&
                Boolean(prediction.input.insist) === insist &&
                (prediction.input.appeal ?? null) === appeal;
              const kind = match ? prediction.prediction.kind : null;
              const answer = risk
                ? '⚠ risky'
                : kind === 'willNot' || kind === 'cannot'
                  ? "✗ won't"
                  : kind === 'notNow'
                    ? '◷ later'
                    : kind
                      ? '✓ yes'
                      : '…';
              return (
                <button
                  type="button"
                  key={p}
                  className={outline === p ? 'is-outlined' : ''}
                  aria-pressed={asked === p}
                  onClick={() => onPlace(p)}
                  onPointerEnter={() => onHover(p)}
                  onPointerLeave={() => onHover(null)}
                >
                  <strong>{PLACE_LABEL[p]}</strong>
                  <span>{settingWords(JOB_SHORT[inferredJob(frame, p)] ?? inferredJob(frame, p))}</span>
                  <small title={settingWords(match ? prediction.prediction.text : undefined)}>
                    {settingWords(answer)}
                    <span className="well-forecast-long">
                      {settingWords(match && kind === 'notNow' ? `: ${prediction.prediction.text}` : '')}
                    </span>
                  </small>
                </button>
              );
            })}
          </div>
        )}
        {card && (
          <div className="well-order-notes">
            {homeOrderMeaning(card) && <p>{homeOrderMeaning(card)}</p>}
            {card.order.insist && <p>Insist was used. Asking again may cost trust.</p>}
            {(card.human.state === 'complied' || card.human.first?.state === 'complied') && (
              <p>{shortName(id)} went along, but minded being pushed.</p>
            )}
            {h?.trust.history
              .filter((e) => e.minute > card.order.issuedAt && e.delta < 0)
              .map((e) => (
                <p key={`${e.minute}-${e.label}`}>
                  {shortName(id)} trusts you less. {settingWords(e.label)}.
                </p>
              ))}
          </div>
        )}
      </div>
    </>
  );
}
export { RingTimer };
