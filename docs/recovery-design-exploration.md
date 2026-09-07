# Does planning need a new recovery penalty?

Research snapshot: 2026-09-07, **engine 0.2.0**. No core, scenario preset or release change is adopted here. The [measured exploration](../artifacts/recovery-design-probe-0.2.json) preserves source hashes, reference-benchmark identity, scenario inputs, controller definition and results.

**Tighter deadlines already reward planned recovery under the current physics.** The forgiving 36-round tasks mostly hide that difference because several strategies eventually finish. This supports testing an optional pressure workload before deciding whether forced recovery needs a new physical cost.

## A stronger simple comparator

The planned comparator keeps the baseline's exact work ranking: output and current proficiency, with the same tie-break. Before selecting work, it requests food when observed hunger is at least 60% and food remains; otherwise it requests rest when observed fatigue is at least 65%. It reads only the actor view, not hidden conditions or future draws.

This is tested faithfully in Solo through the existing manual-action interface. A two-person version needs a controller for each actor; a manual command currently directs only one. Consequently, the two-person sweep below compares existing full and greedy policies only.

## Deadline-only results

Solo keeps its 30-unit target, 20-minute rounds and all other settings. Only the deadline changes. Counts use paired seeds 101–200.

| Solo deadline | Planned simple | Full | Greedy baseline |
|---|---:|---:|---:|
| 18 rounds | 14/100 | 11/100 | 17/100 |
| 21 rounds | 57/100 | 41/100 | 29/100 |
| 24 rounds | 75/100 | 75/100 | 58/100 |
| 27 rounds | 93/100 | 95/100 | 85/100 |
| 30 rounds | 100/100 | 99/100 | 95/100 |
| 36 rounds | 100/100 | 100/100 | 99/100 |

The 24-round candidate was then checked on **seeds 1001–1100**: planned wins 81, full 82, greedy 67. Planned-minus-greedy success is +14 percentage points, with descriptive paired interval [+3.9, +24.1]. Planned-minus-full is −1 point [−10.0, +8.0]. These are Monte Carlo summaries within this authored simulator, not human evidence or universal guarantees.

At seed 7, planned completes in 19 rounds and full in 17; greedy has only 24/30 units at the 24-round deadline. The planned path tolerates two failed work attempts and uses no compulsory recovery. The earlier lowest-effort conservative recipe takes 29 rounds, so it remains useful for the forgiving workload rather than this pressure case.

Two-person examples also discriminate without new physics: at Courier's 27-round deadline, full wins 71/100 versus greedy 44; Repair at 24 rounds gives 63 versus 25; Commons at 21 gives 79 versus 64. These are exploratory workload choices. Contrary results matter: at Solo's 18-round deadline greedy wins more often, and at Commons seed 7 with 24 rounds greedy wins while full loses. Planning is not universally dominant, and the full policy is not uniquely capable of it.

## Pending decision and acceptance criteria

Keep the normal presets forgiving. An optional 24-round Solo pressure profile is a candidate, not a release decision. It makes the existing tradeoff visible while retaining a simple feasible strategy and some failure slack.

If an authored interruption cost is also considered, test it separately:

- Define which part of a recovery interval is lost. Keep maintenance, nonnegative recovery duration and whole-ration accounting explicit.
- Require a zero-cost control to reproduce 0.2 execution outcomes, excluding version labels and explanatory prose.
- Compare 0, 2, 5 and 10 minutes of interruption in a 20-minute round across normal and pressure budgets. Report the whole sensitivity result rather than choosing the cost that makes full win.
- Require a stronger simple planned policy to benefit relative to greedy too. Preserve meaningful losses, feasible manual play and cases where full does not dominate.
- Treat removing automatic meals as a different intervention. The current greedy policy never elects eating, so permanently blocking it through hunger would create a trivial comparison.

Fresh reviewers should decide whether these aggregate production tasks explain enough about agency and recovery, or whether the next step should embed the framework in a game with independent objectives and consequences. This exploration supplies measured constraints; it does not decide that broader direction.
