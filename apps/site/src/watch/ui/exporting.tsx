import { setTelemetryOff, telemetryOn } from '@adam0white/lab-kit';
/**
 * The playtest export (spec §6), offered from the chronicle and from the end pages: the seed, the Keeper's input
 * log and the end state as JSON. Copy puts it on the clipboard; Save writes it as a file, which suits a phone,
 * where a long clipboard paste into a message is awkward. If both are blocked the text is shown to select.
 */
import { useEffect, useRef, useState } from 'react';
import { gameLabs } from '../../shared/lab.tsx';
import { Icon } from './icons.tsx';
import type { WatchActions } from './useWatch.ts';

function fileName(seed: number, year: number): string {
  return `night-watch-seed${seed}-year${year}.json`;
}

export function ExportButtons({ actions, label }: { actions: WatchActions; label?: string }) {
  const [status, setStatus] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const sendPending = useRef(false);
  const restoreSendFocus = useRef<(() => void) | null>(null);
  useEffect(() => () => restoreSendFocus.current?.(), []);
  const [eventsOn, setEventsOn] = useState(telemetryOn(gameLabs.watch));
  useEffect(() => {
    const sync = () => setEventsOn(telemetryOn(gameLabs.watch));
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    document.addEventListener('change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      document.removeEventListener('change', sync);
    };
  }, []);

  const copy = async () => {
    const data = await actions.exportRun();
    const json = JSON.stringify(data);
    try {
      await navigator.clipboard.writeText(json);
      setStatus(`Copied (${Math.ceil(json.length / 1024)} KB). Paste it into a message to the team.`);
    } catch {
      setText(json);
      setStatus('Copy was blocked; select the text below, or save it as a file.');
    }
  };

  const saveFile = async () => {
    const data = await actions.exportRun();
    const json = JSON.stringify(data);
    try {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName(data.seed, data.end.year);
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus(`Saved as ${a.download}. Send that file to the team.`);
    } catch {
      setText(json);
      setStatus('Saving was blocked; select the text below.');
    }
  };

  return (
    <div className="w-export-box">
      <p className="w-note">
        {label ??
          'For the team: everything needed to replay your chronicle (the seed, what you chose and when, and how it stands now).'}
      </p>
      <div className="w-export-btns">
        <button type="button" className="w-secondary" onClick={copy}>
          <Icon name="copy" size={16} /> Copy the playtest
        </button>
        <button type="button" className="w-secondary" onClick={saveFile}>
          <Icon name="download" size={16} /> Download this run
        </button>
        <button
          type="button"
          className="w-secondary"
          aria-disabled={sending}
          onClick={async (event) => {
            if (sendPending.current) return;
            sendPending.current = true;
            const opener = event.currentTarget;
            setSending(true);
            try {
              const run = await actions.exportRun();
              if (!opener.isConnected) return;
              // Keep the menu mounted and its clock hold active. The client restores this origin.
              opener.focus();
              gameLabs.watch.openSendDialog({ getRun: () => run });
              // The client has no close callback. Restore after the hidden menu becomes visible again.
              const veil = document.querySelector('.hflab-veil');
              if (veil) {
                restoreSendFocus.current?.();
                let frame = 0;
                const observer = new MutationObserver(() => {
                  if (veil.isConnected) return;
                  observer.disconnect();
                  frame = requestAnimationFrame(() => {
                    // :has() visibility settles during the next rendering update.
                    frame = requestAnimationFrame(() => {
                      if (opener.isConnected) opener.focus();
                    });
                  });
                });
                observer.observe(document.body, { childList: true });
                restoreSendFocus.current = () => {
                  observer.disconnect();
                  cancelAnimationFrame(frame);
                };
              }
            } catch {
              setStatus('This run could not be prepared. Please try again.');
            } finally {
              sendPending.current = false;
              setSending(false);
            }
          }}
        >
          Send this run to the notebook
        </button>
        <label className="w-note w-export-option">
          <input
            type="checkbox"
            checked={eventsOn}
            onChange={(event) => {
              setTelemetryOff(gameLabs.watch, !event.target.checked);
              setEventsOn(telemetryOn(gameLabs.watch));
            }}
          />{' '}
          Record play for the lab
        </label>
        <a className="w-export-option" href="https://human.adamwhite.work/lab/privacy/">
          Lab privacy
        </a>
      </div>
      {status ? (
        <p className="w-note" role="status">
          {status}
        </p>
      ) : null}
      {text ? <textarea className="w-export" readOnly value={text} rows={4} /> : null}
    </div>
  );
}
