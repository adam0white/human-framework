Screenshots and other evidence files stayed in the driver's scratch folder and are not kept; absolute local paths were replaced by relative names or "(driver scratch)". No other wording was changed.

Keep the change: it makes the people worth watching on a phone, but it does not make repeated orders interesting enough for the whole run.

## Evidence and limits

I played the live build myself through Playwright at **360×690 CSS pixels**, touch/mobile emulation, from **2026-10-20 12:08:53 to 12:19:13 UTC**: **10 minutes 20 seconds**, including reading the ending. I reached Day 3 dawn, gave nine orders, and did not start Another day. Speed stayed at 1×, with the game's automatic suggestion slowdown. This was an emulated phone, not physical-device testing. Reading, controller work and note-taking occurred while time ran; elapsed time is not a clean measure of an ordinary player's decision speed.

Live `/release.json` and the downloaded playtest identify **222e472ee60410da8ad334922f5283718fb7f5a0**, HF/engine **2.9.0**. The reviewed design commit is **c5406d0**, “Put the village first on phones,” merged into that build. Export: `(driver scratch)`, seed **20261003**, scenario **colony-scenario@4**, minute **2880**, hash **0fe62ee68de96e**. Screenshots named below are local `(driver scratch)` files. No feedback was sent. Only this requested report was written in the repository. The isolated browser was closed; its server was stopped by exact PID **11471**.

I read the design note, both retest reports, ledger F-249/F-258, and the implementation in `App.tsx`, `Pane.tsx`, `parts.tsx`, `map-view.ts`, `renderer.ts` and `colony.css`, alongside the simulation's playback, policies and end report. Two independent source reviewers checked player evidence and mechanics. Their findings were checked against my play and source reads.

## 1. Does it remove why Aiko and Pedro quit?

**Pedro: substantially yes in this test. Aiko: substantially, with a remaining failure when using options. Neither player's voluntary return is established.**

Aiko: **“I like these people, but on the tram I am spending too much attention finding the order rather than giving it.”** She also wrote **“I was frustrated more than bored.”** Her best moment was **“Yusuf and Tariq raised the beam together. That is a nicer payoff than a bar filling.”** Her problems were unreadable order context, tiny destinations and opening inspection when she intended selection. See `scratch/followups/retest/well.md`, especially “Best, worst, and leaving.”

Pedro: **“The differences in people's replies interest me, but I want to see the people act.”** His first requested change was **“Let me see the workers and the selected job while giving an order on the phone. I need to watch somebody go and do it.”** He quit at 235.5 seconds. He valued Yusuf's waiting → agreement → completion history. He did not quit because prayer delayed an order. See `scratch/followups/retest/well4.md`, “Best, worst and desire to quit” and “Stop and return.”

My first minute supplied Pedro's missing experience. Labelled Worker and Place pickers prepared Yusuf → House. The map showed both ends and their connecting line. Confirm collapsed the sheet; I watched Yusuf eat, walk to the House and build. At about 100 seconds, Maryam → Forest said **“Will refuse: the others would go unfed.”** Replacing her with Idris retained Forest; he later visibly gathered timber. I did not have to guess a tiny destination or open an unwanted life sheet. Evidence: `order.png`, `follow.png`, `maryam.png`, `idris-forest.png` under the screenshot prefix above.

The implementation supports those observations: `App.tsx:183` preserves the destination when changing workers; `:202` retains the confirmed worker and collapses composition. `Pane.tsx:309` makes person taps select. `map-view.ts:18` frames the worker and destination.

Aiko's composing frustration is not entirely gone. Opening options and selecting Rush covered Confirm. Playwright's ordinary click timed out because `.composer-row.toggles` intercepted it; closing options restored access. I also found no visible Watch village control after opening composition merely to inspect Idris. The code explicitly hides it in ordering mode (`colony.css:4197`). The player can still see a map, but cannot simply restore the large watching layout without another route. These are new costs of this sheet, not claims that the old layout was preferable.

## 2. Is the activity fun for five minutes and a whole run?

**Five minutes: yes. The full run: intermittently; I would not choose an immediate replay.**

The enjoyable decision is **whether this person should be interrupted now**. Leave Maryam cooking or take timber? Accept the cedar's injury risk? Send a rested worker by day instead of forcing someone into the squall? Give Yusuf a job that can wait until after prayer? These choices make restraint an action. The revised map finally gives the restraint and interference visible subjects.

I declined the cedar and night-squall orders, replaced Maryam with Idris for timber, and later sent Samira to help the House while leaving Danyal at the well. Seeing several people thirsty made “The well can wait an hour” advice worth questioning. That was more interesting than selecting whoever had a green forecast.

The problem is repetition. By the second day I was checking the House, sending another person there, and waiting through familiar need-related delays. Samira's rushed House order lapsed and she returned to grain. Discovering that in the order log was a useful disagreement, but the response was another House order. Watching contains character; the winning work contains too much renewal of requests.

The ending quantified my weak effect:

> Your 9 orders changed: storm stock 17 meals (without you: 16 meals); injuries 7 (without you: 5). No other differences are visible in this report.

Classic roofed; Human and Solo both missed at 9/10. Human was one stage short, the next 58% done. Everyone survived. That is an honest and potentially moving rebuke to interference. It also means ten minutes of my management produced little useful change. The report then prescribed repeatedly rushing five workers to the House whenever their orders ended. I felt invited to service expiring orders more efficiently, rather than understand the people more deeply. Evidence: `before-dawn.png` and `ending-plan.png`.

## 3. New quit points and degenerate play

**New: following someone can hide the reason to stop following them.** While I watched Yusuf, Idris was injured elsewhere. During the storm Maryam sheltered prominently while injuries accumulated outside the camera. Hurt news was crowded against the sheet; it had no direct “Show Idris” action. I eventually used Worker → Idris → Options → About. The important question—what happened to him?—became navigation again. The camera solves Pedro's request for one worker, but can obscure the village's competing claims on attention.

**New: opening composition can trap watching behind an unnecessary task.** Confirm is covered while options are open, and Watch village disappears in ordering mode. This is especially irritating when the player's purpose was curiosity about a person, not another order. Evidence: `options-block.png`, the click interception above, and `colony.css:4063–4103,4197`.

**Inherited, now more conspicuous: clear cards to recover speed.** An unanswered suggestion changes 8 sim minutes/second to 1. A full hour then takes 60 real seconds instead of 7.5. I repeatedly opened, used or skipped a card partly to get the village moving again. The Game menu offers Slow for choices, so this is not inescapable. The source also provides a Keep watching action that acknowledges advice without dismissing it (`parts.tsx:913–920`, `playback.ts:157–161`), but the phone hides its pause ribbon (`colony.css:3951`). Nor did today's map change introduce slowdown: Pedro already observed continuous playback and suggestion slowdown in round 4. It is still a nag loop competing with the newly attractive watching activity (`playback.ts:199–225`).

**Inherited, made easier: repeated Rush-to-House.** It is the strongest of the repository's five measured policies on this seed, not a proven universal dominant strategy. Keeping a destination while replacing workers reduces the effort of issuing it. The redesign creates no new simulation exploit.

Headless balance results, Human side at the storm:

| Policy                        | House | Meals | Injuries over run | Deaths |
| ----------------------------- | ----: | ----: | ----------------: | -----: |
| No orders                     |  9.72 |    16 |                 5 |      0 |
| Repeated good orders + Rush   |    10 |    23 |                10 |      0 |
| Repeated good orders + Insist |  9.74 |    12 |                12 |      0 |
| Follow every suggestion       |  8.97 |    16 |                11 |      0 |
| Everyone to Forest            |  8.21 |    16 |                 5 |      0 |

Rush roofed at D2 12:03. Its injury cost is real. Insist performing worse preserves a useful distinction between urgency and coercion. Following suggestions being worse than doing nothing can support the game's argument; treating those cards as the default activity undermines it.

The storm is **not entirely a dead wait**: I saw injuries, movement and sheltering. But construction and stock are already judged at 19:00, and dawn is another 75 seconds away at 1×. The remaining survival uncertainty must carry that interval. It carried some tension in this run, less decision-making.

## 4. What did the change cost?

- **Autonomy: retained, and more visible for the followed person.** Yusuf ate and prayed before complying; Maryam's cooking commitment resisted diversion; Samira returned to her own work. The camera changes presentation, not decisions. Exact @3/@4 replay checks passed.
- **Their words: retained, but less evenly witnessed.** Nearby replies are more legible. Offscreen people lose attention. The bounded suggestion sheet initially showed generic availability advice and Use while the cedar's specific danger was below its scroll. The warning survived in the document; its place in the player's decision weakened (`parts.tsx:604–606`, `colony.css:4147`).
- **The paired-village premise: weakened on phones.** Toggling preserved my selected worker and showed Classic Yusuf already idle while Human Yusuf was building. It works, but serial comparison requires remembering the other view. Neither player asked to lose comparison; both valued its differences. One large map is a worthwhile trade, not a free gain.
- **The ending and difficulty: mechanically retained.** I reached the full comparison, Solo control, order history, character outcomes and winning counterfactual. Both the near miss and the unflattering contribution survived. The new issue is that camera-driven attachment promises more emotional payoff than the repeat-orders winning recipe provides.

## 5. Three ranked changes for one further round

1. **Give the short order sheet a permanent commit/exit row.** Keep Confirm and Watch village reachable with options open. Put the action-specific danger before Use in a suggestion; move generic availability advice below it. This preserves the actual decision—risk, worker, destination—while removing the new requirement to manage the sheet. Recheck with Rush and the cedar card at 360×690. Do not shrink the map back to its previous size.
2. **Make consequential news open the person it concerns.** Add a visible “Show Idris” action to injury news that temporarily follows him, preserves the prepared order and offers a way back to the previous worker. Do not move the camera automatically. This makes a competing need something the player can investigate immediately. Recheck while following Maryam during the storm.
3. **Expose the existing Keep watching action inside an opened suggestion.** Reuse its acknowledgement behavior: retain the card and restore the selected speed. Its expiry still follows simulation time. The player can pause to read. The source already supports this; the phone hides the ribbon containing the action. Making it reachable turns watching into a voluntary activity instead of a reward for clearing cards. Recheck by leaving the cedar undecided while watching the builder.

I would not rewrite Rush balance in this UI round. First test whether players voluntarily watch after these small changes. The repeated-order problem is real, but it predates this change and deserves its own bounded design test.

## Headless verification

Commands run read-only, without a build:

```sh
PATH=/opt/homebrew/bin:$PATH BALANCE=1 npx vitest run apps/site/src/colony/sim/balance.test.ts --maxWorkers=1 --silent=false
PATH=/opt/homebrew/bin:$PATH npx vitest run apps/site/src/colony/sim/playtest.test.ts apps/site/src/colony/ui/map-view.test.ts apps/site/src/colony/ui/renderer-presentation.test.ts --maxWorkers=1
/opt/homebrew/bin/node apps/site/scripts/hf-colony-session.ts seeds=1
```

Balance: **9 passed**. Replay/camera/presentation: **22 passed, 1 skipped**, including the committed @3 and current @4 replay hashes. HF self-play: eight personas on the shipped seed; six reached D4 dawn, restless quit at 5 simulated play minutes and rulesLawyer at 6. Final project failed for all six finishers; stock and survival passed. Raw self-play output: `(driver scratch)`.

These are simulated personas, not eight human votes. The adapter receives every villager's bubble, offers direct order actions without phone navigation, and offers no Rush variant for freely composed orders, though it can accept prefilled Rush suggestions (`hf-colony-adapter.ts:86–100,172–246`). It cannot validate this camera or reproduce the repeated five-worker Rush policy through its direct order choices. Its apparent engagement and near-zero lulls do not overturn the phone observations.
