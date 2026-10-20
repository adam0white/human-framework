// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { sampleFrame } from '../sim/fixtures.ts';
import { Composer } from './Composer.tsx';
import { planningContext } from './PlanningContext.tsx';
import type { DayScene } from './scenes.ts';

const scene: DayScene = {
  id: 'company',
  kind: 'door',
  place: 'At his door',
  clock: '10:00',
  names: ['Halil', 'Hacer'],
  current: true,
  activity: '',
  lines: [{ speaker: 'Hacer', words: 'Stay a little. There is no hurry.' }],
};
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function mount() {
  const frame = structuredClone(sampleFrame);
  frame.ends = [
    {
      id: 'rent',
      label: 'Pay Osman.',
      status: '240 owed',
      detail: 'Paid 60. Osman wants 300 by Ramadan 15.',
    },
  ];
  const context = planningContext(frame, scene);
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  const onSuggest = vi.fn();
  flushSync(() =>
    root.render(
      createElement(Composer, {
        composer: { open: true },
        muted: false,
        doingLabel: undefined,
        prefill: undefined,
        options: [
          { id: 'work-extra', label: 'take an afternoon shift', rank: 1, leaning: true },
          { id: 'talk:hacer', label: 'talk with Hacer', rank: 2, leaning: false },
        ],
        leaning: undefined,
        telegraph: null,
        whyOpen: false,
        planningContext: context,
        onPredict: vi.fn(),
        onSuggest,
        onSayNothing: vi.fn(),
      }),
    ),
  );
  cleanups.push(() => {
    root.unmount();
    el.remove();
  });
  return { el, onSuggest };
}
function click(el: Element, selector: string) {
  const button = el.querySelector<HTMLButtonElement>(selector);
  if (!button) throw Error(`Missing ${selector}`);
  flushSync(() => button.click());
}

it('keeps the people and the interrupted company outside the scrolling controls', () => {
  const { el } = mount();
  const context = el.querySelector('.v-planning-context');
  expect(context?.textContent).toContain('Halil and Hacer');
  expect(context?.textContent).toContain('Stay a little. There is no hurry.');
  expect(context?.closest('.v-planning-scroll')).toBeNull();
  expect(el.querySelector('.v-planning-scroll .v-options')).not.toBeNull();
  expect(el.querySelector('.v-planning-scroll .v-telegraph')).not.toBeNull();
  const send = el.querySelector('.v-composer-body > .v-say');
  expect(send?.querySelector('.v-btn-primary')).not.toBeNull();
  expect(send?.closest('.v-planning-scroll')).toBeNull();
});

it('retains the recorded rent amount, progress and date for work while company remains visible', () => {
  const { el } = mount();
  click(el, '.v-option');
  const context = el.querySelector('.v-planning-context');
  expect(context?.textContent).toContain('240 owed');
  expect(context?.textContent).toContain('Paid 60');
  expect(context?.textContent).toContain('300 by Ramadan 15 (Monday 25 March)');
  expect(context?.textContent).toContain('Halil and Hacer');
  click(el, '.v-option:nth-child(2)');
  expect(context?.querySelector('.v-planning-rent')).toBeNull();
  expect(context?.textContent).toContain('Stay a little.');
});

it('sends the chosen draft through the normal protocol from the separate commit row', () => {
  const { el, onSuggest } = mount();
  click(el, '.v-option');
  click(el, '.v-composer-body > .v-say .v-btn-primary');
  expect(onSuggest).toHaveBeenCalledExactlyOnceWith({
    optionId: 'work-extra',
    strength: 'mention',
    insist: false,
  });
});

it('does not invent rent or another person when neither is present', () => {
  const context = planningContext({ ends: [], halil: { ...sampleFrame.halil, doing: null } }, null);
  expect(context).toEqual({ people: 'Halil', occasion: 'Halil is deciding what to do.' });
});
