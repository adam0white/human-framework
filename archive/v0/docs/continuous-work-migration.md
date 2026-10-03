# A releasable path for continuous work

The private experiment has host `0.1.0-experiment`, save format `human-continuous-work-experiment` version 1, and explicitly uses the already released Human/runtime 0.1.1. It is a continuation fixture with a 240-minute/512-command boundary, not a drop-in Common Ground or Before the Rain host. No original source or existing save changes identity.

## Existing semantics verified in source

| Host | Unassigned time and recovery | Stopping physical work |
|---|---|---|
| Common Ground; Before the Rain wrapper | Unassigned time is active idle, increasing fatigue. Explicit rest is 18 minutes; Meryem chooses recovery via her project policy. Rain adds finite ferry/dusk checkpoints. | Whole assembly progress is implicit in the pending attempt. Cancel/release returns all reserved material and discards physical completion progress; paid body/practice remain. Benefits and duration are frozen at start. |
| Before the Water | Explicit six-minute rest; otherwise a long active-idle attempt. | Gate/diversion progress is credited per paid minute. Already installed parts remain; only unused reserved parts return. A later actor works the remaining physical section using their own body/practice. |
| Service Day; A Shared Promise | Explicit six-minute rest, optional meal, active idle. The partner may independently choose recovery; stopping their own commitment can be refused. | Gate/pump/diversion work and installed ownership accrue per minute. Stop preserves these; later work uses a remaining-section duration. Delivery/cart completion remains a distinct full receipt. |
| Last Light | Explicit four-minute rest; active idle otherwise. | Route, lookout and information effects require full completion; spent body/practice remain when interrupted. This is not construction with permanent partial material. |

Browser **Pause** stops the simulation driver and retains the pending job. A host **Stop/Cancel** closes the current attempt, preserving elapsed body/practice but applying that host's physical reservation rules. These cannot be treated as synonyms. In the private derivative a stopped assignment leaves durable physical work; unassigned recovery itself is not a promised job and can be preempted immediately.

## Smallest public bug correction

Add a separately named Common Ground host 0.2.0 with save version 2; preserve `src/games/commons.js`, the old wrapper and their existing routes/saves as controls. Select the new host explicitly for new continued-world play. The first public change can keep existing idle/rest policy and the old cancel rule while adding a **prospective active-assembly productivity segment** when the workbench completes. This isolates the reported timing defect from automatic recovery and durable cancellation semantics.

At a workbench-completion boundary, credit the active assembly's fraction `elapsed / oldDuration`. Close the old pending attempt without changing its paid body/practice. Start a remaining segment of `ceil((1 - fraction) * improvedDuration)` minutes and proportionate remaining effort `.20 * (1 - fraction)`. Keep the original reserved material and target identity. Completion after the paid segment settles the structure once. No wall time passes during this resegmentation. Never subtract six from the old due date or replay the old interval at a cheaper rate. On the one-minute overlap fixture, both continuing prospectively and cancel/restarting finish at 202, but only the former retains total assembly effort .20; restarting expends .21 including the discarded minute.

This narrow fix does not require changing Human/runtime or adopting every private prototype choice. It also does not fix general loss of physical work on cancel. Keep the physical-progress improvement as a separately reviewed host choice, or select the private durable-work contract for a subsequent version. A literal finish-current-stage-and-release-future-obligation control is a useful smaller alternative to destructive project release. The executable original-host script preserves the stage but still completes at 207, so it does not solve the workbench issue. It must coexist with an explicit immediate Stop; withdrawing future assistance cannot force someone to finish unwanted work.

## Migration is a visible, one-way operation

Keep the legacy snapshot intact and identify it as the migration origin, with the old kernel/version and original active pending attempt. A person migrating through the existing Human 0.1.1 importer keeps their actual body, skills, elapsed time and identity. Active construction progress may be derived from a validated still-pending attempt. Nothing can reconstruct already canceled physical work from the old aggregate counters. Preserve its loss rather than invent history.

A production migration must support the complete mixed state before being offered: active assembly, gathering, meal, rest, idle, accepted project, pending clock events and rain checkpoints. Fixed gathering/meal jobs can continue under their original contracts until their next boundary; do not regrant food, output or consumed reservations. Old rest may finish its already accepted interval, or be explicitly converted at migration to zero-job availability without undoing paid recovery. Either policy must be declared and tested. The private fixture deliberately rejects nonassembly pending jobs; silently importing them would lose real work. The busy milestone in the story lane therefore remains unsupported here.

For a new continuous-world envelope, store the actual root snapshot and new commands. Old Common Ground saves lack a complete original command journal; validated snapshot provenance is not an invented replay from time zero. Old imports remain pinned to the old host until the user explicitly chooses the reviewed migration. A new story chapter must carry real people, resources, jobs, pending events and source identity rather than rebuilding a convenient opening.

## Required public acceptance before selection

1. Complete the full Common Ground public API/controller and mixed-job migration; this private continuation is insufficient.
2. Preserve the original two failing counterexamples, all frozen package locks and historical result bytes. Verify new active-job completion behavior without automatic recovery first.
3. Exercise workbench completion before, during and after an assembly; simultaneous completion ordering; stopping, save/resume and accepted takeover; same-minute repeated stop/resume; actual capacity; and material/practice conservation per actor.
4. Add automatic low-demand recovery in a separately measured arm. Next Event must expose a finite review interval or actual recovery/readiness/completion boundary, never advance indefinitely. Eating still reserves a portion for its actor and grants relief only after its paid interval.
5. Fix the independent rounded-capacity discrepancy in the new host: the legal solo fixture at minute 120 shows fatigue .75 but has actual .77; its workbench choice is advertised available while execution rejects it. Show an estimate as uncertain or use consistent availability, without weakening actual admission or silently altering old physiology.
6. Complete independent lifecycle/save review, targeted browser checks, commit/push, selected new-host deployment and exact live release verification before claiming the public defect is fixed.
