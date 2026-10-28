/** SCOPE: resolving one actor's real pending action must not repeat another
 * actor's unchanged reached-hazard probes. The changed activity still invalidates
 * its own physical conditions, and the complete export replays exactly.
 */
import { expect, it, vi } from 'vitest';
import { advanceHazard, newHazard } from '../src/body/span.ts';
import { exportRun, replay, step } from '../src/index.ts';
import { OWNERS } from '../src/run-owners.ts';
import { benchRun } from './run-bench-fixture.ts';
import { accepted, sleepOffer } from './run-numerical-fixture.ts';

it('reuses quiet actors when a pending action changes another actor at the same clock', () => {
  const run = benchRun(2);
  const waiting = accepted(
    step(run, {
      until: 1,
      inputs: [
        {
          id: 'sleep-offers',
          at: 1,
          source: { type: 'host', id: 'numerical-host' },
          kind: 'offers.received',
          payload: { person: 'numerical-person', revision: 1, offers: [sleepOffer()] },
        },
        {
          id: 'choose-sleep',
          at: 1,
          source: { type: 'host', id: 'numerical-host' },
          kind: 'decision.requested',
          payload: { person: 'numerical-person', reason: 'sleep', treatment: 'ordinary', offerRevision: 1 },
        },
      ],
    }),
  );
  if (waiting.boundary.type !== 'world-required') throw new Error('Expected actual sleep request');
  const request = waiting.boundary.requests[0];
  if (request?.kind !== 'action' || request.stage !== 'start') throw new Error('Expected sleep start');
  const before = exportRun(run);
  const probe = vi.spyOn(OWNERS.body, 'advance');
  try {
    accepted(
      step(run, {
        until: 1,
        inputs: [
          {
            id: 'sleep-accepted',
            at: 1,
            source: { type: 'host', id: 'numerical-host' },
            kind: 'action.resolved',
            payload: {
              requestId: request.id,
              requestHash: request.requestHash,
              person: request.person,
              activityId: request.activityId,
              stage: 'start',
              worldRevision: request.worldRevision,
              disposition: 'accepted',
              observations: [],
            },
          },
        ],
      }),
    );
    expect(probe).toHaveBeenCalled();
    expect(probe.mock.calls.every(([, context]) => context.person === 'numerical-person')).toBe(true);
    const current = exportRun(run).current;
    expect(current.people.p1?.body).toEqual(before.current.people.p1?.body);
    expect(current.people['numerical-person']?.activity?.id).toBe(request.activityId);
  } finally {
    probe.mockRestore();
  }
  const archive = exportRun(run);
  expect(accepted(replay(archive)).fullHash).toBe(archive.hashes.full);
});

it('reports a reached threshold at the current clock without integrating a future interval', () => {
  const hazard = {
    ...newHazard({ kind: 'mortality', channelId: 'death' }, 0, 'condition', 'a'.repeat(64)),
    acceptedIntegral: 1,
    threshold: { exponentialBudget: 1, drawOrdinal: 12, allocatedAtMs: 0 },
  };
  let evaluations = 0;
  const reached = advanceHazard(hazard, 0, 0, () => {
    evaluations++;
    return 1;
  });
  expect(reached.boundary).toEqual({ key: hazard.key, at: 0, operation: 'fire' });
  expect(evaluations).toBe(0);
});
