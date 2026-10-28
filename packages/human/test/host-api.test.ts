import { expect, test } from 'vitest';
import { createPerson, createRun, exportRun, inspect, step } from '../src/index.ts';
import type { ActionExpectation, Habit, PersonaAdmission } from '../src/run-schema.ts';
import { actor, authoredPerson, DAY, exampleSpec, MINUTE, need, START } from './support.ts';

const habit: Habit = {
  cue: { hour: 7, after: 'wait' },
  action: 'work',
  strength: 0.4,
  repetitions: 3,
  lastAt: START - DAY,
  craving: 0.2,
  withheld: 1,
  lastWithheldAt: START - MINUTE,
};
const expectation: ActionExpectation = {
  key: 'work',
  needs: { competence: 0.1 },
  successRate: 0.8,
  samples: 4,
  valence: 0.3,
};

test('authored nested state is detached and retained in order without altering caller data', () => {
  const run = need(createRun(exampleSpec())),
    input = authoredPerson('ada', 'Ada');
  input.state.habits = [structuredClone(habit), { ...habit, action: 'rest', cue: {} }];
  input.state.expectations = [structuredClone(expectation), { ...expectation, key: 'rest' }];
  const before = structuredClone(input);
  need(createPerson(run, input));
  expect(input).toStrictEqual(before);
  expect(actor(run).habits).toStrictEqual(before.state.habits);
  expect(actor(run).memory.expectations).toStrictEqual(before.state.expectations);
  const current = exportRun(run).hashes.full;
  const firstHabit = input.state.habits[0],
    firstExpectation = input.state.expectations[0];
  if (!firstHabit || !firstExpectation) throw new Error('Missing authored fixture');
  firstHabit.cue.hour = 9;
  firstExpectation.needs.competence = 0;
  expect(exportRun(run).hashes.full).toBe(current);
});

test('unsupported authored properties reject instead of stripping or repairing them', () => {
  const run = need(createRun(exampleSpec())),
    person = authoredPerson('ada', 'Ada');
  const malformed = JSON.parse(JSON.stringify(person));
  malformed.state.habits = [{ ...habit, metadata: { mutable: true } }];
  const inputBefore = JSON.stringify(malformed),
    before = exportRun(run).hashes.full;
  const result = createPerson(run, malformed);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Unsupported habit metadata was admitted');
  expect(result.error.code).toBe('invalid-schema');
  expect(JSON.stringify(malformed)).toBe(inputBefore);
  expect(exportRun(run).hashes.full).toBe(before);
  need(createPerson(run, person));
});

test('oversized otherwise-valid authored habits reject at the owner boundary without reserving the actor', () => {
  const run = need(createRun(exampleSpec())),
    input = authoredPerson('ada', 'Ada');
  const limit = exportRun(run).initial.effective.builtins.HABIT_DEFAULTS.maxHabits;
  input.state.habits = Array.from({ length: limit + 1 }, (_, index) => ({
    ...habit,
    cue: { hour: index % 24, after: index < 24 ? 'wait' : 'rest' },
  }));
  const before = exportRun(run).hashes.full,
    caller = structuredClone(input);
  const result = createPerson(run, input);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Oversized habits were admitted');
  expect(result.error.code).toBe('invalid-admission');
  expect(result.error.path).toContain('habits');
  expect(exportRun(run).hashes.full).toBe(before);
  expect(input).toStrictEqual(caller);
  need(createPerson(run, authoredPerson('ada', 'Ada')));
});

test('received interpretation replaces held understanding with provenance rather than a direct setter', () => {
  const provenance = {
    kind: 'authored-world' as const,
    author: 'world',
    ruleId: 'tidy',
    edition: 'control1',
  };
  const spec = exampleSpec(),
    person = authoredPerson('ada', 'Ada');
  spec.definitions.norms = [
    {
      id: 'tidy',
      label: 'leave the work area tidy',
      standing: 'recommended',
      sources: [{ kind: 'assumption', ref: 'authored-control:tidy' }],
      provenance,
      exemptions: [],
    },
  ];
  person.state.heldNorms = [{ normId: 'tidy', standing: 'recommended', conviction: 0.4, provenance }];
  const run = need(createRun(spec));
  need(createPerson(run, person));
  need(
    step(run, {
      until: START,
      inputs: [
        {
          id: 'interpretation',
          at: START,
          source: { type: 'host', id: 'world' },
          kind: 'norm.interpretation-received',
          payload: {
            person: 'ada',
            evidenceId: 'interpretation-evidence',
            normId: 'tidy',
            standing: 'obligatory',
            conviction: 0.8,
            provenance,
          },
        },
      ],
    }),
  );
  expect(actor(run).conscience.norms).toStrictEqual([
    { normId: 'tidy', standing: 'obligatory', conviction: 0.8, provenance },
  ]);
});

test('archived admission and a portable projection without cast metadata refuse without changes', () => {
  const run = need(createRun(exampleSpec()));
  need(createPerson(run, authoredPerson('ada', 'Ada')));
  const before = exportRun(run).hashes.full;
  const portable = { ...authoredPerson('bea', 'Bea'), admission: {} as PersonaAdmission };
  const admitted = createPerson(run, portable);
  expect(admitted.ok).toBe(false);
  if (admitted.ok) throw new Error('Portable admission was accepted');
  expect(admitted.error.code).toBe('invalid-admission');
  const read = inspect(run, { perspective: { kind: 'host' }, people: ['ada'], select: ['persona'] });
  expect(read.ok).toBe(false);
  if (read.ok) throw new Error('Host persona read was accepted');
  expect(read.error.path).toBe('$.portable');
  expect(exportRun(run).hashes.full).toBe(before);
});
