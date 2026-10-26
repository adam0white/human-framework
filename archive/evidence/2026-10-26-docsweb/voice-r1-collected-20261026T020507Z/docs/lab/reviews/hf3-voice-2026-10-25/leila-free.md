# Voice playtest report: Leila Mansour, round hf3-voice-r1, free arm

I stopped after about 5 minutes 10 seconds with the reason **FRUSTRATED**. I liked Halil and the stakes felt honest, but the clock kept taking away the choices I wanted to make.

I could not write `report.md` myself. My only tool runs shell commands, and the brief allows only curl in them, so this response is the report for you to save. Nothing was submitted to Feedback: I only selected "I'd stop here".

## 1. Session details
- **Persona:** Leila Mansour, 26, translator in Alexandria.
- **Exposure:** first visit to Voice, no prior exposure.
- **Round / arm / session id:** hf3-voice-r1 / free / hf3-voice-r1-leila-mansour.
- **Diary before play:** empty ("No sessions recorded"), cold start.
- **Recognition:** none.
- **URL:** https://human.adamwhite.work/voice/, through the localhost driver at 127.0.0.1:19486 (curl POST only).
- **Game title shown:** "The Day You Say Nothing". No build number was visible.
- **Device:** 1280x800. I switched to 360x690 once for the required check.
- **Time limits:** floor 0 minutes, ceiling 25 minutes. Actual play was 310 s of driver time.
- **Clock note:** the driver let the game clock run in real time between my commands. Several jumps of 2–3 game hours happened while I was only reading. I used no speed control; the game offered none.
- **Player id:** none shown in ordinary UI.
- **Export:** none downloaded.

## 2. First minute
My checkpoint note at 66 s, in my own words: *"Reason to act: Halil dreads the mosque and the clinic, and he owes Osman money; I want to nudge him. Tappable: Speak, Skip, the three panel tabs, the action list and how-strongly buttons. Urgent: the dawn prayer deadline. The Likely reply preview is the best thing here. But my mosque suggestion got no reply on screen. Then three hours jumped by in one 15s wait and I only learned from Dawn prayer kept that it worked. My words to Mrs Aydin showed up late, 10s after I tapped. I could not tell what was happening live."*

| Item | Result | Evidence |
|---|---|---|
| DL-1 A reason to act | PASS | The intro told me to "Help him reach his goals during Ramadan", and the "he dreads it" list gave me targets. |
| DL-2 What can I touch | PASS | Speak, Skip ⏩, the Halil / His goals / Today tabs, the numbered actions, and Mention / Urge / Insist plus reasons. I touched nothing that didn't respond. |
| DL-3 Urgency and selection | PASS (weak) | "Dawn prayer before 06:29" drew me first. The scene text competed with the large side panel. Selected items were shown as pressed. |
| DL-4 Why the limit | PASS | "He is occupied. Suggestions wait until he is choosing." The limit was explained, and it lifts when he is choosing. |
| DL-5 Readable situation | PASS | "He's leaning toward rest at home. His reason: I am doing this because I feel like it." |
| DL-6 A choice soon | PASS | A choice (Speak) was available at about 9 s. My first input was at 11.8 s, before any long text. |
| DL-7 Learn by doing | FAIL | I reached 2 interactions. (1) The Likely reply preview taught me well. (2) After pressing Say it, nothing appeared. I learned the outcome only later from "Dawn prayer kept". Help used: none. |

Visual checks are limited: this harness gives text and screenshots only, so colour and contrast are **NOT TESTED**.

## 3. Diary (verbatim, with elapsed seconds)
- **0–9 s:** "New game" turned into "Continue · Ramadan 1 · 03:40". Before I could tap it, the game started itself and I was dropped in at 04:11.
- **11.8 s, Speak:** *"Pre-dawn meal skipped past me between taps; clock jumped 04:11 to 04:30. 'Go home and rest' offered while he is at home - odd."* This log entry failed because of my own shell quoting, not the driver.
- **18–28 s:** Plan something specific → pray at the mosque → "you shouldn't be alone" → Urge. The preview said *Likely: "I will do it."* I tapped Say it.
- **31 s:** *"I pressed Say it. Nothing answered. No reply line, he still rests until 04:59. Did he agree or not? I am waiting, but for what?"*
- **47 s, wait 15:** the clock jumped to 08:00 and the header said "Dawn prayer kept". The mosque now read "it feels hard / EASIER THAN AT THE START".
- **50 s:** I said "Take your time. I can be quiet while you work." to Halil at the workshop with Mrs Aydın. The reply "He heard you and keeps working" appeared only about 10 s later.
- **74 s:** *"Reread 1: These are estimates of what he would choose without your advice. They do not show completed actions - but the first line says eat the pre-dawn meal, chose it. Estimate or fact? Deadline Ramadan 15 (Monday 25 March) is clear, good."*
- **95–108 s:** I said "Go and see the doctor." He answered: "After I finish this task (rest at home), I will do it."
- **134 s:** *"He went to the clinic! High blood pressure. That is a real payoff, Your suggestion went well. But goals still say see the doctor, chose something else - reread 2, I do not trust that list now. Two rereads."*
- **158 s:** a real dilemma appeared: "Morning work alone would leave him with about 270 lira by Ramadan 15; Osman wants 300." I tapped "Take the afternoon shift."
- **165 s, pulse 3:** *"The doctor scene and the 270 vs 300 lira squeeze are real stakes and I like them. But every time I speak my line vanishes and the answer arrives 10 game-minutes later, so I keep wondering if I clicked anything."*
- **177 s:** it was 15:41 and he had rested all afternoon.
- **182 s, want_quit (CONFUSED):** *"I said take the afternoon shift. No answer ever appeared, and 3 game hours passed in 12 real seconds; he just rested. Did he refuse? Did my words even land? I would close the tab here."*
- **188 s:** I opened the Today tab. *"Today log explains it: he put me off twice, then slept. That log is what I needed live. Also he saw the doctor because Selin asked, not me, yet panel said my suggestion went well. And he remembered condolences at the mosque - lovely, and I never saw it in the scene. Want-quit easing."*
- **189 s:** I pressed Speak and the clock was already 18:39. The afternoon was gone.
- **195–201 s:** call Selin → Urge → "for Selin" (the game had pre-selected that reason). The preview said: "I want to finish this task (pray at home) first." I said it.
- **233 s:** he was smoking. The sheet said: "He is reaching for a cigarette. The doctor told him to walk." I chose "Go for a walk by the river."
- **257 s, pulse 4:** *"The log is the real game: torn between a cigarette and calling Selin, Nurans tea after the sunset meal. He walked because I asked. I think my walk push knocked out my Selin push - that is a fair, painful trade. I just learn it all after the fact."*
- **258 s:** Day 1 ended before I could speak again. The summary said: "You suggested an action 5 times. In the end he agreed 3 times…" *"…it still says see the doctor, chose something else, right under he saw the doctor. And Selin usually calls this evening - she never did, or I missed it."*
- **282–290 s:** the requested phone check (described in section 6).
- **293–296 s:** at 05:10 on Day 2 I opened Speak, and the header showed "reading: the day slows while you choose". When I tapped "Say something else…", it was already 08:00 and the sheet was gone.
- **300 s, want_quit (FRUSTRATED):** *"I had the speak sheet open at 05:10 … two seconds later it was 08:00 and my sheet was gone. I knew exactly what I wanted - call Selin - and the clock took it from me again."*
- **301–306 s:** I opened the menu ("The day waits while this is open") and then Feedback. I selected "I'd stop here". I typed nothing and did not submit.
- **310 s, stop (FRUSTRATED):** *"I like Halil and the stakes are honest. But I spend my turns reading the log of what already happened while the clock eats the choices I wanted. … I might come back if I could slow the day down."*

## 4. Moments
- **Best moment (about 134 s, engagement 4):** the clinic scene with "The doctor said his blood pressure is high." A close second was the log line about Nuran's tea and his cigarette after the sunset meal.
- **Worst moment (about 177–189 s):** my afternoon-shift suggestion vanished with no answer, then the whole afternoon passed while I read the log.
- **Want_quits:** at 182 s, CONFUSED (this one eased once I found the Today log); at 300 s, FRUSTRATED (this one did not ease).
- **Pulses:** 3 at 165 s, then 4 at 257 s.
- **Hard, but kept going:** after the first quit wish I looked for a way to slow time. I found the Today log and kept playing because Halil's choices felt real. The menu had no speed setting and the Information button was the only help; I never found a way to slow the day.

## 5. Clarity failures
- **DL-7:** after Say it, my words and his answer did not appear (at 28 s and 162 s). They showed up only after the clock moved on, or only in the Today log.
- **DL-32 (live timing):** reading the log cost me hours of game time. My open Speak sheet was taken away at 05:10→08:00, even though the header said "reading: the day slows while you choose".
- **Goals panel contradiction:** "These are estimates … They do not show completed actions" sits right above "see the doctor — chose something else", next to "he saw the doctor". I had to read this twice (rereads 1 and 2). This would trigger Rosa's quit rule; I am Leila, so I only note it.
- **His stated task did not match his activity:** "I want to finish this task (pray at home) first" when he was resting. "Go home and rest" was offered while he was already at home.
- **Header after sunset:** "fasting until 18:46" was still shown at 18:55 and later.
- **Credit for the doctor visit:** "Your suggestion went well" appeared, but the log says he saw the doctor "because Selin asked".
- **Day 2 log:** the Today log still showed Day 1 events on Day 2.

**Concept count per screen:**

| Screen and purpose | New concepts | Count | Sentences reread | Reason |
|---|---|---|---|---|
| Title: intro | widower, Ramadan, fasting month, Eid, suggest vs decide, recording notice | 6 | none | — |
| Main day view: scene and Halil panel | scene log, panel tabs, hunger, thirst, tiredness, dawn prayer with the simplification note, fast end time, dread list, lira, debt to Osman, Speak, Skip | 12 | none | — |
| Plan something specific: compose a suggestion | his leaning, numbered actions, Mention / Urge / Insist, 6 reasons, Likely reply, Say nothing / Say it | 6 | none | — |
| His goals: goal tracking | estimates vs completed actions, goal quotes, Ramadan 15 deadline, who else he hears, listen levels | 5 | "These are estimates of what he would choose without your advice. They do not show completed actions:" | It contradicts "chose it" and "he saw the doctor". |
| Today: action log | timeline, Why this action?, put you off / said yes, memories, "suggestion fades" | 5 | none | — |
| Day summary | prayers kept, said / did tally, trust, chart legend | 4 | "see the doctor — chose something else" | It sits directly under "he saw the doctor". |
| Game menu and Feedback | the day waits, Feedback, Full screen, Recording, keep / stop choice | 5 | none | — |

Every screen introduced more than one new idea, which counts as a clarity finding.

## 6. English, dates, layout, hands-on
- **DL-20: PASS.** I could act in English. Cultural terms were explained where they appeared ("Eid, the festival at its end"; "The drummer passes by to wake people for the pre-dawn meal").
- **DL-21: PASS.** "Ramadan 15 (Monday 25 March)" and "Ramadan 1 · Monday 11 March" made the deadline easy to compare with today.
- **DL-22: PASS (one screen only).** On the phone (`current-phone.png`, 360x690) I saw "Halil is asleep.", "You can speak when he wakes." and "Let time pass" without scrolling. The screenshot shows 00:00, which is just before the tap took effect.
- **DL-30:** nothing was cut off in the screenshot I viewed. Any other screen at phone size is **NOT TESTED**.
- **DL-31:** at desktop size the goals and deadline stayed visible while the speak sheet was open. Phone size **NOT TESTED**.
- **DL-32:** the longest stretch of only watching was about 12:48→18:39 game time (roughly 25 real seconds). I wanted the afternoon shift and the Selin call.
- **DL-33:** speaking happens through a sheet or form, which fits a game where my voice is the action.

## 7. Where I stopped
- **Stopped at:** 310 s, Ramadan 2 at 08:00, reason FRUSTRATED.
- **First want_quit:** passed, once I found the Today log.
- **Second want_quit:** did not pass.
- **Return voluntarily?** Maybe, if I could slow or pause the day while I read.

## 8. Changes I'd want
1. Pause or slow the clock while I'm reading the log or have a sheet open. It should be fully paused, not "slows".
2. Show my words and his answer immediately in the scene, not only later in the Today log.
3. Make the goals estimate list agree with what happened, or label it clearly as a separate forecast.

**Evidence limits and cleanup:** screenshots are `current-phone.png` plus the driver's automatic `first-minute.png`, 2 in total. I made no repo changes and used no worktrees, so there is no `git worktree list` output to show. The browser is no longer needed; the coordinator owns the driver and its cleanup.
