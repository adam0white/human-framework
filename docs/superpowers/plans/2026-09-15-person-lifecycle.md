# Unified Person Lifecycle Implementation Plan

**Goal:** Remove manually coordinated actor identity/time and paid-regulation receipts from real consumers.
**Architecture:** src/developing/person.js composes existing modules; src/developing/index.js exports it. All component sources stay unchanged.
**Spec:** docs/superpowers/specs/2026-09-15-person-lifecycle.md
**Tech stack:** JavaScript, Node >=22, node:test.

- [x] Add composer lifecycle/explicit command dispatch and tests/developing-person.test.js. Verify actor/clock mismatch, no mutation on error, split attempt parity, interruption, pending exclusions, last actual attempt provenance and JSON restore.
- [x] Convert examples/developing-person/appraisal.js to consume composer for appraisal, paid actions and regulation. Preserve same actions, time, outcomes and direct controls.
- [x] Convert installed consumer to exercise composer without source-repository access. Exact source allowlist includes new module; test composite cross-component restoration and actual payment.
- [x] Independent review, appropriate focused tests and final full suite; update evidence, docs and handoff; commit and push after source/package identity checks.

Final integration: 1,027 tests pass, 61 added over baseline. Thirty comparison runs retain direct-rule parity; independent offline consumer verifies exact source bytes and composite restoration. Review and scope limits are recorded in docs/reviews/2026-09-15-developing-person.md.
