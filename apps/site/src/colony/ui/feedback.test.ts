// @vitest-environment happy-dom
import type { Lab } from '@adam0white/lab-client';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { Feedback } from './Feedback.tsx';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const actions = {
  getRun: vi.fn(async () => ({ seed: 42, inputs: [], end: { year: 1 } })),
};
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
    root.render(
      createElement(Feedback, {
        getRun: actions.getRun,
        onDownload: vi.fn(),
        lab: lab as unknown as Lab,
        onBack: vi.fn(),
      }),
    ),
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
  expect(lab.sendFeedback).toHaveBeenCalledWith('Verdict: keep', expect.objectContaining({ name: 'Tester' }));
  expect(lab.sendRun).not.toHaveBeenCalled();
  expect(node.textContent).toContain('Sent. Thank you.');
});
it.each(['unanswered', 'declined', 'off', 'privacy'])('sends in the same sheet when %s', async (choice) => {
  const lab = labStub();
  Object.assign(lab, {
    personaRecordingRequired: choice !== 'privacy',
    personaRecordingAllowed: false,
    allowPersonaRecording: vi.fn(),
  });
  if (choice === 'off') {
    localStorage.setItem('hf-lab-recording-off', '1');
    lab.telemetryOn = false;
  }
  if (choice === 'privacy') {
    lab.telemetryOn = false;
    lab.privacySignalOn = true;
  }
  const { node, send } = await mount(lab);
  expect(send().disabled).toBe(false);
  await act(async () => send().click());
  expect(lab.sendFeedback).toHaveBeenCalledOnce();
  expect(lab.openSendDialog).not.toHaveBeenCalled();
  expect(lab.setTelemetryOff).not.toHaveBeenCalled();
  expect(node.querySelectorAll('[role=dialog]')).toHaveLength(1);
});
