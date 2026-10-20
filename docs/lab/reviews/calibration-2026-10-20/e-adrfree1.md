# A Dark Room — source-unread playtest

## Assignment and access

- Persona: Sam, 40, warehouse supervisor. Plays Cookie Clicker, Kittens Game and Melvor Idle. Likes watching something he built grow and unlocking the next thing. An evening at home, on his laptop. I treated this as patient curiosity; the assignment did not supply a separate temperament label.
- URL: https://adarkroom.doublespeakgames.com/
- Visible build: NOT AVAILABLE. No version encountered.
- Device: desktop, 1280×800 CSS px, mouse and keyboard, light mode, default text size. Screenshots are at this viewport.
- Access: supplied `npm run lab:play` driver, port 43431, one persistent page. Started with the exact assigned command and PLAYWRIGHT_MODULE value. Driver reported PID 24705. Killed that exact PID after the stop note.
- Committed time: floor 0 real minutes, ceiling 25. Free stop.
- First usable reply: driver elapsed 0.635 s. Stop: 430.406 s, about 7:10 on the driver clock, or 7:09.8 after the first usable reply.
- In-game clock/day: not shown throughout. All diary times below are real driver elapsed seconds. The live game changed during waits and between inputs. No time acceleration or speed control used.
- Read only the assigned playtester prompt and DL checklist in the repository. No source, tests, other docs, prior reports, or on-disk logs read. The diary below uses live replies and reactions retained during this session.
- No run sent, telemetry submitted, consent changed, or hidden/debug API used. Enabling in-game audio was the opening sound choice. No export downloaded.

## First minute

The original checkpoint was logged at **64.960 s**, about **4.3 s late** relative to 60 seconds after the first usable reply. This is a protocol deviation. Its gameplay evidence comes from the replies through 57.684 s; there were no further gameplay inputs before the note. Later discoveries do not change the statuses below.

Original checkpoint, verbatim:

> I am keeping the room warm. Light fire was the obvious boxed control; now it says stoke fire. The new lines at the top draw me first, especially the stranger collapsing. I do not see a selected object or a timed emergency. The grey stoke button had a filling bar, so I think it needs time, but it never said why. I lit the fire and stoked it; burning became roaring and freezing became cold. Those consequences made sense. The stranger has no obvious separate action yet. I want to see who this is.

| Item | Status | Checkpoint answer and evidence |
|---|---|---|
| DL-1 A reason to act | PASS | I wanted to warm a freezing room. Opening: “the fire is dead.” and “the room is freezing.” |
| DL-2 What can I touch | PASS, opening controls only | The boxed light-fire/stoke-fire control looked clickable. The audio sheet had two boxed choices. No inert object tried in this minute. No later control counts toward this pass. Screenshots 01 and 02. |
| DL-3 Urgency and selection | PASS, limited opening situation | The boxed action and newest dark log lines drew me. The stranger drew attention at 57.684 s. I saw no selected object and no stated timed emergency. Old log entries faded, distinguishing history from recent lines. Screenshot 02. |
| DL-4 Why the limit | FAIL, explanation not understood | The stoke control was grey with a moving fill in screenshot 02. I inferred waiting, but could not say what circumstance prevented stoking or what the fill specifically represented. No explanatory words encountered by the checkpoint. This is a comprehension finding, not a claim about the implementation or an arbitrary quota. |
| DL-5 Readable situation | PASS | The fire was roaring and the room was cold; I could wait for warmth or stoke when available. The stranger had just arrived. “the fire is roaring.” and “the room is cold.” gave me a readable consequence. |
| DL-6 A choice soon | PASS for a consequential starting action | Light fire was available in the first usable reply, about 0 s after that screen, before a long introduction. First input: enable audio at 12.303 s, about 11.7 s after the screen. First gameplay input: light fire at 15.170 s, about 14.5 s after the screen. This was an act-versus-wait choice; no branching gameplay alternatives reached in the first minute. The first explicit two-option gameplay event was observed later, at 180.573 s. |
| DL-7 Learn by doing | PASS for 2 gameplay interactions reached | Lighting changed the title and made the fire burn. Stoking made it roar, and the room changed from freezing to cold. Audio choice also reached; no help used. Gathering, place navigation, construction, trap checks and events were NOT TESTED at this checkpoint (5 later-reached interaction categories). Other unreached interactions: NOT TESTED; total unknown. |

The access method includes screenshots, so this was not a text-only visual test. However, the text replies sometimes listed controls that were absent from screenshots. Visual claims above use the inspected screenshots.

## Verbatim diary

Every reaction below preserves its original wording. Visible-answer lines are selected live-response evidence, not rewritten reactions. `game_clock` was “not shown” on every recorded operation except the initial open, which had no supplied annotation. Repeated historical log text is omitted from the selected answers. Screenshot filenames refer to the screenshot directory listed at the end.

- **0.635 s** — `{"op":"open"}`
  - Reaction, verbatim: (none recorded)
  - Visible answer: “A Dark Room”; “light fire”; “the fire is dead.”; “the room is freezing.”
- **4.177 s** — `{"op":"shot","file":"01-cold-room.png"}`
  - Reaction, verbatim: “The room is freezing. Light fire is the one obvious job, and the boxed label looks clickable. I want to get the room warm.”
  - Visible answer: Audio sheet: “Sound Available!”; “enable audio”; “disable audio”.
- **12.303 s** — `{"op":"tap","text":"enable audio"}`
  - Reaction, verbatim: “I will take the sound. Then I want that fire going.”
  - Visible answer: Footer changed to “sound off.” The audio sheet text remained in this immediate reply.
- **15.170 s** — `{"op":"tap","text":"light fire"}`
  - Reaction, verbatim: “Light fire should warm the room. That is enough of a start for me.”
  - Visible answer: “A Firelit Room”; “stoke fire”; “the fire is burning.”
- **28.503 s** — `{"op":"wait","s":10}`
  - Reaction, verbatim: “The title changed to Firelit Room. I will give it a moment to warm up.”
  - Visible answer: Still “the fire is burning.” and “the room is freezing.”
- **33.733 s** — `{"op":"tap","text":"stoke fire"}`
  - Reaction, verbatim: “Still freezing, so I will add more fire. I expect this to make it hotter.”
  - Visible answer: “the fire is roaring.”; “the room is cold.”
- **37.185 s** — `{"op":"shot","file":"02-fire-roaring.png"}`
  - Reaction, verbatim: “Roaring and cold is progress. I am watching for whatever the light attracts.”
  - Visible answer: Screenshot shows a grey stoke control with a partial fill.
- **57.684 s** — `{"op":"wait","s":17}`
  - Reaction, verbatim: “The fire is already roaring. I will let the room catch up instead of pressing again immediately.”
  - Visible answer: “a ragged stranger stumbles through the door and collapses in the corner.”
- **64.960 s** — `{"op":"log","kind":"first_minute","input":"60-second checkpoint"}`
  - Reaction, verbatim: “I am keeping the room warm. Light fire was the obvious boxed control; now it says stoke fire. The new lines at the top draw me first, especially the stranger collapsing. I do not see a selected object or a timed emergency. The grey stoke button had a filling bar, so I think it needs time, but it never said why. I lit the fire and stoked it; burning became roaring and freezing became cold. Those consequences made sense. The stranger has no obvious separate action yet. I want to see who this is.”
  - Visible answer: No new gameplay observation beyond the 57.684-second reply.
- **72.764 s** — `{"op":"tap","text":"stoke fire"}`
  - Reaction, verbatim: “I will keep the stranger warm. I do not see a talk or help button.”
  - Visible answer: Wood 3; “A Silent Forest”; “the room is mild.”; “the wood is running out.”
- **78.292 s** — `{"op":"tap","text":"gather wood"}`
  - Reaction, verbatim: “There is the next job. Only three wood left, so I want a stockpile before I run out.”
  - Visible answer: Wood 13.
- **82.583 s** — `{"op":"shot","file":"03-wood-unlocked.png"}`
  - Reaction, verbatim: “Thirteen wood from that click. That is a satisfying little supply jump. I want to find out what the forest lets me build.”
  - Visible answer: Wood 13; screenshot 03.
- **112.958 s** — `{"op":"wait","s":25}`
  - Reaction, verbatim: “The gather bar is refilling. I am content to wait a little for another ten wood.”
  - Visible answer: “the stranger shivers, and mumbles quietly. her words are unintelligible.”; “the room is warm.”
- **116.870 s** — `{"op":"tap","text":"gather wood"}`
  - Reaction, verbatim: “Warm now, and she is starting to speak. I will collect more while she recovers.”
  - Visible answer: Wood remained 13 after the gather tap.
- **122.629 s** — `{"op":"shot","file":"04-waiting-for-gather.png"}`
  - Reaction, verbatim: “That gather click did nothing. I probably clicked before the bar finished; I cannot see a time remaining.”
  - Visible answer: “the room is hot.”; wood 13. Screenshot 04 shows a grey gather control.
- **127.991 s** — `{"op":"tap","text":"A Silent Forest"}`
  - Reaction, verbatim: “The forest name looked like another place. I want to see the outdoor screen rather than just keep clicking gather.”
  - Visible answer: “dry brush and dead branches litter the forest floor.”; “the sky is grey and the wind blows relentlessly.”
- **147.159 s** — `{"op":"wait","s":15}`
  - Reaction, verbatim: “There is wood on the forest floor. I will try again when the gather control clears.”
  - Visible answer: Wood still 13.
- **151.038 s** — `{"op":"tap","text":"gather wood"}`
  - Reaction, verbatim: “Time for another load. I would like to get ahead of the fire rather than scrape by.”
  - Visible answer: Wood 23.
- **155.153 s** — `{"op":"tap","text":"A Firelit Room"}`
  - Reaction, verbatim: “Twenty-three wood is comfortable for now. I want to check on the stranger.”
  - Visible answer: “the stranger in the corner stops shivering. her breathing calms.”; “the stranger is standing by the fire. she says she can help. says she builds things.”
- **159.050 s** — `{"op":"shot","file":"05-builder-arrives.png"}`
  - Reaction, verbatim: “She builds things. That is the bit I was hoping for. I am looking for a build button now.”
  - Visible answer: Wood 25, up from 23 without another gather. Screenshot 05 shows room and forest headings.
- **180.573 s** — `{"op":"wait","s":17}`
  - Reaction, verbatim: “Wood is increasing without another gather click. I think she is helping already. I will see what she offers next.”
  - Visible answer: Wood 29. “Noises”; “scratching noises can be heard from the store room.”; “investigate”; “ignore them”.
- **185.319 s** — `{"op":"log","kind":"pulse","engagement":4,"input":"three-minute pulse"}`
  - Reaction, verbatim: “I have help and growing stores now, and the scratching gives me something new to decide.”
  - Visible answer: Same pending Noises choice.
- **190.048 s** — `{"op":"shot","file":"06-noises-choice.png"}`
  - Reaction, verbatim: “Investigate or ignore them are clear choices. I want to protect the stores, so I will investigate.”
  - Visible answer: Wood 31 remains readable beside the Noises sheet in screenshot 06.
- **193.604 s** — `{"op":"tap","text":"investigate"}`
  - Reaction, verbatim: “I want to know what is taking an interest in my stockpile.”
  - Visible answer: Teeth 1; wood 28. “some wood is missing.”; “the ground is littered with small teeth”; “leave”. New “trap” and “cart” labels also appeared in the reply.
- **198.350 s** — `{"op":"tap","text":"leave"}`
  - Reaction, verbatim: “Some wood lost, one tooth gained. I do not know what the tooth is for, but the cart sounds useful.”
  - Visible answer: Wood 30. Immediate reply still included the Noises result text.
- **202.482 s** — `{"op":"shot","file":"07-first-builds.png"}`
  - Reaction, verbatim: “Cart should improve my wood hauling; trap should bring in something new. I want to see their costs before deciding.”
  - Visible answer: Screenshot 07 shows build buttons “trap” and “cart”, wood 30, and no price beside either button.
- **206.391 s** — `{"op":"tap","text":"cart"}`
  - Reaction, verbatim: “I cannot see a price beside it. I will try cart because hauling more wood is the upgrade I want.”
  - Visible answer: Wood 2. “the rickety cart will carry more wood from the forest.”
- **209.986 s** — `{"op":"tap","text":"A Silent Forest"}`
  - Reaction, verbatim: “That used nearly all my wood. I expected an upgrade, but I wish I had seen the price first. Let us see the bigger load.”
  - Visible answer: Cart 1; “pop 0/0”; wood 2.
- **213.301 s** — `{"op":"tap","text":"gather wood"}`
  - Reaction, verbatim: “I want to see how much the cart improves each trip.”
  - Visible answer: Wood 52. New “hut” label.
- **217.036 s** — `{"op":"tap","text":"A Firelit Room"}`
  - Reaction, verbatim: “Fifty instead of ten. That is a proper upgrade. Now a hut appeared; I want people living here.”
  - Visible answer: Wood 54. “builder says there are more wanderers. says they'll work, too.”
- **224.176 s** — `{"op":"tap","text":"hut"}`
  - Reaction, verbatim: “A hut for wanderers sounds like the next big step. I will try it.”
  - Visible answer: Wood 54 unchanged. “not enough wood.”; tooltip “wood 100”.
- **229.862 s** — `{"op":"shot","file":"08-hut-cost.png"}`
  - Reaction, verbatim: “Now I can see wood 100 by the hut and not enough wood. Good, one more cartload should do it. The price seems to appear when the pointer is over it.”
  - Visible answer: Wood 56; screenshot 08 shows the hut tooltip below the button.
- **265.673 s** — `{"op":"wait","s":30}`
  - Reaction, verbatim: “I am saving for the hut rather than buying traps yet. One bigger gather will get me there.”
  - Visible answer: Wood 62; hut tooltip “wood 100”.
- **275.014 s** — `{"op":"tap","text":"A Silent Forest"}`
  - Reaction, verbatim: “The gather should be ready now. I am going back for the hut wood.”
  - Visible answer: Wood 64.
- **278.834 s** — `{"op":"tap","text":"gather wood"}`
  - Reaction, verbatim: “This should put me past the hundred.”
  - Visible answer: Wood 116.
- **282.098 s** — `{"op":"tap","text":"A Firelit Room"}`
  - Reaction, verbatim: “Back inside to build the hut.”
  - Visible answer: Wood 116; building labels still present in reply.
- **285.820 s** — `{"op":"tap","text":"hut"}`
  - Reaction, verbatim: “I have the hundred wood. Let us give the wanderers somewhere to live.”
  - Visible answer: Wood 16. “builder puts up a hut, out in the forest. says word will get around.” Tooltip now “wood 150”.
- **289.256 s** — `{"op":"tap","text":"trap"}`
  - Reaction, verbatim: “I have a little wood left. A trap would start a second kind of supply while I wait for people.”
  - Visible answer: “A Lonely Hut”; wood 8; hut 1; “pop 0/4”; next trap tooltip “wood 20”. “more traps to catch more creatures.”
- **294.330 s** — `{"op":"tap","text":"A Lonely Hut"}`
  - Reaction, verbatim: “The place name changed because I built something. I like that. I want to check the trap outside.”
  - Visible answer: Trap 1; new “check traps” control.
- **300.096 s** — `{"op":"tap","text":"check traps"}`
  - Reaction, verbatim: “I have just set it, so there may not be anything yet. I want to see how checking works.”
  - Visible answer: Teeth 2; bait 0; wood 10. “the traps contain scattered teeth.”
- **304.981 s** — `{"op":"tap","text":"gather wood"}`
  - Reaction, verbatim: “I will keep the wood coming while the hut is empty.”
  - Visible answer: Wood stayed 10 after gather tap.
- **334.072 s** — `{"op":"wait","s":25}`
  - Reaction, verbatim: “Gather is still cooling down. I am waiting for another load rather than spending the last few wood.”
  - Visible answer: Wood 16; population 0/4.
- **339.531 s** — `{"op":"tap","text":"gather wood"}`
  - Reaction, verbatim: “Another load, then I can add traps while I save toward a second hut.”
  - Visible answer: Wood 68.
- **342.779 s** — `{"op":"tap","text":"check traps"}`
  - Reaction, verbatim: “I want something besides teeth this time.”
  - Visible answer: Teeth 2 unchanged; no new trap result.
- **346.912 s** — `{"op":"tap","text":"A Firelit Room"}`
  - Reaction, verbatim: “I can build another trap while those actions refill.”
  - Visible answer: Wood 70; no newly observed change of screen.
- **350.628 s** — `{"op":"tap","text":"trap"}`
  - Reaction, verbatim: “Twenty wood for another trap looked manageable. I want more coming in each check.”
  - Visible answer: Wood 70 and trap 1 unchanged.
- **355.461 s** — `{"op":"shot","file":"09-more-traps-attempt.png"}`
  - Reaction, verbatim: “The trap click did not spend anything. I want to check whether it is still cooling down.”
  - Visible answer: Screenshot 09 shows outdoor gather/check controls and village counts; room/forest headings are absent from the image.
- **364.825 s** — `{"op":"log","kind":"pulse","engagement":3,"input":"six-minute pulse"}`
  - Reaction, verbatim: “I like the hut and cart, but I am waiting for people and my recent clicks have been less clear. I want another useful unlock.”
  - Visible answer: Population still 0/4; wood 70.
- **370.638 s** — `{"op":"scroll","dy":-400,"x":600,"y":400}`
  - Reaction, verbatim: “The place headings are not on the screenshot now. I will scroll up to find them.”
  - Visible answer: Wood 74. Noises event returned: “investigate” / “ignore them”.
- **374.445 s** — `{"op":"tap","text":"investigate"}`
  - Reaction, verbatim: “The scratching is back. I will investigate again; last time it was only a little wood.”
  - Visible answer: Scales 1; wood 67. “the fire is burning.” Event result: “some wood is missing.”; “the ground is littered with small scales”.
- **378.312 s** — `{"op":"tap","text":"leave"}`
  - Reaction, verbatim: “Scales this time. I am still not sure what these odd materials will become.”
  - Visible answer: Wood 69. Immediate reply still included event result.
- **382.941 s** — `{"op":"shot","file":"10-current-screen.png"}`
  - Reaction, verbatim: “I want to get back to building and put more wood on the fire.”
  - Visible answer: Screenshot 10 shows outdoor controls, no location headings. Text reply still lists both headings and room build labels.
- **393.641 s** — `{"op":"tap","x":450,"y":30}`
  - Reaction, verbatim: “I am trying the room heading position at the top. The text response still lists A Firelit Room, but I cannot see the heading in the recent picture.”
  - Visible answer: “the room is warm.”; wood 71. No visible return to the room was established.
- **398.546 s** — `{"op":"scroll","dy":-800,"x":1180,"y":400}`
  - Reaction, verbatim: “I will try scrolling the page itself up. I want the room tab back.”
  - Visible answer: Wood 73; same listed controls.
- **408.327 s** — `{"op":"shot","file":"11-navigation-missing.png"}`
  - Reaction, verbatim: “Scrolling and clicking the old heading position did not get the room back. I still see the outdoor controls, but the place headings have disappeared from the picture.”
  - Visible answer: Screenshot 11 still lacks location headings. Gather/check controls are now black and available; wood 75 in text reply.
- **419.629 s** — `{"op":"log","kind":"want_quit","reason":"FRUSTRATED","input":"wish to leave"}`
  - Reaction, verbatim: “I would leave this running now. I want to get back inside and build, but the headings are gone from the picture and trying the room name has not brought it back. Gathering alone is not what I want to keep doing. I would check back later because the cart and hut were promising.”
  - Visible answer: Wood 75; cart 1, hut 1, trap 1, population 0/4.
- **424.942 s** — `{"op":"tap","x":451,"y":75}`
  - Reaction, verbatim: “I will take one last load with the visible gather button, then leave it for later.”
  - Visible answer: Visible coordinate tap worked: wood increased to 127.
- **430.406 s** — `{"op":"log","kind":"stop","reason":"FRUSTRATED","input":"end session"}`
  - Reaction, verbatim: “I am stopping on A Lonely Hut with one cart, one hut, one trap and no villagers yet. The last gather worked, but it did not solve getting back to building. The wish to leave has not passed. I would return later to see the hut fill up; I am not done with the idea of this game.”
  - Visible answer: Wood 127; cart 1, hut 1, trap 1; population 0/4; room warm, fire burning.

## Best moment, worst moment, wishes to leave, and pulses

**Best moment:** 213.301–217.036 s, about 3:33–3:37. The first cart gather took wood from 2 to 52. My reaction was: “Fifty instead of ten. That is a proper upgrade. Now a hut appeared; I want people living here.” This was the clearest moment when something I had built made the next thing easier.

**Worst moment:** 408.327–419.629 s, about 6:48–7:00. The outdoor controls remained visible, but the place headings were missing. I could not get back to building through the room-name tap, an old heading coordinate, or scrolling. The text reply continued to list the headings and build controls. I do not know why the text and image disagreed.

**Every want_quit:**

| Driver elapsed | Reason | Verbatim reaction | Outcome |
|---|---|---|---|
| 419.629 s | FRUSTRATED | I would leave this running now. I want to get back inside and build, but the headings are gone from the picture and trying the room name has not brought it back. Gathering alone is not what I want to keep doing. I would check back later because the cart and hut were promising. | Did not pass. One final visible gather worked; I then stopped. |

This was the first recorded wish to leave. The 364.825-second pulse records lower engagement and unclear clicks, without an expressed wish to leave.

**Pulse series:**

| Driver elapsed | Engagement | Verbatim reason |
|---|---|---|
| 185.319 s | 4/5 | I have help and growing stores now, and the scratching gives me something new to decide. |
| 364.825 s | 3/5 | I like the hut and cart, but I am waiting for people and my recent clicks have been less clear. I want another useful unlock. |

No nine-minute pulse was due before stopping.

## Clarity findings

- **DL-4: “I think it needs time, but it never said why.”** At the checkpoint I could see the stoke fill but could not explain the limit beyond a guess. Screenshot 02, 37.185 s. Later gather attempts at 116.870 s and 304.981 s also left stores unchanged while the controls were unavailable. This does not establish what rule causes the limit.
- **DL-2 / DL-5: “the place headings have disappeared from the picture.”** Screenshot 05 at 159.050 s and screenshot 08 at 229.862 s show the location headings. Screenshots 09–11 do not. The text replies still list “A Firelit Room” and “A Lonely Hut.” A room-name tap at 346.912 s, scrolling at 370.638 s and 398.546 s, and a tap at the earlier heading position at 393.641 s did not establish a return to the room. This is an observed access/comprehension failure in this session. **Cause unresolved:** I cannot assign it to the game or driver. Some earlier screenshots also omitted headings, so this was not first observed at the final stop. I did not inspect implementation or repair access.
- **DL-13: no clear acknowledgement for several ineffective taps.** Gather at 116.870 s left wood at 13; check traps at 342.779 s left teeth at 2; trap at 350.628 s left trap count at 1 and wood at 70. Grey controls explained some no-change attempts visually. The latter trap attempt may have targeted a label outside the displayed room; the reply alone cannot establish that it hit a build control. Accepted actions did give clear feedback, including the cart, hut, and final coordinate gather.
- **DL-14, unresolved rather than a confirmed failure:** I bought the cart without seeing its cost. Screenshot 07 shows no price beside the build buttons. Clicking the unavailable hut later revealed a “wood 100” tooltip, shown in screenshot 08. The supplied driver has no hover-only operation, so I could not test how a normal pointer hover would reveal the cart price before clicking. My surprise at spending nearly all the wood is real; a claim that the game never shows the price would exceed the evidence.

## English, dates, layout, and hands on

| Item | Status | Observed scope |
|---|---|---|
| DL-20 English | PASS | All action-critical text encountered was understandable English: light/stoke fire, gather wood, build labels, check traps, investigate/ignore, leave. No necessary untranslated local term met. Teeth and scales had unknown future uses, not unknown English meanings. |
| DL-21 Dates | NOT TESTED | No date, deadline, relative day or season encountered. No deadline-versus-today comparison available. |
| DL-22 Phone response visibility | NOT TESTED | Desktop assignment only. Did not resize to the phone fixture. |
| DL-30 Nothing cut off | PASS for inspected active desktop sheets and early action labels; phone NOT TESTED | Audio and Noises sheets showed complete immediate text and choices in screenshots 01 and 06. The hut cost tooltip was readable in 08. No essential sentence found cut mid-way inside a sheet. Faded historical log text was not treated as a current instruction. Missing location headings are recorded separately above; I cannot establish clipping as their cause. |
| DL-31 State while answering | NOT TESTED for the complete goal/deadline/person test | In screenshot 06 I could still read wood 31 beside the Noises choice and recent room/stranger text. No explicit goal progress or deadline was available to compare. No order sheet with that full set of state was reached. |
| DL-32 Longest wanted-action wait | NOT TESTED for the strict all-actions-unavailable threshold | The longest explicit real-time wait request was 30 s, ending at 265.673 s, while saving for the hut. I wanted another cartload. The early gap between successful gathers was 72.746 s (78.292 to 151.038), with an unsuccessful attempt at 116.870 s. That input interval is not a measurement of how long gathering was unavailable. Stoking/place navigation existed during parts of these waits. I cannot claim that every meaningful hands-on option was unavailable for that entire stretch. Later I wanted to build but could not restore room navigation; its cause is unresolved. |
| DL-33 Direct acts | PASS for verbs reached | Light fire, stoke, gather wood and check traps were single actions, with visible results after accepted inputs. They did not open a planning form. Construction also completed directly. The Noises event used a short choice sheet; it did not require a strength/reason/confirm form. No drawn person or object target was present for the resource verbs. |

Other supplied DL ids, limited to what I met:

| Item | Status | Evidence or gap |
|---|---|---|
| DL-8 Priority | PASS early; later navigation issue above | New dark log text, older fading text, boxed actions. |
| DL-9 Obligations outside log | NOT TESTED | No known timed obligation met. Noises had an explicit response sheet. |
| DL-10 Stable labels | PASS in interactions reached | Fire, wood, cart, hut and trap labels remained recognisable. Location rename to A Lonely Hut followed construction and made sense to me. |
| DL-11 Short essential text | PASS for player reading; builder layout check NOT TESTED | Opening and both short event choices required little reading. No word-count audit or builder check performed. |
| DL-12 Session boundary | NOT TESTED | No day/chapter/game ending reached. The stop was mine. |
| DL-13 Feedback | NOT TESTED conclusively for ineffective taps | Accepted actions gave clear results. For several ineffective taps I could not establish whether an active control was hit. Details above. |
| DL-14 Known costs | NOT TESTED conclusively | Price discovery was limited by the lack of a hover-only driver operation. |
| DL-15 Time and live-choice slowdown | NOT TESTED in full | Time plainly advanced while I waited: warmth changed, stranger recovered, stores grew. No displayed game clock or selected speed observed. No faster speed or slowdown test performed. |
| DL-16 Tasks have responses | PASS for opening cold and Noises | Fire act addressed cold; investigate/ignore addressed the store-room event. No claim about later tasks. |
| DL-17 Feelings drawn or said | PASS for stranger observations | Shivering, quiet mumbling, calm breathing and “she says she can help” conveyed her condition. No mood percentage encountered. |
| DL-18 Numbers in fiction | PASS for counts encountered, with no source claim | Supplies, buildings and population were counted. I did not inspect how counts were derived. |
| DL-19 Cues | PASS for fire/cart/hut expectations reached | Fire warmed the room; cart increased load; hut gave population capacity. No prediction that villagers must arrive within a known time. |
| DL-23 Targets | NOT TESTED | No hit-area measurement or phone fixture. |
| DL-24 Sheet stack and return | NOT TESTED in full | Audio and Noises each appeared alone. No nested-sheet return/focus test. |
| DL-25 Reflow | NOT TESTED | No phone, 320 px, 200% text, or alternate-theme checks. |
| DL-26 Menu/save organisation | NOT TESTED | Footer showed save/restart/share; did not open them. |
| DL-27 Resume | NOT TESTED | No reload/resume. |
| DL-28 Send | NOT TESTED | Sending not authorised and not attempted. |
| DL-29 Export replay | NOT TESTED | No export/import/replay attempted. |

“PASS” above applies only to the observed interaction scope. All builder-only checks are NOT TESTED.

## Stop and return

I stopped at **430.406 s**, reason **FRUSTRATED**, on the outdoor screen for A Lonely Hut. Last visible state: one cart, one hut, one trap, population 0/4, wood 127, teeth 2, scales 1, bait 0. The room was warm and the fire was burning in the recent text.

The first wish to leave did not pass. I would have left the game running and checked back later. I would return voluntarily because the cart improvement and the hut were promising. This was not a finished game or a rejection of idle growth.

No driver operation returned an error. The final coordinate gather changed wood, so the page was not proven broken or wholly blocked. I used FRUSTRATED rather than TOOL because the observed problem was finding my way back to building, with the cause unknown. A coordinator should not read this as a confirmed game-only navigation defect or as a clean measure of boredom with the game.

## Changes I would want as this player

1. Keep the way back to the room visible and usable. That is what stopped this session; whether the correction belongs to the game or access method needs a separate investigation.
2. Make a build price visible before the click using this access method. I wanted the cart, but I did not intend to buy without knowing the cost.
3. Say what the grey refill controls mean, so an early click does not leave me wondering whether it worked.

## Artifacts

- Screenshots: `(driver scratch)/e-adrfree1-shots/`, files 01-cold-room.png through 11-navigation-missing.png (exact names in diary).
- Driver wall-clock log: `(driver scratch)/e-adrfree1-shots/wall-clock.jsonl`. Written by the driver; not opened for this report.
- Export: none.

