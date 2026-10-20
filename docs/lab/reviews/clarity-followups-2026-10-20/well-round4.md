Screenshots stayed in the driver's scratch folder and are not kept.

# Twice at the Well — source-unread playtest

## Assignment and result

Pedro, 29, warehouse shift lead. Plays Kingdom Two Crowns and Mini Motorways. Gives quick orders and expects to watch people carry them out. Phone held one-handed on the metro.

- Live URL: https://human.adamwhite.work/colony/
- Build: no build identifier observed.
- Access: headless Chromium through Playwright, one persistent page during play, controlled by a local HTTP server. Screenshots, rendered page text, coordinate taps and ordinary wheel scrolling only.
- Phone: 360×690 CSS px, touch emulation, light mode. No keyboard play.
- First actionable screen: 2026-10-20 10:59:20.4 UTC (05:59:20.4 CDT). Opening was paused; Play tapped at 7.9 seconds.
- Natural stop: 235.5 seconds, 11:03:15.921 UTC (06:03:15.921 CDT), Day 1, 17:50. Stop decision was written to the durable log at 253.5 seconds. No intervening gameplay input.
- Budget: eight real minutes, a ceiling. I quit after 3 minutes 55.5 seconds. The budget did not end the session.
- Two orders sent: Yusuf → House and Idris → Forest. Maryam → Forest was prepared but never sent. No storm outcome reached.
- No optional question. No telemetry submission, run upload, consent change or export download.

I understood the goals and order controls. I liked the delayed Human replies. I would leave because I could not see the workers carry out orders on this phone view. Most of the viewport contained controls and blank space; the village was a strip at the bottom.

## First minute

Checkpoint observations were taken at **66.3 real seconds**, 6.3 seconds late because of tool and observation time. Inputs stopped after the Orders tap at 44.4 seconds. The checkpoint was written at 83.0 seconds before further gameplay inputs. Screenshot: `well4-shots/10-checkpoint-60.png`.

These are the original checkpoint answers, preserved without changing their verdicts using later learning.

| Item | Original answer |
|---|---|
| DL-1 | **PASS:** I need to roof the house, stock twelve meals and keep six people alive before the storm; opening and persistent goals say that. |
| DL-2 | **PASS:** Play, speed circles, Game menu, Worker, Place, Order options, Suggestion, Use, Confirm and Orders look tappable. I tried Suggestion, Use, Confirm and Orders; no inert target found. The map is below the fold. |
| DL-3 | **PASS:** The dark Suggestion pending banner draws me first; storm deadline and roof/meal bars compete above it. Yusuf and House were visibly selected before Confirm; now the order is done and Idris is suggested. |
| DL-4 | **PASS:** Grey Confirm became available after Use selected Yusuf and House. Yusuf said not now, after I eat a meal; the order later changed to agreed then done. I could identify what would free both limits. |
| DL-5 | **PASS:** Orders shows Yusuf to House, C done and H done, and the banner proposes Idris taking cedar. I can choose another worker or follow that. |
| DL-6 | **PASS:** Worker and Place were available by 12.5s after Play at 7.9s, and the Yusuf suggestion was also visible at 12.5s. First choice-directed input was opening Suggestion at 17.7s; first order preparation at 30.5s and first sent order at 41.7s. Opening had roughly 23 instruction/story words and no required long help. |
| DL-7 | **PASS for the two interaction types reached:** prepare/send an order and inspect its status. Use filled Yusuf and House; Confirm sent; Orders showed a delayed Human response and completion versus Classic. I used the suggestion explanation, no More about the village. **NOT TESTED:** zero additional interaction types reached; worker picker, place picker and order options were still unopened. |

Checkpoint bookkeeping correction: the last sentence names **three unopened interactions**, not zero. Two types had been reached; three named types had not been tested. The original wording above is retained. The grey Confirm explanation was my inference from the instruction and the enabled state after Use, not a quoted disabled-control explanation. I did not try pressing grey Confirm.

## Verbatim diary

Reaction times below are the original elapsed labels. “Recorded” gives the actual file-write time when a reaction was written later. Wording is unchanged, including assumptions and an incorrect desktop observation corrected below.

| Reaction time | Recorded elapsed | Original words |
|---|---:|---|
| 0s | 5.0s | “I need a roof and twelve meals before a storm. Play and More about the village look tappable. I am expecting to pick a worker and send them somewhere.” |
| 13s | 17.6s | “The storm goal is clear. The suggestion says send Yusuf to the house. I will take that quick order; the dark banner gets my attention first. Confirm is grey because I have not chosen a worker and place.” |
| 31s | 35.7s | “I had to scroll to find Use. Now Yusuf to House is prepared, and it says later, after I pray Fajr. I take that to mean he will build after prayer. I still need Confirm.” |
| 44s | 50.7s | “Order given, but the Human answer is not now, after I eat a meal. Classic House has gone to 3/10 and Human is still 2/10. I want to see the workers, but all the order controls are above the village.” |
| 66s | 83.0s | “I like seeing the same order get two different answers. But done after one bit of building means I may be handing out the same job again. I still have not seen a person move.” |
| 152s | 159.3s | “I still cannot get the village into view after scrolling over the lower scene. I am looking at a big blank order area and a sliver labelled Classic. The numbers keep changing without me, so I am not sure how much my order mattered. I will use the worker list instead.” |
| 171s | 176.6s | “The picker works. Timber is short, Maryam is free until noon, so Forest seems like the ordinary safe place to send her. Cedar sounded like the bigger job. I do not know what Masjid does from its label.” |
| 177s | 182.8s | “It tells me Maryam is free and then says she will refuse because the others would go unfed. That is a useful warning, but the suggestion has just sent me toward an order she will not do. I want to know who can cover her.” |
| 188s | 196.5s | “About Maryam makes sense: she cooks at noon and is cooking now. The plain food, water and sleep words are easy to read. I would rather keep her cooking and send someone else. I am starting to feel like I am filling a form instead of watching a village.” |
| 213s | 217.8s | “Switching worker clears the place too, so that took another two taps. Idris says likely yes. I will send him to gather timber and give him a moment. I expect him to go to the Forest; I do not expect an instant pile of wood.” |
| 235.5s | 253.5s | “He says not now, after I pray Asr. That is understandable, and likely yes was only a forecast. But I have spent nearly four minutes with forms and status lines. I cannot watch the workers. I would put this away on the metro now. I would not return voluntarily on this phone layout.” |

Post-session desktop diary, recorded 11:03:40.444 UTC:

> “The first-screen overlay is centred. Behind it I can see both village maps and the worker/place lists side by side. This looks much closer to what I expected from an orders game. I did not press Play or continue on desktop.”

**Correction to that desktop diary:** screenshot 36 captured an early render. It shows two large side-by-side village panels and the worker/place lists. It does **not** show drawn maps or the opening overlay. The rendered text response included the opening instructions, but the screenshot had not caught up. My statement that I could see both maps and a centred overlay was incorrect. This single desktop look establishes the panel arrangement only. It does not establish the final desktop first-screen layout or map visibility. I did not resume play to improve that evidence.

The Fajr line in the 31s diary came from rendered page text returned by the controller. It was not legible in screenshot 06, which caught a different render moment. Treat the screenshot and text observations separately.

## Inputs and visible answers

All elapsed times use the phone session start. The game clock advanced at the offered speed during observation, report notes and controller work.

| Elapsed | Input or observation | Visible answer / evidence |
|---:|---|---|
| 0.1s | Opening | “Roof the house, store 12 meals and keep everyone alive before the storm.” Play and optional help. `01-phone-first.png`. |
| 7.9s | Tap Play | Running at 8 min/s. At 12.5s: “Slow · 1 min/s · suggestion pending”; “First light. Send Yusuf to the house?” `03-running-first.png`. |
| 17.7s | Tap Suggestion · Yusuf | Expanded explanation. Use was not in the phone viewport initially. |
| 24.5s | Wheel scroll | Use visible near y=624. “Use prepares; Confirm sends.” `05-find-suggestion-use.png`. |
| 30.5s | Tap Use | Worker Yusuf, Place House; “Yusuf → House · build the house.” Confirm enabled. `06-use-yusuf.png`. |
| 41.7s | Tap Confirm | Rendered text: “Order given: Yusuf → House.” Fields reset; Orders became 1. Immediate screenshot 07 lagged the text response. |
| 44.4s | Tap near Orders area | Rendered answer: “Human · Yusuf → House: not now · after I eat a meal”. Orders sheet visible in screenshot 09 at 50.8s. |
| 50.8s | Observe order sheet | “after I eat a meal”, then “Alright, I'll do it.” C done, H agreed. `09-first-minute.png`. |
| 66.3s | Checkpoint; no input | C done, H done. Idris cedar suggestion. `10-checkpoint-60.png`. |
| 90.1–94.3s | Close Orders; scroll attempts | Order form returned. Map remained below the useful viewport. Early wheel attempts had a controller limitation; see below. |
| 147.8–151.5s | Scroll with pointer at lower scene, then separate screenshot | Maryam suggestion: “Timber is short. Maryam is free until noon.” Controls and blank area dominated; only Classic heading at bottom. `15-village-after-scroll.png`. |
| 159.4s | Open Worker | Six named worker buttons. `17-worker-list.png` at 162.3s. |
| 166.7s | Choose Maryam | “Maryam: now pick a place.” |
| 166.8s | Open Place | House, Forest, Cedar, Field, Well, Kitchen, Masjid, Home. `20-place-list.png` at 169.5s. |
| 176.6s | Choose Forest | “Maryam → Forest · gather timber”; “Maryam: will refuse: the others would go unfed.” Same screen still says free until noon. `22-maryam-ready.png`, Day 1 11:31. Did not Confirm. |
| 182.9s | About Maryam | Cook, 68; cooks at 06:30, 12:00 and 18:00. Human person: Cooking, Could eat, Not thirsty, Tired, Well, Feels pride. Why: “Cook lunch: keep everyone fed.” `24-maryam-sheet.png` at 187.5s. |
| 196.6–196.7s | Close About; reopen Worker | Prepared Maryam/Forest remained. Suggestion no longer pending; clock at 8 min/s. |
| 205.8s | Choose Idris | Place reset to Choose. `29-idris-ready.png`. |
| 212.5–212.6s | Open Place; choose Forest | “Idris → Forest · gather timber”; “Idris: likely yes.” `32-idris-forest-order.png`. |
| 217.9s | Confirm | “Order given: Idris → Forest”; Orders 2. |
| 235.5s | Observe after real waiting; quit | “Human · Idris → Forest: not now · after I pray Asr.” `34-after-idris-wait.png`. Day 1 17:50, storm in 25 h. |

## Best, worst and desire to quit

**Best:** Yusuf's order history. I could see the request, the reason for waiting, his agreement and completion. It made the two villages feel different without making me guess whether the tap registered.

**Worst:** not being able to watch the village. At 151.5s, after a properly targeted scroll and a later screenshot, the useful scene was still below the controls. At 235.5s I could see only the top edge of the Classic map. Human was outside the viewport.

I was frustrated by 152s. At 188s I described it as filling a form. At 235.5s I wanted to leave and stopped. The food and roof totals changed during my reading, but I could not visually connect most of that activity to people. I cannot tell from this test how much was caused by my orders versus their own activity.

## Clarity findings

| ID | Status and observed evidence |
|---|---|
| DL-22 | **FAIL.** Main order controls and status replies were often on screen, but the activity context was not. Controls, blank space and the suggestion occupied nearly the whole phone view. I could not watch either village. Expanding the first suggestion also put Use below the initial viewport. See 03, 04, 05, 15, 29 and 34. This is a viewport observation, not a claim that the maps do not exist. |
| DL-19 | **FAIL for the Maryam availability cue.** “Maryam is free until noon” remained above “Maryam: will refuse: the others would go unfed” at 11:31. I read free as available for the timber job. About explained cooking, but the suggestion and forecast disagreed with that expectation. See 22 and 24. I do not know whether she became unavailable after the suggestion was first posted. |
| DL-13 | **PASS for the two orders sent.** Fields reset, Orders count changed, and a named reply/history distinguished waiting, agreement and done. No repeat submission or duplicate order was needed. Screenshots 09, 10 and 34. Some immediate screenshots lagged rendered text; that is a capture limitation, not established input-feedback delay. |
| DL-15 | **PARTLY TESTED.** The clock stated Running 8 min/s and Slow 1 min/s, suggestion pending. It automatically slowed for suggestions and later returned to 8 min/s. It advanced while About was open. I never changed speed, never tested 2×, and did not establish the full fast-speed choice test. |
| DL-4, later play | **PARTLY TESTED.** Maryam's refusal reason was explicit; About made her cooking commitment understandable. I did not establish how to free her for timber or test that the forecast updates when she is free. |
| DL-16 | **PASS for reached tasks.** Roof and timber had selectable responses. Maryam's refusal allowed me to choose another worker. This does not establish every later task. |
| DL-17 | **PASS for the Human sheet viewed.** Needs were words, including “Could eat”, “Not thirsty” and “Tired”; mood was “Feels pride”. No numeric Human mood/trust bar was seen. See 24. |
| DL-24 | **PASS for the About route reached.** One person sheet appeared; its close control returned to the prepared Maryam/Forest order. Other sheet transitions and keyboard behavior were not tested. |

The first-minute DL-1 through DL-7 verdicts remain as written above. Later findings do not retroactively change them.

## English, dates and phone layout

- **DL-20: PASS for actions used.** I could order building and timber gathering in English. “after I pray Asr” made the nature of the delay understandable without knowing the prayer's exact schedule. Masjid was an unexplained optional destination; I did not need it or try it. Its on-request explanation is **NOT TESTED**. I did not treat that unused term as a necessary-action failure.
- **DL-21: PASS for deadlines encountered.** Day 1 and “Roof before D2 19:00” gave a usable comparison. At Day 1 17:50, the roof deadline was about 25 hours away; “storm in 25 h” agreed at that precision. “Everyone lives by D3 05:00” was distinguishable from the roof deadline. No month/year boundary or return-from-break comparison was tested.
- **DL-22: FAIL**, as detailed above. Selection, refusal and Confirm were readable on screen in the collapsed form. That success did not give me the visible people and activity I needed.

**NOT TESTED:** end-of-day/end-of-game boundaries (DL-12); full cost/risk coverage (DL-14); accounting accuracy (DL-18); measured target dimensions (DL-23); 320 px, 200% text and dark theme (DL-25); Game menu behavior (DL-26); save/resume (DL-27); sending (DL-28, prohibited for this test); export/replay (DL-29). Order options and More about the village were never opened. Other checklist claims not supported by the interactions above remain untested. No builder checks were performed.

## Stop and return

Stopped on the ordinary phone order form, after Idris's “not now” answer, Day 1 17:50. No ending reached. I did not resume to reach the storm. I would not return voluntarily on this phone layout. The differences in people's replies interest me, but I want to see the people act.

## Changes I would want as Pedro

1. Let me see the workers and the selected job while giving an order on the phone. I need to watch somebody go and do it.
2. Make a suggested worker's current availability agree with the forecast, or tell me plainly that the suggestion may no longer fit.
3. Let me keep Forest selected when I switch from a worker who refuses to another worker. The extra place selection slowed a simple replacement order.

## Evidence and tooling limits

Screenshots are in `well4-shots/`. The durable wall-clock log is `well4-shots/wall-clock.log`. It records UTC timestamps, elapsed seconds, inputs, original reactions and the checkpoint as the session happened. No export was downloaded.

The browser stayed open on the same page through controller work. Initial wheel commands ran without deliberately moving the mouse to the scene. I extended my own controller to move the pointer to (180,660), then repeated the scroll and took a separate screenshot. Only the later targeted attempt supports the scene-visibility observation. I did not inspect game state or repair the game. Roughly 94–148 seconds included controller investigation, so that time is not evidence of a normal player's decision speed or boredom with waiting. The game continued during it.

Action screenshots sometimes captured the previous frame while the rendered-text response already reflected the action. Later separate screenshots supplied the visual evidence for important observations. Text was obtained from rendered page text; off-viewport text does not establish phone visibility. No bundles, requests, storage, hidden game state or debug game APIs were inspected.

After quitting, I resized and reloaded for the requested single 1280×800 first-screen look. Screenshot 35 is an unreviewed resize artifact of the old page; screenshot 36 is the single desktop first-screen look. It caught an early render. It supports side-by-side panel/list arrangement only, as corrected in the diary. Reload started a fresh paused opening; this was not a save/resume test. No desktop gameplay input followed. The browser was closed and the controller stopped by exact PID 27014.

Controller disclosure: I used Node inspector on my own server process to retain its Playwright page reference and add a pointer-movement endpoint. This was a tooling repair, not inspection of the page through a game debug interface. Browser actions continued through the long-lived local server.
