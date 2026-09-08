# Before the rain Implementation Plan

**Goal:** Give Common Ground surplus two useful destinations with distinct deadlines in a short, separately saved episode.
**Architecture:** A small wrapper delegates work and bodies to the preserved host; a new page renders its public view. The wrapper owns only checkpoints, allocation receipts and conclusion.
**Tech Stack:** Existing dependency-free JavaScript, Node test runner, browser modules.
**Spec:** [Design](../specs/2026-09-08-commons-next-design.md).

## Constraints

Do not edit frozen Common Ground/Human/clock, shared page registration, catalog, package or handoff files. No migration of original saves. Parent handles integration, review and release.

## Task 1: Episode boundary and headless contracts

Files: `src/games/commons-next.js`, `tests/commons-next.test.js`.

- [x] Write tests that import the new module and exercise the reproducible opening, spending an earned cache exactly once, ferry/dusk checkpoints, pending jobs, original refusal/release and malformed saves. Run `node --test tests/commons-next.test.js` before production implementation and observe missing-feature failures.
- [x] Implement `createGame`, `getGameView`, base-compatible work/recovery commands, `allocateCache(game, destination)`, `dispatchFerry`, `finishDay`, `exportGame`, `restoreGame`. Wrapper uses `world` for the frozen host and bounded `production`/`allocations` receipts for ownership and timing.
- [x] Run focused tests. Inspect immutable input, rounded visible capacity and exact final-checkpoint behavior. Record baseline equality through matched commands.

## Task 2: Playable presentation

Files: `web/commons-next.html`, `web/commons-next.css`, `web/commons-next.js`.

- [x] Render destination yield/deadline/opportunity cost, currently available caches, complete-job time estimates and recovery choices from `getGameView`.
- [x] Wire work, request/release, allocate, explicit dispatch/finish, pause/play/event stepping, separate save import/export and restart. Always pause on both checkpoints and hidden tabs.
- [x] Check modules parse and full test suite passes. Parent registers `/commons-next/` and checks desktop/mobile interactions.

## Task 3: Bounded comparison and evidence

Files: `scripts/commons-next-comparison.js`, `artifacts/commons-next/comparison.json`, `docs/commons-next.md`.

- [x] Execute original build-first versus stock-first continuation from the same synthetic opening through wrapper checkpoints; record outputs at ferry and dusk and meaningful allocation forks.
- [x] Compare original world bytes under exactly matched commands. Report physical equality and preserved partial/unmet needs; do not infer preference or enjoyment.
- [x] Run full test suite, inspect scoped diff and source locks, commit scoped files. Send parent commit and exact integration instructions, test evidence and open UI/research gates.

Parent route registration, independent review, browser/mobile QA and deployment remain parent integration work. The lane does not claim those complete.
