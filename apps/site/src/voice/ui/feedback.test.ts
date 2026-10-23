// @vitest-environment happy-dom
import type { Lab } from '@adam0white/lab-client';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { SendWord } from './SendWord.tsx';

vi.mock('../../shared/playtest.ts', () => ({ fetchBuild: vi.fn(async () => ({ commit: 'test' })) }));

import type { VoiceActions } from './useVoice.ts';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const actions = {
  getPlaytest: vi.fn(async () => ({ seed: 42, inputs: [], end: { year: 1 } })),
} as unknown as VoiceActions;
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(async () => {
  for (const root of roots) await act(() => root.unmount());
  roots.length = 0;
  localStorage.clear();
  document.body.innerHTML = '';
});
function labStub() {
  return {
    telemetryOn: true,
    privacySignalOn: false,
    privacyOverride: false,
    sendFeedback: vi.fn(async () => 'queued'),
    sendRun: vi.fn(async () => 'queued'),
    openSendDialog: vi.fn(),
    setTelemetryOff: vi.fn(),
  };
}
async function mount(lab: ReturnType<typeof labStub>) {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  roots.push(root);
  await act(() =>
    root.render(createElement(SendWord, { actions, lab: lab as unknown as Lab, onBack: vi.fn() })),
  );
  return {
    node,
    send: () => {
      const button = [...node.querySelectorAll('button')].find((b) => b.textContent === 'Send');
      if (!button) throw new Error('Expected Send');
      return button;
    },
  };
}
it('sends optional verdict and remembered name as feedback when recording is on', async () => {
  localStorage.setItem('hf-lab-feedback-name', 'Tester');
  const lab = labStub();
  const { node, send } = await mount(lab);
  expect(node.querySelector<HTMLInputElement>('input[type=text]')?.value).toBe('Tester');
  await act(() =>
    [...node.querySelectorAll('button')].find((b) => b.textContent === 'I’d keep playing')?.click(),
  );
  await act(async () => send().click());
  expect(lab.sendFeedback).toHaveBeenCalledWith('Verdict: keep', { name: 'Tester' });
  expect(lab.sendRun).not.toHaveBeenCalled();
  expect(node.textContent).toContain('Sent. Thank you.');
});
it('blocks explicit recording off and turns recording on only through its inline switch', async () => {
  localStorage.setItem('hf-lab-recording-off', '1');
  const lab = labStub();
  lab.telemetryOn = false;
  lab.setTelemetryOff.mockImplementation(() => {
    localStorage.removeItem('hf-lab-recording-off');
    lab.telemetryOn = true;
  });
  const { node, send } = await mount(lab);
  expect(node.textContent).toContain('Recording is off, so nothing is sent.');
  expect(send().disabled).toBe(true);
  await act(() => node.querySelector<HTMLInputElement>('input[type=checkbox]')?.click());
  expect(send().disabled).toBe(false);
  expect(lab.setTelemetryOff).toHaveBeenCalledWith(false);
});
it('requires per-send consent under browser privacy and sends the unlinked run', async () => {
  const lab = labStub();
  lab.telemetryOn = false;
  lab.privacySignalOn = true;
  const { node, send } = await mount(lab);
  expect(send().disabled).toBe(true);
  await act(() => node.querySelector<HTMLInputElement>('input[type=checkbox]')?.click());
  await act(async () => send().click());
  expect(lab.sendFeedback).not.toHaveBeenCalled();
  expect(lab.sendRun).toHaveBeenCalledWith(
    { seed: 42, inputs: [], end: { year: 1 }, build: { commit: 'test' } },
    { note: '', name: '' },
  );
  expect(node.textContent).toContain('Sent. Thank you.');
});

it('preserves note and name when the privacy send falls back to the dialog', async () => {
  const lab = labStub();
  lab.telemetryOn = false;
  lab.privacySignalOn = true;
  lab.sendRun.mockRejectedValueOnce(new Error('network'));
  localStorage.setItem('hf-lab-feedback-name', 'Tester');
  const { node, send } = await mount(lab);
  await act(() => [...node.querySelectorAll('button')].find((b) => b.textContent === 'Not sure')?.click());
  await act(() => node.querySelector<HTMLInputElement>('input[type=checkbox]')?.click());
  await act(async () => send().click());
  expect(lab.openSendDialog).toHaveBeenCalledWith(
    expect.objectContaining({ note: 'Verdict: mixed', name: 'Tester' }),
  );
});
