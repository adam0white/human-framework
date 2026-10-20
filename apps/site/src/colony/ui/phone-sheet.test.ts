// @vitest-environment happy-dom
import { act, createElement, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColonyGame, NUDGES, type Nudge } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import { PhoneSheet } from './PhoneStage.tsx';
import { EMPTY_COMPOSER } from './parts.tsx';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let stage: HTMLElement;
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const frame = new ColonyGame(20261003, createFrameworkHumanSide).frame();
beforeEach(() => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  } as unknown as MediaQueryList);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  stage = document.createElement('main');
  stage.className = 'lk-stage';
  stage.innerHTML = '<section class="lk-strip"></section><div class="lk-scene"></div>';
  document.body.append(stage);
  host = document.createElement('div');
  stage.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(() => root.unmount());
  stage.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function click(text: string) {
  const button = [...host.querySelectorAll('button')].find(
    (b) => b.textContent === text && !b.closest('[hidden]'),
  );
  if (!button) throw new Error(`Missing ${text}`);
  await act(() => button.click());
}
async function mount(active = true, nudge?: Nudge) {
  const stageRoot = createRef<HTMLElement>();
  stageRoot.current = stage;
  const onOrdering = vi.fn();
  const onInspect = vi.fn();
  const onUse = vi.fn();
  const onWatch = vi.fn();
  await act(() =>
    root.render(
      createElement(PhoneSheet, {
        stageRoot,
        frame: nudge ? { ...frame, nudges: [nudge] } : frame,
        state: {
          ...EMPTY_COMPOSER,
          personId: 'maryam',
          placeId: 'site',
          rush: true,
          insist: true,
          appeal: 'safety',
        },
        job: 'build',
        prediction: null,
        ordering: true,
        inspecting: false,
        active,
        onOrdering,
        onInspect,
        onChange: vi.fn(),
        onWho: vi.fn(),
        onWhere: vi.fn(),
        onConfirm: vi.fn(),
        onUse,
        onWatch,
        onSkip: vi.fn(),
        onCancel: vi.fn(),
        onSheet: vi.fn(),
        onSceneHeight: vi.fn(),
        onKeepWatching: vi.fn(),
      }),
    ),
  );
  return { onOrdering, onInspect, onUse, onWatch };
}
describe('Well shared sheet transitions', () => {
  it('does not create a browser history entry behind the title card', async () => {
    const push = vi.spyOn(window.history, 'pushState');
    await mount(false);
    expect(push).not.toHaveBeenCalled();
    expect(host.querySelector('.lk-sheet')?.hasAttribute('hidden')).toBe(true);
  });
  it('uses one controller for nested Back, Escape and close without clearing the prepared order', async () => {
    const { onOrdering } = await mount();
    expect(stage.dataset.sheetId).toBe('order');
    expect(host.textContent).toContain('build the house');
    expect(host.textContent).toContain('Rush: faster, hungrier');
    expect(host.textContent).toContain('Insist: trust at risk');
    await click('More');
    expect(stage.dataset.sheetId).toBe('tools');
    await click('History (0)');
    expect(stage.dataset.sheetId).toBe('orders');
    await click('Back');
    expect(stage.dataset.sheetId).toBe('tools');
    await act(() =>
      host
        .querySelector('.lk-sheet')
        ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    );
    expect(stage.dataset.sheetId).toBe('order');
    await click('Close');
    expect(stage.dataset.sheet).toBe('closed');
    expect(host.querySelector('.lk-sheet')?.hasAttribute('hidden')).toBe(true);
    expect(onOrdering).toHaveBeenLastCalledWith(false);
  });
  it('keeps the options origin while opening About and offers all four labelled snap heights', async () => {
    const { onInspect } = await mount();
    await click('Order options');
    await click('About Maryam');
    expect(onInspect).toHaveBeenCalledWith('maryam');
    expect(stage.dataset.sheetId).toBe('options');
    await click('Back');
    await click('More');
    await click('Full panel');
    expect(stage.dataset.sheet).toBe('full');
    expect(host.querySelectorAll('[data-lk-snap]')).toHaveLength(4);
  });
});

it.each(['dawn-site', 'cedar'])(
  'suggestion %s closes for ordinary send and opens review only for danger',
  async (id) => {
    const n = NUDGES.find((n) => n.id === id);
    if (!n) throw new Error('Missing suggestion');
    const { onUse } = await mount(true, n);
    await click('More');
    await click('Suggestion');
    expect(stage.dataset.sheetId).toBe('suggestion');
    await click(id === 'cedar' ? 'Review order' : 'Send order');
    expect(onUse).toHaveBeenCalledExactlyOnceWith(n);
    expect(stage.dataset.sheetId).toBe(id === 'cedar' ? 'order' : undefined);
    if (id === 'cedar')
      expect(host.querySelector('.lk-sheet-body')?.textContent).toContain('build the house');
  },
);
it('Watch village uses the parent clean-view handler', async () => {
  const { onWatch } = await mount();
  await click('Watch village');
  expect(onWatch).toHaveBeenCalledOnce();
  expect(host.querySelector('.lk-sheet')?.hasAttribute('hidden')).toBe(true);
});
