# Two caches before the ferry: inspected capability probe

Recorded 2026-09-08, after the [original six-run comparison](commons-next.md). A design critic pointed out that its build-first camp-first allocation is dominated at dusk: zero household kits, four camp nights and one unused cache, versus one kit and four nights when the first cache goes on the ferry. That retained finding remains true. This addendum asks a narrower question: can a supported player schedule deliver two caches before the unchanged ferry deadline?

**Yes: caches complete at afternoon minutes 40 and 88.** The successful sequence uses an accepted second cache request, 14 paid minutes of partial rest, two simultaneous timber trips, and independently chosen assembly by Meryem. Every decision uses offered jobs, displayed material stocks, remaining durations and next-event boundaries. No hidden body threshold, simulated-time slider, release/re-request trick, save edit, rule change or precision real-time pause is required.

[Executable protocol](../artifacts/commons-next/two-cache-ferry-probe.mjs) · [Inspected trace and ferry saves](../artifacts/commons-next/two-cache-ferry-probe.json) · [Regression tests](../tests/commons-next-two-cache.test.js).

## Player sequence

All times are minutes into the afternoon. Between the listed decisions, press **Advance to next event**; multiple events can occur while your job is still running.

| Minute | Visible situation | Player choice and consequence |
|---:|---|---|
| 0 | Stock has 2 timber, 1 salvage and 2 food. | Start recovering salvage; ask Meryem for one cache. She gathers timber, then salvage. |
| 21 | Your salvage arrives. Stock now covers the 6 timber / 3 salvage cache cost. Meryem is still gathering. | Start packing the first cache. |
| 36 | Meryem finishes her salvage trip and chooses an 18-minute rest. | Continue to your next completion. |
| 40 | Your first cache completes; the first commitment is fulfilled. Meryem has 14 rest minutes remaining. | Ask for a second cache, then start your own 18-minute rest. Her existing rest continues. |
| 54 | Meryem finishes resting and starts a 15-minute timber trip. Your rest has 4 minutes left. | Cancel your rest after 14 paid minutes; start your own offered 15-minute timber trip. |
| 69 | Both timber trips finish together. Meryem sees enough material and starts the second cache, taking 19 minutes. | Start another full 18-minute rest. |
| 87 | Your rest completes; her assembly has one minute remaining. | Advance to her completion. |
| 88 | Meryem finishes the second cache. | Advance to the ferry checkpoint at minute 90. |

Two complete caches are available at the ferry. They can equip both households, cover all four camp nights, or provide one household kit plus two camp nights. These are feasible checkpoint allocations, not claims about which is best over the rest of the day.

The interrupted rest does not grant a refund, extra recovery or output. All 14 elapsed minutes remain paid; cancellation preserves exact body state and stock. The actor then rests another 18 minutes while Meryem assembles. At the ferry the two actors' 180 person-minutes comprise 125 work, 52 rest, zero meal and 3 idle minutes. The extra two rest minutes include Meryem's recovery beginning after her assembly; pending recovery remains in the validated save.

## Nearby negative case

Completing the first rest instead of canceling it leaves the player ready at minute 58. Their timber arrives at minute 73; by then Meryem has started a second timber trip because the shared stock was insufficient when she chose at minute 69. The player can begin the offered 19-minute assembly at minute 73, but the ferry stops it with two minutes remaining. Only the first cache counts.

| Inspected sequence | Completed caches at ferry | Completion times | Canceled jobs | Unfinished player work |
|---|---:|---|---:|---|
| Coordinate after 14 paid rest minutes | 2 | 40, 88 | 1 | None |
| Complete all 18 first-rest minutes | 1 | 40 | 0 | Cache assembly, 2 minutes left |

Both retain 2 food. Their material stocks, later recovery, worker assignments and job histories differ, so this pair does not isolate a physiological coefficient. It demonstrates coordination through the existing reservation, simultaneous-completion, consent and paid-interruption rules.

## Search and interpretation limits

This was an informed exploratory capability search prompted by the critic, not a reserved evaluation. We inspected the suggested salvage-first opening and four first-rest durations: 14, 15, 16 and 18 paid minutes. Fifteen and sixteen also permit two caches through a different player-assembly continuation. Fourteen permits a simpler next-event-boundary schedule and lets Meryem do the second assembly. The search stopped after recording the successful sequence and the nearby full-rest case; it was neither exhaustive nor an optimization study.

The original six runs and their artifact are unchanged. Their camp-first dominance and unmet needs are not erased by a stronger schedule. This probe shows that two early caches are supported, and supplies a concrete playtest route. Whether a person can discover, understand or enjoy paid partial-rest coordination remains open. It does not validate fairness, optimality, physical realism or final-day provision. No Human, clock, world, opening, pacing, policy or UI source changed for this addendum.

The executable protocol writes only to an explicitly supplied new output path and refuses to overwrite existing evidence:

```sh
PATH=/opt/homebrew/bin:$PATH node artifacts/commons-next/two-cache-ferry-probe.mjs /tmp/two-cache-probe-repeat.json
PATH=/opt/homebrew/bin:$PATH node --test tests/commons-next-two-cache.test.js
```

The two new regressions pass, including strict ferry-save roundtrips and allocation conservation. The full lane suite passes 292 tests on Node 26.8.1. Browser execution of this exact sequence is a separate parent review step; this document records headless replay evidence.
