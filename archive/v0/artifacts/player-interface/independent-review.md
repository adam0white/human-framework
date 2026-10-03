# Independent game HUD review

Status: no remaining blocking finding in the exercised scope. Shared HUD fixes and the final Signals/Rain copy and layout changes are independently rechecked.

Reviewed the actual presentation source in `/Users/abdul/code/human-framework/.worktrees/game-hud`: shared shell JS/CSS, ten HTML entry points, Signals presentation JS, and collection HTML/CSS/JS. Read current workflow, handoff and MVP boundaries. Did not read the earlier review verdicts or private player-feedback document. Did not modify lane files, exercise production storage, or review new runtime/host behavior.

## Findings and verified corrections

1. **Courtyard restart showed a blank History panel.** Eighteen rest moves, then Another afternoon, reset the world while leaving both History children hidden and focus on the document. The correction selects and focuses Actions for new/reset runs. Independently reproduced and rechecked.
2. **New reading surfaces did not pause running time.** Shared Promise Play → Save → About this episode advanced 37 to 38 while reading. The new wrapper missed the original listeners installed before shell mounting. Tab changes and dynamic disclosure opening now use the existing Play control to pause. Tested all six continuous hosts with an admitted job or active world; no elapsed minute or serialized world change while reading.
3. **Rain checkpoint continuation was hidden below allocations.** At the ferry, focus used preventScroll while the checkpoint followed the long destination list; Next event and Play were disabled. Checkpoint now appears first and its actual Continue control is in the persistent dock. Ferry/dusk/result selection, focus, and visible button bounds pass at 375×667.
4. **Courtyard proposals lost the original reply focus.** Draw carefully → pour → draw carefully produced a request, but the shell hid Accept in Meryem while the recreated action button lost focus. New proposals now select Meryem and focus a visibly reachable Accept control. Refusal remains available.

The collection's vertical desktop tablist now declares its orientation. End and ArrowUp navigation pass. The implementer independently found and fixed a narrow Workshop room-heading overflow; the final independent all-panel pass includes that correction.

## Independent evidence

- `source-hashes.json` and `source/`: initial frozen source; original failures and screenshots are preserved.
- `fixed/source-hashes.json` and `fixed/source/`: reviewed correction snapshot. No drift from the lane at the final snapshot comparison.
- `fixed/parity-results.json`: 53 matched action/control transitions across all ten games, comparing exact serialized localStorage with shared shell enabled and disabled. Every matched state is identical; no page errors. This is a representative interaction sample, not exhaustive host verification.
- `fixed/recheck-results.json`: all four corrective paths; six continuous-game tab/disclosure pause and save invariance checks; 200 selected panels across ten games at 375×667, 390×844, 1280×800, and 640×400, all without horizontal panel/document overflow; actual leave/return pause on Signals and Shared Promise; collection vertical keyboard behavior.
- `initial-results.json`: initial collection plus all games at 375×667, 390×844, 1280×800 and 320×400; no lost pre-shell ID nodes, unresolved ARIA references, page errors, or horizontal document overflow. Normal-size docks fit. Short/narrow layouts permit document scrolling.
- `lifecycle-results.json`: independent paid radio/direct observation/stale reply sequence, invalid import preservation, valid import and paused reload, unfinished Workshop import/finish, Shift selection/end, Rain checkpoints, and Shared Promise discussion interruption from outside Plan.

Runner corrections are retained: an ambiguous duplicate opening-action selector, an attempted step after an already-ended Signals episode, an initial attempt to Play Common Ground before admitting work, and sampling before the native details toggle task ran. Corrected runs preserve the intended checks and all original outputs; these were harness errors, not silently discarded product findings.

Corrected shared shell SHA256: `4fcf450321a3a4d3454566fbcd44fc4cea44529e1f411b7bb13471774ea7cd8a`.

Intermediate corrected shared CSS SHA256: `872703cf5a6d25f0b0cfbfbad5121aa3a76fe5721a71867664cfbdce61741ea2`. The final polish CSS below supersedes it; the intermediate 200-panel evidence remains separately bound to its own snapshot.

Collection JS SHA256: `d188636b1bf3be347503cbfbb455db1efa7ac8503a4b10f253c3cdfa17ad95f1`.

Chrome 152.0.7977.77, Playwright with ephemeral isolated browser contexts, Node 26.8.1, and a frozen-source server on a random localhost port. Viewport reflow checks are not physical iOS/Android, Safari, a screen-reader session, real browser zoom, or production deployment verification. Root retains build, integration, release and deployment responsibility. No blanket application or human-model certification is implied.

## Final Signals and Rain polish addendum

Root's final phone review identified decision choices still below the panel. The implementer compacted Rain's existing six work tiles and dock spacing, moved its static rest explanation into Work & recovery rules, shortened only Rain's paused status sentence, and placed Signals' longer route explanations in a keyboard-accessible disclosure. Signals retains visible cost, conditional canal ETA and launch/beacon consequences. Reviewed these exact additional source changes; no host/session transition code changed.

`final/source-hashes.json` binds the final full source snapshot, with no drift from the lane at recheck. `final/geometry-results.json` independently passes all fifty tab panels across all ten games at 375×667 without horizontal overflow, and all six active Rain work tiles fit at 375×667, 390×844 and 1280×800, with 640×400 document-flow fallback. `final/rain-both-active-results.json` additionally repeats the four-size check with both people gathering and both Cancel/Release controls visible. All six tiles remain within the normal-sized panel.

`final/results.json` verifies both Signals consequences fit at 375×667 initially and at minute six. Canal success at exactly minute twelve in the steady harbor produces the overnight beacon result and explicitly misses the launch. Keyboard disclosure and the situation anchor work; opening the route explanation pauses ongoing work without consuming a minute. Source inspection confirms the Rain JS change only shortens display text. The 53-transition parity run was not needlessly repeated for these CSS/static-prose changes.

Final shared CSS SHA256: `220973261ef0b225ff38feb74abe2f057baafdb613c10a3a568fddf82c866f91`.

Final Signals HTML/JS SHA256: `fccce10be7137a5c8dafdcdf92af773454fea4a996f2bda8c23afdffe2f9f299` / `703f0557827f6ce0d1722a4ecf69e0c87c64aff02cdc3be2e85e9735bc9c4392`.

Final Rain HTML/JS SHA256: `15ea4dfcec509d86cdb2e8649d2f8f56c2b52305d18c2a45e43544110048ae39` / `23f8f8df57e46a78156bcf83e8de43c77304fe8dbc87636fee6d389e8aab1ebf`.

Shared shell JS and collection JS retain the corrected hashes above. Final screenshots include `final/route-375.png` and `final/rain-both-active-375.png`. The normal viewport checks establish tested action visibility, not a universal guarantee for every possible saved state, browser zoom, font configuration or physical device.


# Independent late HUD delta recheck

No remaining blocking finding in this narrow late delta. Source is frozen in `source/`, with all reviewed file identities in `source-hashes.json`; the live worktree matched those bytes at the final check. The earlier review and its 53-transition parity evidence remain separately bound to their earlier snapshots in `../REVIEW.md` and `../fixed/`.

Reviewed shell JS `69c7e934940f5678518fe7c6c4e443f26e1f2121383864284c0bd0f5f9d93bff` and CSS `b053e80dd8fba61ab0286c297724653b94b1c29d09c503b8a892da34bc1d444f`. No new host/session command code changed. The focused Fable hypotheses were supplied as investigation targets; these findings come from inspection of the actual diff and independent browser execution.

Executed checks in `probe.mjs` and `results.json` all pass:

- Courtyard HUD says **1 move left**, then **0 tap closed**.
- Stored ended, checkpoint, and proposal runs select the relevant panel without moving initial document focus. Events reached during play still focus the outcome, checkpoint, or Accept control.
- Empty and populated feedback/alert containers remain mounted. Chrome's accessibility tree includes the empty status role with polite/atomic live properties; updating feedback preserves the same DOM node. This verifies accessibility structure, not actual screen-reader speech.
- A synthetic storage-quota failure after an ordinary choice in each of all ten games exposes the original device-save failure message in the persistent HUD while the play panel is selected. Each warning is visible within 375×667 and tells the player to download. Restoring storage and advancing Signals clears the warning.
- An accepted Shared Promise exposes the concise withdrawal consequence in the dock even while You is selected. The button references both that sentence and the full existing explanation. With Rest already active, withdrawing leaves the same six-minute rest job running, then hides the no-longer-applicable withdrawal context.
- The alleged hidden independent-stop refusal is not reproduced: at minute 42, asking Deniz to stop their own clinic trip displays the exact refusal in persistent `#time-status`. No host change was needed.

`signals-results.json` rechecks the ordinary 375×667 route geometry, both visible deadline consequences initially and at minute six, successful exact-minute-12 canal arrival missing the launch, keyboard disclosure/Save navigation, and pause-on-reading. `rain-both-active-results.json` rechecks all six Rain work tiles with both people gathering and Cancel/Release visible at 375×667, 390×844, 1280×800, plus 640×400 fallback. All pass on the late hashes above.

One initial harness assertion incorrectly required uppercase “Download” despite the unchanged Workshop warning using lowercase “download”. The original output is retained in `initial-results.json`; the corrected case-insensitive check passes. This was not a product defect.

Chrome 152.0.7977.77, Node 26.8.1, isolated ephemeral contexts and a random-port frozen-source server. No production storage, physical device, Safari, full screen-reader session, new host logic or deployment was reviewed. Final integration and release verification remain with root.
