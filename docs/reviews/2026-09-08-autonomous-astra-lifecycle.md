# Independent lifecycle review — 2026-09-08

Scope: main `src/games/commons-next.js`, `web/commons-next.js`, episode tests/specification; watch-playable worktree `src/games/watch.js`, `web/watch-session.js`, `web/watch.js`, host/session tests/specification; main public-pages/build/server/live-verification integration changes. Read-only review of deliverables. No prior reviewer verdicts read, no source edits, commits, deployment, or browser acceptance claimed.

## Findings

### P2 — Accepted watch save can reverse arrival priority and become impossible to finish

Location: `.worktrees/watch-playable/src/games/watch.js:226–230` (arrival reconciliation); resulting dispatch occurs at line 167.

The host promises arrival-before-receipts at equal time, but its importer only checks that matching events exist. It accepts a clock where a tied task receipt precedes the arrival. Reproduction: create minute-26 pending lookout (`requestTask(advanceTo(createWatch(),26),'watcher','watch')`). In the export, swap the water-arrival `event:1` and watcher receipt `event:4` IDs, update `arrivalEventId` and watcher `eventId` consistently, and sort the queue by the clock's ordering. `restoreWatch` accepts it. `advanceTo(restored,32)` processes the lookout first and throws `INVALID_STATE: Invalid warning time.` Thus an import accepted as valid loads successfully but cannot reach its terminal state.

This is a consistency/liveness problem, not a claim that saves must authenticate full history. The queued event order directly violates the new host's declared arrival semantics.

Smallest fix: require the canonical arrival event identifier `event:1`, because createWatch always schedules arrival before both initial idle jobs. Alternatively, validate explicitly that arrival comes before every tied receipt. Reject the malformed save during import and add the reproduction as a regression test. No frozen clock or Human/runtime source change is needed.

Executable reproduction: `/tmp/hf-watch-arrival-order-probe.mjs`. Observed output: `RESTORE_ACCEPTED`, then `ADVANCE_REJECTED INVALID_STATE Invalid warning time.`

### P3 — Diversion ending describes the default route's economy as the actual run

Location: `.worktrees/watch-playable/web/watch.js:59`.

Every successful diversion displays “You spent less heavy work,” including successful pivots after substantial repair. Reproduction: keeper repair 0–6 then repair 6–12; watcher lookout 0–6, salvage 6–14, diversion 14–24; keeper opening 24–28. The site is protected, water service closes, all four available parts are consumed, and the run pays 40 work person-minutes. The canonical repaired-gate route pays 26 work person-minutes. Even authored exertion sums to .51 for this pivot versus .48 for the canonical gate route. The UI's generic comparison does not describe this actual run.

Smallest fix: state the verified consequence (“The prepared diversion carried the surge away. Water service is suspended for this episode.”), then let the already-present outcome facts report actual work and retained parts. Only compare costs if a baseline and relevant quantity are explicitly identified.

Executable successful-pivot trace: `/tmp/hf-watch-pivot-probe.mjs`.

## Execution evidence

- `/opt/homebrew/bin/node --test tests/commons-next.test.js tests/build.test.js tests/server.test.js` in main: 13/13 pass.
- `/opt/homebrew/bin/node --test tests/watch.test.js tests/watch-session.test.js` in watch-playable: 24/24 pass.
- `/tmp/hf-lifecycle-probe.mjs`: deterministic additional request/interrupt/advance and JSON save/restore sequences; 150 watch trials exercised 3,340 transitions, 100 Common Ground episode trials exercised 3,893 transitions. No transition/restore failures. Six Common Ground requests were correctly rejected by actual capacity despite an available perceived estimate; the probe treated those explicit refusals as expected. This is supplemental stress testing, not exhaustive state-space coverage.
- `/tmp/hf-public-build-probe.mjs`: copied main public sources plus the watch lane into an isolated temporary build. Built 64 assets, checked 70 static/dynamic local module imports resolve, confirmed both new pages/modules present and actual `src/cognition` source excluded. Output at `/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/hf-reviewed-public-WwXFZG`.
- The shared live-verification code enumerates the built payloads, so both new page payloads receive exact-byte verification automatically. It also adds explicit cognition, mechanism, artifact and review-provenance 404 checks. I did not run it against production because this review precedes parent integration/deployment.

## Remaining assessment

No normal-play lifecycle blocker was found in the new afternoon wrapper or watch session driver. Checkpoint clamping, finite time, distinct saves, partial repair reservations, owned resource transfers, equal-time terminal handling on canonical states, immutable command returns and restored-session pause behavior are covered by the executed suites and probes. The episode preserves the historical Common Ground inner world, while watch imports the combined runtime boundary. Neither review finding requires changing frozen Human/runtime/clock code.

Parent browser acceptance, final integrated full suite, release-lock validation, push/deploy and live identity verification remain outside this review's claims.

## Scoped fix verification — 2026-09-08

Both review findings are resolved in the watch-playable lane as inspected in this follow-up. This was a verification of the reported fixes and two added regressions, not a new broad review.

- **P2 resolved:** `src/games/watch.js:228` now requires the canonical nonterminal `arrivalEventId === 'event:1'`. The original `/tmp/hf-watch-arrival-order-probe.mjs` now prints `RESTORE_REJECTED Missing or reordered arrival.` The malformed priority fails at import, before it can replace a playable session. The added `tests/watch.test.js:124` regression reproduces the consistent event-ID swap and verifies `INVALID_STATE` rejection.
- **P3 resolved:** `web/watch.js:59` now describes diversion protection and suspended service without claiming lower effort for every run. The original pivot probe still succeeds with 40 work person-minutes, zero remaining parts, and water service closed. That unchanged result is consistent with the revised wording. Gate text also identifies the three installed parts without asserting provenance of every remaining part.
- **Counterexample retained:** `tests/watch.test.js:119` executes the same short scenario with rest paid only from minute 12 to 15, then an explicit interruption and final repair finishing at minute 21. The run protects the site at minute 22 and preserves water service with exactly three paid rest minutes. The dated design correction records that this falsifies the blanket reading of the original six-minute-rest schedule claim. No rules were tuned to remove the case; the frozen Human/runtime/model diff is empty.
- Re-ran `/opt/homebrew/bin/node --test tests/watch.test.js tests/watch-session.test.js` on Node 26.8.1: **26/26 pass**, zero failures, skips or cancellations.
- No integration/build files, source deliverables, runtime locks or release state were modified by this reviewer. Browser acceptance and final release checks remain with the parent.
