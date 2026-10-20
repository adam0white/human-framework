Screenshots stayed in the driver's scratch folder and are not kept.

# The Stairwell — source-unread playtest

Persona: Hamid, 31, delivery rider; plays Stardew Valley and Unpacking. Phone between deliveries. Live URL: https://stairwell.adamwhite.work. Headless Chromium through a persistent local Playwright server. 360×690 CSS px, touch emulation, light mode. Budget: 8 real minutes maximum. No source, repository, hidden state, telemetry submission or consent changes. Build: not visibly shown on opening.

## Verbatim diary

- 00:00 (2026-10-20 10:19:31.096 UTC), opening: “Seven flats through Saturday. I can do a little building routine. Sunday is when they decide whether I get tea money.” Visible: ‘Begin on Monday’, ‘More about the job’, ‘Game menu’. These look tappable; I plan to begin. [01-first-screen.png]
- 00:11, tapped Begin on Monday. Visible Mon 07:00, ‘0.3 min/s · First bread run’, a tiny building, red ‘Nermin a loaf and the paper / from the bakery, by 07:57’. “Bread first. I want to go to the bakery, but the building is tiny. I can see All orders.” [02-begin-monday.png]
- 00:17, tapped All orders. Seven named orders and English clock deadlines appeared. “Good, I can collect all their bread together. Nermin is first.” [03-orders.png]
- 00:25, tapped Nermin’s order. Visible answer: ‘On your way to the bakery.’ “Oh, the order itself sends me there. That is handy. I had expected it just to show the order.” No help opened. [04-nermin-order.png]

## First minute

Recorded at 01:02.235 (2026-10-20 10:20:33.331 UTC), 2.235 s late because of tool turnaround. No inputs taken during the checkpoint. Original answers follow; later learning does not change them. Evidence: 01–06 screenshots.

| Item | Status | Original checkpoint answer |
|---|---|---|
| DL-1 A reason to act | PASS | I need to get the residents their bread before their morning deadlines, starting with Nermin at 07:57. The opening says keep seven flats supplied and Sunday decides my tea money. |
| DL-2 What can I touch | PASS | Begin, More about the job, Game menu, speed buttons, Residents, All orders and the outlined order cards look tappable. I tried Begin, All orders and Nermin’s order; each answered. I have not tried the tiny building. No inert target met. |
| DL-3 Urgency and selection | PASS | The red Nermin card draws me first and says 07:57. The order list put her first. The single-arrow speed has a strong border. Nermin is the current order; I am guessing the red means urgent as well. The building competes much less. |
| DL-4 Why the limit | NOT TESTED | No unavailable action encountered. During walking the footer said ‘On your way to the bakery.’ I did not try to interrupt it. |
| DL-5 Readable situation | PASS | I am at the bakery with Nermin’s loaf and paper ready: the card now says ‘to flat 1’. I can choose ‘To flat 1 7 min’ or ‘To flat 2 8 min’. |
| DL-6 A choice soon | PASS | Opening Begin input at 00:11.381. Gameplay choices were visible by that same screen: All orders, the gate action and the map. First consequential gameplay input was Nermin’s order at 00:25.313. A choice was available within 30 s without a forced long text screen; I read the short opening and skimmed the job text. |
| DL-7 Learn by doing | PASS, limited to reached interaction | One order-navigation interaction reached. Tapping Nermin’s order sent me to the bakery; arrival changed her card from ‘from the bakery’ to ‘to flat 1’. I learned how to start an errand by doing it. No help used. Delivery, residents, gate and paper swap remain NOT TESTED (four interaction types visible but unreached). |

## Verbatim diary, continued

- 00:55, waited at normal speed. Visible ‘At the bakery’, Nermin’s card now ‘to flat 1’, two destination buttons. “It picked up the bread for me. I have time, but I want to get Nermin’s done first.” [05-near-first-minute.png]
- 01:02, checkpoint, no input. “Why would I swap their papers? I am leaving that alone. Flat 1 is what I came for.” [06-first-minute.png]
- 01:33.678, tapped ‘To flat 1 7 min’. Visible answer ‘On your way to flat 1.’ “Seven minutes is fine against 07:57. The button told me the travel cost before I went.” [07-to-flat-one.png]
- 02:03.309, observed arrival. Order count fell from seven to six; Nermin said ‘Good boy. Rıza was never this quick. (₺5)’. A Nermin conversation sheet opened. “That feels nice. I did an ordinary delivery and she noticed. I already have Hüseyin’s bread too, so the bakery collected everybody’s.” The last sentence is my inference from his card changing to ‘to flat 4’. [08-flat-one-arrival.png]
- 02:09.969, tapped ‘Anything new?’ Nermin: ‘Sevim is tight with money.’ ‘A new line in the notebook.’ Button became unavailable with ‘Already asked · ask tomorrow’. “A little gossip with the delivery. I would do that. I should not sit down with the bread clock running.” ‘A word for me on Sunday’ says ‘too early’; I assume Sunday is when that opens, but it does not say an exact opening day. [09-nermin-news.png]
- 02:22.395, closed Nermin’s sheet. Footer offered Talk to Nermin and nearby flats 2 and 3. At 02:24.722 tapped Hüseyin’s red order instead; ‘On your way to flat 4.’ “I can go straight to the urgent person instead of choosing floors. I like that. The waiting is a bit slow for a delivery break; I want the middle speed.” [10-close-nermin.png, 11-huseyin-order.png]
- 02:32.296, selected middle speed. By 02:44.047 its outline is selected but the readout still says ‘0.3 min/s · First bread run’; 07:42 became 07:45. “The middle arrow is selected, but it still says the same speed. Maybe the first bread run is held slow. I cannot tell.” Hüseyin’s order completed and he said ‘Thank you. I’ll note it.’ Next urgent card is Tarık, 08:02. [12-middle-speed.png, 13-speed-and-arrival.png]
- 02:54.704, closed Hüseyin; 02:57.171 tapped Tarık’s order. ‘On your way to flat 7.’ “I am doing the urgent cards in order now. That is a comfortable routine, though I do not know the travel time when I tap the card itself.” [14-close-huseyin.png, 15-tarik-order.png]
- 03:15.880, Tarık thanked me: ‘Sit a minute, if you can.’ “I would like to, but Sevim is due at 08:03 and it is already 07:55. I will come back after the bread.” At 03:18.625 closed his sheet; at 03:20.993 tapped Sevim’s order. ‘On your way to flat 2.’ Nearby destination button had said 2 min. [16-tarik-arrival.png–18-sevim-order.png]
- 03:29.288, Sevim received the right order: ‘Thank you. Exactly right, for once.’ “A bit sharp, but she got what she wanted. Elif next.” At 03:32.305 closed her sheet; at 03:34.702 tapped Elif’s order. ‘On your way to flat 6.’ Saw ‘Derya came in from her night shift and went straight up’ and ‘asleep’ on the little building. “I should not wake Derya. I wonder whether her bread can be left at the door.” [19-sevim-arrival.png–21-elif-order.png]
- 03:43.005, still walking to Elif; I waited. At 03:55.037 she had received her loaf: ‘Oh! Thank you so much. (₺5)’. “That is the neighbourly bit I like. A tiny job matters to someone.” Closed sheet at 03:58.673 and tapped Burak’s order at 04:01.037. ‘On your way to flat 3.’ [22-elif-arrival.png is still in transit despite its filename; 23-elif-delivered.png–25-burak-order.png]
- 04:15.391, Burak’s delivery complete: ‘You’re a lifesaver. (₺5)’. “One left, then I can breathe.” Closed sheet at 04:18.951. At 04:21.150 tapped Derya’s order; ‘On your way to flat 5.’ “I am going to her door. I expect to decide whether to knock or leave the loaf once I get there.” This is my expectation, not a rule I know. [26-burak-delivered.png–28-derya-order.png]
- 04:30.074, bread round finished. Visible: ‘You hung Derya’s bread on the door handle.’ She stayed asleep. New card: ‘Hüseyin sweep the entrance / at the entrance, by 12:00’; speed now 6 min/s. “Yes, it left her bread quietly. That is exactly what I wanted. Oh, the clock is suddenly much faster now.” [29-derya-delivered.png]
- 04:34.975, tapped single-arrow speed to give myself reading time. Display became ‘3 min/s’, Mon 09:17. “The slow button is ten times faster after the bread. I understand the earlier label better now, but that jump caught me.” [30-slow-after-bread.png]
- Quit decision, timestamp recorded in timestamps.jsonl with this note: “The bread round is done. That is enough for this delivery break. I would come back to sit with Tarık when I have a longer gap.” No more gameplay inputs after this decision. No boredom-driven quit; slight impatience with travel began at 02:24. No missed deadline observed. The eight-minute ceiling did not end the session.

## Timing and stop

First actionable screen: 2026-10-20 10:19:31.096 UTC. Quit decision: 10:24:26.165 UTC, elapsed **04:55.069**. Last gameplay input: 04:34.975, selecting the lowest speed. Last phone screenshot: Mon 09:17, at flat 5, Derya asleep; bread delivered, new entrance-sweeping order by noon. I stopped because one bread round was a satisfying phone break, not because the budget ended. I would return voluntarily for another short routine and to sit with Tarık. I did not finish Monday or reach Sunday.

The browser stayed live while I recorded the quit note. The game clock continued during those seconds. The requested desktop look was after the session: 05:01.274, 10:24:32.370 UTC, 1280×800, opening screen after reload. It offered ‘Continue / Monday · 10:36 · flat 5’ and ‘A new notebook’. I only looked; I did not resume. This is not a save/resume validation. The centered title and both controls were readable. [31-desktop-first-screen.png](stairwell-shots/31-desktop-first-screen.png).

Real elapsed time includes reading, ordinary waiting, screenshot/tool turnaround and recording the checkpoint. The live clock continued between commands and while sheets were open. No accelerated script waits, batched gameplay decisions or hidden-state inspection. I selected the visible middle speed at 02:32.296 because travel felt slow; selected the lowest at 04:34.975 because the clock became much faster. No tool step failed. The same page stayed open throughout play.

## Best, worst, and attention

**Best:** Derya’s bread went onto her door handle while she slept. I had worried about disturbing a person coming off a night shift; the visible answer resolved that worry without making me ring. [29](stairwell-shots/29-derya-delivered.png). Nermin noticing the quick delivery and Elif’s grateful reply also made the work feel personal.

**Worst:** the speed change at the end of the bread round. The middle speed looked selected while the readout stayed at 0.3 min/s. After the last delivery it read 6 min/s. By the time I selected the slowest button, 08:48 had become 09:17; the lowest rate was now 3 min/s. I had not expected that jump. I did not miss an observed deadline and cannot say the game forced a late delivery. [12](stairwell-shots/12-middle-speed.png), [13](stairwell-shots/13-speed-and-arrival.png), [29](stairwell-shots/29-derya-delivered.png), [30](stairwell-shots/30-slow-after-bread.png).

Travel first felt slow around 02:24. I was not bored enough to leave. Tarık’s invitation made me want to stay, but Sevim’s deadline made me move on. That was a readable choice between neighbourly company and work.

## Clarity findings

The First minute table above is preserved as recorded. Later findings do not revise it. These are observations from this short run, not claims about unvisited days or game rules.

| Item | Result and evidence |
|---|---|
| DL-14 Known costs before committing | **FAIL for the order-card route shortcut.** I tapped Nermin’s order expecting order detail; it immediately sent me to the bakery. The card said ‘from the bakery, by 07:57’, with no travel duration or indication that tapping starts travel. Later Hüseyin’s card also started travel without showing a duration. In contrast, the ordinary destination buttons explicitly showed ‘To flat 1 7 min’ or ‘To flat 2 2 min’. I could not compare the route time before committing through the urgent card. [03–04, 10–11]. |
| DL-15 Time and speed | **FAIL for explaining the effective speed change.** Middle speed selected at 02:32, yet ‘0.3 min/s · First bread run’ remained. ‘First bread run’ suggested a special condition but did not tell me the middle choice would later mean 6 min/s. The abrupt increase surprised me after delivery. The current clock, current numeric rate and selected speed button were visible. Fast-speed response slowdown was NOT TESTED: I did not meet a demanding event while running fast. [12–13, 29–30]. |
| DL-4 Unavailable actions, later play | **PASS for the news action reached:** ‘Already asked · ask tomorrow’ explained the lock and release. **NOT TESTED for release itself:** I did not reach tomorrow. ‘A word for me on Sunday / too early’ left its exact availability uncertain; Sunday was my assumption from its name and the opening. No claim about the underlying rule. [09]. |
| DL-13 Feedback | **PASS for inputs reached.** Order taps said ‘On your way…’; delivery reduced the order count and produced a named reply. News returned a sentence and an unavailable-action reason. No uncertain repeat taps or duplicate outcomes encountered. Middle-speed feedback is the separate DL-15 finding. [04, 07–09, 11–13, 16, 19, 23, 26, 29]. |
| DL-12 Session boundaries | Bread round completion was readable: final delivery text and a new non-bread order appeared. Day, chapter and game endings NOT TESTED. [29]. |
| DL-2 / DL-23 scene concern | The building and labels were very small on the phone. I avoided trying to hit them and used the large order cards instead. This is a readability concern, not an observed missed tap. Scene target sizes and disambiguation NOT TESTED; no DOM measurements taken. [02, 06, 19]. |
| DL-24 sheets | The conversation sheets I used closed to the scene with one ×. Nested-sheet return and focus behavior NOT TESTED. |
| DL-26 menu | ‘Game menu’ stayed visible at the top. Its contents NOT TESTED; no send or consent control opened. |
| DL-27 resume | Continue and a location/time summary appeared on the desktop opening. Resuming, preservation and offline time NOT TESTED. [31]. |
| DL-28 / DL-29 | NOT TESTED. No telemetry sent, no consent changed, no export downloaded, no replay attempted. |

Other unvisited interactions and builder-only requirements are NOT TESTED. I did not test a paper swap, sitting, telling news, ringing Derya’s bell, the gate action, Residents, later jobs or later days. No claim about capabilities, simulation rules, replay fidelity or implementation.

## English, dates and phone layout

- **DL-20 PASS for reached play.** Bread orders, destinations, travel durations, deadlines and conversation responses were in English. ‘Hanım’, ‘Bey’ and ‘Lale Apartmanı’ did not block an action; I treated them as address/name terms. No necessary unexplained local unit met.
- **DL-21 PASS for same-morning comparisons.** I compared ‘Mon 07:00’ with ‘by 07:57’, later 07:55 with 08:03. The Wednesday water notice said ‘ten to twelve’; Sunday was identified as the residents’ vote. Comparison across months/years and after a resumed break: NOT TESTED. The desktop opening was only viewed.
- **DL-22 PASS for reached immediate responses at 360×690.** Opening action, order list, travel status, delivery feedback, conversation choices, unavailable news reason and the quiet-door response were visible without scrolling. The current urgent card remained above the conversation sheet. The log clipped older text as it grew, but I could see the immediate reply and my response controls. The tiny map remained hard to read. Keyboard-open, two-person, long-sheet and other unvisited layouts: NOT TESTED. [01–03, 06, 08–09, 19, 29–30].

## Changes I would want, ranked

1. Tell me what rate a speed button will use after the bread round, and make the end of that slow period obvious before the clock speeds up.
2. Put the travel duration and a clear go-to meaning on order cards that start the trip immediately.
3. Make the building and its labels larger on my phone, or give me a labelled way to enlarge it.

## Evidence

All 31 screenshots are in `stairwell-shots/`, named in the diary and findings. Screenshot numbers in findings refer to those numbered filenames. Wall-clock command, screenshot, note and visible-text records were appended during the session to `stairwell-shots/timestamps.jsonl`. The diary wording above was written during play and has not been rewritten after learning outcomes. No playtest export was downloaded. No visible build identifier was found on the screens visited.
