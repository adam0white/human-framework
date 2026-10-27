// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { DebugMenu } from './DebugMenu.tsx';

it('mounts kit diagnostics beside privacy, closed on each menu visit, with working React actions', () => {
  const element = document.createElement('div');
  const root = createRoot(element);
  const action = vi.fn();
  const menu = () =>
    createElement(DebugMenu, null, createElement('button', { type: 'button', onClick: action }, 'Verify'));
  try {
    flushSync(() => root.render(menu()));
    const details = element.querySelector('details');
    expect(details?.open).toBe(false);
    expect(details?.parentElement?.querySelector('a')?.textContent).toBe('Lab privacy');
    if (!details) throw new Error('Missing Debug');
    details.open = true;
    flushSync(() => element.querySelector('button')?.click());
    expect(action).toHaveBeenCalledOnce();
    flushSync(() => root.render(null));
    flushSync(() => root.render(menu()));
    expect(element.querySelector('details')?.open).toBe(false);
  } finally {
    root.unmount();
  }
});
