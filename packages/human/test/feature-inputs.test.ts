import { expect, test } from 'vitest';
import { createPerson, observeSkill, validateFeatureInputs } from '../src/index.ts';

test('classifies expected primitive types before domains and accepts the wording selector', () => {
  expect(
    validateFeatureInputs('person-spec', {
      enable: { planning: { depth: '3' }, promptings: { readingSource: 1 }, review: { style: 1 } },
    }).map(({ code }) => code),
  ).toEqual(['type', 'type', 'type']);
  expect(validateFeatureInputs('person-spec', { enable: { planning: { depth: 6 } } })).toEqual([
    { path: 'enable.planning.depth', code: 'range', expected: 'integer 2..5' },
  ]);
  expect(validateFeatureInputs('person-spec', { lexicon: { wording: 'literal-v1' } })).toEqual([]);
  expect(validateFeatureInputs('person-spec', { lexicon: { wording: 1 } })[0]?.code).toBe('type');
  expect(validateFeatureInputs('person-spec', { lexicon: { wording: 'later' } })[0]?.code).toBe('range');
});

test('reports required response fields in supported order before unknown fields', () => {
  for (const response of [{ z: 1 }, { id: 1, z: 1 }])
    expect(
      validateFeatureInputs('person-spec', { enable: { promptings: { responses: [response] } } }).map(
        ({ path }) => path,
      ),
    ).toEqual([
      'enable.promptings.responses.0.id',
      'enable.promptings.responses.0.kind',
      'enable.promptings.responses.0.z',
    ]);
});

test('diagnoses existing feature boundaries and accepts owning-shape siblings', () => {
  expect(
    validateFeatureInputs('person-spec', {
      id: 'p',
      lexicon: { names: { p: 'Person' }, lines: {}, plainEnglish: false },
      enable: { gists: false, planning: {}, curiosity: true, doze: { posture: 'seated', stimulation: 0.5 } },
    }),
  ).toEqual([]);
  expect(
    validateFeatureInputs('percept', {
      summary: 'private',
      demonstrates: { skill: 'smith', level: 1, minutes: 10, domain: 'craft', inheritedAptitude: true },
    }),
  ).toEqual([]);
  expect(
    validateFeatureInputs('person-spec', {
      enable: { gists: 'true', planning: true },
      lexicon: { variety: null },
    }).map((x) => x.path),
  ).toEqual(['enable.gists', 'enable.planning', 'lexicon.variety']);
  expect(validateFeatureInputs('observation', { inheritedAptitude: 1 })[0]?.path).toBe('inheritedAptitude');
  expect(validateFeatureInputs('percept', { demonstrates: { inheritedAptitude: 'true' } })[0]?.path).toBe(
    'demonstrates.inheritedAptitude',
  );
});

test('absence, own undefined, null, arrays and inherited configuration remain distinct', () => {
  expect(validateFeatureInputs('observation', undefined)).toEqual([]);
  expect(validateFeatureInputs('person-spec', { enable: undefined, lexicon: undefined })).toEqual([]);
  expect(validateFeatureInputs('observation', { inheritedAptitude: undefined })).toEqual([]);
  for (const input of [null, [], 'true', Object.create({ inheritedAptitude: true })])
    expect(validateFeatureInputs('observation', input)[0]?.code).toBe('type');
  expect(validateFeatureInputs('person-spec', { enable: { doze: {} } })).toHaveLength(2);
});

test('uses bounded option domains and response identity without echoing values', () => {
  const input = {
    enable: {
      curiosity: { unknownScale: 0.81 },
      projects: { protectProgress: 'secret' },
      planning: { depth: 2.5 },
      promptings: {
        responses: [
          { id: 'private', kind: 'refuge' },
          { id: 'private', kind: 'leave', cue: '' },
        ],
      },
    },
  };
  const before = structuredClone(input);
  const issues = validateFeatureInputs('person-spec', input);
  expect(issues.map((x) => x.path)).toContain('enable.promptings.responses.1.id');
  expect(issues.map((x) => x.path)).toContain('enable.curiosity.unknownScale');
  expect(JSON.stringify(issues)).not.toContain('secret');
  expect(JSON.stringify(issues)).not.toContain('private');
  expect(input).toEqual(before);
});

test('reserves slot 64 for incomplete diagnostic signal and bounds paths', () => {
  const input = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`unknown${i}`, true]));
  const issues = validateFeatureInputs('observation', input);
  expect(issues).toHaveLength(64);
  expect(issues[63]?.code).toBe('bound');
  expect(validateFeatureInputs('observation', { ['x'.repeat(300)]: true })).toEqual([
    { path: '', code: 'bound', expected: 'diagnostic budget exhausted; list is incomplete' },
  ]);
  expect(validateFeatureInputs('observation', { z: 1, a: 1 }).map((x) => x.path)).toEqual(['a', 'z']);
});

test('diagnostics never change legacy truthiness or literal-true observation execution', () => {
  const spec = { id: 'p', name: 'Person', seed: 8, enable: { gists: 'true' } };
  validateFeatureInputs('person-spec', spec);
  const checked = createPerson(spec as unknown as Parameters<typeof createPerson>[0]);
  const unchecked = createPerson(spec as unknown as Parameters<typeof createPerson>[0]);
  expect(checked).toEqual(unchecked);
  for (const value of [undefined, false, true, 'true', 1, null]) {
    const options = { inheritedAptitude: value };
    const before = structuredClone(checked);
    validateFeatureInputs('observation', options);
    expect(checked).toEqual(before);
    observeSkill(checked, 'smith', 10, 0.8, undefined, options as Parameters<typeof observeSkill>[5]);
    observeSkill(unchecked, 'smith', 10, 0.8, undefined, options as Parameters<typeof observeSkill>[5]);
    expect(checked).toEqual(unchecked);
  }
});
