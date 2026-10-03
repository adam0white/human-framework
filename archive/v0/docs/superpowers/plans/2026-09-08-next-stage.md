# Next Stage Implementation Plan

**Goal:** reduce authoring obligations where demonstrated, add changing-evidence play, isolate body effects, and enable optional human play notes.

**Spec:** [Next-stage design](../specs/2026-09-08-next-stage-design.md). JavaScript ES modules, Node >=22, no simulation dependencies or LLM actor execution. User authorization covers implementation and release.

- [x] Reconcile clean main, current handoff/contract/roadmap/review dispositions and live app 0.6 manifest; baseline 347 tests pass.
- [x] Dispatch isolated Astra Ultra lanes `codex/coordination-probe`, `codex/signals-game`, `codex/body-isolation`.
- [x] Coordination lane commits preregistered thresholds, implements private helper and two adapted hosts, tests exact history/resume/receipt/ownership equivalence, records inclusive costs and negative cases, commits evidence.
- [x] Signals lane designs and implements a finite paid-report/route game, tests changed/hidden information, paid actions and save/event invariants, compares retention providers privately, implements mobile UI and commits evidence.
- [x] Body lane commits new protocol, implements pooled body with identical saturating practice and a controlled host, freezes sources, executes reserved comparisons, verifies exposures/resources and commits scoped report.
- [x] Parent implements `web/play-note.js` with pure bounded note export and optional DOM form, then integrates into named game pages without changing physics; focused schema tests and actual browser download verify behavior.
- [x] Fresh Astra reviewers and scoped Fable processes inspect deliverables with overlapping lenses. Verify/fix findings; retain scopes, failures, disagreements and limits.
- [x] Parent integrates reviewed commits, explicit public route and gallery, app metadata and note integrations. Run full tests, minimum-version new tests, runtime packaging and deployment check.
- [x] Exercise local and production browser actions, delayed reports, alternate routes, saved-state transfers, optional note download, visibility pause and mobile/desktop layout. Preserve valid old controls.
- [x] Push main and lane provenance, deploy reviewed app change, verify exact manifest/all public payloads/private paths; write private release evidence and update handoff/roadmap with next executable milestone.

Do not promote the helper/memory module solely because tests pass. If a smaller local representation suffices, deliver the useful host and retain the negative abstraction result. A synthetic note export is browser QA, never a human playtest response.

## Completed delivery

App 0.7 is deployed at `fa16e743feeaee8a9623c1f8da60082a9222c9f2`, Worker `2636b9a0-16fb-45fe-89ad-bf2ea9bc865c`. All 421 tests and 74 new minimum-Node-22 tests pass. Live verification checks 69 exact payloads and 26 private/missing paths; production browser checks cover all seven Signals situations, previous games and optional synthetic note downloads. Original experiments/scenarios and frozen runtime source remain preserved. See [release evidence](../../release-0.7.md) and [review dispositions](../../reviews/2026-09-08-next-review.md). Later private documentation is not another app deployment. Future work is in HANDOFF/roadmap; these completed lanes should not be dispatched again.
