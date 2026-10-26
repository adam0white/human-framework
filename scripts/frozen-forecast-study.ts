/** File-only binding to the unchanged public registration. Importing this module performs no I/O. */
import { readFile, stat } from 'node:fs/promises';
import type { ForecastStudyBinding } from '../packages/lab-kit/src/frozen-forecast.ts';
import { canonical, fail, object, snapshot } from '../packages/lab-kit/src/frozen-forecast-json.ts';

const base = new URL('../docs/lab/experiments/fixtures/hf-forecast/', import.meta.url);
const expected: ForecastStudyBinding = {
  schemaVersion: 1,
  study: 'hf-goodhands-2026-10-25',
  studySha256: '6138c110243edc1bf06850c4d1bc8743bce7d64ad95526266667d26a52a63bb7',
  registrationSha256: '4f2e9296fc406e1504a5eb6c9885f0e427cfe9f6853ab9f65c24c14736d2b62a',
  forecastSha256: '4466dc907615bf59c32d880aa349f9f9160595537b1037cf4e6d527056b7fdb4',
};
async function bytes(name: string): Promise<Uint8Array> {
  const url = new URL(name, base);
  const info = await stat(url);
  if (!info.isFile() || info.size > 8 * 1024 * 1024) fail('study-file-size');
  const data = await readFile(url);
  if (data.length > 8 * 1024 * 1024) fail('study-file-size');
  new TextDecoder('utf-8', { fatal: true }).decode(data);
  return data;
}
async function sha(bytes: Uint8Array): Promise<string> {
  return Buffer.from(await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes))).toString('hex');
}
export async function readFrozenStudy(): Promise<ForecastStudyBinding> {
  try {
    for (const [name, hash] of [
      ['study-00dcdad.md', expected.studySha256],
      ['preregistered.md', expected.registrationSha256],
      ['frozen-forecast.json', expected.forecastSha256],
    ] as const)
      if ((await sha(await bytes(name))) !== hash) fail('study-digest');
    const decode = (value: Uint8Array) => new TextDecoder('utf-8', { fatal: true }).decode(value);
    if (decode(await bytes('preregistration.sha256')) !== `${expected.registrationSha256}\n`)
      fail('registration-digest');
    const archive = '4583333d94838cf7763c403327390bfb657c89cd14bb6bc1ccd73931953ff820';
    if (decode(await bytes('source-sha256.txt')) !== `${archive}\n`) fail('archive-digest');
    const provenance = snapshot(JSON.parse(decode(await bytes('provenance.json'))));
    const fixed = {
      schemaVersion: 1,
      sourceCommit: '00dcdad7d66a6ee33d11f941e5319de5bdfbeebf',
      sourcePath: 'docs/lab/experiments/predicting-real-players-hf-forecast-2026-10-25.md',
      studySha256: expected.studySha256,
      registrationSha256: expected.registrationSha256,
      forecastSha256: expected.forecastSha256,
      sourceArchiveSha256: archive,
      scope: 'metadata-instrument-only',
    };
    object(provenance, Object.keys(fixed));
    if (canonical(provenance) !== canonical(fixed)) fail('provenance');
    return structuredClone(expected);
  } catch {
    fail('study-invalid');
  }
}
