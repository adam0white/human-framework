# The Night Watch — Callum playtest

## Session

Callum, 44, night-shift security guard. I play Frostpunk, Kingdom Two Crowns and FTL. I want tense defence and people placed where they matter. I dislike squinting at small panels. This is a one-handed phone break on a night shift.

- URL: https://human.adamwhite.work/watch/
- Build: no build identifier observed. I did not open Game menu to look for one.
- Device: 360×690 CSS px, touch emulation, light colour preference, default text size. The page itself appeared dark despite the light preference. One look at 1280×800 after stopping.
- Access: one persistent Playwright Chromium page in a long-lived local Node process. Normal taps, button clicks and scrolling; screenshots and rendered page text only. No game source, bundles, network payloads or internal state inspected.
- First actionable screen: 2026-10-20 16:03:33.285 UTC (11:03:33.285 CDT). Stop decision: 16:10:01.111 UTC, **387.8 s / 6 min 27.8 s**. Last gameplay input: 369.2 s. The clock reached second dawn while I wrote the stop note. No gameplay resumed.
- Budget: 20 real minutes maximum; I quit voluntarily before the ceiling. Browser time continued while I read, took notes and used tools. I selected Fast at 168.7 s because I was waiting for dawn. I did not accelerate time by script or batch decisions. Automatic slowdowns are recorded below.
- No optional testing question. No export downloaded. No run sent, telemetry submitted or consent setting changed. The browser control process was terminated by its exact PID after the desktop look.
- Evidence: [wall-clock JSONL](a1-watch-20-shots/wall-clock.jsonl), screenshots in [a1-watch-20-shots](a1-watch-20-shots/). Screenshot 31 is named “second-dawn” but actually shows Kian’s live decision before dawn; its filename is not a claim about the screen.

## First minute

Checkpoint captured at **61.4 real seconds**, 1.4 seconds late while taking the screenshot. No further gameplay input occurred before these answers were written. Evidence: `a1-watch-20-shots/06-first-minute.png` and preceding screenshots.

| Item | Status | Original checkpoint answer |
|---|---|---|
| DL-1 A reason to act | PASS | I need to keep six people and the grain alive until the thaw. The opening says “Bring every soul and the granary to the thaw.” The scout found pack tracks at the gate, so that is where I am watching. |
| DL-2 What can I touch | PASS | The opening button, help, Game menu, watcher cards, post buttons, speed buttons, lantern positions and bell look tappable. I selected Kian and asked him to cover Mill wall. My first map tap hit empty space because the map moved when the order panel opened. I did not establish an inert control. |
| DL-3 Urgency and selection | PASS | The lit gate draws me first. Pack tracks make it the concern, but I have not seen an attacker. Gate has an outlined lantern button; Watch has an outlined speed button. Ask was outlined in Kian’s order panel. |
| DL-4 Why the limit | NOT TESTED | I have not met an unavailable action. The rope says it is sound; I have not tried it. |
| DL-5 Readable situation | PASS | The watch is underway at Night. Six souls are still here and grain is plentiful. I can move the lantern, open Watchers and bell, or ring the bell. “Only the lantern’s stretch shows what approaches. Your voice reaches the next stretch” explains the immediate limits of my view. |
| DL-6 A choice soon | PASS | The opening was actionable at 0 s. A meaningful watcher/post choice was visible by 8.9 s, after Go up to the wall at 8.8 s. I selected Kian at 15.8 s and ordered Mill wall at 23.6 s. I began the watch at 29.2 s. |
| DL-7 Learn by doing | PASS for reached interactions | Asking Kian changed his requested post to Mill wall while his card still said he was on the Gate. I read that as an order in progress. Beginning the watch changed dusk to nightfall and exposed the lantern and bell controls. No help used. Two new interactions remain NOT TESTED at this checkpoint: moving the lantern and ringing the bell. |

## Best, worst and stopping

**Best moment:** Kian climbed down to sleep while Yunus still covered Mill wall. I chose to let him go. The later choice to ring for a sleeping Yunus, with a wolf underneath him, made those placements matter. The slow decision clock let me think rather than rush.

**Worst moment:** after “A wolf has Yunus by the leg,” I tapped him and got “I’m keeping watch. The scout warned us about this stretch. I can’t make anything out yet.” I wanted to help him. I could not find a way to drive off the wolf, get another watcher over, or address his injury. I am reporting what I found, not claiming no such rule exists.

I first wanted to skip a quiet stretch at 168.7 s and selected Fast. I first felt shut out after inspecting Tamar at 160.3 s: I wanted to strengthen the gate after a breach, but found a status statement. The stronger frustration came at 369.2 s after Yunus was bitten. I stopped at 387.8 s. The screen had reached second dawn by the stop screenshot, although my stop note described the preceding Before dawn screen. That correction is preserved in the diary.

I would not return voluntarily on this shift break. I liked the assignments, fatigue decisions and moving pool of light. I wanted more to do when someone was actually in trouble. The season was still described as “Early watches; the thaw is still far off,” so I did not feel close to an ending.

## Clarity failures and uncertainties

- **DL-4 — FAIL for the grey post cue I met:** Joss’s “Mill wall · tracks” button looked unavailable, without a visible reason or a way to free it. I did not press that button, so I cannot establish that it was disabled. My failure is not knowing what its grey appearance meant. [24-joss-order.png](a1-watch-20-shots/24-joss-order.png), 245.9–254.1 s. Other limits were clear: “Too far away for your voice to reach” changed to speech after the lantern arrived; sleeping watchers’ recall choices said “won’t (I’m asleep.)”; dawn talks ended with “The day’s work calls. No more talks this morning.”
- **DL-14 — FAIL in my first bell use:** the immediate bell control said “loud at the Gate, faint at the east wall” and “The rope is sound.” One pull changed it to fraying. The wear warning was inside the collapsed “Watchers and bell” section; I found it after pulling. I had not understood that ringing spent rope. This is a discoverability observation, not a claim the warning was absent. [05-watch-start.png](a1-watch-20-shots/05-watch-start.png), [08-bell-answer.png](a1-watch-20-shots/08-bell-answer.png), [10-bell-help-scrolled.png](a1-watch-20-shots/10-bell-help-scrolled.png).
- **DL-22 — FAIL for the phone roster and morning report:** essential information and choices were distributed through a scrolling lower panel. At first dusk, Kian’s card was cut by the sticky Begin the watch row and Mara was below it. At second dusk, Today’s arrivals filled the panel before assignments. At dawn, I scrolled down to read the breach and injuries, back up to ask about them, then down again to continue. [02-first-night.png](a1-watch-20-shots/02-first-night.png), [21-second-dusk.png](a1-watch-20-shots/21-second-dusk.png), [16-dawn.png](a1-watch-20-shots/16-dawn.png), [17-dawn-report.png](a1-watch-20-shots/17-dawn-report.png). The live Kian/Yunus decisions did keep their main responses on screen.
- **DL-30 — FAIL:** in the opened bell help, the viewport ended after “Pull from anywhere. Calls back watchers who”. Scrolling revealed the rest, including rope wear. [09-watchers-help.png](a1-watch-20-shots/09-watchers-help.png), [10-bell-help-scrolled.png](a1-watch-20-shots/10-bell-help-scrolled.png). At the Yunus bell result, a long message plus two other notices covered the wall labels and watcher figures/names. The notices were readable, but the scene beneath was obscured. [34-yunus-bell-result.png](a1-watch-20-shots/34-yunus-bell-result.png). This was one scrolling panel and stacked notices, not two opened sheets. I did not see a “Scroll ↓” label.
- **DL-13 — mixed evidence:** orders changed requested-post labels; moving the lantern said “on its way”; the bell produced a specific reply; sleep decisions closed after input. Those inputs were acknowledged. However, after east-wall movement disappeared, Joss’s inspection only said “Nothing close that I can make out.” I could not tell whether it was a false alarm, a defence or a missed event while playing. [28-second-night-raid.png](a1-watch-20-shots/28-second-night-raid.png), [30-joss-night-status.png](a1-watch-20-shots/30-joss-night-status.png). I did not repeat inputs to test duplication. This does not establish a missing simulation outcome.
- **DL-16 — response uncertainty:** I found a bell response before Yunus was bitten. After the bite, his inspection did not acknowledge the injury or offer a response I recognised. I could not tell whether the Keeper could help him. [34-yunus-bell-result.png](a1-watch-20-shots/34-yunus-bell-result.png), [35-yunus-injury.png](a1-watch-20-shots/35-yunus-injury.png). I do not classify my lost grain or an unsuccessful defence as clarity failures by themselves.

## Required language, layout and hands-on checks

| Item | Result and observed evidence |
|---|---|
| DL-20 English | PASS for reached play. Orders, places, warnings, reasons and choices were understandable English. No necessary unexplained local term encountered. “Keeper” did not prevent action. |
| DL-21 Dates | PASS for relative night labels and the live decision countdown: “The second night of the first winter,” “Before dawn,” and “About 104 seconds; then they decide alone.” I answered Kian about 8 real seconds after that capture; about 96 seconds remained. I could not work out how many nights until thaw from “Early watches; the thaw is still far off,” even after opening This winter. A calendar deadline comparison across months/years and a return after a break are NOT TESTED. |
| DL-22 Phone response | FAIL for the dusk roster and dawn report, as above. PASS for reached live sleep decisions: Kian’s two choices and Yunus’s three choices fit with the village status and deadline visible. No keyboard used. |
| DL-30 Clipping/overlap | FAIL for help split at “Calls back watchers who” and notices obscuring the scene. Full quoted text was recoverable by scrolling in the help. No sentence was proven permanently inaccessible. |
| DL-31 State while acting | PASS for reached order/answer panels. With Joss selected I could read eight souls, grain plenty, second night/dusk, the mill tracks and Joss’s current West wall location. With Kian/Yunus’s live decision open I could read the person, countdown, grain and souls; the selected person remained in the scene. The seasonal progress remained only “Early watches; the thaw is still far off.” Scene visibility later failed under the result notices, recorded under DL-30. |
| DL-32 Hands-on opportunities | NOT TESTED as a universal 20-second availability claim. I did not establish any stretch with literally no available act: lantern and bell remained available. My longest recorded wish to intervene without finding the intervention I wanted was about 29 real seconds, from seeing Yunus bitten at 358.5 s to stopping at 387.8 s; I wanted to get the wolf off him or reinforce him. An earlier roughly 8-second interval, 160.3–168.7 s, was wanting to strengthen the gate after its breach. The quiet 35.5–61.4 s watch was chosen, not forced. |
| DL-33 Scene or form | Mixed. Tapping the wall moved the lantern directly in one act. Ringing the bell was one labelled action; the Yunus choice also rang and called his name in one act. Assigning a watcher opened a panel with Ask/Urge/Insist and a post list. Tapping Tamar or Yunus during the night opened inspection speech, rather than a direct way to address the danger I had in mind. I did not reach every possible interaction. |

The Fast setting was 12 game min/s in quiet stretches. It slowed to 1.6 min/s at the east alert, returned to 12, then slowed to 1 game minute per 60 real seconds for the watcher decisions. Kian’s and Yunus’s decisions both remained open during my roughly 8-second and 7-second response intervals. After the answer, the selected Fast setting returned. These observations support DL-15 for the decisions reached; they do not establish all timing cases.

Dawn said Clock stopped and offered On to dusk. That made the first night boundary clear (DL-12). I did not finish the winter or test the ending. The Game menu label was visible throughout (DL-26 discoverability only). Menu contents, saving/reload/resume (DL-27), sending (DL-28), replay/export fidelity (DL-29), unvisited interactions and all builder-only checks are NOT TESTED. No upload was attempted.

## One desktop look after stopping

At 1280×800, the scene occupied the left and dawn’s talks occupied a right column. It was easier to read than the phone. The dawn report continued below the viewport. I took no action or extra scroll. This was a look, not a second playtest. [37-desktop-after-stop.png](a1-watch-20-shots/37-desktop-after-stop.png).

## Three changes I would want, ranked

1. Let me do something useful when a wolf has a watcher: call another watcher over, help drive it off, or make the Keeper’s inability to help clear at that moment.
2. Keep the relevant report, watcher and response together on the phone. Keep notices from covering the people I am trying to check.
3. Put “each pull wears the rope” beside the bell before I first use it.

## Verbatim diary

The following table is generated from the append-only wall-clock log. Reactions retain their original wording, including mistaken expectations. Screenshots preserve visible answers; important answer text is also transcribed below the table. A screenshot filename does not describe hidden state. Elapsed time is real time, not game time.


| UTC time | Elapsed s | Input / record | Original reaction |
|---|---:|---|---|
| 16:03:33.285 | 0 | Opened live page at 360x690, touch, light mode | — |
| 16:03:36.652 | 3.4 | [01-opening.png](a1-watch-20-shots/01-opening.png) | — |
| 16:03:42.104 | 8.8 | Click Go up to the wall | The wall and people interest me. I can tap Go up to the wall, About keeping watch, or Game menu. I want to keep everyone alive through winter. |
| 16:03:42.186 | 8.9 | [02-first-night.png](a1-watch-20-shots/02-first-night.png) | — |
| 16:03:49.084 | 15.8 | Tap (106, 563) | Pack tracks are at the gate. Tamar already keeps it. Kian looks tappable; I want the spare watcher on the empty Mill wall. |
| 16:03:49.216 | 15.9 | Tap (225, 277) | — |
| 16:03:49.303 | 16 | [03-assignment.png](a1-watch-20-shots/03-assignment.png) | — |
| 16:03:56.899 | 23.6 | Click Mill wall | The scene moved down when Kian opened, so my first map tap hit empty space. I can see Ask selected and separate post buttons. I am asking, not insisting. |
| 16:03:56.986 | 23.7 | [04-kian-answer.png](a1-watch-20-shots/04-kian-answer.png) | — |
| 16:04:02.464 | 29.2 | Click Begin the watch | Kian now says Mill wall, asked, on the Gate. That reads as an order in progress. I have two people covering the likely attack and one spreading out. Let us start. |
| 16:04:02.566 | 29.3 | [05-watch-start.png](a1-watch-20-shots/05-watch-start.png) | — |
| 16:04:08.776 | 35.5 | Note | The lantern lights only the gate. The bell is tempting, but nothing is coming yet. I will hold it until there is a reason. Watch says four game minutes each second. |
| 16:04:34.667 | 61.4 | [06-first-minute.png](a1-watch-20-shots/06-first-minute.png) | — |
| 16:04:56.584 | 83.3 | First minute recorded at 61.4 s in report before further inputs | I know why I am here, what I can tap and which post is lit. I have not seen an attacker or tried the bell. No unavailable action encountered. |
| 16:05:01.167 | 87.9 | [07-wolves.png](a1-watch-20-shots/07-wolves.png) | — |
| 16:05:01.245 | 88 | Click Ring the bell | Wolves on the gate road. That is my cue. I expect the bell to wake people or drive them off; I do not know which yet. |
| 16:05:04.633 | 91.3 | [08-bell-answer.png](a1-watch-20-shots/08-bell-answer.png) | — |
| 16:05:10.960 | 97.7 | Tap (96, 484) | Tamar drove off a wolf before I rang. The bell got a Holding reply, and one pull made the sound rope fray. I did not expect that cost. I want to see who actually needs help before pulling again. |
| 16:05:11.051 | 97.8 | [09-watchers-help.png](a1-watch-20-shots/09-watchers-help.png) | — |
| 16:05:18.643 | 105.4 | Scroll 249 | Watchers and bell opens more controls in the lower panel. The explanation is cut after Calls back watchers who; I need to scroll to read it. |
| 16:05:18.733 | 105.4 | [10-bell-help-scrolled.png](a1-watch-20-shots/10-bell-help-scrolled.png) | — |
| 16:05:26.194 | 112.9 | Click East wall | Now I can read it: every pull wears the rope and calls watchers back. I should have read that first. Everyone is on the wall, so I will sweep the empty east side with the lantern. |
| 16:05:26.282 | 113 | [11-east-lantern.png](a1-watch-20-shots/11-east-lantern.png) | — |
| 16:05:51.899 | 138.6 | [12-east-arrival.png](a1-watch-20-shots/12-east-arrival.png) | I like the lantern physically crossing the wall instead of jumping. It makes the blind space feel real. |
| 16:06:02.626 | 149.3 | Click Gate | Oh, I left Tamar in the dark and something got over the gate. Grain is gone, though the status still says plenty. I am bringing the light back. I assumed the guard could hold without it; that was a guess. |
| 16:06:02.692 | 149.4 | Tap (114, 279) | Tamar is at the gate. I want to speak to him or see whether he needs help. |
| 16:06:02.782 | 149.5 | [13-tamar-orders.png](a1-watch-20-shots/13-tamar-orders.png) | — |
| 16:06:08.046 | 154.8 | Note | Too far away for your voice to reach. That makes sense if I travel with the lantern, though I had thought I was moving only a light. I will wait for it to reach the gate. |
| 16:06:08.046 | 154.8 | Original visible-text note | Tamar: Gate, asked, there now. Too far away for your voice to reach. The lantern is on its way. |
| 16:06:13.598 | 160.3 | [14-tamar-in-reach.png](a1-watch-20-shots/14-tamar-in-reach.png) | — |
| 16:06:21.891 | 168.6 | Click Back to the wall | Tamar says he is keeping watch and cannot make anything out. I can check on him, but I cannot see a way to tell him to watch harder or bring Kian over during the night. I want to help secure the gate after that loss. |
| 16:06:21.959 | 168.7 | Click Fast | The attack seems over and I am waiting for dawn. I am choosing Fast rather than stare at an empty gate. |
| 16:06:22.047 | 168.8 | [15-fast-night.png](a1-watch-20-shots/15-fast-night.png) | — |
| 16:06:38.378 | 185.1 | [16-dawn.png](a1-watch-20-shots/16-dawn.png) | — |
| 16:06:46.388 | 193.1 | Scroll 398 | Dawn says each talk costs a little sleep. I can see several questions, but I want the night report first. |
| 16:06:46.444 | 193.2 | [17-dawn-report.png](a1-watch-20-shots/17-dawn-report.png) | — |
| 16:06:56.629 | 203.3 | Note | Kian says I rang for shadows, but I had just seen Wolves on the gate road. Maybe he could not see them from Mill wall. Tamar has a scratch and Mara was nodding off. That is more interesting than the grain count. |
| 16:06:56.629 | 203.3 | Original visible-text note | Wolves got over the Gate during the raid. Tamar drove off wolves at the Gate. Kian: You rang us up for shadows. Mara: My head kept dropping at the west wall. Tamar: It is a scratch. |
| 16:06:56.721 | 203.4 | Scroll -493 | — |
| 16:06:56.806 | 203.5 | Tap (92, 506) | I am asking Tamar how he is holding up. He took the hit; I would rather lose a little sleep than ignore an injury. |
| 16:06:56.911 | 203.6 | [18-tamar-dawn-talk.png](a1-watch-20-shots/18-tamar-dawn-talk.png) | — |
| 16:07:03.455 | 210.2 | Tap (99, 637) | Tamar says Fit to stand tonight. One more talk remains. I want to hear Mara explain the nodding off before I put her anywhere important. |
| 16:07:03.543 | 210.3 | [19-mara-dawn-talk.png](a1-watch-20-shots/19-mara-dawn-talk.png) | — |
| 16:07:11.454 | 218.2 | Scroll 494 | Mara says she jumped at owls. The day work now ends talks. I can read the reason, though two talks felt like a very short morning. |
| 16:07:11.544 | 218.3 | [20-on-to-dusk.png](a1-watch-20-shots/20-on-to-dusk.png) | — |
| 16:07:11.621 | 218.3 | Click On to dusk | I will do another watch. This time I want Kian at the gate with Tamar and I will keep the lantern there. |
| 16:07:16.142 | 222.9 | [21-second-dusk.png](a1-watch-20-shots/21-second-dusk.png) | — |
| 16:07:24.420 | 231.1 | Tap (68, 382) | Two new watchers arrived, and tonight the tracks are at Mill wall. So I will keep Kian there after all. I want to know how long until thaw before I settle into more nights. |
| 16:07:24.495 | 231.2 | [22-this-winter.png](a1-watch-20-shots/22-this-winter.png) | — |
| 16:07:31.986 | 238.7 | Tap (63, 383) | This winter explains who needs the grain, but not how many watches remain. Early watches and far off are all I know about the deadline. |
| 16:07:32.071 | 238.8 | Scroll 649 | — |
| 16:07:32.161 | 238.9 | [23-second-watch-roster.png](a1-watch-20-shots/23-second-watch-roster.png) | — |
| 16:07:39.107 | 245.8 | Tap (64, 288) | The roster needs a lot of scrolling. Joss is labelled on the scene at West wall; I will tap him there and ask him to cover the empty east side. |
| 16:07:39.193 | 245.9 | [24-joss-order.png](a1-watch-20-shots/24-joss-order.png) | — |
| 16:07:47.398 | 254.1 | Note | Mill wall with tracks is grey in Joss’s choices. I cannot tell why. The heading says pick a post to read him, but I do not see the reading yet. I still want east coverage. |
| 16:07:47.490 | 254.2 | Click East wall | — |
| 16:07:47.575 | 254.3 | [25-joss-east.png](a1-watch-20-shots/25-joss-east.png) | — |
| 16:07:56.886 | 263.6 | Scroll 241 | Joss now says East wall, asked, on the West wall. I will start the lantern at Mill wall where tonight’s tracks are. |
| 16:07:56.976 | 263.7 | [26-start-lantern-mill.png](a1-watch-20-shots/26-start-lantern-mill.png) | — |
| 16:07:57.071 | 263.8 | Click Mill wall | — |
| 16:07:57.155 | 263.9 | Click Begin the watch | Five watchers, all four posts covered, two at the likely attack. I feel better about this arrangement. |
| 16:08:01.626 | 268.3 | [27-second-night.png](a1-watch-20-shots/27-second-night.png) | — |
| 16:08:20.042 | 286.8 | [28-second-night-raid.png](a1-watch-20-shots/28-second-night-raid.png) | — |
| 16:08:25.902 | 292.6 | Tap (316, 331) | Movement at the east wall, despite the mill tracks. I am taking the lantern to Joss. Fast has slowed to 1.6 minutes a second, which gives me a chance to read. |
| 16:08:25.974 | 292.7 | [29-east-response.png](a1-watch-20-shots/29-east-response.png) | — |
| 16:08:34.518 | 301.2 | Note | The movement message vanished before the lantern got there. I do not know whether Joss dealt with it, it was a false alarm, or I missed it. No answer is visible now. I am staying near east long enough to check him. |
| 16:08:34.603 | 301.3 | Tap (295, 332) | — |
| 16:08:34.692 | 301.4 | [30-joss-night-status.png](a1-watch-20-shots/30-joss-night-status.png) | — |
| 16:08:41.486 | 308.2 | Click Back to the wall | Joss reports nothing close. I will return to the mill tracks and see what dawn says about that east alarm. |
| 16:08:41.569 | 308.3 | Click Mill wall | — |
| 16:08:58.925 | 325.6 | [31-second-dawn.png](a1-watch-20-shots/31-second-dawn.png) | — |
| 16:09:06.750 | 333.5 | Click Let Kian go | Kian is asleep on his feet. The game slowed right down and gives me about 104 seconds. Calling back says he will not: I am asleep. Yunus is still there, so let Kian sleep. This is a decision I care about. |
| 16:09:06.839 | 333.6 | [32-let-kian-sleep.png](a1-watch-20-shots/32-let-kian-sleep.png) | — |
| 16:09:20.825 | 347.5 | [33-mill-wolves.png](a1-watch-20-shots/33-mill-wolves.png) | — |
| 16:09:27.933 | 354.6 | Click Ring and call Yunus by name it may not hold | Now Yunus is nodding off too, with a wolf right at Mill wall. I need him awake. I am ringing and calling his name despite the frayed rope. It may not hold sounds risky, though I am not sure whether that means the rope or his attention. |
| 16:09:31.758 | 358.5 | [34-yunus-bell-result.png](a1-watch-20-shots/34-yunus-bell-result.png) | — |
| 16:09:42.467 | 369.2 | Tap (246, 341) | He woke and answered Holding, then a wolf got his leg and the store. That hurts. I want to get the wolf off him, but I only see lantern and bell. The long bell message covers most of the wall and the name labels. |
| 16:09:42.555 | 369.3 | [35-yunus-injury.png](a1-watch-20-shots/35-yunus-injury.png) | — |
| 16:10:01.111 | 387.8 | Note | I am stopping here. Yunus was just bitten, but tapping him only gives the same keeping-watch line and I cannot find a way to help or move another guard in. I like deciding who stands where and who gets to sleep. I am less keen on watching the damage happen with only the light and bell in my hands. On a shift break, I would put this down now. |
| 16:10:01.111 | 387.8 | Original visible-text note | Second night, Before dawn. Eight souls still here. Grain plenty above spring food needs. Yunus says I am keeping watch. The scout warned us about this stretch. I cannot make anything out yet. |
| 16:10:01.187 | 387.9 | [36-phone-stop.png](a1-watch-20-shots/36-phone-stop.png) | — |
| 16:10:01.246 | 388 | After stopping: viewport 1280x800 | — |
| 16:10:01.330 | 388 | [37-desktop-after-stop.png](a1-watch-20-shots/37-desktop-after-stop.png) | — |
| 16:10:11.436 | 398.2 | Note | The clock reached second dawn while I wrote my stop note; my last gameplay input was inspecting Yunus at 369.2 seconds. I did not resume. The one desktop look is easier to read: scene on the left, talks on the right. The dawn report continues below the viewport. I am still stopping. |

### Important visible answers alongside the diary

| Elapsed s | What I could read | Screenshot |
|---:|---|---|
| 8.9 | “The scout found pack tracks on the gate road.” “Tap a watcher, then a post.” | 02-first-night.png |
| 23.7 | Kian: “Mill wall, asked · on the Gate” | 04-kian-answer.png |
| 29.3 | “Only the lantern’s stretch shows what approaches. Your voice reaches the next stretch.” | 05-watch-start.png |
| 61.4 | “The first night of the first winter · Night”; grain plenty; six souls | 06-first-minute.png |
| 87.9 | “Wolves on the gate road.” “Tamar drove a wolf off the gate road.” | 07-wolves.png |
| 91.3 | “The bell rings out from the Gate; the east wall hears it faintly. ‘Holding!’ Tamar calls back.” “The rope is fraying” | 08-bell-answer.png |
| 105.4 | “Pull from anywhere. Calls back watchers who hear it, loudest at the Gate. Every pull wears the rope; a snapped rope leaves it silent.” | 10-bell-help-scrolled.png |
| 138.6 | “Something at the foot of the gate.” “Grain is gone: something got over the gate.” Status still: “Grain: plenty above spring food needs.” | 12-east-arrival.png |
| 149.5 | Tamar: “Gate, asked · there now”; “Too far away for your voice to reach.” “The lantern is on its way” | 13-tamar-orders.png |
| 160.3 | Tamar: “I’m keeping watch. The scout warned us about this stretch. I can’t make anything out yet.” | 14-tamar-in-reach.png |
| 185.1 | “Clock stopped”; “Before they sleep”; “The morning is young. Each talk costs them a little sleep.” | 16-dawn.png |
| 193.2 | “Wolves got over the Gate during the raid. Tamar drove off wolves at the Gate.” Kian: “You rang us up for shadows.” Mara: “My head kept dropping at the west wall. I pinched myself awake.” Tamar: “It’s a scratch.” | 17-dawn-report.png |
| 203.6 | “Daylight enough for one more talk.” Tamar: “Fit to stand tonight.” | 18-tamar-dawn-talk.png |
| 210.3 | “The day’s work calls. No more talks this morning.” Mara: “I jumped at every owl. Nothing came, though.” | 19-mara-dawn-talk.png |
| 222.9 | Second night; eight souls; “The scout found pack tracks along the mill race.” Today says Joss and Yunus arrived. | 21-second-dusk.png |
| 231.2 | “The granary must feed eight souls in three homes from the thaw to the harvest. Short of the mark, the spring is hungry and households leave; sacks past it are spare for the fair.” | 22-this-winter.png |
| 245.9 | Joss order panel: Ask selected; grey “Mill wall · tracks”; East wall and other posts visible. | 24-joss-order.png |
| 254.3 | Joss: “East wall, asked · on the West wall” | 25-joss-east.png |
| 286.8 | “Fast · 1.6 min/s”; “Movement in the dark by the east wall.” | 28-second-night-raid.png |
| 301.4 | Joss: “I’m keeping watch. Nothing close that I can make out.” | 30-joss-night-status.png |
| 325.6 | “Slow · watcher decision · 1 min / 60 s”; “Kian is climbing down from the mill wall, going home.” “About 104 seconds; then they decide alone.” “Call him back to the wall” says “won’t (I’m asleep.)” | 31-second-dawn.png (before dawn, despite filename) |
| 347.5 | “Yunus nods off at the mill wall.” “A wolf at the foot of the mill wall.” “About 109 seconds; then they decide alone.” Choices: Let Yunus go; Urge Yunus to hold, “won’t (I’m asleep.)”; Ring and call Yunus by name, “it may not hold”. | 33-mill-wolves.png |
| 358.5 | “The bell rings out from the Gate; the east wall hears it faintly. It wakes Yunus, nodding at the mill wall. You call Yunus by name: hold your post! ‘Holding!’ Yunus calls back.” Then “A wolf has Yunus by the leg.” “A wolf got over the mill wall and tore into the store.” | 34-yunus-bell-result.png |
| 369.3 | Yunus: “I’m keeping watch. The scout warned us about this stretch. I can’t make anything out yet.” Notice: “Mara says the west wall will have to wait. ‘I can’t keep my eyes open.’” | 35-yunus-injury.png |
| 387.9 | Second dawn, Clock stopped, eight souls, grain plenty; new morning talks. No further gameplay input. | 36-phone-stop.png |
| 388.0 | Desktop: dawn talks and the beginning of the night report on the right; large scene left. “The wall was crossed.” Lower report beyond the viewport was not scrolled into view. | 37-desktop-after-stop.png |

The original 29.2-second reaction says “two people covering the likely attack and one spreading out.” That was my confused description, not an accurate count of my new assignments: I had just sent Kian away from Gate to Mill wall. The diary is not revised to make that thought more sensible. Likewise, leaving the lantern was my suspected cause of the first breach, not an established causal rule. The first-minute checkpoint remains as written before later encounters.
