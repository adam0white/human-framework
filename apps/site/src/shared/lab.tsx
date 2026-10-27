import { createLab, type Lab } from '@adam0white/lab-client';
import { setTelemetryOff, telemetryOn } from '@adam0white/lab-kit';
import { useEffect, useRef, useState } from 'react';
import { fileSession } from './cast-runtime.ts';

const instances: Partial<Record<'well' | 'voice' | 'watch', Lab>> = {};
function gameLab(game: 'well' | 'voice' | 'watch'): Lab {
  const lab = instances[game] ?? createLab(fileSession ? { game, preservation: 'preserve' } : { game });
  instances[game] = lab;
  return lab;
}
export const gameLabs = {
  get well() {
    return gameLab('well');
  },
  get voice() {
    return gameLab('voice');
  },
  get watch() {
    return gameLab('watch');
  },
};

/** Tracks visible screens and milestones. The game owns disclosure placement. */
export function useLabScreen(lab: Lab, screen: 'title' | 'play' | 'ending') {
  useEffect(() => {
    lab.screen(screen);
    if (screen === 'play') lab.milestone('run started');
    if (screen === 'ending') lab.milestone('ending reached');
  }, [lab, screen]);
}

/** Inline items for the game's own menu. Screen tracking stays mounted with the game. */
export function LabMenuContent({ lab, onSend }: { lab: Lab; onSend: () => void | Promise<void> }) {
  const [eventsOn, setEventsOn] = useState(telemetryOn(lab));
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const sendPending = useRef(false);
  useEffect(() => {
    const sync = () => setEventsOn(telemetryOn(lab));
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('hf-lab-preference', sync);
    document.addEventListener('change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('hf-lab-preference', sync);
      document.removeEventListener('change', sync);
    };
  }, [lab]);
  return (
    <>
      <button
        type="button"
        disabled={sending}
        onClick={async () => {
          if (sendPending.current) return;
          sendPending.current = true;
          setSendError('');
          setSending(true);
          try {
            await onSend();
          } catch {
            setSendError('This run could not be prepared. Please try again.');
          } finally {
            sendPending.current = false;
            setSending(false);
          }
        }}
      >
        Feedback
      </button>
      {sendError && <p role="alert">{sendError}</p>}
      <label className="pt-menu-option">
        <input
          type="checkbox"
          checked={eventsOn}
          onChange={(e) => {
            setTelemetryOff(lab, !e.target.checked);
            setEventsOn(telemetryOn(lab));
          }}
        />{' '}
        Recording
      </label>
    </>
  );
}
