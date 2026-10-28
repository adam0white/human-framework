/** An accepted sleep interval ends through its actual settlement, without fabricated wake evidence. */
import { expect, test } from 'vitest';
import type { ActionRequest, Offer, Run } from '../src/index.ts';
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

function resident(mode: 'sleep' | 'awake' = 'sleep', exhausted = false, asleep = false, duty = false) {
  const person = authoredPerson('ada', 'Ada');
  person.state.body.sleepPressure = exhausted ? 1 : 0.6;
  person.state.body.asleep = asleep;
  if (exhausted) {
    person.state.body.sleepDebtHours = 48;
    person.state.body.doze.context = { posture: 'seated', stimulation: 0 };
  }
  if (duty)
    person.state.agenda.commitments = [
      {
        id: 'work-duty',
        kind: 'duty',
        actions: ['work'],
        from: START,
        until: START + 90 * MINUTE,
        importance: 1,
      },
    ];
  const run = setup([person], exampleSpec(7));
  const offer = exampleOffers('ada', ['rest'])[0];
  if (!offer) throw new Error('Missing authored offer');
  offer.id = 'interval';
  offer.durationMs = 450 * MINUTE;
  offer.demands.mode = mode;
  offer.expected.needs = mode === 'sleep' ? { sleep: 0.8, rest: 0.5 } : { rest: 0.3 };
  return { run, offer };
}
function begin(run: Run, offer: Offer) {
  const request = actionRequest(
    need(step(run, { until: START, inputs: openingInputs([{ id: 'ada', offers: [offer] }]) })),
    'start',
  );
  need(
    step(run, {
      until: START,
      inputs: [resolutionInput(request, 0, { disposition: 'accepted', observations: [] })],
    }),
  );
  need(
    step(run, {
      until: START + 1,
      inputs: [
        {
          id: 'withdraw',
          at: START + 1,
          source: { type: 'host', id: 'world' },
          kind: 'offers.received',
          payload: { person: 'ada', revision: 2, offers: [] },
        },
      ],
    }),
  );
}
function settlement(request: ActionRequest, status: 'completed' | 'interrupted' | 'failed') {
  return resolutionInput(request, 0, {
    disposition: status,
    observations: [],
    outcome: {
      activityId: request.activityId,
      offerId: request.offerId,
      actionId: 'rest',
      start: START,
      end: request.boundaryAt,
      status,
      evidenceId: `actual:${request.id}`,
      actual: { exposures: [], observedProgress: [] },
      fulfills: [],
      advances: [],
    },
  });
}
function settle(run: Run, request: ActionRequest, status: 'completed' | 'interrupted' | 'failed') {
  return need(step(run, { until: request.boundaryAt, inputs: [settlement(request, status)] }));
}

test('completed voluntary sleep permits an ordinary awake choice and restores/replays exactly', () => {
  const { run, offer } = resident();
  begin(run, offer);
  need(step(run, { until: START + 60 * MINUTE, inputs: [] }));
  expect(actor(run).body.asleep).toBe(true);
  expect(actor(run).body.doze.since).toBeUndefined();
  const finish = actionRequest(need(step(run, { until: START + offer.durationMs, inputs: [] })), 'finish');
  expect(actor(run).body.asleep).toBe(true);
  const checkpoint = exportRun(run),
    restored = need(restoreRun(JSON.parse(JSON.stringify(checkpoint))));
  const future = settlement(finish, 'completed');
  if (!future.payload.outcome) throw new Error('Missing actual outcome');
  future.payload.outcome.end += 1;
  expect(step(run, { until: finish.boundaryAt, inputs: [future] }).ok).toBe(false);
  expect(exportRun(run)).toStrictEqual(checkpoint);
  const result = settle(run, finish, 'completed');
  settle(restored, finish, 'completed');
  expect(actor(run).activity).toBeNull();
  expect(actor(run).body.asleep).toBe(false);
  expect(actor(run).body.lastSleep).toStrictEqual({ from: START, to: finish.boundaryAt });
  expect(actor(run).body.since).toBe(finish.boundaryAt);
  expect(actor(run).rng).toStrictEqual(checkpoint.current.people.ada?.rng);
  expect(actor(run).randomIdentity).toStrictEqual(checkpoint.current.people.ada?.randomIdentity);
  expect(
    result.events.some(
      (event) =>
        event.data.kind === 'body-change' &&
        event.data.change.kind === 'woke' &&
        event.data.change.evidenceId === `actual:${finish.id}`,
    ),
  ).toBe(true);
  expect(exportRun(restored)).toStrictEqual(exportRun(run));
  const awake = exampleOffers('ada', ['rest'])[0];
  if (!awake) throw new Error('Missing awake offer');
  awake.id = 'after-sleep';
  awake.expected.needs = { food: 0.5, water: 0.4 };
  const at = finish.boundaryAt + 1;
  const next = need(
    step(run, {
      until: at,
      inputs: [
        {
          id: 'awake-book',
          at,
          source: { type: 'host', id: 'world' },
          kind: 'offers.received',
          payload: { person: 'ada', revision: 3, offers: [awake] },
        },
        {
          id: 'awake-choice',
          at,
          source: { type: 'host', id: 'world' },
          kind: 'decision.requested',
          payload: { person: 'ada', offerRevision: 3, reason: 'after sleep', treatment: 'ordinary' },
        },
      ],
    }),
  );
  expect(actionRequest(next, 'start').offerId).toBe('after-sleep');
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});

test('rejecting an unstarted sleep offer cannot wake an already sleeping person', () => {
  const { run, offer } = resident('sleep', false, true);
  const request = actionRequest(
    need(step(run, { until: START, inputs: openingInputs([{ id: 'ada', offers: [offer] }]) })),
    'start',
  );
  const before = actor(run).body;
  const result = need(
    step(run, {
      until: START,
      inputs: [resolutionInput(request, 0, { disposition: 'rejected', observations: [] })],
    }),
  );
  expect(actor(run).activity).toBeNull();
  expect(actor(run).body).toStrictEqual(before);
  expect(
    result.events.some((event) => event.data.kind === 'body-change' && event.data.change.kind === 'woke'),
  ).toBe(false);
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});

test('interrupted and failed voluntary sleep end only when their actual terminal outcomes settle', () => {
  for (const status of ['interrupted', 'failed'] as const) {
    const { run, offer } = resident();
    begin(run, offer);
    const at = START + 30 * MINUTE;
    const request = actionRequest(
      need(
        step(run, {
          until: at,
          inputs: [
            {
              id: 'stop',
              at,
              source: { type: 'host', id: 'world' },
              kind: 'activity.interrupted',
              payload: {
                person: 'ada',
                activityId: actor(run).activity?.id ?? '',
                reason: 'actual host interruption',
              },
            },
          ],
        }),
      ),
      'interrupt',
    );
    expect(actor(run).body.asleep).toBe(true);
    settle(run, request, status);
    expect(actor(run).body.asleep).toBe(false);
    expect(actor(run).body.lastSleep).toStrictEqual({ from: START, to: at });
    const archive = exportRun(run);
    expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
  }
});

test('settling an awake interval interrupted by actual involuntary doze does not wake the doze', () => {
  const { run, offer } = resident('awake', true);
  begin(run, offer);
  const result = need(step(run, { until: START + 120 * MINUTE, inputs: [] }));
  const interrupted = actionRequest(result, 'interrupt');
  const before = actor(run).body;
  expect(before.asleep).toBe(true);
  expect(before.doze.since).toBeDefined();
  settle(run, interrupted, 'interrupted');
  expect(actor(run).body.asleep).toBe(true);
  expect(actor(run).body.doze.since).toBe(before.doze.since);
  const quietAt = interrupted.boundaryAt + MINUTE;
  need(step(run, { until: quietAt, inputs: [] }));
  expect(actor(run).body.doze.since).toBe(before.doze.since);
  const checkpoint = exportRun(run),
    restored = need(restoreRun(JSON.parse(JSON.stringify(checkpoint))));
  const at = quietAt + 1;
  const observation = {
    id: 'actual-alarm',
    at,
    source: { type: 'host' as const, id: 'world' },
    kind: 'observation.received' as const,
    payload: {
      person: 'ada',
      evidenceId: 'actual-alarm-evidence',
      percepts: [
        {
          id: 'alarm',
          occurredAt: at,
          channel: 'heard' as const,
          kind: 'alarm',
          targetId: 'ada',
          salience: 1,
          summary: 'A nearby alarm rings.',
          near: true,
          claims: [],
          norms: [],
          advice: [],
          consequences: [],
          withdrawConsequences: [],
          witnesses: [],
          reports: [],
          provenance: [],
        },
      ],
    },
  };
  const alarmResult = need(step(run, { until: at, inputs: [observation] }));
  need(step(restored, { until: at, inputs: [observation] }));
  expect(
    alarmResult.events.some(
      (event) => event.data.kind === 'observation-attended' && event.data.perceptId === 'alarm',
    ),
  ).toBe(true);
  expect(actor(run).body.asleep).toBe(false);
  expect(actor(run).body.doze.since).toBeUndefined();
  expect(actor(run).body.lastSleep).toStrictEqual({ from: before.since, to: at });
  expect(
    alarmResult.events.some(
      (event) =>
        event.data.kind === 'body-change' &&
        event.data.change.kind === 'woke' &&
        event.data.change.evidenceId === 'alarm',
    ),
  ).toBe(true);
  expect(exportRun(restored)).toStrictEqual(exportRun(run));
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});

test('sleep outcome receipts keep their sleeping-interval semantics before waking; an awake interval can void', () => {
  for (const mode of ['sleep', 'awake'] as const) {
    const { run, offer } = resident(mode);
    begin(run, offer);
    const finish = actionRequest(need(step(run, { until: START + offer.durationMs, inputs: [] })), 'finish');
    const fillBefore = actor(run).body.bladder.fill;
    expect(fillBefore).toBeGreaterThan(0);
    const receipt = settlement(finish, 'completed');
    if (!receipt.payload.outcome) throw new Error('Missing actual outcome');
    receipt.payload.outcome.actual.voidedBladder = true;
    const result = need(step(run, { until: finish.boundaryAt, inputs: [receipt] }));
    expect(actor(run).body.asleep).toBe(false);
    expect(actor(run).body.bladder.fill).toBe(mode === 'sleep' ? fillBefore : 0);
    expect(
      result.events.some((event) => event.data.kind === 'body-change' && event.data.change.kind === 'voided'),
    ).toBe(mode === 'awake');
    const archive = exportRun(run);
    expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
  }
});

test('an actually accepted awake choice ends genuine doze for a pressing duty', () => {
  const { run, offer } = resident('awake', true, false, true);
  begin(run, offer);
  const interrupted = actionRequest(
    need(step(run, { until: START + 120 * MINUTE, inputs: [] })),
    'interrupt',
  );
  settle(run, interrupted, 'interrupted');
  const quietAt = interrupted.boundaryAt + MINUTE;
  need(step(run, { until: quietAt, inputs: [] }));
  const before = actor(run).body;
  expect(before.asleep).toBe(true);
  expect(before.doze.since).toBeDefined();
  const work = exampleOffers('ada', ['work'])[0];
  if (!work) throw new Error('Missing awake offer');
  work.durationMs = MINUTE;
  work.demands.effort = 0;
  work.fulfills = ['work-duty'];
  work.expected.needs = { esteem: 1, competence: 1 };
  const at = quietAt + 1;
  const start = actionRequest(
    need(
      step(run, {
        until: at,
        inputs: [
          {
            id: 'work-book',
            at,
            source: { type: 'host', id: 'world' },
            kind: 'offers.received',
            payload: { person: 'ada', revision: 3, offers: [work] },
          },
          {
            id: 'work-choice',
            at,
            source: { type: 'host', id: 'world' },
            kind: 'decision.requested',
            payload: { person: 'ada', offerRevision: 3, reason: 'pressing duty', treatment: 'ordinary' },
          },
        ],
      }),
    ),
    'start',
  );
  expect(actor(run).body.asleep).toBe(true);
  const checkpoint = exportRun(run),
    restored = need(restoreRun(JSON.parse(JSON.stringify(checkpoint))));
  const rejected = need(restoreRun(JSON.parse(JSON.stringify(checkpoint))));
  const rejection = need(
    step(rejected, {
      until: at,
      inputs: [resolutionInput(start, 0, { disposition: 'rejected', observations: [] })],
    }),
  );
  expect(actor(rejected).body.asleep).toBe(true);
  expect(actor(rejected).body.doze.since).toBe(before.doze.since);
  expect(rejection.events.some((e) => e.data.kind === 'body-change' && e.data.change.kind === 'woke')).toBe(
    false,
  );
  const acceptance = resolutionInput(start, 0, { disposition: 'accepted', observations: [] });
  const accepted = need(step(run, { until: at, inputs: [acceptance] }));
  need(step(restored, { until: at, inputs: [acceptance] }));
  expect(actor(run).body.asleep).toBe(false);
  expect(actor(run).body.doze.since).toBeUndefined();
  expect(actor(run).body.lastSleep).toStrictEqual({ from: before.since, to: at });
  expect(actor(run).body.since).toBe(at);
  expect(
    accepted.events.some(
      (e) =>
        e.data.kind === 'body-change' &&
        e.data.change.kind === 'woke' &&
        e.data.change.evidenceId === acceptance.id,
    ),
  ).toBe(true);
  expect(exportRun(restored)).toStrictEqual(exportRun(run));
  const finish = actionRequest(need(step(run, { until: at + MINUTE, inputs: [] })), 'finish');
  expect(actor(run).body.asleep).toBe(false);
  const receipt = settlement(finish, 'completed');
  if (!receipt.payload.outcome) throw new Error('Missing outcome');
  receipt.payload.outcome.actionId = 'work';
  receipt.payload.outcome.start = at;
  receipt.payload.outcome.fulfills = ['work-duty'];
  need(step(run, { until: finish.boundaryAt, inputs: [receipt] }));
  expect(actor(run).body.asleep).toBe(false);
  expect(actor(run).agenda.commitments.find((c) => c.id === 'work-duty')?.status).toBe('kept');
  for (const current of [run, rejected]) {
    const archive = exportRun(current);
    expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
  }
});
