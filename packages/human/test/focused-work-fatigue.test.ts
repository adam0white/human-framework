import { expect, it } from 'vitest';
import { bodyOwner, readBody } from '../src/body/body.ts';
import { effective, frame, initial } from './w1-fixture.ts';

it('focused low-effort work depletes capacity and sleep recovers the same store', () => {
  const hour = 3_600_000;
  const run = (focus: number) => {
    const x = bodyOwner.initialize(initial(), frame());
    return bodyOwner.advance(x.state, {
      ...x,
      effective,
      effectiveParametersHash: '0'.repeat(64),
      person: 'a',
      from: 0,
      to: 8 * hour,
      phase: 1,
      fidelity: { mode: 'daily', dayMs: 86400000, anchor: 0 },
      priorWorldRevision: 0,
      causes: [],
      load: { mode: 'awake', effort: 0.05, focus },
      life: { birthAt: -30 * 365.25 * 24 * hour },
      environment: {},
      perception: { fasting: false, fastingDays: 0 },
    });
  };
  const focused = run(1);
  const idle = run(0);
  expect(focused.state.depletion).toBeGreaterThan(idle.state.depletion + 0.05);
  expect(readBody(focused.state, 8 * hour, effective.builtins.BODY_DEFAULTS).capacity).toBeLessThan(
    readBody(idle.state, 8 * hour, effective.builtins.BODY_DEFAULTS).capacity,
  );
  const slept = bodyOwner.advance(focused.state, {
    ...focused,
    effective,
    effectiveParametersHash: '0'.repeat(64),
    person: 'a',
    from: 8 * hour,
    to: 11 * hour,
    phase: 1,
    fidelity: { mode: 'daily', dayMs: 86400000, anchor: 0 },
    priorWorldRevision: 0,
    causes: [],
    load: { mode: 'sleep', effort: 0, focus: 1 },
    life: { birthAt: -30 * 365.25 * 24 * hour },
    environment: {},
    perception: { fasting: false, fastingDays: 0 },
  });
  expect(slept.state.depletion).toBeLessThan(focused.state.depletion);
});
