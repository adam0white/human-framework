/** One fabricated headless instrument control. No human observations, rounds, model or clock. */
import { readFile } from 'node:fs/promises';
import {
  type ForecastRunMetadata,
  type FrozenForecastLabels,
  freezeForecastCohort,
  scoreFrozenForecast,
} from '../packages/lab-kit/src/frozen-forecast.ts';
import { fail, object, snapshot } from '../packages/lab-kit/src/frozen-forecast-json.ts';
import { readFrozenStudy } from './frozen-forecast-study.ts';
export async function runFrozenForecastControl(): Promise<{ scope: 'synthetic-control'; passed: true }> {
  const bytes = await readFile(
    new URL('../docs/lab/experiments/fixtures/hf-forecast/synthetic-control.json', import.meta.url),
  );
  if (bytes.length > 8 * 1024 * 1024) fail('control-size');
  const fixture = snapshot(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))) as {
    schemaVersion: 1;
    scope: 'synthetic-control';
    description: string;
    metadata: ForecastRunMetadata[];
    labelViews: Record<'go' | 'wrongPoints' | 'missingEvidence', FrozenForecastLabels['labels']>;
  };
  object(fixture, ['schemaVersion', 'scope', 'description', 'metadata', 'labelViews']);
  object(fixture.labelViews, ['go', 'wrongPoints', 'missingEvidence']);
  const check = (value: boolean) => {
    if (!value) fail('control-failed');
  };
  check(fixture.schemaVersion === 1 && fixture.scope === 'synthetic-control');
  const binding = await readFrozenStudy();
  const receipt = await freezeForecastCohort(fixture.metadata, binding);
  const before = JSON.stringify(receipt);
  check(
    receipt.derivedBuild === 'fabricated-first-build' &&
      receipt.selectedRunIds.length === 20 &&
      receipt.selectedRunIds[0] === 'fabricated-run-1',
  );
  check(
    receipt.exclusions['unavailable-labels'] === 1 &&
      receipt.exclusions['other-build'] === 1 &&
      receipt.exclusions['no-explicit-authorization'] === 1 &&
      receipt.exclusions['not-fresh'] === 1 &&
      receipt.exclusions.synthetic === 1 &&
      receipt.exclusions['duplicate-run'] === 1 &&
      receipt.overflowCount === 1,
  );
  // Both reversed input and earlier-start/later-receipt preferred build retain receipt-first selection.
  const reversed = await freezeForecastCohort([...fixture.metadata].reverse(), binding);
  check(JSON.stringify(reversed) === before);
  const score = (view: keyof typeof fixture.labelViews, reviewDate: string) =>
    scoreFrozenForecast(
      receipt,
      {
        schemaVersion: 1,
        scope: 'synthetic-control',
        receiptSha256: receipt.receiptSha256,
        labels: fixture.labelViews[view],
      },
      reviewDate,
    );
  const go = await score('go', '2026-10-26');
  const failure = await score('wrongPoints', '2026-10-26');
  const pending = await score('missingEvidence', '2026-11-02');
  const deadline = await score('missingEvidence', '2026-11-03');
  check(
    go.verdict === 'GO' &&
      go.quit.baselineBrier === 0.25 &&
      go.confusion.baselineBrier === 0.25 &&
      go.meanBrierImprovement !== null &&
      go.meanBrierImprovement > 0,
  );
  check(
    failure.verdict === 'NO_GO_OBSERVED_FAILURE' &&
      failure.reasons.includes('quit-point-miss') &&
      failure.reasons.includes('confusion-point-miss'),
  );
  check(
    pending.verdict === 'PENDING' &&
      deadline.verdict === 'NO_GO_MISSING_EVIDENCE' &&
      deadline.reasons.includes('quit-points-missing') &&
      deadline.reasons.includes('confusion-labels-insufficient'),
  );
  for (const report of [go, failure, pending, deadline])
    check(
      report.scope === 'synthetic-control' &&
        report.humanEvidenceVerified === false &&
        report.limitations.some((s) => s.includes('Fabricated instrument evidence')),
    );
  check(JSON.stringify(receipt) === before);
  return { scope: 'synthetic-control', passed: true };
}
