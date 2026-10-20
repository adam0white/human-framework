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
function mount() {
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  const frame = structuredClone(sampleFrame);
  frame.day = 1;
  frame.minute = 600;
  frame.clock = '10:00';
  frame.composer = { open: true };
  frame.halil.doing = null;
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
  };
  const update = () => flushSync(() => root.render(createElement(SceneDay, props)));
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
it('previews a plain mention and sends the same draft with no reason', () => {
  const { el, props, update } = mount();
  click(el, '.v-scene-choice');
  const draft = props.onPredict.mock.lastCall?.[0] as Draft;
  expect(draft).toEqual({ optionId: expect.any(String), strength: 'mention', insist: false });
  expect(el.querySelector('.v-scene-likely')?.textContent).toContain('Reading his likely reply');
  props.telegraph = { draft, telegraph: { tone: 'yes', text: 'Likely', says: 'Fine.', reason: 'close' } };
  update();
  expect(el.querySelector('.v-scene-likely')?.textContent).toContain('Fine.');
  click(el, '.v-scene-send');
  expect(props.onSuggest).toHaveBeenCalledWith(draft);
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
  expect(el.querySelector('.v-composer')).not.toBeNull();
  click(el, '.v-scene-editor-close');
  expect(el.querySelector('.v-composer')).toBeNull();
  expect(el.querySelector('.v-scene-stage')?.textContent).toContain('Hacer');
});
it('preserves the actual reply and keeps the player words on request after the suggestion resolves', () => {
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
  expect(el.querySelector('.v-held-words')?.textContent).toContain('You: mention · call Selin');
  expect(el.querySelector('.v-scene-answer')?.textContent).toContain('Not now. After I rest at home.');
});

it('keeps running scenes compact, pauses on Speak, and expands only at a speaking point', () => {
  const { el, props, update } = mount();
  props.frame.paused = false;
  update();
  expect(el.querySelector('.v-scene-choice')).toBeNull();
  click(el, '.v-scene-speak');
  expect(props.onPause).toHaveBeenCalledOnce();
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
it('keeps standing words and earlier answers available without repeating their panels over a scene', () => {
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
  expect(el.querySelector<HTMLDetailsElement>('.v-earlier-reply')?.open).toBe(false);
  expect(el.querySelector('.v-earlier-reply')?.textContent).toContain('Fine.');
  expect(el.querySelector('.v-scene-reading > .v-scene-answer')).toBeNull();
});

it('Back in the full composer keeps Enter and Escape cannot send a draft', () => {
  const { el, props } = mount();
  click(el, '.v-scene-more');
  const back = el.querySelector<HTMLButtonElement>('.v-scene-editor-close');
  back?.focus();
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  back?.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  expect(props.onSuggest).not.toHaveBeenCalled();
  click(el, '.v-scene-editor-close');
  expect(document.activeElement).toBe(el.querySelector('.v-scene-more'));
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

it('gives the predicted reply space by replacing the choices and collapses speech after sending', () => {
  const { el, props, update } = mount();
  click(el, '.v-scene-choice');
  expect(el.querySelector('.v-scene-choice')).toBeNull();
  const draft = props.onPredict.mock.lastCall?.[0] as Draft;
  props.telegraph = { draft, telegraph: { tone: 'yes', text: 'Likely', says: 'Fine.', reason: 'close' } };
  update();
  click(el, '.v-scene-send');
  expect(el.querySelector('.v-scene-choice')).toBeNull();
  expect(el.querySelector('.v-scene-speak')).not.toBeNull();
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
  expect(props.onPredict).toHaveBeenLastCalledWith({
    optionId: 'pay-rent',
    strength: 'mention',
    insist: false,
  });
});
