# What may graduate to MVP

Date: 2026-09-07. The project has a broader research direction than its first reusable software deliverable. This contract makes the first deliverable small enough to finish without silently renaming the larger goal.

## Intended first deliverable

An embeddable, deterministic JavaScript kit for situated game actors: existing body/capacity/practice execution, host-owned actions and outcomes, a separable event clock, validated saved state, and working reference consumers. A host can use the mechanics with a player, an ordinary utility policy or a later planner. It never requires generated text to advance.

The current laboratory Full policy is a distinct reactive experimental controller. The standalone human component does not yet transport its belief, commitment and action-ranking machinery to arbitrary hosts. The laboratory's assistance, the courtyard's loans and Common Ground's shared projects are different host rules. None is a general implementation of human social cognition.

## Responsibility contract

| Responsibility | Shared kit | Host game | Presentation |
|---|---|---|---|
| Body, capacity and task practice | Person and attempt lifecycle | Declares effort, duration and skill; confirms consumed meal | Shows estimates and outcomes |
| Time | Optional clock orders scheduled events | Advances actors and settles concurrent jobs; chooses pause behavior | Requests elapsed simulation time or next event |
| Objects and resources | No knowledge of them | Owns availability, reservations, consumption, locations and goals | Explains prerequisites and costs |
| Choice and consent | No mandatory controller | Player commands or replaceable policy; recipient chooses response | Labels request versus command accurately |
| Learning evidence | Actual paid practice changes task skill | Decides which task earns practice and how skill affects outcomes | Shows useful effects, without manufactured XP score |
| Relationships and commitments | No portable social module yet | Explicit promises/loans/projects and observable reasons | Shows whose action was used and what was agreed |
| Persistence | Validates component and clock snapshots | Validates its world and reconciles pending jobs/resources | Imports/exports active state; optional transcript is separate |
| Randomness | No required inference service | Owns reproducible draws and when they are consumed | Shows a seed only when the host actually samples outcomes |

## Graduation checks

1. **Install outside this repository.** A packed artifact must execute in an empty consumer using only declared exports. No hidden imports from a game, browser or private research. Record the exact source and tarball contents. Success means portability of that exported scope.
2. **Survive host lifecycle changes.** Concurrent work, interrupted work, saving mid-action and alternate clock drivers must preserve outcomes and ownership. No double meals, instant resources, free recovery or hidden historical state growth.
3. **Make behavior understandable.** A person playing should explain the objective, a tradeoff, an unsuccessful action and another person's response from visible information. The practical five-person/four-correct-explanations gate remains open; one developer and AI reviews do not substitute for it.
4. **Earn complexity against a serious simpler rival.** Same information and world physics, with the simpler host controller allowed sensible recovery. Compare useful authoring effort and player explanations as well as outputs. Prescribed actions and equal-duration retests isolate mechanisms. A complicated policy winning every sample is neither required nor desirable.
5. **Retain independent controls and evidence.** Solo Repair stays socially isolated. Old replays and negative benchmarks remain executable. CPU/event latency and memory measurements must name hardware, workload and what rendering was excluded; physical-mobile timing remains a separate check.

The 0.5 milestone is meant to satisfy more of checks 1 and 2 and respond to observed clarity failures in check 3. It cannot predeclare checks 3 and 4 passed. Package usability and a broader human model have different completion criteria.

## Progress during the 0.5 playtest

| Check | Current evidence and remaining gate |
|---|---|
| External installation | Actual offline tarball installation with repository reads denied, plus an independently authored maintenance/watch host. This advances portability of the declared JavaScript API. |
| Lifecycle | Concurrent/idle work, interruption, owned parts, timed arrival, JSON resume and alternate drivers are exercised in the independent consumer. Reviews exposed import-invariant defects; their fixes and runtime compatibility patch have separate regression evidence. |
| Understandability | The user's Common Ground playtest is in progress. The five-person explanation gate remains open. No AI review substitutes for it. |
| Useful complexity | A frozen 48-trial controller comparison preserves partial outcomes and counterexamples. It does **not** compare the mechanics against a stamina/practice-counter substitute or measure authoring benefit. The social candidate matches direct host rules while retaining more state; do not package it. |
| Controls and cost | Solo operation, legacy engines and negative results remain. The independent consumer records a predeclared desktop CPU budget and bounded state. Physical-mobile timing remains open. |

The first two checks now have more than a package smoke test behind them. Graduation still requires an intelligible useful game, a credible simpler-mechanism comparison, and a stable documented release boundary. [Evidence milestone](mvp-evidence-2026-09-07.md) · [Review dispositions](reviews/2026-09-07-evidence-review.md).

## Sequence after this milestone

1. Use the current play report to improve only the choices and explanations that fail. Keep Common Ground's existing live mechanics stable while collecting that report; do not add another public game merely to demonstrate activity.
2. Run a separately preregistered **mechanism** comparison: prescribed work/rest/meal schedules and matched retests through the same host commands, using the current body/practice kit and a credible smaller stamina-plus-counter model. Count host exceptions and authoring work separately from output, and preserve cases where the simpler model suffices. Neither model gets a tailored controller or impossible exertion.
3. Evaluate a thin attempt/clock coordination helper in two hosts. It may reduce repeated lifecycle checks, but must preserve host-owned resources, interruption effects, refusal and receipts. Compare it with today's direct wiring before adding it to the package.
4. Turn the headless repair/lookout/arrival example into a playable cooperative-defense slice only after its choices warrant a UI. This supplies a bounded path toward the user's wave-defense idea. Full waves, campaigns, broad cognition and detailed physiology remain later work.

Keep the shared social record experimental until an observed game need and a second real integration justify its extra contract. A protocol that records acceptance is not a model of why someone accepts or cares.

Islamic grounding, qualified Hanafi–Maturidi interpretation and empirical calibration continue as research tracks with their own evidence standards. They constrain how claims and agency are represented; they do not supply arbitrary software coefficients. The coverage and decision registers retain physiology, broader motives, cognition and social scale without making them blockers to a narrow useful kit.
