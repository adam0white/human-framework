# MVP verification and iteration record

Subsequent delivery: [mobile release and first playtest response](mobile-release.md) records public hosting, clearer controls and the added solo control. The counts and scope below describe the initial three-scenario MVP.

Recorded 2026-09-07, engine 0.1.0. The user authorized building and iterating a usable MVP; the earlier research-only proposal is preserved in [framework-proposal.md](framework-proposal.md). This release is a local executable prototype with defined behavior, not empirical validation of a whole person.

## Delivered

- A dependency-free ES-module kernel with actor/world separation, the seven-phase action loop, player or NPC choice, paid observations, bounded body/proficiency proxies, announced promises, directed trust/support, keyed randomness and replay.
- Three data presets using the same kernel: Courier Crossing, Repair Bench and Water Commons. No scenario-ID branch appears in the kernel. All three instantiate one cooperative aggregate-task structure; this is not yet three independent genre architectures.
- A browser laboratory with manual actions, optional recorded reasons, actor selection, policy/module controls, automatic play, stop/restart, historical score contributions, person/researcher views and JSON import/export.
- A local-only HTTP server, CLI simulation/replay export, and seven-variant paired benchmark with raw outcomes, null controls, scenario snapshots, source hashes and environment details.
- Full bibliography extraction and targeted audit of the historical reports, researched prior art, an independent experiment program, [implemented formulas](model-reference.md), and a [coverage ledger](coverage-ledger.md) distinguishing proxies from missing mechanisms.

Original code was written for this prototype. No third-party simulation code was vendored; surveyed frameworks were evaluated as prior art. The package is marked private; no public license has been selected. The directory was not a Git repository when work began, so no branch, worktree, commit or deployment was created.

## Automated verification

Final `npm test` on Node v26.8.1, macOS arm64: **30 tests passed, 0 failed, 0 skipped**. The final root-run suite took approximately 0.49 seconds; this is descriptive local timing, not a portable performance guarantee.

| Area | Meaningful behavior checked |
|---|---|
| Choice and causal order | Supplied action/intention survive policy disagreement; input state stays unchanged; missing resources cause paid failed attempts; structural errors consume no time |
| Information boundaries | Changing inaccessible hazard/seed does not alter an accessible policy view; assistance uses perceived peer need; peer intentions and replay seed remain absent |
| Numerical/model integrity | Bounded practice and retention, no unsupported transfer, nonrecursive directed transfer, separate negative-transfer provenance, finite JSON data, targeted module effects |
| Replay and randomness | Exact state reconstruction, version rejection, independent keyed draws and terminal-state behavior |
| Experiments and CLI | Three presets at boundary seeds, paired arithmetic, exact null equality, no invented one-pair uncertainty, malformed input rejection, exported replay consumption, benchmark source identities |
| Local server | Real HTTP module/app delivery and HEAD behavior, method restrictions, traversal and symlink escape rejection |

The suite uses Node's built-in test runner and actual local HTTP/CLI execution. It does not require installing a testing library. Initial feature tests and later substantive regressions were observed failing before their implementations/fixes, as recorded in [progress](mvp-progress.md). The checks establish software behavior within this schema, not physiological accuracy, human decision prediction or theological adequacy.

## Browser verification

Playwright operated the actual app at `http://127.0.0.1:4173`; no mock kernel or replacement UI was used.

| Interaction | Observed result |
|---|---|
| Manual choice with a stated reason | Chosen action and “Keep my commitment” persisted; all seven phase fields and historical weights were available |
| Person switch and researcher toggle | Other person's private reason absent from person history; researcher could inspect it and hidden hazard; returning to person view removed inspector content from the DOM |
| Export, advance, import | Browser download was saved as [browser-replay.json](../artifacts/browser-replay.json); import restored round 1 and the original intention |
| Invalid replay | Explicit error, same run/history/status, existing selected reason preserved |
| Successful replay import | Cleared the previous run's unsubmitted reason after a reproduced and corrected stale-selection bug |
| Staged seed/policy/body switch | Current run kept seed 7; new run applied seed 31, baseline and disabled body coupling; Restart discarded a staged seed 32 and restored seed 31 with its actual options |
| All three automatic runs | Seed 7 reached deadline in Courier at 14.4/16, Repair at 13.8/18 and Commons at 10/12; terminal actions disabled; restart cleared history |
| Successful termination | Courier seed 8 reached the objective at 16.2/16 |
| Stop and keyboard | Autoplay stopped after one recorded round; Enter on a focused inspection action advanced exactly one round |
| Responsive and motion | Desktop 1440×1050 and mobile 390×844 inspected visually; mobile had no horizontal overflow; six action controls remained usable with reduced motion enabled |
| Console | Final page session reported zero errors and warnings; initial missing favicon was corrected |

Screenshots: [desktop laboratory](../artifacts/laboratory-desktop.png), [mobile action controls](../artifacts/laboratory-mobile.png). Browser checks were performed through the available Playwright tool; they are not packaged as an `npm` browser-test command. Cross-browser, screen-reader and formal accessibility audits have not been performed. Time advances through rounds; autoplay delay is presentation pacing, not an always-running simulated universe.

## Overlapping review and corrections

Research was delegated across historical-source audit, fresh prior-art discovery and experiment-design lenses. Implementation was divided into kernel, scenario/experiment and browser tasks. The historical auditor then challenged the kernel, followed by a fresh reviewer who had not used the earlier correction ledger. The root performed actual UI and integration checks; the UI author separately inspected replay/settings/privacy edge cases. These are overlapping internal AI-agent reviews, not independent institutional or scholarly endorsement.

| Finding | Change and verification |
|---|---|
| Help selected a recipient from hidden fatigue precision | Select from the actor's perceived peer view; regression fails before fix and passes afterward |
| Arbitrary metadata could contain non-JSON/nonfinite values and break replay | Reject cycles, undefined/functions/BigInt, nonfinite values and nonplain objects during scenario validation |
| Actor projection exposed the replay seed | Remove seed from policy options/view; seed remains an explicit researcher/replay setting |
| Negative transfer could look like direct practice | Separate direct practice and signed transfer records with provenance |
| Body ablation still used peer fatigue in help preference | Remove that coupling from both preference and recipient selection when disabled |
| Promise ablation's label overstated its scope | Define it as promise weighting off, while retaining outcome/trust tracking; tests verify both halves |
| Partial `rankActions` overrides crashed or silently disabled other settings | Validate and merge current policy and nested module flags; fresh scoped review confirmed correctness and no seed disclosure |
| Failed work claimed practice under the learning ablation | Outcome prose now mentions credited practice only when a practice record exists; failed-before/fixed-after regression |
| Replay import retained a stale unsubmitted reason | Clear it only after successful validation/import; real browser recheck confirmed success reset and failure preservation |
| Documentation implied full policy always enables every module and replay restores old engine code | Corrected: targeted ablations are supported; incompatible engine versions are rejected |

The fresh review independently ran all then-current tests and a 30-seed comparison, and found no additional core replay, information-boundary or theological-scope failure in its assigned pass. It did not independently reverify every research citation. Its one actionable API finding was fixed and rechecked. The later outcome-prose regression and final complete suite passed at the root. No known actionable finding remains open from these review passes.

## Research and benchmark outcomes

The historical inventory contains **63 references, 54 normalized URLs and 32 mechanism decisions**. **46 references remain unchecked leads**, explicitly marked. Consequential checks found a human-metabolism coefficient borrowed from zebra finches, a transfer citation whose experiment found no transfer, unsupported use of population heritability as individual coefficients, and defective birth-relative malleability bounds. The [audit](../research/historical-source-audit.md) links the primary evidence and distinguishes access depth, existence and claim support. None of the inherited coefficient tables was promoted into empirical defaults.

The final [benchmark artifact](../artifacts/benchmark.json) records 100 paired seeds across seven variants and three scenarios: 2,100 variant runs, plus 300 full/baseline null pairs. All null pairs agree exactly. The [report](benchmark-report.md) retains losses, null effects, descriptive intervals, fixed-order timing and early-termination confounds. Full-loop mean progress is 16.40/13.71/11.80 versus baseline 15.99/16.17/13.72 in Courier/Repair/Commons respectively. The data was not retuned to make the richer policy win.

Prior art includes The Sims, Versu, CiF/Ensemble, FAtiMA, PsychSim, Soar and ACT-R, with separate discussion of knowledge-sensitive interfaces, time contraction, pacing and macro-model limits. No broad novelty claim follows from recombining them. The distinct contribution at this stage is this inspectable implementation, its source/interpretation boundaries, and the comparative tests—not discovery of a universal human equation.

The next useful iteration is bounded: compare an inspection stopping rule under matched evidence/costs, then add a genuinely different social task with independently chosen acceptance/refusal. Detailed physiology, development, spiritual scenario interpretation, adaptive presentation and macro scale remain on the research path with explicit entry tests in the coverage ledger. A usable first MVP is delivered; the larger scientific and theological program remains open.
