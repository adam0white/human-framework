# Unified Person Lifecycle Implementation Plan

**Goal:** Remove manually coordinated actor identity/time and paid-regulation receipts from real consumers.
**Architecture:** src/developing/person.js composes existing modules; src/developing/index.js exports it. All component sources stay unchanged.
**Spec:** docs/superpowers/specs/2026-09-15-person-lifecycle.md
**Tech stack:** JavaScript, Node >=22, node:test.

- [ ] Add composer lifecycle/explicit command dispatch and tests/developing-person.test.js. Verify actor/clock mismatch, no mutation on error, split attempt parity, interruption, pending exclusions, last actual attempt provenance and JSON restore.
- [ ] Convert examples/developing-person/appraisal.js to consume composer for appraisal, paid actions and regulation. Preserve same actions, time, outcomes and direct controls.
- [ ] Convert installed consumer to exercise composer without source-repository access. Exact source allowlist includes new module; test composite cross-component restoration and actual payment.
- [ ] Independent review, appropriate focused tests and final full suite; update evidence, docs and handoff; commit and push after source/package identity checks.
