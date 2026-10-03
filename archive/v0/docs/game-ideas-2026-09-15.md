# Small game ideas after the experience milestone

**2026-09-22 delivery:** The user subsequently authorized building the ideas. All three now have bounded implementations in [app 0.16](release-0.16.md); the proposal below remains the original design context.

The user asked for several rounds of framework progress, followed by another round of subagents proposing simple games. The idea round began after all **1,102 tests** passed for episode retrieval, paid attention/inference and cross-application integration. Three fresh GPT-5.6-sol agents at low effort read the delivered capabilities. The following proposals are ideas, not implemented games or new framework requirements.

## Independent proposals

| Agent and proposal | Player decisions | Existing capability exercised | Smallest stated scope |
|---|---|---|---|
| `game_workshop`: Shared workshop, one repair slot | Read a bulletin, request/release a bench, attempt an alternative method or wait; handle a failed attempt and try again | Workspace memory/attention and actual paid actions; institution grants, queue and holds | One room, player and peer, one bench, one tool, a short closing deadline |
| `game_household`: The shared doorstep | Attend to a neighbor or sibling, read a correction, verify access, help or repair a missed commitment | Paid attention, historical episodes, contextual care and independent recipient response | One building, two people and two short evenings |
| `game_information`: Two benches | Read diagnosis/stock reports, verify a machine, select a repair, reserve access or defer | Paid attention, supported inference, remembered outcomes and institutional access | Two repair tickets, one shared bench, two short shifts |

The names and outlines above preserve the agents' proposals. “Two benches” actually specifies one shared bench; a future title should match that scope. The household proposal used an urgent medicine retrieval as a story prop, not a medical mechanism. A simpler nonmedical need would serve the same care/access question. The latter two observations are lead assessment, not the agents' original direction.

## Lead recommendation: Shared workshop

Start with the shared-workshop proposal. It asks less new host logic than the two-ticket diagnosis proposal and makes scarce access visible without a large interface. The doorstep proposal remains a useful contrasting consumer later, particularly when care and repair should matter beyond output.

Refine the workshop into one replayable **5–10 minute session**, rather than a fixed sequence of three scenes:

- One room, one player, one peer, one shared bench and two small tasks; a short modeled closing deadline.
- One ordinary bench method and one slower independent method. The host owns which tools actually work and what each task needs.
- At each decision, choose an available action: read a message, request/release the bench, attempt a method or wait. Actions consume time; multiple orders can work.
- An unread correction, an expiring hold or the peer's queue request can change the next viable choice. A paid failed attempt leaves a recorded episode and enough remaining time for a recovery choice when feasible.
- The visible interface distinguishes inbox metadata, read reports, inferred options and actual outcomes. A positive inference does not guarantee success.
- Use a small authored set of initial conditions. Replay changes timing/tool availability without adding generated dialogue, new cognitive rules or a large random world.

This is lead synthesis of the workshop idea, expanding its original single repair into two small tasks to avoid a single linear attempt. It is not an additional user requirement.

## Reuse and host boundary

Import the experienced workspace for paid actions, selected reading, current beliefs, traceable inference and historical retrieval. Use the existing institution module separately for canonical grants and allocation; synchronize it to the actor's actual time. The player supplies choices. The host owns task definitions, tool availability, peer decisions, deadlines, grants, outcome settlement and the whole application save.

No new human faculty is required for this bounded experiment. The game will still need ordinary host and UI implementation, an authored policy for the peer, action admission, and end-to-end tests. “Framework ready for a small experiment” does not mean the full human model is complete.

The game should show at most three mechanisms prominently: remembered outcomes, paid attention, and shared access. Inference can explain an offered method without becoming a separate tutorial. Keep broad model limitations in the existing collapsed model notes rather than the ordinary action flow.

## Discriminating experiment and scope cuts

Replay identical host conditions with a relevant episode absent, the correction unread, or the peer request removed. Trace intervention -> available information/access -> selected action -> paid attempt -> canonical consequence. Preserve an equally informed direct controller. Matching results establish the usefulness of the representation in this case, not cognitive validity or measured developer savings.

No map navigation, inventory economy, trading, open conversation, multiplayer, new physiology, skill tree, reputation score or long campaign. No required upgrade to old game saves. Do not build all three proposals. This task delivers the framework and ideas; implementation of a chosen game is a subsequent task.
