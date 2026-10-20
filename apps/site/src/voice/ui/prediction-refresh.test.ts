// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { Draft, MainToWorker, Telegraph, WorkerToMain } from '../protocol.ts';
import { sampleFrame } from '../sim/fixtures.ts';
import { useVoice, type Voice } from './useVoice.ts';

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

it('refreshes the same draft on a newer frame, drops old replies and clears a withdrawn or unavailable forecast', async () => {
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
    const frame = {
      ...sampleFrame,
      composer: { open: true },
      muted: false,
      options: [{ id: 'see-doctor', label: 'see the doctor', rank: 1, leaning: false }],
    };
    const draft: Draft = { optionId: 'see-doctor', strength: 'mention', insist: false };
    const forecast: Telegraph = {
      tone: 'notNow',
      text: 'after I repair in the workshop',
      says: 'After I repair in the workshop, then I will.',
      reason: 'material',
      counter: 'after I repair in the workshop',
    };
    const lastRequest = () => {
      const msg = channel.post.mock.calls.filter(([m]) => m.type === 'predict').at(-1)?.[0];
      if (msg?.type !== 'predict') throw new Error('No prediction request');
      return msg;
    };
    flushSync(() => channel.receive({ type: 'frame', gen, frame }));
    flushSync(() => current().actions.predict(draft));
    const first = lastRequest();
    flushSync(() =>
      channel.receive({ type: 'predicted', gen, requestId: first.requestId, telegraph: forecast }),
    );
    expect(current().telegraph?.telegraph.counter).toBe('after I repair in the workshop');
    channel.post.mockClear();
    flushSync(() => channel.receive({ type: 'frame', gen, frame: { ...frame, paused: !frame.paused } }));
    expect(channel.post).not.toHaveBeenCalled();
    // The workshop has finished; the unchanged doctor draft needs a fresh forecast.
    flushSync(() => channel.receive({ type: 'frame', gen, frame: { ...frame, minute: frame.minute + 1 } }));
    const next = lastRequest();
    expect(next.draft).toEqual(draft);
    expect(next.requestId).toBeGreaterThan(first.requestId);
    expect(current().telegraph).toBeNull();
    flushSync(() =>
      channel.receive({ type: 'predicted', gen, requestId: first.requestId, telegraph: forecast }),
    );
    expect(current().telegraph).toBeNull();
    const resting = { ...forecast, counter: 'after I rest at home', reason: 'need:rest' };
    flushSync(() =>
      channel.receive({ type: 'predicted', gen, requestId: next.requestId, telegraph: resting }),
    );
    expect(current().telegraph?.telegraph.counter).toBe('after I rest at home');
    flushSync(() => current().actions.predict(null));
    expect(current().telegraph).toBeNull();
    flushSync(() => current().actions.predict(draft));
    const withdrawn = lastRequest();
    flushSync(() => channel.receive({ type: 'frame', gen, frame: { ...frame, options: [] } }));
    flushSync(() =>
      channel.receive({ type: 'predicted', gen, requestId: withdrawn.requestId, telegraph: resting }),
    );
    expect(current().telegraph).toBeNull();
  } finally {
    root.unmount();
  }
});
