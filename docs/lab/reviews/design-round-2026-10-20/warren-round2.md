Screenshots and other evidence files stayed in the driver's scratch folder and are not kept; absolute local paths were replaced by relative names or "(driver scratch)". No other wording was changed.

# The Warren — Ines, source-unread playtest

Ines, 34, night-shift nurse. I play RimWorld, Oxygen Not Included and Dwarf Fortress on a tablet. I care first about keeping every person alive. I am on a staff-room break with a phone in one hand.

URL: https://warren.adamwhite.work. No game build identifier observed. The title screen and menu credited “People by the Human Framework 2.8.0”; I do not treat that as the game's build.

Device: 360×690 CSS px, touch emulation, light mode, default text size, Chromium through Playwright. One browser context and one page stayed alive in a local Node HTTP control process. Actions were ordinary taps and Begin; no game code, network payloads, hidden state or debug API inspected. I read only the two assigned instruction files before play. No consent changes, run sending, telemetry submission or export download performed.

Timing: the clock began at the actionable title screen. I stopped voluntarily at **314.29 s (5 min 14 s)**, below the 8-minute ceiling. The first-minute checkpoint was late at **81.14 s**; no game input occurred between the chalk selection at 53.61 s and the checkpoint. All time includes tool and observation delays. Game time kept moving between commands. I never selected a speed control; Walk showed 72 min/s. A visible reading slowdown and the final raid-warning slowdown were observed. The requested single desktop look occurred after stopping, at 321.24 s, at 1280×800; no further gameplay input.

The control server's error handler was deliberately tested before navigation: /error returned HTTP 500 with “deliberate control-server error-handler test”; /health then returned HTTP 200, alive true, pageCount 1. It did not exit and needed no restart. An exact-name locator for chalk later timed out; it produced no gameplay input. I then used a coordinate tap. These are access-tool events, not game refusals.

## First minute

Checkpoint taken at 81.14 real seconds after the opening screen (late because of tool and observation time). These are my answers before continuing.

| Item | Status | Original checkpoint answer |
|---|---|---|
| DL-1 A reason to act | PASS | I need to dig a refuge before riders come. The opening says the village needs to outlast the riders; the game says nine exposed and sleeping room for about zero. |
| DL-2 What can I touch | PASS | Begin and More about the hill looked tappable. In play, the bordered tools, speed arrows, Zoom, Fit hill, Check shelter, journal and Game menu look tappable. I selected chalk and it gained a dark outline and a Reading explanation. No inert thing tried. I have not tried the map yet. |
| DL-3 Urgency and selection | PASS | The red instruction draws me first, then nine exposed. Chalk has a dark selected border. The red instruction tells me what to do; exposure tells me why. I do not yet know how close the riders are. |
| DL-4 Why the limit | NOT TESTED | No unavailable gameplay action encountered. Last reading looked grey before I had a reading, but I did not try it. |
| DL-5 Readable situation | PASS | I can choose chalk and drag beside the cellar. Selecting chalk told me: “Dashed outlines plan a dig. People choose when.” |
| DL-6 A choice soon | PASS | The opening choice Begin / More about the hill was available at 0 seconds; Begin input at 16.58 seconds. Digging tools were observed at 23.48 seconds, before 30 seconds. First tool selection at 53.61 seconds. Opening essential text was 23 words, excluding title and labels. |
| DL-7 Learn by doing | PASS for the interaction reached; NOT TESTED for 6 other tool interactions | Begin exposed the hill and tools. Selecting chalk taught me it plans a dig rather than directly moving people. I have reached one of seven tool choices. No digging consequence reached yet; look, rub out, store, beds, lamp and door remain untested. Contextual Reading help appeared automatically. |

Evidence: 01-opening.png, 03-game.png, 04-chalk.png, 05-first-minute.png.

## Verbatim diary

The quoted reactions below retain the wording written during play. Timestamps and inputs come from wall-clock.jsonl. The raw log also preserves rendered text returned by the browser; some of that text was below a scroll boundary. Screenshot claims below use the actual viewport images.

- 2026-10-20T13:12:08.670Z, preflight — Control error: "deliberate control-server error-handler test".

- **0.1 s**, 2026-10-20T13:12:09.051Z — open https://warren.adamwhite.work; 01-opening.png. Visible answer / rendered-text record: "◇ human framework".

- **16.63 s**, 2026-10-20T13:12:25.587Z — click Begin; 02-begin.png. “Begin and More about the hill look tappable. I need to dig somewhere safe for the village before riders arrive. I want to see who is already hurt.” Visible answer / rendered-text record: "◇ human framework".

- **23.51 s**, 2026-10-20T13:12:32.466Z — state; 03-game.png. Visible answer / rendered-text record: "midday, 19 August · Year 1 under the hill".

- 2026-10-20T13:12:54.144Z, 45.19 s — Control error: "locator.click: Timeout 3000ms exceeded.\nCall log:\n\u001b[2m  - waiting for getByRole('button', { name: '□ chalk', exact: true })\u001b[22m\n".

- **53.65 s**, 2026-10-20T13:13:02.599Z — tap (82, 550); 04-chalk.png. “Nine exposed and no sleeping room. Chalk looks like the digging tool; I will mark stone next to that little cellar.” Visible answer / rendered-text record: "night, 21 August · Year 1 under the hill"; "Dashed outlines plan a dig. People choose when.".

- **81.18 s**, 2026-10-20T13:13:30.130Z — state; 05-first-minute.png. “First minute checkpoint. I know why to dig, but I have not made a dig yet. The chalk explanation is clear. Days are going by while I look.” Visible answer / rendered-text record: "morning, 22 August · Year 1 under the hill"; "Dashed outlines plan a dig. People choose when.".

- **91.98 s**, 2026-10-20T13:13:40.932Z — tap (227, 258); 06-first-mark.png. “I will try the stone just right of the cellar. I want space for beds before anything else.” Visible answer / rendered-text record: "night, 22 August · Year 1 under the hill"; "Dig planned. If dug, about three can sleep here; riders reach it from the entrance. People choose when to dig.".

- **108.39 s**, 2026-10-20T13:13:57.348Z — tap (247, 258); 07-second-mark.png. “A tap made a dashed dig plan for about three sleepers. Good. It also says riders can reach it from the entrance. I need more than three places.” Visible answer / rendered-text record: "dusk, 23 August · Year 1 under the hill"; "Dig planned. If dug, about three can sleep here; riders reach it from the entrance. People choose when to dig.".

- **123 s**, 2026-10-20T13:14:11.951Z — tap (290, 497); 08-shelter.png. “The harvest warning is red now. I am still worried about the nine exposed people, so I am checking shelter.” Visible answer / rendered-text record: "midday, 24 August · Year 1 under the hill"; "No sleeping places are marked below. The village needs sleeping places. Sleeping places: 0 beyond riders’ reach; 0 exposed. 9 villagers; 9 lack marked space.".

- **139.01 s**, 2026-10-20T13:14:27.964Z — tap (323, 131); 09-back.png. “The shelter check names everyone and tells me nine lack marked space. Beds and shut doors are what make safety. That is useful. I am closing it to mark beds.” Visible answer / rendered-text record: "afternoon, 24 August · Year 1 under the hill".

- **147.59 s**, 2026-10-20T13:14:36.546Z — tap (229, 552); 10-beds.png. “Beds looks like the control for sleeping places. I expect to mark the newly opened space.” Visible answer / rendered-text record: "night, 25 August · Year 1 under the hill"; "Drag over open ground for sleeping places below.".

- **154.11 s**, 2026-10-20T13:14:43.063Z — tap (227, 258); 11-bed-mark.png. “I am marking the first place I dug as sleeping space. I expect three places, even if it is still too close to the entrance.” Visible answer / rendered-text record: "midday, 25 August · Year 1 under the hill"; "Not far enough along the passage from the entrance: riders could reach these sleeping places. Dig farther along a protected passage or close the open route with a stone door. Room for about three people. This room cannot hold the whole village. Sleeping places below have room for about three people. The village needs more sleeping places.".

- **168.04 s**, 2026-10-20T13:14:56.995Z — tap (328, 551); 12-door-tool.png. “The sleeping-place answer is cut off halfway through the remedy. I can read Scroll down, but I want to try the stone door it mentions. Also the clock said night 25 August before and now midday 25 August; I cannot explain that.” Visible answer / rendered-text record: "night, 26 August · Year 1 under the hill"; "Tap a passage one cell wide, open on two opposite sides only. They carve a rolling stone there if it is lit. Three doors at most.".

- **175.86 s**, 2026-10-20T13:15:04.812Z — tap (189, 228); 13-door-place.png. “A one-cell-wide passage open on opposite sides: I think the entrance shaft matches. I will put the door there. It needs light; I do not know if the shaft is lit.” Visible answer / rendered-text record: "midday, 26 August · Year 1 under the hill"; "A door marked. They will carve the rolling stone when someone has the time and a light.".

- **183.43 s**, 2026-10-20T13:15:12.378Z — tap (279, 552); 14-lamp-tool.png. “The door is marked, not built. Someone needs time and a light. I am choosing lamp so this can actually happen.” Visible answer / rendered-text record: "night, 26 August · Year 1 under the hill"; "Tap open ground to hang a lamp. Tap it again to take it down.".

- **188.11 s**, 2026-10-20T13:15:17.061Z — tap (189, 228); 15-lamp-place.png. “I will hang the lamp at the door site.” Visible answer / rendered-text record: "night, 27 August · Year 1 under the hill"; "Lamp hung.".

- **194.84 s**, 2026-10-20T13:15:23.795Z — tap (229, 552); 16-more-beds-tool.png. “The lamp answered immediately. I still need six more places, so I am going back to beds.” Visible answer / rendered-text record: "midday, 27 August · Year 1 under the hill".

- **205.59 s**, 2026-10-20T13:15:34.544Z — tap (247, 258); 17-second-beds.png. “I am marking the next dug cell as beds. The little stone door shape is visible in the shaft now, but nine are still exposed.” Visible answer / rendered-text record: "night, 28 August · Year 1 under the hill"; "The stone door above this room is rolled back: riders could walk into these sleeping places. Shutting it would block their route. Room for about six people. This room cannot hold the whole village. Sleeping places below have room for about six people. The village needs more sleeping places.".

- **212.87 s**, 2026-10-20T13:15:41.826Z — tap (208, 258); 18-third-beds.png. “Now six places, and the door is rolled back. I can fix that after one more bed space.” Visible answer / rendered-text record: "morning, 28 August · Year 1 under the hill"; "The stone door above this room is rolled back: riders could walk into these sleeping places. Shutting it would block their route. Room for about nine people. Enough sleeping space for the village. Sleeping places below have room for about nine people. Enough sleeping space for the village.".

- **219.61 s**, 2026-10-20T13:15:48.561Z — tap (30, 552); 19-look-tool.png. “Enough sleeping space for the village is the first thing that feels reassuring. I am choosing look to find how to shut the door.” Visible answer / rendered-text record: "dusk, 28 August · Year 1 under the hill".

- **225.34 s**, 2026-10-20T13:15:54.292Z — tap (190, 236); 20-door-look.png. “I am tapping the round stone in look mode. I expect a door description or a shut control.” Visible answer / rendered-text record: "night, 29 August · Year 1 under the hill"; "The stone door, rolled back. A quiet-time false alarm can weaken trust in the bell. Ring the bell so an adult nearby and reachable can choose to shut it. Quiet-time calls last six game hours. Smoke or riders also make shutting it a choice. Nearby adults: Hasan: sleep at home; Elif: sleep at home; Kerem: sleep at home; Musa: sleep at home; Ayşe: sleep at home; Hatice: sleep at home; Yusuf Usta: sleep at home; Meryem: sleep at home. The choice is theirs.".

- **248.97 s**, 2026-10-20T13:16:17.925Z — tap (168, 258); 21-person.png. “The door answer starts with the cost of a false alarm. I do not want to ring it just to test. I am tapping the person in the cellar to see if anyone needs help.” Visible answer / rendered-text record: "dawn, 30 August · Year 1 under the hill"; "The hearth. Yusuf Usta sits here.".

- **257.16 s**, 2026-10-20T13:16:26.109Z — tap (82, 551); 22-chalk-again.png. “That tap inspected the hearth, not Yusuf. I cannot see who is hurt from this. I will give the harvest its own space on the left.” Visible answer / rendered-text record: "afternoon, 30 August · Year 1 under the hill".

- **265.31 s**, 2026-10-20T13:16:34.258Z — tap (130, 258); 23-storage-dig.png. “I am marking a small storage extension on the left of the cellar.” Visible answer / rendered-text record: "night, 31 August · Year 1 under the hill"; "Dig planned. If dug, about three can sleep here; riders reach it from the entrance. An open stone door leaves a route open. People choose when to dig.".

- **287.59 s**, 2026-10-20T13:16:56.539Z — state; 24-after-wait.png. “I waited twelve real seconds at the offered Walk speed to let someone dig.” Visible answer / rendered-text record: "night, 1 September · Year 1 under the hill"; "Dig planned. If dug, about three can sleep here; riders reach it from the entrance. An open stone door leaves a route open. People choose when to dig.".

- **294.14 s**, 2026-10-20T13:17:03.089Z — tap (181, 552); 25-store-tool.png. “The left extension is open now, so someone did dig it. I am choosing store.” Visible answer / rendered-text record: "midday, 1 September · Year 1 under the hill"; "Drag over open ground to make it a store. Grain goes where the jars are.".

- **299.14 s**, 2026-10-20T13:17:08.089Z — tap (130, 258); 26-store-place.png. “I am marking the open left extension as storage. I expect the harvest warning to clear if one cell is enough.” Visible answer / rendered-text record: "afternoon, 1 September · Year 1 under the hill"; "Drag over open ground to make it a store. Grain goes where the jars are.".

- **303.37 s**, 2026-10-20T13:17:12.322Z — state; 27-store-check.png. “I did not see a store confirmation. I am checking the screen before tapping again.” Visible answer / rendered-text record: "night, 1 September · Year 1 under the hill"; "Drag over open ground to make it a store. Grain goes where the jars are."; "Jars stand empty below. People must bring the harvest down.".

- **314.32 s**, 2026-10-20T13:17:23.271Z — note; 28-phone-stop.png. “STOP. I am leaving now. I made space for nine and a store, but I am spending my break picking tiny cells and reading clipped safety answers. I still do not feel I know the people. I would rather put the phone down than keep waiting for riders. This is my natural stop, not the eight-minute ceiling.” Visible answer / rendered-text record: "midday, 2 September · Year 1 under the hill"; "Drag over open ground to make it a store. Grain goes where the jars are."; "Smoke on the ridge. No call active. Ring the bell once to call people below until the all-clear. People choose whether to come. Check shelter or keep watching."; "Slow · 1 min/s · raid warning".

- **321.29 s**, 2026-10-20T13:17:30.238Z — resize 1280×800; 29-desktop-after-stop.png. “Post-stop desktop look only. The stop capture has just revealed Smoke on the ridge and Slow 1 min/s raid warning. I had already chosen to leave; I am not resuming to complete the test.” Visible answer / rendered-text record: "midday, 2 September · Year 1 under the hill"; "Drag over open ground to make it a store. Grain goes where the jars are."; "Smoke on the ridge. No call active. Ring the bell once to call people below until the all-clear. People choose whether to come. Check shelter or keep watching."; "Slow · 1 min/s · raid warning".

## What playing felt like

**Best moment:** “Enough sleeping space for the village” after my third bed mark, at 212.83 s (18-third-beds.png). A room I had planned and people had dug could now hold all nine. The earlier shelter check also helped: it named the people and explained why they were exposed.

**Worst moment:** inspecting the stone door at 225.30 s (20-door-look.png). I needed to know how to shut it. The phone showed the false-alarm warning and clipped the sentence beginning “Ring the bell so an adult nearby and…”. The consequence mattered to me, but the response required more reading in a very small panel.

I first recorded frustration about a clipped safety answer at 168.00 s. At 248.93 s I tried to inspect a person; I got “The hearth. Yusuf Usta sits here.” At 257.12 s I recorded that I still could not see who was hurt. This does not establish that anyone was hurt or that individual information was unavailable elsewhere.

I did not hit a long empty stretch that I wanted to accelerate. The friction was selecting small cells and checking small text panels. I chose to leave at 314.29 s. The screenshot taken with that stop note revealed the first smoke warning. I did not resume to answer it. The warning was visible and time had slowed to 1 min/s; I cannot report whether I would have answered in time or what the bell would have done.

## Clarity findings

- **DL-22 FAIL — essential safety responses clipped on the phone.** At 154.07 s, the Reading panel showed “Not far enough along the passage from the entrance: riders could reach these sleeping places. Dig farther along a protected…” and cut off the rest. At 225.30 s, the Stone door panel cut off the instruction beginning “Ring the bell so an adult nearby and…”. Both displayed “Scroll ↓”. The tools stayed visible, but the immediate remedy did not fit without scrolling. See 11-bed-mark.png and 20-door-look.png. The raid response at the stopping screen did fit: the warning and bell control were both visible in 28-phone-stop.png.
- **DL-13 FAIL for the store tap — uncertain acknowledgement.** At 299.10 s I tapped the open left extension with store selected. The Reading panel still said “Drag over open ground to make it a store. Grain goes where the jars are.” I recorded no confirmation. At 303.33 s the top warning changed to “Jars stand empty below. People must bring the harvest down.” I inferred the designation had worked; I did not repeat the tap. Other inputs, including dig plans and “Lamp hung”, gave clear feedback. See 26-store-place.png and 27-store-check.png.
- **DL-15 observed clock inconsistency.** Consecutive screenshots showed “night, 25 August” at 147.55 s, then “midday, 25 August” at 154.07 s; “night, 26 August” at 168.00 s, then “midday, 26 August” at 175.82 s; and “night, 28 August” at 205.55 s, then “morning, 28 August” at 212.83 s. I noticed and logged the first pair at 168.00 s. I could not tell why the clock appeared to go backward. No speed changes or reloads were made. This is an observation, not an explanation of the simulation. See screenshots 10–13 and 17–18.
- **DL-2 / DL-23 concern, not a measured target failure.** The small hearth figure looked like someone I could inspect, but the tap returned the hearth. I did not use the available Zoom controls. A failed attempt to select a person at this scale does not prove that person selection is impossible. Scene hit areas and CSS target sizes were not measured. See 21-person.png.

**Other reached checks:** DL-4's later door prerequisite was explained: “when someone has the time and a light” (13-door-place.png). I hung a lamp and later saw a rolled-back stone door. I did not establish who carved it. DL-5 and DL-16 were readable for the shelter problem: more sleeping space, depth or a shut stone door were described. DL-14 gave a useful known risk before I rang anything: false alarms could weaken trust. I chose not to ring during quiet time. DL-17/18: the supplies I met were phrased as approximate stores, not mood percentages; I did not inspect individual emotional or health displays. DL-24: the shelter menu closed back to the hill; no stacked-sheet failure encountered. DL-26: Game menu was visible without scrolling, and Check shelter opened its people tab.

**Unmet checks:** no completed day/chapter/game boundary tested (DL-12). No fast-speed consequential-choice response tested (DL-15); the smoke warning arrived only at stop. No reload/resume (DL-27), authorized send (DL-28), or replay/import (DL-29). No 320 px, dark-mode or 200% text test (DL-25). Builder-only checks, including capability-limit implementation, word-count/layout internals and export replay, were not tested. I did not encounter six of seven tool interactions by the first-minute checkpoint; later I reached look, chalk, store, beds, lamp and door, leaving rub out untested. Bell and all speed-change controls remained untested.

## English, dates and layout

- **DL-20 PASS for reached actions.** I could act in English: chalk, beds, lamp, door, store, Check shelter. The label Yusuf Usta did not block an action; the hearth reading named who sat there. No necessary untranslated unit or role blocked me.
- **DL-21 NOT TESTED for deadline comparison.** Today was readable as “19 August · Year 1 under the hill” at the start, and later “2 September”. I met no dated deadline to compare with today, and I did not test returning after a break. The clock inconsistencies above concern time progression, not translation.
- **DL-22 FAIL for the clipped safety answers**, with a successful final warning layout as described above. On the phone the lower tools were reachable without scrolling, and the immediate raid warning plus bell were visible at stop. The normal shelter summary also clipped its long bell explanation (03-game.png).

At **1280×800**, the same stopped screen placed the scene on the left and the Reading panel and controls on the right. The current short store explanation fit. The raid warning stayed across the top. The tiny people remained small within a much larger hill. This was one post-stop look only; I did not reopen the long door answer on desktop (29-desktop-after-stop.png).

## Stop and return

Stopped voluntarily at 5 min 14 s with room marked for about nine, a storage extension, a lamp and a rolled-back stone door. No bell call was active. The final capture showed smoke on the ridge. I did not finish or observe an outcome for the village.

I would not return voluntarily on this phone during a short break. The digging and the promise of shelter interested me, but I wanted to recognise people and read the safety response without working through a clipped panel. I might try it on a tablet.

## Changes I would want, ranked

1. Keep the immediate safety response visible: tell me how to protect these beds or shut this door before the panel cuts off.
2. Make it easier to select a person on the phone and tell me whether they need help.
3. Acknowledge the storage designation directly, so I know whether my tap worked.

## Artifacts and evidence limits

- Report: warren-round2.md.
- Diary: warren-round2-shots/wall-clock.jsonl, timestamped during play.
- Screenshots: warren-round2-shots/01-opening.png through 29-desktop-after-stop.png (individual names in the diary).
- Local browser controller: /Users/abdul/code/.lab-scratch/design-round/retest-warren-round2/control.cjs; persistent process retained.
- No playtest export downloaded. No replay claim.

Checkpoint arithmetic correction: the opening essential instructions contain 19 words by a simple whitespace count, not the 23 I wrote at the checkpoint. The original checkpoint answer is retained above. This does not change the within-30-second tool availability observation.
