# One-repair baseline result

Both implementations complete all seven prescribed histories and agree at every recorded minute and command boundary within `1e-10`. Within either arm, all advance drivers and minute-one JSON restoration variants have exactly equal raw endpoint snapshots. The independently evaluated arithmetic oracle is in `tests/histories.js` and imports neither host nor candidate nor Human.

| History | Completion minute | Mara repair minutes | Tomas repair minutes | Supplier crafting | Tomas hauling |
|---|---:|---:|---:|---:|---:|
| H1 | 20 | 20 | 0 | 0 | 0 |
| H2 | 15 | 15 | 0 | 1 | 0 |
| H3 | 23 | 20 | 0 | 0 | 0 |
| H4 | 15 | 15 | 0 | 1 | 0 |
| H5 | 19 | 1 | 18 | 0 | 0 |
| H6 | 20 | 19 | 1 | 0 | 0 |
| H7 | 20 | 20 | 0 | 0 | 4 |

Every result is observed through minute 40, with all remaining actor minutes paid as real rest. Total repair effort is .20 in every history. H5 allocates effort .01/.19 between Mara/Tomas; H6 allocates .1888888888888889/.011111111111111112. Final partial work fractions still buy a whole task-practice minute. Nuri spends .02 effort for the tool; Tomas spends .04 on complete hauling in H7.

Independent arithmetic: H1 needs 20 base-20 slices. H2/H4 pay one base-20 slice before the tool exists, then `ceil(.95 * 14) = 14` further minutes. H3 adds three stopped minutes to the original 20. H5 pays A once and then `ceil(.95 * 18) = 18` B minutes. H6 pays B once and then `ceil((1 - 1/18) * 20) = 19` A minutes. H7's refused offer leaves A's 20-minute schedule unchanged.

The focused test suite has **28 passing tests, zero failures, zero skips** in the final Node filesystem-restricted run, using Node v23.7.0. Tests cover the histories, all drivers, active restoration, whole-remaining refusal, actual per-minute capacity rejection, atomic discarded payments, material ownership, stop behavior, basis retention with an actual changed proposed basis, duplicate settlement, malformed snapshots, immutable exports, and clock/state limits. The million-minute upper clock boundary uses an explicitly constructed valid all-rest current snapshot, not a claimed observed million-minute history.

The first unrestricted run passed 27 tests with the permission check skipped. The first restricted invocation failed before tests because the read allowance used macOS's `/var` alias while Node used `/private/var`. Its exact error is retained in `evidence/initial-permission-failure.tap`. The corrected invocation grants filesystem reads only to the canonical independent directory and no writes. There were no observed implementation-test failures before the passing run; subsequent additions strengthened decision/version and upper-clock boundary checks rather than correcting a failing history. This is not a red/green authoring claim.

`evidence/H1.json` through `H7.json` contain all actual domain/advance commands, results and full raw snapshots for each arm/driver/restore configuration. Minute reference histories retain every minute, including extra states immediately before and after commands. Next-event and uneven drivers retain their observed boundaries; tests compare each with the corresponding minute-reference state. `evidence/comparison.json` summarizes comparisons and accounting. The 84 driver/restore configurations are repeated checks of seven authored histories, not independent samples.

The largest cross-arm numeric discrepancy is about `1.39e-16`, caused by direct-derived versus candidate-accumulated redundant contribution effort. Maximum serialized whole-host snapshots in these histories are 2,551 bytes for candidate and 2,378 bytes for direct. The larger JSON evidence files are external records, not live-state growth.

## Inclusive source cost

| Counted source | Bytes | Physical lines |
|---|---:|---:|
| Shared host, validation support, Human and model | 40,606 | 608 |
| Candidate adapter plus candidate module | 7,679 | 104 |
| Direct pump rules | 3,118 | 57 |
| Candidate inclusive runtime | 48,285 | 712 |
| Direct inclusive runtime | 43,724 | 665 |
| Shared test/oracle/recording support plus package metadata | 25,164 | 361 |

`evidence/costs.json` provides exact file names, bytes, lines, SHA-256 hashes and contiguous validation spans. Host restore and main validation alone account for 9,489 bytes, plus the 1,937-byte shared shape/freezing module and the retained Human validators. Candidate's item validator span is 1,744 bytes within its fully counted 6,288-byte module; direct's pump validator span is 1,201 bytes. These spans are descriptive, not additive complexity measures; surrounding helpers, tests and dependencies remain counted separately.

At the consumer-only boundary, candidate's adapter is smaller than direct's rule file. Once the shared item source is included, this one-pump candidate arm has 4,561 more runtime bytes and 47 more physical lines. Formatting, reusable general capability and standalone assurance differ, so these counts establish neither human authoring time nor long-term maintenance cost. Both arms received the same shared host validation and tests. There is no result here about a second item, extension cost, empirical human realism, product usefulness, or whether the candidate should be promoted.

All files read or hashed came from the supplied directory. The kit's eight file hashes match the provided manifest, recorded in `evidence/kit-verification.json`. Kit source and package metadata remain unchanged. No external host, repository file, network install or outside reviewer was used. See `PROVENANCE.md` and `RUNBOOK.md` for boundaries and actual execution commands.
