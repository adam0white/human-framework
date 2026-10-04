import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'human-bench',
    include: ['test/**/*.timing.ts'],
    experimental: { viteModuleRunner: false },
  },
});
