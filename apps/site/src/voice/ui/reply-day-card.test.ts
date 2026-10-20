// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { sampleBetween, sampleFrame } from '../sim/fixtures.ts';
import { App } from './App.tsx';
import type { Voice, VoiceActions } from './useVoice.ts';

const channel = vi.hoisted(() => ({ voice: undefined as Voice | undefined }));
vi.mock('./useVoice.ts', () => ({ useVoice: () => channel.voice }));
vi.mock('../../shared/lab.tsx', () => ({
  gameLabs: { voice: {} },
  useLabScreen: () => {},
  LabMenuContent: () => null,
}));
it('waits for the player to leave a personal reply before showing the automatic day card', async () => {
  const frame = structuredClone(sampleFrame);
  Object.assign(frame, { day: 1, phase: 'day', muted: false, intro: undefined, log: [] });
  frame.sceneWords = [
    {
      beat: 'personal',
      kind: 'care',
      day: 1,
      minute: frame.minute,
      clock: frame.clock,
      words: 'You can miss her.',
      answer: 'I miss sitting across from her.',
    },
  ];
  channel.voice = {
    frame,
    between: sampleBetween,
    report: null,
    telegraph: null,
    why: null,
    whyOpen: false,
    whyMissing: false,
    error: null,
    mock: false,
    reading: false,
    sceneReading: false,
    runId: 0,
    playtest: null,
    actions: new Proxy({}, { get: () => vi.fn() }) as VoiceActions,
  };
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  try {
    await act(() => root.render(createElement(App)));
    expect(el.querySelector('.v-personal-reply')).not.toBeNull();
    frame.phase = 'between';
    frame.paused = true;
    channel.voice = { ...channel.voice, frame: { ...frame } };
    await act(() => root.render(createElement(App)));
    expect(el.querySelector('.v-personal-reply')?.textContent).toContain('I miss sitting across from her.');
    expect(el.querySelector('.v-overlay-night')).toBeNull();
    await act(() => el.querySelector<HTMLButtonElement>('.v-personal-leave')?.click());
    expect(el.querySelector('.v-overlay-night')).not.toBeNull();
  } finally {
    await act(() => root.unmount());
    el.remove();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  }
});
