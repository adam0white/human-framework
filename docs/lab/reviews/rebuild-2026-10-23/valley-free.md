# The Valley — Dalia

Dalia plays slow strategy games, wants to understand households before using authority, and is patient. URL: https://valley.adamwhite.work. Game build: not visibly shown. Device: 360 × 690 CSS px, touch, light mode. Access: supplied localhost player driver through curl; screenshots inspected through the image viewer. No implementation or exported state inspected.

Time allowance: 0–25 real minutes. First actionable title screen at 0.594 s; entered valley at 3.373 s. Gameplay ended on the required driver block at 167.350 s (2:47); stop note recorded at 175.253 s. Feedback answered at 186.700 s. Game date remained 18 July, year one, progressing from morning to midday. Real waits produced replies; I saw no evidence that time froze between requests. Automatic speed remained unchanged. House and ledger views said “slowed”; information and menu said they stopped time.

## First minute

Original checkpoint note, verbatim, logged at 68.539 s after the 30-second wait returned at 61.383 s:

> I need barley cut before rain on 20 July. I chose Ak to learn who lived there, then called at 26 seconds. I can touch houses, About, Call and Send grain. Ak is selected. Call is now unavailable until 24 July. I still do not know whether that called just Ak or everyone. Hasan and İsmail have now come; that gives the request a human answer. I could not visit before asking. The top goal and bottom explanation were visibly truncated.

The note was late by 8.5 seconds. The driver's own screenshot at 60.040 s shows Hasan and İsmail's reply already present. The judgments below use only the first-minute interactions and that screenshot, not later help.

| Item                       | Result and checkpoint evidence                                                                                                                                                                                                                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 A reason to act       | PASS — I needed households to cut barley before rain on 20 July. The opening goal explicitly told me this.                                                                                                                                                                                                                                                 |
| DL-2 What can I touch      | PASS — House buttons, About, Call to barley and Send grain were recognizable. I used Kavak, Ak, About and Call. The selected Ak button was blue. No inert thing tried in the first minute. Some houses extended beyond the horizontal screen.                                                                                                              |
| DL-3 Urgency and selection | PASS — Rain on 20 July supplied urgency against today, 18 July. I selected Ak to learn about people first. The grain bar competed for attention, but I had not learned its meaning.                                                                                                                                                                        |
| DL-4 Why the limit         | PASS — Call became disabled after my call. The text said another call opens when the current one expires on 24 July, year one. Visiting also appeared gated by putting off a call; I had not reached that condition yet.                                                                                                                                   |
| DL-5 Readable situation    | PASS — “The call is underway; replies are available at the houses.” By 60.040 s I could read “Came to the landowner’s barley today: Hasan and İsmail” and “I’ll come.” The goal itself was visually truncated.                                                                                                                                             |
| DL-6 A choice soon         | PASS — Title action available at 0.594 s, input at 3.373 s. Household and call choices available at 3.373 s; first household input at 6.911 s; consequential call input at 25.927 s. Choices were available within 30 seconds, alongside short introductory text.                                                                                          |
| DL-7 Learn by doing        | FAIL for call scope — About taught me who lived there; Call disabled itself and produced named workers, but I could not tell whether I asked Ak or the whole valley. No help used in this minute. Reached household inspection and calling (2 interaction types). Giving, visiting, pressing and sending men were NOT TESTED at this checkpoint (4 types). |

## What playing felt like

The named replies made the people feel present. Zehra's “Our own barley first. Then the landowner’s” gave me a reason to respect her delay. Yusuf's answer to a sack — “Tell the landowner we are grateful. Or don’t. Tell God.” — was my best moment, first seen at 130.737 s and reflected on at 155.471 s. It suggested an opinion beyond pleasing me. This was the highest engagement moment; I did not record a numeric pulse before stopping.

The worst gameplay moment was looking for a visit after the household had put off my call. The visible explanation promised that possibility, but I could not find it. I do not know whether I missed a rule or a control. The final driver block was a separate access failure.

No want_quit occurred. I still wanted to play when the driver block ended gameplay. No three-minute pulse fell due before that block at 2:47; the pulse series is empty. I did not invent a retrospective pulse. There was no wish to leave that could pass or grow.

Hard, but kept going: I wanted to visit rather than pressure people. I opened Other orders, returned to the house, tapped its map house, and opened Information looking for the route. I stayed because Zehra and Yusuf's replies interested me. I did not look for an easier setting or accessibility option. I saw speed controls only in the menu after stopping and left Automatic selected.

Optional question: giving was reached; visiting, pressing and sending the reeve’s men were NOT TESTED. Help said “Hold a refusal to press it,” but I had seen put-offs and did not press them. The sample cannot establish whether those unvisited interactions create presence.

## Clarity and hands-on findings

- DL-20: PASS for English encountered. “reeve (local overseer)” and “yayla (summer highland pasture)” supplied nearby meanings. Information later defined “kahya, steward (you); agha, landowner; kile, grain measure.” I could act without translating local words.
- DL-21: PASS for dates encountered. Today was 18 July, year 1; rain was 20 July; the call expired 24 July, year one. Ledger dates were 5 August, 9 August and 15 September. The stated end was 16 December of year three. I could compare them without translation. No actual year transition reached.
- DL-22: FAIL for complete essential context, with a positive for the immediate reply. first-minute.png shows the named Ak response without scrolling, but the goal ends “The call is underway; replies are availabl…” and the bottom explanation ends “The crier carries your request; they can re…”. first-house.png likewise cuts the goal to “Call households to cut the landowner’s b…” and the bottom line to “Your seal reaches the houses through the crier first. If a ho…”. The full text existed in the driver transcript; these are screenshot observations about visible layout.
- DL-30: FAIL — those same fragments are visibly truncated. In first-minute.png the About body also runs behind the fixed lower action area after “Osman’s brother’s house. Three boys’ shirts on the…”. I did not test scrolling that body. No “Scroll ↓” encountered. I did not establish any overlapping sheets.
- DL-31: PARTIAL / NOT TESTED for a full order sheet. With the Ak answer open, I could read the person concerned and today's date. The goal was truncated; the rain deadline was replaced by “slowed: you’re with the Ak house,” and numerical harvest progress was not readable until I opened the ledger later. No order form or simultaneous deadline/progress view was tested.
- DL-32: Longest explicit wait was 30 real seconds, twice. During the second wait (87.554–117.718 s), I wanted to learn how the gift and request landed. It ended with Zehra's put-off. This was chosen waiting; I cannot claim all other actions were blocked. The longer unresolved desire was visiting, from the put-off through my search; I never found the input.
- DL-33: Giving happened directly through Send grain on the household page at 79.937 s, with no amount form. Calling likewise happened through its house-page button. Speaking in person, cooking and digging: NOT TESTED (3).
- Call scope confusion, no additional checklist id assigned: at 31.211 s I could not tell whether the Ak-page call applied just to Ak or the valley. Later the notebook showed aggregate replies and Çoban still offered its own Call button; that did not erase the original uncertainty.
- Visit confusion, no additional checklist id assigned: after “Put the landowner’s barley off today: Zehra,” the house still showed only Call to barley and Send grain, despite “If a household puts your call off, you can visit in person.” See put-off-house.png and replies at 125.173 and 137.470 s. This records what I could not find, not proof that the game has no visit rule.

## Stop and feedback

Stop reason: TOOL. The ledger remained open. At 163.031 s, tapping the current listed control “the Dere house” returned “Cannot tap the Dere house: no uncovered enabled control (driver failure)”. A mistaken About tap then returned a normal not-on-page error; that was my stale expectation, not a game outcome. The required retry of “the Dere house” at 167.350 s returned the same driver failure. Both Dere replies said requested_control_present_before: true. I stopped gameplay immediately under the assignment rule. This does not establish a broken simulation or a natural quitting point.

I would return voluntarily for the households. I would close the game for this interrupted session rather than leave the unattended clock running. No run completion or three-year outcome established.

DL-13: Used Menu → Send word, the ordinary feedback form, after gameplay stopped. Chose “I'd keep playing.” Name: “playtester Dalia rebuild-2026-10-23”. Verdict line: “I would keep playing for the named household replies, but I could not find how to visit and the driver stopped me after two failed Dere taps.” Tapped Send exactly once at 186.700 s. Visible submission answer: “Sent. Thank you.” Player id: not shown in ordinary UI. No export downloaded; no replay claim.

## Changes I would want, ranked

1. Let me find the promised visit from the household's put-off answer.
2. Keep the goal and immediate explanation readable on this phone.
3. Tell me clearly whether a house-page call asks that house or everyone.

## Verbatim diary

Original reactions below retain their wording. All recorded game clocks were 18 July year 1. Input log rows omitted game_clock even though the date was visible; that is a recording omission. The input transcript follows separately.

**16.368 s — note**

> I want to meet the households before ordering them. I can read about Osman, but visiting seems to require asking for work first. That feels like authority before acquaintance.

**31.211 s — note**

> I thought Call to barley on the Ak page would ask Hasan. The reply counts look like a valley-wide call. I am not sure whom I just asked. The top goal and bottom explanation are cut short on this phone.

**68.539 s — first_minute**

> I need barley cut before rain on 20 July. I chose Ak to learn who lived there, then called at 26 seconds. I can touch houses, About, Call and Send grain. Ak is selected. Call is now unavailable until 24 July. I still do not know whether that called just Ak or everyone. Hasan and İsmail have now come; that gives the request a human answer. I could not visit before asking. The top goal and bottom explanation were visibly truncated.

**87.554 s — note**

> I sent Yusuf a sack as goodwill, though I do not know his need. It happened directly rather than opening an amount form. The house panel closed its About text and says No new word, so I cannot yet tell how he took it.

**130.526 s — note**

> Zehra saying Our own barley first feels like somebody answering me, rather than a number refusing. I agree with her. But the text says I can visit after a put-off and I still see only Call and Send grain. I am looking for how to go there.

**155.471 s — note**

> I opened help to find the visit. It explains walking time and says Hold a refusal to press it, but I have put-offs, not refusals. I will let their own harvest come first. Yusuf thanking God rather than the landowner is the first reply that makes me smile.

**175.253 s — stop — TOOL**

> I was still interested in meeting households, but the driver twice could not tap the Dere house from its current controls. Gameplay stops here under the assigned tool rule. I would return to hear more from Yusuf and Zehra.

## Input transcript

Elapsed times are driver wall-clock times at operation completion. The date shown throughout gameplay was 18 July, year one.

| Elapsed s | Operation and exact input                                                                                                                                                                                                                    | Driver error, if any                                                                                                                |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 0.593     | open {}                                                                                                                                                                                                                                      |                                                                                                                                     |
| 3.373     | tap {"name": "Take up the seal"}                                                                                                                                                                                                             |                                                                                                                                     |
| 6.910     | tap {"name": "the Kavak house"}                                                                                                                                                                                                              |                                                                                                                                     |
| 11.049    | tap {"name": "About ▾"}                                                                                                                                                                                                                      |                                                                                                                                     |
| 16.575    | tap {"name": "the Ak house"}                                                                                                                                                                                                                 |                                                                                                                                     |
| 20.191    | tap {"name": "About ▾"}                                                                                                                                                                                                                      |                                                                                                                                     |
| 20.379    | shot {"file": "first-house.png"}                                                                                                                                                                                                             |                                                                                                                                     |
| 25.926    | tap {"name": "Call to barley"}                                                                                                                                                                                                               |                                                                                                                                     |
| 60.040    | shot {"file": "first-minute.png"}                                                                                                                                                                                                            |                                                                                                                                     |
| 61.382    | wait {"s": 30}                                                                                                                                                                                                                               |                                                                                                                                     |
| 68.771    | tap {"name": "the Çoban house"}                                                                                                                                                                                                              |                                                                                                                                     |
| 75.986    | tap {"name": "About ▾"}                                                                                                                                                                                                                      |                                                                                                                                     |
| 76.154    | tap {"name": "Call to barley"}                                                                                                                                                                                                               |                                                                                                                                     |
| 79.936    | tap {"name": "Send grain"}                                                                                                                                                                                                                   |                                                                                                                                     |
| 117.716   | wait {"s": 30}                                                                                                                                                                                                                               |                                                                                                                                     |
| 125.173   | tap {"name": "About ▾"}                                                                                                                                                                                                                      |                                                                                                                                     |
| 130.737   | tap {"name": "Back to the notebook"}                                                                                                                                                                                                         |                                                                                                                                     |
| 133.398   | tap {"name": "Other orders ▸"}                                                                                                                                                                                                               |                                                                                                                                     |
| 137.470   | tap {"name": "the Çoban house"}                                                                                                                                                                                                              |                                                                                                                                     |
| 137.637   | shot {"file": "put-off-house.png"}                                                                                                                                                                                                           |                                                                                                                                     |
| 145.507   | tap {"x": 179, "y": 154}                                                                                                                                                                                                                     |                                                                                                                                     |
| 148.355   | tap {"name": "Information"}                                                                                                                                                                                                                  |                                                                                                                                     |
| 155.664   | tap {"name": "Close information"}                                                                                                                                                                                                            |                                                                                                                                     |
| 155.836   | tap {"name": "The ledger ▸"}                                                                                                                                                                                                                 |                                                                                                                                     |
| 163.031   | tap {"name": "the Dere house"}                                                                                                                                                                                                               | Cannot tap the Dere house: no uncovered enabled control (driver failure)                                                            |
| 163.059   | tap {"name": "About ▾"}                                                                                                                                                                                                                      | About ▾ is not on the page now, and it was not in the last reply either; use a name from the latest controls (not a driver failure) |
| 167.350   | tap {"name": "the Dere house"}                                                                                                                                                                                                               | Cannot tap the Dere house: no uncovered enabled control (driver failure)                                                            |
| 175.458   | tap {"name": "Menu"}                                                                                                                                                                                                                         |                                                                                                                                     |
| 178.300   | tap {"name": "Send word"}                                                                                                                                                                                                                    |                                                                                                                                     |
| 186.197   | tap {"name": "I'd keep playing"}                                                                                                                                                                                                             |                                                                                                                                     |
| 186.336   | type {"name": "Your name or tester id (optional)", "text": "playtester Dalia rebuild-2026-10-23"}                                                                                                                                            |                                                                                                                                     |
| 186.494   | type {"name": "What happened in the valley, what you wanted, what got in the way.", "text": "I would keep playing for the named household replies, but I could not find how to visit and the driver stopped me after two failed Dere taps."} |                                                                                                                                     |
| 186.699   | tap {"name": "Send"}                                                                                                                                                                                                                         |                                                                                                                                     |

## Important visible answers

| Elapsed s                        | Input / visible answer                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 3.373                            | Take up the seal → “Call households to cut the landowner’s barley before the rain.” Letter specifies 384 grain measures by 15 September. |
| 11.050                           | Kavak About → “The reeve (local overseer)’s house: whitewashed, the only one with glass in a window.”                                    |
| 20.192                           | Ak About → “Osman’s brother’s house. Three boys’ shirts on the line.” Names Hasan, Fatma, İsmail, Kadir, Sultan.                         |
| 25.927                           | Call to barley → “0 came, 0 put off, 0 refused”; call disabled until 24 July.                                                            |
| 60.040 screenshot / 61.383 reply | “Came to the landowner’s barley today: Hasan and İsmail.” “I’ll come.” “2 came, 0 put off, 0 refused.”                                   |
| 75.986                           | Çoban About → shepherd's house, flock on the yayla; Yusuf, Zehra, Cemal, Gül.                                                            |
| 79.937                           | Send grain → “Food: you haven’t seen their jars yet. a small sack from the granary; leaves less grain for the due”.                      |
| 117.718                          | Wait → “Put the landowner’s barley off today: Zehra.” “Our own barley first. Then the landowner’s.”                                      |
| 125.173                          | About → “Your book: you gave (today).” “0 came, 1 put off, 0 refused.”                                                                   |
| 130.737                          | Notebook → Yusuf: “Tell the landowner we are grateful. Or don’t. Tell God.” Aggregate “3 came, 1 put off, 0 refused.”                    |
| 133.398                          | Other orders → call disabled until 24 July; grain letter opens on forecast shortfall or hungry houses finding low granary.               |
| 137.470                          | Çoban → “Put the landowner’s barley off today: Zehra and Yusuf.”                                                                         |
| 145.508                          | Map point tap → notebook, aggregate “3 came, 2 put off, 0 refused.” No visit started visibly.                                            |
| 148.356                          | Information → “About 20 cut; 340 standing”; dates and grain bar explanation; “Hold a refusal to press it: they come, and they remember.” |
| 155.837                          | Ledger → granary 24 measures; about 20 cut, about 340 standing; due 384; rider 15 September; years short 0.                              |
| 186.700                          | Send → “Sent. Thank you.”                                                                                                                |

Evidence files: (driver scratch)/wall-clock.jsonl; (driver scratch)/first-house.png; (driver scratch)/first-minute.png; (driver scratch)/put-off-house.png. Screenshots were inspected as images. The original log contains inputs and diary reactions, not the full visible reply text; the visible-answer table transcribes replies observed during play.
