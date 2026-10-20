// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import type { Draft } from '../protocol.ts';
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
    leaning: undefined,
    muted: false,
    doingLabel: undefined,
    telegraph: {
      draft,
      telegraph: { text: 'He would agree.', says: 'Yes.', reason: 'rest', tone: 'yes' as const },
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
  click(el, '.v-composer-peek');
  const body = el.querySelector('.v-composer-body');
  expect(body?.querySelector(':scope > .v-composer-scroll .v-options')).not.toBeNull();
  expect(body?.querySelector(':scope > .v-commit .v-telegraph')).not.toBeNull();
  expect(body?.querySelector(':scope > .v-commit .v-btn-primary')?.textContent).toBe('Say it Enter');
  expect(body?.querySelector(':scope > .v-commit .v-btn-quiet')?.textContent).toBe('Say nothing Esc');
});

it('retains control labels and reserved insist space while editing reasons and strength', () => {
  const { el } = mount();
  const initialPrefill = el.querySelector('.v-prefill')?.textContent;
  expect(el.querySelector('.v-insist-price')?.getAttribute('aria-hidden')).toBe('true');
  click(el, '.v-insist');
  expect(el.querySelector('.v-insist-price')?.getAttribute('aria-hidden')).toBe('false');
  click(el, '.v-appeals button');
  expect(el.querySelector('.v-btn-primary')?.textContent).toBe('Say it Enter');
  expect(el.querySelector('.v-prefill')?.textContent).toBe(initialPrefill);
});

it('requests the chosen action and reason, then replaces the pending reply with their prediction', () => {
  const { el, props, update, onPredict } = mount();
  click(el, '.v-appeals button');
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
  click(el, '.v-appeals button');
  expect(summary()?.querySelector('.v-draft-action')?.textContent).toBe('rest at home');
  expect(summary()?.querySelector('.v-draft-how')?.textContent).toBe('Urge · Insist · it’s your duty');
  expect(el.querySelector('.v-preview .v-telegraph')).not.toBeNull();
  expect(el.querySelector('.v-btn-primary')?.textContent).toBe('Say it Enter');
});
