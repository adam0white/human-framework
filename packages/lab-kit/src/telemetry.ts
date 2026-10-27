/** Shared origin-wide telemetry preference and first-visit notice. Transport belongs to the client. */
import { type FlagStorage, once } from './once.ts';

export type TelemetryLab = {
  readonly telemetryOn?: boolean;
  setTelemetryOff?: (off: boolean) => void;
  readonly eventsOn?: boolean;
  setEventsOff?: (off: boolean) => void;
};

export const TELEMETRY_NOTICE = 'We record and link play across games on this device.';
export function telemetryOn(lab: TelemetryLab): boolean {
  return lab.telemetryOn ?? lab.eventsOn ?? false;
}
export function setTelemetryOff(lab: TelemetryLab, off: boolean): void {
  if (lab.setTelemetryOff) lab.setTelemetryOff(off);
  else lab.setEventsOff?.(off);
}

/** One notice per origin, shared by all games. The caller mounts it on first visit. */
/** The recording notice stays at least this long before a click can dismiss it. */
const NOTICE_MIN_MS = 4000;

export function telemetryNotice(
  storage?: FlagStorage | null,
  options: { preservation?: 'preserve' } = {},
): HTMLElement | null {
  const preserve = options.preservation === 'preserve';
  if (!preserve && !once('telemetry-notice-v1', storage)) return null;
  const notice = document.createElement('p');
  notice.className = 'lk-telemetry-notice';
  notice.setAttribute('role', 'status');
  notice.textContent = TELEMETRY_NOTICE;
  Object.assign(notice.style, {
    position: 'static',
    boxSizing: 'border-box',
    width: '100%',
    margin: '0',
    padding: '0.25rem 0.5rem',
    background: '#fffaf0',
    color: '#2b2622',
    border: '1px solid #6b6158',
    font: 'max(14px, 0.875rem)/1.35 system-ui',
    // A status line, never a control: taps reach the game controls beneath it.
    pointerEvents: 'none',
  });
  // After a few seconds on screen, the next click or tap anywhere dismisses it. The click reaches its control first:
  // removal waits one frame, so the layout never moves under the finger. Tab and other keys leave it in place.
  // Recording stays on; the one menu switch is unchanged.
  const show = () => {
    notice.style.visibility = 'visible';
    const doc = notice.ownerDocument;
    const shownAt = performance.now();
    const dismiss = () => {
      if (performance.now() - shownAt < NOTICE_MIN_MS) return;
      doc.removeEventListener('click', dismiss, true);
      (doc.defaultView ?? globalThis).requestAnimationFrame(() => notice.remove());
    };
    doc.addEventListener('click', dismiss, true);
  };
  if (preserve) {
    // Informational only: do not claim or rewrite an existing notice on either origin.
    show();
    return notice;
  }
  // Await central notice state when the peer supports it; blocked frames use once/origin.
  notice.style.visibility = 'hidden';
  void import('@adam0white/lab-client')
    .then(async (client) => {
      const claimed = typeof client.claimLabNotice === 'function' ? await client.claimLabNotice() : true;
      if (claimed) show();
      else notice.remove();
    })
    .catch(show);
  return notice;
}

/** Create on menu open so another game's preference change is reflected. */
export function telemetryToggle(lab: TelemetryLab): HTMLLabelElement {
  const label = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = telemetryOn(lab);
  input.addEventListener('change', () => {
    setTelemetryOff(lab, !input.checked);
    input.checked = telemetryOn(lab);
  });
  label.append(input, ' Recording');
  return label;
}
