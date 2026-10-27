// @vitest-environment happy-dom
import type { Lab } from '@adam0white/lab-client';
import { act, createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { LabNotice } from './LabNotice.tsx';
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
  expect(menu?.querySelector('details')?.textContent).toContain('Download this run');
  expect(menu?.textContent).toContain('Feedback');
  expect(menu?.querySelector('a[href="/games/"]')?.textContent).toBe('All games');
  expect(container.querySelector('details')?.open).toBe(false);
  expect(container.querySelector('.lab-controls')).toBeNull();
  const checkbox = menu?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  expect(checkbox?.checked).toBe(true);
  await act(() => checkbox?.click());
  expect(lab.setEventsOff).toHaveBeenCalledWith(true);
  expect(checkbox?.checked).toBe(false);
  lab.setEventsOff(false);
  await act(() => window.dispatchEvent(new Event('focus')));
  expect(checkbox?.checked).toBe(true);
  const sendButton = Array.from(menu?.querySelectorAll('button') ?? []).find(
    (b) => b.textContent === 'Feedback',
  );
  await act(() => sendButton?.click());
  expect(send).toHaveBeenCalledOnce();
  expect(menu?.querySelector('a[href$="/lab/privacy/"]')?.textContent).toBe('Lab privacy');
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
  const opener = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Feedback');
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

it('holds the clock until toggle, Escape, outside dismissal or unmount closes the menu', async () => {
  const hold = vi.fn();
  const { container, root } = await mount(
    createElement(PlaytestMenu, {
      onExport: vi.fn(),
      onLoad: vi.fn(),
      onError: vi.fn(),
      onOpenChange: hold,
    }),
  );
  const toggle = container.querySelector('button');
  await act(() => toggle?.click());
  expect(hold).toHaveBeenLastCalledWith(true);
  await act(() => toggle?.click());
  expect(hold).toHaveBeenLastCalledWith(false);
  await act(() => toggle?.click());
  await act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(hold).toHaveBeenLastCalledWith(false);
  await act(() => toggle?.click());
  await act(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  expect(hold).toHaveBeenLastCalledWith(false);
  await act(() => toggle?.click());
  await act(() => root.render(null));
  expect(hold).toHaveBeenLastCalledWith(false);
});

it('keeps the same compact disclosure node in layout without another player control', async () => {
  const element = createElement(StrictMode, null, createElement(LabNotice));
  const { container, root } = await mount(element);
  const notice = container.querySelector<HTMLElement>('.lk-telemetry-notice');
  expect(notice).not.toBeNull();
  expect(notice?.style.position).toBe('static');
  expect(notice?.textContent).toBe('We record and link play across games on this device.');
  expect(notice?.querySelector('button')).toBeNull();
  expect(document.body.querySelector(':scope > .lk-telemetry-notice')).toBeNull();
  await act(() => root.render(createElement(StrictMode, null, createElement(LabNotice))));
  expect(container.querySelector('.lk-telemetry-notice')).toBe(notice);
  await act(() => root.render(null));
  await act(() => root.render(createElement(LabNotice)));
  expect(container.querySelector('.lk-telemetry-notice')).toBeNull();
});

it('uses real preserving SDK initialization and informational notice without changing existing bytes, while native initialization stays normal', async () => {
  const memory = (seed: Record<string, string> = {}) => {
    const values = new Map(Object.entries(seed));
    return {
      values,
      get length() {
        return values.size;
      },
      key: (index: number) => [...values.keys()][index] ?? null,
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
  };
  const local = memory({
    'hf-lab-player': 'a'.repeat(32),
    'hf-lab-top-level-player': 'a'.repeat(32),
    'hf-lab-recording-off': '1',
    'hf-persona-opt-in': '0',
    'hf-lab:once:telemetry-notice-v1': 'original local notice bytes',
    'hf-lab-notice-shared-v1': 'original central notice bytes',
    'hf-lab-navigation:voice:unknown': 'unique retained journal bytes',
  });
  const session = memory({
    'hf-lab-session:voice': `${'b'.repeat(32)}:123`,
    'hf-lab-run:voice': 'c'.repeat(32),
    'hf-lab-session:watch': `${'d'.repeat(32)}:456`,
    'hf-lab-run:watch': 'e'.repeat(32),
  });
  const snapshot = () => ({
    local: Object.fromEntries(local.values),
    session: Object.fromEntries(session.values),
  });
  const before = snapshot();
  const labs: Lab[] = [];
  const metadata = vi.fn(async (url: string) => {
    if (!url.startsWith('/release.json')) throw new Error(`Unexpected test request: ${url}`);
    return Response.json({ commit: 'synthetic-build', framework: '3.2.0' });
  });
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('sessionStorage', session);
  vi.stubGlobal('fetch', metadata);
  try {
    vi.resetModules();
    history.replaceState(null, '', '/voice/?file=1&labRunSource=agent');
    const { gameLabs } = await import('./lab.tsx');
    expect(snapshot()).toEqual(before); // Importing does not initialize any lazy game Lab or Shelf.
    const voice = gameLabs.voice;
    labs.push(voice);
    expect(voice.preservationStatus).toBe('existing-local');
    expect(gameLabs.voice).toBe(voice);
    expect(snapshot()).toEqual(before);
    expect(location.search).toBe('?file=1'); // Real SDK consumed only its source marker.
    expect(document.querySelector('iframe')).toBeNull();
    const { sitePersonaShelf } = await import('./cast-runtime.ts');
    expect(sitePersonaShelf).toBeUndefined();
    const { LabNotice: FileNotice } = await import('./LabNotice.tsx');
    const first = await mount(createElement(FileNotice));
    const notice = first.container.querySelector<HTMLElement>('.lk-telemetry-notice');
    expect(notice?.textContent).toBe('We record and link play across games on this device.');
    expect(notice?.style.visibility).toBe('visible');
    expect(snapshot()).toEqual(before);
    await act(() => first.root.render(null));
    const again = await mount(createElement(FileNotice));
    expect(again.container.querySelector('.lk-telemetry-notice')).not.toBeNull();
    expect(snapshot()).toEqual(before);
    // Another target stays lazy, then genuinely missing player is an explicit blocked state.
    local.values.delete('hf-lab-player');
    const missingBefore = snapshot();
    const missing = gameLabs.watch;
    labs.push(missing);
    expect(missing.preservationStatus).toBe('missing-identity');
    expect(missing.telemetryOn).toBe(false);
    expect(snapshot()).toEqual(missingBefore);
    for (const lab of labs.splice(0)) lab.dispose();

    // Fresh synthetic native initialization retains ordinary session/run and first-notice behavior.
    const nativeLocal = memory(),
      nativeSession = memory();
    vi.stubGlobal('localStorage', nativeLocal);
    vi.stubGlobal('sessionStorage', nativeSession);
    vi.resetModules();
    history.replaceState(null, '', '/voice/');
    const { gameLabs: nativeLabs } = await import('./lab.tsx');
    const native = nativeLabs.voice;
    labs.push(native);
    expect(native.preservationStatus).toBe('standard');
    expect(nativeSession.getItem('hf-lab-session:voice')).toMatch(/^[a-f0-9]{32}:\d+$/);
    expect(nativeSession.getItem('hf-lab-run:voice')).toMatch(/^[a-f0-9]{32}$/);
    expect(nativeSession.getItem('hf-lab-session:well')).toBeNull();
    const { LabNotice: NativeNotice } = await import('./LabNotice.tsx');
    const nativeFirst = await mount(createElement(NativeNotice));
    expect(nativeFirst.container.querySelector('.lk-telemetry-notice')).not.toBeNull();
    expect(nativeLocal.getItem('hf-lab:once:telemetry-notice-v1')).toBe('1');
    const nativeAgain = await mount(createElement(NativeNotice));
    expect(nativeAgain.container.querySelector('.lk-telemetry-notice')).toBeNull();
    expect(metadata.mock.calls.every(([url]) => url.startsWith('/release.json'))).toBe(true);
  } finally {
    for (const lab of labs) lab.dispose();
    vi.unstubAllGlobals();
    history.replaceState(null, '', '/');
  }
});
