# Common Ground Implementation Plan

> **For agentic workers:** Implementation delegated by the root agent on an isolated worktree. Execute this accepted spec inline and return a reviewed commit.

**Goal:** Deliver a playable persistent worksite with concurrent jobs and explicit project commitments.

**Architecture:** `src/games/commons.js` owns the world and immutable commands around unchanged Human and a separately authored clock. `commons-policy.js` exposes two inspectable player controllers; web files adapt the same host to manual or real-time play.

**Tech Stack:** Browser ES modules, Node.js 22 tests, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-07-common-ground-design.md`

## Constraints

- No changes to Human, core, or existing games.
- Integer simulated minutes; advance bounded at 1,440 minutes per call.
- Shared communal stock is debited into pending reservations before another job starts.
- User-authorized implementation and commits; root owns routes, packaging, global docs, deployment.

## Tasks

- [x] Add lifecycle tests in `tests/commons-game.test.js`: concurrent `gather-timber` and neighbor committed shelter work must finish at independent times; cancellation restores costs but cannot restore paid time or create output.
- [x] Implement `createGame({solo=false})`, `startJob(game,jobId)`, `requestProject(game,projectId)`, `releaseProject(game)`, `cancelJob(game)`, `advanceGame(game,minutes)`, `advanceToNextEvent(game)`, `getGameView(game)`, `exportGame(game)`, `restoreGame(snapshot)` in `src/games/commons.js`.
- [x] Add deterministic resume/chunking/conservation/forged-state/long-run tests and harden host validation until all pass.
- [x] Add two visible-state controllers in `src/games/commons-policy.js`, reproducible benchmark in `scripts/commons-benchmark.js`, and compare first milestone outcomes and costs.
- [x] Build `web/commons.html`, `.css`, `.js` with paused orientation, shared world clock, actor countdowns, stock, staged structures, project consent, next-event/play speeds, and bounded saves.
- [x] Run host tests, full regression suite, benchmark, and browser review. Record evidence and limits in `docs/commons-game.md`. Commit only owned files and report root integration needs.
