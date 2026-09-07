# Capacity-aware workload benchmark

Recorded at **2026-09-07T22:14:38Z**, engine **0.2.0**. [Complete results and source identities](../artifacts/benchmark.json) include every paired seed, scenario snapshots, numerical defaults and runtime environment.

The repaired engine stops exertion that exceeds capacity. Longer scenarios let a straightforward, observable recovery strategy complete all four tasks across the 100 evaluation seeds. This establishes a feasible game workload. It does not establish that the full policy is a better model of people.

## What changed

In 0.1.0, fatigue saturated at 100% while work could continue indefinitely. The baseline often exploited that omission; the full policy spent time recovering. The eight-round Solo workload could also make reasonable recovery schedules impossible: five successful careful repairs produce eight units against a nine-unit target.

The latest supplied old replay actually **won 9.6/9**, with six careful repairs and two rests. That schedule required all six attempts to succeed. Across seeds 1–1000 it won 340 times; the old full policy won 575, baseline 830, and an observable fatigue-threshold recovery rule zero. Repeating a seed and its choices repeats the outcome. The [old workload audit](../artifacts/history/workload-audit-0.1.0-2026-09-07.json) records the exact strategies and source identities. The [0.1 benchmark report](history/benchmark-report-0.1.0-2026-09-07.md) and its negative findings remain historical evidence, not proof of policy superiority.

Engine 0.2.0 records requested and executed actions separately. If requested work/help exceeds capacity, recovery happens instead: rest for fatigue, a meal for hunger when a ration remains, otherwise rest with an explicit unmet-hunger reason. This applies to **every policy and ablation**. Recovery uses the net body change before clamping, removing an extra benefit at the old upper bound. Blocked work produces no output or task practice.

All presets now allow **36 rounds of 20 simulated minutes**, with targets 60/60/45/30 for Courier/Repair/Commons/Solo and six shared rations or three solo rations. Initial bodies, proficiency, hazard and work costs are unchanged. Longer rounds also increase practice exposure through the existing duration rule. These are authored playability settings, including the twelve-hour maximum, not physiological calibration. No policy coefficients were tuned to reverse the rankings. Both execution and workloads changed, so this is not an isolated causal estimate of either change.

## Feasibility without secret information

The separate recovery probe directs the first person through the UI's manual-action command: eat at observed hunger **60%** if food remains; otherwise rest at fatigue **65%**; otherwise choose the lowest-effort work. Any partner keeps the full policy. The probe reads `getView`, not hidden hazard, future draws or the seed. It is an example, not an optimal strategy.

| Scenario | Probe successes | Mean rounds | Rest actions | Meals | Forced recovery |
|---|---:|---:|---:|---:|---:|
| Courier | 100/100 | 26.33 | 10.88 | 3.84 | 0 |
| Repair | 100/100 | 26.60 | 13.12 | 3.98 | 0 |
| Commons | 100/100 | 21.01 | 8.75 | 3.04 | 0 |
| Solo | 100/100 | 28.51 | 6.12 | 2.00 | 0 |

Counts sum across actors; Solo has one. The candidate also passed 100 development seeds before evaluation. A sample without losses does not guarantee success over all seeds or choices.

**Solo seed 7** finishes in 29 rounds: 21 work attempts, 19 successes, six rests and two meals. It tolerates two failures and leaves seven rounds unused. With one ration, the conditional strategy still wins in 30 rounds but finishes much hungrier. With no food it loses at 19.2/30 after 36 rounds and 17 compulsory recoveries. Resting every round loses with zero progress. Two meals are used by the normal conservative path; they are not required of every successful strategy. Full-auto seed 7 finishes earlier with one meal.

## Full and baseline comparisons

Full weighs body, perceived hazard, information, practice interest and promises. Baseline uses output and current proficiency to request work, assigning small fixed scores elsewhere. It usually fails to plan recovery, so the shared capacity rule interrupts it. Both receive the same permitted information and world mechanics when their switches match.

| Scenario / target | Full progress | Baseline progress | Full − baseline, descriptive interval | Full successes | Baseline successes |
|---|---:|---:|---:|---:|---:|
| Courier / 60 | 62.35 | 60.51 | +1.84 [1.45, 2.22] | 100/100 | 99/100 |
| Repair / 60 | 61.52 | 60.75 | +0.77 [0.38, 1.17] | 100/100 | 100/100 |
| Commons / 45 | 46.81 | 46.34 | +0.47 [0.11, 0.83] | 100/100 | 100/100 |
| Solo / 30 | 30.00 | 29.97 | +0.03 [−0.03, 0.09] | 100/100 | 99/100 |

Completion is near its ceiling in these forgiving workloads. Much of the progress difference is **overshoot**: all actors finish a round before termination, and contributions have different sizes. This is not evidence of universal superiority. Each scenario has different units; do not average raw progress across games.

| Scenario / policy | Rounds | Final fatigue | Requested work | Executed work | Rest / meals | Forced recoveries |
|---|---:|---:|---:|---:|---:|---:|
| Courier / full | 26.03 | 0.599 | 34.22 | 34.22 | 12.39 / 3.45 | 0 |
| Courier / baseline | 28.40 | 0.661 | 56.80 | 38.66 | 15.58 / 2.56 | 18.14 |
| Repair / full | 23.45 | 0.727 | 30.33 | 30.33 | 13.54 / 3.03 | 0 |
| Repair / baseline | 25.87 | 0.774 | 51.74 | 33.55 | 15.33 / 2.86 | 18.19 |
| Commons / full | 18.98 | 0.588 | 25.70 | 25.70 | 9.55 / 2.71 | 0 |
| Commons / baseline | 19.68 | 0.700 | 39.36 | 27.81 | 9.86 / 1.69 | 11.55 |
| Solo / full | 22.09 | 0.798 | 14.15 | 14.15 | 6.79 / 1.15 | 0 |
| Solo / baseline | 23.15 | 0.774 | 23.15 | 15.05 | 7.26 / 0.84 | 8.10 |

Full has **higher** final fatigue in Solo despite avoiding compulsory recovery. Final states occur at different stopping times; no universal lower-fatigue claim follows. Rest/meal counts include voluntary and compulsory executions. A work request replaced by rest is not an executed work attempt. The artifact also records food, work successes, practice gains, hunger, observations and promises. Promises concern a performed attempt by its deadline, not successful output or moral worth.

## Ablations and null controls

| Comparator removed from full | Courier progress difference | Repair | Commons | Solo |
|---|---:|---:|---:|---:|
| Body influence on scoring and success | +0.50 | −0.69 | +0.04 | 0.00 |
| Hazard updates and inspection value | +0.76 | 0.00 | 0.00 | 0.00 |
| Promise weighting | +0.46 | −0.35 | 0.00 | 0.00 |
| Practice updates and learning value | +1.67 | −0.24 | +0.31 | 0.00 |
| Relationship coupling | 0.00 | 0.00 | 0.00 | 0.00 |

These are full-minus-comparator differences. Removing body coupling retains mandatory capacity. Removing promise weighting retains fulfillment/expiry. The practice ablation freezes proficiency and removes expected practice value; the belief ablation freezes estimates and removes expected information value while leaving inspection available. Initial skills and beliefs still affect work. These two ablations are coupled interventions, not isolated causal estimates of updating. Removing relationships disables support and trust effects.

Belief and practice ablations now remove the expected benefit of the capacity they disable. This resolves the comparison defect where a controller could repeatedly seek information it could not store, or value practice gains it could not receive. The old behavior remains recorded in the historical 0.1 report. Relationship coupling changes no objective result in these presets; a stronger test needs independent acceptance/refusal. Solo remains identical with either social component disabled. Negative and null differences remain reported; existence does not establish benefit.

The corrected hazard ablation makes zero inspections and completes all four scenarios in every evaluation seed. The practice/learning-value ablation completes Courier in 77/100 and Repair in 97/100, versus 100/100 for Commons and Solo. These outcomes concern the specific paired interventions and authored workloads, not general claims about human learning.

The null leaves one **requested** work action and removes commitments. Both policies make the same requests and encounter the same mandatory recovery. All **400/400 pairs** match world state, actors, requested/executed actions, interventions, observations, outcomes and draws, excluding policy-specific scores/prose. This verifies paired execution, not general policy equivalence.

## Reproducibility and verification

Run `npm run benchmark -- --seeds 100`. Defaults use seeds 101–200: seven variants, one feasibility probe and two null runs per scenario/seed, totaling **4,000 complete runs**. Generation took **29.56 seconds** on Node v26.8.1, macOS arm64, excluding writing. Timing is load/order dependent. SHA-256 identities include the core entry point and model files.

Seeds 1–100 informed playability; evaluation uses 101–200. Tests and previous experiments have also used these seeds, so this is a reproducibility convention, not untouched held-out data. Draws are keyed by seed, round, actor and purpose; different choices still visit different states. Intervals use paired mean difference ± 1.96 × sample standard error. They describe Monte Carlo variation within this toy model, not model uncertainty or human confidence. One seed produces no estimated SE; comparisons are exploratory without multiplicity adjustment.

All **57 tests pass**, including 11 scenario/experiment checks covering bounded runs, replay, hidden information, paid inspection, paired arithmetic, nulls, invalid CLI inputs, provenance, solo independence, requested/executed counts, feasible recovery, missing-food failure and idle failure. New metric/workload checks were observed red before implementation. These are software and playability checks, not human or theological validation.

Next experiments should distinguish mechanisms: fixed-duration recovery/retest, redundant/changing evidence, food constraints and independent social responses. The [decision register](../research/decision-status.md) separates rejected formulations from deferred domains and states their return criteria.
