/** Feedback is separate from reading and saves. Downloads always remain available. */
import type { Lab } from '@adam0white/lab-client';
import { setTelemetryOff, telemetryOn } from '@adam0white/lab-kit';
import { useEffect, useRef, useState } from 'react';
import { gameLabs } from '../../shared/lab.tsx';
import type { WatchActions } from './useWatch.ts';

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
  return stored('hf-lab-recording-off') === '1' || stored('hf-lab-events-off:watch') === '1';
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
  lab = gameLabs.watch,
  privacy = true,
}: {
  lab?: Lab;
  privacy?: boolean;
}) {
  const recording = useRecording(lab);
  return (
    <div className="w-recording">
      <label className="w-export-option">
        <input
          type="checkbox"
          checked={!recording.off && recording.on}
          onChange={(e) => recording.change(e.target.checked)}
        />{' '}
        Record play for the lab
      </label>
      {privacy ? (
        <a className="w-export-option" href={PRIVACY}>
          Lab privacy
        </a>
      ) : null}
    </div>
  );
}

export function DownloadRun({
  actions,
  label = 'Download this run',
}: {
  actions: WatchActions;
  label?: string;
}) {
  const [status, setStatus] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="w-download">
      <button
        type="button"
        className="w-secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const data = await actions.exportRun();
            const json = JSON.stringify(data);
            try {
              const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
              const a = document.createElement('a');
              a.href = url;
              a.download = `night-watch-seed${data.seed}-year${data.end.year}.json`;
              document.body.append(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 10_000);
              setStatus('Copy downloaded.');
            } catch {
              setText(json);
              setStatus('Saving was blocked; select the text below.');
            }
          } catch {
            setStatus('This run could not be prepared. Please try again.');
          } finally {
            setBusy(false);
          }
        }}
      >
        {label}
      </button>
      {status ? (
        <p className="w-note" role="status">
          {status}
        </p>
      ) : null}
      {text ? <textarea aria-label="Run JSON" className="w-export" readOnly value={text} rows={4} /> : null}
    </div>
  );
}

export function RunSecondaries({ actions, onFeedback }: { actions: WatchActions; onFeedback?: () => void }) {
  const [feedback, setFeedback] = useState(false);
  return (
    <>
      <div className="w-run-secondaries">
        <button
          type="button"
          className="w-secondary"
          onClick={() => (onFeedback ? onFeedback() : setFeedback(true))}
        >
          Send word
        </button>
        <DownloadRun actions={actions} />
      </div>
      {feedback ? <FeedbackScreen actions={actions} onBack={() => setFeedback(false)} /> : null}
    </>
  );
}

export function FeedbackScreen({
  actions,
  onBack,
  lab = gameLabs.watch,
}: {
  actions: WatchActions;
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
      screen.current?.style.setProperty('--w-feedback-height', `${viewport.height - 44}px`);
      screen.current?.style.setProperty('--w-feedback-top', `${viewport.offsetTop + 44}px`);
    };
    resize();
    viewport.addEventListener('resize', resize);
    viewport.addEventListener('scroll', resize);
    return () => {
      viewport.removeEventListener('resize', resize);
      viewport.removeEventListener('scroll', resize);
    };
  }, []);
  const disabled = recording.off || (privacyOnly ? !consent : !recording.on);
  const send = async () => {
    if (disabled || pending.current) return;
    pending.current = true;
    setBusy(true);
    setStatus('');
    const message = [verdict ? `Verdict: ${verdict}` : '', note.trim()].filter(Boolean).join('\n\n');
    try {
      if (privacyOnly) {
        const run = await actions.exportRun();
        try {
          await lab.sendRun(run, { note: message, name: name.trim() });
        } catch {
          lab.openSendDialog({
            getRun: () => run,
            note: message,
            name: name.trim(),
            onSent: () => {
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
      try {
        if (name.trim()) localStorage.setItem(NAME_KEY, name.trim());
        else localStorage.removeItem(NAME_KEY);
      } catch {
        /* Device storage is optional. */
      }
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
    <div ref={screen} className="w-overlay w-sub-sheet w-feedback" role="dialog" aria-label="Send word">
      <div className="w-menu-head">
        <button type="button" className="w-secondary" onClick={onBack}>
          ← Back
        </button>
        <h2>Send word</h2>
      </div>
      <div className="w-sheet-body">
        <p>Your run, saves and log reach us on their own. Tell us what they can’t show.</p>
        {recording.off ? (
          <div className="w-feedback-notice">
            <p>Recording is off, so nothing is sent.</p>
            <RecordingPreference lab={lab} privacy={false} />
          </div>
        ) : null}
        {privacyOnly ? (
          <label className="w-export-option">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Send
            this run with my note
          </label>
        ) : null}
        <fieldset className="w-verdicts" aria-label="Would you keep playing?">
          {[
            ['keep', 'I’d keep playing'],
            ['mixed', 'Not sure'],
            ['quit', 'I’d stop here'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className="w-secondary"
              aria-pressed={verdict === value}
              onClick={() => setVerdict(verdict === value ? '' : (value ?? ''))}
            >
              {label}
            </button>
          ))}
        </fieldset>
        <textarea
          className="w-feedback-note"
          aria-label="Your word"
          rows={4}
          placeholder="What happened, what you wanted, what got in the way."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <details className="w-feedback-name" open={name ? true : undefined}>
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
          <p className="w-note">
            A sent name labels your past and future play on this device. Leave it empty to stay pseudonymous.
          </p>
        </details>
        <details
          onToggle={async (e) => {
            if (e.currentTarget.open && !preview) {
              try {
                setPreview(JSON.stringify(await actions.exportRun(), null, 2));
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
          <pre className="w-feedback-preview">{preview}</pre>
          <a href={PRIVACY}>Lab privacy</a>
        </details>
        <DownloadRun actions={actions} label="Keep a copy of this run ↓" />
        {status ? (
          <p role="status" className="w-note">
            {status}
          </p>
        ) : null}
      </div>
      <div className="w-sheet-actions">
        <button
          type="button"
          className="w-primary"
          disabled={!sent && (disabled || busy)}
          onClick={sent ? onBack : send}
        >
          {sent ? 'Back to the game' : busy ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

/** Compatibility export for older callers. */
export function ExportButtons({ actions }: { actions: WatchActions; label?: string }) {
  return <RunSecondaries actions={actions} />;
}
