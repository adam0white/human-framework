# What the smaller body and practice model preserves

2026-09-08. **The smaller model meets the preregistered operational tolerance in 9 of 21 paired protocols: 7/12 development pairs and 2/9 reserved pairs.** It is sufficient for the balanced, scarce-resource and longer mixed workloads here, as well as the practiced-start retests. It cannot preserve the separate food/fatigue bottlenecks deliberately exposed by the channel-alias conditions. Neither agreement nor divergence establishes which model describes people.

This advances the MVP mechanism comparison, while leaving player explanations and measured human authoring benefit open. Keep the current released Human boundary for existing games and saves. For the next small host, use a stamina/counter model when separate rest/food constraints and detailed practice curves are unnecessary; require a concrete player choice before paying for those distinctions. These results do not justify adding broader cognition, physiology, social state or another shared abstraction.

## What was fixed before outcomes

The [protocol](mechanism-comparison-protocol.md) and [exact condition table](../artifacts/mechanism-comparison/protocol.json) were committed first at `904b7e4`. The implementation was then committed at `3e60c003ca78864804ed1efd2d29114265dbe8d6`, and its [source freeze](../artifacts/mechanism-comparison/freeze.json) was checked before reserved, sensitivity and performance execution. All frozen Human 0.1.1, model and runtime source bytes match base `33418c4`. No package exports, release locks or game imports changed.

One common host supplies identical initial facts, offered actions, task difficulty, time intervals, food and parts. Both models enforce their own capacity budgets. There is no controller, random outcome draw, automatic recovery or hidden world state. Blocked and resource-rejected intervals use the prescribed time without work, practice, output, food or recovery. The host consumes one part on admitted work and one ration only after completing its owned meal. Outputs below are **expected units**, computed from start forecasts, not sampled successes or wins.

The rival independently implements one stamina pool and paid per-task minute counters. Its initial load, maintenance drift and learning slope match Human analytically. Later scalar pooling, clamping and capped linear practice intentionally differ from two body channels and exponential practice. The small model clamps stamina during a meal before adding relief; Human preserves maintenance through its meal relief calculation. These authored boundary rules are retained, not corrected after seeing outcomes.

“Reserved” is procedural: its source-visible condition matrix was authored before results but not blinded to the implementer. It contains diagnostic conditions chosen to expose representational differences, not a representative population of games. The development results were inspected before a malformed-input validation fix; the complete deterministic development result is unchanged after that fix. No conditions, coefficients or tolerances were tuned. The [execution record](../artifacts/mechanism-comparison/run-record.md) preserves this sequence.

## Work and recovery consequences

H/S means Human/smaller. A shared number applies to both. Work/rest/meal are admitted minutes; the remainder of the supplied interval is blocked or resource-idle time. Food and parts are actual consumed units.

| Condition | Total minutes | Work H/S | Rest | Meal | Food | Parts H/S | Expected output H/S | Equivalent |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Development: idle | 240 | 0 / 0 | 0 | 0 | 0 | 0 / 0 | 0 / 0 | Yes |
| Balanced A/B | 280 | 160 / 160 | 80 | 40 | 4 | 8 / 8 | 45.61 / 46.99 | Yes |
| Sustained A | 240 | 120 / 140 | 0 | 0 | 0 | 6 / 7 | 25.59 / 32.78 | No |
| Hungry, rest/work | 240 | 40 / 120 | 120 | 0 | 0 | 2 / 6 | 7.39 / 41.18 | No |
| Fatigued, meal/work | 180 | 20 / 120 | 0 | 60 | 6 | 1 / 6 | 2.15 / 33.14 | No |
| Scarce food/parts | 300 | 60 / 60 | 120 | 20 | 2 | 3 / 3 | 16.41 / 16.71 | Yes |
| Reserved: hungry alias + rest | 160 | 20 / 80 | 80 | 0 | 0 | 1 / 4 | 5.02 / 27.86 | No |
| Fatigued alias + rest | 160 | 80 / 80 | 80 | 0 | 0 | 4 / 4 | 26.01 / 27.86 | No |
| Hungry alias + meals | 120 | 60 / 80 | 0 | 20 | 2 | 3 / 4 | 13.78 / 19.27 | No |
| Fatigued alias + meals | 120 | 20 / 80 | 0 | 20 | 2 | 1 / 4 | 3.79 / 19.27 | No |
| Longer mixed work | 640 | 320 / 320 | 240 | 80 | 8 | 16 / 16 | 124.52 / 127.76 | Yes |
| Material shortage | 480 | 40 / 40 | 180 | 30 | 3 | 2 / 2 | 11.87 / 12.02 | Yes |

The hungry and fatigued alias starts have exactly the same initial scalar stamina and success load. The smaller model therefore predicts the same outcomes for them under the same schedule. Human predicts different recovery consequences because rest and meals act on separate constraints. In the hungry-rest condition, the extra 33.78 expected units from the smaller model accompany 80 more admitted work minutes and four more spent parts. Treating this as a productivity victory would assume away the very capacity question being compared.

There are also useful counterexamples to a demand for more machinery. Balanced work has identical resource use/admissions and only 1.38 expected units difference across eight jobs. The 640-minute reserved mixed schedule is also within tolerance. Material shortages stop work correctly in both: no part means no practice or output, regardless of how much body detail exists. The fatigued-rest alias has identical admissions/resources but fails the forecast threshold, showing why “divergent” does not always mean a different feasible choice.

The declared tolerance requires identical per-step decisions and resources, output difference at most 5% of offered work output, and mean jointly admitted work forecast difference at most 0.03. Retests add a 0.03 per-branch forecast tolerance. Those are practical authored thresholds, not measured player indifference or statistical significance. Zero-work agreement is retained as a control but carries little evidence of useful work equivalence.

## Matched-duration practice and paid retests

Each condition uses A practice, equal-effort B practice, and idle exposure for 120 minutes, then 40 minutes rest and a 10-minute meal in every arm. The A and B retests branch independently from that paid endpoint and each spends another 10 minutes and one part. No state reset normalizes bodies for free. Within each model, A and B exposure has identical body paths; idle need not. The reported practice amount is admitted elapsed work, not requested training.

For novice starts, all six practice intervals are admitted. Each active exposure arm spends six parts, 120 work minutes, 40 rest minutes and one ration over 170 minutes before its retest. The idle arm spends the same 170 minutes and ration but no exposure parts or practice. Both models preserve task specificity:

| Novice endpoint / retest | Human | Smaller |
|---|---:|---:|
| A proficiency after A practice | 0.57136 | 0.69920 |
| A proficiency after B practice or idle | 0.20000 | 0.20000 |
| A retest forecast after A practice | 0.81328 | 0.88151 |
| A retest forecast after B practice | 0.49650 | 0.50250 |
| B retest forecast after A practice | 0.49650 | 0.50250 |

Both therefore implement paid task-specific improvement without transfer. Their learning curves differ, producing a 0.06823 trained-task forecast gap at the novice endpoint; that is not evidence one curve is humanly correct. Practiced starts make the same training effect smaller at the output boundary: all three exposure arms meet tolerance, with a trained-task retest forecast gap of 0.01046. Keep this case where the simpler counter suffices.

The strained mixed-skill reserved start admits 100 Human versus 120 smaller-model practice minutes. Its trained retest combines a capacity-exposure difference and a learning-curve difference; it is not an equal-practice causal estimate. The idle arm's A retest gap is 0.03343, only just beyond the authored threshold. A near-threshold classification should not be inflated into a qualitative discovery.

## Sensitivity and prediction scope

The preregistered four variants alter the rival's learning rate or recovery effectiveness independently, never released Human. Across the same 21 pairs, equivalence counts are 11 with learning ×0.75, 7 with learning ×1.25, and 9 for each recovery ×0.75 and ×1.25. The nominal result is 9/21. This demonstrates dependence on authored coefficients; it does not select a new fitted model. [All sensitivity trajectories](../artifacts/mechanism-comparison/sensitivity.json) preserve individual cases and both signs of forecast differences.

Human can distinguish an actor who needs food from one who needs rest, and has diminishing marginal practice gain. The scalar rival intentionally cannot identify those body causes, but retains finite capacity, time costs, paid task-specific practice, failure to obtain missing resources, interruption and deterministic resume. Neither implements empirical metabolism, forgetting, general transfer, planning, emotional appraisal or theological evaluation. Prediction scope, usefulness to a player and human validity remain separate questions.

## Source, bookkeeping and state costs

| Scope | Human | Smaller |
|---|---:|---:|
| Model module | 11,580 bytes / 176 nonblank lines | 5,919 bytes / 74 lines |
| Adapter section | 508 bytes / 8 lines | 454 bytes / 8 lines |
| Module + used dependency declarations + adapter | 13,840 bytes / 213 lines | 6,373 bytes / 82 lines |
| Module + entire imported model file + adapter | 19,852 bytes / 301 lines | 6,373 bytes / 82 lines |
| Initial host/person JSON snapshot | 645 bytes | 775 bytes |
| Final host/person JSON snapshot after 10,000 commands | 732 bytes | 846 bytes |
| Peak snapshot, including pending attempts | 1,336 bytes | 1,308 bytes |

The narrow dependency measure selects complete used declarations from the frozen model file, including all parameter keys. The inclusive measure also includes unused laboratory scenario validation. [Exact ranges and verification](../artifacts/mechanism-comparison/verification.json) make that distinction inspectable. The unchanged optional clock is not called by this prescribed-duration host and is excluded from these execution/source totals. No minified bundle or tree-shaken runtime was measured.

The common host is 9,786 bytes / 126 nonblank lines, paid by both integrations. Its resource rejection, capacity refusal, interruption, meal receipt and output-credit paths are shared; there are zero model-specific host rules, tailored controllers or frozen-source edits. Both integrations store one model person plus host time/resources and common reporting counters. Body state is not shadow-copied into a hidden host capacity model. The Human person has two dynamic body fields and one proficiency per skill; the rival has one stamina field, one paid counter and a retained initial proficiency per skill, plus saved parameters. Those extra counter baselines and configuration explain why its idle snapshot is larger despite shorter source. The host's cumulative practice counters are measurement bookkeeping shared by both.

Code size is not human authoring effort or a clean measure of algorithmic complexity. Human also provides observation projection, version migration and more extensive malformed-input validation. The rival and experimental host only promise trusted internal snapshots and tested lifecycle invariants. In particular, the host does not authenticate arbitrary forged pending forecast/status/action fields. Do not present the rival as a replacement for the released import API or attribute the entire source gap to its mechanics. No human programmer onboarding, maintenance time, player explanation or subjective effort was measured.

## Desktop execution cost and reproduction

On an Apple M4, 10 logical CPUs, 16 GiB RAM, macOS kernel 25.6.0, arm64, Node v26.8.1, each model received 300 warmup commands followed by five fresh runs of 10,000 work/rest/meal commands in alternating order. The workload uses actual host/model admission, forecasts, lifecycle, accounting and validation.

| Measure | Human | Smaller |
|---|---:|---:|
| Median total command elapsed time per 10,000 | 250.80 ms | 238.19 ms |
| Median of five run p95 command times | 0.028875 ms | 0.027792 ms |
| Worst command across five runs | 0.211167 ms | 0.615500 ms |
| Every run within 5 ms p95 budget | Yes | Yes |
| Every active snapshot within 8 KiB budget | Yes | Yes |

Both easily meet these predeclared desktop budgets; the small timing difference is not a meaningful performance mandate and no significance test is claimed. Snapshots retain bounded fields and capped small-model counters instead of an event history. Number formatting and attempt counters account for modest byte changes. The benchmark excludes the optional event clock, rendering, UI, network, traces/report serialization and package startup. Snapshot serialization is sampled outside timed command segments but can still influence garbage collection/cache behavior. It is elapsed process work, not isolated CPU-cycle measurement, and says nothing about a physical mobile device. [All timed runs](../artifacts/mechanism-comparison/performance.json).

Validation: 19 new comparison tests pass; the complete worktree suite passes 299 tests. A separate audit covers 105 paired trajectories including sensitivity, 2,420 offered model commands excluding retest branches, equal inputs/time and paid resources/practice. A/B exposure body paths match within each model across every condition and sensitivity variant. Development results are exactly identical before/after the validation-only fix; repeated reserved and sensitivity runs reproduce the complete deterministic `result` object. All freeze hashes and released source bytes match. [Verification](../artifacts/mechanism-comparison/verification.json).

```sh
PATH=/opt/homebrew/bin:$PATH npm test
PATH=/opt/homebrew/bin:$PATH node scripts/mechanism-comparison.js run --partition development --freeze artifacts/mechanism-comparison/freeze.json --out /tmp/mechanism-development-new.json
PATH=/opt/homebrew/bin:$PATH node scripts/mechanism-comparison.js run --partition reserved --freeze artifacts/mechanism-comparison/freeze.json --out /tmp/mechanism-reserved-new.json
PATH=/opt/homebrew/bin:$PATH node scripts/mechanism-comparison.js run --partition sensitivity --freeze artifacts/mechanism-comparison/freeze.json --out /tmp/mechanism-sensitivity-new.json
PATH=/opt/homebrew/bin:$PATH node scripts/mechanism-comparison.js performance --freeze artifacts/mechanism-comparison/freeze.json --out /tmp/mechanism-performance-new.json
```

Choose new output paths; the runner refuses overwriting retained artifacts. Compare the deterministic `result` objects or `provenance.resultSha256`, not timestamps or runtime metadata. The original preregistration and implementation commits must remain reachable for source verification after integration. The study remains private and contributes no public assets. Root preliminary source inspection identified the snapshot-assurance and meal-clipping caveats documented above. Fresh independent implementation/report review is pending parent integration at this evidence commit; its dispositions must be recorded there. External preregistration review is not evidence that a reviewer executed this implementation.
