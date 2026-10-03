import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Examples import the package by name; tests run them against the source, not a possibly stale dist.
  resolve: { alias: { '@human/framework': resolve(import.meta.dirname, 'src/index.ts') } },
  test: { name: 'human', include: ['test/**/*.test.ts'] },
});
