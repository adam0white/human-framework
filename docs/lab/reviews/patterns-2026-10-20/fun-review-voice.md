Verdict: Keep the change: it fixes the instruction-form quit, but repeated care and summaries that erase it still weaken the reason to finish the month.

Reviewed 2026-10-20. This is an adversarial game-design review, not owner acceptance or a cold retention test.

## Evidence and limits

I read the 2026-10-20b change, its implementation, F-270/F-271/F-279, both assigned player reports, the earlier fun review, and design-language §6/§8. Two independent source reviewers examined player intent and mechanical consequences; I checked their material findings against code and a reproduction.

I played the live build through Playwright Chromium at **360×690 CSS px**, with touch emulation, for **606.7 real seconds** from the fresh page, **598.5 seconds after Begin**: 14:14:23–14:24:30 UTC. Slow stayed selected for the first five minutes; I selected Normal at 325.9 seconds. “Slow at scenes” stayed on. This includes reading, screenshots and controller overhead. An earlier opening attempt lost its controller and is excluded from these timings. I inspected viewport screenshots as well as rendered text; text alone includes offscreen content.

I reached Ramadan 15 at 12:13, after playing days 1 and 2 and leaving a Selin reminder through the first skip. I **did not finish a month live**. The whole-run judgment below combines this play with completed headless campaigns and source inspection; headless success does not prove enjoyment. I neither submitted a run nor changed telemetry consent. The browser closed normally.

The live manifest before and after identified clean commit `aa14a254900567cea414f3bd289157077c7b1ca4`, framework 2.9.0, matching the checked source. No implementation files were edited.

Evidence root: `(driver scratch)/fun-voice/`. `session.jsonl` holds timestamped observations; `live-NN.png` are viewport captures. The interrupted opening is separately recorded in `play.jsonl` and numbered PNGs without the `live-` prefix.

## 1. Does it remove the players’ quit reasons?

**It removes the immediate instruction barrier. It does not establish that these players would stay for the month.**

Marguerite, F-271, wrote:

> “I wanted to comfort him after the clinic. Instead I have six actions, Mention / Urge / Insist, and a Reason dropdown. This feels like filling out instructions for him.”

Her request was:

> “Let me respond with simple care or a question after a difficult conversation.”

That requested action now exists. At the clinic I opened “Say something else…” and saw “That was a lot to hear” and “What stayed with you from that conversation?” alongside the latest scene line. There was no instruction form or confirmation. Capture 13. The actual reply is a bounded authored continuation, not a simulated therapeutic effect (`ui/scene-words.ts:30–40`).

My clinic click came after the option disappeared and never reached the game; I do **not** count it as a completed comfort exchange or an ignored input. At 11:58 the scene had little time left even at the slowed rate. Controller inspection time contributed. Successful non-directive exchanges elsewhere included “How does the day feel just now?” → “Long. I am tired, and I do not have much to say” (62.2 s, capture 09), and asking whether he wanted quiet at work → “For this part, yes. I want to keep my attention here” (397.9 s, capture 36).

Marguerite also hesitated about “choosing an instruction and confirming it.” One-tap suggestions address that precisely. My doctor suggestion immediately received “Not now. After I rest at home,” without a preview/confirm step (94.6 s, capture 11). The full form is now explicitly “Plan something specific…”.

Leila, F-270, loved Hacer’s:

> “Keep the door open, Halil. Tell me about sitting with her. I can stand here with you.”

But she wrote:

> “I am beginning to feel I am pressing Say nothing to get to the person I want to meet.”

Her strongest problem was repeated mediation between her and the company. The Hacer scene and answer now fit together in my phone capture 18. “Keep listening” revealed additional words without another activity request: “The house feels less quiet with you at the door” / “We need not fill every silence, Halil” (198.5 s, capture 19). That answers F-279’s specific complaint that the invitation led only to another instruction. This continuation belongs to the preceding follow-up d, retained by 20b; credit the current combined build, not 20b alone.

The remaining risk is Leila’s other complaint: repeated decisions “made this feel longer than the little story I read.” Giving every new activity another generic care line can recreate that work. The original players have not retested this build. Their ledger labels are not retention evidence.

Quote sources: [Leila’s report](../../docs/lab/reviews/design-round-2026-10-20/voice.md), [Marguerite’s report](../../docs/lab/reviews/design-round-2026-10-20/voice-round2.md), [F-279 review](../../docs/lab/reviews/design-round-2026-10-20/fun-review-voice.md).

## 2. Is it fun for five minutes, and for a whole run?

**Five minutes: a worthwhile short visit, with one good conversation and a better way to leave him alone. Whole run: I would not choose the month for the new care activity alone.** That second judgment is a design assessment, not a completed live-month finding.

The player now decides whether to offer company, ask a question, suggest an activity, or keep quiet. Suggestions remain interesting when Halil’s priorities conflict with the player’s concern. Care/question choices mostly select the tone of a short acknowledgement. Their answer itself is the reward; they do not build a new conversational situation or change what he subsequently considers.

The most interesting decision occurred at 452.8 seconds. Hacer offered to stay; the screen simultaneously explained the rent shortfall and offered the afternoon shift. I suggested the shift. Halil answered, “Not now. After I talk with Hacer at the door.” Capture 40. I had a concrete reason to intervene and a concrete reason to respect his refusal. Preserve this. It makes a person’s autonomy playable.

The first Hacer continuation was worth staying for. Asking about rent and then offering care about rent were less satisfying: “What I owe Osman. I am still thinking about it” and “I keep adding it up. It is hard to set it aside.” Captures 22 and 27. They acknowledged a known concern without giving me a new particular to wonder about.

There is some variation: Ramadan 15’s Hacer scene was about finding it hard to start talking, not the table memory (capture 51). The writing is not uniformly repeated. Nevertheless, Ramadan 15’s workshop reused Ramadan 1’s four-line exchange with a different visitor (captures 06 and 49). The same care choices returned. The month asks more sustained attention than that variation currently earns.

## 3. New quit points and degenerate play

**The strongest new quit point is having the game deny that the new activity happened.** On day 1 I sent two suggestions, asked two questions and offered care. The summary said “You spoke twice.” Capture 28. It counts instructions, not all spoken words.

I reproduced the sharper ending case: send one successful care line through `RecordedGame`, then finish with the repository’s own headless driver. The sidecar retained the exchange; the simulation hash was unchanged; the report marked `spoke: false` and returned:

> “You said nothing; this was the month you never spoke.”

Evidence: `care-ending.ts` and `care-ending.json`. Cause: `sim/record.ts:66–82` keeps care outside simulation inputs; `sim/report.ts:354` checks only the suggestion ledger; `sim/counterfactual.ts:202–211` converts that into literal silence. `sim/game.ts:1815–1841` makes the analogous day-summary mistake. This punishes exactly the player who took the new invitation to offer company rather than instructions.

**The repetitive strategy is to harvest the next guaranteed line, not solve a new situation.** I reran the shipped five-minute timing policy against current source, then counted its care wording. It sent 23 care lines, but only five distinct player sentences. **Thirteen were “The rent is a lot to carry in your head.”** Five more were the same permission to miss Nuran. Evidence: `gap-repetition.ts/json`. The 17.4-second visible-choice gap is real under that policy; it is not evidence of 23 interesting decisions.

There is no demonstrated new dominant strategy for simulated outcomes: successful care leaves the simulation hash unchanged. Reading it slows real-time progress, so repeated care mostly spends the player’s break. One-per-occasion gating prevents immediate same-beat repetition, but a new rest, walk or other activity can reoffer the same topic (`ui/scene-words.ts:11–16,87–124`).

A secondary risk: care neither withdraws an earlier suggestion nor makes Halil reconsider it. That earlier instruction remains under “Your words.” A player who says “I can be quiet” may still have an active instruction. This is a source-confirmed presentation risk, not a contradiction I reproduced in live play.

## 4. What did it cost players’ loved qualities?

| Quality          | Evidence and judgment                                                                                                                                                                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Halil’s autonomy | Preserved for actions. He deferred my doctor and shift suggestions; the six pre-change full-state continuation controls passed. Care has authored answers, including requests for quiet, rather than consulting HF willingness. Relationship changes do not alter that availability gate. It supplies a consistent answer more readily than the simulation supplies agreement. |
| Their words      | More readable and more immediately answerable. Hacer’s bounded continuation delivered new words. Earlier dialogue now takes a labelled disclosure when choices expand. Generic care can still redirect attention from a particular person to the familiar tiredness/rent templates.                                                                                            |
| Ending           | Eid’s silence and the underlying outcomes remain. The new kind of companionship is missing from the report’s account of what the player said. That is a direct cost to the ending’s credibility.                                                                                                                                                                               |
| Difficulty       | No evidence that care makes the simulation easier. Quick suggestions use bare Mention; the urgent shift and ordinary company now compete visibly. Fine control and its consequences remain in planning.                                                                                                                                                                        |
| Pace             | Reading slowdown makes short occasions more readable, but frequent care takes substantial wall time. In the five-minute script, reading occupied 193.9 seconds and the run reached Ramadan 2. The alternative policy reached Ramadan 30; the policies differ, so this is not a matched speed or retention comparison.                                                          |

The repository’s measure passed for **Silent and Prefill confirmed + doctor/Selin whispers × seeds 7,23,91**: six complete campaigns, 9.90 seconds total. Both styles paid nothing by the deadline and 300 by Eid. Prefill/reminders produced 27 completed call actions and one clinic visit per run; Silent produced zero of each. Trust was 0.62 versus 0.50. These are distinct consequential outcomes, not enjoyment measures. `measure.log` preserves all output. The driver does not exercise the new React dialogue flow.

Targeted checks passed: **12 tests, one fixture-generation test deliberately skipped**, covering scene words, replay, reading playback and the six frozen legacy continuations. See `targeted-checks.log`. I did not run the complete repository check or alter fixtures.

## DL-30–DL-33

| Rule                          | Judgment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-30 Nothing cut off         | **Improved, not a full pass.** Inspected clinic care and Hacer replies had natural-height sentences; capture 40’s full shift refusal was visible above the tabs. My subsequent scroll was unnecessary for that answer and coincided with a scene change. The official phone audit nevertheless flagged clipped/ellipsised “fasting” in the header and an off-scroll planning action. Its expanded speech captures had zero findings. No claim about every long scene or sheet.                                                                          |
| DL-31 Read state while acting | **Fail for planning.** Capture 25 explicitly explains his leaning and reason, but the modal covers the scene/person and shows neither rent progress nor deadline. In the main scene, the Hacer/shift conflict did show both the concern and alternatives. The form improvement does not establish the broader criterion.                                                                                                                                                                                                                                |
| DL-32 Hands-on act every 20 s | **Timing target reproduced; meaningful density remains weak.** The current five-minute policy gave a 17.4 s longest gap with no already-visible direct line, 6.2 s including access through opening speech. Thirteen identical rent lines expose the limitation of that measure. During live play I generally had speech or a time control available; I did not measure a stricter live maximum gap. The §8 capability boundary also remains unfulfilled for care: one line per beat is a presentation limit, not a capability that tires and recovers. |
| DL-33 Act in scene, not form  | **Pass for tested quick suggestions and non-directive speech.** A visible line speaks in one act; “Say something else…” reveals dialogue choices rather than opening the planning form. Opening Speak/disclosing more still takes access taps; “one act” is not “one tap from every screen.” Planning remains optional.                                                                                                                                                                                                                                 |

Builder check: `npm run lab:phone` ran on the live build with scripted opening, speech, care and planning states. It exited 1. `phone-audit/summary.json` records the findings. Besides the DL-30 items, it flagged 40 px Speak/Let time pass/Back targets and a small Model notes control. This check is supporting layout evidence, not my fun verdict.

## Three ranked changes for one round

1. **Distinguish speaking from suggesting in day summaries and the ending.** Count accepted care/questions from the presentation sidecar for the narrative account. Keep simulation comparisons about suggestions explicit: “You offered company without suggesting an action” is honest; claiming a relationship benefit would not be. Scope: summary/report presentation and one care-only full-run control. Reason: the current ending erases the exact play style the change invites.

2. **Stop reoffering the same care topic on every new activity; develop one particular instead.** Start with clinic/Nuran: one bounded follow-up over already surfaced words, with a brief answer or a request for quiet. Track presentation topics, not therapeutic progress. Keep silence/time passing available when there is nothing new. Scope: the small scene-word bank and presentation occasion key. Reason: 13 copies of rent care satisfy a clock measure while spending the player’s break without developing the encounter. More generic lines would extend the same problem.

3. **Keep the selected person and one relevant concern readable in planning.** For a rent-related choice, retain amount/progress/date; retain a short scene line when the choice interrupts company. Keep the commit row reachable. Scope: the existing modal/context layout, not a new dashboard. Reason: the main view now creates an interesting company-versus-work decision; entering fine control should preserve what made that decision interesting.

Retest with fresh people after those changes. The specific acceptance evidence is whether they choose another visit for the conversation and can explain why they intervened or stayed quiet. A shorter maximum gap alone cannot answer that.
