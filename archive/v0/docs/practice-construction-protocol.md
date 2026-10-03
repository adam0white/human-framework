# C1: construction practice before a newly admitted garden stage

This is the single construction nomination under [the bounded practice preflight](practice-incentive-preflight.md). The other lane owns gathering opportunities. No construction alternatives may be searched after this nomination, and no comparison arm may run before root commits the source, exact administrative prefix, objective and controls below.

**Administrative status:** the one nominated minute-83 prefix failed its final handover, before any comparison arm ran. Its 15 successful commands and complete snapshots/views plus the failed 16th command are preserved in [the original prefix record](../artifacts/practice-incentive/construction/prefix.json). Meryem starts the new timber trip on the paid tick at 69 after the earlier handover, so its visible arrival is 84. At 83 she is still gathering and the new garden stage lacks timber. The nominal source reasoning below used an incorrect start at 68. Root has authorized exactly one pre-comparison correction: change the final available advance from 12 to 13 minutes, ending at 84. No comparison arm or alternate nomination has been executed. The exact runner and protocol bytes for that failed attempt remain in `artifacts/practice-incentive/construction/initial-prefix-source/`, matched to the original recorded hashes. The corrected prefix is written to a separate artifact; no further correction is authorized.

## Source-derived opportunity

Current Camp 0.3.0 starts construction skill at .05 and credits actual paid construction minutes with the released practice calculation. Source gives the first `floor(skill*4)` threshold after 46 cumulative construction minutes: 45 minutes remain below .25, while 46 exceed it. A worker's basis is latched on their first participation in a stage. This nomination reaches 45 player construction minutes, with ongoing woodshed work available for one further useful minute and a **newly admitted garden stage** not yet assigned to either worker.

The nominated default prefix ends at minute 84. The player has completed the workbench table and first garden stage, and owns a partly completed woodshed frame. The workbench tools remain unfinished throughout every control. Thus a changed garden quote cannot be attributed to a workbench boost. The intended later consequence is a new garden-stage quote of 26 minutes before the threshold versus 25 after crossing it. No arm attempts to refresh an already latched basis by restarting the same stage.

This is a deliberately selected ordinary command history, not a sampled human strategy or an optimal way to establish camp. Meryem gathers and contributes to her accepted project, and two consent-based handovers are explicit. The prefix's player stop/recovery and the release of Meryem's earlier garden commitment remain paid events; they are not hidden state interventions. No actor/body/skill/resource edit, legacy migration or custom `createGame` option is allowed.

## Exact shared prefix

Every trajectory starts from `createGame()`. The complete executable command list is fixed in [the runner](../artifacts/practice-incentive/construction/runner.mjs), using `applyCommand`, `advanceGame`, `advanceToNextEvent`, `getGameView`, `exportGame` and `restoreGame` from the current host. Its 16 commands are:

1. Start the workbench table; ask Meryem for the garden.
2. Advance 22 minutes, then four minutes of available player recovery.
3. Start player salvage gathering; advance six minutes to 32.
4. Release Meryem's garden commitment after her two paid timber trips. Any just-started next trip's real reservation, paid zero-minute status and cancellation remain in the snapshot.
5. Advance 16 minutes to the player's actual salvage output at 48.
6. Start the first garden stage; ask Meryem for the woodshed.
7. Advance 20 minutes to 68, then request an accepted handover of her remaining woodshed work to the player.
8. Pay three player construction minutes to 71, stop, and pay thirteen minutes of available recovery while Meryem's actual timber trip continues.
9. At 84, request an accepted handover of her resumed woodshed work to the player.

The administrative-only run must confirm actual clock 84, exactly 45 player construction minutes, structures `{shelter:0,workbench:1,garden:1}`, active player woodshed assignment, its retained player duration basis of 24, unfinished physical progress, no admitted second garden stage, and the ordinary 26-minute garden quote. Any refusal or failed assertion is preserved and returned to root; it does not authorize trying a revised prefix. Expected resource arrivals, body feasibility and handover consent are claims to verify, not injected setup values.

Physical source is pinned to Git commit `fe540daccd5e6e5e81ce850f2aef4baab902fca3`. The runner discovers the current host's entire literal relative import closure from that commit, hashes every file and checks it against current workspace bytes before importing a temporary materialized copy. The graph comprises `src/games/camp-current.js`, `src/core/model.js`, `src/runtime/index.js`, `src/human/v0.1.1.js` and `src/runtime/clock.js`; the administrative prefix records their exact SHA-256 values. The runner never imports a changing workspace host.

## Objective, interval and controls to freeze

The player objective is to finish the garden and complete one actual food trip using its enhanced output. Record the garden completion and first enhanced food arrival times, then retain all ongoing people/work/resources at the common observation minute **160**. Minute 160 is a comparison observation time, not a newly invented game deadline or service obligation. Subsequent player time pays automatic recovery; Meryem keeps her independently accepted woodshed project and actual policy throughout.

| Arm | Decision at the common prefix | Subsequent player actions |
| --- | --- | --- |
| `finish-woodshed-first` | Finish the currently useful woodshed frame. | Start the new garden stage, complete it, complete one food trip, recover to 160. |
| `garden-immediately` | Stop the woodshed and preserve its installed work. | Start the new garden stage immediately, complete it, complete one food trip, recover to 160. This is the direct useful-alternative control. |
| `one-minute-construction-then-garden` | Pay one further useful woodshed minute, then stop. | Start the new garden stage, complete it, complete one food trip, recover to 160. This is the partial-work/training contender. |
| `one-minute-recovery-then-garden` | Stop and pay one minute of available recovery. | Start the new garden stage, complete it, complete one food trip, recover to 160. This exposes the cost of substituting work for recovery. |

The source-derived expectation is that a one-minute improvement to the newly admitted garden stage can offset the preceding additional woodshed minute. That arithmetic is **not an executed comparison result**. A tie on garden/food timing with more retained woodshed work would still carry real additional effort, body consequences and possibly different Meryem completion/arrival times. Finishing the frame produces a real additional completed stage and cannot be reduced to its later garden duration. The comparison must preserve those different bundles rather than rank all arms by a single output.

At new garden admission, retain exact skill, paid construction total, actor identity, newly latched duration, material reservation and workbench status. At every action, retain complete game snapshots and ordinary views, both actors' body/skill/pending state, paid effort/practice/recovery, current stock, completed structures, unfinished physical work and contributions, reservations, receipts, commitment/handover responses and time. No practice-freeze diagnostic is included; none is needed to calculate the exact quoted-duration threshold from released source. Changed end scores alone do not identify learning's effect.

## Execution and replay boundary

Administrative prefix verification only:

```sh
/opt/homebrew/bin/node artifacts/practice-incentive/construction/runner.mjs \
  --prefix artifacts/practice-incentive/construction/prefix-corrected.json
```

After root commits a freeze, the comparison command is:

```sh
/opt/homebrew/bin/node artifacts/practice-incentive/construction/runner.mjs \
  --run COMMITTED_FREEZE.json NEW_COMPARISON.json
```

The committed freeze must contain `files:[{path,sha256}]` binding this protocol, the runner and all five physical dependencies, plus `prefix:{path,sha256}` binding the exact committed administrative prefix. The runner checks the freeze itself and all listed files against committed HEAD and current bytes. Each arm replays fresh creation and all 16 prefix commands and compares every prefix snapshot/view exactly to the frozen administrative record before diverging.

The prefix artifact contains `{trajectory:{commands,states,views,summary,refusals,...},...}`. Comparison output contains `{trajectories:[...],...}`. Command records use `{kind:'command',value}`, `{kind:'advance',minutes}` or `{kind:'next'}`; `states` and `views` contain the initial state plus one entry per successful command. Refusals preserve the attempted command, exact input or resulting refusal state, ordinary view and reason. Failures are saved to a fresh output before throwing, and no earlier output may be overwritten. This is private analysis evidence, not a new host journal or public schema.

Root owns the committed freeze, comparison execution, independent replay, UI inspection and final admission decision. An exact quote improvement can justify explaining an existing consequence, but does not itself establish an unwanted incentive, a biological learning law or a need for new runtime mechanics.
