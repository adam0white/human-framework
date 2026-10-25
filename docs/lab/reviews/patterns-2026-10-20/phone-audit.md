| Rank | Game                    | Live build from `/release.json` | Worst verified DL-30 / DL-31 finding; exact DOM quotation                                                                                       | Screenshot                                                                            | Counts C/T/B/O/S/X/H/V | DL-32: observed availability                                                            |
| ---: | ----------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
|    1 | The Warren              | 0.4.0 · a9abf2e4                | DL-30: “People choose when to dig.” is cut by the 55 px Reading box beside “Scroll ↓”.                                                          | [warren/06-chalk.png]((driver scratch)/audit/warren/06-chalk.png)                     | 3/0/0/0/3/0/0/1        | Chalk drag made a plan and returned a reading immediately; tools stayed available.      |
|    2 | The Valley              | 0.1.0 · 4686aab2                | DL-31: “Call households to cut the landowner’s barley before the rain.” and the map/date leave the viewport at house actions. Close is covered. | [valley/03-house.png]((driver scratch)/audit/valley/03-house.png)                     | 0/0/1/0/2/0/0/1        | Call and give grain were available; giving grain produced ledger feedback.              |
|    3 | Twice at the Well       | site 1.0.0 · ea79dae7           | DL-30: “for the children”, “it’s your duty”, “you’ll be safer” are ellipsised in Order options.                                                 | [well/07-options.png]((driver scratch)/audit/well/07-options.png)                     | 0/3/1/1/0/0/0/0        | Worker/place/Confirm ordering met; no character hands-on act demonstrated.              |
|    4 | The Night Watch         | site 1.0.0 · ea79dae7           | DL-30: fixed “Begin the watch” covers watcher cards; “How hard do you press Tamar?” needs internal scrolling.                                   | [watch/04-order-scroll.png]((driver scratch)/audit/watch/04-order-scroll.png)         | 1/1/1/1/0/0/1/1        | Lantern and bell acts offered at night; no forced watch-only interval met.              |
|    5 | Neighbours              | neighbours@1 · 38f08925         | DL-31: Ada’s “Deadline · Day 1 · 14:00” and promise fall below the fixed drawer while “Walk to Workshop to talk · ~60 min” is visible.          | [neighbours/04-ada-settled.png]((driver scratch)/audit/neighbours/04-ada-settled.png) | 0/0/0/0/1/0/0/1        | Walking offered immediately; talk/repair and consequences not reached.                  |
|    6 | Good Hands              | 0.1.0 · bba1a430                | DL-30: “What hours can you work?” and its cost are cut by the 108 px question area. Placement deadline disappears during timed questions.       | [goodhands/05-interview.png]((driver scratch)/audit/goodhands/05-interview.png)       | 1/0/0/0/0/0/1/1        | Asked a wage question in one act and received Gül’s spoken reply.                       |
|    7 | Hearsay                 | 0.1.0 · 9900c64a                | DL-30/31: “Tell what you saw” / “The flour” sit below the talk-choice box; the full talk modal removes Emre’s scene.                            | [hearsay/04-emre-answer.png]((driver scratch)/audit/hearsay/04-emre-answer.png)       | 0/0/0/0/2/0/1/1        | Form-led speech sampled; 20 s hands-on availability not established.                    |
|    8 | The Glance              | 0.1.0 · 60919d27                | DL-31: gate order removes the dam scene. “Now 22:01 · last gate 0/6, read 22:00 (as written)” remains readable.                                 | [glance/03-gate.png]((driver scratch)/audit/glance/03-gate.png)                       | 0/0/0/0/3/0/0/1        | Orders to Dai offered; no direct keeper act or outcome demonstrated.                    |
|    9 | The Day You Say Nothing | site 1.0.0 · ea79dae7           | DL-31: optional speech form removes “Halil is rest at home.” and scene context; date/time stay.                                                 | [voice/05-answer.png]((driver scratch)/audit/voice/05-answer.png)                     | 0/0/0/0/1/0/0/1        | Direct spoken lines and Let time pass offered; mostly watching not demonstrated.        |
|   10 | Small Works             | 3.1.0-alpha.3 · cfd65a39        | DL-31: “455 min until closing” is available in Workshop menu, absent at meter work costing “10 min”.                                            | [repair/06-meter.png]((driver scratch)/audit/repair/06-meter.png)                     | 0/0/0/0/0/0/0/1        | Carry immediately changed the lantern test result; physical/tool acts stayed available. |
|   11 | The Stairwell           | 0.1.0 · 1256f273                | DL-31: All orders removes the whole building scene; “Nermin two loaves and the paper” and deadline remain readable.                             | [stairwell/03-orders.png]((driver scratch)/audit/stairwell/03-orders.png)             | 0/0/0/0/3/0/0/1        | Bread trip and routes offered; no forced watch-only interval established.               |
|   12 | The Pass                | 0.1.0 · 19419a98                | DL-30: fixed “Open the doors” row covers “Dilek” / “Leave it” in the board’s cover options.                                                     | [pass/03-board-change.png]((driver scratch)/audit/pass/03-board-change.png)           | 0/0/1/1/0/0/0/0        | “Tap to work a portion” appeared within seconds of service; act not performed.          |
|   13 | The Rope                | 0.1.0 · 97119307                | DL-30: “more actions” covers “Bilal” and part of “Nell” in the people strip. Turnback promise remains readable.                                 | [rope/03-working.png]((driver scratch)/audit/rope/03-working.png)                     | 0/0/1/1/1/0/0/0        | Lead on, eat and walk offered; no forced watch-only interval met.                       |
|   14 | The Two Voices          | 0.3.0 · 60a10ecb                | No DL-30/31 failure verified: “Tell Aylin: tonight, on the bus.” and the answer context fit.                                                    | [murmur/06-response.png]((driver scratch)/audit/murmur/06-response.png)               | 0/0/0/0/0/0/0/0        | One-tap suggestion produced a refusal; Let time pass offered afterwards.                |

# Live phone-layout audit — 20 October 2026

For the lead designer. **Warren, Valley, Well, Watch and Neighbours need the phone stage first.** Ranking weighs clipped decision text and lost decision context before target size. It is a design recommendation from the observed screens, not an automated score.

## Method and limits

All 14 entries in `apps/site/src/games.ts` were loaded from their live URLs. Chromium **156.0.8078.4**, **360×690 CSS px**, mobile/touch emulation, device scale factor 1, light color-scheme preference. Small Works rendered its dark green workshop palette under that light preference. First-screen screenshots precede normal start controls. Each captured screen has a viewport PNG and adjacent JSON containing timestamp, URL, body text, and the full DOM probe. Evidence was collected roughly **13:39–13:44 UTC / 08:39–08:44 CDT**. Individual game samples were about 30–130 seconds; none exceeded about four minutes of live inspection. Parallel sessions used independent browsers.

The probe checked hidden/clip overflow dimensions, actual ellipsis/line-clamp truncation, button-centre `elementFromPoint`, intersecting targets, targets below 44×44, horizontal page scroll, scroll containers with buttons below their box, and candidate sheet rectangles. Screenshots and DOM context decided which flags were player-facing failures. DL-31 required manual comparison of scene/state before and during an action. The probe cannot infer what a decision depends on and misses some visible truncation; the report includes verified examples it missed.

**Counts:** C clipping; T ellipsis/line-clamp truncation; B covered control; O overlapping targets; S small targets; X horizontal page scroll; H fixed/internal scroll area hiding its own action choices; V decision state or selected scene absent while acting. Counts are verified listed defect locations/groups, deduplicated across screenshots, rather than raw DOM flags or every affected button. Well’s three distinct appeal labels count separately under T. A single layout defect can appear in more than one category; do not sum the columns as independent fixes. S includes small navigation/privacy links and labels their low priority in the details. C/H can overlap when a scroller also visibly cuts a choice. Ordinary page scrolling alone is not H. A zero means none verified in this sample, not a whole-game pass.

No run was uploaded. No consent control was changed. The browser route blocked every non-GET/HEAD/OPTIONS request, including attempted telemetry and Cloudflare RUM; service workers were blocked. This protects the read-only boundary and means submission behavior was deliberately not tested. Local gameplay and automatic local saves changed only the browser session. “Send them grain” in Valley is a local game action, not a notebook upload. No repository implementation was edited; this requested report is the only repository write.

DL-25 horizontal overflow was checked on every captured screen: **none verified across all 14**. This fixture does not establish 320 px, 200% text, base-font compliance, dark theme, keyboard, safe-area, or real-device behavior. DL-24 return controls were exercised where stated; focus restoration and every nested cancel path were not tested. DL-32’s five-minute builder test and a timed 20-second cadence test were not run. The table describes whether acts seemed available in the short sample; absence of a measured forced wait is not a cadence pass. No unvisited screen is marked pass. DL-33 judgments below apply only to the sampled core path.

Quotes identify full text recovered from the live DOM. Where a screenshot shows only part of that text, the report explicitly calls it clipped or ellipsised. Other quotes identify hidden state, covered labels, or readable comparison text; they are not presented as clipped sentences.

## Release provenance

The table uses shortened commits. All saved releases reported `dirty: false`. Full release responses are in each evidence directory’s `release.json`.

| Games              | Release URL                                    | Version / framework                       | Full commit                              |
| ------------------ | ---------------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| Well, Voice, Watch | https://human.adamwhite.work/release.json      | site 1.0.0 / 2.9.0                        | ea79dae7882c107161a9110ea3679f4982ab49e1 |
| Small Works        | https://repair.adamwhite.work/release.json     | game 3.1.0-alpha.3 / 2.8.0; small-works@5 | cfd65a39636806b754626edcc680424e662262a4 |
| Neighbours         | https://neighbours.adamwhite.work/release.json | neighbours@1 / HF 2.8.0                   | 38f089251c68890bf2090f92dc898e8479f5a7db |
| Rope               | https://rope.adamwhite.work/release.json       | 0.1.0 / 2.8.0                             | 971193075d81cc79838860c498b13a071ea1accd |
| Pass               | https://pass.adamwhite.work/release.json       | 0.1.0 / 2.8.0                             | 19419a989064d17d33be96c3a8bc687e1af1d0a9 |
| Glance             | https://glance.adamwhite.work/release.json     | 0.1.0 / 2.8.0                             | 60919d27ff8fdfe6547e2fc21fc42c197a95931e |
| Two Voices         | https://murmur.adamwhite.work/release.json     | 0.3.0 / 2.8.0                             | 60a10ecb6812f55a42b56ce556d08bbf375d127b |
| Valley             | https://valley.adamwhite.work/release.json     | 0.1.0 / 2.8.0                             | 4686aab2a343f9ebecc0ce60d098eff2e1467961 |
| Stairwell          | https://stairwell.adamwhite.work/release.json  | 0.1.0 / 2.8.0                             | 1256f2732f9b35d1051fe75a21a4e65b8ddb99aa |
| Warren             | https://warren.adamwhite.work/release.json     | 0.4.0 / 2.8.0                             | a9abf2e441891593f28bb71cc8b342e7463db99b |
| Hearsay            | https://hearsay.adamwhite.work/release.json    | 0.1.0 / 2.9.0                             | 9900c64a0acf1cc53f9471a622b7bbb9f3dcd043 |
| Good Hands         | https://goodhands.adamwhite.work/release.json  | 0.1.0 / 2.9.0                             | bba1a43097949dcb85bf04f0961d624eaefa27b7 |

The three site games’ game-subpath release endpoints returned empty responses; the origin release identifies their shared deployment, not independent package versions.

## Per-game detail

Evidence paths below are relative to `(driver scratch)/audit/`. Every named PNG has a matching probe JSON. Each game directory also contains its first-screen `01-first.png`.

### 1. The Warren

**Reached:** cover → play → Check shelter → Hasan inspector → Game menu / Save and run → chalk drag → Reading; scrolled the reading to confirm the missing ending. Evidence: `warren/02-play.png`, `03-shelter.png`, `04-person.png`, `05-menu.png`, `06-chalk.png`, `07-reading-scrolled.png`.

**DL-30 fail:** three fixed-height readings cut essential text. The chalk answer is “Dig planned. If dug, about twelve can sleep here; riders reach it from the entrance. People choose when to dig.” Its last sentence falls partly below a **55 px** viewport with **64 px** content and an explicit “Scroll ↓”. The ordinary shelter summary is a **64 px** scroll box; “Quiet-time calls last six game hours; false alarms can weaken trust. People choose whether to come below.” extends below it. Hasan’s **117.5 px** inspector cuts “Hasan seems to be feeling love.” and hides “Hasan listens for the bell.” and ““Same as always.”” until scrolling. These are the three C findings; the raw clipping list missed the Reading example.

**DL-31 fail:** Reading replaces shelter progress/exposed count while the next mark is being chosen. Header population/resources/date remain visible. Shelter check also covers the scene. **DL-22 fail** on unreadable safety response. **DL-23 fail**, limited to small mark, All games and privacy links (19/19/28 px high); main tool controls fit. **DL-24:** observed one drawer/card at a time, with close; full focus path not tested. **DL-32:** chalk changed stone into a plan and returned a safety answer immediately; no forced watch-only stretch met. **DL-33 pass in sample:** direct chalk drag is the scene act; villagers retain the choice to dig. No raid or completed refuge was reached.

### 2. The Valley

**Reached:** cover → map → Kavak house inspector → call → give grain → expanded Game menu. Evidence: `valley/02-play.png` through `06-menu.png`.

**DL-31 fail:** selecting Kavak scrolls the goal “Call households to cut the landowner’s barley before the rain.”, current date and map out of view. The schedule “Next: threshing starts on 5 August; cut sheaves become grain. Shares can be called in from 9 August.” is absent at the action location. The local house action does retain some action-specific timing, such as the current call’s expiry; this does not restore the overview. Giving grain adds “Your book: you gave (today).” and pushes the later response/return controls farther below the viewport. This is ordinary document flow, not a hidden internal action scroller.

**DL-30 fail on occlusion:** fixed Game menu covers the house Close button centre (Close rect x289/y18, 59×44). No sentence clipping or ellipsis verified. **DL-22 fail** on response/context separation. **DL-23 fail:** two small cover/navigation links; close is also obstructed. **DL-24:** return exists but Close is covered; full origin/focus return untested. **DL-32:** call and grain acts available, grain produced visible ledger feedback; later visits were locked/unvisited. **DL-33 not fully tested:** direct house commands had no confirmation form, but later conversation/core visit acts were not reached.

### 3. Twice at the Well

**Reached:** first goal card → Play → Worker chooser → Maryam → Order options → About Maryam → Game menu. Evidence: `well/03-current.png`, `04-worker.png`, `06-menu.png`, `07-options.png`, `08-inspector.png`.

**DL-30 fail:** all three appeal labels are actually ellipsised: “for the children”, “it’s your duty”, “you’ll be safer” (`07-options`). The raw truncation check missed them; screenshot plus DOM establish the full fragments. Worker chooser Samira/Danyal targets also intersect Suggestion/Orders and their centres are covered (`04-worker`): one B/O layout group.

The Roof / Meals / Alive strip stays readable above normal orders, and selected Maryam stays in the visible scene. The strip does not state the storm deadline; **DL-31 not fully tested**, rather than an unconditional pass. Full-screen person inspection differs from the normal order view. **DL-22 fail** on the appeal labels. **DL-23 fail** on chooser collision. **DL-24:** inspector changes the options view; complete cancel/origin/focus behavior untested. **DL-32:** the observed core path was worker/place/Confirm ordering; no hands-on character act demonstrated. Watch village and speed remained available. **DL-33 fail in sampled order path:** selection and form precede Confirm; tapping the person alone does not perform the order.

### 4. The Night Watch

**Reached:** cover → dusk planning → Tamar person/order panel → scroll to pressure/post choices → Game menu → night. Evidence: `watch/02-play.png` through `06-night.png`. Tamar’s role/traits/order panel served as the person inspector; no richer inspector was found.

**DL-30 fail:** fixed “Begin the watch” covers watcher card content/targets, including Kian initially and Tamar after scrolling. One covered/overlap group. The compact order panel requires scrolling to find “How hard do you press Tamar?” and post choices: one H group. Header “The first night of the first winter · Dusk” is ellipsised; the corresponding Nightfall label shares that location. At night, “Only the lantern’s stretch shows what approaches. Your voice reaches the next stretch.” runs below the panel’s visible edge and requires scrolling: one C group.

**DL-31 fail in sampled placement:** scene and dusk/nightfall clock stay visible, but scrolling to post choices loses Tamar’s role/traits and “Where should Tamar stand?” context; winter progress is collapsed. **DL-22 fail**, **DL-23 fail** on sticky-row collision. **DL-24:** menu closes, full origin/focus behavior untested. **DL-32:** lantern movement and Ring the bell offered at night; no forced >20 s watch-only interval demonstrated. **DL-33 pass for offered night acts:** lantern/bell are direct acts; scene post-tapping is advertised but was not executed.

### 5. Neighbours

**Reached:** landing → Enter town → town map → Ada inspector/walk sheet → Game menu. Evidence: `neighbours/02-town.png`, `04-ada-settled.png`, `05-menu.png`; transitional `03-ada.png` is superseded.

**DL-31 fail:** “Walk to Workshop to talk · ~60 min” is immediately visible, but the fixed **391.6 px** drawer has **805 px** content. It puts Ada’s role and promise “Be at the hall after Lea’s class to compare the flood damage” and “Deadline · Day 1 · 14:00” below the visible box. The scene loses selected Ada and Workshop behind the sheet. Date/time remain above it. One state/scene group. No letters are visibly cut in this settled screenshot; the deadline quotation is hidden context. DL-30 literal clipping is not verified, and ordinary longer inspector scrolling is not itself counted as a defect.

**DL-22 fail** on missing essential promise context. **DL-23 fail** on Neighbours brand link (108.6×20.6 px); dense scene target intersections have a labelled alternative and are excluded. **DL-24:** close returns map; full nested/focus checks untested. **DL-32:** walk available immediately, actual talk/repair not reached. **DL-33 not tested** for core talk/repair. Collapsed Walk somewhere children and screen-reader text are probe noise, not hidden-action findings.

### 6. Good Hands

**Reached:** title → New month → Open the office → Gül candidate card → Interview → wage question/reply → Game menu / Back. Evidence: `goodhands/03-office.png` through `08-question-scroll.png`.

**DL-30 fail:** question choices have **465 px** content in a **108.2 px** box. At the initial position, “What hours can you work?” and “Where will you travel from?” are cut by the bottom edge; their “Takes 8–12 minutes” costs are not fully visible. Later choices need internal scrolling. One C and one H finding at the same location; the visible commit/exit row remains readable. The probe’s covered/overlap flags for off-container questions are duplicates of clipping and are excluded.

**DL-31 fail for the timed interview’s goal context:** “The Arslans need a nanny by Tuesday 3 November, 08:00.” disappears when Task becomes “Interview: Gül”, although each question consumes 8–12 minutes. Current date/time, Gül, her latest utterance and the displayed response costs remain readable. Scene shrinks to a small strip; it is still visible, so do not call it entirely covered. Rent/funds disappear too, but they were not demonstrated dependencies of this interview question and do not drive this finding.

**DL-22 fail** on cut choices. **DL-23 pass in active sampled layout**; geometrical intersections involving clipped children are noise. **DL-24:** Game menu Back returns interview and focus returns Game menu; broader nested cancel paths untested. **DL-32:** asked “What wage do you need?” and soon read “Gül: ₺8000 a month. I need to know what is coming in, same as anyone.” No watch-only stretch met. **DL-33 pass in sample:** one own-voice question produces speech; no strength/reason/Confirm form.

### 7. Hearsay

**Reached:** title → Start → Got it → Talk to… → Emre → talk choices → Close → Game menu. Evidence: `hearsay/02-play.png` through `05-game-menu.png`. Talk to Emre is the person’s working sheet; no separate biography inspector was found.

**DL-30 fail:** the **305 px** talk-choice area has **611 px** content. The person grid pushes “Tell what you saw”, “The flour”, “Which word?” and trait options below its visible box. One H group. The separate Tell/Defend/Ask/Make amends row and full Tell preview stay visible. Child rectangles outside the scroller falsely register covered/overlap; they are not active competing targets.

**DL-31 fail on scene visibility:** the near-full-screen Talk to Emre modal removes the selected person’s tea-garden scene. Current day and other background state disappear too. The flour incident is fully repeated in the visible Tell preview, so it is **not** counted as missing decision evidence. Coffee’s Day 4 deadline and Rıza’s mind state are hidden, but their necessity for this particular Tell choice was not established.

**DL-22 fail** for hidden speech choices. **DL-23 small targets:** home wordmark 81.4×37.5 px and inline Privacy 39.1×14 px; both low priority. **DL-24:** chooser is replaced by talk, Close returns scene; focus untested. **DL-32:** form-led speech sampled; 20 s hands-on availability not established, no quantified forced watch-only gap. **DL-33 fail for this path:** Talk → person → subject/trait → preview → Tell. No direct spoken-line alternative met; its absence elsewhere is not proven.

### 8. The Glance

**Reached:** cover → Take the night desk → level sheet → gate orders → desk → Game menu → Dai inspector. Evidence: `glance/02-play.png` through `06-dai.png`.

**DL-30 pass in sampled panels:** no essential text clipping verified. **DL-31 fail on scene visibility:** level/gate/person sheets remove the dam scene. Gate order also removes the original clock/gauges but repeats “Now 22:01 · last gate 0/6, read 22:00 (as written)” and the last level in readable text; keeper finish estimate stays visible. This is one recurring selected-scene failure, not lost readings or deadline.

**DL-22 pass** sampled responses. **DL-23:** three small link groups (framework mark, collection link, Lab privacy); main gameplay choices fit. **DL-24:** gate replaces level and close returns desk; broader origin/focus checks untested. **DL-32:** only requests/orders to Dai met; no direct keeper act or outcome demonstrated. **DL-33 not tested:** selecting a gauge opens immediate numbered turn orders with costs; no order/outcome was tested. A one-act desk order may itself be the character’s core verb, so opening a sheet alone does not prove a prohibited form. No claim about later interactions.

### 9. The Day You Say Nothing

**Reached:** intro → Day → Halil tab → Speak → Say something else editor → Game menu. Evidence: `voice/02-play.png` through `06-menu.png`.

**DL-30:** no verified clipping. Scene speech choices “Go home and rest.” and “Go to sleep.” fit. Optional editor has visible Say it and Back to the scene. **DL-31 fail in optional editor:** “Halil is rest at home.” and current scene/words disappear while composing; date/time remain. The editor is fine control, so this does not disqualify the direct path under DL-33.

**DL-22 pass** on tested speech scene. **DL-23 fail:** Speak / Let time pass are 40 px high, one repeated height group. **DL-24:** back-to-scene observed; focus untested. **DL-32:** direct lines and Let time pass repeatedly available; no forced watch-only interval met. **DL-33 direct-act affordance observed; consequence untested.** Spoken lines are offered directly in the scene. Invisible timeline entries and intended modal backgrounds are noise. The short “fasting” overflow box looked readable and is excluded.

### 10. Small Works

**Reached:** Mum’s lantern → Carry → exterior response → Look inside → Contact → Look closely → Meter → Workshop menu. Evidence: `repair/02-carry.png` through `07-menu.png`.

**DL-30:** no text clipping verified. **DL-31 fail for timed tool work:** meter’s Read meter costs “10 min”, while “Day 1 · 09:25 · 455 min until closing” is readable only after opening Workshop menu. The working meter viewport does not show remaining time. Money “£24 available · seed 42” is likewise in menu; its relevance to the sampled measurement is less direct. The meter sequence also leaves its readout above the viewport; this is ordinary page scroll, not a fixed-panel clip.

**DL-22 not fully tested:** direct Carry result fits; later meter readout is offscreen. **DL-23 pass with alternatives in sample:** small/dense SVG component targets have labelled “Choose a component by name” and 44 px terminal alternatives. **DL-24:** tabs/menu observed; complete cancel/focus paths untested. **DL-32:** Carry immediately produced “Last test: The light goes out while carried.” Switch, inspect and measurement acts remained available. **DL-33 pass in sample** for Carry/switch/cover; tool measurement appropriately uses its panel. No actual repair or final handover reached. Closed details children are noise. Menu is labelled Workshop, not literally Game menu.

### 11. The Stairwell

**Reached:** cover → main → All orders → Sevim bread task/travel → Residents → Nermin click → bakery route → Game menu. Evidence: `stairwell/02-play.png` through `08-menu.png`. Nermin click did not reveal a separate person inspector; that inspector is **unreached**.

**DL-30:** no clipping verified; order labels/deadlines fit, including “Nermin two loaves and the paper” / “from the bakery, by 08:01”. **DL-31 fail in directory:** full-height orders/residents sheet replaces the whole building scene, although top clock and each task’s deadline remain readable. **Route decision passes in sample:** building, order, clock and “To flat 1 7 min” / “To flat 2 8 min” remain visible together (`07-after-person`).

**DL-22 pass** sampled main/travel/route. **DL-23:** three small link groups (framework mark, All games, Lab privacy), main controls ≥44 px. **DL-24:** one directory at a time and close; full origin/focus return untested. **DL-32:** trip and route choices available, bread appeared carried; no forced watch-only interval established. **DL-33 not fully tested:** task/route buttons perform acts without a form, but no serving/knocking act reached.

### 12. The Pass

**Reached:** cover → Tonight’s board → Selim Change → service → Selim job/person sheet → Game menu. Evidence: `pass/02-play.png` through `06-menu.png`.

**DL-30 fail:** board’s fixed “Open the doors” commit row covers “Dilek” and “Leave it” cover choices (`03-board-change`). One B/O group; normal page scrolling may recover them, so they are not called permanently unreachable. **DL-31 pass in sampled service/person sheet:** “till ₺0 / ₺5,200 by Sat”, current time and Selim’s break time stay readable. Scene is only roughly 80×65 px: a serious readability concern, not counted as absent state because it and the repeated text are still visible.

**DL-22 fail** at expanded board. **DL-23 fail** at the same fixed-row target collision; other sampled controls fit. **DL-24:** menu intentionally overlays gameplay; full nested focus paths untested. **DL-32:** no tickets initially; “Tap to work a portion” appeared by 17:32, within several real seconds after service capture. Work was offered, not performed, so no consequence or sustained cadence claim. **DL-33 supported by the offered direct ticket act**, consequence untested.

### 13. The Rope

**Reached:** cover → Begin the season → turnback promise → working sheet → Tamar selection → Journal. Evidence: `rope/02-play.png` through `05-journal.png`. No literal Game menu; Journal holds the export/send controls. No separate person inspector found: selecting Tamar changes recipient and offers “walk to Tamar”.

**DL-30 fail:** fixed “more actions” covers Bilal and part of Nell in the people strip (`03-working`), one B/O group. **DL-31 pass in sample:** “Turnback promised at 12:00” remains readable above/below the action row, and mountain/party stay visible. **DL-22 pass** on immediate walk/order choices. **DL-23 fail** on people-strip overlap plus small collection link. **DL-24:** Journal back path exists; full focus/nested paths untested.

**DL-32:** lead on, eat, walk to Tamar offered throughout the short sample; no forced watch-only stretch met. **DL-33 supported for offered one-act controls**, outcomes untested beyond initial promise. Wren’s cut right edge has explicit “swipe for people →” and is treated as horizontal-strip affordance, not an additional text defect.

### 14. The Two Voices

**Reached:** cover → wake-up answer → second Aylin answer → suggestion/refusal → Game menu. Evidence: `murmur/02-play.png` through `06-response.png`. No independent person/object inspector found in visible controls; **unreached**.

**DL-30/31 pass in sampled answer/response:** weekday/time, decision countdown, relevant words and full choices stay readable. No separate spatial scene exists in this presentation. “Tell Aylin: tonight, on the bus.” produced “She chose: “Leave it on read.”” with a readable response. **DL-22/23 pass** in sample. **DL-24 not fully tested:** menu overlays the answer and is translucent, allowing underlying outlines/text through; noted as a readability concern, not counted as a hidden active control or demonstrated task-sheet stacking failure. Origin/focus return untested.

**DL-32:** one-tap speech available at choices; response offers “Let time pass faster ▸”. No forced watch-only interval demonstrated. **DL-33 pass in sample:** one utterance, no strength/reason/Confirm form. End-of-week screen not reached.

## Probe noise and inspection gaps

Excluded from confirmed counts: intended modal background occlusion; closed `details` descendants; screen-reader-only text; off-container child rectangles falsely colliding with a commit row; decorative/canvas drawing bounds; dense scene targets with a labelled disambiguation alternative; Warren’s journal preview behind Open journal; normal page scrolling without a fixed internal trap. Conversely, Warren’s safety Reading and Well’s appeals are confirmed by screenshots despite missing raw clipped/truncated flags.

All 14 games reached gameplay and their primary working view. All 14 run-control menus were opened, using Journal for Rope and Workshop for Small Works. Separate inspectors were not found/reached in Two Voices, Stairwell and Rope; Hearsay’s talk sheet, Watch’s order/person card and Neighbours’ Ada drawer served that role in the sample. This is a bounded live layout audit, not complete game traversal or source verification.

Two independent reviewers checked the consolidated report. Corrections removed an unsupported Neighbours clipping claim, narrowed decision-dependency claims, and marked unperformed direct-act paths as untested.

## Recommendation: phone-stage adoption order

Use the kit pattern: scene, readable state strip with wrapped chips, one bottom sheet, and a visible commit row that reserves its own space. In this order:

1. **Warren:** let complete safety/person sentences determine panel height; retain shelter capacity/exposure while Reading is open.
2. **Valley:** keep rain goal/date, next milestone and selected house visible; stop action selection moving the whole document; place Close outside the menu’s hit area.
3. **Well:** preserve its useful state strip; remove appeal ellipsis and give chooser rows enough independent space.
4. **Watch:** reserve space for Begin the watch, retain watcher identity/traits beside post choices, and fit the action-context sentence.
5. **Neighbours:** put promise/deadline above the walking commitment; keep Ada/Workshop in the visible scene.
6. **Good Hands:** grow the question area so a whole question and cost fit; retain the placement deadline through timed interviews.
7. **Hearsay:** keep the selected person visible; reduce the person-grid cost before speech choices; retain its readable commit previews.
8. **Glance:** retain a useful dam/keeper scene above the otherwise readable order sheet.
9. **Voice:** retain current action/scene context above the optional editor; keep the direct speech path.
10. **Small Works:** retain closing time during tool work and keep meter readout with its controls; preserve direct object acts.
11. **Stairwell:** retain selected resident/building context in directories; use the existing route decision as the better local pattern.
12. **Pass:** reserve board commit-row space and enlarge the service scene; sampled service state already stays readable.
13. **Rope:** separate more actions from the people strip; preserve the visible turnback promise and mountain.
14. **Two Voices:** lowest priority for stage migration; sampled answer/context already works. Make menu fill opaque before a larger layout change.
