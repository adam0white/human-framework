Keep pass@7’s direct cooking and service, but do not accept it as the quit fix: it replaces some watching with prescribed taps, while the interesting decisions still concern tables and people.

Reviewed 2026-10-20. This is an adversarial, source-informed design review, not source-unread taste acceptance. I read the change, its implementation, F-276/F-277/F-282, both player reports, the earlier fun review, and design-language §8. Two independent reviewers checked the player evidence and mechanical incentives. Their code findings are distinguished below from my live observations.

I played https://pass.adamwhite.work through Playwright Chromium at **360×690 CSS px**, from **14:05:17.344 to 14:15:21.068 UTC: 10 minutes 3.7 seconds**. I used normal visible buttons and real elapsed time. I accepted the default boards, played Monday through Wednesday, and stopped on Thursday at 19:34. Steady was the initial speed; I later chose Fast and returned to Steady for another manual portion. The live `/release.json` matched local HEAD **bf28f56a244bc23afe4c4d3ae555720741771369**, `dirty: false`. The downloaded notebook confirms **pass@7**, seed **1346261219**.

The session includes a 30-second locator timeout while Work grill was absent during the opening priority choice, and shorter attempts at already departed plate controls. These are tool delays, not demonstrated game failures. They also lengthen my play relative to an uninterrupted human session. I exclude missed locator inputs from game findings. I did not simulate touch ergonomics or claim a human one-thumb test. No clock injection or batched simulation was used. I did not reach Friday, Sunday, or the campaign ending in the browser.

Evidence is under `(driver scratch)/fun-pass/`: `play-tool-results.json` contains timestamped observations and inputs from 14:06:27 onward; `00-title.png` and `01-service.png` precede that log. `live-run.json` is the exported notebook. Screenshots 04, 08, 10 and 12 show cooking, the five-minute checkpoint, inspection during a ready step, and the stopping state. Both headless outputs are retained there. Only this requested review was written in either repository. The browser page is closed; both measurement commands completed. No run was sent.

**1. Does it remove the reason these players quit? Partly, and more directly for Adaeze than Tomasz.**

Tomasz, F-276: “I liked staff following the plan, but I came for running a busy room and mostly watched it run.” Adaeze, F-277: “I left because the work felt like choosing a short commitment and watching the cooks handle service.” Her specific missing activity was: “There is no chopping or serving action to perform while it cooks.” F-282’s verdict was: “Keep the rota: it removes repeated staffing requests, but the first five minutes offer too few consequential decisions, and Friday adds a needless second cover prompt.” Sources: [ledger rows](../../docs/lab/feedback-ledger.md:299), [Adaeze’s cooking reaction](../../docs/lab/reviews/design-round-2026-10-20/pass-round2.md:101), [earlier fun review](../../docs/lab/reviews/design-round-2026-10-20/fun-review-pass.md:3).

Adaeze’s literal missing verbs now exist. On Monday I reserved table 1’s grill portion at 19:11, then seared, turned, rested and plated it. The game acknowledged each act. Calling service produced “Table 1 noticed the care in their food.” A later salad required cutting, dressing and plating. This is a substantial improvement over starting a timer and discovering that the crew finished first. My exported run records **11 manual cooking steps, seven plate calls and six valid portion reservations**, with three portions completed manually and three handled on instinct. A tap on Work grill when nothing remained immediately answered “That portion is no longer on the rail.” I did not reproduce the old silent ambiguity or a wrong-table tap. I did not conduct a comprehensive target-stability test.

Tomasz’s complaint is harder. Making the kitchen wait for the next prescribed step does not itself make me the person running a busy room. Table priority does: on Monday I chose the oldest table; on Tuesday I tried the large order. Those choices name who waits. The cooking sequence gives ownership and direct action, but little judgment once I have reserved a portion. The actual quit fix remains unproven for both people; neither returned to test this build.

**2. Is it fun for five minutes? Better initially; insufficiently interesting by the second service. A whole run? I would not choose eighteen services of this sequence.**

The first careful portion was satisfying. It stayed mine, had recognizable cooking verbs, and ended in a visible service call and a table’s response. By the five-minute checkpoint, Tuesday’s salad offered the same structure: reserve, wait briefly, tap the only next act. I could choose whether to cook, which station/table to help, whom to put first, and whether to leave work to the crew. Those are decisions. “Sear now, turn when ready, rest when ready, plate when ready” is mostly execution of an answer already supplied.

At 14:10:33 I chose Fast while the salad awaited its first act. By 14:10:38 it had finished as a plain portion without further cooking taps. At 14:11:03 I reserved another grill portion at Fast; it too finished without further cooking input. I preferred that delegation after learning the recipe. I returned to Steady on Wednesday to verify that this preference was not just missing the new controls.

The notebook’s nightly results were Monday **15/15, ₺600**; Tuesday **19/20, ₺760**; Wednesday **23/23, ₺920**. I made **zero ad-hoc station asks**. I cannot attribute Tuesday’s walkout to one action without a matched replay control. The bank remained a reason to manage; repeated recipes were not the reason I continued. Rafi’s jar decision was more interesting than another turn/rest sequence.

My whole-run judgment is a forecast from this opening and the code, not a claim to have experienced all eighteen services. Later coverage, hiring, bills and the wedding can add consequential choices. Neither the browser opening nor the headless results establishes that repeating these cooking prompts between them will remain enjoyable.

**3. New quit points and strategies**

- **The next cooking tap repeatedly slows the whole room.** At Steady, every ready act switches playback to **0.1 game min/s**. The eight-game-minute care window therefore offers roughly eighty real seconds at that rate, rather than a tight timing decision. On Wednesday I inspected Selim while table 3 awaited searing. After an explicit 22-second wait it was still ready. I closed his sheet and seared at 20:10; it still counted as “At its moment; taking care.” This protects reading, which is good. Repeating it for every stage makes the room’s pace depend on acknowledgment. Evidence: `10-still-ready.png`, observations at 14:12:45, 14:13:18 and 14:13:31; [clock.ts:31](../../../pass/src/ui/clock.ts:31), [kitchen.ts:2963](../../../pass/src/sim/kitchen.ts:2963).
- **The slow step can hide behind the person I am reading.** Selecting Selim removed the rail and cooking controls, while the top still said the portion was ready and time stayed slow. I had to close his sheet to do the act. This is a reproduced interaction cost, not an endless deadlock: close and Fast remain available. It makes attending to the people compete with attending to prompts. [style.css:754](../../../pass/src/ui/style.css:754), [style.css:816](../../../pass/src/ui/style.css:816).
- **Calling every plate immediately is locally dominant.** It spends no modeled time or capacity, remains legal while cooking, and removes waiting. Shorter waiting can improve tips and regular regard. I found no compensating reason to hold a finished plate. It is a useful service gesture, but usually not a decision. [kitchen.ts:1092](../../../pass/src/sim/kitchen.ts:1092), [kitchen.ts:1911](../../../pass/src/sim/kitchen.ts:1911), [kitchen.ts:1955](../../../pass/src/sim/kitchen.ts:1955).
- **Fast is an attractive escape from the new activity.** Careful quality earns a line of recognition; quality and freshness themselves do not enter payment, tips, critic response or regular regard. Elapsed waiting still does. Instinct and timely manual steps use the same three-game-minute intervals. The matched measure therefore feeds the same number under both policies. This is evidence of a weak incentive to choose manual care, not proof that Fast or never cooking dominates the whole campaign. [kitchen.ts:3024](../../../pass/src/sim/kitchen.ts:3024), [kitchen.ts:1938](../../../pass/src/sim/kitchen.ts:1938).

**4. Did it cost anything players loved?**

| Aspect | Evidence and judgment |
|---|---|
| People’s autonomy | The rota remains useful. Rafi refused food-station relief on Tuesday and Wednesday; I left that refusal intact. Selim independently took maghrib during Monday’s agreed break. The earlier repeated missed-prayer problem did not recur in the evenings I reached. Accepted cover still constrains ordinary autonomy, as before pass@7. I found no new pass@7 simulation loss of cook autonomy. |
| Their words | Their words remain, but the added cooking/runner narration occupies attention. On the phone, the illustrated kitchen became tiny below the rail and cooking controls (`04-ready-sear.png`). Inspecting a person hides the food controls. At Wednesday close, Rafi still said “I didn’t keep my rule about the jar. Next time I’ll be ready when it comes.” I chose to sit with him. These moments held my interest more than the repeated recipe. |
| Service proceeding without nagging | Preserved. I made no station asks. Runner fallback visibly served unattended plates, and Wednesday fed every table despite long stretches without my food inputs. Calls remain optional. |
| Ending | Daily accounting and personal lines survive and worked in my session. The campaign ending still uses money, trust, crew membership and remembered words in [app.ts:1700](../../../pass/src/ui/app.ts:1700). I did not play it; its emotional effect is untested. Cooking delays can change which ending is reached. |
| Difficulty | The matched attentive policy feeds **440/447**, down from **446/447** in pass@6, while chef exertion rises. Hands-off remains **421/447** in both editions. This is a modest measured production cost, not evidence of better human difficulty. The full-campaign measure still rewards flexible staffing: `flex` survived 3/3 seeds; `none` survived 0/3. No matched pass@6 full-campaign control was run. |

**Headless evidence and DL-32/DL-33**

I ran the repository’s own commands without changing them:

`node scripts/measure-hands-on.ts` — exit 0; 108 service rows: editions 6/7 × seeds 7/21/42 × three policies × six services. Output: `measure-hands-on.jsonl`.

| Across 18 services per edition/policy | pass@6 attentive | pass@7 attentive | pass@7 instinct | pass@7 hands-off |
|---|---:|---:|---:|---:|
| Mean counted acts/service | 17.28 | 86.39 | 86.39 | 0 |
| Tables fed | 446/447 | 440/447 | 440/447 | 421/447 |
| Careful/hot plates | Not recorded | 221 | 0 | 0 |
| Manual station asks | 0 | 0 | 0 | 0 |
| Mean chef exertion before evening recovery | 0.192 | 0.242 | 0.242 | 0.049 |

The instinct column counts machine-issued cooking steps as acts; it is not 86 human taps. It uses default clock timing to isolate quality, not browser Fast duration. All policies inspect each game minute without human reading/reaction delay. The hands-off policy still answers personal requests and handles boards and staffing; it means no chef food work, plate calls or table-priority inputs, not zero inputs.

`node scripts/measure.ts` — exit 0; 15 full campaigns, seeds 1000–1002. Survivals: `none` 0/3, `ask` 1/3, `insist` 0/3, `care` 1/3, `flex` 3/3. These bots do not use chef cooking or plate calls. They do use default boards, personal-request responses and scripted Sunday choices including hiring. Output: `measure-campaign.jsonl`. Successful flexible management without cooking is valuable evidence that the campaign still has strategic work; it also prevents claiming that the new recipe sequence is necessary to win.

| Standard | Judgment |
|---|---|
| **DL-32: something meaningful for the hands every 20 real seconds** | **Narrow builder availability pass, enjoyment unresolved.** The attentive pass@7 policy’s worst Monday gap is **20.00 s**, the final clear-rail interval; through the last feed the worst is **16.33 s**. There is no margin at close. In live play, I explicitly waited twelve seconds and then nine seconds near Monday’s end, but the first interval also included food finishing and fallback service; I cannot call the whole interval unavailable. My desired act was to finish the shift. I did not measure a live >20 s interval with no act available. The larger problem was wanting a consequential act rather than another prescribed tap. The headless threshold passes; that does not settle its word “meaningful.” |
| **DL-33: core acts on scene things, without forms** | **Pass for the cooking and serving routes reached.** I tapped stations/portions and plates directly; no planning form was required. These text controls represent the work itself. The chef tires through the existing cooking activity, and slowdown avoids reflex demands. However, direct verbs can satisfy this rule while still offering little choice. Inspection hiding them is a separate friction point. |

**5. Three ranked changes, each bounded to one round**

1. **Test one real cooking branch on the cold side.** After cutting, offer “Plate now” for a plain portion or “Dress carefully” for three more kitchen minutes before plating. Keep the consequence in the food and the table’s words. Keep final service direct. Trial only this recipe. This replaces one prescribed acknowledgment with a choice about whose food deserves my time; test whether players can name a reason for choosing each route. Do not accept a higher act count as success.

2. **Offer “Finish this portion on instinct” beside the active portion at Steady.** Keep delegation for every remaining recipe step, produce the existing plain result, and preserve the selected room speed. This needs a portion-level delegation state: the current instinct flag resets after each act ([kitchen.ts:3035](../../../pass/src/sim/kitchen.ts:3035)). At present the convenient way to delegate the recipe also accelerates the rest of the kitchen. A local delegation choice would let me attend to a person or a service problem without changing the pace of the whole room. Test it during an active portion and a personal request.

3. **Keep one compact active-portion control visible during cook inspection.** Include the next act and local delegation from change 2; leave the larger rail hidden if space requires it. Reproduce Wednesday’s ready sear → inspect Selim → act or delegate without closing him. This removes the demonstrated conflict between reading a person and tending food. Preserve readable words; do not solve the fit by shrinking the text.

Taste acceptance remains with the owner/lead. This review supports keeping the new direct verbs and the rota, while testing whether one cooking decision can make the food work worth repeating.
