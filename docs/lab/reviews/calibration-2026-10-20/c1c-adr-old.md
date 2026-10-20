# A Dark Room — Marta playtest

## Session

Marta, 33, hospital pharmacist. I play Cookie Clicker, Kittens Game and Melvor Idle. I enjoy growing something I built and unlocking the next thing. I dislike waiting with nothing to decide. This was an eight-minute lunch-break allowance on a work laptop.

URL: https://adarkroom.doublespeakgames.com/. No build identifier noticed. Desktop Chromium driven with Playwright, mouse-style clicks and hover, 1280×800 CSS px, light mode, default text size. One browser context and page persisted in a local Node process throughout. No game source, tests, prior reports, network payloads or debug APIs were consulted. No export downloaded. No run or telemetry submission control used. No privacy-consent control changed. I chose **disable audio** in the opening sound dialog as a work-laptop sound preference.

First usable page: **2026-10-20 16:10:39.192 UTC** (11:10:39.192 America/Chicago). Voluntary quit: **252.7 s / 4:12.7**, before the 480 s ceiling. The clock ran normally during tool use, observations and report/checkpoint writing. No time acceleration. The first-minute screen was captured at 60.5 s; checkpoint writing finished before gameplay resumed. Browser process ended by its exact PID after quitting.

Observation limitation: the body-text extraction also returned offscreen UI strings (for example, controls on the other location). I used screenshots to establish what was actually visible and did not treat those extra strings as discovered controls. Screenshot captures immediately after clicks sometimes caught fades or transitions. The settled screenshots cited below establish the resulting screens. A strict-label locator failed once before lighting the fire; this was an automation targeting error, not a player-facing refusal. Matching the visible control label with its additional descendant text succeeded.

## First minute

Checkpoint captured at **60.5 real seconds**, before further gameplay input. Evidence: `c1c-adr-old-shots/05-first-minute.png`. These answers were written at the checkpoint.

| Item | Status | Original checkpoint answer |
|---|---|---|
| DL-1 A reason to act | PASS | I need to warm this freezing room. “the fire is dead” and “the room is freezing” gave me an immediate reason. Now a stranger has collapsed here, so keeping it warm feels more important. |
| DL-2 What can I touch | PASS | The outlined light fire, then stoke fire, look clickable. The audio dialog had two outlined choices. The underlined room title and footer links also look interactive, but I have not tried them. I did not try any inert decoration. |
| DL-3 Urgency and selection | PASS | The boxed stoke fire draws me first. The underlined A Firelit Room names where I am. The newest story is at the top left; the collapsed stranger is the most concerning thing there. I see no countdown or separate selected object. |
| DL-4 Why the limit | FAIL | Stoke fire went grey after lighting it. It became available again, but no words said what stopped me or what would free it. I guessed cooldown from the grey box. |
| DL-5 Readable situation | PASS | The fire is roaring and the room is mild. A stranger has collapsed in the corner. I can stoke fire. I do not know whether I can help the stranger another way. |
| DL-6 A choice soon | PASS | Light fire was available at the first usable screen, 0 s. The first successful gameplay input was 28.6 s. It changed the room and the fire. This was one consequential action, not a choice between development paths. The first input of any kind was disable audio at 20.1 s. There were only a few mandatory story words. |
| DL-7 Learn by doing | PASS | Lighting changed the title to A Firelit Room and offered stoke fire. Stoking made the fire roar; the room then became mild. I learned these two action labels by using them. No help used. Other interaction types: 0 tested so far; their total number is unknown and they are NOT TESTED. |


## Verbatim diary

The reactions below retain their original wording. Blank reactions mean an action-only log entry. Times are real elapsed seconds from the first usable screen; the JSONL also retains UTC timestamps. Visible-answer notes in this table are only those recorded contemporaneously in the log.

| Elapsed s | Input | Reaction, verbatim | Visible answer recorded at the time |
|---|---|---|---|
| 0 | open game | I see the room for the first time. |  |
| 20 | inspect opening; choose disable audio | The cold room and boxed light fire tell me where to start. An audio question got in the way; I am at work, so silence. |  |
| 20.1 | click disable audio |  |  |
| 20.1 | observe | I want to warm the room and see what opens next. |  |
| 28.6 | click light fire[\s\S]* |  |  |
| 34.7 | observe | The room title changed and the fire is burning. That is satisfying, but stoke fire is now the only thing to do. I assume the filling box is a cooldown; it does not say why I must wait. | A Firelit Room; stoke fire; the fire is burning. |
| 40.2 | observe | The room is still cold, so I will feed the fire again. |  |
| 40.2 | click stoke fire[\s\S]* |  |  |
| 81.1 | first-minute checkpoint at 60.5 s; no gameplay input | A stranger has arrived. That is the first hook beyond warming the room. I want to help, but I only see stoke fire. | the room is mild; a ragged stranger stumbles through the door and collapses in the corner; the fire is roaring |
| 88.1 | observe | There is a second place now and only four wood. I want to see what I can collect outside. |  |
| 88.1 | click A Silent Forest |  |  |
| 94 | observe | Gather wood is exactly what I was hoping to do. Let me build a reserve. |  |
| 94 | click gather wood[\s\S]* |  |  |
| 121.2 | observe | Four wood became fourteen straight away. I like seeing a stockpile start. Now I am watching the gather box refill; I would rather have a second job to do. |  |
| 125.8 | observe | I will check the stranger while gathering recovers. |  |
| 125.8 | click A Firelit Room |  |  |
| 135.9 | observe | She is shivering even though the room is hot. I cannot see a way to speak to her or offer anything. I will leave the roaring fire alone and collect more wood. |  |
| 136 | click A Silent Forest |  |  |
| 164.1 | observe | This first wood wait is long for a lunch break. I have been ready to gather again for most of a minute. Tending an already roaring fire would just be clicking for something to do. |  |
| 168.5 | observe | I will take another load. I am still curious what the stranger will unlock. |  |
| 168.6 | click gather wood[\s\S]* |  |  |
| 204.4 | observe | Penrose sounds like a different story, and give in is too vague to risk my little stockpile. I want to stay here, so ignore it. |  |
| 204.5 | click ignore it |  |  |
| 210.1 | observe | I will check her once more. If there is still only the fire and the wood timer, I would switch back to work. |  |
| 210.1 | click A Firelit Room |  |  |
| 217 | observe | She builds things! And wood has climbed to twenty-six without another gather. That is the sort of growth I came for. I will give it a little longer to show me what we can build. | she says she can help. says she builds things.; wood 26 |
| 244.6 | observe | Thirty wood and still no build choice in the room. I will look outside once, but I do not want to spend my break waiting for an unknown threshold. |  |
| 244.6 | click A Silent Forest |  |  |
| 252.7 | quit voluntarily; no further gameplay | I am stopping here. I could gather another ten wood, but I still cannot spend it or choose what to build. I like the recovery and the growing pile; I do not want another minute of this loop on my lunch break. | A Silent Forest; gather wood available; wood 32 |


Important visible answers, paired with inputs and screenshots:

| Time | Input / observation | Visible answer / evidence |
|---|---|---|
| 8.4 s | Opening screenshot | “the fire is dead.” / “the room is freezing.”; audio dialog overlapped the light-fire area. `00-opening.png` |
| 20.1 s | Disable audio | Dialog dismissed after its fade. This was the first successful input of any kind. |
| About 22.6 s | Attempt light fire with strict full-text matching | Locator timed out after 2.5 s. No game result claimed. |
| 28.6 s | Light fire | Title became “A Firelit Room”; “stoke fire” greyed out. Later log: “the fire is burning.” `02-fire.png` |
| 40.2 s | Stoke fire | “the fire is roaring.” Room later became mild. `05-first-minute.png` |
| 60.5 s | Checkpoint | “a ragged stranger stumbles through the door and collapses in the corner.” `05-first-minute.png` |
| 84.1 s | Observe room | A Silent Forest tab appeared; stores showed wood 4. “the wood is running out.” `06-forest-unlocked.png` |
| 88.1–91.1 s | Open forest; wait for transition | Gather wood visible. `08-forest-ready.png` |
| 94.0 s | Gather wood | Wood rose from 4 to 14. “dry brush and dead branches litter the forest floor.” Gather control greyed. `09-gather.png`, `10-gather-wait.png` |
| 125.9–131.6 s | Return to room; hover stoke fire | “the stranger shivers, and mumbles quietly. her words are unintelligible.” / “the room is hot.” / “the fire is roaring.” No explanatory tooltip appeared in the captured hover. `12-stranger.png` |
| 140.0 s | Observe forest | Gather wood still grey. `13-gather-still-grey.png` |
| 164.2 s | Observe forest | Gather wood available again; wood 14. Exact unlock time was not sampled. `14-gather-ready.png` |
| 168.6 s | Gather wood | Wood 24; same dry-brush feedback. `15-second-load.png` |
| 198.8 s | Observe | Penrose dialog: “visions of people and places, of a huge machine and twisting curves.” Choices “give in” / “ignore it”. `16-after-second-load.png` |
| 204.5 s | Ignore it | Dialog subsequently closed; remained in the game. No further consequence identified. |
| 210.2–213.2 s | Return to room | “she says she can help. says she builds things.” / “her breathing calms.” Wood 26 without another gather. `19-builder-arrives.png` |
| 237.1 s | Observe room | Wood 30. Still only stoke fire in the room. `20-looking-for-build.png` |
| 247.7 s | Observe forest | Wood 32; gather wood available. `21-last-forest.png` |
| 252.7 s | Quit | Final screenshot shows wood 34; the quit reaction referred to the previously observed 32. No further input. `22-quit.png` |

## Best, worst, and leaving

**Best:** the stranger recovered and said she builds things, while wood started increasing without another gather. At 217.0 s I felt the start of the growing system I enjoy. The room changing from freezing darkness to warmth also gave my first action a clear result.

**Worst:** the first gather cooldown. At 121.2 s I already wanted a second job; at 164.2 s I described most of a minute spent ready to gather again. Switching rooms gave me a story update, but no way to speak to the stranger. I was not angry; I was losing interest in spending lunch on it.

I first mentioned going back to work at 210.2 s, then stayed because the stranger offered a new possibility. At **252.7 s** I quit in A Silent Forest with gather wood available. I could repeat the resource action, but I could not yet find a use for the stockpile. I did not reach a game ending. The budget did not force the quit.

I would consider returning voluntarily when I could leave an idle game open while doing something else. I would not choose this same opening for another short, attentive lunch session.

## Clarity findings

- **DL-4 — FAIL:** “stoke fire” and “gather wood” became grey with a moving fill, but no words explained the limit, its duration, or its fictional reason. I inferred a cooldown. Gather was still grey 46 s after its click and available when I checked at 70.2 s after the click. Those observations bound the sampled wait; they do not establish its exact duration. Evidence: `02-fire.png`, `10-gather-wait.png`, `13-gather-still-grey.png`, `14-gather-ready.png`.
- **Unclassified player uncertainty:** “she says she can help. says she builds things.” made me expect something to build. At 237.1 s there was still only stoke fire in the room, and at 247.7 s only gather wood in the forest. I could not tell what would unlock building. This does **not** establish that building has no rule or that a displayed task lacked its response. Evidence: `19-builder-arrives.png`, `20-looking-for-build.png`, `21-last-forest.png`.
- **Unclassified player uncertainty:** Penrose’s “give in” did not tell me whether I would leave this game or change its state. I chose “ignore it”. I did not test give in and cannot establish its consequence or whether the character could foresee it. Evidence: `16-after-second-load.png`.

Other directly sampled checks: **DL-8 PASS** for the boxed action and newest log lines; **DL-10 PASS** across the fire/wood labels reached; **DL-11 PASS** for the short immediate decisions; **DL-13 PASS** for prompt title, resource and cooldown feedback; **DL-17 PASS** for the stranger’s shivering, breathing and words. These statuses cover only the opening interactions reached. Other general checklist items, builder checks and unmet interactions are **NOT TESTED**; no exception status was inferred from a design document.

## English, dates, layout, and hands on

| Item | Status | Evidence / limit |
|---|---|---|
| DL-20 English | PASS | Light fire, stoke fire, gather wood, wood stores and the story were understandable in English. Penrose was an unexplained title, but responding did not require translating a local term. I understood ignore it. |
| DL-21 Dates | NOT TESTED | No calendar or deadline encountered. No cross-month or return-from-break comparison. |
| DL-22 Phone response visibility | NOT TESTED | Only the assigned 1280×800 desktop fixture used. No phone claim. |
| DL-30 Nothing cut off | PASS, sampled desktop only | The action labels, stranger’s sentences and Penrose dialog fitted without visible clipping or overlapping text. The opening audio modal covered part of the background controls while it owned the response. No phone layout tested. Evidence: `00-opening.png`, `12-stranger.png`, `16-after-second-load.png`, `20-looking-for-build.png`. |
| DL-31 Read state while acting | NOT TESTED | The Penrose dialog left the wood count visible (24), but I met no order/answer sheet with a goal progress, deadline and person to compare. The requested complete situation was not reached. |
| DL-32 Something for your hands | NOT TESTED for a global no-act interval | I wanted to gather or help the stranger during the first wood cooldown. Gather remained unavailable in samples through 140.0 s, 46 s after the click, and was available at 164.2 s. I experienced roughly a minute of waiting for my desired action. Stoke fire remained available in the other room, already described as hot with a roaring fire; I chose not to repeat it. I cannot claim the whole game offered no hands-on act during that interval. No exact longest global gap established. |
| DL-33 Acts in the scene | PASS for direct action; object interaction NOT TESTED | Clicking light fire, stoke fire or gather wood executed the named action without opening a planning form or confirmation. There were text controls rather than drawn objects. I did not reach a speaking action or a build action. |

## Changes I would want, ranked

1. Give me something useful to do during the first wood cooldown, or shorten that wait. I want to make progress while I am attending.
2. When she says she builds things, let me see the first thing we could build and what it needs. I want a target for the growing wood pile.
3. Explain the grey action state briefly, including when I can use it again. The fill gave me a guess, not a clear reason.

Artifacts: screenshots are in `c1c-adr-old-shots/`; the contemporaneous diary is `c1c-adr-old-shots/wall-clock.jsonl`. No export was downloaded or replay tested.
