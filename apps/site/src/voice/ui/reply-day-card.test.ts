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
  vi.useFakeTimers();
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
    channel.voice = { ...channel.voice, frame: { ...frame, phase: 'between', paused: true } };
    await act(() => root.render(createElement(App)));
    await act(() => vi.advanceTimersByTime(600));
    expect(el.querySelector('.v-personal-reply')?.textContent).toContain('I miss sitting across from her.');
    expect(el.querySelector('.v-overlay-night')).toBeNull();
    await act(() => el.querySelector<HTMLButtonElement>('.v-personal-leave')?.click());
    expect(el.querySelector('.v-overlay-night')).not.toBeNull();
  } finally {
    await act(() => root.unmount());
    el.remove();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
    vi.useRealTimers();
  }
});

it('holds speech through the automatic day card and acknowledges an expired occasion before leaving it', async () => {
  vi.useFakeTimers();
  const frame = structuredClone(sampleFrame);
  Object.assign(frame, {
    day: 1,
    phase: 'day',
    paused: true,
    muted: false,
    intro: undefined,
    minute: 600,
    clock: '10:00',
    sceneWords: [],
    composer: { open: true },
  });
  frame.halil = { ...frame.halil, asleep: false, doing: null, felt: [], onMind: [] };
  frame.log = [
    {
      id: 'h',
      day: 1,
      minute: 600,
      clock: '10:00',
      kind: 'act',
      who: 'halil',
      text: 'I talk with Hacer at the door.',
    },
  ];
  frame.options = [{ id: 'talk:hacer', label: 'talk with Hacer at the door', rank: 1, leaning: true }];
  const suggest = vi.fn();
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
    actions: new Proxy({}, { get: (_, key) => (key === 'suggest' ? suggest : () => {}) }) as VoiceActions,
  };
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  try {
    await act(() => root.render(createElement(App)));
    await act(() => vi.advanceTimersByTime(600));
    const target = el.querySelector<HTMLButtonElement>('.v-scene-choice');
    if (!target) throw Error('No suggestion');
    await act(() => target.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, bubbles: true })));
    channel.voice = {
      ...channel.voice,
      frame: { ...frame, day: 2, phase: 'between', minute: 1440, log: [] },
    };
    await act(() => root.render(createElement(App)));
    await act(() => vi.advanceTimersByTime(2000));
    expect(el.querySelector('.v-scene-choice')).toBe(target);
    expect(el.querySelector('.v-overlay-night')).toBeNull();
    await act(() => target.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, bubbles: true })));
    await act(() => target.click());
    expect(suggest).not.toHaveBeenCalled();
    expect(el.querySelector('[role=status]')?.textContent).toContain(
      'Unsaid: “Hacer is here. Stay and talk.”',
    );
    await act(() => vi.advanceTimersByTime(600));
    expect(el.querySelector('.v-overlay-night')).toBeNull();
    const back = el.querySelector<HTMLButtonElement>('[role=status] button');
    await act(() => back?.click());
    expect(el.querySelector('.v-overlay-night')).not.toBeNull();
  } finally {
    await act(() => root.unmount());
    el.remove();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
    vi.useRealTimers();
  }
});
