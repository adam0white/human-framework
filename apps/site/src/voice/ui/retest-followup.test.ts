// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
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
  minute: 835,
  text: '“Not now. After I rest at home.”',
};

it('holds the unread answer and its Why through background entries and log trimming until Latest is chosen', () => {
  let selected = '';
  const props = {
    paused: false,
    onWhy: (id: string) => {
      selected = id;
    },
  };
  const { el, update } = render(createElement(DayLog, { ...props, log: [] }));
  update(createElement(DayLog, { ...props, log: [answer] }));
  update(createElement(DayLog, { ...props, log: [{ ...later, kind: 'note' }] }));
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

it('updates the reading status and held transcript when a newer answer arrives', () => {
  const props = { paused: false, onWhy: () => {} };
  const { el, update } = render(createElement(DayLog, { ...props, log: [answer] }));
  update(createElement(DayLog, { ...props, log: [answer, later] }));
  expect(el.querySelector('.v-reading')?.textContent).toContain('13:55');
  expect(el.querySelector('.v-reading')?.textContent).not.toContain('12:00');
  expect(el.textContent).toContain(later.text);
});
it('updates the status for a newer task while keeping the unread answer', () => {
  const props = { paused: false, onWhy: () => {} };
  const { el, update } = render(createElement(DayLog, { ...props, log: [answer] }));
  const task: LogEntry = { ...later, kind: 'act', text: 'I repair in the workshop, to earn.' };
  update(createElement(DayLog, { ...props, log: [answer, task] }));
  expect(el.querySelector('.v-reading')).toBeNull();
  expect(el.querySelector('.v-earlier-answer')?.textContent).toContain(task.text);
  expect(el.textContent).toContain(answer.text);
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
        { label: 'his understanding of no-smoking-fast', value: -0.015 },
      ],
    },
    { label: 'talk with Hacer', total: -0.01, terms: [{ label: 'grieving', value: -0.02 }] },
  ],
};
it('explains grief and reluctance in his words and reserves model values for exact lab=1', () => {
  history.replaceState(null, '', '/voice/?lab=0');
  const ordinaryView = render(createElement(Why, { why, onClose: () => {} }));
  expect(ordinaryView.el.querySelector('.v-model-numbers')).toBeNull();
  expect(ordinaryView.el.textContent).not.toContain('0.02');
  history.replaceState(null, '', '/voice/?lab=1');
  const { el } = render(createElement(Why, { why, onClose: () => {} }));
  history.replaceState(null, '', '/voice/');
  const details = el.querySelector('details');
  expect(details?.open).toBe(false);
  expect(details?.querySelector('summary')?.textContent).toBe('Model numbers');
  expect(details?.textContent).toContain('0.02');
  const ordinary = el.cloneNode(true) as HTMLElement;
  ordinary.querySelector('details')?.remove();
  expect(ordinary.textContent).not.toMatch(/[+−]|\d\.\d|no-smoking-fast|top option|top total/);
  expect(ordinary.querySelector('.v-why-bar, .v-meter, [style*="width"]')).toBeNull();
  const lines = [...ordinary.querySelectorAll('.v-why-pulls li')].map((e) => e.textContent);
  expect(lines[0]).toBe('My grief makes me want to do this.');
  expect(lines[1]).toBe('This goes against how I understand my duties.');
  expect(lines[2]).toBe('The effort makes me less willing to do this.');
  expect(lines[3]).toBe('My grief makes this difficult for me.');
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
  expect(ordinary.textContent).toContain('I have other reasons not to do this.');
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
              { label: 'Pay Osman 300 by day 15 of Ramadan', value: 0.07 },
              { label: 'the pre-dawn meal', value: 0.06 },
              { label: 'your suggestions', value: 0.05 },
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
  expect(el.textContent).toContain('I am considering your suggestions.');
});

it('lets a player read a scene without opening Why and keeps Latest in its own flow row', () => {
  let whyId = '';
  const talk: LogEntry = {
    ...answer,
    kind: 'act',
    id: 'talk',
    text: 'I talk with Hacer at the door, because you asked.',
  };
  const { el } = render(
    createElement(DayLog, {
      log: [talk, answer],
      paused: true,
      onWhy: (id) => {
        whyId = id;
      },
    }),
  );
  const scene = el.querySelector<HTMLElement>('.v-log-scene');
  expect(scene).not.toBeNull();
  expect(scene?.querySelector('.v-scene-title')?.textContent).toContain('Halil and Hacer');
  expect(scene?.querySelector('.v-exchange')?.closest('button')).toBeNull();
  flushSync(() => scene?.querySelector<HTMLElement>('.v-exchange')?.click());
  expect(whyId).toBe('');
  flushSync(() => scene?.querySelector<HTMLButtonElement>('.v-scene-why')?.click());
  expect(whyId).toBe('d1');
  expect(el.querySelector('.v-log-controls > .v-log-jump')).not.toBeNull();
});

it('takes Latest to the bottom even when a recent conversation is taller than the log panel', () => {
  const props = { paused: true, onWhy: () => {} };
  const talk: LogEntry = {
    ...answer,
    id: 'talk',
    kind: 'act',
    text: 'I talk with Hacer at the door, because you asked.',
  };
  const { el, update } = render(createElement(DayLog, { ...props, log: [talk, answer] }));
  const scroller = el.querySelector<HTMLElement>('.v-log');
  if (!scroller) throw new Error('Missing scroller');
  Object.defineProperty(scroller, 'scrollHeight', { value: 1500, configurable: true });
  Object.defineProperty(scroller, 'clientHeight', { value: 300 });
  const task: LogEntry = { ...later, kind: 'act', text: 'I rest at home.' };
  update(createElement(DayLog, { ...props, log: [talk, answer, task] }));
  flushSync(() => el.querySelector<HTMLButtonElement>('.v-log-jump')?.click());
  expect(scroller.scrollTop).toBe(1500);
  expect(el.textContent).toContain(task.text);
  Object.defineProperty(scroller, 'scrollHeight', { value: 1600 });
  const note: LogEntry = { ...task, id: 'note-after-latest', kind: 'note', text: 'A later ordinary note.' };
  update(createElement(DayLog, { ...props, log: [talk, answer, task, note] }));
  expect(scroller.scrollTop).toBe(1600);
});

it('does not attach the previous action Why to a craving line', () => {
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  const onWhy = vi.fn();
  flushSync(() =>
    root.render(
      createElement(DayLog, {
        log: [
          {
            id: 'cig',
            day: 1,
            minute: 2040,
            clock: '10:00',
            kind: 'feel',
            who: 'halil',
            text: 'He wants a cigarette.',
            decisionId: 'rest-before',
          },
        ],
        paused: true,
        onWhy,
      }),
    ),
  );
  expect(el.textContent).toContain('He wants a cigarette.');
  expect(el.querySelector('button.v-log-btn')).toBeNull();
  root.unmount();
  el.remove();
});
