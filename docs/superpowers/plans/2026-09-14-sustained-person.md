# Sustained Person Implementation Plan

**Goal:** Deliver continuous days and retained learning with cross-context obligations, reusable independently of a game.
**Architecture:** A private versioned development layer composes unchanged situated-person records with explicitly owned day-scale condition and learning. Two hosts and simpler controls test consequences and portability.
**Tech Stack:** JavaScript ES modules, Node >=22, node:test, offline npm package.
**Spec:** docs/superpowers/specs/2026-09-14-sustained-person.md

## Global constraints

Frozen Human/runtime 0.1.1, situated-person 0.1.0 and public asset allowlist remain unchanged. No new dependencies, inference calls, public UI, schedule restart or claimed empirical calibration. Parent owns integration, package, delivery evidence and documentation. Each delegated worker owns separate files.

## Execution

- [x] Condition and lifecycle: implement `src/development/index.js` and condition support, with `tests/development-person.test.js`. Define exact API before host authoring. Verify paid continuous time, rest/sleep distinction, consumed meals, interruption, no double condition update and snapshot/driver equivalence.
- [x] Learning: implement `src/development/learning.js` with `tests/development-learning.test.js`. Verify paid attributable acquisition, retained access over delays, idempotent receipts, independent items, no transfer, persistence and clock partition equivalence.
- [x] Connected host: implement `examples/sustained-person/sequence.js`, comparison runner and tests. Exercise ordinary repeated days, work/learning/service choices, resource receipts and actor-local commitments; compare explicit interventions and simpler rival without hiding counterexamples.
- [x] Independent reuse: package declared modules as sustained-person 0.1.0; independently authored second consumer uses only installed exports with repository denied. Verify exact packed bytes and lifecycle behavior.
- [x] Integrate: run focused tests and full `npm test`, inspect frozen-source/public payload diffs, run independent causal/correctness reviews, fix substantive findings and rerun affected checks.
- [x] Deliver: save comparative artifacts and verification, revise handoff/roadmap/coverage against actual behavior, commit and push, verify main equals remote and public manifest remains on its recorded app commit. Remove own worktree.

Ruling: the user's explicit request for autonomous substantial work authorizes routine design, implementation, integration and push choices; no repeated design approval gates. Broader scientific, theological and lifespan work remains explicit beyond this delivery; later games are deferred.

Final verification: 939 tests pass, including 27 focused checks. Evidence and source hashes are in artifacts/sustained-person; final delivery commit contains this plan and its evidence.
