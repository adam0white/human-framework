# Twice at the Well — Bram, free stop

## Session

Bram, 35, warehouse shift lead. Plays Mini Motorways, RimWorld on PC, and Bad North. Likes quick orders and watching people carry them out. Curious; an evening at home, phone in hand.

URL: https://human.adamwhite.work/colony/. No build identifier was visibly encountered. Access: supplied standard `npm run lab:play` driver, port 43606, PID 24757. Device: 360×690 CSS px, touch emulation, light mode, default text. Default village: “The storm comes when it comes.” Floor 0, ceiling 25 real minutes.

First usable screen: elapsed 0.433 s. Play: 6.080 s. First work order: 23.607 s. First want_quit: 368.396 s (6:08), CONFUSED. Stop: 374.990 s (6:15), CONFUSED. About 6:14.6 from the first usable screen. Last refreshed playing view: D2 18:40. The stop log reused that view, so the exact game clock at stop was not refreshed. I did not finish the game.

Time ran between commands. At 117.184 s I changed 1× to 2× to watch working villagers. At 339.821 s I changed 2× to ½× because I wanted another roof order before the storm and menus took time. Pending suggestions automatically slowed the clock to 1 game minute per real second; dismissing or sending restored the chosen speed. Real time and game time are separate below.

No game source, tests, other repository documents, prior reports, bundles, network payloads, hidden state or debug APIs were inspected. I did not send runs, submit telemetry or change consent. No export was downloaded. The driver was killed by exact PID after the required post-stop desktop look.

## First minute

Protocol deviation: the first-person checkpoint was logged at 68.704 s, about nine seconds late, after a wait returned at 62.204 s. The driver also automatically captured `first-minute.png` at 60.043 s. The ratings below use observations reached by 60 s only. The six-meal reading at 62.204 s is excluded. Later knowledge does not upgrade these ratings.

| Item                       | Status                        | Evidence through 60 s                                                                                                                                                                                                                                                                                                                                    |
| -------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 A reason to act       | PASS                          | I needed a roof and twelve meals before tomorrow evening’s storm. The opening goal and roof/meal/deadline strip told me.                                                                                                                                                                                                                                 |
| DL-2 What can I touch      | PASS for controls tried       | Before acting I named Play and village choices. Worker and place buttons worked. No inert target was tried. Selected Idris had a ring and dark nameplate in screenshot 03. Direct selection of other map people was not yet tested.                                                                                                                      |
| DL-3 Urgency and selection | PASS                          | Roof and meals drew me first; Storm Day 2 19:00 supplied urgency. Idris’s ring/nameplate and Forest answer identified selection.                                                                                                                                                                                                                         |
| DL-4 Why the limit         | FAIL, partial understanding   | Confirm said to choose worker/place. Yusuf would wait until after prayer and then agreed. Maryam’s “the others would go unfed” explained refusal, but I could not tell what would free her. No claim that the game has no such rule. Builder capability checks NOT TESTED.                                                                               |
| DL-5 Readable situation    | PASS                          | Yusuf’s House order became “on it”; roof rose from two to three. Idris was gathering timber and said “Fine.” I could choose another worker or inspect an order. “Suggestion pending” was still unexplained.                                                                                                                                              |
| DL-6 A choice soon         | PASS                          | Village setup choice available on first usable screen at 0.433 s; Play input 6.080 s. Worker choice available 8.730 s; Maryam input 11.942 s. First work order 23.607 s. Opening goal and instruction had 20 essential words before setup choices.                                                                                                       |
| DL-7 Learn by doing        | PASS for reached interactions | Two accepted place orders: Yusuf → House and Idris → Forest. The first taught me orders can wait for prayer; the second showed people can already be doing their assigned work. One stale Forest label failed, and the current label worked. No help used. Four interaction types NOT TESTED in this minute: risky-order review, insistence, Rush, Home. |

Original checkpoint answers:

> I need a roof and twelve meals before tomorrow evening. Play, worker buttons and place buttons look tappable; I have not tried an inert thing. Roof and meals draw me first, and Idris is selected with a ring and a dark nameplate. Maryam would leave people unfed; Yusuf would go after prayer; Confirm needed a person and place. I do not yet know what would free Maryam. Yusuf accepted the house order after prayer and the roof rose to three; Idris was already gathering timber, and my forest order got Fine. I can pick another worker or inspect an order. First setup choice was there immediately; I pressed Play at six seconds, picked Maryam at twelve, and gave the first work order at twenty-four. The direct place tap taught me orders can wait for a person. I have not opened help. Suggestion pending still shows even though Idris says on it; I am not sure what is pending.

## Important visible answers

These are observations, separate from my diary. Times are real elapsed seconds. Screenshot numbers refer to the artifact list.

| Elapsed s       | Input or moment                  | Visible answer                                                                                                                                      |
| --------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.433           | Open                             | D1 05:00 paused. “Roof the house, store 12 meals and keep everyone alive before the storm.”                                                         |
| 11.942          | Maryam                           | Cooking; House/Forest “Will refuse: the others would go unfed.”                                                                                     |
| 19.455–23.607   | Yusuf, House                     | “Later: after I pray Fajr”; order given to both villages.                                                                                           |
| 27.641          | Shot 02                          | D1 06:16; Yusuf “on it”; “Alright, I’ll do it.” Meals 4.                                                                                            |
| 35.539          | Idris                            | Roof 3, Meals 4; drinking; Forest later after a drink.                                                                                              |
| 38.436          | Old Forest label                 | Not on page now. Fresh label: “Already gathering timber: keeps him at it.” Game state, not driver failure.                                          |
| 44.937–49.572   | Current Forest label, Shot 03    | Order waiting, then on it; “Fine.”                                                                                                                  |
| 73.738–77.742   | Suggestion, Shot 04              | Idris → Cedar; three timber at once; can hurt whoever fells it; lapses 09:00. Full risk sentence in transcript, partial sentence in screenshot.     |
| 81.135          | Skip suggestion                  | Running 8 min/s restored.                                                                                                                           |
| 86.635          | Coordinate tap meant for Samira  | Sent Idris → Field, later after drink.                                                                                                              |
| 93.485          | Order options                    | Idris: “Not that — I’ll gather timber; that is my work.”                                                                                            |
| 101.593         | Suggestion                       | Maryam → Forest; refusal because people would go unfed; insisting may cost trust. Skipped.                                                          |
| 108.832         | Classic map                      | Roof 7, Meals 6; Samira gathering timber. Place predictions explicitly prefixed Human.                                                              |
| 111.369         | History                          | Idris Field: Classic finished grain; Human “will not.” Yusuf House: Human laid another course; House 3 of 10, work remains.                         |
| 146.915–155.115 | Evening suggestion, Send         | “One more wall before dark, if he is not spent.” Yusuf → House on it.                                                                               |
| 168.740–175.417 | State strip, retry current label | Meals changed, making old label stale. Current label worked. Human roof 8, meals 6. Idris hurt in squall at D1 21:40; Send Idris home / Show Idris. |
| 181.718–187.021 | Send Idris home, Shot 05         | Home waiting then on it; “Fine.” Hurt alert remained.                                                                                               |
| 190.887         | Suggestion                       | Tariq awake, timber short; night squall and trust warning. Skipped.                                                                                 |
| 225.340         | After night wait                 | D2 06:10; Home “can’t — I’m asleep”; roof 8, meals 3.                                                                                               |
| 231.197–233.815 | Latest Home order, Shot 06       | “Home asks them to eat once. After eating, they choose their own work again; it does not keep them indoors.”                                        |
| 241.395–244.281 | Morning timber suggestion, Send  | Tariq rested; usual small slip risk by day; Forest later after drink.                                                                               |
| 253.765–256.559 | Yusuf, House                     | Likely yes; sent waiting then on it.                                                                                                                |
| 259.659         | Suggestion                       | Samira House: will refuse, busy with own work; trust warning. Skipped.                                                                              |
| 291.835–295.015 | Danyal suggestion, Review        | “The well can wait an hour.” Rush selected, faster/hungrier; Likely yes.                                                                            |
| 298.942–306.095 | Rush off, Shot 07, Confirm       | Prediction changed to after food, then after rest. Danyal House sent, later after rest.                                                             |
| 329.797         | Work wait ends                   | D2 16:30; Roof 9, Meals 7. Danyal laid another course; work remains.                                                                                |
| 332.395–335.312 | Cook suggestion, Send            | “Nobody can cook from 19:00 until 03:00.” Maryam Kitchen on it.                                                                                     |
| 339.821–342.774 | Slower speed, options            | Meals rose to 13 then 17; Roof 9.                                                                                                                   |
| 350.344         | Yusuf                            | House “Already building: keeps him at it.” Latest completed order still described House 8.                                                          |
| 353.126         | Suggestion                       | “The roof will not be on before the storm. Shutter the house?” Unshuttered unfinished house loses stages; shuttering stops roof work.               |
| 357.226–360.712 | Review, Shot 08                  | Yusuf House; “build the house · Likely yes.” Shuttering warning in transcript, outside visible phone body.                                          |
| 363.658         | Confirm                          | Yusuf House on it. No explicit shutter confirmation.                                                                                                |
| 368.589         | Latest-order check               | “Human · House: on it”; “Latest Human reply: Fine.”                                                                                                 |

## Verbatim diary

Every generated driver entry follows, including errors, automatic screenshot, checkpoint, pulses, want_quit, stop and post-stop inspection. Reactions are verbatim. Game-clock strings are the last readings I supplied before inputs; the table above records refreshed answers. The JSONL preserves exact timestamps. An entry with no reaction is labelled as such rather than supplied with a later reaction.

- **0.432 s · input / open** · game clock: not supplied

  Input: `{}`

  “I want to see who needs orders and what needs doing.”

- **3.277 s · input / shot** · game clock: D1 05:00 Paused

  Input: `{"file": "01-opening-phone.png"}`

  “Play and the village choices look tappable. Roof, meals and a storm deadline give me a job. I will take the default village.”

- **6.079 s · input / tap** · game clock: D1 05:00

  Input: `{"name": "Play", "role": "button"}`

  “Let me put someone on that roof.”

- **8.728 s · input / tap** · game clock: D1 05:00 -> running

  Input: `{"name": "Choose person", "role": "button"}`

  “The people must be under Choose person; I want a builder.”

- **11.941 s · input / tap** · game clock: D1 05:21

  Input: `{"name": "Maryam", "role": "button"}`

  “No skills listed yet. I will start with Maryam.”

- **14.775 s · input / tap** · game clock: D1 05:32 Slow

  Input: `{"name": "Order options · Maryam", "role": "button"}`

  “She is cooking and will refuse the roof because people would go unfed. Fair enough; I need somebody else.”

- **17.441 s · input / tap** · game clock: D1 05:35

  Input: `{"name": "Worker · Maryam", "role": "button"}`

  “Worker should let me swap her out.”

- **19.455 s · input / tap** · game clock: D1 05:37

  Input: `{"name": "Yusuf", "role": "button"}`

  “Try Yusuf for the roof.”

- **23.607 s · input / tap** · game clock: D1 05:39

  Input: `{"name": "House Later: after I pray Fajr", "role": "button"}`

  “After prayer is fine. I expect this to queue his roof work.”

- **27.641 s · input / shot** · game clock: D1 05:44 Running

  Input: `{"file": "02-yusuf-queued-phone.png"}`

  “That was a quick order with a clear later answer. I want to see him actually get there.”

- **30.605 s · input / tap** · game clock: D1 06:16

  Input: `{"name": "Order options · Yusuf", "role": "button"}`

  “Meals are rising without my help. I will put another worker on supplies.”

- **33.237 s · input / tap** · game clock: D1 06:40

  Input: `{"name": "Worker · Yusuf", "role": "button"}`

  “I am using a menu to switch workers; I would rather tap the people if that works.”

- **35.538 s · input / tap** · game clock: D1 07:01

  Input: `{"name": "Idris", "role": "button"}`

  “Let us see what Idris can do.”

- **38.436 s · tool / tap** · game clock: D1 07:20

  Input: `{"name": "Forest Later: after I drink at the well", "role": "button"}`

  “The roof is moving now. I assume forest means wood; I will send Idris there after his drink.”

  Driver answer: Forest Later: after I drink at the well is not on the page now; it was listed 3 s ago and the page has changed (game state, not a driver failure)

- **44.936 s · input / tap** · game clock: D1 07:43

  Input: `{"name": "Forest Already gathering timber: keeps him at it", "role": "button"}`

  “He started gathering timber himself before I gave the order. Keep at it then.”

- **49.572 s · input / shot** · game clock: D1 08:04 Slow

  Input: `{"file": "03-idris-selected-phone.png"}`

  “Two orders in. I can see roof and meals, but I have not needed to manage much yet.”

- **60.043 s · first_minute / shot** · game clock: not supplied

  Input: `{"file": "first-minute.png"}`

  No reaction recorded.

- **62.204 s · input / wait** · game clock: D1 08:09 Slow

  Input: `{"s": 7}`

  “Watching whether Idris goes and the roof grows.”

- **68.704 s · first_minute / log** · game clock: D1 08:21 Slow

  Input: `"60-second checkpoint, logged just after wait returned"`

  “I need a roof and twelve meals before tomorrow evening. Play, worker buttons and place buttons look tappable; I have not tried an inert thing. Roof and meals draw me first, and Idris is selected with a ring and a dark nameplate. Maryam would leave people unfed; Yusuf would go after prayer; Confirm needed a person and place. I do not yet know what would free Maryam. Yusuf accepted the house order after prayer and the roof rose to three; Idris was already gathering timber, and my forest order got Fine. I can pick another worker or inspect an order. First setup choice was there immediately; I pressed Play at six seconds, picked Maryam at twelve, and gave the first work order at twenty-four. The direct place tap taught me orders can wait for a person. I have not opened help. Suggestion pending still shows even though Idris says on it; I am not sure what is pending.”

- **73.738 s · input / tap** · game clock: D1 08:21 Slow

  Input: `{"name": "Suggestion", "role": "button"}`

  “What is the suggestion that is keeping this slow?”

- **77.742 s · input / shot** · game clock: D1 08:33 Slow; suggestion lapses 09:00

  Input: `{"file": "04-cedar-suggestion-phone.png"}`

  “Three timber is tempting but I do not need an injury. I can leave him gathering normally.”

- **81.135 s · input / tap** · game clock: D1 08:37; lapses 09:00

  Input: `{"name": "Skip suggestion", "role": "button"}`

  “Skip the risky tree. I want steady work.”

- **86.635 s · input / tap** · game clock: D1 08:41 Running

  Input: `{"x": 354, "y": 251}`

  “I will try tapping Samira by the field instead of using the worker menu.”

- **89.715 s · note / log** · game clock: D1 09:25

  Input: `"Observed coordinate tap result: Idris → Field"`

  “Oh, I just ordered Idris to the field. I meant to select Samira. The place wins over the person there. That is not what I wanted.”

- **93.485 s · input / tap** · game clock: D1 09:25

  Input: `{"name": "Order options · Idris", "role": "button"}`

  “Back to the menu. I need a reliable worker selector.”

- **96.002 s · input / tap** · game clock: D1 10:20

  Input: `{"name": "Worker · Idris", "role": "button"}`

  “He refused and went back to timber. Good, that mistake did not derail him.”

- **98.836 s · input / tap** · game clock: D1 10:40

  Input: `{"name": "Samira", "role": "button"}`

  “Samira this time.”

- **101.592 s · input / tap** · game clock: D1 10:47 Slow

  Input: `{"name": "Suggestion", "role": "button"}`

  “Everyone already has their own job. What does the game think needs changing?”

- **104.586 s · input / tap** · game clock: D1 10:49; suggestion lapses 11:45

  Input: `{"name": "Skip suggestion", "role": "button"}`

  “Why would I pull the cook off meals when meals are the goal? No, leave her there.”

- **108.832 s · input / tap** · game clock: D1 10:53

  Input: `{"name": "Classic · obey", "role": "button"}`

  “Each order goes to both villages. I want to see what the obeying village did with my accidental field order.”

- **111.369 s · input / tap** · game clock: D1 11:27

  Input: `{"name": "History (3)", "role": "button"}`

  “Classic is ahead on roof but lower on food. Did Idris actually switch jobs there?”

- **114.201 s · input / tap** · game clock: D1 11:47

  Input: `{"name": "Watch village", "role": "button"}`

  “Yes, Classic did the field order and Human refused. That comparison is interesting. I want to watch a little faster until something needs me.”

- **117.183 s · input / tap** · game clock: D1 12:10; changing 1x to 2x

  Input: `{"name": "2×", "role": "button"}`

  “Speeding up because the workers have jobs and I am waiting for progress.”

- **139.950 s · input / wait** · game clock: D1 12:35 Running 16 min/s

  Input: `{"s": 20}`

  “Watching the village work at 2x. I want to see whether meals build up before the storm.”

- **146.909 s · input / tap** · game clock: D1 18:25 Slow

  Input: `{"name": "Suggestion", "role": "button"}`

  “Roof in Classic has stuck at seven. Maybe this suggestion is something useful.”

- **155.114 s · input / tap** · game clock: D1 18:32; lapses 19:25

  Input: `{"name": "Send order", "role": "button"}`

  “Yes. Get that last daylight work in.”

- **163.132 s · input / tap** · game clock: D1 18:42 Running 16 min/s

  Input: `{"name": "Human · decide", "role": "button"}`

  “How is Human doing after leaving people to their jobs?”

- **168.739 s · tool / tap** · game clock: D1 20:51

  Input: `{"name": "Human · Roof 8 of 10 Meals 9 / 12 Storm Day 2 19:00", "role": "button"}`

  “Nearly there. I want to know whether anything is short before tomorrow.”

  Driver answer: Human · Roof 8 of 10 Meals 9 / 12 Storm Day 2 19:00 is not on the page now; it was listed 6 s ago and the page has changed (game state, not a driver failure)

- **175.416 s · input / tap** · game clock: D1 21:37 Slow

  Input: `{"name": "Human · Roof 8 of 10 Meals 6 / 12 Storm Day 2 19:00", "role": "button"}`

  “Meals dropped while I was looking. Open the current state.”

- **181.514 s · pulse / log** · game clock: D1 21:44 Slow

  Input: `"Three-minute pulse"`

  “Idris is hurt now; this is the first moment I need to look after somebody rather than repeat their job.”

  Engagement: **4/5**.

- **181.717 s · input / tap** · game clock: D1 21:44; Idris hurt 21:40

  Input: `{"name": "Send Idris home", "role": "button"}`

  “Get him home. I avoided the cedar, but a squall hurt him anyway.”

- **187.020 s · input / shot** · game clock: D1 21:50 Slow

  Input: `{"file": "05-hurt-idris-phone.png"}`

  “The injury gives me a clear home button. I want to know if he is safe once he gets there.”

- **190.886 s · input / tap** · game clock: D1 21:56 Slow

  Input: `{"name": "Suggestion", "role": "button"}`

  “Another pending suggestion. I will check it before the night drags.”

- **195.060 s · input / tap** · game clock: D1 21:59; storm D2 19:00

  Input: `{"name": "Skip suggestion", "role": "button"}`

  “Not sending another man into the squall after that injury. We have tomorrow.”

- **197.730 s · input / tap** · game clock: D1 22:05

  Input: `{"name": "Human · Roof 8 of 10 Meals 6 / 12 Storm Day 2 19:00", "role": "button"}`

  “Close the extra state paragraph so I can see the village again.”

- **225.339 s · input / wait** · game clock: D1 22:48 Running 16 min/s

  Input: `{"s": 25}`

  “Letting the night go. I am waiting for morning so I can put people back on the roof safely.”

- **231.197 s · input / tap** · game clock: D2 06:10

  Input: `{"name": "Open Idris’s latest order: Home: can't — I'm asleep", "role": "button"}`

  “Was he already home when he fell asleep, or did my home order fail?”

- **233.814 s · input / shot** · game clock: D2 07:02 Slow

  Input: `{"file": "06-home-answer-phone.png"}`

  “Home only means eat once, not shelter? I thought Send Idris home meant get him out of the storm. I learned that after sending it.”

- **238.994 s · input / tap** · game clock: D2 07:05

  Input: `{"name": "Watch village", "role": "button"}`

  “I will leave him asleep. Need the roof finished now.”

- **241.394 s · input / tap** · game clock: D2 07:10 Slow

  Input: `{"name": "Suggestion", "role": "button"}`

  “What is pending this morning?”

- **244.279 s · input / tap** · game clock: D2 07:12; lapses 08:00

  Input: `{"name": "Send order", "role": "button"}`

  “Yes. Daylight and rested is what I was waiting for. Get us that timber.”

- **247.513 s · input / tap** · game clock: D2 07:17

  Input: `{"name": "Order options · Tariq", "role": "button"}`

  “Now get Yusuf back to the house. Two stages left.”

- **251.495 s · input / tap** · game clock: D2 08:09

  Input: `{"name": "Worker · Tariq", "role": "button"}`

  “Switch to Yusuf.”

- **253.764 s · input / tap** · game clock: D2 09:00 Slow

  Input: `{"name": "Yusuf", "role": "button"}`

  “Please be ready to build.”

- **256.559 s · input / tap** · game clock: D2 09:03

  Input: `{"name": "House Likely yes", "role": "button"}`

  “Build the next stage.”

- **259.652 s · input / tap** · game clock: D2 09:05 Slow

  Input: `{"name": "Suggestion", "role": "button"}`

  “Clear this suggestion so work time runs again.”

- **262.381 s · input / tap** · game clock: D2 09:08

  Input: `{"name": "Skip suggestion", "role": "button"}`

  “Leave the grain worker alone. I need meals too.”

- **287.892 s · input / wait** · game clock: D2 09:13 Running 16 min/s

  Input: `{"s": 20}`

  “Watching Yusuf work. I want that roof tick and meals to twelve; no other order I want right now.”

- **291.835 s · input / tap** · game clock: D2 09:54 Slow

  Input: `{"name": "Suggestion", "role": "button"}`

  “It slowed down again almost straight away. Another suggestion to dismiss?”

- **295.015 s · input / tap** · game clock: D2 09:58; lapses 10:30

  Input: `{"name": "Review order", "role": "button"}`

  “Fine, get Danyal to help finish it. I want to know why this needs review.”

- **298.942 s · input / tap** · game clock: D2 10:01 Slow

  Input: `{"name": "Rush · faster, hungrier", "role": "button"}`

  “Rush is selected. Turn that off; meals are still short.”

- **302.115 s · input / shot** · game clock: D2 10:05 Slow

  Input: `{"file": "07-danyal-order-phone.png"}`

  “Roof eight, meals eight, deadline tonight, Danyal after food. I can make that call.”

- **306.094 s · input / tap** · game clock: D2 10:08

  Input: `{"name": "Confirm", "role": "button"}`

  “Now he needs rest instead. Queue it anyway; I hope he will get to it.”

- **329.796 s · input / wait** · game clock: D2 10:14 Running 16 min/s

  Input: `{"s": 20}`

  “Waiting for the two house orders to show up in the roof. I am watching more than directing now.”

- **332.395 s · input / tap** · game clock: D2 16:30; storm 19:00

  Input: `{"name": "Suggestion", "role": "button"}`

  “One roof stage left and not enough meals. This is close. What can I do before seven?”

- **335.312 s · input / tap** · game clock: D2 16:32; no cooking 19:00-03:00

  Input: `{"name": "Send order", "role": "button"}`

  “Cook the pot. That is a clear reason to act before the storm.”

- **339.820 s · input / tap** · game clock: D2 16:37; changing 2x to half speed

  Input: `{"name": "½×", "role": "button"}`

  “Slow down. I want one more roof order before the deadline and these menus take time.”

- **342.773 s · input / tap** · game clock: D2 17:48 Running 4 min/s

  Input: `{"name": "Order options · Maryam", "role": "button"}`

  “Meals made it. Yusuf for the last roof stage.”

- **347.759 s · input / tap** · game clock: D2 18:00 Slow

  Input: `{"name": "Worker · Maryam", "role": "button"}`

  “Choose Yusuf.”

- **350.343 s · input / tap** · game clock: D2 18:04 Slow

  Input: `{"name": "Yusuf", "role": "button"}`

  “Please finish it before seven.”

- **353.126 s · input / tap** · game clock: D2 18:07 Slow

  Input: `{"name": "Suggestion", "role": "button"}`

  “He is already building. Leave him at it; what is the last suggestion?”

- **357.022 s · pulse / log** · game clock: D2 18:10 Slow

  Input: `"Six-minute pulse"`

  “One stage short with food stored and a shutter decision. I want to save the work, even if we miss the full roof.”

  Engagement: **4/5**.

- **357.226 s · input / tap** · game clock: D2 18:10; storm 19:00

  Input: `{"name": "Review order", "role": "button"}`

  “Shutter it. I do not want the nine stages washed away.”

- **360.711 s · input / shot** · game clock: D2 18:14 Slow

  Input: `{"file": "08-shutter-review-phone.png"}`

  “It offered shuttering, but this review says build the house. I am not sure what Confirm will send.”

- **363.658 s · input / tap** · game clock: D2 18:17

  Input: `{"name": "Confirm", "role": "button"}`

  “I came here through Shutter the house, so I will confirm and check what it says.”

- **368.396 s · want_quit / log** · game clock: D2 18:21 Running 4 min/s

  Input: `"Wish to leave after shutter review and confirmation"`

  “I would put this down now. I wanted to shutter the house, but the confirmation and answer only say House and build. I do not know whether I protected it. I will check the latest order once before leaving.”

  Reason: **CONFUSED**.

- **368.589 s · input / tap** · game clock: D2 18:21

  Input: `{"name": "Open Yusuf’s latest order: House: on it", "role": "button"}`

  “Does the latest order say shutter or build?”

- **374.990 s · stop / log** · game clock: D2 18:40; Human Roof 9/10 Meals 16/12; storm D2 19:00

  Input: `"Stop after one latest-order check"`

  “Stopping here. The latest order only says House: on it and Fine, so I still cannot tell whether I shuttered it. The wish to leave did not pass. I would not return voluntarily tonight; I wanted the storm decision to be readable.”

  Reason: **CONFUSED**.

- **375.150 s · input / resize** · game clock: Post-stop; last playing view D2 18:40

  Input: `{"width": 1280, "height": 800}`

  “Post-stop desktop look only; no further play.”

- **375.346 s · input / shot** · game clock: Post-stop

  Input: `{"file": "09-post-stop-desktop.png"}`

  “Post-stop desktop screenshot only.”

## Best, worst, leaving, and pulses

Best moment: 332–339 s, the pre-storm pot. At roof 9 and meals 7, I learned the fire would be out from 19:00 until 03:00, sent Maryam to cook, and saw meals pass twelve. A quick order met a clear need with visible progress. The Classic/Human history comparison at 111 s also interested me: my mistaken field order had different answers.

Worst moment: 353–369 s. The shutter suggestion led to a build-labelled review and a generic House answer. I could not tell what I had ordered when the house needed protection.

Every want_quit: one at 368.396 s, CONFUSED. Stop: 374.990 s, CONFUSED. The wish did not pass after one latest-order check. I would not return voluntarily tonight. I was leaving the session, not choosing idle progress or a later return.

Pulse series: 181.514 s, 4/5, injury created a reason to look after somebody; 357.022 s, 4/5, a one-stage-short roof and shutter choice made me want to save the work. No other pulse occurred before stopping.

Hard, but kept going: yes. At 339.821 s I used ½× because the deadline was approaching faster than I could navigate the worker menus. I stayed because meals were close and I wanted the last roof stage. This was a clock/navigation aid. Earlier 2× was for watching work.

## Clarity findings

| ID            | Status                                                                 | Observation and uncertainty                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DL-2          | FAIL later for my selection understanding; first-minute PASS unchanged | At 86.635 s I tried a coordinate tap where Samira had been shown by the field. It sent selected Idris to Field. I cannot prove she remained under that point: the screenshot was about nine seconds old and the scene was live. This records confusion, not proof of overlapping hit targets.                                                                                                                            |
| DL-4          | FAIL for explanation reached                                           | Maryam’s refusal told me why she stayed cooking, but not what would free her. Busy-with-own-work did not tell me when it would clear. Prayer/drink/rest/sleep explained waiting conditions. No implementation claim.                                                                                                                                                                                                     |
| DL-10 / DL-19 | FAIL                                                                   | “Shutter the house?” at 353.126 s became “build the house · Likely yes” at review, then “House: on it.” I could not tell whether I had shuttered anything. Shot 08 and transcript. Actual shuttering outcome NOT TESTED.                                                                                                                                                                                                 |
| DL-19         | FAIL                                                                   | “Send Idris home” beneath Hurt made me expect shelter/recovery. Only after sending and inspecting did I learn Home means eat once and choose work again. Shots 05/06; 181.718 and 231.197 s. Recovery and remaining indoors NOT TESTED.                                                                                                                                                                                  |
| DL-30         | FAIL                                                                   | Shot 04: visible risk fragment “Fast timber, but the cedar can hurt” ended at the action row; transcript continued “whoever fells it.” Lapse time was also outside the visible sheet body. Shot 06: first bold Home answer line cut across its top; Home explanation continued below action row. Shots 07/08: action/reason below Danyal/Yusuf → House cut behind Watch village/Confirm. I did not scroll to uncover it. |
| DL-13         | PASS for acknowledgment reached                                        | Orders promptly said given to both villages, waiting/later/on it, then speech or traceable history. This does not fix ambiguous shutter meaning.                                                                                                                                                                                                                                                                         |
| DL-15         | PASS for timing reached                                                | From 2×, live suggestions slowed to 1 min/s. Evening house suggestion read at 146.915 s and sent at 155.115 s before lapse; sending restored 16 min/s. Time advanced between commands.                                                                                                                                                                                                                                   |

Two named taps used stale labels and succeeded after one retry with the fresh name. Neither was a driver block. The uncertain coordinate interpretation is weaker evidence than the directly visible clipping and shutter/build wording.

## English, dates, phone layout, hands on

| Item  | Status                                         | Evidence and scope                                                                                                                                                                                                                                                                             |
| ----- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-20 | PASS for actions reached                       | Action labels, goals and warnings were English. “after I pray Fajr” supplied the relevant waiting meaning. I did not need to select Masjid or translate it to act. Its exact function/explanation on request NOT TESTED.                                                                       |
| DL-21 | PASS for date comparisons reached              | D1/D2 and Storm Day 2 19:00 let me compare today/tomorrow. On Day 2, 16:32 preceded 19:00; until 03:00 meant overnight. Month/year boundaries and returning after closing NOT TESTED.                                                                                                          |
| DL-22 | FAIL                                           | Goal strip and commit buttons stayed visible, but essential order reasons and risk text were not fully visible without scrolling. Shots 04/06/07/08. This was visually checked.                                                                                                                |
| DL-30 | FAIL                                           | Fragments above. Text transcript contained more than the screenshot showed; screenshots establish visibility.                                                                                                                                                                                  |
| DL-31 | PASS for sheets reached                        | Shot 07 shows Roof 8, Meals 6, Storm Day 2 19:00, selected Danyal and House on scene with order sheet open. Reason clipping is covered by DL-30.                                                                                                                                               |
| DL-32 | NOT TESTED for an exclusive no-act gap         | Longest chosen wait: 25 real seconds through the night, ending at 225.340 s. I wanted morning for safer roof/timber work. Other orders and speed controls remained available, so the wait does not prove I could only watch. I also made 20-second work waits. No builder cadence measurement. |
| DL-33 | PASS for direct place orders; mixed experience | After selecting Yusuf, one House tap sent an order with a quick answer. Same for Idris Forest. Worker switching used menus after the failed intended Samira selection. Danyal and shutter suggestions used Review/Confirm forms. A direct shutter act was NOT TESTED.                          |

No simultaneous sheet stack was observed. Reload, saves, exports, replay, sending, target dimensions, alternate themes, text scaling and source-dependent builder checks are NOT TESTED.

## Stop and single post-stop desktop look

Last playing view: D2 18:40, Human Roof 9/10, Meals 16/12, storm D2 19:00. Latest Yusuf reply: Fine. I stopped without learning whether I shuttered the house or who survived the night.

The required single resize to 1280×800 and screenshot occurred after stop with no gameplay input. Time continued. The desktop view was D2 19:07: both roof goals failed at 9/10, both stock goals met, everyone-lives goals open with six alive in each village. This did not change the stopping reason. Shot 09 showed both villages and worker/place controls together; the goal strip was partly covered by village panels. This was one desktop look, not a desktop playtest. The driver was then killed by PID 24757.

## Changes I would want as Bram, ranked

1. Keep shuttering named through review and result. Tell me which action I ordered and whether it happened.
2. Show complete risks, reasons and answers above phone action buttons.
3. Give me a reliable direct person selector, distinct from ordering the current person to that place.

## Artifacts

All screenshots are in `well-free2-shots/` beside this report:

- `01-opening-phone.png`
- `02-yusuf-queued-phone.png`
- `03-idris-selected-phone.png`
- `first-minute.png` — automatic driver checkpoint; not separately opened during play.
- `04-cedar-suggestion-phone.png`
- `05-hurt-idris-phone.png`
- `06-home-answer-phone.png`
- `07-danyal-order-phone.png`
- `08-shutter-review-phone.png`
- `09-post-stop-desktop.png`
- `wall-clock.jsonl` — 80 entries, original reactions and timestamps.

No playtest export downloaded. No replay claim.
