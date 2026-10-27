/** Retained host-promise integration. Other original findings have explicit mappings or OPEN rows in TESTCASE-FATES. */
import { expect, test } from 'vitest';
import { exportRun, step } from '../src/index.ts';
import {
  actionRequest,
  actor,
  exampleOffers,
  MINUTE,
  need,
  openingInputs,
  resolutionInput,
  START,
  setup,
} from './support.ts';

function proposedWork() {
  const run = setup(),
    base = exampleOffers('ada', ['work'])[0];
  if (!base) throw new Error('Missing authored work');
  const offer = {
    ...base,
    promise: {
      id: 'promised-shift',
      kind: 'job' as const,
      actions: ['work'],
      from: START,
      until: START + base.durationMs + 5 * MINUTE,
      importance: 0.8,
      label: 'finish the shift',
    },
    fulfills: ['promised-shift'],
  };
  const request = actionRequest(
    need(step(run, { until: START, inputs: openingInputs([{ id: 'ada', offers: [offer] }]) })),
    'start',
  );
  return { run, offer, request };
}

test('a host promise is pending only after accepted start and kept only after actual completion', () => {
  const { run, offer, request } = proposedWork();
  expect(actor(run).agenda.commitments.find((item) => item.id === offer.promise.id)).toBeUndefined();
  need(
    step(run, {
      until: START,
      inputs: [resolutionInput(request, 0, { disposition: 'accepted', observations: [] })],
    }),
  );
  expect(actor(run).agenda.commitments.find((item) => item.id === offer.promise.id)?.status).toBe('pending');
  const end = START + offer.durationMs;
  const finish = actionRequest(need(step(run, { until: end, inputs: [] })), 'finish');
  expect(actor(run).agenda.commitments.find((item) => item.id === offer.promise.id)?.status).toBe('pending');
  const input = resolutionInput(finish, 0, {
    disposition: 'completed',
    observations: [],
    outcome: {
      activityId: finish.activityId,
      offerId: offer.id,
      actionId: offer.actionId,
      start: START,
      end,
      status: 'completed',
      evidenceId: 'actual-promised-work',
      actual: { exposures: [], observedProgress: [] },
      fulfills: offer.fulfills,
      advances: [],
    },
  });
  need(step(run, { until: end, inputs: [input] }));
  const kept = actor(run).agenda.commitments.filter((item) => item.id === offer.promise.id);
  expect(kept).toHaveLength(1);
  expect(kept[0]?.status).toBe('kept');
  const archive = exportRun(run);
  expect(step(run, { until: end, inputs: [input] }).ok).toBe(false);
  expect(exportRun(run)).toStrictEqual(archive);
});

test('a rejected start creates no promise and cannot be counted as completed work', () => {
  const { run, offer, request } = proposedWork();
  need(
    step(run, {
      until: START,
      inputs: [resolutionInput(request, 0, { disposition: 'rejected', observations: [] })],
    }),
  );
  expect(actor(run).agenda.commitments.find((item) => item.id === offer.promise.id)).toBeUndefined();
  expect(actor(run).activity).toBeNull();
  expect(
    actor(run).memory.episodes.some((episode) => episode.kind === 'outcome' && episode.action === 'work'),
  ).toBe(false);
  expect(exportRun(run).current.pending.some((item) => item.id === request.id)).toBe(false);
});
