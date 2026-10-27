/** SCOPE: detached public preview uses held knowledge and cannot book a live act. */
import { expect, it } from 'vitest';
import { createPerson, createRun, exportRun, inspect, preview } from '../src/run.ts';
import {
  accepted,
  numericalPerson as authoredNumericalPerson,
  numericalSpec,
} from './run-numerical-fixture.ts';

// Explicit valid authoring for these integration controls; owner numerical fixture is separately reserved.
function numericalPerson(seed: number) {
  const person = authoredNumericalPerson(seed);
  person.state.retention = { ...person.state.retention, trace: 32 };
  return person;
}

it('keeps the live archive unchanged and omits hidden target simulation', () => {
  const make = (satiety: number) => {
    const spec = numericalSpec(4);
    const run = accepted(createRun(spec));
    const self = numericalPerson(4);
    self.id = 'self';
    accepted(createPerson(run, self));
    const other = numericalPerson(4);
    other.id = 'other';
    other.state.body.satiety = satiety;
    accepted(createPerson(run, other));
    return run;
  };
  const first = make(0.1),
    second = make(0.9),
    before = exportRun(first);
  const query = {
    perspective: { kind: 'person' as const, observer: 'self' },
    person: 'self',
    until: 60000,
    inputs: [],
  };
  const prediction = accepted(preview(first, query));
  expect(prediction).toEqual(accepted(preview(first, query)));
  expect(prediction).toEqual(accepted(preview(second, query)));
  expect(exportRun(first)).toEqual(before);
  expect(prediction.hypothetical).toBe(true);
  expect(JSON.stringify(prediction)).not.toContain('other');
});

it('composes actual lifecycle readers while a person cannot request target truth', () => {
  const run = accepted(createRun(numericalSpec(8)));
  const self = numericalPerson(8);
  self.id = 'self';
  accepted(createPerson(run, self));
  const before = exportRun(run);
  const host = accepted(
    inspect(run, {
      perspective: { kind: 'host' },
      people: ['self'],
      select: ['summary'],
      lifecycle: { kind: 'host', query: { kind: 'age', person: 'self', at: 0 } },
    }),
  );
  expect(host.lifecycle?.perspective.kind).toBe('host');
  if (!host.lifecycle || !('value' in host.lifecycle)) throw new Error('Missing actual host lifecycle');
  expect(host.lifecycle.value).toBe(30);
  const held = accepted(
    inspect(run, {
      perspective: { kind: 'person', observer: 'self' },
      people: ['self'],
      select: [],
      lifecycle: {
        kind: 'person',
        query: { kind: 'held-kin', person: 'self', other: { kind: 'entity', id: 'unseen' } },
      },
    }),
  );
  if (!held.lifecycle || !('unknowns' in held.lifecycle)) throw new Error('Missing held-evidence view');
  expect(held.lifecycle.unknowns).toEqual([{ kind: 'entity', id: 'unseen' }]);
  expect(
    inspect(run, {
      perspective: { kind: 'person', observer: 'self' },
      people: ['self'],
      select: [],
      lifecycle: { kind: 'host', query: { kind: 'age', person: 'self', at: 0 } },
    }).ok,
  ).toBe(false);
  expect(exportRun(run)).toEqual(before);
});
