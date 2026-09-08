# Compact game interfaces

Presentation milestone, 2026-09-08. This lane implements the approved player-continuity interface plan across the ten existing games and collection. It does not introduce a continuous-story save, change automatic rest, or correct the separately investigated Common Ground duration behavior.

## Player surface

Each game now has the same arrangement: a persistent objective/time/resource/condition HUD, five named game sections, one selected scrollable panel, and a persistent current-work/time-control dock. The ordinary 375×667, 390×844 and 1280×800 viewports do not scroll the document. Long maps, journals, actor choices and setup remain available inside the selected panel. At short heights or high zoom (570 CSS pixels high or less, or 340 CSS pixels wide or less), readable document flow replaces the fixed-height layout; the tabs remain sticky and the control dock stays in the document.

| Game | Sections |
|---|---|
| Before departure | Actions, Workshop, You, Result, Save |
| Pump Yard | Actions, Yard, You, Result, Save |
| Courier Round | Actions, Map, Parcels, Result, Save |
| The last water | Actions, Meryem, Water, History, Save |
| Common Ground | Work, People, Camp, Journal, Save |
| Before the rain | Work, People, Caches, Journal, Save |
| Before the Water | You, Deniz, Inlet, Journal, Save |
| Last Light | Route, Notebook, You, Journal, Save |
| Service Day | You, Deniz, Sites, Journal, Save |
| A Shared Promise | You, Deniz, Plan, Journal, Save |

The collection suggests a learning order beginning with Before departure and exposes all ten direct destinations through a compact picker/preview. Desktop also offers a vertical keyboard tablist. It explicitly states that these games keep separate saves and do not carry people or progress between games. No game is locked behind another.

The shell preserves original control nodes, IDs and listeners. Tab navigation and newly added reading disclosures pause an active Play through the game's existing Play control; they do not advance time, cancel work, alter saved bytes or invent an idle job. Arrow keys and Home/End navigate tabs, with one tab stop and explicit selected state. Current jobs and available unilateral Stop/withdraw controls remain visible outside the selected panel. Public response/report changes gain an unread marker that clears when read.

Courtyard keeps the immediate player and neighbor consequences in the dock. A new proposal reveals Meryem's panel and focuses Accept, while other actions remain available. New runs reveal and focus the first section. End results and the Rain ferry/dusk decisions reveal their relevant panel. Rain's actual Send ferry/Finish day control also remains in the dock; the checkpoint appears above allocation choices. Suggested opening buttons and lengthy work rules use progressive disclosure, and Rain's six ordinary choices share one compact grid.

Last Light states that the launch departs at 12 and arrival at 12 misses it. Each route estimate distinguishes the launch from the overnight beacon deadline. Successful canal arrival remains conditional on the crossing succeeding. The preserved exact-minute-12 browser case delivers the overnight lens and records `launchSailed: false`.

## Public boundary

New shared assets are `web/game-shell.js`, `web/game-shell.css` and `web/games.js`. Existing game pages load the shared shell after their original game module. The shell mirrors only already public DOM values; it does not import a host, read localStorage, consume a full save, own a clock, reveal hidden state or use an LLM. Existing game JavaScript edits are Last Light's deadline/ETA and route copy, plus Rain's shorter paused-clock sentence.

All `src/` files, session-controller files and `scripts/runtime-release-lock.json` remain byte-identical to the lane base. Every host/runtime/model/save identity stays unchanged. Root owns app-version integration, the final source commit, push/deploy, release.json and public verification. This document and the lane's local browser checks are not deployment evidence.

## Validation and review

- `npm test`: 594 passed, zero failures, on Node 23.7.0.
- `npm run build`: 84 public files, 56 static modules, 88 unchanged import edges; engine 0.3.0. Only the three new presentation assets expand the allowlist.
- `node artifacts/player-interface/check.mjs`: all ten games, all five sections, state-preserving tab navigation, Arrow/Home/End focus, and the three required viewports. It asserts no document overflow and no horizontal overflow inside a selected panel. Thirty opening screenshots accompany the report.
- `node artifacts/player-interface/flows.mjs`: 24 explicit checks spanning actual paid actions, concurrent work, stops from other sections, all ten games, collection access, nine game save/download/import/reload round trips, Rain's two checkpoints and end, Watch's three-minute paid-rest success, Last Light radio receipt and exact-minute-12 outcome, and Shared Promise cancellation/acceptance/withdrawal. A new-reading-surface check verifies that Play pauses while saved world bytes remain fixed. Small-screen fallback remains operable at 320×400.

The independent review additionally compared 53 exact serialized states across all ten games with the shell enabled and disabled. It checked 200 selected panels across four viewport sizes, plus focused rechecks of the final Rain and Last Light ordinary-control geometry. The [independent review and late-delta verdict](../artifacts/player-interface/independent-review.md) records exercised scope and exact hashes; root retains the full frozen-source artifacts and focused Fable source-inspection record.

Initial real-browser checks failed before the shared tabs existed. Subsequent integration/visual review caught and fixed a MutationObserver loop, detached-node lookup while relocating controls, controls whose visibility originally depended on a hidden parent, a Workshop map-marker overflow, restart/result focus, new-reading pause semantics, Rain's buried continuation and Courtyard proposal focus. The late focused review also prompted a live Courtyard clock caption, first-load selection without focus theft, permanently mounted empty live regions, visible storage-failure messages and a concise pre-withdrawal consequence. An independent all-ten-game storage-failure injection/recovery pass succeeded; empty and populated live regions retained polite atomic status roles in Chrome’s accessibility tree. Actual screen-reader announcements remain untested.

Two hypotheses were rejected within this lane: the exact Deniz stop-refusal reason already appears in persistent `#time-status` through the existing service session adapters; focused choice reparenting is unchanged adapter behavior that predates the shell. The future-named-job concern about the idle-label matcher does not apply to the bounded existing task labels. The shell’s special cancel visibility is limited to the two inspected hosts, whose cancel state is driven by `disabled`; it is not a general adapter for arbitrary future games.

All saved games, screenshots and assertions under `artifacts/player-interface/` are synthetic local QA. They are not another human participant, scientific validation, a claim of real-device testing or a live-release receipt. Browser runners use the explicitly installed local Playwright module and an isolated ephemeral HTTP server; `UI_BASE` can target a subsequently verified deployment without altering their game commands. `UI_OUTPUT` selects an evidence destination.
