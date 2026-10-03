# Independent evidence and game-choice review

Reviewed 2026-09-08 in `/Users/abdul/code/human-framework`. Lens: scientific inference, serious simpler rivals, causal scope, meaningful timing/allocation choices, and MVP scope. Repository files were read-only. Temporary audit probes used `/tmp`. No separate previous reviewer verdict files were read. The source reports themselves include their limitations and provenance.

## Findings

### P2 — The short-notice Watch example does not establish that repairing the gate is too slow

Source: `.worktrees/watch-playable/docs/superpowers/specs/2026-09-08-watch-playable-design.md:16`; executable behavior in `.worktrees/watch-playable/src/games/watch.js:57-61,151-169`; limited example coverage in `.worktrees/watch-playable/tests/watch.test.js:7-16,32-35`.

The spec says the 22-minute scenario makes the repair/recovery schedule too slow. The retained repair route rests for the complete six-minute action, but the actual supported interruption mechanic permits enough paid recovery in three minutes. An independently executed legal route is:

1. Minute 0: keeper repairs; neighbor takes lookout.
2. Minute 6: keeper repairs a second section; neighbor hands over their part.
3. Minute 12: keeper rests.
4. Minute 15: interrupt keeper's rest, then request the final repair.
5. Minute 21: final repair completes. Minute 22: the surge arrives.

Observed terminal result: `protected=true`, `waterService=true`, `route="gate"`, `repair=18`, `partsRemaining=0`, paid rest 3 minutes, paid work 26 actor-minutes. Final keeper fatigue is approximately 0.988. No free recovery, forged state, capacity bypass, or resource duplication is involved.

This is a demonstrable inference defect in the scope of the design claim, not a defect in partial recovery. Keep the counterexample and add a regression/route trace. Narrow the statement to the fixed full-rest example; do not retune body coefficients or remove interruption merely to make the original route comparison decisive. The parent has already forwarded this to the Watch author for correction.

### P3 — Commons comparison can silently overwrite retained results

Source: `scripts/commons-next-comparison.js:46`, contrasted with `docs/commons-next.md:46-50` and the project's requirement to preserve negative findings.

The CLI uses ordinary `writeFile` and defaults to `artifacts/commons-next/comparison.json`. Supplying an existing output path succeeds and replaces its contents; running without an argument targets the retained result. A temporary pre-existing `/tmp` JSON sentinel was overwritten by an actual CLI execution. Current deterministic results are unaffected, but a later changed harness can erase the original comparison at the same path.

Use exclusive creation (`flag:'wx'`), and preferably require a new output path. This is evidence-preservation hardening, not a gameplay or causal-result failure. No retained artifact was changed during this review.

## Substantive checks with favorable results

### Body/practice rival and report

The independent stamina model's scalar weights match Human's initial success load and local dynamics analytically: initial `1-(2F+H)/3`; load `2.4(1-S)`; maintenance load change `2.4/600 = 1.6*0.0015 + 0.8*0.002`; effort load `2.4*(2/3)*effort = 1.6*effort`; nominal rest relief `2.4/60 = 1.6*0.025`; meal relief `2.4*(11/60) = 0.8*0.55`; initial practice slope `0.0052 = 0.008*0.65`. Sources: `src/experiments/mechanism-comparison/small-model.js:29-48`, `adapters.js:6-18`, `src/core/model.js:4-8,22-31,108-120`, frozen `protocol.json`.

Both models enforce their own finite capacity, receive the same actions/information/resources, and execute through the same host. The experiment does not make the small model mimic hidden Human channels, grant automatic recovery, or count blocked training as practice. This is a credible scalar-rival comparison for the stated scope. Its different gate is an authored prediction being compared, not a productivity advantage that establishes truth.

I independently verified all 11 hashes in the freeze manifest and reproduced the complete deterministic result objects for development, reserved, and all sensitivity variants. Observed counts are 7/12 development, 2/9 reserved, and 11/21, 7/21, 9/21, 9/21 for the four variants. The headline 9/21 is supported.

A separate accounting audit covered 105 pairs, 2,420 offered model commands and 180 retest branches. It checked identical offered commands and initial input; accumulated paid time; part and ration debits; expected output credited only from admitted work; paid task-specific practice; ten paid minutes and appropriate part cost in each retest; and identical A/B exposure body trajectories within each model. All passed.

The report correctly treats the visible reserved matrix as procedural rather than blind evaluation, labels expected output rather than sampled wins, discloses scalar versus channel aliasing and meal-clipping differences, and does not infer human validity, game prevalence, measured authoring effort, player indifference, or mobile performance. Code-size savings are appropriately qualified by unequal validation/API scope. Diagnostic alias cases and zero-work controls are retained with restrained interpretation. No further actionable causal or coefficient finding was found.

### Commons timing and allocation

The ten focused episode/comparison tests passed. The six scripted continuations preserve exact inner-world exports against Common Ground after each matched command. This supports the deliberately narrow claim that host-authored deadlines/allocation change delivered outcomes while underlying body/resources/output remain equal. The report preserves missed-ferry and surplus counterexamples.

The two stock-first allocations produce a real non-dominance in the named outcomes: one household plus two camp nights, or no household plus four camp nights. The build-first versus paid-recovery/food routes yield the same three total caches but different ferry delivery, with higher remaining food on the delayed route. Neither is evidence that the new episode is more enjoyable or that Human is a better model; the report says so.

A nonblocking design risk remains: allocating to camp before the ferry has no earlier mechanical benefit over retaining the option until dusk. Early camp commitment therefore sacrifices flexibility. The documented build-first counterexample already exposes this. Human playtesting should determine whether the irreversible early choice is understandable and useful. This is a plausible product risk, not a resource invariant defect or a reason to erase the control.

### Watch lifecycle and meaningful alternatives

All 24 focused Watch host/session tests passed. The two default approaches have different work, part, and service outcomes; opening a diversion has an explicit service cost. Arrival ties, partial installed work, paid transfer/meals/lookout, capacity/role refusal, conserved ownership, and deterministic resume/drivers are covered and align with the source. The short repair counterexample expands the feasible set but does not eliminate the diversion's lower-work/remaining-part tradeoff.

The neighbor's role and spare refusals are explicit host rules, not established social cognition. Practice is retained but does not improve repair execution in this short host. Both limits are accurately declared. Spare parts and saved work are terminal outcome dimensions here; their future usefulness has not yet been demonstrated by a subsequent episode.

### Observation memory causal scope

The candidate receives reports rather than the oracle, preserves observer/provenance fields, and uses authored expiry/displacement and delivery order. The notebook comparison is intentionally not capacity-matched, so pooled choice accuracy cannot isolate a human forgetting effect. The supplied protocol and report acknowledge that limitation, preserve the notebook's better accuracy, and keep the candidate private. Wrong choices after an undisclosed world change test the denial of inaccessible information; they do not demonstrate a malfunction or measured human prediction failure.

During the initial combined test run, two memory assertions were in active red/green work by the parent (constructor unknown fields and removed hardcoded verdict); these were communicated immediately and are not new findings from this lens. The parent subsequently reported eight focused tests passing after its fixes. I read the updated runner: it removes the hardcoded conclusion, compares full resumed state, includes the 10,000-delivery bound check, and verifies the original protocol hash. I did not attribute the parent's fresh test execution to this reviewer. No additional causal-claim defect was found beyond the candidate's explicitly open real-host/usefulness gate.

## Verification scope and disposition

Reviewer execution used `/opt/homebrew/bin/node` (26.8.1). Stable-source focused tests: 19 mechanism comparison + 10 Commons episode tests passed; 24 Watch host/session tests passed. Complete deterministic mechanism results and accounting were independently reproduced as described above. Browser QA, physical-device timing, deployment, the full integration suite, real-player explanations, and measured human authoring benefit were outside this review.

Recommendation: correct the Watch claim while preserving its legal partial-rest counterexample, harden Commons artifact creation, and retain the current narrow scientific/MVP claims. The reviewed software comparisons support scoped engineering distinctions and further playtesting; they do not close the human-validity, player-usefulness, or broader-faculty graduation gates.
