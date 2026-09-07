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
