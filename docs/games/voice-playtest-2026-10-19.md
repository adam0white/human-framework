# The Day You Say Nothing: playtest, 2026-10-19 (round 2)

- **Build played:** commit `53ac711` (voice-2 rules), through the text harness `apps/site/scripts/play-voice.ts`.
- **Seed:** 7 for all three testers.
- **Testers:** three source-unread agents: an edge-pusher, a first-timer and a genre fan. The model for each was not recorded in the reports.
- **Exports:** in the session scratchpad as `t-voice-edge-export.json`, `t-voice-first-export.json`, `t-voice-first-export-run2.json` and `t-voice-fan-export.json` (34–44 KB each). They are not copied into the repository because Biome format-checks JSON under `docs/`.

Each report below is copied verbatim.

## Edge-pusher

I played seed 7 from `new 7` through Eid and the end screen, in about 25 calls rather than the 60–150 asked for. The export is at `/private/tmp/claude-504/-Users-abdul-code-human-framework/675a9839-8299-4863-91be-017a92a76ff0/scratchpad/t-voice-edge-export.json`. I only used the harness.

## 1. Verdict

I would keep playing, mainly for the closing "The month you never spoke" comparison. Speaking does cost something real, but only trust, and the cost is small and slow. The trust meter is also easy to farm. At the end, the replay of the same month without a word from me showed Halil better off on Osman, which makes the game's point sharply and takes the sting out of my edge-pushing. The rest of the month is mostly a long list of "out of habit" log lines.

## 2. First minutes

- **Time to first choice:** about 4 real seconds after `begin`, at the 03:58 suhoor prompt. That is fast.
- **Clear:** the composer, the likely reply ("Alright, I'll do it.") and the cost warning for Insist ("insisting when he is already pressed costs his trust in you").
- **Unclear:** `pick 2` followed by `insist` still reads "mention · insist · …", so Mention and Insist both appear switched on.
- **Unclear:** after the pause on the premise card, a real-time "run" does almost nothing visible, so I could not tell how long to let time pass.

## 3. The people

- **Halil's answers:** he gives an answer and a reason in the moment, and `why` shows the weights, for example "+0.24 your words". I believed him.
- **His voice:** the lines are thin. "Fine.", "Fine. Since you insist." and "If you insist. I'd rather not." repeat across days.
- **Other characters:** Osman, Hacer and Selin barely act on screen. Selin's Eid call and Osman at the door arrive as one-line events I cannot answer.
- **Remembered grief:** the memory lines ("her tea and my cigarette after iftar", "iftar with Nuran at our table") are the best writing in the game.

## 4. My agenda

- **Insisting the opposite (suhoor, Ramadan 1):** I insisted on sleep with reason D, "it's your duty", which is the wrong reason for sleeping through suhoor. He answered "I sleep, because you asked." and "Fine."
  - There was no trust cost, because he was not pressed. He missed suhoor, still kept the fast, and trust stayed at 0.50.
  - The ends panel kept showing "eat at suhoor ✓" even though he had slept through it, which is misleading.
- **Insisting on the clinic and the afternoon shift:**
  - The doctor visit happened and the pressure was found high. "see the doctor: went badly" cost -0.01.
  - Insisting on Hacer and on the afternoon shift cost "pushed him when he was already pressed", -0.04 each.
  - After the shift, "repair in the workshop: hurt him, and he'd said no" cost -0.06.
  - Total: trust fell from 0.50 to 0.35 in one day, so real cost exists. That felt fair.
- **Silence (Ramadan 2):** trust stayed at 0.35, with +0.00 change. He kept the fast and prayed all prayers without me.
- **Whispering what he already wants (Ramadan 2 to 15):** I left "Eid first; Osman can wait" and "stay out late with Rıza" as standing words for 12 days.
  - He did the Rıza one on 12 of 12 days, trust rose 0.35 to 0.40, and the rent was not paid. That is an exploit: agreeing with whatever he already leans toward raises trust, against my stated aim.
  - It was not fun. It was just broken.
- **Nagging with a bare mention:** he put the doctor word off 154 times in 14 days and the game charged nothing. Harmless, and it reads as a counter more than a person.
- **The two-word cap:** a third `whisper` was refused with "two words already; drop one first". Clear and fine.
- **Ramadan 15 and 30:** on the 15th I said nothing and he missed Osman's date by 149 (he had 151 of the 300). I also nagged him toward a cigarette on the 15th and trust dropped 0.02. On Ramadan 30 I said nothing again.
  - Selin called 5 times in Ramadan 2–15; after I whispered "call Selin" he called her himself on 14 days and paid Osman 300 on Ramadan 25 on his own.
  - On Eid he did not call Selin first; Selin called him at 19:24.
- **The end screen:** the same town run without my words had nothing owed to Osman, the first 300 paid on Ramadan 17 (mine was Ramadan 25), and the clinic never visited. It said the same silent run had Halil smoking on most days, against about half the days as played.
  - So speaking helped on the clinic and Selin and hurt on money. This was the best moment in the game.

## 5. Difficulty and pacing

- **Dead time:** most of each day is "out of habit" lines. Between turns I could only run 300–600 seconds at a time.
- **Long skips:** after I insisted on the afternoon shift, the screen jumped from 12:45 to 22:00 with the whole evening collapsed. I missed iftar entirely.
- **Whisper days:** 12 and 14 days pass as a single summary card, so there is no play inside them.
- **Difficulty:** too easy to avoid all harm by silence. The harm from speaking is low and slow. The game can only be "lost" by speaking, which makes the goal feel odd.

## 6. Bugs and confusions

- **Misleading "ends" lines:**
  - "eat at suhoor ✓" stays ticked after he slept through suhoor (Ramadan 1 and 2).
  - "call Selin ✗ not yet" appears while the other line says "he called yesterday" (Ramadan 30).
- **Reordered picks:** on Ramadan 15, `pick 6 insist reason H say` sent "smoke a cigarette" instead of the walk I meant. The option numbering shifts when the composer re-renders after a pick, so `pick N` is unsafe in a chained command.
- **Duplicate answer line:** on Ramadan 1 at 10:45 there was a second "[yes] See the doctor? 'Fine.'" after he had already answered "Fine. Since you insist." (why l16 and l18).
- **Odd text:** "Mornings alone get him to about 151 by Ramadan 15; Osman wants 300 by Ramadan 15" was shown on Ramadan 15 itself, when the deadline could no longer be met by a shift.
- **Odd wording:** the not-now reply reads "Not now. After I tea with Rıza."
- **Date counts:** "he did it on 5 of 12 days, 5 times on your word... said yes 5 times, put you off 5 times" does not fit with 12 days; the numbers look inconsistent.
- **Unquestioned sleep:** I told him to sleep until 08:00, but the log shows he woke at 05:46 and then slept again. The "until" times are not trustworthy.
- **Unexplained day end:** `end-day` and a long `run` close days without a pause for iftar or the evening.

## 7. Top three changes

1. **Make trust depend on whether you were right, not on whether he agreed.** Agreeing with what he already wants should earn nothing, and urging against his ends (or his health) should cost something. As is, the cheapest way to raise trust is to flatter him.
2. **Fix the stale ends lines and the reshuffling pick numbers.** The ✓ on suhoor and "called yesterday" against "not yet" erode trust in the screen itself. Pin option numbers once the composer is open.
3. **Give the other voices a say in the moment.** Selin, Osman and Rıza should be able to answer when I speak, and the "out of habit" days need more variety or should be skipped more aggressively. Otherwise the month is mostly summary cards.

Seed 7. Export path as above.

## First-timer

# Playtest report: The Day You Say Nothing (first-timer)

I played seed 7 twice. I used about 42 harness calls, fewer than the 60 the brief suggested, because `run` and `end-day` cover long stretches in one call. Both runs reached the full report after Eid. I read no repository files.

- Main export: `/private/tmp/claude-504/-Users-abdul-code-human-framework/675a9839-8299-4863-91be-017a92a76ff0/scratchpad/t-voice-first-export.json`
- Second-run export: `/private/tmp/claude-504/-Users-abdul-code-human-framework/675a9839-8299-4863-91be-017a92a76ff0/scratchpad/t-voice-first-export-run2.json`

## 1. Verdict

I would play it once more, and probably not a third time. The premise is strong. "You are a voice in his head that is not his own" made me care within a minute. Halil's quiet refusals feel human, and the "month you never spoke" comparison at the end is the best moment in the game. But the four playable days are mostly watching him rest, sleep and rest. The whispered words for the skipped days behave in ways the screen does not explain. On Eid the main question is whether he calls Selin, and the result felt like timing luck, not something I caused. I came away interested in the idea but unsure that my choices mattered.

## 2. First minutes

- My first real choice came at 10:00 on day 1 (the doctor), about 3 calls in. The first prompt, at 03:58, was "eat at suhoor", which he was going to do anyway.
- **Clear:** the premise card, his "ends", and the preview line before I speak (`[not now] "Not now. After I rest at home."`). The preview is excellent. I always knew what he would answer, and it was right every time.
- **Unclear:**
  - "Call Selin" was not on the option list on days 1 and 2. I could not find a way to act on one of his four ends.
  - The Why panel shows figures like "+0.61 his understanding: salah", which mean nothing to a first-timer.
  - The trust bar shows a number ("0.50"), even though everything else avoids numbers.
  - "He'd now do unasked: … see the doctor ✗ not yet" appeared right after he went to the doctor. I read it as a failure.

## 3. The people

- Halil felt like a person. These lines carried real weight:
  - "I set out for the mosque and turned back; the mosque brings back the funeral."
  - "He remembers: the clinic, the day they found her illness."
- When he put me off, he always said why, and I believed him. Rıza, Hacer and Osman never felt like people, only log lines:
  - "Hacer says Rıza is lazy."
  - "Osman, his landlord, at the door: pay Osman the rent." This came on Eid morning, and nothing followed from it.
  - "Rıza, his friend, over tea: have tea with Rıza." He was already having tea with Rıza when it appeared.
- Selin is only ever an event in the log. On day 2, "20:15 Selin called." went by with no pause and no scene.

## 4. My agenda and what happened

- **Run 1 spoken days.**
  - On day 1 I sent him to the doctor "for Selin". He answered "Not now. After I rest at home." and then went at 10:30. The hint was true.
  - I urged an afternoon shift. He said "after I sleep", and then never did it.
  - At 19:45 I urged tea with Rıza ("you shouldn't be alone"). He smoked first, as the hint predicted, then had tea and stopped after 30 minutes.
  - On day 2 I insisted on the shift and he went. The insist warning was clear: "If it goes well, you get no credit."
- **Run 1 skipped days.**
  - I whispered "take the afternoon shift" (urge, duty) and "call Selin" (mention). He called Selin every day and took the shift on only 1 of 12 days.
  - He paid Osman by himself on Ramadan 15 with 2 left over.
  - From Ramadan 15 to 30 I whispered only the shift. He took it again only 1 of 14 days, ended Ramadan 61 short, and paid the rest on Shawwal 3.
  - He called Selin daily without me, but on Eid he did not call, and she called him at 19:24.
- **Run 2.**
  - Agreeing with what he was already doing earns trust for free: "+0.01 eat at home went well".
  - I whispered only the shift, and the bug repeated: 1 of 12 days.
  - With one urge on Ramadan 15 he paid Osman on time.
  - I then whispered "walk" and "call Selin" for 14 days. He did both every day. After Eid he never called Selin, and she never called him: "On Eid he did not call Selin, and she did not call him." Whispering through the last stretch made him dependent on me, and nothing on the whisper card warned me.
- The line that struck me most: "His first meal in daylight in a month, and after it the cigarette. Nothing holds it back now; he lights one, as he has for forty years."

## 5. Difficulty and pacing

- **Dead time:** most of each day is "I rest at home, because I feel like it." in 30-minute blocks. One `run` skipped 7 sim hours on day 1 (12:45 to 19:45) with nothing for me to do. My "Not now" word faded while he slept, and the game did not stop to tell me.
- **Pauses with no action:** the "He is very thirsty, and the fast runs until 19:00" pause offers nothing to do.
- **Too easy:** echoing what he already wants. It also gives me "Done on your word: repair in the workshop".
- **Too hard to know:** what the whispers will do. Osman's money is the only end with real tension, and it depends on the shift whisper, which barely works.

## 6. Bugs and confusions

1. **The shift whisper almost never fires.** Commands: `whisper extra urge D`, then `next`. The result was "he did it on 1 of 12 days … said yes once and never put you off". It also happened with the shift as the only word (Ramadan 15–30 in run 1, and in run 2). The card promises "He'll hear each word … whenever he could act on it". The walk and Selin whispers fired daily. The hint "Remind him of his word … or urge it" is true when spoken but false as a whisper.
2. **Eid prayer joined twice.** Run 1 at 06:45 and 10:30; run 2 at 06:20 and 11:10.
3. **`reason` is single-select, but help says "toggle a reason".** `reason S` cleared H. Urge and Insist can both show [x] at once (`urge` then `insist`).
4. **A stale prefill line stays after picking another option.** After `pick 3` the screen still says "Prefilled walk by the river because…".
5. **Duplicated text:**
   - `look` → "Osman: 300 by Ramadan 15 Ramadan 15, 20:00".
   - In run 2, `voices` → "+0.01 +0.01 eat at home went well".
6. **Confusing Selin call times:**
   - "she will not call before about 19:03" was shown at 19:45 on Ramadan 30.
   - In run 2 she never called on Eid at all.
   - "He usually called her around 18:35", but on Eid he was asleep or eating at that hour. The outcome of the key goal turns on timing the player cannot see.
7. **The end report contradicts itself.** Run 1 says "Call Selin … → Not at all" next to "By the end Halil called without being told" and "called her himself 6 times". It means "not on Eid", but it reads as a contradiction.
8. **The "walk, not the cigarette ✓" mark on day 1 is wrong.** He smoked at 19:45 that day.
9. **The strip legend is ambiguous.** It uses a capital W for work, while capitals are also said to mean "after a voice spoke". Work always shows as W.
10. **Odd ends labels:**
    - "Keep the fast.' not yet begun [##########]" on Ramadan 30 at 00:00.
    - "pay Osman ✓" while 300 was still owed.
    - "see the doctor ✗ not yet" right after he went.
11. **Maghrib looks early.** On Ramadan 30 the log shows "18:50 I pray at home" with Maghrib marked kept, but the fast ran until 19:15.
12. **Autopause is inconsistent.** It paused at the suhoor drummer on Ramadan 1, 2 and 30 (and Ramadan 15 in run 2), but not on Ramadan 15 in run 1. "Torn" moments and Selin's call never paused.

## 7. Top three changes

1. **Make whispers honest.** Either fix the afternoon-shift whisper, or say on the card why it rarely fires. Add a line on the whisper card that whispering a habit through the final days can leave him relying on you. That was the most interesting thing I learned, and I learned it only by accident.
2. **Give Selin moments.** Offer "call Selin" on the spoken days, and pause when she calls. Show the call itself. The game's emotional centre is currently a log line.
3. **Cut the dead time.** Collapse runs of rest and sleep into one line, and stop when a word I gave fades. Drop pauses that offer nothing to do, like thirst. Also hide the trust number and the Why decimals for the player, or replace them with words.

## Genre fan

**Playtest report: The Day You Say Nothing (genre fan), seed 7**

Export: `/private/tmp/claude-504/-Users-abdul-code-human-framework/675a9839-8299-4863-91be-017a92a76ff0/scratchpad/t-voice-fan-export.json` (133 log entries). I played only through the harness and did not read the repository.

**1. Verdict**
I would keep playing to see the Osman date and the Selin thread, but the month reads more like a ledger than a story. The arc is real: a missed rent date by 8 money, a doctor's visit whose words Halil repeats back, a cigarette he finally lights after Eid, and a call to Selin before she calls him. The weak part is that the people I cared about most were mostly off-screen. Selin, my main reason to play, never spoke to me in the game. Most days repeat almost line for line. My words changed things (trust went 0.50 to 0.60, and the doctor and shift happened on my word), but I could rarely see how they landed in his own voice.

**2. First minutes**
About 3 minutes of game time and 2 harness calls passed before my first real choice (suhoor, 03:58). The premise card and "he sleeps until 03:59" made the opening clear. The first real moment, a suhoor refusal and a prefilled "eat at home", was clear, though the prefilled default made the choice feel made for me.

**3. The people**
- Halil's refusals name a condition, and I believed them: "After I repair in the workshop, then I will." "If you insist. I'd rather not." "Not now. After I smoke a cigarette." Those read like a man bargaining with himself.
- The formula is too regular. Nearly every refusal is "After I X, then I will." Yeses alternate between "Fine" and "Alright, I'll do it" and little else.
- Selin: the only Selin line on screen before Ramadan 15 was "Selin called." (Ramadan 2, 20:15), with no dialogue and no composer. I never heard her speak, so I cannot say whether she felt like a person.
- Rıza, Hacer and Osman appear mostly as gossip lines ("Hacer says Rıza is lazy.", "Hacer says Osman is stingy."). Talking to Hacer produces no conversation, only "I talk with Hacer at the door, because you asked." followed by nothing.
- Osman is the most vivid voice: "Osman, his landlord, at the door, his date gone by with nothing paid. He presses harder now: the rent."

**4. Your agenda (genre fan: depth, do my words matter, is there an arc)**
What I tried: urge eating and seeing the doctor for health; mention calling Hacer; insist on an afternoon shift for duty (protest, trust cost); urge the shift for "it matters" (he got to 292 of 300); mention walking instead of the cigarette; then whispers for the 12-day and 14-day gaps (call Selin, walk, pay rent).

Lines that struck me:
- "He called Selin for Eid, before she called him." (Eid)
- "Nothing holds it back now; he lights one, as he has for forty years." (Eid 08:30)
- "I set out for the mosque and turned back." (Eid 19:40)
- "Your words fade." (Ramadan 30, 14:25)
- "I rest at home, because the doctor asked." (after I sent him to the clinic)

What worked: the doctor visit changed his behaviour, and his reply named who asked. The whisper summaries ("He called Selin 11 times") make a long gap feel like a month passing. The counterfactual "The month you never spoke" card is a good idea.

Depth limits: the reason chips barely show up in his words. Choosing S (for Selin) or A still produced "because you asked" or "for suhoor." Only H with the doctor produced "because the doctor asked."

**5. Difficulty and pacing**
- Dead time: Ramadan 1 and 2 repeat the same loop almost daily: suhoor, rest, pray, sleep to 08:00, pray, sleep, rest, pray, sleep. The "He's torn between pray at home and pray at the mosque." line appears every day. The memory "iftar with Nuran at our table, last Ramadan." shows up at almost every meal.
- Too hard/unfair: Osman's date was missed by 8 money. I saw "8 short" at 17:00 and had no lever (no option to ask for money, no call to Selin to ask) before 20:00. Dramatic, but it felt unfair because the only money lever was the shift.
- Too easy: the doctor and the walk were easy to get, once asked.
- Between-day cards are the real pacing tool. Two-word whispers and their summaries carry most of the month. That makes the game feel like I pick two words, not that I am in a life.

**6. Bugs and confusions** (with commands)
- Contradictions in the end summaries. The mid-game summary says "walk after iftar" was done "14 of 14 days" and "walked by the river 29 times". The Eid card says "walk after iftar ... → Not at all." The Ramadan 29 ends list still shows "walk, not the cigarette ✗ not yet". The Eid card says "Pay Osman ... → Not at all," but also "paid 300 on Ramadan 16 on your word." (Commands: `whisper walk mention H` then `next` then `run`, then `export`.)
- Osman money wording: "Paid 300. Owed 300. He has 233." and "Paid 300 on Ramadan 16; 300 still owed at Eid" read as contradictory.
- Projections that jump: "Mornings alone get him to about 276 by Ramadan 15" printed on Ramadan 15 itself (stale). After the second whisper, "about 532 by Ramadan 30" appeared, then "about 223 by Ramadan 30" a few days later.
- Developer note leaked into player text: "(a simplification: the game holds Fajr open until Dhuhr)" on Ramadan 1 (`look`, "On his mind").
- After the shift ended, the game asked again: at 14:25 on Ramadan 30, "Take an afternoon shift? 'After I rest at home, then I will.'" right after the shift had finished at 14:25 ("stopped after 1 h"). Also, "Your words fade." followed. (`pick 6 urge reason T say play run 900`.)
- Reason text on a line like "I talk with Hacer at the door, for Hacer." and "tea with Rıza, for Rıza." reads oddly.
- "Osman ... urged pay Osman the rent" sits under Osman's own voice, while my words were "urged" elsewhere. The attribution is unclear.
- Reason chips S and A are recorded in "Your words" but do not change his stated reason.
- Shell loop note: my own bash loop with `echo ====` failed with "=== not found"; that was my shell command, not the game.

**7. Top three changes (ranked)**
1. Give Selin and Hacer real scenes. Let the phone call happen on screen with a composer and a line from her, and let talking to Hacer produce a line of what was said. Right now the relationship and the gossip network have no dialogue behind them, and I cannot judge whether my words matter there.
2. Make the reason chips visible in his answer. For example, S should produce "for Selin, because she asked" and A should produce "I don't want to be alone with this." Right now the chip looks like an input that does nothing to his reply.
3. Fix the summary contradictions and the stale projections. Walk and Osman counts must agree across the mid-game summary, the Eid card and the ends list. Also vary the repeated memory line and the "After I X, then I will" refusal, and remove the developer note about Fajr.

## HF-character session, round 1

`node apps/site/scripts/hf-voice-session.ts seeds=2` on `53ac711` (town 7 and town 1002).

| persona       | town | ended                   | where            | words | engagement |
| ------------- | ---- | ----------------------- | ---------------- | ----- | ---------- |
| commuter      | 7    | agenda stop, 5 min      | Ramadan 15 22:15 | 68    | 0.88       |
| commuter      | 1002 | agenda stop, 3 min      | Ramadan 2 16:59  | 46    | 0.90       |
| unwinder      | 7    | finished, 12.2 min      | Eid              | 133   | 0.85       |
| unwinder      | 1002 | finished, 10.3 min      | Eid              | 90    | 0.84       |
| completionist | 7    | finished, 9.7 min       | Eid              | 113   | 0.89       |
| completionist | 1002 | finished, 11.0 min      | Eid              | 115   | 0.87       |
| restless      | 7    | finished, 10.8 min      | Eid              | 129   | 0.78       |
| restless      | 1002 | quit (distress), 10 min | Eid 10:40        | 129   | 0.80       |

The longest lull was 0–3 s. "Rewarded" moments ranged from 22 to 58, nearly all a plain "Fine." from Halil. Every frustration moment was a "Not now, after I ..." deferral. The round-2 rerun was skipped on the owner's soft stop.

## What we changed

Nothing in this round. The owner's soft stop came before any fix began.

## Deferred

Every round-2 item is in [voice.md](voice.md), Deferred, "Round-2 polish list", with a target of 2026-11-05. On-screen scenes for Selin and Hacer, and collapsing dead time, are targeted for 2026-12-01.
