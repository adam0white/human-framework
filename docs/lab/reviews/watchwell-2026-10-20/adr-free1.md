# A Dark Room — Sam, source-unread playtest

## Assignment and access

Sam, 40, warehouse supervisor. I play Cookie Clicker, Kittens Game and Melvor Idle. I like watching something I built grow and unlocking the next thing. This was an evening at home on my laptop. The assignment did not specify a temperament word; I played with patient curiosity about upgrades.

- URL: https://adarkroom.doublespeakgames.com/
- Build: NOT TESTED — no build identifier noticed on the live page.
- Device: desktop, 1280×800 CSS px, mouse and keyboard, light mode, default text size. Screenshots establish the desktop layout.
- Access: supplied standard `npm run lab:play` driver; persistent live browser page; JSON operations through localhost port 43521. No game source, tests, other repository documents or prior reports/logs were consulted. Only the two assigned playtest documents were used for the playtest. The generated log from this session was read afterward to transcribe this report.
- Timing: floor 0 real minutes, ceiling 25. First actionable open completed at 0.677 s. Stop logged at 515.558 s: about **8 min 35 s of actionable exposure**, or **8 min 36 s on the driver elapsed clock**. UTC log interval: 2026-10-20 19:51:52.437–20:00:27.318. No in-game date, day or clock was shown; all times below are wall-clock elapsed seconds.
- Waits used the driver's real-time wait operation. No speed setting was changed. The page changed over real waits; there was no observed frozen-time limitation.
- No run was sent, no telemetry submission was triggered, and no consent settings were changed. The opening audio prompt was dismissed with **disable audio**. No playtest export was downloaded.
- Driver reported PID 59749. It was stopped afterward with `kill 59749`, which returned exit code 0. No process-name kill or repair was attempted.

Exact launch command supplied and used:

```sh
cd (driver scratch)/deploy
PLAYWRIGHT_MODULE=~/code/.lab-scratch/patterns/retest/well-cwd/node_modules/playwright npm run lab:play -- url=https://adarkroom.doublespeakgames.com/ out=(driver scratch)/adr-free1-shots port=43521 device=desktop floor=0 ceiling=25
```

## First minute

**Checkpoint timing limitation:** the driver took `first-minute.png` automatically at 60.023 s. My written checkpoint was logged at **62.842 s**, about 2.8 s late. The 19-second wait completed at 59.436 s, but I retrieved its completed response after writing the checkpoint. That response already contained the stranger and forest unlock. My original note did not account for those new controls. I preserve that gap; I do not use later learning to improve its answers. The row evidence below is restricted to inputs/results through 60 s. The automatic screenshot was viewed only after play.

Original checkpoint, verbatim:

> I am keeping a fire going because the room is freezing. Light fire, then stoke fire, were obvious boxed buttons; the title is underlined but I have not tried it. The fire and newest lines draw me first; nothing else seems urgent and the room tab is selected. Stoke briefly went gray and refused my click; I guessed I had to wait, but it did not say why or how long. Burning became roaring after I stoked it, and cold replaced freezing. I can stoke or wait for warmth. Light fire was available immediately; I pressed it at about 14 seconds. Lighting and stoking taught me what the fire does. No help used. I am curious what comes next, though so far it is one button and waiting.

| Item | Status | Original answer and evidence by 60 s |
|---|---|---|
| DL-1 A reason to act | PASS | “I am keeping a fire going because the room is freezing.” The initial page said “the fire is dead.” and “the room is freezing.” |
| DL-2 What can I touch | PASS for opening controls; new controls NOT TESTED at checkpoint | “Light fire, then stoke fire, were obvious boxed buttons; the title is underlined but I have not tried it.” Light fire worked at 13.855 s. No inert decoration was tried before 60 s. I had not recognized/used the newly arrived forest tab or gather control when I wrote the note. Their availability in the text reply is not evidence that I saw them. |
| DL-3 Urgency and selection | PASS for opening; new forest priority NOT TESTED | “The fire and newest lines draw me first; nothing else seems urgent and the room tab is selected.” Opening screenshots put the cold/fire text at left and the boxed fire action near the title. The checkpoint did not acknowledge the newly arrived “the wood is running out.” cue. |
| DL-4 Why the limit | FAIL | “Stoke briefly went gray and refused my click; I guessed I had to wait, but it did not say why or how long.” At 16.874 s the driver reported a disabled game control. At 32.987 s it was dark again; it worked at 37.784 s. I learned recovery by waiting, not from a stated circumstance. No claim about the internal rule. |
| DL-5 Readable situation | PASS for situation I had recognized | “Burning became roaring after I stoked it, and cold replaced freezing. I can stoke or wait for warmth.” The consequence at 37.784 s said “the fire is roaring.” I did not yet explain the forest unlock, even though it was present by 59.436 s. |
| DL-6 A choice soon | PASS, single situational action | “Light fire was available immediately; I pressed it at about 14 seconds.” Availability established at open completion 0.677 s; first gameplay input at 13.855 s, about 13.2 s later. Audio preference input was at 10.990 s. Lighting versus continuing to wait in the cold had an immediate consequence. This was not a choice between two development paths. Only nine initial situation words preceded it; the audio prompt added a short optional preference question. |
| DL-7 Learn by doing | PASS for interactions reached; 2 new interactions NOT TESTED | “Lighting and stoking taught me what the fire does. No help used.” Lighting changed the title and produced burning; the later stoke produced roaring. The audio preference was also reached. Forest navigation and gathering were **2 newly available interactions not reached by 60 s**. They are not checkpoint passes or failures. |

## Verbatim diary

Reaction text is copied unchanged from this session's wall-clock log. Inputs and elapsed times are from that log. The last column transcribes important visible answers from live driver replies and screenshots; it is not part of the original reaction. Wait timestamps record completion, so the reaction attached to a wait can describe the intention at its start. Blank reactions are shown as “—”. No in-game clock was shown on any row.

| Elapsed s | Kind / input | Original reaction | Important visible answer or screenshot |
|---:|---|---|---|
| 0.677 | input / open {} | — | Opening: “the fire is dead.” / “the room is freezing.”; light fire. |
| 4.242 | input / shot {"file": "01-opening.png"} | The room is freezing and light fire looks like the thing to press. I want to get something started. | Sound Available! dialog: enable audio / disable audio (01-opening.png). |
| 10.990 | input / tap {"text": "disable audio"} | I will keep it quiet tonight; the sound question is in front of the fire button. | Immediate reply still included the sound dialog; it was gone in the next reply. |
| 13.855 | input / tap {"text": "light fire"} | The cold is the immediate problem. This should warm the room. | A Firelit Room; stoke fire; “the fire is burning.” / “the light from the fire spills from the windows, out into the dark.” |
| 16.874 | tool / tap {"text": "stoke fire"} | Stoke fire is the only job here so far. I want to see what warming the place unlocks. | Driver reported: “stoke fire is shown but disabled right now (game state, not a driver failure)”. This is a game refusal, despite the driver logging kind=tool. |
| 30.230 | input / wait {"s": 10} | The fire is burning, so I can wait a little. The button did not say how long until I can use it again. | Wait elapsed in real time. The initial tool call returned no text; later screenshot showed “the room is cold.” |
| 32.987 | input / shot {"file": "02-first-wait.png"} | — | 02-first-wait.png: boxed stoke fire; new cold line above earlier freezing line. |
| 37.784 | input / tap {"text": "stoke fire"} | The button is dark again. I take that to mean it is ready. | “the fire is roaring.” |
| 59.436 | input / wait {"s": 19} | The fire went from burning to roaring. I am waiting to see if that gets the room livable. | Completed wait reply contained A Silent Forest, wood 4, gather wood and “a ragged stranger stumbles through the door and collapses in the corner.” I did not retrieve/read this completed reply until after my checkpoint note. |
| 60.023 | first_minute / shot {"file": "first-minute.png"} | — | Automatic first-minute.png: room tab and forest tab, stoke fire, wood 4, “the wood is running out.” Viewed after play. |
| 62.842 | first_minute / log | I am keeping a fire going because the room is freezing. Light fire, then stoke fire, were obvious boxed buttons; the title is underlined but I have not tried it. The fire and newest lines draw me first; nothing else seems urgent and the room tab is selected. Stoke briefly went gray and refused my click; I guessed I had to wait, but it did not say why or how long. Burning became roaring after I stoked it, and cold replaced freezing. I can stoke or wait for warmth. Light fire was available immediately; I pressed it at about 14 seconds. Lighting and stoking taught me what the fire does. No help used. I am curious what comes next, though so far it is one button and waiting. | Checkpoint reaction is reproduced verbatim below; this response also showed the forest unlock. |
| 67.895 | input / shot {"file": "03-forest-unlock.png"} | A stranger and a forest appeared while I waited. Now I have wood to maintain and somewhere to go. That is more like it. | 03-forest-unlock.png: “the room is mild.”; forest tab; wood 4. |
| 71.474 | input / tap {"text": "A Silent Forest"} | Wood is running out. I want to gather some before the fire dies. | “the sky is grey and the wind blows relentlessly.” |
| 73.999 | input / tap {"text": "gather wood"} | Gather wood is a direct job. I expect the store to go up. | Wood 4 → 14; “dry brush and dead branches litter the forest floor.” |
| 77.375 | input / shot {"file": "04-gathered-wood.png"} | Ten wood from a click is clear. I can start building up a reserve now. | 04-gathered-wood.png: forest selected; gather wood grey; wood 14. |
| 82.215 | input / tap {"text": "A Firelit Room"} | I want to see whether the stranger is all right now that I have fuel. | Room response: “the room is mild.” / “the fire is roaring.” |
| 84.931 | input / tap {"text": "stoke fire"} | No way to talk to the stranger is obvious. Keeping the fire up seems useful. | Wood 14 → 13; “the fire is roaring.” |
| 112.663 | input / wait {"s": 25} | I will give the room time to warm. The stranger gives me a reason to keep tending it. | “the room is warm.” / “the stranger shivers, and mumbles quietly. her words are unintelligible.” |
| 116.262 | input / tap {"text": "A Silent Forest"} | The room is warm now. I can collect a bit more while she recovers. | Wood 13; gather wood. |
| 119.169 | input / tap {"text": "gather wood"} | I like seeing the reserve climb. I am hoping this turns into more than fire tending. | No change to wood 13; no refusal text in this reply. |
| 143.087 | input / wait {"s": 20} | That gather click did not increase the wood. The grey fill seems to be a cooldown, so I will let it finish. | Wood still 13. |
| 145.395 | input / tap {"text": "gather wood"} | Trying gather again after waiting. | Wood 13 → 23; dry brush line. |
| 148.077 | input / tap {"text": "A Firelit Room"} | There is enough wood for now. I want another look at the stranger. | “the stranger is standing by the fire. she says she can help. says she builds things.” / “the stranger in the corner stops shivering. her breathing calms.” / “the room is hot.” |
| 175.771 | input / wait {"s": 25} | She builds things. That is exactly what I was waiting for; I want to see the first building. | Wood had risen to 29 without another successful gather input. |
| 178.306 | pulse 4/5 / log | The stranger recovered and says she builds things; the wood is rising without my last click, and I want to find out what she opens up. | Wood 29; no new building action yet in this reply. |
| 181.246 | input / shot {"file": "05-builder-recovered.png"} | — | 05-builder-recovered.png: Noises dialog, “scratching noises can be heard from the store room.”; investigate / ignore them. Wood 31 remains visible at right. |
| 184.461 | input / tap {"text": "investigate"} | Something is in my stores. I would check it rather than leave it eating supplies. I do not know whether it is dangerous. | Noises result: “some wood is missing.” / “the ground is littered with small scales”; scales 1, wood 28. Trap and cart appeared in the background. |
| 186.956 | input / tap {"text": "leave"} | Some wood is missing, but I found a scale. Now there are trap and cart buttons behind this; I want the cart first. | Immediate reply retained result dialog text; it disappeared by the cart reply. |
| 190.876 | input / tap {"text": "cart"} | A cart should mean more wood per trip. I do not see its price in the plain text yet. | Wood became 0; “the rickety cart will carry more wood from the forest.” |
| 195.519 | input / shot {"file": "06-cart-built.png"} | The cart used my whole wood reserve. The message confirms it carries more wood, which is the upgrade I wanted. | 06-cart-built.png: cart grey; trap still boxed; wood 0. |
| 199.908 | input / tap {"text": "A Silent Forest"} | Time to try the cart on the next collection. | Forest cart 1, pop 0/0; wood 2. |
| 203.257 | input / tap {"text": "gather wood"} | Trying the upgraded gather. | Wood still 2; no gather consequence. |
| 221.066 | input / wait {"s": 15} | Still cooling down. I want that first bigger load before I build a trap. | Wood 6. |
| 223.522 | input / tap {"text": "gather wood"} | The gather button should be ready by now. | Wood 6 → 56; hut label appeared. |
| 228.208 | input / tap {"text": "A Firelit Room"} | Fifty wood instead of ten is a proper upgrade. A hut has appeared too; I want people living here. | “builder says there are more wanderers. says they'll work, too.” |
| 231.881 | input / tap {"text": "hut"} | I want a hut so the wanderers can move in and work. | “not enough wood.”; hut cost wood 100; wood store 58. |
| 259.568 | input / wait {"s": 25} | The hut says wood 100 and not enough wood. That is a clear target; one more cartload should do it. | Wood 64; hut wood 100 still shown. |
| 291.303 | input / wait {"s": 25} | I am saving for the hut instead of spending on traps. Waiting feels worthwhile with that target. | Wood 70. |
| 296.832 | input / tap {"text": "A Silent Forest"} | Back for the wood that should pay for the hut. | Forest, wood 70. |
| 300.156 | input / tap {"text": "gather wood"} | This load should put me over a hundred. | Wood 122 after collection (includes a resource tick); dry brush line. |
| 303.213 | input / tap {"text": "A Firelit Room"} | I have the wood. I want to spend it on a place for people. | Wood 122; hut available in reply. |
| 305.953 | input / tap {"text": "hut"} | Build the first hut. | Wood 122 → 22; “builder puts up a hut, out in the forest. says word will get around.”; next hut price wood 150. |
| 308.853 | input / tap {"text": "trap"} | With the hut done, I want the first trap so there is something else coming in. | Wood 22 → 12; “more traps to catch more creatures.”; next trap price wood 20. Tab renamed A Lonely Hut. |
| 311.952 | input / tap {"text": "A Lonely Hut"} | The forest is called A Lonely Hut now. I want to see the trap and the housing count. | Cart 1, hut 1, trap 1, pop 0/4; check traps. |
| 314.822 | input / tap {"text": "check traps"} | I want to see what the new trap brings back. | Meat 1, bait 0; “the traps contain bits of meat.” |
| 350.719 | input / wait {"s": 30} | A hut, a cart and a trap are mine now. I want to see the first person move in; meanwhile the wood keeps ticking up. | “a weathered family takes up in one of the huts.”; pop 2/4; gatherer 2; wood 26. |
| 359.533 | pulse 5/5 / log | A family moved into the hut and there are two gatherers. The little camp is becoming something I built, and I want another hut. | Pop 2/4; gatherer 2. |
| 364.608 | input / tap {"text": "gather wood"} | I want to help the gatherers reach the next hut faster. | Wood 80; dry brush line. |
| 367.626 | input / shot {"file": "07-first-family.png"} | — | 07-first-family.png: gather wood and check traps both grey; gatherer 2, pop 2/4, wood 80. |
| 398.525 | input / wait {"s": 25} | Both collection buttons are grey. I would like to collect again, but for now I am watching the wood rise toward 150. | “a stranger arrives in the night.”; gatherer 3; pop 3/4; wood 95. |
| 431.567 | input / wait {"s": 25} | Another gatherer arrived. I am close to a second hut, so I want one more collection before stepping away. | Gatherer 4; pop 4/4; wood 119; another stranger line. |
| 439.294 | want_quit BORED / log | I would leave this running and do something else now. The camp is working and I am mostly waiting between collections. I still want to buy the second hut before I step away, and I would come back to see it grow. | Formal wish to step away; BORED. |
| 442.654 | input / tap {"text": "gather wood"} | The hut is full. This collection should pay for more space. | Wood 175 after collection; still one hut and pop 4/4. |
| 445.571 | input / tap {"text": "check traps"} | One last trap check while I am here. | Fur 1; “the traps contain scraps of fur.”; lodge appeared in text reply. |
| 450.349 | input / tap {"text": "A Firelit Room"} | Fur opened a lodge button. I will finish the housing first, then see what that needs. | “villagers could help hunt, given the means.”; “the room is warm.” / “the fire is burning.”; wood 181. Later screenshot did not establish that this input actually changed tabs. |
| 452.975 | input / tap {"text": "hut"} | Make room for the next family. | Wood 181, hut 1, pop 4/4 unchanged. No refusal shown. |
| 457.782 | input / tap {"text": "hut"} | That did not spend wood or add a hut. I am trying the hut label once more. | Wood 181, hut 1, pop 4/4 unchanged again. No refusal shown. |
| 461.465 | input / shot {"file": "08-hut-click-unchanged.png"} | — | 08-hut-click-unchanged.png: forest controls and village count visible; top tabs and stores absent from screenshot, despite being listed in text reply. |
| 473.854 | input / wait {"s": 2} | The text reply keeps listing the room controls, but the screenshot is showing the forest. I cannot tell from that reply alone whether I changed tabs. | Text still listed room, hut and stores, wood 193. No explanation for navigation mismatch. |
| 480.854 | input / key {"key": "Home"} | Trying to get the page back to its top so I can see the room tab. | Home produced no established navigation change. |
| 486.143 | input / shot {"file": "09-navigation-check.png"} | — | 09-navigation-check.png: repeated Noises dialog; same forest background and missing top tabs/stores. |
| 493.379 | input / tap {"text": "investigate"} | The noises came back. I will check the stores again. | “some wood is missing.” / “the ground is littered with small scales”; scales 5; wood 185. The visible investigate control worked. |
| 498.797 | input / tap {"text": "leave"} | More scales, less wood. That resolved the noise; I still want to step away and let the camp gather. | Leave accepted; dialog absent from later screenshot. |
| 503.028 | input / scroll {"dy": -400, "x": 600, "y": 400} | Scrolling up once to look for the room tab. | Scroll did not restore tabs/stores in the next screenshot. |
| 507.522 | input / shot {"file": "10-stop-state.png"} | — | 10-stop-state.png: gather wood ready, check traps grey; village cart 1 / hut 1 / trap 1; pop 4/4; gatherer 4. Tabs and stores still absent. |
| 515.558 | stop BORED / log | I am leaving it here with four gatherers, one hut, one cart and one trap. I would leave it running and return voluntarily. The first wish to step away did not pass; the repeated noise was a small interruption, not enough to keep me watching. I did not build the second hut: the room-tab and hut text clicks did not change the forest view, and the last screenshots no longer show the tabs or stores. I cannot tell whether that last navigation problem is the page or the driver. Other visible controls still worked. | Final text reply: bait 0, fur 1, meat 1, scales 5, wood 191; cart 1, hut 1, trap 1, pop 4/4, gatherer 4. Final screenshot does not establish the resource figures. BORED. |

## Best, worst, wishes to leave and pulses

**Best moment:** at 350.719 s I saw “a weathered family takes up in one of the huts.” The two gatherers made the hut feel useful. At 359.533 s I logged engagement **5/5**: “A family moved into the hut and there are two gatherers. The little camp is becoming something I built, and I want another hut.” The cart's first 50-wood collection at 223.522 s was the earlier payoff that made that possible.

**Worst moment:** the room/hut inputs at 450.349–457.782 s did not change the hut count or spend wood. The screenshot at 461.465 s showed the forest with its tabs and stores absent. I wanted to build the second hut and could not establish that I had reached its button. This is an unresolved page/driver discrepancy, not a demonstrated rule of the game or a proven driver block. The earlier small frustration was a grey fire button without a reason at 16.874 s.

| Time | Event | Reason / engagement | Original words |
|---:|---|---|---|
| 178.306 s | Pulse | 4/5 | The stranger recovered and says she builds things; the wood is rising without my last click, and I want to find out what she opens up. |
| 359.533 s | Pulse | 5/5 | A family moved into the hut and there are two gatherers. The little camp is becoming something I built, and I want another hut. |
| 431.567 s, wait completion | Earliest diary wording about stepping away | Not formally tagged | Another gatherer arrived. I am close to a second hut, so I want one more collection before stepping away. |
| 439.294 s | Only formal want_quit | BORED | I would leave this running and do something else now. The camp is working and I am mostly waiting between collections. I still want to buy the second hut before I step away, and I would come back to see it grow. |
| 515.558 s | Final stop | BORED | Full original stop reaction is in the diary. |

The first stepping-away wording was attached to a 25-second wait that began around 406.415 s; the log stamps it at completion, 431.567 s. That places the earliest expressed wish within that interval, before the formal tag. There was no earlier explicit wish to leave in the diary. I continued briefly for the second hut and a repeated noise event. The wish did not pass. This was an idle-game break with intent to return, not rejection of the game. The navigation problem came after the formal BORED wish and limits interpretation of the final minute.

**Hard, but kept going:** NOT TESTED — I did not search for an easier setting, workaround for difficulty or accessibility option. Waiting for an upgrade kept my interest for a while, but that does not meet this specific positive signal. The late Home/scroll inputs were navigation attempts, not an easier-game search.

## Clarity findings and evidence gaps

- **DL-4: “I guessed I had to wait, but it did not say why or how long.”** The early stoke refusal at 16.874 s and later recovery establish the experience. `02-first-wait.png` shows the ready button afterward. A later hut refusal was clearer: at 231.881 s the reply said “not enough wood.” and “wood 100”. That later success does not erase the first-minute failure.
- **DL-13: uncertainty after an input, attribution unresolved.** Gather taps at 119.169 s and 203.257 s did not change wood or produce a refusal line. The grey button gave a cooldown cue; later collections worked. At 452.975 and 457.782 s, hut text taps also left the count unchanged, but `08-hut-click-unchanged.png` showed the forest rather than the intended room. I cannot attribute those hut inputs to a visible build button. They do not prove that the game's build action ignored accepted clicks.
- **Navigation visibility, no firm defect classification:** `07-first-family.png` showed the top tabs and stores. `08-hut-click-unchanged.png`, `09-navigation-check.png` and `10-stop-state.png` did not, although driver text continued listing them. Home and one upward scroll did not restore them. The on-screen investigate control still worked at 493.379 s. This mismatch needs reproduction through ordinary browser interaction; I did not inspect the page implementation or repair the harness. I do not classify it as TOOL because I did not establish that the driver could not operate a visible control at all.
- **DL-14 price visibility: NOT TESTED before the cart commitment.** I said “I do not see its price in the plain text yet.” Then I clicked and the store fell to zero. I did not inspect the cart visually before purchase or use a hover action. This is a gap in my cost observation, not evidence that the game has no price display. Hut cost became legible in the refused-input reply.

## English, dates, layout and hands on

| Item | Status | What I met |
|---|---|---|
| DL-20 English | PASS for reached play | Light fire, stoke fire, gather wood, check traps, hut, cart, trap, investigate and leave were understandable in English. “she builds things”, the cart explanation and the hut explanation supplied useful context. No necessary unfamiliar local term was met. |
| DL-21 Dates | NOT TESTED | No today/date/deadline comparison occurred. “a stranger arrives in the night” was a story line, not a dated deadline. |
| DL-22 Phone response visibility | NOT TESTED | Desktop assignment only; no 360×690 phone fixture was used. |
| DL-30 Nothing cut off | PASS for inspected desktop action text; phone NOT TESTED | The sound and Noises dialogs had complete prompts and actions (`01-opening.png`, `05-builder-recovered.png`, `09-navigation-check.png`). No overlapping sheets or mid-sentence clipping of an essential response was observed. The oldest log lines faded near the bottom; I did not need to scroll a small panel to answer. The later missing navigation/stores are reported separately without assigning a cause. No phone result or builder check is claimed. |
| DL-31 Read state while answering | NOT TESTED for the full progress/deadline/person check; partial desktop observation | In `05-builder-recovered.png`, “scratching noises can be heard from the store room.”, investigate and ignore them were readable, and the wood store of 31 remained visible at right. No named person, progress goal or deadline governed that event. `09-navigation-check.png` lacked the stores along with the tabs, so visibility was not consistent across the whole session; cause unresolved. |
| DL-32 Something for your hands | NOT TESTED for a system-wide 20-second availability verdict; collection waits observed | The clearest late waiting stretch was between `07-first-family.png` at 367.626 s, where both collection controls were grey, and the completed wait at 431.567 s: about 64 s spent waiting for collection/wood toward another hut. I explicitly wanted to collect, and said so at 398.525 s. I did not continuously sample the instant gather became ready, so this is **not 64 proven seconds with no action available**. Fire tending or a different purchase might have been possible in another tab. Earlier, a failed gather at 119.169 s worked at 145.395 s. I wanted more resources, not a form to fill out. |
| DL-33 Direct acts | PASS for reached core verbs | Light fire, stoke fire, gather wood and check traps each used one labelled control and gave a consequence. Cart, hut and trap purchases also used one control. No multi-field planning/confirmation form was required. The game represents things in text; I did not click a pictured fire or trap. Investigate opened a result with leave, not a planning form. |

Other unmet checks: fast-speed live-choice timing and slowdown (DL-15), reload/resume (DL-27), sending (DL-28), replay/import (DL-29), phone target sizes/reflow and builder-only checks were **NOT TESTED**. Sending was outside authorization. No downloaded export exists; no replay claim is made.

## Stop and return

I stopped at **515.558 s**, reason **BORED**, with four gatherers, one hut, one cart and one trap. The text reply listed 191 wood, 5 scales, 1 fur, 1 meat and 0 bait; the last screenshot did not show stores, so these are text-reply figures only. I had seen a lodge unlock but had not bought it. The intended second hut was not built.

I would leave the game running and come back voluntarily. I liked the larger wood collection and seeing people occupy the hut. The collection waits had become a reason to attend to something else. The first wish to step away persisted through another collection, fur/lodge discovery and the second noise event. The game had not ended. I did not reach the ceiling. The page was still changing and the visible event control worked, so I did not establish a broken game or driver block.

## Changes I would want as this player

1. Keep the room/forest tabs and stores reachable while I collect and build. I need to reproduce the late disappearance before calling it a game defect.
2. Give a grey action a short reason and readable remaining wait. I worked out that I was cooling down, but the first refused click did not tell me.
3. Let me see resource production per interval beside the store or gatherer count. I could see wood rising, but could not tell how soon the next hut would be affordable without watching ticks.

## Artifacts

- Report: `(driver scratch)/adr-free1.md`
- Verbatim machine diary: `adr-free1-shots/wall-clock.jsonl`
- Automatic checkpoint screenshot: `adr-free1-shots/first-minute.png`
- Other screenshots: `01-opening.png`, `02-first-wait.png`, `03-forest-unlock.png`, `04-gathered-wood.png`, `05-builder-recovered.png`, `06-cart-built.png`, `07-first-family.png`, `08-hut-click-unchanged.png`, `09-navigation-check.png`, `10-stop-state.png`, all under `adr-free1-shots/`.
- Export: none downloaded.
