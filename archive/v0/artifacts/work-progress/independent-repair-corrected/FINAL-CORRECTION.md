# Completed final corrective stage

Current `src/` uses the supplied paid-work-probe **0.1.1** package and the corrected host/direct import validators. Prior accepted stage files and both kit directories remain unchanged.

- `stages/03-package-only/CHANGE.md`: no host runtime changes; package-only replay proof and separate dependency costs.
- `stages/04-import-corrections/CHANGE.md`: independent red cases, direct generic correction, common rate/time/exclusivity checks, complete costs and limitations.
- `evidence-import-corrections/red-fixtures.json` and `green-fixtures.json`: identical raw invalid inputs before/after correction.
- `evidence-import-corrections/restricted-node23.tap` and `restricted-node22.tap`: **61 passing tests each**, zero failures/skips.
- `evidence-import-corrections/legal-node23.json` and `legal-node22.json`: H1–H8 are exactly preserved across all drivers/round trips and Node versions, except explicitly changed candidate wire-version metadata in comparison copies.
- `evidence-import-corrections/H1.json`–`H8.json`, `legal-H1.json`–`legal-H8.json`, `comparison.json`, `costs.json`, `source.diff`, `tests.diff`: complete current traces and source evidence.

The before/after test evidence contains 20 arm/fixture combinations: 13 invalid combinations were accepted before host/direct correction, and all 20 reject afterward. Those combinations are not independent empirical samples. H1–H8 outcomes remain unchanged. Strict full-projection bit equality remains **unmet** only for candidate-accumulated versus direct-derived contribution effort; actual people, paid ledgers, progress, timing, resources and consent stay exact. Raw values are preserved.

Final inclusive runtime source is candidate **55,611 bytes/817 lines**, direct **51,171 bytes/771 lines**. The package update adds 394 bytes only to the candidate dependency graph; common import validation adds 4,564 bytes to each arm, and direct terminal validation adds 409 bytes to that arm. Test, metadata and measurement source costs are separately retained.

## Actual execution

All commands run from the independent directory. The corrected package was installed with `npm install ./kit-corrected --offline --ignore-scripts --no-audit --no-fund --cache=./npm-local/cache --userconfig=./npm-local/user.npmrc --globalconfig=./npm-local/global.npmrc`. The two config files are empty local files; the install log is preserved.

Current Node verification:

```sh
node --permission --allow-fs-read=/private/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/hf-independent-repair-ajr5o5f_ tests/all.test.js > evidence-import-corrections/restricted-node23.tap 2>&1
```

Minimum Node22 verification:

```sh
/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/human-node22-review-xnBFhK/node-v22.0.0-darwin-arm64/bin/node --experimental-permission --allow-fs-read=/private/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/hf-independent-repair-ajr5o5f_ tests/all.test.js > evidence-import-corrections/restricted-node22.tap 2>&1
```

The entry-point test file runs Node's test API in-process, avoiding a child-process permission exception. The shell handles output redirection. Node23's entry-point output uses its default reporter; Node22 emits TAP. The extension's permission test checks denial without reading an external path. The sole external executable use was the explicitly supplied Node22 binary; no external source directory was read.

The red run used the restricted current Node with `--test --test-isolation=none --test-reporter=tap tests/import-invariants.test.js`, recording its expected exit1 before code correction. `stage-tools/record-import-cases.mjs red` and then `green` wrote full fixtures and acceptance/error outcomes. Both recorder runs had writes allowed only inside the independent directory.

`stage-tools/check-legal-histories.mjs package-only` records or verifies the package-only histories using the preserved unchanged stage03 source. `stage-tools/check-legal-histories.mjs import-corrections` records the final histories; adding `verify` checks Node22's results against Node23's saved raw records. Current Node recording used the same directory-only read/write allowances; Node22 verification used the directory-only read allowance. Original stage-02 evidence is only read, and only candidate version metadata is adjusted in detached expected records.

`tests/record.mjs evidence-import-corrections` records the cross-arm comparisons and current inclusive source inventory with corrected-package dependencies. `stage-tools/capture-correction.mjs` copies final source/tests, records package-only versus common/direct deltas, verifies identical red/green inputs, checks both packet manifests and the accepted stage manifests, and writes the two new freeze manifests. All those tools operate inside this independent directory. Precise shell authoring and diff commands remain in the parent-visible task transcript; complete resulting source and diffs are preserved here.

No further feature work or correction is included. The full limitations in the stage04 change record apply; passing these checks is not proof of historical authenticity or a maintenance/promotional conclusion.
