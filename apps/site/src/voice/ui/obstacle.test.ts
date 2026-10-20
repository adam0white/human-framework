import { expect, it } from 'vitest';
import type { Telegraph } from '../protocol.ts';
import { sampleFrame } from '../sim/fixtures.ts';
import { obstacleWords, predictionContext } from './obstacle.ts';

const rest: Telegraph = {
  tone: 'notNow',
  text: 'Not now — after I rest at home',
  says: 'After I rest at home, then I will.',
  counter: 'after I rest at home',
  reason: 'need:rest',
};

it('names what he wants to do first and uses the supplied reason', () => {
  expect(obstacleWords(rest)).toBe('I want to rest at home first. I need a rest.');
  expect(obstacleWords({ ...rest, reason: 'emotion:grief:rest' })).toBe(
    'I want to rest at home first. I’m grieving.',
  );
});

it('does not infer tiredness from rest or an unfinished shift from workshop wording', () => {
  expect(obstacleWords({ ...rest, reason: 'new-unknown-reason' })).toBe('I want to rest at home first.');
  expect(obstacleWords({ ...rest, counter: 'after I repair in the workshop', reason: 'material' })).toBe(
    'I want to repair in the workshop first. I’m thinking about the money.',
  );
});

it('does not reinterpret a modified action, assent or refusal as a delay', () => {
  expect(obstacleWords({ ...rest, counter: 'pray at home' })).toBeNull();
  expect(obstacleWords({ ...rest, tone: 'yes' })).toBeNull();
  expect(obstacleWords({ ...rest, tone: 'cannot' })).toBeNull();
});

it('refreshes the forecast for time or choice context, but not playback controls alone', () => {
  const key = predictionContext(sampleFrame);
  expect(predictionContext({ ...sampleFrame, paused: !sampleFrame.paused, pace: 'fast' })).toBe(key);
  expect(predictionContext({ ...sampleFrame, minute: sampleFrame.minute + 1 })).not.toBe(key);
  expect(predictionContext({ ...sampleFrame, leaning: { optionId: 'rest', why: 'to rest' } })).not.toBe(key);
});
