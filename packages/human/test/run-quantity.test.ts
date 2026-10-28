/** SCOPE: quantity observation is a seeded act; a zero-difficulty control consumes no draw. */
import { expect, test } from 'vitest';
import { readBody } from '../src/body/body.ts';
import { random } from '../src/core/index.ts';
import { createPerson, createRun, exportRun, inspect, replay, restoreRun, step } from '../src/index.ts';
import { bodyPerception } from '../src/run-person.ts';
import { accepted, HOST, numericalPerson, numericalSpec, PERSON } from './run-numerical-fixture.ts';

function observe(sleepPressure: number, difficulty: number, truth = 20) {
  const run = accepted(createRun(numericalSpec(4)));
  const person = numericalPerson(4);
  person.state.body.sleepPressure = sleepPressure;
  accepted(createPerson(run, person));
  accepted(step(run, { until: 0, inputs: [] }));
  const opening = exportRun(run);
  const actor = opening.current.people[PERSON];
  if (!actor) throw new Error('Missing actor');
  const baseline = accepted(createRun(numericalSpec(4)));
  const baselinePerson = numericalPerson(4);
  baselinePerson.state.body.sleepPressure = sleepPressure;
  accepted(createPerson(baseline, baselinePerson));
  accepted(step(baseline, { until: 0, inputs: [] }));
  accepted(step(baseline, { until: 1, inputs: [] }));
  const baselineActor = exportRun(baseline).current.people[PERSON];
  if (!baselineActor) throw new Error('Missing baseline actor');
  const body = readBody(
    baselineActor.body,
    1,
    opening.initial.effective.builtins.BODY_DEFAULTS,
    bodyPerception(baselineActor, 1),
  );
  const expectedRng = { ...actor.rng };
  const draws = difficulty === 0 || truth === 0 ? 0 : 1;
  const draw = draws === 0 ? 0.5 : random(expectedRng);
  const expected = {
    value: truth * (1 + (2 * draw - 1) * difficulty * (0.05 + 0.45 * body.sleepiness)),
    confidence: draws === 0 ? 1 : 1 - difficulty * (0.05 + 0.45 * body.perceived.sleepiness),
    rng: expectedRng,
  };
  const result = accepted(
    step(run, {
      until: 1,
      inputs: [
        {
          id: 'reading',
          at: 1,
          source: HOST,
          kind: 'quantity.observed',
          payload: { person: PERSON, evidenceId: 'gauge', truth, difficulty },
        },
      ],
    }),
  );
  const event = result.events.find((e) => e.data.kind === 'quantity-estimated');
  if (event?.data.kind !== 'quantity-estimated') throw new Error('Missing quantity estimate');
  const archive = exportRun(run);
  const self = accepted(
    inspect(run, { perspective: { kind: 'person', observer: PERSON }, people: [PERSON], select: ['events'] }),
  );
  expect(self.events.find((e) => e.data.kind === 'quantity-estimated')?.data).toEqual(event.data);
  expect('truth' in event.data).toBe(false);
  const after = archive.current.people[PERSON];
  if (!after) throw new Error('Missing actor');
  expect(event.data.value).toBe(expected.value);
  expect(event.data.confidence).toBe(expected.confidence);
  expect(after.rng).toEqual(expected.rng);
  expect(after.randomIdentity.uniformDraws).toBe(baselineActor.randomIdentity.uniformDraws + draws);
  expect(exportRun(accepted(restoreRun(archive)))).toEqual(archive);
  expect(replay(archive).ok).toBe(true);
  return { data: event.data, run, before: actor.rng, after: after.rng };
}

test('tired readings have greater error and zero difficulty leaves the seeded stream intact', () => {
  const fresh = observe(0, 1),
    tired = observe(1, 1),
    control = observe(1, 0),
    zeroTruth = observe(1, 1, 0);
  expect(Math.abs(tired.data.value - 20)).toBeGreaterThan(Math.abs(fresh.data.value - 20));
  expect(tired.data.confidence).toBeLessThan(fresh.data.confidence);
  expect(control.data.value).toBe(20);
  expect(control.data.confidence).toBe(1);
  expect(control.after).toEqual(control.before);
  expect(zeroTruth.data).toMatchObject({ value: 0, confidence: 1 });
  expect(zeroTruth.after).toEqual(zeroTruth.before);
  const beforeInvalid = exportRun(control.run);
  for (const [i, truth] of [-1, Number.MAX_VALUE].entries()) {
    const invalid = step(control.run, {
      until: 2,
      inputs: [
        {
          id: `invalid-${i}`,
          at: 2,
          source: HOST,
          kind: 'quantity.observed',
          payload: { person: PERSON, evidenceId: `invalid-evidence-${i}`, truth, difficulty: 1 },
        },
      ],
    });
    expect(invalid.ok).toBe(false);
    expect(exportRun(control.run)).toEqual(beforeInvalid);
  }
  accepted(
    step(control.run, {
      until: 2,
      inputs: [
        {
          id: 'dead-reader',
          at: 2,
          source: HOST,
          kind: 'lifecycle.received',
          payload: {
            type: 'death',
            person: { kind: 'actor', id: PERSON },
            basis: { evidence: { kind: 'evidence', id: 'dead-reader-evidence' }, worldRevision: 0 },
          },
        },
      ],
    }),
  );
  const dead = exportRun(control.run);
  expect(dead.current.people[PERSON]?.body.alive).toBe(false);
  const deadReading = accepted(
    step(control.run, {
      until: 3,
      inputs: [
        {
          id: 'dead-reading',
          at: 3,
          source: HOST,
          kind: 'quantity.observed',
          payload: { person: PERSON, evidenceId: 'dead-gauge', truth: 20, difficulty: 1 },
        },
      ],
    }),
  );
  expect(deadReading.events.some((event) => event.data.kind === 'quantity-estimated')).toBe(false);
  const afterDead = exportRun(control.run);
  expect(
    afterDead.current.receipts.dispositions.find((item) => item.inputId === 'dead-reading'),
  ).toMatchObject({ kind: 'inapplicable', reason: 'actor-dead' });
  expect(afterDead.current.people[PERSON]?.rng).toEqual(dead.current.people[PERSON]?.rng);
  expect(accepted(replay(afterDead)).fullHash).toBe(afterDead.hashes.full);
});
