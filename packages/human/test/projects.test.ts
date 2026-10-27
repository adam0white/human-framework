import { expect, test } from 'vitest';
import { agendaOwner } from '../src/agenda/agenda.ts';
import { projectDiminishes, projectsOwner } from '../src/projects/projects.ts';
import {
  activity,
  agendaContext,
  goal,
  offer,
  outcome,
  percept,
  person,
  projectContext,
} from './w2-fixture.ts';

test('attended unknown progress remains unknown and project adoption is an agenda receipt, not a foreign write', () => {
  const p = person(),
    before = structuredClone(p.actor.agenda);
  const received = projectsOwner.receive(
    p.actor.projects,
    {
      kind: 'attended',
      percept: percept('prospect', { prospect: { id: 'chair', label: 'chair', kind: 'make' } }),
    },
    projectContext(p),
  ).state;
  expect(received.prospects[0]?.progress).toBeUndefined();
  const considered = projectsOwner.consider(received, projectContext(p));
  expect(p.actor.agenda).toEqual(before);
  const receipt = considered.agendaReceipts.find((r) => r.kind === 'project-adopt');
  expect(receipt?.kind).toBe('project-adopt');
  if (receipt?.kind !== 'project-adopt') throw new Error('Missing project proposal');
  expect(receipt.goal.project?.peak).toBeUndefined();
  expect(receipt.goal.completionHalfLifeMs).toBe(7200000);
});
test('restoring the previous high earns no net credit and does not renew the progress clock', () => {
  const p = person();
  p.actor.agenda.goals = [
    goal('project', { progress: 0.2, lastAdvancedAt: 1000, project: { prospectId: 'chair', peak: 0.5 } }),
  ];
  const restored = agendaOwner.receive(
    p.actor.agenda,
    {
      kind: 'project-progress',
      evidenceId: 'restored',
      prospectId: 'chair',
      progress: 0.5,
      ownContribution: true,
    },
    agendaContext(p),
  ).state;
  expect(restored.goals[0]?.lastAdvancedAt).toBe(1000);
  expect(restored.goals[0]?.project?.peak).toBe(0.5);
  const act = activity(offer('repair', { advances: ['chair'] }));
  p.actor.projects.prospects = [{ id: 'chair', label: 'chair', kind: 'make', progress: 0.2, lastSeenAt: 0 }];
  const result = projectsOwner.receive(
    p.actor.projects,
    {
      kind: 'outcome',
      activity: act,
      outcome: outcome(act, {
        actual: {
          exposures: [],
          observedProgress: [{ prospectId: 'chair', progress: 0.5, evidenceId: 'reading' }],
        },
      }),
    },
    projectContext(p),
  );
  expect(result.state.contributions).toEqual([]);
  expect(projectDiminishes(result.state, offer('undo', { diminishes: ['chair'] }), 'chair')).toBe(true);
});
test('a new received high records the actual settled receipt once', () => {
  const p = person();
  p.actor.agenda.goals = [goal('project', { progress: 0.4, project: { prospectId: 'chair', peak: 0.5 } })];
  p.actor.projects.prospects = [{ id: 'chair', label: 'chair', kind: 'make', progress: 0.4, lastSeenAt: 0 }];
  const act = activity(offer('build', { advances: ['chair'] }));
  const result = projectsOwner.receive(
    p.actor.projects,
    {
      kind: 'outcome',
      activity: act,
      outcome: outcome(act, {
        actual: {
          exposures: [],
          observedProgress: [{ prospectId: 'chair', progress: 0.6, evidenceId: 'seen' }],
        },
      }),
    },
    projectContext(p),
  );
  expect(result.state.contributions).toHaveLength(1);
  expect(result.state.contributions[0]?.amount).toBeCloseTo(0.1, 14);
  expect(result.state.contributions[0]?.actionReceipt).toBe(`outcome:${act.id}`);
});
