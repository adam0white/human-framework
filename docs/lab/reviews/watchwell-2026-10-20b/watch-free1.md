# The Night Watch — Sam, free stop

## Session

Sam, 40, warehouse supervisor. Plays Frostpunk, Kingdom Two Crowns and FTL. Likes defending a place and deciding who stands where. Patient; evening at home, phone in hand.

URL: https://human.adamwhite.work/watch/. No build identifier encountered. The visible setting was **Hard winter**. Standard lab driver, port 43601, phone fixture 360×690 CSS px, touch emulation, light mode, default text size. One 1280×800 desktop look after stopping.

Committed floor: 0 real minutes. Ceiling: 25 real minutes. Driver elapsed starts at opening; first actionable screen appeared at 4.477 s. First wish to leave: 392.802 s (6:32.8 driver elapsed; 6:28.3 after first actionable screen). Stop: 419.577 s (6:59.6 driver elapsed; 6:55.1 after first actionable screen). Final visible phase was **the second night of the first winter · The small hours**, with eight souls and grain plenty above spring food needs. The stop note says Midnight, the phase seen immediately before writing it; the fresh stop reply already said The small hours.

Time advanced between inputs. This was live play, not frozen-time play. I used real driver waits. I chose Slow at 96.441 s, Watch at 111.938 s, Slow at 220.567 s and Watch at 241.082 s. Reasons are preserved below. I did not choose Fast, Days or Seasons. The game also slowed automatically during threats and the Joss decision.

I read the two permitted playtest documents, used player-facing controls and screenshots, and used this session's generated wall-clock diary to prepare the report. No game source, tests, prior reports, prior logs or hidden state were inspected. No run was sent, telemetry submitted, consent changed or export downloaded. The driver was terminated with `kill 23480`, its printed exact PID. No driver block occurred.

## First minute

The checkpoint was logged at 69.877 s, **65.400 s after the first actionable screen**, about 5.4 s late. The table uses only observations established within the first 60 actionable seconds; it does not promote later learning into a pass.

Original checkpoint note:

> I am trying to get six people and the grain through winter. Gate tracks gave me a reason to leave the steady sling there and send Kian east. Watcher cards, post buttons, speed buttons and the gold Begin button look tappable; the scene also says I can tap it, but I have used the buttons. Gate was selected for the lantern; Kian was named above the scene when I inspected him. I know what is underway, but have not seen an attack yet. Kian reached east, and I cannot speak to him while my lantern is at the gate. I would move closer. No help opened. I am interested in seeing whether this line holds.

| Item | Status | Checkpoint answer and evidence |
|---|---|---|
| DL-1 A reason to act | PASS | Keep people and food through winter. Opening: “Bring every soul and the granary to the thaw.” The scout's gate-road tracks gave a concrete first threat. |
| DL-2 What can I touch | PASS | I identified the gold start button, expandable plus lines, watcher cards, post and speed buttons before using them. Named taps worked. No inert item tried in the first minute. Scene tapping was advertised but not yet tried. Screenshots 01–03. |
| DL-3 Urgency and selection | PASS | Gate tracks drew me first. Gate had the selected outline for the lantern. Inspecting Kian put his name and east assignment above the scene. No competing emergency appeared in the first minute. Screenshots 02–03. |
| DL-4 Why the limit | PASS | At 48.593 s: “Too far away for your voice to reach” and “Out of your voice: the lantern is at the Gate.” Kian was at East wall. I understood moving closer as the remedy; I had not yet tested it. Screenshot 03. |
| DL-5 Readable situation | PASS | Kian's order first read “East wall, asked · on the Gate,” then “there now.” The watch was underway; I could inspect people or move the lantern. “Only the lantern’s stretch shows what approaches. Your voice reaches the next stretch.” |
| DL-6 A choice soon | PASS | Posting choices established at driver 11.654 s, 7.177 s after the first actionable screen. First start input: 11.654 s. First watcher selection: 20.782 s (16.305 s after actionable screen). First consequential post order: 25.429 s (20.952 s after actionable screen). These are separate times. The opening goal was 11 words; I did not have to open long help before posting. |
| DL-7 Learn by doing | PASS for reached interactions | Three interactions reached: posting Kian, beginning the watch, inspecting a watcher. The order's location changed before arrival; the later account confirmed arrival and taught voice range. No optional help opened. Six other interactions were NOT TESTED at the checkpoint: lantern movement, ringing the bell, rest request, help request, going down, and pressing harder than Ask. No refusal/relationship consequences learned yet. |

## Verbatim diary

Times below are the driver's wall-clock elapsed seconds. Inputs are copied from this session's log. Reactions retain their original wording, including guesses and phase labels that became stale during an input. Important visible answers follow in a separate evidence table. The raw diary is [wall-clock.jsonl] (screenshot in driver scratch).

- **0.427 s · input** — `open`

- **4.477 s · input** — `wait {"s": 2}`

- **7.548 s · input** — `shot {"file": "01-opening-phone.png"}`

  > Bring everybody and the food store through winter. Go up to the wall looks like the way in; the two plus lines look expandable. I want to see who I can post.

- **11.654 s · input** — `tap {"name": "Go up to the wall", "role": "button"}` — Before the first night

  > I will start the watch and see the crew.

- **16.915 s · input** — `shot {"file": "02-posting-phone.png"}` — First night, first winter · Dusk

  > Tracks at the gate: I want the steady sling there and the best eyes on the west. Gate is already picked for the lantern. The night starts itself, so I should get on with it.

- **20.782 s · input** — `tap {"name": "Kian Fast, eager Gate, asked · there now you don’t know them yet", "role": "button"}` — First night, first winter · Dusk

  > Two at the gate leaves the east empty. I will try putting the fast one east.

- **25.429 s · input** — `tap {"name": "East wall", "role": "button"}` — First night, first winter · Dusk

  > Ask is selected. I expect this sends Kian east, rather than needing another confirmation.

- **28.710 s · input** — `tap {"name": "Begin the watch", "role": "button"}` — First night, first winter · Dusk

  > Kian has an east order but is still on the gate; movement takes time. The lantern stays gate-side for those tracks. Let us start.

- **41.752 s · input** — `wait {"s": 10}` — First night, first winter · Nightfall

  > I am watching the gate first. Only the lit stretch shows an approach, so I will have to move the lantern rather than trust the whole wall is safe.

- **45.393 s · input** — `tap {"name": "Watchers", "role": "button"}` — First night, first winter · Nightfall

  > I want to check Kian got where I sent him and see whether anyone needs a break.

- **48.593 s · input** — `tap {"name": "Kian", "role": "button"}` — First night, first winter · Nightfall

  > I can hear each watcher from this list. The bell has a real cost, so I am leaving it alone until there is trouble.

- **52.247 s · input** — `shot {"file": "03-kian-out-of-reach.png"}` — First night, first winter · Nightfall

  > He did get east. I cannot talk to him from the gate; I need to carry the lantern closer. That is a useful limit, not a mystery.

- **60.042 s · first_minute** — `shot {"file": "first-minute.png"}`

- **69.876 s · input** — `wait {"s": 11}` — First night, first winter · Nightfall

- **69.876 s · first_minute** — `log` — First night, first winter · Nightfall

  > I am trying to get six people and the grain through winter. Gate tracks gave me a reason to leave the steady sling there and send Kian east. Watcher cards, post buttons, speed buttons and the gold Begin button look tappable; the scene also says I can tap it, but I have used the buttons. Gate was selected for the lantern; Kian was named above the scene when I inspected him. I know what is underway, but have not seen an attack yet. Kian reached east, and I cannot speak to him while my lantern is at the gate. I would move closer. No help opened. I am interested in seeing whether this line holds.

- **76.474 s · input** — `tap {"name": "Back to the wall", "role": "button"}` — First night, first winter · Night

  > I will walk the light across to Kian, then check the empty mill stretch.

- **78.640 s · input** — `tap {"name": "East wall", "role": "button"}` — First night, first winter · Night

- **88.433 s · input** — `wait {"s": 7}` — First night, first winter · Night

  > The lantern is on its way, so this is walking time rather than an instant map view.

- **93.174 s · input** — `tap {"name": "Gate", "role": "button"}` — First night, first winter · Night

  > Of course the gate gets company as I leave it. I am bringing the light back before pulling a worn rope for no reason. The game slowed itself for this.

- **96.441 s · input** — `tap {"name": "Slow", "role": "button"}` — First night, first winter · Night

  > I lost grain before getting back. I am choosing Slow to give myself time to read the watch and work out what Tamar did.

- **99.322 s · input** — `tap {"name": "Tamar", "role": "button"}` — First night, first winter · Night

  > Tamar was right there. I want his account before I change the posting.

- **103.576 s · input** — `shot {"file": "04-tamar-after-loss.png"}` — First night, first winter · Night

  > He says he cannot make anything out yet, after the log says something stole grain. I cannot tell if he missed it or the account only describes right now. No help request is offered because nobody is tired, hurt, or facing a wolf at the wall now.

- **108.075 s · input** — `tap {"name": "Back to the wall", "role": "button"}` — First night, first winter · Night

  > The loss is real but we still have plenty. I am staying with this watch; I want to catch the next approach.

- **111.937 s · input** — `tap {"name": "Watch", "role": "button"}` — First night, first winter · Night

  > Back to Watch speed now I have read the account. I am not changing the positions tonight unless somebody needs help.

- **115.687 s · input** — `tap {"name": "Back to the watch", "role": "button"}` — First night, first winter · Night

- **134.289 s · input** — `wait {"s": 15}` — First night, first winter · Night

  > For now I am choosing to hold the gate light and watch. I do not want to ring everybody off their posts without an attack in front of me.

- **139.227 s · input** — `shot {"file": "05-midnight-wall.png"}` — First night, first winter · Midnight

  > Midnight already. I would like to hear Mara while keeping the gate lit; she is the jumpy one.

- **142.327 s · input** — `tap {"x": 25, "y": 305}` — First night, first winter · Midnight

  > I am tapping Mara herself on the west wall.

- **145.307 s · input** — `tap {"name": "Back to the wall", "role": "button"}` — First night, first winter · Midnight

  > Tapping the person works. Mara sounds fine, and I can reach her from the gate. I will stay central.

- **167.512 s · input** — `wait {"s": 18}` — First night, first winter · Midnight

  > Good, Tamar drove one off. Keeping him and the light at the gate feels like a decision paying off, though I cannot prove the light caused it.

- **184.967 s · input** — `wait {"s": 12}` — First night, first winter · The small hours

- **185.006 s · pulse** — `log` — First night, first winter · The small hours; engagement 4

  > I want this first night to hold. Tamar driving the wolf off gave me something to trust, and I am watching for tiredness before dawn.

- **189.053 s · input** — `tap {"x": 115, "y": 303}` — First night, first winter · The small hours

  > I will check the person doing the fighting before I ask for anything else.

- **192.854 s · input** — `tap {"name": "Back to the wall", "role": "button"}` — First night, first winter · The small hours

  > Still no sign of tiredness, so I cannot rotate or rest him yet. I would normally offer a short break before he is exhausted, but I understand what unlocks it here.

- **216.351 s · input** — `wait {"s": 20}` — First night, first winter · The small hours

  > I am waiting out this quiet part rather than sweeping the light away from the known gate road again.

- **220.567 s · input** — `tap {"name": "Slow", "role": "button"}` — First night, first winter · Before dawn

  > Now two are falling asleep. Slow again so I can sort out a rest rather than let them both go under.

- **223.201 s · input** — `tap {"name": "Watchers", "role": "button"}` — First night, first winter · Before dawn

- **226.051 s · input** — `tap {"name": "Tamar", "role": "button"}` — First night, first winter · Before dawn

  > Kian has gone home. I want Tamar to rest on the wall rather than lose the gate entirely.

- **231.988 s · input** — `shot {"file": "06-no-rest-after-nodding.png"}` — First night, first winter · Before dawn

  > I just saw Tamar nod off, but his account still says no sign of tiredness and offers no rest. Maybe he has recovered; I cannot tell. This is the first time I feel I cannot give the crew the order I mean.

- **236.800 s · input** — `tap {"name": "Back to the wall", "role": "button"}` — First night, first winter · Before dawn

  > I will get to dawn and see what the next watch lets me change. I cannot plan a relief midwatch from here.

- **241.082 s · input** — `tap {"name": "Watch", "role": "button"}` — First night, first winter · Before dawn

  > Back to Watch speed to finish the night; I have read the available orders.

- **244.217 s · tool** — `tap {"name": "Back to the watch", "role": "button"}` — First night, first winter · Before dawn

  Driver reply: Back to the watch is not on the page now; it was listed 3 s ago and the page has changed (game state, not a driver failure)

- **249.489 s · input** — `shot {"file": "07-dawn-phone.png"}` — First night, first winter · Dawn

  > Dawn stops the clock. We kept everyone but the gate was crossed. I want to hear Kian about the fatigue; each talk costs sleep, so I will pick one rather than ask everybody everything.

- **252.448 s · input** — `tap {"x": 264, "y": 584}` — First night, first winter · Dawn

  > Kian: how are you holding up?

- **256.318 s · input** — `scroll {"dy": 450, "x": 180, "y": 555}` — First night, first winter · Dawn

  > Kian says nothing is wrong. I take that as his answer, not a fatigue meter. I am scrolling to read the night report before letting them sleep.

- **260.489 s · input** — `shot {"file": "08-dawn-report-scrolled.png"}` — First night, first winter · Dawn

- **266.084 s · input** — `tap {"name": "On to dusk", "role": "button"}` — First night, first winter · Dawn

  > I will try one more night with Kian helping at the gate rather than standing alone east. All six are alive; I want to see if a tighter line works.

- **270.568 s · input** — `tap {"name": "Kian Fast, eager East wall, asked · there now heeds you", "role": "button"}` — Second night, first winter · Dusk

  > Two new watchers, and tracks at the mill now. That gives me enough people to keep the gate paired and the mill paired. I will move Kian back to Tamar.

- **273.817 s · input** — `tap {"name": "Gate", "role": "button"}` — Second night, first winter · Dusk

  > Mill is full, so I can see that a post has a capacity. Gate still offers room for Kian.

- **277.299 s · input** — `tap {"name": "Mill wall", "role": "button"}` — Second night, first winter · Dusk

  > The scout names the mill race, so the lantern begins there tonight.

- **280.832 s · input** — `tap {"name": "Begin the watch", "role": "button"}` — Second night, first winter · Dusk

  > Same speed, stronger mill post, Kian at the gate. I want to see these orders in action.

- **305.293 s · input** — `wait {"s": 20}` — Second night, first winter · Nightfall

  > I am deliberately holding the mill light tonight. I am curious whether two watchers make the difference.

- **310.466 s · input** — `tap {"name": "Watchers", "role": "button"}` — Second night, first winter · Nightfall

  > I want to hear the new smith at the threatened post while there is still time.

- **313.234 s · input** — `tap {"name": "Joss", "role": "button"}` — Second night, first winter · Nightfall

  > Wolves at the mill now. Joss, what can we do?

- **318.489 s · input** — `shot {"file": "09-mill-defended.png"}` — Second night, first winter · Night

  > Both new watchers drove wolves off before I could give an order. That feels good for the posting, but his identical cannot-make-anything-out answer tells me little about the fight I just saw.

- **323.167 s · input** — `tap {"name": "Back to the wall", "role": "button"}` — Second night, first winter · Night

  > I will hold the mill light and let them do their jobs. I want to see whether this night costs less food.

- **327.181 s · input** — `tap {"name": "Back to the watch", "role": "button"}` — Second night, first winter · Night

- **354.827 s · input** — `wait {"s": 25}` — Second night, first winter · Night

- **359.802 s · input** — `shot {"file": "10-joss-children-choice.png"}` — Second night, first winter · Night

  > This is a real call: Joss hears wolves near his children. I have Kian with Tamar at the gate, so I want to let Joss go and ask Tamar to cover his post. Might means I should not count on it.

- **364.279 s · input** — `tap {"name": "Let him go; send Tamar to the post might (someone else stands there now)", "role": "button"}` — Second night, first winter · Night

  > Let him go; send Tamar. I have left another watcher at the gate for exactly this sort of gap.

- **367.842 s · pulse** — `log` — Second night, first winter · Night; engagement 5

  > Letting Joss protect his children while covering his post is the sort of command decision I came for. The long slowdown gave me time to read it.

- **373.494 s · input** — `tap {"name": "East wall", "role": "button"}` — Second night, first winter · Night

  > Now I want light where his children are, not just at his old post.

- **377.092 s · input** — `tap {"name": "Watchers", "role": "button"}` — Second night, first winter · Night

  > Joss nodded off at the mill after I let him go. I cannot tell whether my answer was accepted, refused or still pending. I need to check him.

- **381.860 s · input** — `tap {"name": "Joss", "role": "button"}` — Second night, first winter · Night

  > Now Yunus says Joss ran home. That answers half of it. I still want to know whether Tamar is covering.

- **384.428 s · input** — `tap {"name": "Back to the wall", "role": "button"}` — Second night, first winter · Night

- **387.259 s · input** — `tap {"name": "Tamar", "role": "button"}` — Second night, first winter · Midnight

  > Where is the covering watcher now?

- **392.800 s · want_quit** — `log` — Second night, first winter · Midnight; CONFUSED

  > I would put this down here. My best decision was letting Joss go and sending Tamar, but Joss went home and Tamar is still Gate, asked. I cannot tell what part of my order happened or why the cover did not move. I would rather stop than spend another night guessing what my orders mean.

- **397.826 s · input** — `tap {"name": "Back to the wall", "role": "button"}` — Second night, first winter · Midnight

  > One last check: get within speaking distance of Tamar.

- **400.924 s · input** — `tap {"name": "Mill wall", "role": "button"}` — Second night, first winter · Midnight

  > Mill is close enough to speak to the gate and still see Joss’s post.

- **406.492 s · input** — `wait {"s": 3}` — Second night, first winter · Midnight

- **411.974 s · input** — `tap {"name": "Tamar", "role": "button"}` — Second night, first winter · Midnight

- **419.547 s · input** — `shot {"file": "11-tamar-still-gate.png"}` — Second night, first winter · Midnight

  > Even in reach there is no account of the cover order. Maybe might was a refusal warning, but I cannot see a reply. I am done for tonight; I would close it rather than leave the clock running.

- **419.576 s · stop** — `log` — Second night, first winter · Midnight; CONFUSED

  > Stopping at Tamar’s account in the second night, still eight souls and grain above spring needs. My wish to leave did not pass after moving within voice. I like the posting and the Joss choice, but I would not voluntarily start another watch tonight without understanding what happened to the cover order. I would close the game, not leave it running.

- **425.044 s · input** — `resize {"width": 1280, "height": 800}` — Second night, first winter · The small hours

  > Post-stop desktop look only.

- **425.226 s · input** — `shot {"file": "12-desktop-after-stop.png"}` — Second night, first winter · The small hours

## Important visible answers

| Driver elapsed | Input or observation | Visible answer |
|---|---|---|
| 4.478 s | Opening loaded | “Bring every soul and the granary to the thaw.” “Go up to the wall.” |
| 11.654 s | Go up to the wall | Gate-road pack tracks; Tamar and Kian assigned Gate, Mara West wall; choose lantern start and Begin the watch. |
| 20.782 s | Select Kian | Ask / Urge / Insist; “likely, maybe”; post choices. |
| 25.429 s | Ask Kian East wall | “East wall, asked · on the Gate.” |
| 28.710 s | Begin the watch | Nightfall; Watch · 4 min/s; “The wall settles in for the night.” |
| 48.593 s | Inspect Kian | “East wall, asked · there now”; too far for voice from Gate. |
| 78.640 s | Carry lantern east | “The lantern is on its way.” |
| 88.433 s | Wait | “Movement in the dark on the gate road.” “Something at the foot of the gate.” Automatic Slow · 1 min/s. |
| 93.174 s | Carry lantern Gate | “Grain is gone: something got over the gate.” Grain status still plenty above spring food needs. |
| 99.323 s | Inspect Tamar | “I’m keeping watch. The scout warned us about this stretch. I can’t make anything out yet.” No rest/help without tiredness, hurt or wolf at wall. |
| 142.328 s | Tap Mara in scene | Her account opened: “I’m keeping watch. Nothing close that I can make out.” |
| 145.307 s | Return to wall | “Tamar drove a wolf off the gate road.” |
| 216.351 s | Wait | “Tamar nods off at the Gate.” Kian: “I can’t keep my eyes open.” |
| 223.202 s | Open watchers | “Off the wall: Kian (gone home).” “Posts are planned at dusk.” |
| 226.051 s | Inspect Tamar | Same keeping-watch account; “No rest or help request is offered without a sign of tiredness, hurt or a wolf at the wall.” No rest control. |
| 244.217 s | Back to the watch attempted as dawn arrived | “Clock stopped”; Dawn report and talks replaced the night controls. The old control was no longer present. This was a game transition, not a driver failure. |
| 249.489 s | Dawn look | “The wall was crossed.” Gate wolves got over and Tamar drove wolves off. Everyone survived. Talks cost sleep. |
| 252.448 s | Ask Kian how he is holding up | “Nothing wrong with me.” “Daylight enough for one more talk.” |
| 266.084 s | On to dusk | Second night; eight souls; Joss and Yunus arrived; pack tracks along mill race. |
| 270.569 s | Select Kian | Mill wall · tracks disabled; “Every post is assigned.” Gate enabled. I inferred mill capacity from this. |
| 273.826 s | Ask Kian Gate | “Gate, asked · on the East wall.” |
| 280.832 s | Begin with lantern Mill wall | Watch speed; second night begins. |
| 310.467–313.235 s | Open watchers, inspect Joss | Wolves along mill race; then both Joss and Yunus drove a wolf off. Joss's account still “I can’t make anything out yet.” |
| 354.828 s | Wait | East-wall movement; Joss hears wolves near his two children. “About 110 seconds; then they decide alone.” Four answers offered. Slow · watcher decision · 1 min / 60 s. |
| 364.280 s | Let him go; send Tamar | Choice closed. The button had warned “might (someone else stands there now).” I saw no immediate confirmation of departure, cover request or refusal. |
| 373.494 s | Move lantern east | “Joss nods off at the mill wall.” Grain stolen over east wall. |
| 377.092 s | Open watchers | Yunus: “Joss’s run home: something near the house.” Joss marked gone home. |
| 381.860 s | Inspect Joss | “not posted · gone home.” “Last heard: ‘Joss nods off at the mill wall.’” This older last-heard line appeared beside Yunus's newer report. |
| 387.260 s | Inspect Tamar | “Gate, asked · there now”; out of voice from east. |
| 397.826 s | Return to wall | “Everyone is on the wall.” Joss had returned by this observation; I did not see a return announcement. |
| 411.974 s | Inspect Tamar after moving light to mill | Still “Gate, asked · there now.” “I’m keeping watch. Nothing close that I can make out.” No answer about the earlier cover request. |
| 419.547–419.577 s | Final phone screenshot and stop | Second night · The small hours; eight souls; grain plenty above spring food needs; Tamar still at gate. |

## Best, worst, pulses and wanting to leave

**Best:** 354.828–367.842 s. Joss's children decision. I could let him protect his family while asking another watcher to cover. I had deliberately left Kian with Tamar, so the decision connected to my plan. Engagement reached 5/5. Screenshot [10-joss-children-choice.png] (screenshot in driver scratch).

**Worst:** 373.494–419.577 s. I could not trace the cover request. The choice closed, Joss later went home, and Tamar still showed Gate. The option warned “might (someone else stands there now)”; I knew success was uncertain. I could not tell whether it was refused, pending or never issued. This is a missing answer in my experience, not proof of a simulation error.

| Time | Kind | Score / reason | Original reaction |
|---|---|---|---|
| 185.006 s | pulse | 4/5 | I want this first night to hold. Tamar driving the wolf off gave me something to trust, and I am watching for tiredness before dawn. |
| 367.842 s | pulse | 5/5 | Letting Joss protect his children while covering his post is the sort of command decision I came for. The long slowdown gave me time to read it. |
| 392.802 s | want_quit | CONFUSED | I would put this down here. My best decision was letting Joss go and sending Tamar, but Joss went home and Tamar is still Gate, asked. I cannot tell what part of my order happened or why the cover did not move. I would rather stop than spend another night guessing what my orders mean. |
| 419.577 s | stop | CONFUSED | Stopping at Tamar’s account in the second night, still eight souls and grain above spring needs. My wish to leave did not pass after moving within voice. I like the posting and the Joss choice, but I would not voluntarily start another watch tonight without understanding what happened to the cover order. I would close the game, not leave it running. |

There was one want_quit. No earlier wish to leave was expressed in the diary. The rest-order frustration at 231.988 s was real, but I explicitly chose to continue to dawn, then chose another night.

**Hard, but kept going:** Yes. At 96.441 s I chose Slow after losing grain while carrying the lantern back. I wanted more reading time and stayed to understand the defense. I returned to Watch at 111.938 s. At 220.567 s I used Slow again to attempt a rest after the crew began falling asleep. I did not search for an easier winter. The grain loss itself did not make me quit.

## Clarity findings

- **DL-13 FAIL — I could not trace the cover request.** At 364.280 s I chose “Let him go; send Tamar to the post,” with the warning “might (someone else stands there now).” Closing the choice acknowledged my tap, but I found no sent, queued, refused or resolved answer for Tamar. At 387.260 s and again in speaking range at 411.974 s, Tamar still said “Gate, asked · there now.” I do not know why. References: diary inputs at those times; screenshots [10] (screenshot in driver scratch) and [11] (screenshot in driver scratch). This is not a demand that he obey.
- **DL-4 FAIL later in play — I could not reconcile the rest limit with the recent sign.** At 216.351 s I saw “Tamar nods off at the Gate.” At 226.051 s his account offered no rest or help and said these require a sign of tiredness, hurt or a wolf at the wall. I could not tell whether the sign had passed, he recovered, or a different condition was meant. First-minute DL-4 remains PASS for the separate voice-range encounter. Reference: [06-no-rest-after-nodding.png] (screenshot in driver scratch), plus the 216.351 s visible reply.
- **DL-5 FAIL for explaining the recent action, not the whole scene.** After the grain loss and after the mill defense, accounts said “I can’t make anything out yet.” These may describe only the present. They did not help me understand the event I had just watched. Joss's “Last heard” also quoted his nodding off while Yunus's newer departure report was visible. I could read locations and current broad goals; I could not read what happened to the cover request. References: [04] (screenshot in driver scratch), [09] (screenshot in driver scratch), and the 381.860 s reply. No claim that these accounts lack an internal rule.

## English, dates, phone and hands

| Item | Status | Observation and limits |
|---|---|---|
| DL-20 English | PASS for encountered play | All action labels, traits, warnings and choices I used were English. Gate, mill race, granary and thaw were understandable in context. No required unfamiliar local term encountered. |
| DL-21 Dates | PASS for encountered relative time | First and second night of first winter, Dusk/Nightfall/Night/Midnight/Before dawn/Dawn were readable without translation. The Joss choice gave seconds remaining, visibly decreasing 110 to 105. I could compare that deadline with now. Cross-month/year deadlines and returning from a break: NOT TESTED. The exact thaw date was not shown; “still far off” gave only approximate progress. |
| DL-22 Phone response visibility | PASS for the live night and Joss answer; NOT TESTED for every posting option | At 360×690, the Joss choices, deadline, relevant wall and winter status were visible together without scrolling (10). Watcher accounts and Back to the wall fit (03, 04, 06, 09, 11). Posting lists extended below the view (02); I used named controls, which do not establish that every tapped item was initially in the viewport. Dawn's full report and On to dusk required scrolling (07–08). |
| DL-30 Nothing cut off | PASS for sentences and live answers inspected; dawn scrolling recorded separately | No mid-sentence clipping, ellipsis, “Scroll ↓”, overlapping sheets or covered live answer observed in the inspected screenshots. The long dawn panel required an inner scroll to reach the night report and “On to dusk”; screenshot 07 shows the initial talks, 08 the bottom report and continuation. I record that response below the initial view, without treating ordinary scrolling through the long report as proof of sentence clipping. |
| DL-31 State while acting | PASS for encountered sheets | During Kian/Tamar/Joss accounts and Joss's choice I could read the winter, grain, soul count and selected person or concerned post. The Joss deadline and all answer choices stayed visible (10). Exact numeric thaw progress was never offered. |
| DL-32 Hands-on availability | NOT TESTED as a universal 20-second guarantee | I could carry the light, inspect people and ring the bell. The longest explicit wait was 25 real seconds, from input to reply at 327.181–354.828 s about 27.6 s including time before issuing the wait; I chose to hold the mill light. I wanted a pre-emptive rest at 192.855 s and a rest after nodding at 226.051 s, but could not give it. Other actions remained available, so I cannot call this a measured interval where I could only watch. No proven forced-watch gap. |
| DL-33 Scene acts | NOT TESTED for the full one-act requirement | Tapping Mara directly opened her account (142.328 s). Carrying the lantern was one post-button input with visible travel. Posting Kian opened a sheet with Ask/Urge/Insist and post choices; default Ask needed no extra Confirm. I did not test tapping a scene post while posting, ring the bell, or perform a rest/help request. I cannot claim that a form is the only route to a core act. |

The desktop look at 425.226 s showed the same Tamar account in a right-hand panel, the wall on the left, and the state strip across the top. The text was readable and no overlap was visible: [12-desktop-after-stop.png] (screenshot in driver scratch). I made no further gameplay decisions on desktop.

Other encountered items: DL-12 PASS for the first dawn boundary (“Clock stopped,” report, talks and “On to dusk”). DL-14 PASS for the encountered warnings: bell wears rope, talks cost sleep, cover only “might” happen. DL-15 PASS for the Joss reading window: the decision remained open across roughly 9.5 real seconds from first reply to answer, with more than 100 seconds still available; Watch resumed afterward. The first short gate threat still outran my trip back. DL-26 PASS for discovering Game menu, which stayed at the top; its contents were not inspected. DL-27 resume, DL-28 sending and DL-29 export/replay: NOT TESTED. Builder-only checks, target dimensions, 200% text, 320 px width, alternate themes and later winters: NOT TESTED.

## Stop and return

I stopped by choice, not because the game ended, the ceiling expired or the driver failed. The wish to leave persisted through one final attempt to get within voice and inspect Tamar. I would close the page rather than leave the watch running. I would not voluntarily play another watch tonight. I would be willing to return if I could understand how a covering request is answered; the family decision and choosing posts suited my taste.

## Changes I would want, ranked

1. Tell me what happened to Tamar's cover request: heard, on the way, refused, or no longer needed. He can refuse; I want to know his answer.
2. When someone just nodded off, let me understand why rest is still unavailable or what changed before I opened their account.
3. Let the watcher acknowledge the fight or loss I just saw when I ask for their account. I want to learn from the last defense before setting another watch.

No game export was downloaded. No replay claim is made. Evidence is this report, the screenshots, and the driver's current-session wall-clock diary.
