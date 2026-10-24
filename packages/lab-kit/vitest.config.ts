import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: {
    alias: { '@adam0white/human-framework': resolve(import.meta.dirname, '../human/src/index.ts') },
  },
  // Agent load hit the 5 s default in stamp.test.ts (2026-10-20); see docs/findings.md, 2026-10-04.
  test: { testTimeout: 30_000, name: 'lab-kit', include: ['test/**/*.test.ts'], environment: 'happy-dom' },
});
