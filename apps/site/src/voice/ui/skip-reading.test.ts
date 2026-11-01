// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { sampleFrame } from '../sim/fixtures.ts';

const state = vi.hoisted(() => ({ voice: {} as Record<string, unknown> }));
vi.mock('./useVoice.ts', () => ({ useVoice: () => state.voice }));
vi.mock('../../shared/lab.tsx', () => ({ gameLabs: { voice: {} }, useLabScreen: vi.fn() }));
vi.mock('../../shared/LabNotice.tsx', () => ({ LabNotice: () => null }));
vi.mock('./SendWord.tsx', () => ({ RecordingPreference: () => null, SendWord: () => null }));
vi.mock('./persona.tsx', () => ({ VoicePersonaControls: () => null }));

import { App } from './App.tsx';

it('explains why Skip is unavailable while retained updates are open, then restores it after acknowledgement', async () => {
  const frame = structuredClone(sampleFrame);
  frame.phase = 'day';
  frame.paused = false;
  frame.day = 1;
  frame.minute = 600;
  frame.clock = '10:00';
  delete frame.intro;
  frame.log = [
    {
      id: 'ended',
      day: 1,
      minute: 600,
      clock: '10:00',
      kind: 'note',
      who: 'you',
      text: 'Your suggestion has ended: he fell asleep.',
    },
  ];
  const skip = vi.fn();
  const actions = new Proxy(
    { skip },
    { get: (target, key) => (key in target ? target[key as keyof typeof target] : vi.fn()) },
  );
  state.voice = { frame, actions, runId: 1, sceneReading: false, skipping: false, whyOpen: false };
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  try {
    flushSync(() => root.render(createElement(App)));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const button = el.querySelector<HTMLButtonElement>('[aria-label="Skip to the next event"]');
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(true);
    expect(el.textContent).toContain('Skip is off while these words are open.');
    flushSync(() => button?.click());
    expect(skip).not.toHaveBeenCalled();
    const acknowledge = el.querySelector<HTMLButtonElement>('[aria-label="While you waited"] button');
    expect(acknowledge).not.toBeNull();
    flushSync(() => acknowledge?.click());
    const resumed = el.querySelector<HTMLButtonElement>('[aria-label="Skip to the next event"]');
    await vi.waitFor(() => expect(resumed?.disabled).toBe(false));
    flushSync(() => resumed?.click());
    expect(skip).toHaveBeenCalledOnce();
  } finally {
    root.unmount();
    el.remove();
  }
});

it('labels panel reading as slowdown while the actual game clock is running', async () => {
  const frame = structuredClone(sampleFrame);
  frame.phase = 'day';
  frame.paused = false;
  frame.day = 1;
  frame.minute = 600;
  frame.clock = '10:00';
  delete frame.intro;
  frame.log = [
    {
      id: 'answer',
      day: 1,
      minute: 600,
      clock: '10:00',
      kind: 'answer',
      who: 'halil',
      text: 'Not now.',
      decisionId: 'answer-id',
    },
  ];
  const setReading = vi.fn();
  const actions = new Proxy(
    { setReading },
    { get: (target, key) => (key in target ? target[key as keyof typeof target] : vi.fn()) },
  );
  state.voice = { frame, actions, runId: 1, sceneReading: false, skipping: false, whyOpen: false };
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  try {
    flushSync(() => root.render(createElement(App)));
    const today = [...el.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.trim() === 'Today',
    );
    expect(today).toBeDefined();
    flushSync(() => today?.click());
    await vi.waitFor(() => expect(setReading).toHaveBeenLastCalledWith(true));
    expect(el.querySelector('.v-reading')?.textContent).not.toContain('Clock paused.');
    expect(el.querySelector('.v-reading')?.textContent).toContain('Clock slowed while you read.');
    state.voice = { ...state.voice, frame: { ...frame, paused: true } };
    flushSync(() => root.render(createElement(App)));
    expect(el.querySelector('.v-reading')?.textContent).toContain('Clock paused.');
  } finally {
    root.unmount();
    el.remove();
  }
});
