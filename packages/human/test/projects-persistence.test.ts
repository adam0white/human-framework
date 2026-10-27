import { expect, test } from 'vitest';
import { agendaOwner } from '../src/agenda/agenda.ts';
import { persistenceOwner } from '../src/persistence/persistence.ts';
import { agendaContext, goal, person } from './w2-fixture.ts';

test('host-task adoption preserves project identity, high-water mark and pursuit without renewed credit', () => {
  const p = person();
  p.actor.agenda.goals = [
    goal('project', {
      progress: 0.2,
      adoptedAt: -100000,
      lastAdvancedAt: -50000,
      project: { prospectId: 'chair', peak: 0.5 },
    }),
  ];
  p.actor.pursuit = { current: { goalId: 'project', since: -90000, lastServedAt: -1000, strength: 0.6 } };
  const after = agendaOwner.receive(
    p.actor.agenda,
    {
      type: 'adopt-task',
      prospectId: 'chair',
      task: {
        id: 'host-task',
        label: 'finish chair',
        serves: ['competence'],
        importance: 0.7,
        baseImportance: 0.7,
        progress: 0,
        advancedBy: [{ action: 'work', amount: 0.2 }],
        completionHalfLifeMs: 7200000,
      },
    },
    agendaContext(p),
  ).state;
  expect(after.goals[0]?.id).toBe('project');
  expect(after.goals[0]?.progress).toBe(0.2);
  expect(after.goals[0]?.project?.peak).toBe(0.5);
  expect(after.goals[0]?.adoptedAt).toBe(-100000);
  expect(after.goals[0]?.lastAdvancedAt).toBe(-50000);
  expect(
    persistenceOwner.validatePortable(p.actor.pursuit, after.goals, [{ kind: 'goal', id: 'project' }]),
  ).toEqual([]);
});
