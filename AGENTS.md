# Project workflow

[HANDOFF.md](HANDOFF.md) holds state; this file holds rules. Then read [the architecture](docs/framework.md). Accepted goals are in [history](docs/history.md); owner words in [owner directions](docs/owner-directions-2026-10-18.md) (OD).

## Goals

- **Posture (owner, 2026-10-02):** one TypeScript framework with one actor (`Person`), shown through games; full autonomy, bold and opinionated over safe and generic.
- **The owner sets goals.** [The roadmap](docs/roadmap.md) is the menu. Propose from it; do not start a new goal unasked. The repo states what done means when a goal is set.

## Current goal (owner review 2026-11-03)

**HF 4.0 (owner, 2026-10-26, [OD](docs/owner-directions-2026-10-18.md#2026-10-26--hf-40-everything-on-holistic-bolder-games-adam-verbatim)):** "Let's make every opt in feature default v4 go! Sacrifice compatibility and saves. … we should consolidate and eliminate redundancy in the input/output, features and code across HF itself." Every faculty is always on: no `enable*` switches, legacy-continuation paths or separate fast option. People differ through state, never switches. Each concern has one way in and one way out. Game requests become ordinary faculties. Old saves, exports and 3.x compatibility are given up; games may stay on 3.x. **3.x patches keep explicit opt-in and exact legacy continuation; 4.x does not.**

Done means (coordinator proposals, owner may change):

- **4.0:** a plan giving every switch, duplicate path and redundant input or output its fate; 4.0.0 published with provenance, exact green CI and a CHANGELOG migration section; tests rewritten for the always-on person and useless tests deleted, one control per merged faculty, replay-hash test kept; a daily clock kept as a first-class larger step; Codex and Opus reviews; new games on 4.0 and redeployed; each existing game on 4.0 or recorded as staying on 3.x with a reason; docs and site updated.
- **Roadmap sweep (owner, 2026-10-23):** "we just gotta find & squash those nasty bugs across games, and keep pushing HF through its roadmap." Project undo protection and net project credit, then narration variety; a published minor, two reviews, the site deployed, a ten-seed island rerun recorded even if negative.
- **Cast (owner, 2026-10-23, [OD](docs/owner-directions-2026-10-18.md#2026-10-23-cast-size-and-between-games-life-adam-verbatim)):** a target of about 40 foreground people, 3–8 per game, most in two or more games; a new person needs a [registry](docs/lab/cast-registry.md) entry with backstory, secrets and outcomes. Seeded, bounded between-games life on the browser shelf, one device, no server. All 15 games adopt it. No game is frozen; Small Works, Neighbours and Rope take ordinary work (owner, 2026-10-27).
- **v3 widened (owner, 2026-10-25, [OD](docs/owner-directions-2026-10-18.md#2026-10-25--everything-remaining-adam-verbatim)):** "Let's address everything remaining from all horizons and roadmap, and update docs, websites, games and whatnot." Each open Horizon 1–3, roadmap and Deferred item ships, or keeps a reason and date only if it needs owner or player input or a guardrail excludes it. Dependencies and `compatibility_date` current; sweep done in every repo; each Horizon 3 bet has its first experiment recorded.
- **Playtests (owner, 2026-10-25, [OD](docs/owner-directions-2026-10-18.md#2026-10-25--finish-everything-and-four-decisions-adam-verbatim)):** each game gets a lab-panel round, fixes and a same-tester retest. It is finished when a retest raises no new blocking ask, or after two iterations; the rest goes to its Deferred list with a date. Feedback offers "I'm stopping" and "I'm confused". Lab client and kit stay release artifacts. The package needs TypeScript 7 or later.
- **New games (owner, 2026-10-26, [OD](docs/owner-directions-2026-10-18.md#2026-10-26--bold-new-games-hf-further-pnpm-everywhere-adam-verbatim)):** "Is it time to get another game or four … Let's go bold. Push HF further, too." Up to four; existing playtests come first. Each concept gets a Fable draft, an Opus adversarial review and an Astra wildcard review; only survivors are built. Each has its own repo, a design doc with a Deferred list, registry cast, exact HF pin, replaying export, signed commits, exact green CI, a `dirty:false` deploy, a site listing, and a panel round with retest.

## Framework and games

- **Standing direction (owner, 2026-10-04):** HF releases are the output; games demonstrate them. No game code in `packages/human`; no framework logic in games. Each HF release is a GitHub release; games move to it or record why they stay. Keep a game-design expert reviewer in the loop for game work.
- **Engine:** deterministic and independent of LLMs and UI. Person state is plain JSON; all randomness is seeded RNG held in state. One owning module per state slice. Current-version exports replay exactly; older saves may be refused with a start-fresh message.
- **Games:** each has a goal, stakes, failure and decisions with tension. "I'm open to new approaches as well" (owner, 2026-10-26): any language, engine or renderer, with HF as the actor engine through a bridge. Every game offers a playtest export (seed, input log, state) that replays the run.
- **No server infrastructure** unless the owner lifts it. Lifted for lab telemetry only (owner, 2026-10-19, 2026-10-22): Worker plus R2, default-on recording with an off switch, 180-day retention, character analysis by separate opt-in.
- **Real-time and action games are allowed** (owner, 2026-10-26); they stay seeded and replayable from their inputs.
- **Game direction (owner, 2026-10-04), ambitions:** approximate state; show rather than count; slowdown, not hard pauses (the menu pauses); continuous speed; limits from slowly changing capabilities; saves and menus in the fiction. Too-specific wishes can hurt games (owner, 2026-10-22).
- **Plain English (owner, 2026-10-24, [guide](docs/lab/plain-english.md)):** every sentence is understandable without Turkish. Keep setting, places and names. Every flavour word is explained in its first sentence; unexplained ones are the problem, not the count. Names that are hard to read get plain names, starting with Alder Quay → Mill Bridge (owner, 2026-10-26).
- **Analytics (owner, 2026-10-27):** every site loads Cloudflare Web Analytics; CSP allows `static.cloudflareinsights.com` (script) and `cloudflareinsights.com` (connect).
- **No flags (owner, 2026-10-27, [OD](docs/owner-directions-2026-10-18.md#2026-10-27--abolish-feature-flags-automatic-carryover-adam-verbatim)):** every gameplay feature is public; no feature flag or query-string switch hides one. People in more than one game carry over automatically. Cast controls live on the central shelf. The few diagnostics sit in one collapsed "Debug" item beside Lab privacy.
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

- **Allowance (owner, 2026-10-25):** "Keep using our allowance across codex, Claude, and workers AI every heartbeat." Codex builds; Claude reads and judges taste; Workers AI plays.
- **Reviews (owner, 2026-10-20, "Use fewer reviews"):** one independent review per change (Codex, or Opus for design). Two for a behaviour-changing HF release or a new game concept.
- **Tests (owner, 2026-10-20, "focused/less tests"):** tests pin a faculty's own behaviour, plus one headless control. No matrices or tests that restate code. Keep replay-hash and control tests.
- **Build first, prove after.** A faculty lands with tests, a control and a scope comment. Negative findings go to [findings](docs/findings.md); deferrals to the roadmap or a Deferred list, with a target.
- **Lanes (owner, 2026-10-20):** run `npm run check:lane` before every commit. Gated paths (`packages/human`, lab client, kit and Worker, manifests, CI, deploy and release scripts, Worker config) run `npm run check`. CI is the truth: whoever pushes a red `main` fixes or reverts. `npm run deploy` needs green `ci` on the exact commit. The machine lock covers full suites only; focused runs never queue.
- **One worktree per agent** (`npm run wt -- add <repo-dir> <name>`); the shared checkout is for the owner and coordinator. Extracts go to `~/code/.lab-scratch/`. HF releases are serialized.
- **Stack:** TypeScript 7.0.2 (strict, `noUncheckedIndexedAccess`), Vite 8.3.5, Vitest 5.0.5, Biome 2.6.3, React 19.3.1, Wrangler 4.152.0, Playwright 1.64.1, Canvas 2D.

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
