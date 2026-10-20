# The Night Watch: playtests of 2026-10-19 (polish round 2)

Three playtesters who had not read the source played the text harness (`apps/site/scripts/play-watch.ts`) on branch `worktree-agent-aaf699728dd2f9712` at commit `af0bfde` (the level-up, before this pass). Each played under a role brief. The reports below are copied verbatim. The coordinator assigned the testers; their model is not recorded in the reports.

| tester | role | seed played | export |
|---|---|---|---|
| edge | edge-pusher | 11 | [watch-playtest-2026-10-19-edge.json](watch-playtest-2026-10-19-edge.json) |
| first | first-timer | 7 | [watch-playtest-2026-10-19-first.json](watch-playtest-2026-10-19-first.json) |
| fan | genre fan (tower defence, colony sims) | 1 (asked for 23; the harness ignored the seed) | [watch-playtest-2026-10-19-fan.json](watch-playtest-2026-10-19-fan.json) |

All three exports are scenario 9, `build: "harness"`.

## Edge-pusher (verbatim)

I played seed 11 for about 60 harness calls: three winters, through the fair and into the third autumn. The export is at `/private/tmp/claude-504/-Users-abdul-code-human-framework/675a9839-8299-4863-91be-017a92a76ff0/scratchpad/t-watch-edge-export.json` (37 KB).

Harness note: the brief's `new 11` has to be quoted as `"new 11"`. Unquoted, it starts seed 1 and then rejects "11" as an unknown command.

## Playtest report: The Night Watch, edge-pusher, seed 11

**1. Verdict**
I would keep playing, for the people more than the wall. Abuse got answered in the fiction, not with error messages. I rang the bell at nothing and got "If you ring at nothing, we stop listening." I insisted on posts all winter and got "You insisted on the mill wall. I stood it, and I won't forget it." That household then left at the thaw. The village went from twelve souls to five over three years, and the chronicle laid out why. The game is weakest in its text, which contradicts itself often enough that I stopped trusting the dawn report. Worst of all, the thaw told me "It was done" in a winter when two households left.

**2. First minutes**
The first choice came straight away: the dusk posting screen, about 30 seconds in. Clear: the scout's warning, posts versus stretches, the lantern, and the bell's range ("loud at the Gate, faint at the east wall"). Unclear:
- What "insist" buys. Its odds read "likely, maybe", the same as Ask; the only difference shown is "pressing may cost goodwill".
- What happens to a card I ignore.
- Why plain `wait` at Seasons speed never ends a dusk. I waited 180 s and dusk did not end; `wait!` was needed.

**3. The people**
Mostly yes. Refusals gave reasons in the moment, and some were consequences of my own play:
- After I wore out the rope, Kian said "Not now. After I mend the bell rope." I believed that one.
- When I rang the big bell repeatedly, Mara called "Again?"
- Kian, insisted onto the wall he fears: "I wasn't going to stand the east wall." "You asked hard. I still went."
- When I switched to only asking, two people refused straight away. Kian: "I'm needed at home tonight." Ruslan: "I can see more from the mill wall."

Some reasons read like a filled-in template: "Not now. After I sit down at the post." (he was already sitting) and "Not now. After I go home to sleep." Some dawn quotes contradict themselves in one breath. Joss: "I ran. Say what you like." then "I stayed because Yunus stayed."

**4. My agenda, edge by edge**
- **Everyone off the wall** (night 1): watchers went up anyway on their own, which is believable. Wolves took half the spare grain. Insisting "off" in winter 1 did not keep anyone off either. That reads as people defending their homes, but nothing on screen said so. **Mostly fun.**
- **Ring constantly:** the rope frays and then snaps: "The bell rings out once more, and its rope snaps. No more bell tonight." It had to be spliced, which cost people sleep the next day. Watchers resented it later. **Fun, the best edge.** Note that the "bigger bell" ("its rope frays half as fast") still snapped after about 7 pulls.
- **Insist on everything, everyone on their feared stretch:** they went, held, and resented it by name. By winter 3, Kian and Ruslan "doesn't heed you". Oren and Hana, insisted onto the mill wall all winter, "left with the thaw … the first household to go." **Fun, and the strongest consequence in the game.**
- **Ignore cards:** night cards silently resolve with "they decide alone", and I was never told what they decided. Summer matters repeat the next year word for word. **Half broken** (see bugs).
- **Seasons speed and leave it:** in winter 1, once the granary was empty (night 4), the game skipped "The other 84 nights" after night 6. In winter 2 it ran night by night until night 8, then jumped. The skip trigger is inconsistent. **Dead time, then an abrupt cut.**
- **Starve the granary:** once it is empty, raids say "found the store bare: away with nothing", so the nights have no stakes left. Spring was hungry, Yunus "grew thin", and a household left. **Dead time** during the empty-store nights; the payoff came only at the thaw.
- **Spend the granary at the fair:** I took everything in year 1. It went fine, and the game capped me with "You can take nothing more this year." In year 2 I bought "Raise the west wall … for good", and the thaw "brought down the west wall" the very next spring. The purchase was gone in one winter. **Feels broken or unfair.**
- **Walk the lantern back and forth:** it stays "walking" and lights nothing. That is fair.

**5. Difficulty and pacing**
- Passive or abusive play still muddles through, and the losses are slow; the wall "held" several nights with the lantern parked in one place.
- Seasons-speed winters are dead time.
- Dusk at Seasons speed stalls without `wait!`.
- Once the store is empty, nights are pointless until the thaw.
- The thaw and fair pages are the most engaging part.

**6. Bugs and confusions**
- **Same lines from two people:** at the first dawn, Mara and Kian gave the same line word for word: "I left the east wall. I was frozen through." Neither was posted there, and Mara was posted off (`talk Mara 1`, `talk Kian 1`).
- **"Everyone is on the wall" while people are missing:**
  - Night 1: shown with Mara and Kian off the wall.
  - Winter 3, night 1: shown while Joss appeared nowhere on the map.
- **Wrong name on the map:** in winter 3, night 1, the East wall showed "Mara: a figure · (Mara, faint: moved)", yet at dawn Joss said he was on the east wall. It looks like Joss was drawn under Mara's name.
- **"Tore into the store" with no sacks lost:** when the granary was empty, a dawn read "Wolves … tore into the store" and then "(No sacks lost)". The same happens with "carried sacks off".
- **"It was done" despite households leaving:** the winter-3 thaw said "Bring every soul and the granary to the thaw. — It was done." while Joss, Mara, the children and Yunus left that same thaw. No reason was given for their leaving, and the granary was not empty.
- **"Nothing came" contradiction:** the same thaw said "For 83 nights nothing came worth the lantern" and also that the west wall "was still climbed 14 times".
- **Marriage card loops:** "Inge has asked for Kian's hand … he looks glad of it" appeared five times. It came back after I gave my blessing (`card 1`) and after I spoke against it (`card 2`). Each time it resolved as "Kian would not have Inge", which then appeared three times in the chronicle strip. The card also says they have "been walking out a long while" when Inge had arrived alone that spring.
- **Repeating summer matter:** the Kian sling-lesson matter repeated the next year word for word after I ignored it.
- **Wrong home count:** "nine souls in five homes" at the start of winter 3, when a house stood empty (4 huts).
- **Possible misattribution:** Joss, the smith, said "I had a stone in the sling all night"; Tamar has the sling.
- **Card wording vs state:** "Yunus looks back at the steps" while he is dozing, and the Urge option answers "won't (I'm asleep.)".
- **Answer outcomes not shown:** after `answer 2` (call Mara back), nothing told me she refused. I only saw "(Mara, faint: refused)" on the map later.
- **No mark at the fair:** the fair page does not show the granary mark, so "spare" can't be judged there.

**7. Top three changes**
1. Make the text consistent with the state. One quote per person per night should not contradict itself, names on the map must be right, "It was done" must not show when households leave, and "tore into the store" must not show when nothing was lost. This undermines the strongest feature, which is believing the people.
2. Fix matters that repeat and loop. An answered matter (or one left to "they decide") should close, and its outcome should be shown, including the outcome of ignored night cards.
3. Make abuse cost earlier and show insist's trade-off. Show what insist changes in the odds, and make an empty granary or a snapped rope change the night (for example, people refuse to stand a wall with nothing behind it) instead of leaving dead nights. Also, a paid "for good" wall should not fall at the very next thaw without warning.

## First-timer (verbatim)

## The Night Watch: first-timer playtest, seed 7

**Export:** `/private/tmp/claude-504/-Users-abdul-code-human-framework/675a9839-8299-4863-91be-017a92a76ff0/scratchpad/t-watch-first-export.json`
**State:** `/private/tmp/claude-504/-Users-abdul-code-human-framework/675a9839-8299-4863-91be-017a92a76ff0/scratchpad/t-watch-first.json`
**Calls:** about 90 harness calls, through the first winter, the thaw, the first autumn fair and most of the second winter. I stopped mid-second-winter dawn.

### 1. Verdict
I would keep playing, but only for the tension. The night watch works as a game: the lantern, the bell and the people on the wall make a real choice each night. The village talk is the best part. Kian, Ruslan and Mara each refused or fled with a reason on the screen, and I believed them. The weak part is the first hour. I did not understand the granary, the posts, or what the "figures" were, and the screen did not explain them. The game also made me feel like a spectator most of the time. I mostly waited, read, and reacted after a wolf had already gone over a wall.

### 2. First minutes
- **Time to first meaningful choice:** about 6 calls. The first dusk asked me to post watchers, and I understood that much.
- **Clear:** the map (West wall, Gate, Mill wall, East wall), the "Ask / Urge / Insist" press choice, and the roster's "Gate, asked · there now" lines.
- **Unclear:**
  - The granary line `●●●|●●●●●●● ●●●●●●●●●●`. I never learned what the `|` marks or why the groups of dots matter.
  - What "a figure" means on a stretch, and whether it is a wolf, a thief or a villager.
  - Why a post shows two slots, and what the second one does.
  - The tiny `(Kian, faint)` notation. It means "walking to", but I only guessed that after several turns.
  - "Today (folded; shown here)" and "the clock stands while you read this page". I did not know whether the clock stopped for me or kept running.

### 3. The people
This is the strongest part of the game.
- Kian, after I insisted he take the mill wall: "You rang us up for shadows." and then "You insisted on the mill wall. I stood it, and I won't forget it." I believed this. It was my fault, and the reason was clear.
- Ruslan, leaving during the night: "The cold's in my bones. Find someone else." When I called him back, he did not return to the wall I had posted him to. Later he moved on his own: "I can see more from the west wall." Believable, but the game did not let me see why he left the post before the moment.
- Mara, asked to hold: "I couldn't stay at the west wall. Not with them that close." Believable.
- Tamar: "I'll own it: I dozed at the Gate, more than once." Good line. It told me the fatigue was real.
- Joss: "Something hit me at the east wall. My head still rings." "Kian got me off the wall. I owe him." This made me care about the cross-links.

**Problem:** the people often said the same things in different voices. "Something tried the Gate. It didn't try twice." and "Something tried the mill wall. It didn't try twice." are almost identical.

### 4. My agenda (first-timer: keep the village alive, learn the rules)
- I tried to keep every stretch manned and to avoid insisting, because insisting seemed to cost goodwill.
- I rang the bell about four times. Each pull visibly frayed the rope (`≡≡≡≡≡≡` to `≡≡≡≡≡~`). I did not learn why the rope mattered until it was already fraying.
- Lines that struck me:
  - "The wall was crossed." at every dawn. This was the main reader's summary and it always sounded like failure.
  - "Nothing I couldn't handle at the east wall." (Joss)
  - "Quiet. I'm learning which shadows are trees." (Jale)
- The granary went from full to `●●●●|●○○○` by the sixth night and was "nearly bare" at dawn. I had no clear feedback on whether I was doing the right thing. The first winter ended with "A hungry spring," and Yunus "grew thin." The game counted that as the thaw, but I did not feel I had won or lost.

### 5. Difficulty and pacing
- **Too hard for a first-timer:** the moments asked for decisions with options I could not evaluate. "Urge Mara to hold — likely" failed; she went home. "Ring and call by name — holds, but they will resent it" was an unexplained trade-off.
- **Dead time:** at Slow speed, `wait 30` to `wait 40` passed most of a night with almost no change on screen. Most of my calls were waiting. I wanted a way to skip to the next event without losing the moment cards.
- **Too easy:** the fair. Naming an heir took no grain, and the choice seemed to be "pick one person" with no visible cost on the granary. The bell purchase looked more like a spend than an upgrade, and I did not understand the trade-off until I took it.

### 6. Bugs and confusions
Commands that led there are in quotes.
1. **Chronicle won't close.** `chronicle` then `show` stayed on the chronicle. It closed only after `wait 5` or `select Mara`. Command: `"chronicle" show`.
2. **`show` does not always print.** `"lantern mill" show` printed nothing; the next `wait` printed the screen.
3. **Watch began on its own, and my `begin` was refused.** At the sixth dusk I ran `begin` and got "nothing happens: that cannot be done now." The screen had already said the watch "begins at nightfall on its own." The error did not say that.
4. **A talk refusal with no cause.** At the third dawn, `talk Kian 1` returned "nothing happens: that cannot be done now." It is not clear whether the cause was the talk cap, a repeated topic, or something else. The results of other talks in the same batch were also hard to attribute, because talk results print only after the next `show` at dawn.
5. **Call-back went to a different wall.** At the fourth night, `answer 2` ("Call him back to the wall") placed Ruslan on the mill wall, not the east wall he had left. The east wall still showed him as "(Ruslan, faint: afraid)".
6. **Mill wall fallen, not explained in play.** After the first winter the mill wall was "fallen, a gap" and no post could be set there. The thaw text said the wall "cannot be stood next winter", and only the fair offered "rebuild". I did not know that before I chose.
7. **"Urge ... likely" is a bad signal.** Mara with "Urge Mara to hold — likely" left anyway. The word "likely" read as a probability on the screen, but it did not hold up in play.
8. **Heir choice did not show a cost.** After `take 4` (Mara heir), the chronicle said "You named Mara heir to the Gate, before Tamar had said a word." The granary did not change. I could not tell what naming an heir costs, beyond the text.
9. **Granary reading.** The granary bar is three groups of ten. It was hard to tell whether the bar showed the stock, the mark, or the next thaw's need. The lines "The granary must feed ... from the thaw to the harvest" and "up to the mark" did not say which dot row matters.

### 7. Top three changes (ranked)
1. **Explain the first night in one screen.** Name what "a figure" is, what the granary bar and the `|` mean, and why posts have two slots. Show the cost of a bell pull in plain words ("the rope frays with each pull") before the first winter, not after.
2. **Make the watch's outcome visible before dawn.** At dawn, say which stretch lost sacks and who could have held it, in one line per stretch. Right now "the wall was crossed" reads as a single failure, and I could not tell whether I should have posted differently.
3. **Let the clock skip to the next moment.** A "until something happens" wait would fix most of the dead time at Slow speed. Also fix the command issues in section 6 (chronicle closing, `show` output, and the unexplained talk and begin refusals).

## Genre fan (verbatim)

## Playtest report: The Night Watch (genre fan: tower defence and colony sims)

Seed: the harness ignored it, so I played seed 1, not 23. `new 23` said "(a new village, seed 1)".
Export: `/private/tmp/claude-504/-Users-abdul-code-human-framework/675a9839-8299-4863-91be-017a92a76ff0/scratchpad/t-watch-fan-export.json`
I played about 80 calls: two full winters and the start of a third. I did not get a clean win.

**1. Verdict**
I would keep playing, but only as a story game. As a tower defence or colony sim it is too thin.

- **The people are the best part.** Their reasons are specific and tied to each other: "I stayed because Zehra stayed." "With Mara next to me I could stand it." "The bell had me out of my bed."
- **The strategy layer is shallow.** Most nights I posted people, lit a wall, and waited. Almost nothing I did visibly changed the outcome.
- **The wins and losses felt arbitrary.** I could not tell why a night was held or crossed.
- **Year 2 is worse than year 1.** Every watcher is chronically tired, so the same things happen every night.
- **I never got the "one more night" feeling** that Kingdom Rush or RimWorld gives me.

**2. First minutes**
My first meaningful choice came on the first screen, about 1 minute in. It was posting Tamar, Kian and Mara.

- **Clear:** the roster and the tracks warning at the east wall.
- **Unclear: how to use the harness.**
  - Multi-word commands only work as one quoted token ("lantern east"). Unquoted, the arguments are rejected as unknown commands. That cost me about six wasted calls.
  - A command can also be silently ignored: `post Kian off` did nothing.
- **Unclear: how to read the screen.**
  - The lantern shows only one wall. I lit an empty east wall on night 1 and lost 3 sacks.
  - Nothing tells you where the danger is except the scout's tracks, which are sometimes wrong. "The scout was half right: some came on the gate road instead."
- **Unclear: the granary.** The bar has a "|" mark that I only understood after the first thaw emptied the granary.

**3. The people**
They felt like people, and this is the game's strongest point.

- **Excuses at dawn:** "I couldn't keep my eyes open. I went to my bed." "Something came to the foot of the west wall. I didn't stay to see it." I believed these.
- **Pairing:** Joss and Mara, and Teo and Zehra, stood or left together.
- **Mid-night prompts:** "Ruslan can barely keep his eyes open" offers options like "Urge Ruslan to hold — likely" and "Ring and call Ruslan by name — holds; some resentment". Each option shows its odds and its cost, and that is good design.
- **Weak points:**
  - The reasons mostly repeat between nights. Fatigue and fear lines recur ("I'd have fallen off the west wall otherwise", "I hate that stretch").
  - Some people are not tracked at all. Mara left the west wall in two different winters. The game kept posting her there, and the system never told me she was afraid until I read the roster closely.
  - Dawn talks are two per morning and shallow. "How are you holding up?" returned "Fit to stand tonight." with no consequence.
- **Walking away:** Ruslan left in the hungry spring. I got a chronicle line but no scene.

**4. My agenda (win across nights and a season cycle)**
What I tried:

- **Early placement:** I put the strong or best-sight people where the scout's tracks pointed.
  - Mill wall held on night 2 with Joss and Yunus.
  - Wolves still crossed the west wall on night 3 with Kian and Mara there. Mara fled in fear and Kian took a wolf bite.
- **Lantern:** I walked the lantern to the walls where tracks were.
  - "Your lantern turned a thief back at the west wall." That was satisfying.
  - But you must guess which of 4 walls to light.
- **Bell:** I rang it to wake sleepers and call people back.
  - It worked once. Teo and Yunus came back and a thief was driven off.
  - Ringing at nothing costs trust. "You rang us up for shadows." — Kian
  - Ringing once frays the rope to "fraying". That seems very harsh.
  - Ruslan once repaired it.
- **Fair choices:**
  - Year 1: I rebuilt the east wall (a long-term wall decision) and named Mara heir to the Gate.
  - Year 2: I bought the bigger bell and seed grain. After the bell, the screen says "heard the length of the wall".
- **Result:**
  - Winter 1 emptied the granary.
  - Winter 2 failed the goal. "It was not done." Ruslan left, and a thin spring followed. A first-ever "household left" line appeared in the volume.

**5. Difficulty and pacing**
- **Dead time:** the nights. At Slow or Watch speed, 6 to 8 calls pass with only "wait 60" to do.
- **Fast speed:** it skips the night and slows for "A moment on the wall" prompts, which is good. But I could not respond to anything outside prompts.
- **Exhaustion:** almost every watcher ends every night asleep or gone home. The only visible fix is posting people "off" to rest.
- **Winter 1 and 2:** the granary was too weak to survive, and the thaw and fair did the real decisions. Year 1's first night (my error) already cost 3 sacks.
- **Winter 3:** the bigger bell and seed grain meant I did not run out immediately, but I only played one night of it.
- **Repetition:** the "Kian asks Tamar to teach him the sling" matter appeared in both year 1 and year 2 with the same text.

**6. Bugs and confusions**
- `new 23` ignores the seed (harness issue, shown as seed 1).
- Unquoted multi-token commands silently fail with misleading "unknown command" errors, and `quiet` swallowed the next command.
- `post Kian off` and `post Mara off` left them on the West wall at the next night (map still showed them there).
- `post Joss west` / `post Kian mill` gave "(no free post there)" without telling me how to free a post.
- Fast speed has no stop condition for "granary low".
- Dawn text said "Nobody stood the east wall" when Ruslan had been posted and went home mid-night; "nobody held" would be clearer.
- "Call him back to the wall — won't, you think (I'm asleep.)" appears as an option, so the UI offers an action it already says will fail.
- At the thaw: "The thaw brought down the east wall where it was climbed all winter. It cannot be stood next winter." I rebuilt it at the fair, which is a good loop.
- The chronicle strip and the fold hide key info (the people list needs `people`).

**7. Top three changes**
1. **Give the player real tower-defence decisions.** Let me see where danger is and respond: a threat marker per wall, a second light, or a cost-ranked choice of where to place reinforcements mid-night. Right now the only per-minute decision is "which of four walls do I light", with weak information.
2. **Make fatigue visible and manageable before dusk.** Show a plain "tired / rested" state on each watcher, and let me rotate people predictably. Almost every watcher falling asleep every night makes posting feel pointless. Also make `post X off` work reliably.
3. **Cut the repeated lines and surface the consequences.** Vary the dawn excuses, stop repeating the Kian/Tamar matter, and make talks change something (trust, fear, future behaviour). The human twist is the best thing here, but at the moment it is flavour on a thin sim.

## HF-character playtesters, round 1

`node apps/site/scripts/hf-watch-session.ts seeds=2` at `af0bfde`. The owner's soft stop on 2026-10-19 skipped the round-2 rerun.

| persona | seed | ended | min | reached | engagement | longest lull | looked away |
|---|---|---|---|---|---|---|---|
| commuter | 1 | quit | 4 | 1 night | 0.8 | 0s  | 0 |
| commuter | 2 | quit | 3 | 1 night | 0.81 | 0s  | 0 |
| unwinder | 1 | quit | 20 | 2 night | 0.85 | 0s  | 0 |
| unwinder | 2 | quit | 14 | 2 night | 0.85 | 0s  | 0 |
| completionist | 1 | quit | 16 | 2 night | 0.86 | 0s  | 0 |
| completionist | 2 | quit | 14 | 2 night | 0.87 | 0s  | 0 |
| restless | 1 | quit | 12 | 2 night | 0.74 | 3s dusk | 0 |
| restless | 2 | quit | 12 | 2 night | 0.76 | 0s  | 0 |

Every persona quit on distress (`emotion:distress:rest`) during a winter night.

## What we changed

Harness only, in the commit that adds this record. The game is unchanged: the owner called a soft stop on 2026-10-19, after this one fix.
- An unquoted argument now joins the command before it. `new 23`, `post kian east urge` and `wait 20` work without quotes, so `new <seed>` honours the seed.
- Any command but `chronicle` closes the chronicle, as the chronicle page says.

## Deferred

Every other finding is in [watch.md §12](watch.md#12-after-graduation-deferred-features), under "From the polish playtests (2026-10-19)", with a target of 2026-11-05.
