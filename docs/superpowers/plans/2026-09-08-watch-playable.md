# Before the Water Implementation Plan

> For agentic workers: execute the bounded tasks inline in the assigned isolated worktree; the parent arranges peer review and final integration.

**Goal:** Deliver a mobile/desktop playable inlet-protection episode with two consequential approaches and robust saves.

**Architecture:** A pure host owns parts, tasks, consent and terminal water arrival using the unchanged combined runtime API. A static browser module renders its public view and sends commands. Existing headless evidence stays intact.

**Tech stack:** Node >=22, native ES modules, node:test, HTML/CSS/SVG. No new dependency.

**Spec:** [Playable watch design](../specs/2026-09-08-watch-playable-design.md).

## Global constraints

- Human/runtime 0.1.1, clock 0.1.0 and all frozen transitive sources remain unchanged.
- The parent owns public-page/gallery/package registration, current handoff and deployment.
- Host state is bounded, immutable at the public API, deterministic and validated on import.
- Keep general model limitations in a single collapsed model-notes section.

## Task 1: Host lifecycle and routes

Files: create `tests/watch.test.js`, `src/games/watch.js`.

- [x] Write tests importing `createWatch`, `requestTask`, `interruptTask`, `advanceTo`, `nextEvent`, `getWatchView`, `exportWatch`, `restoreWatch`, `receiveReceipt`.
- [x] Run `PATH=/opt/homebrew/bin:$PATH node --test tests/watch.test.js` and confirm the missing host is the cause of failure.
- [x] Implement the declared lifecycle with action blueprints and strict host reconciliation.
- [x] Run the same tests, inspect route outcomes and amend tests only if a predeclared assumption was wrong; record such changes.

## Task 2: Play and persistence

Files: create `web/watch.html`, `web/watch.css`, `web/watch.js`, `tests/watch-session.test.js`.

- [x] Write executable presentation-session checks for pause controls, event boundaries, commands and no offline catch-up. Static markup checks were replaced by behavioral tests plus browser QA.
- [x] Build responsive layout, part ownership display, per-person action cards and route outcomes.
- [x] Use the same host functions for playback, step, command, interruption, file save/load and autosave. Pause on decision boundaries and visibility change.
- [x] Verify browser behavior against both headless routes and inspect narrow/wide layouts when a browser surface is available.

## Task 3: Evidence and review

Files: create `docs/watch-game.md`, `artifacts/watch-playable/verification.json`.

- [x] Record executable default repair/diversion, the fixed short-notice failure and reviewer-found partial-recovery success traces; preserve exact state comparisons.
- [x] Run the complete existing suite with `PATH=/opt/homebrew/bin:$PATH npm test`; inspect all failures.
- [x] Request parent peer review, reproduce substantive findings with regressions and fix them.
- [x] Commit scoped files and send exact hashes, route/gallery integration steps, tests and remaining limits to the parent.
