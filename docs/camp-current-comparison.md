# Camp current-host comparison

Baseline frozen 2026-09-08 before executing or inspecting new-host outputs. The new implementation comparison is pending. This is bounded maintenance evidence for the [execution contract](camp-maintenance-execution.md), not a human-behavior validation study or a rerun of the completed private work-helper matrices.

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

## New-host results

Pending baseline-freeze commit and new-host availability. Do not read the baseline cost reductions or retained-trace scope as completed implementation evidence.
