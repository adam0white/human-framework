import { useEffect, useRef } from 'react';
import type { EndSummary } from '../sim/game.ts';
import { formatClock } from '../sim/world-types.ts';
import { shortName } from './parts.tsx';

export function EndScreen(props: {
  summary: EndSummary;
  humanKind: string;
  onAgain(): void;
  onClose(): void;
}) {
  const { scoreboard: sb, solo } = props.summary;
  const again = useRef<HTMLButtonElement>(null);
  const { onClose } = props;
  // A modal: focus its main action, close on Escape (the opener gets focus back from App).
  useEffect(() => {
    again.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  // Prayers are counted per person per prayer time; a share reads plainly where "50/50" does not.
  const share = (kept: number, due: number) => (due > 0 ? `${Math.round((100 * kept) / due)}%` : '—');
  const rows: [string, string, string, string][] = [
    ['Meals stored', String(sb.classic.meals), String(sb.human.meals), String(solo.meals)],
    ['House built', `${sb.classic.housePct}%`, `${sb.human.housePct}%`, `${solo.housePct}%`],
    ['Injuries', String(sb.classic.injuries), String(sb.human.injuries), String(solo.injuries)],
    [
      'Prayers kept',
      '—',
      share(sb.human.prayersKept, sb.human.prayersDue),
      share(solo.prayersKept, solo.prayersDue),
    ],
    ['Morale', '—', sb.human.morale.toFixed(2), solo.morale.toFixed(2)],
    ['Trust in you', '—', pct(sb.human.trust), pct(solo.trust)],
    ['Alive', String(sb.classic.alive), String(sb.human.alive), String(solo.alive)],
  ];
  return (
    <div className="end-backdrop" role="dialog" aria-modal="true" aria-labelledby="end-title">
      <div className="end">
        <p className="eyebrow">Day 3 · 05:00 · dawn</p>
        <h2 id="end-title">Same orders. Same seed.</h2>
        <table className="end-table">
          <thead>
            <tr>
              <th />
              <th>Classic</th>
              <th>Human</th>
              <th className="ghost">
                Solo <small>no orders</small>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, c, h, s]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{c}</td>
                <td>{h}</td>
                <td className="ghost">{s}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>Moments you saw</h3>
        {props.summary.moments.length === 0 ? (
          <p className="muted">
            {props.humanKind === 'placeholder'
              ? 'The Human side is still a placeholder that mirrors Classic, so none of the five moments can happen yet.'
              : 'None of the five moments happened this run. Try the cards on the clock next time.'}
          </p>
        ) : (
          <ul className="moments">
            {props.summary.moments.map((m) => (
              <li key={`${m.id}-${m.minute}`}>
                <span className="moment-n">{m.id}</span>
                <div>
                  <b>{shortName(m.personId)}</b> · {formatClock(m.minute)}
                  <p>{m.line}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="end-actions">
          <button type="button" className="btn" onClick={props.onAgain} ref={again}>
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
