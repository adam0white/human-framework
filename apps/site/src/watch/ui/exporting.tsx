/**
 * The playtest export (spec §6), offered from the chronicle and from the end pages: the seed, the Keeper's input
 * log and the end state as JSON. Copy puts it on the clipboard; Save writes it as a file, which suits a phone,
 * where a long clipboard paste into a message is awkward. If both are blocked the text is shown to select.
 */
import { useState } from 'react';
import { Icon } from './icons.tsx';
import type { WatchActions } from './useWatch.ts';

function fileName(seed: number, year: number): string {
  return `night-watch-seed${seed}-year${year}.json`;
}

export function ExportButtons({ actions, label }: { actions: WatchActions; label?: string }) {
  const [status, setStatus] = useState('');
  const [text, setText] = useState('');

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
          <Icon name="download" size={16} /> Save it as a file
        </button>
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
