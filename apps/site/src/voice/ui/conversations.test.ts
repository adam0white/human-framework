// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import type { LogEntry } from '../protocol.ts';
import { type ConversationMoment, conversationFor } from './conversations.ts';
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
  const log = [
    talk,
    { ...talk, id: 'reply', kind: 'answer' as const, text: 'Talk with Hacer at the door? “Fine.”' },
  ];
  const before = JSON.stringify(log);
  const el = view(log);
  expect(el.textContent).toContain(talk.text);
  expect(el.textContent).toContain('Talk with Hacer at the door? “Fine.”');
  expect(el.textContent).not.toContain('Talk hacer?');
  const lines = el.querySelectorAll('.v-exchange-line');
  expect(lines).toHaveLength(4);
  expect(lines[0]?.textContent).toContain('Halil:');
  expect(lines[1]?.textContent).toContain('Hacer:');
  expect(JSON.stringify(log)).toBe(before);
  expect(view(log).innerHTML).toBe(el.innerHTML);
});
it.each([
  ['I tea with Rıza, to be with someone.', 'Rıza'],
  ['I call Selin, because you asked.', 'Selin'],
])('gives the other social action %s its own two-person exchange', (text, name) => {
  const lines = view([
    {
      ...talk,
      text,
      ...(name === 'Selin' ? { connection: { minute: talk.minute, clock: talk.clock } } : {}),
    },
  ]).querySelectorAll('.v-exchange-line');
  expect(lines).toHaveLength(4);
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
    view([{ ...talk, kind: 'answer', text: 'Talk with Hacer at the door? “Not now.”' }]).querySelector(
      '.v-exchange',
    ),
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
    halil: { felt: [{ id: 'hunger' as const, level: 'high', word: 'hungry' }], onMind: [] },
  };
  expect(conversationFor(talk, [talk], moment)[0]?.words).toContain('hungry');
  expect(conversationFor(talk, [talk], { ...moment, minute: talk.minute + 1 })[0]?.words).not.toContain(
    'hungry',
  );
  expect(
    conversationFor(talk, [talk], {
      ...moment,
      halil: { ...moment.halil, felt: [{ id: 'tired', level: 'high', word: 'tired' }] },
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

const socialActs = [
  ['Hacer', talk.text],
  ['Rıza', 'I have tea with Rıza, to be with someone.'],
  ['Selin', 'I call Selin, because you asked.'],
] as const;
const contexts: {
  topic: string;
  note?: string;
  who?: LogEntry['who'];
  late?: boolean;
  felt?: 'tired' | 'hunger';
  endings: readonly string[];
}[] = [
  { topic: 'ordinary company', endings: ['leave the door open', 'take that chair', 'Keep me on the phone'] },
  {
    topic: 'evening company',
    late: true,
    endings: ['keep the door open', 'chair closer', 'goodnight yet'],
  },
  {
    topic: 'rent worry',
    note: 'Osman wants the rent.',
    endings: ['amount out loud', 'go through the sums', 'go through the amount'],
  },
  {
    topic: 'Selin’s health concern',
    note: 'Selin asked him to see the doctor.',
    who: 'selin',
    endings: ['Stand here with me', 'chair here beside mine', 'sound brave'],
  },
  {
    topic: 'tiredness',
    felt: 'tired',
    endings: ['stand here with me', 'Keep the chair', 'stay on the phone'],
  },
  {
    topic: 'hunger',
    felt: 'hunger',
    endings: ['plan a supper', 'goes on the plate', 'choose something together'],
  },
  {
    topic: 'surfaced memory',
    note: 'He remembers: iftar with Nuran at our table, last Ramadan.',
    endings: ['sitting with her', 'chair here beside mine', 'that meal with Mum'],
  },
];
it.each(contexts)('finishes $topic with Halil’s answer and each companion’s offer', (context) => {
  socialActs.forEach(([name, text], index) => {
    const minute = context.late ? 2520 : talk.minute;
    const entry = {
      ...talk,
      text,
      minute,
      ...(name === 'Selin' ? { connection: { minute, clock: talk.clock } } : {}),
    };
    const log: LogEntry[] = context.note
      ? [
          {
            ...talk,
            id: 'context',
            minute: entry.minute - 1,
            kind: context.topic === 'surfaced memory' ? 'recall' : 'voice',
            who: context.who ?? 'halil',
            text: context.note,
          },
          entry,
        ]
      : [entry];
    const moment: ConversationMoment = {
      minute: entry.minute,
      halil: {
        felt: context.felt ? [{ id: context.felt, word: context.felt, level: 'high' }] : [],
        onMind: [],
      },
    };
    const lines = conversationFor(entry, log, moment);
    expect(lines.map((line) => line.speaker)).toEqual(['Halil', name, 'Halil', name]);
    expect(lines.every((line) => line.words.length > 0)).toBe(true);
    expect(lines[2]?.words).not.toBe(lines[0]?.words);
    expect(lines[3]?.words).toContain(context.endings[index]);
    expect(conversationFor(entry, log, moment)).toEqual(lines);
  });
});
it('finishes incoming calls without claiming Halil placed them or adding an event', () => {
  const incoming: LogEntry = {
    ...talk,
    id: 'incoming',
    kind: 'voice',
    who: 'selin',
    text: 'Selin called. Eid mubarak, Dad.',
  };
  const lines = conversationFor(incoming, [incoming]);
  expect(lines.map((line) => line.speaker)).toEqual(['Halil', 'Selin', 'Halil', 'Selin']);
  expect(lines[2]?.words).toContain('call me Dad');
  expect(lines.map((line) => line.words).join(' ')).not.toMatch(/I called|I phoned|I rang/);
});
it('reads frozen UI context without RNG and ignores later worries for an old scene', () => {
  const entry = Object.freeze({ ...talk });
  const later = Object.freeze({
    ...talk,
    id: 'later',
    kind: 'voice' as const,
    minute: talk.minute + 1,
    text: 'Osman wants the rent.',
  });
  const log = Object.freeze([entry, later]);
  const moment: ConversationMoment = {
    minute: talk.minute,
    halil: {
      felt: [{ id: 'tired', level: 'high', word: 'tired' }],
      onMind: [],
    },
  };
  Object.freeze(moment.halil.felt[0]);
  Object.freeze(moment.halil.felt);
  Object.freeze(moment.halil.onMind);
  Object.freeze(moment.halil);
  Object.freeze(moment);
  const before = JSON.stringify({ log, moment });
  const rng = vi.spyOn(Math, 'random').mockImplementation(() => {
    throw new Error('Dialogue must not consume RNG');
  });
  try {
    const lines = conversationFor(entry, log, moment);
    expect(lines).toEqual(conversationFor(entry, [entry], moment));
    expect(lines).toHaveLength(4);
    expect(JSON.stringify({ log, moment })).toBe(before);
    expect(rng).not.toHaveBeenCalled();
  } finally {
    rng.mockRestore();
  }
});

it('keeps table-specific admissions tied to a surfaced table memory', () => {
  const recall: LogEntry = {
    ...talk,
    id: 'recall',
    minute: talk.minute - 1,
    kind: 'recall',
    text: 'He remembers: Nuran’s funeral.',
  };
  const generic = conversationFor(talk, [recall, talk]);
  expect(generic[2]?.words).toContain('I miss Nuran today');
  expect(generic.map((line) => line.words).join(' ')).not.toContain('table');
  const table = conversationFor(talk, [
    { ...recall, text: 'He remembers: iftar with Nuran at our table, last Ramadan.' },
    talk,
  ]);
  expect(table[2]?.words).toContain('across the table');
  expect(table[3]?.words).toContain('Keep the door open');
});

it('moves on from an already discussed recall and shortens repeated encounters without inventing events', () => {
  const memory: LogEntry = {
    ...talk,
    id: 'm',
    minute: 1900,
    kind: 'recall',
    text: 'He remembers: Nuran at our table.',
  };
  const again = { ...talk, id: 'again', minute: 2080, clock: '10:40' };
  const third = { ...talk, id: 'third', minute: 2120, clock: '11:20' };
  const log = [memory, talk, again, third];
  const before = JSON.stringify(log);
  expect(conversationFor(talk, log)[0]?.words).toContain('Nuran');
  expect(
    conversationFor(again, log)
      .map((l) => l.words)
      .join(' '),
  ).not.toContain('Nuran');
  expect(conversationFor(third, log)).toEqual([
    { speaker: 'Scene', words: 'Halil talks with Hacer again. They last spoke on day 1 at 10:40.' },
  ]);
  expect(JSON.stringify(log)).toBe(before);
});
it('does not use a recall or encounter recorded after the anchor at the same minute', () => {
  const memory: LogEntry = {
    ...talk,
    id: 'later-memory',
    kind: 'recall',
    text: 'He remembers: Nuran at our table.',
  };
  expect(conversationFor(talk, [talk, memory])).toEqual(conversationFor(talk, [talk]));
});
it('does not restart the same grief exchange when that recall repeats on a later day', () => {
  const memory: LogEntry = {
    ...talk,
    id: 'm1',
    minute: 1900,
    kind: 'recall',
    text: 'He remembers: Nuran at our table.',
  };
  const again = { ...talk, id: 'day2', day: 2, minute: 3480 };
  const repeated = { ...memory, id: 'm2', day: 2, minute: 3479 };
  expect(conversationFor(again, [memory, talk, repeated, again])[0]?.words).not.toContain('Nuran');
  const fresh = { ...repeated, text: 'He remembers: Nuran’s funeral.' };
  expect(conversationFor(again, [memory, talk, fresh, again])[0]?.words).toContain('funeral');
});

it('shows no Selin words for dialing, then refreshes an empty exchange when a connection receipt arrives', () => {
  const entry: LogEntry = { ...talk, id: 'dial', text: 'I call Selin.' };
  const el = document.createElement('div'),
    root = createRoot(el),
    props = { paused: false, onWhy: () => {} };
  try {
    flushSync(() => root.render(createElement(DayLog, { ...props, log: [entry] })));
    expect(el.querySelector('.v-exchange')).toBeNull();
    const connected = { ...entry, connection: { minute: entry.minute + 20, clock: '10:20' } };
    flushSync(() => root.render(createElement(DayLog, { ...props, log: [connected] })));
    expect(el.querySelector('.v-exchange')?.textContent).toContain('Selin:');
  } finally {
    root.unmount();
  }
});
