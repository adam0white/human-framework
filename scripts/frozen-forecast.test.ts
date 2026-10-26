import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { runFrozenForecastCli } from './frozen-forecast.ts';
import { readFrozenStudy } from './frozen-forecast-study.ts';

const dirs: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});
const fixtures = new URL('../docs/lab/experiments/fixtures/hf-forecast/', import.meta.url);
async function temp() {
  const dir = await mkdtemp(join(tmpdir(), 'fabricated-forecast-'));
  dirs.push(dir);
  return dir;
}
async function metadata(dir: string) {
  const file = join(dir, 'fabricated.json');
  await writeFile(
    file,
    JSON.stringify([
      {
        receiptId: 'fabricated-receipt',
        runId: 'fabricated-run',
        game: 'goodhands',
        build: 'receipt-first',
        receivedAt: '2026-10-26T01:00:00Z',
        startedAt: '2026-10-25T18:00:00Z',
        provenance: 'human-attested',
        runKind: 'fresh',
        authorization: 'explicit-run-send',
        completeDataAvailable: true,
        outcomeLabelsAvailable: true,
      },
    ]),
  );
  return file;
}
it('retains_exact_public_study_bytes_and_digests', async () => {
  const binding = await readFrozenStudy();
  for (const [file, hash] of [
    ['study-00dcdad.md', binding.studySha256],
    ['preregistered.md', binding.registrationSha256],
    ['frozen-forecast.json', binding.forecastSha256],
  ] as const)
    expect(
      createHash('sha256')
        .update(await readFile(new URL(file, fixtures)))
        .digest('hex'),
    ).toBe(hash);
  expect(JSON.parse(await readFile(new URL('frozen-forecast.json', fixtures), 'utf8')).verdict).toBe(
    'PENDING_EVIDENCE',
  );
});
it('cli_preferred_build_cannot_select_a_cohort_and_never_echoes_private_inputs', async () => {
  const dir = await temp();
  const file = await metadata(dir);
  const out = join(dir, 'receipt.json');
  const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
  const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
  expect(
    await runFrozenForecastCli(['freeze', '--metadata', file, '--out', out, '--expect-build', 'preferred']),
  ).toBe(2);
  await expect(stat(out)).rejects.toThrow();
  expect(stderr.mock.calls.flat().join(' ')).toBe('Frozen forecast: expected-build-mismatch');
  expect(await runFrozenForecastCli(['freeze', '--metadata', file, '--out', out])).toBe(0);
  expect((await stat(out)).mode & 0o777).toBe(0o600);
  expect(stdout.mock.calls.flat().join(' ')).not.toMatch(/fabricated-run|receipt-first/);
  expect(await runFrozenForecastCli(['freeze', '--metadata', file, '--out', out])).toBe(2);
});
it('cli_requires_explicit_labels_and_rejects_invalid_options', async () => {
  const dir = await temp();
  const file = await metadata(dir);
  const receiptFile = join(dir, 'receipt.json');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  expect(await runFrozenForecastCli(['freeze', '--metadata', file, '--out', receiptFile])).toBe(0);
  const receipt = JSON.parse(await readFile(receiptFile, 'utf8'));
  const labels = join(dir, 'labels.json');
  await writeFile(
    labels,
    JSON.stringify({
      schemaVersion: 1,
      scope: 'metadata-instrument-only',
      receiptSha256: receipt.receiptSha256,
      labels: [],
    }),
  );
  const out = join(dir, 'report.json');
  const args = [
    'score',
    '--receipt',
    receiptFile,
    '--labels',
    labels,
    '--review-date',
    '2026-11-03',
    '--out',
    out,
  ];
  expect(await runFrozenForecastCli(args)).toBe(2);
  await writeFile(
    labels,
    JSON.stringify({
      schemaVersion: 1,
      scope: 'metadata-instrument-only',
      receiptSha256: receipt.receiptSha256,
      labels: [
        {
          runId: 'fabricated-run',
          quit: { evidence: 'unknown', reason: 'absent-declaration' },
          confusion: { evidence: 'unknown', reason: 'silent-ending' },
        },
      ],
    }),
  );
  expect(await runFrozenForecastCli(args)).toBe(0);
  const report = await readFile(out, 'utf8');
  expect(report).not.toContain('fabricated-run');
  expect(JSON.parse(report).verdict).toBe('NO_GO_MISSING_EVIDENCE');
  for (const bad of [
    [],
    ['freeze'],
    ['control', '--out', out],
    ['score', '--override', 'yes'],
    ['freeze', '--metadata', file, '--metadata', file, '--out', out],
    ['freeze', 'positional'],
    ['unknown'],
  ])
    expect(await runFrozenForecastCli(bad)).toBe(2);
  const malformed = join(dir, 'malformed.json');
  await writeFile(malformed, 'PRIVATE_SENTINEL');
  expect(await runFrozenForecastCli(['freeze', '--metadata', malformed, '--out', join(dir, 'no.json')])).toBe(
    2,
  );
  const error = vi.mocked(console.error).mock.calls.flat().join(' ');
  expect(error).not.toContain('PRIVATE_SENTINEL');
  expect(error).not.toContain(dir);
});
it('study_binding_works_from_another_cwd', async () => {
  const cwd = process.cwd();
  const dir = await temp();
  try {
    process.chdir(dir);
    expect((await readFrozenStudy()).study).toBe('hf-goodhands-2026-10-25');
  } finally {
    process.chdir(cwd);
  }
});

it('one_headless_synthetic_control_exercises_go_failure_and_missing_evidence', async () => {
  const { runFrozenForecastControl } = await import('./frozen-forecast-control.ts');
  expect(await runFrozenForecastControl()).toEqual({ scope: 'synthetic-control', passed: true });
  const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
  expect(await runFrozenForecastCli(['control'])).toBe(0);
  expect(stdout.mock.calls.flat().join(' ')).toBe('{"scope":"synthetic-control","passed":true}');
});
