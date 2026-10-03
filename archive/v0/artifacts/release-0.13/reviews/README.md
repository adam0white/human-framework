# Camp 0.3.0 review archive

This directory preserves existing independent core and UI review evidence plus root-provided final test logs. The [archive manifest](archive-manifest.json) records all 48 original temporary paths, relative archive paths, byte counts and SHA-256 identities; every copied file was verified byte-for-byte against its source. No probe, review, test or browser session was rerun for this archival step.

- `core/`: original core review, first failing probes/output, corrected readiness arithmetic, two synthetic original counterexamples, and narrow corrective recheck/report.
- `ui/`: original independent Chromium scripts/results/screenshots, synthetic saves and downloads, first harness failures, source manifests, follow-ups and final corrective screenshots/results.
- `validation/`: root-provided 784-test full-suite log and 43-test Node 22 focused log.

[Review dispositions and source provenance](../../../docs/reviews/2026-09-08-camp-current.md) explain accepted findings, corrections and limits. [Comparison evidence](../../../docs/camp-current-comparison.md) separately preserves the source-frozen baseline and successive current-source captures. The release identity is the latest `artifacts/camp-maintenance/release-current/` capture; older review source hashes are not relabeled as final-source review.

All save files and browser downloads in this archive are generated synthetic review states, including the deliberately corrupt backup canary. No private player export was read or copied. The original scripts and reports retain their temporary absolute paths as provenance; they were not edited to make a copied review appear newly executed. This entire archive is private evidence, outside the public asset allowlist.
