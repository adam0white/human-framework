# Host Integration Implementation Plan

**Goal:** Deliver a host-owned one-worker game using a bounded human component, correct laboratory value/urgency behavior, and obtain two independent Claude Fable overall reviews.

**Architecture:** Pure person transitions handle body/practice and pending attempts. The game supplies object semantics and authoritative events. The existing laboratory remains a separate consumer family with frozen historical replay engines.

**Tech Stack:** JavaScript ES modules, Node built-in tests, browser DOM/CSS and existing Cloudflare Static Assets tooling.

**Spec:** [Host integration design](../specs/2026-09-07-host-integration-design.md).

## Global constraints

No runtime LLM or dependency. Keep Solo social-free. Keep old replays exact. Policy reads projected state only. Host owns world/inventory/time scheduling. Every effect has one writer. Version incompatible changes. Publish only the explicit asset allowlist.

## Work packages

- [x] External review worker: freeze 08aab97, launch two independent `claude -p --model fable` processes with read-only snapshot access and distinct overlapping overall prompts; capture invocation identity, model result and full findings. Root validates findings and records adoption/rejection.
- [x] Policy worker: archive 0.2 before edits; write failing unit-conversion, urgent-goal and planned-actor tests; implement 0.3 contracts, verify current and historical behavior. Root adapts controls and benchmark variants.
- [x] Root human component: write failing lifecycle/accounting tests against the exact public functions in the spec; implement bounded state, strict validation, snapshots and common formula reuse; verify hand-calculated effects and 10,000-event behavior.
- [x] Host worker: write prerequisite/inventory/observable-policy and save/resume tests; implement workshop host and mobile page; add another object interaction through the frozen component boundary. Record integration exceptions instead of editing core.
- [x] Root integration: add explicit asset entry points, laboratory policy descriptions and historical dispatch; run deterministic policy/game comparisons and preserve negative cases with source identity. Review public/private packaging and perform browser QA.
- [x] Root release: inspect complete diff, run appropriate tests/build, address independent reviews, update roadmap/status with executed versus pending gates, commit/push/deploy, verify exact live manifest and mobile interactions.

Execution evidence: [0.3 delivery and production verification](../../release-0.3.md). All mechanical work packages are delivered. The [roadmap](../../roadmap.md) retains human playtesting, physical-device performance, reserved condition families and broader source/model evaluation as separate open gates.

Commands: `node --test tests/human.test.js`, `node --test tests/policy-contracts.test.js tests/legacy.test.js`, `node --test tests/workshop-game.test.js`, then `npm test`. Deploy only after the full release gate. Integration UI and APIs follow the spec signatures; no hidden callback serialization or action-name branches enter the human component.
