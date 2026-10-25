import { useEffect, useRef, useState } from 'react';
import { CastMenu } from '../../shared/CastMenu.tsx';
import { FullscreenButton } from '../../shared/fullscreen.tsx';
import { labMode } from '../../shared/lab-mode.ts';
import { settingWords } from '../../shared/setting-words.ts';
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
          {settingWords(
            premise
              ? 'Halil and this month'
              : report
                ? 'The month without you'
                : phase === 'between'
                  ? 'Suggestions for the days you skip'
                  : phase === 'eid'
                    ? 'Eid'
                    : 'Speaking to him',
          )}
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
          <p>
            You are a voice Halil hears. You can suggest actions on four days. On Eid, he decides without your
            advice.
          </p>
          <p>He hopes to keep the fast, pay Osman, see the doctor and stay close to Selin.</p>
          <p>He also hears Selin, Rıza, Hacer, Osman and the doctor.</p>
          <p>The story begins on Monday 11 March 2024. The dates belong to a fictional month.</p>
        </>
      ) : report ? (
        <>
          <p>The comparison replays the same month from the same starting point, without your suggestions.</p>
          <p>
            The tally counts what he did, what you said and what he chose without you. It does not measure his
            worth.
          </p>
        </>
      ) : phase === 'between' ? (
        <>
          <p>
            Choose up to two suggestions, or leave this empty. Halil hears each suggestion when he could act
            on it.
          </p>
          <p>Choose Mention for a gentle suggestion, or Urge for stronger advice.</p>
        </>
      ) : phase === 'eid' ? (
        <p>You are silent today. Today shows what he chooses on his own.</p>
      ) : (
        <>
          <p>
            Choose Speak to see suggestions. Tap a suggestion to say it. Choose Say something else to offer
            care or ask a question.
          </p>
          <p>
            Choose Plan something specific to give stronger advice or explain your reason. Insisting when
            Halil already feels under pressure reduces his trust in you.
          </p>
          <p>
            The band shows daylight. The dots mark prayer times. The gold line shows when Halil is fasting.
          </p>
          <p>The game stops when someone arrives. Choose Skip to move to the next event.</p>
          <p>The pre-dawn meal is the meal before dawn. The sunset meal is the meal at sunset.</p>
        </>
      )}
      {(premise || report) && (
        <details>
          <summary>Model notes</summary>
          <ul>
            {MODEL_NOTES.map((note) => (
              <li key={note}>{settingWords(note)}</li>
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
  const [confirmNew, setConfirmNew] = useState(false);
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
          <h2>Game menu · {settingWords(label)}</h2>
          <button type="button" onClick={onClose} aria-label="Close menu">
            ×
          </button>
        </header>
        <p className="v-hint">The day waits while this is open.</p>
        {labMode() && (
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
                {settingWords(item.label)}
              </button>
            ))}
          </fieldset>
        )}
        <button ref={first} type="button" onClick={onSendWord}>
          Feedback <span>▸</span>
        </button>
        {labMode() && (
          <label>
            <input type="checkbox" checked={freeText} onChange={(e) => onFreeText(e.target.checked)} />
            Experimental free-text suggestions (Cloudflare AI)
          </label>
        )}
        <FullscreenButton variant="item" />
        <button type="button" onClick={() => (confirmNew ? onTitle() : setConfirmNew(true))}>
          {confirmNew ? 'Replace this game and start again' : 'New game'}
        </button>
        {confirmNew && (
          <button type="button" onClick={() => setConfirmNew(false)}>
            Keep this game
          </button>
        )}
        <a href="/games/">All games</a>
        <footer>
          <RecordingPreference privacy={false} />
          {labMode() && <CastMenu game="voice" />}
          {labMode() && <VoicePersonaControls canReturn={canReturn} />}
        </footer>
        <button type="button" className="v-btn v-btn-primary" onClick={onClose}>
          Resume
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
        <p>You meet Halil again in a different month.</p>
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
