# Neighbours — Grace, source-unread playtest

Grace, 52, primary-school teacher. I play Animal Crossing and Stardew Valley. I want to look after people in a small town. I am on my phone on the sofa and will give a game a few minutes to make sense.

- Live URL: https://neighbours.adamwhite.work
- Build: no build identifier noticed in the screens reached.
- Phone: 360×690 CSS px, touch emulation, light mode, device scale factor 1.
- Access: headless Chromium through Playwright. A Node HTTP server kept the same page open throughout phone play. Inputs were taps, one normal button click, and a scroll. Screenshots and rendered page text were the only game observations. No source, network payloads, storage, hidden state, debug API, prior report, or other project document was inspected. Only the two authorized instruction files were read.
- Budget: 8 real minutes maximum. I voluntarily stopped phone play at **183.298 seconds (3:03.298)**. The budget did not expire. Desktop inspection happened afterward and did not resume play.
- First screen clock origin: **2026-10-20 09:16:55.191 UTC** (04:16:55.191 America/Chicago). The first capture was during the title's visual transition. Enter town was used at about 7.7 seconds; the town was observed by 10.395 seconds. Elapsed times below use the earlier origin conservatively.
- Game clock: Day 1, 08:00 at entry; Day 1, 13:45 when I stopped. Real time and game time are separate. No speed change, Step, or Next input was used. I used Play twice and Pause once. The page initially started paused and later paused itself for a new story.
- Optional question: none. No telemetry submission, run sending, consent change, or export download. No export/replay claim.

Screenshots and the append-only wall-clock/action/diary log are in [neighbours2-shots](neighbours2-shots/). Screenshot references below are relative to that directory. `session.jsonl` records observations, inputs, diary entries and timestamps as they occurred. It was written during play, not reconstructed from game state.

## First minute
Checkpoint observed at 64.815 s after the initial screen; no inputs after 45.578 s. An automatic screenshot was also scheduled for 60 s. These answers are fixed before continuing.
| Item | Status | Original checkpoint answer |
|---|---|---|
| DL-1 A reason to act | PASS | I want to help the town recover from the flood. The opening said “help your neighbours rebuild”; the hall says “Needs help”. |
| DL-2 What can I touch | FAIL | The buildings looked tappable, and the Hall label below looked like another way in. Neither tap visibly answered. Ada’s name did open a sheet. Play, Step, Next, the speed list, Town, Journal, More, Game menu and the sheet’s Walk button look like controls. |
| DL-3 Urgency and selection | FAIL | “Needs help” drew me to the hall, but I could not tell whether either Hall tap selected anything. Ada’s sheet clearly names Ada. I cannot tell whether helping the hall is urgent. “Paused for a new story” and “Read story” now compete with the walk. |
| DL-4 Why the limit | PASS | While walking, the Walk button faded and “You can talk after your walk ends” explained the wait. Ada is elsewhere: “Only people at the same place, and awake, can hear you.” I need to reach her. |
| DL-5 Readable situation | PASS | I am at Workshop, and Ada has moved to Flooded hall. I can walk there in about 30 minutes or use “Read story”; it says “Paused for a new story”. |
| DL-6 A choice soon | PASS | Places and named neighbours were on screen by 10.395 s. I first tried Hall at 16.276 s, opened Ada at 26.631 s, and first committed to walking at 38.291 s. A concrete destination and cost were visible in Ada’s sheet by 31.543 s; that observation time does not establish whether the settled sheet appeared before 30 s. The selectable people/places were available within 30 s, before any long required text. |
| DL-7 Learn by doing | PASS | I reached two interactions: selecting Ada and choosing a walk. Her sheet taught me that I must be with someone to talk. “Walking to Workshop, arriving about 09:00” acknowledged the walk; after Play I was at Workshop but Ada had moved. No help opened. Talking and repair interactions: NOT TESTED, 2 unmet interactions. |

Checkpoint screenshots: [automatic minute capture](neighbours2-shots/first-minute-auto.png), [64.815-second observation](neighbours2-shots/11-first-minute.png). The checkpoint text was saved before further game input. Later conversation access does not alter the original DL-7 evidence gap.

## Verbatim diary

The quoted reactions below preserve the wording recorded during play. The input and visible-answer annotations are separate from those reactions. Times are seconds from the clock origin above. Each diary entry also has its wall-clock timestamp in `session.jsonl`.

**7.689 s — 09:17:02.880 UTC**
> I want to help people rebuild after the flood. Enter town looks like the way in; More about Alder Quay looks expandable. The Python runtime sentence means nothing to me.

Input: Enter town. At 7.741 s, “Starting town”, “Bringing Alder Quay to life”, and “Checking the saved town on this device…” appeared. At 10.395 s, the town map was on screen: Day 1, 08:00, Rain; “Choose a place to walk →”; Hall “Needs help”. Screens: `02-enter-town.png`, `03-town.png`.

**16.237 s — 09:17:11.428 UTC**
> The hall says Needs help, so I will go there. The map buildings and the people along the bottom look tappable. I think time is stopped because it says Play and 08:00.

Input: tap the hall drawing at (195,289). At 16.276 s, no visible change. Screen: `04-hall.png`.

**21.447 s — 09:17:16.638 UTC**
> I tapped the hall drawing and nothing visibly changed. Perhaps I should tap the Hall label below it.

Input: tap Hall in the lower strip at (56,547). At 21.476 s, no visible change. Screen: `05-hall-label.png`.

**26.552 s — 09:17:21.743 UTC**
> The Hall label did nothing either. I will ask Ada; her name is right there.

Input: tap Ada at (157,550). Her sheet opened. The settled screenshot at 31.543 s showed “Walk to Workshop to talk · ~60 min”, “You are at Riverside homes. 201 awake here”, and “Ada: Workshop. Current location; they may move.” Screen: `07-ada-settled.png`.

**38.257 s — 09:17:33.448 UTC**
> Ada has a clear Walk to Workshop to talk button. It will take about an hour. I cannot speak to her from here, which makes sense. 201 awake here is an odd thing to be told.

Input: tap Walk at (157,314). The immediate capture still showed the old state. By 41.107 s the button was faded and the sheet said “Walking to Workshop, arriving about 09:00” and “You can talk after your walk ends.” Screen: `09-after-walk.png`. This was an acknowledged walk, not evidence of an instant arrival.

**45.533 s — 09:17:40.724 UTC**
> Now it says Walking to Workshop, arriving about 09:00. That helps. I will press Play to let the hour pass.

Input: Play at (92,609). The control changed to Pause at 45.578 s. No input during the checkpoint wait. At 64.815 s: Day 1, 09:30; I was at Workshop, Ada was at Flooded hall, and “Paused for a new story / Read story” appeared. Screen: `11-first-minute.png`.

**87.619 s — 09:18:22.810 UTC**
> I have arrived, but Ada has already gone to the hall. That is a little annoying. A new story has stopped the clock; I will read it before chasing her.

Input: Read story at (213,568). The Journal scrolled to a dashed outline around “A question became a shared method”. The text said Lea showed Ada how dry, sound timber differs from wet timber and when another opinion is needed. Screen: `13-journal.png` at 90.376 s.

**94.308 s — 09:18:29.499 UTC**
> Lea showed Ada how to check the timber. I like that they are helping one another without waiting for me. Follow Ada looks like a way to catch up.

Input: Follow Ada at (182,372). Ada’s sheet opened; this did not itself start walking. At 98.124 s I tapped “Walk to Flooded hall to talk · ~30 min”. At 101.323 s I pressed Play. The sheet then showed “Walking to Flooded hall, arriving about 10:00”. At 112.070 s it was already 11:30, I was at Flooded hall, and Talk to Ada was available. Screens: `14-follow-ada.png`, `16-play-to-hall.png`, `17-at-hall.png`.

At **114.836 s**, input: Talk to Ada at (93,320), game time 12:15. Visible answer: “Speak to Ada” and “Considering what Ada could do now…”. At **117.604 s**, game time 12:45, the sheet instead said “Ada is on the way to Workshop. Meet them after they arrive.” No actionable conversation choice was captured between these observations. Screens: `18-talk-ada.png`, `19-talk-options.png`.

**122.537 s — 09:18:57.728 UTC**
> I pressed Talk to Ada, got Considering what Ada could do now, and then she left before I could read a choice. The clock is racing even at 1×. I am frustrated now; I will stop it so I can find someone here.

Input: Pause at (90,610). By 122.573 s it was 13:45 and Ada was back at Flooded hall; the control changed to Play. Screen: `20-pause.png`. I did not change playback speed.

**127.555 s — 09:19:02.746 UTC**
> Ada is back at the hall already. I will try Talk once more with the clock stopped.

Input: Talk at (92,319). At 127.589 s conversation controls appeared. The settled screen showed “Ask them to”, a work list currently reading “Rest at home”, Ask, “Put it to them. They may say no”, and Your hour at the bottom. Screen: `22-speak-sheet.png`.

**142.152 s — 09:19:17.343 UTC**
> I would rather offer my own time than tell Ada to rest. Your hour sounds right. The rest of this conversation is below the screen.

Input: tap the Your hour list at (178,563). The control gained a dashed focus outline, but its options were not visible in the screenshot. A later capture still showed the same closed-looking list. Screens: `23-your-hour-options.png`, `24-dropdown.png`. Whether a native select popup opened outside screenshot capture is unknown; this is not established as a game defect.

**162.833 s — 09:19:38.024 UTC**
> I tapped the work list, but I cannot see it open. I will scroll down to see how the offer works before choosing.

Input: scroll down 290 px within the sheet. Settled screen: Your hour, “Choose the work you would offer”, Done by “Day 1 · 18:00”, Urge and its trust warning, a grey Promise an hour button, and “Offer an hour of your own work. It binds you only if they take it up.” The clock remained Day 1, 13:45. Screen: `26-offer-scrolled.png`.

**183.298 s — 09:19:58.489 UTC — voluntary stop**
> It is Day 1, 13:45, and the offer would be due Day 1 at 18:00: just over four hours away. The promise button is grey while no work is chosen. I came to help, but I have mostly chased Ada and scrolled through controls. I would put this down now. I do not feel I have helped anyone.

Final phone screen: `27-quit-phone.png`. No request, urge, promise or repair was submitted. I did not resume play after this entry.

## Best, worst, and leaving

**Best moment:** reading that Lea had taught Ada to check timber. People seemed to have useful lives of their own. That is the town I wanted to care about. The illustrated map also made the place feel small and approachable.

**Worst moment:** Talk to Ada became “Considering what Ada could do now…” at 12:15, then she was travelling away by the next observation at 12:45. I had already walked to two places to find her. Frustration was first explicitly recorded at 122.537 s. I was annoyed earlier, at 87.619 s. I did not record boredom.

I stopped in Ada’s conversation sheet, at the offer controls, with time manually paused at Day 1, 13:45. I would not voluntarily return immediately. I still like the premise, but I did not get the feeling of helping someone during these three minutes.

## Clarity findings

These describe this run, not the implementation. An input with no visible answer does not prove that the game has no rule or that it rejected the input.

| ID | Status | What I saw and what it meant to me | Evidence |
|---|---|---|---|
| DL-2 | FAIL | “Choose a place to walk →” and Hall “Needs help” made me try the drawing and the lower Hall label. Neither gave a visible answer. I found an effective route only through Ada. I cannot tell whether those Hall targets were inert or my taps missed their active area. | `03-town.png`, `04-hall.png`, `05-hall-label.png`; 16.276–21.476 s |
| DL-3 | FAIL | I knew the hall needed help but could not see a selected destination after my taps or tell how urgent it was. Ada’s named sheet was clearer. | Same screens; original checkpoint |
| DL-13 | FAIL, limited to attempted Hall inputs | I could not tell whether either Hall tap worked. There was no visible acknowledgement in the captures, and no destination sheet appeared. The walk and Play inputs did give feedback later. No duplicate walk or request was observed; I did not repeat the walk to test duplicates. | `04-hall.png`, `05-hall-label.png`, `09-after-walk.png` |
| DL-15 | FAIL for the observed reading window | At the displayed 1×, the game moved from 11:30 to 12:15 while I tapped Talk, then to 12:45 in about 2.8 real seconds while I was trying to receive its choices. Ada left. I had to pause manually to read and act. I cannot establish whether any brief automatic slowdown occurred between captures. The specified fast-speed pending-choice test was NOT TESTED: I never used fast speed and never submitted a consequential request. | `17-at-hall.png` through `22-speak-sheet.png`; 112.070–127.589 s |
| DL-22 | FAIL for the offer workflow's first view | Talk opened with Ask visible, but my intended response, offering my own hour, began at the bottom edge. Its deadline, Promise button and explanation of the commitment were below the viewport. I had to scroll to understand that response. The scrolled sheet did make them reachable. A long sheet is allowed; my problem was that the immediate offer and its essential explanation were split across views. I saw no overlapping buttons. | `22-speak-sheet.png`, `26-offer-scrolled.png` |

The work-list tap was inconclusive. The focus outline proves the control received focus; it does not prove whether its native popup was available to a human. Headless screenshots may omit that popup. I did not attribute the list result to a DL failure, guess an unseen option, or choose through hidden state. It limited my ability to finish an offer.

“201 awake here” felt odd to me, but I did not establish how that count was obtained. It is an observation, not a proven DL-18 failure.

## English, dates, and phone layout

- **DL-20 — PASS for reached controls.** Walk, Talk, Ask, Your hour, Done by and Promise an hour were understandable English. No necessary unexplained local term was encountered. “Python runtime” was technical opening text I did not understand, but I could still enter the town.
- **DL-21 — PASS for the comparison reached.** With today shown as Day 1, 13:45, “Day 1 · 18:00” was plainly later today, 4 hours 15 minutes away. I needed no calendar translation. Across-month/year comparisons and returning after a break: **NOT TESTED**. The report does not use below-viewport text as evidence that I understood a deadline before scrolling to it.
- **DL-22 — FAIL for the offer view described above.** Walking and talking controls were visible without a scroll; the offer's essential controls and explanation needed a scroll. Keyboard-open behavior: **NOT TESTED**. All phone screenshots were captured at 360×690.

## Other checks and evidence gaps

| ID | Status / scope |
|---|---|
| DL-8 | FAIL for the same initial Hall cue/action mismatch; later Read story had a clear outline and jumped to the relevant record. |
| DL-9 | NOT TESTED — I took on no obligation, and did not check an obligation on request. |
| DL-10 | PASS for the reached naming — Workshop stayed Workshop; Hall/Flooded hall was recognisably the same flood-damaged building to me. |
| DL-11 | NOT TESTED — no systematic essential-word count or builder layout check. |
| DL-12 | NOT TESTED — no day, chapter or game ending reached. |
| DL-14 | PASS for walking — approximate travel time was shown before committing. Offer/Urge submission and resulting costs: NOT TESTED. The scrolled offer did show a trust warning and conditional commitment wording before submission. |
| DL-16 | NOT TESTED for completing the hall problem — I reached a conversation and offer controls but did not complete a request or repair. My difficulty finding the Hall response is recorded under DL-2. |
| DL-17 | PASS for the person description reached — “Set on looking over the timber. Does not know you well.” used words, with no feeling bar seen. |
| DL-18 | NOT TESTED — I cannot establish whether the awake count was observed or counted in the fiction. |
| DL-19 | NOT TESTED for a consequential social choice — no ask, urge or promise was submitted. The Walk estimate successfully signalled travel, rather than instant conversation. |
| DL-23 | NOT TESTED — no hit-area measurement. The missed Hall taps do not establish target dimensions. |
| DL-24 | NOT TESTED for the full origin/cancel/focus workflow. Ada → story Journal → Follow Ada showed one sheet at a time in the reached screens; no full cancel path tested. |
| DL-25 | NOT TESTED for the full check — no 320 px or 200% text test, dark theme, or horizontal-scroll probing. No horizontal overflow noticed at the assigned size. |
| DL-26 | PASS for discoverability only — Game menu was labelled and visible at the top without scrolling. Its contents and control grouping were NOT TESTED. |
| DL-27 | NOT TESTED — desktop reload returned to a title with Enter town; I did not enter or test save/resume. |
| DL-28 | NOT TESTED — no authorization to send; no sending or consent interaction performed. |
| DL-29 | NOT TESTED — no export downloaded and no player-facing replay used. |

Builder-only checks were not attempted. No claim is made about arbitrary quotas, capability implementation, safe areas, exact font sizes, compact exports or replay internals. These are evidence gaps, separate from the observed failures above.

## Desktop first-screen look after stopping

After phone play ended, I changed the viewport to **1280×800** and reloaded the same live page. I looked only at the first screen and took no gameplay input. [Desktop screenshot](neighbours2-shots/29-desktop-first-screen.png).

The title, flood premise, Enter town button, More about Alder Quay, runtime/save explanation, About the simulation and All games link all fit in one view. The purpose and entry button were clear. The technical runtime sentence was still less useful to me than the invitation to help. This was a title-screen look, not a desktop gameplay test.

## Changes I would want as Grace

1. Let me reach a useful hall response when I tap the hall that says Needs help. Tell me whether my tap did anything.
2. Give me enough reading time to speak to someone before they move away. I should not need to discover manual pause to hold a conversation.
3. Put the offer I can make, its deadline and the meaning of that promise together on my phone so I can help without searching down the sheet.
