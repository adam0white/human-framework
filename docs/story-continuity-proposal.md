# Continue the camp the player built

Proposed 2026-09-08. This document and its [read-only executable probe](../artifacts/story-continuity/feasibility.mjs) are a design milestone, not a delivered story, new save importer, rest/work correction or evidence of human realism. [Retained probe output](../artifacts/story-continuity/feasibility.json) records the exact sources, existing saves, scripts and limits. The [active plan](superpowers/plans/2026-09-08-player-continuity.md) owns subsequent implementation and review.

## Recommendation and the difference it must make

Build the smallest genuine continuation at **the player's Common Ground camp → the ferry and rain supply window**. Keep the same player, Meryem, camp, stock, bodies, practice, accepted project, unfinished jobs and absolute clock. Reuse the existing household-versus-camp allocation decisions. Begin with a progressively disclosed camp interface and change the immediate objective when the actual camp becomes established; do not load a replacement camp.

The concrete gap is in `src/games/commons-next.js`: `createGame()` currently plays an authored Common Ground controller to its milestone, then copies that particular opening. This is an earned *scripted* world, not the world its player just built. The wrapper validates one opening time, assumes no earlier caches, and uses bounded new-production receipts. A playlist link cannot fix those contracts.

**Service Day is the serious redundancy control.** It already runs the inlet and clinic obligations with the same people, inventory, paid partial work and one clock, including recovery after morning failure. Shared Promise already has a replayed morning rather than an instant body reset. Renaming either phase “Chapter 2” would add presentation, not a new continuity mechanism. A progressive UI over those preserved hosts is sufficient to test their interface burden. It does not address a player leaving their own Common Ground camp for the fixed Before the rain opening.

| Option | Actual benefit | Cost or limit | Decision |
|---|---|---|---|
| Playlist with a common HUD and suggested order | Fewer interfaces to relearn; optional tutorial sequence | Repeated names and links do not carry actual people, work or consequences | Keep as collection/control; do not call it one saved world |
| One camp with an earned supply-window transition | A completed project creates the next use for the player's retained state; late provision remains meaningful | Needs a small new wrapper/save contract and entry-state coverage | First story slice |
| Merge all ten games into a campaign | More settings, people and possible callbacks | Different actors, resources, time scales, policies, skill domains and save formats need new authored mappings; length alone cannot show value | Defer |

The first slice should not add another quota, a relationship score, an automatic moral judgment, a general planner, hidden memory, or a new physiological variable. The private Across the Cut report study remains complete. Its lean factual-report mechanism can become a later geographically coherent chapter if a real information decision survives its strong simpler controls; confirmation and negotiation are not mandatory additions.

## What the source probes actually show

The probe imports unchanged hosts; its candidate boundary fields are metadata arithmetic only. It does not make the old Rain validator accept a new world.

| Existing input | Entry minute and retained state | Current Rain compatibility |
|---|---|---|
| Existing `build-first` controller | Camp established at 220; timber/salvage/food 2/1/2; no active jobs | Accepted because it reproduces the authored opening |
| Existing `stock-first` controller | Established at 226; stock 3/4/5; player timber trip has paid 4 of 14 minutes; Meryem starts an 18-minute rest | Rejected: `Invalid authored opening` |
| Actual previously supplied Common Ground save | At 1,312; camp established at 217; 12 caches; stock 0/1/13; player fatigue/hunger both 1; Meryem retains her distinct body and skills | Rejected: `Invalid authored opening` |

Each world validates and roundtrips through its existing Common Ground save API, then continues identically after JSON restore. For `stock-first`, the pending timber trip began before the woodshed completed, so its original three-timber output remains frozen even though a new trip would receive the woodshed benefit. Carryover must not restart this trip or silently grant a fourth timber. That is a distinct issue from the continuous-work change being investigated in the [rest/work lane](superpowers/plans/2026-09-08-player-continuity.md).

The real 1,312-minute save supplies neither a complete command history nor cache completion timestamps. The probe validates its current state and provenance file; it does not infer why the player acted or manufacture a historical replay. Both policy runs are synthetic scripts, not additional participants. The [direct feedback](player-feedback-2026-09-08.md) remains one person's attachment, pressure and usability observations, not realism calibration or the five-person explanation gate.

The old Rain two-cache schedule provides an already executable branch at its unchanged ferry checkpoint:

| Spend the two completed caches on | Household kits now | Camp nights provisioned now |
|---|---:|---:|
| Both households | 2 | 0 |
| One household and camp | 1 | 2 |
| Camp | 0 | 4 |

Allocation preserves exact people/jobs/stock, uses distinct cache identities, spends each cache once and roundtrips through the old save. These are checkpoint consequences, not three equally good final strategies: later cache production changes the comparison, and the previously recorded dominated camp-first outcome remains. All supported choices should show what is supplied and what remains unmet without inventing a moral ranking.

A separate executed failure continuation does no player work before ferry departure, then resumes the ordinary existing policy. A cache finishes at supply-window minute 148 and provisions two camp nights. The two households remain unprovided; attempts to allocate to them after departure reject. This demonstrates a useful later action after a missed earlier obligation. It does not establish that every carried state can achieve the same route.

## First executable transition

Use one story instance from camp creation onward. The first new headless acceptance is a state transition at the *actual* first camp milestone:

1. Advance through the existing next world event, settle all same-minute completions and Meryem's ordinary next choice, then detect `milestoneAt`. Clamp the story driver here even if a requested larger advance would run beyond it. Do not cancel work to manufacture a quiet boundary.
2. Capture `enteredAt = world.clock.now`, set `ferryAt = enteredAt + 90` and `rainAt = enteredAt + 180`, and enter a paused chapter introduction. Keep the entire authoritative world unchanged. UI tab changes and reading this introduction pay no simulation time.
3. State the actual new objective and what carries forward. The Continue control acknowledges the new objective; it does not reset the clock, cancel either person's job, give food or finish work. The next advance resumes those same pending events.
4. Track new completed caches using actual post-entry receipts. Track caches already present at entry separately as a carried count. Allocate from the remaining carried/new inventory without assigning fabricated completion times to old caches.

This is the smallest host addition that a UI over the existing exports cannot implement safely. Prefer a dedicated wrapper around one explicitly selected camp host, plus a shared presentation, to a universal chapter engine. The chapter introduction can be presentation state; the entered boundary and deadlines must be authoritative saved world facts. Reloading, returning from another tab, duplicate Continue clicks or importing the same save cannot create another supply window.

For a new story the milestone usually has zero caches, but the transition must not depend on that accident. An explicitly chosen import of a valid established legacy world enters at its **current** time, not its historic milestone. The observed old save therefore gets future boundaries 1,402 and 1,492; it does not time-travel back to 217, discard 12 caches, or claim its supply window had already run. This is a clearly labeled continuation import, not an in-place reinterpretation of the original save. Preserve the original file and retain its source version/digest in private provenance.

An already rich camp can immediately cover two households and four camp nights with four of its twelve caches. Let earlier work earn that easier choice; keep the remaining eight caches. Do not confiscate supplies, multiply targets or invent hazards to force pressure. This import is a compatibility/attachment case, not a balanced difficulty benchmark. A valid exhausted camp with available food still pays its actual meal and recovery costs; the story supplies no rescue ration. If all objectives are already covered, allow a short factual close or continued camp inspection without forcing 180 empty minutes.

## One place and one time line

The first slice remains at the camp, grove and salvage shed already named by Common Ground. The ferry serves the two households across the water; the other use is provision retained at this camp. Existing gather durations already include their abstract trip and work. Do not suddenly assign precise actor coordinates, assume Meryem is Deniz, or import a separate clinic or beacon map.

The new window begins when the story introduces its ferry/rain event, after the camp milestone. Its relative timing is authored scenario staging, not an empirical weather model or a claim that constructing a camp causes rain. Display “Ferry in 90 min” and “Rain in 180 min”; retain the absolute camp minute in details. A 1,312-minute camp cannot honestly be called the same afternoon merely by resetting the HUD. Use the forecast/event label for the final boundary, rather than asserting a solar dusk or overnight recovery that the simulation never paid.

The existing Rain control completes cached output before its checkpoint pause; a cache finishing exactly at departure can still be allocated before dispatch. Preserve and test that tie rule in a derivative unless deliberately changing its version. Do not copy Last Light's strict exclusive minute-12 arrival rule into this host by analogy. Each action should show its expected completion and the relevant inclusive/exclusive boundary in plain words.

At the ferry pause, keep unfinished assembly, gathering, meal and recovery alive. After the player dispatches, later production can still serve camp. Failure is local and retained: missed household provision does not end the camp, confiscate completed work or force a restart. At the rain boundary, save the actual camp and unresolved work. A finite first release may offer **Return to camp** (continued existing work without undoing settled allocations) and **Save and leave**. Do not promise an unimplemented next day, imply the allocated camp nights have been simulated, or turn an unbounded cache loop into claimed new story content.

## Progressive disclosure that respects agency

Start with one concrete near-term instruction such as “Make a dry place for the supplies,” the immediately useful build/gather choices, the required materials, and the current job/Next Event controls. The full camp plan is accessible from the beginning; the introduction recommends a path rather than silently forbidding valid alternatives. Meryem exists from the initial state and is visible as a person nearby, not spawned when a tutorial badge unlocks.

| When the fact becomes useful | What the interface reveals | What must remain available |
|---|---|---|
| First job | Objective, duration, needed stock and active work | Stop/advance and a reachable explanation of body estimates |
| A recovery or food consequence | Concrete fatigue/hunger constraint and paid alternatives | Food ownership; no automatic consumption or hidden exertion gate |
| First optional request to Meryem | People panel, her reply, current commitment and job | Her refusal/recovery, release semantics and visible concurrent activity |
| Camp established | Supply-window objective, carried stock/jobs and ferry/rain times | Both people, stop/advance and the prior camp's state |
| First cache or ferry pause | Household/camp allocation with unmet needs | Partial outcomes and a continuation after missed ferry |

This reuses one HUD/tab vocabulary instead of teaching a fresh page after every short objective. A relevant warning or other person's started job must surface even if its panel is closed. Do not delay teaching an irreversible resource/deadline consequence until after a player commits. Numerical body and skill detail can remain in the People/researcher panels while ordinary play shows the useful condition and task estimate. Automatic flexible rest should follow the separately reviewed rest/work contract; the story UI cannot turn old idle minutes into recovery on its own.

Remove **Restart this chapter** from the primary story flow. Keep the original experimental games and replay tools reachable outside it. A deliberate **Start another story** creates a separate slot and preserves the current one; it is not an overwrite or a punishment. Browser refresh, interruption, save import and accessibility changes are ordinary continuation needs, not opportunities to compel replay. The product hypothesis is attachment through remembered consequences, not that denying reset alone makes choices meaningful.

## Version, persistence and replay boundary

Choose and record one camp kernel for each new story save. The public controls remain `COMMONS_VERSION 0.1.0`/Human 0.1.0 and Rain host 0.1.0/save 1. Do not rewrite their source, transitive model or release-lock entries. A future continuous-work/rest camp derivative needs its own explicit host/save version and tests; these probes do not authorize substituting its semantics into a pending old job.

Recommended first storage is a new `human-camp-story` envelope with explicit envelope version, story-host version, selected world-host/Human/clock versions, full validated world snapshot, one supply-window record, carried-cache count and bounded allocation/new-production records. Keep actor IDs `player` and `neighbor`; names are presentation. Persist at every accepted state mutation and at a chapter boundary; changes in tabs or zoom do not issue world commands.

The story validator must reconcile `remaining = carried + actually completed since entry - allocated`, reject duplicate allocations/entry/departure, enforce event ordering and stop all source counters at their declared integer bounds. Do not silently inherit Rain's maximum twelve total caches or fabricate a receipt at every historical cache's supposed birth. Only four caches can be allocated to these objectives, but the residual world stock must remain representable. Review limits on the bounded window's new receipts separately from the legacy host's potentially long lifetime.

For first implementation, exact snapshot import plus deterministic continuation is the proportionate guarantee. Common Ground's old save validates owned state, counters, pending attempts and events; it is not a full initial-state command replay or a tamper-proof signature. Store a validated entry snapshot as the root of any new supply-window command journal. A bounded chapter journal can replay from that root, with enough reserved room to stop requested work, dispatch/finish and save. Do not require replaying thousands of pre-entry minutes merely to load a story, and do not claim this reconstructs the user's missing old history. Test checkpoint/snapshot and journal approaches before choosing a general campaign archive.

For a changed continuous-work/rest kernel, safest early choices are (a) new stories start directly on the new kernel, while old imports remain on the pinned legacy kernel, or (b) a separately specified migration at a validated compatible boundary. Busy legacy jobs require an explicit residual-work/attempt migration or delayed migration after actual completion; never interrupt them for free to make conversion easy. State plainly which import types are supported. Preserve the current story if validation or migration fails.

## Acceptance and rejection cases before public story delivery

The executable probe verifies the existing-host facts above. The following are requirements for the new slice, not tests already passed by it.

1. **Earned entry, not replacement:** reach camp establishment by at least the build-first and stock-first scripts; enter with byte-equivalent underlying world, identities, body/practice, stock, commitments, reservations and pending attempts. Stock-first must retain the four paid timber minutes and Meryem's rest. No scripted canonical opening is substituted.
2. **Visible first boundary:** coarse advance, one-minute advance and next-event advance stop at the same first milestone after all tied events; introduction/Continue/tab navigation do not change the world. The next elapsed minute changes only the chosen kernel's ordinary paid state.
3. **Real later use:** cache ownership and allocations produce the stated competing household/camp facts; an earlier action changes later resources, remaining work or a feasible option. Preserve simpler successful routes and the old dominated allocations. Reject the slice as mere relabeling if all entry states are normalized into the same resources/body/jobs.
4. **Recoverable local failure:** miss the ferry, dispatch, continue a paid later camp action and retain both its benefit and household loss. An unfinished cache crossing departure remains partial at the checkpoint and can finish afterward. No repeated Continue/dispatch/restore can reopen the ferry.
5. **Actual legacy state:** validate the supplied 1,312-minute save, retain all twelve caches and thirteen food, avoid invented completion times, show the player's exhausted state, and let earned surplus satisfy the existing needs. Probe additional legally accumulated stock/long elapsed time near supported limits without forging raw resource fields.
6. **Clock and ownership:** exact ferry/rain ties, a meal in progress, reserved building materials, a pending Meryem commitment and simultaneous jobs survive save/restore and both chapter boundaries. Rain introduction or exit cannot grant recovery, move an actor, finish a task, share a meal or release another person's commitment.
7. **Lifecycle and versions:** new-save roundtrip/continuation, old-page save rejection, no raw save interchangeability, corrupted import rejection, duplicate receipts/allocations, request budget and leave/resume work at caps. Keep old replay/source-lock tests exact and unchanged. Review large-value bounds before offering unrestricted imports.
8. **Useful first screen:** browser checks cover the compact phone/desktop HUD, discoverable optional help, reachability of active job controls and focus across chapter prompts. Ask actual players to explain a carried consequence and what remains possible after a missed event. Record real speakers and exact observations; do not claim a passed human gate from scripted browser tests or this one-player feedback.

Implement the earned-world wrapper and its state tests before expanding narrative. Then add the progressive interface and review the transition on phone/desktop. A successful two-chapter slice earns a scoped product claim: the player's worksite and consequences continue through a later decision. It does not earn a comprehensive human model, automatic norm enforcement, a large campaign, or a validated theory of attachment.

## Executed verification

- `node artifacts/story-continuity/feasibility.mjs artifacts/story-continuity/feasibility.json`: passed on the Node version recorded in the artifact; source files are SHA256-bound, and output creation refuses overwriting retained evidence.
- [Initial run](../artifacts/story-continuity/feasibility-initial.json) is retained. The final run additionally binds the probe itself and transitive model source and exercises literal JSON serialization before restore; its observed outcomes are unchanged.
- `node --test tests/commons-game.test.js tests/commons-next.test.js tests/commons-next-two-cache.test.js tests/service.test.js`: **51 passed, 0 failed**. These exercise the current hosts and establish the controls; no new story implementation exists in this lane.
- No public asset, runtime/model/clock source, original save, older evidence file or deployment was changed.
