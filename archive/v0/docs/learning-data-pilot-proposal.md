# Next milestone: one empirical practice-curve pilot

The current practice rule is a bounded exponential approach to skill 1:

`skill + (1 - skill) × (1 - exp(-rate × quality × active duration))`.

The [implementation](../src/core/model.js) is used by ordinary paid work and affects later durations in Camp; its mechanical consequences are already covered by [synthetic comparisons](mechanism-comparison.md). Its coefficients and latent skill scale are authored engineering choices. Existing synthetic mechanism comparisons test software consequences; they do not fit observed human learning. The next milestone tests a narrow prediction about the curve family using one suitable public repeated-practice dataset. It does not assume a new faculty, change a released runtime, or add a game.

## Data feasibility before fitting

Find a primary research source with an openly accessible, clearly licensed, nonclinical skill-practice dataset. Prefer deidentified individual chronological records, task definitions, and a usable practice-dose or active-time measure. Read the actual methods and data dictionary; preserve original files, attribution, license, versions and hashes privately. Record why the chosen data answer the question and which variables are missing.

Do not turn aggregate means, digitized illustrative figures, undocumented scores or synthetic reconstructions into participant evidence. If only trial/opportunity counts are known, compare shapes in those units and do not infer a per-minute runtime rate. Do not identify or profile participants, infer IQ/personality, or reuse sensitive clinical records for this pilot. If no adequate accessible data are found, report the concrete missing requirements and retain the current engineering-status claim.

## Frozen comparison once data qualify

Commit the exact data subset, exclusions, dose definition, observation link, model forms and chronological validation split before evaluating candidate fits. Separate within-person predictions from aggregate curves; pooling can change an apparent curve shape. Hold out later observations without using them for preprocessing choices or model selection. Keep unsuccessful/no-improvement cases.

Compare a no-change reference and serious simple linear, exponential and power-shaped task-performance models where appropriate to the measured outcome. Complexity and observation-link assumptions must be comparable. Report errors, uncertainty, held-out behavior and individual variation without a weighted victory score or a universal human-learning claim.

The runtime's latent proficiency is not directly observed performance. Specify any proposed link to latency, accuracy or output, and expose identifiability limitations. `rate` and `quality` enter the current update through their product; one curve cannot separately identify both without additional information. A task-specific fitted curve does not automatically calibrate the shared .008-per-minute rate or the .65 quality default. Practice-dose changes, breaks, task difficulty and performance strain must not be silently renamed learning.

## Admission decision

A useful outcome is an executable, source-linked real-data comparison that strengthens or challenges a specific curve claim. Keep frozen Human/runtime 0.1.1 and all current games unchanged during this pilot. Any later task-specific adapter or incompatible runtime version needs its own demonstrated use and review. No transfer, forgetting, attention or general-intelligence mechanism follows merely from one curve fit.

This addresses empirical grounding of an existing mechanism. It is separate from actual player understanding, independent authoring benefit, physical-device validation and theological claims, which remain open on their own terms.
