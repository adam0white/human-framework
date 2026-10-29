import { useEffect, useRef, useState } from 'react';
import { CastOffer } from '../../shared/CastOffer.tsx';
import { wellWords as settingWords } from './words.ts';
import './feedback.css';
import { EndTally } from '../../shared/EndTally.tsx';
import type { HindsightReply, HindsightRequest } from '../hindsight-worker.ts';
import type { Hindsight } from '../sim/hindsight.ts';
import { formatClock } from '../sim/world-types.ts';
import { dayClock, type EndSummary, NO_CONCEPT } from './contract.ts';
import { moodDescription, trustDescription } from './descriptions.ts';
import {
  cardEnd,
  classicOutcome,
  hindsightLine,
  humanOutcome,
  humanQuotes,
  nearMisses,
  ordersChanged,
} from './end-report.ts';
import { wellTally } from './end-tally.ts';
import { Icon, NoConcept } from './Icon.tsx';
import { OrderWorkEvents } from './OrderWorkEvents.tsx';
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
    <section className="end-hindsight" aria-label="One plan replayed">
      {misses.length > 0 && (
        <ul className="end-misses">
          {misses.map((m) => (
            <li key={`${m.side}-${m.text}`}>
              <b>{settingWords(m.side)}</b> {settingWords(m.text)}
            </li>
          ))}
        </ul>
      )}
      {h.kind !== 'idle' && (
        <details className="end-fold">
          <summary>One plan replayed</summary>
          <p>
            We try one plan that repeatedly sends Rush orders, from four possible starting times. This does
            not compare every plan or score care for prayer and rest.
          </p>
          <p className="end-won" aria-live="polite">
            <b>One plan replayed (Human):</b>{' '}
            {settingWords(
              h.kind === 'working'
                ? 'Trying a simple plan from the same starting conditions…'
                : h.kind === 'error'
                  ? 'This browser could not try the plan.'
                  : h.result
                    ? hindsightLine(h.result)
                    : 'Sending everyone except Maryam to the house with Rush did not win from any point we tried.',
            )}
          </p>
        </details>
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
    ['Morale', moodDescription(ch.morale), moodDescription(solo.morale)],
    ['Trust in you', trustDescription(ch.trust), trustDescription(solo.trust)],
  ];
  return (
    <>
      <table className="end-table">
        <thead>
          <tr>
            <th>Goal</th>
            <th>Classic</th>
            <th>Human</th>
            <th className="ghost">
              without you <small>Human, no orders</small>
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.goals.map((g, i) => {
            const solo = summary.soloGoals[i];
            return (
              <tr key={g.id}>
                <th scope="row">
                  {settingWords(g.label)}
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
                {settingWords(label)}
                <span className="end-when">{settingWords(when)}</span>
              </th>
              <td>{settingWords(c)}</td>
              <td>{settingWords(h)}</td>
              <td className="ghost">{settingWords(s)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="end-changed">{ordersChanged(summary)}</p>
      {summary.deadline.human.roofAt === null &&
        summary.goals.some((g) => g.id === 'roof' && g.human.status === 'failed') && (
          <p>
            The Human roof is unfinished. No whole-roof finish-time estimate is available. Future work choices
            can change the time.
          </p>
        )}
      <HindsightBlock summary={summary} />
      {summary.cards.length > 0 && (
        <details className="end-fold">
          <summary>Your orders{summary.day === 3 ? ' on this day' : ''}</summary>
          <ul className="end-orders">
            {summary.cards.map((c) => (
              <li key={c.order.id}>
                <span className="end-order-time">{formatClock(c.order.issuedAt)}</span>{' '}
                <b>{shortName(c.order.personId)}</b> → {PLACE_LABEL[c.order.placeId]},{' '}
                {jobPhrase(c.order.action)} · Classic {settingWords(classicOutcome(c))} · Human{' '}
                <span className={`end-says says-${c.human.state}`}>{settingWords(humanOutcome(c))}</span>
                {settingWords(humanQuotes(c) ? ` (${humanQuotes(c)})` : '')}
                {settingWords(cardEnd(c) ? ` · ${cardEnd(c)}` : '')}
                <OrderWorkEvents events={c.human.workEvents} />
              </li>
            ))}
          </ul>
        </details>
      )}
      <h3>Character outcomes</h3>
      <table className="end-table">
        <thead>
          <tr>
            <th />
            <th>Classic</th>
            <th>Human</th>
            <th className="ghost">without you</th>
          </tr>
        </thead>
        <tbody>
          {character.map(([label, h, s]) => (
            <tr key={label}>
              <th scope="row">{settingWords(label)}</th>
              <td className="no-concept">
                <NoConcept text={NO_CONCEPT} />
              </td>
              <td>{settingWords(h)}</td>
              <td className="ghost">{settingWords(s)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="no-concept-legend">
        <span className="no-concept-mark">
          <Icon name="none" />
        </span>{' '}
        {settingWords(NO_CONCEPT)}: the point of the comparison.
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
              <span className="moment-n" title={settingWords(`Moment ${m.id} of 5`)}>
                #{m.id}
              </span>
              <div>
                <b>{shortName(m.personId)}</b> · {formatClock(m.minute)}
                <p>{settingWords(m.line)}</p>
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
  tally?: boolean;
  humanKind: string;
  canContinue: boolean;
  onContinue(): void;
  onAgain?: () => void;
  onClose(): void;
  onFeedback?: () => void;
  /** Download this run as a playtest file. */
  onDownload?: () => void;
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
    <div className="end-backdrop colony-report-backdrop">
      <div className="end colony-report" role="dialog" aria-modal="true" aria-labelledby="end-title">
        <div className="colony-report-body">
          <p className="eyebrow">Day {tab + 1} · 05:00 · dawn</p>
          <h2 id="end-title" ref={head} tabIndex={-1}>
            Both villages received the same orders and started in the same conditions.
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
          {props.tally ? <EndTally title="The village scores" lines={wellTally(summary)} /> : null}
          <div className="colony-report-body-footer">
            <button type="button" className="btn btn-ghost" onClick={props.onClose}>
              Look at the villages
            </button>
            {offerDay && props.onAgain && (
              <button type="button" className="btn btn-ghost" onClick={props.onAgain}>
                Play again
              </button>
            )}
          </div>
        </div>
        <div className="colony-report-actions">
          <CastOffer game="well" />
          <div className="colony-report-secondaries">
            {props.onFeedback && (
              <button type="button" className="btn btn-ghost" onClick={props.onFeedback}>
                Feedback
              </button>
            )}
          </div>
          {(offerDay || props.onAgain) && (
            <button type="button" className="btn" onClick={offerDay ? props.onContinue : props.onAgain}>
              {offerDay ? 'Another day' : 'Play again'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
