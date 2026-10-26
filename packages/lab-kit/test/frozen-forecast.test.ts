// @vitest-environment node
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import {
  type ForecastRunMetadata,
  type ForecastStudyBinding,
  type FrozenForecastLabels,
  type FrozenForecastReceipt,
  freezeForecastCohort,
  scoreFrozenForecast,
} from '../src/index.ts';

const binding: ForecastStudyBinding = {
  schemaVersion: 1,
  study: 'hf-goodhands-2026-10-25',
  studySha256: '6138c110243edc1bf06850c4d1bc8743bce7d64ad95526266667d26a52a63bb7',
  registrationSha256: '4f2e9296fc406e1504a5eb6c9885f0e427cfe9f6853ab9f65c24c14736d2b62a',
  forecastSha256: '4466dc907615bf59c32d880aa349f9f9160595537b1037cf4e6d527056b7fdb4',
};
function first<T>(items: readonly T[]): T {
  const value = items[0];
  if (value === undefined) throw new Error('Expected fixture entry');
  return value;
}
function row(i: number, changes: Partial<ForecastRunMetadata> = {}): ForecastRunMetadata {
  return {
    receiptId: `fabricated-receipt-${i}`,
    runId: `fabricated-run-${i}`,
    game: 'goodhands',
    build: 'fixture-build',
    receivedAt: `2026-10-26T01:00:${String(i).padStart(2, '0')}Z`,
    startedAt: '2026-10-25T18:00:00Z',
    provenance: 'human-attested',
    runKind: 'fresh',
    authorization: 'explicit-recording',
    completeDataAvailable: true,
    outcomeLabelsAvailable: true,
    ...changes,
  };
}
it('first_receipt_pins_build_not_start_or_preference', async () => {
  const rows = [
    row(0, { authorization: 'default-capture', build: 'preferred' }),
    row(1, { startedAt: '2026-10-25T20:00:00Z' }),
    row(2, { build: 'preferred' }),
    row(3, { runId: 'fabricated-run-1' }),
    row(4, { runKind: 'import' }),
    ...Array.from({ length: 21 }, (_, i) => row(i + 5)),
    row(29, { build: 'preferred' }),
  ];
  const receipt = await freezeForecastCohort(rows.reverse(), binding);
  expect(receipt.derivedBuild).toBe('fixture-build');
  expect(receipt.selectedRunIds[0]).toBe('fabricated-run-1');
  expect(receipt.selectedRunIds).toHaveLength(20);
  expect(receipt.overflowCount).toBe(2);
  expect(receipt.exclusions).toMatchObject({
    'no-explicit-authorization': 1,
    'other-build': 2,
    'duplicate-run': 1,
    'not-fresh': 1,
  });
  const tie = await freezeForecastCohort(
    [row(1, { receiptId: 'z', build: 'z' }), row(1, { receiptId: 'a', runId: 'a', build: 'a' })],
    binding,
  );
  expect(tie.derivedBuild).toBe('a');
});
it('availability_unknown_is_not_label_unknown', async () => {
  const r = await freezeForecastCohort(
    [row(0, { outcomeLabelsAvailable: null, build: 'wrong' }), row(1)],
    binding,
  );
  expect(r.derivedBuild).toBe('fixture-build');
  expect(r.exclusions['unavailable-labels']).toBe(1);
});
it('exact_freeze_boundary', async () => {
  const r = await freezeForecastCohort(
    [
      row(0, { startedAt: '2026-10-25T17:19:27.729743000Z' }),
      row(1, { startedAt: '2026-10-25T17:19:27.729743001+00:00' }),
      row(2, { startedAt: '2026-10-25T17:19:27.729742999Z' }),
    ],
    binding,
  );
  expect(r.selectedRunIds).toEqual(['fabricated-run-1']);
  expect(r.exclusions['not-after-freeze']).toBe(2);
  for (const startedAt of ['2026-02-30T00:00:00Z', '2026-10-25T17:19:60Z', '2026-10-25T17:19:27.1234567890Z'])
    await expect(freezeForecastCohort([row(0, { startedAt })], binding)).rejects.toThrow('Frozen forecast:');
});
it('bounded_detached_receipt', async () => {
  const rows = [row(0)];
  const original = structuredClone(rows);
  const pending = freezeForecastCohort(rows, binding);
  first(rows).build = 'mutated';
  const r = await pending;
  expect(r.metadata).toEqual(original);
  first(r.metadata).build = 'returned-mutation';
  expect(first(rows).build).toBe('mutated');
  // Independent Node crypto oracle for the sorted-key fixture JSON.
  const canonical = JSON.stringify(original, Object.keys(first(original)).sort());
  expect((await freezeForecastCohort(original, binding)).metadataSha256).toBe(
    createHash('sha256').update(canonical).digest('hex'),
  );
  await expect(freezeForecastCohort([row(0), row(0)], binding)).rejects.toThrow();
  await expect(
    freezeForecastCohort([{ ...row(0), point: 'forbidden' } as ForecastRunMetadata], binding),
  ).rejects.toThrow();
  await expect(
    freezeForecastCohort(original, { ...binding, forecastSha256: '0'.repeat(64) }),
  ).rejects.toThrow();
  await expect(
    freezeForecastCohort(
      Array.from({ length: 10001 }, (_, i) => row(i)),
      binding,
    ),
  ).rejects.toThrow();
});

function labelsFor(receipt: FrozenForecastReceipt, nQ = 20, kQ = 2, nC = 20, kC = 20): FrozenForecastLabels {
  return {
    schemaVersion: 1,
    scope: 'metadata-instrument-only',
    receiptSha256: receipt.receiptSha256,
    labels: receipt.selectedRunIds.map((runId, i) => ({
      runId,
      quit:
        i >= nQ
          ? { evidence: 'unknown', reason: 'absent-declaration' }
          : i < kQ
            ? { evidence: 'voluntary-stop-before-60m-without-completion', point: 'week 1, Saturday' }
            : { evidence: 'explicit-observation-through-60m-without-quit' },
      confusion:
        i >= nC
          ? { evidence: 'unknown', reason: 'technical-failure' }
          : i < kC
            ? { evidence: 'explicit-opening-interview-confusion', point: 'opening interview choice' }
            : { evidence: 'explicit-no-opening-interview-confusion' },
    })),
  };
}
async function cohort() {
  return freezeForecastCohort(
    Array.from({ length: 21 }, (_, i) => row(i)),
    binding,
  );
}
it('unequal_denominators_use_equal_outcome_mean', async () => {
  const receipt = await cohort();
  const labels = labelsFor(receipt, 16, 2, 20, 19);
  const before = structuredClone({ receipt, labels });
  const report = await scoreFrozenForecast(receipt, labels, '2026-10-26');
  expect(report.verdict).toBe('GO');
  expect(report.quit).toMatchObject({ known: 16, positive: 2, unknown: 4, baselineBrier: 0.25 });
  expect(report.confusion.known).toBe(20);
  expect(report.quit.improvement).toBeCloseTo(0.1404320987654321, 14);
  expect(report.confusion.improvement).toBeCloseTo(0.2, 14);
  expect(report.meanBrierImprovement).toBeCloseTo(1103 / 6480, 14);
  expect(report.meanBrierImprovement).not.toBeCloseTo(0.17352537722908093, 6);
  expect({ receipt, labels }).toEqual(before);
  expect(JSON.stringify(report)).not.toContain('fabricated-run');
});
it('inclusive_confusion_rate_boundary', async () => {
  const receipt = await cohort();
  expect((await scoreFrozenForecast(receipt, labelsFor(receipt, 20, 2, 20, 17), '2026-11-03')).verdict).toBe(
    'GO',
  );
  const miss = await scoreFrozenForecast(receipt, labelsFor(receipt, 20, 2, 20, 16), '2026-11-03');
  expect(miss.gates.confusionRate).toBe(false);
  expect(miss.reasons).toContain('confusion-rate-miss');
  const brier = await scoreFrozenForecast(receipt, labelsFor(receipt, 20, 20, 20, 20), '2026-10-26');
  expect(brier.reasons).toContain('brier-miss');
  expect(brier.verdict).toBe('NO_GO_OBSERVED_FAILURE');
});
it('points_missing_differs_from_zero_positives', async () => {
  const receipt = await cohort();
  const labels = labelsFor(receipt);
  first(labels.labels).quit = { evidence: 'voluntary-stop-before-60m-without-completion', point: null };
  expect((await scoreFrozenForecast(receipt, labels, '2026-10-26')).quit.point.status).toBe('pending');
  const negatives = await scoreFrozenForecast(receipt, labelsFor(receipt, 20, 0, 20, 0), '2026-10-26');
  expect(negatives.quit.point).toMatchObject({ status: 'miss', counts: [], modes: [], positives: 0 });
  expect(negatives.verdict).toBe('NO_GO_OBSERVED_FAILURE');
  const tie = labelsFor(receipt);
  first(tie.labels).quit = { evidence: 'voluntary-stop-before-60m-without-completion', point: 'different' };
  expect((await scoreFrozenForecast(receipt, tie, '2026-10-26')).quit.point).toMatchObject({
    status: 'hit',
    modes: ['different', 'week 1, Saturday'],
  });
});
it('deadline_is_explicit', async () => {
  const receipt = await cohort();
  const labels = labelsFor(receipt, 15, 2);
  expect((await scoreFrozenForecast(receipt, labels, '2026-11-02')).verdict).toBe('PENDING');
  expect((await scoreFrozenForecast(receipt, labels, '2026-11-03')).verdict).toBe('NO_GO_MISSING_EVIDENCE');
  const missing = labelsFor(receipt);
  first(missing.labels).confusion = { evidence: 'explicit-opening-interview-confusion', point: null };
  expect((await scoreFrozenForecast(receipt, missing, '2026-11-03')).reasons).toContain(
    'confusion-points-missing',
  );
  const empty = await freezeForecastCohort([], binding);
  const report = await scoreFrozenForecast(empty, labelsFor(empty), '2026-10-26');
  expect(report.quit.known).toBe(0);
  expect(report.quit.improvement).toBeNull();
  expect(report.meanBrierImprovement).toBeNull();
  expect(report.gates.quitRate).toBeNull();
  expect(report.transferTest).toBeNull();
  await expect(scoreFrozenForecast(receipt, labels, '2026-02-30')).rejects.toThrow();
});
it('tampered_receipt_is_rejected', async () => {
  const receipt = await cohort();
  const labels = labelsFor(receipt);
  for (const mutate of [
    (r: FrozenForecastReceipt) => {
      r.selectedRunIds[0] = 'fabricated-run-20';
    },
    (r: FrozenForecastReceipt) => {
      r.derivedBuild = 'other';
    },
    (r: FrozenForecastReceipt) => {
      r.overflowCount++;
    },
    (r: FrozenForecastReceipt) => {
      r.metadataSha256 = '0'.repeat(64);
    },
    (r: FrozenForecastReceipt) => {
      r.receiptSha256 = '0'.repeat(64);
    },
  ]) {
    const r = structuredClone(receipt);
    mutate(r);
    await expect(scoreFrozenForecast(r, labels, '2026-10-26')).rejects.toThrow();
  }
  const missing = structuredClone(labels);
  missing.labels.pop();
  await expect(scoreFrozenForecast(receipt, missing, '2026-10-26')).rejects.toThrow();
  const unselected = structuredClone(labels);
  first(unselected.labels).runId = 'fabricated-run-20';
  await expect(scoreFrozenForecast(receipt, unselected, '2026-10-26')).rejects.toThrow();
  const generic = structuredClone(labels);
  first(generic.labels).quit = { evidence: 'stop' } as never;
  await expect(scoreFrozenForecast(receipt, generic, '2026-10-26')).rejects.toThrow();
  const pending = scoreFrozenForecast(receipt, labels, '2026-10-26');
  labels.labels.pop();
  receipt.derivedBuild = 'mutated';
  expect((await pending).verdict).toBe('GO');
});
it('rejects_non_JSON_and_out_of_bound_inputs', async () => {
  const base = row(0);
  const accessor = { ...base };
  Object.defineProperty(accessor, 'runId', {
    get() {
      throw Error('must not invoke');
    },
    enumerable: true,
  });
  const cycle = { ...base, cycle: {} };
  cycle.cycle = cycle;
  for (const input of [
    [accessor],
    [cycle],
    [Object.assign(Object.create({}), base)],
    [{ ...base, runId: 'x'.repeat(129) }],
    new Array(1),
    [{ ...base, runId: undefined }],
    [{ ...base, receivedAt: '2026-10-24T00:00:00Z' }],
  ])
    await expect(freezeForecastCohort(input as ForecastRunMetadata[], binding)).rejects.toThrow(
      'Frozen forecast:',
    );
});
