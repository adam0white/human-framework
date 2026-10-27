import { defineConfig } from 'vitest/config';

// Shelf transport uses HF4 portable projections; coarse clocks keep their explicit HF3 dependency.
export default defineConfig({
  // Match lab-kit after stamp.test.ts hit 5 s under load (2026-10-20; docs/findings.md, 2026-10-04).
  test: { testTimeout: 30_000, name: 'lab-client', include: ['test/**/*.test.ts'], environment: 'node' },
});
