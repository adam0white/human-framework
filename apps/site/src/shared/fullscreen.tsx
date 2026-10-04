/**
 * Phone helpers every game shares: a full-screen toggle and a screen wake lock.
 *
 * Full screen is requested from the button's click (a user gesture) with the browser's navigation UI hidden, and
 * the button only renders where `document.fullscreenEnabled` (so not on iPhone Safari). The wake lock is held
 * while the caller says the game clock runs, re-requested when the page becomes visible again (browsers drop it
 * on hide), and released otherwise. Both feature-detect and swallow errors: they are comforts, never required.
 * No orientation lock.
 */
import { useEffect, useState } from 'react';
import './fullscreen.css';

function fullscreenEnabled(): boolean {
  return typeof document !== 'undefined' && document.fullscreenEnabled === true;
}

/** Whether the page is full screen, kept in step with `fullscreenchange`, and a toggle to call from a click. */
export function useFullscreen(): { enabled: boolean; active: boolean; toggle: () => void } {
  const [active, setActive] = useState(
    () => typeof document !== 'undefined' && document.fullscreenElement !== null,
  );
  useEffect(() => {
    const on = () => setActive(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    }
  };
  return { enabled: fullscreenEnabled(), active, toggle };
}

/** Keeps the screen awake while `running` is true. */
export function useWakeLock(running: boolean): void {
  useEffect(() => {
    if (!running || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return undefined;
    let lock: WakeLockSentinel | null = null;
    let done = false;
    const get = () => {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      navigator.wakeLock.request('screen').then(
        (l) => {
          if (done) l.release().catch(() => {});
          else lock = l;
        },
        () => {},
      );
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') get();
    };
    get();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      done = true;
      document.removeEventListener('visibilitychange', onVis);
      lock?.release().catch(() => {});
      lock = null;
    };
  }, [running]);
}

/**
 * A small full-screen toggle. `variant="icon"` is a square icon button for a top bar; `variant="item"` is a text
 * row for a menu. Renders nothing where full screen is unavailable.
 */
export function FullscreenButton({
  variant = 'icon',
  className = '',
}: {
  variant?: 'icon' | 'item';
  className?: string;
}) {
  const { enabled, active, toggle } = useFullscreen();
  if (!enabled) return null;
  const label = active ? 'Exit full screen' : 'Full screen';
  return (
    <button
      type="button"
      className={`fs-btn fs-${variant} ${className}`}
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16">
        {active ? (
          <path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" />
        ) : (
          <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
        )}
      </svg>
      {variant === 'item' && <span>{label}</span>}
    </button>
  );
}
