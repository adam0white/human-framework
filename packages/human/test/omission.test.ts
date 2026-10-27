import { expect, test } from 'vitest';
import { willOwner } from '../src/will/will.ts';
import { commitment, decisionContext, held, offer, person } from './w2-fixture.ts';

test('a held closing obligation blocks an option that would miss it while a feasible fulfilling offer remains', () => {
  const p = person();
  p.frame.at = 55 * 60000;
  p.actor.now = p.frame.at;
  p.actor.will.temperature = 0;
  p.actor.conscience.norms = [held('fixture-duty')];
  p.actor.agenda.commitments = [
    commitment('duty', { normId: 'fixture-duty', actions: ['work'], from: 0, until: 60 * 60000 }),
  ];
  const work = offer('work', { durationMs: 5 * 60000 }),
    linger = offer('linger', { durationMs: 20 * 60000 });
  const c = decisionContext(p, [work, linger]);
  c.terms = [
    {
      id: 'linger',
      cause: 'input',
      person: 'person',
      at: p.frame.at,
      applyPhase: 5,
      from: 'needs',
      to: 'will',
      offerId: 'linger',
      term: { source: 'need:leisure', value: 2 },
    },
  ];
  const decision = willOwner.decide(p.actor.will, c).decision;
  expect(decision.chosenAffordanceId).toBe('work');
  expect(decision.considered.find((o) => o.affordanceId === 'linger')?.vetoed?.omission).toBe('duty');
});
