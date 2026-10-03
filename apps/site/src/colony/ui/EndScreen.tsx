import { useEffect, useRef, useState } from 'react';
import { formatClock } from '../sim/world-types.ts';
import { type EndSummary, NO_CONCEPT } from './contract.ts';
import { ordersChanged } from './end-report.ts';
import { CHIP_TEXT, GoalChip, jobPhrase, PLACE_LABEL, shortName } from './parts.tsx';

const STATUS_TEXT: Record<string, string> = {
  active: 'open at the end',
  done: 'done',
  cancelled: 'cancelled',
  lapsed: 'lapsed',
};

/** One day's report: goals for Classic, Human and the Solo control, then character outcomes and moments. */
function Report({ summary, humanKind }: { summary: EndSummary; humanKind: string }) {
  const { scoreboard: sb, solo, character: ch } = summary;
  const share = (kept: number, due: number) => (due > 0 ? `${Math.round((100 * kept) / due)}%` : '–');
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const village: [string, string, string, string][] = [
    ['Meals stored', String(sb.classic.meals), String(sb.human.meals), String(solo.meals)],
    ['House built', `${sb.classic.housePct}%`, `${sb.human.housePct}%`, `${solo.housePct}%`],
    ['Injuries', String(sb.classic.injuries), String(sb.human.injuries), String(solo.injuries)],
  ];
  const character: [string, string, string][] = [
    ['Prayers kept', share(ch.prayersKept, ch.prayersDue), share(solo.prayersKept, solo.prayersDue)],
    ['Morale', ch.morale.toFixed(2), solo.morale.toFixed(2)],
    ['Trust in you', pct(ch.trust), pct(solo.trust)],
  ];
  return (
    <>
      <p className="end-changed">{ordersChanged(summary)}</p>
      <table className="end-table">
        <thead>
          <tr>
            <th>Goal</th>
            <th>Classic</th>
            <th>Human</th>
            <th className="ghost">
              Solo <small>Human, no orders</small>
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.goals.map((g, i) => {
            const solo = summary.soloGoals[i];
            return (
              <tr key={g.id}>
                <th scope="row">{g.label}</th>
                <td>
                  <GoalChip goal={g} side="classic" s={g.classic} />
                </td>
                <td>
                  <GoalChip goal={g} side="human" s={g.human} />
                </td>
                <td className="ghost">{solo ? <GoalChip goal={g} side="solo" s={solo} /> : '–'}</td>
              </tr>
            );
          })}
          {village.map(([label, c, h, s]) => (
            <tr key={label} className="end-row-minor">
              <th scope="row">{label}</th>
              <td>{c}</td>
              <td>{h}</td>
              <td className="ghost">{s}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {summary.cards.length > 0 && (
        <>
          <h3>{summary.day === 3 ? 'Orders given on this day' : 'Your orders'}</h3>
          <ul className="end-orders">
            {summary.cards.map((c) => (
              <li key={c.order.id}>
                <span className="end-order-time">{formatClock(c.order.issuedAt)}</span>{' '}
                <b>{shortName(c.order.personId)}</b> → {PLACE_LABEL[c.order.placeId]},{' '}
                {jobPhrase(c.order.action)} · Classic {CHIP_TEXT[c.classic.state]} · Human{' '}
                {CHIP_TEXT[c.human.state]}
                {c.human.label ? ` (“${c.human.label}”)` : ''} · {STATUS_TEXT[c.status] ?? c.status}
              </li>
            ))}
          </ul>
        </>
      )}
      <h3>Character outcomes</h3>
      <table className="end-table">
        <thead>
          <tr>
            <th />
            <th>Classic</th>
            <th>Human</th>
            <th className="ghost">Solo</th>
          </tr>
        </thead>
        <tbody>
          {character.map(([label, h, s]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td className="no-concept">{NO_CONCEPT}</td>
              <td>{h}</td>
              <td className="ghost">{s}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Moments you saw</h3>
      {summary.moments.length === 0 ? (
        <p className="muted">
          {humanKind === 'placeholder'
            ? 'The Human side is still a placeholder that mirrors Classic, so none of the five moments can happen yet.'
            : 'None of the five moments happened. The suggestions on the clock set them up.'}
        </p>
      ) : (
        <ul className="moments">
          {summary.moments.map((m) => (
            <li key={`${m.id}-${m.minute}`}>
              <span className="moment-n" title={`Moment ${m.id} of 5`}>
                #{m.id}
              </span>
              <div>
                <b>{shortName(m.personId)}</b> · {formatClock(m.minute)}
                <p>{m.line}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function EndScreen(props: {
  summaries: Partial<Record<2 | 3, EndSummary>>;
  humanKind: string;
  canContinue: boolean;
  onContinue(): void;
  onAgain(): void;
  onClose(): void;
}) {
  const days = ([2, 3] as const).filter((d) => props.summaries[d]);
  const latest = days[days.length - 1] ?? 2;
  const [tab, setTab] = useState<2 | 3>(latest);
  useEffect(() => setTab(latest), [latest]);
  const summary = props.summaries[tab] ?? props.summaries[latest];
  const main = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    main.current?.focus();
  }, []);
  if (!summary) return null;
  const offerDay = props.canContinue && latest === 2;
  return (
    <div className="end-backdrop">
      <div className="end" role="dialog" aria-modal="true" aria-labelledby="end-title">
        <p className="eyebrow">Day {tab + 1} · 05:00 · dawn</p>
        <h2 id="end-title">Same orders. Same seed.</h2>
        {days.length > 1 && (
          <div className="end-tabs" role="tablist">
            {days.map((d) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={tab === d}
                className={`end-tab ${tab === d ? 'is-on' : ''}`}
                onClick={() => setTab(d)}
              >
                Day {d} report
              </button>
            ))}
          </div>
        )}
        <Report summary={summary} humanKind={props.humanKind} />
        <div className="end-actions">
          {offerDay && (
            <button type="button" className="btn" onClick={props.onContinue} ref={main}>
              Another day
            </button>
          )}
          <button
            type="button"
            className={offerDay ? 'btn btn-ghost' : 'btn'}
            onClick={props.onAgain}
            ref={offerDay ? undefined : main}
          >
            Play again
          </button>
          <button type="button" className="btn btn-ghost" onClick={props.onClose}>
            Look at the villages
          </button>
          <a className="btn btn-ghost" href="/">
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
