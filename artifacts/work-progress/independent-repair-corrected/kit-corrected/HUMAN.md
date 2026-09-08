# Portable runtime 0.1.1

This is an installable set of **body, capacity, task-practice and scheduling primitives** for a host-owned simulation. It requires no LLM, API key, UI, network service or runtime dependency. It is not the full laboratory actor loop: laboratory policies, beliefs, commitments, relationships, scenarios and replays are outside this package. It does not yet establish a general model of human cognition or behavior.

The package selects Human **0.1.1**, copied byte-for-byte from `src/human/v0.1.1.js` together with its single `src/core/model.js` dependency. The previous `src/human/index.js` stays at **0.1.0** for existing games and recorded experiments. The clock is a separate **0.1.0** component. Packaging does not change existing laboratory physics, game rules, saves or engine versions. The model dependency contains additional laboratory helpers internally. The frozen human boundary also exports the full `PARAMETERS` object, including unused trust and assistance coefficients. These retained constants do not implement portable trust or assistance; the package exposes no laboratory simulation or controller. A shared-leaf extraction could remove unused code without duplicating formulas, but is deferred to a deliberate dependency and compatibility change.

## Build, install and verify

Node.js 22 or later is required for the build and test commands. The restricted-consumer test detects the supported permission flag: older 22 releases use the experimental name, while newer Node releases use `--permission`. From the source repository:

```sh
npm run package:runtime
node --test tests/runtime-clock.test.js tests/runtime-package.test.js
```

The equivalent direct build is `node scripts/package-runtime.js`. Its programmatic alternate-root option is for fixture/copy inputs: runtime, human and clock declarations must match this packer’s versions in the authored one-line literal form, or packaging fails before creating an artifact. An optional output-directory argument changes the default `runtime-dist/`. The command produces `human-framework-runtime-0.1.1.tgz`, prints its SHA-256 and lists every included file. It never runs `npm publish` or changes the public website. The package is marked private and unlicensed; this local artifact does not grant redistribution rights.

The packaging tool also checks a reviewed source-byte registry, `scripts/runtime-release-lock.json`, before producing output. The human version pins both its own source and its imported `src/core/model.js`; clock and runtime exports have their own pins. This prevents a changed coefficient or implementation from shipping under the existing component version merely because its version declaration was left unchanged. The registry belongs to the packer, not an alternate fixture root. Preserve existing registry entries and append reviewed versions when a component changes; plan save compatibility or migration explicitly. This is a conservative release check: comments and currently unused model helpers are also covered, so a later shared-leaf refactor needs a deliberate version decision. It does not authenticate saves, constrain manually copied code, or replace review of an intentional registry edit. README and packaging-tool changes leave simulation versions intact; the tarball digest records those artifact changes.

From an independent project, install the built tarball by its actual path:

```sh
npm install /path/to/human-framework-runtime-0.1.1.tgz
```

Import the combined API from `human-framework-runtime`, or use the explicit `/human` and `/clock` subpaths. These are the only package exports. This is an ESM package: use `import`, not CommonJS `require`. Installed-package verification covers Node.js on Apple Silicon macOS; no browser bundler, native-engine bridge, Windows or Linux consumer is certified by those runs. A `runtime-manifest.json` in the installed directory records the SHA-256 of each source file; there is no duplicated model maintained in a second source directory. The archive allowlist is the four runtime/human/model JavaScript files, generated package metadata and manifest, and this document as its README. Research, credentials, game code, deployment tools and UI files are excluded.

The package test actually runs `npm pack`, installs that tarball **offline** into a newly created temporary consumer, and executes the exported API with Node's filesystem permission model restricted to the consumer directory. It asserts that reading the original repository source is denied. That consumer advances and finishes a real person attempt, resumes person and clock JSON snapshots identically, checks a capacity rejection and rejects access to an unexported internal module. This proves local Node package consumption; it is not evidence of a Unity, Godot, native or browser-bundler integration. The source modules themselves use ordinary platform JavaScript, with no Node imports in their runtime dependency graph.

The separate `tests/commons-package.test.js` also installs this package into an isolated consumer and runs the entire Common Ground host. Only two module specifiers change; no host rules are rewritten. A resumed concurrent run and its 600 one-minute advances match the original host after normalizing only the explicitly changed human version metadata; every other state field is exactly equal. This is a test-only transplant, not a new Common Ground release or an automatic migration of game saves. The integrated test passes on Node 22.0.0 and Node 26.8.1.

## Human and host responsibilities

The human API exports `createPerson`, `getPersonView`, `assessEffort`, `estimateSuccess`, `beginAttempt`, `advanceAttempt`, `finishAttempt`, `exportPerson` and `restorePerson`, plus `HUMAN_VERSION` and authored `PARAMETERS`. The combined entry also exports `RUNTIME_VERSION`, `CLOCK_VERSION` and the read-only `CLOCK_LIMITS` object. A person has actual body state, task skills, an observation bias, elapsed minutes and at most one pending attempt. A view is a detached perceived projection. Capacity checks can block exertion. Advancing actual elapsed minutes applies maintenance and task-specific practice; a matching host receipt settles an attempt once.

The **host** owns objects, locations, resources, opportunities, choices, observations, random outcomes, inventories, deadlines and goals. It also owns the connection between a scheduled event and a person attempt. A clock event is a notification that something is due; it neither proves the world effect happened nor authorizes granting a resource. Canceling an event does not interrupt a person automatically. The host must settle or interrupt the matching attempt, preserve paid elapsed effects, and schedule subsequent work.

The human component accepts fractional minutes and limits an individual action to 1,440 minutes. The new clock accepts only integer minutes. A host using both must choose integer-duration actions and coordinate their elapsed time. Creating a clock at a nonzero origin does not change a new person's zero accumulated minutes: absolute world time and time accumulated by that person may have different origins.

## Complete human API contract

This section documents the **0.1.1** API, with the same mechanics as 0.1.0 and the compatibility corrections described below. All operations return detached state or views. Treat returned person state as authoritative component state and update it through the API. The person object is visible to the host for execution and persistence; it is not the observation supplied to a decision policy.

```js
createPerson({
  id: 'worker',
  body: {fatigue: 0.2, hunger: 0.3},
  skills: {repair: 0.1},
  observationBias: 0 // Optional; fatigue observation bias, from -1 to 1.
});
```

`id`, `body` and `skills` are required. Fatigue, hunger and every skill value are finite numbers in `[0,1]`; an empty skills object is allowed, with at most 64 skills otherwise. Person IDs, action IDs, non-null target IDs and skill names start with an ASCII letter, followed by up to 79 ASCII letters, digits, underscores or hyphens. Unknown setup fields are rejected. A person begins at zero accumulated minutes, with no pending attempt. New skill names cannot be added through this version's public API: declare the host's relevant task skills at creation.

`getPersonView(person)` returns `{id,body,skills,minutes,pending}`. Observed fatigue includes the observation bias; both body values are rounded to the nearest 0.05 and clamped to `[0,1]`. Skills and elapsed minutes remain available. The pending projection has `{id,actionId,targetId,activity,durationMinutes,elapsedMinutes}` and excludes actual capacity and the execution baselines. Hosts must separately filter their own hidden world facts.

```js
person = beginAttempt(person, {
  actionId: 'repair',
  targetId: 'gate',         // Optional; defaults to null.
  durationMinutes: 12,     // Required; finite, 0.01 through 1,440.
  exertive: true,          // Optional; defaults to false.
  effort: 0.12,            // Optional; total extra fatigue over this attempt.
  activity: 'active',      // Optional; active, rest or meal; defaults to active.
  skill: 'repair'          // Optional; existing skill name, or null.
});
```

`actionId` and `durationMinutes` are required. Effort is in `[0,1]`; nonzero effort requires `exertive:true`. Rest and meal cannot claim exertion, effort or a practice skill. Active nonexertive tasks may name a skill, allowing authored observation/foraging practice. Skill is a task label declared by the host; practice does not automatically transfer to other skills.

There may be only one pending attempt per person. Its ID is allocated monotonically and is available as `person.pending.id`; it is not the action ID. **Beginning an attempt does not mean capacity allowed it.** The host checks `person.pending.capacity.allowed` before granting world effects. That result assesses the complete declared interval using actual starting body state; the host chooses whether a rejected request costs any elapsed time. No action, rest or meal is substituted automatically.

`advanceAttempt(person,minutes)` advances an existing attempt by an actual nonnegative elapsed interval, no greater than its remaining duration. It applies maintenance, allowed effort or rest, and allowed task practice. Zero is allowed. It does not finish the attempt, consume inventory, grant an item, or advance anyone else. Idle time that should affect a person must also be represented explicitly, for example an active nonexertive attempt without a skill. A stopped wall clock does not itself advance a person.

```js
person = finishAttempt(person, {
  attemptId: person.pending.id,
  status: 'completed',
  mealConsumed: false // Optional; defaults to false.
});
```

| Outcome status | Required state and effects |
|---|---|
| `completed` | Allowed capacity and the whole interval paid. Clears the attempt. Host decides its world effect. |
| `failed` | Allowed capacity and the whole interval paid. Retains the same paid body/practice effects as completion. Host decides why the world task failed. |
| `interrupted` | Allowed capacity; may stop partway or at the end. Retains paid elapsed body/practice effects; the host decides partial world progress and reservation return. |
| `blocked` | Disallowed capacity only. May settle immediately or after a host-chosen paid interval. Gains no practice, effort or recovery; elapsed maintenance remains. |

The receipt must match the currently pending attempt ID. A duplicate, stale or mismatched result throws. `mealConsumed:true` is accepted only for a completed meal after its full duration. It applies hunger relief once, retaining that interval's maintenance even when hunger hit its ceiling. The host must actually debit its food and confirm consumption; the component cannot verify inventory. A completed meal with no consumption receipt receives no hunger relief. Finishing any attempt leaves `pending:null`; it does not start another action.

Prediction helpers are independent of the person object:

```js
assessEffort({fatigue: 0.2, hunger: 0.3}, {
  durationMinutes: 12, effort: 0.12, exertive: true
});
// {allowed, causes, fatigueCost, hungerCost,
//  projectedFatigue, projectedHunger}

estimateSuccess({
  skill: 0.1, body: {fatigue: 0.2, hunger: 0.3},
  difficulty: 0.4, hazard: 0, exposure: 0
}); // Probability only; no random draw or host outcome.
```

Use perceived body in forecasts and actual body for execution. In the success helper, skill, difficulty, hazard and exposure are in `[0,1]`; hazard and exposure default to zero. Its authored logistic formula is optional: a host can supply deterministic outcomes or a different outcome model. The helper does not enforce capacity.

`exportPerson(person)` returns `{format:'human-framework-person',version:1,componentVersion:'0.1.1',person}`. `restorePerson(record)` accepts component versions 0.1.0 and 0.1.1 when the envelope and person versions agree. It validates fields, ranges, pending attempt identity, its capacity baseline and elapsed body/practice consistency, then returns detached **0.1.1** person state. Importing an old snapshot changes only its version metadata; ordinary operations reject an unmigrated 0.1.0 person. Unsupported/mixed versions and already inconsistent legacy histories are rejected. Neither function can authenticate a player's history or validate host resources. Save person snapshots together with the host's pending jobs, receipts, resource reservations and clock; their correspondence is the host's responsibility. Counters and accumulated-time limits fail explicitly rather than silently wrap.

The exported person is versioned wire data, not opaque to host validation. Its shape is `{version,id,body,skills,observationBias,minutes,nextAttempt,pending}`. When an attempt is pending it has `{id,action,elapsedMinutes,capacity,bodyBefore,skillBefore,startedAt}`. `action` contains all seven normalized action fields shown above, including defaults; `capacity` contains the assessment helper's six fields. `bodyBefore` and `skillBefore` are execution baselines (`skillBefore:null` when no skill is practiced), and `startedAt` is accumulated person time when the attempt began. `nextAttempt` allocates person-specific IDs of the form `personId:N`; hosts should store the returned ID rather than reconstruct it.

For import reconciliation, **read** `snapshot.person.pending.action` and compare its action ID, target, duration, activity, effort, exertion and skill with the host job's declared blueprint. Match its attempt ID, elapsed time and scheduled completion to the host job and clock as well. An internally valid person with a different low-effort action is not a valid save of the host's demanding repair. This read-only inspection of the versioned wire contract is supported; editing baselines/body/skills to implement normal game transitions is not. Call `restorePerson` for component validity in addition to these host checks. `getPersonView` intentionally omits execution details and cannot serve as a save validator.

Version 0.1.1 accepts reordered capacity object fields and derives pending accumulated time from its start plus elapsed time. These fix two 0.1.0 defects: key-order-sensitive restore and fractional advances that could return an internally invalid state. Existing game imports retain the historical 0.1.0 implementation; this package selects the corrected file.

Repeated identical commands under the same numerical mode are deterministic. Different fractional subdivisions can produce ordinary floating-point differences; the human API does not promise byte-identical results for every subdivision. Declare a comparison tolerance for those tests, or use the same canonical integration cadence in all host drivers when exact save equality is required. The integer clock's scheduling order is exact. Human snapshots and a browser playback mode are separate contracts.

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

For multiple people, schedule every pending attempt's completion before advancing. The clock must stop no later than the earliest remaining attempt boundary; then the same elapsed world interval can advance all running attempts without exceeding any duration. Different job durations are valid under this invariant. If an attempt has no matching event, simply capping its advance would lose accounting for the leftover world time; reject or repair the host schedule instead. After completion or interruption, explicitly start another working, idle or recovery attempt for people whose maintenance should continue. Merely moving the scheduler does not advance a person without an attempt. Recurring events must be explicitly scheduled by the host after settlement. Save the host world, person snapshots and clock snapshot together at a coherent boundary.

## Evidence and remaining scope

Clock tests compare one long target, irregular chunks and minute-by-minute advances, including host-scheduled continuations. They cover equal-time order, idle advancement, cancellation, counter exhaustion, mutation isolation, serialized resume, malformed snapshots and 10,000 settled events without growing active history. The installed-package test makes the repository inaccessible to the consumer and verifies that the selected human/model sources are byte-identical inside the archive.

This milestone establishes a reusable package and an event-driven scheduling boundary. It does not make the full laboratory loop portable, establish empirical calibration, implement richer cognition, or prove that continuing worlds are fun or useful. The clock leaves ownership, independent agency, outcome receipts, co-simulation consistency and long-session host state to the consumer. Further framework claims need independent hosts using this package, recorded integration costs, player-usefulness evidence and the existing scientific and theological review tracks.
