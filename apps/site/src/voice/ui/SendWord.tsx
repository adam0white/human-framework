/** Feedback is separate from reading and saves. Downloads always remain available. */
import type { Lab } from '@adam0white/lab-client';
import { setTelemetryOff, telemetryOn } from '@adam0white/lab-kit';
import { useEffect, useRef, useState } from 'react';
import { gameLabs } from '../../shared/lab.tsx';
import { fetchBuild } from '../../shared/playtest.ts';
import type { VoiceActions } from './useVoice.ts';
import './feedback.css';

const PRIVACY = 'https://human.adamwhite.work/lab/privacy/';
const NAME_KEY = 'hf-lab-feedback-name';
function stored(key: string) {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}
function recordingOff() {
  return stored('hf-lab-recording-off') === '1' || stored('hf-lab-events-off:voice') === '1';
}
function useRecording(lab: Lab) {
  const [on, setOn] = useState(() => telemetryOn(lab));
  const [off, setOff] = useState(recordingOff);
  const sync = () => {
    setOn(telemetryOn(lab));
    setOff(recordingOff());
  };
  useEffect(() => {
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
  });
  return {
    on,
    off,
    change: (value: boolean) => {
      setTelemetryOff(lab, !value);
      sync();
    },
  };
}

export function RecordingPreference({
  lab = gameLabs.voice,
  privacy = true,
}: {
  lab?: Lab;
  privacy?: boolean;
}) {
  const recording = useRecording(lab);
  return (
    <div className="v-feedback-recording">
      <label className="v-feedback-export-option">
        <input
          type="checkbox"
          checked={!recording.off && recording.on}
          onChange={(e) => recording.change(e.target.checked)}
        />{' '}
        Record play for the lab
      </label>
      {privacy ? (
        <a className="v-feedback-export-option" href={PRIVACY}>
          Lab privacy
        </a>
      ) : null}
    </div>
  );
}

export function SendWord({
  actions,
  onBack,
  lab = gameLabs.voice,
}: {
  actions: VoiceActions;
  onBack: () => void;
  lab?: Lab;
}) {
  const recording = useRecording(lab);
  const privacyOnly = !recording.off && lab.privacySignalOn && !lab.privacyOverride;
  const [consent, setConsent] = useState(false);
  const [verdict, setVerdict] = useState('');
  const [note, setNote] = useState('');
  const [name, setName] = useState(() => stored(NAME_KEY));
  const [status, setStatus] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const screen = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState('');
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => {
      screen.current?.style.setProperty('--v-feedback-feedback-height', `${viewport.height - 44}px`);
      screen.current?.style.setProperty('--v-feedback-feedback-top', `${viewport.offsetTop + 44}px`);
    };
    resize();
    viewport.addEventListener('resize', resize);
    viewport.addEventListener('scroll', resize);
    return () => {
      viewport.removeEventListener('resize', resize);
      viewport.removeEventListener('scroll', resize);
    };
  }, []);
  const rememberName = () => {
    try {
      if (name.trim()) localStorage.setItem(NAME_KEY, name.trim());
      else localStorage.removeItem(NAME_KEY);
    } catch {
      /* Device storage is optional. */
    }
  };
  const disabled = recording.off || (privacyOnly ? !consent : !recording.on);
  const send = async () => {
    if (disabled || pending.current) return;
    pending.current = true;
    setBusy(true);
    setStatus('');
    const message = [verdict ? `Verdict: ${verdict}` : '', note.trim()].filter(Boolean).join('\n\n');
    try {
      if (privacyOnly) {
        const [file, build] = await Promise.all([actions.getPlaytest(), fetchBuild()]);
        const run = { ...file, build };
        try {
          await lab.sendRun(run, { note: message, name: name.trim() });
        } catch {
          lab.openSendDialog({
            getRun: () => run,
            note: message,
            name: name.trim(),
            onSent: () => {
              rememberName();
              setSent(true);
              setStatus('Sent. Thank you.');
            },
          });
          setStatus('Use the send dialog to finish sending.');
          return;
        }
      } else {
        await lab.sendFeedback(message, { name: name.trim() });
      }
      rememberName();
      setSent(true);
      setStatus('Sent. Thank you.');
    } catch {
      setStatus('Your word could not be sent. Please try again.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <div
      ref={screen}
      className="v-feedback-overlay v-feedback-sub-sheet v-feedback-feedback"
      role="dialog"
      aria-label="Send word"
    >
      <div className="v-feedback-menu-head">
        <button type="button" className="v-feedback-secondary" onClick={onBack}>
          ← Back
        </button>
        <h2>Send word</h2>
      </div>
      <div className="v-feedback-sheet-body">
        <p>Your run, saves and log reach us on their own. Tell us what they can’t show.</p>
        {recording.off ? (
          <div className="v-feedback-feedback-notice">
            <p>Recording is off, so nothing is sent.</p>
            <RecordingPreference lab={lab} privacy={false} />
          </div>
        ) : null}
        {privacyOnly ? (
          <label className="v-feedback-export-option">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Send
            this run with my note
          </label>
        ) : null}
        <fieldset className="v-feedback-verdicts" aria-label="Would you keep playing?">
          {[
            ['keep', 'I’d keep playing'],
            ['mixed', 'Not sure'],
            ['quit', 'I’d stop here'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className="v-feedback-secondary"
              aria-pressed={verdict === value}
              onClick={() => setVerdict(verdict === value ? '' : (value ?? ''))}
            >
              {label}
            </button>
          ))}
        </fieldset>
        <textarea
          className="v-feedback-feedback-note"
          aria-label="Your word"
          rows={4}
          placeholder="What happened with Halil, what you wanted, what got in the way."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <details className="v-feedback-feedback-name" open={name ? true : undefined}>
          <summary>+ Add a name or tester id</summary>
          <label>
            Your name or tester id
            <input
              type="text"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="nickname"
            />
          </label>
          <p className="v-feedback-note">
            A sent name labels your past and future play on this device. Leave it empty to stay pseudonymous.
          </p>
        </details>
        <details
          onToggle={async (e) => {
            if (e.currentTarget.open && !preview) {
              try {
                setPreview(JSON.stringify(await actions.getPlaytest(), null, 2));
              } catch {
                setPreview('This run could not be prepared.');
              }
            }
          }}
        >
          <summary>What is sent</summary>
          <p>
            Your note{privacyOnly ? ' and this run' : ', linked to this device’s play history'}
            {name.trim() ? ', with your name' : ''}.
          </p>
          <pre className="v-feedback-feedback-preview">{preview}</pre>
          <a href={PRIVACY}>Lab privacy</a>
        </details>
        <button type="button" className="v-btn" onClick={actions.exportPlaytest}>
          Keep a copy of this run
        </button>
        {status ? (
          <p role="status" className="v-feedback-note">
            {status}
          </p>
        ) : null}
      </div>
      <div className="v-feedback-sheet-actions">
        <button
          type="button"
          className="v-feedback-primary"
          disabled={!sent && (disabled || busy)}
          onClick={sent ? onBack : send}
        >
          {sent ? 'Back to the game' : busy ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
