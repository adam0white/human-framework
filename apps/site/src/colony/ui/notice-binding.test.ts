// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { HurtNews } from '../sim/game.ts';
import { HurtLine } from './parts.tsx';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
it('keeps the rendered injury and its Home target through a press while news changes', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const onRest = vi.fn();
  const first: HurtNews = { personId: 'yusuf', side: 'human', minute: 2200, how: 'at work' };
  const second: HurtNews = { personId: 'idris', side: 'human', minute: 2210, how: 'at work' };
  const render = (news: HurtNews[]) => act(() => root.render(createElement(HurtLine, { news, onRest })));
  try {
    await render([first]);
    const button = host.querySelector('button');
    if (!button) throw new Error('No Home button');
    await act(() =>
      button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' })),
    );
    await render([second]);
    expect(host.textContent).toContain('Send Yusuf home');
    expect(host.textContent).not.toContain('Send Idris home');
    await act(() => {
      button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }));
      button.click();
    });
    expect(onRest).toHaveBeenCalledExactlyOnceWith(first);
    expect(host.textContent).toContain('Send Idris home');
  } finally {
    await act(() => root.unmount());
    host.remove();
  }
});

it('offers Show but never an order for a Classic injury, including when it is not shown', async () => {
  const host = document.createElement('div');
  const root = createRoot(host);
  const onRest = vi.fn();
  const onShow = vi.fn();
  const news: HurtNews = { personId: 'yusuf', side: 'classic', minute: 2200, how: 'at work' };
  try {
    await act(() =>
      root.render(createElement(HurtLine, { news: [news], shownSide: 'human', onRest, onShow })),
    );
    expect(host.textContent).toContain('Classic village · not shown');
    expect(host.textContent).not.toContain('Send Yusuf home');
    const show = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Show Yusuf');
    await act(() => show?.click());
    expect(onShow).toHaveBeenCalledExactlyOnceWith(news);
    expect(onRest).not.toHaveBeenCalled();
  } finally {
    await act(() => root.unmount());
  }
});
