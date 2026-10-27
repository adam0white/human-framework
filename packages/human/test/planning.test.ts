import { expect, test } from 'vitest';
import { prospectionOwner, receivedGoalRoute } from '../src/prospection/prospection.ts';
import { consequence, goal, offer, parameters, person } from './w2-fixture.ts';

test('planning keeps one coherent received route and charges its successor cost once', () => {
  const p = person(parameters({ planning: { depth: 3, presentBias: 1 } }));
  p.actor.agenda.goals = [goal('task', { advancedBy: [{ action: 'work', amount: 0.5 }] })];
  p.actor.memory.sourceTrust.teacher = 1;
  const claim = consequence('next');
  const heard = prospectionOwner.receive(
    p.actor.prospection,
    {
      kind: 'received',
      data: { person: 'person', evidenceId: 'heard', sourceId: 'teacher', claims: [claim], withdrawals: [] },
    },
    p.frame,
  ).state;
  p.actor.prospection = heard;
  const route = receivedGoalRoute(
    { ...p.actor, effective: p.frame.effective },
    offer('prepare'),
    0,
    1,
    () => -0.01,
    p.frame,
  );
  expect(route?.route.steps).toHaveLength(1);
  expect(route?.cost.value).toBeLessThanOrEqual(0);
  expect(route?.goals.get('task')).toBeGreaterThan(0);
  expect(p.actor.prospection.entries[0]?.triggeredAt).toBeUndefined();
});
