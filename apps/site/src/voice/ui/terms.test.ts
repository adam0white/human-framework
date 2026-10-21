// @vitest-environment happy-dom
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { sampleFrame } from '../sim/fixtures.ts';
import { Composer } from './Composer.tsx';
import { DayLog } from './DayLog.tsx';
import { HalilPane } from './HalilPane.tsx';
import { Intro } from './Intro.tsx';
import { Premise } from './Premise.tsx';
import { explainTerms } from './terms.tsx';

function render(node: React.ReactNode) {
  const el = document.createElement('div');
  el.innerHTML = renderToStaticMarkup(node);
  return el;
}

it('explains fasting meals in the first displayed introduction and transcript', () => {
  const intro = render(
    createElement(Intro, {
      intro: { label: 'Tonight', lines: ['The drummer comes for suhoor. Walk after iftar.'] },
      eid: false,
      onContinue: () => {},
    }),
  );
  expect(intro.textContent).toContain('suhoor (meal before the fast)');
  expect(intro.textContent).toContain('iftar (meal that breaks the fast)');
  const day = render(
    createElement(DayLog, {
      log: [
        {
          id: 'wake',
          day: 1,
          minute: 240,
          clock: '04:00',
          who: 'halil',
          kind: 'note',
          text: 'The drummer comes for suhoor.',
        },
      ],
      paused: true,
      onWhy: () => {},
    }),
  );
  expect(day.textContent).toContain('suhoor (meal before the fast)');
});

it('explains action labels at the point of choice', () => {
  const el = render(
    createElement(Composer, {
      composer: { open: true },
      prefill: undefined,
      leaning: undefined,
      options: [{ id: 'walk', label: 'walk after iftar', rank: 1, leaning: true }],
      muted: false,
      doingLabel: undefined,
      telegraph: null,
      whyOpen: false,
      onPredict: () => {},
      onSuggest: () => {},
      onSayNothing: () => {},
    }),
  );
  expect(el.querySelector('.v-option-label')?.textContent).toBe(
    'walk after iftar (meal that breaks the fast)',
  );
});

it('keeps the meal meanings available on request before and during play', () => {
  const premise = render(createElement(Premise, { ready: true, onBegin: () => {} }));
  const halil = render(createElement(HalilPane, { halil: sampleFrame.halil }));
  for (const el of [premise, halil]) {
    const glossary = [...el.querySelectorAll('[popover]')].find(
      (details) => details.querySelector('strong')?.textContent === 'Meal terms',
    );
    expect(glossary).toBeDefined();
    expect(glossary?.getAttribute('popover')).toBe('auto');
    expect(glossary?.textContent).toContain('Suhoor');
    expect(glossary?.textContent).toContain('meal before the fast');
    expect(glossary?.textContent).toContain('Iftar');
    expect(glossary?.textContent).toContain('meal that breaks the fast');
  }
});

it('glosses whole meal names and leaves unrelated words unchanged', () => {
  expect(explainTerms('Suhoor, iftar.')).toBe(
    'Suhoor (meal before the fast), iftar (meal that breaks the fast).',
  );
  expect(explainTerms('Halil eats at home.')).toBe('Halil eats at home.');
  expect(explainTerms('suhoors')).toBe('suhoors');
});
