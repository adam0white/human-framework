/** The intro card that opens a played day or Eid (plan §6.4–6.5); play starts paused after Continue. */
import { useEffect, useRef } from 'react';

export function Intro({
  intro,
  eid,
  onContinue,
}: {
  intro: { label: string; lines: string[] };
  eid: boolean;
  onContinue: () => void;
}) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    button.current?.focus();
  }, []);
  return (
    <div
      className={`v-overlay ${eid ? 'v-overlay-eid' : 'v-overlay-night'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
    >
      <div className="v-card v-intro">
        {eid && (
          <svg className="v-premise-moon" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M30 6a18 18 0 1 0 12 30A15 15 0 0 1 30 6z" />
          </svg>
        )}
        <h2 id="intro-title">{intro.label}</h2>
        <ul className="v-lines">
          {intro.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        {eid && <p className="v-hint">There is no composer today. You can still open Why on any line.</p>}
        <button ref={button} type="button" className="v-btn v-btn-primary v-btn-big" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
