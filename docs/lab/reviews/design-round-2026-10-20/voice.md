Screenshots and other evidence files stayed in the driver's scratch folder and are not kept; absolute local paths were replaced by relative names or "(driver scratch)". No other wording was changed.

# The Day You Say Nothing — source-unread playtest

Leila, 58, retired secondary-school teacher. Reads novels; plays Wordle and A Short Hike. Came for company and characters. Patient with reading; dislikes forms and menus. Evening on the sofa, phone in hand.

URL: https://human.adamwhite.work/voice/ . No build identifier observed. Access: Playwright Chromium, one browser context and one persistent page. Phone fixture: 360×690 CSS px, touch emulation, light mode, default text size, device scale 1. Chromium ran headless; I inspected screenshots and rendered page text and used normal taps and scrolling. No source, tests, other repository documents, internal state, bundles, network payloads or debug APIs were read. The only repository inputs were the two assigned files. I did not send a run, use any telemetry submission control or change consent. No export downloaded.

The play ceiling was eight real minutes. I stopped voluntarily at **379.2 s (6 min 19.2 s)** on the conservative wall clock, before the ceiling. The first recorded screen was still loading. Begin became usable between 0 and 18.2 s; I did not capture its exact enable time. The checkpoint was written at 79.2 s on that clock, at least 61 s after Begin was usable. No gameplay inputs occurred between 54.0 s and the checkpoint. This is a late checkpoint with an onset measurement gap, not an exact 60.0 s capture. The original checkpoint below is preserved. Game time reached Ramadan 1, Monday 11 March, 19:35. I did not change speed; Slow and Auto were left as found. One resize to 1280×800 followed the stop, without further gameplay.

## First minute

Checkpoint at 79.2 real seconds after the first observed screen; no further input since 54.0 s. The opening was still loading at 0 s and Begin was visibly ready by the next observation; timing below uses 0 s conservatively.

| Item                       | Status     | Original checkpoint answer                                                                                                                                                                                                                                                              |
| -------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 A reason to act       | PASS       | I am helping Halil do things for himself by Eid. Right now I suggested food because he was hungry and waking before a time limit. The opening told me the larger purpose.                                                                                                               |
| DL-2 What can I touch      | PASS       | Begin, the outlined food/sleep suggestions, Say nothing, Say something else, Say it, the three bottom tabs and the top controls look tappable. I tried Begin, Halil, Day, food and Say it. None was inert. I have not tried the other controls.                                         |
| DL-3 Urgency and selection | PASS       | The outlined suggestions draw me first. The orange time and suhoor before 04:59 tell me food matters soon. Selecting food changed the preview to Likely: “Alright, I'll do it.” and enabled Say it. I saw no competing urgent alert.                                                    |
| DL-4 Why the limit         | PASS       | While asleep I was told “You can speak when he wakes.” That tells me what frees speaking. Say it was pale before selecting a suggestion, with “You can leave him to it”; selecting food enabled it. I inferred the selection requirement.                                               |
| DL-5 Readable situation    | PASS       | He is at home at the table at 03:59, remembering Nuran. My suggestion received “Fine.” I can suggest resting or eating, say nothing or withdraw my words. “Still on his mind until 06:58” tells me the suggestion persists.                                                             |
| DL-6 A choice soon         | NOT TESTED | Begin was first tapped at 18.2 s. The first meaningful food/sleep choice was first observed at 37.2 s, after I looked at Halil; I cannot establish whether it was available within 30 s. First meaningful selection was at 45.8 s and Say it at 54.0 s. The mandatory opening is short. |
| DL-7 Learn by doing        | PASS       | One suggestion sent. I learned that selecting prepares words and Say it sends them; Halil answers separately. Food meant advising him, not directly commanding him. I used no help. Sleep, Say nothing, custom words and Withdraw are NOT TESTED (4 interactions not reached).          |


## What playing felt like

**Best moment:** Hacer said, “Keep the door open, Halil. Tell me about sitting with her. I can stand here with you.” That made the game feel like company. Selin saying “You can talk about Mum with me, Dad” rewarded waiting for the evening. I also liked that Halil deferred my suggestion because he wanted to work for money. It felt like he had priorities of his own.

**Worst moment:** The phone gave the conversation a small space above the controls. At the moment I wanted to read about Nuran, the active suggestion and response controls covered the rest of the scene. Scrolling worked, but it interrupted the reading I came for. “Say something else…” opened a form with action tiles, Mention/Urge/Insist and a Reason dropdown. I used it once for Hacer, with Mention and No reason.

**Boredom:** At 283.6 s I wrote, “I am beginning to feel I am pressing Say nothing to get to the person I want to meet.” At 317.6 s I wrote, “I can see the clock move, but I am mostly rereading the same controls.” I stayed because Selin usually called in the evening. This is a preference about the repeated decisions, not evidence that there are no other scenes or rules.

## Clarity findings

| DL id                        | Status                          | What I observed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DL-20 English for action     | FAIL — first-use term           | At 26.7 s the Halil screen showed “suhoor before 04:59” without an English meaning nearby (04 (driver scratch)). My immediate reaction was “Suhoor means nothing to me here; I can see it has a time limit.” Later food choices let me infer eating. Food, rest, calls, action controls and money deadlines were otherwise readable in English. I did not open the optional opening explanation or request term help. Iftar in dialogue was flavour; I did not need to translate it to tap a response. |
| DL-21 Dates                  | PASS for encountered deadline   | The header said Monday 11 March. His ends said “Osman wants 300 by Ramadan 15 (Monday 25 March). He has 40.” I could compare today with that deadline without translating Ramadan. Screenshot 09 (driver scratch); diary 95.3 s. Cross-month/year deadlines and return after a break were NOT TESTED.                                                                                                                                                                                                  |
| DL-22 Phone response/context | FAIL                            | The buttons remained reachable, but the active suggestion panel reduced the scene area. At 79.2 s the Nuran memory continued behind the panel (08 (driver scratch)). At the Selin call, “Stay on the phone with Selin” was visible while her request to keep talking was below the visible scene area (31 (driver scratch)); I had to scroll to read it (32 (driver scratch)). The whole call and controls fit in the single desktop look (34 (driver scratch)).                                       |
| DL-13 Input acknowledgement  | PASS for inputs tried           | Selection outlined the suggestion and produced a likely reply. Say it produced an answer and a persistent words panel. Deferred replies were marked with a clock, then a tick when the conversation appeared. I did not need a duplicate tap to make an input register. I initially could not tell whether “Fine” meant a meal had happened; I did not establish a false execution claim.                                                                                                              |
| DL-15 Time                   | NOT TESTED for full criterion   | The clock moved at the offered speed and stopped with a triangle at choices. Say nothing resumed it. I manually tapped the triangle twice. Only after stopping, desktop expanded “Auto” to “Auto-pause.” I found the phone behaviour less clear. I did not test fast speed, slowdown or whether a chance survives a long read, so this is not a full pass or a claim about hidden timing rules.                                                                                                        |
| DL-17 Feelings               | PASS for encountered screens    | Halil’s page used “a bit hungry,” “fine,” and “dreads it.” The scenes voiced grief. I saw no feeling percentages or bars.                                                                                                                                                                                                                                                                                                                                                                              |
| DL-4 Later limitation        | PASS for encountered busy state | After the Hacer suggestion, “He is busy. You can speak when he is choosing” explained why I could not speak and what would change it (17 (driver scratch)).                                                                                                                                                                                                                                                                                                                                            |

“Halil is pray at home” and “mention · eat at home” sounded mechanical to me. The double quotation marks around “Fine” looked odd. I could still identify the action and answer. I am recording the reading experience, not inferring a simulation defect.

The first-minute statuses above remain as recorded. DL-6 is an evidence gap, not a demonstrated late-choice failure. Only encountered interactions support DL-7. I did not test the remaining checklist items systematically. End-of-day/game boundaries, save/resume, game menu operation, sending, export/replay, high text size, 320 px layout, exact hit-area sizes, stacked sheets and builder-only checks are NOT TESTED. Sending was prohibited. I used no in-game help and no speed control.

## Stop and return

I stopped at 19:35 on the first day, on the Selin call, at 12:14:34.614 UTC (379.2 s). The page was already waiting at a choice. I did not press Stay on the phone, End day or any other gameplay control after deciding to stop. I would leave father and daughter talking. I would try another evening once for the characters, but would not commit to playing the whole month on this evidence.

## Changes I would want, ranked as this player

1. Let me read the conversation and the current reply together on my phone. I want room for the people.
2. Let quiet stretches pass with less repeated confirmation that I want to say nothing. Make the phone’s Auto label as clear as Auto-pause was on desktop.
3. Give me an English meaning beside suhoor when its deadline first appears.

## Verbatim diary

The reactions below retain their original wording. Inputs and observations were recorded during play, not rewritten after learning later rules. Some input labels describe the preceding tap when its result was recorded in the next entry. The raw wall-clock log also preserves the full checkpoint: wall-clock.jsonl (driver scratch).

- **0.0 s · 2026-10-20T12:08:15.456Z · Open game**
  - Reaction (verbatim): I am here for the people. I hope this is something I can settle into.
  - Visible answer/evidence recorded then: (No additional visible answer recorded.)

- **18.2 s · 2026-10-20T12:08:33.607Z · Look at opening**
  - Reaction (verbatim): Begin looks tappable. More about Halil looks expandable. I can help this man become able to do things for himself, though I do not know him yet.
  - Visible answer/evidence recorded then: Opening overlay: Help Halil toward his own ends, so that on Eid he does them without you. Suggest an action; Halil decides.

- **26.7 s · 2026-10-20T12:08:42.198Z · Tap Begin**
  - Reaction (verbatim): He is asleep, so I suppose I should leave him be. I would like to know who he is.
  - Visible answer/evidence recorded then: 03:40; skipping: he sleeps until 03:59; You can speak when he wakes.

- **37.2 s · 2026-10-20T12:08:52.626Z · Tap Halil**
  - Reaction (verbatim): He dreads calling Selin. That makes me curious about them. Suhoor means nothing to me here; I can see it has a time limit.
  - Visible answer/evidence recorded then: Halil: sleep until 03:59; suhoor before 04:59; clinic, calling Selin, mosque: dreads it; 40 in hand, 600 owed to Osman.

- **45.8 s · 2026-10-20T12:09:01.220Z · Look at Day**
  - Reaction (verbatim): There are two outlined things I can say. I will suggest eating; he was hungry. Say it is pale until I choose something.
  - Visible answer/evidence recorded then: The drummer comes round for suhoor. He is waking. Have something to eat at home. Go to sleep. Say nothing. Say something else…

- **54.0 s · 2026-10-20T12:09:09.427Z · Tap Have something to eat at home.**
  - Reaction (verbatim): I have chosen a suggestion; he has not done it yet. Likely: Alright, I will do it is reassuring.
  - Visible answer/evidence recorded then: Likely: “Alright, I'll do it.”; Say it enabled.

- **54.0 s · 2026-10-20T12:09:09.498Z · Tap Say it**
  - Reaction (verbatim): Now I am waiting to hear him answer.
  - Visible answer/evidence recorded then: Screen captured after Say it.

- **88.3 s · 2026-10-20T12:09:43.726Z · Read after first suggestion**
  - Reaction (verbatim): The words about Nuran disappear behind my suggestion panel. I can see only part of the memory without scrolling. I want more of him, not just food and sleep.
  - Visible answer/evidence recorded then: Phone screenshot 08: scene begins above fixed response panel; I miss you, Nuran and Why his current action? are not on screen.

- **95.3 s · 2026-10-20T12:09:50.784Z · Tap Ends & voices**
  - Reaction (verbatim): Ends is a strange word for wishes, but these are his own words. Paying the landlord and seeing a doctor make sense. I can compare 11 March with 25 March.
  - Visible answer/evidence recorded then: Keep the fast. Pay Osman, my landlord, what I owe. Osman wants 300 by Ramadan 15 (Monday 25 March). He has 40. Selin, my daughter, wants my blood pressure seen.

- **100.1 s · 2026-10-20T12:09:55.587Z · Scroll down wishes**
  - Reaction (verbatim): I want to read about his daughter.
  - Visible answer/evidence recorded then: (No additional visible answer recorded.)

- **113.0 s · 2026-10-20T12:10:08.435Z · Read Selin entry**
  - Reaction (verbatim): Since the funeral he waits for her to call. That is sad and recognisable. I would like him to call her himself. I am a voice in his head, which I had not understood at the start.
  - Visible answer/evidence recorded then: Call Selin, my daughter, myself; not wait for her. Since the funeral he waits for her to call. You: a voice in his head.

- **113.1 s · 2026-10-20T12:10:08.543Z · Return to Day and tap triangle time control**
  - Reaction (verbatim): The clock has been at 03:59 while I read. I will let him get on with the morning.
  - Visible answer/evidence recorded then: Tapped visible triangle at top left.

- **117.6 s · 2026-10-20T12:10:13.036Z · Scroll the scene**
  - Reaction (verbatim): I am trying to read the rest of his memory.
  - Visible answer/evidence recorded then: (No additional visible answer recorded.)

- **133.4 s · 2026-10-20T12:10:28.823Z · Watch morning**
  - Reaction (verbatim): The memory has gone and he is praying at home. I do not know whether he ate; Fine was an answer, not a meal. I want to nudge him toward his daughter.
  - Visible answer/evidence recorded then: 05:06; Halil is pray at home. Earlier answer: You: mention · eat at home; Halil: ““Fine.””

- **142.2 s · 2026-10-20T12:10:37.681Z · Tap Say something else…**
  - Reaction (verbatim): Oh, it is a form. I cannot see calling Selin here. Talk with Hacer sounds more like company than repairing things, so I will try that.
  - Visible answer/evidence recorded then: 07:59; action sheet: repair in the workshop, rest at home, sleep, wait, talk with Hacer at the door, pray at home; Mention, Urge, Insist; Reason: No reason.

- **148.2 s · 2026-10-20T12:10:43.690Z · Choose talk with Hacer at the door**
  - Reaction (verbatim): Mention is selected. I would rather suggest than insist. I do not feel a reason is needed to talk to a neighbour.
  - Visible answer/evidence recorded then: Waiting for likely reply after choosing Hacer.

- **153.5 s · 2026-10-20T12:10:48.936Z · Read likely reply**
  - Reaction (verbatim): He wants to repair first because of money. That is a fair reason. I will still mention the neighbour, gently, and see what he says.
  - Visible answer/evidence recorded then: Likely reply: “I want to repair in the workshop first. I’m thinking about the money.”

- **162.1 s · 2026-10-20T12:10:57.554Z · Tap Say it for Hacer**
  - Reaction (verbatim): After I repair in the workshop, then I will. He has his own priorities, and I like that. Mrs Aydın is watching him work; I would happily read more of this.
  - Visible answer/evidence recorded then: 08:00 workshop scene with Mrs Aydın. Halil: It is easier when I take one part at a time. Answer: After I repair in the workshop, then I will. He is busy. You can speak when he is choosing.

- **181.1 s · 2026-10-20T12:11:16.543Z · Wait at offered speed**
  - Reaction (verbatim): I am leaving him time to work.
  - Visible answer/evidence recorded then: No speed change; Slow and Auto remain as found.

- **191.2 s · 2026-10-20T12:11:26.618Z · Read next choice**
  - Reaction (verbatim): Now Go and talk with Hacer is offered, but his earlier answer has changed to Not now. After I repair in the workshop. I cannot tell whether he has finished working. I will try the offered conversation.
  - Visible answer/evidence recorded then: 09:32; Go and talk with Hacer. Leave the work for now. Rest at home. Prior words still on his mind until 10:59; He said: Not now. After I repair in the workshop.

- **197.2 s · 2026-10-20T12:11:32.610Z · Select Go and talk with Hacer.**
  - Reaction (verbatim): The preview says he still wants to work for money. I do not want to nag him. I will say nothing instead.
  - Visible answer/evidence recorded then: Likely: I want to repair in the workshop first. I’m thinking about the money.

- **216.6 s · 2026-10-20T12:11:52.021Z · Say nothing; wait**
  - Reaction (verbatim): I am watching rather than managing him now.
  - Visible answer/evidence recorded then: Say nothing changed the triangle to pause bars and the clock moved.

- **222.5 s · 2026-10-20T12:11:57.976Z · Read Hacer arriving**
  - Reaction (verbatim): There she is. Fine now has a tick, and they are actually together. I want to hear him talk about Nuran.
  - Visible answer/evidence recorded then: 10:13; At his door ·10:00; Halil and Hacer. Halil: I was remembering iftar with Nuran at our table, last Ramadan. Hacer: You can tell me about Nuran, Halil. I… [covered by response panel].

- **233.4 s · 2026-10-20T12:12:08.874Z · Scroll to Hacer’s words**
  - Reaction (verbatim): Keep the door open, Halil. Tell me about sitting with her. I can stand here with you. That is what I came for. I will ask him to stay.
  - Visible answer/evidence recorded then: Halil: I miss having Nuran across the table. That is the part I keep coming back to today. Hacer: Keep the door open, Halil. Tell me about sitting with her. I can stand here with you.

- **241.8 s · 2026-10-20T12:12:17.231Z · Select Hacer is here. Stay and talk.**
  - Reaction (verbatim): He is likely to agree. I hope there will be more than the same few lines.
  - Visible answer/evidence recorded then: Likely: Alright, I’ll do it.

- **250.1 s · 2026-10-20T12:12:25.554Z · Tap Say it for staying with Hacer**
  - Reaction (verbatim): I have asked him to stay. I am looking for what he actually says next.
  - Visible answer/evidence recorded then: Screen after staying suggestion.

- **258.1 s · 2026-10-20T12:12:33.582Z · Read next scene**
  - Reaction (verbatim): It is already 12:45 and he is praying. I missed the end of the talk. Now money is being explained: mornings alone will not quite pay Osman. I would rather reach Selin this evening than organise his shifts.
  - Visible answer/evidence recorded then: The workshop has an afternoon shift. Mornings alone get him to about 280 by Ramadan 15; Osman wants 300 by Ramadan 15.

- **276.7 s · 2026-10-20T12:12:52.185Z · Say nothing; wait 10 seconds**
  - Reaction (verbatim): I am letting the afternoon pass.
  - Visible answer/evidence recorded then: (No additional visible answer recorded.)

- **283.6 s · 2026-10-20T12:12:59.100Z · Read afternoon Hacer scene**
  - Reaction (verbatim): Osman is stingy. I am listening, Hacer. That is a very short visit. I keep being asked whether to stay or go home. I am beginning to feel I am pressing Say nothing to get to the person I want to meet.
  - Visible answer/evidence recorded then: 14:19; Halil and Hacer at his door; Hacer is here. Stay and talk. Go home and rest.

- **299.8 s · 2026-10-20T12:13:15.285Z · Say nothing; wait again**
  - Reaction (verbatim): I am still hoping for the evening call.
  - Visible answer/evidence recorded then: (No additional visible answer recorded.)

- **317.6 s · 2026-10-20T12:13:33.051Z · Wait for evening**
  - Reaction (verbatim): I can see the clock move, but I am mostly rereading the same controls.
  - Visible answer/evidence recorded then: (No additional visible answer recorded.)

- **322.6 s · 2026-10-20T12:13:38.059Z · Read evening choice**
  - Reaction (verbatim): Give Selin a call. Yes, that is the thing I wanted. The same memory of Nuran has returned.
  - Visible answer/evidence recorded then: 18:55; At home · the table; Halil: I miss you, Nuran. Give Selin a call. Go home and rest.

- **332.5 s · 2026-10-20T12:13:47.965Z · Select Give Selin a call.**
  - Reaction (verbatim): He wants to eat first. Of course; he has fasted. I will mention the call and let him eat.
  - Visible answer/evidence recorded then: Likely: I want to eat at home first. I have a commitment to keep.

- **336.3 s · 2026-10-20T12:13:51.798Z · Tap Say it for Selin**
  - Reaction (verbatim): Not now. After I eat at home. I can wait a little.
  - Visible answer/evidence recorded then: 18:56; Your words: mention · call Selin ·18:55; still on his mind until 21:55.

- **353.0 s · 2026-10-20T12:14:08.415Z · Say nothing; wait for call**
  - Reaction (verbatim): I am looking for the call to happen rather than another promise.
  - Visible answer/evidence recorded then: (No additional visible answer recorded.)

- **360.2 s · 2026-10-20T12:14:15.703Z · Read Selin call**
  - Reaction (verbatim): You can talk about Mum with me, Dad. I am glad he called. Now I know who Nuran was from the conversation.
  - Visible answer/evidence recorded then: 19:35; On the phone; Halil and Selin. Suggestion ticked: Alright, I’ll do it. Stay on the phone with Selin.

- **379.2 s · 2026-10-20T12:14:34.614Z · STOP — no more gameplay input**
  - Reaction (verbatim): I would put the phone down here and leave them talking. I got the family connection I wanted. The repeated food, rest and say-nothing choices have made this feel longer than the little story I read. I would try another evening once, for the characters, but not play the whole month tonight.
  - Visible answer/evidence recorded then: 19:35, Ramadan 1, Monday 11 March. Selin: Keep me on the phone a little longer, Dad. Tell me about that meal with Mum. Stopped naturally before the eight-minute ceiling.

- **445.3 s · 2026-10-20T12:15:40.748Z · One desktop look after stopping — resize only**
  - Reaction (verbatim): The whole call fits here. Auto now reads Auto-pause, which explains the stops more clearly than the phone label did. I am not resuming.
  - Visible answer/evidence recorded then: 1280×800 screenshot 34. Dialogue, answer, active suggestion and response controls all visible together.

Screenshots: opening (driver scratch), first minute (driver scratch), phone stop (driver scratch), desktop after stop (driver scratch). Intermediate screenshots are named in the findings and stored alongside them.
