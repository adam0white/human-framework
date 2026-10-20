// @vitest-environment happy-dom

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { type Lab, openSendDialog } from '@adam0white/lab-client';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { applyInput, newGame } from '../sim/night.ts';
import { buildFrame } from '../sim/view.ts';
import type { WatchActions } from './useWatch.ts';

vi.mock('../../shared/lab.tsx', () => ({
  gameLabs: {
    watch: {
      eventsOn: false,
      openSendDialog: vi.fn(),
      setEventsOff: vi.fn(),
      screen: vi.fn(),
      milestone: vi.fn(),
    },
  },
}));
vi.mock('./useWatch.ts', () => ({ useWatch: vi.fn() }));
vi.mock('./MapCanvas.tsx', () => ({ MapCanvas: () => null }));
const { GoalPage, DuskPanel, NightPanel, WatchStrip } = await import('./App.tsx');
const { Chronicle } = await import('./chronicle.tsx');
const actions = { input: vi.fn(), refreshShelf: vi.fn() } as unknown as WatchActions;
function render(component: Parameters<typeof renderToStaticMarkup>[0]) {
  const el = document.createElement('div');
  el.innerHTML = renderToStaticMarkup(component);
  return el;
}
function mandatory(el: HTMLElement) {
  for (const details of el.querySelectorAll('details:not([open])')) details.remove();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const words: string[] = [];
  while (walker.nextNode()) words.push(walker.currentNode.textContent ?? '');
  return words.join(' ').trim().split(/\s+/).length;
}
const state = newGame(4242);
const goal = buildFrame(state, 0, false);
applyInput(state, { k: 'start' });
const dusk = buildFrame(state, 0, false);
const duskProps = {
  frame: dusk,
  actions,
  selected: null,
  setSelected: vi.fn(),
  press: 'ask' as const,
  setPress: vi.fn(),
  post: vi.fn(),
};

describe('Night Watch first-minute clarity', () => {
  it('reaches the first watcher choice within forty mandatory words across both screens', () => {
    const opening = render(createElement(GoalPage, { frame: goal, actions, shelf: [], current: 'new' }));
    expect(opening.querySelector('h2')?.nextElementSibling?.textContent).toBe('Go up to the wall');
    expect(opening.querySelector('details')?.textContent).toContain('Every pull wears the rope');
    const posting = render(createElement(DuskPanel, duskProps));
    const first = posting.querySelector('.w-roster');
    expect(first).not.toBeNull();
    const before = document.createRange();
    before.selectNodeContents(posting);
    if (first) before.setEndBefore(first);
    const instructions = document.createElement('div');
    instructions.append(before.cloneContents());
    const strip = render(createElement(WatchStrip, { frame: dusk, selected: null }));
    const warning = strip.querySelector('.w-state-warning')?.textContent?.trim().split(/\s+/).length ?? 0;
    const count = mandatory(opening) + mandatory(instructions) + warning;
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(40);
  });
  it('teaches pressing beside posting and bell wear beside the bell', () => {
    const posting = render(
      createElement(DuskPanel, { ...duskProps, selected: dusk.watchers[0]?.id ?? null }),
    );
    expect(posting.querySelector('.w-postcard')?.textContent).toContain('Ask leaves it to them');
    applyInput(state, { k: 'begin' });
    const night = render(createElement(NightPanel, { frame: buildFrame(state, 0, false), actions }));
    expect(night.querySelector('#watch-bell-context')?.textContent).toContain('Every pull wears the rope');
  });
  it('gives dusk only one primary action and neutral selected states', () => {
    const posting = render(createElement(DuskPanel, duskProps));
    expect([...posting.querySelectorAll('.w-primary')].map((el) => el.textContent?.trim())).toEqual([
      'Begin the watch',
    ]);
    const path = ['apps/site/src/watch/ui/watch.css', 'src/watch/ui/watch.css']
      .map((file) => resolve(process.cwd(), file))
      .find(existsSync);
    expect(path).toBeDefined();
    const css = readFileSync(path ?? '', 'utf8');
    for (const selector of [
      '.w-speed[aria-pressed="true"]',
      '.w-person[aria-pressed="true"]',
      '.w-chip[aria-pressed="true"]',
      '.w-press[aria-pressed="true"]',
      '.w-place[aria-pressed="true"]',
    ]) {
      const block = css.slice(css.indexOf(`${selector} {`)).split('}')[0] ?? '';
      expect(block).not.toContain('--w-accent');
      expect(block).toContain('--w-text');
    }
    expect(css).toContain('.phase-dusk .w-alert.is-moment:last-child');
  });
  it('puts resume, download and send together in the Game menu', () => {
    const menu = render(
      createElement(Chronicle, {
        frame: dusk,
        actions,
        seed: 4242,
        shelf: [],
        saving: true,
        current: 'new',
        onClose: vi.fn(),
      }),
    );
    expect(menu.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Game menu');
    for (const label of ['Resume the watch', 'Download this run', 'Send this run to the notebook']) {
      expect([...menu.querySelectorAll('button')].some((el) => el.textContent?.trim() === label)).toBe(true);
    }
    expect(menu.textContent).toContain('kept as you go');
  });
});

it('keeps the menu and clock hold through send, then returns focus on cancel', async () => {
  const { gameLabs } = await import('../../shared/lab.tsx');
  const { App } = await import('./App.tsx');
  const { useWatch } = await import('./useWatch.ts');
  const { WatchRun } = await import('../sim/run.ts');
  const run = new WatchRun(4242);
  run.input({ k: 'start' });
  const testActions = {
    ...actions,
    input: vi.fn(),
    hold: vi.fn(),
    exportRun: vi.fn().mockResolvedValue(run.export()),
  };
  vi.mocked(useWatch).mockReturnValue({
    frame: dusk,
    speed: 'watch',
    error: null,
    seed: 4242,
    shelf: [],
    saving: true,
    current: 'new',
    actions: testActions,
  });
  const lab = { game: 'watch', eventsOn: false, build: () => ({}) } as unknown as Lab;
  vi.mocked(gameLabs.watch.openSendDialog).mockImplementation((options) =>
    openSendDialog({ ...options, lab }),
  );
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const button = (label: string) =>
    [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
  await act(async () => root.render(createElement(App)));
  await act(async () => button('Game menu')?.click());
  expect(testActions.hold).toHaveBeenLastCalledWith(true);
  const send = button('Send this run to the notebook');
  send?.focus();
  await act(async () => send?.click());
  expect(container.querySelector('[role="dialog"][aria-label="Game menu"]')).not.toBeNull();
  expect(testActions.hold).toHaveBeenLastCalledWith(true);
  expect(document.querySelector('.hflab-veil')).not.toBeNull();
  expect(document.activeElement?.id).toBe('hflab-note');
  const cancel = [...document.querySelectorAll('.hflab button')].find((b) => b.textContent === 'Not now');
  await act(async () => (cancel as HTMLButtonElement)?.click());
  expect(document.querySelector('.hflab-veil')).toBeNull();
  expect(container.querySelector('[role="dialog"][aria-label="Game menu"]')).not.toBeNull();
  expect(document.activeElement).toBe(send);
  expect(testActions.hold).toHaveBeenLastCalledWith(true);
  await act(async () => button('Resume the watch')?.click());
  expect(container.querySelector('[role="dialog"][aria-label="Game menu"]')).toBeNull();
  expect(testActions.hold).toHaveBeenLastCalledWith(false);
  expect(testActions.input).not.toHaveBeenCalled();
  await act(async () => root.unmount());
  container.remove();
  vi.mocked(gameLabs.watch.openSendDialog).mockReset();
});

it('does not open send if the menu closes while the export is being prepared', async () => {
  const { gameLabs } = await import('../../shared/lab.tsx');
  const { ExportButtons } = await import('./exporting.tsx');
  const { WatchRun } = await import('../sim/run.ts');
  let finish!: (run: ReturnType<InstanceType<typeof WatchRun>['export']>) => void;
  const pending = new Promise<ReturnType<InstanceType<typeof WatchRun>['export']>>((resolve) => {
    finish = resolve;
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(createElement(ExportButtons, { actions: { ...actions, exportRun: () => pending } })),
  );
  const send = [...container.querySelectorAll('button')].find(
    (b) => b.textContent === 'Send this run to the notebook',
  );
  vi.mocked(gameLabs.watch.openSendDialog).mockClear();
  await act(async () => send?.click());
  await act(async () => root.unmount());
  await act(async () => finish(new WatchRun(4242).export()));
  expect(gameLabs.watch.openSendDialog).not.toHaveBeenCalled();
  container.remove();
});

it('hides the retained menu during send and gives secondary export controls 44px targets', async () => {
  const { ExportButtons } = await import('./exporting.tsx');
  const controls = render(createElement(ExportButtons, { actions }));
  expect(controls.querySelector('label')?.classList.contains('w-export-option')).toBe(true);
  expect(controls.querySelector('a')?.classList.contains('w-export-option')).toBe(true);
  const path = ['apps/site/src/watch/ui/watch.css', 'src/watch/ui/watch.css']
    .map((file) => resolve(process.cwd(), file))
    .find(existsSync);
  const css = readFileSync(path ?? '', 'utf8');
  expect(css).toMatch(/body:has\(> \.hflab-veil\) \.watch \.w-menu\s*\{[^}]*visibility: hidden/s);
  expect(css).toMatch(/\.w-export-option\s*\{[^}]*min-height: 44px/s);
});

it('syncs anonymous event preferences changed outside the open Game menu', async () => {
  const { gameLabs } = await import('../../shared/lab.tsx');
  const { ExportButtons } = await import('./exporting.tsx');
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  Object.defineProperty(gameLabs.watch, 'eventsOn', { configurable: true, value: false });
  await act(async () => root.render(createElement(ExportButtons, { actions })));
  const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
  expect(checkbox?.checked).toBe(false);
  for (const [target, type, next] of [
    [window, 'storage', true],
    [window, 'focus', false],
    [document, 'change', true],
  ] as const) {
    Object.defineProperty(gameLabs.watch, 'eventsOn', { configurable: true, value: next });
    await act(async () => {
      target.dispatchEvent(new Event(type));
    });
    expect(checkbox?.checked).toBe(next);
  }
  const removeWindow = vi.spyOn(window, 'removeEventListener');
  const removeDocument = vi.spyOn(document, 'removeEventListener');
  await act(async () => root.unmount());
  expect(removeWindow).toHaveBeenCalledWith('storage', expect.any(Function));
  expect(removeWindow).toHaveBeenCalledWith('focus', expect.any(Function));
  expect(removeDocument).toHaveBeenCalledWith('change', expect.any(Function));
  removeWindow.mockRestore();
  removeDocument.mockRestore();
  Object.defineProperty(gameLabs.watch, 'eventsOn', { configurable: true, value: false });
  container.remove();
});

it('shows one clock rate with the reason for a watcher decision', async () => {
  const { App } = await import('./App.tsx');
  const { useWatch } = await import('./useWatch.ts');
  const { WatchRun } = await import('../sim/run.ts');
  const run = new WatchRun(5);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  while (run.state.phase === 'night' && !run.state.moment) run.step();
  vi.mocked(useWatch).mockReturnValue({
    frame: buildFrame(run.state, 0, true, 1 / 60),
    speed: 'fast',
    error: null,
    seed: 5,
    shelf: [],
    saving: true,
    current: 'new',
    actions,
  });
  const app = render(createElement(App));
  expect(app.querySelectorAll('.w-clock-rate')).toHaveLength(1);
  expect(app.querySelector('.w-clock-rate')?.textContent).toBe('Slow · watcher decision · 1 min / 60 s');
  expect(app.querySelector('.w-decision-time')?.textContent).toBe(
    'About 120 seconds to answer; then they decide alone.',
  );
  expect(app.querySelector('.w-moment')?.closest('.w-mapwrap')).toBeNull();
  expect(app.querySelector('.w-panel .w-moment')).not.toBeNull();
  expect(app.textContent).not.toContain('the night waits on you');
  expect(app.querySelector('[aria-label="Fast"]')?.getAttribute('aria-pressed')).toBe('true');
});

it('keeps the full bell explanation available and keeps the ringing label in its labelled target', () => {
  const run = newGame(5);
  applyInput(run, { k: 'start' });
  applyInput(run, { k: 'begin' });
  const night = render(createElement(NightPanel, { frame: buildFrame(run, 0, false), actions }));
  expect(night.querySelector('#watch-bell-context')?.textContent).toContain('Every pull wears the rope');
  expect(night.querySelector('.w-bellbtn')?.getAttribute('aria-describedby')).toBe('watch-bell-context');
  const ringing = render(
    createElement(NightPanel, { frame: { ...buildFrame(run, 0, false), bellSwinging: true }, actions }),
  );
  expect(ringing.querySelector('.w-bellbtn')?.textContent).toContain('Bell swinging');
  expect(ringing.querySelector('.w-bellbtn')?.hasAttribute('disabled')).toBe(true);
});

it('keeps posting in one sheet with a way back and separate place actions', () => {
  const posting = render(createElement(DuskPanel, { ...duskProps, selected: 'tamar' }));
  expect(posting.querySelector('.w-roster')).toBeNull();
  expect(posting.querySelector('.lk-sheet-head')?.textContent).toContain('Where should Tamar stand?');
  expect(posting.querySelector('.lk-sheet-head button')?.textContent).toBe('Back to watchers');
  expect(posting.querySelector('.lk-commit .w-places')).not.toBeNull();
  expect(posting.querySelector('.w-presses')?.textContent).toContain('How hard do you press Tamar?');
  const roster = render(createElement(DuskPanel, duskProps));
  expect(roster.querySelector('.lk-commit .w-primary')?.textContent).toContain('Begin the watch');
  expect(roster.querySelector('.lk-sheet-body .w-primary')).toBeNull();
});

it('focuses posting and menu controls, then restores each origin without a game input', async () => {
  const { App } = await import('./App.tsx');
  const { useWatch } = await import('./useWatch.ts');
  const testActions = { ...actions, input: vi.fn(), hold: vi.fn() };
  vi.mocked(useWatch).mockReturnValue({
    frame: dusk,
    speed: 'watch',
    error: null,
    seed: 4242,
    shelf: [],
    saving: true,
    current: 'new',
    actions: testActions,
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(App)));
  const watcher = container.querySelector<HTMLButtonElement>('.w-person-tamar');
  watcher?.focus();
  await act(async () => watcher?.click());
  expect(document.activeElement?.textContent).toBe('Back to watchers');
  expect(container.querySelector('.w-selected-state')?.textContent).toContain('keeps the Gate');
  const menu = container.querySelector<HTMLButtonElement>('.w-chronicle');
  await act(async () => menu?.click());
  expect(document.activeElement?.classList.contains('w-x')).toBe(true);
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(document.activeElement).toBe(menu);
  expect(container.querySelector('.w-selected-state')?.textContent).toContain('Tamar');
  await act(async () => container.querySelector<HTMLButtonElement>('.w-order-back')?.click());
  await new Promise((resolve) => requestAnimationFrame(resolve));
  expect(document.activeElement?.classList.contains('w-person-tamar')).toBe(true);
  expect(testActions.input).not.toHaveBeenCalled();
  await act(async () => root.unmount());
  container.remove();
});

it('keeps the dawn continuation outside the report and sends the same input', async () => {
  const { App } = await import('./App.tsx');
  const { useWatch } = await import('./useWatch.ts');
  const { WatchRun } = await import('../sim/run.ts');
  const run = new WatchRun(5);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  while (run.state.phase === 'night') run.step();
  const testActions = { ...actions, input: vi.fn(), hold: vi.fn() };
  vi.mocked(useWatch).mockReturnValue({
    frame: buildFrame(run.state, 0, false),
    speed: 'watch',
    error: null,
    seed: 5,
    shelf: [],
    saving: true,
    current: 'new',
    actions: testActions,
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(App)));
  expect(container.querySelector('.lk-sheet-body .w-primary')).toBeNull();
  const next = container.querySelector<HTMLButtonElement>('.w-page-commit .w-primary');
  expect(next?.textContent).toBe('On to dusk');
  await act(async () => next?.click());
  expect(testActions.input).toHaveBeenCalledExactlyOnceWith({ k: 'toDusk' });
  await act(async () => root.unmount());
  container.remove();
});

it('reveals a new timed moment after the player scrolls watch details', async () => {
  const { WatchRun } = await import('../sim/run.ts');
  const run = new WatchRun(5);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(createElement(NightPanel, { frame: buildFrame(run.state, 0, false), actions })),
  );
  const body = container.querySelector<HTMLElement>('.lk-sheet-body');
  if (body) body.scrollTop = 300;
  while (run.state.phase === 'night' && !run.state.moment) run.step();
  expect(run.state.moment).not.toBeNull();
  await act(async () =>
    root.render(createElement(NightPanel, { frame: buildFrame(run.state, 0, true), actions })),
  );
  expect(container.querySelector('.w-moment')).not.toBeNull();
  expect(body?.scrollTop).toBe(0);
  await act(async () => root.unmount());
  container.remove();
});
