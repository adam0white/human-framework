# The Stairwell — source-unread playtest

## First minute

Recorded at 64.8 real seconds after the first actionable title screen (2026-10-20 08:18:45.090 UTC). No gameplay input after +35.6 s and before this checkpoint. The checkpoint was 4.8 s late from tool handling. These answers were written before continuing. Evidence: 00-first through 06-first-minute.

| Item | Status | Original checkpoint answer |
|---|---|---|
| DL-1 A reason to act | PASS | I need to get bread and papers to the flats so the residents vote for my tea money on Sunday. The opening tells me that; the red order and its deadline give me a reason to move now. |
| DL-2 What can I touch | PASS | Begin on Monday, Game menu, More about the job, and All games looked like controls on the title screen. The outlined order cards looked tappable. Tapping Nermin's card sent me to the bakery. At the bakery, To flat 1 and To flat 2 were obvious buttons. Now Anything new?, Tell..., Sit a minute, the Sunday request, and X are visible buttons. I have not tried the tiny building or the speed buttons. I have tried no inert target. |
| DL-3 Urgency and selection | PASS | The red outlined Nermin order drew me first; it said by 07:56. Now Sevim is red and says late. That appears to be the selected or first urgent order. The top speed arrow is also outlined more heavily. The lower Nermin conversation and the bread orders compete for my attention. |
| DL-4 Why the limit | PASS | A word for me on Sunday is unavailable and says too early. I infer I can ask closer to Sunday; I do not know the exact time it opens. This is the only unavailable action I have met. Recovery has not been observed. |
| DL-5 Readable situation | PASS | I reached Nermin, delivered her bread, and she said it was late. I can ask Anything new?, Tell..., or Sit a minute. The top still shows the other bread orders waiting. |
| DL-6 A choice soon | PASS | The job choice was on the initial screen, with roughly 40 story words. First input: Begin on Monday at +15.3 s. First task choice was visible at +15.4 s; first task input was Nermin's order at +22.1 s. I could choose whom to supply before 30 s. |
| DL-7 Learn by doing | PASS | Two interaction types reached: tapping an order took me to the bakery; tapping To flat 1 took me to her and delivered without another handoff. Her late remark taught me the deadline matters. No help used. Resident conversation, building selection, and speed controls are NOT TESTED at this checkpoint (three unreached types). |

## Assignment, access, and timing

- Persona: Deniz, 19, student. Daily mobile player, mischievous, short attention, one hand on a bus. I followed the residents and gossip once deliveries became less interesting.
- Live URL: https://stairwell.adamwhite.work
- Build: no build identifier seen.
- Phone: 360×690 CSS px, touch emulation, light mode, default text size, headless Playwright Chromium. Inputs were coordinate taps on visible controls. No source, hidden state, network payloads, debug APIs, or storage inspected. Only the two supplied instruction documents were read.
- A long-lived local Node/Playwright HTTP server kept one page open. Commands and first-person diary entries were timestamped to `stairwell-shots/timestamps.jsonl` as they happened. No tool failure or reconnect was needed.
- First actionable title screen: **2026-10-20 08:17:40.261 UTC** (03:17:40.261 America/Chicago).
- Voluntary quit: **08:20:34.216 UTC, +173.955 s**, on Monday at flat 4. Quit screenshot at +173.991 s shows Mon 11:04. The eight-minute ceiling did not end the session.
- The page remained open for about eight more seconds while arranging the required desktop look. These seconds were not resumed play. At +182.372 s I reloaded at 1280×800 and looked once at the title screen. It offered Continue, “Monday · 11:29 · flat 4.” I did not continue or start a new notebook.
- I used no speed control, help, telemetry/send control, consent setting, export, or replay. The browser ran in real time. Simulated time and wall time were different.

## Verbatim diary

These are the original first-person entries, in order, without later corrections. Elapsed times are real seconds from the first actionable screen. The adjacent input/result column records visible evidence, not hidden explanations.

| Elapsed / UTC | Original words | Input and important visible answer |
|---|---|---|
| +15.271 / 08:17:55.532 | I have to keep seven flats supplied so they vote for my tea money. Begin on Monday looks tappable; so do Game menu and More about the job. I want to see who lives here. | Tapped Begin on Monday at +15.3. Monday 07:00; bread orders, building, speed arrows, and a room action appeared. 00–01. |
| +22.062 / 08:18:02.323 | The red Nermin bread card catches me first. The tiny building has people but I cannot read them comfortably. The bread needs to be there by 07:56. I think tapping Nermin will show what I can do for her. | Tapped Nermin’s card. Mon 07:20, “On your way to the bakery.” 02. |
| +25.506 / 08:18:05.767 | Oh, that sent me to the bakery straight away. Now it says On your way to the bakery. I did not get a person to poke yet. | At +29.2, bakery, Mon 07:41; Nermin’s card now said “to flat 1, by 07:56.” To flat 1 / To flat 2 buttons visible. 03. |
| +35.626 / 08:18:15.887 | I am at the bakery and the order now says to flat 1. The square beside it probably means I have the bread. To flat 1 says 7 min. I will deliver hers first. | Tapped To flat 1. Mon 08:01, Nermin’s order “late,” “On your way to flat 1.” 04. |
| +42.684 / 08:18:22.945 | It is already 08:01 and her order says late. I only read the screen and picked the first delivery. That feels quick for my first loaf. | By screenshot 05, Mon 08:10, Nermin’s conversation open. |
| +47.641 / 08:18:27.902 | Nermin says Rıza would have been late too but he would have had a story. That is funny. Now I can ask Anything new?, Tell..., or Sit a minute. A word for me on Sunday says too early, so I know why that one is shut. | No gameplay input until the checkpoint. 05–06. |
| +88.142 / 08:19:08.403 | First minute checkpoint written. I understand the bread job, but I am already behind. I want to ask Nermin something instead of racing the next loaf. | Tapped Anything new? at +88.2. “Sevim is tight with money.” “A new line in the notebook.” Asked button then said “Already asked; ask tomorrow.” 07. |
| +94.342 / 08:19:14.603 | She tells me Sevim is tight with money. Already asked; ask tomorrow is clear. Tell... looks like I can spread that around. I want to see what gossip does. | Tapped Tell... at +94.4. “Tell Nermin… Hüseyin is tight with money. heard”; “as I heard it” and “for certain.” Water topic began below. 08. |
| +102.829 / 08:19:23.090 | Tell Nermin has Hüseyin is tight with money, heard, and I can say as I heard it or for certain. I have not heard that myself in the conversation I read. For certain sounds like a stronger claim. I am going to be a little liar and try it. | Tapped for certain at +102.9. Nermin: “Is that so.” Conversation returned to its main choices. 09. |
| +109.636 / 08:19:29.897 | Is that so. That is all she says to my confident claim. I cannot tell whether she believes me. I want to poke the sleeping resident on the map. | Closed conversation at +109.7. At +115.6 tapped the tiny Derya/flat 5 area; “On your way to flat 5.” 10–11. |
| +120.688 / 08:19:40.949 | The tiny Derya label really is tappable. I am on my way to flat 5. The map does not show me a big selected highlight, but the bottom sentence confirms the trip. | At flat 5: “You hung Derya’s bread on the door handle.” “Quiet behind the door.” “Ring the bell anyway.” 12. |
| +126.692 / 08:19:46.953 | You hung Derya’s bread on the door handle. Nice, I had hers too. Quiet behind the door, but Ring the bell anyway is practically daring me. She came home from a night shift, so I expect she will be annoyed. | Tapped Ring the bell anyway at +126.7. Derya: “I’ve been on shift all night. What is it?” Rıza note: “Derya sleeps till three. Bread on the hook, never the bell.” 13. |
| +133.128 / 08:19:53.389 | I have been on shift all night. What is it? That landed exactly as I hoped. Then Rıza’s note says never the bell. I like having actually done the rude thing rather than just reading a warning. | Tapped Anything new? at +133.2. “Nothing, I slept through it all.” 14. |
| +140.270 / 08:20:00.531 | Nothing, I slept through it all. Fair enough. I will Sit a minute even though she clearly wants sleep. I wonder if she tells me to leave. | Tapped (83,642), where Sit a minute appeared in 14. Screenshot 15 instead showed Sevim’s conversation, Mon 10:00, “It’s gone cold. Never mind.” Also “Nermin told Hüseyin what you had been saying about them.” Cause of the change unknown. |
| +148.118 / 08:20:08.379 | I tapped where Sit a minute was. Now I am with Sevim and she says It’s gone cold. Never mind. I did not mean to choose her delivery. Maybe Derya’s panel changed before my tap; I could not tell. The log also says Nermin told Hüseyin what I had been saying. Ha, my gossip escaped. | Closed Sevim’s sheet at +155.4. Log showed residents talking, including overheard water notice and opinions. 16. |
| +161.356 / 08:20:21.617 | I want to see Hüseyin after that gossip message. His late bread card is red, so I will tap it. | Tapped Hüseyin’s card at +161.4. “On your way to flat 4.” At +164.8: “You hung Hüseyin’s bread on the door handle.” “Hüseyin is out.” 17–18. |
| +173.955 / 08:20:34.216 | Hüseyin is out. I hung his bread on the handle, but I wanted his reaction, not another delivery. There are still several red late breakfasts. I am done chasing flats now; I would close this on the bus. Waking Derya was fun, but I do not want six more days of this right now. | Stopped taking gameplay inputs. 19-quit, Mon 11:04, at flat 4. |

## Best, worst, and attention

**Best:** Ringing Derya’s bell at +126.7 s. Her night-shift response made the character feel present. The cue “anyway,” the known night shift, and the annoyed answer agreed. The later message that Nermin had told Hüseyin about my gossip was a second good moment. I wanted to see his reaction.

**Worst:** At +140.3 s I aimed for Sit a minute and found myself delivering to Sevim. I could not connect that input with the result. I did not repeat the tap to investigate. I cannot establish whether a moving control, a changed conversation, my targeting, or another cause explains it.

**First frustration:** +42.7 s, seeing the first loaf was late after reading and choosing its route. **Interest dropped enough to quit:** +174.0 s, when chasing Hüseyin produced another door-handle delivery. I wanted a character response more than another route.

## Clarity findings

The original first-minute results above are unchanged. Later evidence adds these observations; it does not retroactively alter them.

| Item | Result in reached play | Visible evidence and player wording |
|---|---|---|
| DL-2 / DL-3 | Later concern; initial checkpoint PASS | “The tiny Derya label really is tappable.” I discovered map interaction by trying it. I could not read the building names comfortably, and I could not pick out a selected map destination. The bottom travel sentence did acknowledge it. 01, 11–12. I did not establish the actual hit-area dimensions. |
| DL-8 / DL-22 | FAIL on phone context visibility | The order area shows two cards and a cut-off third while the log occupies the middle. Several deadlines are shortened with an ellipsis, including Hüseyin’s in 06-first-minute. I could see an immediate button, but not all the competing order context without trying another view or scroll. In 12-flat5, a further destination button is cut off at the bottom. In 08-tell, the second topic and its lower choices extend below the viewport. Long sheets may scroll; I did not test that scrolling. My narrower failure is that the current bread situation was hard to read together on the phone. |
| DL-13 | Unresolved input/result confusion | I tapped the visible Sit a minute position and next saw Sevim’s cold-delivery reply. 14–15. This is an observed mismatch in my experience, not a verified duplicate-input or game-logic defect. Other taps promptly produced travel text or dialogue. |
| DL-15 | Partial observation; full fast-speed test NOT TESTED | At the untouched opening speed, I saw 07:00 at +15.4, 07:41 at +29.2, and an already-late 08:01 at +35.7. The first deadline was 07:56. Reading and making two route taps was enough to miss it. Conversation time visibly moved more slowly: 08:24 at +64.8 to 08:38 at +88.3. I never used the faster arrows or tested a fast-speed live choice. I cannot generalize to that required scenario. |
| DL-4 | PASS for encountered explanations; recovery NOT TESTED | Sunday support said “too early.” After a news question, “Already asked; ask tomorrow.” I understood when to try again at a broad level. I did not reach tomorrow or Sunday. |
| DL-7 / DL-13 / DL-19 | PASS for bell interaction | “Quiet behind the door” and “Ring the bell anyway” followed the night-shift notice. I expected annoyance; “I’ve been on shift all night. What is it?” matched. 12–13. Gossip also got an immediate reply and a later traceable spread message. I did not learn whether my false certainty was believed. |
| DL-16 | PASS for reached bread tasks | Orders had route responses. Delivery could happen at the door even when the resident was asleep or out. I did not reach the Wednesday water problem as an active task. |
| DL-17 / DL-18 | PASS in observed screens | People’s stance appeared in words such as “polite, not sure of you,” and their speech. Visible numbers were clocks, flat numbers, travel minutes, and loaves. No mood/trust percentage seen. |
| DL-24 | Partial PASS | Tell... replaced the resident choices in one visible panel; the selected gossip returned to the main resident panel. X returned to the scene. Cancel chains and focus restoration were not tested. |
| DL-26 | Partial PASS | Game menu was labelled and visible without scrolling on phone and desktop. Its contents were not opened. |
| DL-27 | NOT TESTED as a resume claim | The required desktop reload showed Continue with a location/time summary. I did not resume, compare retained actions, or test time while closed. The difference from the quit screen includes time when the page was still open. |

### English and dates

- **DL-20 PASS for reached actions.** I could use every reached action in English: “To flat 1,” “Anything new?”, “as I heard it,” “for certain,” and “Ring the bell anyway.” Names and “Hanım”/“Bey” did not block an action. “Tea money” was not defined, but the opening linked it to the residents’ Sunday vote; that was enough for my immediate purpose. No necessary untranslated term stopped play.
- **DL-21 PASS for the first-play comparison only.** The screen said “Mon 07:00”; bread said “by 07:56.” I could tell the order was due this morning. “Water off Wednesday, ten to twelve” was later repeated as “The water is off on Wednesday, ten to twelve.” I understood that as a future Wednesday window, likely 10:00–12:00; AM/PM was not stated. Today was Monday. Cross-month/year comparisons, a return after a break, and the water event itself were NOT TESTED.
- **DL-22 FAIL for the context visibility described above; immediate primary responses were usually reachable.** Nermin’s and Derya’s main dialogue buttons fit. I could read the immediate bell answer on screen. The building labels were difficult to read, the card list clipped, and lower route/topic controls could fall off screen. No scrolling or zoom was used. 200% text, 320 px width, dark mode, keyboard layouts, and exact target sizes were NOT TESTED.

### Evidence gaps

I did not reach an end of day, Sunday vote, resolved water deadline, full game ending, or a save/resume play cycle. DL-9 obligations outside the log, DL-10 label consistency across an end report, DL-12 session boundaries, DL-14 all known costs/risks, full DL-15 speed behavior, DL-23 hit-area dimensions, full DL-24 navigation/focus, and full DL-25 reflow are NOT TESTED beyond the observations above. DL-28 sending was not authorized or attempted. DL-29 replay was not attempted. Every builder-only check is NOT TESTED. Unmet content is an evidence gap, not a game failure.

## Stop and return

I stopped voluntarily at +173.955 s, at flat 4 on Monday. Hüseyin was out; his bread had gone on the handle. I would not return voluntarily on this bus ride. I might open it later to provoke another resident, but I did not yet want to manage the whole week. The budget did not force the stop.

## Up to three changes I would want as Deniz

1. Give me enough time to read the first bread decision before the first loaf is already late. I want the first late delivery to feel like my choice.
2. Make the residents and current bread deadlines easier to read on my phone. I want to tap a person without squinting at the miniature building.
3. Keep the action I am about to tap stable, or make the resulting move explicit. I wanted to sit with Derya and could not tell why I ended up at Sevim.

## Artifacts and desktop look

Screenshots are in `stairwell-shots/`, named 00-first.png through 20-desktop-first.png. The numbered names cited above identify individual observations. `timestamps.jsonl` contains the timestamped commands, diary entries, and results. No export was downloaded.

The single 1280×800 first-screen look, 20-desktop-first.png, showed the title, introductory job text, Game menu, Continue with Monday/time/flat summary, A new notebook, More about the job, approximate session length, and All games. All fit in view. This was a title-screen look after the session, not desktop gameplay.
