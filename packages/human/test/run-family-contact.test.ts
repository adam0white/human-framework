import { expect, test } from 'vitest';
import * as run from '../src/run.ts';
import { accepted, DAY, HOST, numericalPerson, numericalSpec, PERSON } from './run-numerical-fixture.ts';

test('late factual contact applies once at admission and survives restore and replay', () => {
  const sim = accepted(run.createRun(numericalSpec(1)));
  const child = numericalPerson(1);
  child.identity.birthAt = -5 * 365.25 * DAY;
  const carer = numericalPerson(2);
  carer.id = 'carer';
  carer.state.values.benevolence = 1;
  carer.state.relationships = [
    {
      otherId: PERSON,
      affection: 0.9,
      trust: 0.8,
      respect: 0.7,
      familiarity: 1,
      roles: [],
      ledger: 0,
      lastInteraction: 0,
    },
  ];
  accepted(run.createPerson(sim, child));
  accepted(run.createPerson(sim, carer));
  const input = (id: string, at: number, from: number, to: number) => ({
    id,
    at,
    source: HOST,
    kind: 'family.contact' as const,
    payload: {
      person: PERSON,
      caregiver: 'carer',
      evidenceId: id,
      from,
      to,
      activities: [],
      observationIds: [],
    },
  });
  const subject = (archive: ReturnType<typeof run.exportRun>) => {
    const person = archive.current.people[PERSON];
    if (!person) throw new Error('Missing admitted child');
    return person;
  };
  const before = subject(run.exportRun(sim)).values.benevolence;
  accepted(run.step(sim, { until: DAY * 2, inputs: [input('first', DAY * 2, 0, DAY)] }));
  const first = run.exportRun(sim);
  expect(subject(first).family.raisedMs).toBe(DAY);
  expect(subject(first).values.benevolence).toBeGreaterThan(before);
  accepted(run.step(sim, { until: DAY * 2 + 1, inputs: [input('duplicate', DAY * 2 + 1, 0, DAY)] }));
  const duplicate = run.exportRun(sim);
  expect(subject(duplicate).family.raisedMs).toBe(DAY);
  expect(subject(duplicate).values.benevolence).toBe(subject(first).values.benevolence);
  const future = run.step(sim, {
    until: DAY * 2 + 2,
    inputs: [input('future', DAY * 2 + 2, DAY, DAY * 2 + 3)],
  });
  expect(future.ok).toBe(false);
  expect(run.exportRun(sim)).toEqual(duplicate);
  expect(run.exportRun(accepted(run.restoreRun(duplicate)))).toEqual(duplicate);
  expect(accepted(run.replay(duplicate)).fullHash).toBe(duplicate.hashes.full);
});
