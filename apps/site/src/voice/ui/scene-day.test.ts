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
it('preserves the actual reply beside the player words after the suggestion resolves', () => {
  const { el, props, update } = mount();
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
  expect(el.querySelector('.v-scene-answer')?.textContent).toContain('You: mention · call Selin');
  expect(el.querySelector('.v-scene-answer')?.textContent).toContain('Not now. After I rest at home.');
});

it('pauses a new encounter once when suggestions become available, respecting Auto', () => {
  const { props, update } = mount();
  const onScenePause = vi.fn();
  Object.assign(props, { onScenePause });
  props.frame.log[0] = { ...props.frame.log[0]!, id: 'fresh' };
  props.frame.paused = false;
  props.frame.autoPause = true;
  update();
  expect(onScenePause).toHaveBeenCalledOnce();
  update();
  expect(onScenePause).toHaveBeenCalledOnce();
  props.frame.log = [
    {
      id: 'h2',
      day: 1,
      minute: 600,
      clock: '10:00',
      kind: 'act',
      who: 'halil',
      text: 'I talk with Hacer at the door.',
    },
  ];
  props.frame.autoPause = false;
  update();
  expect(onScenePause).toHaveBeenCalledOnce();
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
  expect(
    [
      ...el.querySelectorAll(
        '.v-scene-day > details, .v-scene-day > .v-scene-reading, .v-scene-day > .v-scene-participate',
      ),
    ].map((e) => e.className),
  ).toEqual(['v-routine', 'v-scene-reading', 'v-scene-participate v-scene-participate-secondary']);
});
