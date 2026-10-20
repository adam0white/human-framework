// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { MainToWorker, WhyView, WorkerToMain } from '../protocol.ts';
import type { Voice } from './useVoice.ts';
import { useVoice } from './useVoice.ts';

const channel = vi.hoisted(() => ({
  post: vi.fn<(msg: MainToWorker) => void>(),
  receive: (_msg: WorkerToMain) => {},
}));
vi.mock('./transport.ts', () => ({
  openTransport: async () => ({
    kind: 'worker',
    post: channel.post,
    onMessage: (fn: typeof channel.receive) => {
      channel.receive = fn;
    },
    onError: () => {},
    close: () => {},
  }),
}));
vi.mock('../../shared/tick-loop.ts', () => ({ startTickLoop: () => () => {} }));

it('retains the held answer’s Why without opening it, then reads it after the worker trace expires and clears it on replay', async () => {
  let voice: Voice | undefined;
  function Harness() {
    voice = useVoice();
    return null;
  }
  const el = document.createElement('div');
  const root = createRoot(el);
  try {
    flushSync(() => root.render(createElement(Harness)));
    await Promise.resolve();
    const current = () => {
      if (!voice) throw new Error('Hook did not mount');
      return voice;
    };
    const init = channel.post.mock.calls.find(([msg]) => msg.type === 'init')?.[0];
    if (init?.type !== 'init') throw new Error('Missing init');
    const gen = init.gen;
    const why: WhyView = { decisionId: 'd1', clock: '12:00', chosen: 'rest', options: [] };
    current().actions.retainWhy('d1');
    flushSync(() => channel.receive({ type: 'why', gen, decisionId: 'd1', why }));
    expect(current().whyOpen).toBe(false);
    channel.post.mockClear();
    flushSync(() => current().actions.requestWhy('d1'));
    expect(current().why).toEqual(why);
    expect(current().whyOpen).toBe(true);
    expect(channel.post).not.toHaveBeenCalled();
    // A different, unavailable decision must not replace the retained one.
    flushSync(() => current().actions.requestWhy('gone'));
    flushSync(() => channel.receive({ type: 'why', gen, decisionId: 'gone', why: null }));
    expect(current().whyMissing).toBe(true);
    flushSync(() => current().actions.requestWhy('d1'));
    expect(current().why).toEqual(why);
    expect(current().whyMissing).toBe(false);
    flushSync(() => current().actions.replay());
    flushSync(() => current().actions.requestWhy('d1'));
    expect(current().why).toBeNull();
    expect(channel.post).toHaveBeenLastCalledWith({ type: 'why', decisionId: 'd1' });
  } finally {
    root.unmount();
  }
});
