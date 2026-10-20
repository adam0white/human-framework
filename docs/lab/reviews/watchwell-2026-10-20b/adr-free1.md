# A Dark Room — Sam — free-stop playtest

## Assignment and observed scope

Sam, 40, warehouse supervisor; plays Cookie Clicker, Kittens Game and Melvor Idle; likes watching something he built grow and unlocking the next thing; an evening at home, on his laptop.

- URL: https://adarkroom.doublespeakgames.com/
- Build: not visibly identified.
- Device: 1280 × 800 CSS px desktop, mouse and keyboard, light mode, default text size. Screenshots confirmed this desktop layout.
- Access: supplied standard lab driver, port 43611, one persistent page. Only player-facing operations and screenshots were used.
- Committed time: floor 0 real minutes; ceiling 25 real minutes. No optional testing question.
- Opening reply: elapsed 0.547 s. Final stop: elapsed 475.085 s (7:55.085 on the driver clock; about 7:54.5 after the opening reply). First gameplay input: 13.762 s. No in-game clock or day was shown.
- Stop: **BORED**; leave running and return later, rather than abandon the game.
- Read boundary: the assignment brief and its two allowed documents supplied the test. No game source, tests, other repository documents, prior reports, repository logs, bundles, network payloads or hidden state were inspected.
- No run was sent, no telemetry submission control was used, and no consent setting was changed. The opening audio preference was set to disable audio. No export was downloaded.
- Driver PID 48783 was terminated with `kill 48783` after the stop. A subsequent `kill -0 48783` reported no such process.

All elapsed times below are the driver's wall-clock times at replies, not a game clock. Waits ran in real time. Passive wood growth and events occurred between inputs; this was not frozen-time play. No speed control was used. “hyper.” was present in the footer, but I did not investigate its meaning.

## First minute

**Protocol timing deviation:** the checkpoint was logged at 65.330 s, about six seconds late. The answers below use only the opening through the 58.896 s reply. No later discovery is used to improve a checkpoint result.

Original checkpoint note, verbatim:

> I need warmth, and now the wood is running out with 4 left. Light fire was an obvious boxed control; stoke fire is next, and I now see A Silent Forest and gather wood in the reply. The fire button drew me first; the collapsed stranger then drew my attention. Firelit Room was underlined as the current place. Stoke was briefly unavailable and worked after waiting, but I was guessing about the delay. Lighting changed the title and said the fire was burning; stoking made it roaring while the room was still cold. My first game action was light fire at 13.762 seconds, available from the opening; before that I dismissed the sound question. I have learned light and stoke by their results, but have not tried gathering or changing location. I want to see what opens next.

| Item | Status | Answer and evidence available by 60 s |
|---|---|---|
| DL-1 A reason to act | PASS | I needed warmth: “the fire is dead.” and “the room is freezing.” By 58.896 s I also had wood 4 and “the wood is running out.” |
| DL-2 What can I touch | PASS for the controls met | Light fire was a boxed control in 01-opening.png. I used light fire, then stoke fire. The audio sheet also had two boxed choices. No decorative object was tried as a control. A Silent Forest and gather wood appeared in the 58.896 s reply; their visual affordance and use were not tested before 60 s. |
| DL-3 Urgency and selection | PASS for the opening situation | The fire drew me first; the collapsed stranger drew me next. The room title was underlined in 02-stranger.png. There was one gameplay control then. Wood scarcity became the next urgent cue in the 58.896 s reply. The new location's selected state was not tested before 60 s. |
| DL-4 Why the limit | FAIL for the explanation of the limit | At 16.406 s, stoke fire was shown but disabled. I guessed that I needed to wait. It worked at 32.090 s, but I had not found an explanation for why it was unavailable or how long it would take. This is an observed explanation gap, not evidence that the game has no cooldown rule. Capability/circumstance implementation: NOT TESTED. |
| DL-5 Readable situation | PASS | I could name the response: stoke the fire. “the fire is roaring.” and “the room is cold.” told me the room had not caught up yet. The stranger's collapse was readable in 02-stranger.png. At 58.896 s, gather wood was a newly listed response. |
| DL-6 A choice soon | PASS for an immediate meaningful action | Light fire was available in the opening reply at 0.547 s, with about ten opening situation words and no required long story. The sound sheet appeared by 4.685 s. First input was disable audio at 10.915 s; first gameplay input was light fire at 13.762 s. The opening offered one gameplay act, not a branching strategy choice. |
| DL-7 Learn by doing | PASS for two gameplay interactions reached | Lighting changed the title to A Firelit Room and said the fire was burning. Stoking made it roaring. I learned these two actions by their results. No help was used. Two newly listed interactions—gather wood and location switching—were NOT TESTED before 60 s. |

The test used screenshots as well as text replies. Visual judgments above refer to the named screenshots. A control listed in a text reply alone is not proof that it was visible in the current scene.

## Verbatim diary

Reaction wording below is unchanged from the reactions submitted during play. A blank reaction means none was submitted. The answer column summarizes the visible reply; quoted game text is literal. The first-minute note above is repeated at its original place in the diary. Failed taps and their subsequent successful inputs are included. Log-only replies can contain an older snapshot; they do not prove a fresh game state.

| Elapsed s | Input / record | Original reaction | Important visible answer |
|---:|---|---|---|
| 0.547 | open |  | Opening: “A Dark Room”, “light fire”, “the fire is dead.”, “the room is freezing.” |
| 4.685 | shot 01-opening.png | The room is freezing. Light fire looks like the thing to press; I want to get it warm. | Sound Available! sheet appeared; enable audio / disable audio. |
| 10.915 | tap disable audio | I will keep it quiet on the laptop tonight. The sound question is sitting over the fire button. | Accepted; immediate reply still included the sheet during its dismissal. |
| 13.762 | tap light fire | Light fire is the only job here. I expect the room to warm up. | Title: A Firelit Room. “the fire is burning.” Control: stoke fire. |
| 16.406 | tap stoke fire | The title changed to Firelit Room. That is a nice little first improvement. I will build the fire up. | “stoke fire is shown but disabled right now (game state, not a driver failure)” |
| 29.713 | wait 10 s | Stoke is not ready yet. I assume it needs a few seconds; I cannot tell the length from these words. | No new story line. |
| 32.090 | tap stoke fire | I have waited. Let us see whether stoking makes it hotter. | “the fire is roaring.” / “the room is cold.” |
| 50.085 | wait 15 s | Roaring fire, cold room. I am watching for the room to catch up. There is almost nothing to read, which suits me. | “a ragged stranger stumbles through the door and collapses in the corner.” |
| 53.465 | shot 02-stranger.png | Oh, someone came in. Keeping the fire going feels more useful now. I do not see a separate way to help them. | Boxed stoke fire; stranger and room condition readable in left column. |
| 58.896 | wait 3 s |  | A Silent Forest, gather wood and wood 4 appeared. “the wood is running out.” |
| 65.330 | first_minute | I need warmth, and now the wood is running out with 4 left. Light fire was an obvious boxed control; stoke fire is next, and I now see A Silent Forest and gather wood in the reply. The fire button drew me first; the collapsed stranger then drew my attention. Firelit Room was underlined as the current place. Stoke was briefly unavailable and worked after waiting, but I was guessing about the delay. Lighting changed the title and said the fire was burning; stoking made it roaring while the room was still cold. My first game action was light fire at 13.762 seconds, available from the opening; before that I dismissed the sound question. I have learned light and stoke by their results, but have not tried gathering or changing location. I want to see what opens next. | Checkpoint logged at 65.330 s; all described observations were available by 58.896 s. |
| 69.552 | tap A Silent Forest | Wood is the first stockpile. A Silent Forest looks like another place to go, so I will try that. | “the sky is grey and the wind blows relentlessly.” / “the room is mild.” |
| 72.172 | tap gather wood | I want a reserve before that fire eats the last four. | Wood 4 → 14. “dry brush and dead branches litter the forest floor.” |
| 75.733 | shot 03-first-stockpile.png | Fourteen wood. That is the sort of number I want to see grow. The gather button is shaded now, so I will give it a bit. | Forest selected; gather wood grey with a shaded cooldown area. Stores wood 14. |
| 104.434 | wait 25 s | I am happy to let a gathering timer run. I want to see whether the stranger wakes up as the room warms. | Wood still 14. |
| 106.882 | tap gather wood | Another load of wood, then I will check the room. | “gather wood is shown but disabled right now (game state, not a driver failure)” |
| 110.371 | tap A Firelit Room | Still gathering cooldown after half a minute. I can tend the fire instead. | “the stranger shivers, and mumbles quietly. her words are unintelligible.” / “the room is warm.” |
| 113.055 | tap stoke fire | She is shivering even though the room is warm. I only have the fire to offer her. | Wood 14 → 13; “the fire is roaring.” |
| 146.326 | wait 30 s | One wood spent to keep it roaring. I can wait for her to recover; this feels like the opening to something bigger. | “the stranger in the corner stops shivering. her breathing calms.” / “the room is hot.” |
| 150.978 | tap A Silent Forest | She is breathing calmly now. I will stock up while she rests. | Forest selected; wood 13. |
| 153.552 | tap gather wood | I want more wood banked for whatever I can build later. | Wood 13 → 23. |
| 179.305 | wait 23 s | Twenty-three wood is a start. I am waiting to find a use beyond feeding the fire. | No new story line; wood 23. |
| 183.690 | pulse 3/5 | I like the growing wood pile and want to know who the stranger is, but I am still waiting for something to build. | Engagement 3. |
| 187.084 | tap A Firelit Room | I will check on her again. The forest is only wood gathering so far. | “No visible clickable text: A Firelit Room”; fresh reply showed a Penrose event with give in / ignore it. |
| 193.195 | shot 04-penrose.png | A vision interrupted me. Give in sounds risky; I want to keep what I am building here. | Penrose modal; underlying scene dimmed, wood 23 readable. |
| 195.774 | tap ignore it | I do not know what giving in would do. I would rather stay with the room and the stranger. | Accepted dismissal; immediate reply still included modal text. |
| 198.235 | tap A Firelit Room | Back to the fire and the stranger. | Retry succeeded. “the stranger is standing by the fire. she says she can help. says she builds things.” |
| 216.483 | wait 15 s | She builds things! That is what I was waiting for. I am looking for the new building choices. | Wood rose 23 → 27 without gathering. |
| 220.762 | shot 05-builder-awake.png | The wood went up without me gathering. I am guessing she is helping with that now. | Stores wood 29; only stoke fire visible in room. |
| 224.364 | tap A Silent Forest | I will add another load myself and see if that unlocks a building. | Wood 29. |
| 226.966 | tap gather wood | Another ten should get this moving. | Wood 39; trap and cart listed under build. |
| 229.557 | tap A Firelit Room | Trap and cart just appeared. Now there is something to work toward. | Wood 41. Builder explains cart carries wood and traps catch creatures. |
| 234.810 | shot 06-build-options.png | I would pick a cart first if it lets me bring back more wood. I want the gathering upgrade before buying traps. | Trap and cart boxed; no cost displayed in this screenshot. |
| 238.539 | tap cart | I will build the cart. I cannot see its cost before pressing it from this screen. | Wood 41 → 11. “the rickety cart will carry more wood from the forest.” |
| 241.273 | tap trap | The cart cost thirty wood, leaving eleven. I will try one trap to start another resource. | Wood 3 (passive production may have occurred between inputs). “more traps to catch more creatures.” Next trap cost wood 20 appeared. |
| 244.254 | tap A Silent Forest | I have a cart and a trap now. I want to try the bigger haul and see what the trap catches. | Cart 1, trap 1, pop 0/0; check traps available. |
| 247.201 | tap check traps | Let us see what the first trap brings in. | “the traps contain tattered cloth.” Cloth 1, bait 0. |
| 280.093 | wait 30 s | Cloth instead of an animal is a surprise. I will let the wood recover; the cart should make the next trip better. | Wood 3 → 11. |
| 283.982 | tap gather wood | Time to test the cart. | Gather wood still disabled. |
| 297.542 | wait 8 s | Gather is nearly ready, I think. I keep trying it a little too soon. | Wood 13. |
| 300.186 | tap gather wood | Now I want to see how much the upgrade adds. | Wood 13 → 65 across the interval; hut appeared. |
| 304.279 | tap A Firelit Room | Sixty-five! That is a real upgrade, and a hut just appeared. This is picking up. | “builder says there are more wanderers. says they'll work, too.” |
| 307.648 | tap hut | A hut should bring workers. That is my next purchase. | “not enough wood.” Cost wood 100 became visible; wood remained 65. |
| 311.741 | shot 07-hut-cost.png | The hut needs a hundred wood. Now I know the target; I will save for it rather than buy more traps. | Wood 67; hut tooltip wood 100, unobscured. |
| 349.094 | wait 30 s | I want that hut, but the wood trip is still cooling down. I do not need to stoke a roaring fire just to have a button to press. | Wood 75. |
| 353.474 | tap A Silent Forest | I will check the traps while waiting for the next wood haul. | Forest selected; wood 75. |
| 357.009 | tap check traps | Maybe there will be something besides cloth this time. | “the traps contain scraps of fur.” Fur 1. |
| 362.355 | pulse 4/5 | The cart made a big difference and I have a clear hundred-wood hut target. I want to get the first workers settled. | Engagement 4. |
| 367.390 | tap gather wood | This should put me over a hundred for the hut. | “No visible clickable text: gather wood”; fresh reply showed A Ruined Trap, track them / ignore them. Trap count disappeared. |
| 370.906 | shot 08-ruined-trap.png | Something tore up my trap. Large prints sound dangerous, but I want to know what is out there. | “some of the traps have been torn apart.” / “large prints lead away, into the forest.” Wood 79 readable beside modal. |
| 374.344 | tap track them | I will track the prints. I am curious, even if it is a risk. | “there was a beast. it's dead now.” Fur 101, meat 100, teeth 10. Event: “it puts up little resistance before the knife.” |
| 377.254 | tap go home | A hundred meat and a hundred fur from that! I expected trouble, but tracking it paid off. | Accepted return; immediate reply still included go home. |
| 380.374 | tap gather wood | Back to the hut plan with a very full food pile. | Retry succeeded. Wood 131; lodge appeared. |
| 383.204 | tap A Firelit Room | Enough wood now. I want the hut built. | “villagers could help hunt, given the means.” |
| 387.104 | tap hut | Build the first home. I want people working here. | Wood 131 → 31. “builder puts up a hut, out in the forest. says word will get around.” Next hut wood 150. |
| 390.263 | tap A Silent Forest | The hut is up. I will look for the new capacity and wait for someone to arrive. | “A Silent Forest is not on the page now; it was listed 3 s ago and the page has changed (game state, not a driver failure)”. New name A Lonely Hut; hut 1, pop 0/4. |
| 395.032 | tap A Lonely Hut | The forest tab has become A Lonely Hut. Nice: the place has changed because I built something. | Tab selection succeeded. Pop 0/4. |
| 427.937 | wait 30 s | Zero of four people. I am watching for arrivals. I have food and a home ready; that feels like a decent start. | Wood 39; still pop 0/4. Shell returned before curl completed; polling that same process recovered the normal reply. |
| 445.755 | want_quit BORED | I would leave this running now and check back later. The hut is built and wood is trickling in, but watching zero of four people is not worth staring at. I still want to see the village grow; I just want to do something else while it gets there. | Log-only reply used an older snapshot; wood 39 is not a fresh observation at this timestamp. |
| 451.687 | tap gather wood | One last load before leaving it alone. I can bank wood for the next building. | Wood 95; still pop 0/4. |
| 466.923 | wait 10 s | The last load helped the stockpile, but I still want to step away rather than watch the arrival counter. | Wood 97; pop 0/4. |
| 470.342 | shot 09-stop.png |  | Wood 99; cart 1, hut 1, pop 0/4. Gather wood and check traps grey. |
| 475.085 | stop BORED | I am stopping at the first hut, with a cart, no residents yet and wood coming in. I would leave the game running and come back to see who arrived. The wish to step away did not pass after one more wood trip; I am done watching for now, not done with the game. | Stop logged at 475.085 s. Latest screenshot 470.342 s; stop op does not refresh state. |

## Best moment, worst moment, wishes to leave and pulses

**Best moment: 300.186–304.279 s.** The cart's first successful gathering input brought the stockpile from the last observed 13 to 65, with passive production possible in the interval. A hut appeared. “Sixty-five! That is a real upgrade, and a hut just appeared. This is picking up.” This was the clearest payoff for something I had chosen to build. I did not rate the exact instant numerically; the next pulse was the session's highest recorded engagement, 4/5.

The ruined-trap event was another good moment at 374.344–377.254 s: tracking the prints produced a large food and fur stockpile. I chose it knowing I did not know the risk. The favorable outcome does not establish the odds or general safety of that choice.

**Worst moment: 427.937–445.755 s.** I had completed the first hut and was watching pop 0/4. I wanted the village to grow, but no longer wanted to attend the wait.

| Record | Elapsed | Rating / reason | Original wording |
|---|---:|---|---|
| Pulse | 183.690 s | 3/5 | I like the growing wood pile and want to know who the stranger is, but I am still waiting for something to build. |
| Pulse | 362.355 s | 4/5 | The cart made a big difference and I have a clear hundred-wood hut target. I want to get the first workers settled. |
| First and only want_quit | 445.755 s | BORED | I would leave this running now and check back later. The hut is built and wood is trickling in, but watching zero of four people is not worth staring at. I still want to see the village grow; I just want to do something else while it gets there. |
| Stop | 475.085 s | BORED | I am stopping at the first hut, with a cart, no residents yet and wood coming in. I would leave the game running and come back to see who arrived. The wish to step away did not pass after one more wood trip; I am done watching for now, not done with the game. |

There were no earlier logged wishes to leave. Earlier remarks about waiting for buildings described curiosity with reduced activity, not an expressed wish to stop. After the wish to leave, I gathered once more and waited ten real seconds; the wish persisted.

**Hard, but kept going: NOT TESTED / not encountered.** I did not search for an easier setting, workaround or accessibility option. Waiting through cooldowns and choosing a risky event do not meet that specific finding.

## Clarity findings

### Observed failure

**DL-4: I could tell an action was unavailable, but I was guessing about the wait.** At 16.406 s, stoke fire was disabled; it worked at 32.090 s. Later, gather wood was still disabled at 106.882 s after the successful gathering input at 72.172 s, and again at 283.982 s after the input at 226.966 s. My reaction at 297.542 s was: “Gather is nearly ready, I think. I keep trying it a little too soon.” The shaded button communicates unavailability, but I did not find a reason or duration in words. See 03-first-stockpile.png and the diary at those times. This does not establish that an untested hover or help surface lacks more information.

### Observations with evidence limits

**DL-14: the cart's price was not visible in the view from which I chose it.** At 234.810 s, 06-build-options.png showed boxed trap and cart controls without a displayed cost. At 238.539 s I pressed cart; wood changed from 41 to 11 and the cart was built. The hut cost later appeared under the pointer after I tried hut, and 07-hut-cost.png shows “wood 100.” The supplied operations did not offer a hover-only command. I therefore cannot establish whether a human moving the pointer before clicking would have seen the cart cost. Status: NOT TESTED for pre-click hover discovery; the price-discovery problem was real in this run.

**DL-13: accepted actions usually gave clear feedback.** Lighting changed the title; gathering changed the stockpile; building produced a matching story line. Audio and event dismissals still appeared in the immediate reply, but subsequent normal inputs succeeded. Two attempted background taps met newly opened event sheets: A Firelit Room at 187.084 s and gather wood at 367.390 s. The screenshots showed the modal choices, which worked. Retrying the original background action after answering the event succeeded. These were interruptions by game state, not a driver block. A Silent Forest also changed to A Lonely Hut before a tap; the fresh name worked. I did not reproduce duplicate purchases from uncertainty about an accepted tap.

**DL-19: uncertainty did not by itself make a cue misleading.** I declined “give in” because I did not know its consequence. I later followed large prints knowing that might be dangerous. I do not call either unknown outcome a clarity failure.

## English, dates, layout and hands-on play

| Item | Status | Observed evidence and limit |
|---|---|---|
| DL-20 English | PASS for play reached | All action-critical labels and resource names met were understandable in English: light fire, stoke fire, gather wood, cart, trap, hut, check traps, track them, ignore them, go home. Penrose was an event title; its situation and responses were in English. No necessary untranslated term was encountered. |
| DL-21 Dates | NOT TESTED | No date, day counter or deadline comparison was encountered. |
| DL-22 Phone response visibility | NOT TESTED | This was the assigned 1280 × 800 desktop fixture. No phone fixture was opened. |
| DL-30 Cut-off text | PASS for desktop screens and sheets inspected; phone NOT TESTED | No action-critical sentence was visibly cut off or covered by another element in the nine screenshots. The sound, Penrose and ruined-trap sheets fit and their responses were visible. The older left-column history faded toward the bottom, but I did not have to scroll to recover the current response or an essential current sentence. No small-panel “Scroll ↓” was encountered. |
| DL-31 State while answering | PASS for resource context inspected; deadline/person-goal checks NOT TESTED | With Penrose open, wood 23 remained readable beside the modal (04-penrose.png). With the ruined-trap choice open, wood 79, other stockpiles and pop 0/0 remained readable (08-ruined-trap.png). Event text and both responses fit. No deadline or quantified personal goal was present to read alongside those choices. |
| DL-32 Attended waiting | NOT TESTED for the strict longest period with no meaningful act anywhere | My clearest target-specific wait was roughly 307.648–353.474 s: about 45.8 s between the refused hut purchase and switching to check traps. I wanted to build the hut and gather toward it while gathering cooled down. I chose not to spend on more traps or stoke a roaring fire. Those alternatives existed, so this is not proof that every meaningful action was unavailable. The final screenshot showed gather wood and check traps both grey, but I did not continuously sample their availability or every other scene. I preferred leaving the game running once the first hut was built. |
| DL-33 Direct acts versus forms | PASS for the verbs reached | Light fire, stoke fire, gather wood, build cart/trap/hut and check traps executed with one labelled control, without a planning form or a confirm sequence. This game presented text controls rather than pictured objects. Tracking the beast used an event choice followed by go home; it did not open a strength/reason form. |

Other checklist coverage, limited to what I actually encountered:

- DL-8: PASS for current messages versus older history in the desktop views. New lines appeared at the top; older lines faded.
- DL-9: NOT TESTED. No mandatory timed obligation was identified.
- DL-10: NOT TESTED as a complete terminology audit. “Stranger” becoming “builder” was understandable because she first said she builds things. Location titles visibly changed with progress; the obsolete-name tap is recorded.
- DL-11: PASS for short immediate decisions encountered; builder layout/code check NOT TESTED.
- DL-12: NOT TESTED. I reached no ending, chapter boundary or completed game.
- DL-15: NOT TESTED for speed/slowdown behavior. No clock or speed state was visibly identified. Real-time waiting and passive production were observed. I did not select hyper or test a timed choice at fast speed.
- DL-16: PASS for responses reached: cold → fire; scarce wood → gathering; ruined traps → track or ignore. This is not an assertion about all tasks.
- DL-17: PASS for the stranger's condition met: shivering, quiet mumbling, calmer breathing. No mood/tiredness percentage was encountered.
- DL-18: NOT TESTED for what the character could know. Resource numbers were visible, but I did not inspect their fictional accounting.
- DL-23, DL-24, DL-25: NOT TESTED as complete layout/navigation checks. No focus-return, target-size, zoom, alternate-theme or reflow audit was performed.
- DL-26: NOT TESTED as a menu check. Footer save/restart and related controls were present; I did not open them.
- DL-27, DL-28, DL-29: NOT TESTED. No reload/resume, sending or export replay was attempted.

## Stop and voluntary return

I stopped at **A Lonely Hut**, with one cart, one hut and no residents yet. The last fresh screenshot at 470.342 s showed pop 0/4, wood 99, cloth 1, fur 101, meat 100, teeth 10 and bait 0. The original trap had been destroyed by the event. I had not built a lodge or a second hut.

The final reason was **BORED** with attending the current wait. The first want_quit did not pass. I would return voluntarily to see residents arrive and develop production. I would normally leave this idle game running while doing something else. The test ended the driver as instructed; it did not test unattended progress after closing or whether returning later preserves progress.

## Changes I would want as Sam, ranked

1. Put the wood cost beside a building name before I click it. I want to compare upgrades without first attempting the purchase.
2. Give the unavailable gathering/stoking action a plain wait cue or remaining time. I kept trying gathering slightly early.
3. When the first hut is waiting for residents, give a small cue about whether waiting is enough. “Says word will get around” was suggestive, but I was still watching an empty population counter.

These are this player's preferences from this run, not a recommendation to reduce the game's difficulty or a claim about its unseen rules.

## Evidence files

Screenshots: `(driver scratch)/`

1. `01-opening.png` — 4.685 s, cold room and sound sheet.
2. `02-stranger.png` — 53.465 s, fire and collapsed stranger.
3. `03-first-stockpile.png` — 75.733 s, wood 14 and gathering cooldown.
4. `04-penrose.png` — 193.195 s, readable event and stockpile.
5. `05-builder-awake.png` — 220.762 s, builder and passive wood growth.
6. `06-build-options.png` — 234.810 s, trap/cart before cart purchase.
7. `07-hut-cost.png` — 311.741 s, wood 100 tooltip after attempted purchase.
8. `08-ruined-trap.png` — 370.906 s, tracking choice and readable state.
9. `09-stop.png` — 470.342 s, final fresh view.

The driver wrote `(driver scratch)/wall-clock.jsonl`. This report was assembled from the live replies, submitted reaction text and inspected screenshots; that file was not opened to inspect game state. No downloaded export exists.

One local reporting step attempted to parse an empty shell result while a 30-second curl was still running. Polling that same shell process returned the normal wait reply at 427.937 s. This did not require another game input, did not alter elapsed game time, and did not block play.

