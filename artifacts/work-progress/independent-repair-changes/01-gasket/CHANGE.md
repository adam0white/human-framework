# Requirement 1: owned seal replaced by owned gasket

The runtime change is confined to `src/yard.js`: the owned material field becomes `gasket`, corresponding inventory/restore checks use that name, and the explicit schema becomes `pump-yard-gasket-1`. No saved-state migration was added. The candidate adapter, direct pump rules, Human package and frozen candidate source are byte-for-byte unchanged.

The source diff has 9 removed and 9 added lines, +38 bytes and no net physical lines. Both inclusive arms therefore gain the same 38 bytes: candidate 48,323 bytes/712 lines, direct 43,762 bytes/665 lines. The two test files also change to follow the field name, select a separate evidence output directory, and record exact cross-arm differences. These testing/measurement changes are reported separately in `changes.json` and `evidence-gasket/tests.diff`.

Both the first unrestricted run and the subsequent restricted run passed; final restricted result is 28 tests, zero failures, zero skips. H1–H7 still complete at 20, 15, 23, 15, 19, 20, 20. Gasket reservation survives stop/handover and becomes spent exactly once with pump completion. No runtime behavior or raw numeric record was changed to force projection bit equality; that strict criterion remains unmet only for the direct-derived contribution effort projection, as recorded in `BIT-EQUALITY.md`.

Full snapshots/commands: `evidence-gasket/H1.json` through `H7.json`. Comparison and inclusive cost inventories: `evidence-gasket/comparison.json`, `costs.json`. Exact source/test diffs: `source.diff`, `tests.diff` (the diff tool exits 1 when differences exist, not a test failure). Stage source/test copies and manifest live here. All eight frozen kit hashes remain matched. No interface exceptions were requested.

Actual commands after editing:

```sh
node --test --test-isolation=none --test-reporter=tap tests/repair.test.js > evidence-gasket/initial-test.tap 2>&1
node --permission --allow-fs-read=/private/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/hf-independent-repair-ajr5o5f_ --test --test-isolation=none --test-reporter=tap tests/repair.test.js > evidence-gasket/restricted-test.tap 2>&1
node --permission --allow-fs-read=/private/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/hf-independent-repair-ajr5o5f_ --allow-fs-write=/private/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/hf-independent-repair-ajr5o5f_ tests/record.mjs evidence-gasket > evidence-gasket/record-run.json
diff -ru stages/00-baseline/src src > evidence-gasket/source.diff
diff -ru stages/00-baseline/tests tests > evidence-gasket/tests.diff
```

The independently directory-restricted `stage-tools/capture-stage.mjs` records before/after hashes, counts, actual source diffs, inclusive runtime/support costs and kit identity. Its own measurement source is counted separately in `changes.json`.
