# Portable runtime and ongoing play

Date: 2026-09-07. Supersedes the final next-step paragraph of the 0.4 roadmap; earlier validation and research gates remain open.

## Reason for this milestone

The user's four exported snapshots and direct account identify two costs: the courtyard conceals asymmetric action scheduling, and fixed deadlines make the games feel like puzzles. Several independently authored hosts now justify testing a portable runtime artifact and a shared time boundary. They do not justify declaring the whole laboratory action policy portable.

The authorized implementation has three independently reviewable deliverables:

1. Package the existing human component and an additive event clock for consumption outside this repository.
2. Clarify courtyard scheduling and the neighbor's actual goal, without changing version 0.1 outcomes or imported runs.
3. Build Common Ground, a small continuing cooperative resource game at `/commons/`, with concurrent jobs and both manual and running-clock controls.

## Boundaries

- Existing `src/core`, `src/human`, legacy engines and historical host physics remain unchanged. A package build may copy their explicitly needed dependency closure; no independently maintained duplicate formulas. The frozen human API re-exports the full authored PARAMETERS object, including unused laboratory coefficients; carrying those numbers does not supply those mechanisms.
- The package owns human body, capacity, practice, attempts and a separate optional event clock. It contains no browser, game objects, victory rules, generated text, remote service or inference dependency.
- The host owns resources, reservations, project stages, outcomes, available jobs and NPC commitments. The clock owns only time and stable event ordering. A browser only requests integer-minute advancement and renders host views.
- Do not advertise the narrow package as the complete laboratory Full action loop. Both Full and new host policies remain replaceable authored policies.
- Host social responses remain explicit, inspectable engineering rules. No new moral, sacred, emotional or trust scalar is introduced by this release.
- Keep Solo Repair and existing solo games as independent controls.

## Clock contract shared between authors

`src/runtime/clock.js` exposes immutable functions:

- `createClock({now=0}={})` creates a serializable clock.
- `scheduleEvent(clock,{at,type,actorId=null,data=null})` returns `{clock,eventId}`. Events are strictly future integer-minute timestamps; records are `{id,at,type,actorId,data}`.
- `cancelEvent(clock,eventId)` returns a clock.
- `advanceClock(clock,target)` returns `{clock,events}` at the earliest due timestamp at or before target, draining all events at that timestamp in insertion order; without a due event it advances to target.
- `exportClock(clock)` / `restoreClock(record)` validate versioned snapshots.

The host runs a canonical one-minute integration cadence regardless of UI advance chunks. Each person has at most one pending job. A person between jobs receives an explicit non-exertive one-minute idle attempt, so maintenance and person time still advance. Due jobs settle before the neighbor chooses again; the next external player command sees those settlements and any newly reserved NPC supplies. Bound pending events and reject malformed data, backward time and unsafe numbers. No clock callback is serialized. IDs increase monotonically and survive cancellation/save. Host calls advance at most 1,440 minutes at a time; job durations are positive integer minutes. Unavailable player jobs are refused before time or resources are reserved.

## Common Ground play

Two people share timber, salvage and food. Renewable gathering and foraging lead to staged woodshed, workbench and garden construction. Structures improve usable timber yield, construction duration or forage yield without changing the frozen human recovery equation. Task skill reduces later job duration by whole minutes; practice is not merely a display. The first milestone is all three structures; repeatable supply-cache projects allow continuation. No global round cap, deadline or hidden offline progression.

Player jobs and Meryem's jobs may overlap and finish at different times. Materials are reserved at start. Cancellation returns unused reserved goods but keeps paid time, body changes and practice. Autonomous recovery is distinct from a project commitment. NPC work follows an explicitly accepted named project, with visible reasons for declining, recovery or completion. The player cannot force acceptance by clicking a command labeled as a request.

Start paused with an obvious first project and actions. Offer next-event advance, Play, pause and speed. Save/resume restores jobs and remains paused. UI timing must never select a different simulation result for the same timestamped commands. With no sampled uncertainty in this host, omit a decorative seed control.

## Acceptance evidence

- A tarball installs and executes in a fresh external consumer without importing the source repository; file allowlist excludes games, private research and replays.
- New clock tests cover equal-time ordering, cancellation, malformed input, bounds and save/resume.
- Common Ground tests cover simultaneous resource reservations, once-only outcomes, cancellation, recovery, continuation, ongoing commitments, snapshots and identical results under different time chunk sizes.
- A headless progression probe preserves different project-order outcomes and does not label a game heuristic as Full. Active logs/queues remain bounded during continuation.
- Supplied courtyard snapshots pass the frozen importer; a presentation-only change leaves host/session/component bytes unchanged. They are snapshots, not recoverable complete replays.
- The complete new host also runs from an installed package in an external consumer with repository source reads denied; only its two module specifiers change.
- Real browser tests cover first meaningful actions, simultaneous jobs, manual/running time, pending save/resume and mobile overflow. Physical-mobile performance and independent five-person explanation testing remain open.
- Cross-author review plus root integration review precede release. Public asset byte verification and versioned source identity follow push/deploy.

## Deferred until this earns its place

Combat/waves, enemy AI, large maps, overnight simulation, physiology, emotion, episodic memory and a universal social ontology. This worksite establishes scheduling and commitment seams a future defense game needs; it is not a defense-game implementation. Whether the human module offers enough benefit over a small stamina-only implementation remains a discriminating MVP question, not a promised conclusion.
