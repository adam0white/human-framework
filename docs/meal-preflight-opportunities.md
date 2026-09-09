# Ordinary meal interruption: bounded opportunity search

This private 2026-09-08 preflight follows [the admission proposal](meal-interruption-proposal.md). It nominates four opportunities from existing default-created Camp maintenance traces. The useful objective is existing household or camp provision before the earned ferry/rain checkpoints. No deadline, person, inventory, receipt, runtime, host or saved physical state was edited; no meal-resume alternative was implemented.

## Search boundary and provenance

All nominees come from `artifacts/camp-maintenance/release-current/`. Reading the existing six recipes and their saved states is inspection of prior evidence, not a simulation search. Only the minute-278 nomination was executed by this opportunity lane. A separate atomic-rival lane examines minute 381. The readiness and minute-179 nominations below were rejected from their existing paid traces without new branches. There is no continuation from a player export or an edited setup.

| Nominee | Existing paid prefix | Available event and competing objective | Disposition |
| --- | --- | --- | --- |
| First-cache completion during an optional meal | `earned-supply-success`, first 50 commands, minute 278 | Meryem finishes the first cache at 283; the exclusive next cache becomes available. Equip the second household before ferry 314. | Executed below. All atomic controls serve both households and four camp nights. |
| Last-cache opportunity before rain | `earned-supply-success`, first 69 commands, minute 381 | Meryem finishes the third cache at 383; the fourth cache can finish at 403, before rain 404. | [Atomic-rival lane](meal-atomic-rival.md): wait-first and cancel/restart both provide all four nights at 403; finish-first misses two nights. |
| Existing three-minute canceled meal | `readiness-owned-meal`, named `owned-partial-meal`, minute 80 | The existing trace cancels a meal begun at 77. | Reachability only: the recipe supplies no competing current objective or intervening availability event. No new probe. |
| Existing meal before the supply window | `earned-supply-success`, meal begun by command 33 at 179 | Meryem's salvage arrives at 195; the original meal finishes at 187. | No event inside the meal. Retiming a meal solely to force overlap would not establish ordinary usefulness. No new probe. |

The executed graph is materialized from Git commit `f5ced4473769ceedbe10cded297599231b052bb5`, never imported from changing workspace files. Every physical dependency is also checked against the corresponding current workspace bytes. The graph has five files / 72,956 bytes; current host SHA-256 is `73a535b879e552c7d1bcbd592b82cb751362f42ee7eeb95ad16f8f4473d69d9a`. All five source bytes/hashes, the compressed source archive, archived-input hash and harness hash are retained in [the report](../artifacts/meal-preflight/opportunity/run-278-v1/report.json).

Each arm starts at `createGame()` and replays all 50 original commands, checking each full resulting snapshot exactly against the committed maintenance trace. Each new supported action records its ordinary before/after view and complete resulting snapshot. Every saved result round-trips through the current restore API. Failed task-first attempts retain the attempted command, unchanged full input snapshot, ordinary view and error. These repeated prefixes and refusals are comparison controls, not independent samples.

## Minute 278: genuine task availability, no unmet service benefit

At minute 278 the player has just completed a timber trip. The shared stock is seven timber, four salvage and five food. Meryem is completing the first cache, due at 283; `build-cache` is unavailable because that stage is occupied. The player has fatigue 0.557 and hunger 0.226. Hunger is sufficiently low that this is an optional meal, which weakens the ordinary motivation for starting it.

Starting the next cache immediately at 278 is rejected in all equal pre-meal states: “Someone is already building this stage.” This is distinct from being unable to issue zero-time allocation or request commands while eating. The intervening event really releases exclusive paid assembly work.

| Current atomic control | Meal payments in this branch | Second household kit allocated | Both kit and one completed meal achieved | Player fatigue at that point |
| --- | --- | ---: | ---: | ---: |
| Finish meal first | Meal 278–286, then cache 286–306 | 306 | 306 | 0.7990 |
| Wait for task, recover, then meal | Automatic recovery 278–283; cache 283–303; meal 303–311 | 303 | 311 | 0.6815 |
| Cancel for task and restart meal | Five paid meal minutes 278–283; cache 283–303; new eight-minute meal 303–311 | 303 | 311 | 0.8065 |

All second kits precede the existing ferry at 314. Both waiting and canceling free the player for the actual work at 283. Canceling provides no earlier second-kit completion than waiting, loses five meal minutes, and forgoes five recovery minutes. The fatigue difference at 311 is 0.125, so counting only the meal-duration saving would omit an actual cost. A meal receives its one portion relief only upon completing the full atomic action in these executed controls.

There is also a direct timing limit on the proposed interpretation: the player must pay eight meal minutes and twenty cache minutes after 278. A hypothetical interruption retaining five paid meal minutes could finish the cache at 303 and the remaining three meal minutes at 306; finish-first already completes both by 306. This is arithmetic from the observed durations, **not an executed candidate result**. The existing ferry does not distinguish household allocation at 303 from 306. Earlier hunger relief and later hunger relief also produce different values because relief clamps at zero; no nutrition equivalence is claimed.

## Legitimate further work and the controller effect

After each arm has completed the second kit and one meal, the same bounded ordinary-view build-first continuation pursues the two remaining camp kits. It requests the next cache, gathers missing materials, recovers at the existing policy's visible fatigue threshold, observes checkpoints, allocates actual caches, and stops once the window can close. This continuation is an explicitly authored exploration, not the untouched remainder of the old trace and not an optimized controller. Its executable rules are in [the runner](../artifacts/meal-preflight/opportunity/probe.mjs).

| Atomic arm | Household kits | Camp nights | Window closes | Player paid construction / gathering minutes, lifetime | Player final fatigue |
| --- | ---: | ---: | ---: | --- | ---: |
| Finish meal first | 2 | 4 | 403 | 40 / 236 | 0.3695 |
| Wait for task, recover, then meal | 2 | 4 | 403 | 40 / 236 | 0.3695 |
| Cancel for task and restart meal | 2 | 4 | 399 | 60 / 222 | 0.8085 |

The canceled-meal arm's earlier 399 close is preserved. Its additional fatigue changes the policy's decisions: the player waits through the duplicate timber arrivals, gathers salvage at 331, and then personally builds the third and fourth caches. The other two arms spend time on another timber trip and leave the third cache to Meryem. The outcomes therefore do not isolate a meal-resume mechanism, and the result does not justify a general efficiency ranking. All arms fulfill every existing service need; no candidate is needed to obtain that outcome.

The complete compressed records are [finish-first](../artifacts/meal-preflight/opportunity/run-278-v1/finish-meal-first.json.gz), [wait-first](../artifacts/meal-preflight/opportunity/run-278-v1/wait-task-then-meal.json.gz) and [cancel/restart](../artifacts/meal-preflight/opportunity/run-278-v1/cancel-task-restart.json.gz). The original execution log is [retained](../artifacts/meal-preflight/opportunity/run-278-v1.log). The three intended task-first refusals are the only recorded command failures; this was one exploratory run, not a succession of tuned anchors.

```sh
/opt/homebrew/bin/node artifacts/meal-preflight/opportunity/probe.mjs NEW_OUTPUT_DIRECTORY
```

The [independent minute-381 rival](meal-atomic-rival.md) finds the sharper case: a partly paid meal can be canceled to save two camp nights relative to finishing that meal first. Waiting with automatic recovery until the actual task becomes available at 383 saves the same two nights, completes the same full meal at 411, and leaves fatigue .003 lower. Its full 69-command prefix, expected task-first refusal and alternative histories belong to that separate evidence lane. An upstream minute-365 meal counterplan is also being recorded there; it has a different decision prefix and is not an additional independent sample of minute 381.

The bounded result supports closing this candidate direction without implementation: these selected objectives are covered by existing atomic controls. Neither these four nominations nor their authored continuations establish that atomic meals are universally optimal. An earlier future meal by itself, after all provision is settled, does not supply the missing concrete objective. Root owns independent validation and the combined admission decision.
