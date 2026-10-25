// @vitest-environment happy-dom
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { sampleFrame } from '../sim/fixtures.ts';
import { Composer } from './Composer.tsx';
import { DayLog } from './DayLog.tsx';
import { HalilPane } from './HalilPane.tsx';
import { Intro } from './Intro.tsx';
import { explainTerms, MealTerms } from './terms.tsx';

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
  expect(intro.textContent).toContain('pre-dawn meal');
  expect(intro.textContent).toContain('sunset meal');
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
  expect(day.textContent).toContain('pre-dawn meal');
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
  expect(el.querySelector('.v-option-label')?.textContent).toBe('walk after the sunset meal');
});

it('provides the glossary for information content without a second help trigger in Halil', () => {
  const glossaryContent = render(createElement(MealTerms));
  const halil = render(createElement(HalilPane, { halil: sampleFrame.halil }));
  expect(halil.querySelector('.game-help')).toBeNull();
  for (const el of [glossaryContent]) {
    const glossary = [...el.querySelectorAll('[popover]')].find(
      (details) => details.querySelector('strong')?.textContent === 'Meal terms',
    );
    expect(glossary).toBeDefined();
    expect(glossary?.getAttribute('popover')).toBe('auto');
    expect(glossary?.textContent).toContain('pre-dawn meal');
    expect(glossary?.textContent).toContain('before the fast begins');
    expect(glossary?.textContent).toContain('sunset meal');
    expect(glossary?.textContent).toContain('breaks the fast');
  }
});

it('glosses whole meal names and leaves unrelated words unchanged', () => {
  expect(explainTerms('Suhoor, iftar.')).toBe('Pre-dawn meal, sunset meal.');
  expect(explainTerms('Halil eats at home.')).toBe('Halil eats at home.');
  expect(explainTerms('suhoors')).toBe('suhoors');
});
