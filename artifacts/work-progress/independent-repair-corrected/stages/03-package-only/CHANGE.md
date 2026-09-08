# Package-only corrective boundary

Installed the supplied `kit-corrected/` package, version **0.1.1**, offline with scripts disabled. The original `kit/`, its manifest and the accepted stages were not changed. The corrected packet's manifest names source commit `ebcea3a` and freeze `c155d0d`; these labels were read from the packet and were not inspected through Git.

```sh
npm install ./kit-corrected --offline --ignore-scripts --no-audit --no-fund --cache=./npm-local/cache --userconfig=./npm-local/user.npmrc --globalconfig=./npm-local/global.npmrc > evidence-package-only/install.log 2>&1
```

The npm cache and empty user/global configuration files were confined to this directory. Installation changed the dependency path in package.json and generated package-lock.json. It did not run package scripts or access the network.

**No host runtime source changes were necessary to run the existing legal histories with the corrected package.** All four source files preserved here are byte-identical to stage 02. `evidence-package-only/host-source.diff` is empty. All H1–H8 checkpoints, commands, results and endpoints match their preserved stage-02 records across every driver/active-restore configuration. Only the candidate work wire version is adjusted from `0.1.0` to `0.1.1` in a detached comparison copy; original evidence and raw newly generated records retain their actual versions. Actual people, paid ledgers, work fractions, times, assignments and resources match exactly.

The legal-history proof passes on Node23.7.0 and Node22.0.0. Node22 verifies exact equality with the complete Node23-generated `legal-H1.json`–`legal-H8.json` records. The package-only proof explicitly loads this preserved source snapshot after later host corrections, so it cannot accidentally credit those corrections to the package update.

This is replay of the same legal command histories, not save migration. The corrected component intentionally rejects work snapshots bearing 0.1.0; original stages should use the original kit when rerun. Host source compatibility does not imply old wire-version import compatibility. The general test suite's historical comparison was later adjusted only for this explicit metadata change, separately from runtime corrections.

The package's candidate source grows by **394 bytes/3 lines**. Package-only inclusive runtime totals are candidate **51,047 bytes/742 lines**, direct **46,198 bytes/693 lines**. The direct dependency graph does not import candidate code, so its runtime bytes do not change. Shared host/Human dependencies remain 42,971 bytes/635 lines. Package metadata is listed separately in `costs.json`; `candidate-package.diff` preserves the supplied source delta.

The corrected generic terminal allowance rejects the extra, zero-work and multiple-truncated-terminal fixtures in the candidate arm before any host corrections. It does not establish tool chronology, per-item world-time fit or actor exclusivity across items. The separate red host cases and direct-rule failures are preserved under `evidence-import-corrections/`; they are not erased by this successful package-only compatibility result.

Reproduce with the directory-restricted `stage-tools/check-legal-histories.mjs package-only` command recorded in the final correction runbook. All eight original and all eight corrected packet file hashes are verified independently. No packet file was edited and no interface exception was requested.
