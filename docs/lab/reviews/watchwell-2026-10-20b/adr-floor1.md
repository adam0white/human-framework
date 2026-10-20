# A Dark Room — Sam, continued exposure

## Session

- Persona: Sam, 40, warehouse supervisor. Plays Cookie Clicker, Kittens Game and Melvor Idle. Likes watching something he built grow and unlocking the next thing. An evening at home on his laptop.
- URL: https://adarkroom.doublespeakgames.com/
- Build: no build identifier noticed on the live page.
- Device: desktop, 1280×800 CSS px, mouse and keyboard, light mode, default text size.
- Access: supplied `npm run lab:play` driver, port 43612, one persistent page. Started with the assigned command and PLAYWRIGHT_MODULE. Driver PID 48406; terminated with `kill 48406` after the stop log.
- Committed time: floor 15 real minutes; ceiling 25 real minutes. First usable screen returned at driver elapsed 0.700 s. Final stop at 909.201 s: about 15:09 elapsed, or 15:08.5 from the first usable screen. No early stop or driver block.
- No game clock or date was shown. All times below are real elapsed time. The game visibly progressed during real waits; no clock acceleration or speed changes were used.
- No game source, tests, prior reports, bundles, network payloads, hidden state or debug APIs were inspected. No run was sent, telemetry submitted, consent changed, or export downloaded. Audio was disabled through the opening sound prompt.
- Screenshots: `adr-floor1-shots/01-opening.png` through `08-stopping-state.png`, individually named below. Original driver diary: `adr-floor1-shots/wall-clock.jsonl`. The report was written from the live replies and contemporaneous reactions; the log was not reread.

## First minute

Checkpoint logged at 61.445 s driver elapsed, about 60.745 s after the first usable screen. This was approximately 0.7 s late. The original checkpoint answer is preserved below. The forest and stranger shown in the 61.418 s reply are not used to improve any first-minute verdict. Within the preceding observed replies, the gameplay was lighting and stoking the fire.

> I lit the fire because the room was freezing. Light fire and then stoke fire look like buttons; the underlined room title looks selected, and the small footer looks like settings. I tried stoke too soon and it was unavailable; waiting let me stoke it, but I did not see a written reason or duration. I can keep the fire up and watch the room warm. Lighting was offered immediately and I used it at about nine seconds; there was only one gameplay action, not yet a choice between ways to build. The fire changed from burning to roaring after my actions. I am curious what this opens up.

| Item | Status | Original answer and evidence available at the checkpoint |
|---|---|---|
| DL-1 A reason to act | PASS | “I lit the fire because the room was freezing.” Opening text: “the fire is dead.” / “the room is freezing.” `01-opening.png`. |
| DL-2 What can I touch | PASS | “Light fire and then stoke fire look like buttons; the underlined room title looks selected, and the small footer looks like settings.” Light fire worked at 9.319 s. No inert thing was tried or missed control discovered in this window. Screenshots 01 and 02. |
| DL-3 Urgency and selection | PASS | The fire drew me first because the room was freezing. The room title looked selected through its underline. The small footer was a competing but secondary settings cue. No numerical deadline was shown. |
| DL-4 Why the limit | FAIL | “I tried stoke too soon and it was unavailable; waiting let me stoke it, but I did not see a written reason or duration.” At 11.897 s the driver reported the visible control disabled. At 38.370 s stoking succeeded. I inferred recovery with time; I did not know the fictional reason. |
| DL-5 Readable situation | PASS | “I can keep the fire up and watch the room warm.” The log said “the room is cold.” at 35.078 s and “the fire is roaring.” after stoking at 38.370 s. `02-first-minute.png` was actually taken at 35.223 s. |
| DL-6 A choice soon | PASS, single action | Lighting the fire was available on the first usable screen at 0.700 s, under 30 s. It was a meaningful immediate action in the freezing room, though there was no branching building choice yet. First input: disable audio at 6.815 s. First gameplay input: light fire at 9.319 s. Only the short cold-room text preceded it; an optional sound prompt intervened. |
| DL-7 Learn by doing | PASS for reached interactions | “The fire changed from burning to roaring after my actions.” Two gameplay action labels were reached: light fire and stoke fire. The repeat stoke refusal also taught that immediate repetition was unavailable. No help was used. Gathering, building and event choices were not established in this checkpoint: three later interaction categories NOT TESTED here. |

Visual scope: screenshots establish the desktop views sampled, not continuous visual observation. The early diary phrase “that filling bar” was an inference entered before a cooldown screenshot was captured; it is not independent visual evidence of a first-minute animation. A later screenshot, `03-forest.png`, does show the grey gather control and a partially shaded area.

## Verbatim diary

The reaction column preserves the original wording, including guesses and wishes before later information arrived. Times are driver reply elapsed seconds, rounded to one decimal. For a wait, the reaction was entered when requesting the wait; the listed time is the reply after the real wait completed. Inputs are abbreviated descriptions of the actual documented operations. Answers are selected visible evidence, not additional reactions. No in-game clock was available for any entry.

| Elapsed s | Input | Original reaction | Important visible answer |
|---:|---|---|---|
| 0.7 | open | I want to see what I can build here. Cold room, fire first. | “light fire”; “the fire is dead.”; “the room is freezing.” |
| 3.7 | shot 01-opening.png | The outlined light fire control is where I look first. The cold gives me a reason to press it. | Sound Available prompt with enable/disable audio. |
| 6.8 | disable audio | I will keep it quiet this evening. | Prompt subsequently closed. |
| 9.3 | light fire | Light fire is the obvious start. I expect the room to warm up. | Title became “A Firelit Room”; “the fire is burning.” |
| 11.9 | stoke fire | It has changed to stoke fire. I will build it up before looking elsewhere. | Shown but disabled; game state, not driver failure. |
| 35.1 | wait 20 s | Stoke is unavailable right after lighting it. I assume that filling bar is a cooldown; I will let it finish. | “the room is cold.” |
| 35.2 | shot 02-first-minute.png | I have only the fire to work with so far. | Active stoke control; current and older log lines visible. |
| 38.4 | stoke fire | The room has gone from freezing to cold. That is progress; I want it warm. | “the fire is roaring.” |
| 61.4 | wait 20 s | Now the fire is roaring. I am watching for what warming the room unlocks. | Forest label, wood 4, gather wood; stranger arrival and room mild in log. |
| 61.4 | first_minute log | I lit the fire because the room was freezing. Light fire and then stoke fire look like buttons; the underlined room title looks selected, and the small footer looks like settings. I tried stoke too soon and it was unavailable; waiting let me stoke it, but I did not see a written reason or duration. I can keep the fire up and watch the room warm. Lighting was offered immediately and I used it at about nine seconds; there was only one gameplay action, not yet a choice between ways to build. The fire changed from burning to roaring after my actions. I am curious what this opens up. | Checkpoint; no table written during play. |
| 71.1 | A Silent Forest | Wood is running out, and now there is a forest tab. That is what I need next. | “the sky is grey and the wind blows relentlessly.” |
| 74.5 | gather wood | I expect this to add wood to my stores so I can keep the fire going. | Wood 4→14; “dry brush and dead branches litter the forest floor.” |
| 77.8 | shot 03-forest.png | Ten wood per trip. That makes sense to me; I want to find what I can spend it on. | Grey gather control, store visible. |
| 111.6 | wait 30 s | Gather wood is grey with a filling area now. I will give it time; I know this rhythm from idle games. | Wood remained 14. |
| 114.7 | gather wood | I will bank another load, then check on the stranger. | Gather shown but disabled. |
| 118.2 | A Firelit Room | Gathering is still unavailable. I will look back indoors instead of pressing it again. | Stranger shivers and mumbles; room warm. |
| 121.6 | stoke fire | She is shivering, so keeping the room warm seems useful. | Wood 13; room hot; fire roaring. |
| 154.2 | wait 30 s | The room is hot now. I am curious whether she recovers; there is no talk or help action yet. | “the stranger in the corner stops shivering. her breathing calms.” |
| 157.1 | A Silent Forest | Good, she stopped shivering. I can stockpile while she rests. | Forest view. |
| 160.0 | gather wood | Another load. I like seeing the total rise, but I am ready for something to build. | Wood 13→23. |
| 182.8 | wait 20 s | I am giving her a little more time. The log is doing the storytelling without much reading. | No new action in this reply. |
| 182.8 | pulse 3/5 | I want to find out who the stranger is and what I can build, but gathering and tending the fire are thin so far. | — |
| 187.6 | A Firelit Room | I want to see if the stranger has anything to say now. | “she says she can help. says she builds things.” |
| 191.3 | stoke fire | She builds things. That is exactly what I was waiting for; I will keep the place warm. | Trap and cart appeared; descriptions in log. |
| 194.5 | shot 04-builder.png | I want the cart first if it means bigger wood loads. Traps sound like a second resource. | Build controls, wood 24. |
| 197.7 | cart | I cannot see a price yet. I will try the cart and see what it asks for. | “not enough wood.” Tooltip text wood 30. |
| 200.1 | A Silent Forest | Thirty wood for the cart. One more trip should do it. | Wood 26. |
| 227.9 | wait 25 s | The wood total is creeping up between my trips too. Maybe the builder is helping; I have not seen that explained. | Wood 30. |
| 232.6 | gather wood | I will keep some spare wood after buying the cart. | Wood 42. |
| 236.4 | A Firelit Room | Back to buy the first upgrade. | Build view. |
| 239.2 | cart | I am buying the cart to make each wood trip worth more. | Wood 14; “the rickety cart will carry more wood from the forest.” |
| 242.1 | trap | I will start catching things as well. The cart description confirms it will carry more. | No visible clickable trap: Penrose modal had appeared over it. |
| 246.8 | shot 05-penrose-event.png | An unexpected event interrupted me. I want to keep building, so I am inclined to ignore it. | Penrose: “give in” / “ignore it”; background dimmed. |
| 250.7 | ignore it | I do not know what giving in would do. I am sticking with my room and cart. | Modal dismissed before next build input. |
| 254.1 | trap | Now I will build the trap I was trying to buy. | Wood 16→6; “more traps to catch more creatures.” Next trap price 20. |
| 257.1 | A Silent Forest | I want to see the cart work and check the trap. | One trap; “check traps” appeared. |
| 259.9 | check traps | I want to see what the first trap brings in. | Fur 1; “the traps contain scraps of fur.” |
| 293.1 | wait 30 s | Fur is a new resource. Now I have two things to collect, and I want the next recipe. | Wood 14. |
| 297.0 | gather wood | Time to test the cart. I expect more than ten this time. | Wood 14→64; hut appeared. |
| 300.3 | A Firelit Room | Fifty wood instead of ten. That upgrade feels good. There is a hut now; I want that next. | Builder says more wanderers will work. |
| 302.9 | hut | If a hut brings workers, that is the start of a proper little settlement. | “not enough wood.” Price wood 100. |
| 306.1 | stoke fire | One hundred wood for the hut. I will tend the room while the cart trip recovers. | Wood 65; fire roaring. |
| 339.2 | wait 30 s | The next target is clear. I am saving for the hut rather than buying more traps yet. | Wood 73. |
| 341.8 | A Silent Forest | I am back for the load that should pay for the hut. | Collection view. |
| 367.4 | wait 20 s | The gather control is still grey. I would like to make that last trip, but I can wait another little stretch. | Wood 77. |
| 367.5 | pulse 4/5 | The cart made a clear difference and I am one trip from housing workers. That is the growth I enjoy. | — |
| 370.0 | gather wood | This should give me enough for the hut. | Wood 129. |
| 372.8 | check traps | I may as well collect the trap while I am out here. | Meat 1; lodge appeared. |
| 375.7 | A Firelit Room | Meat unlocked a lodge as well. First I want my hut. | “villagers could help hunt, given the means.” |
| 378.3 | hut | I am making room for the first villagers. | Wood 31; builder puts up hut, says word will get around. |
| 380.8 | lodge | I want to know what the hunters will need next. | Refused; price wood 200, fur 10, meat 5. |
| 413.6 | wait 30 s | The lodge needs fur and meat too. More traps will help, but I want to see someone move into the hut first. | “A Lonely Hut”; hut 1; population 0/4. |
| 417.9 | trap | One trap is slow. I will put some wood into more catches before saving for the lodge. | Wood 37→17; next trap price 30. |
| 420.8 | A Lonely Hut | I will check the outside view for arrivals. | Two traps; population 0/4. |
| 443.8 | wait 20 s | The hut is empty so far. I assume word takes time to spread; there is no arrival timer. | Population still 0/4. |
| 446.4 | gather wood | Another fifty wood. I can afford to expand the traps now. | Wood 73. |
| 449.6 | check traps | I need ten fur and five meat for the lodge. Let us see what two traps do. | Check traps shown but disabled. |
| 453.0 | A Firelit Room | The traps are not ready. I can build another while I wait. | Build view. |
| 455.9 | trap | A third trap should make the next collection more useful. | Wood 75→45; next trap price 40. |
| 488.5 | wait 30 s | I have invested most of the wood. Now I want a catch or a settler to arrive. | Three traps; population 0/4. |
| 491.2 | A Lonely Hut | Time to see whether the three traps have paid off. | Collection view. |
| 493.7 | check traps | I am hoping for fur this time. | Cloth 1, fur 3: “tattered cloth and scraps of fur.” |
| 516.5 | wait 20 s | Two fur and some cloth. The extra traps helped; the hut is still waiting for people. | Population 0/4. |
| 519.1 | gather wood | I can keep adding traps until the catches are large enough for that lodge. | Wood 109. |
| 545.7 | wait 20 s | I am getting into a collect-and-wait rhythm. I would like the workers to arrive so there is a new decision. | Family arrived, population 3/4, gatherer 3; traps destroyed; Ruined Trap modal. |
| 545.7 | pulse 3/5 | The catches are growing, but I am repeating collections and waiting for the hut to fill. I want another decision. | Original pulse retained even though the fresh reply had just shown arrivals. |
| 548.7 | shot 06-ruined-trap.png | A family arrived, but something tore up the traps. I want to track it rather than accept losing my work. | “large prints lead away, into the forest.” Track or ignore. |
| 551.7 | track them | I am following the prints. I do not know what is out there, but I want to protect the traps. | “nothing was found.” / “the tracks disappear after just a few minutes.” |
| 554.9 | go home | Nothing found. Losing the traps stings because I had just bought them, but at least I could investigate. | Event subsequently closed. |
| 558.4 | A Firelit Room | Three gatherers are working now. I will replace the lost traps before saving again. | No traps listed; three gatherers. |
| 561.0 | trap | Starting the trap line again. I still want the lodge. | First replacement; wood 116. |
| 565.7 | trap | I can afford a second replacement without emptying the wood store. | Second replacement; wood 99. |
| 599.7 | wait 30 s | I am letting the new gatherers work for a bit. It is good to see wood coming in without each click. | Wood 116; two traps. |
| 603.6 | A Lonely Hut | I want to collect a big load and get back to the lodge target. | Collection view. |
| 606.3 | gather wood | This wood will help replace the third trap and leave something toward construction. | Wood 169. |
| 609.9 | check traps | I am checking whether the rebuilt traps are working. | Meat 2, scales 1. |
| 612.8 | A Firelit Room | The lodge is still well short on fur. More traps seem a better investment than more empty huts right now. | Fire burning; room hot. |
| 617.3 | trap | I will rebuild the third trap, then let the catches accumulate. | Third replacement; wood 144. |
| 620.1 | stoke fire | The fire has dropped to burning. I will stoke it before waiting. | Fire roaring. |
| 653.5 | wait 30 s | I am waiting for another collection. I know the target; there just is not much else I want to do meanwhile. | Wood 160; fur 3, meat 2. |
| 656.7 | want_quit BORED | I would leave this running and come back later now. I still want the lodge, but I am mostly waiting for enough fur and meat rather than making a new decision. I am not done with the game. | First formally logged wish to leave. |
| 659.7 | A Lonely Hut | I am staying for the committed time. I will keep collecting and see whether the next unlock changes my mind. | Collection view. |
| 682.7 | wait 20 s | Both collection controls are still recovering. I am waiting for a wood trip. | Wood 175. |
| 685.7 | gather wood | I will bank the wood needed for the lodge, then spend the surplus on traps. | Wood 225; population 4/4, gatherer 4; trading post appeared. |
| 708.5 | wait 20 s | The hut is full now, and a trading post appeared. That may be another way to get materials. | Wood 241. |
| 711.2 | check traps | I am still waiting on fur and meat. Maybe this catch will get me closer. | Fur 5, meat 2, scales 2. |
| 714.2 | A Firelit Room | I want to check the trading post price before deciding where to spend this wood. | “a trading post would make commerce easier.” |
| 719.6 | trading post | I want to see whether trade can help with the lodge materials. | Refused; wood 400, fur 100. |
| 719.7 | pulse 3/5 | A full hut and a new trading post option give me something to check. I am interested in growing this, but the material wait still makes me want to return later. | — |
| 722.6 | trap | One hundred fur for trade is much farther away. I will add a fourth trap and keep aiming at the lodge. | No visible clickable trap: Nomad modal had appeared. |
| 726.2 | shot 07-nomad.png | A trader arrived just as I tried to build. Bait sounds useful for traps; I will look at that. | Buy bait enabled; scales, teeth and compass grey. |
| 730.0 | buy bait | Bait is the one trade I can afford. I am trying it to help the traps. | Fur 5→0; bait 1; “traps are more effective with bait.” Cost fur 5 shown in reply. |
| 734.3 | say goodbye | That cost all five fur. I did not see the price before clicking; I hope the bait earns it back. At least it says traps are more effective with bait. | Visitor subsequently dismissed. |
| 737.6 | trap | Now I will make the fourth trap I meant to build before the visitor. | Wood 219; next trap 50. |
| 770.8 | wait 30 s | I am curious about the baited catch, although the lodge is farther away after that purchase. | One baited trap plus three unbaited; four total. |
| 775.2 | A Lonely Hut | I want to check the baited trap and gather another cartload. | Collection view. |
| 778.2 | gather wood | Wood is doing fine now. The workers and cart together have changed that part of the game. | Wood 293. |
| 811.6 | wait 30 s | The trap check is still recovering. I would rather step away during this part than watch the bar. | Wood 313. |
| 814.4 | check traps | Here is the first check since buying bait. I want to see whether it was worth the fur. | Bait 0, fur 2, meat 3, scales 4. Tannery and smokehouse appeared. |
| 818.0 | A Firelit Room | Two fur, one meat and two scales came in, and the bait is gone. More buildings appeared, but I cannot tell how much of that catch the bait caused. | Builder suggests curing meat and making leather. |
| 822.7 | smokehouse | The warning about meat spoiling makes the smokehouse sound useful now. | Refused; wood 600, meat 50. |
| 825.6 | tannery | The smokehouse needs much more meat than I have. I will check leather production too. | Refused; wood 500, fur 50. |
| 859.0 | wait 30 s | Those are longer targets. I am still on the lodge first, and I would rather check back after more catches. | Wood 341. |
| 862.4 | A Lonely Hut | I am making one more collection before leaving this to run. | Collection view. |
| 865.4 | gather wood | The wood side is working. I am still short of the animal materials for the next building I want. | Wood 393. |
| 899.9 | wait 30 s | I will give the trap check time to recover, then leave it here. I would come back to grow this settlement. | Wood 417; fur 2, meat 3. |
| 903.6 | shot 08-stopping-state.png | Four people, four traps, and the lodge still ahead. This is a place I would leave running and revisit, rather than keep watching tonight. | Population 4/4; one cart, one hut, four traps; stores visible. |
| 909.2 | pulse 3/5 | I like having built a working little settlement, but I am ready to let it run and come back for the next building. | — |
| 909.2 | stop BORED | I am stopping after the committed time at a full hut and four traps. The wish to leave at about eleven minutes did not pass; visitors briefly interested me, but I still want to leave this running and return later for the lodge. I would return voluntarily. | Final stop; driver then terminated by exact PID. |

## Best, worst, and staying

**Best moment:** 297.0–300.3 s, about 5:00. The first cart-assisted trip changed wood from 14 to 64. “Fifty wood instead of ten. That upgrade feels good.” The consequence was large and immediately visible, and the hut appeared as a next target. The highest pulse was 4/5 at 367.5 s while approaching the hut purchase.

**Worst moment:** 730.0–734.3 s, about 12:14. Buying one bait spent all five fur while I was saving ten for the lodge. I had not seen its price before the tap. The loss of the three traps at about 9:06 also stung, but the investigation choice gave me a response and I continued rebuilding.

**Want to leave:** one formal `want_quit`, at 656.725 s (10:57), reason **BORED**. Its original wording is in the diary. Earlier evidence of thinning interest includes “gathering and tending the fire are thin so far” at 182.8 s, “I would like the workers to arrive so there is a new decision” entered with the wait ending at 545.7 s, and “there just is not much else I want to do meanwhile” entered with the wait ending at 653.5 s. These are preserved separately from the formal tag. This is a continued-exposure session; the eventual stop is not an unrestricted voluntary stopping time.

| Pulse reply time | Engagement | Original reason |
|---|---:|---|
| 3:03 | 3/5 | I want to find out who the stranger is and what I can build, but gathering and tending the fire are thin so far. |
| 6:07 | 4/5 | The cart made a clear difference and I am one trip from housing workers. That is the growth I enjoy. |
| 9:06 | 3/5 | The catches are growing, but I am repeating collections and waiting for the hut to fill. I want another decision. |
| 12:00 | 3/5 | A full hut and a new trading post option give me something to check. I am interested in growing this, but the material wait still makes me want to return later. |
| 15:09 | 3/5 | I like having built a working little settlement, but I am ready to let it run and come back for the next building. |

**Hard, but kept going:** NOT TESTED in the specified sense. I did not seek an easier setting, workaround or accessibility option. I did rebuild after the trap loss and stay interested in the lodge, but that is not evidence of the specified search-and-stay signal.

## Clarity findings

- **DL-4: I could tell an action was unavailable, but not why it needed recovery or exactly when it would return.** Stoke refused at 11.897 s, then worked at 38.370 s. Gather was still disabled at 114.729 s after use at 74.541 s. “I assume” and “I know this rhythm from idle games” were my explanations, not an explicit game rule. Grey and shaded controls distinguish unavailable actions (`03-forest.png`); no written recovery reason or duration was established. Purchase refusals were clearer: tapping cart showed “not enough wood.” and wood 30 at 197.692 s.
- **DL-14: I spent five fur before I had seen the bait price.** Screenshot `07-nomad.png` at 726.211 s shows an enabled “buy bait” without a visible price. At 730.025 s, the tap spent fur 5→0 and exposed “fur 5” in the reply. This is a failure of cost clarity on the observed tap path. The supplied operations did not include hover, so I did not establish whether a mouse hover could reveal the cost before purchase. I do not claim the game has no price display.
- **DL-13: PASS for reached actions.** Lighting, stoking, collecting and buying changed the log or counts promptly. Refused purchases said “not enough wood.” Event choices produced a result: tracking prints led to “nothing was found.” No unexplained duplicate purchase was observed.
- The trap taps at 242.061 s and 722.551 s met newly opened event modals. Screenshots 05 and 07 showed the intended background action unavailable behind the modal. I chose the new visible event controls and later bought the trap successfully. These were game interruptions, not a visible usable control that the driver could not operate. There was no driver block to retry or stop for.

## English, dates, layout, and hands on

| ID | Status and observed scope |
|---|---|
| DL-20 | PASS for encountered play. Light fire, stoke fire, gather wood, check traps, building labels, resource names, event text and responses were understandable in English. “Penrose” was an unexplained event title, but understanding that name was not required to choose ignore it. No necessary local-language term was encountered. |
| DL-21 | NOT TESTED. No date, calendar, dated deadline, or return-from-break date comparison was encountered. “in the night” and “after just a few minutes” were narrative text, not a deadline comparison. |
| DL-22 | NOT TESTED. Only the assigned 1280×800 desktop fixture was used; no phone resizing. |
| DL-30 | PASS for sampled desktop action text; phone NOT TESTED. Screenshots 01–08 showed complete current action labels and complete event sentences. No essential sentence was seen cut off, under another element, or behind a small-panel scroll prompt. Old log entries faded down the page; I did not establish loss of an action-critical sentence from that fading. No inner-panel scroll was needed. |
| DL-31 | NOT TESTED for the full criterion and phone. No goal/deadline/person order sheet was encountered. In the desktop Ruined Trap modal, population and stores remained visible in the dimmed background (`06-ruined-trap.png`). In the Nomad modal, resource counts remained readable (`07-nomad.png`). This does not establish deadline visibility or a phone pass. |
| DL-32 | Incomplete criterion; no global pass/fail claimed. The clearest measured wanted-action delay was gathering: use at 74.541 s, still refused at 114.729 s, so I could not repeat the wood trip at least 40.188 s later. The next successful gather was at 160.033 s; I did not continuously probe readiness and do not call that whole 85.492 s interval a forced wait. I could switch areas and later stoke the fire, so this was not proven to be an interval with no possible hands-on act. My explicit real waits reached 30 s each, and near 13 minutes I wanted to check traps but preferred stepping away to watching recovery. Reported preference: more useful work while the desired collection recovers. |
| DL-33 | PASS for encountered verb interaction, with a scope limit. Light/stoke, gather and check traps each worked with one direct labelled action, without a planning form or confirm chain. There was no drawn person or object to click; the scene was text and controls. Event investigation was a direct “track them” choice followed by a result and “go home.” No multi-field order form was encountered. |

Other checklist coverage: DL-8 priority was readable in sampled desktop screens (current log text, actions, selected tab, stores); DL-10 labels remained understandable across controls and log, including stranger becoming builder through her introduction. DL-16 PASS for the encountered cold-room and ruined-trap problems: I could stoke and investigate. DL-19 no misleading cue established; the uncertain outcome of following prints was not a claim that I would find something. DL-9, DL-11 builder checks, DL-12, DL-15 full speed/slowdown test, DL-17, DL-18, DL-23–DL-29 and all other unmet builder/phone checks are NOT TESTED. No reload/resume, export/replay, send, target measurement, enlarged text or theme change was attempted.

## Stop and return

Stopped at 909.201 s, reason **BORED**, after the floor and before the ceiling. At the final screenshot: one cart, one hut, four traps, four gatherers, population 4/4; wood 417, fur 2, meat 3, scales 4, cloth 1, bait 0. The lodge remained unbuilt, with its observed cost of wood 200, fur 10 and meat 5. Trading post, tannery and smokehouse were visible future options.

The first wish to leave did not pass. Visitors and new recipes briefly renewed curiosity, but I still preferred leaving the game running and checking it later. I would return voluntarily. That is a player intention; the driver was terminated as instructed, so this report does not claim continued production or offline progress after stopping.

## Changes I would want as Sam

1. Show the full price next to a trade or build action before my tap. Spending the five fur on bait was the clearest unwanted surprise.
2. Give unavailable collection actions a readable recovery reason and time remaining. I understood the idle-game pattern but kept checking too early.
3. Give me another useful task during collection recovery, or a clearer indication that this is a good time to leave it running. I like the growth and would keep the longer targets.

No export was downloaded. No replay claim is made.
