import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Examples import the package by name; tests run them against the source, not a possibly stale dist.
  resolve: { alias: { '@adam0white/human-framework': resolve(import.meta.dirname, 'src/index.ts') } },
  // Long scenario tests must not fail on a slow or loaded machine (CI runners): timing budgets live in *.timing.ts.
  test: { name: 'human', include: ['test/**/*.test.ts'], testTimeout: 30_000 },
});
