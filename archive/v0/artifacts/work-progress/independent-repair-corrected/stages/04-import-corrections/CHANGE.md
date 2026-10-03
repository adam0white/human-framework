# Final import-invariant corrections

After the package-only boundary was recorded, ten deliberately false snapshot fixtures were checked against both repair arms. Each fixture contains real Human attempt payments consistent with its person's ledger; the false claim is in item exposure, chronology or allocation. The original red run had **13 failures and 7 passes** across 20 arm/fixture combinations. The full unchanged red snapshots and observed acceptance/errors remain in `evidence-import-corrections/red-fixtures.json`, `red-outcomes.json` and `red-node23.tap`.

The 0.1.1 candidate already rejected the three generic terminal fixtures. The direct arm accepted them: an extra twenty-first exposure, a zero-work terminal allowance, and two workers each receiving a truncated terminal allowance. The direct rule now requires total exposure no greater than the slowest actually paid basis and one possible positive terminal contributor, with all other contributors meeting their full-minute lower bounds. This is a **409-byte/3-line direct-source correction**, separate from the supplied candidate correction.

Five further false snapshots were accepted by **both** hosts: applying the minute-one tool to minute zero; completing fourteen fully tooled minutes by time fourteen despite tool arrival at one; paying two repairers on one item in a single world minute; assigning two pre-tool first minutes to one pump; and assigning the same actor's unique pre-tool first minute to two pumps. Two no-tool checks were already rejecting before these corrections: excess fraction for the paid rate, and a completion time below that item's sequential paid minutes. Those existing protections are reported as passes, not invented new fixes.

The common host now calls `src/import-exposure.js` during validation. It enumerates bounded counts before and after the one earned tool arrival, using existing contribution counts, bases, fractions and completion times. Full minutes must fit their actual base or tool-reduced rate. A completed item must have one final worker with a positive remaining slice and an item still open immediately before that slice. Item counts must fit sequential time in each interval; each actor's counts must fit the corresponding time prefixes across both items. Tomas's initial hauling consumes its initial time. The same actor cannot supply two terminal exposures at one timestamp.

No schedule, journal, inferred practice, replacement ledger or new authoritative state field is saved. The temporary alternatives are bounded by two items, two repairers, and at most 20 paid exposures per item after the existing domain/base checks. The common validator also handles a delayed earned tool, preserving the existing stop/restart supplier control. Successful fixtures cover two distinct actors' valid minute-zero work on separate pumps, tool arrival at eight, and repair following the four-minute hauling duty.

All 20 original false snapshots now reject; `capture-correction.mjs` verifies that every green fixture snapshot is **exactly identical** to its red counterpart. The first corrected run passed its 55 tests. Six additional positive boundary checks then brought the final focused suite to **61 passing tests, zero failures and zero skips**, on both Node23.7.0 and minimum Node22.0.0. Test processes have filesystem reads restricted to the canonical independent directory, no filesystem-write permission and no child-process permission. Node22 is launched only through the explicitly authorized external executable path.

H1–H8 preserve all actual fields exactly relative to stage 02, after only explicit candidate wire-version comparison metadata. Both Node versions produce exactly the same complete legal histories. H1–H7 completion times remain 20, 15, 23, 15, 19, 20, 20. H8 still finishes both pumps at20. The original candidate-accumulated versus direct-derived contribution-effort projection discrepancy remains unchanged, so **strict full-projection bit equality is still not met**. No field is rounded, and no redundant effort field was introduced.

## Source and validation cost

| Boundary | Candidate inclusive bytes/lines | Direct inclusive bytes/lines |
|---|---:|---:|
| Accepted stage 02 | 50,653 / 739 | 46,198 / 693 |
| Corrected package only | 51,047 / 742 | 46,198 / 693 |
| Final host/direct corrections | 55,611 / 817 | 51,171 / 771 |

The common correction adds `src/import-exposure.js` (4,422 bytes/73 lines) and two integration lines in `src/yard.js` (142 bytes). It costs **4,564 bytes/75 lines in each arm**. The direct terminal correction adds another 409 bytes/3 lines to its arm. The candidate adapter and common shape helper remain unchanged. Packet-only and host/direct deltas are separate in `changes.json`.

All runtime dependencies, including Human/model validation and the full corrected candidate module, are included. Testing/oracle/recording source plus package metadata totals 39,548 bytes/576 lines. Three additional correction measurement tools total 9,781 bytes/118 lines and are separately itemized with hashes. Main host validation, restore, direct validation and candidate validation spans are recorded; the whole new exposure-check file counts as validation support. These are source-size observations, not human authoring time or maintenance estimates.

## Limits

These are structural, rate and necessary time-capacity checks over authoritative current state. They do not authenticate past consent, body ordering, exact historical tool/work schedules or external persistence. The interval inequalities are not a claim of full historical schedule reconstruction or a proof of every possible body's feasibility. Existing fatigue checks remain cumulative order-independent bounds; actual execution still checks each real Human minute. Floating-point reconciliation retains the existing `1e-10` field tolerance and `1e-12` completion threshold. Original unsupported 0.1.0 work records are not migrated.

The original kit, corrected kit and accepted stage manifests remain byte-for-byte unchanged. No UI, feature extension, external model, other host/reviewer, repository read, new agent, Git operation or deployment was used. This correction is returned as evidence and does not assert that the candidate should be promoted.

See root `FINAL-CORRECTION.md` for commands and artifact navigation. Source/test copies, precise diffs, costs and the final manifest accompany this record. The raw source fixtures and their initial failures remain available for independent review.
