/**
 * Why (plan §7): stacked term bars for the top three options of one decision, labelled as estimates, plus the
 * memory it recalled and how a voice was answered. A drawer on desktop, a bottom sheet on phones.
 */
import { useEffect, useRef } from 'react';
import type { WhyView } from '../protocol.ts';

const PALETTE = ['#3f4a8a', '#a8552f', '#c98a2b', '#4f7a4a', '#7d4a7a', '#3e7c8a', '#9a7b4f', '#8a8f98'];

export function Why({
  why,
  missing = false,
  onClose,
}: {
  why: WhyView | null;
  /** The worker no longer holds that decision (it keeps the recent ones only). */
  missing?: boolean;
  onClose: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Focus moves into the sheet, and back to whatever opened it on close.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    close.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const max = why
    ? Math.max(
        0.01,
        ...why.options.map((o) => o.terms.reduce((s, t) => s + Math.max(0, t.value), 0)),
        ...why.options.map((o) => o.terms.reduce((s, t) => s + Math.max(0, -t.value), 0)),
      )
    : 1;

  return (
    <aside className="v-why" aria-label="Why he chose this">
      <div className="v-why-head">
        <h2>Why</h2>
        {why && <span className="v-why-clock">{why.clock}</span>}
        <button ref={close} type="button" className="v-btn v-btn-quiet v-btn-small" onClick={onClose}>
          Close <kbd>Esc</kbd>
        </button>
      </div>
      {!why ? (
        <p className="v-muted">{missing ? 'That moment is too far back to read.' : 'Reading his reasons…'}</p>
      ) : (
        <div className="v-why-body">
          <p className="v-why-chosen">
            He chose <em>{why.chosen}</em>.
          </p>
          {why.note && <p className="v-why-voice">{why.note}</p>}
          {why.voice && (
            <p className="v-why-voice">
              To your words he said <q>{why.voice.says}</q> <span>({why.voice.reason})</span>
            </p>
          )}
          {why.recalled && <p className="v-why-recall">{why.recalled}</p>}
          <ol className="v-why-options">
            {why.options.map((o) => (
              <li key={o.label}>
                <div className="v-why-opt-head">
                  <span>{o.label}</span>
                  <span className="v-why-total">{o.total.toFixed(2)}</span>
                </div>
                <div className="v-why-bar" aria-hidden="true">
                  {o.terms
                    .filter((t) => t.value > 0)
                    .map((t, i) => (
                      <span
                        key={t.label}
                        style={{
                          width: `${(t.value / max) * 100}%`,
                          background: PALETTE[i % PALETTE.length],
                        }}
                        title={`${t.label} ${t.value.toFixed(2)}`}
                      />
                    ))}
                </div>
                <ul className="v-why-terms">
                  {o.terms.map((t, i) => (
                    <li key={t.label} className={t.value < 0 ? 'is-neg' : ''}>
                      <span
                        className="v-why-swatch"
                        style={{ background: t.value > 0 ? PALETTE[i % PALETTE.length] : 'transparent' }}
                      />
                      <span>{t.label}</span>
                      <span className="v-why-val">
                        {t.value >= 0 ? '+' : '−'}
                        {Math.abs(t.value).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <p className="v-why-note">Figures are estimates from his own weighing, not measurements.</p>
        </div>
      )}
    </aside>
  );
}
