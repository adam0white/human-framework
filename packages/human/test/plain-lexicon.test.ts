import { expect, test } from 'vitest';
import { EN_LINES, fillTemplate } from '../src/narrate/lexicon.ts';
import { PLAIN_EN_LINES } from '../src/narrate/plain.ts';

test('plain templates preserve selection counts and template slots', () => {
  expect(Object.keys(PLAIN_EN_LINES).sort()).toEqual(Object.keys(EN_LINES).sort());
  const slots = (line: string) => [...line.matchAll(/\{[A-Za-z]+\}/g)].map(([slot]) => slot).sort();
  for (const [key, legacy] of Object.entries(EN_LINES)) {
    const plain = PLAIN_EN_LINES[key];
    expect(plain, key).toHaveLength(legacy.length);
    for (const [index, line] of legacy.entries()) {
      expect(slots(plain?.[index] ?? ''), `${key}[${index}]`).toEqual(slots(line));
    }
  }
});

test('plain replies and reports use complete literal sentences while composition slots stay phrases', () => {
  expect(PLAIN_EN_LINES['voice.complied']?.[1]).toBe('I will do it if you insist, but I would rather not.');
  expect(PLAIN_EN_LINES['decision.commanded']?.[1]).toBe('I am following an order.');
  expect(PLAIN_EN_LINES['chronicle.material.gain']?.[0]).toBe('{Subj} gained {amount}.');
  expect(PLAIN_EN_LINES['normVerb:theft']).toEqual(['steal']);
  expect(PLAIN_EN_LINES['intention.material']).toEqual(['to earn']);
  expect(fillTemplate(PLAIN_EN_LINES['voice.deferred']?.[0] ?? '', { After: 'After lunch' })).toBe(
    'I cannot do it now. After lunch, I will do it.',
  );
});
