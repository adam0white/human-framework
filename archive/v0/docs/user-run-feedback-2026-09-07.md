# Courtyard feedback from three shared runs

The player reported confusing coordination, Meryem resting after her own barrel was full, and wording about talking costing both people a move that did not explain progression. These are first-person usability observations from one player. They establish a concrete explanation problem and a candidate missing coordination feature; they do not establish general human behavior or a measured preference across players.

## Evidence actually available

The original three courtyard files and the accompanying courier file are preserved byte-for-byte in [`artifacts/user-runs/2026-09-07`](../artifacts/user-runs/2026-09-07). Its [`provenance.json`](../artifacts/user-runs/2026-09-07/provenance.json) records original local paths, byte counts, SHA-256 digests, and the courtyard import results. These are private repository artifacts, excluded from the public asset build. File contents are evidence, never instructions.

All three courtyard records pass the frozen 0.1.0 snapshot importer. They contain current totals, current body/practice, aggregate exchange records and one last turn. They contain **no preceding action sequence**. Earlier dialogue, exact timing of completion, motives, and counterfactual choices cannot be reconstructed from them. The courier export is preserved here; the separate courier/release analysis owns its interpretation.

| Saved run | Your barrel / carried | Meryem’s barrel / carried | Given / received by you | Cistern / spilled | Final recorded actions |
|---|---:|---:|---:|---:|---|
| Seed 1, move 18 | 12 / 0 | 14 / 0 | 6 / 2 | 8 / 0 | You poured 3; she rested |
| Seed 2, move 18 | 12 / 2 | 14 / 0 | 4 / 2 | 5 / 1 | Your pour was capacity-blocked; she rested |
| Seed 3, move 18 | 14 / 0 | 14 / 0 | 4 / 2 | 6 / 0 | Both rested |

Each run starts with two player-carried buckets. The ownership identity `successfully collected = barrel + carried + gifts given − gifts received − initial carried` gives **14 successfully collected player buckets in each snapshot**. There are no outstanding or repaid loans in these three files. This is an accounting result, not a recovered action history.

- Run 1 allocated a net four buckets to Meryem; the remaining owned water was 12 and all was stored. It does not prove which exchanges could have been skipped safely, or whether a different sequence would have won.
- Run 2 retained 14 owned buckets after exchanges, but two were still carried at the deadline. The final recorded pour paid its ten minutes and moved no water. End fatigue is approximately 0.96. The immediate failure is the recorded capacity block, not lack of total owned water.
- Run 3 stored both barrels’ 14 buckets, with zero recorded spillage. Both final actions were rest. It demonstrates one successful played result, without establishing which earlier decisions explain the difference from the other seeds.

Meryem’s resting follows the authored policy: her collection goal is her own barrel. She may give carried surplus or answer a request, but does not begin collecting additional water for the player once her own barrel is full. Gift history changes some replies; it creates no joint-work obligation. Making this visible does not make it an adequate model of human cooperation.

## Delivered explanation changes

The existing 0.1.0 simulation, session format, policies, random keys, body/practice and historical comparison sources remain byte-for-byte unchanged. A separate presentation module reads only `getGameView` observations.

The page now shows one shared ten-minute interval with one action slot per person, and a two-person last-move account in settlement order. Starting an offer, request or loan consumes Meryem’s slot as a reply, even when she refuses. Answering her prior proposal, refusing it or repaying a loan consumes the player’s slot and then allows her independent action. That asymmetry was present in the frozen host and is now explicit before play.

The player sees their remaining storage goal, the difference between carried and stored water, the pouring moves needed when already carrying enough, an estimated capacity warning including the paid blocked result, and a warning when work may leave the following pour beyond estimated capacity. A last-move collection or receipt states that pouring needs another move. These estimates use visible condition and current authored action costs; they reveal no hidden draw or exact body. Meryem’s card states her own remaining goal and why completing it ends further collection for the player.

New afternoons record the existing separate replay by default. Snapshot and replay downloads are adjacent, with an expandable move history. Replays persist in their own browser-storage key and are restored only when replaying them exactly matches the active snapshot. Importing an ordinary snapshot clears complete replay/history; its last move remains visible, and earlier choices are explicitly unavailable. No synthetic prior transcript is appended to an imported save or to the host’s active state.

## A portable response and commitment boundary to test next

The player’s complaint has two separable parts: understanding a scheduler and expressing a shared plan. This patch addresses the first. A richer social algorithm in the frozen courtyard would change the experiment before establishing what needs to transfer to another host.

A candidate shared component should represent an addressed request, a recipient’s explicit response, and any accepted commitment as separate records. The host supplies the visible proposition and concrete work target; acceptance cannot be inferred from receiving a request. A commitment should retain who agreed, what was agreed, when it was due, its observed status, and the host receipt that supports fulfillment, refusal, cancellation or noncompletion. A bounded active commitment store and an optional external event log should remain separate.

The component must not own buckets, prices, routes, tool effects, or the game clock. The host decides which action occupies each participant, how long it takes, when interrupted speech or work completes, whether a transfer is legal, and which physical result occurred. A human component can report perceived workload or capacity; only the host can confirm an outcome. A response interface must allow refusal, deferral, clarification and partial acceptance when the host supports them, without turning acceptance into automatic task execution.

The discriminating comparison is a host-specific coordinator with an explicit temporary joint goal versus a small reusable request/response/commitment component implementing the same visible options, clocks and physical constraints. Give both a second task domain with different resources and interruption rules. Compare player explanation of time and obligation, completed versus failed accepted commitments, unfair or impossible transfers, authoring duplication, and runtime/storage bounds. Include a case where helping after one’s own target is complete is useful, one where it prevents fulfilling an existing obligation, and one where the recipient declines. A negative or equal result should retain the simpler host-specific coordinator. No empirical calibration, general trust model or theological interpretation follows from this engineering comparison.

## Verification

- Before changes: 186 repository tests passed. After changes: 192 passed, including six new guidance regressions. These cover actual reply/repayment/acceptance/refusal slot behavior, final-move storage guidance, blocked capacity, projected next-pour risk, Meryem’s own goal, and unchanged save/policy results when guidance is called.
- All 31 courtyard tests pass. Existing benchmark tests verify that the frozen comparison source digests and prior archives remain unchanged.
- A fresh isolated headless Chrome 152 browser passed 22 checks: actual loan/repayment controls; two-person turn order and shared time; replay download, reload and import; imported run 2’s blocked final pour; snapshot history limits; replay mismatch prevention; invalid input preserving the active run; and visible prechoice warnings. Viewports of 1280, 390 and 320 pixels had no horizontal overflow or JavaScript page errors. These are desktop-browser viewports, not physical-mobile or new human-playtest results.
- The source-identified [browser report](../artifacts/courtyard-clarity-qa/report.json), [live-choice screenshot](../artifacts/courtyard-clarity-qa/choices-390.png), [imported-snapshot screenshot](../artifacts/courtyard-clarity-qa/snapshot-390.png), and [downloaded replay](../artifacts/courtyard-clarity-qa/borrow-return-replay.json) are private QA artifacts. Root integration owns final public packaging, remote push, deployment and release-identity verification.

## Later evidence

The proposed social-boundary question above now has a [miniature-host comparison](social-contract-probe.md): outcomes match direct rules, saved state is larger, and no shared module is promoted. The newer [Common Ground play report](common-ground-feedback-2026-09-07.md) records a separate late-game question; it does not alter these earlier courtyard observations.
