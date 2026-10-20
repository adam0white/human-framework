Keep 20b as a phone visibility repair; it does not yet make Twice at the Well a compelling whole run, and scene overlays still hide people and their words.

## Evidence and scope

I read the 2026-10-20b design note, its implementation, F-272/F-273/F-280 and their reports. I played the live site myself through Playwright at 360×690 CSS px, mobile/touch emulation, light theme and default text. Live `/release.json` identifies commit `aa14a254900567cea414f3bd289157077c7b1ca4`, framework 2.9.0, clean build. Local HEAD matched. The reviewed change is `a2648ff`, “Keep Well state and orders visible on phones.” Its diff changes presentation and lab-kit integration, not colony simulation files. This is source-informed adversarial play, not a fresh source-unread persona or physical-phone test.

Retained live observations run from **2026-10-20 14:14:05 to 14:24:04 UTC: 9 minutes 59 seconds**. Speed stayed at 1×, with automatic suggestion slowdown. I reached the Day 3 dawn ending after nine orders, downloaded the run, then started Another day solely to check its deadline while ordering. I did not complete the optional extra day. Export: seed `20261003`, scenario `colony-scenario@4`, minute `2880`, hash `1ba2b9270f646b`. Two independent source reviewers checked mechanics, player evidence and the draft; I verified their findings against source and live play.

Evidence stays in `(driver scratch)/fun-well/`: `live.jsonl`, numbered screenshots, `release.json`, layout audits, `balance-source.jsonl`, `selfplay-source.txt`, `replay-source.jsonl` and `live-replay-source.json`. Reading and controller work consumed real play time. An initial Play click left the title visible; the second started play, as in the earlier reports. I do not establish the cause. No run was sent or telemetry preference changed. Only the requested review is written inside the repository.

## 1. Did it remove the reasons those players quit?

**Hana: selection friction is substantially repaired in this test. Omar: the missing information and immediate stale claim are repaired, but the history rule later misleads and the reason to keep playing is not. F-280: the whole-run criticism remains.** These observations cannot establish either persona's voluntary return.

Hana: “Picking people and places took too much fiddling for a lunch break.” She stopped at 245.2 seconds after three orders. Her report explicitly says, “I was not bored during the short stretches watching people work” ([well.md](../../docs/lab/reviews/design-round-2026-10-20/well.md), Best, worst and stopping). Do not turn her request into a demand for compulsory busywork. My Worker → Yusuf → Place → House sequence worked without scrolling through the choices. Confirm remained reachable with options open. Yusuf ate, then built; that delivers the work she enjoyed watching.

Omar: “Maryam is resting, the house is still a frame, and I am looking at a mostly empty patch of village.” He also wrote, “I came for quick dispatching and watching work; I do not feel pulled to give another order or wait for the storm.” His concrete request was, “Let me read current roof progress, stored meals and the storm deadline on the phone as easily as on desktop” ([well-round2.md](../../docs/lab/reviews/design-round-2026-10-20/well-round2.md), diary and ranked changes). At 76 seconds I could read Human Roof 3 of 10, Meals 7 and Storm Day 2 19:00 while preparing Maryam → House. At 129 seconds, after her cooking refusal, the Forest suggestion quoted it and said, “This is an old suggestion; Use checks the current answer.” The contradictory “free until noon” claim was gone. Evidence: `10-maryam-house.png`, `17-stale-suggestion.png`.

His third request remains vulnerable: “Keep more of the village visible while I choose an order. Watching the people is why I would play.” At 170 seconds the order sheet plus status left a scene only about 190 px tall. Tariq and the House were at its lower edge under the status. The state is readable; the subject is not reliably visible. The screenshot at 180 seconds also shows a large empty lower map area after leaving composition; explicit Follow improved the framing. Evidence: `20-costs-order.png`, `21-afternoon-watch.png`, `22-follow-restored.png`.

F-280 said, “Keep the change: it makes the people worth watching on a phone, but it does not make repeated orders interesting enough for the whole run” ([earlier fun review](../../docs/lab/reviews/design-round-2026-10-20/fun-review-well.md)). 20b adds no new core activity. Easier access to the same orders does not resolve this objection.

## 2. Is it fun for five minutes, and for a whole run?

**Five minutes: pleasant when I choose to watch; still too much order handling for a quick dispatch game. Whole run: intermittent interest, without a strong reason for immediate replay.**

The interesting decision is whether to interrupt this person now. I declined the cedar's injury risk and the night-squall request. I sent Maryam to build before her meal duty, then deliberately tested the same request near noon. She refused: “And leave the pot cold at noon? No. They eat from my hands.” I left her cooking. I later left an already working Tariq alone instead of confirming a redundant order, and accepted daytime timber work. Those are concrete judgments about people, timing and risk.

The weaker decision is choosing the next person for House again. Samira's rushed House request lapsed while she kept gathering grain. The next morning's suggested House request produced the same deferral. The people have reasons; my response options have little development. The new sheet makes this tolerable without making it richer. At night I chose to watch rather than wake someone. That quiet interval is legitimate; it should not be filled with mandatory chores.

The ending kept that distinction honest. Classic roofed; Human and Solo both failed at 9/10. Human stored 16 meals at the storm, exactly Solo’s stock, and everyone survived. At dawn Human had seven meals versus Solo’s three, but seven injuries versus Solo’s five. The next roof stage had been 33% complete at the deadline. The report said, “Your 9 orders changed: meals stored 7 (without you: 3); injuries 7 (without you: 5). No other differences are visible in this report.” It then prescribed repeatedly re-ordering the five non-cooks to House with Rush whenever orders end. That is an honest account of my limited contribution. It invites more efficient request renewal rather than a more interesting next decision. I would not choose an immediate replay. Evidence: `52-ending-readable.png`, `live-run.json`.

## 3. New quit points and degenerate strategies

**New or exposed by this presentation:** words and people compete with permanent overlays. At 212 seconds, Samira's “Not that — I'll gather grain; that is my work” bubble ran behind the Classic/Human switch. The current status showed Yusuf's answer, so it did not preserve her complete refusal in the visible status. The audit at 220 seconds independently reported both switch buttons intersecting that bubble. At 254 seconds, injury news occupied roughly the bottom 200 px of the scene. These are reasons to leave for someone who came to watch people, even though the order form itself fits. Evidence: `26-evening-yusuf-sent.png`, `27-nightfall.png`, `30-hurt-idris.png`, `audit-watch-evening.json`.

**New: the stale-history repair can explain the wrong task.** At 484.8 seconds, Day 2 17:24, Maryam → Kitchen replaced its proposal with her earlier refusal to leave cooking for House: “And leave the pot cold at noon? No. They eat from my hands.” Asking her to cook is precisely the opposite of the request she refused. The code matches only person and refusal state, then replaces the proposal and suppresses its reason (`parts.tsx:585–607`). It does not require the same task or show the earlier answer's day/time. The noon Forest card was honest and useful; this later Kitchen card makes history misleading. Evidence: `46-shutters.png` (filename was my anticipated card, not the card actually shown).

**A new information error appears on Another day:** `VillageStrip` always takes the storm marker before the current project deadline (`PhoneStage.tsx:25–26`). The timeline retains the Day 2 storm (`game.ts:834–844`), while the store-room and meals are judged on Day 3 at 18:00 (`game.ts:803–818`). The strip therefore continues to say Storm Day 2 19:00 while the player is planning Day 3. Confirmed live at 599 seconds: Day 3 05:07, with Give an order open, the strip still said “Storm Day 2 19:00,” despite the preceding intro setting today’s store-room/meal deadline at 18:00. Evidence: `54-another-day.png`, `55-daythree-deadline.png`.

**Inherited, not created by 20b:** the best of the five measured policies repeatedly sends the five non-cooks to House with Rush, adding Maryam to Kitchen on Day 2 afternoon. It wins roof, food and lives on both sides and the Day 3 goals on this seed. It is a strong repetitive recipe, not a proven dominant strategy across seeds. Its injury cost is real. Suggestion-only play produces a worse Human house than no orders. Treating the cards as the principal activity invites a player to do more and achieve less.

There is still no separate scene act: the player selects a worker, a place and possibly modifiers, then confirms an order. Do not advertise this release as a new hands-on activity.

## 4. What did it cost players loved?

- **Autonomy survives.** Yusuf ate before building. Maryam refused cooking interruption. Samira continued her own grain work. These were the strongest moments, not obstacles to remove. Omar's “Good, he ate and cooked without me babysitting” still describes the appeal.
- **Their words survive in state and history, but compete for visible space.** Omar loved that Maryam “felt like a person with work she cared about.” The improved refusal history supports that. The obstructed Samira bubble weakens it.
- **Watching loses space during decisions.** Persistent state is worth its cost, but duplicating old order replies in both the scene status and sheet consumes space that could show the person. The one-village-at-a-time comparison is an earlier tradeoff retained here.
- **Difficulty and the ending's rules are retained.** This UI commit changes no colony rules. The two committed replay fixtures reproduce their expected hashes with the repository's prescribed person-engine stamp normalization for historical fixtures. I reached the full comparison, Solo baseline, order history, character outcomes and winning counterfactual. Their content survived, even though the report’s winning recipe reinforces the repetitive activity.

## DL-30 through DL-33

| Rule | Judgment from this review |
|---|---|
| DL-30 Nothing is cut off | **Fail in the scene; improved in sheets.** Ordinary forecasts, Rush/Safety costs and the stale-suggestion explanation fit in the reached sheets. The audit found no issue in the costs or stale-suggestion captures. But village-switch buttons covered Samira's words, confirmed by screenshot and audit. Long order history scrolling is not itself a failure. |
| DL-31 Read state while acting | **Substantial improvement, incomplete.** Roof, meals and the dated storm remain visible during ordering. Camera framing does not reliably reserve the space taken by controls/status, so the selected subject can disappear behind them. The Day 3 deadline is wrong. The documented 200% page-flow exception was not retested here; its fixed-strip guarantee is explicitly waived. |
| DL-32 Something for your hands | **Not demonstrated.** In the first five real minutes I found orders through forms, options, selection and watching; no qualifying nonform act. The rule explicitly excludes choosing from a form and confirming a preview. Chosen watching is allowed by this rule. When I wanted to help construction, my only intervention was another order through the composer. I did not establish a forced dead wait; another order was generally possible. The longest attended gap without a qualifying act was not timed separately. The self-play's lull metric measures low engagement, not time with no hands-on act; it cannot certify the 20-second requirement. No builder availability measure was found. |
| DL-33 Acts happen in the scene | **Fail for the ordinary core verb.** Person/place taps prepare a form; Confirm sends it (`App.tsx:224–239`, `PhoneStage.tsx:247–286,417–427`). Consequential choices deserve a preview, including plain requests with action-specific danger. There is no scene-first way to make a lower-stakes request in one act. |

## Three ranked changes, each bounded to one round

1. **Reserve a visible scene rectangle for people and their speech.** Subtract the village switch, Follow and actual status/news height from camera and bubble placement. Keep the latest actionable response; put older replies/news behind a labelled history control rather than showing duplicate copies. Recheck the noon refusal, Samira's grain refusal and an injury while ordering at 360×690. This directly protects the thing both players enjoyed.
2. **Make refusal history relevant to this request.** Match the earlier task as well as the worker, show its day/time, and retain the new proposal's rationale and danger. Maryam refusing to leave cooking for House is not evidence against asking her to cook. Recheck the next-day Kitchen card after her noon House refusal. This changes copy selection only.
3. **Show the active project's deadline after the storm.** On Day 3 display “Store-room by Day 3 18:00” and the current food target; keep the completed storm as history. This is a small copy/selection fix with no simulation change. The persistent strip must not confidently show yesterday's deadline.

These three repairs do not resolve whole-run repetition or DL-33. A scene-first ordinary request would need a separate design experiment, with previews retained for danger and promises.

## Headless evidence

Executed without building or changing source:

- `node --import (driver scratch)/fun-well/source-alias.mjs apps/site/scripts/hf-colony-session.ts seeds=2`: all eight repository personas, two seeds each. Twelve finished; restless and rulesLawyer quit on both seeds from distress. Restless issued 81/87 orders; rulesLawyer 67/55. Only one finisher met the final Human project goal; all finishers met stock and survival. These are simulated personas, not human votes.
- The repository's `play(PATTERNS[name](), 20261003, true)` for every policy, invoked from a scratch script:

| Human policy | House at storm | Meals at storm | Injuries by Day 3 dawn | Roof met? |
|---|---:|---:|---:|---|
| No orders | 9.72 | 16 | 5 | No |
| Follow suggestions | 8.97 | 16 | 11 | No |
| Repeated good orders + Rush | 10 | 23 | 10 | Yes |
| Everyone to Forest | 8.21 | 16 | 5 | No |
| Repeated good orders + Insist | 9.74 | 12 | 12 | No |

- Committed @3 replay: `0e3098aa7a50ab`; committed @4 replay: `094447bbacb73f`, both after normalizing only person-engine metadata using the repository helper. The downloaded live run replays exactly to `1ba2b9270f646b` with no normalization. Initial Node runs resolved an existing framework dist whose person-engine stamp differed from the live source. I reran balance, personas and replay checks with a scratch resolver matching Vite’s source alias. The balance outcomes were unchanged. No build was needed.

The HF adapter reads every villager's bubble without camera navigation and submits orders as single actions. Its freely composed orders offer plain, Insist and Safety variants, not Rush (`hf-colony-adapter.ts:172–246`). It cannot validate phone friction, scene visibility or the repeated Rush policy. Its reported longest lull is engagement below 0.45 (`packages/playtester/src/reading.ts:34–55`), not DL-32 availability.

Cleanup: the isolated browser processes exited after signalling the controller. The controller required TERM then KILL, both addressed only to its exact PID `51801`; no name-based process kill was used. Initial optional browser-module/cache attempts failed before the retained session; the working controller used the installed Chromium 1248. No repository build or test cache was created.
