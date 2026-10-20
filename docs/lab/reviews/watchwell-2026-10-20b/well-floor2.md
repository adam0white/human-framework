# Twice at the Well — Bram, continued exposure

## Session

Bram, 35, warehouse shift lead. I play Mini Motorways, RimWorld on PC and Bad North. I like giving quick orders and watching people carry them out. Curious, at home in the evening, phone in hand.

- URL: https://human.adamwhite.work/colony/
- Date: 2026-10-20. No build identifier was visibly available.
- Phone: 360×690 CSS px, touch emulation, light mode, default text size.
- Access: the supplied standard `npm run lab:play` driver, port 43608. No source, tests, implementation, prior reports or game logs were consulted. The two assigned instruction files were read. The brief itself was read. General skill guidance was read before the brief's restriction was known.
- Commitment: floor 15 real minutes; ceiling 25. Phone stop at driver elapsed 914.101 s, or 15:14. First playable screen was returned at 0.377 s.
- First run: default 1×, visibly 8 game minutes per real second. Suggestions automatically slowed it to 1 game minute per second. I chose ½× at 431.160 s, D2 16:06, to manage the deadline. I paused at 497.171 s, D2 19:30, because injury alerts changed before I could answer, and resumed at 513.872 s. The retry retained ½×, visibly 4 min/s. I never used 2×.
- First run ended at D3 05:00, returned at 671.147 s. I started a retry with Play again at 680.468 s and Play at 685.047 s. This was continued play within the same committed session, not a second cold first minute.
- After the phone stop, one 1280×800 desktop look at 920.157–920.352 s. No further gameplay choices. Driver PID 24325 was terminated with `kill 24325`; a subsequent process check found no such process.
- No run was sent, telemetry submitted, or consent changed. No playtest export was downloaded.

Evidence directory: `well-floor2-shots/`, beside this report. The driver wrote `well-floor2-shots/wall-clock.jsonl`; I did not read it back. The diary below preserves my reactions from the tool conversation. Times are driver reply elapsed seconds, rounded to three decimals where useful. A wait's reply time is after its stated real wait. These are not a transcription of unseen log timestamps. Logged game clocks sometimes name the preceding visible screen; a log operation returns a cached snapshot, so it does not establish a fresh game time.

**Protocol deviation:** I logged the mandatory first-minute note at 78.699 s, approximately 18 seconds late. A 20-second wait was launched, its pending command handle was not retained, and I then waited too long before writing the note. This is an instrumentation error. The first-minute table uses only observations reached before 60 seconds. Later learning does not change those judgments. No driver block occurred. Stale or disappearing control names produced several game-state errors; I used the fresh controls and continued.

## First minute

Original checkpoint note, verbatim, at 78.699 s:

> I need a roof and twelve stored meals before Day 2 at 19:00. I can choose a worker and tap a labelled place. Human is the selected map. Roof and food draw me first; the deadline is clear. Maryam says she would refuse because the others would go unfed; Yusuf said after prayer and then on it. My first order to Yusuf at the house produced one roof course. The state strip stays visible above his answer sheet, but Ask again and Cancel order were partly behind Watch village in the small sheet. I can act, and I want to get more workers building.

| Item | Status | Evidence reached within 60 s |
|---|---|---|
| DL-1 A reason to act | PASS | I needed a roof, 12 meals and everyone alive before the storm. The opening said this directly. |
| DL-2 What can I touch | PASS for controls tried | Play, the speed buttons and Choose person looked tappable. I used Play, Choose person, Maryam, Order options, Worker, Yusuf, a House label, the latest-order control and Watch village. Maryam had a distinct selected label in `02-maryam-selected.png`. I tried no inert decoration in this minute. Direct selection of an unselected person on the moving map was not established. |
| DL-3 Urgency and selection | PASS | Roof and meals drew me first. The strip said Storm Day 2 19:00. Human was visibly selected; Maryam, then Yusuf, had a highlighted label. There was no injury alert yet. |
| DL-4 Why the limit | PASS for the encountered prayer delay; partial evidence for the cook's refusal | Yusuf's House label said “Later: after I pray Fajr.” The order then changed to “on it.” Maryam's label said “Will refuse: the others would go unfed.” I understood why she would stay cooking; I had not established exactly what would free her for another job. Confirm said to choose a worker/place first when those were missing. |
| DL-5 Readable situation | PASS | I could choose a person, give a place order, inspect the answer or watch. “Order given to both villages: Yusuf → House” acknowledged the order. At 40.296 s, the roof reached 3 and the latest order said “Laid another course; House 3 of 10, work remains.” |
| DL-6 A choice soon | PASS | Village variants were present by the 3.624 s screenshot. Worker choices were available at 9.356 s. First input: Play at 6.842 s. First worker input: Maryam at 12.735 s. First submitted work order: House for Yusuf at 26.901 s. The opening had about 20 instruction words before the village choices and Play. |
| DL-7 Learn by doing | PASS for the interactions reached | Selecting Maryam exposed contextual place responses. Changing to Yusuf exposed his prayer delay. A House tap issued the order directly; his reply and the roof course taught me that a delayed order could execute. It did not yet teach me that another course required another order. Reached: worker selection, worker change through the sheet, place ordering, latest-order inspection and returning to the village. Seven other interaction types were NOT TESTED in this minute: Rush, hazardous-order review, suggestion resolution, History, panel sizing, Game menu and speed changes. |

The first-minute phone screenshot at 36.632 s also showed Ask again and Cancel order partly behind Watch village. That is a layout finding, not a failure to understand the basic order.

## Outcomes and experience

The best stretch was the storm response at 490–548 s, especially 543.601 s: Maryam's latest order said “Ate a meal; now Sheltering.” I had a named person to protect and a visible answer. Engagement reached 4. The end report at 671–680 s produced another high point: everyone survived, the roof missed by one stage, and I wanted a retry.

The worst moment was 590–599 s. History said Home only asks them to eat once and does not keep them indoors. I had used “Send Idris home” and “Send Maryam home” under injury alerts to try to shelter them. The explanation changed what I thought those buttons did.

| Elapsed | Event | Reason / engagement | Original wording |
|---|---|---|---|
| 179.827 s, 3:00 | Pulse | 3/5 | The roof is moving and I care whether they make it, but most of this is already being handled without my orders. |
| 363.429 s, 6:03 | Pulse | 3/5 | Getting timber and seeing another roof course keeps me involved; fighting the little sheet takes attention away from the crew. |
| 548.058 s, 9:08 | Pulse | 4/5 | The storm made this matter: I am trying to keep named people safe, and Maryam now says Sheltering. I want to get the rest through it. |
| 598.751 s, 9:59 | want_quit | FRUSTRATED | I would put this down here. I was trying to shelter hurt workers, but the alert sent an eat-once order. I still want to see whether they survive, so I will keep going. |
| 723.086 s, 12:03 | Pulse | 4/5 | The near miss and the end report made me want a retry. I am watching for finished orders now, rather than just waiting for the goal strip to rise. |
| 836.622 s, 13:57 | want_quit | FRUSTRATED | I would put the phone down again now. I can see Ask again after scrolling, but the actual cedar answer and trust explanation are above the tiny visible body. I want to give orders and read people, not keep resizing and scrolling the same sheet. |
| 914.038 s, 15:14 | Pulse | 2/5 | I still like the little crew and the near miss, but the panel work has worn me down. I would leave it running and put the phone down. |
| 914.101 s, 15:14 | Stop | FRUSTRATED | Stopping this phone session. I would leave the village running, not keep managing the short sheets tonight. The end report got me to retry, but the same reading problem brought the wish to leave back. |

**Hard, but kept going:** Yes. I changed to ½× to manage the last roof stage and deadline. I paused when live injury controls changed too quickly to answer. I looked for Fit panel, then Full panel, to read warnings and replies. I kept playing through those difficulties. The roof near miss made me restart voluntarily. On the retry I knowingly accepted the cedar injury risk because an unfinished roof had also hurt people. The injury itself was an accepted risk, not evidence that the difficulty should be removed.

First run's visible end report:

| Goal / result | Classic | Human | Solo shown by the game |
|---|---:|---:|---:|
| Roof at D2 19:00 | 10/10, met | 9/10, failed | 9/10, failed |
| Storm stock at D2 19:00 | 12, met | 16, met | 16, met |
| Everyone lives at D3 05:00 | 6/6, met | 6/6, met | 6/6, met |
| Meals at dawn | 0 | 4 | 3 |
| Injuries over run | 2 | 9 | 5 |

The report said the next Human roof stage was 29% done. It said the 12 orders changed stored meals from 3 to 4 and injuries from 5 to 9. These are the game's displayed comparisons; I did not reproduce its counterfactual or validate its suggested winning sequence. The visible ending was clear: Ended, Day 3 dawn, goal judgments, Play again and Another day.

## Clarity findings

| ID | Status | What I saw / evidence |
|---|---|---|
| DL-22 | FAIL | A reachable action did not mean its essential warning was visible. In `05-cedar-suggestion.png`, the sheet showed the cedar proposal but the safety sentence began under the bottom action row. In `08-fit-suggestion.png`, after Fit panel, almost none of the suggestion body was on screen while Send order remained at the bottom. The driver text exposed more than the screenshot. |
| DL-30 | FAIL | `04-order-answer.png`: Ask again and Cancel order were partly covered by Watch village. `05-cedar-suggestion.png`: the essential “Fast timber, but the cedar can hurt whoever fells it.” was cut by the bottom row. `12-full-cedar-order.png`: even after choosing Full panel, the Worker/Place/Rush row was partly under the header and the injury-warning sentence was absent from the visible body. `13-idris-answer-scrolled.png`: scrolling exposed Ask again, but the top of “Recent trust change · D1 10:31 · Idris trusts…” was clipped under the sheet header. The actual cedar outcome was readable on a scene bubble; its full answer and context were not together in the sheet. |
| DL-19, DL-10 | FAIL | Under a Hurt alert, “Send Idris home” suggested moving him to safety. The preview called Home “eat.” History later said: “Home asks them to eat once. After eating, they choose their own work again; it does not keep them indoors.” The button's immediate injury context and the actual eat-once order did not convey the same act to me. See 227.968 s, 507.074 s, 590.926 s, and `10-home-history.png`. |
| DL-15 | FAIL for the live injury response; suggestion slowdown worked | At 1×, suggestions visibly slowed to 1 min/s and left time to read/respond. During the storm at ½×, Maryam's alert became Yusuf's before my tap landed: 490.413 to 493.385 s, just under 3 real seconds. The latest alert then became Classic Yusuf by the pause at 497.171 s. I could pause, but a prompt offering an immediate response did not itself give me time to use that response through this driver. This is partly the slower action rate of a text-driven tester; it is not evidence of a failed driver. |
| DL-7, later task duration | Clarity concern after the checkpoint | “Build the house” initially sounded like a continuing assignment. “Laid another course; … work remains” showed progress but I still waited for more. At 424–427 s I inferred one course per order and used Ask again. The end report finally said “One order at dawn is not enough: orders end.” This concern does not retroactively change the first-minute PASS for learning selection and ordering. |
| DL-12 | PASS | At D3 05:00, Ended and the dawn report clearly marked the end and judged each goal. I did not need to wait at high speed to find an ending. |
| DL-13 | PASS for accepted orders reached | Inputs showed “Order given to both villages,” then waiting/later/on it, then a result. Delays were not immediately presented as finished work. The latest-order view and History preserved outcomes. |

The accidental map tap at 98.210 s is recorded as my error, not proof of an inert or mislabelled control. I used a position from a previous screenshot; the scene layout had changed. It issued Yusuf → Kitchen when I meant to select Tariq. I restored Yusuf's House order. The driver also exposed complete text outside a sheet's visible viewport; this limited how closely some decisions resembled a person reading only the phone. I corrected one diary claim about seeing a warning once I inspected the screenshot.

## English, dates, phone state and hands-on play

| Item | Status | Observed result |
|---|---|---|
| DL-20 English | PASS for action-critical text reached | I could order work in English. House, Forest, Kitchen, Later, Will refuse, injury and trust warnings were understandable. Fajr/Maghrib occurred in “after I pray …”; I could understand the delay without translating the prayer name. Masjid was a named place; using it was not required to pursue the roof/food goals. I did not open every help entry. |
| DL-21 Dates | PASS for relative days reached | Today was D1 or D2 with a 24-hour time. Storm Day 2 19:00 was comparable without translation. Suggestion expiry also showed a time and remaining minutes. After midnight the day changed to D2/D3. Cross-month/year dates were NOT TESTED because none occurred. |
| DL-22 Response visibility | FAIL | Warnings and suggestion context were hidden in the phone sheets even while bottom actions were visible. See images 05, 08 and 12. |
| DL-30 Cut text | FAIL | Buttons and essential text were cut by fixed sheet boundaries/header/action rows. See images 04, 05, 12 and 13. No stacked sheets were observed. |
| DL-31 State while acting | PASS for tested phone order/answer sheets | `04-order-answer.png` showed Roof 2/10, Meals 0/12 and Storm Day 2 19:00 above Yusuf's answer. `12-full-cedar-order.png` showed Roof 3/10, Meals 6/12 and the deadline above Idris's order; the selected Idris remained visible in the forest. The answer body could fail while the state strip stayed readable. The expanded goal paragraph used more map space, but still displayed its progress and deadline. |
| DL-32 Only watching | NOT TESTED as a forced lack of acts | My longest deliberate quiet periods were roughly 70 seconds of real nighttime waiting, at 242–311 s and 602–671 s. I wanted daylight and chose to let sleeping workers rest. I did not establish that every meaningful action was unavailable; orders, inspection and speed controls remained. I wanted the last roof stage at 424 s and could Ask again. I therefore cannot call those waits a forced agency gap. |
| DL-33 Acting on things | PASS for ordinary order path; mixed experience | Selecting a worker exposed place labels, and tapping House issued an order directly without a confirmation form. Cedar used a review/Confirm step for its injury risk. I used the list-based Order options path when I could not confidently pick a moving person, so some ordinary orders took Worker → Place → Confirm. The direct path existed and worked for the first House order and the retry Danyal order. |

Other checks not reached: reload/resume (DL-27), send/retry (DL-28, explicitly unauthorized), export/replay (DL-29), changed text size/320 px width and other themes (DL-25), measured target dimensions (DL-23), and builder-only simulation/source checks. No source-level exception was inferred.

### The single desktop look after stopping

`14-desktop-after-stop.png`, 1280×800, 920.352 s. The middle column displayed the cedar outcome, prior reply, trust change, worker/place controls and actions together. Both villages were visible. The top goal strip was partly covered by the village panels and middle content: Roof before the storm / Storm stock / Everyone lives were not cleanly separated from the panels. This is one post-stop screenshot, not a desktop playtest. It cannot establish how order sheets behave after desktop interaction.

## Verbatim diary

Each quoted reaction below is the original wording. Important visible answers are included after the quote. Pulse, want_quit and stop wording is also preserved in the table above. “R2” means the retry. Some failed named taps were caused by a live label changing; these were not driver blocks.

| Elapsed s | Input / visible game time | Original reaction; important visible answer |
|---:|---|---|
| 0.377 | open | “I am looking for people to put to work and whatever is threatening the place.” Opening: roof, 12 meals, everyone alive before storm; select villager then place. |
| 3.624 | shot 01 / D1 05:00 | “Play, the speed buttons and Choose person look tappable. The roof and meals strip also has a button outline in the control list; I want to see it.” |
| 6.842 | Play / D1 05:00 | “Roof and twelve meals before tomorrow evening. I will start with people and materials.” Running, 8 min/s. |
| 9.356 | Choose person / D1 05:20 | “I expect a short list of workers, then a job site.” Six worker names; Confirm disabled until worker/place chosen. |
| 12.735 | Maryam / D1 05:32 | “Maryam is first; I want to see what she can do.” Maryam Cooking; House/Forest will refuse because others would go unfed. |
| 15.519 | shot 02 / D1 05:35 | “She is already cooking and would refuse a roof job because people need food. That is useful; I should leave her on it.” |
| 19.018 | Order options · Maryam / D1 05:38 | “I need another worker. Order options is the only person control I can see.” |
| 21.762 | Worker · Maryam / D1 05:41 | “Changing the worker from this sheet.” |
| 24.214 | Yusuf / D1 05:43 | “Try Yusuf for the house.” Walking to Masjid; House later after Fajr. |
| 26.901 | House Later: after I pray Fajr / D1 05:47 | “Later sounds like an order he will pick up after prayer. I will queue the roof.” Order given to both; latest order later after prayer. |
| 30.216 | shot 03 / D1 06:13 | “That was quick: the order is acknowledged as later rather than pretending he started. Now I want to see him actually build.” Reply changed to on it; meals 4. |
| 32.878 | Yusuf latest order / D1 06:34 | “On it changed by itself. I want the actual answer.” “Alright, I'll do it.” |
| 36.632 | shot 04 / D1 07:04 | “The roof, meals and storm deadline stay above the answer sheet. Good, I can keep an eye on them.” |
| 40.296 | Watch village / D1 07:34 | “I will watch whether the roof moves. Food got eaten as fast as it appeared.” Roof 3; laid another course; work remains. |
| after 40.296 | wait 20 / preceding D1 07:34 | “He laid one course. I am giving him a bit of room to finish more rather than interrupting.” The pending command's final response was not retained in the conversation. |
| 78.699 | first_minute note | Original checkpoint preserved above. Cached scene D1 08:20, roof 3, meals 6, suggestion pending. |
| 85.796 | Suggestion / D1 08:42 | “The game has slowed itself for something. I want to hear the suggestion.” Idris → Cedar, three timber, injury warning, lapses 09:00. |
| 88.763 | shot 05 / D1 08:45 | “Three timber is tempting, but an injury on day one sounds avoidable. I would rather keep the regular forest worker going.” |
| 94.110 | Skip suggestion / D1 08:51 | “No need to risk Idris for a shortcut yet.” |
| 98.210 | tap 300,448 / D1 09:24 | “I can see Tariq beside the house. I will tap him directly rather than use the worker list again.” Actual answer: Yusuf → Kitchen, later when store runs low. |
| 102.903 | note / D1 09:24 | “Oops. I tapped where Tariq was on the last picture and sent Yusuf to Kitchen instead. I did not mean that. I need a fresh view before another map tap.” |
| 103.121 | Order options · Yusuf / D1 10:03 | “Put the roof order back before I make more of a mess.” |
| 107.256 | Place · Choose / D1 10:36 | “Choose House explicitly this time.” |
| 112.642 | House / D1 10:49 | “The house is the priority.” |
| 115.041 | Confirm / D1 10:51 | “Give the roof job back to Yusuf.” Waiting, then on it. |
| 119.643 | Suggestion / D1 10:56 | “Another prompt is slowing things down; what is it this time?” Maryam → Forest, will refuse, insisting may cost trust. |
| 124.429 | Skip suggestion / D1 11:01 | “Why suggest moving the cook when it already says she will refuse? I am keeping her on meals.” |
| 124.646 | state strip / D1 11:03 | “The roof needs materials. I want the village stock picture before assigning more people.” Expanded paragraph repeated roof, meals and deadline. |
| 129.425 | old state-strip name / D1 11:41 | “That repeats the goals, not the timber stock. Close the extra text.” Name changed; no tap accepted. |
| 129.629 | shot 06 / D1 11:43 | “Looking for Idris at the forest and a way to give another roof order.” |
| 135.064 | fresh state-strip name / D1 12:26 | “The counters changed while I was reading. Collapse the current strip.” Meals changed again; old name no longer on page. |
| 135.280 | Order options · Yusuf / D1 12:28 | “I am using the list to avoid another accidental order.” |
| 140.595 | Worker · Yusuf / D1 13:11 | “Find Tariq from the list.” |
| 140.778 | Tariq / D1 13:12 | “Tariq was beside the house. What is he doing?” Walking to House; roof 6, meals 12. |
| 177.388 | wait 30 / D1 18:05 | “Tariq is already headed to the house. I will leave the crew to work and see how much happens without me.” Roof 7, meals 11; already building. |
| 179.827 | pulse | Verbatim pulse above. |
| 183.959 | Classic · obey / D1 18:29 | “Every order went to two villages. I want to see whether the obeying one is doing better.” Classic roof 8, meals 8. |
| 187.199 | Suggestion / D1 18:32 | “Classic has a little more roof and less food. What choice has arrived?” Send Yusuf back to house before dark. |
| 189.711 | Send order / D1 18:35 | “Yes. One more course before dark sounds worth asking.” |
| 222.978 | wait 30 / D1 21:45 | “I have given the extra order. Watching dusk settle and hoping it buys us a course.” Classic roof 9; Idris Human hurt in squall. |
| 227.968 | Send Idris home / D1 21:50 | “Idris is hurt. Get him home now; timber can wait.” Home order waiting. |
| 231.102 | Show Idris / D1 21:53 | “Switch to him. I want to know whether he is actually safe.” Human roof 7, meals 6; Home on it. |
| 235.105 | shot 07 / D1 21:57 | “I thought the storm was tomorrow. This says squall, so maybe that is separate, but it caught me by surprise.” |
| 238.471 | Suggestion / D1 22:01 | “I sent him home. What else is still holding the clock slow?” Night timber proposal for Tariq; warning about squall/trust. |
| 241.521 | Skip suggestion / D1 22:05 | “No. One injured worker is enough. They can sleep through this squall.” |
| 275.306 | wait 30 / D2 02:35 | “Letting the night pass at the normal speed. I want to see Idris rest and the crew come back in daylight.” Home: can't — I'm asleep. |
| 281.125 | note / D2 02:35 | “Home: can’t — I’m asleep is an odd answer to an order to go home. I cannot tell whether he got there before sleeping. I am not going to wake him to find out.” |
| 311.299 | wait 30 / D2 07:02 | “Still letting them sleep. Tomorrow needs three roof stages and another six meals.” |
| 313.962 | Suggestion / D2 07:05 | “Morning. Tell me what needs doing while there is daylight.” Tariq daytime forest proposal; rested, usual small slip risk. |
| 316.672 | More / D2 07:08 | “The safety explanation is below the small sheet. Open it so I can actually read before sending him.” Village actions and panel sizes appeared. |
| 320.004 | Fit panel / D2 07:11 | “Fit panel sounds like what I want: enough room for the words.” |
| 324.150 | Suggestion / D2 07:15 | “Back to the timber suggestion after changing panel size.” |
| 326.384 | shot 08 / D2 07:17 | “Checking whether Fit panel made the full warning visible.” |
| 329.502 | Send order / D2 07:21 | “He is rested and timber is short. Send Tariq in daylight.” Later after meal. |
| 359.475 | wait 25 / D2 09:17 | “Tariq will eat first, which makes sense. Waiting for his timber and the last roof work.” Roof 8, meals 8; brought timber. |
| 363.429 | pulse | Verbatim pulse above. |
| 363.633 | Suggestion / D2 09:21 | “What is the next useful request?” Samira → House, will refuse busy with own work. |
| 367.580 | Skip suggestion / D2 09:26 | “Samira is on food and we only have eight meals. I am leaving her there.” |
| 371.211 | tap 165,80 / D2 09:33 | “Close the repeated goal paragraph to get more map space.” Collapsed. |
| 373.748 | Suggestion / D2 09:35 | “Another one already? I want to finish this roof.” Danyal → House; well can wait an hour. |
| 377.165 | Review order / D2 09:39 | “Borrowing the water carrier for the last roof stages sounds practical. Check his answer.” Rush selected; faster, hungrier. |
| 380.963 | Rush off / D2 09:42 | “Rush is already selected by this suggestion. We are short on meals, so use the normal pace.” Later after meal. |
| 383.597 | Confirm / D2 09:46 | “Eat first, then help with the roof.” |
| 418.231 | wait 30 / D2 14:23 | “Now I have timber coming and extra hands on the roof. I want to let that plan work.” Roof still 8, meals 9. Danyal laid a course at 11:18. |
| 424.243 | Danyal latest order / D2 15:11 | “Roof is still eight. Did he stop after one course? I need him to keep going.” Completed course; Cancel order disabled. |
| 426.911 | Ask again / D2 15:32 | “One course per order, apparently. Ask for another while there is time.” On it. |
| 431.160 | ½× / D2 16:06 | “I am slowing to half speed so I can arrange the last roof work before 19:00.” Roof 9. |
| 435.435 | Danyal speech bubble / D2 16:23 | “Select him again to see the house action directly.” Bubble gone; no tap accepted. |
| 438.394 | Order options · Danyal / D2 16:31 | “The speech bubble has gone. Use the stable order button.” |
| 443.194 | Place · Choose / D2 16:36 | “Pick House again; I do not know whether this is a continuing job or a single course.” Danyal: Not that — I'll cook a pot. |
| 447.945 | House / D2 16:40 | “See whether he will finish the last course.” Later: cook a pot. |
| 450.959 | Confirm / D2 16:43 | “Fine, cook first; we need the food too. Then roof.” |
| 454.294 | Suggestion / D2 16:47 | “We have just over two hours. What is the proposal?” Maryam cook before storm; nobody can cook 19:00–03:00. |
| 456.992 | Send order / D2 16:50 | “Yes. Put food by before the fire goes out.” Meals reached 12; Maryam later when store runs low. |
| 485.691 | wait 25 / D2 18:44 | “Twelve meals at last. Waiting at half speed to see if the last roof course lands before the weather.” Roof 9, meals 17; pot cooked. |
| 490.413 | shot 09 / D2 19:03 | “Food is safe but I have left one roof course unfinished. I want to see what the storm actually does.” Maryam hurt in storm, out in open. |
| 493.385 | Send Maryam home / D2 19:15 | “Get Maryam inside. I did not realise cooking left her out in the open for the storm.” Alert had changed to Yusuf; no Maryam order issued by this tap. |
| 497.171 | Pause / D2 19:30 | “The hurt alert swapped from Maryam to Yusuf before my tap landed. I am pausing to read and send people home.” Alert now Classic Yusuf. |
| 501.858 | Order options · Maryam / paused | “Maryam first. I will send her to shelter through the place list.” |
| 504.623 | Place · Choose / paused | “Find the shelter.” |
| 507.074 | Home / paused | “Home should get her out of the open.” Preview: eat · Likely yes. |
| 510.406 | Confirm / paused | “The Home order says eat, not shelter. I will try it because the hurt alert also called it home.” |
| 513.872 | Resume / D2 19:30 | “Resume at half speed so Maryam can carry out the order.” |
| 543.601 | wait 25 / D2 21:29 | “I have ordered Maryam home. Waiting to see the answer and whether the injuries settle.” Ate meal, now Sheltering. Idris hurt outside. |
| 548.058 | pulse | Verbatim pulse above. |
| 548.255 | Send Idris home / D2 21:48 | “Idris is outside hurt again. Send him home as well.” |
| 585.661 | wait 30 / D3 00:17 | “Maryam is sheltering and Idris has a home order. Letting the worst of the storm pass.” Idris ate, now asleep. |
| 590.926 | History / D3 00:38 | “The deadline passed without an ending. I want to see what my orders actually achieved.” History explained Home does not keep people indoors. |
| 595.029 | shot 10 / D3 00:55 | “History says Home asks them to eat once and does not keep them indoors. Then Send Idris home was not a shelter order at all. That is exactly what I needed to know before the storm.” |
| 598.751 | want_quit | Verbatim FRUSTRATED line above. |
| 602.289 | Watch village / D3 01:24 | “Close history. I want to get through the night and finish the roof in daylight.” |
| 636.817 | wait 30 / D3 03:42 | “Watching until daylight. I have not found an order that keeps them sheltered.” Weather history appeared. |
| 671.147 | wait 30 / D3 05:00 | “The storm has moved into Weather history. I am waiting for the workers to wake rather than sending another order into their sleep.” Ended; final report. |
| 676.642 | shot 11 / ended | “Everyone lived. Human missed the roof by one course; Classic finished. The report says my orders added injuries and only one stored meal. That stings. It also finally says orders end. I want one retry now that I know that.” |
| 680.468 | Play again | “Try the same situation again. This time I will give repeat house orders earlier instead of assuming they keep building.” Opening returned. |
| 685.047 | Play / R2 D1 05:00 | “Keep the same village. Leave half speed on so I can actually direct several people.” |
| 690.800 | Choose person / R2 D1 05:23 | “Start with Yusuf for the house again.” |
| 693.600 | Yusuf / R2 D1 05:31 | “Yusuf on the house, then watch for completion.” |
| 696.550 | House / R2 D1 05:34 | “Give the order and let him pray first.” Later after Fajr. |
| 719.779 | wait 20 / R2 D1 07:07 | “Waiting for the first course so I can ask again as soon as that order ends.” On it. |
| 723.086 | pulse | Verbatim pulse above. |
| 729.209 | old latest-order name / R2 D1 07:44 | “Check whether the first course is complete yet.” Label had changed to completed course; no tap accepted. |
| 732.265 | current latest order / R2 D1 07:57 | “Now it is complete. Open the current answer.” Roof 3; trust reduced, hurt by building order. |
| 735.733 | Ask again / R2 D1 08:02 | “He trusts me less because the building order hurt him. I still need the roof; ask again and see if he agrees.” |
| 738.716 | Suggestion / R2 D1 08:05 | “Resolve the suggestion so the crew can get on with it.” Cedar proposal. |
| 742.500 | Review order / R2 D1 08:09 | “This time I will consider the cedar. Missing the roof also hurt people, and three timber could buy the last stages.” |
| 746.464 | More / R2 D1 08:13 | “I want the full warning visible before confirming the risky job.” |
| 749.032 | Full panel / R2 D1 08:16 | “Use the biggest panel this time.” Full panel pressed. |
| 751.681 | Back / R2 D1 08:18 | “Return to the cedar order.” |
| 754.886 | shot 12 / R2 D1 08:21 | “This should be the full panel. I want the roof and deadline alongside the injury warning.” |
| 758.449 | Confirm / R2 D1 08:25 | “Take the cedar risk. I can see the warning now, with the goal strip still above it.” This visual claim was wrong; corrected immediately below. |
| 762.634 | correction note / R2 D1 08:25 | “Correction: the driver text included the cedar warning, but the screenshot did not show it. Full panel still had a short body; even Worker and Place were partly hidden under the header. I confirmed using the text reply, not a fully readable phone warning.” |
| 767.782 | Order options · Idris / R2 D1 09:03 | “While Idris takes the cedar, borrow Danyal for the house.” |
| 771.427 | Worker · Idris / R2 D1 09:17 | “Choose the water carrier.” Classic Idris hurt at work. |
| 774.331 | Danyal / R2 D1 09:29 | “Classic Idris got hurt at work after that risk. I am keeping Human Idris on his order and asking Danyal for a course.” Resting. |
| 777.097 | House / R2 D1 09:40 | “Rest first, then a roof course. There is still a day to work.” Later after rest. |
| 812.933 | wait 30 / R2 D1 11:04 | “Letting those two orders run. I am watching for another finished course rather than opening more menus.” Roof 5; Human Idris hurt at work. |
| 820.231 | Show Idris / R2 D1 11:11 | “The cedar risk happened. I want to see him, but I am not mistaking Home for a shelter command this time.” Latest: felled cedar, it came down on my leg. |
| 823.613 | Idris latest order / R2 D1 11:15 | “Read his answer. He did fell it, so the risk was real rather than just a refusal.” Trust lower; went badly, the cedar. |
| 827.978 | inner scroll +220 / R2 D1 11:19 | “Trying to read the answer and trust change inside this short sheet.” |
| 832.017 | shot 13 / R2 D1 11:23 | “I want to read his whole answer without managing panel sizes. The people and the choices interest me more than this sheet does.” |
| 836.622 | want_quit | Verbatim FRUSTRATED line above. |
| 841.228 | Watch village / R2 D1 11:32 | “Leave the answer sheet and let them work for a while.” |
| 845.480 | Suggestion / R2 D1 11:37 | “Clear the pending choice before I sit back.” Maryam → Forest, will refuse. |
| 848.424 | Skip suggestion / R2 D1 11:40 | “Still not moving the cook to timber. Leave her on meals.” Roof 6; Classic Danyal hurt at work. |
| 881.705 | wait 30 / R2 D1 13:53 | “The roof is six now, earlier than my first try. I will watch the workers without another form for a bit.” |
| 908.893 | wait 20 / R2 D1 15:42 | “I would leave this running now rather than keep giving orders through the short panels. Watching a little longer.” Roof 7, meals 6. |
| 914.038 | pulse | Verbatim pulse above. |
| 914.101 | stop | Verbatim FRUSTRATED line above. |
| 920.157 | resize 1280×800 / post-stop R2 D1 16:27 | “Required post-stop desktop look; no more gameplay decisions.” |
| 920.352 | shot 14 / post-stop R2 D1 16:28 | “One desktop view after stopping.” |

## Stop and return

I stopped on the retry after the last refreshed phone view showed D1 15:42, roof 7/10, meals 6/12 and Idris's completed cedar order. The log's stop response reused that snapshot; the game continued while I logged the stop. The post-stop desktop view was D1 16:28. I did not finish the retry.

Final reason: **FRUSTRATED**. The first wish to leave passed temporarily: everyone surviving and the one-stage miss made me retry. It did not disappear permanently. Reading the same short sheets brought the wish back. I would leave the village running and put the phone down that evening. I would return voluntarily to try the roof again, probably on desktop, because the near miss still interests me. That desktop preference is an intention, not a tested claim that desktop solves all the layout problems.

## Up to three changes I want as Bram

1. Let me read the full immediate warning or reply beside the action without resizing and scrolling a tiny body. Keep the roof, food and deadline strip visible.
2. Tell me that the injury alert's Home action means eat once and does not hold someone in shelter before I issue it. I want to know what act I am ordering.
3. Make the end of a one-course House order clear while I am playing. I want to issue the next course promptly instead of waiting for a crew assignment that has already ended.
