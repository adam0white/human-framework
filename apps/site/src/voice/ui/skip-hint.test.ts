import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { sampleBetweenSkip } from '../sim/fixtures.ts';
import { Between } from './Between.tsx';

test('the shift hint warns that the selected duty reason can still be refused', () => {
  const html = renderToStaticMarkup(
    createElement(Between, {
      view: {
        ...sampleBetweenSkip,
        choices: [
          {
            id: 'extra',
            label: 'Take an afternoon shift',
            cost: '',
            hint: 'Morning work alone would leave him with about 280 by Ramadan 15; Osman wants 300. He does not expect to earn that pay, so a gentle suggestion is not enough. Remind him of his promise (“it’s your duty”), or choose Urge.',
          },
        ],
      },
      onAdvance() {},
    }),
  );
  expect(html).toContain('Mention with “it’s your duty” may still be refused.');
  expect(html).toContain('Choose Urge for stronger advice; he may object.');
  expect(html).not.toContain('Remind him of his promise');
});
