Screenshots and other evidence files stayed in the driver's scratch folder and are not kept; absolute local paths were replaced by relative names or "(driver scratch)". No other wording was changed.

# The Pass — Adaeze playtest

Adaeze, 33, events caterer. I play Cook, Serve, Delicious!, PlateUp! and Overcooked. I like the rush and doing the work myself. I dislike standing around and babysitting staff. I am on an eight-minute break between shifts, using a phone one-handed.

URL: https://pass.adamwhite.work. No build identifier seen. Access: Playwright Chromium, one persistent page in a long-lived local Node process. Phone: 360×690 CSS px, touch emulation, light mode, default text size. Eight real minutes is the ceiling. Time begins at the actionable title screen. No source, internal state, network payloads, telemetry submission or consent controls used.

## First minute

Checkpoint screenshot at **60.4 real seconds**, with inputs paused. These answers were written before continuing. The diary reaction submitted with the screenshot still described the portion I had started. The screenshot shows it has finished: the rail is clear, both cooks are eating, and the game clock is 18:16.

| Item                       | Status                                   | Original checkpoint answer                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 A reason to act       | PASS                                     | I need to earn money serving dinner because the bank wants 5,200 Turkish lira by Saturday. The title told me that.                                                                                                                                                                                                                                                                                                                                                    |
| DL-2 What can I touch      | PASS                                     | Outlined buttons look tappable: Open the doors, Change, station and break choices, Ask them about the changes, table-priority buttons and Work grill. Tables also say “Tap to work a portion”; cooks say “Tap a cook.” I have tried no inert decoration. Double borders showed my selected station and break.                                                                                                                                                         |
| DL-3 Urgency and selection | PASS                                     | The red “The rush is backing up; choose which table the cooks put first” drew me first. Table 8 had waited three minutes versus table 6 one minute. “First on the pass” acknowledged selection. The chosen speed has a double border. Now it says “Rail clear” and “Waiting for the next ticket.”                                                                                                                                                                     |
| DL-4 Why the limit         | PASS                                     | Initially Work buttons said “Nothing waiting.” During my portion they said “Hands full,” with “Finish this portion before calling a table first.” Cooking finished and the controls returned to Nothing waiting. Open the doors became pale after my plan change; the new red Ask them about the changes button suggested the prerequisite, and asking unlocked the doors. That prerequisite was inferred from the controls, rather than stated as a reason sentence. |
| DL-5 Readable situation    | PASS                                     | At the screenshot the crew are “eating,” with spoken return times of 18:30. I finished a grill portion for table 6. “Waiting for the next ticket” tells me why there is currently nothing to cook.                                                                                                                                                                                                                                                                    |
| DL-6 A choice soon         | PASS                                     | The title actions were available at 0 s. My first input was Open the doors at 6.1 s. Meaningful planning choices appeared then; I opened Selim’s Change at 12.1 s and changed his break at 17.4 s. The title has roughly 31 story words before play.                                                                                                                                                                                                                  |
| DL-7 Learn by doing        | PASS for three interaction types reached | Changing a break required asking the cooks and produced spoken agreement. Calling table 8 first marked it First on the pass and later reported it received first portions and plate. Work grill took a portion for table 6 and disabled management while my hands were full. No help opened. Other interaction types are NOT TESTED; their total count is unknown.                                                                                                    |

## Verbatim diary

The reactions below are copied without rewriting from this session’s wall-clock log. They were recorded with the input, before seeing that input’s screenshot. The separate visible-answer lines describe the resulting screenshots. Time continued normally while I viewed screenshots and wrote the checkpoint; I did not script waits, batch decisions or accelerate the clock except with the visible speed button.

**0.0 s — 2026-10-20T13:06:25.645Z — open.** 01-opening.png (driver scratch)

> I have eight minutes before my next shift. Let me see what I can cook.

Visible answer: Title: debt ₺5,200 by Saturday close; Open the doors.

**6.0 s — 2026-10-20T13:06:31.625Z — tap (172, 346).** 02-open-doors.png (driver scratch)

> I owe the bank 5,200 by Saturday. Open the doors is the obvious button; More about the kitchen looks expandable. I want to get cooking.

Visible answer: Tonight’s board; Monday week 1, doors 17:30; Change controls.

**12.1 s — 2026-10-20T13:06:37.714Z — tap (64, 257).** 03-selim-change.png (driver scratch)

> Two people have jobs and breaks. Change and Open the doors look tappable. Selim breaks during the rush and the grill waits; I want to move that.

Visible answer: Selim editor: Grill selected; break 18:35 selected; Cover heading at bottom.

**17.4 s — 2026-10-20T13:06:43.003Z — tap (117, 412).** 04-earlier-break.png (driver scratch)

> Grill and 18:35 have double borders, so I take those as selected. I am giving Selim the 18:10 break before the rush.

Visible answer: 18:10 selected; Open the doors pale; Ask them about the changes appears.

**23.4 s — 2026-10-20T13:06:49.045Z — tap (159, 655).** 05-ask-changes.png (driver scratch)

> Open the doors went pale. Ask them about the changes is now red, so I need their agreement first. Both cooks may now be off together; let me hear it.

Visible answer: Both cooks agreed; Open the doors available.

**30.4 s — 2026-10-20T13:06:56.022Z — tap (160, 655).** 06-service.png (driver scratch)

> They both agreed. I will cover the kitchen myself if they are both eating.

Visible answer: Monday 17:25; Waiting for the next ticket; Work buttons unavailable, Nothing waiting.

**38.3 s — 2026-10-20T13:07:03.963Z — look.** 07-waiting.png (driver scratch)

> It is 17:25 and says Waiting for the next ticket. Work grill and Work cold side are grey because nothing is waiting. I can tap a cook, but I want a ticket. The middle speed is selected: Steady, 1.5 min/s.

Visible answer: 17:34; Slow 0.1 min/s; red table-priority choice. Table 8 waiting 3 min; table 6 waiting 1 min.

**45.4 s — 2026-10-20T13:07:11.060Z — tap (99, 625).** 08-table8-priority.png (driver scratch)

> Now it is red: choose which table the cooks put first. Table 8 has waited three minutes, table 6 one. I will call table 8 first; the other table waits. Work grill and Work cold side also look ready.

Visible answer: Table 8 marked First on the pass; “I called table 8 first.” Steady 1.5 min/s.

**51.4 s — 2026-10-20T13:07:17.044Z — tap (94, 269).** 09-work-grill.png (driver scratch)

> Table 8 says First on the pass. I can take a portion myself; seven minutes on grill means my hands are away from managing. Yes, let me do the work.

Visible answer: 17:43; table 6 grill portion about 7 min left; Hands full; ₺40.

**60.4 s — 2026-10-20T13:07:26.045Z — look.** 10-first-minute.png (driver scratch)

> First minute: I am working a grill portion while the crew cooks. The bank debt gives me a reason to serve. I have made a break plan, called the older table first, and taken a portion. I expected cooking to involve more than choosing a job, but I have only just started.

Visible answer: 18:16; rail clear; Steady 6 min/s; both cooks eating until 18:30; ₺120.

**94.5 s — 2026-10-20T13:08:00.139Z — look.** 11-after-checkpoint.png (driver scratch)

> Both cooks were eating at the checkpoint, with return times in their own words. I did not tap a speed control: the label changed from Steady 1.5 min/s to Steady 6 min/s while the rail was clear. I am watching for the next work.

Visible answer: 19:29; table tickets; grill available about 8 min; cold Nothing waiting; ₺240.

**101.4 s — 2026-10-20T13:08:07.058Z — tap (44, 397).** 12-take-table6.png (driver scratch)

> There are three tickets now. Cold dots are filled on two; grill circles are empty. I take that to mean grill still needs cooking. I will tap table 6 to take its portion.

Visible answer: 19:39; “I took a grill portion for table 1”; about 8 min; Hands full; ₺320.

**110.5 s — 2026-10-20T13:08:16.192Z — look.** 13-portion-done.png (driver scratch)

> That now says I took a grill portion for table 1, not table 6. The tickets may have moved before my tap; I cannot tell. I am still doing one timed portion, then watching. There is no chopping or serving action to perform while it cooks.

Visible answer: 19:53; portion for table 1 finished; grill and cold controls available; ₺440.

**116.5 s — 2026-10-20T13:08:22.156Z — tap (260, 269).** 14-work-cold.png (driver scratch)

> I will do the cold side this time. It says about six minutes. The cooking is clear enough, but it feels like assigning myself a timer rather than cooking.

Visible answer: 20:02; rail clear; Nothing waiting; no new cold-side acknowledgement; ₺520.

**127.9 s — 2026-10-20T13:08:33.573Z — tap (326, 64).** 15-fast-speed.png (driver scratch)

> My cold-side tap left no visible acknowledgement; the rail was clear by the next screenshot. Perhaps the crew finished before I tapped. I am trying the three-arrow speed button because I want to get through this service, not watch empty time.

Visible answer: 20:32; Fast 3.5 min/s selected; cold portion available about 6 min.

**135.0 s — 2026-10-20T13:08:40.672Z — tap (262, 268).** 16-cold-fast.png (driver scratch)

> Fast says 3.5 min/s. There is a cold portion now, so I tap Work cold side while it is available.

Visible answer: 21:26; Fast 14 min/s; rail clear, waiting for closing; no cold-side acknowledgement; ₺600.

**143.6 s — 2026-10-20T13:08:49.272Z — look.** 17-closing.png (driver scratch)

> Again there is no new cold-side line; the rail cleared. Now it says waiting for closing and Fast 14 min/s. I will see the night result, then leave. I do not feel the kitchen needs me much.

Visible answer: Monday week 1 after close; 15 of 15 tables fed; ₺600; about ₺920 a night for five nights left; Open on Tuesday.

**153.4 s — 2026-10-20T13:08:59.003Z — quit.** No screenshot; final phone view is 17-closing.png.

> I am stopping after Monday close. All 15 tables were fed and there is 600 in the till; I need about 920 a night for the five nights left. I understand Tuesday continues, but I do not want another service. I wanted the rush of making food, and I mostly chose jobs and watched the crew finish.

Visible answer: No further gameplay input; stopped after Monday close.

**153.4 s — 2026-10-20T13:08:59.050Z — desktop.** 18-desktop-after-stop.png (driver scratch)

> One requested look at 1280x800 after stopping; no more play inputs.

Visible answer: Desktop after-close screen: readable centered column; Open on Tuesday visible.

## Best and worst moments

Best: the first red table-priority choice. I had a real service decision: table 8 had waited longer, and the other table would wait. “First on the pass” and the later portion/plate report made my choice legible (07–09).

Worst: I chose Work cold side, then saw a clear rail and no line telling me what happened to my tap (14). It happened again at fast speed (16). I cannot tell whether the crew finished before the tap or the tap was refused. The gaps between screenshots and inputs were about six to seven real seconds; this tool-mediated session makes that uncertainty larger than a continuous human view would.

I first voiced boredom at 110.6 s: “There is no chopping or serving action to perform while it cooks.” At 116.5 s I described it as assigning myself a timer. At 128.0 s I increased speed to get through the service. At 143.6 s I had decided to see the result and leave.

## Clarity findings

- **DL-13: FAIL for knowing what happened to these taps.** After the cold-side taps at 116.5 s and 135.0 s, I saw “Nothing waiting,” with no new line attributable to either tap (14, 16). I could not tell whether either input was accepted. This does not establish a dropped accepted input. I did not repeat a tap immediately to test duplicates.
- **DL-2 / DL-13: uncertain table target, not a confirmed failure.** I intended to tap table 6 at 101.4 s, based on the preceding screen. The result said “I took a grill portion for table 1” (11–12). Tickets may have changed during the seven-second gap. I cannot attribute this to a wrong target or a rule.
- **DL-4: minor inference required in planning.** After changing a break, the pale Open the doors button had no reason sentence. “Ask them about the changes” gave me a workable clue, and asking unlocked it (04–05). This did not block me; the checkpoint remains PASS.

The cooking felt less active than I wanted. That is a player preference, not evidence that a rule or control is missing.

## English, dates and phone layout

| Item  | Result                               | Evidence and limit                                                                                                                                                                                                                                                                                                                                                                        |
| ----- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-20 | PASS for terms met                   | Controls and work were English. The debt says “Turkish lira.” The end dialogue explains “maghrib (sunset prayer)” nearby. “Lokanta” was not translated on the title, but the kitchen subtitle supplied the setting and I did not need that word to act. On-request definitions were NOT TESTED.                                                                                           |
| DL-21 | PASS for the comparison met          | Today was Monday, week 1; the bank deadline was Saturday. After close it stated five nights left and about ₺920 a night. Breaks used 24-hour times and before/during/after the rush labels. Across-month/year and return-from-break comparisons were NOT TESTED.                                                                                                                          |
| DL-22 | PASS for immediate responses reached | The urgent table choice and waiting-time context fit together at 360×690 (07). Work controls, portion time and Hands full reason fit (09). Planning’s Ask button stayed at the bottom (04). The after-close result and Open on Tuesday fit (17). Selim’s expanded editor extended below the screen; I saw Cover as a heading but did not scroll to or test its choices. No keyboard used. |

One requested look at 1280×800 after stopping: the after-close text and Tuesday button remained readable in a centered column, with no apparent overlap or horizontal clipping (18). No desktop play occurred. This does not establish 320 px or 200% text reflow.

## Other checklist evidence

| Item  | Result                     | What I reached                                                                                                                                                                                                                                                                                                                                                                         |
| ----- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-8  | PASS                       | Red rush instruction and outlined responses drew attention; the consequence remained in the lower text.                                                                                                                                                                                                                                                                                |
| DL-9  | PASS for obligation met    | Bank debt and Saturday deadline stayed at the top of service. Other obligations and on-request checks NOT TESTED.                                                                                                                                                                                                                                                                      |
| DL-10 | PASS for labels understood | Grill, cold side, portions and table numbers remained understandable. Variable numeric speed under Steady/Fast was accompanied by Rail clear or Your chosen speed.                                                                                                                                                                                                                     |
| DL-11 | PASS for decisions read    | Short opening, short work costs, brief urgent table choice. No builder word-count or layout audit performed.                                                                                                                                                                                                                                                                           |
| DL-12 | PASS for day boundary      | “Monday, week 1, after close,” totals and Open on Tuesday made the end of the service and continuation explicit (17). Game ending NOT TESTED.                                                                                                                                                                                                                                          |
| DL-14 | PASS for known costs met   | Break options named rush timing; plans said station waits. Table choice said others wait. Work said one portion takes my hands away from managing, with estimated minutes.                                                                                                                                                                                                             |
| DL-15 | PASS for sequence met      | Selected speed and rate were shown. The live table choice displayed Slow 0.1 min/s despite the selected middle speed, stayed open until answered, then returned to Steady 1.5 min/s (07–08). I spent about seven real seconds from that screenshot to the answer. Later I selected Fast myself (15); no consequential choice at Fast was reached, so that specific test is NOT TESTED. |
| DL-16 | PASS for problems met      | I could change breaks, ask the cooks, choose table priority and take a portion. No unresolved task with an apparently absent response met.                                                                                                                                                                                                                                             |
| DL-17 | PASS for expression met    | Cooks spoke in their own words, including “You look worse than me.” No feeling bar encountered.                                                                                                                                                                                                                                                                                        |
| DL-18 | PASS for numbers met       | Visible numbers counted money, time, tables or portions. No hidden-state claim is made.                                                                                                                                                                                                                                                                                                |
| DL-19 | NOT TESTED conclusively    | I guessed the empty/filled portion circles meant needed/ready, but did not verify that interpretation. The changing ticket target is unresolved.                                                                                                                                                                                                                                       |
| DL-23 | NOT TESTED                 | No hit-area measurement performed. I encountered no confirmed overlapping target.                                                                                                                                                                                                                                                                                                      |
| DL-24 | NOT TESTED                 | No sheet navigation sequence reached.                                                                                                                                                                                                                                                                                                                                                  |
| DL-25 | NOT TESTED in full         | Phone and desktop screenshots only; no 320 px or 200% text test.                                                                                                                                                                                                                                                                                                                       |
| DL-26 | NOT TESTED in full         | Game menu was visible without scrolling, but I did not open it to inspect save/run controls. All games was separate on title and close screens.                                                                                                                                                                                                                                        |
| DL-27 | NOT TESTED                 | No reload or resume.                                                                                                                                                                                                                                                                                                                                                                   |
| DL-28 | NOT TESTED                 | Sending was prohibited. No run sent or consent setting changed.                                                                                                                                                                                                                                                                                                                        |
| DL-29 | NOT TESTED                 | No export downloaded or replay tested.                                                                                                                                                                                                                                                                                                                                                 |

All builder checks are NOT TESTED. Unreached mechanics are evidence gaps, not observed failures.

## Stop and return

I stopped at **153.4 real seconds (2 min 33 s)** after Monday close, before Open on Tuesday. The eight-minute ceiling did not end the test. I left because the work felt like choosing a short commitment and watching the cooks handle service. All 15 tables were fed, with ₺600 towards the Saturday bank payment. I would not voluntarily return as Adaeze on this break. I wanted more hands-on service work.

## Changes I would want, ranked

1. Give me something to do while I make the portion. Choosing a timer does not give me the cooking rush I came for.
2. Tell me what happened when I tap a portion that has just disappeared: did I start work, or did the crew already finish it?
3. Keep a table’s tap target steady long enough for me to choose it confidently with one thumb.

These are my wishes as this player, not implementation advice. The third comes from an uncertain live-target incident.

Artifacts: wall-clock.jsonl (driver scratch), screenshots 01–18 in pass2-shots (driver scratch). No export downloaded.
