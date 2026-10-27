import { expect, test } from 'vitest';
import { exportRun, replay, restoreRun, step } from '../src/index.ts';
import {
  actionRequest,
  actor,
  authoredPerson,
  exampleOffers,
  exampleSpec,
  MINUTE,
  need,
  openingInputs,
  resolutionInput,
  START,
  setup,
} from './support.ts';

test('withheld host settlements leave work incomplete; actual completion survives restore and replay', () => {
  const person = authoredPerson('ada', 'Ada');
  person.state.agenda.goals = [
    {
      id: 'task',
      label: 'finish the work',
      serves: ['competence'],
      progress: 0,
      advancedBy: [{ action: 'work', amount: 0.25 }],
      importance: 0.4,
      baseImportance: 0.4,
      completionHalfLifeMs: 30 * 86_400_000,
    },
  ];
  const run = setup([person], exampleSpec(7));
  const work = exampleOffers('ada', ['work'])[0];
  if (!work) throw new Error('Missing authored work');
  const start = actionRequest(
    need(
      step(run, {
        until: START,
        inputs: openingInputs([{ id: 'ada', offers: [work] }]),
      }),
    ),
    'start',
  );
  const pending = exportRun(run);
  const held = need(step(run, { until: START + MINUTE, inputs: [] }));
  expect(held.boundary.type).toBe('world-required');
  expect(exportRun(run).current.at).toBe(START);
  expect(actor(run).agenda.goals[0]?.progress).toBe(0);
  expect(exportRun(run).current.pending.map((request) => request.id)).toContain(start.id);
  // Advancing a host clock cannot stand in for accepting an issued request.
  expect(exportRun(run).current.people).toStrictEqual(pending.current.people);
  need(
    step(run, {
      until: START,
      inputs: [
        resolutionInput(start, 0, {
          disposition: 'accepted',
          observations: [],
        }),
      ],
    }),
  );
  const end = START + work.durationMs;
  const finish = actionRequest(need(step(run, { until: end, inputs: [] })), 'finish');
  expect(actor(run).agenda.goals[0]?.progress).toBe(0);
  const checkpoint = exportRun(run);
  const restored = need(restoreRun(checkpoint));
  const receipt = resolutionInput(finish, 0, {
    disposition: 'completed',
    observations: [],
    outcome: {
      activityId: finish.activityId,
      offerId: work.id,
      actionId: work.actionId,
      start: START,
      end,
      status: 'completed',
      evidenceId: 'actual-work',
      actual: { exposures: [], observedProgress: [] },
      fulfills: [],
      advances: ['task'],
    },
  });
  need(step(run, { until: end, inputs: [receipt] }));
  need(step(restored, { until: end, inputs: [receipt] }));
  expect(actor(run).agenda.goals[0]?.progress).toBe(0.25);
  const archive = exportRun(run);
  expect(exportRun(restored)).toStrictEqual(archive);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});

test('a past clock rejects atomically without changing the run or caller batch', () => {
  const run = setup();
  const before = exportRun(run);
  const batch = { until: START - 1, inputs: [] };
  const input = structuredClone(batch);
  expect(step(run, batch).ok).toBe(false);
  expect(batch).toStrictEqual(input);
  expect(exportRun(run)).toStrictEqual(before);
});
