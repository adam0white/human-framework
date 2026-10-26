## 1. Session and exposure

Maya Chen, 24, Vancouver library assistant. Curious narrative-adventure and cooperative-puzzle player.

- **Game:** A Dark Room, https://adarkroom.doublespeakgames.com/
- **Exposure:** Return after incomplete title exposure only; no accepted earlier input or reliable play memory.
- **Continuity:** Supplied Voice free-stop diary only. Alternative continued history withheld. No recognition occurred.
- **Round / arm:** `hf3-voice-r1-control` / `continued`
- **Session:** `hf3-voice-r1-control-maya-chen`. Solo control; no paired comparison.
- **Build:** Not visibly available.
- **Device:** Pinned 1280×800 desktop, keyboard/mouse/light.
- **Access:** Supplied HTTP player driver, sequential curl POST calls to localhost:19480.
- **Limits:** Floor 15, ceiling 25 real minutes.
- **Timing:** First actionable screen 0.765s; first input 2.681s; final stop 926.802s—15m27s from opening.
- **Game clock:** No clock or date displayed. Time and resources changed during real waits.
- **Feedback:** Unavailable for this external control. No submission, receipt, player id or export.
- **Protocol deviation:** I selected **enable audio** at 27.522s to dismiss the opening sound prompt. This changed an audio setting despite the instruction to leave settings unchanged. No consent control was changed. I cannot establish audio output through this driver.
- **Artifacts:** Existing `wall-clock.jsonl` contains the full raw input records. Screenshots: `first-minute.png`, `current.png`, `current-wide.png`. The automatic first-minute artifact was preserved.

The browser is no longer needed. Coordinator owns driver/browser cleanup. No repository, worker, server, branch or worktree was created or touched.

## 2. First minute

The checkpoint note was **late, at 70.888s**. A 20-second wait returned at 62.827s. These assessments use evidence obtained before 60s and the automatic `first-minute.png`; later learning does not improve them.

Original checkpoint note:

> “I lit the fire because the room was freezing. Light fire was the first clear button; stoke fire followed. I want to help the collapsed stranger by warming the room, but I have no direct response to her. Stoke fire briefly could not be used; I do not know its waiting rule. The sound question covered the room and neither Escape nor clicking outside closed it. The new wood warning and forest appeared in the wait that crossed sixty seconds, so I cannot place them precisely before the checkpoint. My first input was at three seconds; I had one obvious action rather than a choice between plans. This note is late, after the wait.”

| Item | Result and checkpoint evidence |
|---|---|
| **DL-1 A reason to act** | **PASS.** “the fire is dead” and “the room is freezing” gave me a reason to light it. The collapsed stranger then gave warming the room a human purpose. |
| **DL-2 What can I touch** | **PASS, with a harness limit.** Light fire looked actionable; it became stoke fire. The sound dialog had enable/disable audio buttons. Escape and empty space did not dismiss it. The automatic screenshot shows underlined room/forest tabs and a bordered stoke-fire button. The text list also exposed language options that were not expanded in the screenshot, so it did not establish their actual visual visibility. |
| **DL-3 Urgency and selection** | **PASS for immediate priority.** The dead fire and freezing room drew me first. Then the stranger’s collapse mattered most. The sound dialog competed with that concern. No selected plan was shown. |
| **DL-4 Why the limit** | **FAIL for the encountered stoke-fire limit.** At 10.160s the tap returned “stoke fire is not on the page now.” The sound dialog was present. I did not know whether the issue was its cover, a recovery interval, or both. No condition for freeing the action was established then. |
| **DL-5 Readable situation** | **PASS.** Lighting produced “the fire is burning”; the later successful stoke produced “the fire is roaring.” The stranger had collapsed, and warming the room was a readable response. |
| **DL-6 A choice soon** | **PASS for action availability; NOT TESTED for an early strategic choice.** Light fire was available by 0.765s and used at 2.681s, before long text. It was one obvious game action, not a choice between plans. Audio alternatives appeared by 10.160s; first selection 27.522s. |
| **DL-7 Learn by doing** | **PASS for two reached fire interactions.** Light fire changed the title to “A Firelit Room”; stoking made the fire roar. The stranger’s arrival followed, but I only inferred that light attracted her. No help used. Gathering, building, worker assignments and event choices were **NOT TESTED within the checkpoint**—four later interaction types, not a claimed total for the game. |

The automatic screenshot establishes that the forest tab and wood warning existed at its capture. I had not acted on them before the checkpoint.

## 3. Verbatim diary and important inputs

Times are real elapsed seconds. No in-game clock was shown. Original reactions follow verbatim. The raw input lines remain in `wall-clock.jsonl`.

**2.681 — light fire.** Title changed to “A Firelit Room”; “the light from the fire spills from the windows, out into the dark.”

**7.464 — note:**

> “That is a lovely small beginning. I made light, and now I want to know what is outside the window. I am guessing the older lines stay as a history, because it still says the fire is dead below the new burning line.”

**10.160 — attempted stoke fire.** Game-state refusal; sound dialog present. **18.489 Escape** and **21.540 outside click** did not close it. **27.522 enable audio.** Dialog disappeared by 34.813s.

**34.813 — visible:** “a ragged stranger stumbles through the door and collapses in the corner.”

**36.819 — stoke fire.** “the fire is roaring.”

**40.672 — note:**

> “Someone came to the light. I want to help her, but the only thing I can do is make the fire bigger. I tried Escape and the empty space to close the sound question, then enabled audio to get past it; I have no audio evidence from this text driver.”

At this point “her” was my assumption; the later text supplied that pronoun.

**62.827 — wait returned.** Forest tab, wood 4 and gather wood appeared in the transcript. **70.888 — original first-minute note**, reproduced in section 2.

**77.675 — gather wood:** 4→14. **79.450 — stoke fire:** 14→13.

**111.484 — visible:** “the stranger shivers, and mumbles quietly. her words are unintelligible.” Room warm.

**116.656 — A Silent Forest.** “dry brush and dead branches litter the forest floor.” **118.543 — gather wood refused.** Screenshot at 121.582s showed the button pale.

**128.567 — note:**

> “The pale gather-wood button makes more sense in the picture than in the text list. I have already brought in ten wood; I suppose I must let that action recover. The stranger is still shivering even though the room is warm. I want a blanket or a way to speak to her.”

**167.290 — gather wood:** 13→23. **170.409 — A Firelit Room.** Stranger stopped shivering and offered to help: “says she builds things.”

**189.462 — pulse, engagement 4:**

> “She recovered and offered to help. Keeping that one little fire alive brought someone back to herself; I like that more than the wood number. I want to see what she builds.”

**225.930 — stoke fire.** Trap and cart appeared; builder described their purposes.

**231.448 — trap.** Wood fell; “more traps to catch more creatures.” **234.495 — cart:** “not enough wood”; cost 30 shown. **236.747 — forest. 238.772 — check traps:** fur 1, “the traps contain scraps of fur.” **241.130 — gather wood. 243.451 — room. 246.123 — cart:** “the rickety cart will carry more wood from the forest.”

**250.828 — note:**

> “I chose the trap first because I wondered what was alive outside. Scraps of fur is a rather lonely answer. The cart costs thirty wood, which I only noticed when I tried it without enough. Now I have made it and can understand the next gathering as an upgrade.”

**287.608 — forest. 290.670 — gather wood refused.**

**312.661 — A Ruined Trap:** “some of the traps have been torn apart”; “large prints lead away, into the forest.” Choices: track them / ignore them.

**315.555 — note:**

> “Oh, something large is actually out there. I would rather follow those prints than keep collecting sticks. Losing the trap feels like an invitation this time.”

**317.863 — track them.** “not far from the village lies a large beast, its fur matted with blood”; “it puts up little resistance before the knife.” Stores gained fur, meat and teeth.

**323.551 — note:**

> “I thought tracking would let me find out what it was. Instead I have already killed it with a knife I did not know I carried. That is a harsher answer than I meant to choose. Where did the village come from? I thought there were two of us in a room.”

**326.016 — go home.**

**363.931 — pulse, engagement 3:**

> “The beast was a surprise, but I miss being able to ask someone something. I am curious about the world and less interested in the repeated gathering.”

**368.954 — gather wood:** cart gathering brought a much larger increase; hut appeared. **372.368 — room.** Builder mentioned more wanderers. **374.924 — hut:** not enough wood; cost 100.

**413.001 — note:**

> “I can see wood rising without gathering now. I am guessing the builder is helping, but nobody told me that directly. I am waiting for a hut because more people sounds more interesting than more traps.”

**452.609 — hut built:** “builder puts up a hut, out in the forest. says word will get around.” **455.778 — forest tab:** now “A Lonely Hut,” population 0/4. **458.268 — gather wood.**

**490.848 — Penrose dialog.** Strange visions; give in / ignore it.

**497.447 — note:**

> “Penrose sounds like a different story trying to pull me away. I do not know what give in would do, and I still want to meet the people for the hut. I will ignore this one.”

**500.593 — ignore it. 535.991 — gather wood.**

**540.122 — pulse, engagement 2:**

> “I am maintaining a place, but I have not met anyone new in it yet. The little discoveries are getting farther apart than I want.”

**545.262 — want_quit, BORED:**

> “I would leave this running and make tea now. I understand gathering and buying buildings, but I wanted people or a puzzle, and I am mostly waiting for numbers. I will stay for the time I set aside.”

**548.342 — room.** “a weathered family takes up in one of the huts”; three gatherers. **552.703 — lodge:** not enough wood; costs 200 wood, 10 fur, 5 meat. **555.760 — stoke fire.**

**560.366 — note:**

> “A weathered family arrived just as I wanted to leave. I hoped I could meet them, but they appear as three gatherers. That is useful, but it is not the kind of company I was waiting for. I will try the lodge to see whether giving them a role makes a more interesting decision.”

**593.355 — stranger arrived:** population 4/4. **597.491 — hut tab. 600.838 — gather wood. 605.027 — room. 610.308 — lodge built. 616.059 — hut tab.**

Screenshot `current-wide.png` at **618.731s** showed worker arrows.

**623.559 — hunter up-arrow:** gatherers 4→3, hunter 0→1; fur/meat +0.5 per 10s. **628.576 — trapper up-arrow:** gatherers 3→2, trapper 0→1; meat −1 and bait +1 per 10s.

**634.625 — note:**

> “The little arrows let me move a gatherer into hunting and another into trapping. The rates appear when I touch them, which helps. A trapper makes bait out of meat; I had assumed a trapper would bring back animals. That name needed the numbers to explain it.”

**666.977 — A Beast Attack:** fight already resolved; villagers mourned dead. Population 2/4; hunter and trapper zero. The transcript also contained another family-arrival line, so I cannot reconstruct every population change within that wait.

**672.587 — note:**

> “They died while I was waiting. My hunter and trapper are both back at zero, and there is only go home. I feel oddly responsible for people I was never allowed to know. I cannot tell whether I could have protected them.”

**675.409 — go home. 712.338 — gather wood.**

**731.236 — pulse, engagement 2:**

> “The attack made me pay attention, but it did not give me a decision. I am back to collecting wood and would still rather pause this for now.”

**744.020 — room. 750.239 — replacement trap. 753.821 — hut tab:** baited trap 1. **756.815 — check traps:** bait 3→2; fur and meat increased. Another stranger arrived.

**761.267 — note:**

> “The replacement trap used bait by itself and brought back meat as well as fur. That is a neat little connection. Another stranger has arrived, but I no longer expect a conversation from that line.”

**801.254 — gather wood. 803.630 — room. 806.346 — second hut built. 840.915 — title became A Tiny Village; population 3/8.**

**846.581 — note:**

> “A Tiny Village is a pleasant change of title. I built the second hut almost automatically, though. I am no longer wondering what I would say to these people; I am looking at the next wood price. That is where the game has lost me tonight.”

**880.986 — population 8/8. 905.569 — Noises dialog:** scratching in store room; investigate / ignore them.

**909.910 — pulse, engagement 3:**

> “Just as I was about to stop, there is scratching in the store room. I will look once. A concrete mystery still gets me.”

**913.204 — investigate.** “some wood is missing”; “the ground is littered with small scales.” Scales 2 entered stores.

**917.828 — note:**

> “Small scales and missing wood: I picture a little creature eating the building supplies. That is a nice odd detail, but it has become another item in stores rather than something I can follow. I am ready to leave it here.”

**921.100 — leave.**

**926.802 — stop, BORED:**

> “I am stopping at the tiny village after investigating the store room. I liked rescuing the builder and the strange little signs of life, but I do not want another cycle of gathering and waiting tonight. My earlier wish to leave never really passed. I might leave it running while I made tea, but I would not choose to return for the building loop alone.”

## 4. Best, worst, quitting and engagement

**Best moment:** 170–189s, the stranger recovered and offered to build. The fire had produced a small human consequence. Highest logged engagement: **4 at 189.462s**.

**Worst moment:** 317–324s, tracking the beast automatically meant killing it. My curiosity had committed me to an action I had not intended.

**Every want_quit:** One, **545.262s — BORED**, quoted above. The wish persisted through the floor. New mysteries briefly raised engagement without reversing it.

| Pulse time | Engagement |
|---:|---:|
| 189.462s | 4 |
| 363.931s | 3 |
| 540.122s | 2 |
| 731.236s | 2 |
| 909.910s | 3 |

**Hard, but kept going:** No easier setting or accessibility workaround sought. I used screenshots to understand unavailable buttons and worker arrows. I continued through boredom because of the assigned floor; that is separate from seeking an easier mode.

## 5. Screen concepts and clarity findings

Counts cover distinct ideas introduced on each inspected screen or materially changed screen state. Reused ideas are not counted again. The driver’s language list was supplied in its player-facing transcript, but screenshots did not show it expanded.

| Screen and purpose | New concepts (list every one) | Concept count | Sentences reread (verbatim) | Reason |
|---|---|---:|---|---|
| Dark Room / opening | Dark room; dead fire; freezing room; light-fire action; saved status; language selection; sound control; app link; light/dark display control; unexplained hyper control; restart; share; manual save; GitHub link | 14 | none observed | Several peripheral controls accompany one simple action. Language choices were Czech, German, Greek, English, Esperanto, Spanish, French, Galician, Indonesian, Italian, Latvian, Japanese, Korean, Norwegian, Polish, Lithuanian, Portuguese, Brazilian Portuguese, Russian, Swedish, Thai, Turkish, Ukrainian, Vietnamese, simplified Chinese and traditional Chinese. Counted as one language-setting concept. |
| Firelit Room / maintain warmth | Stoke fire; fire strength; room warming over time; newest-first fading history; light reaching outside; collapsed stranger; stranger recovery; builder identity; passive wood increase | 9 | none observed | The human consequence was readable; passive production remained an inference. |
| Sound Available dialog | Audio activation choice; silence alternative | 2 | none observed | Covered the scene; Escape/outside click did not close it. |
| Silent Forest / gather | Place tabs; forest conditions; wood stores; gather wood; action recovery interval | 5 | none observed | Text list did not convey the pale disabled appearance. |
| Building controls / choose production | Trap construction; cart construction; wood costs; increasing trap price; resource shortage; trap checking; fur; bait; larger cart gathering | 9 | none observed | Purposes were readable; I discovered costs by trying purchases. |
| A Ruined Trap / event choice and result | Destroyed traps; large tracks; track/ignore choice; wounded beast; automatic knife killing; village reference; meat; teeth | 8 | none observed | “Track” committed to more than I expected. |
| Hut construction / attract residents | Hut; wanderers attracted by housing; increasing hut price; population capacity | 4 | none observed | Housing purpose was clear. |
| Lonely Hut / settlement | Village inventory; family arrival; residents as gatherers; later stranger arrivals; population total; passive worker production | 6 | none observed | People became a workforce rather than conversational encounters. |
| Penrose / vision interruption | Named Penrose vision; huge machine; twisting curves; give-in choice; ignore choice | 5 | none observed | Consequence of giving in unclear; I ignored it. |
| Lodge / worker assignment | Hunting lodge; multi-resource cost; hunter role; trapper role; worker reassignment arrows; production rates; meat-to-bait conversion | 7 | none observed | Rates clarified the unexpectedly named trapper role. |
| A Beast Attack / resolved loss | Beast attack; automatic combat resolution; villager deaths; worker losses; mourning; resources from beasts | 6 | none observed | No protective response was offered in the encountered dialog. |
| Baited trap / replacement | Automatic bait use; baited trap state; combined fur-and-meat yield | 3 | none observed | Satisfying connection between earlier resources. |
| Tiny Village / growth | Village title milestone; expanded capacity after second hut | 2 | none observed | Clear growth, but my input had become routine. |
| Noises / investigate stores | Scratching mystery; investigate/ignore choice; missing wood; small scales; scales as stored resource | 5 | none observed | Interesting clue resolved into an item rather than a further available investigation. |

More than one new idea appeared on every listed screen. This is a clarity-density finding, not evidence that every screen felt difficult. No sentence needed rereading. Rosa was not the assigned persona in this session; no Rosa exposure or diary was invented.

Specific findings:

- **DL-4:** At 10.160s, stoke fire was refused while a covering sound dialog was present. I could not tell what would free it.
- **DL-6 / choice meaning:** “track them” led directly to “it puts up little resistance before the knife.” Transcript 312.661–323.551s. I intended investigation and received a completed killing.
- **DL-5 / situation clarity:** “not far from the village” appeared before I had built a hut. I could not reconcile “village” with my picture of two people in a room.
- **Role wording:** “trapper” meant converting meat into bait, contrary to my initial expectation. The visible rates clarified it at 628.576s.
- **Outcome uncertainty:** Villager deaths were already resolved when A Beast Attack appeared. I could not tell whether prevention existed. This does not establish that the game has no protective rule.
- **Harness limitation:** Controls sometimes remained in the transcript while unavailable or on another tab. `current.png` at 121.582s established the pale gather button; the text list alone did not.

## 6. English, dates, layout and hands-on checks

| Check | Result |
|---|---|
| **DL-20 English** | **PASS for encountered actions.** I could act in English. No necessary cultural term blocked play. “Penrose” was unexplained, but ignoring it let me continue. On-request definitions **NOT TESTED**. |
| **DL-21 Dates** | **NOT TESTED.** No calendar, date or deadline encountered. Production rates used seconds; those are not calendar evidence. |
| **DL-22 Phone visibility** | **NOT TESTED — pinned desktop control.** No phone viewport visited under the control override. |
| **DL-30 Cut-off / overlap** | Desktop screenshots showed readable sentences without mid-sentence clipping or “Scroll ↓” barriers. The sound dialog overlapped the scene at 13.647s. Older history faded toward the bottom in later screenshots. Other event dialogs were read through the transcript; their layout is **NOT TESTED — not established by this harness evidence**. |
| **DL-31 Context with sheet open** | **NOT TESTED.** No qualifying order/answer sheet with a person, progress and deadline was encountered. |
| **DL-32 Forced watching** | The clearest measured unavailable interval was gather wood: successful at 77.675s, still pale/unavailable in the 121.582s screenshot, successful again at 167.290s. I wanted more wood for building. The exact re-enable time is unknown. I was not globally locked out; tabs and other actions existed. Longest individual deliberate wait was 30 real seconds. |
| **DL-33 Direct action or form** | Fire, gathering, construction, trap checks and worker arrows acted directly. Event choices opened or advanced short dialogs. Speaking, cooking and digging **NOT TESTED**. |
| **DL-13 Feedback** | **Unavailable.** External control had no HF feedback menu. No feedback control searched for or pressed; no note sent. |

## 7. Stop and voluntary return

Stopped at **926.802s, BORED**, after investigating the store-room noises and pressing leave. The settlement had two huts, a lodge and population 8/8 at the latest observation.

The first wish to leave did **not** pass. The beast, bait connection and scratching mystery produced brief curiosity. They did not make another gathering cycle attractive.

I might leave it running while making tea. I would not return voluntarily for the building loop alone. I would be more interested in another specific mystery or person.

## 8. Ranked wishes

1. Let “track them” mean following the tracks before committing me to kill.
2. Give me a way to engage with an arriving person beyond assigning their labour.
3. Make action recovery and production clearer without needing a screenshot or a purchase attempt.

No export downloaded. No replay claim. Coordinator saves this report; I did not write `report.md`.