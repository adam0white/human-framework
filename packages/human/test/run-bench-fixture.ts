/** Several fixture people in one run, for the 4.0 timing budgets and scripts/bench-run.ts. No vitest import. */
import { createPerson, createRun } from '../src/index.ts';
import type { Run } from '../src/run-schema.ts';
import { accepted, numericalPerson, numericalSpec } from './run-numerical-fixture.ts';

export function benchRun(people: number): Run {
  const spec = numericalSpec(1);
  const ids = Array.from({ length: people }, (_, i) => (i === 0 ? 'numerical-person' : `p${i}`));
  spec.definitions.lexicon.names = Object.fromEntries(ids.map((id, i) => [id, `Ada${i}`]));
  const host = spec.definitions.sources[0];
  if (!host) throw new Error('Fixture has no host source');
  spec.definitions.sources = [host, ...ids.map((id) => ({ type: 'person' as const, id }))];
  const run = accepted(createRun(spec));
  ids.forEach((id, i) => {
    const person = numericalPerson(1 + i);
    person.id = id;
    person.identity = { ...person.identity, name: `Ada${i}` };
    accepted(createPerson(run, person));
  });
  return run;
}
