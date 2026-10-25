# Twice at the Well — source-unread playtest

## First minute

Checkpoint captured at **69.3 real seconds** after the first actionable opening screen (08:29:18.386 UTC). It was late while observing and recording. The original note incorrectly said 61.5 seconds; this was corrected immediately in the diary. No gameplay inputs were taken between Confirm at 39.9 s and the checkpoint.

| Item | Original checkpoint answer                                                                                                                                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DL-1 | PASS: I need a roof, 12 meals and six people alive before the storm; the opening told me.                                                                                                                                                                                |
| DL-2 | PASS for controls reached: Play, selectors, Suggestion, Use and Confirm looked usable; Use and Confirm worked. I did not identify individual map targets.                                                                                                                |
| DL-3 | FAIL: the roof/meals goals draw me first and Resume competes; the storm is urgent, but I cannot tell which of the two villages my order belongs to. Yusuf and House were clearly selected before Confirm.                                                                |
| DL-4 | PASS for the one disabled action met: Confirm was grey until a villager and place were filled; Use freed it.                                                                                                                                                             |
| DL-5 | PASS: an order is out, I can choose another villager/place or inspect Orders (1); the house counter above rose.                                                                                                                                                          |
| DL-6 | PASS: the order composer was available after Play at 9.1 seconds; first meaningful choice input was Use at 34.4 seconds, Confirm at 39.9. Play was first input at 9.1.                                                                                                   |
| DL-7 | PASS for one order reached: Use prepares and Confirm sends taught me that distinction; the house rose but a lower bubble says Not now. After I eat a meal. I do not yet understand the two responses. Other interactions not reached: NOT TESTED; count not established. |

The checkpoint status is preserved as recorded. Screenshot references: 01-state, 03-state, 07-clickText, 09-state, 10-state in well-shots.

## Assignment and method

Kofi, 30, warehouse supervisor. I play colony sims on PC, am new to phone colony sims, like giving orders and seeing them carried out, and lose patience with menus.

- Game: Twice at the Well, https://human.adamwhite.work/colony/.
- Build: no version was visibly identified.
- Main fixture: 360×690 CSS px, touch emulation, light mode, headless Chromium through Playwright.
- Access: one persistent Node HTTP browser server, one page. Screenshots, rendered page text and ordinary control clicks only. No game source, bundles, network payloads, storage, debug APIs, exports or prior reports were inspected. Only the two assigned instruction documents were read.
- First actionable screen: 2026-10-20 08:28:09.079 UTC (03:28:09.079 America/Chicago). The opening Play button was actionable, so the clock starts there.
- Natural quit: 08:32:43.984 UTC, **274.9 s / 4 min 34.9 s**. Eight real minutes was a ceiling. I did not reach it or finish the game.
- Game time advanced normally at 1× until selecting 2× at 200.4 s. It stayed paused until the play triangle at 213.3 s. Auto-pause was enabled on arrival and left unchanged. I did not change consent or send telemetry/run uploads.
- After quitting, I resized to 1280×800 and reloaded for one desktop opening-screen look. I did not press Play again. Screenshot 41-state is the settled desktop opening. Screenshot 40-reload caught its entrance animation; 39-desktop is the resize artifact before reload.

The browser service wrote wall-clock timestamps, elapsed seconds, inputs, answers and original diary notes continuously to `well-shots/timeline.jsonl`. Two text-locator clicks timed out: Suggestion · Idris at about 91 s and Resume at about 197 s. I reconnected to the same running page after each and continued with coordinate taps. These are tooling failures, not evidence of broken game controls. Some immediate post-click screenshots caught the previous animation frame; later state screenshots confirm the settled answer.

The native villager selector received a tap at 20.6 s, but the captured image did not expose a usable native option popup. My small browser driver did not implement native select-option input. I used the game's visible suggestion controls instead. Independent dropdown assignment remains untested; this limitation should not be counted as a game defect.

### Checkpoint evidence limits

The First minute answers above are the original answers, not revised using later knowledge. At that point one order interaction had been completed, using Suggestion → Use → Confirm. Six visible interaction families had not been completed: independent villager selection, independent place selection, map selection, Order options, Orders inspection, and speed changes. Those six were **NOT TESTED at the checkpoint**. This enumerates the checkpoint's otherwise unspecified count without changing its original wording. Inspect had appeared after Use but was also untested at that point, making **seven** named visible interaction families untested. No claim is made about interactions not yet discovered.

## Verbatim diary

Elapsed times below are real seconds from the first actionable screen. Original wording is preserved, including the checkpoint timing error and its correction. The long checkpoint note is reproduced in full.

**5.8 s — 08:28:14.904 UTC**

> I have a deadline: roof the house and get meals in before the storm. Play looks like the way in; I want to get people working.

**20.6 s — 08:28:29.653 UTC**

> The suggestion says send Yusuf to the house. The villager and place boxes and Confirm look like controls. Resume is grabbing my eye, but I want to assign the job first.

**39.8 s — 08:28:48.881 UTC**

> Use has put Yusuf on the house order. Likely yes sounds like he can refuse. I still need Confirm, so I am sending it.

**58.5 s — 08:29:07.598 UTC**

> The upper house is going up, but the lower one is still 2/10. There are two villages? I can see Not now. After I eat a meal, but I cannot tell who said it without going lower.

**69.3 s — 08:29:18.386 UTC — original checkpoint note**

> First minute — checkpoint at 61.5 seconds. DL-1 PASS: I need a roof, 12 meals and six people alive before the storm; the opening told me. DL-2 PASS for controls reached: Play, selectors, Suggestion, Use and Confirm looked usable; Use and Confirm worked. I did not identify individual map targets. DL-3 FAIL: the roof/meals goals draw me first and Resume competes; the storm is urgent, but I cannot tell which of the two villages my order belongs to. Yusuf and House were clearly selected before Confirm. DL-4 PASS for the one disabled action met: Confirm was grey until a villager and place were filled; Use freed it. DL-5 PASS: an order is out, I can choose another villager/place or inspect Orders (1); the house counter above rose. DL-6 PASS: the order composer was available after Play at 9.1 seconds; first meaningful choice input was Use at 34.4 seconds, Confirm at 39.9. Play was first input at 9.1. DL-7 PASS for one order reached: Use prepares and Confirm sends taught me that distinction; the house rose but a lower bubble says Not now. After I eat a meal. I do not yet understand the two responses. Other interactions not reached: NOT TESTED; count not established.

**83.4 s — 08:29:32.520 UTC**

> Checkpoint timing correction: the recorded checkpoint was at 69.3 seconds, not 61.5. I took no gameplay input between the 39.9-second Confirm and this checkpoint. The current screen is paused on an Idris suggestion and the lower bubble now says Thirsty. Water first.

**105.5 s — 08:29:54.608 UTC**

> Three timber at once is useful. It warns the cedar can hurt him; I will take the risk to get the roof done. At least that risk is stated before I send him.

**120.9 s — 08:30:09.931 UTC**

> Orders makes it clearer: C and H both got the same order, and Yusuf eventually said Fine. The lower house has finally moved to 3/10. I like seeing that my instruction survived his meal break.

**130.2 s — 08:30:19.288 UTC**

> Idris got hurt in both villages. I was warned, so that is on me. I want to see whether I can get him home or leave him to recover.

**163.1 s — 08:30:52.227 UTC**

> Order options has Rush, Insist, children, duty and safer. I do not know what those quoted words do. I will use the ordinary timber suggestion rather than start arguing with people.

**177.1 s — 08:31:06.190 UTC**

> It suggests Maryam is free, then tells me she will refuse because the others would go unfed. That makes the suggestion feel like a trap. I would rather leave the cook cooking. I will inspect before I commit.

**191.5 s — 08:31:20.567 UTC**

> Maryam is actually cooking, and the inspector tells me she cooks at 06:30, noon and 18:00. That is enough for me: keep her there. The rest of this sheet is more detail than I want right now.

**200.3 s — 08:31:29.400 UTC**

> I am leaving Maryam alone and switching to 2× to see the work finish sooner. I want to watch outcomes now instead of reading another menu.

**213.5 s — 08:31:42.580 UTC**

> 2× is selected but the clock was still 10:45, so I tapped the play triangle too. Resume had scrolled out of the middle panel. This screen is starting to feel cramped.

**228.3 s — 08:31:57.338 UTC**

> Yusuf carried Idris home before eating. Good. I wanted someone to look after him, and they did it without another order from me. That is the first moment these feel like people rather than job markers.

**239.0 s — 08:32:08.087 UTC**

> I am resuming and watching for the roof. I can read the clock and the suggestion expiry in English, but the storm countdown is cut to Day 1 of 2 … on the phone clock. The goals still tell me what I am aiming for.

**268.0 s — 08:32:37.054 UTC**

> The human roof is moving again: 6/10 and ten meals. I am mostly waiting now. I cannot comfortably watch the people below the order panel, and the two tiny maps are doing more work than I can read on this screen.

**274.9 s — 08:32:43.984 UTC — quit**

> I am stopping here. I like the rescue and the delayed yes, but on this phone I am looking past the order panel to catch scraps of the village. I would try this again on PC; I would not choose another phone session right now.

**284.3 s — 08:32:53.365 UTC — desktop opening only, after quit**

> Post-session desktop first screen only: the page now says Classic they obey and Human they decide. That explains the comparison much faster. The dates also have room: roof before D2 19:00 and everyone lives by D3 05:00. I did not know those details during the phone checkpoint.

**Report clarification of that last note:** the desktop rendered-text response contained the full D2 19:00 deadline, but the settled screenshot still truncates the roof and stock goal labels. Only “Everyone lives by D3 05:00” is fully readable in that goal row. My diary overstates how much room the desktop dates have. The desktop comparison subtitles are visibly readable. Neither observation changes the phone checkpoint.

## Inputs and visible answers

| Elapsed         | Input                         | Visible answer / evidence                                                                                                                                                                                                               |
| --------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.2 s           | Observe opening               | “Roof the house, store 12 meals and keep everyone alive before the storm.” “Choose a villager and place, then Confirm.” Play visible. 01-state.                                                                                         |
| 9.1 s           | Tap Play                      | Composer available. At 13.9 s, paused suggestion: “First light. Send Yusuf to the house?” 03-state. Meaningful choice was available within 30 s; only about 28 essential opening words preceded it, excluding title/time/button labels. |
| 20.6 s          | Tap villager selector         | Focus outline; native option selection not completed. 04-tap.                                                                                                                                                                           |
| 31.7 s          | Open Yusuf suggestion         | “Use fills an order. Confirm sends it. You can skip or choose your own.” “He is your best builder and walls are cheap now.”                                                                                                             |
| 34.4 s          | Use                           | Yusuf → House, “build the house”; “likely yes.” 07-clickText.                                                                                                                                                                           |
| 39.9 s          | Confirm                       | “Order given: Yusuf → House”; Orders (1); running clock. Upper house later 3/10, lower house 2/10 with meal refusal bubble. 09-state.                                                                                                   |
| 69.3 s          | Checkpoint; no gameplay input | Paused at Day 1 08:00, Idris cedar suggestion, upper house 5/10, lower 2/10. 10-state.                                                                                                                                                  |
| 99.8 s          | Open Idris suggestion         | “Fast timber, but the cedar can hurt whoever fells it.”                                                                                                                                                                                 |
| 100.2 / 105.6 s | Use / Confirm Idris → Cedar   | “Order given: Idris → Cedar.” Risk knowingly accepted.                                                                                                                                                                                  |
| 105.7 s         | Orders (2)                    | Both requests listed with C and H answers. Yusuf: “Alright, I'll do it.”, then “Fine.” At 112.3 s lower house 3/10. 16-state.                                                                                                           |
| 120.9–130.1 s   | Close Orders; scroll attempts | Hurt notices: Idris (Classic), Day 1 09:01; Idris (Human), Day 1 10:06. Human house 4/10. 19-state.                                                                                                                                     |
| 158.8 s         | Open Order options            | Rush, Insist, “children”, “duty”, “safer”; controls grey with no order selected. 23-state.                                                                                                                                              |
| 171.7 / 172.2 s | Open Maryam suggestion / Use  | “Timber is short. Maryam is free until noon.” Then “Maryam: will refuse: the others would go unfed.” Also warns the pot sits cold while she is gone. No Confirm.                                                                        |
| 177.2 s         | Inspect Maryam                | Human inspector says Cooking, Fed, Not thirsty, Tired, Well, Feels pride; cooking schedule and “Cook a pot: keep everyone fed.” 27-state.                                                                                               |
| 191.6 / 191.7 s | Close inspector / Clear       | Returned to order composer; Maryam draft removed.                                                                                                                                                                                       |
| 200.4 s         | Select 2×                     | Selected ring visible; still paused. 31-state.                                                                                                                                                                                          |
| 213.3 s         | Tap play triangle             | Time resumes. At 219.2 s auto-paused on “Yusuf carried Idris home before eating.” 33-state, 35-state.                                                                                                                                   |
| 228.3 s         | Collapse Order options        | More of the moment and Resume visible. 35-state.                                                                                                                                                                                        |
| 238.9 s         | Tap Resume                    | Time runs at 2×. At 258.0 s Day 1 about 16:09: Human meals 10, house 6/10. 37-state.                                                                                                                                                    |
| 274.9 / 275.0 s | Quit / preserve screen        | Day 1 16:27, paused moment “Yusuf and Tariq raised the beam together.” Human house 7/10, meals 10, injury 1, alive 6. Classic house 7/10, meals 4, injury 1, alive 6. 38-state. No further phone inputs.                                |

## What playing felt like

**Best moment:** Yusuf carried Idris home before eating, around 3:39 real elapsed. I had wanted help for the injured worker, and another villager supplied it. Orders also gave a satisfying delayed answer: Yusuf's “Fine.” stayed attached to the original job, and the Human house eventually improved.

**Worst moment:** being told “Maryam is free until noon,” preparing that suggested order, then reading “will refuse: the others would go unfed.” I could understand the tradeoff after inspecting her, but the initial wording gave me the wrong expectation about her availability.

**Frustration:** around 2:43, the quoted order options required interpretation. Around 3:33, the expanded middle panel had pushed Resume out of view. **Boredom:** around 4:28, I was mostly waiting and struggling to watch the lower village. I quit at 4:34.9 because of the phone presentation, not because a failure or victory had ended the run.

## Clarity findings

- **DL-3 FAIL, phone:** “Classic” and “Human” identified two panels, but I did not understand the shared order/comparison at the checkpoint. I saw the upper house improve and a lower refusal without knowing how the responses related. 09-state / diary 58.5 s. Orders clarified this later; the desktop subtitles “they obey” / “they decide” clarified it further after the session.
- **DL-22 FAIL, phone:** the middle composer took most of the usable height while Human stats and map continued below the bottom edge. The Human panel's speaker and surrounding scene were hard to identify; the notebook overlay covered part of the lower map. In 31-state, an expanded suggestion/options panel showed its Use action but the paused reason and Resume were above the visible panel. 09-state, 23-state, 31-state, 37-state. Confirm itself was reachable. The failure is essential context and observation space, not a claim that every action was unreachable.
- **DL-21 FAIL for phone deadline visibility:** the small clock showed “Day 1 of 2 …”; the roof/meals goal row showed quantities rather than readable deadlines. I could read a suggestion expiry such as “lapses 11:45 · in 60 min,” but could not compare the main storm deadline with today from the phone screenshot. 01-state, 23-state, 35-state. Cross-month/year comparison and a return after a break: NOT TESTED.
- **DL-19 FAIL for one availability cue:** “Maryam is free until noon” led me to expect a usable spare worker. Her prepared order said “will refuse: the others would go unfed,” and Inspect showed Cooking. 25-clickText / 27-state; diary 177.1 s. This is my interpretation of the cue, not a claim that refusal is a bug or that the game must offer only good suggestions. The cold-pot warning did communicate the tradeoff before Confirm.
- **DL-7 unresolved beyond the first order:** Rush, Insist, “children,” “duty,” and “safer” were unfamiliar when opened. I did not activate them or request further help, so their outcomes and whether later context explains them are NOT TESTED. This is a recorded comprehension gap, not proof that no explanation exists. 23-state.

### Other observations and evidence gaps

| Item                  | Result                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-13 feedback        | PASS for the two confirmed orders. “Order given” acknowledged the request; Orders retained the replies. I did not repeat an uncertain Confirm or test duplicate handling.                                                                                                                                                                                                                                                                   |
| DL-14 costs           | PASS for cedar injury risk and Maryam's cooking tradeoff; both stated before commitment.                                                                                                                                                                                                                                                                                                                                                    |
| DL-15 time            | Moving/paused state and selected 1×/2× were visible. **FAIL against the stated continuous-play/slowdown criterion:** enabled Auto-pause stopped at suggestions and moments, including the rescue, until resumed. This helped me read. A consequential choice arriving from fast speed and restoring the chosen speed was NOT TESTED; the rescue was an informational moment, not a new consequential decision. I did not change Auto-pause. |
| DL-17 feelings        | PASS for reached Human displays: “Heartened,” “Getting acquainted,” “Feels pride,” and plain-language needs.                                                                                                                                                                                                                                                                                                                                |
| DL-20 English         | PASS for reached action labels, goals, warnings and order replies. “Hajja Maryam” appeared with “Cook, 68” and her cooking schedule. “Time for Asr” was a background bubble; I did not need to translate it to issue an order. No action-critical untranslated term was met.                                                                                                                                                                |
| DL-21 dates           | See phone failure above. Suggestion times and relative minutes were understandable. Main deadline comparison on phone was not established. Desktop opening showed Day 1 05:00, “storm in 38 h,” and “Everyone lives by D3 05:00”; other goal dates still truncated visually.                                                                                                                                                                |
| DL-23 targets         | No overlap caused a demonstrated wrong input. I did not measure hit areas, so 44×44 compliance is NOT TESTED. Tiny map people were not successfully selected.                                                                                                                                                                                                                                                                               |
| DL-24 sheets          | Inspect closed back to the composer. Orders closed back to play. Focus restoration, all origins and stacking behavior NOT TESTED.                                                                                                                                                                                                                                                                                                           |
| DL-25 reflow          | No horizontal scrolling was encountered at 360×690. 200% text, 320 px width and dark mode NOT TESTED.                                                                                                                                                                                                                                                                                                                                       |
| DL-26 menu            | NOT TESTED. I saw ellipsis controls and Playtest notebook but did not explore game save/run controls.                                                                                                                                                                                                                                                                                                                                       |
| DL-27 resume          | NOT TESTED. The post-session reload returned to the opening rather than a tested Continue flow; I did not investigate save behavior.                                                                                                                                                                                                                                                                                                        |
| DL-28 sending         | NOT TESTED; sending was prohibited. No consent changes or uploads.                                                                                                                                                                                                                                                                                                                                                                          |
| DL-29 replay          | NOT TESTED. No export downloaded.                                                                                                                                                                                                                                                                                                                                                                                                           |
| End state / long play | Storm, second day, final result, recovery completion and long-run consequences NOT TESTED. Builder checks throughout the checklist were NOT TESTED.                                                                                                                                                                                                                                                                                         |

## Where I stopped and whether I would return

I stopped voluntarily at Day 1 16:27, with the “raised the beam together” moment paused on the preserved final phone screen. Both villages still had six people alive. The Human village had ten meals and house 7/10; the storm had not arrived. I did not resume after deciding to leave.

I would return on PC to see more of the people and their responses. I would not voluntarily start another phone session in this layout yet. The desktop opening made the comparison easier to understand, but it was only an opening-screen look, not evidence about desktop play quality.

## Changes I would want, ranked as this player

1. Let me see the Human village and the important response while I issue orders on the phone. Keep the person who answered visible.
2. Tell me early that one order goes to both villages and what “Classic” and “Human” mean. The desktop's “they obey” / “they decide” wording helped.
3. Keep the storm deadline readable next to the clock or the goals on the phone, so I can judge whether I have time to wait.

Screenshots: `scratch/clarity/retest/well-shots/`.

No export was downloaded. No replay claim is made. The persistent browser server was stopped by exact PID 68306 after the desktop observation.
