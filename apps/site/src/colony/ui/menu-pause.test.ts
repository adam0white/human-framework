// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { type Colony, useColony } from './useColony.ts';

const channel = vi.hoisted(() => ({ tick: (_dt: number) => {}, post: vi.fn() }));
vi.mock('../../shared/tick-loop.ts', () => ({
  startTickLoop: (tick: typeof channel.tick) => {
    channel.tick = tick;
    return () => {};
  },
}));
it('withholds only ticks while the menu is open, without a resume or speed input', async () => {
  vi.stubGlobal(
    'Worker',
    class {
      postMessage = channel.post;
      addEventListener() {}
      removeEventListener() {}
      terminate() {}
    },
  );
  let colony: Colony | undefined;
  function Harness() {
    colony = useColony();
    return null;
  }
  const root = createRoot(document.createElement('div'));
  try {
    flushSync(() => root.render(createElement(Harness)));
    if (!colony) throw Error('Missing hook');
    await vi.waitFor(() => expect(channel.post.mock.calls.some(([m]) => m.type === 'init')).toBe(true));
    colony.actions.setSpeed(2);
    channel.post.mockClear();
    colony.actions.setMenuOpen(true);
    channel.tick(60_000);
    expect(channel.post.mock.calls).toEqual([[{ type: 'setContext', context: { menu: true } }]]);
    colony.actions.setMenuOpen(false);
    channel.tick(100);
    expect(channel.post.mock.calls).toEqual([
      [{ type: 'setContext', context: { menu: true } }],
      [{ type: 'setContext', context: { menu: false } }],
      [{ type: 'tick', dtMs: 100 }],
    ]);
    colony.actions.setPaused(true);
    channel.post.mockClear();
    colony.actions.setMenuOpen(true);
    colony.actions.setMenuOpen(false);
    expect(channel.post.mock.calls).toEqual([
      [{ type: 'setContext', context: { menu: true } }],
      [{ type: 'setContext', context: { menu: false } }],
    ]);
  } finally {
    flushSync(() => root.unmount());
    vi.unstubAllGlobals();
  }
});
