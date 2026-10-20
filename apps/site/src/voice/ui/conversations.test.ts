// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { LogEntry } from '../protocol.ts';
import { conversationFor } from './conversations.ts';
import { DayLog } from './DayLog.tsx';

const talk: LogEntry = {
  id: 'talk',
  day: 1,
  minute: 2040,
  clock: '10:00',
  kind: 'act',
  who: 'halil',
  text: 'I talk with Hacer at the door, because you asked.',
  until: '10:40',
  decisionId: 'd1',
};
function view(log: LogEntry[]) {
  const el = document.createElement('div');
  el.innerHTML = renderToStaticMarkup(createElement(DayLog, { log, paused: false, onWhy: () => {} }));
  return el;
}
it('renders the stored action and a short spoken Hacer exchange without changing the log', () => {
  const log = [talk, { ...talk, id: 'reply', kind: 'answer' as const, text: 'Talk hacer? “Fine.”' }];
  const before = JSON.stringify(log);
  const el = view(log);
  expect(el.textContent).toContain(talk.text);
  expect(el.textContent).toContain('Talk with Hacer at the door? “Fine.”');
  expect(el.textContent).not.toContain('Talk hacer?');
  const lines = el.querySelectorAll('.v-exchange-line');
  expect(lines.length).toBeGreaterThanOrEqual(2);
  expect(lines.length).toBeLessThanOrEqual(4);
  expect(lines[0]?.textContent).toContain('Halil:');
  expect(lines[1]?.textContent).toContain('Hacer:');
  expect(JSON.stringify(log)).toBe(before);
  expect(view(log).innerHTML).toBe(el.innerHTML);
});
it.each([
  ['I tea with Rıza, to be with someone.', 'Rıza'],
  ['I call Selin, because you asked.', 'Selin'],
])('gives the other social action %s its own two-person exchange', (text, name) => {
  const lines = view([{ ...talk, text }]).querySelectorAll('.v-exchange-line');
  expect(lines.length).toBeGreaterThanOrEqual(2);
  expect([...lines].map((e) => e.textContent).join(' ')).toContain(`${name}:`);
  expect([...lines].map((e) => e.textContent).join(' ')).toContain('Halil:');
});
it('uses only an already surfaced Nuran memory and ignores later events when wording an old exchange', () => {
  const recall: LogEntry = {
    ...talk,
    id: 'memory',
    kind: 'recall',
    minute: 1679,
    text: 'He remembers: iftar with Nuran at our table, last Ramadan.',
  };
  const lines = (log: LogEntry[]) => view(log).querySelector('.v-exchange')?.textContent;
  expect(lines([talk])).not.toContain('Nuran');
  expect(lines([recall, talk])).toContain('Nuran');
  expect(lines([talk, { ...recall, minute: 2100 }])).toBe(lines([talk]));
});
it('keeps non-social actions and refusal answers free of invented exchanges', () => {
  expect(
    view([{ ...talk, text: 'I repair in the workshop, to earn.' }]).querySelector('.v-exchange'),
  ).toBeNull();
  expect(
    view([{ ...talk, kind: 'answer', text: 'Talk hacer? “Not now.”' }]).querySelector('.v-exchange'),
  ).toBeNull();
});

it('does not turn an illness note into an invented request from Selin', () => {
  const illness: LogEntry = {
    ...talk,
    id: 'illness',
    kind: 'note',
    minute: 2000,
    text: 'He has not seen the doctor about it.',
  };
  expect(view([illness, talk]).querySelector('.v-exchange')?.textContent).not.toMatch(/Selin|daughter/);
});

it('uses the felt body only at the recorded minute, never later fatigue for an old act', () => {
  const moment = {
    minute: talk.minute,
    halil: { felt: [{ id: 'hunger' as const, level: 0.8, word: 'hungry' }], onMind: [] },
  };
  expect(conversationFor(talk, [talk], moment)[0]?.words).toContain('hungry');
  expect(conversationFor(talk, [talk], { ...moment, minute: talk.minute + 1 })[0]?.words).not.toContain(
    'hungry',
  );
  expect(
    conversationFor(talk, [talk], {
      ...moment,
      halil: { ...moment.halil, felt: [{ id: 'tired', level: 0.8, word: 'tired' }] },
    })[0]?.words,
  ).toContain('tired');
});
it('keeps a displayed conversation unchanged after earlier context is trimmed from the frame', () => {
  const memory: LogEntry = {
    ...talk,
    id: 'memory',
    kind: 'recall',
    minute: 2000,
    text: 'He remembers: iftar with Nuran at our table, last Ramadan.',
  };
  const el = document.createElement('div');
  const root = createRoot(el);
  const props = { paused: false, onWhy: () => {} };
  try {
    flushSync(() => root.render(createElement(DayLog, { ...props, log: [memory, talk] })));
    const original = el.querySelector('.v-exchange')?.textContent;
    expect(original).toContain('Nuran');
    flushSync(() => root.render(createElement(DayLog, { ...props, log: [talk] })));
    expect(el.querySelector('.v-exchange')?.textContent).toBe(original);
  } finally {
    root.unmount();
  }
});
