# Independent shared-plan lifecycle review

Date: 2026-09-08. Reviewer: fresh delegated Astra lifecycle replacement after the external lifecycle process produced no verdict. Scope is the direct new host and its design, controlled against the original Service Day host and Human/runtime. No previous reviewer verdicts were read. No reserved comparison scripts were executed. This reviewer made no repository edits, commits, or deployment changes.

Original reviewed source: `src/games/service-plan.js` SHA-256 `fd65844c266aaaf50addb941c1f49a34ed5bef8780a2f2d4254b4d2a61f591f6` (core `09c8460`). Original Service Day, runtime index/clock, Human 0.1.1, model, and release-lock files have no diff against `2822179`.

## Verdict at original source

One actionable P2 lifecycle defect blocks the promised control-at-cap contract. Other inspected and executed lifecycle cases were favorable within the scope below. This is a bounded source/probe review, not formal proof, user validation, or evidence for a general planning faculty.

### P2 — journal thresholds disable necessary stop/withdraw controls while admitting no-effect refusals

Original locations: `src/games/service-plan.js:208` (discussion stop threshold), `:214` (withdraw threshold), `:226` (public control availability), `:140` (physical stop threshold); underlying accounting is at `:120-126` and `:143-151`.

A reachable saved state at minute 38 has an unfinished two-person discussion, 253 journal entries, and three unused entries. Both the public `canInterrupt` flag and `interruptDiscussion` refuse stopping. Advancing forces the second paid active minute and accepts terms at 39. The design promises that either actor may stop discussion and that cap room preserves interruption/withdrawal/closing. The problem is not inability to close the day: closing still works and deterministic replay matches. It is the loss of a promised user control before the journal is full.

Exact sequence: execute the ordinary prefix to minute 37; pad reversible zero-minute keeper rest/start-stop commands to journal length 249; propose `{pumpStartAt:39,readyBy:45,waitUntil:45,fallback:'cart'}` to length 250; request keeper rest while discussing (physical refusal, 251); withdraw without any accepted predecessor (plan refusal, 252); advance one minute (253); attempt to stop discussion. The result is `COMMAND_LIMIT` and `canInterrupt:false`; forcing closure yields four total discussion person-minutes and terms accepted at39.

Two related counterexamples establish the reserve-accounting scope:

- From that minute38/count253 state, another new no-active-plan withdrawal refusal is still admitted to254, while interruption is denied. Advancing to39 yields accepted terms at count255, and legitimate withdrawal is then denied. A no-effect refusal consumes room reserved for a needed control. A new physical refusal at count253 is already blocked.
- Start with a valid initial-time journal of249; request keeper rest (250), partner rest (251), no-active withdrawal refusal (252), stop keeper (253), advance to1 (254). Stopping the still-requested partner rest now throws `COMMAND_LIMIT`, despite two free journal entries being sufficient for that stop and closing.

The fix should reserve actual necessary termination controls plus a final advance, and keep no-effect refusals from consuming that reserve. Simply raising one threshold is insufficient if a later refusal or interleaved advance can consume another required stop/withdraw slot. Regression tests should cover both requested jobs and an accepted predecessor/pending revision, including commands after moving to a new minute.

Original evidence, kept outside the repository:

- `/tmp/hf-plans-fallback-probe.mjs`, `/tmp/hf-plans-fallback-probe.json`, `/tmp/hf-plans-fallback-probe-node22.txt`.
- Exact failing save: `/tmp/hf-plans-fallback-cap-save.json`.
- `/tmp/hf-plans-fallback-stop-cap.mjs`, `/tmp/hf-plans-fallback-stop-cap.json`.
- `/tmp/hf-plans-fallback-cap-tree.mjs`, `/tmp/hf-plans-fallback-cap-tree.json`.

## Executed favorable checks at original source

`node --test tests/service-plan.test.js tests/service-plan-session.test.js tests/service.test.js tests/runtime-clock.test.js` passes 80/80 on Node26.8.1 and Node22.0.0. Full outputs are `/tmp/hf-plans-fallback-tests-node26.txt` and `/tmp/hf-plans-fallback-tests-node22.txt`. These tests cover paid listening versus acceptance, actual readiness versus clinic arrival, useful/refused/interrupted/late revisions, busy/late deadlines, fallback and closure ties, deterministic save continuation, mixed-command days, permanent slots, hostile JSON and cross-channel refusal coalescing. Passing existing tests did not expose the cap counterexample above.

Independent compact probes in `/tmp/hf-plans-fallback-extra.mjs` passed on both versions, with outputs `/tmp/hf-plans-fallback-extra.json` and `/tmp/hf-plans-fallback-extra-node22.txt`:

- Withdrawal during a one-minute pending revision retains six total discussion person-minutes, withdraws the active predecessor, clears pending work, and allows the independent cart departure42/arrival60.
- Starting and stopping a requested cart in the same minute grants no time, body recovery, or practice; the receiving slot remains permanently abandoned and the day delivers zero units.
- Injected accept/refuse fields, reversed response participants, and forged response time are rejected as stale. They cannot bypass paid discussion.
- A partly installed pump section can be completed without another uninstalled part: work remains physically conserved, installed ownership reconciles, and full delivery arrives44. Agreement ownership does not manufacture a new part.
- Readiness fulfilled45 survives attempted withdrawal while the recipient finishes requested recovery through50. Full arrival56 is separately recorded.
- Six altered saves covering factual timestamps, command times/history, ownership, slot status and paid accounting are rejected. Legitimate continuations restore exactly.

The first exploratory zero-minute abandonment probe attempted keeper cart at30 and encountered the expected actual-fatigue refusal; it was corrected to the feasible idle partner cart request. No implementation defect was inferred from that refused action.

## Remaining boundaries

Terms depend on declared future rest, and execution correctly uses actual carried bodies. Accepted promises reserve neither ownership nor compelled work. Supply is a monotone precondition in this host, so there is no untested changing-supply mechanism claimed. The original host remains a control with explicitly different departure-window/slot policies. No reserved experiment outcomes, production browser behavior, broad UI quality, or theorem of complete replay validation is included in this verdict.

A separate revised-source recheck is pending the core author's cap fix; do not treat this original-source verdict as a pass.

## Revised-source independent recheck — 2026-09-08

**Scoped favorable verdict: the original P2 is resolved in reviewed main `f251109` (core correction `4de8965`), `src/games/service-plan.js` SHA-256 `b3c4eb2407856b255d3f7a23b69983e217c26a6ee313d6715c444525df1bccb7`. No other blocker was found in this bounded lifecycle review.** The original failed-source evidence above is retained unchanged; this section supersedes its pending/failing release disposition only for the corrected source.

The correction charges journal admission against the remaining unilateral controls and their possible intervening elapsed-time segments, crediting the existing trailing advance when further time coalesces into it. Checks happen on the command's copied result, so a newly rejected refusal/advance does not modify the caller's original state. Necessary discussion interruption, requested-work stop and active-promise withdrawal use that resulting-state reserve instead of premature fixed thresholds. The original Service Day and frozen runtime/model remain unchanged.

Independently executed `/tmp/hf-plans-fallback-recheck.mjs` on Node26.8.1 and minimum Node22.0.0. Separate revised outputs are `/tmp/hf-plans-fallback-recheck-node26.json` and `/tmp/hf-plans-fallback-recheck-node22.json`, each binding the reviewed source hash. Both report:

- The exact original minute38/count253 discussion state permits interruption, ending discussion with two total paid person-minutes. Stop is entry254, closure entry255; no forced term acceptance occurs.
- The original failing saved JSON imports without rewriting its world state.
- A new no-effect withdrawal after the partial advance is rejected atomically where accepting it would consume reserve. The unchanged state can either stop discussion and close, or complete discussion, withdraw the newly accepted contribution, and close.
- With two requested jobs near the cap, the unsafe no-active withdrawal is rejected before consuming needed room. Keeper can stop at1, partner at2, with exactly two partner rest minutes retained; stop is entry255 and closure entry256.
- An active promise plus two requested jobs permits the independent order partner-stop40, withdrawal41, keeper-stop42, separated by real time advances. It closes at exactly256 entries with the promise withdrawn and paid time retained. This reverses the author's keeper-first stopping order.
- Fourteen reachable successor paths around the preserved partial-discussion state were checked through three levels of physical refusals, plan refusals, elapsed time and interruption. Every accepted state round-tripped exactly; required controls remained available, and closing succeeded. Rejected commands returned the expected bounded-command/no-current-discussion errors.

The revised targeted suite `tests/service-plan.test.js tests/service-plan-session.test.js tests/service.test.js tests/runtime-clock.test.js` passes **84/84 on both Node26 and Node22**. Outputs: `/tmp/hf-plans-fallback-revised-tests-node26.txt` and `/tmp/hf-plans-fallback-revised-tests-node22.txt`. This recheck ran no reserved comparison scripts and made no repository edits or delivery changes.

The favorable verdict is limited to the reviewed authored lifecycle and correction. Existing open boundaries in the original report—reserved comparison, production/browser delivery, human usefulness, and general planning claims—remain outside this review.
