# Longer solo shift: human and host boundary review

Date: 2026-09-07. Reviewed source: `b3dcad6459b47bb8cf124beab62685c97c55175b`.
Scope: contract recommendation before runtime implementation, based on the current public human component, workshop host, laboratory replay facade, build and tests.

## Recommendation

Implement a separate `src/games/shift.js` host and `/shift/` page. Keep the laboratory, frozen legacy kernels, `src/human/index.js` (`0.1.0`) and existing workshop host (`workshop-0.1.0`) unchanged. The longer game needs no new shared-human fields or behavior. Give its own host/save contract a new version such as `shift-0.1.0` and its own device storage key. Continue to offer the old routes and importers; do not silently reinterpret a workshop or laboratory save as a shift.

The human boundary already accepts a target identity, authored duration and effort, one known practice skill, recovery activity and a host-confirmed terminal outcome. It retains practice and costs across attempts and saves a pending interval. Use one person for the entire shift. Body and skill must never be reset when changing pumps. The host supplies the additional objects, different repair opportunities, resource competition, score and deadline.

This demonstrates reuse of body/practice, not portability of the laboratory Full controller or evidence for a general model of expertise. Different pumps sharing `repair` explicitly share that authored practice domain. If a pump uses a separate skill, initialize it in `createPerson`; the component does not provide cross-skill transfer or automatic skill registration.

## Minimum host contract

Keep the workshop's pure-call shape so rendering and a host-native controller share the same opportunities:

| Call | Contract |
|---|---|
| `createGame({seed, policy})` | Fixed, finite authored shift definition; one initial person and one world. Policy affects choices, never world setup or draws. |
| `getGameView(game)` / `getActions(game)` | Detached accessible facts, perceived condition, current opportunities and consequences. Hide the seed, unobserved condition and draw counters/values. |
| `startAction(game, actionId)` | Resolve an available, unique opportunity token to a fixed target and complete human action specification. Begin one host/human attempt without time or inventory effects. |
| `advanceTime(game, minutes)` | Charge elapsed time once, capped at the pending action and absolute deadline. Resolve only when the corresponding boundary is reached. |
| `finishAction(game)` | Advance the remaining interval. Host derives success; callers cannot provide outcome, points or parts. |
| `interruptAction(game, reason)` | Allowed work keeps paid costs and practice but commits no unfinished target, travel, inspection or inventory effect. Bound reason length. |
| `exportGame(game)` / `importGame(record)` | Bounded active snapshot including the human envelope and at most one bound pending opportunity. Exact new host version only. |
| `chooseAction(view, policy)` | Return one available opportunity ID using only the detached view. |
| `applyCommand(game, command)` | Strictly validate `start`, `advance`, `finish`, `interrupt` command keys. |
| `replaySession({version, seed, policy, commands})` | Rebuild the same host version from its seed and a separately bounded command log. |

An opportunity ID can be `replace-east`, with `targetId: 'pump-east'`; another can be `replace-river`, targeting a different pump with different duration, effort, difficulty and part. Passing only this resolved ID to `startAction` avoids conflicting target/part parameters in commands. Human `actionId` and `targetId` allow letters, digits, hyphens and underscores, start with a letter, and are at most 80 characters. Keep labels and descriptive prose in host definitions.

The host can retain a small authored definition table rather than storing definitions in each save. A useful minimum active state is:

```js
{
  version, seed, policy, clock, deadline, status, location,
  person, // created/advanced/finished/restored only through src/human
  inventory: { wrench: true, parts: { seal: 0, belt: 0 } },
  stock: { parts: { seal: 1, belt: 1 }, meals: 2 },
  pumps: {
    east: {
      status: 'broken', route: null, condition, inspection: null,
      completedRepairs: { patch: 0, replace: 0 },
      verifiedAt: null
    }
    // Fixed set of other named, genuinely different pumps.
  },
  pending: null, // or {actionId, targetId, attemptId, durationMinutes}
  lastEvent // one bounded explanation, no accumulating transcript
}
```

The exact identifiers and quantities above are illustrative; the implementation must author them once and validate saves against that definition. Vary repair requirements and useful outcomes, not just pump labels. Fixed part types and pump count keep state bounded. Derive score from verified pumps and immutable host values rather than storing an independently mutable score counter. If a tally is retained for presentation, validate it against that derivation.

## Time, interruption and inventory invariants

For one shift created with a new person, maintain `game.clock === game.person.minutes`. Each advance applies the same elapsed delta to both exactly once. Never change the host clock alone during travel, meals, rest or waiting. Use a human attempt even for non-exertive host time. If a later design imports a previously experienced person into a new shift, it needs an explicit host start offset; do not reset the person's cumulative minutes to make relative shift time match.

Human capacity is assessed at `beginAttempt` against the full authored action duration. Allowed active effort and practice are prorated by actual elapsed minutes. The human duration limit is 0.01–1440 minutes per attempt; a modest multi-hour shift needs no change. The workshop's two-minute blocked interval can be reused as a host rule: blocked attempts earn no practice, recovery or meal, and an interrupt finishes their remaining penalty. Keep this duration no greater than any exertive action's declared duration. Its planning benefit remains unproven.

Completion at exactly the deadline is allowed if the full interval has elapsed. An unfinished attempt at the deadline is interrupted, its pending state is cleared, and no late inventory, inspection or verification effect occurs. Terminal states have no opportunities. Floating-point tests must distinguish exact completion from an action genuinely short of its boundary; do not use a broad epsilon to grant early effects.

Prerequisites bind at action start and must still be consistent during import and settlement. A pending action cannot change pumps, routes, tools or parts. Since this is solo and one action runs at a time, no reservation subsystem is needed. An explicitly authored external interruption must go through `interruptAction` rather than silently changing prerequisites underneath an active attempt.

Track part counts as non-negative bounded integers per type and location. Completing retrieval moves one part from storage to inventory. Successful installation consumes the required carried part exactly once; failed fittings and interrupted work preserve it under this proposed first rule. Installed parts can be derived from each pump's route. Enforce conservation across stock, inventory and installed parts. Wrench ownership is reusable. A completed accessible meal atomically decrements one ration and gives `mealConsumed: true`; an interrupted meal changes neither stock nor hunger relief.

## Seeds and score without farming

The existing workshop keys repair draws by the person's global `attemptId`. Therefore a zero-minute start/interrupt can change a later repair draw without changing time, body or practice. Preserve existing workshop semantics for compatibility, but do not copy that coupling into the new host.

Generate hidden conditions with `(seed, 'condition', pumpId)`. Generate repair draws with `(seed, 'repair', pumpId, route, completedRepairOrdinal)`. Increment a target/route ordinal only when a fully paid repair resolves success or failure. Never increment it for observation, rendering, controller hints, save/export, blocked exertion or interrupted work. Initialize every fixed counter to zero and validate it. This removes global action-counter rerolls and isolates one pump's random stream from work on another pump. Outcomes may still legitimately differ when prior work changes shared fatigue, hunger or repair skill.

Switching to a different route has a separate authored draw stream and different paid consequences; that is a choice. Repeatedly paying for a failed repair gets a new trial. Reloading the same pending save and executing the same commands gives the same outcome. Neither a local seed nor a locally editable snapshot provides tamper-proof competition; save validation checks coherent state, not the historical truth of every non-pending body/skill value.

Award objective value once when a repaired pump completes verification. Remove repair and verification opportunities once that pump is running. Require a repair before verification; inspection, practice, failures, interruptions and repeated retrieval award zero objective value. A fixed pump set puts a hard ceiling on score. Paid partial practice remains part of the human contract, so time spent training is possible; avoid attaching a second reward to attempts or skill gain. Extra practice consumes the same scarce shift time and bodily resources as work.

## Save, replay and public delivery risks

1. **Pending mismatch:** import must restore the human envelope, derive the expected human action from the host opportunity and compare all fields, target, attempt ID, original duration and effective blocked duration. Reject a pending action whose prerequisites no longer hold or whose host/human clocks differ.
2. **Impossible objects:** reject unknown pump/part IDs, invalid counts, unsupported routes, observations inconsistent with the hidden condition, repaired pumps without a completed repair counter, installed parts without the matching route, verification before repair, and terminal status inconsistent with time/world state. Apply necessary minimum-time bounds for committed effects, while describing them as bounds rather than proof of full history.
3. **Unbounded saves:** prohibit command/history arrays in active state. Bound strings, identifiers, counters and input-file bytes; keep full replay recording optional and separate. Importing a partial save starts a continuation, not an invented whole-session replay.
4. **Version collision:** retain `/`, `/workshop/`, the existing laboratory engines and `human-workshop-v0.1`. New shift HTML needs an explicit `shift/index.html -> web/shift.html` mapping in `scripts/build.js`. JS/CSS directly under already allowlisted `web` and `src/games` are copied; nested asset directories are not automatically copied. Never put private review material in a public asset directory.
5. **Release identity:** `release.json.engineVersion` currently identifies only laboratory `0.3.0`. It must remain unchanged if laboratory physics are unchanged. An additive human/host version map could make delivered versions easier to inspect, but commit plus asset digest already identify the payload. Preserve build privacy/symlink tests and the clean-main, pushed-commit deployment check.

## Regression gates

- Existing human, workshop, legacy replay and build tests continue to pass without edits to their runtime behavior or version strings. Preserve both old save/replay entry points in browser QA.
- Show at least two targeted repairs with different requirements and consequences using the same person. Confirm the second action starts with the first action's resulting skill/body, including a failed or interrupted first repair.
- Pending saves resume identically for travel, part retrieval, repair, rest, meal and verification. Duplicate settlement and a changed target/part/attempt ID cannot give duplicate effects.
- Verify single large advances and split advances give equivalent elapsed body/practice and the same settlement; test just-before, exact and beyond-deadline boundaries.
- Demonstrate correct part-type prerequisite, conservation, no consumption on interrupted work, one consumption on installation and one score award on verification.
- Demonstrate zero-time unrelated interruptions, view/export calls and diagnostic recording do not change a target's next draw. Separate comparisons of random-stream stability from outcomes affected by changed body/skill.
- Run 10,000 command events with replay recording off and compare save size; fixed counter digit growth and the latest message may add bounded bytes, but no transcript or growing collection may appear.
- Sweep several seeds and at least two plausible routes through the longer shift. Report completion, verified value, failed repairs, meals, rests and elapsed time without selecting only successful runs. The shift should actually exercise recovery and experience; extra pumps alone do not establish that benefit.

Baseline verification on the reviewed source: `node --test tests/human.test.js tests/workshop-game.test.js tests/legacy.test.js tests/build.test.js` passed all 26 tests. No runtime file was changed for this review.

Reviewed runtime SHA-256 identities:

```text
src/human/index.js     0f6d30cf2b5e07f5e18dc791fecd691b9004f290e138abeab7336b1c2e2ee308
src/games/workshop.js  b2ee4cb10fddf57455c0321e42da1d256b87a7a96225d92ff1940f45ed8f6f06
src/core/model.js      1bf30267083e8e2617fe9964d4654d8da158cba309909ace7bb50c1e6de29c59
```
