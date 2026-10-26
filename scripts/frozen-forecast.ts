/** Explicit file-only instrument. No input discovery, network, stdin or implicit label inference. */
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import {
  type ForecastRunMetadata,
  type FrozenForecastLabels,
  type FrozenForecastReceipt,
  freezeForecastCohort,
  scoreFrozenForecast,
} from '../packages/lab-kit/src/frozen-forecast.ts';
import { fail, id, snapshot } from '../packages/lab-kit/src/frozen-forecast-json.ts';
import { readFrozenStudy } from './frozen-forecast-study.ts';

async function readJson(path: string): Promise<unknown> {
  let file: Awaited<ReturnType<typeof open>> | undefined;
  try {
    file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
    const info = await file.stat();
    if (!info.isFile() || info.size > 8 * 1024 * 1024) fail('input-invalid');
    // Read at most the bound plus one byte even if a file grows after stat.
    const bytes = Buffer.alloc(8 * 1024 * 1024 + 1);
    let length = 0;
    while (length < bytes.length) {
      const result = await file.read(bytes, length, bytes.length - length, null);
      if (!result.bytesRead) break;
      length += result.bytesRead;
    }
    if (length > 8 * 1024 * 1024) fail('input-invalid');
    return snapshot(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length))));
  } catch {
    fail('input-invalid');
  } finally {
    await file?.close();
  }
}
async function output(path: string, value: unknown): Promise<void> {
  let file: Awaited<ReturnType<typeof open>> | undefined;
  try {
    file = await open(path, 'wx', 0o600);
    await file.writeFile(`${JSON.stringify(value, null, 2)}\n`);
  } catch {
    fail('output-unavailable');
  } finally {
    await file?.close();
  }
}
function options(
  argv: readonly string[],
  allowed: readonly string[],
  required: readonly string[],
): Map<string, string> {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key || !allowed.includes(key) || values.has(key) || !value || value.startsWith('--'))
      fail('arguments');
    values.set(key, value);
  }
  if (required.some((k) => !values.has(k))) fail('arguments');
  return values;
}
export async function runFrozenForecastCli(argv: readonly string[]): Promise<number> {
  try {
    const [command, ...rest] = argv;
    if (command === 'control') {
      if (rest.length) fail('arguments');
      const { runFrozenForecastControl } = await import('./frozen-forecast-control.ts');
      console.log(JSON.stringify(await runFrozenForecastControl()));
    } else if (command === 'freeze') {
      const args = options(rest, ['--metadata', '--out', '--expect-build'], ['--metadata', '--out']);
      const binding = await readFrozenStudy();
      const receipt = await freezeForecastCohort(
        (await readJson(args.get('--metadata') ?? fail('arguments'))) as ForecastRunMetadata[],
        binding,
      );
      if (args.has('--expect-build')) {
        const build = args.get('--expect-build');
        id(build);
        if (receipt.derivedBuild !== build) fail('expected-build-mismatch');
      }
      await output(args.get('--out') ?? fail('arguments'), receipt);
      console.log(
        JSON.stringify({
          scope: 'metadata-instrument-only',
          cohortCount: receipt.selectedRunIds.length,
          overflowCount: receipt.overflowCount,
        }),
      );
    } else if (command === 'score') {
      const args = options(
        rest,
        ['--receipt', '--labels', '--review-date', '--out'],
        ['--receipt', '--labels', '--review-date', '--out'],
      );
      await readFrozenStudy();
      const report = await scoreFrozenForecast(
        (await readJson(args.get('--receipt') ?? fail('arguments'))) as FrozenForecastReceipt,
        (await readJson(args.get('--labels') ?? fail('arguments'))) as FrozenForecastLabels,
        args.get('--review-date') ?? fail('arguments'),
      );
      await output(args.get('--out') ?? fail('arguments'), report);
      console.log(
        JSON.stringify({
          scope: report.scope,
          verdict: report.verdict,
          cohortCount: report.cohortCount,
          quitKnown: report.quit.known,
          confusionKnown: report.confusion.known,
        }),
      );
    } else fail('arguments');
    return 0;
  } catch (error) {
    const message =
      error instanceof Error && /^Frozen forecast: [a-z-]+$/.test(error.message)
        ? error.message
        : 'Frozen forecast: invalid-input';
    console.error(message);
    return 2;
  }
}
if (import.meta.main) process.exitCode = await runFrozenForecastCli(process.argv.slice(2));
