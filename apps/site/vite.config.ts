import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const root = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
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
  test: { name: 'site', include: ['src/**/*.test.ts'], environment: 'node' },
});
