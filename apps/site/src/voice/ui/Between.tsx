import { voiceWords as settingWords } from './words.ts';
/**
 * Between days (voice.md §7.3): the day's chronicle, its strip, his ends, your trust, then the next step. Before a
 * skip the player may leave up to two standing whispers, each with a strength and an optional reason, and sees
 * the cost before letting the days pass.
 */

import { useEffect, useRef, useState } from 'react';
import {
  type Appeal,
  type BetweenView,
  defaultWhisper,
  type SceneWords,
  type StandingWhisper,
  type Strength,
} from '../protocol.ts';
import { storyDates } from './dates.ts';
import { EndsList, UnaskedStrip } from './EndsPane.tsx';
import { Icon, STRENGTH_ICON } from './Icon.tsx';
import { APPEALS, STRENGTHS } from './parts.tsx';
import { Strip, StripLegend } from './Strip.tsx';
import { daySpeech } from './speech-summary.ts';
import { trustChangeWords, trustEventWords } from './VoicesPane.tsx';

const MAX_WHISPERS = 2;
// Seventh pass: a pick's strength and reason controls sit below the list, not under the picked row, so picking
// one word does not move the others (review: the second pick missed because the list shifted under the pointer).

export function Between({
  view,
  onAdvance,
  sceneWords = [],
  day = 0,
}: {
  view: BetweenView;
  sceneWords?: readonly SceneWords[] | undefined;
  day?: number | undefined;
  onAdvance: (standing: StandingWhisper[]) => void;
}) {
  const [picked, setPicked] = useState<StandingWhisper[]>([]);
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    head.current?.focus();
  }, []);

  const skip = view.next !== null && view.next.skipped > 0 && view.choices.length > 0;
  const toggle = (id: StandingWhisper['choiceId']) =>
    setPicked((p) =>
      p.some((w) => w.choiceId === id)
        ? p.filter((w) => w.choiceId !== id)
        : p.length >= MAX_WHISPERS
          ? p
          : [...p, defaultWhisper(id)],
    );
  const patch = (id: StandingWhisper['choiceId'], change: { strength?: Strength; appeal?: Appeal | null }) =>
    setPicked((p) =>
      p.map((w) => {
        if (w.choiceId !== id) return w;
        const next: StandingWhisper = { ...w, ...(change.strength ? { strength: change.strength } : {}) };
        if (change.appeal === null) delete next.appeal;
        else if (change.appeal) next.appeal = change.appeal;
        return next;
      }),
    );

  const change = trustChangeWords(view.trust.from, view.trust.to);
  const recapWords = (line: string) =>
    line.replace(/His trust in you went (\d+(?:\.\d+)?) → (\d+(?:\.\d+)?)\./, (_, from: string, to: string) =>
      trustChangeWords(Number(from), Number(to)),
    );
  const cost = view.choices[0]?.cost;
  const nextLabel = view.next
    ? view.next.skipped > 0
      ? `${view.next.skipped} days pass before ${view.next.label}.`
      : `Next: ${view.next.label}`
    : 'Next: Eid al-Fitr. You will be silent.';
  const button = view.next
    ? view.next.skipped > 0
      ? 'Let the days pass'
      : `Go to ${view.next.label}`
    : 'Go to Eid';

  // At phone width a skip card opens on the decision; the day's recap folds into one line (seventh pass review).
  const narrowSkip = skip;
  const recap = (
    <div className="v-between-grid">
      <div>
        <ul className="v-lines">
          {view.lines.slice(0, 6).map((l) => (
            <li key={l}>{settingWords(storyDates(recapWords(l)))}</li>
          ))}
        </ul>
        {view.yours && view.yours.length > 0 && (
          <>
            <h3 className="v-sub">What you said, and what he did</h3>
            <ul className="v-lines">
              {daySpeech(view.yours, sceneWords, day).map((l) => (
                <li key={l}>{settingWords(storyDates(recapWords(l)))}</li>
              ))}
            </ul>
          </>
        )}
        <Strip row={view.strip} showLabel={false} />
        <StripLegend rows={[view.strip]} />
        <div className="v-between-trust">
          <h3 className="v-sub">His trust in you</h3>
          <p>{settingWords(change)}</p>
          {view.trust.events.length > 0 && (
            <ul className="v-voice-history">
              {view.trust.events.map((e) => (
                <li key={e}>{settingWords(trustEventWords(e))}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div>
        <h3 className="v-sub">His goals</h3>
        <UnaskedStrip items={view.unasked} />
        <EndsList ends={view.ends} compact />
      </div>
    </div>
  );
  const next = (
    <div className="v-between-next">
      {skip && (
        <div className="v-whispers">
          <p className="v-whispers-head">
            Choose up to two suggestions for the days you skip. You can also leave this empty.
            <span>
              {picked.length}/{MAX_WHISPERS}
            </span>
          </p>
          <ul>
            {view.choices.map((c) => {
              const w = picked.find((x) => x.choiceId === c.id);
              const full = !w && picked.length >= MAX_WHISPERS;
              return (
                <li key={c.id} className={`v-whisper ${w ? 'is-on' : ''}`}>
                  <button
                    type="button"
                    className="v-whisper-pick"
                    aria-pressed={Boolean(w)}
                    disabled={full}
                    onClick={() => toggle(c.id)}
                  >
                    {settingWords(c.label)}
                  </button>
                  {c.hint && <p className="v-whisper-hint">{settingWords(c.hint)}</p>}
                </li>
              );
            })}
          </ul>
          {picked.length > 0 && (
            <ul className="v-whisper-picked" aria-label="How you say them">
              {picked.map((w) => {
                const c = view.choices.find((x) => x.id === w.choiceId);
                if (!c) return null;
                return (
                  <li key={w.choiceId}>
                    <span className="v-whisper-picked-label">{settingWords(c.label)}</span>
                    <div className="v-whisper-how">
                      <fieldset
                        className="v-seg v-seg-small"
                        aria-label={settingWords(`How strongly: ${c.label}`)}
                      >
                        {STRENGTHS.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            aria-pressed={w.strength === s.id}
                            onClick={() => patch(c.id, { strength: s.id })}
                          >
                            <Icon name={STRENGTH_ICON[s.id]} />
                            {settingWords(s.label)}
                          </button>
                        ))}
                      </fieldset>
                      <fieldset className="v-whisper-reasons" aria-label={settingWords(`Reason: ${c.label}`)}>
                        <button
                          type="button"
                          className="v-chip"
                          aria-pressed={!w.appeal}
                          onClick={() => patch(c.id, { appeal: null })}
                        >
                          No reason
                        </button>
                        {APPEALS.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            className="v-chip"
                            aria-pressed={w.appeal === a.id}
                            onClick={() => patch(c.id, { appeal: w.appeal === a.id ? null : a.id })}
                          >
                            {settingWords(a.label)}
                          </button>
                        ))}
                      </fieldset>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {picked.length > 0 && cost && <p className="v-insist-price">{settingWords(cost)}</p>}
        </div>
      )}
    </div>
  );

  return (
    <section className="v-overlay v-overlay-night" aria-labelledby="between-title">
      <div className="v-card v-between">
        <h2 id="between-title" ref={head} tabIndex={-1}>
          {settingWords(storyDates(view.closed))}
        </h2>
        <div className="v-page-body">
          {narrowSkip ? (
            <>
              {next}
              <details className="v-between-recap">
                <summary>
                  <span className="v-recap-title">
                    {settingWords(storyDates(view.closed.replace(/ is over\.$/, '')))}
                  </span>
                  <span className="v-recap-trust">
                    <Icon name="ear" label="His trust in you" />
                    {settingWords(change)}
                  </span>
                </summary>
                {recap}
              </details>
            </>
          ) : (
            <>
              {recap}
              {next}
            </>
          )}
        </div>
        <footer className="v-page-actions">
          <p className="v-next-label">{settingWords(storyDates(nextLabel))}</p>
          <button
            type="button"
            className="v-btn v-btn-primary v-btn-big"
            onClick={() => onAdvance(skip ? picked : [])}
          >
            {settingWords(button)}
          </button>
        </footer>
      </div>
    </section>
  );
}
