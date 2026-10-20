# The Day You Say Nothing — Nadia playtest

Nadia, 41, hospice nurse. I play Kentucky Route Zero, Florence and visual novels. I want quiet company and conversation, not paperwork. Evening on the sofa, phone in one hand.

URL: https://human.adamwhite.work/voice/. No build identifier noticed. Access: actual Chromium through Playwright in one persistent local Node process and one page. Phone: 360×690 CSS px, touch emulation, light mode, default text size. No game source, bundles, network payloads or internal state inspected. No run sent, telemetry submitted through a control, or consent changed. No export downloaded.

All diary times are real seconds from page load. The game clock is quoted separately. The eight-minute ceiling was not reached. I decided to leave after the call at +257.1 s (4:17.1); the stop entry and phone capture were made at +280.0 s while an unsuccessful browser command was still waiting. My last successful gameplay input was the call suggestion at +225.3 s. One desktop look followed at +289.9 s, with no further gameplay. The browser controller was then stopped by exact PID.

The initial image showed “Waking the town…”; Begin was confirmed by +4.79 s. The checkpoint below preserves its original wording. It used confirmed Begin availability as its actionable-screen reference. The opening also displayed “More about Halil and this month”; counting that opening as actionable makes the checkpoint +70.0 s, ten seconds late. I took no gameplay inputs between +55.1 s and the completed checkpoint. Browser command/observation time contributed to the delay. Availability within 30 seconds remains unestablished rather than an observed game failure.

## First minute

Written before continuing play. Checkpoint: +70.0 s from page load, +65.2 s from the first confirmed actionable screen (Begin at +4.79 s). The initial screenshot showed “Waking the town…”. Browser observation and command delays made this checkpoint about five seconds late. Times below use page load as the diary origin.

| Item | Status | Original checkpoint answer |
|---|---|---|
| DL-1 A reason to act | PASS | I want to help Halil manage his own life without needing my voice. The opening said “Help Halil toward his own ends, so that on Eid he does them without you.” Right now Selin thinks he should see the doctor. |
| DL-2 What can I touch | PASS | Begin, the outlined spoken lines, Speak, the time controls, Game menu, and the three bottom tabs look tappable. I tried Speak at about +22 s, but the browser command timed out as the scene changed. I cannot call that an inert control. I successfully chose a spoken line at +55.1 s. |
| DL-3 Urgency and selection | PASS | Halil and Mrs Aydın and their conversation draw me first. Day has the orange underline. The clock moves, then says “Reading slowly.” “Selin said last night: see the doctor” gives me something to respond to; I do not know a deadline. |
| DL-4 Why the limit | PASS | I met “He is occupied. Suggestions wait until he is choosing.” That explains why I cannot direct him just then and when that should change. I could still offer quiet. |
| DL-5 Readable situation | PASS | He is working with Mrs Aydın nearby. I said I could be quiet. I now see “He keeps working; he heard you.” I can suggest seeing the doctor or talking with Hacer, say nothing, or say something else. |
| DL-6 A choice soon | NOT TESTED | First meaningful choices were first observed at +36.5 s (+31.7 s after confirmed Begin availability); my first successful meaningful input was +55.1 s (+50.3 s). Begin was tapped at +8.2 s. A pending Speak command occupied part of that interval, so I cannot establish whether the dialogue choices appeared within 30 s. I had read the opening and four short dialogue lines before choosing. |
| DL-7 Learn by doing | PASS | I reached one spoken choice: “Take your time. I can be quiet while you work.” The options disappeared immediately. A later visible entry repeated my words and said he heard me and kept working. That teaches me that speaking does not take control of him. No help used. Other interaction types: NOT TESTED at this checkpoint. |

Checkpoint screenshot: `(driver scratch)/retest/voice-shots/06-first-minute.png`.

## Verbatim diary

These are the original entries from `wall-clock.jsonl`, in order. Logging time can follow the input or observation named in an entry. Text under “Visible” is a contemporaneous transcription or summary, not a claim that every line fit in the screenshot.

### +4.790 s — 2026-10-20T14:13:13.327Z

**Input:** Opened live page at 360x690

**Visible:** The Day You Say Nothing. Help Halil toward his own ends, so that on Eid he does them without you. Suggest an action; Halil decides. Begin.

**Reaction:** I like the idea of helping someone need me less. I want to meet Halil. Begin looks like my way in.

### +13.835 s — 2026-10-20T14:13:22.372Z

**Input:** Tapped Begin at +8.2s

**Visible:** Halil is asleep. You can speak when he wakes. skipping: he sleeps until 03:59

**Reaction:** He is asleep, so I will wait. Selin calling this evening is the first thing I want to hear about. The first screenshot had a waking message where Begin now is; I did not act until Begin appeared.

### +51.736 s — 2026-10-20T14:14:00.273Z

**Input:** Tried Speak at about +22s; page changed while the browser command waited

**Visible:** The workshop · 08:00. Halil and Mrs Aydın. Two spoken lines available. He is occupied. Suggestions wait until he is choosing.

**Reaction:** I like Mrs Aydın asking to watch. I can offer quiet without abandoning him. I am not sure my Speak tap happened; the conversation arrived while the command was still waiting.

### +62.460 s — 2026-10-20T14:14:10.997Z

**Input:** Chose Take your time. I can be quiet while you work. at +55.1s

**Visible:** The two answers disappeared; Speak and Listening. Silence needs no tap. appeared. The conversation text did not yet include my line.

**Reaction:** That was the kind of thing I wanted to say. The choices went away, so I think he heard me, but I would like to see his answer.

### +94.895 s — 2026-10-20T14:14:43.432Z

**Input:** First minute checkpoint; no gameplay input

**Visible:** Checkpoint observed at +70.0s, +65.2s after first confirmed actionable Begin; written to report before continuing

**Reaction:** I can say a sentence to him and see that he heard it. That feels promising. I do not know what is wrong enough to need the doctor yet.

### +103.667 s — 2026-10-20T14:14:52.204Z

**Input:** Tapped Go and see the doctor. at +99.4s

**Visible:** Choices disappeared; previous Your words entry remains; Speak and Listening. Silence needs no tap.

**Reaction:** I am taking Selin seriously. I hope this is a suggestion he can refuse. I do not know why she is worried, and I would normally ask him first.

### +112.538 s — 2026-10-20T14:15:01.075Z

**Input:** Tapped Speak at +107.6s

**Visible:** A memory of Nuran · 10:30. He remembers Nuran. the clinic, the day they found her illness. Halil: See the doctor? Fine.

**Reaction:** Oh. There is a history behind the clinic. That makes his hesitation feel like something real. I want to ask about Nuran, rather than tell him where to go again.

### +127.516 s — 2026-10-20T14:15:16.053Z

**Input:** Say something else… at +115.1s, then How do you feel about seeing the doctor? at +121.2s

**Visible:** Say something else added two complete spoken lines and Plan something specific…; selecting the question closed the choices.

**Reaction:** Yes, this is what I wanted: I can ask how he feels. More lines appeared right here. I did not have to fill out a form to ask.

### +137.349 s — 2026-10-20T14:15:25.886Z

**Input:** Tapped Halil at +132.3s

**Visible:** rest at home because the doctor asked until 12:00; grieving (remembering Nuran); doctor said pressure is high; Osman: 300 by Ramadan 15; Monday 11 March / Ramadan 1 in header

**Reaction:** Now I understand why he needs rest and why the clinic matters. He is grieving. This page tells me more about him, though it feels more like reading a chart than sitting beside him.

### +159.147 s — 2026-10-20T14:15:47.684Z

**Input:** Returned to Day +142.7s; Say something else… +149.4s; That was a lot to hear. +152.0s

**Visible:** The clinic · 11:30. The doctor: the pressure is high and to rest, walk and stop smoking. Halil: There is a lot to take in.

**Reaction:** I can acknowledge the news instead of giving him another instruction. I like that. I would rather stay with this moment than arrange his whole day.

### +165.678 s — 2026-10-20T14:15:54.215Z

**Input:** No input; letting him go to the mosque at +159.1s

**Visible:** Halil is pray at the mosque. Selin usually calls this evening. Speak. Listening. Silence needs no tap.

**Reaction:** The clinic moment has already gone. I did not catch a reply to That was a lot to hear. I will leave him quiet for a little while.

### +195.300 s — 2026-10-20T14:16:23.837Z

**Input:** Say nothing +169.6s; watched without input until +190.2s at default speed

**Visible:** 12:51 advanced to 18:34. Halil is rest at home. Selin usually calls this evening. Speak stayed available.

**Reaction:** I chose to give him space. Now I am waiting for Selin. This is a quiet screen rather than a room I can inhabit; I am watching the clock more than him.

### +208.700 s — 2026-10-20T14:16:37.237Z

**Input:** Speak +198.2s; Say something else… +200.5s; You can miss her. You do not have to find more words. +203.0s

**Visible:** Halil: I miss you, Nuran. The extra choices included a full line about missing her. After my input an older reply appeared: It was. I am still thinking about what the doctor said.

**Reaction:** This is the moment I came for. I do not need to make grief productive. I can just tell him he is allowed to miss her. The reply on screen is to my earlier clinic sentence, though, so I am waiting to see what he says now.

### +222.020 s — 2026-10-20T14:16:50.557Z

**Input:** Observed +208.7s and +212.3s without gameplay input

**Visible:** At +208.7: I miss sitting across from her. That is what keeps coming back. At +212.3 that reply was absent and cigarette choices remained. Screenshot 10-grief-reply.png shows the later smoking screen, not the reply.

**Reaction:** I caught his answer, and it is lovely. But it is already gone. I wanted to sit with that sentence; now I am being offered ways to manage his cigarette.

### +230.745 s — 2026-10-20T14:16:59.283Z

**Input:** Tapped Give Selin a call. +225.3s

**Visible:** By the river, Halil greets Mrs Aydın. On choosing the call, my previous Nuran line and his reply reappeared.

**Reaction:** He went for a walk without me telling him; I like that he has his own life. I want him to talk with Selin now. His Nuran reply is back after I chose the call, so it was not lost permanently, but I did not know how to bring it back on purpose.

### +257.053 s — 2026-10-20T14:17:25.590Z

**Input:** Waited without input from +230.7s to +248.3s

**Visible:** On the phone · 20:40. Halil: I keep thinking about that meal because I miss having your mum across the table. I did not want to say that to an empty room. Selin: I miss her too, Dad. I can keep you company on the phone for a little.

**Reaction:** There she is. This feels like the reason to play: he can finally tell his daughter what the empty chair means. I would happily stop after leaving them together.

### +280.049 s — 2026-10-20T14:17:48.586Z

**Input:** STOP: no more gameplay inputs; attempted Stay on the phone with Selin after +257.1s, but it was no longer on screen

**Visible:** At +257.1s Halil was resting at home and Selin usually leaves a day or two between calls.

**Reaction:** I am done for tonight after their call. I wanted to leave them together, but that moment had already moved on before my next tap. I would come back for another evening with him, not to manage every errand.

### +297.578 s — 2026-10-20T14:18:06.115Z

**Input:** Post-stop desktop look only at +289.9s; no gameplay resumed

**Visible:** 1280x800: full day-end sheet and Go to Ramadan 2 visible. Phone stop capture at +280.0s showed day-end sheet. Stay on the phone with Selin attempt timed out after 30s without a successful input.

**Reaction:** The day is clearly over, and I can see what happened. You spoke twice jars with me because I also asked and comforted him several times. Perhaps this count means instructions, but it says spoke.

## Best, worst, and the urge to leave

**Best:** The phone call at +248.3 s. Halil said, “I did not want to say that to an empty room.” Selin answered, “I miss her too, Dad. I can keep you company on the phone for a little.” I had wanted to meet her since the opening. This made the wait worthwhile. `11-waiting.png` shows the conversation and the responses together.

**Worst:** Losing the chance to stay in that call while I recorded what I had read. At +248.3 s the screen offered “Stay on the phone with Selin.” At +257.1 s the call was over and he was resting. My subsequent attempt to tap that line timed out; it was not a successful input. Recording and browser delays matter here. I cannot claim a tap on an available control was refused.

I felt mild impatience at +190.2 s: “I am watching the clock more than him.” That followed a deliberately chosen quiet stretch, not a forced wait. I did not become bored enough to quit then. After the call I felt satisfied enough to stop. I also wanted the grief reply to remain readable longer.

## Clarity failures

- **DL-10 — “spoke” changes meaning in the day report.** The day-end sheet says, “You spoke twice. In the end he said yes to all of them.” I successfully selected six spoken lines: offering quiet, suggesting the doctor, asking his feelings, acknowledging the clinic news, acknowledging grief, and suggesting a call. The sheet lists the two instructions under “Done on your word.” Perhaps the count means instructions; the visible wording says all speech. This made my listening and comforting feel uncounted. `12-stop-phone.png`, `13-desktop-after-stop.png`, diary inputs +55.1, +99.4, +121.2, +152.0, +203.0 and +225.3 s.
- **DL-13 — I could not keep a reply in view.** At +208.7 s I read, “I miss sitting across from her. That is what keeps coming back.” At +212.3 s it was absent from the main screen and cigarette choices were there. It reappeared after my call suggestion at +225.3 s, so it was not permanently lost. I did not discover a deliberate way to retrieve that specific reply. `10-grief-reply.png` shows the later smoking screen despite its filename; the reply itself is in the +208.7/+222.0 diary observations. This is a continuity problem I experienced, not proof that the game lacks history.
- **DL-15 — “Reading slowly” did not preserve the phone choice for my reading/recording pace.** The call and “Stay on the phone with Selin” were visible at +248.3 s; by +257.1 s he was resting. The screenshot says “Reading slowly.” I was still recording and deciding to leave them together. The full fast-speed-to-choice test was NOT TESTED; I never changed speed. These observations establish the disappearing opportunity at the default setting, with tool delay as a limitation. `11-waiting.png` and the +257.1 diary observation.

The first Speak attempt also timed out as the screen changed. This is an access limitation, not evidence that Speak was inert. DL-6 remains NOT TESTED for its 30-second threshold. I did not inspect unreached controls to fill gaps.

## English, dates, phone layout, and hands on

| Item | Status | What I actually met |
|---|---|---|
| DL-20 English | PASS | I could choose all reached actions and understand their replies in English. Ramadan and Eid occur in the framing; “iftar” occurred in a memory about a meal and did not block an action. Prayer names appeared in status, but I was not required to decode one to operate a control. Unreached terminology is NOT TESTED. |
| DL-21 Dates | PASS | Today was Ramadan 1, Monday 11 March. The afternoon prompt said “Ramadan 15 (Monday 25 March)” for both expected earnings and Osman's demand. I could compare it as fourteen days away without translating a calendar. The Halil tab also showed “Ramadan 15, 20:00.” A return after a break and a cross-month/year deadline were NOT TESTED. |
| DL-22 Phone response | PASS | In reached speaking scenes, the immediate lines and essential conversation were on screen without scrolling: workshop, Nuran, doctor and Selin. The call screenshot shows the person, dialogue, and “Stay on the phone” together. I never scrolled during play. The longer Halil information page and day-end sheet extend below the viewport; reaching their lower controls by scrolling was NOT TESTED. |
| DL-30 Cut-off text | PASS for reached conversation layouts | I saw no mid-sentence clipping or overlapping controls in the reached conversations. “Earlier in this conversation” was a labelled control, not a clipped sentence. The long Halil page extends below the viewport. The post-stop phone day-end sheet also extends below it; its lower content and scrolling were NOT TESTED. This is not a claim that every sheet passes. |
| DL-31 State while a sheet is open | NOT TESTED | I did not open an order/answer form or “Plan something specific…”. The in-scene speech choices preserved the person and clock, but this does not establish goal progress and deadline visibility in an order sheet. |
| DL-32 Something for my hands | PASS for observed play | I found spoken responses when I wanted them. No observed game-enforced stretch of at least 20 seconds where I wanted to act and could only watch. I voluntarily watched about 20.6 s after “Say nothing” (+169.6 to +190.2), and about 17.6 s while waiting for the call (+230.7 to +248.3). Browser-command waits are not evidence of missing game actions. I did not measure all possible gaps. |
| DL-33 Acts in the scene | PASS | I spoke a complete line with one tap. “Say something else…” expanded more full lines in the scene; asking how he felt required no strength/reason/confirmation form. “Plan something specific…” remained optional and unopened. |

Other observations: **DL-12 PASS** for the post-stop day boundary: “Ramadan 1 (Monday 11 March) is over” and “Next: Ramadan 2 (Tuesday 12 March)” made the transition clear. **DL-17 PASS** for reached feelings: “a bit tired,” “grieving (remembering Nuran),” and “dreads it” used words, not a mood percentage. I made no builder checks, replay checks, reload/resume checks, send checks, target-size measurements, theme comparisons or enlarged-text checks; all are NOT TESTED.

## Stop and return

I stopped after the call, with no intention to start Ramadan 2. My decision was at +257.1 s; the explicit stop record and phone screenshot were at +280.0 s. The day-end sheet appeared while the pending failed tap was finishing. I did not resume play to reach it. This was a natural stop before the eight-minute ceiling.

I would return voluntarily for another evening with Halil. I liked being able to ask and comfort him. I would not return just to direct every task.

The single post-stop 1280×800 look showed the full day-end sheet, including both columns and “Go to Ramadan 2.” It was readable in that one view. This was a look at the ending only, not a desktop playtest.

## Changes I would want, ranked

1. Let me keep Halil's personal reply visible until I am ready to leave it. I wanted to sit with the line about the empty chair.
2. Give me enough time to read the call and choose to stay with Selin. The time needed to read matters more to me than moving through the day.
3. Make the ending's speech count describe what it counts. I also spoke when I asked and comforted him.

## Evidence files

Diary: `(driver scratch)/retest/voice-shots/wall-clock.jsonl`.

Screenshots are in `(driver scratch)/retest/voice-shots/`:

- `01-opening.png`: loading state, “Waking the town…”.
- `02-begin.png`: opening panel still visible in a capture immediately after Begin; not a reliable post-transition frame.
- `03-awake.png`: 07:59, Halil asleep, Speak visible; filename does not describe his displayed state.
- `04-first-minute.png`: +36.5 s workshop choices; despite the filename this was before the checkpoint.
- `05-checkpoint.png`: +62.5 s feedback/doctor choices; captured before the final checkpoint observation.
- `06-first-minute.png`: +70.0 s checkpoint screen.
- `07-nuran.png`: memory, doctor reply, full-line choices.
- `08-halil.png`: top of Halil's information page.
- `09-afternoon.png`: voluntarily waiting at 18:34.
- `10-grief-reply.png`: smoking prompt after the grief reply disappeared, not a capture of that reply.
- `11-waiting.png`: phone conversation with Selin and available responses.
- `12-stop-phone.png`: post-stop phone day-end sheet, extending below the viewport.
- `13-desktop-after-stop.png`: only desktop look, complete day-end sheet.

No export downloaded. No replay claim.
