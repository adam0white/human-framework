import { defineConfig } from 'vitest/config';

// Playtester stays on the published 3.2.0 package (its package.json pin), not workspace 4.x source.
export default defineConfig({
  test: { name: 'playtester', include: ['test/**/*.test.ts'], testTimeout: 120_000 },
});
