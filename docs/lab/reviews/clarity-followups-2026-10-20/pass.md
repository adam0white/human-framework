Screenshots stayed in the driver's scratch folder and are not kept.

# The Pass — source-unread playtest

## First minute

Checkpoint captured at **62.931 real seconds**, 2026-10-20T10:11:38.465Z. Inputs stopped after 46.030 s; the capture was 2.931 s late because of tool overhead. These answers were written before continuing. Evidence: screenshots 01–09, especially `09-checkpoint-60s.png`.

| Item | Status | Original checkpoint answer |
|---|---|---|
| DL-1 A reason to act | PASS | I need to earn £5,200 by Saturday to cover the bank arrears. Right now the grill needs a cook; the red sentence tells me to select one. |
| DL-2 What can I touch | FAIL | Open the doors, Load a playtest run, More about the kitchen, the speed buttons, the cook buttons and the job tiles look tappable. Selim and Dilek select with an outline. My tap intended for Dilek at 29.165 s opened the notes instead: the cook controls had moved upward. I have not tried the drawn stations. |
| DL-3 Urgency and selection | PASS | The red “Grill needs a cook; select a cook.” and the ticket draw me first. The chosen speed has an outline; the selected cook did too. No cook is selected now. The bank total also matters, but the empty grill looks urgent. |
| DL-4 Why the limit | NOT TESTED | I have not encountered a confirmed unavailable control. I saw “rather work the grill,” “rather work the cold side,” and “after I work the grill/cold side.” These look like willingness and conditions, but I did not try to override a reluctance or refusal. |
| DL-5 Readable situation | PASS | Dilek is eating and Selim is in the storeroom. The grill has “nobody on it”; a ticket waits. I can tap a cook and ask for grill. The game says “Slow · 0.1 min/s” and “A station needs a cook.” |
| DL-6 A choice soon | PASS | Opening action was available at 0 s; I tapped Open the doors at 5.6 s. Cook choices were visible by 5.673 s, before any mandatory extra story. I first selected a cook at 12.8 s and asked for grill at 19.9 s. Those let me choose whom to put where. |
| DL-7 Learn by doing | PASS for reached interactions; NOT TESTED for unmet ones | I learned that a cook selection opens jobs and a tap asks rather than instantly moves the person. I asked Selim for grill and Dilek to eat. “Waiting for … answer” acknowledged each request. Dilek then said “Alright, I’ll do it” and appeared eating. I did not use optional help; the opening notes expanded after the misplaced tap. Two job requests reached; four distinct job types remain untried: Cold side, Take ten, Go home, and holding to insist. |

## Assignment and access

- Persona: Joon, 34, a line cook who plays Overcooked and Kitchen Nightmares-style sims on breaks. Reads quickly, hates waiting with nothing to do, phone in one hand.
- Live URL: https://pass.adamwhite.work
- Visible version information: title footer said “People by the Human Framework 2.8.0.” No separate game build identifier seen.
- Main device: headless Chromium through Playwright; 360×690 CSS px, touch emulation, light mode. One 1280×800 first-screen look after quitting, in the same browser context. That screen offered “Back to the kitchen (Monday, week 1).” I did not resume it.
- Access: a Node HTTP server kept one Playwright page open across shell tool calls. Inputs were individual coordinate taps. Observations were viewport screenshots. No scrolling, hidden DOM, source, bundles, network payloads, storage, or debug APIs were inspected. Only the two authorized instruction documents were read. No other reports or memory were consulted.
- Clock start: 2026-10-20T10:10:35.534Z, first actionable title screen. Gameplay start was the Open the doors tap about 5.6 seconds later. Quit recorded at 2026-10-20T10:14:24.160Z, **228.626 s / 3 min 48.6 s** after clock start. The eight-minute ceiling did not end the session. The browser clock continued during tool calls and writing. No tooling failures interrupted play.
- The first-minute screenshot was captured at 62.931 s. Writing its answers took until 93.433 s. No game inputs occurred from the eat request at about 46.0 s until the next cook selection at about 96.8 s.
- No telemetry was deliberately submitted, no run was sent, and no consent settings were changed. No export was downloaded. I did not inspect whether the page had any automatic telemetry.

All screenshots below are in [pass-shots](pass-shots/). Wall-clock requests, captures and original reactions were appended during play to [events.jsonl](pass-shots/events.jsonl). Report prose uses only the observations made during play; output files were not read back.

## Verbatim diary

The following are the original first-person notes, unchanged. Elapsed times are wall time, not kitchen time. Some notes describe the preceding screenshot. Inputs and visible answers are listed separately below.

**5.539 s:** “I have a kitchen and a debt due Saturday. Open the doors is the obvious tap. Load a playtest run and More about the kitchen also look tappable; I want to get cooking.”

**12.722 s:** “Steady is selected, 1.5 minutes per second. Waiting for the next ticket. Selim and Dilek look like buttons, and it says Tap a cook. I will ask Selim what he can do.”

**19.860 s:** “He is already on grill and she is on cold. I did not assign that. Grill says yes; Cold side says rather work the grill; the breaks say after I work the grill. I read that as he will not take a break yet. I want him on grill anyway.”

**29.116 s:** “Waiting for Selim’s answer acknowledges the tap. The same Steady label now says 6 minutes per second; I have not touched speed. Dilek is out back. The till is earning while I look at the controls. Am I managing people rather than cooking tickets?”

**38.370 s:** “That tap opened the notes instead of Dilek. The buttons moved up while I was deciding. The notes say Selim: I’m on it, Chef. He is out back now. I cannot tell whether he finished the grill job or ignored it.”

**45.987 s:** “Dilek prefers cold side. Take ten and Eat say yes. I will send her to eat while it is quiet; Go home says after I work the cold side. The small italic replies tell me willingness, not a locked button.”

**50.178 s:** “I asked her to eat. I am looking for whether she leaves the station and whether tickets suffer.”

**93.433 s:** “First minute checkpoint, captured at 62.931 seconds: I need money by Saturday, and the red grill warning now gives me an immediate job. Dilek is eating; Selim stepped into the storeroom to pray. The clock slowed to 0.1 minutes per second. I can cover the grill with a cook. I lost one tap when the layout moved. Checkpoint answers saved before I continue.”

**104.771 s:** “She will take grill, yes. Take ten, Eat and Go home now say not with Selim out. That makes sense: someone has to cover. I will ask her for grill rather than pull him out of prayer.”

**114.071 s:** “I asked Dilek for grill, but now Selim is outlined and the jobs say after I pray maghrib. Waiting for Dilek’s answer is still at the top. I cannot tell why the other cook is selected. Two tickets are on the rail now; I want food moving.”

**124.426 s:** “Dilek said Leaving my plate, then. Fine. She is on grill and the red warning moved to cold. That is the first request that felt like a real kitchen tradeoff. Selim is selected and Cold side says yes now, so I will ask him.”

**140.642 s:** “Both stations are covered and the till rose to £320. Now I am just waiting for cooking. I want the rush, so I will tap the three-arrow speed button. This is my first speed change.”

**148.282 s:** “Dilek left the grill for the cold side. Both cooks are on cold; the grill is empty again. The clock slowed even though fast is outlined. Good, I have time to read. Selim wanted grill at the start, so I will swap him back.”

**163.887 s:** “One ticket has turned restless with a red outline. I can tell the pressure is rising. Asking for grill shows Waiting for Selim’s answer and restores Fast at 3.5 minutes per second. I am waiting for him to move.”

**173.168 s:** “Money jumped to £520 and most tickets cleared, but Selim is free again and the grill needs a cook. I cannot tell whether Grill means one batch or staying at the station. I have to ask again already. Dilek is out back.”

**194.662 s:** “Not now. After I catch my breath. Fair enough, but I still see I can do it, though the rest of the rush will be hard above the jobs. Those read like different answers. I am starting to get frustrated: a waiting ticket, two cooks, and I am negotiating the same station again. I will try Dilek.”

**206.139 s:** “Dilek’s Grill tile says yes while she is out back. I asked her. I want to clear this last waiting table before I put the phone down.”

**217.075 s:** “The rail is clear; waiting for closing. £600 in the till. That feels like a small win, though the game has both cooks back at their preferred stations without me arranging that last swap. I will see the close, then leave; this is enough for a break.”

**228.626 s — quit:** “I am quitting here, after Monday close: 15 of 15 tables fed, £600 earned, and about £920 a night needed for five nights. Tonight felt like a kitchen again is a good ending line. I do not want to open Tuesday now. Repeatedly asking cooks back to stations took more of my attention than the food. I would not return voluntarily on another short break.”

## Inputs and important visible answers

Times below are screenshot completion times, immediately after each input unless stated otherwise. They are not exact millisecond input timings. The server recorded requests separately as they happened.

| Elapsed | Input / observation | Visible answer | Screenshot |
|---|---|---|---|
| 0.032 s | First screen | Kitchen, debt, two cooks; bank arrears due Saturday. Open the doors visible. | [01](pass-shots/01-first-screen.png) |
| 5.673 s | Tap Open the doors | Monday wk1 17:25. “Waiting for the next ticket.” Two free cooks and speed controls. | [02](pass-shots/02-open-doors.png) |
| 12.849 s | Tap Selim | Selim outlined; job choices visible. He is already on grill. Grill “yes”; cold “rather work the grill.” | [03](pass-shots/03-selim.png) |
| 19.914 s | Tap Grill | “Waiting for Selim’s answer.” Steady 6 min/s, “Rail clear.” | [04](pass-shots/04-ask-grill.png) |
| 29.165 s | Tap where I intended Dilek | Opening notes expanded instead. Cook buttons were above the coordinate I used. “Selim: I’m on it, Chef.” | [05](pass-shots/05-dilek-out-back.png) |
| 38.489 s | Tap Dilek at her current button | Dilek outlined; cold, Take ten and Eat say “yes.” | [06](pass-shots/06-dilek-select.png) |
| 46.030 s | Tap Eat | “Waiting for Dilek’s answer.” She still appears on cold at this instant. | [07](pass-shots/07-dilek-eat.png) |
| 62.931 s | Checkpoint; no input | Monday 18:52, £200. Grill warning; Dilek eating, Selim storeroom. Her agreement visible; note explains maghrib as sunset prayer. | [09](pass-shots/09-checkpoint-60s.png) |
| 96.812 s | Tap Dilek | Grill “yes”; breaks/home “not with Selim out.” | [10](pass-shots/10-choose-eating-dilek.png) |
| 104.847 s | Tap Grill | “Waiting for Dilek’s answer,” but Selim is now outlined and his jobs shown. I did not intentionally select him. Cause unknown. | [11](pass-shots/11-dilek-grill.png) |
| 114.135 s | Observe | “Dilek at 18:56: Leaving my plate, then. Fine.” Dilek on grill; cold needs a cook. | [12](pass-shots/12-answer-after-grill.png) |
| 124.483 s | Tap Cold side with Selim selected | “Waiting for Selim’s answer.” | [13](pass-shots/13-selim-cold.png) |
| 132.111 s | Observe | Selim on cold, Dilek grill, £320, two waiting tickets. “Waiting for cooking.” His “Alright, I’ll do it” is in notes. | [14](pass-shots/14-cold-answer.png) |
| 140.697 s | Tap three-arrow speed | Fast control outlined, actual speed Slow 0.1 min/s because grill needs a cook. Both cooks now on cold; note says Dilek left grill for cold. | [15](pass-shots/15-fast-speed.png) |
| 148.351 s | Tap Selim | Grill “yes.” Other responses visible. | [16](pass-shots/16-selim-for-grill.png) |
| 155.132 s | Tap Grill | “Waiting for Selim’s answer,” Fast 3.5 min/s. One ticket restless, red outline and underline. | [17](pass-shots/17-selim-back-grill.png) |
| 163.943 s | Observe | £520, one ticket remains, Selim “free,” Dilek out back. Grill needs a cook again. | [18](pass-shots/18-rush-outcome.png) |
| 173.226 s | Tap Grill again | “Waiting for Selim’s answer.” Grill tile now says “after I catch my breath.” | [19](pass-shots/19-grill-again.png) |
| 180.891 s | Observe | “Selim at 19:50: Not now. After I catch my breath.” Separate line still says “I can do it, though the rest of the rush will be hard.” | [20](pass-shots/20-after-repeat.png) |
| 194.709 s | Tap Dilek | Grill “yes”; Dilek “out back.” | [21](pass-shots/21-dilek-to-cover.png) |
| 200.541 s | Tap Grill | “Waiting for Dilek’s answer.” Selim outlined again; his jobs shown. | [22](pass-shots/22-dilek-cover-grill.png) |
| 208.956 s | Observe | Monday 21:15, £600, rail clear. “The rail is clear; waiting for closing.” Selim grill, Dilek cold. Fast 14 min/s. I did not observe the intermediate movements between these screenshots. | [23](pass-shots/23-dilek-cover-answer.png) |
| 217.106 s | Observe close | “Monday, week 1, after close”; 15 of 15 tables fed, £600, about £920/night for five nights. Open on Tuesday, save and send controls visible. | [24](pass-shots/24-closing.png) |
| 228.626 s | Record quit | No Tuesday input. Session ends voluntarily. | Final phone screen is 24. |
| 228.740 s | Post-session desktop first-screen look | 1280×800 title screen, single centered column, return button with Monday week1 context. No further gameplay. | [25](pass-shots/25-desktop-first-screen.png) |

## Best, worst, boredom and stopping

**Best moment:** Dilek leaving her meal to cover grill: “Leaving my plate, then. Fine.” I had asked for her meal earlier, so this connected my own choices to a person’s response. The final “Tonight felt like a kitchen again” gave the short session a satisfying ending.

**Worst moment:** Around 173–195 seconds, I was asking for the grill again, got Selim’s refusal, and could not reconcile it with the separate “I can do it” line. I was not sure whether I had assigned a lasting station or only a short piece of work.

**Boredom:** At 140.642 s, “Waiting for cooking” made me want a faster rush. I used the visible fastest control, once. The game then slowed for a missing station and resumed the chosen faster pace after a request. That was helpful rather than dead waiting. Frustration appeared explicitly at 194.662 s.

**Stop:** I chose to leave after Monday close and recorded that at 228.626 s. All 15 tables were fed; the game clearly offered Tuesday. I did not finish the four-week game or hit the time ceiling. I would not voluntarily return on another short break: asking cooks back to stations was more of the activity than the food, and I could not read the duration of those requests reliably. That is my preference as Joon, not evidence that the game lacks further decisions.

## Clarity failures and uncertainties

- **DL-2: I lost the target I meant to tap.** Between screenshots 04 and 05, the cook buttons moved upward and my tap at y=600 opened Opening notes. I could identify controls visually, but their changing position cost me an input. This observation includes the delay between seeing the page and tapping; I cannot separate that delay from how this would feel with a physical thumb.
- **DL-13: The answer was acknowledged, but selection became hard to trace.** After my Dilek-to-grill request, “Waiting for Dilek’s answer” appeared while Selim became outlined with his jobs open ([11](pass-shots/11-dilek-grill.png)). This happened again after the later Dilek request ([22](pass-shots/22-dilek-cover-grill.png)). I did not intentionally choose Selim at either point. I could not tell whether this was an intentional handoff, a target moving, or another behavior. I am reporting the visible selection change, not diagnosing its cause. The waiting messages and spoken answers otherwise acknowledged inputs clearly.
- **DL-19: Two visible lines gave me different expectations.** After “Not now. After I catch my breath,” I still saw “I can do it, though the rest of the rush will be hard” above Selim’s jobs ([20](pass-shots/20-after-repeat.png)). The Grill tile agreed with the refusal. I could act through the tile, but could not tell what the other line applied to.
- **DL-7, later interaction: I could not tell how long a job request meant.** The initial learned interaction remained usable, but I saw Selim free with grill empty soon after asking him for grill ([17–18](pass-shots/18-rush-outcome.png)). I did not see every intermediate movement. I cannot claim he ignored the request or that no duration rule exists. I wanted to know whether I had asked for one batch, the current rush, or a standing assignment. This later uncertainty does not change my first-minute checkpoint.
- **DL-26: I did not find a Game menu during service.** The phone screens showed speed, cooks, jobs and notes, without a control I recognized as a save/run menu. Save and send appeared after close ([24](pass-shots/24-closing.png)). I did not search by scrolling or try the framework link. This is a discoverability failure in my play, not a claim that the game has no menu anywhere.

The scene drawings also became very small when tickets, quotes and job controls were all present ([20](pass-shots/20-after-repeat.png)). Names in the drawing were hard to read, though the larger cook buttons and red station warning carried the essential response. I did not measure font size or target bounds.

## English, dates and phone layout

| Item | Status | Evidence and limit |
|---|---|---|
| DL-20 English | PASS for encountered actions | Jobs, waits, status, money and close report were understandable. “Lokanta” appeared next to the plain kitchen context. The notes explained “maghrib (sunset prayer)”; the storeroom and job condition gave enough context to avoid interrupting him. I did not need an external glossary. |
| DL-21 Dates | PASS for encountered deadline | Monday wk1 and “£5,200 by Sat” let me compare today with the deadline. After close, “about £920 a night for the 5 nights left this week” made the remaining schedule explicit. No month/year boundary or return after a break was reached: those are NOT TESTED. |
| DL-22 Phone response | PASS for encountered screens | Without scrolling, I could see the clock, urgent station, selected cook and relevant job controls. Close result and Tuesday action also fit. Scene detail shrank, but essential action text remained visible. No keyboard sheet was encountered. |
| DL-12 Session boundary | PASS for Monday | “Monday, week 1, after close” and Open on Tuesday clearly separated completed service from continued game. |
| DL-15 Speed | PASS for encountered flow | I changed to Fast at about 140.7 s, saw Slow 0.1 min/s for a missing cook, and had about 14 s to select and ask without the warning disappearing. Fast resumed after the request. Quiet rail-clear periods visibly ran faster than active cooking. Broader inspection-sheet behavior was not tested. |
| DL-4 Limits after checkpoint | PASS for the encountered refusal/conditions | “Not with Selim out” named a staffing constraint. Selim’s explicit refusal named catching his breath. I did not establish how long recovery took or whether holding would override it. These later observations do not revise the first-minute NOT TESTED. |

Unmet checks remain NOT TESTED: holding to insist; Take ten and Go home requests; all later days/weeks; calendar boundaries; full save/resume correctness; export/import/replay; sending; offline/error recovery; keyboard and sheet navigation; 200% text and 320 px reflow; measured target sizes; dark mode; all builder-only source/export checks. The desktop return offer was observed, but no resume input was taken, so it does not prove DL-27.

## Changes I would want as Joon

1. Keep the cook controls in the same place and make the selected cook stay predictable while a request gets its answer.
2. Tell me what a station request commits the cook to, and make the visible willingness line agree with the current job response.
3. Give me more direct involvement with a ticket or food during a quiet stretch. I liked the people’s reactions, but expected more kitchen work during a short break.

No playtest export was downloaded. Nothing was sent to the notebook. Screenshots and the timestamp log are the evidence; no replay claim is made.

Checkpoint wording note: the original DL-7 answer groups holding to insist with untried job types. More precisely, three job types were untried at the checkpoint (Cold side, Take ten, Go home), plus one untried interaction (holding to insist). Cold side was reached later. The original checkpoint wording above is preserved.

Tooling shutdown occurred after reporting work: browser close logged at 2026-10-20T10:16:32.747Z. This is not extra play time. The persistent server was terminated by its exact PID, 24178.

Shutdown correction: the exact-PID termination attempt returned “no such process.” PID 24178 had already exited after the browser-close command. No process was killed by that attempt.
