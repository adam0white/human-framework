# Last Light: additive radio and condition profiles

2026-09-08, before first public release. The [dated design amendment](superpowers/specs/2026-09-08-signals-profile-amendment.md) was committed as `e2c9ce7` before the new profile implementation and route run. Setup values were chosen from the unchanged runtime's explicit capacity assessment, not fitted to people. The original four situations retain their exact initial states, timelines and five-minute radio delay. Their [original artifact](../artifacts/signals/2026-09-08-comparison.json) remains unchanged.

| New selectable profile | Visible difference | Preserved route evidence |
|---|---|---|
| Clear connection (`clear`) | Two-minute reply transit after the one-minute paid request; ordinary starting condition | Radio observed at 1, received at 3, canal arrives at 9 and the launch sails. Immediate canal without observing arrives at 6: paid information is feasible here, not necessary or optimal. |
| After the long shift (`tired`) | Starting fatigue 0.8, hunger 0.2; ordinary radio | Actual ridge capacity refuses at time 0; the lighter canal succeeds at 6. Four paid rest minutes permit ridge arrival at 18, restoring the overnight beacon but missing the launch. |
| Without lunch (`hungry`) | Starting fatigue 0.2, hunger 1; meal still owned; ordinary radio | Exertion refuses. Rest alone leaves hunger at 1. Completing the three-minute meal permits canal arrival at 9 or ridge arrival at 17. Rest plus an interrupted meal costs enough time that the eventual canal arrives at 15 and misses the launch. |

The new landings remain open. This keeps changing-water timing traps out of the condition counterexamples. The actor view still receives no hidden landing truth before observation. These authored profiles provide real uses for the existing radio/rest/meal actions with frozen Human/runtime 0.1.1 mechanics. They establish neither calibrated physiology nor a need for complex cognition. The original four still allow immediate ridge delivery in every situation. Their original radio's earliest report-informed canal arrival is 12, which misses the before-12 launch window.

[Ten-route evidence](../artifacts/signals/2026-09-08-profile-routes.json) includes failures, free refusals, paid recovery and exact complete JSON resume, source hashes, the original artifact's hash and verification of the committed amendment. It verifies every field produced by the original comparison, including all complete case/baseline states, decisions, offered actions and checkpoint hashes, matches the retained result exactly. Only the new report records current source hashes; the original artifact is neither regenerated nor overwritten.

The profile API is additive before initial host release. `SIGNALS_SITUATIONS` gains `clear`, `tired` and `hungry`. Only these new-profile views add `profile: {label, description, radioDelayMinutes, capacityLabel}`. Their radio choice detail reflects the actual delay. Their choices add `capacityEstimate: {allowed}`. A negative estimate uses `CAPACITY_ESTIMATE` text while leaving the choice available to try; the actual `requestTask` result remains authoritative and may return a real `CAPACITY` refusal. Original view fields remain unchanged, preserving the original twelve-case record.

Parent UI integration must add the three options, show the profile description near the initial choices, update each existing choice-detail element from `view.choices`, and make radio help copy state the two-minute exception or selected delay. This lane deliberately leaves `web/signals.js` and `web/signals.html` untouched because the parent already added shared play-note functionality there. Browser verification of the new selectable profiles belongs to parent integration; the earlier original-profile browser artifact is not presented as new-profile QA.

A Fable source-review defect also received a focused regression: `receiveReceipt(null)` previously threw an uncoded TypeError. A malformed receipt envelope now rejects with `INVALID_RECEIPT` before host mutation. Valid early and stale receipts retain their existing coded rejections. The previous action-budget continuation fix is unchanged.

Eight added tests verify exact original-result preservation, all three new profile mechanisms and resume, an interrupted meal, malformed receipts, fresh-output requirements and retained failed routes. The full isolated branch suite passes **387 tests** on Node 26.8.1. No frozen runtime, Human, transitive model or release-lock bytes changed.

```sh
PATH=/opt/homebrew/bin:$PATH node --test tests/signals*.test.js
PATH=/opt/homebrew/bin:$PATH node scripts/signals-profile-evidence.js /tmp/signals-profile-routes-new.json
```

The runner requires an explicit fresh output path and uses exclusive creation. Keep both original protocol commits reachable: `1f8b2f8` for the twelve-case comparison and `e2c9ce7` for this additive amendment.
