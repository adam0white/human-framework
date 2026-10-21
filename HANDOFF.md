# Handoff — HF (Human Framework)

Updated 2026-10-20. Read [AGENTS.md](AGENTS.md) for rules and the current increment, [docs/framework.md](docs/framework.md) for the architecture, and [docs/roadmap.md](docs/roadmap.md) for what could come next. Older state entries are in [docs/history.md](docs/history.md); every release receipt is in [docs/releases.md](docs/releases.md).

## What remains

- **Current increment (AGENTS.md):** *Projects and persistence*, released as HF 2.14.0 / engine 2.14.0 with the island rerun recorded. The owner reviews. Left from it, targeted in [roadmap §3b](docs/roadmap.md): net project progress, and carrying a project over into a host task.
- **Owner acceptance outstanding:** Good Hands (play it); Neighbours feel; external-game feel generally.
- **Lab:** the owner's resend of the day-12 Valley run is the first live check of the raised upload bounds. Valley's lab-client 0.1.2 bump and Hearsay's integration wait on their own agents. F-192 (Firefox regular lab events) follow-up by 2026-10-27.
- **Deferred by owner, no date:** first lab-client npm publication and its trusted publisher.
- **Rechecks:** lanes model measured to 2026-10-27 ([velocity sweep](docs/lab/velocity-sweep-2026-10-20.md)); Cloudflare `cf` CLI on 2026-12-01 ([findings](docs/findings.md)); The Night Watch §12 deferred list by 2026-11-05.

## Current state

- **HF 2.14.0 / engine 2.14.0, *Projects and persistence* (2026-10-20), latest release.** Opt-in `enableProjects` (a person with met needs adopts a self-set project from a host-shown `Percept.prospect`) and `enablePersistence` (a started pursuit gets a bounded bonus and switching cost, gated by needs and fear, never on duties). Control: `packages/human/examples/projects-control.ts`. The site pins 2.14.0. Island rerun on 2.14.0: small piles on the Spire in free time (median 2 objects, random 0), carry task median 1.5 of 10, not better than 2.12.0 ([experiment](docs/lab/experiments/island-2026-10-20.md#rerun-with-engine-214-hf5)). Receipts: [CHANGELOG](CHANGELOG.md).
- **HF 2.11.0 to 2.13.0 (2026-10-20).** Curiosity and play, bounded planning (depth 2 to 5), and *Why not* (`SuggestionResolution.decidedBy`, `Commitment.firm`), all opt-in.
- **HF 2.10.0, *Word and witness* (2026-10-20).** Belief provenance, `contradicted`, believed regard. The requesting games pinned 2.10.0 but adopted only `seedSourceTrust` ([findings](docs/findings.md)).
- **HF 2.9.1 (2026-10-20), Host kit and maintenance sweep.** Behaviour-neutral: `seedSourceTrust`, `seedBelief`, `fingerprint`, `tellDeath(..., { late })`, [host recipes](docs/host-kit.md) with doc tests. Deprecations stay until 3.0. Dependencies at latest; Vite pinned 8.3.4 by `overrides`; Worker `compatibility_date` 2026-10-20. `npm run release` runs from a detached checkout of `origin/main`, so a clean worktree can release.
- **Games.** In-site: *Twice at the Well*, *The Day You Say Nothing*, *The Night Watch* (graduated; each game doc ends with its deferred list). External, each repository owns its own evidence: The Pass, The Glance, The Two Voices, The Rope, Small Works (repair.adamwhite.work), Valley, Stairwell, Warren, Hearsay, Neighbours (Concordia fork), Good Hands (goodhands.adamwhite.work, HF 2.9.0, owner play outstanding). Island (`~/code/island`, private `adam0white/island`) is the pilot that found HF people idle once needs are met.
- **Playtester (`packages/playtester`, private).** HF people play games through a four-call adapter. Personas, edge-pushers (`mischief`, `exploiter`, `rulesLawyer`), a `returner`, cohort runner and build-to-build comparison. Adapters for The Pass, The Glance and The Two Voices in `packages/playtester/adapters/`. Run: `npm run build -w packages/human && node packages/playtester/examples/cohort.ts run game=pass seeds=3`. The HF "designer" experiment is a negative finding ([findings](docs/findings.md)).
- **Game lab.** Lab client 0.1.2 (GitHub release, not on npm) and lab kit 0.1.0 (no game uses it yet). Worker upload bounds: 4 MiB inflated, 2 MiB gzip, 480,000 tokens, 60,000 containers, depth 64 (`apps/site/src/lab/core.ts`). Ledger and routing: [docs/lab/](docs/lab/); clarity checklist [docs/lab/design-language.md](docs/lab/design-language.md).
- **Tooling.** One worktree per agent (`npm run wt`); `npm run check:lane` before commits; CI is the source of truth; `npm run deploy` needs a green `ci` on the exact commit. Default test timeout 120 s.

## Unverified

A real Galaxy S26 (wake lock, fullscreen, safe areas) and iOS; the playtest file download on a device; bench timings on a quiet machine; 50-year save sizes on seeds other than 1; TypeScript 5.x consumers. These are listed in the roadmap.

## Public repository

Public since 2026-10-06: MIT for code, CC BY 4.0 for `docs/`, `research/`, `archive/research/` and `archive/v0/docs/`. `bash scripts/after-public.sh` (safe to re-run) set secret scanning with push protection, private vulnerability reporting, ruleset `main` (id 24627807, [.github/rulesets/main.json](.github/rulesets/main.json): no deletion, no force-push, required check `ci`, admins bypass), SHA-pinned actions, approval for outside fork PRs, and weekly CodeQL (variable `CODEQL_SCHEDULE=true`; clear it if the repository goes private). Do not enable CodeQL default setup.

Dependabot alerts are on; `.github/dependabot.yml` excludes `archive/**` (owner, 2026-10-20). `allowScripts` permits the installed esbuild and workerd install scripts; fsevents stays denied. Wrangler's miniflare pins a patched sharp, so no override is needed.

## npm

`@adam0white/human-framework` publishes from `packages/human`. Release with `npm run release` (tag, GitHub release, tarball); the GitHub release starts [.github/workflows/publish.yml](.github/workflows/publish.yml), which checks the tag against the version, runs typecheck and framework tests, and publishes with trusted publishing (OIDC, provenance, no token). A version npm already has is skipped. Rehearse with Actions, "Publish to npm", dry run on. An npm token, if the owner provides one, lives only in `~/.npmrc` or an Actions secret. Setup history: [releases.md](docs/releases.md#npm-setup-2026-10-07).

## Cloudflare

- Zone `adamwhite.work` (2026-10-04): HSTS max-age 6 months (no subdomains, no preload) with nosniff; minimum TLS 1.2.
- Repair host (2026-10-10): Configuration Rule disables injected Web Analytics only for `repair.adamwhite.work` (ruleset `c719d70599d249c789cef3d7155553ab`, rule `7cc299cfa7bf41bd9e4d0a86746015a3`, phase `http_config_settings`, ref `repair_game_disable_rum`).
- Lab (2026-10-19): private R2 bucket `hf-lab`, request logs off. Worker `human-framework` with lab-only routes and ASSETS. Rate-limit namespaces 4101 to 4104 (`RUNS_ALL` 12/minute per location). Cron `*/10 * * * *` advances at most 24 raw batches and one run-index page. Each UTC day is bounded to 1,000 event batches and 200 run reservations; checkpoint tombstones stop cleaned session IDs returning. Workers AI budget: $5 (2026-10-18) plus $5 (2026-10-20), hard caps per experiment.
