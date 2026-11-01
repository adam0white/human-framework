/** Admission sees a shared throttled snapshot, including local spend since that snapshot. */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  home: `/tmp/wai-cache-${process.pid}`,
  auth: vi.fn(() => '{"token":"test-only"}'),
}));
vi.mock('node:os', async (original) => ({
  ...(await original<typeof import('node:os')>()),
  homedir: () => mocks.home,
}));
vi.mock('node:child_process', () => ({ execFileSync: mocks.auth }));

import { waiUsage } from './lab-wai-budget.ts';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (mocks.home) rmSync(mocks.home, { recursive: true, force: true });
});
it('shares one query across concurrent callers and module reloads, expires at five minutes and rejects yesterday', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-01T23:54:00Z'));
  const root = `${mocks.home}/code/.lab-scratch/wai-daily`;
  mkdirSync(root, { recursive: true });
  writeFileSync(
    `${root}/budget.json`,
    JSON.stringify({
      version: 1,
      reservedUSD: 0.207,
      days: { '2026-11-01': { neurons: 1000, reservedNeurons: 1100, models: {} } },
    }),
  );
  const fetch = vi.fn(async () =>
    Response.json({
      data: { viewer: { accounts: [{ aiInferenceAdaptiveGroups: [{ sum: { totalNeurons: 1500 } }] }] } },
    }),
  );
  vi.stubGlobal('fetch', fetch);
  const results = await Promise.all([waiUsage(), waiUsage(), waiUsage()]);
  expect(results.find(Boolean)?.localCompletedAtRead).toBe(1000);
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.resetModules();
  const again = (await import('./lab-wai-budget.ts')).waiUsage;
  expect((await again())?.neurons).toBe(1500);
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.setSystemTime(new Date('2026-11-01T23:59:00Z'));
  await again();
  expect(fetch).toHaveBeenCalledTimes(2);
  vi.setSystemTime(new Date('2026-11-02T00:00:00Z'));
  expect(await again()).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
  vi.setSystemTime(new Date('2026-11-02T00:04:00Z'));
  expect((await again())?.date).toBe('2026-11-02');
  expect(fetch).toHaveBeenCalledTimes(3);
});
it('persists rate-limit backoff across reloads and never returns stale usage after failure', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-01T12:00:00Z'));
  const fetch = vi.fn(async () =>
    Response.json({
      errors: [{ message: 'Rate limiter budget depleted. Please try again after 5 minutes' }],
    }),
  );
  vi.stubGlobal('fetch', fetch);
  expect(await waiUsage()).toBeNull();
  vi.resetModules();
  const again = (await import('./lab-wai-budget.ts')).waiUsage;
  await again();
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.setSystemTime(new Date('2026-11-01T12:05:00Z'));
  await again();
  expect(fetch).toHaveBeenCalledTimes(2);
  vi.setSystemTime(new Date('2026-11-01T12:10:00Z'));
  await again();
  expect(fetch).toHaveBeenCalledTimes(2);
  vi.setSystemTime(new Date('2026-11-01T12:15:00Z'));
  await again();
  expect(fetch).toHaveBeenCalledTimes(3);
});
