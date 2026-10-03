# Service Day review dispositions

App 0.8 adds a two-person, two-obligation game, a private frozen comparison and a static public-module link check. Three Astra Ultra implementation lanes were followed by fresh overlapping reviews. Reviewers received bounded tasks without prior verdicts; fixes were checked against their actual counterexamples.

## Review provenance

- [Astra core](../../artifacts/release-0.8/astra-core-review.md): lifecycle, ownership, consent, deadlines, replay/import and bounded continuation. Initial source `94cb980`; corrective recheck `0a48e9f`. 160 mixed histories, 9,443 round trips, exact legacy-save continuation and altered-save rejection.
- [Astra UI/comparison](../../artifacts/release-0.8/astra-ui-comparison-review.md): actual Chrome at 320/390/1280, source freeze/result audit and static-module semantics. Independently replayed final-host evidence and rechecked the guard correction.
- [Fable value](../../research/reviews/2026-09-08-service-fable-value.md): source/design inspection of a frozen 23-file snapshot, requested Fable/max, actual `claude-fable-5-1` plus auxiliary Haiku usage. No execution, tests, raw trajectories, previous verdicts or private player data supplied. [Exact manifest/process provenance](../../research/reviews/2026-09-08-service-fable-provenance.json).
- The parallel Fable lifecycle request **timed out after 1,500 seconds** without a completed verdict. Its failed process is retained in provenance; it is not counted as a completed review. A fresh [Astra lifecycle/build fallback](../../artifacts/release-0.8/astra-lifecycle-fallback-review.md) independently executed 40 scoped tests on Node 26/22 and eight extra probe groups on each. No blocker was found in that scope.

## Findings and dispositions

| Finding | Concrete disposition |
|---|---|
| Alternating no-effect request/stop refusals could exhaust the action budget | Final host coalesces consecutive same-minute refusals across command types/recipients. Original reproduction passes; exact legacy 251-command saves normalize to two commands without changing world or closing outcomes. New valid work remains possible; 14 independently altered saves reject. |
| Refusal history promise exceeded actual storage | Contract explicitly states refusals are latest-response-only; accepted work and own choices enter the bounded recent record. No invented durable refusal history. |
| Static linker merged distinct browser URL identities | Reject query, fragment and percent aliases before linking. Actual Chrome counterexample and Node 22 checks are retained; canonical graph links 51 modules/83 edges. No app evaluation occurs. Dynamic imports and runtime/HTML/CSS/fetch/worker behavior remain outside its scope. |
| Exact-minute-24 diversion appears stopped despite complete paid work | Presentation renders the completed paid diversion accurately. Raw host lifecycle receipts, world, physics and original experiment artifacts stay exact. Partial stops retain their actual wording. |
| UI promoted a mechanically unnecessary meal | Meals remain selectable with explicit standard-day optionality; hunger alone no longer promotes them into the primary choices. No physics retuning. |
| Partner fallback can preempt a viable shared delivery | Visible cart/single-collection explanation and report name the minute 42 mechanism. Preserve this authored limitation as a control; next work should test explicit shared plans and renegotiation. |
| Frozen watchdog dispatches nine commands despite protocol saying eight | Actual behavior is disclosed. All recorded runs reach at most two consecutive zero-time commands, so results are unaffected. Frozen code remains unchanged. |
| Frozen helper uses stale gate-part need, peer information can be inferred, clinic schedule drives timing | Retain the policy quirk and qualify direct-body filtering, cost and timing claims. A compact post-review probe records concrete commands and observations. |
| Earlier snapshot lacked final verification runner binding and public route | Final manifest 3 binds the compact runner; all 18 trials and two continuations match original final saves. Root registers `/service/` and the ninth gallery card. |

See [the comparison's final observations](../service-day-comparison.md#final-value-review-observations). Later UI review and exact deployment evidence are linked in the release record. These reviews are software/design evidence; synthetic notes and desktop viewport checks do not supply human participants, enjoyment, authoring benefit, empirical calibration, qualified theological review or physical-device measurements.

## Final presentation recheck

[Fresh bounded UI recheck](../../artifacts/release-0.8/astra-final-ui-review.md) and [actual browser evidence](../../artifacts/release-0.8/final-ui-review-browser.json) cover all three widths. The tied completed diversion renders as counted work while imported/local/downloaded saves remain exact; the incomplete five-minute control retains its stopped message. Continuation through closing equals the headless result. Meal placement, optionality, strict deadline and cart warnings match current source. No HTTP errors, failed requests or page errors occurred. Eight session tests pass on Node 26 and 22.
