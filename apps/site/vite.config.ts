import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { resolveSiteFramework } from './hf-resolution.ts';

const root = import.meta.dirname;
const framework = resolveSiteFramework(root);

export default defineConfig({
  plugins: [react()],
  // The framework package version, for playtest files (src/shared/playtest.ts).
  define: {
    __HF_PACKAGE_VERSION__: JSON.stringify(framework.framework),
    __HF_LIBRARY_VERSION__: JSON.stringify(framework.frameworkLibrary),
  },
  resolve: {
    // Match HF exactly: prefix aliases would rewrite package exports as file subpaths.
    alias: [
      { find: /^@adam0white\/human-framework$/, replacement: framework.entry },
      { find: /^@adam0white\/human-framework\/package\.json$/, replacement: framework.manifest },
      // Lab packages resolve from the app's immutable release tarball dependencies.
    ],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        colony: resolve(root, 'colony/index.html'),
        voice: resolve(root, 'voice/index.html'),
        watch: resolve(root, 'watch/index.html'),
        games: resolve(root, 'games/index.html'),
        lab: resolve(root, 'lab/index.html'),
        labHowToPlaytest: resolve(root, 'lab/how-to-playtest/index.html'),
        labPrivacy: resolve(root, 'lab/privacy/index.html'),
        labIdentity: resolve(root, 'lab/identity/index.html'),
        labPeople: resolve(root, 'lab/people/index.html'),
      },
    },
  },
  // Long scenario tests must not fail on a slow or loaded machine (CI runners): timing budgets live in *.timing.ts.
  test: { name: 'site', include: ['src/**/*.test.ts'], environment: 'node', testTimeout: 120_000 },
});
