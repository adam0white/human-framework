import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@adam0white/human-framework': resolve(import.meta.dirname, '../human/src/index.ts') },
  },
  test: { name: 'playtester', include: ['test/**/*.test.ts'], testTimeout: 120_000 },
});
