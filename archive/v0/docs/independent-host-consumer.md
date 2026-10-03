# Independent host consumer: pump inspection

> Historical or version-scoped record. Original counts, proposals and observations below are retained. For current project state and delivery order, read the [handoff](../HANDOFF.md), [MVP contract](mvp-contract.md) and [roadmap](roadmap.md).

Date: 2026-09-07. Author: the independently dispatched `independent_host_consumer` agent. The first host author paused edits to `src/games/workshop.js` while this work was performed. This records a second author's actual implementation, rather than a proposed integration or an external review label.

## Boundary and file provenance

The entry point inspected and used was `src/human/index.js`, public component version `0.1.0`. Its SHA-256 before implementation and after the inspection, review fixes, fractional-time correction and 32-test verification was identical:

```text
before: 0f6d30cf2b5e07f5e18dc791fecd691b9004f290e138abeab7336b1c2e2ee308
after:  0f6d30cf2b5e07f5e18dc791fecd691b9004f290e138abeab7336b1c2e2ee308
```

This author changed exactly three files:

- `src/games/workshop.js`: the interaction and subsequent host corrections described below.
- `tests/host-consumer.test.js`: twelve behavioral tests for the interaction and reproduced host defects.
- `docs/independent-host-consumer.md`: this account.

No human component, current laboratory core, old replay engine, web UI, script, package, benchmark or research-review file was edited by this author. Other authors were working concurrently; this is a statement about this integration's requirements and edits, not a claim that the whole repository was frozen. The interaction required **zero human/core changes and zero public API exceptions**. No new faculty, effect branch or practice formula was introduced.

## The implemented interaction

`inspect-pump` is an optional ten-minute action available in the pump room while the pump is broken and has no recorded inspection. It needs no tool. Action availability depends on the visible location and repair/inspection state, never the hidden condition or a prospective outcome draw.

The existing host action adapter declares active, non-exertive time with no skill. `beginAttempt`, `advanceAttempt` and `finishAttempt` therefore charge maintenance once, across partial advances and interruptions, without repair practice. This was an explicit modeling choice: observation was not used to manufacture an extra learning mechanism.

Only a completed inspection writes host-owned `objects.pump.inspection`, containing the observed `condition`, `inspectedAt` world time and consumed `attemptId`. Interruption, including departure during an unfinished inspection, reveals nothing. Both manual repair routes remain available without inspecting.

`getGameView` always removes the authoritative `pump.condition`. Before inspection it exposes no condition; afterward the separately recorded inspection is visible. Repair forecasts use midpoint difficulty before inspection and the disclosed condition afterward. This is an authored information mechanic, not an empirical claim that ten minutes reveals every real pump defect.

Inspection snapshots require the exact field shape, a condition matching the host object, a possible observation time, and a consumed past attempt identity. An observation cannot appear inside a later pending interval. Pending and completed saves resume, and the command replay reproduces the same observation. The new field forms part of this initial, still-unreleased workshop `0.1.0` save schema; incomplete development snapshots without it are rejected.

## Independent review and corrections

After the initial five inspection tests and eleven existing host tests passed, the author independently exercised lifecycle, save, information and controller boundaries. Root authorized these additional host fixes; they are separate from the inspection's zero-core-change demonstration.

1. **Host-specific snapshot invariants.** A component-valid person with no `repair` skill could previously pass import and then crash `getGameView`. A purported win at time zero in storage, or a repaired pump with its required wrench still in storage, was also accepted. Import now requires the workshop worker identity and exact repair-skill shape, enforces necessary tool/location consistency, and checks a lower bound on elapsed time for committed retrievals, meals, travel, inspection, repair, verification and the current pending interval. These are consistency checks, not save authentication or a proof that every accepted history is realizable.
2. **Replacement route timing.** With the wrench carried and 82 minutes left in storage, the previous controller collected a seal, traveled, then selected patch at 58 minutes because its fixed 82-minute cutoff ignored the completed prerequisites. Replacement plus verification fits exactly in those 58 minutes. The projected view now includes public action durations, and the controller derives the replacement route cost from that view's inventory, location, retrievals, necessary storage detours, repair and final verification. It uses no seed or hidden object state. At 58 minutes with the spare it chooses replacement; at 57 it chooses patch. The greedy comparator remains distinct. This is a bounded host controller, not an optimal planner: the duration calculation does not reserve time for retries or future recovery.
3. **Post-practice forecasts.** An inspected ordinary seal with an exactly observed starting body of fatigue `0.25`, hunger `0.2`, and repair skill `0.55` previously showed patch probability `0.69972738`; the completion calculation, after earned practice, used `0.75869123`. Forecasting now creates a detached person from the observed body and skills, then runs the public `beginAttempt` and `advanceAttempt` functions before calling `estimateSuccess`. No practice/body equation is duplicated in the host. An observed capacity blockage reports zero execution probability. Rounded body observations and undisclosed condition can still make the estimate differ from actual execution; that is intentional uncertainty rather than this removed timing mismatch.

The visible `blocked` state after an attempted action is not a free pre-choice probe: the host prevents another choice until the declared two-minute blocked interval has been paid. Snapshot and replay tests retained that behavior, along with once-only meals, partial practice, both repair routes and deadline interruptions. Negative policy results remain the benchmark author's responsibility and were not edited here.

4. **Fractional completion and deadline boundaries.** Advancing a six-minute wrench retrieval by `6 - 5e-10` minutes caused the host's `1e-9` completion tolerance to call a human completion check using `1e-10`, producing `Attempt interval is incomplete`. A smaller unspent fraction could silently finish early, including falsely awarding a win for verification scheduled `5e-11` minutes after departure. Root assigned this follow-up to the same author. The host now settles when either the charged attempt interval or its absolute scheduled end has actually been reached, without the broad epsilon. The absolute start-plus-duration boundary handles machine-rounding differences between world time and accumulated attempt time at departure. Three regressions cover pending save/resume near completion, exact deadline completion versus unfinished inspection, and rejection of a fractionally late victory. All were observed failing against the old comparison before the corrected full suite passed. No human or core change was needed.

## Authoring and verification record

The author read the initial host, the public human API, its specification and existing host tests, and recorded the imported-file hash. Five inspection tests were written first and all failed because the action did not exist. The interaction was then implemented. One initial assertion incorrectly assumed that a difficulty increment translated linearly into a probability increment; reading the existing logistic success equation exposed that test error, and the test was corrected to require a discriminating observed-condition forecast instead.

A separate failed test then exposed an inspection timestamp inside a later pending action; validation was corrected and the full 16-test host suite passed. Reproductions for missing host skills, impossible world state, the 58-minute route decision, the spare detour, and the post-practice forecast were subsequently turned into failing tests before their host fixes. Forecast verification uses a hand-authored action specification through the public component, checks that hidden-body changes that round to the same observation do not change the view, and checks that forecasting does not mutate the live worker.

Final verification for this author's completed changes:

```text
node --test tests/host-consumer.test.js tests/workshop-game.test.js tests/human.test.js
32 tests passed; 0 failed
```

A separate bounded exerciser ran 100 seeds with retrieval, travel, repair, inspection, partial advancement and interruption choices, exporting and importing after each command. All 5,582 intermediate snapshots were accepted, checking that the new necessary time bounds also accept ordinary reachable states. This does not establish exhaustive history validation.

No commit, push or deployment was performed by this author. The parent author owns integration, full-project verification and the existing release workflow.
