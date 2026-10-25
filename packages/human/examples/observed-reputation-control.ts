/** Hearsay 2 control: composite equals manual correction; belief-only leaves the tie stale. */
import assert from 'node:assert/strict';
import { believe, confirm, credence } from '../src/beliefs/beliefs.ts';
import { confirmObservedReputation } from '../src/observed-reputation.ts';
import { createPerson } from '../src/person.ts';
import { applyReputationBelief } from '../src/social/social.ts';

export function observedReputationControl() {
  const initial = createPerson({
    id: 'listener',
    name: 'Listener',
    seed: 43,
    now: 0,
    bornAt: -15768000,
    sex: 'female',
  });
  believe(initial, 'neighbor:honest', false, 0.9, 'teller', 0);
  const manual = structuredClone(initial);
  const composite = structuredClone(initial);
  const beliefOnly = structuredClone(initial);
  const before = credence(manual, 'neighbor:honest');
  const expected = confirm(manual, 'neighbor:honest', true, 1);
  applyReputationBelief(manual, 'neighbor:honest', before, credence(manual, 'neighbor:honest'), 1);
  const actual = confirmObservedReputation(composite, 'neighbor:honest', true, 1);
  confirm(beliefOnly, 'neighbor:honest', true, 1);
  assert.deepEqual(composite, manual);
  assert.deepEqual(actual, expected);
  assert.deepEqual(composite.rng, initial.rng);
  assert.deepEqual(beliefOnly.memory, composite.memory);
  assert.notDeepEqual(beliefOnly.social, composite.social);
  return { equivalent: true, rngUnchanged: true, beliefOnlyLeavesTieStale: true };
}
if (process.argv[1]?.endsWith('/observed-reputation-control.ts')) console.log(observedReputationControl());
