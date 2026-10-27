/** Aptitude is ordinary person state for practice and received demonstrations. */
import { expect, test } from 'vitest';
import { createPerson, createRun, exportRun, step } from '../src/index.ts';
import type { Input } from '../src/run-schema.ts';
import { actor, authoredPerson, exampleSpec, MINUTE, need, START, setup } from './support.ts';

test('two always-present aptitudes change witnessed learning without inventing practice time', () => {
  const quick = authoredPerson('ada', 'Ada'),
    slow = authoredPerson('bora', 'Bora');
  quick.state.family.aptitudes = { smith: 2 };
  slow.state.family.aptitudes = { smith: 0.5 };
  const spec = exampleSpec();
  spec.definitions.skills = [{ id: 'smith', label: 'smith', domain: 'motor' }];
  spec.definitions.sources = [...spec.definitions.sources, { type: 'person', id: 'teacher' }];
  const run = setup([quick, slow], spec);
  const demonstration = (person: string): Input<'skill.witnessed'> => ({
    id: `host:watched:${person}`,
    at: START,
    source: { type: 'host', id: 'world' },
    kind: 'skill.witnessed',
    payload: {
      person,
      teacher: 'teacher',
      skill: 'smith',
      durationMs: 120 * MINUTE,
      modelLevel: 0.9,
      domain: 'motor',
      evidenceId: `demonstration:${person}`,
    },
  });
  const inputs = [demonstration('ada'), demonstration('bora')];
  const before = structuredClone(inputs);
  need(step(run, { until: START, inputs }));
  const a = actor(run).skills.smith,
    b = actor(run, 'bora').skills.smith;
  if (!a || !b) throw new Error('Missing actual witnessed learning');
  expect(a.level).toBeGreaterThan(b.level);
  expect(b.level).toBeGreaterThan(0);
  expect(a.practicedMs).toBe(0);
  expect(b.practicedMs).toBe(0);
  expect(inputs).toStrictEqual(before);
  const hash = exportRun(run).hashes.full;
  expect(step(run, { until: START, inputs }).ok).toBe(false);
  expect(exportRun(run).hashes.full).toBe(hash);
});

test('nonfinite authored aptitude rejects atomically instead of becoming neutral during repair', () => {
  const spec = exampleSpec();
  spec.definitions.skills = [{ id: 'smith', label: 'smith', domain: 'motor' }];
  spec.definitions.sources = [...spec.definitions.sources, { type: 'person', id: 'ada' }];
  const run = need(createRun(spec)),
    person = authoredPerson('ada', 'Ada');
  person.state.family.aptitudes = { smith: Number.POSITIVE_INFINITY };
  const before = exportRun(run),
    authored = structuredClone(person);
  expect(createPerson(run, person).ok).toBe(false);
  expect(person).toStrictEqual(authored);
  expect(exportRun(run)).toStrictEqual(before);
  person.state.family.aptitudes = { smith: 1 };
  need(createPerson(run, person));
  expect(actor(run).family.aptitudes).toStrictEqual({ smith: 1 });
});
