/** SCOPE: authored run coefficients change scoring without switching off faculties; defaults retain their own provenance. */
import { expect, test } from 'vitest';
import { createPerson, createRun, exportRun, replay, restoreRun, step } from '../src/index.ts';
import { accepted, numericalPerson, numericalSpec, PERSON } from './run-numerical-fixture.ts';
import { authoredPerson, exampleOffers, exampleSpec, need, openingInputs, START, setup } from './support.ts';

test('run tuning records effective leaves and preserves deterministic assent and replay', () => {
  const spec = numericalSpec(2);
  spec.tuning = {
    will: { temperature: 0 },
    planning: { depth: 3 },
    cognition: { needScale: 2, effortScale: 2 },
  };
  const run = accepted(createRun(spec));
  accepted(createPerson(run, numericalPerson(2)));
  accepted(step(run, { until: 1000, inputs: [] }));
  const archive = exportRun(run);
  expect(archive.initial.effective.builtins.COGNITION_DEFAULTS.needScale).toBe(2);
  expect(archive.initial.effective.builtins.COGNITION_DEFAULTS.effortScale).toBe(2);
  expect(archive.current.people[PERSON]?.will.temperature).toBe(0);
  expect(
    archive.initial.parameterProvenance.find(
      (p) => p.path.kind === 'tuning' && p.path.field === 'cognition' && p.path.coefficient === 'needScale',
    )?.status,
  ).toBe('authored-tuning');
  expect(
    archive.initial.parameterProvenance.find(
      (p) => p.path.kind === 'tuning' && p.path.field === 'planning' && p.path.coefficient === 'presentBias',
    )?.status,
  ).toBe('provisional-unfitted');
  expect(exportRun(accepted(restoreRun(archive)))).toEqual(archive);
  expect(accepted(replay(archive)).fullHash).toBe(archive.hashes.full);
  const control = accepted(createRun(numericalSpec(2)));
  accepted(createPerson(control, numericalPerson(2)));
  accepted(step(control, { until: 1000, inputs: [] }));
  expect(exportRun(control).initial.effective.builtins.COGNITION_DEFAULTS.needScale).toBe(4);
  expect(createRun({ ...spec, tuning: { cognition: { needScale: 0 } } }).ok).toBe(false);
  const stochastic = accepted(createRun({ ...numericalSpec(2), tuning: { will: { temperature: 0.4 } } }));
  accepted(createPerson(stochastic, numericalPerson(2)));
  expect(exportRun(stochastic).current.people[PERSON]?.will.temperature).toBe(0.4);
  function effort(tuned: boolean) {
    const spec = exampleSpec();
    if (tuned) spec.tuning = { will: { temperature: 0 }, cognition: { effortScale: 2 } };
    const run = setup([authoredPerson('ada', 'Ada')], spec);
    const result = need(
      step(run, {
        until: START,
        inputs: openingInputs([{ id: 'ada', offers: exampleOffers('ada', ['work', 'wait']) }]),
      }),
    );
    const event = result.events.find((e) => e.data.kind === 'decision');
    if (event?.data.kind !== 'decision') throw new Error('missing actual assent');
    const term = event.data.decision.considered
      .find((c) => c.action === 'work')
      ?.terms.find((t) => t.source === 'effort');
    if (!term) throw new Error('missing effort term');
    return term.value;
  }
  expect(effort(true)).toBeCloseTo(2 * effort(false), 12);
});
