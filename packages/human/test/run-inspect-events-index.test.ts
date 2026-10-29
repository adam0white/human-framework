import { expect, test } from 'vitest';
import { createPerson, createRun, inspect, step } from '../src/index.ts';
import { accepted, HOST, numericalPerson, numericalSpec, PERSON } from './run-numerical-fixture.ts';

test('host event parts preserve projected order and cursor across people', () => {
  const run = accepted(createRun(numericalSpec(4)));
  const first = numericalPerson(4);
  const second = numericalPerson(4);
  second.id = 'second';
  accepted(createPerson(run, first));
  accepted(createPerson(run, second));
  accepted(step(run, { until: 0, inputs: [] }));
  accepted(
    step(run, {
      until: 3,
      inputs: [
        {
          id: 'first-event',
          at: 1,
          source: HOST,
          kind: 'quantity.observed',
          payload: { person: PERSON, evidenceId: 'one', truth: 20, difficulty: 0 },
        },
        {
          id: 'second-event',
          at: 2,
          source: HOST,
          kind: 'quantity.observed',
          payload: { person: 'second', evidenceId: 'two', truth: 10, difficulty: 0 },
        },
        {
          id: 'third-event',
          at: 3,
          source: HOST,
          kind: 'quantity.observed',
          payload: { person: PERSON, evidenceId: 'three', truth: 30, difficulty: 0 },
        },
      ],
    }),
  );
  const query = {
    perspective: { kind: 'host' as const },
    people: ['second', PERSON],
    select: ['events' as const],
  };
  const all = accepted(inspect(run, query));
  const quantity = all.events.filter((e) => e.data.kind === 'quantity-estimated');
  expect(quantity).toHaveLength(3);
  const firstEvent = quantity[0];
  if (!firstEvent) throw new Error('Missing first event');
  const tail = accepted(inspect(run, { ...query, afterEvent: firstEvent.id }));
  expect(tail.events).toEqual(all.events.slice(all.events.findIndex((e) => e.id === firstEvent.id) + 1));
  expect(tail.people.map((p) => p.id)).toEqual(['second', PERSON]);
  expect(
    tail.people.map((p) =>
      ((p.parts[0]?.value ?? []) as typeof tail.events).filter((e) => e.data.kind === 'quantity-estimated'),
    ),
  ).toEqual([[quantity[1]], [quantity[2]]]);
});
