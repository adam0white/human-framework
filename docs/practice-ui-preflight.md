# Practice preflight: current consequence presentation

Source-only review on 2026-09-08, against Camp 0.3.0 and [the bounded incentive preflight](practice-incentive-preflight.md). **Current choices expose actual quoted durations and retained work without a proficiency meter. They do not explain why paid practice can make a later quote shorter.** Workbench and retained-progress effects already have ordinary explanatory text. This is a finding about rendered information, not evidence that a person understood or misunderstood it.

No opportunity was nominated in this lane. The three allowed comparison cases belong to the other preflight lanes. No game was advanced, no artificial person state was created, no browser save was changed, and no public or model file was edited. An exact case-prefix/browser recheck can be appended if one of the existing nominations requires it; a fourth case or broad gameplay search is unnecessary.

## What the player is currently given

| Consequence | Present player-facing behavior | Source |
|---|---|---|
| Current job choice | Every card shows its current integer `duration` followed by “min.” Available gathering cards show output quantities; new construction cards show reserved material quantities. Disabled cards still show the quoted duration and explain why the job is unavailable. | `web/camp-current.js:40–44`; choices supplied at `src/games/camp-current.js:280–283` |
| Ongoing paid work | The persistent dock shows both people's current job labels and “N min left.” The People tab says paid time stays paid when stopping. Beginning a job records its quoted duration in the recent log. | `web/camp-current.js:56–64`; `web/camp.html:16`; `src/games/camp-current.js:76–96` |
| Retained construction | Work tab heading changes to “Continue”; the hint states the rounded percentage kept at the site. Resume uses the current remaining-time quote and has no new material reservation. Camp project cards also state retained progress. The Work disclosure explicitly says materials/work remain, and the stop event repeats that they remain. | `web/camp-current.js:46–54,74`; `web/camp.html:10`; `src/games/camp-current.js:39–55,89–96` |
| Workbench | Work hint says tools shorten future assembly, including underway work. The Camp card says it improves work still ahead. The Work disclosure states that it does not erase effort already spent. Future choice quotes and active remaining-time calculations incorporate the current workbench. | `web/camp-current.js:54,74`; `web/camp.html:10`; `src/games/camp-current.js:38–55,211–214` |
| Paid practice | A current quote can become shorter after gathering/construction practice. The UI does not display skills, a practice total, a threshold countdown, a previous quote or a practice-attributed duration delta. Its only explicit practice reference is under “How handovers work”: prior practice stays with its person. Completion events report finished work/output, not a changed later duration. | `web/camp.html:11`; `web/camp-current.js:40–74,102–107`; `src/games/camp-current.js:98–111` |
| Food gathering as a productive control | Its card shows time and food yield. The host's existing detail says it is light work that remains possible when heavy work is blocked, but the renderer replaces that detail with the output text whenever the choice is available. A blocked heavy-work card can make the availability difference visible; the reason for the contrast is not on the food card. | `src/games/camp-current.js:19–22`; `web/camp-current.js:41–44` |

The reported duration is a quote for the displayed choice. While someone is already working, the fixed current job retains its admitted duration and the dock shows its remaining time; a gathering card can show the shorter quote for another trip. For construction, the host preserves each participating worker's initial stage basis and applies current tools prospectively. This source distinction matters when attributing a shorter number to practice, tools or retained work; those mechanisms must not be collapsed into one “you improved” message. See `src/games/camp-current.js:38–62,211–214`.

The current view contains skills, paid ledgers, work contributions and current quotes (`src/games/camp-current.js:284–287`), but the UI intentionally renders a narrower subset. These fields do not by themselves supply a verified before/after causal decomposition. A specific “practice saved one minute” claim would need the source-bound case or another validated comparison, not subtraction of whichever quotes were last shown.

## Smallest justified presentation gap

The narrow missing explanation is the connection between time spent on useful work and a later duration quote. A short sentence in the existing **Work, recovery and materials** disclosure can state the implemented rule without exposing coefficients or adding a meter:

> Time spent gathering or building gives you practice that can shorten later jobs, even if you stop before finishing.

Existing adjacent text already explains that stopping a trip forfeits output and that construction retains materials/work. Keep those costs beside the practice explanation. Do not imply that cancellation is required, that each completed job saves a minute, that experience shortens its current admitted job, or that this game rule is empirically calibrated. This sentence is a minimal presentation candidate, not an admission of a new mechanic or proof of improved player comprehension. Final admission belongs with the at-most-three exact cases and their productive controls.

The productive-food alternative has a second, independently identifiable omission: an available food card suppresses its already authored light-work description. If the nominated gathering case relies on food gathering as a serious control, adding “Light work” beside its existing yield/time is smaller and more directly supported than adding an effort gauge. Proposed detail: **“Bring back 2 food · Light work”**, preserving the existing dynamic output quantity (3 with the garden) and keeping the current duration heading. Preserve unavailable reasons when the card is disabled. The source already supplies this property; no parameter, save field or model change is needed to explain it. “Light” does not mean no elapsed time or no body cost.

No new workbench or progress meter is justified by this inspection. The present percentage, material reservation, minute quote and remaining-time display make those current consequences available. No claim is made that players can attribute their exact magnitudes unaided, remember earlier quotes, discover optimal routes or understand the model from these displays.

## Inspection and source identity

Read `web/camp-current.js`, `web/camp.html`, the active session's time/boundary behavior, relevant current host/view/duration/recording code, `docs/camp-current-interface.md`, and `docs/practice-incentive-preflight.md`. Checked the Human 0.1.1 source to distinguish practice accrual and public view fields from what the renderer actually displays. No historical UI was substituted for the active page. No browser layout, keyboard interaction or human comprehension claim was tested in this source-only pass.

Repository HEAD at inspection: `fe540daccd5e6e5e81ce850f2aef4baab902fca3`.

| File | SHA-256 |
|---|---|
| `web/camp-current.js` | `9bba1d23e43b65ea25a6a1f7810d84a47cb394e291d2007685417e3ac1c97c47` |
| `web/camp.html` | `cc8562c65d718fe4c509b6ac9386bb6422106ee759078760942136dd18aed9f9` |
| `src/games/camp-current.js` | `73a535b879e552c7d1bcbd592b82cb751362f42ee7eeb95ad16f8f4473d69d9a` |
| `docs/practice-incentive-preflight.md` | `4724c01b3a16d97ec607ba45889373be635ed85c8dcdef79150f77a0cbc6726e` |
