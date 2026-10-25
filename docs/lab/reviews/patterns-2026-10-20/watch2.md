# The Night Watch — Dara, source-unread playtest

Dara, 36, paramedic on rotating shifts. Plays Into the Breach, Bad North and This War of Mine. Wants to place people well and see the next morning's consequence. Dislikes not knowing whether she is winning. Between calls, phone one-handed.

- URL: https://human.adamwhite.work/watch/
- Build: no build identifier seen.
- Device: 360×690 CSS px, Chromium, touch/mobile emulation, light mode, default text size. Headless real browser, one persistent page in a long-lived local Node process. Normal taps, rendered text and screenshots only.
- First actionable screen: 2026-10-20 15:24:17.714 UTC (10:24:17.714 America/Chicago).
- Phone play stopped at **239.2 s (3:59.2)**, second dusk. Eight minutes was a ceiling; I quit voluntarily. One 1280×800 look followed at 239.3 s. No resumed play.
- First-minute checkpoint: **81.6 s**, 21.6 s late due to tool/observation time. An initial observation was captured at 55.2 s. No game input between 48.4 s and the written checkpoint. Later discoveries do not change its answers.
- Watch was the initial speed. Switched to Fast at 145.7 s to reach morning. No clock scripts, batched decisions or skipped simulation. Clock continued while tools ran; dawn visibly said “Clock stopped.”
- Two exact-button targeting attempts timed out: Kian and Watchers and bell. Coordinate taps on the visible card/link worked. These are automation limitations, not game failures. One wheel attempt did not scroll the content panel. Normal button targeting later scrolled On to dusk into view. Rendered text extraction includes text below the viewport; phone visibility findings below rely on screenshots, not that transcript.
- Read only the assignment and the two permitted game instruction/checklist files. No source, tests, other game documents, prior reports, bundles, network payloads or hidden game state inspected. No run sent, consent changed or telemetry submission control used. No export downloaded. Browser process stopped by exact PID 60450.

## First minute

Checkpoint at 81.6 s after the first actionable opening screen (late due to tool and observation time). No further game inputs until these answers were written.

| Item | Status                           | Original checkpoint answer                                                                                                                                                                                                                                                                                                                            |
| ---- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | PASS                             | I want all six people and the grain alive until thaw. “Bring every soul and the granary to the thaw,” “Six souls still here” and the grain line tell me why.                                                                                                                                                                                          |
| DL-2 | PASS                             | The opening gold button, watcher cards, outlined post buttons, speed buttons and bell look tappable. I tapped Kian's card and an East wall scene post successfully. My attempt to address Kian as an exact button name timed out; that was an automation targeting miss, not an inert-control finding. I have not tried decorative village buildings. |
| DL-3 | PASS                             | Pack tracks make Gate urgent. While ordering, Ask and Gate had outlines; after my order Kian said East wall, asked. At night the lantern lights Gate and its button has an outline. No competing urgent event yet.                                                                                                                                    |
| DL-4 | NOT TESTED                       | I have met no unavailable action.                                                                                                                                                                                                                                                                                                                     |
| DL-5 | PASS                             | I can move the lantern to one of four stretches or ring the bell. “Only the lantern’s stretch shows what approaches. Your voice reaches the next stretch” explains what is underway.                                                                                                                                                                  |
| DL-6 | PASS                             | The opening offered entry immediately, at 0 s. Watcher/post choices were exposed by 7.1 s, with no mandatory help. First input was Go up to the wall at 7.1 s; first meaningful placement input was selecting Kian at 32.1 s, followed by East wall at 43.6 s. Choices were available within 30 s.                                                    |
| DL-7 | PASS (reached interactions only) | I selected Kian, left Ask selected and tapped East wall. “East wall, asked · on the Gate” taught me that the order and actual position differ. Begin the watch brought up lantern and bell controls. No help used. Two interactions reached (placement and starting the watch); lantern, bell and pressure changes not yet tested.                    |


Checkpoint evidence accounting: DL-7 covers two reached interaction types. Three unreached types were **NOT TESTED** at that checkpoint: lantern movement, bell pulling, and changing pressure. Later play does not change those checkpoint gaps.

## Verbatim diary

The reactions below preserve the wall-clock log wording, including mistaken expectations and subsequent corrections. Times are real elapsed seconds, not game time. The full timestamped log is `(driver scratch)/retest/watch2-shots/wall-clock.jsonl`.

- **0.0 s** — Open live page at 360x690

  “First screen where I can act.”

- **3.3 s** — Look at opening

  “I am looking for where to put my people. I expect the buttons to be usable.”

- **7.1 s** — Tap Go up to the wall

  “Bring every soul and the granary to the thaw gives me a goal. I want to see the posts before reading help.”

- **26.5 s** — Look again

  “I can read the watcher names, but my tap has not yet given me a selection I can see.”

- **32.0 s** — Tap Kian card at bottom of phone

  “The cards look tappable. The other people and lantern controls run below the bottom edge; Begin the watch stays fixed.”

- **43.6 s** — Tap East wall scene post with Kian selected

  “Ask is selected. I will leave the pressure gentle and move the fast one east, while Tamar covers the tracks.”

- **43.7 s** — Read result of east order

  “I am looking for whether he accepted, rather than just whether I selected a destination.”

- **48.4 s** — Tap Begin the watch

  “East wall, asked · on the Gate tells me the order and actual position differ. Good. I have enough of a spread to start.”

- **55.1 s** — First minute checkpoint; no game input

  “I want all six people and the grain alive until thaw. Tracks make Gate urgent; I moved Kian east and began the watch. I can see the goal while ordering. The first card tap by button name was an automation miss, not proof the card is inert.”

- **81.6 s** — First minute observations frozen before continuing

  “I can move the lantern or ring the bell now. Gate is selected by the bright light and outlined Gate button. I do not see an unavailable action. Moving Kian taught me that an ask is an order to travel, not an instant teleport.”

- **87.6 s** — Tap West wall lantern control

  “I want to sweep the dark side rather than ring a bell with no threat. The lantern buttons make that easy.”

- **92.9 s** — Watch West wall at default speed

  “I can see the lit patch move. I am waiting for something to approach, but I do not yet know how long one night will take.”

- **113.1 s** — Tap underlined Watchers and bell

  “I am opening the details link to check on the people.”

- **113.1 s** — Read watcher details

  “I expect tiredness or worry in their words, not a stat sheet.”

- **121.4 s** — Close Watchers and bell

  “Grain is gone worries me, though the top still says plenty. I need the bell back on screen now.”

- **121.5 s** — Look for bell after closing details

  “I want the lantern back on Gate. I cannot tell whether Tamar failed to see the intruder or could not stop it.”

- **126.8 s** — Move lantern to Gate

  “The warning points to Gate, so I will light the road again.”

- **126.9 s** — Ring the bell once

  “The rope wears with every pull. This threat is worth one pull, even if I am late.”

- **132.0 s** — Watch bell response

  “I like that the lantern has travel time. I need to see whether the bell actually recalls people.”

- **137.7 s** — Tap Mara on the wall

  “Mara stayed west after the bell. I want to know if she heard it or is choosing to stay.”

- **137.8 s** — Read Mara selection

  “I am checking whether I can speak directly to the watcher in the scene.”

- **145.6 s** — Close Mara conversation

  “She says she is keeping watch and sees nothing close. That is understandable, but it does not tell me why the bell did not move her.”

- **145.7 s** — Switch Watch to Fast

  “I have swept and checked a watcher. I want to reach morning and see what that grain loss means.”

- **168.7 s** — Watch on Fast for about 20 seconds

  “The gate is quiet. I am mostly waiting for dawn now; I would rather place people again than move a light with no new clue.”

- **186.6 s** — Watch for dawn on Fast

  “I want the morning consequence before I decide whether to stay for another night.”

- **193.3 s** — Ask Tamar Tell me about last night

  “The morning says wolves crossed Gate but Tamar drove them off. I want her account. It also says nobody stood east, although I thought I put Kian there.”

- **193.4 s** — Read Tamar morning answer

  “Each talk costs sleep, so I am choosing the Gate account first.”

- **201.7 s** — Ask Kian Tell me about last night

  “Cold. Long. Nothing I could not stand is mood, not an account of the breach. I will spend the last talk on Kian, because I am unsure what happened to his placement.”

- **201.7 s** — Read Kian answer and available morning actions

  “I am looking for why the morning called east empty.”

- **209.0 s** — Scroll down morning report

  “Kian says he went home because he could not stand up straight. That answers the empty wall. I had read fast and eager as ready for duty; I had not seen tiredness before sending him east.”

- **209.1 s** — Read lower morning report

  “I have to scroll to see the result and the way into the next night. The goal strip stays at the top.”

- **227.2 s** — Tap On to dusk; browser scrolls button into view

  “The wheel attempt did not move the panel; that was a control limitation in my browser setup. I will use the normal On to dusk button. I want to see whether I can rest Kian next time.”

- **227.2 s** — Read second dusk

  “I am checking whether the next night gives me a better way to place tired people.”

- **239.2 s** — STOP playing at second dusk; no more gameplay inputs

  “I am leaving here. More people have arrived, but I still cannot judge how far I am from thaw or how costly the breach was. I got one useful morning consequence; I do not want another stretch of watching between calls. I might return for a longer sit, not another eight-minute break.”

- **239.3 s** — One post-stop look at 1280x800; no gameplay input

  “The desktop shows all five watcher cards and lantern choices together. The phone had shown the daily account instead, with the people below the fold.”

- **247.2 s** — Correction after viewing the one desktop screenshot

  “My expectation that desktop showed all five cards and lantern controls was wrong. The screenshot shows Tamar, Kian and part of Mara; the daily account still pushes the rest below the visible panel. I have stopped and will not resume.”

## Important visible answers

These are observed answers, separate from my original diary reactions.

| Elapsed       | Input / observation                 | Answer                                                                                                                                                                                                                             | Screenshot                            |
| ------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 0–3.3 s       | Opening                             | “Bring every soul and the granary to the thaw.”                                                                                                                                                                                    | 01-opening.png                        |
| 26.5 s        | First dusk                          | “The scout found pack tracks on the gate road.” Tamar and top of Kian card visible; further choices below phone viewport.                                                                                                          | 04-current.png                        |
| 32.1 s        | Select Kian                         | Ask, Urge, Insist; “likely, maybe”; goal, grain, souls, warning and Kian remain visible above scene.                                                                                                                               | 05-selected.png                       |
| 43.7 s        | Ask Kian to East wall through scene | “East wall, asked · on the Gate.”                                                                                                                                                                                                  | 06-kian-east.png                      |
| 55.2 s        | After Begin the watch               | “Only the lantern’s stretch shows what approaches. Your voice reaches the next stretch.” Gate lit and selected.                                                                                                                    | 07-first-minute.png                   |
| 92.9 s        | Move lantern west                   | West wall lit; its button outlined.                                                                                                                                                                                                | 09-west.png                           |
| 113.2 s       | Open Watchers and bell              | “Movement in the dark on the gate road.” “Something at the foot of the gate.” “Grain is gone: something got over the gate.” Top still says grain plenty. Bell explanation extends below the screen.                                | 10-watchers.png                       |
| 132.1 s       | After one bell pull                 | “The bell rings out from the Gate; the east wall hears it faintly.” “The rope is fraying.”                                                                                                                                         | 12-bell.png                           |
| 137.8 s       | Tap Mara in scene                   | “I’m keeping watch. Nothing close that I can make out.” Mara's name and actual post remain in top strip.                                                                                                                           | 13-mara.png                           |
| 168.8 s       | Fast                                | “Fast · 12 min/s”; “Before dawn.”                                                                                                                                                                                                  | 14-fast.png                           |
| 186.7 s       | Dawn                                | “Clock stopped.” Morning talk controls visible, report and On to dusk below viewport. Rendered report: “Wolves got over the Gate during the raid. Tamar drove off wolves at the Gate.” “Nobody stood the east wall. Nothing came.” | 15-dawn.png                           |
| 193.4 s       | Ask Tamar about last night          | “Cold. Long. Nothing I couldn’t stand.” “Daylight enough for one more talk.”                                                                                                                                                       | 16-tamar-dawn.png                     |
| 201.8 s       | Ask Kian about last night           | “I went home to sleep. I’m sorry. I couldn’t stand up straight at the east wall.” “The day’s work calls. No more talks this morning.”                                                                                              | 17-last-talk.png                      |
| 227.3–239.2 s | On to dusk                          | Second night; eight souls; mill-race tracks. Daily account occupies visible panel; watcher cards below it.                                                                                                                         | 19-second-dusk.png; 20-phone-stop.png |
| 239.3 s       | Single desktop look after stopping  | Daily account, Tamar, Kian and part of Mara visible in right panel. Remaining cards and lantern options not all visible.                                                                                                           | 21-desktop-after-stop.png             |

All screenshot names refer to `(driver scratch)/retest/watch2-shots/`.

## Best, worst, and leaving

**Best:** Kian's morning answer. I had seen an empty east wall in the report despite giving him the post. “I went home to sleep” turned that discrepancy into a person's decision. This was the placement-and-consequence experience I wanted.

**Worst:** I was checking the people when the breach notices appeared. The expanded details put the bell and lantern controls below the visible phone panel. I closed the details before responding. I could read the warning, but my immediate response had lost its screen space.

At 145.7 s I wanted morning more than another lantern sweep, so I chose Fast. At 168.8 s I recorded that I was mostly waiting for dawn. I was not forced to wait: lantern and bell remained available. The quiet watch had become less interesting than the next placement decision.

I quit at 239.2 s, second dusk. The new arrivals were interesting, but “thaw is still far off” and “plenty” did not let me judge the distance to success or the importance of the breach. I would consider returning for a longer uninterrupted session. I would not choose another eight-minute between-calls session right now.

## Clarity findings

- **DL-22 FAIL — immediate controls leave the phone screen.** In `10-watchers.png`, expanding Watchers and bell puts lantern selection and Ring the bell below the visible panel while threat notices remain above. In `13-mara.png`, opening Mara's answer leaves the lantern buttons on screen but the bell below it. At second dusk, the daily account takes the panel and none of the watcher cards are visible (`20-phone-stop.png`). Begin the watch stays reachable. The failure is the visible arrangement; the offscreen controls exist.
- **DL-30 FAIL in the sampled viewport — essential sentences continue below the panel edge.** `10-watchers.png` shows the beginning “Pull from anywhere. Calls back watchers who hear it,” at the bottom, with the rest of the explanation offscreen. `17-last-talk.png` shows “Wolves got over the Gate during the raid.” and the beginning of the next line, while the rest of the account and On to dusk are below the edge. There was no “Scroll ↓” label observed. I did not establish permanent clipping or loss of text: the issue is essential text running outside the visible panel. My wheel attempt did not move it; that input limitation does not prove scrolling is broken.
- **DL-5 FAIL later in play — I could not judge the scale of the loss or progress to thaw.** “Grain is gone: something got over the gate” appeared while “Grain: plenty above spring food needs” remained above (`10-watchers.png`, `11-gate-loss.png`). I could not tell whether “gone” meant some grain or all grain. The top gives a reassuring broad condition, but I still did not understand how costly this night was. This does not establish that the game lacks a rule or tracks no loss. The first-minute DL-5 pass remains unchanged.

The dawn text “Nobody stood the east wall” initially confused me. Kian's later answer explained it. I am recording a discovery, not asserting a simulation defect. I also do not know why the bell did not visibly move Mara. She said she was keeping watch; I did not investigate further.

## Required language, layout, and hands-on checks

| Item                            | Status                                                | Evidence / limit                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DL-20 English                   | PASS for reached play                                 | All action-critical labels and spoken answers I met were understandable in English. No unexplained necessary local term encountered.                                                                                                                                                                                                                                                             |
| DL-21 Dates                     | NOT TESTED for deadline comparison                    | First and second night of the first winter, Dusk, Night, Midnight, Before dawn and Dawn were readable English. I met no dated deadline with which to compare today. “The thaw is still far off” did not tell me how many nights remained. No return-from-break comparison tested.                                                                                                                |
| DL-22 Phone response visibility | FAIL                                                  | Details and morning/daily account push controls or essential context below the fixture; see screenshots and findings above.                                                                                                                                                                                                                                                                      |
| DL-30 Cut-off text              | FAIL in sampled layout                                | Bell explanation and morning account continue below the phone panel edge. No claim of permanent truncation.                                                                                                                                                                                                                                                                                      |
| DL-31 Read state while acting   | PASS for sampled selections                           | In `05-selected.png`, Kian, requested/actual post, first night at dusk, grain, souls and scout warning stay readable while Ask/Urge/Insist and post responses are open. In `13-mara.png`, Mara, her post, current night and goal condition stay visible while she speaks. Thaw is only described as far off; no precise thaw deadline was available to read. No other order/answer sheet tested. |
| DL-32 Hands-on availability     | PASS for observed stretches; builder check NOT TESTED | No forced watch-only stretch established. I could move the lantern, pull the bell or tap a watcher. Longest deliberate uninterrupted wait was about 23.1 s after choosing Fast (145.7–168.8 s); I wanted dawn. Another 17.9 s passed to the next dawn observation. These are voluntary waits, not evidence that no act existed.                                                                  |
| DL-33 Scene acts                | PASS for reached watch interactions                   | I tapped East wall in the scene after choosing Kian. I tapped Mara in the scene and got her spoken answer directly. Lantern movement also had direct wall taps available. Dusk planning opened Ask/Urge/Insist and post choices; I left Ask selected. No other core verb tested.                                                                                                                 |

## Other observed checks and evidence gaps

- **DL-4:** First minute NOT TESTED. Later, the morning explicitly says one talk remains, then “The day’s work calls. No more talks this morning.” This explains the immediate circumstance. I did not reach a later dawn to verify recovery. Disabled dawn speed buttons accompanied “Clock stopped.” No builder assessment of quotas made.
- **DL-12 PASS for one night boundary:** Dawn is explicit; the clock says stopped and On to dusk continues. Whole-game ending NOT TESTED.
- **DL-13 PASS for sampled accepted inputs:** Placement updated requested/actual post; lantern moved visibly; bell gave a message and fraying rope; conversations showed answers. The automation targeting failures are excluded. Immediate text captures sometimes preceded the next render; a subsequent observation showed the response. No duplicate-input test performed.
- **DL-14:** Bell wear and talk sleep cost were stated before those actions. Full cost/risk coverage NOT TESTED. I had not identified Kian's exhaustion before assigning him; I cannot tell whether I missed a cue or learned something previously unknown.
- **DL-15:** Normal Watch showed 4 min/s; Fast later showed 12 min/s. Around the first threat, the display read 2.2–2.4 min/s, then returned to 4. I did not meet and answer a live choice from Fast, so that prescribed test is NOT TESTED. Dawn stopped time visibly.
- **DL-17 PASS for sampled people:** “tiring,” “jumpy by nature,” and direct speech conveyed condition. No mood or fatigue percentage seen.
- **DL-23, DL-25:** No hit-area measurement, 200% text, 320 px, dark mode or safe-area test: NOT TESTED.
- **DL-24:** Back to watchers / Back to the wall worked for the reached selections. Stacked sheets, nested cancellation and focus restoration NOT TESTED.
- **DL-26:** Game menu remained visible; not opened. Save/run controls inside it NOT TESTED.
- **DL-27–DL-29:** Resume, send, export and replay NOT TESTED. Sending was not authorized. No export path exists.
- Builder-only checks and any checklist interaction not described here are NOT TESTED. No exceptions inferred from unseen design documents.

## Up to three changes I would want as Dara

1. Keep the bell and lantern choices on screen when I check a watcher or expand Watchers and bell. I want to read a person and still respond to the wall.
2. Let me read the morning outcome before spending scarce talks. On the phone, the talks appeared first and the raid account was lower down.
3. Tell me whether that breach was a small loss or a serious step toward failure, and give me a clearer sense of how far this winter has to go. Approximate words are enough; I want to know how I am doing.
