# Good Hands — Sora

I cared about hearing both sides. I stopped after making one placement because I did not want a month of calls and return journeys tonight.

## Session

- Persona: Sora, occasional management-game player, curious, wants a placement she can stand behind; an evening set aside.
- URL: https://goodhands.adamwhite.work. No game build was visibly shown.
- Device: assigned 360 × 690 CSS px, touch, light mode. Screenshots matched the narrow phone view.
- Access: only the supplied localhost player driver, using curl. No implementation or prior reports read.
- Limits: 0-minute floor, 25-minute ceiling. Gameplay stopped at 302.532 s (5:02.5). Feedback answered at 320.010 s (5:20).
- Game clock: Mon 2 Nov, 08:30 to 13:14 at gameplay stop. It reached 13:42 when opening the menu for feedback. I left speed at Automatic. No skip used.
- Timing: time advanced outside conversations and during real waits. The game explicitly showed “held” during conversations. A 10-second wait in the interview kept 09:30; that is not evidence of frozen harness timing. Driver input log did not populate game_clock for ordinary inputs; important clocks are transcribed below from visible replies.

## First minute

The checkpoint was recorded at 71.832 s, late by about 11 seconds after open. No gameplay input occurred between 45.491 and the checkpoint; a wait ended at 61.729. The observations below use only that first-minute state. First actionable screen was available at about 0.5 s.

Original checkpoint wording:

> I need a nanny for the Arslans by tomorrow morning and rent by Friday. Bench names, interview questions and the phone are clear things to touch; I chose Gül almost immediately. The phone drew me away but returned me safely. Gül sounds warm and experienced with twins, but the aunt story worries me because this family has a grandmother. Questions cost time and she has now left the questioning stage; I can let her go and call after 11:19. I can follow the English and the dates. The interview screenshot fits its response and choices on the phone, although the family deadline is absent during it. I have not used help.

| Item                       | Result and first-minute evidence                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 A reason to act       | PASS — Nanny by tomorrow morning, rent Friday. Opening text supplied both.                                                                                                                                                                                                                                                                                                                         |
| DL-2 What can I touch      | PASS — Open office, bench names, interview questions, phone. I used all of those. Screenshot interview-phone.png shows outlined questions and Answer. No inert target tried; no known missed control.                                                                                                                                                                                              |
| DL-3 Urgency and selection | PASS — Gül drew me first, then the incoming phone competed with her interview. Bench control reported Gül pressed at 6.763 s. Tuesday deadline was clear; “held: Gül is talking” told me the interview had the clock.                                                                                                                                                                              |
| DL-4 Why the limit         | PASS — At 45.491 s questions disappeared after “one more question”; “I have to leave now” and “Call her back after 11:19” explained the next opportunity. I understood the restriction, even though I disliked losing the chance to follow up.                                                                                                                                                     |
| DL-5 Readable situation    | PASS — “Let the candidate go home” was available; “She has told you what she can for now” explained what was underway.                                                                                                                                                                                                                                                                             |
| DL-6 A choice soon         | PASS — Candidate choice available at 3.550 s, first candidate input at 6.763 s; interview choice available at 6.763 s and entered at 10.143 s. First question at 15.151 s. Available within 30 seconds, before a long introduction. Opening office input was 3.550 s.                                                                                                                              |
| DL-7 Learn by doing        | PASS for reached interactions — I reached candidate selection, interview, four questions, phone interruption, response to family and return to interview. Questions advanced the game clock and used her remaining patience. Phone returned me to Gül with “Sorry. Where were we?” No help used. NOT TESTED: 3 later interaction types (reference, negotiation, placement) within this checkpoint. |

## Verbatim diary and input record

The following is transcribed automatically from my own driver log. Reaction wording is unchanged. Every player operation is included. Times are real elapsed seconds. Null clock fields in the raw log are not inferred clocks.

- 0.494s input `open`: `{}`
- 3.550s input `tap`: `{"name": "Open the office"}`
- 6.763s input `tap`: `{"name": "Gül"}`
- 10.143s input `tap`: `{"name": "Interview About 30 minutes"}`
- **14.943s note** (Mon 2 Nov 08:43): I want to know whether Gül fits this family before promising anything. The deadline and rent give me a reason to start, but I do not know the family yet.
- 15.151s input `tap`: `{"name": "Tell me about your last job"}`
- 18.327s input `shot`: `{"file": "interview-phone.png"}`
- 25.238s input `tap`: `{"name": "☎ the Arslans are calling · Answer"}`
- 29.691s input `tap`: `{"name": "Say you are still interviewing"}`
- 33.389s input `tap`: `{"name": "End the conversation"}`
- 38.557s input `tap`: `{"name": "What wage do you need?"}`
- 42.757s input `tap`: `{"name": "What hours can you work?"}`
- 45.491s input `tap`: `{"name": "Why did you leave?"}`
- **51.571s note** (Mon 2 Nov 09:30): The paper crowns made me like Gül. Her trouble with an aunt makes me wary of the grandmother in this household. I thought I had one more question, but now she is leaving; I wanted to ask about that directly.
- 60.033s input `shot`: `{"file": "first-minute.png"}`
- 61.728s input `wait`: `{"s": 10}`
- **71.831s first_minute** (Mon 2 Nov 09:30): I need a nanny for the Arslans by tomorrow morning and rent by Friday. Bench names, interview questions and the phone are clear things to touch; I chose Gül almost immediately. The phone drew me away but returned me safely. Gül sounds warm and experienced with twins, but the aunt story worries me because this family has a grandmother. Questions cost time and she has now left the questioning stage; I can let her go and call after 11:19. I can follow the English and the dates. The interview screenshot fits its response and choices on the phone, although the family deadline is absent during it. I have not used help.
- 72.027s input `tap`: `{"name": "Let the candidate go home"}`
- 77.252s input `tap`: `{"name": "Sevda"}`
- 81.206s input `tap`: `{"name": "Interview About 30 minutes"}`
- 84.289s input `tap`: `{"name": "Tell me about your last job"}`
- 87.468s input `tap`: `{"name": "More questions · 9"}`
- 90.509s input `tap`: `{"name": "What if a child keeps crying?"}`
- 93.121s input `tap`: `{"name": "What wage do you need?"}`
- 96.938s input `tap`: `{"name": "Ask her to wait on the bench"}`
- 99.953s input `tap`: `{"name": "End the conversation"}`
- 103.135s input `tap`: `{"name": "Call a reference"}`
- 106.871s input `tap`: `{"name": "Call Mrs Uslu Reachable now"}`
- 110.787s input `tap`: `{"name": "Ask about patience"}`
- **117.061s note** (Mon 2 Nov 10:44): I do not trust Mrs Uslu just because she is the reference. Her complaint about counting wages sounds unfair. The boot detail now sounds different from Sevda’s story; I want to hear both sides.
- 117.255s input `tap`: `{"name": "Ask about money and honesty"}`
- 120.522s input `tap`: `{"name": "Ask why the job ended"}`
- 123.389s input `tap`: `{"name": "End the call"}`
- 126.436s input `tap`: `{"name": "Interview About 30 minutes"}`
- 129.388s input `tap`: `{"name": "Mrs Uslu says you left the boy crying"}`
- **136.846s note** (Mon 2 Nov 11:10): That is the first moment I feel like an investigator rather than filling boxes. I could ask Sevda about the exact accusation, and her answer changes my view. I am annoyed I cannot ask her conditions now before she leaves.
- 137.039s input `tap`: `{"name": "Let the candidate go home"}`
- 137.202s input `tap`: `{"name": "Families"}`
- 140.719s input `tap`: `{"name": "the Arslans"}`
- 143.584s input `tap`: `{"name": "Phone the Arslans"}`
- 147.588s input `tap`: `{"name": "How is the household managing?"}`
- 152.136s input `tap`: `{"name": "Finish"}`
- 155.437s input `tap`: `{"name": "☎ the Kayas are calling · Answer"}`
- 158.254s input `tap`: `{"name": "Decline the request"}`
- **163.169s note** (Mon 2 Nov 11:19): I declined the Kayas because I do not want to send someone into a home where being shouted at is already a condition. I like being allowed to refuse the business even with rent hanging over me.
- 163.357s input `tap`: `{"name": "End the conversation"}`
- 167.617s input `tap`: `{"name": "Bench"}`
- 170.866s input `tap`: `{"name": "Gül · at home"}`
- 173.953s input `tap`: `{"name": "Call in to the office Travel takes time"}`
- **180.754s pulse** (Mon 2 Nov 11:35; engagement 4): I care about the women’s accounts and want a placement I can defend; the repeated trips and question limits are starting to feel like administration.
- 200.907s input `wait`: `{"s": 20}`
- 206.316s input `tap`: `{"name": "Negotiate placement Agree the terms with both sides"}`
- 209.561s input `shot`: `{"file": "negotiate.png"}`
- **218.668s note** (Mon 2 Nov 11:53): I can propose Gül without vouching for traits, but I am not ready. Her twins experience did not count as checking patience. The proposal sheet shows Gül and the family, but I cannot see their deadline here.
- 218.929s input `tap`: `{"name": "Back"}`
- 242.567s input `wait`: `{"s": 20}`
- 251.861s input `wait`: `{"s": 4}`
- 255.066s input `tap`: `{"name": "Interview About 30 minutes"}`
- 259.333s input `tap`: `{"name": "What must the next family agree to?"}`
- 262.517s input `tap`: `{"name": "What if a child keeps crying?"}`
- 265.665s input `tap`: `{"name": "Where will you travel from?"}`
- 268.966s input `tap`: `{"name": "Ask her to wait on the bench"}`
- 272.382s input `tap`: `{"name": "End the conversation"}`
- 276.299s input `tap`: `{"name": "Negotiate placement Agree the terms with both sides"}`
- 279.489s input `tap`: `{"name": "patient · says"}`
- 283.386s input `tap`: `{"name": "Propose to the Arslans"}`
- 287.103s input `tap`: `{"name": "Then we have an agreement. Shall we begin?"}`
- **295.766s want_quit** (Mon 2 Nov 13:12; TASTE): I feel satisfied with one placement, but I do not want a month of managing calls and return journeys tonight. I would put this down here and maybe return for the trial result.
- 295.986s input `tap`: `{"name": "End the conversation"}`
- **302.532s stop** (Mon 2 Nov 13:14; TASTE): The next prompt is another event to wait for. My wish to stop has stayed. I am leaving after placing Gül, before learning whether it lasts; I might return for that result, but would not leave it running.
- 302.756s input `tap`: `{"name": "Game menu"}`
- 305.785s input `tap`: `{"name": "Send word ▸"}`
- 312.312s input `tap`: `{"name": "I’d stop here"}`
- 312.523s input `tap`: `{"text": "+ Add a name"}`
- 319.638s input `type`: `{"name": "Your name or tester id (optional)", "text": "playtester Sora rebuild-2026-10-23"}`
- 319.796s input `type`: `{"name": "Your note", "text": "I cared about hearing both sides and placed Gül, but I would stop here because the calls and return journeys feel like more administration than I want tonight."}`
- 320.010s input `tap`: `{"name": "Send"}`

## Important visible answers

| Real elapsed                  | Input and visible answer                                                                                                                                                                            | Game clock      |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 3.550 s                       | Open office: “The Arslans need a nanny by Tuesday 3 November, 08:00.” Cash ₺3,000; rent ₺5,000 Fri 17:00.                                                                                           | Mon 2 Nov 08:30 |
| 15.151 s                      | Last job: Gül described three years with twins and birthday paper crowns. Incoming Arslans call appeared.                                                                                           | 08:55           |
| 25.239 s                      | Answer: twins Ada and Deniz, both three; Grandmother Saadet present; ₺9000 budget.                                                                                                                  | 08:55           |
| 38.557 / 42.757 s             | Wage ₺8000. Mornings until six; advance notice for longer.                                                                                                                                          | 09:09 / 09:19   |
| 45.491 s                      | Why leave: aunt moved in, “two of us giving orders in one kitchen.” She must leave; call after 11:19.                                                                                               | 09:30           |
| 90.509 s                      | Sevda on crying: “I can sit beside him a while. Not all morning.” “Added to her card: patient.”                                                                                                     | 10:07           |
| 99.953 s                      | Card interpreted that as “Doubt: patient when someone needs time.”                                                                                                                                  | 10:17           |
| 106.871–120.522 s             | Mrs Uslu complained Sevda asked her to count wages; alleged she left the boy crying. Then admitted the calendar matched and “I counted meals as pay; our agreement said wages.”                     | 10:40–10:52     |
| 129.388 s                     | Confronted accusation: “His boots hurt. I took them off and sat beside him by the coat rack. He was crying; I waited. I did not leave him alone.” Sevda then had to leave; return call after 12:59. | 11:10           |
| 140.719 s                     | Family card explained “Karşıyaka (the district across the bay).”                                                                                                                                    | 11:10           |
| 143.584 s                     | Phone form disabled children: “A child cannot take an agency call. Speak to an adult.”                                                                                                              | 11:10           |
| 147.588 s                     | Ece described ironing her work blouse twice, returning to work after three years. Another call disabled: “Finish this conversation before answering another call.”                                  | 11:16           |
| 158.254 s                     | Declined Kayas: “I understand. We will look elsewhere.”                                                                                                                                             | 11:19           |
| 173.953 s                     | Recalled Gül: journey about 35 minutes, arrival 12:10. Interview disabled with arrival explanation.                                                                                                 | 11:35           |
| 200.909 / 242.569 / 251.862 s | Real waits of 20, 20 and 4 seconds: game 11:49, 12:09, then 12:14, Gül available again. I also inspected negotiation between waits.                                                                 | as listed       |
| 259.333 s                     | Asked terms: Sundays for her daughter and grandchildren; same need had already appeared on her card.                                                                                                | 12:28           |
| 262.517 s                     | Gül on crying: “With twins, I let the first child finish crying before asking the second what happened.” Added patient.                                                                             | 12:37           |
| 283.387 s                     | Proposed: both accepted ₺9000, 08:00–18:00, Sunday off, seven working-day trial, agency fee ₺9000. Pınar left without interview or number.                                                          | 12:57           |
| 287.103 s                     | Began agreement: “Gül placed with the Arslans. The deposit, ₺2250, is in the cash box.” Cash rose to ₺5,250. Remaining fee conditional on keeping her after trial.                                  | 13:12           |
| 295.987 s                     | End conversation: next street event 13:42; Gül working at Arslans until 18:00.                                                                                                                      | 13:14           |

## High and low points

Best moment: 129.388 s, Sevda could answer the exact allegation about leaving a child crying. I had distrusted the reference’s complaint about wages; this made listening feel consequential. Highest explicit pulse was 4/5 at 180.755 s: “I care about the women’s accounts and want a placement I can defend; the repeated trips and question limits are starting to feel like administration.” This was the only pulse; play ended before a second three-minute interval.

Worst moment: 129.388 s, immediately after that good answer, Sevda had to leave before I could ask her conditions. The restriction was explained; I still found it annoying.

Every want_quit: 295.766 s, TASTE — “I feel satisfied with one placement, but I do not want a month of managing calls and return journeys tonight. I would put this down here and maybe return for the trial result.” I ended the conversation afterward and stopped at 302.532 s. The wish stayed.

Hard, but kept going: NOT TESTED — I did not search for an easier setting, workaround or accessibility option. I only saw clock settings after stopping, while seeking feedback.

## Clarity and hands-on findings

- DL-20: PASS for the English reached. I could act without translation. Karşıyaka had its meaning beside it on first encounter; its expanded button was visible. On-request reopening of that definition was NOT TESTED. Buca was followed by “About 35 minutes from here”; I did not need further geographic knowledge.
- DL-21: PASS for dates encountered. Mon 2 Nov compared clearly with Tuesday 3 November 08:00 and Wednesday 4 November 08:00. Arrival and recall times included English dates. Cross-month/year comparison: NOT TESTED.
- DL-22: PASS in interview-phone.png at 18.327 s: the whole paper-crown answer, interview identity, question cost, incoming call and all immediate choices fit without scrolling. This establishes this response only; longer conversation responses were not visually checked.
- DL-30: No observed cut-off sentence or overlapping sheet in either inspected screenshot. interview-phone.png has a complete response; negotiate.png has complete deposit text and all six trait buttons, with proposal fixed at the bottom. It does not show the “Read the evidence” text returned by the harness. I did not scroll to establish whether that was below the panel. Other long sheets: NOT TESTED visually. No observed “Scroll ↓” fragment.
- DL-31: FAIL — negotiate.png (209.561 s, 11:53) shows Gül, the Arslans, and rent progress at the top, but the Arslans’ Tuesday placement deadline is absent while the offer is open. I had to remember it. The rent deadline remained readable.
- DL-32: Longest deliberate watch-only wait was 20 real seconds at a time, waiting for Gül to arrive. Across 173.953–251.862 s I wanted another interview; I could inspect negotiation in between, so this was not 78 uninterrupted seconds with nothing possible. I did not use Skip or alter speed. Automatic had visibly slowed while Pınar was picking up her bag.
- DL-33: I selected a woman’s name, then opened an interview to speak. Calling a reference opened a recipient sheet before conversation. Placement opened an offer sheet before the spoken agreement. These were forms/buttons rather than directly touching the illustrated people or phone; I did not try scene coordinates.

Other confusion: At 90.509 s “Added to her card: patient” sounded positive to me, but the card at 99.953 s said “Doubt: patient when someone needs time.” The transcript preserves her actual words, so I could inspect the evidence. I cannot tell from the brief status alone whether it means a trait was supported or merely discussed. No additional DL id assigned.

Gül’s “Needs” appeared on her card at 72.027 s before I asked that question at 259.333 s. I noticed the repeat but cannot explain why it was already recorded. I do not claim a hidden rule or implementation cause.

## Stop and feedback

Stopped at Mon 2 Nov 13:14, after Gül’s placement, with ₺5,250 toward ₺5,000 Friday rent. Reason: TASTE. This was a personal stopping point, not the game ending. I had not seen the trial result and had not checked Gül’s reference. I might voluntarily return to learn how the placement fares. I would close the game rather than leave it running. Gül’s incoming call appeared while opening the menu after my stop; I did not resume gameplay to answer it.

DL-13: Feedback found in Game menu → “Send word ▸”, rather than a control literally called Send feedback. Selected “I’d stop here”. Name: `playtester Sora rebuild-2026-10-23`. Submitted this single line:

> I cared about hearing both sides and placed Gül, but I would stop here because the calls and return journeys feel like more administration than I want tonight.

Tapped Send exactly once at 320.010 s. Visible submission answer: **“Sent. Thank you.”** The Send button became “Back to the game”. No visible player id was shown in the encountered feedback view. No export downloaded. Recording settings were left unchanged.

## Changes I would want as Sora

1. Keep the family’s placement deadline visible while I consider the offer.
2. Say “Added evidence about patience” when recording a doubtful answer, so I do not read it as a positive assessment.
3. Let me see how many questions remain as a number; “a few” made planning my follow-ups harder.

## Evidence

- Original driver diary: `(driver scratch)/wall-clock.jsonl` (all my inputs and original reactions).
- Screenshot: `(driver scratch)/interview-phone.png`, 18.327 s, directly inspected.
- Screenshot: `(driver scratch)/negotiate.png`, 209.561 s, directly inspected.
- Visible answers above came from player-facing driver replies, not hidden state. No claim that a recording or export replays this run.
