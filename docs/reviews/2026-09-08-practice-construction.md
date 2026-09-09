# Independent review: C1 construction practice

The frozen C1 records demonstrate a real one-minute improvement to a newly admitted garden stage, but no unwanted incentive or rule inconsistency. The partial-work contender ties the immediate productive alternative on the stated garden-and-food objective. It also changes Meryem's work sequence substantially. Preserve those differences; an identical minute-160 inventory is not an identical history or a learning-only comparison.

## Scope and evidence

Reviewed the [frozen construction protocol](../practice-construction-protocol.md), [initial comparison](../../artifacts/practice-incentive/construction/comparison-initial.json), [original administrative prefix](../../artifacts/practice-incentive/construction/prefix.json), [corrected prefix](../../artifacts/practice-incentive/construction/prefix-corrected.json), runner and current physical source. I did not author C1. No additional trajectory, alternate policy, runtime intervention or synthetic case was executed for this review.

Read-only reconciliation matched all five recorded physical-source SHA-256 values to current bytes, checked four command/state/view array lengths, reconciled 27 marks with their corresponding complete snapshots, confirmed no comparison refusals, and independently checked each new garden duration against the source formula. Root owns the separate complete API replay on minimum Node 22; this review does not claim that replay as its own work.

## Observed timing and attribution

All four arms begin at the corrected minute-84 prefix. The player has 45 paid construction minutes and construction skill `0.24820627489919536`; no second garden stage has been admitted. The workbench is only at stage one throughout all four records, so its six-minute tool benefit never applies. The same worker's old woodshed basis remains 24; it is never refreshed by restart.

These times come from `new-garden-stage-admitted`, `garden-complete` and `first-enhanced-food-trip-complete` marks; frame completion comes from the retained woodshed receipt.

| Arm | New garden admitted | Latched garden minutes | Garden complete | First enhanced food arrives | Woodshed frame complete |
| --- | ---: | ---: | ---: | ---: | ---: |
| Finish woodshed first | 101 | 25 | 126 | 140 | 101 |
| Garden immediately | 84 | 26 | 110 | 124 | 101 |
| One construction minute, then garden | 85 | 25 | 110 | 124 | 135 |
| One recovery minute, then garden | 85 | 26 | 111 | 125 | 101 |

The contender's one actual woodshed minute raises paid construction to 46 and skill to `0.2521054556137119`. The new garden basis is therefore `26 - floor(skill*4) = 25` rather than 26. The relevant [source](../../src/games/camp-current.js) latches this basis on first participation; body state does not enter that duration formula. All four garden attempts are admitted and complete. Consequently, the quote difference is directly attributable to the implemented practice threshold without an additional ablation. That does not make the entire subsequent trajectory a controlled comparison of learning alone.

Against the same one-minute recovery delay, the contender completes both garden and food one minute sooner, but arrives at the garden with player fatigue about `.50583` instead of `.47250`. Against **garden immediately**, its extra minute is exactly offset by the shorter garden stage: both deliver enhanced food at 124. Both also end with 71 paid player construction minutes and the same player construction skill. The contender has rearranged which work received one of those minutes; it has not created additional terminal practice for free.

## Other-person work and physical costs

The important hidden cost is Meryem's different accepted-project continuation. Immediate cancellation at 84 makes her resume the unfinished frame, completed at 101. If the player keeps the frame for one more paid minute, Meryem's controller instead starts a salvage trip at 85 for the next woodshed stage while the frame is occupied. The record retains that trip to 106 and her later recovery; she resumes the frame at 119 and finishes at 135. This follows the source's occupied-stage look-ahead and non-preempted active job rules. The 34-minute frame delay cannot be attributed to the one-minute garden speedup or omitted from an incentive claim.

At minute 160, immediate garden, partial construction and recovery-first all have stock `{timber:4,salvage:3,food:7}`, structures `{shelter:1,workbench:1,garden:2}`, no pending physical work and player fatigue zero. Nevertheless, partial construction has paid about `.80333` total player effort versus `.79500` for immediate/recovery. Meryem has paid 20 rather than 21 construction minutes, 41 rather than 40 recovery minutes, and her terminal fatigue is about `.50167` rather than `.53500`. The additional player effort and reduced Meryem work are an allocation tradeoff; the common endpoint hides the earlier frame delay and different material-arrival sequence.

Finishing the woodshed first is a serious productive control, not a disposable slow arm. Its later food at 140 accompanies a different output bundle: by 160 Meryem has installed 26 of 28 paid minutes of the roof stage. The apparent lower stock `{timber:0,salvage:1,food:7}` includes a reservation of four timber and two salvage in that work. It also leaves more fatigue, about `.45167` for the player and `.80405` for Meryem. Do not label its stock shortfall a loss while ignoring installed work, or rank the whole policy using only the selected food objective.

## Preserved failed prefix and limits

The original minute-83 prefix failed the sixteenth handover with `No active physical assembly to hand over`. It preserves 15 successful operations, 16 snapshots/views and the refused operation's state: Meryem's timber trip started at 69 and ends at 84. At 83 she is still assigned to that trip and the garden materials have not arrived. This was an administrative timing error before any comparison arm, not an unfavorable comparison result or evidence against learning.

Exactly one authorized correction paid a thirteenth rather than twelfth final recovery minute, producing the legal minute-84 prefix. That extra recovery minute and timber arrival are real changed setup conditions, retained in a separate record and frozen before the four comparisons. The result applies to the corrected 84 prefix; it supplies no outcome estimate for the invalid 83 setup. The initial runner/protocol bytes remain preserved rather than overwritten.

C1 is one deliberately selected, reachable command history with two handovers, an accepted other-person project and a threshold-adjacent worker. It is not evidence that players ordinarily choose this route, that partial practice always helps, or that every productive alternative has been ruled out. Minute 160 is an observation horizon, not a service deadline. No player comprehension test occurred in this review.

## Admission recommendation

Retain the current mechanics. The strongest direct productive control meets the stated objective at the same time as deliberate partial work, and the other controls expose actual effort, recovery and output costs. There is no demonstrated need to suppress legitimate partial practice, introduce a new faculty or reopen the completed restart/workbench studies. A narrow explanation of a current later-job consequence can be considered separately if the UI review establishes that it is hard to see; these records do not establish that explanatory copy improves player understanding.
