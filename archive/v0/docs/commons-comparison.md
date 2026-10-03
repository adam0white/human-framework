# Common Ground: a serious host-policy comparison

The new scripted rival is competitive without dominating the existing controllers. It sometimes establishes the worksite sooner, but on the reserved 1,020-minute abandoned team worksite it finishes with fewer caches despite reaching the first milestone earlier. All 48 trials use identical frozen physics and paired starting snapshots. This establishes a stronger policy comparison; it does not establish the value of the Human component or close the MVP usefulness gate.

## Preregistration — 2026-09-08 03:59 UTC

This section was written before implementing the rival or running its development or reserved evaluations. Frozen world source: `9bd93c6`, Common Ground 0.1.0, Human 0.1.0 and shared clock 0.1.0. Existing host, Human, clock, UI, policy, and benchmark files must remain unchanged. The original four fresh-state results are already known; this is not an independent replication of an unknown world.

**Question:** Does a small resource-coordination policy produce useful differences from the existing build-first and stock-first policies when all use the same public observations, accepted-project mechanics, paid recovery, and world physics? Does any advantage at establishing the worksite persist during ongoing production, and where does it fail? This evaluates policy choices, not the causal value of the Human component or a whole human model.

**Rival fixed design before outcomes:** a stateless project-pull policy prioritizes workbench, then woodshed, then garden; it asks Meryem to work on the highest unfinished project rather than treating her as a directly controlled worker. It considers visible pending deliveries and stage locks before gathering or building. It maintains only the materials needed for current/nearby stages, allows explicit planned meals/rest, and recognizes completed projects and caches. It must select through the same rounded `getGameView` used by both existing policies, with the same public recipes. No hidden body, host clone/rollout planner, free recovery, model ablation, or tuned policy-score weights. Any development changes to this design will be dated below before reserved evaluation.

**Development conditions**, each in solo and team mode, constructed only through legal commands from a fresh world:

| ID | Prefix before the evaluation budget starts |
|---|---|
| fresh | No prefix |
| delayed-120 | Advance 120 minutes without player work |
| delayed-240 | Advance 240 minutes without player work |
| supplied | Complete two timber jobs and one salvage job |
| interrupted | Begin woodshed stage one, advance 9 minutes, cancel; paid body/practice remain |
| food-spent | Complete four player meals, consuming starting food |

**Reserved family:** abandoned worksites, with 660 and 1,020 idle minutes before the budget starts, each solo and team. These exact policy evaluations must not run until the rival and harness source are committed and hashed in a freeze manifest. This is a reserved condition family for policy selection, not external human data or ignorance of previously tested long-idle host behavior. No policy changes follow unsealing; negative findings remain. Bug corrections after unsealing must be reported as post-registration corrections and require rerunning all policies.

**Protocol:** each of the three policies runs from an identical validated snapshot for each condition/mode pair, with 1,440 additional simulated minutes. Observe exact checkpoints at +120, +480, +1,440 minutes, without inserting additional policy decisions at intermediate checkpoints. Continue after the first milestone. Record first milestone time relative to the prefix and absolute world time, completed stages, cache count, available and reserved supplies, pending jobs, rounded body/practice, paid work/rest/eating/idle minutes, completed/canceled jobs, consumed food, and command counts. Preserve partial results if a run fails or reaches its budget.

All controllers face the same command dispatcher and decision opportunities. A rejected command is recorded with its public error, causes an explicit failed/partial trial, and grants no time, food, or recovery. More than eight consecutive zero-time commands or 10,000 total commands causes an explicit liveness failure rather than forced advancement. No result is excluded. The policies may make different numbers of commands and consume different food/materials; these are outcomes, not matched-resource guarantees.

**Evidence and cost:** record command traces separately from bounded active state, input/final-state hashes, frozen source hashes, command counts, maximum serialized active-save bytes, and maximum pending events. Store implementation source line/byte counts as inspectable code-size proxies, not measured development effort. If wall-time measurements are reported, separate policy selection from simulation, name hardware/runtime, exclude rendering, and avoid inferential performance claims from one run.

**Analysis:** pair each rival outcome with each existing policy under the same condition/mode; show every condition and partial outcome. Report first-milestone timing only alongside completion/censoring, plus cache counts at fixed elapsed budgets, recovery/food, leftover and reserved resources, and controller costs. Conditions are authored deterministic cases, not independent random samples: do not invent population confidence intervals or statistical significance. Report development and reserved families separately. There is no requirement that the rival or a more complex policy win.

**Nonclaims:** no component-value claim follows from a policy comparison under identical Human physics. A prescribed-action/equal-exposure component diagnostic is deferred here to keep this evaluation bounded. Player explanation, useful authoring time, empirical behavioral fit, and physical-mobile performance remain separate open gates.

## Execution record

The preregistration was committed as `a3fbb03` before the rival and harness were implemented. The immutable copy is [preregistration.md](../artifacts/commons-comparison/preregistration.md). The baseline at `9bd93c6` passed 229 tests.

The first development batch contains 36 trials. Its policy function was not tuned after inspecting results. The implementation makes the preregistered rules concrete: planned hunger/fatigue recovery thresholds are both 0.75; absent food triggers foraging at hunger 0.50. When useful work is waiting on a neighbor, it prepares food below two portions, can eat at hunger 0.45, and can rest at fatigue 0.35. Material priority is the longest missing gather workload, computed from visible costs, outputs, and durations. These are authored controller rules, not physiological estimates.

The harness was subsequently clarified to distinguish policy errors from host rejection and retain independent proposal responses. Those changes did not alter any policy or the observed development outcomes. It never substitutes recovery for a blocked action. Nine experiment tests now exercise legal prefixes, public-view isolation, sealed conditions, exact checkpoints without extra decisions, explicit partial failure, rejection without free recovery, prescribed-command physics equality, long-run command liveness, and bounded active state.

Initial development finding: every controller established the worksite and continued for the full 1,440-minute budget without a rejected command or liveness failure. Project-pull does not dominate: delayed-240 team reaches its first milestone in 248 additional minutes, versus 245 for build-first and 242 for stock-first. Full results, costs, and the reserved-family evaluation follow after the source freeze.


## Source freeze and reserved results

The rival and harness were committed as `6ac6dc6`. A [freeze manifest](../artifacts/commons-comparison/freeze.json), committed as `6c2b3b6`, records the exact source hashes and UTC timestamp **2026-09-08 04:08:08** before any reserved run. The 12 reserved runs followed that commit. No policy, harness, physics, or registration source changed after unsealing. Two later tests verify trace replay and refusal of a mismatched freeze manifest; they do not alter execution.

The [development artifact](../artifacts/commons-comparison/development.json) and [reserved artifact](../artifacts/commons-comparison/reserved.json) retain every command, intermediate checkpoint, starting/final snapshot, proposal response, paired contrast, source identity, and resource/cost receipt. Each policy pair has the same input-state SHA256. Repeating both batches reproduced every trial record, final state, command trace, and paired result exactly. Execution-commit metadata can differ when rerunning from a later documentation commit.

Each result cell below is **additional minutes to the first milestone / completed caches after +1,440 minutes**. Prefix time is excluded from the evaluation budget, but its materials, needs, practice, obligations, and paid costs remain in the initial snapshot. Cross-condition differences therefore are not isolated causal effects of one variable. Compare policies within the same row.

### Development conditions

| Condition | Mode | Prefix minutes | Build first | Stock first | Project pull |
|---|---|---:|---:|---:|---:|
| fresh | Solo | 0 | 389 / 12 | 466 / 10 | 389 / 12 |
| fresh | Team | 0 | 220 / 26 | 226 / 27 | 214 / 27 |
| delayed-120 | Solo | 120 | 397 / 11 | 486 / 10 | 389 / 11 |
| delayed-120 | Team | 120 | 220 / 27 | 244 / 26 | 215 / 27 |
| delayed-240 | Solo | 240 | 415 / 11 | 504 / 10 | 397 / 11 |
| delayed-240 | Team | 240 | 245 / 25 | 242 / 26 | 248 / 26 |
| supplied | Solo | 54 | 336 / 12 | 412 / 11 | 336 / 12 |
| supplied | Team | 54 | 215 / 27 | 204 / 27 | 191 / 27 |
| interrupted | Solo | 9 | 389 / 11 | 465 / 11 | 389 / 12 |
| interrupted | Team | 9 | 222 / 26 | 224 / 26 | 221 / 27 |
| food-spent | Solo | 32 | 401 / 11 | 490 / 10 | 401 / 12 |
| food-spent | Team | 32 | 219 / 26 | 220 / 27 | 219 / 27 |

### Reserved abandoned-worksite family

| Condition | Mode | Prefix minutes | Build first | Stock first | Project pull |
|---|---|---:|---:|---:|---:|
| abandoned-660 | Solo | 660 | 441 / 11 | 530 / 10 | 415 / 11 |
| abandoned-660 | Team | 660 | 255 / 25 | 259 / 26 | 245 / 26 |
| abandoned-1020 | Solo | 1020 | 441 / 11 | 530 / 10 | 415 / 11 |
| abandoned-1020 | Team | 1020 | 256 / 26 | 293 / 26 | 247 / 25 |

Two useful negative findings remain. In delayed-240 team, project-pull is slower to establish the site than both alternatives. In abandoned-1020 team, its earlier milestone does not translate into more completed caches: it ends with 25, versus 26 for both alternatives. At the cutoff it has an unfinished cache with six timber and three salvage reserved; the table counts only completed caches. This is not a failed cache or evidence that the resource vanished.

The two reserved solo rows produce identical relative action sequences and outcomes because both prefixes saturate hunger and fatigue at one while leaving resources and practice the same. They are two timestamps of essentially one effective solo condition, not two independent behavioral challenges. In team mode Meryem's autonomous maintenance is at different phases when the evaluation starts. This limits how much generalization the reserved family can establish.

### Partial outcomes and costs

At +120 minutes no trial has established the worksite: all 48 remain partial, with zero to three of six stages complete. At +480, 33 of 36 development trials and 10 of 12 reserved trials have established it. The remaining five have five of six stages: stock-first solo in delayed-120, delayed-240, food-spent, and both reserved rows. All 48 establish the site by +1,440 and continue afterward. No trial is dropped or silently rescued.

All evaluated policies produced **zero rejected commands, zero declined requests, and zero liveness failures**. Separate adversarial harness tests intentionally request blocked exertion, invalid actions, or repeat an infeasible cache request; those are reported as partial failures with no elapsed work, food, or automatic recovery added by the harness. More than eight consecutive zero-time commands terminates an explicit liveness failure.

These costs explain the two negative team cases. Work, rest, and eating are total paid actor-minutes across the two people during the additional budget; food counts completed meals. Available stock and reservations remain separately visible in every artifact checkpoint.

| Condition | Policy | Work min | Rest min | Eating min | Idle min | Food eaten | Commands |
|---|---|---:|---:|---:|---:|---:|---:|
| delayed-240 | build-first | 1855 | 882 | 88 | 55 | 11 | 266 |
| delayed-240 | stock-first | 1872 | 894 | 88 | 26 | 11 | 292 |
| delayed-240 | project-pull | 1873 | 900 | 88 | 19 | 11 | 283 |
| abandoned-1020 | build-first | 1868 | 886 | 88 | 38 | 11 | 281 |
| abandoned-1020 | stock-first | 1881 | 890 | 88 | 21 | 11 | 296 |
| abandoned-1020 | project-pull | 1848 | 882 | 96 | 54 | 12 | 279 |

At sampled command and checkpoint boundaries, the largest active save is 5,398 bytes in development and 5,415 bytes in reserved trials. These are sampled serialized sizes, not exhaustive per-minute peaks or process-memory measurements. The largest sampled public view is 5,569 / 5,608 bytes respectively. At most one event is pending in solo and two in team. The separately stored research traces grow with commands; they are not smuggled into bounded actor state. Counts and serialized sizes measure this workload, not a portable latency guarantee. Runs used Node v23.7.0 on macOS arm64, Apple M4; no wall-time or rendering benchmark is claimed.

The rival decision function is 40 source lines / 2,525 UTF-8 bytes; the existing shared chooser is 27 lines / 1,756 bytes. Formatting and shared code affect these proxies. The rival is a small ordinary host script, but **is not smaller in source size than the existing chooser**, and no development-time or player-explanation study was performed. Its value cannot be inferred just from calling it simpler.

## What this does and does not establish

The comparison supplies a serious recovery-aware, completion-aware scripted rival and a reproducible reserved-condition protocol. It also demonstrates that ranking controllers by time to the first milestone can reverse or conceal continuing production differences. It gives no reason to replace the live controller defaults solely from these authored cases.

All policies use the same Human mechanics, so this experiment cannot identify their causal value. It does not compare the kit with a host-native stamina implementation, isolate practice from immediate body effects, fit human behavior, or test an independently authored game. Those remain distinct experiments. The reserved condition family is small and partially redundant; it is not a distribution of real people or random game worlds. No population confidence interval, statistical significance, optimality, or broad generalization claim is warranted.

The MVP contract's comparison gate therefore remains **partially addressed**, with player usefulness, measured authoring effort, and component-level alternatives still open. The live Common Ground host, UI, policies, Human, clock, and earlier benchmark are unchanged.

## Reproduction and checks

```
node --test tests/commons-comparison.test.js
node scripts/commons-comparison.js run --partition development --out /tmp/commons-development.json
node scripts/commons-comparison.js run --partition reserved --freeze artifacts/commons-comparison/freeze.json --out /tmp/commons-reserved.json
```

The CLI refuses changed frozen host, Human, model, clock, or existing-policy source relative to `9bd93c6`. Reserved execution additionally requires the exact frozen rival, harness, and preregistration hashes. To create a new study, preregister it and freeze new committed sources; do not overwrite this study's manifest. Report future corrections and rerun every comparator rather than retuning only a losing condition.

Eleven experiment tests pass, including a comparison trace reconstructed through the unchanged public host API and refusal of a changed-source manifest before any reserved output is written. The complete repository suite passes 240 tests. A separate internal reviewer reported no blocking fairness or lifecycle finding and independently reran 24 combinations at a 257-minute budget with irregular checkpoints, confirming unchanged traces and exact public-host replay. Its sampling qualifier is incorporated above; no policy was changed in response.
