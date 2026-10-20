# The Night Watch — Sam, source-unread playtest

## Session

- Persona: Sam, 40, warehouse supervisor. Plays Frostpunk, Kingdom Two Crowns and FTL. Likes defending a place and deciding who stands where. Evening at home, phone in hand. No temperament was separately specified; I played with curiosity about the people and defensive positions.
- URL: https://human.adamwhite.work/watch/
- Build: no build identifier encountered on the live page. The driver's npm version is not evidence of the deployed game build.
- Device: 360×690 CSS px, touch emulation, light-mode preference, default text size. The rendered game used a dark palette. One post-stop look at 1280×800.
- Access: supplied `npm run lab:play` driver, port 43401; normal documented operations only. Driver PID 9535 was killed by exact PID after the desktop screenshot.
- Limits: floor 0 real minutes; ceiling 25. Played 301.990 seconds, approximately 5:02, from the first actionable opening screen. Desktop inspection followed at 304.774–307.615 seconds and was not continued play.
- In-game span: before the first night through midnight of the second night of the first winter. Default Watch initially; Fast selected at 156.933 seconds to reach the morning sooner; Watch restored at 228.477 seconds for the new defensive arrangement. Automatic slowdown also appeared.
- Time advanced between operations. Dusk people arrived, night phases changed, and events arrived without an input. This was not frozen-time play. Driver waits were real elapsed waits. I cannot watch continuously between returned snapshots; a human might see transient events I missed.
- Read only the two permitted game instruction/checklist files. No game source, tests, prior reports, bundles, internal state or debug APIs inspected. No telemetry sent, run submitted, consent changed or export downloaded.

## First minute

The opening screen was actionable at about 0.493 seconds. The 60-second wait result was received at 60.085 seconds. The checkpoint was logged at 67.214 seconds, about seven seconds late. The answers below use only the note and observations through 60 seconds; later knowledge does not improve their status.

Original checkpoint note, verbatim:

> I am keeping six people and the grain safe until thaw. The gate tracks were the first urgent cue; Gate started selected. Go up to the wall, watcher cards, the speed buttons, lantern posts and bell look tappable. I moved Kian east with Ask, then began the watch and moved the lantern east; the move said it was on its way. I had to scroll the watcher list, and the first full-name Kian tap failed. I met no disabled action. Posting became available at 8 seconds and I first selected Kian at 22 seconds; the east order went in at 26 seconds. I know how to place people and light a stretch, but not yet what a watcher will do when trouble arrives. No help opened.

| Item | Status | Checkpoint evidence |
|---|---|---|
| DL-1 A reason to act | PASS | Keep the people and granary safe until thaw. The opening says “Bring every soul and the granary to the thaw.” The gate-road tracks give an immediate place to attend. |
| DL-2 What can I touch | PASS for identification | Before acting, named Go up to the wall and the expandable help. Named Kian as tappable before selecting him. Cards, speed controls, posts and bell look like controls. No inert decoration deliberately tried in the first minute. First full accessible-name Kian operation failed; scrolling and a text tap succeeded. Treat that driver failure separately from a proven game-control defect. Screenshot 02 shows Kian only partly visible below the fixed bottom bar. |
| DL-3 Urgency and selection | PASS | Gate tracks drew me first. Gate had the selected outline. I chose to spread coverage east while leaving Tamar and the lantern at the tracks. Urgency and selection were distinguishable. |
| DL-4 Why the limit | NOT TESTED | No disabled/unavailable gameplay action met by 60 seconds. A failed harness name lookup is not a fictional action limit. |
| DL-5 Readable situation | PASS | Could name placement, lantern movement and bell as responses. “The lantern is on its way” acknowledged travel. At 60.085 seconds the returned state had advanced to Night with the light at East wall. |
| DL-6 A choice soon | PASS | Defensive posting was available at 8.163 seconds, within 30 seconds, after the short opening goal. First input of any kind: Go up to the wall at 8.163 seconds. First successful watcher selection: Kian at 22.474 seconds. First placement order: East wall at 25.805 seconds. These are separate from availability. |
| DL-7 Learn by doing | PASS for reached interactions | Reached the entry/start flow, watcher posting and lantern movement. “East wall, asked · on the Gate” distinguished the order from the current location; later the figure stood east. Lantern travel had an explicit acknowledgement. No help used. Bell use, watcher accounts, speed changes, other pressure strengths and off-wall posting were NOT TESTED at this checkpoint (5 interaction types). Combat response was not yet understood. |

## Verbatim diary

Elapsed times are the driver's returned `elapsed_s`, rounded to three decimals. Reactions are copied without rewriting. Inputs were one operation at a time. N1/N2 mean first/second night of the first winter. Visible answers are recorded separately from my reactions. Screenshots are in `e-free1-shots/` beside this report.

| Elapsed s | Input / game clock | Original reaction | Important visible answer |
|---:|---|---|---|
| 0.493 | open / before first night | I want to see the place I am defending and who I have to put on watch. | Goal; Go up to the wall; About keeping watch. |
| 3.126 | shot 01-opening-phone.png / before first night | Go up to the wall looks like the way in; About keeping watch looks expandable. | Opening fits the phone. |
| 8.163 | tap Go up to the wall / N1 Dusk | I will get everyone through winter. Let me see my people. | Six souls; gate-road pack tracks; Tamar, Kian, Mara; posting controls. |
| 11.677 | shot 02-first-dusk-phone.png / N1 Dusk | Tracks at the gate draw me first. Tamar is steady there; I want Mara watching the west and Kian covering the empty east. | Tamar card visible; Kian partly below fixed Begin the watch area. |
| 15.509 | tap full accessible name for Kian / N1 Dusk | Kian looks tappable. I am choosing him to move east. | Driver: “No actionable button named Kian Fast, eager Gate, asked · in the village you don’t know them yet”. |
| 19.555 | scroll 250 in posting panel / N1 Dusk | Kian is partly below the bottom bar; I need the rest of the posting list. | Watchers now “there now”. |
| 22.474 | tap text Kian / N1 Dusk | I am selecting Kian now. | Kian selected; Ask, Urge, Insist; post choices; “likely, maybe”. |
| 25.805 | tap East wall / N1 Dusk | Ask should be enough. East is uncovered, so I will put the fast one there. | Kian: “East wall, asked · on the Gate”. |
| 28.972 | tap Begin the watch / N1 Dusk → Nightfall | Kian has been asked east but is still at the gate. That makes sense; he has to get there. I am keeping the lantern at the tracks. | Watch · 4 min/s; lantern and bell controls. |
| 44.665 | wait 12 s / N1 Nightfall | I am watching the gate for those tracks to become something. I can move the lantern or ring the bell. | “The wall settles in for the night.” |
| 48.474 | shot 03-nightfall-phone.png / N1 Nightfall | I want to check Kian has reached the east, but first I am looking for movement at the gate. | All three watchers drawn at their posts; light at Gate. |
| 51.637 | tap East wall / N1 Nightfall | I will sweep the lantern east to check on Kian. | “The lantern is on its way”. |
| 60.085 | wait 5 s / N1 Nightfall → Night | The lantern is on its way, so the move registered. I can see all three watchers on the wall now. | Light at East wall; phase Night. |
| 67.214 | first_minute log / N1 Night | See the verbatim checkpoint note above. | No later observations incorporated into checkpoint. |
| 72.605 | tap scene (295,350) / N1 Night | Kian is the figure on the east. I want to hear whether he has seen anything. | “I’m keeping watch. Nothing close that I can make out.” |
| 76.090 | shot 04-kian-account-phone.png / N1 Night | Good, I can tap the person and get his account directly. Nothing close on the east; I will go back to the gate. | Kian, his post, goal state and reply all readable. |
| 79.265 | tap Gate / N1 Night | I am bringing the light back to the tracks. | Lantern on its way. |
| 83.439 | tap Back to the wall / N1 Night | I have heard Kian; I want the whole watch in front of me again. | “Movement in the dark on the gate road.” Rate 3.1 min/s. |
| 86.536 | tap Ring the bell / N1 Night | There it is, movement at the gate. Ring the bell now; Tamar is right there. | “Tamar drove a wolf off the gate road.” Bell rings; “Holding!”; rope fraying; Bell swinging disabled. |
| 90.158 | shot 05-first-wolf-bell-phone.png / N1 Night | Holding! That is what I wanted to hear. I cannot tell whether my bell helped or Tamar had already handled it. The rope is fraying after one ring, so I should save it. | Ring the bell available again. |
| 94.786 | tap Watchers and bell / N1 Night | I should find out what ringing costs before using it again. | “Calls back watchers who hear it”; “Every pull wears the rope”; everyone on wall. |
| 98.603 | close Watchers and bell / N1 Night | The bell calls people back, it is not an attack order. I rang it when everyone was already on the wall. | Back to normal controls. |
| 102.219 | tap West wall / N1 Night | Tamar has the gate handled. I am sweeping toward Mara now. | Lantern on its way. |
| 125.743 | wait 20 s / N1 Night → Midnight | I am happy to let the quiet run for a bit. I want to see if Mara calls anything out. | Light at West wall; no current hearing entries. |
| 130.368 | tap scene (25,350) / N1 Midnight | Mara has the best sight. I want her account before I move the light away. | “I’m keeping watch. Nothing close that I can make out.” |
| 133.952 | tap Back to the wall / N1 Midnight | All quiet here as well. The mill has nobody, so that is the next place for the light. | Automatic Slow, 1 min/s; “Something at the foot of the gate.” |
| 136.685 | tap Gate / N1 Midnight | Something at the gate again. Bring the light there first; no bell this time. | “Grain is gone: something got over the gate.” Lantern moving. |
| 139.718 | tap scene (115,350) / N1 Midnight | Already over? Tamar was at the gate. I want to know what happened to her watch. | Tamar decision; about 119 seconds; urge “won’t (I’m asleep.)”; ring by name “it may not hold”. |
| 142.609 | shot 06-tamar-decision-phone.png / N1 Midnight | She is asleep. Urging will not work, and the rope may fail. I want to wake her by name rather than leave the gate empty. | 117-second decision; lower say-nothing choice partly behind fixed controls. |
| 146.484 | tap Ring and call Tamar by name / N1 Midnight | Tamar, wake up. I will risk the rope to keep the gate watched. | Bell wakes Tamar; “hold your post!”; “Holding!”; badly frayed rope. |
| 151.351 | note / N1 Midnight | That worked: the bell woke her and she answered by name. The decision gave me nearly two minutes to read. The bottom say-nothing choice was cut by the fixed lantern bar on my phone, though the choice I wanted was visible. | Returned rate Watch · 1 min / 4.2 s. |
| 156.933 | tap Fast / N1 Midnight → small hours | The danger seems over and the night is crawling now. I am trying Fast so I can get to the morning report. | Fast · 12 min/s; “A wolf got over the gate and tore into the store.” |
| 176.023 | wait 15 s / N1 small hours → before dawn | I have paid for moving the lantern away, I think. I want to see how much grain is actually lost by morning. | Tamar nods off; Kian cannot keep eyes open; automatic Slow 1 min/s. |
| 179.421 | pulse 4/5 / N1 before dawn | I care who stays awake now. The first wolf felt manageable; the stolen grain and sleeping watchers made this less comfortable. | First and only scheduled three-minute pulse before stop. |
| 183.679 | tap East wall / N1 before dawn | Kian cannot stay awake. I will carry the lantern east rather than ruin the rope on everyone. | Driver: “No actionable button named East wall”. |
| 187.519 | shot 07-before-dawn-phone.png / N1 before dawn → Dawn | That east tap did not go through. I need to see where the control is now. | Clock stopped; dawn talks and report replace night controls. |
| 191.378 | tap How are you holding up? / N1 Dawn | Tamar was hurt and fell asleep. I want to know whether I can ask this of her again. | Tamar: “Fit to stand tonight.” Daylight enough for one more talk. |
| 194.730 | tap Would you keep the Gate one day? / N1 Dawn | I want a second person who can cover the gate. Let me ask Mara while she is here. | Mara: “Me? I’d try. Someone has to.” No more talks; day's work calls. |
| 197.787 | scroll 400 / N1 Dawn | Mara would try. I need the night report and the way on, which are below these talks. | Report and On to dusk below conversations. |
| 201.734 | shot 08-dawn-report-scrolled-phone.png / N1 Dawn | Nobody stood the east wall by the end. The grain still says plenty; I do not know how costly that breach really was. | Faded sack marks; Kian went home to sleep; Mara pinched herself awake; Tamar's scratch. |
| 205.513 | tap On to dusk / N1 Dawn → N2 Dusk | I want another try with two people at the gate and fewer wasted bell pulls. | Eight souls; mill-race tracks; Joss and Yunus join. Kian spent 6 hours on bell rope. |
| 210.513 | tap scene (205,290) / N2 Dusk | Tracks at the mill this time, and two new people. I want the strong smith moved to support Tamar instead of doubling the mill. | Joss selected; post/pressure controls. |
| 214.109 | tap scene (135,280) / N2 Dusk | Joss, take the gate with Tamar. Yunus can hold the mill; I will bring the lantern there. | No order change. Coordinates were based on the prior scene arrangement; this is not proof of an inert scene target. |
| 217.766 | tap Gate / N2 Dusk | That scene tap did not change the order. I will use the labelled Gate button. | Joss: “Gate, asked · on the Mill wall”. |
| 220.714 | tap Mill wall / N2 Dusk | Now start the lantern at the mill tracks. | Mill wall selected for starting light. |
| 224.512 | tap Begin the watch / N2 Dusk → Nightfall | Five watchers now. This feels more like a line I can arrange instead of three people trying to cover four posts. | Fast · 12 min/s; repaired/sound rope; light at Mill wall. |
| 228.477 | tap Watch / N2 Nightfall | Fast stayed on from last night. I want normal Watch while I learn how this new line holds. | Watch · 4 min/s. |
| 257.255 | wait 25 s / N2 Nightfall → Night | I am holding the light at the mill tracks and letting them do their jobs. | “Wolves along the mill race.” “Yunus drove a wolf off the mill wall.” |
| 262.220 | note / N2 Night | Yunus drove it off without me ringing anything. Leaving the light where the tracks were feels useful. I want to shift a tired watcher or check who needs relief, but I only see lantern and bell controls at night. | Watch controls still lantern, bell, watcher accounts. |
| 266.317 | shot 09-second-night-phone.png / N2 Night | I am looking for Tamar to check whether doubling the gate has helped her. | Joss and Tamar at gate; Yunus at mill; Kian east; Mara west. |
| 269.709 | tap scene (115,350) / N2 Night | Tamar, how is it going at the gate? | “I’m keeping watch. Nothing close that I can make out.” |
| 274.581 | want_quit / FRUSTRATED / N2 Night | I want to rotate the tired people before they fall asleep, and tapping Tamar only gives me the same nothing-close line. I would put this down rather than keep waiting for someone to nod off. | Wish to leave logged. |
| 278.760 | tap Back to the wall / N2 Night | One more look at Watchers and bell in case relief is there. | “Movement in the dark by the east wall.” |
| 282.344 | tap East wall / N2 Night | Movement east interrupts that thought. I will get the light to Kian. | Lantern on its way. |
| 293.139 | wait 8 s / N2 Night | I want to see whether carrying the light changes what Kian can do. | Lantern at East wall; movement line no longer present; no explicit outcome in returned text. |
| 297.827 | tap Watchers and bell / N2 Night → Midnight | The movement line is gone. I will check this once for a way to relieve someone. | Hear-a-watcher buttons; bell help; everyone on wall. No relief control found here. |
| 301.990 | stop / FRUSTRATED / N2 Midnight | I am putting it down here. The placement decisions interested me, and waking Tamar worked, but I cannot find a way to manage relief during the watch. The east movement got my attention for a moment, then disappeared without an answer I could read. I would not leave this running unattended. I might return for a fresh try, but I do not want another night of this right now. | Eight souls; grain plenty above needs; light east; rope sound. |
| 304.774 | resize 1280×800 / post-stop N2 Midnight | Post-stop desktop look only; I am not continuing play. | Wide scene with controls to the right. |
| 307.615 | shot 10-post-stop-desktop.png / post-stop N2 Midnight | No reaction supplied. | Goal/state strip readable; expanded bell help and normal actions fit. |

## Best, worst, leaving and engagement

Best moment: 146.484 seconds, waking Tamar by name and hearing “Holding!” The game connected the person, the action and the reply. My three-minute pulse was 4/5; I cared about who could stay awake.

Worst moment: 269.709–274.581 seconds. After seeing the first night's fatigue, I wanted to arrange relief. Tapping Tamar produced the same nothing-close account instead. I could not find a night-time rotation control. This is a report of what I found, not a claim that no such rule exists anywhere.

Every want_quit: one, at 274.581 seconds, `FRUSTRATED`. Original reason is in the diary. Movement east interrupted it at 278.760 seconds. It did not pass; I stopped at 301.990 seconds with the same reason.

Pulse series: 179.421 seconds, engagement 4/5, verbatim sentence in diary. Session stopped before the next roughly six-minute pulse was due.

I would not leave the watch running unattended. I might return for a fresh attempt because placing the people was interesting, but I would not voluntarily resume this same watch that evening. The game did not finish; I stopped during the second night.

## Clarity findings

| ID | Status | What I saw, in my words | Evidence |
|---|---|---|---|
| DL-22 | FAIL on dusk posting | I needed to scroll the watcher list to reach Kian and select the person I wanted. The initial phone view showed Tamar and part of Kian, with Begin the watch fixed below. Normal night lantern/bell responses did fit without scrolling. | 11.677–22.474 s; 02-first-dusk-phone.png versus 03-nightfall-phone.png. |
| DL-30 | FAIL | The lower choice “…or say nothing: they decide alone” was partly behind the fixed lantern controls. The visible fragment was “…or say nothing: they decide alone”, with its lower portion covered. The choices I used remained readable. | 142.609 s; 06-tamar-decision-phone.png. No stacked sheets observed. |
| DL-13 | FAIL for traceable outcome in this encounter | “Movement in the dark by the east wall” appeared. I sent the lantern there. On the next returned view the line was gone, and I could not read what happened to that movement. Lantern travel itself was acknowledged correctly. I cannot establish whether an outcome appeared transiently between snapshots. | 278.760–297.827 s, driver transcript entries above. |
| DL-14 | FAIL for the first bell use | Before my first ring, I saw its loud/faint reach and “The rope is sound”, but not that each pull wears it. I discovered the wear after the ring. The explanation existed inside Watchers and bell, which I opened afterwards. This is specifically a cost I missed before committing, not a claim that the game contains no explanation. | 03-nightfall-phone.png; 86.536 s input; 94.786 s help text. |
| DL-16 | NOT TESTED as a missing-response defect | I wanted proactive relief but could not find it. The game did offer reactive watcher decisions and a bell. I did not establish that rotating people was a task the game promised me or that it was impossible. | 262.220–301.990 s. This desire caused the quit; it is not proof of a nonexistent control. |

Other encountered observations: DL-4 PASS after the first minute for the brief “Bell swinging” limit, which recovered visibly, and for the asleep warning on urging Tamar. Her decision offered an alternate wake response. The dawn talk limit said the day's work called and each talk cost sleep; I did not independently establish how this recovers. DL-12 PASS for the first dawn boundary: “Clock stopped”, the night's report and “On to dusk” made continuation clear. A final game ending was NOT TESTED. DL-19: my alarm interpretation was corrected by help; the diary does not prove a misleading bell cue rather than my assumption. DL-15: default-speed watcher slowdown was observed, but the full requested fast-speed live-choice test was NOT TESTED. No reload/resume, sending or replay tested (DL-27–29). No claims about builder-only checks, exact hit areas, text enlargement or other themes.

## English, dates, phone and hands on

| ID | Status | Evidence and limit |
|---|---|---|
| DL-20 English | PASS for encountered play | All action-critical language I met was English: posts, Ask/Urge/Insist, bell, fatigue warnings and replies. Character names needed no translation. No necessary untranslated local term encountered. |
| DL-21 Dates | NOT TESTED for deadline comparison | First/second night, first winter, Dusk, Midnight and Dawn were understandable relative time labels. “The thaw is still far off” did not give me a defined thaw date to compare with today. No cross-month/year deadline or return-from-break comparison reached. |
| DL-22 Phone immediate response | FAIL in dusk posting; normal night interaction passed the observed layout check | Kian required scrolling at dusk (02). Lantern controls and Kian's account fit at night (03–04). Dawn report and continuation required scrolling (07–08); I could reach them. |
| DL-30 Cut-off text | FAIL | Say-nothing choice partly covered in 06. I did not see an essential spoken sentence cut mid-way in the other inspected screenshots. |
| DL-31 Read state while acting | PASS for encountered sheets, with a deadline limit | With Kian's account open (04), the strip still showed first night, grain and six souls, and identified Kian at East wall; his figure stayed visible. With Tamar's answer sheet open (06), the goal state, night phase, Tamar and decision countdown stayed visible. Exact thaw deadline comparison was NOT TESTED because none was defined in what I read. |
| DL-32 Something for your hands | NOT TESTED for a forced no-action interval | Longest explicit quiet wait was 25 seconds (232–257 s approximately), chosen voluntarily while holding the mill light. Lantern movement, accounts, bell and speed remained available. From 262.220 to 301.990 s I wanted relief and could not find it, but other actions existed and I used one at 282.344 s. That is not evidence of 40 seconds with only watching possible. The requested builder measurement is NOT TESTED. |
| DL-33 Scene acts | PASS for encountered direct acts; placement uses a panel | Tapping Kian/Mara/Tamar directly opened their spoken account. A lantern-post tap sent the lantern without confirmation. Ring-and-call woke Tamar in one choice with a visible reply. Selecting a watcher at dusk opened Ask/Urge/Insist and post options; choosing the post sent the order without a confirmation form. I did not find a direct proactive relief act. |

The post-stop desktop look (10) had ample scene area and a separate right-hand panel. It does not retest the phone defect or show how the Tamar answer sheet would look on desktop.

## Changes I would want as Sam

1. Let me arrange relief during the watch, or make the existing way visible when I tap a tired watcher. I wanted to prevent sleep, not wait for the next crisis.
2. Keep every live decision choice above the fixed phone controls, including saying nothing.
3. Keep an outcome I can check for a movement report. When I carry the light over, I want to know whether the watcher dealt with it, it got away, or I still do not know.

## Artifacts and limits

- Report: `(driver scratch)/e-free1.md`
- Screenshots: `(driver scratch)/e-free1-shots/` (01 through 10 named above).
- Driver-generated wall-clock log: `(driver scratch)/e-free1-shots/wall-clock.jsonl`. It was not reread to explain play or infer hidden state; this report uses the returned observations and original reactions.
- No export downloaded. No replay claim.
- Two driver name-lookup failures are retained as tool limitations. A scene coordinate tap at 214.109 s used an outdated layout expectation. Neither is reported as proof of a game input defect.
- Checkpoint logging was seven seconds late, disclosed above. No game completion, final outcome or long-term winter balance claim.
