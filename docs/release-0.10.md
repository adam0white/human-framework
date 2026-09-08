# App 0.10: compact game interfaces

Release candidate prepared 2026-09-08. Deployment identity and production evidence will be appended after verification. Current live app remains 0.9 until that step completes.

All ten games now share a persistent objective, time, resource and condition HUD; named accessible tabs; and reachable current-work/time controls. The collection suggests a learning order beginning with Before departure and retains direct access to every separate saved game. Ordinary tested phone and desktop views avoid document scrolling; long histories, rules and setup use the selected panel. Short screens/high zoom retain an accessible scrolling fallback.

Last Light clearly distinguishes arriving at minute 12 from arriving before the evening launch. Reports, refusals, proposals, checkpoints, withdrawal consequences and save-failure messages remain visible when other panels are closed. [Full interface and tested boundaries](compact-interface.md).

No public host, runtime/model/clock, session controller or save contract changed. This release does not yet merge games into one world or deploy automatic rest/ongoing-work semantics. The new [direct player feedback](player-feedback-2026-09-08.md), [private work correction](continuous-work-results.md) and [earned-camp continuation proposal](story-continuity-proposal.md) guide the following milestone.

[Independent review dispositions](reviews/2026-09-08-continuity-review.md) preserve concrete fixes and scoped Fable/Astra evidence. The integrated suite passes 620 tests on Node 26.8.1; all 26 new work tests pass minimum Node 22.0.0. The local build has 84 files, 56 JavaScript modules and 88 static edges. Deployment dry-run passes. Local browser evidence covers all ten games, 30 viewport cases and 24 active flows; an independent paired comparison retains identical saves across 53 interactions. Production verification remains a separate required step.
