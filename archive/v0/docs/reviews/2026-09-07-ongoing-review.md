# Ongoing play and portability review

Date: 2026-09-07. The implementation follows the continuing user authorization for independent reviews, private source push and public app delivery. Raw supplied game exports were not sent to the external reviewers.

## Independent lenses and evidence scope

Two separate Claude CLI processes were invoked with `--model fable`, separate working directories and sessions, restricted read-only tools, no browser, no shell execution and no session persistence. Each received its own copy of an allowlisted frozen design snapshot: the new milestone spec, older roadmap, current human component/model and prior-art note. Neither received the other's verdict, previous reviews, user exports or deployment configuration.

Both completed successfully with no permission denials and unchanged source snapshots. Their raw JSON, exact prompts, verbatim results, source hashes and process/session/model identities are preserved in [`2026-09-07-ongoing-fable-provenance.json`](../../research/reviews/2026-09-07-ongoing-fable-provenance.json). The [approach review](../../research/reviews/2026-09-07-ongoing-fable-approach.md) is 776 words; the [boundary review](../../research/reviews/2026-09-07-ongoing-fable-boundary.md) is 795. These are design reviews of a pre-implementation-spec snapshot, not executable-code audits or player evidence. Both primary review models were `claude-fable-5-1`; both processes also recorded small auxiliary Haiku usage. Actual model usage remains recorded rather than inferred from the requested alias.

Three implementation authors were independently assigned GPT-6 Astra at ultra effort in separate worktrees. The courtyard author then reviewed the Common Ground host; the runtime author reviewed courtyard changes and reran isolated browser flows. Root inspected the runtime and integration. An additional fresh Astra ultra reviewer audits the portable runtime, external-consumer test and contract. Sources can change during parallel implementation; each review's scope and reproduced findings must be matched to the actual final code.

## Findings adjudicated against the implementation

| Finding | Assessment and action |
|---|---|
| The human component cannot advance idle people without an attempt. | Valid integration requirement. Common Ground explicitly executes non-exertive one-minute idle attempts; idle maintenance is tested. No direct second copy of physiology is added. |
| UI update sizes can change floating-point state and NPC decision times. | Valid risk. The host always integrates and considers idle NPC decisions on the same canonical one-minute cadence, independent of UI calls. Test exact snapshots across whole, minute, irregular and saved advances; do not weaken this to a tolerance or omit threshold cases. |
| A person supports only one pending attempt. | Valid scope clarification: concurrency is across people, with one job per person. The spec now states this. |
| Integer clock and fractional human API have different limits. | Valid boundary clarification. New host jobs use integer minutes; each advance is bounded to 1,440 minutes and total time is bounded. The human API itself is unchanged. |
| Practice might have no gameplay effect in a deterministic game. | Valid spec gap, filled by host task skill shortening future durations in whole minutes. A game heuristic and a skill display do not establish usefulness against a simpler rival. |
| A shelter cannot change the frozen recovery equation. | Correct. The implemented structure is a woodshed that improves usable timber yield. Workbench and garden affect construction duration and forage yield; human recovery is unchanged. |
| Packing the complete model file carries unused laboratory helpers and parameter names. | True. Retained and explicitly documented. The private local tarball has an exact file allowlist and no game dependency. Function-level extraction is deferred because changing/re-generating frozen source solely to strip unused helpers adds machinery and compatibility risk. The PARAMETERS object still contains unused laboratory coefficients; it is not a portable relationship model. |
| Any runtime package patch would invalidate human saves. | Not true of the implemented version contract. Runtime, human component and clock versions are separate; a package version does not itself alter human snapshot compatibility. Incompatible component changes still require an explicit compatibility decision. |
| Calling each browser update a simulation tick is insufficient. | Correct. Canonical simulation minutes, including when skipped by a UI advance request, are distinguished from variable browser callbacks. Fixed cadence resolves the review's concern without copying its suggested event-boundary-only design. |
| The kit must prove value against a host-native stamina implementation. | Agreed as an open MVP usefulness gate. This release proves installation and lifecycle semantics first, and does not claim the full comparison or broader model validated. See [MVP contract](../mvp-contract.md). |

## Concrete peer findings

The courtyard author reviewed Common Ground host SHA-256 `b83c8ee83f5d096bf939103242f31c072b9cf03b174d001db20c23c4c9433f24` and reproduced two P2 defects. Conserved totals alone accepted a minute-zero import with both stock and gathered timber inflated. Also, fulfillment was checked only when Meryem was idle, so she could refuse a new project while recovering after the previous project was already complete. Both were sent to the host author with reproducers and fixed in the final host. Added receipt counts/minimum paid-time bounds reject the forged stock. Fulfillment now updates before the busy check, and the regression preserves a meal while allowing the next project.

Root identified a related agency issue: releasing a project should not automatically cancel a recipient's self-chosen meal or rest. The final release handler preserves ongoing personal forage, meals and rest; a regression confirms meal reservation and completion remain once-only.

The independent courtyard review found no actionable defect. It reran all 31 courtyard tests, verified originals and QA source hashes, confirmed unchanged simulation bytes and checked loan/repayment, replay reload, actual snapshot import, unknown history, invalid replay preservation and 320/390-pixel rendering in an isolated browser. This supports the explanation patch's software behavior, not whether the next human player finds it clear.

## Fresh runtime audit and fixes

The [fresh Astra runtime audit](2026-09-07-runtime-peer.md) reproduced two additional defects: the test runner used a removed experimental permission flag on Node 26, and an alternate packaging root could ship a different component version under this checkout’s metadata. Feature detection now retains the filesystem-denial proof on early Node 22 and newer releases. Packaging verifies all three authored version declarations before output. The reviewer reran 25 focused tests on Node 22.0.0 and 26.8.1, and the final merged whole-host package proof passed on Node 22.0.0. Root independently ran the full 229-test suite on Node 26.8.1.

## Remaining alternatives

The strongest rival is a small host-native worksite with ordinary stamina counters and an inline scheduler. It may be easier to maintain. Keep it eligible to win on authoring effort, clarity and play rather than requiring a complex controller to win output comparisons. A second substantive consumer of the exported clock, and a shared social response mechanism extracted from two different host needs, remain distinct steps. A generic scheduler is useful infrastructure but is not a faculty of a person.
