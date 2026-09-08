# Rest and ongoing-work correction evidence

Completed private lane on 2026-09-08; independent lifecycle review and public integration remain root-owned. [Contract](continuous-work-contract.md) · [Public version/migration path](continuous-work-migration.md).

The player-reported restart incentive is reproduced through legal commands from an untouched Common Ground opening. The workbench finishes at 188. Meryem's existing garden stage remains due at 207; release plus request makes a new job due at 202. The old canceled minute keeps its body/practice cost, and the replacement charges another .20 effort. This is a real host timing defect, not a finding that the runtime failed to charge work.

The private derivative preserves the stage's physical fraction and changes only future productivity. Its one-minute overlap completes at 202 without restarting, while total effort for the stage remains .20. Same-minute stop/resume does not refresh bonuses, move practice or discard progress. Accepted takeover at 188 finishes at 201 using the receiving person's own skill; Meryem retains .01 effort and one future-run work minute, and the receiver pays .19 effort across thirteen new minutes. Original migration exposure is separately recorded per actor.

## Four independent arms

All arms start from the same validated minute-187 snapshot and run twenty minutes. Values below are authored simulation outputs, not measurements of people.

| Productivity | Unassigned activity | Garden completion | Meryem fatigue at 207 | Player fatigue at 207 |
|---|---|---:|---:|---:|
| Start snapshot | Active idle | 207 | .8105 | .7405 |
| Start snapshot | Automatic recovery | 207 | .8105 | .2655 |
| Prospective workbench | Active idle | 202 | .8105 | .7405 |
| Prospective workbench | Automatic recovery | 202 | .6855 | .2655 |

The improvement does not depend on automatic recovery. With active idle, equal total stage effort and equal elapsed time give equal final fatigue, while the faster stage earns fewer construction-practice minutes because the work finished sooner. Automatic recovery separately uses the paid available minutes. Food and hunger are identical across these arms; recovery never feeds a person.

Seven legal garden-start overlaps from one through seven minutes preserve original continue/restart times and prospective outcomes. Original restart beats continuing only for overlaps one through five, ties at six, and loses at seven. Prospective completion times are 202, 201, 200, 200, 199, 198 and 198; same-worker stop/resume cannot improve any of them. These are nearby prescribed cases, not a withheld or blind evaluation.

Six minutes of automatic unassigned recovery match six actually paid minutes of the original explicit rest: fatigue .059 versus .209 under active idle, with identical hunger and unchanged skills. Next Event has real completion/recovery-floor stops and an explicit six-minute review horizon. Eating keeps an actor-specific reserved portion and the original eight-minute Common Ground interval; an interrupted meal returns the reservation without granting relief.

## Independent original-source findings and retained correction

Root obtained a focused Fable source review without private player feedback or candidate code. Its capacity concern is verified separately: three legal timber trips followed by 72 paid idle minutes reach minute 120, actual fatigue .77, displayed .75. The view advertises the 22-minute workbench assembly as available; actual execution rejects it (projected fatigue 1.003 versus the visible forecast .983). This original failure remains a characterization test and complete saved counterexample. The private derivative enforces actual capacity; the new public host must resolve misleading availability without relaxing admission.

The simpler finish-current-stage-then-release script preserves the garden stage but still finishes at 207, so it does not fix the prospective workbench problem. It releases the future project while Meryem keeps her newly self-chosen rest. The first evidence runner at source `b6017c1` incorrectly asserted that release would leave her job null. Both Node versions rejected that assertion before any artifacts were written. Source `b7c3dd0` corrects the runner and adds a characterization: at 207 the project is released, the garden stage is complete, and the self-chosen rest has zero elapsed minutes. The original source commit remains; no simulation code was changed to make the comparator pass.

## Source and executable evidence

- Prototype source: `b6017c13bbe2a0d12be001ea86ed40dddf1d46e6`.
- Corrected frozen probe/tests: `b7c3dd0b7c6b96cb4c9e33b13969ff6ac800da82`.
- [Node 26 report](../artifacts/continuous-work/b7c3dd0-node26/report.json) and [manifest](../artifacts/continuous-work/b7c3dd0-node26/manifest.json).
- [Node 22 report](../artifacts/continuous-work/b7c3dd0-node22/report.json) and [manifest](../artifacts/continuous-work/b7c3dd0-node22/manifest.json).
- Each run has twenty hashed JSON payloads plus its manifest. All forty payload hashes were rechecked, and the reports are identical after removing runtime-environment metadata. Saves replay through the source-authoritative importer during both probe runs.
- The reports bind the original host, both Human versions, runtime/clock/model, release locks, fixture, runner and tests by SHA256 to the exact committed source. The runner refuses uncommitted source and refuses to overwrite evidence directories.

Run `/opt/homebrew/bin/node scripts/continuous-work-probe.js <new-output-directory>` from this lane's worktree. For historical reproduction, check out the frozen source commit first. No execution depends on an LLM or external service.

## Verification and limits

619 repository tests pass on Node 26.8.1; all 25 lane tests pass on Node 22.0.0. [Verification record](../artifacts/continuous-work/verification.json) includes complete logs. The build remains 81 files, 54 static modules, 88 import edges and public payload SHA256 `0f158916458dcfc8fb381fb61db3f8f571494b1311ee905dabe1920a80918709`. Original hosts, web files, runtime/model and locks are unchanged. There was no push, deployment or public bug-fix claim from this lane.

The private host accepts only idle/assembly imports and deliberately rejects active gather/rest/meal jobs. It has no accepted-project controller, gathering API, Rain wrapper or full game interface. Its 240-minute/512-command limits and replay validation are suitable for this continuation fixture, not evidence of an unbounded campaign architecture. Public Common Ground 0.2/save 2 remains a concrete next implementation with complete mixed-job migration and independent review required before selection. Physical rounding at the last work minute and the hypothetical stage takeovers remain explicit host choices. The existing five-person usability gate, physiological calibration and wider theory claims remain open.
