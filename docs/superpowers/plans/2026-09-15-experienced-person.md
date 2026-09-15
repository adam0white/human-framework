# Experienced Person Implementation Plan

**Goal:** Deliver remembered experience, paid selective attention and traceable inference, then validate reuse before proposing games.
**Architecture:** Optional data-only cognition components and an adapter to frozen adaptive-person. Host world ownership and original attributed evidence stay separate.
**Tech stack:** ESM JavaScript, Node >=22, node:test, no new dependencies.
**Spec:** docs/superpowers/specs/2026-09-15-experienced-person.md

- [x] Round 1: `src/experience/episodes.js`, focused tests, discriminating context/history cases and review.
- [x] Round 2: `src/experience/attention.js` and `inference.js`, focused tests for paid processing, expiry, conflict/retraction and bounded chains.
- [x] Round 3: `src/experience/workspace.js`, reference host and tests; actual receipt derivation, saved pending work, attention->belief->inference->choice chain.
- [x] Package experienced-person with explicit subpath exports and source allowlist; independently installed non-game consumer with repository access denied.
- [x] Cross-review code and causal evidence; full tests, frozen source checks, public identity checks, source hashes and evidence.
- [x] Fresh subagent game-idea round only after integrated framework verification; synthesize narrow ideas grounded in completed scope.
- [x] Update handoff/roadmap/API documentation; commit, integrate, push, verify remote main and clean worktree.

Verified 1,102 tests (38 added), eleven cases / 33 candidate-direct-restored runs, exact 26-source offline installation with denied repository access, and unchanged previous sources/public payload. Rounds are separately committed as d13be6f, b064242 and dee8747; final evidence/ideas and remote integration follow.
