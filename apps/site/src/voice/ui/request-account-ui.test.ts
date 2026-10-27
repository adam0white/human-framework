// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
import { sampleFrame } from '../sim/fixtures.ts';
import { Composer } from './Composer.tsx';
import { SceneDay } from './SceneDay.tsx';

test('warns before both direct and detailed replacement without sending or changing the draft', () => {
  const frame = structuredClone(sampleFrame);
  Object.assign(frame, {
    phase: 'day',
    intro: undefined,
    paused: true,
    muted: false,
    sceneWords: [],
    composer: { open: true },
  });
  frame.halil = { ...frame.halil, asleep: false, doing: null, felt: [], onMind: [] };
  frame.options = [{ id: 'talk:hacer', label: 'talk with Hacer at the door', rank: 1, leaning: true }];
  frame.log = [
    {
      id: 'act',
      kind: 'act',
      who: 'halil',
      text: 'I talk with Hacer at the door.',
      clock: frame.clock,
      minute: frame.minute,
      day: frame.day,
    },
  ];
  frame.standing = {
    label: 'urge · take an afternoon shift',
    since: '12:45',
    expires: '15:45',
    draft: { optionId: 'work-extra', strength: 'urge', insist: false },
  };
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  const onSuggest = vi.fn();
  try {
    flushSync(() =>
      root.render(
        createElement(SceneDay, {
          frame,
          telegraph: null,
          whyOpen: false,
          selected: null,
          onWhy() {},
          onRetainWhy() {},
          onPredict() {},
          onSuggest,
          onSayNothing() {},
          onWithdraw() {},
        }),
      ),
    );
    expect(el.querySelector('.v-speaking-body')?.textContent).toContain(
      'A new suggestion replaces your standing word: urge · take an afternoon shift.',
    );
    expect(onSuggest).not.toHaveBeenCalled();
    const before = JSON.stringify(frame);
    const listen = [...el.querySelectorAll<HTMLButtonElement>('.v-speaking-actions button')].find(
      (button) => button.textContent === 'Keep listening',
    );
    expect(listen).toBeDefined();
    flushSync(() => listen?.click());
    expect(el.querySelector('[aria-label="Speak to Halil"]')).toBeNull();
    expect(onSuggest).not.toHaveBeenCalled();
    expect(JSON.stringify(frame)).toBe(before);
    flushSync(() =>
      root.render(
        createElement(Composer, {
          composer: frame.composer,
          options: frame.options,
          muted: false,
          prefill: undefined,
          leaning: undefined,
          doingLabel: undefined,
          standingLabel: frame.standing?.label,
          telegraph: null,
          whyOpen: false,
          onPredict() {},
          onSuggest,
          onSayNothing() {},
        }),
      ),
    );
    expect(el.querySelector('.v-commit')?.textContent).toContain(
      'Say it replaces your standing word: urge · take an afternoon shift.',
    );
    expect(el.querySelector('.v-say > p')).toBeNull();
    expect(onSuggest).not.toHaveBeenCalled();
  } finally {
    flushSync(() => root.unmount());
    el.remove();
  }
});

test('shows actual sent line, immediate reply and waiting status beside the scene', () => {
  const frame = structuredClone(sampleFrame);
  Object.assign(frame, {
    phase: 'day',
    intro: undefined,
    muted: false,
    log: [
      {
        id: 'sent',
        day: frame.day,
        minute: frame.minute,
        clock: frame.clock,
        kind: 'you',
        who: 'you',
        text: 'You: urge · call Selin',
      },
    ],
    standing: {
      label: 'urge · call Selin',
      since: frame.clock,
      expires: '23:00',
      draft: { optionId: 'call:selin', strength: 'urge', insist: false },
    },
  });
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  const render = () =>
    flushSync(() =>
      root.render(
        createElement(SceneDay, {
          frame: { ...frame },
          telegraph: null,
          whyOpen: false,
          selected: null,
          onWhy() {},
          onRetainWhy() {},
          onPredict() {},
          onSuggest() {},
          onSayNothing() {},
          onWithdraw() {},
        }),
      ),
    );
  try {
    render();
    expect(el.querySelector('[aria-label="Your latest suggestion"]')?.textContent).toContain(
      'Said. Waiting for his answer.',
    );
    frame.log.push({
      ...frame.log[0]!,
      id: 'answer',
      kind: 'answer',
      who: 'halil',
      text: '“After I rest.”',
      tone: 'notNow',
    });
    render();
    const account = el.querySelector('[aria-label="Your latest suggestion"]');
    expect(account?.textContent).toContain('You: call Selin');
    expect(account?.textContent).toContain('“After I rest.”');
    expect(account?.textContent).not.toContain('Waiting for his answer');
  } finally {
    flushSync(() => root.unmount());
    el.remove();
  }
});
