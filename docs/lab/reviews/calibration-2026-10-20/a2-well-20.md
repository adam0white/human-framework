# Twice at the Well — Bram

Bram, 35, warehouse shift lead. Plays Mini Motorways, RimWorld on PC and Bad North. Likes quick orders and watching people carry them out. Dislikes controls that hide the map. Lunch break, phone held one-handed.

URL: https://human.adamwhite.work/colony/. No build identifier encountered. Access: Chromium through Playwright, one persistent page in a local Node process. Phone: 360×690 CSS px, touch and mobile emulation, light mode, default text size. No real phone or physical thumb was used. One post-stop look used 1280×800.

Gameplay stopped voluntarily at +431.6 s (7 min 11.6 s), before the 20-minute ceiling. The run was unfinished. Navigation clock began 2026-10-20T16:03:27.467Z; the opening was first captured at +4.0 s. Diary times use that navigation clock. The first-minute checkpoint was +74.5 s, or 70.5 s after that first capture; exact first paint was not separately measured. Real time continued between commands. Game speed was 1× (8 game minutes/real second), with automatic choice slowdown to 1 minute/second. I chose 2× at +248.4 s for the night, then 1× at +322.6 s for daylight. No clock acceleration outside those visible controls.

Read only the assigned playtester prompt and DL checklist in the game repository. No source, internal state, bundles, network payloads, prior reports or logs were inspected. No consent changes, telemetry submission, run sending or export download. The local browser was closed after the desktop look.

## First minute


Checkpoint at 74.5 real seconds after navigation began, about 74 seconds after the first actionable opening. Tool/recording delay made this late. Inputs stopped after 54.7 seconds. These are the original checkpoint answers; later learning does not revise them.

| Item | Original answer |
|---|---|
| DL-1 | PASS — I need a roof and twelve meals before the Day 2 19:00 storm, while keeping everyone alive. Opening told me that. |
| DL-2 | FAIL — Play, speed, Choose person, tabs, House and other place cards look tappable. Tapping the visible House card sent Idris to Well. Moving people made my first person tap miss; Choose person worked. |
| DL-3 | PASS — Roof and Meals are first under the clock, storm next. Human tab is outlined; selected Idris has a name and outline. A suggestion is pending, but I have not opened it. |
| DL-4 | PASS — House said later after Fajr, then later after a meal. I take that to mean he must pray and eat before building. Cedar warned injury; I did not order that. |
| DL-5 | PASS — Idris is walking to Kitchen; I have given him House next. Roof 2/10, meals 4/12, Day 1 morning with storm tomorrow evening. |
| DL-6 | PASS — Worker/place choice was available when Play exposed the map at 13.5 s; first map tap 18.7 s, first worker selection 28.7 s. Opening had about 24 story/instruction words. |
| DL-7 | FAIL — Reached worker selection and two order routes. Worker list and House preview made sense; the scene House tap producing Well did not teach the intended action. Suggestion and risky-order interactions NOT TESTED (2). |

Original reaction: “I can see the job and the deadline. Picking the job on the map is already less reliable than the list.”

The DL-5 answer recalled the preceding order sheet. The checkpoint's actual visible state was already “Idris · Walking to Forest”, Meals 3/12, and “Not that — I'll gather timber; that is my work.” This is recorded separately rather than rewriting the answer. Screenshot: `a2-well-20-shots/10-first-minute.png`.

## Verbatim diary

These entries preserve the wording recorded during play, including guesses and mistaken expectations. The checkpoint itself is above. Entries were logged after the described inputs; where an input time was known separately it remains in the text. Timestamps are UTC. Screenshots live in `a2-well-20-shots/`.

**+13.4 s · 2026-10-20T16:03:40.888Z**

Input: Opening screen; no input yet

Reaction: “Roof a house, bank twelve meals, keep everyone alive. Fine. Play looks obvious; the people behind it look like pieces I can tap.”

Visible answer: D1 05:00; Paused; Roof 2 of 10; Meals 0 / 12; Storm Day 2 19:00

**+28.8 s · 2026-10-20T16:03:56.233Z**

Input: Play; tap where Idris was; Choose person; Idris

Reaction: “They all moved before I picked him. Choose person is easier. I want someone on the roof now.”

Visible answer: Running 8 min/s changed to Slow 1 min/s suggestion pending. Worker list opened.

**+41.2 s · 2026-10-20T16:04:08.676Z**

Input: Tapped House label at (130,411)

Reaction: “I tapped House, but it says Idris to Well. That is not the job I picked. He is praying; later after Fajr makes sense, but I do not know why the target changed.”

Visible answer: Before: House — Later: after I pray Fajr. After: Order given to both villages: Idris → Well; Idris · Praying Fajr.

Screenshots: `05-idris-order.png`, `06-house-order.png`.

**+54.8 s · 2026-10-20T16:04:22.217Z**

Input: Order options → Place → House → Confirm

Reaction: “The list gets me the actual house. He wants a meal first. All right. I can still see roof two, meals four and tomorrow evening above this sheet.”

Visible answer: Idris → House; build the house · Later: after I eat a meal

**+74.5 s · 2026-10-20T16:04:41.956Z**

Input: Stopped inputs for checkpoint

Reaction: “I can see the job and the deadline. Picking the job on the map is already less reliable than the list.”

**+93.9 s · 2026-10-20T16:05:01.366Z**

Input: Read checkpoint screen

Reaction: “He refused the house and went for timber. That is a useful answer, though I thought his only delay was eating. I will check the suggestion.”

Visible answer: Not that — I will gather timber; that is my work. Idris · Walking to Forest; Meals 3/12.

Recording note: Checkpoint written at 74.5 s, late; DL-5 recalled the previous sheet. Current screen is recorded here separately.

**+102.6 s · 2026-10-20T16:05:10.038Z**

Input: Opened Suggestion at 93.9 s

Reaction: “Three timber for a possible injury? No thanks. I have until tomorrow. He is already gathering the safe timber.”

Visible answer: Idris → Cedar; three timber at once; cedar can hurt whoever fells it; lapses 09:00 · in 55 min.

Screenshots: `11-suggestion.png`.

**+117.7 s · 2026-10-20T16:05:25.196Z**

Input: Cancelled place picker; Order options → Worker → Yusuf

Reaction: “Yusuf is already building. Good, leave him at it. Selecting a worker turns the whole map into boxes and lines. I want the village back, not an order screen over all of it.”

Visible answer: Roof 3/10; Yusuf · Building; House says Already building: keeps him at it.

Screenshots: `13-yusuf.png`.

**+136.3 s · 2026-10-20T16:05:43.717Z**

Input: Watch village; waited about eight seconds; tapped Human tab

Reaction: “The map went blank when I closed orders. It is back on the next look. Yusuf is hammering and the roof is up to four. That is the bit I like.”

Visible answer: At 117.8 s blank scene; at 125.9 s village visible, Yusuf Building. Slow 1 min/s suggestion pending.

Screenshots: `14-watch.png`, `15-watch-later.png`.

**+144.2 s · 2026-10-20T16:05:51.702Z**

Input: Read Maryam suggestion

Reaction: “Nine meals already. I can spare her for some timber before noon. This gives me a real tradeoff instead of guessing which job to assign.”

Visible answer: Maryam → Forest; Timber is short. Maryam is free until noon. Timber now, but the pot sits cold while she is gone. Lapses 11:45.

Screenshots: `17-suggestion-tariq.png`.

**+151.7 s · 2026-10-20T16:05:59.187Z**

Input: Review order → Confirm Maryam → Forest

Reaction: “The suggestion called her free; the preview says she will refuse because people would go unfed. I will ask once, but it sounds as though the suggestion was not much help.”

Visible answer: gather timber · Will refuse: the others would go unfed; Roof 5/10; Meals 9/12.

Screenshots: `18-maryam-refusal-preview.png`.

**+178.1 s · 2026-10-20T16:06:25.557Z**

Input: Switched to Classic; watched ten seconds

Reaction: “Ah, same orders but two villages. Classic has Maryam chopping and fewer meals; Human kept her cooking. That comparison makes the refusal more interesting. I am mostly watching them now.”

Visible answer: At tab switch: Human Roof 5/10, Meals 14/12, Maryam Eating; Classic Roof 7/10, Meals 6/12, Maryam Gathering timber.

**+190.9 s · 2026-10-20T16:06:38.409Z**

Input: Opened History

Reaction: “And leave the pot cold at noon? No. They eat from my hands. That is the best thing anyone has said so far. Now I understand why she ignored me. The history makes it clear which village did what.”

Visible answer: Maryam → Forest; Classic done, Human will not. Idris → House; Classic done, Human not now; lapsed.

Screenshots: `20-history.png`.

**+220.1 s · 2026-10-20T16:07:07.575Z**

Input: Watched about twenty seconds at 1×

Reaction: “Roof seven, meals ten. It is ticking along. The suggestion keeps slowing it down, so I have to open that before I can just watch the work finish.”

Visible answer: D1 18:33; Slow 1 min/s suggestion pending; Human Roof 7/10, Meals 10/12.

**+225.3 s · 2026-10-20T16:07:12.753Z**

Input: Suggestion → Send order Yusuf → House

Reaction: “Yes, one more wall before dark. This is the quick order I wanted. One tap after the suggestion, rather than finding him and a place again.”

Visible answer: Light is going. Send Yusuf back to the house? One more wall before dark, if he is not spent. Lapses 19:25 in 46 min.

**+248.3 s · 2026-10-20T16:07:35.816Z**

Input: Watched at 1× after Yusuf order

Reaction: “He is building after dark and the roof went to eight. That feels like my order did something. Now they are drifting home; I will use two-times for the night.”

Visible answer: D1 21:02; Roof 8/10; Meals 9/12; Yusuf Building.

Screenshots: `22-dusk.png`.

**+277.9 s · 2026-10-20T16:08:05.340Z**

Input: Waited at 2×; saw Hurt notice

Reaction: “Idris got hurt in a squall, a day before the storm deadline. I was not expecting that. Send him home is right there; do that first.”

Visible answer: Day 1 · 21:40 Idris (Human), hurt in the squall; Send Idris home; Show Idris. D1 21:59, Slow 1 min/s.

Screenshots: `23-night.png`.

**+286.3 s · 2026-10-20T16:08:13.750Z**

Input: Send Idris home; open Suggestion

Reaction: “He said all right and is heading home. Good. Now it suggests sending Tariq into the same squall for timber. No. I would rather wait for daylight.”

Visible answer: Idris Walking to Idris & Samira; Alright, I will do it. Tariq → Forest; night and a squall, forcing him may cost trust; lapses 22:35 in 26 min.

**+322.6 s · 2026-10-20T16:08:50.114Z**

Input: Waited about twenty-five seconds at 2×; returned to 1× at dawn

Reaction: “Morning already. Idris is up and the hurt notice is gone; I do not know if he is fully better. Still need two roof sections and six meals today. I want to see the morning work at normal speed.”

Visible answer: D2 05:02; Roof 8/10; Meals 6/12; Idris Walking to Well. No Hurt notice.

Screenshots: `24-dawn.png`.

**+333.9 s · 2026-10-20T16:09:01.398Z**

Input: Suggestion → Send order Tariq → Forest

Reaction: “Daylight timber, yes. I passed on it in the storm and now it sounds reasonable. I wish I could keep the whole house and both workers in view while doing this.”

Visible answer: Morning. Timber is still short. Send Tariq to the forest? He is rested. By day the forest carries only the usual small risk of a slip. Lapses 08:00 in 51 min.

**+362.9 s · 2026-10-20T16:09:30.367Z**

Input: Watched twenty seconds at 1× after Tariq order

Reaction: “I am waiting for timber to turn into roof. I can send more people somewhere, but I do not know that it helps. I would like to see the job happen, instead of looking for whoever is off the edge of the map.”

**+375.7 s · 2026-10-20T16:09:43.130Z**

Input: Suggestion → Review Samira → House → Confirm

Reaction: “A helper can speed the roof up. That is what I wanted to do. Faster but hungrier is clear. It also says later, gather grain; I cannot tell how long later means.”

Visible answer: Samira → House; build the house · Later: gather grain; Rush: faster, hungrier.

Screenshots: `26-rush-samira.png`.

**+408.7 s · 2026-10-20T16:10:16.143Z**

Input: Waited about twenty-four seconds after Samira order; opened History

Reaction: “Now she needs a drink. The answer is fair, but I am losing patience with not-now orders. Tariq did finish the timber job. I will give her a moment, then I am done if this is still just waiting.”

Visible answer: Samira Drinking; Not now. After I drink at the well. History: Samira House Human not now; Tariq Forest done; Idris Home done.

Screenshots: `27-samira-answer.png`.

**+438.6 s · 2026-10-20T16:10:46.088Z**

Input: STOP at phone screen observed at 431.6 s; no more gameplay orders

Reaction: “She went back to grain. Roof still eight, meals down to seven. I am done here. I like that they have their own priorities, but on a lunch break I want an order to stick without chasing it through more sheets. I would not come back on this phone.”

Visible answer: D2 10:25; Roof 8/10; Meals 7/12; Samira Gathering grain; Not that — I will gather grain; that is my work.

Screenshots: `28-stop-phone.png`.

**+469.3 s · 2026-10-20T16:11:16.784Z**

Input: One post-stop look at 1280×800; paused; no resumed play

Reaction: “Desktop makes the two-village idea much easier to read: both maps and both results at once. The everyone-lives deadline is Day 3 05:00 here; I had only seen the storm deadline on the phone. I still would not resume this lunch-break run.”

Visible answer: Paused D2 10:52; roof 8/10 in both; Classic meals 8, Human meals 7; alive 6/6 in both; Human injuries 1; Everyone lives by D3 05:00.

Screenshots: `29-desktop-after-stop.png`.

## Best, worst, and leaving

Best: comparing Maryam in the two villages. At +157.8 s the Human village had 14 meals and Maryam eating; Classic had 6 meals and Maryam gathering timber. History supplied her answer: “And leave the pot cold at noon? No. They eat from my hands.” That made her refusal feel like a person's decision. I also liked the direct “Send Idris home” injury response, and the dusk suggestion that let me send Yusuf to the house quickly.

Worst: I tapped the visible House card and received “Order given to both villages: Idris → Well.” Screenshots `05-idris-order.png` and `06-house-order.png` record before and after. I cannot establish the cause from the page. The map also changed size and position as sheets opened, so a location remembered from the preceding screen was unreliable.

First frustration was recorded at +41.2 s after that House tap. Boredom became clear at +362.9 s: “I am waiting for timber to turn into roof.” At +408.7 s I was losing patience with “not-now orders.” I stopped on the next observation, +431.6 s, when Samira was gathering grain again and said, “Not that — I'll gather grain; that is my work.” Human roof was 8/10, meals 7/12, Day 2 10:25. I did not resume to finish the run. I paused afterward for the requested desktop look.

I would not return voluntarily on this phone. I liked the people having priorities. I wanted quicker, more dependable orders and a map I could keep watching.

## Clarity findings

| Item | Status and observed evidence |
|---|---|
| DL-2 · controls | FAIL. The visible House card produced a Well order in my interaction. This is an observed mismatch, not a diagnosis of the hit area. `05-idris-order.png`, `06-house-order.png`; +33.6 s input, +41.2 s reaction. My earlier belief that the first person tap missed because Idris moved is an inference; no selected person was shown afterward. |
| DL-7 · learning | FAIL for the initial scene order route; that mismatch did not teach a dependable action. The list route explained worker, place, expected answer and Confirm. Later suggestions taught timber versus meals, night risk, and rushing versus hunger. Risky Cedar confirmation remained NOT TESTED. |
| DL-13 · feedback | PASS for the later orders I followed. The game distinguished giving the order from the villager's delayed answer. History traced refusals and completed jobs. Idris agreed to go home and was then shown walking there. I did not test repeating an uncertain input. |
| DL-14 · known costs | PASS for the suggestions reached: Cedar injury risk; the cooking pot going cold; squall risk and trust; “Rush: faster, hungrier.” No claim about undiscovered costs. |
| DL-15 · visible time and slowdown | PASS for the observed path. Speed and moving clock were explicit. At 2×, a live squall choice slowed to 1 min/s. I read the injury and suggestion over roughly 15 real seconds and could still send Idris home and decline Tariq's night job. The log records the speed changes and reasons. |
| DL-16 · response to trouble | PASS for the injury. “Send Idris home” and “Show Idris” were directly available below the Hurt notice, `23-night.png`. He accepted the home order. |
| DL-24 · returning from sheets | Mixed observation. The lists and History replaced one another; I did not encounter stacked sheets. Watch village returned to the scene. It did not clear the selected worker. Full focus behavior NOT TESTED. |
| DL-30 · occlusion | FAIL for scene labels while the order sheet was open. In `18-maryam-refusal-preview.png`, the small scene puts the Danyal name label over Maryam's selected tag; only the activity fragment “Coo” is visible. In `26-rush-samira.png`, the house is visible but its lower workers are cut by the sheet boundary. No remedy, cost or confirmation sentence was cut mid-sentence in the sheets I read. |
| DL-31 · state while ordering | FAIL for keeping the concerned scene readable; PASS for the phone goal strip. Roof, meals and storm deadline stayed readable above the sheets. In `18-maryam-refusal-preview.png` the scene shrank to a small crowded area and the selected person tag was occluded. In `26-rush-samira.png` the house and workers at its foot could not all be read. Selecting a worker sometimes replaced the illustrated map with large place cards and lines (`13-yusuf.png`), which I disliked. |

The white scene in `14-watch.png` recovered by `15-watch-later.png`, about eight seconds later. This was a transient observation; I did not establish how long the blank lasted. The faint sheet in `17-suggestion-tariq.png` was captured immediately after opening it and may be a transition frame. I do not count that frame as a persistent text-contrast defect.

Maryam's “free until noon” suggestion later previewed a refusal, and Samira's “Later: gather grain” became a drink delay and then a refusal. I found this frustrating. The suggestion explicitly warned that availability may change and people may refuse. These outcomes alone do not prove a false rule or defective prediction. The checkpoint's DL-4 pass applies to the prayer and meal limits encountered then; the later “Later: gather grain” did not tell me when she would become available.

## English, dates, phone layout, and hands on

| Item | Result |
|---|---|
| DL-20 · English | PASS for the actions reached. House, Forest, meals, injury, risks and order responses were in English. “Praying Fajr” and “Praying Isha” named prayer periods; I did not need their exact hours to understand “after I pray.” I inferred Masjid was the prayer place from those actions. No glossary or on-request term explanation was tested. |
| DL-21 · dates | PASS for the storm comparison. At D1 morning the deadline was “Storm Day 2 19:00”; at D2 morning it was that evening. Suggestion deadlines gave a clock time and “in 55 min,” “in 46 min,” etc. The relative days were usable without translation. The post-stop desktop look additionally showed “Everyone lives by D3 05:00”; I had not noticed that separate deadline on the phone. Cross-month/year dates and return after a break NOT TESTED. |
| DL-22 · immediate phone response | PASS for the responses reached. Play, worker/place selection, preview and Confirm, suggestion answers, and the injury action were on screen without scrolling at 360×690. Roof, meals and storm deadline stayed at the top. This does not establish every possible sheet or keyboard layout. |
| DL-30 · clipped text | FAIL for the occluded selected-person activity in `18-maryam-refusal-preview.png`, as above. No “Scroll ↓” panel was encountered. No sheet sentence was observed cut midway. |
| DL-31 · reading while acting | FAIL for concerned scene visibility, as above. Goal progress and storm deadline remained visible, including `26-rush-samira.png`; worker name and current activity also appeared in the strip just above the sheet. The scene itself was crowded or cut. |
| DL-32 · only watching | NOT TESTED as an exclusive absence of hands-on acts. My longest recorded ordinary-speed interval after an order before inspecting again was about 29 s (+333.9 to +362.8); I wanted timber to become roof and to see the work. Another roughly 24 s preceded the Samira drink answer. These intervals included recording/tool time. Order options and speed remained available, so they do not prove that waiting was the only option. I did not find a direct repair/build act for myself. Night waiting was chosen, with 2×. |
| DL-33 · scene versus forms | FAIL for the reliable route I experienced. I wanted to select a person and send them to the house. The scene route produced Well when I tapped House. My reliable House order used Order options → Place → House → Confirm. Suggestions sometimes offered direct Send order; other suggestions required Review order and Confirm. I did not establish that the game has no other scene route. |

DL-12 ending, DL-27 reload/resume, and DL-29 replay/import: NOT TESTED. I stopped before an ending and did not reload. DL-28 sending: NOT TESTED and unauthorized by this brief. All source/export-only builder checks: NOT TESTED.

## The single desktop look

After stopping, I paused and resized the same page to 1280×800. `29-desktop-after-stop.png` shows both villages beside the central controls, both roof counts, meal counts, injuries and alive counts. This made the comparison much easier to understand. The header also exposed the separate survival deadline, D3 05:00. Human injuries remained 1; the earlier disappearance of the phone Hurt notice had not established recovery. I took no gameplay action on desktop.

## Changes I would want, ranked

1. Let the visible place I tap reliably receive the order. The House-to-Well result undermined my first attempt.
2. Keep the concerned workers and job readable on the phone while I order. I want to watch the people, not lose them behind cards or a tiny scene.
3. Make a deferred order easier to follow: show whether it is still waiting, has been refused, or needs another decision, without making me chase it through History and another suggestion.

Artifacts: `a2-well-20-shots/wall-clock.jsonl` contains the timed diary. The same folder contains screenshots `01-opening.png` through `29-desktop-after-stop.png` (descriptive names between those endpoints). No export was downloaded.
