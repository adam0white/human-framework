import { createLab, type Lab } from '@adam0white/lab-client';
import { useEffect, useRef, useState } from 'react';

const instances: Partial<Record<'well' | 'voice' | 'watch', Lab>> = {};
function gameLab(game: 'well' | 'voice' | 'watch'): Lab {
  const lab = instances[game] ?? createLab({ game });
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

/** Fixed labels only. State, player text and names belong solely in the opt-in export. */
export function LabControls({
  lab,
  screen,
  onSend,
}: {
  lab: Lab;
  screen: 'title' | 'play' | 'ending';
  onSend: () => void | Promise<void>;
}) {
  const [eventsOn, setEventsOn] = useState(lab.eventsOn);
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const sendPending = useRef(false);
  useEffect(() => {
    const sync = () => setEventsOn(lab.eventsOn);
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    document.addEventListener('change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      document.removeEventListener('change', sync);
    };
  }, [lab]);
  useEffect(() => {
    lab.screen(screen);
    if (screen === 'play') lab.milestone('run started');
    if (screen === 'ending') lab.milestone('ending reached');
  }, [lab, screen]);
  return (
    <details
      className="lab-controls"
      style={{
        position: 'fixed',
        right: '0.5rem',
        bottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        zIndex: 100,
        maxWidth: 'calc(100vw - 1rem)',
        padding: '0.4rem',
        background: '#f7f0e5',
        color: '#2b2622',
        border: '1px solid #8b8074',
      }}
    >
      <summary>Playtest notebook</summary>
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
        Send this run to the notebook
      </button>
      {sendError && <p role="alert">{sendError}</p>}
      <label>
        <input
          type="checkbox"
          checked={eventsOn}
          onChange={(e) => {
            lab.setEventsOff(!e.target.checked);
            setEventsOn(lab.eventsOn);
          }}
        />{' '}
        Anonymous play events
      </label>
      <a href="https://human.adamwhite.work/lab/privacy/">Privacy</a>
    </details>
  );
}
