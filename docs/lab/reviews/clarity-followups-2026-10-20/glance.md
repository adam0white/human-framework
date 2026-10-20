Screenshots stayed in the driver's scratch folder and are not kept.

# Glance — source-unread playtest

## Session

Ngozi, 41, water engineer; plays Papers, Please and Mini Metro on the bus. Patient with systems, impatient with ambiguous labels. Played with one-handed phone use in mind, using individual touch taps.

- Live URL: https://glance.adamwhite.work
- Visible title: The Glance. Footer: “People by the Human Framework 2.8.0.” No separate game build identifier seen.
- Phone: 360×690 CSS px, touch emulation, light mode, default text size, headless Chromium through Playwright.
- Access: a long-lived Node/Playwright HTTP server, one page throughout. Ordinary coordinate taps, screenshots, visible page text and normal wheel scrolling. No game source, bundles, network payloads, hidden state, storage or debug APIs inspected. Read only the two supplied instruction documents as reference material. npm installed Playwright and Chromium for the permitted browser tooling.
- First actionable screen: 2026-10-20 10:05:44.645 UTC. Voluntary stop: 10:12:03.356 UTC, elapsed **378.711 seconds (6:18.711)**, before the eight-minute ceiling. This includes reading, writing contemporaneous reactions and the checkpoint. The game continued at its offered speed during those intervals, except where its own screens changed that behavior.
- First-minute screenshot: elapsed 66.715 s. Checkpoint was late by 6.715 s; no gameplay input between 35.195 s and the checkpoint. Checkpoint text persisted at 82.529 s before play resumed.
- Initial selected speed: double arrow, later identified on-screen as “steady.” Changed to triple arrow at 183.572 s to wait less for reports. No scripted time acceleration or batched choices.
- After stopping: one 1280×800 screenshot of the opening screen at 379.004 s. It offered “Back to the desk” and “Start the week again.” No desktop gameplay.
- No run sent, consent changed, or export downloaded. No telemetry or send control was used.

Screenshots are in [glance-shots](glance-shots/). Contemporaneous timestamp, input, visible-answer and diary records were appended to [timestamps.jsonl](glance-shots/timestamps.jsonl) as the session ran. I did not reread that file to reconstruct the experience. Help scrolling did not move the modal in my first attempt; I treat that as an unresolved tooling/access limitation, not a demonstrated game defect. Later normal page scrolling worked at dawn. Some wheel screenshots caught a transient rendering frame; the following settled screenshots are the evidence references below.

## First minute

These are the original checkpoint answers. Later discoveries have not changed their statuses.

**First minute — observed at 66.715 s; late by 6.715 s while waiting and making the screenshot call. No gameplay inputs after 35.195 s.**

| Item | Original status and answer |
|---|---|
| DL-1 | **PASS:** I am the night desk keeper; rain is coming and I must keep the dam below its crest or warn the town. The title says that directly. |
| DL-2 | **FAIL:** Take the night desk, About the desk, Load a playtest run, the gauge cards, the speed boxes, Dai, close and the numbered gate boxes look tappable. My start tap opened Level too, though I had only meant to start. No inert object tried. |
| DL-3 | **PASS:** The large level and gate readings draw me first; the red line draws me to Dai and the latest level. No immediate emergency is apparent at 3.70 m below the 5.0 m lip. The double-arrow speed had an outline; the gate sheet now explicitly says steady selected. Gate is the open inspection. |
| DL-4 | **PASS:** Get your head down says after I read the level. The gate initially said rather read the level while Dai was reading; after his report the buttons changed to yes. I understand that finishing the reading frees him. |
| DL-5 | **PASS:** Dai is resting until about 22:50; the new report says three-seven. Steady as you like. I can ask for a gate setting from one to six, with estimated work times. |
| DL-6 | **PASS:** A meaningful choice, Ask Dai to read it, was visible by 6.983 s. My first input was Take the night desk at 6.983 s; my first consequential request was Read the level at 30.327 s. The start screen has one short purpose sentence; no long text gate. |
| DL-7 | **PASS for the one request I made:** Read the level queued a request, Dai said Fair enough, then a reported 22:22 reading of 3.70 m arrived. I learned that the gauge is an observation, not live water telemetry. I used no About help. Gate changes, insisting, resting, sleep and warnings remain **NOT TESTED: five interaction types not yet reached.** |

Evidence: [opening](glance-shots/01-phone-first-screen.png), [unexpected Level panel](glance-shots/02-take-night-desk.png), [Dai choices](glance-shots/04-gate-panel.png), [queued reading](glance-shots/05-ask-read-level.png), [gate while reading](glance-shots/06-gate-gauge.png), [checkpoint](glance-shots/08-first-minute.png).

## Verbatim diary

The reactions below retain their original wording, including early interpretations. Times are real elapsed seconds. Inputs and visible answers are recorded separately so the reactions are not rewritten to incorporate later rules.

**6.869 s** — “I know this job: keep the dam below the crest, or warn the town. Take the night desk looks like the start button. About the desk and Load a playtest run also look tappable.”

Input at 6.983 s: tapped Take the night desk, (175,224). Visible answer: game opened at Monday night 22:00, level 3.90 m, gate 0/6, with Level inspection already open. [02](glance-shots/02-take-night-desk.png)

**16.296 s** — “The desk opened with a Level panel already open. I did not mean to select Level. I can ask Dai for a reading; yes ~10 min looks like the time it takes. The level is 3.90 m against a 5.0 m lip, so I want to see the gate control before the rain adds water.”

Input at 16.377 s: close Level, (321,515). Visible answer: full drawing returned, Monday night 22:03; Dai resting until about 22:20. Input at 21.078 s: tapped the hut/Dai position (262,120), opening Dai's panel. The tooling screenshot label says gate-panel, but the screenshot is Dai's panel; that filename is not an assertion about the game. [03](glance-shots/03-close-level.png), [04](glance-shots/04-gate-panel.png)

**26.662 s** — “The drawing disappeared while Level was open and came back when I closed it. I tapped Dai at the hut, thinking about asking him to work. Get your head down says after I read the level; that tells me what is stopping that option. He is resting until about 22:20, yet Read the level says yes.”

Input at 30.327 s: Read the level, (93,536). Visible answer: panel closed; “level request waiting for an answer.” [05](glance-shots/05-ask-read-level.png)

**35.088 s** — “I asked Read the level. The panel closed and level request waiting for an answer appeared. Good: a request is not a fresh measurement. I am waiting for Dai.”

Input at 35.195 s: gate gauge, (262,326). Visible answer: Gate sheet; Dai reading, report expected about 22:20; numbered settings said “rather read the level”; explanation that more turns lower the dam and raise the town river later. [06](glance-shots/06-gate-gauge.png)

**47.711 s** — “The gate buttons say rather read the level. I take that as Dai wanting to finish the measurement first, not a broken control. More turns lower the dam but raise the town river later; I do not want to open all six blindly. The gate sheet has shifted the main clock off the screen, but Now 22:19 is beside its controls.”

Observed at 47.866 s: reported 22:22, “three-seven. Steady as you like.” Level 3.70 m. Gate choices now “yes.” No gameplay input while waiting for the checkpoint. [07](glance-shots/07-await-reading-in-gate.png), [08](glance-shots/08-first-minute.png)

**88.369 s** — “The new reading is lower, 3.70 m, with the gate still shut. I will try one turn rather than wait for the rain to force a large release. The warning about the town river makes this a tradeoff, which I like.”

Input at 88.513 s: intended one-turn tap, (62,429). Visible answer: “Dai, on the round after” expanded, showing “Easy. I’ll have plenty for the next round.” The log now included lightning at 22:34. [09](glance-shots/09-request-one-turn.png)

**98.260 s** — “That tap opened Dai, on the round after, and showed Easy. I will have plenty for the next round. I had meant the one-turn button. The new lightning text has shifted the controls down. I will tap the numbered box itself.”

Input at 98.367 s: one-turn numbered button, (58,495). Visible answer: gate request waiting. Observed at 123.869 s: gate 1/6, reported 22:52, “Gate’s on one turn.” Dai then reading the level, report expected about 23:25. [10](glance-shots/10-one-turn-button.png), [11](glance-shots/11-gate-report.png)

**134.040 s** — “Gate is now one turn, reported at 22:52; Dai has gone to read the level again without another request from me. That feels like a keeper doing his rounds. I want to know how I warn the town if this gets worse. I cannot see that control yet, so I will read About the desk.”

Input at 134.364 s: About the desk, (207,663). Visible modal explained the night desk, offered pace arrows, the watch ending at dawn after Friday night, and the gate/town tradeoff. Wheel attempt at 148.023 s did not visibly scroll the modal; same-page screenshot at 167.383 s confirmed it remained on its upper portion. I did not use offscreen help text as player knowledge. [12](glance-shots/12-about-desk.png), [14](glance-shots/14-help-after-scroll.png)

**176.349 s** — “About says the watch runs until dawn after Friday night. That is longer than I expected for a bus game. I can read the gate tradeoff here too. My scroll attempt did not move the help; I cannot tell whether that is my browser control. I will go back rather than spend the watch in help.”

Input at 176.444 s: Back to the desk, (181,49). Visible answer: Monday night 00:31, last level 3.80 m, reading 97 minutes old, Dai reading. [15](glance-shots/15-back-from-help.png)

**183.393 s** — “I have been watching mostly old readings while Dai works. I am choosing the three-arrow speed now because I want the next report sooner. The level is 3.80 m, but it is already 97 minutes old. That age matters more to me than the big number.”

Input at 183.572 s: triple arrow, (327,29). Visible selection outline moved; 00:41, level 3.70 m read 00:39. After a real wait, observed at 211.903 s: 01:49, “Dai: not answering,” sleeping drawing. [16](glance-shots/16-fast-speed.png), [17](glance-shots/17-fast-rounds.png)

**220.330 s** — “Dai is not answering and the drawing shows him asleep. I like that I can see the reason. The gauges have faded, though I cannot tell whether that means stale or unavailable. I want a fresh level before I change the gate again.”

Input at 220.459 s: level gauge, (84,344). Visible answer: Level panel, “Ask Dai to read it,” red “can’t · ~10 min.” Input at 227.690 s: tapped that action, (149,553). Visible answer: panel closed, “level request waiting for answer”; Met Office message: heavy rain over the hills until first light. [18](glance-shots/18-sleeping-level-request.png), [19](glance-shots/19-ask-while-not-answering.png)

**236.387 s** — “Ask Dai to read it said cannot, but tapping it still put a level request waiting for answer on the board. I understand that nothing has been measured, but cannot did not tell me it would queue. Heavy rain until first light has arrived. Now I do want him awake.”

Input at 236.609 s: Dai card, (158,600). Visible answer: Dai panel; now resting until about 02:50, level 4.10 m read 02:24. “Read the level,” “Sit by the stove” and “Get your head down” all said yes. [20](glance-shots/20-dai-not-answering-options.png)

**245.545 s** — “The reading came through: 4.10 m at 02:24. He is back by the stove. I cannot tell whether my call woke him or he woke on his own. I will open the gate further because the level is rising and the rain lasts until first light.”

Input at 245.668 s: tapped visible close, (319,515). Visible answer: full desk, “stove request waiting for an answer.” I did not intentionally select Sit by the stove. [21](glance-shots/21-close-dai-for-gate.png)

**256.376 s** — “I tapped close on Dai, but now the board says stove request waiting for an answer. I had not meant to ask him to sit. This feels like the start tap opening Level: one tap seems to do more than I asked.”

Input at 256.472 s: gate gauge, (261,327). Gate sheet showed “Inspection slowdown · fast selected,” current setting 1/6. Input at 260.405 s: setting 3, (290,495). Visible answer: gate request waiting. Observed after a real wait at 296.710 s: 04:31, gate 3/6, reported 03:17; level 4.70 m, read 03:27; Dai not answering. [22](glance-shots/22-gate-to-three.png), [23](glance-shots/23-request-three-turns.png), [24](glance-shots/24-three-turns-reported.png)

**309.597 s** — “It is 04:31, level 4.70 m, gate three, Dai asleep again. The old reading is 64 minutes old. This is the best tension so far: I am deciding with a fallible person, not a live sensor. I want to warn the town, but I still have not found a phone or warning control. I will try a fourth turn to keep below the lip.”

Input at 309.686 s: gate gauge, (268,346). Visible answer: now 05:02, Dai reading, report expected about 05:10. Input at 313.119 s: setting 4, (61,554). Visible answer: gate request waiting. After another real wait, at 340.113 s: “Monday, first light,” “Mill Lane slept dry.” Chart and “Where the board was wrong” report. [25](glance-shots/25-gate-four-intent.png), [26](glance-shots/26-request-four-turns.png), [27](glance-shots/27-first-dawn.png)

**347.561 s** — “First light: Mill Lane slept dry. That is a clear result and a relief. The chart compares what the water did with what Dai told me. It says the three-seven reading was actually four-one because he was short of sleep, then says You caught it. I did not knowingly catch that error; I just kept asking and opened the gate.”

Input at 347.696 s: scroll down. Settled view at 351.818 s showed four inaccurate readings, an explanation of “caught,” and three sleep intervals. [29](glance-shots/29-dawn-report-settled.png)

**361.899 s** — “Further down, caught means I had it read again within twenty minutes, or lightning showed the wall. So the game means there was contradictory evidence available, rather than that I spotted it. I missed that distinction during the night. The repeated short-of-sleep explanation makes me feel I should have let him sleep properly.”

Input at 362.013 s: scroll down. Settled view at 365.454 s showed Dai saying “I nodded off. Don’t put that in the book. Old dam held. She usually does.” Controls: Tuesday night, Export this run (playtest), Send this run to the notebook, Title page. [31](glance-shots/31-dawn-final-controls-settled.png)

**378.711 s** — “I am stopping at the Monday dawn report, with Tuesday night offered. Mill Lane is dry and I have a proper stopping point. I would return for another night to try letting Dai sleep, but not continue this watch on the same bus ride. I am more interested than bored; the accidental extra requests are what frustrated me. I am not sending the run or changing consent.”

Post-session, 379.004 s: requested 1280×800 opening-screen look. Title remained readable in a centered narrow column, all four controls visible. “Back to the desk” acknowledged prior play, but gave no sentence identifying Monday dawn or the next night. No resume input made. [32](glance-shots/32-desktop-first-screen.png)

## Best, worst and stopping

**Best:** Around 309.597 s, I had a rising, old level reading, an open gate, heavy rain and a sleeping keeper. The uncertainty was about a person and a measurement I understood. It made me care about both the dam and Dai. The dry-lane result and comparison chart then gave the first night a satisfying end.

**Worst:** At 245.668 s I tapped close and saw a stove request I had not meant to send. That undermined confidence in touch input during a consequential situation. I cannot identify the implementation cause from this test. The earlier start tap also opened an inspection I had not selected.

I first felt the wait drag at 183.393 s and chose fast speed. I did not become bored enough to leave. I chose to leave at Monday dawn, 378.711 s, because it was a complete night and a useful bus-session boundary. Tuesday remained available; I did not finish the week or exhaust the budget. I would return voluntarily to test a different approach to Dai's sleep.

## Clarity findings

These concern the screens I reached, not a claim about all nights or all rules.

1. **DL-13 FAIL — unintended result from a close tap.** “I tapped close on Dai, but now the board says stove request waiting for an answer.” Before: close at the right edge of Dai's sheet, with Sit by the stove elsewhere. Input: (319,515). After: stove request waiting. [20](glance-shots/20-dai-not-answering-options.png) → [21](glance-shots/21-close-dai-for-gate.png). The start tap opening Level is a second observed unexpected transition, recorded under DL-2 at the checkpoint. These are observations under touch emulation, not a diagnosed cause. Intended reading and gate requests otherwise received clear queued and reported acknowledgments.
2. **DL-4 FAIL in later play — “can’t” did not explain the available queue.** At 220.459 s, Ask Dai to read it said “can’t · ~10 min,” while Dai was not answering. A normal tap at 227.690 s queued a request anyway. I could see the sleeping figure before inspection, but did not know when he would answer or that the action would retain my request. [18](glance-shots/18-sleeping-level-request.png) → [19](glance-shots/19-ask-while-not-answering.png). This later failure does not change the original first-minute PASS for the limits met then.
3. **DL-2 FAIL — a control moved out from under my intended action.** A new lightning log line changed the gate sheet position. My intended one-turn tap expanded “Dai, on the round after” instead. I then used the current screenshot to select the actual numbered button. This was a coordinate tap based on an earlier view, so it is evidence of sensitivity to live reflow, not proof a person staring continuously would always mistap. [08](glance-shots/08-first-minute.png), [09](glance-shots/09-request-one-turn.png), [10](glance-shots/10-one-turn-button.png).
4. **DL-27 FAIL for the opening-screen location cue; resume integrity NOT TESTED.** The post-session title offered “Back to the desk” but no line saying where I had stopped. It clearly recognized prior play. I did not activate it, so I cannot claim anything about loss, duplication or simulated time on resume. [32](glance-shots/32-desktop-first-screen.png).

**Unresolved player questions, not demonstrated missing rules:** I could not find how to warn the town during Monday. I did not establish that a warning action was supposed to be available then. I did not reach the lower help text after the modal scroll problem, or Tuesday's controls. “You caught it” initially sounded like an assertion about my awareness. The explanation below the fold resolved the scoring meaning. I still had not consciously noticed the error during play; that is distinct from the game lacking an explanation.

## English, dates and phone layout

| Item | Result and evidence |
|---|---|
| DL-20 | **PASS for encountered actions.** Level, gate, turns, resting, reading and forecast were usable English. “Three-seven” was paired with 3.70 m; the Level panel defined water held behind the dam. I needed no translation. Unmet setting terms and later-night content: NOT TESTED. |
| DL-21 | **PASS for the encountered overnight comparison.** At about 02:12 I could compare “heavy rain over the hills until first light” with the live overnight clock, and later recognized first light as the boundary. Monday night continuing through 00:31 was understandable as that night's watch. No month/year deadline or return-after-break comparison was reached: NOT TESTED. |
| DL-22 | **PASS for immediate responses reached on the phone.** Reading and gate controls, current report age, keeper status and the relevant limit were on screen together. Large gate sheets hid the top clock but repeated “Now” beside the choices. Requests returned to a desk view showing their waiting status without scrolling. Long help and dawn reports required scrolling; dawn's next-night control was reachable by normal page scrolling. Modal scroll accessibility remains unresolved because of the tooling limitation. This does not establish keyboard-open sheets, safe areas or every later screen. |

Other checklist results, bounded to reached interactions:

| Item | Result |
|---|---|
| DL-8 | PASS for ordinary desk priority: gauges and keeper status were prominent; older log lines faded. I missed the significance of the lightning clue, but did not establish a misleading cue. |
| DL-9 | NOT TESTED: no explicit time-critical obligation separate from the overall watch was reached. |
| DL-10 | PASS for reading/gate labels encountered. Collection/run labels visibly differ from the supplied standard (“all notebooks,” “Export this run (playtest)”); their naming did not block my play. |
| DL-11 | PASS for short immediate choices reached; About was optional and longer. No formal rendered word-count audit. |
| DL-12 | PASS: “Monday, first light,” “Mill Lane slept dry,” and Tuesday night clearly marked a completed night and a continuation. |
| DL-14 | PASS for known gate tradeoff and estimated work times. I knew more turns could raise the town river. I did not predict exact levels or their timing. |
| DL-15 | PASS for visible selected speed, finding a faster wait, and inspection slowdown. NOT TESTED for a separate live consequential event requiring a response at fast speed; no such timed prompt reached. |
| DL-16 | NOT TESTED for the warning task: I wanted it but did not establish its availability/prerequisite. Reading and gate responses were available for the dam task. |
| DL-17 | PASS for encountered tiredness: yawns, sleeping drawing and words rather than a mood percentage. |
| DL-18 | PASS for observed figures presented as keeper readings with written times. This is a player observation, not an audit of unknowable internal numbers. |
| DL-19 | FAIL for the “can’t” action's queue implication, as described under DL-4. The inaccurate water figures themselves were uncertain reports; the dawn explanation made them a fallible-observer consequence, not proof that uncertainty is a clarity defect. |
| DL-23 | NOT TESTED for measured hit-area sizes. Large visible standalone boxes were usable; touch transitions above prevented a clean overall pass. |
| DL-24 | PASS for one inspection sheet at a time and returning to the desk in reached flows; unexpected close side effect separately fails DL-13. Focus restoration and nested task cancellation NOT TESTED. |
| DL-25 | NOT TESTED for 320 px, 200% text and dark mode. No horizontal page scroll needed at 360 px. The sole 1280×800 title view was readable. |
| DL-26 | PASS for finding Game menu on the desk without scrolling. I did not open it, so organization of its save/run controls is NOT TESTED. |
| DL-28 | NOT TESTED: sending was not authorized and was not attempted. |
| DL-29 | NOT TESTED: no export, import or replay attempted. |

Builder-only checks throughout the supplied checklist are NOT TESTED. No claim here establishes upload reliability, replay, full save validity, underlying limit rules or complete mobile accessibility.

## Up to three changes I want as this player

1. Make a close tap only close the panel. I need confidence that one-handed touch input does not send another request.
2. Say that a request will wait when Dai cannot answer. “Can’t” did not describe what my tap did.
3. Keep the action buttons steady while a new report arrives. I want to read the report without my intended gate button moving to another control.
