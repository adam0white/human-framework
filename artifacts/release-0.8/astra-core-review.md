# Independent Service Day core review

Reviewed commit `94cb980c63520276c3cb9374b1c4c6b9f73d0d95` in `/Users/abdul/code/human-framework/.worktrees/service-day-core`, read-only. Scope: lifecycle, paid carryover, conserved ownership, partner consent and independent work, obligation/event ordering, bounded saves, deterministic replay and valid-state continuation. No other review verdicts were consulted. Repository worktree remains clean; no source edits, commits, pushes or deployments were made.

**Verdict:** the core mechanics and ordinary continuation checks are favorable, but fix the refusal-budget defect before integration. The second finding is a lower-priority public-trace contract gap. Neither finding creates extra parts, grants free recovery, changes the old controls, or prevents advancing to closing.

## Findings

### P2 — Alternating refused requests and refused cancellations exhaust the action budget

Source: `src/games/service.js:106-109` and `src/games/service.js:113-115`; contract: `docs/service-day-design.md:39`.

`taskRaw` replaces a rejected request only when the previous journal entry is another request. `stopRaw` replaces a rejected cancellation only when the previous entry is another cancellation for the same actor. Alternating these two rejected commands therefore adds every entry even though the world, time, owned resources and active job never change. At minute 24, Deniz's own pump task refuses both a new gate request (`BUSY`) and cancellation (`OWN_COMMITMENT`). After 125 pairs the journal has 251 entries and every new task, including a valid keeper rest request, throws `COMMAND_LIMIT`. All public choices are disabled by the budget. This contradicts the explicit repeated-refusal bound and denies subsequent player intervention without any paid action having occurred.

Reproduction:

```js
let s = advanceTo(createService(), 24);
for (let i = 0; i < 125; i++) {
  s = requestTask(s, 'partner', 'gate'); // BUSY, unchanged world
  s = interruptTask(s, 'partner');      // OWN_COMMITMENT, unchanged world
}
requestTask(s, 'keeper', 'rest');       // throws COMMAND_LIMIT
```

Observed: `commands.length === 251`, `remainingCommands === 0`, and `clock.now === 24`; people, parts and jobs match their pre-loop values exactly. `advanceTo(s,64)` still succeeds, so this is not a claim that valid saves cannot finish. The existing 10,000-refusal test only alternates two request task IDs, both of which use the same request compression branch. Compact consecutive no-effect refusals across both command kinds while preserving exact replay and the last visible response.

### P3 — Refusal explanations vanish from the public decision history

Source: `src/games/service.js:108-109` and `src/games/service.js:114-115`; contract: `docs/service-day-design.md:13`, public history shape at line 31.

Refused requests and refused cancellations update `lastResponse` but never call `note`. Immediately requesting another accepted action replaces the only visible refusal explanation, even when the bounded `recent` history is almost empty. For example, request partner `share` at minute 0, then keeper `rest`: the view contains only the opening world message and the accepted rest, with no partner refusal or reserve explanation. The design promises that Deniz's decisions and reasons enter the public record. Retain a bounded refusal entry, including cancellation refusal, or explicitly narrow that promise to the transient last-response surface. This is a trace/legibility issue rather than an ownership or consent bypass.

Any logging fix needs a replay test: recording extra refusal notes while continuing to replace journal entries can otherwise make an exported state disagree with replay. Deliberately coalescing the corresponding last refusal note is one option.

## Executable evidence

- Entire repository: `PATH=/opt/homebrew/bin:$PATH npm test` — **440 passed, 0 failed**, Node 26.8.1. Output: `/tmp/hf-service-core-full-test.log`.
- Targeted core: `PATH=/opt/homebrew/bin:$PATH node --test tests/service.test.js` — **19 passed, 0 failed**, Node 26.8.1.
- Minimum runtime: `/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/human-node22-review-xnBFhK/node-v22.0.0-darwin-arm64/bin/node --test tests/service.test.js` — **19 passed, 0 failed**, Node 22.0.0.
- Independent probes: `/tmp/hf-service-core-probes.mjs` — six probe groups passed, including **160 mixed histories and 9,443 JSON export/restore equality checks**. Those mixed histories also compared lumped advances against every-minute stepping. Largest observed save in that sample: **6,889 characters**, not a claimed global maximum.
- Reproducible findings: `PATH=/opt/homebrew/bin:$PATH node --test /tmp/hf-service-core-counterexamples.mjs` — **two expected assertion failures**, one per finding above.
- The three recorded SHA-256 source hashes in `artifacts/service-day-core/verification.json` match the actual service source, test source and design document.
- `git diff --exit-code ce968e8..HEAD -- src/human src/runtime src/core scripts/runtime-release-lock.json` returns 0. The full test suite also exercises the preserved games and runtime locks.

## Behavior independently checked

- Immediate interruption refunds a reserved gate part; one paid minute installs it once. A different actor can finish the paid partial section without consuming their own part or falsely taking installation ownership.
- Shed work interrupted after seven minutes returns availability and awards no part; a later full fetch awards exactly one. Concurrent target reservation prevents duplicate fetches.
- Requested partner recovery can be canceled; own-origin pump work refuses cancellation without changing body, job or ownership.
- A concrete late restoration succeeds while preserving the loss: partner fetches at 0, keeper starts gates at 20 and 26; gate supply returns at 32, Deniz pays both pump sections and their own recovery, full delivery arrives at 48, and morning protection/water remain false. Additional post-delivery recovery is also paid. Initial exploratory schedules that expected a later cart commitment to be cancelable did not succeed, consistent with the authored rule; they were not treated as defects.
- A completed cart delivery consumes the sole receiving slot and rejects another delivery. A currently reserved delivery also excludes a competing route.
- A high-command accepted-work sequence still permits both requested jobs to stop, JSON round-trip, every-minute advancement and closing. No valid-save continuation failure appeared in this scope.
- Existing tests directly cover exact morning diversion progress, closing-before-tied-cart completion, paid interrupted meals/rest, advisory rounded capacity, duplicate/early receipts, and malformed/forged saved states. Independent mixed histories add broad continuation coverage but are not exhaustive state-space proof.

Browser presentation, external comparator quality, human understanding/enjoyment, empirical/theological validity and deployment are outside this review.

## Scoped corrective recheck — 2026-09-08

Rechecked final core commit `0a48e9fb058b3c2011ac77d5c0267f6c908f7e90`. Its service source matches the integrated source at parent commit `69e12f9`. This is a focused recheck of the two findings above and the new legacy-save normalization, not a new broad review loop. The original findings remain above as dated evidence; **neither remains an open blocker in this checked revision**.

**P2 resolved.** `src/games/service.js:104-118` now recognizes a consecutive same-minute refusal across command types and recipients before applying the command-budget gate. The original `/tmp/hf-service-core-counterexamples.mjs` budget reproduction passes unchanged when selected by test name. The new cross-actor/cross-type and budget-boundary tests also pass; accepted work and refusals at earlier times remain in the replay.

**Legacy saves verified with original code.** `/tmp/hf-service-core-recheck.mjs` loads the exact old `94cb980` service source from Git, changing only its relative runtime import to the same frozen runtime's absolute location. It creates the real old 251-command save, confirms that old code refuses new keeper rest, and imports that JSON save using the corrected implementation. The journal becomes 2 commands; every saved world field matches exactly. Advancing the normalized state to 64 produces the exact old closing world, while requesting new keeper rest is now accepted and also reaches closing. The normalized state round-trips through JSON again.

**Normalization remains strict about state.** The correction at `src/games/service.js:160-165` normalizes only the replay journal for comparison. Fourteen independent altered-save cases were rejected: owned parts, body, reserved part, installed work, clock, receipt, response text, recent history, host version, runtime version, extra envelope field, extra world field, an effectful command edit, and fabricated outcome. Accepting an equivalent redundant command history is explicitly documented; this is not external authentication of a save.

**P3 resolved by contract clarification.** `docs/service-day-design.md:13` now explicitly says own choices and accepted work enter the bounded recent record, refusals appear only in `lastResponse`, and repeated same-minute refusals retain the latest response. The code retains that behavior. The previous durable-history counterexample is superseded by this clarified contract, not claimed to pass through a behavior change.

Fresh scoped results:

- Original P2 reproduction: **1 passed, 0 failed**, Node 26.8.1.
- Complete service test file: **23 passed, 0 failed**, Node 26.8.1.
- Four new corrective tests: **4 passed, 0 failed**, Node 22.0.0.
- Independent legacy/forgery probe: all checks passed, including **251 → 2 commands**, exact saved and closing world equality, new-work continuation, cross-recipient compression and **14 rejected corrupt saves**.
- Frozen Human/runtime/core/clock/release-lock diff from the original review commit remains empty; repository worktree remains clean. Service source equality against integrated parent `69e12f9` was independently checked with SHA-256.

No source edits, commits, pushes or deployment were performed. The full repository suite and comparison-binding artifacts were not rerun in this narrow recheck; the parent owns their final verification.
