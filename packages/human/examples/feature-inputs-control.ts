/** Host preflight rejects a batch before mutation; ignoring diagnostics keeps legacy execution. */
import assert from 'node:assert/strict';
import { createPerson, observeSkill, validateFeatureInputs } from '../src/index.ts';

const person = createPerson({
  id: 'learner',
  name: 'Learner',
  seed: 19,
  bornAt: -20_000_000,
  sex: 'female',
  family: { aptitudes: { smith: 1.5 } },
});
const before = structuredClone(person);
const batch = [{ inheritedAptitude: true }, { inheritedAptitude: 'true' }];
const issues = batch.flatMap((options) => validateFeatureInputs('observation', options));
if (issues.length === 0)
  for (const options of batch)
    observeSkill(person, 'smith', 60, 0.9, undefined, options as { inheritedAptitude?: boolean });
assert.equal(issues.length, 1);
assert.deepEqual(person, before);
const off = structuredClone(person);
const on = structuredClone(person);
observeSkill(off, 'smith', 60, 0.9);
observeSkill(on, 'smith', 60, 0.9, undefined, { inheritedAptitude: true });
assert.notDeepEqual(on.skills, off.skills);
assert.deepEqual(on.rng, before.rng);
assert.deepEqual(off.rng, before.rng);
console.log(
  'PASS: preflight prevents partial mutation; explicit observation aptitude changes learning without RNG.',
);
