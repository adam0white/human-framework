/** Shared origin-wide telemetry preference and first-visit notice. Transport belongs to the client. */
import { type FlagStorage, once } from './once.ts';

export type TelemetryLab = {
  readonly telemetryOn?: boolean;
  setTelemetryOff?: (off: boolean) => void;
  readonly eventsOn?: boolean;
  setEventsOff?: (off: boolean) => void;
};

export const TELEMETRY_NOTICE = 'The lab records your play to improve the games. Turn off in the menu.';
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
    position: 'fixed',
    top: 'env(safe-area-inset-top, 0px)',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '10000',
    boxSizing: 'border-box',
    width: 'min(100%, 40rem)',
    margin: '0',
    padding: '0.75rem',
    background: '#fffaf0',
    color: '#2b2622',
    border: '1px solid #6b6158',
    font: '14px/1.4 system-ui',
  });
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.textContent = 'Dismiss';
  dismiss.style.marginInlineStart = '0.75rem';
  dismiss.addEventListener('click', () => notice.remove());
  notice.append(' ', dismiss);
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
  label.append(input, ' Record play for the lab');
  return label;
}
