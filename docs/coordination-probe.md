# Attempt/clock coordination: retain direct wiring

2026-09-08. **Negative on the predeclared mechanical adoption gate.** A private stateless helper preserves both hosts' behavior and shortens each caller, but increases combined source by **510 UTF-8 bytes and 21 nonblank lines** after review hardening (original measurement: 335 bytes/20 lines). Keep both released hosts on direct wiring and leave this candidate outside the package and public asset allowlist. This experiment measures source and executable integration obligations, not human authoring effort.

The [protocol](coordination-probe-protocol.md) was committed as `07907e027acc5ce52666ac80024650c2fff1866c` before implementation/comparison outcomes. Implementation/evidence source is `5e2ea2d4292464d90c8289c268e7057b573a35fc`. The CLI verifies the protocol against that original full Git commit and verifies original host/runtime/model/release-lock bytes. Preserve both commits and [measurement-1.json](../artifacts/coordination-probe/measurement-1.json); later report commits do not change the measured source identity.

**Dated review follow-up:** Fable identified that a host extension field could replace a lifecycle identity. Current callers passed disjoint fields, but the helper now rejects reserved-name overlap before mutation, with a failing-then-passing regression for all five reserved fields. The original measurement above is retained. [Reviewed measurement 2](../artifacts/coordination-probe/measurement-2-reviewed.json), from source `09cdc80`, preserves every paired state/export, 2,754 steps, 10,000 events and 3,911-byte peak while adding the guard. The current helper is 2,875 bytes/45 nonblank lines; inclusive growth is **510 bytes/21 nonblank lines**. The same predeclared adoption gate still fails.

The size margin is small and the obligation criterion passed; this is a protocol-valid size-proxy result for two related hosts, not proof that the API is worse for every human or a third host. Signals uses a different single-person shape with additional report receipts, so its presence does not automatically establish reuse of this helper. A later third-shape experiment would need a new protocol and consumer. Source line totals follow the runner's line-count definition, including its handling of the final newline; they are not a semantic complexity measure.

## What was actually compared

The control hosts are the delivered [Before the Water](../src/games/watch.js) and the earlier [maintenance/watch package consumer](../examples/maintenance-watch/host.js). These are two actual hosts with different resource, time and terminal policies. Watch already derived lifecycle wiring from maintenance/watch, so this is a test across two related consumers, not independent evidence of general applicability.

Private adapted copies live in [Watch](../src/experiments/coordination/watch.js) and [maintenance](../src/experiments/coordination/maintenance.js). The [maintenance control copy](../src/experiments/coordination/maintenance-direct.js) changes only the package import to the same repository runtime; the runner verifies exact equality after that single substitution. This comparison is not a new external-package installation claim. The existing independent offline-installation test still runs in the full suite.

The [helper](../src/coordination/attempt-clock.js) borrows the existing host draft's `people`, `jobs` and `clock` slots. It pairs attempt start with event scheduling, constructs existing lifecycle job metadata, pairs interrupted finish with cancellation, checks receipt identity/time and completes the attempt, and advances people by clock elapsed time. It holds no persistent module/closure/snapshot state. The original actor body and original host job/clock remain the only authorities; temporary immutable calculation results are not retained.

The callers still own recipient decisions and refusal, parts/meal reservations and refunds, installed partial work, warning/diversion/arrival consequences, meal-consumed authorization, idle replacement, statistics/messages, cadence and complete save validation. The helper has no task-name branches, resource rules, callbacks or arrival policy. `completeJob` receives an explicit `mealConsumed` boolean from Watch; maintenance has no meal action. These are validated internal draft operations, not a new public untrusted-input API; callers must supply host-only extension fields and complete actor lists. Packaging would need a separate public contract and review.

## Predeclared obligations and exceptions

| Mechanical obligation | Direct Watch / maintenance | Adapted caller | Shared helper |
|---|---|---|---|
| Pair accepted attempt start with scheduled due event | Each authors it | `beginJob` call | One implementation |
| Copy attempt/event identity and timing to existing host job | Each authors it | Supplies only host extension fields | One implementation |
| Pair interrupted finish with due-event cancellation | Each authors it | `interruptJob` call, then host refunds | One implementation |
| Match complete due-receipt identity | Each has a receipt guard | Guard removed | One guard |
| Reject early completion | Each has a receipt guard | Guard removed | One guard |
| Reject late completion | Each has a receipt guard | Guard removed | One guard |
| Advance each body by clock elapsed interval | Each authors it | `advanceJobs` call, then paid world effects | One implementation |

All seven listed mechanical implementations move out of each caller; all three explicit receipt guards move into the helper. They have **not disappeared from the system**. Host lifecycle decisions, resource work and save reconciliation still remain, and callers now depend on five helper entry points including `dueRecord`. There are no new host-specific helper exceptions or callback protocols. The generic capacity guard already present in Watch also applies to maintenance starts; its valid accepted-task paths already pass that condition. Error-code parity is exercised for the declared histories, not every forged internal draft.

## Original measurement 1: inclusive source result

Whole-file UTF-8 sizes include comments, imports, world rules and validation. No minification or formatting change was made after measurement to cross a threshold.

| Scope | Bytes | Total lines | Nonblank lines |
|---|---:|---:|---:|
| Direct Watch | 23,603 | 241 | 239 |
| Adapted Watch caller | 22,390 | 230 | 228 |
| Adapted Watch plus entire helper | 25,090 | 274 | 272 |
| Direct maintenance | 17,400 | 241 | 239 |
| Adapted maintenance caller | 16,248 | 228 | 226 |
| Adapted maintenance plus entire helper | 18,948 | 272 | 270 |
| Both direct callers | **41,003** | **482** | **478** |
| Both adapted callers only | 38,638 | 458 | 454 |
| Shared helper, charged once | 2,700 | 44 | 44 |
| Both adapted callers plus shared helper | **41,338** | **502** | **498** |

The candidate reduces caller source by 2,365 bytes and 24 nonblank lines, then adds 2,700 bytes and 44 nonblank lines of helper. Both inclusive thresholds fail. The unchanged runtime/Human/clock/model dependencies add 27,045 bytes, 453 total lines and 427 nonblank lines to either aggregate: totals become 68,048 direct versus 68,383 candidate bytes. Comparison harness, tests, the import-normalized control copy and retained evidence are experimental apparatus, not production dependencies of either arm; their source hashes are disclosed where used. This result supports retaining direct wiring under this protocol. Source size is a limited mechanical proxy and does not establish which API a human author would prefer.

## Executable evidence and its limits

[The retained measurement](../artifacts/coordination-probe/measurement-1.json) records **14 fixed history pairs plus one bounded long-session pair**. All **2,754 paired command steps** compare full state and complete exported JSON after each command; serialized save bytes also match exactly. Fixed traces retain every command and resulting full-state hash. The long run retains a rolling history hash and independently hashed final states. JSON resume is exercised during paid actions and after arrival; both arms retain the same state schema and values throughout.

The fixed histories cover owned transfers/salvage, recipient refusal, busy/capacity refusal, reserved parts, partial repair/diversion and refunds/restart, interrupted/full/terminally canceled meals, early/forged/duplicate outcomes, forged save resources/timing, warning/open arrival ties, paid final repair at an arrival tie, solo absence and continued maintenance idle/rest. Only Watch provides owned meals and transferable parts; maintenance deliberately retains its smaller pooled-parts resource rules. The helper is tested directly for late receipts and explicit meal authorization as well.

Exactly **10,000 delivered clock events across both arms** stay within the predeclared limit: **106** in fixed comparisons and **9,894** in the maintenance post-arrival session. The latter mostly exercises idle lifecycle repetition; it does not turn the small number of discriminating resource/consent cases into 10,000 distinct gameplay challenges. Each measured advance is clamped at the next actual event boundary; the pre-call queue then gives the exact delivered-event count, including completion receipts superseded by first-scheduled arrival. The runner refuses an advance that would exceed the budget.

The `elapsedBoundaries` field records **5,276 host `advanceTo` calls across both arms**, not every internal clock tick: Watch's existing minute cadence can execute several internal ticks per call. Event/minute/irregular drivers are paired within the same driver; irregular requests are clamped at actual event boundaries for counting. Original full host regressions separately retain their large-step and cross-driver checks. The three maintenance driver final hashes can differ from each other because their original floating-point cadence differs; each direct/candidate pair is exact. No new cross-driver exactness claim is made.

Peak serialized active state is **3,911 bytes**, identically sized in both arms; the long session peaks at 2,196 bytes. Its final state SHA-256 is `771b8fb7ec9671db04df5bb2683fb5b5ef6e48730f4bdb671d4c78d5de8331b8` in both arms. The first complete measurement took approximately 1,045 ms on Node 26.8.1, macOS arm64, Apple M4. That is total harness execution including validation, cloning, assertions, hashing and Git/source inspection. It is neither isolated helper timing nor a speed comparison, and excludes rendering, UI, network, physical devices and human authoring.

## Verification and retained execution correction

- [Full suite](../artifacts/coordination-probe/full-tests-1.txt): **359 tests passed**, zero failures, Node 26.8.1.
- [Minimum-version focused suite](../artifacts/coordination-probe/node22-tests-1.txt): **12 tests passed**, zero failures, Node **22.0.0**. This includes the CLI measurement, exclusive-path/sentinel checks, helper and paired-host tests, and the original-host regression adapter.
- The regression adapter executes all **21 original Watch and 14 original maintenance tests** against adapted consumers, changing only imports; those 35 nested assertions are not added again to the 359/12 top-level counts.
- Behavioral tests failed against unimplemented helper functions before implementation, then passed using the real released runtime. The CLI initially failed because its entry point was absent, then reached the substantive fixture assertion described below. No original regression or frozen source was edited.
- The initial combined arrival-tie fixture reused the short scenario's three-minute rest but delayed final repair until minute 26. Both arms correctly refused it with `CAPACITY`: keeper fatigue was about 0.834 versus about 0.759 after six rest minutes. The final trace retains that failed delayed route as `watch-three-minute-rest-then-delay-refuses`. The successful paid-repair tie uses the preexisting six-minute-rest route; the short-notice immediate three-minute route remains successful. This corrects a test assumption, not runtime/world parameters or the frozen protocol.

Reproduce with fresh output paths:

```sh
PATH=/opt/homebrew/bin:$PATH npm test
PATH=/opt/homebrew/bin:$PATH node --test tests/coordination*.test.js
PATH=/opt/homebrew/bin:$PATH node scripts/coordination-probe.js /tmp/coordination-new.json
```

The CLI requires one explicit path and reserves it with exclusive creation before running. An existing artifact/sentinel is never overwritten; a failed run can leave only its own empty reservation. Public route/catalog/UI/package files, released hosts, Human/runtime/clock/model, release locks, original scripts and prior evidence remain unchanged. Parent integration must arrange fresh peer review; this lane makes no public deployment or package promotion.
