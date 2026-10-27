# Model roles experiment, 2026-10-27

## Recommendation

Use Terra for short player guides and bounded implementation, with a reviewer and the ordinary checks. Use either tested model for a first review pass, then keep Opus or default Codex for release review: both missed every reference blocker. Terra found fewer issues with much better precision; Sonnet's longer review required substantial triage. For synthetic play, prefer Terra's smaller, more careful report; neither replaces human taste feedback or satisfies the full session method. Keep Opus for design, taste and architectural judgment; keep default Codex for difficult implementation, replay/determinism work and independent verification. Those retention recommendations reflect the observed misses, not a measured head-to-head win over models absent from this experiment.

Terra's implementation passed a compatible version of the reference regression; Sonnet's failed it. **Neither passed the exact hidden reference fixture**, which uses a newer save edition. Do not call either arm production-ready from this experiment. Sonnet was faster on docs and implementation; Terra was faster on review and play. Dollar cost was not measured.

## Method

One task per role per model used the supplied packets. The wait loop began at 11:28:29 Central, checked every five minutes, and found all eight outputs and eight timing lines at 11:38:29, before its four-hour limit. No arm was missing. The minimum observed free space stayed above 8 GiB. Each pair was independently shuffled into A/B copies; model names and commit IDs were hidden. Quality judgments were saved before opening the mapping and timing records. The masking also hid some numeric constants; source verification used original Git objects.

The implementation validator accidentally saw symlink targets before grading. It then supplied objective command results only. The root scorer judged anonymous patches separately before unblinding. This is partial blinding, not double blinding. The locked mapping was review/docs A=Terra, B=Sonnet; play/dev A=Sonnet, B=Terra. Documentation, play and implementation scores use 0–5: missing/unusable, major errors, substantial gaps, useful with correction, strong with minor gaps, complete for the stated criterion. Those scores are ordinal. Review recall and precision columns instead normalize the observed fractions onto 0–5. Raw counts take precedence; there is no cross-role total.

Ground truth: the two Opus reviews of HF `609ba16`, Murmur source `baef5f5` and the plain-English guide, Smoke's live UI and `docs/`, and Pass base `9930eef` with reference `11dfb6f`. Review uses the specified `6a389e0..609ba16` range. No new panel or general playtest round was run. All scratch reports, blind locks, reference sources and command logs remain in `~/code/.lab-scratch/model-exp/scoring/`; they are local evidence, not repository artifacts.

## Code review

The reference denominator is 15 deduplicated core findings: three blockers and twelve should-fix findings. Notes and positive controls are excluded. The two numerical stalls are distinct defects. A candidate's mixed finding earns precision credit if its central actionable claim holds; subsidiary errors are stated below. “False” includes unsupported claims **as submitted**; it does not prove every proposed hypothetical impossible. Novel algorithmic performance findings were checked in code, not timed.

| Model  | Core recall  | Blockers | Confirmed / submitted | Novel confirmed / false | Recall /5 | Precision /5 | Priority calibration                                                                      |
| ------ | ------------ | -------- | --------------------- | ----------------------- | --------- | ------------ | ----------------------------------------------------------------------------------------- |
| Terra  | 2/15 (13.3%) | 0/3      | 4/4 (100%)            | 2/0                     | 0.67      | 5.00         | Worship-route loss called P1; reference calls it should-fix. Other priorities reasonable. |
| Sonnet | 4/15 (26.7%) | 0/3      | 11/24 (45.8%)         | 6/13                    | 1.33      | 2.29         | Sole P1 is a dated prose deferral, not a new blocker. Four core hits are correctly P2.    |

Both miss continued activity review never rearming, starvation at the health floor wedging a run, and the sick-person fed-threshold stall. Sonnet's additional recall does not offset its false-positive burden for unattended review. Severity-weighted **detection**, not calibration, is Terra 6/51 and Sonnet 12/51 with blocker weight 5 and should-fix weight 3.

| Core reference finding                                    | Terra item | Sonnet item |
| --------------------------------------------------------- | ---------- | ----------- |
| Continuing activity review/body interrupts lost           | missed     | missed      |
| Starvation health-floor stall                             | missed     | missed      |
| Sick-person fed-threshold stall                           | missed     | missed      |
| Always-on behaviours dropped/unread parameters serialized | missed     | missed      |
| Necessity never set                                       | missed     | missed      |
| Quiet reviews inflate chronicle                           | missed     | missed      |
| Host chapter rejection mismatch                           | 3          | missed      |
| Worship helpers lose public route                         | 1          | missed      |
| Calendar epoch ignored                                    | missed     | 9           |
| Engine errors mapped to admission errors                  | missed     | missed      |
| input-disposed phase depends on chunking                  | missed     | missed      |
| Pending-request fidelity silently ignored                 | missed     | 8           |
| Large UTF-8/archive allocation cap                        | missed     | 6           |
| Release does not check build/schema stamp                 | missed     | 15          |
| structuredClone replacement claim incomplete              | missed     | missed      |

Every novel submitted finding was checked against `609ba16`. Paths below are relative to that revision; numbering follows the original output. Sonnet item 13 matches an existing reference note and is not novel.

| Model/item | Verdict                       | Source check and qualification                                                                                                                                                                               |
| ---------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Terra 2    | Confirmed                     | run-recovery.ts:645–661 calls historyEntries per transaction; run-kernel.ts:369–376 traverses the chain. Replay history traversal is quadratic.                                                              |
| Terra 4    | Confirmed                     | .github/workflows/bench.yml:25–40 omits the two fixtures imported by scripts/bench-run.ts:9–10. Fixture-only changes miss the benchmark trigger.                                                             |
| Sonnet 1   | False as stated               | docs/framework.md:5–11 warns of old API; docs/roadmap.md:34 dates the accepted rewrite. Not an undisclosed P1.                                                                                               |
| Sonnet 2   | False as stated               | Old benchmark sits under that warning; scripts/bench-run.ts:12–15 accepts arbitrary people/hours. No failed current budget demonstrated.                                                                     |
| Sonnet 3   | Confirmed                     | run-kernel.ts:224 clones current state; run-preview.ts:81–89 projects all retained events before filtering. Cost grows with history.                                                                         |
| Sonnet 4   | Confirmed, qualified          | run-step.ts:44–46,87–99,188,341–344 repeatedly scans/sorts queue. Claimed 11k entries require explicit authored windows; prayer data alone does not create them.                                             |
| Sonnet 5   | Confirmed, qualified          | run-step.ts:47–71,95,136 probes/hashes all people twice per reached frame. Magnitude of slowdown unmeasured.                                                                                                 |
| Sonnet 7   | False as demonstrated failure | -0 preservation/rejection exists, but no valid owner path producing it was supplied. run-validation.ts:204–210 rejects host -0. Internal producer remains unproved.                                          |
| Sonnet 10  | False as stated               | run-daily-clock.test.ts:30–108 covers pending requests, events and replay; run-numerical-control.test.ts:355–416 compares fine/daily. No skipped window shown.                                               |
| Sonnet 11  | False                         | communication-boundary.test.ts:16–24,81 uses two people and replay, contradicting asserted absence.                                                                                                          |
| Sonnet 12  | False                         | Public RunTuning is positive/bounded (run-validation.ts:170–184); host cannot set the cited fulfilWeight. Zero term does not remove faculty.                                                                 |
| Sonnet 14  | Confirmed, qualified          | CHANGELOG.md:11 and release.ts:5 retain ENGINE_VERSION wording. Contrary subsidiary claim: release.ts:51,69 still rejects mismatching Engine section.                                                        |
| Sonnet 16  | Confirmed                     | scripts/api-doc.ts:151,163–164,184–187 and docs/api.md:3–6 describe removed modules/signatures.                                                                                                              |
| Sonnet 17  | False as contract violation   | Different deterministic comparators exist; canonical code-point ordering is not an everywhere contract. core/math.ts:20–21 documents code-unit order.                                                        |
| Sonnet 18  | False as demonstrated failure | No executed overflow path identified. nextDailyAt uses BigInt (run-scheduler.ts:41–46); fitr planner is unexported/deferred.                                                                                 |
| Sonnet 19  | False as bug                  | fitr.ts:1–3,41–54 intentionally requires held understanding/eligibility. Candidate itself concedes behavior is acceptable.                                                                                   |
| Sonnet 20  | False as reachable cache bug  | core/memo.ts:6–10 states preconditions; no actual colliding caller supplied. Reference interleaving controls pass.                                                                                           |
| Sonnet 21  | False as unmet requirement    | CHANGELOG.md:25 calls timing engineering measurement; bench.yml:3–7 deliberately makes timing informational. A hard gate is a new policy.                                                                    |
| Sonnet 22  | False as established loss     | run-numerical-control.test.ts:1–5,342–416 supplies rewritten controls. Candidate did not inspect replacements; full old/new equivalence remains unproved.                                                    |
| Sonnet 23  | Confirmed, qualified          | run-recovery.ts:699–708 distinguishes restore from reconstructing replay; run-archive.ts:13–30 uses recomputable hashes. Import trust boundary deserves explicit documentation, not an authentication claim. |
| Sonnet 24  | False as new faith risk       | Authored Eid norm/window exists, but the earlier helper already allowed arbitrary normId; current helpers have no public route. Migration-note premise does not establish alleged new risk.                  |

Sonnet 13 is a confirmed reference-note match: index.ts:40–52 still exports admission/projection types for a rejected feature. No arm established a faith hard-rule violation. Terra's worship finding concerns routing loss, not divine acceptance or a ruling.

## Documentation

Word counts use Unicode words, retaining internal apostrophes/hyphens; headings count. The separately requested uncertainty footer is excluded from the player-page limit and shown separately. A strict whole-file limit would fail Sonnet. Both omit concrete failure stakes such as a written warning, route risk and disappointed family (`src/sim/standing.ts:25–48`).

| Model  | Wrong claims | Unexplained flavour words | Body / whole-file words | Accuracy /5 | Plain English /5 | Goal, failure, decisions /5 | Length /5                      |
| ------ | ------------ | ------------------------- | ----------------------- | ----------- | ---------------- | --------------------------- | ------------------------------ |
| Terra  | 0            | 0                         | 339 / 343               | 5           | 5                | 4                           | 5                              |
| Sonnet | 1            | 0                         | 390 / 527               | 4           | 4                | 4                           | 5 body; fails whole-file limit |

Sonnet says “On Saturday she writes a voice note to her mother.” Week one records/listens to a note (`moments.ts:1346–1351`); playable week two has an Ece-message decision (`week2.ts:1212–1235`, game.ts:1234–1241). Counted once, not once per error in the sentence. Its footer acknowledges uncertainty but leaves the claim in player copy. “The pencil wins” and “lose moments you should have won” add unsupported certainty; they are not counted as proved false. Terra gives clearer literal controls, including keyboard insistence and timeout behavior. Both cover goal, failure generally, and three meaningful decisions. Sonnet admits not reading the exact requested commit; the scorer checked that revision independently.

## Synthetic play

These scores judge actionable reporting, with limited independent UI checks as corroboration. They do not measure enjoyment or general bug recall. Two asks per arm were attempted on live Smoke using ordinary interactive taps at human pace, without computing moves. Live manifest read during verification: `af64d06224743529e8753eaec7ab64ef27f506a0`, dirty:false. No start manifest was captured, so build drift is not excluded. The scorer inherited Recording off, noticed it on pause, turned it on and closed the tab; the reproduction interval lacks complete recording. This is a scorer limitation, not an arm failure. No feedback was sent by the scorer.

| Model  | Asks | Independent attempts                                                                                  | Reporting reproducibility /5 | Goal/failure /5 | Session method /5 | Known-record overlap                                                                                                    |
| ------ | ---- | ----------------------------------------------------------------------------------------------------- | ---------------------------- | --------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Terra  | 2    | Two mechanisms reproduced with alternate resident Hacer, not exact seeded Sevim sequences             | 4                            | 5               | 3                 | Both concern selection/escort mechanisms already in design.md; no exact prior ask match established.                    |
| Sonnet | 10   | Torch and disabled Show the stair observed; neither literal missing-state/explanation claim confirmed | 2                            | 4               | 1                 | Landing-control complaint repeats iteration3-plan.md's known covered-control issue; danger warnings already documented. |

Terra's first ask is the difference between roster selection and walking to a figure: selecting Hacer leaves “Tap Hacer to approach”; tapping her visible figure starts walking. Its second is Street travel feedback: after Hacer agrees to follow and Street is tapped, the row still says “waiting beside you” and the hint still says “tap Street”; she later reaches Outside. These reproduce UI clarity mechanisms, not failed movement or two exact original scenarios.

Sonnet's torch ask is partly supported as a clarity concern: label remains “Torch F” and the visual difference is subtle, but accessibility checked state changes 0/1. Its disabled-action ask has a visible explanation: “Turn on Torch, then Show the stair”; switching Torch on enables the action. This does not confirm absent feedback. Its general death-warning complaint is contradicted by visible “Smoke is making breathing difficult” and “Smoke may kill me. Get me outside” statuses and validation.md's warning thresholds. A player failing to notice them remains useful feedback, not a missing-feature discovery.

Sonnet reports three nights but phone only, about ten minutes below the harness's fifteen-minute floor, and includes refused covered/off-screen taps among game complaints. Terra reports careful phone and careless desktop nights and explicitly withholds its driver-delayed refusal as unverified at human speed. Neither supplies contemporaneous first-minute/pulse diaries. Both verdicts are mixed. Sonnet says it submitted feedback; receipt was not independently verified. Smoke's `docs/` contains design, plans and validation records but no standalone playtest document at scoring time. Mechanism overlap is not counted as a verbatim known ask.

## Easy implementation

The root's blind diff scores assess patch quality. A separate mechanical validator ran frozen installs, actual worktree lanes and one existing exact-replay headless control. Each lane passed 416 tests in 46 files; each control passed one case, with 19 unselected cases skipped. Both had the same existing CSS warning. The validator waited for the suite lock; focused checks did not take it.

| Model  | Actual lane      | Exact reference test                           | Compatible reference test          | Correctness /5 | Scope /5 | Added-test value /5 |
| ------ | ---------------- | ---------------------------------------------- | ---------------------------------- | -------------- | -------- | ------------------- |
| Terra  | exit 0; 416 pass | exit 1 before board: incompatible pass@17 save | exit 0; 1 pass                     | 4              | 4        | 3                   |
| Sonnet | exit 0; 416 pass | exit 1 before board: incompatible pass@17 save | exit 1; other-cook summary changes | 2              | 4        | 2                   |

Reference: `11dfb6f:test/browser/panel-fixes.browser.ts`, “break edit preserves explicit cover choices across cooks.” The exact extracted case times out waiting for Continue in both arms. A separately saved compatible variant changes pass@17 to supported pass@16 and bounds the setup loop at 10,000 identical advance calls. Browser actions and assertions remain unchanged: night two, select Rafi for one cook, change that cook's break to 21:00, preserve cover and the other cook's summary. No viewport matrix was run.

Sonnet's selected cook assertions pass, but the untouched cook changes from Rafi not having agreed/nobody covering to “You will ask Rafi to take over.” Its new editBoardRow merely extracts the existing field-preserving map, leaving openingBoard's auto-selection intact. Its unit test mostly restates that helper. It adds useful clash warnings, but fails the compatible end-to-end regression.

Terra removes silent opening-board relief selection, keeps draft break slots, filters competing cover assignments and adds conflict text. Its compatible regression passes. Its unit test still constructs the edit itself instead of driving the UI. It changes all historical editions, whereas the later reference gates the new behavior to pass@17; this is a real scope limitation for legacy saves. Both patches touch the same three files. Their local experiment commits were not merged into Pass. Original arm reports described load-related test failures/retries; these independent fresh lanes passed without timeout changes. Terra's own original default lane was not green, despite its later custom-timeout suite passing.

## Wall time, tokens and cost

Wall times come from the coordinator's eight timing lines, not estimates inside reports. Sonnet's shared start file is epoch `1793118457` (11:27:37 Central). Its totals are reported subagent tokens. Terra's token entries are blank or malformed in timing.txt; final standalone “tokens used” lines in each raw log supply the numbers below. The wrappers' exit 0 means the process returned, not that its tests passed. Sonnet dev timing explicitly notes possible background work, so its 396 seconds is return latency, not proven all-work completion.

| Role   | Terra seconds | Terra reported tokens | Sonnet seconds | Sonnet reported subagent tokens | Faster return             |
| ------ | ------------- | --------------------- | -------------- | ------------------------------- | ------------------------- |
| Review | 117           | 64,632                | 190            | 159,049                         | Terra                     |
| Docs   | 63            | 37,389                | 27             | 84,044                          | Sonnet                    |
| Play   | 464           | 129,107               | 595            | 115,289                         | Terra                     |
| Dev    | 454           | 76,085                | 396            | 114,162                         | Sonnet, completion caveat |

Token counters have different scopes and no input/output/cache breakdown. They are allowance-use indicators, not comparable billable cost. No dollars were recorded and no price-based ranking is justified. These are single concurrent runs on a loaded machine, with different tools/context behavior and no repeats. Faster return, quality and cost are separate outcomes.
