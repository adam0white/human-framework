# Courier Round: bounded design and implementation plan

2026-09-07. The user authorized autonomous design and implementation of this independent lane. Existing laboratory, workshop and human component remain unchanged.

## Decision

Build a solo parcel route on a small connected map. The alternative was a linear series of crossing encounters: easier to teach, but unable to make parcel order or return trips matter. The selected graph has seven places, two risky shortcuts with reliable alternatives, six depot parcels, three bag slots, and a 240-minute round. Six individual due times distinguish an orderly delivery from a merely completed round; late parcels still count. No rewards, money or social model are added.

The player loads individual parcels, travels along adjacent routes, delivers to named destinations, and returns for another load. Ordinary choices complete in one click using the same explicit start/finish command pair. Optional interval mode lives in collapsed play controls; it supports partial advancement and interruption, and imported pending actions remain resumable in either mode. Travel costs time and exertion. A failed shortcut consumes its full interval and leaves the player and parcels at the entrance. Rest costs 15 minutes; two carried meals cost 8 minutes each. Every successful delivery is retained when the round expires or the player uses the explicit end-round control to stop early. Completing all six ends the round immediately, wherever the courier is.

Two crossing conditions are fixed for the round and hidden until a paid 5-minute inspection at either endpoint. Repeated inspection is unavailable because static evidence does not need repeated confidence increments. Estimates use the public human skill/body API and the observed condition or a declared mean condition. Only attempted shortcut minutes practice routecraft; safe travel and observation do not grant it. This is an authored game convention and a testable narrow reuse claim, not a new theory of learning.

## Boundary and determinism

`src/games/courier.js` owns graph, clock, parcel ownership, inventory capacity, inspections, condition generation, per-crossing resolved-trial counters, deadline and summary. Only `src/human/index.js` supplies body and practice; the host never edits those fields. The next random crossing draw depends on seed, crossing identity and its resolved-trial count. It is consumed only after a fully paid allowed crossing, whether successful or failed. Rest, observation, zero-time interruption and unrelated crossing activity cannot consume or reroll it. Elapsed interrupted effort still changes condition and practice through the shared API.

Exports follow the workshop interface: `createGame`, `getGameView`, `getActions`, `startAction`, `advanceTime`, `finishAction`, `interruptAction`, `endRound`, `exportGame`, `importGame`, `applyCommand`, `replaySession`. An early `end` command retains paid pending costs and all completed deliveries; `ended` is distinct from deadline `expired` and all-delivered `complete`. Active state contains current objects, one event and at most one pending attempt. Optional replay is owned by the browser and separate. Import validates bounded fields, immutable world facts, host/person clock equality, legal ownership, terminal consistency and exact pending action contracts. Saves are resumable local records, not tamper-proof competitive proofs.

The detached player view supplies public places, routes, parcels, observed crossing reports, perceived body, practice, action costs and estimated success. It excludes seed, hidden conditions and random counters. Authored benchmark controllers receive only this view; no runtime LLM or laboratory policy is invoked.

## Implementation sequence

1. Add failing host behavior tests for capacity-three loading, destination delivery, paid and interrupted observations, targeted random stability, pending resume, deadline partial success, hidden views and malformed saves. Implement only the host and data definitions to satisfy these contracts.
2. Add host-native route controllers and deterministic tests. Compare reliable nearest delivery, shortest-route delivery and inspection-aware delivery using identical worlds and views. Preserve seeds where simpler behavior wins. Compare matched-duration shortcut practice with a rest control and common recovered retest; do not claim engagement or scientific calibration from simulated output.
3. Build `web/courier.html`, `web/courier.js`, and `web/courier.css`: map, bag, delivery manifest, local actions first, optional hints, persistent pending save, separate optional replay, terminal parcel summary, collapsed model notes. Link back to `/games/`.
4. Run all tests and a source-identified benchmark. Exercise actual browser controls at desktop and 390-pixel width, including partial action reload, save/load and a complete round. Commit only lane files; root integrates, reviews, pushes and deploys.

## Acceptance and limits

Target 20–40 meaningful actions and approximately 6–12 minutes of deliberate human play; the latter is a design estimate pending human playtesting. No horizontal overflow at 390 pixels, controls at least 44 pixels high. Active save below 12 KB with no growing command history; exact pending resumption and replay. Shared human/laboratory/workshop bytes unchanged. Source identities accompany benchmark results. No new packages. Root owns public routing and deployment verification.
