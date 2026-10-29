import { useState } from 'react';
import { voiceWords as settingWords } from './words.ts';
export function Premise({
  ready,
  savedRun = null,
  onBegin,
  onContinue = onBegin,
  onOtherWays,
}: {
  ready: boolean;
  savedRun?: { label: string } | null;
  onBegin: () => void;
  onContinue?: () => void;
  onOtherWays?: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <main className="v-page v-start-page">
      <div className="v-page-body v-premise">
        <svg className="v-premise-moon" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M30 6a18 18 0 1 0 12 30A15 15 0 0 1 30 6z" />
        </svg>
        <h1>The Day You Say Nothing</h1>
        <p className="v-lede">
          Halil is a widower. Help him reach his goals during Ramadan, the fasting month.
        </p>
        <p>You suggest what Halil could do. He decides whether to do it.</p>
        <p>You play selected days. Between them, you can leave suggestions for the days you skip.</p>
        <p>
          Eid is the festival at the end of Ramadan. On Eid, your new suggestions stop. You watch what he
          chooses; his habits and memories remain.
        </p>
        {onOtherWays && (
          <button type="button" className="v-shelf-row" onClick={onOtherWays}>
            Other ways in <span>▸</span>
          </button>
        )}
      </div>
      <div className="v-page-actions">
        {savedRun && (
          <button type="button" className="v-btn v-btn-primary" disabled={!ready} onClick={onContinue}>
            Continue · {settingWords(savedRun.label)}
          </button>
        )}
        {confirm && <p>Start a new game? This replaces the saved month.</p>}
        <button
          type="button"
          className={`v-btn ${savedRun ? '' : 'v-btn-primary'}`}
          disabled={!ready}
          onClick={() => (savedRun && !confirm ? setConfirm(true) : onBegin())}
        >
          {!ready
            ? 'Starting…'
            : savedRun
              ? confirm
                ? 'Replace this game and start again'
                : 'New game'
              : 'New game'}
        </button>
        {confirm && (
          <button type="button" className="v-btn" onClick={() => setConfirm(false)}>
            Keep this game
          </button>
        )}
      </div>
    </main>
  );
}
