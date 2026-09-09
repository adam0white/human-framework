# Practice incentives: useful effects, no mechanical repair admitted

Two source-derived default-Camp opportunities and eight frozen routes show that paid practice can shorten a later job without making deliberate noncompletion the best productive route. Keep the current mechanics. The earned presentation change is small: explain paid practice in the existing Work disclosure and expose food gathering's already implemented light-work property on its card. No skill meter, rate calibration, new faculty or new example game is admitted.

These are deliberately selected software cases in Camp 0.3.0, not sampled human strategies, a general optimum search or human learning evidence. [Proposal](practice-incentive-preflight.md) · [Gathering protocol](practice-gathering-protocol.md) · [Construction protocol](practice-construction-protocol.md) · [Source-only UI inspection](practice-ui-preflight.md).

## G1: a quicker later trip is not a quicker timber route

The exact productive default prefix ends at minute 30 after one timber trip and one food trip: seven timber, two salvage, six food, and thirty paid gathering minutes. Meryem remains unrequested and automatically recovers. The target is eight held timber, the timber component for both Woodshed stages; salvage and actual construction are still required. Minute 60 is an observation horizon, not a game deadline.

| Frozen continuation | New timber-trip duration | First timber target | Food at 60 | Ongoing forage at 60 | Player fatigue at 60 |
|---|---:|---:|---:|---:|---:|
| Timber first, then productive forage | 16 min | **46** | 8 | 1 / 13 min | 0.55 |
| Complete forage, then timber | 15 min | 59 | 8 | 1 / 13 min | 0.55 |
| Six minutes forage, stop, then timber | 15 min | 51 | 6 | 9 / 13 min | 0.55 |
| Six minutes automatic recovery, then timber | 16 min | 52 | 6 | 8 / 13 min | 0.40 |

All routes hold ten timber/two salvage at the horizon. The three active-practice routes each pay sixty gathering minutes and reach the same gathering proficiency (about .34122); the recovery control pays 54 gathering and six recovery minutes, reaching about .32034. Player hunger is .34 throughout the endpoint comparison. Stored food has not been eaten and does not itself relieve hunger.

The partial trip earns a genuine one-minute later-trip reduction relative to equal-delay recovery. It also gives up a completed food yield and recovery's .15 lower fatigue. Timber-first reaches the target five minutes before partial practice and holds two more completed food portions. The partial route has more progress in a pending forage, so this is not a claim that one complete state dominates another in every future use. Zero declared forage effort does not make it recovery or remove elapsed time and active-body costs. Tiny floating-point ordering differences in fatigue/effort remain in raw records; table values are rounded.

The candidate therefore establishes no withholding-completion advantage unmatched by the productive controls. [Four complete trajectories](../artifacts/practice-incentive/gathering/run-initial/G1-arms.json) · [Independent controls/accounting review](reviews/2026-09-08-practice-gathering.md).

## C1: practice can move useful work without moving the target time

The selected paid default prefix reaches minute 84 with 45 player construction minutes, one completed workbench stage, one garden stage and an unfinished woodshed frame. The player has accepted a handover; the workbench tools are still unfinished. The next garden stage has not been assigned. One further useful woodshed minute crosses the first construction-duration threshold; its next garden-stage quote becomes 25 rather than 26 minutes. Existing same-stage work rates are not refreshed by stopping.

| Frozen continuation | Garden admission | New garden duration | Garden complete | Enhanced food arrives | Woodshed frame complete |
|---|---:|---:|---:|---:|---:|
| Finish the woodshed frame first | 101 | 25 min | 126 | 140 | **101** |
| Stop and start the garden now | 84 | 26 min | **110** | **124** | **101** |
| One useful woodshed minute, then garden | 85 | 25 min | **110** | **124** | 135 |
| One recovery minute, then garden | 85 | 26 min | 111 | 125 | **101** |

The one-minute practice reduction offsets the extra minute spent on useful woodshed work. It ties the immediate-garden route on garden/food timing and beats equal-delay recovery by one minute. It does not establish a better overall plan.

Meryem's actual choice is consequential. While the player still occupies the woodshed at minute 85, her policy starts gathering salvage for its next stage. At that point the new trip has zero elapsed paid minutes. When the player stops, the just-started trip continues and subsequently incurs its full cost; frame completion is delayed to 135 rather than 101. This 34-minute difference is a controller/work-allocation consequence, not a learning coefficient effect. In the direct-garden and recovery controls, she resumes the unlocked frame promptly. Every actor's paid time and state remains recorded.

At minute 160, the immediate/partial/recovery routes each hold four timber, three salvage and seven food, with no active physical assembly. The partial route shifts one construction minute from Meryem to the player: player effort is about .80333 rather than .79500, Meryem's effort about .98667 rather than .99500, and Meryem's fatigue .50167 rather than .53500. Player fatigue has reached zero in all three; that endpoint does not erase earlier costs. The finish-frame-first route instead has zero timber/one salvage/seven food, a roof 26/28 minutes complete, and substantially more current fatigue (.45167 player/.80405 Meryem). Free stocks alone would omit its installed material and nearly completed roof.

This supports explaining a concrete practice effect while retaining partial work, ownership and productive alternatives. It supplies no unwanted-incentive proof and no case for changing the practice equation. [Four complete trajectories](../artifacts/practice-incentive/construction/comparison-initial.json) · [Independent causal review](reviews/2026-09-08-practice-construction.md).

## Failures, source identities and verification

Only two opportunities were nominated; another gathering threshold case was rejected as duplicative before execution. No custom body/skill profile, dataset refit, practice-off intervention, new deadline or new case search was used.

The first construction administrative prefix failed its minute-83 handover because Meryem's post-handover trip starts on the next paid tick and arrives at 84. The original failed record and exact original runner/protocol bytes remain. Before any comparison, root authorized a single documented correction from twelve to thirteen free minutes, producing the legal minute-84 prefix. This is not a silently replaced comparison result. Root's first G1 command also omitted the required `--freeze` flag; the guard rejected it before any comparison. The corrected invocation used the identical committed runner. All eight actual comparison routes then completed with zero refusals.

The physical graph is source-pinned to `fe540daccd5e6e5e81ce850f2aef4baab902fca3`. Protocols, runners, original/corrected administrative records and their source copies are committed at `29b135e37308337fb2619c2359f1ef6de51b4cc2`; both manifests are committed at `7d7d3c2` before comparison execution. [G1 freeze](../artifacts/practice-incentive/gathering/freeze.json) · [C1 freeze](../artifacts/practice-incentive/construction/freeze.json).

Root independently replays **434 full states and 434 ordinary views**, JSON-restores every recorded state, reconstructs **28 marked summaries**, and verifies the one recorded administrative refusal on **minimum Node 22.0.0**. This covers eight comparison trajectories plus three administrative records. The [independent verifier](../artifacts/practice-incentive/replay.mjs) imports neither study runner; its [exact receipt](../artifacts/practice-incentive/replay-node22.json) distinguishes these repetitions from new cases. Independent cross-reviews check each other's case through accounting/control and causal/other-worker lenses.

The two source-supported UI changes preserve current duration quotes, dynamic two/three-food yields, disabled reasons, retained-work guidance and compact tabs/HUD. They explain the current game rule; they do not claim measured improvement in player comprehension. [App 0.14.1 delivery](release-0.14.1.md) records browser, suite, deployment and live verification separately. Camp stays 0.3.0, runtime/Human 0.1.1 and clock 0.1.0; all physical sources are unchanged.

For future work, the observed Meryem timing difference offers a concrete policy question: should an actor reconsider an underway supply trip when the other worker releases the stage? Test that separately against finish-current and the already available release/re-request control; do not reinterpret the present practice study as a policy comparison or immediately add a general planner.
