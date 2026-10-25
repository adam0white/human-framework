# Twice at the Well — Kwame, source-unread retest

## Session

- **Persona:** Kwame, 30, bike courier and part-time football coach. Plays Mini Motorways, Kingdom Two Crowns and Northgard on his phone. Wants to send people out fast and watch them work. Lunch break, one-handed, eight minutes available.
- **URL:** https://human.adamwhite.work/colony/
- **Build:** no build identifier encountered on the visible screens.
- **Device:** 360×690 CSS px, touch emulation, light mode, default text size. One required look at 1280×800 after stopping.
- **Access:** Chromium through Playwright, one persistent page in a long-lived local Node process. Normal taps and named visible buttons; visible page text and screenshots only. No game source, internal state, bundles, network payloads or debug APIs inspected. Only the assigned instruction files and DL checklist were read in the repository.
- **Timing:** successful session began 2026-10-20 14:57:39.828 UTC (09:57:39.828 America/Chicago). Natural stop at **297.4 s (4:57.4)**, below the eight-minute ceiling. Last gameplay input at 262.4 s. Desktop look at 311.3 s; no resumed play. The browser continued running during tool calls and note writing. No simulated-time acceleration except the visible 2× control, selected at 123.5 s. Pending suggestions visibly slowed time to 1 game minute per real second; ordinary 1× showed 8 min/s and 2× showed 16 min/s.
- **Setup limitation:** the first local control server failed with EADDRINUSE on port 43182 after navigation but before I inspected a screen or gave game input. I launched the successful browser session on another port. Its opening screen was paused. The diary retains both setup opening entries rather than erasing the failed attempt. This was a local control-server error, not an observed game access failure.
- No telemetry submission, run sending, consent change, export download, reload or import was performed. The exact controller PID 24545 was terminated after the desktop look.

## First minute

Checkpoint at **70.8 real seconds**, 10.8 seconds late because of tool and observation delay. No new inputs between 49.9 s and the checkpoint. D1 08:05; screenshot `09-first-minute.png`.

| Item                       | Status | Original checkpoint answer                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 A reason to act       | PASS   | I need to finish a roof, put away twelve meals and keep these people alive before tomorrow evening's storm. The opening said so; the strip still shows Roof 3 of 10, Meals 2 / 12 and Storm Day 2 19:00.                                                                                                                                                                   |
| DL-2 What can I touch      | PASS   | Play, the speed buttons, Choose person, Suggestion and the outlined mode buttons looked tappable. The named people and buildings looked like map targets. I tapped Danyal and House and got an order acknowledgement. I have not hit an inert target. More places is another visible control.                                                                              |
| DL-3 Urgency and selection | PASS   | The roof, meals and storm strip draws me first. Storm Day 2 19:00 is the deadline; no immediate emergency is marked. Yusuf is orange and named in the bottom control. His destination cards compete with the map and cover bits of it.                                                                                                                                     |
| DL-4 Why the limit         | PASS   | Danyal said later because he was drawing water, then said after morning prayer. Yusuf's sheet said after Fajr beside a speech bubble saying morning prayer. Now he says after drinking at the well. I understand those waits end after those activities, but I cannot tell how long each will take. Cedar warns of injury and offers Review order; I have not reviewed it. |
| DL-5 Readable situation    | PASS   | Yusuf is Walking to House and the roof has gone from 2 to 3. I can select another destination or open the new Suggestion. That is enough to keep going, although his drinking speech bubble and walking label make me unsure which he is doing this instant.                                                                                                               |
| DL-6 A choice soon         | PASS   | Person/destination choice visible by 21.0 s after Play. First person selection at 25.6 s, first destination order at 29.8 s. First input was Play at 17.1 s. The opening's mandatory story and instruction were short, about 24 words.                                                                                                                                     |
| DL-7 Learn by doing        | PASS   | I reached two order routes: Danyal then House directly; Suggestion then Use suggestion then Confirm for Yusuf. Danyal taught me that an acknowledged order can be delayed. Yusuf's suggestion taught me he is the best builder. I used no More about the village help. Two routes reached; all other interaction types NOT TESTED at this checkpoint.                      |

## Verbatim wall-clock diary

The following preserves the recorded inputs, reactions and visible answers. Elapsed values come from the controller at the time of each entry. Some entries describe inputs made shortly before the note; the input text retains the original rounded time. The checkpoint screenshot was at 70.8 s; its diary note was entered at 100.5 s, before further gameplay input.

**2026-10-20T14:57:33.155Z · 0 s · failed setup attempt**

Input: Opened live page at 360x690; touch, light mode

Reaction: “First screen available; starting cold.”

**2026-10-20T14:57:39.828Z · 0 s**

Input: Opened live page at 360x690; touch, light mode

Reaction: “First screen available; starting cold.”

**2026-10-20T14:57:52.073Z · 12.2 s**

Input: Read opening; named controls before tapping

Reaction: “I need a roof and food before tomorrow evening. Play is obvious; I can see speed buttons, Choose person, and two mode buttons behind the opening card. I want to send people straight out.”

Visible: Roof 2 of 10; Meals 0 / 12; Storm Day 2 19:00; Select a villager, then tap a place.

**2026-10-20T14:58:16.998Z · 37.2 s**

Input: Play at 17s; tap Danyal at 25.6s; tap House at 29.8s

Reaction: “That is what I wanted: tap the man, tap the house. But he says later, draw water. I have given an order, yet I do not know when he will leave the well. The little destination cards keep moving as the map changes.”

Visible: Order given: Danyal → House; Danyal · Drawing water; House — Later: draw water; Cedar — Risk of injury · Review order.

**2026-10-20T14:58:29.854Z · 50 s**

Input: Opened Suggestion at 37.3s; Use suggestion at 43.6s; Confirm at 49s

Reaction: “The suggestion knows the builder, so I take it. Why did sending him need another whole order sheet? I can still read the roof, meals and storm. Fajr must mean that morning prayer he just mentioned; the order line itself does not explain the word.”

Visible: Yusuf → House; build the house · Later: after I pray Fajr; Not now. After I pray morning prayer.

**2026-10-20T14:59:20.312Z · 100.5 s**

Input: First minute checkpoint; no gameplay input; screenshot 09-first-minute.png

Reaction: “Checkpoint at 70.8 seconds, late from tool delay. I can read the goal, deadline and selected man. I have sent two men to the house, but their own water and prayer come first. I do not know how long those waits take. Roof has moved to three; that is reassuring.”

Visible: D1 08:05; Roof 3 of 10; Meals 2 / 12; Storm Day 2 19:00; Yusuf · Walking to House; Not now. After I drink at the well.

**2026-10-20T14:59:35.384Z · 115.6 s**

Input: Read Idris → Cedar suggestion; choose Use suggestion

Reaction: “Three timber at once sounds useful. It says he can get hurt, so I want to see what the review says before sending him. The suggestion card is faded but I can read it. The expiry line starts with lapses, which looks odd.”

Visible: Fast timber, but the cedar can hurt whoever fells it; lapses 09:00 · in 18 min.

**2026-10-20T14:59:43.419Z · 123.6 s**

Input: Confirm cedar at 124s; select visible 2× speed at 124s

Reaction: “I will take the timber risk. I have sent the builders and the woodcutter; now I want them to get on with it. I turn speed up because the pending suggestion slowed everything down.”

Visible: Idris → Cedar; fell the big cedar · Likely yes; risk of injury stated before confirmation.

**2026-10-20T15:00:19.478Z · 159.7 s**

Input: Watched at 2× until 146.3s; no other input

Reaction: “Ouch, Idris got hurt. I took that risk. But why does it say Classic when Human is selected? Is that my Idris? Send Idris home is a clear thing I can do, so I will.”

Visible: Roof 5 of 10; Meals 9 / 12; Hurt — Day 1 09:46 Idris (Classic), hurt at work; Human · decide selected; Send Idris home.

**2026-10-20T15:00:42.045Z · 182.2 s**

Input: Send Idris home at 159.8s; observed acknowledgement at 169.8s; open next Suggestion

Reaction: “He said alright and the injury card went away. Meals reached twelve, then dropped to eleven while people ate. So twelve is a stock to maintain, not a box I have finished. I would like a clean view of everyone getting on, but the order labels cover a lot of the village.”

Visible: Alright, I’ll do it; History (4); Meals 11 / 12; Roof 5 of 10.

**2026-10-20T15:01:03.454Z · 203.6 s**

Input: Keep watching at 191.4s; tap bare ground at 191.5s

Reaction: “I leave Maryam cooking; food is too close to the target. Tapping bare ground did not clear these order cards. I am starting to feel boxed in by all the later labels instead of watching my little team.”

Visible: Running · 16 min/s; Roof 5 of 10; Meals 13 / 12; order cards remain on map.

**2026-10-20T15:01:49.062Z · 249.2 s**

Input: Order options at 203.7s; Watch village at 212.7s; watched until 238.3s; open Suggestion

Reaction: “Watch village closes the sheet but leaves all the destination cards. I just want to see the workers. The roof got to seven, but meals are falling and another suggestion has slowed the clock. I am getting tired of clearing prompts just to let the team work.”

Visible: D1 18:48; Slow · 1 min/s · suggestion pending; Roof 7 of 10; Meals 8 / 12.

**2026-10-20T15:02:13.368Z · 273.5 s**

Input: Evening suggestion: Use at 255.8s; Confirm at 262.4s

Reaction: “I send Yusuf back for one more wall. Maghrib is not explained here. I can guess it is another prayer because he says Praying, but I do not know when that ends. At least I can see tomorrow at nineteen hundred is still the storm deadline while the order sheet is open.”

Visible: D1 19:12; Yusuf · Praying Maghrib; build the house · Later: after I pray Maghrib; Roof 7 of 10; Meals 8 / 12; Storm Day 2 19:00.

**2026-10-20T15:02:51.029Z · 311.2 s**

Input: STOP gameplay at 297.4s; final phone screenshot 28-night.png

Reaction: “I am done here. Roof eight, meals six, Yusuf asleep, and now Idris is hurt in a squall. This one says Human; the earlier injury said Classic. I do not feel sure which events I am managing. I wanted to send a team out and watch them work, and instead I keep opening suggestions and reading later cards. I would put the phone away now. I would not come back voluntarily in this lunch break form.”

Visible: D1 22:01; Roof 8 of 10; Meals 6 / 12; Storm Day 2 19:00; Yusuf · Asleep; Day 1 21:40 Idris (Human), hurt in the squall; Can’t: asleep.

**2026-10-20T15:03:16.203Z · 336.4 s**

Input: Required single desktop look after stopping: resized to 1280x800 at 311.3s; no gameplay input

Reaction: “Oh, there are two villages at once. Desktop actually says Each order goes to both villages. That explains the Classic and Human injury labels better than the phone did. I only learned this after quitting; it does not fix my phone confusion. Desktop also shows everyone must live until Day 3 05:00.”

Visible: Two side-by-side villages; Each order goes to both villages; Roof before the storm by D2 19:00; Storm stock by D2 19:00; Everyone lives by D3 05:00.

## Best, worst and leaving

**Best moment:** selecting Danyal on the map and tapping House, with “Order given: Danyal → House” at 29.8 s. That was quick and matched how I wanted to play. The roof later rising from two to three made the village feel productive. I did not establish which person's work caused that increase.

**Worst moment:** “Idris (Classic), hurt at work” while the phone showed Human · decide selected (`15-woodcutting.png`). I could respond, but I did not understand whose injury I was responding to. Later “Idris (Human), hurt in the squall” made the distinction more confusing before the desktop look.

**Frustration:** by 191.5 s, tapping bare ground had not cleared the destination cards. At 238.3 s I wanted to watch the team, but another pending suggestion had slowed the clock. “Watch village” closed the order sheet without removing the destination cards.

**Stop:** at 297.4 s, D1 22:01, roof 8/10, meals 6/12, Yusuf asleep, Idris hurt in the squall. I stopped because the repeated cards and suggestion handling were wearing on me. I did not finish the game or reach the session ceiling. I would not return voluntarily in this lunch-break form. The rain on Day 1 was called a squall; I did not establish whether it was related to tomorrow's storm.

## Clarity failures and limits of the evidence

- **DL-5 / DL-10 — I could not tell which village I was managing.** On the phone, the selected mode was “Human · decide,” but the injury said “Idris (Classic), hurt at work” (`15-woodcutting.png`, 146.3 s). Later it said “Idris (Human), hurt in the squall” (`28-night.png`, 297.4 s). Only the desktop look showed me “Each order goes to both villages” and both villages side by side (`29-desktop-after-stop.png`). I did not encounter that explanation on the phone. This is my observed comprehension failure, not a claim that no phone help contains it. DL-5's first-minute PASS remains the original checkpoint result; this confusion occurred later.
- **DL-8 — The order cards competed with the people I wanted to watch.** `20-clear-map.png` and `23-evening.png` show destination forecasts spread across the village, with lines through the scene. Tapping bare ground did not clear them. “Watch village” left the cards present. I could still act, but found following the team tiring.
- **DL-20 — The evening delay used an unexplained local term.** “build the house · Later: after I pray Maghrib” and “Yusuf · Praying Maghrib” (`26-maghrib-sheet.png`). I understood that he was praying; I could not tell which prayer/time the name meant. Earlier Fajr had a nearby bubble saying “morning prayer,” so I could infer that one. I did not open additional help to look up Maghrib.
- **DL-30 — A map answer was cut by the bar below it.** With Yusuf's order sheet open, the House card at the right showed “Later: after I pray” with the final “Fajr” line partly hidden by the “More places (7)” bar (`07-use.png`). The order sheet repeated the full answer, so I could still make that decision. The clipping was on the scene card, not the confirmation copy. In `11-cedar-suggestion.png`, the expiry line visibly began “lapses 09:00”; I could read the time, but cannot establish whether that word was intentionally written that way or a rendering defect.

These are observed phone issues. Brief screenshots immediately after some inputs caught transitional blank areas; later settled screenshots show the scene and sheet content. I do not count those transient frames as lasting missing content.

## Required language, layout and hands-on checks

| Item                            | Result from this session                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-20 English                   | **FAIL, bounded:** English goals and controls were usable. Maghrib's time-of-day meaning was not supplied in the order view I encountered. Fajr had nearby “morning prayer” wording. I did not test help lookup.                                                                                                                                                                                                                                                                                                             |
| DL-21 Dates                     | **PASS for deadlines encountered:** D1 19:12 and Storm Day 2 19:00 meant tomorrow evening, without translation. The desktop look additionally exposed “Everyone lives by D3 05:00”; the phone screens I used showed the storm deadline, not that later survival deadline. No month/year boundary or return after a break was tested.                                                                                                                                                                                         |
| DL-22 Phone response visibility | **PASS for reached responses:** Play, direct House order, suggestion actions, Confirm and Send Idris home were reachable without page scrolling. Roof, meals and storm deadline stayed visible. This does not establish every action or every layout.                                                                                                                                                                                                                                                                        |
| DL-30 Nothing cut off           | **FAIL:** the House scene card's final Fajr line was partly covered in `07-use.png`. The essential confirmation text itself was readable. No scrolling was used; no stacked sheets were encountered.                                                                                                                                                                                                                                                                                                                         |
| DL-31 State while ordering      | **PASS for reached sheets:** `26-maghrib-sheet.png` shows Roof 7 of 10, Meals 8 / 12, Storm Day 2 19:00 and Yusuf Praying Maghrib with his order sheet open. His figure remained visible in the small scene. The separate Day 3 survival deadline was only learned on desktop after stopping.                                                                                                                                                                                                                                |
| DL-32 Something for your hands  | **NOT TESTED as a forced lack of available acts.** The longest uninterrupted stretch without gameplay input after an order was about 35 s, from 262.4 to 297.4 s. I chose to watch and also spent time recording notes. I wanted to see the workers and influence progress, but I did not establish a stretch where no meaningful act was available: I could still select people, order destinations, handle suggestions or change speed. Watching and menu friction are my reactions, not proof of a forced-idle violation. |
| DL-33 Acts in the scene         | **PASS for the direct send route:** Danyal selection followed by tapping House issued an order without a form. Suggestion-based sending opened an order sheet and required Confirm. The cedar risk was stated before I confirmed it. I preferred the direct map route; I did not test doing a villager's physical work myself.                                                                                                                                                                                               |

Additional observations: **DL-13** orders were acknowledged and speech later answered them; I did not repeat uncertain inputs to test duplication. **DL-14** the cedar injury risk was clear before confirmation, so the injury was a known risk rather than a misleading promise. **DL-15** the selected 2× speed slowed for pending suggestions and returned to 16 min/s after confirmation/Keep watching. The evening suggestion remained open through roughly 13 s of inspection before confirmation. **DL-4 later limit:** “Can't: asleep” explained Yusuf's unavailable destinations at night; Cedar still showed “Risk of injury · Review order,” which I did not open for the sleeping Yusuf.

**NOT TESTED:** game ending (DL-12), reload/resume (DL-27), sending (DL-28, expressly excluded), export/replay (DL-29), text zoom and 320 px reflow, target-size measurement, builder checks, other help paths and interaction types not reached. No design exception is inferred.

## Required desktop look after stopping

At 1280×800, the two villages were visible together. The middle column said “Each order goes to both villages.” The top showed separate C/H roof and meal values, and “Everyone lives” until D3 05:00. This answered a question I had already quit with; it does not retroactively change the phone diary or first-minute checkpoint. No desktop gameplay input was made.

## Changes I would want as Kwame

1. Let me clear the destination cards and watch the people after sending an order. “Watch village” is where I expected that clean view.
2. Tell me on the phone that an order goes to both villages, especially when an injury comes from the village I am not viewing.
3. Let me send ordinary safe suggestions more quickly. Opening a suggestion, using it and then confirming it repeatedly feels like menu work. I understood the extra confirmation for the cedar injury risk.

## Evidence

Report: `../../../../scratch/patterns/retest/well2.md`.

Original diary: `(driver scratch)/retest/well2-shots/wall-clock.jsonl`.

Checkpoint written before continuing: `(driver scratch)/retest/well2-shots/first-minute.md`.

Screenshots: `(driver scratch)/retest/well2-shots/`, numbered `01-opening.png` through `29-desktop-after-stop.png` with descriptive names. Key frames are named above. No export was downloaded; no replay claim is made.
