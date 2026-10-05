# Independent review: embedding the framework in a game

Date: 2026-09-07. Reviewed commit: `0e9b2c05bc7b77cb026576f473454086400b9add` (engine 0.2.0). Lens: game integration, API ownership, extension, persistence and cost. This review uses the current specification and implementation, not earlier reviewers' recommendations. No application code was changed and nothing was deployed.

## Judgment

This is a credible, inspectable simulation laboratory. It is not yet a reusable game behavior SDK. The distinction matters: the browser and CLI already reuse the same game simulation, but an independently designed game cannot currently delegate selected human processes without also accepting the laboratory's world, scheduler, action outcomes and victory condition.

The project can become reusable. Its small size, pure transitions, separate actor projection, explicit intentions and versioned replay are good starting material. The next milestone should expose the boundary to a host game, before accumulating more internal faculties. A richer social scenario can test human-model coverage without testing this boundary at all.

The strongest contrary argument is that early abstraction would freeze immature semantics. I agree. Do not design a universal SDK now. Integrate one small host game and extract only the seams that this consumer demonstrably needs. It is acceptable for the reusable result to be smaller than the current kernel.

## Findings, in priority order

### P1: the implementation owns the world that the proposed adapter was meant to own

**Observed:** `docs/framework-proposal.md:176–184` assigns world semantics, opportunities and task outcomes to the adapter. Actual creation requires progress, food, hazard, a horizon, a fixed duration, fixed priority names and a closed action vocabulary (`src/core/model.js:45–79`). Creation installs a single hazard belief and initializes all relationships itself (`src/core/simulation.js:6–13`). The private resolver owns work success, resource production, eating, inspection and help (`src/core/simulation.js:43–95`), and the same function family owns the win/loss condition (`:142–145`).

**Consequence:** an existing game with positions, tools, inventory ownership or its own combat/task resolution must either run a second competing world model, mutate undocumented state, or fork the kernel. Supplying another JSON scenario does not solve this. Every shipped scenario uses aggregate progress and the same five action kinds (`src/scenarios/index.js:11–80`); the README correctly admits the limited reuse evidence (`README.md:32`).

**Recommendation:** make the first consumer own world truth, available opportunities, task execution and victory. Retain selected human-state transitions as optional modules. Let the existing laboratory become one consumer of those modules. Do not move its entire world schema into a supposedly generic `context` object and call the coupling removed.

**Acceptance:** after an initial extraction, a second host action with targeted parameters and host-resolved consequences can be added outside `src/core`, without representing it as fictitious progress-producing work or changing body/practice formulas.

### P1: there is no independent choice/execution boundary for a host to call

**Observed:** `step` always chooses and resolves all actors in serial order (`src/core/simulation.js:97–132`). The command may override exactly one actor; all others immediately use one of two built-in policies. The command carries only actor, action ID and optional intention (`:16–22`). No pending attempt, target, variable action duration, interrupted action or external completion is expressible. All actors receive the same global action list and all peers are visible (`src/core/observation.js:15–18`). The proposal's `PendingChoice` and host resolution boundary remain proposals (`docs/framework-proposal.md:111–123`).

**Measured:** supplying `targetId: 'b'` and `durationMinutes: 1` with a valid action did not reject the extra fields. Canonical replay dropped both, the simulation advanced ten minutes, and the other actor acted autonomously. This follows the documented narrow command contract, but it is an easy integration mistake for an SDK to accept silently.

**Consequence:** a host cannot schedule one NPC when its path finishes, wait for an animation, submit two player-controlled choices together, or decide that an action was interrupted. Updating every actor to make one actor act can double-count time and impose unintended NPC behavior.

**Recommendation:** separate obtaining a choice from applying a confirmed event. Give events an actor ID, stable event/attempt ID, explicit elapsed duration and declared execution status. Make the host choose the scheduling policy. A synchronous laboratory wrapper may still compose these into one `step`. Reject unsupported command properties at a public boundary when they could imply behavior that will be ignored.

This does not require a general asynchronous job engine. One outstanding attempt per actor with explicit completion/cancellation is enough for the first test. If the selected host is entirely turn-based, use explicit actor turns and a documented world tick instead.

### P1: command replay is sound for the laboratory but incomplete for a game session

**Observed:** replay reconstructs only the embedded initial scenario, normalized options and `auto`/`act` commands (`src/core/simulation.js:154–162`). It has no event route for host changes, observations or external task outcomes. Version rejection and isolated 0.1 execution are real strengths (`src/core/index.js:9–22`; `tests/legacy.test.js:8–22`). Current-format replay accepts at most 120 commands, matching the bounded experiment.

**Measured integration probe:** after creating the fixture at hazard `0.8`, I changed the live world's hazard to `0`, made an action, exported and replayed it. Restored hazard was `0.8`. Arbitrary state mutation is explicitly outside the documented replay protocol (`docs/coverage-ledger.md:11`); this is an absent integration feature, not a failing claim about supported commands.

**Recommendation:** define a joint persistence contract before integrating external outcomes. Record every exogenous observation/event that affects human state, with ordering and relevant module/configuration versions. Keep validated current-state snapshots for resume separate from historical command replay. A JSON-safe state is useful, but an exported diagnostic history is not a complete save-game contract.

Use either a deterministic host resolver whose exact version is recorded, or recorded authoritative completion events. Do not promise exact reconstruction from a seed while leaving the host's effects unrecorded. Module identifiers and configuration hashes can identify separately deployed rule sets; do not serialize arbitrary callback functions.

**Acceptance:** save while an attempt is pending, load in a new process, finish/cancel once, and match an uninterrupted run. The same external event delivered twice must be rejected or ignored without duplicate fatigue, consumption or practice. Unknown versions must fail explicitly. Preserve historical 0.1 fixtures unchanged.

### P2: the hot state contains an ever-growing researcher transcript

**Observed:** every step clones the entire state, including history (`src/core/simulation.js:100`). Each actor view scans all historical decisions before slicing the last 16 (`src/core/observation.js:19`). Every history entry stores rankings, prose traces and diagnostics (`src/core/simulation.js:121–145`). Fixed actor and horizon limits keep current use bounded (`src/core/model.js:54–56`).

**Measured, local Node v26.8.1:** a synthetic 120-round run using the existing five-action fixture and an unreachable target produced:

| Actors | First 10 steps, mean | Last 10 steps, mean | Final JSON state | Replay JSON |
|---|---:|---:|---:|---:|
| 1 | 0.36 ms | 1.67 ms | 309,084 bytes | 3,233 bytes |
| 16 | 2.68 ms | 26.39 ms | 4,782,473 bytes | 6,350 bytes |

These are single diagnostic runs, concurrent with the test suite, not an isolated benchmark or a target-device performance claim. The code establishes the history-dependent copying and traversal independently of the exact timing. Current short rounds remain usable; raising limits would conceal the underlying cost.

**Recommendation:** separate bounded causal state and actor memory from optional append-only diagnostics. Retain a bounded recent-event projection; stream full traces to an inspector/log sink. Prefer this small ownership change before ECS, native-language rewrites or worker pools. A character's future episodic memory must have its own semantics, not inherit the whole omniscient transcript.

**Acceptance:** with full logging disabled, state size and per-event work remain bounded by active actors/attempts/modeled memory rather than session history. Compare early and late windows across 10,000 events; declare a host-specific latency budget and measure on the target device. Keep complete replay inputs in storage outside the hot state.

### P2: the reusable value and the cost to use it are still unmeasured

**Observed:** `package.json` describes a private application with no package export map or declared SDK types. README usage imports source files directly. More fundamentally, custom policies cannot be installed in `step`; all motive interpretation is in a closed action-kind scorer (`src/core/policy.js:9–46`). The core also formats English descriptions and stores action labels as state (`src/core/simulation.js:60–93,121–131`). These are convenient laboratory decisions, not independently chosen consumer contracts.

**Judgment:** package distribution and TypeScript are minor compared with semantic integration. Do not spend the next iteration packaging an interface that still demands a parallel game world. First determine which shared behavior the host actually benefits from. A host that must supply every reason and rewrite every update has demonstrated a generic event utility, not reusable human modeling.

**Acceptance:** a developer who did not author the kernel integrates the frozen entry point using the supplied example, records time and required exceptions, and compares it with a small host-native policy. Predeclare one useful shared mechanism and one player-visible benefit. If the simpler consumer solution is equally useful and easier to author, ship the narrower module or keep the laboratory as research tooling.

## Smallest falsifiable game integration

Build a tiny two-room repair game with one NPC. The host owns room membership, a locked door, a repairable object, a ration and the objective. It independently determines opportunities and executes movement/interaction. The same person can attempt the door, repair, inspect, rest or eat; one attempted action can be interrupted by a host event. A second actor can be added only to test independent scheduling, without adding social psychology.

This needs no large engine or new visual production. Use the cheapest host that supplies a real independent world and scheduler. A small browser game is enough; success does not establish portability to other runtimes. Select a native-engine binding only when a real consumer needs it.

Freeze the human body/practice rules and the thin public boundary after extraction. Keep host observations distinct from hidden lock/object state. Keep generic human effects reused from the library; put door semantics, inventory transactions, travel duration and success conditions in the host. Use a replaceable pure policy over actor-accessible data and host candidates. The current policy can remain an optional laboratory policy rather than becoming the mandatory definition of human choice.

The experiment fails the reuse claim if the adapter must edit core for a door outcome, write internal actor fields, invent dummy target/food/hazard values, duplicate the framework's fatigue/practice bookkeeping, or smuggle hidden facts into a policy view. Report required exceptions rather than counting the new screen as a second genre.

## Minimum boundary and deliberate deferrals

| Concern | Owner for the first integration |
|---|---|
| World truth, geometry, inventory, task outcome, victory | Host |
| Which actor decides now; pause and interruption timing | Host, explicitly recorded |
| Available candidate actions and their observable descriptions | Host observation/opportunity adapter |
| Private modeled human state and opted-in body/practice updates | Framework modules, with declared units and one writer per quantity |
| Choice source | Replaceable policy or external control; receives only accessible data |
| Capacity result | Human module returns constraints/effects; host decides the declared attempted-action handling |
| Outcome and observation delivery | Validated event contract; actual outcome and actor knowledge remain separate |
| Save/resume and replay | Host session envelope plus framework snapshots/events and version identifiers |
| Researcher prose, animation, localization | Presentation/inspector adapter over structured records |

In particular, mandatory `_eat`/`_rest` substitution (`src/core/simulation.js:109–116`) should remain the laboratory's execution policy. A host game may not have food at the actor's location, or may model failed exertion differently. Separating capacity constraints from the host response preserves one body model without forcing one game's recovery mechanic everywhere.

Necessary now: a documented public schema (JSDoc or declarations suffice), host action/event boundary, per-actor control, explicit durations/accounting, versioned persistence and bounded diagnostics. Premature now: universal action ontology, plugin marketplace/loader, ECS, a C++/Rust rewrite, bindings for multiple engines, multiplayer rollback, full cognition/emotion/memory, macro simulation and LLM-generated actions. Add these only for observed requirements.

## Roadmap change

The current short roadmap prioritizes recovery, social exchange and learning/calibration (`docs/roadmap.md:46–50`). Those are reasonable model experiments. They are an insufficient product sequence for an embeddable framework. The earlier validation plan explicitly places engine integration after calibration and broader human coverage (`docs/validation-program.md:69–75`); I would reverse that ordering for this objective.

1. Preserve Solo Repair and the current benchmark as the frozen control and diagnostic application. Fix evidenced defects; do not keep adding thematic presets.
2. Choose the one-NPC host contract and attempt the integration above. Measure coupling, saved-session behavior, authoring work and runtime. Extract only what it demands.
3. Freeze the resulting boundary; have an independent consumer add the second action and verify the gates. State the narrow supported domain honestly.
4. Run one discriminating social or learning experiment through that boundary, with unchanged shared rules. Choose calibration evidence separately for any claim about actual human behavior.

Useful human-science work need not stop during integration. It should not keep enlarging an untested hosting boundary. A framework can be empirically modest and still valuable to a game; an elaborate theory can be empirically interesting yet costly to embed. Both claims need their own evidence.

## Verification record

- `npm test`: 57 passed, 0 failed, approximately 2.91 seconds on this machine.
- Inspected current core, all scenario definitions, public API documentation, ownership proposal, current roadmap, coverage/validation gates and relevant tests.
- Ran the three read-only probes described above: host event replay, command-field canonicalization, bounded-history growth. Synthetic timing conditions used the test fixture, seed 7, five actions, 120 rounds, target 100000, and one or sixteen cloned actors with unique IDs and no commitments.
- Did not test a real host integration, cross-runtime determinism, long-session resume, target-device performance or authoring usability; those remain proposed gates.
- Other untracked recovery-analysis artifacts appeared during concurrent work. They were not reviewed or modified and did not inform this report.
