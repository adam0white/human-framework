// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ColonyGame } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import { App } from './App.tsx';
import type { PaneProps } from './Pane.tsx';
import type { Colony } from './useColony.ts';

let colony: Colony;
vi.mock('./useColony.ts', () => ({ useColony: () => colony }));
vi.mock('./Pane.tsx', () => ({
  Pane: (p: PaneProps) =>
    createElement(
      'div',
      {},
      createElement(
        'button',
        { type: 'button', onClick: () => p.onSelect('idris') },
        `Scene select ${p.side}`,
      ),
      createElement(
        'button',
        { type: 'button', onClick: () => p.onPlace('forest') },
        `Scene forest ${p.side}`,
      ),
      createElement('button', { type: 'button', onClick: () => p.onPlace('cedar') }, `Scene cedar ${p.side}`),
      createElement('button', { type: 'button', onClick: () => p.onMorePlaces?.() }, `More places ${p.side}`),
    ),
}));
vi.mock('../../shared/lab.tsx', async (original) => ({
  ...(await original<typeof import('../../shared/lab.tsx')>()),
  useLabScreen: () => {},
}));
vi.mock('./PhoneStage.tsx', async (original) => ({
  ...(await original<typeof import('./PhoneStage.tsx')>()),
  PhoneSheet: () => null,
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('fetch', async () => new Response('{}'));
  const frame = new ColonyGame(20261003, createFrameworkHumanSide).frame();
  frame.news = [{ personId: 'idris', side: 'human', minute: 330, how: 'at work' }];
  colony = {
    frame,
    store: { current: { curr: frame, prev: null, at: 0, interval: 62 } },
    playback: { paused: true, pause: null, speed: 1, autoPause: false, slowMo: false },
    why: null,
    prediction: null,
    summaries: {},
    error: null,
    playtest: null,
    actions: Object.fromEntries(
      [
        'order',
        'cancel',
        'dismissNudge',
        'setSpeed',
        'setPaused',
        'pauseForInspector',
        'resumeFromInspector',
        'setAutoPause',
        'continueDay',
        'requestWhy',
        'clearWhy',
        'predict',
        'restart',
        'exportPlaytest',
        'sendPlaytest',
        'loadPlaytest',
        'clearPlaytest',
        'playtestError',
      ].map((k) => [k, vi.fn()]),
    ) as unknown as Colony['actions'],
  };
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
async function click(text: string) {
  const button = [...container.querySelectorAll('button')].find((b) => b.textContent === text);
  expect(button, text).toBeDefined();
  await act(() => button?.click());
}
it('sends one ordinary scene order per place tap, keeps selection and opens no required sheet', async () => {
  await act(() => root.render(createElement(App)));
  await click('Scene select human');
  expect(container.querySelector('.colony')?.classList.contains('is-ordering')).toBe(false);
  await click('Scene forest human');
  expect(colony.actions.order).toHaveBeenLastCalledWith({ personId: 'idris', placeId: 'forest' }, undefined);
  await click('Scene forest human');
  expect(colony.actions.order).toHaveBeenCalledTimes(2);
});
it('sends the injured worker home through the ordinary order path', async () => {
  await act(() => root.render(createElement(App)));
  await click('Send Idris home');
  expect(colony.actions.order).toHaveBeenLastCalledWith(
    { personId: 'idris', placeId: 'home-idris' },
    undefined,
  );
});

it('orders the person highlighted by injury news rather than the earlier selection', async () => {
  await act(() => root.render(createElement(App)));
  await act(() => container.querySelector<HTMLButtonElement>('[data-person="yusuf"]')?.click());
  await click('Show Idris');
  await click('Scene forest human');
  expect(colony.actions.order).toHaveBeenLastCalledWith({ personId: 'idris', placeId: 'forest' }, undefined);
});

it('keeps danger review and Confirm before felling the cedar', async () => {
  await act(() => root.render(createElement(App)));
  await click('Scene select human');
  await click('Scene cedar human');
  expect(colony.actions.order).not.toHaveBeenCalled();
  expect(container.querySelector('.colony')?.classList.contains('is-ordering')).toBe(true);
  expect(container.textContent).toContain('The cedar can injure whoever fells it.');
});
it('opens optional place controls without sending when destinations need more room', async () => {
  await act(() => root.render(createElement(App)));
  await click('Scene select human');
  await click('More places human');
  expect(colony.actions.order).not.toHaveBeenCalled();
  expect(container.querySelector('.colony')?.classList.contains('is-ordering')).toBe(true);
});
