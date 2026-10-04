import { defineConfig } from 'vitest/config';

// Like the framework bench, this project runs on Node's own loader, not Vite's module runner (about 1.5-2x slower on
// the game sims, H2 performance review P4); game code therefore avoids TypeScript Node cannot strip (parameter
// properties, enums). Without Vite's alias, `bench-resolve.ts` points `@human/framework` at the framework source.
export default defineConfig({
  test: {
    name: 'site-bench',
    include: ['src/**/*.timing.ts'],
    environment: 'node',
    execArgv: ['--import', new URL('./bench-resolve.ts', import.meta.url).href],
    experimental: { viteModuleRunner: false },
  },
});
