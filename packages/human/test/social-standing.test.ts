import { expect, test } from 'vitest';
import { judge, socialOwner } from '../src/social/social.ts';
import { held, percept, person, socialContext } from './w2-fixture.ts';

test('a witness judges under their own held understanding, with no access to private intention', () => {
  const p = person();
  const act = { actorId: 'other', norms: [{ normId: 'fixture-rule', relation: 'violates' as const }] };
  expect(judge(p.actor, act, [], 0).praiseworthiness).toBe(0);
  expect(p.actor.social.relationships).toEqual([]);
  const result = judge(p.actor, act, [held('fixture-rule', 'forbidden', 0.9)], 0);
  expect(result.praiseworthiness).toBeLessThan(0);
  expect(p.actor.social.relationships.find((r) => r.otherId === 'other')?.trust).toBeLessThan(0.5);
});

test('attended outward acts change social judgment and emit attributed affect receipts', () => {
  const p = person();
  p.actor.conscience.norms = [held('fixture-rule', 'forbidden')];
  const result = socialOwner.receive(
    p.actor.social,
    {
      kind: 'attended',
      percept: percept('seen', {
        actorId: 'other',
        targetId: 'person',
        kind: 'harm',
        valence: -0.5,
        norms: [{ normId: 'fixture-rule', relation: 'violates' }],
      }),
    },
    socialContext(p),
  );
  expect(result.state.relationships.find((r) => r.otherId === 'other')?.trust).toBeLessThan(0.5);
  expect(result.effects.appraisals.some((a) => a.appraisal.praiseworthiness !== undefined)).toBe(true);
  expect(p.actor.social.relationships).toEqual([]);
});

test('reputation moves by an actual belief revision rather than recharging retained credence', () => {
  const p = person(),
    ctx = socialContext(p);
  const first = socialOwner.receive(
    p.actor.social,
    { kind: 'reputation', prop: 'other:honest', before: 0.5, credence: 0.9, evidenceId: 'claim' },
    ctx,
  );
  const trust = first.state.relationships.find((r) => r.otherId === 'other')?.trust;
  expect(trust).toBeGreaterThan(0.5);
  const repeat = socialOwner.receive(
    first.state,
    { kind: 'reputation', prop: 'other:honest', before: 0.9, credence: 0.9, evidenceId: 'confirmation' },
    ctx,
  );
  expect(repeat.state.relationships).toEqual(first.state.relationships);
});
