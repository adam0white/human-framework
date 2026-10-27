import { expect, test } from 'vitest';
import { agendaOwner } from '../src/agenda/agenda.ts';
import { commitment, frame, goal } from './w2-fixture.ts';

test('agenda allocates around authored ids and proposed projects through its one counter', () => {
  const c = frame();
  const state = agendaOwner.initialize(
    {
      exemptions: { traveling: { kind: 'unobserved' }, illnessSeverity: { kind: 'unobserved' } },
      commitments: [commitment('c8')],
      goals: [goal('g12')],
      precommitments: [],
      owed: [],
    },
    c,
  );
  expect(state.nextId).toBeGreaterThan(12);
  const adopted = agendaOwner.receive(
    state,
    { kind: 'project-adopt', evidenceId: 'proposal', goal: goal('proposal') },
    { ...c, activity: null, norms: [], catalog: [] },
  ).state;
  expect(new Set([...adopted.commitments, ...adopted.goals].map((x) => x.id)).size).toBe(3);
  expect(adopted.goals.at(-1)?.id).not.toBe('proposal');
});
