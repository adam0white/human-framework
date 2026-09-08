# Laboratory 0.3 and the first host-owned game

Work begun 2026-09-07. Laboratory engine `0.3.0`; human component `0.1.0`; host `workshop-0.1.0`. This record describes the implemented slice. The live `/release.json` identifies the deployed source commit; release checks are recorded below after execution.

## What changed

**Before departure** is a separate single-person game at `/workshop/`. Collect a wrench, travel to the pump, choose a quick patch or a slower replacement using a spare seal, then run the repaired pump before departure. Paid inspection reveals fitting condition. Start, advance, stop and resume actions; active saves preserve an unfinished interval. The host owns objects, prerequisites, inventory, time, outcomes and victory. A shared human component owns body, practice and one pending attempt. The component's API imports common authored equations; changing their behavior requires reviewing its independent version contract.

The host never obtains a ration as a side effect of a capacity check. Blocked exertion consumes two idle minutes, and the next decision remains with the player or host controller. This is an authored interruption cost, not physiological evidence or a penalty added to favor laboratory Full. All host controllers face the same rule. The four laboratory presets retain their documented recovery substitution and historical comparisons.

Laboratory Full now values remaining useful output and the remaining opportunity to finish. Task utility is dimensionless and separate from physical progress units. Equivalent unit conversions preserve behavior, including floating-point terminal cases. This fixes the reproduced final-opportunity mistake without forcing work whenever a commitment or capacity consideration says otherwise. Full is still a reactive scoring rule, not an action-sequence planner.

Planned-simple is a first-class laboratory comparator for every actor. It uses perceived hunger/fatigue thresholds, then the same static work ranking as greedy. The UI shows recovery/feasibility tiers separately from scores within a tier. Earlier 0.1 and 0.2 sessions dispatch to frozen replay engines.

## Two external reviews and decisions

Two distinct Claude CLI processes ran concurrently with **`--model fable`**, separate sessions, separate read-only copies of commit `08aab973`, and overlapping overall conceptual/product prompts. Both completed successfully and reported `claude-fable-5-1` as their primary model. The raw CLI records also disclose small Haiku auxiliary usage; its role is unidentified and it is not counted as another reviewer. Invocation, hashes, prompts and full outputs are retained in the [verification record](../research/reviews/2026-09-07-claude-fable-verification.md), [conceptual review](../research/reviews/2026-09-07-claude-fable-a-conceptual.md) and [product review](../research/reviews/2026-09-07-claude-fable-b-product.md).

The reviewers did not receive each other's output or earlier review verdicts. They did see the existing roadmap and the same underlying model; this reduces mutual priming, not all bias. Their reviews address the pre-implementation direction. A [fresh internal code review](release-code-review-0.3.md) separately examines the new implementation.

| Review recommendation | Disposition |
|---|---|
| Keep observation, requested choice, execution and replay distinct. | Retained in the lab and made explicit at the new host boundary. |
| Test a competent simple controller; Full winning is not the purpose. | Implemented. Planned-simple remains slightly faster across the four lab presets in the new benchmark. |
| Prove a separate game can use the component before expanding faculties. | Implemented a narrower body/practice integration. A different author added inspection without changing the shared component. Player/authoring benefit remains a testable claim. |
| Positive Islamic representation should extend beyond exclusions. | Retained as a substantive research direction alongside engineering. No reviewer recollection was promoted into fiqh, a theological equation or a runtime rule. A sourced scenario must distinguish normative reference, the character's understanding, intention, action and consequence. |
| Compare noncompensatory duties with weighted utility. | Worth a scoped future comparison. Additive reasons imply compensability, but do not automatically turn every valued end into a means to productivity. No universal scoring replacement follows yet. |
| Remove inert social claims. | Narrowed the claim: default Full selects no help in the inspected 0.2 runs, but promises and directed trust do change. Aggregate output equality cannot prove every mechanism or state is inert. |
| Require Full to win several presets; enforce an arbitrary abstraction line limit; remove historical replay. | Unadopted. These are not adequate measures of fidelity/usefulness, and replay removal conflicts with preserving user sessions. |

## Integration defects caught and fixed

The independent consumer found missing host skill validation, impossible committed world effects accepted by saves, route choice using a fixed time threshold instead of actual prerequisites, and forecasts omitting practice earned during work. The host now validates its expected person/world shape and minimum lifecycle consistency, sums visible travel/retrieval/repair/test costs, and forecasts through a detached observed person using the public human lifecycle. Save validation establishes structural consistency, not authentication or proof of all past events.

Further regressions protect maintenance at the hunger ceiling, duplicate outcomes, time overflow, and near-complete fractional intervals. The [consumer memo](independent-host-consumer.md) records exact unchanged component hashes and the additional inspection feature. The [API/integration report](workshop-integration.md) documents action ownership, both routes and remaining usability gates.

## Evidence and remaining work

The [laboratory benchmark](benchmark-report.md) contains 4,400 simulations, including all three controllers, ablations, feasibility probes and null comparisons. Its 101–200 seeds have been used before; this is a reproducible regression comparison, not a newly reserved validation set. The separate [host benchmark artifact](../artifacts/workshop-benchmark.json) retains per-run outcomes and source identities. Host route controllers are not laboratory Full; their results do not measure Full's portability.

Root CUA at a 390 × 844 desktop-browser viewport verified a pending wrench action restored at 5/6 minutes after reload, paid inspection changed the visible condition and forecast, and a manual inspected patch route completed at 71 simulated minutes with controller help collapsed. The host author separately checked both seed-1 routes, actual file download/upload and mobile overflow. These are software/browser checks, not physical-device measurements or human playtest participants.

The [browser performance check](workshop-performance.md) separately measures the predeclared command budget, excluding rendering. A physical mobile check remains distinct from viewport emulation. The next gate is the existing five-person formative playtest with hints hidden: four should explain the objective, a tradeoff and an observed failure. Then select one missing mechanism because play exposes a need, comparing it with a serious simpler alternative. Broader physiology, social negotiation, attention/memory and theological scenarios remain recorded candidates, not silently implemented faculties.

## Release verification

Predeployment verification: **105 tests passed**, zero failed/skipped; the explicit build contains 30 public files; Wrangler dry-run passed. All nine laboratory and four host benchmark source hashes match the implementation. The 300 host command logs were independently replayed and match their final-state hashes. CUA additionally completed planned-simple Solo seed 7 in 19 rounds and imported a 0.2 session with its historical rules and disabled action controls. Final commit/push/deployment and production checks remain to be recorded here.
