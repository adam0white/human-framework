# Handoff — HF (Human Framework)

Updated 2026-10-30. Read [AGENTS.md](AGENTS.md) for owner directions and done criteria, [architecture](docs/framework.md) for the host contract and [roadmap](docs/roadmap.md) for the work queue. Historical delivery and stopped-worker records are preserved in [history](docs/history.md#handoff-snapshot-before-docs-reconciliation-2026-10-25); publication receipts are in [releases](docs/releases.md).

## What remains

- Inbox lock and Voice fresh-start fixes (2026-10-31, [plan](docs/lab/inbox-lock-voice-fresh-start-plan-2026-10-31.md)): `lab:inbox` now fails closed on any existing `.download-lock` and removes only its own on exit (a failed lock-body write leaves any lock for manual recovery); after a killed writer, delete the file by hand once the owner has stopped. Voice's refused-Continue fresh start no longer reruns a stale ordinary init. Source and focused controls only: uncommitted, full lane, reviews and publication remain with root.

- KIAN-ADA travel candidate (2026-10-30): Watch captures the actual quiet dawn portable-v2/calendar checkpoint and Ada care after ordinary preparation. Central adopts published client 0.5.15 / kit 0.5.32, qualifying Watch through the unchanged peer gate. Candidate browser Watch → shelf → Warren admission preserves Ada's care and Kian's return duty; both downloaded chapters replay. The host source journal admits up to 2 MiB; the export end summary carries the departure archive hash instead of a duplicate archive. The measured native save still holds the departure archive (3.69 MB total), preserving exact restoration. Scenario 26 requires fresh chapters. Finish exact-head re-check, green CI, deployment and un-routed live journey verification. Publication, candidate proof and live delivery are separate. Measure a later-dawn receipt against the storage bounds by 2026-11-03; oversized chapters still refuse before a shelf write.

- The live version audit is current through 2026-10-30. HF 4.11–4.15 are released; their exact source, green CI and successful npm publish workflows are recorded in [release receipts](docs/releases.md). All five GitHub release bodies exactly match their CHANGELOG sections. This audit did not repeat package integrity or provenance verification.
- Seventeen of twenty games report HF 4.x. Watch, Voice and Well report HF 4.15.0, with central library 4.15.0. Every checked live manifest reports `dirty:false`. The [per-game table](docs/hf4-game-needs.md#current-live-status) records each live version and commit. The next status audit is due 2026-11-03. Deployment does not establish player acceptance or cross-game carryover.
- Valley remains live on HF 3.0.0 because HF 4 exceeds its simulation and saved-history budgets. Child remains on HF 3.2.0 because HF 4 exceeds its daily simulation and reload budgets. Their workload recheck is scheduled for 2026-11-24; it has not happened. See the [recorded measurements](docs/findings.md#hf-49-g7-perf-exact-simulation-lossless-history-encoding-2026-10-29).
- Neighbours remains live on HF 3.0.0. Its HF 4 port has failing browser checks and a stress-test timeout. Fix and verify the port before deployment; checkpoint 2026-11-03. This is unfinished port work, not owner acceptance of a permanent stay on 3.x.

The following dated entries preserve earlier evidence and work queues. Their version and deployment claims describe their recorded dates, not current status.

- Complete the widened v3 increment: every open horizon, roadmap and game Deferred item must ship, or retain a reason and dated target only when it needs owner/player input or a guardrail excludes it. Roadmap rows belong to the roadmap director. Owner review is 2026-11-03.
- Keep HF releases serialized. HF 4.2.0 is published with provenance ([receipt](docs/releases.md#hf-420--2026-10-27)): reviewed per-person voices extend the single renderer, with unknown voice IDs rejected. Opus findings are fixed and the new-head GitHub Codex review is clear. Exact main CI passed; central deployment is verified at `115abf0`, `dirty:false`, library 4.2.0, games 3.2.0. Game adoption and wording taste review remain separate. HF 4.0.2 was published (2026-10-27, [receipt](docs/releases.md#hf-402--2026-10-27)): crisis refractory expiry is fixed after the 4.0.1 step-cost cuts; current exports restore and replay. Its earlier central deployment was verified at `42b5379`, `dirty:false`, with game framework 3.2.0 and framework library 4.0.2. HF 3.2.0 / engine 3.2.0 stays published for games on 3.x. His Word and Three Days are live on 4.0.0; Smoke and Child were then on 3.2.0 with HF needs in the 4.0.1 receipt; game-specific 4.x HF needs and dated targets remain in the [roadmap](docs/roadmap.md), alongside the 4.1 rows. Later core work belongs to the framework director; candidates and first probes are not releases.
- Preserve the fifteen-game HF 3.0 technical delivery receipts separately from receiver proofs and game readiness. Pass migration is delivered at `453be903`; its later SDK follow-up `6fe7908` has exact CI 40260671307 and a clean live manifest. Current native daytime Pass return remains unproved/refused; same-tester retests and owner readiness remain separate. Central Voice, Well and Watch were verified live on 2026-10-26 at signed `00dcdad`, HF 3.2.0 / engine 3.2.0, library 3.2.0 and `dirty:false`. External games then retained their HF 3.0 / engine 2.23 pins until separately upgraded. Later receiver fixes and game feel are separate work.
- Keep later site delivery separate from package publication and player acceptance. The [3.2 site receipt](docs/releases.md#central-site-32-delivery-2026-10-26) records exact green CI and clean deployment `00dcdad`; consult live [release.json](https://human.adamwhite.work/release.json) for later deployments. Preserve both Sun fdlibm notices. The earlier 3.1 receipt remains dated history.
- Preserve F-491 automatic recording linkage, current-version deterministic replay and exact HF legacy continuation. Keep raw owner records, ledgers and research decisions untouched.
- The playtest director runs the authorized HF 3 lab panel: twelve standing testers and two cold slots. Each game gets a round, fixes and the same testers' retest. A retest with no new blocking ask, or two iterations, ends the cycle; remaining asks keep dated Deferred entries. Claim completion only from actual receipts. Friends' playtests and Show HN stay paused. Owner game readiness remains separate.
- Follow up the unresolved historical feedback-note cause and owner retest on 2026-11-03. Production transport acknowledgments do not identify the cause of the owner's missing note. Reports remain in `~/code/.lab-scratch/notelost/` and `~/code/.lab-scratch/hfroad/`.
- Keep the lab client and kit as immutable GitHub release artifacts. The owner chose no npm migration. Client 0.4.11 / kit 0.5.12 are historical published artifacts, adopted centrally at `00dcdad`. Current source pins the later published kit 0.5.13; its publication and the held central deployment are separate. External host adoption needs separate receipts. New Feedback choices require host opt-in and adoption; artifact publication alone does not deliver them to games.
- Recheck the lane trial on 2026-10-27, Watch's deferred list by 2026-11-05 and the Cloudflare CLI on 2026-11-02. Read the current reports before resuming a worker; historical disk-stop instructions are not current ownership instructions.

## SDK scorer artifact delivered

Lab kit 0.5.13 is [published](https://github.com/adam0white/human-framework/releases/tag/lab-kit-v0.5.13) from signed [cfd4a524](https://github.com/adam0white/human-framework/commit/cfd4a524a542a623c53620bbd587d47ed209e66e), with [exact CI 40303167929](https://github.com/adam0white/human-framework/actions/runs/40303167929). The 33,467-byte tar and manifest downloaded exactly; SHA256 is `9e29dd81e413ca9f38c6e3fa11c3f94b6481f41e66d227dea15dc76ef69fe5ed`. Fresh downloaded-root JavaScript and strict TypeScript 7.0.2 consumers passed without the optional client peer or DOM. Normal gated checks passed 2,547 tests with seven existing skips; independent integration review was clear. HF/engine 3.2.0 and client 0.4.11 remain unchanged. No npm SDK publication or central deployment follows from this artifact release.

The optional frozen-forecast scorer is an instrument. Every report retains `humanEvidenceVerified:false`; public study fixtures and synthetic controls do not establish human predictive validity. Real evidence stays PENDING through the registered 2026-11-03 review. See [release receipts](docs/releases.md).

## Central public gameplay delivered 2026-10-27

Central is live at `cb748f2babffddd5a48db7986830789aa003afb5`, `dirty:false`, after exact green CI [40539919744](https://github.com/adam0white/human-framework/actions/runs/40539919744). PRs #17, #19, #20 and #21 deliver public gameplay controls, automatic carryover, the public people shelf, inline i explanations and collapsed Debug beside Lab privacy. A live headless control confirmed public Voice controls, same-line privacy/Debug, closed Debug on reopening and zero page errors; no playtest or panel was run. The [end-screen offer](docs/lab/experiments/cast-end-offer-2026-10-27.md) is an experiment with no player outcome yet.

[Lab kit 0.5.18](https://github.com/adam0white/human-framework/releases/tag/lab-kit-v0.5.18) is published from merge `11d7928`, exact green CI 40536496775, with four release assets. Tar SHA256: `4697fa83bac310ee4cfb1ac92a3415a9bb8c3429cc92dff983021cfdf71f7d10` (34,575 bytes). External game adoption and owner acceptance remain separate.

## Confirmed checkpoint and evidence limits

HF 3.2.0 / engine 3.2.0 is published from signed `a92081e7f3ba349ba4b9ded12339506145b0fea7`, tag `v3.2.0`, exact CI 40256292123 and trusted publish 40256641024. Registry integrity, signature and exact SLSA source/tag/workflow/run/subject were verified; all 201 package files match the GitHub artifact. Nine downloaded-package controls pass, and raw valid loaded 3.1 continuation matches without normalization when optional selectors are omitted. [Release receipts](docs/releases.md) retain publication proof and the separate historical 3.1 receipt. Site source `00dcdad` includes Voice successor `67ab71d`, with exact site CI 40269580618 and CodeQL 40269580572. The [Voice R1 closure sidecar](docs/lab/reviews/hf3-voice-2026-10-25/round1-closure.json) closes collection/canonical metadata only. Its `fix_deployed:false` records the earlier closure time, before site delivery. Compound asks, same-tester retests and owner acceptance remain separate.

Client 0.4.11 / kit 0.5.12 artifacts come from signed `569bfeed8042607e3b0357277e280e8bc1af01f5`, exact CI 40241110596. They were released from the separate `all-feedback` branch; their exact source is now integrated into current source. Their immutable manifests, including the client’s nested HF 3.0 declaration, are not republished or rewritten. Their Feedback labels are ordinary note text; selecting one sends nothing. Submit retains the stored-note receipt contract. Linked agent attribution is unsupported; no synthetic production receipt is claimed. [SDK adoption](docs/lab/navigation-journal-adoption-2026-10-25.md) separates artifact availability, workspace installation and host delivery.

Publication, deployment, receiving-stage checks, player lab cycles and owner acceptance are separate outcomes. [The cast registry](docs/lab/cast-registry.md) retains each receiving stage and its limits. Owner readiness review is 2026-11-03.

## Unverified

A real Galaxy S26 (wake lock, fullscreen, safe areas) and iOS; the playtest file download on a device; bench timings on a quiet machine; 50-year save sizes on seeds other than 1. The package requires TypeScript 7 or later; TS 5 consumer support is not planned. The roadmap owns remaining targets.

## Public repository

Public since 2026-10-06: MIT for code, CC BY 4.0 for `docs/`, `research/`, `archive/research/` and `archive/v0/docs/`. `bash scripts/after-public.sh` (safe to re-run) set secret scanning with push protection, private vulnerability reporting, ruleset `main` (id 24627807, [.github/rulesets/main.json](.github/rulesets/main.json): no deletion, no force-push, required check `ci`, admins bypass), SHA-pinned actions, approval for outside fork PRs, and weekly CodeQL (variable `CODEQL_SCHEDULE=true`; clear it if the repository goes private). Do not enable CodeQL default setup.

Dependabot alerts are on; `.github/dependabot.yml` excludes `archive/**` (owner, 2026-10-20). `allowBuilds` permits the installed esbuild and workerd install scripts; fsevents stays denied. Wrangler's miniflare pins a patched sharp, so no override is needed.

## npm

`@adam0white/human-framework` publishes from `packages/human`. After stamping a package version, run `pnpm install --lockfile-only` and stage `pnpm-lock.yaml` with the changed `package.json` before committing. Release with `npm run release` (tag, GitHub release, tarball); the GitHub release starts [.github/workflows/publish.yml](.github/workflows/publish.yml), which checks the tag against the version, runs typecheck and framework tests, and publishes with trusted publishing (OIDC, provenance, no token). A version npm already has is skipped. Rehearse with Actions, "Publish to npm", dry run on. An npm token, if the owner provides one, lives only in `~/.npmrc` or an Actions secret. Setup history: [releases.md](docs/releases.md#npm-setup-2026-10-07).

## Cloudflare

- Zone `adamwhite.work` (2026-10-04): HSTS max-age 6 months (no subdomains, no preload) with nosniff; minimum TLS 1.2.
- Repair host (2026-10-10): Configuration Rule disables injected Web Analytics only for `repair.adamwhite.work` (ruleset `c719d70599d249c789cef3d7155553ab`, rule `7cc299cfa7bf41bd9e4d0a86746015a3`, phase `http_config_settings`, ref `repair_game_disable_rum`).
- Web Analytics (2026-10-27, owner: "Allow cloudflare analytics everywhere, whitelist or whatever"): RUM site `9b253d93ced243a49210e3c944e67c25` auto-installs the beacon on every `adamwhite.work` host (no host rules); its POST goes to same-origin `/cdn-cgi/rum`. Each site's CSP allows `https://static.cloudflareinsights.com` in `script-src` and keeps `'self'` (plus `https://cloudflareinsights.com`) in `connect-src`, including the `/lab/identity/*` frame. The repair rule above stays enabled until the Small Works CSP fix (757bf47) is live; then set it `enabled:false` (keep it for rollback).
- Lab (2026-10-19): private R2 bucket `hf-lab`, request logs off. Worker `human-framework` with lab-only routes and ASSETS. Rate-limit namespaces 4101 to 4104 (`RUNS_ALL` 12/minute per location). Cron `*/10 * * * *` advances at most 24 raw batches and one run-index page. Each UTC day is bounded to 1,000 event batches and 200 run reservations; checkpoint tombstones stop cleaned session IDs returning. Workers AI budget: $5 (2026-10-18) plus $5 (2026-10-20), hard caps per experiment.
- Web Analytics (2026-10-27): zone config rule `7cc299cf` (disable RUM on repair.adamwhite.work) disabled, not deleted, after Small Works 5896db8 shipped a CSP allowing `static.cloudflareinsights.com` and `cloudflareinsights.com`. Verified live: RUM beacons post, no CSP violations on repair and warren.
- Cache: Cloudflare Standard caching (`aggressive`) retains distinct cache keys for URL parameters. Static HTML, `release.json` and `sw.js` use `no-cache`; hashed bundles use `immutable`. Rocket Loader and Cloudflare Fonts remain on. The unused `zero.adamwhite.work` rules remain unchanged.

## Workers AI lab and optional free-text prototype (2026-10-23)

Protocol and budget reference: the playtest director owns authorized HF 3 lab rounds; friends and Show HN stay paused. The existing work describes daily source-unread Workers AI testers and a default-off Voice request translator. No HF package or engine version changes. See [daily testers](docs/lab/wai-playtesters.md) and [40-input experiment](docs/lab/experiments/free-text-2026-10-23.md). Workers AI has 10,000 free neurons/day, reset at 00:00 UTC; Paid overage is $0.011/1,000 neurons. The usage script queries `aiInferenceAdaptiveGroups.sum.totalNeurons`. The combined runner/inbox/translator hard ceiling is 12,000 neurons per UTC day (10,000 free plus 2,000 overage margin), with the 9,500 account and 8,000 unavailable-analytics local stops retained. Shared R2 CAS admission and the private `WAI_BUDGET_KEY` credential protect the combined ceiling; see the daily testers doc. Coverage and timing gaps remain explicit.

The existing $5 experiment envelope is split: $4 local scripts, including $0.207 debited for documented historical experiments, and $1 for the translator. Local durable reservations live outside git; the translator reserves $0.04/pair in one conditional R2 counter, at most 25 pairs ever and ten/day. Never delete either budget to recover capacity. The new AI binding is used only by fixed-model translation. Worker errors circuit-break future admissions; player confirmation supplies only a currently listed canonical mention to Halil now. Normal menu input remains available, and replay does not call a model. Public request logging remains off.

Clef labels on reports and new inbox notes are opt-in suggestions for a person, never automatic routes or ledger writes. Daily run receipts and remaining work: `~/code/.lab-scratch/wai-daily/report.md`; coordinator ledger lines: `~/code/.lab-scratch/sweep/wai-ledger.md`. The owner reviews the experiment afterwards. Synthetic Workers AI players are weaker evidence than Codex, owner and friend play.


## Frictionless recording and feedback — owner, 2026-10-23

The [new owner direction](docs/owner-directions-2026-10-18.md#2026-10-23-frictionless-recording-and-feedback-adam-verbatim) supersedes earlier separate recording-linkage consent rules. Recording on automatically links continuing play across games on this device, including after identity changes and imports. The first-visit notice covers recording and linkage. DNT/GPC sets the default off only. Turning the single menu recording switch on explicitly opts in. One-page Feedback offers an unticked “Share this run and my play with the lab” checkbox only while recording is off. Submit with it ticked enables recording and linking and sends the run. Unticked sends the note alone, unlinked. Earlier consent state migrates silently. Separate character-analysis opt-in remains.

## Package manager — 2026-10-26

HF development uses pnpm 12.14.0 with the shared Node 26.12.0 runtime pinned in `.node-version`, `.nvmrc` and root `engines`. Published packages keep their Node ≥24 consumer contract. Install with `pnpm install --frozen-lockfile`; `npm ci` no longer applies. The shared store is on the internal drive at `~/Library/pnpm/store` (versioned by pnpm). Worktrees link dependencies from that store. Keep using `npm run` for scripts if preferred. Hoisting is disabled; add real direct dependencies. `pnpm-workspace.yaml` contains the build allowlist and overrides. npm still packs and publishes release tarballs with SLSA provenance through the existing trusted publisher workflows. No package release is needed for this migration. Measurements and stale-worktree conversion instructions: `~/code/.lab-scratch/pkgmgr/report.md`.

## cf CLI trial — 2026-10-26

**Remaining:** workspace Build Output support and upload equivalence; re-check 2026-11-02 ([roadmap](docs/roadmap.md#cf-cli-migration-trial--2026-10-26)). Retain Wrangler 4.152.0, `wrangler.jsonc`, current deploy/auth/R2 scripts and their tests. `cf@1.0.0-beta.21` migration generates the expected config, but root build/dry-run reject the workspace. An app-directory trial builds Vite assets then fails for missing cf Build Output. No cf deployment, authentication change, telemetry write, secret operation or live browser session occurred. Live `/release.json` still reports `1712fc5aeaacfc7a401c89c8e3e24dfa462fb8e3`, `dirty:false` at trial time. The Voice round 1 hold was in force at trial time; its later collection closure and separate site delivery are recorded above.

Trial configs and command logs: `~/code/.lab-scratch/cfcli/evidence/`; mapping and other-repo instructions: `~/code/.lab-scratch/cfcli/report.md`. Only adopt after pkgmgr's actual switch commit and a successful new equivalence trial. A future live cf switch must retain a one-command Wrangler rollback for a clean week; that period has not started.

## G2/G3/G4 and Stairwell — 2026-10-27

Remaining: complete the Stairwell bridge and phase-clock mapping, retained journeys, game-log replay,
exact green merged CI and a clean game deployment. The owner accepts the cross-game feel separately.
Preserve difficulty and No-flags.

- HF 4.4.0 and its client 0.5.2 / kit 0.5.19 companions are verified; central receiver is live at
  bd8e46b, dirty:false, actor 3.2 / library 4.4. The original failed VM adapter remains historical evidence.
- HF 4.5.0 is published from signed source b293ef3235a56985c14db7fb7bfb76a120b122d0 after
  exact green main CI 40628498340 and trusted npm publication 40628971458. Registry signatures,
  attestation, artifact contents and a strict published consumer were verified. It supplies authored
  reputation vocabulary, host traits and held-norm inspection, and authored source-trust response and
  conversation confidence through existing routes. These cover the confirmed Stairwell subset; broader
  G2, G3 and G4 work and the first integrated G1 game remain open. Client 0.5.2 and kit 0.5.19 are unchanged;
  the client intentionally keeps its exact registry 4.4 bridge dependency.
- The Stairwell bridge and phase-clock mapping are under implementation. The ordinary game is not yet
  wired, merged or deployed on 4.x. Historical dependency isolation and public controls do not prove a
  game port or a live peer journey. Raw historical memory requires checkpoint-matching verified source;
  otherwise refuse and keep the file.

Next: complete and verify the actual game bridge, including pending and active work, retained-person
journeys and complete game-log replay. See `~/code/.lab-scratch/codex/hf-g3g4.md` for receipts.
