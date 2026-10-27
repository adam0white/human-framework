import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TELEMETRY_NOTICE, telemetryNotice, telemetryToggle } from '../src/telemetry.ts';

const { claim } = vi.hoisted(() => ({ claim: vi.fn() }));
vi.mock('@adam0white/lab-client', () => ({ claimLabNotice: claim }));
beforeEach(() => {
  claim.mockReset().mockResolvedValue(true);
});
afterEach(() => document.body.replaceChildren());
function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}
it('shows one compact disclosure without another control and retains Recording off', async () => {
  const storage = memoryStorage();
  const notice = telemetryNotice(storage);
  expect(notice?.textContent).toBe('We record and link play across games on this device.');
  expect(notice?.textContent).toBe(TELEMETRY_NOTICE);
  expect(notice?.querySelector('button,input,a')).toBeNull();
  expect(telemetryNotice(storage)).toBeNull();
  await vi.waitFor(() => expect(notice?.style.visibility).toBe('visible'));
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
it('removes the same mounted node when the asynchronous shared claim is already taken', async () => {
  let reply: ((show: boolean) => void) | undefined;
  claim.mockImplementation(
    () =>
      new Promise<boolean>((resolve) => {
        reply = resolve;
      }),
  );
  const notice = telemetryNotice(memoryStorage());
  if (!notice) throw Error('Missing first disclosure');
  document.body.append(notice);
  expect(notice.style.visibility).toBe('hidden');
  await vi.waitFor(() => expect(reply).toBeDefined());
  reply?.(false);
  await vi.waitFor(() => expect(notice.isConnected).toBe(false));
  expect(document.querySelector('.lk-telemetry-notice')).toBeNull();
});
it('keeps the same readable node and once-origin fallback if the central claim fails', async () => {
  claim.mockRejectedValue(new Error('Blocked frame'));
  const storage = memoryStorage();
  const notice = telemetryNotice(storage);
  if (!notice) throw Error('Missing fallback disclosure');
  document.body.append(notice);
  await vi.waitFor(() => expect(notice.style.visibility).toBe('visible'));
  expect(document.querySelector('.lk-telemetry-notice')).toBe(notice);
  expect(telemetryNotice(storage)).toBeNull();
});
it('shows an informational preserving notice without claiming local or central notice state', async () => {
  const setItem = vi.fn();
  const storage = { getItem: () => '1', setItem };
  const notice = telemetryNotice(storage, { preservation: 'preserve' });
  expect(notice?.textContent).toBe(TELEMETRY_NOTICE);
  expect(notice?.style.visibility).toBe('visible');
  await Promise.resolve();
  expect(setItem).not.toHaveBeenCalled();
  expect(claim).not.toHaveBeenCalled();
});
it('lets clicks reach controls first and leaves on a click after it has been seen, with Recording unchanged', async () => {
  const notice = telemetryNotice(memoryStorage());
  if (!notice) throw Error('Missing disclosure');
  const control = document.createElement('button');
  let pressed = 0;
  control.addEventListener('click', () => pressed++);
  document.body.append(control, notice);
  expect(notice.style.pointerEvents).toBe('none');
  await vi.waitFor(() => expect(notice.style.visibility).toBe('visible'));
  control.click();
  await new Promise(requestAnimationFrame);
  expect(notice.isConnected).toBe(true);
  const now = performance.now();
  vi.spyOn(performance, 'now').mockReturnValue(now + 4000);
  control.click();
  expect(notice.isConnected).toBe(true);
  await new Promise(requestAnimationFrame);
  expect(pressed).toBe(2);
  expect(notice.isConnected).toBe(false);
  vi.restoreAllMocks();
});
