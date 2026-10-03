# Ordinary meal preemption: bounded preflight result

Completed 2026-09-08. **No retained-meal implementation is admitted.** The selected ordinary situations contain real work-availability events and one useful atomic cancellation, but strong existing plans meet every current provision objective. This is a bounded negative admission result, not proof that atomic meals are universally best or that future actors could never benefit from retained progress.

## What was examined

Four opportunities were nominated from existing default-created Camp maintenance traces. Two were inspected and rejected without new branches: the minute-80 cancel/restart trace supplies no competing objective; the original meal 179–187 finishes before the next partner supply arrival 195. The other two were explored using only supported commands, unchanged people/resources/deadlines, and the current Camp 0.3.0 / Human-runtime 0.1.1 source.

| Selected opportunity | Actual atomic controls | Current objective result |
|---|---|---|
| Minute278; partner cache completes 283; ferry 314 | Finish meal first; wait/recover then task and meal; cancel for task and restart meal. Task-first 278 fails the occupied assembly slot in each equal starting state. | Second household allocated 306/303/303; every arm serves both households and all four camp nights. |
| Minute381; partner cache completes 383; rain 404 | Task-first 381 refusal; finish meal first; cancel for cache; wait/recover for cache. | Finish-first misses two camp nights. Cancel and wait both complete all four nights 403, before rain. Waiting has lower fatigue and equal food. |
| Upstream counterplan after original command 68, minute 365 | Whole meal 365–373; recover until slot opens 383; build 383–403. | All four nights 403, with its own hunger/fatigue tradeoff. This earlier decision cannot be selected retrospectively at381. |

At278, a hypothetical retained five meal minutes could complete cache 303 and meal 306. That is arithmetic, not an executed candidate. Finish-first already completes both by 306, before ferry 314. The recorded wait and cancel arms complete their meal 311, with fatigue .6815 and .8065 respectively. A .125 fatigue difference is a real cost of eating instead of recovering; meal minutes are not free readiness.

A common ordinary-view continuation closes the later window 403/403/399 across the three A arms. The canceled arm's greater fatigue changes that controller's choices, leading to an extra player-built cache and fewer gathering minutes. Its earlier 399 close is preserved, together with final fatigue .8085 versus about .3695. It is not a meal-retention result or evidence of whole-trajectory dominance by any arm. [Opportunity details and histories](meal-preflight-opportunities.md).

At381, current cancellation genuinely saves the last-cache objective compared with finishing the meal first. The wait-first plan is available before the meal begins and reaches the same four nights with lower fatigue . A hypothetical resumed meal could provide relief earlier after the cache; all current supply needs are already covered by 403. The upstream whole-meal plan also succeeds, but trades earlier relief against recovery and cannot be presented as a choice available after the later state was reached. [Atomic-rival details](meal-atomic-rival.md).

## Verification and provenance

Physical source is Git `f5ced4473769ceedbe10cded297599231b052bb5`; the entire five-file graph totals 72,956 bytes. Camp source SHA-256 is `73a535b879e552c7d1bcbd592b82cb751362f42ee7eeb95ad16f8f4473d69d9a`. The existing maintenance trace supplies exact paid prefixes of 50, 69 and 68 commands. The exploratory scripts and results were committed at `78d2b29b1781c95a818e1dab91aaa6921778c40c` before root's independent verification. This is a post-exploration verification freeze, not a preregistered effectiveness study or withheld test.

Root wrote a separate verifier that replays the recorded commands instead of running either exploration controller. On minimum Node 22.0.0 it checks the original archived prefixes, every resulting full snapshot, ordinary before/after view, summary mark and all four exact unchanged-state refusals. It verifies eight recorded trajectories: three A arms, four B arms including its refusal-only control, and one upstream arm. Reused prefixes and duplicate refusals are controls, not independent human samples. [Final independent record](../artifacts/meal-preflight/independent-node22-final.json) · [Verifier](../artifacts/meal-preflight/verify-records.mjs).

The first independent record checked full generated trajectories; the final refinement additionally cross-checks every archived-prefix command/snapshot directly against the committed maintenance trace. Both records remain. Every input is synthetic default play. No private player export, altered body, changed deadline, candidate effect or new public asset was used.

## Hunger-ceiling integration check

The external review recommended checking high-hunger/ceiling receipts. Existing Human tests already cover high hunger, ceiling-start maintenance, restored partial attempts, duplicate settlement and rejected interrupted consumption. It was incorrect to call that behavior generally untested. The named compatibility ceiling case first pays an orientation step, so a narrower host case that starts below the ceiling and crosses it during a meal was useful.

Two new default-Camp tests wait 385 paid minutes from creation, reaching approximately .99 player hunger. One eight-minute meal crosses the ceiling, restores mid-attempt and completes with the correct approximately .456 hunger and one consumed portion; a whole advance and split/restored advance produce the same complete snapshot. A four-minute cancellation gives no relief and refunds its reservation once; a full paid restart ends after twelve meal minutes at approximately .464, with one total consumed portion. [Recorded states](../artifacts/meal-preflight/default-ceiling-integration.json) · [Tests](../tests/camp-current.test.js).

The first root fixture used 395 minutes while assuming .20 starting hunger; actual default hunger is .22, so that state was already at the ceiling. The failed fixture and output are retained; 385 is the corrected pre-crossing setup. This was a test-setup error, not an application defect. No physical source changed. These checks validate the existing authored contract, not human nutrition or a retained-meal candidate.

All **864 repository tests pass** on Node 26.8.1, and all **25 current Camp tests pass on minimum Node 22.0.0**. [Full suite](../artifacts/meal-preflight/reviews/validation/meal-preflight-all-tests.log) · [Minimum runtime](../artifacts/meal-preflight/reviews/validation/meal-preflight-node22.log).

## Review decision and next priority

Independent Astra source/record review and one restricted source-only default-Claude review support closing this bounded direction. The latter actually used `claude-opus-5[1m]`, with auxiliary Haiku usage recorded; no Fable call was used. Its raw output is preserved and its overstatements are corrected in [the dispositions](reviews/2026-09-08-meal-preflight.md). AI review is not human evidence or an automatic authority.

Current meals remain unchanged. Future retention requires a new concrete ordinary objective or actual player observation that survives strong atomic ordering, while preserving portion ownership, intervening time and body trajectories. Mere reachability or saved minutes from an unnecessary cancellation is insufficient. No timer, fatigue profile, new scene or physiology variable is added to rescue this result.

The next priority is a bounded [empirical learning-data pilot](learning-data-pilot-proposal.md) for the existing practice-curve family. It targets an open empirical question rather than another unsupported mechanism. Public app 0.14 remains at source `2ebdb8841215a26f69da1c394ab438b7a1f4d15d`; this private preflight adds no runtime or interface deployment.
