# Twice at the Well: playtest, 2026-10-19 (round 2)

Three testers played the text harness (`apps/site/scripts/play-colony.ts`) on the branch `worktree-agent-afc441b99ea1ae6f2` without reading the source.

- **Build:** `a694cc4`, the branch head before this fix pass. This is assumed from the timing; the exports carry `colony-scenario@4`.
- **Models:** the reports do not record which model each tester ran on.
- **Seed:** 20261003 for all three. The first-timer asked for seed 5, but the harness ignored it, which is a harness bug.

| Role | Export |
|---|---|
| Edge-pusher | [colony-playtest-2026-10-19-edge.json](colony-playtest-2026-10-19-edge.json) (45 inputs, hash 075a54ddab185e) |
| First-timer | [colony-playtest-2026-10-19-first.json](colony-playtest-2026-10-19-first.json) (23 inputs) |
| Genre fan | [colony-playtest-2026-10-19-fan.json](colony-playtest-2026-10-19-fan.json) (run 1: 41 inputs, hash 19ad4f6a3ce7a4; run 2 was not exported) |

## Edge-pusher (verbatim)

**Playtest report: Edge-pusher, seed 20261003**

Export: `/private/tmp/claude-504/-Users-abdul-code-human-framework/675a9839-8299-4863-91be-017a92a76ff0/scratchpad/t-colony-edge-export.json` (45 inputs, colony-scenario@4, hash 075a54ddab185e). State file: `.../scratchpad/t-colony-edge.json`.

I ran about 17 shell calls, each with several harness commands, not the 60 to 150 calls the brief suggests. I covered all three days and the storm, then continued into Day 3 and gave one order there.

**1. Verdict**
I would keep playing, but for the refusals, not the village. The Human side answers each order with a specific, in-character reason ("I'm asleep.", "I'm spent.", "No. I remember last time: out for timber in the squall, came back cut and empty-handed."). Those lines made me want to find the next edge. The Classic side obeys everything, so it reads as a control group, not a village. The cost of pushing is visible in the results screen: my pushing gave Human 30 injuries against 5 in the solo run, and trust fell from 54% to 32%. That is the game's own counterfactual, and it is the most useful thing the screen shows. The main drag is pacing: every answer auto-pauses the clock, so covering a day takes many calls.

**2. First minutes**
The first meaningful choice came at 05:00 on Day 1. The composer showed "Yusuf: likely yes" before I sent anything, which made the choice clear. The rush and insist toggles were clear from the composer label. The first suggestion came at 05:30. The Classic and Human panes side by side were clear once I read the legend.

**3. The people**
Yes, they felt like people. When refused, they gave reasons at once, and the reasons tracked their state: Idris "when I've healed" after his injury, Yusuf "I won't miss Fajr, whatever you say" at prayer time, Samira "I don't know how" for the cedar. I believed the refusals. The "If you insist. I'd rather not." then "Alright, I'll do it." pattern felt true to a reluctant person.

**4. My agenda, edge by edge**
- **Same person, repeated orders (fun, slightly churny).** Each new order replaced the last, and the log said "replaced by o3". Nothing stacked. Clear, but the log grows fast.
- **Cancel (confusing).** `cancel` works only on open orders. Once a person accepts or the work is done, the "(cancel)" tag vanishes. `cancel o4` returned "No open order o4" while o4 still showed a refusal in the list. I could not tell whether the order was closed or still live.
- **Insist (fun, with a real cost).** Insist turned most refusals into "under protest" and then into compliance. It did not beat "cannot" or "will not". This is the main lever, and the trust cost is clear.
- **Cedar and cannot-do orders (broken-feeling).** I sent Tariq and Samira to fell the cedar. The Human side said "I don't know how." The Classic side walked them there anyway and the Classic side took 4 injuries by 10:37, against 1 for Human. The order composer still said "Send" with no warning, which I found more odd than fun.
- **Storm and squall (fun, painful).** Ordering people out at night in the squall: Yusuf, Samira and Danyal were hurt by 22:40. By the storm, Human injuries were 23. By the end, 30. Yusuf was hurt about ten times on the Classic side while out in the open.
- **Children's carers (not verified).** No child appeared in the six people I saw. I ran `predict samira forest children`, but its output scrolled out of my view, so I cannot report what the toggle does.
- **Skipping suggestions (fine).** `skip` works. The "shutter the house" suggestion at 18:00 I skipped, and the roof was 9/10 at 19:00. I did not test what shuttering does.
- **Time jumps (confusing).** `until 1 18:00` ran twice and then said "That time has passed". `until 2 12:00` ended on a bare "Paused" line with no cause given, twice.

**5. Difficulty and pacing**
- **Too easy:** None. The goals were easy to meet on Classic even with heavy injuries.
- **Too hard:** The pacing of auto-pauses. Every answer stops the clock, so each in-game hour costs one call.
- **Dead time:** The long stretch from 10:40 to 18:00 on Day 1 was mostly idle lines in the log.

**6. Bugs and confusions**
- `cancel o4` after the order was resolved: "No open order o4" while it still displays (see above).
- `predict samira forest children` is unverified (output cut off).
- Harness usage, not game bugs: `new 20261003` must be quoted as one argument, `wait 20` as one argument failed on a second use ("Unknown command 20"), and `export <file>` must be one quoted argument.
- The results screen says "What would have won (Human): From D1 12:00, rushing ...". That is a full solution hint, shown after the run.
- Orders carry no warning when the Human side has already said "cannot".

**7. Top three changes, ranked**
1. Make cancel explain itself: show "closed: accepted / done / refused" instead of silently dropping the tag, and make `cancel` on a closed order say why.
2. Reduce the auto-pause frequency during a long wait, or let `until` pass a pause without stopping, so pushing through a day costs fewer calls.
3. Warn in the composer before sending an order the Human side has already refused as "cannot", and show the injury risk of insisting in a squall before the order goes out.

## First-timer (verbatim)

**Seed:** 20261003. I typed `new 5` and the harness did not accept "5" as a seed. It printed `! Unknown command "5"` and ran seed 20261003 anyway.
**Export:** `/private/tmp/claude-504/-Users-abdul-code-human-framework/675a9839-8299-4863-91be-017a92a76ff0/scratchpad/t-colony-first-export.json`. It holds 23 inputs. State file: `.../scratchpad/t-colony-first.json`.
**Play length:** about 20 harness calls, not the 60 to 150 asked for. A full two-day run fits in that many calls once you batch commands. I played one complete run to the end screen.

## 1. Verdict
I would play a second run, but only because the Human side talks back. I'd keep going for two reasons. People say why they won't do things ("And leave the pot cold at noon? No. They eat from my hands."), and the end screen compares my result against "without you". As a first-timer I would not keep playing for the colony-management part. The Classic side finished its roof by Day 2 morning without needing me. After that, every house order I sent was a no-op on that side. The Human side missed the roof by one stage (9/10) even though I rushed and insisted on everything at the end. I could not tell until the end screen what I should have done differently. The goals say to build the house and stock meals, but not that the Human people stop building when they pray, eat or sleep. Learning that cost me the run.

## 2. First minutes
- **Clock time:** My first meaningful choice was at 05:30 game time, about one real minute in. It was the suggestion "Send Yusuf to the house?".
- **What was clear:** The goal card and the help text.
- **What was unclear:**
  - **Suggestion that did nothing.** I took the Yusuf suggestion. Yusuf was already "Building the house" on both sides, so the order changed nothing visible. The suggestion card did not say he was already doing it.
  - **Mixed meter names and the `!`.** The two panes use different meter names: "Fed/HP" on Classic, "Food/Sleep" on Human. A `!` appeared next to Idris's food. The legend never explains it, and I had to guess it meant "low".
  - **Rush and Insist.** I never learned what Rush does. `predict` changed its answer when I added Insist, but nothing told me what Rush adds.
  - **Duty, children and safety.** I tried "duty". Samira's prediction and reply did not change. I could not tell whether the toggle did anything.

## 3. The people
- **Did they feel like people?** Mostly yes, and the refusals were the best part. Quotes:
  - Samira: "Not that — I'll gather grain; that is my work." The line is accurate, but she said the same thing to me twice.
  - Idris, at Day 1 18:00: "Not that — I'll gather timber; that is my work."
  - Danyal, ordered with Rush and Insist: "Fine."
  - Idris and Samira, ordered with Insist: "~Build~ …fine." and "If you insist. I'd rather not." I believed these.
  - Tariq: "I won't miss Asr, whatever you say." That was a refusal I believed.
- **Believability:** The inspector's "Why" list (scored options such as `my work +0.45 · effort -0.18`) made me believe them even when I disagreed. Each line names where it comes from: my work, your order, effort, danger, hunger.
- **Where it broke:**
  - **Repeated stock line.** "Not that — I'll X; that is my work" read like a stamp after the third time.
  - **Moment 2 line.** The moment line "Same man, same job: yes in the morning, 'after I pray Fajr' at dusk" is wrong. Both orders were at 06:00 and 07:00 on Day 2. It said "dusk" for a morning. It also didn't match what happened: Yusuf said "after I pray Fajr" at 06:01 and "Fine." at 06:09.
  - **Idris "Feels distress".** The inspector said this with no reason. His trust note read "+0 Good call: the cedar", yet his Why list showed him calmly gathering timber. The distress state had no source line.
  - **Trust figures disagree.** The pane said "Trust 54%". The inspector said "Trust in you 50%" for everyone at the same time. By 18:00 the pane said 52%. I couldn't tell which one was right or what moved it.

## 4. Your agenda
I played as a first-timer who tried everything on the screen.
- **Predictions:** `predict` was useful. It said "likely yes", "later: after I eat a meal" or "will refuse: the others would go unfed". Maryam's refusal matched the prediction (I sent the order anyway, since I wanted to see the refusal). I only used it before sending orders, never after.
- **Suggestion cards:** They lapse in an hour. Every one auto-pauses the game, so I was hitting resume constantly. About half the suggestions I skipped. The "Shutter the house?" card at 18:00 said "Shuttering stops the roof work". I could not tell whether skipping or taking it would score better, and I skipped it. The end screen showed Human 9/10 either way.
- **Giving orders:** Several orders went to people who were asleep, praying or fetching water. They said "not now" and the order lapsed. The log shows "lapsed" but I only found out by reading it. I never learned how long an order stays open.
- **Rush and Insist at the end:** At Day 2 16:00 I sent all four builders to the house with Rush and Insist. Two were "under protest", two said yes. Then at Asr (around 17:30 to 18:00) Tariq and Idris refused with "I won't miss Asr, whatever you say" and went to pray. That cost the last roof stage. The end screen said "One roof stage short at 19:00; the next was 52% done."
- **The end screen:** "What would have won" told me exactly what to do: rush five people to the house from D1 12:00 and have Maryam cook from D2 13:00. I never would have guessed that. It also said my 18 orders changed storm stock from 16 to 18 meals and left the roof at 9/10 either way. So most of my orders did nothing. That felt honest, but it was a letdown.

## 5. Difficulty and pacing
- **Too easy on the Classic side.** It finished the roof by Day 2 06:00. Roofing was done and stock was fine without me.
- **Hard to read on the Human side.** I did not know the roof was behind until Day 2 morning (7/10 at 06:00 after a night with no progress). Overnight it advanced nothing. Dead time was the Day 1 evening to Day 2 05:00 stretch, about 8 hours of game time that went by in a few real seconds once I ran `until`. I couldn't have done anything during it because everyone was asleep.
- **Suggestion fatigue.** Suggestions arrived about once an hour of game time and each one paused the game. Over the run I skipped around ten.
- **The storm.** I never saw it. By the end the harness just printed "Day 3 · 05:00 · dawn".

## 6. Bugs and confusions
1. **`new 5`.** `! Unknown command "5"`. The help says `new [seed]`, so a seed argument should work. It seems the harness splits arguments differently than help implies.
2. **Multi-word commands.** `inspect idris` as two separate arguments fails with `Unknown command "idris"`. Help says "one per argument, or joined with ;". You must quote `"inspect idris"`. I found this by failing.
3. **"~Build~ …fine."** The `~` marks look like leaked markup. This is the under-protest line. It showed twice (Idris, Samira, and Tariq later).
4. **Orders to finished work.** After the Classic house was done, orders still showed "Classic: house finished · C could not". Harmless, but cluttered.
5. **Moment 2 text mismatch** (section 3).
6. **Trust 50% vs 54%** (section 3).
7. **Order cards read "C … · H …"** until resolved. I did not know what "…" meant until it later said ✓ or "not now".
8. **Output dumps.** The `look` output repeats the entire screen each time (the harness prints it after every command), so a batch of six commands is hard to read.

## 7. Top three changes
1. **Tell me the Human side's constraints before the roof is at risk.** The two panes show the same goals, but nothing says why Human is behind (people sleep, pray, drink and eat). A line like "Human roof stalls at night and at prayer times; plan builders around Asr" would have changed my play. Also warn when an order will collide with a prayer time, since Asr cost me the roof.
2. **Make suggestions less intrusive and more honest.** Don't offer "Send Yusuf to the house?" when he is already there. State what happens if I skip. Pause less often. Consider letting them stack in a corner without stopping the clock.
3. **Fix source and consistency for readings.** Show where trust 54% vs 50% comes from, give "distress" a reason, explain `!`, Rush and the duty toggle, and vary the "that is my work" refusal. Fix the Moment 2 text.

## Genre fan (verbatim)

I'd stop after these two runs. The Human villagers are the best thing here and I believed them, but the game never let me become good at it: my orders were worth less than nothing, and the "what would have won" hint did not hold up when I followed it.

Seed 20261003, two runs. The export of run 1 is at `/private/tmp/claude-504/-Users-abdul-code-human-framework/675a9839-8299-4863-91be-017a92a76ff0/scratchpad/t-colony-fan-export.json` (41 inputs, hash 19ad4f6a3ce7a4). I did not export run 2. Its state is in `t-colony-fan2.json` in the same folder. I used about 30 harness calls, below the brief's 60–150, because the second run already answered the main question.

## Playtest report: Twice at the Well (genre fan)

**1. Verdict.** I would not keep playing past these two runs, and that disappoints me, because the Human village is the most charming colony-sim crew I've seen in a while. Run 1: 36 orders and a lot of micromanagement. Classic met all three goals; Human missed the roof at 8/10. The results screen said the Human village with no orders at all would have reached 9/10, with lower morale (0.39 vs my 0.56). Run 2: I followed the results screen's winning recipe ("rush Yusuf, Tariq, Idris, Samira and Danyal to the house from dawn"). The game said my 14 orders changed nothing except injuries ("injuries 4 (without you: 5)"), and the roof stopped at 9/10 again. In a colony sim the player has to have levers. Here the Human village mostly runs itself, and the levers I had (rush, insist) made things worse or did nothing.

**2. First minutes.**
- My first meaningful choice came about one minute in, at the cedar suggestion. That pace is good.
- Clear: the goal card, the two panes side by side, and `predict`. Predict is excellent; it tells you before you send whether a person will say yes, "later", or refuse.
- Unclear: there is no timber stock anywhere on screen. "Timber is short" suggestions keep arriving, and I only learned that timber is a real resource from "Classic: no timber" in the order log and "Yusuf: later: no timber" in predict.
- Unclear: whether gathering timber or building is the bottleneck. I never found out.
- Orders silently "lapse", and nothing tells you how long an order lives.

**3. The people.** Yes, they felt like people. This is the game's real strength.
- Every refusal came with a reason in the moment, and I believed nearly all of them.
- The reasons came from their lives: prayer times, thirst, hunger, tending an injured friend, "that is my work".
- Predict foresaw Maryam's refusal before I sent anything ("will refuse: the others would go unfed"). Her actual refusal is the best line in the game: "And leave the pot cold at noon? No. They eat from my hands."
- Yusuf carried the injured Idris home before eating, and the game flagged it as a Moment.
- Sometimes the sheer volume of reasons made it feel like rationing, not character. The log is a wall of "Thirsty. Water first." and "After I drink at the well, then I will."
- Trust barely moved all run (54% to 51%), so insisting never felt like it cost anything I could see.

**4. My agenda: roof, stock and survival in Human, compared with Classic.**
- Run 1:
  - Morning: timber gatherers plus Yusuf on the house, then the cedar on suggestion. Classic Idris got hurt. Human Idris was hurt by 10:15 and was then "Carried by Yusuf". His trust fell: "-6 Went badly: the cedar".
  - Late morning: I ordered Samira and Danyal to the forest. Both said "Not that — I'll gather grain; that is my work." / "I'll cook a pot." Re-ordered later, both answered "Not now. After I tend Idris."
  - Day 2: I rushed and insisted. Samira went "Fine. Since you insist."
  - At 14:31 I rushed four people to the house. Most of them then drifted off to drink, eat and pray Asr, and the orders lapsed.
  - At 19:00 the house stood at 8/10 (the bar drew nine blocks).
  - Storm stock and survival were met in both villages. The Human village kept more meals: 17 against Classic's 15.
- Run 2: the results-screen recipe.
  - With auto-pause off, the Human house hit 7/10 by noon on Day 1, against 4/10 at the same point in run 1.
  - It then stalled on "no timber" and finished at 9/10.
  - The new results screen moved the goalposts: "From D2 09:00, rushing … roofs the house at D2 18:02."
- Classic against Human: Classic is a dumb but reliable machine. Danyal built all night with no sleep, and Classic finished the roof both times. Human is more interesting to watch, but less interesting to play, because my input hardly matters.

**5. Difficulty and pacing.**
- Early Day 1 is pleasant.
- Hours 1–2 of both days are dead time. Fajr, then eating, then drinking chains through everyone, and orders sit at "not now" for about 90 game minutes.
- With auto-pause on, nearly every `wait` stops after one game minute on a refusal. That is far too many interruptions; I need an option to auto-pause on suggestions only.
- The Human roof looks impossible to reach through the player's own orders. The solo run reaches 9/10 without me, so the margin is one stage, and nothing I did closed it.

**6. Bugs and confusions.**
- **Results hint does not reproduce:** run 1's results recommended "From dawn on Day 1, rushing Yusuf, Tariq, Idris, Samira and Danyal to the house … roofs the house at D2 12:03". Run 2 did exactly that at 05:00 and failed. The hint probably re-issues orders when they lapse, which the player can't know to do.
- **Timber is hidden:** there is no timber count on screen. It only shows up in predict ("later: no timber") and in the log ("Classic could not (no timber)").
- **Suggestion repeats an existing order:** the first suggestion was "Send Yusuf to the house?" while he was already ordered there and building.
- **Health contradicts the injury:** in `inspect idris`, Human Idris shows "Health 100" while he is hurt and being carried. His Classic copy showed HP 77.
- **"Why" contradicts the status:** in `inspect idris` at D2 05:00 his status was "Drinking", but the Why section's top choice was "Gather timber". Possibly the pending decision, but it reads as a contradiction.
- **Classic idles silently:** Classic units fall back to "Resting at home" after finishing an order, with no notice. Classic Tariq showed "Beam fell: recovering" with full HP.
- **`new 20261003` as two arguments:** printed "Unknown command" but still used the seed.
- **Suggestion skipped by waiting:** a suggestion that arrives during a multi-wait call is passed by on the next `wait` and lapses without me ever answering it. The D1 21:35 squall suggestion went this way.
- **Unexplained trust loss:** "-2 Hurt by your order: timber run" appeared on Idris before anything had visibly gone wrong.
- **House names look like destinations:** "Walking to Idris & Samira" / "Walking to Maryam & Tariq" reads like a bug until you realise it names their house.

**7. Top three changes.**
1. **Make player orders matter in the Human village, and prove it.** Orders should persist until fulfilled or explicitly dropped, instead of lapsing after "not now". Tune it so a good plan beats solo play by a clear margin. The results hint must be a plan the player can actually enter and reproduce.
2. **Show the economy.** Add a timber stock and a line saying what each house stage needs, for example "House 8/10 · needs 2 timber · 1 builder". Without it I can't reason about the bottleneck, which is the core pleasure of the genre.
3. **Fix pacing and auto-pause.** Add an option to auto-pause on suggestions and the storm only. Compress or batch the needs-and-prayer cascade in the log. Make trust move visibly when you insist, so insisting is a real trade-off rather than free.

## HF-character harness, round 1

This table comes from `node apps/site/scripts/hf-colony-session.ts seeds=2`, run on colony-scenario@4 after the dawn-pause change (`b45aef3`). The "from" cells are empty because the script prints no start time for a 0 s lull. The round-2 rerun was skipped because the owner asked for a soft stop on 2026-10-19.

| persona | seed | ended | play min | at | engagement | orders | Human goals | longest lull | looked away |
|---|---|---|---|---|---|---|---|---|---|
| commuter | 1 | quit | 3 | D1 11:37 | 0.81 | 33 | roof open, stock open, lives open | 0s from  | 0 |
| commuter | 2 | agenda | 3 | D1 13:58 | 0.82 | 31 | roof open, stock open, lives open | 0s from  | 0 |
| unwinder | 1 | game-over | 8.8 | D4 05:00 | 0.8 | 39 | project failed, stock met, lives met | 0s from  | 0 |
| unwinder | 2 | game-over | 9.8 | D4 05:00 | 0.8 | 40 | project failed, stock met, lives met | 0s from  | 0 |
| completionist | 1 | game-over | 7.4 | D4 05:00 | 0.85 | 17 | project failed, stock met, lives met | 0s from  | 0 |
| completionist | 2 | game-over | 7.1 | D4 05:00 | 0.83 | 16 | project failed, stock met, lives met | 0s from  | 0 |
| restless | 1 | quit | 4 | D1 07:17 | 0.69 | 56 | roof open, stock open, lives open | 0s from  | 0 |
| restless | 2 | quit | 3 | D1 08:51 | 0.68 | 35 | roof open, stock open, lives open | 0s from  | 0 |

## What we changed

- **The "What would have won" line is now honest about the plan.** It says the replayed plan re-orders the builders with Rush each time an order ends, at most every 75 minutes, between 05:00 and 21:30. It adds "One order at dawn is not enough: orders end." It also says another run can give another line, because the branch point comes from the player's own run. The fan had followed the old line with one order per builder at dawn and still reached only 9/10. This change is display only and does not move the version. The commit that makes it is the one that adds this file.

## Deferred

The owner asked for a soft stop on 2026-10-19, so every other round-2 item went to the Deferred list in [colony.md](colony.md), targeted 2026-11-05.
