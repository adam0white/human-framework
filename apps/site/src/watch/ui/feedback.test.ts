// @vitest-environment happy-dom
import type { Lab } from '@adam0white/lab-client';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { chooseCastRecording } from '../../shared/cast-runtime.ts';

vi.mock('../../shared/cast-runtime.ts', () => ({ chooseCastRecording: vi.fn() }));

import { FeedbackScreen } from './exporting.tsx';
import type { WatchActions } from './useWatch.ts';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const actions = {
  exportRun: vi.fn(async () => ({ seed: 42, inputs: [], end: { year: 1 } })),
} as unknown as WatchActions;
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(async () => {
  for (const root of roots) await act(() => root.unmount());
  roots.length = 0;
  vi.mocked(chooseCastRecording).mockReset();
  localStorage.clear();
  document.body.innerHTML = '';
});
function labStub() {
  return {
    telemetryOn: true,
    personaRecordingRequired: false,
    personaRecordingAllowed: false,
    allowPersonaRecording: vi.fn(),
    privacySignalOn: false,
    privacyOverride: false,
    sendFeedback: vi.fn(
      async (_note: string, _options?: { name?: string; sharePlay?: boolean; run?: unknown }) => 'queued',
    ),
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
    root.render(createElement(FeedbackScreen, { actions, lab: lab as unknown as Lab, onBack: vi.fn() })),
  );
  return {
    node,
    send: () => {
      const button = [...node.querySelectorAll('button')].find((b) => b.textContent === 'Submit');
      if (!button) throw new Error('Expected Submit');
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
  expect(node.textContent).toContain('Sent. Your note is stored.');
});
it.each([
  ['off', false],
  ['off', true],
  ['privacy', false],
  ['privacy', true],
])('offers one deferred sharing checkbox when %s and submits with sharing %s', async (mode, share) => {
  const lab = labStub();
  lab.telemetryOn = false;
  lab.privacySignalOn = mode === 'privacy';
  const { node, send } = await mount(lab);
  const checkbox = node.querySelector<HTMLInputElement>('input[type=checkbox]');
  expect(checkbox).not.toBeNull();
  expect(checkbox?.checked).toBe(false);
  expect(checkbox?.parentElement?.textContent).toContain('Share this run and my play with the lab');
  if (share) await act(() => checkbox?.click());
  expect(lab.sendFeedback).not.toHaveBeenCalled();
  expect(lab.setTelemetryOff).not.toHaveBeenCalled();
  await act(async () => send().click());
  expect(lab.sendFeedback).toHaveBeenCalledOnce();
  const options = vi.mocked(lab.sendFeedback).mock.calls[0]?.[1];
  expect(options).toMatchObject({ sharePlay: share });
  expect(options?.run).toEqual(share ? { seed: 42, inputs: [], end: { year: 1 } } : undefined);
  expect(node.querySelectorAll('[role=dialog]')).toHaveLength(1);
  expect(lab.openSendDialog).not.toHaveBeenCalled();
});
it('recording on sends the run with no separate linkage controls, including old denials', async () => {
  const lab = labStub();
  lab.personaRecordingRequired = true;
  lab.personaRecordingAllowed = false;
  const { node, send } = await mount(lab);
  expect(node.querySelectorAll('input[type=checkbox]')).toHaveLength(0);
  await act(async () => send().click());
  expect(lab.sendFeedback).toHaveBeenCalledWith('', {
    name: '',
    sharePlay: false,
    run: { seed: 42, inputs: [], end: { year: 1 } },
  });
  expect(lab.allowPersonaRecording).not.toHaveBeenCalled();
});
