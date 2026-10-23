// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import type { Draft, Telegraph } from '../protocol.ts';
import { Composer } from './Composer.tsx';

const cleanups: (() => void)[] = [];
function mount() {
  vi.useFakeTimers();
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  const onPredict = vi.fn();
  const draft: Draft = { optionId: 'rest', strength: 'mention', insist: false };
  const props = {
    composer: { open: true },
    prefill: { ...draft, source: 'end' as const, why: 'He needs rest.' },
    options: [{ id: 'rest', label: 'rest at home', rank: 1, leaning: true }],
    leaning: undefined as { optionId: string; why: string } | undefined,
    muted: false,
    doingLabel: undefined,
    telegraph: {
      draft,
      telegraph: { text: 'He would agree.', says: 'Yes.', reason: 'rest', tone: 'yes' } as Telegraph,
    },
    whyOpen: false,
    onPredict,
    onSuggest: vi.fn(),
    onSayNothing: vi.fn(),
  };
  const update = (next = props) => flushSync(() => root.render(createElement(Composer, next)));
  update();
  cleanups.push(() => {
    root.unmount();
    el.remove();
  });
  return { el, props, update, onPredict };
}
function click(el: Element, selector: string) {
  const button = el.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`Missing ${selector}`);
  flushSync(() => button.click());
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.useRealTimers();
});

it('keeps reply and send controls outside the choices scroller when the sheet opens', () => {
  const { el } = mount();
  expect(el.querySelector('.v-composer-peek')).toBeNull();
  const body = el.querySelector('.v-composer-body');
  expect(body?.querySelector(':scope > .v-composer-scroll .v-options')).not.toBeNull();
  expect(body?.querySelector(':scope > .v-commit .v-telegraph')).not.toBeNull();
  expect(body?.querySelector(':scope > .v-commit .v-btn-primary')?.textContent).toBe('Say it Enter');
  expect(body?.querySelector(':scope > .v-commit .v-btn-quiet')?.textContent).toBe('Say nothing Esc');
});

it('retains control labels and shows the insist price only while insisting while editing reasons and strength', () => {
  const { el } = mount();
  const initialPrefill = el.querySelector('.v-prefill')?.textContent;
  expect(el.querySelector('.v-insist-price')?.hasAttribute('hidden')).toBe(true);
  click(el, '.v-insist');
  expect(el.querySelector('.v-insist-price')?.hasAttribute('hidden')).toBe(false);
  click(el, '.v-appeals button:nth-of-type(2)');
  expect(el.querySelector('.v-btn-primary')?.textContent).toBe('Say it Enter');
  expect(el.querySelector('.v-prefill')?.textContent).toBe(initialPrefill);
});

it('requests the chosen action and reason, then replaces the pending reply with their prediction', () => {
  const { el, props, update, onPredict } = mount();
  click(el, '.v-appeals button:nth-of-type(2)');
  expect(el.querySelector('.v-telegraph')?.textContent).toBe('Updating his likely reply…');
  expect(el.textContent).not.toContain('Pick something');
  vi.advanceTimersByTime(100);
  const requested = onPredict.mock.lastCall?.[0] as Draft;
  expect(requested.optionId).toBe('rest');
  expect(requested.appeal).toBeDefined();
  update({
    ...props,
    telegraph: {
      draft: requested,
      telegraph: { text: 'He would agree because of his duty.', says: 'Yes.', reason: 'duty', tone: 'yes' },
    },
  });
  expect(el.querySelector('.v-telegraph')?.textContent).toContain('He would agree because of his duty.');
});

it('keeps the chosen action, strength and optional reason beside the fixed reply', () => {
  const { el } = mount();
  click(el, '.v-option');
  const summary = () => el.querySelector('.v-commit .v-draft-summary');
  expect(summary()?.querySelector('.v-draft-action')?.textContent).toBe('rest at home');
  expect(summary()?.querySelector('.v-draft-how')?.textContent).toBe('Mention');
  click(el, '.v-how .v-seg button:nth-child(2)');
  click(el, '.v-insist');
  click(el, '.v-appeals button:nth-of-type(2)');
  expect(summary()?.querySelector('.v-draft-action')?.textContent).toBe('rest at home');
  expect(summary()?.querySelector('.v-draft-how')?.textContent).toBe('Urge · Insist · it’s your duty');
  expect(el.querySelector('.v-preview .v-telegraph')).not.toBeNull();
  expect(el.querySelector('.v-btn-primary')?.textContent).toBe('Say it Enter');
});

it('keeps the selected action context and optional reason control beside the reply', () => {
  const { el } = mount();
  click(el, '.v-option');
  const commit = el.querySelector('.v-commit');
  expect(commit?.querySelector('.v-choice-context')?.textContent).toBe('He needs rest.');
  expect(commit?.querySelector('select')).toBeNull();
  expect(commit?.querySelector('.v-appeals button')?.textContent).toBe('No reason');
  const reason = [...el.querySelectorAll<HTMLButtonElement>('.v-appeals button')].find((button) =>
    button.textContent?.includes('your health'),
  );
  if (!reason) throw new Error('Missing reason chip');
  flushSync(() => reason.click());
  expect(commit?.querySelector('.v-draft-how')?.textContent).toContain('your health');
});

it('does not attach the prefilled explanation to another selected action', () => {
  const { el, props, update } = mount();
  update({
    ...props,
    options: [...props.options, { id: 'walk', label: 'walk outside', rank: 2, leaning: false }],
  });
  click(el, '.v-option:nth-child(2)');
  expect(el.querySelector('.v-choice-context')?.textContent).not.toContain('He needs rest.');
  expect(el.querySelector('.v-draft-action')?.textContent).toBe('walk outside');
  expect(el.querySelector('.v-prefill')?.hasAttribute('hidden')).toBe(true);
});

it('leaves Enter on a focused log control to that control instead of sending a draft', () => {
  const { el, props } = mount();
  click(el, '.v-option');
  const button = document.createElement('button');
  const day = document.createElement('section');
  day.className = 'v-day';
  day.append(button);
  document.body.append(day);
  try {
    button.focus();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(props.onSuggest).not.toHaveBeenCalled();
  } finally {
    day.remove();
  }
});

it('shows the current obstacle and its reason together in Halil’s words as a likely reply', () => {
  const { el, props, update } = mount();
  click(el, '.v-option');
  update({
    ...props,
    telegraph: {
      draft: props.telegraph.draft,
      telegraph: {
        tone: 'notNow',
        text: 'Not now — after I rest at home',
        says: 'Not now. After I rest at home.',
        counter: 'after I rest at home',
        reason: 'emotion:grief:rest',
      },
    },
  });
  expect(el.querySelector('.v-telegraph')?.textContent).toBe(
    'Likely reply“I want to rest at home first. I’m grieving.”',
  );
  expect(el.querySelector('.v-telegraph')?.textContent).not.toContain('emotion:');
});

it('names his leaning and its reason above the options', () => {
  const { el, props, update } = mount();
  update({ ...props, leaning: { optionId: 'rest', why: 'the doctor asked him to rest.' } });
  for (const selector of ['.v-leaning']) {
    expect(el.querySelector(selector)?.textContent).toBe(
      'He’s leaning toward rest at home. His reason: the doctor asked him to rest.',
    );
  }
});

it('states when his reason is unknown instead of borrowing the prefilled reason', () => {
  const { el } = mount();
  expect(el.querySelector('.v-leaning')?.textContent).toContain('His reason is not known.');
  expect(el.querySelector('.v-leaning')?.textContent).not.toContain('He needs rest.');
});
