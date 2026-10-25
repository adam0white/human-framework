import { useState } from 'react';
import { labMode } from '../../shared/lab-mode.ts';
import { settingWords } from '../../shared/setting-words.ts';
export function Premise({
  ready,
  savedRun = null,
  onBegin,
  onContinue = onBegin,
  onOtherWays = () => {},
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
          Help Halil reach his goals during Ramadan, the fasting month. On Eid, the festival at its end, he
          will act without your advice.
        </p>
        <p>You suggest what Halil could do. He decides whether to do it.</p>
        {labMode() && (
          <button type="button" className="v-shelf-row" onClick={onOtherWays}>
            Lab tools <span>▸</span>
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
                ? 'Replace the month and begin'
                : 'Begin the month again'
              : 'Begin'}
        </button>
        {confirm && (
          <button type="button" className="v-btn" onClick={() => setConfirm(false)}>
            Keep this month
          </button>
        )}
      </div>
    </main>
  );
}
