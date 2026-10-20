// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import type { Draft } from '../protocol.ts';
import { sampleFrame } from '../sim/fixtures.ts';
import { SceneDay } from './SceneDay.tsx';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
function mount(initialPaused = true) {
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  const frame = structuredClone(sampleFrame);
  frame.paused = initialPaused;
  frame.day = 1;
  frame.minute = 600;
  frame.clock = '10:00';
  frame.composer = { open: true };
  frame.halil.doing = null;
  frame.halil.onMind = [];
  frame.halil.felt = [];
  frame.muted = false;
  frame.log = [
    {
      id: 'h',
      day: 1,
      minute: 600,
      clock: '10:00',
      kind: 'act',
      who: 'halil',
      text: 'I talk with Hacer at the door, because I feel like it.',
      decisionId: 'd1',
    },
  ];
  frame.options = [
    { id: 'talk:hacer', label: 'talk with Hacer at the door', rank: 1, leaning: true },
    { id: 'call:selin', label: 'call Selin', rank: 2, leaning: false },
  ];
  const props = {
    frame,
    telegraph: null as {
      draft: Draft;
      telegraph: { tone: 'yes'; text: string; says: string; reason: string };
    } | null,
    whyOpen: false,
    selected: null,
    onWhy: vi.fn(),
    onRetainWhy: vi.fn(),
    onPredict: vi.fn(),
    onSuggest: vi.fn(),
    onSayNothing: vi.fn(),
    onWithdraw: vi.fn(),
    onPause: vi.fn(),
    onSceneWord: vi.fn(),
    onReading: vi.fn(),
  };
  const update = () => {
    props.frame.log = [...props.frame.log];
    flushSync(() => root.render(createElement(SceneDay, props)));
  };
  update();
  cleanups.push(() => {
    root.unmount();
    el.remove();
  });
  return { el, props, update };
}
function click(el: Element, selector: string) {
  flushSync(() => {
    const b = el.querySelector<HTMLButtonElement>(selector);
    if (!b) throw Error(selector);
    b.click();
  });
}

it('leads with a named exchange and keeps routine and full composer closed', () => {
  const { el } = mount();
  expect(el.querySelector('.v-scene-stage')?.textContent).toContain('Hacer');
  expect(el.querySelectorAll('.v-scene-stage .v-exchange-line').length).toBeGreaterThanOrEqual(4);
  expect(el.querySelector('details')?.open).toBe(false);
  expect(el.querySelector('.v-composer')).toBeNull();
  expect(el.querySelector('.v-scene-more')?.textContent).toBe('Say something else…');
});
it('speaks a quick line in one tap through the existing mention path', () => {
  const { el, props } = mount();
  const words = el.querySelector('.v-scene-choice')?.textContent;
  click(el, '.v-scene-choice');
  expect(props.onSuggest).toHaveBeenCalledWith(
    { optionId: expect.any(String), strength: 'mention', insist: false },
    words,
  );
  expect(el.querySelector('.v-scene-send')).toBeNull();
  expect(el.querySelector('.v-scene-likely')).toBeNull();
});
it('silence resumes without creating a suggestion and busy scenes have no send controls', () => {
  const { el, props, update } = mount();
  click(el, '.v-scene-silence');
  expect(props.onSayNothing).toHaveBeenCalledOnce();
  expect(props.onSuggest).not.toHaveBeenCalled();
  props.frame.composer = { open: false };
  update();
  expect(el.querySelector('.v-scene-send')).toBeNull();
  expect(el.querySelector('.v-scene-choice')).toBeNull();
});
it('opens the optional full composer and returns to the same scene', () => {
  const { el } = mount();
  click(el, '.v-scene-more');
  expect(el.querySelector('.v-composer')).toBeNull();
  expect(el.querySelectorAll('.v-scene-word')).toHaveLength(2);
  click(el, '.v-scene-plan');
  expect(el.querySelector('.v-composer')).not.toBeNull();
  click(el, '.v-scene-editor-close');
  expect(el.querySelector('.v-composer')).toBeNull();
  expect(el.querySelector('.v-scene-stage')?.textContent).toContain('Hacer');
});
it('preserves the current reply and keeps the original player words in the timeline', () => {
  const { el, props, update } = mount();
  props.frame.standing = undefined;
  props.frame.log.push(
    {
      id: 'you',
      day: 1,
      minute: 600,
      clock: '10:00',
      kind: 'you',
      who: 'you',
      text: 'You: mention · call Selin',
    },
    {
      id: 'answer',
      day: 1,
      minute: 600,
      clock: '10:00',
      kind: 'answer',
      who: 'halil',
      text: 'Not now. After I rest at home.',
      tone: 'notNow',
    },
  );
  update();
  expect(el.querySelector('.v-routine')?.textContent).toContain('You: mention · call Selin');
  expect(el.querySelector('.v-scene-answer')?.textContent).toContain('Not now. After I rest at home.');
});

it('keeps running scenes compact and opens inline words without pausing', () => {
  const { el, props, update } = mount(false);
  props.frame.paused = false;
  update();
  expect(el.querySelector('.v-scene-choice')).toBeNull();
  click(el, '.v-scene-speak');
  expect(props.onPause).not.toHaveBeenCalled();
  expect(el.querySelector('.v-scene-choice')).not.toBeNull();
  click(el, '.v-scene-silence');
  expect(el.querySelector('.v-scene-choice')).toBeNull();
  expect(el.querySelector('.v-scene-speak')).not.toBeNull();
});
it('leaves routine decisions compact even while paused, with silence costing no input', () => {
  const { el, props, update } = mount();
  props.frame.log = [];
  props.frame.paused = true;
  props.frame.prefill = undefined;
  update();
  expect(el.querySelector('.v-scene-choice')).toBeNull();
  expect(el.querySelector('.v-scene-speak')).not.toBeNull();
  expect(props.onSayNothing).not.toHaveBeenCalled();
});
it('moves unrelated earlier answers into the timeline without a second panel beside the scene', () => {
  const { el, props, update } = mount();
  props.frame.log.unshift(
    {
      id: 'y',
      day: 1,
      minute: 590,
      clock: '09:50',
      kind: 'you',
      who: 'you',
      text: 'You: mention · eat at home',
    },
    { id: 'a', day: 1, minute: 590, clock: '09:50', kind: 'answer', who: 'halil', text: 'Fine.' },
  );
  update();
  expect(el.querySelector<HTMLDetailsElement>('.v-held-words')?.open).toBe(false);
  expect(el.querySelector('.v-earlier-reply')).toBeNull();
  expect(el.querySelector('.v-routine')?.textContent).toContain('Fine.');
  expect(el.querySelector('.v-scene-reading > .v-scene-answer')).toBeNull();
});

it('Back in the full composer keeps Enter and Escape cannot send a draft', () => {
  const { el, props } = mount();
  click(el, '.v-scene-more');
  click(el, '.v-scene-plan');
  const back = el.querySelector<HTMLButtonElement>('.v-scene-editor-close');
  back?.focus();
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  back?.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  expect(props.onSuggest).not.toHaveBeenCalled();
  click(el, '.v-scene-editor-close');
  expect(document.activeElement).toBe(el.querySelector('.v-scene-plan'));
});

it('keeps a known likely encounter beside sleep, including tomorrow after evening', () => {
  const { el, props, update } = mount();
  props.frame.log = [];
  props.frame.halil.asleep = true;
  props.frame.composer = { open: false };
  update();
  expect(el.querySelector('.v-between-scenes')?.textContent).toContain('Halil is asleep.');
  expect(el.querySelector('.v-next-encounter')?.textContent).toBe('Selin usually calls this evening.');
  props.frame.minute = 22 * 60;
  update();
  expect(el.querySelector('.v-next-encounter')?.textContent).toBe('Selin usually calls tomorrow evening.');
  props.frame.day = 31;
  update();
  expect(el.querySelector('.v-next-encounter')).toBeNull();
});
it('shows the spoken choices after the scene in a secondary participation region', () => {
  const { el } = mount();
  expect(el.querySelector('.v-scene-choice')?.textContent).toBe('Hacer is here. Stay and talk.');
  const reading = el.querySelector('.v-scene-reading');
  const controls = el.querySelector('.v-scene-participate');
  if (!reading || !controls) throw new Error('Missing scene or reply controls');
  expect(reading.compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('keeps a sent quick line visible beside the actual answer', () => {
  const { el, props, update } = mount();
  props.frame.sceneWords = [
    {
      beat: '1:scene:h:h',
      kind: 'suggestion',
      day: 1,
      minute: 600,
      clock: '10:00',
      words: 'Call Selin tonight.',
      answer: '',
    },
  ];
  update();
  expect(el.querySelector('.v-spoken-lines')?.textContent).toContain('Call Selin tonight.');
});
it('puts a consequential offer and its reason in the panel that stops for it', () => {
  const { el, props, update } = mount();
  props.frame.log = [];
  props.frame.prefill = {
    optionId: 'pay-rent',
    strength: 'mention',
    source: 'end',
    why: 'Osman wants 300 by Ramadan 15.',
  };
  props.frame.options.push({ id: 'pay-rent', label: 'pay Osman the rent', rank: 3, leaning: false });
  update();
  expect(el.querySelector('.v-scene-choice')?.textContent).toContain('pay Osman');
  expect(el.querySelector('.v-scene-offer')?.textContent).toContain('Monday 25 March');
  click(el, '.v-scene-choice');
  expect(props.onSuggest).toHaveBeenLastCalledWith(
    {
      optionId: 'pay-rent',
      strength: 'mention',
      insist: false,
    },
    'Go and pay Osman the rent.',
  );
});

it('reveals a bounded continuation locally without sending words or moving the clock', () => {
  const { el, props, update } = mount();
  const before = JSON.stringify(props.frame);
  click(el, '.v-conversation-listen');
  expect(el.querySelector('.v-scene-stage .v-exchange')?.textContent).toContain(
    'I am glad I opened the door',
  );
  expect(el.querySelectorAll('.v-scene-stage .v-exchange-line')).toHaveLength(2);
  click(el, '.v-conversation-listen');
  expect(el.querySelectorAll('.v-scene-stage .v-exchange-line')).toHaveLength(4);
  expect(el.querySelector('.v-conversation-listen')).toBeNull();
  expect(props.onSuggest).not.toHaveBeenCalled();
  expect(props.onSayNothing).not.toHaveBeenCalled();
  expect(JSON.stringify(props.frame)).toBe(before);
  expect(el.querySelector('.v-scene-choice')).not.toBeNull();
  props.frame.log = [
    {
      ...props.frame.log[0],
      id: 'second',
      text: 'I talk with Hacer at the door.',
      kind: 'act',
      who: 'halil',
      day: 1,
      minute: 610,
      clock: '10:10',
    },
  ];
  props.frame.minute = 610;
  update();
  expect(el.querySelector('.v-conversation-listen')).not.toBeNull();
});
it('speaks an accepted stay and a refusal inside the exchange, retaining raw receipts in Timeline', () => {
  const { el, props, update } = mount();
  props.frame.log.push(
    {
      id: 'y',
      day: 1,
      minute: 600,
      clock: '10:00',
      kind: 'you',
      who: 'you',
      text: 'You: mention · talk with Hacer at the door',
    },
    {
      id: 'yes',
      day: 1,
      minute: 600,
      clock: '10:00',
      kind: 'answer',
      who: 'halil',
      text: '“Alright, I’ll do it.”',
      tone: 'yes',
    },
  );
  update();
  expect(el.querySelector('.v-scene-stage .v-exchange')?.textContent).toContain(
    'I am glad I opened the door',
  );
  expect(el.querySelector('.v-scene-answer')).toBeNull();
  expect(el.querySelector('.v-routine')?.textContent).toContain('Alright, I’ll do it.');
  click(el, '.v-conversation-listen');
  expect(el.querySelectorAll('.v-scene-stage .v-exchange-line')).toHaveLength(4);
  expect(el.querySelector('.v-conversation-listen')).toBeNull();
  const refusal = props.frame.log.at(-1);
  if (!refusal) throw new Error('Missing answer');
  refusal.id = 'no';
  refusal.tone = 'willNot';
  refusal.text = '“No. Leave it.”';
  update();
  expect(el.querySelector('.v-scene-stage .v-exchange')?.textContent).toBe('Halil: “No. Leave it.”');
  expect(el.querySelector('.v-conversation-listen')).toBeNull();
});
it('keeps the actual competing end beside the scene continuation', () => {
  const { el, props, update } = mount();
  for (const optionId of ['work-extra', 'walk']) {
    props.frame.options.push({ id: optionId, label: optionId, rank: 3, leaning: false });
    props.frame.prefill = { optionId, strength: 'mention', source: 'end', why: 'A competing end.' };
    update();
    const buttons = [...el.querySelectorAll('.v-scene-choice')].map((e) => e.textContent);
    expect(buttons).toContain('Hacer is here. Stay and talk.');
    expect(buttons).toContain(
      optionId === 'walk' ? 'Go for a walk by the river.' : 'Take the afternoon shift.',
    );
  }
});

it('holds revealed words through body changes in the same scene and answer occasion', () => {
  const { el, props, update } = mount();
  click(el, '.v-conversation-listen');
  const words = el.querySelector('.v-scene-stage .v-exchange')?.textContent;
  props.frame.halil.felt = [{ id: 'tired', word: 'tired', level: 0.9 }];
  props.frame.minute += 1;
  update();
  expect(el.querySelector('.v-scene-stage .v-exchange')?.textContent).toBe(words);
});

it('offers care or a question while busy, once per beat, without suggesting an action', () => {
  const { el, props, update } = mount();
  props.frame.composer = { open: false, reason: 'busy' };
  update();
  click(el, '.v-scene-word');
  expect(props.onSceneWord).toHaveBeenCalledOnce();
  expect(props.onSuggest).not.toHaveBeenCalled();
  expect(el.querySelector('.v-scene-word')).toBeNull();
  expect(el.querySelector('.v-scene-choice')).toBeNull();
});
it('offers no scene speech when asleep or muted', () => {
  const { el, props, update } = mount();
  props.frame.composer = { open: false };
  props.frame.halil.asleep = true;
  update();
  expect(el.querySelector('.v-scene-word')).toBeNull();
  props.frame.halil.asleep = false;
  props.frame.muted = true;
  update();
  expect(el.querySelector('.v-scene-word')).toBeNull();
});

it('ends quick-reply slowdown without reopening the same resolved occasion', () => {
  vi.useFakeTimers();
  try {
    const { el, props, update } = mount();
    click(el, '.v-scene-choice');
    expect(el.querySelector('.v-scene-choice')).toBeNull();
    update();
    expect(el.querySelector('.v-scene-choice')).toBeNull();
    flushSync(() => vi.advanceTimersByTime(6500));
    expect(props.onReading).toHaveBeenLastCalledWith(false);
  } finally {
    vi.useRealTimers();
  }
});
