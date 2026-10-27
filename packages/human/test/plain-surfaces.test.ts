import { expect, it } from 'vitest';
import { labelLine, reasonLine, renderProjection } from '../src/narrate/literal.ts';

it('explains known prayer tokens and bodily refusal without rewriting authored labels', () => {
  expect(labelLine('Fajr')).toBe('the dawn prayer');
  expect(labelLine('my evening call')).toBe('my evening call');
  expect(reasonLine('need:bladder')).toBe('I need to use the toilet first.');
  expect(reasonLine('unknown')).toBe('');
});
it('forecast wording keeps host span labels and leaves data detached', () => {
  const spans = [{ label: 'the climb home', fatigue: 0.9, sleepiness: 0.2, hunger: 0.1, thirst: 0.2 }],
    before = JSON.stringify(spans);
  expect(renderProjection({ kind: 'forecast', spans })).toContain(
    'During the climb home, I expect to feel very tired.',
  );
  expect(JSON.stringify(spans)).toBe(before);
});
