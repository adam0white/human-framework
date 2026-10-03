# Camp current-host comparison

Baseline frozen at commit `9f790040f595cba829381fcc8d25ae282e9fdc0e` on 2026-09-08 before executing or inspecting new-host outputs. The latest release-source capture is complete at `release-current/`: all 201 commands retain physical equality, with 7 active JavaScript files / 98,953 bytes. Earlier `first-current/`, `final-current/` and `reviewed-current/` records are preserved unchanged and superseded for delivery identity. Deployment verification remains a separate root-owned release step. This is bounded maintenance evidence for the [execution contract](camp-maintenance-execution.md), not a human-behavior validation study or a rerun of the completed private work-helper matrices.

## Frozen sources and workload

The baseline is private source `91697f2697f4bc9d26a3df36552f71a865d973c6`, Camp 0.2.0 plus Story 0.1.0. SHA-256 checks confirm that its Camp, Story, controller, slot, HTML and CSS sources equal delivered source `7dbf9ae` (app 0.12). The [baseline manifest](../artifacts/camp-maintenance/baseline/report.json) identifies every transitive JavaScript source and harness byte. The runner materializes those Git blobs into a fresh temporary directory; it never imports evolving workspace implementation files.

Six synthetic traces start with `story.createGame()` and default shared, automatic-recovery, prospective-tool settings. No legacy migrations, hand-edited setup states or player exports are used. Recipes adapt the already preserved fresh API examples in `tests/camp-kernel.test.js`, `tests/camp-kernel-lifecycle.test.js`, `artifacts/camp-review/kernel/hf-camp-kernel-review-readiness.mjs`, and the existing `commons-policy.js` public-view controller. The tool trace uses a fresh paid prelude based on the structure of `scripts/continuous-work-fixture.js`; it does not migrate that older fixture.

| Trace | Commands | Frozen outcome / boundaries |
|---|---:|---|
| Gathering + accepted project | 5 | Active timber at minute 3, output at 16; accepted workbench fulfilled by 200 |
| Readiness + owned meal | 17 | Renewed player capacity is the Next stop at 77; owned partial meal at 80; interrupted reservation returns without hunger relief; completed replacement meal at 88 |
| Retained work + consent | 12 | Busy recipient refuses without physical changes; accepted transfer pays both workers; release, stop/resume and completion retain materials and practice at 22 |
| Ongoing tool improvement | 22 | Garden begins at 183, tools finish at 184; the first garden minute uses the old rate, then the prospective rate completes at 198 with 15 paid minutes |
| Earned supply success | 79 | Earned introduction at 224; two household kits dispatched at 314; four camp nights covered and early close at 403; continued people/work at 409 |
| Unmet deadline + return | 66 | Same introduction at 224; ferry at 314 has no household allocation; later camp service, deadline close at 404, two unmet households retained after return at 410 |

Each compressed trace preserves the initial save, **every original command and resulting complete snapshot**, named boundary snapshots, and the retained-field physical projection. Original commands include `next` separately from explicit `advance` minutes. The comparison must replay these exact commands, not regenerate a controller against the new host or substitute commands to improve the result. A changed event stop or failed command must therefore be reported.

The projection compares full body/skill/time/pending state, job/action/reservation/event facts, integer clock and queue, stock, structures, caches, milestone, installed work and last completions, worker-latched durations/contributions, paid counters, receipts, assignment/consent fields, readiness stops, supply allocations/production/deadlines and actual outcomes. It omits prose and explicit host/version/origin/history metadata. Added current-host work exposure fields (`startedAt`, `exposure`) are separate snapshot assurance metadata, not original physical equality fields. Complete original snapshots remain available so the projection is inspectable rather than a replacement for the evidence.

## Baseline cost and assurance

Active Camp JavaScript static import closure is **13 files / 165,781 bytes** including the browser entry, session and slot layer. Story host closure alone is **10 files / 129,652 bytes**. This is raw source size, not compressed network transfer, total site assets, CSS/HTML size or a browser load-time measurement. The closure follows literal relative ESM imports; its complete file list is in the manifest.

| Final trace snapshot | Serialized bytes | Cold parse + restore median, ms |
|---|---:|---:|
| Gathering + accepted project | 3,496 | 2.50 |
| Readiness + owned meal | 3,634 | 2.57 |
| Retained work + consent | 3,825 | 2.46 |
| Ongoing tool improvement | 5,027 | 3.06 |
| Earned supply success / returned | 11,525 | 53.69 |
| Unmet deadline / returned | 10,105 | 52.29 |

Every named boundary has five independent fresh Node processes. Timing includes JSON parsing and the first `restoreGame` after a separately timed cold module import; process startup, file reads and module import are excluded from the restore number. Node version, executable, individual samples and import timings are preserved. These are small local workload observations, not broad performance claims. JSON serialization counts UTF-8 bytes without pretty printing or a trailing newline. Complete round trips were verified for every original state.

The earned window repeats a 4,287-byte root and adds its finite command journal (882 bytes by successful return; 683 by unmet return). Costs removed by the current contract must be attributed to removing these historical obligations. The baseline does not authenticate all lifetime history: before entry there is no command journal; after Return it checks an extension of the settled history rather than replaying later body changes.

Six narrow corruption probes freeze this distinction. A bounded fatigue change during a pending gather is rejected by pending-person consistency. The same +0.01 bounded fatigue mutation after ferry dispatch is rejected by Story's window replay; after Return it is accepted by the old source. Extra unearned food is rejected at all three boundaries. Current-state validation must retain pending/ownership consistency without being called equally strong window-history validation if it accepts the dispatch-boundary body change.

## Reproduction

Run from the repository using a new output directory; the runner refuses to overwrite preserved evidence:

```sh
node artifacts/camp-maintenance/freeze-baseline.mjs /tmp/camp-maintenance-baseline-reproduction
```

The committed baseline was produced with `node artifacts/camp-maintenance/freeze-baseline.mjs artifacts/camp-maintenance/baseline`. [Recipes](../artifacts/camp-maintenance/recipes.mjs), [projection/source support](../artifacts/camp-maintenance/support.mjs), [freeze runner](../artifacts/camp-maintenance/freeze-baseline.mjs), and [cold restore worker](../artifacts/camp-maintenance/cold-restore.mjs) are private evidence, outside the public asset allowlist.

## First new-host comparison

The [first current report](../artifacts/camp-maintenance/first-current/report.json) captures core SHA-256 `b35932b294d462898961771c635cc69e61f5f35e63cddf9419cc647abb1e82f9`. All 201 original commands execute. Every retained physical field is exactly equal after every command, including full unrounded body/practice state, work contributions, event identities, paid materials and supply consequences. All current snapshots pass JSON round-trip restoration. This is evidence for these six selected traces, not exhaustive gameplay equivalence.

The full comparison deliberately preserves **nine view differences** in the two supply traces: at paused introduction/ferry/rain/ended phases the new view returns `nextStop: null`, while old Story exposed its underlying world's hypothetical next stop. Both already set `nextEventAt: null` and `canAdvance: false`. Actual Next transitions, readiness stops, paid time and current world state do not differ. This is an explicit paused-view pruning, not a silent rewrite of the frozen projection. The [comparison tests](../tests/camp-current-comparison.test.js) admit only this named view change and retain exact equality for the remaining projection.

The current snapshot validator rejects the same pending-body inconsistency and extra unearned food. It accepts the dispatch-boundary bounded fatigue edit that old window replay rejected, exactly as the changed contract declares. Both old and new accept the same bounded post-return body edit. The importer clearly rejects the old Story format. The removed journal is therefore a reduced historical claim; the lower cost does not establish equal historical validation strength.

| Final trace snapshot | Old → current bytes | Old → current cold parse + restore median, ms |
|---|---:|---:|
| Gathering + accepted project | 3,496 → 3,447 | 2.50 → 1.70 |
| Readiness + owned meal | 3,634 → 3,584 | 2.57 → 1.75 |
| Retained work + consent | 3,825 → 3,822 | 2.46 → 1.73 |
| Ongoing tool improvement | 5,027 → **5,046** | 3.06 → 2.19 |
| Earned supply success / returned | 11,525 → 6,509 | 53.69 → 2.23 |
| Unmet deadline / returned | 10,105 → 5,306 | 52.29 → 1.92 |

Snapshot savings are concentrated in the finite-window cases with a removed root/journal. The current tool trace is **19 bytes larger** at completion and **113 bytes larger** before tool completion because current-work exposure metadata adds information. The maintenance change does not make every snapshot smaller.

The new core import closure is **5 files / 72,114 bytes**, versus the old Story closure's 10 / 129,652. Its captured direct host source is 45,069 bytes; the old two active host sources together were 57,634 bytes. This removes transitive Common Ground, rain host, old Human and policy imports from the core. The first harness incorrectly measured the literal historical `web/camp.js` path after the UI moved the active entry to `web/camp-current.js`; its browser closure number is therefore **not an active-browser measurement**. That first report remains unmodified. The comparison runner was corrected to read the actual module entry from the source-pinned `web/camp.html`, and a final integrated capture must provide the valid active-browser comparison.

Reproduce the comparison only after the baseline freeze, with a new output directory:

```sh
node artifacts/camp-maintenance/compare-current.mjs /tmp/camp-current-comparison-reproduction 9f790040f595cba829381fcc8d25ae282e9fdc0e
node --test tests/camp-current-comparison.test.js
```

The runner verifies frozen baseline/harness hashes, captures current source bytes and hashes into an isolated temporary directory, and imports that captured source for all trace/restoration measurements. Complete generated states and differences remain under `first-current/`; its `boundaries/` contains individual fresh current snapshots useful for browser QA. Nine focused comparison/hash/assurance/dependency tests passed on the final source. Root owns integrated testing, public source selection and delivery verification.


## Pre-review integrated source capture

This capture preceded the payment-ownership and UI review corrections below. The [pre-review current report](../artifacts/camp-maintenance/final-current/report.json) captures core SHA-256 `cfa2db1f93b659a2d82d99c5644c03118a8095d03d9108867106f358d6b26616`, current session SHA-256 `683d1c28887da20a89d1e01dd6d85d9eddec2d5d28fdd7fd5459eff4fa879c97`, and browser entry SHA-256 `9c1d1c41e0ba9e49e91b2f1af19baebc6e24d0b4e6762f1f6c3e569b30944938`. Its page manifest identifies the actual `/web/camp-current.js` entry. All captured source bytes are preserved in `final-current/current-sources.json.gz`, with the archive hash recorded in the report. First-capture source is also preserved alongside its unchanged report.

All **201 commands again complete with exact physical equality**, the same nine documented paused-view differences, and the same six assurance probe outcomes. The later validation changes reject malformed current cache-production facts without changing the legal traces. JSON save sizes are unchanged from the first current run.

| Active source scope | Old | Final current | Change |
|---|---:|---:|---:|
| Camp browser JavaScript closure | 13 files / 165,781 B | **7 files / 98,173 B** | −67,608 B (40.8%) |
| Camp host JavaScript closure | 10 files / 129,652 B | **5 files / 72,451 B** | −57,201 B (44.1%) |

The current active closure contains the current host, current session/browser entry, released runtime and clock, Human 0.1.1 and shared `core/model.js`. It imports no historical Camp/Story, Common Ground, rain host, old Human entry or private experiment. The whole site's retained older examples are outside this active dependency comparison. Root's build/privacy tests separately decide which other public assets remain.

Final cold parse/restore medians were **1.61, 1.74, 1.76, 2.31, 2.34 and 1.85 ms** in the six trace order above, compared with old **2.50, 2.57, 2.46, 3.06, 53.69 and 52.29 ms**. These are five-fresh-process local medians per boundary on Node 26.8.1, with all samples and separately measured module-import costs retained. No claim is made about browser startup, network transfer, population behavior or every possible save. Both comparisons preserve the negative snapshot-size result for the tool trace.

Final evidence command:

```sh
node artifacts/camp-maintenance/compare-current.mjs artifacts/camp-maintenance/final-current 9f790040f595cba829381fcc8d25ae282e9fdc0e
node --test tests/camp-current-comparison.test.js
```

No baseline artifact was changed after the freeze. Root should verify these exact source hashes against the app commit before using this record as deployed-source evidence; a newer source change needs its own scope-appropriate check rather than inheriting these numbers by name.

## Reviewed source capture before final cache wording

The [reviewed current report](../artifacts/camp-maintenance/reviewed-current/report.json) uses core SHA-256 `1b0842a932aff34a94a30b474edfb3f862378bc378dfb54b3be3bb44db1511b5`, session SHA-256 `683d1c28887da20a89d1e01dd6d85d9eddec2d5d28fdd7fd5459eff4fa879c97`, and browser SHA-256 `9bba1d23e43b65ea25a6a1f7810d84a47cb394e291d2007685417e3ac1c97c47`. The HTML-derived active entry remains `web/camp-current.js`. Its exact source archive and full 201-step output are preserved in `reviewed-current/`.

The corrections add stricter current payment checks for pending meals/gathering and completed gathering receipts; they do not introduce a new schema or activity law. UI wording retains the actionable checkpoint reason on tab changes and explains that caches made after Return stay in storage with window allocations already settled. The [captured source diff](../artifacts/camp-maintenance/reviewed-current/reviewed-source-changes.diff) shows the exact 524-byte core and 275-byte browser increases. This evidence lane does not replace the UI owner's browser checks of those sentences.

All **201 original commands execute again, and every retained physical value remains exact**. There are still only the nine previously documented paused-view `nextStop` differences. Every saved state round-trips, all 23 boundary snapshots retain exactly the prior current serialized byte sizes, and the six original body/food assurance probes have unchanged outcomes. The window body-history check remains intentionally absent; stricter current paid-work consistency does not restore journal authenticity.

Two additional, source-bound correction probes are preserved separately from the frozen workload in [the correction report](../artifacts/camp-maintenance/reviewed-current/corrections/report.json). Both use the same valid named synthetic boundaries from the 201-command traces. Reclassifying a pending meal's three paid minutes as recovery, and shifting the active gatherer's paid effort onto the neighbor, were accepted by archived pre-review source and are rejected by the reviewed source. The original unmodified saves restore in both. The malformed inputs, original hashes, two captured-source outcomes and executable [probe runner](../artifacts/camp-maintenance/review-corrections.mjs) remain available. These are examples of the repaired current-state checks, not a claim that arbitrary absent history is now authenticated.

| Active source scope | Old | Reviewed current | Change |
|---|---:|---:|---:|
| Camp browser JavaScript closure | 13 files / 165,781 B | **7 files / 98,972 B** | −66,809 B (40.3%) |
| Camp host JavaScript closure | 10 files / 129,652 B | **5 files / 72,975 B** | −56,677 B (43.7%) |

| Final trace | Serialized bytes, old → reviewed | Cold parse + restore median, ms, old → reviewed |
|---|---:|---:|
| Gathering + accepted project | 3,496 → 3,447 | 2.50 → 1.82 |
| Readiness + owned meal | 3,634 → 3,584 | 2.57 → 1.74 |
| Retained work + consent | 3,825 → 3,822 | 2.46 → 1.67 |
| Ongoing tool improvement | 5,027 → **5,046** | 3.06 → 2.13 |
| Earned supply success / returned | 11,525 → 6,509 | 53.69 → 2.32 |
| Unmet deadline / returned | 10,105 → 5,306 | 52.29 → 1.96 |

All individual cold-process samples and module-import measurements are in the reviewed manifest. Timing variation between current captures is not treated as a review-fix performance claim. The five-process protocol, Node 26.8.1 environment and exclusions are unchanged. The negative tool-snapshot size result and reduced historical assurance remain explicit.

```sh
node artifacts/camp-maintenance/compare-current.mjs artifacts/camp-maintenance/reviewed-current 9f790040f595cba829381fcc8d25ae282e9fdc0e
node artifacts/camp-maintenance/review-corrections.mjs artifacts/camp-maintenance/reviewed-current/corrections
node --test tests/camp-current-comparison.test.js
```

Ten focused comparison, hash, ownership, assurance and dependency tests pass on this reviewed source. Earlier capture directories and the frozen baseline remain unchanged. Root should match the reviewed source hashes, not an earlier capture's hashes, to the app commit before citing these figures as deployed-source evidence.

## Final release-source capture

The [release-current report](../artifacts/camp-maintenance/release-current/report.json) pins core SHA-256 `73a535b879e552c7d1bcbd592b82cb751362f42ee7eeb95ad16f8f4473d69d9a`, browser SHA-256 `9bba1d23e43b65ea25a6a1f7810d84a47cb394e291d2007685417e3ac1c97c47`, and unchanged session SHA-256 `683d1c28887da20a89d1e01dd6d85d9eddec2d5d28fdd7fd5459eff4fa879c97`. Its exact source archive uses the HTML-derived `web/camp-current.js` entry. Compared with `reviewed-current`, the sole source delta is the shared cache benefit changing from a future-visitor promise to the literal “Pack timber and salvage into one supply cache.” No schema, coefficient, validation or paid-activity rule changed; the source is 19 bytes shorter.

All **201 frozen commands still complete with exact retained physical equality**, with only the same nine explicitly dispositioned paused-view `nextStop` removals. All current saves round-trip; all 23 boundary save sizes and the original six assurance-probe outcomes remain unchanged. The supply-window body-history guarantee remains deliberately removed. The tool trace remains 19 bytes larger than its old-host final snapshot; the final prose correction does not change saved physical state.

| Release source scope | Old | Release current | Change |
|---|---:|---:|---:|
| Camp browser JavaScript closure | 13 files / 165,781 B | **7 files / 98,953 B** | −66,828 B (40.3%) |
| Camp host JavaScript closure | 10 files / 129,652 B | **5 files / 72,956 B** | −56,696 B (43.7%) |

Final release-capture cold parse/restore medians, in the established six-trace order, are **1.69, 1.77, 1.73, 2.19, 2.31 and 1.90 ms**, versus old **2.50, 2.57, 2.46, 3.06, 53.69 and 52.29 ms**. Serialized final snapshots remain **3,447; 3,584; 3,822; 5,046; 6,509; 5,306 bytes**. Individual samples and separately measured module-import time remain in the release report. The same five-process Node 26.8.1 protocol applies; small timing variation between current-source captures is not attributed to the copy correction.

The [review dispositions](reviews/2026-09-08-camp-current.md) preserve the two repaired core P2 accounting findings, two repaired UI P3 wording findings, reviewer false starts, corrective source identities and the final neutral cache-card sentence. Existing root logs archived there report **784 full-suite tests passed on Node 26** and **43 current tests passed on Node 22**. This documentation update copied those existing logs without further tests or reviews. Root retains responsibility for matching these release-source hashes to the app commit and verifying the public build/deployment.
