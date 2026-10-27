import { expect, test } from 'vitest';
import { normTerms, normVeto } from '../src/conscience/conscience.ts';
import { commitment, held, offer, person } from './w2-fixture.ts';

test('held prohibition distinguishes survival food from prohibited harm; unknown understanding invents no veto', () => {
  const p = person(),
    food = offer('take-food', {
      norms: [{ normId: 'theft', relation: 'violates' }],
      expected: { needs: { food: 0.5 }, followedBy: [], provenance: [] },
    });
  expect(normVeto(p.actor, food, 0)).toBeUndefined();
  p.actor.conscience.norms = [held('theft', 'forbidden', 0.9)];
  expect(normVeto(p.actor, food, 0)?.reason).toBe('norm:theft');
  expect(normVeto(p.actor, food, 0.99)).toBeUndefined();
  const harm = offer('harm', {
    norms: [{ normId: 'harm-others', relation: 'violates' }],
    expected: { needs: { food: 0.5 }, followedBy: [], provenance: [] },
  });
  p.actor.conscience.norms = [held('harm-others', 'forbidden', 0.9)];
  expect(normVeto(p.actor, harm, 0.99)?.reason).toBe('norm:harm-others');
});

test('an answered obligation retains a recommended pull while an open duty keeps its obligatory pull', () => {
  const p = person();
  p.actor.conscience.norms = [held('fixture-duty')];
  const act = offer('work', { norms: [{ normId: 'fixture-duty', relation: 'fulfills' }] });
  p.actor.agenda.commitments = [commitment('duty', { normId: 'fixture-duty' })];
  const pending = normTerms(p.actor, act, { desperation: 0 })[0]?.value ?? 0;
  for (const c of p.actor.agenda.commitments) c.status = 'kept';
  const answered = normTerms(p.actor, act, { desperation: 0 })[0]?.value ?? 0;
  expect(answered).toBeGreaterThan(0);
  expect(answered).toBeLessThan(pending);
});
