# The Night Watch — Sam, phone playtest

## Assignment and outcome

Sam, 40, warehouse supervisor. I play Frostpunk, Kingdom Two Crowns and FTL. I like defending a place and deciding who stands where. I am patient, at home for the evening with my phone.

- URL: https://human.adamwhite.work/watch/
- Build: no build identifier encountered on the visible page.
- Device: supplied phone fixture, 360×690 CSS px, touch emulation, light-mode preference, default text size. The game itself rendered a dark scene. One desktop look at 1280×800 after stopping.
- Access: the supplied standard driver, one persistent page, normal visible controls, screenshots and documented real-time waits. No source, tests, other game documents, prior reports, hidden state, network payloads or debug APIs inspected.
- Commitment: floor 15 real minutes, ceiling 25. Actual stop: **846.349 seconds (14:06.349), TOOL**. The driver failed twice on the listed Tamar button. This is the permitted driver-block exception, not completion of the floor or a voluntary stopping-time result.
- First actionable screen: opening returned at 0.431 s. First posting choice appeared at 4.668 s. The first-minute note was logged at 59.987 s, approximately 60 seconds after opening.
- Session: 20 October 2026, approximately 14:51:54–15:06:00 America/Chicago. Post-stop screenshots ended at 14:16.693 elapsed. PID 61124 was then terminated by exact PID; a subsequent existence check returned “no such process.”
- Speed: I never selected a different speed. Watch was selected throughout. The game automatically slowed around threats and watcher decisions, then returned to Watch. Dawn explicitly showed “Clock stopped.” Time visibly advanced during waits and between commands; I did not observe a harness that froze time between commands.
- No run sent, telemetry submitted, consent changed or export downloaded. Export/replay: NOT TESTED.

**What remains:** the last minute of the committed floor and further play were blocked by access. I reached the third night, before dawn, with nine souls and grain still described as plentiful. The game did not end. In a post-stop screenshot, dawn had arrived and the report said “The wall held.” I made no further gameplay decisions.

## First minute

This table uses only the diary and visible answers through 60 seconds. Later discoveries do not change it.

| Item | Status | Original checkpoint answer and visible evidence |
|---|---|---|
| DL-1 A reason to act | PASS | “I need to keep six people and the granary through winter.” The opening said “Bring every soul and the granary to the thaw.” The scout reported Gate tracks. |
| DL-2 What can I touch | FAIL | “Watcher cards, post buttons, lantern and bell look usable.” No decorative object was proved inert. However, “The Ask row was partly behind the post buttons.” Screenshot 02-posting.png shows the lower portion of the pressure controls covered. A stale Back to watchers tap failed after the order had already closed that sheet; that was not an inert game control. |
| DL-3 Urgency and selection | PASS | “Tracks told me to put strength at the Gate”; “Gate selection has an outline.” The tracks cue and selected Gate were distinguishable. The future granary goal competed with no immediate warning in the first minute. |
| DL-4 Why the limit | NOT TESTED | “I have not met an unavailable action.” No unavailable action was encountered by the checkpoint. |
| DL-5 Readable situation | PASS | “I can carry the lantern or ring the bell, but I do not yet know when to ring.” At night the page said “Only the lantern’s stretch shows what approaches. Your voice reaches the next stretch.” I could name responses without knowing the best move. |
| DL-6 A choice soon | PASS | “First meaningful posting choice appeared about 5 seconds in; I picked Tamar at 9 seconds and confirmed Gate at 16.” Exact logged returns: posting at 4.668 s, Tamar input at 8.910 s, Gate order at 15.779 s. Opening Go up to the wall input: 4.668 s. The initial survival sentence preceded the choice; no long mandatory story or help blocked it. |
| DL-7 Learn by doing | PASS for reached interactions | “Asking returned me to the watcher list, and starting showed the wall at night. I used no help.” I understood asking Tamar to stay at the Gate and beginning the watch. Two interaction types reached: posting and starting. Four later interaction types—carrying the lantern, ringing the bell, morning conversations and relief—were NOT TESTED at this checkpoint. No claim about unmet interactions. |

Original checkpoint note, verbatim, at 59.987 s:

> At one minute I need to keep six people and the granary through winter. Tracks told me to put strength at the Gate; Tamar already belonged there, so I asked her to stay and began the watch. Watcher cards, post buttons, lantern and bell look usable. Gate selection has an outline. I have not met an unavailable action. I can carry the lantern or ring the bell, but I do not yet know when to ring. The Ask row was partly behind the post buttons. First meaningful posting choice appeared about 5 seconds in; I picked Tamar at 9 seconds and confirmed Gate at 16. Asking returned me to the watcher list, and starting showed the wall at night. I used no help.

A duplicate checkpoint draft was logged early at 51.579 s. Both remain unchanged in the diary. The 59.987 s note governs this table. The driver also recorded a first-minute screenshot at 60.069 s. The early draft incorrectly labels its game-clock field Nightfall; the page had already shown Night. Game-clock fields elsewhere are my input annotations, often naming the phase before an operation; they are not an authoritative clock capture.

## Important visible answers

These are observations from the driver replies during play. The raw wall-clock diary stores inputs and reactions, not the visible-answer bodies. Times below therefore identify the corresponding operation; reply completion can differ slightly from the log timestamp.

| Elapsed | Input or moment | Important visible answer |
|---|---|---|
| 0:04.668 | Go up to the wall | Six souls; Gate tracks; three watcher cards; “Tap a watcher, then a post.” |
| 0:08.910 | Tamar | “Gate, asked · there now”; Ask selected; “likely, maybe.” |
| 0:15.779 | Gate · tracks | Returned to watcher list, Tamar at Gate. No further confirmation screen. |
| 0:21.299 | Begin the watch | Nightfall; “The wall settles in for the night”; lantern and bell controls. |
| 1:03.907 | West wall | “The lantern is on its way.” |
| 1:07.007 | Tap drawn Mara | “I’m keeping watch. Nothing close that I can make out.” |
| 2:19.064 | Wait at Gate | “Kian drove a wolf off the gate road.” |
| 2:42.419 | Watchers and bell | “Calls back watchers who hear it, loudest at the Gate. Every pull wears the rope; a snapped rope leaves it silent.” |
| 2:45.506 | Kian | “I’m keeping watch. The scout warned us about this stretch. I can’t make anything out yet.” I expected an account of the recent wolf. |
| 3:44.161 | Wait through dawn | “The wall was crossed.” “A wolf got over the Gate during the raid. Tamar and Kian drove off wolves at the Gate.” I had not caught the crossing during the night. |
| 3:56.411 | Kian, Tell me about last night | “I left the Gate. I was frozen through. It won’t happen again.” One more talk remained. |
| 4:01.015 | Would you keep the Gate one day? | Mara: “Me? I’d try. Someone has to.” Then “The day’s work calls. No more talks this morning.” |
| 4:12.698 | On to dusk | Night two; eight souls; mill-race tracks; Joss and Yunus arrived, both assigned Mill wall. |
| 4:20.118–4:29.543 | Kian, then Mill wall · tracks | Mill wall button disabled; no nearby reason explaining it. I guessed two watchers might fill a stretch. Disabled action was the game’s answer, not a driver block. |
| 4:35.078 | About asking and pressing | “Ask leaves it to them; urge leans on them; insist can get them there under protest. Tired or frightened watchers may leave their post.” |
| 4:38.863 | East wall | Kian’s card changed to “East wall, asked · in the village.” |
| 4:48.905 / 5:23.497 | Mill wall lantern, retry | First reply: locator.innerText timeout. Retry eventually showed Mill wall selected. Not a terminal block. |
| 5:27.299 | Begin watch | Lantern at Mill wall. |
| 6:00.400 | Wait | “Wolves along the mill race.” Joss and Yunus each “drove a wolf off the mill wall.” |
| 6:17.070 | Drawn Yunus | The same scout-warning / “can’t make anything out yet” account. No Rest or relief action appeared for him in that reply. |
| 6:27.648 | Back to wall | “Movement in the dark by the east wall.” |
| 6:32.286 | East wall | Lantern moving; “Something at the foot of the east wall”; Joss heard danger near his two children. “About 119 seconds; then they decide alone.” Speed: “Slow · watcher decision · 1 min / 60 s.” |
| 6:42.534 | Let Joss go to his two children | Decision sheet closed. Watch speed recovered over the following time. No spoken acknowledgement caught. |
| 7:26.011 | Watchers and bell | “Everyone is on the wall.” I therefore did not ring then. |
| 7:29.817 | Tamar from East wall | Rest disabled. “Too far to call Tamar from here; carry the light to the Gate.” “Keeper’s read: seemed tiring at dusk.” |
| 7:34.801 | Send relief | No available helper buttons. “Out of call: Kian, Yunus — carry the light.” “Unavailable: Mara — Tamar’s or the helper’s condition has changed; this request is no longer available.” It did not specify which condition. |
| 8:08.175 | Wait after carrying light to Gate | Kian: “I can’t keep my eyes open.” “Grain is gone: something got over the mill wall.” Kian gone home. |
| 8:14.773 | Ring bell | “It wakes Tamar, nodding at the Gate. ‘Holding!’ Tamar calls back.” Everyone on wall; rope fraying. |
| 8:23.558 | Send relief for Tamar | Mara, Joss and Yunus options with who would remain at their old posts; relief takes over before Tamar is asked to sleep. |
| 8:28.790 / 8:35.462 | Send Mara, retry | First: “No actionable button named Send Mara to relieve Tamar.” Retry succeeded: “Mara has the Gate; Tamar has been asked to go down.” “Mara calls: ‘I’ll take the Gate.’” |
| 9:07.695 | Dawn | Wall crossed at mill and east. Tamar: “You rang us up for shadows.” This was confusing after the explicit wake-up acknowledgement. |
| 9:20.392 | How are the knees? | Yunus: “Fit to stand tonight.” |
| 9:33.542 | Joss, How are things at home? | “Mara keeps the fire in till I’m home.” |
| 9:40.021 | On to dusk | Night three; nine souls; Gate tracks; Ruslan arrived. Joss spent two hours on bell rope. Tamar unassigned after relief. |
| 10:01.111 / 10:11.277 | Gate order for Tamar; West order for Kian | Asked assignments changed. Mara also at Gate; Joss and Yunus mill; Ruslan east. |
| 10:51.940 | Wait | “Wolves on the gate road”; automatic slowdown. |
| 11:00.356 | Ring bell | Tamar drove a wolf off; “‘Holding!’ they call back.” Mara looked back at steps; about 115 seconds to answer; let go / urge / ring by name / say nothing choices. |
| 11:15.839 | Urge Mara to hold | Sheet closed. No specific answer from Mara caught; no duplicate input attempted. |
| 12:15.094 | Mara | “Gate, asked · there now.” Same scout-warning / “can’t make anything out yet” account. |
| 12:59.744 | Wait | Mara “Gate, asked · gone home”; Kian too tired to keep west. |
| 13:11.919 | Ring bell | Kian returned; Mara still off wall in immediate reply; rope badly frayed. |
| 13:46.210 | Wait | Everyone on wall; Tamar nodding at Gate. |
| 13:55.632 / 13:59.995 | Tamar, required retry | Both: “No actionable button named Tamar.” The current reply still listed Tamar as a button. Stopped under driver-block rule. |
| 14:06.349 | Stop log | TOOL. No more gameplay inputs. |
| 14:11.266 | Post-stop phone screenshot | Dawn had arrived: “The wall held.” No sacks lost. This is an observation after the stop, not a completed extra phase of active play. |
| 14:16.693 | Required desktop look | Dawn, visible state strip and large scene; talks at right; report extends below. No desktop control operated. |

## Moments, pulses and wanting to leave

**Best moment:** 6:32–6:42, Joss hearing danger near his children. “Now I have a decision worth stopping for. His children are there; I do not want him held away from them.” I let him go and accepted leaving Yunus at the mill. The automatic slowdown gave me time to read and choose. The earlier mill defence at 6:00 also made the posting plan feel useful.

**Worst game moment:** second dawn, about 9:08. “You rang us up for shadows” did not fit the benefit I had just seen from waking Tamar. I could not tell whether this was a character judging me, an objection to ringing without a current threat, or feedback that ignored the wake-up. I do not know the underlying rule.

**Worst access moment:** 13:55–14:00, unable to open Tamar twice when I wanted to let her rest. This ended the session for TOOL, separate from the game findings.

| Pulse elapsed | Engagement | Original reason |
|---|---|---|
| 3:06.727 | 3/5 | I like having a place to guard, but most of this night has gone on without needing me. |
| 6:09.750 | 4/5 | The wolves came where the scout warned, and my mill pair drove them off; I want to see this watch hold. |
| 9:13.060 | 4/5 | Relieving Tamar gave me work I cared about, but her claim that I rang for shadows clashes with seeing the bell wake her. |
| 12:01.485 | 3/5 | I still want the watch to hold, but after urging Mara I am back to checking whether anything answered me. |

Only one want_quit occurred, at **12:22.130 — BORED**:

> I would put the phone down here and let the rest of the night run. Mara is holding, but checking people keeps giving me the same answer and I am waiting for the next thing to happen. I would come back at dawn, not abandon the village.

The wish to put the phone down passed temporarily when Mara and Kian left and I had a reason to ring again. It was not a wish to abandon the run. The final stop was imposed by the driver, so there is no observed voluntary stop after the floor.

**Hard, but kept going:** I did not look for an easier setting or accessibility toggle. That exact signal is NOT TESTED. I did seek an in-game way to make a hard situation manageable: Send relief at 7:34, carrying the light within voice range, and sending Mara at 8:35. I stayed because I wanted Tamar rested without leaving the Gate empty. I used a second bell pull despite a frayed rope because two watchers were absent. These are observed persistence and workaround choices, not evidence of an easier-mode search.

## Clarity findings

- **DL-4 — FAIL for unexplained post limits.** At 4:20–4:29 the disabled “Mill wall · tracks” action did not say why Kian could not be sent there or what would free it. “Maybe two watchers fill a stretch; that is a guess.” Screenshot 06-disabled-mill.png. Later Gate and Mill buttons were also disabled during posting. I did not confirm a capacity rule.
- **DL-4 — FAIL for one vague relief limit.** “Tamar’s or the helper’s condition has changed; this request is no longer available” did not identify the condition or remedy. Transcript 7:34. The voice limit itself was clear: “carry the light to the Gate.” That limit visibly changed once I moved; Rest and relief options then became available.
- **DL-13 — FAIL for the encountered watcher decision acknowledgement.** Urge Mara at 11:15 closed the sheet, but I caught no specific answer. I checked her at 12:15 to learn that she was still there. This is a missing acknowledgement in my observed replies, not proof that no response could ever appear. Lantern travel, bell operation and the successful relief order gave useful acknowledgements.
- **DL-19 — unresolved misleading-feedback concern.** The bell explicitly woke Tamar at 8:14, then she said “You rang us up for shadows” at dawn. I could not tell how to judge the choice. This needs reproduction; I cannot establish whether her complaint was an intentional personal judgement. The third dawn, observed after stopping, also included Ruslan’s “If you ring at nothing, we stop listening,” despite one pull having followed a visible wolf warning. I made two pulls that night, so I cannot attribute his complaint to one of them.
- **DL-22 — FAIL on encountered phone screens.** The first posting pressure row was partly covered; the Joss decision’s lower choices were behind the fixed lantern/bell area. At dawn the wall-crossing report and On to dusk required scrolling below the talks. Screenshots 02-posting.png, 04-dawn.png, 05-dawn-scrolled.png and 08-joss-children.png. Normal night lantern and bell controls fit in 03-first-night.png and 07-mill-wolves.png.
- **DL-30 — FAIL, action controls covered.** In 02-posting.png, the lower portion of Ask / Urge / Insist sits behind the post-control area. In 08-joss-children.png, “Ring and call Joss by name” is partly under the fixed lower area and the say-nothing option is out of view. No separate sentence cut off mid-word was established. The problem observed is covered action text and scrolling to reach the response, not an invented truncated sentence.

I missed the first-night crossing until dawn. The sparse, temporary heard lines and repeated watcher accounts made it hard to connect what I had just seen to what people said. I cannot claim the crossing had no cue: I used real waits and could have missed a brief cue. Likewise, a generic account after an attack is not proof of incorrect internal memory.

## English, dates, phone context and hands-on play

| Item | Status | What I could establish |
|---|---|---|
| DL-20 English | PASS | Every action, state label and reason I used was in understandable English. Names did not require translation. |
| DL-21 Dates | PASS for encountered relative dates; deadline comparison NOT TESTED | First, second and third night of the first winter were readable and ordered. “Early watches; the thaw is still far off” gave a coarse seasonal goal. I met no exact deadline across a month/year boundary and did not return after a real break. I cannot establish an exact thaw date or cross-year comparison. |
| DL-22 Phone response | FAIL | Covered posting controls and lower live choices; dawn report below talks. See screenshots above. |
| DL-30 Clipping/overlap | FAIL | Pressure controls and Joss choices overlapped by the lower control area. No two modal sheets were observed stacked. Long dawn content could be scrolled. |
| DL-31 Read state while acting | PASS for encountered state | At posting and the Joss decision I could still read the winter/night, coarse thaw progress, grain and soul status, and see the wall. The selected watcher was named in the state strip or decision sheet. Screenshot 02 and 08. No exact deadline was supplied to test. The relief screen retained Tamar and Gate in the visible-answer transcript. |
| DL-32 Something for hands | NOT TESTED as a universal 20-second availability claim | The longest clearly logged wish for something more to do was 12:22–12:59, about 38 seconds, after repeated watcher answers. I wanted a useful response from Mara or something to do before another event. I could still carry the lantern, inspect someone else or ring; I cannot call that a proven interval where only watching was possible. Other 30-second waits were deliberate. No scripted/source audit was performed. |
| DL-33 Acts in scene | NOT TESTED as a whole; reached interactions described | I used the labelled lantern stretch buttons, not a direct tap on a drawn wall stretch. Each moved the lantern in one act without a form. Ring the bell also acted in one input and produced sound/response text and rope wear. Tapping a drawn watcher opened their account. Sending relief required opening the person, choosing Send relief and choosing a helper. That felt like planning an order; it was not direct action on the watcher in one tap. Direct scene lantern movement and a direct scene relief action were NOT TESTED. |

Other encountered checks: DL-12 PASS for dawn boundaries (“Clock stopped”, report and On to dusk); DL-14 PASS for encountered bell rope costs, relief coverage consequences and morning talk sleep cost; DL-15 automatic slowdown observed from Watch, including about 119 seconds for Joss and about 115 seconds for Mara. Fast-speed live-choice behavior is NOT TESTED because I never selected Fast. DL-17 tiredness was conveyed in words and actions, not a percentage in what I saw. No builder checks, target-size measurements, 200% text tests, reload/resume tests or send/export tests were performed. Those are NOT TESTED.

## Stop and return

I stopped at 14:06.349, third night of the first winter, Before dawn, reason **TOOL**. At 13:55.632 the driver said “No actionable button named Tamar.” At 13:59.995, the required retry using the latest listed button name gave the same error. The reply still listed Tamar without a disabled marker. This is a driver-access finding. I did not inspect the DOM or try an alternate route after the second failure. I have no screenshot of the exact failed instant and cannot prove whether the button was within the viewport or why the driver could not operate it. I do not call it a broken game button.

The supplied command was:

```sh
cd (driver scratch)/deploy
PLAYWRIGHT_MODULE=~/code/.lab-scratch/patterns/retest/well-cwd/node_modules/playwright npm run lab:play -- url=https://human.adamwhite.work/watch/ out=(driver scratch)/watch-floor2-shots port=43504 device=phone floor=15 ceiling=25
```

The failed operation, repeated once, was:

```json
{"op":"tap","name":"Tamar","role":"button"}
```

Earlier isolated driver failures recovered on the next current control or required retry. The disabled mill action was not treated as a driver error. The terminal failure was separate from those.

I would return voluntarily. I want to see whether I can keep a watch intact and get the people to the thaw. I would also put the phone down during a settled stretch and return for dawn. The strongest reason to stay was deciding between holding a post and letting someone protect family. The wish to put the phone down briefly passed when the watch needed intervention again. No claim that this forced early stop measures my voluntary session length.

After stopping, the phone screenshot caught third dawn (“The wall held”) and the required 1280×800 look showed a large scene with talks in a right-hand panel. Both retained the upper state strip. The desktop report still extended below the visible talks. I did not operate any gameplay control at desktop size. These are post-stop layout observations only.

## Up to three changes I want as Sam

1. Let me read and reach every immediate choice on the phone without the lantern/post controls covering it.
2. Tell me why a post or helper is unavailable, and give me a clear answer when I urge a watcher to stay.
3. Make the night’s useful actions and morning accounts connect clearly: if ringing woke someone, let me understand why they still object to the call.

## Verbatim diary

The following entries preserve every reaction and input from this session’s generated wall-clock log, in order. Empty reactions are shown as “—”. Elapsed times are rounded for display; exact seconds and ISO timestamps remain in wall-clock.jsonl. The JSON input is unchanged. Errors are preserved. The section after the stop contains only the recorded screenshot/desktop look. Important visible answers are recorded separately above because the driver log does not store them.

### 01 · 0:00.431 · input · open

Game clock annotation: not recorded. 

Input: `{}`

I want to see the wall and decide where my people belong.

### 02 · 0:04.460 · input · shot

Game clock annotation: not recorded. 

Input: `{"file":"01-opening.png"}`

Go up to the wall looks like the main button. The goal is clear: people and food must survive.

### 03 · 0:04.668 · input · tap

Game clock annotation: not recorded. 

Input: `{"name":"Go up to the wall","role":"button"}`

Let me see who I have.

### 04 · 0:08.910 · input · tap

Game clock annotation: First winter, first night, Dusk. 

Input: `{"name":"Tamar Sling, steady · keeps the Gate Gate, asked · in the village dutiful steady by nature","role":"button"}`

Pack tracks at the Gate. Tamar sounds right there; I will check the assignment.

### 05 · 0:09.196 · input · shot

Game clock annotation: First winter, first night, Dusk. 

Input: `{"file":"02-posting.png"}`

—

### 06 · 0:15.779 · input · tap

Game clock annotation: First winter, first night, Dusk. 

Input: `{"name":"Gate · tracks","role":"button"}`

I am asking, not forcing. The Ask row is partly hidden behind the post buttons on my phone.

### 07 · 0:15.896 · tool · tap

Game clock annotation: First winter, first night, Dusk. 

Input: `{"name":"Back to watchers","role":"button"}`

Tamar is staying at the Gate; I want the lantern there too.

Driver answer:

```text
No actionable button named Back to watchers
```

### 08 · 0:21.299 · input · tap

Game clock annotation: First winter, first night, Dusk. 

Input: `{"name":"Begin the watch","role":"button"}`

The posting sheet closed after my order. I have two at the tracks and Mara west. Begin.

### 09 · 0:51.576 · input · wait

Game clock annotation: First winter, first night. 

Input: `{"s":30}`

I am watching for movement near the Gate.

### 10 · 0:51.579 · first_minute · log

Game clock annotation: First winter, first night, Nightfall. 

Input: `null`

I need to keep six people and the granary through winter. Tracks told me to put strength at the Gate; Tamar already belonged there, so I asked her to stay and began the watch. Watcher cards, post buttons, lantern and bell look usable. Gate selection has an outline. I have not met an unavailable action. I can carry the lantern or ring the bell, but I do not yet know when to ring. The Ask row was partly behind the post buttons. First meaningful posting choice appeared about 5 seconds in; I picked Tamar at 9 seconds and confirmed Gate at 16. Asking returned me to the watcher list, and starting showed the wall at night. I used no help.

### 11 · 0:51.752 · input · shot

Game clock annotation: First winter, first night. 

Input: `{"file":"03-first-night.png"}`

The wall is quiet; I want to see what is moving before I ring.

### 12 · 0:59.987 · first_minute · log

Game clock annotation: First winter, first night, Night. 

Input: `null`

At one minute I need to keep six people and the granary through winter. Tracks told me to put strength at the Gate; Tamar already belonged there, so I asked her to stay and began the watch. Watcher cards, post buttons, lantern and bell look usable. Gate selection has an outline. I have not met an unavailable action. I can carry the lantern or ring the bell, but I do not yet know when to ring. The Ask row was partly behind the post buttons. First meaningful posting choice appeared about 5 seconds in; I picked Tamar at 9 seconds and confirmed Gate at 16. Asking returned me to the watcher list, and starting showed the wall at night. I used no help.

### 13 · 1:00.069 · first_minute · shot

Game clock annotation: not recorded. 

Input: `{"file":"first-minute.png"}`

—

### 14 · 1:03.907 · input · tap

Game clock annotation: First winter, first night, Night. 

Input: `{"name":"West wall","role":"button"}`

I will check on Mara rather than stare only at the Gate.

### 15 · 1:07.007 · input · tap

Game clock annotation: First winter, first night, Night. 

Input: `{"x":25,"y":348}`

Mara is drawn on the west wall. I will tap her and ask what she sees.

### 16 · 1:40.398 · input · wait

Game clock annotation: First winter, first night, Night. 

Input: `{"s":30}`

Mara has nothing close. I like getting an answer from her rather than a detection percentage.

### 17 · 1:44.792 · input · tap

Game clock annotation: First winter, first night, Night. 

Input: `{"name":"Back to the wall","role":"button"}`

I have checked the west; now I want the Gate back in the light.

### 18 · 1:45.124 · input · tap

Game clock annotation: First winter, first night, Night. 

Input: `{"name":"Gate","role":"button"}`

Carrying the lantern leaves the other stretch dark. That is a small choice I understand.

### 19 · 2:19.064 · input · wait

Game clock annotation: First winter, first night, Midnight. 

Input: `{"s":30}`

I am leaving the lantern on the tracks for a while. Nothing yet makes me want to sound an alarm.

### 20 · 2:42.419 · input · tap

Game clock annotation: First winter, first night, The small hours. 

Input: `{"text":"Watchers and bell"}`

Good, Kian handled that. I want to understand what the bell asks everyone to do before I use it.

### 21 · 2:45.506 · input · tap

Game clock annotation: First winter, first night, The small hours. 

Input: `{"name":"Kian","role":"button"}`

I want to hear from the person who saw the wolf.

### 22 · 3:03.727 · input · wait

Game clock annotation: First winter, first night, The small hours. 

Input: `{"s":15}`

I expected Kian to mention the wolf he just drove off. His answer sounds like nothing has happened.

### 23 · 3:06.727 · pulse · log

Game clock annotation: First winter, first night, Before dawn. Engagement: 3/5. 

Input: `null`

I like having a place to guard, but most of this night has gone on without needing me.

### 24 · 3:11.180 · input · tap

Game clock annotation: First winter, first night, Before dawn. 

Input: `{"name":"Back to the wall","role":"button"}`

I want a view of the whole watch before dawn.

### 25 · 3:44.161 · input · wait

Game clock annotation: First winter, first night, Before dawn. 

Input: `{"s":30}`

Everyone is on the wall and there is no reason to waste the rope. I will let the last part of the night pass.

### 26 · 3:52.355 · input · shot

Game clock annotation: First winter, first night, Dawn. 

Input: `{"file":"04-dawn.png"}`

The wall was crossed? I saw one success line, not that a wolf got through. I care about that. Mara is tired too.

### 27 · 3:56.411 · input · tap

Game clock annotation: First winter, first night, Dawn. 

Input: `{"x":94,"y":583}`

Kian, tell me about last night. Why did the Gate not hold?

### 28 · 4:01.015 · input · tap

Game clock annotation: First winter, first night, Dawn. 

Input: `{"name":"Would you keep the Gate one day?","role":"button"}`

Mara sees well. I want to know whether she would cover the important post if Kian struggles.

### 29 · 4:05.101 · input · scroll

Game clock annotation: First winter, first night, Dawn. 

Input: `{"dy":450,"x":180,"y":580}`

The report and way onward are below the talks. I am scrolling to read what actually happened.

### 30 · 4:08.511 · input · shot

Game clock annotation: First winter, first night, Dawn. 

Input: `{"file":"05-dawn-scrolled.png"}`

—

### 31 · 4:12.698 · input · tap

Game clock annotation: First winter, first night, Dawn. 

Input: `{"name":"On to dusk","role":"button"}`

Two talks, then their work calls. I will try a different watch arrangement tonight.

### 32 · 4:20.118 · input · tap

Game clock annotation: First winter, second night, Dusk. 

Input: `{"name":"Kian Fast, eager Gate, asked · in the village heeds you close to Tamar","role":"button"}`

There are tracks by the mill now. I want Kian helping there with the newcomers; Tamar can keep the Gate.

### 33 · 4:24.592 · input · tap

Game clock annotation: First winter, second night, Dusk. 

Input: `{"name":"Mill wall · tracks","role":"button"}`

The mill post looks disabled. I cannot yet see why I cannot ask Kian to go there.

### 34 · 4:29.543 · input · shot

Game clock annotation: First winter, second night, Dusk. 

Input: `{"file":"06-disabled-mill.png"}`

Maybe two watchers fill a stretch; that is a guess. I can see no reason beside the unavailable Mill wall button.

### 35 · 4:35.078 · input · tap

Game clock annotation: First winter, second night, Dusk. 

Input: `{"text":"About asking and pressing"}`

I will read the asking help before deciding whether I should press harder.

### 36 · 4:38.863 · input · tap

Game clock annotation: First winter, second night, Dusk. 

Input: `{"name":"East wall","role":"button"}`

The mill already has two. I will ask Kian to cover the empty east instead and carry the light to the tracks.

### 37 · 4:48.905 · tool · tap

Game clock annotation: First winter, second night, Dusk. 

Input: `{"name":"Mill wall","role":"button"}`

The scout warned of the mill. That is where I want my lantern at nightfall.

Driver answer:

```text
locator.innerText: Timeout 5000ms exceeded.
Call log:
[2m  - waiting for locator('body')[22m

```

### 38 · 5:23.497 · input · tap

Game clock annotation: First winter, second night, Dusk. 

Input: `{"name":"Mill wall","role":"button"}`

The driver gave a timeout. I am retrying the visible Mill wall button once.

### 39 · 5:27.299 · input · tap

Game clock annotation: First winter, second night, Dusk. 

Input: `{"name":"Begin the watch","role":"button"}`

The retry selected Mill wall. My plan is set: two at the mill, one at each other stretch.

### 40 · 6:00.400 · input · wait

Game clock annotation: First winter, second night, Nightfall. 

Input: `{"s":30}`

I want to see whether covering every stretch changes the result.

### 41 · 6:09.750 · pulse · log

Game clock annotation: First winter, second night, Night. Engagement: 4/5. 

Input: `null`

The wolves came where the scout warned, and my mill pair drove them off; I want to see this watch hold.

### 42 · 6:13.551 · input · shot

Game clock annotation: First winter, second night, Night. 

Input: `{"file":"07-mill-wolves.png"}`

This is the moment I wanted: two people holding the threatened stretch.

### 43 · 6:17.070 · input · tap

Game clock annotation: First winter, second night, Night. 

Input: `{"x":246,"y":348}`

Yunus is new. I want to know whether he is still all right after the attack.

### 44 · 6:23.578 · note · log

Game clock annotation: First winter, second night, Night. 

Input: `null`

I can hear Yunus, but I cannot see any request to give him. Dusk said I could ask people to rest at night; I do not yet know where that action lives.

### 45 · 6:27.648 · input · tap

Game clock annotation: First winter, second night, Night. 

Input: `{"name":"Back to the wall","role":"button"}`

I will check Tamar; she was already tiring at dusk.

### 46 · 6:32.286 · input · tap

Game clock annotation: First winter, second night, Night. 

Input: `{"name":"East wall","role":"button"}`

Movement at the east! Kian is alone there. I want the light on it.

### 47 · 6:36.874 · input · shot

Game clock annotation: First winter, second night, Night. 

Input: `{"file":"08-joss-children.png"}`

Now I have a decision worth stopping for. His children are there; I do not want him held away from them.

### 48 · 6:42.534 · input · tap

Game clock annotation: First winter, second night, Night. 

Input: `{"name":"Let Joss go to his two children","role":"button"}`

Go to your children. Yunus is still at the mill, and I do not want to pull tired Tamar away from the Gate.

### 49 · 7:17.897 · input · wait

Game clock annotation: First winter, second night, Night. 

Input: `{"s":30}`

I let Joss go. Now I want to see whether Kian returns and whether the east threat is real.

### 50 · 7:26.011 · input · tap

Game clock annotation: First winter, second night, Midnight. 

Input: `{"text":"Watchers and bell"}`

Kian looked down in the hall during that scare. I want to know who is absent before I ring.

### 51 · 7:29.817 · input · tap

Game clock annotation: First winter, second night, Midnight. 

Input: `{"name":"Tamar","role":"button"}`

Everyone is back. I want to see whether Tamar needs relief; she was tiring before this watch.

### 52 · 7:34.801 · input · tap

Game clock annotation: First winter, second night, Midnight. 

Input: `{"name":"Send relief","role":"button"}`

I would rather relieve her than leave the Gate empty.

### 53 · 7:39.066 · input · tap

Game clock annotation: First winter, second night, The small hours. 

Input: `{"name":"Back to Tamar","role":"button"}`

The relief list says carry the light, but it does not tell me what changed for Mara. I will move closer to Tamar.

### 54 · 7:43.826 · input · tap

Game clock annotation: First winter, second night, The small hours. 

Input: `{"name":"Back to the wall","role":"button"}`

I understand the voice limit; the lantern is also where I stand.

### 55 · 7:48.213 · input · tap

Game clock annotation: First winter, second night, The small hours. 

Input: `{"name":"Gate","role":"button"}`

I will carry the light to the Gate and speak to Tamar there.

### 56 · 8:08.175 · input · wait

Game clock annotation: First winter, second night, The small hours. 

Input: `{"s":15}`

I am walking the light back. I want to give Tamar a rest without leaving the Gate uncovered.

### 57 · 8:14.773 · input · tap

Game clock annotation: First winter, second night, The small hours. 

Input: `{"name":"Ring the bell","role":"button"}`

Kian has gone home and grain was taken. I will call the missing watcher back now, even though the bell is faint in the east.

### 58 · 8:19.909 · input · tap

Game clock annotation: First winter, second night, The small hours. 

Input: `{"name":"Tamar","role":"button"}`

The bell woke Tamar, but that does not make her rested. I still want relief for her.

### 59 · 8:23.558 · input · tap

Game clock annotation: First winter, second night, The small hours. 

Input: `{"name":"Send relief","role":"button"}`

Who can cover her from here?

### 60 · 8:28.790 · tool · tap

Game clock annotation: First winter, second night, Before dawn. 

Input: `{"name":"Send Mara to relieve Tamar","role":"button"}`

Mara said she would try the Gate. Joss is west with her now, so I can send her without emptying that stretch.

Driver answer:

```text
No actionable button named Send Mara to relieve Tamar
```

### 61 · 8:35.462 · input · tap

Game clock annotation: First winter, second night, Before dawn. 

Input: `{"name":"Send Mara to relieve Tamar","role":"button"}`

The driver did not operate the listed relief button. I am retrying its current name once.

### 62 · 9:07.695 · input · wait

Game clock annotation: First winter, second night, Before dawn. 

Input: `{"s":25}`

Mara called that she will take the Gate. Good. I want Tamar actually down and asleep before morning.

### 63 · 9:13.060 · pulse · log

Game clock annotation: First winter, second night, Dawn. Engagement: 4/5. 

Input: `null`

Relieving Tamar gave me work I cared about, but her claim that I rang for shadows clashes with seeing the bell wake her.

### 64 · 9:20.392 · input · tap

Game clock annotation: First winter, second night, Dawn. 

Input: `{"name":"How are the knees?","role":"button"}`

Yunus held the mill with trouble still getting through. I want to know whether he can stand another night.

### 65 · 9:29.761 · input · shot

Game clock annotation: First winter, second night, Dawn. 

Input: `{"file":"09-second-dawn-talks.png"}`

Yunus says he is fit. I want to hear about Joss and the children before I plan again.

### 66 · 9:33.542 · input · tap

Game clock annotation: First winter, second night, Dawn. 

Input: `{"x":95,"y":427}`

Joss, how are things at home? I let you leave because your children mattered.

### 67 · 9:40.021 · input · tap

Game clock annotation: First winter, second night, Dawn. 

Input: `{"name":"On to dusk","role":"button"}`

I will plan another night. I want to stop splitting people from those who help them hold.

### 68 · 9:54.355 · input · tap

Game clock annotation: First winter, third night, Dusk. 

Input: `{"name":"Tamar Sling, steady · keeps the Gate no assigned post · may choose an open post · on the East wall heeds you tiring dutiful steady by nature","role":"button"}`

Tracks are back at the Gate. Tamar is unassigned after relief, so I will ask her back beside Mara.

### 69 · 10:01.111 · input · tap

Game clock annotation: First winter, third night, Dusk. 

Input: `{"name":"Gate · tracks","role":"button"}`

Tamar, keep the Gate with Mara. I am still asking rather than insisting.

### 70 · 10:05.456 · input · tap

Game clock annotation: First winter, third night, Dusk. 

Input: `{"name":"Kian Fast, eager East wall, asked · in the village heeds you tiring jumpy by nature close to Tamar","role":"button"}`

Kian, I need someone west. Ruslan can keep the east.

### 71 · 10:11.277 · input · tap

Game clock annotation: First winter, third night, Dusk. 

Input: `{"name":"West wall","role":"button"}`

Ask for the west wall. I know he may leave again; I do not want to force him tonight.

### 72 · 10:17.806 · input · tap

Game clock annotation: First winter, third night, Dusk. 

Input: `{"name":"Begin the watch","role":"button"}`

The Gate pair and mill pair are set. I will watch for someone falling asleep earlier this time.

### 73 · 10:51.940 · input · wait

Game clock annotation: First winter, third night, Nightfall. 

Input: `{"s":30}`

I am staying at the Gate for the expected pack. I do not want to ring just because the night is quiet.

### 74 · 11:00.356 · input · tap

Game clock annotation: First winter, third night, Night. 

Input: `{"name":"Ring the bell","role":"button"}`

Wolves on the Gate road: this is a real alarm. Wake up and hold the Gate.

### 75 · 11:15.839 · input · tap

Game clock annotation: First winter, third night, Night. 

Input: `{"name":"Urge Mara to hold likely","role":"button"}`

Hold a little longer, Mara. Tamar is beside you and wolves are here. I will urge her; I am not pulling the rope twice.

### 76 · 11:52.842 · input · wait

Game clock annotation: First winter, third night, Night. 

Input: `{"s":30}`

The choice closed after I urged Mara, but I did not get a line from her. I am looking for whether she stays.

### 77 · 12:01.485 · pulse · log

Game clock annotation: First winter, third night, Night. Engagement: 3/5. 

Input: `null`

I still want the watch to hold, but after urging Mara I am back to checking whether anything answered me.

### 78 · 12:07.636 · input · tap

Game clock annotation: First winter, third night, Night. 

Input: `{"text":"Watchers and bell"}`

I want Mara’s account of whether she is holding.

### 79 · 12:15.094 · input · tap

Game clock annotation: First winter, third night, Midnight. 

Input: `{"name":"Mara","role":"button"}`

Mara, are you still holding the Gate?

### 80 · 12:22.130 · want_quit · log

Game clock annotation: First winter, third night, Midnight. Reason: BORED. 

Input: `null`

I would put the phone down here and let the rest of the night run. Mara is holding, but checking people keeps giving me the same answer and I am waiting for the next thing to happen. I would come back at dawn, not abandon the village.

### 81 · 12:59.744 · input · wait

Game clock annotation: First winter, third night, Midnight. 

Input: `{"s":30}`

I am leaving Mara’s account open and waiting to see what changes. I still want the night to end safely.

### 82 · 13:08.180 · input · tap

Game clock annotation: First winter, third night, The small hours. 

Input: `{"name":"Back to the wall","role":"button"}`

Mara has gone home despite the urge, and Kian has left too. I need the bell again.

### 83 · 13:11.919 · input · tap

Game clock annotation: First winter, third night, The small hours. 

Input: `{"name":"Ring the bell","role":"button"}`

Two posts need people back. The rope is fraying, but this is why it is here. I will risk another pull.

### 84 · 13:46.210 · input · wait

Game clock annotation: First winter, third night, The small hours. 

Input: `{"s":30}`

Kian is back, Mara is not. I will not keep yanking the rope just because she has had enough.

### 85 · 13:55.632 · tool · tap

Game clock annotation: First winter, third night, Before dawn. 

Input: `{"name":"Tamar","role":"button"}`

Tamar is nodding off again. With Mara back at the Gate, I want to let her sleep.

Driver answer:

```text
No actionable button named Tamar
```

### 86 · 13:59.995 · tool · tap

Game clock annotation: First winter, third night, Before dawn. 

Input: `{"name":"Tamar","role":"button"}`

The driver missed the listed Tamar button. I am retrying once.

Driver answer:

```text
No actionable button named Tamar
```

### 87 · 14:06.349 · stop · log

Game clock annotation: First winter, third night, Before dawn. Reason: TOOL. 

Input: `null`

The driver could not operate the listed Tamar button twice: No actionable button named Tamar. I wanted to ask her to rest before dawn. I am stopping under the driver-block rule, before the 15-minute floor. I would return to the village later; this stop is imposed by access, not a voluntary end.

### 88 · 14:11.266 · input · shot

Game clock annotation: First winter, third night, Before dawn. 

Input: `{"file":"10-stop-phone.png"}`

—

### 89 · 14:16.479 · input · resize

Game clock annotation: First winter, third night, Dawn. 

Input: `{"width":1280,"height":800}`

Post-stop desktop look only; I am not continuing play.

### 90 · 14:16.693 · input · shot

Game clock annotation: First winter, third night, Dawn. 

Input: `{"file":"11-desktop-after-stop.png"}`

—

## Evidence files

- Diary: watch-floor2-shots/wall-clock.jsonl
- Opening: watch-floor2-shots/01-opening.png
- Posting overlap: watch-floor2-shots/02-posting.png
- Normal night: watch-floor2-shots/03-first-night.png
- Driver first-minute capture: watch-floor2-shots/first-minute.png
- Dawn before scrolling: watch-floor2-shots/04-dawn.png
- Dawn after scrolling: watch-floor2-shots/05-dawn-scrolled.png
- Disabled post: watch-floor2-shots/06-disabled-mill.png
- Mill scene (heard wolf lines had already cleared): watch-floor2-shots/07-mill-wolves.png
- Live Joss decision: watch-floor2-shots/08-joss-children.png
- Second dawn: watch-floor2-shots/09-second-dawn-talks.png
- Post-stop phone dawn: watch-floor2-shots/10-stop-phone.png
- Post-stop desktop look: watch-floor2-shots/11-desktop-after-stop.png

No export path: none downloaded. No replay claim.
