# Released frame versus an underway salvage trip

This protocol fixes a private boundary comparison for [the reconsideration preflight](camp-reconsideration-preflight.md). It is written before any comparison arm is executed or inspected. The comparison designer has not read the candidate implementation. Root owns the candidate, review, committed freeze, comparison execution and admission decision.

## Question and source boundary

After the player stops a woodshed frame, should Meryem interrupt her own salvage trip to resume the released frame of her accepted project? Earlier frame completion is only one outcome: the salvage output, roof, other work, resources and both bodies remain consequential. This study compares existing controls before crediting a candidate with an improvement.

The baseline is Camp 0.3.0 at source commit `905d6ce03365fc0e801993ae80cfd258bce21725`, with unchanged Human/runtime 0.1.1, clock 0.1.0 and model coefficients. Its host SHA-256 is `73a535b879e552c7d1bcbd592b82cb751362f42ee7eeb95ad16f8f4473d69d9a`. The transitive graph is `src/games/camp-current.js`, `src/core/model.js`, `src/runtime/index.js`, `src/human/v0.1.1.js` and `src/runtime/clock.js`. The runner materializes those exact Git bytes after checking current workspace hashes.

The existing [C1 corrected paid prefix](../artifacts/practice-incentive/construction/prefix-corrected.json), SHA-256 `031eb135d8f135fbe589decb970406a15b9ceda8e2cedc584d4ea7034713d852`, is the starting history. Every administrative case replays its 16 commands from default `createGame()` and compares all complete snapshots and ordinary views exactly. This retains the earlier handovers, player's recovery, Meryem's real timber trips and the documented prior C1 timing correction; it does not invent an earlier history.

At the C1 boundary, minute 84, the player holds the unfinished frame, Meryem is unassigned, the shared stock is four timber, one salvage and four food, and the workbench table and first garden stage are complete. After the next paid minute, Meryem begins gathering salvage for the roof while the player continues holding the frame. The source schedules that trip from 85 through 106. No tools complete in this comparison.

**This is a shared-baseline boundary comparison, not a full fresh candidate-policy rollout.** All pre-cancellation history is produced by the unchanged baseline. Root's candidate API `fromBaseline(snapshot)` accepts the ordinary baseline snapshot and changes only the explicit host version to `0.3.1-reconsideration.0`. The runner asserts that its exported snapshot is exactly the original with that one version field changed. The candidate's earlier always-on behavior could change the historical prefix, especially earlier player cancellations; this study makes no equality claim about such a rollout.

## Four fixed cancellation timings

From the same minute-84 baseline history, pay `1+p` more player construction minutes while Meryem follows the unchanged policy. The administrative endpoint is immediately **before** the player cancels. No nominated endpoint player cancellation or policy-comparison control is executed during administrative verification; the earlier C1 prefix cancellations are replayed.

| ID | Salvage minutes already paid, `p` | Player cancellation minute | Salvage time still unpaid | Source-derived frame time remaining | Role |
| --- | ---: | ---: | ---: | ---: | --- |
| `R0-known-zero` | 0 | 85 | 21 | 16 | The already known C1 development case. |
| `R1-paid-one` | 1 | 86 | 20 | 15 | First positive sunk gathering minute. |
| `R8-paid-eight` | 8 | 93 | 13 | 8 | Interior positive-payment timing. |
| `R15-paid-fifteen` | 15 | 100 | 6 | 1 | Substantive negative hypothesis: finish-current may protect useful salvage and roof timing. |

The player's frame would complete at 101 if continued, so each nominated cancellation precedes completion. Administrative verification must confirm actual ongoing player frame assignment, Meryem's accepted woodshed project and own pending salvage trip, its exact start/end/elapsed time, unfinished installed frame progress, workbench stage one, and first garden stage only. It must also check, without changing state, that Meryem's actual body can pay the released frame's remaining effort/time and that current hunger/recovery needs do not prohibit her immediate work. These checks use the released capacity calculation and the retained worker basis, not a hand-edited person or a candidate action.

R15 is a **negative hypothesis, not a guaranteed loss**. The nearly completed trip can deliver three salvage, while cancellation grants none and retains all fifteen paid gathering minutes and effort. That salvage is useful for the roof after the player's garden reserves the currently free salvage. Whether frame timing, roof timing and body recovery make finish-current preferable must be observed after the freeze. If the candidate wins, loses or ties, retain that outcome; do not retune the timing or search for a replacement negative case. No additional timing case or separate feasibility guard is included in this comparison.

## Three controls at each identical endpoint

| Arm | API and exact intervention commands | Meaning |
| --- | --- | --- |
| `finish-current` | Baseline: `{type:'cancel'}` for the player's active frame. | Existing policy retains Meryem's underway salvage trip until its actual completion. |
| `release-and-rerequest` | Baseline: player `{type:'cancel'}`, then `{type:'release'}`, then `{type:'request',project:'shelter'}`. | Existing explicit player intervention; retain its actual consent response and subsequent policy. |
| `automatic-reconsideration` | Apply candidate `fromBaseline` at the same pre-cancellation snapshot, then candidate `{type:'cancel'}`. | One event-triggered private rule may reconsider only Meryem's own timber/salvage trip for her accepted released work. |

The unchanged host's `release` requires an accepted project and stops Meryem's current job unless it is her owned `eat` or `forage`; the release then changes the commitment to released. A fresh `request` is separately evaluated, records acceptance/refusal and runs her ordinary needs/project policy. All these controls cost zero simulation minutes, but release/re-request requires two additional player commands and changes commitment/cancellation/start records. Those differences remain in the evidence. They are not a measured user-effort cost or a new free physical service.

The manual intervention is not patched to force acceptance or completion. A valid request refusal is recorded and ordinary continuation proceeds; a thrown command error terminates that arm and preserves its full input/state. No control directly assigns Meryem, changes her body, gifts materials, preempts her meal or fabricates a receipt. Candidate behavior and manual control are compared as implemented, including any different owned-needs decision.

## Common continuation and outcomes

Immediately after the intervention, the player starts the second garden stage, completes it, starts one actual food trip benefiting from the completed garden, completes that trip, then remains available and pays automatic recovery until **minute 240**. Meryem keeps her actual accepted project, independent needs and subsequent work throughout. Completion loops advance one actual minute at a time and stop with preserved failure if a prescribed player job cannot finish by the horizon. They do not try alternate tasks or repair failed schedules.

Minute 240 is a fixed observation horizon, not a newly invented game deadline. Both frame **and roof** completion times are primary project observations. If either remains unfinished, retain its actual partial work and mark its completion time absent. Also record garden completion, the player's enhanced food arrival, every actual completed gathering/meal job, shared free stock, installed materials, ongoing jobs and remaining time, ownership/contributions, commitments/refusals, bodies, skills, paid practice, effort, recovery, elapsed time, cancellations, consumed portions and earned outputs. Earlier frame completion alone does not establish a net benefit when a useful trip is forfeited or the roof is delayed.

The cases differ in how much actual player frame work and Meryem gathering have occurred before cancellation. Compare arms within each case first. The four selected timings are neither independent human samples nor a broad policy-performance estimate. The already known R0 case is explicitly developmental evidence. Any candidate equality with release/re-request distinguishes removal of redundant player interaction from improved physical service/output.

## Frozen artifacts and replay

Definitions are in [cases.mjs](../artifacts/camp-reconsideration/cases.mjs); the [runner](../artifacts/camp-reconsideration/runner.mjs) imports the baseline for administrative verification and imports the candidate only in guarded comparison mode.

```sh
/opt/homebrew/bin/node artifacts/camp-reconsideration/runner.mjs \
  --prefix artifacts/camp-reconsideration/administrative-corrected

/opt/homebrew/bin/node artifacts/camp-reconsideration/runner.mjs \
  --run COMMITTED_FREEZE.json NEW_COMPARISON_DIRECTORY
```

Administrative output comprises compact `prefixes.json` with source hashes, exact pre-cancellation snapshots/views, feasibility checks and a hash/link to lossless `prefix-records.json.gz`. Every complete baseline command/state/view sequence is in that compressed record. All four nominated prefixes are preserved, including any failure; a failure does not authorize another timing or correction without root's explicit decision.

The committed freeze contains `files:[{path,sha256}]` covering the case definitions, runner, this protocol, baseline dependencies and the candidate's entire source graph, plus `prefix:{path,sha256}` binding `prefixes.json`. The linked compressed prefix record must also match its hash and committed Git bytes. The runner verifies committed/current identities before importing the frozen candidate graph. Root's candidate source must supply the agreed API/version; no candidate implementation was inspected to choose the timings or controls.

Comparison output comprises compact `summary.json` with source identities and a hash/link to lossless `comparison-records.json.gz`. Each detailed record contains its full baseline-generated prefix, explicit unchanged/version-only boundary input and output, every continuation operation and initial/resulting state/view, frame/roof and other completion marks, fixed-job output/cost records, and actual refusals. Operations use `{kind:'command',value}`, `{kind:'advance',minutes}` or `{kind:'next'}`. The API and version transition are explicit, so root can replay the baseline prefix, apply only the named boundary adapter and replay the appropriate suffix. Outputs are new files/directories only; all initial failures and pre-comparison corrections remain attributable.

No comparison arm may execute until root commits the final source/protocol/prefix freeze. Root owns the independent replay and source-specific admission decision. A broad planner, shared cognition export, physiological claim or public behavior change is not presumed by this private experiment.

Pre-freeze administrative wording correction: the original labels were too broad because the inherited C1 history includes a player cancellation at minute 71. Only the four nominated endpoint cancellations were unexecuted. The original administrative artifacts and exact original runner/protocol sources remain; corrected labels are reproduced separately without changing any physical prefix or analysis decision.
