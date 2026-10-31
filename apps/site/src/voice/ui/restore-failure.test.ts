// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { MainToWorker, WorkerToMain } from '../protocol.ts';
import { sampleFrame } from '../sim/fixtures.ts';
import { useVoice, type Voice } from './useVoice.ts';

vi.mock('../../shared/lab.tsx', () => ({ useLabScreen: () => {}, gameLabs: { voice: {} } }));

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

it('shows a failed people restore even while an export is waiting', async () => {
  let voice: Voice | undefined;
  const root = createRoot(document.createElement('div'));
  try {
    flushSync(() =>
      root.render(
        createElement(() => {
          voice = useVoice();
          return null;
        }),
      ),
    );
    await vi.waitFor(() =>
      expect(channel.post.mock.calls.some(([message]) => message.type === 'init')).toBe(true),
    );
    const init = channel.post.mock.calls.find(([message]) => message.type === 'init')?.[0];
    if (!voice || init?.type !== 'init') throw Error('Missing hook');
    flushSync(() =>
      channel.receive({ type: 'frame', gen: init.gen, frame: { ...sampleFrame, phase: 'day' } }),
    );
    // The loaded frame's autosave (or a feedback export) is already waiting when the restore fails.
    const waiting = voice.actions.getPlaytest().catch((error: Error) => error.message);
    expect(channel.post).toHaveBeenCalledWith({ type: 'exportPlaytest' });
    const message = "This save's people could not be restored, so it cannot continue. Start a fresh game.";
    flushSync(() => channel.receive({ type: 'playtestError', gen: init.gen, message, restore: true }));
    expect(voice.playtest).toEqual({ error: message });
    expect(await waiting).toBe(message);
  } finally {
    root.unmount();
  }
});
