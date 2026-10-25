# The Warren — source-unread playtest

Teodor, 40, tunnel engineer on a metro project. I play Dwarf Fortress, Timberborn and Against the Storm. I want to plan rooms and see people make them real. I want the plan and its safety answer readable together. This was a one-handed phone lunch-break session.

URL: https://warren.adamwhite.work. No game build identifier was visible. The title credited “Human Framework 2.8.0”; that is the visible framework credit, not an established game build.

Device: 360×690 CSS px, Chromium with touch/mobile emulation, light mode, default text size. Access: local Playwright in one long-lived Node process, one persistent browser page. I used normal coordinate taps and one attempted named button click. I did not use source, bundles, network payloads, internal state or debug APIs. I did not send a run, submit telemetry through any player control, change consent or download an export. I left the privacy control untouched; background telemetry behavior was not inspected.

The eight-minute limit was a ceiling. First actionable title: 2026-10-20 15:44:08.744 UTC (10:44:08.744 CDT). First gameplay screen: +6.2 s. Last gameplay input and natural stop: 15:48:50.239 UTC, +281.5 s (4 min 41.5 s). The ceiling did not end play. Required desktop look: 1280×800 at +290.7 s; no further gameplay inputs. The process was then stopped by its exact PID.

Time advanced normally while I read and wrote observations. I did not change the visible speed controls. The page displayed “Walk · 72 min/s” and automatically displayed “Slow · 18 min/s · reading” during readings. Tool/reporting time therefore consumed real play time. I did not test fast-speed live-choice slowdown. The title and gameplay clock are separate: gameplay went from dawn, 19 August to afternoon, 26 August, Year 1.

Access limitation: the attempted Playwright `getByRole('button', { name: 'Zoom +', exact: true }).click()` timed out after 30000 ms. A normal coordinate tap on the visible Zoom + worked. This is an automation/access limitation, not evidence of an inert game control. No game repair was attempted. I placed individual cells with taps; I did not test drag gestures. The report makes no claim that dragging fails or that individual taps are required.

## First minute

Checkpoint at 59.6 seconds after the first usable screen (15:45:08.349Z; opening 15:44:08.744Z). Inputs stopped for the checkpoint. Screenshot: 08-first-minute.png.

| Item                       | Status                                                 | My answer at the checkpoint                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 A reason to act       | PASS                                                   | I need sleeping places and a safe refuge for nine people before riders come. The opening says to outlast the riders; the strip says nine exposed.                                                                                                                                                                                                                                |
| DL-2 What can I touch      | PASS                                                   | Begin, More about the hill, outlined zoom/People controls, the bottom tools, arrows, bell and Game menu look tappable. Chalk highlights when selected. Tapping stone made a plan. I have not met an inert thing I mistook for a control. The attempted named Zoom + click is still an automation issue, not evidence that the visible control is inert.                          |
| DL-3 Urgency and selection | PASS                                                   | Nine exposed and the red instruction draw me first. Now dry water jars compete with shelter. Chalk is selected in a darker box. I know shelter matters; I have not seen when the riders arrive.                                                                                                                                                                                  |
| DL-4 Why the limit         | NOT TESTED                                             | I have not tried an unavailable action. Last reading was initially grey, but I did not try it then.                                                                                                                                                                                                                                                                              |
| DL-5 Readable situation    | PASS                                                   | I have planned two small digs. People choose when to take up a pick. I can plan more or place a door; the safety answer says dig deeper or shut doors on every open route. Nobody has visibly completed my room yet.                                                                                                                                                             |
| DL-6 A choice soon         | PASS                                                   | Planning tools were visible at 6.2 s after the title; no more than 23 opening instruction/story words preceded them. I selected chalk at 22.6 s and made my first plan at 30.2 s. My tool choice was available before 30 s; my first actual room plan landed just after it.                                                                                                      |
| DL-7 Learn by doing        | PASS for chalk reached; NOT TESTED for six other tools | Tapping chalk taught me dashed outlines are plans and people choose when to work. Tapping beside the cellar gave about three sleeping places and a readable warning about riders. My next deeper tap gave the same safety answer. I still cannot tell how deep is deep enough. No optional help used. Look, rub out, store, beds, lamp and door are six unmet tool interactions. |


## Verbatim diary

The original JSONL is `(driver scratch)/retest/warren2-shots/wall-clock.jsonl`. Elapsed values refer to the observed screen/input moment; the timestamp is when that diary entry was persisted. Entries were written during play, sometimes after a screenshot or short tool delay. The wording below is preserved.

### +0 s — First usable screen

Logged: 2026-10-20T15:44:14.778Z

I need to dig a refuge before riders arrive. Begin and More about the hill look tappable. Chalk and dragging sound like the room planning I came for.

Visible answer: Dig a refuge where the village can outlast the riders. Choose chalk, then drag across stone beside the cellar.

### +23 s — Tapped chalk

Logged: 2026-10-20T15:44:38.900Z

The tools are clear. The hill is a very thin strip. Dashed outlines plan a dig; people choose when. I expect a tap beside the cellar to start a small room.

Visible answer: Reading: Dashed outlines plan a dig. People choose when.

### +30 s — Tapped stone immediately right of the cellar

Logged: 2026-10-20T15:44:47.418Z

That worked as a tiny plan. Three sleeping places is useful, but the entrance admits riders. I can read the whole safety answer and the nine exposed at once. I want to dig down rather than leave a straight route.

Visible answer: Dig planned. If dug: about three sleeping places. The entrance admits riders. Dig deeper, or shut doors on every open route. People choose when to dig.

### +59.6 s — First minute; stopped inputs and wrote first-minute.md

Logged: 2026-10-20T15:45:31.723Z

I know why I am digging and can read the safety answer. I cannot yet tell how deep will be safe. The hill is tiny, but the controls are clear. Now the water jars are dry as well.

Visible answer: night, 21 August; sleeping places about zero; nine exposed; the water jars are dry

### +87.5 s — Tapped Zoom + at its visible position

Logged: 2026-10-20T15:45:42.856Z

Ah, Musa has made the space real. Zoom makes it readable. I want beds first: nine exposed matters more to me than another store. I can see a little person moving in the cellar.

Visible answer: Musa broke through the first chalked wall and stood in the new space, coughing dust. The harvest needs more room below. Mark open ground as a store for the jars.

### +97.9 s — Selected beds and tapped the lower open cell

Logged: 2026-10-20T15:45:54.177Z

Three beds are placed, but all nine are still exposed. The answer tells me riders can reach these beds. I will put a door in the neck above the room; that seems more controlled than digging blindly deeper.

Visible answer: Dig deeper, or shut stone doors on every open route. Riders reach these beds from the entrance. Room for about three. More sleeping places needed.

### +109 s — Selected door and tapped the narrow shaft above the room

Logged: 2026-10-20T15:46:06.259Z

The door plan is acknowledged. It needs time and a light, which is a useful reason to reach for the lamp. I can read the three beds and nine exposed while I do this. Three doors at most is stated, but I do not know why.

Visible answer: A door marked. They will carve the rolling stone when someone has the time and a light.

### +121 s — Selected lamp and tapped the marked door cell

Logged: 2026-10-20T15:46:16.693Z

Lamp hung is immediate. That is a satisfying direct action. I want to know who can build the door and when the riders are expected, so I am opening People.

Visible answer: Lamp hung.

### +128.2 s — Tapped People

Logged: 2026-10-20T15:46:32.540Z

Shelter check explains the arithmetic well: zero safe, three exposed, six without space. The top status stays visible. The people list starts below the fold; I cannot read Hasan’s answer in the current view. I have not found a rider deadline.

Visible answer: Sleeping places: 0 beyond riders’ reach; 3 exposed near the entrance. 9 villagers; 6 lack marked space.

### +158.9 s — Selected chalk; tapped stone right of the room

Logged: 2026-10-20T15:46:55.069Z

The door exists now: Meryem rolled it once to see. The new plan says shut open stone doors, which is more specific than before. I want to shut that door. The lower room is pressed against the bottom of the hill strip after the camera moved.

Visible answer: Dig planned. If dug: about three sleeping places. The entrance admits riders. Shut open stone doors; check other routes. People choose when to dig.

### +169.7 s — Selected look; tapped the stone door

Logged: 2026-10-20T15:47:06.169Z

I expected to shut the door here. Instead it tells me to ring the bell and someone may choose to shut it. False alarms weaken trust, so I will not call an alarm just to make my safety number improve. That is a real tradeoff. I want to know when riders are due.

Visible answer: Ring the bell. Door rolled back; a nearby adult who can reach it may choose to shut it. False alarms can weaken trust. Quiet-time calls last six game hours.

### +183.5 s — Tapped Open journal

Logged: 2026-10-20T15:47:29.604Z

The journal opens as Game menu. Its first entry is cut off after Hang a lamp where the dark stops the… even though there is a large blank area below. I came here for the threat timing, and now I am trying to read through a slot. I will go back to the hill.

Visible answer: 24 August · Year 1 under the hill; ✓ Hang a lamp where the dark stops the [last line clipped]

Screenshot: 23-journal.png

### +213.1 s — Fit hill, Zoom +, selected chalk, planned a second lower cell

Logged: 2026-10-20T15:47:56.494Z

Fit hill and zoom recovered the room. That takes two taps whenever I lose the lower edge. I am making enough room for the other six, but I would rather be drawing a room than placing tiny squares. The safety answer is still fully readable.

Visible answer: Dig planned. If dug: about three sleeping places. The entrance admits riders. Shut open stone doors; check other routes. People choose when to dig.

### +238.2 s — Hung lamp at the far end; selected store and marked the same open cell

Logged: 2026-10-20T15:48:17.041Z

Now the jars appear where I put the store, and the instruction changes to bringing the harvest down. That is clear cause and effect. I can keep planning instead of just watching. I still want the other beds finished.

Visible answer: Store marked. People can bring grain to these jars. Jars stand empty below. People must bring the harvest down.

### +248.5 s — Selected beds and marked an open cell beside the store

Logged: 2026-10-20T15:48:26.428Z

Six beds now. This answer names the actual open door above the room and keeps the false-alarm cost beside it. That is better than a generic unsafe label. The last chalked cell has not opened yet; I want to know what is stopping it.

Visible answer: Ring the bell; a nearby adult may shut the open stone door above this room, blocking riders. False alarms can weaken trust. Room for about three. More sleeping places needed.

### +269.4 s — Inspected the unbuilt cell, then watched the same view

Logged: 2026-10-20T15:48:46.366Z

The answer changed itself to Excavated plan while I read it. Good: it says the ground is open and beds still need marking. I do not have to guess whether the dig finished. I will mark the last beds, then leave for lunch.

Visible answer: With these beds: about nine sleeping places. The entrance admits riders. Shut open stone doors; check other routes. This ground is open now; beds still need marking.

### +281.5 s — Marked the last beds; stopped play

Logged: 2026-10-20T15:48:59.365Z

Enough for the village is a good stopping point for my lunch break. Nine exposed still makes sense because I have not called the bell. I am leaving deliberately, not because there is nothing to do. I would return on a larger screen; I do not want to keep managing this narrow hill one-handed.

Visible answer: Sleeping places for about nine · nine exposed. Ring the bell; a nearby adult may shut the open stone door above this room, blocking riders. False alarms can weaken trust. Room for about nine. Enough for the village.

Screenshot: 39-stop-nine-beds.png

### +290.7 s — Required post-stop look at 1280x800; no gameplay input

Logged: 2026-10-20T15:50:21.472Z

On desktop I can see the whole hill and keep the complete safety answer beside it. This is the view I would want to return to.

Visible answer: Same nine beds and nine exposed, with the Reading sheet at the right.

Screenshot: 40-desktop-after-stop.png

## Best and worst moments

Best: the inspected “Unbuilt plan” changed to “Excavated plan” while I read it. “This ground is open now; beds still need marking” gave me an immediate next act, without pretending the beds already existed. Marking them brought the total to nine. The earlier moment when Musa broke through my first chalked wall also delivered the appeal: someone made my plan real.

Worst: opening the journal to look for threat timing and seeing the first entry cut off in a short reading area, with blank space beneath it. The hill also became awkward to work on when the room reached the lower edge of its strip. Fit hill then Zoom + recovered it.

I became mildly frustrated at +183.5 s in the journal. I did not become bored or reach a forced-wait quit. At +269.4 s I decided to mark the final beds and leave. At +281.5 s I stopped: enough beds was a useful lunch-break endpoint. I still had things I could do.

## Clarity failures and limits of the evidence

- **DL-30: journal text is cut off.** In `23-journal.png`, the first dated entry shows “✓ Hang a lamp where the dark stops the” followed by only part of the final line at the lower edge of its reading area. The sentence is not fully readable there. The rendered text extraction contained the complete entry, but that does not make the screenshot readable. I did not scroll to uncover it. There is a large blank area below the clipped entry.
- **DL-31: the room can sit against the scene’s lower edge while planning.** In `19-expand.png`, my selected right-hand dig is visible, but the lower bed cell runs into the bottom of the scene strip. I cannot comfortably inspect the whole room while its safety answer is open. The goal strip and full answer remain readable. Fit hill then Zoom + recovered a better view in `26-rezoom.png`. This is a scene-context failure in the reached view, not a claim that every sheet hides the room.
- **DL-10: the journal’s outer title changes.** I tapped “Open journal”; the selected journal tab opened under “Game menu” (`23-journal.png`). I could identify the journal tab, so this was a minor naming surprise, not a blocked action.

I could not tell when riders would arrive. I did not establish that the game has a known fixed deadline or lacks a threat rule. I did not finish reading the journal. “Three doors at most” was stated in the door help (`12-door-tool.png`), but I did not reach that limit or learn why it exists. Neither observation establishes an unavailable-action failure.

## Required checks after the first minute

| Item                          | Status                                         | Reached evidence                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-20 English                 | PASS for reached actions                       | Chalk, beds, store, lamp, door and their answers were actionable in English. No necessary untranslated term blocked me. I did not need to interpret “Usta” to act.                                                                                                                                                                                                                  |
| DL-21 Dates                   | NOT TESTED for deadline comparison             | Today was readable as “26 August · Year 1 under the hill”; the journal used English August dates. No deadline comparison across months, years or a return from a break was reached.                                                                                                                                                                                                 |
| DL-22 Phone response          | PASS for reached scene actions                 | Full dig, bed, door and lamp responses fit with the goal strip and tools, without scrolling. The final nine-bed safety answer is fully visible in `39-stop-nine-beds.png`. This does not excuse the journal defect.                                                                                                                                                                 |
| DL-30 Nothing cut off         | FAIL                                           | Journal entry clipped in `23-journal.png`. The main safety answers were complete, including `04-small-dig.png`, `11-beds.png`, `34-six-beds.png` and `39-stop-nine-beds.png`.                                                                                                                                                                                                       |
| DL-31 Read state while acting | FAIL in the reached scene view; partial passes | Beds total and exposure remained readable while planning. At +128.2 s People showed 0 safe, 3 exposed and 6 without space, but the first person’s card was below the visible body (`16-people.png`); I did not scroll it. At +158.9 s part of the room reached the scene’s bottom edge (`19-expand.png`). Deadline and person-specific answer comparison were not established.      |
| DL-32 Hands available         | NOT TESTED as a universal timing pass          | I did not meet a stretch where I wanted an act and could only watch. The second lower plan remained unbuilt for roughly 56 s after marking it (+213.1 to +269.4), but I could hang a lamp, mark a store, mark other beds and inspect it during that interval. That is work waiting, not an established forced-watch gap. No claim about every 20-second interval or unseen options. |
| DL-33 Acts in the scene       | PASS for reached planning/placing; limited     | I selected a tool and tapped ground to plan digs, mark beds/store or hang lamps. No multi-field form or Confirm sequence intervened. People performed the excavation; I did not perform a manual digging act. Tapping the door with Look opened a short inspection, which told me to ring the visible bell. I did not ring it or test closure.                                      |

Additional reached observations: **DL-13 PASS** — plans, beds, store and lamps were acknowledged promptly, and plans were called plans. **DL-14 PASS for the bell decision read** — the risk “False alarms can weaken trust” was visible before I chose not to ring. **DL-24 PASS for reached sheet transitions** — People and journal replaced the existing reading; closing returned to the hill without stacked sheets. **DL-15 NOT TESTED in full** — visible Walk/Slow states were reached, but I did not test a live choice at fast speed. **DL-26 partial** — Game menu was reachable at the bottom without scrolling; save/run controls were not exercised. DL-27, DL-28 and DL-29 are **NOT TESTED**. Sending was prohibited. Builder checks and unmet interactions are **NOT TESTED**.

## Stop and return

At the stop the visible state was afternoon, 26 August, Year 1; about nine sleeping places; nine exposed; bell quiet; jars below for the winter, just; water jars full. The door was open. I deliberately did not create a false alarm to improve the exposure count. I had not survived a raid or completed the game.

I would return voluntarily on a larger screen. The planning and villagers carrying it out are appealing. On this phone I spent too much attention managing a narrow view of the hill. The single post-stop desktop look (`40-desktop-after-stop.png`) showed the whole hill beside the complete safety answer. No desktop gameplay was tested.

## Changes I want, ranked

1. Let me read the journal entry without a sentence being cut off. I went there to understand the threat.
2. Keep the room I am working on fully visible with its safety answer. The answer itself already fits well.
3. Make the threat context easier to find when I am deciding whether to ring the bell. If the village does not know a date, tell me what it knows; I am not asking for a guaranteed countdown.

Screenshots: `(driver scratch)/retest/warren2-shots/`. No export was downloaded.
