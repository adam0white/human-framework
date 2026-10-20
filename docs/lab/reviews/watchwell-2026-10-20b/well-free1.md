# Twice at the Well — Bram, free stop

## Session

Bram, 35, warehouse shift lead. Plays Mini Motorways, RimWorld on PC and Bad North. Likes giving quick orders and watching people carry them out. Curious; an evening at home, phone in hand.

URL: https://human.adamwhite.work/colony/  
Build: no build identifier encountered.  
Device: supplied phone fixture, 360×690 CSS px, touch emulation, light mode, default text size. One post-stop look at 1280×800.  
Access: the supplied persistent lab driver on port 43605. No source, tests, other design documents, prior reports or logs were consulted. Only the assigned prompt and DL checklist were read after the brief.  
Committed time: floor 0, ceiling 25 real minutes.  
Phone play: 0:00–4:16.983 by the driver's elapsed clock. First wish to leave: 4:13.339. Desktop screenshot: 4:26.661, after stopping. Driver PID 23624 was then terminated.

Started with the default village, “The storm comes when it comes.” Kept Slow for choices checked. Changed speed from 1× to 2× at 3:28.352 because I wanted to reach the next workday. Suggestions still slowed the clock to 1 game minute per real second. Normal speed was 8 game minutes per real second; 2× was 16. This was live elapsed-time play, not frozen between commands.

The opening briefly reported roof 0 and no scheduled storm, then settled to roof 2/10 and Day 2 19:00 before Play. I did not treat that initial transient as a separate outcome.

No run was sent, no telemetry submission or consent change was made, and no export was downloaded. No hidden or debug API was used.

## First minute

The first actionable screen was the opening dialog at approximately 0:00.4. The original checkpoint was logged at 1:06.417, about six seconds late. Its last browser observation was 0:59.191; no gameplay action or new browser observation intervened. The table below uses only evidence reached before 60 seconds.

Original checkpoint, verbatim:

> I am getting a roof and twelve meals ready for Day 2 at 19:00. Play, worker names, boxed place orders, speed and History look tappable; Human is selected and Yusuf is my worker. Maryam would refuse because people need feeding; Yusuf said after prayer and then took the job without another order. Confirm wanted a worker and place. Roof rose from two to three, meals are six. First worker choice was there at eleven seconds and I chose Maryam at fourteen; my first actual job was Yusuf to House at twenty-eight. I know how to issue that job now. I had to go through Order options to swap people; I have not tried the people drawn on the map. The latest-order sheet kept roof, meals and deadline at the top, but Ask again and Cancel order were partly covered by Watch village. I am not sure why it has slowed for a suggestion now.

| Item | Status | Evidence within the first 60 seconds |
|---|---|---|
| DL-1 A reason to act | PASS | Get the roof and 12 meals ready before the storm. The opening stated this directly. |
| DL-2 What can I touch | PASS for controls tried | Play, worker buttons, boxed destination orders, speed and History looked tappable. No inert target was tried in this minute. I initially used Order options to change people; direct map-person selection was not yet tested. Screenshots 01 and 02 show the controls. |
| DL-3 Urgency and selection | PASS | Roof, meals and “Storm Day 2 19:00” were prominent at the top. Human was outlined as the selected map. Maryam, then Yusuf, had a selected name/status. The pending Suggestion competed for attention near the end of the minute; I did not yet know its content. |
| DL-4 Why the limit | PASS for reasons encountered | Disabled Confirm said “Choose a worker and place first,” then “Choose a place first.” Maryam's roof/forest preview said “Will refuse: the others would go unfed”; keeping her cooking was the apparent need, not a known exact threshold. Yusuf said “Later: after I pray Fajr,” then accepted after prayer. I did not test whether Maryam's condition changed. |
| DL-5 Readable situation | PASS | I could issue Yusuf a House order, see “later,” then “on it,” and finally “Laid another course; House 3 of 10, work remains.” The reason for the pending suggestion was still unread. |
| DL-6 A choice soon | PASS | Village variants were available by 0:04.100, before Play. I left the default selected. Play input: 0:07.934. Worker choice available: 0:11.286; Maryam chosen: 0:14.480. First consequential work order: Yusuf → House at 0:28.463. The opening's goal and instruction were short; no long mandatory story preceded the choice. |
| DL-7 Learn by doing | PASS for interactions reached | Maryam's previews taught that a cook might refuse other work. Yusuf's order taught that “later” could become acceptance without another order, and visible roof progress followed. No help opened. Two of six workers were selected; one of eight destination types received an order. The other seven destination types, Rush, insistence and risk confirmation were NOT TESTED in this minute. |

These visual judgments use screenshots, not the driver's text alone. Later learning did not change the checkpoint statuses.

## Verbatim diary

Times are real elapsed time, not the game clock. Quoted reactions retain the wording logged during play, including mistaken impressions and their later correction. The driver's complete input record is at `well-free1-shots/wall-clock.jsonl`; I did not reread it to explain the game. Important visible answers are included below from the live replies. Unquoted summaries identify input sequences.

| Elapsed | Input and last observed game clock | Verbatim reaction and important visible answer |
|---|---|---|
| 0:04.100 | Shot 01; D1 05:00 paused | “Roof the house and twelve meals before a storm. That is enough to get me started. Play and Choose person look like controls; I want to see who I have.” |
| 0:07.934 | Play; D1 05:00 | “I will take the ordinary village and get the roof underway.” Answer: Running · 8 min/s. |
| 0:11.286 | Choose person; reply D1 05:27 | “I need a worker before I can tap the roof.” Answer: six names; Confirm disabled with “Choose a worker and place first.” |
| 0:14.480 | Maryam; reply D1 05:32 | “No job labels on this list. I will start with Maryam and see what she can do.” Answer: Maryam · Cooking; House/Forest “Will refuse: the others would go unfed.” |
| 0:17.584 | Shot 02; D1 05:35 | “She is already cooking and will refuse roof work because people need feeding. Fair enough. I need someone else.” |
| 0:20.831 | Order options · Maryam; D1 05:39 | “How do I swap workers? Order options is the only person button I see now.” |
| 0:23.008–0:25.397 | Worker · Maryam, then Yusuf; D1 05:41–05:43 | Answer: Yusuf · Walking to Masjid. House: “Later: after I pray Fajr.” |
| 0:28.463 | House Later: after I pray Fajr; D1 05:47 | “After prayer is fine. I want the roof job lined up for when he returns.” Answer: “Order given to both villages: Yusuf → House”; latest order “later, after I pray Fajr.” |
| 0:31.424 | Open Yusuf's latest order using its previous name; D1 06:11 | “That registered straight away. I want to know whether later means queued or whether I need to ask again.” The control had changed to “on it”; the old-name tap did not open it. |
| 0:34.361 | Retry using current “House: on it”; D1 06:34 | “It changed to on it while I read. Good, I did not have to repeat the order.” Answer: “Latest Human reply: Alright, I'll do it.” |
| 0:37.245 | Shot 03; D1 06:57 | “On it, but the roof is still two of ten. I will let him actually reach it.” |
| 0:40.433 | Watch village; D1 07:23 | Answer: roof 3/10, meals 4/12. Yusuf: “Laid another course; House 3 of 10, work remains.” |
| 0:59.191 | End of 15-second wait; D1 08:14 | “There is the first roof course. I am happy to watch a little now that I know the order did something.” Answer: roof 3/10, meals 6/12, Slow · 1 min/s · suggestion pending. |
| 1:06.417 | first_minute log | Original checkpoint reproduced above. Logging returned the previous browser snapshot, not a fresh game-clock observation. |
| 1:11.826 | Suggestion; D1 08:26 | “What is this suggestion that slowed the village down?” Answer: Idris → Cedar, three timber at once; injury warning; lapses 09:00, in 34 min. |
| 1:15.997 | Shot 04; D1 08:30 | “Three timber sounds useful, but not if I injure the woodcutter this early. I want a look before deciding.” |
| 1:19.660 | Review order; D1 08:34 | Answer: Idris → Cedar; “fell the big cedar · Likely yes”; injury warning; Confirm. |
| 1:24.825 | Place · Cedar; D1 08:39 | “The injury warning was cut off underneath the suggestion buttons. I can read it in this reply, but I want the safer forest job.” |
| 1:27.125 | Forest; D1 08:42 | Answer: Idris → Forest; “gather timber · Likely yes”; still “Fast timber, but the cedar can hurt whoever fells it.” |
| 1:30.896 | Shot 05; D1 08:45 | “Why does the forest order still warn about the cedar? I changed the place. I think it is stale wording, but now I do not quite trust the confirmation.” |
| 1:34.226 | Confirm; D1 08:49 | “It says Forest and gather timber, so I will trust those labels and send it.” Answer: Idris → Forest, waiting. |
| 1:39.098 | State button using previous 3/10 name; D1 09:28 | “I want to know whether timber or water is holding the roof and food back.” Name had changed to roof 4/10. |
| 1:41.623 | Retry state button using 4/10; D1 09:49 | Answer expanded the goal: completed 4 of 10 roof stages, stores 6 meals, food target 12 by Day 2 19:00. No resource explanation appeared there. |
| 1:44.764 | State button with previous meal count; D1 10:14 | “That just restates the target. I will leave the woodcutter alone and find another pair of hands.” Meals had changed from 6 to 5, so the old-name tap did not close it. |
| 1:47.573–1:50.894 | Retry current state button, then shot 06; D1 10:36–10:47 | State collapsed. Roof 5/10, meals 5/12; another suggestion pending. |
| 1:55.807 | Map tap at 282,456; D1 10:52 | “Tariq is beside the kitchen. I will tap him directly rather than open the worker form again.” Answer: Choose a person or place; Tariq / Danyal / Cancel. |
| 1:59.243 | Tariq; D1 10:55 | “The small people overlap, but it asks which one. That works.” Answer: Tariq · Eating; House “Likely yes”; Forest and other jobs “Later: after I eat a meal.” |
| 2:03.548 | House Likely yes; D1 10:59 | “Another builder should finish the roof sooner. Food seems to be coming in without me.” Answer: Tariq → House, waiting. |
| 2:07.343 | Suggestion; D1 11:03 | “Another suggestion is holding slow speed. Let me see whether it is worth doing.” Answer: Maryam → Forest, “Will refuse: the others would go unfed”; Insist may cost trust. Tariq's visible speech: “Good idea. On it.” |
| 2:13.409 | Skip suggestion; D1 11:10 | “Why suggest pulling the cook off meals when she has already said people would go unfed? I am keeping her cooking.” Answer: meals 13/12; running at 8 min/s. |
| 2:36.964 | End of 20-second wait; D1 14:18 | “Meals have cleared twelve. I want to watch these two finish some roof before changing anything else.” Answer: roof 6/10, meals 11/12; Tariq “won't — ‘that is my work’.” |
| 2:40.234 | Tried visible-text tap with a curly apostrophe; D1 14:45 | “He said on it, now he will not, because that is my work? I do not understand that sentence for the same job.” Tap failed to match the text; fresh controls supplied the exact current name. Roof 7/10. |
| 2:43.794 | Retry complete current Tariq latest-order name; D1 15:13 | Answer: “Latest Human reply: Not that — I'll raise the beam with Yusuf; that is my work.” Ask again, disabled Cancel order, Insist may cost trust. |
| 2:47.412 | Shot 07; D1 15:42 | “The longer answer says he will raise the beam with Yusuf. That sounds like the roof work I wanted. The short refusal made it sound like he had stopped helping.” |
| 2:51.645 | More; D1 16:16 | “His actual sentence is behind the bottom buttons. More might let me read the whole reply.” Answer: Village actions with Small/Half/Full/Fit panel controls. This reaction was mistaken; corrected next. |
| 2:55.802 | note log; last observed D1 16:16 | “Correction to my last note: the full Tariq sentence is visible in the screenshot; it is the order buttons below it that I cannot see. More opened panel-size controls, not more of his answer.” |
| 2:59.009 | Fit panel; D1 17:15 | “Fit panel sounds like what I wanted. I would like these sheets to show their contents.” Fit panel became pressed. |
| 3:02.257 | pulse, engagement 3/5; last observed D1 17:15 | “I like the workers having their own plans, but I am spending more time sorting out the sheets and wording than giving orders. I still want to see the roof finished.” |
| 3:05.571–3:08.696 | Back, then shot 08; D1 18:07–18:25 | Latest-order sheet returned. Roof 7/10; meals 9/12 at the screenshot. |
| 3:12.139 | Watch village; D1 18:29 | “Fit panel has not brought those order buttons into view. I will get back to the village.” Screenshot qualification: Ask again and Cancel order were now partly visible; Insist remained below the visible area. My sentence was broader than the picture supports. |
| 3:15.677 | Suggestion; D1 18:32 | “The repeated slowdown is starting to feel like an interruption. I want to see whether it helps the roof.” Answer: Yusuf → House; “Light’s going. Send Yusuf back to the house?”; one more wall before dark. |
| 3:18.485 | Send order; D1 18:36 | “Yes, this one helps. Though I thought Yusuf already had the house job.” Answer: order given to both villages, Yusuf → House, on it. |
| 3:22.506 | Classic · obey; D1 19:08 | “Every order goes to both villages. I want to see how the obedient version is doing.” Answer: Classic roof 7/10, meals 8/12. |
| 3:28.352 | 2×; D1 19:56 | “Night is coming and the jobs are set. I am speeding up to see the next workday rather than watch everyone walk home.” Answer: Running · 16 min/s. |
| 3:32.328 | Human · decide; D1 20:59 | “The classic village is not obviously ahead. I want to keep following the people who can decide.” Answer: Human roof 8/10, meals 9/12. These observations were at different game times; they do not establish a controlled comparison. |
| 3:59.692 | End of 25-second wait; D1 22:00 | “Eight of ten looks close. I will leave the orders alone through the night.” Answer: suggestion pending, slow 1 min/s, roof 8/10, meals 8/12. |
| 4:02.702 | Suggestion; D1 22:03 | “I expected morning after that wait, but a suggestion has slowed the night again.” Answer: Tariq → Forest; “Timber is short; Tariq is awake”; night/squall and trust warning; lapses 22:35. |
| 4:13.339 | want_quit, FRUSTRATED; last observed D1 22:03 | “I would put this down now. I want to leave the crew working until morning, but suggestions keep slowing it down, and the phone sheets hide parts of the warnings and responses. I like giving the orders more than managing these panels.” |
| 4:16.983 | stop, FRUSTRATED; last observed D1 22:03 | “Stopping here with the roof eight of ten and food still needing attention. The wish to leave has not passed. I would leave the crew alone for tonight; I might try this on a computer, but I would not voluntarily reopen this phone session now.” |
| 4:22.892 | Post-stop resize to 1280×800 | “Post-stop desktop look only.” Fresh reply: D1 22:23. |
| 4:26.661 | Post-stop shot 09; D1 22:27 | “On desktop I can see both villages, injuries and alive counts, the survival deadline, and the Slow for choices toggle at once. That looks closer to how I would want to play this.” Qualification: the text reply exposed the survival deadline, but in the screenshot the village cards and middle content overlap the goal row. The screenshot does not support my claim that the deadline was visually readable. |

The failed old-name taps were game-state changes, not driver blocks. The mistyped Tariq text tap succeeded on retry with the full current control name. No visible control remained inoperable after a proper retry.

## Best, worst, pulses, and staying despite difficulty

**Best moment:** 0:40.433, when Yusuf's deferred order produced the first visible roof course. He had a reason to wait, accepted later, and then did useful work without my repeating it. That was the clearest payoff for giving an order.

**Worst moment:** 1:15.997–1:30.896. The cedar suggestion's injury warning was cut off on the phone, then the Forest confirmation retained cedar warning text. I wanted a safer job and became unsure what I was approving.

**Want to quit:** one formal wish, 4:13.339, FRUSTRATED. The earliest milder dissatisfaction was 1:30.896 (“now I do not quite trust the confirmation”); the first explicit interruption complaint was 3:15.677. Neither was an explicit wish to leave at the time.

**Pulse series:** 3:02.257 — 3/5, verbatim reason in the diary. The session ended before a second three-minute pulse was due.

**Hard, but kept going:** reading and reaching the order-sheet contents was hard. I looked under More, found panel-size controls and chose Fit panel at 2:59.009. I continued about another 78 seconds because I still wanted the roof finished and liked the workers' independent plans. This was a search for a reading/layout aid, not an easier simulation setting. I also used the offered 2× speed to wait through the night. I did not search for a difficulty setting.

## Clarity findings

- **DL-30 / DL-22 — FAIL, cedar warning hidden on phone.** Screenshot 04 shows “Idris could take the big cedar: three timber at once.” Below it, “Fast timber, but the cedar can hurt…” is cut by the fixed bottom row. The reply contained the full injury warning, availability caveat and expiry; those were not all visible in the screenshot. I could act on Review order, but could not read all its essential risk context without changing the panel.
- **DL-30 / DL-22 — FAIL, order-sheet contents fall below the visible area.** Screenshot 03 partly hides Ask again and Cancel order under Watch village. Screenshot 05 shows the Forest selection and first line of its preview while the rest falls behind the bottom row. Screenshot 07 shows the full Tariq reply, but not the order-response controls below it. Screenshot 08, after Fit panel, reveals parts of Ask again and Cancel order; Insist is still not visible. I did not attempt an inner-panel scroll. These are visibility findings, not proof that the controls can never be reached.
- **DL-14 / DL-19 — FAIL, conflicting confirmation context.** After changing Place · Cedar to Forest, the live reply still said “Fast timber, but the cedar can hurt whoever fells it,” below “Idris → Forest” and “gather timber · Likely yes” at 1:27.125–1:30.896. I guessed this was stale wording and confirmed Forest. The accepted order named Forest. I cannot establish why the warning persisted or whether there was any hidden risk. The conflict itself made the known risk unclear. Screenshot 05 identifies the scene; the full conflicting warning is in the live text reply, below the screenshot's visible body.
- **DL-13 / DL-19 — FAIL for my reading of Tariq's status.** “House: won't — ‘that is my work’” made me think he had stopped helping with the house. His full answer was “Not that — I'll raise the beam with Yusuf; that is my work.” That sounds like related roof work, but I could not tell which part of my House order he rejected. Screenshot 07 and the 2:36.964–2:47.412 replies show this. I am reporting ambiguous acknowledgement, not claiming he failed to work.
- **DL-15 — slowdown worked; repeated interruption was a preference finding.** At 2× a pending suggestion still slowed time to 1 min/s. I had time to inspect the 22:03 suggestion before its 22:35 lapse. My complaint was that I wanted the night to pass and suggestions repeatedly slowed it. Slow for choices was checked from the opening; I did not try turning it off. This does not establish that the slowdown is unavoidable.
- **Desktop-only layout observation:** screenshot 09 shows both villages and more controls, but their cards and the middle status overlap portions of the top goal row. The live text included the Everyone lives deadline, D3 05:00; it was not legible in the screenshot. This was one post-stop look, not a continued desktop playtest.

The screen always acknowledged accepted work orders promptly. Yusuf's later-to-on-it progression and actual roof-course result were useful positive DL-13 evidence.

## English, dates, phone state, and hands on

| Item | Result and limits |
|---|---|
| DL-20 English | PASS for necessary orders encountered. House, Forest, meals, roof, risks and refusal explanations were understandable. “After I pray Fajr” conveyed waiting for prayer without needing the prayer's exact translation. Masjid was not translated in the places I saw; I did not order anyone there or need its meaning to act, so comprehension of that destination is NOT TESTED. |
| DL-21 Dates | PASS for encountered deadlines. D1 and “Storm Day 2 19:00” let me compare now with tomorrow evening. Suggestion lapses showed a clock time and “in 34 min,” “in 53 min,” etc. Month/year transitions and return after a break: NOT TESTED. The D3 survival deadline was first exposed by the desktop reply after stopping. |
| DL-22 Immediate phone response and context | FAIL where suggestion risk text and order context fell below the fixed bottom row. Direct place orders and their reasons in screenshot 02 were visible, as were the persistent roof/meal/storm numbers. |
| DL-30 Nothing cut off | FAIL for the specific sheets above. No claim about unvisited sheets. No inner-panel scroll tested. |
| DL-31 State while acting | PASS for the phone sheets reached: roof progress, meal count and storm deadline stayed at the top while Maryam, Yusuf, Idris or Tariq was concerned. Selected people appeared in the visible map in the inspected screenshots. The separate Everyone lives deadline was not established on phone. Desktop goal-row overlap is a separate observation. |
| DL-32 Hands available | No forced period with no possible action was established. Longest deliberate wait: 25 real seconds at 2×; I wanted the crew to work through the night and chose to watch. It became a pending suggestion slowdown. A 20-second deliberate wait also occurred. Orders and speed controls remained offered; I did not exhaust all meaningful possible acts. Strict continuous availability every 20 seconds: NOT TESTED. |
| DL-33 Core act in scene | PASS for ordinary orders tried: after selecting Yusuf or Tariq, tapping House sent the order directly. Tapping a crowded person location offered a disambiguation list. Cedar's consequential injury risk used Review order and Confirm; changing that proposed destination to Forest kept me in the form. |
| DL-23 Targets | The map supplied a useful Tariq/Danyal disambiguation list. Pixel hit-area dimensions were not measured: NOT TESTED. |
| DL-24 Sheet navigation | Back from More returned to Tariq's latest-order sheet; Watch village returned to the map. No stacked sheet was observed in those interactions. |
| DL-12 Ending; DL-27 Resume; DL-28 Send; DL-29 Replay | NOT TESTED. I stopped before the game ended. Sending was outside the assignment. |

## Stop and return

I stopped voluntarily at 4:16.983, reason **FRUSTRATED**, while the Tariq → Forest night suggestion was open. Last fresh phone observation: D1 22:03, Human roof 8/10, meals 7/12, storm Day 2 19:00. The log-only quit and stop requests returned that cached browser snapshot; they do not establish the exact in-game clock at the stop instant.

The first want_quit did not pass. I stopped 3.644 seconds later, so this run provides almost no evidence about whether continued exposure would change that wish. I would leave the crew alone for the night, rather than regard the game as finished. I would consider a computer session; I would not voluntarily reopen this phone session now.

The post-stop desktop view showed both villages alive 6/6, injuries 0, Classic roof 9/10 and Human roof 8/10. Those are later observations, not the phone stop state.

## Up to three changes I would want as Bram

1. Let me read the whole warning and reach the response controls in the phone sheet without managing panel sizes.
2. Make the status say which work the person will actually do. Tariq's short refusal did not tell me he planned to raise the beam with Yusuf.
3. Give me an easy way, while playing on the phone, to let the current jobs run through the night without repeatedly slowing for suggestions.

Artifacts: screenshots 01–09 and the driver-written wall-clock record are in `(driver scratch)/`. No export was downloaded.
