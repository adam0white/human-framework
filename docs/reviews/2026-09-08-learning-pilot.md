# Empirical learning pilot: review dispositions

This private research milestone uses bounded Astra Ultra implementation and independent review lanes. No Fable or Claude call was made for this pilot. Reviews concern distinct scopes; a source clearance is not numerical verification, and synthetic runner tests are not evidence of human learning.

## Before outcome evaluation

An independent methods reviewer read the proposal and access documentation without participant trajectories, trends or holdout values. The reviewer requested a fixed power-origin sensitivity, exact numerical/boundary/failure rules, and an explicit instantaneous boundary for all three curved predictors. These changes are included in the original analytic protocol commit `de2fc86527ec073a89ddba5ea884cc32887c620d`. A three-parameter clipped-linear candidate was removed before the freeze; ordinary signed OLS with nonnegative output clipping is the simpler linear predictor. There is no result from the discarded candidate.

The [independent primary-source review](2026-09-08-learning-source.md) verified task chronology, absence of live pre-task tosses, normalized center-error interpretation, the invalid total-practice timers, license/provenance and known published results. Corrections in `69c793e0a0a033361cf92ad492b0b0ef99caac33` clarify that all participant-level artifacts remain private, precisely describe the authors' rounded-slope exclusion, and note that the paper also reports its all-55 result. The protocol's analytic decisions did not change. The administrative source checker produces counts; the runner must enforce the frozen schema before fitting.

Root's implementation review identified two reporting defects before the real-data run: a finite positive amplitude does not justify a `rate_identified` flag, and the recent-ten constant's fitting objective must use its actual ten-observation fit window. The runner uses a descriptive `nonconstant_finite_shape` flag and records the recent-ten objective separately from all-thirty training RMSE. Neither correction is an empirical result or a change to forecast formulas.

## Numerical execution and final interpretation

The independent numerical review, executable source freeze, actual checks and final admission decision will be linked here after execution. Preserve original evidence and label any subsequent corrections explicitly.
