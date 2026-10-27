/** Host declarations are scored as received. A place name supplies no invented travel cost. */
import { expect, test } from 'vitest';
import { step } from '../src/index.ts';
import {
  actor,
  authoredPerson,
  exampleOffers,
  exampleSpec,
  MINUTE,
  need,
  openingInputs,
  START,
  setup,
} from './support.ts';

test('identical water offers tie across place names; declared travel effort lowers utility', () => {
  const person = authoredPerson('ada', 'Ada');
  person.state.body.hydration = 0.2;
  const spec = exampleSpec(),
    base = exampleOffers('ada')[0];
  if (!base) throw new Error('Missing offer authoring');
  spec.definitions.actions = [
    ...spec.definitions.actions,
    { id: 'drink', label: 'drink', demands: base.demands, tags: [], norms: [] },
  ];
  const near = {
    ...base,
    id: 'near',
    actionId: 'drink',
    label: 'drink',
    place: 'near-well',
    durationMs: 30 * MINUTE,
    demands: { ...base.demands, effort: 0.1 },
    expected: { ...base.expected, needs: { water: 0.6 } },
  };
  const far = { ...near, id: 'far', place: 'far-well' };
  const costly = {
    ...far,
    id: 'long-trip',
    durationMs: 150 * MINUTE,
    demands: { ...far.demands, effort: 0.5 },
  };
  const run = setup([person], spec);
  need(step(run, { until: START, inputs: openingInputs([{ id: 'ada', offers: [near, far, costly] }]) }));
  const choices = actor(run).trace.at(-1)?.considered;
  const score = (id: string) => {
    const result = choices?.find((choice) => choice.affordanceId === id);
    if (!result) throw new Error(`Missing actual scored offer ${id}`);
    return result;
  };
  expect(score('near').utility).toBe(score('far').utility);
  expect(score('long-trip').utility).toBeLessThan(score('near').utility);
  expect(score('long-trip').terms.find((term) => term.source === 'need:water')?.value).toBe(
    score('near').terms.find((term) => term.source === 'need:water')?.value,
  );
  expect(actor(run).body.hydration).toBe(0.2);
});

test('ordinary scored offers expose separate material and goal terms before the host tunes work', () => {
  const person = authoredPerson('ada', 'Ada');
  person.state.agenda.goals = [
    {
      id: 'task',
      label: 'finish the work',
      serves: ['competence'],
      progress: 0,
      advancedBy: [{ action: 'work', amount: 0.5 }],
      importance: 1,
      baseImportance: 1,
      completionHalfLifeMs: 30 * 86_400_000,
    },
  ];
  const work = exampleOffers('ada', ['work'])[0];
  if (!work) throw new Error('Missing work');
  const paid = { ...work, id: 'paid-work', expected: { ...work.expected, material: 10 } };
  const run = setup([person]);
  need(step(run, { until: START, inputs: openingInputs([{ id: 'ada', offers: [work, paid] }]) }));
  const choices = actor(run).trace.at(-1)?.considered;
  const ordinary = choices?.find((choice) => choice.affordanceId === work.id),
    rewarded = choices?.find((choice) => choice.affordanceId === paid.id);
  if (!ordinary || !rewarded) throw new Error('Missing actual work scores');
  expect(ordinary.terms.find((term) => term.source === 'goal:task')?.value ?? 0).toBeGreaterThan(0);
  expect(rewarded.terms.find((term) => term.source === 'material')?.value ?? 0).toBeGreaterThan(0);
  expect(rewarded.utility).toBeGreaterThan(ordinary.utility);
  expect(actor(run).agenda.goals[0]?.progress).toBe(0);
});
