import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { sampleBetween, sampleFrame } from '../sim/fixtures.ts';
import { Between } from './Between.tsx';
import { EndsList, UnaskedStrip } from './EndsPane.tsx';
import { HalilPane } from './HalilPane.tsx';
import { VoicesPane } from './VoicesPane.tsx';

describe('Halil’s words and independent choices', () => {
  it('shows felt words without numeric feeling marks', () => {
    const html = renderToStaticMarkup(createElement(HalilPane, { halil: sampleFrame.halil }));
    for (const felt of sampleFrame.halil.felt) expect(html).toContain(felt.word);
    expect(html).not.toContain('v-meter');
    expect(html).not.toContain('width:');
    expect(html).not.toContain('opacity:');
    expect(html).not.toContain('role="progressbar"');
  });

  it('states the observed choice without calling it refusal or a missed act', () => {
    const html = renderToStaticMarkup(
      createElement(UnaskedStrip, {
        items: [
          { label: 'see the doctor', state: 'no' },
          { label: 'call Selin', state: 'unknown' },
          { label: 'eat the pre-dawn meal', state: 'yes' },
        ],
      }),
    );
    expect(html).toContain('chose something else');
    expect(html).toContain('no choice observed yet');
    expect(html).toContain('chose it');
    expect(html).not.toContain('<svg');
    expect(html).not.toMatch(/refused|missed/);
  });
});

it('keeps trust and ends in words across player panels', () => {
  const voices = sampleFrame.voices.map((v) => ({
    ...v,
    trust: 0.52,
    history: [{ delta: 0.02, text: '+0.02 the meal went well' }],
  }));
  const voiceHtml = renderToStaticMarkup(createElement(VoicesPane, { voices }));
  expect(voiceHtml).toContain('the meal went well');
  expect(voiceHtml).not.toContain('0.02');
  expect(voiceHtml).not.toContain('0.52');
  expect(voiceHtml).not.toContain('v-meter');
  const betweenHtml = renderToStaticMarkup(
    createElement(Between, {
      view: sampleBetween,
      onAdvance: () => {},
    }),
  );
  expect(betweenHtml).toContain('listens more closely');
  expect(betweenHtml).not.toContain('0.02');
  expect(betweenHtml).not.toContain('0.52');
});

it.each([
  [0.52, 'more closely'],
  [0.48, 'less closely'],
  [0.5, 'about as closely as he did this morning'],
])('states the trust change to %s in words', (to, word) => {
  const html = renderToStaticMarkup(
    createElement(Between, {
      view: {
        ...sampleBetween,
        trust: { from: 0.5, to, events: ['−0.01 being asked again'] },
        lines: ['His trust in you went 0.50 → 0.52.'],
      },
      onAdvance: () => {},
    }),
  );
  expect(html).toContain(word);
  expect(html).toContain('being asked again');
  expect(html.replace(/<[^>]*>/g, '')).not.toMatch(/0\.\d{2}/);
});

it('keeps a trust end in words while retaining counted monetary details', () => {
  const html = renderToStaticMarkup(
    createElement(EndsList, {
      ends: [
        {
          id: 'trust',
          label: 'Does he listen?',
          status: 'some',
          detail: 'Trust 0.50, up 0.02.',
          progress: 0.5,
        },
        { id: 'rent', label: 'Pay Osman', status: '40 in hand', detail: '600 owed', progress: 0.1 },
      ],
    }),
  );
  expect(html).not.toContain('0.50');
  expect(html).not.toContain('v-meter');
  expect(html).toContain('600 lira owed');
});
