Screenshots and other evidence files stayed in the driver's scratch folder and are not kept; absolute local paths were replaced by relative names or "(driver scratch)". No other wording was changed.

Keep the rota: it removes repeated staffing requests, but the first five minutes offer too few consequential decisions, and Friday adds a needless second cover prompt.

Reviewed 2026-10-20. This is a game-design judgment, informed by source. It is not a fresh source-unread acceptance test.

I read the design change, both player reports, F-243/F-256, and the implementing simulation and UI. I then played the live build through Playwright Chromium at **360×690**, with touch/mobile emulation, from **12:27:00 to 12:37:20 UTC: 10 minutes 20 seconds**. I played Monday through Friday, using Steady then Fast. The page continued running during observations and tool waits. Several locator attempts missed transient controls; I exclude those failures as game evidence. Live `/release.json` matched local commit `7116cfc8fe32b8e2504ed9f29ba382d515d599b6`. The downloaded run identifies **pass@5**, seed **1616974005**, with 22 simulation inputs. I did not play Saturday, Sunday, or the campaign ending myself.

Evidence is in (driver scratch) (driver scratch): timestamped observations (driver scratch), exported run (driver scratch), screenshots, and both measurement outputs. Temporary evidence files may need copying for long-term retention. Only this requested review was written in either repository. No source was edited. Browser and Node REPL were closed; both measurement processes completed.

**1. Does it remove these players’ reason for quitting? Mostly yes. It does not establish that they would return.**

Joon, F-243: “I would not voluntarily return on another short break: asking cooks back to stations was more of the activity than the food, and I could not read the duration of those requests reliably.” (report:112 (driver scratch); ledger:266 (docs/lab/feedback-ledger.md:266)).

Rosa, F-256: “grill is still empty, Rafi is still on dishes, and I do not want to keep pulling people back into place on my break. I would not start another service now.” Her requested experience was: “I want to make an occasional staffing decision, not repeatedly discover an empty grill.” (report:137 (driver scratch); ledger:279 (docs/lab/feedback-ledger.md:279)).

The change answers that request. I changed Dilek’s break to 21:00 before Monday, then made **no service inputs on Monday or Tuesday**. Both nights fed every table: 15/15 and 20/20. Selim took his planned break and returned without my asking. Tuesday’s board plainly preserved Rafi’s refusal: “I’ll wash plates instead. I haven’t agreed to that cover.” A known gap no longer required me to keep asking him.

Implementation matches this observation: planned breaks and automatic returns use the accepted station agreement (kitchen.ts:2480 (driver scratch)); planned gaps do not create staffing prompts (kitchen.ts:2595 (driver scratch)).

The repo’s six-night comparison also supports a real reduction, rather than just better wording:

| Same plain policy; seeds 7, 21, 42; 18 services per edition | pass@4 | pass@5 |
|---|---:|---:|
| Manual station asks | 29 | 0 |
| Board proposals | 0 | 18 |
| Staffing decisions | 0 | 8 |
| Uncovered station-minutes with demand | 2,116 | 936 |
| Tables fed | 378/447 | 439/447 |

Command: `node scripts/measure-rota.ts`. Raw output (driver scratch). This policy asks only when an idle cook is available, answers requests yes, and uses defaults. It is not an optimal player or an enjoyment measure. Friday remains worse on uncovered demand: 501 versus 489 station-minutes across the three seeds, matching the documented averages of 167 versus 163.

**2. Is the new activity fun for five minutes, and for a whole run?**

**Five minutes: weak for me.** The board is a useful planning decision: whose station waits during a meal, whether to borrow somebody, and whether to accept their refusal. But accepting the proposed arrangement mostly settled the first two services. By five minutes I had finished two nights and attempted one food contribution. That contribution was redundant: “The crew finished table 4’s cold plates before me. I put my ingredients back.” (screenshot 18 (driver scratch)). All **three** successful Help inputs in my exported run ended with the crew finishing first. This makes my food involvement feel optional in the least rewarding sense: I can tap, but the kitchen often did not need me.

**Friday was substantially better.** Dilek’s mother fell. I let her leave. Covering cold meant either taking Selim away from a backed-up grill, taking Rafi away from dishes, or accepting no cold production. I chose Rafi. Later there were no clean plates, so I sent him back to dish; one final table was fed. Friday ended 24/27, with the critic pleased. These are interesting decisions because improving one bottleneck creates another. They also fit Rosa’s request for an occasional staffing decision.

**A whole run: I would not yet choose eighteen services on the strength of this opening.** That is my forecast, not a claim to have played the campaign. The later oven, hiring, tabs and deadlines offer more decisions, and the headless results show that management matters. They cannot establish that the time between those decisions is enjoyable. The early service still asks me to watch too much before its best choice arrives.

**3. New quit points and strategies**

The strongest reproduced problem is a **second prompt for a tradeoff already accepted**. At Friday 19:43 the cover button said “Ask Rafi to cover — Dish pit waits.” After I chose it, the game raised another prompt: “Rafi: I’m off my agreed station, Chef.” It slowed to 0.1 min/s. The only offered action was **“Leave it uncovered.”** (first choice (driver scratch); second prompt (driver scratch)). This choice plays itself. I had already accepted the dish gap. I did not reproduce an endless loop; I reproduced one redundant interruption, followed by another wait for the queued answer.

The code explains this exact case. `detectBoardGaps` suppresses the borrowed cook’s original-station alert only when their temporary cover ends **before** close. Dilek’s absence lasted until close, so Rafi’s cover failed the strict `< closeAt(...)` condition (kitchen.ts:2606 (driver scratch)). An independent mechanics reviewer confirmed this reading. This violates the design’s intended one staffing choice for the absence.

The broader quit point is **successful service with little player contribution**. Default agreements, Fast, and accepting known gaps worked exceptionally well early. That is a low-effort opening strategy, not a proven dominant campaign strategy. Help has no ingredient, money, or fatigue penalty for cancellation, which encourages opportunistic taps; however, its five-minute slot can block another Help task, so “always Help” is not proven globally dominant (kitchen.ts:1006 (driver scratch), 2249 (driver scratch)).

**4. What did it cost?**

The autonomy judgment below is mine. These reports explicitly value responsive people, brief remarks and useful interventions; they do not explicitly ask for unrestricted cook autonomy.

| Aspect | Finding |
|---|---|
| People acting for themselves | **A material cost.** Accepted work already constrained autonomy in pass@4; pass@5 extends that arrangement through close, with scheduled breaks and automatic returns. Ordinary decision review is bypassed during cover, apart from explicit requests and the new interruption machinery (kitchen.ts:1304 (driver scratch)). Selim said on **all five evenings**: “I missed maghrib (sunset prayer) tonight. Tomorrow I step away before the rush.” Yet his agreement carried on unchanged. His default break ends at 18:30; prayer becomes available at 18:35. Default cover therefore excludes his quiet act from ordinary choice. This is a concrete loss of autonomous follow-through, even though a player can intervene. |
| Their words and consequences | **Mostly preserved.** Rafi refused relief. After our Wednesday talk, Thursday said “Rafi looked at the jar, then went and scrubbed the trays.” Friday Dilek said “You let me go to her. I won’t forget it.” Those responses made people matter. Selim’s repeated unfulfilled resolve weakens that credibility. |
| Food moving without plate tapping | **Preserved.** Rosa explicitly liked this (report:45 (driver scratch)). Replacing the old staffing repetition with compulsory portion taps would cost that pleasure. |
| The ending | **Daily closes preserved.** Tables fed, debt remaining, crew remarks and a reason for tomorrow still work. Joon valued “Tonight felt like a kitchen again”; Rosa valued the end-of-night accounting. I did not experience the campaign ending and cannot certify its emotional effect. |
| Difficulty | **Reduced early; still consequential later.** The matched six-night policy fed 61 additional tables. Full-campaign bots still lost through poor coverage or insisting. There is no matched pass@4 campaign control here, so the size of the campaign difficulty change is unknown. |

I ran `npm run measure -- seeds=3 p=none,care,flex,push`, covering seeds 1000–1002. Both requested repo measurement runs completed successfully. Full output (driver scratch):

| Policy | Campaigns survived | Crew departures |
|---|---:|---|
| `none` | 1/3 | None |
| `care` | 3/3 | None |
| `flex` | 3/3 | None |
| `push` | 0/3 | Departures in every run |

Crucial limit: `none` still accepts default boards, answers personal requests yes, declines emergency cover, and makes scripted Sunday choices including hiring. It means no routine service bot actions, not literally zero inputs. None of these bots uses chef Help. Survival is evidence of balance behavior, not fun. Aggressive insisting remains costly; the change has not made people consequence-free equipment.

**5. Two ranked changes, each bounded to one round**

1. **Treat the source-station gap as accepted when borrowing a cook explicitly names that gap.** Cover the until-close case as well as shorter absences. Keep the consequence visible; do not ask the player to approve it again unless circumstances change. Reproduce Friday’s mother call, borrow Rafi, and verify there is no second one-option prompt. This removes a demonstrated interruption with no lost decision.

2. **Swap the first two default meal times so Selim’s break overlaps his existing private-action window.** Give Dilek 18:10–18:30 and Selim 18:35–18:55, preserving staggered breaks. Keep those times selectable on later boards, and let the existing break decision choose prayer or food. Do not add an objective, reward or recurring religious prompt. The current default reliably produces a resolve that the standing agreement prevents him from following. This small schedule correction restores one human act without bringing back repeated station requests.

I am stopping at two recommendations. Chef station relief sounds promising, but twenty-minute relief could cover every staggered default break, and it needs production and eligibility rules. That is not yet a small, justified fix for the weak food activity. Making Help compulsory would preserve neither player’s best experience.
