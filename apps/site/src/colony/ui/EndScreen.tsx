import { useEffect, useRef, useState } from 'react';
import type { HindsightReply, HindsightRequest } from '../hindsight-worker.ts';
import type { Hindsight } from '../sim/hindsight.ts';
import { formatClock } from '../sim/world-types.ts';
import { dayClock, type EndSummary, NO_CONCEPT } from './contract.ts';
import {
  cardEnd,
  classicOutcome,
  hindsightLine,
  humanOutcome,
  humanQuotes,
  nearMisses,
  ordersChanged,
  pct,
  share,
} from './end-report.ts';
import { Icon, NoConcept } from './Icon.tsx';
import { GoalChip, jobPhrase, PLACE_LABEL, shortName } from './parts.tsx';

type HindsightState =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'done'; result: Hindsight | null }
  | { kind: 'error' };

/**
 * The hindsight replay for a Day-2 report with a missed Human goal, in its own worker (started on first show,
 * stopped when the report goes). Deterministic: the worker replays the seed and the log; nothing else enters it.
 */
function useHindsight(summary: EndSummary): HindsightState {
  const missed = summary.day === 2 && summary.goals.some((g) => g.human.status !== 'met');
  const [state, setState] = useState<HindsightState>({ kind: 'idle' });
  useEffect(() => {
    if (!missed) {
      setState({ kind: 'idle' });
      return undefined;
    }
    setState({ kind: 'working' });
    let w: Worker;
    try {
      w = new Worker(new URL('../hindsight-worker.ts', import.meta.url), { type: 'module' });
    } catch {
      setState({ kind: 'error' });
      return undefined;
    }
    w.addEventListener('message', (e: MessageEvent<HindsightReply>) => {
      setState(e.data.ok ? { kind: 'done', result: e.data.result } : { kind: 'error' });
      w.terminate();
    });
    w.addEventListener('error', () => setState({ kind: 'error' }));
    w.postMessage({ seed: summary.seed, log: summary.log } satisfies HindsightRequest);
    return () => w.terminate();
  }, [missed, summary]);
  return state;
}

function HindsightBlock({ summary }: { summary: EndSummary }) {
  const h = useHindsight(summary);
  const misses = nearMisses(summary);
  if (h.kind === 'idle' && misses.length === 0) return null;
  return (
    <section className="end-hindsight" aria-label="What would have won">
      {misses.length > 0 && (
        <ul className="end-misses">
          {misses.map((m) => (
            <li key={`${m.side}-${m.text}`}>
              <b>{m.side}</b> {m.text}
            </li>
          ))}
        </ul>
      )}
      {h.kind !== 'idle' && (
        <p className="end-won" aria-live="polite">
          <b>What would have won (Human):</b>{' '}
          {h.kind === 'working'
            ? 'replaying this seed with a simple plan…'
            : h.kind === 'error'
              ? 'the replay could not run in this browser.'
              : h.result
                ? hindsightLine(h.result)
                : 'the simple plan (everyone but Maryam rushed to the house) did not win from any point we tried.'}
        </p>
      )}
    </section>
  );
}

/** One day's report: goals for Classic, Human and the Solo control, then character outcomes and moments. */
function Report({ summary, humanKind }: { summary: EndSummary; humanKind: string }) {
  const { scoreboard: sb, solo, character: ch } = summary;
  // These rows are read at the end of the run, after the storm; the goal rows above them are judged at their
  // deadline (the roof at 19:00, before the storm). A house can read 9/10 at the deadline and 100% at dawn.
  const end = summary.day === 3 ? 'Day 4 dawn' : 'Day 3 dawn';
  const village: [string, string, string, string, string][] = [
    ['Meals stored', end, String(sb.classic.meals), String(sb.human.meals), String(solo.meals)],
    [
      'House built',
      `${end}, after the storm`,
      `${sb.classic.housePct}%`,
      `${sb.human.housePct}%`,
      `${solo.housePct}%`,
    ],
    [
      'Injuries',
      'over the run',
      String(sb.classic.injuries),
      String(sb.human.injuries),
      String(solo.injuries),
    ],
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
                <th scope="row">
                  {g.label}
                  <span className="end-when">judged {dayClock(g.deadlineMinute)}</span>
                </th>
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
          {village.map(([label, when, c, h, s]) => (
            <tr key={label} className="end-row-minor">
              <th scope="row">
                {label}
                <span className="end-when">{when}</span>
              </th>
              <td>{c}</td>
              <td>{h}</td>
              <td className="ghost">{s}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <HindsightBlock summary={summary} />
      {summary.cards.length > 0 && (
        <>
          <h3>{summary.day === 3 ? 'Orders given on this day' : 'Your orders'}</h3>
          <ul className="end-orders">
            {summary.cards.map((c) => (
              <li key={c.order.id}>
                <span className="end-order-time">{formatClock(c.order.issuedAt)}</span>{' '}
                <b>{shortName(c.order.personId)}</b> → {PLACE_LABEL[c.order.placeId]},{' '}
                {jobPhrase(c.order.action)} · Classic {classicOutcome(c)} · Human{' '}
                <span className={`end-says says-${c.human.state}`}>{humanOutcome(c)}</span>
                {humanQuotes(c) ? ` (${humanQuotes(c)})` : ''}
                {cardEnd(c) ? ` · ${cardEnd(c)}` : ''}
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
              <td className="no-concept">
                <NoConcept text={NO_CONCEPT} />
              </td>
              <td>{h}</td>
              <td className="ghost">{s}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="no-concept-legend">
        <span className="no-concept-mark">
          <Icon name="none" />
        </span>{' '}
        {NO_CONCEPT}: the point of the comparison.
      </p>
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
  // Focus the heading so the dialog opens at its top (focusing the buttons scrolled the headline away).
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    head.current?.focus();
  }, []);
  if (!summary) return null;
  const offerDay = props.canContinue && latest === 2;
  return (
    <div className="end-backdrop">
      <div className="end" role="dialog" aria-modal="true" aria-labelledby="end-title">
        <p className="eyebrow">Day {tab + 1} · 05:00 · dawn</p>
        <h2 id="end-title" ref={head} tabIndex={-1}>
          Same orders. Same seed.
        </h2>
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
            <button type="button" className="btn" onClick={props.onContinue}>
              Another day
            </button>
          )}
          <button type="button" className={offerDay ? 'btn btn-ghost' : 'btn'} onClick={props.onAgain}>
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
