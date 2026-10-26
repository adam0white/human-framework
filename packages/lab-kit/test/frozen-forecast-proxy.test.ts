// @vitest-environment node
import { expect, it } from 'vitest';
import { type ForecastRunMetadata, freezeForecastCohort } from '../src/frozen-forecast.ts';

it('rejects a plain-shaped Proxy with the ordinary JSON error', async () => {
  const row = new Proxy<ForecastRunMetadata>(
    {
      receiptId: 'fabricated-receipt',
      runId: 'fabricated-run',
      game: 'goodhands',
      build: 'fixture-build',
      receivedAt: '2026-10-26T01:00:00Z',
      startedAt: '2026-10-25T18:00:00Z',
      provenance: 'human-attested',
      runKind: 'fresh',
      authorization: 'explicit-recording',
      completeDataAvailable: true,
      outcomeLabelsAvailable: true,
    },
    {},
  );
  await expect(
    freezeForecastCohort([row], {
      schemaVersion: 1,
      study: 'hf-goodhands-2026-10-25',
      studySha256: '6138c110243edc1bf06850c4d1bc8743bce7d64ad95526266667d26a52a63bb7',
      registrationSha256: '4f2e9296fc406e1504a5eb6c9885f0e427cfe9f6853ab9f65c24c14736d2b62a',
      forecastSha256: '4466dc907615bf59c32d880aa349f9f9160595537b1037cf4e6d527056b7fdb4',
    }),
  ).rejects.toThrow(/^Frozen forecast: json-value$/);
});
