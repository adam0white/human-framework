import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const root = import.meta.dirname;
const frameworkPackage = JSON.parse(
  readFileSync(resolve(root, '../../packages/human/package.json'), 'utf8'),
) as {
  version: string;
};

export default defineConfig({
  plugins: [react()],
  // The framework package version, for playtest files (src/shared/playtest.ts).
  define: { __HF_PACKAGE_VERSION__: JSON.stringify(frameworkPackage.version) },
  resolve: {
    alias: { '@human/framework': resolve(root, '../../packages/human/src/index.ts') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        colony: resolve(root, 'colony/index.html'),
        voice: resolve(root, 'voice/index.html'),
      },
    },
  },
  // Long scenario tests must not fail on a slow or loaded machine (CI runners): timing budgets live in *.timing.ts.
  test: { name: 'site', include: ['src/**/*.test.ts'], environment: 'node', testTimeout: 30_000 },
});
