/** Feedback is separate from reading and saves. Downloads always remain available. */
import type { Lab } from '@adam0white/lab-client';
import { setTelemetryOff, telemetryOn } from '@adam0white/lab-kit';
import { useEffect, useRef, useState } from 'react';
import { gameLabs } from '../../shared/lab.tsx';
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
    window.addEventListener('voice-persona', sync);
    document.addEventListener('change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('hf-lab-preference', sync);
      window.removeEventListener('voice-persona', sync);
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
  onReturn = onBack,
  lab = gameLabs.voice,
}: {
  actions: VoiceActions;
  onBack: () => void;
  onReturn?: () => void;
  lab?: Lab;
}) {
  const recording = useRecording(lab);
  const [personaLinked, setPersonaLinked] = useState(() => lab.personaRecordingAllowed);
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
  const send = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setStatus('');
    const message = [verdict ? `Verdict: ${verdict}` : '', note.trim()].filter(Boolean).join('\n\n');
    try {
      let run: unknown;
      if (recording.on && !lab.personaRecordingAllowed) {
        try {
          run = await actions.getPlaytest();
        } catch {
          /* The note can still be sent. */
        }
      }
      const noteOnly = !lab.telemetryOn || (lab.privacySignalOn && !lab.privacyOverride);
      await lab.sendFeedback(message, { name: name.trim(), ...(run ? { run } : {}) });
      rememberName();
      setSent(true);
      setStatus(
        noteOnly
          ? 'Note and verdict queued without a run or history linkage. Delivery may retry.'
          : 'Note and verdict queued. An available run may also be included. Delivery may retry.',
      );
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
        <p>Tell us what happened and what you wanted to do.</p>
        {!recording.on ? <p>Only your note is sent. Recording stays off.</p> : null}
        {lab.personaRecordingRequired ? (
          <label className="v-feedback-export-option">
            <input
              type="checkbox"
              checked={personaLinked}
              onChange={(e) => {
                lab.allowPersonaRecording(e.target.checked);
                setPersonaLinked(lab.personaRecordingAllowed);
              }}
            />
            Link this continuing person to lab recording (optional)
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
            A name is optional and remembered on this device. It labels linked play only when recording is
            allowed.
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
            Your note{recording.on ? ' and this run' : ''}
            {name.trim() ? ', with your name' : ''}.
          </p>
          {recording.on && !personaLinked ? (
            <p>
              This run includes continuing character state. It is not linked to your recorded play history.
            </p>
          ) : null}
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
          disabled={!sent && busy}
          onClick={sent ? onReturn : send}
        >
          {sent ? 'Back to the game' : busy ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
