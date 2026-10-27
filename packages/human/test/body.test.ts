import { expect, it } from 'vitest';
import { bodyOwner } from '../src/body/body.ts';
import { required } from '../src/body/span.ts';
import { frame, initial } from './w1-fixture.ts';

it('keeps one anchored body path across irregular materializations and restore', () => {
  const run = (chunks: number[]) => {
    let x = bodyOwner.initialize(initial(), frame());
    let from = 0;
    for (const to of chunks) {
      const r = bodyOwner.advance(x.state, {
        effective: frame().effective,
        effectiveParametersHash: '0'.repeat(64),
        person: 'a',
        from,
        to,
        phase: 1,
        fidelity: { mode: 'fine' },
        priorWorldRevision: 0,
        causes: [],
        continuation: x.continuation,
        dozeContinuation: x.dozeContinuation,
        load: { mode: 'awake', effort: 0, focus: 0 },
        life: { birthAt: -30 * 365.25 * 86400000 },
        environment: {},
        perception: { fasting: false, fastingDays: 0 },
      });
      expect(r.advancedThrough).toBe(to);
      x = structuredClone(r);
      from = to;
    }
    return x;
  };
  const a = run([3600000]),
    b = run([175, 120001, 1145222, 3600000]);
  expect(a.state).toEqual(b.state);
  expect(a.continuation).toEqual(b.continuation);
  expect(a.state.sleepPressure).toBeCloseTo(1 - 0.8 * Math.exp(-60 / 825), 10);
  expect(a.state.satiety).toBeLessThan(0.8);
});
it('drains bleeding and treats the actual receipt without future RNG', () => {
  let x = bodyOwner.initialize(initial(), frame());
  x = bodyOwner.receive(
    x.state,
    {
      kind: 'receipt',
      id: 'hit',
      receipt: {
        type: 'injured',
        injury: { part: 'leg', severity: 0.4, healRatePerDay: 0.1, bleeding: 0.2 },
      },
    },
    { ...frame(), continuation: x.continuation, dozeContinuation: x.dozeContinuation },
  );
  expect(x.state.injuries).toHaveLength(1);
  const r = bodyOwner.receive(
    x.state,
    {
      kind: 'receipt',
      id: 'tend',
      receipt: {
        type: 'treated',
        injuryId: required(x.state.injuries[0]).id,
        quality: 1,
        actionReceipt: 'tend',
      },
    },
    { ...frame(), continuation: x.continuation, dozeContinuation: x.dozeContinuation },
  );
  expect(required(r.state.injuries[0]).bleeding).toBeCloseTo(0.04);
});
it('agrees over 24h at common hourly checkpoints with ten seeds, live doze and pinned receipts', async () => {
  const { createRng } = await import('../src/core/random.ts');
  const run = (seed: number, chunks: number[], daily: boolean) => {
    const input = initial();
    input.satiety = 0.6 + seed * 0.01;
    input.hydration = 0.7 + seed * 0.01;
    input.sleepPressure = 0.9;
    input.sleepDebtHours = 8;
    input.doze.context = { posture: 'seated', stimulation: 0.1 };
    let x = bodyOwner.initialize(input, frame());
    let from = 0;
    let rng = {
      words: createRng(seed),
      identity: {
        id: 'a',
        seed,
        uniformDraws: 12,
        initializationDraws: 12 as const,
        origin: { runSeed: seed, person: 'a' },
      },
    };
    const events: unknown[] = [];
    const checkpoints: unknown[] = [];
    for (const target of chunks) {
      let guard = 0;
      while (from < target) {
        if (++guard > 50) throw Error('owner boundary cycle');
        const ctx = {
          effective: frame().effective,
          effectiveParametersHash: '0'.repeat(64),
          person: 'a',
          from,
          to: target,
          phase: 1 as const,
          fidelity: daily
            ? { mode: 'daily' as const, dayMs: 86400000 as const, anchor: 0 }
            : { mode: 'fine' as const },
          priorWorldRevision: 0,
          causes: [],
          continuation: x.continuation,
          dozeContinuation: x.dozeContinuation,
          load: {
            mode: from >= 16 * 3600000 ? ('sleep' as const) : ('awake' as const),
            effort: 0.1,
            focus: 0,
          },
          life: { birthAt: -30 * 365.25 * 86400000 },
          environment: {},
          perception: { fasting: false, fastingDays: 0 },
        };
        const r = bodyOwner.advance(x.state, ctx);
        x = r;
        from = r.advancedThrough;
        events.push(...r.events);
        if (r.randomBoundary) {
          const q = bodyOwner.commitHazard(
            r.state,
            { ...r.randomBoundary, key: { kind: 'doze', channelId: 'onset' } },
            { ...frame(from), continuation: r.continuation, dozeContinuation: r.dozeContinuation, rng },
          );
          x = q;
          rng = q.rng;
          events.push(...q.events);
        }
      }
      if ([6, 12, 18].includes(target / 3600000)) {
        const q = bodyOwner.receive(
          x.state,
          {
            kind: 'receipt',
            id: `meal:${target}`,
            receipt: {
              type: 'consumed',
              actionReceipt: `meal:${target}`,
              received: { food: 0.4, water: 0.4 },
            },
          },
          { ...frame(target), continuation: x.continuation, dozeContinuation: x.dozeContinuation },
        );
        x = q;
        events.push(...q.events);
      }
      if (target % 3600000 === 0)
        checkpoints.push({
          state: structuredClone(x.state),
          rng: structuredClone(rng),
          events: structuredClone(events),
        });
    }
    return { state: x.state, rng, events, checkpoints };
  };
  for (let seed = 1; seed <= 10; seed++) {
    const hourly = Array.from({ length: 24 }, (_, i) => (i + 1) * 3600000);
    const fine = run(seed, hourly, false),
      daily = run(seed, hourly, true),
      irregular = run(
        seed,
        hourly.flatMap((t) => [t - 3599993, t - 3000017, t - 70123, t]),
        false,
      );
    expect(daily).toEqual(fine);
    expect(irregular).toEqual(fine);
    expect(fine.rng.identity.uniformDraws).toBeGreaterThan(12);
  }
});
it('matches the constant-source health, clotting and pain closed forms', () => {
  const input = initial();
  input.health = 0.8;
  input.pain = 0;
  input.injuries = [{ id: 'cut', part: 'arm', severity: 0.5, healRatePerDay: 0, bleeding: 0.2, since: 0 }];
  const x = bodyOwner.initialize(input, frame());
  const r = bodyOwner.advance(x.state, {
    effective: frame().effective,
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
    life: { birthAt: -30 * 365.25 * 86400000 },
    environment: {},
    perception: { fasting: false, fastingDays: 0 },
  });
  const k = Math.LN2 / 1080,
    h = 60;
  const expected =
    0.8 +
    (0.03 * (h - (0.004 * h * h) / (365.25 * 1440))) / 1440 -
    (0.2 * (1 - Math.exp(-k * h))) / (k * 1440);
  expect(Math.abs(r.state.health - expected)).toBeLessThan(1e-9);
  expect(r.state.injuries[0]?.bleeding).toBeCloseTo(0.2 * Math.exp(-k * h), 12);
  expect(r.state.pain).toBeCloseTo(0.5 * (1 - Math.exp((-Math.LN2 * h) / 20)), 10);
});

it('covers a dead span without sleeping, physiology changes or hazard work', () => {
  const opened = bodyOwner.initialize(initial(), frame());
  const dead = bodyOwner.receive(
    opened.state,
    { kind: 'actual-death', evidenceId: 'death' },
    {
      ...frame(),
      continuation: opened.continuation,
      dozeContinuation: opened.dozeContinuation,
    },
  );
  const before = structuredClone(dead);
  const result = bodyOwner.advance(dead.state, {
    effective: frame().effective,
    effectiveParametersHash: '0'.repeat(64),
    person: 'a',
    from: 0,
    to: 10,
    phase: 1,
    fidelity: { mode: 'fine' },
    priorWorldRevision: 0,
    causes: [],
    continuation: dead.continuation,
    dozeContinuation: dead.dozeContinuation,
    load: { mode: 'sleep', effort: 0, focus: 0 },
    life: { birthAt: -30 * 365.25 * 86400000 },
    environment: {},
    perception: { fasting: false, fastingDays: 0 },
  });
  expect(dead).toEqual(before);
  expect(result.state).toEqual(dead.state);
  expect(result.events).toEqual([]);
  expect(result.randomBoundary).toBeNull();
  expect(result.continuation.clock.advancedThroughMs).toBe(10);
  expect(result.continuation.acceptedThroughMs).toBe(10);
  expect(result.dozeContinuation.hazard.clock.advancedThroughMs).toBe(10);
  expect(result.dozeContinuation.hazard.acceptedThroughMs).toBe(10);
  expect(result.dozeContinuation.hazard.acceptedIntegral).toBe(dead.dozeContinuation.hazard.acceptedIntegral);
  expect(result.dozeContinuation.hazard.threshold).toEqual(dead.dozeContinuation.hazard.threshold);
  expect(bodyOwner.validate(result.state, result.continuation, result.dozeContinuation)).toEqual([]);
});
