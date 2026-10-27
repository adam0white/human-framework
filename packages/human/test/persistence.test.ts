import { expect, test } from 'vitest';
import { persistenceOwner, persistenceTerms } from '../src/persistence/persistence.ts';
import { activity, frame, goal, offer, span, traits } from './w2-fixture.ts';

test('pursuit forms from final rounded terms; a close alternative preserves the current goal', () => {
  const c = frame(),
    goals = [goal('one'), goal('two')],
    act = activity(offer('work'));
  const first = persistenceOwner.begin(
    {},
    { ...c, traits, goals, activity: act, terms: [{ source: 'goal:one', value: 0.5 }] },
  ).state;
  expect(first.current?.goalId).toBe('one');
  const second = persistenceOwner.begin(first, {
    ...c,
    traits,
    goals,
    activity: act,
    terms: [
      { source: 'goal:one', value: 0.5 },
      { source: 'goal:two', value: 0.51 },
    ],
  }).state;
  expect(second.current?.goalId).toBe('one');
});
test('stalled projects lose pursuit pull and an expired pursuit releases', () => {
  const c = frame(),
    g = goal('one'),
    state = { current: { goalId: 'one', since: 0, lastServedAt: 0, strength: 0.7 } };
  const terms = [{ source: 'goal:one' as const, value: 0.5 }];
  const before = persistenceTerms(state, terms, {
    at: 0,
    goals: [g],
    needs: [],
    fear: 0,
    defaults: c.effective.builtins.PERSISTENCE_DEFAULTS,
  });
  const after = persistenceTerms(state, terms, {
    at: 180 * 60000,
    goals: [g],
    needs: [],
    fear: 0,
    defaults: c.effective.builtins.PERSISTENCE_DEFAULTS,
  });
  expect(Math.abs(after[0]?.value ?? 0)).toBeLessThan(Math.abs(before[0]?.value ?? 0));
  expect(
    persistenceOwner.advance(state, { ...span(0, 86400000, c.effective), goals: [g], activity: null }).state
      .current,
  ).toBeUndefined();
});
