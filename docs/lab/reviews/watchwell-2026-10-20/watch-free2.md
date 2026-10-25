# The Night Watch — Sam, free-stop phone playtest

## Session

Sam, 40, warehouse supervisor. I play Frostpunk, Kingdom Two Crowns and FTL. I like defending a place and deciding who stands where. Patient; an evening at home, phone in hand.

- URL: https://human.adamwhite.work/watch/
- Build: not visibly available in the screens I reached.
- Device: 360×690 CSS px, touch emulation, light-mode fixture, default text size. The game itself rendered a dark scene.
- Access: supplied `npm run lab:play` driver, port 43502, persistent live page. No source, bundles, hidden state, debug API or network payloads inspected. Only the two assigned instruction files and this session's generated diary/screenshots were read for the test.
- Limits: floor 0, ceiling 25 real minutes. First actionable title screen at elapsed 0.45 s. Formal stop at 424.25 s (7:04); final failed retry at 417.74 s (6:58). Stop reason TOOL. This is not a voluntary quit or a completed game.
- Session wall clock: 2026-10-20, 19:51:52–19:58:56 UTC through formal stop. Game clock: before first night through second night, before dawn. The first post-stop screenshot had reached second dawn.
- Speed: Watch by default, 4 game min/s at night. Automatic slowdown appeared during first-night trouble. I selected the visible Fast control at 390.27 s, 12 game min/s, because the quiet stretch felt settled. I used real waits through the documented driver op. Time advanced during play; no frozen-time limitation was established.
- No run sent, telemetry submitted, consent changed or export downloaded. Driver PID 60025 was killed by its exact PID after the required desktop look.

## First minute

The driver took `first-minute.png` automatically at 60.06 s. My written checkpoint was logged at 68.74 s, 8.74 s late. This is a protocol deviation. No later attack or bell result is used to improve these first-minute statuses. The first attack notice arrived after the checkpoint.

Original checkpoint wording:

> I am guarding six people and their grain until thaw. The gate tracks made the gate urgent; I left Tamar there and sent Kian east. Watcher cards, wall posts, lantern buttons, the bell and speed buttons look usable. Kian then east worked; the east request showed separately from where he stood. Begin the watch started night. I can carry the lantern and ask people what they see. The mill button showed on its way. No unavailable action yet. First placement choice was there at about 5 seconds; I selected Kian at 11 and the east post at 14. I have learned posting, starting, asking an account and carrying the light; I have not met an attack or used the bell. The state stays visible, though the lower watcher cards needed a scroll or a harness tap.

| Item                       | Status                                  | Evidence available by 60 s                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 A reason to act       | PASS                                    | I am keeping six people and the grain alive until thaw. Opening: “Bring every soul and the granary to the thaw.” Scout tracks give me a reason to guard the gate now.                                                                                                                                                                                                            |
| DL-2 What can I touch      | PASS, with a phone visibility limit     | I named watcher cards, wall posts, lantern buttons and the start control before using them. Kian then a drawn east post worked. I also reached Tamar by tapping her figure. No apparently interactive decoration proved inert. The lower roster was below the phone fold; the harness's named Kian tap does not establish that his full card was on screen.                      |
| DL-3 Urgency and selection | PASS                                    | Gate tracks drew me first. Kian's requested east post and current gate position were separately labelled. Selected lantern post had a bright outline; movement said “The lantern is on its way.” Screenshot `first-minute.png` shows Mill wall selected.                                                                                                                         |
| DL-4 Why the limit         | NOT TESTED                              | No unavailable action encountered before 60 s. Later disabled actions do not change this row.                                                                                                                                                                                                                                                                                    |
| DL-5 Readable situation    | PASS                                    | I can carry the lantern, ask for a watcher's account, or ring the bell. I knew a watch was underway. “Only the lantern’s stretch shows what approaches. Your voice reaches the next stretch.”                                                                                                                                                                                    |
| DL-6 A choice soon         | PASS                                    | First posting choice available at 4.68 s, on entering dusk. First selection input: Kian at 11.34 s. First consequential placement: east post at 14.28 s. The initial start button was used at 4.68 s. No long mandatory story sequence preceded posting.                                                                                                                         |
| DL-7 Learn by doing        | PASS for four interaction types reached | Posting taught requested post versus current location. Begin the watch changed dusk to nightfall. Tapping Tamar gave an account. Carrying the lantern showed a travel state, then arrival. No help was opened before 60 s. Bell and attack response: NOT TESTED at the checkpoint (two unreached interaction types identified then); later interactions are reported separately. |

Screenshots: `01-opening.png`, `02-first-posting.png`, `03-first-night.png`, `first-minute.png` in `watch-free2-shots/`. These are actual images, not a text-only visual assessment.

## Moments, engagement and leaving

Best moment: 281–301 s, second night. I called Yunus to relieve Kian. The game first said “waiting for an answer,” then “Yunus has the east wall; Kian has gone down.” I got a tired watcher off duty without leaving his post empty. Joss drove off a wolf while I handled that. This felt like running a watch, with people carrying out their own work.

Earlier high point: 72–75 s. I rang the bell at gate movement. Tamar answered “Holding!” and drove off a wolf. The call and answer made the wall feel occupied.

Worst playable moment: around 123 s. “Something at the foot of the gate” was followed by “Grain is gone: something got over the gate.” I had been reading the bell help and planning to walk east. I could not tell what intervention would have stopped that crossing. I do not know whether it was avoidable. The heading still said grain was plentiful, so I inferred a theft of some grain rather than an empty granary.

Worst access moment: 414.71 and 417.74 s. Two attempts to use Rest failed while the driver still listed it as an enabled control. This ended the session under the supplied stop rule; it is not evidence that the game itself lacks a working Rest action.

No `want_quit` occurred. The first wish to leave did not arise, so there is no wish that passed or persisted. At 390 s I wanted the quiet part to pass faster, not to abandon the watch. I would return voluntarily. I would close the game between sessions rather than leave it running; resume behavior was not tested.

| Elapsed  | Engagement | Original pulse                                                                                                                                        |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 179.65 s | 4/5        | The light and calling range make the wall feel like a place. I want to sort out relief before Kian gets worn out.                                     |
| 358.33 s | 3/5        | The relief was good, but now I am moving the light after brief notices and hearing nothing close. I want a clearer sense of whether my patrol helped. |

Hard, but kept going: NOT OBSERVED in the specific sense of seeking an easier setting or accessibility aid. I kept playing after losing grain and learning the limits of calling range. Fast was for a quiet stretch, not an easier difficulty setting.

## Clarity findings

- **DL-4: unexplained unavailable mill post.** At 235.78–242.95 s, Kian's posting screen listed “Mill wall · tracks” disabled. I did not see a reason or remedy. I guessed that Joss and Yunus already filled it. That is an inference, not an established capacity rule. Screenshot `08-disabled-mill.png` and the corresponding transcript show the disabled control.
- **DL-10 / DL-13: relief wording did not match my expected next input.** At 273.12 s, the choice said “relief takes over before you ask Kian to sleep.” I expected to press Rest afterward. By 294.58 s, Yunus had taken the post and Kian had gone home without a second ask. The actual handoff was clearly acknowledged and useful; the anticipatory sentence created the wrong expectation. Transcript entries at those times are the evidence. This is a wording finding, not a complaint about the automatic handoff.
- **DL-14: I met the bell's cost after using it.** The normal view showed rope condition and hearing range. Only after ringing did I open “Watchers and bell” and learn “Every pull wears the rope; a snapped rope leaves it silent.” The explanation was available behind a labelled control; I had not read it before committing. `03-first-night.png` and `04-bell-answer.png` show the normal control and the resulting frayed rope. I also initially treated it as an alarm; the expanded help explained it as calling back watchers. That misunderstanding is mine, not proof of an objectively misleading bell drawing.
- **DL-22: roster and relief choices required scrolling on phone.** The full Kian card and later roster/lantern choices were below the fold at dusk (`02-first-posting.png`, `09-roster-bottom.png`). During second-night relief I scrolled to reach Yunus's choice (`10-relief-list.png`, 278 s). The state strip stayed readable. A named harness tap can reach an offscreen control, so its success alone does not prove thumb access without scrolling.
- **DL-9 / DL-13, unresolved observation:** “Movement in the dark by the east wall” at 335.18 s disappeared as I moved the light there. At 349.70 s, Yunus said “Nothing close that I can make out.” I could not trace that particular notice to a result during live play. The post-stop dawn report said Yunus drove off a wolf, but I cannot establish that it was the same movement. This is a missing connection in my experience, not proof that no connection exists.

Positive limits: at 155 s, “Out of call: Tamar, Mara — carry the light” explained both the obstruction and remedy. Moving the light to the mill made Tamar available. Rest warned that it would leave the east wall empty. While a relief call was pending, Rest became unavailable with “Someone is already answering your call for Kian.” Those limits were readable.

## English, dates, phone and hands on

| Item                     | Status                                                                                        | Observed result                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-20 English            | PASS for encountered play                                                                     | Posts, orders, hearing range, fatigue, grain and help were understandable in English. Personal names needed no translation.                                                                                                                                                                                                                                                                                                         |
| DL-21 Dates              | PASS for immediate night/day sequence; thaw deadline NOT TESTED                               | “The first night of the first winter,” dusk/night/midnight/before dawn/dawn and “On to dusk” gave a readable sequence. “Early watches; the thaw is still far off” gave approximate progress. I did not meet a counted thaw date or a deadline across months/years, or return after a break.                                                                                                                                         |
| DL-22 Response on screen | FAIL in the cases above; otherwise clear sampled night view                                   | Lantern/bell controls and core state fit in the ordinary night view. Dusk roster and the longer relief list required scrolling.                                                                                                                                                                                                                                                                                                     |
| DL-30 Cutoff/overlap     | No sentence cutoff or sheet overlap observed in sampled screenshots; full coverage NOT TESTED | I scrolled long roster, dawn and relief content. That is recorded under DL-22; I did not see a “Scroll ↓” hiding a sentence, ellipsis, or two stacked sheets. A screenshot taken after scrolling cuts content at the viewport edge; I do not treat that alone as a clipped sentence defect. No automated layout check was run.                                                                                                      |
| DL-31 State while acting | PASS for reached orders                                                                       | During Kian's relief choices I could still read first winter, time of night, grain plentiful, eight souls and Kian at the east wall. His scene position remained visible. Screenshots `05-relief-out-of-call.png` and `10-relief-list.png`. Thaw's exact deadline was not given in the state I reached.                                                                                                                             |
| DL-32 Hands on           | No forced watch-only gap established                                                          | I chose waits of up to 25 real seconds. I could move the light, inspect a watcher or use the bell. From about 310–390 s I wanted a meaningful patrol result and mostly watched or asked for accounts, but I was not locked out of acts. I eventually chose Fast. This does not prove a gap with no meaningful act available; builder timing check NOT TESTED.                                                                       |
| DL-33 Scene acts         | Mixed                                                                                         | I carried the lantern by tapping a drawn post and spoke to people by tapping their figures. Dusk posting required selecting a person, then a post; optional Ask/Urge/Insist controls existed. Rest required opening a person's account, then Rest. Relief used a list of people with consequences, then a named send button. The relief decision felt justified as planning; it did take me away from directly working on the wall. |

DL-12: first dawn clearly stopped the clock and offered talks followed by “On to dusk”; the game had not ended. DL-15: offered speeds were clear; automatic first-night slowdown was visible. A consequential choice from Fast was not established before the access failure, so that specific test is NOT TESTED. DL-27 resume, DL-28 sending and DL-29 replay: NOT TESTED. Sending was prohibited. Other unreached interactions and builder-only checks remain NOT TESTED.

## Stop and desktop look

Formal reason: **TOOL**. At 414.71 s the named Rest tap returned `No actionable button named Rest`. At 417.74 s the required retry by latest visible text returned `No visible clickable text: Rest`. Both replies still listed Rest, without a disabled marker, under Yunus's account. I stopped input play immediately after the retry and logged the stop at 424.25 s.

Important uncertainty: the first post-stop screenshot at 424.62 s showed second dawn. A transition may have left the driver's supplied control list stale. I cannot tell whether Rest was actually visible at either failed tap, or whether a touch at another time would work. I did not diagnose or repair the driver. The stop follows the supplied driver rule, not a finding that the game's rest action is broken.

The post-stop phone screen had eight souls and grain still plentiful. Its report said wolves crossed the mill wall, Joss was scratched, and Yunus drove off a wolf at the east wall. It also quoted Kian as having dozed “at the Gate” despite my earlier relief confirmation placing him off duty from the east; I only encountered this after stopping and did not investigate it. Treat it as a transcript discrepancy for reproduction, not an explanation of the simulation.

After stopping, I took exactly the requested 1280×800 look, without further play. `13-desktop-after-stop.png`: state strip remains readable, the scene is on the left and morning talks on the right. The lower report continues below the viewport. This single dawn view does not establish desktop playability across other screens. `12-stop-phone.png` shows the post-stop phone dawn, not the failed Rest view.

## Up to three changes I want as Sam

1. Tell me why a post is unavailable beside the disabled post button. I should not have to guess whether it is full.
2. Make a live movement notice traceable to what happened after I went there. I want to know what my patrol found or missed.
3. Let me see the relief candidates and their immediate costs with less phone scrolling. Keep the useful state strip.

## Verbatim diary

The reactions below are copied directly from this session's wall-clock log. They have not been rewritten after learning a rule. Times are real elapsed seconds; game time is reproduced separately. Input arguments and driver errors are retained. Important visible answers are quoted above and in the answer list after this diary. Original log: `watch-free2-shots/wall-clock.jsonl`. No playtest export was downloaded.

### 00:00.45 — input / open {}

> I want to see who I have and where the weak point is.

### 00:04.46 — input / shot {"file": "01-opening.png"}

> Go up to the wall is the clear start. About keeping watch looks expandable.

### 00:04.68 — input / tap {"name": "Go up to the wall", "role": "button"}

Game clock: Before the first night

> Keep everyone and the grain alive until thaw. Let me place the watch.

### 00:08.09 — input / shot {"file": "02-first-posting.png"}

Game clock: First winter, first night, dusk

> Tracks at the gate: I want Tamar there and Mara watching the far side. I can see watcher buttons, post buttons and lantern buttons.

### 00:11.34 — input / tap {"name": "Kian Fast, eager Gate, asked · in the village you don’t know them yet", "role": "button"}

Game clock: First night, dusk

> Two at the gate leaves the east empty. I will move the fast one.

### 00:14.28 — input / tap {"x": 314, "y": 293}

Game clock: First night, dusk

> I am asking Kian to cover the east, using the post drawn on the wall.

### 00:17.18 — input / tap {"name": "Begin the watch", "role": "button"}

Game clock: First night, dusk

> The request says east while he is still at the gate. Good, I can tell the order from his position. Lantern stays by the tracks.

### 00:29.57 — input / wait {"s": 10}

Game clock: First night, nightfall

> I will hold at the gate for a moment. Only my lit stretch is visible.

### 00:33.02 — input / shot {"file": "03-first-night.png"}

Game clock: First night

> I am looking for movement before I ring anything.

### 00:36.68 — input / tap {"x": 114, "y": 351}

Game clock: First night, nightfall

> Tamar is in the light. I want her account of the gate.

### 00:44.64 — input / tap {"name": "Back to the wall", "role": "button"}

Game clock: First night, nightfall

> She has seen nothing yet. I will check the empty mill stretch myself.

### 00:44.90 — input / tap {"name": "Mill wall", "role": "button"}

Game clock: First night, nightfall

> Carrying the lantern along the wall feels like my job.

### 01:00.06 — first_minute / shot {"file": "first-minute.png"}

No reaction recorded.

### 01:01.65 — input / wait {"s": 14}

Game clock: First night, nightfall

> Waiting for my lantern to reach the mill.

### 01:08.74 — first_minute / log

Game clock: First winter, first night, Night

> I am guarding six people and their grain until thaw. The gate tracks made the gate urgent; I left Tamar there and sent Kian east. Watcher cards, wall posts, lantern buttons, the bell and speed buttons look usable. Kian then east worked; the east request showed separately from where he stood. Begin the watch started night. I can carry the lantern and ask people what they see. The mill button showed on its way. No unavailable action yet. First placement choice was there at about 5 seconds; I selected Kian at 11 and the east post at 14. I have learned posting, starting, asking an account and carrying the light; I have not met an attack or used the bell. The state stays visible, though the lower watcher cards needed a scroll or a harness tap.

### 01:08.98 — input / tap {"name": "Gate", "role": "button"}

Game clock: First night, Night

> Nothing at the mill. Back to the tracks before something gets through.

### 01:12.14 — input / tap {"name": "Ring the bell", "role": "button"}

Game clock: First night, Night; automatic Slow

> Movement at the gate. Ring now, Tamar should hear it clearly.

### 01:15.48 — input / shot {"file": "04-bell-answer.png"}

Game clock: First night, Night

> Holding! That felt like an actual signal answered. The rope frayed after one ring; I did not know that cost before ringing.

### 01:18.89 — input / tap {"x": 116, "y": 351}

Game clock: First night, Night

> Good shot. I want to see whether Tamar needs help after that.

### 01:26.87 — input / tap {"name": "Back to the wall", "role": "button"}

Game clock: First night, Night

> No trouble from her. I will take the light west and check Mara.

### 01:27.12 — input / tap {"name": "West wall", "role": "button"}

Game clock: First night, Night

> Mara has the best sight, but I do not want to leave her in the dark all night.

### 01:42.36 — input / wait {"s": 15}

Game clock: First night, Night

> Giving the walk west time to finish.

### 01:49.44 — input / tap {"x": 24, "y": 350}

Game clock: First night, Midnight

> How is Mara taking the dark?

### 01:54.03 — input / tap {"name": "Back to the wall", "role": "button"}

Game clock: First night, Midnight

> All quiet west. I want to know whether I can call someone to a different stretch during the watch.

### 01:54.23 — input / tap {"text": "Watchers and bell"}

Game clock: First night, Midnight

> This looks like the place for watch instructions.

### 02:03.11 — note / log

Game clock: First night, Midnight

> The bell is a recall signal, not simply an alarm. I only found that by opening Watchers and bell after using it. I had treated Holding as an alarm answer. The cost is explained there too.

### 02:03.32 — input / tap {"text": "Watchers and bell"}

Game clock: First night, Midnight

> Keep the wall uncluttered. I will walk east to the other watcher.

### 02:03.51 — input / tap {"name": "East wall", "role": "button"}

Game clock: First night, Midnight

> Checking on Kian out on the far side.

### 02:28.70 — input / wait {"s": 25}

Game clock: First night, Midnight

> It is a quiet patrol; I am waiting to reach the east.

### 02:31.65 — input / tap {"x": 295, "y": 348}

Game clock: First night, small hours

> We lost some grain while I was reading. The heading still says plenty, so I think it was a theft, not the whole store. Kian, what are you seeing?

### 02:35.34 — input / tap {"name": "Send relief", "role": "button"}

Game clock: First night, small hours

> I want someone to cover Kian while he rests, rather than leave a gap.

### 02:39.78 — input / shot {"file": "05-relief-out-of-call.png"}

Game clock: First night, small hours

> They are out of call; carry the light. That limit makes sense. I will go to the middle to reach Tamar.

### 02:45.31 — input / tap {"x": 223, "y": 473}

Game clock: First night, small hours

> Move the lantern to the mill so I can call Tamar without closing Kian’s relief request.

### 02:55.52 — input / wait {"s": 10}

Game clock: First night, small hours

> Waiting for the light to arrive in calling range.

### 02:59.65 — pulse / log

Game clock: First night, before dawn

> The light and calling range make the wall feel like a place. I want to sort out relief before Kian gets worn out.

Engagement: 4/5.

### 02:59.94 — input / tap {"name": "Kian", "role": "button"}

Game clock: First night, before dawn

> Reopen Kian now that I am within a stretch of Tamar.

### 03:02.30 — input / tap {"name": "Send relief", "role": "button"}

Game clock: First night, before dawn

> Try relief with Tamar in reach.

### 03:07.97 — input / tap {"name": "Back to Kian", "role": "button"}

Game clock: First night, before dawn

> No, I am not emptying the gate after two intrusions. Kian can rest; I will keep the light east until dawn.

### 03:08.15 — input / tap {"name": "Rest", "role": "button"}

Game clock: First night, before dawn

> Ask Kian to go down to rest. The east will be empty; I accept that risk this close to dawn.

### 03:13.09 — input / tap {"name": "Back to the wall", "role": "button"}

Game clock: First night, before dawn

> He went home straight away. I cannot call him from here now.

### 03:13.27 — input / tap {"name": "East wall", "role": "button"}

Game clock: First night, before dawn

> Take my light to the now empty post.

### 03:33.42 — input / wait {"s": 20}

Game clock: First night, before dawn

> Watching the east until daybreak.

### 03:36.81 — input / shot {"file": "06-dawn.png"}

Game clock: First night, Dawn

> Tamar was scratched and Mara was nearly asleep. I want to speak to Tamar first. The morning warns that talks cost sleep.

### 03:39.15 — input / tap {"x": 86, "y": 506}

Game clock: First night, Dawn

> Tamar, how are you holding up?

### 03:42.04 — input / tap {"name": "Would you keep the Gate one day?", "role": "button"}

Game clock: First night, Dawn

> I need a second person I can trust on the gate. Ask Mara whether she would take it.

### 03:46.05 — input / scroll {"dy": 450, "x": 180, "y": 540}

Game clock: First night, Dawn

> Read the full morning report before going out again.

### 03:46.25 — input / shot {"file": "07-dawn-report-scrolled.png"}

Game clock: First night, Dawn

No reaction recorded.

### 03:49.97 — input / tap {"name": "On to dusk", "role": "button"}

Game clock: First night, Dawn

> All six survived. Next night I want two at the gate if the scout warns us there again.

### 03:55.53 — note / log

Game clock: Second night, Dusk

> Two new watchers! That changes things. The trouble is now by the mill. Kian repaired the rope instead of sleeping; I had expected rest to help him, but he spent his day working. I want to leave him off tonight if I can.

### 03:55.78 — input / tap {"name": "Kian Fast, eager East wall, asked · in the village heeds you tiring", "role": "button"}

Game clock: Second night, Dusk

> Can I give Kian the night off here?

### 04:02.65 — note / log

Game clock: Second night, Dusk

> The mill post is disabled here and I do not see why. I am guessing the two new people already fill it. The text does clearly say I must ask for rest at night.

### 04:02.94 — input / shot {"file": "08-disabled-mill.png"}

Game clock: Second night, Dusk

No reaction recorded.

### 04:11.98 — input / tap {"name": "Back to watchers", "role": "button"}

Game clock: Second night, Dusk

> I will rest Kian after nightfall. Joss and Yunus already cover the threatened mill.

### 04:13.09 — input / scroll {"dy": 600, "x": 185, "y": 513}

Game clock: Second night, Dusk

> Find the starting lantern position below the roster.

### 04:13.51 — input / shot {"file": "09-roster-bottom.png"}

Game clock: Second night, Dusk

No reaction recorded.

### 04:20.61 — input / tap {"name": "Mill wall", "role": "button"}

Game clock: Second night, Dusk

> Start the light where the fresh tracks are.

### 04:20.99 — input / tap {"name": "Begin the watch", "role": "button"}

Game clock: Second night, Dusk

> With two people at the mill I should be able to manage a relief this time.

### 04:24.79 — input / tap {"x": 295, "y": 350}

Game clock: Second night, Nightfall

> Arrange Kian’s relief while everyone is fresh.

### 04:33.12 — input / tap {"name": "Send relief", "role": "button"}

Game clock: Second night, Nightfall

> Send one of the mill pair across.

### 04:38.38 — input / scroll {"dy": 250, "x": 180, "y": 560}

Game clock: Second night, Nightfall

> The relief list runs below the phone screen. I want Yunus east, leaving the strong smith by the tracks.

### 04:38.63 — input / shot {"file": "10-relief-list.png"}

Game clock: Second night, Nightfall

No reaction recorded.

### 04:41.54 — input / tap {"name": "Send Yunus to relieve Kian", "role": "button"}

Game clock: Second night, Nightfall

> Yunus to the east. Joss stays with the tracks.

### 04:54.58 — input / wait {"s": 10}

Game clock: Second night, Nightfall

> Let Yunus answer before I ask Kian to leave.

### 05:01.44 — note / log

Game clock: Second night, Nightfall

> That worked: Yunus took the post and Kian went home, without my having to press Rest. The wording had made me expect a second ask, but I am glad the handoff happened. Joss drove a wolf off while I dealt with it.

### 05:01.67 — input / tap {"name": "Back to the wall", "role": "button"}

Game clock: Second night, Nightfall

> Keep an eye on Joss now.

### 05:01.88 — input / shot {"file": "11-relief-complete.png"}

Game clock: Second night, Nightfall

No reaction recorded.

### 05:05.49 — input / tap {"x": 206, "y": 335}

Game clock: Second night, Night

> Joss handled that without the bell. Check what he sees next.

### 05:10.01 — input / tap {"name": "Back to the wall", "role": "button"}

Game clock: Second night, Night

> No new sighting. I will stay with the mill and let the watch run.

### 05:35.18 — input / wait {"s": 25}

Game clock: Second night, Night

> Holding the light on the threatened stretch.

### 05:38.78 — input / tap {"name": "East wall", "role": "button"}

Game clock: Second night, Night

> Movement east: take the lantern to Yunus.

### 05:46.96 — input / wait {"s": 8}

Game clock: Second night, Night

> Let the light reach the east before I decide whether to call help.

### 05:49.70 — input / tap {"x": 295, "y": 335}

Game clock: Second night, Midnight

> The movement notice disappeared. Yunus, did you see what it was?

### 05:57.50 — input / tap {"name": "Back to the wall", "role": "button"}

Game clock: Second night, Midnight

> No account of that movement. Maybe it was nothing; I cannot tell.

### 05:58.33 — pulse / log

Game clock: Second night, Midnight

> The relief was good, but now I am moving the light after brief notices and hearing nothing close. I want a clearer sense of whether my patrol helped.

Engagement: 3/5.

### 06:24.06 — input / wait {"s": 25}

Game clock: Second night, Midnight

> Stay east for a little while in case that movement returns.

### 06:30.27 — input / tap {"name": "Fast", "role": "button"}

Game clock: Second night, small hours

> The watch is settled. Use Fast for the quiet part; I want to get to the morning rather than keep asking the same question.

### 06:45.46 — input / wait {"s": 15}

Game clock: Second night, small hours; Fast selected

> Let the quiet stretch pass at the offered faster speed.

### 06:51.13 — input / tap {"x": 295, "y": 335}

Game clock: Second night, before dawn; Fast

> Yunus is nodding off. I should not have assumed the new man was rested.

### 06:54.71 — tool / tap {"name": "Rest", "role": "button"}

Game clock: Second night, before dawn; Fast

> Get him home before he falls. Dawn is nearly here.

Driver error: `No actionable button named Rest`

### 06:57.74 — tool / tap {"text": "Rest"}

Game clock: Second night, before dawn; Fast

> The Rest tap did not go through. Try the visible Rest text once.

Driver error: `No visible clickable text: Rest`

### 07:04.25 — stop / log

Game clock: Second night, before dawn; Fast

> I have to stop because the driver cannot use Yunus’s Rest control. It lists Rest as an enabled button, but the named tap says No actionable button named Rest and the retry by visible text says No visible clickable text: Rest. I wanted to send him home after he nodded off. I had not wanted to quit the game. I would return to finish this watch.

Reason: TOOL.

### 07:04.62 — input / shot {"file": "12-stop-phone.png"}

Game clock: Second night, before dawn; stopped for TOOL

No reaction recorded.

### 07:12.77 — input / resize {"width": 1280, "height": 800}

Game clock: Second night, Dawn

> Post-stop desktop look only; no more play.

### 07:13.14 — input / shot {"file": "13-desktop-after-stop.png"}

Game clock: Second night, Dawn; post-stop

No reaction recorded.

## Important visible answers by elapsed time

- 0.45 s: “Bring every soul and the granary to the thaw.”
- 4.68 s: “The scout found pack tracks on the gate road.” “Tap a watcher, then a post.”
- 14.28 s: Kian: “East wall, asked · on the Gate.”
- 44.90 s: “The lantern is on its way.”
- 68.98 s: “Movement in the dark on the gate road.” “Slow · the night slows · 1 min/s.”
- 72.14 s: “The bell rings out from the Gate; the east wall hears it faintly. ‘Holding!’ Tamar calls back.” Bell swinging disabled; rope fraying.
- 75.48 s: “Tamar drove a wolf off the gate road.”
- 114.23 s: “Every pull wears the rope; a snapped rope leaves it silent.”
- 123.32 s: “Something at the foot of the gate.”
- 123.51 s: “Grain is gone: something got over the gate.”
- 151.65 s: Kian: “Keeper’s read: seemed tiring at the last look.” Rest: “likely; leaves the east wall empty.”
- 155.34 s: “Out of call: Tamar, Mara — carry the light.”
- 182.31 s: Tamar relief available: “leaves the Gate empty; relief takes over before you ask Kian to sleep.”
- 188.15 s: “Kian calls: ‘I’m going home to sleep.’” “not posted · gone home.”
- 213.43 s: Clock stopped; first dawn. “The wall was crossed.”
- 219.15 s: Tamar: “Fit to stand tonight.” “Daylight enough for one more talk.”
- 222.04 s: Mara: “Me? I’d try. Someone has to.” “No more talks this morning.”
- 229.97 s: Eight souls. Tracks along mill race. “Kian spent 4 hours on the bell rope and never lay down.” Joss and Yunus arrived.
- 235.78 s: “Mill wall · tracks” disabled; no reason shown in supplied visible text.
- 273.12 s: Yunus relief: “leaves Joss at the mill wall; relief takes over before you ask Kian to sleep.”
- 281.54 s: “Yunus has been called to the east wall; waiting for an answer.” Rest disabled because “Someone is already answering your call for Kian.”
- 294.58 s: “Yunus has the east wall; Kian has gone down.” “Joss drove a wolf off the mill wall.”
- 335.18 s: “Movement in the dark by the east wall.”
- 349.70 s: Yunus: “I’m keeping watch. Nothing close that I can make out.”
- 390.27 s: “Fast · 12 min/s.”
- 405.46 s: Control transcript list: “Yunus nods off at the east wall.” This line was not in that same reply's plain visible-text string; I reacted to the supplied player-facing control transcript.
- 411.20 s: Yunus: “I’m praying quietly. Nothing close.” “Keeper’s read: seemed tiring at the last look.” Rest listed as enabled.
- 414.71 / 417.74 s: Rest driver failures, reproduced verbatim in diary.
- 424.62 s, after stop: second dawn, eight souls, grain plentiful. “Nobody held the mill wall to the end. Wolves got over the mill wall during the raid.” “Yunus drove off a wolf at the east wall.” Kian: “I’ll own it: I dozed at the Gate, more than once.”
