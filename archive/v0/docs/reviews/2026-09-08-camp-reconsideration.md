# Camp reconsideration: independent agency and comparison review

Review begun 2026-09-08 before final comparison execution; correction recheck and independent replay completed 2026-09-09. Lens: accepted work, event ownership, conservation, explicit policy-intervention initialization and serious controls. **No remaining source or protocol blocker; all twelve frozen comparison records independently reproduce on minimum Node 22.0.0.** Seven corrected focused tests passed independently on Node 26.8.1. The result is qualified evidence for these selected policy interventions, not a promotion or general service-improvement finding.

## Findings and corrections

1. **Initializer immutability assertion uses an unrelated input.** In `tests/camp-reconsideration.test.js`, the first test stores `before`/`saved`, then invokes `imported(beforeCancel())`, which creates another export envelope. Comparing `before` with `saved` afterward does not establish that `fromBaseline` preserved its actual input. Pass `before` directly to `candidate.fromBaseline(before)` and retain the version-only output comparison. The host itself validates/copies through baseline restore/export, so no actual input mutation is demonstrated. This is a focused assurance correction, not an additional evaluation case.

2. **Rejected reviewer suggestion: do not invent an impossible body-capacity refusal.** I initially suggested testing whole-assembly capacity refusal while hunger/fatigue remain below the candidate's explicit needs guards. Source inspection rejects that proposed fixture: remaining assembly duration is at most 28 minutes and declared remaining effort at most .2. With fatigue below .68 and hunger below .65, their completion projections are below `.68 + .0015*28 + .2 = .922` and `.65 + .002*28 = .706`, respectively. Thus this particular capacity refusal cannot occur under the unchanged task rules. Root was notified before any such test was added. The general `unavailable` call remains defensive for other boundaries; the already labeled needs/recovery guard tests are relevant implementation checks.

3. **Distinguish the nominated cancellation from historical prefix cancellations.** The initial final protocol and administrative scope said no player cancellation is executed during administrative verification. The runner actually replays all 16 original C1 commands, including the player's earlier cancellation at minute 71. Only the nominated endpoint cancellation at 85/86/93/100 remains unexecuted. Narrow the wording to that endpoint, preserving the already explicit history. This is a provenance-description correction; it does not change the four timings, physical prefixes or controls.

## Candidate source review

The diff from `src/games/camp-current.js` to `src/experiments/camp-reconsideration/host.js` contains relative imports, the explicit `0.3.1-reconsideration.0` host identity, one helper, one cancellation hook and `fromBaseline`. Existing physical calculations, limits, model, runtime, save envelope and state fields are unchanged.

- **Trigger:** `host.js:258` captures an actually active player assembly, successfully stops it, invokes the helper only for that released project, then resumes ordinary neighbor policy. A failed player stop throws before reconsideration. Generic ticks, fixed player cancellations and other command types do not call the helper.
- **Agency and scope:** `host.js:143–147` requires unfinished physical work in Meryem's existing accepted project and her own fixed timber/salvage trip. Meals, food gathering, another commitment and another actor's work are outside the trigger. Her existing hunger, fatigue and recovery criteria can keep the trip underway. The rule operates on current shared work/material facts and her own task/body/commitment; it does not infer hidden intent or acceptance of a new project.
- **Guard and transaction:** lines 148–150 stop only a copied own task and use unchanged `blueprint`/`unavailable`; rejection never applies that copied stop to real state. Lines 151–152 use the unchanged real stop and begin operations only after feasibility. Public API commands already operate on a copy and validate before returning, preserving the caller's state on failure.
- **Conservation:** unchanged stop preserves the person's elapsed body/practice, paid ledgers and effort, cancels the owned completion event and gives no unfinished gathering output. Beginning retained assembly reuses its installed materials and worker basis. Reconsideration adds no elapsed minute, ration, stock, paid practice or physical progress by itself. It changes which real work is paid next. The zero- and three-paid-minute tests check these boundaries without comparing project completion objectives.
- **Event repetition:** reconsideration has no time-loop hook. Once the player assembly cancellation succeeds, another identical cancellation finds no player job and refuses; zero-time advances do not reproduce the switch. This covers automatic repetition, not a blanket claim that all deliberate sequences of fresh user commands are costless or impossible.
- **Initialization:** `host.js:472–474` restores and exports the baseline envelope, changes only `game.version`, then validates through candidate restore. `docs/camp-reconsideration-candidate.md` correctly identifies this as a policy intervention on a baseline-produced paid prefix. It does not establish an always-active candidate history, which could diverge at earlier cancellations in that prefix.

## Comparison implementation inspected before execution

`artifacts/camp-reconsideration/cases.mjs` prespecifies four timings with 0, 1, 8 and 15 minutes of Meryem's supply trip paid, a common horizon of 240, and the unchanged finish-current, baseline release/re-request and automatic candidate arms. Zero payment is explicitly known development evidence. The 15-minute timing is a negative-result hypothesis, not an already demonstrated control victory or a selector to be replaced if it fails to win.

The runner replays the baseline C1 prefix against every original state/view, then pays only the prespecified additional minutes. Its administrative checks establish the still-active player frame, accepted woodshed, underway salvage with the specified paid duration, unfinished tools, needs and released-frame feasibility. Administrative mode does not execute the nominated cancellation or compare arms. This review read that code but did not execute administrative prefixes.

Comparison mode checks committed source/prefix hashes, replays the same frozen baseline prefix for every arm, and records both sides of the version-only candidate boundary. The candidate is not claimed to have generated that prior history. Each arm first cancels the player's assembly. Only the explicit existing intervention also issues `release` then `request(shelter)` on the baseline host. Existing `release` stops Meryem's own timber/salvage trip; request re-enters normal accepted-project and needs behavior. Its forfeited output and positive paid costs therefore remain real. Do not reduce the existing control to an unavailable instruction or omit its two-command cost.

Every arm then performs the same player garden/food sequence and pays the continuation through 240. The runner tracks frame and roof completion, useful player garden/food arrivals, complete stocks, installed and pending work, contributions, both people, paid ledgers, commitments and refusals. Evaluating an earlier frame alone would ignore the supply/output and roof consequences the preflight explicitly requires. A reduction in user command count is distinct from improved service, and these selected timings cannot establish universal policy superiority.

## Initial executed scope and source identities

At the initial pre-freeze stage I read the preflight/candidate documents, entire candidate-versus-baseline diff, related baseline planning/cancel/release/hand-over/validation source, the cases and comparison runner, and all seven focused tests. Ran only `node --test tests/camp-reconsideration.test.js`: seven passed, zero failed, on Node 26.8.1. Those tests include one known development boundary, its three-minute implementation variation and explicitly labeled structural needs/food guards. No comparison arm, completion objective, administrative prefix mode, browser game or new opportunity was executed during that initial stage. The later authorized recorded-history replay is separately described below.

Repository baseline: `905d6ce03365fc0e801993ae80cfd258bce21725`. Initial inspected source hashes:

| File | SHA-256 |
|---|---|
| `src/games/camp-current.js` | `73a535b879e552c7d1bcbd592b82cb751362f42ee7eeb95ad16f8f4473d69d9a` |
| `src/experiments/camp-reconsideration/host.js` | `e26777ef45b35415175a5eaa9211585d1847facba3dc78a632cffa4224cd34e6` |
| `tests/camp-reconsideration.test.js` | `c39ab9dac1e23a9ccdbafa7871e2f8c7f0a1d59e27f7ddd43a658dec4299a312` |
| `docs/camp-reconsideration-candidate.md` | `1f6cd9cf0686033cadc4c7e4561b15ba8021ecee66176734c6f57822a378ff26` |
| `docs/camp-reconsideration-preflight.md` | `4b5f5ec9495ff3082e9c2d491da8a68e2b681da497e96eae1351c6554ea22838` |

## Protocol and correction recheck

The final protocol became available during this review. Its four cancellation timings, unpaid-trip/remaining-frame table, three named controls, common garden/food continuation and minute-240 horizon agree with `cases.mjs` and the inspected runner. Both frame and roof are primary project observations, missing completion remains explicit, paid cancellation losses are preserved, R15 remains a negative hypothesis without replacement/tuning, and the version-only shared-baseline intervention is stated repeatedly. No unsupported universal, causal-human or always-active-prefix claim was found. The administrative summary reports all four prescribed prefixes legal and no failure; I inspected those reported checks without executing or independently replaying those records.

Root corrected finding 1 by passing the actual `before` envelope to `candidate.fromBaseline(before)`. I reread that call and independently reran the seven tests on Node 26.8.1: all seven pass, zero failures. Test SHA-256 after the repair is `f91018a5a05593c5729bd7786e3c84df3b784360c955c44e40f8c6075176c3fd`. Candidate host bytes remain `e26777ef45b35415175a5eaa9211585d1847facba3dc78a632cffa4224cd34e6`. Root reports minimum-Node-22 verification separately; I did not execute that runtime in this lane.

Protocol inspected before the endpoint-wording correction: `a31ebdd8871184ac6e1302d44c7dc8e3ea965539136fe96826066c42d6bf4de4`. Cases: `b1e2c2dc5a3a01464f664c840656d0407b1ab611ae4128f29302d614a1b00609`. Runner: `59c5eecffb22a0f4234d50696c7363636f61108ae99d7adb0c45c72f328052a3`.

On 2026-09-09 I independently reread the corrected protocol and runner: the administrative statement now refers only to the nominated endpoint cancellation, explicitly retaining the earlier C1 cancellations, and the check is named `endpointPlayerCancellationExecuted`. I also compared all four original and corrected compressed administrative records. They are exactly equal after only renaming that one descriptive field; their complete operations, physical states, views, summaries, marks and refusals remain exact. Finding 3 is resolved. Corrected protocol SHA-256: `0ebb0af0e99bd01eba3cbba4e0dc3b6615b60539d3bf55755c4d973ba76e6d1f`; corrected runner: `6b5014099a760dedfccfb0a25e89e14885302f3289d8b09d92f9d5d45534931e`. Candidate and corrected test hashes remain as recorded above.

The independently authored `artifacts/camp-reconsideration/verify.mjs` imports only frozen baseline/candidate/runtime API source, never the comparison runner or its case module. It checks exact recorded prefixes and suffixes, states/views/restores, version-only boundary inputs/outputs, prescribed operations, completion and intervention marks, fixed-task receipts, summaries and refusals. Its preparation-stage syntax check passed without executing the comparison; the recorded-history verification followed only after root's explicit completion signal, as described below.

Root reports that the separate default-Claude source-review attempt timed out at 240 seconds with empty output and no verdict. It is not counted as a completed independent review. The source and replay claims in this document come from this lane's actual inspections and executed checks.

## Completed independent recorded-history verification

After root confirmed source commit `d94666469cc3c2bcb496069193e28d4fafd0c0d8`, committed freeze `e751463`, and the successful initial twelve-record run, I executed the independent verifier once on **Node 22.0.0**. It passed on the first attempt, with no source, outcome or frozen-runner correction. [Exact audit](../../artifacts/camp-reconsideration/verification-node22.json) · [Independent verifier](../../artifacts/camp-reconsideration/verify.mjs).

```sh
/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/human-node22-review-xnBFhK/node-v22.0.0-darwin-arm64/bin/node \
  artifacts/camp-reconsideration/verify.mjs \
  --freeze artifacts/camp-reconsideration/freeze.json \
  --summary artifacts/camp-reconsideration/run-initial/summary.json \
  --out artifacts/camp-reconsideration/verification-node22.json
```

The audit verifies committed freeze/source identities before importing a temporary frozen API graph. It checks four administrative prefixes, all twelve comparison suffixes and their twelve embedded baseline-prefix replays: **2,228 exact state/view/restore checks**, **2,200 recorded operations**, **48 completion marks**, **96 stored fixed-job completion entries**, **zero refusals**, and **four exact version-only candidate boundaries**. Counts include repeated checks of shared prefixes; they are not additional conditions, participants or independent samples. All prescribed operations, output summaries and retained refusal arrays reconstruct exactly. The real initializer input remains unchanged.

The original baseline prefix includes multi-minute commands. Its stored fixed-job catalog records completions only when a job ends at a recorded command boundary; it is not an exhaustive event catalog for the interior of those large advances. The verifier checks that catalog as actually defined, plus every full recorded prefix state/view. The comparison suffixes use one-minute advances, so their fixed-job completion records and frame/roof/garden/food marks cover the evaluated continuation boundaries. Do not extend the verified suffix-event claim to an exhaustive historical-prefix event log.

Verified completion observations:

| Paid salvage minutes before intervention | Finish-current frame / roof | Manual release-request frame / roof | Automatic candidate frame / roof |
|---|---|---|---|
| 0, known development case | 135 / 191 | 101 / 191 | 101 / 191 |
| 1 | 134 / 189 | 101 / 191 | 101 / 191 |
| 8 | 127 / 170 | 101 / 191 | 101 / 191 |
| 15 | 120 / 163 | 101 / 191 | 101 / 191 |

Thus the early-frame benefit is real, but it does not establish faster whole-project completion: finish-current completes the roof 2, 21 and 28 minutes earlier in the three positive-paid cases. Candidate and manual control have identical reported frame, roof, garden and player-food completion times within each case; the manual route adds two explicit player commands. This statement is about those verified timings, not a claim that every metadata field or every conceivable outcome is identical. Full paid/body/material/ownership records are independently reproduced and must remain part of root's admission decision. No additional timing, condition, policy variant, external review or public change was introduced in this verification lane.

Verification identities: freeze SHA-256 `e8dae473f4a4f2ba4d6ac43a775953d8f5d2ec5d3c7747eabf798eca16523b14`; initial summary `b7d3d26c4735c8806f223c395a87223ecfe36c7a37c2abddb520c566b725e9d6`; verifier source `48e0130fc7980584592a301c1ff05ff942d9100d7bbe8c54172d692155107939`.
