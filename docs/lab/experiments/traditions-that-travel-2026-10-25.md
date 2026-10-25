# Traditions that travel — 2026-10-25

## Preregistration

Registered before probes. Base source: `14b7d6cdcff5b66836f8d97eee38ecc22197741a`.
Use registry HF 2.22.0, downloaded and integrity checked in scratch. Reuse `receiveMethodCues`, `demonstrateMethod`, `methodEvidence`, `decide`; do not add duplicate learning. No release or player rounds.
Seeds: 7, 19, 43. Three arms: imitation (own outcomes plus attended peer examples), discovery (own outcomes only), frozen (initial demonstrator examples only, no subsequent evidence). Twelve people including one explicitly taught demonstrator. All arms use equal repair competence and identical offers: patch or replace. Two observed demonstrator patch successes precede the run in imitation and frozen only. These lessons are seeded teaching, never emergence.
Thirty choice trials per learner: 15 dry and 15 damp. Patch works dry and fails damp; replacement works in both. The visible cue remains joint=split: dampness is initially unobserved, so harmful transfer is possible. Actual outcome is observed after each choice. No host selects the learner's choice or increments adoption. Each imitation learner also observes the preceding learner's actual trial outcome on a neutral circular schedule; all choices in a trial precede feedback. The demonstrator is included in the same schedule. Record self and peer provenance separately.
This is a controlled methods assay: fixed decision time, no `tick`, bodily simulation, skill growth, or generic outcome expectations. Only acquired methods change between choices. It does not simulate a village, infer new conditions, invent actions, or establish culture or emergent adoption. Discovery means learning from tried actions, not inventing a method. Frozen means frozen evidence, not a frozen RNG.

Budget: 30 seconds total. GO for the existing capability slice requires all three seeds to satisfy: (1) imitation patch choice share over first five dry trials exceeds discovery by ≥0.20; (2) imitation patch share in last five damp trials is at least 0.30 below its first five damp trials and at least 0.20 below frozen's last five damp trials; (3) at least three non-demonstrators choose the now-bad patch after the change; (4) at least three learners retain actual learner-source evidence and at least one chosen action has a positive method term sourced to another learner. Replay the entire assay exactly once and require identical state/RNG/choice digests.
A failure is NO-GO for this configuration, not proof methods cannot learn. If GO, audit whether any missing opt-in HF slice is needed; reuse the published capability if sufficient. No engine change solely to make the criterion pass. Remaining adult practice discovery/generalization gets a dated design follow-up.

## Result

NO-GO for this assay. All three seeds failed criterion 1. No new HF slice.

| Measure, identical on seeds 7 / 19 / 43 | Imitation | Discovery | Frozen |
|---|---:|---:|---:|
| Patch share, first five dry trials | 1.00 | 1.00 | 1.00 |
| Patch share, first five damp trials | 1.00 | 1.00 | 1.00 |
| Patch share, last five damp trials | 0.00 | 0.00 | 1.00 |
| Non-demonstrators choosing bad patch after change | 11 | 11 | 11 |
| Learners retaining other-learner evidence | 10 | 0 | 0 |

Criteria 2–4 passed on each seed. Learner-source evidence contributed positively to actual chosen action scores in imitation. Initial teaching was supplied by the host; subsequent examples were actual peer choices and observed outcomes. No adoption count was imposed. Bad transfer means continuing a previously successful method after an unobserved environmental change. This is not misinformation: the earlier successful demonstrations were true.

The complete nine-arm assay was replayed once with identical full output, final state and RNG digests. Measured assay plus replay runtime: 207.1 ms (Node 26.12.0, Apple Silicon, concurrent population probe). Three seeds yield identical choices because these offers resolve deterministically under the default will settings; they do not provide three independent behavioral replications.

### Method and exact artifacts

Published `@adam0white/human-framework@2.22.0`, registry integrity `sha512-cPKdbCJ69cFNKErcGrxClnJ8CHcNVgN7GtDWa6UvmBewgA3ouxhzV5zntVhEKXYH97NksZMns+0N/68yfdU8dQ==`. Downloaded tarball was checked against that digest. Registry `gitHead` is the exact base source `14b7d6cdcff5b66836f8d97eee38ecc22197741a`. Imports use its `package/dist/index.js`, not the workspace alias. Scratch root: `~/code/.lab-scratch/h3/population-traditions/`. `preregistration.json` records timestamp and original SHA256; the `.preregistered` copy preserves the exact criteria. Preregistration signed commit: `e37e7f4`.

Commands from the worktree:

```sh
export PATH=/opt/homebrew/bin:$PATH
npm pack @adam0white/human-framework@2.22.0 --pack-destination ~/code/.lab-scratch/h3/population-traditions --json
node ~/code/.lab-scratch/h3/population-traditions/traditions.mjs
npm test -- packages/human/test/methods.test.ts packages/human/test/method-alternatives.test.ts
npm test -- --config packages/human/vitest.config.ts --root packages/human test/methods.test.ts test/method-alternatives.test.ts
node packages/human/examples/method-control.ts
node packages/human/examples/method-alternatives-control.ts
```

Harness: `traditions.mjs`; raw choices, method terms, criteria, state/RNG hashes: `traditions-result.json`; terminal summary: `traditions-stdout.log`; package metadata: `npm-pack.json`. One instrumentation correction excluded a learner's own source from the peer-term count. It changed no offers, choices, learning, thresholds or verdict; the final saved output uses the corrected counter.

### Limits and remaining design

The untrained default chooses patch on the first tie. That creates a ceiling for criterion 1, then successful self-experience sustains it. This probe cannot establish an imitation advantage. Do not change offer order after seeing the result and label it confirmation. The assay supplies explanations and observations explicitly, holds physiological time fixed and gives everyone the same cue conjunction. It tests neither autonomous teaching, village-wide adoption, discovering a hidden condition nor novel practices. Adult practices remain distinct from conditional repair procedures.

Existing released methods already retain source-graded successes and failures, guide choices, transfer to matching cues and permit harmful generalization followed by correction. Do not duplicate that slice. Follow-up target 2026-11-15: preregister a balanced offer-identity design and a genuinely observed condition distinction before testing an imitation advantage or proposing adult-practice discovery. Coordinator owns any roadmap/findings entry. Proposed exports: none. No source, old-call semantics or RNG code changed.


### Verification

Existing source headless controls ran successfully: routing taught north/south and sought help for the unreadable case; alternative teaching selected the relay. Withheld, skill-only and removed-rule arms sought help. The alternatives control retained both supported methods, switched after failures, permitted hunger to win and retained support through restore. Logs: `method-control.log`, `method-alternatives-control.log`.

The first focused-test command failed before collecting tests: root Vitest initialized the site, whose declared HF pin 2.21.0 resolved to workspace 2.22.0 in this worktree installation. No source or manifests were changed to hide it. The second attempt waited for the machine lock, then failed because Vitest resolved the relative config against the supplied root twice. The third attempt used absolute config/root paths and the same `npm test` machine lock. It remained queued behind another worker (PID 41652); this worker cancelled only its own waiting lock process (PID 13638). Focused tests are NOT RUN, not passing. No server was started. Logs: `method-tests.log`, `method-tests-isolated.log`, `method-tests-final.log`. No implementation was added, so there is no new behavior test or old-call continuation claim to gate.

Corrected retry command for integration, when the machine lock is free:

```sh
npm test -- --config "$PWD/packages/human/vitest.config.ts" --root "$PWD/packages/human" test/methods.test.ts test/method-alternatives.test.ts
```

## Balanced transmission probe — separate preregistration

This follow-up preserves the original registration and NO-GO above. It addresses independent review §3 in `~/code/.lab-scratch/h3/codex-review.md`. It tests peer-caused harmful transfer in a paired controlled fixture, not village emergence. No probe in this section has run at registration.

### Frozen premises and method

Use the same integrity-checked published HF 2.22.0 tarball and source `14b7d6cdcff5b66836f8d97eee38ecc22197741a`. Seeds 7, 19, 43. Cross two assignments of method identity (`patch` has action/offer id `a` or `z`, replacement has the other) with two offer array orders. Thus four balanced cells per seed, fixed before choices. Labels describe patch/replacement; both offers have duration 5, effort 0.1, repair difficulty 0.6, empty advertisements and `methodContext:repair`. All people have repair skill 0.9, sex female, age 30, now 720, otherwise HF defaults. Person seeds are seed×100 plus identity index. Choice time stays fixed; no tick, finish, generic expectations, body dynamics or skill growth. Both methods work dry; patch fails damp while replacement still works. Only `joint=split` is observed; dampness is hidden. Outcomes are deterministic host facts, never host-selected choices.

Twelve people: demonstrator, relay, ten initially unexposed learners. Only demonstrator receives two authored patch-success examples. It makes two actual dry HF choices and receives own evidence. Relay sees those two actual demonstrator outcomes, then makes two actual dry HF choices and receives own evidence. Relay is the declared taught subset of one; no other learner is directly taught by demonstrator. Record all actual actions, outcomes and evidence edges. If demonstrator/relay fail to choose patch, retain that result and fail the source-path gate; never substitute a host-chosen action.

Then fork each untouched learner into four arms. Every copy receives the identical cue context. Imitation and peer-frozen receive the two actual dry relay examples before their first own choice. Discovery and frozen receive no peer evidence. Only then change host condition to damp and collect first choices in all arms **before delivering any learner's own outcome**. The matched imitation/discovery choices form the pre-own-outcome causal contrast. Record the chosen method terms, full decisions, evidence sources, pre-choice snapshots and RNG. Check that pre-choice state differs only in methods, and paired RNG is equal. Peer-frozen also supplies a separate exposed/no-own contrast; frozen is the genuinely unexposed/no-peer/no-own control.

Continue for ten total damp choices per learner. Imitation and discovery receive their actual own success/failure evidence after every choice; no further peer examples. Frozen receives neither peer nor own evidence. Peer-frozen retains the initial relay evidence but receives no own evidence. Thus frozen means frozen learning evidence, not frozen choice/RNG. All evidence calls use received matching cues, attention 1, distinct event ids, and the actual source/action/outcome. No host adoption counter or forced repair choice. This is deliberately scheduled peer observation of true earlier successes that become misleading after an unseen condition change; it is not false testimony or autonomous teaching.

### Fixed gate, budget and controls

Runtime budget: 10 seconds for assay, complete replay and restore control combined, checked at complete cell boundaries. Free disk must remain ≥5 GB. No optional regression-suite wait or new player round.

GO for this **released conditional-transmission slice** requires all of the following, with no threshold or premise adjustment after execution:

1. In every seed, across its four identity/order cells, unexposed discovery first-choice patch share is exactly 0.50; imitation share exceeds it by at least 0.40. At least 40% of matched learners switch from replacement without peer evidence to patch with peer evidence. Every counted switch has a positive chosen method term sourced to relay, zero own learner evidence before choice, identical pre-choice RNG, and identical pre-choice state outside methods.
2. All cells retain the two real demonstrator→relay and two real relay→learner dry outcome paths; demonstrator and relay actually choose patch for those source events. No learner has demonstrator-source evidence. Each cell has ten initially unexposed learners; exposure occurs only in its two assigned arms.
3. Per seed, imitation's patch share in the last three damp choices is ≤0.10, discovery's is ≤0.10, peer-frozen's is ≥0.90, and peer-frozen minus imitation is ≥0.80. Frozen's last-three patch share stays exactly 0.50. These are assay gates, not calibrated human learning rates.
4. One full exact replay matches all records, final state and RNG digests. Every arm also resumes from snapshot/restore after five damp trials; its remaining decisions and final state/RNG must equal the uninterrupted arm. Reading method evidence must preserve full state/RNG. In the no-peer paired fixture, delivering no example must leave the same ordinary call continuation as its untouched copy.

If GO, audit existing published methods before proposing code. If they already implement this slice, document reuse and propose no faculty/export. A failure remains NO-GO for this balanced configuration; record which gate failed. No conclusion about social culture follows either result. Any further design remains separately dated for 2026-11-15.

### Balanced result

PENDING at preregistration. Timestamp, document SHA256 and exact registered text will be preserved in scratch before the first execution. New instrument: `traditions-that-travel-2026-10-25/balanced-probe.mjs`; runtime output goes only to `~/code/.lab-scratch/h3/population-traditions/`.

### Balanced execution result and released-slice audit

**GO for the preregistered controlled transmission slice.** This does not reverse the original assay's NO-GO. It does not establish village culture or spontaneous teaching.

| Per-seed measure (same on 7, 19, 43; four identity/order cells each) | Result |
|---|---:|
| First damp patch share, imitation / discovery | 1.00 / 0.50 |
| Matched replacement→patch switches caused by the peer-evidence contrast | 0.50 |
| Last-three damp patch share, imitation / discovery | 0.00 / 0.00 |
| Last-three damp patch share, frozen / peer-frozen | 0.50 / 1.00 |

Every counted switch had a positive relay-source term on the chosen action, no own learner evidence, identical paired pre-choice RNG and identical state outside methods. All source-path gates passed: demonstrator actually chose patch twice in dry conditions, relay received those true observations and actually chose patch twice, and learners received only relay evidence in their assigned arms. No learner received demonstrator-source evidence. The no-peer arms remained unexposed at first choice. All first choices preceded own outcomes. The host counted actual `decide` results; it never assigned adoption.

Full exact replay and restore after five damp choices matched all records and final full-state/RNG digests. Method-evidence readers preserved state/RNG; no-peer ordinary call continuation matched its untouched copy. Combined assay/replay/restore measured 1716.7 ms, below the registered 10-second budget. Output digest: `9defbb3ca55ff4a0fc6b034dd96b1a0e77f7e5c4560b289b34d384e71ade5f47`.

Preregistration was preserved at 2026-10-25T17:28:10.958373Z, document SHA256 `574d5b685909872b5302b811f28817642d7cbd6a9e05e10ec50cb59303df4db9`, signed commit `a82ec93`. Scratch `balanced-preregistered.md` preserves the whole doc at that point, including the unchanged original registration/results. `balanced-preregistration.json` records timestamp/hash; `balanced-instrument-before-run.sha256` records the executed source hash. `balanced-result.json` contains full first-choice snapshots, decision records, teaching/own-outcome edges, source events, final methods and full-state/RNG hashes. `balanced-stdout.log` contains the summary. Published package/integrity remain the original pinned 2.22.0 artifacts.

```sh
export PATH=/opt/homebrew/bin:$PATH
node docs/lab/experiments/traditions-that-travel-2026-10-25/balanced-probe.mjs \
  ~/code/.lab-scratch/h3/population-traditions/package/dist/index.js \
  ~/code/.lab-scratch/h3/population-traditions/balanced-result.json
```

**Reuse the released opt-in methods slice. Proposed exports: none.** `receiveMethodCues` explicitly admits observed conditions; `demonstrateMethod` records source-graded success/failure evidence; `decide` consumes its method terms; `snapshot`/`restore` preserve it. The existing API suffices for this fixture's peer-attributable transfer and own-outcome revision. No missing module, engine hook, actor state, shared export or source behavior was identified. The only new code is the self-contained experiment instrument. No HF release or version bump.

Limits: source demonstrations, relay teaching, attention 1, observation delivery and hidden dampness are controlled host premises. The dry source events are true; harmful transfer comes from an unseen change, not a false report. Learners are assigned exposure rather than choosing to watch or teach. Frozen is deliberately unexposed/no-own; peer-frozen is exposed/no-own and isolates persistence of received evidence. Discovery means learning from actual tried actions, not discovering a condition or inventing a method. Arbitrary action ids `a`/`z` balance lexicographic tie preference; labels preserve repair meanings. Identical choices across seeds are deterministic fixture behavior, not independent population replications. No claim of faster learning from peers than discovery follows beyond the isolated first-choice contrast. No physiology, spontaneous network spread or adult-practice inference is tested. Further such work needs a separate registration (design review target 2026-11-15).

Verification for this follow-up is the instrument's focused controls and prose-lane check, with exact output in scratch. No optional regression-suite lock wait, player round, browser or server was started. The original failed/queued optional test attempts above remain historical and unchanged. The ant-farm document is coordinator-owned and was not edited in this follow-up.

## Coordinator integration verification

The corrected candidate passed the full `npm run check:lane` (lint, workspace typecheck,2349 tests passed;7 skipped) in the H3 director tree. Human focused tests4/4, speech protocol Node tests5/5, complete-state/RNG controls and independent Codex/Opus reviews are recorded in `~/code/.lab-scratch/h3/report.md`. Earlier pending worker checks above remain historical; no failed or unexecuted worker check is counted as passed. The final independent Codex review found no blockers in the corrected slices. Exact source/CI/release-queue receipt follows in the director report. No H3 release or new player round.
