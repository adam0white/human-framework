# Learning through useful work

2026-09-07. Scoped research and design recommendation for a longer, single-person pump-repair shift. This note adds no runtime mechanism or religious mapping. Scientific findings, implemented arithmetic, and authored gameplay choices are separate below.

## Recommendation

Carry one worker's repair practice across a finite set of pumps. Give each pump a concrete contribution to the shift objective and a visible completion test. Successful repairs advance that objective; executed repairs can supply practice even when they fail. **Do not add a failure bonus, an experience-points objective, or a minimum-failure requirement.** A player should have a reason to finish the current pump and use that experience on the next one.

Use a modest change in context between pumps: repair condition, route cost, access to a spare, or remaining shift time. These are host-authored differences. Reusing `repair` across these closely related jobs is an explicit abstraction, not evidence of unrestricted transfer. The player may learn how to plan routes and recovery while the simulated worker's proficiency improves; those are different kinds of learning.

The immediate implementation can retain the current practice equation. Add informative failure feedback only when the host actually observed something: “The seal still leaks; 35 minutes of repair practice were recorded” is supportable. “You learned the exact fault” requires a diagnostic observation the current failure event does not contain. Practice need not promise that the next attempt succeeds, or even that its immediate chance improves if fatigue increased substantially.

## What the present component does

Inspected baseline: commit `b3dcad6459b47bb8cf124beab62685c97c55175b`, human component `0.1.0`. [Model reference](../docs/model-reference.md), [public human boundary](../src/human/index.js), and [roadmap](../docs/roadmap.md) are the relevant local contracts.

```text
skillAfter = skillBefore + (1 − skillBefore) × (1 − exp(−0.008 × 0.65 × permittedPracticeMinutes))
```

The shared component credits practice during elapsed permitted activity, before the host resolves success or failure. `finishAttempt` does not inspect an error or change practice according to outcome. A completed and a failed attempt of equal duration therefore supply the same gain. Interrupted attempts keep only their elapsed practice. Capacity-blocked attempts supply none. The older single-pump workshop's inspection does not practice repair; laboratory inspection can practice its separately declared skill.

From the baseline proficiency `0.55`, 35 repair minutes produce approximately `0.625`, and 105 repair minutes produce `0.739`. Time partitioning alone does not create more practice: the exponential update composes over elapsed time. Quality is fixed, with no feedback processing, attention, consolidation, or runtime forgetting. These coefficients were authored, not fitted to people. A longer shift will make this existing assumption more consequential; it does not make it more empirically established.

## Four useful primary sources

| Source and type | What it establishes within its scope | Consequence for this game |
|---|---|---|
| [Kornell, Hays & Bjork (2009), original retrieval experiments](https://sites.williams.edu/nk2/files/2011/08/Kornell.Hays_.Bjork_.2009.pdf) | Generating unsuccessful answers followed by the correct answer improved later weak-associate recall compared with studying for the same total time in Experiments 4–6. The equal-total-time fictional-question comparison in Experiment 2 was null. These were memory tasks, not repair work. | Useful attempts plus subsequent information can matter. This supports separating an unsuccessful result from absence of learning; it does not justify awarding more repair skill for more failures. |
| [Eskreis-Winkler & Fishbach (2019), original experiments](https://journals.sagepub.com/doi/10.1177/0956797619881133) | Across five studies, participants learned less from their own failure feedback than success feedback on binary-choice tasks, even though both conveyed the correct answer. The authors link the effect to disengagement; observing others did not show the same failure disadvantage. | Do not romanticize failure or assume that the outcome automatically teaches. Neutral, specific feedback is a design inference from these results, not a tested pump-game intervention. No disengagement variable is proposed here. |
| [Mobius Digital / Alex Beachum (2016), original Outer Wilds design account](https://www.mobiusdigitalgames.com/news/separating-the-signal-from-the-noise) | Learning a signal helps players investigate related locations. The developer describes revising indicators after players misunderstood distance and tool use, and distributing instruction through later play. This is a developer account, not controlled evidence of learning. | Make an observation or skill useful on a later task. Test whether the interface actually communicates what changed; a displayed progression meter is insufficient. |
| [Subset Games, official Into the Breach description](https://subsetgames.com/itb.html) | Its authored design exposes enemy intentions and ties protecting buildings to the resources needed to continue. It also offers new challenges after defeat. The description is primary evidence of the advertised mechanics, not proof of their psychological effects. | Make the object-level stakes and upcoming costs legible. Subsequent tasks can change a meaningful decision without requiring hidden penalties, permanent stat inflation, or repetitions solely to fill a meter. |

The two experiments answer different questions with different materials and feedback. They jointly oppose the universal rule “failure teaches more.” Neither calibrates this game's per-minute update or establishes that real pump-repair competence follows an exponential curve.

## A small matched-exposure experiment

**Question:** Does experience from earlier attempts change a later repair outcome under this component, compared with frozen proficiency, when work exposure, bodily condition, and random variation are controlled?

Use the public human lifecycle with four copies of the same worker: practice on/off crossed with earlier outcomes reported as failed/completed. Prescribe three 35-minute repair attempts, each with effort `0.19`, each followed by 15 minutes of rest. Start all copies at fatigue `0.22`, hunger `0.15`, and repair `0.55`. Use separate training targets and complete the entire schedule in every arm, irrespective of success. The frozen arm passes `skill: null` for these otherwise identical training actions. This is an instrumented experimental intervention, not an ordinary player control or a proposed change to the component.

After 150 minutes, evaluate the same new target at difficulty `0.40`, with no hazard/support and no additional retest practice. Use actual identical body states and `estimateSuccess`, not the rounded player forecast. Keep training outcomes prescribed; use a separate shared set of retest quantiles for all four arms. Consequently, early victory, extra attempts after failure, policy changes, and shifted random-draw indices cannot explain the difference. Host object resolution is deliberately outside this component probe.

Executed against the baseline on 2026-09-07:

| Training arm | Repair proficiency | Fatigue / hunger | Later success probability | Successes / 1,000 shared retest draws |
|---|---:|---:|---:|---:|
| Practice on; earlier attempts failed | 0.739332 | 0 / 0.45 | 90.442% | 902 |
| Practice on; earlier attempts completed | 0.739332 | 0 / 0.45 | 90.442% | 902 |
| Frozen skill; earlier attempts failed | 0.55 | 0 / 0.45 | 81.608% | 817 |
| Frozen skill; earlier attempts completed | 0.55 | 0 / 0.45 | 81.608% | 817 |

The [reproducible runner](../scripts/learning-probe.js) and [source-identified artifact](../artifacts/learning-probe.json) independently reproduce these rows with `node scripts/learning-probe.js`. The artifact retains all retest quantiles and successful seed IDs; assertions verify equal body/time and the outcome-label null.

The probability difference is **8.834 percentage points**. Shared draws changed 85 outcomes from failure to success and none in the other direction. Reproduction of the retest draws: for integer seeds 1–1000, SHA-256 the UTF-8 string `learning-probe-retest-v1:${seed}`; interpret the first four bytes as an unsigned big-endian integer; divide by `4294967296`; success is `u < probability`. Each row uses the same quantiles. Practice exposure uses the lifecycle and defaults above; the retest does not advance time or consume another attempt.

This establishes a working numerical distinction from the no-learning rival and an outcome-label null: earlier failure has no special learning power in this implementation. The result follows from the encoded rule; it is not human-data validation, a whole-shift benchmark, or a measured improvement in player enjoyment. In the longer host, a follow-up matched retest must hold target condition and exposure fixed and retain all runs. A seed-7 victory alone would not answer this question.

## Incentives and remaining risks

- **Success must retain value.** Do not rank runs by skill gained or failures endured. Finite pumps, working equipment, and the shift deadline should determine the objective. Equal-duration success and failure supply equal practice; success also advances work. Resource consumption can legitimately differ by route, so inspect complete continuations rather than asserting universal outcome dominance.
- **Interrupting is a possible loophole.** Near-complete work followed by cancellation retains practice without resolving the pump. Its real time and effort costs remain, but test whether repeating it ever improves the final objective relative to finishing comparable useful repairs. Do not remove valid partial practice merely to hide this incentive problem.
- **Serial randomness can mimic learning.** The original workshop keys repair draws partly by the general attempt ID. Inserting a rest or inspection changes that ID. A causal probe needs explicit target/trial retest keys or the independent shared quantiles above; equal initial seeds alone are insufficient.
- **Diminishing gains alone do not prevent grind.** Long replacement attempts currently grant more practice than short patches. Check whether players are pushed to prolong work solely for future proficiency. Preserve route differences only when their time, resources, reliability, and later usefulness justify the choice.
- **Clarity is a separate test.** Ask a playtester to explain one later outcome using practice, condition, fatigue, and chance. If the game only communicates “do the same thing more,” revise the tasks and feedback before adding another learning variable. Preserve the existing Solo Repair social-null control and all negative benchmark results.
