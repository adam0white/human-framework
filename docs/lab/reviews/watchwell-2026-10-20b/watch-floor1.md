# The Night Watch — Sam, phone playtest

## Session

Sam, 40, warehouse supervisor. Plays Frostpunk, Kingdom Two Crowns and FTL. Likes defending a place and deciding who stands where. Patient; an evening at home, phone in hand.

- URL: https://human.adamwhite.work/watch/
- Build: no build identifier encountered. The visible winter was **Hard winter**.
- Device: supplied phone fixture, 360×690 CSS px, touch emulation, light mode, default text size. The game rendered a dark scene. After stopping, one inspection at 1280×800.
- Access: supplied `npm run lab:play` driver on port 43603; normal player controls, screenshots and documented waits only. Driver PID 22350 was stopped with `kill 22350` after the desktop screenshot.
- Committed floor: 15 real minutes. Ceiling: 25 real minutes.
- First actionable screen: driver elapsed 0.374 s. Final stop: 911.896 s, about **15:12**. Desktop screenshot: 919.027 s; outside play time.
- Game progress: three nights of the first winter, stopped at the third dawn. Nine souls still here; grain still described as “plenty above spring food needs.” The wall was crossed on each dawn report. The game had not ended.
- No run sent, telemetry submitted, consent changed, hidden/debug API used, or export downloaded. No source, tests, other repository documents, prior reports or prior logs inspected. The diary file below was produced by this session's driver.
- Diary: [wall-clock.jsonl] (screenshot in driver scratch). Screenshots: [watch-floor1-shots](watch-floor1-shots/).

The night ran between commands. I saw posts change from “in the village” to “there now” and people leave while I was opening a list. Dawn explicitly said “Clock stopped”; I do not treat time spent reading dawn as advancing the simulation. The harness gives snapshots every few seconds rather than a human's continuous view. A fleeting message I missed is not proof it never appeared.

Protocol note: the first-minute note was logged at **65.978 s**, about six seconds late. Its judgments below use only the first 60 seconds. There was one stale watcher-name failure at 609.552 s; retry with the fresh name succeeded. A text-targeted scroll failed at 873.171 s; scrolling the visible panel by position succeeded at 876.980 s. Neither prevented operating a visible control. There was no driver block.

## First minute

Original checkpoint note, unchanged:

> I need to bring all six people and the grain through winter. The gold opening button and watcher cards looked tappable; I moved Mara to Mill wall and Kian to East wall, then began the watch. Gate drew me because of tracks; Gate lantern and Ask had selection outlines. Gate was disabled for Mara with Every post is assigned; I cannot tell how to free a place there. The night is underway and I can move the lantern, inspect Watchers or ring the bell. Position choices were available at about 7 seconds; my first posting input was about 16 seconds. Asking changed the requested post before the person arrived, which taught me orders take time. The order sheet had text partly hidden above the post buttons on my phone. I have not used rest, help, bell or pressing yet.

| Item | Status at first minute | Evidence and original understanding |
|---|---|---|
| DL-1 A reason to act | PASS | “Bring every soul and the granary to the thaw.” I understood that I needed to protect the people and winter food. The scout's gate-road tracks gave me a place to watch now. |
| DL-2 What can I touch | PASS for controls reached | Gold opening button, watcher choices, post buttons, speed buttons, Watchers and bell. I did not try an inert object in this minute. I used named controls rather than establishing every scene hit area. Screenshots 01–03 show the inspected controls. |
| DL-3 Urgency and selection | PASS | Tracks drew me to Gate. Ask, the current post and the lantern choice had selection outlines. Screenshot 02 shows a bright selected West wall and dim disabled Gate; screenshot 03 shows the Gate lantern selection. |
| DL-4 Why the limit | FAIL | Gate was disabled for Mara with “Every post is assigned.” Two people were listed at Gate; I could not tell that this meant Gate was full, or how to free it. This is a failure of my understanding of that reason, not a claim that no rule exists. Screenshot 02; 9.804–16.335 s. |
| DL-5 Readable situation | PASS | I could name a response: move the lantern, inspect Watchers or ring the bell. “The lantern is at the Gate” and “Only the lantern’s stretch shows what approaches” explained what was underway. |
| DL-6 A choice soon | PASS | First screen at 0.374 s had the opening control and optional flyleaf. First posting alternatives were available at 6.858 s, well within 30 s. First input: Go up to the wall, 6.858 s. First watcher selection: 9.804 s. First consequential posting input: Mill wall, 16.335 s. Only the short goal preceded entering the wall; I did not read a mandatory story page. |
| DL-7 Learn by doing | PASS for posting; NOT TESTED for four other interactions | I asked Mara to Mill and Kian to East. “Mill wall, asked · on the West wall” taught me that the requested post and current position differ during travel. Begin the watch changed dusk to nightfall. Four unreached interaction types at this checkpoint: rest, help/relief, bell and stronger pressing. I used no expanded help in the first minute. |

This was not a text-only session: I inspected the supplied screenshots. Visual judgments apply to those screenshots, not every state listed in the text snapshots.

## Verbatim diary

Elapsed values below are the driver's reply times, rounded to a tenth of a second. Reaction wording is unchanged. Input labels are shortened for readability; the driver diary preserves the requests. Important visible answers are recorded alongside them. Game clocks are grouped by the visible night and phase; the original driver entries also carry the game clock supplied with each input.

### Before the first night and first dusk

| Elapsed s | Input | Original reaction | Important visible answer |
|---:|---|---|---|
| 0.4 | Open | I want to see what I am defending and who I can put on watch. | “Bring every soul and the granary to the thaw.” |
| 3.4 | Screenshot 01 | Go up to the wall looks like the way in. I can see the job: get everyone and the grain through winter. | Opening button visible. |
| 6.9 | Go up to the wall | Let me get the crew onto their posts. | First winter, first night, Dusk. Gate-road tracks. Tamar and Kian asked to Gate; Mara to West. |
| 9.8 | Select Mara | Tracks are at the gate. Mara sees best, so I want her watching that road. | Gate · tracks disabled; “Every post is assigned.” |
| 12.9 | Screenshot 02 | The gate is disabled and says every post is assigned. Two people were listed at Gate, so I do not yet know how to move Mara there. | Mara “West wall, asked · there now.” |
| 16.3 | Mill wall | I will spread Mara to the mill instead of crowding the gate. | “Mill wall, asked · on the West wall.” |
| 20.7 | Select Kian | Tamar keeps Gate. Kian is fast, so I will put him on the other end. | Kian's posting sheet. |
| 24.8 | East wall | Ask is enough for the first shift. I am keeping the lantern at Gate because of the tracks. | “East wall, asked · on the Gate.” |
| 27.3 | Begin the watch | Positions are set. I am ready to see whether they hold. | Nightfall; Watch · 4 min/s. |

### First night: nightfall, night and midnight

| Elapsed s | Input | Original reaction | Important visible answer |
|---:|---|---|---|
| 54.9 | Wait 25 s | I am watching the gate road before moving the light away. | Nightfall, no new message. |
| 58.1 | Screenshot 03 | The wall has gone quiet. I can move the lantern or call the watchers. | Night; lantern at Gate. |
| 66.0 | First-minute log | Original checkpoint reproduced above. | No new gameplay input. |
| 69.2 | East wall | I want to check on Kian. I can only see the stretch with the lantern. | “The lantern is on its way.” |
| 72.6 | Watchers | I want to hear whether anyone needs moving or a rest. | Names and bell explanation opened; everyone on the wall. |
| 75.2 | Kian | How is the far end holding? | “I’m keeping watch. Nothing close that I can make out.” No rest/help without a sign of tiredness, hurt or a wolf. |
| 108.1 | Wait 30 s | No one needs help yet. I will give Kian a little time rather than ring an alarm for nothing. | Kian's account unchanged. |
| 111.1 | Back to the wall | Nothing at the east. I should check the other side before it gets late. | Midnight. |
| 114.4 | West wall | The west is empty now. I am taking the light across to see what I left uncovered. | Lantern on its way. |

### First night: small hours, before dawn and dawn

| Elapsed s | Input | Original reaction | Important visible answer |
|---:|---|---|---|
| 148.7 | Wait 30 s | I am waiting for the lantern to reach the west and watching for movement. | “Something at the foot of the gate.” |
| 152.0 | Gate | There is something at the gate. Get the light back to Tamar. | Lantern on its way. |
| 155.0 | Tamar | Tamar, what is down there? | “The scout warned us about this stretch. I can’t make anything out yet.” |
| 184.6 | Wait 25 s | I heard something at the gate, but Tamar cannot make anything out yet. I am keeping the light here. | “Tamar nods off at the Gate.” Rest and Send relief available. |
| 189.7 | Pulse 4/5 | Now I have a real shift problem: Tamar is asleep at the gate after that noise, and I want relief there. | Same sleeping account. |
| 189.9 | Send relief | Send someone to cover Tamar before I let her rest. | Before dawn. “Kian, Mara: The latest account and look no longer show tiredness or hurt; no wolf is at this post.” No candidates. |
| 194.1 | Screenshot 04 | It just said Tamar was asleep, but relief gives no people to pick and says no tiredness or hurt now. I cannot tell whether she woke while I opened this. | Old “Tamar nods off” message still visible above relief. |
| 197.5 | Back to Tamar | I need to check whether Tamar is actually awake. | Speaking normally again; Rest disabled with current no-tiredness explanation. |
| 201.1 | Back to the wall | She is speaking normally again. I take that to mean she woke on her own, though I did not see a wake-up message. | Kian goes home: “I can’t keep my eyes open.” Automatic slowdown. |
| 204.0 | Ring the bell | Kian has gone home. I want the bell to call him back if he can hear it. | “Holding!” Tamar calls back. Everyone on wall; rope fraying. |
| 207.9 | Kian | The wall says everyone is back. Did that really get Kian onto his post? | East wall, there now. Too far away for voice at Gate. |
| 241.2 | Wait 30 s | Kian is there now. I will let the last part of the night pass with the light guarding Gate. | Dawn; clock stopped. “The wall was crossed.” Wolves got over Gate; Tamar drove off wolves. All six souls present. |
| 245.7 | Screenshot 05 | The wall was crossed, but everyone is alive and grain still looks plentiful. I did not realize wolves had got over while I was checking people. | Before they sleep; each talk costs sleep. |
| 251.4 | Tamar: Tell me about last night, by point | Tamar was at the attack. I want her account before changing the next shift. | “Cold. Long. Nothing I couldn’t stand.” One more talk. |
| 254.1 | Would you keep the Gate one day? | Mara has the best sight. I want to know if she could take Gate when Tamar needs relief. | “Me? I’d try. Someone has to.” No more talks. |
| 257.1 | On to dusk | I will leave them their sleep now. Next night I want Mara nearer the warning. | Second dusk; Mill tracks. Joss and Yunus arrived. Eight souls. |

### Second dusk

| Elapsed s | Input | Original reaction | Important visible answer |
|---:|---|---|---|
| 261.5 | Tamar | Tamar is tiring. I want her away from the main threat at Mill tonight. | Mill · tracks disabled; “Every post is assigned.” |
| 264.6 | West wall | West was quiet last night. I will give Tamar that side and keep fresh people at Mill. | Tamar asked West. |
| 268.3 | Joss | Joss is strong and fresh. Gate needs someone after I moved Tamar. | Joss posting sheet. |
| 270.9 | Gate | Joss can hold Gate while the two at Mill cover the tracks. | Gate asked, on East wall. |
| 274.4 | Mill wall lantern | Put the lantern where the scout found tracks this time. | Mill lantern selected. |
| 278.4 | Begin the watch | All four stretches have someone now. Let us see if this is better. | Second nightfall. |

### Second night: nightfall and night

| Elapsed s | Input | Original reaction | Important visible answer |
|---:|---|---|---|
| 312.8 | Wait 30 s | I am leaving the light at Mill to catch the approach, rather than touring every post. | Wolves along mill race. Mara looks back at steps. About 115 seconds; automatic decision slowdown. |
| 317.1 | Screenshot 06 | This is what I wanted: Mara sees the wolves and I have time to answer. Yunus is beside her, so I will urge her to stay without spending the rope. | Choice and winter/grain status fit on screen together. |
| 321.4 | Urge Mara to hold | Hold with Yunus, Mara. I need your eyes there. | Choice closed; speed returning. No spoken answer in this reply. |
| 349.3 | Wait 25 s | I urged her, but I have not heard an answer yet. I am watching whether she holds. | Movement in dark by East wall. |
| 352.1 | East wall | Now movement at the east. I will bring the light to Kian rather than ring at every sound. | Lantern on its way. |
| 363.5 | Wait 8 s | I want to see whether the east movement is a threat before calling anyone. | “Kian drove a wolf off the east wall.” |
| 369.7 | Pulse 4/5 | I like moving the light between real troubles and letting the people do their jobs. Kian drove one off; I am invested in getting this shift through. | Kian's success still visible. |
| 369.9 | Tap Kian in scene | I am tapping Kian on the wall to see whether that fight hurt him. | Kian account opened. No tiredness, hurt or current wolf response offered. |
| 373.6 | Back to the wall | Kian sounds fine. I am going back to keep an eye on the whole wall. | Midnight. |
| 376.4 | Mill wall | Mara was about to leave earlier. I am checking the mill pair again. | Lantern on its way. |

### Second night: small hours and before dawn

| Elapsed s | Input | Original reaction | Important visible answer |
|---:|---|---|---|
| 411.8 | Wait 30 s | Holding the light here for a while. I want to see the mill pair settle. | “Mara nods off at the mill wall.” |
| 416.1 | Watchers | Mara has nodded off. Yunus can cover that stretch while she rests. | Everyone on wall. |
| 418.9 | Mara | You can rest if Yunus is still holding here. | Mara gone home; Kian also leaves. Too far away for voice. |
| 422.5 | Slow | Two people left while I was opening the watcher list. I want a slower night so I can read and give relief before they go; I still want to save this shift. | Slow selected, 1 min/s. Yunus nods off. |
| 425.2 | Back to the wall | Yunus is asleep too. I need someone awake at Mill. | Kian and Mara off wall. |
| 428.9 | Yunus | Can I get Joss to cover the mill while Yunus sleeps? | Asleep; Rest and Send relief. |
| 431.7 | Send relief | Get a fresh person into Mill before sending Yunus down. | Joss likely/maybe; leaves Gate empty; takes over before asking Yunus to sleep. |
| 435.1 | Screenshot 07 | This explains the trade: Joss can relieve Yunus, but Gate will be empty. I am taking that risk because the tracks were at Mill. | Before I sent Joss, wolf arrival replaced the relief sheet with Yunus's live decision. |
| 439.5 | Ring and call Yunus by name | A wolf arrived while I was reading relief. The choice replaced it. Ring for Yunus; I need him awake right now. | Bell wakes Yunus. “Holding!” Rope fraying. |
| 463.0 | Wait 20 s | That woke him and he answered Holding. I am staying with the mill until this wolf is dealt with. | Four identical “A wolf got over the mill wall and tore into the store.” messages. |
| 466.9 | Watchers | Holding did not stop them. I need to know what Yunus is doing now, not just hear the same loss four times. | Mara off wall. |
| 470.3 | Yunus | Are you fighting them, Yunus? | “I’m hurt, but it’s a scratch.” Send down/Send help. |
| 473.7 | Send help | He is hurt now. I want Joss there to help, even if Gate is empty. | Kian and Joss available with post-vacancy costs. |
| 476.8 | Send Joss to help Yunus | Send Joss. I want the strong watcher alongside the injured man. | “Joss has been called ... waiting for an answer.” Send down disabled while answering. |
| 510.1 | Wait 30 s | Joss is answering the call. I am waiting to see him arrive before giving another order. | “I’ll take the mill wall.” Sending Yunus down now leaves Joss. |
| 515.9 | Send down | Joss has the wall now. Yunus, go get that scratch seen to and sleep. | Someone already answering call; Send down disabled. |
| 544.9 | Wait 25 s | I have asked him down. I am waiting for his answer, not pressing the button again. | “Yunus won’t go down yet. ‘I can see more from the mill wall.’” Joss nods off. |
| 549.5 | Pulse 4/5 | Yunus refused to leave and now Joss is asleep. The people are awkward in a way I like; I want to get them through, even though I cannot just order the problem away. | Before dawn. |
| 549.7 | Back to the wall | If Yunus insists on holding, I will let him and watch for another threat. | Kian and Mara gone home. |
| 554.3 | Watch | There is no fresh attack to answer. I am returning to Watch speed to finish the night. | Watch selected, 4 min/s. |
| 587.3 | Wait 30 s | I am waiting for dawn. I do not want to spend the fraying rope without a fresh reason. | Dawn. Wall crossed at Mill. Eight souls; grain plenty. |

### Second dawn and third dusk

| Elapsed s | Input | Original reaction | Important visible answer |
|---:|---|---|---|
| 602.1 | How are the knees? | Yunus was hurt and stayed on duty. I want to know whether he can manage another night. | “Fine. I’m fine.” They shift weight off one leg. |
| 605.0 | On to dusk | He says fine but is taking weight off his leg. I will keep that in mind and let the others sleep. | Third dusk. Ruslan arrives. Nine souls. Gate-road tracks. Joss turned away from Ruslan. |
| 609.6 | Ruslan, old full name | Fresh spear at the gate sounds useful. I will keep him apart from Joss, who turned away when he arrived. | Stale name: “in the village” changed to “there now.” |
| 613.4 | Ruslan, fresh full name | Ruslan reached the wall while I was reading. I am asking him now. | Posting sheet opened successfully; “you can't tell.” |
| 616.1 | Gate · tracks | I cannot read the newcomer yet, but I will ask him to watch Gate. | “Gate, asked · on the East wall.” |
| 620.9 | Mara | Three people at Mill is too much while Gate has the tracks. Mara can watch beside the newcomer. | Mara posting sheet. |
| 623.7 | Gate · tracks | Mara, watch Gate with Ruslan. I want early eyes on that road. | “Gate, asked · on the Mill wall.” |
| 627.7 | Gate lantern | Start the light at Gate with the pair I just assigned. | Gate selected. |
| 627.9 | Begin the watch | This is a better spread. I want to see whether the spear and best eyes can hold Gate. | Third nightfall. |

### Third night: nightfall and night

| Elapsed s | Input | Original reaction | Important visible answer |
|---:|---|---|---|
| 661.7 | Wait 30 s | I am watching the road with Mara and Ruslan rather than moving the lantern straight away. | Wolves on gate road. Ruslan leaves for hall; call-back choice, about 118 seconds. |
| 665.2 | Call him back to the wall | Ruslan, come back. I put you at Gate because I need that spear beside Mara. | Choice closed; departure message remained. |
| 688.3 | Wait 20 s | I called him back. I want to see whether he answers before I wear the rope. | Mara also leaving for hall; her live choice, about 99 seconds. |
| 691.6 | Call her back to the wall | Mara too? Come back to the wall. Wolves are on your road. | Choice closed; both departure messages remained. |
| 696.0 | Watchers | Both call-back choices just closed. I want to know whether either person actually came back. | “Everyone is on the wall.” |
| 699.4 | Ruslan | Everyone is on the wall now, despite those leaving messages. I will check Ruslan directly. | “Gate, asked · on the East wall.” Out of voice; lantern Gate. |
| 703.7 | Screenshot 08 | I called Ruslan back to Gate, but he is on East wall now and out of my voice. I cannot tell why he went there rather than back to the post I asked for. | Lantern turned a wolf back at Gate. Scene showed a Ruslan label by Gate and another by East. I could not explain that drawing. |
| 708.5 | Back to the wall | The lantern itself turned one back. I will hold it at Gate and see who is still there. | A wolf got over Gate and tore into store. |
| 712.3 | Mara | Mara, did you return to Gate or go somewhere else too? | “Gate, asked · there now.” No current rest/help condition. |
| 727.6 | Wait 12 s | Mara is at Gate. I cannot undo the lost grain, so I am holding position and watching for the next approach. | No fresh message. |
| 732.1 | Pulse 3/5 | I still want the village safe, but I am spending more time checking where people really are than making a fresh plan. The call-back feedback is wearing on me. | Night. |
| 732.3 | Back to the wall | I want the whole scene back rather than staying in an account that says nothing close. | Watcher list open. |
| 736.0 | Back to the watch | Close the extra watcher list. I just want to see the light and the wall for a bit. | List closed. |
| 769.5 | Wait 30 s | I am staying at Gate. The patrol feels less certain than my assignments, but moving the light now would leave the warned stretch dark. | Midnight; another Gate store-loss message. |

### Third night: midnight through stopping

| Elapsed s | Input | Original reaction | Important visible answer |
|---:|---|---|---|
| 777.5 | want_quit — CONFUSED | I would put the phone down here and come back later. I can ask for posts and call people back, but I cannot tell why Ruslan ends up at East while Gate keeps losing grain. I want to finish the shift, not start a fourth one like this. | Continued because of committed time. |
| 777.7 | Watchers | Before I give up on Gate, I want to know whether Mara is tired or has someone beside her. | Small hours. Mara gone home. |
| 781.0 | Ring the bell | Mara went home again. Ring once to get the gate covered for the last part of the night. | “No answer from the Gate.” Rope fraying; Mara still off wall. |
| 813.6 | Wait 30 s | No answer from Gate. I am leaving the lantern here through dawn rather than ringing the rope apart. | Mara still gone home. |
| 819.1 | Back to the watch | I do not need the names list open while waiting for dawn. | Kian says he cannot keep his eyes open. |
| 852.4 | Wait 30 s | Kian is going home again, but Ruslan was at East. I am choosing to leave the tired people alone and keep Gate lit. | Third dawn. Wall crossed at Gate. All nine souls here. |
| 856.4 | Scroll morning panel | The dawn list has grown. I am scrolling down to talk to Ruslan about why he left Gate. | Lower morning choices brought into view. |
| 859.6 | Screenshot 09 | I want the account, not another night yet. | Ruslan talk buttons visible; result below them. |
| 863.2 | Ruslan: Tell me about last night, by point | Ruslan, tell me about last night. I want to understand the departure before I leave this here. | “I left the Gate. I was frozen through. It won’t happen again.” |
| 873.2 | Scroll by text, failed | Ruslan says he was frozen through. That explains leaving, though not the move to East. I want one more talk with Mara, then leave them to sleep. | Exact text target not found within 5 s. |
| 877.0 | Scroll visible panel by point | The text scroll did not find that line. I am scrolling the visible panel back toward Mara. | Scroll succeeded. |
| 881.5 | Screenshot 10 | I am looking for Mara in the long morning list. | Mara's talk controls visible. |
| 884.9 | Mara: Tell me about last night, by point | Mara, tell me about last night. I called you back, but you still left the gate. | Same “frozen through” answer as Ruslan. No more talks. |
| 905.6 | Wait 15 s/read | I am reading their dawn accounts. I still want to leave this at a morning boundary and return another evening, rather than start the fourth shift now. | Clock stopped; third dawn unchanged. |
| 911.8 | Pulse 3/5 | The people still interest me, but the two identical cold explanations did not resolve what my call-backs did. I am ready to leave it at dawn. | End of phone play. |
| 911.9 | stop — CONFUSED | I am stopping at the third dawn. I would return another evening because I like defending this place and managing tired people, but I do not want a fourth shift while I am unsure what the call-backs changed. The wish to put the phone down did not pass. | Third dawn, nine souls, grain plenty. |
| 914.9 | Resize, after stop | Play has stopped; taking the assigned desktop look. | 1280×800; no further gameplay choice made. |
| 919.0 | Screenshot 11, after stop | Desktop inspection only; no further play. | Large scene left, dawn panel right. Existing panel scroll position retained. |

## Best moment, worst moment and engagement

**Best moment: 7:20–8:30.** Ringing and calling Yunus woke him, and he called “Holding!” Sending Joss afterward produced “waiting for an answer,” then “I’ll take the mill wall.” I could see the handoff change the consequence of sending Yunus down. It felt like managing people at a dangerous post, with a real cost to leaving Gate empty. The earlier 5:13–5:21 Mara decision was another strong moment: a visible threat, two people beside it, time to read, and a reason to conserve the bell rope.

**Worst moment: 11:05–12:58.** Calling Ruslan and Mara back dismissed their choices. The status later said everyone was on the wall, but Ruslan was at East despite Gate being his requested post. The Gate kept losing grain. I could not connect my call-back to a clear response and destination. This was uncertainty about what my inputs changed, not merely disappointment that a risky defense failed.

| Pulse elapsed | Engagement /5 | Original reason |
|---|---:|---|
| 3:10 | 4 | Now I have a real shift problem: Tamar is asleep at the gate after that noise, and I want relief there. |
| 6:10 | 4 | I like moving the light between real troubles and letting the people do their jobs. Kian drove one off; I am invested in getting this shift through. |
| 9:10 | 4 | Yunus refused to leave and now Joss is asleep. The people are awkward in a way I like; I want to get them through, even though I cannot just order the problem away. |
| 12:12 | 3 | I still want the village safe, but I am spending more time checking where people really are than making a fresh plan. The call-back feedback is wearing on me. |
| 15:12 | 3 | The people still interest me, but the two identical cold explanations did not resolve what my call-backs did. I am ready to leave it at dawn. |

Only one want_quit: **12:58, CONFUSED**, reproduced verbatim in the diary. The wish persisted to the final **15:12, CONFUSED** stop. I would return voluntarily another evening. I would leave at the stopped dawn, not leave a live night running unattended.

**Hard, but kept going:** at 7:02 I selected **Slow** because two people had left while I was reading/opening the watcher list. I still wanted to save the shift. I kept managing Yunus's injury, called Joss and accepted Yunus's refusal. At 9:14 I returned to **Watch** because there was no fresh attack. I did not seek an easier winter or reduce difficulty. The speed option helped me stay with the hard situation.

## Clarity findings

| ID | Status | What I saw and what it meant to me | Reference |
|---|---|---|---|
| DL-4 | FAIL | “Every post is assigned” appeared under disabled Gate for Mara. I knew I could not add her there; I could not tell why that particular post was blocked while others remained available. Later the same reason appeared for Mill. “This post is full” was my eventual inference, not the wording I met. | 9.804–16.335 s; screenshot 02. |
| DL-13 | FAIL for call-back feedback; PASS for help request | Call him/her back closed each decision, with no explicit queued/accepted/refused message in the replies I saw. I had to open Watchers and then accounts. Ruslan's account said “Gate, asked · on the East wall.” I cannot establish the underlying rule or whether I missed a fleeting response. In contrast, Joss's help call explicitly said “waiting for an answer” and later “I’ll take the mill wall.” | 665.236–712.251 s; screenshot 08. Positive comparison 476.776–510.075 s. |
| DL-30 | FAIL | In Mara's first posting sheet, Back to watchers and the scene remained visible, but the asking/pressing content was partly hidden above the post grid. The screenshot has a cut text fragment above the horizontal rule where the snapshot lists “How hard do you press Mara?”, Ask/Urge/Insist, “likely, maybe” and About asking and pressing. I cannot quote a complete clipped visual sentence because it is not legible in the image. Those are the corresponding full text-snapshot labels. I could use post buttons without scrolling but could not see all the decision explanation. | Screenshot 02, 12.920 s. |
| DL-22 | FAIL for dawn response context; PASS for sampled live decision | At first dawn the talk list filled the phone. “The wall was crossed,” the raid result and On to dusk were below the initial viewport. I could talk before seeing what the night had resolved. With the longer third-dawn roster, I scrolled to Ruslan and the result. By contrast Mara's live decision, the person, countdown and grain/winter strip all fit in screenshot 06. | Screenshots 05, 06, 09 and 10. |
| DL-19 | Unresolved observation; no separate failure assigned | “Holding!” meant Yunus answered and stayed; I initially hoped it meant the wolf would be dealt with. Wolves still crossed. That is not proof of a misleading promise: the label can mean holding the post rather than winning the fight. The four identical loss lines did not tell me whether I was seeing four wolves or repeated reports of one. | 439.526–470.311 s. |

Tamar's brief asleep/awake mismatch at 3:10–3:17 was confusing but resolved when I reopened her account. I do not claim relief was broken: she may have recovered while time continued. Likewise, the live Yunus choice replaced the relief sheet while I was reading it. It did not stack a second sheet on top. I adapted to the newly visible choice.

## English, dates, phone and hands-on checks

| Check | Status | Evidence and limits |
|---|---|---|
| DL-20 English | PASS for encountered play | Posts, orders, costs, fatigue, voice distance and choices were understandable English. Names did not require translation. No necessary unexplained local term encountered. |
| DL-21 Dates/deadlines | NOT TESTED for a definite deadline comparison | “First/second/third night of the first winter” and Dusk/Night/Midnight/Before dawn/Dawn were understandable relative time labels. “The thaw is still far off” did not give a dated or counted deadline to compare. No month/year rollover or return after a break tested. |
| DL-22 Immediate response | FAIL in sampled dawn layout; PASS in sampled live choice | Dawn result and continuation required scrolling past talk choices. Screenshot 06 kept Mara's live answer choices and essential context visible without scrolling. Not a blanket layout failure for night play. |
| DL-30 Nothing cut off | FAIL in sampled posting sheet | Screenshot 02 hides part of the asking/pressing content. Long dawn content needed inner-panel scrolling; screenshot 10 also shows ordinary viewport boundaries after my deliberate scroll. I do not count those deliberately scrolled boundaries as new clipping defects. |
| DL-31 Read state while acting | PASS for sampled sheets | While ordering Mara, I could read the selected person, first night, grain plenty, six souls and “thaw ... far off” in the top strip. The scene remained visible. During the live Mara/Yunus decisions I could read the named person, winter status and a roughly 120-second countdown. No exact thaw deadline was displayed, so exact remaining nights to thaw were not established. |
| DL-32 Something for your hands | NOT ESTABLISHED as a complete cadence test | The longest chosen quiet stretch between inputs was about 35 real seconds, from moving the lantern at 376.448 s to the wait reply at 411.846 s. It ended with Mara nodding off. I was willing to watch; moving the light, inspecting a watcher or changing speed remained possible. The longest observed wait for a requested handoff was about 33 seconds from Send Joss at 476.776 s to the reply at 510.075 s. I wanted his answer and arrival, but chose to wait rather than issue another order. I did not establish a period in which every meaningful hands-on option was unavailable. I do not infer a failure from my 30-second harness waits alone. |
| DL-33 Scene acts | PASS for light and direct live call; mixed for staffing | Tapping a wall button immediately started carrying the lantern. Tapping Kian in the scene opened his account. Live “Ring and call Yunus by name” was one direct choice and promptly produced a spoken response. Posting used person → Ask/Urge/Insist → post. Help used account → Send help → named helper, with no extra Confirm. This suits planned staffing, but ordinary checking and relief often took me through lists instead of letting me act on the whole crew at once. No claim that every core verb was tested. |

Other checklist observations: **DL-12 PASS** for dawn boundaries (“Clock stopped,” dawn report, On to dusk); **DL-14 PASS** for encountered relief/help costs (which post becomes empty; whose answer is uncertain; talks cost sleep); **DL-15 PASS** for moving time, visible speeds and sampled decision slowdown at Watch speed. Fast-speed decision handling was **NOT TESTED**. **DL-17 PASS** for encountered fatigue and injury being said/drawn rather than numerical bars. **DL-24** had one sheet at a time in my sampled account/help/back navigation, including replacement by a live choice; complete focus restoration **NOT TESTED**. **DL-26** Game menu was visible throughout; its contents **NOT TESTED**. **DL-23**, full **DL-25** reflow/text-size coverage, **DL-27** reload/resume, **DL-28** sending and **DL-29** replay were **NOT TESTED**. Sending was outside this assignment. All builder-only checks and other unmet checklist items are **NOT TESTED**.

## Desktop look after stopping

[Screenshot 11] (screenshot in driver scratch) shows the wall on the left and the dawn panel on the right. The winter/grain/souls strip stays across the top. The panel retained its existing scroll position, so the top shows the tail “happen again.” from Mara's answer. That was after deliberate phone scrolling; I do not infer a fresh desktop clipping defect from this one look. No desktop gameplay or order sheet was tested.

## Where I stopped and changes I would want

I stopped at the **third dawn, first winter**, after two morning talks, at **15:12 real time**. Reason: **CONFUSED**. The first want_quit at **12:58** did not pass. I would return another evening because I like the place, the limited lantern and people who do not obey like pieces. I would not begin another shift immediately while unsure what my call-backs changed.

My ranked changes as this player:

1. Give each call-back a readable answer and destination: accepted, refused, returning to Gate, or choosing East instead. I want to understand the people's decisions; I do not need them to obey every request.
2. Keep the full asking/pressing explanation visible on the phone when I assign a post. I should not need to infer the contents of the hidden strip.
3. Put the dawn result before the long optional talk list, or give it a visible summary beside that list. I want to know what happened before deciding whose sleep to spend on a conversation.

No export downloaded. No replay claim.
