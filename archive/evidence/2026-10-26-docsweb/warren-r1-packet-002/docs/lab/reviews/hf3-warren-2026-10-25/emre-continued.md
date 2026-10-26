I stopped at 15 minutes 15 seconds (BORED). I couldn't write the report file myself: this session has no file-writing tool, and every shell call had to be a single curl. The coordinator needs to save this response to `/Users/abdul/code/.lab-scratch/playtest-b/hf3-warren-r1/emre-continued/report.md`. The coordinator can now close the browser.

# Playtest report: Warren, Emre Kaya, continued arm

## 1. Session

- **Persona:** Emre Kaya, 37, electrical technician in Ankara. Likes strategy and football management games.
- **Exposure:** first visit to Warren, no earlier exposure. Pre-game diary was empty ("No sessions recorded"), so this is the first branch of his history.
- **Round / arm / paired session id:** hf3-warren-r1 / continued / hf3-warren-r1-emre-kaya.
- **URL:** https://warren.adamwhite.work, played through the local driver at http://127.0.0.1:19603/ (curl POST only).
- **Build:** not shown in the player UI. Title screen said "New rules for this new hill…" and I left that checkbox at its default.
- **Device:** 1280x800, keyboard and mouse. A requested phone check (360x690) ran at 300–315 s.
- **Time:** floor 15 min, ceiling 25 min. I played 914.8 s (about 15 min 15 s). Game clock ran from Dawn 19 Aug year 1 to Morning 8 Sep year 1.
- **Clock note:** the game clock ran during my driver waits. Speed was Slow at the start, Steady from 444 s, and Slow again from 614 s. Panels and menus pause the game; I lost about 60 s twice by waiting on a paused screen without noticing.
- **Player id:** none shown in the ordinary UI.
- **Feedback:** I opened it and looked, but submitted nothing. It offers "I would keep playing / I am not sure / I would stop here", a note box and a name box. There is no exact "I'm stopping" or "I'm confused" choice, so I pressed nothing. No export downloaded.
- **Screenshots kept (3):** `current.png` (wide view at 478 s), `current-phone.png` (phone check at 304 s) and the driver's own `first-minute.png`.

## 2. First minute

My note at 66 s (driver elapsed; the note was due at 60 s, so it was about 6 s late): *"Reason to act: riders burned villages, I must dig shelter - intro text and the prompt told me. Tappable: tools look/chalk/rub out/furnish/bell, speed, zoom, Journal, people button. Chalk tap on stone worked first try (choice ~5s after Begin, input at ~18s). Limits: tapping stone not touching open space -> Nobody can reach that stone yet; freed by digging nearer first. Each mark opens a reading panel that pauses time - a bit of busywork. Surprise: 12 seconds of waiting went Morning to Night. Prompt still says choose chalk even after the check mark, confusing."*

| Item | Result | Evidence |
|---|---|---|
| DL-1 A reason to act | PASS | "Riders had burned two villages to the south in spring" plus the prompt "Choose chalk, then drag across stone beside the cellar." |
| DL-2 What can I touch | PASS | Toolbar look / chalk / rub out / furnish ▾ / bell, speed buttons, zoom, Journal, the people count. The prompt says "drag", but a single tap worked. I didn't try any inert things in the first minute. |
| DL-3 Urgency and selection | PASS (partial) | The prompt at top right drew me first. "look" was pressed by default and chalk showed as pressed once I picked it. Nothing felt urgent yet. The prompt line kept saying "Choose chalk…" after the step was ticked, which competed with the tick. |
| DL-4 Why the limit | PASS | At 40 s and 44 s: "Nobody can reach that stone yet. Mark a path to it with chalk from open ground…" It said what blocks the mark and what frees it. (Later the screenshot showed those squares marked anyway, which confused me.) |
| DL-5 Readable situation | PASS | "The dig is marked. If dug, this space would have about three sleeping places." |
| DL-6 A choice soon | PASS | A choice was available at about 5 s (right after Begin, before any long text). My first input was chalk at 7.7 s, and the first mark on the hill was at 18.5 s. |
| DL-7 Learn by doing | PASS | Marking showed the sleeping-place count, and the refusal taught me adjacency. I used no help in the first minute. Choices reached: chalk ×4. Furnish, bell and door weren't reached in the first minute: **NOT TESTED (3)**. |

Visual checks: the screenshots let me check layout, but not animation or colour contrast. Those are NOT TESTED — not established by this harness.

## 3. Diary (verbatim, driver elapsed time)

- **4 s, title:** "Riders attack, dig a shelter - clear goal. The checkbox line about new hill rules I had to read twice: what is an existing hill? I leave it as it is and press Begin."
- **18 s, chalk tap at 520,440 (Morning 19 Aug):** "A tap was enough, no drag needed. Says three sleeping places. Riders come through entrance - dig deeper or shut doors. Six people, three places: I need more."
- **40–44 s:** two marks refused with "Nobody can reach that stone yet."
- **66 s:** first_minute note (quoted above).
- **75 s, village panel (Morning 20 Aug):** "a day passed, nobody is digging… I cannot order anyone. I am waiting, but for what? Two household names Maryam and Meryem, I mixed them up."
- **96 s:** "Meryem broke through the first chalked wall…" New prompt: "Mark open ground as a store for the jars." I marked a store at 104 s.
- **125 s, chalk 318,488 and 366,488 (Night 21 Aug):** "Now six sleeping places if dug - that is the number I wanted. Good, a visible count. Still the riders entrance warning; I do not yet know how to shut doors."
- **152 s:** "Clock went from Night 21 Aug to Morning 21 Aug - did time go back, or does night come before morning here? I could not tell. The journal repeats the same lines (Yusuf discussed the marks) again and again. Jars still empty."
- **178 s:** "People stop digging where daylight no longer reaches. A lamp beside a stone wall lets them dig there."
- **184 s, pulse 3:** "Finally a reason why digging stopped: no daylight, need a lamp. Good to have an explanation, but it came late, buried in a repeating journal."
- **194 s:** lamp hung. New problem straight away: "The water jars are dry. People need a well or water carried below."
- **204 s, Information panel:** "Help explains chalk, furnish, doors (up to three), sleeping circles. Nothing about a well. Water jars dry and I have no well tool - I do not know what to do about water."
- **214 s, beds at 414,440:** "Three circles filled at the top - satisfying, I can see progress… The shaft is one square wide with open above and below - maybe that is where a door goes."
- **224 s, door in the shaft (Dawn 23 Aug):** "Door marked in the shaft! My guess was right. This is the kind of planning I enjoy." At 250 s: "The stone door was ready in its groove. Tamar of the Wall rolled it once to test it."
- **273 s:** "Water icon turned red. Look tool on the surface oval did nothing. Where do I make a well? Maybe dig deep? Guessing."
- **314 s, requested layout check (not spontaneous):** "360x690, tapped The village. Panel covers the whole hill; the + zoom button is clipped at the top edge over the water prompt; village list needs scrolling. Readable but I lose the scene… riders reach 3 places by an open door - so the door is open? Who closes it?"
- **325 s, rang the bell:** "Oops - bell is a call to come below, no riders in sight. I rang a false alarm. No warning before it rang, no confirm."
- **351 s:** "No riders came. People climbed back above ground, blinking in the light. They looked at the bell, then at you."
- **357 s, pulse 3:** "They looked at the bell, then at you - I laughed, I can explain that setback. But water is still dry and I have no tool for it."
- **364 s, beds at 318,488:** "Six of six circles filled - space for everyone. Now the game tells me the bell makes an adult shut the door, and false alarms weaken trust. I wish I had read that BEFORE I rang it."
- **406 s:** "Water icon went back to half-full by itself… I did nothing. Relief, but I cannot explain it."
- **444 s, want_quit BORED:** "Two days of the same journal lines repeating… I am waiting, but for what? Switching to Steady speed because nothing is happening at Slow."
- **528 s, pulse 2:** "Same five journal lines over and over. Grain still not carried down."
- **536 s, village panel:** "everybody sleeps at home above ground, nobody uses the six beds I made. All six said I will do it to the bell, then chose a different task… FRUSTRATED."
- **572 s and 755 s:** "Closing the person card dropped me back into the village list, still paused." Later: "Back to the game put me in the menu, paused."
- **603 s (Midday 1 Sep):** "Smoke rises on the ridge. Riders may arrive in half a day or less." I chose "🔔 Ring the bell".
- **609 s:** "SMOKE! Finally real tension." At 639 s: "Yusuf: after I pray. Meryem: after I eat… I can only watch now."
- **672 s, pulse 3:** "Five people were asleep above ground - if riders had attacked they would have been caught. Clear, honest warning… I want to act and can only watch."
- **709 s, want_quit FRUSTRATED:** "everyone says after I eat, after I pray, after I sleep. I built everything; the only lever is a bell they ignore."
- **791 s:** "Three check marks at once… but I never saw these goals listed before, and before the frost - when is frost?"
- **828 s, pulse 2:** "The raid was the only exciting part."
- **914 s, stop BORED:** "Fifteen minutes. I built the shelter, the door, six beds, got three checks. Now it is the same journal lines every day and nothing for me to decide until the next raid, and even then people eat first. I would maybe leave it running and come back to see the next raid, but not sit and watch."

## 4. Highlights, want_quits and pulses

- **Best moment, 224–250 s:** I guessed the door goes in the one-wide shaft, and it was right; Tamar then rolled the door to test it. A close second was the smoke decision at 603 s.
- **Worst moment, 536–709 s:** I learned that nobody sleeps in my shelter, that the door stands open, and that every bell answer is "after I eat".
- **want_quit:**
  - 444 s, BORED (passed for a while when the smoke came).
  - 709 s, FRUSTRATED (came back as BORED at the stop).
- **Pulses:** 184 s = 3, 357 s = 3, 528 s = 2, 672 s = 3, 828 s = 2.
- **Hard, but kept going:** at 709 s I looked in the menu for a difficulty, help or assist option. There was only Feedback, New game, Recording and Resume. I stayed because the riders "may return with more riders" and I wanted to see whether my door would matter.

## 5. Clarity failures

- **Water (DL-4 / unexplained resource):** "The water jars are dry. People need a well or water carried below." There was no well tool and help said nothing about it. Water then refilled and dried again without my input. I could not tell what fixes it. I am not claiming the game has no rule.
- **Bell (DL-4):** the bell button has no warning text. I learned "False alarms can weaken trust" only after my false alarm, from a beds reading at 364 s.
- **Prompt went stale (DL-3):** "Choose chalk, then drag across stone beside the cellar" stayed on screen after the step was ticked. The prompt also says "drag", but a tap worked.
- **Clock:** Night 21 Aug was followed by Morning 21 Aug (152 s), and the same with 29 Aug. I could not tell whether time ran backwards.
- **Hidden goals (DL-21-ish):** "✓ Make sleeping space below ground for everyone before the frost." I never saw the goal list or a frost date before the ticks appeared.
- **Repeating journal:** about six lines repeated for whole days and buried the useful line about lamps.
- **Rejection that didn't stick (contradiction):** "Nobody can reach that stone yet" appeared, but the 108 s screenshot shows those squares marked.
- **Panels pause time silently:** twice, closing one layer left me in another paused layer.
- **Rosa-style rereads (sentences I read twice):**
  1. "Existing hills keep their rules." (title screen: what is an existing hill?)
  2. "Dig deeper, or shut doors on every open route." (which routes, and how do I shut them?)
  3. "door: Use a passage one square wide, open on two opposite sides."

**Concept table (screens inspected):**

| Screen and purpose | New concepts | Count | Sentences reread | Reason |
|---|---|---|---|---|
| Title / start | riders, shelter, hill rules checkbox (sleep and shelter outcomes, wild food, furnishing damage), recording notice | 6 | "Existing hills keep their rules." | "Existing hill" isn't defined |
| Main hill | chalk, dig adjacency, look, rub out, furnish, bell, speed (3), zoom, journal, people circles, jar icons, game clock | 13+ | "Dig deeper, or shut doors on every open route." | Doors not yet explained |
| Furnish menu | store, beds, lamp, door | 4 | "Use a passage one square wide, open on two opposite sides." | Abstract geometry |
| Information | dashed outline, fresh air and light, three-door limit, filled/empty circles | 4 | none observed | — |
| Village | households, below/above ground, reachability, tasks, next choice timer, bell replies | 6 | none observed | — |
| Person card | age, household, needs, current task | 4 | none observed | — |
| Bell call | call length in game hours, replies, refusal | 3 | none observed | — |
| Journal | dated entries, latest safety entry | 2 | none observed | — |
| Menu / Feedback | feedback, new game, recording, three verdict choices, note, name, share | 7 | none observed | — |

Every screen I inspected introduced more than one new idea, which counts as a clarity finding each time.

## 6. English, dates, layout and hands-on

- **DL-20:** PASS. All the needed English was plain. The one local term was "Tamar of the Wall", which isn't needed to play.
- **DL-21:** partial. The clock reads "19 Aug · year 1" and the smoke warning said "half a day or less", which was clear. "Before the frost" had no date I could see (FAIL for that goal). The Night-before-Morning ordering confused me.
- **DL-22:** the phone check at 304 s shows the immediate prompt ("The water jars are dry…") visible without scrolling. But the village panel covers the whole hill and its list needs scrolling (`current-phone.png`).
- **DL-30:** on the phone, the "+" zoom button is clipped at the top edge and overlaps the prompt area. The village sheet covers the scene. I saw no sentence cut off mid-way on desktop.
- **DL-31:** NOT TESTED. There was no order or answer sheet. With the village panel open on desktop, the goal prompt and clock stayed visible.
- **DL-32:** longest stretch of only watching was 609–914 s (about 5 minutes) during and after the raid. I wanted to send people below and shut the door.
- **DL-33:** digging and furnishing were done on the hill itself: tap the stone, tap the floor. Getting people to shelter was only possible through the bell, never on the people themselves.

## 7. Stop

- **Where:** stopped at 914.8 s, game clock Morning 8 Sep year 1, reason **BORED**.
- **First want_quit (444 s, BORED):** passed for about 4 minutes once the smoke came, then came back.
- **Return:** I might leave it running or come back to see the next raid. I wouldn't come back to sit and watch.

## 8. What I'd want changed, as this player (ranked)

1. Some way to get people to actually use the shelter, or a clear reason why they don't. The bell answers "I will do it", then they choose a different task.
2. Explain water: what a well is and how to get one, or why the water refills.
3. Show the goal list and the frost date at the start, and put the bell's trust warning on the bell button itself.

**Evidence limits:** no /api telemetry and no player id. Feedback was not submitted. The driver checks were text plus 3 screenshots. The 5-minute phone check was requested by protocol, not spontaneous. The first-minute note was 6 s late. No git worktrees or repos were touched, so there is nothing to clean up there.
