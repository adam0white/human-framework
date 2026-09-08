# Observation memory candidate and delayed-cue protocol

Preregistered 2026-09-08 before implementation or outcome execution. This is a bounded software faculty candidate: an actor can retain a delivered report and later retrieve that report when its cue is absent. It is not episodic memory, a calibrated model of forgetting, or knowledge of whether the report is true.

## Contract

Private module `src/cognition/observation-memory.js`, version `observation-memory-0.1.0`, excluded from package and public build. Pure functions create a memory, encode one delivered observation, advance its clock, recall the most recently received report for a cue, and validate/export/restore JSON. No imports from the world, body or renderer.

A memory has one owner, an integer capacity, a fixed authored lifetime in minutes, current time, a monotonic last-receipt sequence and at most one retained report per cue. Reports include observer, source, channel, cue, a bounded string value and observation time. The host issues increasing receipt sequences and owns access, cost, report accuracy and delivery. Encoding rejects another observer, future observation times, decreasing time, replayed receipts, unknown fields and invalid values. Recalling returns a detached report with age/provenance; it never yields hidden world truth or changes a belief. Conflicts replace the cue's report by delivery order, not by a trust or truth judgment. Displacement is oldest received first. Expiry occurs at age greater than or equal to the configured lifetime. Polling does not refresh a report.

The last sequence stays after eviction/expiry, preventing a previously received report from being encoded again as fresh without unbounded receipt history. This relies on a host monotonic sequence, not a cryptographic receipt. Import can validate structural/temporal consistency, not prove that an observation really happened.

## Fixed synthetic probe

No learned coefficients, random calibration or reserved human data. Enumerate both target values (`left`, `right`) for every condition, with actors receiving identical report deliveries and query prompts. All reports cost one simulated minute in every arm; recall itself is a zero-cost host decision. The world oracle is available only to the scoring harness after choices.

Arms: (1) candidate memory with capacity 2 and lifetime 6 minutes; (2) smaller task-keyed notebook preserving the last received value per cue without expiry; (3) no retained observation state, choosing `left` when no current cue is visible. All arms use the same simple rule: return remembered/current target value or `left` when absent. The notebook is a serious engineering rival, not human-science evidence. It may retain more cues because unlimited recording is exactly the simpler option under consideration; report state sizes and do not call this a matched-capacity causal comparison.

Conditions fixed before execution:

| Condition | Deliveries / query | Intended discrimination, not assumed outcome |
|---|---|---|
| Visible control | Target visible at query minute 1 | Does retention add anything when information remains visible? |
| Delayed cue | Target at 0, no visible cue at query 2 | Can retaining an experienced report matter at all? |
| One distractor | Target at 0, unrelated cue at 1, query 2 | Capacity still accommodates the target. |
| Two distractors | Target at 0, unrelated cues at 1 and 2, query 3 | Does bounded retention lose a report that a notebook keeps? |
| Expired | Target at 0, query 6 | Does authored expiry produce the declared loss? |
| Corrected report | Wrong target report at 0, corrected report at 1, query 2 | Does delivery of changed evidence replace the old report? |
| Undisclosed change | Accurate report at 0, world target reverses at 1 without report, query 2 | Retaining a report must not silently grant new truth. |

Publish all fourteen deterministic condition/value cases, arm choices, correctness against the separately held oracle, report count, paid observation minutes and serialized state bytes. Repeat a saved/restored candidate across every case. Run 10,000 unique-cue deliveries and assert bounded entries/serialized size while retaining the receipt high-water mark. Latency measurements, if added, must identify hardware and exclude browser/human timing claims.

## Decision rule and continuation

If memory helps only over the state-free actor while the notebook equals or outperforms it, conclude that this demonstrates value of retention, not value of the candidate's extra contract or authored forgetting. Do not export it. Promote only after a playable host actually needs ownership/provenance/bounds, a second independent consumer uses the same boundary, and a measured comparison shows useful behavior or reduced authoring obligations beyond a notebook. Never tune expiry/capacity to manufacture superiority. Tests of inaccessible truth, duplicate/expired reports, save consistency and conflicting provenance establish software boundaries, not human validity.
