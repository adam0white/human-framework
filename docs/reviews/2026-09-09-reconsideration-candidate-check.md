# Private reconsideration candidate: independent source check

2026-09-09. This reviewer designed the comparison but did not implement the candidate. The review is confined to the current baseline/candidate source diff and existing candidate tests. No comparison output was inspected, no timing case or comparison arm was added, and no candidate, public or runtime source was edited. This finishes the interrupted study's review scope; it does not resume the paused automation or authorize a new study.

**Clearance:** no concrete defect was found in the event trigger, actor ownership, paid-work/material accounting, guarded refusal or initialization path at the inspected source. All seven targeted tests pass. This clears the source for the frozen private comparison; it does not establish that interrupting a supply trip improves frame-and-roof outcomes or earns public promotion.

## Exact inspected source

| File | SHA-256 |
| --- | --- |
| Baseline `src/games/camp-current.js` | `73a535b879e552c7d1bcbd592b82cb751362f42ee7eeb95ad16f8f4473d69d9a` |
| Candidate `src/experiments/camp-reconsideration/host.js` | `e26777ef45b35415175a5eaa9211585d1847facba3dc78a632cffa4224cd34e6` |
| `tests/camp-reconsideration.test.js` | `f91018a5a05593c5729bd7786e3c84df3b784360c955c44e40f8c6075176c3fd` |

The full diff introduces only adjusted import paths, the explicit private host version `0.3.1-reconsideration.0`, a baseline-validation import, `reconsiderReleasedWork`, its player-cancellation hook and `fromBaseline`. The existing activity, resource, practice, work-rate, event-clock and save-validation implementations otherwise match the baseline. The candidate is an explicitly versioned private host copy, not a change to released Human/runtime behavior.

## Trigger, ownership and refusal

The hook first captures the player's active assembly project and successfully stops that player assignment. It can then reconsider only a retained, unfinished stage of the same project that Meryem has already accepted. Her current job must be her own fixed `gather-timber` or `gather-salvage`. A fixed player job, a different project, an absent/finished stage, Meryem's assembly, her owned meal and her food collection do not pass this trigger.

The candidate checks Meryem's current hunger, fatigue and recovery flag using the same thresholds as her existing project policy. It then clones the state, stops only her trip in that clone, constructs the retained-work blueprint and applies the existing `unavailable` check. That includes actual remaining effort/time capacity, material reservation status, exclusive assignment, counter capacity and world-time feasibility. An unavailable replacement returns before changing Meryem's real job. The already authorized player stop remains effective; refusal to redirect Meryem does not undo it.

Only a feasible replacement causes the real `stop(g,'neighbor')` and `begin(g,...,'neighbor')`. The following ordinary neighbor-policy call sees the new assignment and returns, so it does not cancel or restart it again. Repeating player cancellation without another player job fails at the original stop check. An elapsed-time-zero advance does not trigger reconsideration. The rule is an authored policy over current accepted work and owned state, not evidence of human consent or a general planner.

## Paid work, output and material conservation

The candidate reuses the baseline interruption path. That path closes the pending Human attempt as interrupted, cancels its one owned completion event and returns only its actual reservation. It does not produce the trip's output, consume food, grant meal relief, reset either person's body or skill, refund paid minutes, or erase paid effort/practice. Timber and salvage gathering have no input reservation in these definitions, so their interruption returns no new material.

The released assembly keeps its physical work, installed material and actor contributions. Its blueprint has no new material charge when a retained work item already exists. Meryem retains her earlier duration basis if she previously participated; first participation would use her own current basis and a new contribution record, never transfer the player's paid work. Assignment itself pays no elapsed minute, progress or practice. Later ordinary advancement pays the new construction activity.

The actual event adds one neighbor cancellation and one assembly start after the player's cancellation; the probe's corresponding counters and notices exist only in its discarded clone. The resulting state is sealed through unchanged material, paid-time, pending-event, consent and exclusive-work checks. This establishes accounting consistency, not that throwing away a partly completed supply trip is advantageous. Positive paid-trip loss is intentionally possible because the rule has no paid-time cutoff.

## Initialization boundary

`fromBaseline` first restores and validates the supplied baseline envelope, exports a detached snapshot, changes only `game.version`, and passes it through candidate restoration. It cannot silently create a custom person, rebuild an earlier history, transfer practice or alter resources. The tests compare every exported field against the original snapshot with only that explicit version changed and check input immutability, malformed baseline rejection and incompatible-version rejection in both directions.

This adapter supports the protocol's shared-baseline **boundary comparison**. It does not demonstrate that running the candidate from fresh creation would preserve the earlier C1 prefix: earlier player cancellations could trigger different policy decisions. Neither this source review nor the adapter supplies that untested claim.

## Executed targeted checks and limits

```sh
/opt/homebrew/bin/node --test tests/camp-reconsideration.test.js
```

All **7 tests passed, 0 failed**, on Node 26.8.1 at the hashes above. Coverage includes:

- Validated version-only initialization and malformed/incompatible snapshot rejection.
- Zero-paid trip cancellation, unchanged body/skill/material/paid accounts, counter changes and removal of the old completion event.
- Three already-paid gathering minutes retaining body, practice, effort and reservation facts, followed by save restoration and one paid construction minute.
- Same-timestamp repeat-cancel rejection and zero-minute-advance stability.
- Fixed player cancellation and a different released project leaving Meryem's owned supply trip unchanged.
- Hunger, fatigue and recovery guards retaining the current trip.
- Same-project player cancellation preserving Meryem's owned meal or forage.

The guard and self-care tests explicitly use altered structural fixtures; they are not additional ordinary default-origin comparison cases. The positive three-minute test checks invariants and one subsequent work minute, not roof/service performance, and does not change the four frozen timing cases. No broad suite, extra case or comparison continuation was executed for this review.

The targeted suite does not independently exercise every counter/world-limit failure or a new worker's first-participation path. Those paths are guarded by the reused baseline functions and source inspection here; this is bounded clearance rather than exhaustive assurance. Root and the separate verifier own complete frozen-trajectory replay, actual release/re-request responses, final frame/roof comparisons and the admission decision. Earlier frame completion or removal of two player interactions alone must not be presented as proven additional service.
