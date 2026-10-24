import { expect, it } from 'vitest';
import { watchImpression, watchWords } from './wording.ts';

it('displays complete dialogue without changing the recorded words or adding certainty', () => {
  const recorded = '“Cold. Long. Nothing I couldn’t stand.”';
  expect(watchWords(recorded)).toBe('“The night was long and cold, but I could stand it.”');
  expect(recorded).toBe('“Cold. Long. Nothing I couldn’t stand.”');
  expect(watchImpression('seemed worn out at dusk')).toBe('They looked very tired at dusk.');
  expect(watchImpression('close to Samira')).toBe('They seem close to Samira.');
  expect(watchWords(watchWords(recorded))).toBe(watchWords(recorded));
});
