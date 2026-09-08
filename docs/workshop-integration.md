# One host-owned workshop integration

Date: 2026-09-07. Host version: `workshop-0.1.0`. Human component: `0.1.0`.

The player restores a persistent water pump before a 240-minute departure. Storage and the pump room are separate places. A wrench is required for either repair. A spare seal enables an easier but longer replacement; the short patch leaves the spare unused. Successful repair still requires an eight-minute test run. Both approaches have retry slack. The game is a first integration and a playable design hypothesis, not a calibrated account of workers or a universal game SDK.

## Ownership and boundary

`src/games/workshop.js` imports only `src/human/index.js`. The host owns the clock, location, wrench, part, rations, pump state, hidden fitting condition, deterministic outcome draws, prerequisites, deadlines and victory. Human state owns body, practice, elapsed person time and a pending attempt. The browser owns rendering, local storage and an optional session command log.

The host calls `beginAttempt`, then `advanceAttempt` for elapsed time, and finally `finishAttempt`. It never writes body or skills directly. Work practice and elapsed effort are already credited during advancement, including partial work. Completing a host action only changes world objects and confirms the outcome. An allowed incomplete action can be interrupted with a reason; its unfinished inventory/location/task effects do not happen. Repeated completion fails because the pending attempt has been consumed.

A capacity-blocked work request consumes a declared two-minute **idle interruption**. It supplies neither work practice nor recovery nor food. Afterward the player or host controller chooses an action. A meal is offered only in storage while a ration remains; completing it atomically debits the ration and confirms consumption to the human component. An interrupted meal grants no hunger relief.

The host can read authoritative body only for actual repair resolution. Forecasts are calculated from `getPersonView`, the public authored action difficulty and a mean condition allowance. A completed host-owned inspection replaces the mean allowance with its recorded observation. `getGameView` omits the seed, unobserved fitting condition and outcome draws. `chooseAction` accepts only that view. All three host controllers receive identical facts and opportunities. They are small authored host-local controllers, not the laboratory's Full policy or evidence for a new human faculty.

## Public host calls

All calls are pure and return detached data:

| Call | Result |
|---|---|
| `createGame({seed, policy})` | New host world and person. Policies: `task-aware`, `planned-simple`, `greedy`. |
| `getGameView(game)` / `getActions(game)` | Accessible world, perceived condition and currently available actions with estimated costs/chances. |
| `startAction(game, actionId)` | Pending host and human attempt. No time has elapsed yet. |
| `advanceTime(game, minutes)` | Partial progress, capped at the action interval or deadline. Reaching the end resolves the action. |
| `finishAction(game)` | Advance the remaining interval and resolve. It accepts no caller-provided success. |
| `interruptAction(game, reason)` | Stop an allowed action, retaining elapsed costs. Blocked requests finish their two-minute interruption. |
| `exportGame(game)` / `importGame(record)` | Versioned active snapshot, including hidden host facts and any pending attempt. |
| `chooseAction(view, policy)` | Action ID chosen using only the accessible projection. |
| `applyCommand(game, command)` | Validated `start`, `advance`, `finish` or `interrupt` command. |
| `replaySession({version,seed,policy,commands})` | Reproduce a whole session from its initial seed and explicit commands. |

The active save contains the person export envelope, host seed/version, current objects, one pending action and one bounded latest-event explanation. It does **not** contain a growing event transcript. Optional replay recording is outside active state. Browser replay recording starts with a new run; loading a partial save does not pretend to recover earlier commands. Save files include private causal state for exact local resumption; the policy never receives the save record.

An action's label, duration, prerequisites and world effects belong to the host. The human component receives generic activity, target identity, duration, effort and optional practice skill. An additional tool or object interaction should use these same calls, without a human-specific branch for the game.

## Evidence and remaining gates

Focused tests cover changing prerequisites/location, time and practice accounting, interrupted pending save/resume, separate command replay, seed-hidden views, both winning routes, blocked capacity with no invented recovery, accessible meal ownership, deadline interruption, invalid saves/outcomes, controller playability and 10,000 commands without transcript growth.

Performance budget declared before measurement: one pure host command should take **under 16 ms at p95** in the target browser, excluding painting and downloads. Measure desktop browser and a 390 px mobile viewport separately, reporting that a viewport is not physical mobile hardware. A 10,000-command state-growth check should leave the active snapshot within 250 bytes of its initial size after actions finish; monotonic attempt digits and the latest explanation account for small differences.

The implementation meets the mechanical reuse, replay and bounded-state checks in roadmap gates 2–3. The independent author added paid pump inspection without a shared human edit; their [report](independent-host-consumer.md) records the boundary evidence. The [separate browser benchmark](workshop-performance.md) passes the declared command budget at both desktop and narrow viewport sizes on this Mac. Production identity and responsive browser checks are release evidence, not substitutes for formative human playtesting or physical-mobile performance.

Local browser checks used a separate headless Chrome process with an already-installed Playwright package, after the Playwright MCP transport closed. They exercised real DOM controls at `http://127.0.0.1:4174/workshop/`. At seed 1 the manual patch route completed in 61 minutes and replacement in 88 minutes. An actual save download at five minutes into wrench retrieval, interruption, file upload and resumed completion preserved the pending `5 / 6` interval. Terminal suggestion and auto controls were disabled. A 390 × 844 viewport had no horizontal overflow and visible buttons were at least 44 px high; the timed controller completed the spare-seal route in 88 minutes. No JavaScript page errors occurred. These checks used a desktop browser with a mobile viewport, not physical mobile hardware or CUA. Root subsequently checked the final mobile layout through CUA, including actions before route explanations and controller help collapsed, and completed a paid-inspection patch route in 71 minutes after a partial-action reload.

An exploratory seeds 1–100 sweep before the route correction found 99 task-aware wins, 99 planned-simple wins and 100 greedy wins. Mean completion times among wins were 96.89, 73.73 and 75.09 minutes respectively; failed repair attempts numbered 20, 38 and 36. These are historical exploratory figures.

The final [source-identified benchmark](../artifacts/workshop-benchmark.json) uses seeds 101–200 and records all commands, events and outcome hashes. Reproduce with `npm run benchmark:workshop -- --seeds 100 --start-seed 101 --json artifacts/workshop-benchmark.json`.

| Host controller | Wins / 100 | Mean elapsed, all runs | Mean time among wins | Failed repairs | Blocked requests |
|---|---:|---:|---:|---:|---:|
| Task-aware spare route | 99 | 97.97 min | 96.54 min | 19 | 0 |
| Planned-simple patch route | 100 | 71.70 min | 71.70 min | 28 | 0 |
| Greedy patch route | 100 | 71.93 min | 71.93 min | 28 | 4 |

The one task-aware loss contributes the 240-minute deadline to all-run elapsed time; it is censored there, not a 240-minute completion. Winning-time averages condition on success. Greedy's four blocked attempts cost eight idle minutes total. **No controller consumed a ration in these 300 runs.** This game exercises the integration and repair tradeoff, not repeated hunger management or long-horizon planning. Replacement reduced failed fittings but cost more time and did not improve completion frequency. These controllers are host-native rivals, not Full; their success cannot establish a Full-policy benefit.

Still outstanding: five people playing without policy hints, with four correctly explaining the objective, one route tradeoff and an observed failure. No such human playtest was performed in this delivery. Neither automated wins nor the new UI establish that the game is clear, engaging, or a useful model of human behavior.
