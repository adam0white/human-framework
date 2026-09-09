# Camp reconsideration: completed, candidate stays private

**Keep the current public policy.** The candidate makes Meryem finish a released frame sooner, but it never finishes the whole woodshed sooner in this comparison. After one, eight or fifteen paid gathering minutes, interrupting the trip delays the roof by **2, 21 or 28 minutes**. Its subsequent physical state matches the existing release/re-request control, saving two player API commands without demonstrating better completed-project output.

The interrupted task is complete. The user has paused the scheduled task; it remains paused. Public app **0.14.1** and Camp **0.3.0** are unchanged. Candidate **0.3.1-reconsideration.0** is implemented, tested and retained as private evidence, with no automatic promotion, new cutoff or additional experiment started.

## What was compared

The [prespecified protocol](camp-reconsideration-protocol.md) uses four ordinary, baseline-produced states derived from the earlier C1 history. Meryem has paid 0, 1, 8 or 15 minutes of a 21-minute salvage trip while the player holds unfinished woodshed work. The player cancels at minutes 85, 86, 93 or 100. All four released stages are feasible for Meryem. The zero-minute case is known development evidence, not an independent confirmation case.

Each state has three controls: leave Meryem's current trip running; use the existing player release/re-request interaction; or apply one [private automatic rule](camp-reconsideration-candidate.md). The rule can stop only Meryem's own timber/salvage task after the player releases her accepted construction project, with needs/capacity checks and no meal/food preemption. It retains all paid time, effort and practice, but grants no output for an unfinished trip. There is no elapsed-time cutoff.

The player then builds the garden, completes one enhanced food trip and recovers until the fixed observation minute 240. Frame and roof timing, both actors, pending/installed work, material, food, effort, practice and recovery are retained. This is a **policy intervention at a shared state**: the baseline produces the earlier history, and `fromBaseline` changes only the candidate's host version. It is not an always-on candidate rollout, a sampled human strategy or a general optimality claim.

## Earlier frames, later roofs

| Salvage minutes paid before cancellation | Finish-current frame | Automatic/manual frame | Finish-current roof | Automatic/manual roof | Roof delay from interruption |
|---|---:|---:|---:|---:|---:|
| 0 — known case | 135 | 101 | 191 | 191 | 0 |
| 1 | 134 | 101 | 189 | 191 | 2 |
| 8 | 127 | 101 | 170 | 191 | 21 |
| 15 | 120 | 101 | 163 | 191 | 28 |

All twelve routes execute successfully with no refusals. The four manual re-requests are actually accepted. Player garden/food completion is unchanged between controls within each timing: 110/124, 111/125, 118/132 and 125/139. A faster frame does not activate the woodshed's improved timber yield; its roof must also be complete. The fifteen-minute case supplies the predeclared substantive negative result without changing its timing after evaluation. [Initial summaries](../artifacts/camp-reconsideration/run-initial/summary.json) · [Complete lossless records](../artifacts/camp-reconsideration/run-initial/comparison-records.json.gz).

Finish-current completes the original salvage trip at 106 and receives three salvage. The interrupting controls abandon that output and later obtain the required salvage after doing other work and recovering. This is a real material and scheduling consequence, not a penalty introduced to make the candidate lose.

At 240 all controls have the same free stock: zero timber, one salvage and six food; woodshed and garden complete; workbench table only; no pending jobs. Fatigue has reached zero for both people. Those endpoints conceal different earlier availability and work. For each positive-paid case, interruption requires exactly the already-paid amount again in extra Meryem gathering time: 1, 8 or 15 more minutes and correspondingly less recovery, with extra effort `.17*p/21`.

**The practice is still retained.** In the fifteen-minute case Meryem ends with gathering proficiency about .50250 rather than .46214, crossing the next authored duration threshold. That could affect later gathering, but no additional future objective was executed. It does not erase the measured roof delay, and it prevents a claim that finishing the trip dominates every possible future use.

## The existing control matters

Automatic reconsideration and manual release/re-request match across **608 aligned post-intervention states** after excluding only host version, recent notices, last-response metadata and commitment acceptance time/reason. All other fields—including commitment status/project/finish time, people, clock, tasks, work ownership, resources, receipts and paid ledgers—match exactly. Full saves are not identical: the manual control withdraws and renews the commitment, while the candidate preserves the earlier acceptance.

The candidate removes two explicit player API commands. That is a demonstrated interaction-count reduction, not measured human effort, improved comprehension or a service gain. The source/record [comparison script](../artifacts/camp-reconsideration/compare-physical.mjs) and [strict equality receipt](../artifacts/camp-reconsideration/manual-detailed-parity.json) preserve the exact exclusions. The earlier root receipt that excluded the whole commitment is retained as a weaker preliminary check, not additional independent samples.

## Verification and review

- **871 repository tests pass** on Node 26.8.1, including seven focused candidate checks. Those seven also pass on minimum Node 22.0.0. They cover validated version-only initialization, actual input immutability, zero/positive-paid interruption, event removal, paid conservation, needs/food guards, unrelated cancellations and no zero-time repetition. [Integrated log](../artifacts/camp-reconsideration/validation/integrated-tests.log).
- An independently authored [API verifier](../artifacts/camp-reconsideration/verify.mjs), importing neither comparison runner nor case module, passes on minimum Node 22. It checks all twelve comparisons, four administrative histories and twelve embedded prefix replays: **2,228 state/view/restore checks**, **2,200 operations**, **48 completion marks**, **96 stored fixed-job entries**, zero refusals and four exact version-only boundaries. These totals include repeated shared-prefix checks, not extra cases. [Exact audit](../artifacts/camp-reconsideration/verification-node22.json).
- Two independent Astra source lenses check the rule, ownership, guards and initialization; another record-level pass checks the outcomes and competing explanations. [Source/replay review](reviews/2026-09-08-camp-reconsideration.md) · [Candidate check](reviews/2026-09-09-reconsideration-candidate-check.md) · [Results interpretation](reviews/2026-09-09-reconsideration-results.md).
- One default-Claude source-only attempt timed out after 240 seconds with empty output. No actual model or verdict returned, so it is **not** counted as an Opus/Fable review. [Preserved attempt](../artifacts/camp-reconsideration/reviews/claude-default/README.md). The interrupted source-review turn also hit a usage limit; its later successful resumed verification is identified separately. The results reviewer saved its completed review and audit findings before a terminal capacity error; only the saved, checked work is used. No credits were bought, resets consumed or automatic tasks resumed.

Review fixed a test that asserted immutability on the wrong input object. It also corrected overbroad administrative wording: inherited C1 history already contains a cancellation, while the four nominated endpoint cancellations had not been executed. Original and corrected administrative artifacts are retained and have exactly equal operations/states/views after the descriptive field rename. A suggested below-needs-threshold body-capacity refusal fixture was rejected by a source-derived bound rather than manufactured. No candidate rule, timing, control or result was changed after unsealing.

The protocol's code-blind design statement describes initial case selection. A later bounded candidate-source review by that designer occurred after choices were fixed; it is not a claim that the reviewer remained code-blind throughout. Fixed-job event lists in the inherited macro-step prefixes are not exhaustive micro-event catalogs. Comparison suffixes advance one minute at a time and preserve their complete completion events; all full prefix states/commands still replay exactly.

## Source and reproduction

Candidate, tests, definitions and corrected administrative inputs were committed at **`d94666469cc3c2bcb496069193e28d4fafd0c0d8`**. The [source freeze](../artifacts/camp-reconsideration/freeze.json) was committed at **`e751463` before any comparison arm ran**. The first execution and first independent replay both passed. Preserve those source identities and original outputs; do not retune the four timings to obtain a different conclusion.

From the repository root, using Node 22 or later and fresh output paths:

```sh
node --test tests/camp-reconsideration.test.js
node artifacts/camp-reconsideration/runner.mjs --run artifacts/camp-reconsideration/freeze.json artifacts/camp-reconsideration/reproduction-new
node artifacts/camp-reconsideration/verify.mjs --freeze artifacts/camp-reconsideration/freeze.json --summary artifacts/camp-reconsideration/reproduction-new/summary.json --out /tmp/reconsideration-audit-new.json
```

All candidate/data/review assets stay outside the public allowlist. The fresh build retains app 0.14.1's digest `671311ad92bedce24376e84ebe8264cf7fddb8cc70af9fb024a61b86a8bce48b`; deployed source remains `235d2e6c077df1a68c508091f54c673391e3a88f`. Live manifest and three new private-route checks pass. [Publication boundary receipt](../artifacts/camp-reconsideration/public-boundary.json). No public deployment is needed. Further policy refinement is left for discussion with the user while the schedule remains paused.
