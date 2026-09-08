# MVP progress — plan: docs/superpowers/plans/2026-09-07-mvp.md

> Historical or version-scoped record. Original counts, proposals and observations below are retained. For current project state and delivery order, read the [handoff](../HANDOFF.md), [MVP contract](mvp-contract.md) and [roadmap](roadmap.md).

User authorized build/test/iterate on 2026-09-07. Existing directory contains research only, no git repository or baseline application/tests. Work proceeds in this dedicated project directory. No separate worktree is applicable before a repository exists; no existing branch is being modified.

| Tasks/interfaces checked | Finding/ruling |
|---|---|
| Core → scenario/experiments | Shared ES module exports; scenario IDs are data only |
| Core → UI | Actor projection versus researcher diagnostics explicit; no duplicated kernel logic |
| Scenarios → UI/CLI | Shared registry and JSON-safe data |
| Research → all implementation | Source findings inform decisions; no automatic parameter import |
| Task 1 consistency | Invariants match immutable synchronous API and structured trace |
| Task 2 consistency | Compare closed-loop trajectories under matched access and seeds; null control required |
| Task 3 consistency | Local browser adapter with no dependency or deployment requirement |
| Task 4 consistency | Report real tests and boundary evidence; no empirical or theological certification |

Research agents launched: historical source audit, fresh prior art, independent experiment design. Task 1 starting with failing invariants.

Task 1 initial red: `npm test` failed on missing kernel import. Initial green: 9 core behavior tests passed. Additional controls passed for resource contention, intention/outcome separation, cyclic transfer, interruptible promises and unsupported operations. Adversarial review reproduced hidden-precision help targeting and non-JSON scenario metadata acceptance; regression tests failed before fixes. Help now selects using the actor projection; scenario metadata must be finite plain JSON. Promise switch clarified as a targeted weighting ablation, with outcome tracking preserved for fair comparison.

Task 3 local HTTP server red: missing server import. Green: real HTTP test passed for app/module delivery, HEAD, method restriction, traversal and symlink escape rejection. UI implementation delegated; Task 2 scenario/benchmark implementation delegated in disjoint files.


Task 2 complete: three data presets, seven paired variants, 100-seed reproducible artifact with source hashes and scenario snapshots, and 300 exact null pairs. The full policy loses on objective progress in two settings; those results were preserved without retuning. The null was strengthened to retain active shared dynamics while forcing identical actions and removing promises.

Task 3 complete: browser controls, actor/researcher privacy, current and historical contributions, stop/restart, settings staging, replay import/export, desktop/mobile and reduced-motion operation checked against the actual local server. Successful import now clears a reproduced stale reason selection; malformed imports preserve run and pending reason. Initial favicon request was corrected.

Further core adversarial controls removed seed disclosure, separated negative-transfer credit, and removed peer-body influence from the body ablation. A fresh independent review then found partial rankActions options could crash or silently drop unrelated modules. Its regression failed with the original TypeError, then passed after nested option merging/validation; the reviewer confirmed the fix and seed separation. Root also reproduced incorrect practice prose under disabled learning and corrected it after a failing trace regression.

Task 4 complete: both historical reports read as evidence, all 63 references extracted with explicit access states, high-consequence claims investigated, prior-art and independent experiment memos delivered, coverage and actual equations documented. Dated addenda preserve the earlier source-access history. Final tests: 30 passed, 0 failed, 0 skipped. Final benchmark source identities match; all 300 null pairs equal. Browser runs reached both failure and success terminals and restored exported history.

Handoff: README provides local start, CLI, replay and benchmark commands. The server is local-only at port 4173 for this session. No Git repository, commit, deployment, public license or external message was created. The bounded MVP is complete; empirical calibration and expanded human coverage remain explicitly future research in the coverage ledger.
