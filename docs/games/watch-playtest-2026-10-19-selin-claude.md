# Playtest: The Night Watch, seed 7, as Selin

Selin: 34. Plays Banished, Frostpunk and Dwarf Fortress in the evenings, about an hour at a time. Patient, but quits when the decisions stop mattering or when she can't tell why something happened.

Played through the text harness only (`apps/site/scripts/play-watch.ts`). State file: `playtest-run.json`. I read no source, tests, docs or data. My only input was the harness output.

## Timeline (game time)

**Winter 1**
- **Before the first night.** Goal page: "Bring every soul and the granary to the thaw." Granary at 20 sacks.
- **Night 1.** Tracks on the gate road. Tamar and Kian at the Gate, Mara (best sight) on the west wall, lantern at the Gate. Wolves came. A card: "Kian looks back at the steps." I urged Kian to hold. I walked the lantern west. While I was away, "Grain is gone: something got over the gate." I walked back. At dawn: "The wall was crossed." One sack lost. Two talks: Kian said "Nothing wrong with me." Asked if she'd keep the Gate one day, Mara said "Me? I'd try. Someone has to."
- **Night 2.** Joss and Yunus arrived. Tracks along the mill race, so I posted both at the mill with the lantern. In the small hours Kian and Mara went home to sleep. "The wall held." No sacks lost.
- **Night 3.** Ruslan arrived ("Joss turned away when Ruslan came in"). Tracks by the west wall. I put Joss with Mara on the west wall, tried to rest Yunus with `post yunus off`, and sent Ruslan to the mill. Mara wavered and stayed. Mara then went home asleep. A card: "Joss hears them near his two children." I let him go and moved the lantern east. Sacks were lost at the west wall and the east wall. I rang the bell once and the rope went to "fraying."
- **Night 4.** "The scout saw strangers by the east wall." I posted Ruslan and Yunus east. Ruslan left for the hall (I tested `letbe`). "Yunus is down at the east wall." I had Ruslan carry him. Thieves took three sacks. Yunus at dawn: "Ruslan got me off the wall. I owe him."
- **Night 5.** Mill tracks. I posted Yunus and Ruslan at the mill. Ruslan bolted, and calling him back did not stop him. Yunus fell asleep: "Urge Yunus to hold — won't (I'm asleep.)" I chose "ring and call by name." Two sacks were lost while I watched the lit mill, but the ticker said nothing about it. Then "A wolf got over the mill wall, but the alarm was up: away with nothing" appeared three times while the granary still dropped one. The dawn report only partly explained it. It blamed a thief at the empty east wall, but it also said "Wolves got over the mill wall and tore into the store." That contradicts the night's "away with nothing" (bug 6).
- **Night 6.** Mill tracks. Joss and Ruslan at the mill. Ruslan bolted again, and this time "call him back" worked. Joss fell asleep and I rang for him. Joss replied: "We heard you," Joss calls, not warmly. Everyone was asleep or home by the small hours. Then "! The granary is running low." This was "the last night watched this winter; the rest goes by routine."
- **Thaw.** "The other 84 nights of winter went by routine." The granary held ●●●● (4) into spring, under a mark of 5. "The thaw brought down the mill wall." Nazim, Dilan and their child Sena came. "Ruslan came out of the winter afraid of the east wall."

**Year 1, at Seasons speed**
- **Early summer.** A matter: Kian asks if Tamar could teach him the sling. I let them practise.
- **Early autumn.** A good harvest brought 34 sacks. At the fair I rebuilt the mill wall, bought the bigger bell, and named Mara heir to the Gate (25 sacks left). I did not admit the outsider family.
- **Late autumn.** "Tamar died in the autumn, at 54, of a sickness that would not lift."

**Winter 2**
- **Nights 1–3.**
  - The rope started winter 2 at "fraying."
  - Mara and Nazim held the west wall. Thieves took 3 sacks over the Gate.
  - Night 2: Mara left the Gate early in the night with no card. Dilan was posted west, and Kian was not posted ("will find a spot") but went east anyway. Thieves took sacks at the Gate and the east wall.
  - Night 3: Joss and Yunus held east until both fell asleep, then wolves got in.
- I stopped at dawn of winter 2, night 3, with about 17 sacks against a mark of 5, and exported the run.

## What I liked
- **Dawn voices.** This is the best part. "I stayed because Tamar stayed." — Kian. "With Kian next to me I could stand it." — Tamar. "Ruslan got me off the wall. I owe him." — Yunus. "You rang us up for shadows." — Kian. Small, specific and human. I cared about Ruslan and Yunus by night 4.
- **Cards that name a real conflict.** "Joss hears them near his two children" with "Let Joss go to his two children" was a real choice and I felt it.
- **Honest odds.** "Urge Yunus to hold — won't (I'm asleep.)" tells me not to waste a press. "likely, you think" is a nice touch of uncertainty.
- **Costs that tie together.** The bell rope frays when rung, and the next day "Mara spent 4 hours on the bell rope" instead of sleeping. Ringing costs sleep later.
- **The thaw page.** The volume, the blank leaves ("when a child born here first stands the wall") and Tamar dying in the autumn give a Dwarf-Fortress sense of a chronicle. The fair is a clean, legible trade-off screen.
- **The delayed dawn report.** It cleared up things I couldn't follow at night, like the east-wall thief on night 5.

## What bored, confused or frustrated me
1. **Every night ends the same way.** Nearly every night, in the small hours, one person after another reports: "says the X wall will have to wait. "I can't keep my eyes open."" It happened on the first night of winter 2, after a whole summer's rest. I found no decision that changes this: no shifts, no rest rota, no sending someone home early to sleep. By winter 2 the only night choice was where to stand with the lantern and whether to ring. **This is where Selin's interest drops.**
2. **`off` doesn't mean rest.** `post yunus off` showed "not posted · will find a spot on the wall." Kian, left off in winter 2, went to the east wall anyway. I wanted to give someone the night off and couldn't tell how.
3. **People leave without a prompt.** Mara left the Gate early in winter 2, night 2: "Off the wall: Mara (gone to the hall)." No card came and `wait` didn't stop, so the heir I had just named walked away and I only found out afterwards. I guess cards only come at the lit stretch, but the game never said so.
4. **The night ticker loses events.** I stood at the lit mill on night 5 and lost two sacks with no ticker line. Messages saying a wolf got away "with nothing" appeared while the granary dropped. In the moment I couldn't tell why I was losing grain. The dawn report fixes it later, but at night it felt arbitrary.
5. **84 routine nights.** Six nights are played, then "the other 84 nights went by routine," and the granary arrives below the mark. The six nights I played felt like a small share of the outcome.
6. **The fair doesn't show the mark.** The fair says "Take as many as the granary can spare," but its granary bar has no `|` mark. I had to remember the mark from another screen.
7. **Heir offers.** Kian spent the summer learning the sling from Tamar, but the fair offered only Mara or Joss as heir. After I named Mara, dawn talk still offered Joss, Kian and Dilan "Would you keep the Gate one day?"
8. **The rope and the heading never change.** I last rang on winter 1 night 6, leaving the rope "fraying." It was still "fraying" when winter 2 began, after 84 routine nights and a whole year, and the bigger bell didn't come with a new rope. The volume heading "Who keeps the Gate after Tamar?" still showed in late autumn, after "Tamar died in the autumn" and after I had named Mara heir.
9. **Press options look identical.** At the first dusk, Ask, Urge and Insist all read "likely, maybe." I couldn't see what pressing harder buys.

## Where Selin would quit
She would not quit in winter 1: the dawn voices and the Joss card carried it. She would probably stop for the evening around **winter 2, night 2–3**, and might not come back. The pattern was set by then: post by the tracks, carry the lantern there, everyone falls asleep at the small hours, ring, lose a few sacks. Her decisions stopped feeling different, and she had no lever for the one problem that kept happening, which was fatigue.

## Possible bugs (with repro)
All commands below are run as `node apps/site/scripts/play-watch.ts --state playtest-run.json ...`.

1. **The usage example creates the wrong seed.** The documented `--state run.json new 7` passes `new` and `7` as separate commands. Output: "(a new village, seed 1)" then "(unknown command "7"; try help)". It needs `"new 7"` in quotes. Either the usage note or the argument parsing is wrong.
2. **`answer letbe` is rejected.** Help says `answer <n> … "letbe" says nothing`, but `answer letbe` prints "(no such answer)". `letbe` works as its own command. Repro: `"new 7"`, `start`, then `"lantern gate" begin "wait 60"` until a card shows, then `"answer letbe"`.
3. **One watcher drawn in two places.** On winter 1 night 4, the night map showed Ruslan on the mill wall ("Ruslan: a figure") and on the east wall ("(Ruslan, faint: afraid)") at once. The same card offered "Ruslan, carry Yunus" after Ruslan had left for the hall. Repro: replay the export (see below) to winter 1 night 4, about 30 s after Ruslan leaves.
4. **Dawn says "Nobody stood" posted walls.** Winter 2 night 2: Joss and Ruslan stood the mill wall most of the night, and Kian and Yunus the east wall, yet dawn said "Nobody stood the mill wall" and "Nobody stood the east wall." Other dawns used "Nobody held the X wall to the end," which matches better.
5. **Dawn quotes contradict the night.**
   - Winter 2 night 2: Dilan says "I didn't blink till dawn" after the ticker showed "Dilan nods off at the west wall" three times.
   - Winter 1 night 3: Joss says "I stayed because Mara stayed" after Mara went home first and I let Joss go.
   - These may be characters misremembering. If so, the game doesn't signal it.
6. **The night ticker and dawn report disagree on the mill wall.** Winter 1 night 5, lantern at the mill. Two sacks were lost in one `wait 30` with no ticker line. Then the ticker printed "A wolf got over the mill wall, but the alarm was up: away with nothing" three times, and the granary dropped by one. The dawn report said: "Wolves got over the mill wall and tore into the store." Both can't be true for the same stretch. The dawn report also blamed a thief at the empty east wall, which explains only part of the loss. This is the clearest case in the run where I couldn't tell why I lost grain.
7. **All children aged a year within a few months.** Between early spring and early summer of year 1, Lena went from 10 to 11, Ada eight to nine, Sena seven to eight, and Pell seven to eight.
8. **Knowledge goes backwards.** At winter 1 dusk 4, Mara showed "close to Joss" (confirmed). In the year-1 village fold it showed "close to Joss (unsure)," although they are listed as married.

My export is in the scratchpad: `/private/tmp/claude-504/-private-tmp-claude-504--Users-abdul-code-human-framework-675a9839-8299-4863-91be-017a92a76ff0-scratchpad-bake-t4-claude/08e8aea4-f067-4859-b09a-424be32a4f0a/scratchpad/playtest-export.json` (seed + input log + state). The command log is in `cmdlog.txt` next to it.

## Verdict (Selin)
"Mixed: I'd come back for the people at dawn, but by the second winter every night was the same slow slide into sleep, and nothing I chose seemed to change that."

## Honesty note
- **What I played.** 112 harness calls, including two failed starts. That covers seed 7 from the goal page through 6 played nights of winter 1, the thaw, year 1 at Seasons speed (one matter, the fair, Tamar's death) and 3 played nights of winter 2. Game time: about one year and three nights. Wall-clock time was about 12 minutes, because `wait` advances simulated seconds faster than real time. This is not literally Selin's hour.
- **How I read the night.** From winter 1 night 5 on, I often filtered harness output with `grep`/`sed` to the ticker and map lines. My pattern `wall \[` never matched the `Gate [dark]`/`Gate [LIT]` row. So the Gate's own map row is missing from every filtered night output in winter 1 night 6 and winter 2 nights 1–3. For the Gate on those nights (Mara leaving with no card, and "Nobody stood the Gate" in bug 4), I saw only the ticker, the "Off the wall" line and the dawn report.
- **Things I did not do.**
  - At least once, a `wait 30` ran past an open card (winter 2 night 3, Yunus). The card was left unanswered rather than chosen.
  - I did not try `insist`, `speed`, `chronicle` or `people` beyond one look, and I did not admit the outsider family at the fair.
  - I did not finish winter 2 or see a second thaw.
- **Repo files.** I read no repo files. I wrote one wrapper script in my scratchpad that calls the harness and logs each command.
