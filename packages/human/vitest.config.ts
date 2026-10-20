import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Keep source imports in dependency analysis; the setup resolver also maps native imports to source.
  resolve: { alias: { '@adam0white/human-framework': resolve(import.meta.dirname, 'src/index.ts') } },
  // Long scenario tests must not fail on a slow or loaded machine (CI runners): timing budgets live in *.timing.ts.
  test: {
    setupFiles: ['./vitest.source.ts'],
    experimental: { viteModuleRunner: false },
    name: 'human',
    include: ['test/**/*.test.ts'],
    testTimeout: 120_000,
  },
});
