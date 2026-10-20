import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { name: 'lab-kit', include: ['test/**/*.test.ts'], environment: 'happy-dom' },
});
