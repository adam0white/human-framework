import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { sampleFrame } from '../sim/fixtures.ts';
import { HalilPane } from './HalilPane.tsx';
import { PlanningContext, planningContext } from './PlanningContext.tsx';
import { actionPhrase, voiceWords } from './words.ts';

it('uses verbs for noun activities and past tense for completed actions only', () => {
  expect(actionPhrase('tea with Rıza')).toBe('have tea with Rıza');
  expect(
    voiceWords(
      'He completed these after your suggestion: eat at home; see the doctor at the clinic; walk by the river; call Selin; sleep.',
    ),
  ).toBe(
    'After your suggestion, he ate at home, saw the doctor at the clinic, walked by the river, called Selin and slept.',
  );
  expect(voiceWords('He started these after your suggestion but stopped before finishing: sleep.')).toBe(
    'After your suggestion, he started to sleep but stopped before finishing.',
  );
});
it('adds currency to summary and secondary payments without changing dates or counts', () => {
  expect(
    voiceWords(
      'He worked 12 mornings and no afternoon shift and earned 192 (a spoiled job pays less than half); he has 264 (was 72).',
    ),
  ).toContain('192 lira');
  expect(
    voiceWords('He paid 300 on Ramadan 14 and 200 on Ramadan 20; he still owed 100 at Eid. He had 56.'),
  ).toBe(
    'He paid 300 lira on Ramadan 14 and 200 lira on Ramadan 20; he still owed 100 lira at Eid. He had 56 lira.',
  );
  expect(
    voiceWords('In the week after Eid he paid the rest (300) on Shawwal 2; he owes nothing now. He has 40.'),
  ).toContain('the rest (300 lira)');
  expect(voiceWords('He called Selin 2 times.')).toBe('He called Selin 2 times.');
  expect(voiceWords('He has 2 missed fasts to make up.')).toBe('He has 2 missed fasts to make up.');
  expect(voiceWords('He paid 300 lira.')).toBe('He paid 300 lira.');
});
it('projects zero records, remembered meals and repeated suggestion metadata', () => {
  expect(voiceWords('The fast ends at 19:06. He has kept 0 of 1 fasts so far.')).toBe(
    'The fast ends at 19:06. He has not fasted yet.',
  );
  expect(voiceWords('He fasted on 0 of the 2 days so far.')).toBe('He has not fasted yet.');
  expect(voiceWords('He kept 0 of 2 appointments.')).toBe('He has not kept an appointment yet.');
  expect(voiceWords('He remembers: her tea and my cigarette after iftar.')).toBe(
    'He remembers Nuran’s tea and his cigarette after the sunset meal.',
  );
  expect(voiceWords('I was remembering iftar with Nuran at our table, last Ramadan.')).toContain(
    'remembering the sunset meal',
  );
  expect(voiceWords('“see the doctor” (mention, in turn with the other): he did it on 0 of 12 days.')).toBe(
    '“see the doctor”: he has not done it yet.',
  );
});

it('renders the complete activity sentence and numeric money panel', () => {
  const halil = structuredClone(sampleFrame.halil);
  halil.doing = { ...halil.doing!, label: 'tea with Rıza' };
  const source = JSON.stringify(halil);
  const html = renderToStaticMarkup(createElement(HalilPane, { halil }));
  expect(html).toContain('Halil chose to have tea with Rıza.');
  expect(html).toContain('lira available');
  const context = renderToStaticMarkup(
    createElement(PlanningContext, { context: planningContext({ ...sampleFrame, halil }, null) }),
  );
  expect(context).toContain('Halil chose to have tea with Rıza.');
  expect(context.match(/Halil/g)).toHaveLength(1);
  expect(JSON.stringify(halil)).toBe(source);
});
