# Before the Water

A bounded playable preparation puzzle at `/watch/`. Two people have owned parts and different agreed roles. A tired keeper can repair three gate sections, while a neighbor can watch, hand over a spare or prepare a diversion. The surge ends the episode. There is no continuing campaign.

## Two executable approaches, with a limit on the claim

The exact traces and final conditions are in [route evidence](../artifacts/watch-playable/routes.json), reproduced by `node scripts/watch-evidence.js /tmp/watch-routes.json` under Node >=22. Choose a fresh output path: the runner requires an explicit destination and rejects existing files.

| Fixed route | Default arrival at 32 | Short-notice arrival at 22 | Paid productive work | Paid rest | Available parts at outcome |
|---|---|---|---|---|---|
| Gate: repair/watch concurrently, repair/share, rest, final repair | Site protected; water service continues | Gate has 16/18 paid repair minutes; site floods through one unfinished section | 26 min default / 24 min short | 6 min | 0 |
| Gate with brief rest: stop recovery after three paid minutes, finish the last repair at 21 | Site protected; water service continues | Site protected; water service continues | 26 min | 3 min | 0 |
| Diversion: prepare/watch concurrently, then open | Site protected; water service closed | Site protected; water service closed | 20 min | 0 min | 1 |

These are two feasible approaches in the default episode and a useful fallback distinction under short notice. They do **not** establish equally valuable or nondominated player choices. The episode records remaining parts and condition but supplies no later use for them. If a player values only site protection and continuing service, the successful default gate route is preferable. The short scenario makes the fixed six-minute-rest route too slow, but an independent reviewer found that three paid recovery minutes suffice: explicitly stop rest at minute 15 and finish repair at 21. This successful counterexample is retained as a regression and trace without changing the mechanics. It is a bounded scheduling puzzle, not evidence of deep strategy or long-term progression. The independently reviewed design concern is preserved here rather than addressed with an arbitrary score bonus. A later competing obligation would need to give retained resources or capacity an actual use before claiming that broader tradeoff.

The first-play UI exposes a forecast window until either person's completed lookout establishes the exact arrival, after which the timing is shared. Both scenarios are deterministic and their forecast windows identify them. Source, exported saves and the internal clock reveal the exact arrival before lookout; there is no secrecy or anti-cheat claim. Lookout is a paid information task plus an explicit prerequisite for opening the diversion and the neighbor's spare-part response, not a cognition model.

## Reuse and host changes

`src/games/watch.js` imports only `../runtime/index.js`, the source equivalent of the declared combined `human-framework-runtime` package entry. It calls `createPerson`, `getPersonView`, `assessEffort`, `beginAttempt`, `advanceAttempt`, `finishAttempt`, `exportPerson`, `restorePerson`, and the public clock lifecycle functions. It reads the documented versioned person snapshot only to validate an imported action contract. Human/runtime remains 0.1.1, clock remains 0.1.0, and the transitive model source is unchanged. Existing games retain their older imports. No portable package export or runtime helper was added.

The new host adapts explicit wiring from [the independently authored headless consumer](independent-consumer.md): one job and due receipt per person, idle maintenance, arrival-first ties, partial repair accounting, resource reservation return, receipt validation, bounded recent messages and strict person/job/clock reconciliation. That original example remains unchanged. This adaptation is not a second independently installed consumer or a blind authoring test.

New host-owned rules are a second target, per-person parts/food ownership, partial installation in sections, two-minute transfer, one eight-minute salvage trip, paid meals, six-minute recovery, role/ownership refusals, forecasts, opening a prepared diversion and a terminal arrival. Canonical one-minute advancement makes save continuation, arbitrary integer chunks and event controls exactly equal. No body, capacity or practice formula is duplicated; practice is paid but does not accelerate this short game's task durations.

A recipient owns their spare and can refuse a request; the current refusal reasons are authored role, busy state, timing, available supplies and capacity. The keeper is the only person accepting gate repairs. Deniz retains their spare until a lookout is complete. Either person's lookout supplies the shared timing. This preserves action and resource agency without claiming a general consent, relationship or social-cognition system.

## Public host API and saved-state boundary

- `createWatch({scenario:'steady'|'short'})`, `requestTask(state,actor,task)`, `interruptTask(state,actor)`, `advanceTo(state,absoluteMinute)`, `nextEvent(state)` and `getWatchView(state)` are pure public game operations. Actors are `keeper` and `watcher`; task names are exported as `WATCH_TASKS`.
- `exportWatch` wraps full active state in `{format:'before-the-water',version:1,state}`. `restoreWatch` rejects wrong fields, component versions, resource totals, reservations, progress, effort, capacity, job timing, queues and terminal outcomes. Snapshot size is bounded at 65,536 characters; the UI limits imported file bytes to 65,536.
- `receiveReceipt` is a replay-defense diagnostic for rejecting premature, stale or duplicate delivery. A currently valid running snapshot requires job completion strictly in the future, so external callers cannot use it to finish a job. `advanceTo` owns legitimate settlement at each boundary. This is not a general externally injectable completion interface.

Parts install on the first paid minute of each gate/diversion section. Stopping keeps installed work and returns unused reserved parts to their owner. Interrupted transfers and meals return their reservation without delivering the completion effect. Finished meals debit food and apply runtime relief once. A prepared diversion alone does not protect anything: it must be opened before arrival. Arrival is scheduled first and imports must retain its original `event:1` identity, so exact-tie opening/lookout completion is too late, while already-paid repair progress counts. Arrival freezes time, interrupts work once and returns unused reservations.

Imports validate present consistency; they do not authenticate a rewritten but internally consistent history. The active state retains only two people/jobs, a single arriving event, one last receipt, one response, bounded totals and twelve recent messages.

## UI, verification and limitations

`web/watch-session.js` supplies the presentation's pause policy and is tested separately. No playback setting is saved as world state. New sessions and imports start paused. Commands, refusals, explicit interruptions, speed changes, downloads and visibility loss pause; playback stops when either person finishes a non-idle job or the water arrives. A long frame is capped at one second of playback; no offline catch-up occurs. Time controls all call the same host operations. A failed file import retains the current episode and displays the reason.

The page provides objective, progress, expected/observed timing, owned supplies, estimated condition, costs, acceptance/refusal, stop controls, local autosave, JSON download/import, an outcome and scenario restart. Keyboard buttons retain stable DOM identity while time updates. All model limits remain in the single collapsed model-notes section.

The targeted host tests cover both route outcomes and a retained counterexample, partial work, ownership, recovery, salvage, paid meals, arrival ties, immutability, deterministic JSON continuation, clock-driver equality, malformed imports, forged execution contracts and duplicate receipts. Session tests cover pauses, both step controls, playback boundaries and no offline catch-up. Full-suite and browser evidence are recorded in [verification](../artifacts/watch-playable/verification.json).

No human playtest, five-person explanation gate, physical-mobile performance result, blind onboarding benefit or general psychological claim is made. Default route completion is reproducible mechanical evidence. It does not settle whether this puzzle is enjoyable or whether a more complex human component earns its cost against a simpler model.

## Integration

The integrating lane must add `'watch/index.html':'web/watch.html'` to `scripts/public-pages.js`, add `/watch/` to the games gallery, and describe the bounded episode in the current handoff. Existing allowlisted flat directories already publish the new `src/games/watch.js` and `web` JS/CSS files. No research or examples need to be published. The root lane owns app versioning, push/deploy and live `/release.json` verification.
