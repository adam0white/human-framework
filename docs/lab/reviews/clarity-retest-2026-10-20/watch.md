# The Night Watch — source-unread phone playtest

Marek, 60, retired surveyor. Plays chess and occasional strategy games. Methodical; wants to know what he is protecting before acting. Reading glasses on. Avoids phone landscape.

Live URL: https://human.adamwhite.work/watch/

No build/version was visibly identified. The desktop title screen later showed a village seed, 20261004; I do not treat that as a build number.

Access: headless Chromium through Playwright, one persistent page controlled by a local Node HTTP server. Phone fixture: 360×690 CSS px, touch emulation, light color preference. The game itself displayed a dark palette. No source, bundles, network payloads, hidden state, storage, debug APIs or prior reports were inspected. Only the two authorized instruction files were read. No telemetry was submitted, no run was sent, and no consent setting was changed.

The first confirmed actionable screenshot was at **2026-10-20 08:28:13.205 UTC** (03:28:13.205 America/Chicago). The initial capture at 08:28:06.845 still showed “Lighting the lantern…” despite returning opening text. I use the later confirmed screen as elapsed zero. The transition occurred somewhere in that 6.36-second interval; choice timings therefore have up to 6.36 seconds of uncertainty. Posting was still available within 30 seconds even using the earlier bound.

Phone play stopped at **08:32:26.866 UTC**, **4:13.7** after the confirmed actionable screen, at the first dawn. The eight-minute ceiling did not end the session. Game time ran continuously at its offered speeds. I selected Fast at +2:24.1 because the quiet wait felt long, then Slow at +3:16.6 to investigate Tamar sleeping; dawn had arrived by that second input. No simulated time was accelerated through scripts or batched decisions.

Raw timestamped commands, reactions and returned text were written as events occurred to `watch-shots/session.jsonl`. Screenshots are in `watch-shots/`. Some immediate post-click screenshots retained the preceding frame; later independent captures establish the resulting screens. Scroll attempts did not move the view. The controller sent a mouse wheel event without positioning the mouse over the content pane, so **scrollability was not established**. I do not claim the game cannot scroll. This limits the depth of the phone playtest.

## First minute

These are the original checkpoint answers, preserved without later rule corrections. The observation was taken at **+64.0 seconds**, four seconds late. The checkpoint text was persisted at +78.9 seconds, before any further gameplay input. Evidence: `08-first-minute.png`, with selection evidence in `07-tamar-selected.png`.

> First minute — recorded at 08:29:17.178Z, 64.0 seconds after the first confirmed actionable screen (70.3 seconds after navigation/loading timer); no inputs during checkpoint.

| Item | Original checkpoint answer |
|---|---|
| DL-1 | **PASS:** I need to keep the people and grain safe until the thaw. The opening says so and the scout reports pack tracks at the Gate. |
| DL-2 | **PASS:** Go up to the wall, About keeping watch, Game menu, the speed buttons and Tamar’s card look tappable. After selecting Tamar the dotted posts become visible. My Gate tap clears her selection. No inert target tried; other watcher cards and lamp-start controls require scrolling. |
| DL-3 | **PASS:** The scout’s tracks message draws me first, with the large Begin the watch button competing below. The outlined Watch speed is selected. Tamar’s selection changed the instruction and exposed dotted posts; she is no longer selected now. The Gate is the known danger. |
| DL-4 | **NOT TESTED:** No unavailable action encountered. |
| DL-5 | **PASS:** It is dusk, I can post watchers or begin the watch. Tamar and Kian are at the Gate and Mara at the West wall. |
| DL-6 | **PASS:** Go up to the wall was available at 0 seconds with a ten-word purpose; first input was About at +9.5 seconds. The posting choice appeared by +20.6 seconds, before mandatory long text; I selected Tamar at +35.3 seconds and tapped Gate at +46.9 seconds. |
| DL-7 | **PASS for two reached interaction types:** opening optional help and assigning Tamar to Gate. Help explains asking versus pressing; selecting Tamar teaches the two-step watcher-then-post action, and Gate clears selection with her card still saying Gate, asked. **NOT TESTED for three interactions named by the help that I have not reached:** moving the night lantern, calling with my voice, ringing the bell. |

The opening button is a start action rather than a strategic choice. The posting choice supplies the strategic-choice evidence for DL-6. A first night action appeared after the checkpoint; it does not change these answers.

## Verbatim diary

Elapsed times below use the confirmed first actionable screenshot. Entries retain their original wording, including guesses and statements later corrected. Input/result details follow separately.

**+0:09.4 — 08:28:22.577 UTC**

> Opening: I am protecting people and their grain until the thaw. That gives me a reason to be here. Go up to the wall and About keeping watch look tappable; I want the explanation first. First confirmed actionable screenshot at 08:28:13.205Z; server timer began 6.36 seconds earlier during loading.

**+0:35.2 — 08:28:48.375 UTC**

> I have come up to the wall. The scout found pack tracks on the gate road, so I want the lamp at the Gate. I can see Tamar and a Begin the watch button, but the rest of the posting choices are below the screen. I will tap Tamar as the instruction says.

**+0:47.0 — 08:29:00.193 UTC**

> Selecting Tamar showed dotted places on the wall and asked where she should stand. I tapped the Gate. I understand asking versus pressing from the help, but I cannot see those controls without scrolling. The lamp is already drawn at the Gate; I am guessing that is where I will start.

**+1:32.5 — 08:29:45.737 UTC**

> I began the watch. The Gate is outlined and lit, which confirms my guess about the lamp. I can see the four lamp destinations. The bell explanation is cut off to the right and its button is not in view. I will wait with my light on the tracks.

**+2:24.0 — 08:30:37.245 UTC**

> I have waited about a minute at the Gate. Something pale is on the road, but I cannot tell what it is. The moon has moved, so time is passing. I want a quicker watch now; I will try Fast.

**+2:31.4 — 08:30:44.649 UTC**

> A choice about Kian appeared as I selected Fast: let him go, urge him to hold, or ring and call him by name. I wanted to urge him, but the next view about 2.5 seconds later had already lost the choice. I did not answer it. The phrase the night waits on you made me think I had time. I do not know what Kian decided.

**+3:16.7 — 08:31:29.892 UTC**

> Tamar has nodded off and Kian has gone home. I switched to Slow so I can work out how to wake her. I expect tapping Tamar might let me speak to her, since the lantern is beside her.

**+4:01.8 — 08:32:14.985 UTC**

> Dawn arrived before my attempt to tap Tamar, so that did not test speaking to a sleeping watcher. The wall held. Hearing that Kian stayed because Tamar stayed is the first time I feel these are people rather than pieces. I would like to ask Tamar how she is holding up, but that question is below the current screen. I am tiring of the cramped view; I have to read a long dawn account before reaching a talk.

**+4:13.7 — 08:32:26.866 UTC**

> I am stopping at the first dawn. I know the wall held and I like the people, but the small-screen layout and the missed Kian decision have taken away my confidence. I would try this on a larger screen; I would not choose another phone night now. The scroll attempts have not moved the view; I cannot tell whether that is my browser control or the page, so I am not calling the game unscrollable. Stop time: this entry.

## Inputs and visible answers

| Elapsed | Input or observation | Answer / evidence |
|---|---|---|
| 0:00 | Opening screen | “Bring every soul and the granary to the thaw.” Two clear opening controls. `02-opening.png`. |
| 0:09.5 | Tap About keeping watch | Expanded help explains the Keeper, lantern, voice, bell rope and asking versus pressing. `03-about.png`. Some help extends below the viewport. |
| 0:15.2 | Wheel scroll attempt | No established movement. `04-about-bottom.png` remained at the same visible position. Tool limitation noted above. |
| 0:20.6 | Tap Go up to the wall | Dusk; “The scout found pack tracks on the gate road.” By +27.6 the screenshot showed watcher card and fixed Begin button. `06-dusk.png`. |
| 0:35.3 | Tap Tamar card | “Where should Tamar stand?” Dotted wall posts appear. Ask/Urge/Insist descriptions and named destinations appear in returned rendered text, mostly below the viewport. `07-tamar-selected.png`. |
| 0:46.9 | Tap Gate on map | Selection clears; Tamar remains “Gate, asked · there now.” This reassigned her to the same location, so it did not prove a relocation. |
| 1:21.8 | Tap Begin the watch | By +1:24.2: Nightfall; “The wall settles in for the night.” Lamp and Gate outline visible. Bell material clipped at the right edge. `09-night.png`. |
| 2:12.7 | Observe | Night; moon moved and a pale mark on the lit road. I could not identify it from the drawing. `10-gate-approach.png`. |
| 2:24.1 | Tap Fast | Returned text included “Night · the night waits on you,” “Wolves on the gate road,” “Kian drove a wolf off the gate road,” and “Kian looks back at the steps.” Choices: “Let Kian go”; “Urge Kian to hold — likely”; “Ring and call Kian by name — holds; some resentment”; “…or say nothing: they decide alone.” |
| 2:26.7 | Observe, no choice input | The Kian choices were gone. Text added “Tamar drove a wolf off the gate road.” `11-kian-choice.png` captures the screen after the choice disappeared, despite its filename. |
| 3:04.8 | Observe | Before dawn; “Tamar nods off at the Gate.” Drawing labels her “asleep.” Returned text says “Off the wall: Kian (gone home)” and “Posts are set at dusk. Tonight you have the lantern, the bell, and what comes to you.” `12-night-later.png`. The off-wall explanation is outside the photographed viewport. |
| 3:16.6 | Tap Slow | By the returned answer it was already Dawn. “The wall held.” |
| 3:16.8 | Tap Tamar's drawing | No new conversation appeared; the dawn report remained. This cannot establish whether a night watcher can be tapped to speak. |
| 3:22.1 | Observe dawn | Report lists all four wall stretches. Kian: “I stayed because Tamar stayed.” Tamar: “Kian was beside me when they came. That helped.” `13-dawn.png`. Returned rendered text includes morning talk controls below the viewport and “Each talk costs them a little sleep.” |
| 4:01.9–4:04.7 | Tap report text, wheel attempt, observe | No established movement or new response. `14-dawn-after-scroll-attempt.png`. I did not reach a morning talk or a second dusk. |
| 4:13.7 | Stop phone play | First dawn, voluntarily before the budget; access limitation affected the decision. |

The rendered-text captures include text below the viewport. Layout claims use screenshots. I did not treat offscreen text as an on-screen control.

## Best, worst, and leaving

**Best:** The dawn accounts. Kian staying because Tamar stayed made the assignments feel like relationships. The initial purpose also worked immediately: people and grain through winter is enough reason to act.

**Worst:** Seeing a consequential Kian choice in the text capture and losing it before I could choose. “The night waits on you” did not match the time I actually had. I do not know when that choice first appeared or whether my Fast tap changed its remaining time.

Boredom began during the quiet first night, by +2:24, when I chose Fast. Frustration began at the missed Kian decision around +2:27. At dawn I wanted a conversation, but the phone screen showed a long account before the talks. The ineffective scroll control limits any conclusion about reaching those talks.

I stopped at the first dawn. The wall had held; the larger goal of reaching thaw remained unfinished. I would return on a larger screen. I would not voluntarily continue this phone session as it stood.

## Clarity findings

| ID | Status | Evidence and limit |
|---|---|---|
| DL-1–DL-3 | PASS in checkpoint scope | Purpose, controls tried, selection and known Gate danger were understandable. |
| DL-4 | NOT TESTED | No visibly unavailable control was deliberately tested. “Posts are set at dusk” later explains a limit, but I did not verify a blocked posting attempt at night. Builder checks not tested. |
| DL-5–DL-7 | PASS in checkpoint scope | See original answers. Bell, voice and moving the night lamp remain untested. |
| DL-8 | PASS for reached messages | Scout report and wolf/sleep messages stood out above the scene. No claim about every story clue. |
| DL-9 | NOT TESTED | Did not test finding a missed obligation on request. |
| DL-10 | PASS in reached labels | Gate, Tamar, Kian and wall names stayed recognizable across the screens reached. |
| DL-11 | NOT TESTED | No systematic essential-word count or builder layout check. |
| DL-12 | PASS for first-night boundary | Dawn says “The wall held,” lists each stretch, and offers morning activity in rendered text. Full-game ending not reached. |
| DL-13 | PASS for tested posting input | Tamar selection promptly changed the prompt; Gate cleared selection and left a traceable posting status. No duplicate-input or delayed request test. |
| DL-14 | PASS for encountered explanations | Help says pressing costs goodwill; Kian choice says “some resentment”; bell description warns of rope wear; morning text says talks cost sleep. Bell and talk commitments not tested. |
| DL-15 | FAIL for encountered choice timing | Kian choice present at 08:30:37.322 and absent at 08:30:39.858, with no answer input between. I could not read, inspect and answer. Fast was selected at the first capture; I cannot isolate whether the speed change caused this. Speed state itself is visible through outlines. |
| DL-16 | NOT TESTED for waking Tamar | She fell asleep, but dawn arrived before my attempted response. I cannot conclude there is no response. |
| DL-17 | PASS in reached presentation | Dutiful/jumpy descriptions, spoken accounts and “asleep” label conveyed people’s states; no mood bar encountered. |
| DL-18 | NOT TESTED | No basis to audit what all displayed quantities mean in the fiction. |
| DL-19 | FAIL for timing cue | “The night waits on you” led me to expect more time than the observed choice afforded. The pale road mark was unclear to me, but I do not establish that its drawing was misleading. |
| DL-20 | PASS in reached play | English purpose, wall labels, actions, state descriptions and help. No necessary untranslated local term encountered. |
| DL-21 | NOT TESTED for deadline comparison | “The first night of the first winter” and Dusk/Night/Before dawn/Dawn are understandable English. I met no dated deadline to compare with today, across months/years, or after a break. |
| DL-22 | FAIL | At dusk most watcher/pressure/lamp-start controls were below the 360×690 view; at night the bell action was not visible and adjacent explanation was cut off on the right. At dawn talk controls were below the long account. `06`, `07`, `09`, `12`, `13`. The fixed Begin button and four night-lamp controls were visible. Long help scrolling is not itself a failure. |
| DL-23 | NOT TESTED | Small map dots were successfully tapped, but hit areas were not measured. No claim that their targets violate a size rule. |
| DL-24 | NOT TESTED | No sheet chain opened. |
| DL-25 | FAIL for observed phone clipping only | Night bell material extends past the right edge, with partial words visible at x≈344–359. `09-night.png` and `12-night-later.png`. Horizontal scrolling, 320 px width, 200% text size and theme comparison not tested. |
| DL-26 | PASS for discoverability only | “Game menu” consistently visible at top. Contents and save/run grouping not opened or verified. |
| DL-27 | NOT TESTED for actual resume | Post-session reload offered “Continue the chronicle” with “the first year, winter, after the first night.” I did not press Continue or compare resumed state. |
| DL-28 | NOT TESTED | Sending prohibited for this assignment. |
| DL-29 | NOT TESTED | No export downloaded, import/replay attempted, or builder check performed. |

The clearest observed failures are **DL-22/DL-25: bell content clipped at the phone’s right edge**, and **DL-15/DL-19: a Kian decision disappears quickly despite “the night waits on you.”** Untested actions and scrolling limitations are evidence gaps, not claims that the game lacks a rule or control.

## Requested desktop opening look

After stopping, I resized the same page to 1280×800 and reloaded. I took one desktop screenshot: `15-desktop-first-screen.png`, 08:32:34.718 UTC. I did not resume or start anew.

The opening has a wide scene on the left and a readable right panel. Continue, the save-location sentence, Begin anew and About are all visible. The header says “Before the first night” while the Continue description says “after the first night”; I read the latter as the saved position. This desktop opening look does not test desktop night controls or fix the phone findings.

## Changes I would want, ranked

1. Keep the bell action and its rope/call explanation inside the phone screen. I need to see the response when a watcher sleeps or leaves.
2. Give me enough time to read and answer a watcher’s decision, including when I select Fast. Make the waiting cue match the actual time available.
3. Let me reach the morning talks with less phone scrolling while keeping the dawn accounts available. Those accounts made me care about the watchers.

No export was downloaded. No replay claim is made.
