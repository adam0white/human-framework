// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { MainToWorker, WhyView, WorkerToMain } from '../protocol.ts';
import type { Voice } from './useVoice.ts';
import { useVoice } from './useVoice.ts';

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

function Harness({ capture }: { capture: (value: Voice) => void }) {
  capture(useVoice());
  return null;
}

it('retains the held answer’s Why without opening it, then reads it after the worker trace expires and clears it on replay', async () => {
  let voice: Voice | undefined;
  const el = document.createElement('div');
  const root = createRoot(el);
  try {
    flushSync(() =>
      root.render(
        createElement(Harness, {
          capture: (value) => {
            voice = value;
          },
        }),
      ),
    );
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
