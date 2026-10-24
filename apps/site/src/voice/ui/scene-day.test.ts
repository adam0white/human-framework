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
  vi.useRealTimers();
});
function mount(initialPaused = true) {
  vi.useFakeTimers();
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
    speakRequest: 0,
    onSpeakAvailability: vi.fn(),
    onSpeakingChange: vi.fn(),
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
  const update = (settle = true) => {
    props.frame = structuredClone(props.frame);
    flushSync(() => root.render(createElement(SceneDay, props)));
    if (settle) flushSync(() => vi.advanceTimersByTime(600));
    // Worker frames are immutable snapshots; keep the editable test input separate.
    props.frame = structuredClone(props.frame);
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
  expect(el.querySelector('.v-routine')).toBeNull();
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
  expect(props.frame.log.at(-2)?.text).toContain('You: mention · call Selin');
  expect(el.querySelector('.v-scene-answer')?.textContent).toContain('Not now. After I rest at home.');
});

it('keeps running scenes compact and opens inline words without pausing', () => {
  const { el, props, update } = mount(false);
  props.frame.paused = false;
  update();
  expect(el.querySelector('.v-scene-choice')).toBeNull();
  props.speakRequest += 1;
  update();
  expect(props.onPause).not.toHaveBeenCalled();
  expect(el.querySelector('.v-scene-choice')).not.toBeNull();
  click(el, '.v-scene-silence');
  expect(el.querySelector('.v-scene-choice')).toBeNull();
  expect(props.onSpeakAvailability).toHaveBeenLastCalledWith(true, expect.any(String));
});
it('leaves routine decisions compact even while paused, with silence costing no input', () => {
  const { el, props, update } = mount();
  props.frame.log = [];
  props.frame.paused = true;
  props.frame.prefill = undefined;
  update();
  expect(el.querySelector('.v-scene-choice')).toBeNull();
  expect(props.onSpeakAvailability).toHaveBeenLastCalledWith(true, expect.any(String));
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
  expect(el.querySelector('.v-held-words details')).toBeNull();
  expect(el.querySelector('.v-earlier-reply')).toBeNull();
  expect(props.frame.log.some((line) => line.text === 'Fine.')).toBe(true);
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
  expect(props.frame.log.at(-1)?.text).toContain('Alright, I’ll do it.');
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

it('keeps a personal reply through later activities and statuses until the player leaves it', () => {
  vi.useFakeTimers();
  try {
    const { el, props, update } = mount(false);
    props.frame.sceneWords = [
      {
        beat: 'personal',
        kind: 'care',
        day: 1,
        minute: 600,
        clock: '10:00',
        words: 'You can miss her.',
        answer: 'I miss sitting across from her. That is what keeps coming back.',
      },
    ];
    update();
    flushSync(() => vi.advanceTimersByTime(60_000));
    props.frame.minute = 700;
    props.frame.clock = '11:40';
    props.frame.log = [
      {
        id: 'later',
        day: 1,
        minute: 700,
        clock: '11:40',
        kind: 'act',
        who: 'halil',
        text: 'I rest at home.',
      },
    ];
    props.frame.halil.doing = { label: 'rest at home', intention: 'rest', until: '12:00' };
    update();
    expect(el.querySelector('.v-scene-reading')?.textContent).toContain('I miss sitting across from her.');
    expect(el.querySelector('.v-scene-reading')?.textContent).not.toContain(
      'Halil chose to rest at home, until 12:00.',
    );
    click(el, '.v-personal-leave');
    expect(el.querySelector('.v-spoken-lines')).toBeNull();
    expect(el.querySelector('.v-between-scenes')?.textContent).toContain(
      'Halil chose to rest at home, until 12:00.',
    );
  } finally {
    vi.useRealTimers();
  }
});

it('dismisses a personal reply immediately during its slowed reading period', () => {
  const { el, props, update } = mount(false);
  props.speakRequest += 1;
  update();
  click(el, '.v-scene-more');
  click(el, '.v-scene-word');
  props.frame.sceneWords = [
    {
      beat: 'personal',
      kind: 'care',
      day: 1,
      minute: 600,
      clock: '10:00',
      words: 'You can miss her.',
      answer: 'I miss Nuran.',
    },
  ];
  update();
  expect(el.querySelector('.v-personal-reply')).not.toBeNull();
  click(el, '.v-personal-leave');
  expect(el.querySelector('.v-spoken-lines')).toBeNull();
});

it('retains the company that planning interrupted when later activities arrive', () => {
  const { el, props, update } = mount();
  click(el, '.v-scene-more');
  click(el, '.v-scene-plan');
  expect(el.querySelector('.v-planning-context')?.textContent).toContain('Halil and Hacer');
  props.frame.log = [
    { id: 'rest', day: 1, minute: 620, clock: '10:20', kind: 'act', who: 'halil', text: 'I rest at home.' },
  ];
  props.frame.minute = 620;
  update();
  expect(el.querySelector('.v-planning-context')?.textContent).toContain('Halil and Hacer');
  expect(el.querySelector('.v-planning-context')?.textContent).toContain('At his door');
});

it('lets time pass during automatic slowdown even when the call is busy and all care is exhausted', () => {
  const { el, props, update } = mount(false);
  Object.assign(props, { sceneReading: true });
  props.frame.composer = { open: false, reason: 'busy' };
  props.frame.halil.doing = { label: 'call Selin', intention: 'company', until: '10:20' };
  props.frame.log = [
    { id: 'call', day: 1, minute: 600, clock: '10:00', kind: 'act', who: 'halil', text: 'I call Selin.' },
  ];
  props.frame.sceneWords = [
    {
      beat: 'earlier',
      kind: 'care',
      day: 0,
      minute: 600,
      clock: '10:00',
      words: 'It is good to hear Selin with you.',
      answer: 'We need not fill every silence.',
    },
  ];
  update();
  expect(props.onSpeakAvailability).toHaveBeenLastCalledWith(false, expect.any(String));
  expect(el.querySelector('.v-speaking-sheet')).toBeNull();
});

function pointer(el: Element, type: string, id = 1) {
  flushSync(() => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: id })));
}

it('keeps suggestion order and scene height through a pointer gesture and sends the rendered identity', () => {
  const { el, props, update } = mount();
  const target = el.querySelector('.v-scene-choice');
  if (!target) throw Error('No suggestion');
  const words = target.textContent;
  const scene = el.querySelector('.v-scene-reading')?.textContent;
  const labels = [...el.querySelectorAll('.v-scene-choice')].map((b) => b.textContent);
  pointer(target, 'pointerdown');
  props.frame.log = [
    {
      id: 'river',
      day: 1,
      minute: 610,
      clock: '10:10',
      kind: 'act',
      who: 'halil',
      text: 'I walk by the river.',
    },
  ];
  props.frame.options = [
    { id: 'tea:riza', label: 'tea with Rıza', rank: 1, leaning: true },
    { id: 'talk:hacer', label: 'talk with Hacer', rank: 2, leaning: false },
  ];
  update(false);
  flushSync(() => vi.advanceTimersByTime(2000));
  expect([...el.querySelectorAll('.v-scene-choice')].map((b) => b.textContent)).toEqual(labels);
  expect(el.querySelector('.v-scene-reading')?.textContent).toBe(scene);
  pointer(target, 'pointerup');
  flushSync(() => target.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(props.onSuggest).not.toHaveBeenCalled();
  expect(el.querySelector('.v-spoken-lines[role=status]')?.textContent).toContain(`Unsaid: “${words}”`);
});

it('binds care words and occasion to the rendered line instead of the current kind slot', () => {
  const { el, props, update } = mount();
  click(el, '.v-scene-more');
  const target = el.querySelector('.v-scene-word');
  if (!target) throw Error('No care line');
  const words = target.textContent;
  pointer(target, 'pointerdown');
  props.frame.halil.felt = [{ id: 'tired', word: 'tired', level: 0.9 }];
  update(false);
  expect(target.textContent).toBe(words);
  pointer(target, 'pointerup');
  flushSync(() => target.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(props.onSceneWord).toHaveBeenCalledWith('care', expect.any(String), words);
});

it('keeps fresh content readable for 600 ms and applies the latest frame without another arrival', () => {
  const { el, props, update } = mount();
  props.frame.prefill = { optionId: 'walk', strength: 'mention', source: 'end', why: 'Walk instead.' };
  props.frame.options.push({ id: 'walk', label: 'walk', rank: 3, leaning: false });
  update(false);
  const fresh = [...el.querySelectorAll('.v-scene-choice')].map((b) => b.textContent);
  props.frame.prefill = { optionId: 'work-extra', strength: 'mention', source: 'end', why: 'Work instead.' };
  props.frame.options.push({ id: 'work-extra', label: 'work', rank: 4, leaning: false });
  update(false);
  flushSync(() => vi.advanceTimersByTime(599));
  expect([...el.querySelectorAll('.v-scene-choice')].map((b) => b.textContent)).toEqual(fresh);
  flushSync(() => vi.advanceTimersByTime(1));
  expect(el.querySelector('.v-scene-choice')?.textContent).toBe('Take the afternoon shift.');
});

it('releases a cancelled pointer outside the scene without dispatching speech', () => {
  const { el, props, update } = mount();
  const target = el.querySelector('.v-scene-choice');
  if (!target) throw Error('No suggestion');
  pointer(target, 'pointerdown');
  props.frame.composer = { open: false, reason: 'busy' };
  update(false);
  pointer(window.document.body, 'pointercancel');
  flushSync(() => vi.advanceTimersByTime(600));
  expect(el.querySelector('.v-scene-choice')).toBeNull();
  expect(props.onSuggest).not.toHaveBeenCalled();
});

it('sends the rendered option after same-occasion reordering instead of the new first option', () => {
  const { el, props, update } = mount();
  const target = el.querySelector('.v-scene-choice');
  if (!target) throw Error('No suggestion');
  pointer(target, 'pointerdown');
  props.frame.prefill = { optionId: 'walk', strength: 'mention', source: 'end', why: 'Walk now.' };
  props.frame.options.push({ id: 'walk', label: 'walk', rank: 3, leaning: false });
  update(false);
  pointer(target, 'pointerup');
  flushSync(() => target.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(props.onSuggest).toHaveBeenCalledWith(
    { optionId: 'talk:hacer', strength: 'mention', insist: false },
    'Hacer is here. Stay and talk.',
  );
});

it('keeps a keyboard-activated line intact through keyup and sends its original words', () => {
  const { el, props, update } = mount();
  const target = el.querySelector('.v-scene-choice');
  if (!target) throw Error('No suggestion');
  flushSync(() => target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  props.frame.prefill = { optionId: 'walk', strength: 'mention', source: 'end', why: 'Walk now.' };
  props.frame.options.push({ id: 'walk', label: 'walk', rank: 3, leaning: false });
  update(false);
  flushSync(() => vi.advanceTimersByTime(2000));
  expect(el.querySelector('.v-scene-choice')).toBe(target);
  flushSync(() => target.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true })));
  flushSync(() => target.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(props.onSuggest).toHaveBeenCalledWith(
    { optionId: 'talk:hacer', strength: 'mention', insist: false },
    'Hacer is here. Stay and talk.',
  );
});

it('closes the speaking sheet without resolving its stop and opens it from the shell again', () => {
  const { el, props, update } = mount();
  expect(props.onSpeakingChange).toHaveBeenLastCalledWith(true);
  click(el, '[aria-label="Close speaking sheet"]');
  update();
  expect(el.querySelector('.v-speaking-sheet')).toBeNull();
  expect(props.onSayNothing).not.toHaveBeenCalled();
  expect(props.onSpeakingChange).toHaveBeenLastCalledWith(false);
  props.speakRequest += 1;
  update();
  expect(el.querySelector('.v-speaking-sheet')).not.toBeNull();
  expect(el.querySelector('.v-speaking-actions > .v-scene-silence')).not.toBeNull();
});
