import { expect, it } from 'vitest';
import { bodyOwner } from '../src/body/body.ts';
import { readCapacities } from '../src/body/injury.ts';
import { effective, frame, initial } from './w1-fixture.ts';

it('keeps part-specific impairment and reaches health downing before physical death', () => {
  const input = initial();
  input.health = 0.29;
  input.injuries = [{ id: 'legs', part: 'legs', severity: 1, healRatePerDay: 0, since: 0 }];
  const x = bodyOwner.initialize(input, frame());
  expect(readCapacities(x.state).moving).toBeCloseTo(0.2, 12);
  const r = bodyOwner.advance(x.state, {
    effective,
    effectiveParametersHash: '0'.repeat(64),
    person: 'a',
    from: 0,
    to: 60000,
    phase: 1,
    fidelity: { mode: 'fine' },
    priorWorldRevision: 0,
    causes: [],
    ...x,
    load: { mode: 'awake', effort: 0, focus: 0 },
    life: { birthAt: -30 * 365.25 * 86400000 },
    environment: {},
    perception: { fasting: false, fastingDays: 0 },
  });
  expect(r.advancedThrough).toBe(0);
  expect(r.state.downed?.reason).toBe('health');
  expect(r.state.alive).toBe(true);
});
