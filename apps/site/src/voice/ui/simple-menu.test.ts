// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { Premise } from './Premise.tsx';
import { MenuPanel } from './ShellPanels.tsx';
import type { VoiceActions } from './useVoice.ts';

vi.mock('../../shared/CastMenu.tsx', () => ({ CastMenu: () => createElement('p', null, 'cast tools') }));
vi.mock('./persona.tsx', () => ({ VoicePersonaControls: () => createElement('p', null, 'persona tools') }));
vi.mock('./SendWord.tsx', () => ({ RecordingPreference: () => createElement('label', null, 'Recording') }));
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
it('keeps diagnostic concepts behind exact lab=1 and confirms a new game inline', () => {
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
  history.replaceState(null, '', '/?lab=0');
  const ordinary = mount(render());
  expect(ordinary.textContent).not.toMatch(/cast tools|persona tools|Experimental|How the day passes/);
  expect(ordinary.textContent).toContain('Feedback');
  const next = [...ordinary.querySelectorAll('button')].find((b) => b.textContent === 'New game');
  flushSync(() => next?.click());
  expect(onTitle).not.toHaveBeenCalled();
  expect(next?.textContent).toContain('Replace');
  flushSync(() => next?.click());
  expect(onTitle).toHaveBeenCalledOnce();
  history.replaceState(null, '', '/?lab=1');
  const lab = mount(render());
  expect(lab.textContent).toMatch(/cast tools/);
  expect(lab.textContent).toMatch(/Experimental/);
});
it('hides title import and seed paths in ordinary play', () => {
  const ordinary = mount(createElement(Premise, { ready: true, onBegin: vi.fn() }));
  expect(ordinary.textContent).not.toContain('Lab tools');
  history.replaceState(null, '', '/?lab=1');
  const lab = mount(createElement(Premise, { ready: true, onBegin: vi.fn() }));
  expect(lab.textContent).toContain('Lab tools');
});
