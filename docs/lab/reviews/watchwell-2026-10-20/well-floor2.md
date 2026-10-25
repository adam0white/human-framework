# Twice at the Well — Bram, continued exposure

Bram, 35, warehouse shift lead. I play Mini Motorways, RimWorld on PC and Bad North. I like giving quick orders and watching people carry them out. Curious, evening at home, phone in hand.

- URL: https://human.adamwhite.work/colony/
- Build: no version or build identifier visibly encountered.
- Device: 360×690 CSS px, touch emulation, light mode, default text size. One 1280×800 look after stopping.
- Access: supplied `npm run lab:play` driver, port 43514, one persistent page. No source, tests, earlier reports or internal state inspected. The only log read for this report was this session's driver-generated wall-clock diary.
- Timing: floor 15 real minutes; ceiling 25. First usable screen at driver elapsed 0.425 s. Final stop at 913.490 s: **15 min 13 s**. First run ended at approximately 10:55 elapsed; I read the result and began a retry at 11:35. The retry was unfinished when I stopped.
- Speed: default 1× (8 game min/s); changed to ½× at 4:29 because choosing people was consuming the morning; returned to 1× at 10:10 to pass the night. Suggestions automatically slowed time to 1 game min/s. I used real waits of no more than 30 seconds. The game advanced between browser operations; I did not find a frozen-time harness limitation.
- No run sent or manually submitted telemetry. Consent settings were not changed. No export downloaded. Driver PID 61469 was terminated by exact PID after the desktop look.

## First minute

The driver captured `first-minute.png` at 60.053 s. **My written checkpoint was late, at 68.806 s**, rather than at 60 s. This is a protocol deviation. The checkpoint is preserved below without rewriting it. The table uses only the first-minute interactions and the automatic screenshot; later learning does not improve a status. In particular, the screenshot at 60 s says Idris's kitchen order is “later, when the store runs low”; the later “on it” reply cannot establish a first-minute pass.

Original checkpoint:

> I need ten roof parts and twelve meals before Day 2 at 19:00. Play, speed, village tabs, the bottom order controls and place cards look tappable; tapping Idris name on the map did not select him. The top goals draw me first; Idris is now selected, though I mostly know that from Order options. Yusuf waited for prayer then agreed to the house, so later is a real answer. Idris was busy with his own timber work; I could not tell when that would free him. I can give place orders and respond to a suggestion. A real person/place choice was available after Play at about seven seconds, first worker selection at twelve seconds, first work order at sixteen. I learned by ordering Yusuf, ordering Idris and declining one risky cedar suggestion. Confirm was disabled before choosing a place. I used no help. Roof and meals stay visible above the suggestion; the scene gets small. I am curious whether my orders actually improve the village.

| Item                       | Status                        | First-minute evidence                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 A reason to act       | PASS                          | I needed a finished roof, twelve meals and living villagers before the storm. Opening text: “Roof the house, store 12 meals and keep everyone alive before the storm.”                                                                                                                                                                                                                                     |
| DL-2 What can I touch      | FAIL, limited observation     | I named Play, speed, village tabs, bottom order controls and place cards as tappable. At 0:23 I tapped the apparent Idris name position from the preceding screenshot; Yusuf remained selected. This establishes a failed selection attempt, not that every name label is inert: people move and the screenshot was several seconds old. The named worker chooser worked.                                  |
| DL-3 Urgency and selection | PASS                          | Roof, meals and storm deadline drew me first. Human was outlined as the selected village; Idris had a highlighted label and “Order options · Idris.” The pending suggestion also drew attention and slowed time.                                                                                                                                                                                           |
| DL-4 Why the limit         | FAIL, partial                 | “Later: after I pray Fajr” explained Yusuf's delay and he subsequently agreed. “Will refuse: busy with own work” explained Idris's current objection, but I could not tell when that work would end or what would change his answer. Confirm was disabled before a place was chosen; the surrounding instruction said to choose a place. Builder checks NOT TESTED.                                        |
| DL-5 Readable situation    | PASS                          | I could issue a person/place order or hear a suggestion. Idris was gathering timber; the kitchen request later waited for the store to run low. Roof, meals and the storm deadline stayed visible.                                                                                                                                                                                                         |
| DL-6 A choice soon         | PASS                          | Person/place choices were available after Play at 6.959 s, before long mandatory text. First input: Play at 6.959 s; first worker selection: Yusuf at 12.356 s; first consequential work order: House at 16.311 s. The opening had about 22 essential words before Play.                                                                                                                                   |
| DL-7 Learn by doing        | PASS for reached interactions | Three consequential choices reached: Yusuf to House; skip the risky cedar suggestion; Idris to Kitchen. Yusuf's delayed agreement taught me that “later” could turn into action. Cedar offered three timber with injury risk, which I declined. No help opened before 60 s. No other new interaction was identified and left untried in that minute; later interactions are NOT TESTED at this checkpoint. |

## Experience and stopping

**Best moment:** 3:00–3:09, D1 21:42 onward. The roof was 8/10, Samira was hurt, and I could immediately send her home. Pulse 4/5. “I am interested now: the roof is close and Samira has been hurt, so I have a reason to intervene.” Screenshot `06-samira-hurt.png`.

**Worst moment:** 12:20–13:48 on the retry. After the result advised repeated house orders “with Rush,” I searched Order options, More, Full panel, Back and a panel scroll. I still saw only worker, place, summary and Confirm. I could not find how to apply that advice. Screenshot `14-replay-full-order.png`. I do not know whether Rush exists elsewhere.

| Elapsed | Kind      | Reason / engagement | Original reaction                                                                                                                                                                                                                                                                       |
| ------- | --------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3:06    | pulse     | 4/5                 | I am interested now: the roof is close and Samira has been hurt, so I have a reason to intervene.                                                                                                                                                                                       |
| 6:05    | pulse     | 3/5                 | I still want the roof done, but I keep reading suggestions and later replies instead of seeing much work finish.                                                                                                                                                                        |
| 9:09    | pulse     | 3/5                 | I am worried about the people, but the missed roof stage feels hard to diagnose from these short order replies.                                                                                                                                                                         |
| 10:01   | want_quit | CONFUSED            | I would put this down here. The storm deadline has passed, the roof is still one short, and I cannot tell whether I have failed or should keep fixing it. I would probably come back once to find out, rather than leave it running.                                                    |
| 11:53   | pulse     | 3/5                 | The result gave me a concrete reason to retry, but I am not eager to keep renewing five workers through menus.                                                                                                                                                                          |
| 13:48   | want_quit | FRUSTRATED          | I would stop the retry now. The game tells me to use Rush, but I cannot find it in Order options even with a full panel and a scroll. I could keep issuing ordinary orders, but I do not want to repeat the same near miss without being able to try the advice.                        |
| 15:13   | pulse     | 2/5                 | I understand more than on the first run, but the missing Rush control makes me reluctant to invest in another full attempt.                                                                                                                                                             |
| 15:13   | stop      | FRUSTRATED          | I am stopping the retry here. The first wish to leave passed when dawn finally explained the result, and I tried again. Now I want to try the suggested rushed orders and cannot find how. I would return voluntarily if I knew where that control was; I would not leave this running. |

**Hard, but kept going:** At 4:29 I selected ½× because morning was passing while I chose workers. I stayed because the roof was close and I wanted both goals ready before the storm. After failing by one roof stage, I read the winning example and retried. The slower clock helped me follow replies. This was a positive reason to continue, separate from the later inability to find Rush.

**First-run result, as shown by the game:** Classic roof 10/10; Human roof 9/10; Solo roof 9/10. All met storm stock and everyone-alive goals. Human had 15 meals at the storm deadline and 6/6 survivors at dawn. The result said my orders led to six injuries versus five without me, and the unfinished roof stage was 73% done at the deadline. These are the result screen's claims, not an independently tested counterfactual. I did not test its proposed winning sequence. Screenshots `12-first-run-result.png`, `13-result-explanation.png`.

**Final position:** retry, D1 about 18:48 in the last observed phone state, roof 7/10, meals 10/12, Idris's forest order done, another suggestion pending. Logging does not refresh the page, so the supplied game-clock labels in diary lines can lag the live clock. No further gameplay after stop; only resize and screenshot. Return preference: conditional on finding the Rush control. I would close it rather than leave it running.

## Clarity findings

| ID            | Status                                | What I saw and why it mattered                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-2          | FAIL, bounded                         | The apparent Idris name tap did not switch selection, 0:23. I used the worker chooser thereafter. Motion/coordinate uncertainty remains; this is not proof that the name is intrinsically inert.                                                                                                                                                                                                                                                                |
| DL-4          | FAIL, partial                         | “Will refuse: busy with own work” named an obstacle but did not tell me when that work would finish. Prayer, meals, water and timber delays were more concrete. `03-idris-places.png`.                                                                                                                                                                                                                                                                          |
| DL-9 / DL-12  | FAIL for my first phone run           | After D2 19:00, I could not tell when judging or play would end. The compact strip kept the storm deadline but did not show the D3 05:00 survival deadline. I wanted to leave at 10:01. Dawn eventually gave an explicit “Ended” state and result. On the retry, “More about the village” supplied the dawn deadline; the desktop strip also showed it. I do not claim the game contains no explanation.                                                        |
| DL-10 / DL-13 | FAIL, limited traceability            | Idris's kitchen order appeared “on it,” then “later,” then “didn't get to it.” His first home order similarly went from agreement to lapsed. History kept outcomes but I could not tell what prevented completion. “raise the roof beam · replaced by o5” was an unexplained reference. `08-orders-history.png`, diary 1:01–1:42 and 3:24–3:59. Inputs themselves were promptly acknowledged; I did not observe a duplicate caused by uncertain repeat tapping. |
| DL-16         | FAIL for the advice I tried to follow | The result advised house orders “with Rush.” On the phone I could not find a Rush control through Order options, More, Full panel, Back or scrolling. Ordinary ordering still worked. The first-run suggestion previews could supply “Rush: faster, hungrier”; that did not teach me how to set it for my own orders. `09-insist-preview.png`, `13-result-explanation.png`, `14-replay-full-order.png`.                                                         |
| DL-14         | PASS for costs met                    | Cedar warned of injury; insist warned of trust risk; rushed-helper previews said “faster, hungrier.” I knowingly accepted the helper costs. No claim about unencountered risks.                                                                                                                                                                                                                                                                                 |
| DL-15         | PASS, limited                         | Time and speed were explicit. Suggestions slowed to 1 min/s, then returned to the selected 8 or 4 min/s when resolved. I read and answered several before their shown lapse times. I did not run the specific fast-2× test; that case is NOT TESTED.                                                                                                                                                                                                            |

## English, dates, phone layout and hands-on play

| ID    | Status                                                       | Observations                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-20 | PASS for actions used                                        | I could order House, Forest, Kitchen and Home in English. “after I pray Fajr/Asr/Isha” supplied the needed meaning of the delay. I did not need to translate those prayer names to act. Ordering Masjid and any help defining that term were NOT TESTED.                                                                                                                                                         |
| DL-21 | PASS                                                         | D1/D2/D3 and 24-hour times let me compare today with the D2 19:00 deadline, including after the night. Suggestion lapse times added “in 56 min,” etc. The difficulty was discovering the separate dawn endpoint, not translating the dates. No month/year case encountered: NOT TESTED.                                                                                                                          |
| DL-22 | PASS for sampled gameplay sheets                             | Roof, meals and storm deadline remained on screen above the sheets. Suggestion and order responses stayed visible without a scroll in screenshots 04, 05, 07, 09, 10 and 14. Injury controls were visible in 06 and 11. Survival progress/end time was absent from that compact context; see DL-9/31.                                                                                                            |
| DL-30 | PASS for sampled action text                                 | No essential sentence was visibly cut off, ellipsised or hidden behind a “Scroll ↓” in the sampled gameplay sheets. The old-suggestion paragraph fitted in 10. History and the end report scrolled; these were longer records. I scrolled the end report to its explanation and used its normal replay button. This is not a builder-wide clipping audit.                                                        |
| DL-31 | FAIL, partial                                                | Roof progress, meal count and storm deadline remained readable while ordering. The complete goal state did not: alive count and D3 dawn deadline were not in the compact strip. In 07, a Tariq suggestion was open while Samira remained the selected subject in the small visible scene. The sheet named Tariq, but did not keep his scene subject visible.                                                     |
| DL-32 | NOT TESTED as a universal availability claim                 | Longest deliberate waits were 30 real seconds. I wanted Idris safely home while he delayed for prayer, then waited for his accepted order to finish. Other orders and inspection remained available; I did not establish a stretch where the only possible input was watching. I cannot turn my chosen waits into evidence of a forced gap. I never personally built, chopped or cooked; workers did those jobs. |
| DL-33 | PASS for ordinary order placement; personal labor NOT TESTED | After worker selection, tapping an in-scene House/Forest place card sent an ordinary order directly. A planning form was another route, not the only route. Risky/insisted suggestions used review and Confirm. I wanted quick orders, and those place cards supplied that. Switching workers was slower through Order options → Worker → person.                                                                |

Other checklist items not reached or not checked are NOT TESTED. No reload/resume, sending, import/replay validation, 200% text, 320 px viewport, target measurements or builder checks were performed.

## Desktop look after stopping

At 1280×800 I could see both villages, all three goal deadlines, alive counts, worker buttons and place buttons together. “Everyone lives by D3 05:00” was plainly visible. Order options appeared as a collapsed disclosure. I did not open it or perform desktop gameplay. `15-desktop-after-stop.png`. This single look does not prove where Rush is or how desktop ordering behaves.

## Up to three changes I want, ranked

1. Let me find and choose Rush from the phone's own order controls when the result tells me to use it.
2. Tell me during play that a house order ends before the whole roof is finished, and make the worker's current job easy to check and renew. “Ask again” helped once I used it.
3. Keep the survival deadline and a short statement that judging continues until dawn visible on the phone when the storm has begun or passed.

## Access and protocol limitations

The standard driver operated visible controls throughout. Two failed taps are in the diary: the goal strip as the end dialog arrived, followed by a retry using the latest visible text; and a Suggestion button that had disappeared after an order, followed by use of the available Order options control. Neither established inability to operate a visible control. No TOOL stop occurred. The early map-coordinate selection attempt was acknowledged but did not change selection. The written first-minute checkpoint was 8.8 seconds late; the automatic 60-second screenshot is the exact visual checkpoint. Browser reply text includes long dialog content even when it requires scrolling, so layout judgments above rely on screenshots, not the text list alone.

### Important visible answers during the diary

These are selected live browser replies, separate from the verbatim reactions below.

| Elapsed     | Input / event                   | Visible answer                                                                                        |
| ----------- | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 0:16        | Yusuf → House                   | “Order given to both villages”; “later, after I pray Fajr.”                                           |
| 0:20        | Screenshot                      | “Yusuf · House: on it”; meals 4/12.                                                                   |
| 0:32        | Select Idris                    | “Gathering timber”; House/Field/Well/Kitchen “Will refuse: busy with own work.”                       |
| 0:39        | Suggestion                      | Three timber from cedar; injury risk; lapses 09:00.                                                   |
| 0:49        | Idris → Kitchen                 | “Kitchen: waiting.”                                                                                   |
| 1:00        | Automatic screenshot            | D1 10:01; roof 4/10; meals 6/12; “Kitchen: later, when the store runs low.”                           |
| 1:02        | Wait returns                    | D1 10:15; “Kitchen: on it.”                                                                           |
| 1:39        | Worker chooser                  | “Kitchen: didn't get to it.”                                                                          |
| 2:08        | Wait returns                    | Roof 7/10; Yusuf “later, when there’s timber.”                                                        |
| 3:01        | Wait returns                    | Roof 8/10; Samira (Classic) “hurt in the squall”; Send home / Show buttons.                           |
| 3:09        | Send Samira home                | “Order given to both villages”; Home waiting, then on it in following reply.                          |
| 3:21        | Switch Human                    | Samira “can't — I'm asleep”; Idris (Human) hurt.                                                      |
| 3:52        | Wait returns                    | Idris “Home: didn't get to it.”                                                                       |
| 3:55        | History                         | Home “sleep · lapsed”, C done, H agreed; kitchen lapsed; roof order “replaced by o5.”                 |
| 4:34        | Send morning forest suggestion  | Tariq Forest waiting; subsequent replies delay for food/water, then on it.                            |
| 5:22–5:29   | Insist on Samira helping        | Preview “Under protest”; “Rush: faster, hungrier · Insist: trust at risk”; Confirm sends House order. |
| 5:57        | Wait returns                    | “House: on it, under protest”; roof 8/10.                                                             |
| 6:10–6:13   | Review/confirm Danyal           | “Rush: faster, hungrier”; House on it.                                                                |
| 6:46        | Wait returns                    | Roof 9/10; Danyal House done.                                                                         |
| 7:11        | Select Maryam                   | Maryam Cooking; Danyal bubble “Not that — I'll cook a pot.”                                           |
| 7:46        | Wait returns                    | Meals 12/12; Maryam later when store runs low.                                                        |
| 8:07        | Food suggestion                 | Old-suggestion explanation; “Nobody can cook from 19:00 until 03:00.”                                 |
| 8:45        | Wait returns                    | D2 18:57; roof 9/10; meals 15/12.                                                                     |
| 9:05        | Wait returns                    | D2 20:15; roof 9/10; meals 8/12; Idris hurt in storm.                                                 |
| 9:09–9:17   | Send Idris home / Show / shot   | Later after Isha, then “on it.”                                                                       |
| 9:53        | Wait returns                    | Idris Home done; injury alert no longer present.                                                      |
| 10:37–10:42 | Wait / Weather history          | “Storm passed · D2 19:00–D3 03:00.”                                                                   |
| 10:55       | Retry goal text tap as run ends | D3 05:00, “Ended”; result table: Human roof failed, stock met, everyone lives met.                    |
| 11:35       | Play again                      | Reset to D1 05:00, roof 2/10, meals 0/12; opening dialog.                                             |
| 11:41       | More about the village          | Lists Everyone lives by D3 05:00; says following only suggestions will not roof Human house.          |
| 12:20–12:29 | Full order panel / scroll       | Worker, place, ordinary build summary, Watch village and Confirm; no Rush control encountered.        |
| 13:48       | Retry observation               | Roof 5/10; meals 11/12; Idris Forest done.                                                            |
| 13:56       | Ask again                       | New Idris → Forest order, “on it.”                                                                    |
| 14:29       | Wait returns                    | Roof 7/10; meals 8/12.                                                                                |
| 15:04       | Final wait returns              | D1 18:48; roof 7/10; meals 10/12; suggestion pending.                                                 |

## Verbatim diary

Original driver entries follow in order, with elapsed wall time, supplied game-clock labels, input and reaction. Reaction wording is unchanged. Inputs without a reaction remain included. Important visible answers are recorded above and in the annotated screenshot entries. The driver's JSONL does not store the full visible-text replies; those replies were observed live. Automatic screenshot entries are retained. The final resize and shot are after the stop.

**00:00.425 · input**

Input: `open {}`

> I want to see who needs work and get them moving.

**00:03.822 · input · D1 05:00**

Input: `shot {"file": "01-opening.png"}`

> Play looks tappable; the roof, meals and storm strip draws my eye first. I need shelter and food before tomorrow evening.

**00:06.958 · input · D1 05:00**

Input: `tap {"name": "Play", "role": "button"}`

> Let us get someone on that roof.

**00:09.626 · input · D1 05:00**

Input: `tap {"name": "Choose person", "role": "button"}`

> The people have name tags, but this button is the clearest way to choose one.

**00:12.353 · input · D1 05:22**

Input: `tap {"name": "Yusuf", "role": "button"}`

> Yusuf first. I do not know their skills yet.

**00:16.310 · input · D1 05:31**

Input: `tap {"name": "House Later: after I pray Fajr", "role": "button"}`

> That sounds like he will build after prayer; I can give the order now.

**00:19.768 · input · D1 05:36**

Input: `shot {"file": "02-first-order.png"}`

> Good, it says later rather than pretending he started. I want another person collecting food.

**00:22.976 · input · D1 06:04**

Input: `tap {"x": 131, "y": 401}`

> Idris is by the kitchen. His name looks like something I can tap.

**00:25.452 · input · D1 06:29**

Input: `tap {"name": "Order options · Yusuf", "role": "button"}`

> The name tap did not select Idris. I will use the order button.

**00:27.686 · input · D1 06:49**

Input: `tap {"name": "Worker · Yusuf", "role": "button"}`

> Worker should let me switch people.

**00:31.791 · input · D1 07:07**

Input: `tap {"name": "Idris", "role": "button"}`

> I want Idris cooking, assuming the kitchen does that.

**00:35.227 · input · D1 07:40**

Input: `shot {"file": "03-idris-places.png"}`

> He is already gathering timber. The refuse labels make sense, but I do not know when his own work ends.

**00:39.049 · input · D1 08:00**

Input: `tap {"name": "Suggestion", "role": "button"}`

> Someone has a suggestion; I want to hear that before fighting Idris over a job.

**00:42.789 · input · D1 08:04**

Input: `shot {"file": "04-cedar-suggestion.png"}`

> Three timber sounds useful, but I would rather keep everyone healthy. I can still see roof 3, meals 2 and the storm date above this sheet.

**00:46.378 · input · D1 08:08**

Input: `tap {"name": "Skip suggestion", "role": "button"}`

> No cedar gamble yet; the ordinary forest is producing timber.

**00:49.258 · input · D1 08:12**

Input: `tap {"name": "Kitchen Later: food enough put by", "role": "button"}`

> Six meals is not twelve. I want to hear why he thinks there is enough.

**01:00.053 · first_minute**

Input: `shot {"file": "first-minute.png"}`

**01:01.650 · input · D1 08:35**

Input: `wait {"s": 9}`

> Watching for Idris to answer the kitchen order.

**01:08.806 · first_minute · D1 10:15**

Input: `log null`

> I need ten roof parts and twelve meals before Day 2 at 19:00. Play, speed, village tabs, the bottom order controls and place cards look tappable; tapping Idris name on the map did not select him. The top goals draw me first; Idris is now selected, though I mostly know that from Order options. Yusuf waited for prayer then agreed to the house, so later is a real answer. Idris was busy with his own timber work; I could not tell when that would free him. I can give place orders and respond to a suggestion. A real person/place choice was available after Play at about seven seconds, first worker selection at twelve seconds, first work order at sixteen. I learned by ordering Yusuf, ordering Idris and declining one risky cedar suggestion. Confirm was disabled before choosing a place. I used no help. Roof and meals stay visible above the suggestion; the scene gets small. I am curious whether my orders actually improve the village.

**01:13.429 · input · D1 10:15**

Input: `tap {"name": "Open Idris’s latest order: Kitchen: on it", "role": "button"}`

> I want to see what he actually said, because the earlier label said there was enough food.

**01:16.150 · input · D1 10:53**

Input: `tap {"name": "Watch village", "role": "button"}`

> Fine is enough for now. The meals have risen to nine; that feels like the order helped.

**01:19.027 · input · D1 10:55**

Input: `tap {"name": "Suggestion", "role": "button"}`

> What do they need next?

**01:23.089 · input · D1 10:58**

Input: `shot {"file": "05-maryam-suggestion.png"}`

> Why suggest moving the cook if she says the others would go unfed? I am keeping her there.

**01:25.822 · input · D1 11:02**

Input: `tap {"name": "Skip suggestion", "role": "button"}`

> Leave Maryam cooking. I would like Yusuf to finish more than one roof part.

**01:29.206 · input · D1 11:06**

Input: `tap {"name": "Human · Roof 5 of 10 Meals 8 / 12 Storm Day 2 19:00", "role": "button"}`

> The goal strip looks tappable. I want to know what resources are holding the roof up.

**01:32.643 · input · D1 11:33**

Input: `tap {"name": "Human · Roof 5 of 10 Meals 11 / 12 Storm Day 2 19:00", "role": "button"}`

> It repeats the target. Eleven is close; I will let him judge when to cook.

**01:36.325 · input · D1 12:01**

Input: `tap {"name": "Order options · Idris", "role": "button"}`

> Food is ahead of target; roof is halfway. I want to put Yusuf back on construction.

**01:38.703 · input · D1 12:30**

Input: `tap {"name": "Worker · Idris", "role": "button"}`

**01:41.584 · input · D1 12:49**

Input: `tap {"name": "Yusuf", "role": "button"}`

> Kitchen now says did not get to it after saying on it. I cannot tell whether he cooked any of those meals.

**01:45.154 · input · D1 13:12**

Input: `tap {"name": "House Likely yes", "role": "button"}`

> Another roof order, please. I like being able to tap the place directly once the worker is chosen.

**02:07.948 · input · D1 13:41**

Input: `wait {"s": 20}`

> Watching Yusuf work and the roof count. Food is at target for now.

**02:12.606 · input · D1 16:43**

Input: `tap {"name": "Order options · Yusuf", "role": "button"}`

> We need timber. I want to find someone free rather than send the builder away.

**02:16.251 · input · D1 17:20**

Input: `tap {"name": "Worker · Yusuf", "role": "button"}`

**02:19.246 · input · D1 17:50**

Input: `tap {"name": "Tariq", "role": "button"}`

> Tariq has not had an order from me yet. Let us see what he is doing.

**02:24.728 · input · D1 18:14**

Input: `tap {"name": "Forest Will refuse: busy with own work", "role": "button"}`

> Two builders with no timber seems wrong. I will ask Tariq to gather instead, even though he may refuse.

**02:27.170 · input · D1 18:29**

Input: `tap {"name": "Suggestion", "role": "button"}`

> He will drink first. That is fair. The prediction changed while I was choosing.

**02:30.183 · input · D1 18:31**

Input: `tap {"name": "Send order", "role": "button"}`

> Yes, one more roof part before dark. I thought that was already his job, though.

**02:32.715 · input · D1 18:35**

Input: `tap {"name": "Classic · obey", "role": "button"}`

> Each order goes to both villages. I want to see how the other one is getting on.

**03:00.557 · input · D1 18:55**

Input: `wait {"s": 25}`

> I want to see whether the evening roof order lands. The two villages look fairly close so far.

**03:05.761 · pulse · D1 21:42 · engagement 4/5**

Input: `log null`

> I am interested now: the roof is close and Samira has been hurt, so I have a reason to intervene.

**03:05.966 · input · D1 21:42**

Input: `shot {"file": "06-samira-hurt.png"}`

> The injury has explicit Send home and Show buttons. I want her home right away.

**03:08.859 · input · D1 21:48**

Input: `tap {"name": "Send Samira home", "role": "button"}`

> Get out of the squall, Samira.

**03:11.261 · input · D1 21:51**

Input: `tap {"name": "Suggestion", "role": "button"}`

> The Send home button stays there after sending. I will wait for her reply rather than tap it again.

**03:16.130 · input · D1 21:53**

Input: `shot {"file": "07-squall-order-sheet.png"}`

> I can read the risk and both response buttons without scrolling. The roof and deadline are still at the top, but the village itself is now a narrow band.

**03:18.897 · input · D1 21:58**

Input: `tap {"name": "Skip suggestion", "role": "button"}`

> No, the timber can wait until morning. I have nearly a whole day left.

**03:21.442 · input · D1 22:01**

Input: `tap {"name": "Human · decide", "role": "button"}`

> Back to the Human village. I want to check whether Samira was hurt here too.

**03:23.975 · input · D1 22:22**

Input: `tap {"name": "Send Idris home", "role": "button"}`

> Idris is hurt here. Home for him too. I am surprised the kitchen order could leave him out in the squall later.

**03:52.098 · input · D1 22:42**

Input: `wait {"s": 25}`

> I will let the night pass at normal speed. Sending people out now seems like asking for trouble.

**03:55.383 · input · D2 02:27**

Input: `tap {"name": "History (7)", "role": "button"}`

> Did not get to it again. I want to see whether the history tells me what happened to those orders.

**03:59.165 · input · D2 02:53**

Input: `shot {"file": "08-orders-history.png"}`

> The history says H agreed but lapsed for home, and H not now for kitchen. I can see the outcome, but not why agreeing did not get him home. Replaced by o5 means nothing useful to me.

**04:07.634 · input · D2 03:23**

Input: `tap {"name": "Watch village", "role": "button"}`

> I am going back to work, not reading every history entry. Morning is nearly here.

**04:23.267 · input · D2 03:23**

Input: `wait {"s": 15}`

> Waiting for daylight before putting people back outside.

**04:28.545 · input · D2 06:36**

Input: `tap {"name": "½×", "role": "button"}`

> Morning is passing while I choose people. I want a slower clock so I can set up timber and building before the storm.

**04:31.167 · input · D2 07:02**

Input: `tap {"name": "Suggestion", "role": "button"}`

> I will use their suggestion if it fits the morning work.

**04:34.378 · input · D2 07:04**

Input: `tap {"name": "Send order", "role": "button"}`

> Yes. This is the right time for timber.

**04:36.776 · input · D2 07:08**

Input: `tap {"name": "Order options · Tariq", "role": "button"}`

> Now Yusuf to the house. Switching workers still takes several taps.

**04:39.633 · input · D2 07:18**

Input: `tap {"name": "Worker · Tariq", "role": "button"}`

> He wants a meal and the latest line says a drink. Either way he has needs before work.

**04:42.465 · input · D2 07:29**

Input: `tap {"name": "Yusuf", "role": "button"}`

**04:46.901 · input · D2 07:40**

Input: `tap {"name": "House Later: after I drink at the well", "role": "button"}`

> Back to the roof after your drink. I like that I can leave the request with him.

**05:15.953 · input · D2 07:58**

Input: `wait {"s": 25}`

> I want to watch the timber and roof orders meet. Half speed gives me room to follow the replies.

**05:19.062 · input · D2 09:13**

Input: `tap {"name": "Suggestion", "role": "button"}`

> What is the hold-up this time?

**05:22.040 · input · D2 09:16**

Input: `tap {"name": "Insist · may cost trust", "role": "button"}`

> We are nearly there. I want to see the warning before asking Samira to help with the last roof stages.

**05:25.658 · input · D2 09:19**

Input: `shot {"file": "09-insist-preview.png"}`

> This says Rush as well as Insist. I expected only insisting, but faster and hungrier sounds like a real cost for extra help.

**05:28.767 · input · D2 09:23**

Input: `tap {"name": "Confirm", "role": "button"}`

> I am accepting the trust risk to get shelter finished. The food cost is manageable if Maryam keeps cooking.

**05:56.690 · input · D2 09:26**

Input: `wait {"s": 25}`

> Watching whether Samira joins the builders after that insistence.

**06:05.107 · pulse · D2 09:57 · engagement 3/5**

Input: `log null`

> I still want the roof done, but I keep reading suggestions and later replies instead of seeing much work finish.

**06:05.404 · input · D2 09:57**

Input: `tap {"name": "Suggestion", "role": "button"}`

> Another suggestion appeared right after I sent that one. I want to know whether it is actually new.

**06:09.544 · input · D2 10:05**

Input: `tap {"name": "Review order", "role": "button"}`

> The well can wait an hour, it says. Let me see what helping costs Danyal.

**06:12.669 · input · D2 10:09**

Input: `tap {"name": "Confirm", "role": "button"}`

> Alright, Danyal can help. I am choosing extra hunger to get the last stages built.

**06:45.833 · input · D2 10:13**

Input: `wait {"s": 30}`

> I have builders and a timber gatherer. I am giving them time rather than sending more orders over the top.

**06:52.812 · input · D2 12:26**

Input: `tap {"name": "Order options · Danyal", "role": "button"}`

> Nine. One more. I want to send Danyal back if he is still willing.

**06:56.479 · input · D2 12:53**

Input: `tap {"name": "Place · Choose", "role": "button"}`

> House again if he can do it.

**06:58.591 · input · D2 13:08**

Input: `tap {"name": "House", "role": "button"}`

**07:01.666 · input · D2 13:17**

Input: `tap {"name": "Confirm", "role": "button"}`

> After a meal is fine. This route takes a form; the map route was quicker.

**07:04.265 · input · D2 13:29**

Input: `tap {"name": "Order options · Danyal", "role": "button"}`

> Food next. I want Maryam cooking before the store runs too low.

**07:06.951 · input · D2 13:39**

Input: `tap {"name": "Worker · Danyal", "role": "button"}`

**07:11.425 · input · D2 13:50**

Input: `tap {"name": "Maryam", "role": "button"}`

**07:14.055 · input · D2 14:08**

Input: `tap {"name": "More places (4)", "role": "button"}`

> Maryam is already cooking; Danyal chose to cook instead of build. Maybe the food problem is being handled for me.

**07:17.164 · input · D2 14:18**

Input: `tap {"name": "Kitchen", "role": "button"}`

> I want to keep her cooking through to the deadline.

**07:45.648 · input · D2 14:31**

Input: `wait {"s": 25}`

> One stage and three meals short. I am watching for a finish rather than changing everyone again.

**07:50.854 · input · D2 16:25**

Input: `tap {"name": "Order options · Maryam", "role": "button"}`

> Yusuf needs to finish that last stage. I do not want to lose this with the food ready.

**07:55.829 · input · D2 16:33**

Input: `tap {"name": "Worker · Maryam", "role": "button"}`

**07:59.126 · input · D2 16:38**

Input: `tap {"name": "Yusuf", "role": "button"}`

**08:03.348 · input · D2 16:42**

Input: `tap {"name": "House Later: after I pray Asr", "role": "button"}`

> One last stage after prayer. I did not realize done meant he stopped before the roof was finished.

**08:07.279 · input · D2 16:46**

Input: `tap {"name": "Suggestion", "role": "button"}`

> What is urgent enough to slow the clock now?

**08:11.454 · input · D2 16:50**

Input: `shot {"file": "10-old-food-suggestion.png"}`

> No cooking after seven is important. This is a lot of explanation for a request I already sent, but at least it tells me that it is old.

**08:15.604 · input · D2 16:54**

Input: `tap {"name": "Send order", "role": "button"}`

> Top up before cooking closes. I hope she does not decide twelve is enough when people are about to eat.

**08:45.143 · input · D2 16:59**

Input: `wait {"s": 25}`

> Watching the final daylight jobs. I want that last roof stage before the rain.

**09:04.548 · input · D2 18:57**

Input: `wait {"s": 15}`

> The storm is here and we are one roof stage short. I want to see what that costs us.

**09:08.883 · pulse · D2 20:15 · engagement 3/5**

Input: `log null`

> I am worried about the people, but the missed roof stage feels hard to diagnose from these short order replies.

**09:09.365 · input · D2 20:15**

Input: `tap {"name": "Send Idris home", "role": "button"}`

> I sent him home yesterday and it lapsed. Please get inside this time.

**09:12.475 · input · D2 20:34**

Input: `tap {"name": "Show Idris", "role": "button"}`

> Where is he, and can I see what is keeping him exposed?

**09:16.796 · input · D2 20:46**

Input: `shot {"file": "11-storm-idris.png"}`

> He says after prayer. I want him safe, but I cannot do that myself. I will give him time to finish.

**09:52.546 · input · D2 21:03**

Input: `wait {"s": 30}`

> Waiting to see whether Idris reaches home and the storm gives us a result.

**10:01.021 · want_quit · D2 23:27 · CONFUSED**

Input: `log null`

> I would put this down here. The storm deadline has passed, the roof is still one short, and I cannot tell whether I have failed or should keep fixing it. I would probably come back once to find out, rather than leave it running.

**10:02.017 · input · D2 23:27**

Input: `tap {"name": "Game menu", "role": "button"}`

> I am looking for an explanation of when this run ends, not starting another game yet.

**10:09.055 · input · D3 00:04**

Input: `tap {"name": "Game menu", "role": "button"}`

> No ending explanation in the menu. I will keep playing and see what dawn brings.

**10:09.768 · input · D3 00:04**

Input: `tap {"name": "1×", "role": "button"}`

> Back to normal speed for the night. I slowed down to give orders; now I want morning.

**10:35.270 · input · D3 00:04**

Input: `wait {"s": 25}`

> Waiting for dawn and an answer about the storm outcome.

**10:41.531 · input · D3 03:48**

Input: `tap {"text": "Weather history"}`

> Weather history appeared. Maybe that is where the storm result lives.

**10:49.920 · tool · D3 04:39**

Input: `tap {"name": "Human · Roof 9 of 10 Meals 7 / 12 Roof by Day 2 19:00", "role": "button"}`

> The storm passed, but the goal still says roof by yesterday. I want to know whether finishing today counts for anything.

Driver answer: `No actionable button named Human · Roof 9 of 10 Meals 7 / 12 Roof by Day 2 19:00`

**10:54.914 · input · D3 04:39**

Input: `tap {"text": "Human · Roof 9 of 10"}`

> Trying the visible goal text once more to open its explanation.

**11:15.471 · input · D3 05:00**

Input: `shot {"file": "12-first-run-result.png"}`

> Now I have the answer: everyone lived, food met the deadline, and the roof failed by one stage. My orders did not improve the roof over Solo. The winning example says repeat rushed house orders when they end; I wish I had understood that during the day.

**11:24.558 · input · D3 05:00**

Input: `scroll {"dy": 585, "text": "Same orders. Same seed."}`

> Scrolling the result to read how close the roof was and reach the replay controls.

**11:28.805 · input · D3 05:00**

Input: `shot {"file": "13-result-explanation.png"}`

> I am reading the winning example as advice for another try, not as something I had known while playing.

**11:35.331 · input · D3 05:00**

Input: `tap {"name": "Play again", "role": "button"}`

> I will try again with the same village. This time I know to keep renewing the builders rather than assume they have the whole roof job.

**11:40.739 · input · D1 05:00**

Input: `tap {"text": "More about the village"}`

> Before replaying, I want to know whether I missed an explanation of these short orders.

**11:44.962 · input · D1 05:00**

Input: `tap {"name": "Play", "role": "button"}`

> The help does give the dawn judging time. I did not open it on the first run. It also says suggestions alone will not finish the roof.

**11:45.473 · input · D1 05:00**

Input: `tap {"name": "Choose person", "role": "button"}`

> Yusuf to the house again; then I want to see the extra order options.

**11:52.462 · input · D1 05:04**

Input: `tap {"name": "Yusuf", "role": "button"}`

**11:52.720 · pulse · D1 05:04 · engagement 3/5**

Input: `log null`

> The result gave me a concrete reason to retry, but I am not eager to keep renewing five workers through menus.

**11:58.106 · input · D1 05:33**

Input: `tap {"name": "Order options · Yusuf", "role": "button"}`

> I want to find Rush myself this time rather than wait for a suggestion to supply it.

**11:58.698 · input · D1 05:33**

Input: `tap {"name": "More", "role": "button"}`

> More may have the appeal and reason controls mentioned in the help.

**12:04.063 · input · D1 05:39**

Input: `tap {"name": "Back", "role": "button"}`

> More was panel sizing, not order strength. Back to choosing the house.

**12:04.586 · input · D1 05:39**

Input: `tap {"name": "Place · Choose", "role": "button"}`

**12:05.239 · input · D1 05:39**

Input: `tap {"name": "House", "role": "button"}`

**12:14.527 · input · D1 05:46**

Input: `tap {"name": "More", "role": "button"}`

> I will try a full panel to see whether the extra order controls are hidden by the small view.

**12:14.916 · input · D1 05:46**

Input: `tap {"name": "Full panel", "role": "button"}`

**12:20.480 · input · D1 05:55**

Input: `tap {"name": "Back", "role": "button"}`

> Back to the actual order, with more room.

**12:20.823 · input · D1 05:55**

Input: `shot {"file": "14-replay-full-order.png"}`

> I still only see worker, place and Confirm. I cannot find Rush on this phone order screen.

**12:29.251 · input · D1 06:01**

Input: `scroll {"dy": 400, "text": "build the house · Later: after I eat a meal"}`

> Checking below the order summary for Rush before sending an ordinary order.

**12:30.517 · input · D1 06:01**

Input: `tap {"name": "Confirm", "role": "button"}`

> No extra controls turned up. Ordinary building will have to do.

**12:30.998 · tool · D1 06:01**

Input: `tap {"name": "Suggestion", "role": "button"}`

> I will clear the opening suggestion so the village can move at normal speed.

Driver answer: `No actionable button named Suggestion`

**12:39.261 · input · D1 06:13**

Input: `tap {"name": "Order options · Yusuf", "role": "button"}`

> The suggestion button has gone after sending the order, so I will choose another worker through the available order button.

**12:40.203 · input · D1 06:13**

Input: `tap {"name": "Worker · Yusuf", "role": "button"}`

**12:43.619 · input · D1 06:13**

Input: `tap {"name": "Idris", "role": "button"}`

> Keep Idris on timber this time instead of diverting him to food early.

**12:52.041 · input · D1 07:46**

Input: `tap {"name": "Forest Already gathering timber: keeps him at it", "role": "button"}`

> Yes, keep timber coming. That should leave Yusuf supplied.

**12:59.443 · input · D1 08:05**

Input: `tap {"name": "Suggestion", "role": "button"}`

> I remember this is probably the cedar gamble. I still prefer the ordinary timber job.

**13:02.406 · input · D1 08:12**

Input: `tap {"name": "Skip suggestion", "role": "button"}`

> Skip cedar again. I want the builders doing steady work.

**13:35.585 · input · D1 08:16**

Input: `wait {"s": 30}`

> Giving the village a work stretch. I have left the cook alone and kept Idris on timber this time.

**13:42.370 · input · D1 10:59**

Input: `tap {"name": "Suggestion", "role": "button"}`

> I expect the Maryam forest suggestion, and I still want her cooking.

**13:45.396 · input · D1 11:06**

Input: `tap {"name": "Skip suggestion", "role": "button"}`

> No, keep the cook at her job.

**13:48.450 · want_quit · D1 11:10 · FRUSTRATED**

Input: `log null`

> I would stop the retry now. The game tells me to use Rush, but I cannot find it in Order options even with a full panel and a scroll. I could keep issuing ordinary orders, but I do not want to repeat the same near miss without being able to try the advice.

**13:53.064 · input · D1 11:10**

Input: `tap {"name": "Open Idris’s latest order: Forest: done", "role": "button"}`

> I will at least renew the timber order while I am here. Ask again looks like a quick way.

**13:55.796 · input · D1 12:11**

Input: `tap {"name": "Ask again", "role": "button"}`

> Gather another load, Idris.

**14:28.886 · input · D1 12:33**

Input: `wait {"s": 30}`

> Watching the renewed timber job. Ask again is easier than choosing the same worker and place from scratch.

**14:36.021 · input · D1 16:57**

Input: `tap {"name": "Open Idris’s latest order: Forest: done", "role": "button"}`

> I could keep the timber coming, but I still want a way to rush the roof crew.

**14:38.604 · input · D1 17:55**

Input: `tap {"name": "Watch village", "role": "button"}`

> No more timber tonight. I am leaving them to finish the daylight work.

**15:03.745 · input · D1 18:15**

Input: `wait {"s": 22}`

> Watching the evening work for a little longer. I do not want to send people into another squall.

**15:13.419 · pulse · D1 18:48 · engagement 2/5**

Input: `log null`

> I understand more than on the first run, but the missing Rush control makes me reluctant to invest in another full attempt.

**15:13.490 · stop · D1 18:48 · FRUSTRATED**

Input: `log null`

> I am stopping the retry here. The first wish to leave passed when dawn finally explained the result, and I tried again. Now I want to try the suggested rushed orders and cannot find how. I would return voluntarily if I knew where that control was; I would not leave this running.

**15:13.700 · input · D1 18:48**

Input: `resize {"width": 1280, "height": 800}`

> Play has stopped. Taking the required single desktop look.

**15:18.099 · input · D1 18:58**

Input: `shot {"file": "15-desktop-after-stop.png"}`

> The desktop view shows both villages and a goal for everyone alive at Day 3 dawn. That timing was not in the compact phone strip. I am only looking; no more play.

## Evidence paths

- Wall-clock diary: `well-floor2-shots/wall-clock.jsonl`
- All named screenshots: `well-floor2-shots/`
- Automatic exact first-minute screenshot: `well-floor2-shots/first-minute.png`
- Export: none downloaded. No replay claim.
