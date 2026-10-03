# Before the Water: playable maintenance/watch slice

Date: 2026-09-08. Scope authorized by the user's autonomous game milestone request; this is one bounded episode, implemented on `codex/watch-playable` and integrated/deployed by the parent lane.

## Product decision

The existing minute-18 headless example proves lifecycle wiring but asks only for repair plus lookout. A longer repair target would add waiting. This host instead makes scarce owned parts and one worker's limited capacity matter to a choice between preserving service and protecting the site by closing service.

**Before the Water** starts with a tired keeper (the player), a neighbor willing to help with lookout and preparation, three owned parts (two yours, one theirs), and one meal each. A surge will arrive within a displayed forecast window. A six-minute lookout identifies its exact arrival. All outcomes are authored and deterministic. There is no random seed or hidden cognition.

Two approaches are feasible in the default 32-minute scenario:

- Repair three six-minute gate sections, using three parts and substantial effort. Recovery is necessary for the keeper's initial condition. The repaired gate protects the site and preserves water service. The neighbor can watch, then spend two minutes handing over their spare.
- Prepare a ten-minute diversion, using two parts and less effort, then spend four minutes opening it after a completed lookout. The diversion protects the site but closes water service. One part can remain available, and less heavy work is needed.

A 22-minute short-notice scenario keeps the same action rules and starting body state. It makes the repair/recovery schedule too slow and gives the diversion a consequential role. A player can commit parts to repairs, later discover the timing, and need the one available eight-minute salvage trip to recover a viable alternative. The game does not promise every late pivot can succeed.

A simple fixed repair-first route and a diversion-first route are retained as executable examples. Neither is called an intelligent policy. A full wave system, enemies and campaign progression are deferred. Site protection, continuing water service, remaining parts, and actual paid work are separate outcomes, not a synthetic moral score.

## Boundaries and exact reuse

Create `src/games/watch.js`; its only shared dependency is the declared combined runtime source entry `../runtime/index.js`, exposing the same API as `human-framework-runtime`. Human/runtime 0.1.1, clock 0.1.0 and transitive frozen model remain unchanged. The original `examples/maintenance-watch` remains unchanged.

The new host adapts the headless example's explicit person/attempt/clock wiring, receipt matching, partial-work reservation discipline and versioned snapshot reconciliation. New host rules are separate target progress, per-person ownership, paid transfer/salvage/meals, two alternative protections, scenario forecast, a terminal outcome, and a canonical integer-minute driver. It does not duplicate body/capacity/practice formulas, promote a social protocol or depend on laboratory Full. Practice is retained by the runtime but this short host does not convert it into accelerated repairs.

## Host lifecycle

Every active person has one working or idle attempt. A command never advances time. The clock advances only through explicit integer requests, one canonical minute at a time, so event stepping, continuous UI playback and JSON resumption can be byte-identical. Work may overlap; one person cannot accept a second job until explicitly interrupted or complete.

Gate repairs preserve paid partial progress. One part is installed when the first minute of a new six-minute section is paid; interrupted unfinished sections keep that part. Diversion similarly consumes one part on first use of each five-minute section. Unused reserved parts return to their owner. Watch, transfer, salvage, opening and meal effects require full payment; interruption does not create their completion effects. Transfer reservations return to the giver; meal reservations return until actually eaten.

The arrival is scheduled before task receipts. Paid repair/preparation progress at the arrival minute is real, while a lookout or opening finishing at that exact moment is too late. The arrival freezes world time, interrupts active jobs once, returns unused reservations and records one terminal outcome. Rest, idle, commands and re-delivered receipts cannot change a settled result.

Neighbor repair refusal is an explicit role rule. Neighbor transfer refusal before a lookout is an explicit ownership rule: the spare is retained until timing is known. Capacity is checked by the runtime against actual body state; refusal never silently consumes time, food or a substitute action. UI forecasts use perceived estimates and state that status.

## UI and save behavior

New `/watch/` page with `web/watch.html`, `web/watch.css`, and `web/watch.js`. The parent adds public page registration and the gallery link. The allowlist already publishes `web` JS/CSS and flat `src/games`/runtime files.

The first screen states the objective, alternatives, expected arrival and paused state. A simple SVG inlet scene reflects repair/diversion/outcome. Two person cards expose current jobs, owned supplies, condition estimates, task costs, acceptance/refusal reasons and explicit interruption. Actions use buttons with full names, duration and material consequences. Productive actions are never automatically chosen.

Time controls: next event, one minute, play/pause; playback pauses on either non-idle job completion, any refusal, arrival, file import, refresh, visibility loss and interruption. No offline catch-up. While running, task selection pauses first. A persistently visible status explains why time stopped. There is no mandatory tutorial or default policy.

Every successful host transition autosaves locally; download/import preserves the full versioned host snapshot. Files over 64 KiB reject. Invalid stored/imported files show an actionable message and do not replace the current session. Restart uses a visible scenario selector and warns the user to download if retaining the previous run. Model limitations appear only in the collapsed model-notes section; optional researcher view exposes versions and deterministic status.

## Validation and evidence

Before implementation, write headless tests for ownership, capacity/role refusal, both routes, the short scenario, partial interruption, meals, simultaneous events, arrival ties, bounded state, immutability, malformed commands, strict imports, forged action contracts and duplicate receipts. Preserve exact equality under save/resume and minute/event drivers. The validator checks normalized person action/effort/capacity and timing against jobs, owned reservations against task/progress, queue receipts against active jobs and arrival, and terminal outcome against final world facts.

Browser QA should cover mobile and desktop layouts, keyboard actions, both outcomes, pause behavior, reload/import/export and failure feedback. Automated checks do not substitute for human usefulness or physical-device testing. Existing controls and all frozen runtime locks must still pass. Record commands, actual test counts and route traces; retain failures found during review with regression tests.

## Dated correction after independent evidence review

On 2026-09-08, review found that the initial short-notice statement was too strong if interpreted as ruling out all repair schedules. The original fixed route rests for six minutes and fails at 16/18 repair minutes. With the exact same rules, the keeper can instead rest from 12 to 15, explicitly interrupt recovery, then complete the final section at 21 before the minute-22 arrival. This succeeds while preserving water service. Retain both traces and the new regression; do not tune away the counterexample. The design's timer was a hypothesis about a schedule, not proof of global infeasibility.

Separate design review challenged the depth of the two alternatives: unused parts and condition have no downstream use in this episode, so a faster/lighter diversion is not established as equally valuable to a successful gate repair. The playable result is a bounded scheduling puzzle with visible resource/agency consequences; longer-term competing obligations remain a new game-design need.
