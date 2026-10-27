/** Retained named-commitment and practice-decay behavior. Historical enable/repair contracts are archived. */
import { expect, test } from 'vitest';
import { exportRun, replay, step } from '../src/index.ts';
import { practiceAt, responseCueMatches } from '../src/promptings/promptings.ts';
import {
  actionRequest,
  actor,
  authoredPerson,
  DAY,
  exampleOffers,
  MINUTE,
  need,
  openingInputs,
  resolutionInput,
  START,
  setup,
} from './support.ts';

test('one completed receipt keeps two eligible named commitments without crediting an earlier implicit match', () => {
  const person = authoredPerson('ada', 'Ada');
  const commitment = (id: string, until: number) => ({
    id,
    kind: 'job' as const,
    actions: ['work'],
    from: START,
    until,
    importance: 0.5,
    label: id,
  });
  person.state.agenda.commitments = [
    commitment('implicit', START + 20 * MINUTE),
    commitment('named-one', START + 30 * MINUTE),
    commitment('named-two', START + 40 * MINUTE),
  ];
  const run = setup([person]);
  const base = exampleOffers('ada', ['work'])[0];
  if (!base) throw new Error('Missing authored work');
  const work = { ...base, fulfills: ['named-one', 'named-two'] };
  const start = actionRequest(
    need(
      step(run, {
        until: START,
        inputs: openingInputs([{ id: 'ada', offers: [work] }]),
      }),
    ),
    'start',
  );
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
  need(
    step(run, {
      until: end,
      inputs: [
        resolutionInput(finish, 0, {
          disposition: 'completed',
          observations: [],
          outcome: {
            activityId: finish.activityId,
            offerId: work.id,
            actionId: work.actionId,
            start: START,
            end,
            status: 'completed',
            evidenceId: 'two-named-jobs',
            actual: { exposures: [], observedProgress: [] },
            fulfills: work.fulfills,
            advances: [],
          },
        }),
      ],
    }),
  );
  const commitments = actor(run).agenda.commitments;
  expect(commitments.find((item) => item.id === 'named-one')?.status).toBe('kept');
  expect(commitments.find((item) => item.id === 'named-two')?.status).toBe('kept');
  expect(commitments.find((item) => item.id === 'implicit')?.status).toBe('pending');
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});

test('practice decay uses milliseconds and the declared half-life; a cue matches the actual opposed norm', () => {
  const response = { id: 'leave', kind: 'leave' as const, practice: 1, lastUsedAt: 0, cue: 'backbiting' };
  const before = structuredClone(response);
  expect(practiceAt(response, 7 * DAY, 7)).toBeCloseTo(0.5, 12);
  expect(practiceAt(response, 7 * DAY, 60)).toBeGreaterThan(0.9);
  expect(
    responseCueMatches('backbiting', {
      action: 'gossip',
      tags: [],
      opposedBy: 'norm:backbiting',
    }),
  ).toBe(true);
  expect(
    responseCueMatches('steal', {
      action: 'gossip',
      tags: [],
      opposedBy: 'norm:backbiting',
    }),
  ).toBe(false);
  expect(response).toStrictEqual(before);
});
