import { expect, test } from 'vitest';
import { createPerson, createRun, exportRun } from '../src/index.ts';
import { authoredPerson, exampleSpec, need } from './support.ts';

test('unknown authored references reject before identity, RNG or any actor slice is reserved', () => {
  const run = need(createRun(exampleSpec()));
  const person = authoredPerson('ada', 'Ada');
  const bad = structuredClone(person);
  bad.state.heldNorms = [
    {
      normId: 'undeclared-rule',
      standing: 'obligatory',
      conviction: 0.8,
      provenance: {
        kind: 'authored-world',
        author: 'world',
        ruleId: 'undeclared-rule',
        edition: 'invalid-input-control',
      },
    },
  ];
  const inputBefore = structuredClone(bad),
    before = exportRun(run);
  const result = createPerson(run, bad);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Unknown rule was admitted');
  expect(result.error.code).toBe('unknown-id');
  expect(bad).toStrictEqual(inputBefore);
  expect(exportRun(run).hashes.full).toBe(before.hashes.full);
  need(createPerson(run, person));
  const clean = need(createRun(exampleSpec()));
  need(createPerson(clean, person));
  expect(exportRun(run).hashes.full).toBe(exportRun(clean).hashes.full);
});
