import { defineConfig } from 'vitest/config';

// Wall-clock budgets, kept out of `npm test` so `npm run check` does not depend on machine load.
// Run with `npm run bench`. Vite's module runner is off: its live-binding export getters add about 50% to the
// hot path (20 people x 30 days: ~2.4 s under the runner vs ~1.55 s with native imports), so this measures the
// engine, not the test harness.
export default defineConfig({
  test: {
    projects: ['packages/*/vitest.bench.config.ts', 'apps/*/vitest.bench.config.ts'],
  },
});
