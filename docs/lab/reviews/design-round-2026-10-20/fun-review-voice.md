Screenshots and other evidence files stayed in the driver's scratch folder and are not kept; absolute local paths were replaced by relative names or "(driver scratch)". No other wording was changed.

Verdict: Keep the scene-first view, but the change does not remove the main quit reason: it offers company, then asks for another instruction instead of developing the conversation.

Reviewed 2026-10-20. This is a game-design judgment, not a clarity audit or an acceptance test.

## Evidence and limits

I read the design change and follow-up b in `docs/games/voice.md:348–364`, the three ledger rows, both assigned reports, and the implementing UI and simulation paths. Two independent source reviewers examined player intent and mechanical risks. Their findings informed checks; they did not substitute for my play.

I played the live build with Playwright/Chrome at **360×690**, touch emulation, for **666.4 real seconds (11 minutes 6 seconds)** from the actionable title to the final report: 12:08:49–12:19:55 UTC. This includes reading and tool overhead. I completed all four played days and silent Eid. I used Slow for the first five minutes, Normal until about 8:49, then Fast; Auto stayed on. I did not use End day. I left shift and Selin whispers through both skipped stretches. I tested the Hacer and Selin “stay” choices, visited the clinic, sought tea with Rıza, and urged the final afternoon shift. This was source-informed play, not a cold retest or a physical-phone test.

The live manifest before and after identified clean commit **222e472ee60410da8ad334922f5283718fb7f5a0**, framework **2.9.0**. No browser page errors occurred. Timestamped rendered text and screenshots are in (driver scratch) (driver scratch); the numbered captures below identify the observations. Text captures include offscreen content; viewport claims use screenshots. The browser is closed. No run was submitted.

## 1. Did it remove why these players quit?

**Partly. It removes much of the procedure. It does not yet deliver the sustained company they requested.** These are my findings, not evidence that the original testers would now stay.

Amara, F-240:

> “Iftar with Nuran at our table, last Ramadan — that catches me. I wanted more of that.”
>
> “He did talk to Hacer at 10:00. Talk hacer? Fine. is all the exchange I can see. I wanted to hear two people talking; instead I have found a record that a task happened.”

The change answers her task-record complaint. At 59 seconds I received an unsolicited workshop exchange with Mrs Aydın. At 85 seconds I reached four lines between Halil and Hacer, including his missing Nuran across the table. People now speak on the main screen. That is a real improvement. Captures `06-work-start`, `09-cigarette`.

Yusuf, F-251:

> “I do not yet want to spend an evening choosing combinations of action, pressure and reason to reach the next human exchange.”

His report makes the desired result more precise:

> “I want to hear Halil answer her, not immediately return to a stack of compliance and deferment messages.”

The default action/pressure/reason combination is gone. But the new conversation still returns me to compliance. “Hacer is here. Stay and talk” produced another “Fine” over the same exchange. Selin said, “Tell me about that meal with Mum.” I selected “Stay on the phone with Selin,” confirmed it, and got “Fine”; the four scene lines remained unchanged. Captures `10-stay-preview`–`13-after-stay-timeline`, `23-call-scene`–`26-stay-selin-result`. The invitation becomes more prominent without getting an answer.

Esra, F-257:

> “I would not voluntarily return tonight. I would be interested in another scene involving Selin or Nuran, but the repeated instruction sheets did not give me the company I came for.”

Her report says:

> “The memory gave me a reason to care; I wanted to remain there.”

There is more Selin and Nuran on screen. Yet the clinic exchange is only “Tell me plainly,” the existing advice, and “There is a lot to take in.” It acknowledges the visit without exploring what that clinic means to him. Capture `41-doctor-words`. The change improves access to the material she liked more than it expands that material.

Quote sources: `docs/lab/feedback-ledger.md:263,274,280`; `scratch/followups/retest/voice.md`, “Changes I would want”; `voice4.md`, “Best moment, worst moment, and wanting to leave.”

## 2. Is the activity fun for five minutes and a whole run?

**Five minutes: worth reading once, but not yet a satisfying phone-break game. Whole run: the ending earns attention that the repeated middle does not.**

The player decides whether to interrupt, which activity to suggest, and when to accept Halil’s answer and leave him alone. The full composer also retains pressure and reasons. Those can be interesting decisions when two things matter and time makes them compete. They are much less interesting when the prominent alternatives are another conversation or generic rest.

The new quick choices do not let me decide what to ask, disclose, withhold or answer within a conversation. I choose an activity that may display a scene. `scenes.ts:238–276` sends the same bare Mention draft for every quick choice. `SceneDay.tsx:210–273` adds selection, prediction and confirmation. Less procedure helps, but a two-step activity request still follows a dramatic invitation.

At five minutes I had reached Ramadan 2’s morning. My strongest moments were Nuran’s table memory and Selin’s invitation. I was already seeing the table memory repeat. By the second evening, Hacer, Selin and Rıza had all received essentially the same remembered opening. Their replies vary, but each mostly offers permission to keep talking. I wanted the promised conversation more than another chance to arrange it.

The best decision came later: on Ramadan 30 he was short of the final rent payment. I opened the full composer and urged the shift. After deferring for prayer he said, “I trust you — fine, I’ll go.” I then left him alone. He paid Osman without another request. Captures `67-day30-shift-window`–`75-day30-smoke`. That connects trust, a deadline, restraint and a visible consequence. Preserve that kind of decision.

The ending also works: despite Selin reminders through 26 skipped days, he did not call her on Eid. She called at 19:54. The report says he called her himself six times in the following six days. That is more interesting than a clean success badge: the relationship continues, and a missed occasion remains missed. Captures `79-eid-later`, `80-eid-end`.

## 3. New quit points and degenerate play

**The clearest new quit point is the second “stay” request.** The interface now explicitly offers the continuation the player wants. In my run, accepting it changed the request/answer record rather than the conversation. That makes another “Fine” feel like a refusal by the game to provide its own next line. Source confirms why: continuation labels map to ordinary call/talk/tea actions (`scenes.ts:206–210`); `game.ts:473–500` replaces the standing suggestion and may interrupt the current activity. There is no dialogue-continuation input. I observed no new scene text from these two stay tests; I did not prove every repeated request behaves identically.

**The default policy encourages seeking company while hiding competing ends.** At Ramadan 2, 13:31, the game warned that mornings would leave him short of rent; quick choices were Hacer and rest. At Ramadan 15, 19:50, it said the doctor wanted walking instead of smoking; quick choices were Selin and Hacer. Captures `42-day2-midday`, `60-day15-meal`. The ranking uses fixed social preferences and takes two offered actions; it does not use the existing prefill to secure a relevant competing choice (`scenes.ts:225–264`).

This makes “pick the social line to get more writing” an attractive strategy. **I have not established a dominant strategy for outcomes.** The cost is that the main view repeatedly recommends company while the actual deadline or health decision requires the extra composer.

**Silence becomes repeated clock maintenance.** I increasingly pressed Say nothing to reach something new. New scene pauses are added when an encounter reaches its suggestion window (`SceneDay.tsx:45–52`). On Ramadan 15 I encountered the same four-line everyday Hacer exchange at 10:30 and 13:55, each followed by another opportunity to stay. Captures `56-day15-midday`, `58-day15-later`. These waits were short; the problem was repeated permission to proceed without a fresh decision, not a long running-clock delay.

The persistent answer intensifies this. Ramadan 15’s new Hacer scene still carried my Ramadan 2 tea-request answer. This follows the unconditional latest-answer rendering (`SceneDay.tsx:53–55,108–116`). It recreates Yusuf’s complaint beneath the new scene.

## 4. What did it cost?

| Quality | Finding |
|---|---|
| Halil’s autonomy | Preserved mechanically. He postponed requests, acted for other reasons, and talked with Hacer unprompted. A quick choice still suggests rather than commands. |
| Other people’s autonomy | More apparent company, but some is authored scenery. Mrs Aydın and the baker’s boy have no simulated relationship or consequences. The named exchanges also repeatedly cast others as patient listeners. This narrows their dramatic role even though their underlying Persons remain. |
| Their words | The surfaced Nuran memory survives. Its repeated reuse across companions makes it less particular. Hacer’s spontaneous “Osman is stingy” was a useful exception: she briefly had something of her own to say. Capture `17-afternoon`. |
| Difficulty | No simulation difficulty was removed. Default access to difficult decisions was reduced. Social options displace work, walking or the clinic even when those actions are available in the full composer. |
| Ending | The muted day and counterfactual report survive. Their consequence still lands. The scene on the Eid call repeats the earlier Selin invitation, so the writing contributes less to the ending than the fact that she had to call him. |

The baseline simulation is still consequential. I ran the repository’s complete probe:

```sh
VOICE_MEASURE=1 npx vitest run apps/site/src/voice/sim/measure.test.ts --silent=false
```

It passed in **204.31 seconds**, covering **21 styles × five seeds (7,1,2,3,4)**. Selected current results:

| Scripted style | Rent paid by deadline / by Eid, mean | Connected Ramadan calls, mean | Clinic visits, mean | Trust at Eid |
|---|---:|---:|---:|---:|
| Silent | 0 / 300 | 15 | 0 | 0.50 |
| Prefill + doctor/Selin whispers | 0 / 300 | 28.2 | 1 | 0.62 |
| Shift + Selin whispers | 300 / 540 | 28 | 1 | 0.63 |
| Tempter | 0 / 0 | 5.8 | 0 | 0.48 |
| Saboteur | 0 / 300 | 15 | 0 | 0.01 |

Full output: (driver scratch) (driver scratch). This is evidence of preserved agency and consequence, **not evidence that the new core is fun**. The existing headless driver uses frames, prefills and scripted choices; it does not exercise scene reading, scene-triggered React pauses or the two new quick-choice rankings (`sim/headless.ts:86–120`).

## 5. Ranked changes for one round

1. **Make one “stay” choice deliver a completed exchange.** Start with the Selin/table-memory scene. Give Halil an answer to her invitation and Selin a response, using the already surfaced memory and present feelings. Let a local “Keep listening” reveal that bounded continuation; do not implement it by sending another `call:selin` suggestion. Keep leaving and the normal activity clock available. Scope: one scene and its local presentation state, not a dialogue system. Reason: this directly tests whether sustained company removes the quit reason. Passing evidence: a player chooses to stay, hears something new, and can describe what changed between them.

2. **Use one quick-choice slot for the relevant competing end.** Keep a scene continuation when available; use the other slot for an offered action identified by the existing prefill/current concern, before generic rest. At the shortfall pause that means the shift; at the cigarette intervention it means the offered walk. Keep both as suggestions with honest predictions. Scope: quick-choice ranking, not utilities or new actions. Reason: restore decisions about Halil’s life to the main activity instead of making company the interface’s habitual answer.

3. **End the compliance display when its occasion ends.** Keep the current reply while it resolves; move unrelated old replies to the timeline. Compress a standing word to a short persistent line with Withdraw still accessible. Scope: answer lifecycle and its occupied space. Reason: on this phone the standing panel left only the opening portion of Hacer’s exchange visible until I scrolled (`09-cigarette.png`), and stale answers followed me across days. This is not just tidiness: the instruction record keeps reclaiming the attention the design meant to give the people.

Do these before adding a third incidental encounter. More invitations with the same unanswered ending will increase the number of pauses without answering the players’ request.
