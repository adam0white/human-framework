# Project workflow

[HANDOFF.md](HANDOFF.md) holds state; this file holds rules. Then read [the architecture](docs/framework.md). Accepted goals are in [history](docs/history.md); owner words in [owner directions](docs/owner-directions-2026-10-18.md) (OD).

[Cloud readiness](docs/cloud-readiness.md) records current Mac assumptions and proposed replacements; it does not claim those replacements are deployed.

## Goals

- **Posture (owner, 2026-10-02):** one TypeScript framework with one actor (`Person`), shown through games; full autonomy, bold and opinionated over safe and generic.
- **The owner sets goals.** [The roadmap](docs/roadmap.md) is the menu. Propose from it; do not start a new goal unasked. The repo states what done means when a goal is set.

## Current goal (owner, 2026-11-13 and 2026-11-14)

- **Game lab direction ([OD](docs/owner-directions-2026-10-18.md#2026-11-13--level-up-the-games-adam-verbatim)):** make real games that people outside the lab choose to play, guided by the owner's taste. "We have a good idea on HF, but that shouldn't restrict our Game lab." Fewer, focused directions; the owner decides through variants, design proposals and acceptance gates. Rules that slow the work may be dropped and re-enacted when needed. Game work, its goal and its proposals live in [games `AGENTS.md`](https://github.com/adam0white/games/blob/main/AGENTS.md). HF continues as the framework: releases stay correct, deterministic and published; games adopt them when it helps the game.
- **Still deferred:** multiplayer and account transfer. Faith-adjacent products are a later stage of the project (owner, 2026-11-14).

## Earlier goals, kept for reference

The items below were set before 2026-11-13. They bind HF releases where they describe the framework. Where they place duties on games, the 2026-11-14 changes under each apply.

**HF 4.0 (owner, 2026-10-26, [OD](docs/owner-directions-2026-10-18.md#2026-10-26--hf-40-everything-on-holistic-bolder-games-adam-verbatim)):** "Let's make every opt in feature default v4 go! Sacrifice compatibility and saves. … we should consolidate and eliminate redundancy in the input/output, features and code across HF itself." Every faculty is always on: no `enable*` switches, legacy-continuation paths or separate fast option. People differ through state, never switches. Each concern has one way in and one way out. Game requests become ordinary faculties. Old saves, exports and 3.x compatibility are given up; every game must move to current published 4.x (owner, 2026-11-05; relaxed 2026-11-14: a game moves when it helps the game). **3.x patches keep explicit opt-in and exact legacy continuation; 4.x does not.**

Done means (coordinator proposals, owner may change):

- **4.0:** a plan giving every switch, duplicate path and redundant input or output its fate; 4.0.0 published with provenance, exact green CI and a CHANGELOG migration section; tests rewritten for the always-on person and useless tests deleted, one control per merged faculty, replay-hash test kept; a daily clock kept as a first-class larger step; Codex and Opus reviews; new games on 4.0 and redeployed; each existing game on current published 4.x (the stay-on-3.x allowance is superseded, owner 2026-11-05); docs and site updated.
- **Roadmap sweep (owner, 2026-10-23):** "we just gotta find & squash those nasty bugs across games, and keep pushing HF through its roadmap." Project undo protection and net project credit, then narration variety; a published minor, two reviews, the site deployed, a ten-seed island rerun recorded even if negative.
- **Cast (owner, 2026-10-23, [OD](docs/owner-directions-2026-10-18.md#2026-10-23-cast-size-and-between-games-life-adam-verbatim)):** a target of about 40 foreground people, 3–8 per game, most in two or more games; a new person needs a [registry](docs/lab/cast-registry.md) entry with backstory, secrets and outcomes. Seeded, bounded between-games life on the browser shelf, one device, no server. Adoption is per game and optional since 2026-11-14. No game is frozen; Small Works, Neighbours and Rope take ordinary work (owner, 2026-10-27).
- **v3 widened (owner, 2026-10-25, [OD](docs/owner-directions-2026-10-18.md#2026-10-25--everything-remaining-adam-verbatim)):** "Let's address everything remaining from all horizons and roadmap, and update docs, websites, games and whatnot." Each open Horizon 1–3, roadmap and Deferred item ships, or keeps a reason and date only if it needs owner or player input or a guardrail excludes it. Dependencies and `compatibility_date` current; sweep done in every repo; each Horizon 3 bet has its first experiment recorded.
- **Playtests (owner, 2026-10-25; optional since 2026-11-14, synthetic panels find defects and do not vote on fun, [OD](docs/owner-directions-2026-10-18.md#2026-10-25--finish-everything-and-four-decisions-adam-verbatim)):** each game gets a lab-panel round, fixes and a same-tester retest. It is finished when a retest raises no new blocking ask, or after two iterations; the rest goes to its Deferred list with a date. Feedback offers "I'm stopping" and "I'm confused". Lab client and kit stay release artifacts. The package needs TypeScript 7 or later.
- **New games (owner, 2026-10-26 and 2026-11-05, [OD](docs/owner-directions-2026-10-18.md#2026-10-26--bold-new-games-hf-further-pnpm-everywhere-adam-verbatim)):** "Is it time to get another game or four … Let's go bold. Push HF further, too." New games live in `adam0white/games` and follow its rules. Removed on 2026-11-14: the Astra wildcard review, "Use no Claude", the mandatory synthetic panel round and retest, the hosted Codex review gate, the two-at-a-time limit, the MONO stop, and the registry cast, exact HF pin and replaying export as entry requirements. Kept: original names, characters, art and levels; picture and motion as the main surface; a first minute taught through action; signed commits and exact green CI.

## Framework and games

- **Standing direction (owner, 2026-10-04):** HF releases are this repository's output. Since 2026-11-13 the game lab is not bound by HF and a game need not use it. No game code in `packages/human`; no framework logic in games. Each HF release is a GitHub release; games that use HF move to it when it helps the game.
- **Engine:** deterministic and independent of LLMs and UI. Person state is plain JSON; all randomness is seeded RNG held in state. One owning module per state slice. Current-version exports replay exactly; older saves may be refused with a start-fresh message.
- **Game repository:** New games live in `adam0white/games`, outside HF; no game code enters HF. Per-game CI selects affected games; shared dependencies, tooling or deployment changes run all affected checks. A required aggregate CI job must fail if required checks are skipped. Deploy one complete bundle and verify each game’s path-scoped release manifest against the deployed commit.
- **Games:** each has a goal, stakes, failure and decisions with tension. "I'm open to new approaches as well" (owner, 2026-10-26): any language, engine or renderer, with HF as the actor engine through a bridge. A graduated game that uses HF offers a playtest export (seed, input log, state) that replays the run; prototypes need not.
- **No server infrastructure** unless the owner lifts it. Lifted for lab telemetry only (owner, 2026-10-19, 2026-10-22): Worker plus R2, default-on recording with an off switch, 180-day retention, character analysis by separate opt-in.
- **Real-time and action games are allowed** (owner, 2026-10-26); they stay seeded and replayable from their inputs.
- **Game direction (owner, 2026-10-04), ambitions:** approximate state; show rather than count; slowdown, not hard pauses (the menu pauses); continuous speed; limits from slowly changing capabilities; saves and menus in the fiction. Too-specific wishes can hurt games (owner, 2026-10-22).
- **Plain English (owner, 2026-10-24, [guide](docs/lab/plain-english.md)):** every sentence is understandable without Turkish. Keep setting, places and names. Every flavour word is explained in its first sentence; unexplained ones are the problem, not the count. Names that are hard to read get plain names, starting with Alder Quay → Mill Bridge (owner, 2026-10-26).
- **Analytics (owner, 2026-10-27):** every site loads Cloudflare Web Analytics; CSP allows `static.cloudflareinsights.com` (script) and `cloudflareinsights.com` (connect).
- **Public gameplay (owner, 2026-10-27, [OD](docs/owner-directions-2026-10-18.md)):** every gameplay feature is public. People in more than one game carry over automatically. Cast controls live on the central shelf. The few diagnostics sit in one collapsed "Debug" item beside Lab privacy.
- **Recording (owner, 2026-10-23, [OD](docs/owner-directions-2026-10-18.md#2026-10-23-frictionless-recording-and-feedback-adam-verbatim)):** the first-visit notice covers recording and linking on this device. One menu switch; turning it on opts in despite DNT/GPC. Keep F-491.

## Faith

- **Islam-guided (owner, 2026-10-04):** post-sectarian; where schools differ, the most common position overall, recorded in [research/decisions.md](research/decisions.md). Keep revealed sources, interpretation, findings and assumptions distinct; norms carry provenance.
- **Hard rules:** never compute divine acceptance. Never assign quantities to the ruh. Model a person's understanding of a norm, not a ruling. Source claims from `research/`; never invent rulings. Never name the RNG or scheduler after divine attributes.
- **Faith in games (owner, 2026-10-26):** any game may make faith a theme, a goal or a stake, and let the player fail it ("it might be okay to have a goal about it"). By default prayer and fasting stay quiet parts of a life (owner, 2026-10-04).
- **Death** is allowed where the design needs it (owner, 2026-10-26).

## Taste and lab

- Player words come first, verbatim in `docs/games/*-playtest-*.md`.
- Panel: 12 standing playtesters, 2 cold slots, 3 reviewer personas ([personas](docs/lab/lab-personas.md), [harness](docs/lab/playtest-harness.md)). Friends' playtests and Show HN stay paused until the owner accepts readiness.

## Work rules

- **Allowance (owner, 2026-10-25, 2026-10-27):** "Keep using our allowance across codex, Claude, and workers AI every heartbeat." Codex builds; Claude reads and judges taste. Workers AI enriches the games first; a once-daily run spends the rest of the free quota on reading jobs and a few focused testers given enough to finish ([OD](docs/owner-directions-2026-10-18.md#2026-10-27--workers-ai-for-games-first-reading-sweep-adam-verbatim)).
- **Model choice (owner, 2026-10-27):** every agent, including Opus and Codex agents choosing their own sub-agents, picks the cheapest model that fits. Terra 6.1 or Sonnet 5.5 for short docs, bounded implementation, reading and cautious synthetic play; default Codex or Opus for final review, hard implementation and taste ([experiment](docs/lab/experiments/model-roles-2026-10-27.md)).
- **Reviews (owner, 2026-10-20, 2026-10-28; relaxed 2026-11-14):** a hosted Codex review is required for a behaviour-changing HF release and optional elsewhere. Combine related work into one session and one PR per repo ([OD](docs/owner-directions-2026-10-18.md#2026-10-28--spend-the-codex-week-fewer-reviews-combined-prs-adam-verbatim)). Opus reads for design and taste.
- **Tests (owner, 2026-10-20, "focused/less tests"):** tests pin a faculty's own behaviour, plus one headless control. No matrices or tests that restate code. Keep replay-hash and control tests. Deleting tests is fine (owner, 2026-10-30).
- **Build first, prove after.** A faculty lands with tests, a control and a scope comment. Negative findings go to [findings](docs/findings.md); deferrals to the roadmap or a Deferred list, with a target.
- **Lanes (owner, 2026-10-20):** run `npm run check:lane` before every commit. Gated paths (`packages/human`, lab client, kit and Worker, manifests, CI, deploy and release scripts, Worker config) run `npm run check`. CI is the truth: whoever pushes a red `main` fixes or reverts. `npm run deploy` needs green `ci` on the exact commit. The machine lock covers full suites only; focused runs never queue.
- **Do not overwrite another agent's work;** use a separate worktree (`npm run wt -- add <repo-dir> <name>`) or branch. Extracts go to `~/code/.lab-scratch/`. HF releases are serialized.
- **Stack:** pnpm 12.16.1, Node 26.12.0, TypeScript 7.0.2 (strict, `noUncheckedIndexedAccess`), Vite 8.3.5, Vitest 5.1.0, Biome 2.6.5, React 19.3.1, Wrangler 4.164.0, Playwright 1.64.1, Canvas 2D.

## Worker observability (owner direction, 2026-11-24)

Every Worker in this project that runs code has Workers Observability logs, traces and Cloudflare Issues on; a watcher on the lab's Mac starts a Claude fix run for each new issue. The rule, the config block, what Cloudflare stores and the watcher are in the games repository: [workers/OBSERVABILITY.md](https://github.com/adam0white/games/blob/main/workers/OBSERVABILITY.md). There are no exceptions: the owner decided on 2026-11-24 to enable all of it everywhere, so this repository's Worker carries the block in `wrangler.jsonc` and `cloudflare.config.ts` (keep the two equal). Request logs hold the client address, user agent and derived location for seven days, and a trace holds the R2 object keys a request touched (keys can contain player and record ids); the public lab privacy page (`apps/site/lab/privacy/index.html`, text source `docs/lab/privacy.md`) says so and must change in the same pull request as any change to what is logged. The Worker code logs no player, session or run ids and no payloads. Turning logs, traces or Issues off is an owner decision. A new Worker in this repository starts from the games template.

## Delivery

- `adam0white/human-framework` is public; `main` requires `ci`. MIT for code; CC BY 4.0 for `docs/`, `research/`, `archive/research/`, `archive/v0/docs/`.
- npm `@adam0white/human-framework` (owner, 2026-10-07): agents publish through `npm run release`. A token lives only in `~/.npmrc` or an Actions secret.
- App changes (owner, 2026-09-07, 2026-10-02): test, commit, push `main`, `npm run deploy`, verify `/release.json` against the commit.
- Cloudflare (owner, 2026-10-04): apply `adamwhite.work` zone settings directly; record each in HANDOFF.md.
- Keep Wrangler until the [cf trial gap](docs/roadmap.md#cf-cli-migration-trial--2026-10-26) closes; a switch needs upload equivalence, exact green CI and a Wrangler rollback.
- No credentials in source, logs or builds. Publish only the `apps/site` build.

## Packages (owner, 2026-10-26)

- `pnpm install --frozen-lockfile`, not `npm ci`. After a dependency change, run `pnpm install --lockfile-only` and commit the lockfile.
- `pnpm-workspace.yaml` owns overrides and the build allowlist. No hoisting; declare direct dependencies. Release-age delay 1440 minutes; only `@adam0white/*` bypasses it.
- Node 26.12.0, one shared install, `/opt/homebrew/bin` first on PATH. Packages support Node 24+. `verifyDepsBeforeRun: error`: run a frozen install after updating a branch. Publishing uses npm tarballs with OIDC provenance.
