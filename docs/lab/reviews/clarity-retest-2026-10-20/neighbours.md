# Neighbours — source-unread phone playtest

## Assignment and limits

Rafael, 36, social worker. Plays city-builders and The Sims. Wants to help specific people. Patient with loading, impatient with menus. Playing on his phone at lunch.

Live URL: https://neighbours.adamwhite.work. No build identifier was visibly encountered. Date: 20 October 2026. Access: headless Chromium through Playwright, controlled by a long-lived Node HTTP server keeping the same page open throughout mobile play. Phone: 360×690 CSS px, touch emulation, light mode, device scale factor 1. After stopping, one visual look at a fresh 1280×800 light-mode title screen; no desktop gameplay.

Eight real minutes was a ceiling. Mobile play stopped voluntarily at **198.7 seconds (3:18.7)**, at Day 1, 09:30, with Ravi's sheet open and the game paused for a new story. The budget did not expire. No telemetry, run submission, consent change, export, source inspection, network inspection, hidden state inspection, save inspection or debug API was used. Only the two assigned documents were read. Screenshots and this report are outputs.

**Important limitation:** the one wheel-scroll attempt at 36.1 seconds did not move the sheet. The automation had no explicit pointer positioning before that wheel event, so it does not establish that scrolling inside the sheet fails. No successful sheet scroll was tested. This limits the early-quit result: it establishes what was visible without scrolling and the frustration of the attempted path, not that a normal phone player cannot reach further controls. No browser command failed, and no page reconnection or game repair was needed.

Wall-clock start: **2026-10-20 08:47:21.4 UTC** (03:47:21.4 CDT), at the opening title screen. The initial screenshot caught its fade-in; a settled title screenshot was taken at +7.3 seconds. The persistent server saved a checkpoint screenshot at about +60 seconds. The written checkpoint was recorded at **+64.0 seconds**, before further input. The four-second lateness was tool/recording overhead. All elapsed times below use the same real clock, including thinking and tool overhead. Game time remained separate. The initial title says the simulation starts paused. Play was pressed once at +92.8 seconds, at the offered 1× speed; no speed change, Step or Next was used. The clock reached 09:00 by +97.7 seconds and 09:30 by +109.9 seconds, then visibly paused for a new story.

Evidence files are in [neighbours-shots](neighbours-shots/). Durable wall-clock events and original notes were appended as they happened to [neighbours-timestamps.jsonl](neighbours-timestamps.jsonl). No export was downloaded.

## First minute

These are the original checkpoint answers, recorded at +64.0 seconds. Later discoveries do not change them. Screen: [checkpoint-60s.png](neighbours-shots/checkpoint-60s.png).

| Item | Original answer                                                                                                                                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | PASS — I want to help neighbours rebuild after a flood; the title told me this. I have not yet found a specific request.                                                                                                        |
| DL-2 | PASS — Enter town, triangles, named people, map places, Play, Step, Next, speed, tabs and Game menu look tappable. Ada opened a sheet and selected her map circle. No inert target tried; further sheet content remains unseen. |
| DL-3 | FAIL — Choose a place to walk drew me first. Ada has a double circle after selection. I see high water and Hall awaiting repair, but cannot tell who needs help urgently; Free to choose does not tell me that.                 |
| DL-4 | NOT TESTED — No unavailable action encountered.                                                                                                                                                                                 |
| DL-5 | PASS — Time is paused at Day 1 08:00 in rain. Walk somewhere is an available response; Play is also visible.                                                                                                                    |
| DL-6 | PASS — Choosing a place or person was visible by 14.7s, with 26 mandatory story words before entry. First meaningful selection was Ada at 23.3s; Enter town was at 12.3s. Walking or helping has not yet been committed.        |
| DL-7 | PASS for one reached inspection — tapping Ada taught me her job and location and visibly selected her. Walking, talking/helping and advancing time remain NOT TESTED (three interaction types). No help opened.                 |

Checkpoint qualifications: the DL-3 failure describes my inability to identify urgency; it does not establish that an urgent deadline existed. The DL-6 word count of 26 was an in-session counting error, retained above verbatim. The opening headline and invitation contain 16 words; the eyebrow adds six. The 26 figure should not be used as measurement. The early choice was **which person to inspect**, not a request or a completed help action. First committed travel was +82.9 seconds; no ask was reached. I did not establish that a consequential response was available within the first 30 seconds.

## Verbatim diary

Original wording, without later rewriting. UTC wall time and elapsed real time are shown. Inputs and visible answers are documented separately below.

**08:47:33.723 — +12.3s**
> I can enter a town after a flood. I want to find somebody who needs help. Enter town looks like the way in; the little triangles look like expandable explanations.

**08:47:44.728 — +23.3s**
> The town is paused at Day 1, 08:00, in rain. Choose a place to walk tells me what to try. The letters on the map and the named people along the bottom look tappable. I will try Ada; I do not know who needs help yet.

**08:47:57.575 — +36.1s**
> Ada is a carpenter and Free to choose at the workshop. This sheet also says I am at Riverside homes. I cannot see what I can do for her; the bottom is behind the play controls. I will scroll.

**08:48:32.321 — +70.9s**
> A minute in, I know where people are, but not who needs me. I am going to walk to the workshop and see Ada there.

**08:48:44.336 — +82.9s**
> Walking to the workshop says about 60 min. That is a useful cost before I choose it. I expect to spend time travelling, then talk to Ada.

**08:48:54.244 — +92.8s**
> The sheet now says Walking to Workshop, arriving about 09:00. Other destinations are grey. I take that to mean I must arrive before choosing another walk. The clock is still 08:00, so I will start Play.

**08:49:07.300 — +105.9s**
> Play moved the clock an hour within a few seconds. Get an answer is now the strongest prompt, so I will open it. The little you marker is on a path; I am not sure whether I have arrived.

**08:49:21.461 — +120.0s**
> Get an answer opens the Journal. It says I am at Workshop, 1 awake here, and I must pick someone here and ask. That helps. A new story has paused the clock at 09:30, and Read story is visible.

**08:49:47.683 — +146.2s**
> The story is about Lea teaching Ada to judge timber. It feels like people know things rather than just having scores. I like that. I still want to talk to Ada, so I will follow her.

**08:49:59.250 — +157.8s**
> Ada has moved to the flooded hall. Her sheet says Leave a question for an inspector and wait up to two hours, but I cannot see a question button in this view. I will try the person actually at the workshop.

**08:50:22.690 — +181.2s**
> Ravi is a mechanic, working a paid workshop shift until 10:15. That gives me a person and a clear time, but I still see description instead of something I can ask. I will try the shift text.

**08:50:40.109 — +198.7s**
> The shift text did not open a response. I am spending lunch looking through sheets instead of helping someone. I would put this away now. I have not proved that the actions are absent; I have not got to them.

## Inputs and visible answers

| Real elapsed | Input or observation                                | Visible answer and evidence                                                                                                                                                                                                                                                                                                             |
| ------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1–7.3s     | Look at opening title                               | “A town rebuilding after a flood.” “Watch a day unfold, or help your neighbours rebuild.” Red Enter town button. [02-title-ready](neighbours-shots/02-title-ready.png).                                                                                                                                                                 |
| 12.3s        | Tap Enter town                                      | By 14.7s, town map, Day 1 08:00 Rain, “Choose a place to walk →”, people, transport/time controls and tabs. [03-entered](neighbours-shots/03-entered.png).                                                                                                                                                                              |
| 23.3s        | Tap Ada in bottom people strip                      | Ada's map marker gains an outer ring. Sheet settles with “You are at Riverside homes. 201 awake here.” Ada, carpenter, Workshop, “Free to choose.” Only a fragment of the next line is visible above fixed time controls. [05-ada-ready](neighbours-shots/05-ada-ready.png).                                                            |
| 36.1s        | One wheel-scroll attempt                            | No visible movement by 39.9s. **Inconclusive tooling**, not evidence of broken game scrolling. [06-ada-scroll](neighbours-shots/06-ada-scroll.png).                                                                                                                                                                                     |
| ~60s / 64.0s | Stop inputs; automatic screenshot; write checkpoint | Ada sheet and paused 08:00 persist. No inputs between the scroll and checkpoint. [checkpoint-60s](neighbours-shots/checkpoint-60s.png).                                                                                                                                                                                                 |
| 70.9s        | Tap Walk somewhere                                  | Destination buttons appear inside the sheet: Market kitchen about 30 min, Clinic about 45 min, Workshop about 60 min, Quay about 30 min. [07-walk](neighbours-shots/07-walk.png).                                                                                                                                                       |
| 82.9s        | Tap Workshop                                        | “Walking to Workshop, arriving about 09:00.” Destination buttons grey out. Clock remains 08:00. [08-workshop-travel](neighbours-shots/08-workshop-travel.png).                                                                                                                                                                          |
| 92.8s        | Close sheet; tap Play at 1×                         | By 97.7s, clock 09:00, button Pause, “Get an answer →”, moving people/you marker. [09-running](neighbours-shots/09-running.png).                                                                                                                                                                                                        |
| 105.9s       | Tap Get an answer                                   | Journal: “You are at Workshop. 1 awake here.” “Pick someone here and ask for one of the things they could actually do now. You can read how they seem, but you learn their answer only by asking.” By screenshot at 109.9s, Day 1 09:30 and “Paused for a new story / Read story.” [10-get-answer](neighbours-shots/10-get-answer.png). |
| 120.0s       | Tap Read story                                      | “The town's record”, Day 1 · 09:30 · hall explanation, “A question became a shared method”. Lea showed Ada how dry, sound timber differs from wet timber and when another opinion is needed. Follow Lea and Follow Ada links. [11-read-story](neighbours-shots/11-read-story.png).                                                      |
| 146.3s       | Tap Follow Ada                                      | Ada sheet; player still Workshop. Ada now “RIGHT NOW · FLOODED HALL”, “Leave a question for an inspector and wait up to two hours.” No question control visible within the viewport. [12-follow-ada](neighbours-shots/12-follow-ada.png).                                                                                               |
| 157.8s       | Close Ada sheet                                     | Town at 09:30, paused for new story, Get an answer still present. [13-town-0930](neighbours-shots/13-town-0930.png).                                                                                                                                                                                                                    |
| 168.4s       | Tap R marker near Workshop                          | Ravi, mechanic, “RIGHT NOW · WORKSHOP”, “Work a paid workshop shift”, “Until 10:15.” Lower content is outside the visible sheet area. [14-rui](neighbours-shots/14-rui.png); filename is just an output label, the visible name is Ravi.                                                                                                |
| 181.3s       | Tap Work a paid workshop shift text                 | No visible change by 198.7s. I had guessed it might open something; it was not styled like the red Walk somewhere link. [15-shift-text-result](neighbours-shots/15-shift-text-result.png).                                                                                                                                              |
| 198.7s       | Stop                                                | Final phone state as above. No final run screen or game ending reached.                                                                                                                                                                                                                                                                 |
| 206.1s       | After session: look once at settled desktop title   | Fresh context, 1280×800. Title, invitation, Enter town, explanatory text, folded sections and All games fit. No game entry or further interaction. [desktop-first-screen](neighbours-shots/desktop-first-screen.png).                                                                                                                   |

## Best, worst, and leaving

**Best:** “A question became a shared method.” A person teaching another person how to assess timber made this town feel social. That fits why I came. The explicit travel estimate and arrival message also made one action easy to understand.

**Worst:** after opening Ada and then Ravi, I could identify their work but still had not reached an ask. The player-location text, person-location text and general walking prompt consumed much of each phone sheet before the part I wanted.

I first expressed friction at +36.1 seconds, when I could not see what I could do for Ada. By +181.2 seconds I was trying descriptive shift text because I still wanted a response. At **+198.7 seconds** I would put the phone away. This was frustration with finding the interaction, rather than boredom during a quiet simulation stretch. The untested sheet scrolling is a material qualification to that conclusion.

I would **not return voluntarily on my next short lunch break** on the evidence of this session. The story gave me a reason to be interested; reaching a person I could help did not happen in the time I was willing to spend. I did not finish the game and cannot judge its later choices.

## Clarity findings

- **DL-22: FAIL for the immediate phone view reached.** “I cannot see what I can do for her.” Ada's sheet shows walking/player context, identity and current work, with further content below the fixed controls. Following Ada later shows “Leave a question for an inspector and wait up to two hours,” but no visible way to leave it. Ravi's sheet likewise ends at current work. See 05, checkpoint, 12 and 14. This is evidence about the initial viewport. It is **not** a claim that lower actions are absent or unreachable by a properly targeted scroll.
- **DL-3: FAIL at the first-minute checkpoint, with limited scope.** “I do not know who needs help yet.” “Choose a place to walk” was the prominent prompt; “Free to choose” described Ada without making a need apparent. Her selected ring was visible. No actual urgent deadline was established, so I cannot claim the game hid a known emergency. See 03 and 05.
- **DL-16: NOT TESTED for completing the presented ask.** The Journal clearly told me to pick someone here and ask. I did not reach an ask control. The viewport evidence explains my uncertainty, but the scroll limitation prevents a claim that no response exists.
- **DL-13: PASS for travel acknowledgement and inspection.** The destination choice immediately became “Walking to Workshop, arriving about 09:00.” Person taps opened the named sheet; Follow Ada opened Ada. The inert descriptive-text tap at the end was my exploratory guess, not proof an accepted command was ignored.
- **DL-14: PASS for the one committed travel choice.** “about 60 min” was shown before choosing Workshop. No request cost or risk was tested.
- **DL-4: PASS only for the later travel limit observed.** Other destinations greyed out during “Walking to Workshop, arriving about 09:00.” I inferred arrival would free walking; I did not reopen the destination list after arrival to verify recovery. First-minute status remains NOT TESTED.
- **DL-15: NOT TESTED as a complete criterion.** Play/Pause, 1× and the clock were visible. An ordinary new story visibly paused the game at 09:30. I never changed to fast speed or met and answered a consequential live choice, so slowdown, retained opportunity and speed restoration were not established.
- **DL-24: PASS for the limited navigation reached.** Person sheets had a visible close control returning to town. Read story and Follow Ada replaced the current view. Cancel paths and focus restoration were not tested.
- **DL-26: PASS for discoverability only.** Game menu remained visible at the top without scrolling. Its contents and save/run controls were not opened or tested.

## English, dates and phone layout

| Item  | Status and evidence                                                                                                                                                                                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DL-20 | **PASS for all action text met.** Enter town, Walk somewhere, Workshop, Get an answer, Play, Read story, Follow Ada, carpenter and mechanic were understandable in English. No necessary untranslated local term was encountered.                                                                                              |
| DL-21 | **PASS for the same-day comparisons reached.** At Day 1 08:00, “about 60 min” and arrival “about 09:00” were readily comparable. At Day 1 09:30, Ravi's “Until 10:15” meant about 45 game minutes later. “wait up to two hours” was also intelligible. Cross-month/year deadlines and returning after a break: **NOT TESTED**. |
| DL-22 | **FAIL for the initial person-sheet response visibility**, as detailed above. Phone screenshots establish that finding an ask required more than the initial viewport. Successful sheet scrolling, keyboard-open reachability and safe areas: **NOT TESTED**.                                                                  |

## Other checklist coverage

These statuses cover only the interactions reached. Builder checks were not performed.

| IDs              | Coverage                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1, DL-2, DL-5 | First-minute PASS, unchanged within that scope. DL-2 later includes one unsuccessful experimental tap on descriptive shift text; no wider target audit.                                           |
| DL-6             | Original checkpoint PASS concerns person selection. Consequential response availability within 30 seconds was not established; first travel commitment was +82.9s.                                |
| DL-7             | Inspection and travel taught their limited interactions. Asking/helping: NOT TESTED, zero asks reached. No in-game help opened; the Journal instruction was read.                                 |
| DL-8             | NOT TESTED for a known urgent decision. General navigation prompts and story text were read; no deadline requiring a response was established.                                                    |
| DL-9             | NOT TESTED for time-critical obligations. The current “Get an answer” task was visible outside the log, but no deadline was met.                                                                  |
| DL-10            | NOT TESTED for action-critical alias consistency. “Workshop” stayed recognisable. “Hall” and “Flooded hall” appeared, without a tested action depending on their distinction.                     |
| DL-11            | NOT TESTED as a word-count/layout audit. One short story and one Journal instruction were read. The erroneous first-minute count is corrected above.                                              |
| DL-12            | NOT TESTED: no day, chapter or game ending reached. The game pause was visibly labelled.                                                                                                          |
| DL-17            | NOT TESTED for interpreting feelings. No mood/trust bar was encountered, but I did not reach enough of the person descriptions to establish this criterion.                                       |
| DL-18            | NOT TESTED: no basis to verify which displayed counts the character had observed.                                                                                                                 |
| DL-19            | PASS for the limited travel cue: “about 60 min” suggested travel time; the next answer gave a roughly one-hour arrival. No claim about other cues or consequences.                                |
| DL-23            | NOT TESTED: no hit-area measurement or dense-target disambiguation test. The ordinary taps I intended generally selected their named target.                                                      |
| DL-25            | NOT TESTED as the full reflow criterion: no 320px, dark-theme or 200% text test. The tested phone screenshots showed no obvious horizontal page overflow; that alone does not pass the criterion. |
| DL-27            | NOT TESTED: no save, reload or resume test. Desktop title used a fresh context and was not a resume test.                                                                                         |
| DL-28            | NOT TESTED: sending was forbidden and was not attempted.                                                                                                                                          |
| DL-29            | NOT TESTED: no export, import or player-facing replay used.                                                                                                                                       |

## Changes I would want as Rafael

1. Let me see one thing I can ask the selected person in the first phone view, alongside whether that person is here. I wanted to help Ada and then Ravi; I reached their descriptions instead.
2. Make the first step toward helping a particular person as direct as the walking choice. I understood the travel estimate immediately; I spent much longer finding the social interaction.
3. Keep my location and the selected person's location easy to distinguish when following someone who has moved. I went to the workshop for Ada and found her at the flooded hall.

These are player preferences from this short session, not a source review or a claim about how the simulation works.
