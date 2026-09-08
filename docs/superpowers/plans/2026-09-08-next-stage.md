# Next Stage Implementation Plan

**Goal:** reduce authoring obligations where demonstrated, add changing-evidence play, isolate body effects, and enable optional human play notes.

**Spec:** [Next-stage design](../specs/2026-09-08-next-stage-design.md). JavaScript ES modules, Node >=22, no simulation dependencies or LLM actor execution. User authorization covers implementation and release.

- [x] Reconcile clean main, current handoff/contract/roadmap/review dispositions and live app 0.6 manifest; baseline 347 tests pass.
- [x] Dispatch isolated Astra Ultra lanes `codex/coordination-probe`, `codex/signals-game`, `codex/body-isolation`.
- [x] Coordination lane commits preregistered thresholds, implements private helper and two adapted hosts, tests exact history/resume/receipt/ownership equivalence, records inclusive costs and negative cases, commits evidence.
- [ ] Signals lane designs and implements a finite paid-report/route game, tests changed/hidden information, paid actions and save/event invariants, compares retention providers privately, implements mobile UI and commits evidence.
- [x] Body lane commits new protocol, implements pooled body with identical saturating practice and a controlled host, freezes sources, executes reserved comparisons, verifies exposures/resources and commits scoped report.
- [x] Parent implements `web/play-note.js` with pure bounded note export and optional DOM form, then integrates into named game pages without changing physics; focused schema tests and actual browser download verify behavior.
- [ ] Fresh Astra reviewers and scoped Fable processes inspect deliverables with overlapping lenses. Verify/fix findings; retain scopes, failures, disagreements and limits.
- [ ] Parent integrates reviewed commits, explicit public route and gallery, app metadata and note integrations. Run full tests, minimum-version new tests, runtime packaging and deployment check.
- [ ] Exercise local and production browser actions, delayed reports, alternate routes, saved-state transfers, optional note download, visibility pause and mobile/desktop layout. Preserve valid old controls.
- [ ] Push main and lane provenance, deploy reviewed app change, verify exact manifest/all public payloads/private paths; write private release evidence and update handoff/roadmap with next executable milestone.

Do not promote the helper/memory module solely because tests pass. If a smaller local representation suffices, deliver the useful host and retain the negative abstraction result. A synthetic note export is browser QA, never a human playtest response.

Current checkpoint: coordination protocol 07907e0/implementation 5e2ea2d/evidence 8500a7f and body protocol 780d20d/implementation f8e146f/evidence 6cdf54a integrated. Signals host c242ff1 integrated; author is fixing review-found command-budget and report-attribution issues. Root play-note module has 3 pure tests and real synthetic download/paused-state QA in Watch/rain. Reviews and release remain active; app 0.6 stays live until verification.
