# Requirement 2: two independently owned pumps

The current host optionally creates a south pump owned by `yard` and a north pump owned by `orchard`. Each owns a distinct gasket (`south-gasket`, `north-gasket`). `pumps.<key>` contains that pump's owner, work record, current accepted permission, completion time and gasket. The explicit schema is now `pump-yard-two-1`; no save migration was added.

```js
let state = yard.create({twoPumps: true});
state = yard.start(state, 'mara', 'south').state;
state = yard.advance(state, 2);
state = yard.start(state, 'tomas', 'north').state;
state = yard.advance(state, 40);
```

`start` and `offerHandover` accept a pump key as their final argument, defaulting to `south`. `stop` finds that person's current repair; it leaves the other pump untouched. The latest command result records its repair target. The same person cannot hold two repair assignments or a repair plus another duty. Actual repair Human attempts receive the selected pump's target ID.

H8 independently predicts south completion at `0 + 20 = 20`, and north at `2 + 18 = 20`. Both observed completions are 20. Mara pays 20 repair minutes/.20 effort, Tomas pays 18 repair minutes/.20 effort; every person has 40 actual minutes at the common endpoint. Each pump consumes its own installed gasket once after all people pay that minute. Aggregate repair effort is .40 because this history repairs two pumps.

The first unrestricted run passed 34 tests with only the permission check skipped. The restricted run passes **35 tests, zero failures, zero skips**, with filesystem reads confined to the canonical independent directory and no Node filesystem-write or child-process permission. There were no observed test failures in this stage. The preliminary candidate smoke run printed `20 20` and restored minute `40`.

H1–H7 still complete at 20, 15, 23, 15, 19, 20, 20. Their new minute checkpoints are compared with the archived gasket-stage evidence: raw Human people, paid ledgers, progress, timing, assignment state, tool/duty state and old resource facts are exactly unchanged. The expected explicit schema nesting, pump/gasket identities, owner fields and latest-decision target are accounted for in that comparison; they are not silently stripped from exported evidence. The direct work record now stores its item ID, while its contribution effort remains derived without rounding.

Added two-item checks cover one person refusing a second assignment without enrolling/crediting it, concurrent active JSON restoration at minute 3, stopping one repair while the other completes, item-targeted handover without altering the other installed gasket, and rejection of swapped work IDs, borrowed/swapped gaskets, changed owners, a third pump, premature consumption and duplicate assignments. Repeated settlement retains both outputs without awarding another one. The existing payment, capacity, skill, clock and malformed-host checks still run.

The source changes from the gasket stage are:

| Runtime source | Byte delta | Net line delta | Reason |
|---|---:|---:|---|
| `src/yard.js` | +2,327 | +27 | Per-pump ownership/work/consent/settlement, target controls, shared actor exclusivity and save reconciliation |
| `src/candidate-pump.js` | +3 | 0 | Pass the host-selected item ID to the unchanged candidate |
| `src/direct-pump.js` | +109 | +1 | Store, inspect and validate one of the two pump IDs |
| `src/shape.js` | 0 | 0 | Unchanged |
| Frozen kit | 0 | 0 | Unchanged |

Inclusive runtime totals become candidate **50,653 bytes/739 lines** and direct **46,198 bytes/693 lines**: extension deltas +2,330 bytes/+27 lines and +2,436 bytes/+28 lines, respectively. The shared host/Human dependency portion is 42,971 bytes/635 lines in both arms. Testing/oracle/recording support plus package metadata totals 31,638 bytes/437 lines, separately counted. Exact per-file hashes, validation spans, source/test diffs and stage-measurement support are retained in `changes.json` and `evidence-two-pumps/costs.json`.

Both arms reconcile each person's global paid repair ledger against the sum of that person's contributions across the separate pumps. Every item's reservation, status, completion time and contributor limits are validated separately. The direct arm's explicit pump ID is necessary identity state, not redundant effort state added to force bit equality. The bounded snapshot still cannot authenticate missing past schedules or prove external persistence. No validator was weakened to claim a smaller implementation; the new item checks and ownership checks are shared.

This requirement needed no change to `kit/candidate.js`, its API, Human source or package metadata. The modest adapter-versus-direct ID delta is observable, while most extension work remains shared host responsibility. It does not demonstrate human authoring-time savings or justify a promotion decision. Strict full-projection bit equality remains **unmet** only for candidate-accumulated versus direct-derived contribution effort; actual people/paid ledgers/progress/timing/resources match exactly. Raw values are preserved in the new comparison artifacts.

Full snapshots and actual commands are in `evidence-two-pumps/H1.json` through `H8.json`; there are 96 repeated driver/restore configurations over eight prescribed histories, not 96 independent samples. Maximum observed whole-host H8 snapshots are 2,999 bytes candidate and 2,743 bytes direct. Source/test copies and the final stage manifest live here. No unrelated correction, interface exception, external read, migration, UI, install, Git operation or deployment was performed.

Actual verification and evidence commands:

```sh
node --test --test-isolation=none --test-reporter=tap tests/repair.test.js > evidence-two-pumps/initial-test.tap 2>&1
node --permission --allow-fs-read=/private/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/hf-independent-repair-ajr5o5f_ --test --test-isolation=none --test-reporter=tap tests/repair.test.js > evidence-two-pumps/restricted-test.tap 2>&1
node --permission --allow-fs-read=/private/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/hf-independent-repair-ajr5o5f_ --allow-fs-write=/private/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/hf-independent-repair-ajr5o5f_ tests/record.mjs evidence-two-pumps > evidence-two-pumps/record-run.json
diff -ru stages/01-gasket/src src > evidence-two-pumps/source.diff
diff -ru stages/01-gasket/tests tests > evidence-two-pumps/tests.diff
```

The tests use the saved `evidence-gasket/H1.json`–`H7.json` as the regression reference; preserve that evidence directory when reproducing this stage. The Node stage-capture tool copies current source/tests, computes cost deltas, verifies all eight original kit hashes and freezes the separate stage/evidence files. No source-bound kit correction has yet been applied.
