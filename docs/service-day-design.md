# Service Day — host design and implementation contract

Written before implementation, 2026-09-08. This is a bounded new consumer of frozen Human/runtime 0.1.1 and clock 0.1.0. Existing games, runtime/model sources and release locks remain controls. No cognition, social or physiological module is introduced.

## Two obligations with one inventory and two people

At minute 24 the morning surge reaches the inlet. Two six-minute gate sections consume two parts and retain water service. A six-minute diversion consumes one part and protects the inlet but forfeits morning water service. After minute 24 a diverted inlet requires a paid three-minute reopening before the clinic can receive piped water. A flooded inlet cannot supply the clinic until its gate is fully repaired; a missed morning service remains a recorded loss even when later repairs restore supply.

At minute 64 the clinic closes its scheduled water intake. A two-section pump repair (six minutes and one part per section) followed by a six-minute delivery supplies both requested units if the inlet supplies water. The clinic has one receiving slot for this crew today. An eighteen-minute cart delivery uses that slot for one of the two units without pump parts or inlet service; it cannot be topped up with a second delivery. Thus resources saved by diverting have a later physical use; repairing the inlet directly requires fetching the one shed spare to also repair the pump. Cart delivery preserves a meaningful partial outcome following morning failure. The morning event records its result and continues the same world; the clinic event ends the day.

You (`keeper`) own two parts and one meal; Deniz (`partner`) owns one part and one meal. The shed contains one part that takes eight paid minutes to fetch. A two-minute handover transfers one owned part. Gate and pump parts install on the first paid minute of each section. Partial installed work persists, unused reservations return to their owner on interruption, and completed meals affect Human only after four paid minutes. Rest lasts six minutes and can be stopped early with its actual recovery retained. A meal is a voluntary condition tradeoff in this standard day, not physically required for on-time work: hunger stays below its exertive ceiling through minute 64 even without eating. Initial conditions are authored: keeper fatigue .50/hunger .86, partner fatigue .25/hunger .78. They never reset between obligations; no state shadows Human body or practice.

Deniz has a visible clinic commitment. They keep their last part until six pump minutes are installed, decline morning repair/diversion that would spend that reserve, and decline cancellation of work they chose for that commitment. Compatible requested work is explicitly accepted or refused. When time advances and Deniz is idle, their host rule eats if hunger is at least .82 and a meal remains, rests if fatigue is at least .55, then (from minute 24) repairs the clinic using owned parts, makes full delivery when possible, or, from minute 42, takes the cart if full delivery is still unavailable. Otherwise they wait. Requested recovery can be interrupted, preserving paid recovery. Their decisions and reasons enter the public record; this is a small authored controller, not inferred motivation or a general social faculty.

## API and public view

Exports from `src/games/service.js`: `SERVICE_VERSION`, `SERVICE_SCENARIOS`, `SERVICE_TASKS`, `createService({scenario:'standard'})`, `requestTask(state,actorId,taskId)`, `interruptTask(state,actorId)`, `advanceTo(state,absoluteMinute)`, `nextVisibleEvent(state)`, `getServiceView(state)`, `exportService(state)`, `restoreService(snapshot)`, and diagnostic `receiveReceipt(state,event)`.

Task IDs: `gate`, `divert`, `reopen`, `pump`, `deliver`, `cart`, `share`, `salvage`, `rest`, `meal`. Actor IDs: `keeper`, `partner`. Functions are pure. A request returns state with `lastResponse:{at,actor,task,accepted,code,reason}`; accepted requests do not move time. Interruption of partner-owned commitment work returns a refusal. Invalid syntax throws with `error.code`. Commands after outcome refuse without changing resources.

`getServiceView` returns:

- `version`, `runtimeVersion`, `humanVersion`, `clockVersion`, `scenario`, `now`, `phase` (`morning`/`clinic`/`ended`), `title`, `objective`, `deadline:64`.
- `milestones:[{id,label,at,status,result}]`, where IDs are `inlet`/`clinic`, status is `pending`/`settled`, result is null or the corresponding result below.
- `people:{keeper,partner}`: detached Human views with rounded estimated body and actual paid minutes; `actors:{keeper:{name:'You',role},partner:{name:'Deniz',role}}`.
- `jobs:{keeper,partner}`: null if idle/ended, otherwise `{task,startedAt,endsAt,origin:'request'|'own',reservedParts,reservedMeal}`.
- `choices:{keeper:[],partner:[]}`: each `{task,label,detail,duration,parts,meal,available,code,reason,finishesAt,tooLate,capacityEstimate:{allowed,causes}}`. Capacity estimates are rounded and advisory; a capacity warning must leave the attempt enabled for an actual check. Other refusals disable the choice.
- `resources:{parts:{keeper,partner},food:{keeper,partner},reservedParts:{keeper,partner},reservedMeals:{keeper,partner},installedParts,shedAvailable,installedPartsByActor:{keeper,partner},eaten:{keeper,partner},handedOver:{keeper,partner}}`.
- `work:{gate,divert,pump}` with caps 12/6/12; `supply:{reopenedAt,available}`, `delivery:{at,route,units}` or null; `morning:{at,protected,waterService,route}` or null.
- `partnerIntent:{task,reason,at}`: current independently chosen work or prospective next choice, with null task while waiting.
- `outcome:{at,morningProtected,morningWater,clinicUnits,clinicRequired:2,clinicRoute,allService}` or null; `lastResponse`, `recent:[{at,actor,message}]` (at most 12), `paid` task totals, `paidByActor:{keeper,partner}` per-person task totals, `remainingCommands`.

Only one standard scenario ships initially. No random draws or private forecast exist. Actions have causal costs and the final outcomes remain separate, with no artificial overall score.

## Timing, saves and finite state

Minute cadence is canonical across frame/step/next-event drivers. Progress for an elapsed minute is installed before processing events. Both obligation events are scheduled before any jobs: an exactly tied gate or pump minute counts, but a delivery/reopening completion at the deadline is too late. The morning event stops unfinished diversion work and carries gate repairs and everything else forward. Later completion of a partially installed gate can restore clinic supply, but cannot rewrite the morning loss. Automatic partner decisions run after all events at that minute, so delivery cannot precede a tied closing event.

State retains two people/jobs, at most two obligation events, constant-size counters, twelve recent messages, one last response and one last receipt. A bounded replay command journal validates imports by reproducing the day and comparing canonical state; saves remain under 65,536 characters. Consecutive advances coalesce. New requested tasks stop at the action budget while enough journal slots remain to interrupt both jobs and advance to closing. Repeated refusals do not fill the journal; the maximum-day duration bounds autonomous activity. Imports reject malformed JSON, getters, cycles, excessive depth/size, changed state or commands, duplicate/reordered receipts and resource/body fabrication. This verifies deterministic provenance within the supplied save, not an external signature.

## Test and evidence plan

First write failing behavioral tests, then implement only this host. Cover two feasible approaches and retained failures; actual later use of saved/fetched parts; succession without resetting actual bodies, meals or partial work; independent choices/refusals and owned reservations; paid meal/rest interruptions; delivery deadline precedence; receipt replay; JSON continuation; clock-driver equality; hostile imports; command-cap completion; and old-game/runtime lock regression. Independent view-only policy comparisons and browser presentation are separate lanes. Do not change physics to force a preferred policy to win.

## Implemented mechanical checks

The first implementation supports these exact keeper requests; advance to each next timestamp, leaving Deniz to their independent rule:

- Direct service: `gate` at 0 and 6, `salvage` at 12, `meal` at 20, `rest` at 24, `pump` at 30, then advance to 64. The morning gate holds, four parts are installed across the inlet and clinic (including the fetched spare), and Deniz finishes full delivery at 42.
- Conserved-part approach: `divert` at 0, `meal` at 6, `rest` at 10, `reopen` at 24, `pump` at 30, then advance to 64. All three initially owned parts are used without fetching the shed spare. The inlet is protected, morning water is missed, and full clinic delivery finishes at 42.
- No player work: Deniz eats, installs their clinic pump section and starts the cart fallback at 42. One unit arrives at 60; morning service and the second clinic unit remain missed.
- Retained fatigue boundary: after gate jobs at 0/6 and shed work at 12, waiting until 30 leaves the keeper unable to repair the pump. Three paid rest minutes still fail the same actual capacity check; four paid rest minutes admit it. This is a new service-day schedule, not a change to Watch's retained three-minute solution.

A completed diversion at exactly minute 24 protects the inlet because the last paid progress minute is installed before the event. A cart finishing exactly at minute 64 does not deliver: closing precedes its completion receipt. The public timing warnings preserve this distinction.

Core tests also check per-person accounting, 40 deterministic mixed command sequences with replay at each step, 10,000 repeated refusals, and reaching closing after the request budget. The separate comparison report owns view-only policy outcomes; these prescribed mechanical routes do not establish a superior policy, human explanation benefit, enjoyment or empirical calibration.
