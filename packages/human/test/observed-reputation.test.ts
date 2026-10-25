import { expect, it } from 'vitest';
import { observedReputationControl } from '../examples/observed-reputation-control.ts';
import { confirm, credence } from '../src/beliefs/beliefs.ts';
import { confirmObservedReputation } from '../src/observed-reputation.ts';
import { createPerson } from '../src/person.ts';
import { applyReputationBelief, markDeceased } from '../src/social/social.ts';

it('confirms unknown or malformed traits without changing relationships', () => {
  const p = createPerson({ id: 'reader', name: 'Reader', seed: 13, bornAt: 0, sex: 'male' });
  for (const trait of ['toString', 'constructor', '__proto__'])
    confirmObservedReputation(p, `neighbor:${trait}`, true, 1);
  confirmObservedReputation(p, 'neighbor:bad', true, 1, {
    bad: { affection: NaN, trust: 0.1, respect: 0.1 },
  });
  expect(p.social.relationships).toEqual([]);
  expect(credence(p, 'neighbor:toString')).toBeGreaterThan(0.9);
});

it('matches the manual correction and isolates the stale-relationship ablation', () => {
  expect(observedReputationControl().equivalent).toBe(true);
});
it('preserves primitive semantics for self, unknown, deceased, repeated and custom claims', () => {
  const p = createPerson({ id: 'reader', name: 'Reader', seed: 13, now: 0, bornAt: -15768000, sex: 'male' });
  markDeceased(p, 'dead', 0);
  const manual = structuredClone(p);
  const table = { careful: { affection: 0.01, trust: 0.02, respect: 0.03 } };
  for (const [prop, truth, custom] of [
    ['reader:honest', true, undefined],
    ['weather', false, undefined],
    ['dead:honest', true, undefined],
    ['other:careful', true, table],
    ['other:careful', true, table],
    ['other:careful', false, table],
  ] as const) {
    const before = credence(manual, prop);
    const expected = confirm(manual, prop, truth, 1);
    applyReputationBelief(manual, prop, before, credence(manual, prop), 1, custom);
    const ids = confirmObservedReputation(p, prop, truth, 1, custom);
    expect(ids).toEqual(expected);
    ids.push('external');
    expect(p).toEqual(manual);
  }
});
