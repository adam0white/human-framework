// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { MainToWorker, WorkerToMain } from '../protocol.ts';
import { sampleFrame } from '../sim/fixtures.ts';
import { useVoice, type Voice } from './useVoice.ts';

vi.mock('../../shared/lab.tsx', () => ({ gameLabs: { voice: {} } }));

const channel = vi.hoisted(() => ({
  post: vi.fn<(msg: MainToWorker) => void>(),
  listeners: new Set<(msg: WorkerToMain) => void>(),
  receive(msg: WorkerToMain) {
    for (const listener of this.listeners) listener(msg);
  },
  tick: (_dt: number) => {},
}));
vi.mock('./transport.ts', () => ({
  openTransport: async () => ({
    kind: 'worker',
    post: channel.post,
    onMessage: (fn: typeof channel.receive) => {
      channel.listeners.add(fn);
    },
    onError: () => {},
    close: () => channel.listeners.clear(),
  }),
}));
vi.mock('../../shared/tick-loop.ts', () => ({
  startTickLoop: (fn: typeof channel.tick) => {
    channel.tick = fn;
    return () => {};
  },
}));
it('slows reading ticks, keeps frame scheduling on wall time, and respects manual and replay holds', async () => {
  let voice: Voice | undefined;
  function Harness() {
    voice = useVoice();
    return null;
  }
  const root = createRoot(document.createElement('div'));
  try {
    flushSync(() => root.render(createElement(Harness)));
    await Promise.resolve();
    const init = channel.post.mock.calls.find(([msg]) => msg.type === 'init')?.[0];
    if (!voice || init?.type !== 'init') throw Error('Missing hook');
    const actions = voice.actions;
    const frame = {
      ...sampleFrame,
      phase: 'day' as const,
      muted: false,
      paused: true,
      fastForward: 'repairing',
      intro: undefined,
    };
    flushSync(() => channel.receive({ type: 'frame', gen: init.gen, frame }));
    channel.post.mockClear();
    flushSync(() => actions.setReading(true));
    expect(channel.post).toHaveBeenCalledWith({ type: 'resume' });
    channel.tick(240);
    expect(channel.post).toHaveBeenLastCalledWith({ type: 'tick', dtMs: 1, wallDtMs: 240 });
    flushSync(() => actions.setReading(false));
    channel.tick(240);
    expect(channel.post).toHaveBeenLastCalledWith({ type: 'tick', dtMs: 240, wallDtMs: 240 });
    channel.post.mockClear();
    actions.setMenuOpen(true);
    channel.tick(60_000);
    expect(channel.post).not.toHaveBeenCalled();
    actions.setMenuOpen(false);
    channel.tick(240);
    expect(channel.post).toHaveBeenLastCalledWith({ type: 'tick', dtMs: 240, wallDtMs: 240 });
    actions.setPaused(true);
    channel.post.mockClear();
    flushSync(() => actions.setReading(true));
    expect(channel.post).not.toHaveBeenCalled();
    actions.setPaused(false);
    flushSync(() => actions.loadPlaytest('{}'));
    channel.post.mockClear();
    flushSync(() => actions.setReading(true));
    flushSync(() => channel.receive({ type: 'frame', gen: init.gen, frame }));
    expect(channel.post.mock.calls.some(([msg]) => msg.type === 'resume')).toBe(false);
    flushSync(() =>
      channel.receive({
        type: 'replayed',
        gen: init.gen + 1,
        result: {
          matches: true,
          hash: 'a',
          expected: 'a',
          file: { build: 'a', framework: 'a', engine: 'a' },
          here: { framework: 'a', engine: 'a' },
          driftAt: -1,
          minute: frame.minute,
        },
      }),
    );
    flushSync(() => channel.receive({ type: 'frame', gen: init.gen + 1, frame }));
    channel.post.mockClear();
    flushSync(() => actions.setReading(true));
    expect(channel.post.mock.calls.some(([msg]) => msg.type === 'resume')).toBe(false);
    expect(voice.runId).toBe(1);
    // A stay offer slows the clock before the player opens speech, including at Fast.
    const call = {
      ...frame,
      paused: false,
      pace: 'fast' as const,
      fastForward: undefined,
      minute: 1200,
      composer: { open: true },
      halil: { ...frame.halil, asleep: false, doing: null },
      log: [
        {
          id: 'call',
          day: frame.day,
          minute: 1200,
          clock: '20:00',
          kind: 'act' as const,
          who: 'halil' as const,
          text: 'I call Selin.',
        },
      ],
      options: [{ id: 'call:selin', label: 'call Selin', rank: 1, leaning: true }],
    };
    flushSync(() => actions.setReading(false));
    flushSync(() => channel.receive({ type: 'frame', gen: init.gen + 1, frame: call }));
    expect(voice.reading).toBe(true);
    channel.tick(60_000);
    expect(channel.post).toHaveBeenLastCalledWith({ type: 'tick', dtMs: 250, wallDtMs: 60_000 });
    flushSync(() => actions.dismissSceneOffer());
    expect(voice.reading).toBe(false);
    channel.tick(60_000);
    expect(channel.post).toHaveBeenLastCalledWith({ type: 'tick', dtMs: 60_000, wallDtMs: 60_000 });
    const previousCall = call.log[0];
    if (!previousCall) throw Error('Missing call');
    call.log[0] = { ...previousCall, id: 'call-next' };
    flushSync(() => channel.receive({ type: 'frame', gen: init.gen + 1, frame: call }));
    expect(voice.reading).toBe(true);
    flushSync(() => actions.suggest({ optionId: 'call:selin', strength: 'mention', insist: false }));
    expect(voice.reading).toBe(false);
  } finally {
    root.unmount();
  }
});
