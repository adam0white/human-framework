import { defineConfig } from 'vitest/config';

// Lab client stays on its published 3.x pin, not workspace 4.x source.
export default defineConfig({
  // Match lab-kit after stamp.test.ts hit 5 s under load (2026-10-20; docs/findings.md, 2026-10-04).
  test: { testTimeout: 30_000, name: 'lab-client', include: ['test/**/*.test.ts'], environment: 'node' },
});
