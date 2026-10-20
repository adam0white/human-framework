// @vitest-environment happy-dom
import { act, createElement, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColonyGame, NUDGES, type Nudge } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import type { OrderCard } from '../sim/orders.ts';
import { PhoneSheet } from './PhoneStage.tsx';
import { type ComposerState, EMPTY_COMPOSER, PersonOrder } from './parts.tsx';

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
async function mount(
  active = true,
  nudge?: Nudge,
  orderCard?: OrderCard,
  state: Partial<ComposerState> = {},
) {
  const stageRoot = createRef<HTMLElement>();
  stageRoot.current = stage;
  const onOrdering = vi.fn();
  const onInspect = vi.fn();
  const onUse = vi.fn();
  const onWatch = vi.fn();
  const onAgain = vi.fn();
  const onInsist = vi.fn();
  const onCancel = vi.fn();
  await act(() =>
    root.render(
      createElement(PhoneSheet, {
        stageRoot,
        frame: {
          ...frame,
          ...(nudge ? { nudges: [nudge] } : {}),
          ...(orderCard ? { cards: [orderCard] } : {}),
        },
        personRequest: orderCard ? 1 : 0,
        state: {
          ...EMPTY_COMPOSER,
          personId: 'maryam',
          placeId: 'site',
          rush: true,
          insist: true,
          appeal: 'safety',
          ...state,
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
        onAgain,
        onInsist,
        onCancel,
        onSheet: vi.fn(),
        onSceneHeight: vi.fn(),
        onKeepWatching: vi.fn(),
      }),
    ),
  );
  return { onOrdering, onInspect, onUse, onWatch, onAgain, onInsist, onCancel };
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
  it('keeps the options origin through More while opening About and offers all four labelled snap heights', async () => {
    const { onInspect } = await mount();
    await click('More');
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

const refusedOrder: OrderCard = {
  order: {
    id: 'o1',
    issuedAt: 300,
    rollKey: 300,
    personId: 'maryam',
    placeId: 'site',
    action: 'build',
    rush: false,
    insist: false,
  },
  status: 'active',
  classic: { state: 'ok' },
  human: {
    state: 'willNot',
    label: 'They eat from my hands.',
    says: 'And leave the pot cold? They eat from my hands.',
  },
};
it('opens a person’s latest reply without History, with a direct retry and a visible Insist cost', async () => {
  const { onAgain } = await mount(true, undefined, refusedOrder);
  expect(stage.dataset.sheetId).toBe('person');
  expect(host.querySelector('.person-order-reply')?.textContent).toContain(
    'And leave the pot cold? They eat from my hands.',
  );
  expect(host.querySelector('.person-order-insist')?.textContent).toBe('Insist · may cost trust');
  await click('Ask again');
  expect(onAgain).toHaveBeenCalledExactlyOnceWith(refusedOrder);
  expect(stage.dataset.sheet).toBe('closed');
});
it('cancels the selected person’s order directly', async () => {
  const { onCancel } = await mount(true, undefined, refusedOrder);
  await click('Cancel order');
  expect(onCancel).toHaveBeenCalledExactlyOnceWith('o1');
});
it('keeps the trust warning on the direct Insist action', async () => {
  const { onInsist } = await mount(true, undefined, refusedOrder);
  await click('Insist · may cost trust');
  expect(onInsist).toHaveBeenCalledExactlyOnceWith(refusedOrder);
});

it('opens actual options, including Rush, from the labelled Order options button', async () => {
  await mount();
  await click('Watch village');
  await click('Order options · Maryam');
  expect(stage.dataset.sheetId).toBe('order');
  expect(host.querySelector('.lk-sheet-body [aria-label="Rush · faster, hungrier"]')).not.toBeNull();
});

it('explains disabled Confirm after Rush when a place has not been chosen', async () => {
  await mount(true, undefined, undefined, { placeId: null, rush: true });
  expect(host.querySelector('.btn-confirm')?.hasAttribute('disabled')).toBe(true);
  expect(host.querySelector('#well-confirm-reason')?.textContent).toContain('Choose a place first');
});

it('exposes Rush immediately beside the selected person while watching', async () => {
  await mount();
  await click('Watch village');
  expect(host.querySelector('.well-phone-tools')?.textContent).toContain('Rush');
});

it('retains a plain account of pressure after an insisted order has completed', async () => {
  await mount(true, undefined, {
    ...refusedOrder,
    order: { ...refusedOrder.order, insist: true },
    status: 'done',
    human: { state: 'complied', settled: true, outcome: 'Built a roof stage.' },
  });
  expect(host.querySelector('.person-order')?.textContent).toContain(
    'Maryam went along, but minded being pushed.',
  );
});

it('shows recorded trust costs since the latest order, without treating a warning as a paid cost', () => {
  const person = frame.human.find((person) => person.id === 'maryam');
  if (!person) throw new Error('Missing Maryam');
  const card = {
    ...refusedOrder,
    order: { ...refusedOrder.order, insist: true },
    human: { state: 'assent' as const },
  };
  const render = (history: typeof person.trust.history) =>
    renderToStaticMarkup(
      createElement(PersonOrder, {
        card,
        person: { ...person, trust: { value: 0.4, history } },
        onAgain: vi.fn(),
        onCancel: vi.fn(),
        onInsist: vi.fn(),
      }),
    );
  expect(render([{ minute: 310, delta: -0.1, label: 'Pushed into the squall' }])).toContain(
    'Maryam trusts you less. Pushed into the squall.',
  );
  expect(render([{ minute: 290, delta: -0.1, label: 'Earlier harm' }])).not.toContain('trusts you less');
  expect(render([{ minute: 300, delta: -0.1, label: 'Earlier order in the same minute' }])).not.toContain(
    'trusts you less',
  );
  expect(render([{ minute: 310, delta: 0.1, label: 'Good call' }])).not.toContain('trusts you less');
  expect(render([])).not.toContain('minded being pushed');
  expect(render([])).toContain('The recent record shows no trust loss after this request.');
});
