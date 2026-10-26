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
vi.mock('../../shared/tick-loop.ts', () => ({
  startTickLoop: (fn: typeof channel.tick) => {
    channel.tick = fn;
    return () => {};
  },
}));
function Harness({ capture }: { capture: (value: Voice) => void }) {
  capture(useVoice());
  return null;
}

it('slows reading ticks, keeps frame scheduling on wall time, and respects manual and replay holds', async () => {
  let voice: Voice | undefined;
  const root = createRoot(document.createElement('div'));
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
    await vi.waitFor(() =>
      expect(channel.post.mock.calls.some(([message]) => message.type === 'init')).toBe(true),
    );
    const init = channel.post.mock.calls.find(([msg]) => msg.type === 'init')?.[0];
    if (!voice || init?.type !== 'init') throw Error('Missing hook');
    const actions = voice.actions;
    // A title-page feedback export resolves without replacing a stored month with the premise.
    localStorage.setItem('hf-voice-run', 'existing-month');
    flushSync(() =>
      channel.receive({ type: 'frame', gen: init.gen, frame: { ...sampleFrame, phase: 'premise' } }),
    );
    channel.post.mockClear();
    const titleExport = actions.getPlaytest();
    expect(channel.post).toHaveBeenCalledWith({ type: 'exportPlaytest' });
    const titleFile = {
      kind: 'human-playtest' as const,
      format: 1 as const,
      game: 'voice' as const,
      build: 'dev',
      framework: 'test',
      engine: 'test',
      seed: 7,
      scenario: 'voice-2',
      minute: 1660,
      log: [],
      hash: 'title',
      snapshotEncoding: 'json' as const,
      snapshot: {},
    };
    flushSync(() => channel.receive({ type: 'playtest', gen: init.gen, file: titleFile }));
    expect(await titleExport).toEqual(titleFile);
    expect(localStorage.getItem('hf-voice-run')).toBe('existing-month');
    localStorage.removeItem('hf-voice-run');
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
    expect(channel.post).not.toHaveBeenCalled();
    channel.tick(240);
    expect(channel.post).toHaveBeenLastCalledWith({ type: 'tick', dtMs: 0.25, wallDtMs: 240 });
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
    expect(channel.post).toHaveBeenLastCalledWith({ type: 'tick', dtMs: 8_000, wallDtMs: 60_000 });
    flushSync(() => actions.setAutomaticPace('fast'));
    channel.tick(60_000);
    expect(channel.post).toHaveBeenLastCalledWith({ type: 'tick', dtMs: 60_000, wallDtMs: 60_000 });
    expect(channel.post.mock.calls.some(([msg]) => msg.type === 'setPace')).toBe(false);
    const previousCall = call.log[0];
    if (!previousCall) throw Error('Missing call');
    call.log[0] = { ...previousCall, id: 'call-next' };
    flushSync(() => channel.receive({ type: 'frame', gen: init.gen + 1, frame: call }));
    expect(voice.reading).toBe(true);
    flushSync(() => actions.suggest({ optionId: 'call:selin', strength: 'mention', insist: false }));
    expect(voice.reading).toBe(false);
    // A fresh encounter is a stop until the player resolves it. Opening and closing speech leaves it pending.
    actions.setPaused(false);
    flushSync(() => channel.receive({ type: 'frame', gen: init.gen + 1, frame: call }));
    const nextScene = { ...call, log: [{ ...previousCall, id: 'fresh-stop' }] };
    channel.post.mockClear();
    flushSync(() => channel.receive({ type: 'frame', gen: init.gen + 1, frame: nextScene }));
    expect(channel.post).toHaveBeenCalledWith({ type: 'pause' });
    channel.post.mockClear();
    flushSync(() =>
      channel.receive({ type: 'frame', gen: init.gen + 1, frame: { ...nextScene, paused: true } }),
    );
    flushSync(() => actions.setReading(true));
    flushSync(() => actions.setReading(false));
    expect(channel.post.mock.calls.some(([msg]) => msg.type === 'resume')).toBe(false);
    actions.setPaused(false);
    expect(channel.post).toHaveBeenLastCalledWith({ type: 'resume' });
  } finally {
    root.unmount();
  }
});
