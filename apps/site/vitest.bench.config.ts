import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Game code uses TypeScript that Node cannot strip (parameter properties), so unlike the framework bench this
// project keeps Vite's module runner; its budgets were set under it, and the alias reads the framework source.
export default defineConfig({
  resolve: {
    alias: { '@human/framework': resolve(import.meta.dirname, '../../packages/human/src/index.ts') },
  },
  test: { name: 'site-bench', include: ['src/**/*.timing.ts'], environment: 'node' },
});
