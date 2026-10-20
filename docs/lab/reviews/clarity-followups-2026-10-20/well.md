Screenshots stayed in the driver's scratch folder and are not kept.

# Twice at the Well — source-unread playtest

Aiko, 36, operations planner; plays Townscaper and Against the Storm. Likes giving orders and seeing them carried out. Hates controls that move. Playing one-handed on the tram.

URL: https://human.adamwhite.work/colony/
Build: no build identifier observed.
Access: live page in headless Chromium through a persistent Playwright server. Phone: 360×690 CSS px, touch emulation, light mode. Screenshots and rendered visible text; coordinate taps only. No source, network payloads, hidden state, storage or debug APIs inspected. Only the two permitted instruction files were read. No telemetry submission or consent changes.

First actionable screen: 2026-10-20 10:29:02.149 UTC. Eight real minutes is a ceiling. Game time is separate. Native select popup did not appear in the captured browser image, so dropdown trouble is a tooling limitation unless further visible evidence establishes a game defect.

## First minute

Checkpoint captured at **64.368 real seconds**, 2026-10-20 10:30:06.517 UTC. I stopped inputs for the checkpoint. The capture was 4.4 seconds late because of tool/observation scheduling. These are the original checkpoint answers, written before continuing. Screenshot: `well-shots/10-first-minute.png`.

| Item | Status | Original checkpoint answer |
|---|---|---|
| DL-1 A reason to act | PASS | I need a roof and 12 meals before the storm, and I need six people alive. The opening says this; the roof and survival deadlines remain across the top. |
| DL-2 What can I touch | PASS | Play, speed buttons, Game menu, the villager/place dropdowns, Confirm, Order options and Suggestion look tappable. Use filled the order and Confirm sent it. I did not test map taps. The native dropdown options were not usable in my captured view; I cannot assign that to the game. No decorative item I deliberately tested proved inert. |
| DL-3 Urgency and selection | PASS | Roof 10 and the deadlines draw me first. The suggestion briefly became the strongest cue. Yusuf and House were visibly selected after Use; they cleared after Confirm. Nothing is selected now. The Human village is lower on the phone and competes poorly for my attention. |
| DL-4 Why the limit | PASS | Confirm was grey before I picked a villager and place. “Pick a villager here or on either map” and the opening instruction tell me how to enable it. Use enabled it. No other unavailable action met. Capability-based limit rules are NOT TESTED. |
| DL-5 Readable situation | PASS | I sent Yusuf to build the house. The response says “Human · Yusuf → House: agreed · Fine.” Classic House is now 4/10, Human House 2/10. I can give another order or wait. |
| DL-6 A choice soon | PASS | The order controls became available after Play at +8.8 s, observed unobstructed at +15.4 s. First input: Play at +8.8 s. First attempted order input: villager dropdown at +20.7 s. First actual order selection: Use at +45.4 s. First commitment: Confirm at +50.4 s. A meaningful order choice was available within 30 s, after the short opening card. |
| DL-7 Learn by doing | PASS | One order reached. Use meant prepare the order; Confirm meant send it to both villages. The preview said build the house and likely yes. The accepted order and changed house count taught me the loop. Help used: opening instruction and the suggestion text, including “Use fills an order. Confirm sends it.” Advanced options, inspection, refusal, and other jobs: NOT TESTED, zero reached. |

## Verbatim diary and input record

Elapsed time is measured from the first actionable screen. Quotes below preserve the reactions as recorded. Screenshots live in `well-shots/`. `timestamps.ndjson` contains wall-clock times, inputs, rendered-text observations and the original diary notes. Consecutive commands here were single observed inputs, not queued game decisions. The clock ran at the offered speed between tools unless the game auto-paused.

- **+0.0 s — first screen.** Opening card: “Roof the house, store 12 meals and keep everyone alive before the storm.” “Choose a villager and place, then Confirm.” Screenshot 01.
- **+8.7 s — reaction:** “I have a clear job: roof the house and feed six people before the storm. Play looks tappable; I can also see More about the village and Auto-pause. The order controls behind this card look cramped.”
- **+8.8 s — tap Play.** Clock began. At +15.4 s it was 05:30 and “Paused · A suggestion”: “First light. Send Yusuf to the house?” Screenshot 03. No speed change yet.
- **+20.7 s — reaction:** “It paused itself at 05:30 and suggests Yusuf to the house. I will take that order. I can see dropdowns and Confirm; the two villages seem to receive the same instruction.” Tap villager dropdown at (97,368). No option list was captured. Screenshot 04.
- **+28.7 s — tap (66,440).** Order options expanded; no villager selected. Screenshot 06 shows the downward disclosure arrow, but the contents are clipped beneath it.
- **+38.6 s — reaction:** “I tapped the villager dropdown but did not get a usable option list in this browser view. I missed Yusuf. Order options opens, but its contents seem to be under the suggestion strip. I want the suggested job, so I will open that instead.” Tap Suggestion at (109,516).
- **+41.8 s — suggestion visible.** “He is your best builder and walls are cheap now.” “lapses 06:30 · in 60 min.” “Use fills an order. Confirm sends it. You can skip or choose your own.” Screenshot 07.
- **+45.4 s — tap Use (270,366).** Yusuf and House selected. Preview: “Yusuf → House · build the house”; “Yusuf: likely yes.” Screenshot 08 shows preview/reason text colliding near the bottom of the order area.
- **+50.4 s — reaction:** “Use filled Yusuf and House. The preview says build the house and likely yes, which is enough for me. The text beneath is colliding, but Confirm is clear.” Tap Confirm (307,410). Rendered answer: “Order given: Yusuf → House.” Order count became 1 and time resumed. Screenshot 09 caught the outgoing layout during its transition; screenshot 10 shows the settled result.
- **+64.4 s — First minute checkpoint.** No inputs while writing the checkpoint above. Clock 07:21. “Human · Yusuf → House: agreed · Fine.” Classic House 4/10; Human House 2/10. Screenshot 10.
- **+94.9 s — reaction:** “First minute: I know what to do, and Yusuf agreed. Classic has started building; Human has not moved its house count yet. I like seeing an answer to the order. The bottom village is cut off and my open order options are not actually readable.” By then the game had auto-paused at 08:00: “Idris could take the big cedar: three timber at once.” Classic House 5/10, Human 2/10. Screenshot 11.
- **+103.6 s — open Suggestion (112,517).** “Fast timber, but the cedar can hurt whoever fells it.” Lapses 09:00, in 60 minutes. Screenshot 12 caught a fading transition; the quoted risk was rendered player text.
- **+110.1 s — reaction:** “Three timber at once is tempting, but it says the cedar can hurt whoever fells it. I do not want to risk a person just to hurry the roof. I will skip this suggestion. Human Yusuf saying Water first makes me wonder whether my builder ever started.” Tap × (329,360). The speech bubble was visible; I did not establish whose bubble it was. My attribution to Yusuf was a guess, not a finding.
- **+115.9 s — time moving again.** Clock 08:46; Classic House 6/10, Human 3/10. Screenshot 13. This later progress answered some of my worry that Human construction never started.
- **+121.1 s — tap lower-map person (242,632).** Maryam selected. “Maryam: now pick a place.” At +124.2 s, Human House 4/10; order response “done · Fine.” Screenshot 14.
- **+129.6 s — reaction:** “I tapped a tiny person on the lower map and got Maryam. That worked. I think the small grey circle is the well; I will try it. I cannot read the map places at this size.” Tap (245,597). Preview instead said “Maryam → Masjid · pray.” I did not Confirm.
- **+135.4 s — tap Inspect (139,410).** Maryam sheet opened. At about this time the game auto-paused at 10:45 for another suggestion: “Timber is short. Maryam is free until noon.” Behind the sheet the order preview said “Maryam: later: not prayer time.”
- **+140.8 s — reaction:** “That was the Masjid, not the well. The preview says pray, so I caught the mistake before sending it. Inspect tells me Maryam cooks by habit. I like learning who she is, but I was trying to put someone on water.” Screenshot 15: Maryam, cook, 68; cooks at 06:30, 12:00 and 18:00 by habit. Human person: Cooking; Fed; Not thirsty; Tired; Well; Feels pride. I did not scroll the sheet.
- **+152.6 s — close sheet (325,33).** Returned to the order scene and retained Maryam/Masjid selection.
- **+156.8 s — tap Clear (215,410). Reaction:** “I am clearing the accidental prayer order. Maryam is cooking already; I would rather leave her alone. I want to watch the roof for a bit, so I will use 2×.” Tap 2× (239,23). Clock remained paused for the suggestion until Resume.
- **+160.6 s — tap Resume (316,268).** At +165.6 s the 2× button had a visible selection ring. Clock 12:04/12:05; Human Meals 13 and House 5/10; Classic Meals 6 and House 7/10. Screenshot 16. I let real time pass without decisions.
- **+186.0 s — auto-paused at 14:21.** “Paused · A moment”: “Yusuf and Tariq raised the beam together.” Both houses 7/10, six alive in each village. The bottom of that sentence is clipped by the fixed order area. Screenshot 17.
- **+195.8 s — reaction:** “Yusuf and Tariq raised the beam together. That is a nicer payoff than a bar filling. But it paused for a moment that needs no decision, and the sentence is clipped by the order panel. I will try sending someone to the ordinary forest rather than the dangerous cedar.” Tap lower-map person area (256,625). Danyal inspection sheet opened instead of preparing an order. Screenshot 18: well-keeper, resting, tired, feels calm.
- **+211.6 s — stop, 2026-10-20 10:32:33.742 UTC. Reaction:** “I meant to select a worker for the forest and opened Danyal’s life sheet instead. I am leaving here. I like these people, but on the tram I am spending too much attention finding the order rather than giving it. I would not keep playing this phone layout today.” Screenshot 19 preserves the final phone screen. No further phone play.

## Best, worst, and leaving

**Best:** “Yusuf and Tariq raised the beam together.” The first agreed order and the eventual Human construction made the people feel responsive. The cedar warning also gave me a real reason to decline an order.

**Worst:** I wanted a worker on water, guessed at an unreadably small map place, and got prayer instead. Later I wanted a forest order and opened a person sheet. The preview prevented an accidental commitment, but my intended work kept turning into navigation.

Frustration first appeared at +38.6 s when expanded controls were not readable. It became a reason to leave at +195.8 s, with the unintended Danyal sheet. I quit at +211.6 s (3 min 31.6 s), well before the eight-minute ceiling. I was frustrated more than bored. No game ending reached. I would not return voluntarily on this phone layout today. The people and paired villages interest me enough to consider a larger-screen session; I did not play that session.

## Clarity findings

- **DL-22 — FAIL:** “I can see Confirm, but I cannot see all the order context together.” Screenshot 08 shows “Yusuf: likely yes” and the explanatory line colliding. Screenshots 06, 10 and 16 show expanded Order options without readable contents. Screenshots 11 and 17 show multi-line pause text clipped at the order panel. The lower village is partly below the viewport in ordinary play. This is observed at 360×690, default text size.
- **DL-8 — FAIL:** “The moment I want to read runs behind the controls.” In screenshot 17, the second line of “Yusuf and Tariq raised the beam together” is cut by the order area. The first line and rendered text made the event understandable, but the visible story cue is not fully readable.
- **DL-2 / DL-19 — later interaction difficulty:** “I could not identify the tiny places or reliably predict whether a map tap would select a worker or open their sheet.” At +129.6 s I mistook Masjid for the well. At +195.8 s I intended selection and opened inspection. These are observed identification/predictability problems on this fixture. I did not establish a missing game rule, an incorrect hit area, or a misleading well label. The Masjid preview itself was accurate and useful. The original first-minute DL-2 PASS remains unchanged above.
- **DL-15 — default-mode continuity issue:** Auto-pause was on at entry and I left it on. Suggestions stopped the clock at 05:30, 08:00 and 10:45; a narrative moment stopped it at 14:21 even after I selected 2×. I understood how to Resume. As this player I felt repeatedly interrupted when I wanted to watch my order happen. The clock and selected speed were visible. A consequential choice arriving at fast speed, its reading window, and restoration after answering it are **NOT TESTED**; the fast event I reached was a narrative moment.
- **DL-13 — PASS for the one committed order:** “Order given” appeared, Orders became 1, and “agreed” later became “done.” I did not repeat Confirm or observe duplicate orders. Some screenshots captured outgoing animation frames; I waited and observed the same page rather than interpreting those frames as refusal.
- **DL-14 — PASS for the cedar decision:** Injury risk appeared before commitment. I declined it. No injury consequence was tested.
- **DL-24 — limited PASS:** Maryam inspection opened as one full-screen sheet with ×. Closing it returned to the selected order. I did not test a sheet opening another task or focus restoration.
- **DL-23 — NOT TESTED for exact hit-area compliance:** Map drawings and place labels were too small for me to identify comfortably, but screenshot size does not prove their hit areas are below 44×44. No CSS or DOM geometry inspected. The labelled dropdown alternative existed; its native popup was a headless tooling limitation in this session.

## English, dates, and phone

- **DL-20 — PASS for interactions reached.** I could act in English. “Masjid” was paired with “pray” in the selected-order preview on my first use. I did not need to translate it to avoid the accidental order. Its meaning on request was not separately tested. Other names and the title “Hajja” did not block an action.
- **DL-21 — PASS for first-play deadline comparison; return-from-break NOT TESTED.** The opening established Day 1. At the first-minute screen the clock was 07:21; roof was due D2 19:00 and survival D3 05:00. I read these as tomorrow evening and the following morning. The suggestion at 05:30 explicitly said “lapses 06:30 · in 60 min,” so I could compare its deadline immediately. The phone clock’s secondary day label was truncated, and the phone goals did not show a separate meal deadline. I did not encounter an absolute calendar date or take a break and return.
- **DL-22 — FAIL**, as detailed above. The immediate Confirm response fit, but essential preview/reason text and expanded options did not remain readable together. The inspection sheet itself was readable at the top and could plausibly scroll; I did not test its lower content.

## Required desktop first-screen look

After stopping phone play, I set the viewport to **1280×800 CSS px** and navigated to the same live URL. I took one first-screen look and did not press Play. Screenshot: `well-shots/20-desktop-first-screen.png`, captured 2026-10-20 10:32:42.486 UTC. It showed the opening card at Day 1 05:00. Both villages fit side by side, with a middle order column. The goal strip included “Storm stock · by D2 19:00,” which I had not seen as a separately labelled deadline on the phone. Place names on the larger maps were identifiable. The opening card covered the central controls, so this look cannot establish desktop order behavior or absence of later overlap.

## Changes I would want as Aiko

1. Keep the selected order, its reason and its options readable together on the phone. Keep pause sentences above the order panel.
2. Give me an easy, labelled way to select the worker and destination without aiming at tiny moving map figures. I want to know whether a tap will select or inspect.
3. Let ordinary moments acknowledge themselves without repeatedly stopping the clock. I want time to watch people carry out the order.

No export downloaded. No run sent. Save/resume, game ending, replay, consent, uploads, 200% text, 320 px width, dark theme, and capability-limit implementation checks were not tested. The post-session navigation showed a fresh opening screen; I did not treat that as a save/resume test.
