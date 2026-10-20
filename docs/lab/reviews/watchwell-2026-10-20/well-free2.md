# Twice at the Well — Bram, free stop

## Session

- Persona: Bram, 35, warehouse shift lead. Plays Mini Motorways, RimWorld on PC, and Bad North. Likes giving quick orders and watching people carry them out. Curious; evening at home, phone in hand.
- URL: https://human.adamwhite.work/colony/
- Build: no build identifier encountered in the visible interface.
- Device: 360×690 CSS px, touch emulation, light mode, default text size. One 1280×800 look after stopping.
- Access: supplied `npm run lab:play` driver, port 43512, PID 60891. It operated successfully. Killed PID 60891 after the desktop look.
- Time limits: floor 0, ceiling 25 real minutes. First actionable screen was the opening dialog, elapsed 0.478 s. Play tapped at 5.318 s. First want_quit: 437.935 s (7:17.9). Stop: 446.302 s (7:26.3). Desktop look: 451.923–452.169 s, outside play.
- Phone stop state: D2 22:34, Human roof 9/10, meals 9/12, injury alert for Idris at D2 22:10. Game still running. The stop log's supplied game_clock was D2 21:30, copied from the preceding reply; the latest visible answer had advanced to D2 22:34. Use the latter for the observed stop state.
- Game knowledge came from the two permitted game documents and the live player interface. No source, tests, other game documents, prior reports, internal state, bundles, network payloads, or debug APIs inspected. No run sent, telemetry submitted, consent changed, or export downloaded.
- Timing limitation: time continued between browser requests. The `log` op echoed the preceding browser snapshot rather than refreshing it. The game clock in a reaction is therefore often the last clock I had read, not the exact clock at input execution. The diary below uses the returned visible clock where relevant. Screenshot pixels and returned text sometimes differ by a minute or two because time is live. This is not frozen-time play.

## First minute

The checkpoint was logged at 64.535 s, about four seconds late. No gameplay action occurred between 54.931 s and that note. The rows below use observations available by 60 s; later discoveries do not upgrade them.

Original checkpoint note, unchanged:

> I need ten roof sections and twelve meals before Day 2 at 19:00, with everyone alive. Play, Choose person, the people, places, speed and the outlined tabs look touchable. The roof and meals strip catches me first; Human is selected and Maryam is my worker. Idris and Yusuf wait until after prayer; Maryam waited until after eating. I picked Idris for House, accepted the Yusuf suggestion and sent Maryam to Kitchen. Orders get replies, and roof and meals have moved. First order choice was available by 17 seconds and I sent it at 20. I do not yet know how to make Maryam store twelve if she stops at six. No help opened.

| Item | Status | Evidence available in the first minute |
|---|---|---|
| DL-1 A reason to act | PASS | Roof the house, put by twelve meals, keep everyone alive before the storm. Opening stated this directly. |
| DL-2 What can I touch | PASS for reached controls | Before choosing, I named people/buildings as looking tappable and used Choose person. Play, worker buttons, place buttons, Suggestion, Send order, latest order and Watch village worked. No inert target tried in this minute. Direct map-person tapping was not established. Screenshots 01–04. |
| DL-3 Urgency and selection | PASS | Roof/meals/deadline drew me first. Human tab had an outline. Worker names and the current order named Idris, then Yusuf, then Maryam. “Slow · 1 min/s · suggestion pending” competed for attention but identified the interruption. |
| DL-4 Why the limit | PASS for reached circumstances | Idris/Yusuf: “Later: after I pray Fajr.” Maryam: “Later: after I eat a meal.” These told me what must finish first. By 54.931 s Maryam's reply became “later, when the store runs low.” I did not know the stock threshold. Confirm was disabled before choosing a worker/place; the “now pick a place” instruction explained that selection requirement. No claim about implementation or all limits. |
| DL-5 Readable situation | PASS at checkpoint | I could name the next available response: open Suggestion or give another order. Maryam's latest order said later when stock runs low. Roof had risen from 2 to 3; meals were 6/12. I knew what I had requested, even though I did not yet know how she would reach twelve. |
| DL-6 A choice soon | PASS | Worker choices available at 13.745 s; first worker selection at 17.198 s. Consequential House order available by 17.198 s; sent at 20.036 s. Play at 5.318 s was a start input, not the meaningful work choice. Opening required roughly 25 story/instruction words before Play, below 40. |
| DL-7 Learn by doing | PASS for reached interactions | Selecting Idris exposed place orders and his prayer delay. House produced “Order given to both villages” and a delayed reply. Yusuf's suggestion identified him as the best builder. Maryam's order changed from waiting to on it; meals rose. Reached four interaction types: worker selection, place order, suggestion acceptance, latest-order inspection. No help used. Six visible types NOT TESTED by 60 s: risk review, Ask again, Cancel order, History, village comparison, and speed changes. |

## Verbatim diary

Elapsed times below are seconds from the driver's first usable-screen timer. Reactions are unchanged. Inputs without a reaction are included with a dash. Visible answers are recorded separately from my interpretation. The complete driver-generated wall-clock record is `well-free2-shots/wall-clock.jsonl`; I did not read that file back to infer rules.

| Elapsed s | Input | Original reaction | Important visible answer |
|---:|---|---|---|
| 0.478 | open | I want to see what needs doing and put someone on it. | D1 05:00 paused. Opening goal and Play. |
| 5.084 | shot 01 | Play is the obvious button. The roof and meal targets give me a job. | Opening phone screenshot. |
| 5.318 | Play | Let us get the roof crew moving. | Running, 8 min/s. |
| 8.101 | shot 02 | — | D1 05:23; roof 2, meals 0. |
| 13.745 | Choose person | The people and buildings look tappable, but I will use Choose person first. | Six workers; Confirm disabled. Slow, suggestion pending. |
| 17.198 | Idris | Idris is by the forest. I will see if he can build. | Praying Fajr; House later after prayer; Cedar risk of injury. |
| 20.036 | House, later after prayer | Fine, roof the house after prayer. | Order given to both villages; Idris later after prayer. |
| 22.902 | Suggestion | The order landed. What is the pending suggestion? | Yusuf → House; best builder; lapses 06:30. |
| 27.093 | shot 03 | — | Entire suggestion and commit row visible. |
| 27.332 | Send order | Yes. I would rather have known Yusuf was the builder before picking Idris. | Yusuf later after prayer; running at 8 min/s. |
| 33.795 | Order options · Yusuf | Two on the roof. Now I want somebody making meals. | D1 06:40; Yusuf on it. Worker/Place controls. |
| 36.612 | Worker · Yusuf | Change worker, then the kitchen. | Worker list. |
| 39.879 | Maryam | Maryam was beside the kitchen. That is my best guess for a cook. | D1 07:29; roof 3, meals 4; Maryam eating. |
| 43.908 | More places (3) | Meals are already appearing without my order. Kitchen is behind More places now. | D1 08:00; meals 2; Maryam cooking; place list. |
| 47.207 | Kitchen | She is cooking already, but I want to keep her there. | Maryam Kitchen: waiting. |
| 49.938 | latest order | Waiting for what? She was just cooking. | D1 08:06; on it; “Alright, I'll do it.” |
| 54.708 | shot 04 | Okay, waiting meant an answer was coming. I can still read the roof, meals and deadline above this sheet. | Latest-order sheet. |
| 54.931 | Watch village | — | D1 08:11; meals 6; later when store runs low. |
| 64.535 | first_minute | See original note above, reproduced in full. | Log echoed preceding browser snapshot. |
| 64.796 | Suggestion | What else needs a crew? | Idris → Cedar: three timber; injury risk. |
| 68.303 | Skip suggestion | No. Keep everyone alive is the job; I am not trading a worker for fast timber yet. | Suggestion closed, normal speed restored. |
| 71.496 | Human state strip | I want the material count before I redirect anybody. | Expanded roof/meal/deadline explanation; no material count in it. |
| 75.656 | collapse state strip | That repeats the target, not what timber is left. I will look at the order options. | D1 09:24; roof 4, meals 6. |
| 75.867 | Order options · Maryam | — | Worker and Place controls. |
| 90.122 | More | Maybe More has the worker details. | Village actions and panel size controls. D1 10:49; roof 5, meals 5. |
| 92.634 | Suggestion | No details there. Another suggestion is waiting. | Maryam → Forest; “Will refuse: the others would go unfed”; insist may cost trust. |
| 96.998 | Skip suggestion | Why suggest taking my cook away if she knows that would leave people unfed? I will leave her cooking. | Closed; meals 9. |
| 97.133 | Close | — | Driver error: “No actionable button named Close.” Skip had already closed it. |
| 102.333 | Order options · Maryam | Skip had already closed the sheet. I can still use Order options; this is not a driver block. | Latest visible named control worked. D1 11:39; meals 11. |
| 102.520 | Watch village | — | D1 11:41; meals 15; Kitchen done. |
| 106.997 | note | There we go, fifteen meals. I was wrong to think she would stop at six. Roof is halfway; I want to see the two villages now. | — |
| 107.283 | Classic · obey | — | D1 12:19; Classic roof 7, meals 10. |
| 111.447 | shot 05 | Classic has more roof and fewer meals. I like being able to compare the same orders. | Classic phone view. |
| 111.650 | Human · decide | — | Human roof 5, meals 12. |
| 114.843 | shot 06 | Human roof has been five for a while. I want to see Yusuf. | D1 13:19; roof now 6. Screenshot shows Yusuf “House: done.” |
| 120.530 | map point (211,303) | Yusuf says House: done, but the roof is six of ten. I am tapping him to ask for the rest. | D1 14:05; chooser offered Masjid/shelter and Well-house, not Yusuf. |
| 125.269 | Cancel | He moved while I was looking. That tap offered buildings instead. | D1 14:43; roof 7. My movement explanation is an inference. |
| 125.456 | History (3) | History should let me find his order without chasing him. | Yusuf House done; Idris House H will not, then gather timber. |
| 131.746 | shot 07 | Done must mean one piece of work, not the whole roof. It is still growing. Idris went back to timber; that makes sense now. | History phone view. This explanation of done was my guess. |
| 131.940 | Watch village | — | D1 15:36; roof 7, meals 11. |
| 147.113 | wait 15 s | I will let them work for a bit. The roof is moving without more orders. | D1 17:38; roof 7, meals 7. |
| 154.493 | Order options · Maryam | I have let most of a day pass. I want Yusuf back on the last roof sections. | D1 18:26; roof 7, meals 9; suggestion pending. |
| 154.751 | Worker · Maryam | — | Worker list. |
| 155.011 | Yusuf | — | House done, but House button “Already building: keeps him at it.” Other work will be refused because busy. |
| 160.858 | shot 08 | It says House: done above Already building: keeps him at it. I cannot tell what done is telling me. | Both statements visible together. |
| 161.083 | House, already building | Keep him at it, then. | New order; Yusuf on it. Running 8 min/s. |
| 179.019 | wait 15 s | I am watching whether that restarts the roof. I would like a timber or work explanation here. | D1 20:57; roof 8, meals 9. |
| 183.068 | pulse, engagement 3 | I care whether the roof finishes, but I am mostly checking the same counters rather than running a crew. | — |
| 183.282 | 2× | I am speeding up because the builders are working and I want to get past the night. | Running 16 min/s; D1 21:32. |
| 206.214 | wait 20 s | I am letting the night run at the offered fast speed. | D1 21:57; slowed to 1 min/s; Idris hurt at 21:40 in squall. |
| 214.575 | shot 09 | Oh, Idris got hurt in a squall already. I thought the weather deadline was tomorrow. Send him home is clear, at least. | D1 22:06; injury alert and direct Home response. |
| 214.766 | Send Idris home | Get him indoors. This is an order I actually want to give right now. | Order to both villages; Home waiting. |
| 217.801 | Suggestion | Something is still slowing the night down. What is it asking now? | Idris Home on it; Tariq → Forest; timber short; night squall/trust warning. |
| 222.275 | shot 10 | Timber is short: that is the explanation I wanted earlier. I am not sending a second man into this squall. | Full suggestion visible. |
| 222.464 | Skip suggestion | — | Running 16 min/s restored. |
| 247.283 | wait 20 s | Let them sleep. I want morning before I send anyone to fetch timber. | D2 04:52; roof 8, meals 6. |
| 252.641 | 1× | Morning. Back to normal speed so I can put Tariq on timber. | D2 06:14; Home done; meals 3. |
| 253.106 | Order options · Idris | — | Order options. |
| 253.350 | Worker · Idris | — | Worker list. |
| 257.659 | Tariq | Tariq can take the safer forest now. | D2 06:55; eating; Forest later after meal. |
| 261.707 | Forest, later after meal | Eat first, then fetch timber. | Order acknowledged; later after meal. |
| 286.062 | wait 20 s | That is the order I wanted. I am waiting for timber to turn into the last roof sections. | D2 09:09; Forest done; roof 8, meals 8; suggestion pending. |
| 290.822 | Suggestion | Timber trip done, roof still eight. I still want to see if we can make the deadline. | Samira → House; will refuse busy with own work; insist may cost trust. |
| 296.078 | Skip suggestion | Another suggestion that says she will refuse. I would rather leave the farmer on her own job. | Normal speed. “Farmer” is my interpretation. |
| 296.282 | Order options · Tariq | I will ask the builder again now the timber trip is finished. | Order options. |
| 296.498 | Worker · Tariq | — | Worker list. |
| 299.095 | Yusuf | — | D2 09:31; House done; Already building. |
| 304.147 | House, already building | I do not know if repeating this helps. It is the only roof order I can see. | New House order; waiting. |
| 307.607 | Suggestion | I keep opening this to let the clock run. What is the interruption this time? | Danyal → House; “The well can wait an hour.” |
| 310.622 | Review order | Yes, an extra pair of hands for an hour sounds useful. | Danyal → House; build; Likely yes; Rush: faster, hungrier. |
| 316.117 | shot 11 | Rush makes him hungrier. We are short of meals, but only two roof sections left. I will take that trade. | D2 09:48; roof 8, meals 7; cost and Confirm visible. |
| 316.317 | Confirm | — | Danyal House on it. |
| 341.983 | wait 20 s | Now I have put another worker on the roof. I want to see them finish it. | D2 13:15; roof 9, meals 10; House done. |
| 347.306 | note | Nine of ten and ten meals. This is close enough that I want the result, even though I am mostly watching them walk. | — |
| 362.598 | wait 15 s | I will give the builders another stretch at normal speed. | D2 15:59/16:00; roof 9, meals 8. |
| 369.300 | pulse, engagement 3 | I want the storm result now; the last roof section and meal count have me watching, but I do not feel much control over either. | — |
| 369.615 | Order options · Danyal | Three hours left. I want Maryam to cook one more pot. | D2 16:33; meals 7; slowed for suggestion. |
| 369.911 | Worker · Danyal | — | Worker list. |
| 372.630 | Maryam | — | Kitchen done; other work refusal reasons shown. |
| 376.834 | More places (2) | Kitchen has disappeared behind More places again. That is the place I keep needing. | Place list with Kitchen. |
| 377.127 | Kitchen | — | D2 16:41; on it. |
| 401.589 | wait 20 s | Last pot ordered. I want to see what the storm does to our almost-finished roof. | D2 18:14; roof 9, meals 17; slowed, suggestion pending. |
| 406.152 | Suggestion | Seventeen meals, good. What can I do about the last roof section? | “The roof will not be on before the storm. Shutter the house?” Unshuttered house loses stages; shuttering stops work. |
| 409.719 | Review order | That is a proper decision. Protect the nine sections rather than gamble them on finishing one. | Yusuf → House; “build the house · Likely yes”; shutter warning still shown. |
| 415.398 | shot 12 | Hang on, this says build the house, not shutter it. I came here to close it up. I am trusting the suggestion, but the label makes me nervous. | D2 18:28; review sheet reads build. |
| 415.642 | Confirm | I will confirm the shutter suggestion and see what he says. | Yusuf → House; on it. No shutter-specific acknowledgement encountered. |
| 429.620 | wait 10 s | I am watching the storm arrive to find out whether that protected the house. | D2 20:21; roof 9, meals 9; Idris hurt outdoors at 19:40. |
| 437.935 | want_quit, CONFUSED | I sent Idris home last night, and now he is hurt out in the open again. I cannot tell whether my home order wore off or whether shuttering happened. I would put the phone down here. | — |
| 438.401 | Show Idris | One look at Idris before I leave; I want to know where he ended up. | Reply had advanced to D2 21:30/21:31; alert now Yusuf hurt outdoors at 21:00. No driver error. |
| 446.253 | shot 13 | Now Yusuf is hurt as well. I am done for this sitting; I do not understand what protection I actually ordered. | D2 22:34; newest alert Idris hurt outdoors at 22:10. |
| 446.302 | stop, CONFUSED | I am stopping. I would not leave this running. I might try it once more another evening, but I do not want to keep repeating House and Home while I cannot tell what they will keep doing. | Roof 9, meals 9; game running. |
| 451.923 | resize 1280×800, after stop | Post-stop desktop look only. | Goal results and both villages visible. |
| 452.169 | shot 14, after stop | — | D2 23:21; roof goal failed for both at 9/10; stock met at 12 Classic / 17 Human; survival open, 6/6 each, due D3 05:00. Current Classic house 10/10, Human 9/10. |

## Best, worst, stopping and pulses

Best moment: 406.152–409.719 s, the shutter choice. I had nine roof sections and enough food. Protecting work already done felt like an actual shift-lead decision. This was the highest engagement, qualitatively; no extra numerical pulse was logged for it. Sending hurt Idris home at 214.766 s was the clearest direct order I wanted to give.

Worst moment: 415.398–446.302 s. The shutter review called the action “build the house,” then workers were hurt outside. I could not tell which part was a consequence of my choice and which part I had misunderstood. This is uncertainty about the visible action and its duration, not a claim that a Home order must last forever or that injury should be removed.

Every want_quit: one, at 437.935 s, CONFUSED, quoted above. It did not pass. I tried Show Idris once, then stopped 8.367 s later. No earlier wish to leave was recorded. Comments about mostly watching at 183.068 s and 347.306 s coexist with an explicit desire to see the result; they are preserved for a separate reader to interpret.

Pulse series:

| Elapsed | Engagement | Original reason |
|---|---:|---|
| 183.068 s / 3:03.1 | 3/5 | I care whether the roof finishes, but I am mostly checking the same counters rather than running a crew. |
| 369.300 s / 6:09.3 | 3/5 | I want the storm result now; the last roof section and meal count have me watching, but I do not feel much control over either. |

Hard, but kept going: no qualifying search for an easier setting, workaround or accessibility option. I used the visible 2× speed to get past night and returned to 1× in the morning. That was waiting by choice, not a search for easier difficulty. I stayed because the roof was nearly finished and I wanted the result.

I would not leave the simulation running. A voluntary return is possible once another evening, but tentative; I did not want to continue this sitting. I stopped before the survival deadline and did not finish the game.

## Clarity findings

### DL-10 — FAIL: the shutter action changed its name at confirmation

At 406.152 s the suggestion asked, “Shutter the house?” It explained that shuttering stops roof work and prevents losing stages. At 409.719–415.398 s, Review order displayed “build the house · Likely yes.” Confirm acknowledged only Yusuf → House. I could not tell whether I had shuttered or ordered more building. Screenshot `12-shutter-review-phone.png` and diary 406.152–415.642 s. The suggestion's exact shutter wording is in the driver reply/diary; the screenshot shows the conflicting build label and warning. I did confirm. I did not establish what operation the simulation executed.

### DL-5 — FAIL later in play: “done” did not tell me what was underway

At 155.011–160.858 s, “Yusuf · House: done” appeared together with “Already building: keeps him at it.” Roof was 7/10. At 299.095 s the same pairing recurred at 8/10. I repeated House because I could not tell whether another request was needed. Screenshot `08-yusuf-done-building-phone.png`; diary 155.011–161.083 and 299.095–304.147 s. My earlier explanation that done meant one piece of work was a guess, not a discovered rule.

The Home order also went on it and then done, followed later by Idris being hurt outdoors. I did not learn whether Home means a visit, rest until recovered, or a lasting assignment. The injury itself is not a clarity failure. Its relationship to the completed Home order was unclear to me. Diary 214.766, 252.641, 429.620 and 437.935 s.

### DL-9 — FAIL on the phone for resolved goal status encountered after the deadline

After Day 2 19:00, the phone strip still showed roof 9/10, meals 9/12 and “Storm Day 2 19:00.” I could tell the time had passed, but did not encounter a met/failed result or the separate D3 05:00 survival deadline in this phone view. The one desktop look exposed roof failed, stock met at the deadline, and survival still open. Screenshot `13-stop-phone.png` versus `14-desktop-after-stop.png`. I had expanded the phone state strip earlier at 71.496 s, before the deadline; I did not expand it again after the deadline. This finding is about the visible phone strip I used, not proof that no phone control can reveal results.

### DL-30 — FAIL on the post-stop desktop look only

At 1280×800 the injury sentence wrapped into a very narrow column beside the two response buttons, then was visibly cut off. The visible fragment is “Hurt / Day 2 · / 22:10 Idris / (Human), / hurt in / the”. The driver text gave the full sentence “hurt in the storm, out in the open,” but those final words are not visible in screenshot `14-desktop-after-stop.png`. This did not cause the phone stop and is not a phone clipping finding.

## Required language, layout and hands-on checks

| Check | Status | Observation and limits |
|---|---|---|
| DL-20 English | PASS for reached actions | House, Forest, Kitchen, Home, refusal reasons, risks, speed and deadlines were in English. “After I pray Fajr” made the needed condition understandable without knowing the prayer's name. A map-target chooser labelled “Masjid · shelter.” No necessary unexplained local unit encountered. |
| DL-21 Dates | PASS for reached comparisons | D1/D2 clock and “Storm Day 2 19:00” let me compare tomorrow with today, then hours remaining on Day 2. Suggestion deadlines included “in 47 min,” “in 50 min,” etc. Desktop survival due D3 05:00 was also understandable. Month/year crossover and return after a break: NOT TESTED. Missing phone goal status is separate from date translation. |
| DL-22 Phone response visible | PASS for tested sheets | Suggestions, latest-order replies, immediate place orders, risk/cost text encountered and commit buttons were visible without scrolling. I used More places as a labelled way to reach Kitchen. Screenshots 03, 04, 08, 10, 11, 12. This says nothing about unreached sheets or keyboard-open forms. |
| DL-30 Phone nothing cut off | PASS for essential text encountered | No action-critical sentence cut midway, no “Scroll ↓” hiding a response, no overlapping sheets encountered in the saved phone views. History was a longer list: screenshot 07 shows Maryam/Yusuf entries, with lower content outside the visible list area; I did not need to scroll it for a pending decision. I do not treat that optional longer history as a clipped immediate answer. Desktop failure reported separately above. |
| DL-31 State while acting | PASS for tested phone orders | Roof, meals and storm deadline stayed at the top. In screenshot 11, Danyal was selected in the visible scene while the rush cost and Confirm were shown. Screenshot 12 likewise kept Yusuf, roof 9/10, meals 17/12 and deadline visible with the review. The separate survival deadline was not shown in that strip; see DL-9. |
| DL-32 Hands available | NOT TESTED as a continuous cadence claim | Longest explicit single watch command was 20 real seconds. I chose those waits to see work finish, pass night or reach the storm. Other workers/orders remained available. I did not establish a forced interval in which no meaningful act was possible, and did not verify a hands-on act every 20 seconds. “Mostly watching” describes my experience, not proof of no available actions. |
| DL-33 Scene act versus form | PASS for ordinary place orders reached; limited | Choosing a worker put labelled House/Forest/etc. buttons over the scene. A House or Forest tap gave the order directly, without a mandatory confirmation form. Send Idris home was also direct. More places opened a list for Kitchen. Rush and the shutter suggestion used Review order → Confirm. I did not test every core verb or establish successful direct tapping of a moving person; my one map attempt selected nearby buildings. |

Additional observations: accepted inputs were promptly acknowledged (DL-13), with “waiting” changing to a reply on the live clock. This acknowledgement worked even though the later meaning of done was unclear. Costs were visible before the rush confirmation and risky suggestions (DL-14, reached cases). At 2×, a night suggestion slowed the clock to 1 min/s; I read it and skipped it before it lapsed, and 16 min/s returned (DL-15, reached case). Refusal warnings were comprehensible, but I did not attempt an insist order. I did not test save/resume, export/replay, sending, 320 px, 200% text, themes, target dimensions, or all action types. Builder-only checks are NOT TESTED.

## Post-stop desktop look

One resize and one screenshot only; no resumed play. It made the comparison much easier to read: both villages and deadline results were visible at once. At D2 23:21 both roof goals were marked failed at 9/10 at the deadline, stock met at 12 meals Classic and 17 Human, survival open at 6/6 for each, due D3 05:00. Current Classic house was 10/10 while the deadline result remained failed at 9/10; I can distinguish current progress from the recorded deadline result in that layout. These observations were learned after stopping and do not improve the phone checkpoint or reverse my stop. The desktop injury sentence was clipped as described above.

## Changes I would want as Bram, ranked

1. Keep the intended action's name through review and acknowledgement. If I choose shutter, tell me I am confirming shutter and whether it happened.
2. Tell me what a completed order leaves the person doing. “Done” beside “Already building” and a completed Home visit did not answer that for me.
3. Keep the deadline results visible on the phone after the deadline, including whether food was met at the deadline even if people eat it afterward.

These are this player's requests, not a recommendation to reduce difficulty, remove refusals or prevent injury.
