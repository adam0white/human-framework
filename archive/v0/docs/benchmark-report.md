# Laboratory benchmark — 0.3.0

Generated **2026-09-08T00:01:15.530Z** (September 7 in Chicago), engine **0.3.0**, seeds **101–200**. The [complete artifact](../artifacts/benchmark.json) contains every run, paired comparison, scenario snapshot, numerical default, environment and nine SHA-256 source identities. Those identities were checked against the working source when this report was prepared.

**Planned simple is slightly faster than Full on average in all four defaults; both complete every sampled run.** Full is faster than the greedy baseline, but the stronger simple comparison does not establish a completion or speed advantage for Full. These are authored tasks, not human-data validation.

## Completion and time

The lab's `baseline` is the greedy fixed-utility controller. `planned-simple` applies observed hunger/fatigue recovery thresholds to **every actor**, then uses fixed work preferences. Full adds perceived hazard, information, practice interest, promises and deadline-aware task value. All use the same execution physics and capacity corrections.

| Scenario | Full wins | Planned wins | Greedy wins | Full rounds | Planned rounds | Greedy rounds |
|---|---:|---:|---:|---:|---:|---:|
| Courier Crossing | 100/100 | 100/100 | 99/100 | 25.70 | 25.39 | 28.40 |
| Repair Bench | 100/100 | 100/100 | 100/100 | 23.29 | 23.00 | 25.87 |
| Water Commons | 100/100 | 100/100 | 100/100 | 18.51 | 18.40 | 19.68 |
| Solo Repair | 100/100 | 100/100 | 99/100 | 22.03 | 21.59 | 23.15 |

Rounds are means over all 100 runs, including losses at the deadline. One round is 20 simulated minutes; these columns do not measure CPU speed. Defaults remain 36 rounds, targets 60/60/45/30 and food supplies 6/6/6/3. Completion is near its ceiling. Raw final progress remains in the artifact, but terminal overshoot makes it a poor headline measure of better decisions.

| Paired round difference | Courier | Repair | Commons | Solo |
|---|---:|---:|---:|---:|
| Full − greedy | −2.70 [−3.34, −2.06] | −2.58 [−3.09, −2.07] | −1.17 [−1.68, −0.66] | −1.12 [−1.85, −0.39] |
| Full − planned | +0.31 [−0.26, +0.88] | +0.29 [−0.17, +0.75] | +0.11 [−0.23, +0.45] | +0.44 [−0.05, +0.93] |

Brackets are descriptive 95% paired Monte Carlo intervals. Each Full–planned interval includes zero: the mean ordering is a useful negative finding, not a demonstrated universal advantage for either controller. Full uses fewer rations than planned simple in every preset: 2.45 vs 3.90, 2.99 vs 3.51, 2.08 vs 3.05 and 1.00 vs 1.25. Planned simple finishes with lower mean fatigue and hunger in all four. These endpoints occur at different stopping times and are not controlled physiological comparisons.

## Recovery and other mechanisms

| Mean compulsory recovery actions | Courier | Repair | Commons | Solo |
|---|---:|---:|---:|---:|
| Full | 0 | 0 | 0.22 | 0 |
| Planned simple | 0 | 0 | 0 | 0 |
| Greedy | 18.14 | 18.19 | 11.55 | 8.10 |

Counts sum actor actions, not rounds. A forced recovery is useful rest or eating supplied by the lab resolver; it is not wholly wasted time or evidence that the controller planned self-care. Full's coarse perceived body can still disagree with actual capacity. No extra recovery penalty was introduced to improve its ranking.

Full keeps two announced promises per run in Courier and Repair, versus one for each simpler controller. All keep one in Commons and have none in Solo. Full makes two inspections per Courier run; the simpler controllers make none. These behavioral differences matter separately from speed, but do not establish realistic social cognition or a player benefit.

The relationship ablation changes no recorded behavioral summary or objective outcome in these defaults, apart from irrelevant wall-clock measurement differences. It does not establish that every latent relationship value is unchanged or that manually selected help has no effect. Solo remains a control without social effects.

Without learning updates and their expected value, wins are **79/98/100/99**, and mean rounds rise to **32.39/29.24/22.81/24.35**. Without hazard updates and inspection value, Courier wins 99/100 in 26.50 mean rounds; the other defaults match Full's behavioral summaries. Both are coupled interventions that retain initial proficiency/beliefs. Removing body coupling makes all four faster while retaining capacity limits, partly because bodily strain no longer lowers success probability. This changes the modeled world as well as deliberation; it cannot establish that ignoring needs is a better controller.

The separate conservative feasibility probe still wins 100/100 in each default, in mean rounds **25.99/26.53/21.01/28.51**, with no compulsory recovery. It directs only the first actor toward the lowest-effort work after threshold recovery, leaving partners on Full. It is not the all-actor planned-simple comparator. All **400 structural Full–baseline null pairs** match their recorded execution signatures when only one requested work action remains and commitments are removed.

## Change history and reproducibility

Version 0.3.0 separates physical progress units from explicit `goalUtility`, adds deadline opportunity valuation, demotes perceived capacity-blocked exertion, and adds all-actor planned simple. Relative terminal tolerance fixes the case where ten successful `0.1` contributions miss target `1` through floating-point accumulation. Body maintenance, recovery rates, outcome probabilities and default workloads remain as in 0.2.0. Exact formulas and selection tiers are in the [model reference](model-reference.md).

The [archived 0.2 report](history/benchmark-report-0.2.0-2026-09-07.md) and [artifact](../artifacts/history/benchmark-0.2.0-2026-09-07.json) preserve the preceding comparison. The [0.1 report](history/benchmark-report-0.1.0-2026-09-07.md) and [workload audit](../artifacts/history/workload-audit-0.1.0-2026-09-07.json) retain the fatigue loophole and inadequate recovery slack. Cross-version differences are not isolated causal effects of one change.

```sh
npm run benchmark -- --seeds 100 --start-seed 101 --json artifacts/benchmark.json
```

This runs eight variants, one feasibility probe and two null simulations per scenario/seed: **4,400 runs**. Generation took **33.28 seconds** on Node **v26.8.1**, macOS arm64, excluding writing. Runtime is load/order dependent. The artifact records exact hashes for six core files, scenario definitions, experiment orchestration and the benchmark script; it does not identify the separate workshop host benchmark.

Seeds 101–200 have also appeared in tests and earlier experiments. They are a reproducibility convention, not untouched held-out data. Intervals use paired mean difference ± 1.96 × sample standard error, without multiplicity adjustment; they cover within-model sampling variation, not parameter uncertainty or human-population inference. Passing implementation tests and these benchmark outcomes answer different questions from whether the framework improves a real game's behavior or authoring process.
