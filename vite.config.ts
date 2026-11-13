import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';

// Deploy bundle only. The site itself is built by apps/site/vite.config.ts into apps/site/dist; this config
// bundles the lab Worker (cloudflare.config.ts) and copies that built site as its static assets into
// .cloudflare/output for `cf deploy --prebuilt`. Tests use vitest.config.ts, not this file.
export default defineConfig({
  publicDir: 'apps/site/dist',
  plugins: [cloudflare()],
});
