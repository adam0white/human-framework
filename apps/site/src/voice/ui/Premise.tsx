import { useState } from 'react';
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
        <p className="v-lede">Help Halil toward his own ends, so that on Eid he does them without you.</p>
        <p>Suggest an action; Halil decides.</p>
        <button type="button" className="v-shelf-row" onClick={onOtherWays}>
          Other ways in <span>▸</span>
        </button>
      </div>
      <div className="v-page-actions">
        {savedRun && (
          <button type="button" className="v-btn v-btn-primary" disabled={!ready} onClick={onContinue}>
            Continue · {savedRun.label}
          </button>
        )}
        {confirm && <p>The month so far is replaced. Download it first from the menu if you want it.</p>}
        <button
          type="button"
          className={`v-btn ${savedRun ? '' : 'v-btn-primary'}`}
          disabled={!ready}
          onClick={() => (savedRun && !confirm ? setConfirm(true) : onBegin())}
        >
          {!ready
            ? 'Waking the town…'
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
