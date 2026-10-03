# Playability and capacity correction — 0.2.0

Recorded 2026-09-07, following the user's Solo Repair playtest. This release improves the existing four scenarios; it does not add another faculty or an LLM dependency.

## Reproduction

The supplied `human-framework-solo-seed-7-round-8.json` is an engine 0.1.0 record of six careful repairs and two rests. It reconstructs a win at 9.6/9. The fixed schedule had no tolerance for a failed repair: six successes were required. Independent replay experiments found 340 wins across seeds 1–1000. A simple observable recovery strategy (eat at hunger 60%, rest at fatigue 65%, otherwise careful work) could not achieve 9 units within eight rounds even if every work attempt succeeded.

The old seed 7 baseline won 9/9 in six rounds while continuing work at fatigue 1. The old full policy lost at 6/9. Fatigue clipping erased further exertion costs while continued work still earned practice. Thus the previous benchmark compared policies in a world with an exhaustion loophole. It remains a reproducible historical result, not evidence against recovery or for a superior human model.

## Changes

- Every work/help request must fit the complete interval's fatigue and hunger capacity. The resolver applies this to manual actions, both policies and every ablation.
- If it cannot execute, the requested choice and intention remain in the record, while the actual recovery action is recorded separately. Blocked requests produce no work, task practice, help, work-promise fulfillment or consumption of prepared support.
- Maintenance and recovery are integrated before clipping, preventing free recovery at a saturated meter. Rest at minimum fatigue no longer claims to have reduced it.
- A single help-effort default now governs ranking, execution, capacity and guidance.
- Disabling belief learning now removes both hazard updates and their inspection value from the full policy. The old score/update mismatch encouraged repetitive inspection. Manual inspections still cost time and yield reports/practice; this is a coupled ablation, not learned stopping. Disabling practice learning similarly removes expected learning value while preserving existing proficiency and executable work.
- All four scenarios have 36 rounds of 20 minutes with longer workloads and enough rations to exercise recovery and meals. The unchanged skill, hazard, action and policy coefficients were not adjusted to make the full policy win.
- Old 0.1.0 replays use a frozen, read-only historical kernel. Starting another attempt uses the current preset; old results are not silently rewritten.

The [model reference](model-reference.md) gives the formulas and record contract. The [benchmark report](benchmark-report.md) gives current outcomes, control policies and feasibility tests. The [research decision register](../research/decision-status.md) separates rejected formulations from deferred domains and lists conditions under which each may return.

## Verification

Capacity tests cover boundary arithmetic, both policies and body settings, food availability, blocked practice/promises/help, support preservation, actor-view privacy, default effort, deterministic replay and recovery without authored recovery actions. Historical state hashes protect old replay semantics. Scenario tests cover viable play, repeated rest/meals, food removal, idle failure, solo social nulls and benchmark source identity. Browser and deployment checks are performed before delivery; the live release manifest identifies the exact deployed commit.
