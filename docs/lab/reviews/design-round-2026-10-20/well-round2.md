Screenshots and other evidence files stayed in the driver's scratch folder and are not kept; absolute local paths were replaced by relative names or "(driver scratch)". No other wording was changed.

# Twice at the Well — Omar

Omar, 27, courier-app dispatcher. Plays Mini Motorways, Bad North and Northgard on his phone. Wants quick orders and to watch people work. One hand on a tram; low patience for controls covering the map.

URL: https://human.adamwhite.work/colony/. No build identifier noticed. Playwright Chromium in a persistent local Node process; screenshots and ordinary touch inputs only. Phone: 360×690 CSS px, touch emulation, light mode, default text size. Eight real minutes maximum from the first actionable screen. No sending, telemetry submission or consent changes.

Setup note: the first local controller exited because its port was occupied (`EADDRINUSE`, 127.0.0.1:8766). No game input occurred in that browser. I restarted my controller on a different port. The retained session's elapsed times below start at its opening screen. The JSONL includes the abandoned launch's opening record as well.

## First minute

Recorded at **74.4 real seconds**, late while writing the checkpoint. Inputs stopped after 44.7 s. These are the original checkpoint answers, recorded before continuing. Evidence: first-minute screenshot (driver scratch), with earlier screens referenced below.

| Item | Status and original checkpoint answer |
|---|---|
| DL-1 A reason to act | PASS: roof the house, store 12 meals and keep six people alive before the storm, from title. |
| DL-2 What can I touch | PASS: Play, speed controls, Worker, Place, Confirm, Watch village, Suggestion and Orders look tappable; worker selection ring and route preview worked. First Play tap left title up; second worked. |
| DL-3 Urgency and selection | PASS: green hint first, cooking bubble competes; storm is the larger urgency but I do not know its deadline. Idris selected with outline and name. |
| DL-4 Why the limit | PASS: Confirm initially grey until person and place picked. Orders says Idris after I eat a meal; Classic no grain or water. Eating should free Idris, ingredients should free Classic. |
| DL-5 Readable situation | PASS: Watching Idris: Eating and Orders explain cook a pot after eating. Can close orders and give another order. |
| DL-6 A choice soon | PASS: worker/place order available by 9.9s after Play; first meaningful worker-picker input at 15.6s, worker chosen 20.2s, place 28.0s, confirmed 32.5s. Opening title about 26 mandatory story words. |
| DL-7 Learn by doing | PASS for one order interaction reached: person plus place previews task, Confirm follows him; he can defer until eating, both villages get order. No help opened. Other task types NOT TESTED; 0 other task types reached. |

The “six people” in DL-1 came from the visible Alive 6 counter. The opening instruction itself said “everyone.” DL-4's recovery conditions are my reading of the visible wording, not verified recoveries at the checkpoint.

## Verbatim diary

The original timestamped record is wall-clock.jsonl (driver scratch). Reactions below retain their original wording. Input-only rows are retained. The checkpoint note is reproduced in the First minute section. Times are wall-clock seconds, not game minutes. The two opening records come from the abandoned controller and the retained controller respectively.

| UTC timestamp | Elapsed s | Input | Original reaction |
|---|---:|---|---|
| 2026-10-20T13:00:51.851Z | 0 | Opened live page at 360x690, touch, light mode | First screen loaded. Starting cold. |
| 2026-10-20T13:00:59.843Z | 0 | Opened live page at 360x690, touch, light mode | First screen loaded. Starting cold. |
| 2026-10-20T13:01:04.471Z | 4.6 | Observation | I need a roof and twelve meals before a storm. Play is obvious. I like that it says pick a person and place; I want to see them move. |
| 2026-10-20T13:01:04.485Z | 4.6 | Tap 69,386 |  |
| 2026-10-20T13:01:09.669Z | 9.8 | Observation | The title card is still here after my tap. I am trying Play again. |
| 2026-10-20T13:01:09.681Z | 9.8 | Tap 67,390 |  |
| 2026-10-20T13:01:15.422Z | 15.6 | Observation | The village is moving. The green hint says select a worker then About, but the cooking speech bubble catches me first. Worker and Place look like the order controls; Confirm is grey. |
| 2026-10-20T13:01:15.432Z | 15.6 | Tap 86,563 |  |
| 2026-10-20T13:01:20.028Z | 20.2 | Observation | The worker picker opens upward over the village. I will send Idris to cook. |
| 2026-10-20T13:01:20.048Z | 20.2 | Tap 65,503 |  |
| 2026-10-20T13:01:24.227Z | 24.4 | Observation | Idris is outlined and says Praying Fajr. That is clear selection. I am still choosing the kitchen, guessing he will get to it afterwards. |
| 2026-10-20T13:01:24.232Z | 24.4 | Tap 262,560 |  |
| 2026-10-20T13:01:27.786Z | 27.9 | Tap 289,453 |  |
| 2026-10-20T13:01:32.305Z | 32.5 | Observation | The dashed line previews Idris to Kitchen, and Confirm turned orange. It says cook a pot. I understand this order. |
| 2026-10-20T13:01:32.314Z | 32.5 | Tap 313,660 |  |
| 2026-10-20T13:01:37.718Z | 37.9 | Observation | It says Watching Idris: Walking to Kitchen. The order went through, but the map has disappeared right when I wanted to watch him. |
| 2026-10-20T13:01:44.486Z | 44.6 | Observation | The map came back. Now I can watch, which is what I wanted. A bubble says Not now. After I eat a meal. I cannot tell who is saying that; the bottom still says Idris is walking to Kitchen. |
| 2026-10-20T13:01:44.497Z | 44.7 | Tap 305,665 |  |
| 2026-10-20T13:01:53.534Z | 53.7 | Observation | Orders explains it: Idris will cook after he eats. Classic says no grain or water. I thought I was ordering one village, but the screen says each order goes to both villages. The C and H badges must be the two versions, I think. |
| 2026-10-20T13:02:14.195Z | 74.4 | Observation |  |
| 2026-10-20T13:02:41.714Z | 101.9 | Observation | H now says done. Good, he ate and cooked without me babysitting. There is a new gather-timber bubble. I want to send someone to the house because the roof is the real goal. |
| 2026-10-20T13:02:41.727Z | 101.9 | Tap 325,306 |  |
| 2026-10-20T13:02:53.901Z | 114.1 | Observation | Idris has moved on to Gathering timber. I like seeing people carry on by themselves. The camera followed him and put the house off the edge. I will use the place list. |
| 2026-10-20T13:02:53.911Z | 114.1 | Tap 65,666 |  |
| 2026-10-20T13:03:00.736Z | 120.9 | Observation | I will tap Maryam on the map instead of reopening the worker list. |
| 2026-10-20T13:03:00.741Z | 120.9 | Tap 205,407 |  |
| 2026-10-20T13:03:09.447Z | 129.6 | Observation | That spot has Maryam, Well and Cancel in a chooser. That makes sense; they are on top of each other. |
| 2026-10-20T13:03:09.459Z | 129.6 | Tap 50,460 |  |
| 2026-10-20T13:03:13.991Z | 134.1 | Tap 269,560 |  |
| 2026-10-20T13:03:20.625Z | 140.8 | Tap 67,408 |  |
| 2026-10-20T13:03:31.413Z | 151.6 | Observation | Maryam to House says build the house and Likely yes. I assume that means she can do it. The roof bars are nearly full already, but I do not know how much roof is left from Roof 10. |
| 2026-10-20T13:03:31.425Z | 151.6 | Tap 312,660 |  |
| 2026-10-20T13:03:40.644Z | 160.8 | Observation | Oh, Maryam refuses: And leave the pot cold at noon? No. They eat from my hands. That is better than a generic blocked button. Likely yes was only a guess. She is cooking instead of building. I can understand her reason. |
| 2026-10-20T13:03:40.658Z | 160.8 | Tap 187,665 |  |
| 2026-10-20T13:03:51.655Z | 171.8 | Observation | The suggestion is Maryam to Forest because she is free until noon, but I just saw her refuse to leave the pot. It does warn availability may have changed. I will keep watching; I do not want to argue with the cook. The expiry is clear: 11:45, in 49 minutes, and now it is 10:56. |
| 2026-10-20T13:03:51.674Z | 171.8 | Tap 178,491 |  |
| 2026-10-20T13:04:03.409Z | 183.6 | Observation | I have given two orders and I am mostly watching speech bubbles. I want to see the roof finish, so I am turning the visible speed up to 2x. |
| 2026-10-20T13:04:03.423Z | 183.6 | Tap 240,23 |  |
| 2026-10-20T13:04:28.954Z | 209.1 | Observation | It is 16:55 now. Maryam is resting, the house is still a frame, and I am looking at a mostly empty patch of village. I liked her refusal, but I am done. I came for quick dispatching and watching work; I do not feel pulled to give another order or wait for the storm. |
| 2026-10-20T13:04:34.413Z | 214.6 | After-stop desktop look at 1280x800 |  |
| 2026-10-20T13:04:57.926Z | 238.1 | Observation | Desktop makes the comparison obvious: two villages side by side, House 7/10, meals counted separately, and deadlines by D2 19:00. On the phone I only had Roof 10 and Meals 12 with short bars. I wanted this context while deciding. This is only my after-stop desktop look; I am not resuming. |

## What playing felt like

**Best moment:** Maryam refused my house order because she would not leave the meal undone. “And leave the pot cold at noon? No. They eat from my hands.” That made her feel like a person with work she cared about. 25-watch-house.png (driver scratch), 154.9 s.

**Worst moment:** the later suggestion called Maryam “free until noon” immediately after I had watched her refuse to leave the pot. The panel warned “Availability may have changed,” but I no longer trusted that suggestion enough to use it. 27-suggestion-open.png (driver scratch), 164.4 s. I did not test whether its current forecast would correct it.

I began wanting things to happen faster at 183.6 s and selected the visible 2× control. At 199.7 s I saw Maryam resting and a mostly empty patch of village. That was when I wanted to leave. I stopped at **209.1 s (3 min 29.1 s)**, voluntarily, before the eight-minute ceiling. No game ending or storm outcome was reached. I would not return voluntarily for another phone session in this form.

The first blank map capture after Confirm worried me, but the map returned by my next observation. This was a transient observation; I cannot establish a persistent blank-map defect. Likewise, the first Play tap left the title card visible; the second started play. I cannot tell whether the first was missed during loading. Later action captures often preceded the visible response; I waited for a second screenshot rather than repeating those inputs.

## Clarity findings

- **DL-22 FAIL — essential goal context was not readable on the phone without finding more information.** I saw “Roof 10” and “Meals 12” with C/H bars. I could not tell the amount of roof left or the storm deadline. The phone did keep the immediate order response visible: person, place, task and Confirm fit together without scrolling. The failure is the missing essential goal context in that view. 23-house-preview.png (driver scratch), 145.3 s; 30-faster-wait.png (driver scratch), 199.7 s. Only the after-stop desktop look made “House 7/10,” separate meal counts and “by D2 19:00” obvious. 33-desktop-look.png (driver scratch). I did not inspect other phone views for that information.
- **DL-5 FAIL for the later suggestion's readable situation.** “Maryam is free until noon” conflicted with the cooking refusal I had just seen. The stale-information warning explained uncertainty, but I could not tell why she was being suggested now. This does not change the first-minute PASS. 25-watch-house.png (driver scratch), 27-suggestion-open.png (driver scratch).
- **DL-13 uncertain on initial Play; no confirmed failure.** I tapped Play twice after seeing the title remain. There was no duplicate run or order outcome that I observed. Later orders produced a route preview, a watched worker and an Orders record.

The order controls occupy the lower map, and the place picker covers more of it. “Watch village” gives the space back. This annoyed me less once I found the watch view. It is a preference and an observed layout tradeoff, not proof of another checklist failure.

## English, dates and phone layout

| Item | Result |
|---|---|
| DL-20 | PASS for actions reached. Worker, Place, Kitchen, House, Confirm, order statuses and the refusal were understandable in English. “Praying Fajr” and “Masjid” appeared, but I did not need those terms to complete the orders I tried. Their explanations on request were NOT TESTED. |
| DL-21 | PASS for the deadline comparison reached: at D1 10:56, the suggestion said “lapses 11:45 · in 49 min.” I could compare those without translation. The desktop look also showed “Day 1 of 2,” “storm in 24 h,” and D2 deadlines. Returning after a break and month/year comparisons were NOT TESTED. The storm deadline's phone visibility is the DL-22 finding above, not a translation failure. |
| DL-22 | FAIL for essential goal context; immediate order controls and the suggestion's response buttons were on screen without scrolling. No scrolling was used. |

## Other checklist evidence and limits

| Items | Evidence or limit |
|---|---|
| DL-8 | NOT TESTED as a separate whole-session claim. The hint, bubbles and goal bars competed for my attention; I did not establish a separate priority failure. |
| DL-9 | NOT TESTED: no known mandatory response was verified. |
| DL-10 | No unresolved action-label mismatch encountered. C/H meanings were initially my inference; desktop made the comparison explicit. |
| DL-11 | Immediate decisions were short enough for me. Word-count and rendered-layout builder checks NOT TESTED. |
| DL-12 | NOT TESTED: no day or game ending reached. |
| DL-14 | NOT TESTED for a known consequential cost or risk. “Likely yes” was visibly tentative; I understood the refusal as an uncertain forecast, not a promise. |
| DL-15 | Partial evidence only: the clock visibly moved; I selected 2× to reduce waiting. The next observed running rate was 16 min/s. Earlier pending suggestions showed “Slow · 1 min/s.” The full fast-speed → live choice → read and answer test was NOT TESTED. |
| DL-16 | PASS for the tasks reached: kitchen and house orders existed; the kitchen delay and house refusal had understandable reasons. Storm preparation was unfinished, not proved impossible. |
| DL-17–18 | NOT TESTED as comprehensive checks. Desktop showed morale and trust in words. No claim about every represented quantity or feeling. |
| DL-19 | PASS for the forecast I reached: “Likely yes” sounded like a guess, and Maryam's refusal explained a different result. I did not read it as guaranteed acceptance. |
| DL-23 | PASS for the overlapping map selection reached: a tap near Maryam and the well offered Maryam, Well and Cancel. 18-maryam-selected.png (driver scratch). Hit-area dimensions NOT TESTED. |
| DL-24 | PASS for the sheets reached: Orders closed to the map; Suggestion's Keep watching returned to the watch view. Nested sheets, keyboard and focus recovery NOT TESTED. |
| DL-25 | NOT TESTED at 200% text or 320 px. No horizontal page scrolling was used or noticed at the assigned size. |
| DL-26 | Game menu was visible at the top throughout. Its contents and All games were NOT TESTED. |
| DL-27–29 | NOT TESTED. No reload/resume, send, export, replay or import. Sending was prohibited by the assignment. |
| Builder checks | All source, internal-state, replay and other builder-only checks NOT TESTED. |

## After-stop desktop look

One look at 1280×800, without resuming play: the side-by-side villages, separate counts and dated goals immediately made the comparison clearer. Classic showed Maryam building while Human showed her resting. I could finally read House 7/10 in both villages, Classic 0 meals and Human 10 meals. These are after-stop observations, not knowledge I had on the phone or at the checkpoint. The live clock continued during resizing and observation. No gameplay control was used after stopping. 33-desktop-look.png (driver scratch).

## Changes I would want, ranked

1. Let me read current roof progress, stored meals and the storm deadline on the phone as easily as on desktop.
2. Make the suggestion reflect the refusal I just watched, or say plainly that it is an old suggestion.
3. Keep more of the village visible while I choose an order. Watching the people is why I would play.

Stopped in the watch view after two orders, while following Maryam. Last actively viewed phone state: D1 16:55, Maryam resting, house still a frame. The stop screen is preserved at 31-stop-phone.png (driver scratch). No export downloaded. No run sent. No consent changed.
