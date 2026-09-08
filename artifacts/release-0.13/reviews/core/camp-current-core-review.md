# Independent Camp 0.3.0 core review

Reviewed on 2026-09-08 in `/Users/abdul/code/human-framework`. No source edits, other agents, external model calls, prior reviewer conclusions, private player exports, old matrices, or historical-save requirements were used. This review accepts the explicitly weaker current-snapshot contract and optional loss of old saves.

## Source identity

The following SHA-256 identities were recorded before probing and checked unchanged after probing:

| File | SHA-256 |
| --- | --- |
| `docs/camp-current-contract.md` | `9e0a582c7772b7223543070dbcc4c7446d359417ba56bebff10f76c5950393fc` |
| `src/games/camp-current.js` | `cfa2db1f93b659a2d82d99c5644c03118a8095d03d9108867106f358d6b26616` |
| `tests/camp-current.test.js` | `f9e0a5d6e73693ee65228b508e59755da8aa3436eb8b5cee09cca7a55514dfdc` |

## Findings

### P2 — An accepted pending meal can lack its currently elapsed paid meal time and fail on completion

Location: `src/games/camp-current.js:420-422` and `:429`.

Create a fresh game, start `eat`, and advance three minutes. In its exported snapshot move the player's three `paid.meal` minutes to `paid.recovery`, and move the corresponding three aggregate `stats.mealMinutes` to `stats.restMinutes`. Leave the pending Human attempt, current body, event, and food reservation untouched. `restoreGame` accepts the snapshot even though its active meal says three elapsed minutes and that actor owns zero meal minutes. Advancing its remaining five minutes then throws `Inconsistent total paid time or effort`, because completion creates the eight-minute receipt while cumulative meal time is only five.

This is a present pending-state and progression-closure issue, not missing historical authentication. The saved meal already supplies the exact elapsed activity that contradicts its paid counter. Validate owned current pending meal minutes and include current pending meal elapsed time in the global completed-plus-pending minimum. The same completed-plus-pending distinction deserves attention in the other aggregate payment lower bounds.

Preserved counterexample: `/tmp/camp-current-first-meal-counterexample.json`. The first probe output includes both the unexpected restore acceptance and the resulting advancement failure.

### P2 — A completed exertive gathering receipt can claim zero total paid effort

Location: `src/games/camp-current.js:401` and `:429`.

Create a fresh game, complete one 16-minute `gather-timber`, export, and set only `game.paid.player.effort = 0`. `restoreGame` accepts this snapshot. It retains three produced timber, the complete trip receipt, all 16 gathering minutes and their owned practice, but neither person has any paid effort. The trip's authored action necessarily paid `.13` effort. Current validation supplies an effort upper bound and a construction-only lower bound; it omits necessary effort from completed timber/salvage receipts and active gathering elapsed fractions.

This is arithmetic consistency of retained receipts and owned totals, not a request to authenticate historical actions or body transitions. A global minimum can add `.13 * completedTimber + .17 * completedSalvage` and current pending exertive gathering fractions to the existing construction requirement, with appropriate per-actor current-pending checks. No journal is necessary.

Preserved counterexample: `/tmp/camp-current-first-effort-counterexample.json`.

## Verification and passing scope

- `node --test tests/camp-current.test.js`: all 18 tests pass at the pinned source.
- Independent handover sequence: player pays three construction minutes, hands to Meryem and back without time, releases the retained commitment, and completes the structure. Installed material, total time, original worker basis, and actor-owned practice remain correct; the actor who only held a zero-time assignment receives zero practice.
- Independent readiness probe: with an allowed inactive-body edit to player fatigue `.95`, gathering is blocked through recovery minute four and becomes feasible at minute five. `advanceToNextEvent` stops at minute five with `player-ready-for-work`.
- Independent lifecycle: Meryem alone earns all six structure stages through fresh ordinary requests, enters introduction at minute 373, pauses there, then pauses at the exact ferry and rain deadlines. Invalid early dispatch/return/finish and post-dispatch household allocation reject. Finish and return preserve the same people, stock and assignments; returned progression retains the frozen window and round-trips.

The initial readiness assertion mistakenly expected two minutes. That was a reviewer arithmetic error: timber needs `.13 + 16 * .0015 = .154` remaining fatigue capacity, and recovery subtracts `.0235` per minute. The earliest valid minute is five. The original failing assertion is preserved, and `/tmp/camp-current-core-readiness-corrected.mjs` independently verifies every minute zero through five. This is not a source defect.

Artifacts: `/tmp/camp-current-core-probes.mjs`, `/tmp/camp-current-core-first-probe-output.jsonl`, `/tmp/camp-current-core-probe-results.json`, `/tmp/camp-current-core-readiness-corrected-output.json`. First failures were not overwritten. This review did not test the UI, building/deployment, historical equivalence, unlimited command combinations, or all possible consistent snapshot edits.

No live lifecycle defect was observed in this small independent sample. Resolve the two current-accounting findings before claiming the stronger current paid-state assurance described in the contract. Arbitrary inactive body edits and descriptive activity notices remain intentionally unauthenticated and were not findings.
