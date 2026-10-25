# Clarity audit of the live lab games (2026-10-20)

Source-unread Codex audit against the first draft of [the clarity checklist](../design-language.md) (commit f11e35d). The checklist was revised the same day; ids here are the draft ids. Mapping to the revised ids: draft DL-12 feedback is DL-13; DL-20..22 language are DL-20..21; DL-23 fold is DL-22; DL-24 targets DL-23; DL-25 sheets DL-24; DL-26 text size DL-25; DL-27 menu DL-26; DL-28 resume DL-27; DL-29 send DL-28; DL-30 replay DL-29. The draft asked for 15 px text, a Gregorian date and a "Notebook" menu; the revision asks for the 17 px base, an English or clearly defined relative date, and a "Game menu". Screenshots and per-game notes stayed in the scratch folder and are not kept. Ranked ledger rows: F-206..F-217.

---

20 October 2026. Twelve games, phone 360×690 first, then desktop 1280×800. Each received about 3–4 minutes of real interaction. Three independent browser testers covered the nine external sites; the coordinator covered the three in-site games. The live games index supplied those three URLs. The source repository and game docs were not inspected. The only project document read was [the allowed checklist](../../../docs/lab/design-language.md).

Every game has its first screen,30 s,60 s and after-choice phone images below. All 48 required images were checked as 360×690; timed evidence JSON records 30 s/60 s. Desktop captures are 1280×800. “After choice” sometimes captures entry/first input; later gameplay is also present in the 30 s/60 s images, and Glance has a separate first gameplay request capture. Warren repeated the opening after adding canvas-drag support; Pass includes a separate returning visit. These limits are disclosed per game. Times include UI inspection and occasional locator waits; waits were not scored as game failures.

Tables give DL-1–7 verdicts from the session, with short exact screen quotes. Later counterexamples are identified. A pass means the tested path passed; it is not an exhaustive proof. Failed-item tables include later observations. Cosmetic naming failures are distinguished from missing functionality. An obvious resume verb plus saved context passes DL-28 in substance even when it does not literally say Continue.

No Send button was clicked. No forms were submitted. Dialogs were only inspected and cancelled. Telemetry visits were allowed. DL-29 offline/full/oversize behavior is untested throughout. DL-30 replay is unverified except Repair’s observed built-in recorded-replay check. A downloaded file alone does not prove replay.

The largest recurring cold-player problems were phone actions hidden or covered, missing current-task guidance, and small labels/targets. Date failures were clearest in Valley; desktop also exposed exact personal scores in the two older in-site games. Independent cross-review removed unsupported one-second latency failures and wording-only resume failures.

## The Pass

[https://pass.adamwhite.work](https://pass.adamwhite.work) · recorded interaction 209 s. [Detailed session notes](pass/audit.md).

Phone: [first](pass/phone-first.png) · [30s](pass/phone-30s.png) · [60s](pass/phone-60s.png) · [after choice](pass/phone-after-first-choice.png). [Desktop](pass/desktop.png).

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item | Result | What the player saw                                                                                                                                       |
| ---- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | Pass   | “The bank wants the arrears by Saturday close.” I understood the goal as earning enough by Saturday.                                                      |
| DL-2 | Pass   | Filled/bordered cook and job buttons read as controls. Scene labels looked like labels.                                                                   |
| DL-3 | Fail   | During service the accent marks a speed button. “The rail is clear.” and the cook-selection instruction compete; neither tells me which decision matters. |
| DL-4 | Pass   | “rather work the cold side” and “after I eat something” explain resistance beside jobs. No unexplained disabled control encountered.                      |
| DL-5 | Fail   | After a job request, the useful instruction disappears. “The rail is clear.” does not say whether to wait, assign cooks or serve.                         |
| DL-6 | Pass   | “Open the doors” changes the game at 10 seconds. Intro story is about 35 words.                                                                           |
| DL-7 | Pass   | I opened, selected a cook and requested a break without help. Jobs explain likely answers in place.                                                       |

Failed items:

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item  | Evidence and effect                                                                                                                                       |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-3  | During service the accent marks a speed button. “The rail is clear.” and the cook-selection instruction compete; neither tells me which decision matters. |
| DL-5  | After a job request, the useful instruction disappears. “The rail is clear.” does not say whether to wait, assign cooks or serve.                         |
| DL-23 | Selim’s job sheet puts “Eat” at y 644–715, with its instruction below 690 px.                                                                             |
| DL-24 | Speed 42×34 px; sheet close 36×36 px.                                                                                                                     |
| DL-26 | Scene labels 11–12 px, cook status 13 px, instructions 14 px; no document overflow seen.                                                                  |
| DL-27 | No Notebook/save/export/send entry during service. “Save a playtest file” and sending appear only after close.                                            |

Top three fixes, ranked for a cold player:

1. Pin a next-action sentence above the cooks: “Wait for the next ticket”, the ticket’s missing station, or the outstanding request.
2. Keep the full job list, forecast and current request visible inside 360×690 after a cook is selected.
3. Add a permanent “Notebook” entry during service; make controls at least 44 px and instructional text at least 15 px.

Entry 10 s; first job request 57 s. Opening is about 35 words, and service controls are available on entry; the slower job time includes a changing-status selector miss. DL-6 passes availability/reading load, not a claim that a job was requested within 30 s. Service plus returning visit total≥209 s. DL-12 latency is unverified:350 ms snapshots without replies do not prove a one-second failure. Later “Alright, I'll do it.” appeared. Resume passes in substance: “Back to the kitchen (Monday, week 1)” comes first. Export downloaded; replay unverified. Send dialog inspected/cancelled after close. Extra evidence is in [pass-return](pass-return/).

## The Glance

[https://glance.adamwhite.work](https://glance.adamwhite.work) · recorded interaction 181 s. [Detailed session notes](glance/audit.md).

Phone: [first](glance/phone-first.png) · [30s](glance/phone-30s.png) · [60s](glance/phone-60s.png) · [after choice](glance/phone-after-gameplay-choice.png). [Desktop](glance/desktop.png).

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item | Result | What the player saw                                                                                                                                                                                         |
| ---- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | Pass   | Mandatory introduction says “Keep the dam below its crest and the town dry, or warned in time.”                                                                                                             |
| DL-2 | Pass   | Gauges, keeper and gate values all have filled/bordered control treatment. Scene labels are distinct.                                                                                                       |
| DL-3 | Fail   | The only accent is the selected speed. No gauge or next action is singled out.                                                                                                                              |
| DL-4 | Fail   | Early resistance is explained, but later a sleeping keeper’s reading request says only “can't · ~10 min”; sleep is hidden by the sheet.                                                                     |
| DL-5 | Fail   | “Tap a gauge to have it read. Tap a keeper to talk to him.” is generic. It does not name the current waiting job, next event or present danger.                                                             |
| DL-6 | Fail   | First request was at 23 s, but it follows 70+ intro words and a mandatory multi-paragraph explanation/sample report. The start control is y 1031 on the phone pre-watch page. “Before any long text” fails. |
| DL-7 | Fail   | The mandatory pre-watch page teaches level, weir, gate, later river consequences, rest and Tuesday's inn before play. This is a rules page rather than one rule at first use.                               |

Failed items:

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item  | Evidence and effect                                                                                                                                                                                         |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-3  | The only accent is the selected speed. No gauge or next action is singled out.                                                                                                                              |
| DL-4  | Early resistance is explained, but later a sleeping keeper’s reading request says only “can't · ~10 min”; sleep is hidden by the sheet.                                                                     |
| DL-5  | “Tap a gauge to have it read. Tap a keeper to talk to him.” is generic. It does not name the current waiting job, next event or present danger.                                                             |
| DL-6  | First request was at 23 s, but it follows 70+ intro words and a mandatory multi-paragraph explanation/sample report. The start control is y 1031 on the phone pre-watch page. “Before any long text” fails. |
| DL-7  | The mandatory pre-watch page teaches level, weir, gate, later river consequences, rest and Tuesday's inn before play. This is a rules page rather than one rule at first use.                               |
| DL-23 | Mandatory start y 1031. Gate choices 4–6 extend y 651–719; “Turns open, out of 6. Hold a button to insist.” is below the fold.                                                                              |
| DL-24 | Speed 34×34 px; sheet close 55×34 px.                                                                                                                                                                       |
| DL-26 | Gauge names/forecasts 12 px; historical reading 10.5 px; keeper state 13 px; sheet explanation 14 px. No document overflow seen.                                                                            |
| DL-27 | No Notebook/save/export control exposed during the watch, including desktop and scrolling.                                                                                                                  |
| DL-28 | “Back to the desk” is first and resumes, but has no saved day/time summary.                                                                                                                                 |

Top three fixes, ranked for a cold player:

1. Replace the mandatory pre-watch lecture with “Keep the dam below its crest and the town dry, or warned in time” and the first reading request; teach gates/rest/inn at first use.
2. Pin the current job, expected return and next relevant threshold above the actions; give that concern the single attention accent.
3. Fit the complete gate sheet within 690 px; enlarge controls to 44 px and text to 15 px; provide “Notebook” throughout the watch.

Entered 10 s, gameplay 14 s, first level request 23 s; then gate and stove requests. Readings retain an observer and observation time rather than claiming omniscient current water. DL-4 is an overall failure after the later sleeping-keeper counterexample: “can't · ~10 min” lacks its local reason; earlier forecasts explained resistance. DL-12 response latency is unverified; a later reply said “I can’t. I’m done in. Give me twenty.” Export/send were not exposed during this short watch, so their function and DL-29/30 remain untested.

## The Two Voices

[https://murmur.adamwhite.work](https://murmur.adamwhite.work) · recorded interaction 202 s. [Detailed session notes](murmur/audit.md).

Phone: [first](murmur/phone-first.png) · [30s](murmur/phone-30s.png) · [60s](murmur/phone-60s.png) · [after choice](murmur/phone-after-first-choice.png). [Desktop](murmur/desktop.png).

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item | Result | What the player saw                                                                                                                                                  |
| ---- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | Fail   | “There are two voices in her head. One is yours.” states the role, but no plain session goal or end condition. I inferred helping Dilan through her week.            |
| DL-2 | Pass   | Choices have filled borders; “say nothing” has a dashed border; menu is boxed. Distinct pencil text reads as the rival voice, not a control.                         |
| DL-3 | Fail   | No single accent marks what needs attention. Choice panel position/size helps, but the blue rival voice is visually strongest and the suggested response is neutral. |
| DL-4 | Pass   | “she’d put it off” or “she’s willing” explains the limit on my influence before I choose. No unexplained disabled action encountered.                                |
| DL-5 | Pass   | “Tap one to say it.” starts play. “on with the day ▸” explicitly gives the next input after a decision.                                                              |
| DL-6 | Pass   | First suggestion at 14 s; opening story about 35 words.                                                                                                              |
| DL-7 | Pass   | Inline “the pencil is the other voice” and “the small words are her mood about each” teach the first choice in place. No help needed.                                |

Failed items:

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item  | Evidence and effect                                                                                                                                                  |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1  | “There are two voices in her head. One is yours.” states the role, but no plain session goal or end condition. I inferred helping Dilan through her week.            |
| DL-3  | No single accent marks what needs attention. Choice panel position/size helps, but the blue rival voice is visually strongest and the suggested response is neutral. |
| DL-24 | Menu 44×40 px; “say nothing”105×40 px.                                                                                                                               |
| DL-26 | Timestamps 12 px; moods/instructions 13–14 px. No document overflow seen.                                                                                            |
| DL-25 | Cancelling the send dialog returns to the still-open “the back page” sheet rather than the scene.                                                                    |
| DL-27 | Save/export/send are grouped well under “the back page”, but the shared “Notebook” entry name is absent. This is naming consistency, not missing functionality.      |
| DL-28 | “Continue the week” comes first and works, but has no saved day/time or last-scene line.                                                                             |

Top three fixes, ranked for a cold player:

1. Pin a plain session goal above the choices: “Accompany Dilan through the week; review what she chose each evening.” Explain what the player’s influence can change.
2. Give the current choice the single attention accent; reduce the rival voice’s prominence so it reads as context.
3. Raise small labels to 15 px, make menu/silence targets 44 px high, and name the grouped save/export/send sheet “Notebook” with saved context beside Continue.

First suggestion 14 s; first three by 33 s, without help. “on with the day ▸” makes next input clear; phone choice panel ends at y 679. Constructive suggestions received explicit deferrals, e.g. “Not now. After I blame the ring road.” This is a short play-feel observation, not an engine claim. Export downloaded; send dialog inspected/cancelled. DL-15 unverified: no slowdown notice observed, but slowdown itself was not established. Replay and send-error behavior untested.

## The Rope

[https://rope.adamwhite.work](https://rope.adamwhite.work) · recorded interaction 182 s. [Detailed session notes](rope/audit.md).

Phone: [first](rope/phone-first.png) · [30s](rope/phone-30s.png) · [60s](rope/phone-60s.png) · [after choice](rope/phone-after-first-choice.png). [Desktop](rope/desktop-first.png).

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item | Result | What the player saw                                                                                                                                                             |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | Pass   | “Coming down safe is a good day.” The title states “Five people, three mountains.”                                                                                              |
| DL-2 | Pass   | Main controls have visible outlines; selected person uses the accent. Map drawings do not imitate buttons.                                                                      |
| DL-3 | Fail   | Selected “everyone”, spoken player line, tutorial stripe and situational feedback compete in red. No persistent next task after tutorial dismissal.                             |
| DL-4 | Fail   | Initial “go down” and “stop” disabled without visible reason; “insist / not yet” explains timing only. Later take-pack reason exists in a hover title, not adjacent phone text. |
| DL-5 | Fail   | “You asked everyone: take a rest.” reports a past action. When everyone refuses until the hut path is climbed, no persistent line says whether I should lead, wait, or follow.  |
| DL-6 | Fail   | Input was fast, but both introduction and pre-promise scene exceed the approximately 40-word story limit. Promise screen needs roughly 90 words before the first commitment.    |
| DL-7 | Pass   | First three choices worked unaided; “You lead. Tap Lead on…” and request instructions appear as needed.                                                                         |

Failed items:

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item        | Evidence and effect                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-3        | Selected “everyone”, spoken player line, tutorial stripe and situational feedback compete in red. No persistent next task after tutorial dismissal.                             |
| DL-4        | Initial “go down” and “stop” disabled without visible reason; “insist / not yet” explains timing only. Later take-pack reason exists in a hover title, not adjacent phone text. |
| DL-5        | “You asked everyone: take a rest.” reports a past action. When everyone refuses until the hut path is climbed, no persistent line says whether I should lead, wait, or follow.  |
| DL-6        | Input was fast, but both introduction and pre-promise scene exceed the approximately 40-word story limit. Promise screen needs roughly 90 words before the first commitment.    |
| DL-8, DL-11 | Long introductory text; overlapping speech balloons obscure the reading hierarchy even on desktop (desktop-rest.png).                                                           |
| DL-23       | Request composer puts “ask / gently” and “urge / press them” near y 728; Wren clips in the person strip.                                                                        |
| DL-24       | Speed controls 30 px high; journal 29 px; “got it”20 px.                                                                                                                        |
| DL-26       | Main verbs 13 px, hint/speech names 14 px, intensity captions 11 px. No page-wide horizontal overflow seen.                                                                     |
| DL-25       | Send dialog opens over Journal; Not now returns to Journal.                                                                                                                     |
| DL-27       | Functions use “journal” rather than the shared “Notebook” label. Export/send are grouped there; resume is at the title.                                                         |
| DL-28       | “Continue the season” is first and works, but has no saved location/time line.                                                                                                  |

Top three fixes, ranked for a cold player:

1. Pin the next action near the controls and put a fictional reason beside every disabled verb; update it when the party refuses.
2. Fit target, request and commit controls in the phone viewport; wrap the person strip or show an explicit scroll affordance.
3. Cut the opening to one goal and one turnback choice; use 15 px labels,44 px targets and one consistently named “Notebook”.

Begin 11 s; promise 12:00 at 17 s; lead on 21 s. First three choices unaided. Turnback later produced different visible answers from the five climbers. Export contains seed, inputs and state; replay not verified because no import control was visible. Send dialog inspected/cancelled. Its failure handling is untested.

## The Repair Shop / Small Works

[https://repair.adamwhite.work](https://repair.adamwhite.work) · recorded interaction 246 s. [Detailed session notes](repair/audit.md).

Phone: [first](repair/phone-first.png) · [30s](repair/phone-30s.png) · [60s](repair/phone-60s.png) · [after choice](repair/phone-after-first-choice.png). [Desktop](repair/desktop-repair.png).

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item | Result | What the player saw                                                                                                                   |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | Pass   | “Carry it to the garden and it goes dark. I want to take it to the evening gathering.” clearly establishes the repair goal.           |
| DL-2 | Pass   | Buttons are bordered or filled; component and terminal interactions have drawn outlines.                                              |
| DL-3 | Fail   | Three conversation paragraphs precede the repair. “Ask Sam to watch” competes with the task before the lantern and “Try carrying it.” |
| DL-4 | Pass   | First-three-choice path had no unexplained limit. Meter explains “Place both probes on terminals” before a reading.                   |
| DL-5 | Pass   | Pinned hint changes from “Try carrying it.” to “Open the cover to look inside.” then “Choose a part inside, then examine it.”         |
| DL-6 | Fail   | Carry was reached in 12 s by scrolling, but roughly 100 words precede it. First visible viewport has no repair action.                |
| DL-7 | Pass   | Carry → open cover → select Contact/examine worked without rules. Meter rule arrives after examination.                               |

Failed items:

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item  | Evidence and effect                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- |
| DL-3  | Three conversation paragraphs precede the repair. “Ask Sam to watch” competes with the task before the lantern and “Try carrying it.” |
| DL-6  | Carry was reached in 12 s by scrolling, but roughly 100 words precede it. First visible viewport has no repair action.                |
| DL-11 | Three opening conversation paragraphs consume the phone’s upper screen before the object and repair verb.                             |
| DL-23 | First “Carry” starts near y 829. During meter work, probes/read controls sit several folds below the task hint.                       |
| DL-24 | “Ask Sam to watch”23 px high; “Explore freely”26 px; cover target about 36 px high.                                                   |
| DL-26 | Footer/framework 12.8 px; secondary controls/timestamps below 15 px. No document overflow measured.                                   |
| DL-27 | Save/export/import/replay/send are grouped in “Workshop”, not the shared “Notebook” entry. Naming failure only.                       |
| DL-28 | Reload restores directly, but supplies no returning-player Continue/context presentation. The save works.                             |

Top three fixes, ranked for a cold player:

1. Put the lantern, “Try carrying it.” and current repair verb above the fold; collapse initial conversation into an optional recent-message row.
2. Keep the active meter instruction and probe/read controls together, without a full object illustration between them.
3. Make secondary controls 44 px high and labels at least 15 px, especially the cover and Sam invitation; label the grouped Workshop functions “Notebook”.

Carry 12 s; open cover; examine Contact. Strong progressive hints: “Try carrying it.” → “Open the cover to look inside.” → “Choose a part inside, then examine it.” Workshop says “Saved automatically on this device. Time waits while you are away.” Export downloaded. In-game recorded replay verifier answered “Replayed 2 recorded actions to this exact workshop state.” This is observed replay-verifier success, not independent source verification. Send dialog inspected/cancelled; send errors untested.

## The Valley

[https://valley.adamwhite.work](https://valley.adamwhite.work) · recorded interaction 215 s. [Detailed session notes](valley/audit.md).

Phone: [first](valley/phone-first.png) · [30s](valley/phone-30s.png) · [60s](valley/phone-60s.png) · [after choice](valley/phone-after-first-choice.png). [Desktop](valley/desktop-ledger.png).

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item | Result | What the player saw                                                                                                                                                                              |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DL-1 | Pass   | Pinned “His barley is still standing. Get it cut before the rain.” gives the immediate goal.                                                                                                     |
| DL-2 | Fail   | Houses are plain map drawings/text, with no accent or underline or visible “tap a house” instruction. I could not identify them as controls by appearance alone.                                 |
| DL-3 | Fail   | Red log stripe, selected speed and red crier button compete; a long event log occupies the center while the actual task is below it.                                                             |
| DL-4 | Fail   | “Call the hamlet” disappears after one use. “The crier has called…” explains that it happened, but not when or why it can be used again.                                                         |
| DL-5 | Fail   | After calling, status says “Nobody has come yet” then “Many have come.” No next line says how long to wait or suggests visiting houses. That suggestion appears later only in the scrolling log. |
| DL-6 | Fail   | First input 12 s, but opening story is about 80 words before the button.                                                                                                                         |
| DL-7 | Fail   | Call worked unaided, but after that I did not know how to visit a house or what remained within my control. Discovery depends on an unmarked map or later log text.                              |

Failed items:

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item                | Evidence and effect                                                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DL-2                | Houses are plain map drawings/text, with no accent or underline or visible “tap a house” instruction. I could not identify them as controls by appearance alone.                                 |
| DL-3                | Red log stripe, selected speed and red crier button compete; a long event log occupies the center while the actual task is below it.                                                             |
| DL-4                | “Call the hamlet” disappears after one use. “The crier has called…” explains that it happened, but not when or why it can be used again.                                                         |
| DL-5                | After calling, status says “Nobody has come yet” then “Many have come.” No next line says how long to wait or suggests visiting houses. That suggestion appears later only in the scrolling log. |
| DL-6                | First input 12 s, but opening story is about 80 words before the button.                                                                                                                         |
| DL-7                | Call worked unaided, but after that I did not know how to visit a house or what remained within my control. Discovery depends on an unmarked map or later log text.                              |
| DL-20, DL-21, DL-22 | Planning dates “18 Temmuz”, “15 Eylül”, “5 Ağustos”, “16 Aralık” lack English dates; “384 kile” has no first-use meaning.                                                                        |
| DL-9                | “Send word again… Or walk down and ask them yourself” appears only in the log, not the pinned next instruction.                                                                                  |
| DL-24               | Speed 36 px high; fast 40 px wide.                                                                                                                                                               |
| DL-26               | Framework/speed 14 px; footer 13 px; smaller log times. No document overflow measured.                                                                                                           |
| DL-27               | “The agha’s ledger”, “The notebook” and “Playtest notebook” split save/export/send across entries.                                                                                               |

Top three fixes, ranked for a cold player:

1. Replace every planning date with an English weekday and Gregorian date; explain “kile” once in practical terms.
2. After calling, pin when responses will arrive, how to visit a house, and when another call is available; visibly mark tappable houses.
3. Cut the opening and reduce log prominence; reserve the attention accent for the current task and keep ledger controls clear of the fixed footer.

Take seal 12 s; call 17 s; ledger/speed exploration before 60 s. Later used Go to visit a child. Phone crier action and pinned task are above the fold (DL-23 pass for the scene); ledger controls require scrolling. “Bind this volume” saved, export downloaded with seed/inputs/state. “Open the ledger” came first beside “Your ledger is open at 23 Temmuz of year one.” Resume passes in substance; date language fails separately. Ledger time advanced while open: recorded as timing observation, not DL-15 failure. Send dialog inspected/cancelled; replay/errors untested.

## The Stairwell

[https://stairwell.adamwhite.work](https://stairwell.adamwhite.work) · recorded interaction 182 s. [Detailed session notes](stairwell/audit.md).

Phone: [first](stairwell/phone-first.png) · [30s](stairwell/phone-30s.png) · [60s](stairwell/phone-60s.png) · [after choice](stairwell/phone-first-choice.png). [Desktop](stairwell/desktop-action.png).

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item | Result | What the player saw                                                                                                                                                                                                                         |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | Fail   | “bread, bins, parcels, five flights of stairs” describes the job; “On Sunday they vote on your tea money” hints at stakes. No concise sentence gives the overall week’s objective. Immediate task is clear: “Bread first, before anything.” |
| DL-2 | Pass   | Bread orders have bordered rows. Speed and pencil controls have button outlines. No decorative drawing needed a tap for the first three choices.                                                                                            |
| DL-3 | Fail   | Initial accent highlights the speed control, rather than the bread task. Later several overdue order borders are accented at once.                                                                                                          |
| DL-4 | Fail   | “Anything new?” becomes disabled after one question without an adjacent reason. “A word for me on Sunday / too early” does provide one.                                                                                                     |
| DL-5 | Pass   | “On your way to the bakery”, then “At the bakery”, then “On your way to flat 6” makes the next state legible. Order labels change from “from the bakery” to “to flat 6”.                                                                    |
| DL-6 | Fail   | The first choice was available fast and clicked at 16 s, but the title screen has about 60 words of story before “Begin on Monday”, above the roughly 40-word limit.                                                                        |
| DL-7 | Pass   | Selected a bread order, then delivery orders without reading help. Travel and delivery were shown through status and changed order wording.                                                                                                 |

Failed items:

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item  | Evidence and effect                                                                                                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1  | “bread, bins, parcels, five flights of stairs” describes the job; “On Sunday they vote on your tea money” hints at stakes. No concise sentence gives the overall week’s objective. Immediate task is clear: “Bread first, before anything.” |
| DL-3  | Initial accent highlights the speed control, rather than the bread task. Later several overdue order borders are accented at once.                                                                                                          |
| DL-4  | “Anything new?” becomes disabled after one question without an adjacent reason. “A word for me on Sunday / too early” does provide one.                                                                                                     |
| DL-6  | The first choice was available fast and clicked at 16 s, but the title screen has about 60 words of story before “Begin on Monday”, above the roughly 40-word limit.                                                                        |
| DL-23 | Only three order rows fit; longer rows end in “…”, hiding destination/deadline; further delivery controls require list scrolling.                                                                                                           |
| DL-24 | Speed 40×34 px; pencil 38×36 px; orders 336×40 px; notebook close 39×36 px.                                                                                                                                                                 |
| DL-26 | Map 11 px; speed 13 px; orders/journal/many controls 14 px. No document overflow seen.                                                                                                                                                      |
| DL-27 | Pencil → “The notebook” holds export; footer “Playtest notebook” separately holds sending.                                                                                                                                                  |
| DL-28 | “Continue the notebook” comes first and resumes, but lacks saved day/time/location context.                                                                                                                                                 |

Top three fixes, ranked for a cold player:

1. Show one current bread job with its full destination/deadline in 15 px text; put remaining jobs behind an explicit list affordance.
2. Make one 44 px “Notebook” control hold export and sending; give Continue a saved day/time/location line.
3. Shorten the opening to a plain weekly objective, emphasize the current job rather than speed, and explain why “Anything new?” is exhausted beside it.

First bread order 16 s; subsequent delivery choices unaided. “On your way to the bakery” → “At the bakery” → “On your way to flat 6” provides useful feedback. DL-1 failure concerns the lack of a concise overall week objective; immediate bread purpose is clear, and a winning condition is not required. Export contains game/seed/inputs/minute/state. Replay and send-error handling untested. No submission.

## The Warren

[https://warren.adamwhite.work](https://warren.adamwhite.work) · recorded interaction 182 s. [Detailed session notes](warren/audit.md).

Phone: [first](warren/phone-first.png) · [30s](warren/phone-30s.png) · [60s](warren/phone-60s.png) · [after choice](warren/phone-first-choice.png). [Desktop](warren/desktop-first.png).

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item | Result | What the player saw                                                                                                                                                                                                                          |
| ---- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | Pass   | Pinned “Dig a refuge where the village can outlast the riders.”                                                                                                                                                                              |
| DL-2 | Fail   | Tools are bordered buttons, but a normal narrative sentence is also a button: “The barley stood ripe. Riders had burned two villages…” It looks like story, not a control.                                                                   |
| DL-3 | Fail   | “Chalk stone beside it for more room” is accented, but chalk, selected speed and bell are also accented simultaneously.                                                                                                                      |
| DL-4 | Pass   | “Where the daylight stops, the picks stop. A lamp hung beside a face lets them work it.” explains the constraint in the fiction. “People choose when to take up a pick” explains non-obedience. No unexplained disabled control encountered. |
| DL-5 | Pass   | Initial instruction says choose chalk then drag. After chalk: “The chalk is laid. People choose when to take up a pick.” Later: “Jars are filling the cellar. Mark beds so the village can sleep here too.”                                  |
| DL-6 | Fail   | Choice available quickly, but about 80 words precede Begin. Original cold chalk selection 17 s; first stone marking 14 s on replayed opening.                                                                                                |
| DL-7 | Pass   | Chalk, lamp and store explain their input when selected. “Tap open ground to hang a lamp. Tap it again to take it down.” No help page needed.                                                                                                |

Failed items:

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item  | Evidence and effect                                                                                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DL-2  | Tools are bordered buttons, but a normal narrative sentence is also a button: “The barley stood ripe. Riders had burned two villages…” It looks like story, not a control.                                                     |
| DL-3  | “Chalk stone beside it for more room” is accented, but chalk, selected speed and bell are also accented simultaneously.                                                                                                        |
| DL-6  | Choice available quickly, but about 80 words precede Begin. Original cold chalk selection 17 s; first stone marking 14 s on replayed opening.                                                                                  |
| DL-22 | “night, the 19th day of harvest, first year” provides no weekday/Gregorian date for planning.                                                                                                                                  |
| DL-24 | Speed 27–29 px wide; card/notebook close 37×36 px; tabs 42 px high. Tool buttons 45×52 px pass.                                                                                                                                |
| DL-25 | Opened Notebook over Zehra’s card; closing it restores the card rather than the unobscured scene.                                                                                                                              |
| DL-26 | Tool labels 12 px, resources 13 px, next line 14 px. No document overflow seen.                                                                                                                                                |
| DL-14 | Opening says “Ring the bell when there is smoke.” Later “bell” has no adjacent no-smoke warning; ringing yields “You rang the bell, though no one had seen smoke.” This is a missing local warning, not absent prior guidance. |

Top three fixes, ranked for a cold player:

1. Shorten the opening to the refuge goal and first chalk instruction; reserve the attention accent for the current instruction/tool, not bell and speed together.
2. Add an English Gregorian date; make visible text 15 px and narrow speed/close targets 44 px minimum.
3. Make journal expansion look interactive, show the no-smoke warning beside the bell, and replace the person card when opening Notebook.

Original cold chalk selection 17 s. Restarted only to add UI coordinate dragging; the main phone-first sequence repeated the opening, then marked stone 14 s. Main run 182 s, plus original approximately 40 s. Chalk/lamp/store instructions appeared beside tools; “Jars are filling the cellar. Mark beds so the village can sleep here too.” gave the next action. Notebook groups export/send. Resume passes in substance: “Go back down · the 24th day of harvest, first year” is first and works. Export has seed/input/state; replay/errors untested. No submission.

## Neighbours

[https://neighbours.adamwhite.work](https://neighbours.adamwhite.work) · recorded interaction 200 s. [Detailed session notes](neighbours/audit.md).

Phone: [first](neighbours/phone-first.png) · [30s](neighbours/phone-30s.png) · [60s](neighbours/phone-60s.png) · [after choice](neighbours/phone-first-choice.png). [Desktop](neighbours/desktop-arrival.png).

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item | Result | What the player saw                                                                                                                                                                                                 |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | Pass   | “Watch a day unfold” supplies an observer goal; “Help when you choose” describes optional agency. Desktop pins “Reopen the hall”.                                                                                   |
| DL-2 | Pass   | Play/Step and person circles are clearly outlined; “Find your feet →” is underlined. Buttons, tabs and links are visually distinct from map decoration.                                                             |
| DL-3 | Fail   | First map accents “Find your feet →” and the Town tab. After a story pause, “Read story” and “Pause settings” compete; desktop also accents “Ways to help →”.                                                       |
| DL-4 | Pass   | “Only people at the same place, and awake, can hear you.” Walking disables other destinations and says “Walking to Flooded hall, arriving about10:15.” Town actions display “1 town credit”.                        |
| DL-5 | Fail   | Clear next-step text exists, but on phone the person sheet places it below the visible fold. The map only shows “Find your feet →”, which does not say what action to take. Desktop does show the explanatory line. |
| DL-6 | Fail   | Step was available by 15 s and used at 20 s, but Enter town sits below a long introduction: first phone screenshot shows no start control. About 150+ words precede it.                                             |
| DL-7 | Pass   | Step advances time; Play runs; following a person explains their current action. Walking instruction/cost appears when needed. No help page needed for the first three choices.                                     |

Failed items:

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item  | Evidence and effect                                                                                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-3  | First map accents “Find your feet →” and the Town tab. After a story pause, “Read story” and “Pause settings” compete; desktop also accents “Ways to help →”.                                                       |
| DL-5  | Clear next-step text exists, but on phone the person sheet places it below the visible fold. The map only shows “Find your feet →”, which does not say what action to take. Desktop does show the explanatory line. |
| DL-6  | Step was available by 15 s and used at 20 s, but Enter town sits below a long introduction: first phone screenshot shows no start control. About 150+ words precede it.                                             |
| DL-23 | Person sheet puts “Your next step” and “Walk somewhere” below the fold behind fixed playback/story controls.                                                                                                        |
| DL-24 | Save 40 px high; “Find your feet”30 px; “Read story”/“Pause settings”32 px.                                                                                                                                         |
| DL-26 | Day marker 10.88 px; map initials 12 px; sheet labels 11.56 px; instructions 14.28 px. No page-wide overflow; person selector intentionally scrolls.                                                                |
| DL-15 | “Paused for a new story” hard-stops the simulation; Play is required again outside a menu.                                                                                                                          |
| DL-25 | Save opens over Ada’s sheet; Escape restores Ada’s sheet rather than the unobscured scene.                                                                                                                          |
| DL-27 | Save/export/submission are under “Save ⋯”; More also links “Saves, seeds and story pauses…”. Shared “Notebook” naming is absent.                                                                                    |
| DL-22 | Calendar shows “DAY 1” and clock, with neither weekday/Gregorian date nor total-day framing.                                                                                                                        |
| DL-28 | Reload offers “Enter town” without saved context/Continue. Entering restores the saved town, so save functionality works.                                                                                           |

Top three fixes, ranked for a cold player:

1. Pin the player’s immediate verb and location above the resident description in the phone sheet; keep it visible while scrolling.
2. Move Enter town above the long introduction; teach Step in the scene. Slow for stories and mark one current attention target.
3. Consolidate the controls under “Notebook”; use 15 px instructions,44 px targets and a returning-player saved-position line.

Enter 10 s; first Step 20 s; Play and follow Ada unaided. Walked to Flooded hall and inspected help. Travel gives arrival time; speech requires an awake listener in the same place. No numerical mood/trust bars observed. Downloaded .json.gz contains rounds/runtime seed and state. No explicit player-input log was identified; narrative events begin “Sam: Carry food from the quay.” DL-30 is unverified, not failed on field naming alone. Send/error handling untested; no submission.

## The Night Watch

[https://human.adamwhite.work/watch/](https://human.adamwhite.work/watch/) · recorded interaction 193 s. [Detailed session notes](night-watch/audit.md).

Phone: [first](night-watch/phone-first.png) · [30s](night-watch/phone-30s.png) · [60s](night-watch/phone-60s.png) · [after choice](night-watch/phone-first-choice.png). [Desktop](night-watch/desktop.png).

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item | Result | What the player saw                                                                                                                                                                                          |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DL-1 | Pass   | “Bring every soul and the granary to the thaw.” I understood: keep the village alive through winter.                                                                                                         |
| DL-2 | Pass   | Bordered watcher cards, post buttons and “Begin the watch”; the lantern instruction explicitly says “choose a stretch, or tap the wall”. No inert apparent control established.                              |
| DL-3 | Fail   | At dusk the amber scout banner, selected “Watch” speed, selected lantern position and filled “Begin the watch” compete for the same accent.                                                                  |
| DL-4 | Pass   | After ringing, the disabled button explains itself: “The bell is still swinging”. The rope is described as “fraying”.                                                                                        |
| DL-5 | Pass   | Dusk says “Tap a watcher, then a post.” Night says “choose a stretch, or tap the wall”; movement replies “The lantern is on its way”. These support the immediate next input.                                |
| DL-6 | Fail   | “Go up to the wall” is below the opening viewport (top y 819). Roughly 150 words of bell, voice, rope and watcher rules precede it. Starting was possible quickly by scrolling, but the ≤40-word test fails. |
| DL-7 | Fail   | Before play, the introduction explains scout, posts, lantern, hearing, bell range, rope wear, refusal and ask/urge/insist together. These rules arrive before their controls.                                |

Failed items:

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item              | Evidence and effect                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DL-6              | “Go up to the wall” is below the opening viewport (top y 819). Roughly 150 words of bell, voice, rope and watcher rules precede it. Starting was possible quickly by scrolling, but the ≤40-word test fails. |
| DL-7              | Before play, the introduction explains scout, posts, lantern, hearing, bell range, rope wear, refusal and ask/urge/insist together. These rules arrive before their controls.                                |
| DL-3              | Several amber priorities at dusk; the primary task is not uniquely signalled. See `phone-60s.png` and `phone-first-choice.png`.                                                                              |
| DL-6, DL-7, DL-11 | The long “You are the Keeper…” paragraph blocks entry and teaches several future mechanics at once. See `phone-first.png`.                                                                                   |
| DL-23             | Initial “Go up to the wall” is below 690 px; first watcher card starts at y 643 and the other two at y 739/y 835. “Begin the watch” is sticky, but choosing watchers requires scrolling. See `started.json`. |
| DL-24             | Phone Chronicle target is 40×44 px; HF link 24×44 px. “Playtest notebook” summary is about 150×25 px. Its “Send this run to the notebook” opener is about 232×31 px.                                         |
| DL-26             | Speed captions 10.56 px; watcher descriptions 12.48 px; scout and date 13.6 px; assignment instructions 14.4 px. No page horizontal overflow observed.                                                       |
| DL-27             | “Playtest notebook” holds sending/privacy; “The chronicle” holds “Copy the playtest” and “Save it as a file”. Save/export/send are not in one entry.                                                         |

Top three fixes, ranked for a cold player:

1. Put “Go up to the wall” directly beneath the goal; keep the opening under 40 words and teach bell range and rope wear beside the bell when first used. (DL-6,7,11,23)
2. Keep watcher assignment and the next instruction in one phone sheet above the fold; reserve the filled accent for “Begin the watch” and use quiet outlines for speed and selection. (DL-3,23)
3. Replace the floating send-only entry with one 44 px-high “Notebook” button containing resume status, download and “Send this run to the notebook”; raise all phone text to at least 15 px. (DL-24,26,27)

Entered the wall, selected watcher/lantern positions, began the watch, rang the bell, moved the lantern, changed speed, asked Tamar at dawn and continued to the second dusk. First watcher-assignment controls require scrolling; Begin the watch is sticky. “The bell is still swinging” explains its disabled state. “Daylight enough for one more talk. Each talk costs them a little sleep.” explains the dawn limit. Reload passes DL-28: “Continue the chronicle” and a first-year/winter/after-first-night summary. Export downloaded; send dialog inspected/cancelled. Replay and send errors untested.

## The Day You Say Nothing

[https://human.adamwhite.work/voice/](https://human.adamwhite.work/voice/) · recorded interaction 243 s. [Detailed session notes](day-you-say-nothing/audit.md).

Phone: [first](day-you-say-nothing/phone-first.png) · [30s](day-you-say-nothing/phone-30s.png) · [60s](day-you-say-nothing/phone-60s.png) · [after choice](day-you-say-nothing/phone-first-choice.png). [Desktop](day-you-say-nothing/desktop.png).

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item | Result | What the player saw                                                                                                                                                                                                                           |
| ---- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | Pass   | “Help him toward his own ends, so that on Eid he does them without you.” The goal is to help Halil carry out his intentions independently.                                                                                                    |
| DL-2 | Fail   | Live log entries become button controls, including “I drink water, because you asked. · until 04:04”, but look like ordinary journal prose with no border, fill, accent or underline. See `phone-first-choice.png`.                           |
| DL-3 | Fail   | In the first response, clock time, “You: mention · drink water”, current words and “Say something” all use amber; Selin’s earlier phone call is separately blue. The required next action has no unique accent.                               |
| DL-4 | Pass   | No unexplained gameplay cap encountered in the first minute. The speaking sheet explains the context: “The fast begins at 04:59. He hasn’t cooked since Nuran died; there’s bread and cheese.” This is a limited observational pass.          |
| DL-5 | Pass   | “Leaning: eat at home” plus “Say something” gives the immediate choice. The response forecast is separate from this next-input instruction.                                                                                                   |
| DL-6 | Fail   | Opening text exceeds 200 words before “Begin”, including character history, four days, four ends and five other voices. The input can be reached quickly because the modal starts scrolled near its bottom, but the ≤40-word criterion fails. |
| DL-7 | Pass   | Without opening help, I could begin, open “Say something”, choose “drink water” and commit “Say it: mention · drink water”. The sheet prefilled a suggestion and explained it beside the choices.                                             |

Failed items:

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item         | Evidence and effect                                                                                                                                                                                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-6         | Opening text exceeds 200 words before “Begin”, including character history, four days, four ends and five other voices. The input can be reached quickly because the modal starts scrolled near its bottom, but the ≤40-word criterion fails.                                                            |
| DL-2         | Ordinary journal paragraphs are interactive button rows without visible control treatment.                                                                                                                                                                                                               |
| DL-3         | Multiple amber claims and a blue phone call compete with the current speaking action.                                                                                                                                                                                                                    |
| DL-6, DL-11  | Long opening character/rules text; first viewport starts partway down the opening dialog, showing “What he’s holding on to” instead of the game title and premise. See `phone-first.png`.                                                                                                                |
| DL-22        | The planning date is “Ramadan 1”; the debt is due “by Ramadan 15”. No English Gregorian date or weekday accompanies either.                                                                                                                                                                              |
| DL-23, DL-24 | Floating “Playtest notebook” occupies the right of the bottom tab bar, physically covering “Ends & voices”. A normal click was intercepted by that summary. Clock controls are 34 px high; ⋯ is 32×32 px; notebook summary about 136×22 px.                                                              |
| DL-26        | Narrative and notebook 14.5 px; clock log 11.84 px; “End day”12.16 px; reason buttons 12.8 px. No page horizontal overflow observed.                                                                                                                                                                     |
| DL-15        | The game says “Time runs slowly and stops when something matters.” At 10:01, “HIS ANSWER” stopped the clock with a Play icon. This is a hard stop for a non-menu event, rather than a disclosed slowdown.                                                                                                |
| DL-17, DL-18 | Desktop shows “Trust 0.51, up 0.01 since Ramadan 1.” and “0.51” beside “listens to you some”. This exposes an unobservable exact trust score. The exact values appear in the scrollable left column (`desktop.json`); `desktop.png` also shows hunger, thirst and tiredness bars, another DL-17 failure. |
| DL-27        | ⋯ holds “Download playtest file” and “Load playtest file”; floating “Playtest notebook” holds only send/privacy. They are separate places.                                                                                                                                                               |
| DL-28        | Reload returned to the full opening and 03:40 with 40 in hand, rather than the 10:01 run with 56 in hand. No “Continue” or saved position line appeared. The file-load route is separate in Playtest. See `resume.json` and `desktop-resume.png`.                                                        |

Top three fixes, ranked for a cold player:

1. Replace the long first dialog with the goal and one sentence explaining “Suggest an action; Halil decides”; reveal the four ends beside the first relevant choice. Open the dialog at its top. (DL-6,11)
2. Move “Notebook” into the ⋯ menu, keep the full bottom tab bar unobstructed, and make the toolbar targets at least 44 px square. (DL-23,24)
3. Pair “Ramadan 1” and “Ramadan 15” with English weekday and Gregorian dates everywhere the player must plan; keep Ramadan as the secondary date. (DL-22)

Began, suggested drinking water, observed “Fine.” and later actions, suggested the clinic and got “After I rest at home, then I will.” Phone feelings use words; desktop reveals bars and exact trust. Reload reset 03:40/40 in hand from 10:01/56. Export downloaded; send dialog inspected/cancelled. Two changing-action selector waits are disclosed tooling delays, not failures. Replay/send errors untested.

## Twice at the Well

[https://human.adamwhite.work/colony/](https://human.adamwhite.work/colony/) · recorded interaction 194 s. [Detailed session notes](twice-at-the-well/audit.md).

Phone: [first](twice-at-the-well/phone-first.png) · [30s](twice-at-the-well/phone-30s.png) · [60s](twice-at-the-well/phone-60s.png) · [after choice](twice-at-the-well/phone-first-choice.png). [Desktop](twice-at-the-well/desktop.png).

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item | Result | What the player saw                                                                                                                                                                                                                                        |
| ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | Pass   | “Roof before the storm”, “Storm stock”, “Everyone lives”. I understood: roof the house, store 12 meals and keep six people alive through the storm. Goal comprehension passes; presentation uses three headings rather than the requested single sentence. |
| DL-2 | Pass   | Villager/place chips and Confirm are bordered buttons; “Pick a villager here or on either map.” identifies map interaction.                                                                                                                                |
| DL-3 | Fail   | Three equal goal meters, selected speed, suggestion overlay, refusal banner and speech bubbles compete. At 05:30 the amber suggestion covers my current order controls.                                                                                    |
| DL-4 | Pass   | “Maryam: now pick a place.” explains the unavailable Confirm step. Before ordering House, “Maryam: will refuse: the others would go unfed” explains the personal constraint.                                                                               |
| DL-5 | Pass   | “Pick a villager here or on either map”, then “Maryam: now pick a place.” The refusal offers “Resume”. Next input is usually stated, though the overlay obstructs it.                                                                                      |
| DL-6 | Fail   | Opening exceeds 100 words before Play, including three goals and several simulation rules. First actual order committed at 40 s; part of the delay was Confirm being covered by the suggestion.                                                            |
| DL-7 | Fail   | Opening teaches both simulations, three goals, future suggestions, refusals, storm pauses, order composition and keyboard controls together before playing.                                                                                                |

Failed items:

<!-- biome-ignore format: Biome 2.6.3 expands Unicode table padding on every pass; preserve the recorded audit. -->
| Item              | Evidence and effect                                                                                                                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-6              | Opening exceeds 100 words before Play, including three goals and several simulation rules. First actual order committed at 40 s; part of the delay was Confirm being covered by the suggestion.                                                                              |
| DL-7              | Opening teaches both simulations, three goals, future suggestions, refusals, storm pauses, order composition and keyboard controls together before playing.                                                                                                                  |
| DL-3              | Simultaneous goals, speed selection, suggestion and character bubbles make the current task compete with several notices.                                                                                                                                                    |
| DL-6, DL-7, DL-11 | Long rules/goal overlay before Play. The first phone viewport cuts off the entry button near the bottom. See `phone-first.png`.                                                                                                                                              |
| DL-14             | Phone Rush/Insist omit desktop explanations “faster, hungrier” and “may cost trust”. The refusal preview helps, but these modifiers have no local cost explanation on phone.                                                                                                 |
| DL-15             | Clock stops with “Paused · A suggestion” and “Paused · An answer”, rather than slowing for the choice.                                                                                                                                                                       |
| DL-17, DL-18      | Phone exposes “Morale +0.01”, “Trust 54%” and “Prayers 0%”. Desktop shows Food and Sleep bars; its DOM text exposes exact percentages (for example Food 95%, Sleep 58%), rather than printing these percentages on the bars. See `phone-first-choice.png` and `desktop.png`. |
| DL-23             | The 05:30 suggestion overlays place chips and Confirm. Normal clicks were intercepted by its body. The first order required Enter; dismissing the suggestion restored tappable controls. Current action must remain usable on phone. See `phone-30s.png`, `phone-60s.png`.   |
| DL-24             | Place chips 40.4×44 px, menu 32×32 px, Goals 38 px high; notebook summary about 150×25 px.                                                                                                                                                                                   |
| DL-26             | Villager names 9.6 px, place labels 8.96 px, modifier labels 9.92 px, goal labels roughly 8–10 px. No page horizontal overflow observed.                                                                                                                                     |
| DL-27             | ⋯ contains “Download playtest file” and “Load playtest file”; “Playtest notebook” separately contains send/privacy.                                                                                                                                                          |
| DL-28             | Reload resets to 05:00, no orders and the opening Play dialog rather than offering Continue for the 08:02 four-order run. See `resume.json` and `desktop-resume.png`.                                                                                                        |

Top three fixes, ranked for a cold player:

1. Place suggestions outside the order composer; keep the chosen villager, place, predicted answer and Confirm visible and tappable at 360×690. (DL-3,23)
2. Reduce the opening to “Roof the house, store12 meals and keep everyone alive before the storm”; begin with one villager/place order and teach suggestions when they arrive. (DL-6,7,11)
3. Replace exact mood/trust/need values with brief character descriptions; use at least 15 px text and 44 px targets, including place chips. (DL-17,18,24,26)

Play 16 s, Maryam→House 17 s, first committed order 40 s via Enter because a suggestion covered Confirm. Then Yusuf→House, Maryam→Kitchen and desktop Idris→Cedar. Refusals, forecasts and Order given feedback were visible. Reload reset 05:00/no orders. Export downloaded; send dialog inspected/cancelled. Replay/send errors untested. “Day 1 of 2 · storm in 38 h” supports the immediate planning frame.
