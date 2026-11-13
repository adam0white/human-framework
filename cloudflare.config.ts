import { bindings, defineConfig, triggers } from 'cf/config';

const rateLimit = (namespace: string, limit: number) =>
  bindings.rateLimit({ namespace, simple: { limit, period: 60 } });

export default defineConfig({
  accountId: 'a20259cba74e506296745f9c67c1f3bc',
  worker: {
    name: 'human-framework',
    compatibilityDate: '2026-11-05',
    // The lab Worker (owner, 2026-10-19: server infrastructure for lab telemetry only). It runs only for the
    // paths in runWorkerFirst; everything else is static assets. Privacy: apps/site/lab/privacy/index.html.
    entrypoint: './apps/site/worker/lab.ts',
    workersDev: false,
    previewUrls: false,
    // No request logs: the lab must not keep addresses or headers.
    observability: { enabled: false },
    // Static assets come from apps/site/dist through Vite's publicDir (vite.config.ts).
    assets: {
      notFoundHandling: 'none',
      runWorkerFirst: ['/lab/api/*', '/lab/data.json'],
    },
    domains: ['human.adamwhite.work'],
    // Every ten minutes: advance bounded aggregation/deletion and one private run-index page.
    triggers: [triggers.scheduled({ schedule: '*/10 * * * *' })],
    env: {
      // Private bucket: event batches, daily aggregates, opt-in runs and the private run index. No public access.
      LAB: bindings.r2({ name: 'hf-lab' }),
      // Owner-authorized default-off free-text prototype; lifetime $1 reservation in R2.
      AI: bindings.ai({}),
      // Per client address, in memory at the edge only (never stored). Period must be 10 or 60 seconds.
      EVENTS_LIMIT: rateLimit('4101', 30),
      RUNS_LIMIT: rateLimit('4102', 3),
      // Shared keys mitigate ingress per location. A conditional R2 counter reserves daily run capacity.
      EVENTS_ALL: rateLimit('4103', 600),
      RUNS_ALL: rateLimit('4104', 12),
      ASSETS: bindings.assets(),
    },
  },
});
