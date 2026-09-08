# The last water

The courtyard is an independent small game at `/courtyard/`. Fill your household barrel with 14 buckets before 18 ten-minute moves pass. Meryem is filling a separate barrel. The suggested first-play duration is **4–7 minutes**, an estimate awaiting human playtesting.

The ordinary interface explains water, carried capacity, effort, time, gifts and loans. Hints, controllers, diagnostics and general model notes are collapsed. No exchange or task result is a moral, religious or divine-approval score. The project’s Islamic starting point, including the Sunni Hanafi–Maturidi interpretation work, does not supply this game’s engineering coefficients.

## What the host owns

| Fact or operation | Owner |
|---|---|
| Finite cistern, carried cans, household barrels, one meal per person | Courtyard host |
| 18 atomic turns, each paying 10 minutes for both people | Courtyard host |
| Gift consent, requests, three-move loan deadline, open proposals, current ownership | Courtyard host |
| Actual/perceived body, capacity, elapsed effort, recovery, collection practice | Unchanged public human component |
| Household outcome, source debit, spillage and transfer settlement | Courtyard host |
| Player and neighbor policies, structured speech | Courtyard host |
| Optional replay transcript | Separate session object |

The standard source contains 28 buckets; scarce and plentiful profiles contain 22 and 36. The player starts carrying two, Meryem four. Each person can carry six and pour three per move. Quick collection takes up to three, with a seeded chance of spilling one. Careful collection takes up to two without spilling. Water is conserved across the source, two people’s cans, two household barrels and recorded spillage.

Each move settles the player’s effects first. Meryem then observes those effects and chooses independently. A player-initiated offer/request consumes her turn as a response. Otherwise she can collect, pour, recover, eat, request two buckets or offer two. Her own proposal spends her current turn, can be answered on the next player move, and then expires. A transfer is never implied by a request. A declined or ignored proposal does not move water.

Gifts are separate from loans. Borrowing two creates an obligation to return two by the end of the third following move. Paying on that move is on time; leaving the loan unpaid at its end records lateness immediately. Returning it later clears the outstanding quantity but preserves the late-return fact. Recipient carry capacity still applies to repayment, and the UI states when Meryem needs room. Gift history can change her willingness to reciprocate; a recorded late loan can make her refuse another loan. A refusal by itself is a count, not a trust deduction.

## Public boundary and state

`src/games/courtyard.js` exports `createGame`, `getGameView`, `playTurn`, `chooseAction`, `chooseNeighborAction`, `chooseResponse`, `exportGame` and `importGame`. The host version is `0.1.0`; the shared human component remains `0.1.0`, and laboratory engine/replay versions are unchanged.

`getGameView` is a detached observation. It exposes visible stocks, household targets, felt condition, practice, exchange facts and authored opportunities. Policies receive this projection, with no seed, exact body or future draw. Meryem’s last-turn rule uses her own observable elapsed time because she decides after the player settles within the current turn. Player requests are explicit speech available to their recipient, not inferred private intentions.

Collection draws use stateless keys containing game seed, the `courtyard` domain, `collection` domain, actor identity and that actor’s completed collection count. The two actors do not consume a shared random stream; dialogue and UI add no draws. Actual body is used only to assess capacity and settle execution. A blocked lift pays ten minutes of maintenance, grants no water or practice, and does not silently become rest.

Active saves contain two bounded people, finite resources, aggregate exchange records, at most one proposal and one loan, and the last turn. There is no appended history. Imports validate exact schemas, versions, integer quantities, clocks, status, each person’s authored zero observation bias, water conservation, per-person ownership ledgers and necessary physical/social action budgets. These are consistency checks, not cryptographic authentication or proof of every preceding event. Turns are atomic, so save/resume occurs between moves. A replay is separately created by `createSession` and reconstructed by `replaySession`, with at most 18 action IDs. Replaying an earlier save with different recovery choices can change the success threshold and therefore the outcome against the same keyed collection draw.

**No edits were required to `src/human`, `src/core`, `src/scenarios`, the workshop, laboratory UI or historical engines.** This is another host using the same body/practice boundary; it does not establish portability of a complete human model. It adds no new human faculty.

## Comparison, including negative findings

Run `node scripts/courtyard-benchmark.js 50 101 artifacts/courtyard-benchmark.json`. The checked-in artifact records the final source SHA-256 values, all 900 runs, exact seeds 101–150, action sequences, final-state hashes, paired differences and all 324 runs where both barrels were not ready. This is an exploratory authored seed block, not a held-out evaluation or human sample.

All three player policies share collection and recovery rules. Self-sufficient refuses exchanges. Reciprocal accepts useful offers, respects a due loan and gives surplus. Generous also accepts requests before its own barrel is full. None of the automatic policies borrows; prescribed-choice tests cover loans separately. The memory ablation ignores past gifts and lateness in Meryem’s preferences while preserving current debts, consent, ownership and physics.

| Profile / player policy | Both ready, memory on | Both ready, memory off | Mean player water, on / off |
|---|---:|---:|---:|
| Standard / self-sufficient | 50 / 50 | 50 / 50 | 14 / 14 |
| Standard / reciprocal | 50 / 50 | 50 / 50 | 14 / 14 |
| Standard / generous | 0 / 50 | 0 / 50 | 12.88 / 12.86 |
| Scarce / self-sufficient | 44 / 50 | 44 / 50 | 13.88 / 13.88 |
| Scarce / reciprocal | 44 / 50 | 44 / 50 | 13.88 / 13.88 |
| Scarce / generous | 0 / 50 | 0 / 50 | 12.88 / 12.86 |

Plentiful results match standard. Meryem fills her barrel in every automatic row. In the scarce profile, even one spilled bucket makes two complete 14-bucket barrels impossible because total initial water is exactly 28. Extra water does not rescue the generous controller: it spends too many moves on exchanges. This is a consequence of this controller and deadline, not a claim about generosity in people.

Exchange memory provides **no completion benefit** in this block. Self-sufficient and reciprocal have exactly identical player action sequences with memory on/off for every seed. Generous sequences differ, but its mean partial player-water gain is only 0.02 buckets and every run still misses its own goal. The interaction mechanism supports observable consent and history-dependent replies; the benchmark does not establish that adding history improves the game or productive performance.

Two prescribed seed-1 routes are nonetheless feasible: offering a gift before collecting, and borrowing followed by pouring, collecting and returning the loan on time. Continuing either with the reciprocal controller finishes both barrels. These distinct routes test that social play can fit the deadline; they do not make every exchange beneficial.

## Independent review and retained prior evidence

A separate game author reviewed this lane and identified two actionable problems. Both were reproduced as failing tests and corrected:

1. Conserved total water did not guarantee a possible paid-action history or valid ownership. Imports now reject a one-turn save claiming six buckets poured, two opposite two-bucket gifts in one turn, and an unrecorded reassignment of carried water. Necessary per-person action and ownership bounds close these cases. An additional 18,000 randomized legal-turn save/restore sweep passed after the checks were added.
2. The player controller could collect instead of pouring available water on its final move. The same final-opportunity rule was checked and fixed for Meryem. A legal seed-34 player prefix now deposits two buckets, taking its barrel from 7 to 9. A legal seed-0 neighbor prefix now deposits two, taking hers from 6 to 8. Due repayment and the generous controller’s explicit choice to answer a request remain competing reasons.

`artifacts/courtyard-benchmark-before-final-pour.json` preserves the independent-review snapshot’s **900 prior rows and exact source texts with hashes**. It was regenerated from untouched frozen game/session/human/benchmark files and the unchanged baseline core model/random files. This private archive can be rehydrated as an ES-module temporary project to rerun its exported `compareCourtyardControllers` function.

Before versus after the corrections: completion outcomes are unchanged for all 900 rows; 324 negative cases remain. Partial player water improves in 261 rows. The generous means move from 12 to 12.88 with memory and from 12 to 12.86 without it. The prior result is retained rather than overwritten or presented as current.

## Verification and remaining limits

- Clean baseline: 105 existing tests passed at `d62f84d` before edits. The final lane run passes **130 tests** (105 existing plus 25 courtyard). Courtyard tests cover real consent/refusal, independent proposals, gift and loan routes, exact deadline boundaries, blocked exertion, single meal consumption, public projections, conservation, ownership, bounded state, malformed saves, save/resume and separate replay.
- Browser QA used a dedicated local harness and isolated Chromium context. Desktop 1365 px, mobile 390 px and narrow 320 px widths render without horizontal overflow. Hints and model notes begin collapsed. Borrow/return, gift/accept, final outcomes, save download, valid/invalid upload, replay upload and reload/resume were exercised without page errors. A new proposal brings keyboard focus to its reply controls.
- A declared 16 ms budget covers projection + policy + one host transition, excluding rendering and persistence. Final-source desktop-browser timing over 10,000 commands across 556 finite runs measured about **0.1 ms median/p95 and 3.0 ms maximum**. The largest active save in that workload was **1,431 UTF-8 bytes**. Browser timer precision limits interpretation of sub-millisecond values. This is desktop Chromium 152 with emulated narrow viewports, not a physical-phone timing claim.
- There is no first-person playtest, empirical calibration, qualified theological review or demonstrated benefit from exchange memory yet. Eighteen moves and the estimated play duration are design choices to test with people. The source shortage and repeated-refusal cases are intentional pressure, not evidence of a generally optimal policy.

Root integration owns the `/games/` link destination, `/courtyard/` route allowlist, public build, release identity and deployment. Only the allowed game assets should be published; the comparison archives and source research remain private.
