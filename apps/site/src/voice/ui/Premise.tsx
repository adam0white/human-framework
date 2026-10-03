/** Plan §6.1: the start state. The game is paused behind this card until Begin. */
import { useEffect, useRef } from 'react';
import { ModelNotes } from './parts.tsx';

export function Premise({ ready, onBegin }: { ready: boolean; onBegin: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (ready) button.current?.focus();
  }, [ready]);
  return (
    <div
      className="v-overlay v-overlay-night"
      role="dialog"
      aria-modal="true"
      aria-labelledby="premise-title"
    >
      <div className="v-card v-premise">
        <svg className="v-premise-moon" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M30 6a18 18 0 1 0 12 30A15 15 0 0 1 30 6z" />
        </svg>
        <h1 id="premise-title">The Day You Say Nothing</h1>
        <p className="v-lede">
          Halil is 61. He repairs kettles and bicycles in a rented shop. His wife Nuran died fourteen weeks
          ago. Tonight is the first night of Ramadan.
        </p>
        <p>
          You are a voice in his head that is not his own. He hears you. <strong>He decides.</strong> He may
          agree, put you off, do something like it, refuse, or give in under protest, and he always says why.
        </p>
        <p>
          You have four days of this month to speak. <strong>On Eid you go silent</strong>, and you watch what
          he does on his own.
        </p>
        <div className="v-premise-ends">
          <h2>What he’s holding on to</h2>
          <ul>
            <li>keep the fast</li>
            <li>pay Osman (600 owed; 300 by Ramadan 15)</li>
            <li>Selin wants his blood pressure seen</li>
            <li>Selin herself</li>
          </ul>
        </div>
        <p className="v-aim">
          <span>Your aim</span>
          Help him toward his own ends, so that on Eid he does them without you.
        </p>
        <p className="v-hint">Time runs slowly and stops when something matters. Space pauses.</p>
        <button
          ref={button}
          type="button"
          className="v-btn v-btn-primary v-btn-big"
          onClick={onBegin}
          disabled={!ready}
        >
          {ready ? 'Begin' : 'Waking the town…'}
        </button>
        <ModelNotes />
      </div>
    </div>
  );
}
