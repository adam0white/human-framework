// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import type { Frame } from '../protocol.ts';
import { VoiceGame } from '../sim/game.ts';
import { MenuPanel } from './ShellPanels.tsx';
import type { VoiceActions } from './useVoice.ts';

vi.mock('../../shared/CastMenu.tsx', () => ({ CastMenu: () => createElement('p', null, 'cast tools') }));
vi.mock('./persona.tsx', () => ({ VoicePersonaControls: () => createElement('p', null, 'persona tools') }));
vi.mock('./SendWord.tsx', () => ({ RecordingPreference: () => createElement('label', null, 'Recording') }));
function NoNotice() {
  return null;
}
function FileRecording() {
  return createElement('label', null, createElement('input', { type: 'checkbox' }), 'Recording');
}
function FileFeedback() {
  return createElement('p', { role: 'dialog' }, 'Send Feedback');
}
const cleanups: (() => void)[] = [];
function mount(node: React.ReactNode) {
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  flushSync(() => root.render(node));
  cleanups.push(() => {
    root.unmount();
    el.remove();
  });
  return el;
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  history.replaceState(null, '', '/');
});
it('offers gameplay controls publicly and confirms a new game inline', () => {
  const onTitle = vi.fn();
  const render = () =>
    createElement(MenuPanel, {
      freeText: false,
      onFreeText: vi.fn(),
      label: 'Halil',
      pace: 'automatic',
      actions: {} as VoiceActions,
      onClose: vi.fn(),
      onTitle,
      onSendWord: vi.fn(),
      canReturn: true,
    });
  history.replaceState(null, '', '/');
  const ordinary = mount(render());
  expect(ordinary.textContent).not.toMatch(/cast tools|persona tools/);
  expect(ordinary.textContent).toContain('How the day passes');
  expect(ordinary.textContent).toContain('Experimental');
  expect(ordinary.querySelector('details')?.open).toBe(false);
  expect(ordinary.textContent).toContain('Feedback');
  expect(ordinary.textContent).toContain('People from this browser');
  const next = [...ordinary.querySelectorAll('button')].find((b) => b.textContent === 'New game');
  flushSync(() => next?.click());
  expect(onTitle).not.toHaveBeenCalled();
  expect(next?.textContent).toContain('Replace');
  flushSync(() => next?.click());
  expect(onTitle).toHaveBeenCalledOnce();
  history.replaceState(null, '', '/');
});
it('cancels a pending file read through the mounted file input and keeps Feedback reachable', async () => {
  history.replaceState(null, '', '/voice/?file=1');
  let loadedFrame: Frame | null = null;
  let displayedError: string | null = null;
  const cancelFileLoad = vi.fn();
  const loadPlaytest = vi.fn();
  const actions = {
    cancelFileLoad,
    loadPlaytest,
    setReading: vi.fn(),
    setMenuOpen: vi.fn(),
    clearWhy: vi.fn(),
  };
  vi.doMock('./useVoice.ts', () => ({
    useVoice: () => ({
      frame: loadedFrame,
      actions,
      runId: 0,
      error: displayedError,
      playtest: displayedError ? { error: displayedError } : null,
    }),
  }));
  vi.doMock('../../shared/cast-runtime.ts', async () => ({
    ...(await vi.importActual<typeof import('../../shared/cast-runtime.ts')>('../../shared/cast-runtime.ts')),
    fileSession: true,
  }));
  vi.doMock('./SendWord.tsx', () => ({
    RecordingPreference: FileRecording,
    SendWord: FileFeedback,
  }));
  vi.doMock('../../shared/lab.tsx', () => ({ gameLabs: { voice: {} }, useLabScreen: vi.fn() }));
  vi.doMock('../../shared/LabNotice.tsx', () => ({ LabNotice: NoNotice }));
  const { App } = await import('./App.tsx');
  const app = mount(createElement(App));
  expect(app.textContent).toContain('Recording');
  const feedback = [...app.querySelectorAll('button')].find((b) => b.textContent === 'Feedback');
  flushSync(() => feedback?.click());
  expect(app.querySelector('[role="dialog"]')?.textContent).toBe('Send Feedback');
  let finish!: (value: ArrayBuffer) => void;
  const reading = new Promise<ArrayBuffer>((resolve) => {
    finish = resolve;
  });
  const input = app.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('Missing file input');
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [{ size: 100, arrayBuffer: () => reading }],
  });
  flushSync(() => input.dispatchEvent(new Event('change', { bubbles: true })));
  const cancellations = cancelFileLoad.mock.calls.length;
  flushSync(() => input.dispatchEvent(new Event('cancel')));
  expect(cancelFileLoad).toHaveBeenCalledTimes(cancellations + 1);
  finish(new TextEncoder().encode('{}').buffer);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(loadPlaytest).not.toHaveBeenCalled();
  expect(app.querySelector('[role="alert"]')).toBeNull();

  loadedFrame = new VoiceGame(42).frame();
  displayedError = 'Error: invalid gzip';
  const loaded = mount(createElement(App));
  expect(loaded.textContent).toContain('This file could not be opened here. Keep the original file.');
  expect(loaded.textContent).not.toMatch(/Error:|invalid gzip/);
  expect(loaded.querySelectorAll('[role="alert"]').length).toBeGreaterThan(0);
});
