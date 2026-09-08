# Independent current Camp UI/session review

Review date: 2026-09-08. Browser: installed Google Chrome through Playwright, headless. Scope: current UI/session, synthetic current saves and the declared interface contract. No user saves, old save reads, external requests, source edits, deployment, or other agents.

## Findings

1. **P3 — Restored/imported checkpoint status asks the player to choose work while the checkpoint prevents work.** `web/camp-current.js:36` always writes `session.reason`; initial phase selection at line 112 overwrites the view-specific pause reason previously written at line 111. `createSession()` initializes the generic work message. Repro: restore the synthetic ferry state and reload. Actual dock: “Choose a job. Available time lets you recover.” Expected current view: “The ferry is waiting. Allocate supplies, then send it.” The main checkpoint card and dispatch control are correct, so this is a misleading status rather than a blocked flow. Prefer the current pause reason when a panel selection writes time status. Evidence: `followup-results.json`, `finding-restored-ferry-status.png`.

2. **P3 — Returned camp still promises the completed supply window's cache benefits.** `web/camp-current.js:53` unconditionally describes a selected cache as serving one household or two camp nights. Repro: close the synthetic window and choose Return. Phase is `camp-return`; the objective correctly says earlier choices stay settled, but the work hint still says “Each finished cache can serve one household or two camp nights.” The allocations section is hidden and the settled window cannot accept another cache. Describe later caches as stored surplus once the window closes, so spending more work does not appear to improve already-settled household/night totals. Evidence: `followup-results.json`, `finding-returned-cache-hint.png`.

## Browser probes

Ten main groups pass in `results.json`:

- 375x667 fresh Work, People, Camp, Journal and Save layout; no horizontal document or panel overflow; dock bottom 667.
- Arrow/Home/End tab navigation, paid construction, one-minute advance, tab pause, stopped retained progress and exact paused reload.
- New storage key isolated; old-key canary remains byte-identical and instrumented application storage reads/writes target only the current key.
- Actual downloaded current JSON restores; current import preview/cancel/confirm; unsupported older format clearly rejected before adoption.
- Preview invalidation after world change; delayed stale success/failure cannot restore or show a stale error.
- Earned synthetic introduction/ferry checkpoints; Continue/Dispatch preserve minute; allocation consumes available caches exactly once and updates kit/night counts.
- Rain finish and Return preserve current people, unfinished work, time and settled allocations.
- Forced quota failure on Save and leave stays at Camp, opens Save, retains a persistent warning and downloads the exact current snapshot.
- Malformed current storage remains byte-identical through play, New camp and current import; separate downloaded raw backup is exact.
- 1280x900 desktop layout and 375x500 expanded save/model content; short-height document flow brings the time dock into keyboard view.

Four follow-up groups pass in `followup-results.json`: keyboard reaches/scrolls the Meryem request and submits it; newer file read wins over delayed earlier success; New camp invalidates an unresolved earlier import; denied storage reads protect against all later writes during play.

No browser console warning/error or external network request was observed. Screenshots were visually inspected for fresh phone Work/People, ferry, quota warning, desktop Work and short-height expanded Save. The suite used newly generated legal current-host states, not old save imports.

## Source provenance and harness corrections

`source-before.sha256` and `source-after.sha256` preserve exact source hashes. All reviewed UI/session/HTML/CSS/interface files are unchanged between those manifests. The main run verifies loopback response bytes against on-disk HTML and five module/style sources before interaction, recorded individually in `results.json`. Port 4187 was initially down; reviewer started the repository's `scripts/serve.js` locally.

The core facade changed during this review from `cfa2db1f93b659a2d82d99c5644c03118a8095d03d9108867106f358d6b26616` to `1b0842a932aff34a94a30b474edfb3f862378bc378dfb54b3be3bb44db1511b5`. The initial main-run response matches the former; the final source manifest contains the latter. Because the loopback host reads live files, this is not a claim that every browser reload ran one frozen core revision. Both reported UI issues are in unchanged UI code and were directly reproduced. Root should perform a narrow recheck at final frozen sources after any fixes.

The first harness attempt is retained in `first-harness-results.json`: it checked an async import message before its completion and waited for a work button to be visible while the correct checkpoint panel hid Work. The harness was corrected to wait for the message and for button attachment. These were harness failures, not app defects. Browser before-unload prompts were accepted only when the review intentionally navigated its synthetic context.

Actual device Safari, physical phone input and real screen-reader output were not tested. This review does not reassess core simulation correctness or authenticate previous play history.

## Corrective recheck — 2026-09-08

The two reported P3 findings are resolved in a narrow actual-Chromium recheck. Fresh loopback responses match local source hashes before the recheck, and all six served source hashes remain unchanged afterward. UI SHA-256: `9bba1d23e43b65ea25a6a1f7810d84a47cb394e291d2007685417e3ac1c97c47`; core SHA-256: `73a535b879e552c7d1bcbd592b82cb751362f42ee7eeb95ad16f8f4473d69d9a`. Full manifest: `corrective-source.sha256`. Exact observations: `corrective-results.json`.

- Restored and imported ferry checkpoints now show the current allocate/dispatch pause reason.
- After Return, the cache hint explicitly says supplies remain stored and earlier allocations are settled.
- A returned cache started, paid one minute and stopped displays “Pack timber and salvage into one supply cache.” on its resume card, without the retired future-visitor claim.
- No browser warning/error or external network request was observed.

This corrective pass covers only these three wording behaviors (checkpoint checked through reload and import). The original broader matrix is preserved above and was not rerun. The original findings, source manifests, screenshots and probe results are retained unchanged.
