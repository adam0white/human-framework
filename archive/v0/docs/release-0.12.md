# App 0.12 — laboratory retirement

Delivered 2026-09-08 at [human.adamwhite.work](https://human.adamwhite.work/).

## Delivered change

The root and /games/ now show four independent current examples: The camp, Last Light, A Shared Promise and Before departure. Seven earlier experiments are optional disclosure links. Numbered learning order, prerequisites and laboratory navigation are removed. All four current previews fit the tested 375×667 and 1280×800 viewports; opening longer notes or earlier examples uses ordinary page flow.

The laboratory interface, guidance/styles, old controller/simulation/observation files, presets and both legacy engine bundles are removed from publication and local serving. Historical source and comparisons stay private. Shared model/random files remain because the active examples use them. Build and local server now select exact assets; new adjacent experiments are private by default. Independent review caught and corrected a same-directory symlink exposure in local serving.

The manifest now identifies runtime 0.1.1 and clock 0.1.0, replacing the retired laboratory engine field. Some games use Human 0.1.0; host-specific versions remain distinct. No simulation source, game save contract or frozen runtime/model/clock source changed in this release.

## Exact delivery identity

| Field | Value |
|---|---|
| Application | 0.12.0 |
| Committed and pushed app source | 7dbf9aeff7e91fcc8717cc7635e180db2129219f |
| Cloudflare Worker version | 33c66591-b5ff-4d5a-b99c-d1fd470fabaf |
| Public payload digest | 5c5e10da18c1a1d9f7d4d773195807e3e613bcd5e31817a8bacc15cb36e5b56d |
| Public build | 71 files: 56 assets, 13 HTML entries, headers and manifest |
| Static JavaScript graph | 42 modules, 60 import/export edges |

The previous build had 91 files and 61 modules. All 20 removed file endpoints now return 404. Private documentation/evidence committed after delivery is separate from the app source above and does not require redeployment.

## Executed evidence

- **686 tests pass** on Node 26.8.1, repeated by npm run deploy. [Initial suite](../artifacts/release-0.12/tests-node26.log) · [Deployment](../artifacts/release-0.12/deploy.log).
- **8 focused tests** pass independently on Node 26.8.1 and minimum 22.0.0. Isolated actual-source checks cover static linkage, all 90 HTML/CSS references, exact local asset/page responses and before/after symlink rejection. [Review and scope](reviews/2026-09-08-laboratory-retirement.md).
- **Strict production verification:** all 69 payloads exactly match the clean pushed source, with expected headers; all 66 private/missing routes return 404, including every removed laboratory file. Manifest identity and digest match. [Record](../artifacts/release-0.12/live.json).
- **Production UI:** all four chooser selections at phone/desktop widths, keyboard tabs/disclosure, seven earlier links, and no-JavaScript access pass. Six edited player pages load and show Games navigation without laboratory text or page errors. [Chooser](../artifacts/release-0.12/production-chooser/result.json) · [Navigation](../artifacts/release-0.12/production-navigation.json).
- **Fresh production Camp interaction:** enter from the new root, gather timber, pay minute 1, reload the same work, then reach the next event at minute 13; no page errors. [Record](../artifacts/release-0.12/production-camp-smoke.json).

Browser checks use desktop Chrome at configured viewport sizes, not physical phones or Safari. Real assistive-technology use remains untested. These are software checks, not a new human study.

## Direction and next work

The latest user correction is preserved with provenance in [direct feedback](player-feedback-2026-09-08.md#later-correction-after-app-011). The only known player reports finishing all games and permits rebuilding, shortening, merging or dropping examples and breaking old saves. A unified story and all-game curriculum are optional. Current AGENTS, MVP contract, roadmap and active hourly heartbeat carry that instruction; historical milestones are explicitly historical.

The next proposed experiment tests whether Camp's paid durable-work rules improve an independent repair host relative to direct implementation, with interface freeze, eight prescribed histories and explicit rejection criteria. [Protocol](work-progress-proposal.md). It has not been implemented or promoted. This release retires product obligations and reduces the delivered surface; it does not claim a new faculty or calibrated human realism.
