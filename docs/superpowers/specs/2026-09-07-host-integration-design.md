# First host-owned game and policy contracts

User authorization: 2026-09-07, continue the reviewed roadmap, make real implementation progress, use subagents and two separate external Claude instances with `--model fable`. This is the next bounded architectural slice, not a universal SDK.

Keep the 0.2 laboratory archived and replayable. New laboratory play uses engine 0.3 with an explicit dimensionless `goalUtility`, progress-to-goal valuation, remaining-time opportunity value and an all-actor planned-simple comparator. Actual capacity/maintenance physics stays unchanged. A new standalone host uses a separately versioned human component and declares its own fallback; no automatic ration choice follows from capacity alone.

## Owners

The host owns locations, prerequisites, inventory, hidden object condition, available opportunities, authoritative success, scheduling, clock, victory, session save and optional event log. Human state owns fatigue, hunger, skill, elapsed person-time and one pending attempt. The policy receives only a projected view and known opportunities. Explanations format recorded causes; they do not write state.

Root implements `src/human/index.js`, deployment packaging and laboratory UI wiring. A policy agent owns current laboratory core and legacy 0.2. A host agent owns `src/games/workshop.js`, `web/workshop.html`, `web/workshop.js`, `web/workshop.css` and its tests. External reviewers own their reports and invocation provenance only.

## Human component contract, version 0.1.0

All functions return detached data and use no I/O or LLM. Import through `src/human/index.js`.

- `createPerson({id, body:{fatigue,hunger}, skills, observationBias=0})` returns `{version,id,body,skills,observationBias,minutes:0,nextAttempt:1,pending:null}`. Body/skills are bounded authored proxies. There is no host world, inventory or transcript.
- `getPersonView(person)` returns id, rounded perceived body, skills, elapsed minutes and the observable pending action identity/elapsed duration. It excludes actual capacity and any hidden host world.
- `beginAttempt(person, {actionId,targetId=null,durationMinutes,effort=0,exertive=false,activity='active',skill=null})` installs one pending attempt with a generated ID, full-duration capacity assessment and zero elapsed minutes. `activity` is `active`, `rest` or `meal`; it describes a human effect, not the host action vocabulary. Unknown fields, invalid values, duplicate starts and unknown skills fail explicitly. Capacity is authoritative execution information, never a policy input.
- `advanceAttempt(person, minutes)` advances a pending interval no further than its remaining duration. Maintenance applies once for elapsed minutes; allowed exertion accrues proportional effort, rest recovers over elapsed time, and actual active practice accrues only for a known skill. Blocked exertion accrues maintenance, with no work effort, practice or automatic recovery. A host can terminate that blocked attempt after its declared interruption interval. This component does not select recovery.
- `finishAttempt(person, {attemptId,status,mealConsumed=false})` accepts `completed`, `failed`, `interrupted` or `blocked`. Complete/failed requires the full interval and allowed capacity; blocked requires a blocked assessment; interrupted can end an allowed partial interval. A confirmed completed meal grants relief only when the host has debited its ration. Other activities cannot claim consumption. The pending ID is consumed exactly once; late/duplicate outcomes fail. Returns a new person with pending cleared. Practice/time already applied during advancement are never applied again.
- `exportPerson(person)` / `restorePerson(record)` validate a versioned snapshot, including pending attempt and counter. Unknown versions and malformed/inconsistent state fail. No growing deduplication ledger: monotonic attempt IDs and one pending attempt reject old results.
- `assessEffort(body,{durationMinutes,effort,exertive})` and `estimateSuccess({skill,body,difficulty,hazard=0,exposure=0})` expose the common authored capacity and success equations. The caller supplies perceived values for forecasting, actual values for resolution. Reuse existing `PARAMETERS` and `practice`; preserve one owner for their application.

The host must save its world, pending action, person snapshot, seed and host version together. It must atomically reconcile human and inventory effects, prevent a hidden outcome from entering the policy view, and record any external interruption affecting replay. Pure snapshots support resume; a separately stored command/event log supports session replay. Diagnostic history is optional and excluded from active causal state.

## First game

One worker restores a pump before departure. Storage and the pump room have persistent objects and a part/tool prerequisite. Travel and retrieving an item are real host actions; repairing changes the object state. Provide two feasible routes with different time/resource consequences. Meals require accessible food. A blocked exertion ends after a declared short idle interruption, supplying no free rest/meal. The original Solo control stays separate and social-free.

An action may be started, advanced in small elapsed increments, interrupted, completed, exported while pending and resumed. Ordinary play foregrounds the task and consequences; scores/diagnostics are optional. Host-local controllers compare greedy, planned maintenance and task-aware action choice with the same observed information. No social or cognition subsystem is added solely to enlarge coverage.

## Acceptance

Regression pairs cover equivalent task units, terminal productive choice, blocked capacity, all-actor planned control and exact old replay. Component tests cover hand-calculated time/effort/recovery, no blocked practice, partial interruption, duplicate/late outcomes, inaccessible food remaining host-owned, malformed snapshots and 10,000 events with bounded active state. Host tests cover changing opportunities, inventory and prerequisite ownership, seeded outcomes, two feasible routes, interrupted save/resume and hidden information. A different author adds a second host interaction without core changes. Public build exposes only explicit game/component assets; production/mobile QA and exact release identity follow the existing workflow.

The external reviews may cause a narrower result or change the later roadmap. No benchmark win alone admits a new human faculty.
