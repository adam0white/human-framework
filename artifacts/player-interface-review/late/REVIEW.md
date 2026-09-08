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
