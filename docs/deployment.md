# Live delivery

The review site is **https://human.adamwhite.work**, deployed as the `human-framework` Cloudflare Worker with Static Assets in the existing Default account. The private source repository is **https://github.com/adam0white/human-framework**. This replaces localhost as the delivery destination. The browser runs the simulation locally; no simulation backend, account login or inference API is required.

## Release workflow

The user's 2026-09-07 instruction authorizes pushing and deploying app changes as the ongoing workflow. This is an explicit release workflow, not automatic deployment on every GitHub push.

1. Implement and review a bounded change. Keep simulation behavior unchanged for presentation-only releases, so existing versioned replays continue working.
2. Run `npm test` and browser QA appropriate to the changed interactions. For deployment packaging, run `npm run deploy:check`.
3. Inspect `git status` and the diff. Commit intended files and `git push origin main`. Keep source research, benchmark artifacts and provenance in the private repository.
4. Run `npm run deploy`. This repeats the automated tests, rebuilds the explicit public asset set, checks a clean working tree on `main` matching the pushed remote commit, and deploys using the pinned local Wrangler version.
5. Check the live app, a JavaScript module, and a missing/private path. Compare `https://human.adamwhite.work/release.json` with local `dist/release.json` and the pushed commit. Run `npm run verify:live -- /tmp/human-framework-live-verification.json` to check the pushed source, manifest, every public payload byte, required response headers and private/missing 404s. Then verify real browser interaction at desktop and mobile widths.

For a fresh checkout, use `npm ci` to install the pinned **deployment tooling**. Local `npm start`, `npm test`, CLI simulation and the browser's simulation runtime use Node/browser built-ins; they do not require third-party runtime dependencies.

`wrangler.jsonc` records the account, Worker name, domain and asset directory. The custom domain provisions the Worker route and certificate through the existing Cloudflare zone. Credentials remain in the local Wrangler authentication store or a separately configured CI secret store; they are never copied into the build.

## Public boundary and caching

`scripts/public-pages.js` selects the HTML entries and `scripts/public-assets.js` selects every JS/CSS/media asset explicitly. The build rejects redirected files and ancestors and links all selected static JavaScript imports before clearing old output. The local server uses the same selection and exact canonical-path rule. New adjacent experiments do not enter either surface automatically.

The root and `/games/` serve the curated example chooser. The camp is at `/camp/`; ten earlier game/variation routes remain available, with seven under an optional earlier-experiments disclosure. There is no required playing order or permanent route commitment. The laboratory interface, guidance/styles, simulation/controller/observation kernels, presets and historical legacy engines are no longer published or locally served. Historical source stays private; `src/core/model.js` and `random.js` remain public dependencies of playable hosts.

The manifest records app version, selected package runtime version, clock version, source commit, dirty status and the digest of payload files including headers (excluding the manifest). Runtime 0.1.1 is the package boundary; some examples still import Human 0.1.0, so this is not a claim that every host uses the same component/save version. The obsolete laboratory `engineVersion` field is removed in app 0.12. Game-specific contracts remain separate. The static guard's [bounded scope](public-module-graph.md) excludes dynamic imports and runtime/HTML/CSS/fetch/worker behavior.

Research documents, exports, replay artifacts, tests, package files, environment files and Git metadata remain excluded. Live verification checks every public payload and explicit private/retired paths; browser checks cover navigation and actual example interaction. Static Assets serves the HTML entries using its [HTML path handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/).

The app has no history-based client routes, so unknown URLs return 404 instead of the homepage. Response headers constrain script loading and framing. `Cache-Control: no-cache, no-transform` asks browsers to revalidate stable module URLs and keeps the delivered payload from being rewritten. The latter prevents the zone's automatically injected analytics beacon from conflicting with the app's script policy; the zone-wide analytics setting is unchanged. This follows Cloudflare's [Web Analytics troubleshooting guidance](https://developers.cloudflare.com/web-analytics/faq/). Keep tabs on one engine release for a run; export before refreshing when preserving that run matters.

Browser QA must distinguish a real failed navigation from a Cloudflare speculative prefetch refusal. Speed Brain can respond 503 to a request marked `sec-purpose: prefetch` on Worker routes; the response identifies `cf-speculation-refused`. Record that case separately only when it is a non-navigation prefetch with the expected refusal header. Keep actual page and module failures as blockers. [Cloudflare behavior](https://developers.cloudflare.com/speed/optimization/content/speed-brain/).

## Rollback and future setup

Use the recorded deployed version from the release record to identify a prior good Worker deployment. Verify current Wrangler rollback help and Cloudflare's [rollback rules](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/) before changing production. Alternatively, restore a known source commit on a separate branch, test/build it, and deploy that reviewed version. Never rewrite or reset the user's working changes to perform a rollback.

App 0.6 adds no GitHub auto-deployment credential. The user-authorized hourly Codex heartbeat `advance-human-framework` continues development in the originating task, including the same review/test/push/deploy/live-verification workflow for app changes. It is a local task continuation, not a simulation backend or Worker cron. It reports meaningful milestones and blockers rather than routine hourly status. Future CI deployment should retain these release requirements.

Configuration references: [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [headers](https://developers.cloudflare.com/workers/static-assets/headers/).
