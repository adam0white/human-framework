# Common Ground

Common Ground is a persistent worksite at `/commons/`. There is no round limit, deadline, or finished-run state. A player and optional neighbor gather communal materials, recover, and build useful structures through two stages each. The first milestone establishes the woodshed, workbench, and garden. Repeatable supply caches remain available afterward.

The woodshed preserves an extra usable timber bundle per trip (3 → 4), the workbench shortens later assembly by six minutes, and the garden increases food gathering (2 → 3 portions). Timber, salvage, food, work, rest, and meals have different durations. Practice subtracts `floor(skill × 4)` minutes from a practiced task’s authored base duration; workbench savings apply separately to assembly. The minimum job duration is six minutes. Results and costs are deterministic, so there is no seed or decorative random stream.

## Boundaries and ownership

- `src/games/commons.js`: immutable world commands, resource ownership, reservations, project consent, Meryem’s authored policy, completion receipts, bounded saves.
- `src/games/commons-policy.js`: two optional player controllers using only the public view; neither calls laboratory Full.
- `src/runtime/clock.js`: a separately reusable ordered event queue and integer-minute clock.
- `src/human/index.js`: unchanged Human 0.1.0 body, effort capacity, recovery, and task-specific practice.
- `web/commons.*`: orientation, job choices, countdowns, device saves, next-event and wall-time adapters.

Start with `createGame({solo:false})`. Player jobs use `startJob(game,jobId)`; no job selection advances time. Ask Meryem through `requestProject(game,projectId)`. Use `advanceToNextEvent(game)` or `advanceGame(game,minutes)` to progress. `getGameView`, `exportGame`, and `restoreGame` supply a detached observation and versioned snapshot. Every public command returns a new state. The Common Ground game version is 0.1.0, save wrapper version 1. It does not alter existing games, Human, laboratory simulation versions, or historical replay engines.

Communal stock is explicitly owned in common. Starting a job debits its materials or food into a pending reservation before another job can begin. A structure stage can have only one builder. Different structures may be built concurrently when stock permits. Completions settle in stable event order, all simultaneous completions settle before the neighbor chooses again, and each output arrives once. Canceling returns reserved supplies, consumes no meal, and produces no construction or gathering output; actual elapsed fatigue, hunger, and practice remain. Zero-time cancel loops earn nothing.

Meryem independently accepts a named project or declines an already completed/unavailable project or replacement of an unfinished accepted commitment. She gathers the missing materials, builds, and interrupts her project work for explicit food gathering, meals, or rest as needed. Completing the accepted milestone fulfills it even while she is still recovering. Releasing a project stops its gathering/construction while preserving personal food gathering, rest, or a reserved meal already underway. Consent here is a transparent host mechanic; no shared social API or richer psychology is claimed.

## Clock and persistence

Every person advances one canonical integer minute at a time through the unchanged Human attempt API, including explicit idle maintenance. This makes whole, event-sized, and one-minute calls bit-identical. The host checks resource and capacity prerequisites before reserving a job; a blocked start does not force free recovery or spend time. Light food gathering near camp deliberately remains available at exhaustion and hunger, but takes paid time and awards output only on completion. It prevents a reachable long-idle/no-food absorbing state.

The browser starts paused. 1× maps one real second to one simulated minute; 4× maps it to four. All progression calls the same headless host. The optional default pause at the player’s completion clamps to that exact event, including delayed callbacks. A visibility-change handler pauses the driver, and saving/restoring never grants offline progression. The UI cache preserves unchanged action-button nodes between ticks.

Active state has at most two pending jobs/events, 16 recent messages, and fixed-size ledgers. `advanceGame` accepts at most 1,440 minutes per call; the administrative world-time bound is one billion minutes, not a play deadline. Stock/count bounds prevent numeric overflow. Snapshots reject unknown fields, incompatible versions, forged job specs/events, person-clock mismatches, invalid stages and benefits, ownership/conservation violations, impossible completion counts, and output without minimum paid work receipts. These are consistency checks, not cryptographic proof of history. A full command replay and tamper-resistant archive are outside this host’s scope.

## Reproducible comparison

Run `node scripts/commons-benchmark.js`. The [frozen artifact](../artifacts/commons-benchmark.json) records four deterministic trials, with an administrative 4,000-minute censor and no sampled conditions. Both approaches establish the worksite in both modes:

| Mode | Approach | First milestone | Available timber / salvage / food |
|---|---|---:|---:|
| Two people | Build first | 220 min | 2 / 1 / 2 |
| Two people | Stockpile first | 226 min | 3 / 4 / 5 |
| Alone | Build first | 389 min | 0 / 1 / 3 |
| Alone | Stockpile first | 466 min | 7 / 4 / 3 |

Stockpile-first retains more materials; its cooperative run has two unfinished jobs at the first milestone, recorded separately in the artifact. These are comparisons of particular authored schedules, not a fitted model, randomized experiment, optimality result, or general claim that a richer controller wins. The world was not tuned to make laboratory Full superior, and these runs do not measure it.

## Verification

The 186-test baseline passed before new implementation. Twenty added host/policy tests cover different and simultaneous completion times, shared reservations, paid cancellations, interrupted meals, independent commitment acceptance/refusal/release, completion during recovery, exact 600-minute chunk equivalence, concurrent pending save/resume, reachable exhausted/no-food recovery, strict hostile snapshots, solo isolation, two complete approaches, and continuation through 100 supply caches. Two thousand zero-minute cancellation cycles leave no free output or practice and keep the queue empty and save bounded.

Playwright checks at 390 px and 1,440 px found no horizontal overflow. UI clicks started timber gathering and requested woodshed help together; the first event finished the player at minute 16 while Meryem retained eight minutes of work. Reload restored that pending state paused. A 4× callback deliberately delayed 900 ms still stopped at the exact player finish minute 16. An unchanged action button retained its DOM identity across a running tick. No application console errors remained. The visibility handler was tested with a synthetic hidden-state event: clock minute 21 stayed unchanged and Play became paused. The headless browser reports background pages as visible, so this is handler coverage, not proof of native browser background behavior.

This remains a compact authored game: renewable sources are inexhaustible, there is no travel map, sleep cycle, spoilage, weather, danger, or full campaign, and the post-milestone project is a repeatable cache count. It exercises concurrent work, persistence, recovery, and explicit commitments without adding unvalidated cognitive faculties.
