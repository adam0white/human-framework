# Selin plays The Night Watch

## Notes taken during play

- First winter, night 1: followed gate tracks. Kept Tamar and Kian together, put Mara east, lantern gate. Urged Kian to stay. Wall held. Liked “I stayed because Tamar stayed.” Asked Kian about his health and Mara about keeping the Gate. Talks cost sleep; stopped after two.
- Night 2: mill tracks. Left Joss and Yunus there, tried `post mara off ask` to let Mara rest. She still stood east and reported “My head kept dropping at the east wall. I pinched myself awake.” Wall held. Talked to Mara about home: “Joss keeps the fire in till I’m home.”
- Night 3: west tracks. Moved Tamar and Kian west, Mara gate, Ruslan east. Urged Kian to hold again. West held, but a wolf crossed east after Ruslan went to bed. One faded sack shown. Asked Ruslan how he was: “Well enough. Sleep would help.”
- Night 4: strangers east. Paired Mara and Joss there, moved Ruslan gate. Urged Mara to hold. Later she went home and Joss dozed. Rang and called Joss by name; it woke him and frayed the rope. Then chose to let him go to his children and send Tamar, despite the warning that it might fail. East was crossed; two faded sacks shown. Skipped dawn talks to preserve sleep.
- Night 5: mill tracks. Tried to swap Yunus west and Kian mill, but two commands said “(no free post there)”. Actual arrangement: Tamar/Yunus mill, Ruslan/Kian west, Joss gate, Mara east. Rang to wake Yunus, but he went home. Let Yunus, Tamar and Kian leave when sleepy. Moved lantern west. Mill attackers were repelled, but a thief crossed the unoccupied east. Dawn: “There’s something about the east wall. I can’t say what.” — Mara. This loss felt harder to diagnose. Again skipped talks.

## Emerging reactions

I like the relationships and the choice between sleep, reassurance, duty and family. I am beginning to repeat “urge — likely” whenever attackers arrive. I cannot find an intentional way to schedule sleep: `off` means unposted, and the next dusk explicitly says “not posted · will find a spot on the wall”. That is clearer after the fact than the command label. Night 4’s “Joss looks back at the steps” while the option says “won’t (I’m asleep.)” is awkward. The bell waking him was a useful, visible consequence.

## Rest of the timeline

- Night 6, dusk: freed Yunus’s mill slot with `post yunus off ask`, put Kian beside Tamar at mill, paired Joss with Mara east, and put Yunus gate. Ruslan remained west. Lantern mill. In the small hours I urged sleepy Kian to stay because wolves were approaching. Mill held; west was crossed after Ruslan went to bed. Asked Yunus about his knees: “Fit to stand tonight.”
- First thaw: ten grain dots remained. All winter watchers survived. The game wrote: “The other 84 nights of winter went by routine, the wall stood in turns. Mara and Tamar stood the most of them.” Goran and Noor arrived with Rafe. I did not play those 84 nights.
- Early spring into early summer, year 1: opened the village list. Let Kian practise sling with Tamar, accepting the lost field work. This felt like a useful investment in a person I knew.
- Early autumn: “A good harvest: the granary is well filled.” At the fair I bought the bigger bell, bought seed grain, and named Mara heir. Did not admit the additional family. The winter had made me value the bell’s reach and the grain reserve. Mara had already said she would try keeping the Gate.
- Late autumn: “Tamar died in the autumn, at 54, of a sickness that would not lift.” This landed because I had relied on her. I had not seen advance notice of the illness in the output I read. The chronicle also said, “You named Mara heir to the Gate, before Tamar had said a word.” I felt the discomfort of that choice.
- Stopped at the first night of the second winter, dusk. Mara now “keeps the Gate”, though her assigned stretch was still east. Scout uncertainty was new: “The scout saw strangers by the west wall, or by the east wall; he could not tell which.” Exported the run here.

## What worked, and what wore thin

The first night made me care about keeping Tamar and Kian together. Family mattered at the worst possible moment on night 4, when Joss heard danger near his children. Ringing woke him, frayed the rope, and produced “We heard you,” without warmth. That was a good decision with a visible cost.

I liked that the scout was useful without being a promise. Threats elsewhere caused losses. Dawn usually gave me enough explanation to accept them. I liked the change of scale after winter: training, seed, a bell, and succession make different decisions from posting watchers.

By nights 5–6, the repeated sleepy-watcher cards were wearing thin. “Urge … — likely” repeatedly looked like the practical answer while an enemy approached. I let people leave on night 5 to see whether I could accept the risk and let them recover. I could not tell how much that helped the following day. “Slept and ate” alongside recurring exhaustion did not give me a clear recovery plan. I stopped using all my dawn talks because the game explicitly charges sleep for them; that makes interesting conversation compete with basic survival.

Night 5’s east-wall loss was less legible than Ruslan’s departures. Mara said, “There’s something about the east wall. I can’t say what.” I had moved the lantern west, so I accept that I missed events, but I still wanted a question I could ask or a decision I could make about that unease. I did not see one.

The map at dawn can show a person on a wall while their report says they went home. I could not tell whether this was their current location, a summary of their assignment, or a return after sleeping. Likewise, the second-winter roster says Goran and Noor are “on the East wall” while the map shows faint assignments at west and gate. These may be intentional distinctions; the text presentation made me work to interpret them.

## Where I would stop

I did not reach a firm quit point. At night 6 I would have considered ending an evening session if the next winter were only more of the same sleepy cards. The thaw and fair earned another visit. I stopped at the next winter’s dusk because I had completed the requested season and reached a useful session boundary. I would return to test the bell and Mara’s succession. I have not established that the later game sustains this interest.

## Suspected bugs and exact reproduction commands

These are observations from play, not code diagnoses. I did not restart to independently reproduce them.

1. **Unquoted seed in the usage example creates seed 1.** The supplied usage note shows `new 7` without quotes. My exact first creation command was:

   ```sh
   node apps/site/scripts/play-watch.ts --state playtest-run.json new 7
   ```

   Output: `(a new village, seed 1)` followed by `(unknown command "7"; try help)`. I corrected this immediately with `"new 7" start`, before playing. The argument-splitting rule explains it, but the example is misleading.

2. **“Off the wall” does not provide the rest I expected.** At night 2 dusk, with Mara east, I ran:

   ```sh
   node apps/site/scripts/play-watch.ts --state playtest-run.json "post mara off ask" "lantern mill" begin "wait 120"
   node apps/site/scripts/play-watch.ts --state playtest-run.json "wait 120"
   ```

   Mara still appeared east at night and described pinching herself awake at dawn. The next dusk clarified “not posted · will find a spot on the wall”. This looks like a label/expectation problem, rather than a proven failed command. The prior commands and state are in the export. A fresh short check of the command’s displayed meaning is:

   ```sh
   node apps/site/scripts/play-watch.ts --state repro-off.json "new 7" start "post mara off ask"
   ```

   That short check is proposed; I did not run it.

3. **Awake action language for a sleeping person.** At night 4, after I urged Mara to hold and waited, the card said “Joss looks back at the steps.” Option 2 said “Urge Joss to hold — won't (I'm asleep.)”. The map said Joss was dozing. Exact commands from night 4 dusk:

   ```sh
   node apps/site/scripts/play-watch.ts --state playtest-run.json "post ruslan gate ask" "post mara east ask" "post joss east ask" "lantern east" begin "wait 120"
   node apps/site/scripts/play-watch.ts --state playtest-run.json "answer 2" "wait 180"
   ```

   That needs the preceding run history; use the exported input log to reach it. It may be a generic card description rather than a simulation bug. I then chose `"answer 3" "wait 120"`; the bell explicitly woke Joss, so that part worked.

4. **Some relationship summaries sound broader than the events they summarize.** At night 4 dawn Joss said “I stayed because Mara stayed,” although I had seen Mara go home before his later card. At night 6 dawn Kian said both “I didn’t stay to see it” and “I stayed because Tamar stayed.” They could describe different parts of the night, but I read them as contradictory at first. To observe the latter from night 6 dusk:

   ```sh
   node apps/site/scripts/play-watch.ts --state playtest-run.json "post yunus off ask" "post kian mill ask" "post joss east ask" "post yunus gate ask" "lantern mill" begin "wait 120"
   node apps/site/scripts/play-watch.ts --state playtest-run.json "answer 2" "wait 120"
   ```

   Again, this is the exact observed sequence at that checkpoint, not a standalone reproduction from a fresh seed.

## Verdict

**Mixed:** I would come back for Mara and the bigger bell, but I need the next winter to give me more than repeated pleas to keep exhausted people awake.

## Honesty note

I used only harness output to learn the game. I read no repository source, tests, docs, data files, saved state, or export contents. I wrote this report directly, including notes after night 5. I did not inspect or change the implementation, commit, delegate play, or kill processes.

I ran 41 harness invocations, including help and export, with 97 command arguments. This count includes the failed unquoted seed attempt (two arguments); all actual play followed the corrected seed 7 reset. I played all six interactive nights of the first winter, made dusk/night/dawn choices, passed through the thaw, made summer and fair choices, and stopped at second-winter dusk. The remaining 84 winter nights passed automatically by the game’s own design. I used the default Watch speed for nights and the game-selected Seasons speed after thaw. I used `wait`, never `wait!`. Harness seconds are simulated advancement, not time I spent waiting at the keyboard. I did not measure elapsed wall-clock play time; this was a single short session, not a claimed hour of play.

I did not use every talk, tour every stretch every night, test every option, replay alternate outcomes, or verify that training and purchases helped next winter. I saw no explicit feedback about whether Tamar accepted the summer training. I did not test the web interface. The retained files are `playtest-run.json`, `playtest-export.json`, and this report.
