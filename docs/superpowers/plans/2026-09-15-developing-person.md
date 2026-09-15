# Developing Person Implementation Plan

> Execute with focused subagents and lead-owned integration; user has selected autonomous execution.

**Goal:** Address relationships, sourced understood duty/repair, and adult role development in sequence with causal consumers.

**Architecture:** Private versioned modules compose over unchanged sustained-person and cognition. Hosts own actual outcomes. Actor modules expose only delivered knowledge and explicit personal states.

**Tech Stack:** Dependency-free JavaScript, Node >=22, node:test.

**Spec:** docs/superpowers/specs/2026-09-15-developing-person.md

## Global constraints

Preserve released source bytes and public payload. No game, LLM loop, schedule restart, empirical calibration or religious verdict. Positive source interpretation remains explicitly unreviewed. State and history limits must be explicit.

- [ ] Relationships: src/social/relationships.js and tests/social-relationships.test.js. Test delivered vs withheld failure, cross-context isolation, aid without promise, repair requiring recipient acknowledgment, owner mismatch, bounded history and save/resume before implementing. Lead integrates actual paid support and a later coordination choice; keep direct rule parity.
- [ ] Understood duty: src/meaning/duties.js and tests/meaning-duties.test.js. Test source/understanding/intention separation, partial/failed restitution, recipient autonomy and observer privacy before implementing. Lead integrates costly return/repair against immediate gain; source interpretation cannot mutate canonical outcomes.
- [ ] Adult development: src/lifecourse/adult.js and tests/lifecourse-adult.test.js. Test age-only control, role transitions, qualification evidence, revoked opportunity, persistence, overflow and explicit unmodeled intervals before implementing. Lead integrates changed actions over a defined adult trajectory.
- [ ] Composition: examples/developing-person/sequence.js, scripts/run-developing-person.js, tests/developing-sequence.test.js. Assert actual costs and consequences, controls, restored equality, knowledge boundaries and independent effects of the three mechanisms.
- [ ] Reuse: scripts/package-developing-person.js, examples/developing-consumer/consumer.js, tests/developing-consumer.test.js. Exact allowlist and source hashes; offline install with repository access denied.
- [ ] Review and delivery: two independent reviewers, verify/fix concrete findings, full suite, preserved release bytes, recorded evidence, roadmap/handoff update, commit and push with remote equality.
