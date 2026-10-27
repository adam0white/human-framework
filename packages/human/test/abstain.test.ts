import { expect, test } from 'vitest';
import { normVeto } from '../src/conscience/conscience.ts';
import { commitment, held, offer, person } from './w2-fixture.ts';

test('firm self abstention refuses an overlapping action and lifts for actual bodily survival', () => {
  const p = person();
  p.actor.agenda.commitments = [
    commitment('self-rule', {
      kind: 'abstain',
      actions: [],
      violatedBy: ['eat'],
      firm: true,
      toId: 'self',
      label: 'my rule',
    }),
  ];
  const eat = offer('eat', { expected: { needs: { food: 0.5 }, followedBy: [], provenance: [] } });
  expect(normVeto(p.actor, eat, 0)?.reason).toBe('rule:my rule');
  expect(normVeto(p.actor, eat, 0.99)).toBeUndefined();
  for (const c of p.actor.agenda.commitments) delete c.firm;
  expect(normVeto(p.actor, eat, 0)).toBeUndefined();
  p.actor.conscience.norms = [held('fixture-fast')];
  p.actor.agenda.commitments = [
    commitment('held-fast', { kind: 'abstain', actions: [], violatedBy: ['eat'], normId: 'fixture-fast' }),
  ];
  expect(normVeto(p.actor, eat, 0)?.reason).toBe('duty:fixture-fast');
});
