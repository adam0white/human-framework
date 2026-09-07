# Executable benchmark with a solo control

Run recorded at 2026-09-07T20:02:00Z (2026-09-07, America/Chicago), engine 0.1.0. Full data, each paired seed, scenario snapshots, numerical defaults, runtime environment, and source SHA-256 identities are in [benchmark.json](../artifacts/benchmark.json).

The full loop **does not consistently beat the simpler policy**. It completes Courier Crossing more often in this sample, but loses objective performance in Repair Bench, Water Commons and Solo Repair. It also ends with less accumulated fatigue and, where promises exist, more promised attempts made on time. Those are separate outcomes; we have not combined them into an arbitrary “human quality” score.

No scenario settings were retuned after looking at these results. The original three two-person presets remain unchanged; Solo Repair adds one person with no peers, promises or assistance action. It retains the workshop's body, skill, hazard and work settings for Leyla, with a nine-unit target and one ration. All four use the same kernel and finite action kinds. Targets, durations, skill proxies, exposure and output values are authored game settings, not empirical estimates. Repair Bench does not yet simulate tool contention or material inventories; Water Commons does not yet implement bargaining, ownership institutions or community cohesion.

## Experiment and reproducibility

Run `npm run benchmark -- --seeds 100` from the project directory. Defaults use seeds 101–200, seven variants per scenario, and an additional full/baseline structural null pair for each scenario and seed: **3,600 complete simulation runs**. The artifact generation took 3.41 seconds on this run, using Node v26.8.1 on macOS arm64, excluding JSON writing.

Every comparison pairs identical seeds. Draws are keyed by seed, round, actor and purpose; a policy choosing to inspect does not consume the draw assigned to another actor's work. Different decisions still lead to different states and different use of available draws. Both policies receive the same permitted information; the static baseline ranks tasks from output and proficiency and does not read hidden hazard. There is no LLM, external inference or generated prose input.

The default evaluation seeds are separated from initial manual examples using 1–20, but automated tests also exercise evaluation seeds. This is a reproducibility convention, **not untouched held-out data**. There is no human calibration set or human evaluation set. Runtime measurements run variants in a fixed order and are affected by warm-up and machine load; they are descriptive timings, not a controlled efficiency comparison.

For each metric, the artifact reports the full-minus-comparator mean paired difference, the sample paired standard error, and the descriptive interval `mean ± 1.96 × SE`. These describe Monte Carlo variation inside this particular toy model. They do not measure model uncertainty, human variation, or the credibility of the underlying mechanisms. The intervals are approximate, comparisons are exploratory, and there is no multiple-comparison adjustment. A one-seed run reports null for SE/interval rather than inventing precision.

## Objective performance

Progress can exceed its target because both actors complete the final round before termination. Success rate and capped completion are therefore recorded separately from raw progress. Each scenario has its own units; do not average raw progress across settings.

| Scenario / target | Full mean progress | Baseline mean progress | Paired difference and descriptive interval | Full successes | Baseline successes |
|---|---:|---:|---:|---:|---:|
| Courier Crossing / 16 delivery units | 16.40 | 15.99 | +0.41 [−0.29, +1.10] | 70/100 | 56/100 |
| Repair Bench / 18 repair units | 13.71 | 16.17 | −2.46 [−3.16, −1.75] | 18/100 | 62/100 |
| Water Commons / 12 water units | 11.80 | 13.72 | −1.92 [−2.46, −1.38] | 76/100 | 99/100 |
| Solo Repair / 9 repair units | 7.38 | 8.37 | −0.99 [−1.43, −0.55] | 58/100 | 84/100 |

The courier progress interval spans zero. Its success-rate difference is +14 percentage points, with descriptive interval [+1.2, +26.8] points. That difference does not establish that our human model is better: the two task choices have different sizes of contribution, and the policy's scores were not fitted to human behavior. Repair and commons provide concrete counterexamples to claiming that extra mechanisms automatically improve the task objective.

## Costs, commitments, learning and information

Fatigue is the mean final fatigue proxy across the actors, or the sole actor's value in Solo Repair. Skill gain is the sum of changes in the task proficiency proxies, with no configured cross-skill transfer. Promises concern an attempt made by its deadline; success is not required. Inspection counts include only actual hazard-report observations produced by inspection actions, rather than a fabricated observation each decision.

| Scenario / policy | Final fatigue | Promises attempted on time | Summed skill gain | Inspection reports | Decisions |
|---|---:|---:|---:|---:|---:|
| Courier / full | 0.659 | 2.00 | 0.163 | 2.00 | 19.06 |
| Courier / baseline | 0.998 | 1.00 | 0.193 | 0.00 | 17.58 |
| Repair / full | 0.603 | 2.00 | 0.159 | 0.00 | 15.72 |
| Repair / baseline | 0.999 | 1.00 | 0.229 | 0.00 | 14.10 |
| Commons / full | 0.670 | 2.00 | 0.082 | 0.00 | 15.92 |
| Commons / baseline | 0.950 | 1.00 | 0.101 | 0.00 | 10.10 |
| Solo / full | 0.685 | None authored | 0.043 | 0.00 | 7.09 |
| Solo / baseline | 1.000 | None authored | 0.065 | 0.00 | 5.83 |

The baseline repeatedly works and accumulates more practice, including practice on failed attempts. The full policy allocates some intervals to recovery, eating, inspection or assistance. The observed tradeoff is consequently plausible *within the written mechanics*, but the magnitude remains uncalibrated. Final-state fatigue is also affected by early termination: the variants do not all run for the same simulated duration. The artifact includes rounds, minutes, work attempts/successes, hunger, food use and pending promises so that these distinctions remain visible.

## Ablations and null controls

These are interventions on this implementation. “No promise weighting” disables the preference contribution of promises; it retains measured fulfillment/expiry and their relationship consequences. “No body coupling” removes bodily influence on preference and work success while continuing to track body state. “No belief updates” leaves inspections available but freezes the stored belief. “No practice updates” freezes proficiency. “No relationship coupling” disables social preference/support and trust-update effects.

| Comparator removed from full loop | Courier progress difference | Repair progress difference | Commons progress difference | Solo progress difference |
|---|---:|---:|---:|---:|
| Body coupling | −1.63 | −6.77 | −3.02 | −1.62 |
| Belief updating | +10.37 | 0.00 | 0.00 | 0.00 |
| Promise weighting | +0.35 | −1.12 | +0.05 | 0.00 |
| Practice updating | +1.48 | +0.76 | +0.17 | +0.24 |
| Relationship coupling | 0.00 | 0.00 | +0.05 | 0.00 |

These numbers are full-minus-ablation. Removing body costs from performance makes the objective easier by construction; its higher scores do not show that bodies are useless. Removing belief updates in Courier causes repeated inspections of unchanging uncertainty: 13 reports per run versus 2 in the full loop. That large loss exposes the policy's inability to learn that further observation is useless under this intervention. It is evidence about a computational dependency and a missing stopping rule, not evidence for the size of human belief updating's benefit.

Belief updating has no objective effect in Repair or Commons because neither policy selects inspection there. Relationship coupling has no objective effect in Courier or Repair in this sample. Commons' small difference has interval [−0.28, +0.38] progress units; do not claim a demonstrated social-performance benefit. Even when progress is unchanged, relationship state itself may differ. An ablation can be operational yet contribute nothing to a particular scenario's objective.

Solo Repair is also a persistent control for social independence: its choices and outcomes stay identical when promise weighting, relationship coupling, or both are disabled. Its 100-seed promise/relationship comparisons have zero differences in every nontiming metric. The full policy still loses output to the baseline, despite no social effects; rest and immediate task scoring are enough to produce that tradeoff. This separates the personal work/recovery question from future social models.

Each structural null removes all but one work action and removes commitments, retaining the same active modules. Full and baseline must therefore take the same actions. We compared world state, actor states, action events, observations, changes, outcomes and random draws while excluding deliberately different policy-score explanations. **All 400/400 null pairs were exactly equal**. This checks paired execution; it does not prove general equivalence of the policies.

## What was verified, and what follows

The initial scenario/CLI/experiment tests, source-identity artifact check and new solo-isolation test were observed failing before their respective implementations. The eight scenario/experiment/CLI tests pass, including all four adapters at boundary seeds, replay roundtrip, paid inspection, hidden-information separation, paired arithmetic, null equality, invalid counts/arguments, benchmark provenance and solo social independence. The full suite passes all 39 tests, including the core, guidance, adversarial and deployment checks. These checks verify software behavior, not human realism or theological adequacy.

Immediate research priorities follow from actual limitations: test an explicit stopping rule for redundant inspection; compare time budgets without changing bodily physics; measure tradeoffs over a fixed post-deadline follow-up period; and create a social task where another actor can independently accept or refuse. The current assistance mechanism is a support preparation, not a complete model of consent or persuasion. Parameter sensitivity and richer planning are future experiments; neither should be introduced merely to make the full policy win this table.

For a single-person run, use `npm run simulate -- solo --seed 7`; use `courier`, `workshop` or `commons` for the two-person settings. Add `--json replay.json` to write a replay accepted by the core and browser importer, or use `--json -` for JSON on standard output. Scenario and source snapshots in the benchmark artifact preserve what this report evaluated; any later core or preset change requires regeneration before these numbers are described as current.
