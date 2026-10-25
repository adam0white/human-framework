# The Pass — source-unread playtest

Persona: Tomás, 52, retired line cook. Rarely plays games; impatient with rules; wants to get stuck in; full attention, but quits fast if lost.

URL: https://pass.adamwhite.work. Access: headless Chromium through a persistent Playwright server, one page, screenshots and normal coordinate taps only. Phone: 360×690 CSS px, touch emulation, light mode, default text size. Budget: eight real minutes maximum. No optional question. First usable screen: 2026-10-20 08:17:35.310 UTC. The opening visibly credits Human Framework 2.8.0; no game build identifier was visible.

## First minute

Checkpoint recorded slightly late because of screenshot/tool handling; exact recording time is in the timestamp log. Last input before it: +57.637 s. Evidence: 01-first-screen.png, 02-open-doors.png, 03-selim.png, 04-first-minute.png. These are the original checkpoint answers, written before further play.

| Item                       | Status | My answer and visible evidence                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 A reason to act       | PASS   | I need to run this kitchen and earn money because the bank wants its arrears by Saturday close. The opening says that directly, and the kitchen shows “till £120 / £5,200 by Sat.”                                                                                                                                                                                                                                                                  |
| DL-2 What can I touch      | PASS   | Open the doors, Load a playtest run, and More about the kitchen looked tappable. In the kitchen, the arrow boxes and Selim/Dilek boxes looked tappable. I tapped Selim and got job buttons. His double outline showed he was selected. I tried no inert object and found no control by accident.                                                                                                                                                    |
| DL-3 Urgency and selection | PASS   | The debt and clock drew me first, then “Tap a cook.” The double arrow has a second outline; I think that is the selected speed. Selim had the double outline when selected. His line about the rest of the rush being hard made his break feel immediate. The bank debt is the larger urgency.                                                                                                                                                      |
| DL-4 Why the limit         | PASS   | Selim’s Go home says “after I work the grill.” I understand that I cannot send him home until he has worked the grill. I do not yet know how much work counts. Take ten says yes and is available. Only this limit was met; no recovery was tested.                                                                                                                                                                                                 |
| DL-5 Readable situation    | PASS   | I could choose Grill, Cold side, Take ten or Eat for Selim. After Take ten, “Waiting for Selim’s answer” tells me my request is underway. He is drawn by the back door and his box says “out back.”                                                                                                                                                                                                                                                 |
| DL-6 A choice soon         | PASS   | The opening screen was available at +0 s; I first pressed Open the doors at +19.739 s. Cook selection was visible by +19.889 s, within 30 s. I first selected a cook at +38.312 s. Job choices were visible by +38.365 s, and my first job request was Take ten at +57.637 s. I read roughly 32 story words before entering the kitchen. The 30-second pass refers to choosing a cook; a consequential job choice was not observed until +38.365 s. |
| DL-7 Learn by doing        | PASS   | I reached cook selection and one job request. Selecting Selim exposed his jobs and his own words. Take ten moved him out back and produced “Waiting for Selim’s answer.” I understood a break; I have not yet heard the answer. No help used. Other jobs, Dilek’s requests, tickets and later interactions: NOT TESTED at this checkpoint (zero reached).                                                                                           |

## Verbatim diary

- +19.679 s, 08:17:54.989 UTC: “I have a kitchen and a bank bill due Saturday. Open the doors looks like the thing to press. Load a playtest run and More about the kitchen also look tappable. I want to cook, so I am opening up.”
  - Input +19.739 s: Open the doors. Visible answer +19.889 s: Monday · wk1 17:25; £0 / £5,200 by Sat; “Waiting for the next ticket”; “Tap a cook”; Selim and Dilek free. [02-open-doors.png]
- +38.280 s, 08:18:13.590 UTC: “There is my kitchen. Tap a cook is plain enough. Selim and Dilek are free; their boxes look like buttons. The double arrow looks selected. I am waiting for a ticket, and I can see £5,200 by Saturday. I will see what Selim can do.”
  - Input +38.312 s: Selim. Visible answer +38.365 s: Monday 18:08; till £80; Selim on grill, Dilek on cold. “I can do it, though the rest of the rush will be hard.” Grill, Cold side, Take ten and Eat say yes; Go home says “after I work the grill.” [03-selim.png]
- +57.602 s, 08:18:32.912 UTC: “Selim says the rest of the rush will be hard. I know that feeling. Take ten says yes, so I will give him a break. He already says on grill; I did not assign that job.”
  - Input +57.637 s: Take ten. Visible answer +57.674 s: Monday 18:18, £120; “Waiting for Selim’s answer”; Selim out back, Dilek on cold. [04-first-minute.png]
- +100.925 s, 08:19:16.235 UTC: “FIRST MINUTE CHECKPOINT: I stopped inputs after Take ten at 57.637 seconds. I can act on the cooks and I know the Saturday debt is the reason to earn money. I cannot yet tell how tickets reach me; money has risen while I looked at Selim. I can read Waiting for Selim’s answer, so I know my request landed.”
  - Timing limitation: the checkpoint prose was saved at +100.925 s, 40.925 s late. It used only observations through +57.674 s. No further input or screenshot was taken until after it was written. The live clock continued during writing.
- +131.931 s, 08:19:47.241 UTC: “It is already 19:47 and £520. Selim said Fine, then stepped into the storeroom for maghrib. I do not know that word, but he looks busy elsewhere. I still have not touched a ticket. This is running away while I read; I am pressing the single arrow to slow it down.”
  - Input +131.967 s: single arrow, to slow down for reading. Input +132.008 s: Dilek. Visible answer +132.102 s: Monday 20:47; £560; red “Grill needs a cook; select a cook”; table 2 grill ticket “new”; red “nobody on it” at grill. Dilek selected, on cold; Grill says “rather work the cold side”; Cold side, Take ten, Eat say yes; Go home says “after I work the cold side.” [05-after-checkpoint.png, 06-dilek.png]
- +148.750 s, 08:20:04.060 UTC: “Now I see a ticket: table 2, grill, new. Grill needs a cook; select a cook is red, and nobody on it is written at the grill. That I understand. Dilek would rather work the cold side, so I will put Selim back on grill.”
  - Input +148.786 s: Selim. Visible answer +148.823 s: Selim selected, out back; Grill says yes; Go home says “rather take ten out back”; ticket now “waiting.” [07-grill-request.png]
- +162.704 s, 08:20:18.014 UTC: “Selim is out back again, but Grill says yes. I am asking him to take it. I take yes to mean he will do the job if I tap it.”
  - Input +162.735 s: Grill. Visible answer +162.773 s: “Waiting for Selim’s answer”; ticket waiting. [08-request-answer.png]
  - Observation +182.088 s: Monday 21:12; £600; “The rail is clear; waiting for closing.” Selim on grill. “Selim at 21:02: ‘There goes my ten. Fine.’” [09-grill-followup.png]
- +203.487 s, 08:20:58.797 UTC: “He did take the grill. Selim at 21:02 says There goes my ten. Fine. That sounds like a cook whose break I have interrupted. The money went to £600 and the rail is clear; waiting for closing. I get this now, but there is nothing I want to press. I will use the three arrows to get to closing.”
  - Input +203.514 s: three arrows, to wait for closing. [10-wait-closing.png]
- +238.136 s, 08:21:33.446 UTC: “I put it on three arrows but it is only 21:31. When is closing? Selim cannot take ten or eat with Dilek out; that makes sense. I do not need his job list now, so I am closing it.”
  - Input +238.147 s: × on the cook sheet. Visible answer +238.169 s: Monday 21:40; rail clear, waiting for closing; cook sheet closed, earlier dialogue visible. [11-shift-end.png shows 21:31, despite its filename; 12-waiting.png shows 21:40.]
- +260.833 s, 08:21:56.143 UTC: “I have sorted the empty grill and now I am just watching them move around. It says waiting for closing, but I cannot see when that is. I am done here. I would leave now rather than sit through the rest of the shift.”
  - Stop decision at +260.833 s (4 min 20.833 s). The immediately following screenshot, +260.850 s, showed the after-close summary rather than the kitchen. I did not see the precise transition. Monday, week 1, after close; 15 of 15 tables fed; £600 tonight and towards £5,200 due Saturday; about £920 a night for five nights left; Open on Tuesday; Save a playtest file; Send this run to the notebook. [13-stop.png]
- +279.621 s, 08:22:14.931 UTC: “Just as I decided to leave, the after-close screen appeared. Fifteen of fifteen tables fed, £600 in the till, about £920 a night still needed. Open on Tuesday is clear. That is a proper end to a shift, but I still do not want another one now. I am stopping without opening Tuesday.”

No gameplay inputs followed the stop decision. The eight-minute ceiling did not end the session. No telemetry submission, run send, consent change, export or import was performed.

## Best moment, worst moment, and leaving

Best: calling Selim back to an empty grill, seeing the ticket clear, then reading “There goes my ten. Fine.” It felt like interrupting a real cook’s break. The red empty-grill instruction gave me an understandable job.

Worst: reading the cook sheet while the default clock ran from 17:25 to 18:08 between my first two kitchen screenshots. Money arrived and the cooks took stations without me making a job request. I could not yet tell what work needed me. This is what I observed; I do not know the rules behind their actions.

At +131.931 s I wanted the clock slower so I could read. At +203.487 s I was bored enough with the clear rail to select the fastest arrow. At +238.136 s I wondered when closing would happen. At +260.833 s I decided to leave because waiting had become the activity. The final screenshot then showed that the shift had ended. That resolves the question of whether the shift ends; it does not change my recorded decision to stop.

I would not voluntarily start Tuesday now. I enjoyed the one kitchen problem, but I wanted more of that and less watching.

## Clarity findings and evidence limits

- **DL-15 — speed clarity concern:** “This is running away while I read”; later, “I put it on three arrows but it is only 21:31.” I could recognise the selected arrow and use fewer arrows for slower play, but I could not name the clock rate or explain the different apparent pacing. Screenshots 02, 03, 06, 10 and 11 show the clock and arrow selection. This is an observed uncertainty about speed, not evidence that the speed control malfunctioned. I did not meet a pending choice at high speed and verify its slowdown; that part is **NOT TESTED**.
- **Waiting-time uncertainty, no exact checklist failure established:** “When is closing?” The live kitchen said “The rail is clear; waiting for closing” without a visible closing time in the screens I saw. [09–12] I knew what was underway, so this does not establish a DL-5 failure. The final summary made the boundary clear, so **DL-12 PASS** for the one shift reached. I did not finish the game.
- **DL-6 timing qualification:** The original checkpoint PASS above used cook selection as a meaningful choice. Its availability by +19.889 s is established. The first observed consequential job choices were at +38.365 s, after I opened a cook sheet. Their availability before 30 s was **NOT TESTED**; this report does not establish a 30-second consequential-job-choice pass or failure.
- **DL-4:** The later “not with Dilek out” limits were understandable: I would need her back before Selim could leave for food or a break. “After I catch my breath” indicates waiting, but I did not test when those actions became available. I did not try a refused action or hold to insist. Do not count these untested interactions as successful refusals or recoveries.
- **DL-13 PASS for the requests reached:** Take ten and Grill each promptly produced “Waiting for Selim’s answer.” Later dialogue stayed traceable to Selim, including the 21:02 timestamp for the grill request. I did not repeat an uncertain tap or test duplicates.
- **DL-16 PASS for the empty-grill problem:** “Grill needs a cook; select a cook” had an available response. Selecting Selim and requesting Grill resolved the observed ticket.
- **DL-17 PASS for the people observed:** Selim’s strain and reluctance were spoken, not shown as mood or trust percentages. No claim about unseen characters or later play.
- **DL-24 PASS for the single sheet reached:** Cook selection stayed in one sheet; × returned to the kitchen. Nested sheets, cancellation and keyboard focus were **NOT TESTED**.
- **DL-27 NOT TESTED:** The desktop title offered “Back to the kitchen (Monday, week 1)” after ordinary navigation, but I did not resume. That title alone does not establish save correctness.
- **DL-28 and DL-29 NOT TESTED:** No send, download, import or replay. No export path exists.

I found no confirmed additional clarity failure. Unmet interactions and builder checks remain **NOT TESTED**. This was a short player session, not a checklist coverage run. No source, repository, tests, prior report, bundles, network payloads, storage or debug state was inspected.

## English, dates, and phone layout

| Item                            | Status                   | Observation                                                                                                                                                                                                                                                                                                                           |
| ------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-20 English                   | PASS for play reached    | Cook, job, ticket, money and deadline controls were understandable in English. “Lokanta” appeared in the opening, but “a kitchen” immediately supplied enough context for me to act. “Maghrib” was unfamiliar; it appeared in a note about Selim stepping away, and no choice required me to translate it. I did not seek a glossary. |
| DL-21 Dates                     | PASS for this week       | “Monday · wk1” and “by Sat” let me compare today with this Saturday. The final summary stated “5 nights left this week” and about £920 a night. No month/year boundary, later deadline or return after a break was tested.                                                                                                            |
| DL-22 Phone response visibility | PASS for screens reached | At 360×690, the empty-grill warning, ticket, kitchen context, cook selection and job buttons were visible together without scrolling. The after-close summary and Open on Tuesday were visible together. No scroll was used in this session. Longer sheets, keyboard-open layouts and later days were not tested.                     |

## Requested desktop look

After stopping, I set the same page to 1280×800 and navigated normally to the live URL. At 08:22:15.045 UTC I took one screenshot, [14-desktop-first-screen.png](pass-shots/14-desktop-first-screen.png). It shows a centred title screen, the saved-session button “Back to the kitchen (Monday, week 1),” A new notebook, Load a playtest run, More about the kitchen, the collection link and framework credit. The whole first screen fits. I made no desktop gameplay input. This navigation reset the browser server’s elapsed counter; all play-session elapsed times above refer to 08:17:35.310 UTC.

## Changes I would want, ranked

1. Tell me the closing time while I am waiting for it. I would have waited more willingly if I could see how much shift remained.
2. Tell me plainly how fast the selected clock setting runs. I want to read a cook’s answer without feeling I have lost the evening.
3. Give me one short opening cue that the cooks can start work themselves and I can step in when needed. I spent the start wondering whether I had missed the cooking.

These are this player’s requests, not claims about how the simulation is implemented.

## Evidence files

Screenshots are in [pass-shots/](pass-shots/):

1. [Opening phone screen](pass-shots/01-first-screen.png)
2. [First kitchen view](pass-shots/02-open-doors.png)
3. [Selim selected](pass-shots/03-selim.png)
4. [Last screen before checkpoint](pass-shots/04-first-minute.png)
5. [After checkpoint](pass-shots/05-after-checkpoint.png)
6. [Dilek and empty grill](pass-shots/06-dilek.png)
7. [Selim’s grill response available](pass-shots/07-grill-request.png)
8. [Waiting for answer](pass-shots/08-request-answer.png)
9. [Grill resolved and dialogue](pass-shots/09-grill-followup.png)
10. [Fastest speed selected](pass-shots/10-wait-closing.png)
11. [21:31, still waiting; filename says shift-end](pass-shots/11-shift-end.png)
12. [21:40, sheet closed](pass-shots/12-waiting.png)
13. [After-close screen at stop](pass-shots/13-stop.png)
14. [Desktop first screen](pass-shots/14-desktop-first-screen.png)

Wall-clock inputs, answers, diary notes and process PID were appended during play to `<scratch>`. Tool overhead and report writing consumed real time while the live game continued. No tool failure required recovery; the same page remained open throughout phone play and the desktop look. Browser access was closed normally after recording the report.
