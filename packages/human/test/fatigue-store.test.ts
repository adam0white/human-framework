import { expect, it } from 'vitest';
import { bodyOwner } from '../src/body/body.ts';
import { effective, frame, initial } from './w1-fixture.ts';

it('retains exertion depletion and recovers it through the same sleep kernel', () => {
  const input = initial();
  input.depletion = 0.8;
  const x = bodyOwner.initialize(input, frame());
  const r = bodyOwner.advance(x.state, {
    effective,
    effectiveParametersHash: '0'.repeat(64),
    person: 'a',
    from: 0,
    to: 3600000,
    phase: 1,
    fidelity: { mode: 'daily', dayMs: 86400000, anchor: 0 },
    priorWorldRevision: 0,
    causes: [],
    ...x,
    load: { mode: 'sleep', effort: 0, focus: 0 },
    life: { birthAt: -30 * 365.25 * 86400000 },
    environment: {},
    perception: { fasting: false, fastingDays: 0 },
  });
  expect(r.state.asleep).toBe(true);
  expect(r.state.depletion).toBeLessThan(0.8);
  expect(r.state.sleepPressure).toBeLessThan(0.2);
  expect(r.advancedThrough).toBe(3600000);
});
it('forecasts perceived worst fields without consuming future RNG or mutating the run', () => {
  const x = bodyOwner.initialize(initial(), frame());
  const before = structuredClone(x);
  const r = bodyOwner.forecast(
    x.state,
    [{ label: 'Work', durationMs: 3600000, load: { mode: 'awake', effort: 0.8, focus: 0.2 } }],
    {
      ...frame(),
      continuation: x.continuation,
      dozeContinuation: x.dozeContinuation,
      life: { birthAt: -30 * 365.25 * 86400000 },
      environment: {},
      perception: { fasting: false, fastingDays: 0 },
    },
  );
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value[0]?.basis).toBe('conditional-load-projection');
    expect(r.value[0]?.worst).toBeGreaterThan(0.1);
  }
  expect(x).toEqual(before);
  const long = bodyOwner.forecast(
    x.state,
    [{ label: 'Too far', durationMs: 8 * 86400000, load: { mode: 'awake', effort: 0, focus: 0 } }],
    {
      ...frame(),
      continuation: x.continuation,
      dozeContinuation: x.dozeContinuation,
      life: { birthAt: -30 * 365.25 * 86400000 },
      environment: {},
      perception: { fasting: false, fastingDays: 0 },
    },
  );
  expect(long.ok).toBe(false);
});
