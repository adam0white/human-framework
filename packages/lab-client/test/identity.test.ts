import { afterEach, expect, it, vi } from 'vitest';
import { identityBridge } from '../src/identity.ts';

afterEach(() => vi.unstubAllGlobals());
it('retains an explicit on choice until a newly created cross-origin frame loads', async () => {
  const values = new Map<string, string>([['hf-lab-recording-off', '1']]);
  const listeners = new Map<string, (event: unknown) => void>();
  const frameListeners = new Map<string, () => void>();
  const send = vi.fn();
  const frame = {
    contentWindow: { postMessage: send },
    addEventListener: (kind: string, fn: () => void) => frameListeners.set(kind, fn),
  };
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.stubGlobal('location', { hostname: 'pass.adamwhite.work', origin: 'https://pass.adamwhite.work' });
  vi.stubGlobal('document', { body: { append: vi.fn() }, createElement: () => frame });
  vi.stubGlobal('window', {
    addEventListener: (kind: string, fn: (event: unknown) => void) => listeners.set(kind, fn),
  });
  const changed = vi.fn();
  const bridge = identityBridge(changed);
  bridge.setOff(false);
  frameListeners.get('load')?.();
  expect(send).toHaveBeenLastCalledWith(
    expect.objectContaining({ type: 'hf-lab-identity', action: 'on' }),
    'https://human.adamwhite.work',
  );
  listeners.get('message')?.({
    origin: 'https://hostile.test',
    source: frame.contentWindow,
    data: { type: 'hf-lab-identity', player: 'a'.repeat(32), off: false },
  });
  expect(changed).not.toHaveBeenCalled();
  listeners.get('message')?.({
    origin: 'https://human.adamwhite.work',
    source: frame.contentWindow,
    data: { type: 'hf-lab-identity', player: 'a'.repeat(32), off: false },
  });
  await bridge.ready;
  expect(changed).toHaveBeenCalledWith('a'.repeat(32), false);
});

it('waits for each switch acknowledgement and rejects stale opposite replies', async () => {
  const values = new Map<string, string>();
  const listeners = new Map<string, (event: unknown) => void>();
  const frameListeners = new Map<string, () => void>();
  const send = vi.fn();
  const frame = {
    contentWindow: { postMessage: send },
    addEventListener: (kind: string, fn: () => void) => frameListeners.set(kind, fn),
  };
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.stubGlobal('location', { hostname: 'pass.adamwhite.work', origin: 'https://pass.adamwhite.work' });
  vi.stubGlobal('document', { body: { append: vi.fn() }, createElement: () => frame });
  vi.stubGlobal('window', {
    addEventListener: (kind: string, fn: (event: unknown) => void) => listeners.set(kind, fn),
  });
  const changed = vi.fn();
  const bridge = identityBridge(changed);
  frameListeners.get('load')?.();
  const initial = send.mock.lastCall?.[0].requestId;
  const reply = (requestId: string, off: boolean, revision: number) =>
    listeners.get('message')?.({
      origin: 'https://human.adamwhite.work',
      source: frame.contentWindow,
      data: { type: 'hf-lab-identity', requestId, revision, off, player: off ? null : 'a'.repeat(32) },
    });
  reply(initial, false, 0);
  await bridge.ready;
  changed.mockClear();
  bridge.setOff(true);
  const offId = send.mock.lastCall?.[0].requestId;
  reply(initial, false, 0);
  expect(changed).not.toHaveBeenCalled();
  reply(offId, true, 1);
  await bridge.ready;
  bridge.setOff(false);
  let settled = false;
  const ready = bridge.ready.then(() => {
    settled = true;
  });
  await Promise.resolve();
  expect(settled).toBe(false);
  const onId = send.mock.lastCall?.[0].requestId;
  reply(offId, true, 1);
  expect(changed).toHaveBeenCalledTimes(1);
  reply(onId, false, 2);
  await ready;
  expect(changed).toHaveBeenLastCalledWith('a'.repeat(32), false);
  reply(initial, false, 0);
  expect(changed).toHaveBeenCalledTimes(2);
});
