# Review and verification record

**2026-09-07 update:** this file preserves the first research-only review. Subsequent implementation, source access, adversarial fixes and executed checks are recorded in the [MVP verification record](mvp-status.md). Statements below about unimplemented or unexecuted work describe the earlier stage.

2026-09-06. Deliverable reviewed: the framework proposal and validation program. Three subagent reviewers examined theological/epistemic representation, empirical/mathematical validity, and architecture/experimental design. This is internal adversarial review, not review by an independent research institution or a qualified religious authority. All three reviewers returned substantive results; none failed. No external CLI reviewer received project material.

## Findings and corrections

Five distinct actionable issues were identified after overlapping findings were combined:

| Finding | Correction in the proposal |
|---|---|
| Retention could increase unpracticed proficiency when the configured floor exceeded current skill | Cap the effective retained floor at current post-practice proficiency; separate practice duration from subsequent non-practice time; reserve recovery/consolidation for separate models |
| Belief timing mixed discrete steps and elapsed time, and the policy used the pre-observation belief | Define a within-event posterior, explicit ordering, and belief persistence in the transition contract |
| World-aware rejection reasons and full internal state could become hidden-information channels | Separate requests from attempts, route both NPC and external requests through validation, restrict deliberative views, keep diagnostics separate, and make secret obstacles produce observed consequences |
| Identical realized observation streams would invalidate active-sensing comparisons | Share initial conditions and access/cost rules; allow different actions to generate different observation histories; reserve fixed streams for passive tests |
| Exact replay was conflated with smaller-step numerical refinement | Separate identical-run replay, random-stream independence, and convergence of trajectories or distributions |

The theological reviewer reported no actionable issue in the assigned scope. This does not certify the selected interpretations, establish a complete Maturidi theory of agency, or substitute for the source-by-source qualified review planned in the validation program.

One correction round was applied. No second independent review of the revised text is claimed. The author checked that the reported issues were reflected in the revisions and that the research status and uncalibrated equations remained clear.

## Verification scope

The two supplied local records were read; the underlying historical Google Docs were not obtained. Three fresh research memos contain source links and access limitations. Local document links, equation bounds and retention monotonicity were checked separately as document/mathematical checks. These are not engine tests. All proposed behavioral, empirical, theological and play experiments remain unexecuted.

Remaining work is explicit: choose exact doctrinal editions and mappings, calibrate a bounded empirical domain, define numerical/performance contracts with an actual implementation, test two adapters, and expand the coverage ledger through dedicated reviews. The present artifact is a reviewable research proposal rather than an implementation plan approved for execution.

## 2026-09-07 — Capacity and workload repair (engine 0.2.0)

Three subagent lenses covered independent mechanical defects/replay, observable workload feasibility and evidence status, and UI/privacy/archived-run behavior. These were subagent reviews, not external-model reviews. The root independently reproduced the user's supplied 0.1.0 replay and exercised the revised browser.

Accepted findings fixed: saturated fatigue permitted unlimited work and practice; recovery erased maintenance before clipping; Solo's eight-round budget left no failure slack for reasonable recovery; omitted help effort differed between ranking and execution; disabled belief/practice updates retained value contributions for unavailable updates. The latter switches now explicitly remove both updates and their expected value, without claiming a pure isolated effect. A second scoped review checked the changed contributions and preservation of default scoring.

Verification: 57 automated tests pass. The final 4,000-run benchmark has 400 matching null pairs and a feasible observable recovery probe across all 100 evaluation seeds in each preset. Reviewers checked source hashes and report values. Browser QA covered full-auto completion in all four presets, a manual Solo seed-7 win in 29 rounds with two failed repairs/six rests/two meals, forced recovery and zero-progress feedback, solo social absence, mobile width without overflow, legacy import/read-only controls, and current export/reset/import. Baseline Solo seed 7 also completes with compulsory recovery. General notes remain collapsed. The first browser connector stopped during the final export check; the in-app browser fallback completed the export/import and baseline checks.

The public release workflow follows the recorded test/build/commit/push/deploy checks; the live manifest supplies exact deployed commit identity. Historical 0.1.0 engine files and benchmark records retain their original behavior and are explicitly separated from current results.

## 2026-09-07 — Fresh direction, integration and incentive review

Three new reviewers examined the repository without the preceding conversation, through integration architecture, validation/scientific inference, and gameplay/incentives. All three returned substantive reports. They are fresh internal subagent reviews using the same model family, not external human or independent-model certification. The [consolidated record](post-mvp-review.md) links their reports and distinguishes findings from pending implementation.

The root independently reproduced the six progress-unit sensitivity runs, all 300 Solo recovery-confirmation runs and the two last-round urgency examples. The reviews led to a revised sequence: value/comparison contracts, a host-owned one-worker game, an independent consumer/usefulness gate, then one needed faculty. Arbitrary forced-recovery punishment is unadopted. Current 0.2 runtime and public assets remain unchanged; the new reports and roadmap do not claim a delivered SDK.
