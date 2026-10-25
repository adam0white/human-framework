# Twice at the Well — source-unread phone playtest

Tomasz, 41, bus mechanic. Plays Factorio and Rimworld on weekends. Wants to build something that holds up. Plays on his phone during a break and reads help when stuck.

- URL: local preview of d8178b7 at http://localhost/colony/
- Build: no build identifier encountered on the visible page.
- Access: headless Chromium through Playwright, one persistent page controlled by a local Node HTTP server. Screenshots, coordinate clicks and normal scrolling only. No game source, hidden DOM, bundles, network payloads, storage or debug APIs inspected.
- Phone: 360×690 CSS px, touch emulation, light mode, default text size.
- Start: 2026-10-20 08:59:04.706 UTC, the actionable opening screen.
- Natural quit: 09:02:33.639 UTC, **208.933 seconds / 3 minutes 29 seconds**. Eight minutes was a ceiling; it was not exhausted. Game clock at stop: Day 1, 11:03. No ending reached.
- Clock: visible 1× remained selected. I did not change speed or the Auto-pause setting. Suggestions paused play automatically. I used the top play control once to resume after clearing Maryam's proposal.
- After quitting: one 1280×800 screenshot of the opening screen after reloading, with no further gameplay. It showed Day 1, 05:00 and Play. This was a desktop opening look, not a tested save/resume cycle.
- Evidence: [screenshots](well2-shots/); [wall-clock records](well2-shots/wall-clock.jsonl). All elapsed times below are real seconds from the opening screen. Diary text was written during play and is reproduced unchanged.

## First minute

**Actual checkpoint: 71.421 seconds**, late because I was writing the checkpoint. No gameplay inputs occurred between 50.177 seconds and the checkpoint. Latest observed screen at that point was [11-first-minute.png](well2-shots/11-first-minute.png), captured at 55.881 seconds. Later answers have not been used to upgrade these statuses.

The saved checkpoint's original introductory sentence said “about 64 seconds.” The actual request timestamp was 71.421 seconds. I recorded that correction during play. Original checkpoint answers follow verbatim:

| Item                       | Status | Original checkpoint answer                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 A reason to act       | PASS   | I need a roof and 12 meals before the storm, while keeping six people alive. The opening card and top deadlines told me.                                                                                                                                                                                                                                                                |
| DL-2 What can I touch      | FAIL   | Play, the speed circles, dropdowns, suggestion disclosure, Use and Confirm look tappable. The villager dropdown did not expose a list in my headless screenshot. Use was partly hidden under the lower village panel until I scrolled. I did not try decorative map objects yet.                                                                                                        |
| DL-3 Urgency and selection | PASS   | Roof before D2 19:00 and Everyone lives by D3 05:00 are at the top. The suggestion asked for Yusuf. Selecting Use visibly filled Yusuf and House and showed a build line.                                                                                                                                                                                                               |
| DL-4 Why the limit         | PASS   | Confirm was grey before I chose a person and place; the nearby line said pick a villager. After sending, the visible Human answer says Yusuf to House: not now, after I pray Fajr. I take that to mean I must wait, though I do not know how long.                                                                                                                                      |
| DL-5 Readable situation    | PASS   | I can name a response: choose a villager and place, then Confirm. One order is now listed. Yusuf is not going now; the visible answer says after I pray Fajr. Classic has 7 meals and House 3/10 while Human has 4 meals and House 2/10.                                                                                                                                                |
| DL-6 A choice soon         | PASS   | First gameplay choice was visible at 10.400 s, after Play: choose a villager and place or use the Yusuf suggestion. First gameplay selection attempt was 17.214 s; first successful preparation was Use at 44.806 s; Confirm at 50.177 s. The opening had about 30 essential words, with optional story left closed.                                                                    |
| DL-7 Learn by doing        | PASS   | I reached one order interaction. Use prepared Yusuf to build the House; Confirm cleared the composer, then an order and a reply appeared. I initially thought it had sent immediately, but only the later reply establishes acceptance. I used the visible suggestion explanation; I did not open More about the village or Inspect. Other interaction types: NOT TESTED, zero reached. |

Checkpoint qualifications: the absent native dropdown popup is an access limitation of this headless attempt; I cannot establish a game defect from it. The observed clipping and scrolling are separate phone layout evidence. DL-4 covers the player-facing reasons only; the builder check is NOT TESTED. The DL-7 count is one order interaction reached by the checkpoint, with zero other interaction types reached; it is not a count of all interactions the game might contain. No unencountered interaction is graded.

## Verbatim diary

**6.070 s · 08:59:10.776 UTC**

> I want a roof that stays up and enough food before the storm. Play looks like the way in. The map is showing through the opening card, which is busy.

**17.205 s · 08:59:21.911 UTC**

> It says roof before Day 2 at 19:00. I will get Yusuf onto the house. It has paused to suggest him; I can see the villager and place controls. I had to press Play twice, but I do not know whether the first tap landed during loading.

**38.528 s · 08:59:43.234 UTC**

> The useful suggestion runs under the lower village panel. I can read why Yusuf is useful, but I cannot get a clean tap on Use. The villager dropdown did not show a list in this browser.

**50.220 s · 08:59:54.926 UTC**

> Use filled Yusuf and House, and Confirm sent the order. That distinction is clear now. I expected building work, and the prepared line said build the house. It took scrolling to reach the useful button.

**76.904 s · 09:00:21.610 UTC**

> Checkpoint timing correction: writing the checkpoint finished at 71.421 seconds, not the approximate 64 in its opening line. I took no inputs after 50.177 seconds while preparing it. I can now see the order reply: Yusuf says not now, after I pray Fajr. That is more useful than just a number moving.

**97.894 s · 09:00:42.600 UTC**

> Now Yusuf says yes. Fine. I like seeing him come back to the job. Idris can get three timber from a big cedar, but it says the tree can hurt him. I want to look before risking a worker.

**110.558 s · 09:00:55.264 UTC**

> Idris is a forester, but he is tired and could use a drink. The cedar tempts him. I will take the timber risk once; the warning is plain enough that an injury would be on me.

**129.903 s · 09:01:14.609 UTC**

> Tapping a tiny person on the lower map selected Samira. That works better than the dropdown here. I want her on food; the yellow striped patch looks like a field.

**142.873 s · 09:01:27.579 UTC**

> Samira to Field means gather grain, so I sent that. Idris got hurt in both villages. The warning was real. The screen shifts when those hurt messages appear, and I had to tap the field twice because its position moved.

**150.759 s · 09:01:35.465 UTC**

> Correction: my first food Confirm tap had not sent it. A new timber suggestion appeared and moved Confirm down. I tapped the button at its new position. This is starting to feel like chasing the controls.

**171.029 s · 09:01:55.735 UTC**

> Maryam can fetch timber, but the pot sits cold while she is gone. I am short of meals as well. I will use her for timber now to keep the building moving, then try to get her back to cooking.

**177.720 s · 09:02:02.426 UTC**

> The preview says Maryam will refuse because the others would go unfed. Fair enough. The suggestion called her free, but she clearly has a reason to stay. I will clear this instead of sending an order she already says she will refuse.

**208.933 s · 09:02:33.639 UTC — quit**

> Orders shows all three instructions, which helps. But I cannot tell whether the ticks mean the work finished or only that they accepted. I am leaving here. I have spent more of this break finding and re-finding buttons than watching my village build. I would give it another look on a bigger screen, but I would not reopen this phone view voluntarily.

## Inputs and visible answers

| Real elapsed        | Input / observation                                                                     | Visible answer and evidence                                                                                                                                                                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.169 s             | Opening screenshot                                                                      | “Roof the house, store 12 meals and keep everyone alive before the storm.” [01](well2-shots/01-first-screen.png). The translucent appearance in this immediate capture was gone in [02](well2-shots/02-after-play.png); I do not establish a persistent visual fault from it.                                                               |
| 6.079 / 10.365 s    | Play tapped twice                                                                       | At 10.400 s the composer and “First light. Send Yusuf to the house?” were visible. [03](well2-shots/03-playing.png). Cause of the first ineffective tap is unknown.                                                                                                                                                                         |
| 17.214 s            | Villager dropdown tapped                                                                | Focus outline, but no popup captured. [04](well2-shots/04-villager-list.png). Browser limitation possible.                                                                                                                                                                                                                                  |
| 22.442–38.597 s     | Expanded Yusuf suggestion, scrolled, tried partly visible lower control, scrolled again | The Use button became fully visible only after scrolling. “He is your best builder and walls are cheap now.” [05](well2-shots/05-suggestion.png), [07](well2-shots/07-use-result.png), [08](well2-shots/08-scrolled.png).                                                                                                                   |
| 44.806 s            | Use                                                                                     | Yusuf / House filled in; “Yusuf → House · build the house”; “Yusuf: likely yes.” [09](well2-shots/09-prepared.png).                                                                                                                                                                                                                         |
| 50.177 s            | Confirm                                                                                 | Immediate capture showed cleared composer and Orders (0); by 55.881 s it showed Orders (1) and “Human · Yusuf → House: not now · after I pray Fajr.” [10](well2-shots/10-first-order.png), [11](well2-shots/11-first-minute.png). I did not repeat Confirm.                                                                                 |
| 76.948 s            | Observation                                                                             | At 08:00, “Human · Yusuf → House: yes · Fine.” New paused suggestion: “Idris could take the big cedar: three timber at once.” [12](well2-shots/12-after-checkpoint.png).                                                                                                                                                                    |
| 81.879–98.282 s     | Expanded, scrolled, Use                                                                 | “Fast timber, but the cedar can hurt whoever fells it.” Idris / Cedar; “fell the big cedar”; “likely yes.” [14](well2-shots/14-idris-use.png), [15](well2-shots/15-idris-prepared.png).                                                                                                                                                     |
| 101.985 s           | Inspect                                                                                 | Idris, forester, 41. “Could use a drink,” “Tired,” “Well,” “Unhurt.” “Low fear, high ambition: the cedar tempts him.” [16](well2-shots/16-inspect-idris.png).                                                                                                                                                                               |
| 110.604 / 115.957 s | Closed Inspect; Confirm                                                                 | “Human · Idris → Cedar: yes · Alright, I'll do it.” Toast “Order given: Idris → Cedar.” [18](well2-shots/18-cedar-sent.png).                                                                                                                                                                                                                |
| 121.357 s           | Tapped person on Human map                                                              | Selected Samira. “Samira: now pick a place.” [19](well2-shots/19-human-map-tap.png).                                                                                                                                                                                                                                                        |
| 129.918 / 135.099 s | Tapped field twice                                                                      | First capture still had no place selected. Second showed Samira / Field, “gather grain,” “likely yes.” Hurt notices named Idris (Classic), then Idris (Human). [20](well2-shots/20-field-selection.png), [21](well2-shots/21-select-field.png). The layout changed between observations; I cannot prove the exact frame of each missed hit. |
| 142.508 s           | Attempted Confirm at its previous position                                              | New paused timber suggestion was present and Samira / Field remained prepared. No order toast. [22](well2-shots/22-food-order.png).                                                                                                                                                                                                         |
| 150.259 s           | Confirm at new position                                                                 | Cleared composer and toast “Order given: Samira → Field.” [23](well2-shots/23-food-sent.png).                                                                                                                                                                                                                                               |
| 157.747–171.410 s   | Expanded Maryam suggestion, scrolled, Use                                               | “Timber now, but the pot sits cold while she is gone.” Prepared Maryam / Forest; red preview: “Maryam: will refuse: the others would go unfed.” [25](well2-shots/25-maryam-use.png), [26](well2-shots/26-maryam-prepared.png). I did not send this order.                                                                                   |
| 177.740 / 177.762 s | Clear; top play button                                                                  | Composer emptied; clock resumed at 10:48. [27](well2-shots/27-cleared-resumed.png).                                                                                                                                                                                                                                                         |
| 189.500 s           | Orders (3)                                                                              | Opened list: Samira → Field, Idris → Cedar, Yusuf → House. C/H badges showed checks or “yes.” [28](well2-shots/28-orders.png).                                                                                                                                                                                                              |
| 208.933 s           | Quit                                                                                    | Orders still open; Day 1, 11:03. [29](well2-shots/29-quit-phone.png).                                                                                                                                                                                                                                                                       |
| 215.500 s           | Post-session desktop opening screenshot only                                            | At 1280×800 the opening card and both maps had much more room; named villager buttons were visible behind the card. [30](well2-shots/30-desktop-first-screen.png). No desktop gameplay tested.                                                                                                                                              |

## Best, worst, and willingness to return

Best: Yusuf's deferred answer becoming “yes · Fine.” He felt like someone with his own schedule who would still help build. Idris's warning also mattered: I knowingly chose a risk and then saw an injury, rather than feeling ambushed by an unexplained penalty.

Worst: the Samira Confirm button moving when a suggestion appeared. I thought I had sent the order, then found the same prepared selection still sitting there. Frustration was explicit at 150.759 seconds. It was already building at 38.528 seconds while trying to reach Use.

I stopped voluntarily at 208.933 seconds, with the Orders sheet open and three instructions listed. I had not finished the roof or storm preparation. I would consider another look on a bigger screen. I would not return voluntarily to this phone layout. I did not reach a distinct bored waiting period; manipulating the interface was the obstacle.

## Clarity findings

- **DL-22 — FAIL: the immediate suggestion response needed scrolling.** At the phone fixture, the suggestion's explanation and Use button extended below the visible middle area. The lower Human panel cut across the suggestion before I scrolled it into view. See [05](well2-shots/05-suggestion.png), [07](well2-shots/07-use-result.png), [08](well2-shots/08-scrolled.png), and the repeated Idris/Maryam cases. The Human map and its essential status were often only partly visible, with a Playtest notebook control covering part of the lower scene. This directly affected my attempt to choose people and places.
- **DL-13 — FAIL for reliable tapping during layout changes; acceptance feedback itself was useful.** At 135.462 seconds I saw Confirm near y=456. By the next captured attempt, a new suggestion had shifted it to about y=499 and my selection remained unsent. I corrected the tap at 150.259 seconds and got an explicit toast. I cannot determine the exact instant of movement from these screenshots, but I could not rely on the control staying where I had just seen it. [21](well2-shots/21-select-field.png)–[23](well2-shots/23-food-sent.png). No duplicate order was observed.
- **DL-5 — FAIL later in the Orders view:** “C ✓”, “H ✓” and “H yes” did not tell me whether the work had finished or whether the person had merely agreed. I could find the requests but could not confidently name their current stage. [29](well2-shots/29-quit-phone.png). This later uncertainty does not change the First minute PASS.
- **DL-2 — checkpoint FAIL retained, with a tooling caveat.** I saw controls clearly enough to prepare orders, and map taps later worked. The absent dropdown popup is not established as a game defect. The supported phone difficulty is reaching visible responses and selecting tiny figures, rather than proof that the dropdown is broken.

The cedar injury is **not** a clarity failure. The preview explicitly warned me. The Maryam refusal is understandable: “the others would go unfed” explained her objection before I committed. The suggestion saying she was “free until noon” made it worth trying, but I could cancel once I saw the objection.

## English, dates, and other checks reached

| Item                                                 | Status                              | Evidence / limit                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-20 English                                        | PASS for encountered actions        | House/build, Cedar/fell, Field/gather grain, Forest/gather timber, refusal and injury messages were understandable. “After I pray Fajr” told me he was delaying for prayer; I did not need to translate the prayer's name to respond by waiting. No other necessary untranslated term encountered. |
| DL-21 Dates                                          | PASS for initial comparison         | Opening said Day 1, 05:00. “Roof before D2 19:00” meant tomorrow evening; “Everyone lives by D3 05:00” meant the following morning. Suggestion “lapses 09:00 · in 60 min” was also readable. Across months/years and returning after a break: NOT TESTED.                                          |
| DL-22 Phone response                                 | FAIL                                | Immediate Use response required scrolling; see findings above.                                                                                                                                                                                                                                     |
| DL-14 Known risk/cost                                | PASS for reached choices            | Injury warning before cedar order; cold pot / unfed people before the abandoned Maryam order.                                                                                                                                                                                                      |
| DL-19 Cues                                           | PASS for field and known cedar risk | Yellow striped patch became Field/gather grain. Warned cedar risk produced a hurt notice; I knowingly took that risk.                                                                                                                                                                              |
| DL-17 Feelings                                       | PASS for inspected Idris            | Tiredness, thirst and trust appeared as words such as “Tired,” “Could use a drink,” and “Getting acquainted,” not numerical mood percentages. Other people not inspected.                                                                                                                          |
| DL-24 Way back                                       | PASS for one Inspect round trip     | Close returned to prepared Idris/Cedar composer. Nested sheets and keyboard behavior: NOT TESTED.                                                                                                                                                                                                  |
| DL-15 Time                                           | NOT TESTED for full criterion       | Saw 1×, clock movement, paused suggestions, and resumed through a normal control. Did not change to fast speed or test a pending choice under fast speed.                                                                                                                                          |
| DL-23 Targets                                        | NOT TESTED quantitatively           | Tiny map people were difficult, but I did not measure hit areas or exhaust disambiguation controls.                                                                                                                                                                                                |
| DL-25 Reflow                                         | NOT TESTED for full criterion       | No horizontal scroll encountered at 360 px. Did not test 320 px, 200% text or dark mode.                                                                                                                                                                                                           |
| DL-8, DL-9, DL-10, DL-11, DL-12, DL-16, DL-18, DL-26 | NOT TESTED as complete criteria     | Some relevant labels/status appeared, but no independent complete assessment was made during this short player session. No end boundary reached.                                                                                                                                                   |
| DL-27 Resume                                         | NOT TESTED                          | Post-session reload was only the requested desktop opening look.                                                                                                                                                                                                                                   |
| DL-28 Send                                           | NOT TESTED                          | No telemetry or run sent; no consent settings changed.                                                                                                                                                                                                                                             |
| DL-29 Export replay                                  | NOT TESTED                          | No export downloaded, replay/import not attempted. All builder checks remain NOT TESTED.                                                                                                                                                                                                           |

The dropdown issue and first Play tap remain uncertain access/timing observations. They should not be filed as confirmed game failures from this run. No tool step failed, and the persistent page remained available for the phone session.

## Changes I would want as this player

1. Keep the order controls in one stable place when a suggestion or injury message appears. I want a tap on Confirm to land on Confirm.
2. Give the current suggestion and its Use button room on the phone screen. Let me see enough of my village to choose someone without fighting the middle panel.
3. Tell me whether an order is agreed, waiting, being done or finished in words. The ticks were not enough for me.
