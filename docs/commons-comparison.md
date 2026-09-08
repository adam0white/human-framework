# Common Ground: a serious host-policy comparison

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
