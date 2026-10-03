# Common Ground: Before the rain

Design fixed 2026-09-08, before implementation. This is an autonomous, bounded product milestone authorized by the user. Existing Common Ground 0.1.0, its page and saves remain the control. The supplied player snapshot is evidence of an unresolved late-game gap, not a recovered action history and not a scenario fixture.

## Question and alternatives

Can a short afternoon with two useful destinations make surplus choices consequential and explainable? Extra cache quotas would retain the present unresolved use problem. Maintenance decay would introduce another ongoing resource drain and broader rules. This version instead adds one allocation decision with different deadlines and yields, without changing body, clock, gathering or Meryem's consent rules.

## Play

Start at an established camp, produced reproducibly by the existing build-first policy through the unchanged public commands. This is an authored opening, not the user's save. It reaches minute 220 with all three structures, no caches and neither person working. Preserve the resulting supplies, fatigue, hunger and practice; do not grant free recovery or supplies. The opening's exact state is tested against fresh reproduction.

The playable afternoon lasts 180 simulated minutes. A ferry leaves after 90 minutes. The UI explains both deadlines from the start. At the ferry checkpoint, time pauses before further work; the player can allocate earned caches and explicitly dispatch the ferry. At dusk, work pauses and the player can allocate remaining caches to camp before finishing the day. Do not reward or consume unfinished work. Saving pending jobs remains valid.

- A cache sent with the ferry equips one visiting household for the coming wet spell. There are two households waiting. They cannot receive a late cache after the ferry departs.
- A cache retained for camp provides two wet nights of stored supplies. Four wet nights are expected; up to two caches can be retained.
- Each completed cache can serve exactly one destination. Packing costs the original 6 timber + 3 salvage and the original paid construction time. Gathering and recovering also consume the shared afternoon clock. Allocation itself takes no additional simulated time; it is a decision about completed supplies.
- Allocations are final and visibly labeled. Unused caches remain unused at conclusion; do not silently assign them or grade a preferred priority. No numerical morality score or population claim.

Two useful approaches are feasible: send the first cache to the households, or retain it for two nights at camp. A prospective build-first continuation of the opening packs caches at 73, 92 and 144 minutes; its fourth finishes after the 180-minute window. This is exploratory pacing evidence, not a preregistered result or evidence of enjoyment. Earlier assembly may change what reaches the ferry; later work can still improve camp provision. Keep counterexamples where waiting, recovery or leaving some needs unmet is sensible.

## Boundary and state

A narrow `src/games/commons-next.js` wrapper owns episode version 0.1.0, start/ferry/dusk times, departure status, bounded allocation receipts and conclusion. It delegates every body/world command to unchanged `src/games/commons.js`. The inner cumulative cache count stays a production receipt; wrapper allocations track which caches have been used. Never decrement the inner counter or rewrite frozen conservation ledgers. Human 0.1.0 and clock 0.1.0 stay unchanged.

Exports mirror the base's commands and add `allocateCache`, `dispatchFerry` and `finishDay`. Views label available caches, destination needs, deadlines, outcomes, projected job finishes, estimates, and Meryem's independently chosen response/recovery. Crossing a checkpoint is clamped so minute, event and chunk drivers can stop for the same player decision. Time does not silently pass during a checkpoint, hidden tab, load or offline interval.

Save format is `human-common-ground-before-rain`, wrapper version 1; device key is separate from `human-common-ground-v1`. Validate exact field sets, inner save through the frozen importer, fixed opening/times, allocation count/order/deadline and earned production bounds, departure state and ending consistency. Reject old game saves explicitly. Public outputs include only the new game and web source; no private snapshot, experiment report or tests.

## UI and scope

A separate `/commons-next/` page emphasizes two destination cards and a timeline, shared available materials, each person's current job/remaining time, recovery estimates, packing and gathering choices, explicit help request/release, recent outcomes, pause/play/next-event controls and separate import/export. At checkpoints explain why time stopped and the consequence of dispatch/finish. The finite result names households equipped, camp nights covered, unmet needs, unused caches and incomplete work. Link directly to the preserved unbounded Common Ground control. Keep general scientific/theological notes in one collapsed model-notes section and precise internals in the researcher view.

No campaign, rainfall simulation, harm simulation, travel physics, new human faculties, social module, automatic game controller, public player archive or runtime release. Rain and households are authored stakes expressed by outcomes, not simulated agents or calibrated weather.

## Verification and falsifiers

Write headless tests before production code. Verify reproducible opening, immutable base behavior, token conservation, timing checkpoints, explicit refusal/release, paid recovery, pending save/resume, strict imports, deadline-bound production, different driver chunks and reachable distinct outcomes. Compare the variant and the original with identical commands from the same synthetic opening. Preserve physical-output equality and unmet needs as expected negative findings: new story outcomes do not establish a better model or more enjoyable game. A scripted timing pair can show whether early packing changes ferry options; it cannot stand in for a human explanation test.

Parent integrates the route/catalog, performs independent review and desktop/mobile QA, then commits/pushes/deploys and verifies live identity. This lane commits only its scoped files. The user explanation gate and physical-device timing remain open.
