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
  type StandingWhisper,
  type Strength,
} from '../protocol.ts';
import { EndsList, UnaskedStrip } from './EndsPane.tsx';
import { Icon, STRENGTH_ICON } from './Icon.tsx';
import { APPEALS, STRENGTHS } from './parts.tsx';
import { Strip, StripLegend } from './Strip.tsx';

const MAX_WHISPERS = 2;
// Seventh pass: a pick's strength and reason controls sit below the list, not under the picked row, so picking
// one word does not move the others (review: the second pick missed because the list shifted under the pointer).

export function Between({
  view,
  onAdvance,
}: {
  view: BetweenView;
  onAdvance: (standing: StandingWhisper[]) => void;
}) {
  const [picked, setPicked] = useState<StandingWhisper[]>([]);
  const [narrow] = useState(
    () => typeof window !== 'undefined' && (window.matchMedia?.('(max-width: 767px)').matches ?? false),
  );
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

  const delta = view.trust.to - view.trust.from;
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
  const narrowSkip = skip && narrow;
  const recap = (
    <div className="v-between-grid">
      <div>
        <ul className="v-lines">
          {view.lines.slice(0, 6).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        {view.yours && view.yours.length > 0 && (
          <>
            <h3 className="v-sub">What your words did</h3>
            <ul className="v-lines">
              {view.yours.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </>
        )}
        <Strip row={view.strip} showLabel={false} />
        <StripLegend rows={[view.strip]} />
        <div className="v-between-trust">
          <h3 className="v-sub">His trust in you</h3>
          <p>
            {view.trust.from.toFixed(2)} → <strong>{view.trust.to.toFixed(2)}</strong>{' '}
            <span className={delta >= 0 ? 'is-up' : 'is-down'}>
              ({delta >= 0 ? '+' : '−'}
              {Math.abs(delta).toFixed(2)})
            </span>
          </p>
          {view.trust.events.length > 0 && (
            <ul className="v-voice-history">
              {view.trust.events.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div>
        <h3 className="v-sub">His ends</h3>
        <UnaskedStrip items={view.unasked} />
        <EndsList ends={view.ends} compact />
      </div>
    </div>
  );
  const next = (
    <div className="v-between-next">
      <p className="v-next-label">{nextLabel}</p>
      {skip && (
        <div className="v-whispers">
          <p className="v-whispers-head">
            Leave up to two words for him to carry through those days, or none.
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
                    {c.label}
                  </button>
                  {c.hint && <p className="v-whisper-hint">{c.hint}</p>}
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
                    <span className="v-whisper-picked-label">{c.label}</span>
                    <div className="v-whisper-how">
                      <fieldset className="v-seg v-seg-small" aria-label={`How strongly: ${c.label}`}>
                        {STRENGTHS.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            aria-pressed={w.strength === s.id}
                            onClick={() => patch(c.id, { strength: s.id })}
                          >
                            <Icon name={STRENGTH_ICON[s.id]} />
                            {s.label}
                          </button>
                        ))}
                      </fieldset>
                      <select
                        aria-label={`Reason: ${c.label}`}
                        value={w.appeal ?? ''}
                        onChange={(e) =>
                          patch(c.id, { appeal: e.target.value ? (e.target.value as Appeal) : null })
                        }
                      >
                        <option value="">no reason</option>
                        {APPEALS.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {picked.length > 0 && cost && <p className="v-insist-price">{cost}</p>}
        </div>
      )}
      <button
        type="button"
        className="v-btn v-btn-primary v-btn-big"
        onClick={() => onAdvance(skip ? picked : [])}
      >
        {button}
      </button>
    </div>
  );

  return (
    <div
      className="v-overlay v-overlay-night"
      role="dialog"
      aria-modal="true"
      aria-labelledby="between-title"
    >
      <div className="v-card v-between">
        <h2 id="between-title" ref={head} tabIndex={-1}>
          {view.closed}
        </h2>
        {narrowSkip ? (
          <>
            {next}
            <details className="v-between-recap">
              <summary>
                <span className="v-recap-title">{view.closed.replace(/ is over\.$/, '')}</span>
                {(view.unasked ?? [])
                  .filter((u) => u.state !== 'unknown')
                  .map((u) => (
                    <Icon
                      key={u.label}
                      name={u.state === 'yes' ? 'check' : 'x'}
                      label={`${u.label}: ${u.state === 'yes' ? 'would do unasked' : 'not yet'}`}
                      className={`v-recap-mark is-${u.state}`}
                    />
                  ))}
                <span className="v-recap-trust">
                  <Icon name="ear" label="His trust in you" />
                  {view.trust.to.toFixed(2)}
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
    </div>
  );
}
