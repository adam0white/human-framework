import { expect, test } from 'vitest';
import { exportRun, inspect, step } from '../src/index.ts';
import type { ObservedOutcome } from '../src/run-schema.ts';
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

test('actual interrupted work charges only elapsed skill practice once through the public receipt boundary', () => {
  const spec = exampleSpec(),
    person = authoredPerson('ada', 'Ada');
  spec.definitions.skills = [{ id: 'craft', label: 'craft', domain: 'motor' }];
  person.state.skills = [{ id: 'craft', level: 0.2, practicedMs: 0, lastPracticed: START }];
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
  const base = exampleOffers('ada', ['work'])[0];
  if (!base) throw new Error('Missing authored work');
  const work = {
    ...base,
    durationMs: 120 * MINUTE,
    demands: {
      ...base.demands,
      effort: 0.1,
      skill: { id: 'craft', difficulty: 0.3, domain: 'motor' as const },
    },
  };
  spec.definitions.actions = spec.definitions.actions.map((action) =>
    action.id === 'work' ? { ...action, demands: work.demands } : action,
  );
  const run = setup([person], spec);
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
  const at = START + 90 * MINUTE;
  const interrupted = actionRequest(
    need(
      step(run, {
        until: at,
        inputs: [
          {
            id: 'host:interrupt',
            at,
            source: { type: 'host', id: 'world' },
            kind: 'activity.interrupted',
            payload: {
              person: 'ada',
              activityId: start.activityId,
              reason: 'actual pause after ninety minutes',
            },
          },
        ],
      }),
    ),
    'interrupt',
  );
  expect(interrupted.boundaryAt).toBe(at);
  const outcome: ObservedOutcome = {
    activityId: start.activityId,
    offerId: work.id,
    actionId: work.actionId,
    start: START,
    end: at,
    status: 'interrupted',
    evidenceId: 'elapsed-work',
    actual: { exposures: [], observedProgress: [] },
    fulfills: [],
    advances: [],
  };
  const receipt = resolutionInput(interrupted, 0, { disposition: 'interrupted', observations: [], outcome });
  need(step(run, { until: at, inputs: [receipt] }));
  expect(actor(run).skills.craft?.practicedMs).toBe(90 * MINUTE);
  expect(actor(run).skills.craft?.level ?? 0).toBeGreaterThan(0.2);
  expect(actor(run).agenda.goals.find((goal) => goal.id === 'task')?.progress).toBe(0);
  const hash = exportRun(run).hashes.full;
  expect(step(run, { until: at, inputs: [receipt] }).ok).toBe(false);
  expect(exportRun(run).hashes.full).toBe(hash);
});

test('an actual failed injury outcome raises perceived pain and leaves one negative outcome memory', () => {
  const run = setup(),
    offers = exampleOffers('ada', ['work']);
  const work = offers[0];
  if (!work) throw new Error('Missing work');
  const start = actionRequest(
    need(step(run, { until: START, inputs: openingInputs([{ id: 'ada', offers }]) })),
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
  const receipt = resolutionInput(finish, 0, {
    disposition: 'failed',
    observations: [],
    outcome: {
      activityId: finish.activityId,
      offerId: work.id,
      actionId: work.actionId,
      start: START,
      end,
      status: 'failed',
      evidenceId: 'injured-work',
      summary: 'I hurt my leg while working.',
      actual: {
        injury: { part: 'leg', severity: 0.5, healRatePerDay: 0.1 },
        exposures: [],
        observedProgress: [],
      },
      fulfills: [],
      advances: [],
    },
  });
  need(step(run, { until: end, inputs: [receipt] }));
  expect(actor(run).body.injuries).toHaveLength(1);
  const view = need(inspect(run, { perspective: { kind: 'host' }, people: ['ada'], select: ['body'] }));
  const person = view.people[0];
  if (person?.kind !== 'host') throw new Error('Missing host body view');
  const body = person.parts.find((part) => part.select === 'body');
  if (body?.select !== 'body') throw new Error('Missing selected body');
  expect(body.value.readout.pain).toBeGreaterThan(0);
  const memories = actor(run).memory.episodes.filter(
    (episode) => episode.kind === 'outcome' && episode.action === 'work',
  );
  expect(memories).toHaveLength(1);
  expect(memories[0]?.valence ?? 0).toBeLessThan(0);
  const hash = exportRun(run).hashes.full;
  expect(step(run, { until: end, inputs: [receipt] }).ok).toBe(false);
  expect(exportRun(run).hashes.full).toBe(hash);
});

test('a missed ordinary job still leaves a missed episode, distress and an esteem cost', () => {
  const person = authoredPerson('ada', 'Ada');
  person.state.agenda.commitments = [
    {
      id: 'job',
      kind: 'job',
      actions: ['work'],
      from: START,
      until: START + MINUTE,
      importance: 0.8,
      label: 'finish the shift',
    },
  ];
  const run = setup([person]),
    control = setup();
  need(step(run, { until: START + 2 * MINUTE, inputs: [] }));
  need(step(control, { until: START + 2 * MINUTE, inputs: [] }));
  const current = actor(run),
    unchanged = actor(control);
  expect(current.agenda.commitments.find((commitment) => commitment.id === 'job')?.status).toBe('broken');
  expect(current.memory.episodes.some((episode) => episode.kind === 'missed')).toBe(true);
  expect(current.affect.emotions.some((emotion) => emotion.id === 'distress' && emotion.intensity > 0)).toBe(
    true,
  );
  expect(current.needs.esteem).toBeLessThan(unchanged.needs.esteem);
});
