import { expect, test } from 'vitest';
import { curiosityOwner } from '../src/curiosity/curiosity.ts';
import { DEFAULT_NEEDS, needsOwner } from '../src/needs/needs.ts';
import { activity, frame, life, offer, outcome, traits } from './w2-fixture.ts';

test('falling error rewards competence/leisure through a needs receipt; urgent survival closes reward', () => {
  const c = frame(),
    act = activity(offer('explore')),
    expected = { key: 'explore', needs: {}, successRate: 1, samples: 10, valence: 1 };
  const before = { needs: [{ id: 'food' as const, level: 1, urgency: 0 }], traits, life, fear: 0 };
  const first = curiosityOwner.learn(
    { errors: [], recent: [] },
    { activity: act, outcome: outcome(act), expected },
    { ...c, before, felt: -1 },
  ).state;
  const learned = curiosityOwner.learn(
    first,
    { activity: act, outcome: outcome(act, { evidenceId: 'second' }), expected },
    { ...c, before, felt: 1 },
  );
  expect(learned.needReward?.competence).toBeGreaterThan(0);
  expect(learned.needReward?.competence).toBeLessThanOrEqual(0.015);
  const urgent = curiosityOwner.learn(
    first,
    { activity: act, outcome: outcome(act), expected },
    { ...c, before: { ...before, needs: [{ id: 'food', level: 0, urgency: 1 }] }, felt: 1 },
  );
  expect(urgent.needReward).toBeNull();
  expect(urgent.state.errors).toEqual(learned.state.errors);
  if (!learned.needReward) throw new Error('Missing learned reward');
  const needs = needsOwner.receive(DEFAULT_NEEDS, learned.needReward, {
    ...c,
    continuation: { anchor: { at: 0, conditionId: 'before' }, state: { ...DEFAULT_NEEDS } },
  }).state;
  expect(needs.competence).toBeGreaterThan(DEFAULT_NEEDS.competence);
  expect(needs.leisure).toBeGreaterThan(DEFAULT_NEEDS.leisure);
});
