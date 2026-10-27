import { expect, it } from 'vitest';
import { createRng } from '../src/core/random.ts';
import { deriveAptitudes } from '../src/lifecourse/birth.ts';
import { developmentForAge, learningMultiplier } from '../src/lifecourse/development.ts';
import { modifiersForAge } from '../src/lifecourse/lifecourse.ts';
import type { InheritanceCursor } from '../src/run-schema.ts';

it('preserves asynchronous developmental peaks', () => {
  expect(developmentForAge(17).sensationSeeking).toBeGreaterThan(developmentForAge(30).sensationSeeking);
  expect(developmentForAge(60).crystallized).toBeGreaterThan(developmentForAge(25).crystallized);
  expect(developmentForAge(22).processingSpeed).toBeGreaterThan(developmentForAge(70).processingSpeed);
  expect(modifiersForAge(17).maturity).toBeLessThan(modifiersForAge(25).maturity);
  expect(learningMultiplier(10, 'language')).toBeGreaterThan(learningMultiplier(40, 'language'));
});
it('draws fixed catalog aptitudes on construction RNG without birth household shortcuts', () => {
  const identity = { kind: 'inheritance' as const, child: 'child' };
  const rng: InheritanceCursor = {
    id: 'i',
    identity,
    origin: { runSeed: 1, identity },
    seed: 1,
    words: createRng(1),
    uniformDraws: 12,
    initializationDraws: 12,
    status: 'active',
  };
  const r = deriveAptitudes(
    [
      { contactCovered: [], aptitudes: { wood: 2 } },
      { contactCovered: [], aptitudes: { wood: 2 } },
    ],
    [
      { id: 'wood', label: 'Wood', domain: 'general' },
      { id: 'clay', label: 'Clay', domain: 'general' },
    ],
    rng,
  );
  expect(Object.keys(r.aptitudes)).toEqual(['clay', 'wood']);
  expect(r.rng.uniformDraws).toBe(16);
  expect(rng.uniformDraws).toBe(12);
  expect(r.aptitudes.wood).toBeGreaterThanOrEqual(0.25);
  expect(r.aptitudes.wood).toBeLessThanOrEqual(4);
});
it('keeps a received chronic baseline and never clears it as an acute recovery', async () => {
  const { bodyOwner } = await import('../src/body/body.ts');
  const { effective, frame, initial } = await import('./w1-fixture.ts');
  const x = bodyOwner.initialize(initial(), frame());
  const r = bodyOwner.receive(
    x.state,
    {
      kind: 'receipt',
      id: 'chronic',
      receipt: {
        type: 'illness',
        illness: { kind: 'hypertension', severity: 0.2, trendPerDay: 0, contagious: false, chronic: true },
      },
    },
    { ...frame(), continuation: x.continuation, dozeContinuation: x.dozeContinuation },
  );
  const b = bodyOwner.advance(r.state, {
    effective,
    effectiveParametersHash: '0'.repeat(64),
    person: 'a',
    from: 0,
    to: 3600000,
    phase: 1,
    fidelity: { mode: 'fine' },
    priorWorldRevision: 0,
    causes: [],
    continuation: r.continuation,
    dozeContinuation: r.dozeContinuation,
    load: { mode: 'awake', effort: 0, focus: 0 },
    life: { birthAt: -50 * 365.25 * 86400000 },
    environment: {},
    perception: { fasting: false, fastingDays: 0 },
  });
  expect(b.state.illnesses[0]?.baseline).toBe(0.2);
  expect(b.state.illnesses[0]?.chronic).toBe(true);
  expect(b.state.illnesses[0]?.severity).toBeCloseTo(0.2, 12);
});
it('projects fitness onto the continuously moving age bound when time advances', async () => {
  const { bodyOwner } = await import('../src/body/body.ts');
  const { effective, frame, initial } = await import('./w1-fixture.ts');
  const input = initial();
  input.fitness = 1;
  const x = bodyOwner.initialize(input, frame());
  const r = bodyOwner.advance(x.state, {
    effective,
    effectiveParametersHash: frame().effectiveParametersHash,
    person: 'a',
    from: 0,
    to: 3600000,
    phase: 1,
    fidelity: { mode: 'fine' },
    priorWorldRevision: 0,
    causes: [],
    continuation: x.continuation,
    dozeContinuation: x.dozeContinuation,
    load: { mode: 'awake', effort: 0, focus: 0 },
    life: { birthAt: -80 * 365.25 * 86400000 },
    environment: {},
    perception: { fasting: false, fastingDays: 0 },
  });
  expect(r.state.fitness).toBeLessThanOrEqual(modifiersForAge(80 + 1 / (365.25 * 24)).maxFitness);
  expect(x.state.fitness).toBe(1);
});
