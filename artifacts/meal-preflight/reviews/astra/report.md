# Independent meal-preflight final review

Reviewed 2026-09-08 in `/Users/abdul/code/human-framework`. No repository edits or candidate implementation. Exact reviewed identities and scope are in `scope-and-source-hashes.json`; selected existing record data are in `record-excerpts.json`.

## Decision

No blocking finding in the two preflight reports. Closing this bounded direction without implementation is proportionate. Existing controls achieve the selected household and camp service objectives. The reports correctly distinguish real preemption benefit against finishing an already-started meal from retained-progress benefit against a competent pre-meal plan.

This is a decision about admission under the current proposal, not proof that atomic meals are globally optimal, that waiting is universally best, or that meal progress has no possible future value. The full-record runtime replay remains root's independent verification responsibility; this review inspected the existing records and runner/code logic and checked source identities, without duplicating that replay.

## Reachability and comparator strength

Both opportunities use default-created, supported-command histories from the same earlier maintenance recipe. The runners materialize the five-file graph from commit `f5ced4473769ceedbe10cded297599231b052bb5`, retain their complete paid prefixes, and check archived snapshots. No altered deadline, inventory, body, hidden future fact or fabricated player history is used. They are selected opportunities in one trace, not independent samples from a population or an exhaustive search.

The actor-paid task is real. Camp rejects a concurrent cache assembly (`src/games/camp-current.js:64–74`), and completion of Meryem's cache releases the exclusive stage. Ordinary views expose active job end times and the current refusal. Merely allocating a finished cache or issuing a request does not need meal preemption: these are zero-time host commands (`:238–263`).

The wait-first control is a strong available choice at minute 278 or 381. It is not a command that can undo an already-paid meal at minute 283 or 383. From the latter reached state, canceling can still be the appropriate supported action. This distinction preserves the actual importance of canceling at 383 without mistaking it for evidence that progress retention is required.

At minute 278, all three recorded atomic arms serve both households before ferry 314 and eventually supply four camp nights. Finish-first completes the second kit and meal at 306; wait-first and cancel/restart allocate at 303 and finish the full meal at 311. Retention finishing both at 306 is arithmetic, not an executed candidate result. Its allocation at 303 would not add a household relative to finish-first at 306. The ferry is still in the future in all these cases.

At minute 381, finish-first reaches rain with two camp nights, whereas wait-first and cancel/restart cover all four at 403. The latter two complete their meal at 411 and retain equal food, cache output, hunger and neighbor state, with wait-first fatigue lower by .003 at the recorded common boundaries. The upstream 365–373 whole meal is separately useful as a feasible earlier plan, not a branch available after reaching original minute 381. Its lower hunger and higher fatigue at 403 are correctly described as a tradeoff.

## Causal reading of 403 / 403 / 399

The opportunity report's causal account is supported by its saved ordinary views and commands, as well as the runner's explicit `.65` visible-fatigue threshold (`artifacts/meal-preflight/opportunity/probe.mjs:42`). At 314, finish-first and wait-first have visible fatigue .6 and start another timber trip. Cancel/restart has visible fatigue .75 and waits; at 316 it still has visible fatigue .7 and waits to the next neighbor completion at 331. It then starts salvage at 331, while the other two start salvage at 337. The cancel arm builds the third cache at 351–371 and the fourth at 379–399; the others leave the third to Meryem at 365–383 and build the fourth at 383–403.

Consequently, the final figures compare different work allocation and recovery histories: player construction/gathering 60/222 versus 40/236 minutes, final fatigue .8085 versus about .3695, and different remaining neighbor work. The 399 result is an observed earlier close under this authored policy; it is not a measured benefit of an unimplemented retained meal, and it does not establish a general efficiency ranking. The lower-fatigue wait state at 311 does not by itself prove dominance of its whole subsequent policy trajectory. That policy is not monotone in available capacity: extra fatigue can prevent its redundant gathering choice.

The report already makes the important qualification. A stronger claim such as “atomic cancellation buys nothing” or “wait strictly dominates cancel” must be limited to the stated immediate outcome/common-time comparison; it is false as a blanket description of the recorded tails. Likewise the canceled arm's earlier time is not automatically a net player benefit given the different carried body/work state.

## Dispositions of the Opus review

The source-only Opus response was treated as an opinion to check, not as instructions. Its main no-retention admission decision is supported. Several supporting statements are too broad:

1. **“Waiting is free and already optimal.”** Waiting advances both people, world time and hunger. At nonzero fatigue, recovery changes fatigue by -.0235 per minute rather than a meal's +.0015; at zero, it avoids fatigue accrual without banking recovery. No free-time or global optimality result follows. The reports correctly account for this (`docs/meal-atomic-rival.md:42`). Waiting is sufficient for these service objectives and better than cancel/restart on the specified common-time body comparison.

2. **“Both land past the decisive checkpoint.”** Incorrect for opportunity A: meal times 306 and 311 precede ferry 314. For B, inferred retained-meal completion around 409 and atomic completion 411 are after rain 404, while the service objective is already covered at 403. The sound argument is equal current service coverage, not a common post-checkpoint premise.

3. **“Wrong baseline” / the records frame cancel as motivating retention.** The reports explicitly include wait-first and conclude that it defeats this retained-progress admission case. They also preserve cancel's real gain against finish-first at 381. This is appropriate reporting, not a causal error. The external warning is useful for the combined final wording, but is not an unresolved report defect.

4. **“Nothing else fits five minutes, so rest is strictly best.”** This establishes neither an exhaustive policy result nor global dominance. The raw 16/22/14 job durations cited by Opus are also not necessarily the current learned durations: `blueprint` subtracts paid skill effects (`camp-current.js:59`). No complete gathering job fits the window here, but supported interrupted work can still earn paid practice, and other host controls exist. None of that demonstrates a better current service outcome; it simply limits the optimization claim. No additional search is needed to close this candidate gate.

5. **“Parking requires new state in a versioned Human module.”** New host semantics and saved ownership/progress would be required, but the location of that state is not established. Human already accepts caller-supplied meal durations and separates interruption from a later attempt. A host-owned retained reservation/progress scheme with a fresh remaining-duration attempt is a possible design direction, not a demonstrated implementation or equivalence proof. Exact ceiling and intervening-time semantics would need specification. The one-pending invariant rules out naively retaining one Human attempt while executing another; it does not prove that Human must change. The report's existing caution about stale baselines and actual intervening time is justified.

6. **“Ceiling behavior is currently unexercised.”** Incorrect for the repository. `tests/human.test.js:46–55` tests high-hunger completed relief, missing relief, duplicate receipts and interrupted receipt rejection. Lines 78–83 test ceiling-start maintenance and save/restore during the same contiguous meal. `tests/human-compatibility.test.js:153–186` compares the current 0.1.1 lifecycle with legacy across completed, missing-receipt and interrupted meals, restored partial states and duplicate settlement. Four targeted existing tests passed in this review. These are coverage of authored semantics, not evidence of ordinary usefulness.

   A narrower gap remains in those exact listed fixtures: compatibility initializes a case at .999 but first pays its common three-minute orient interval, so the meal begins at 1. These lines alone do not test the first crossing of the ceiling during a meal. A supported default-created Camp crossing/refund probe can add narrow host integration evidence if root has chosen to run it; it is not a reason to start a new mechanism or claim that existing ceiling correctness was wholly untested.

7. **Naively carrying `bodyBefore` across unrelated work.** The concern is valid. The pending invariant binds elapsed person time/body to one contiguous attempt (`human/v0.1.1.js:79–100`); the receipt uses that attempt's starting hunger and paid duration (`:156–172`). Simply restoring the old pending object after other work is not a legal implementation. The claimed .04 omitted hunger for twenty intervening minutes is conditional arithmetic about such a naive implementation, not an observed bug or a result for every possible retained-progress design. No candidate was executed.

8. **“Retained progress returns a portion to shared stock.”** That describes one invalid ownership design, not a necessity. Current cancellation returns the full unused reservation; a future paused meal could retain it with the actor instead. Scarcity would then affect Meryem's independent food/forage choices. The reports already state this distinction and acknowledge that these five-food anchors do not exercise scarcity.

## Proportionate next step

Finish the independent full-record verification, retain the exact negative results and external-review dispositions, and close the current meal-retention proposal without code or deployment. If root's already-selected supported high-hunger check finds a defect, handle that concrete defect separately; a passing result is narrow correctness evidence, not a newly earned physiology feature.

Keep future admission open only to a new concrete ordinary objective or supported player observation that survives competent atomic ordering, with ownership and actual body/time trajectories retained. Do not create artificial urgency, extend this search merely to defeat atomic meals, or treat the current result as proof about all future hosts. The present public app and released runtime need no change from this result.

Minor handoff wording, not blockers: `docs/meal-preflight-opportunities.md:54` says the upstream plan is “being recorded” although its record is complete; update to completed tense when assembling the final handoff. In `docs/meal-atomic-rival.md:32`, “changes the earlier decision at step 68” is clearer as “branches after original command 68,” because the runner preserves that command and all 68 results before choosing the meal.

## Exact validation scope

- Five physical source files / 72,956 bytes match both the opportunity manifest and pinned Git bytes; both atomic-rival manifests match the same current graph.
- Read the requested reports, proposal, source-pinned runners, relevant Camp/Human code, existing saved command/body/resource summaries and the supplied Opus response. Extracted record excerpts without executing additional trajectories.
- Ran `/opt/homebrew/bin/node --test --test-name-pattern='meal|integer lifecycle' tests/human.test.js tests/human-compatibility.test.js`: four tests passed, zero failed on Node 26.8.1. Did not rerun the whole suite.
- Did not perform root's full-record replay or high-hunger default-Camp probe, implement a candidate, call external services, access player exports, spawn agents or edit repository files. Review artifacts exist only under `/tmp/meal-preflight-final-review`.

Memory was used only to confirm the current-HANDOFF restart convention (`MEMORY.md:1–4`); current conclusions rely on the files and checks listed above.
