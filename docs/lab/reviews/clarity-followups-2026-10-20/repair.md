Screenshots stayed in the driver's scratch folder and are not kept.

# Small Works — source-unread playtest

## Session

- Persona: Iris, 52, retired electrician. Plays Assemble with Care and House Flipper. Wants to see what she did to the object. Phone at the kitchen table.
- URL: https://repair.adamwhite.work
- Build: no build identifier observed. The opening object was “Mum’s walking lantern.”
- Device: 360×690 CSS px, touch emulation, light color preference, default text size. The page rendered with a dark background despite that preference; I did not change settings.
- Access: headless Chromium through Playwright, driven through my own persistent local HTTP server. One phone page stayed open throughout play. Screenshots, rendered page text, coordinate taps and scrolling only. No game source, internal state, bundles, network payloads, storage or debug APIs inspected. The only supplied documents read were the playtester prompt and lab design-language checklist.
- First actionable screen: 2026-10-20 10:18:18.462 UTC (05:18:18.462 America/Chicago).
- Natural stop: 10:21:56.078 UTC, elapsed **217.616 s (3 min 37.616 s)**. Eight minutes was the ceiling; it did not expire.
- First-minute checkpoint: **65.980 s**, 5.980 s late while composing/recording it. No game input between 42.519 s and that checkpoint.
- No speed control used. Actions showed costs in game minutes; those are separate from real elapsed time. Meter readings displayed Day 1 · 10:10 and 10:20; return displayed Day 1 · 11:25. I did not establish how time behaves during a quiet wait.
- No tool failure during play. No consent changes, telemetry submission, run send or export download.
- After stopping, one fresh browser context showed the first screen at 1280×800, light preference. No desktop gameplay. Screenshot at 10:22:09.093 UTC.

## First minute

These are the original checkpoint answers, recorded before continuing. The last preserved screen was 09-before-checkpoint.png at 50.013 s; no subsequent game input occurred before this checkpoint.

| Item | Original checkpoint answer                                                                                                                                                                                                                                                                                                   |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | PASS — I want to stop Mum’s lantern going dark when she carries it to the evening gathering. Her opening request and my carry test told me.                                                                                                                                                                                  |
| DL-2 | PASS — Carry, Look inside, the Object/Meter/Repair/Notes tabs, the component-name disclosure and Look closely look tappable. I used the name list because the circuit labels are tiny. One tap landed on the disclosure after the page continued moving; I have not established an inert control.                            |
| DL-3 | PASS — The gold Carry button drew me first; the instruction panel told me what to try. Contact has a visible selection outline and its name below. No deadline is visible in my current view.                                                                                                                                |
| DL-4 | PASS — Look closely was grey when no component was selected; Choose a component explained what I needed. Selecting Contact enabled it.                                                                                                                                                                                       |
| DL-5 | PASS — I can choose a part and Look closely, or use the Meter tab. The latest visible answer is Contact: The exposed metal is aged and dull.                                                                                                                                                                                 |
| DL-6 | PASS — Carry was available at the first usable screen (0 s); first input was at 7.228 s. First component choice was available by 14.55 s, before 30 s. The opening request was short.                                                                                                                                        |
| DL-7 | PASS for the three interactions reached — Carry showed the light going out; Look inside exposed a circuit; selecting Contact then Look closely described dull metal. I used the inline guidance and component-name list. Meter and Repair interactions are NOT TESTED (2 unreached interaction families at this checkpoint). |

Timing clarification, without changing the checkpoint: Carry was a guided first action. The first choice among named components was available by 14.550 s; I successfully chose Contact at 37.457 s. The tap at 26.170 s opened the component-name list instead. The initial request contained 27 words; I encountered short inline instructions, not a long story passage.

## Verbatim diary

The quoted reactions below preserve their original wording. UTC timestamps and elapsed times were written as they occurred to repair-shots/timeline.jsonl. Input/result entries are separate evidence, not rewritten diary quotations.

| UTC          |   Elapsed | Verbatim reaction                                                                                                                                                                                                                                                      |
| ------------ | --------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10:18:21.828 |   3.366 s | “I want to find the loose connection. It works on the table and fails when carried; that sounds familiar. Carry looks like the first thing to try.”                                                                                                                    |
| 10:18:29.992 |  11.530 s | “The lantern went dark when I carried it. Good, I can see the fault. Now it says to open the cover; I am looking for the cover on the drawing.”                                                                                                                        |
| 10:18:38.096 |  19.634 s | “I opened it, but I still mostly see the outside. The parts seem to be below the bottom of my phone.”                                                                                                                                                                  |
| 10:18:52.226 |  33.764 s | “The page moved further after I scrolled. My tap has opened the component-name list instead of selecting the contact. I can use that list; the drawing labels are tiny.”                                                                                               |
| 10:19:08.437 |  49.975 s | “The contact is aged and dull. I would clean that, but the game now wants a battery measurement while carried. I can follow that, though I want my hands on the actual contact.”                                                                                       |
| 10:19:32.419 |  73.957 s | “First minute checkpoint recorded at 65.980 seconds; writing the checkpoint made it 5.980 seconds late. I took no further game input between 42.519 seconds and the checkpoint. I want to see what repair I can do to this contact.”                                   |
| 10:19:48.974 |  90.512 s | “Clean and Adjust both take 20 minutes. Replace says no contact stocked. Cleaning is a sensible first try on dull metal, and I would like to see it brighten.”                                                                                                         |
| 10:19:54.059 |  95.597 s | “It says I cleaned the mating contact faces. The little circuit symbol looks the same to me. I wanted that satisfying before and after, but I can at least carry it to find out.”                                                                                      |
| 10:20:07.902 | 109.440 s | “Still goes out. Fair enough: dull did not prove dirty was the fault. I will measure it before changing anything else.”                                                                                                                                                |
| 10:20:21.235 | 122.773 s | “The meter has proper voltage and continuity choices. Carry is already selected. It wants A and 0, so I am putting the red probe at A first.”                                                                                                                          |
| 10:20:36.195 | 137.733 s | “Six volts at the battery. That is a useful result, and I like seeing a real meter reading. The guide asks for B to C across the switch next.”                                                                                                                         |
| 10:20:49.806 | 151.344 s | “Full battery voltage across the switch while it moves: there is my open circuit. This is the first moment I feel I have diagnosed something, rather than just followed buttons.”                                                                                      |
| 10:21:08.361 | 169.899 s | “The outside looks intact. That fits an internal switch fault. I have one new switch, so I would use it for Mum rather than gamble on a salvage part.”                                                                                                                 |
| 10:21:27.904 | 189.442 s | “There we are: bright and steady while carried. That is satisfying. I wish I had seen the switch itself change, but the light staying on does show the repair worked.”                                                                                                 |
| 10:21:56.072 | 217.610 s | “I can carry the light out to the garden table. That is a pleasant ending. I am done for now: I fixed the fault, but I have had enough scrolling around the circuit on this phone. I would come back for another small repair if I could see more of the actual work.” |

Evidence qualification: the reaction at 19.634 s is my original impression, not proof that the parts were absent. Screenshot 03 already shows the circuit after the view repositioned. The scroll and following tap also involved changing screen positions. I do not count that misdirected coordinate tap as a demonstrated inert control or game defect.

## Inputs and visible answers

All screenshots are in repair-shots/. File names describe the intended capture; for example, 05-contact-selected.png actually shows the opened list, not a selected contact.

|   Elapsed | Input                | Visible answer / screenshot                                                                                                                                                                                      |
| --------: | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   0.077 s | First screen         | Mum wants a lantern she can carry to the evening gathering; “Try carrying it.” Carry · 15 min. 01-first-screen.png                                                                                               |
|   7.228 s | Carry                | Lantern dark; “The light goes out while carried.” “Open the cover to look inside.” 02-carry.png                                                                                                                  |
|  14.512 s | Look inside          | Circuit and Object/Meter/Repair/Notes tabs. “Choose a part inside, then examine it.” Look closely unavailable until selection. 03-inside.png                                                                     |
|  19.653 s | Scroll down          | Circuit and component-name disclosure. 04-parts-scroll.png                                                                                                                                                       |
|  26.170 s | Intended Contact tap | Component-name list opened. 05-contact-selected.png, 06-list-still.png                                                                                                                                           |
|  37.457 s | Contact in name list | Contact outlined; Look closely enabled. 07-contact.png                                                                                                                                                           |
|  42.519 s | Look closely         | “Contact: The exposed metal is aged and dull.” 08-contact-examined.png, 09-before-checkpoint.png                                                                                                                 |
|  73.975 s | Repair tab           | Contact repair actions below circuit. 10-repair-tab.png                                                                                                                                                          |
|  81.475 s | Scroll down          | Clean · 20 min; Adjust · 20 min; Replace unavailable: “No contact stocked.” 11-clean-option.png                                                                                                                  |
|  90.533 s | Clean Contact        | “Cleaned the mating contact faces; run under load and movement to check the result.” Symbol looked unchanged to me. 12-cleaned.png                                                                               |
|  95.611 s | Scroll up            | “The part has changed. Carry the lantern again to see what changed.” Test the lantern and Carry available. 13-return-to-carry.png                                                                                |
| 103.971 s | Carry                | “The light goes out while carried.” Guide asks to start at battery, A ↔ 0, while carried. 14-test-after-clean.png, 15-meter-prompt.png                                                                           |
| 112.953 s | Pick up the meter    | Voltage/continuity, power and conditions, probe controls, terminals 0/A/B/C/D. No reading yet. 16-meter.png                                                                                                      |
| 122.802 s | Terminal A           | Red probe · A; black probe becomes selected. 17-red-A.png                                                                                                                                                        |
| 126.885 s | Terminal 0           | Black probe · 0; Read meter enabled. 18-both-probes.png                                                                                                                                                          |
| 131.241 s | Read meter           | 6.00 V, A → 0 · Day 1 · 10:10. Guide: compare both sides of switch while it moves, B ↔ C. 19-battery-reading.png                                                                                                 |
| 137.749 s | Terminal B           | Red probe · B. 20-switch-red.png                                                                                                                                                                                 |
| 141.834 s | Terminal C           | Black probe · C. Previous reading still labelled A → 0. 21-switch-probes.png                                                                                                                                     |
| 145.679 s | Read meter           | 6.00 V, B → C · Day 1 · 10:20. “Large voltage drop across this measured span.” Guide points to switch. 22-switch-reading.png                                                                                     |
| 151.359 s | Work on the part     | Repair tab, Switch selected. 23-switch-work.png                                                                                                                                                                  |
| 154.319 s | Scroll down          | Look closely; Clean/Adjust · 20 min; Replace · 30 min · 1 switch (1 stocked). 24-switch-options.png                                                                                                              |
| 162.175 s | Look closely         | “Switch: The outside looks intact.” 25-switch-examined.png. Rendered guide text above explained the single new switch and risky salvage alternative; it was outside the current screenshot viewport.             |
| 169.913 s | Replace Switch       | “Replaced Switch. Test the object again.” Replace now unavailable: “No switch stocked.” 26-switch-replaced.png                                                                                                   |
| 173.439 s | Scroll up            | Test the lantern prompt and Carry. 27-test-ready.png                                                                                                                                                             |
| 181.764 s | Carry                | Lit lantern; “Last test: Bright and steady while carried.” “It stays lit when carried. Give it back to Mum.” Return to Mum · 10 min. 28-working-carry.png                                                        |
| 189.456 s | Return to Mum        | Workbench navigation and “Mum’s walking lantern · returned.” Day 1 · 11:25 · £24. Detailed result below viewport. 29-returned.png                                                                                |
| 194.506 s | Scroll down          | “Checked return · on time”; “A light Mum can carry”; “I can carry the light out to the garden table.” “Recorded checks movement passed.” Family favour £0. Choose another object available. 30-return-result.png |
| 217.616 s | Stop                 | Successful returned lantern; no second object chosen.                                                                                                                                                            |

## Best, worst and stopping

Best moment: getting 6.00 V across the switch in the movement condition, understanding why that pointed to the switch, then seeing the lantern stay bright after replacement. It used Iris’s electrical knowledge. Mum’s return line gave the repair a purpose.

Worst moment: cleaning the contact gave me a sentence about cleaning while the circuit looked the same. Replacing the switch also looked like changing a status rather than handling a part. The working light eventually supplied a visible consequence; I did not see the actual repair work change the component.

Mild frustration began around 33.764 s with tiny circuit labels and moving screen positions. Disappointment about the lack of a visible cleaned part was recorded at 95.597 s. I did not record a separate boredom onset. At 217.610 s I wanted to stop: one repair felt complete and I had had enough scrolling. I would return for another small repair, with reservations about the phone handling and the amount of physical work shown.

## Clarity findings

**DL-22: FAIL — I kept moving between the repair controls and the object I was testing.** In 11-clean-option.png, the actions and contact description fit, but the lantern and guide are above the viewport. After cleaning, 12-cleaned.png shows the result but the suggested Carry test is above the viewport. Reaching it required the scroll at 95.611 s. Work on the part returned me to a screen where the switch repair controls were below the viewport (23-switch-work.png), requiring another scroll. The return result was below the phone’s first view after Return to Mum (29-returned.png versus 30-return-result.png). This is observed scrolling, not an inference that controls were missing. The meter view itself was much better: guidance, reading, probe placement and Read meter fit together (16–22).

The tiny circuit labels were difficult to read (04-parts-scroll.png). The labelled component-name list provided a usable alternative (06-list-still.png). I did not measure target geometry, so I do not claim a DL-23 size failure. I did not run the 320 px/200% text checks required to establish DL-25.

The unchanging part artwork is a player preference failure, not a demonstrated DL-13 failure: cleaning and replacement were promptly acknowledged in text, and the final carry test visibly changed the lamp’s behavior. I do not assign a checklist failure merely because cleaning did not fix the fault. I guessed that dull metal might be the cause; the game had not promised that.

Additional bounded observations:

- DL-12 PASS for the repair boundary reached: returned status, checked result, Mum’s line and Choose another object made it clear this repair was complete and more play remained. No whole-game ending tested.
- DL-13 PASS for the accepted inputs reached: selection, probe labels, meter readings, cleaning, replacement, tests and return all gave visible acknowledgements. No deliberate repeat/double-tap test performed.
- DL-14 PASS for the repair costs reached: time and stocked-part cost were shown before replacement. No claim about unvisited choices or all hidden risks.
- DL-19: the dull contact led to my hypothesis, not a false promise. I could distinguish a failed trial from an input not working.
- DL-15 NOT TESTED as a live timing/slowdown test. No quiet wait, speed change or expiring choice reached. Do not infer autonomous or frozen time from these observations.
- Salvage, supply purchases, other objects, reload/resume, menus, export/import and sending: NOT TESTED. Upload was outside authorization. No builder checks performed. Other checklist items without direct evidence remain NOT TESTED.

## English, dates and phone

| Item                         | Status                             | Evidence and limit                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-20 English                | PASS for play reached              | Carry, Look inside, Contact, Switch, Voltage, Continuity, probe instructions, repair costs and return instructions were understandable in English. No necessary unexplained local term encountered.                                                                                                                     |
| DL-21 Dates                  | NOT TESTED for deadline comparison | “Day 1 · 10:10”, “Day 1 · 10:20” and “Returned Day 1 · 11:25” were readable. The result said “on time.” I did not meet an explicit dated deadline to compare against today, or test across months/years or after a break. The opening “evening gathering” conveyed purpose but did not establish a calendar comparison. |
| DL-22 Phone response/context | FAIL                               | Repeated scrolling between circuit/repair actions, guide, test and return outcome. Meter view passed this narrower layout check; that does not erase the other screens.                                                                                                                                                 |

Post-session desktop first-screen look: 31-desktop-first-screen.png. At 1280×800, Mum’s request, Try carrying it, the whole lantern and Carry were all visible. This was only a first-screen look; I did not retest repair layouts on desktop.

## Changes I would want, ranked

1. Let me see the contact faces and switch, and see what cleaning or replacement did to them. The lamp’s working state was rewarding; I wanted that same evidence in the repair itself.
2. Keep the current instruction, repair response and next test reachable together on my phone. I spent too much of this short repair scrolling between them.

## Files

- Report: repair.md
- Screenshots: repair-shots/01-first-screen.png through 31-desktop-first-screen.png (individual names listed above).
- Contemporaneous timestamp/input/diary record: repair-shots/timeline.jsonl
- Export: none downloaded; no replay claim.

Word-count correction: the quoted opening request has 22 words, not the 27 stated in the timing clarification. This does not change the recorded checkpoint or its status.
