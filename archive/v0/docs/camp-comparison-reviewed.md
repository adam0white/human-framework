# Reviewed camp comparison validation

All **26 development cases and three previously reserved cases pass** against the root-selected reviewed hosts. All 29 complete records replay exactly on **minimum Node 22.0.0**. This is post-review validation: the three reserved cases were already unsealed at the initial source and are not presented as a fresh withheld evaluation.

The final source is **`5fd5ac3e28df3b93c4de9fede50be79ec7ef1f28`**, frozen before execution by `959d764` and [the reviewed manifest](../artifacts/camp-comparison/freeze-reviewed.json). It selects kernel SHA256 **`a695c31258b8bc5339a20cd49f238e5a8f7fa1bed52c1cf2c0706822f804c078`** and story SHA256 **`99300ffb03feb6d45a0dcd1313e71c7f8e20c7857f35701d6931dcc66c74e538`**. Controls, fixtures, policies and comparison assertions are byte-identical to the initial freeze. Only reviewed host corrections and registered evidence packaging changed. No first comparison failure occurred, no controller was retuned and no original negative was discarded.

[Initial evidence and its historical conclusions](camp-comparison.md) remain distinct. [The complete initial-to-reviewed comparison](../artifacts/camp-comparison/initial-to-reviewed.json) records physical outputs, partial work, paid costs, bodies, source identities and packaging verification.

## What changed from the initial source

The reviewed Next Event implementation stops at useful completion/readiness/recovery boundaries. The unchanged visible-state policies therefore receive decisions at different times. Both still establish the camp at **198 / 224** minutes (build-first / stock-first) and finish **five caches at minute 480**, but their partial work, resources and paid effort differ:

| Policy / measure | Initial source | Reviewed source |
|---|---:|---:|
| Build-first controller decisions | 135 | 80 |
| Build-first free timber / salvage / food | 6 / 1 / 0 | 6 / 1 / 0 |
| Build-first sixth-cache fraction | .6316 | .3684 |
| Build-first work / recovery / meal person-minutes | 664 / 264 / 32 | 659 / 269 / 32 |
| Build-first construction / gathering practice minutes | 241 / 423 | 236 / 423 |
| Build-first aggregate paid effort | 5.9363 | 5.8837 |
| Stock-first controller decisions | 137 | 87 |
| Stock-first free timber / salvage / food | 12 / 4 / 3 | 1 / 1 / 3 |
| Stock-first sixth-cache fraction | Not started | .6667 |
| Stock-first work / recovery / meal person-minutes, automatic | 665 / 267 / 28 | 655 / 273 / 32 |
| Stock-first construction / gathering practice minutes | 211 / 454 | 225 / 430 |
| Stock-first aggregate paid effort | 6.0384 | 5.9433 |

The reviewed active-idle stock-first arm has **269 recovery + four idle** minutes instead of 273 recovery; its neighbor's fatigue is .6183 versus .5183 under automatic recovery. Physical output, owned stock and work fraction remain equal. Every reviewed arm consumes four portions; the initial stock-first world had consumed only three, with a fourth meal partly paid.

Each reviewed partial sixth cache owns **six timber and three salvage already installed at its worksite**, separate from the table's free stock. The original stock-first state had not reserved this stage, and the reviewed policy also gathers five fewer lifetime timber units. Thus its free-stock decline is not confiscated inventory or purely a reservation accounting change. The initial assertion that stock-first simply retains more supplies at this budget must not be transferred to the reviewed source. The reviewed choices instead trade free resources, food, paid practice and unfinished output. Lower paid effort likewise does not establish efficiency superiority when partially completed work differs.

The original negative remains: **none of these four productivity/recovery combinations increases completed cache count within either policy at minute 480**. Faster first establishment is still insufficient to rank an entire strategy.

## What remains exact or unchanged

- Every story service summary is unchanged from the initial comparison. New earned entries match direct kernel execution; imported worlds retain their actual state; zero-time acknowledgment/allocation/dispatch/finish/Return preserves the complete selected kernel; restored paid continuations match.
- The targeted snapshot garden still finishes at **207**, prospective work at **202**, with the same **.20 effort** and **20 / 15 construction minutes**. Complete first-stage contribution receipts match the initial runs exactly. Same-worker stop/resume preserves matched body/work/stock; the accepted handover still finishes at **201** with each actor's own paid contribution.
- The early surplus case still waits and pays for the actual ferry, then closes at **505** instead of inventing delivery at entry 415. The missed-ferry case still retains zero household provision and produces **four camp nights** by 400.
- The private supplied legacy camp still enters at its actual 1,312-minute state, keeps twelve earned caches, allocates four and retains eight, with ferry/rain at 1,402/1,492. This is present-state compatibility, not reconstructed old cache times or history. Private inputs and reports containing them remain excluded from external reviewer snapshots.
- The three already-seen boundary cases pass again: inclusive carried-cache allocation, interrupted mixed gathering/assembly import, and later camp benefit with one retained window. The carried-cache case still does **not** claim a newly produced cache exactly at departure; the independent host lifecycle test owns that different tie.

## Evidence, costs and packaging

- [Reviewed Node 26 development report](../artifacts/camp-comparison/reviewed-node26/report.json.gz) · [Node 22 exact replay confirmation](../artifacts/camp-comparison/reviewed-node22/replay.json).
- [Previously reserved cases, reviewed Node 26](../artifacts/camp-comparison/reserved-reviewed-node26/report.json.gz) · [Node 22 exact replay confirmation](../artifacts/camp-comparison/reserved-reviewed-node22/replay.json).
- Seven scoped comparison tests pass on [Node 26](../artifacts/camp-comparison/focused-reviewed-node26.log) and [Node 22](../artifacts/camp-comparison/focused-reviewed-node22.log). Root owns the integrated suite; no new full-suite result is claimed here.

Direct reviewed kernel/story source costs are **40,063 / 17,571 bytes** and **389 / 187 nonblank lines**. Inclusive graphs cost **100,531 / 129,652 bytes** and **1,195 / 1,512 lines**. They increased from the initial 97,606 / 125,220 inclusive bytes; fixes are not described as a source-size reduction. Observed compact development saves remain **3,432–19,272 bytes**, not worst-case bounds. The reviewed story also enforces its 1,048,576-character JSON budget; declared limits and hostile-boundary coverage remain separate from observed small saves.

New records use lossless gzip. Every manifest retains stored-byte hashes plus uncompressed JSON hashes and lengths. **All 62 payloads** were rehashed after decompression: **45,938,808 original JSON bytes** occupy **1,363,534 stored payload bytes**. Node 22 replay reads the compressed reports directly and compares all complete records exactly.

The original 68 files (including original manifests/replay confirmations) are preserved in [four initial archives](../artifacts/camp-comparison/initial-archives/manifest.json), totaling **1,810,638 compressed bytes**. Each archived member was checked against the original file and **Git object at `2a1eaef`** before removing only duplicate large JSON files from the checkout. Original manifests/replay confirmations remain at their existing paths, and original Git history remains untouched. [Packaging script](../artifacts/camp-comparison/archive-initial.py). Extract an archive into a new directory to obtain the exact original file layout and plain JSON. The entire comparison directory, including initial and reviewed evidence, is now about **3.4 MB**.

Reproduce reviewed records by checking out freeze commit `959d764` (which binds source `5fd5ac3` and includes the committed freeze file), using `node scripts/camp-comparison.js run --freeze artifacts/camp-comparison/freeze-reviewed.json --partition development --out /absolute/new-directory`. Replay uses `replay --freeze ... --input .../report.json.gz --out /absolute/new-directory`. The runner rejects changed bound source and existing output directories. Do not use the reviewed source to pretend the initial freeze was reexecuted unchanged.

## The journal's separate value and cost

The parallel [private validator comparison](camp-validator.md), source `b62fc0f`, accepts all sixteen legal fixtures with both real-kernel-backed validators. Source replay rejects four additional history/world mismatches, while local ownership/deadline/current-state checks are far faster on cold load (about .96 versus 117.66 ms in its 500-command fixture). Both retain weaker pre-entry/post-Return snapshot claims. That narrower integrity/cold-cost tradeoff is useful evidence, not proof of player value or general need for journals. Its exact earlier host hashes remain recorded separately; no claim is made that this final flag-only host correction reran that independent probe. Cached book saves already avoid repeated cold validation during ordinary updates.

This evidence supports the authored software contracts exercised here. It does not close human explanation, calibration, authoring-benefit, physiological or theological validation gates, and it does not itself establish production delivery.
