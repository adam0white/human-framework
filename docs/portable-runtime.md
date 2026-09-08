# Portable runtime 0.1.0

This is an installable set of **body, capacity, task-practice and scheduling primitives** for a host-owned simulation. It requires no LLM, API key, UI, network service or runtime dependency. It is not the full laboratory actor loop: laboratory policies, beliefs, commitments, relationships, scenarios and replays are outside this package. It does not yet establish a general model of human cognition or behavior.

The human component stays at **0.1.0**, copied byte-for-byte from its existing source together with the single `src/core/model.js` dependency. The clock is a separate **0.1.0** component. Packaging does not change existing laboratory physics, game rules, saves or engine versions. The model dependency contains additional laboratory helpers internally. The frozen human boundary also exports the full `PARAMETERS` object, including unused trust and assistance coefficients. These retained constants do not implement portable trust or assistance; the package exposes no laboratory simulation or controller. Function-level extraction is deferred to avoid maintaining generated or duplicated formulas merely to remove unused code.

## Build, install and verify

Node.js 22 or later is required for the build and test commands. The restricted-consumer test detects the supported permission flag: older 22 releases use the experimental name, while newer Node releases use `--permission`. From the source repository:

```sh
npm run package:runtime
node --test tests/runtime-clock.test.js tests/runtime-package.test.js
```

The equivalent direct build is `node scripts/package-runtime.js`. Its programmatic alternate-root option is for fixture/copy inputs: runtime, human and clock declarations must match this packer’s versions in the authored one-line literal form, or packaging fails before creating an artifact. An optional output-directory argument changes the default `runtime-dist/`. The command produces `human-framework-runtime-0.1.0.tgz`, prints its SHA-256 and lists every included file. It never runs `npm publish` or changes the public website. The package is marked private and unlicensed; this local artifact does not grant redistribution rights.

From an independent project, install the built tarball by its actual path:

```sh
npm install /path/to/human-framework-runtime-0.1.0.tgz
```

Import the combined API from `human-framework-runtime`, or use the explicit `/human` and `/clock` subpaths. These are the only package exports. A `runtime-manifest.json` in the installed directory records the SHA-256 of each source file; there is no duplicated model maintained in a second source directory. The archive allowlist is the four runtime/human/model JavaScript files, generated package metadata and manifest, and this document as its README. Research, credentials, game code, deployment tools and UI files are excluded.

The package test actually runs `npm pack`, installs that tarball **offline** into a newly created temporary consumer, and executes the exported API with Node's filesystem permission model restricted to the consumer directory. It asserts that reading the original repository source is denied. That consumer advances and finishes a real person attempt, resumes person and clock JSON snapshots identically, checks a capacity rejection and rejects access to an unexported internal module. This proves local Node package consumption; it is not evidence of a Unity, Godot, native or browser-bundler integration. The source modules themselves use ordinary platform JavaScript, with no Node imports in their runtime dependency graph.

## Human and host responsibilities

The human API exports `createPerson`, `getPersonView`, `assessEffort`, `estimateSuccess`, `beginAttempt`, `advanceAttempt`, `finishAttempt`, `exportPerson` and `restorePerson`, plus its version and authored parameters. A person has actual body state, task skills, an observation bias, elapsed minutes and at most one pending attempt. A view is a detached perceived projection. Capacity checks can block exertion. Advancing actual elapsed minutes applies maintenance and task-specific practice; a matching host receipt settles an attempt once.

The **host** owns objects, locations, resources, opportunities, choices, observations, random outcomes, inventories, deadlines and goals. It also owns the connection between a scheduled event and a person attempt. A clock event is a notification that something is due; it neither proves the world effect happened nor authorizes granting a resource. Canceling an event does not interrupt a person automatically. The host must settle or interrupt the matching attempt, preserve paid elapsed effects, and schedule subsequent work.

The human component accepts fractional minutes and limits an individual action to 1,440 minutes. The new clock accepts only integer minutes. A host using both must choose integer-duration actions and coordinate their elapsed time. Creating a clock at a nonzero origin does not change a new person's zero accumulated minutes: absolute world time and time accumulated by that person may have different origins.

## Clock contract

All functions are pure: they return detached serializable state and do not mutate their arguments. No wall time, random numbers, body state, action selection or world rules enter the scheduler.

| Function | Result |
|---|---|
| `createClock({now=0}={})` | A clock with an empty queue. |
| `scheduleEvent(clock,{at,type,actorId=null,data=null})` | `{clock,eventId}` with one future event queued. |
| `cancelEvent(clock,eventId)` | A clock with that event removed. A valid absent ID is a no-op. |
| `advanceClock(clock,target)` | `{clock,events}` at the earliest due event time at or before `target`, or at `target` when no event is due. |
| `exportClock(clock)` | A detached versioned JSON snapshot. |
| `restoreClock(record)` | A validated detached clock from that snapshot. |

`advanceClock` settles **one timestamp per call**, returning all events at that timestamp in insertion order. It does not continue to `target` after returning events. This gives the host a chance to advance people by the actual delta, settle effects and schedule the next work before moving again. Calling it with the current time is allowed and returns no events. An idle target between events advances time without consuming the future queue.

Event records have exactly `{id,at,type,actorId,data}`. IDs are monotonically allocated `event:N` strings and never reused, including after cancellation or restoration. Queue order is time first, then insertion order. Events at the current time are forbidden, preventing a zero-time rescheduling loop. The host resolves any immediate consequences while handling the current event batch.

Times must be nonnegative safe integers, and scheduled `at` must be strictly greater than `clock.now`. Backward travel, fractions, nonfinite numbers and overflow fail explicitly. An exhausted event counter fails explicitly. `type` and non-null `actorId` must be nonempty trimmed strings of at most 120 characters. Actor IDs are opaque host labels and need not match the human component's narrower person-ID syntax; the host validates that connection.

`data` must be simple JSON: null, booleans, finite numbers except negative zero, strings, dense arrays and plain objects. Omitted data defaults to null; explicit undefined is rejected. Dates, Maps, Sets, BigInts, functions, symbols, cycles, accessors, hidden properties and sparse or decorated arrays are rejected rather than silently changed by JSON serialization. Unknown fields, incompatible versions, duplicated IDs, impossible counters, past events and unsorted imported queues are rejected. This validates the scheduler's structure and internal invariants; it cannot authenticate a player's save or prove a host's world history.

The active queue is capped at **1,024 events**. Each event payload is limited to **16,384 serialized characters** and **24 nesting levels**. The entire clock state is limited to **1,048,576 serialized characters**; validation can reject inputs earlier when their structure already exceeds that budget. Limits count JavaScript string characters, not bytes. No event history is retained: settled and canceled events leave only the advancing counter. A separate host recorder can retain a replay or trace. The implementation favors a small sorted array and strict validation; it is not a scheduler benchmark for millions of actors.

## A host advances to an event boundary

```js
import {
  createPerson, beginAttempt, advanceAttempt, finishAttempt,
  createClock, scheduleEvent, advanceClock
} from 'human-framework-runtime';

let person = createPerson({
  id: 'worker', body: {fatigue: 0.1, hunger: 0.1}, skills: {repair: 0.2}
});
person = beginAttempt(person, {
  actionId: 'repair', targetId: 'valve', durationMinutes: 10,
  effort: 0.1, exertive: true, skill: 'repair'
});
let {clock} = scheduleEvent(createClock(), {
  at: 10, type: 'attempt-due', actorId: person.id,
  data: {attemptId: person.pending.id}
});
const next = advanceClock(clock, 60); // Stops at minute 10, not 60.
person = advanceAttempt(person, next.clock.now - clock.now);
clock = next.clock;
// The host now determines the actual world outcome and settles it once.
person = finishAttempt(person, {
  attemptId: next.events[0].data.attemptId, status: 'completed'
});
```

For multiple people, advance every running attempt only for its actual elapsed interval before processing the event batch. Model idle or recovery through the human boundary if that time should affect a person; merely moving the scheduler does not do it. Recurring events must be explicitly scheduled by the host after settlement. Save the host world, person snapshots and clock snapshot together at a coherent boundary.

## Evidence and remaining scope

Clock tests compare one long target, irregular chunks and minute-by-minute advances, including host-scheduled continuations. They cover equal-time order, idle advancement, cancellation, counter exhaustion, mutation isolation, serialized resume, malformed snapshots and 10,000 settled events without growing active history. The installed-package test makes the repository inaccessible to the consumer and verifies the original human/model sources are byte-identical inside the archive.

This milestone establishes a reusable package and an event-driven scheduling boundary. It does not make the full laboratory loop portable, establish empirical calibration, implement richer cognition, or prove that continuing worlds are fun or useful. The clock leaves ownership, independent agency, outcome receipts, co-simulation consistency and long-session host state to the consumer. Further framework claims need independent hosts using this package, recorded integration costs, player-usefulness evidence and the existing scientific and theological review tracks.
