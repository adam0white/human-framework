# Current Camp 0.3.0

`src/games/camp-current.js` is the active shared Camp host. It imports only released runtime 0.1.1, Human 0.1.1, clock 0.1.0 and the already released practice calculation. Its authored project and gathering definitions are local. Camp 0.2, story 0.1, their legacy hosts, historical saves and the private work candidate are not dependencies.

This is an explicit incompatible host change. Creation starts a fresh shared camp. Restoration accepts only the current envelope below; there is no old-save conversion, research setup, solo switch, story journal, origin snapshot, save book or slot identifier. Historical source and the independent frozen comparison remain private provenance.

## Public facade

All state operations are deterministic and immutable. Returned games are deeply frozen. Views and exports are detached data. An invalid command or snapshot throws without changing its input. Commands that assign, stop, request, release, hand over, allocate or change phase pay no time. Only advancement pays Human activity; resources, completion and people commit atomically.

| Export | Contract |
| --- | --- |
| `CAMP_VERSION` | `'0.3.0'` |
| `PROJECTS` | Deeply frozen authored `shelter`, `workbench`, `garden`, `cache` definitions, each with `label`, `benefit`, and `stages[{label,cost,minutes}]`. |
| `createGame()` | Fresh state at minute zero. An empty options object is accepted; all setup fields are unsupported. |
| `applyCommand(game, command)` | Applies one exact command object listed below. A declined request or handover is a valid response with no physical transfer. |
| `advanceGame(game, minutes)` | Integer 0–1,440 requested minutes; advances no farther than the next supply checkpoint or the supported world limit. Throws while paused. |
| `advanceToNextEvent(game)` | Advances to a completion, new available task, regained player capacity, recovery floor or finite review interval, capped by supply checkpoints. |
| `getGameView(game)` | Detached ordinary player view. Estimates do not promise completion after another actor changes the world. |
| `exportGame(game)` | Returns the detached current envelope. |
| `restoreGame(snapshot)` | Checks bounded plain JSON and current consistency, then returns a frozen game. |

Commands use exactly these fields:

```js
{type:'start', job:'gather-timber'|'gather-salvage'|'forage'|'eat'|'build-shelter'|'build-workbench'|'build-garden'|'build-cache'}
{type:'cancel'}
{type:'request', project:'shelter'|'workbench'|'garden'|'cache'}
{type:'release'}
{type:'handover', from:'player'|'neighbor', to:'player'|'neighbor'}
{type:'continue'}
{type:'allocate', destination:'households'|'camp'}
{type:'dispatch'}
{type:'finish'}
{type:'return'}
```

Handover actors must differ. Assignment, request and handover require running time. Stop and release remain available at checkpoints. Automatic recovery needs no start command and never holds a person in a fixed rest job.

## Save envelope and current fields

```js
{
  format: 'human-camp-current',
  version: 1,
  game: {
    version: '0.3.0', runtimeVersion: '0.1.1', humanVersion: '0.1.1',
    clock, people, jobs, stock, structures, caches, milestoneAt,
    commitment, lastResponse, stats, recent, work, lastAssemblies,
    paid, recovering, window, returned
  }
}
```

There is no `.world` wrapper. Additional envelope or game fields reject. Numbers must be finite, with no negative zero; clock times and counters are bounded integers. The supported absolute time limit is 1,000,000,000 minutes, with 180 minutes reserved before the first supply window. Imported data must be an unshared plain JSON tree, at most 262,144 accounted characters and depth 32. Getters, custom prototypes, sparse arrays, symbol properties, shared object references and cycles reject before cloning or serializing them.

- `clock` is the released clock value `{version,now,nextEvent,queue}`. Its queue contains exactly the current fixed-job completion events.
- `people` has exactly `player` and `neighbor`, each a released Human person value: `{version,id,body,skills,observationBias,minutes,nextAttempt,pending}`. Body has fatigue and hunger; skills have gathering and construction. Both person clocks equal the host clock.
- `stock` has nonnegative integer `timber`, `salvage`, `food`; `structures` has `shelter`, `workbench`, `garden` stages 0–2. `caches` is lifetime completed cache count. `milestoneAt` is null until all three structures are established, then their actual latest completion time.
- `jobs` has exactly `player` and `neighbor`, each null, a fixed job, or an assembly assignment. A fixed job has `{kind:'fixed',id,label,detail,project:null,stage:null,cost,output,duration,benefits,skillBefore,action,startedAt,endsAt,eventId,attemptId}`. An assembly assignment has `{kind:'assembly',id,project,workId,startedAt}`. Fixed action, Human pending attempt and scheduled event must agree. Assembly pays one-minute attempts and leaves no pending Human attempt between ticks.
- `work` maps unfinished project IDs to one reserved physical stage. `lastAssemblies` holds at most one latest completed stage per project, including the latest completed cache. A work value has `{id,project,stage,cost,progress,workbenchAtStart,durationByActor,contributions,exposure,startedAt,completedAt}`. `progress` is 0–1; completion time is null for unfinished work. IDs are `project-stage`, or `cache-N` using the zero-based lifetime cache index.
- Each participating actor's `durationByActor` is the stage duration less the skill benefit latched at first participation. `contributions[actor]` is `{priorMinutes:0,minutes,fraction,effort}`. The zero prior field explicitly admits no migrated construction. `exposure[actor]` is `{at,paidBefore,toolMinutes}`: first participation time, the actor's previously paid construction total, and paid minutes with the workbench available. This is bounded per-work accounting, not a command history. It permits necessary rate, positive terminal-minute and worker-basis checks without reconstructing actions.
- `paid[actor]` is `{work,recovery,idle:0,meal,effort,constructionMinutes,gatheringMinutes}`. All paid categories partition that person's elapsed time. A current pending meal or gathering job must own its elapsed minutes in that actor's corresponding category; pending gathering must also own its elapsed fraction of exertive effort, separately from retained construction contributions. Construction and gathering totals determine owned paid practice. `recovering` has a boolean for each actor; player is always false, while the neighbor flag supports the existing recovery threshold policy. Unassigned people always recover regardless of this flag.
- `commitment` is `{status,project,acceptedAt,finishedAt,startCaches,reason}` with status `none`, `declined`, `accepted`, `fulfilled` or `released`. `lastResponse` is null or `{at,project,accepted,reason}`, with additional `{kind:'handover',from,to}` for a handover response. An active neighbor assembly must have its matching accepted project.
- `stats` is `{started,completed,canceled,gathered,spent,consumedFood,workMinutes,restMinutes,mealMinutes,idleMinutes,receipts}`. Gathered/spent use the three resources. Receipts contain integer counts for `gather-timber`, `gather-salvage`, `forage`, `rest`, `eat`, `coveredTimber`, `gardenFood`; retired active-rest and idle counters remain zero. These bounded totals reconcile completion, owned inventory and paid time. They do not identify every past action.
- `recent` is at most 16 `{at,actor,message}` activity notices, ordered by time. It is descriptive and unauthenticated; it is never replayed.
- `returned` is a boolean. `window` is null before the earned milestone, then the current window value below.

## Retained physical rules

Fresh people, resources and coefficients match the former fresh automatic/prospective shared Camp. The player starts at fatigue .20 and hunger .22; Meryem starts at .30 and .28. Both start with gathering .10 and construction .05. Initial shared stock is four timber, two salvage and four food.

Gathering pays the full latched interval before output. Shelter improves future timber-trip output; garden improves future food-trip output. Eating reserves one owned food and pays eight minutes before hunger relief. Interrupting a fixed job returns its unused reservation and grants no completion output; paid time and practice remain.

Assembly reserves materials once. Stopping retains its installed material and actual progress. The same actor's later restart retains their original duration basis. Workbench completion benefits only subsequent paid work minutes, including an already active assembly. Different workers retain their own basis and contributions. Handover independently checks recipient availability, body capacity and existing accepted project; acceptance transfers only remaining assignment, never prior practice or body state.

Meryem independently accepts a requested project, gathers its missing materials, chooses needed food/recovery, and continues until fulfilled or released. Hunger and capacity can defer work while keeping the commitment. All unassigned time pays automatic recovery, and a feasible job may start immediately.

## Earned supply window

The current window is:

```js
{
  enteredAt, ferryAt, rainAt, carriedCaches: 0,
  production: [{cache, at}],
  allocations: [{at, cache, destination}],
  acknowledged: false | true,
  departedAt: null | ferryAt,
  finishedAt: null | minute
}
```

Fresh creation cannot pack a cache before the milestone; there are no carried legacy caches. The six established structure stages earn a paused introduction at the actual milestone minute. Continue pays no time. Ferry and rain occur 90 and 180 minutes after entry. Advancement pauses exactly at each checkpoint, retaining current jobs and paid pending state.

Each actual completed cache can be allocated once. Two caches equip two households, and two caches provide four camp nights. An allocation does not create food or undo the timber/salvage spent assembling its kit. Household allocation ends with ferry dispatch; later kits can still supply camp. Dispatch occurs only at the ferry checkpoint. Early finish requires dispatch and all four allocations; otherwise finish is available at rain, preserving unmet needs. Return resumes the same people, resources, work, counters and clock.

`production` is a small inventory receipt list used to check that an allocation owns a kit already completed at its claimed time. It is bounded to **11 receipts**: the fresh 180-minute window and the minimum 16 paid minutes per exclusive cache assembly cannot produce a twelfth. Receipts must respect that minimum spacing and agree with the latest retained cache completion when it is still the latest lifetime cache. `allocations` contains at most four entries. Both lists freeze when the window finishes; subsequent returned-camp production only changes ordinary camp state. These lists do not reconstruct the world or authenticate the order of different commands issued in the same minute.

Phase names are `camp`, `introduction`, `packing`, `ferry`, `rain`, `ended`, `camp-return`. Running phases are camp, packing and returned camp; the other phases require the player's checkpoint action.

## Ordinary view

The view contains exactly these top-level fields:

```text
version now phase stock structures caches milestoneAt people commitment
lastResponse recent stats work lastAssemblies paid choices nextStop nextEventAt
window enteredAt ferryAt rainAt elapsed remaining ferryRemaining availableCaches
carriedCaches householdsEquipped campNights unprovidedHouseholds unprovidedNights
departed canFinish canAdvance canAssign pauseReason
```

`people[actor]` extends the released Human view with `job` and `availableActivity:'recovery'`. A non-null job view contains `{id,label,project,startedAt,endsAt,duration,remaining,cost,workId,progress}`. `choices` contains `{id,label,detail,duration,cost,output,project,stage,unavailable,finishesBeforeFerry,finishesBeforeRain}`. Unavailable is null or an ordinary explanation. `nextStop` is `{at,reason}` while running and null while paused; `nextEventAt` is capped at the next checkpoint and null while paused. Window forecasts retire after finish or return. The view removes solo/research options, migration diagnostics, historical command budgets and old host-version wrappers.

## Assurance and intentional limits

Restoration verifies current JSON/schema/version bounds, person/pending/clock consistency, reservation and material conservation, fixed job definitions and benefit timing, exclusive physical assignments, accepted assembly consent, owned paid totals and practice, necessary work rate/time constraints, completion counts, and current window allocation/deadline/finish facts.

Completed and currently pending jobs cannot share the same payment: aggregate meal time is at least eight minutes per completed meal plus all pending meal minutes; gathering time includes the minimum duration per completed trip plus pending gathering minutes. The aggregate effort minimum adds .13 per completed timber trip, .17 per completed salvage trip and each pending gathering job's elapsed effort fraction to the existing completed/unfinished construction requirement. This checks arithmetic in retained current receipts without inventing an action history.

It is **weaker than the retired story journal**. It does not establish that an arbitrary in-bounds inactive body or activity notice came from the actual preceding commands, recover omitted earlier work receipts, prove every historical skill/body transition, or authenticate same-minute dispatch/allocation ordering. Current paid skill totals constrain practice ownership; they are not an authenticated record of the actions that produced those totals. A consistent edited snapshot may load. Pending Human activity remains subject to released Human's exact current pending-state checks. The explicit tests include a body-history edit accepted by this contract and an unearned-food/pending-time edit rejected by it.

The focused lifecycle tests are `tests/camp-current.test.js`; UI/session tests are separate. The independent source-pinned comparison and measured dependency/restoration costs are documented in [camp-current-comparison.md](camp-current-comparison.md). No claim of equal historical assurance or general human realism follows from retained synthetic outcomes.
