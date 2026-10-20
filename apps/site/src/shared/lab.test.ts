// @vitest-environment happy-dom
import type { Lab } from '@adam0white/lab-client';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { LabMenuContent, useLabScreen } from './lab.tsx';
import { PlaytestMenu } from './PlaytestMenu.tsx';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await act(() => root.unmount());
  document.body.replaceChildren();
});
function labDouble() {
  let eventsOn = true;
  return {
    get eventsOn() {
      return eventsOn;
    },
    setEventsOff: vi.fn((off: boolean) => {
      eventsOn = !off;
    }),
    screen: vi.fn(),
    milestone: vi.fn(),
  } as unknown as Lab;
}
async function mount(node: React.ReactNode) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  await act(() => root.render(node));
  return { container, root };
}
function Screen({ lab, screen }: { lab: Lab; screen: 'title' | 'play' | 'ending' }) {
  useLabScreen(lab, screen);
  return null;
}
it('records screens and run milestones without rendering a control', async () => {
  const lab = labDouble();
  const { root, container } = await mount(createElement(Screen, { lab, screen: 'title' }));
  expect(container.childNodes.length).toBe(0);
  expect(lab.screen).toHaveBeenLastCalledWith('title');
  expect(lab.milestone).not.toHaveBeenCalled();
  await act(() => root.render(createElement(Screen, { lab, screen: 'play' })));
  expect(lab.screen).toHaveBeenLastCalledWith('play');
  expect(lab.milestone).toHaveBeenLastCalledWith('run started');
  await act(() => root.render(createElement(Screen, { lab, screen: 'play' })));
  expect(lab.screen).toHaveBeenCalledTimes(2);
  expect(lab.milestone).toHaveBeenCalledOnce();
  await act(() => root.render(createElement(Screen, { lab, screen: 'ending' })));
  expect(lab.milestone).toHaveBeenLastCalledWith('ending reached');
});
it('keeps lab actions inside Game menu and synchronizes the event preference', async () => {
  const lab = labDouble();
  const send = vi.fn();
  const { container } = await mount(
    createElement(PlaytestMenu, {
      onExport: vi.fn(),
      onLoad: vi.fn(),
      onError: vi.fn(),
      extra: createElement(LabMenuContent, { lab, onSend: send }),
    }),
  );
  const toggle = container.querySelector('button');
  expect(toggle?.getAttribute('aria-label')).toBe('Game menu');
  expect(container.textContent).not.toContain('Send this run');
  await act(() => toggle?.click());
  const menu = container.querySelector('.pt-menu-list');
  expect(menu?.textContent).toContain('Download this run');
  expect(menu?.textContent).toContain('Send this run to the notebook');
  expect(menu?.querySelector('a[href="/games/"]')?.textContent).toBe('All games');
  expect(container.querySelector('details, .lab-controls')).toBeNull();
  const checkbox = menu?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  expect(checkbox?.checked).toBe(true);
  await act(() => checkbox?.click());
  expect(lab.setEventsOff).toHaveBeenCalledWith(true);
  expect(checkbox?.checked).toBe(false);
  lab.setEventsOff(false);
  await act(() => window.dispatchEvent(new Event('focus')));
  expect(checkbox?.checked).toBe(true);
  const sendButton = Array.from(menu?.querySelectorAll('button') ?? []).find(
    (b) => b.textContent === 'Send this run to the notebook',
  );
  await act(() => sendButton?.click());
  expect(send).toHaveBeenCalledOnce();
  expect(menu?.querySelector('a[href$="/lab/privacy/"]')?.textContent).toBe('Privacy');
});
it('blocks duplicate preparation and reports a preparation failure inline', async () => {
  let reject: (error: Error) => void = () => {};
  const send = vi.fn(
    () =>
      new Promise<void>((_resolve, no) => {
        reject = no;
      }),
  );
  const { container } = await mount(createElement(LabMenuContent, { lab: labDouble(), onSend: send }));
  const button = container.querySelector('button');
  await act(() => {
    button?.click();
    button?.click();
  });
  expect(send).toHaveBeenCalledOnce();
  expect(button?.disabled).toBe(true);
  await act(async () => reject(new Error('private detail')));
  expect(container.querySelector('[role="alert"]')?.textContent).toBe(
    'This run could not be prepared. Please try again.',
  );
  expect(button?.disabled).toBe(false);
});

it('keeps the send dialog opener mounted while pointer and Escape events belong to the dialog', async () => {
  const { container } = await mount(
    createElement(PlaytestMenu, {
      onExport: vi.fn(),
      onLoad: vi.fn(),
      onError: vi.fn(),
      extra: createElement(LabMenuContent, { lab: labDouble(), onSend: vi.fn() }),
    }),
  );
  await act(() => container.querySelector('button')?.click());
  const opener = Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent === 'Send this run to the notebook',
  );
  const veil = document.createElement('div');
  veil.className = 'hflab-veil';
  const note = document.createElement('textarea');
  veil.append(note);
  document.body.append(veil);
  await act(() => note.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  expect(opener?.isConnected).toBe(true);
  await act(() => note.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(opener?.isConnected).toBe(true);
  veil.remove();
  opener?.focus();
  expect(document.activeElement).toBe(opener);
  await act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(container.querySelector('.pt-menu-list')).toBeNull();
  expect(document.activeElement).toBe(container.querySelector('.pt-menu-button'));
});
