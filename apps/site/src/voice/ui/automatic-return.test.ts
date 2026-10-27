// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { MainToWorker } from '../protocol.ts';
import type { SelinReturn } from '../sim/persona.ts';
import { useVoice, type Voice } from './useVoice.ts';

const channel = vi.hoisted(() => ({
  post: vi.fn<(message: MainToWorker) => void>(),
  prepare: vi.fn(),
}));
vi.mock('../../shared/lab.tsx', () => ({ gameLabs: { voice: {} } }));
vi.mock('../../shared/worker-telemetry.ts', () => ({ trackTransportRun: () => () => {} }));
vi.mock('../../shared/tick-loop.ts', () => ({ startTickLoop: () => () => {} }));
vi.mock('./persona.tsx', () => ({
  voicePersonaReady: Promise.resolve(false),
  prepareVoiceReturn: channel.prepare,
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
    post: channel.post,
    onMessage() {},
    onError() {},
    close() {},
  }),
}));

function Harness({ capture }: { capture: (value: Voice) => void }) {
  capture(useVoice());
  return null;
}
async function mount() {
  let voice: Voice | undefined;
  const root = createRoot(document.createElement('div'));
  flushSync(() =>
    root.render(
      createElement(Harness, {
        capture: (value) => {
          voice = value;
        },
      }),
    ),
  );
  await vi.waitFor(() => expect(channel.post.mock.calls.some(([m]) => m.type === 'init')).toBe(true));
  channel.post.mockClear();
  return {
    current: () => {
      if (!voice) throw new Error('Missing hook');
      return voice;
    },
    close: () => root.unmount(),
  };
}

it('serializes an automatic return against duplicate starts, import and restart', async () => {
  let finish!: (value: { header: SelinReturn; seed: number }) => void;
  channel.prepare.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const view = await mount();
  try {
    view.current().actions.begin();
    view.current().actions.begin();
    view.current().actions.replay(99);
    view.current().actions.loadPlaytest('{}');
    expect(channel.prepare).toHaveBeenCalledOnce();
    expect(channel.post).not.toHaveBeenCalled();
    finish({ header: {} as SelinReturn, seed: 27 });
    await vi.waitFor(() =>
      expect(channel.post.mock.calls.some(([m]) => m.type === 'init' && m.seed === 27 && m.selinReturn)).toBe(
        true,
      ),
    );
    expect(channel.post.mock.calls.filter(([m]) => m.type === 'init')).toHaveLength(1);
    expect(channel.post.mock.calls.some(([m]) => m.type === 'begin' || m.type === 'loadPlaytest')).toBe(
      false,
    );
  } finally {
    view.close();
    channel.prepare.mockReset();
    channel.post.mockClear();
  }
});

it('starts ordinary play when no returning person exists', async () => {
  channel.prepare.mockResolvedValue(null);
  const view = await mount();
  try {
    view.current().actions.begin();
    await vi.waitFor(() => expect(channel.post.mock.calls.some(([m]) => m.type === 'begin')).toBe(true));
    expect(channel.post.mock.calls.some(([m]) => m.type === 'init')).toBe(false);
  } finally {
    view.close();
    channel.prepare.mockReset();
    channel.post.mockClear();
  }
});
