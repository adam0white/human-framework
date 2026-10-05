All findings below come from reading source only. I executed nothing, and the snapshot contains no tests, HTML, scripts or artifacts, so reported test counts, byte measurements and study outputs are unverified here.

## Last Light host and session

**Hidden-state boundary holds.** `getSignalsView` and `nextVisibleEvent` (`src/games/signals.js:130-137`) expose neither `landing`, `situation`, the clock queue, nor in-flight reply values; in-flight entries are projected to arrival minute only. Landing changes are applied silently in `advanceRaw` (`signals.js:122`) with no journal note, and refusal strings in `reason` (`:95-102`) never mention the landing. The web renderer reads only the view (`web/signals.js:15-33`).

**Timestamps, receipts and ties are consistent.** `initial` schedules closing as event 1, launch as event 2, landing changes next, and every attempt later (`signals.js:53-55`). Because the clock orders same-minute events by ID, the keeper's minute-4 radio observation and a minute-20 canal arrival both see the post-change landing, a minute-32 arrival is refused, and a minute-12 arrival misses the launch (`:69`). `retainReport` (`:61`) keeps the newest observation and the delivery strip keeps late replies, as designed. Early terminal cancels the launch event, so no sail is claimed after outcome (`:68`).

**Replay coalescing is idempotent.** I traced accepted, refused, stop and advance interleavings through `record` and `taskRaw` (`:103-116`). The deduplication only replaces a logged task when the previous response was refused at the same minute, and that previous logged task is necessarily the one that set `lastResponse`, so replay reproduces `lastResponse` and the log exactly. `advanceRaw` steps one minute at a time and stops at closing, so a hostile `to` of one million costs at most 32 steps.

**Concrete defects, with minimal fixes:**

- **Uncoded crash on a null receipt.** `receiveReceipt` (`signals.js:129`) accepts any JSON value, and `due` reads `event.type` (`:73`), so a null or primitive event throws a TypeError rather than a coded refusal. Fix: reject non-object events before `due`.
- **Perceived versus actual capacity in choices.** `getSignalsView` calls `reason` with the rounded view body (`:136`) while `requestTask` uses the actual body (`:112`), and the UI disables buttons on that flag. With the authored constants, projected fatigue never approaches the ceiling, so this is unreachable today. Fix: pass the actual body, or label the view flag as a forecast.
- **Cosmetic session messages.** The "Wait for reply" label (`web/signals.js:22`) can point at the minute-12 launch boundary instead of the reply. The "A report arrived" reason (`web/signals-session.js:11,19`) triggers on any sequence increase, including lookout and failed-canal observations whose time is not older than delivery.
- **Wrong error code for bad setup.** Extra keys to `createSignals` fail through `fields` with `INVALID_SAVE` (`signals.js:58`) rather than `INVALID_COMMAND`.

**Open questions:**

- `check` (`:30-36`) validates only envelope, person and clock. Integrity rests entirely on replay equality in `restoreSignals` (`:149`). Hand-built states with a null job and null outcome would throw TypeErrors. Acceptable while the web enters only through restore, but the contract is much weaker than Watch's validator.
- Situation keys `turning`, `falling`, `steady`, `shut` (`:4,14`) describe the hidden schedule and appear in every save and in local storage. If the situation select uses them as option values, the DOM reveals the shape behind "Harbor I". The design accepts save disclosure, but the HTML is not supplied.
- Requesting the canal and stopping at zero elapsed minutes burns a fare (`:45,49`). The stop note discloses it; the design text implies it but never states it.

## Play notes, memory candidate and coordination helper

**Play notes are not integrated.** `web/signals.js` never imports `web/play-note.js`, so the Last Light context projection and pause-on-open wiring cannot be reviewed. `createPlayNote` (`play-note.js:14-30`) validates shape and bounds well, exports no identity, score or grade, and the timestamp is canonical ISO. But the summary is up to eight free strings (`:22-23`), so the "allowlisted public summary" guarantee lives entirely in the unwritten host projection. Trivial: the validated title is exported untrimmed (`:19`).

**Memory candidate interface mismatch.** `observation-memory.js` requires exactly seven report keys (`:5,24-32`); host reports carry `deliveredAt` (`signals.js:63`), so the experiment harness must strip it. The candidate also overwrites a same-cue entry regardless of observation time (`observation-memory.js:76-77`). That is the stale-overwrite the design says it measures, not a bug, but the harness is absent from the snapshot.

**Coordination helper matches its report.** `attempt-clock.js` holds no module or closure state, computes all runtime results before assigning to the borrowed slots, and so is failure-atomic on the draft (`:14-44`). Adapted Watch and maintenance reproduce the direct hosts' effect order; the meal boolean is decided by the host before the helper runs (`experiments/coordination/watch.js:78`), and the added capacity guard on maintenance starts is unreachable on valid paths, as the report states. One ownership hazard: `beginJob` spreads host fields after the lifecycle identity (`attempt-clock.js:20`), so a caller could silently override `eventId` or `attemptId`. Fix: spread host fields first or reject overlapping keys. Both current callers pass disjoint keys. Each of the four measured files has one more line in this snapshot than the report's table (`docs/coordination-probe.md:37-42`), a consistent offset that does not change the negative result's direction; bytes and test counts are unverifiable here.

## Body-isolation adapters

The adapter pair (`experiments/body-isolation/adapters.js:4-22`) is consistent with the protocol's mapping. I checked the coefficient algebra: maintenance drain of 1/600, rest 1/60, meal 11/60, effort weight 2/3 and load 2.4(1-S) follow from the fatigue and hunger parameters, and the pooled meal receipt preserves paid maintenance before relief as Human does (`pooled-model.js:70`, `human/v0.1.1.js:171`). Host forecasts are recomputed from stored baselines with strict equality (`host.js:36-37`), which is sound because baselines round-trip through JSON exactly. The blocked, resource and meal statuses map to identical runtime outcomes in both models. Unverifiable: the numeric tables, and the imported frozen `scheduleFor` and `compareRuns` whose "small" label is renamed to "pooled" (`experiment.js:9`).

## Strongest counterargument

Everything above is hand-traced. The replay-equality gate is the single integrity mechanism for saves, and its soundness rests on an invariant nobody asserts in code: the last logged task command is the one that produced the current refused response. Any later edit that lets `stopRaw` or a receipt path touch `lastResponse` would silently invalidate every stored save, and no supplied test pins this. Likewise, the perceived-versus-actual capacity split is harmless only because of today's constants. A reviewer who could run the suite might find the reported coverage already guards these; I could not.

**Conclusion:** favorable on correctness and information boundaries for the host, session and helper. The four concrete fixes are small. The play-note integration for Last Light and the private experiment harness are the two pieces that must still be reviewed once they exist.
