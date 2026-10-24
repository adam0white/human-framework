// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { Draft, Frame, MainToWorker, Telegraph, WorkerToMain } from '../protocol.ts';
import { sampleFrame } from '../sim/fixtures.ts';
import { useVoice, type Voice } from './useVoice.ts';

vi.mock('../../shared/lab.tsx', () => ({ gameLabs: { voice: {} } }));

const channel = vi.hoisted(() => ({
  post: vi.fn<(msg: MainToWorker) => void>(),
  listeners: new Set<(msg: WorkerToMain) => void>(),
  receive(msg: WorkerToMain) {
    for (const listener of this.listeners) listener(msg);
  },
}));
vi.mock('./persona.tsx', () => ({
  voicePersonaReady: Promise.resolve(false),
  prepareVoiceReturn: async () => null,
  bindVoicePersona: () => () => {},
  checkpointVoicePersona: () => {},
  receiveVoicePersona: async () => {},
  gateVoiceFile: async () => {},
  settleVoiceFileGate: () => {},
  resetVoicePersona: () => {},
}));
vi.mock('./transport.ts', () => ({
  openTransport: async () => ({
    kind: 'worker',
    // The production cast transport removes this orchestration-only field before the worker.
    post: (msg: MainToWorker & { castRunGeneration?: number }) => {
      const { castRunGeneration: _generation, ...input } = msg;
      channel.post(input);
    },
    onMessage: (fn: typeof channel.receive) => {
      channel.listeners.add(fn);
    },
    onError: () => {},
    close: () => channel.listeners.clear(),
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
    await vi.waitFor(() =>
      expect(channel.post.mock.calls.some(([message]) => message.type === 'init')).toBe(true),
    );
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

it('filters routine beat stops through recorded inputs and preserves manual, Why, loaded and failed-answer holds', async () => {
  channel.post.mockClear();
  let voice: Voice | undefined;
  function Harness() {
    voice = useVoice();
    return null;
  }
  const root = createRoot(document.createElement('div'));
  try {
    flushSync(() => root.render(createElement(Harness)));
    await Promise.resolve();
    await vi.waitFor(() =>
      expect(channel.post.mock.calls.some(([message]) => message.type === 'init')).toBe(true),
    );
    const init = channel.post.mock.calls.find(([msg]) => msg.type === 'init')?.[0];
    if (init?.type !== 'init' || !voice) throw new Error('Missing hook');
    const actions = voice.actions;
    const running: Frame = {
      ...sampleFrame,
      phase: 'day',
      paused: false,
      autoPause: true,
      log: [],
      options: [],
      prefill: undefined,
      pauseBeat: undefined,
      intro: undefined,
    };
    const stopped = {
      ...running,
      paused: true,
      pauseBeat: { kind: 'close-call' as const, text: 'Routine.' },
    };
    const receive = (frame: Partial<Frame>, same?: (keyof Frame)[]) => {
      flushSync(() => channel.receive({ type: 'frame', gen: init.gen, frame, same }));
    };
    receive(stopped); // An imported or otherwise initially paused frame stays held.
    expect(channel.post.mock.calls.filter(([m]) => m.type === 'resume')).toHaveLength(0);
    receive(running);
    channel.post.mockClear();
    const { paused, pauseBeat, ...rest } = stopped;
    receive({ paused, pauseBeat }, Object.keys(rest) as (keyof Frame)[]);
    expect(channel.post).toHaveBeenCalledExactlyOnceWith({ type: 'resume' });
    receive(stopped);
    expect(channel.post).toHaveBeenCalledTimes(1);

    receive(running);
    flushSync(() => actions.setPaused(true));
    channel.post.mockClear();
    receive(stopped);
    expect(channel.post).not.toHaveBeenCalled();
    flushSync(() => actions.setPaused(false));
    receive(running);
    flushSync(() => actions.requestWhy('decision'));
    channel.post.mockClear();
    receive(stopped);
    expect(channel.post).not.toHaveBeenCalled();
    flushSync(() => actions.clearWhy());

    receive(running);
    flushSync(() => actions.suggest({ optionId: 'missing', strength: 'mention', insist: false }));
    channel.post.mockClear();
    receive(stopped);
    expect(channel.post).not.toHaveBeenCalled();
    receive(stopped);
    expect(channel.post).not.toHaveBeenCalled();

    flushSync(() => actions.replay());
    channel.post.mockClear();
    receive(running); // Old generation cannot restart pacing after replay.
    receive(stopped);
    expect(channel.post).not.toHaveBeenCalled();
  } finally {
    root.unmount();
  }
});

it('does not send an old run automatic resume after a replacement file was requested', async () => {
  channel.post.mockClear();
  let current: Voice | undefined;
  function Harness() {
    current = useVoice();
    return null;
  }
  const root = createRoot(document.createElement('div'));
  try {
    flushSync(() => root.render(createElement(Harness)));
    await Promise.resolve();
    await vi.waitFor(() =>
      expect(channel.post.mock.calls.some(([message]) => message.type === 'init')).toBe(true),
    );
    const init = channel.post.mock.calls.find(([m]) => m.type === 'init')?.[0];
    if (init?.type !== 'init' || !current) throw new Error('Missing hook');
    const running: Frame = {
      ...sampleFrame,
      log: [],
      options: [],
      intro: undefined,
      pauseBeat: undefined,
      prefill: undefined,
      paused: false,
      autoPause: true,
      phase: 'day',
    };
    flushSync(() => channel.receive({ type: 'frame', gen: init.gen, frame: running }));
    flushSync(() => current?.actions.loadPlaytest('{}'));
    channel.post.mockClear();
    flushSync(() =>
      channel.receive({
        type: 'frame',
        gen: init.gen,
        frame: { ...running, paused: true, pauseBeat: { kind: 'close-call', text: 'Old routine stop.' } },
      }),
    );
    expect(channel.post).not.toHaveBeenCalled();
  } finally {
    root.unmount();
  }
});
