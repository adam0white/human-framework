import { expect, it } from 'vitest';
import { bodyOwner } from '../src/body/body.ts';
import { createRng } from '../src/core/random.ts';
import { lifecycleOwner, modifiersForAge, stageForAge } from '../src/lifecourse/lifecourse.ts';
import type { ActorRandomCursor, BodySpan } from '../src/run-schema.ts';
import { effective, frame, initial } from './w1-fixture.ts';

it('keeps distinct developmental curves and reached-only chronic/mortality budgets', () => {
  expect(stageForAge(12)).toBe('adolescent');
  expect(modifiersForAge(70).recovery).toBeLessThan(modifiersForAge(25).recovery);
  expect(modifiersForAge(70).mortalityPerYear).toBeGreaterThan(modifiersForAge(25).mortalityPerYear);
  const bornAt = -50 * 365.25 * 86400000;
  const b = bodyOwner.initialize(initial(), frame());
  const span: BodySpan = {
    effective,
    effectiveParametersHash: '0'.repeat(64),
    person: 'a',
    from: 0,
    to: 3600000,
    phase: 1,
    fidelity: { mode: 'fine' },
    priorWorldRevision: 0,
    causes: [],
    ...b,
    load: { mode: 'awake', effort: 0, focus: 0 },
    life: { birthAt: bornAt },
    environment: {},
    perception: { fasting: false, fastingDays: 0 },
  };
  const body = bodyOwner.advance(b.state, span);
  const x = lifecycleOwner.initialize({ name: 'A', birthAt: bornAt, sex: 'female' }, frame());
  const ctx = {
    effective,
    effectiveParametersHash: '0'.repeat(64),
    person: 'a',
    from: 0,
    to: 3600000,
    phase: 1 as const,
    fidelity: { mode: 'fine' as const },
    priorWorldRevision: 0,
    causes: [],
    continuation: x.continuation,
    body: body.trajectory,
    alive: true,
    heldConditionKinds: [],
    bonds: { courtships: [], marriages: [] },
    smoking: { kind: 'unobserved' as const },
    conditions: effective.fixedPriors.chronicConditions,
  };
  const r = lifecycleOwner.advance(x.state, ctx);
  expect(r.randomBoundary?.key.kind).toBe('chronic');
  expect(r.randomBoundary?.key.channelId).toBe('arthritis');
  expect(r.advancedThrough).toBe(0);
  const rng: ActorRandomCursor = {
    words: createRng(1),
    identity: {
      id: 'a',
      seed: 1,
      uniformDraws: 12,
      initializationDraws: 12,
      origin: { runSeed: 1, person: 'a' },
    },
  };
  const a = lifecycleOwner.commitHazard(
    r.state,
    { key: { kind: 'chronic', channelId: 'arthritis' }, operation: 'allocate', at: 0 },
    { ...frame(), continuation: r.continuation, rng, alive: true, heldConditionKinds: [] },
  );
  expect(a.rng.identity.uniformDraws).toBe(13);
  expect(rng.identity.uniformDraws).toBe(12);
  expect(() => lifecycleOwner.advance(x.state, { ...ctx, conditions: [] })).toThrow('catalog mismatch');
});
