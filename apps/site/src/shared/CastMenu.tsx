import { playerError } from './player-error.ts';
import { settingWords } from './setting-words.ts';
import './cast-life.css';
import { type Lab, openSendDialog } from '@adam0white/lab-client';
import { useEffect, useState } from 'react';
import {
  castChanges,
  castState,
  checkpointCast,
  selectCast,
  setCastEnabled,
  startCastFresh,
} from './cast-runtime.ts';
import { gameLabs } from './lab.tsx';
import { labMode } from './lab-mode.ts';
export function CastMenu({ game }: { game: string }) {
  const [, refresh] = useState(0);
  useEffect(() => castChanges(() => refresh((n) => n + 1)), []);
  const s = castState(game);
  if (!labMode()) return null;
  return (
    <section className="cast-life-menu">
      <label>
        <input type="checkbox" checked={s.enabled} onChange={(e) => setCastEnabled(e.target.checked)} /> Keep
        fictional people and between-game life in this browser
      </label>
      <p>
        Life advances only when starting a new chapter. Every compatible saved person enters a fresh chapter
        together. Loaded play stays pinned. No full days, healing or completed duties are inferred.
      </p>
      <label>
        Person to save{' '}
        <select value={s.selected} onChange={(e) => selectCast(game, e.target.value)}>
          {s.people.map((p) => (
            <option key={p.castId} value={p.castId}>
              {settingWords(p.name)}
            </option>
          ))}
        </select>
      </label>
      <button type="button" disabled={s.busy || !s.enabled} onClick={() => void checkpointCast(game)}>
        Save this person for another chapter
      </button>
      <button type="button" disabled={s.busy || !s.enabled} onClick={() => void checkpointCast(game, true)}>
        Save this played person as an explicit fresh branch
      </button>
      <button type="button" onClick={() => startCastFresh(game)}>
        Use fresh local play
      </button>
      <p role="status">{s.status}</p>
      <a href="/lab/people/" target="_blank" rel="noopener">
        Inspect, export, delete or explicitly branch people
      </a>
    </section>
  );
}
export function CastLifeNote({ game }: { game: string }) {
  const [, refresh] = useState(0);
  useEffect(() => castChanges(() => refresh((n) => n + 1)), []);
  const s = castState(game);
  return s.line ? (
    <details className="cast-life-note">
      <summary>Before this chapter</summary>
      <p>{settingWords(s.line)}</p>
    </details>
  ) : null;
}

/** Explicit feedback must not request a snapshot from a worker that could not initialize. */
function openCastFeedback(game: string): void {
  if (game !== 'voice' && game !== 'watch' && game !== 'well') return;
  const lab = gameLabs[game];
  const feedbackLab = Object.create(lab) as Lab;
  // No admitted run is available on this refusal path.
  Object.defineProperty(feedbackLab, 'personaRecordingRequired', { value: false });
  feedbackLab.sendFeedback = (note, options) =>
    lab.sendFeedback(note, {
      name: options?.name,
      sharePlay: options?.sharePlay,
      run: { feedbackOnly: true },
    });
  openSendDialog({
    lab: feedbackLab,
    title: 'Feedback (no game run or state included)',
    getRun: () => undefined,
  });
}

/** Present even before the worker has an initial game view. A failed batch never traps startup. */
export function CastStartGate({ game }: { game: string }) {
  const [, refresh] = useState(0);
  useEffect(() => castChanges(() => refresh((n) => n + 1)), []);
  const s = castState(game);
  if (!s.blocked) return null;
  return (
    <section className="cast-start-gate" role="dialog" aria-label="Continuing cast unavailable">
      <h2>These people cannot begin together yet</h2>
      <p>{playerError(s.status)}</p>
      <p>You can return to an earlier game, or begin a separate local game here.</p>
      <button type="button" onClick={() => startCastFresh(game)}>
        Start a separate local game
      </button>
      <button type="button" onClick={() => openCastFeedback(game)}>
        Feedback
      </button>
      {labMode() && <a href="/lab/people/">Inspect or export the existing people</a>}
      <a href="/games/">All games</a>
    </section>
  );
}
