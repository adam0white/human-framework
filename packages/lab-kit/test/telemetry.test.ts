import { expect, it } from 'vitest';
import { TELEMETRY_NOTICE, telemetryNotice, telemetryToggle } from '../src/telemetry.ts';

it('shows one disclosure across games and uses the global telemetry preference', () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  expect(telemetryNotice(storage)?.textContent).toContain(TELEMETRY_NOTICE);
  expect(telemetryNotice(storage)).toBeNull();
  let on = true;
  const label = telemetryToggle({
    get telemetryOn() {
      return on;
    },
    setTelemetryOff: (off) => {
      on = !off;
    },
  });
  const input = label.querySelector('input');
  expect(input?.checked).toBe(true);
  if (input) {
    input.checked = false;
    input.dispatchEvent(new Event('change'));
  }
  expect(on).toBe(false);
  expect(input?.checked).toBe(false);
});
