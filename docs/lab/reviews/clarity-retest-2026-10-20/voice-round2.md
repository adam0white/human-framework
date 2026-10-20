# The Day You Say Nothing — source-unread playtest

Amara, 29, nurse on night shifts. I enjoy Kentucky Route Zero and Disco Elysium for their characters. I dislike spreadsheets. This is a short phone break between rounds, often one-handed.

- URL: local preview of d8178b7 at http://localhost/voice/
- Build: no build identifier seen. The assignment described a local release candidate.
- Access: headless Chromium through Playwright, with one page kept open by a long-lived Node HTTP server. Screenshots and coordinate taps were the basis of play. No game source, hidden state, network payloads, storage or debug APIs were inspected.
- Phone: 360×690 CSS px, touch emulation, light mode, device scale 1. Scrolls used ordinary mouse-wheel input over the sheet, so this does not establish actual one-thumb swipe comfort.
- First actionable screen: 2026-10-20 08:58:59.426 UTC. First screenshot: +0.127 s.
- First-minute checkpoint: +63.075 s, three seconds late while correcting the scroll input.
- Natural stop: 09:03:18.722 UTC, +259.296 s (4:19.3). The eight-minute ceiling did not end play.
- Post-session desktop look: 1280×800, same page reloaded to its opening screen. No second playthrough.
- Only the two authorized instruction documents were read. Screenshot and wall-clock outputs were written to `voice2-shots/`. The timestamp log is `voice2-shots/wall-clock.jsonl`.

## First minute

These are the answers recorded at +63.075 s, before continuing. Later discoveries do not change this checkpoint. The live note used “PARTIAL PASS” for DL-7; the table uses the required PASS status only for the interaction actually reached, with its unmet parts explicitly untested. DL-6's PASS covers observed choice timing; the mandatory-story word target was not established.

| Item | Status | Original checkpoint answer |
|---|---|---|
| DL-1 A reason to act | PASS | I want Halil to eat before the fast and attend to his daughter’s concern about a doctor. |
| DL-2 What can I touch | PASS | Begin, Say something, action tiles, Mention/Urge/Insist, reasons, Close and tabs look tappable; no inert item tried. |
| DL-3 Urgency and selection | PASS | gold Say something drew me first; eat at home has a gold selected outline and HIS LEANING; fast begins at 04:59 is the time cue. |
| DL-4 Why the limit | NOT TESTED | no unavailable action met. |
| DL-5 Readable situation | PASS | he is waking and I can suggest eat at home, sleep, drink water, rest, wait or pray. |
| DL-6 A choice soon | PASS, timing only | availability by 20.620 seconds; first navigation input 9.008 seconds; no suggestion submitted yet. I cannot establish the about-40-word target from what I read. |
| DL-7 Learn by doing | PASS, reached interaction only | for one suggestion interaction opened: I understand action, force and reason; I have not submitted a suggestion or seen its consequence, so those are NOT TESTED (zero submissions). |

Evidence: `01-first-screen.png`, `03-after-begin.png`, `04-say-something.png`, `06-sheet-lower.png`. The actual first meaningful choice input came later: choosing “your health” at +100.536 s. The first submitted suggestion was +103.481 s. Begin and opening the suggestion sheet were navigation, not a substantive choice.

## Verbatim diary

The following reactions retain the wording recorded during play. Times are real elapsed time, not game time. Inputs and visible answers between quotes are factual annotations. The raw log also retains the full original checkpoint note.

**+8.914 s**

> I like that Halil gets the final say. I want to meet him, but I do not yet know what his own ends are. Begin and More about Halil look tappable; Model notes and Playtest notebook look like side material.

+9.008: tapped Begin. The immediate screenshot still showed the opening; by +13.433 the day screen was visible. Ramadan 1, Monday 11 March, 03:58. Selin's note said “see the doctor.”

**+20.521 s**

> His daughter wants him to see the doctor. That feels like a real reason to get involved. The page says he is waking; Say something is the obvious next tap. I think the triangle starts time, and Slow is the speed.

+20.620: tapped Say something. Six action tiles, intensity buttons and reasons appeared. “eat at home” was outlined in gold, with “HIS LEANING.” The prefill explanation said the fast begins at 04:59 and that he has not cooked since Nuran died.

**+30.026 s**

> Eat at home is already selected. Bread and cheese before the fast makes sense. Mention, Urge and Insist feel like how hard I push him, and I like the likely reply. I cannot see a send button on this screen.

+30.100: attempted scroll. The screen did not move. This was a tooling limitation: the mouse-wheel position was over the fixed header, not the scrollable sheet. It is not evidence that the game cannot scroll.

**+63.075 s — checkpoint, original complete note**

> First minute — checkpoint recorded late because I was working out the scroll input. DL-1 PASS: I want Halil to eat before the fast and attend to his daughter’s concern about a doctor. DL-2 PASS: Begin, Say something, action tiles, Mention/Urge/Insist, reasons, Close and tabs look tappable; no inert item tried. DL-3 PASS: gold Say something drew me first; eat at home has a gold selected outline and HIS LEANING; fast begins at 04:59 is the time cue. DL-4 NOT TESTED: no unavailable action met. DL-5 PASS: he is waking and I can suggest eat at home, sleep, drink water, rest, wait or pray. DL-6 PASS for availability by 20.620 seconds; first navigation input 9.008 seconds; no suggestion submitted yet. I cannot establish the about-40-word target from what I read. DL-7 PARTIAL PASS for one suggestion interaction opened: I understand action, force and reason; I have not submitted a suggestion or seen its consequence, so those are NOT TESTED (zero submissions).

Before +90.967: corrected the automation mouse position on the same page. This used the debugger for the tester's own Node driver, not the game. No page internals were inspected. The correction was logged: “Tooling correction: move the mouse over the sheet before scrolling. Earlier wheel inputs were over the fixed header; they do not establish a game scrolling failure.”

+90.967: scrolled the sheet. +93.413: the lower screen showed “Likely: ‘Alright, I’ll do it.’”, Say nothing, and the Say it button. `08-suggestion-bottom.png`.

**+100.406 s**

> There is the button after a scroll. He has not cooked since Nuran died; that is the first detail that makes him a person to me. I will gently mention eating, for his health.

+100.536: tapped your health. The prediction changed to “Pick something to hear how he’d answer.” The button still named eating and health. +103.481: tapped the eating suggestion. At +106.116 the log showed “I eat at home, because you asked.” and “Fine.” The clock had advanced to 04:19. `09-health-reason.png`, `11-eating-reply.png`.

**+113.124 s**

> He says Fine, and the log says he eats because I asked. That is a little sadder than the cheerful prediction. The clock is moving now; I did not need to press Play. I want to know why he answered that way.

+113.251: tapped in the reply/Why area. The next immediate image still showed the log, then +123.052 showed Why. The intervening screen showed “Asleep until about 08:00” and “You can speak when he is awake and choosing.” The Why screen showed 07:59, “Clock paused,” and “iftar with Nuran at our table, last Ramadan.”

**+132.552 s**

> Iftar with Nuran at our table, last Ramadan — that catches me. I wanted more of that. His pulls, put into words is useful, but the long list makes this feel more like managing a patient than getting to know him. Why opened after the earlier screenshot; the sheet now says Clock paused.

+132.647: closed Why. +140.381: opened Say something. Time remained 07:59 with the play triangle. Morning choices included repair in the workshop, rest, sleep, wait, talk with Hacer and pray.

**+149.194 s**

> I do not see the doctor among these choices. Talking with Hacer sounds more like the game I wanted than sending him to work, so I will try that. The workshop has a dashed border, but I do not know whether that means unavailable or simply his leaning.

+149.296: chose talk with Hacer at the door. +149.399: scrolled. At +151.562 the prediction said “Not now — after I repair in the workshop” and “Not now. After I repair in the workshop.”

**+159.727 s**

> Not now — after I repair in the workshop. Fair enough; he has his own plans. I will leave the invitation with him rather than insist. The action button is half under the bottom tabs again.

+159.878: scrolled farther. +167.696: submitted Mention · talk with Hacer at the door. +169.828: “Your words” showed the request, an after-workshop answer and “Still on his mind until 10:59.” The immediate status said repair until 10:00. Time was 08:00, paused.

**+180.595 s**

> After I repair in the workshop, then I will. I can tell the invitation is still on his mind until 10:59. But Reading his answer · 03:59. Clock paused is still above this much later answer. I need to start time again.

+180.717: tapped Play. +180.897: opened Halil. At 08:48 it showed repair in the workshop, hunger and thirst bars labelled fine, and partially visible tiredness below. The invitation card occupied the lower part of the screen. `25-halil.png`.

**+188.042 s**

> Hunger and thirst bars. I can read fine beside them, but this is becoming a care dashboard. The invitation card covers the lower part of his feelings. I would rather hear what is bothering him.

+188.147: opened Ends & voices. At 10:40 the visible ends included keeping the fast and paying Osman, the landlord. “CHOICES WITHOUT YOUR VOICE (NOT COMPLETED ACTS)” had eat at suhoor checked and see the doctor crossed. Money owed was 600; Osman wanted 300 by Ramadan 15 (Monday 25 March); Halil had 56.

**+198.148 s**

> Now I finally see his ends: keep the fast, pay his landlord, and choices without my voice. See the doctor has a red cross; I cannot tell whether he refused it or I missed it. The landlord wants 300 by Ramadan 15, Monday 25 March; today is Monday 11 March, so that is fourteen days away. I still want to see whether he talks to Hacer.

+198.302: returned to Day. +198.411: tapped the old location of Latest, which now hit the older log area instead. The screen showed 12:45 and “Reading his answer · 03:59. Clock paused.” +204.812: tapped the visibly located Latest button. At +207.920 the log showed an afternoon-shift problem: mornings earn about 280 by Ramadan 15 while Osman wants 300. I did not change the speed control; it remained Slow.

**+217.335 s**

> Latest takes me to a new problem: mornings earn about 280 but Osman wants 300, so there is an afternoon shift. I understand that pressure. I lost the thread of Hacer while looking at his ends, and the day is already at 12:45.

+217.537: scrolled up the log. At +220.224 the visible entries said “I talk with Hacer at the door, because you asked.” at 10:00 until 10:40, “Talk hacer? ‘Fine.’” and “He wants a cigarette.” `32-earlier-events.png`.

**+234.532 s**

> He did talk to Hacer at 10:00. Talk hacer? Fine. is all the exchange I can see. I wanted to hear two people talking; instead I have found a record that a task happened. This is where I start losing interest.

+234.682: opened the afternoon suggestion sheet. It showed pray at home as his leaning and an explanation prefilling an afternoon shift because of the 280/300 shortfall. I did not choose the shift.

**+259.296 s — natural stop**

> I am stopping here. I do not want to turn a short break into choosing his food, work and rest from lists. The memory of Nuran made me want a story, but I am not getting enough conversation to stay. I would not return voluntarily right now. The clock is paused at 12:45 on Ramadan 1, with the afternoon suggestion sheet open; I have not chosen the shift.

Final mobile screenshot: `34-mobile-stop.png`, +259.392 s.

## Best, worst and leaving

Best: “iftar with Nuran at our table, last Ramadan.” That gave the food choice emotional weight. The earlier note that he had not cooked since she died also mattered. I liked being able to mention rather than command. The delayed Hacer answer had a clear reason and did resolve.

Worst: finding that the social action produced “Talk hacer? ‘Fine.’” rather than a conversation I wanted to read. I began losing interest at +234.532 s and stopped at +259.296 s. This is a taste response from this persona, not proof that the game lacks other conversations. I did not reach the end of a day, Eid, or the end of the game.

## Clarity findings

| ID | Status | What I saw and what I could not tell |
|---|---|---|
| DL-22 Phone response visibility | FAIL | The initial suggestion sheet clipped the likely reply and hid both Say it and Say nothing below the visible area. I had to scroll to submit. A later Hacer button was partly below the tabs before another scroll. Initial failure exists independently of the wheel-position error. Screenshots 04, 06, 08, 19, 21. |
| DL-13 Input feedback | FAIL, narrow observation | After I chose “your health,” the prior likely answer became “Pick something to hear how he’d answer,” even though the action and reason were represented in the Say it button. I could not tell what else it wanted me to pick. Submission worked. The predicted “Alright, I’ll do it” and received “Fine” were different, but “Likely” is uncertain; that difference alone is not a failure. Screenshots 08, 09, 11. |
| DL-5 Readable situation | FAIL later; first minute remained PASS | “Reading his answer · 03:59” remained visible while I dealt with a 07:59 suggestion and an 08:00 workshop task. I could not tell whether this reading status belonged to the current answer. The separate task and invitation cards were understandable. Screenshots 15, 23. |
| DL-19 Cues mean what they seem | FAIL, limited | Under “CHOICES WITHOUT YOUR VOICE (NOT COMPLETED ACTS),” the red cross beside “see the doctor” did not tell me whether it meant a refusal, a missed opportunity or something else. I do not claim the doctor has no rule or no response. I never found its action in the two periods I checked. Screenshot 26. |
| DL-17 Feelings drawn or said | FAIL, visible bars | Halil's “HOW HE FEELS” panel used hunger and thirst bars, with tiredness partly visible below, alongside words such as “fine.” This also made the experience feel like a care dashboard to this player. I did not inspect the hidden lower part of that panel. Screenshot 25. |
| DL-4 Limits, after checkpoint | PASS for encountered limits | Sleep displayed “Asleep until about 08:00” and told me I could speak when awake and choosing. The Hacer response explained “after I repair in the workshop.” These explain both the constraint and its change. Screenshots 12, 19, 23. No arbitrary quota encountered or investigated. |
| DL-15 Time | NOT TESTED in full | I found the play control and Slow label. I never changed speed or tested a fast-speed live choice. Opening Why coincided with “Clock paused”; it stayed paused after closing until I used Play. I cannot establish from this sequence whether Why itself caused the pause. On Slow, the clock advanced from 08:00 to 10:40 while I started it and looked at two tabs over about seven real seconds. Screenshots 23–26. |
| DL-14 Known consequences | PASS for limited encounter | The Hacer prediction told me he would delay until after work, before I committed. No claim about all costs or later actions. Screenshot 19. |
| DL-16 Tasks have responses | NOT TESTED for doctor | I saw Selin's concern and later a crossed doctor item, but did not discover how to pursue it. This is a gap in my play, not evidence of an absent response. |

No hit areas were measured. No 200% text, 320 px width, dark mode, save/resume, end-of-session, game-menu or replay checks were performed. DL-12, DL-23–29 and builder-only checks remain NOT TESTED. No telemetry was sent, no consent setting changed, and no export downloaded.

## English, dates and desktop

**DL-20 — PASS for the actions reached.** Action tiles, reasons, reply predictions, money requirement and timing cues were understandable in English. “Suhoor” appeared with waking, food and the stated fast start, so I could act without translating it. “Iftar” occurred in a personal memory, not a required control. I did not use on-request definitions, so that part is NOT TESTED.

**DL-21 — PASS on first encounter; return-from-break NOT TESTED.** “Monday 11 March” and “Ramadan 15 (Monday 25 March)” let me compare the deadline as fourteen days away. The stated 04:59 fast start and 18:46 fast end were readable clock times. I did not encounter a cross-month or cross-year deadline.

**DL-22 — FAIL on phone**, as documented above. I could read the immediate situation on Day, but not the full suggestion and submission controls without scrolling.

Desktop opening look only: `37-desktop-opening-ready.png`. At 1280×800, the title, purpose, Begin and More about Halil fit in a centered panel with ample space. Playtest notebook sat across the bottom. A brief “Waking the town…” loading state was captured in screenshot 36 before the ready screen. I did not press Begin or assess desktop gameplay. The desktop opening does not retest the phone sheet failure.

## Up to three changes I would want

1. Let me reach the phone's full immediate reply and Say it/Say nothing controls without scrolling past the setup.
2. Give the Hacer meeting enough of an actual exchange that I want to hear what happens next.
3. Make “see the doctor” explain its current state when I encounter the cross, so I know whether there is still something I can do.

I left mid-day with the afternoon sheet open. I would not voluntarily return in its current form based on this short session. The quieter memories were the reason I stayed as long as I did.
