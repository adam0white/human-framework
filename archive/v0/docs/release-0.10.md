# App 0.10: compact game interfaces

Delivered and verified 2026-09-08 at **https://human.adamwhite.work**. Ten games retain their original worlds and saved-state contracts while using the new compact interface.

All ten games now share a persistent objective, time, resource and condition HUD; named accessible tabs; and reachable current-work/time controls. The collection suggests a learning order beginning with Before departure and retains direct access to every separate saved game. Ordinary tested phone and desktop views avoid document scrolling; long histories, rules and setup use the selected panel. Short screens/high zoom retain an accessible scrolling fallback.

Last Light clearly distinguishes arriving at minute 12 from arriving before the evening launch. Reports, refusals, proposals, checkpoints, withdrawal consequences and save-failure messages remain visible when other panels are closed. [Full interface and tested boundaries](compact-interface.md).

No public host, runtime/model/clock, session controller or save contract changed. This release does not yet merge games into one world or deploy automatic rest/ongoing-work semantics. The new [direct player feedback](player-feedback-2026-09-08.md), [private work correction](continuous-work-results.md) and [earned-camp continuation proposal](story-continuity-proposal.md) guide the following milestone.

[Independent review dispositions](reviews/2026-09-08-continuity-review.md) preserve concrete fixes and scoped Fable/Astra evidence. The integrated suite passes 620 tests on Node 26.8.1; all 26 new work tests pass minimum Node 22.0.0. The local build has 84 files, 56 JavaScript modules and 88 static edges. Deployment dry-run passes. Local browser evidence covers all ten games, 30 viewport cases and 24 active flows; an independent paired comparison retains identical saves across 53 interactions. Production verification below is complete.


## Verified delivery

| Identity | Verified value |
|---|---|
| App | 0.10.0 |
| Deployed source | `c51ae76921722addde75bdd8650f4ce025e5c823` |
| Worker version | `09b2a78a-4de3-4872-ad0a-8963dba59839` |
| Public payload SHA256 | `a0947bf45e6efcfcde94beecc624b11edb8bd3c97db6e772c7a58c8fb3728517` |
| Laboratory / Human / clock | 0.3.0 / preserved 0.1.0 and 0.1.1 / 0.1.0 |

The deployment repeated all 620 tests successfully. [Exact live verification](../artifacts/release-0.10/live.json) matches the pushed clean source, manifest, all 82 public payloads and required headers; all 40 private/missing paths return 404. [Deployment output](../artifacts/release-0.10/deployment.txt) · [Release manifest](../artifacts/release-0.10/release.json).

Production browser checks then passed for [all ten games and three viewport sizes](../artifacts/release-0.10/production-layout/result.json), and [24 active interaction/save/endpoint checks](../artifacts/release-0.10/production-flows/flows-result.json). These use fresh isolated browser storage and synthetic actions. Root separately inspected the live mobile game chooser and local active HUD/report behavior. Physical mobile devices, Safari and actual assistive-technology announcements remain untested; the recorded checks concern browser behavior and emulated viewport sizes.

Original lane branches remain at UI `87724ef`, rest/work `811bc5c` and story proposal `89f2055`. Root's reviewed private JSON-validation correction is `76b7ffe`; old and corrected outcomes remain archived. None of the private story/work artifacts is a newly deployed game. Newer evidence/documentation commits must be distinguished from the deployed source above and do not require redeployment when public bytes are unchanged.

A final [independent documentation audit](../artifacts/release-0.10/documentation-audit.md) checked release identities, counts, local links and public/private boundaries against retained evidence and found no actionable discrepancy.
