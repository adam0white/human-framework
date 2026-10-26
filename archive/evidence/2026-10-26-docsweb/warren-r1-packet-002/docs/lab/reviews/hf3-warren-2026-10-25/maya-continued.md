## 1. Session and exposure

Maya Chen, 24, Vancouver library assistant. Curious narrative-adventure and cooperative-puzzle player.

- **Game:** Warren, https://warren.adamwhite.work
- **Exposure:** First visit. Target source remained unread.
- **Continuity branch:** Supplied frozen Voice free-stop and A Dark Room continued diaries only. No other diary opened.
- **Round / arm:** `hf3-warren-r1` / `continued`
- **Paired session:** `hf3-warren-r1-maya-chen`
- **Build:** Not visibly available.
- **Device:** 360×690 touch/light. Requested 1280×800 check at 307–318s.
- **Access:** Sequential curl POST operations to supplied localhost driver, port 19601.
- **Timing:** First actionable title at 0.479s; Begin at 5.035s; stop at **932.198s, 15m32s**. Floor 15 minutes; ceiling 25.
- **Game time:** Dawn, 19 August, year 1 → Morning, 7 September, year 1.
- **Speed:** Default Slow throughout. Time advanced during real waits and paused for some reading and choices.
- **Consent:** Unchanged. Fresh authored game; opening new-rules checkbox left unchanged.
- **Feedback:** Inspected locally. Selected **I would stop here** at 924.775s. No name, note, submission, receipt, player id or export.
- **Artifacts:** Existing `wall-clock.jsonl` contains full raw operations. Screenshots retained: `first-minute.png`, `current-phone.png`, `current-wide.png`. The latter two were overwritten during play; references below specify their capture times.

Protocol deviations: first-minute note was late at 71.156s. Its own estimate of “about sixty-seven seconds” was inaccurate. At 407.408s I accidentally sent unsupported `{"op":"furnish"}`; the driver returned “Unsupported op (invalid request, not a driver failure).” I continued using the documented tap operation. No game failure or driver block occurred.

Rosa was not assigned this session. No Rosa exposure or diary was invented.

## 2. First minute

The note was **late, at 71.156s**. These assessments use only evidence obtained before 60s and the preserved automatic screenshot. Later learning does not improve them.

Original checkpoint note:

> “I am making shelter for six people before riders arrive, although I do not know when they arrive. Chalk, look, rub out, furnishings, bell, people, speed and journal look touchable. Chalk marked a dig with one tap at nineteen seconds; a door marked at forty-eight seconds. People decide when to build, and doors need time and light. Tamar started digging, which tells me the chalk mattered. I have not made beds yet. The tiny hill is readable but the jars and half-circle are mysteries. This note is late at about sixty-seven seconds; the wait crossed sixty.”

| Item | Result and evidence available by 60s |
|---|---|
| **DL-1 A reason to act** | **PASS.** Make shelter against riders. Title: “Dig a shelter where the village can survive attacks by riders.” Village panel established six people without sleeping places. No arrival time known. |
| **DL-2 What can I touch** | **PASS.** Chalk, look, rub out, furnishings, bell, people, speed, journal, zoom, information and menu. These appeared as controls in the phone screenshot. No deliberately inert item tried before 60s. |
| **DL-3 Urgency and selection** | **PASS for selection; urgency uncertain.** Chalk and then door were visibly selected. Shelter drew me first. Six people needing beds competed with making a door. No dated threat yet. |
| **DL-4 Why the limit** | **PASS for reached construction conditions.** People choose when to dig. Door required a suitable passage; after marking, “Someone may carve it when they have time and light.” No disabled button encountered. |
| **DL-5 Readable situation** | **PASS.** Dig marked; Tamar’s task became digging. Door marked. “People decide when to start digging” explained what was underway. |
| **DL-6 A choice soon** | **PASS.** Tools available at 5.035s, before long text. First tool selection 16.681s; first spatial mark 19.254s. Begin was pressed at 5.035s. |
| **DL-7 Learn by doing** | **PASS for two reached marking interactions.** Chalk produced a dig plan and capacity estimate; door tap produced a construction acknowledgment. Tamar starting work connected the mark to action. No help used before 60s. Beds, stores, lamps, alarms and completed-door inspection were **NOT TESTED**—five later interaction types, not a claimed game total. |

The automatic `first-minute.png` shows the phone scene, selected door tool, marked outline and readable instruction. It does not establish later sheet layouts.

## 3. Verbatim diary and important inputs

Times are real elapsed seconds. Game dates below are visible answers, not estimates of continuous observation. Full raw operations remain in `wall-clock.jsonl`.

**0.479 — opening title.** Shelter objective, Begin, new-rules checkbox and recording statement visible.  
**5.035 — Begin.** Dawn, 19 Aug, year 1. Default Slow. Instruction: “Choose chalk, then drag across stone beside the cellar.”  
**6.990 — phone screenshot**, viewed.

**13.765 — note:**

> “A tiny cellar with people tucked inside it. I like the drawn hill, but the instruction asks me to drag and I only know the supplied taps. I will choose chalk and see what it tells me.”

**16.681 — chalk.** Morning, 19 Aug. Dashed-outline explanation.  
**19.254 — tap (222,232).** Dig marked; about three sleeping places if dug; riders could enter.

**23.452 — note:**

> “A tap marked a dig even though it said drag. Three sleeping places sounds useful for six people, but riders can still enter. I want to make a little safe room farther in, not just a bigger open cellar.”

**27.661 — Close reading. 30.194 — The village.** Six named people; four below, two above; no sleeping places.  
**33.027 — Master Yusuf.** Age 74; resting; no current food, water, rest or care need.  
**35.758 / 40.791 — Close twice.** Returned through village to hill.  
**43.127 — furnish. 45.597 — door.** Suitable passage and maximum three doors explained.  
**47.975 — tap (187,203).** Midday, 19 Aug. Door marked; Tamar digging.  
**50.894 — Close reading. 63.897 — nine-second wait returned.** Night, 20 Aug.  
**71.156 — late first-minute note**, reproduced above.

**75.691 — door menu.** Morning, 20 Aug. Meryem carving stone door.  
**78.074 — beds. 80.426 — tap (199,230).** Three sleeping places; riders could reach them.  
**85.256 — Close reading. 87.641 — chalk. 89.840 — tap (199,246).** Another dig marked.  
**92.240 — Close reading. 94.725 — Journal.** Cooking, route checking, light-material preparation and discussion of digging marks recorded.

**99.523 — note:**

> “They are doing more than digging: Maryam cooked, Tariq helped with light, and Tamar checked a route. That makes the little dots feel more like a household. I cannot tell whether Yusuf saying some stone may still be loose asks anything of me.”

**102.073 — Close. 134.084 — thirty-second wait returned.** Morning, 21 Aug. “The stone door was ready in its groove. Meryem rolled it once to test it.”

**137.498 — note:**

> “Meryem rolled the door once to test it. That is the first little moment I would tell my sister about. The thing I marked has become something a person handled. Now I want to see whether I can shut it.”

**142.329 — look. 144.856 — tap door (187,203).** Ring bell to invite nearby adult to shut it; false alarms can weaken trust; calls without raids last six game hours.

**148.893 — note:**

> “Oh, shutting the door means ringing an alarm, and a false alarm can cost trust. I will not test it just to see the door move. I like that restraint, although I am now waiting for a threat I cannot date.”

**151.355 — Close reading. 184.042 — thirty-second wait returned.** Morning, 22 Aug. Water jars dry. Meryem broke through first chalked wall, coughing dust.

**187.797 — pulse, engagement 4:**

> “The door and Meryem coughing dust make the work feel real. Dry water jars give me a new worry, but I do not yet know how to help.”

**192.773 — Information.** Fresh air/light requirements; furnishings; door geometry; filled/empty sleeping-place circles explained.  
**195.003 — Close information. 199.937 — tap water indicator area (253,63).** No panel or explanation appeared.  
**202.551 — Zoom in. 205.140 — phone screenshot**, viewed.  
**213.068 — look tap (233,230).** Night, 23 Aug. Sleeping-room explanation; bell could lead an adult to shut door above it.  
**216.936 — Close reading. 220.070 — furnish. 222.802 — beds. 226.202 — tap (232,264).** Six sleeping places; space for everyone.

**230.697 — note:**

> “Six filled dots: there is space for everyone. That is a satisfying small success. I was expecting each little square to count as one bed, but a tap seems to mark a whole room or patch.”

**233.268 — Close reading. 266.883 — thirty-second wait returned.** Morning, 24 Aug.  
**270.633 — look. 303.878 — thirty-second wait returned.** Morning, 25 Aug; harvest needs storage.

**307.082 — resize 1280×800. 309.486 — The village. 312.152 — wide screenshot**, viewed.  
**317.582 — return to 360×690.**

**322.305 — note:**

> “Requested layout check, not my own urge: I visited the wide view after five minutes and opened the village. The hill stays tiny on the left while the people list has much more space. I am back on the phone. I still cannot talk to the people sitting by the hearth.”

**325.366 — Maryam. 327.981 — Activity and words disclosure.** Household biography, repeated cooking reports, material offer and End optional work appeared.

**333.563 — note:**

> “There is something to offer her after all, hidden inside Activity and words. I reread: “Offer a smooth leftover piece of material while she waits in the kitchen”. What material, and why would she want it? I am curious enough to offer it, but I do not understand the words End optional work beside it.”

**337.265 — Offer a smooth leftover piece of material while she waits in the kitchen.** “Maryam waits for a quieter moment to answer the invitation.”  
**339.598 / 342.262 — Close twice. 366.165 — twenty-second wait returned.** Night, 26 Aug.

**371.057 — pulse, engagement 3:**

> “I have made the basic shelter and found one invitation, but the same dust sentence stays in front of me. I want to know whether Maryam answers.”

**375.730 — The village. 379.778 — Maryam.** She accepted the piece, brought out ring/string, and offered a puzzle. Offer now disabled.

**384.293 — note:**

> ““Some are impossible knots. I keep the mistakes too.” I love that. My strange little gift got a particular person back. It says she offers a puzzle, but I cannot see a puzzle to try; perhaps this is only a story about one.”

**387.079 — Back to The village. 390.561 — Tamar of the Wall.** Boundary-checking task, joy, repeated route reports and invitation to check boundary.

**395.275 — note:**

> “Tamar already checks the boundary, and the invitation asks her to do that same thing. I cannot tell what I would add. “This helps me get closer to what I want” does not tell me what she wants. I would rather hear her actual observation of the route.”

**400.795 / 403.710 — Close twice. 407.408 — accidental unsupported furnish operation.** Invalid request, not driver failure.  
**409.993 — furnish tap. 412.685 — store. 415.774 — tap (269,230).** No marking acknowledgment.  
**419.563 — phone screenshot**, viewed: surface houses, cellar off view.  
**427.941 — Fit hill. 431.747 — phone screenshot**, viewed: cellar restored.  
**438.226 — tap (204,220).** Morning, 27 Aug. Store marked; people can bring grain.

**443.308 — note:**

> “I lost the cellar when returning from the wide view; Fit hill found it again. Marking the store worked once I could see it. I am guessing I have replaced some beds, but the six dots stayed filled. I wish I could be more certain about what patch I just changed.”

**478.153 — thirty-second wait returned.** Morning, 28 Aug; jars still empty.

**482.654 — want_quit, BORED:**

> “I would leave it here for tea now. I have beds, a door and a store, and I am waiting for someone to use them or for riders to make them matter. Maryam was lovely, but I do not want to keep reopening lists for a new sentence. I will stay for the time I set aside.”

**485.777 — Journal.** Repeated household work; latest safety entry was door completion.  
**488.891 — Close. 522.263 — thirty-second wait returned.** Afternoon, 29 Aug.  
**549.402 — twenty-second wait returned.** Morning, 30 Aug; Ak family arrived with donkey, two people.

**553.204 — pulse, engagement 3:**

> “A family arrived with a donkey because they heard there was room. That makes my beds feel consequential, though now the empty circles have returned. I want to see who they are.”

**555.673 — The village.** Midday, 30 Aug. Leyla and Halil visible. Smoke warning paused for choice; riders might arrive in half a day or less.

**561.474 — recognition note, before verification:**

> “Halil? At about nine minutes sixteen seconds I see Halil in the Ak house, harvesting barley. I remember Halil from Voice, grieving Nuran and visiting Hacer. It is only the name, so low confidence: this could be another Halil. I am not going to assume he is the same person. Smoke on the ridge matters more right now; I want everyone inside.”

No identity verification followed.

**564.242 — 🔔 Ring the bell.** Bell would persist until riders left; people could refuse.  
**566.740 — phone screenshot**, viewed.  
**571.819 — Close reading. 591.453 — fifteen-second wait returned.** Riders searched entrances; no one struck; might return with more riders.  
**596.423 — The village.** Open door still exposed beds. Several people had agreed then changed tasks; Tamar sleeping above ground.

**601.132 — note:**

> “They said yes, then chose other tasks. Tamar went to sleep above ground while riders were here. I understand the sentence, but emotionally I am asking: did she not hear the danger? The door is still open. I wanted the alarm to protect them, and I do not know what more I can do.”

**603.787 — Close. 636.760 — thirty-second wait returned.** Midday, 31 Aug; water dry.  
**639.837 — chalk. 644.672 — tap (195,247).** New dig marked; riders could still enter; check other routes.  
**648.485 — Close reading.**

**653.910 — note:**

> “I marked another space below for the newcomers. The reply still says riders can come through the entrance, so deeper is not simply one square lower. I do not yet have a good picture of what safe depth means.”

**687.447 — thirty-second wait returned.** Morning, 1 Sep. Scouts left; no one struck, nothing taken; pale search tracks.  
**691.971 — Game menu. 696.285 — Resume.** Recording unchanged.  
**729.216 — thirty-second wait returned.** Morning, 2 Sep.

**734.490 — pulse, engagement 2:**

> “The scouts made me alert for a moment, but now the water and empty-store warnings are cycling again. I do not want to make another round of marks just to wait for the next raid.”

**738.499 — look. 743.384 — tap door (181,190). 746.515 — More disclosure.** Nearby adults and their tasks listed.

**751.819 — note:**

> “More lists the nearby adults and their tasks, but not why none shut the door. I am not angry that they have choices. I just cannot learn how my shelter plan failed to become a closed shelter.”

**756.732 — Close reading. 792.802 — thirty-second wait returned.** Afternoon, 3 Sep.  
**829.084 — thirty-second wait returned.** Afternoon, 4 Sep. People filling jars.

**834.474 — note:**

> “People are finally filling the jars. I marked that store on 27 August and now it is 4 September. I do not know what changed today. The wait has made the result feel less connected to my hand.”

**867.332 — thirty-second wait returned.** Afternoon, 5 Sep. Aydın family arrived with donkey; three people.

**877.633 — recognition note:**

> “Aydın is familiar too: Mrs Aydın was at the workshop in Voice. At fourteen minutes twenty-seven seconds this is only a family surname, so I have very low confidence and no recognition of a person. Another family heard there was room when I still have only six beds. I feel behind rather than pleased this time.”

No identity verification followed.

**907.722 — twenty-five-second wait returned.** Night, 7 Sep.

**912.241 — pulse, engagement 2:**

> “I am still fond of Maryam and the door-testing detail, but I am ready to stop. More arrivals feel like more work with the same waiting.”

**915.630 — Game menu. 920.645 — Feedback. 924.775 — I would stop here.** Locally pressed. No submission.

**932.198 — stop, BORED:**

> “I am stopping after the scouts left, with eleven people and six sleeping places. The first wish to leave never really passed. I liked Maryam keeping her impossible knots and Meryem testing the door, but the repeated reports and waiting are stronger than my curiosity now. I might return with my sister to try a shelter plan together; I would not leave this running unattended. I selected I would stop here locally in Feedback and did not submit anything.”

## 4. Best, worst, quitting and engagement

**Best moment:** 379–384s, Maryam’s ring-and-string response: “Some are impossible knots. I keep the mistakes too.” It made the invitation feel personal.

**Worst moment:** 596–601s, reading that people agreed to the alarm and then changed tasks while the door remained open. I could read the state, but could not learn what else would protect them.

**Every want_quit:** One, **482.654s — BORED**, quoted above. The wish did not pass. The family arrival and smoke briefly restored curiosity.

| Pulse | Engagement |
|---:|---:|
| 187.797s | 4 |
| 371.057s | 3 |
| 553.204s | 3 |
| 734.490s | 2 |
| 912.241s | 2 |

**Hard, but kept going:** I used Zoom in to read the hill and Fit hill after losing it during the requested resize. I continued because those controls restored a usable view and I still wanted the invitation’s answer. No easier setting or accessibility option sought. Staying after boredom was the assigned floor, not evidence that the difficulty passed.

## 5. Screen concepts and clarity findings

Counts list newly introduced ideas on each inspected screen or materially changed state. Repeated concepts are not counted again. Counts are observational groupings, not claims about hidden systems.

| Screen and purpose | New concepts (list every one) | Concept count | Sentences reread (verbatim) | Reason |
|---|---|---:|---|---|
| Title / begin | Shelter digging; village survival; attacking riders; optional new-hill rules; sleep outcomes; shelter outcomes; limited wild food; warned furnishing damage; existing hills retaining rules; Begin; All games; Information; menu; Human Framework people; linked device recording | 15 | none observed | Many peripheral ideas before the simple objective. |
| Hill / choose work | Game day/date/year; six-person display; grain-jar symbols; water symbol; alarm symbol; automatic slowing for text; Slow/Steady/Fast; chalk; look; rub out; furnishings; bell; zoom; fit; journal; cellar; spatial dragging instruction | 17 | none observed | Several unexplained symbols and tools. |
| Chalk acknowledgment / plan dig | Dashed work outline; people choosing work; projected sleeping capacity; entrance exposure; deeper shelter; doors across every route | 6 | none observed | Action worked, but safe depth remained unclear. |
| Village / inspect people | Above/below distinction; reachability; current tasks; household grouping; Master Yusuf; Meryem; Tariq; Kian; Maryam; Tamar of the Wall; six people lacking beds; death count | 12 | none observed | Names, relationships and risks arrive together. |
| Yusuf / inspect needs | Age 74; food need; water need; rest need; care need; Activity and words disclosure | 6 | none observed | No personal interaction reached here. |
| Furnish menu / choose object | Grain store; sleeping-place marks; lamp; one-square door geometry; opposite openings; three-door maximum | 6 | none observed | Concrete descriptions helped. |
| Door marked / await work | Carving construction; adult availability; light requirement | 3 | none observed | Explained delay without a completion estimate. |
| Beds / assess capacity | Filled versus empty circles; marked beds versus safe beds; room-wide capacity; total capacity | 4 | none observed | Six filled circles gave a clear success. |
| Journal / follow activity | Route checking; route variation; loose-stone warning; household cooking; household grain jars; light-material preparation; supervision; dated history; earlier-entry disclosure | 9 | none observed | Human activity helped; repeated reports accumulated. |
| Completed door / inspect | Door groove; testing action; bell-mediated closure; nearby reachable adult requirement; six-hour nonraid call; false-alarm trust cost; More disclosure | 7 | none observed | Strong detail, then a consequential alarm rule. |
| Water warning / seek help | Dry jars; well; carrying water below | 3 | none observed | Need clear; my available response unclear. |
| Information / learn marks | Fresh-air requirement; sleep-circle explanation | 2 | none observed | Useful symbols explanation; no water action found. |
| Wide layout check | Larger activity history; Kian message practice; Ada as sister; continuing care obligation | 4 | none observed | Requested inspection, separate from spontaneous play. |
| Maryam / personal invitation | Age 68; visiting cook; Tariq’s grandmother; widowhood; seed-store role; son Yusuf elsewhere; well settlement; temporary visit; meal arrangements; material offer; optional work; deferred answer | 12 | “Offer a smooth leftover piece of material while she waits in the kitchen” | Material and purpose unclear; End optional work unexplained. |
| Maryam answer / discovery | Wooden ring; string puzzle; impossible knots; keeping mistakes; private notebook boundary; completed-offer disabled state | 6 | none observed | Personal reward; no playable puzzle found. |
| Tamar / inspect invitation | Age 54; boundary adviser; teaching Kian; nonparent relationship; time-off visit; joy label; generic goal statement; boundary invitation | 8 | none observed | Invitation duplicated her existing activity. |
| Store / mark supply area | Empty marked store; autonomous grain transport | 2 | none observed | Tap’s exact area remained uncertain. |
| Ak arrival / growth | Ak household; donkey arrival; reputation attracting residents; Leyla; Halil; increased bed shortfall | 6 | none observed | Brief renewed interest. |
| Smoke choice / respond | Smoke warning; half-day-or-less arrival window; paused choice; ring versus watch; voluntary response | 5 | none observed | Clear immediate action. |
| Bell call / understand alarm | Persistent raid alarm; refusal at any time; people-count safety check | 3 | none observed | Readable response and urgency. |
| Riders / inspect outcome | Scout inspection; no-strike outcome; possible stronger return; pale search tracks | 4 | none observed | No harm, but not proof of shelter effectiveness. |
| Alarm village state / follow replies | Agreement followed by changed tasks; delayed agreement; next-choice countdown; possible earlier reconsideration | 4 | none observed | State explicit; reasons unclear. |
| Door More / investigate closure | Nearby-adult task list | 1 | none observed | Did not explain the open door to me. |
| Game menu / pause | Menu pause; Feedback; full screen; new game; Recording setting; Resume | 6 | none observed | Recording left unchanged. |
| Aydın arrival / growth | Aydın family; three additional people; five-person bed shortfall | 3 | none observed | More obligation rather than reward. |
| Feedback / local stop choice | Three verdict choices; optional note; optional name/id; run/play sharing; disclosure of sent data; Back; Submit | 7 | none observed | Selected stop locally; sent nothing. |

More than one new idea appeared on most inspected screens. That is a clarity-density finding, not a claim that every screen was difficult.

Specific findings:

- **DL-7 — consequence clarity:** I could not tell why the alarm left the door open. The village explicitly said people agreed, then chose other tasks. Door More listed tasks without resolving my question. Transcript 596–601s and 743–752s.
- **DL-5 — actionable situation:** “The water jars are dry. People need a well or water carried below.” I understood the need but found no water action in the tools or Information. This does not establish that none exists.
- **DL-7 — delayed consequence:** Store marked at 438s; filling reported at 829s. I could not attribute the delay to a visible condition.
- **Spatial clarity:** Instructions said drag, but taps marked areas. I could not tell precisely which patch each tap changed. Transcript 19s, 226s, 438–443s.
- **Personal-action wording:** The material offer needed rereading; “End optional work” had no meaning I could confidently apply.
- **Repetition:** Cooking, route-checking and loose-stone reports repeated. Main phone text returned to the same dust sentence for several game days.
- **Puzzle expectation:** “She offers a puzzle” made me look for a puzzle interaction. None appeared in the controls I inspected. I did not establish that no further puzzle exists.

## 6. English, dates, layout and hands-on checks

| Check | Result |
|---|---|
| **DL-20 English** | **PASS for reached actions.** English instructions let me mark rooms and ring the bell. No necessary cultural term blocked action. “End optional work” and the material offer were unclear. On-request local-term definitions **NOT TESTED**. |
| **DL-21 Dates** | **PASS for encountered calendar and relative warning.** English month names and year were readable. “Half a day or less” compared directly with Midday. I saw August cross into September. A fixed cross-month/year deadline comparison was **NOT TESTED**. |
| **DL-22 Phone response visibility** | **PASS for captured bell response.** At 566.740s, the complete immediate response and smoke warning were visible without scrolling. The long warning covered much of the hill. Other responses read only through transcripts are **NOT TESTED — not established by this harness evidence**. |
| **DL-30 Cut-off / overlap** | The preserved bell screenshot has complete sentences, no mid-sentence clipping and no Scroll barrier. Its warning overlays much of the hill and the zoom area. Wide village screenshot at 312s shows the list continuing below fixed bottom tools; later entries require scrolling. No hidden sentence fragment was established. |
| **DL-31 Context with sheet open** | **PASS for bell sheet:** current date, half-day warning and population/bed dots remained visible. Individual people’s whereabouts were not simultaneously shown; they required the village panel. Person-specific deadline/progress sheet **NOT TESTED**. |
| **DL-32 Forced watching** | Longest deliberate wait was 30 real seconds. Store marking to first observed filling spanned about **391s**, but I made other inputs in between; this was not a measured global lockout. I wanted transport and door closure. Tools and inspection remained available. |
| **DL-33 Direct action or form** | Chalk, beds and store used the hill itself, then showed text. Door inspection opened a sheet. Maryam’s invitation was inside a person disclosure. Cooking and direct speech **NOT TESTED**. |
| **DL-13 Feedback** | Feedback available through menu. Local **I would stop here** pressed. No exact “I’m stopping” or “I’m confused” choice appeared. No note/name typed, consent changed or submission attempted under owner override. No receipt or player id observed. |

The requested wide check occurred at 307–318s: resize, ordinary village interaction, screenshot viewed, return to phone. The resize shifted the viewed hill; Fit hill later restored it.

## 7. Stop and voluntary return

Stopped **932.198s — BORED**, at Morning, 7 September, year 1, after the scouts left. Visible population was eleven, with six marked sleeping places. Feedback remained open and paused.

The first wish to leave **did not pass**. Smoke and arrivals produced brief attention, but the repeated reports and waits remained stronger.

I might return voluntarily with my sister to try a shelter plan together. I would not choose another solo session immediately or leave it running unattended.

Recognition remained unverified:

- **Halil:** name only, seen 555.673s, reaction logged 561.474s; low confidence.
- **Aydın:** family surname only, seen 867.332s, reaction logged 877.633s; very low confidence, no person recognized.

## 8. Ranked wishes

1. Let me understand why the door stayed open after the alarm, so my next shelter choice feels informed.
2. Put the personal invitation where I can find it sooner, and make its object and consequence clearer.
3. Give me a clearer connection between marking a place and the later work, with fewer repeated reports while I wait.

No export downloaded. No replay claim. Coordinator saves this report and archives the original diary as this continued exposure.

The browser is no longer needed. Coordinator owns driver/browser cleanup. No worker, server, browser, worktree, branch or repository was created or modified. No applicable `git worktree list`; no repository touched.