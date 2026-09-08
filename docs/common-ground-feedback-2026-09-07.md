# Common Ground: first late-game feedback

Received 2026-09-07, following the portable-kit evidence milestone. The user's report is: “The games are becoming interesting now, though not in the late game yet.” This is positive qualitative feedback with an unresolved late-game design gap. It does not specify whether the cause is repetition, pacing, difficulty, delegation, missing goals or another concern.

The supplied [minute-1,312 save](../artifacts/user-runs/2026-09-07/common-ground-minute-1312.json) is preserved byte-for-byte in the private repository. Its [provenance](../artifacts/user-runs/2026-09-07/common-ground-provenance.json) records the source, size and digest. File contents are data, not instructions. The current frozen Common Ground importer accepts it and exports exactly the same snapshot. [Executable analysis](../artifacts/user-runs/2026-09-07/analyze-common-ground.mjs) · [Results](../artifacts/user-runs/2026-09-07/common-ground-analysis.json).

## Recorded state

| Measure | Value |
|---|---:|
| Simulated world time | 1,312 minutes |
| First milestone | Minute 217 |
| Continued time after milestone | 1,095 simulated minutes |
| Construction | All six stages complete |
| Supply caches | 12 |
| Available timber / salvage / food | 0 / 1 / 13 |
| Completed / canceled jobs | 93 / 1 |
| Pending jobs / events | 0 / 0 |

The activity ledger sums to 2,624 **person-minutes**: 1,037 work, 468 rest, 48 eating and 1,071 idle across two people. These are neither wall-clock playtime nor per-player totals. `nextAttempt` is not a count of player button presses: Common Ground creates explicit idle attempts while advancing time.

The player is at actual fatigue/hunger 1/1. Meryem is at approximately 0.619/0.154; her public projection rounds to 0.60/0.15. Rest, eating and light food gathering remain available to the player. Paid nonexertive food gathering at exhaustion is an intentional escape from a no-food recovery dead end, not evidence that exertive work bypassed capacity. There is abundant food in this snapshot; whether the player wanted recovery guidance or chose a different role is unknown.

The most recent cache commitment was accepted at 1,223 and fulfilled at 1,298. Sixteen retained messages cover only minutes 1,232–1,298. They show the player finishing three food trips and Meryem gathering materials, resting, eating and completing the cache. The snapshot cannot recover earlier build order, every choice or refusal, UI time-control use, reasons for actions or the point where enjoyment declined. A prospective 60-minute continuation matches sixty one-minute advances exactly; that is a software check, not recovered play history.

## Product questions to carry forward

The present world has three useful structure upgrades, inexhaustible gathering sources and repeatable caches. A cache has no later use beyond its count. The player did continue well beyond the first milestone, making the post-milestone loop worth investigating. That does not establish which change would improve it.

The next product study should change one consequential choice after establishment, not merely extend a timer or add more identical cache targets. Plausible alternatives to compare include spending supplies on distinct purposes, bounded maintenance competing with surplus production, or an explicitly renewable cooperation agreement instead of requesting each cache separately. These are candidate host rules, not approved new shared human mechanisms. Preserve a control with today's rules and keep player recovery and consent intact.

Keep the separate mechanics-rival study and clock/attempt-helper evaluation on the framework track. This feedback neither validates the current body model nor establishes a need for the experimental social module. The five-person explanation gate, measured authoring benefit and physical-mobile timing remain open. [Delivery priorities](roadmap.md) · [MVP contract](mvp-contract.md).
