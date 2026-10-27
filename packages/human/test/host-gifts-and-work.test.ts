/** Host stock changes and separately addressed evidence settle through the actual receipt boundary. */
import { expect, test } from 'vitest';
import { giftSettlement, giftStock } from '../examples/host-gifts-and-work-control.ts';
import { exportRun, step } from '../src/index.ts';
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

test('a completed gift conserves host stock and delivers separate recipient evidence exactly once', () => {
  const spec = exampleSpec();
  spec.world.hostState = { stock: { ada: 3, bora: 0 } };
  const base = exampleOffers('ada', ['work'])[0];
  if (!base) throw new Error('Missing offer authoring');
  spec.definitions.actions = [
    ...spec.definitions.actions,
    {
      id: 'gift',
      label: 'give food',
      demands: base.demands,
      tags: [],
      norms: [],
    },
  ];
  const gift = {
    ...base,
    id: 'give-food',
    actionId: 'gift',
    label: 'give food',
    target: 'bora',
    durationMs: 10 * MINUTE,
  };
  const run = setup([authoredPerson('ada', 'Ada'), authoredPerson('bora', 'Bora', 'male')], spec);
  const start = actionRequest(
    need(
      step(run, {
        until: START,
        inputs: openingInputs([{ id: 'ada', offers: [gift] }]),
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
  expect(exportRun(run).current.world.hostState).toStrictEqual({ stock: { ada: 3, bora: 0 } });
  const end = START + gift.durationMs;
  const finish = actionRequest(need(step(run, { until: end, inputs: [] })), 'finish');
  expect(exportRun(run).current.world.hostState).toStrictEqual({ stock: { ada: 3, bora: 0 } });
  const current = exportRun(run),
    active = actor(run).activity;
  if (!active) throw new Error('Missing accepted gift activity');
  const prepared = giftSettlement(current.current.world, finish, active, 'bora');
  const recipientSummary = prepared.observations[0]?.percepts[0]?.summary;
  if (!recipientSummary) throw new Error('Missing separate gift evidence');
  // Preparing a receipt is pure. Neither host inventory nor the live run has changed yet.
  expect(exportRun(run)).toStrictEqual(current);
  const receipt = {
    id: 'host:gift-completed',
    at: end,
    source: { type: 'host' as const, id: 'world' },
    kind: 'action.resolved' as const,
    payload: prepared,
  };
  need(step(run, { until: end, inputs: [receipt] }));
  expect(exportRun(run).current.world.hostState).toStrictEqual({ stock: { ada: 1, bora: 2 } });
  expect(
    actor(run, 'bora').memory.episodes.filter((episode) => episode.summary === recipientSummary),
  ).toHaveLength(1);
  const archive = exportRun(run);
  expect(archive.current.receipts.settlements.filter((item) => item.requestId === finish.id)).toHaveLength(1);
  expect(step(run, { until: end, inputs: [receipt] }).ok).toBe(false);
  expect(exportRun(run)).toStrictEqual(archive);
});

test('failed work earns no task progress and the host can abandon the obsolete task by ordinary input', () => {
  const person = authoredPerson('ada', 'Ada');
  person.state.agenda.goals = [
    {
      id: 'task',
      label: 'repair the bench',
      serves: ['competence'],
      progress: 0,
      advancedBy: [{ action: 'work', amount: 0.5 }],
      importance: 0.5,
      baseImportance: 0.5,
      completionHalfLifeMs: 30 * 86_400_000,
    },
  ];
  const run = setup([person]),
    work = exampleOffers('ada', ['work'])[0];
  if (!work) throw new Error('Missing work');
  const start = actionRequest(
    need(step(run, { until: START, inputs: openingInputs([{ id: 'ada', offers: [work] }]) })),
    'start',
  );
  need(
    step(run, {
      until: START,
      inputs: [resolutionInput(start, 0, { disposition: 'accepted', observations: [] })],
    }),
  );
  const end = START + work.durationMs;
  const finish = actionRequest(need(step(run, { until: end, inputs: [] })), 'finish');
  need(
    step(run, {
      until: end,
      inputs: [
        resolutionInput(finish, 0, {
          disposition: 'failed',
          observations: [],
          outcome: {
            activityId: finish.activityId,
            offerId: work.id,
            actionId: work.actionId,
            start: START,
            end,
            status: 'failed',
            evidenceId: 'failed:repair',
            actual: { exposures: [], observedProgress: [] },
            fulfills: [],
            advances: ['task'],
          },
        }),
      ],
    }),
  );
  expect(actor(run).agenda.goals.find((goal) => goal.id === 'task')?.progress).toBe(0);
  need(
    step(run, {
      until: end + 1,
      inputs: [
        {
          id: 'host:abandon',
          at: end + 1,
          source: { type: 'host', id: 'world' },
          kind: 'agenda.requested',
          payload: { person: 'ada', request: { type: 'abandon-goal', goalId: 'task' } },
        },
      ],
    }),
  );
  expect(actor(run).agenda.goals.find((goal) => goal.id === 'task')?.status).toBe('abandoned');
});

/** A real started activity for the shortage/interrupt controls, with the same authored host schema. */
function startedGift() {
  const spec = exampleSpec(),
    base = exampleOffers('ada', ['work'])[0];
  if (!base) throw new Error('Missing authored work');
  spec.world.hostState = { stock: { ada: 3, bora: 0 } };
  spec.definitions.actions = [
    ...spec.definitions.actions,
    { id: 'gift', label: 'give food', demands: base.demands, tags: [], norms: [] },
  ];
  const offer = { ...base, id: 'give-food', actionId: 'gift', target: 'bora', durationMs: 10 * MINUTE };
  const run = setup([authoredPerson('ada', 'Ada'), authoredPerson('bora', 'Bora', 'male')], spec);
  const start = actionRequest(
    need(step(run, { until: START, inputs: openingInputs([{ id: 'ada', offers: [offer] }]) })),
    'start',
  );
  need(
    step(run, {
      until: START,
      inputs: [resolutionInput(start, 0, { disposition: 'accepted', observations: [] })],
    }),
  );
  return { run, start, end: START + offer.durationMs };
}
function finishWithStock(remaining: number) {
  const { run, end } = startedGift(),
    at = START + 4 * MINUTE;
  need(
    step(run, {
      until: at,
      inputs: [
        {
          id: 'host:other-consumption',
          at,
          source: { type: 'host', id: 'world' },
          kind: 'world.changed',
          payload: {
            expectedRevision: 0,
            revision: 1,
            put: [],
            remove: [],
            hostState: { stock: { ada: remaining, bora: 0 } },
          },
        },
      ],
    }),
  );
  const finish = actionRequest(need(step(run, { until: end, inputs: [] })), 'finish');
  const current = exportRun(run),
    active = actor(run).activity;
  if (!active) throw new Error('Missing actual gift activity');
  const payload = giftSettlement(current.current.world, finish, active, 'bora');
  expect(exportRun(run)).toStrictEqual(current);
  need(
    step(run, {
      until: end,
      inputs: [
        {
          id: 'host:gift-finish',
          at: end,
          source: { type: 'host', id: 'world' },
          kind: 'action.resolved',
          payload,
        },
      ],
    }),
  );
  return { run, payload, stock: giftStock(exportRun(run).current.world, 'ada', 'bora') };
}

test('completion revalidates current stock: partial delivery conserves it and empty stock delivers nothing', () => {
  const reduced = finishWithStock(1);
  expect(reduced.payload.disposition).toBe('completed');
  expect(reduced.stock).toStrictEqual({ from: 0, to: 1 });
  expect(reduced.payload.observations[0]?.percepts).toHaveLength(1);
  expect(reduced.payload.outcome?.quality).toBe(0.5);
  const empty = finishWithStock(0);
  expect(empty.payload.disposition).toBe('failed');
  expect(empty.stock).toStrictEqual({ from: 0, to: 0 });
  expect(empty.payload.observations).toStrictEqual([]);
  expect(actor(empty.run, 'bora').memory.episodes.some((episode) => episode.kind === 'gift')).toBe(false);
});

test('an early ordinary boundary cannot finish a gift; an actual interruption transfers nothing', () => {
  const { run, start } = startedGift();
  const early = need(step(run, { until: START + 4 * MINUTE, inputs: [] }));
  expect(early.boundary.type).toBe('until');
  expect(giftStock(exportRun(run).current.world, 'ada', 'bora')).toStrictEqual({ from: 3, to: 0 });
  const at = START + 5 * MINUTE;
  const request = actionRequest(
    need(
      step(run, {
        until: at,
        inputs: [
          {
            id: 'host:gift-interrupt',
            at,
            source: { type: 'host', id: 'world' },
            kind: 'activity.interrupted',
            payload: { person: 'ada', activityId: start.activityId, reason: 'host interruption' },
          },
        ],
      }),
    ),
    'interrupt',
  );
  const current = exportRun(run),
    active = actor(run).activity;
  if (!active) throw new Error('Missing actual interrupted gift');
  const payload = giftSettlement(current.current.world, request, active, 'bora');
  expect(payload.disposition).toBe('interrupted');
  expect(payload.observations).toStrictEqual([]);
  need(
    step(run, {
      until: at,
      inputs: [
        {
          id: 'host:gift-interrupted',
          at,
          source: { type: 'host', id: 'world' },
          kind: 'action.resolved',
          payload,
        },
      ],
    }),
  );
  expect(giftStock(exportRun(run).current.world, 'ada', 'bora')).toStrictEqual({ from: 3, to: 0 });
});
