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
    { type: 'hf-lab-identity', action: 'on' },
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
