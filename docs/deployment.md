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

`scripts/build.js` validates public source roots and rejects symlinks before clearing generated `dist`. It maps the seven explicit entries in `scripts/public-pages.js` to the laboratory, game chooser and five game pages, then copies recognized assets directly inside `web`, `src/core`, `src/scenarios`, `src/human`, `src/runtime`, `src/games`, and the explicitly allowlisted `src/legacy/v0.1` and `src/legacy/v0.2` replay kernels. It writes `_headers` and a release manifest containing app version, laboratory engine version, commit, working-tree status and a digest of all payload files including headers (excluding the manifest itself). Research documents, source exports, replay artifacts, tests, package files, environment files and Git metadata are excluded. Build tests check that old output cannot survive and redirected source paths cannot publish private files.

The laboratory is at `/`; the game chooser is at `/games/`. Host-owned games are at `/workshop/`, `/shift/`, `/courtyard/`, `/courier/`, and `/commons/`. Its host (`workshop-0.1.0`) and human component (`0.1.0`) have independent version contracts. A release's laboratory version alone is not the host save format. The workshop offers active save/resume and a separate optional command replay; it does not import laboratory sessions. Static Assets serves these HTML entries using its [HTML path handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/).

The app has no history-based client routes, so unknown URLs return 404 instead of the homepage. Response headers constrain script loading and framing. `Cache-Control: no-cache, no-transform` asks browsers to revalidate stable module URLs and keeps the delivered payload from being rewritten. The latter prevents the zone's automatically injected analytics beacon from conflicting with the app's script policy; the zone-wide analytics setting is unchanged. This follows Cloudflare's [Web Analytics troubleshooting guidance](https://developers.cloudflare.com/web-analytics/faq/). Keep tabs on one engine release for a run; export before refreshing when preserving that run matters.

## Rollback and future setup

Use the recorded deployed version from the release record to identify a prior good Worker deployment. Verify current Wrangler rollback help and Cloudflare's [rollback rules](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/) before changing production. Alternatively, restore a known source commit on a separate branch, test/build it, and deploy that reviewed version. Never rewrite or reset the user's working changes to perform a rollback.

No GitHub auto-deployment credential or scheduled automation is configured by this release. If automatic deployments become useful, attach the private repository to Workers Builds or use a narrowly scoped CI token; keep the same test/build and live-verification requirements.

Configuration references: [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [headers](https://developers.cloudflare.com/workers/static-assets/headers/).
