/** The intro card that opens a played day or Eid (voice.md §7.3–7.4); play starts paused after Continue. */

import { useEffect, useRef } from 'react';
import { storyDates } from './dates.ts';
import { explainTerms } from './terms.tsx';

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
    <section className={`v-page ${eid ? 'v-overlay-eid' : 'v-overlay-night'}`} aria-labelledby="intro-title">
      <div className="v-page-body v-intro">
        {eid && (
          <svg className="v-premise-moon" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M30 6a18 18 0 1 0 12 30A15 15 0 0 1 30 6z" />
          </svg>
        )}
        <h2 id="intro-title">{storyDates(intro.label)}</h2>
        <ul className="v-lines">
          {intro.lines.map((l) => (
            <li key={l}>{explainTerms(storyDates(l))}</li>
          ))}
        </ul>
        {eid && <p className="v-hint">You are silent today. You can still open Why on any line in Today.</p>}
      </div>
      <div className="v-page-actions">
        <button ref={button} type="button" className="v-btn v-btn-primary v-btn-big" onClick={onContinue}>
          {eid ? 'Watch Eid' : 'Into the day'}
        </button>
      </div>
    </section>
  );
}
