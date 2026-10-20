// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ColonyGame, NUDGES } from '../sim/game.ts';
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
      {
        'data-scene': p.side,
        'data-places': p.scenePlaces?.length ?? 0,
        'data-following': p.following,
        'data-highlight': p.hoverPlace,
      },
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

it('clears destination cards after sending and Watch village, then restores them on selection', async () => {
  await act(() => root.render(createElement(App)));
  await click('Scene select human');
  expect(container.querySelector('[data-scene="human"]')?.getAttribute('data-places')).toBe('8');
  await click('Scene forest human');
  expect(container.querySelector('[data-scene="human"]')?.getAttribute('data-places')).toBe('0');
  expect(container.querySelector('[data-scene="human"]')?.getAttribute('data-following')).toBe('true');
  await click('Scene select human');
  await act(() => container.querySelector<HTMLButtonElement>('.watch-village')?.click());
  expect(container.querySelector('[data-scene="human"]')?.getAttribute('data-places')).toBe('0');
  await click('Scene select human');
  expect(container.querySelector('[data-scene="human"]')?.getAttribute('data-places')).toBe('8');
});
it('shows the order scope before the first order and in every acknowledgement', async () => {
  await act(() => root.render(createElement(App)));
  expect(container.querySelector('.well-phone-status')?.textContent).toContain(
    'Each order goes to both villages.',
  );
  await click('Scene select human');
  await click('Scene forest human');
  expect(container.querySelector('.well-phone-status')?.textContent).toContain(
    'Order given to both villages: Idris → Forest',
  );
  expect(container.querySelector('.well-first-order')).toBeNull();
});
it('sends a safe suggestion in one tap with exactly its prepared payload and nudge id', async () => {
  const n = NUDGES[0];
  if (!n || !colony.frame) throw new Error('Missing dawn suggestion');
  colony.frame = { ...colony.frame, nudges: [n] };
  await act(() => root.render(createElement(App)));
  await act(() => container.querySelector<HTMLButtonElement>('.nudge-use')?.click());
  expect(colony.actions.order).toHaveBeenCalledExactlyOnceWith(n.order, n.id);
  expect(container.querySelector('[data-scene="human"]')?.getAttribute('data-places')).toBe('0');
});
it('keeps cedar suggestion review before sending', async () => {
  const n = NUDGES.find((n) => n.id === 'cedar');
  if (!n || !colony.frame) throw new Error('Missing cedar suggestion');
  colony.frame = { ...colony.frame, nudges: [n] };
  await act(() => root.render(createElement(App)));
  await act(() => container.querySelector<HTMLButtonElement>('.nudge-use')?.click());
  expect(colony.actions.order).not.toHaveBeenCalled();
  await act(() => container.querySelector<HTMLButtonElement>('.btn-confirm')?.click());
  expect(colony.actions.order).toHaveBeenCalledExactlyOnceWith(n.order, n.id);
});
it('names injury news from the village not shown and offers to show the person there', async () => {
  if (!colony.frame) throw new Error('Missing frame');
  colony.frame = {
    ...colony.frame,
    news: [{ personId: 'idris', side: 'classic', minute: 330, how: 'hurt at work' }],
  };
  await act(() => root.render(createElement(App)));
  expect(container.querySelector('.well-phone-status .hurt-line')?.textContent).toContain(
    'Classic village · not shown',
  );
  await click('Show Idris');
  expect(container.querySelector('.stage')?.classList.contains('show-classic')).toBe(true);
  expect(container.querySelector('.well-phone-status .hurt-line')?.textContent).not.toContain('not shown');
});

it('Watch village keeps a draft available but prevents hidden keyboard confirmation and highlighting', async () => {
  const n = NUDGES.find((n) => n.id === 'cedar');
  if (!n || !colony.frame) throw new Error('Missing cedar suggestion');
  colony.frame = { ...colony.frame, nudges: [n] };
  await act(() => root.render(createElement(App)));
  await act(() => container.querySelector<HTMLButtonElement>('.nudge-use')?.click());
  await act(() => container.querySelector<HTMLButtonElement>('.watch-village')?.click());
  expect(container.querySelector('[data-scene="human"]')?.getAttribute('data-highlight')).toBeNull();
  await act(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  expect(colony.actions.order).not.toHaveBeenCalled();
  expect(container.querySelector('.composer-line')?.textContent).toContain('Idris → Cedar');
});

it('reopens the selected person’s latest order from the labelled status line', async () => {
  if (!colony.frame) throw new Error('Missing frame');
  colony.frame.cards = [
    {
      order: {
        id: 'o1',
        personId: 'idris',
        placeId: 'site',
        action: 'build',
        issuedAt: 300,
        rollKey: 0,
        rush: false,
        insist: false,
      },
      human: { state: 'notNow', label: 'after I pray Fajr' },
      classic: { state: 'ok' },
      status: 'active',
    },
  ];
  await act(() => root.render(createElement(App)));
  await click('Scene select human');
  const status = container.querySelector<HTMLButtonElement>('button.well-selected-person');
  expect(status?.getAttribute('aria-label')).toContain('Open Idris’s latest order');
  expect(status?.textContent).toContain('House: later, after I pray Fajr');
  await act(() => status?.click());
  expect(container.querySelector('.person-order')?.textContent).toContain('after I pray Fajr');
  expect(colony.actions.order).not.toHaveBeenCalled();
});

it('reviews a predicted refusal as insist before Confirm sends the suggestion', async () => {
  const nudge = NUDGES.find((n) => n.id === 'roof-hands-1');
  if (!nudge || !colony.frame) throw new Error('Missing roof suggestion');
  colony.frame.nudges = [nudge];
  colony.suggestionPrediction = {
    input: { ...nudge.order, rush: true, insist: false },
    prediction: {
      personId: 'samira',
      action: 'build',
      kind: 'willNot',
      text: 'Will refuse: busy with own work',
    },
  };
  await act(() => root.render(createElement(App)));
  await act(() => container.querySelector<HTMLButtonElement>('.nudge-use')?.click());
  expect(colony.actions.order).not.toHaveBeenCalled();
  expect(container.querySelector('.composer-line')?.textContent).toContain('Samira → House');
  expect(container.querySelector('.composer')?.textContent).toContain('Insist: may cost trust');
  await act(() => container.querySelector<HTMLButtonElement>('.composer .btn-confirm')?.click());
  expect(colony.actions.order).toHaveBeenCalledExactlyOnceWith(
    { personId: 'samira', placeId: 'site', rush: true, insist: true },
    'roof-hands-1',
  );
});
