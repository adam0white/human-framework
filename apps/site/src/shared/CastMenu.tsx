import { DebugMenu } from './DebugMenu.tsx';
import { playerError } from './player-error.ts';
import { settingWords } from './setting-words.ts';
import './cast-life.css';
import { type Lab, openSendDialog } from '@adam0white/lab-client';
import { useEffect, useState } from 'react';
import { castChanges, castState, startCastFresh } from './cast-runtime.ts';
import { gameLabs } from './lab.tsx';
export function CastMenu(_props: { game: string }) {
  return (
    <p>
      <a href="/lab/people/">Your people on this browser</a>
    </p>
  );
}

export function CastLifeNote({ game }: { game: string }) {
  const [, refresh] = useState(0);
  useEffect(() => castChanges(() => refresh((n) => n + 1)), []);
  const s = castState(game);
  return (
    <>
      {s.localNotice ? <p role="status">{s.localNotice}</p> : null}
      {s.line ? (
        <details className="cast-life-note">
          <summary>Before this chapter</summary>
          <p>{settingWords(s.line)}</p>
        </details>
      ) : null}
    </>
  );
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
      <p>You can return to an earlier game, or start this game with local people.</p>
      <button type="button" onClick={() => startCastFresh(game)}>
        Start this game with local people
      </button>
      <button type="button" onClick={() => openCastFeedback(game)}>
        Feedback
      </button>
      <a href="/lab/people/">Open your people shelf</a>
      <a href="/games/">All games</a>
      <DebugMenu>
        <p>{s.status}</p>
      </DebugMenu>
    </section>
  );
}
