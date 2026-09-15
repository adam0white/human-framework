# Belief Revision and Planning Implementation Plan

**Goal:** Close two connected executable gaps: evidence-sensitive belief revision, followed by bounded planning across purposes.
**Architecture:** Add independent versioned cognition modules composing unchanged sustained-person state. Belief records are actor-bound; plans are detached forecasts from visible data. Hosts own events, resources and actual outcomes.
**Tech Stack:** JavaScript ES modules, Node >=22, node:test, offline private npm package.
**Spec:** docs/superpowers/specs/2026-09-14-belief-planning.md

## Constraints

No modification to frozen src/person, src/development, src/human, src/runtime or public assets. No external inference, no human calibration claim, no schedule restart. Fixed bounded state/search and explicit unknown/conflict handling. Parent owns integration, package and documentation; workers own separate module/test files.

## Sequence

- [x] Implement and verify `src/cognition/beliefs.js` with tests for stale arrival, independent disagreement, duplicate origin, expiry, correction/retraction, ownership and JSON continuation.
- [x] Freeze belief API; implement `src/cognition/planner.js` and tests for multistep preparation, deadlines, unknown/conflict, competing goals, deterministic budget exhaustion and parity with a greedy control.
- [x] Integrate both with real sustained-person attempts in `examples/deliberating-person`; verify forecast failure leads to observed revision/replanning without imaginary fulfillment.
- [x] Package explicitly selected sources; run separately authored consumer with repository reads denied and compare exact installed source bytes.
- [x] Independent correctness/causal reviews, fix concrete defects, run full regression, save comparative evidence and boundaries.
- [x] Update handoff/roadmap/coverage; commit and push; verify remote equality and unchanged public release; remove own worktree.

Ruling: sequential gaps means belief behavior is verified before planner implementation proceeds; independent planning design and package scaffolding can proceed alongside belief work. User authorization covers routine technical decisions and delivery without repeated approval.

Final verification: 966 tests pass. Both gaps are implemented in sequence; twenty-one comparison runs and the independent installed consumer are recorded in artifacts/deliberating-person. Public source remains app 0.15 on its recorded commit.
