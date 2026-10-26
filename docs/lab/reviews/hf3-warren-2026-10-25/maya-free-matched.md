# Recovered report — Maya Chen, Warren

> **Coordinator recovery from original recorded words; not a new player session or original final report.** The player completed live gameplay and stopped naturally. The selected model reached capacity only when asked to write the final report; no player-authored final report exists. This document compiles the supplied trace and coordinator metadata. Quoted reactions below reproduce every nonempty recorded reaction verbatim, with its recorded elapsed time. Assessments are coordinator assessments from trace evidence, not player grades or impressions.

## 1. Session and exposure

- Persona: Maya Chen, 24, Vancouver library assistant; curious narrative-adventure and cooperative-puzzle player.
- Exposure: Return test, with Maya's selected prior Warren history and a prepared matched starting hill. This is a new attempt, not continuation of the earlier random hill.
- Round / arm / paired session: `hf3-warren-r1-matched` / `free` / `hf3-warren-r1-matched-maya-chen`.
- Pre-game diary snapshot / continuity: selected own Warren history; original diary is withheld from this recovery. The session brief identifies the earlier unmatched random hill and says the prepared hill is a new attempt.
- URL: https://warren.adamwhite.work
- Build: coordinator release manifests recorded app `0.6.0`, framework `3.0.0`, commit `43adc501f4c91b93d50bc697c42dcf33014117c6`, clean before and after.
- Device: phone fixture, 360×690, touch/light.
- Access: supplied local player driver, sequential POST harness at `127.0.0.1:19600`; player-facing visible text and screenshots were logged. No production API use is indicated; restore proof says production API blocked.
- Timing: first actionable page at 0.628 s; first game input, Resume, at 5.772 s. Live play lasted 240.848 s (4m00.848s), meeting the zero-minute floor and stopping well before the 25-minute ceiling. Game time advanced from Dawn, 19 Aug, year 1 to Midday, 23 Aug, year 1. The trace shows Slow selected at 44.273 s. No wall-clock accelerated-play claim is made.
- Matching-state proof: `state-restore-proof.json` records `matched: true`; all four expected/restored local storage and database hashes match. Prepared-state hash is `c71ad6d43833967c8c07e754d31ac2602fedb9a9d0ead145b687892a549665a4`.
- Report/model failure: recovery evidence status is “actual gameplay complete; final report request failed capacity”; supervisor records model `gpt-6.1-sol`, effort `low`, tester exit 1, and an observed natural stop. This was a report-only capacity failure, not a gameplay failure.
- Feedback: the player opened Feedback and selected “I would stop here” locally. The recorded words say nothing was sent. No submission or receipt is recorded.

## 2. First minute

The checkpoint was recorded at 60.039 s, after the nominal 60-second mark; the written first-minute answer was logged at 68.867 s. It therefore records the player's checkpoint words late. The answers below are verbatim. PASS/FAIL/NOT TESTED labels are coordinator assessments from the trace, not recorded player grades.

| Item                       | Coordinator assessment and original checkpoint answer                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DL-1 A reason to act       | **PASS.** The recorded answer states a goal: “I want six people to have beds riders cannot reach.” The visible people/rider help and game context were encountered before the checkpoint.                                                                                                                                                                    |
| DL-2 What can I touch      | **PASS.** The player listed “Chalk, look, rub out, furnish, bell, village, help, Journal, zoom and speeds” and said, “I have not marked stone yet.”                                                                                                                                                                                                          |
| DL-3 Urgency and selection | **PASS, limited to recorded evidence.** The answer identifies chalk as selected and says she is about to try stone below the cellar. It does not name a competing urgent cue.                                                                                                                                                                                |
| DL-4 Why the limit         | **NOT TESTED.** The checkpoint answer says, “No unavailable action encountered.”                                                                                                                                                                                                                                                                             |
| DL-5 Readable situation    | **PASS.** The answer identifies the task and helpful result: “Help taught me that the people count checks rider reach, but did not give me a safe depth.”                                                                                                                                                                                                    |
| DL-6 A choice soon         | **PASS, coordinator assessment.** Actionable page recorded at 0.628 s; first input was Resume at 5.772 s. The trace shows controls and help before 30 s and chalk selected at 49.670 s. The checkpoint answer says, “Steady moved almost a day while I read, so I chose Slow.” No long-text timing beyond the visible information/help sequence is asserted. |
| DL-7 Learn by doing        | **PASS for the reached help interaction; other learning interactions NOT TESTED.** The player reports the people-count help clarified rider reach but not safe depth. The checkpoint was reached after several inputs; the trace does not establish an action consequence teaching the safe boundary.                                                        |

Original checkpoint answer (68.867 s):

> I want six people to have beds riders cannot reach. Chalk, look, rub out, furnish, bell, village, help, Journal, zoom and speeds are available. I chose zoom first, then help, and now chalk; I have not marked stone yet. Help taught me that the people count checks rider reach, but did not give me a safe depth. No unavailable action encountered. Steady moved almost a day while I read, so I chose Slow. Chalk is selected and I am about to try the stone below the cellar.

The checkpoint screenshot was captured at 60.039 s. Reading the screenshot, if used, is coordinator verification and is not an original player impression.

## 3. Verbatim diary and important visible answers

All nonempty recorded reactions follow. Elapsed times are seconds from the session log. Input and game clock are included where recorded. A screenshot capture listed as an input is a coordinator artifact capture, not a player action or impression.

- **5.772 s — input: Resume · 19 August; game clock not recorded.** “I remember making a door and then discovering I could not simply shut it. This is a different hill; I want to see whether I can make a small safe room with less guessing.”
- **17.472 s — input: Zoom in; Dawn · 19 Aug · year 1.** “I am zooming before I draw this time. The cellar is still very small on my phone.”
- **21.825 s — input: Information; Morning · 19 Aug · year 1.** “Before I repeat the same shelter plan, I want to find what deeper actually means.”
- **25.684 s — note; Morning · 19 Aug · year 1.** “Tap the people count to check who riders could reach. That is useful; I had treated those circles mostly as bed numbers. The help does not give me a depth to aim for.”
- **39.021 s — input: Close; Afternoon · 19 Aug · year 1.** “Everyone is reachable by riders. The repeated sentence makes that clear, though I still need to discover the safe boundary myself.”
- **44.273 s — input: Slow; Dusk · 19 Aug · year 1.** “A day has nearly gone while I read two panels. I am choosing Slow so I can think about the room.”
- **68.867 s — first-minute note; Morning · 20 Aug · year 1.** “I want six people to have beds riders cannot reach. Chalk, look, rub out, furnish, bell, village, help, Journal, zoom and speeds are available. I chose zoom first, then help, and now chalk; I have not marked stone yet. Help taught me that the people count checks rider reach, but did not give me a safe depth. No unavailable action encountered. Steady moved almost a day while I read, so I chose Slow. Chalk is selected and I am about to try the stone below the cellar.”
- **81.321 s — input: Close reading; Night · 20 Aug · year 1.** “Three sleeping places again, still reachable. I am trying a downward path rather than another door this time.”
- **115.608 s — input: tap at (245, 280); Morning · 21 Aug · year 1.** “I cannot see my dashed plan now. Did my second tap undo the first mark? I am guessing, so I will try the stone just beside the room.”
- **145.109 s — input: wait 20 s; Midday · 21 Aug · year 1.** “I will let someone start this mark before I touch the plan again.”
- **150.555 s — screenshot capture `current-phone.png`; Morning · 22 Aug · year 1.** “Meryem did break through. That is the little bit of life I liked before. Now storage is asking for my attention before I have made the beds safe.”
- **166.858 s — note; Afternoon · 22 Aug · year 1.** “I reread: Dig deeper, or shut doors on every open route. I have gone down another square, but it gives me the same answer. Now the water is dry too. I do not know whether I am making sensible progress or just making a longer unsafe room.”
- **183.642 s — pulse; Night · 22 Aug · year 1; engagement 2/5.** “I am spending more thought on whether I marked the right square than on the people. The new water need makes the small shelter task feel like several jobs.”
- **200.175 s — want_quit; Morning · 23 Aug · year 1; reason CONFUSED.** “I have three beds, but I still cannot tell how to get from this room to safe beds. I do not want to keep adding squares until the sentence changes, especially with water already gone. I would stop here.”
- **232.636 s — input: I would stop here; Midday · 23 Aug · year 1.** “There is no I am confused choice. I would stop here matches what I am doing; I am selecting it locally and sending nothing.”
- **240.848 s — stop; Midday · 23 Aug · year 1; reason CONFUSED.** “I am stopping with three unsafe sleeping places, another digging mark, and dry water jars. Zoom and Slow helped me stay with it, and I liked Meryem breaking through, but I still cannot picture the safe room I am trying to make. I would not leave this running or return voluntarily tonight. Feedback is selected locally, not submitted.”

## 4. Engagement, quitting, and stopping

- Best moment recorded: **150.555 s**, the player says, “Meryem did break through. That is the little bit of life I liked before.” This is the clearest recorded positive moment, not an inferred peak rating.
- Worst moment: **200.175 s**, the recorded `want_quit` reaction says the safe-bed goal remained unclear while water was gone.
- Pulse series: **183.642 s — engagement 2/5**, with the verbatim reason in section 3. No other pulse line is recorded.
- Want to quit: **200.175 s — CONFUSED**, exact words in section 3. The wish to quit persisted to the final stop at 240.848 s; the player explicitly said she would stop here.
- Final stop: **240.848 s — CONFUSED**, natural local stop, not FINISHED and not a tool block. The game was still in progress. The recorded final words say she would not leave it running or return voluntarily that night.
- “Hard, but kept going”: zooming and changing to Slow were recorded as ways that helped her stay with the task. No separate accessibility setting or workaround search is recorded.

## 5. Clarity failures and evidence references

These are coordinator classifications of recorded player words, not new observations. The reactions themselves are reproduced verbatim in section 3.

- **DL-4 / safe boundary:** The help clarified rider reach but “did not give me a depth to aim for” (25.684 s); later the player still needed to “discover the safe boundary myself” (39.021 s). These are reports of uncertainty, not proof that the game has no rule.
- **DL-30 / plan visibility:** At 115.608 s the player said, “I cannot see my dashed plan now. Did my second tap undo the first mark?” The record includes `current-phone.png` at 105.749 s and 150.555 s. These are references for coordinator inspection; the player's recorded impression remains the quoted reaction.
- **Repeated guidance / progress uncertainty:** At 166.858 s the player said a further downward square “gives me the same answer” and questioned whether she was making sensible progress. At 200.175 s she said she could not tell how to get to safe beds. No additional DL identifier is assigned.
- No separate claim is made that the game is broken. The trace shows continued inputs and a natural stop.

## 6. English, dates, phone layout, and hands-on checks

- **DL-20 — English and local terms:** **NOT FULLY TESTED.** The trace records English help, “Dig deeper, or shut doors on every open route,” and the player reports understanding rider reach but not a safe depth. A full test of necessary terms on first use and on request is not established.
- **DL-21 — dates:** **NOT TESTED.** The game clock advanced through dates in August, but the trace does not record a deadline comparison with today across months or years.
- **DL-22 — phone response visibility:** **NOT TESTED by the available text evidence.** The session used a 360×690 phone fixture and captured screenshots, but this recovery does not treat text snapshots as proof of on-screen layout.
- **DL-30 — clipping/overlap:** **NOT TESTED by this recovery.** The recorded uncertainty about a dashed plan is reported under section 5; no independently verified clipped sentence, hidden text, or sheet overlap is claimed.
- **DL-31 — order/answer sheet context:** **NOT TESTED.** No recorded order or answer sheet inspection establishes whether goal progress, deadline, and person remained readable together.
- **DL-32 — longest wait wanting to act:** **NOT RECORDED.** The trace contains waits and inputs but no player statement that identifies a longest stretch of wanting to act while only watching.
- **DL-33 — direct action versus form:** **NOT TESTED.** The trace does not record the player trying to speak, cook, or dig on the target itself and comparing that with a form.
- Screen-by-screen concept counts and sentences reread are **NOT RECORDED as a complete table** in the supplied recovery evidence; I do not infer counts from unseen screens.

## 7. Outcome, stop, feedback, and return

The player resumed the prepared hill, dug and marked ground, observed Meryem break through, saw storage and water needs, and stopped with three sleeping places the player described as unsafe, another digging mark, and dry water jars. Actual game completion was not recorded; this was an incomplete in-progress game stopped naturally at 240.848 s for `CONFUSED`. The first wish to quit persisted to the final stop. The player said she would not leave the game running or return voluntarily that night.

Feedback was opened. The player selected “I would stop here” locally and explicitly said she was sending nothing. No feedback submission, receipt, player id, or export is recorded. The report-only capacity failure does not change the completed gameplay or its natural stop.

## 8. Recorded wishes

The player recorded these wishes or needs. They are quoted without ranking or proposed fixes; no additional asks are inferred.

1. “I want six people to have beds riders cannot reach.” (first-minute note, 68.867 s)
2. “The help does not give me a depth to aim for.” (25.684 s)
3. “I still cannot picture the safe room I am trying to make.” (stop, 240.848 s)
