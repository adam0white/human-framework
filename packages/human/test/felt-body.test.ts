import { expect, it } from 'vitest';
import { bodyOwner, readBody } from '../src/body/body.ts';
import { evaluateCell } from '../src/body/span.ts';
import { createRng } from '../src/core/random.ts';
import type { ActorRandomCursor, BodySpan, PerceptData } from '../src/run-schema.ts';
import { effective, frame, initial } from './w1-fixture.ts';

const rng = (): ActorRandomCursor => ({
  words: createRng(1),
  identity: {
    id: 'actor:a',
    seed: 1,
    uniformDraws: 12,
    initializationDraws: 12,
    origin: { runSeed: 1, person: 'a' },
  },
});
it('allocates only a reached eligible doze budget and wakes only on actual urgent evidence', () => {
  const input = initial();
  input.sleepPressure = 1;
  input.sleepDebtHours = 16;
  input.doze.context = { posture: 'reclined', stimulation: 0 };
  const x = bodyOwner.initialize(input, frame());
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
    ...x,
    load: { mode: 'awake', effort: 0, focus: 0 },
    life: { birthAt: -30 * 365.25 * 86400000 },
    environment: {},
    perception: { fasting: false, fastingDays: 0 },
  };
  const a = bodyOwner.advance(x.state, span);
  expect(a.randomBoundary?.operation).toBe('allocate');
  expect(a.advancedThrough).toBe(0);
  const cursor = rng();
  const c = bodyOwner.commitHazard(
    a.state,
    { key: { kind: 'doze', channelId: 'onset' }, operation: 'allocate', at: 0 },
    { ...frame(), continuation: a.continuation, dozeContinuation: a.dozeContinuation, rng: cursor },
  );
  expect(c.rng.identity.uniformDraws).toBe(13);
  expect(cursor.identity.uniformDraws).toBe(12);
  const b = bodyOwner.advance(c.state, {
    ...span,
    continuation: c.continuation,
    dozeContinuation: c.dozeContinuation,
  });
  expect(b.randomBoundary?.operation).toBe('fire');
  expect(b.advancedThrough).toBeGreaterThan(0);
  const cell = b.dozeContinuation.hazard.activeIntegralCell;
  const budget = b.dozeContinuation.hazard.threshold?.exponentialBudget;
  expect(cell).not.toBeNull();
  expect(budget).toBeDefined();
  if (cell && budget !== undefined) {
    expect(evaluateCell(cell, b.advancedThrough)).toBeGreaterThanOrEqual(budget);
    expect(evaluateCell(cell, b.advancedThrough - 1)).toBeLessThan(budget);
  }
  const sleep = bodyOwner.commitHazard(
    b.state,
    { key: { kind: 'doze', channelId: 'onset' }, operation: 'fire', at: b.advancedThrough },
    {
      ...frame(b.advancedThrough),
      continuation: b.continuation,
      dozeContinuation: b.dozeContinuation,
      rng: c.rng,
    },
  );
  expect(sleep.state.asleep).toBe(true);
  expect(sleep.rng).toEqual(c.rng);
  const at = b.advancedThrough + 1;
  const quiet = bodyOwner.advance(sleep.state, {
    ...span,
    from: b.advancedThrough,
    to: at,
    continuation: sleep.continuation,
    dozeContinuation: sleep.dozeContinuation,
  });
  const evidence: PerceptData = {
    id: 'alarm',
    occurredAt: b.advancedThrough,
    channel: 'heard',
    kind: 'alarm',
    targetId: 'a',
    salience: 0.9,
    summary: 'Alarm',
    claims: [],
    norms: [],
    advice: [],
    consequences: [],
    withdrawConsequences: [],
    witnesses: [],
    reports: [],
    provenance: [],
  };
  const low = bodyOwner.receive(
    quiet.state,
    { kind: 'wake', evidence: { ...evidence, id: 'low', salience: 0.1 } },
    { ...frame(at), continuation: quiet.continuation, dozeContinuation: quiet.dozeContinuation },
  );
  expect(low.state.asleep).toBe(true);
  const awake = bodyOwner.receive(
    low.state,
    { kind: 'wake', evidence },
    { ...frame(at), continuation: low.continuation, dozeContinuation: low.dozeContinuation },
  );
  expect(awake.state.asleep).toBe(false);
  expect(awake.state.doze.since).toBeUndefined();
  expect(awake.state.lastSleep).toEqual({ from: b.advancedThrough, to: at });
});
it('keeps true deprivation separate from underperceived debt and fasting hunger', () => {
  const b = bodyOwner.initialize(initial(), frame()).state;
  b.sleepDebtHours = 16;
  b.satiety = 0.5;
  const plain = readBody(b, 0, effective.builtins.BODY_DEFAULTS),
    fast = readBody(b, 0, effective.builtins.BODY_DEFAULTS, { fasting: true, fastingDays: 7 });
  expect(fast.hunger).toBe(plain.hunger);
  expect(fast.perceived.hunger).toBeLessThan(plain.perceived.hunger);
  expect(fast.perceived.thirst).toBe(plain.perceived.thirst);
  expect(fast.perceived.sleepiness).toBeLessThan(fast.sleepiness);
});
it('rolls physical transmission once, and never rolls without eligible contact', async () => {
  const { receiveContact } = await import('../src/body/body.ts');
  const x = bodyOwner.initialize(initial(), frame()),
    cursor = rng();
  const ctx = { ...frame(), continuation: x.continuation, dozeContinuation: x.dozeContinuation, rng: cursor };
  const contact = {
    type: 'physical-contact' as const,
    contactId: 'touch',
    durationMs: 86400000,
    basis: { kind: 'evidence' as const, id: 'actual-contact' },
    carrier: { kind: 'cold', severity: 0.8, contagious: true },
  };
  const remote = bodyOwner.receive(
    x.state,
    {
      kind: 'outcome',
      outcome: {
        activityId: 'phone',
        offerId: 'phone',
        actionId: 'phone',
        start: 0,
        end: 0,
        status: 'completed',
        evidenceId: 'phone',
        actual: { exposures: [], observedProgress: [] },
        fulfills: [],
        advances: [],
      },
    },
    { ...frame(), continuation: x.continuation, dozeContinuation: x.dozeContinuation },
  );
  expect(remote.state.illnesses).toEqual([]);
  expect(cursor.identity.uniformDraws).toBe(12);
  const r = receiveContact(x.state, contact, ctx);
  expect(r.rng.identity.uniformDraws).toBe(13);
  expect(r.state.illnesses.find((i) => i.kind === 'cold')?.severity).toBe(
    effective.builtins.BODY_DEFAULTS.contractedSeverity,
  );
  const no = receiveContact(x.state, { ...contact, durationMs: 0 }, ctx);
  expect(no.rng).toEqual(cursor);
  const already = receiveContact(r.state, contact, {
    ...ctx,
    continuation: r.continuation,
    dozeContinuation: r.dozeContinuation,
    rng: r.rng,
  });
  expect(already.rng).toEqual(r.rng);
  expect(already.state.illnesses).toHaveLength(1);
});
