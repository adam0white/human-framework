> Readable formatting view. The [integration note](integration-notes.md) links the byte-identical archived original and its source hash. Original words remain the evidence authority.

## 1. Session

- Persona: Pavel Novak, 70, retired tram driver from Brno.
- Exposure: first visit to Voice; no previous play history.
- Round: `hf3-voice-r1`. Arm: `free`.
- Paired session: `hf3-voice-r1-pavel-novak`.
- Frozen diary: “No sessions recorded. This file contains no play evidence.” This session is a separate first-exposure branch.
- URL: https://human.adamwhite.work/voice/
- Visible title: **The Day You Say Nothing**. Build not shown.
- Device assignment: 360×690 touch/light. Played through the supplied text driver using sequential curl POST operations.
- Limits: floor 0, ceiling 25 real minutes.
- Actual duration: 100.524 seconds.
- Source, internal state, other reports and other diaries were not read. Consent and recording were unchanged.
- No recognition occurred. Rosa was not played; this assignment did not authorize another session.

The driver showed a running game clock between commands. I cannot establish whether it ran continuously throughout every interval.

## 2. First minute

The checkpoint was **late at 67.117 seconds**. A documented 20-second wait returned at 61.299 seconds. The driver then indicated the checkpoint was missing. This is a protocol deviation, not an on-time measured observation.

Original checkpoint note:

> I want to establish his routine and get the rent paid. I can open Halil, His goals, Today, the menu and information, and let time pass. I chose quiet company at 39 seconds; he heard me and keeps working. I cannot speak again because I have spoken and must give him room. Eight oclock is stopped, although the early morning moved very quickly. I do not yet understand when the clock runs. This note is late after the wait crossed sixty seconds.

| Item                       | Result                                               | Evidence and checkpoint answer                                                                                                                                                                                                                            |
| -------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 A reason to act       | PASS                                                 | I wanted to establish his routine and pay the rent. His goals said he had 40 lira and needed 300 by 25 March.                                                                                                                                             |
| DL-2 What can I touch      | PASS for text controls; visual appearance NOT TESTED | The driver listed Halil, His goals, Today, Speak, menu and information. I opened His goals. No inert object was tried.                                                                                                                                    |
| DL-3 Urgency and selection | FAIL                                                 | Rent drew my attention, competing with fasting, doctor, daughter and work. I could not tell when time ran. His goals was marked pressed while open. Visual prominence is not established by this harness.                                                 |
| DL-4 Why the limit         | PASS, with limits                                    | Initially “Starting…” was disabled, then became New game. Later: “He is occupied. Suggestions wait until he is choosing.” After speaking: “You have spoken. Give him a little room.” I understood why suggestions were limited, but not how long to wait. |
| DL-5 Readable situation    | PASS                                                 | Quiet work and company were underway. Available responses included “Take your time. I can be quiet while you work.”                                                                                                                                       |
| DL-6 A choice soon         | FAIL for the 30-second threshold                     | First meaningful response availability was observed at 32.388 seconds, after the goals panel. First response input was at 39.054 seconds. New game was available by 16.913 seconds and tapped at 20.043 seconds.                                          |
| DL-7 Learn by doing        | PASS for one interaction                             | I chose quiet company. The first observed answer was at 61.299 seconds: “He heard you and keeps working.” No help was opened. Goal-changing suggestions reached: 0, NOT TESTED.                                                                           |

No screenshot was inspected. Visual checks remain **NOT TESTED — not established by this harness**.

## 3. Verbatim diary and input record

All times are driver `elapsed_s`. Full raw input lines remain in the existing `wall-clock.jsonl`.

| Time    | Input and visible answer                                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.379   | Open. Introduction showed “Starting…” disabled.                                                                                                         |
| 16.913  | After a 10-second wait, New game was available.                                                                                                         |
| 20.043  | Tapped New game. Reply briefly showed “Continue · Ramadan 1 · 03:55”.                                                                                   |
| 21.810  | Tried that exact Continue control. It had disappeared. The reply identified this as game state, not driver failure, and showed the home scene at 04:11. |
| 23.843  | Opened His goals at 04:25. Read goals, debt, family and influence information.                                                                          |
| 32.388  | Tapped Close panel. Reply showed the workshop at 08:00 and an open Speak to Halil sheet.                                                                |
| 39.054  | Chose “Take your time. I can be quiet while you work.” Sheet closed.                                                                                    |
| 61.299  | After a 20-second wait, saw “He heard you and keeps working.” Clock remained 08:00.                                                                     |
| 67.117  | Logged late first-minute note.                                                                                                                          |
| 71.352  | Tapped Let time pass. Immediate reply still showed 08:00.                                                                                               |
| 79.815  | After a five-second wait, header showed 09:33 while still saying “stopped: Halil and Mrs Aydın”.                                                        |
| 82.851  | Tapped Back to now. Original 08:00 conversation returned; header remained 09:33.                                                                        |
| 85.336  | Opened Game menu. “The day waits while this is open.”                                                                                                   |
| 93.354  | Opened Feedback.                                                                                                                                        |
| 96.067  | Selected “I’d stop here”; reply marked it pressed. No text entered, no submission.                                                                      |
| 100.524 | Logged final stop, CONFUSED.                                                                                                                            |

Original reactions, unchanged:

**4.585 seconds — note**

> I am advising a widower, but he can refuse. I want to see what his daily routine is. Ramadan and Eid have explanations here.

**27.848 seconds — note**

> The rent is clear: 300 by 25 March, and today is 11 March. But this is a great many obligations at once. I reread: These are estimates of what he would choose without your advice. They do not show completed actions. I was treating chose it as something he had already done.

**36.413 seconds — note**

> Closing the goals brought me to eight oclock and a speaking sheet. I did not ask to speak. Did the morning pass while I read? I will let him work; I recognize this sort of quiet company.

**67.117 seconds — first_minute**

> I want to establish his routine and get the rent paid. I can open Halil, His goals, Today, the menu and information, and let time pass. I chose quiet company at 39 seconds; he heard me and keeps working. I cannot speak again because I have spoken and must give him room. Eight oclock is stopped, although the early morning moved very quickly. I do not yet understand when the clock runs. This note is late after the wait crossed sixty seconds.

**89.674 seconds — want_quit — CONFUSED**

> I would leave here. The clock says stopped but has gone to 09:33, and Back to now brings back the old conversation. I cannot settle into a routine when I cannot tell what time is doing. I would leave it paused, rather than start another day.

**100.524 seconds — stop — CONFUSED**

> I selected Id stop here in Feedback. I have not written or submitted anything. I am stopping at the workshop on the first morning. Quiet company interested me, but the clock and the return to the old conversation have put me off continuing today.

## 4. Best, worst and persistence

**Best moment:** 36–39 seconds. Quiet company at the workshop felt familiar. I could offer company without demanding that Halil stop working.

**Worst moment:** 79.815–89.674 seconds. The header advanced to 09:33 while retaining “stopped”, and Back to now restored the earlier conversation.

**Want_quit:** one, at 89.674 seconds, **CONFUSED**. It did not pass.

**Pulses:** none due; session ended before 180 seconds.

**Hard, but kept going:** I continued after the first timing uncertainty and tried Let time pass and Back to now. I did not search for an easier setting or accessibility option.

## 5. Clarity and screen concept record

Concept counts below count distinct ideas first encountered on each screen. Repeated controls and previously introduced ideas are not counted again. Multiple new ideas per screen were a clarity finding, especially in His goals.

| Screen and purpose                            | New concepts (list every one)                                                                                                                                                                                                                                                                                                                                                                                                                                           | Concept count | Sentences reread (verbatim)                                                                                | Reason                                                                                                           |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------: | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Introduction/loading — establish role         | Linked recording across games; Halil’s widowhood; Ramadan fasting month; Eid festival; independent action on Eid; advice that Halil may refuse; starting a game; all-games navigation; information; game menu                                                                                                                                                                                                                                                           |            10 | None observed                                                                                              | Short introduction; cultural terms explained nearby.                                                             |
| New game/brief Continue state — enter session | Continue a saved session; Ramadan day and clock as session position                                                                                                                                                                                                                                                                                                                                                                                                     |             2 | None observed                                                                                              | Continue disappeared before my tap.                                                                              |
| Home/table — introduce grief and daily time   | Calendar date alongside Ramadan day; current clock; fasting end time; Nuran and shared past meals; location/event timestamp; Halil panel; goals panel; Today panel; waiting without advice; Speak; skipping to next event                                                                                                                                                                                                                                               |            11 | None observed                                                                                              | I chose to inspect goals before speaking.                                                                        |
| His goals — explain obligations and influence | Estimates versus completed actions; pre-dawn meal; calling Selin; doctor visit; paying Osman; afternoon shift; keeping the fast; debt of 600 lira; 300-lira deadline; available 40 lira; lira currency; blood-pressure check; Selin as daughter in city; waiting for her calls since funeral; player as voice in his head; degree of listening to player; other people’s influence; advice remaining on his mind; Rıza as friend; Hacer as neighbour; Osman as landlord |            21 | “These are estimates of what he would choose without your advice.” / “They do not show completed actions:” | I had interpreted “chose it” as completed action. The diary recorded rereading this two-sentence block together. |
| Workshop/speaking sheet — offer company       | Workshop routine; Mrs Aydın; quiet company; dawn prayer kept; stopped event status; conversational response choices; occupied status limiting suggestions; Say nothing; closing speaking sheet                                                                                                                                                                                                                                                                          |             9 | None observed                                                                                              | Sheet appeared after closing goals; I had not tapped Speak.                                                      |
| Response view — show result                   | He heard me but kept working; Back to now; room after speaking; Let time pass                                                                                                                                                                                                                                                                                                                                                                                           |             4 | None observed                                                                                              | I did not yet understand how clock movement related to this view.                                                |
| Back to now — return to scene                 | No new concept observed                                                                                                                                                                                                                                                                                                                                                                                                                                                 |             0 | None observed                                                                                              | It restored the old conversation while header time stayed later.                                                 |
| Game menu — pause and navigate                | Explicit menu pause; Feedback; full screen setting; restart; Recording checkbox; Resume                                                                                                                                                                                                                                                                                                                                                                                 |             6 | None observed                                                                                              | Recording remained checked and untouched. No lab topics were shown.                                              |
| Feedback — record intent locally              | Continue/uncertain/stop verdict choices; feedback text field; optional name/tester ID; Submit                                                                                                                                                                                                                                                                                                                                                                           |             4 | None observed                                                                                              | Selected stop only. Nothing submitted.                                                                           |

**DL-3:** I could not reconcile current time with event status. At 79.815 seconds the header showed `09:33` and “stopped: Halil and Mrs Aydın”, while the scene retained `08:00`.

**Unnumbered clarity finding:** “chose it” initially looked like completed action. The estimate disclaimer corrected me after rereading.

**Unnumbered clarity finding:** Closing His goals returned a speaking sheet at 08:00. I observed the transition; I do not know why the sheet opened.

Transcript references are the elapsed-time entries above and `wall-clock.jsonl`. No screenshot supports these findings.

## 6. English, dates, layout and hands-on checks

| Check                                           | Result                                                                                                                                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-20 English/local terms                       | PASS for encountered play. I acted in English. Ramadan and Eid were explained on first use. Meaning on request was NOT TESTED; Information was unopened.                                                                  |
| DL-21 Dates                                     | PASS for same-month comparison. “Ramadan 15 (Monday 25 March)” could be compared with “Mon 11 Mar”. Across months or years: NOT TESTED.                                                                                   |
| DL-22 Phone response visibility                 | NOT TESTED — not established by this harness.                                                                                                                                                                             |
| DL-30 Cut-off or overlapping text               | NOT TESTED — not established by this harness. No screenshot inspected.                                                                                                                                                    |
| DL-31 Goal, deadline and person with sheet open | NOT TESTED — not established by this harness. Goals text was available separately, but simultaneous visual readability was not established.                                                                               |
| DL-32 Forced watching                           | Longest observed wait after my response was about 22 seconds, 39.054–61.299. I had chosen quiet company and deliberately waited; I did not record wanting another action during it. Forced unwanted watching: NOT TESTED. |
| DL-33 Acting on the thing or through a form     | Speech used a separate “Speak to Halil” choice sheet. I selected a sentence there.                                                                                                                                        |
| DL-13 Feedback                                  | Feedback opened. “I’m stopping” and “I’m confused” were not shown. The corresponding visible choice “I’d stop here” was selected. No note, name or verdict was submitted. No receipt or player ID shown.                  |

The requested second-viewport check remained unmet because I stopped before five minutes. No export was downloaded.

## 7. Stop and return

Stopped at the workshop on Ramadan 1, Monday 11 March, header time 09:33, after **100.524 real seconds**. Reason: **CONFUSED**.

I would leave this session for now. I would not voluntarily resume today. The first quit wish remained at the final stop.

No production feedback was sent. The browser is no longer needed; coordinator owns its cleanup. I created no worktree, server or browser and touched no repository.

## 8. What I would want

1. “Tell me plainly when the clock is running and when it is stopped.”
2. “When I choose Back to now, make it clear why I am seeing an eight oclock conversation at 09:33.”
3. “Keep the estimate and completed-action wording distinct enough that I do not mistake one for the other.”

These are requests from this short visit, not claims about rules I did not reach.
