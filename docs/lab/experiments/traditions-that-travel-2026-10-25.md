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
