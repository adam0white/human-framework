# Portable runtime and ongoing play Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development. The user has selected parallel Astra ultra implementation and authorized ongoing commits, pushes and deployment.

**Goal:** Deliver a portable body/practice runtime and clock, clearer courtyard exchanges, and a continuing cooperative worksite.

**Architecture:** The package exports narrow human mechanics and a separate event scheduler. Common Ground owns its concurrent jobs, stock and commitments; browser timing only drives the host. Existing frozen simulations stay unchanged.

**Tech Stack:** Native JavaScript ES modules, Node >=22 tests, browser DOM, existing pinned Cloudflare static deployment tooling.

**Spec:** `docs/superpowers/specs/2026-09-07-portable-ongoing-milestone.md`

## Global Constraints

- No new runtime dependencies or LLM execution.
- Preserve existing human/core/legacy physics and save identities.
- Pure integer-minute scheduler; replay semantics independent of browser speed.
- Public files are explicitly packaged; user snapshots stay private.
- All delegated workers use gpt-6-astra, reasoning effort ultra, separate worktrees.
- Root integrates and deploys; no worker deploys from a feature branch.

### Task 1: Portable runtime and event clock

Owner: `portable_runtime`, `.worktrees/runtime-mvp`, branch `codex/runtime-mvp`.
Files: `src/runtime/clock.js`, `scripts/package-runtime.js`, `tests/runtime-*.test.js`, `docs/portable-runtime.md` and owned packaging metadata. Root owns root npm scripts.
Interfaces: exact six clock functions in the spec; current public human API, with explicit package exports.

- [x] Establish baseline; exercise expected API in failing tests before implementation.
- [x] Implement stable event ordering, strict snapshots and bounded queue; test canceled and equal-time jobs with integer advances.
- [x] Build an allowlisted tarball and install it into a fresh temporary consumer; execute human and clock lifecycles there.
- [x] Record retained and excluded responsibilities; run relevant/full tests; commit.

### Task 2: Courtyard clarity and supplied-run evidence

Owner: `courtyard_experience`, `.worktrees/courtyard-clarity`, branch `codex/courtyard-clarity`.
Files: `web/courtyard.*`, `web/courtyard-guide.js`, focused guidance tests, `docs/user-run-feedback-2026-09-07.md`, private `artifacts/user-runs/2026-09-07/`.
Interfaces: unchanged courtyard `getGameView` and `lastTurn`; pure presentation explanations.

- [x] Validate user snapshots with versioned host imports; preserve exact originals and hashes.
- [x] Explain occupied response slots versus independent subsequent action, capacity risk and actual neighbor goal.
- [x] Show a visible per-person last-interval timeline without inventing a missing historical transcript.
- [x] Check old host/session hashes, focused/full tests and browser interactions; commit.

### Task 3: Common Ground as a whole host

Owner: `ongoing_commons`, `.worktrees/commons-clock`, branch `codex/commons-clock`.
Files: `src/games/commons*.js`, `web/commons.*`, `tests/commons*.test.js`, `scripts/commons-benchmark.js`, `docs/commons-game.md`, owned design details.
Interfaces: human API plus Task 1 clock. Host-owned state and commands with strict import and independent UI driver.

- [x] Establish baseline and write concurrency, reservation, cancellation and time-chunk tests against the intended host API.
- [x] Implement gathering, staged structures, accepted NPC project and recovery; preserve materials and once-only results through interruptions.
- [x] Build paused-first mobile UI with per-person jobs, next event, Play, speed and save/resume.
- [x] Run deterministic progression probe including alternate order and continuation; check long-run bounded state and browser play; commit.

### Task 4: Integration, review and public delivery

Owner: root. Files: `scripts/public-pages.js`, `scripts/build.js`, `tests/build.test.js`, `tests/server.test.js`, `web/games.html`, root package metadata, README, roadmap and release record.

- [x] Add fixture coverage for `/commons/`, runtime modules and private run exclusions; verify failure before adding route/build support.
- [x] Integrate all three branches, preserve source identity and add chooser entry and npm scripts.
- [x] Cross-review each lane with a different author; reproduce material findings and fix before release.
- [x] Full automated tests, package/host contract probe, actual desktop/mobile browser verification, deployment dry run.
- [x] Commit/push intended source, deploy, verify manifest and every public payload byte; record remaining MVP gates accurately.
