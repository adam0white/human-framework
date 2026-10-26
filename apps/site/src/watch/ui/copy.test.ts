import { expect, it } from 'vitest';
import { readWords } from '../sim/moments.ts';
import { watchWords } from './words.ts';

it('keeps prediction uncertainty once and attributes imagined replies', () => {
  expect(watchWords(readWords({ word: 'likely', confidence: 0.2 }))).toBe('The watcher might agree.');
  expect(watchWords(readWords({ word: 'likely', confidence: 0.5 }))).toBe('The watcher will probably agree.');
  expect(watchWords(readWords({ word: "won't", confidence: 0.5, why: '“I’m asleep.”' }))).toBe(
    'The watcher will probably not agree. The watcher may be asleep.',
  );
  expect(watchWords(readWords({ word: 'unsure', confidence: 0.2, why: '“I am tired.”' }))).toBe(
    'The watcher might agree. The Keeper imagines the reply: “I am tired.”',
  );
});

it('keeps an occupied post factual rather than inventing a reply', () => {
  expect(watchWords(readWords({ word: 'unsure', confidence: 1, why: 'someone else stands there now' }))).toBe(
    'Someone else stands there now.',
  );
});
