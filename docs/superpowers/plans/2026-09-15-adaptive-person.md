# Adaptive Person Implementation Plan

**Goal:** Add persistent habits and voluntary purpose revision, then functional and institutional opportunity constraints through actual reusable consumers.
**Spec:** docs/superpowers/specs/2026-09-15-adaptive-person.md
**Architecture:** New habits actor module and adaptive wrapper over frozen developing-person; functional and institutional states are host-owned.
**Tech stack:** Dependency-free JS, Node>=22, node:test.

- [x] src/adaptation/habits.js with tests/adaptation-habits.test.js: paid context/action repetitions, interruption/reset, active-purpose suggestions, failed-purpose evidence and reviewed acceptance; owner/chronology/duplicate bounds.
- [x] src/adaptive/person.js with tests/adaptive-person.test.js: capture cue/purpose at begin, derive actual completion evidence, synchronize observed time, paid explicit review updates sole situated purpose owner, atomic errors and persistence.
- [x] src/constraints/functional.js with tests/constraints-functional.test.js: restrictions/reassessment, no automatic cure, exact method/action/resource preflight, detached actor notice, no Human mutation.
- [x] src/institution/access.js with tests/institution-access.test.js: canonical permission/capacity/FIFO holds, withdrawal/release/revocation, arbitrary time-jump parity and snapshots.
- [x] examples/adaptive-person/sequence.js and tests/adaptive-sequence.test.js: trace actual repetitions, changed approach after paid failure/review, constrained ordinary method versus costly accommodation, competing actors sharing facility, direct controls and restores.
- [x] scripts/package-adaptive-person.js, independent installed consumer and tests: exact source allowlist, repository access denied, composition exercised by another author.
- [x] Two independent review lenses; resolve concrete defects, full suite/source hashes/public preservation, evidence and handoff/roadmap update, commit/push remote identity verification.

Verification: 1,064 tests pass (37 added), thirteen cases / 39 candidate-direct-restored runs, independent offline installation and exact 21-source identity. Existing source and public payload unchanged; live app remains on de52d9c. Integration/push identity is verified after the delivery commit rather than embedded self-referentially in this file.
