import { useEffect, useRef } from 'react';
import { FullscreenButton } from '../../shared/fullscreen.tsx';
import { MODEL_NOTES, type Pace } from '../protocol.ts';
import { VoicePersonaControls } from './persona.tsx';
import { RecordingPreference } from './SendWord.tsx';
import type { VoiceActions } from './useVoice.ts';

export function InfoPanel({ phase, onClose }: { phase: string; onClose: () => void }) {
  const premise = phase === 'premise';
  const report = phase === 'report';
  return (
    <section className="v-info-popover" aria-label="Information">
      <header>
        <h2>
          {premise
            ? 'Halil and this month'
            : report
              ? 'The month without you'
              : phase === 'between'
                ? 'Words for the days you skip'
                : phase === 'eid'
                  ? 'Eid'
                  : 'Speaking to him'}
        </h2>
        <button type="button" onClick={onClose} aria-label="Close information">
          ×
        </button>
      </header>
      {premise ? (
        <>
          <p>
            Halil is 61 and repairs kettles and bicycles. Nuran died fourteen weeks ago. Selin, his daughter,
            lives in the city.
          </p>
          <p>You are a voice he hears. He decides. You have four days to speak, then Eid in silence.</p>
          <p>He hopes to keep the fast, pay Osman, see the doctor and stay close to Selin.</p>
          <p>He also hears Selin, Rıza, Hacer, Osman and the doctor.</p>
          <p>The story begins on Monday 11 March 2024. These dates locate a fictional month.</p>
        </>
      ) : report ? (
        <>
          <p>The silent run is the same town from the same start, with no suggestions from you.</p>
          <p>
            The tally counts what he did, what you said and what he chose without you. It does not measure his
            worth.
          </p>
        </>
      ) : phase === 'between' ? (
        <>
          <p>Leave up to two words, or none. He hears them whenever he could act on them.</p>
          <p>Mention is a passing thought. Urge is a real pull. Leaving none is a choice.</p>
        </>
      ) : phase === 'eid' ? (
        <p>You are silent today. Today shows what he chooses on his own.</p>
      ) : (
        <>
          <p>Speak shows what you could say. One tap says it. Say something else gives care or a question.</p>
          <p>
            Plan something specific lets you urge, insist or give a reason. Pressing him when he is already
            pressed costs his trust.
          </p>
          <p>The band is the day’s light. Dots are prayer times; the gold line is the fast.</p>
          <p>The day stops when someone new arrives. Skip moves to the next event.</p>
          <p>Suhoor is the meal before dawn. Iftar is the meal at sunset.</p>
        </>
      )}
      {(premise || report) && (
        <details>
          <summary>Model notes</summary>
          <ul>
            {MODEL_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export function MenuPanel({
  freeText,
  onFreeText,
  label,
  pace,
  actions,
  onClose,
  onTitle,
  onSendWord,
  canReturn,
}: {
  label: string;
  pace: 'automatic' | Pace;
  actions: VoiceActions;
  onClose: () => void;
  onTitle: () => void;
  onSendWord: () => void;
  canReturn: boolean;
  freeText: boolean;
  onFreeText: (enabled: boolean) => void;
}) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
  }, []);
  return (
    <div className="v-shell-backdrop">
      <button type="button" className="v-backdrop-close" aria-label="Close panel" onClick={onClose} />
      <section
        className="v-menu-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Game menu"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <header>
          <h2>Game menu · {label}</h2>
          <button type="button" onClick={onClose} aria-label="Close menu">
            ×
          </button>
        </header>
        <p className="v-hint">The day waits while this is open.</p>
        <fieldset className="v-menu-pace">
          <legend>How the day passes</legend>
          {(
            [
              { id: 'automatic', label: 'Automatic' },
              { id: 'slow', label: 'Slow' },
              { id: 'normal', label: 'Steady' },
              { id: 'fast', label: 'Fast' },
            ] as const
          ).map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={pace === item.id}
              onClick={() => actions.setAutomaticPace(item.id)}
            >
              {item.label}
            </button>
          ))}
        </fieldset>
        <button ref={first} type="button" onClick={onSendWord}>
          Send word <span>▸</span>
        </button>
        <label>
          <input type="checkbox" checked={freeText} onChange={(e) => onFreeText(e.target.checked)} />
          Experimental free-text suggestions (Cloudflare AI)
        </label>
        <FullscreenButton variant="item" />
        <button type="button" onClick={onTitle}>
          To the title page
        </button>
        <a href="/">All games</a>
        <footer>
          <RecordingPreference />
          <VoicePersonaControls canReturn={canReturn} />
        </footer>
        <button type="button" className="v-btn v-btn-primary" onClick={onClose}>
          Back to Halil
        </button>
      </section>
    </div>
  );
}

export function OtherWays({
  actions,
  onClose,
  onNewTown,
}: {
  actions: VoiceActions;
  onClose: () => void;
  onNewTown: () => void;
}) {
  return (
    <div className="v-shell-backdrop">
      <button type="button" className="v-backdrop-close" aria-label="Close panel" onClick={onClose} />
      <section className="v-other-panel" role="dialog" aria-modal="true" aria-label="Other ways in">
        <header>
          <h2>Other ways in</h2>
          <button type="button" aria-label="Close other ways" onClick={onClose}>
            ×
          </button>
        </header>
        <button type="button" className="v-shelf-row" onClick={onNewTown}>
          A different town
        </button>
        <p>Same Halil, a different month around him.</p>
        <label className="v-load-run">
          Load a playtest run
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 32 * 1024 * 1024) {
                actions.playtestError('This file is too large to load.');
                return;
              }
              try {
                actions.loadPlaytest(await file.text());
                onClose();
              } catch {
                actions.playtestError('This file could not be read.');
              }
            }}
          />
        </label>
        <button type="button" className="v-btn v-btn-primary" onClick={onClose}>
          Done
        </button>
      </section>
    </div>
  );
}
