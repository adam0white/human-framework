import { expect, test } from 'vitest';
import { checkBatchEnvelope, classifyQueuedInput } from '../src/run-admission.ts';
import { compareScheduled, frameEntries, nextDailyAt } from '../src/run-scheduler.ts';
import type { ScheduledEvent } from '../src/run-schema.ts';
import { initialRunState } from '../src/run-state.ts';
import { validateData } from '../src/run-validation.ts';
import { consumeHostResolution } from '../src/run-world.ts';
import { emptyRunSpec } from './run-fixture.ts';

// Catches extra-key actor patches, broad source unions and loss of detached admission.
test('strict input admission keeps lifecycle host-only and returns detached data', () => {
  const envelope = {
    id: 'input-1',
    at: 5,
    source: { type: 'host', id: 'world' },
    kind: 'lifecycle.received',
    payload: {
      type: 'death',
      person: { kind: 'actor', id: 'person-1' },
      basis: { evidence: { kind: 'evidence', id: 'evidence-1' }, worldRevision: 0 },
    },
  };
  const input = { until: 5, inputs: [envelope] };
  const accepted = validateData('StepBatch', input);
  expect(accepted.ok).toBe(true);
  envelope.source.id = 'changed';
  if (!accepted.ok) throw new Error(accepted.error.message);
  expect(accepted.value.inputs[0]?.source.id).toBe('world');
  expect(
    validateData('StepBatch', {
      ...input,
      inputs: [{ ...envelope, source: { type: 'person', id: 'person-1' } }],
    }).ok,
  ).toBe(false);
  expect(
    validateData('StepBatch', {
      ...input,
      inputs: [{ ...envelope, payload: { ...envelope.payload, setActor: { health: 1 } } }],
    }).ok,
  ).toBe(false);
});

test('narrow tuning rejects off values and immutable builtin overrides', () => {
  expect(validateData('RunTuning', { doze: { hazardScale: 0 } }).ok).toBe(false);
  expect(validateData('RunTuning', { builtins: { DOZE_DEFAULTS: { hazard: 0 } } }).ok).toBe(false);
  expect(
    validateData('RunTuning', { planning: { depth: 4, presentBias: 1 }, doze: { hazardScale: 0.5 } }).ok,
  ).toBe(true);
});

test('batch preflight orders inputs, rejects the whole bad batch and preserves queued refusal', () => {
  const state = {
    at: 0,
    closed: false,
    resolutionLane: [],
    worldRevision: 0,
    hostId: 'world',
    sources: [{ type: 'voice' as const, id: 'guide' }],
    people: ['person-1'],
    acceptedInputIds: new Set<string>(),
    queued: [],
    pending: [],
  };
  const later = {
    id: 'b',
    at: 2,
    source: { type: 'voice' as const, id: 'guide' },
    kind: 'review.requested' as const,
    payload: { person: 'person-1', reason: 'evening' },
  };
  const earlier = { ...later, id: 'a', at: 1 };
  const input = { until: 3, inputs: [later, earlier] };
  const before = JSON.stringify(input);
  const accepted = checkBatchEnvelope(state, input);
  if (!accepted.ok) throw new Error(accepted.error.message);
  expect(accepted.value.inputs.map((x) => x.id)).toEqual(['a', 'b']);
  expect(JSON.stringify(input)).toBe(before);
  expect(
    checkBatchEnvelope(state, {
      ...input,
      inputs: [earlier, { ...later, source: { type: 'host', id: 'other' } }],
    }).ok,
  ).toBe(false);
  expect(checkBatchEnvelope({ ...state, acceptedInputIds: new Set(['a']) }, input).ok).toBe(false);
  expect(checkBatchEnvelope({ ...state, closed: true, at: 1 }, input).ok).toBe(false);
  // Admission can precede an intervening death. Consumption records a typed refusal,
  // and the remaining queue can advance; this is not malformed external JSON.
  expect(classifyQueuedInput(earlier, { alive: false })).toEqual({
    kind: 'inapplicable',
    reason: 'actor-dead',
  });
  expect(classifyQueuedInput(earlier, { alive: true })).toEqual({ kind: 'consumed', reason: 'applied' });
});

// Competing starts are host-arbitrated against an explicit revision chain.
test('pending resolutions preserve the frame lane and exact world revision chain', () => {
  const hash = 'a'.repeat(64);
  const requests = ['one', 'two'].map((id) => ({
    kind: 'action' as const,
    id,
    person: 'person-1',
    activityId: `activity-${id}`,
    offerId: `offer-${id}`,
    offerRevision: 0,
    issuedAt: 0,
    boundaryAt: 0,
    stage: 'start' as const,
    worldRevision: 0,
    requestHash: hash,
    participants: ['person-1'],
  }));
  const state = {
    at: 0,
    closed: false,
    resolutionLane: ['one', 'two'],
    worldRevision: 0,
    hostId: 'world',
    sources: [],
    people: ['person-1'],
    acceptedInputIds: new Set<string>(),
    queued: [],
    pending: requests,
  };
  const one = {
    id: 'a',
    at: 0,
    source: { type: 'host' as const, id: 'world' },
    kind: 'action.resolved' as const,
    payload: {
      requestId: 'one',
      requestHash: hash,
      person: 'person-1',
      activityId: 'activity-one',
      stage: 'start' as const,
      worldRevision: 0,
      disposition: 'accepted' as const,
      observations: [],
      worldChange: { expectedRevision: 0, revision: 1, put: [], remove: [], hostState: { seat: 'taken' } },
    },
  };
  const two = {
    ...one,
    id: 'b',
    payload: {
      requestId: 'two',
      requestHash: hash,
      person: 'person-1',
      activityId: 'activity-two',
      stage: 'start' as const,
      worldRevision: 1,
      disposition: 'rejected' as const,
      observations: [],
    },
  };
  expect(checkBatchEnvelope(state, { until: 0, inputs: [two, one] }).ok).toBe(true);
  // This pins the reached bookkeeping reducer. The public two-issued-request
  // dispatcher control remains separate from this focused unit control.
  const current = initialRunState(emptyRunSpec());
  current.pending = requests;
  current.cursor.resolutionLane = ['one', 'two'];
  const first = consumeHostResolution(current, one);
  if (!first.ok) throw new Error(first.error.message);
  expect(current.world.revision).toBe(0);
  expect(current.pending).toHaveLength(2);
  expect(first.value.state.world.revision).toBe(1);
  expect(first.value.state.pending[0]?.worldRevision).toBe(0);
  const second = consumeHostResolution(first.value.state, two);
  if (!second.ok) throw new Error(second.error.message);
  expect(second.value.state.pending).toHaveLength(0);
  expect(second.value.state.cursor.resolutionLane).toEqual([]);
  expect(second.value.request.requestHash).toBe(hash);
  expect(
    checkBatchEnvelope(state, {
      until: 0,
      inputs: [one, { ...two, payload: { ...two.payload, worldRevision: 0 } }],
    }).ok,
  ).toBe(false);
  expect(
    checkBatchEnvelope(state, {
      until: 0,
      inputs: [{ ...one, payload: { ...one.payload, requestHash: 'b'.repeat(64) } }],
    }).ok,
  ).toBe(false);
  expect(
    checkBatchEnvelope(state, {
      until: 0,
      inputs: [
        {
          id: 'ordinary',
          at: 0,
          source: one.source,
          kind: 'review.requested',
          payload: { person: 'person-1', reason: 'late' },
        },
      ],
    }).ok,
  ).toBe(false);
});

test('frames consume canonical external order before internal work without endpoint opportunities', () => {
  const internal: ScheduledEvent = {
    id: 'internal',
    at: -1,
    phase: 1,
    person: 'person-1',
    causalId: 'cause',
    localOrdinal: 0,
    data: { kind: 'owner-boundary', owner: 'body', person: 'person-1', boundary: 'threshold' },
  };
  const voice: ScheduledEvent = {
    id: 'voice',
    at: -1,
    phase: 0,
    causalId: 'z',
    localOrdinal: 1,
    data: {
      kind: 'input',
      input: {
        id: 'z',
        at: -1,
        source: { type: 'voice', id: 'guide' },
        kind: 'review.requested',
        payload: { person: 'person-1', reason: 'review' },
      },
    },
  };
  const host: ScheduledEvent = {
    id: 'host',
    at: -1,
    phase: 0,
    causalId: 'a',
    localOrdinal: 2,
    data: {
      kind: 'input',
      input: {
        id: 'a',
        at: -1,
        source: { type: 'host', id: 'world' },
        kind: 'review.requested',
        payload: { person: 'person-1', reason: 'review' },
      },
    },
  };
  expect([internal, voice, host].sort(compareScheduled).map((x) => x.id)).toEqual([
    'host',
    'voice',
    'internal',
  ]);
  expect(frameEntries([voice, internal, host], -1).map((x) => x.id)).toEqual(['host', 'voice', 'internal']);
  expect(frameEntries([voice, internal, host], 0)).toEqual([]);
  expect(nextDailyAt(-1, 0)).toEqual({ ok: true, value: 0 });
  expect(nextDailyAt(0, 0)).toEqual({ ok: true, value: 86400000 });
  expect(nextDailyAt(Number.MAX_SAFE_INTEGER, 0).ok).toBe(false);
});

test('a queued snapshot superseded at an earlier boundary cannot poison subsequent admission', () => {
  const queued = {
    id: 'queued',
    at: 5,
    source: { type: 'host' as const, id: 'world' },
    kind: 'world.changed' as const,
    payload: { expectedRevision: 0, revision: 1, put: [], remove: [], hostState: 'old' },
  };
  const state = {
    at: 1,
    closed: true,
    resolutionLane: [],
    worldRevision: 2,
    hostId: 'world',
    sources: [],
    people: [],
    acceptedInputIds: new Set(['queued']),
    queued: [queued],
    pending: [],
  };
  expect(checkBatchEnvelope(state, { until: 6, inputs: [] }).ok).toBe(true);
  expect(classifyQueuedInput(queued, { alive: true, worldRevision: 2 })).toEqual({
    kind: 'inapplicable',
    reason: 'world-revision-changed',
  });
  expect(
    checkBatchEnvelope({ ...state, queued: [], acceptedInputIds: new Set() }, { until: 6, inputs: [queued] })
      .ok,
  ).toBe(false);
});
