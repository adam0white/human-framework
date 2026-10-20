import { defineConfig } from 'vitest/config';
export default defineConfig({
  // Agent load hit the 5 s default in stamp.test.ts (2026-10-20); see docs/findings.md, 2026-10-04.
  test: { testTimeout: 30_000, name: 'lab-kit', include: ['test/**/*.test.ts'], environment: 'happy-dom' },
});
