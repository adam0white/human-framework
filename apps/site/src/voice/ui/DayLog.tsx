/**
 * The day, in his narration (plan §6.2). Scrolls inside its own panel and sticks to the bottom unless the player
 * has scrolled up. Consecutive entries of the same action collapse into one line with a time span.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BeatKind, LogEntry } from '../protocol.ts';
import { BEAT_ICON, Icon, TONE_ICON, TONE_WORD, VOICE_ICON } from './Icon.tsx';
import { toneClass, VOICE_COLOURS, VOICE_NAMES } from './parts.tsx';

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

export function DayLog({
  log,
  pauseBeat,
  paused,
  onWhy,
  selected,
}: {
  log: LogEntry[];
  pauseBeat?: { kind: BeatKind; text: string };
  paused: boolean;
  onWhy: (decisionId: string) => void;
  selected?: string | null;
}) {
  const rows = useMemo(() => collapse(log), [log]);
  const scroller = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(true);
  const lastId = log[log.length - 1]?.id;

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-stick whenever a new entry lands.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stuck) el.scrollTop = el.scrollHeight;
  }, [lastId, stuck]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    setStuck(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
  };

  return (
    <section className="v-day" aria-label="The day">
      {pauseBeat && paused && (
        <div className={`v-beat v-beat-${pauseBeat.kind}`} role="status">
          <span className="v-beat-kind">
            <Icon name={BEAT_ICON[pauseBeat.kind]} size={18} />
            {BEAT_LABEL[pauseBeat.kind]}
          </span>
          <span className="v-beat-text">{pauseBeat.text}</span>
          <kbd>Space</kbd>
        </div>
      )}
      <div className="v-log" ref={scroller} onScroll={onScroll}>
        {rows.length === 0 && <p className="v-log-empty">Nothing yet today.</p>}
        <ol>
          {rows.map(({ entry: e, to, count }) => {
            const voice = e.who !== 'halil' ? e.who : null;
            const clickable = Boolean(e.decisionId);
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
                      {VOICE_NAMES[voice]}
                      <span className="v-sr">: </span>
                    </span>
                  )}
                  {e.text}
                  {count > 1 && to ? <span className="v-log-span"> · until {to}</span> : null}
                  {count === 1 && e.until && e.kind === 'act' ? (
                    <span className="v-log-span"> · until {e.until}</span>
                  ) : null}
                </span>
                {e.beat && (
                  <span className={`v-log-beat v-beat-dot-${e.beat}`} title={BEAT_LABEL[e.beat]}>
                    <Icon name={BEAT_ICON[e.beat]} label={BEAT_LABEL[e.beat]} />
                  </span>
                )}
              </>
            );
            const cls = `v-log-row v-log-${e.kind} ${toneClass(e.tone)} ${e.beat ? 'is-beat' : ''} ${
              selected && e.decisionId === selected ? 'is-selected' : ''
            }`;
            return (
              <li
                key={e.id}
                className={cls}
                style={voice ? ({ '--who': VOICE_COLOURS[voice] } as React.CSSProperties) : undefined}
              >
                {clickable ? (
                  <button
                    type="button"
                    className="v-log-btn"
                    onClick={() => e.decisionId && onWhy(e.decisionId)}
                    title="Why?"
                  >
                    {body}
                  </button>
                ) : (
                  <div className="v-log-btn">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      {!stuck && (
        <button
          type="button"
          className="v-log-jump"
          onClick={() => {
            setStuck(true);
          }}
        >
          Latest ↓
        </button>
      )}
    </section>
  );
}
