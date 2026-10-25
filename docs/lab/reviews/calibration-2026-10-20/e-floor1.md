# The Night Watch — Sam, source-unread phone playtest

Sam, 40, warehouse supervisor. I play Frostpunk, Kingdom Two Crowns and FTL. I like defending a place and deciding who stands where. This was an evening at home, phone in hand.

- URL: https://human.adamwhite.work/watch/
- Date: 20 October 2026. First screen logged at 16:34:30 UTC; stop at 16:49:43 UTC.
- Build: no build identifier observed.
- Device: supplied 360×690 CSS px phone fixture, touch emulation, light mode, default text size. One 1280×800 look after stopping.
- Access: the assigned `npm run lab:play` command, persistent page, port 43411. Driver PID 10285 was terminated by exact PID after the desktop screenshot.
- Commitment: floor 15 real minutes; ceiling 25. Stopped at **15:13.8**, fourth night of the first winter, small hours, with Yunus’s decision open. Reason: **FRUSTRATED**. The game had not ended.
- No source, tests, other repository documents, previous reports or previous logs were inspected. The two assigned instruction files were read. This report uses live-page replies, screenshots and this session’s own driver log. No send-run control or consent setting was used. No export was downloaded.

Time moved between commands: people travelled, the clock advanced, events arrived and dawn replaced controls. All waits used the driver’s real wait operation. I used the visible Fast control at 08:40.1 because the quiet remainder had become waiting, kept it for the third night, then returned to Watch at 12:08.4 because I missed the successful fight live. I used no other speed control. Automatic threat and watcher-decision slowdowns were visible.

The driver’s text replies include content below the phone viewport. I used screenshots to distinguish text available through the harness from text visible without scrolling. This matters especially for the roster, dawn results and the fourth response in tall decision sheets. My observations are intermittent; missed live events at Fast do not prove the game failed to show them.

## First minute

The driver captured `first-minute.png` automatically at 60.036 s. My written checkpoint was logged at 65.662 s, **5.7 s late**. Its answers refer to play through 59.728 s; no new gameplay input occurred between that wait and the note. This is a timing deviation, not an exactly-on-time written checkpoint.

Original checkpoint, unchanged:

> I am keeping six people and grain safe until thaw. Go up to the wall, watchers, Ask/Urge/Insist, post buttons, Begin the watch, speed, lantern stretches and bell look usable. The gate tracks drew me first; outlines show selection. Gate was disabled for Mara without a reason; moving Kian freed it, so I guessed two spaces. I can move the lantern or ring the bell while the watch runs. Posting choice appeared at 6.7 seconds; I first selected Mara at 14.7 seconds and first changed an order at 32.9 seconds. Asking Kian east and Mara gate taught me requested post differs from current position. I opened About asking and pressing; it explained pressure and tired/frightened watchers. I have not tried bell, speed or talking yet.

| Item                       | Status                         | Checkpoint answer and evidence available by 60 s                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 A reason to act       | PASS                           | Keep six people and the grain safe until thaw. Opening: “Bring every soul and the granary to the thaw.” At dusk, tracks on the gate road gave me a reason to choose posts now.                                                                                                                                                                                                                                                                                                                                    |
| DL-2 What can I touch      | PASS, for reached controls     | Go up to the wall, watcher cards, Ask/Urge/Insist, post buttons, Begin the watch, speed controls, lantern stretches and bell looked usable. I selected Mara at 14.7 s and Kian at 30.2 s, then issued orders. No inert decoration was tried in this minute. The roster extended below the phone viewport; this is a layout limitation, not proof the visible buttons looked inert. Scene figures had not yet been tapped.                                                                                         |
| DL-3 Urgency and selection | PASS                           | Gate tracks drew me first. Post and pressure outlines showed selection. Gate tracks competed with covering the empty East wall; I moved Kian east and Mara to Gate. Screenshots `02-posting.png`, `03-mara-order.png`.                                                                                                                                                                                                                                                                                            |
| DL-4 Why the limit         | FAIL                           | Mara’s “Gate · tracks” button was disabled with no visible reason. I guessed two spaces were occupied. It became available after I moved Kian, but the capacity rule remained my guess. Help explained pressure, not this limit. `03-mara-order.png`, 20.0 s; available at 36.5 s.                                                                                                                                                                                                                                |
| DL-5 Readable situation    | PASS                           | I could name a response: move the lantern or ring the bell while the watch ran. At 44.0 s the game said only the lantern’s stretch shows approaches and my voice reaches the next stretch.                                                                                                                                                                                                                                                                                                                        |
| DL-6 A choice soon         | PASS for availability          | Posting choices appeared at 6.7 s. First selection: Mara at 14.7 s. First order change: Kian to East wall at 32.9 s. The start input was 6.7 s; it was not itself the posting choice. Choices were available within 30 s without a long forced story.                                                                                                                                                                                                                                                             |
| DL-7 Learn by doing        | PASS for the two order changes | Kian became “East wall, asked · on the Gate”; Mara became “Gate, asked · on the West wall.” That taught me requested position differs from current position. I opened About asking and pressing at 23.1 s; it explained pressure and tired/frightened watchers. Three reached interaction types: watcher selection, pressure help, post orders. Three named interaction types remained NOT TESTED at this checkpoint: bell, speed change and watcher conversation. Urge/Insist consequences were also NOT TESTED. |

## Verbatim diary

Every original reaction follows, including uncertainty and mistaken expectations. Entries without a reaction remain as input records. Game clocks are the words recorded at input, sometimes the last-seen clock rather than the answer’s updated clock. Wait timestamps are completion times; their durations are in the input. Important visible answers follow the diary. Screenshot names resolve in `e-floor1-shots/`.

**00:00.4 · input**

Input: `open {}`.

> I want to see what place I am defending and who I can put on watch.

**00:03.3 · input**

Input: `shot {"file": "01-opening.png"}`.

Recorded game clock: Before the first night.

> Go up to the wall looks like the start. The job is clear enough: keep everyone and the grain alive until thaw.

**00:06.7 · input**

Input: `tap {"name": "Go up to the wall", "role": "button"}`.

Recorded game clock: Before the first night.

> I am going up to see the posts.

**00:11.3 · input**

Input: `shot {"file": "02-posting.png"}`.

Recorded game clock: First night, first winter, Dusk.

> Tracks on the gate road draw me first. Tamar already keeps the Gate. I want Mara watching the same road with that eyesight.

**00:14.7 · input**

Input: `tap {"text": "Mara"}`.

Recorded game clock: First night, Dusk.

> I tap Mara to change her post.

**00:20.0 · input**

Input: `shot {"file": "03-mara-order.png"}`.

Recorded game clock: First night, Dusk.

> Gate tracks is greyed out. I cannot tell why she cannot go there; perhaps two people already fill it.

**00:23.1 · input**

Input: `tap {"text": "About asking and pressing"}`.

Recorded game clock: First night, Dusk.

> I look for why the Gate is unavailable.

**00:27.9 · input**

Input: `tap {"name": "Back to watchers", "role": "button"}`.

Recorded game clock: First night, Dusk.

> The help explains pressure, not the grey Gate. I will move fast Kian to cover the empty east side, then try Mara at the Gate.

**00:30.2 · input**

Input: `tap {"text": "Kian"}`.

Recorded game clock: First night, Dusk.

> Kian can cover the other end, I think.

**00:32.9 · input**

Input: `tap {"name": "East wall", "role": "button"}`.

Recorded game clock: First night, Dusk.

> I ask Kian to the east wall rather than insist before I know him.

**00:36.5 · input**

Input: `tap {"text": "Mara"}`.

Recorded game clock: First night, Dusk.

> The order changed immediately, but he was still on the Gate. That reads as travel, which makes sense.

**00:39.6 · input**

Input: `tap {"name": "Gate · tracks", "role": "button"}`.

Recorded game clock: First night, Dusk.

> Now the Gate is available. That supports my guess about room for two, but the game has not said it.

**00:44.0 · input**

Input: `tap {"name": "Begin the watch", "role": "button"}`.

Recorded game clock: First night, Dusk.

> Two on the tracks, one on the far end, lantern at the Gate. Let us see them do it.

**00:59.7 · input**

Input: `wait {"s": 12}`.

Recorded game clock: First night, Nightfall.

> I watch the Gate first. I have a lantern to move and a bell to call the others, but I do not want to ring it for nothing.

**01:00.0 · first_minute**

Input: `shot {"file": "first-minute.png"}`.

**01:05.7 · first_minute**

Recorded game clock: First night, Nightfall.

> I am keeping six people and grain safe until thaw. Go up to the wall, watchers, Ask/Urge/Insist, post buttons, Begin the watch, speed, lantern stretches and bell look usable. The gate tracks drew me first; outlines show selection. Gate was disabled for Mara without a reason; moving Kian freed it, so I guessed two spaces. I can move the lantern or ring the bell while the watch runs. Posting choice appeared at 6.7 seconds; I first selected Mara at 14.7 seconds and first changed an order at 32.9 seconds. Asking Kian east and Mara gate taught me requested post differs from current position. I opened About asking and pressing; it explained pressure and tired/frightened watchers. I have not tried bell, speed or talking yet.

**01:10.1 · input**

Input: `shot {"file": "04-nightfall.png"}`.

Recorded game clock: First night, Nightfall.

> I want to see where everyone actually stands, not just what I asked.

**01:15.8 · input**

Input: `tap {"x": 155, "y": 352}`.

Recorded game clock: First night, Nightfall.

> Mara is next to Tamar at the Gate. I tap her figure to hear how it looks.

**01:18.5 · input**

Input: `tap {"name": "East wall", "role": "button"}`.

Recorded game clock: First night, Night.

> Mara has no sighting. I carry the lantern over to Kian to check the uncovered end.

**01:42.0 · input**

Input: `wait {"s": 20}`.

Recorded game clock: First night, Night.

> I let the lantern get there; it says on its way, so this is not instant.

**01:44.7 · input**

Input: `tap {"name": "Gate", "role": "button"}`.

Recorded game clock: First night, Night.

> Movement at the Gate and Mara has left. Bad time for my inspection trip. I bring the light back.

**01:48.3 · input**

Input: `tap {"name": "Ring the bell", "role": "button"}`.

Recorded game clock: First night, Night; automatic Slow 1 min/s.

> Something is at the foot of the gate. This is what the bell is for. I ring it now.

**01:53.0 · tool**

Input: `tap {"name": "Back to the wall", "role": "button"}`.

Recorded game clock: First night, Night.

> Already lost grain. I cannot tell if the bell was late or just did not stop it. The header still says plenty, so I take this as some grain lost, not all of it.

Driver answer: `No actionable button named Back to the wall`.

**01:56.4 · input**

Input: `shot {"file": "05-gate-loss.png"}`.

Recorded game clock: First night, Night.

> Back to the wall did not respond through the driver; I check the screen before trying again.

**02:02.9 · input**

Input: `tap {"name": "Let Mara go", "role": "button"}`.

Recorded game clock: First night, Night; watcher decision.

> She is exhausted; I let her go. Oddly I had just been told she was already in the hall. I do not want another pull on a fraying rope.

**02:09.7 · input**

Input: `tap {"text": "Watchers and bell"}`.

Recorded game clock: First night, Night.

> I need to know whether the bell brings people back or just warns them.

**02:13.9 · input**

Input: `tap {"name": "Tamar", "role": "button"}`.

Recorded game clock: First night, Night.

> The bell calls watchers back, and now it says everyone is on the wall. I ask Tamar what she sees at the Gate.

**02:47.5 · input**

Input: `wait {"s": 30}`.

Recorded game clock: First night, Night.

> I leave the light on the warned road now and watch. I do not see an attack or defend button; I am trusting the people I posted.

**02:53.1 · input**

Input: `tap {"name": "Ring the bell", "role": "button"}`.

Recorded game clock: First night, Midnight.

> A wolf is at the Gate, Mara went home, and Tamar says something is close. I need people back now even if the rope wears.

**02:57.0 · pulse** · engagement 4/5

Recorded game clock: First night, small hours.

> Tamar drove the wolf away and called Holding; that is the first time the post choice feels like people defending a place, though I cannot tell whether my bell helped.

**03:02.6 · input**

Input: `tap {"name": "Back to the wall", "role": "button"}`.

Recorded game clock: First night, small hours.

> I want to check Kian and see if I can shift him back toward the danger.

**03:05.7 · input**

Input: `tap {"name": "Kian", "role": "button"}`.

Recorded game clock: First night, small hours.

> Posts are set at dusk. Fair enough, I cannot shift him during the night. I check his account anyway.

**03:10.3 · input**

Input: `tap {"name": "Mill wall", "role": "button"}`.

Recorded game clock: First night, small hours.

> I move one stretch over instead of leaving the Gate two stretches behind. Maybe I can hear both from the middle.

**03:44.8 · input**

Input: `wait {"s": 30}`.

Recorded game clock: First night, small hours.

> I let the lantern travel and listen for Kian.

**03:49.9 · input**

Input: `shot {"file": "06-kian-before-dawn.png"}`.

Recorded game clock: First night, Before dawn.

> From the Mill wall I can hear Kian. That makes the distance rule feel useful. I am waiting for dawn to fix my assignments and that rope.

**04:25.2 · input**

Input: `wait {"s": 30}`.

Recorded game clock: First night, Before dawn.

> Nothing close at Kian end. I leave the bell alone and wait for morning.

**04:29.0 · input**

Input: `shot {"file": "07-first-dawn.png"}`.

Recorded game clock: First night, Dawn; Clock stopped.

> Kian calls it shadows while Mara says she ran from wolves. I like that they did not all have the same night. I want to hear Mara before asking her back.

**04:36.7 · input**

Input: `tap {"x": 92, "y": 664}`.

Recorded game clock: First night, Dawn.

> I ask Mara about last night. The dawn result is below the talks on my phone; I have not scrolled down to read it on screen.

**04:41.6 · input**

Input: `scroll {"dy": 280, "x": 180, "y": 550}`.

Recorded game clock: First night, Dawn.

> Mara says she was frozen through. I want to check Tamar after she held the Gate, and see the dawn report.

**04:47.7 · input**

Input: `shot {"file": "08-dawn-scroll.png"}`.

Recorded game clock: First night, Dawn.

**04:55.2 · input**

Input: `scroll {"dy": -170, "x": 180, "y": 450}`.

Recorded game clock: First night, Dawn.

> The scroll took Tamar out of view. I move back up to her question.

**05:00.0 · input**

Input: `shot {"file": "09-tamar-talk.png"}`.

Recorded game clock: First night, Dawn.

**05:07.4 · input**

Input: `tap {"x": 258, "y": 468}`.

Recorded game clock: First night, Dawn.

> I ask Tamar how she is holding up. She earned the second talk.

**05:13.3 · input**

Input: `tap {"name": "On to dusk", "role": "button"}`.

Recorded game clock: First night, Dawn.

> Tamar is fit for tonight. I move on; I want Mara away from the threat and Kian beside Tamar this time.

**05:17.7 · input**

Input: `tap {"text": "Mara"}`.

Recorded game clock: Second night, Dusk.

> Two new watchers and they worked on the rope during the day. Good, the village is doing things. Tracks moved to the mill race, so I leave those two there and put Mara on the west.

**05:21.4 · input**

Input: `tap {"name": "West wall", "role": "button"}`.

Recorded game clock: Second night, Dusk.

> I ask Mara west, where nothing came last night. I do not want to force the jumpy watcher onto fresh tracks again.

**05:25.9 · input**

Input: `tap {"text": "This winter"}`.

Recorded game clock: Second night, Dusk.

> How far away is thaw? I open This winter before starting.

**05:29.1 · input**

Input: `tap {"name": "Begin the watch", "role": "button"}`.

Recorded game clock: Second night, Dusk.

> That tells me why grain matters, but not how many nights to thaw. I begin with the lantern on the mill tracks and two new watchers there.

**05:57.3 · input**

Input: `wait {"s": 25}`.

Recorded game clock: Second night, Nightfall.

> The rope is sound again. I hold the light where the tracks are and see whether the pair can manage without my bell.

**06:01.0 · pulse** · engagement 4/5

Recorded game clock: Second night, Nightfall.

> I am trying a different defence with two fresh watchers on the new tracks. Seeing the rope repaired and people arrive gives me a reason to keep going.

**06:06.3 · input**

Input: `tap {"text": "Watchers and bell"}`.

Recorded game clock: Second night, Nightfall; automatic Slow.

> Wolves at the mill race. I want Yunus account before spending the rope.

**06:09.9 · input**

Input: `tap {"name": "Yunus", "role": "button"}`.

Recorded game clock: Second night, Night.

> Both drove wolves off without a bell. That feels much better than chasing the first attack. I ask the calm miller what is left.

**06:42.7 · input**

Input: `wait {"s": 30}`.

Recorded game clock: Second night, Night.

> The pair are holding. I choose to watch rather than keep moving the light away from them.

**06:48.0 · input**

Input: `shot {"file": "10-joss-children.png"}`.

Recorded game clock: Second night, Night; watcher decision.

> Joss wants to reach his children. I can let him go and ask Tamar to cover, but someone else stands there now. I want to see the cost before choosing.

**06:57.5 · input**

Input: `tap {"name": "Let him go; send Tamar to the post might (someone else stands there now)", "role": "button"}`.

Recorded game clock: Second night, Night; watcher decision.

> I let Joss get to his children and ask Tamar to cover. Yunus is still at the mill, so I think that avoids leaving it empty. Kian looks home in the scene; the east side worries me.

**07:00.6 · input**

Input: `tap {"name": "Ring the bell", "role": "button"}`.

Recorded game clock: Second night, Night.

> Kian has gone home while something is at the east wall. I ring to call him back.

**07:05.8 · input**

Input: `tap {"name": "East wall", "role": "button"}`.

Recorded game clock: Second night, Night.

> The bell woke Joss at the mill instead of showing him going to his children, and Kian remains home. I do not know whether Tamar accepted the cover request. I move the light east to see the actual danger.

**07:39.5 · input**

Input: `wait {"s": 30}`.

Recorded game clock: Second night, Night.

> Everyone is back on the wall now. I wait for the lantern rather than ring twice.

**07:44.9 · input**

Input: `tap {"name": "Kian", "role": "button"}`.

Recorded game clock: Second night, Midnight.

> I check Kian now that the lantern has reached him. I want to know why he left and whether he will stay.

**08:18.4 · input**

Input: `wait {"s": 30}`.

Recorded game clock: Second night, Midnight.

> He says only that he is keeping watch. I can look at him, but I cannot ask why he left until dawn. I wait for the next call.

**08:24.3 · want_quit** · FRUSTRATED

Recorded game clock: Second night, small hours; watcher decision.

> I would put the phone down here. Kian has gone home again; calling him back says he is already asleep while the question says he is climbing down. I want to cover his post, but the only offered choices are let him go or a call that says it will not work.

**08:27.8 · input**

Input: `shot {"file": "11-kian-asleep-choice.png"}`.

Recorded game clock: Second night, small hours; watcher decision.

> I keep playing, but this is where I first wanted to leave.

**08:33.0 · input**

Input: `tap {"name": "Let Kian go", "role": "button"}`.

Recorded game clock: Second night, small hours.

> I let him sleep rather than spend effort on a call marked will not work. I will try resting someone before the next watch.

**08:40.1 · input**

Input: `tap {"name": "Fast", "role": "button"}`.

Recorded game clock: Second night, small hours.

> I choose Fast for the quiet remainder. I am waiting for the next dusk to rest Kian and change the defence, not enjoying more of the same checks.

**08:44.5 · input**

Input: `tap {"name": "Mill wall", "role": "button"}`.

Recorded game clock: Second night, small hours; automatic Slow.

> Another crossing at the mill and Yunus gone home. I bring the light back toward Joss. The speed reads Slow for the threat even after I chose Fast.

**09:03.6 · input**

Input: `wait {"s": 15}`.

Recorded game clock: Second night, small hours; Fast 12 min/s.

> I am waiting out the night now. The rope is still usable, but the bell has not kept tired people on post.

**09:07.3 · pulse** · engagement 2/5

Recorded game clock: Second night, Dawn.

> I still care who holds each stretch, but the night became repeated departures and losses while my useful response was mostly a bell. I am curious whether deliberate rest changes that.

**09:12.1 · input**

Input: `tap {"name": "How are the knees?", "role": "button"}`.

Recorded game clock: Second night, Dawn.

> Yunus has a specific question about his knees. I want to know whether he needs a night off.

**09:17.9 · input**

Input: `shot {"file": "12-second-dawn-talks.png"}`.

Recorded game clock: Second night, Dawn.

**09:26.6 · input**

Input: `scroll {"dy": -360, "x": 180, "y": 450}`.

Recorded game clock: Second night, Dawn.

> I scroll back to Kian to ask how he is holding up.

**09:29.4 · input**

Input: `shot {"file": "13-kian-dawn-talk.png"}`.

Recorded game clock: Second night, Dawn.

**09:34.4 · input**

Input: `tap {"x": 264, "y": 626}`.

Recorded game clock: Second night, Dawn.

> I ask Kian how he is holding up after twice going home.

**09:38.1 · input**

Input: `tap {"name": "On to dusk", "role": "button"}`.

Recorded game clock: Second night, Dawn.

> Nothing wrong with him, he says. I still want to try a night off rather than keep making the same request.

**09:41.9 · input**

Input: `tap {"text": "Kian"}`.

Recorded game clock: Third night, Dusk.

> Ruslan can cover the East wall now. I select Kian to give him the night off.

**09:45.4 · input**

Input: `tap {"name": "Off the wall", "role": "button"}`.

Recorded game clock: Third night, Dusk.

> I ask Kian off the wall. I am trying rest as a real staffing choice, with Ruslan taking his stretch.

**09:49.1 · note**

Recorded game clock: Third night, Dusk.

> Off the wall produced not posted, will find a spot on the wall. That is not the night off I meant. I cannot tell how to give him rest; the button sounds like removing him from the watch.

**09:53.1 · input**

Input: `tap {"text": "Yunus"}`.

Recorded game clock: Third night, Dusk.

> I cannot arrange the rest I wanted. I can at least put calm Yunus beside Tamar on tonight tracks.

**09:58.3 · input**

Input: `tap {"name": "Gate · tracks", "role": "button"}`.

Recorded game clock: Third night, Dusk.

> I ask Yunus onto the Gate with Tamar. Joss keeps the mill; Mara west; Ruslan east; Kian chooses for himself apparently.

**10:02.0 · input**

Input: `tap {"name": "Gate", "role": "button"}`.

Recorded game clock: Third night, Dusk.

> I start the lantern at the Gate instead of having to carry it there when wolves arrive.

**10:05.3 · input**

Input: `tap {"name": "Begin the watch", "role": "button"}`.

Recorded game clock: Third night, Dusk.

> I begin. I will leave Fast selected to get through the quiet stretches; the game slowed for threats before.

**10:28.0 · input**

Input: `wait {"s": 20}`.

Recorded game clock: Third night, Nightfall; Fast.

> I watch this Gate pair and keep my hands off the bell unless somebody leaves.

**11:03.4 · input**

Input: `wait {"s": 30}`.

Recorded game clock: Third night, Night; Fast.

> Still quiet. I am waiting for the choices to prove useful, rather than wanting to patrol for its own sake.

**11:08.9 · tool**

Input: `tap {"text": "Watchers and bell"}`.

Recorded game clock: Third night, Before dawn; Fast.

> Tamar nodded off. I check who is actually on the wall before ringing for shadows again.

Driver answer: `No visible clickable text: Watchers and bell`.

**11:12.8 · input**

Input: `shot {"file": "14-third-dawn.png"}`.

Recorded game clock: Third night, Before dawn, last seen.

> The driver did not find Watchers and bell; I look again rather than repeat the tap.

**11:18.7 · note**

Recorded game clock: Third night, Dawn.

> The wall held. Tamar and Yunus each say they stayed because the other stayed. That is better than a stat bonus: I can picture the pair holding one another up. I missed their wolf fight in the live text at Fast; dawn is where I learned it happened.

**11:25.2 · input**

Input: `scroll {"dy": 430, "x": 180, "y": 500}`.

Recorded game clock: Third night, Dawn.

> I want to talk to Joss about home after that choice with his children.

**11:28.8 · input**

Input: `shot {"file": "15-joss-talk-position.png"}`.

Recorded game clock: Third night, Dawn.

**11:36.5 · input**

Input: `scroll {"dy": -150, "x": 180, "y": 460}`.

Recorded game clock: Third night, Dawn.

> Joss question is under the fixed scene edge after that scroll. I move back a little.

**11:40.0 · input**

Input: `tap {"x": 91, "y": 473}`.

Recorded game clock: Third night, Dawn.

> I ask Joss how things are at home.

**11:46.7 · input**

Input: `shot {"file": "16-ruslan-talk-position.png"}`.

Recorded game clock: Third night, Dawn.

> Ruslan said nobody spoke to him; I want to hear his first night before carrying on.

**11:53.7 · input**

Input: `tap {"x": 97, "y": 549}`.

Recorded game clock: Third night, Dawn.

> I ask Ruslan about last night. He is new and stood alone east.

**11:57.9 · pulse** · engagement 3/5

Recorded game clock: Third night, Dawn.

> The pair saying they stayed for each other pulled me back a little. I like hearing who these people are, but I still want more control when one abandons a post.

**12:01.8 · input**

Input: `tap {"name": "On to dusk", "role": "button"}`.

Recorded game clock: Third night, Dawn.

> I go on to the next watch. I would keep Tamar and Yunus together now, rather than keep moving everyone for coverage.

**12:08.4 · input**

Input: `tap {"name": "Watch", "role": "button"}`.

Recorded game clock: Fourth night, Dusk.

> I return to Watch speed. Fast got me through waiting, but I missed the successful defence until dawn. I want to actually see this pair hold.

**12:13.1 · input**

Input: `tap {"name": "Begin the watch", "role": "button"}`.

Recorded game clock: Fourth night, Dusk.

> I leave the working pair together, even though both are tiring. I am taking that risk rather than starting over with strangers.

**12:46.4 · input**

Input: `wait {"s": 30}`.

Recorded game clock: Fourth night, Nightfall; Watch.

> I hold the light at the Gate and wait for the tracks to become something.

**13:35.3 · input**

Input: `wait {"s": 30}`.

Recorded game clock: Fourth night, Night; Watch.

> There is no new call yet. I want the next real decision, not another trip with the lantern just to have something to tap.

**13:40.8 · input**

Input: `tap {"name": "Call him back to the wall might (someone else stands there now)", "role": "button"}`.

Recorded game clock: Fourth night, Night; watcher decision.

> Kian found the Gate after I unposted him. This time he is going to the hall, not asleep, so I call him back and see whether he answers.

**13:46.0 · input**

Input: `tap {"text": "Watchers and bell"}`.

Recorded game clock: Fourth night, Night.

> The choice closed without an answer that I can see. I check the watcher list for whether he returned.

**13:50.5 · input**

Input: `tap {"name": "Kian", "role": "button"}`.

Recorded game clock: Fourth night, Night.

> Everyone is on the wall suggests the call worked. I check Kian himself to be sure.

**14:28.3 · input**

Input: `wait {"s": 30}`.

Recorded game clock: Fourth night, Night; Watch.

> Kian is watching at the mill now. The call did something, but I had to inspect him to find out. I stay with the Gate pair through this stretch.

**15:02.8 · input**

Input: `wait {"s": 30}`.

Recorded game clock: Fourth night, small hours; Watch.

> I would rather stop for the evening than do another round of checking everyone. I still want to know whether these two bring the village to thaw, but the quiet patrol has worn thin.

**15:08.7 · pulse** · engagement 2/5

Recorded game clock: Fourth night, small hours; Yunus decision.

> The pair still matters to me, but another asleep watcher decision brings back the same frustration. I am ready to put the phone down.

**15:13.8 · stop** · FRUSTRATED

Recorded game clock: Fourth night, small hours; Yunus decision.

> I stop with Yunus looking back at the steps and a wolf at the Gate. Urge says he is asleep again. The first wish to leave eased when Tamar and Yunus held together, but it did not go away; I still cannot arrange the rest or cover I mean. I would come back once to see this village reach thaw, not leave the game running tonight.

**15:16.9 · input**

Input: `shot {"file": "17-phone-stop.png"}`.

Recorded game clock: Fourth night, small hours; after stop.

**15:20.3 · input**

Input: `resize {"width": 1280, "height": 800}`.

Recorded game clock: Fourth night, small hours; after stop.

> After stopping, I take the assigned desktop look without making another game choice.

**15:23.7 · input**

Input: `shot {"file": "18-desktop-after-stop.png"}`.

Recorded game clock: Fourth night, small hours; after stop.

## Important visible answers

These are page replies observed during play, not hidden state. Times identify the replies, not exact unseen event onset.

| Elapsed           | Input / visible answer                                                                                                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 00:06.7           | Go up to the wall: first-night dusk; six souls, grain plentiful, scout tracks on gate road; Tamar and Kian asked to Gate, Mara West.                                                                                          |
| 00:14.7–00:39.6   | Mara’s Gate button disabled; after Kian’s East order it became available. Orders distinguished asked location from actual location.                                                                                           |
| 01:15.8           | Tap Mara’s figure: “I’m keeping watch. The scout warned us about this stretch. I can’t make anything out yet.”                                                                                                                |
| 01:42.0           | After lantern moved east: movement on gate road; Tamar called that Mara had gone to the hall; selected Mara’s answer said “Too far away for your voice to reach.”                                                             |
| 01:48.3           | Ring bell: log included “Grain is gone: something got over the gate.” Bell acknowledged; rope fraying. Header still said grain plentiful. I could not establish whether the crossing preceded my input or occurred during it. |
| 01:56.4           | “Mara can barely keep her eyes open.” About 115 seconds to decide; Let go, Urge, Ring and call by name, or say nothing. Earlier she had been reported in the hall.                                                            |
| 02:09.7           | Bell help: calls back watchers who hear, loudest at Gate; every pull wears rope. “Everyone is on the wall.”                                                                                                                   |
| 02:47.5–02:53.1   | Wolf at Gate, Mara home asleep; then “Tamar drove a wolf off the gate road.” Bell reply included “Holding!” Tamar called back. Rope badly frayed.                                                                             |
| 03:02.6           | “Posts are set at dusk. Tonight you have the lantern, the bell, and what comes to you.”                                                                                                                                       |
| 03:44.8           | At Mill lantern position, Kian’s account was audible: keeping watch, nothing close.                                                                                                                                           |
| 04:25.2           | Dawn stopped clock. “The wall was crossed.” Gate wolves crossed, Tamar drove wolves off. Kian called the bell shadows; Mara said she ran. Talks cost sleep.                                                                   |
| 04:36.7 / 05:07.4 | Mara: “I left the Gate. I was frozen through. It won’t happen again.” Tamar: “Fit to stand tonight.” After two talks: day’s work calls, no more talks.                                                                        |
| 05:13.3           | Second dusk: eight souls; Joss and Yunus arrived; all original watchers spent 2 hours on bell rope. Tracks at mill race.                                                                                                      |
| 05:25.9           | This winter explained grain must feed eight souls in three homes from thaw to harvest; shortfall means hunger and households leaving. It did not give a number of nights to thaw.                                             |
| 06:06.3           | Joss and Yunus each drove a wolf off mill wall; everyone on wall. No bell used in that defence.                                                                                                                               |
| 06:42.7–06:57.5   | Joss heard danger near his two children. Let him go, let him go/send Tamar, ring/call by name, say nothing. I chose send Tamar; sheet closed. I did not see an acceptance/refusal text.                                       |
| 07:00.6           | Bell reply: grain crossed East wall, Kian home; Joss nodding at mill was awakened and called “We heard you,” not warmly. By 07:05.8, everyone was on wall.                                                                    |
| 08:18.4           | Kian reported home asleep, yet decision said he was climbing down; call-back estimate “won’t (I’m asleep.)”.                                                                                                                  |
| 09:03.6           | Second dawn: mill and East crossed; Joss/Yunus also drove wolves off mill.                                                                                                                                                    |
| 09:12.1 / 09:34.4 | Yunus’s knees: “Fit to stand tonight.” Kian’s condition: “Nothing wrong with me.”                                                                                                                                             |
| 09:45.4           | Off the wall: Kian changed to “not posted · will find a spot on the wall.”                                                                                                                                                    |
| 11:12.8           | Third dawn: “The wall held.” Tamar/Yunus drove off wolves at Gate. Each said they stayed because the other stayed. Kian had watched at mill.                                                                                  |
| 11:40.0 / 11:53.7 | Joss: “Mara keeps the fire in till I’m home.” Ruslan: “I jumped at every owl. Nothing came, though.”                                                                                                                          |
| 12:01.8           | Fourth dusk: “A few watches left; then winter routine to the thaw.” Tamar and Yunus tiring; Yunus close to Tamar.                                                                                                             |
| 13:35.3–13:50.5   | Kian left Gate for hall; I called him back. Sheet closed. Watcher list then said everyone on wall. Inspection: Kian “not posted · on the Mill wall”, “I’m keeping watch.”                                                     |
| 15:02.8           | Yunus nodding at Gate; wolf at foot of Gate. Decision “Yunus looks back at the steps”; Urge estimate “won’t (I’m asleep.)”; ring/call “it may not hold.” Left unanswered at stop.                                             |

## Best, worst, wishes to leave and pulses

**Highest immediate engagement:** 02:53–02:57, first night: Tamar drove the wolf off and called “Holding!” I rated engagement 4/5. This was the first strong feeling that my posted person defended the place. At 06:06 the mill pair’s defence matched that rating. **Best later payoff:** 11:12–11:19, third dawn: “The wall held,” and Tamar and Yunus said they stayed for one another. That restored some interest after the first wish to leave.

**Worst moment:** 08:18–08:33. I wanted to cover Kian’s abandoned post, but the decision described him climbing down while the callback said he was asleep. At 09:45–09:49, trying Off the wall as rest created another mismatch instead of resolving that frustration.

**Every want_quit:** one, 08:24.3, **FRUSTRATED**. Its full original wording is in the diary. I kept playing to the floor. At 14:28–15:02 I also said I would rather stop for the evening; this was recorded as a wait reaction, not a separate `want_quit` line. The final stop was 15:13.8, **FRUSTRATED**.

| Pulse   | Engagement | Original reason                                                                                                                                                                         |
| ------- | ---------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 02:57.0 |        4/5 | Tamar drove the wolf away and called Holding; that is the first time the post choice feels like people defending a place, though I cannot tell whether my bell helped.                  |
| 06:01.0 |        4/5 | I am trying a different defence with two fresh watchers on the new tracks. Seeing the rope repaired and people arrive gives me a reason to keep going.                                  |
| 09:07.3 |        2/5 | I still care who holds each stretch, but the night became repeated departures and losses while my useful response was mostly a bell. I am curious whether deliberate rest changes that. |
| 11:57.9 |        3/5 | The pair saying they stayed for each other pulled me back a little. I like hearing who these people are, but I still want more control when one abandons a post.                        |
| 15:08.7 |        2/5 | The pair still matters to me, but another asleep watcher decision brings back the same frustration. I am ready to put the phone down.                                                   |

## Clarity findings

- **DL-4 FAIL — unexplained unavailable post.** At 00:20, “Gate · tracks” was disabled for Mara. Neither that button nor the opened pressure help explained why or how to free it. Moving Kian made it available. A two-place limit remained my inference. Reference: `03-mara-order.png`; diary 00:20–00:39.6.
- **DL-13 FAIL for the callback/cover answers reached.** Choosing “Let him go; send Tamar to the post” at 06:57.5 closed the sheet without a visible acceptance or refusal I could identify. The next bell report still placed Joss at mill. I cannot say the cover order failed; I could not tell what happened. Calling Kian back at 13:40.8 also closed the sheet; I needed two further inspections to establish he was watching at mill. These are feedback gaps, not a claim that orders never execute. Bell inputs and lantern journeys were clearly acknowledged. References: `10-joss-children.png`; diary 06:57.5–07:05.8 and 13:40.8–13:50.5.
- **DL-19 FAIL — Off the wall meant something different from its label to me.** Before the tap at 09:45.4 I explicitly wanted to give Kian the night off. The answer was “not posted · will find a spot on the wall.” This is an observed label/expectation mismatch, not a claim that the game promises a rest system. Reference: diary 09:38–09:49; later Kian was indeed on Mill wall.
- **DL-5 FAIL in two departure decisions.** At 08:18–08:33 the log said Kian went home asleep, the decision said he was climbing down, and callback said “won’t (I’m asleep.)”. At 01:42 Mara was already in the hall before the later hold/let-go decision. I could not establish whether I was deciding a departure or reacting to one already completed. References: `11-kian-asleep-choice.png`, `05-gate-loss.png` and live replies at 01:42–02:02.9. This does not alter the first-minute DL-5 pass.
- **DL-22 FAIL for full roster/result visibility, with useful decision layout elsewhere.** At opening posting, Mara and the lantern-start selection were below the phone viewport (`02-posting.png`). At dawn the outcome “The wall was crossed” was below the talks (`07-first-dawn.png`); I scrolled to read it (`08-dawn-scroll.png`). Selected-person order screens did fit goal, grain, people, selected person, scene and post buttons (`03-mara-order.png`). Most immediate watcher response buttons were on screen.
- **DL-30 FAIL — a tall decision hid a response under the bottom controls.** In `10-joss-children.png`, the transcript listed “…or say nothing: they decide alone”, but the phone screenshot showed only the first three response buttons; the fourth was below the visible sheet edge. In `17-phone-stop.png`, the line “...or say nothing: they decide alone” is visibly cut along the bottom of the decision by the lantern controls. I did not try that fourth response or test whether scrolling could expose it. The 1280×800 look shows that full response (`18-desktop-after-stop.png`). This is an obscured control, not an invented missing action. Event bubbles also overlapped scene post labels and figures (`05-gate-loss.png`, `10-joss-children.png`, `17-phone-stop.png`). The main sentences I read in the first three choices were complete.

## English, dates, phone and hands on

| Item                           | Status                                                                | Evidence / limit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-20 English                  | PASS for encountered play                                             | Goals, posts, grain, relative night/season, pressure help, accounts and responses were understandable English. No necessary untranslated setting term was encountered.                                                                                                                                                                                                                                                                                                                                    |
| DL-21 Date/deadline comparison | NOT TESTED for a dated deadline comparison                            | Nights and winter were named in English. Today was first, second, third or fourth night of first winter. Thaw was the goal, first “far off,” later “a few watches left; then winter routine.” I could understand the order of seasons but could not calculate nights remaining. No dated event deadline across months/years was encountered. The live watcher countdowns were clear relative seconds; e.g. 105 s at Joss’s choice.                                                                        |
| DL-22 Immediate phone response | FAIL in reached layouts                                               | Full posting roster and dawn result required scrolling; selected-person orders and the first three watcher responses mostly fit. See findings and screenshots. Keyboard-open layout NOT TESTED.                                                                                                                                                                                                                                                                                                           |
| DL-30 Clipping / overlap       | FAIL                                                                  | Fourth decision response obscured in phone shot; event bubbles covered scene labels/figures. Complete in desktop comparison. No claim about builder CSS checks.                                                                                                                                                                                                                                                                                                                                           |
| DL-31 Read state while acting  | PASS for reached order/answer sheets, with a scene-overlap limitation | At `03-mara-order.png`, first winter/night, distance to thaw, plentiful grain, six people and Mara’s identity/current post stayed readable while ordering. At `10-joss-children.png`, second night, grain, eight people and 106-second countdown stayed readable. At `17-phone-stop.png`, fourth night, nine people, grain and 82-second countdown remained visible. The person was named in the decision. Event bubbles partly covered the concerned scene. No exact thaw date was supplied to preserve. |
| DL-32 Hands available          | NOT TESTED for the universal 20-second threshold                      | Longest explicitly logged watch-only request was 30 s, repeated in quiet stretches. I wanted to move Kian at 03:02.6; no reassignment was offered until dawn at 04:25.2 (about 83 s), and next dusk at 05:13.3. Lantern movement, accounts and bell remained available, so this does not establish that every meaningful hands-on action was absent. Later I wanted the next real decision rather than a purposeless lantern move (12:46–13:35). No internal/scripted availability audit was done.        |
| DL-33 Scene acts               | PASS for lantern and accounts; mixed for staffing                     | I tapped Mara’s figure once to hear her account; lantern buttons immediately began travel and bell immediately rang. I could act on a scene post after selecting a watcher, but used the labelled post buttons instead. Staffing opened a person/Ask-Urge-Insist/post panel, then the post tap issued the order without a further Confirm. It felt like staffing through controls rather than directly commanding during the night. Alternate scene posting itself NOT TESTED.                            |

Other reached evidence: **DL-12 PASS** for dawn/night boundaries (“Clock stopped,” dawn summary, On to dusk). **DL-14 PASS** for the known costs I encountered: pressure help, talk sleep cost and bell rope wear were stated before later uses; precise social outcomes remained uncertain. **DL-15 partially tested:** Watch visibly advanced; automatic watcher slowdowns gave roughly 100+ real seconds and choices remained open while I read. I did not meet and answer a watcher decision while Fast was selected, so that specific fast-to-decision test is NOT TESTED. Fast-to-threat slowdown and return to Fast were visible at 08:40–08:44. No reflex input was required. **DL-17 PASS for encountered cues:** tiring, jumpy, afraid, duty and spoken explanations appeared as words; no mood percentage was encountered. These observations do not establish every case in the game.

Unmet checks are evidence gaps. Resume/reload, export/replay, send-run, consent changes, keyboard layout, 200% text, 320 px width, exact touch-target dimensions and all builder-only checks were NOT TESTED. Game menu was visible throughout but was not opened. No save/replay claim is made.

## Stop and return

I stopped at 15:13.8 with Yunus’s decision unanswered, a wolf at the Gate, nine souls and grain still “plenty above spring food needs.” **FRUSTRATED**, not FINISHED or BUDGET. I had passed the 15-minute floor and was below the 25-minute ceiling.

The first wish to leave eased after the Gate pair’s successful defence and their mutual explanations. It did not fully pass: the rest/coverage problem returned with another “I’m asleep” option. I would voluntarily return once to see this village reach thaw. I would put the phone down for the evening, not leave the game running. That is interest in the people and outcome, not a claim that I wanted another full session immediately.

After stopping I took the required single desktop look. At 1280×800, the scene was large beside the decision and the fourth response was fully readable. I made no further gameplay choice. The countdown continued during those screenshots; post-stop advancement is not included as play before the stop.

## Three changes I would want as Sam

1. Let me give a tired watcher a clear night off, or make Off the wall mean what it actually does before I tap it. I wanted Ruslan to replace Kian so Kian could rest.
2. Tell me whether a callback or cover request was accepted, refused or still travelling. I should not have to inspect everyone to find out what my answer changed.
3. Keep every response visible on the phone, and explain why a post is unavailable beside that post. The missing fourth response and grey Gate made me work around the screen instead of deciding how to defend the village.

Evidence: `e-floor1-shots/wall-clock.jsonl`; screenshots in `e-floor1-shots/`. No playtest export downloaded; replay not tested.
