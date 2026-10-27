/** Directly received facts correct beliefs and their social effect through one input route. */
import { expect, test } from 'vitest';
import { exportRun, step } from '../src/index.ts';
import type { Input } from '../src/run-schema.ts';
import { actor, authoredPerson, need, START, setup } from './support.ts';

function fact(id: string, prop: string, value: boolean, at = START): Input<'fact.confirmed'> {
  return {
    id,
    at,
    source: { type: 'host', id: 'world' },
    kind: 'fact.confirmed',
    payload: { person: 'ada', evidenceId: `evidence:${id}`, observationId: `observation:${id}`, prop, value },
  };
}
function residents() {
  const person = authoredPerson('ada', 'Ada');
  person.state.relationships = [
    {
      otherId: 'bora',
      affection: 0.3,
      trust: 0.3,
      respect: 0.3,
      familiarity: 1,
      roles: ['neighbor'],
      ledger: 0,
      lastInteraction: START,
    },
  ];
  return setup([person, authoredPerson('bora', 'Bora', 'male')]);
}
function trust(run: ReturnType<typeof residents>) {
  const value = actor(run).social.relationships.find((tie) => tie.otherId === 'bora')?.trust;
  if (value === undefined) throw new Error('Missing actual relationship');
  return value;
}

test('a confirmed reputation corrects trust once; repeating the same fact adds no second relationship delta', () => {
  const run = residents();
  const initial = trust(run);
  const first = fact('host:honest', 'bora:honest', true);
  need(step(run, { until: START, inputs: [first] }));
  const corrected = trust(run);
  expect(corrected).toBeGreaterThan(initial);
  need(step(run, { until: START + 1, inputs: [fact('host:honest-again', 'bora:honest', true, START + 1)] }));
  expect(trust(run)).toBeCloseTo(corrected, 8);
  const hash = exportRun(run).hashes.full;
  expect(step(run, { until: START + 1, inputs: [first] }).ok).toBe(false);
  expect(exportRun(run).hashes.full).toBe(hash);
  need(step(run, { until: START + 2, inputs: [fact('host:correction', 'bora:honest', false, START + 2)] }));
  expect(trust(run)).toBeLessThan(corrected);
});

test('a prototype property is ordinary belief text and cannot select a relationship formula', () => {
  const run = residents();
  const before = structuredClone(actor(run).social.relationships);
  need(step(run, { until: START, inputs: [fact('host:unrecognized', 'bora:constructor', true)] }));
  expect(actor(run).social.relationships).toStrictEqual(before);
  expect(actor(run).memory.beliefs.find((belief) => belief.prop === 'bora:constructor')).toBeDefined();
});
