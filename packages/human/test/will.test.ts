import { expect, test } from 'vitest';
import { willOwner } from '../src/will/will.ts';
import { activity, decisionContext, offer, person } from './w2-fixture.ts';

test('argmax remains a real choice distribution and draws no RNG at temperature zero', () => {
  const p = person();
  p.actor.will.temperature = 0;
  const a = offer('a'),
    b = offer('b'),
    c = decisionContext(p, [a, b]);
  c.terms = [
    {
      id: 'a',
      cause: 'input',
      person: 'person',
      at: 0,
      applyPhase: 5,
      from: 'needs',
      to: 'will',
      offerId: 'a',
      term: { source: 'need:food', value: 0.2 },
    },
    {
      id: 'b',
      cause: 'input',
      person: 'person',
      at: 0,
      applyPhase: 5,
      from: 'needs',
      to: 'will',
      offerId: 'b',
      term: { source: 'need:food', value: 0.7 },
    },
  ];
  const before = structuredClone(p);
  const result = willOwner.decide(p.actor.will, c);
  expect(result.decision.chosenAffordanceId).toBe('b');
  expect(result.rng).toEqual(p.cursor);
  expect(p).toEqual(before);
});
test('stochastic choice consumes exactly the one shared actor draw', () => {
  const p = person();
  p.actor.will.temperature = 0.1;
  const c = decisionContext(p, [offer('a'), offer('b')], [{ source: 'need:food', value: 0.5 }]);
  const result = willOwner.decide(p.actor.will, c);
  expect(result.rng.identity.uniformDraws).toBe(p.cursor.identity.uniformDraws + 1);
  expect(willOwner.decide(p.actor.will, structuredClone(c))).toEqual(result);
});

test('reconsideration removes only the current activity inertia', () => {
  const p = person();
  p.actor.will.temperature = 0;
  p.actor.will.switchMargin = 0.2;
  const a = offer('a'),
    b = offer('b');
  p.actor.activity = activity(a);
  const ctx = decisionContext(p, [a, b], [{ source: 'need:food', value: 0.5 }]);
  const first = ctx.terms[0];
  if (!first) throw new Error('Missing term');
  const extra = { ...first, id: 'extra', offerId: 'b', term: { source: 'need:food' as const, value: 0.1 } };
  ctx.terms.push(extra);
  expect(willOwner.decide(p.actor.will, ctx).decision.chosenAffordanceId).toBe('a');
  expect(
    willOwner.decide(p.actor.will, { ...ctx, treatment: 'reconsider' }).decision.chosenAffordanceId,
  ).toBe('b');
});

test('no legal candidate consumes no uniform, including all capacity vetoes', () => {
  const p = person();
  p.actor.will.temperature = 0.1;
  const empty = willOwner.decide(p.actor.will, decisionContext(p, []));
  expect(empty.decision.chosenAffordanceId).toBeNull();
  expect(empty.rng).toEqual(p.cursor);
  const blocked = offer('blocked');
  blocked.demands.effort = 1;
  const context = decisionContext(p, [blocked]);
  context.body.capacity = 0;
  const result = willOwner.decide(p.actor.will, context);
  expect(result.decision.chosenAffordanceId).toBeNull();
  expect(result.rng).toEqual(p.cursor);
});
