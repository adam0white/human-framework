# The Pass — Tomas

I stopped after two services because I wanted conversation and spent most of service watching. The crew felt like people most strongly after close. Selim noticing that I let him refuse was the best moment.

## Session

- Persona: Tomas; curious; casually plays cooking and management games; wants the kitchen crew to feel like people; had an evening available.
- URL: https://pass.adamwhite.work
- Build: no game build identifier observed. The title credited “People by the Human Framework 2.13.0.” This is not established as the game build.
- Device: assigned 360×690 CSS px, touch, light mode. Screenshots inspected at that size.
- Access: supplied player-facing HTTP driver at http://127.0.0.1:44605/ using curl. No game implementation, internal state, other sessions, memory, or prior reports read. No delegation.
- Limits: floor 0 minutes; ceiling 25 real minutes. Open returned at 0.681 s. Gameplay stopped at 370.811 s (6:10.811). Feedback Send at 387.328 s. Last browser operation at 400.355 s.
- I selected Selim’s “More time to get the lamb right” option at 9.747 s because I wanted time to learn. I did not change speed later. Selecting a cook visibly slowed the kitchen. Help and the menu were also used.
- Game time advanced during waits and between browser operations: Monday 17:49 at 75.985 s became 18:59 at 104.091 s. Log operations returned an older snapshot; I do not use those stale snapshots as proof that time froze. I could not continuously watch events between replies. Breaks recorded in the journal were observed afterward, not witnessed continuously.
- No export downloaded. Own diary/input log: `(driver scratch)/wall-clock.jsonl`. Screenshot references below are relative to this report.

## First minute

The driver captured `(driver scratch)/first-minute.png` at 60.028 s. My written checkpoint was late, at 70.350 s, after a 20-second wait returned at 61.484 s. That is a timing deviation. The table uses only actions before 60 s and the automatic 60-second screenshot; it does not credit later learning. The screenshot shows Monday 17:42, Selim selected, his refusal, and the cover explanation. This was a text harness with screenshots, so the inspected screenshots support the specific layout observations below. No visual claims are inferred merely from accessible text.

Original checkpoint, verbatim:

> I need money for Saturday and the kitchen is already earning it. I chose Selim’s extra time and opened the doors. Cook buttons and job buttons are clear; Selim is selected and time slows with him. I asked him to eat and waited for an answer: he would rather stay on paid work. No cover is promised, so I think another cook must cover him. I can close this or ask Dilek. I like his refusal more than a silent worker, but I have not found ordinary conversation. The board cut off both agreements with dots.

| Item                       | Result                        | My answer and visible evidence by the checkpoint                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 A reason to act       | PASS                          | I wanted to keep the place afloat. The opening said the bank wanted ₺5,200 by Saturday close.                                                                                                                                                                                                                                                                                            |
| DL-2 What can I touch      | PASS                          | The starting radios, Other ways in, See tonight’s board, Change, Open the doors, Information, menu, cook buttons, close, and job buttons were exposed as controls. The outlined buttons looked tappable in screenshots. My shortened text tap on Selim’s starting line failed at 6.404 s; using the complete radio name worked at 9.747 s. I did not test scenery taps or Other ways in. |
| DL-3 Urgency and selection | PASS                          | The red Open the doors button drew me on the board. Money and Saturday were the reason to work, but no emergency was underway: “Rail clear. The kitchen runs; nothing needs you.” Selim’s outlined/pressed button and “slowed: you’re with Selim” made selection clear. While selected, that message replaced the deadline on the top line.                                              |
| DL-4 Why the limit         | PASS                          | After Eat, all job buttons briefly became disabled and the game said “They heard you.” By the 60 s screenshot the answer was “I’d rather stay on paid work, Chef.” The panel said “No cover is promised. Arrange another cook, or ask again later.” I knew a next step, although I had not successfully arranged cover.                                                                  |
| DL-5 Readable situation    | PASS                          | Selim held the grill until 18:10. I could ask for work, a break, food, or departure, or close the panel. The refusal and cover instruction were readable on the phone screenshot.                                                                                                                                                                                                        |
| DL-6 A choice soon         | PASS                          | A pace choice was available in the first reply at 0.681 s, before long text. First attempted choice: 6.404 s, unsuccessful shortened text tap. First successful meaningful input: Selim radio at 9.747 s. Board at 12.611 s; service opened at 24.152 s.                                                                                                                                 |
| DL-7 Learn by doing        | PASS for reached interactions | I reached two choices with consequences: pace selection became checked; Eat at 38.592 s became “asked…”/“They heard you,” then a refusal. Tapping Selim opened requests and slowed time. No help used before 60 s. NOT TESTED: 4 other Selim job choices (Grill, Cold side, Take ten, Go home), board changes, and insisting. These gaps are not observed failures.                      |

## Verbatim diary and input record

The following is transcribed from my own driver log. Reactions retain their original wording. Input JSON retains exact names. Null game clocks mean the driver did not attach one to that line; the visible-answer table afterward supplies observed clocks for important moments. The driver’s start metadata is omitted. The automatic checkpoint screenshot is retained.

**0.681 s · input**

`open {}`

**6.349 s · note**

> Two cooks already disagree about how to begin. I like that. I want to keep their place afloat, but I am choosing more time while I learn.

**6.404 s · tool**

`tap {"text": "Selim: “I hope the regulars give us time.”"}`

Visible error: Selim: “I hope the regulars give us time.” is not on the page now (game state, not a driver failure)

**9.747 s · input**

`tap {"role": "radio", "name": "Selim: “I hope the regulars give us time.” More time to get the lamb right. Nevin’s pace lasts all month."}`

**12.611 s · input**

`tap {"name": "See tonight’s board"}`

**18.466 s · input**

`shot {"file": "board.png"}`

**24.152 s · input**

`tap {"name": "Open the doors"}`

**26.892 s · input**

`tap {"name": "Selim on grill"}`

**32.579 s · note — Monday wk 1 17:29**

> I tapped Selim hoping to talk. He tells me his agreement, but the things I can say are jobs and breaks. I do appreciate knowing he would rather do paid work.

**32.742 s · input**

`shot {"file": "selim.png"}`

**38.592 s · input**

`tap {"name": "Eat rather paid work"}`

**60.028 s · first_minute**

`shot {"file": "first-minute.png"}`

**61.484 s · input**

`wait {"s": 20}`

**70.350 s · first_minute — Monday wk 1 17:43**

> I need money for Saturday and the kitchen is already earning it. I chose Selim’s extra time and opened the doors. Cook buttons and job buttons are clear; Selim is selected and time slows with him. I asked him to eat and waited for an answer: he would rather stay on paid work. No cover is promised, so I think another cook must cover him. I can close this or ask Dilek. I like his refusal more than a silent worker, but I have not found ordinary conversation. The board cut off both agreements with dots.

**70.537 s · input**

`tap {"name": "Dilek on cold"}`

**75.985 s · input**

`tap {"name": "close"}`

**104.091 s · input**

`wait {"s": 25}`

**106.853 s · input**

`tap {"name": "Information"}`

**112.799 s · note — Monday wk 1 19:03**

> A whole hour passed while I watched for 25 seconds. Their breaks happened on their own. I looked at help because I was not sure whether I should be serving the tickets; it says the dots mean ready and the pencil is my guess at their answer. I had taken those words as their actual answer.

**112.986 s · input**

`tap {"name": "Close information"}`

**146.540 s · input**

`wait {"s": 30}`

**152.957 s · note — Monday wk 1 19:55**

> I am mostly watching the money rise. I do not want to disturb people just to make something happen. I want to see what they say after this shift.

**183.132 s · input**

`wait {"s": 30}`

**191.767 s · pulse — After close Monday week 1 — engagement 4/5**

> Selim noticed I let him say no. That makes the quiet shift feel like it mattered, and I want to see him take his prayer tomorrow.

**191.968 s · input**

`shot {"file": "monday-close.png"}`

**196.946 s · input**

`tap {"name": "Open on Tuesday"}`

**201.026 s · input**

`shot {"file": "tuesday-board.png"}`

**206.700 s · input**

`tap {"x": 304, "y": 115}`

**209.701 s · input**

`tap {"name": "Dilek"}`

**213.711 s · input**

`shot {"file": "selim-plan.png"}`

**213.898 s · input**

`tap {"name": "Done"}`

**218.897 s · input**

`tap {"name": "Ask them about the changes"}`

**226.539 s · note — Board Tuesday week 1**

> I tried Dilek as cover so Selim could step away. She has not agreed. The board says Agreed and not agreed together; I think Selim agreed but Dilek refused. I can accept an uncovered grill, so I will let the shift happen.

**226.746 s · input**

`tap {"name": "Open the doors"}`

**230.686 s · input**

`tap {"name": "Rafi on dish"}`

**237.643 s · note — Tuesday wk 1 17:30**

> Rafi is here now, but meeting him gives me the same job panel. I cannot find a question about him. I will leave him washing plates; I am curious about the prayer rather than forcing someone to switch.

**237.847 s · input**

`tap {"name": "close"}`

**262.992 s · input**

`wait {"s": 25}`

**296.081 s · input**

`wait {"s": 30}`

**301.680 s · want_quit — Tuesday wk 1 19:31 — BORED**

> I would leave this running now. I want a conversation, but the kitchen says nothing needs me and the crew only offer job requests. I will stay to hear Tuesday’s close.

**331.851 s · input**

`wait {"s": 30}`

**361.573 s · input**

`wait {"s": 25}`

**370.767 s · pulse — After close Tuesday week 1 — engagement 2/5**

> Rafi’s broken plate made me smile, but Selim missed prayer again and I do not know what I could say about it. The end-of-shift lines are more alive than the service.

**370.811 s · stop — After close Tuesday week 1 — BORED**

> I am stopping after Tuesday. The wish to leave did not pass. I like these people in small flashes, but I do not want another shift of waiting to get their next lines. I might return another evening out of curiosity, but I would not leave this actively running tonight.

**371.000 s · input**

`tap {"name": "Game menu"}`

**373.922 s · input**

`tap {"name": "Send word"}`

**377.280 s · input**

`tap {"text": "+ Add a name or tester id"}`

**386.818 s · input**

`type {"name": "Your name or tester id", "text": "playtester Tomas rebuild-2026-10-23"}`

**386.972 s · input**

`type {"name": "What happened in the kitchen, what you wanted, what got in the way.", "text": "I would stop after Tuesday: the crew felt human in their closing remarks, but service left me waiting when I wanted to talk with them."}`

**387.142 s · input**

`tap {"name": "I'd stop here"}`

**387.328 s · input**

`tap {"name": "Send"}`

**395.628 s · input**

`wait {"s": 5}`

**400.355 s · input**

`tap {"text": "What is sent"}`

## Important visible answers

| Elapsed           | Input / game clock in reply                                                              | Visible answer                                                                                                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.681 s           | Open / title                                                                             | “Nevin left me the lokanta, its debts, and two cooks who still call it hers.” “The bank wants ₺5,200 (Turkish lira) by Saturday close.” Dilek’s usual wait was initially checked.                                                           |
| 12.611 s          | See tonight’s board / Mon wk 1, doors 17:30                                              | Selim grill, break 18:10; Dilek cold side, break 18:35. Both agreements appeared. Screenshot at 18.466 s showed their ends truncated.                                                                                                       |
| 24.152 s          | Open the doors / Monday 17:25                                                            | “Rail clear. The kitchen runs; nothing needs you.” “Tap a cook.”                                                                                                                                                                            |
| 26.892 s          | Selim on grill / 17:29                                                                   | “I’m holding the grill until 18:10.” Job/break requests opened. “Tap a job to ask. Hold it to insist.”                                                                                                                                      |
| 38.592 s          | Eat rather paid work / 17:34                                                             | “asked…”; all job buttons disabled; “They heard you.”                                                                                                                                                                                       |
| 60.028 s          | Automatic screenshot / 17:42                                                             | “Selim at 17:34: ‘I’d rather stay on paid work, Chef.’” “No cover is promised. Arrange another cook, or ask again later.”                                                                                                                   |
| 70.537 s          | Dilek on cold / 17:47                                                                    | “I’m holding the cold side until 18:35.” Similar job panel; no ordinary conversation option found.                                                                                                                                          |
| 75.985–104.091 s  | Close, then wait 25 s / 17:49–18:59                                                      | First “Waiting for cooking”; then rail clear, ₺200. Journal said Selim took his 18:10 board break and Dilek her 18:35 break.                                                                                                                |
| 106.853 s         | Information / 19:03                                                                      | “The pencil under each job is your guess at their answer.” “Ticket dots: ● is ready.” Holding can cost trust. Till tick shows tonight’s target.                                                                                             |
| 183.132 s         | Wait / after close Monday                                                                | 15 of 15 tables fed; ₺600 tonight; about ₺920 each of 5 nights left. Selim: “You let me say no tonight. I noticed.” He also missed maghrib, defined as sunset prayer. Dilek mentioned smoking and Nevin’s börek recipe.                     |
| 196.946 s         | Open on Tuesday / board                                                                  | Rafi appeared at dish pit. Selim and Dilek’s plans said “Agreed” but also Rafi had not agreed to cover.                                                                                                                                     |
| 206.700–218.897 s | Selim Change at x304/y115, Dilek cover, Done, Ask them about the changes / Tuesday board | Plan said “Ask Dilek to cover; the cold side waits for twenty minutes.” After asking: “Dilek not agreed; grill waits”; “I’d rather keep at what I’m doing, Chef. I haven’t agreed to that cover.”                                           |
| 226.746 s         | Open the doors / Tuesday 17:25                                                           | Rafi on dish. “Plates come back dirty. Someone has to wash them.”                                                                                                                                                                           |
| 230.686 s         | Rafi on dish / 17:30                                                                     | “I’m holding the plates until 19:00.” The job panel added Dish pit, with the same break/home choices. He was a returning crew member, not someone I hired.                                                                                  |
| 262.992–331.851 s | Waits / Tuesday 18:34–20:25                                                              | Money rose from ₺680 to ₺1,280. Journal recorded board breaks. At 20:25 two tables were waiting on grill, with cold ready. I did not input cooking or serving.                                                                              |
| 361.573 s         | Wait / after close Tuesday                                                               | 20 of 20 tables fed, ₺800 tonight, total ₺1,400; about ₺950 for each of 4 nights left. Selim again missed prayer. Dilek: “Bus home. Bed. Do it again.” Rafi: “I didn’t break anything. Well. One.” Notebook: “A full house, nobody walked.” |

## Best, worst, and leaving

Best: Monday close, observed at 183.132 s, engagement logged 4/5 at 191.767 s. “You let me say no tonight. I noticed.” My small request and decision not to insist had been noticed by a person. That was the strongest reason to continue.

Worst: the later Tuesday waiting, especially 296.081–361.573 s. I understood that the kitchen was working. I wanted something to say to the crew that was not a work reassignment. I did not find it.

Only want_quit: 301.680 s, Tuesday 19:31, **BORED**. The exact wording is in the diary. I initially wanted to leave the game running and stayed for close. The feeling did not pass. Final stop: 370.811 s, after Tuesday close, **BORED**. I would not keep it running that evening. I might return voluntarily another evening out of curiosity, but I was not eager to begin Wednesday. This was not a completed run or a claim that later days contain nothing else.

Pulse series: 191.767 s — 4/5; 370.767 s — 2/5. Both original sentences are in the diary.

Hard, but kept going: I chose the more forgiving opening pace because I was learning. At 106.853 s I consulted Information because I did not know whether ticket serving needed my input. I stayed because Selim’s refusal and later acknowledgment made me curious about him. I did not look for an additional accessibility option or use a workaround. No driver block occurred; the first failed text tap was resolved with the exact radio name.

## Clarity and phone observations

- **DL-30: I could not read the ends of the board agreements on the phone.** `(driver scratch)/board.png` at 18.466 s ends Selim’s line “back on the grill until…” and Dilek’s “back on the cold sid…”. There was large empty space below the cards. `(driver scratch)/tuesday-board.png` also truncates “Rafi not agreed; grill wa…” and Selim’s agreement at “Rafi:…”. The accessible transcript contained fuller wording; that does not make it visually present. These are observed truncations, not inferred from the text harness.
- **Unnumbered clarity failure:** I first understood “rather paid work” as the cook’s answer. Help at 106.853 s said the pencil is my guess. The refusal did match that guess in the one request I tried. I do not claim the game lacks an explanation; I found it after using the panel.
- **Unnumbered clarity failure:** Tuesday’s board said “Agreed” alongside “Dilek not agreed; grill waits.” I inferred the main worker accepted while cover refused. The full reply supported that interpretation, but the clipped card made the distinction harder to read.
- **DL-20 — PARTIAL / FAIL for one necessary opening term:** I could operate the game in English. Turkish lira was defined immediately; maghrib was defined as sunset prayer at first encounter. “Lokanta” appeared without a nearby definition, though the kitchen premise let me infer a restaurant. I did not request a definition. Börek was not defined in Dilek’s line, but I did not need its meaning for an action. On-request explanations for those terms: NOT TESTED.
- **DL-21 — PASS for encountered dates:** Monday/Tuesday, week 1, “by Sat,” explicit clock times, and “5 nights left” then “4 nights left” let me compare the deadline with today in English. Across months/years: NOT TESTED; none encountered.
- **DL-22 — PASS for inspected service response:** `(driver scratch)/first-minute.png` shows the refusal, Selim’s selection, current time, and cover instruction without scrolling. The whole job panel fits. This does not establish every sheet or later response. The board agreements have the separate DL-30 failure above.
- **DL-31 — FAIL for the inspected request sheet:** `(driver scratch)/selim.png` and `(driver scratch)/first-minute.png` retain Selim, current time, and money/progress bar, but “slowed: you’re with Selim” replaces “₺5,200 by Sat.” I could not read the deadline while asking him. `(driver scratch)/selim-plan.png` retains goal and deadline above the plan, and identifies Selim in its heading. That plan overlays the board cards and prevents reading their full contents. No overlapping pair of sheets observed.
- **DL-32 — limited agency rather than a total lock:** The longest sustained desire was conversation during Tuesday service, roughly 230.686–361.573 s (about 131 s). I could still request jobs; I could not find a conversational response. I chose to watch rather than disturb assignments. I do not claim every input was blocked. The one request’s brief disabled state ran from 38.592 s until sometime before the 60.028 s screenshot; exact duration not established.
- **DL-33 — request panel:** I tapped cook controls to speak. A job-request panel opened. I did not test tapping the drawn people, stations, or pass itself, and did not cook directly. Selim’s board Change opened a plan form.

Optional question: I approached Selim, Dilek, and Rafi outside a scripted dialogue moment. I found work requests, not ordinary conversation. I met Rafi in service but did not encounter or make a hire. Hire-in-service interaction: NOT TESTED.

## Feedback — DL-13

The normal menu label was **Send word**, followed by **Send**, rather than “Send feedback.” I used that normal feedback flow after stopping gameplay. Recording stayed checked; I did not change consent settings.

Name: `playtester Tomas rebuild-2026-10-23`.

Selected verdict: “I'd stop here.” One-line note:

> I would stop after Tuesday: the crew felt human in their closing remarks, but service left me waiting when I wanted to talk with them.

I pressed Send exactly once at 387.328 s. Visible answer:

> Sent. Thank you. Queued for the lab; delivery may retry.

The same answer remained after a 5-second wait at 395.628 s. This establishes the visible queued acknowledgment, not confirmed delivery to the lab. Player id: **not shown** in the screens inspected, including the expanded “What is sent” explanation. No export downloaded or replay tested.

## Changes I would want as Tomas

1. Let me talk to a cook about what they said—especially Selim missing prayer—without making it a job request.
2. Let me read the entire agreement and cover answer on the phone board.
3. Give me more crew interaction during service; the closing remarks made me care, but I did not enjoy waiting through another shift for them.
