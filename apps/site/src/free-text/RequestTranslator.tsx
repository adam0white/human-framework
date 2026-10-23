import { useEffect, useRef, useState } from 'react';
import type { Draft } from '../voice/protocol.ts';
import type { ListedAct, Translation } from './core.ts';

/** Text never enters the engine. Only a confirmed, still-listed canonical draft does. */
export function RequestTranslator({
  acts,
  scene,
  onHold,
  onConfirm,
}: {
  acts: ListedAct[];
  scene: string;
  onHold: () => void;
  onConfirm: (draft: Draft) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [proposal, setProposal] = useState<{ act: Translation; scene: string } | null>(null);
  const latest = useRef(scene);
  latest.current = scene;
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const run = async () => {
    setProposal(null);
    setMessage('');
    let browser: string;
    try {
      browser = localStorage.getItem('hf-free-text-browser') ?? crypto.randomUUID();
      localStorage.setItem('hf-free-text-browser', browser);
      const day = new Date().toISOString().slice(0, 10);
      const key = `hf-free-text-count:${day}`;
      const used = Number(localStorage.getItem(key) ?? 0);
      if (!Number.isInteger(used) || used >= 10)
        throw Error('Daily translation limit reached. Choose from the menu.');
      // Reserve before dispatch, including failed calls. Server enforces its own independent cap.
      localStorage.setItem(key, String(used + 1));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Translation needs browser storage. Choose from the menu.',
      );
      return;
    }
    const captured = scene;
    const control = new AbortController();
    request.current = control;
    const timer = setTimeout(() => control.abort(), 5000);
    setBusy(true);
    try {
      const response = await fetch('/lab/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, browser, acts }),
        signal: control.signal,
      });
      const data = (await response.json()) as { candidate?: Translation; error?: string };
      if (latest.current !== captured) {
        setMessage('The scene changed. Choose from the current menu.');
        return;
      }
      const c = data.candidate;
      if (
        response.ok &&
        c &&
        c.target === 'Halil' &&
        c.timing === 'now' &&
        c.strength === 'mention' &&
        c.insist === false &&
        acts.some((a) => a.id === c.optionId)
      )
        setProposal({ act: c, scene: captured });
      else
        setMessage(
          response.ok
            ? 'No single immediate suggestion matched. Choose from the menu or rewrite it.'
            : (data.error ?? 'Translation unavailable. Choose from the menu.'),
        );
    } catch {
      setMessage('Translation unavailable or timed out. Choose from the menu.');
    } finally {
      clearTimeout(timer);
      setBusy(false);
      request.current = null;
    }
  };
  const current = proposal?.scene === scene ? proposal : null;
  return (
    <section className="v-free-text" aria-label="Experimental request translator">
      <label htmlFor="free-text-request">Write a suggestion to Halil</label>
      <p className="v-hint">
        Experimental. Sends these words and the listed choices to Cloudflare AI. Avoid personal details. Ten
        tries per day; the menu always works.
      </p>
      <textarea
        id="free-text-request"
        maxLength={400}
        value={text}
        onFocus={onHold}
        onChange={(e) => {
          setText(e.target.value);
          setProposal(null);
        }}
        disabled={busy}
      />
      <button
        type="button"
        disabled={busy || !text.trim() || acts.length === 0}
        onClick={() => {
          onHold();
          void run();
        }}
      >
        {busy ? 'Finding a suggestion…' : 'Find a suggestion'}
      </button>
      <div role="status">
        {message}
        {proposal && !current && 'The scene changed. Translate again or use the menu.'}
      </div>
      {current && (
        <div>
          <p>
            Mention to Halil: {acts.find((a) => a.id === current.act.optionId)?.label}. Timing: now. No
            insistence. He can refuse.
          </p>
          <button
            type="button"
            onClick={() => {
              if (latest.current !== current.scene || !acts.some((a) => a.id === current.act.optionId))
                return;
              setProposal(null);
              onConfirm({ optionId: current.act.optionId, strength: 'mention', insist: false });
            }}
          >
            Confirm this suggestion
          </button>
          <button type="button" onClick={() => setProposal(null)}>
            Use the menu instead
          </button>
        </div>
      )}
    </section>
  );
}
