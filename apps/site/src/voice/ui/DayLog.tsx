import { voiceWords as settingWords } from './words.ts';
/**
 * The day, in his narration (voice.md §7.2). Scrolls inside its own panel. A spoken answer holds the transcript until Latest, another answer or a new request;
 * the simulation clock runs on. The held snapshot survives the worker trimming its recent log. Consecutive entries of the same action collapse into one line with a time span.
 */

import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BeatKind, LogEntry } from '../protocol.ts';
import { type ConversationMoment, conversationFor, type SpokenLine } from './conversations.ts';
import { storyDates } from './dates.ts';
import { BEAT_ICON, Icon, TONE_ICON, TONE_WORD, VOICE_ICON } from './Icon.tsx';
import { toneClass, VOICE_COLOURS, VOICE_NAMES } from './parts.tsx';
import { explainTerms } from './terms.tsx';

interface Row {
  entry: LogEntry;
  /** Clock of the last entry folded into this one. */
  to?: string;
  count: number;
}

function collapse(log: LogEntry[]): Row[] {
  const rows: Row[] = [];
  for (const e of log) {
    const prev = rows[rows.length - 1];
    if (prev && e.kind === 'act' && prev.entry.kind === 'act' && prev.entry.text === e.text && !e.beat) {
      prev.to = e.until ?? e.clock;
      prev.count += 1;
      if (e.decisionId) prev.entry = { ...prev.entry, decisionId: e.decisionId };
      continue;
    }
    rows.push({ entry: e, count: 1 });
  }
  return rows;
}

const BEAT_LABEL: Record<BeatKind, string> = {
  wake: 'awake',
  verdict: 'his answer',
  voice: 'another voice',
  craving: 'a pull',
  'close-call': 'torn',
  'duty-risk': 'running late',
  recall: 'memory',
  'day-end': 'day’s end',
  eid: 'Eid',
};

export const DayLog = memo(function DayLog({
  log,
  pauseBeat,
  paused,
  slowed = false,
  onWhy,
  selected,
  onRetainWhy,
  moment,
  day,
}: {
  log: LogEntry[];
  /** R2 (Aisha): Today shows today. Earlier days stay in the log for conversation context only. */
  day?: number;
  moment?: ConversationMoment;
  pauseBeat?: { kind: BeatKind; text: string };
  paused: boolean;
  slowed?: boolean;
  onWhy: (decisionId: string) => void;
  selected?: string | null;
  onRetainWhy?: (decisionId: string) => void;
}) {
  const [retainedAnswer, setHeld] = useState<LogEntry[] | null>(null);
  const held = day === undefined || retainedAnswer?.at(-1)?.day === day ? retainedAnswer : null;
  const seen = useRef<string | undefined>(undefined);
  const visible = held ?? log;
  // Presentation-only snapshots stay fixed while a row is retained, even when its earlier context is trimmed.
  const scenes = useRef(new Map<string, SpokenLine[]>());
  const retained = new Set([...log, ...(held ?? [])].map((e) => e.id));
  for (const id of scenes.current.keys()) if (!retained.has(id)) scenes.current.delete(id);
  for (const entry of log) {
    if (!scenes.current.has(entry.id) || (entry.connection && scenes.current.get(entry.id)?.length === 0))
      scenes.current.set(entry.id, conversationFor(entry, log, moment));
  }
  const rows = useMemo(
    () => collapse(day === undefined ? visible : visible.filter((e) => e.day >= day)),
    [visible, day],
  );
  useLayoutEffect(() => {
    if (retainedAnswer && !held) setHeld(null);
    const previous = seen.current;
    seen.current = log.at(-1)?.id;
    const start = previous ? log.findIndex((e) => e.id === previous) + 1 : 0;
    const answerIndex = log.findLastIndex((e, i) => i >= start && e.kind === 'answer');
    const answer = log[answerIndex];
    // A new request replaces the reading. Autonomous tasks update the status without discarding his words.
    const replaced = log.some((e, i) => i >= start && i > answerIndex && e.kind === 'you');
    if (replaced) {
      if (held) setHeld(null);
      return;
    }
    if (answerIndex >= 0) {
      setHeld(log.slice(0, answerIndex + 1));
      if (answer?.decisionId) onRetainWhy?.(answer.decisionId);
    }
  }, [log, held, retainedAnswer, onRetainWhy]);
  const scroller = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(true);
  const [jump, setJump] = useState(0);
  const jumped = useRef(0);
  const readScene = useRef<string | undefined>(undefined);
  const lastId = visible.at(-1)?.id;

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-stick whenever a new entry lands.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !stuck) return;
    const recent = rows.slice(-4).findLast(({ entry }) => (scenes.current.get(entry.id)?.length ?? 0) > 0);
    const newScene = recent && recent.entry.id !== readScene.current;
    readScene.current = recent?.entry.id;
    if (jump !== jumped.current) {
      jumped.current = jump;
      el.scrollTop = el.scrollHeight;
      return;
    }
    const scene = newScene ? [...el.querySelectorAll<HTMLElement>('.v-log-scene')].at(-1) : undefined;
    // A new conversation starts at its first line. Later task rows keep following Latest.
    el.scrollTop = scene
      ? el.scrollTop + scene.getBoundingClientRect().top - el.getBoundingClientRect().top
      : el.scrollHeight;
  }, [lastId, stuck, jump]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    setStuck(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
  };

  const heldAnswer = held?.at(-1);
  const newerTask = heldAnswer
    ? log.findLast((e) => e.kind === 'act' && e.minute > heldAnswer.minute)
    : undefined;

  return (
    <section className="v-day" aria-label="The day">
      {held && (
        <div className={newerTask ? 'v-earlier-answer' : 'v-reading'}>
          {newerTask ? 'Earlier answer' : 'Reading his answer'} · {heldAnswer?.clock}.
          {newerTask && (
            <>
              {' '}
              Latest task at {newerTask.clock}: {explainTerms(newerTask.text)}
            </>
          )}{' '}
          {paused ? 'Clock paused.' : slowed ? 'Clock slowed while you read.' : 'Clock continues.'}
        </div>
      )}
      {!held && pauseBeat && paused && (
        <div className={`v-beat v-beat-${pauseBeat.kind}`} role="status">
          <span className="v-beat-kind">
            <Icon name={BEAT_ICON[pauseBeat.kind]} size={18} />
            {settingWords(BEAT_LABEL[pauseBeat.kind])}
          </span>
          <span className="v-beat-text">{explainTerms(pauseBeat.text)}</span>
          <kbd>Space</kbd>
        </div>
      )}
      <div className="v-log" ref={scroller} onScroll={onScroll}>
        {rows.length === 0 && <p className="v-log-empty">Nothing yet today.</p>}
        <ol>
          {rows.map(({ entry: e, to, count }) => {
            const exchange = scenes.current.get(e.id) ?? [];
            const voice = e.who !== 'halil' ? e.who : null;
            const clickable = Boolean(e.decisionId) && (e.kind === 'act' || e.kind === 'answer');
            const information = clickable ? (
              <button
                type="button"
                className="v-scene-why"
                aria-label={settingWords(`Why his action at ${e.clock}?`)}
                aria-pressed={e.decisionId === selected}
                onClick={() => e.decisionId && onWhy(e.decisionId)}
              >
                i
              </button>
            ) : null;
            const body = (
              <>
                <span className="v-log-clock">{e.clock}</span>
                <span className="v-log-text">
                  {e.kind === 'answer' && e.tone && (
                    <Icon
                      name={TONE_ICON[e.tone]}
                      label={TONE_WORD[e.tone]}
                      className={`v-log-verdict tone-icon-${e.tone}`}
                    />
                  )}
                  {/* The speaker tag, unless the line already opens with the name; ": " is for screen readers. */}
                  {voice && e.kind !== 'you' && !e.text.startsWith(VOICE_NAMES[voice] ?? '\u0000') && (
                    <span className="v-log-who" style={{ color: VOICE_COLOURS[voice] }}>
                      <Icon name={VOICE_ICON[voice]} />
                      {settingWords(VOICE_NAMES[voice])}
                      <span className="v-sr">: </span>
                    </span>
                  )}
                  {!exchange.length && (
                    <>
                      {explainTerms(storyDates(e.text))}
                      {information}
                    </>
                  )}
                  {exchange.length > 0 && (
                    <>
                      <span className="v-scene-title">
                        Halil and {settingWords(exchange.find((line) => line.speaker !== 'Halil')?.speaker)}{' '}
                        <small>· {e.clock}</small>
                      </span>
                      <span className="v-exchange">
                        {exchange.map((line) => (
                          <span className="v-exchange-line" key={`${line.speaker}:${line.words}`}>
                            <strong>{settingWords(line.speaker)}:</strong> “{settingWords(line.words)}”
                          </span>
                        ))}
                      </span>
                    </>
                  )}
                  {exchange.length > 0 && (
                    <span className="v-scene-record">
                      {explainTerms(storyDates(e.text))}
                      {information}
                    </span>
                  )}
                  {count > 1 && to ? <span className="v-log-span"> · until {settingWords(to)}</span> : null}
                  {count === 1 && e.until && e.kind === 'act' ? (
                    <span className="v-log-span"> · until {settingWords(e.until)}</span>
                  ) : null}
                </span>
                {e.beat && (
                  <span
                    className={`v-log-beat v-beat-dot-${e.beat}`}
                    title={settingWords(BEAT_LABEL[e.beat])}
                  >
                    <Icon name={BEAT_ICON[e.beat]} label={BEAT_LABEL[e.beat]} />
                  </span>
                )}
              </>
            );
            const cls = `v-log-row ${exchange.length ? 'v-log-scene' : ''} v-log-${e.kind} ${toneClass(e.tone)} ${e.beat ? 'is-beat' : ''} ${
              selected && e.decisionId === selected ? 'is-selected' : ''
            }`;
            return (
              <li
                key={e.id}
                className={cls}
                style={voice ? ({ '--who': VOICE_COLOURS[voice] } as React.CSSProperties) : undefined}
              >
                <div className="v-log-btn">{body}</div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="v-log-controls">
        <button
          type="button"
          className="v-log-jump"
          onClick={() => {
            setHeld(null);
            setStuck(true);
            setJump((n) => n + 1);
          }}
        >
          Latest ↓{held && log.at(-1)?.id !== held.at(-1)?.id ? ' · newer entries' : ''}
        </button>
      </div>
    </section>
  );
});
