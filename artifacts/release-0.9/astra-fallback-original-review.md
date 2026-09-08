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
