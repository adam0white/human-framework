# A full shift in the pump yard

User direction: continue the framework by making its first game longer, more varied and more strategic. The user explicitly accepts familiar game mechanics and authorizes implementation and the existing push/deploy workflow. This is an additive host game, not an expansion of human faculties or a replacement for the short workshop.

## Choice of milestone

Build a single eight-hour shift with three distinct seal pumps, one worker, one replacement seal, tools and accessible meals at the depot. All jobs and their authored value are visible from the start. The player chooses order and repair route. Keep a shared task-specific seal-repair proficiency; do not invent transfer between unrelated electrical/mechanical jobs. A campaign, recurring breakdowns, overnight resets and permanent upgrades wait until this session has useful decisions. The original `/workshop/` remains playable; the longer game is `/shift/`.

The human component, laboratory and original workshop stay byte-unchanged. A new `src/games/shift.js` host imports only the public `src/human/index.js` boundary. UI files are `web/shift.html`, `web/shift.js`, `web/shift.css`; shared imports from the old UI are unnecessary. The existing public build adds one explicit HTML entry.

## World, actions and score

Start at a depot with no carried tools, one available seal and two meals. One toolkit enables repair. Carrying the seal reserves it; replacement consumes it only on a completed successful fitting. Meals require being at the depot. Three nearby pump locations connect through explicit travel durations. Rest is possible anywhere. No social effects, money, inventory weight, new materials system or runtime LLM.

Pump profiles begin with these authored values, to be revised only after logged exploratory feasibility checks: garden (40 base points, easier/shorter patch), workshop (70, moderate), intake (100, difficult/high effort). A patch costs less time and retains the seal. Replacement takes longer, is easier, and uses the shared seal on success. Optional paid inspection reveals a pump's fixed fitting condition and updates only observed information. Successful fitting changes that pump to repaired; verification is required to earn its one-time score and makes it unavailable for further repair practice.

Each verification grants `basePoints + basePoints * remainingMinutes / shiftMinutes`; display the rounded total and a breakdown of restored capacity points and early-service bonus. Score is dimensionless authored game value, independent of any physical output units. No points for practice, failure, spare resources, rest or arbitrary clicks. Score changes only at first verification, so waiting/interrupting/repeated verification cannot mint points. Partial restoration retains its earned score at departure; restoring all pumps ends the shift early. The player may explicitly finish a partial shift. The maximum theoretical score is twice the sum of base values; this upper bound is not an achievable target because actions consume time.

Failed and successful equal-duration work receive the same existing time-based practice. A failure is not evidence of error diagnosis or special learning from feedback. Experience may improve later outcomes enough for a quick-repair route to outscore a cautious route; this must be observed in comparisons, not guaranteed by a failure bonus. Show practice change separately from task outcome, and separate accumulated skill from fatigue's immediate effect on chance.

## Public host contract

Export `SHIFT_VERSION='shift-0.1.0'`, `POLICIES`, `createShift({seed=1,policy='value-first'})`, `getShiftView(state)`, `getActions(state)`, `startAction(state,actionId)`, `advanceTime(state,minutes)`, `finishAction(state)`, `interruptAction(state,reason)`, `finishShift(state)`, `chooseAction(view,policy)`, `applyCommand(state,command)`, `exportShift(state)`, `importShift(record)`, `replaySession(record)`.

Action IDs are validated host-owned strings, e.g. `travel-garden`, `inspect-garden`, `patch-garden`, `replace-garden`, `verify-garden`, plus `take-tools`, `take-seal`, `rest`, `eat`. Definitions and opportunities are generated from immutable pump data. The generic human action receives targetId, duration, effort and repair skill; no pump name enters the human module.

Host state owns version, seed, policy, clock/deadline, status (`playing`/`finished`), finish reason (`all-restored`/`departure`/`left-early` or null), location, person, bounded resources, three pump records, one pending action and bounded last event. Current score is derived from verified pump records. No growing history lives in active state. Optional command logging belongs to the browser/benchmark.

The projected view includes public job profiles, accessible observations, perceived body, skill, remaining time, score/breakdown, available actions with forecast/capacity/cost, public inventory and status. It omits seed, unobserved fitting condition, repair draw and authoritative body/capacity. Two independent seeds with the same observed history initially yield identical views. Forecasts advance a detached *observed* person through the same public human lifecycle to include practice/strain during the planned interval.

A blocked exertion takes the same declared two idle minutes as the introductory host, supplies no practice/recovery/food and leaves the next choice with the player/controller. Time is charged once in partial intervals; departure interrupts incomplete work. Successful world effects and human completion apply atomically. Duplicate/stale results fail. Exact completion at departure is allowed; a later completion cannot win. Save/restore validates expected worker/skill identities, inventories, pump states, earned score timestamps, pending action/clock correspondence and basic attainable resource/world invariants. This is structural consistency, not authentication.

Use separate keyed random domains: initial condition `(seed,'condition',pumpId)` and repair outcome `(seed,'repair',pumpId,route,completedRepairOrdinal)`. Counters are per pump and route, consumed only by completed eligible repair resolution. Rest, inspection, UI activity, blocked requests and interruptions must not reroll the next repair. The human attempt counter remains an event-identity guard, not the repair RNG key.

## Controllers, evaluation and acceptance

Provide three simple visible-state host controllers: `value-first`, `easy-first`, `all-patch`, differing in order/spare allocation while sharing capacity/recovery access. These are host controllers, not laboratory Full. They must reach a bounded terminal state, use only the projected view, and avoid repeatedly trying inaccessible actions. No universal strategy superiority is required. Keep losses/partial scores and strategy reversals.

Required tests: local prerequisites, targeted independent pump state, one-time scoring, shared seal allocation, later practice carryover, capacity and meals, per-target random independence, pending save/replay/interrupt, terminal/deadline fractions, malformed snapshots, old module hashes, bounded active state. Run a source-identified policy/route sweep to check feasibility, score/time/repair/failure/recovery/meal distributions, and an interruption/XP-farming probe. Do not tune the game merely to make a richer controller win.

A separate matched-exposure learning experiment uses the public person lifecycle for trained and idle conditions of equal duration, then compares later probabilities under equal retest body and a fixed threshold grid. Frozen learning is an offline counterfactual, not a player option or an engine rewrite. Preserve the distinction between probability improvement from this authored learning curve and human empirical evidence.

Mobile play should show the shift goal, remaining time, score, three selectable jobs, current location, body/skill and next action. Route details and controller hints are optional; model limitations stay in one collapsed place. Failed work must explain lost time and retained practice without celebrating failure. Verify actual browser play, save/resume and a terminal summary, then push/deploy and compare the live manifest/payloads. User feedback is one formative participant, not completion of the previously proposed five-person gate.
