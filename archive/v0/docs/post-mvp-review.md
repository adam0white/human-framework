# Direction review: from laboratory to game component

2026-09-07. Reviewed runtime: **0.2.0**, commit `0e9b2c05bc7b77cb026576f473454086400b9add`. This document consolidates three fresh reviews, checks their important findings, and records changes to the roadmap. It delivers research and sequencing changes; the live application, default policies and recovery physics are unchanged.

## Judgment

Continue, with an earlier and narrower integration test. The current system is an inspectable simulation laboratory with useful separations and deterministic execution. It has not yet earned the claim that a real game can embed its human processes without adopting its entire game model. The decisive next test is a separate host-owned game, not another themed workload or a larger inventory of faculties.

The reusable component may turn out to be smaller than today's core. Full is one policy inside the laboratory; it does not have to be the policy every consumer uses. A useful result could combine shared body/experience/observation contracts with a simple host-specific controller. Accept that result if it is easier to author and equally useful to players.

## Review process

Three new subagents received separate assignments without the preceding conversation or design rationale. They examined the same repository through [engine integration](../research/reviews/2026-09-07-engine-integration.md), [validation](../research/reviews/2026-09-07-validation.md), and [gameplay/incentives](../research/reviews/2026-09-07-gameplay.md). They could recommend shrinking or rejecting the proposed direction. Existing project documents remained available as evidence to criticize. After initial findings, the gameplay reviewer also assessed the others' sequencing recommendations.

This provides fresh internal criticism, not guaranteed absence of bias or independent human/external-model review. The reviewers use the same model family, and no private source was sent to an external CLI reviewer. All three returned substantive reports. Their reports preserve reasoning and reproduction details; this synthesis distinguishes accepted findings from unimplemented remedies.

## Findings and decisions

| Finding | Verified basis | Decision and status |
|---|---|---|
| The core owns the host's game | Creation requires progress/food/hazard; `step` schedules everyone, resolves fixed action kinds and declares victory. | **Accepted integration blocker.** Extract only the boundaries demanded by one host. World truth, inventory, opportunities, scheduling and task outcomes belong to that host. This is next work, not a completed SDK refactor. |
| Physical units silently set motive strength | Raw output enters utility alongside fixed rest, inspection and promise terms. Equivalent unit conversions change choices. | **Accepted portability defect.** Declare task-to-goal valuation and test representation invariance before presenting the default scorer as reusable. Do not conceal the issue by retuning every game's weights. |
| Forced recovery is also a hidden controller | A rejected work request becomes full rest or consumption of a whole available ration. The fallback chooses useful care that greedy did not request. | **Accepted control-contract issue.** Preserve the capacity constraint; separate its result from host-specific interruption and resource choice. No arbitrary recovery penalty is adopted. |
| Full has not earned universal preference | Planned-simple nearly matches it under Solo pressure; greedy wins some extreme-deadline cases. Work/rest/meal ranking has no explicit terminal-goal reasoning. | **Accepted evaluation change.** Add a competent simple comparator; include urgent and ordinary conditions. Keep Full replaceable and distinguish a reactive scorer from multistep planning. |
| Current replay is a laboratory protocol | It records initial setup and laboratory commands, not later host events or pending attempts. Arbitrary direct edits are outside that contract. | **Accepted integration gap, not a broken supported replay claim.** Add versioned authoritative events and save/resume semantics with the host, including duplicate-outcome handling. Preserve historical replays. |
| Active state grows with diagnostics | `step` copies the full history and each view traverses it. The integration review includes a diagnostic growth probe. | **Accepted long-session risk.** Separate bounded causal state from optional traces before raising simulation limits. The reported timings are diagnostic, not mobile performance measurements. |
| Themes and seed counts overstate diversity if read as reuse evidence | Four presets retain aggregate progress and a stationary scalar hazard. Policy/physics ablations and unequal terminal exposure answer different questions. | **Accepted roadmap and measurement correction.** Require a host with objects, dependencies and ownership; separate fixed-world policy comparisons, controlled-action mechanism checks and external human validation. |

## Recovery evidence and the default comparison

The unchanged default benchmark uses seeds 101–200, with 100 paired runs per scenario:

| Scenario | Full / greedy wins | Mean rounds, Full / greedy | Mean compulsory recoveries, Full / greedy |
|---|---:|---:|---:|
| Courier | 100 / 99 | 26.03 / 28.40 | 0 / 18.14 |
| Repair | 100 / 100 | 23.45 / 25.87 | 0 / 18.19 |
| Commons | 100 / 100 | 18.98 / 19.68 | 0 / 11.55 |
| Solo | 100 / 99 | 22.09 / 23.15 | 0 / 8.10 |

Full finishes in 3.6–9.4% fewer rounds on average. Win rates are nearly tied; Full does not finish earlier on every seed, uses more food on average, and finishes Solo slightly more fatigued. Compulsory recoveries count actor actions and provide useful care; they are not all wasted rounds. [Full benchmark and metrics](benchmark-report.md).

The [new recovery exploration](recovery-design-exploration.md) changed only deadlines. Planned-simple eats at observed hunger 60% when food remains, otherwise rests at fatigue 65%, otherwise uses the original baseline's work ranking. It reads the accessible actor view. This differs from the older conservative feasibility probe, which chooses the lowest-effort work.

At Solo's candidate 24-round deadline, seeds 1001–1100 produced **82 Full wins, 81 planned-simple wins and 67 greedy wins**. The root independently reran all 300 runs and matched each stored success, progress, round count and compulsory-recovery count. The controller benefits without new physiology or punishment, and Full has no demonstrated unique advantage over it here. This confirmation block contains additional seeds under the same authored condition, not new situations or external validation.

Counterexamples stay visible: at 18 rounds on seeds 101–200, greedy wins 17 times, planned-simple 14 and Full 11. In a one-round Solo task with target 3 and seed 7, Full rests and loses with zero output; greedy works within capacity and wins. If the objective is to finish that task, waiting for recovery can be the wrong decision. Penalizing greedy would conceal that useful counterexample. If a character values another outcome more, evaluate that declared purpose rather than assuming victory is everyone's objective.

The decision is to retain forgiving normal presets and use pressure as a diagnostic candidate. Recovery inefficiency remains unadopted. A real interrupted host action may incur setup or travel costs, but those require an explicit cause and matched zero-cost/sensitivity comparisons. Removing automatic meals would be a separate intervention: the current greedy controller never chooses food, so simply starving it would be a trivial victory for Full.

## A defect worth fixing before further tuning

The validation reviewer rescaled outputs, targets, starting progress and consumption together, leaving physical conditions and probabilities unchanged. The root independently reproduced all six runs. Courier seed 7 takes 35/27/29 rounds at unit multipliers 0.1/1/10, with 5/2/0 inspections and 0/0/18 compulsory recoveries. Solo changes from 29 to 17 to 26 rounds. A different label for the same amount of work should not change the relative value of eating or observing.

The remedy is an explicit physical-output/value contract, not a guessed normalization formula in this review. Changing an actual goal's importance may change choices; changing its measurement unit should not. The next implementation must state that distinction and pass transformed-scenario pairs.

## Revised delivery and what could make us stop

The [roadmap](roadmap.md) now orders the work as follows:

1. Repair value/units and comparison contracts while preserving 0.2 controls.
2. Extract a small component through one worker in a two-location object/inventory game. The host owns the world and resolves actions; the worker can be directed or delegated. Keep this first application free of social effects.
3. Freeze the resulting boundary. Have another author add an interaction without core edits, exercise interruption/save/resume, and compare with a small host-native controller. Measure authoring work, player comprehension and runtime separately.
4. Add one social, evidence or learning mechanism only when play exposes a need. An independent request/refusal can follow in the same host; Solo remains unchanged.

The integration lens places the host boundary first. The validation lens also proposes a disputed confidence-update experiment and a structurally different social interaction. The gameplay lens agrees that integration should precede those expansions, but cautions that a working body/scheduling component alone does not establish richer human-behavior value. The synthesis accepts that distinction: integration is a necessary gate, followed by a separately tested player/author benefit and then one needed mechanism. Source work can proceed in parallel.

Stop expanding or narrow the product if a new interaction requires core world-specific branches, the host duplicates human-state accounting, explanations use inaccessible facts, or the simple controller provides the same benefit with materially less authoring burden. Fix the boundary or ship the smaller component rather than adding faculties to justify its size.

Keep the original research commitments: Islam as truth with the stated interpretive starting point, source/interpretation/engineering distinctions, private intention separate from outcome, and positive representation of purposes beyond productivity. Such representations can be justified by fidelity, expressiveness or comprehension; they need not beat a task maximizer. Human-data calibration and qualified theological review retain their own acceptance criteria. Detailed physiology, broad cognition, macro dynamics and multiple engine bindings remain on the recorded shelf.

## Verification and delivery scope

The nine benchmark source hashes and recovery artifact's seven source hashes match the reviewed runtime. The reference benchmark hash matches. Root verification reproduced 300 confirmation runs, six unit probes and the two urgent-choice runs above. Both the root and integration reviewer ran all 57 existing tests successfully; the reviewer also inspected host replay, command-field and history-growth probes. The root checked 72 local links across the changed Markdown files and found none missing. A bounded consistency review caught the validation program's older multi-person opening; it is now explicitly a later example. The reports do not claim a completed host integration, new player study, human-data fit or theological certification.

This change preserves the reports and machine-readable recovery exploration, updates the roadmap/validation order and links the newly identified blockers. No runtime, default scenario, policy, replay version or public asset was changed. The recorded 0.2 release remains the application to play; there is no new playtest to retry from this review alone.
