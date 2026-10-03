import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { name: 'human', include: ['test/**/*.test.ts'] } });
