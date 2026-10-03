# Current Camp interface and persistence

App 0.14.1 adds a short practice explanation to the existing Work disclosure and labels food gathering as light work beside its dynamic yield. The host/save/interaction contracts below are unchanged. [Evidence and live verification](release-0.14.1.md).

The active `/camp/` page uses `web/camp-current.js` and `web/camp-current-session.js` against the facade in `src/games/camp-current.js`. The historical `web/camp.js`, `web/camp-session.js` and `web/camp-slots.js` remain source evidence; they are not dependencies of the active page.

## Player interface

The compact Work, People, Camp/Supplies, Journal and Save tabs retain the HUD, both people's jobs, time controls, stop/release controls and keyboard arrow/Home/End navigation. Reading another tab or opening details pauses playback. Playback pauses at work and recovery decisions and at supply checkpoints. Starting/stopping work remains distinct from pausing time. Hidden-page playback is paused.

The supply window retains allocation, dispatch, close and return choices. Project estimates, condition estimates, requests and handovers remain in ordinary play. There are no research preset selectors or legacy migration controls. General model limitations and the current snapshot's limited assurance appear in one collapsed Model notes section. The recent activity list is a bounded player aid, not an authenticated history.

## One current save

Only `human-camp-current-v0.3.0` is read or written in localStorage. Its value is the direct current export envelope, `human-camp-current` version 1; it contains one active Camp 0.3.0 snapshot. Earlier story-book keys are never read, updated or removed. Current downloads use `camp-current-minute-N.json`. No slot names, timestamp registry, cross-slot checks, original snapshots or command journals are added by the UI.

Reload restores the current camp paused. Every world change attempts a device save. A current import is validated and previewed before the player explicitly replaces the active camp; the preview shows minute, supply-window phase, stock, cache count, both current jobs, completed structure stages and supply allocations. A secondary collapsed New camp section explains replacement and offers an explicit replace action. The current camp can be downloaded before either replacement.

File imports have a one-megabyte UTF-8 limit, checked both against the selected file size and actual read text. Unsupported earlier formats and invalid snapshots are rejected before adoption. A read belongs to its original in-memory camp and the newest read generation. A newer read, cancellation, new camp or changed game invalidates stale reads and previews, including delayed failures. Confirmation rechecks the camp identity.

## Storage and leaving

Malformed or unsupported data under the current key is left untouched. Its raw value is offered as a separate backup download; the temporary current camp remains playable and separately downloadable. If the storage read itself is denied, the key is protected from writing for that page session. A protected key is not silently repaired through New camp or Import.

A failed write leaves current play in memory and shows a persistent download warning and Save status. Later changes can retry an ordinary quota/write failure. Save and leave navigates only after a successful write; otherwise it opens Save with an actionable download message. An unsaved page attempts the browser's standard before-unload prompt, subject to browser support; it is not a substitute for downloading. A successful download does not clear the unsaved warning because the device copy still has not been saved.

## Validation

`tests/camp-current-session.test.js` covers session pause/stop/large ticks, finite available recovery, invalid commands, paused restoration of paid work, old-key isolation, corrupt/read-denied/quota storage and current-import validation/confirmation/cancellation/races. The 10 adapter tests passed on 2026-09-08. Actual Chromium interactions ran against a loopback development host serving the current active modules, at 375×667 and 1280×900; screenshots were visually inspected. Neither viewport had horizontal overflow, and the dock remained entirely inside the viewport. A 375×500 check with expanded long save content used document flow and could scroll to the dock.

Browser coverage included starting work, paying one minute, pausing via a tab, stopping with retained progress, keyboard End navigation and paused reload; current import preview/cancel/confirm, unsupported-file feedback, delayed read invalidation after a new minute, and explicit New camp focus. Fresh synthetic supply traces were executed through the current facade to provide introduction/ferry/allocation/ended states; no old snapshot was imported. Continue and dispatch kept the same camp minute; household/camp allocation each consumed one available cache; returning to camp kept settled consequences.

A forced quota error during Save and leave kept `/camp/` open, selected Save and left Download accessible. The resulting real browser download restored successfully as current Camp at the expected ended minute 403. A corrupted current-key value stayed byte-identical through further play, and its separate browser-downloaded backup matched exactly; an old-key canary also stayed untouched. The browser exercised the unsaved before-unload prompt. Console checks reported zero errors or warnings. Screenshots and browser downloads are temporary QA files, not public assets or a claim of production verification. No claim is made here of historical transcript validation or backwards save compatibility.

An independent review subsequently found two wording defects: initial checkpoint panel selection replaced the checkpoint guidance with generic job guidance, and returned camps still described caches as improving settled supply outcomes. The fixes preserve current `pauseReason` when selecting a panel and describe further caches as staying in storage after the supply window closes. A narrow Chromium recheck at 375×667 verified exact core guidance after import/reload for introduction, ferry, rain and ended checkpoints, including tab selection at rain; the corrected cache hint survived Return and reload. The 10 adapter tests still passed. Original review evidence and source manifests were left unchanged.
