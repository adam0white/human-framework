// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import type { LogEntry, WhyView } from '../protocol.ts';
import { DayLog } from './DayLog.tsx';
import { Why } from './Why.tsx';

const cleanups: (() => void)[] = [];
function render(node: React.ReactNode) {
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  const update = (next: React.ReactNode) => flushSync(() => root.render(next));
  update(node);
  cleanups.push(() => {
    root.unmount();
    el.remove();
  });
  return { el, update };
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
const answer: LogEntry = {
  id: 'a',
  day: 1,
  minute: 720,
  clock: '12:00',
  kind: 'answer',
  who: 'halil',
  text: '“After I pray at home, then I will.”',
  tone: 'notNow',
  decisionId: 'd1',
};
const later: LogEntry = {
  ...answer,
  id: 'b',
  decisionId: 'd2',
  clock: '13:55',
  text: '“Not now. After I rest at home.”',
};

it('holds the unread answer and its Why through later answers and log trimming until Latest is chosen', () => {
  let selected = '';
  const props = {
    paused: false,
    onWhy: (id: string) => {
      selected = id;
    },
  };
  const { el, update } = render(createElement(DayLog, { ...props, log: [] }));
  update(createElement(DayLog, { ...props, log: [answer] }));
  update(createElement(DayLog, { ...props, log: [later] }));
  expect(el.textContent).toContain(answer.text);
  expect(el.textContent).not.toContain(later.text);
  flushSync(() => el.querySelector<HTMLButtonElement>('.v-log-answer button')?.click());
  expect(selected).toBe('d1');
  expect(el.textContent).toContain('Reading his answer');
  const latest = el.querySelector<HTMLButtonElement>('.v-log-jump');
  expect(latest).not.toBeNull();
  flushSync(() => latest?.click());
  expect(el.textContent).toContain(later.text);
  expect(el.textContent).not.toContain(answer.text);
});

const why: WhyView = {
  decisionId: 'd1',
  clock: '12:00',
  chosen: 'rest at home',
  voice: { says: 'Not now.', reason: 'grieving' },
  options: [
    {
      label: 'rest at home',
      total: 0.02,
      terms: [
        { label: 'effort', value: -0.01 },
        { label: 'grieving', value: 0.02 },
        { label: 'his understanding: no-smoking-fast', value: -0.015 },
      ],
    },
    { label: 'talk with Hacer', total: -0.01, terms: [{ label: 'grieving', value: -0.02 }] },
  ],
};
it('explains grief and reluctance in his words in strength order with model values only in closed details', () => {
  const { el } = render(createElement(Why, { why, onClose: () => {} }));
  const details = el.querySelector('details');
  expect(details?.open).toBe(false);
  expect(details?.querySelector('summary')?.textContent).toBe('Model numbers');
  expect(details?.textContent).toContain('0.02');
  const ordinary = el.cloneNode(true) as HTMLElement;
  ordinary.querySelector('details')?.remove();
  expect(ordinary.textContent).not.toMatch(/[+−]|\d\.\d|no-smoking-fast|top option|top total/);
  expect(ordinary.querySelector('.v-why-bar, .v-meter, [style*="width"]')).toBeNull();
  const lines = [...ordinary.querySelectorAll('.v-why-pulls li')].map((e) => e.textContent);
  expect(lines[0]).toBe('My grief draws me toward this.');
  expect(lines[1]).toBe('This goes against how I understand my duties.');
  expect(lines[2]).toBe('The effort puts me off.');
  expect(lines[3]).toBe('My grief makes this hard to face.');
});

it('keeps unrecognized model terms out of ordinary character speech', () => {
  const { el } = render(
    createElement(Why, {
      why: {
        ...why,
        voice: { says: 'No.', reason: 'future:raw-id' },
        options: [{ label: 'wait', total: 0, terms: [{ label: 'future:raw-id', value: -0.03 }] }],
      },
      onClose: () => {},
    }),
  );
  const ordinary = el.cloneNode(true) as HTMLElement;
  ordinary.querySelector('details')?.remove();
  expect(ordinary.textContent).not.toContain('future:raw-id');
  expect(ordinary.textContent).toContain('I have other reservations about this.');
});

it('retains concrete refusal limits and known social, meal and need influences', () => {
  const { el } = render(
    createElement(Why, {
      why: {
        ...why,
        voice: { says: 'No.', reason: 'he does not know how' },
        options: [
          {
            label: 'take the shift',
            total: 0,
            terms: [
              { label: 'hunger', value: -0.1 },
              { label: 'for Selin', value: 0.08 },
              { label: 'Osman: 300 by Ramadan 15', value: 0.07 },
              { label: 'suhoor', value: 0.06 },
            ],
          },
        ],
      },
      onClose: () => {},
    }),
  );
  el.querySelector('details')?.remove();
  expect(el.textContent).toContain('I do not know how.');
  expect(el.textContent).toContain('This would leave me hungrier.');
  expect(el.textContent).toContain('I want to do this for Selin.');
  expect(el.textContent).toContain('I want to keep my word to Osman.');
  expect(el.textContent).toContain('I want to make time for my meal.');
});
