# Autonomous Advancement Implementation Plan

> **For agentic workers:** Use isolated subagent implementation and independent review for each deliverable. User authorization covers execution and release without another approval cycle.

**Goal:** Ship multiple meaningful playable applications and advance mechanism evidence while preserving the stable kit.

**Architecture:** Independent game wrappers/hosts consume frozen runtime modules. Research candidates and experimental rivals remain private. One coordinator owns shared routing, release metadata, integration and deployment.

**Tech Stack:** JavaScript ES modules, Node >=22, native browser APIs, pinned Wrangler 4.129.0.

**Spec:** [Autonomous advancement design](../specs/2026-09-08-autonomous-advancement-design.md).

## Global constraints

- Preserve frozen Human/runtime versions and source locks, historic saves, Solo Repair and negative results.
- No third-party simulation dependency or LLM in the actor loop.
- Keep host resources and consent outside body and memory components.
- Keep general model limitations in collapsed UI notes; ordinary play explains objectives, actions and consequences.
- Only the coordinator modifies shared routes, gallery, version, handoff and roadmap.

## Execution checklist

- [x] Inspect handoff, contract, roadmap, live-delivery policy and clean main at `33418c4`; run baseline (280 passing tests).
- [x] Create and read back hourly heartbeat `advance-human-framework`, attached to this task.
- [x] Dispatch `codex/commons-next`, `codex/mechanism-rival` and `codex/watch-playable` to independent Astra Ultra workers.
- [ ] Common Ground lane: write specific design, test unchanged control/pre-milestone behavior, implement finite chapter, test distinct feasible allocations and save validation, record scoped comparison, commit.
- [ ] Mechanism lane: commit preregistered schedules and metrics before outcome runs, test information/time/resource parity, implement rival and runner, freeze and execute partitions, retain raw evidence and caveats, commit.
- [ ] Watch lane: write specific design, test two feasible routes and deadline failure, implement host and mobile UI through exported runtime, verify partial work/ownership/consent/save resume, record traces, commit.
- [ ] Coordinator memory candidate: write delayed-cue protocol before results; test actor ownership, capacity eviction, time and receipt monotonicity, contradictory reports, expiry and JSON resume; implement private module and deterministic rival probe.
- [ ] Inspect all lane diffs; cross-review through two independent Astra lenses while coordinator verifies integration. Freeze scoped source snapshot and run two independent Claude Fable reviews. Verify and fix findings; record failures and unresolved limits.
- [ ] Register `/commons-next/` and `/watch/` in `scripts/public-pages.js`, `web/games.html` and affected route/build tests; update app version only, keeping simulation versions frozen.
- [ ] Run `PATH=/opt/homebrew/bin:$PATH npm test`, runtime package checks and `npm run deploy:check`; perform desktop/mobile browser QA of changed flows and existing control.
- [ ] Commit intended files, push main and lane provenance, run `npm run deploy`, verify `/release.json` plus every public payload via `npm run verify:live`, and exercise live gameplay.
- [ ] Update release record, HANDOFF, roadmap, coverage and contract with verified evidence and next executable milestones. Keep actual app deployment commit separate from later evidence-document HEAD.

## Continuation order

Finish active lanes and review fixes first. Next evaluate a thin attempt/clock coordination helper in the two new hosts against direct wiring; ship it only if it removes repeated obligations without importing host rules. Then investigate one observed play problem or a changing-evidence task. The observation-memory candidate needs a real second consumer and a notebook comparison before public package promotion. Any new general faculty receives a separate version, scope, simpler rival, rejection test and review. Do not interpret a completed synthetic experiment or another game as passage of the five-person explanation gate.
