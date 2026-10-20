# The Warren — Yusra playtest

Yusra, 27, junior architect. Light Dwarf Fortress experience; plays Oxygen Not Included and Frostpunk. Wants to dig spaces, keep people safe, recognise people and read room needs. Tea break, phone one-handed.

URL: https://warren.adamwhite.work. Chromium through a persistent local Node/Playwright process; one page. 360×690 CSS px, touch emulation, light mode, default text size. Eight real minutes maximum. No game source, hidden state, network payloads or debug APIs inspected. No telemetry sent or consent changed. Opening credits visibly say Human Framework 2.8.0; no game build identifier seen.

## First minute

Checkpoint at 85.3 seconds after the actionable opening screen (tool delay; exact capture time retained in wall-clock.jsonl). Frozen answers recorded before continuing. A preliminary observation at 51.1 seconds is also retained, labelled too early by its timestamp.

| Item | Status | Original checkpoint answer |
|---|---|---|
| DL-1 A reason to act | PASS | Nine people are exposed. I need sleeping space underground before riders come. The opening says “Dig a refuge where the village can outlast the riders”; the strip says “Room for about zero · nine exposed.” |
| DL-2 What can I touch | PASS | Begin, Zoom, Fit hill, People, journal, look, chalk, rub out, store, beds, lamp, door, speed arrows, bell and Game menu look tappable. I named chalk, beds, store and bell before tapping. Chalk selected with a dark outline; tapping stone planned a dig. No inert thing tried. Last reading initially looked unavailable, then became available after a reading. |
| DL-3 Urgency and selection | PASS | The red instruction draws me first, and “nine exposed” tells me the need. Chalk has the selected border. Bell competes for attention but its text says quiet and warns about false alarms. I do not yet know when riders arrive. |
| DL-4 Why the limit | NOT TESTED | No refused gameplay action encountered. I did not try the initially unavailable Last reading control. |
| DL-5 Readable situation | PASS | “The harvest needs more room below. Mark open ground as a store for the jars.” I can select store and mark open ground, mark more stone, or open People. At 51.1 seconds people stood by the dig mark; I inferred they might be working. Completion is not established by my checkpoint observations. |
| DL-6 A choice soon | PASS | The title offers Begin at 0 seconds; I tap it at 3.7 seconds. Chalk and the hill are available by 3.7 seconds, before 30 seconds. I first choose chalk at 35.1 seconds and mark stone at 35.2 seconds. Begin was navigation; marking the dig was the first consequential input. The opening has about 21 mandatory story/instruction words. |
| DL-7 Learn by doing | PASS for the one core interaction reached | Choosing chalk says “Dashed outlines plan a dig. People choose when.” Tapping stone says “Dig planned. If dug, about three can sleep here; riders reach it from the entrance.” I learned this is a plan people choose to carry out, and this location is exposed to entrance access. Dig completion and the six other tool interactions are NOT TESTED at this checkpoint. No separate help opened. |


## Verbatim diary

Elapsed time starts at the opening screen with Begin. These are the original reaction strings, including my premature “First minute” label at 51.1 s. The actual checkpoint capture was 85.3 s. I took no gameplay input from 43.6 s until after writing the checkpoint. Tool calls and report writing consumed real play time; the game continued. The eight-minute limit was a ceiling.

The [wall-clock log]((driver scratch)/retest/warren-shots/wall-clock.jsonl) retains UTC timestamps, inputs, reactions and rendered text captures. Text capture includes scrollable sheet content; screenshots establish what fit on screen. I do not treat off-screen text as phone visibility evidence.

| Elapsed | Input | Original reaction |
|---|---|---|
| 0.0 s | open | I am here for a little digging and keeping people safe. First look. |
| 3.7 s | click Begin | Begin looks tappable. I want to make the refuge before the riders arrive. |
| 13.5 s | undefined | Chalk, beds, store and bell look tappable. Nine people are exposed; that is the thing I need to change. I am looking for the cellar. |
| 35.1 s | tap 82,565 | I choose chalk. I want to widen the little cellar to the right. |
| 35.2 s | tap 236,355 | I tap the stone beside the cellar to see whether a single mark works. |
| 43.6 s | tap 328,415 | The tap planned a space for three. The warning says riders can reach it. I like knowing that before I put beds there; I am closing the reading to see the mark. |
| 51.1 s | undefined | First minute. I have planned one small dig and am waiting for people to take up picks. I know nine need shelter, but I do not yet know when the riders arrive. Chalk stays outlined as selected. No refused action yet. |
| 85.3 s | undefined | First minute checkpoint: nine are exposed, the dig is planned, and people now stand by the marked stone. I can plan more stone or look at People. I have not learned any unavailable action. I have not opened help beyond the chalk reading. |
| 97.5 s | tap 33,565 | I choose look before touching a person. The harvest instruction has appeared while I write the checkpoint; I still want beds first. |
| 97.7 s | click People | I open People because the tiny figures are hard to recognise. |
| 110.4 s | tap 328,369 | The People sheet keeps the shelter count above it. I can see only the start of Hasan at the bottom; I would have to scroll for the people. Nobody is recognisable to me in the little cluster yet. |
| 114.3 s | tap 229,565 | The new space looks open now. I choose beds so somebody can sleep there. |
| 118.9 s | tap 234,309 | I mark the little right-hand room as beds. I expect it to help three people, though it is too close to the entrance. |
| 126.9 s | tap 328,367 | The whole safety answer fits, which helps. But the red line says no beds are marked while this answer says room for three. I think the count means safe beds, but it does not say that. |
| 127.0 s | tap 326,565 | I choose door. I would rather close off the entrance than keep extending shallow bedrooms. |
| 131.8 s | tap 191,271 | I tap the narrow shaft above the cellar. It is one cell wide, so I think that matches the door rule. The three-door limit has no reason I can see. |
| 136.3 s | tap 278,565 | It needs light. I choose lamp; the rule has given me something specific to do. |
| 142.1 s | tap 191,282 | I hang a lamp by the marked door. This feels direct: choose the thing, touch the place. |
| 151.1 s | tap 81,565 | Now I want another bedroom farther in, rather than just watch the door being made. I choose chalk again. |
| 151.3 s | tap 213,403 | I tap below the cellar to extend down. I am guessing the marked tile is beside open ground. |
| 161.1 s | tap 328,416 | It warns about an open shaft. I thought I was deepening a room, so I want to look at the passage before planning more. |
| 161.2 s | tap 32,565 | I switch to look to inspect the door and the people. |
| 172.2 s | tap 193,352 | The latest mark appears beside the top of the shaft, not where I thought I tapped. I am losing my place as the scene shifts. I tap the round door to find out whether it is ready. |
| 179.5 s | tap 328,368 | The door is rolled back. I have to ring the bell and someone may shut it. I will not give a false alarm just to test the door. |
| 179.7 s | click Open journal | I open the journal to find when the riders are expected. I want to know how much building time I have. |
| 194.4 s | scroll | The journal entry is cut off at the bottom of the sheet. I try scrolling it to read the shaft warning. |
| 200.3 s | scroll | The scroll works, but it jumps past the entry I wanted. I scroll back to the top. This is becoming a lot of panel work for a short tea break. |
| 207.7 s | click people | Now I can read it: Elif opened a shaft. I had not meant to make another entrance. I switch to people to see Hasan rather than keep reading dates. |
| 215.8 s | tap 135,591 | I tap Hasan’s card. I want to know who he is and whether I can speak to him. |
| 221.5 s | tap 111,588 | Hasan is selected in the scene now. I open Activity and words, hoping for his own voice. |
| 232.6 s | tap 328,365 | Hasan says “This will do.” I like connecting the door to him, but I cannot find a way to say anything back. I will make the jar store the red prompt keeps requesting. |
| 232.7 s | tap 180,565 | I select store. I want to mark some of the original cellar, keeping the bedroom separate. |
| 238.8 s | tap 172,371 | I tap the original cellar floor beside its jars. I expect that patch to become storage. |
| 247.8 s | undefined | That patch was already a store. I need more space, not another label on the jars. I am starting to feel that I have spent more time opening readings than carving rooms. |
| 254.7 s | tap 81,565 | One more try: I choose chalk to extend the cellar down. I will check the hill again before tapping, because I lost my place last time. |
| 264.0 s | tap 218,389 | I tap the stone just below the middle of the cellar. This time I have checked the settled screen first. |
| 270.5 s | undefined | I am stopping here. Another room is planned, but I still have six people without beds, nine exposed, and no sense of when danger will arrive. I would rather put the phone down than keep opening safety readings. I liked the little door-and-lamp sequence; I have not made a refuge I trust. |
| 273.9 s | desktop | Post-stop desktop check only. I resize to 1280×800; no further gameplay inputs. |


## Important answers and screenshots

- 3.7–13.5 s: “Sleeping places · Room for about zero · nine exposed.” [Opening hill](<(driver scratch)/retest/warren-shots/03-hill.png>).
- 35.2 s: “Dig planned. If dug, about three can sleep here; riders reach it from the entrance. People choose when to dig.” [First plan](<(driver scratch)/retest/warren-shots/05-mark.png>). A single tap works despite the drag instruction. I did not test dragging.
- 85.3 s: “The harvest needs more room below. Mark open ground as a store for the jars.” [Actual first-minute checkpoint](<(driver scratch)/retest/warren-shots/08-checkpoint.png>).
- 118.9 s: the accepted bed mark says “Room for about three people,” but the red line says “No sleeping places are marked below” and the strip still says zero. [Bed result](<(driver scratch)/retest/warren-shots/12-beds-result.png>). By 126.9 s both top summaries say about three. My diary's guess that the count meant *safe* beds was wrong; I preserve the guess above.
- 127.0 s: “Tap a passage one cell wide, open on two opposite sides only. They carve a rolling stone there if it is lit. Three doors at most.” [Door instructions](<(driver scratch)/retest/warren-shots/13-door-tool.png>).
- 131.8 s: “A door marked. They will carve the rolling stone when someone has the time and a light.” At 142.1 s: “A lamp hangs in open ground, below the surface.”
- 172.2 s: “Ring the bell. A nearby adult who can reach this door can choose to shut it. It is rolled back.” The false-alarm warning and six-game-hour duration also fit. [Door reading](<(driver scratch)/retest/warren-shots/19-door-reading.png>).
- 179.7 s: the journal opens with its first entry cut by the lower edge. At 200.3 s, after scrolling, I can read: “Elif came up under the open sky. Air will come down this shaft now, and so could riders. A door below would close it.” [Initial journal](<(driver scratch)/retest/warren-shots/20-journal.png>), [readable entry after scrolling](<(driver scratch)/retest/warren-shots/22-journal-top.png>).
- 207.7 s: “Sleeping places: 0 beyond riders’ reach; 3 exposed by an open door. 9 villagers; 6 lack marked space.” [People sheet](<(driver scratch)/retest/warren-shots/23-people-top.png>).
- 221.5 s: Hasan is 41, of the Kaya house, sitting and resting. “Hasan listens for the bell.” “This will do.” The last historical sentence reaches the panel's lower edge. [Hasan expanded](<(driver scratch)/retest/warren-shots/25-hasan-words.png>).
- 238.8 s: “This ground is already marked as a store.” [Settled store reading](<(driver scratch)/retest/warren-shots/28-store-settled.png>).
- 264.0–270.5 s: “Dig planned. If dug, about three can sleep here; riders reach it from the entrance. An open stone door leaves a route open. People choose when to dig.” [Last phone screen](<(driver scratch)/retest/warren-shots/30-last-phone.png>). The full answer, shelter strip and marked patch are visible together.

## What it felt like

**Best moment:** mark a narrow passage for a door, learn that it needs light, then put a lamp there. I had a specific response, performed it on the hill, and later found a rolling door. Hasan's “This will do” gave that little construction a person.

**Worst moment:** I wanted to extend a room downward and instead opened a shaft near the surface. I saw the warning, but I had lost the scene position between tool selection and tapping. I cannot establish whether my targeting, the moving layout, or both caused that error. A later attempt, after checking the settled screen, marked the intended stone below the cellar.

At 200.3 s I first said the panel work was becoming too much for a short break. At 247.8 s I felt I had spent more time opening readings than carving rooms. I quit at 270.5 s (4 minutes 30.5 seconds), rather than wait out the budget.

## Clarity results after the checkpoint

- **DL-13: FAIL for consistent status feedback on the bed input.** The reading acknowledged the mark, while both top summaries still denied it at 118.9 s. They agreed by my next capture at 126.9 s. This was a temporary contradiction; I did not establish its exact duration. Other reached inputs received useful acknowledgements.
- **DL-30: FAIL for the journal's initially visible safety entry.** The entry about the new shaft starts below the journal tabs and is cut at the sheet's lower edge in `20-journal.png`. I needed scrolling to read the route warning and “A door below would close it.” The main dig, bed and door readings fit their full safety sentences; this failure is confined to the journal presentation I reached. Hasan's historical sentence also meets the lower edge in `25-hasan-words.png`; that is optional context, not an additional essential-response failure.
- **Targeting confusion, without a claimed rule defect:** I intended to dig down, then saw a surface shaft. The view position changed across inspected screens. The report does not establish the cause or claim the game selected the wrong cell.
- **Deadline uncertainty, without a claimed missing rule:** I did not find a rider deadline. I knew danger was possible, but could not judge how much building time remained. No observed expired obligation establishes a DL-9 or DL-21 failure.

| Item | Status and evidence |
|---|---|
| DL-8 | PASS in reached play: red current task, separate shelter strip, tool and room readings. The transient bed contradiction is recorded under DL-13. |
| DL-9 | NOT TESTED for a known time-critical obligation: none reached. Shelter and harvest needs were visible outside the journal. |
| DL-10 | PASS for reached labels: chalk, beds/sleeping places, store and stone door remained recognisable. The count contradiction was temporary feedback, not a discovered alias. |
| DL-11 | PASS for reached immediate decisions: short tool instructions and safety answers. Builder layout/word-count audit NOT TESTED. |
| DL-12 | NOT TESTED: no game/chapter ending reached. |
| DL-14 | PASS for reached known safety risks: dig and bed readings warned of rider access; bell warning was visible before I used it. I did not ring it. |
| DL-15 | PASS for visible continuous time and inspection slowdown: Walk · 72 min/s and Slow · 18 min/s · reading were explicit, and dates advanced during inspection. Fast-speed consequential choice and manual speed change NOT TESTED. I never changed speed. |
| DL-16 | PASS for reached building tasks: mark stone, wait for people, mark beds/store; door prerequisite was light and time. No missing response established. |
| DL-17 | PASS for the person reached: Hasan's condition and words were prose, with no mood percentage or bar. Other people NOT TESTED in detail. |
| DL-18 | NOT TESTED as an audit of what the character could know. I saw ordinary counted people, dates and approximate room capacity. |
| DL-19 | NOT TESTED beyond my stated bed prediction: the reading warned of entrance access before marking; it was not a promise of safety. |
| DL-20 | PASS: action labels, risks, needs and units were English. Household names stayed names. No necessary unexplained local term met. |
| DL-21 | PASS for reading current and journal dates: “25 August · Year 1 under the hill” versus “24 August · Year 1 under the hill” means a previous day. Deadline comparison and return after a break NOT TESTED; no deadline found. |
| DL-22 | PASS for reached immediate construction responses: tools, top shelter context and full main reading fit at 360×690 without scrolling. People directory and journal involved scrolling; the journal safety-entry failure is DL-30. Keyboard-open and other main screens NOT TESTED. |
| DL-23 | NOT TESTED quantitatively: no hit-area measurement. Tiny people were difficult to recognise, but the People route let me select Hasan. |
| DL-24 | PASS in reached navigation: one sheet at a time; People → Hasan replaced the sheet; closing returned to the hill. Cancel-origin/focus restoration NOT TESTED. |
| DL-25 | PASS for no horizontal scroll observed at the assigned fixture. 320 px, 200% text and dark theme NOT TESTED. |
| DL-26 | PASS: Game menu stayed reachable on the main phone screen. Save/run, journal and people tabs were visible inside it. I did not open save/run. |
| DL-27 | NOT TESTED: no reload or resume. |
| DL-28 | NOT TESTED: sending was prohibited. |
| DL-29 | NOT TESTED: no export/import/replay used. |
| DL-31 | PASS for reached construction state and selected person: shelter progress stayed at the top; the final plan and selected Hasan were visible with their sheets. Deadline portion NOT TESTED because I found none. Some immediate post-input screenshots caught a temporarily blank scene; later settled views showed it. I do not count those captures as a persistent visibility defect. |
| DL-32 | No forced-watch failure established. I could keep marking rooms, inspect people or place fittings. My longest input-free stretch was about 54 s (43.6–97.5), mostly the mandatory checkpoint and writing, rather than lack of a response. I wanted to see people dig after the first plan; I cannot establish a continuous interval when waiting was the only option. The builder's 20-second availability test is NOT TESTED. |
| DL-33 | PASS for the construction interactions reached: choose a tool, touch the hill, receive a plan/place acknowledgement. No multi-field confirmation form. The people perform digging later. I found no way to speak to Hasan; speech is NOT TESTED, rather than a claimed absent feature. |

DL-4 after the checkpoint: the store tap explained that the ground was already marked. The door instruction explained passage shape and light; I successfully marked a door and placed light. I did not encounter the three-door cap, so its reason/recovery remains NOT TESTED. DL-7 after the checkpoint: beds, door, lamp, store, look/inspection and person selection reached; rub out, bell and speed controls were not exercised.

## Stop and desktop look

I stopped with three marked sleeping places, all nine villagers still exposed, an open rolling door, a lit passage, one unintended new shaft and another dig plan below the cellar. The last phone screen says afternoon, 26 August, Year 1. I did not establish that the last plan finished. No loss or ending was reached.

I would not voluntarily return for another phone tea break in this state. I might return on a larger screen for a longer building session. I wanted a recognisable little refuge; I left with a sequence of warnings and only one tiny bedroom.

After stopping, I resized the same page once to 1280×800 and took [the desktop screenshot](<(driver scratch)/retest/warren-shots/31-desktop.png>). The hill occupies a large left area; the full reading and controls occupy the right. The shelter strip remains across the top. This was one look with no gameplay input, not a desktop playtest. The game continued briefly during the resize. I then terminated my controller by its exact PID.

No export downloaded. No run sent. No consent changed.

## Changes I would want, ranked

1. Keep the place I am marking stable and obvious while I choose tools and read the result. I do not want another accidental entrance.
2. Make the shelter strip acknowledge my bed mark at the same time as its reading. Keep the useful safe/exposed/missing breakdown close at hand.
3. Let the journal show a complete safety entry when it opens, so I can read the warning and remedy without adjusting a small panel.
