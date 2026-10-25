// @vitest-environment happy-dom

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ColonyGame } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import { activityLabel } from './descriptions.ts';
import { Inspector } from './Inspector.tsx';
import { PersonSheet } from './Layout.tsx';
import { saysIt } from './Pane.tsx';
import { forecastWords, wellWords } from './words.ts';

it('recognizes an existing reason without discarding a different counter-offer', () => {
  expect(saysIt('We have enough food stored. I’ll cook when it runs low.', 'when the store runs low')).toBe(
    true,
  );
  expect(saysIt('There’s no timber to build with.', 'when there’s timber')).toBe(true);
  expect(saysIt('It isn’t prayer time.', 'at the next prayer')).toBe(true);
  expect(saysIt('I need water.', 'after I eat')).toBe(false);
});
it('renders prayer, walking, stopped work and lapsed speech', () => {
  expect(wellWords(activityLabel('Walking to Maryam & Tariq'))).toBe('Walking to Maryam and Tariq’s house.');
  expect(wellWords(activityLabel('Praying evening prayer'))).toBe('Saying the evening prayer.');
  expect(wellWords(activityLabel('Praying Dhuhr'))).toBe('Saying the noon prayer.');
  expect(wellWords('I stopped this task: build the house.')).toBe('I stopped building the house.');
  expect(wellWords('Idris didn’t get to the kitchen today.')).toBe('I didn’t get to the kitchen today.');
  expect(wellWords('Yusuf Usta didn’t get to the kitchen today.')).toBe('I didn’t get to the kitchen today.');
  expect(forecastWords('Can’t: asleep')).toBe('Asleep now.');
  expect(forecastWords('Later: after I finish this task (drink at the well)')).toBe(
    'Later, after I finish drinking at the well.',
  );
});

it('renders actual person-sheet risk, prayer and forecast boundaries once', () => {
  const frame = new ColonyGame(7, createFrameworkHumanSide).frame();
  frame.weather.kind = 'storm';
  frame.human.find((p) => p.id === 'idris')!.label = 'Praying Dhuhr';
  frame.classic.find((p) => p.id === 'idris')!.label = 'Walking to Maryam & Tariq';
  const source = JSON.stringify(frame);
  const noop = () => {};
  const props = {
    frame,
    id: 'idris' as const,
    rush: false,
    insist: false,
    appeal: null,
    appealOpen: false,
    pending: 'field' as const,
    asked: null,
    outline: null,
    forecasts: {
      field: {
        input: { personId: 'idris' as const, placeId: 'field' as const },
        prediction: {
          personId: 'idris' as const,
          action: 'gather-grain' as const,
          kind: 'cannot' as const,
          text: 'Can’t: asleep',
        },
      },
    },
    onBack: noop,
    onRush: noop,
    onInsist: noop,
    onAppeal: noop,
    onAppealOpen: noop,
    onAbout: noop,
    onPlace: noop,
    onHover: noop,
    onConfirm: noop,
    onCancelRisk: noop,
    onCancel: noop,
    onRepeat: noop,
  };
  const html = renderToStaticMarkup(createElement(PersonSheet, props));
  expect(html).toContain('Saying the noon prayer.');
  expect(html).toContain('Maryam and Tariq’s house.');
  expect(html).toContain('can injure Idris.');
  expect(html).toContain('Asleep now.');
  expect(html).not.toMatch(/Dhuhr|Human:|Can’t:/);
  expect(JSON.stringify(frame)).toBe(source);
});

it('names Maryam in the actual Inspector narration and empty-memory line', () => {
  history.replaceState(null, '', '/?lab=1');
  const frame = new ColonyGame(7, createFrameworkHumanSide).frame();
  const why = {
    personId: 'maryam' as const,
    decisionId: 'fixture',
    minute: frame.minute,
    narration: 'player insisted: gather timber.',
    intention: '',
    options: [],
    deltas: [],
    recalled: [],
    trust: frame.human[0]!.trust,
  };
  const html = renderToStaticMarkup(
    createElement(Inspector, { personId: 'maryam', why, frame, onClose: () => {} }),
  );
  expect(html).toContain('Maryam recalled no memories for this decision.');
  expect(html).toContain('You insisted that Maryam gather timber.');
  expect(html).not.toContain('They recalled');
  history.replaceState(null, '', '/');
});
