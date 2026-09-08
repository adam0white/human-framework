# Camp UI review

Scope: new Camp UI and its real story/session/slot workflow in isolated synthetic Chrome contexts at http://127.0.0.1:4189/camp/. No production localStorage, private user save, external reviewer, full repository audit, fuzzing, or repository edit was used. Current contracts were read; old review verdicts were not used.

Verdict: no unresolved findings in the exercised scope after the focused correction recheck.

## Confirmed and corrected

1. Keyboard focus fell to BODY when Continue, Dispatch, handover and Stop removed the activated control. Corrected by meaningful Work-tab focus when the phase handler has not already focused a visible chapter heading. Actual Enter interactions pass.
2. The transparent native import input received Tab focus without a visible indicator. Corrected with a 3px focus-within outline on its visible label; screenshot inspected.
3. A previously scrolled Supplies panel hid the newly presented ferry chapter. In the reproducer, scrollTop increased from 80 to 265 and the focused heading was outside the panel. Corrected checkpoint scrollTop=0 leaves the heading fully within the selected panel; screenshot inspected.

The additional inactive-slot removal correction keeps Save context/focus and the exact current in-memory game, including a tested unsaved minute after a forced quota failure. The mobile camp map remains visible and the dock stays within 375x667.

## Executed coverage

- Initial seven phases (new, introduction, packing, ferry, rain, ended, return) at 375x667, 390x844 and 1280x800: 21 screenshots/layout snapshots, no document overflow or page errors.
- Actual UI-click new-camp campaign through earned introduction, ferry, rain, end and continuing camp; phase selection and paid world continuity; finite available-time recovery; paused active-job refresh; accepted handover both directions and persistent Stop.
- Five separate stories through New and real individual-save import; sixth disabled; removal cancel leaves exact stored bytes; confirmed removal and selection preserve independent saves; active pending-job download/import exact.
- Broken storage and corrupt inactive story leave raw data untouched and show persistent warnings; stored-data backup exact. Forced quota failures preserve paid work in memory and permit an exact download.
- Synthetic earned legacy four-cache import cancel/accept, final distinct allocations to two household kits and four camp nights, reload, dispatch and early chapter close.
- 4x paid playback, manual pause, tab-reading pause, details-reading pause, paused reload. document.hidden/visibilitychange handler tested synthetically. Headless Chrome left other tabs visible, so no real background-tab visibility claim is made.
- Final narrow recheck of three reported defects, inactive-slot removal under quota, and all five 375x667 panels; final screenshots visually inspected. No unnecessary whole-campaign rerun after presentation corrections.

## Source identity and evidence

Initial source copies: initial-source/; exact hashes: initial-source.json.
Final recheck hashes/results: recheck-result.json. Final context/geometry: final-context-result.json.

Final reviewed UI:

- web/camp.html: 6b72b01f7b5354df5bca111b64a2dab207936126c3e95e7afc58e8cb6fcddcf7
- web/camp.css: 4a25b7fdb9638b7ea504803a145d010461468c55bcdac6fc4518a88ff34af488
- web/camp.js: 378bc086b22c83eda970636ac1fcd99e4ecd1d55e20eba92d27ff8302b50ee2f

Session, slots, shared CSS and both Camp host hashes remain unchanged from the initial review; all eight are recorded in recheck-result.json.

Other evidence: layouts.json; interactions.json; saves.json; focus-service.json; pause-inactive.json. The first interactions harness run reached the complete story, then stopped on a harness error that reclosed an already-open New-story details element; corrected save coverage is in saves.json. An immediate asynchronous import-preview assertion and details-toggle assertion were corrected to wait for their events. The first recheck harness was corrected to reopen People before the take-handover action, then all actual Enter actions were rerun. playback.json includes a headless non-hidden-tab probe and an incorrectly sequenced manual toggle; neither is counted as a passing visibility/manual-pause check. Manual pause and the synthetic visibility event were independently rerun in pause-inactive.json.

Node: /opt/homebrew/bin/node (26.8.1). Playwright module: /Users/abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs. Browser: isolated headless /Applications/Google Chrome.app/Contents/MacOS/Google Chrome; the default Playwright browser was absent.

## Narrow research-control renderer addendum

After the preceding scoped pass, one supported-import renderer edge was checked independently: an actual individual story file with recovery=active-idle and improvement=snapshot. Visible research labeling and snapshot-specific workbench/hint copy matched those settings. Selecting Recover paid no time, changed no body/rest totals and matched the exact host start-rest state. Next Event advanced minute 0 to 6, reduced player fatigue from 0.2 to 0.059000000000000045, increased recovery minutes from 0 to 6, and matched the exact host next-event export. No browser errors occurred.

Default 375x667 keeps both added controls hidden, preserves automatic-recovery copy, has no document/panel horizontal overflow, and retains its visible dock. Both default and research screenshots were visually inspected. This was one synthetic import and one default layout, without repeating campaign or slot checks. The first probe incorrectly used innerText for copy inside collapsed details; it was corrected to textContent before rerunning the bounded case.

No new finding. Source hashes/results: research-control-edge-result.json. UI JS is 1031c2532ecf7d85cd2b2bca45a08cb15753d7f15b4857135ce02309f5ad97d8; HTML is 51064b7f3ba9e4d353c1038d6ee6b69e8e319afee8f4b41ebd836a66c2d3be3a; CSS remains 4a25b7fdb9638b7ea504803a145d010461468c55bcdac6fc4518a88ff34af488. The result also captures current selected-host hashes; this addendum does not repeat their separate core review.
