# The Night Watch — Sam, free stop

## Session

- Persona: Sam, 40, warehouse supervisor. Plays Frostpunk, Kingdom Two Crowns and FTL. Likes defending a place and deciding who stands where. Patient. An evening at home, phone in hand.
- URL: https://human.adamwhite.work/watch/
- Build: no build identifier seen. The game displayed **Hard winter**. I did not change the winter.
- Device: 360×690 CSS px, touch emulation, light mode, default text size. Screenshots were available and inspected; this was not text-only play.
- Access: supplied standard driver, port 43602, PID 24368. No source, tests, other repository documents, prior reports or internal state inspected. Only the two assigned files were read in the game repository. Protocol note: a general session skill file outside the game repository was also read alongside the brief, before play. It contained no game material.
- Limits: floor 0 real minutes; ceiling 25 real minutes. First actionable opening reply: elapsed 0.396 s. Stop: 378.492 s, about **6 min 18 s**. Post-stop desktop look: 1280×800 at 383.547–387.168 s.
- The page advanced between commands. Dusk watchers moved while I read; night phases advanced during real waits. Dawn explicitly said “Clock stopped.” No frozen-time limitation was observed.
- No run sent, telemetry submitted, consent changed, export downloaded, or hidden/debug API used. Driver killed by its exact PID after the desktop look.
- Wall-clock record: [wall-clock.jsonl] (screenshot in driver scratch). Screenshot names below are relative to [watch-free2-shots/](watch-free2-shots/).

## First minute

The wait reply reached 60.066 s. I composed the checkpoint then; the driver recorded the note at 67.979 s. Its observations concern the screen and inputs through 60 s. Nothing learned later is used to upgrade these rows.

Original checkpoint note, verbatim:

> I need to bring six people and the grain through winter. Go up to the wall, watcher cards, post buttons, speeds and the bell look usable; I have not tried anything inert. Gate tracks drew me first; Gate is now outlined for my lantern and Watch is selected. I have not met a disabled action. I can move the lantern or ask a watcher for help. Posting Kian was available at 9 seconds, I first tried him at 14 and actually selected him at 17; asking him to Mill wall at 19 showed an asked destination separate from where he was. That taught me orders take travel time. I have not learned rest, help, the bell or what urging costs. The lantern choices needed a scroll during posting, but the night controls and grain status now fit.

| Item | Status | Evidence available at the checkpoint |
|---|---|---|
| DL-1 A reason to act | PASS | Keep the six people and grain through winter. Opening: “Bring every soul and the granary to the thaw.” Screenshot 01. |
| DL-2 What can I touch | PASS | Go up to the wall, watcher cards, posts, speeds and bell looked usable. The opening plus-marked headings looked expandable. No inert object tried or accidentally discovered control. Screenshots 01–03. |
| DL-3 Urgency and selection | PASS | Scout tracks at the gate supplied the immediate concern. Gate had an outline for the lantern; Watch had its own selected outline. No competing alarm at 60 s. Screenshot 03. |
| DL-4 Why the limit | NOT TESTED | No unavailable action met by 60 s. The first Kian tap missed a changing status label; that was not a disabled gameplay action. |
| DL-5 Readable situation | PASS | I could move the lantern or open a watcher. “Only the lantern’s stretch shows what approaches. Your voice reaches the next stretch.” Screenshot 03. |
| DL-6 A choice soon | PASS | First confirmed posting choice available at 9.363 s. First navigation input also 9.363 s; first posting attempt 13.811 s; successful watcher selection 16.714 s; post order 19.264 s. This was within 30 s. The opening had one short goal sentence before entry; no long mandatory story screen. |
| DL-7 Learn by doing | PASS, reached interactions only | Kian’s order changed to “Mill wall, asked · on the Gate,” separating requested destination from current location. Lantern movement said “on its way,” then showed Gate selected. No help opened. Six identified interaction families were NOT TESTED at this checkpoint: rest, help/relief, bell, speed changes, Urge/Insist, and Choose own post. |

## Verbatim diary and input record

Times are the driver’s elapsed seconds at the reply/log. Reactions are reproduced as written during play, including guesses later corrected. Quoted game answers are observations, not explanations of the simulation. A dash means no reaction was entered. N1/N2/N3 mean first/second/third night of the first winter.

| Elapsed s | Game clock | Input or diary kind | Original reaction | Important visible answer |
|---:|---|---|---|---|
| 0.396 | Before first night | open | — | Opening goal and Go up to the wall. |
| 4.936 | Before first night | shot 01-opening.png | I am keeping everyone and the grain alive until thaw. Go up to the wall looks like the way in; the two plus-marked headings look expandable. | Opening fit the phone. |
| 9.363 | N1 dusk | Go up to the wall | Let me see who is on watch. | Tracks on gate road; Tamar and Kian assigned Gate, Mara West. |
| 13.811 | N1 dusk | Kian, using “in the village” name | Tracks at the gate. Tamar can stay there; I want the quick one covering the mill side. | Name changed to “there now”; input not accepted. Game-state change, not driver block. |
| 16.714 | N1 dusk | Retry Kian with fresh name | They have already walked to their posts while I read. | Kian selected; Ask/Urge/Insist and posts available. |
| 19.264 | N1 dusk | Mill wall | Ask is enough for now. Cover that empty side. | “Mill wall, asked · on the Gate.” |
| 22.952 | N1 dusk | shot 02-posting-phone.png | I have Tamar at the tracks, Mara watching west, Kian moving to the mill. East is uncovered; I will watch that myself if I can. | Lantern choices below watcher cards in phone panel. |
| 26.661 | N1 dusk | scroll 335 in Kian panel | The lantern choices are below the watcher cards; I am scrolling to reach them. | Posting controls still available. |
| 29.411 | N1 dusk | East wall lantern | I will start the lantern on the side without a watcher. | East wall selected. |
| 31.779 | N1 nightfall | Begin the watch | All right. Let us see whether that spread holds. | “The wall settles in for the night.” Watch, 4 min/s. |
| 44.341 | N1 nightfall | wait 10 s | I am watching the east approach. I like that the lantern cannot see everything at once. | No new message. |
| 46.895 | N1 nightfall | Gate lantern | No movement east. I am checking the road where the scout found tracks. | “The lantern is on its way.” |
| 50.068 | N1 nightfall | shot 03-first-night-phone.png | — | Lantern at Gate. Night controls and grain status on screen. |
| 60.066 | N1 nightfall | wait 7 s | — | No new message. |
| 67.979 | N1 nightfall | first_minute | Original note reproduced in full above. | Checkpoint logged before next gameplay input. |
| 68.161 | N1 night | Watchers | I want to hear how Tamar is doing before anything arrives. | Watcher buttons; bell explanation: each pull wears rope. Everyone on wall. |
| 72.245 | N1 night | Tamar | — | “I’m keeping watch. The scout warned us about this stretch. I can’t make anything out yet.” No rest/help without tiredness, hurt or wolf. |
| 75.915 | N1 night | shot 04-tamar-account.png | Fair enough: she is not tired and there is no wolf to help with. I can read the grain and her post while talking. | Full account and state strip visible. |
| 78.877 | N1 night | Back to the wall | — | Returned to expanded watcher panel. |
| 82.458 | N1 night | Back to the watch | — | Normal night controls. |
| 105.603 | N1 night | wait 20 s | I will hold at the gate a little. I do not want to ring away a sound rope for no reason. | No new message. |
| 108.974 | N1 midnight | Fast | It is quiet. I am speeding up until something needs me; I know where everyone stands. | Fast, 12 min/s. |
| 123.887 | N1 small hours | wait 12 s | — | No new message. |
| 127.011 | N1 small hours | West wall lantern | I should check Mara rather than stare down the same road. | Lantern moving. |
| 141.841 | N1 before dawn | wait 12 s | — | Kian: “I can’t keep my eyes open.” Mara nods off. Fast showed 7.8 min/s. |
| 146.411 | N1 dawn | Slow | Two people are flagging. Slow down so I can sort this out. | Dawn arrived; Clock stopped. “The wall held.” Tamar drove off wolves; nobody stood mill or east. |
| 150.613 | N1 dawn | shot 05-dawn.png | We held, but I missed the wolves at the gate while looking west. I thought Kian had gone to the mill; the morning says nobody stood it. I want to ask him what happened. | Talks appeared before result in scroll panel. |
| 153.962 | N1 dawn | tap Kian’s Tell me about last night at (94,586) | Kian, tell me about last night. | “I went home to sleep. I’m sorry. I couldn’t stand up straight at the mill wall.” One more talk. |
| 157.141 | N1 dawn | Would you keep the Gate one day? | Mara has the best sight. I want another person who can hold the gate when Tamar needs sleep. | “Me? I’d try. Someone has to.” No more talks; day’s work calls. |
| 160.143 | N1 dawn | scroll 463 | The morning result is below the talks. I want to read it before moving on. | Result and witness accounts farther down. |
| 163.197 | N1 dawn | shot 06-dawn-scrolled.png | — | Accounts, grain drawing and On to dusk visible after scrolling. |
| 166.656 | N2 dusk | On to dusk | Mara said she would try the gate. I want to see whether I can rotate them rather than exhaust Tamar again. | Eight souls. Joss and Yunus joined. Tracks along mill race. |
| 169.809 | N2 dusk | Mara | She is still tiring after sleep. Maybe asking for the gate was unfair; I will look at her options. | Mill wall disabled, reason “Every post is assigned.” Gate and East wall available. Rest only at night. |
| 173.610 | N2 dusk | Gate for Mara | Tamar and Mara together at the gate, then I can ask Mara to go down once night starts. | Mara: “Gate, asked · on the West wall.” |
| 178.189 | N2 dusk | pulse, engagement 4/5 | I care about rotating tired people now that Kian went home and Mara offered to try the gate. More watchers make this feel like a place to manage. | — |
| 178.392 | N2 dusk | Mill wall lantern | The mill has tracks tonight, so I will carry the light there. | Mill wall selected. |
| 181.391 | N2 nightfall | Begin the watch | — | Slow, 1 min/s. |
| 184.412 | N2 nightfall | shot 07-second-night.png | — | Mara and Tamar at Gate; Kian and Yunus at mill. |
| 187.659 | N2 nightfall | tap Mara in scene at (154,303) | Mara, you can rest while Tamar holds this side. | “Keeper’s read: seemed tiring at dusk.” Rest and Send relief. “likely; leaves Tamar at the Gate.” |
| 190.474 | N2 nightfall | Rest | Yes, rest. Tamar is still there. | Rest disabled; “Someone is already answering your call for Mara.” |
| 200.557 | N2 nightfall | wait 7 s | Someone is answering my call; I will wait for her answer. | Mara won’t go down: “I can see more from the Gate.” |
| 204.263 | N2 nightfall | note | That is a good refusal. I asked her to try the gate this morning, and now she wants to stay there. I will leave her to it for a while. | — |
| 204.474 | N2 nightfall | Back to the wall | — | Rest refusal remained in hearing messages. |
| 209.420 | N2 nightfall | Watch | Back to the normal watch pace. I want to be here when the wolves reach the mill. | Watch, 4 min/s. |
| 232.794 | N2 nightfall | wait 20 s | I am holding the light over Kian and Yunus at the mill. | “Wolves along the mill race.” Yunus drove one off. |
| 236.494 | N2 night | shot 08-mill-wolves.png | Yunus handled one already. Good, though I did nothing beyond putting the light here. | Kian also drove one off. Messages over scene. |
| 241.286 | N2 night | tap Yunus at (246,302) | Yunus just fought one off. How is he holding up? | Praying quietly; scout warned of this stretch. No rest/help offered without a sign. |
| 245.751 | N2 night | Back to the wall | — | Night controls. |
| 245.919 | N2 night | Fast | They have handled the pack and no one needs help. Fast again for the quiet part. | Fast, 12 min/s. |
| 267.350 | N2 midnight | wait 18 s | Waiting for a reason to intervene. The people fighting is satisfying, but I would like a job during the approach. | No new message. |
| 274.051 | N2 midnight | Gate lantern | I want to check whether Mara is getting tired again. | Lantern moving. |
| 276.384 | N2 small hours | tap Mara at (154,303) | — | “They appear asleep. No reply comes.” Rest and Send relief available. |
| 280.055 | N2 small hours | Rest | Now she is actually asleep. Try asking her down again. | Pending request; “Slow · the night slows · 1 min/s” while Fast stayed selected. Yunus called that Kian went home. |
| 290.659 | N2 small hours | wait 8 s | The night slowed by itself while my request is pending. That gives me room to read. | Mara gone home; Fast restored. Tamar nodded off. “Something at the foot of the mill wall.” “Grain is gone: something got over the mill wall.” |
| 294.685 | N2 small hours | Slow | Something got over at the mill while I was dealing with Mara. Slow down; I need to get the light back. | Slow, 1 min/s. |
| 294.852 | N2 small hours | Back to the wall | — | Normal night controls. |
| 298.664 | N2 small hours | Mill wall lantern | — | Lantern moving. |
| 298.833 | N2 small hours | Ring the bell | We have lost grain. Call the watchers back before anything else gets through. | Bell rings from Gate, faint at east. “Bell swinging” disabled. Rope fraying. |
| 316.814 | N2 small hours | wait 12 s | I am waiting for the bell to bring them back. One pull already frayed the rope; I will save the next one. | Ring the bell available again; sound message remained. |
| 324.209 | N2 before dawn | shot 09-after-bell.png | I cannot tell yet who heard the bell or whether anyone is returning. I am looking at the wall for them. | Rope fraying; no named recall answer in reply. |
| 327.885 | N2 before dawn | Watchers | Who is still downstairs after that bell? | “Off the wall: Mara (gone home).” |
| 330.880 | N2 before dawn | Kian | — | “Mill wall, asked · there now.” Keeping watch. |
| 337.266 | N2 before dawn | note | Kian is at the mill again. The bell seems to have brought him back; I only found that by opening his account. Mara is still home, which makes sense after I sent her down. | — |
| 337.467 | N2 before dawn | Fast | The mill is covered again. I am waiting for the morning account now. | Fast, 12 min/s. |
| 349.769 | N2 dawn | wait 10 s | — | Wall crossed at mill and east. Yunus described a bite. Mara: “You rang us up for shadows.” |
| 358.042 | N2 dawn | pulse, engagement 3/5 | I still want to cover the east wall next night, but I spent much of this one checking accounts and waiting. Mara saying shadows after grain was stolen leaves me unsure what my bell achieved. | — |
| 358.399 | N2 dawn | scroll 530 | I want the full night result before planning again. | Result below five sets of talk buttons. |
| 364.964 | N2 dawn | How are the knees? | Yunus was bitten. I want to check him before putting him back on the wall. | “It aches. It’ll hold.” One more talk. |
| 368.895 | N2 dawn | want_quit — BORED | I would put the phone down here. I like these people, but I keep waiting for the fight to resolve and then asking how it went. I wanted to run the defence during the fight. I will look at the next posting once before leaving. | — |
| 372.479 | N3 dusk | On to dusk | — | Nine souls; Ruslan joined. Joss turned away and is at odds with him. Joss spent two hours on rope. |
| 378.492 | N3 dusk | stop — BORED | I am stopping at the third dusk. The new spear carrier and his trouble with Joss are interesting, but I do not want another stretch of waiting tonight. The wish to put the phone down did not pass. I might return for the people, but I would not leave it running unattended. | Nine souls, grain still plenty above spring needs, gate-road tracks. |
| 378.686 | N3 dusk; after stop | shot 10-stop-phone.png | — | Today’s notes fill the visible posting panel; watcher cards below. |
| 383.547 | N3 dusk; after stop | resize 1280×800 | — | Required desktop look only. |
| 387.168 | N3 dusk; after stop | shot 11-desktop-after-stop.png | — | State strip and broad wall scene visible; right panel shows Today, first cards and fixed Begin button. |

## Best, worst, pulses and staying through difficulty

**Best moment:** 200.557–204.263 s. Mara refused rest because she could see more from the Gate, after I had asked her that morning whether she would keep it. I read this as her wanting the responsibility. That is my inference, not a confirmed motive. Highest recorded engagement was 4/5 at 178.189 s, around the staffing and rotation decisions.

**Worst moment:** 298.833–337.266 s. I rang because grain had been stolen, waited, then needed the watcher list and Kian’s account to learn he was back. The rope cost was clear; the staffing result was not immediately clear to me. Later Mara’s “shadows” line made me question the call again. Her disagreement is not proof that ringing was wrong or that the game contradicted itself.

**Every want_quit:** one, 368.895 s, **BORED**, verbatim in the diary. Continued to the next posting. It did not pass. Final stop 378.492 s, **BORED**.

**Pulse series:** 178.189 s: 4/5; 358.042 s: 3/5. No third pulse was due before stopping.

**Hard, but kept going:** at 141.841 s fatigue appeared near dawn; I tried Slow at 146.411 s, though dawn arrived before I could act. At 280.055 s the game slowed a pending rest request by itself and restored Fast afterwards. At 294.685 s I used Slow after a breach because I wanted time to respond and keep playing. I sought a slower clock, not an easier winter. I did not seek an easier difficulty or accessibility menu. I stayed because I wanted Mara rested and the mill covered.

## Clarity findings

| ID | Status | What I saw and its limit |
|---|---|---|
| DL-4 | FAIL, later encounter | At 169.809 s, Mara’s Mill wall button was disabled with “Every post is assigned.” Gate and East wall remained available. I could not tell whether this meant the mill was full or every wall post was assigned. No claim about the actual capacity rule. The pending Rest explanation at 190.474 s was clear, as were distance and time-of-day limits. |
| DL-13 | FAIL for recall-result clarity | At 298.833 s the bell tap was acknowledged with ringing and rope wear. At 324.209 s I still could not tell who had heard or was returning. By 330.880 s Kian’s account said “there now.” I inferred a recall; I did not see a named return message. Screenshot 09 and diary 298.833–337.266 s. This is not a claim that the bell did nothing. |
| DL-22 | FAIL during posting and dawn | The first dusk’s lantern choices were below the watcher cards; I scrolled at 26.661 s. At dawn the night result was below the talks; screenshot 05 shows talks, screenshot 06 shows the result area after scrolling. Third dusk Today notes filled the visible panel before any watcher card, screenshot 10. Ordinary night controls fit well in screenshots 03 and 07. |
| DL-30 | FAIL for essential content behind panel scrolling | “Start the lantern at” and its choices were outside the visible first-dusk panel, screenshot 02. “The wall held.” and its result were below the dawn talks, screenshots 05–06. No mid-word sentence clipping, overlapping sheets, literal “Scroll ↓” marker, or horizontal clipping was observed. The finding is hidden decision/result content in the scroll panel, not missing text. |

The wolves were handled without my input during the first two fights. That was part of my boredom, not evidence of a missing combat control. I never established a rule promising that I could fight directly. I also did not treat Mara’s refusal, grain loss, or fatigue as a clarity defect merely because they frustrated my plan.

## Required language, layout and hands-on checks

| Item | Status | Observed evidence |
|---|---|---|
| DL-20 English | PASS for reached play | Orders, condition words, goals and timing were English. “Gate,” “Rest,” “Send relief,” “tiring,” and “Clock stopped” were actionable without translation. Names needed no glossary. |
| DL-21 Dates | NOT TESTED for deadline comparison | “The second night of the first winter,” “Dusk,” and “Before dawn” were readable relative time labels. No exact thaw date or comparable dated deadline was reached; “the thaw is still far off” did not establish one. No return-from-break comparison tested. |
| DL-22 Phone response | FAIL in the contexts above | Night lantern/bell controls and essential state fit. Dusk posting and dawn result required panel scrolling. |
| DL-30 Cut-off/hidden text | FAIL for essential content behind scrolling | Evidence above. No observed mid-sentence truncation to quote. The screenshot 10 footer also leaves further Today notes and all watcher cards below the visible panel. |
| DL-31 State while ordering/answering | NOT TESTED fully | Screenshot 04 establishes that an inspection account kept Tamar, her post, grain, soul count and winter phase readable. I used an actionable Rest account later, but did not capture its layout. I cannot establish the full visual order-sheet check from the driver’s all-text reply. No exact thaw deadline was shown in either case. |
| DL-32 Something for your hands | NOT TESTED as an exclusive wait failure | Longest quiet period between attended inputs at default Watch was 82.458–108.974 s, about 26.5 s; I chose to hold the gate, then used Fast. The 209.420–232.794 s stretch was about 23.4 s while I wanted to attend the approach, but lantern, bell and watcher inspection remained available. I did not establish any interval where every meaningful act was unavailable. Pending Rest took about 10 s in the first request, but I could back out. My wish for more defence work remains a player preference. |
| DL-33 Scene acts versus forms | PASS for reached acts | Carrying the lantern was one post tap. Tapping Mara or Yunus in the wall scene opened a short account, not a strength/reason/Confirm form. Rest then took one button. Dusk posting offered Ask/Urge/Insist as planning; I used default Ask. Direct combat, Send relief, Urge and Insist were NOT TESTED. |

Other reached evidence: DL-12 PASS for night boundaries — Dawn, Clock stopped, a night result and On to dusk made continuation clear. DL-14 PASS for the costs I used — morning talks cost sleep; bell use wears the rope; Rest preview named who remained. DL-15 PARTIAL: speeds and automatic pending-request slowdown/restoration were observed; I did not test answering a separate live event from Fast. DL-24 PASS for the reached account/back paths; no stacked sheets observed. DL-26 menu button discoverable without scrolling, but its contents were NOT TESTED. DL-27–29 NOT TESTED; no reload, send or replay. DL-23 target measurements, DL-25 alternate widths/text sizes, and all builder checks NOT TESTED. Unlisted checklist items were not separately established.

## Stop and return

Stopped voluntarily at the **third night of the first winter, Dusk**, with nine souls and grain still described as plenty above spring food needs. Reason: **BORED**. The first wish to leave did not pass after seeing Ruslan and Joss’s disagreement. I would not leave the clock running unattended. I might voluntarily return for the people; I did not feel an immediate urge to start another night.

The single desktop look after stopping showed a larger wall and a right-side panel. It did not change the stop reason or count as continued play. It was not a desktop playtest.

## Changes I would want as Sam

1. Let me see who answers the bell, and where they are returning, without opening each account.
2. Keep the current defence result and the posting/lantern choices reachable on the phone before the longer morning or Today material.
3. Give me more work in the defence while an approach unfolds. I liked positioning people and carrying the light; I wanted to do more with that responsibility during the fight.

These are this player’s preferences and reproducible clarity observations. They do not set the game’s difficulty or decide whether its quiet stretches should remain.
