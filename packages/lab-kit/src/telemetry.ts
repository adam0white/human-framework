/** Shared origin-wide telemetry preference and first-visit notice. Transport belongs to the client. */
import { type FlagStorage, once } from './once.ts';

export type TelemetryLab = {
  readonly telemetryOn?: boolean;
  setTelemetryOff?: (off: boolean) => void;
  readonly eventsOn?: boolean;
  setEventsOff?: (off: boolean) => void;
};

export const TELEMETRY_NOTICE =
  'The lab records and links your play across games on this device. Turn Recording off in the menu.';
export function telemetryOn(lab: TelemetryLab): boolean {
  return lab.telemetryOn ?? lab.eventsOn ?? false;
}
export function setTelemetryOff(lab: TelemetryLab, off: boolean): void {
  if (lab.setTelemetryOff) lab.setTelemetryOff(off);
  else lab.setEventsOff?.(off);
}

/** One notice per origin, shared by all games. The caller mounts it on first visit. */
export function telemetryNotice(storage?: FlagStorage | null): HTMLElement | null {
  if (!once('telemetry-notice-v1', storage)) return null;
  const notice = document.createElement('p');
  notice.className = 'lk-telemetry-notice';
  notice.setAttribute('role', 'status');
  notice.textContent = TELEMETRY_NOTICE;
  Object.assign(notice.style, {
    position: 'static',
    boxSizing: 'border-box',
    width: '100%',
    margin: '0',
    padding: '0.4rem 0.75rem',
    background: '#fffaf0',
    color: '#2b2622',
    border: '1px solid #6b6158',
    font: 'clamp(0.875rem, 0.8rem + 0.2vw, 1rem)/1.4 system-ui',
  });
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.textContent = 'Dismiss';
  dismiss.style.marginInlineStart = '0.75rem';
  dismiss.addEventListener('click', () => notice.remove());
  notice.append(' ', dismiss);
  // Await central notice state when the peer supports it; blocked frames use once/origin.
  notice.style.visibility = 'hidden';
  void import('@adam0white/lab-client')
    .then(async (client) => {
      const show = typeof client.claimLabNotice === 'function' ? await client.claimLabNotice() : true;
      if (show) notice.style.visibility = 'visible';
      else notice.remove();
    })
    .catch(() => {
      notice.style.visibility = 'visible';
    });
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
