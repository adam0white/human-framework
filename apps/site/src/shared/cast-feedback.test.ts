// @vitest-environment happy-dom
import type { SendDialogOptions } from '@adam0white/lab-client';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';

const controls = vi.hoisted(() => ({
  open: vi.fn((options: unknown) => options),
  send: vi.fn(async () => 'queued'),
  fresh: vi.fn(),
}));
vi.mock('@adam0white/lab-client', () => ({ openSendDialog: controls.open }));
vi.mock('./lab.tsx', () => {
  const lab = { sendFeedback: controls.send, personaRecordingRequired: true };
  return { gameLabs: { voice: lab, well: lab, watch: lab } };
});
vi.mock('./cast-runtime.ts', () => ({
  castChanges: () => () => {},
  castState: () => ({ blocked: true, status: 'Unsupported authored role. Shelf unchanged.' }),
  startCastFresh: controls.fresh,
}));

import { CastStartGate } from './CastMenu.tsx';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(async () => {
  for (const root of roots) await act(() => root.unmount());
  roots.length = 0;
  document.body.innerHTML = '';
  vi.clearAllMocks();
});
it.each(['voice', 'watch', 'well'])(
  'opens safe feedback from %s admission refusal without starting a game',
  async (game) => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    roots.push(root);
    await act(() => root.render(createElement(CastStartGate, { game })));
    const send = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Feedback');
    expect(send).toBeDefined();
    expect(send?.disabled).toBe(false);
    await act(() => send?.click());
    expect(controls.open).toHaveBeenCalledOnce();
    const options = controls.open.mock.calls[0]?.[0] as SendDialogOptions;
    expect(options.getRun()).toBeUndefined();
    expect(options.lab.personaRecordingRequired).toBe(false);
    expect(options.title).toContain('no game run or state included');
    await options.lab.sendFeedback('Refusal feedback', { name: 'Tester' });
    expect(controls.send).toHaveBeenCalledWith('Refusal feedback', {
      name: 'Tester',
      sharePlay: undefined,
      run: { feedbackOnly: true },
    });
    expect(controls.fresh).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Unsupported authored role. Shelf unchanged.');
  },
);
