# Across the cut independent UI review

Local actual-browser review of `http://127.0.0.1:4190/across/`, 2026-09-08. Browser: installed Chrome through Playwright; synthetic new browser contexts only. Root owns source. No source edits, external reviewers, production access, physical-device tests, or actual user storage/exports.

## Original reviewed scope

`review.mjs` and `supplement.mjs` are the reproducible probes. `initial-reviewed-results.json` and `supplement-results.json` retain the original observations. Thirteen served page/style/module sources were captured before and after the main run, all byte-identical. The supplementary run captured the four relevant unchanged sources separately. Driver receiver version was 0.1.1.

- Browser main UI SHA256: `fce79b226471baaf03826a800132c10c8ad984d6de14a6ca77bebd3460f09f66`
- Browser CSS SHA256: `af85e0cbcb300ac677d4e24cbb90c863311e3d5262d8c8ef0e5e123f1480a610`
- Player driver SHA256: `b3500336e4852d11334f0923efcb1c1127c83e872ee8d773e3e6e58c3387174d`
- Receiver SHA256: `146b4b94d9ba37dae8f4e31550cbf7c1eb84c644120daedd985c060f8d63d8ce`

Two preliminary harness failures did not establish app defects: Node fetch forbids port 4190 (source capture switched to node:http), and the initial fixture init script reset localStorage on reload (changed to seed only absent storage). The complete main run then passed its assertions with no page or console errors.

## Findings delivered for correction

1. **P2, report visibility**: `web/across-player.js:11,15` (original captured source). At minute7, open Notebook history and scroll bottom; return to Work and release; Continue receives minute8 report. The Notebook retains scrollTop 575, placing the new report at y=-219 to -56 while visible panel spans y262 to542. The launch deadline in the report is above view. `phone-report-after-notebook-scrolled.png`.
2. **P2, source-time copy**: `web/across-player.js:32`. Outgoing report selecting valve repair6 observed7 and sent9 renders `Sent by radio at 9 / valve repair has 6 paid minutes`, dropping observation time. The actual message preserves observedAt7. Main results contain both values.
3. **P2, keyboard focus**: `web/across.css:1`, `.file-button input`. Save > Download keyboard focus > Tab reaches import input; its opacity0 hides the focus ring; parent label outline remains none. `phone-file-keyboard-focus.png` and supplementary computed styles.
4. **Eligibility inconsistency, valid synthetic imported body**: `web/across-player.js:34`, `updateSend`. Keeper fatigue1/hunger.15 has Inspect disabled but Send radio enabled. Clicking produces a body-capacity refusal without time advance. The send controls do not use the conservative body/budget gate applied to normal work choices. `phone-send-capacity-error.png`.

## Verified original behavior

- Initial and minute8 report layouts captured at 375x667, 1280x900, and 375x500. Main phone layout keeps report and Stop/Continue visible when Notebook was at its top. Short viewport intentionally uses scrollable document flow. Desktop and short tab arrow/Home/End navigation was exercised. No claim about physical devices or exhaustive accessibility.
- Exact setup valve6/inlet14/launch15/channel delay6: inspect0-1, repair1-7, release7-8 pauses on received report with one paid release minute and two reserved units. Stop returns both units and retains paid minute; imported receipt state Continue reaches9 with two paid release minutes and zero owned water.
- A real browser download, preview/cancel/replace, reload at9, and continued play passed. Pending file reads were invalidated by advancing and by a newer file selection.
- Hidden inlet/launch twins rendered equal complete body text initially and at7, before evidence receipt. Received inlet/launch facts never entered first-hand selection at the valve. Selected outgoing observations preserved original source time in saved payload.
- Partial travel retained position3, paid travel3, installed fitting and owned water. Stopping after one meal minute returned the portion; completing a later two-minute meal consumed it, retaining all three paid meal minutes.
- Truth remained absent from world-summary and hidden until minute30 plus explicit Reveal; Account appeared at30. Revealed exact case showed two lost water units.
- Corrupt device storage remained byte-identical through play and explicit replacement; exact unreadable backup downloaded. Current in-memory shift remained downloadable. Simulated storage write failure preserved current play/export and displayed a warning.

Corrective results will be recorded separately, not substituted for the original broad run.

## Corrective outcome

All four submitted findings were fixed by root and verified through the narrow actual-browser `corrective.mjs` run. Seven check groups pass: fresh received-report scroll, reload and import of paused receipt, outgoing observation7 versus sent9, idle report copy, visible file-label focus, and body-blocked Send control. Nine scoped served sources match before/after; no page/console errors. `corrective-results.json` and `corrective-*.png` are separate evidence. Screenshots for report visibility, file focus, and outgoing timestamps were visually inspected.

- Corrective browser UI SHA256: `dd0b42785dbc3312c5a8e268d6ac0dd4d1056134ab650b69cbcae42d3148e831`
- Corrective browser CSS SHA256: `aa78fa133017a4156e196b002bc92e4800c76184a281a63111404cc7cb60fecb`
- Corrective view helper SHA256: `677df05a993c856cf3b55409a2f761acdb24fc1f991234aa00b04eab5b13133b`
- Player/core/receiver remain identical to the broad reviewed source.

The first corrective invocation exposed a harness assumption that Inspect would be visible on every loaded save; the fixed UI correctly opened Notebook for an idle receipt. The wait was changed to attached, and the same narrow scope completed. This was not an app defect. No full device matrix was repeated after correction.

No actionable findings remain in the reviewed scope. General usability, physical mobile behavior, all possible histories, and production deployment are outside this local browser review.
