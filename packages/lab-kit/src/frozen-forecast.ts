/**
 * Fixed Good Hands forecast instrument: bounded metadata selection and separately supplied labels.
 * Caller-invoked only. No model, simulation, transport or identity/authorization verification.
 * Hashes detect corruption, not forgery. Synthetic inputs never establish human validation.
 */
import {
  canonical,
  date,
  digest,
  fail,
  hash,
  id,
  object,
  oneOf,
  snapshot,
  time,
} from './frozen-forecast-json.ts';
export type ForecastStudyBinding = {
  schemaVersion: 1;
  study: 'hf-goodhands-2026-10-25';
  studySha256: string;
  registrationSha256: string;
  forecastSha256: string;
};
export type ForecastRunMetadata = {
  receiptId: string;
  runId: string;
  game: string;
  build: string | null;
  receivedAt: string | null;
  startedAt: string | null;
  provenance: 'human-attested' | 'synthetic' | 'developer' | 'bot' | 'unknown';
  runKind: 'fresh' | 'import' | 'replay' | 'unknown';
  authorization: 'explicit-recording' | 'explicit-run-send' | 'default-capture' | 'unknown';
  completeDataAvailable: boolean | null;
  outcomeLabelsAvailable: boolean | null;
};
const exclusions = [
  'wrong-game',
  'unverified-human',
  'synthetic',
  'developer',
  'bot',
  'not-fresh',
  'incomplete-metadata',
  'no-explicit-authorization',
  'unavailable-data',
  'unavailable-labels',
  'not-after-freeze',
  'duplicate-run',
  'other-build',
] as const;
export type ForecastExclusion = (typeof exclusions)[number];
export type FrozenForecastReceipt = {
  schemaVersion: 1;
  binding: ForecastStudyBinding;
  metadata: ForecastRunMetadata[];
  metadataSha256: string;
  derivedBuild: string | null;
  selectedRunIds: string[];
  exclusions: Record<ForecastExclusion, number>;
  overflowCount: number;
  receiptSha256: string;
};
const fixedBinding: ForecastStudyBinding = {
  schemaVersion: 1,
  study: 'hf-goodhands-2026-10-25',
  studySha256: '6138c110243edc1bf06850c4d1bc8743bce7d64ad95526266667d26a52a63bb7',
  registrationSha256: '4f2e9296fc406e1504a5eb6c9885f0e427cfe9f6853ab9f65c24c14736d2b62a',
  forecastSha256: '4466dc907615bf59c32d880aa349f9f9160595537b1037cf4e6d527056b7fdb4',
};
const metadataKeys = [
  'receiptId',
  'runId',
  'game',
  'build',
  'receivedAt',
  'startedAt',
  'provenance',
  'runKind',
  'authorization',
  'completeDataAvailable',
  'outcomeLabelsAvailable',
];
const cutoff = '2026-10-25T17:19:27.729743+00:00';
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export async function freezeForecastCohort(
  metadata: readonly ForecastRunMetadata[],
  binding: ForecastStudyBinding,
): Promise<FrozenForecastReceipt> {
  // Snapshot both arguments before any await; never retain caller-owned state across hashing.
  const input = snapshot({ metadata, binding });
  object(input.binding, Object.keys(fixedBinding));
  if (canonical(input.binding) !== canonical(fixedBinding)) fail('study-binding');
  if (!Array.isArray(input.metadata) || input.metadata.length > 10000) fail('metadata-count');
  const receipts = new Set<string>();
  const timed = input.metadata.map((row) => {
    object(row, metadataKeys);
    id(row.receiptId);
    id(row.runId);
    id(row.game);
    if (row.build !== null) id(row.build);
    if (receipts.has(row.receiptId)) fail('duplicate-receipt');
    receipts.add(row.receiptId);
    oneOf(row.provenance, ['human-attested', 'synthetic', 'developer', 'bot', 'unknown']);
    oneOf(row.runKind, ['fresh', 'import', 'replay', 'unknown']);
    oneOf(row.authorization, ['explicit-recording', 'explicit-run-send', 'default-capture', 'unknown']);
    oneOf(row.completeDataAvailable, [true, false, null]);
    oneOf(row.outcomeLabelsAvailable, [true, false, null]);
    const received = row.receivedAt === null ? null : time(row.receivedAt);
    const started = row.startedAt === null ? null : time(row.startedAt);
    if (received !== null && started !== null && received < started) fail('receipt-before-start');
    return { row, received, started };
  });
  timed.sort((a, b) =>
    a.received === b.received
      ? compare(a.row.receiptId, b.row.receiptId)
      : a.received === null
        ? 1
        : b.received === null
          ? -1
          : a.received < b.received
            ? -1
            : 1,
  );
  const counts = Object.fromEntries(exclusions.map((e) => [e, 0])) as Record<ForecastExclusion, number>;
  const seen = new Set<string>();
  const selected: string[] = [];
  let build: string | null = null;
  let overflow = 0;
  for (const { row, received, started } of timed) {
    let reason: ForecastExclusion | undefined;
    if (row.game !== 'goodhands') reason = 'wrong-game';
    else if (row.provenance === 'unknown') reason = 'unverified-human';
    else if (row.provenance !== 'human-attested') reason = row.provenance;
    else if (row.runKind !== 'fresh') reason = 'not-fresh';
    else if (received === null || started === null || row.build === null) reason = 'incomplete-metadata';
    else if (!['explicit-recording', 'explicit-run-send'].includes(row.authorization))
      reason = 'no-explicit-authorization';
    else if (row.completeDataAvailable !== true) reason = 'unavailable-data';
    else if (row.outcomeLabelsAvailable !== true) reason = 'unavailable-labels';
    else if (started <= time(cutoff)) reason = 'not-after-freeze';
    else if (seen.has(row.runId)) reason = 'duplicate-run';
    else {
      seen.add(row.runId);
      build ??= row.build;
      if (row.build !== build) reason = 'other-build';
      else if (selected.length < 20) selected.push(row.runId);
      else overflow++;
    }
    if (reason) counts[reason]++;
  }
  const ordered = timed.map((t) => t.row);
  const body = {
    schemaVersion: 1 as const,
    binding: input.binding,
    metadata: ordered,
    metadataSha256: await hash(ordered),
    derivedBuild: build,
    selectedRunIds: selected,
    exclusions: counts,
    overflowCount: overflow,
  };
  return { ...body, receiptSha256: await hash(body) };
}

export type ForecastUnknownReason =
  | 'absent-declaration'
  | 'technical-failure'
  | 'silent-ending'
  | 'insufficient-observation';
export type ForecastQuitLabel =
  | { evidence: 'voluntary-stop-before-60m-without-completion'; point: string | null }
  | { evidence: 'explicit-observation-through-60m-without-quit' }
  | { evidence: 'unknown'; reason: ForecastUnknownReason };
export type ForecastConfusionLabel =
  | { evidence: 'explicit-opening-interview-confusion'; point: string | null }
  | { evidence: 'explicit-no-opening-interview-confusion' }
  | { evidence: 'unknown'; reason: ForecastUnknownReason };
export type FrozenForecastLabels = {
  schemaVersion: 1;
  scope: 'metadata-instrument-only' | 'synthetic-control';
  receiptSha256: string;
  labels: { runId: string; quit: ForecastQuitLabel; confusion: ForecastConfusionLabel }[];
};
export type ForecastPointReport = {
  predicted: string;
  positives: number;
  recorded: number;
  missing: number;
  counts: { point: string; count: number }[];
  modes: string[];
  status: 'hit' | 'miss' | 'pending';
};
export type ForecastOutcomeReport = {
  forecastProbability: number;
  known: number;
  positive: number;
  negative: number;
  unknown: number;
  unknownReasons: Record<ForecastUnknownReason, number>;
  observedRate: number | null;
  forecastBrier: number | null;
  baselineBrier: number | null;
  improvement: number | null;
  absoluteRateError: number | null;
  point: ForecastPointReport;
};
export type ForecastReason =
  | 'cohort-incomplete'
  | 'quit-labels-insufficient'
  | 'confusion-labels-insufficient'
  | 'quit-points-missing'
  | 'confusion-points-missing'
  | 'brier-miss'
  | 'quit-rate-miss'
  | 'confusion-rate-miss'
  | 'quit-point-miss'
  | 'confusion-point-miss';
export type FrozenForecastReport = {
  schemaVersion: 1;
  scope: FrozenForecastLabels['scope'];
  humanEvidenceVerified: false;
  receiptSha256: string;
  reviewDate: string;
  derivedBuild: string | null;
  transferTest: boolean | null;
  cohortCount: number;
  exclusions: Record<ForecastExclusion, number>;
  overflowCount: number;
  quit: ForecastOutcomeReport;
  confusion: ForecastOutcomeReport;
  meanBrierImprovement: number | null;
  gates: {
    cohort: boolean;
    quitCoverage: boolean;
    confusionCoverage: boolean;
    brier: boolean | null;
    quitRate: boolean | null;
    confusionRate: boolean | null;
    quitPoint: boolean | null;
    confusionPoint: boolean | null;
  };
  verdict: 'PENDING' | 'GO' | 'NO_GO_MISSING_EVIDENCE' | 'NO_GO_OBSERVED_FAILURE';
  reasons: ForecastReason[];
  limitations: string[];
};
const unknownReasons = [
  'absent-declaration',
  'technical-failure',
  'silent-ending',
  'insufficient-observation',
] as const;
function validateLabel(value: unknown, positive: string, negative: string): void {
  if (!value || typeof value !== 'object') fail('label');
  const label = value as Record<string, unknown>;
  if (label.evidence === 'unknown') {
    object(label, ['evidence', 'reason']);
    oneOf(label.reason, unknownReasons);
  } else if (label.evidence === positive) {
    object(label, ['evidence', 'point']);
    if (
      label.point !== null &&
      (typeof label.point !== 'string' || !label.point.length || /\p{Cc}/u.test(label.point))
    )
      fail('point');
  } else if (label.evidence === negative) object(label, ['evidence']);
  else fail('label-evidence');
}
function outcome(
  labels: readonly (ForecastQuitLabel | ForecastConfusionLabel)[],
  quit: boolean,
): ForecastOutcomeReport {
  const predicted = quit ? 'week 1, Saturday' : 'opening interview choice';
  const reasons = Object.fromEntries(unknownReasons.map((r) => [r, 0])) as Record<
    ForecastUnknownReason,
    number
  >;
  let positive = 0;
  let negative = 0;
  let missing = 0;
  const points = new Map<string, number>();
  for (const label of labels) {
    if (label.evidence === 'unknown') reasons[label.reason]++;
    else if ('point' in label) {
      positive++;
      if (label.point === null) missing++;
      else points.set(label.point, (points.get(label.point) ?? 0) + 1);
    } else negative++;
  }
  const known = positive + negative;
  const counts = [...points].sort(([a], [b]) => compare(a, b)).map(([point, count]) => ({ point, count }));
  const max = Math.max(0, ...counts.map((c) => c.count));
  const modes = counts.filter((c) => c.count === max).map((c) => c.point);
  const numerator = quit ? known + 63 * positive : known - positive;
  const denominator = quit ? 81 * known : known;
  return {
    forecastProbability: quit ? 1 / 9 : 1,
    known,
    positive,
    negative,
    unknown: labels.length - known,
    unknownReasons: reasons,
    observedRate: known ? positive / known : null,
    forecastBrier: known ? numerator / denominator : null,
    baselineBrier: known ? 1 / 4 : null,
    improvement: known ? (denominator - 4 * numerator) / (4 * denominator) : null,
    absoluteRateError: known
      ? quit
        ? Math.abs(known - 9 * positive) / (9 * known)
        : (known - positive) / known
      : null,
    point: {
      predicted,
      positives: positive,
      recorded: positive - missing,
      missing,
      counts,
      modes,
      status: missing ? 'pending' : modes.includes(predicted) ? 'hit' : 'miss',
    },
  };
}
export async function scoreFrozenForecast(
  receipt: FrozenForecastReceipt,
  labels: FrozenForecastLabels,
  reviewDate: string,
): Promise<FrozenForecastReport> {
  const input = snapshot({ receipt, labels, reviewDate });
  const r = input.receipt;
  const l = input.labels;
  date(input.reviewDate);
  object(r, [
    'schemaVersion',
    'binding',
    'metadata',
    'metadataSha256',
    'derivedBuild',
    'selectedRunIds',
    'exclusions',
    'overflowCount',
    'receiptSha256',
  ]);
  // Recompute the entire selection and compare every field, not only supplied digests.
  const rebuilt = await freezeForecastCohort(r.metadata, r.binding);
  if (canonical(rebuilt) !== canonical(r)) fail('receipt-mismatch');
  object(l, ['schemaVersion', 'scope', 'receiptSha256', 'labels']);
  oneOf(l.schemaVersion, [1]);
  oneOf(l.scope, ['metadata-instrument-only', 'synthetic-control']);
  digest(l.receiptSha256);
  if (l.receiptSha256 !== r.receiptSha256) fail('label-binding');
  if (!Array.isArray(l.labels) || l.labels.length > 20 || l.labels.length !== r.selectedRunIds.length)
    fail('label-count');
  const seen = new Set<string>();
  for (const entry of l.labels) {
    object(entry, ['runId', 'quit', 'confusion']);
    id(entry.runId);
    if (seen.has(entry.runId) || !r.selectedRunIds.includes(entry.runId)) fail('label-selection');
    seen.add(entry.runId);
    validateLabel(
      entry.quit,
      'voluntary-stop-before-60m-without-completion',
      'explicit-observation-through-60m-without-quit',
    );
    validateLabel(
      entry.confusion,
      'explicit-opening-interview-confusion',
      'explicit-no-opening-interview-confusion',
    );
  }
  const q = outcome(
    l.labels.map((v) => v.quit),
    true,
  );
  const c = outcome(
    l.labels.map((v) => v.confusion),
    false,
  );
  const nq = q.known;
  const nc = c.known;
  const kq = q.positive;
  const kc = c.positive;
  // Integer cross-products implement the inclusive registered rational thresholds exactly.
  const sumNumerator = (nq + 63 * kq) * nc + 81 * nq * (nc - kc);
  const common = 81 * nq * nc;
  const gates: FrozenForecastReport['gates'] = {
    cohort: r.selectedRunIds.length === 20,
    quitCoverage: nq >= 16,
    confusionCoverage: nc >= 16,
    brier: nq && nc ? 50 * sumNumerator <= 23 * common : null,
    quitRate: nq ? 20 * Math.abs(9 * kq - nq) <= 27 * nq : null,
    confusionRate: nc ? 20 * (nc - kc) <= 3 * nc : null,
    quitPoint: q.point.status === 'pending' ? null : q.point.status === 'hit',
    confusionPoint: c.point.status === 'pending' ? null : c.point.status === 'hit',
  };
  const reasons: ForecastReason[] = [];
  if (!gates.cohort) reasons.push('cohort-incomplete');
  if (!gates.quitCoverage) reasons.push('quit-labels-insufficient');
  if (!gates.confusionCoverage) reasons.push('confusion-labels-insufficient');
  if (gates.quitPoint === null) reasons.push('quit-points-missing');
  if (gates.confusionPoint === null) reasons.push('confusion-points-missing');
  if (gates.brier === false) reasons.push('brier-miss');
  if (gates.quitRate === false) reasons.push('quit-rate-miss');
  if (gates.confusionRate === false) reasons.push('confusion-rate-miss');
  if (gates.quitPoint === false) reasons.push('quit-point-miss');
  if (gates.confusionPoint === false) reasons.push('confusion-point-miss');
  const sufficient =
    gates.cohort &&
    gates.quitCoverage &&
    gates.confusionCoverage &&
    gates.quitPoint !== null &&
    gates.confusionPoint !== null;
  const verdict = sufficient
    ? Object.values(gates).every((v) => v === true)
      ? 'GO'
      : 'NO_GO_OBSERVED_FAILURE'
    : input.reviewDate < '2026-11-03'
      ? 'PENDING'
      : 'NO_GO_MISSING_EVIDENCE';
  return {
    schemaVersion: 1,
    scope: l.scope,
    humanEvidenceVerified: false,
    receiptSha256: r.receiptSha256,
    reviewDate: input.reviewDate,
    derivedBuild: r.derivedBuild,
    transferTest: r.derivedBuild === null ? null : r.derivedBuild !== '27d8d90',
    cohortCount: r.selectedRunIds.length,
    exclusions: r.exclusions,
    overflowCount: r.overflowCount,
    quit: q,
    confusion: c,
    meanBrierImprovement: common ? (common - 2 * sumNumerator) / (4 * common) : null,
    gates,
    verdict,
    reasons,
    limitations: [
      'Nine deterministic sessions: selected completionist/mischief/rulesLawyer seeds 1–3.',
      'Source HF 2.9.0, playtester b715021, build 27d8d90; live copy differs.',
      'Five agenda stops censor observation. Frozen 1/9 is not a measured 60-minute quit rate.',
      'Confusion is a rubric proxy, not a validated human measure.',
      'Metadata does not verify human provenance or authorization. Hashes detect corruption, not authentication.',
      'GO is only the computed registered gate, not a human accuracy claim. No individualized model or enjoyment judgment.',
      'The study reserves explicit owner override outside this instrument.',
      ...(l.scope === 'synthetic-control'
        ? [
            'Fabricated instrument evidence only. Synthetic GO is an instrument control, never real human validation.',
          ]
        : []),
    ],
  };
}
