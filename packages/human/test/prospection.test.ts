import { expect, test } from 'vitest';
import { prospectionOwner } from '../src/prospection/prospection.ts';
import { activity, consequence, frame, offer, outcome, person } from './w2-fixture.ts';

test('withdrawal revisions retain tombstones and stale claims cannot revive an opportunity', () => {
  const c = frame(),
    claim = consequence('next');
  const heard = prospectionOwner.receive(
    { entries: [], revisions: [] },
    {
      kind: 'received',
      data: { person: 'person', evidenceId: 'heard', sourceId: 'teacher', claims: [claim], withdrawals: [] },
    },
    c,
  ).state;
  const withdrawn = prospectionOwner.receive(
    heard,
    {
      kind: 'received',
      data: {
        person: 'person',
        evidenceId: 'withdrawn',
        sourceId: 'teacher',
        claims: [],
        withdrawals: [{ id: 'next', revision: 2 }],
      },
    },
    c,
  ).state;
  expect(withdrawn.entries).toEqual([]);
  expect(withdrawn.revisions[0]?.revision).toBe(2);
  expect(
    prospectionOwner.receive(
      withdrawn,
      {
        kind: 'received',
        data: {
          person: 'person',
          evidenceId: 'stale',
          sourceId: 'teacher',
          claims: [claim],
          withdrawals: [],
        },
      },
      c,
    ).state,
  ).toEqual(withdrawn);
});
test('a completed trigger consumes only the actual action, target and place', () => {
  const c = frame(),
    claim = consequence('next');
  claim.trigger.placeId = 'home';
  const heard = prospectionOwner.receive(
    { entries: [], revisions: [] },
    {
      kind: 'received',
      data: { person: 'person', evidenceId: 'heard', sourceId: 'teacher', claims: [claim], withdrawals: [] },
    },
    c,
  ).state;
  const away = activity(offer('prepare', { place: 'work' }));
  expect(
    prospectionOwner.receive(heard, { kind: 'completed-trigger', activity: away, outcome: outcome(away) }, c)
      .state.entries[0]?.triggeredAt,
  ).toBeUndefined();
  const home = activity(offer('prepare', { place: 'home' }));
  expect(
    prospectionOwner.receive(heard, { kind: 'completed-trigger', activity: home, outcome: outcome(home) }, c)
      .state.entries[0]?.triggeredAt,
  ).toBe(0);
});

test('authored known consequences retain an explicit known basis rather than becoming testimony', () => {
  const p = person();
  const result = prospectionOwner.receive(
    p.actor.prospection,
    {
      kind: 'authored',
      data: {
        sourceId: 'host',
        claims: [consequence('known-route')],
        withdrawals: [],
        basis: { kind: 'authored', author: 'fixture', evidence: { kind: 'evidence', id: 'fixture' } },
      },
    },
    p.frame,
  );
  expect(result.state.entries[0]?.channel).toBe('known');
});
