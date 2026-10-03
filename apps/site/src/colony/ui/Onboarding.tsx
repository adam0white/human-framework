import type { Frame } from '../sim/game.ts';

export type OnboardingStep = 'intro' | 'hand' | 'toast' | 'done';

/** Glowing hand over the Human pane: tap Yusuf, then the building site (spec §8, 3 s). */
export function Hand({ frame }: { frame: Frame | null }) {
  const y = frame?.human.find((v) => v.id === 'yusuf');
  if (!y) return null;
  const x1 = ((y.x + 0.5) / 20) * 100;
  const y1 = ((y.y + 0.5) / 14) * 100;
  const x2 = (16.5 / 20) * 100;
  const y2 = (9.5 / 14) * 100;
  return (
    <div
      className="hand"
      aria-hidden="true"
      style={
        {
          '--x1': `${x1}%`,
          '--y1': `${y1}%`,
          '--x2': `${x2}%`,
          '--y2': `${y2}%`,
        } as React.CSSProperties
      }
    >
      <span className="hand-dot" />
    </div>
  );
}

export function IntroCard({ step, onSkip }: { step: OnboardingStep; onSkip(): void }) {
  if (step === 'intro') {
    return (
      <div className="intro" role="status">
        <p className="intro-line">Two villages, one voice. Give an order; both hear it.</p>
      </div>
    );
  }
  if (step === 'hand') {
    return (
      <div className="coach" role="status">
        <span>
          Tap <b>Yusuf</b>, then the <b>building site</b>.
        </span>
        <button type="button" className="btn btn-small btn-ghost" onClick={onSkip}>
          Skip
        </button>
      </div>
    );
  }
  if (step === 'toast') {
    return (
      <div className="coach coach-toast" role="status">
        <span>Tap any bubble to see why.</span>
      </div>
    );
  }
  return null;
}
