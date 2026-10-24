import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@adam0white/human-framework': resolve(import.meta.dirname, '../human/src/index.ts') },
  },
  // Match lab-kit after stamp.test.ts hit 5 s under load (2026-10-20; docs/findings.md, 2026-10-04).
  test: { testTimeout: 30_000, name: 'lab-client', include: ['test/**/*.test.ts'], environment: 'node' },
});
