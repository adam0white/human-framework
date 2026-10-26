import { expect, test } from 'vitest';
import {
  controlPerson,
  controlWorld,
  eventCatchUpControl,
  eventPolicy,
} from '../examples/event-catch-up-control.ts';
import { requireCommunityCurrent, synchronizeCommunity } from '../src/sim/catch-up.ts';
import { communityState, createCommunity, runSilent, stepCommunity } from '../src/sim/sim.ts';

test('headless stale-read, delayed death, proposal, interruption and doze arms', () => {
  expect(eventCatchUpControl()).toEqual({
    staleReadRejected: true,
    deathDiscovery: 10,
    proposalReleased: true,
    interruptedAt: 4,
    dozeCheckpoint: true,
  });
});

test('event-only requires the death dispatcher before any mutation', () => {
  const c = createCommunity([controlPerson()]);
  const before = JSON.stringify(c);
  expect(() => stepCommunity(c, controlWorld, 10, { catchUp: 'events' })).toThrow(/deathHandling/);
  expect(JSON.stringify(c)).toBe(before);
});

test('read synchronization matches eager JSON and RNG at the same tick boundary, including restore', () => {
  const eager = createCommunity([controlPerson()]);
  eager.idleUntil.a = 20;
  const deferred = createCommunity(structuredClone(eager.people), communityState(eager));
  const expectedEvents = stepCommunity(eager, controlWorld, 10, { ...eventPolicy, catchUp: undefined });
  expect(stepCommunity(deferred, controlWorld, 10, eventPolicy)).toEqual([]);
  const restored = createCommunity(JSON.parse(JSON.stringify(deferred.people)), communityState(deferred));
  expect(() => requireCommunityCurrent(restored, 10)).toThrow(/stale/);
  expect(synchronizeCommunity(restored, controlWorld, 10, eventPolicy)).toEqual(expectedEvents);
  expect(JSON.stringify(restored)).toBe(JSON.stringify(eager));
  expect(restored.people[0]?.rng).toEqual(eager.people[0]?.rng);
});

test('omitted option and explicit undefined preserve complete JSON/events/RNG across eager calls', () => {
  const a = createCommunity([controlPerson()]);
  const b = createCommunity(structuredClone(a.people));
  for (const at of [1, 7, 15, 16, 31]) {
    expect(stepCommunity(a, controlWorld, at)).toEqual(
      stepCommunity(b, controlWorld, at, { catchUp: undefined }),
    );
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.people[0]?.rng).toEqual(b.people[0]?.rng);
  }
});

test('read barriers retain duties and scheduled perception windows rather than pulling percepts early', () => {
  const a = controlPerson();
  a.agenda.commitments.push({
    id: 'appointment',
    kind: 'appointment',
    actions: ['visit'],
    from: 2,
    until: 8,
    importance: 0.5,
    label: 'Visit',
    status: 'pending',
  });
  const eager = createCommunity([a]);
  const deferred = createCommunity(structuredClone(eager.people));
  const calls: number[] = [];
  const world = {
    ...controlWorld,
    perceptsFor: (p: typeof a, since: number, until: number) => {
      calls.push(until);
      return since < 5 && until >= 5
        ? [
            {
              at: 5,
              channel: 'heard' as const,
              kind: 'news',
              summary: 'A bell rang.',
              salience: 0.5,
              targetId: p.id,
            },
          ]
        : [];
    },
  };
  stepCommunity(eager, world, 10, { deathHandling: 'community' });
  stepCommunity(deferred, world, 10, eventPolicy);
  synchronizeCommunity(deferred, world, 10, eventPolicy);
  expect(calls).toEqual([0, 0]);
  expect(JSON.stringify(deferred)).toBe(JSON.stringify(eager));
  expect(stepCommunity(deferred, world, 15, eventPolicy)).toEqual(
    stepCommunity(eager, world, 15, { deathHandling: 'community' }),
  );
  expect(JSON.stringify(deferred)).toBe(JSON.stringify(eager));
  expect(deferred.perceivedUntil.a).toBe(15);
  expect(deferred.people[0]?.agenda.commitments).toEqual(eager.people[0]?.agenda.commitments);
  expect(deferred.people[0]?.agenda.commitments[0]?.id).toBe('appointment');
});

test('the same pinned event-only call sequence replays with exact JSON and RNG', () => {
  const a = createCommunity([controlPerson()]);
  const b = createCommunity(structuredClone(a.people));
  for (const at of [1, 7, 15, 16, 31]) {
    expect(stepCommunity(a, controlWorld, at, eventPolicy)).toEqual(
      stepCommunity(b, controlWorld, at, eventPolicy),
    );
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  }
  expect(synchronizeCommunity(a, controlWorld, 31, eventPolicy)).toEqual(
    synchronizeCommunity(b, controlWorld, 31, eventPolicy),
  );
  expect(JSON.stringify(a)).toBe(JSON.stringify(b));
});

test('runSilent refuses stale output before mutation instead of silently changing its read contract', () => {
  const c = createCommunity([controlPerson()]);
  const before = JSON.stringify(c);
  expect(() => runSilent(c, controlWorld, 1, eventPolicy)).toThrow(/requires eager/);
  expect(JSON.stringify(c)).toBe(before);
});
