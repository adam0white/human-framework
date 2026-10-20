# The Night Watch — source-unread playtest

## Session

- Persona: Sam, 40, warehouse supervisor. Plays Frostpunk, Kingdom Two Crowns and FTL. Likes defending a place and deciding who stands where. Evening at home, phone in hand.
- URL: https://human.adamwhite.work/watch/
- Build: no build identifier observed. Game menu was not opened.
- Device: supplied phone fixture, 360×690 CSS px, touch, light-mode preference, default text size. The game itself displayed a dark background.
- Access: standard `npm run lab:play` driver, supplied Playwright module, port 43402. Used only its documented player-facing operations and screenshots.
- Timing: floor 0, ceiling 25 real minutes. First usable screen at driver elapsed 0.386 s. Final stop at 232.341 s (3:52). One desktop look at 1280×800 after stopping, at 232.704 s. No further play at desktop size.
- Game span: opening through the first night and dawn, then preparations at the second dusk of the first winter.
- Speed: Watch by default; selected Fast at 147.190 s to reach dawn during a quiet stretch. The game briefly displayed automatic Slow at 85.925 s, then Watch again at 92.097 s. Dawn said “Clock stopped”; dusk displayed its own rate despite Fast remaining selected.
- Clock advanced during real waits. No frozen-time limitation observed. Text and screenshots are discrete samples; I did not continuously see events between requests.
- No game source, tests, other repository documents, prior reports or logs were inspected. No run was sent, no telemetry submission was requested, and consent was not changed. No export downloaded.
- Driver PID 10072 was terminated with `kill 10072` after the desktop screenshot.

## First minute

Checkpoint was logged at 63.157 s, about three seconds late. The last preceding observation was at 58.701 s. This table uses only the checkpoint and observations through the first 60 s; later discoveries do not change it.

Original checkpoint, verbatim:

> I am keeping six people and the grain alive until the thaw. Tracks made the gate urgent; the light is at the gate, and I asked Kian to cover the east. Watcher cards, the posts, Begin the watch, speed buttons and bell looked tappable; tapping Tamar in the scene let me hear her. No unavailable action yet. I can move the light or ring the bell, but nothing is approaching that I can see. Kian was selectable at about 6 seconds; I selected him at 14 seconds and sent him east at 18. Asked versus there now taught me that orders take travel time. I have not used help. Some watchers were below the phone edge at dusk.

| Item | Status | Checkpoint answer and evidence |
|---|---|---|
| DL-1 A reason to act | PASS | Keep six people and grain alive until thaw. Opening: “Bring every soul and the granary to the thaw.” Scout tracks made the gate matter now. |
| DL-2 What can I touch | PASS for controls tried | Cards, posts, Begin the watch, speed buttons and bell looked tappable. Selected Kian, chose East wall, began watch, tapped Tamar in the scene. No inert target tried. Screenshot 02 shows only part of the watcher list; I did not discover every card visually on that screen. |
| DL-3 Urgency and selection | PASS | Gate tracks drew me first. Gate lantern button had an outlined selected state. On selecting Kian, his name and current post appeared in the state strip. No competing threat seen. |
| DL-4 Why the limit | NOT TESTED | No unavailable action encountered before 60 s. |
| DL-5 Readable situation | PASS | I could move light or ring bell. “Only the lantern’s stretch shows what approaches. Your voice reaches the next stretch.” Tamar said she was keeping watch and could not make anything out yet. |
| DL-6 A choice soon | PASS | First usable title screen at 0.386 s; entered the wall at 6.467 s. Meaningful posting/lantern choices were available then, within 30 s. First posting input: selected Kian at 14.328 s; sent him east at 17.795 s. The opening required only a short goal sentence before entering play. |
| DL-7 Learn by doing | PASS for two interactions reached | Posting: “East wall, asked · on the Gate” distinguished order from location. Watcher account: scene tap at 43.562 s produced Tamar’s own words. No help used before 60 s. Bell, pressure changes and dawn talks: three interaction types not yet tested at the checkpoint. |

## Verbatim diary

Elapsed times below are driver seconds, rounded to hundredths. Each quoted reaction preserves the wording recorded during play. The visible-answer column is evidence, not a rewritten reaction. Routine screenshots without a reaction are listed separately below. Full driver wall-clock record: `e-free2-shots/wall-clock.jsonl`.

| Elapsed | Game clock | Input | Original reaction | Important visible answer |
|---|---|---|---|---|
| 0.39 | Before the first night | Open | — | Goal and “Go up to the wall.” |
| 6.27 | Before the first night | Screenshot 01 | Go up to the wall looks like the start. Keep everyone and the grain alive until the thaw; that is enough for me to get moving. | Opening goal. |
| 6.47 | Before the first night → Dusk | Go up to the wall | Let me see the wall and who I have. | Three watcher cards; gate tracks; posting and lantern controls. |
| 10.43 | First night, first winter · Dusk | Screenshot 02 | Tracks at the gate: I want Tamar there and Mara watching the west. I am not sure where tapping a post is yet. | Tamar and Kian at gate; Mara west. |
| 14.33 | First night, first winter · Dusk | Select Kian | Two people at the gate seems a waste. I will try Kian on the east. | Ask/Urge/Insist; post choices. |
| 17.80 | First night, first winter · Dusk | East wall | I am asking, not forcing him. East wall should spread us out. | “East wall, asked · on the Gate.” |
| 22.59 | First night, first winter · Dusk → Nightfall | Begin the watch | Good, the order says east but he has to walk over. The lantern is already at the tracks; let us start. | “The wall settles in for the night.” Lantern movement and bell available. |
| 36.03 | First night, first winter · Nightfall | Wait 10 s | I will hold the light on the gate for a moment and look for movement. | Still Nightfall; no new heard event. |
| 39.55 | First night, first winter · Nightfall | Screenshot 03 | The buttons say where to move the light. I want to hear from Tamar before moving away. | Gate illuminated; watcher figures visible. |
| 43.56 | First night, first winter · Nightfall | Tap Tamar at (115,350) | Tamar is standing right under the light. I will tap her. | “I’m keeping watch. The scout warned us about this stretch. I can’t make anything out yet.” |
| 58.70 | First night, first winter · Nightfall → Night | Wait 12 s | She has nothing yet. I like getting her actual words rather than a number. | Tamar’s same account; clock now Night. |
| 63.16 | First night, first winter · Nightfall, as supplied in log | First-minute note | See verbatim checkpoint above. | Screen was now Night; the note’s supplied clock label lagged the screen. |
| 68.64 | First night, first winter · Night | Back to the wall | I do not need to keep her report open. I will look along the wall. | Normal lantern/bell view. |
| 68.81 | First night, first winter · Night | East wall | A quick check on Kian, then back to the gate. | “The lantern is on its way.” |
| 81.26 | First night, first winter · Night | Wait 8 s | The light takes time to get there too. That makes leaving the gate feel like a decision. | Lantern at East wall; “Movement in the dark on the gate road.” |
| 85.93 | First night, first winter · Night | Gate | Of course, movement the moment I leave. Back to the gate now. | Automatic Slow; “Something at the foot of the gate.” “Grain is gone: something got over the gate.” Lantern moving. |
| 92.10 | First night, first winter · Night | Wait 6 s | I want to see whether that is a pack before waking everyone with the bell. | Same events; lantern now at Gate; Watch rate restored. |
| 97.61 | First night, first winter · Night | Ring the bell | It already got in? Ring it. I thought Tamar would handle something at her post. | Bell rings; “Holding!” Tamar calls back. “Bell swinging” disabled; rope fraying. |
| 102.06 | First night, first winter · Night | Tap Tamar at (115,350) | Holding sounds good, but was that too late? I want her account. | Same “I can’t make anything out yet” account. |
| 106.69 | First night, first winter · Night → Midnight | Back to the wall | She still cannot make anything out, even after something got over. I cannot tell if it is gone or still a threat. | Midnight. |
| 106.87 | First night, first winter · Midnight | Open Watchers and bell | I need to know what the bell actually makes them do. | “Calls back watchers who hear it”; every pull wears rope; everyone on wall. |
| 112.55 | First night, first winter · Midnight | Note | Oh, the bell calls watchers back, it is not an attack command. I used up rope without knowing that. The help does explain it once I open it. | Help remained open. |
| 112.80 | First night, first winter · Midnight | Close Watchers and bell | I will leave the light on the road with tracks and wait for the next thing. | Normal view. |
| 137.98 | First night, first winter · Midnight → The small hours | Wait 25 s | — | “Tamar drove a wolf off the gate road.” “A wolf at the foot of the gate.” Another drove-off line. |
| 146.98 | First night, first winter · The small hours | Note | There, Tamar drove wolves off while the light stayed on her stretch. Maybe the light is what she needed. That gives me a reason to stay put instead of checking everywhere. | Wolf events. The causal connection was my guess. |
| 147.19 | First night, first winter · The small hours | Fast | I have the threatened road covered. I want dawn now; I am speeding up the quiet stretch. | “Fast · 12 min/s.” |
| 157.35 | First night, first winter · The small hours | Wait 10 s | — | Quiet normal view. |
| 175.92 | First night, first winter · The small hours → Dawn | Wait 15 s | Fast still feels quiet. I am waiting for the morning to find out what that lost grain means. | Clock stopped; talks; “The wall was crossed”; nobody stood east; comments from watchers. |
| 181.80 | First night, first winter · Dawn | Pulse, engagement 3/5 | Dawn gives me something to work with: wolves crossed, Mara was sleepy, and Kian is annoyed about the bell. I want to sort out why his east post was empty. | Dawn summary and conversations available. |
| 188.22 | First night, first winter · Dawn | Kian, Tell me about last night at (97,586) | Kian, tell me what happened. The summary says nobody stood east, but I sent you there. | “I went home to sleep. I’m sorry. I couldn’t stand up straight at the east wall.” One more talk. |
| 192.72 | First night, first winter · Dawn | Would you keep the Gate one day? | That answers Kian. Mara has the best sight; I want to see if she will learn the gate instead of relying on Tamar every night. | “Me? I’d try. Someone has to.” No more talks; day’s work calls. |
| 197.17 | First night, first winter · Dawn | Scroll down 426 px | I want the rest of the dawn report and the way to the next watch. | Lower report, granary drawing and On to dusk visible. |
| 201.67 | First night, first winter · Dawn → Second dusk | On to dusk | I will try another watch with Mara at the gate, and keep the lantern where the scout warns me. | Eight souls; mill tracks; two new watchers; Tamar tiring after bell-rope work. |
| 206.84 | Second night, first winter · Dusk | Select Mara | New people cover the mill. Tamar is tiring, so I will ask Mara to take her gate. | Mill wall · tracks disabled. |
| 207.00 | Second night, first winter · Dusk | Gate | She said she would try. I will ask rather than insist. | Mara assigned Gate, still on West wall. |
| 214.02 | Second night, first winter · Dusk | Select Tamar | Tamar should rest. The mill option was grey for Mara; I did not see why, though there are two people there already. | Mill disabled here too; Off the wall available. |
| 214.19 | Second night, first winter · Dusk | Off the wall | Take the night off, Tamar. | “not posted · will find a spot on the wall · on the Gate.” |
| 214.35 | Second night, first winter · Dusk | Mill wall lantern start | The tracks are at the mill now. Start the lantern there. | Mill wall selected for lantern. |
| 222.33 | Second night, first winter · Dusk | want_quit — CONFUSED | Off the wall now says she will find a spot on the wall. I wanted her to rest. I do not know how to rotate a tired watcher out, and that is the part I wanted to manage. | Unposted Tamar still described as finding wall spot. |
| 222.50 | Second night, first winter · Dusk | Select Tamar again | One more look at asking help before I give up on resting her. | Posting options and help. |
| 222.67 | Second night, first winter · Dusk | Open About asking and pressing | — | “Ask leaves it to them; urge leans on them; insist can get them there under protest. Tired or frightened watchers may leave their post.” |
| 232.31 | Second night, first winter · Dusk | Screenshot 08 | The help tells me they may leave when tired, but not how I give her rest. I do not want to start another night guessing what Off the wall does. | Phone screenshot did not display the expanded help paragraph in the available panel area. |
| 232.34 | Second night, first winter · Dusk | stop — CONFUSED | I am stopping at the second dusk. My wish to leave did not pass after reading the help. I like placing people and hearing them, but I cannot tell how to give my tired gate keeper the night off. I would not leave this running. I might return if I knew how to rest her; I would not start another watch tonight. | Stopped before beginning night two. |

Additional screenshots: 04 at 97.799 s (grain/bell), 05 at 181.993 s (dawn), 06 at 188.390 s (Kian’s answer), 07 at 197.337 s (dawn after scroll). After stop: resize at 232.513 s; screenshot 09 at 232.704 s; terminate driver. No additional play or reaction after stop.

## Best, worst, wanting to leave and pulses

Best moment: 188.22 s, Kian’s answer. His missing east watch became a person too tired to stand, rather than an unexplained empty post. That made me want to rotate people and develop Mara as a replacement. This was the highest-engagement moment; no numeric rating was logged for it.

Worst moment: 214.19–232.34 s. I chose “Off the wall” to rest Tamar. The answer said she would find a spot on the wall. Help explained pressure and possible departures but did not resolve my intended rest order.

Only want_quit: 222.325 s, CONFUSED. It did not pass during the additional help check. Final stop: 232.341 s, CONFUSED. I would not leave the game running. I might return if I understood how to rest Tamar, but would not voluntarily begin another watch that evening.

Pulse series: 181.798 s, 3/5, verbatim in diary. Session ended before a second three-minute pulse was due.

## Clarity findings

These are player observations, not claims about implementation or missing simulation rules.

| ID | Status | What I saw and what I could not tell |
|---|---|---|
| DL-4 | FAIL later; first-minute NOT TESTED | “Mill wall · tracks” was disabled for Mara and Tamar at second dusk. I guessed the two existing watchers might matter, but saw no explanation of the limit or how to free it. Transcript 206.837 and 214.017 s; screenshot 08. Bell’s temporary “Bell swinging” limit was understandable and recovered by 102.058 s. |
| DL-19 | FAIL for Off the wall cue | I read “Off the wall” as taking Tamar off duty. It produced “not posted · will find a spot on the wall · on the Gate.” This cue led me to expect rest and then explicitly described wall duty. I did not play night two to establish what Tamar would actually do. Transcript 214.186 s; screenshot 08. |
| DL-16 | NOT TESTED as a rule; unresolved player task | I wanted to rest the tiring watcher and could not identify that response. This does not prove the game has no rest rule or control elsewhere. |
| DL-14 | FAIL for cost visibility encountered | The first bell pull changed sound rope to fraying. Its wear and recall function were explained inside “Watchers and bell,” which I opened only after spending rope. I had thought of it as an alarm response. Screenshot 03 shows sound rope and ring control without that explanation; transcript 97.606–112.548 s. |
| DL-13 | PASS for accepted actions; unclear current report | Posting distinguished asked destination from location; lantern said “on its way”; bell responded immediately. Tamar’s account still said “I can’t make anything out yet” after the grain-loss messages. I could not tell whether danger had passed. That is an observed uncertainty, not proof the report was stale. |
| DL-22 | FAIL on encountered phone screens | Dusk screenshot 02 shows Tamar, only part of Kian, and no Mara card or lantern-start controls without scrolling. Dawn screenshot 05 shows a partially cut bottom Mara action; the night result and On to dusk are below. At night screenshot 03, lantern choices, bell and essential state fit. |
| DL-30 | FAIL | In screenshot 05, “Would you keep the” is visible at the lower edge while the rest of the button label is outside the viewport. It reads fully after the Kian answer changes the layout (06). More materially, screenshot 08 shows the expanded “About asking and pressing” heading with no explanatory paragraph visible before the fixed post controls. The player-facing text response contains the full paragraph beginning “Ask leaves it to them; urge leans on them”; desktop screenshot 09 displays it. The phone screenshot alone did not let me read that help where I opened it. No overlapping sheets observed. |
| DL-31 | PASS for selected posting screen | Screenshot 08 preserves “Early watches; the thaw is still far off,” grain, eight souls, second-night dusk, Tamar’s name, location and “tiring” while giving orders. The scene remains visible. There is no exact thaw date shown here, so I could not state a numeric deadline. |
| DL-12 | PASS for night boundary reached | Dawn explicitly stopped the clock and offered talks and On to dusk. I could tell night one ended and play continued. Game ending not reached. |
| DL-17 | PASS for people met | Tiredness appeared as “tiring,” Mara’s words about nodding off, and Kian’s inability to stand straight; no mood or tiredness percentage encountered. |

The 81.26–85.93 s transition went from the first observed movement warning to a grain-loss report in about five real seconds, including lantern travel and tool reading time. The game did briefly slow. I did not inspect the scene continuously and cannot establish the exact available response window, or that an on-screen choice was missed. This is a timing limitation of this session, not a proven DL-15 failure.

## English, dates, phone and hands on

- DL-20 — PASS for labels and dialogue reached. I could act in English. No necessary untranslated local term encountered.
- DL-21 — NOT TESTED for deadline comparison. First/second night, first winter and phases of night were understandable relative labels. “The thaw is still far off” gave no exact deadline to compare with today. No month/year boundary or return after a break reached.
- DL-22 — FAIL, as above. Night controls fit, but dusk roster and dawn response did not all fit on screen.
- DL-30 — FAIL, as above. Evidence is screenshots 05 and 08, not merely the text harness’s list of controls.
- DL-31 — PASS for the posting screen actually used, as above. No separate answer sheet with an exact deadline was encountered.
- DL-32 — No forced hands-off stretch established. The longest deliberate unchanged-location wait was 25 s at 112.80–137.98 s; I chose to hold the light at the threatened gate. Lantern movement, bell or watcher accounts remained available in the player-facing view. At 147.19 s I chose Fast because I wanted dawn. I wanted to rest Tamar later, but this was an unclear response, not an interval when the only control was waiting. Builder’s scripted five-minute check: NOT TESTED.
- DL-33 — PASS for lantern and bell acts reached: one post tap carried the light; one bell tap rang it. Tapping Tamar in the scene opened her spoken account. Dusk posting opened a panel with Ask/Urge/Insist and destinations, then one destination submitted the order. I did not test posting by scene tap, Urge, or Insist. Dawn speech used a directly labelled spoken question and produced an answer without a confirmation form.

Other evidence gaps: exact hit-area dimensions, 200% text, 320 px layout, alternate theme, reload/resume, save, export/replay, sending, game completion and all builder/source checks are NOT TESTED. Sending was outside authorization. No exception is claimed from an unread design document.

## One desktop look after stopping

Screenshot 09, 1280×800: selected Tamar and the same goal/state strip remain visible. Scene occupies the left; posting panel occupies the right. The expanded pressure-help paragraph is readable above the destination controls, unlike screenshot 08 on the phone. This was a look at the stopped position only; it does not establish desktop play quality or alter the phone verdict.

## Changes I would want as Sam, ranked

1. Let me understand how to take a tired watcher off duty. If “Off the wall” means leaving the post undecided, say that on the control. I need to know whether I can ask Tamar to rest.
2. Tell me why the mill post is unavailable and what would make it available. I should not have to guess from two people standing there.
3. Keep the opened help and immediate phone response readable. The bell’s purpose and rope cost should be easy to understand before I spend rope.

## Artifacts

Report: `(driver scratch)/e-free2.md`

Driver wall-clock log: `(driver scratch)/e-free2-shots/wall-clock.jsonl`

Screenshots, all in `(driver scratch)/e-free2-shots/`:

1. `01-opening.png`
2. `02-dusk.png`
3. `03-nightfall.png`
4. `04-grain-bell.png`
5. `05-dawn.png`
6. `06-kian-answer.png`
7. `07-dawn-scroll.png`
8. `08-off-wall-help.png`
9. `09-desktop-after-stop.png`

No player export downloaded; no replay claim.
