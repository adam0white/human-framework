import { expect, test } from 'vitest';
import { cognitionOwner } from '../src/cognition/cognition.ts';
import { willOwner } from '../src/will/will.ts';
import { decisionContext, offer, person } from './w2-fixture.ts';

test('risk and effort remain distinct costs and option ordering cannot alter terms', () => {
  const p = person();
  const risky = offer('forage', {
      demands: { effort: 0.5, focus: 0, mode: 'awake', requires: {} },
      expected: {
        needs: {},
        followedBy: [],
        provenance: [],
        risk: { chance: 0.5, severity: 0.5, kind: 'animal' },
      },
    }),
    rest = offer('rest');
  const a = cognitionOwner.terms(decisionContext(p, [risky, rest]));
  const b = cognitionOwner.terms(decisionContext(p, [rest, risky]));
  expect(a).toEqual(b);
  for (const source of ['risk', 'effort'])
    expect(a.terms.find((t) => t.offerId === 'forage' && t.term.source === source)?.term.value).toBeLessThan(
      0,
    );
});
test('a daily precommitment acts inside its window and release removes that bias', () => {
  const p = person();
  p.frame = { ...p.frame, at: 3600000 };
  p.actor.now = p.frame.at;
  p.actor.will.precommitments = [
    { id: 'avoid', action: 'forage', bias: -0.8, fromMsOfDay: 0, toMsOfDay: 7200000 },
  ];
  const offers = [offer('forage')];
  const term = () =>
    cognitionOwner.terms(decisionContext(p, offers)).terms.find((t) => t.term.source === 'precommit:avoid')
      ?.term.value;
  expect(term()).toBeCloseTo(-0.8);
  p.frame = { ...p.frame, at: 10800000 };
  expect(term()).toBeUndefined();
  p.actor.will = willOwner.receive(
    p.actor.will,
    { type: 'release-precommitment', precommitmentId: 'avoid' },
    { ...p.frame, actor: p.actor, offers },
  ).state;
  expect(p.actor.will.precommitments).toEqual([]);
});
